# Run on Vercel: a cron-driven worker with a Postgres lease

Supersedes the "one always-on process, SQLite, SSE" parts of ADR 0003 and the in-memory queue of ADR 0002. The rules of ADR 0002 stay: one caller, at least 61 s between MCP calls, writes included, priority order, dated append-only snapshots, stale after 5 minutes.

The user chose Vercel as the host. Vercel functions are short-lived and have no disk, so the long-running loop becomes a **worker run** started by Vercel Cron, and all state moves to Postgres.

## Decision

- **Backend:** FastAPI as a Vercel Python function. **Frontend:** React (Vite) as static files on the same project and URL.
- **Database:** hosted Postgres (Neon, via the Vercel Marketplace). Tables: `snapshots(tool, args, fetched_at, payload)` append-only; `signals(id, ...)`; `queue(prio, tool, args, ...)`; `caller(id=1, last_call_at, lease_until)`.
- **Worker run:** Vercel Cron calls `/api/worker` every minute (secured with `CRON_SECRET`). A run takes the lease (`UPDATE caller ... WHERE lease_until < now()`). If it cannot, it exits at once, so two runs never overlap. With the lease it loops: wait until `last_call_at + 61 s`, take the highest-priority queue item, make the call, store the result, set `last_call_at`. It stops about 30 s before the function time limit and releases the lease. Spacing is kept in the database, so restarts and overlapping invocations cannot break the one-call-a-minute rule.
- **Self-scheduling:** each run adds `get_signals` (due every 2 min) and `whoami` (every 10 min) to the queue when due, then the cold-start and refresh items.
- **Live push:** no SSE (functions cannot hold a stream open for long). The page polls a cheap `/api/changes?since=<n>` every 10 s and refetches answers when the change counter moves.
- **Token:** `AQ_TOKEN` is a Vercel environment variable. Never in the repo or browser.
- **No LLM, deterministic rules:** unchanged.

## Consequences

- **Needs a Vercel plan with 1-minute cron and a function time limit of at least 300 s (Pro).** Hobby allows cron once a day only, which would break "Stays live". Unconfirmed which plan the user has.
- Throughput stays one MCP call per 61 s. Cold start (about 25 calls) takes about 25 minutes; the page shows progress and an "as of" time per answer.
- Tests use the same fake transport and fake clock, with an in-memory or local Postgres instead of SQLite.
- Review findings from the first build that still apply and carry into the rebuild: a failing handler must not requeue the MCP call or duplicate the snapshot; reject payloads that are not objects; skip signals without `id`; attempt cap with backoff per failing call; refresh paperwork, files and team on a schedule, not only on signals; clear `last_error` after a success; health shows per-tool age; an SSE body without data lines raises `McpError`.
