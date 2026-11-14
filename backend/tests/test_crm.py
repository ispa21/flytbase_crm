import json

import pytest
from fastapi.testclient import TestClient

from app.book import build_book
from app.crm import activity_view, note_outcome, people_view, public_note, validate_note
from app.mcp import McpClient, unwrap
from app.queue import SPACING, WRITE
from app.sync import Sync
from app.worker import run
from tests.test_worker import T0, Clock, db, fixture  # noqa: F401


def load(db, signals=True):
    tools = [("get_my_accounts", {}), ("get_all_paperwork", {"account": "A"}), ("get_all_paperwork", {"account": "B"}),
             ("get_flytbase_team", {})] + ([("get_signals", {})] if signals else [])
    for tool, args in tools:
        db.add_snapshot(tool, args, unwrap(fixture(tool, args)), 1000.0)


def ok(text="{}"):
    return {"jsonrpc": "2.0", "id": 1, "result": {"content": [{"type": "text", "text": text}], "isError": False}}


def writer(db, reply, calls):
    clock = Clock()
    async def send(req):
        calls.append((clock.t, req["params"]))
        if isinstance(reply, Exception):
            raise reply
        return reply
    return clock, McpClient("x", "t", send), Sync(db)


def go(db, clock, client, sync):
    import asyncio
    return asyncio.run(run(db, client, sync, clock))


def test_validate(db):
    load(db)
    ma = db.latest("get_my_accounts")[0]
    v = lambda **b: validate_note(b, ma)  # noqa: E731
    assert v(account="Z", text="x")[1]
    assert v(account="A", text="   ")[1]
    assert v(account="A", text="x" * 4001)[1]
    assert v(account="A", text="x", deal="nope")[1]
    assert v(account="A", text="x", kind="bad")[1]
    n, why = v(account="A", text=" hi ", deal="a_renewal", source="move")
    assert why is None and n["text"] == "hi" and n["kind"] == "note"


def test_note_outcome_unknown_shapes():
    assert note_outcome(ok("plain words, not json")) == (True, None)
    assert note_outcome({"weird": 1}) == (True, None)
    assert note_outcome(None) == (True, None)
    assert not note_outcome({"error": {"code": -1}})[0]
    bad = ok("boom"); bad["result"]["isError"] = True
    assert note_outcome(bad) == (False, "tool error: boom")


def test_note_sent_once_at_write_tier_with_spacing(db):
    load(db, signals=False)
    calls = []
    clock, client, sync = writer(db, ok("saved as n1"), calls)
    db.set_last_call(clock.t)  # a call just happened: the write must wait the spacing
    nid = db.add_note("A", "a_renewal", "call Rhys", "next_step", "move", clock.t)
    db.enqueue(WRITE, "write_note", {"note_id": nid})
    assert not db.enqueue(WRITE, "write_note", {"note_id": nid})  # no second queue row
    go(db, clock, client, sync)
    w = [c for c in calls if c[1]["name"] == "write_note"]
    assert len(w) == 1 and w[0][0] >= T0 + SPACING
    assert w[0][1]["arguments"] == {"text": "[a_renewal] call Rhys", "account": "A", "kind": "next_step"}
    assert calls[0][1]["name"] == "write_note"  # WRITE outranks the scheduled reads
    n = db.notes()[0]
    assert n["status"] == "saved" and n["saved_at"] and json.loads(n["response"])["result"]
    # a replayed queue row for a saved note sends nothing
    db.enqueue(WRITE, "write_note", {"note_id": nid})
    clock.t += 1000
    go(db, clock, client, sync)
    assert len([c for c in calls if c[1]["name"] == "write_note"]) == 1


@pytest.mark.parametrize("reply", [{"jsonrpc": "2.0", "id": 1, "error": {"code": -32000, "message": "no"}},
                                   ok("nope") | {"result": {"content": [{"type": "text", "text": "nope"}], "isError": True}},
                                   RuntimeError("timeout")])
