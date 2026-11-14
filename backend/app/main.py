import hmac
import logging
import os

from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .book import build_book
from .db import DB
from .health import health
from .mcp import McpClient
from .queue import RealClock
from .sync import Sync
from .worker import LEASE_TTL, run

logging.basicConfig(level=logging.INFO)
app = FastAPI()
clock = RealClock()
MIN_IDLE = 60  # poke: last run must have ended this long ago


def _db():
    # ponytail: one connection per request; use Neon's pooled URL, add a pool if latency matters.
    try:
        return DB()
    except RuntimeError as e:
        raise HTTPException(503, str(e))


def _client():
    if not os.environ.get("AQ_TOKEN"):
        raise HTTPException(503, "AQ_TOKEN not set")
    return McpClient()


async def _run(leased, min_idle=0.0):
    db = _db()
    try:
        return await run(db, _client(), Sync(db), clock, leased=leased, min_idle=min_idle)
    finally:
        db.close()


@app.get("/api/worker")
@app.post("/api/worker")
async def worker(authorization: str = Header("")):
    secret = os.environ.get("CRON_SECRET", "")
    if not secret or not hmac.compare_digest(authorization, f"Bearer {secret}"):
        raise HTTPException(401, "bad cron secret")
    return await _run(False)


@app.post("/api/poke")
async def poke(tasks: BackgroundTasks):
    """Open page asks for a run: only if the lease is free and the last run ended over 60 s ago."""
    db = _db()
    try:
        started = db.acquire(clock.time(), LEASE_TTL, MIN_IDLE)
    finally:
        db.close()
    if started:  # ponytail: relies on BackgroundTasks finishing after the response; see report
        tasks.add_task(_run, True)
    return {"started": started}


@app.get("/api/health")
def get_health():
    db = _db()
    try:
        return health(db, clock.time())
    finally:
        db.close()


@app.get("/api/changes")
def get_changes(since: int = 0):
    db = _db()
    try:
        n = db.changes()
        return {"n": n, "changed": n > since}
    finally:
        db.close()


@app.get("/api/book")
def get_book():
    db = _db()
    try:
        return build_book(db)
    finally:
        db.close()


PUBLIC = Path(__file__).resolve().parent.parent / "public"  # built by `npm run build` in frontend/
if PUBLIC.is_dir():
    app.mount("/assets", StaticFiles(directory=PUBLIC / "assets"), name="assets")

    @app.get("/")
    def index():
        return FileResponse(PUBLIC / "index.html")
