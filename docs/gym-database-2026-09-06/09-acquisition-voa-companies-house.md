# Acquisition Report: VOA Rating List & Companies House (2026-09-06/07)

Scratch location: `/tmp/claude-0/.../scratchpad/gyms/raw/{voa,companies-house}/`
(session-local; not in the repo).

---

## 1. VOA non-domestic rating list (England & Wales)

### Source
- Bulk file: `uk-englandwales-ndr-2023-listentries-compiled-epoch-0022-baseline-csv.zip`
  (2023 compiled list, epoch 0022), 106 MB zipped, from
  `voaratinglists.blob.core.windows.net` linked off rlidata.htm.
- Layout doc: `CompiledSpec.pdf` (field layout, SCAT code list) from the same page.
- **Deleted after extraction** (disk allowance) — only the filtered CSV and its
  manifest remain on disk.

### Licence — NOT OGL v3 (important, contradicts the brief's expectation)
Quoted directly from `rlidata.htm` / linked terms page
(`www.tax.service.gov.uk/business-rates-find/terms-and-conditions`):

> "VO Rating List Downloads are only available under our restricted licence
> terms and conditions. These are the same terms and conditions applicable to
> viewing rating list information online. **An open government licence does
> not apply.**"

> "Publication of this information and its use is restricted to Non Domestic
> Rating (NDR) purposes only... The use for NDR purposes is to: enable anyone
> to exercise their right to view rating assessments in the compiled rating
> lists; permit a user who is an interested person or a relevant authority to
> review the valuation of assessments they have an interest in [or] view the
> valuation of other assessments they consider to be comparable..."

> "Onward disclosure to a third party is prohibited except where the third
> party's use is for the uses stated above. The user will delete this
> information when they no longer have a business need associated with the
> stated purposes to hold the information." "The Database and Data are
> protected by Crown Copyright and Crown Database rights."

**Compliance flag for the founder:** the permitted uses are rating-assessment
review by an "interested person" (occupier/leaseholder) or "relevant
authority" (the local council) — not general redistribution as a gym
directory in a consumer product. Using VOA data as a queryable in-app gym
list is outside the quoted NDR-purposes licence as written. This is a
product-scope decision, not a data-acquisition one — flagging per Section 2
(no unilateral scope calls) rather than deciding it here.

### SCAT codes used and why
From `CompiledSpec.pdf`, whitelisted SCAT base codes (letter suffix ignored:
G/S/N variants exist per list):

| SCAT | Label | Rationale |
|---|---|---|
| 416 | Gymnasia/Fitness Suites | Direct gym match |
| 503 | Gymnasia/Fitness Suites within/part of specialist property | Direct gym match, embedded in another property type |
| 257 | Sports & Leisure Centres (LA) (Dry Only) | Council leisure centres, no pool |
| 258 | Sports & Leisure Centres (LA) (Wet & Dry) | Council leisure centres with pool |
| 259 | Sports & Leisure Centres (Private) (Dry Only) | Private-sector equivalent of 257 |
| 260 | Sports & Leisure Centres (Private) (Wet & Dry) | Private-sector equivalent of 258 |
| 509 | Sports & Leisure Centres within/part of specialist property | Embedded leisure centres |
| 125 | Health Farms | Health-club adjacent |
| 060 | Clubhouses | Sports clubhouses (many host gyms/boxing) |
| 081 | Cricket Centres | Indoor sports centre subtype |
| 739 | Soccer Centres | Indoor sports centre subtype |

A free-text regex backstop also matched on description alone (catches
properties under other/miscellaneous SCAT codes, e.g. `096G` warehouse units
actually let as gyms): `\bGYM(NASIUM)?\b|\bFITNESS\b|\bHEALTH\s*CLUB\b|
\bHEALTH\s*FARM\b|\bLEISURE\s*CENTRE\b|\bSPORTS\s*CENTRE\b|\bBOXING\b|
\bMARTIAL\s*ARTS?\b|\bCLUBHOUSE\b|\bCROSSFIT\b|\bBOOTCAMP\b`.

### Files written
- `voa/gyms-and-fitness.csv` (4.9 MB, 17,370 rows + header) — uarn, ba_code,
  country, description, scat_code, scat_label, full address fields,
  postcode, rateable_value, effective_date, list_year.
- `voa/manifest.json` — counts, SCAT whitelist, regex, licence text pointer.
- `voa/description-frequency.csv` — description string frequency table.

### Counts
- Rows scanned: 2,389,539. Total matched: **17,370** (12,838 by SCAT code,
  4,532 by description-regex backstop only).
