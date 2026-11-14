import pytest

from app.book import ReceiptError, build_book, check_receipts
from app.mcp import unwrap
from tests.test_worker import db, fixture  # noqa: F401  (db is a pytest fixture)


def load(db):
    for tool, args in [("get_my_accounts", {}), ("get_all_paperwork", {"account": "A"}),
                       ("get_all_paperwork", {"account": "B"})]:
        db.add_snapshot(tool, args, unwrap(fixture(tool, args)), 1000.0)
    return build_book(db, strict=True)


def vals(q, band):
    return {(l["id"] or l["title"]): l["value"] for l in q["bands"][band]}


def test_account_a(db):
    q = load(db)["accounts"]["A"]["q1"]
    oc = q["bands"]["on_contract"][0]
    assert oc["value"] == 350000 and oc["renewal_risk"] and {"id": "A/contract.txt", "kind": "record"} in oc["receipts"]
    assert q["totals"]["on_contract"]["by_currency"] == {"GBP": 350000}
    assert vals(q, "backed_upside") == {"a_training": 45000}
    ub = q["bands"]["unbacked"]
    assert len(ub) == 2
    ids = {r["id"] for l in ub for r in l["receipts"]}
    assert {"rc_tender_0", "rc_stadium_0", "rc_stadium_3"} <= ids and all(l["value"] is None for l in ub)
    assert set(vals(q, "unpriced")) == {"a_tarn", "a_westmere"}  # a_renewal not here


def test_account_b(db):
    q = load(db)["accounts"]["B"]["q1"]
    oc = q["bands"]["on_contract"][0]
    assert oc["value"] == 140000 and oc["blocker"]["status"] == "open" and q["currency"] == "EUR"
    assert vals(q, "backed_upside") == {"b_reporting": 70000}
    assert vals(q, "unbacked") == {"b_idle": 180000, "b_sister": 1200000}
    assert all(l["blocker"] for l in q["bands"]["unbacked"])
    assert set(vals(q, "unpriced")) == {"b_insurance"}
    assert q["totals"]["unbacked"]["by_currency"] == {"EUR": 1380000}


def test_claim_pairs(db):
    a, b = (load(db)["accounts"][k]["q1"]["claims"] for k in "AB")
    pairs = {(p["claim"]["id"], p["later"][0]["id"]): p["struck_through"] for p in a["pairs"] + b["pairs"]}
    assert pairs == {("rc_appetite_0", "rc_appetite_2"): False, ("rc_stadium_0", "rc_stadium_3"): False,
                     ("sr_roll_0", "sr_roll_2"): True}
    assert {p["claim"]["id"] for p in a["unpaired"] + b["unpaired"]} == {"rc_funding_0", "sr_roi_0"}
    assert all(p["label"] == "same topic (by id)" for p in a["pairs"] + b["pairs"])


def test_empty_store(db):
    assert build_book(db) == {"as_of": None, "state": "waiting for first sync", "accounts": {}}


def test_missing_receipt_dropped_and_fails_strict():
    node = {"receipts": [{"id": "ok", "kind": "fact"}, {"id": "ghost", "kind": "fact"}]}
    known = {("fact", "ok")}
    with pytest.raises(ReceiptError):
        check_receipts({"receipts": list(node["receipts"])}, known, strict=True)
    assert check_receipts(node, known) == [{"id": "ghost", "kind": "fact"}] and node["receipts"] == [{"id": "ok", "kind": "fact"}]


