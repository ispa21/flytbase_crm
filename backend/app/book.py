"""Q1 "what is the book worth" (ADR 0001) and Q2 "who holds the power": pure logic over stored snapshots. No I/O except build_book's reads."""
import csv
import io
import json
import logging
import re
from datetime import datetime, timezone

log = logging.getLogger("aq.book")
KINDS = {"fact", "file", "record", "deal", "offer", "stakeholder"}


class ReceiptError(AssertionError):
    pass


def _rec(acc, path):
    return f"{acc}/{path}"  # record ids are per account


def _known(acc_data, paperwork):
    """Set of (kind, id) a receipt may point at. Records are keyed with their account."""
    k = {("fact", f["id"]) for f in acc_data.get("facts") or []}
    k |= {("deal", o["id"]) for o in acc_data.get("opportunities") or []}
    k |= {("offer", o["id"]) for o in acc_data.get("offers") or []}
    k |= {("stakeholder", s["id"]) for s in acc_data.get("stakeholders") or []}
    k |= {("file", f["id"]) for f in acc_data.get("_files") or []}
    k |= {("record", _rec(acc_data["id"], r["path"])) for r in (paperwork or {}).get("records") or []}
    return k


def check_receipts(node, known, strict=False):
    """Drop (and log) receipts not in `known`; strict (tests) raises instead. Returns the dropped list."""
    dropped = []

    def walk(n):
        if isinstance(n, dict):
            if "receipts" in n:
                keep = []
                for r in n["receipts"]:
                    if r.get("kind") in KINDS and (r["kind"], r["id"]) in known:
                        keep.append(r)
                    else:
                        dropped.append(r)
                n["receipts"] = keep
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(node)
    if dropped:
        if strict:
            raise ReceiptError(f"receipt ids not in snapshot: {dropped}")
        log.warning("dropped receipts not in snapshot: %s", dropped)
    return dropped


def _fr(f):
    return {"id": f["id"], "kind": "fact", "status": f["status"]}


def pair_claims(facts):
    """Claims beside later facts sharing the id stem (`sr_roll_0` -> `sr_roll_2`). Pure."""
    def split(i):
        s, _, n = i.rpartition("_")
        return s, int(n) if n.isdigit() else -1
    pairs, lone = [], []
    for c in (f for f in facts if f["status"] == "claim"):
        stem, n = split(c["id"])
        later = [f for f in facts if f["status"] != "claim" and split(f["id"])[0] == stem and split(f["id"])[1] > n]
        if later:
            pairs.append({"claim": c, "later": later, "label": "same topic (by id)",
                          "struck_through": any(f["status"] == "verified" for f in later),
                          "receipts": [_fr(c)] + [_fr(f) for f in later]})
        else:
            lone.append({"claim": c, "label": "claim, nothing on file backs it", "receipts": [_fr(c)]})
    return {"pairs": pairs, "unpaired": lone}


def _words(s):
    return {w for w in "".join(ch if ch.isalnum() else " " for ch in s.lower()).split()}


