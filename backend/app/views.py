"""Radar (deadline, going cold, blocked) and power (decides, pays, uses, blocks, champion) per deal (story 8.1).
Pure: built from q1/q2/q4 output and the same paperwork snapshot. book.band_deals checks every receipt, then settle()."""
import csv
import io
import re
from datetime import date, timedelta

from .book import AMBER_DAYS, NA, _iso, _rec

CELLS = ("deadline", "cold", "blocked")
LEVELS = ("red", "amber", "green", "unknown")
WORST = {"red": 0, "amber": 1, "unknown": 2, "green": 3}  # green only when nothing else is known
CONTACT_DAYS = 30
OPEN_REQ = ("Open", "Pending customer")
NO_REPLY = re.compile(r"\[[^\]]*No reply")  # same trailer q4 reads


def _cut(s, n):
    s = " ".join(str(s or "").split())
    return s if len(s) <= n else s[: n - 1] + "…"


def _d(s):
    return date.fromisoformat(s) if isinstance(s, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", s) else None


def _cell(level, label, receipts=(), day=None):
    return {"level": level, "label": _cut(label, 48), "date": day.isoformat() if isinstance(day, date) else day,
            "receipts": list(receipts)}


def _worst(cells):
    return min(cells, key=lambda c: WORST[c["level"]])


def _same(a, b):
    """Same party: equal, or one is the other plus ", ..." or " (...)" (`Beatriz Alonso, Plant 7`). Not "Stefan Roy's deputy"."""
    a, b = (a or "").strip().lower(), (b or "").strip().lower()
    return bool(a and b) and (a == b or any(x.startswith(y + s) for x, y in ((a, b), (b, a)) for s in (",", " (")))


def _dedupe(receipts):
    return list({(r["kind"], r["id"]): r for r in receipts}.values())


class _Paper:
    """One account's paperwork, read the way the views need it."""

    def __init__(self, acc, paperwork):
        self.aid = acc["id"]
        self.recs = {r["path"]: r for r in (paperwork or {}).get("records") or []}
        self.stak = acc.get("stakeholders") or []
        self._wait = {}

    def rr(self, p):
        return {"id": _rec(self.aid, p), "kind": "record"}

    def data(self, p):
        return (self.recs.get(p) or {}).get("data") or {}

    def text(self, p):
        return (self.recs.get(p) or {}).get("text") or ""

    def who(self, sid=None, name=None):
        return next((s for s in self.stak if s["id"] == sid), None) or next((s for s in self.stak if _same(s["name"], name)), None)

    def last_contact(self, name, sid):
        """-> (date, receipts) of the latest dated contact with this person: profile, mail they sent, calls they were on."""
        hits = [(c.get("last_contact_before_handover"), [self.rr("profile.json")])
                for c in self.data("profile.json").get("contacts_on_file") or [] if c.get("id") == sid or _same(c.get("name"), name)]
        hits += [(m.get("date"), [self.rr("mail_log.json")]) for m in self.data("mail_log.json").get("mail") or [] if _same(m.get("from"), name)]
        hits += [(c.get("date"), [self.rr("calls_index.json")] + ([self.rr(c["path"])] if c.get("path") else []))
                 for c in self.data("calls_index.json").get("calls") or [] if any(_same(x, name) for x in c.get("customer") or [])]
        for p, x in self.recs.items():  # email files they wrote, including those a signal brought (not in mail_log)
            t = x.get("text") or ""
            if p.startswith("emails/") and _same((re.search(r"^From: (.+)$", t, re.M) or [None, ""])[1], name):
                hits.append((_iso(t) or None, [self.rr(p)]))
        hits = [(_d(d), r) for d, r in hits if _d(d)]
        if not hits:
            return None, []
        last = max(d for d, _ in hits)
        return last, _dedupe([r for d, rs in hits if d == last for r in rs])

    def waiting_on(self, name):
        """Open tickets and requests this party raised, and their emails with a "No reply" trailer. One item per thing."""
        if name in self._wait:
            return self._wait[name]
        items = {}
        for t in self.data("tickets.json").get("tickets") or []:
            if t.get("status") != "Closed" and _same(t.get("requester"), name):
                items[t["id"]] = {"text": _cut(f"{t['id']}: {t.get('subject')}", 60), "since": t.get("opened"),
                                  "receipts": [{"id": t["id"], "kind": "ticket"}, self.rr("tickets.json")]}
        for n, r in enumerate(csv.DictReader(io.StringIO(self.text("requests.csv")))):
            if r.get("status") in OPEN_REQ and _same(r.get("from"), name):
                if r.get("request_id") in items:  # the request row of a ticket already listed
                    items[r["request_id"]]["receipts"].append(self.rr("requests.csv"))
                else:
                    items[("req", n)] = {"text": _cut(r.get("summary"), 60), "since": r.get("opened"), "receipts": [self.rr("requests.csv")]}
        for p, x in self.recs.items():
            t = x.get("text") or ""
            frm = (re.search(r"^From: (.+)$", t, re.M) or [None, ""])[1]
            if p.startswith("emails/") and NO_REPLY.search(t) and _same(frm, name):
                d = _iso(t) or None
                same = next((i for k, i in items.items() if k[0] == "req" and i["since"] == d), None)  # (none) row = this email
                if same:
                    same["receipts"].append(self.rr(p))
                else:
                    subj = (re.search(r"^Subject: (.+)$", t, re.M) or [None, "email"])[1]
                    items[("mail", p)] = {"text": _cut(f"No reply: {subj}", 60), "since": d, "receipts": [self.rr(p)]}
        self._wait[name] = sorted(items.values(), key=lambda i: i["since"] or "9999")
        return self._wait[name]


def _rows(acc, q1, q2, q4):
    """-> [(deal, opportunity|None, q2 roles|None, q4 items, term_ends)]: opportunities, open offers, and a renewal
    on contract with no deal in the export (paperwork-only account). Told-only lines (no id) are not rows."""
    lines = {l["id"]: (b, l) for b, ls in q1["bands"].items() for l in ls if l["id"]}
    roles = {d["deal"]: d["roles"] for d in q2["deals"]}

    def deal(id_, title, kind, band_line):
        b, l = band_line or (None, {})
        return {"id": id_, "title": title, "band": b, "value": l.get("value"), "currency": q1["currency"], "kind": kind}

    out = []
    for o in acc.get("opportunities") or []:
        bl = lines.get(o["id"])
        out.append((deal(o["id"], o["title"], "opportunity", bl), o, roles.get(o["id"]),
                    [i for i in q4["items"] if i["deal"] == o["id"]], (bl or (0, {}))[1].get("term_ends")))
    for o in acc.get("offers") or []:
        if o.get("status") == "open":
            out.append((deal(o["id"], o["title"], "offer", lines.get(o["id"])), None, None, [], None))
    for l in q1["bands"]["on_contract"]:
        if l["id"] is None:
            out.append((deal(None, l["title"], "contract", ("on_contract", l)), None, q2.get("contract"),
                        [i for i in q4["items"] if i["kind"] == "renewal" and i["deal"] is None], l.get("term_ends")))
    return out


def _deadline(row, pp, today):
    d, opp, _, items, term = row
    deal_r = [{"id": d["id"], "kind": "deal"}] if opp else []
    cells = [_cell(i["level"], f"Term ends {i['term_ends']}, {i['days_left']} days left", i["receipts"],
                   i["turns_bad_on"] if _d(i["turns_bad_on"]) else i["term_ends"]) for i in items if i["kind"] == "renewal"]
    dl = (opp or {}).get("deadline") or {}
    if (dl.get("soon") or dl.get("passed")) and not dl.get("met"):
        cells.append(_cell("red", f"Deadline {'passed' if dl.get('passed') else 'soon'}: {dl.get('text')}", deal_r, dl.get("date")))
    when = None if cells else (_d(term) or _d(dl.get("date")))
    if when:  # q4 had nothing: more than 120 days out, ended, or exactly on the line
        what, rec = ("Term ends", deal_r + [pp.rr("profile.json")]) if _d(term) else ("Deadline", deal_r)
        n = (when - today).days
        if n > AMBER_DAYS:
            cells.append(_cell("green", f"{what} {when}, {n} days left", rec, when - timedelta(days=AMBER_DAYS)))
        else:
            cells.append(_cell("red" if n < 0 else "amber", f"{what} {when}, {'passed' if n < 0 else f'{n} days left'}", rec, when))
    return _worst(cells) if cells else _cell("unknown", "no date on file")


def _people(roles, pp):
    """Deciders and payers that are a stakeholder or a named person -> [(name, stakeholder|None)]."""
    out = {}
    for e in [e for r in ("decides", "pays") for e in ((roles or {}).get(r) or {}).get("entries") or []]:
        s = pp.who(e.get("stakeholder"), e.get("who"))
        if s or e.get("person_named"):
            out.setdefault(s["name"] if s else e["who"], s)
    return list(out.items())


def _cold(row, pp, q4, today):
    people = _people(row[2], pp)
    if not people:
        return _cell("unknown", "no named decider or payer")
    cells = []
    for name, s in people:
        mine = [i for i in q4["items"] if i["kind"] == "cold" and _same(i.get("who"), name)]
        if mine:
            i = max(mine, key=lambda i: i["days_waiting"])
            cells.append(_cell("red", f"{name}: no reply {i['days_waiting']} days", i["receipts"], i["turns_bad_on"]))
            continue
        last, rec = pp.last_contact(name, (s or {}).get("id"))
        rel = (s or {}).get("relationship")
        sr = [{"id": s["id"], "kind": "stakeholder"}] if s else []
        age = (today - last).days if last else None
        if rel == "guarded":
            cells.append(_cell("amber", f"{name}: guarded", sr + rec, last + timedelta(days=CONTACT_DAYS + 1) if age and age > CONTACT_DAYS else None))
        elif age is not None and age > CONTACT_DAYS:
            cells.append(_cell("amber", f"{name}: no contact for {age} days", sr + rec, last + timedelta(days=CONTACT_DAYS + 1)))
        elif age is not None and rel in ("warm", "neutral", "ally"):
            cells.append(_cell("green", f"{name}: contact {max(age, 0)} days ago", sr + rec, last + timedelta(days=CONTACT_DAYS + 1)))
        else:
            cells.append(_cell("unknown", f"{name}: standing not on file" if last else f"{name}: no dated contact on file", sr + rec))
    return _worst(cells)


def _blocked(row):
    d, opp, _, items, _ = row
    if opp is None:
        return _cell("unknown", "no deal record" if d["kind"] == "contract" else "no blocker record")
    deal_r = [{"id": d["id"], "kind": "deal"}]
    b = opp.get("blocker") or {}
    if b.get("status") == "open":
        return _cell("red", b.get("text") or "open blocker", deal_r)
    stuck = [i for i in items if i["kind"] == "stuck"]
    if stuck:
        return _cell("amber", stuck[0]["text"], stuck[0]["receipts"], stuck[0].get("dated"))
    if not b:
        return _cell("green", "no blocker on record", deal_r)
    return _cell("green", "blocker cleared", deal_r) if b.get("status") == "cleared" else _cell("unknown", f"blocker {b.get('status')}", deal_r)


def radar(acc, q1, q2, q4, paperwork, today):
    pp = _Paper(acc, paperwork)
    return {"deals": [{"deal": r[0], "deadline": _deadline(r, pp, today), "cold": _cold(r, pp, q4, today), "blocked": _blocked(r)}
                      for r in _rows(acc, q1, q2, q4)]}


def settle(rd):
    """Run after the receipt check: a green cell left with no receipt is shown unknown. Then count."""
    counts = {k: dict.fromkeys(LEVELS, 0) for k in CELLS}
    for r in rd["deals"]:
        for k in CELLS:
            c = r[k]
            if c["level"] == "green" and not c["receipts"]:
                c.update(level="unknown", label="no record backs it", date=None)
            counts[k][c["level"]] += 1
    rd["counts"] = counts
    return rd


def power(acc, q1, q2, paperwork):
    pp = _Paper(acc, paperwork)
    facts = {f["id"]: f for f in acc.get("facts") or []}

    def p(name, s=None, title=None, side="org", rel=None, receipts=(), why=None):
        x = {"id": s["id"] if s else None, "name": name, "title": title or (s or {}).get("role"), "side": side,
             "relationship": (s or {}).get("relationship") or rel or NA, "basis": "inferred" if why else "record"}
        return {**x, **({"why": _cut(why, 60)} if why else {}), "waiting_on": pp.waiting_on(name), "receipts": _dedupe(receipts)}

    def of(e):
        if not e.get("who"):  # an open blocker no person is named on; unnamed payers and logins are q2/q5 gaps already
            return p(e["text"], title="open blocker, no person named", receipts=e["receipts"]) if e.get("text") else None
        s = pp.who(e.get("stakeholder"), e["who"])
        side = "customer" if s or e.get("person_named") else "flytbase" if "flytbase" in e["who"].lower() else "org"
        return p(s["name"] if s else e["who"], s, e.get("title") or (None if s else e.get("role")), side, e.get("stands"),
                 e.get("receipts") or [])

    def role(cell):
        out = {}
        for x in filter(None, map(of, (cell or {}).get("entries") or [])):
            out.setdefault(x["id"] or x["name"], x)
        return list(out.values())

    def champions(o):
        said = {}
        for e in o.get("evidence") or []:
            f = facts.get(e)
            s = pp.who(name=f["said_by"]) if f else None
            if s and s.get("relationship") == "warm":
                said.setdefault(s["id"], (s, []))[1].append(f)
        out = []
        for s, fs in said.values():
            f = next((f for f in fs if f["status"] != "claim"), fs[0])
            out.append(p(s["name"], s, side="customer", why=f"warm, spoke for this deal ({f['id']})",
                         receipts=[{"id": s["id"], "kind": "stakeholder"}, {"id": f["id"], "kind": "fact", "status": f["status"]}]))
        return out

    bands = {l["id"]: b for b, ls in q1["bands"].items() for l in ls if l["id"]}
    opps = {o["id"]: o for o in acc.get("opportunities") or []}
    rows = [({"id": d["deal"], "title": d["title"], "band": bands.get(d["deal"])}, d["roles"], champions(opps[d["deal"]]))
            for d in q2["deals"] if d["deal"] in opps]
    rows += [({"id": None, "title": l["title"], "band": "on_contract"}, q2.get("contract") or {}, [])
             for l in q1["bands"]["on_contract"] if l["id"] is None]
    deals = []
    for d, r, champ in rows:
        roles = {"decides": role(r.get("decides")), "pays": role(r.get("pays")), "uses": role(r.get("uses")),
                 "blocks": role(r.get("could_block")), "champion": champ}
        deals.append({"deal": d, "roles": roles, "gaps": [k for k, v in roles.items() if not v]})
    return {"deals": deals}
