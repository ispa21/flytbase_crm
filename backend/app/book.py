"""Q1 "what is the book worth" (ADR 0001), Q2 "who holds the power", Q4 "what is about to go wrong", Q5 "what we still do not know" and the What Changed diff: pure logic over stored snapshots. No I/O except build_book's reads."""
import csv
import io
import json
import logging
import re
from datetime import date, datetime, timedelta, timezone

from .sync import account_ids

log = logging.getLogger("aq.book")
KINDS = {"fact", "file", "record", "deal", "offer", "stakeholder", "ticket", "signal"}


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
    k |= {("ticket", t["id"]) for r in (paperwork or {}).get("records") or [] if r["path"] == "tickets.json"
          for t in (r.get("data") or {}).get("tickets") or []}
    for sg in (x for x in acc_data.get("_signals") or [] if x.get("id")):
        k.add(("signal", sg["id"]))
        k |= {("record", r["path"]) for r in sg.get("records") or [] if r.get("path")}  # signal paths already carry the account
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

    dh = (recs.get("deal_history.json") or {}).get("data") or {}
    if contract and renewal_value and not bands["on_contract"]:  # contract on file, no renewal deal in the export (paperwork-only account)
        it = next((i for i in dh.get("on_file_as_open_at_handover") or [] if "renewal" in _words(i["what"])), None)
        bands["on_contract"].append(line(
            None, it["what"] if it else "Renewal of the contract", renewal_value,
            [{"id": _rec(aid, p), "kind": "record"} for p in ("contract.txt", "profile.json") + (("deal_history.json",) if it else ())],
            renewal_risk=True, term_ends=(prof.get("renewal") or {}).get("term_ends"), stage=None, blocker=None))

    # deals named only in paperwork or by a person: no opportunity covers them -> Unbacked, no value
    covered = {w for o in acc.get("opportunities") or [] for w in o["id"].split("_")}
    for item in dh.get("on_file_as_open_at_handover") or []:
        words = _words(item["what"])
        if words & covered or ("renewal" in words and bands["on_contract"]):
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
def _gate(t):
    return {w[:5] for w in _words(t) if len(w) > 3 and w not in GENERIC}


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
        words = _gate(o["title"])
        blk = []
        b = o.get("blocker")
        if b and b.get("status") == "open":
            blk.append({"who": None, "text": b["text"], "stands": "not on file", "receipts": [{"id": o["id"], "kind": "deal"}]})
        for r in reqs:
            if words & _gate(r["summary"]):  # ponytail: shared-word match, a real link field would replace it
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
    return {"loaded": paperwork is not None, "deals": deals, "flight_log": log, "gaps": gaps,
            "contract": {"decides": _cell(dec), "pays": _cell(pays), "uses": _cell(uses)}}  # account-wide, for a renewal with no deal


def _iso(t):
    m = re.search(r"^Date: (\d{1,2}) (\w+) (\d{4})", t, re.M)
    return f"{m.group(3)}-{_MON.get(m.group(2)[:3].lower(), 0):02d}-{int(m.group(1)):02d}" if m else ""


# ---- Q4: what is about to go wrong (story 4.1) ----
NA = "not on file"
RED_DAYS, AMBER_DAYS, COLD_DAYS = 90, 120, 14


