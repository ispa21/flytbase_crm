import pytest

from app.book import ReceiptError, build_book, check_receipts, what_changed
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


# ---- story 4.1: what is about to go wrong ----
from datetime import date  # noqa: E402

TODAY = date(2026, 11, 14)


def load4(db):
    for f in ("flight_log_by_plant", "flight_log_force_month"):
        db.add_snapshot("get_file", {"id": f}, unwrap(fixture("get_file", {"id": f})), 1000.0)
    db.add_snapshot("get_signals", {}, unwrap(fixture("get_signals", {})), 1000.0)
    for tool, args in [("get_my_accounts", {}), ("get_all_paperwork", {"account": "A"}), ("get_all_paperwork", {"account": "B"})]:
        db.add_snapshot(tool, args, unwrap(fixture(tool, args)), 1000.0)
    return build_book(db, strict=True, today=TODAY)["accounts"]


def of(q, kind):
    return [i for i in q["items"] if i["kind"] == kind]


def test_q4_renewal(db):
    a, b = (load4(db)[k]["q4"] for k in "AB")
    ra, rb = of(a, "renewal")[0], of(b, "renewal")[0]
    assert rb["level"] == "red" and rb["deal"] == "b_renewal" and rb["days_left"] == 74
    assert ra["level"] == "amber" and ra["turns_bad_on"] == "2026-11-30" and ra["days_left"] == 102
    assert {"id": "A/contract.txt", "kind": "record"} in ra["receipts"]
    assert [i["level"] for i in b["items"]][0] == "red"  # red sorts first


def test_q4_cold_stuck_usage(db):
    a, b = (load4(db)[k]["q4"] for k in "AB")
    cold = {i["who"]: i for i in of(a, "cold") + of(b, "cold")}
    assert cold["Insp. Karen Mbeki"]["days_waiting"] == 99 and cold["Insp. Karen Mbeki"]["turns_bad_on"] == "2026-08-25"
    assert cold["Insp. Karen Mbeki"]["receipts"][0]["id"] == "A/emails/2026-08-11_karen_batteries.txt"
    assert next(i for k, i in cold.items() if k.startswith("Group Finance"))["days_waiting"] == 41
    assert [i["ticket"] for i in of(a, "stuck") if "ticket" in i] == ["FB-10412"]
    assert any("b_idle" == i["deal"] and "no date" in i["text"] for i in of(b, "stuck"))
    assert any(i["deal"] == "b_renewal" and "Finance cannot verify" in i["text"] for i in of(b, "stuck"))
    drop = of(a, "usage_drop")
    assert [(d["force"], d["text"]) for d in drop] == [("Metro Central", "Metro Central: docks with live flights 8 in 2026-08, 3 in 2026-10")]
    assert {"id": "flight_log_force_month", "kind": "file"} in drop[0]["receipts"]


def test_q4_signals_keep_own_date(db):
    a, b = (load4(db)[k]["q4"] for k in "AB")
    sg = {i["receipts"][0]["id"]: i for i in of(a, "signal")}
    assert sg["champion_leaves"]["dated"] == "2026-11-17" and sg["urgent_request"]["dated"] == "2026-11-18"
    assert {"id": "A/emails/2026-11-17_rhys_moving.txt", "kind": "record"} in sg["champion_leaves"]["receipts"]
    assert of(b, "signal") == [] and a["today"] == "2026-11-18"  # game today: newest record on file (signal dated 18 Nov)


def test_q4_without_paperwork_or_signals(db):
    db.add_snapshot("get_my_accounts", {}, unwrap(fixture("get_my_accounts", {})), 1000.0)
    q = build_book(db, strict=True, today=TODAY)["accounts"]["B"]["q4"]
    assert q["loaded"] is False and q["signals_loaded"] is False
    assert not of(q, "renewal") and not of(q, "cold") and q["gaps"]
    assert [i["kind"] for i in q["items"]] == ["stuck"] * 4  # 3 open blockers + 1 undated deadline, all from the export


