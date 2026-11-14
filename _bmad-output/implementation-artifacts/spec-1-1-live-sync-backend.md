---
title: 'Live sync backend: MCP queue, snapshots, polling, health (stories 1.1-1.4)'
type: 'feature'
created: '2026-11-14'
status: 'superseded'
route: 'dispatch'
baseline_commit: 'NO_VCS'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/data-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing fetches the Account Quest MCP yet. Judges rate "Stays live" top priority, and the server allows one call a minute, so a naive client would break the limit or serve stale data silently.

**Approach:** A FastAPI backend with one call queue that is the only MCP caller. It stores each response as a dated snapshot, polls for signals and new accounts by itself, and exposes `/api/health` with freshness and reachability.

## Boundaries & Constraints

**Always:** One always-on process, one worker. At least 61 s between MCP calls, writes included. `AQ_TOKEN` read from the environment only. Snapshots are appended with fetch time, never overwritten. Account and file ids come from responses, never hard-coded. Every error is logged and retried in a later slot. Tests use a fake transport over `mcp-cache/` fixtures (tests only), with no network.

**Never:** No answer computation, no UI, no deploy, no LLM, no `write_note` calls (later story). Never use `exported_at` to detect change. Never serve a snapshot without its fetch time. Never read `mcp-cache/` outside tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cold start | Empty store | Queue fetches whoami, get_my_accounts, get_all_paperwork per account id, get_file per file id, get_flytbase_team, get_signals, one per slot; `/api/health` shows progress | Failed call retried next slot |
| New signal | get_signals returns an unseen `id` | Stored raw; get_my_accounts and that account's paperwork re-fetched | Duplicate `id` ignored |
| New account | whoami.new_accounts lists an id | That account's paperwork and files queued | Unknown shape logged, not fatal |
| Rate limit or any error | Call raises or isError | Slot consumed, retried later, health shows unreachable once last good poll is >5 min old | Loop never dies |
| Restart | Store has snapshots | Serves stored snapshots with their fetch times, then refreshes | N/A |

</frozen-after-approval>

## Code Map

- `backend/` -- new; FastAPI app (`app/main.py`, `app/mcp.py` client, `app/queue.py`, `app/store.py` SQLite, `app/sync.py`, `app/health.py`), `pyproject.toml` managed by uv
- `backend/tests/` -- pytest; fake transport reads `../mcp-cache/` and `../mcp-cache/check2/`
- `docs/data-contract.md` -- envelope, error shape, signal shape, id traps (account-scoped keys)
- Do not change: `mcp-cache/`, `CLAUDE.md`, ADRs

## Tasks & Acceptance

**Execution:**
- [x] `backend/app/mcp.py` -- JSON-RPC `tools/call` client, unwrap `content[0].text`, raise on `error`/`isError` -- story 1.1
- [x] `backend/app/queue.py` -- single asyncio queue, 61 s spacing, priority order (writes, signals, whoami, refetch) -- one caller
- [x] `backend/app/store.py` -- SQLite `snapshots(tool, args, fetched_at, payload)`, append-only, latest-by-key reads -- story 1.2
- [x] `backend/app/sync.py` -- cold start, 2 min signals, 10 min whoami, re-fetch triggers, signal de-dup by id -- stories 1.2-1.3
- [x] `backend/app/health.py`, `backend/app/main.py` -- `/api/health`, lifespan starts the queue -- story 1.4
- [x] `backend/tests/` -- pytest for each matrix row with a fake clock and fake transport

**Acceptance Criteria:**
- Given a fake transport, when 5 calls are queued, then call starts are at least 61 s apart on the fake clock.
- Given the check2 fixtures, when sync runs, then both signals are stored once and re-fetch calls are queued.
- Given no good poll for 5 min, when `/api/health` is read, then `stale` is true and the last fetch times are shown.
- Given a restart, when health is read before the first call returns, then stored fetch times appear.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Queue priority within one slot: approved write, then due signals poll, then due whoami poll, then pending re-fetch, then cold-start items. Signals poll every 2 min and whoami every 10 min are shared defaults; both are constants.

## Verification

**Commands:**
- `cd backend && uv run pytest -q` -- expected: all pass, no network access
- `cd backend && uv run python -c "import app.main"` -- expected: imports without `AQ_TOKEN` set
