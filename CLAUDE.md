# FlytBase Questathon: non-negotiables

Judges open the live CRM and read it like your manager would. They may ask for a live walkthrough. Build for the "Strong" column below, every time.

## Data rule: live, via MCP, through the app
- The app is the only path to the MCP. No tool, agent or screen reads the MCP directly or from a pasted/cached copy.
- Every answer is computed from data fetched at request time. Any cache shows "as of <timestamp>".
- **TOP PRIORITY, "Stays live":** the app takes in new data by itself (no manual rebuild, no reload needed) and writes notes back to the CRM. Never "built once from a copy"; "up to date after a reload" is only Solid.
- If the MCP is unreachable, say so and show the last-fetched time. Never present stale data as current.

## The 5 questions: answer for EACH account, every time

| # | Question | Strong | Weak (avoid) |
|---|----------|--------|--------------|
| 1 | What is the book worth? | Each deal at a value you can back, with the file or person behind it. What you cannot back is shown apart. | One big total, copied from what a champion said. |
| 2 | Who holds the power? | Per deal: who decides, who pays, who uses it, who could block it, and where each stands with you. | A list of contacts. |
| 3 | What do you do first? | First 3 moves, ranked, each with an owner, a date and the deal it moves. | "Follow up with the client." |
| 4 | What is about to go wrong? | Deadlines at risk, people going cold, deals that are stuck, and when each turns bad. | Everything marked green. |
| 5 | What do you still not know? | The gaps the plan rests on, and who could fill each one. | No gaps, or guesses shown as facts. |

## Judging rubric (target = Strong)

| Criterion | Strong |
|-----------|--------|
| Answers the five | All five, for **both accounts**, actionable on Monday. |
| Numbers you can back | Every number cites its record id. Nothing rests on a claim alone. **No invented ids.** |
| The right first moves | Ranked, owned, and dated inside every deadline. |
| Honest about gaps | What it doesn't know, why it matters, who to ask. |
| Stays live | Ingests new data by itself and writes notes back. |

## Definition of done
Output covers all 5 questions for both accounts; every figure cites a real CRM id; unknowns listed with why-it-matters and who-to-ask; freshness timestamp shown; moves have owner + date before the relevant deadline.

## Project map (read before building)
- `CONTEXT.md`: glossary. Use its terms (Deal, Receipt, the bands, Signal...) in code and UI.
- `docs/adr/`: 0001 band rule, 0002 one queue/one caller (1 MCP call a minute), 0003 stack (FastAPI + React, one process, one worker, SQLite, Server-Sent Events, no LLM).
- `docs/data-contract.md`: MCP response shapes, id joins, data traps. Code against this.
- `_bmad-output/planning-artifacts/epics.md`: requirements, epics, stories and acceptance tests. `_bmad-output/implementation-artifacts/sprint-status.yaml`: story status.
- `mcp-cache/`: recorded MCP responses, used as **test fixtures only**. The app never reads them, and nobody calls the MCP outside the app.