# ---- story 5.1: what we still do not know; 7.1 what changed ----
def test_q5_gaps(db):
    a, b = (load4(db)[k]["q5"] for k in "AB")
    ga = {g["text"]: g for g in a["gaps"]}
    pa = ga["Any finance contact, at the alliance or at a force."]
    assert pa["kind"] == "profile" and pa["who_could_fill"] == "sam (CSM on this account 2026-05 to 2026-11)" and {"id": "A/profile.json", "kind": "record"} in pa["receipts"]
    assert any(g["kind"] == "unpriced" and g["deals"][0]["id"] == "a_tarn" and g["value_at_stake"] is None for g in a["gaps"])
    cl = next(g for g in a["gaps"] if g["kind"] == "claim")  # claim-only fact: the speaker is the person named in the record
    assert cl["who_could_fill"] and cl["receipts"][0]["kind"] == "fact"
    gb = [g for g in b["gaps"] if g["deals"] and g["deals"][0]["id"] == "b_idle" and g["kind"] == "deadline"]
    assert gb and gb[0]["deals"][0]["value"] == 180000 and gb[0]["value_at_stake"] == 180000
    assert any(g["kind"] == "file" and "plant 12" in g["text"] and "2026-08" in g["text"] for g in b["gaps"])
    assert any(g["kind"] == "power" and g["text"].startswith("Who could block") for g in a["gaps"])


def test_q5_no_paperwork(db):
    db.add_snapshot("get_my_accounts", {}, unwrap(fixture("get_my_accounts", {})), 1000.0)
    q = build_book(db, strict=True, today=TODAY)["accounts"]["B"]["q5"]
    assert q["loaded"] is False and not any(g["kind"] == "profile" for g in q["gaps"])


def test_what_changed(db):
    load4(db)  # snapshots at t=1000
    db.add_signal({"id": "s_new", "account": "A", "title": "late"}, 2000.0)
    ma = unwrap(fixture("get_my_accounts", {}))
    ma["accounts"][0]["opportunities"][0]["stage"] = "closed"
    db.add_snapshot("get_my_accounts", {}, ma, 3000.0)
    c = what_changed(db, 1500.0, today=TODAY)
    assert [s["id"] for s in c["new_signals"]] == ["s_new"] and c["new_signals"][0]["receipts"] == [{"id": "s_new", "kind": "signal"}]
    assert [(m["deal"], m["stage"]["to"]) for m in c["moved"]] == [(ma["accounts"][0]["opportunities"][0]["id"], "closed")]
    assert what_changed(db, 5000.0, today=TODAY)["moved"] == [] and c["new_deals"] == []


# ---- story 6.1: first three moves ----
def test_q3_moves(db):
    a, b = (load4(db)[k]["q3"] for k in "AB")
    mb, ma = b["moves"], a["moves"]
    assert [m["rank"] for m in mb] == [1, 2, 3] and len(ma) == 3
    assert mb[0]["deal"]["id"] == "b_renewal" and mb[0]["level"] == "red" and mb[0]["turns_bad_on"] == "2026-11-02"
    assert mb[0]["due"] == "2026-11-18" and mb[0]["due_basis"] == "overdue: turned bad on 2026-11-02" and mb[0]["overdue_since"] == "2026-11-02"
    assert ma[0]["deal"]["id"] == "a_renewal" and ma[0]["due"] == "2026-11-25" and "held before 2026-11-30" in ma[0]["due_basis"]
    assert all(m["owner"] == "the CSM (you)" and {"id": "A/profile.json", "kind": "record"} in m["receipts"] for m in ma)
    assert all(m["draft_note"]["kind"] == "next_step" and m["receipts"][0]["id"] in m["draft_note"]["text"] for m in ma + mb)
    assert [m["kind"] for m in ma] == ["renewal", "insight", "signal"] and ma[2]["action"] == "Respond to: Westmere needs an answer before a public event"
    assert all(m["draft_note"]["title"] == m["action"][:120] for m in ma + mb)


def test_q3_no_paperwork(db):
    db.add_snapshot("get_my_accounts", {}, unwrap(fixture("get_my_accounts", {})), 1000.0)
    q = build_book(db, strict=True, today=TODAY)["accounts"]["B"]["q3"]
    assert q["loaded"] is False and all(m["owner"] == "not on file" for m in q["moves"])


