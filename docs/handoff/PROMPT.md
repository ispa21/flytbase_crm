# Handoff prompt

Two parts. **Part 1** is pasted into the new agent. **Part 2** is the checklist the outgoing agent runs when the user says "we're near the limit, hand off".

---

## Part 1: paste this into the incoming agent

```
You are taking over a half-finished build: the FlytBase Questathon CRM, in /Users/ishan/Data/FlytBaseQuestathon. A previous agent hit its usage limit. You continue the work; do not restart it.

READ, in this order, before touching anything:
1. CLAUDE.md (project non-negotiables, the 5 questions, the judging rubric)
2. docs/handoff/STATE.md (exactly where we stopped, and the next step)
3. CONTEXT.md (glossary; use its terms in code and UI)
4. docs/adr/0001..0004 (decisions already made; do not re-litigate them)
5. docs/data-contract.md (MCP response shapes, id joins, traps)
6. _bmad-output/implementation-artifacts/sprint-status.yaml and the spec named in STATE.md
7. _bmad-output/planning-artifacts/epics.md only for the story you are about to build

Hard rules (breaking any of these fails the project):
- The app is the ONLY path to the Account Quest MCP. Never call the MCP yourself, and never read mcp-cache/ except as test fixtures.
- The MCP allows 1 call per minute per token. No agent run may spend calls. Use fixtures and fakes in tests.
- Never spend real paid or quota-limited API calls (LLM, STT, any metered service) for re-runs, evals or "checks on real data". Ask first and say how many calls it would cost.
- State only what a record backs. Every number cites a real record id. Never invent an id, fact or person. Inferences are dropped or labelled as inference. Unknowns are listed with why-it-matters and who-to-ask.
- The product must stay live: it ingests new data by itself and writes notes back. Any cache shows "as of <timestamp>". If the MCP is unreachable, say so; never show stale data as current.
- No LLM in the product (ADR 0003). Do not start UI design until the backend (Phases A and B) works; then use the skills listed in CLAUDE memory (ui-ux-pro-max, bmad UX designer).
- Do not edit the human-owned "frozen" section of any spec without asking the user.
- After changing code, run `graphify update .` and keep sprint-status.yaml honest (done only when verified by a command you ran).
- Commit only when the user asks.

HOW TO WORK:
- Resume at "Next step" in docs/handoff/STATE.md. Confirm it with the user in one or two lines, then go.
- Verify with real commands (`cd backend && .venv/bin/pytest -q`), not by reading code and assuming.
- If something in STATE.md contradicts the repo, trust the repo, say so, and fix STATE.md.
- When the user says they are near a usage limit, run the "Outgoing agent: handoff checklist" in docs/handoff/PROMPT.md.

Start by reporting back in under 10 lines: what you understood the state to be, and the first action you will take.
```

---

## Part 2: Outgoing agent: handoff checklist

Run when the user says the limit is near. Do these, in this order, and stop adding features:

1. Finish or safely park the current edit. Nothing half-written: tests must run, or say in STATE.md exactly what is broken and why.
2. Run `cd backend && .venv/bin/pytest -q` and record the real result.
3. Overwrite `docs/handoff/STATE.md`: phase, done and verified (with the command and date), in progress, **Next step** (numbered, specific, with file names), open questions, working tree status (`git status --short`).
4. Update `_bmad-output/implementation-artifacts/sprint-status.yaml` and the spec's task checkboxes to match reality.
5. Record any decision the user made this session that is not in an ADR (one line each in STATE.md, or a new ADR if it is architectural).
6. Save any new user preference to the memory directory.
7. Run `graphify update .` if code changed.
8. Reply to the user with: the path to PROMPT.md Part 1 (ready to paste), a 3-line summary of where we stopped, and anything the user must do (env vars, approvals). Do not commit unless asked.
