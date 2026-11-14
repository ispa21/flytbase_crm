"""Insights: fixed rules over one account's records, joined only on exact keys (dock id, ticket id, exact name).
Never a reading of meaning, never an LLM. Each insight: headline with its numbers, tone, plain-English method,
window, the rows behind the count, and receipts (checked by book.check_receipts like every other answer).
A rule whose input file is missing reports it in `not_checked` and produces nothing."""
import csv
import io
import re
import statistics
from datetime import date, timedelta

from .book import _contract_signer, _rec
from .views import _Paper, _same

IDLE_WEEKS, IDLE_ONLINE_DAYS, IDLE_RED_SHARE = 2, 5, 0.2
TREND_WEEKS, TREND_PCT = 4, 20
CONN_DAYS, CONN_MIN = 30, 5
BATT_DAYS, BATT_MIN = 60, 3
CONTACT_DAYS, THREAD_DAYS = 30, 183
COST_WEEKS = 12
# call actions whose own words say they were not done (quoted, never paraphrased)
NOT_DONE = ("not received", "not sent", "not done", "not set up", "no reply on file", "not answered")
NO_OUTCOME = ("no outcome on file", "no further note")


def _rows(text):
    return list(csv.DictReader(io.StringIO(text or "")))


def _d(s):
    try:
        return date.fromisoformat(s[:10]) if isinstance(s, str) and re.match(r"\d{4}-\d{2}-\d{2}", s) else None
    except ValueError:
        return None


def _money(n, cur):
    return f"{cur} {n:,.0f}" if cur else f"{n:,.0f} (currency not on file)"