def _account_q1(acc, files, paperwork):
    acc = {**acc, "_files": files}
    aid = acc["id"]
    recs = {r["path"]: r for r in (paperwork or {}).get("records") or []}
    prof = (recs.get("profile.json") or {}).get("data") or {}
    cur = prof.get("currency")
    facts = {f["id"]: f for f in acc.get("facts") or []}
    file_ids = {f["id"] for f in files}
    stak = {s["name"]: s["id"] for s in acc.get("stakeholders") or []}
    bands = {"on_contract": [], "backed_upside": [], "unbacked": [], "unpriced": []}

    def line(id_, title, value, receipts, **kw):
        return {"id": id_, "title": title, "value": value, "currency": cur, "receipts": receipts, **kw}

    def ev(o):
        return [_fr(facts[e]) if e in facts else {"id": e, "kind": "file"} for e in o.get("evidence") or []]

    contract = recs.get("contract.txt")
    renewal_value = (prof.get("renewal") or {}).get("annual_value")
    for o in acc.get("opportunities") or []:
        deal = {"id": o["id"], "kind": "deal"}
        blocker = o.get("blocker") if (o.get("blocker") or {}).get("status") == "open" else None
        extra = {"stage": o.get("stage"), "blocker": blocker}
        if o["title"].startswith("Renew") and contract and renewal_value:  # null worth_up_to is fine here
            bands["on_contract"].append(line(
                o["id"], o["title"], renewal_value,
                [deal, {"id": _rec(aid, "contract.txt"), "kind": "record"},
                 {"id": _rec(aid, "profile.json"), "kind": "record"}] + ev(o),
                renewal_risk=True, term_ends=(prof.get("renewal") or {}).get("term_ends"), **extra))
        elif o.get("worth_up_to") is None:
            bands["unpriced"].append(line(o["id"], o["title"], None, [deal] + ev(o), **extra))
        else:
            backed = any(f.get("status") == "verified" for f in (facts.get(e) for e in o.get("evidence") or []) if f) \
                or any(e in file_ids for e in o.get("evidence") or [])
            band = "backed_upside" if backed and not blocker else "unbacked"
            bands[band].append(line(o["id"], o["title"], o["worth_up_to"], [deal] + ev(o), **extra))

    for o in acc.get("offers") or []:
        if o.get("status") == "open":
            r = [{"id": o["id"], "kind": "offer"}]
            if o.get("pitch_to") in stak:
                r.append({"id": stak[o["pitch_to"]], "kind": "stakeholder"})
            bands["backed_upside"].append(line(o["id"], o["title"], o["value"], r, pitch_to=o.get("pitch_to")))

    # deals named only in paperwork or by a person: no opportunity covers them -> Unbacked, no value
    covered = {w for o in acc.get("opportunities") or [] for w in o["id"].split("_")}
    dh = (recs.get("deal_history.json") or {}).get("data") or {}
    for item in dh.get("on_file_as_open_at_handover") or []:
        words = _words(item["what"])
        if words & covered:
            continue
        topic = [f for f in facts.values() if len(f["id"].split("_")) > 1 and f["id"].split("_")[1] in words]
        bands["unbacked"].append(line(
            None, item["what"], item.get("value"),
            [{"id": _rec(aid, "deal_history.json"), "kind": "record"}] + [_fr(f) for f in topic],
            blocker=None, note=item.get("basis")))

    totals = {}
    for b in ("on_contract", "backed_upside", "unbacked"):
        t = {}
        for l in bands[b]:
            if l["value"] is not None:
                k = cur or "unknown"
                t[k] = t.get(k, 0) + l["value"]
        totals[b] = {"by_currency": t, "receipts": [r for l in bands[b] if l["value"] is not None for r in l["receipts"]]}
    return {"currency": cur, "paperwork_loaded": paperwork is not None, "bands": bands, "totals": totals,
            "claims": pair_claims(list(facts.values()))}


# ---- Q2: flight-log cleaning (story 3.1) ----
_MON = {m: i + 1 for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split())}
_NUM = {w: i + 1 for i, w in enumerate("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen".split())}
GENERIC = {"dock", "docks", "plant", "plants", "contract", "alliance"}
_FORCES = {"westmere": "Westmere", "metro": "Metro Central", "tarn": "Tarn Valley", "norwold": "Norwold"}


def _month(s):
    s = s.strip().lower()
    for pat, f in ((r"(\d{4})-(\d{2})", lambda a, b: (a, b)), (r"(\d{2})/(\d{4})", lambda a, b: (b, a)),
                   (r"([a-z]{3}) (\d{4})", lambda a, b: (b, _MON.get(a))), (r"([a-z]{3})-(\d{2})", lambda a, b: ("20" + b, _MON.get(a)))):
        m = re.fullmatch(pat, s)
        if m:
            y, mo = f(*m.groups())
            if mo:
                return f"{int(y):04d}-{int(mo):02d}"
    return None


def _plant(s):
    m = re.search(r"\d+", s)
    return int(m.group()) if m else _NUM.get(s.strip().lower().split()[-1])


def _force(s):
    return next((v for k, v in _FORCES.items() if k in s.lower()), None)


def _int(v):
    v = (v or "").strip()
    return int(v) if v.isdigit() else None


