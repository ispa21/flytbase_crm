---
title: 'Default answers slice 3: what is about to go wrong (story 4.1)'
type: 'feature'
created: '2026-11-14'
status: 'in-progress'
route: 'dispatch'
baseline_commit: 'f292b37'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/CONTEXT.md'
  - '{project-root}/docs/data-contract.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/backend/app/book.py'
  - '{project-root}/backend/tests/test_book.py'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/api/book` shows worth (q1) and power (q2) but not what is about to go wrong or the date each item turns bad.

**Approach:** Add `q4` per account in `backend/app/book.py`: pure functions over stored snapshots that apply the story 4.1 rules (renewal, going cold, stuck, usage drop) and list stored signals with their own `dated`. Each item carries receipts and a "turns bad on" date, or "not on file" when no record gives one.

## Boundaries & Constraints

**Always:** Pure functions, same receipts rules as q1/q2 (ids must exist in the snapshot, dropped and logged at runtime, strict in tests). Record ids are account-scoped (`A/emails/...`). "Today" is the server date, injectable for tests; each signal also shows its own `dated`. A fact no record backs is shown as "not on file", never guessed. Tests use `mcp-cache/` fixtures, no network.

**Never:** No UI (frontend/), no LLM, no invented ids, no change to worker, queue, db schema, `mcp-cache/`, ADRs, or q1/q2 output. No MCP calls.

## Rules (epics.md story 4.1)

- Renewal (opportunity titled "Renew...", `profile.json` `renewal.term_ends`): red if under 90 days to term end and (signer in `contract.txt` is not a named person, or the opportunity has an open blocker); amber if under 120 days otherwise; no item at 120 days or more. Red-on date = term end minus 90 days, shown only when a red condition holds, else "not on file".
- Going cold: a customer email record (`From:` not FlytBase) whose text carries a "No reply" trailer, older than 14 days at today. Shows days waiting and the date it went cold (sent + 14 days).
- Stuck: open blocker on a deal; ticket in `tickets.json` not Closed with no assignee; deal deadline with no date. Turns bad on: "not on file".
- Usage drop: per force (`docks_with_live_flights`) or plant (`patrol_flights + test_flights`, labelled), latest month on file against the month two months earlier, down 50% or more. Skipped when either month is missing or blank.
- Signals: every stored signal for the account, verbatim title/summary, its own `dated`, receipts = the signal id and its record paths.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fixture, today 2026-11-14 | check2 + paperwork + flight logs + signals | B renewal red; A renewal amber, red-on 2026-11-30; Karen 95 days; Group Finance 37 days; FB-10412 unowned; Metro Central 8 to 3 | N/A |
| No paperwork / files / signals | snapshots absent | `q4` present with `loaded: false`, no items invented | Never 500; gap says what is missing |
| Receipt id not in snapshot | any | dropped and logged (strict in tests) | N/A |
| Deadline with no date | `b_idle.deadline` | stuck item, "not on file" | N/A |
| Account deadline with no deal | `deadlines[]` text not on any deal | listed in `gaps` (no id to cite) | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/book.py` -- add `_account_q4`, wire into `band_deals` and `build_book` (reads `get_signals` snapshot); add `ticket`, `signal` receipt kinds
- `backend/tests/test_book.py` -- 4.1 tests

## Tasks & Acceptance

**Execution:**
- [ ] `book.py` -- `_account_q4` with the four rules plus signals
- [ ] `book.py` -- wire `today`, signals, receipt kinds
- [ ] `test_book.py` -- fixture test at 2026-11-14, empty-snapshot test, strict receipts

**Acceptance Criteria:**
- Given the fixtures and today 2026-11-14, then q4 matches the expected values in epics.md story 4.1.
- Given a missing snapshot, then q4 shows `loaded: false` and no invented items.
- `cd backend && uv run pytest -q` passes.
