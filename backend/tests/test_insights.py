"""Insights (fact-only rules), merged signal records, the game's today, automation drafts, note titles, 15 accounts."""
import copy
from datetime import date

from app.book import band_deals, build_book
from app.crm import drafts, note_args, validate_note
from app.mcp import unwrap
from app.records import game_today, merged
from tests.test_worker import db, fixture  # noqa: F401  (db is a pytest fixture)

TODAY = date(2026, 11, 14)


def load(db, signals=True):
    if signals:
        db.add_snapshot("get_signals", {}, unwrap(fixture("get_signals", {})), 1000.0)
    db.add_snapshot("get_flytbase_team", {}, unwrap(fixture("get_flytbase_team", {})), 1000.0)
    for tool, args in [("get_my_accounts", {}), ("get_all_paperwork", {"account": "A"}), ("get_all_paperwork", {"account": "B"})]:
        db.add_snapshot(tool, args, unwrap(fixture(tool, args)), 1000.0)
    return build_book(db, strict=True, today=TODAY)  # strict: every insight receipt is a real record, ticket or stakeholder


def ins(book, acc):
    return {i["rule"]: i for i in book["accounts"][acc]["insights"]["items"]}


def test_insights_a(db):
    a = ins(load(db), "A")
    idle = a["idle_docks"]
    assert (idle["tone"], idle["count"], idle["of"]) == ("red", 15, 35) and "ECPA-D03" in idle["rows"]
    assert {e["dock"] for e in idle["explained"]} == {"ECPA-D06", "ECPA-D13"}  # aircraft away for maintenance, not counted
    assert {"id": "A/usage_weekly.csv", "kind": "record"} in idle["receipts"]
    assert a["fleet_trend"]["change_pct"] == -10 and a["fleet_trend"]["tone"] == "info" and a["fleet_trend"]["missing_weeks"] == []
    assert a["battery_warnings"]["rows"][0] == {"dock": "ECPA-D29", "warnings": 8}
    pr = a["promises_open"]
    assert pr["headline"].startswith("6 call actions") and any(r["action"].endswith("(Not set up before the handover.)") for r in pr["rows"])
    assert a["relationship"]["single_threaded"] == "Rhys Calder"
    assert a["cost"]["headline"].startswith("GBP 10,000 per dock a year")
    assert "unstable_connection" not in a


def test_insights_b(db):
    b = ins(load(db), "B")
    assert b["idle_docks"]["rows"] == ["AD-01", "AD-06", "AD-14"]
    con = b["unstable_connection"]
    assert con["rows"][0]["dock"] == "AD-12" and con["rows"][0]["drops"] == 15 and con["window"] == "2026-09-29 to 2026-10-28"
    q = b["quiet_logins"]
    assert q["tone"] == "amber" and q["rows"][0]["name"] == "Stefan Roy" and q["rows"][0]["signer"] is True
    assert {"id": "B/contract.txt", "kind": "record"} in q["receipts"] and {"id": "stefan_roy", "kind": "stakeholder"} in q["receipts"]


def test_insights_feed_risks_and_moves(db):
    bk = load(db)
    a = bk["accounts"]["A"]
    assert [i["rule"] for i in a["q4"]["items"] if i["kind"] == "insight"] == ["idle_docks", "promises_open"]
    mv = next(m for m in a["q3"]["moves"] if m["kind"] == "insight")
    assert mv["action"].startswith("Ask why 15 paid docks are online but not flying") and mv["due"] == "2026-11-20"


def test_missing_file_is_a_gap_not_a_zero(db):
    pw = unwrap(fixture("get_all_paperwork", {"account": "A"}))
    pw["records"] = [r for r in pw["records"] if r["path"] != "usage_weekly.csv"]
    ma = unwrap(fixture("get_my_accounts", {}))
    out = band_deals(ma, {"A": pw}, strict=True, today=TODAY)["A"]
    assert not {"idle_docks", "fleet_trend", "cost"} & {i["rule"] for i in out["insights"]["items"]}
    assert any("usage_weekly.csv not on file" in g["text"] for g in out["q5"]["gaps"])


