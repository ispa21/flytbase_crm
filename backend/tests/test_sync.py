"""Fake transport over ../mcp-cache fixtures (tests only). Fake clock, no network."""
import asyncio
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.health import health
from app.mcp import McpClient, McpError, unwrap
from app.queue import SPACING, CallQueue
from app.store import Store
from app.sync import Sync

C = Path(__file__).resolve().parents[2] / "mcp-cache"


class Clock:
    def __init__(self, t=1_000_000.0):
        self.t = t
    def time(self):
        return self.t
    async def sleep(self, s):
        self.t += s


def fixture(tool, args, check2=False):
    name = {"whoami": "whoami", "get_my_accounts": "my_accounts", "get_flytbase_team": "team",
            "get_signals": "signals", "get_all_paperwork": f"paperwork_{args.get('account')}",
            "get_file": f"file_{args.get('id')}"}[tool]
    p = C / "check2" / f"{name}.json"
    return json.loads((p if check2 and p.exists() else C / f"{name}.json").read_text())


def make(check2=True, fail=0):
    clock, starts, state = Clock(), [], {"fail": fail}
    async def send(req):
        starts.append(clock.t)
        if state["fail"] > 0:
            state["fail"] -= 1
            return {"jsonrpc": "2.0", "id": 1, "result": {"content": [{"type": "text", "text": "rate"}], "isError": True}}
        p = req["params"]
        return fixture(p["name"], p["arguments"], check2)
    store = Store()
    q = CallQueue(McpClient("x", "t", send), clock)
    return clock, starts, store, q, Sync(q, store)


def drain(q, n=100):
    async def go():
        for _ in range(n):
            if not await q.step():
                break
    asyncio.run(go())


def test_unwrap_errors():
    for bad in ({"error": {}}, {"result": {"content": [{"text": "x"}], "isError": True}}, {"result": {}}):
        try:
            unwrap(bad)
            assert False
        except McpError:
            pass


def test_spacing_61s():
    clock, starts, store, q, sync = make()
    for i in range(5):
        q.put(4, "get_flytbase_team", {"n": i})
    drain(q)
    assert len(starts) == 5
    assert all(b - a >= SPACING for a, b in zip(starts, starts[1:]))


def test_cold_start_then_signals_stored_once_and_refetch():
    clock, starts, store, q, sync = make()
    sync.start(); drain(q)
    tools = {t for t, _, _ in store.latest_all()}
    assert {"whoami", "get_my_accounts", "get_flytbase_team", "get_signals", "get_all_paperwork", "get_file"} <= tools
    sigs = [r[0] for r in store.db.execute("SELECT id FROM signals")]
    assert sorted(sigs) == ["champion_leaves", "urgent_request"]
    # signals seen again: no new rows, no re-fetch queued
    sync.tick(); drain(q)
    assert store.db.execute("SELECT COUNT(*) FROM signals").fetchone()[0] == 2
    # new signal triggers re-fetch of my_accounts + that account's paperwork
    n0 = store.db.execute("SELECT COUNT(*) FROM snapshots WHERE tool='get_my_accounts'").fetchone()[0]
    asyncio.run(sync.handle("get_signals", {}, {"signals": [{"id": "new_one", "account": "B"}]}))
    assert ("get_my_accounts", "{}") in q.pending and ("get_all_paperwork", '{"account": "B"}') in q.pending
    drain(q)
    assert store.db.execute("SELECT COUNT(*) FROM snapshots WHERE tool='get_my_accounts'").fetchone()[0] == n0 + 1


def test_new_account_queues_paperwork_and_unknown_shape_not_fatal():
    clock, starts, store, q, sync = make()
    sync.start(); drain(q)
    asyncio.run(sync.handle("whoami", {}, {"new_accounts": ["Z", {"weird": 1}, 7]}))
    assert ("get_all_paperwork", '{"account": "Z"}') in q.pending


def test_errors_retry_and_stale_health():
    clock, starts, store, q, sync = make(fail=2)
    sync.start(); drain(q, 3)
    assert q.last_error and len(q.heap) > 0  # failures requeued, loop alive
    h = health(store, q)
    assert h["stale"] and not h["reachable"] and h["last_error"]
    drain(q)
    assert not health(store, q)["stale"]
    clock.t += 301
    h = health(store, q)
    assert h["stale"] and h["last_good_poll"] and h["fetched"]


def test_restart_serves_stored_fetch_times(tmp_path):
    clock, starts, store, q, sync = make()
    db = str(tmp_path / "s.db")
    s1 = Store(db); s1.add("get_signals", {}, {"signals": []}, clock.t)
    s2 = Store(db); q2 = CallQueue(McpClient("x", "t", None), clock)
    h = health(s2, q2)
    assert h["fetched"][0]["fetched_at"] and h["last_good_poll"] and not h["stale"]
    assert s2.latest("get_signals")[1] == clock.t


def test_main_imports_without_token_and_health_route():
    from app.main import app
    assert TestClient(app).get("/api/health").status_code == 200
