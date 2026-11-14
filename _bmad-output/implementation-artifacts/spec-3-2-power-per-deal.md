---
title: 'Default answers slice 2: who holds the power per deal (stories 3.1, 3.2)'
type: 'feature'
created: '2026-11-14'
status: 'in-progress'
route: 'dispatch'
baseline_commit: '90b4d9c'
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

**Problem:** `/api/book` shows what the book is worth but not who decides, pays, uses and could block each deal, or where each person stands with the CSM.

**Approach:** Extend `backend/app/book.py` with a pure function that adds `q2` per account: for each deal, the people in each role (decides, pays, uses, could block) with their standing, each with receipts. Follow the acceptance text of stories 3.1 and 3.2 in `epics.md` exactly, including the flight-log cleaning and dock mapping where those stories require it. A role no record backs is shown as a gap ("not on file"), never guessed.

## Boundaries & Constraints

**Always:** Pure functions over stored snapshots, same receipts rules as `q1` (ids must exist; dropped and logged at runtime; strict in tests). Account-scoped keys include the account. A role is stated only when a stakeholder record, fact or file backs it; every person shown has a receipt. Tests use `mcp-cache/` fixtures, no network.

**Never:** No UI, no LLM, no invented people, roles or ids. Do not change the worker, queue, db schema, `mcp-cache/`, ADRs. Do not alter `q1` output.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fixture, both accounts | check2 data plus paperwork and flight logs | `q2` matches the acceptance cases in stories 3.1 and 3.2 of epics.md | N/A |
| Role with no evidence | No record names a payer or blocker for a deal | Role listed as a gap ("not on file") with no person | Never filled by guess |
| Claim-only role | Role asserted only by a `claim` fact | Shown as claim, not as a receipt on its own | N/A |
| Missing paperwork or files | Snapshot absent | `q2` present with `loaded: false`, no people invented | Never 500 |
| Same user id in A and B | Account-scoped ids collide | Kept apart by account | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/book.py` -- add `power_map(snapshots)` and a flight-log cleaner; reuse receipt check and `build_book`
- `backend/tests/test_book.py` -- add rows; reuse `db` and `fixture` helpers
- `docs/data-contract.md` -- stakeholders, facts, flight-log traps (name/date variants, duplicates, missing months), dock to plant mapping
- Do not change: worker/queue/db schema, `q1`

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/book.py` -- flight-log cleaning and dock mapping (story 3.1)
- [ ] `backend/app/book.py` -- power per deal with standing and receipts (story 3.2)
- [ ] `backend/tests/test_book.py` -- matrix rows

**Acceptance Criteria:**
- Given the fixtures, when `/api/book` is built, then `q2` for A and B matches the acceptance cases in epics.md stories 3.1 and 3.2.
- Given a role no record backs, when built, then it shows as a gap with no person.
- Given a receipt id not in the snapshot, when built, then it is dropped and logged (strict in tests).

## Verification

**Commands:**
- `cd backend && uv run pytest -q` -- expected: all pass, no network
