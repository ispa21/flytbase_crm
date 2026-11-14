"""CRM views (people, activity) and write-back note helpers (story 6.3). Pure logic over stored snapshots; only `load` reads.
Every item cites receipts that are checked against the same snapshots as the book (book.check_receipts); an item left with none is dropped."""
import csv
import io
import json
from datetime import datetime, timezone

from .book import _known, _rec, build_book, check_receipts

NOTE_MAX = 4000  # write_note.text limit, tools_list.json
KINDS = ("note", "task", "risk", "next_step")
SENDING_STALE = 600  # s: a note still `sending` after this is shown failed (outcome unknown), never resent


# ---- write-back ----------------------------------------------------------
def validate_note(body: dict, ma: dict) -> tuple[dict | None, str | None]:
    """-> (clean fields, None) or (None, reason). `ma` is the latest get_my_accounts payload."""
    accs = {a["id"]: a for a in ma.get("accounts") or [] if isinstance(a, dict) and a.get("id")}
    acc = body.get("account")
    if acc not in accs:
        return None, f"unknown account {acc!r}; known: {sorted(accs)}"
    deal = body.get("deal")
    if deal is not None and deal not in {o.get("id") for o in accs[acc].get("opportunities") or []}:
        return None, f"unknown deal {deal!r} for account {acc}"
    text = body.get("text")
    text = text.strip() if isinstance(text, str) else ""
    if not text:
        return None, "text is empty"
    kind = body.get("kind") or "note"
    if kind not in KINDS:
        return None, f"kind must be one of {KINDS}"
    source = body.get("source")
    if source is not None and (not isinstance(source, str) or len(source) > 60):
        return None, "source must be a string of at most 60 characters"
    if len(note_text(text, deal)) > NOTE_MAX:
        return None, f"text too long (max {NOTE_MAX} characters including the deal tag)"
    return {"account": acc, "deal": deal, "text": text, "kind": kind, "source": source}, None


def note_text(text, deal):
    return f"[{deal}] {text}" if deal else text  # write_note has no deal field: tag it in the text


def note_args(n: dict) -> dict:
    """MCP write_note arguments for a stored note row."""
    return {"text": note_text(n["text"], n["deal"]), "account": n["account"], "kind": n["kind"]}


def note_outcome(resp) -> tuple[bool, str | None]:
    """Raw JSON-RPC response -> (saved, error). Response shape is not recorded: only an explicit
    error / isError counts as failure; anything else that arrived over HTTP 200 is a save."""
    if not isinstance(resp, dict):
        return True, None
    if resp.get("error"):
        return False, f"rpc error: {json.dumps(resp['error'])[:300]}"
    res = resp.get("result")
    if isinstance(res, dict) and res.get("isError"):
        c = res.get("content")
        t = c[0].get("text") if isinstance(c, list) and c and isinstance(c[0], dict) else None
        return False, f"tool error: {str(t or res)[:300]}"
    return True, None


def public_note(n: dict, now: float) -> dict:
    n = dict(n)
    if n["status"] == "sending":
        if now - n["created_at"] > SENDING_STALE:
            n["status"], n["error"] = "failed", "interrupted while sending; outcome unknown, not retried"
        else:
            n["status"] = "queued"
    return n


# ---- snapshots -------------------------------------------------------------
def load(db):
    """Latest snapshots -> {ma, pw, signals, team, as_of} or None before the first sync."""
    ma = db.latest("get_my_accounts")
    if not ma or not isinstance(ma[0], dict):
        return None
    pw, times = {}, [ma[1]]
    for a in ma[0].get("accounts") or []:
        s = db.latest("get_all_paperwork", {"account": a["id"]})
        if s:
            pw[a["id"]] = s[0]
            times.append(s[1])
    sg = db.latest("get_signals")
    signals = sg[0].get("signals") or [] if sg and isinstance(sg[0], dict) else None
    if sg:
        times.append(sg[1])
    tm = db.latest("get_flytbase_team")
    return {"ma": ma[0], "pw": pw, "signals": signals, "team": (tm[0].get("people") or []) if tm and isinstance(tm[0], dict) else [],
            "as_of": datetime.fromtimestamp(min(times), timezone.utc).isoformat()}


