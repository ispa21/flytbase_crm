---
name: Book Tool
description: Behaviour of the Book Tool home page: one page, both accounts, the five answers woven into what a CSM naturally reads.
status: draft
updated: 2026-11-14
sources:
  - CLAUDE.md
  - CONTEXT.md
  - docs/adr/0001-evidence-decides-the-band.md
  - docs/data-contract.md
  - _bmad-output/planning-artifacts/epics.md (stories 1.5, 2.3, 3.3, 4.2, 5.2, 6.2, 7.2)
---

# Book Tool: Experience Spine

Visual identity is in `DESIGN.md`; tokens are cited as `{path.to.token}`. Spines win on conflict with any mock. Anything the inputs do not state is `[ASSUMPTION]`.

## Foundation

Responsive web app with a CRM shell and hash routes (no router dependency). Home is the two-account briefing; the other routes are working views of the same data. React + Vite + TypeScript, served by the same Vercel project as the API. Desktop first (judge on a laptop or projector), usable at 360px.

**UI library (pick-ui-library): base-ui.** One library for the accessible primitives this page needs: Collapsible (every disclosure row), Popover (long receipt ids). It is unstyled, so `DESIGN.md` tokens apply untouched as plain CSS variables, with no theme to fight. Toasts (save confirmation) add Sonner only if the save state line proves too quiet. Not chosen: a styled kit, because the page is typography and disclosure, not widgets.

The page opens on its content: both accounts, no click, no query, no selection. The reader never maps a question to a place; the order of the page is the order of a CSM's thinking.

**The five answers are never labelled as questions.** The reader sees what they would read in a good handover note. The mapping is below.

## Information Architecture

### App shell (v2)

| Part | Behaviour |
|---|---|
| Left sidebar | Home, Accounts, Deals, People, Activity, Moves, Notes, Sync. Below 860px it becomes a drawer behind a menu button. Keys: `g` then `h c d p a m n s`. |
| Top bar | Search and command palette (Cmd/Ctrl+K, client-side over deals, people, activity), account filter All/A/B, freshness chip, What Changed bell, theme toggle (light/dark), Resync now. A stale or unreachable banner sits under the bar. |
| Routes | `#/` Home, `#/accounts`, `#/deals` (table or board), `#/deals/<acct>/<id>` deal detail, `#/people` (detail drawer), `#/activity`, `#/moves`, `#/notes`, `#/sync`. |

The five answers stay woven in, never as labelled Q&A: worth lives in Home and Deals (value with receipts, per currency), power in the deal detail grid and People, first moves in Moves (and Do first on Home), what goes wrong in the Risk column and deal detail, unknowns in deal detail and Home. Moves holds the approve flow: Review note opens an editable inline preview, then one explicit Approve and save to CRM button (disabled with a reason while the MCP is unreachable) with queued/saved/failed status. Feeds the backend has not published (people, activity, notes) show a calm "not available yet" state.

### Home (original single page)

One page, top to bottom.

| Block | Contents | Visible by default |
|---|---|---|
| Freshness bar (sticky) | "As of" time, live or unreachable state | Yes |
| What Changed | Up to three headline moves since last visit, "See all N" | Yes |
| Account column A, Account column B (side by side) | See next table | Lead line and Money strip open; rest one line each |
| Draft note (inline) | The drafted note in its card, with Approve and save or Discard | On demand |

Per account, fixed order, plain-word labels (no question wording):

| Block label | What it holds | Open by default |
|---|---|---|
| (no label) Lead line | The single most important thing for this account right now | Yes |
| Worth | Four band chips with per-currency totals | Yes |
| Do first | Three ranked moves, each: action, owner, date, deal | Three single lines |
| Slipping | Risks, each with the date it turns red | Count and top item |
| People | Per deal: decides, pays, uses, could block, and where each stands | Collapsed |
| Not known | Gaps, what each puts at stake, who could fill it | Count and top gap |

### Where each of the five lives (judges' check)

| Substance | Where it appears with no click | One tap deeper |
|---|---|---|
| Worth (book value) | Money strip: On contract, Backed upside, Unbacked, Unpriced, per currency | Per deal rows with the receipt (file or person) behind each value; Unbacked and Unpriced shown apart; claims beside later facts |
| Power (who holds it) | The lead line names the person or gap when it is the main point; People row shows count of deals with a gap | Per deal grid: decides, pays, uses, could block; standing of each; "not on file" where empty |
| First moves | Do first: three ranked single lines, owner and date visible | Why (the risk or gap it comes from), receipts, the draft, Approve and save |
| Going wrong | Lead line when a red risk exists; Slipping shows count and the top item with its "turns red on" date | Full list, red first, then amber, each with the deal it threatens and receipts |
| Not known | Not known shows count and the top gap | Full list ordered by value at stake, each with who could fill it |

What Changed sits above all of this and links into the same rows (an item scrolls to and opens its row).

## Voice and Tone

Plain, short, specific. Names and numbers, not adjectives. [ASSUMPTION: whole table.]

| Do | Don't |
|---|---|
| "Renewal ends 31 Jan and nobody has signed off on price." | "Warning: high risk detected!" |
| "Not on file. Ask Neel Sharma." (only when a record names the person) | "Information unavailable." |
| "Turns red 30 Nov" | "Urgent" |
| "Claim, nothing on file backs it" | "Unverified insight" |
| "MCP unreachable. Showing data from 09:42." | "Something went wrong." |
| "Saved to CRM at 10:03" | "Success!" |

Never invent a name. If no record names who could fill a gap, say "not on file".

## Component Patterns

