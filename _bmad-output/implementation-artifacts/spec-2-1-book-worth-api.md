---
title: 'Default answers slice 1: /api/book with Q1 worth, bands and receipts (stories 2.1, 2.2, 2.4)'
type: 'feature'
created: '2026-11-14'
status: 'in-progress'
route: 'dispatch'
baseline_commit: '12a761a'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/CONTEXT.md'
  - '{project-root}/docs/adr/0001-evidence-decides-the-band.md'
  - '{project-root}/docs/data-contract.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/backend/app'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app stores snapshots but answers nothing. The default page must open on the five answers; the first is "what is the book worth", per account, with a number the reader can trace to a record.

**Approach:** A pure function over the latest stored snapshots returns, per account, each deal in its band (ADR 0001) with receipts, plus claims shown beside later facts. `GET /api/book` returns it with an `as_of` time taken from the snapshots' fetch times. Answers for Q2 to Q5 are later slices; `/api/book` returns only `q1` per account for now.

## Boundaries & Constraints

**Always:** Pure functions, no I/O inside the band logic. Totals per currency, never summed across currencies; currency comes from account data on file, not a guess. Every figure and statement carries `receipts: [{id, kind, status?}]`; a receipt id absent from the snapshot fails in tests and is dropped and logged at runtime. A `claim` is labelled a claim and never stands alone as a receipt. Account-scoped keys (`U##`, paths) include the account. Tests use `mcp-cache/` fixtures through the db layer with no network.

**Never:** No UI. No converted currency figure (needs a user-set plan rate, later). No LLM. No invented ids, values or people. Do not change `mcp-cache/`, ADRs, or the worker/queue code.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fixture, account A | check2 my_accounts plus paperwork | On contract £350k (`contract.txt`, with renewal-risk flag); Backed upside £45k (`a_training`); Unbacked: tender and stadium (`rc_tender_0`, `rc_stadium_0`, `rc_stadium_3`); Unpriced: `a_tarn`, `a_westmere` | N/A |
| Fixture, account B | same | On contract €140k with `b_renewal` blocker; Backed upside €70k (`b_reporting`); Unbacked `b_idle` €180k, `b_sister` €1.2M with blockers; Unpriced `b_insurance` | N/A |
| Claims vs facts | Facts sharing an id stem | 3 pairs: `rc_appetite_0`→`_2`, `sr_roll_0`→`_2` (struck through, `_2` verified), `rc_stadium_0`→`_3`; `rc_funding_0`, `sr_roi_0` shown as "claim, nothing on file backs it"; stem-only pairs labelled "same topic (by id)" | N/A |
| No snapshot yet | Empty store | `/api/book` returns 200 with `as_of: null` and a "waiting for first sync" state, no numbers | Never 500 |
| Missing receipt id | A receipt id not in the snapshot | Dropped and logged; test build fails | Never shown |
| Null `worth_up_to` on a renewal | Renewal in paperwork | On contract, not Unpriced | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/db.py` -- reuse the latest-snapshot read; do not change schema
- `backend/app/book.py` -- new: `band_deals(snapshots) -> per-account q1`, `pair_claims`, `check_receipts`
- `backend/app/main.py` -- add `GET /api/book` only
- `backend/tests/test_book.py` -- new: one test per matrix row on fixtures
- `docs/data-contract.md` -- where deals, offers, facts, deadlines and currency live; ADR 0001 for the band rule

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/book.py` -- band classifier per ADR 0001 (story 2.1)
- [ ] `backend/app/book.py` -- receipts and the invented-id guard (story 2.2)
- [ ] `backend/app/book.py` -- claim-beside-later-fact pairs (story 2.4)
- [ ] `backend/app/main.py` -- `GET /api/book` with `as_of`
- [ ] `backend/tests/test_book.py` -- matrix rows

**Acceptance Criteria:**
- Given the fixtures, when `/api/book` is built, then each account's bands and totals equal the matrix values, per currency, each with receipts.
- Given a receipt id not in the snapshot, when the response is built, then it is dropped and logged, and the test helper fails.
- Given an empty store, when `/api/book` is read, then it returns 200 with `as_of` null and no numbers.

## Verification

**Commands:**
- `cd backend && uv run pytest -q` -- expected: all pass, no network
