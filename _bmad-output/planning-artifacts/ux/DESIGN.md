---
name: Book Tool
description: A calm, evidence-first reading surface for a CSM who just inherited two accounts. Looks like a well-edited briefing, not a dashboard.
status: draft
updated: 2026-11-14
sources:
  - CLAUDE.md
  - CONTEXT.md
  - docs/adr/0001-evidence-decides-the-band.md
  - _bmad-output/planning-artifacts/epics.md
colors:
  surface: '#FAF8F4'
  surface-raised: '#FFFFFF'
  ink: '#1D2330'
  ink-muted: '#5B6372'
  line: '#E4DFD6'
  accent: '#27478F'
  band-contract: '#1F5C4A'
  band-backed: '#2F6FA8'
  band-unbacked: '#9A5B13'
  band-unpriced: '#6B6F7A'
  risk-red: '#B3261E'
  risk-amber: '#B26A00'
  changed-wash: '#FFF3C4'
  stale: '#8A5A00'
typography:
  display:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
  title:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
  body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
  label:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 600
    letterSpacing: 0.04em
  receipt:
    fontFamily: ui-monospace, 'JetBrains Mono', monospace
    fontSize: 12px
    fontWeight: 500
rounded:
  sm: 4px
  md: 8px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '6': 24px
  '8': 32px
  gutter: 16px
components:
  account-column:
    backgroundColor: '{colors.surface}'
    padding: '{spacing.4}'
  lead-card:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.ink}'
    typography: '{typography.display}'
    rounded: '{rounded.md}'
    padding: '{spacing.6}'
  band-chip:
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '{spacing.1}'
  receipt-chip:
    typography: '{typography.receipt}'
    textColor: '{colors.ink-muted}'
    rounded: '{rounded.sm}'
  disclosure-row:
    typography: '{typography.body}'
    padding: '{spacing.3}'
  changed-item:
    backgroundColor: '{colors.changed-wash}'
  freshness-bar:
    typography: '{typography.label}'
    textColor: '{colors.ink-muted}'
  freshness-bar-stale:
    textColor: '{colors.stale}'
---

# Book Tool: Visual Identity

All values below that the inputs do not state are `[ASSUMPTION]` and wait for the owner to confirm. The inputs state only: bands, receipts, "as of", per-currency display, no data-dump, not text-heavy.

## Brand & Style

A quiet, editorial briefing. One strong sentence per account, then evidence you can open. The reader should feel handed a well-prepared note, not a control panel. [ASSUMPTION: editorial-calm over dashboard-dense; no logos, illustration or hero imagery.]

Density: low. Few things visible, each with room. Detail lives one tap deeper. A judge scanning the page in ten seconds should read two lead sentences and four numbers.

## Colors

Warm-neutral light surface with one cool accent. [ASSUMPTION: whole palette.]

- `{colors.surface}` page, `{colors.surface-raised}` cards, `{colors.ink}` text, `{colors.ink-muted}` secondary text and receipts, `{colors.line}` hairlines.
- `{colors.accent}` for links, focus ring and the single primary action (Approve and save). Used nowhere else.
- Band colours: `{colors.band-contract}` On contract, `{colors.band-backed}` Backed upside, `{colors.band-unbacked}` Unbacked, `{colors.band-unpriced}` Unpriced. Each is always paired with its band name in text. Colour never carries the band alone.
- `{colors.risk-red}` and `{colors.risk-amber}` only for risk flags with a "turns red on" date. Never on money.
- `{colors.changed-wash}` marks an item that changed since last visit; paired with a "New" or "Moved" text tag.
- `{colors.stale}` for the freshness bar when the MCP is unreachable or the data is old.
- Not used: green for "good" status. Nothing is ever shown as all-clear green (CLAUDE.md, "Everything marked green" is weak).

## Typography

Inter for text, a monospace for ids. [ASSUMPTION.] `{typography.display}` is reserved for the one lead line per account and the money figures in the strip. `{typography.receipt}` is used for every record id so ids look like ids and can be copied exactly. Minimum size 12px, body 15px. Tabular numerals on all money.

## Layout & Spacing

Single scroll page. Top: freshness bar and What Changed. Below: two account columns of equal width on `>=1024px`, stacked (A then B) below that. [ASSUMPTION: side by side so both accounts are visible with no click and currencies sit side by side.] Spacing steps use `{spacing.4}` inside cards and `{spacing.6}` between blocks; page gutter `{spacing.gutter}`. Content max width 1200px. No horizontal page scroll at 360px.

Order inside each column, fixed so a reader learns it once: Lead line, Money strip, First moves, Slipping, People, Not known. Only Lead line and Money strip are open by default (the first moves show as three single lines).

## Elevation & Depth

Flat. Cards separate by `{colors.line}` hairline, not shadow. One exception: the approve dialog uses a single soft shadow and a scrim. [ASSUMPTION.]

## Shapes

`{rounded.md}` cards and dialog, `{rounded.sm}` receipt chips, `{rounded.full}` band chips. No other radii.

## Components

- **Freshness bar** (`freshness-bar`): one line, top. "As of 14 Nov 09:42 · live". When unreachable: switches to `freshness-bar-stale`, "MCP unreachable. Showing data last fetched 09:42." Always visible, never hidden by scroll (sticky). [ASSUMPTION: sticky.]
- **What Changed strip**: a single row of at most three headline moves ("B renewal now red", "1 new signal on A"), plus "See all N". Items use `changed-item` wash.
- **Lead card** (`lead-card`): one sentence at `{typography.display}`, the deal it concerns as a small label above, one receipt chip row below. The sentence is the most important thing for that account right now (red renewal risk first, else the top move).
- **Money strip**: four band chips in a row per account, each with a native-currency total (£ for A, € for B) and a deal count. Unbacked and Unpriced render visually apart (dashed outline, a gap before them) and are never part of a combined figure. A bracketed converted figure appears only when a plan rate is set, with who and when beside it.
- **Band chip** (`band-chip`): filled for On contract and Backed upside, outlined for Unbacked, dashed for Unpriced. Text label always present.
- **Disclosure row** (`disclosure-row`): one line summary, chevron, expands in place to detail and receipts.
- **Receipt chip** (`receipt-chip`): monospace id, for example `b_idle` or `emails/2026-10-08_finance_mailbox.txt`. Tap copies; long paths truncate in the middle with the full id in a popover.
- **Risk tag**: "Turns red 30 Nov" in `{colors.risk-amber}` or red text with a flag icon.
- **Claim marker**: a claim fact is struck through only when a verified fact backs the later version, as in the epics; otherwise labelled "claim, nothing on file backs it".
- **Draft card**: a bordered card holding the draft text, a primary `{colors.accent}` button "Approve and save", and a secondary "Discard". State line shows Pending, then Sent at time.

## Do's and Don'ts

- Do show one lead sentence per account before anything else.
- Do pair every colour with a word or icon.
- Do show a native currency symbol on every figure. Don't show a bare number.
- Do show Unbacked and Unpriced apart. Don't add them to any total.
- Don't use question headings, tabs named after questions, or a Q&A layout.
- Don't render a long table at first sight; tables live inside disclosures.
- Don't show a record id that is not on the current record set. Never abbreviate an id.
- Don't use green as an all-clear.