def _recs(pw):
    return {r["path"]: r for r in (pw or {}).get("records") or []}


def _data(recs, p):
    return (recs.get(p) or {}).get("data") or {}


def _cut(s, n=280):
    s = " ".join((s or "").split())
    return s if len(s) <= n else s[: n - 1] + "…"


def _checked(items, acc, ma, pw, signals):
    known = _known({**acc, "_files": ma.get("files") or [], "_signals": signals}, pw)
    check_receipts(items, known)
    return [i for i in items if i["receipts"]]


# ---- activity ----------------------------------------------------------------
def activity(snap) -> dict:
    items = []
    for acc in snap["ma"].get("accounts") or []:
        aid, pw = acc["id"], snap["pw"].get(acc["id"])
        recs, deals = _recs(pw), {o["id"] for o in acc.get("opportunities") or []}
        rr = lambda p: {"id": _rec(aid, p), "kind": "record"}  # noqa: E731
        cur = _data(recs, "profile.json").get("currency") or ""
        mine = []

        def add(kind, key, dated, title, summary, receipts, row=None):
            d = (row or {}).get("deal")  # only a record's own deal field links a deal
            mine.append({"id": f"{aid}:{kind}:{key}", "account": aid, "kind": kind, "dated": dated, "title": title,
                         "summary": summary, "deal": d if d in deals else None, "receipts": receipts})

        for i, m in enumerate(_data(recs, "mail_log.json").get("mail") or []):
            add("email", i, m.get("date"), m.get("subject"), f"{m.get('from')} to {m.get('to')}: {_cut(m.get('body'))}", [rr("mail_log.json")], m)
        for i, c in enumerate(_data(recs, "calls_index.json").get("calls") or []):
            add("call", i, c.get("date"), c.get("title"), _cut(c.get("summary")),
                [rr("calls_index.json")] + ([rr(c["path"])] if c.get("path") else []), c)
        for t in _data(recs, "tickets.json").get("tickets") or []:
            add("ticket", t["id"], t.get("opened"), f"{t['id']}: {t.get('subject')}",
                f"{t.get('status')}; requester {t.get('requester')}; assignee {t.get('assignee') or 'none'}",
                [{"id": t["id"], "kind": "ticket"}, rr("tickets.json")], t)
        for i, r in enumerate(csv.DictReader(io.StringIO((recs.get("requests.csv") or {}).get("text") or ""))):
            add("request", i, r.get("opened"), f"{r.get('request_id')}: {r.get('from')}",
                f"{_cut(r.get('summary'))} Status: {r.get('status')}; owner: {r.get('owner') or 'none'}.", [rr("requests.csv")], r)
        for v in _data(recs, "invoices.json").get("invoices") or []:
            amt = f"{v['amount']} {cur}".strip() if v.get("amount") is not None else "amount not on file"
            add("invoice", v["number"], v.get("issued"), f"{v['number']}: {v.get('what')}",
                f"{v.get('status')}, {amt}", [rr("invoices.json")], v)
        for s in snap["signals"] or []:
            if isinstance(s, dict) and s.get("id") and s.get("account") == aid:
                add("signal", s["id"], s.get("dated"), s.get("title"), _cut(s.get("summary")),
                    [{"id": s["id"], "kind": "signal"}] + [{"id": r["path"], "kind": "record"} for r in s.get("records") or [] if r.get("path")], s)
        items += _checked(mine, acc, snap["ma"], pw, snap["signals"])
    items = [i for i in items if i["dated"]]  # an undated item cannot be placed; never invent a date
    items.sort(key=lambda i: (i["dated"], i["id"]), reverse=True)
    return {"as_of": snap["as_of"], "items": items}


