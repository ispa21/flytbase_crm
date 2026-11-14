# Epics: FlytBase Questathon CRM

Stack: FastAPI + React (ADR 0003). Sources of intent: `CLAUDE.md` (rubric and non-negotiables), `CONTEXT.md` (terms), `docs/adr/0001`–`0003`. Test fixtures: `mcp-cache/` (tests only, never read by the app).

## Build order: backend first, a usable version of every priority

Epics group the work by question. Build by phase instead, so every priority works end to end early:

| Phase | Stories | Done when |
|---|---|---|
| A. Live backend | 1.1 → 1.2 → 1.3 → 1.4 → 1.6 (deploy the API with no UI) | Deployed, it fetches by itself and `/api/health` shows fresh "as of" times |
| B. Answer engine (JSON) | 2.2 (receipts guard, first) → 2.1 → 3.1 → 3.2 → 4.1 → 5.1 → 6.1 → 6.3 (backend) → 7.1 → 2.4 | `GET /api/accounts/{id}/answers` returns Q1–Q5 for A and B. A check script finds every receipt id in the snapshot. Approving a move writes a note. |
| C. Thin UI | 1.5 → 2.3, 3.3, 4.2, 5.2 → 6.2 → 7.2 | One page per account, updated live, with the What Changed briefing first |

Design decisions for the UI wait for phase C. Phases A and B fix only the data and the API. Phase C design uses these skills: emil-design-eng and pick-ui-library (read from `~/claude-skills-backup-20260918/`), `ui-ux-pro-max`, and `bmad-agent-ux-designer`.

Signal shape (seen live on 2026-11-14): `{signals:[{id, account, dated, title, summary, records:[{kind, path, text}], set_off_at}]}`. Ids are words (`champion_leaves`, `urgent_request`), not numbers. A signal's records are new paperwork whose path carries the account prefix (`A/emails/...`).

## Requirements

