---
title: 'Live sync on Vercel: cron worker, Postgres queue, health (stories 1.1-1.4, rework)'
type: 'feature'
created: '2026-11-14'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/adr/0004-vercel-cron-worker-and-postgres.md'
  - '{project-root}/docs/adr/0002-one-queue-one-caller-for-the-mcp.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/data-contract.md'
  - '{project-root}/backend/app'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The first build assumed one always-on process with SQLite. The user chose Vercel, where functions are short-lived and have no disk, so that design cannot stay live there.

**Approach:** Rework `backend/` for Vercel. Vercel Cron calls a worker endpoint every minute. The worker takes a Postgres lease, so only one caller exists, and makes MCP calls at least 61 s apart. All state (snapshots, signals, queue, last call time) lives in Postgres. The page learns of new data by polling a change counter.

## Boundaries & Constraints

**Always:** One caller at a time, enforced by the Postgres lease. At least 61 s between MCP calls, kept in the database. `AQ_TOKEN`, `DATABASE_URL`, `CRON_SECRET` from the environment only. Snapshots appended with fetch time. Ids come from responses. Tests use a fake transport over `mcp-cache/` fixtures and no network. A handler error never requeues the MCP call and never duplicates a snapshot.

**Never:** No answer computation, UI, LLM or `write_note`. Never use `exported_at` to detect change. `/api/worker` must reject requests without the cron secret. Never read `mcp-cache/` outside tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Worker run | Valid cron secret, lease free | Takes lease, runs calls spaced 61 s from stored `last_call_at`, stops before the time limit, releases lease | Bad secret: 401 |
| Overlap | Lease held by another run | Exits at once, no call | N/A |
| Cold start | Empty database | Queue seeds whoami, get_my_accounts, then paperwork per account and files, team, signals; health shows progress | Failed call retried with backoff and attempt cap |
| New signal | get_signals returns an unseen `id` | Stored once; account and paperwork refetch queued; change counter increments | No `id` or non-object: logged, skipped |
| New account | whoami.new_accounts lists an id | Paperwork and files queued once | Unknown shape logged |
| Error or bad payload | Call raises, isError, or payload not an object | Slot consumed, retried later, snapshot not stored | Handler error does not requeue the call |
| Stale | No good poll for over 5 min | `/api/health` shows `stale` true, last fetch times, last error | Cleared after next success |

</frozen-after-approval>

## Code Map

- `backend/app/db.py` -- Postgres access; tables `snapshots`, `signals`, `queue`, `caller`, `changes`
- `backend/app/queue.py`, `sync.py`, `mcp.py` -- reuse the logic from the first build, move state to Postgres
- `backend/app/worker.py` -- lease, spacing, run loop with time budget
- `backend/app/main.py`, `health.py` -- `/api/worker`, `/api/health`, `/api/changes`
- `backend/api/index.py`, `vercel.json` -- Vercel entry and the 1-minute cron
- Do not change: `mcp-cache/`, ADRs, `CLAUDE.md`

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/db.py` -- schema and helpers (append snapshot, add signal, enqueue with dedupe, lease, change counter)
- [ ] `backend/app/worker.py` -- lease, 61 s spacing from `caller.last_call_at`, priority order, time budget, attempt cap and backoff
- [ ] `backend/app/sync.py`, `mcp.py` -- due polls (signals 2 min, whoami 10 min), scheduled refresh of paperwork, files, team; payload and id guards
- [ ] `backend/app/main.py`, `health.py` -- `/api/worker` (cron secret), `/api/health` with per-tool age, `/api/changes`
- [ ] `backend/api/index.py`, `vercel.json` -- entry point and cron `* * * * *`
- [ ] `backend/tests/` -- one test per matrix row, fake clock and transport

**Acceptance Criteria:**
- Given two overlapping worker runs, when both start, then only one makes calls.
- Given a stored `last_call_at`, when a run starts, then its first call waits until 61 s after it.
- Given a failing handler, when a call succeeds, then the snapshot is stored once and the call is not requeued.
- Given check2 fixtures, when sync runs, then both signals are stored once and the change counter moves.
- Given no good poll for 5 min, when `/api/health` is read, then `stale` is true with fetch times.

## Verification

**Commands:**
- `cd backend && uv run pytest -q` -- expected: all pass, no network
- `cd backend && uv run python -c "import app.main"` -- expected: imports without env vars set

## Spec Change Log

## Review Triage Log