def _account_q4(acc, files, paperwork, file_text, signals, today):
    aid = acc["id"]
    recs = {r["path"]: r for r in (paperwork or {}).get("records") or []}
    data = lambda p: (recs.get(p) or {}).get("data") or {}  # noqa: E731
    text = lambda p: (recs.get(p) or {}).get("text") or ""  # noqa: E731
    rr = lambda p: {"id": _rec(aid, p), "kind": "record"}  # noqa: E731
    stak = {s["name"]: s for s in acc.get("stakeholders") or []}
    items, gaps = [], []

    def add(kind, text_, receipts, level=None, deal=None, turns=NA, **kw):
        items.append({"kind": kind, "level": level, "deal": deal, "text": text_, "turns_bad_on": turns, "receipts": receipts, **kw})

    if paperwork is None:
        gaps.append("paperwork not loaded: renewal, going-cold and ticket checks not run")
    if signals is None:
        gaps.append("signals not fetched yet")

    # renewal: needs term_ends (profile.json) and the signer (contract.txt)
    term = (data("profile.json").get("renewal") or {}).get("term_ends")
    sg = _contract_signer(text("contract.txt"))
    renewals = [o for o in acc.get("opportunities") or [] if o["title"].startswith("Renew")] or [None]  # None: contract, no deal
    for o in renewals:
        if not term:
            continue
        oid = o["id"] if o else None
        days = (date.fromisoformat(term) - today).days
        blocked = ((o or {}).get("blocker") or {}).get("status") == "open"
        unnamed = sg is not None and not sg["named"]
        if sg is None:
            gaps.append(f"{oid or 'contract'}: signer not on file (contract.txt has no Signed line)")
        cond = blocked or unnamed
        if days >= AMBER_DAYS or days < 0:
            continue
        red_on = (date.fromisoformat(term) - timedelta(days=RED_DAYS)).isoformat()
        why = [w for w, c in (("open blocker", blocked), ("signer is not a named person", unnamed)) if c]
        add("renewal", f"Renewal term ends {term}, {days} days left" + (f"; {' and '.join(why)}" if why else ""),
            ([{"id": oid, "kind": "deal"}] if o else []) + [rr(p) for p in ("contract.txt", "profile.json") if p in recs],
            level="red" if days < RED_DAYS and cond else "amber", deal=oid, turns=red_on if cond else NA,
            days_left=days, term_ends=term)

    # going cold: customer email with a "No reply" trailer, older than 14 days
    for p, r in recs.items():
        t = r.get("text") or ""
        who = (re.search(r"^From: (.+)$", t, re.M) or [None, ""])[1].strip()
        d = _iso(t)
        if p.startswith("emails/") and "FlytBase" not in who and d and re.search(r"\[[^\]]*No reply", t):
            waited = (today - date.fromisoformat(d)).days
            if waited > COLD_DAYS:
                s = stak.get(who)
                add("cold", f"{who}: email of {d} has no reply, {waited} days",
                    [rr(p)] + ([{"id": s["id"], "kind": "stakeholder"}] if s else []),
                    turns=(date.fromisoformat(d) + timedelta(days=COLD_DAYS)).isoformat(), days_waiting=waited, dated=d, who=who)

    # stuck: open blocker, open ticket with no owner, deadline with no date
    dl_text = set()
    for o in acc.get("opportunities") or []:
        if (o.get("blocker") or {}).get("status") == "open":
            add("stuck", f"Open blocker: {o['blocker']['text']}", [{"id": o["id"], "kind": "deal"}], deal=o["id"])
        dl = o.get("deadline")
        if dl:
            dl_text.add(dl.get("text"))
            if not (dl.get("date") or dl.get("minute")):
                add("stuck", f"Deadline has no date: {dl['text']}", [{"id": o["id"], "kind": "deal"}], deal=o["id"])
    gaps += [f"deadline has no date and no deal, no id to cite: {d['text']}" for d in acc.get("deadlines") or [] if d.get("text") not in dl_text]
    for t in data("tickets.json").get("tickets") or []:
        if t["status"] != "Closed" and not t.get("assignee"):
            add("stuck", f"{t['id']} ({t['subject']}) is {t['status'].lower()} with no owner since {t['opened']}",
                [{"id": t["id"], "kind": "ticket"}, rr("tickets.json")], ticket=t["id"], dated=t["opened"])

    # usage drop: latest month on file against two months earlier, down 50% or more
    fl = next((f for f in files if f.get("account") == aid and (file_text or {}).get(f["id"])), None)
    if fl:
        c = clean_flight_log(file_text[fl["id"]])
        k = c["entity_kind"]
        label = "docks with live flights" if k == "force" else "patrol + test flights"
        metric = (lambda r: r["docks_with_live_flights"]) if k == "force" else \
            (lambda r: None if r["patrol_flights"] is None or r["test_flights"] is None else r["patrol_flights"] + r["test_flights"])
        by = {}
        for r in c["rows"]:
            by.setdefault(r[k], {})[r["month"]] = metric(r)
        for e, m in by.items():
            last = max(m)
            y, mo = int(last[:4]), int(last[5:]) - 2
            prev = f"{y - (mo < 1):04d}-{mo + 12 * (mo < 1):02d}"
            a, b = m.get(prev), m[last]
            if a and b is not None and b * 2 <= a:
                add("usage_drop", f"{'Plant ' if k == 'plant' else ''}{e}: {label} {a} in {prev}, {b} in {last}", [{"id": fl["id"], "kind": "file"}],
                    turns=f"already down ({last})", **{k: e})

    # signals: shown verbatim with their own date
    for s in signals or []:
        if s.get("account") == aid and s.get("id"):
            add("signal", f"{s['title']}: {s['summary']}", [{"id": s["id"], "kind": "signal"}] +
                [{"id": r["path"], "kind": "record"} for r in s.get("records") or [] if r.get("path")], dated=s.get("dated"))
    items.sort(key=lambda i: {"red": 0, "amber": 1}.get(i["level"], 2))
    return {"today": today.isoformat(), "loaded": paperwork is not None, "signals_loaded": signals is not None,
            "items": items, "gaps": gaps}


