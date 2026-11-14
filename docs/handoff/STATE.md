# STATE: where we stopped

> Rewritten 2026-11-14 after the incoming agent found this file contradicted git. Trust git over older paragraphs. Tests re-run this session: `cd backend && uv run pytest -q` → **44 passed** (0.39s). `.venv` lives in `backend/`; run pytest from `backend/`.

## Phase
Phases A–C are in git through `f8906a4`. The page is a CRM shell. `/api/book` returns all five answers plus What Changed. Write-back is implemented in the API and the UI (approve-and-save). A live note save still spends one MCP call and needs the user to press Approve on a running app.

## Done and committed (git log, newest first)
- `f8906a4` CRM shell: sidebar, Deals, People, Activity, Moves, Notes, Sync, Accounts, palette, approve-and-save
- `2ccd2ad` notes write-back, people and activity endpoints (story 6.3)
- `d1bd972` first moves Q3; unknowns and What Changed sections (story 6.1)
- `1fda616` render unknowns (Q5) and What Changed (stories 5.2, 7.2)
- `fbd0f82` unknowns and What Changed data on `/api/book` (stories 5.1, 7.1)
- `75a109f` power (Q2) and risks (Q4) on the page (stories 3.3, 4.2)
- `edf1efb` manual resync: `POST /api/resync`, `resync_at` on health, Resync button, page pokes worker
- `15afec2` Q4 in `/api/book` (story 4.1)
- `f3061a4` React shell served by FastAPI (stories 1.5, 2.3)
- `f292b37` Q2 power per deal; `dev/console.py`; `docs/WALKTHROUGH.md` (stories 3.1, 3.2)
- `ffc917e` Q1 bands, receipts, claim pairs (stories 2.1, 2.2, 2.4)
- `6cf144f` / `12a761a` Vercel: Postgres queue + lease, `/api/worker`, `/api/poke`, GitHub Actions every 5 min

`docs/WALKTHROUGH.md` records the live URL `https://flytbase-crm.vercel.app`. This session did not hit it. Whether health is fresh is still unchecked.

## Uncommitted
- `frontend/src/styles.css`, `frontend/src/accounts.css`: mobile bar and account-header tweaks. Not reviewed in a browser this session.
- `frontend/vite.mock.config.ts`: local mock proxy (port 5199 → 8799). Untracked.
- `docs/handoff/`: this file and `PROMPT.md`. Untracked.

## Not done
- `sprint-status.yaml` is stale (generated 15:01): 1.1–1.4 `in-progress`, everything else `backlog`. Do not mark `done` until each story's acceptance command is re-run.
- `docs/WALKTHROUGH.md` section 4 still says power, risks, moves, unknowns, What Changed and approve-and-save are "coming next". They are in `f8906a4`.
- Rubric pass: both accounts, all five questions, every figure citing a real id, from the running app or from `build_book` on fixtures. Tests cover pieces (`backend/tests/test_book.py`, `test_crm.py`). A full Monday-ready read of both accounts was not done this session.
- A real `write_note` against the MCP: ask the user first. It spends a call and the note is visible to judges.

## Next step
1. Read `/api/book` (or `build_book` on fixtures, no MCP) for accounts A and B and check the five questions against CLAUDE.md. List any gap with the record id or the missing field.
2. Fix only the gaps that check finds. Then update `sprint-status.yaml` for stories whose acceptance command you actually ran.
3. Browser-check the uncommitted mobile CSS before committing. Commit only if the user asks.
4. Ask the user before any live `write_note` or any health check that would be more than a read of the deployed app.

## Open questions
- Is `https://flytbase-crm.vercel.app` fresh (worker running, `AQ_TOKEN`, `DATABASE_URL`, `CRON_SECRET` set)? Not checked this session.
- Game clock vs server date is still open (ADR 0003).
