# Account Quest MCP: data contract

Source: recorded fixtures only (`mcp-cache/`, recorded 2026-11-14). No live calls were made to write this. Fixtures are for tests; the app never reads them (ADR 0003). Anything not in a fixture is marked **not determinable from fixtures**.

Citation shorthand used below:

| Shorthand | Means | File |
|---|---|---|
| `MA` | `get_my_accounts` payload | `mcp-cache/clean/my_accounts.json` |
| `A:<path>` / `B:<path>` | `get_all_paperwork(account)` record with that `path` | `mcp-cache/pack/<acc>/<path>` (byte-identical to the payload record) |
| `F:plant` | `get_file(id=flight_log_by_plant)` CSV text | `mcp-cache/file_flight_log_by_plant.json` (copy: `pack/B/files_flight_log_by_plant.csv`) |
| `F:force` | `get_file(id=flight_log_force_month)` CSV text | `mcp-cache/file_flight_log_force_month.json` (copy: `pack/A/files_flight_log_force_month.csv`) |
| `SIG`, `WHO2`, `MA2` | the second, live-check fetch of `get_signals`, `whoami` and `get_my_accounts` | `mcp-cache/check2/{signals,whoami,my_accounts}.json` |
| `L<n>` | line n of a CSV, header = L1 | |

`pack/A/files_flight_log_force_month.csv` and `pack/B/files_flight_log_by_plant.csv` are **not** paperwork records. They are copies of the `get_file` output placed in the pack folder.

---

## 1. Envelope and limits

### Unwrap

```python
resp = json.loads(body)                    # {"jsonrpc":"2.0","id":N,"result":{...}}
if "error" in resp: ...                    # JSON-RPC error: NEVER OBSERVED
res = resp["result"]
if res.get("isError"): ...                 # tool error: NEVER OBSERVED (all fixtures have isError=false)
payload = json.loads(res["content"][0]["text"])
```

- Every `tools/call` fixture has `result = {"content":[{"type":"text","text":"<JSON string>"}],"isError":false}`, with exactly one content item of type `text`. There is no `structuredContent`. The `text` is always a JSON object, never a bare array.
- `tools/list` is not wrapped: `result.tools[]` holds `{name,title,description,inputSchema,annotations}`. There is no `outputSchema` and no `nextCursor`.
- `id` is 1 in every call fixture and 2 in `tools_list.json`. The requests themselves were not recorded.
- `clean/*.json` equals `json.loads(content[0].text)` for every file. This was checked for all 8 files that have a clean copy.

### Not known (never observed)

- The rate-limit error. Its shape is not known: whether it is a JSON-RPC `error`, `isError:true` with a text message, or an HTTP status. Nor is it known whether it carries a retry-after.
- Any `isError:true` payload, and any JSON-RPC `error` object (code or message).
- HTTP transport details (headers, session id, SSE framing vs plain JSON). The fixtures hold only the decoded JSON body.
- Response shapes for `list_paperwork`, `get_paperwork_record`, `search_paperwork`, `list_notes` and `write_note`. None of these was recorded.

### Stated limits (from the tool descriptions in `tools_list.json`, not observed)

- `get_all_paperwork`: "calls are limited to one a minute".
- `get_signals`: "One call a minute per token, so save what you fetch."
- `write_note`: `text` "up to 4,000 characters".
- `search_paperwork`: `q` "at least two characters".
- ADR 0002 says writes count against the limit too. That comes from the ADR, not from a fixture.

### Tools (`tools_list.json`, 14 tools)

`openWorldHint` is `false` on every tool. No other hints (destructive, idempotent) are present.

| Tool | Args (required*) | readOnlyHint | Fixture |
|---|---|---|---|
| `whoami` | none | true | `whoami.json`, `WHO2` |
| `get_my_accounts` | none | true | `my_accounts.json`, `MA2` |
| `get_file` | `id`* string | true | `file_flight_log_by_plant.json`, `file_flight_log_force_month.json` |
| `list_paperwork` | `account` enum A,B (optional) | true | none |
| `get_paperwork_record` | `account`* enum A,B; `path`* string | true | none ("CSV files also come back as rows, JSON as data") |
| `get_all_paperwork` | `account`* enum A,B | true | `paperwork_A.json`, `paperwork_B.json` |
| `search_paperwork` | `q`* string; `account` enum A,B | true | none |
| `get_feature_requests` | none | true | `feature_requests.json` |
| `get_release_notes` | none | true | `release_notes.json` |
| `get_flytbase_team` | none | true | `team.json` |
| `get_signals` | none | true | `SIG` only |
| `get_data_format` | none | true | `data_format.json` |
| `list_notes` | none | true | none |
| `write_note` | `text`*; `account` enum A,B; `kind` enum note,task,risk,next_step (default note); `title` | **false** | none |

The `account` enum is hard-coded to `A`,`B` in every input schema. `whoami.new_accounts` could name a new account, but whether the enum would then grow is not determinable from fixtures.

---

## 2. Per tool

### 2.1 `whoami`

Top keys: `player_id, your_morning_over, new_accounts, pack, signals, paths`.

| Field | Type | Seen | Note |
|---|---|---|---|
| `player_id` | string (UUID) | `4723e743-…` | equals `MA.player` |
| `your_morning_over` | bool | true | |
| `new_accounts` | array | `[]` | element shape not determinable |
| `pack[]` | `{account:str, open:bool}` | A/true, B/true | |
| `signals` | int | 0 (`whoami.json`), 2 (`WHO2`) | count of signals. Equals `len(SIG.signals)` |
| `paths` | string[14] | `/me`, `/export`, `/files/:id`, `/pack`, `/pack/team`, `/pack/:account`, `/pack/:account/all`, `/pack/:account/<path>`, `/pack/search?q=`, `/pack/feature-requests`, `/pack/release-notes`, `/signals`, `/schema`, `/notes (GET, POST)` | an HTTP surface; how to call it is not determinable |

`WHO2` differs from `whoami.json` only in `signals` (0 → 2).

### 2.2 `get_my_accounts` (MA)

Top keys: `format, player, exported_at, minute, world_closed, accounts[2], files[2]`.

| Field | Type | Seen |
|---|---|---|
| `format` | string const | `account-quest-v2-export/1` |
| `player` | string | = `whoami.player_id` |
| `exported_at` | ISO-8601 ms Z | `2026-11-14T08:57:08.876Z`. **Changes on every call**: it was `09:34:34.409Z` in `MA2` with identical content |
| `minute` | int | 71 (the same in `MA2`, so it is frozen and not a clock) |
| `world_closed` | bool | true |

**`accounts[]`**: `id` ("A","B"), `name`, `official_story` (string, "Unverified"), `stakeholders[]`, `facts[]`, `opportunities[]`, `offers[]`, `deadlines[]`. **There is no currency field.** Take the currency from `X:profile.json.currency`.

**`stakeholders[]`** (A 2, B 4):

