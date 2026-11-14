---
title: 'Radar and power views per deal; paperwork-only accounts in the book (8.1)'
type: 'feature'
created: '2026-11-14'
status: 'review'
route: 'dispatch'
baseline_commit: '42fd7e6'
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/CONTEXT.md'
  - '{project-root}/docs/data-contract.md'
  - '{project-root}/backend/app/book.py'
---

## Intent

**Problem:** The UI needs two dense per-deal views that `/api/book` does not give yet: a risk radar (deadline, going cold, blocked) and a power map with standing, champion and what each person is waiting on. Separately, the live app fetched paperwork for accounts named by `whoami` (H, K) but `/api/book` shows only A and B, because `build_book` walks `get_my_accounts` accounts only.

**Approach:** A new pure module `backend/app/views.py` builds `radar` and `power` from q1/q2/q4 output plus the same snapshots. `band_deals` adds both keys per account and runs the same receipt check as q1..q5. `build_book` also includes every account with a paperwork snapshot or named in the latest `whoami` (`new_accounts`, `pack`); such an account is built from its paperwork only.

## Shapes

`radar = {deals: [Row], counts: {deadline|cold|blocked: {red, amber, green, unknown}}}`

- `Row = {deal: {id, title, band, value, currency, kind}, deadline: Cell, cold: Cell, blocked: Cell}`; `kind` is `opportunity`, `offer` or `contract` (contract: a renewal on file in paperwork with no deal in the export; `id` null).
- `Cell = {level: red|amber|green|unknown, label (<=48 chars), date: YYYY-MM-DD|null, receipts: [{id, kind}]}`. `date` is the day the cell turns (or turned) worse when that can be worked out, else the date the label rests on, else null.
- Rows: every opportunity, every offer with status `open`, and a contract row when q1 has an on-contract line with no deal id. Declined offers and told-only lines (q1 lines with no id outside on-contract) are not rows.

`power = {deals: [{deal: {id, title, band}, roles: {decides, pays, uses, blocks, champion: [P]}, gaps: [role]}]}`

- `P = {id|null, name, title|null, side: customer|flytbase|org, relationship, basis: record|inferred, why? (<=60, inferred only), waiting_on: [{text (<=60), since|null, receipts}], receipts}`.

## Rules

**Radar, deadline:** q4 renewal item for the row -> its level, `date` = its `turns_bad_on` (term end when q4 has none). Opportunity deadline `soon` or `passed` and not `met` -> red. Term already ended -> red. Green only when a dated term end (or deadline date) is on file and more than 120 days out; a dated term end at exactly 120 days is amber. Otherwise unknown, "no date on file".

**Radar, cold:** people = q2 `decides` and `pays` entries that are a stakeholder or a named person. None -> unknown. Per person: red if a q4 `cold` item is theirs (no reply > 14 days); amber if guarded or the last dated contact (profile `last_contact_before_handover`, mail they sent, calls they were on) is more than 30 days old; green if warm or neutral and that contact is within 30 days; else unknown. The cell takes the worst person; green needs every person green.

**Radar, blocked:** open blocker -> red (deal receipt). q4 `stuck` item for the deal -> amber. Opportunity with blocker null -> green "no blocker on record" (cleared -> green "blocker cleared"), deal receipt. Offers and contract rows -> unknown.

**Power:** decides/pays/uses/blocks reuse q2 (`could_block` = blocks); entries with no name are skipped (their gaps already sit in q2/q5), except an open blocker with no person, shown as `side: org` with the blocker text as name. `side`: stakeholder or named signer -> customer; "FlytBase" in the name -> flytbase; else org. Champion = warm stakeholder who said one of the deal's evidence facts (a told/verified fact preferred), `basis: inferred`, `why: "warm, spoke for this deal (<fact id>)"`. `waiting_on` per person: open tickets they raised, open `requests.csv` rows they raised (merged with the ticket of the same id), and their emails with a "No reply" trailer (merged with a `(none)` request row of the same date). `gaps` lists roles with no P.

**Account list (root cause of H/K missing):** one helper `sync.account_ids(db)` = `get_my_accounts` ids + every `whoami` ever stored (`new_accounts`, packs not marked `open: false`) + every account with a paperwork snapshot. `Sync.schedule` uses it for paperwork refresh and manual resync; `build_book` uses it for the account list.

**Paperwork-only account:** an account with no `get_my_accounts` entry is built as `{id, name: profile.json name or null}` (no stakeholders, facts, deals) and flagged `in_export: false`. q1 puts the contract renewal on contract from `contract.txt` + `profile.json` (no deal id) when no renewal deal is on contract. q4 flags the renewal by term end with `deal: null` when no renewal deal exists. q2 exposes the account-level decides/pays/uses as `q2.contract`; power and radar use it for the contract row.

**Always:** pure functions over stored snapshots; every receipt checked against the same snapshots (strict in tests); a green cell left with no receipt after the check is shown as unknown. **Never:** invented ids, people or dates; LLM; network in tests; changes to frontend/, mcp-cache/, db schema, ADRs.

## I/O & Edge-Case Matrix

| Scenario | Expected |
|---|---|
| Fixtures A, B, today 2026-11-14 | A renewal deadline amber (turns 2026-11-30); B renewal red (2026-11-02); B cold amber (Stefan Roy, last contact 2026-10-13); A cold unknown (no named decider or payer); B renewal/idle/sister blocked red; A deals blocked green |
| Offer row | deadline, cold, blocked unknown |
| Power B | b_renewal blocks: the open blocker (org) and Group finance (org) waiting on the 2026-10-08 request + email; champion Stefan Roy (sr_roll_2) |
| Paperwork-only account (synthetic) | in `/api/book` with profile name, `in_export: false`, on-contract value from profile, q4 renewal, one contract row in radar and power, every receipt real |
| whoami names an account with no paperwork yet | present, everything "not on file" |

## Acceptance

- [x] `backend/app/views.py` (radar, power); wired in `band_deals` with the receipt check
- [x] `sync.account_ids(db)` used by `build_book` and `Sync.schedule` (refresh + resync); `db.distinct`
- [x] tests: radar levels and counts for A and B, green with receipt, no bare green, power roles, paperwork-only account in the book, its paperwork queued when due and after resync
- [x] `cd backend && uv run pytest -q` passes