def account_insights(acc, paperwork, today):
    """-> {"items": [insight], "not_checked": [str]}. `paperwork` is already merged with signal records."""
    P = _Paper(acc, paperwork)
    aid, rr = acc["id"], P.rr
    items, not_checked = [], []

    def add(rule, tone, headline, method, window, rows, receipts, **kw):
        items.append({"id": f"{aid}:{rule}", "rule": rule, "account": aid, "tone": tone, "headline": headline, "method": method,
                      "window": window, "rows": rows, "receipts": receipts, **kw})

    usage = _rows(P.text("usage_weekly.csv"))
    events = _rows(P.text("device_events.csv"))
    docks = [d["dock_id"] for d in P.data("devices.json").get("docks") or [] if d.get("dock_id")]
    if not usage:
        not_checked.append("usage_weekly.csv not on file: idle docks, fleet trend and cost per flight not checked")

    # I1 idle docks: online most of the week but no flight, in each of the last weeks on file
    weeks = sorted({r["week_start"] for r in usage if _d(r.get("week_start"))})
    if len(weeks) >= IDLE_WEEKS:
        last = weeks[-IDLE_WEEKS:]
        cell = {(r["dock_id"], r["week_start"]): r for r in usage}
        fleet = docks or sorted({r["dock_id"] for r in usage})
        idle = [d for d in fleet if all((x := cell.get((d, w))) and int(x["days_online"] or 0) >= IDLE_ONLINE_DAYS
                                        and int(x["flights"] or 0) == 0 for w in last)]
        end = _d(last[-1]) + timedelta(days=6)
        away = {}  # dock -> date the aircraft was taken away and not yet returned by the window's end
        for e in sorted(events, key=lambda e: e.get("date") or ""):
            if _d(e.get("date")) and _d(e["date"]) <= end:
                if e.get("event") == "aircraft_removed_for_maintenance":
                    away[e["dock_id"]] = e["date"]
                elif e.get("event") == "aircraft_returned":
                    away.pop(e["dock_id"], None)
        explained = [d for d in idle if d in away]
        unexplained = [d for d in idle if d not in away]
        if unexplained:
            share = len(unexplained) / len(fleet)
            add("idle_docks", "red" if share >= IDLE_RED_SHARE else "amber",
                f"{len(unexplained)} of {len(fleet)} docks were online but flew nothing for {IDLE_WEEKS} weeks",
                f"Docks online at least {IDLE_ONLINE_DAYS} days and with 0 flights in each of the last {IDLE_WEEKS} weeks on file"
                + (f"; {len(explained)} more had the aircraft away for maintenance and are not counted" if explained else ""),
                f"weeks of {last[0]} to {last[-1]}", unexplained,
                [rr("usage_weekly.csv")] + ([rr("devices.json")] if docks else []) + ([rr("device_events.csv")] if explained else []),
                explained=[{"dock": d, "away_since": away[d]} for d in explained], since=last[0], count=len(unexplained), of=len(fleet))

    # I2 fleet activity: flights per week, last 4 weeks on file against the 4 before; missing weeks never zero
    if weeks:
        tot = {w: sum(int(r["flights"] or 0) for r in usage if r["week_start"] == w) for w in weeks}
        first, lastw = _d(weeks[0]), _d(weeks[-1])
        expected = [(first + timedelta(weeks=i)).isoformat() for i in range((lastw - first).days // 7 + 1)]
        missing = [w for w in expected if w not in tot]
        series = [{"week": w, "flights": tot.get(w)} for w in expected]
        if len(weeks) >= 2 * TREND_WEEKS:
            a, b = weeks[-2 * TREND_WEEKS:-TREND_WEEKS], weeks[-TREND_WEEKS:]
            pa, pb = sum(tot[w] for w in a) / len(a), sum(tot[w] for w in b) / len(b)
            pct = round((pb - pa) / pa * 100) if pa else None
            tone = "info" if pct is None else "amber" if pct <= -TREND_PCT else "good" if pct >= TREND_PCT else "info"
            head = (f"Flights per week {'fell' if (pct or 0) < 0 else 'rose' if (pct or 0) > 0 else 'held'}"
                    f"{f' {abs(pct)}%' if pct else ''}: {pb:.0f} a week in the last {TREND_WEEKS} weeks against {pa:.0f} before")
            add("fleet_trend", tone, head, f"Average flights a week over the last {TREND_WEEKS} weeks on file against the {TREND_WEEKS} before",
                f"weeks of {a[0]} to {b[-1]}", [], [rr("usage_weekly.csv")], series=series, missing_weeks=missing, change_pct=pct)
        else:
            add("fleet_trend", "info", f"{len(weeks)} weeks of flights on file, too few to compare {TREND_WEEKS} weeks with {TREND_WEEKS}",
                "Needs 8 weeks on file", f"weeks of {weeks[0]} to {weeks[-1]}", [], [rr("usage_weekly.csv")], series=series, missing_weeks=missing)

    # I3 unstable connections and I4 battery warnings: counted per dock in the window ending at the last event on file
    if not events:
        not_checked.append("device_events.csv not on file: connection and battery checks not run")
    else:
        last_ev = max(_d(e["date"]) for e in events if _d(e.get("date")))
        tickets = {t["id"]: t for t in P.data("tickets.json").get("tickets") or []}

        def per_dock(kind, days):
            start = last_ev - timedelta(days=days - 1)
            c = {}
            for e in events:
                if e.get("event") == kind and _d(e.get("date")) and _d(e["date"]) >= start:
                    c[e["dock_id"]] = c.get(e["dock_id"], 0) + 1
            return c, start

        conn, start = per_dock("connection_lost", CONN_DAYS)
        bad = sorted(((n, d) for d, n in conn.items() if n >= CONN_MIN), reverse=True)
        if bad:
            linked = {}  # dock -> ticket ids its events cite, exact id only
            for e in events:
                for tid in re.findall(r"FB-\d+", e.get("detail") or ""):
                    if e["dock_id"] in conn and tid in tickets:
                        linked.setdefault(e["dock_id"], set()).add(tid)
            rows = [{"dock": d, "drops": n, "tickets": [{"id": t, "status": tickets[t].get("status")} for t in sorted(linked.get(d, ()))]}
                    for n, d in bad]
            tids = sorted({t for r in rows for t in (x["id"] for x in r["tickets"])})
            add("unstable_connection", "amber",
                f"{len(bad)} {'dock' if len(bad) == 1 else 'docks'} lost connection {CONN_MIN} or more times in {CONN_DAYS} days; worst {bad[0][1]}, {bad[0][0]} times",
                f"connection_lost events per dock in the {CONN_DAYS} days to the last event on file; tickets joined only where an event cites the ticket id",
                f"{start.isoformat()} to {last_ev.isoformat()}", rows,
                [rr("device_events.csv")] + [{"id": t, "kind": "ticket"} for t in tids] + ([rr("tickets.json")] if tids else []))

        batt, bstart = per_dock("battery_health_warning", BATT_DAYS)
        weak = sorted(((n, d) for d, n in batt.items() if n >= BATT_MIN), reverse=True)
        if weak:
            add("battery_warnings", "amber",
                f"{len(weak)} {'dock' if len(weak) == 1 else 'docks'} logged {BATT_MIN} or more battery warnings in {BATT_DAYS} days; worst {weak[0][1]}, {weak[0][0]}",
                f"battery_health_warning events per dock in the {BATT_DAYS} days to the last event on file",
                f"{bstart.isoformat()} to {last_ev.isoformat()}", [{"dock": d, "warnings": n} for n, d in weak], [rr("device_events.csv")])

    # I5 logins gone quiet: no sign-in in 90 days; named contacts and the contract signer called out by exact name
    users = P.data("users.json").get("users") or []
    if users:
        sg = _contract_signer(P.text("contract.txt"))
        quiet = [u for u in users if u.get("sign_ins_last_90_days") == 0]
        named = []
        for u in quiet:
            s = P.who(name=u.get("name")) if u.get("name") else None
            signer = bool(u.get("name") and sg and sg["named"] and _same(sg["who"], u["name"]))
            if s or signer:
                named.append({"name": u["name"], "role": u.get("role"), "last_sign_in": u.get("last_sign_in"),
                              "signer": signer, "stakeholder": s["id"] if s else None})
        if quiet:
            who = "; ".join(f"{n['name']}{' (contract signer)' if n['signer'] else ''}, last {n['last_sign_in']}" for n in named)
            add("quiet_logins", "amber" if named else "info",
                f"{len(quiet)} of {len(users)} logins had no sign-in in 90 days" + (f", including {who}" if named else ""),
                "users.json sign_ins_last_90_days = 0; names matched exactly to stakeholders and the contract signer",
                "last 90 days (as users.json reports)", named or [{"logins": len(quiet)}],
                [rr("users.json")] + ([rr("contract.txt")] if any(n["signer"] for n in named) else [])
                + [{"id": n["stakeholder"], "kind": "stakeholder"} for n in named if n["stakeholder"]])
    else:
        not_checked.append("users.json not on file: login activity not checked")

    # I6 promises not kept: call actions whose own text says not done (quoted)
    calls = P.data("calls_index.json").get("calls") or []
    open_, unknown = [], []
    for c in calls:
        for a in c.get("actions") or []:
            low = a.lower()
            row = {"date": c.get("date"), "call": c.get("title"), "action": a, "path": c.get("path")}
            if any(k in low for k in NOT_DONE):
                open_.append(row)
            elif any(k in low for k in NO_OUTCOME):
                unknown.append(row)
    if open_ or unknown:
        rec = [rr("calls_index.json")] + [rr(p) for p in dict.fromkeys(r["path"] for r in open_ + unknown if r["path"])]
        add("promises_open", "amber" if open_ else "info",
            f"{len(open_)} call {'action' if len(open_) == 1 else 'actions'} the records say were not done"
            + (f", {len(unknown)} more with no outcome on file" if unknown else ""),
            f"calls_index.json actions whose text says one of: {', '.join(NOT_DONE)} (quoted as written)",
            f"calls of {min(r['date'] for r in open_ + unknown)} to {max(r['date'] for r in open_ + unknown)}",
            sorted(open_, key=lambda r: r["date"], reverse=True) + sorted(unknown, key=lambda r: r["date"], reverse=True), rec)

    # I7 support load: open tickets, first response, oldest request still open
    tks = P.data("tickets.json").get("tickets") or []
    reqs = [r for r in _rows(P.text("requests.csv")) if r.get("status") in ("Open", "Pending customer")]
    if tks or reqs:
        fr = [t["first_response_hours"] for t in tks if isinstance(t.get("first_response_hours"), (int, float))]
        opn = [t for t in tks if t.get("status") != "Closed"]
        unowned = [r for r in reqs if not (r.get("owner") or "").strip()]
        oldest = min(reqs, key=lambda r: r.get("opened") or "9999") if reqs else None
        bits = [f"{len(opn)} open {'ticket' if len(opn) == 1 else 'tickets'} of {len(tks)}"]
        if fr:
            bits.append(f"median first response {statistics.median(fr):g} hours")
        if reqs:
            bits.append(f"{len(reqs)} open {'request' if len(reqs) == 1 else 'requests'} ({len(unowned)} with no owner)")
        rows = [{"id": t["id"], "subject": t.get("subject"), "status": t.get("status"), "since": t.get("opened")} for t in opn]
        rows += [{"id": r.get("request_id"), "subject": r.get("summary"), "status": r.get("status"), "since": r.get("opened"),
                  "owner": r.get("owner") or None} for r in reqs]
        add("support_load", "amber" if unowned else "info", "; ".join(bits),
            "tickets.json (status, first_response_hours) and requests.csv rows still Open or Pending customer",
            f"oldest open request {oldest['opened']}" if oldest else "all tickets on file", rows,
            ([rr("tickets.json")] if tks else []) + ([rr("requests.csv")] if reqs else [])
            + [{"id": t["id"], "kind": "ticket"} for t in opn])

    # I8 relationship coverage: days since last contact per contact; single-threaded calls
    people = [(s["name"], s["id"]) for s in acc.get("stakeholders") or []]
    people += [(c.get("name"), c.get("id")) for c in P.data("profile.json").get("contacts_on_file") or []
               if c.get("name") and not any(_same(c["name"], n) for n, _ in people)]
    seen, rec = [], []
    for name, sid in people:
        last, r = P.last_contact(name, sid)
        if last:
            seen.append({"name": name, "last_contact": last.isoformat(), "days": (today - last).days})
            rec += r
    recent = [c for c in calls if _d(c.get("date")) and (today - _d(c["date"])).days <= THREAD_DAYS]
    on_calls = sorted({n for c in recent for n in c.get("customer") or []})
    single = len(on_calls) == 1 and len(recent) >= 2
    stale = [p for p in seen if p["days"] > CONTACT_DAYS]
    if seen or single:
        bits = []
        if single:
            bits.append(f"all {len(recent)} calls in the last 6 months were with {on_calls[0]} alone")
        if stale:
            bits.append(f"{len(stale)} of {len(seen)} contacts not heard from in over {CONTACT_DAYS} days")
        if not bits:
            bits.append(f"every contact on file heard from in the last {CONTACT_DAYS} days")
        head = "; ".join(bits)
        add("relationship", "amber" if single or stale else "info", head[:1].upper() + head[1:],
            f"Latest dated contact per person (profile, mail they sent, calls they were on); calls in the last {THREAD_DAYS} days by customer attendee",
            f"to {today.isoformat()}", sorted(seen, key=lambda p: -p["days"]),
            list({(x["kind"], x["id"]): x for x in rec + ([rr("calls_index.json")] if recent else [])}.values()),
            single_threaded=on_calls[0] if single else None)

    # I9 cost per dock and per flight: arithmetic on the contract value, the docks and the flights on file
    prof = P.data("profile.json")
    value, cur = (prof.get("renewal") or {}).get("annual_value"), prof.get("currency")
    if value and docks and len(weeks) >= COST_WEEKS:
        w12 = weeks[-COST_WEEKS:]
        fl = sum(int(r["flights"] or 0) for r in usage if r["week_start"] in w12)
        per_year = fl * 52 / COST_WEEKS
        rows = [{"label": "Annual value", "value": _money(value, cur)}, {"label": "Docks", "value": len(docks)},
                {"label": "Per dock a year", "value": _money(value / len(docks), cur)},
                {"label": f"Flights, last {COST_WEEKS} weeks", "value": fl}]
        if fl:
            rows.append({"label": "Per flight (annualised)", "value": _money(value / per_year, cur)})
        add("cost", "info",
            f"{_money(value / len(docks), cur)} per dock a year" + (f"; {_money(value / per_year, cur)} per flight at the current rate" if fl else "; no flights in 12 weeks"),
            f"Computed: annual value / docks registered; annual value / (flights in the last {COST_WEEKS} weeks x 52/{COST_WEEKS})",
            f"weeks of {w12[0]} to {w12[-1]}", rows, [rr("profile.json"), rr("devices.json"), rr("usage_weekly.csv")])

    order = {"red": 0, "amber": 1, "good": 2, "info": 3}
    items.sort(key=lambda i: order[i["tone"]])
    return {"items": items, "not_checked": not_checked}


# Insight -> risk item (q4) and move (q3). Only the rules with a clear "what goes wrong" and a clear action.
RISKY = {"idle_docks", "unstable_connection", "quiet_logins", "promises_open"}


def risk_items(ins):
    out = []
    for i in ins["items"]:
        if i["rule"] in RISKY and i["tone"] in ("red", "amber"):
            out.append({"kind": "insight", "rule": i["rule"], "level": i["tone"], "deal": None,
                        "text": i["headline"], "turns_bad_on": f"already happening ({i['window']})", "receipts": list(i["receipts"])})
    return out


def move_action(rule, ins):
    """Plain action line for an insight, built from its own rows."""
    rows = ins["rows"]
    if rule == "idle_docks":
        return f"Ask why {ins['count']} paid docks are online but not flying ({', '.join(rows[:4])}{'…' if len(rows) > 4 else ''})"
    if rule == "unstable_connection":
        return f"Get the connection fixed on {rows[0]['dock']}" + (f" ({rows[0]['tickets'][0]['id']})" if rows[0]["tickets"] else "")
    if rule == "quiet_logins":
        n = next((r for r in rows if r.get("name")), None)
        return f"Check in with {n['name']}: no sign-in in 90 days" if n else "Find out who holds the unused logins"
    if rule == "promises_open":
        return f"Close the open action: {rows[0]['action']}"
    return ins["headline"]
