---
title: 'CRM API: write-back notes (6.3), people, activity'
type: 'feature'
created: '2026-11-14'
status: 'done'
route: 'dispatch'
baseline_commit: 'd1bd972'
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/data-contract.md'
  - '{project-root}/backend/app/book.py'
---

## Intent

**Problem:** The CRM has no write-back, no people list and no activity feed. All three must come from stored snapshots or the one MCP queue, with no LLM and no new reads.

## Rules

- `POST /api/notes {account, deal?, text, source?, kind?}` is the user's explicit approval. `account` must be in the latest `get_my_accounts`; `deal` (if given) must be one of that account's opportunities; `text` is stripped, non-empty, and the sent text (deal prefix `[deal] ` included) is at most 4000 characters (tool description limit). `kind` is one of note|task|risk|next_step (default note). 422 on bad input, 503 if accounts are not loaded yet.
- A `notes` row is stored as `queued` and a `write_note` call is enqueued at tier WRITE with args `{"note_id": n}` (the queue's unique key makes it one per note). The worker, not the request, sends it, 61 s after the previous call.
- At most once: the worker claims the row (`queued` -> `sending`, atomic) before the call. A note not `queued` is never sent. A failed or interrupted write is never requeued; it shows as `failed` with the error. `sending` is exposed as `queued`, except after 10 minutes it is shown `failed` ("outcome unknown, not retried").
- Outcome: JSON-RPC `error` or `isError` -> `failed` + error text; anything else -> `saved`. The raw response (shape not recorded in fixtures) is stored whole; the loop never crashes on it.
- `GET /api/notes` -> `{notes:[{id, account, deal, kind, source, text, status, created_at, saved_at, error, response}]}` newest first.
- `GET /api/people`, `GET /api/activity` are built from stored snapshots only (see crm.py). Every receipt is checked against the snapshots (same check as book.py); an item left with no receipt is dropped. Deal links only where a record carries one; otherwise null.

## Acceptance

- [x] db `notes` table (IF NOT EXISTS), claim/finish helpers; worker branch; `McpClient.raw`
- [x] crm.py pure logic; routes in main.py
- [x] tests: validation, queue at WRITE, saved/failed/unknown shape, at-most-once, spacing, people, activity, receipts
- [x] `cd backend && uv run pytest -q` passes
