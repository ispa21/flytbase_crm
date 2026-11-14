# Evidence decides a deal's band, by a rule a machine can apply

Each value in the book goes into one band by a fixed rule, so the band can be recomputed whenever new data arrives:

| Band | Rule |
|---|---|
| On contract | A renewal whose contract is in the paperwork (`contract.txt`, `profile.json` renewal). It always carries a renewal-risk flag. |
| Backed upside | An open offer (a documented FlytBase proposal at our price), **or** a priced deal with no open blocker and at least one verified fact or file in its evidence. |
| Unbacked | A priced deal with an open blocker, or whose evidence holds no verified fact or file. Also deals named only in paperwork or by a person, with no value. |
| Unpriced | A deal with no value yet. It counts toward no total and is a blind spot. |

An open blocker is the game's own statement that a value is not yet backed. For example, the blocker on `b_sister` reads "Every number rests on an unverified spreadsheet". When a blocker clears, the deal moves up a band by itself, and the move shows in What Changed. Declined offers are left out of the book. Totals are kept per currency and never added across currencies.

## Consequences

- Deals that sit in Unbacked today: `b_idle` €180k and `b_sister` €1.2M (both blocked), plus the tender and the stadium (no value; `deal_history.json`).
- Claims are never enough to back a value. A fact with status `claim` is shown marked as a claim, never as a source.