def clean_flight_log(text):
    """Flight-log CSV -> {entity_kind, rows, dropped, missing}. Pure. Names and months normalised, exact
    duplicates and blank re-sent rows dropped, months an entity lacks listed as missing (never zero)."""
    rd = list(csv.DictReader(io.StringIO(text or "")))
    kind = "plant" if rd and "plant" in rd[0] else "force"
    norm = _plant if kind == "plant" else _force
    rows, dropped, seen = [], [], set()
    for n, r in enumerate(rd, start=2):  # line 1 is the header
        ent, mo = norm(r[kind]), _month(r["month"])
        vals = {k: v.strip() for k, v in r.items() if k not in (kind, "month", "notes")}
        if ent is None or mo is None:
            dropped.append({"line": n, "reason": "unreadable name or month"})
            continue
        if "dock_installed" in vals:
            vals["dock_installed"] = vals["dock_installed"].lower() in ("yes", "y")
        key = (ent, mo, json.dumps(vals, sort_keys=True))
        if key in seen:
            dropped.append({"line": n, "reason": "exact duplicate"})
            continue
        seen.add(key)
        blank = any(not v for k, v in vals.items() if k != "dock_installed")
        if blank and any(r[kind] == ent and r["month"] == mo for r in rows):  # blank "re-sent" row of a month already kept
            dropped.append({"line": n, "reason": "blank re-sent row"})
            continue
        rows.append({kind: ent, "month": mo, "line": n, **{k: (v if k == "dock_installed" else _int(v)) for k, v in vals.items()}})
    months = sorted({r["month"] for r in rows})
    have = {(r[kind], r["month"]) for r in rows}
    missing = [{kind: e, "month": m} for e in sorted({r[kind] for r in rows}) for m in months if (e, m) not in have]
    return {"entity_kind": kind, "rows": rows, "dropped": dropped, "missing": missing}


def map_docks(plant_log, flights_csv, dock_ids):
    """Plant -> dock only when exactly one dock's monthly flights equal the plant's (months the plant has).
    Plants with no dock installed are skipped. Pure. -> {plant: dock_id}"""
    per_dock = {d: {} for d in dock_ids}
    for r in csv.DictReader(io.StringIO(flights_csv or "")):
        if r["dock_id"] in per_dock:
            m = r["date"][:7]
            per_dock[r["dock_id"]][m] = per_dock[r["dock_id"]].get(m, 0) + 1
    plants = {}
    for r in plant_log["rows"]:
        p = plants.setdefault(r["plant"], {"installed": False, "m": {}})
        p["installed"] |= bool(r["dock_installed"])
        p["m"][r["month"]] = (r["patrol_flights"] or 0) + (r["test_flights"] or 0)
    cand = {p: [d for d, c in per_dock.items() if all(c.get(m, 0) == v for m, v in x["m"].items())]
            for p, x in plants.items() if x["installed"]}
    out = {p: c[0] for p, c in cand.items() if len(c) == 1}
    taken = [d for d in out.values()]
    return {p: d for p, d in out.items() if taken.count(d) == 1}  # a dock claimed by two plants matches neither


# ---- Q2: power per deal (story 3.2) ----
def _cell(entries, why="not on file", **kw):
    return {"status": "backed" if entries else "gap", "entries": entries, **({} if entries else {"gap": why}), **kw}


def _contract_signer(text):
    m = re.search(r"^Signed: .*?, by (.+)$", text or "", re.M)
    if not m:
        return None
    who = m.group(1).strip()
    return {"who": who.split(",")[0], "title": who.partition(",")[2].strip() or None,
            "named": not who.lower().startswith("the ")}