Visual specs are in `DESIGN.md.Components`.

| Component | Behaviour |
|---|---|
| Lead line | Computed, not written: red renewal risk if any, else the top-ranked move. One sentence from a template filled with record data. Tapping the receipt row beneath it opens detail; the sentence itself is not a link. |
| Money strip | Four chips per account. Tap a chip to expand its deals in place. Totals per currency, never summed across accounts. Display-currency bracket only after a plan rate is set (story 2.3); the plan rate control shows who set it and when. |
| Disclosure row | One-line summary, chevron, expands in place. Several can be open; opening one never closes another. [ASSUMPTION.] |
| Receipt chip | Shows the real record id. Tap copies; popover shows the fact id, the paperwork record and its kind. An id that is not in the current data is not rendered; the figure is shown as "no receipt" and the deal moves to Unbacked or Unpriced per ADR 0001. |
| Power grid | Rows: decides, pays, uses, could block. Columns: person, standing. Empty cell reads "not on file". |
| Move row | Action, owner, due date inside the deal's deadline, the deal it moves. Tap opens the draft. |
| Draft card | Template filled only from record data and receipts. Editable text is not offered in v1 [ASSUMPTION]. |

## State Patterns

| State | Treatment |
|---|---|
| First load | Skeleton matching the two columns. Resolves when `/api/changes` and the answers load. |
| Live, current | Freshness bar: "As of 09:42 · live". |
| Refreshing | No spinner, no layout shift. The as-of time ticks forward quietly. |
| New data arrived | Changed items take the `{colors.changed-wash}` tint and a "New" or "Moved" tag; the What Changed strip updates. The tint fades after the user next interacts. Nothing the user has opened closes or moves. |
| MCP unreachable | Freshness bar turns to the stale treatment with last-fetched time. Data stays visible and is labelled as old. Approve and save is disabled with the reason. Never shown as current. |
| Partial data | A block with no data says what is missing and why ("No flight rows for Plant 12 in Aug"). |
| Empty block | One honest sentence, never a blank, never green all-clear. |
| Save pending | Draft card shows Pending, then "Sent at 10:03". Failure shows the error and keeps the draft. |
| Rate limited | The MCP is one call a minute (ADR 0002); the page reads from the app's last good fetch and says when that was. |

## Interaction Primitives

- **Self-refresh.** The page polls `GET /api/changes` on an interval and re-renders only what changed. No reload. [DECIDED by owner: 30s interval; the MCP itself is polled by the backend at one call a minute.] Conflict to resolve in architecture: ADR 0003 and story 1.5 describe Server-Sent Events on one process; this spine specifies polling because the target is a Vercel project. If SSE stays, the behaviour above is unchanged.
- **Disclosure** open and close: 150ms ease-out height and opacity. No animation on polling refresh. [ASSUMPTION; follows the rule that frequent updates do not animate.]
- **Write-back.** Nothing is written without an explicit click on Approve and save. The draft sits inline in its card and shows the exact note text, its kind (`next_step`, `task` or `risk`) and the account right beside the button. One click on the button saves; there is no confirm dialog and no keyboard shortcut submits. [DECIDED by owner: inline approve button.] The button is disabled while the MCP is unreachable.
- **Last visit.** Kept per browser (story 7.2). What Changed compares against it.
- **Keyboard.** Tab order follows reading order; Space and Enter toggle disclosures; Escape closes popovers.
- **Copy.** Any receipt chip copies its id.

## Accessibility Floor

- Every colour meaning has a text or icon twin (band names, risk text).
- Text contrast at least 4.5:1 against its surface; verify the band and risk colours in `DESIGN.md` at implementation. [ASSUMPTION: unverified.]
- Disclosures are real buttons with `aria-expanded`; popovers trap focus and return it to the trigger.
- Live updates announce through one polite live region: "2 items changed" only, never the whole page.
- Freshness bar is text, not colour alone.
- Respect `prefers-reduced-motion`: disclosures switch with no animation.
- Touch targets at least 44px; no horizontal scroll at 360px.

## Responsive & Platform

Below 1024px the columns stack, A then B, each complete. The sticky freshness bar stays. What Changed collapses to a count that opens inline. Desktop-only hover tips are not relied on.

## Key Flows

**Monday opening (Maya, newly inherited CSM, 08:50).** Maya opens the page. Nothing to click. She reads the bar: as of 08:49. What Changed says B's renewal is now red. In column B the lead line is that renewal, with its date and the missing sign-off. In column A the lead line says the renewal is amber and turns red on 30 Nov. Climax: in under ten seconds she knows which account burns first and why. She taps Do first on B, sees the top move with owner and date, and opens its draft.

**Approving a note.** Maya reads the draft, sees every figure carries a receipt chip, presses Approve and save beside the exact text and kind. The card shows Pending, then "Sent at 10:03". Climax: she can see the exact words that reached the CRM and when.

**Checking a number.** A judge taps the On contract chip. The deal rows open with the file or person behind each value. They tap a receipt id: it names the paperwork record. Unbacked sits apart, and the claim is struck through where a later verified fact exists. Climax: the number holds up under questioning.

**Data goes stale.** The MCP stops answering. The bar turns to stale with the last-fetched time, Approve is disabled, and the figures stay put but marked old. Climax: nothing pretends to be current.

## Open items

- [ASSUMPTION] Items throughout are unconfirmed visual or behavioural choices.
- Poll versus SSE (see Interaction Primitives).
- Lead line wording per condition is not yet drafted; needs templates tied to record data.
- Plan-rate control placement is not specified in the inputs.