def test_failed_note_surfaced_not_retried(db, reply):
    load(db, signals=False)
    calls = []
    clock, client, sync = writer(db, reply, calls)
    nid = db.add_note("B", None, "x", "note", None, clock.t)
    db.enqueue(WRITE, "write_note", {"note_id": nid})
    go(db, clock, client, sync)
    clock.t += 5000
    go(db, clock, client, sync)
    n = db.notes()[0]
    assert n["status"] == "failed" and n["error"] and n["saved_at"] is None
    assert len([c for c in calls if c[1]["name"] == "write_note"]) == 1
    assert db.x("SELECT COUNT(*) FROM queue WHERE tool='write_note'").fetchone()[0] == 0


def test_sending_shown_queued_then_failed_when_stale(db):
    nid = db.add_note("A", None, "x", "note", None, 100.0)
    assert db.claim_note(nid) and db.claim_note(nid) is None
    n = db.notes()[0]
    assert public_note(n, 200.0)["status"] == "queued"
    p = public_note(n, 100.0 + 601)
    assert p["status"] == "failed" and "not retried" in p["error"]


def test_people(db):
    load(db)
    r = people_view(db)
    assert r["as_of"] and r["state"] == "ok"
    P = {p["id"]: p for p in r["people"]}
    rhys = P["A:rhys_calder"]
    assert rhys["side"] == "customer" and rhys["standing"] == "warm" and rhys["org"] == "Eastern Counties Police Alliance"
    assert {"id": "rhys_calder", "kind": "stakeholder"} in rhys["receipts"]
    assert rhys["role_tags"] == ["uses"] and "a_renewal" in rhys["deals"]  # the A signer is not named on file
    assert "decides" in P["B:stefan_roy"]["role_tags"]
    assert P["B:stefan_roy"]["account"] == "B" and "A:stefan_roy" not in P
    assert any(p["side"] == "flytbase" and p["name"] == "Achal Negi" for p in r["people"])
    assert all(p["receipts"] for p in r["people"])
    # no person invented for the unnamed deputy or procurement lead
    assert not any("deputy" in p["name"].lower() or "procurement" in p["name"].lower() for p in r["people"])


def test_activity(db):
    load(db)
    r = activity_view(db)
    items = r["items"]
    assert {i["kind"] for i in items} == {"email", "call", "request", "ticket", "invoice", "signal"}
    dates = [i["dated"] for i in items]
    assert dates == sorted(dates, reverse=True) and items[0]["kind"] == "signal"
    assert all(i["receipts"] and i["deal"] is None for i in items)
    sig = next(i for i in items if i["id"] == "A:signal:champion_leaves")
    assert {"id": "champion_leaves", "kind": "signal"} in sig["receipts"]
    t = next(i for i in items if i["kind"] == "ticket")
    assert t["receipts"][0]["id"].startswith("FB-") and t["account"] in "AB"
    # signal for account A never shows under B
    assert not any(i["account"] == "B" and i["kind"] == "signal" and "champion" in i["id"] for i in items)


def test_before_first_sync(db):
    assert people_view(db)["people"] == [] and activity_view(db)["items"] == []


def test_http_notes(monkeypatch, tmp_path):
    from app.db import DB
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("DATABASE_URL", "sqlite:///t.db")
    monkeypatch.delenv("AQ_TOKEN", raising=False)
    from app.main import app
    c = TestClient(app)
    assert c.post("/api/notes", json={"account": "A", "text": "x"}).status_code == 503  # not synced yet
    d = DB(); load(d); d.close()
    assert c.post("/api/notes", json={"account": "Z", "text": "x"}).status_code == 422
    assert c.post("/api/notes", json={"account": "A", "text": " "}).status_code == 422
    r = c.post("/api/notes", json={"account": "A", "deal": "a_renewal", "text": "ring Rhys", "source": "move"})
    assert r.status_code == 200 and r.json()["status"] == "queued" and r.json()["started"] is False
    n = c.get("/api/notes").json()["notes"]
    assert len(n) == 1 and n[0]["status"] == "queued" and n[0]["created_at"] and n[0]["saved_at"] is None
    d = DB(); assert d.x("SELECT prio, tool FROM queue WHERE tool='write_note'").fetchone() == (WRITE, "write_note"); d.close()
    assert c.get("/api/people").json()["people"] and c.get("/api/activity").json()["items"]
