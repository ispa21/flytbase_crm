---
title: 'Default answers slice 5: first three moves (story 6.1)'
type: 'feature'
created: '2026-11-14'
status: 'done'
route: 'dispatch'
baseline_commit: 'HEAD (uncommitted, no git repo at spec time)'
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/backend/app/book.py'
  - '{project-root}/backend/tests/test_book.py'
---

## Intent

**Problem:** `/api/book` answers q1, q2, q4, q5 but not "what do you do first".

**Approach:** `q3` per account, pure and deterministic, derived from the q1/q2/q4/q5 output. No LLM, no new MCP call, no db change.

## Rules

- Candidates: red/amber q4 renewal -> "clear what blocks <deal>"; q4 cold email -> reply to the sender; q4 unowned ticket -> assign an owner; q4 open blocker (skipped when the deal's renewal move covers it); q4 signal -> respond; q5 gap on a priced deal -> "find out from <who_could_fill>" (one per deal).
- Rank: tier (red, amber, other q4, gaps), then the deal's band (On contract first), then turn date. Top 3 kept; `candidates` counts all.
- `owner`: the CSM in `profile.json` `flytbase_side.csm` (entry without `to`; "you" shown as "the CSM (you)"), else "not on file". `with` = the customer person a record names, else "not on file".
- `due`: today + 2 business days (red) or 5, held one day before `turns_bad_on` when that is still ahead; `due_basis` says which rule applied and whether the turn date is past or not on file. `turns_bad_on` is copied from q4, never computed anew.
- `draft_note`: `{kind: "next_step", text}` from a fixed template over the move's own fields and receipt ids. Nothing is written; story 6.3 does the approve-and-save.
- Receipts: those of the source q4/q5 item plus `<acct>/profile.json` when the owner comes from it; same account-scoped check as q1-q5 (strict in tests).

## Acceptance

- [x] `_account_q3` in `book.py`, wired into `band_deals` (`q3` key), receipts checked
- [x] tests: moves on fixtures (order, due, owner, receipts, draft note), no paperwork
- [x] `cd backend && uv run pytest -q` passes (33)

## Not done

Ranking by the stakeholder's relationship; split of the draft into customer email vs internal request (6.2); dated due for moves with no turn date is a rule date, not a record date.