def _account_q2(acc, files, paperwork, file_text):
    aid = acc["id"]
    recs = {r["path"]: r for r in (paperwork or {}).get("records") or []}
    data = lambda p: (recs.get(p) or {}).get("data") or {}  # noqa: E731
    text = lambda p: (recs.get(p) or {}).get("text") or ""  # noqa: E731
    rr = lambda p: {"id": _rec(aid, p), "kind": "record"}  # noqa: E731
    stak = {s["name"]: s for s in acc.get("stakeholders") or []}
    facts = {f["id"]: f for f in acc.get("facts") or []}

    def stands(name):
        s = stak.get(name)
        return ({"stands": s["relationship"], "stakeholder": s["id"], "available": s["available"]}, [{"id": s["id"], "kind": "stakeholder"}]) \
            if s else ({"stands": "not on file"}, [])

    # decides: the signer in contract.txt
    dec, sg = [], _contract_signer(text("contract.txt"))
    if sg:
        st, sr = stands(sg["who"]) if sg["named"] else ({"stands": "not on file"}, [])
        rec = [rr("contract.txt")] + sr
        call = next((p for p, r in recs.items() if p.startswith("calls/") and f"{sg['who']} signs" in (r.get("text") or "")), None)
        if call and sg["named"]:
            rec.append(rr(call))
        dec.append({"who": sg["who"], "title": sg["title"], "person_named": sg["named"], **st, "receipts": rec})

    # pays: invoices inside the contract term; billing party from the contract's Invoicing section
    pays, ct = [], text("contract.txt")
    inv = [i for i in data("invoices.json").get("invoices") or [] if i.get("status") == "Paid"]
    term = re.search(r"Term: (\d{1,2}) (\w+) (\d{4})", ct)
    if term and _MON.get(term.group(2)[:3].lower()):
        start = f"{term.group(3)}-{_MON[term.group(2)[:3].lower()]:02d}"
        inv = [i for i in inv if i["issued"][:7] >= start]
    if inv:
        bill = re.search(r"invoice a year, to ([^.\n]+)\.", ct)
        pays.append({"who": bill.group(1) if bill else None, "paid_invoices": [i["number"] for i in inv],
                     "amounts_missing": [i["number"] for i in inv if i.get("amount") is None],
                     "gap": "Schedule 2 (split and billing addresses) not on file" if "Schedule 2" in ct and not bill else None,
                     "stands": "not on file", "receipts": [rr("invoices.json"), rr("contract.txt")]})

    # uses: named logins with sign-ins, unnamed logins in one line, usage by force or plant
    uses, users = [], data("users.json").get("users") or []
    for u in (u for u in users if u.get("name")):
        st, sr = stands(u["name"])
        uses.append({"who": u["name"], "key": f"{aid}:{u['user_id']}", "role": u["role"], "sign_ins_last_90_days": u["sign_ins_last_90_days"],
                     "last_sign_in": u["last_sign_in"], **st, "receipts": [rr("users.json")] + sr})
    un = [u for u in users if not u.get("name")]
    if un:
        uses.append({"who": None, "unnamed_logins": len(un), "sign_ins_last_90_days": sum(u["sign_ins_last_90_days"] for u in un),
                     "gap": "names not on file", "stands": "not on file", "receipts": [rr("users.json")]})
    log = None
    fl = next((f for f in files if f.get("account") == aid and (file_text or {}).get(f["id"])), None)
    if fl:
        c = clean_flight_log(file_text[fl["id"]])
        k = c["entity_kind"]
        docks = None
        if k == "plant":
            ids = [d["dock_id"] for d in data("devices.json").get("docks") or []]
            docks = {p: {"dock": d, "label": "matched by monthly flight counts",
                         "receipts": [{"id": fl["id"], "kind": "file"}, rr("flights.csv"), rr("devices.json")]}
                     for p, d in map_docks(c, text("flights.csv"), ids).items()}
        log = {"file": fl["id"], "entity_kind": k, "dropped": c["dropped"], "missing": c["missing"], "dock_map": docks,
               "rows": c["rows"], "receipts": [{"id": fl["id"], "kind": "file"}]}
        uses.append({"who": None, "usage_by": k, "usage_file": fl["id"], "stands": "not on file", "receipts": [{"id": fl["id"], "kind": "file"}]})

    # could block: open customer requests that gate a deal (by shared word), then the deal's own blocker
    reqs = [r for r in csv.DictReader(io.StringIO(text("requests.csv"))) if r["status"] in ("Open", "Pending customer")]
    deals = []
    for o in acc.get("opportunities") or []:
        gate = lambda t: {w[:5] for w in _words(t) if len(w) > 3 and w not in GENERIC}  # noqa: E731
        words = gate(o["title"])
        blk = []
        b = o.get("blocker")
        if b and b.get("status") == "open":
            blk.append({"who": None, "text": b["text"], "stands": "not on file", "receipts": [{"id": o["id"], "kind": "deal"}]})
        for r in reqs:
            if words & gate(r["summary"]):  # ponytail: shared-word match, a real link field would replace it
                rec = [rr("requests.csv")] + [rr(p) for p, x in recs.items() if p.startswith("emails/")
                                              and r["from"].lower().split(" (")[0] in (x.get("text") or "").lower()
                                              and r["opened"] in _iso(x.get("text") or "")]
                st, sr = stands(r["from"])
                blk.append({"who": r["from"], "text": r["summary"], "request": r["request_id"], "status": r["status"], **st, "receipts": rec + sr})
        # who spoke on the deal (evidence -> said_by). A person with only claims is shown as claim, not a receipt.
        spoke = {}
        for e in o.get("evidence") or []:
            f = facts.get(e)
            if f and f["said_by"] in stak:
                spoke.setdefault(f["said_by"], []).append(f)
        voices = []
        for name, fs in spoke.items():
            st, sr = stands(name)
            solid = [f for f in fs if f["status"] != "claim"]
            voices.append({"who": name, **st, "backing": "claim only" if not solid else "on file",
                           "claims": [f["id"] for f in fs if f["status"] == "claim"],
                           "receipts": sr + [_fr(f) for f in solid]})
        deals.append({"deal": o["id"], "title": o["title"], "roles": {
            "decides": _cell(dec), "pays": _cell(pays), "uses": _cell(uses),
            "could_block": _cell(blk, "no open blocker or request on file")}, "voices": voices})
    gaps = [{"deal": d["deal"], "role": r, "why": c["gap"]} for d in deals for r, c in d["roles"].items() if c["status"] == "gap"]
    gaps += [{"deal": d["deal"], "role": r, "why": e["gap"]} for d in deals for r, c in d["roles"].items() for e in c["entries"] if e.get("gap")]
    return {"loaded": paperwork is not None, "deals": deals, "flight_log": log, "gaps": gaps}