# ---- Q5: what we still do not know (story 5.1) ----
def _account_q5(acc, q1, q2, q4, paperwork):
    """Gaps the plan rests on. Reuses the gaps q1/q2/q4 already found; adds profile.json not_on_file.
    Each gap: the deals it touches (with value), who could fill it (a name a record gives, else "not on file")."""
    aid = acc["id"]
    prof = next(((r.get("data") or {}) for r in (paperwork or {}).get("records") or [] if r["path"] == "profile.json"), {})
    deals = {l["id"]: l for b in q1["bands"].values() for l in b if l["id"]}
    opps = {o["id"]: o for o in acc.get("opportunities") or []}
    facts = {f["id"]: f for f in acc.get("facts") or []}
    names = [s["name"] for s in acc.get("stakeholders") or []]
    gaps = []

    def gap(kind, text, deal_ids, receipts, who=None):
        ds = [{"id": d, "title": deals[d]["title"], "value": deals[d]["value"], "currency": q1["currency"]} for d in dict.fromkeys(deal_ids) if d in deals]
        priced = [d["value"] for d in ds if d["value"] is not None]
        gaps.append({"kind": kind, "text": text, "deals": ds, "value_at_stake": sum(priced) if priced else None,
                     "unpriced_deals": len(ds) - len(priced), "who_could_fill": who or NA, "receipts": receipts})

    for t in prof.get("not_on_file") or []:  # deals by shared word only; none matched = account-wide
        g = _gate(t)
        hit = [i for i, o in opps.items() if g & _gate(o["title"] + " " + ((o.get("blocker") or {}).get("text") or ""))]
        gap("profile", t, hit, [{"id": _rec(aid, "profile.json"), "kind": "record"}] + [{"id": i, "kind": "deal"} for i in hit],
            next((n for n in names if n in t), None))
    for g in q2["gaps"]:
        gap("power", f"{g['role']}: {g['why']}", [g["deal"]], [{"id": g["deal"], "kind": "deal"}])
    for b in q1["bands"]["unpriced"]:
        gap("unpriced", f"No value on file for {b['title']}", [b["id"]], [{"id": b["id"], "kind": "deal"}])
    for i in q4["items"]:
        if i["kind"] == "stuck" and i["text"].startswith("Deadline has no date"):
            gap("deadline", i["text"], [i["deal"]], i["receipts"])
    for g in q4["gaps"]:
        d = g.split(":", 1)[0]
        gap("record", g, [d] if d in deals else [], [{"id": d, "kind": "deal"}] if d in deals else [])
    for m in ((q2["flight_log"] or {}).get("missing") or []):
        k = q2["flight_log"]["entity_kind"]
        gap("file", f"Flight log has no row for {'plant ' if k == 'plant' else ''}{m[k]} in {m['month']}", [], [{"id": q2["flight_log"]["file"], "kind": "file"}])
    for c in q1["claims"]["unpaired"]:
        f = facts[c["claim"]["id"]]
        gap("claim", f"Only a claim, nothing backs it: {f['text']}", [i for i, o in opps.items() if f["id"] in (o.get("evidence") or [])],
            c["receipts"], f["said_by"])
    return {"loaded": paperwork is not None, "gaps": gaps}


# ---- Q3: first three moves (story 6.1) ----
def _add_bdays(d, n):
    while n:
        d += timedelta(days=1)
        n -= d.weekday() < 5
    return d