| Field | Type | Null | Values seen | Example |
|---|---|---|---|---|
| `id` | string, snake_case full name | no | rhys_calder, karen_mbeki, stefan_roy, beatriz_alonso, nadia_rahman, owen_fitch | `rhys_calder` |
| `name` | string (display name; it is the join key used by other fields) | no | | `Insp. Karen Mbeki` |
| `role` | string | no | | `Group finance controller` |
| `relationship` | enum | no | warm, neutral, guarded (the schema also allows `ally`, not seen) | `guarded` (nadia_rahman) |
| `available` | bool | no | true ×6 | |

**`facts[]`** (A 9, B 15; claim 5, told 17, verified 2):

| Field | Type | Null/missing | Values | Example |
|---|---|---|---|---|
| `id` | string `<initials>_<topic>_<n>` | no | 24 unique | `rc_appetite_0` |
| `text` | string | no | | |
| `said_by` | string = a stakeholder `name` (or a team name, see §4) | no | | `Rhys Calder` |
| `status` | enum claim, told, verified | no | all 3 | `claim` |
| `verified_by` | string, a file id | missing unless verified (22/24 missing) | flight_log_force_month, flight_log_by_plant | |
| `learned_at_minute` | int | no | 4..66 | 33 |

Claims: `rc_appetite_0`, `rc_stadium_0`, `rc_funding_0`, `sr_roll_0`, `sr_roi_0`. Verified: `km_usage_1`→flight_log_force_month and `sr_roll_2`→flight_log_by_plant. Topic stems with more than one fact: `rc_appetite` (0,2), `km_usage` (0,1), `rc_stadium` (0,3), `sr_roll` (0,2), `ba_use` (0,2). The `_n` suffixes are not contiguous, and what they mean is not documented.

**`opportunities[]`** (A 3, B 4):

| Field | Type | Null | Values seen | Example |
|---|---|---|---|---|
| `id` | string `<acc lowercase>_<slug>` | no | a_renewal, a_tarn, a_westmere, b_renewal, b_idle, b_insurance, b_sister | |
| `title` | string | no | | |
| `stage` | enum | no | identified ×4, qualified ×3 (the schema also allows cleared, agreed) | |
| `worth_up_to` | int or null | null ×4 (a_renewal, a_tarn, a_westmere, b_insurance) | 140000, 180000, 1200000 | `b_sister` 1200000 |
| `size` | null | null ×7 | (the schema allows base, big) | |
| `blocker` | `{text, status}` or null | null ×4 | status `open` ×3 (the schema also allows `cleared`) | b_renewal "Finance cannot verify the savings the programme claims" |
| `evidence` | string[] | no | fact ids and file ids mixed (§3) | |
| `deadline` | object or null | null ×6 | b_idle only: `{text, soon:false, passed:false, met:false, moves_left:null}`. **No `minute`, no date**. `soon`, `met` and `moves_left` are not in the schema | |

**`offers[]`** (A 2, B 3): `id` (same pattern as opportunities), `title`, `value` int, `pitch_to` (a stakeholder **name**, not an id), `status` (open ×2: a_training 45000, b_reporting 70000; declined ×3: a_priority_support 60000, b_priority_support 50000, b_more_plants 160000. The schema also allows `won`).

**`deadlines[]`** (A 0, B 1): `{text, passed:false}`. `minute` is **missing although the schema requires it**. There is no id. The text is identical to `b_idle.deadline.text`.

**`files[]`** (2): `{id, title, path, account}`. Values: `flight_log_by_plant`, "Flight log by plant", `files/flight_log_by_plant.csv`, B; and `flight_log_force_month`, "Flight log force month", `files/flight_log_force_month.csv`, A.

### 2.3 `get_data_format`

