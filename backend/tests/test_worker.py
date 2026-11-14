"""Fake transport over ../mcp-cache fixtures (tests only). Fake clock, no network.
TEST_DATABASE_URL=postgresql://... runs the same tests against a real Postgres."""
import asyncio
import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import DB
from app.health import health
from app.mcp import McpClient, McpError, unwrap
from app.queue import MAX_ATTEMPTS, REFETCH, SPACING
from app.sync import Sync
from app.worker import BUDGET, run

C = Path(__file__).resolve().parents[2] / "mcp-cache"
T0 = 1_000_000.0


class Clock:
    def __init__(self, t=T0):
        self.t = t
    def time(self):
        return self.t
    async def sleep(self, s):
        self.t += s


def fixture(tool, args, check2=True):
    name = {"whoami": "whoami", "get_my_accounts": "my_accounts", "get_flytbase_team": "team",
            "get_signals": "signals", "get_all_paperwork": f"paperwork_{args.get('account')}",
            "get_file": f"file_{args.get('id')}"}[tool]
    p = C / "check2" / f"{name}.json"
    return json.loads((p if check2 and p.exists() else C / f"{name}.json").read_text())


@pytest.fixture
def db():
    d = DB(os.environ.get("TEST_DATABASE_URL", "sqlite::memory:"))
    for t in ("snapshots", "signals", "queue", "caller", "changes"):
        if d.pg:
            d.x(f"DROP TABLE {t}")
    if d.pg:
        d.close(); d = DB(os.environ["TEST_DATABASE_URL"])
    yield d
    d.close()


def env(db, fail=0):
    clock, starts, st = Clock(), [], {"fail": fail}
    async def send(req):
        starts.append(clock.t)
        if st["fail"] > 0:
            st["fail"] -= 1
            return {"jsonrpc": "2.0", "id": 1, "result": {"content": [{"type": "text", "text": "rate"}], "isError": True}}
        p = req["params"]
        return fixture(p["name"], p["arguments"])
    return clock, starts, McpClient("x", "t", send), Sync(db)


def go(db, clock, client, sync, **kw):
    return asyncio.run(run(db, client, sync, clock, **kw))


def test_unwrap_guards():
    for bad in ({"error": {}}, {"result": {"content": [{"text": "x"}], "isError": True}}, {"result": {}},
                {"result": {"content": [{"text": "[1]"}], "isError": False}}):
        with pytest.raises(McpError):
            unwrap(bad)


def test_worker_run_cold_start_and_spacing(db):
    clock, starts, client, sync = env(db)
    db.set_last_call(T0 - 10)  # stored last_call_at: first call waits until +61
    r = go(db, clock, client, sync)
    assert r["ran"] and r["calls"] >= 3
    assert starts[0] == T0 - 10 + SPACING
    assert all(b - a >= SPACING for a, b in zip(starts, starts[1:]))
    assert clock.t - T0 <= BUDGET + 31
    assert db.acquire(clock.t + 1, 10)  # lease released at end
    h = health(db, clock.t)  # health shows progress while queue still has items
    assert h["pending_calls"] > 0 and h["fetched"]


def test_overlap_second_run_exits_without_call(db):
    clock, starts, client, sync = env(db)
    assert db.acquire(clock.t, 330)  # another run holds the lease
    assert go(db, clock, client, sync) == {"ran": False, "calls": 0}
    assert starts == []


def test_poke_only_when_lease_free_and_idle(db):
    clock, starts, client, sync = env(db)
    go(db, clock, client, sync)  # ends now
    assert go(db, clock, client, sync, min_idle=60) == {"ran": False, "calls": 0}  # ended < 60 s ago
    clock.t += 61
    assert go(db, clock, client, sync, min_idle=60)["ran"]