- By country (via BA code range): **England 16,307 / Wales 1,063**.
- Top descriptions: GYMNASIUM AND PREMISES (3,141), LEISURE CENTRE AND
  PREMISES (2,384), CLUB HOUSE AND PREMISES (2,111), GYM AND PREMISES
  (1,433), GYMNASIUM & PREMISES (595), SPORTS CENTRE AND PREMISES (593).
- Dominant SCAT codes: 416G Gymnasia/Fitness Suites (5,833), 060G Clubhouses
  (3,144), 096G — a non-whitelisted "General Industrial/Warehouse" code that
  the regex backstop pulled in via description text (1,508), 259S Private
  Sports & Leisure (Dry) (1,292), 258S LA Sports & Leisure (Wet & Dry) (909).

### Volt Gym / Burscough (L40) search
**No row contains "VOLT" anywhere in the description or address fields.**
The nearest string hits are unrelated ("PHOTOVOLTAIC INSTALLATION..." solar
panels at other gyms/leisure centres, "FINEDON VOLTA FOOTBALL CLUB",
"VOLTAIRE ROAD" London).

Three L40-postcode gym/fitness matches (Burscough itself), none named Volt:
```
MCDONALD DANCE & FITNESS ACADEMY 2ND FLOOR 65A, LIVERPOOL ROAD NORTH,
  BURSCOUGH, ORMSKIRK, LANCS — L40 0SA — SCAT 203G
BURSCOUGH SPORTS CENTRE, BOBBY LANGTON WAY, BURSCOUGH, ORMSKIRK, LANCS
  — L40 0SD — SCAT 257S (LA leisure centre)
UNIT 12, SEAFIRE BUSINESS PARK, SEAFIRE WAY, BURSCOUGH, ORMSKIRK, LANCS
  — L40 8AH — SCAT 259S "GYMNASIUM AND PREMISES" (private gym, generic
  description only — NOT at the same address as the Companies House hit
  below, so this is a different premises, not Volt Gym)
```
**Finding for the founder:** VOA descriptions are property-type labels set by
the valuer, not the trading name — "Volt Gym" would never appear verbatim
unless a valuer happened to copy the fascia name in. This confirms the
premise behind this whole acquisition task: independent gyms are frequently
**not findable by name** in VOA data; only Companies House (below) surfaced
the actual entity by name.

---

## 2. Companies House Free Company Data Product

### Source
Monthly snapshot dated 2026-09-01, 7 parts (`BasicCompanyData-2026-09-01-
part1_7.zip` … `part7_7.zip`, ~70 MB each), from
`download.companieshouse.gov.uk/en_output.html`. Each part downloaded,
stream-filtered, then **deleted** before the next part (disk allowance).

### Licence
The download page itself states no bespoke terms. The gov.uk guidance page
(`www.gov.uk/guidance/companies-house-data-products`) states:

> "Companies House is required to make data about companies and their
> officials available for public inspection under the Companies Act 2006. We
> impose no rules or requirements on how the information on the public
> register is used, and we're not responsible for your use of the company
> data. You are responsible for complying with any applicable data
> protection, copyright and other legislation and regulations."

Page footer (standard gov.uk licence banner): *"All content is available
under the Open Government Licence v3.0, except where otherwise stated" / "©
Crown copyright"*. Unlike VOA, this is unrestricted for redistribution —
**this dataset expects OGL v3 as the brief anticipated; VOA does not.**

### Filter and files
Filter: `CompanyStatus == 'Active' AND SICCode.SicText_1..4 startswith
('93130','93110')`. Written: `companies-house/fitness-companies.csv`
(5.3 MB, 25,084 rows) with CompanyName, CompanyNumber, RegAddress.* fields,
PostCode, SIC codes, IncorporationDate; `companies-house/manifest.json`.

One part (part 6) hit a ragged CSV row with a missing field on first pass and
crashed; the zip was re-fetched, the parser fixed (guard against a `None`
fieldname from `csv.DictReader`), and the output de-duplicated on
CompanyNumber afterwards (908 duplicate rows from the aborted first pass
removed; final count cross-checked against the summed per-part match counts,
which land on exactly 25,084).

### Counts
- Rows scanned across all 7 parts: 5,689,367. Matched (unique,
  active, SIC 93130 or 93110): **25,084**.
- By SIC field occurrence (a company can carry both across its 4 slots):
  93130 "Fitness facilities" 16,170; 93110 "Operation of sports facilities"
  9,369.
- By registered-address country: England 13,259; "United Kingdom" (generic,
  uninformative) 6,649; blank 2,921; Scotland 1,203; Wales 584; Northern
  Ireland 468. (Country is free text at incorporation, not a controlled
  field — cannot be safely reallocated without full address parsing.)
