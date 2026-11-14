- source_spec: none
  summary: Deploy the backend as one always-on, single-worker process with a public URL (story 1.6).
  evidence: Split from "build a usable version of all priorities"; hosting is a separate shippable goal after live sync (1.1–1.4) works.
- source_spec: none
  summary: The default answers: one endpoint (`/api/book`) that returns Q1–Q5 for both accounts with receipts, computed from the latest snapshots by plain functions. No query box, no chat, no separate engine product (Phase B, stories 2.1, 2.2, 2.4, 3.1, 3.2, 4.1, 5.1, 6.1, 6.3 backend, 7.1).
  evidence: Split from the same intent; it depends on live sync's snapshot store, so it comes after it.
- source_spec: none
  summary: Home page that opens on the five answers for both accounts (nothing to ask or click first), with the What Changed briefing and live refresh (Phase C, stories 1.5, 2.3, 3.3, 4.2, 5.2, 6.2, 7.2), designed with the design-phase skills.
  evidence: Split from the same intent; the user asked to finish the backend before any design work.
- source_spec: none
  summary: Default answers slice 2: Q2 who holds the power per deal (stories 3.1, 3.2) in /api/book.
  evidence: Split from the default-answers goal; one slice per question, user chose this on 2026-11-14.
- source_spec: none
  summary: Default answers slice 3: Q4 what is about to go wrong (story 4.1).
  evidence: Same split.
- source_spec: none
  summary: Default answers slice 4: Q3 first three moves, ranked, with owner and date (story 6.1).
  evidence: Same split; depends on Q1, Q2 and Q4 output.
- source_spec: none
  summary: Default answers slice 5: Q5 unknowns with why it matters and who to ask (story 5.1), plus the What Changed briefing data (7.1).
  evidence: Same split.
- source_spec: none
  summary: Write-back: approve-then-write note endpoint via the queue's write tier (story 6.3).
  evidence: Same split; depends on a first real write_note response shape.