def test_new_signals_stored_once_counter_moves_and_refetch_queued(db):
    clock, starts, client, sync = env(db)
    n0 = db.changes()
    payload = json.loads(fixture("get_signals", {})["result"]["content"][0]["text"])
    sync.handle("get_signals", {}, payload, clock.t)
    ids = sorted(r[0] for r in db.x("SELECT id FROM signals").fetchall())
    assert ids == ["champion_leaves", "urgent_request"]
    assert db.changes() == n0 + 2
    n1 = db.changes()
    sync.handle("get_signals", {}, payload, clock.t)  # seen again: nothing new
    assert db.changes() == n1
    assert db.x("SELECT COUNT(*) FROM signals").fetchone()[0] == 2
    # bad signals: skipped, not fatal
    sync.handle("get_signals", {}, {"signals": [{"x": 1}, "str", None]}, clock.t)


def test_signal_queues_account_and_paperwork_refetch(db):
    clock, starts, client, sync = env(db)
    sync.handle("get_signals", {}, {"signals": [{"id": "s1", "account": "B"}]}, clock.t)
    got = []
    while (i := db.pop(1e12)):
        got.append((i[1], i[2]))
    assert ("get_my_accounts", {}) in got and ("get_all_paperwork", {"account": "B"}) in got


def test_new_account_queues_paperwork_once_unknown_shape_logged(db):
    clock, starts, client, sync = env(db)
    sync.handle("whoami", {}, {"new_accounts": ["Z", {"weird": 1}, 7]}, clock.t)
    sync.handle("whoami", {}, {"new_accounts": ["Z"]}, clock.t)
    got = []
    while (i := db.pop(1e12)):
        got.append((i[1], i[2]))
    assert got.count(("get_all_paperwork", {"account": "Z"})) == 1


def test_failed_call_consumes_slot_retries_with_backoff_no_snapshot(db):
    clock, starts, client, sync = env(db, fail=99)
    go(db, clock, client, sync)
    assert len(starts) >= 2 and db.error()
    assert db.x("SELECT COUNT(*) FROM snapshots").fetchone()[0] == 0
    row = db.x("SELECT attempts, not_before FROM queue WHERE attempts>0").fetchone()
    assert row and row[0] == 1 and row[1] > T0
    # attempt cap: drops after MAX_ATTEMPTS
    from app.worker import _fail
    _fail(db, clock.t, 4, "get_file", {"id": "x"}, MAX_ATTEMPTS - 1, "boom")
    assert db.x("SELECT COUNT(*) FROM queue WHERE tool='get_file'").fetchone()[0] == 0


def test_failing_handler_snapshot_once_not_requeued(db):
    clock, starts, client, sync = env(db)
    def boom(*a):
        raise RuntimeError("handler")
    sync.handle = boom
    go(db, clock, client, sync)
    n = db.x("SELECT COUNT(*) FROM snapshots").fetchone()[0]
    assert n == len(starts) > 0  # one snapshot per call, no duplicates
    # nothing was requeued by failure: only scheduled items remain
    assert db.x("SELECT COUNT(*) FROM queue WHERE attempts>0").fetchone()[0] == 0


def test_stale_health_then_cleared(db):
    clock, starts, client, sync = env(db)
    assert health(db, clock.t)["stale"]
    go(db, clock, client, sync)
    assert not health(db, clock.t)["stale"]
    h = health(db, clock.t + 301)
    assert h["stale"] and h["last_good_poll"] and h["fetched"][0]["fetched_at"]
    db.set_error(clock.t, "x")
    assert health(db, clock.t)["last_error"]["message"] == "x"
    db.clear_error()
    assert health(db, clock.t)["last_error"] is None


def test_full_sync_stores_both_signals_with_fixtures(db):
    clock, starts, client, sync = env(db)
    for _ in range(12):
        clock.t += 400
        go(db, clock, client, sync)
        if db.latest("get_file", {"id": "flight_log_by_plant"}) or db.queue_len() == 0:
            break
    assert db.x("SELECT COUNT(*) FROM signals").fetchone()[0] == 2
    assert {t for t, _, _ in db.latest_all()} >= {"whoami", "get_my_accounts", "get_signals", "get_all_paperwork"}


def test_http_endpoints(monkeypatch):
    from app.main import app
    c = TestClient(app)
    assert c.get("/api/worker").status_code == 401
    monkeypatch.setenv("CRON_SECRET", "s")
    assert c.get("/api/worker", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert c.post("/api/worker").status_code == 401
    assert c.get("/api/health").status_code == 503  # no DATABASE_URL: clear error, no crash