| Id | Requirement (source) | Stories |
|---|---|---|
| R1 | **Stays live (top priority):** the app takes in new data by itself, updates the page without a reload, and writes notes back (CLAUDE.md) | 1.1, 1.3, 1.5, 6.3 |
| R2 | The app is the only path to the MCP. Answers are computed from fetched data and show "as of". An unreachable MCP is reported (CLAUDE.md, ADR 0002) | 1.1, 1.2, 1.4 |
| R3 | Q1 Book: each value backed by a file or person; what can't be backed is shown apart (CLAUDE.md, ADR 0001) | 2.1–2.4 |
| R4 | Q2 Power: for each deal, who decides, pays, uses and could block, and where each stands (CLAUDE.md) | 3.1–3.3 |
| R5 | Q3 First 3 moves, ranked, each with an owner, a date inside the deadline and the deal it moves (CLAUDE.md) | 6.1, 6.2 |
| R6 | Q4 Deadlines at risk, people going cold, stuck deals, and when each turns bad (CLAUDE.md) | 4.1, 4.2 |
| R7 | Q5 Gaps, why each matters and who to ask (CLAUDE.md) | 5.1, 5.2 |
| R8 | Every number cites a real record id, and no id is invented (CLAUDE.md) | 2.2, used by every view |
| R9 | All five answers for both accounts, every time (CLAUDE.md) | 1.5, every view |
| R10 | Opens on a What Changed briefing, re-ranked (Round 3 decision) | 7.1, 7.2 |
| R11 | Writes back only on an explicit user click (Round 2 decision) | 6.3 |
| R12 | Not a data dump: each section shows only what the CSM must act on, in short lines with receipts and no padding text. Every claim shows why it says what it says (the user's brief) | every view (1.5, 2.3, 3.3, 4.2, 5.2, 6.1, 7.2) |

## Epic 1: Live link to the CRM

The CSM opens one URL and sees both accounts as the app fetched them, with a freshness stamp that keeps itself current.

### Story 1.1: MCP client and single call queue

As the app, I call the Account Quest MCP through one queue, so the one-call-a-minute limit is never broken.

Acceptance:
- A JSON-RPC `tools/call` POST, as in the organisers' snippet. The token comes from `AQ_TOKEN` and never reaches the browser.
- One asyncio queue, at least 61 s between calls. Priority: approved writes, then `get_signals`, then `whoami`, then re-fetches.
- Any error, including a rate limit or an unknown error shape, is logged and retried in a later slot. The loop never dies.
- Tests use a fake transport. No real MCP calls are made in tests.

### Story 1.2: Snapshot store and cold-start sync

As the CSM, I see every record the app needs, fetched by the app, with the time each piece was fetched.

Acceptance:
- SQLite table `snapshots(tool, args, fetched_at, payload)`. Rows are appended, never overwritten.
- The cold start fetches `whoami`, `get_my_accounts`, `get_all_paperwork` for each account, `get_file` for each file id listed in `get_my_accounts`, `get_flytbase_team` and `get_signals`. Account and file ids come from responses and are never hard-coded.
- Progress ("6 of 9 fetched") is available to the UI while the cold start runs.
- After a restart, stored snapshots are shown with their fetch times, then refreshed.

### Story 1.3: Self-updating sync

As the CSM, I never press refresh: new signals and new accounts arrive by themselves.

Acceptance:
- `get_signals` runs every 2 min. A signal not seen before is stored, then `get_my_accounts` and that account's paperwork are queued for re-fetch (all accounts if the signal names none).
- `whoami` runs every 10 min. A new id in `new_accounts` queues that account's full fetch.
- Signals are stored raw. They are de-duplicated by id when one exists, otherwise by a hash of the payload, because their shape has not been seen yet.

### Story 1.4: Freshness and health

As the CSM, I can always tell how current the answers are.

Acceptance:
- `GET /api/health` returns the last good fetch per tool, whether the MCP is reachable, and a stale flag (no good poll for more than 5 min).
- The banner reads "Live · as of HH:MM", or "MCP unreachable since HH:MM · showing data as of HH:MM".

### Story 1.5: React shell with live push

As the CSM, I watch the page change when new data lands, with no reload.

Acceptance:
- A Vite + React + TypeScript app, built and served by FastAPI.
- `GET /api/stream` (Server-Sent Events) sends `updated` after each ingest. The client then re-fetches the answers.
- Both accounts are always shown, each with five sections (Q1–Q5) and the freshness banner.

### Story 1.6: Deploy the walking skeleton

As a judge, I open a public URL and see live data.

Acceptance:
- One always-on process running `uvicorn --workers 1`. Not serverless, and not a free tier that sleeps (ADR 0003).
- `AQ_TOKEN` is set as a host secret. The public URL shows the banner with live data.

## Epic 2: Book with receipts (Q1)

The CSM sees what each account is worth, band by band, and can check every number.

### Story 2.1: Band classifier

As the CSM, I see each value in the band its evidence earns.

Acceptance:
- A pure function over the latest snapshot that applies the ADR 0001 table.
- The fixture test expects:
  - **A:** On contract £350k (`contract.txt`). Backed upside £45k (`a_training`). Unbacked: the tender and stadium, with no value (`deal_history.json`, `rc_tender_0`, `rc_stadium_0`, `rc_stadium_3`). Unpriced: `a_tarn`, `a_westmere`.
  - **B:** On contract €140k, with the `b_renewal` blocker. Backed upside €70k (`b_reporting`). Unbacked: `b_idle` €180k and `b_sister` €1.2M, with their blockers shown. Unpriced: `b_insurance`.

### Story 2.2: Receipts and the invented-id guard

As a judge, I can trace any number to a record that exists.

Acceptance:
- Every figure or statement the API returns carries `receipts: [{id, kind, status?}]`. `kind` is one of fact, file, record, deal, offer, stakeholder.
- When the API builds a response, any receipt id missing from the current snapshot fails the build in tests and is dropped (and logged) at runtime. It is never shown.
- Facts show their status. Claims are labelled as claims and never stand alone as a receipt.

### Story 2.3: Book view

As the CSM, I read the book in each contract's own currency.

Acceptance:
- Per account: On contract, Backed upside, Unbacked and Unpriced, each line with its receipts.
- Totals are per currency and never summed across currencies.
- Display currency is USD by default, with INR available. The bracketed figure appears only after a user sets a plan rate, which shows who set it and when.

### Story 2.4: Claims beside later facts

As the CSM, I see where a confident claim has been undone by a later fact.

Acceptance:
- A `claim` fact is shown next to later `told` or `verified` facts on the same topic, using the shared fact-id stem (for example, `sr_roll_0` and `sr_roll_2`). The claim is struck through only when a verified fact or file is present.
- The fixture finds 3 pairs: `rc_appetite_0`→`_2`, `sr_roll_0`→`_2` (struck through, because `_2` is verified) and `rc_stadium_0`→`_3`. Claims with no later fact (`rc_funding_0`, `sr_roi_0`) are shown as "claim, nothing on file backs it". Pairs found only by stem are labelled "same topic (by id)".

## Epic 3: Power map (Q2)

The CSM sees, for each deal, who holds the power and where each person stands, with the gaps left open.

### Story 3.1: File cleaning and dock mapping

As the CSM, I can trust the flight logs the power map and risk radar read.

Acceptance:
- Plant and force names are normalised (`P01`, `Plant 1`, `Aldermoor Plant One`), as are the 4 month formats.
- Exact duplicates and blank "re-sent" rows are dropped. Missing months show as missing, never as zero.
- A dock is matched to a plant only when exactly one dock's monthly flight counts equal that plant's monthly flights. Each match is labelled "matched by monthly flight counts" and cites both files.
- The fixture test expects Plant 11 → AD-01 and Plant 14 → AD-14, the P04 May duplicate dropped, and P12 Aug and Metro Central Jul flagged as missing.

### Story 3.2: Role rules

As the CSM, I see who decides, pays, uses and could block each deal.

Acceptance:
- **Decides:** the signer named in `contract.txt`. If unnamed, the cell is a gap.
- **Pays:** the billing named in the contract or invoices.
- **Uses:** named logins with sign-ins (`users.json`), plus usage by force or plant.
- **Could block:** the open blocker text, plus customer requests that gate the deal.
- **Stands:** the stakeholder's `relationship`.
- Every cell has receipts, and an empty cell feeds Epic 5.
- The fixture test expects:
  - **A:** decides = "the alliance office" (no person named). Pays = 4 paid invoices, with Schedule 2 not on file.
  - **B:** decides = Stefan Roy (`contract.txt`, `calls/2026-01-08_order_call.txt`). Could block = the Group Finance request (`emails/2026-10-08_finance_mailbox.txt`) and the `b_renewal` blocker.

### Story 3.3: Power map view

Acceptance:
- One grid per deal: rows are decides, pays, uses, could block; columns are person and standing. Gaps are shown as "not on file".

## Epic 4: Risk radar (Q4)

The CSM sees what is about to go wrong and the date each item turns bad.

### Story 4.1: Risk rules with "turns red on" dates

Acceptance:
- **Renewal:** red if under 90 days to the term end with no named signer or an open blocker. Amber if under 120 days. Each risk shows the date it turns red.
- **Going cold:** a customer message with no reply for more than 14 days.
- **Stuck:** an open blocker, an open ticket with no owner, or a deadline with no date.
- **Usage drop:** docks with live flights down 50% or more over the last 2 months on file, per force or plant.
- The fixture test, with the date fixed at 2026-11-14, expects:
  - B renewal red; A renewal amber, turning red on 2026-11-30.
  - Karen 95 days; Group Finance 37 days; FB-10412 unowned.
  - Metro Central down from 8 to 3 docks with live flights.

### Story 4.2: Risk radar view

Acceptance:
- Red first, then amber. Each item shows its receipts, the deal it threatens and its "turns red on" date.

## Epic 5: Blind spots (Q5)

The CSM sees what the plan rests on but nobody knows yet, and who could tell them.

### Story 5.1: Gap collector

Acceptance:
- Gaps come from `profile.not_on_file`, empty power-map cells, unpriced deals, deadlines with no date, missing file rows, and claim-only facts.
- Each gap shows the deals it touches and their values (why it matters).
- Each gap shows who could fill it: a person or team named in the records, or "not on file".

### Story 5.2: Blind-spot view

Acceptance:
- Ordered by the value of the deals each gap touches, highest first.

## Epic 6: First moves and write-back (Q3)

The CSM gets a ranked Monday list and can save it to the CRM with one click.

### Story 6.1: Move generator and ranking

Acceptance:
- Moves are generated from risks and gaps: reply to an unanswered customer, name the signer, clear a blocker, find a missing date, fill a gap.
- Ranked by band (On contract first), then days to the deal's deadline, then the stakeholder's relationship.
- Each move has:
  - an owner: the CSM in `profile.json`, or the FlytBase person the record names;
  - a due date inside the deal's deadline (red: 2 business days, amber: 5);
  - the deal it moves, and its receipts.
- The top 3 per account are shown.

### Story 6.2: Draft writer

Acceptance:
- Each top move has a draft (an email to the customer, or an internal request), built from a template filled only with record data and receipts. No free text is invented.

### Story 6.3: Approve and save to the CRM

Acceptance:
- A Save click on a move or draft queues `write_note` (kind `next_step`, `task` or `risk`). The item shows pending until the note is sent, then its sent time.
- Saved notes are listed from `list_notes`, fetched through the queue.
- Nothing is written without a click.

## Epic 7: What Changed briefing

The CSM opens the app and sees what has moved since their last visit.

### Story 7.1: Snapshot diff

Acceptance:
- Compares the latest snapshot with the one at the user's last visit (on a first visit, the first snapshot). It reports:
  - new signals;
  - new facts and fact-status changes;
  - deal stage, value and band moves;
  - offer status changes;
  - new records and new risks.
- A contradicted fact stays visible, struck through, beside the receipt that changed it.

### Story 7.2: Briefing as the opening view

Acceptance:
- The app opens on the briefing. Accounts are ranked by red risks, then by on-contract value.
- The last visit is kept per browser.
- A walkthrough checklist confirms the CLAUDE.md definition of done for both accounts.