- Premises-like heuristic (address contains GYM/LEISURE/FITNESS/UNIT/
  INDUSTRIAL/ESTATE/RETAIL): **3,369 of 25,084 (13.4%)**. The other 86.6%
  register at what reads as an accountant/formation-agent office — expected,
  since UK company law lets the registered office differ entirely from the
  trading premises. **Companies House registered addresses are a weak signal
  for physical gym locations on their own** and need cross-referencing
  against VOA/other trading-address sources.

### Volt Gym / Burscough (L40) search
Grep for "VOLT" in CompanyName across the filtered set returned 9 companies,
one of which is the founder's exact test case:

```
VOLT FITNESS UK LIMITED, 10119606, Active, SIC 93130 "Fitness facilities"
  Registered address: 2A Swordfish Business Park, Swordfish Close,
  Higgins Lane, BURSCOUGH, Lancashire, L40 8JW
  Incorporated: 12/04/2016
```

**This is the strongest single finding of this task: Companies House found
Volt Gym by name; VOA did not (see above) — because VOA never carries trading
names, only property descriptions.** The other 8 "VOLT..." hits are unrelated
gyms elsewhere (Volt Body, Voltage Gym, Volt Padel Club/Ltd, Voltage Arrows,
Volte Fitness, Revolt Cycling, and Voltage Fitness as a trading name of SSS
Investments Ltd).

16 further Burscough (L40) fitness/sports companies were found in the same
filtered set (full rows in the CSV / manifest), including 1B Strength &
Conditioning, Unity Strength & Conditioning, The Reformer Club NW, Percent
Pilates, Hire Fitness NW, Amy Wright Fitness, and Burscough Football Club —
none of these share Volt's Swordfish Business Park address, so the earlier
VOA "Seafire Business Park" gym match is confirmed as a **different**
premises, not Volt Gym under an unlabelled description.

---

## 3. Scotland & Northern Ireland — recorded, not downloaded (per brief)

### Scotland — Scottish Assessors Association (saa.gov.uk)
`curl` (bare, no browser headers/session) returns **HTTP 403** on both the
site root and `/data-downloads/` — consistent with the brief's expectation.
No bulk CSV/API download route was found reachable without a browser
session; SAA's public interface is address-by-address search
(`www.saa.gov.uk`), not a bulk file. Licence unknown from this session (page
never loaded) — do not assume OGL without seeing the terms.

### Northern Ireland — LPS valuation list / OpenDataNI
`opendatani.gov.uk` root loads (HTTP 200, Next.js app), but both a search
query (`?q=lps+valuation`) and a guessed dataset slug
(`/dataset/valuation-list`) returned **HTTP 500** from bare `curl` — the
portal's dataset pages evidently render client-side against a separate API
(`admin.opendatani.gov.uk`) that a plain GET doesn't satisfy. **No licence
text was recovered this session** (an earlier grep hit on "ogl" was a false
positive inside the word "google" in a script tag — flagging so it isn't
mistaken for evidence). LPS (Land & Property Services) is known to publish a
NI valuation list, but its bulk-download route needs a follow-up session
with a real browser/session, not a verdict here.

---

## Files & sizes (final state)

| File | Size |
|---|---|
| `voa/gyms-and-fitness.csv` | 3.7 MB (17,370 rows) |
| `voa/description-frequency.csv` | 48 KB |
| `voa/manifest.json` | 4 KB |
| `voa/CompiledSpec.pdf`, `rlidata.htm`, `rlidata_text.txt`, `terms.html` | ~1.2 MB (layout/licence evidence, kept) |
| `companies-house/fitness-companies.csv` | 5.3 MB (25,084 rows) |
| `companies-house/manifest.json` | 4 KB |
| `companies-house/en_output.html`, `faq.html`, `govuk2.html` | ~104 KB (licence evidence, kept) |

Both source bulk zips (VOA 106 MB, Companies House 7×~70 MB) were deleted
after extraction per the disk allowance; only derived CSVs, manifests, and
small licence/spec evidence pages remain.

## Blocked / flagged
1. **VOA licence blocks the obvious product use** (Section 1) — needs a
   founder/lead decision on whether VOA-derived rows can appear in-app at
   all, or only as an internal cross-reference to validate other sources.
2. SAA (Scotland) — 403, no bulk route found; needs a session-aware follow-up.
3. OpenDataNI (NI) — dataset pages 500 on bare curl; needs a follow-up with
   a proper client, and no licence text was actually recovered (correcting
   the false "ogl" grep hit above).
