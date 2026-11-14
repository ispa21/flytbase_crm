# FastAPI + React in one always-on process, with rules and no LLM

The backend is FastAPI and the frontend is React (Vite, TypeScript), built to static files and served by the same FastAPI app. It runs as **one always-on process with one worker**. That process owns the MCP call queue (ADR 0002). A serverless host, a free tier that sleeps, or a second worker would each break "Stays live" or the one-caller rule. Fetched data is stored in SQLite (Python stdlib) as dated snapshots. The browser is told about new data by Server-Sent Events, so pages update without a reload.

All five answers are computed by deterministic rules from the latest fetched data. There is no LLM in v1. Every id the app shows comes from a record it fetched, so by construction it cannot invent an id. This also costs nothing per call.

## Considered options

- **LLM extraction of roles, risks and drafts.** It reads free text better, but it can invent ids and facts (a rubric failure) and every run costs money. We can revisit it once a rule clearly falls short, and must validate every id it returns against the snapshot.
- **Serverless with cron.** Rejected: no long-lived queue, and cron cannot keep to the one-call-a-minute order.

## Consequences

- "Today" is the server's calendar date. Open question: signals carry a `dated` later than the day they were set off (dated 17 and 18 Nov, set off 14 Nov), so the game may run on its own clock. Nothing on file says which. Until it is known, due dates use the server date and each signal is shown with its own `dated`.
- Recorded responses in `mcp-cache/` are test fixtures only. The running app has no code path to them (CLAUDE.md: the app is the only path to the MCP).
- A converted currency figure appears only after a user has set a plan rate. A rate we chose ourselves would be a number with no source.
