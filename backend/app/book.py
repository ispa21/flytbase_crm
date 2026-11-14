"""Q1 "what is the book worth": pure band logic over stored snapshots (ADR 0001). No I/O except build_book's reads."""
import logging
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


def band_deals(my_accounts, paperwork_by_acc, strict=False):
    """-> {account id: q1}. Receipts are checked against the same snapshots."""
    out = {}
    for acc in my_accounts.get("accounts") or []:
        pw = paperwork_by_acc.get(acc["id"])
        q1 = _account_q1(acc, my_accounts.get("files") or [], pw)
        check_receipts(q1, _known({**acc, "_files": my_accounts.get("files") or []}, pw), strict)
        out[acc["id"]] = {"q1": q1, "name": acc.get("name")}
    return out


def build_book(db, strict=False):
    ma = db.latest("get_my_accounts")
    if not ma or not isinstance(ma[0], dict):
        return {"as_of": None, "state": "waiting for first sync", "accounts": {}}
    pw, times = {}, [ma[1]]
    for a in ma[0].get("accounts") or []:
        s = db.latest("get_all_paperwork", {"account": a["id"]})
        if s:
            pw[a["id"]] = s[0]
            times.append(s[1])
    return {"as_of": datetime.fromtimestamp(min(times), timezone.utc).isoformat(),  # oldest input = honest freshness
            "state": "ok", "accounts": band_deals(ma[0], pw, strict)}