def _account_q3(acc, q1, q2, q4, q5, paperwork, today):
    """Top 3 moves by plain rules over q1/q2/q4/q5 output. Owner = the CSM profile.json names (no `to`), else "not on file".
    Due = 2 (red) or 5 (else) business days out, held before the turn date when that is still ahead. Nothing invented."""
    aid = acc["id"]
    prof = next(((r.get("data") or {}) for r in (paperwork or {}).get("records") or [] if r["path"] == "profile.json"), {})
    csm = next((c["who"] for c in (prof.get("flytbase_side") or {}).get("csm") or [] if not c.get("to")), None)
    owner = NA if not csm else "the CSM (you)" if csm == "you" else csm
    orec = [{"id": _rec(aid, "profile.json"), "kind": "record"}] if csm else []
    deals = {l["id"]: (l["title"], rank) for rank, b in enumerate(q1["bands"].values()) for l in b if l["id"]}
    cands = []

    def cand(tier, kind, action, why, receipts, deal=None, turns=NA, level=None, with_=NA):
        cands.append({"tier": tier, "kind": kind, "action": action, "why_now": why, "receipts": receipts + orec, "level": level,
                      "deal": {"id": deal, "title": deals[deal][0]} if deal in deals else None, "turns_bad_on": turns, "with": with_,
                      "_k": (tier, deals[deal][1] if deal in deals else 9, turns if turns[:1].isdigit() else "9999")})

    for i in q4["items"]:
        d, t, k = i["deal"], i["turns_bad_on"], i["kind"]
        title = deals[d][0] if d in deals else None
        if k == "renewal":
            cand(0 if i["level"] == "red" else 1, k, f"Clear what blocks {title or 'the contract renewal'}: name the signer or settle the open blocker", i["text"],
                 i["receipts"], d, t, i["level"])
        elif k == "cold":
            cand(2, k, f"Reply to {i['who']}", i["text"], i["receipts"], None, t, with_=i["who"])
        elif k == "stuck" and i.get("ticket"):
            cand(2, k, f"Assign an owner to {i['ticket']}", i["text"], i["receipts"], None, t)
        elif k == "stuck" and i["text"].startswith("Open blocker") and not any(x["deal"] == d and x["kind"] == "renewal" for x in q4["items"]):  # renewal move already covers it
            cand(2, k, f"Clear the blocker on {title}", i["text"], i["receipts"], d, t)
        elif k == "signal":
            cand(2, k, f"Respond to: {i['text'].split(':')[0]}", i["text"], i["receipts"], None, t)
    seen = set()  # at most one find-out move per deal: the first gap listed for it
    for g in q5["gaps"]:
        if g["deals"] and g["value_at_stake"] is not None and g["deals"][0]["id"] not in seen:  # only gaps that sit on priced deals
            d = g["deals"][0]["id"]
            seen.add(d)
            who = g["who_could_fill"]
            cand(3, "gap", f"Find out from {who}: {g['text']}" if who != NA else f"Find out (nobody on file can fill it): {g['text']}",
                 f"Blocks the value of {deals[d][0]} ({g['value_at_stake']} {q1['currency']})", g["receipts"], d, with_=who)
    out = []
    for n, c in enumerate(sorted(cands, key=lambda c: c["_k"])[:3], start=1):
        due = _add_bdays(today, 2 if c["level"] == "red" else 5)
        basis = "2 business days (red)" if c["level"] == "red" else "5 business days"
        if c["turns_bad_on"][:1].isdigit() and date.fromisoformat(c["turns_bad_on"]) > today:
            due, basis = min(due, date.fromisoformat(c["turns_bad_on"]) - timedelta(days=1)), f"{basis}, held before {c['turns_bad_on']}"
        elif c["turns_bad_on"][:1].isdigit():
            basis += f"; turn date {c['turns_bad_on']} already passed"
        else:
            basis += "; no turn date on file"
        due = max(due, today)
        m = {k: v for k, v in c.items() if k not in ("tier", "_k")}
        m.update(rank=n, owner=owner, due=due.isoformat(), due_basis=basis)
        ids = ", ".join(r["id"] for r in m["receipts"])
        m["draft_note"] = {"kind": "next_step", "text": f"Next step: {m['action']}. Owner: {owner}. Due: {m['due']} ({basis}). "
                           f"Deal: {m['deal']['id'] if m['deal'] else NA}. Why now: {m['why_now']}. Records: {ids}."}
        out.append(m)
    return {"loaded": paperwork is not None, "moves": out, "candidates": len(cands)}