# ---- people --------------------------------------------------------------------
def people(snap, book) -> dict:
    """`book`: build_book output for the same snapshots (q2 gives roles and deals)."""
    out = []
    team = {p["name"]: p for p in snap["team"] if isinstance(p, dict) and p.get("name")}
    team_by_id = {p["id"]: p for p in team.values() if p.get("id")}
    for acc in snap["ma"].get("accounts") or []:
        aid, pw = acc["id"], snap["pw"].get(acc["id"])
        recs = _recs(pw)
        rr = lambda p: {"id": _rec(aid, p), "kind": "record"}  # noqa: E731
        mail = _data(recs, "mail_log.json").get("mail") or []
        calls = _data(recs, "calls_index.json").get("calls") or []
        prof = _data(recs, "profile.json")
        org = prof.get("name") or acc.get("name")
        q2 = ((book.get("accounts") or {}).get(aid) or {}).get("q2") or {}
        mine = []
        for s in acc.get("stakeholders") or []:
            tags, deals, rec = set(), set(), [{"id": s["id"], "kind": "stakeholder"}]
            for d in q2.get("deals") or []:
                for role, cell in d["roles"].items():
                    for e in cell["entries"]:
                        if e.get("stakeholder") == s["id"] or e.get("who") == s["name"]:
                            tags.add(role); deals.add(d["deal"]); rec += e.get("receipts") or []
                if any(v.get("stakeholder") == s["id"] for v in d.get("voices") or []):
                    deals.add(d["deal"])
            if any(s["name"] in (m.get("from") or "") or s["name"] in (m.get("to") or "") for m in mail):
                rec.append(rr("mail_log.json"))
            if any(s["name"] in (c.get("customer") or []) for c in calls):
                rec.append(rr("calls_index.json"))
            mine.append({"id": f"{aid}:{s['id']}", "account": aid, "name": s["name"], "title": s.get("role"), "org": org,
                         "side": "customer", "role_tags": sorted(tags), "standing": s.get("relationship"),
                         "deals": sorted(deals), "receipts": rec})
        # FlytBase side: only people the team list names AND a record of this account mentions
        fb = {}
        fs = prof.get("flytbase_side") or {}
        for pid in [fs.get("commercial_owner")] + [c.get("who") for c in fs.get("csm") or []]:
            if pid in team_by_id:
                fb.setdefault(team_by_id[pid]["name"], []).append(rr("profile.json"))
        for m in mail:
            for n in (m.get("from"), m.get("to")):
                n = (n or "").replace(" (FlytBase)", "")
                if n in team:
                    fb.setdefault(n, []).append(rr("mail_log.json"))
        for c in calls:
            for n in c.get("flytbase") or []:
                if n in team:
                    fb.setdefault(n, []).append(rr("calls_index.json"))
        for n, rec in fb.items():
            p = team[n]
            mine.append({"id": f"{aid}:{p['id']}", "account": aid, "name": n, "title": p.get("role"), "org": "FlytBase",
                         "side": "flytbase", "role_tags": [], "standing": None, "deals": [],
                         "receipts": list({r["id"]: r for r in rec}.values())})
        for p in mine:
            p["receipts"] = list({(r["kind"], r["id"]): r for r in p["receipts"]}.values())
        out += _checked(mine, acc, snap["ma"], pw, snap["signals"])
    out.sort(key=lambda p: (p["account"], p["side"], p["name"]))
    return {"as_of": snap["as_of"], "people": out}


def people_view(db):
    snap = load(db)
    return {"as_of": None, "state": "waiting for first sync", "people": []} if snap is None else {"state": "ok", **people(snap, build_book(db))}


def activity_view(db):
    snap = load(db)
    return {"as_of": None, "state": "waiting for first sync", "items": []} if snap is None else {"state": "ok", **activity(snap)}
