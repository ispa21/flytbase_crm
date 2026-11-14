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
