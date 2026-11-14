"""Records as they stand now: paperwork plus what signals brought since, and the game's "today". Pure."""
import csv
import io
import logging
import re
from datetime import date, timedelta

log = logging.getLogger("aq.records")
AHEAD_MAX = 31  # days: a record dated further past the server date is treated as a typo, not as the clock
_DATE = re.compile(r"^Date: (\d{1,2}) (\w+) (\d{4})", re.M)
_MON = {m: i + 1 for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split())}


def merged(paperwork, signals, aid):
    """Paperwork with signal records folded in: a new path is added; a CSV row block for a path on file
    ("Row to add to ...") is appended, exact duplicate lines dropped. A non-CSV record already on file is kept as is."""
    sig_recs = [r for s in signals or [] if isinstance(s, dict) and s.get("account") == aid
                for r in s.get("records") or [] if isinstance(r, dict) and (r.get("path") or "").startswith(f"{aid}/")]
    if not sig_recs:
        return paperwork
    recs = {r["path"]: dict(r) for r in (paperwork or {}).get("records") or []}
    for r in sig_recs:
        path, text = r["path"][len(aid) + 1:], r.get("text") or ""
        have = recs.get(path)
        if have is None:
            recs[path] = {"path": path, "kind": r.get("kind") or "record", "text": text, "from_signal": True}
        elif path.endswith(".csv") and have.get("text"):
            old = have["text"].splitlines()
            new = text.splitlines()
            if new and old and new[0] == old[0]:  # same header: append the rows not already there
                rows = [ln for ln in new[1:] if ln and ln not in old]
                if rows:
                    have["text"] = "\n".join(old + rows) + "\n"
            else:
                log.warning("signal CSV %s has a different header; not merged", r["path"])
    return {**(paperwork or {"account": aid}), "records": list(recs.values())}


def _record_dates(paperwork):
    """Dates of things that happened (sent, held, opened, flown, logged). Never a deadline or a term end."""
    recs = {r["path"]: r for r in (paperwork or {}).get("records") or []}
    data = lambda p: (recs.get(p) or {}).get("data") or {}  # noqa: E731
    out = [m.get("date") for m in data("mail_log.json").get("mail") or []]
    out += [c.get("date") for c in data("calls_index.json").get("calls") or []]
    out += [t.get("opened") for t in data("tickets.json").get("tickets") or []]
    for p in ("requests.csv", "device_events.csv", "flights.csv"):
        col = "opened" if p == "requests.csv" else "date"
        out += [r.get(col) for r in csv.DictReader(io.StringIO((recs.get(p) or {}).get("text") or ""))]
    for p, r in recs.items():
        m = _DATE.search(r.get("text") or "") if p.startswith("emails/") else None
        if m and _MON.get(m.group(2)[:3].lower()):
            out.append(f"{m.group(3)}-{_MON[m.group(2)[:3].lower()]:02d}-{int(m.group(1)):02d}")
    return out


def game_today(server_today, paperworks, signals):
    """-> (today, basis). The later of the server date and the newest dated record or signal, so a record
    dated after the server clock (the game runs ahead) is never in the future. Capped at AHEAD_MAX days ahead."""
    cands = [s.get("dated") for s in signals or [] if isinstance(s, dict)]
    for pw in paperworks:
        cands += _record_dates(pw)
    limit = server_today + timedelta(days=AHEAD_MAX)
    days = [d for d in (_parse(c) for c in cands) if d and server_today < d <= limit]
    if not days:
        return server_today, "server date"
    return max(days), "newest record on file"


def _parse(s):
    try:
        return date.fromisoformat(s[:10]) if isinstance(s, str) and re.match(r"\d{4}-\d{2}-\d{2}", s) else None
    except ValueError:
        return None
