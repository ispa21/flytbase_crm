---
title: 'Page shell: two-account home page on live data (stories 1.5, 2.3)'
type: 'feature'
created: '2026-11-14'
status: 'in-progress'
route: 'dispatch'
baseline_commit: '90b4d9c'
review_loop_iteration: 0
context:
  - '{project-root}/CLAUDE.md'
  - '{project-root}/CONTEXT.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
  - '{project-root}/docs/adr/0001-evidence-decides-the-band.md'
  - '{project-root}/docs/adr/0004-vercel-cron-worker-and-postgres.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no page. Judges open the live URL and must see the account answers at once, fresh, without clicking or asking anything.

**Approach:** A React (Vite, TypeScript) app in `frontend/` built to `backend/public/` and served from the same domain. It opens on two account columns (A and B) from `GET /api/book`, shows each account's lead line and worth strip (On contract, Backed upside, Unbacked, Unpriced per currency, never summed, each with receipt chips), the freshness line ("as of", stale banner from `/api/health`), and polls `/api/changes?since=` every 30 s, re-rendering only what changed. Sections for later answers render only when their data key (`q2`, `q3`, `q4`, `q5`) is present in the API response. Follow DESIGN.md and EXPERIENCE.md exactly (owner choices: two columns, light editorial, 30 s poll, inline Approve and save).

## Boundaries & Constraints

**Always:** Use the UI library and tokens named in DESIGN.md and EXPERIENCE.md (base-ui, CSS variables). Do not label sections as questions. Every number shows its source on demand (receipt chips). Stale or unreachable data shows a clear banner with the last fetch time; never present stale data as current. Band colours always come with a text label. Accessible per EXPERIENCE.md. While building the UI, invoke the `emil-design-eng` and `ui-ux-pro-max` skills for polish and review. The page only calls this app's own `/api/*` endpoints.

**Never:** No MCP calls from the browser, no token in the frontend. No invented data, no placeholder numbers on screen. No question headings. Do not touch `backend/app/` logic. No converted-currency figure.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Data loaded | `/api/book` with `q1` for A and B | Two columns, bands per currency with receipts, "as of" | N/A |
| Waiting for first sync | `as_of` null | Calm "waiting for first sync" state, no numbers | N/A |
| Stale | `/api/health` stale | Banner with last fetch time; numbers stay with their as-of | Never shown as current |
| API unreachable | Fetch fails | Banner "can't reach the app", last data kept with its as-of | Retries on next poll |
| New data | `/api/changes` counter moves | Refetch; only changed items re-render, with a "New" tag | N/A |
| Missing later answers | No `q2`..`q5` keys | Those sections are simply absent, no empty shells | N/A |

</frozen-after-approval>

## Code Map

- `frontend/` -- new Vite + React + TS app; `vite.config.ts` builds to `../backend/public`, dev proxy `/api` to `https://flytbase-crm.vercel.app`
- `backend/public/` -- build output, committed so the host serves it without a build step
- `backend/app/main.py` -- if the build is not served statically by the host, serve `backend/public/index.html` at `/` (smallest change only)
- `_bmad-output/planning-artifacts/ux/` -- DESIGN.md tokens, EXPERIENCE.md layout and states
- Do not change: worker, db, book logic, ADRs

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/` -- scaffold, tokens from DESIGN.md as CSS variables, base-ui
- [ ] `frontend/src` -- data hooks: `/api/book`, `/api/health`, 30 s `/api/changes` poll
- [ ] `frontend/src` -- account column: lead line, worth strip with receipt chips, freshness and stale banner
- [ ] `backend/public/`, `backend/app/main.py` -- built output served at `/`
- [ ] tests -- matrix rows (Vitest + Testing Library, mocked fetch)

**Acceptance Criteria:**
- Given `/api/book` data, when the page loads, then both accounts show without any click, each band with its currency and receipts.
- Given stale health, when the page renders, then a banner shows the last fetch time.
- Given the changes counter moves, when polled, then the data refetches and only changed items update.
- Given the build, when `backend/public/index.html` is served locally with the API, then it loads and renders.

## Verification

**Commands:**
- `cd frontend && npm test -- --run` -- expected: all pass
- `cd frontend && npm run build` -- expected: output in `backend/public/`
