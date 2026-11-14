---
title: 'Default answers slice 4: what we still do not know (story 5.1) + minimal What Changed (story 7.1)'
type: 'feature'
created: '2026-11-14'
status: 'done'
route: 'dispatch'
baseline_commit: 'edf1efb'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/docs/data-contract.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/backend/app/book.py'
  - '{project-root}/backend/tests/test_book.py'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/api/book` has q1, q2, q4 but no single list of what the plan rests on that nobody knows, why it matters, or who could fill it. The briefing also cannot show what moved.

**Approach:** Add `q5` per account (pure, built from the q1/q2/q4 outputs plus `profile.not_on_file`) and `changes` (`?since=<epoch>`): new signals and deal band/stage/value moves between the snapshots in force at `since` and the latest.

## Boundaries & Constraints

**Always:** Pure functions over stored snapshots; same receipt checks as q1/q2/q4 (strict in tests); account-scoped ids; fixtures only, no network, no MCP. Who could fill = a name a record gives (fact `said_by`, a stakeholder named in the gap text) else "not on file". Deals touched by a profile gap come from a shared-word match only; none matched = account-wide (empty deals).

**Never:** No frontend/, no LLM, no invented ids, no change to q1/q2/q4 output, no db schema change.

## Rules

- Gap kinds: `profile` (not_on_file[]), `power` (empty q2 cells and q2 entry gaps), `unpriced` (q1 unpriced deals), `deadline` (q4 "Deadline has no date"), `record` (q4 gaps), `file` (flight-log months with no row), `claim` (claim with nothing backing it; deals = those listing it as evidence).
- Each gap: `text`, `deals[{id,title,value,currency}]`, `value_at_stake` (sum of priced deals, null if none), `unpriced_deals`, `who_could_fill`, `receipts`.
- `changes`: `moved` (band/value/stage from -> to), `new_deals`, `new_signals` (signals table `first_seen > since`). Old side = latest snapshot at or before `since`, else the first snapshot (first visit). Only added to /api/book when `since` is given.

## Tasks & Acceptance

- [x] `book.py` `_account_q5`, wired into `band_deals`; `what_changed`; `build_book(at=)`
- [x] `db.py` `snapshot_at`, `signals_since` (read-only helpers)
- [x] `main.py` `/api/book?since=`
- [x] tests: q5 on fixtures, q5 without paperwork, what_changed
- AC: `cd backend && uv run pytest -q` passes (31).

## Not done (deferred)

Story 5.2 ordering by value; 7.1 new facts / fact-status changes / offer status / new records / new risks, and struck-through contradicted facts.