def _iso(t):
    m = re.search(r"^Date: (\d{1,2}) (\w+) (\d{4})", t, re.M)
    return f"{m.group(3)}-{_MON.get(m.group(2)[:3].lower(), 0):02d}-{int(m.group(1)):02d}" if m else ""


def band_deals(my_accounts, paperwork_by_acc, strict=False, file_text=None):
    """-> {account id: {q1, q2}}. Receipts are checked against the same snapshots."""
    out = {}
    files = my_accounts.get("files") or []
    for acc in my_accounts.get("accounts") or []:
        pw = paperwork_by_acc.get(acc["id"])
        q1 = _account_q1(acc, files, pw)
        q2 = _account_q2(acc, files, pw, file_text)
        known = _known({**acc, "_files": files}, pw)
        check_receipts(q1, known, strict)
        check_receipts(q2, known, strict)
        out[acc["id"]] = {"q1": q1, "q2": q2, "name": acc.get("name")}
    return out


def build_book(db, strict=False):
    ma = db.latest("get_my_accounts")
    if not ma or not isinstance(ma[0], dict):
        return {"as_of": None, "state": "waiting for first sync", "accounts": {}}
    pw, ft, times = {}, {}, [ma[1]]
    for a in ma[0].get("accounts") or []:
        s = db.latest("get_all_paperwork", {"account": a["id"]})
        if s:
            pw[a["id"]] = s[0]
            times.append(s[1])
    for f in ma[0].get("files") or []:
        s = db.latest("get_file", {"id": f["id"]})
        if s and isinstance(s[0], dict):
            ft[f["id"]] = s[0].get("text")
            times.append(s[1])
    return {"as_of": datetime.fromtimestamp(min(times), timezone.utc).isoformat(),  # oldest input = honest freshness
            "state": "ok", "accounts": band_deals(ma[0], pw, strict, ft)}
