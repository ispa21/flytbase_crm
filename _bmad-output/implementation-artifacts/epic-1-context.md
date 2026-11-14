# Epic 1 Context: Live link to the CRM

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The app fetches the Account Quest MCP by itself, keeps dated snapshots, and tells the user how fresh its data is. Judges rate "Stays live" as the top priority: new data must arrive without a manual rebuild or reload, and an unreachable MCP must be reported, never hidden.

## Stories

- Story 1.1: MCP client and single call queue
- Story 1.2: Snapshot store and cold-start sync
- Story 1.3: Self-updating sync
- Story 1.4: Freshness and health
- Story 1.5: React shell with live push
- Story 1.6: Deploy the walking skeleton

## Requirements & Constraints

- The app is the only caller of the MCP. Server limit: one call a minute per token, writes included. Space calls at least 61 s apart.
- The token comes from a server environment variable and never reaches the browser.
- Any error, including an unknown rate-limit shape, means retry in a later slot. The loop must not die.
- Every answer shows an "as of" time. If the last good poll is over 5 minutes old, or the MCP cannot be reached, say so and show the last fetch time.
- Tests use recorded fixtures through a fake transport. No real MCP calls in tests.

## Technical Decisions

- FastAPI, one always-on process with one worker. SQLite via the Python stdlib. Server-Sent Events push "updated" to open pages. No LLM.
- Snapshots are appended with a fetch time, never overwritten. Account ids and file ids come from responses, never hard-coded.
- Response unwrap: JSON-RPC result, `content[0].text` parsed as JSON; an error is `error` or `result.isError`.
- Signal shape: `{signals:[{id, account, dated, title, summary, records:[{kind, path, text}], set_off_at}]}`. Ids are words. Record paths carry an account prefix (`A/emails/...`). De-duplicate signals by `id`.
- `exported_at` in `get_my_accounts` changes on every call, so never use it to detect change; compare content.
- Keys that repeat across accounts (user ids, mail thread ids, record paths) must include the account.
- Full shapes, joins and data traps: `docs/data-contract.md`.

## Cross-Story Dependencies

- 1.1 first; 1.2 and 1.3 use its queue; 1.4 reads what 1.2 and 1.3 store.
- 1.5 needs the update events from 1.3. 1.6 deploys 1.1–1.4.
- Unknown until observed: the rate-limit error shape and whether `whoami.new_accounts` can add accounts beyond A and B.
