- source_spec: none
  summary: Deploy the backend as one always-on, single-worker process with a public URL (story 1.6).
  evidence: Split from "build a usable version of all priorities"; hosting is a separate shippable goal after live sync (1.1–1.4) works.
- source_spec: none
  summary: The default answers: one endpoint (`/api/book`) that returns Q1–Q5 for both accounts with receipts, computed from the latest snapshots by plain functions. No query box, no chat, no separate engine product (Phase B, stories 2.1, 2.2, 2.4, 3.1, 3.2, 4.1, 5.1, 6.1, 6.3 backend, 7.1).
  evidence: Split from the same intent; it depends on live sync's snapshot store, so it comes after it.
- source_spec: none
  summary: Home page that opens on the five answers for both accounts (nothing to ask or click first), with the What Changed briefing and live refresh (Phase C, stories 1.5, 2.3, 3.3, 4.2, 5.2, 6.2, 7.2), designed with the design-phase skills.
  evidence: Split from the same intent; the user asked to finish the backend before any design work.
