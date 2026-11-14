"""One worker run: take the Postgres lease, make spaced MCP calls until the time budget ends."""
import json
import logging

from .crm import note_args, note_outcome
from .queue import BACKOFF_CAP, MAX_ATTEMPTS, SPACING

log = logging.getLogger("aq.worker")
BUDGET = 240        # s; Vercel Hobby limit is 300
CALL_TIMEOUT = 30   # keep in step with mcp.py; no call starts later than BUDGET - CALL_TIMEOUT
LEASE_TTL = 330     # s; extended every slot, so a dead run frees the lease within a few minutes


def _fail(db, now, prio, tool, args, attempts, err):
    db.set_error(now, f"{tool}: {err}")
    if attempts + 1 >= MAX_ATTEMPTS:
        log.error("giving up on %s %s after %d attempts", tool, args, attempts + 1)
        return  # schedule() queues it again when due
    db.enqueue(prio, tool, args, attempts + 1, now + min(BACKOFF_CAP, SPACING * 2 ** attempts))


async def _send_note(db, client, args, now):
    """At most once: claim first; any failure is surfaced on the note, never requeued."""
    n = db.claim_note(args.get("note_id"))
    if n is None:
        return
    try:
        resp = await client.raw("write_note", note_args(n))
        ok, err = note_outcome(resp)
    except Exception as e:
        log.warning("write_note %s failed: %s", args, e)
        resp, ok, err = None, False, f"{type(e).__name__}: {e}"[:300]
    try:
        raw = json.dumps(resp)
    except (TypeError, ValueError):
        raw = repr(resp)[:2000]
    db.finish_note(args["note_id"], ok, now, err, raw)


async def run(db, client, sync, clock, leased=False, min_idle=0.0):
    """-> {"ran": bool, "calls": int}. `leased`: the caller already took the lease (poke)."""
    start = clock.time()
    if not leased and not db.acquire(start, LEASE_TTL, min_idle):
        return {"ran": False, "calls": 0}
    calls = 0
    try:
        while True:
            now = clock.time()
            db.extend(now, LEASE_TTL)
            sync.schedule(now)
            slot = max(now, db.last_call_at() + SPACING)  # spacing is stored, not in memory
            if slot > start + BUDGET - CALL_TIMEOUT or not db.has_eligible(slot):
                break
            if slot > now:
                await clock.sleep(slot - now)
            item = db.pop(clock.time())
            if item is None:
                break
            prio, tool, args, attempts = item
            now = clock.time()
            db.set_last_call(now)  # slot consumed even on error
            calls += 1
            if tool == "write_note":
                await _send_note(db, client, args, now)
                continue
            try:
                payload = await client.call(tool, args)  # unwrap guarantees a dict
            except Exception as e:
                log.warning("call %s %s failed: %s", tool, args, e)
                _fail(db, now, prio, tool, args, attempts, e)
                continue
            db.add_snapshot(tool, args, payload, now)
            db.clear_error()
            try:
                sync.handle(tool, args, payload, now)
            except Exception:  # never requeue the call, never store twice
                log.exception("handler for %s failed", tool)
    finally:
        db.release(clock.time())
    return {"ran": True, "calls": calls}
