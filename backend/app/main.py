import hmac
import logging
import os

from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .book import build_book, what_changed
from .crm import activity_view, drafts, load, people_view, public_note, validate_note
from .db import DB
from .health import health
from .mcp import McpClient
from .queue import WRITE, RealClock
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


@app.get("/api/poke")  # GET too: free uptime pingers keep the worker alive with no secret
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


@app.post("/api/resync")
async def resync(tasks: BackgroundTasks):
    """Manual resync: mark everything stale, so the worker re-fetches every tool at 1 call a minute.
    Safe to press repeatedly: the queue dedupes and spacing is kept in the database."""
    db = _db()
    try:
        now = clock.time()
        db.set_resync(now)
        Sync(db).schedule(now)
        started = db.acquire(now, LEASE_TTL, 0)
        queued = db.queue_len()
    finally:
        db.close()
    if started:
        tasks.add_task(_run, True)
    return {"resync_at": now, "queued": queued, "started": started}


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
def get_book(since: float | None = None):
    db = _db()
    try:
        book = build_book(db)
        if since is not None and book["accounts"]:  # What Changed: ?since=<epoch seconds of last visit>
            book["changes"] = what_changed(db, since)
        return book
    finally:
        db.close()


@app.post("/api/notes")
async def post_note(body: dict, tasks: BackgroundTasks):
    """The user's explicit approval of one note: store it queued, enqueue the write; the worker sends it (61 s spacing)."""
    db = _db()
    try:
        snap = load(db)
        if snap is None:
            raise HTTPException(503, "accounts not loaded yet (waiting for first sync)")
        note, why = validate_note(body, snap["accs"])
        if why:
            raise HTTPException(422, why)
        now = clock.time()
        nid = db.add_note(note["account"], note["deal"], note["text"], note["kind"], note["source"], now, note["title"])
        if note["draft"]:  # approving an automation draft: record it, so it never shows as waiting again
            db.decide_draft(note["draft"], note["account"], "approved", now, nid)
        db.enqueue(WRITE, "write_note", {"note_id": nid})
        db.bump()
        started = bool(os.environ.get("AQ_TOKEN")) and db.acquire(now, LEASE_TTL, 0)
    finally:
        db.close()
    if started:
        tasks.add_task(_run, True)
    return {"id": nid, "status": "queued", "started": started}


@app.get("/api/notes")
def get_notes():
    db = _db()
    try:
        now = clock.time()
        return {"notes": [public_note(n, now) for n in db.notes()]}
    finally:
        db.close()


@app.get("/api/insights")
def get_insights():
    """Fact-only insights per account (also in /api/book as accounts[x].insights)."""
    db = _db()
    try:
        b = build_book(db)
        return {"as_of": b["as_of"], "today": b.get("today"), "today_basis": b.get("today_basis"),
                "accounts": {k: {"name": a.get("name"), **a["insights"]} for k, a in b["accounts"].items()}}
    finally:
        db.close()


@app.get("/api/drafts")
def get_drafts():
    """Automation: a draft note for each red or amber risk, with any decision already taken. Sending needs a click."""
    db = _db()
    try:
        return {"drafts": drafts(build_book(db), db.drafts())}
    finally:
        db.close()


@app.post("/api/drafts/{did}/dismiss")
def dismiss_draft(did: str):
    db = _db()
    try:
        d = next((d for d in drafts(build_book(db), {}) if d["id"] == did), None)
        if d is None:
            raise HTTPException(404, "no such draft")
        db.decide_draft(did, d["account"], "dismissed", clock.time())
        db.bump()
        return {"id": did, "status": "dismissed"}
    finally:
        db.close()


@app.get("/api/people")
def get_people():
    db = _db()
    try:
        return people_view(db)
    finally:
        db.close()


@app.get("/api/activity")
def get_activity():
    db = _db()
    try:
        return activity_view(db)
    finally:
        db.close()


PUBLIC = Path(__file__).resolve().parent.parent / "public"  # built by `npm run build` in frontend/
if PUBLIC.is_dir():
    app.mount("/assets", StaticFiles(directory=PUBLIC / "assets"), name="assets")

    @app.get("/")
    def index():
        return FileResponse(PUBLIC / "index.html")