# ---- story 8.1: radar and power per deal; paperwork-only accounts ----
def rows(acc):
    return {r["deal"]["id"]: r for r in acc["radar"]["deals"]}


def test_radar_a_b(db):
    bk = load4(db)
    a, b = rows(bk["A"]), rows(bk["B"])
    assert set(a) == {"a_renewal", "a_tarn", "a_westmere", "a_training"}  # declined offers and told-only lines are not rows
    assert set(b) == {"b_renewal", "b_idle", "b_insurance", "b_sister", "b_reporting"}
    ra, rb = a["a_renewal"], b["b_renewal"]
    assert (ra["deadline"]["level"], ra["deadline"]["date"]) == ("amber", "2026-11-30")
    assert (rb["deadline"]["level"], rb["deadline"]["date"]) == ("red", "2026-11-02") and rb["deal"]["value"] == 140000
    assert ra["cold"]["level"] == "unknown" and ra["cold"]["label"] == "no named decider or payer"  # alliance office, Schedule 2
    c = rb["cold"]
    assert c["level"] == "red" and c["label"] == "Stefan Roy: no reply 35 days" and c["date"] == "2026-10-28"  # our 14 Oct email, unanswered
    assert {"id": "B/mail_log.json", "kind": "record"} in c["receipts"]
    assert [b[d]["blocked"]["level"] for d in ("b_renewal", "b_idle", "b_insurance", "b_sister")] == ["red", "red", "green", "red"]
    assert ra["blocked"] == {"level": "green", "label": "no blocker on record", "date": None, "receipts": [{"id": "a_renewal", "kind": "deal"}]}
    off = a["a_training"]
    assert off["deal"]["kind"] == "offer" and {off[k]["level"] for k in ("deadline", "cold", "blocked")} == {"unknown"}
    assert bk["A"]["radar"]["counts"] == {"deadline": {"red": 0, "amber": 1, "green": 0, "unknown": 3},
                                          "cold": {"red": 0, "amber": 0, "green": 0, "unknown": 4},
                                          "blocked": {"red": 0, "amber": 0, "green": 3, "unknown": 1}}
    assert bk["B"]["radar"]["counts"]["blocked"] == {"red": 3, "amber": 0, "green": 1, "unknown": 1}
    for acc in bk.values():
        for r in acc["radar"]["deals"]:
            for k in ("deadline", "cold", "blocked"):
                assert len(r[k]["label"]) <= 48 and (r[k]["level"] != "green" or r[k]["receipts"])


def test_radar_green_and_bare_green():
    from app.views import settle
    from app.book import band_deals
    ma = unwrap(fixture("get_my_accounts", {}))
    pw = {k: unwrap(fixture("get_all_paperwork", {"account": k})) for k in "AB"}
    r = rows(band_deals(ma, pw, strict=True, today=date(2026, 9, 1))["A"])["a_renewal"]["deadline"]
    assert r["level"] == "green" and r["date"] == "2026-10-31" and {"id": "A/profile.json", "kind": "record"} in r["receipts"]
    rd = {"deals": [{"deadline": {"level": "green", "label": "x", "date": "2026-01-01", "receipts": []},
                     "cold": {"level": "red", "label": "y", "date": None, "receipts": []},
                     "blocked": {"level": "unknown", "label": "z", "date": None, "receipts": []}}]}
    assert settle(rd)["deals"][0]["deadline"]["level"] == "unknown" and rd["counts"]["deadline"]["green"] == 0


def roles(acc, deal):
    return next(d for d in acc["power"]["deals"] if d["deal"]["id"] == deal)