A JSON Schema (draft 2020-12, `$id account-quest/v2_export.schema.json`) of MA. It contains no `additionalProperties` keyword, so extra fields (such as the deadline's `soon`) are allowed. Required fields: top `format, player, exported_at, minute, world_closed, accounts, files`; account `id, name, stakeholders, facts, opportunities, deadlines` (`offers` is not required); stakeholder `id,name,role,relationship`; fact `id,text,said_by,status,learned_at_minute`; opportunity `id,title,stage,evidence`; offer `id,title,value,status`; account deadline `text,minute`; file `id,title,path`. The only violation in the fixtures is `MA.accounts[B].deadlines[0].minute`, which is missing.

### 2.4 `get_file`

Payload: `{id, name, text}`. `name` is the basename of `MA.files[].path` (`flight_log_by_plant.csv`). `text` is a CSV with `\n` line endings and a trailing newline.

| File | Header | Rows |
|---|---|---|
| `F:plant` (B) | `plant,month,dock_installed,patrol_flights,test_flights,alerts_raised` | 90 |
| `F:force` (A) | `force,month,docks_installed,docks_with_live_flights,live_missions,training_flights,notes` | 25 |

Values seen: `dock_installed` yes ×54, Y ×30, no ×6. `notes`: "", awaiting sign-off, training only, trg, "re-sent, see above". Numbers are strings, and some cells are blank (§4).

### 2.5 `get_all_paperwork(account)`

Payload: `{account:"A"|"B", records[]}`. Each record is `{path, kind, text}` or `{path, kind, data}`, never both. CSV kinds come back as `text` only: there is no `rows` key in this tool. A has 35 records and B has 30. Both accounts have the same 16 kinds, the same JSON key sets and the same CSV headers. `path` is unique only within an account: 14 paths exist in both.

| kind | text/data | Path(s) | A | B |
|---|---|---|---|---|
| call | text | `calls/<YYYY-MM-DD>_<slug>.txt` | 16 | 12 |
| calls_index | data | `calls_index.json` | 1 | 1 |
| contract | text | `contract.txt` | 1 | 1 |
| deal_history | data | `deal_history.json` | 1 | 1 |
| device_events | text (CSV) | `device_events.csv` | 1 | 1 |
| devices | data | `devices.json` | 1 | 1 |
| email | text | `emails/<YYYY-MM-DD>_<slug>.txt` | 5 | 4 |
| flights | text (CSV) | `flights.csv` | 1 | 1 |
| internal_notes | data | `internal_notes.json` | 1 | 1 |
| invoices | data | `invoices.json` | 1 | 1 |
| mail_log | data | `mail_log.json` | 1 | 1 |
| profile | data | `profile.json` | 1 | 1 |
| requests | text (CSV) | `requests.csv` | 1 | 1 |
| tickets | data | `tickets.json` | 1 | 1 |
| usage | text (CSV) | `usage_weekly.csv` | 1 | 1 |
| users | data | `users.json` | 1 | 1 |

#### Text kinds

- **call**: two layouts.
  - Notes (A 8, B 7): line 1 `<TITLE>: NOTES`, then `Date: D Month YYYY`, `Written up by: …`, `Present for the customer: …`, `Present for FlytBase: …`, then `- ` bullet sections (Background, Actions, Left open…).
  - Transcript (A 8, B 5): line 1 `CALL TRANSCRIPT (auto-recorded, tidied)`, then `Date: D Month YYYY`, `On the call: …`, then `Speaker: text` lines and a closing `Follow-ups noted by Sam` list.
  - Status markers in parentheses: "(Not received.)", "(No further note.)", "(No reply on file.)", "(Not sent.)", "(Not done before the handover.)".
- **email**: a header block `From:`, `To:`, `Date: D Month YYYY`, `Subject:`, then the body. Replies follow after a `---` separator. An editorial trailer may follow in square brackets: A `emails/2026-08-11_karen_batteries.txt` "[No reply on file.]"; B `emails/2026-07-16_stefan_savings.txt` "[No detail received.]"; B `emails/2026-09-18_beatriz_alerts.txt` "[No reply. Nobody asked why she wanted to change it.]"; B `emails/2026-10-08_finance_mailbox.txt` "[Unsigned. No reply on file.]".
- **contract**: "ORDER FORM SUMMARY (customer success copy)", then `Customer:`, `Signed: <date>, by <whom>`, `Currency: <words>`, then sections (What was ordered / Price and term / Invoicing / Support / [Data] / Not covered).
  - A: signed "20 January 2026, by the alliance office" (no person); "pounds sterling"; 350,000 a year; term 1 March 2026 to 28 February 2027; no automatic renewal; four invoices, split held in Schedule 2.
  - B: signed "15 January 2026, by Stefan Roy, group head of security"; "euros"; 140,000; term 1 February 2026 to 31 January 2027; no automatic renewal; one invoice a year to group security.

#### CSV kinds (header, then rows A / B)

| kind | Header | A | B | Column values seen |
|---|---|---|---|---|
| flights | `flight_id,date,start_time,dock_id,duration_min,mode,result,note` | 842 | 655 | id `ECPA-F00001..00842` / `AD-F00001..00655`, contiguous, sorted by date and time. date 2026-05-01..2026-10-31. start_time HH:MM. duration_min 4–28 / 4–24. mode manual, scheduled. result completed, returned_early. note "", low battery, operator recall, wind (A); "", wind (B) |
| usage | `week_start,dock_id,flights,days_online` | 945 (27 wk × 35) | 378 (27 × 14) | week_start = Mondays 2026-04-27..2026-10-26. flights 0–6 / 0–7. days_online 7, plus A ECPA-D07 2026-07-13 = 2 and B AD-01 2026-09-07..10-05 = 3,2,4,5,5 |
| device_events | `date,time,dock_id,event,detail` | 272 | 511 | events A: software_update 105, connection_lost 57, connection_restored 57, battery_health_warning 45, aircraft_removed_for_maintenance 2, aircraft_returned 2, lid_sensor_fault 1, offline 1, engineer_visit 1, back_online 1. Events B: connection_lost 229, connection_restored 229, software_update 42, offline 5, back_online 5, update_pending 1. detail values: "", "No connection to the dock", "Aircraft battery below expected capacity", "Ticket FB-10577", "Lid sensor replaced. Ticket FB-10577", "Aircraft away for scheduled maintenance", "Dock offline at update time", "Applied on reconnect". Range A 2026-05-01..11-04, B 2026-05-01..10-28 |
| requests | `request_id,opened,from,summary,status,owner,last_update,how_it_arrived` | 5 | 4 | request_id `FB-#####` or the literal `(none)`. status Open, Closed, Pending customer. owner "" (blank), Field team, Customer success, Support desk. how_it_arrived: Support ticket, Email to the CSM, Email and call. **Rows are not sorted by `opened`** |

No exact-duplicate rows exist in flights or device_events in either account.

#### JSON kinds (`data`)

**profile** (`data` keys: `account, name, currency, sector, what_they_bought, flytbase_side, contacts_on_file[], not_on_file[], renewal`)

| Field | Type | A | B |
|---|---|---|---|
| `currency` | ISO code | GBP | EUR |
| `flytbase_side.commercial_owner` | team id | achal_negi | achal_negi |
| `flytbase_side.csm[]` | `{who, from:YYYY-MM, to?:YYYY-MM}` | sam 2026-05→2026-11; `you` from 2026-11 (no `to`) | same |
| `contacts_on_file[]` | `{id,name,role,on_file_since:YYYY-MM,last_contact_before_handover:YYYY-MM-DD,note}` | rhys_calder (last contact 2026-10-30), karen_mbeki (2026-08-11) | stefan_roy (2026-10-13), beatriz_alonso (2026-09-20) |
| `not_on_file[]` | string[] | 4 items | 5 items |
| `renewal` | `{term_ends:YYYY-MM-DD, annual_value:int}` | 2027-02-28, 350000 | 2027-01-31, 140000 |

**deal_history**: `{account, currency, history[], on_file_as_open_at_handover[], note}`.
- `history[]` (11 / 11) is `{date, what, detail?, value?}`. `date` is mixed: YYYY-MM, YYYY-MM-DD, or "YYYY-MM to YYYY-MM". `detail` is missing once (A "Pilot ends"). `value` appears once per account: A 350000 ("Order form signed"), B 140000.
- `on_file_as_open_at_handover[]` (3 / 2) is `{what, value:int|null, due?:YYYY-MM-DD, basis}`. A: renewal 350000 due 2027-02-28; tender `null`; stadium `null`. B: renewal 140000 due 2027-01-31; sister company `null`.
- `note`: "Stages and values from this morning are in your own export, not here."

**calls_index**: `{note, calls[]}`, A 18 / B 13. Each call is `{date:YYYY-MM-DD (unique per account), title, record: notes|transcript|summary only, customer:str[], flytbase:str[], summary, actions:str[], path:str|null}`. `path` is null for the three "summary only" calls: A 2026-06-16 and 2026-09-23; B 2026-09-15.

**devices**: `{note, docks[]}`, A 35 / B 14. Each dock is `{dock_id, dock_serial "FBD…", aircraft_serial "FBA…", model ("Standard dock, 2025 model" for all), commissioned:YYYY-MM-DD, software ("2026.09" for all), last_seen_online ("2026-11-13" for all)}`. Note: "Which site each dock sits at is not in this record."

**internal_notes**: `{note, notes[]}`, 9 / 9. Each note is `{date, from, text}`. `from` values: Deal team, Onboarding lead (A), Rollout lead (B), Support desk, Sam, Neel Sharma.

**invoices**: `{currency, note, invoices[], first_year_total}`. Each invoice is `{number, issued, what, amount:int|null, status:"Paid", paid, note}`.
- A (5): INV-25-0914 pilot 30000; INV-26-0311..0314 parts 1–4 with **amount null** ("per Schedule 2"). `first_year_total` 350000.
- B (2): INV-25-1012 12000; INV-26-0204 128000. `first_year_total` 140000.

**mail_log**: `{note, mail[]}`, A 56 entries / 50 threads; B 42 / 39.
- Each entry is `{thread:"T###", kind: person|automatic, date, from, to, subject, body?, path?, note?}`.
- An entry has either `body` or (`path` plus `note:"Full text in the file."`). `note:"No reply on file."` marks unanswered mail: A T007; B T004, T005, T007, T008, T009.
- Entries are sorted by date. Thread numbers are **not** chronological.
- automatic/person counts: A 35/21, B 26/16.

**tickets**: `{note, tickets[]}`, A 15 / B 10. Each ticket is `{id:"FB-#####", opened, requester, subject, category, status, closed:date|null, assignee:str|null, first_response_hours:int|null, conversation[{date,from,text}]}`.
- status: A Closed 14, Open 1 (FB-10412, assignee **null**). B Closed 9, "Pending customer" 1 (FB-10903).
- category: accounts, hardware, request, how to, software, training, network.
- `first_response_hours` is null on FlytBase-raised tickets (A FB-10132, FB-10167; B FB-10085, FB-10151) and on FB-10412.

**users**: `{note, users[]}`, A 23 / B 17. Each user is `{user_id:"U##", name:str|null, role, created, last_sign_in:date|null, sign_ins_last_90_days:int}`.
- `name` is set only for contacts: A U01 Rhys Calder, U02 Insp. Karen Mbeki; B U01 Stefan Roy.
- `last_sign_in` is null for A U22 and U23.
- Roles: account administrator, unit administrator, view only (alliance programme office), operator (A); account administrator, "account administrator (group security, deputy; name not on file)", "alert recipient, view only (name not on file)", operator (B).

#### A vs B differences

| | A | B |
|---|---|---|
| Currency | GBP (`A:profile.json`, `A:deal_history.json`, `A:invoices.json`, contract "pounds sterling") | EUR (contract "euros") |
| Kinds | the same 16 kinds in both | |
| Signer | "the alliance office", no person | Stefan Roy |
| Invoices | 5. Four with null amounts. Billing contact "per Schedule 2" (not on file) | 2, all amounts present, billed to group security |
| Ticket open state | `Open`, assignee null (FB-10412) | `Pending customer` (FB-10903) |
| `get_file` | force by month (`F:force`) | plant by month (`F:plant`) |
| Docks / ids | 35 `ECPA-D01..35` | 14 `AD-01..14` |
| Docks with no flight in flights.csv | ECPA-D09, D11, D15, D18, D23, D25, D35 | AD-14 |
| Event vocabulary only in this account | battery_health_warning, lid_sensor_fault, engineer_visit, aircraft_removed_for_maintenance, aircraft_returned | update_pending |
| Nullable fields that hold nulls | invoices.amount, users.last_sign_in, tickets.assignee, deal_history.history.detail | none of those |

### 2.6 `get_flytbase_team`

`{note, people[7]}`. Each person is `{id, name, role}`. Ids: sam, neel_sharma, achal_negi, pranjal_suyal, srv, yashash_rao, support_desk.

### 2.7 `get_release_notes`

`{note, releases[3]}`. Each release is `{date:YYYY-MM-DD, version:"YYYY.MM", notes:str[]}`. Versions 2026.05 (2026-05-20), 2026.07 (2026-07-08) and 2026.09 (2026-09-16).

### 2.8 `get_feature_requests`

`{note, requests[31]}`. Each request is `{id:"FR-###" (001..031, none missing), title, product_area (fleet 5, missions 5, integrations 5, reports 4, streaming 4, maps 3, dashboard 3, alerts 2), status (new 14, under review 11, closed 6), mentions:int, first_raised, last_raised, raised_by:str[] (anonymised descriptions), raised_by_your_accounts[{account, who, via, date}]}`. Three entries are ours:

- FR-011: A, Rhys Calder, via "call, 2 June 2026"
- FR-010: A, Metro Central operations, via "FB-10781"
- FR-002: B, "FlytBase rollout lead, during the rollout", via "internal", 2026-03-17

### 2.9 `get_signals` (from `SIG`, the live check)

**The shape is now known.** `SIG` holds 2 signals, and `WHO2.signals` = 2.

```jsonc
{ "signals": [
  { "id": "champion_leaves",            // string slug, not numeric
    "account": "A",
    "dated": "2026-11-17",              // YYYY-MM-DD, in-game date
    "title": "Eastern Counties: Rhys Calder is moving on",
    "summary": "…leaves the drone programme in January. No successor is named…",
    "records": [
      { "kind": "email",
        "path": "A/emails/2026-11-17_rhys_moving.txt",   // NOTE: account-prefixed
        "text": "From: Rhys Calder\nTo: (the CSM on the account)\nDate: 17 November 2026\nSubject: …" } ],
    "set_off_at": "2026-11-14T09:30:38.755Z" },        // wall clock, ISO ms Z
  { "id": "urgent_request", "account": "A", "dated": "2026-11-18",
    "title": "Eastern Counties: Westmere needs an answer before a public event",
    "summary": "…public event on 5 December… training… who answers if a dock fails… Nobody has replied.",
    "records": [
      { "kind": "email",   "path": "A/emails/2026-11-18_karen_event.txt", "text": "…" },
      { "kind": "request", "path": "A/requests.csv",
        "note": "Row to add to the account's requests log.",
        "text": "request_id,opened,from,summary,status,owner,last_update,how_it_arrived\nFB-11206,2026-11-18,Westmere drone unit,\"Operator training and support cover before a public event on 5 December. Marked urgent by the requester.\",Open,,2026-11-18,Support ticket\n" } ],
    "set_off_at": "2026-11-14T09:30:42.574Z" } ] }
```

Signal fields: `id, account, dated, title, summary, records[], set_off_at`. Record fields: `kind, path, text`, plus `note` when present (seen only on `kind:"request"`). Record kinds seen: `email` and `request`. Traps are listed in §4.

`MA2` vs `MA`: the only change is `exported_at` (`08:57:08.876Z` → `09:34:34.409Z`). Facts, opportunities, deadlines and stakeholders are unchanged after 2 signals. The signals have **not** been folded into `get_my_accounts`.

---

## 3. Id systems and joins

### Id kinds

| Id | Format / example | Where defined | Scope |
|---|---|---|---|
| Account | `A`, `B` | `MA.accounts[].id` | global |
| Player | UUID | `whoami.player_id`, `MA.player` | global |
| Stakeholder | snake_case name, `nadia_rahman` | `MA.accounts[].stakeholders[].id`; also `X:profile.json.contacts_on_file[].id` | global |
| Team person | `achal_negi`, `support_desk` | `team.people[].id` | global |
| Fact | `<2 initials>_<topic>_<n>`, `sr_roll_2` | `MA.accounts[].facts[].id` | global (24 unique) |
| Opportunity | `<acc>_<slug>`, `b_idle` | `MA…opportunities[].id` | global |
| Offer | `<acc>_<slug>`, `b_reporting` | `MA…offers[].id` | global. Same pattern as opportunities, so tell them apart by the containing array |
| Blocker, deadline | **no id** | nested in an opportunity / `deadlines[]` | cite the opportunity id |
| File | `flight_log_by_plant` | `MA.files[].id`; `get_file` payload `id` | global |
| Paperwork record | relative path, `emails/2026-10-08_finance_mailbox.txt` | `records[].path` | **per account**. The global key is `(account, path)` |
| Signal | slug, `urgent_request` | `SIG.signals[].id` | global? (uniqueness and stability not determinable) |
| Signal record path | `A/emails/…` | `SIG…records[].path` | account-prefixed |
| Ticket | `FB-#####` | `X:tickets.json.tickets[].id` | global across FlytBase customers (no A/B overlap) |
| Request | ticket id or literal `(none)` | `X:requests.csv.request_id` | `(none)` is not an id |
| Invoice | `INV-YY-NNNN` | `X:invoices.json.invoices[].number` | global (no overlap) |
| Dock | `ECPA-D##` (A), `AD-##` (B) | `X:devices.json.docks[].dock_id` | global (no overlap) |
| Dock / aircraft serial | `FBD…` / `FBA…` | devices | global |
| Flight | `ECPA-F#####`, `AD-F#####` | `X:flights.csv.flight_id` | global, contiguous |
| User | `U##` | `X:users.json.users[].user_id` | **per account**: U01..U17 exist in both |
| Mail thread | `T###` | `X:mail_log.json.mail[].thread` | **per account**: 39 thread ids exist in both. A thread holds 1–2 messages. A message has no id: `(account, thread, date, from)` is unique |
| Call | no id | `X:calls_index.json.calls[]` | `(account, date)` is unique; `path` is null for 3 calls |
| Internal note, history entry | no id | | `(account, date, from)` / `(account, date)` are unique |
| Feature request | `FR-###` | `feature_requests.requests[].id` | global |
| Release | version `YYYY.MM` | `release_notes.releases[].version` | global |

### Joins, checked over every record (scripts: `joins.py`, `consistency.py`)

| From → To | Result |
|---|---|
| `MA facts[].verified_by` → `MA files[].id` | 2/2 resolve, same account |
| `MA opportunities[].evidence[]` → fact id or file id | 27 elements: 23 fact ids and 4 file ids, all in the same account, 0 dangling. File elements: a_renewal and a_westmere → flight_log_force_month; b_insurance and b_sister → flight_log_by_plant. There is no type tag, so resolve by lookup in both sets. Evidence includes claims (rc_appetite_0 in a_renewal; sr_roll_0 in b_renewal) |
| `MA files[].account` → `accounts[].id` | 2/2 |
| `MA files[].path` → `get_file.name` | basename only (`files/X.csv` → `X.csv`) |
| `MA facts[].said_by` → `stakeholders[].name` (same account) | 23/24. `jt_prem_2` "Neel Sharma" is a team name, not a stakeholder |
| `MA offers[].pitch_to` → `stakeholders[].name` | 5/5, by **display name** (for example `Insp. Karen Mbeki`) |
| `MA stakeholders[].id` ↔ `X:profile.json contacts_on_file[].id` | A 2/2. B: nadia_rahman and owen_fitch are absent from the profile and are named in **no** B paperwork record |
| `X:profile.json flytbase_side.commercial_owner` → `team.people[].id` | achal_negi resolves |
| `X:profile.json flytbase_side.csm[].who` → `team.people[].id` | `sam` resolves; `you` does not (it means the player) |
| `MA opportunities/offers` ↔ paperwork | **no key**. Opportunity and offer ids never appear in paperwork. The renewal maps to `profile.renewal` and `deal_history.on_file_as_open_at_handover[0]` by meaning only |
| `MA deadlines[]` ↔ `opportunities[].deadline` | identical `text` only (B, `b_idle`) |
| `flights.dock_id` → `devices.dock_id` | all resolve. A 28/35 docks have flights, B 13/14 |
| `usage_weekly.dock_id` → `devices.dock_id` | 35/35, 14/14. `usage_weekly.flights` = count of flights per (ISO Monday week, dock) for **every** row (0 mismatches) |
| `device_events.dock_id` → `devices.dock_id` | all resolve, all docks present |
| `requests.request_id` → `tickets.id` | A 4/5, B 2/4. The rest are `(none)`. Every matched row agrees with its ticket on status, owner/assignee and opened. Every non-Closed ticket appears in requests.csv |
| `(none)` request rows → mail/email | by date and sender only: A L6 2026-08-11 Karen → `A:mail_log` T012 / `emails/2026-08-11_karen_batteries.txt`; B L4 2026-10-08 finance → T013 / `emails/2026-10-08_finance_mailbox.txt`; B L5 2026-09-22 Stefan → T012 / `emails/2026-09-22_stefan_case_study.txt` |
| FB ids in mail_log, internal_notes, device_events, calls_index → tickets | all resolve. Tickets never mentioned in mail: A FB-10132, FB-10167; B FB-10085, FB-10151 (all raised by FlytBase) |
| `A:device_events` detail "Ticket FB-10577" → ticket | resolves. Dock `ECPA-D07` (2026-07-15 lid_sensor_fault, 07-19 engineer_visit); the ticket subject calls it "Dock 7" |
| INV numbers in mail_log → invoices | A INV-26-0311..0314 (T045–T048, to "Billing contact, per Schedule 2"); B INV-26-0204 (T032). INV-25-0914 and INV-25-1012 are not mailed |
| `mail_log[].path` → record paths | A 5/5, B 4/4. Every `emails/` record has exactly one mail_log entry |
| `calls_index[].path` → record paths | every non-null path resolves, and every `calls/` record is indexed |
| `deal_history` "See calls/…" → paths | A 1/1, B 2/2 |
| `users` ↔ stakeholders | by name only: A U01, U02; B U01 |
| `FR raised_by_your_accounts.via` | "FB-10781" → A ticket resolves. "call, 2 June 2026" → `A:calls_index` date 2026-06-02 (free text, join on `date`). "internal" → no record |
| `release_notes.version` → `devices.software` | all docks are on 2026.09. software_update events fall on the release dates; B AD-01 got 2026.09 on 2026-09-19 ("Applied on reconnect") |
| `team.people[].name` ↔ paperwork actors | Sam, Achal Negi, Neel Sharma and Support desk match. **No team id** exists for "a solutions engineer", "the onboarding lead", "the rollout lead", "Deal team", "Field team", "Customer success" or "FlytBase Accounts" |
| Dock ↔ force (A) / plant (B), between `get_file` and paperwork | **no key in any record** (`A:profile.json` not_on_file[3]; `B:profile.json` not_on_file[4]). It can only be inferred, see below |
| `SIG records[].path` → paperwork path | strip the `A/` prefix. `emails/2026-11-17_rhys_moving.txt` and `emails/2026-11-18_karen_event.txt` are **not** in the paperwork fixture |
| `SIG` request row FB-11206 → `A:tickets.json` | **dangling**: there is no ticket record in any fixture |

### Dangling or unresolvable references (complete list)

1. `SIG` urgent_request, `requests.csv` row `FB-11206` → no ticket.
2. `SIG` record paths `A/emails/2026-11-17_rhys_moving.txt` and `A/emails/2026-11-18_karen_event.txt` → no paperwork record yet. Whether `get_all_paperwork` will include them later is not determinable.
3. `requests.csv` `(none)` ×3 (A L6; B L4, L5) → no id at all.
4. `calls_index` `path:null` ×3 (A 2026-06-16, 2026-09-23; B 2026-09-15) → no call record.
5. `MA` `jt_prem_2.said_by` "Neel Sharma" → not a stakeholder. It resolves only to the FlytBase team, and its id prefix `jt` matches no person in any fixture.
6. `profile.flytbase_side.csm[].who = "you"` → not in team.
7. `MA` stakeholders `nadia_rahman` and `owen_fitch` → no paperwork mention. `B:profile.json` not_on_file says "Anyone in group finance." and "Anyone in group IT."
8. `FR-002` via "internal" → no record.
9. `A:invoices.json` INV-26-0311..0314 amounts and billing addresses → "Schedule 2", which is not on file.
10. `A:tickets.json` FB-10412 → its content "sit[s] with the support desk", not on file.
11. Deadlines and blockers have no id.

The following have **0 dangling** references: verified_by, evidence, pitch_to, all dock ids, all FB ids inside paperwork, all INV ids, mail paths, call paths and deal_history paths.

### Dock-mapping inference (not a record; label it as inference)

**B.** Match each dock's monthly flight counts in `B:flights.csv` against `patrol_flights + test_flights` in `F:plant` (May–Oct 2026). Each dock matches exactly one plant:

AD-01→11, AD-02→3, AD-03→6, AD-04→4, AD-05→9, AD-06→1, AD-07→13, AD-08→7, AD-09→8, AD-10→5, AD-11→2, AD-12→12, AD-13→10.

AD-14 (0 flights) matches both 14 and 15. Plant 15 has `dock_installed=no`, which leaves 14. AD-12↔12 matches on 5 months, because Plant 12 has no August row.

Cross-checks: AD-01's offline events from 2026-09-08 to 10-08 line up with FB-10903 (Plant 11). The four regular-patrol plants 3, 5, 7 and 9 match `sr_roll_2`.

**A.**
- Norwold's training counts (5,5,6,3,5,2) are matched by exactly one 4-dock set: ECPA-D19, D22, D24, D31.
- Tarn Valley has 4 docks and 0 flights. That makes it 4 of the 7 docks with no flights; which 4 is not determinable.
- The Westmere/Metro Central split of the remaining docks is not determinable.

---

## 4. Data-quality traps

### `get_file` CSVs

| Trap | Exact rows |
|---|---|
| Plant names, 3 schemes, 40 variants for 15 plants | `P01` / `Plant 1` / `Aldermoor Plant One` … `Aldermoor Plant Fifteen`. Normalise to an integer |
| Force names, 11 variants for 4 forces | Westmere: `WESTMERE`, `Westmere Constabulary`, `Westmere`. Metro Central: `Metro Central`, `Metro Central Police`, `METRO CTRL`. Tarn Valley: `TARN VALLEY POLICE`, `Tarn Valley`, `Tarn Vly`. Norwold: `Norwold Police`, `NORWOLD` |
| Month formats, 4 in each file | `Mon YYYY` (`May 2026`), `Mon-YY` (`Jun-26`), `MM/YYYY` (`10/2026`), `YYYY-MM` (`2026-05`). In F:plant: 25/23/22/20 rows of Mon-YY/YYYY-MM/Mon YYYY/MM/YYYY. In F:force: 3/8/5/9 of Mon-YY/YYYY-MM/Mon YYYY/MM/YYYY |
| Boolean as text | `dock_installed` takes yes, Y, no |
| Exact duplicate rows | F:plant L20 = L21 `P04,May-26,Y,0,1,0`. F:force L7 = L8 `Westmere,2026-10,18,14,126,8,` |
| Re-sent row with blank numbers | F:force L26 `Westmere,Oct 2026,18,14,,,"re-sent, see above"`. Westmere Oct appears 3 times |
| Missing months (missing is not zero) | F:plant Plant 12 2026-08 (the inferred AD-12 flew 2 that month). F:force Metro Central 2026-07: the file total for July is 57, but `A:flights.csv` holds 99 for July |
| Abbreviated notes | `training only` and `trg` mean the same |
| Numbers as strings | all CSV cells, from paperwork and from `get_file` |

Once these are cleaned, the file totals equal `flights.csv` in every other month. A: 172, 118, —, 110, 182, 161. B: 100, 107, 117, (119 vs 121), 100, 110. Sam's emails `A:mail_log` T006, T008 and T010 quote 172, 118, 99, 110, which matches flights.csv.

### `get_my_accounts`

| Trap | Ids |
|---|---|
| `said_by` does not match the person the id prefix suggests | `km_value_2` said_by Rhys Calder (prefix km = Karen Mbeki). `jt_prem_2` said_by Neel Sharma (no "JT" anywhere in the fixtures). `sr_repl_2` said_by Beatriz Alonso (sr = Stefan Roy). `nr_cost_2` said_by Beatriz Alonso (nr = Nadia Rahman; the text says "she sees no reduction"). `sr_case_3` said_by Nadia Rahman. The prefix may name the subject rather than the speaker; that is not documented. Use `said_by` |
| `said_by` is not a customer | `jt_prem_2`: Neel Sharma is FlytBase's Lead CSM (`team.json`) |
| Schema-required field missing | `accounts[B].deadlines[0]` has no `minute`. `b_idle.deadline` has no `minute`, and no date anywhere |
| Undocumented fields | `b_idle.deadline.{soon,met,moves_left}` |
| Null values | `worth_up_to` is null for a_renewal, a_tarn, a_westmere and b_insurance. `a_renewal` is null even though the contract price is 350000 (`A:profile.json renewal`), so **do not treat it as unpriced**. `size` is null on all 7 |
| No currency | `worth_up_to`, `offers.value` and figures in fact text ("180,000 euros") carry no currency field |
| Minutes, not dates | `learned_at_minute` and `minute`. The mapping to wall-clock time is not determinable (`minute` stayed at 71 while `exported_at` moved) |
| `exported_at` changes on every call | do not hash or diff it; diff the payload without it |
| Paperwork vs morning discovery disagree | `B:profile.json` not_on_file says no finance or IT contact, yet `MA` has nadia_rahman (finance, guarded) and owen_fitch (IT). `official_story` B says "13 flying"; `sr_roll_2` (verified) says 4 fly regularly and 9 log only test flights |

### Paperwork

| Trap | Where |
|---|---|
| Null amounts | `A:invoices.json` INV-26-0311..0314 `amount:null`. `first_year_total` is 350000, but the pilot invoice of 30000 is "credited against the first year", so the four parts cannot be derived. B: 12000 + 128000 = 140000 |
| Null value for a deal | `A:deal_history.json` on_file_as_open_at_handover: tender and stadium `value:null`. B: sister company `value:null` |
| Null people | `users.name` null for 21/23 (A) and 16/17 (B). `A:tickets.json` FB-10412 `assignee:null`; `A:requests.csv` L2 owner blank |
| "No reply" markers (4 forms) | mail_log `note:"No reply on file."` (A T007; B T004, T005, T007, T008, T009). Bracket trailers in email text (§2.5). Parentheses in call actions, for example `A:calls_index` 2026-08-19 "(No reply on file.)". requests.csv summaries "No reply on file." / "No reply sent." |
| "Not on file" | `X:profile.json not_on_file[]` (A 4, B 5). users roles "name not on file" (B U02, U03). Calls "(name not recorded)" (A 2025-12-16 procurement lead; the B deputy in 4 call headers: 2025-10-07, 2025-12-11, 2026-02-10, 2026-03-17) |
| Placeholder id | `requests.csv` `(none)` ×3 |
| Unsorted rows | requests.csv: A L6 (2026-08-11) comes after L5 (2026-08-21); B L4 (2026-10-08) comes before L5 (2026-09-22). Mail thread numbers are not chronological |
| Name variants for one entity | "Insp. Karen Mbeki" / "Karen Mbeki" / "Insp. Mbeki" / "Karen". "Beatriz Alonso" / "Beatriz Alonso, Plant 7". `B:mail_log` "Group Finance (shared mailbox)" vs `B:requests.csv` "Group finance (shared mailbox)" (case differs). "Sam" / "Sam (FlytBase)". "FlytBase field team" / "Field team". "FlytBase rollout lead" / "The rollout lead (FlytBase)" / "Rollout lead". "Dock 7" = ECPA-D07. "Plant 11" / "Aldermoor Plant 11" / `P11` / "Aldermoor Plant Eleven" |
| Per-account ids collide | `U01`…, `T001`… and `contract.txt` etc. exist in both accounts. Always key by account |
| Zero-flight docks need context | A ECPA-D06 and D13 had their aircraft removed for maintenance from 2026-10-01/02 to 11-03/04 (`A:device_events.csv`), which explains their October zero. B AD-12 has 80 and AD-14 has 43 `connection_lost` events |
| Battery warnings | `A:device_events` battery_health_warning: ECPA-D16 ×17, D29 ×17, D02/D22/D27 ×3, D10/D33 ×1. Karen's "two docks" (`emails/2026-08-11_karen_batteries.txt`) is not tied to a dock id. That link is inference |

### Date formats in use

| Format | Where |
|---|---|
| `YYYY-MM-DD` | most JSON date fields, CSV `date` / `week_start` / `opened` / `last_update`, releases, FR, signals `dated` |
| `YYYY-MM` | `profile.csm[].from/to`, `contacts_on_file[].on_file_since`, 5 entries per account in `deal_history.history[].date` |
| `YYYY-MM to YYYY-MM` | `deal_history.history[].date` (A ×1, B ×2) |
| `HH:MM` (no timezone) | flights `start_time`, device_events `time` |
| ISO-8601 ms `Z` | `MA.exported_at`, `SIG.set_off_at` |
| `D Month YYYY` | `Date:` header of every call and email (including signal emails). Contract `Signed:` |
| Free text | "16 Dec 2025" (`A:profile.json` not_on_file[1]), "call, 2 June 2026" (FR-011 via), "30,000" amounts in prose |
| 4 month formats | `get_file` CSVs (above) |
| Minutes since discovery | `MA` `learned_at_minute`, `minute` |

### Currencies

A is GBP and B is EUR (`profile`, `deal_history`, `invoices` `.currency`; contract text). `MA` money has no currency. Totals must never be summed across accounts (CONTEXT.md).

### Signals (`SIG`)

- `records[].path` carries an account prefix (`A/emails/…`, `A/requests.csv`). Paperwork `path` does not.
- Record `kind:"request"` is singular; the paperwork kind for `requests.csv` is `"requests"`.
- The `request` record's `text` is a CSV **fragment with its own header**, and `note` says "Row to add". That means append, not replace.
- `dated` (2026-11-17, 2026-11-18) is **later than** `set_off_at` (2026-11-14T09:30Z). The game calendar runs ahead of the wall clock, which conflicts with ADR 0003's "Today is the server's calendar date".
- The signal email `To:` reads "(the CSM on the account)".

---

## 5. Field map to the five questions

### Q1: What is the book worth?

| Need | A | B |
|---|---|---|
| On contract | `A:profile.json renewal.annual_value` 350000, `term_ends` 2027-02-28. `A:contract.txt` "Price and term". `A:deal_history.json history[what="Order form signed"].value`. `A:invoices.json first_year_total`. MA `a_renewal` (worth null, stage identified) | `B:profile.json renewal` 140000 / 2027-01-31. `B:contract.txt`. `B:invoices.json` INV-25-1012 + INV-26-0204. MA `b_renewal` worth 140000, `blocker.status open` |
| Renewal risk flag | `contract.txt` "No automatic renewal". `A:mail_log` T050 (2026-10-31, "ends in 120 days") | same. `B:mail_log` T038 (120 days), T039 (2026-11-02, 90 days) |
| Backed upside | MA `offers[status=open]`: `a_training` 45000 | `b_reporting` 70000 |
| Unbacked | `A:deal_history.json on_file_as_open_at_handover` tender, stadium (`value:null`); facts `rc_tender_0` (told), `rc_stadium_0` (claim), `rc_stadium_3` | `b_idle` 180000 and `b_sister` 1200000 (`blocker.status open`); `sr_roi_0` 1.2M (claim) |
| Unpriced | `a_tarn`, `a_westmere` (`worth_up_to:null`) | `b_insurance` |
| Leave out | declined `a_priority_support` | declined `b_priority_support`, `b_more_plants` |
| Currency | `A:profile.json currency` GBP | EUR |

**Cannot supply:** the A invoice part amounts (Schedule 2); any value for the tender, stadium or sister company; `size`; an FX or plan rate; the working behind `sr_roi_0` (`B:emails/2026-07-16_stefan_savings.txt` "[No detail received.]").

### Q2: Who holds the power?

| Role | Fields |
|---|---|
| Decides | `X:contract.txt` `Signed:` line. A: "by the alliance office", no person. B: Stefan Roy. Also `B:calls/2026-01-08_order_call.txt` "Stefan Roy signs" |
| Pays | `X:contract.txt` Invoicing. `X:invoices.json note`. mail_log `to` on invoice mails: A "Billing contact, per Schedule 2"; B "Group security (billing contact)". B internal allocation: facts `sr_plants_2`, `nr_cost_2`, `ba_cost_2`. Finance request `B:requests.csv` L4 / `emails/2026-10-08_finance_mailbox.txt` |
| Uses | `X:users.json` (`role`, `sign_ins_last_90_days`, `last_sign_in`; for example B U01 Stefan Roy has 0 sign-ins and last signed in 2026-05-12; B U02 is the unnamed deputy with 38). `X:flights.csv` / `usage_weekly.csv` per dock. `F:force` / `F:plant` per force or plant. Facts `km_usage_1`, `sr_roll_2`, `ba_use_2` |
| Could block | `MA opportunities[].blocker.text` (`status open`). A procurement lead (`A:calls/2025-12-16_pilot_review.txt`, `A:profile.json` not_on_file[1]). `nadia_rahman` relationship `guarded`. `owen_fitch` (IT; the b_idle blocker cites "the network project") |
| Stands | `MA stakeholders[].relationship` / `available`. `X:profile.json contacts_on_file[].last_contact_before_handover`. mail_log no-reply notes |
| Deal ↔ person | **no explicit field.** Derive it from `evidence[]` → `facts[].said_by`, and from `offers[].pitch_to` |

**Cannot supply:** the name of the A signer, the A procurement lead, any A finance contact, contacts at Metro Central, Tarn Valley or Norwold, and the B deputy (name not on file); any record that ties Owen Fitch or Nadia Rahman to paperwork.

### Q3: What do you do first?

| Need | Fields |
|---|---|
| Owner | `X:profile.json flytbase_side.csm[who=you]` (the player); `commercial_owner` achal_negi; `team.people[]` roles (neel_sharma is Lead CSM). Ticket `assignee` values |
| Dates and deadlines | `renewal.term_ends`. `SIG[].dated` plus summary dates (urgent_request: "this week" and the event on 5 December; champion_leaves: "January"). `MA deadlines[]` (no date). Open `requests.csv` rows (`status`, `last_update`) |
| Deal it moves | `MA opportunities[].id` and `offers[].id` |
| Candidate moves | open tickets / requests without an owner (A FB-10412, A `(none)` L6, B `(none)` L4–L5); open blockers; offers with status `open`; no-reply mail |

**Cannot supply:** the date of "Stefan's deputy leaves"; a person behind "FlytBase Accounts", "Field team" or "a solutions engineer"; the player's name.

### Q4: What is about to go wrong?

| Risk | Fields |
|---|---|
| Renewal | `renewal.term_ends`; `contract.txt` no auto-renewal; automatic "term ends in N days" mails (A T050; B T038, T039); `b_renewal.blocker` |
| Going cold | mail_log `note:"No reply on file."`; email bracket trailers; `contacts_on_file[].last_contact_before_handover` (A Karen 2026-08-11); `requests.csv` `opened`/`last_update`/`status`; `SIG` champion_leaves (Rhys leaves in January) |
| Stuck | `tickets[assignee=null]` (A FB-10412, chased 2026-08-14); `status="Pending customer"` (B FB-10903 since 2026-09-10); blockers with `status open`; `calls_index[].actions` ending in "(Not received.)" or "(No further note.)"; deadline with no date |
| Usage drop | `F:force docks_with_live_flights` (Metro Central 8 → 7 → 3 from Aug to Oct, with July missing). `A:flights.csv` docks flying per month 26, 23, 21, 21, 27, 18 (May–Oct). `device_events` offline / connection_lost (B AD-01, AD-12, AD-14) and battery_health_warning |
| When it turns bad | dates only from `term_ends`, signal `dated` and text, and email/ticket dates. `MA deadline.soon`/`passed`/`met` are booleans with no date |

**Cannot supply:** when the deputy leaves; when the "network project" cuts docks off (`b_idle.blocker` only); the guard-contract renewal dates (`nr_evidence_2` "three renew within four months" has no dates); whether `MA` deadline flags will change.

### Q5: What do you still not know?

| Source | Fields |
|---|---|
| Declared gaps | `X:profile.json not_on_file[]` (A 4, B 5) |
| Claim-only facts | `MA facts[status=claim]`: rc_appetite_0, rc_stadium_0, rc_funding_0, sr_roll_0, sr_roi_0 |
| Missing values | `worth_up_to:null`; `invoices.amount:null`; `deal_history` `value:null`; `users.name:null`; deadline without `minute` or date |
| Missing data rows | F:plant Plant 12 Aug; F:force Metro Central Jul |
| Content held elsewhere | FB-10412 text ("sit with the support desk"); Schedule 2 (FlytBase Accounts); install sheets (A field team, `A:calls/2026-04-28_install_close.txt`) and install list (B deputy) |
| Who could fill each gap | `MA stakeholders`, `team.people`, the actors named in records (Support desk, Accounts, field team). If none is named, show "not on file" |

---

## 6. Open unknowns

1. The error shapes: the rate-limit error, `isError:true` and JSON-RPC `error`. Also retry-after, and whether a failed call still uses up the minute.
2. Whether every tool shares the one-call-a-minute limit or only the ones whose description says so. Whether `whoami` and `write_note` count is stated only in ADR 0002.
3. Whether `get_all_paperwork` will include signal records after they arrive (the 2 new email paths, FB-11206 in `tickets.json`, the new `requests.csv` row), or whether the app has to merge `SIG.records` itself.
4. Whether signals ever change `get_my_accounts`. After 2 signals, only `exported_at` had changed in `MA2`.
5. Signal `id` stability and uniqueness across calls; ordering (described as "oldest first", but only 2 were seen); which other `records[].kind` values exist; whether a signal can name no account or several.
6. The game "today". Signals are `dated` 3–4 days after `set_off_at`, and `whoami` gives no game date.
7. The shape of `whoami.new_accounts[]` elements, and whether the `account` enum (`A`,`B`) in tool input schemas widens for new accounts.
8. Response shapes of `list_paperwork`, `get_paperwork_record` ("rows" for CSV), `search_paperwork`, `list_notes` and `write_note` (whether it returns a note id).
9. How `minute` and `learned_at_minute` map to wall-clock time; whether fact `status` can change (claim → verified) over time; what the fact id prefix and suffix mean.
10. Dock ↔ force (A) and dock ↔ plant (B). No record holds either. B is uniquely inferable by monthly counts (§3); for A only Norwold can be inferred.
11. Paperwork-side unknowns: the Schedule 2 amounts and billing contacts; the names of the A procurement lead and the B deputy; the date the deputy leaves; the network project; the guard-contract dates; the insurer details (only `jt_prem_2`, told by Neel Sharma); the FB-10412 request text.
12. HTTP transport: headers, auth header name, session handling, whether responses can stream (SSE). The fixtures hold decoded bodies only.
