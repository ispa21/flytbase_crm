# Book Tool

A tool for a Customer Success Manager who has just inherited a book of accounts. It answers a few fixed questions about that book, and every answer shows the evidence behind it.

## The book

**Book**:
Every account the CSM owns and every deal on them, as one view.
_Avoid_: Portfolio, pipeline

**Account**:
A customer organisation the CSM owns, with its own contract, currency and people.
_Avoid_: Customer, client

**Deal**:
One way an account could bring revenue: a renewal, an expansion or a new sale.
_Avoid_: Opportunity, lead

**Offer**:
A priced proposal FlytBase has made to one person on an account, which they may take or decline.
_Avoid_: Quote, upsell

## Evidence

**Fact**:
One thing a named person said or a file shows, with its status.
_Avoid_: Insight, data point

**Claim**:
A fact stated with confidence and not checked. It may be wrong.

**Told**:
A fact a person said plainly and that nobody has checked against a file.

**Verified**:
A fact backed by a file the CSM holds.

**Receipt**:
The fact id and the paperwork record shown next to any figure or statement, so a reader can check it.
_Avoid_: Source, citation, proof

**Paperwork**:
Everything FlytBase had on file for an account before the handover: contract, calls, emails, tickets, flights, logins, invoices.
_Avoid_: Records, history, docs

**Signal**:
Something that has happened on an account since the handover.
_Avoid_: Event, alert, update

## Value bands

**On contract**:
Revenue under a signed contract on file. It is documented, but not safe until renewed.
_Avoid_: Committed, booked, ARR

**Backed upside**:
Possible extra revenue that is not signed but is on file: an open offer at our price, or a deal with no open blocker and verified evidence.
_Avoid_: Pipeline, forecast

**Unbacked**:
Value that rests only on what someone claimed or said. It is shown apart and never added to the other bands.
_Avoid_: Upside, stretch, best case

**Renewal risk**:
The flag on an on-contract deal whose term ends without automatic renewal.

**Unpriced**:
A deal with no value yet. It counts toward no band total and is itself a blind spot.

**Contradiction**:
A claim that a later fact, paperwork record or signal shows to be wrong. Both stay visible, with the claim struck through.
_Avoid_: Correction, conflict

## Money

**Native currency**:
The currency an account's contract is written in. Figures in different native currencies are never summed.

**Display currency**:
The one currency the user picks for bracketed, converted figures shown beside native ones. USD by default, INR available.

**Plan rate**:
The fixed exchange rate, with the date it was set, used for every converted figure until someone changes it.
_Avoid_: FX rate, live rate, spot rate

## Views

**What Changed briefing**:
The opening view, listing what has moved in the book since the user last looked, with the account and deal order re-ranked.
_Avoid_: Digest, summary, feed

**Saved note**:
A note, task, risk or next step written back to the game's record, only after the user approves that write.
_Avoid_: Log, comment