def test_power_roles(db):
    bk = load4(db)
    a = roles(bk["A"], "a_renewal")
    assert [p["name"] for p in a["roles"]["decides"]] == ["the alliance office"] and a["roles"]["decides"][0]["side"] == "org"
    assert a["gaps"] == ["pays", "blocks"]
    ch = a["roles"]["champion"][0]
    assert (ch["id"], ch["basis"], ch["why"]) == ("rhys_calder", "inferred", "warm, spoke for this deal (rc_appetite_2)")
    km = next(p for p in a["roles"]["uses"] if p["id"] == "karen_mbeki")
    assert [w["since"] for w in km["waiting_on"]] == ["2026-08-11"]  # the (none) request row and her email are one item
    assert {r["id"] for r in km["waiting_on"][0]["receipts"]} == {"A/requests.csv", "A/emails/2026-08-11_karen_batteries.txt"}
    b = roles(bk["B"], "b_renewal")
    assert b["gaps"] == [] and b["roles"]["decides"][0]["id"] == "stefan_roy" and b["roles"]["decides"][0]["relationship"] == "warm"
    blk = {p["name"]: p for p in b["roles"]["blocks"]}
    assert blk["Finance cannot verify the savings the programme claims"]["side"] == "org"
    gf = blk["Group finance (shared mailbox)"]
    assert gf["side"] == "org" and gf["id"] is None and gf["waiting_on"][0]["since"] == "2026-10-08"
    assert b["roles"]["pays"][0]["name"] == "group security" and b["roles"]["champion"][0]["why"].endswith("(sr_roll_2)")
    assert roles(bk["B"], "b_insurance")["gaps"] == ["blocks", "champion"]  # only Neel Sharma (FlytBase) spoke for it
    assert all("why" not in p for d in bk["B"]["power"]["deals"] for r, ps in d["roles"].items() if r != "champion" for p in ps)


def test_paperwork_only_account_in_book_and_kept_live(db):
    from app.sync import PAPERWORK_EVERY, Sync
    load4(db)
    h = unwrap(fixture("get_all_paperwork", {"account": "B"}))
    h["account"] = "H"
    next(r for r in h["records"] if r["path"] == "profile.json")["data"]["name"] = "Harbour Test Group"
    db.add_snapshot("get_all_paperwork", {"account": "H"}, h, 1000.0)
    who = unwrap(fixture("whoami", {}))
    who["new_accounts"] = ["H", "K"]
    db.add_snapshot("whoami", {}, who, 1000.0)
    bk = build_book(db, strict=True, today=TODAY)["accounts"]  # strict: every receipt real and account-scoped
    assert list(bk) == ["A", "B", "H", "K"] and bk["A"]["in_export"] and not bk["H"]["in_export"]
    H, K = bk["H"], bk["K"]
    assert H["name"] == "Harbour Test Group" and K["name"] is None
    oc = H["q1"]["bands"]["on_contract"]
    assert [(l["id"], l["value"]) for l in oc] == [(None, 140000)] and {"id": "H/contract.txt", "kind": "record"} in oc[0]["receipts"]
    assert not any("enewal" in l["title"] for l in H["q1"]["bands"]["unbacked"])
    ren = [i for i in H["q4"]["items"] if i["kind"] == "renewal"]
    assert [(i["deal"], i["level"], i["days_left"]) for i in ren] == [(None, "amber", 74)]
    (row,) = H["radar"]["deals"]
    assert row["deal"]["kind"] == "contract" and row["deal"]["id"] is None
    assert (row["deadline"]["level"], row["deadline"]["date"]) == ("amber", "2027-01-31")
    assert row["cold"]["level"] == "red" and row["blocked"]["level"] == "unknown"  # B's copy: our 14 Oct email to Stefan Roy unanswered
    (pm,) = H["power"]["deals"]
    d = pm["roles"]["decides"][0]
    assert (d["name"], d["id"], d["side"], d["relationship"]) == ("Stefan Roy", None, "customer", "not on file")
    assert pm["gaps"] == ["blocks", "champion"] and H["q3"]["moves"][0]["kind"] == "renewal"
    assert K["q1"]["paperwork_loaded"] is False and K["radar"]["deals"] == [] and K["power"]["deals"] == []
    # stays live: due, and after a manual resync, H's paperwork is fetched again; K's first fetch is queued
    s = Sync(db)

    def queued():
        got = set()
        while (i := db.pop(1e12)):
            got.add((i[1], i[2].get("account")))
        return got
    s.schedule(1000.0 + PAPERWORK_EVERY + 1)
    assert {("get_all_paperwork", x) for x in "ABHK"} <= queued()
    s.schedule(1001.0)
    q = queued()
    assert ("get_all_paperwork", "K") in q and ("get_all_paperwork", "H") not in q
    db.set_resync(1002.0)
    s.schedule(1002.0)
    assert ("get_all_paperwork", "H") in queued()