def test_merged_signal_records():
    pw = unwrap(fixture("get_all_paperwork", {"account": "A"}))
    sig = unwrap(fixture("get_signals", {}))["signals"]
    m = merged(pw, sig, "A")
    recs = {r["path"]: r for r in m["records"]}
    assert "emails/2026-11-18_karen_event.txt" in recs and recs["emails/2026-11-18_karen_event.txt"]["from_signal"]
    assert recs["requests.csv"]["text"].count("FB-11206") == 1
    again = {r["path"]: r for r in merged(m, sig, "A")["records"]}  # idempotent: re-merging adds nothing
    assert again["requests.csv"]["text"] == recs["requests.csv"]["text"] and len(again) == len(recs)
    assert merged(pw, sig, "B") is pw  # no signal records for B: paperwork untouched
    odd = [{"account": "A", "records": [{"path": "A/requests.csv", "text": "other,header\nx,y\n"}]}]
    assert merged(pw, odd, "A")["records"] == pw["records"] or "x,y" not in {r["path"]: r for r in merged(pw, odd, "A")["records"]}["requests.csv"]["text"]


def test_game_today():
    pw = unwrap(fixture("get_all_paperwork", {"account": "A"}))
    sig = unwrap(fixture("get_signals", {}))["signals"]
    assert game_today(TODAY, [merged(pw, sig, "A")], sig) == (date(2026, 11, 18), "newest record on file")
    assert game_today(date(2026, 12, 1), [pw], sig) == (date(2026, 12, 1), "server date")  # nothing newer than the server
    far = [{"dated": "2027-06-01"}]
    assert game_today(TODAY, [], far) == (TODAY, "server date")  # more than 31 days ahead: a typo, not the clock


def test_drafts_notes_and_titles(db, monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    load(db)
    monkeypatch.setattr(main, "_db", lambda: db)
    monkeypatch.setattr(db, "close", lambda: None)
    c = TestClient(main.app)
    ds = c.get("/api/drafts").json()["drafts"]
    assert ds and all(d["level"] in ("red", "amber") and d["decision"] is None for d in ds)
    assert {d["id"] for d in ds} == {d["id"] for d in drafts(build_book(db, today=TODAY), {})}  # stable ids
    d0, d1 = ds[0], ds[1]
    r = c.post("/api/notes", json={"account": d0["account"], "kind": "risk", "title": d0["title"], "text": d0["text"], "draft": d0["id"]})
    assert r.status_code == 200
    assert c.post(f"/api/drafts/{d1['id']}/dismiss").json()["status"] == "dismissed"
    assert c.post("/api/drafts/nope/dismiss").status_code == 404
    got = {d["id"]: d["decision"] for d in c.get("/api/drafts").json()["drafts"]}
    assert got[d0["id"]]["status"] == "approved" and got[d0["id"]]["note_id"] == r.json()["id"] and got[d1["id"]]["status"] == "dismissed"
    n = db.claim_note(r.json()["id"])
    assert note_args(n)["title"] == d0["title"]
    assert c.get("/api/insights").json()["accounts"]["A"]["items"]


def test_validate_note_new_account_and_title():
    accs = [{"id": "A", "opportunities": []}, {"id": "H", "paperwork_only": True}]
    ok, why = validate_note({"account": "H", "text": "hi", "title": "t"}, accs)
    assert why is None and ok["title"] == "t"
    assert validate_note({"account": "A", "text": "x", "title": "y" * 121}, accs)[1]
    assert validate_note({"account": "Z", "text": "x"}, accs)[1].startswith("unknown account")


def test_fifteen_accounts_all_answered():
    ma = unwrap(fixture("get_my_accounts", {}))
    base = {k: unwrap(fixture("get_all_paperwork", {"account": k})) for k in "AB"}
    ids = [chr(ord("A") + n) for n in range(15)]
    accs, pw = [], {}
    for n, i in enumerate(ids):
        src = ma["accounts"][n % 2]
        accs.append({**copy.deepcopy(src), "id": i})
        pw[i] = {**copy.deepcopy(base[src["id"]]), "account": i}
    out = band_deals({**ma, "accounts": accs}, pw, strict=True, today=TODAY)
    assert list(out) == ids
    for a in out.values():
        assert {"q1", "q2", "q3", "q4", "q5", "insights"} <= set(a) and len(a["q3"]["moves"]) == 3 and a["insights"]["items"]