def test_api_book_empty(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    from app.db import DB
    monkeypatch.setattr(main, "_db", lambda: DB("sqlite::memory:"))
    r = TestClient(main.app).get("/api/book")
    assert r.status_code == 200 and r.json()["as_of"] is None


def load2(db):
    for f in ("flight_log_by_plant", "flight_log_force_month"):
        db.add_snapshot("get_file", {"id": f}, unwrap(fixture("get_file", {"id": f})), 1000.0)
    return load(db)["accounts"]


def test_flight_log_cleaning(db):
    a, b = (load2(db)[k]["q2"]["flight_log"] for k in "AB")
    assert b["missing"] == [{"plant": 12, "month": "2026-08"}] and a["missing"] == [{"force": "Metro Central", "month": "2026-07"}]
    assert {(d["line"], d["reason"]) for d in b["dropped"]} == {(21, "exact duplicate")}
    assert {(d["line"], d["reason"]) for d in a["dropped"]} == {(8, "exact duplicate"), (26, "blank re-sent row")}
    assert {r["plant"] for r in b["rows"]} == set(range(1, 16)) and {r["force"] for r in a["rows"]} == {"Westmere", "Metro Central", "Tarn Valley", "Norwold"}
    dm = b["dock_map"]
    assert dm[11]["dock"] == "AD-01" and dm[14]["dock"] == "AD-14" and dm[11]["label"] == "matched by monthly flight counts" and 15 not in dm
    assert len(dm) == 14 and {"id": "flight_log_by_plant", "kind": "file"} in dm[11]["receipts"] and a["dock_map"] is None


def cells(q, deal):
    return next(d for d in q["deals"] if d["deal"] == deal)["roles"]


def test_power_a(db):
    q = load2(db)["A"]["q2"]
    r = cells(q, "a_renewal")
    d = r["decides"]["entries"][0]
    assert d["who"] == "the alliance office" and not d["person_named"] and d["stands"] == "not on file"
    p = r["pays"]["entries"][0]
    assert len(p["paid_invoices"]) == 4 and "Schedule 2" in p["gap"] and len(p["amounts_missing"]) == 4
    assert r["could_block"]["status"] == "gap" and r["could_block"]["entries"] == []
    assert {"deal": "a_renewal", "role": "could_block", "why": "no open blocker or request on file"} in q["gaps"]
    assert any(u.get("who") == "Rhys Calder" and u["stands"] == "warm" for u in r["uses"]["entries"])


def test_power_b(db):
    q = load2(db)["B"]["q2"]
    r = cells(q, "b_renewal")
    d = r["decides"]["entries"][0]
    assert d["who"] == "Stefan Roy" and d["person_named"] and d["stands"] == "warm"
    ids = {x["id"] for x in d["receipts"]}
    assert {"B/contract.txt", "B/calls/2026-01-08_order_call.txt", "stefan_roy"} <= ids
    assert r["pays"]["entries"][0]["who"] == "group security" and r["pays"]["entries"][0]["paid_invoices"] == ["INV-26-0204"]
    blk = {e.get("request") or "blocker": e for e in r["could_block"]["entries"]}
    assert blk["blocker"]["text"].startswith("Finance cannot verify")
    fin = blk["(none)"]
    assert "Group finance" in fin["who"] and {"id": "B/emails/2026-10-08_finance_mailbox.txt", "kind": "record"} in fin["receipts"]
    assert cells(q, "b_insurance")["could_block"]["status"] == "gap"
    sr = next(v for v in next(x for x in q["deals"] if x["deal"] == "b_renewal")["voices"] if v["who"] == "Stefan Roy")
    assert sr["backing"] == "on file" and sr["claims"] == ["sr_roll_0"]


def test_power_without_paperwork_or_files(db):
    db.add_snapshot("get_my_accounts", {}, unwrap(fixture("get_my_accounts", {})), 1000.0)
    q = build_book(db, strict=True)["accounts"]["B"]["q2"]
    assert q["loaded"] is False and q["flight_log"] is None
    r = cells(q, "b_renewal")
    assert r["decides"]["status"] == r["pays"]["status"] == "gap" and r["uses"]["entries"] == []
    assert r["could_block"]["entries"][0]["who"] is None  # open blocker text only, no person invented


def test_q2_receipt_check_strict(db):
    q = load2(db)["B"]["q2"]
    with pytest.raises(ReceiptError):
        check_receipts({"deals": [{"receipts": [{"id": "B/nope.txt", "kind": "record"}]}]}, {("record", "B/contract.txt")}, strict=True)
    assert q["gaps"]