def band_deals(my_accounts, paperwork_by_acc, strict=False, file_text=None, signals=None, today=None):
    """-> {account id: {q1, q2, q3, q4, q5, radar, power}}. Receipts are checked against the same snapshots."""
    from .views import power, radar, settle  # views builds on this module's helpers
    out = {}
    today = today or date.today()
    files = my_accounts.get("files") or []
    for acc in my_accounts.get("accounts") or []:
        pw = paperwork_by_acc.get(acc["id"])
        q1 = _account_q1(acc, files, pw)
        q2 = _account_q2(acc, files, pw, file_text)
        q4 = _account_q4(acc, files, pw, file_text, signals, today)
        q5 = _account_q5(acc, q1, q2, q4, pw)
        q3 = _account_q3(acc, q1, q2, q4, q5, pw, today)
        known = _known({**acc, "_files": files, "_signals": signals}, pw)
        check_receipts(q1, known, strict)
        check_receipts(q2, known, strict)
        check_receipts(q4, known, strict)
        check_receipts(q5, known, strict)
        check_receipts(q3, known, strict)
        rd, pm = radar(acc, q1, q2, q4, pw, today), power(acc, q1, q2, pw)
        check_receipts(rd, known, strict)
        check_receipts(pm, known, strict)
        out[acc["id"]] = {"q1": q1, "q2": q2, "q3": q3, "q4": q4, "q5": q5, "radar": settle(rd), "power": pm,
                          "name": acc.get("name"), "in_export": not acc.get("paperwork_only")}
    return out


def build_book(db, strict=False, today=None, at=None):
    """`at` (epoch): read the snapshots in force then (first snapshot if none yet), for the What Changed diff."""
    get = (lambda t, a=None: db.latest(t, a)) if at is None else (lambda t, a=None: db.snapshot_at(t, a, at))
    ma = get("get_my_accounts")
    if not ma or not isinstance(ma[0], dict):
        return {"as_of": None, "state": "waiting for first sync", "accounts": {}}
    pw, ft, times = {}, {}, [ma[1]]
    accs = [a for a in ma[0].get("accounts") or [] if isinstance(a, dict) and a.get("id")]
    have = {a["id"] for a in accs}
    accs += [{"id": i, "paperwork_only": True} for i in account_ids(db) if i not in have]  # whoami's new accounts: paperwork only
    for a in accs:
        s = get("get_all_paperwork", {"account": a["id"]})
        if s:
            pw[a["id"]] = s[0]
            times.append(s[1])
        if a.get("paperwork_only"):
            a["name"] = next(((r.get("data") or {}).get("name") for r in (s[0] if s else {}).get("records") or []
                              if r.get("path") == "profile.json"), None)
    for f in ma[0].get("files") or []:
        s = get("get_file", {"id": f["id"]})
        if s and isinstance(s[0], dict):
            ft[f["id"]] = s[0].get("text")
            times.append(s[1])
    sg = get("get_signals")
    signals = sg[0].get("signals") or [] if sg and isinstance(sg[0], dict) else None
    if sg:
        times.append(sg[1])
    return {"as_of": datetime.fromtimestamp(min(times), timezone.utc).isoformat(),  # oldest input = honest freshness
            "state": "ok", "accounts": band_deals({**ma[0], "accounts": accs}, pw, strict, ft, signals, today)}


# ---- What Changed (story 7.1, minimal): new signals and deal band / stage / value moves ----
def _deal_state(book):
    return {(a, l["id"]): {"title": l["title"], "band": b, "value": l["value"], "stage": l.get("stage")}
            for a, x in book["accounts"].items() for b, ls in x["q1"]["bands"].items() for l in ls if l["id"]}


def what_changed(db, since, today=None):
    """Latest snapshots against those in force at `since` (epoch; first snapshot if `since` predates them)."""
    old, new = build_book(db, today=today, at=since), build_book(db, today=today)
    a, b = _deal_state(old), _deal_state(new)
    moved = [{"account": k[0], "deal": k[1], "title": v["title"], "receipts": [{"id": k[1], "kind": "deal"}],
              **{f: {"from": a[k][f], "to": v[f]} for f in ("band", "value", "stage") if a[k][f] != v[f]}}
             for k, v in b.items() if k in a and any(a[k][f] != v[f] for f in ("band", "value", "stage"))]
    return {"since": since, "from_as_of": old["as_of"], "to_as_of": new["as_of"], "moved": moved,
            "new_deals": [{"account": k[0], "deal": k[1], "title": v["title"], "band": v["band"]} for k, v in b.items() if k not in a],
            "new_signals": [{"id": s["id"], "account": s.get("account"), "title": s.get("title"), "first_seen": f,
                             "receipts": [{"id": s["id"], "kind": "signal"}]} for s, f in db.signals_since(since) if s.get("id")]}
