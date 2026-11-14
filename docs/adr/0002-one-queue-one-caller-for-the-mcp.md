# One queue, one caller for the Account Quest MCP

The game server allows one tool call a minute per token, and writes count against that limit. The project rules also make the app the only path to the MCP. So the app's server-side sync is the only thing that calls it. No agent, tool or browser reads the MCP, or a copy of it, directly. Every call goes through one queue that sends at most one call every 61 seconds, in this order: approved writes, then `get_signals` (every 2 min), then `whoami` (every 10 min), then re-fetches triggered by new signals or new accounts. The token lives in a server environment variable and never reaches the browser.

## Consequences

- Every response is stored as a dated snapshot, never overwritten. Answers are computed when they are requested, from the latest snapshot, and show its "as of" time.
- After each ingest the server pushes an update to open pages (ADR 0003), so nobody needs to reload.
- A rate-limit error, or any other error, means wait and retry in the next slot, not crash.
- When the last good poll is more than 5 minutes old, or the MCP cannot be reached, the page says so and shows the last fetch time.
- New facts never overwrite old ones. A contradicted fact stays visible, struck through, with the new receipt beside it.
