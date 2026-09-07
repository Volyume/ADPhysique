# 06 — Gym database coverage (evidence-first audit)

Authority: founder prompt 2 (Community product audit), section 6 "Gym
database — exhaustive audit" and section 7 "New gym addition";
`docs/community-product-audit-2026-09-07/README.md`. Read-only agent —
no file edited except this one. Every figure below was recomputed
independently from `data/gyms/uk-gyms.v1.jsonl.gz` (decompressed to
scratch and read with `python3`), not copied from
`docs/gym-database-2026-09-06/30-COVERAGE-REPORT.md` — that report is
cited only where it is the more convenient citation and its number
matched my own recount.

**Status of the underlying build**: written, **NOT merged to main, NOT
applied to production**. Branch `claude/volyume-social-discovery-h7dknu`
(`git log`: `172791c` re-review, `f09c612` security fixes, `25282a2`
tables/RPCs). `docs/TASKBOARD.md:75` heading: "BUILT ... 162 RE-REVIEW +
RECORDS 30/40/50 IN FLIGHT; NOT YET MERGED." Everything below describes
what exists on disk, most of which is currently invisible to any real
user.

---

## 1. Provenance

### 1.1 Sources, by role, with evidence

| Source | Role (GD-02) | Licence (as recorded) | Freshness pulled | Fields contributed |
|---|---|---|---|---|
| Sport England Active Places Power | Canonical | CC BY 4.0, "Contains Data © Sport England" (`docs/gym-database-2026-09-06/01-sources-england-os-google-osm.md:39-55`) | 2026-09-06/07 (`30-COVERAGE-REPORT.md:153`) | Site name, address, postcode, facility type, ownership, status, closure date, UPRN, TOID, LA/region codes, lat/lng |
| Active Places NI (Sport NI, OpenDataNI) | Canonical | OGL (`02-sources-scotland-wales-ni.md:132-135`) | Portal itself states "Last updated 8 years ago"; `metadata_modified` 2017-11-17 (`30-COVERAGE-REPORT.md:143-146`) | Venue name, address, post town, county, postcode, ownership type, 18 sport/facility Yes/No flags incl. `FITNESS`; Easting/Northing (no lat/lng — converted) |
| DataMapWales "Leisure Centres" | Canonical | OGL v3 (`02-sources-scotland-wales-ni.md:83`) | Dated 2022-11-07 (3.8+ yrs stale at audit time) | uprn, name, type/subtype (bilingual _cy fields), street, town, postcode, status |
| sportscotland Sports Facilities (Spatial Hub) | Canonical **by ruling, NOT YET ACQUIRED** | OGL v3, gated behind a free account (`02-sources-scotland-wales-ni.md:33-36`) | N/A — never pulled | N/A — Scotland's 3,169 rows come entirely from Overture, operator feeds and Companies House instead (`30-COVERAGE-REPORT.md:130-132`) |
| Overture Maps Places (`2026-08-19.0`) | Canonical (GD-17) | Per-row: CDLA-Permissive-2.0 (Overture/Meta/Microsoft rows), Apache-2.0 (Foursquare-sourced rows folded in) | 2026-09-07 | Name, address, category, lat/lng, phone, website, brand hints; 52,371 UK fitness-family rows pulled via DuckDB httpfs (`20-BLUEPRINT.md:192-200`) |
| Foursquare Open Source Places (direct) | Cross-check, **not pursued separately** | Apache 2.0 | Never fetched directly — its own S3 requires a Hugging Face account gate (`30-COVERAGE-REPORT.md:148-150`); its rows reach the dataset only pre-conflated inside Overture | N/A |
| Companies House (Free Company Data Product, SIC 93130/93110) | Candidate signal only (GD-02), never a canonical venue alone | OGL v3 / unrestricted public register (`09-acquisition-voa-companies-house.md:125-139`) | Monthly snapshot dated 2026-09-01 | Company name, number, registered address, postcode, SIC code, incorporation date — corroborates an existing venue on strict match (GD-20), does not create one |
| VOA compiled rating list | **Evaluated and REJECTED (GD-16)** | Its own terms: "An open government licence does not apply"; use confined to non-domestic rating purposes, deletion obligation (`09-acquisition-voa-companies-house.md:18-46`) | 17,370-row extract pulled 2026-09-06/07, **deleted same day** | Not in pipeline. No VOA field appears anywhere in the output (`ATTRIBUTION.md:41-45`) |
| ONS Postcode Directory (ONSPD) | Location hierarchy backbone (GD-08) | OGL v3 (`01-sources-...md:266-270`) | August 2026 release, pulled 2026-09-06/07 | Postcode → country, region, local authority, sector centroid lat/lng |
| Wikidata | Brand enrichment only | CC0 | — | QID/website for `brands.v1.json` on a confident label match |
| Google Places API | **Runtime only, never stored** (GD-02) | Google Maps Platform Terms; storage of anything but place ID is banned (`01-sources-...md:134-153`) | N/A | Zero stored rows — used, if at all, for a live onboarding lookup, never as a seed |
| OSM (Overpass) | Intended cross-check, **never run** | ODbL 1.0 — direct copy would trigger share-alike, so ruled cross-check-only even if it had run | N/A | Every Overpass mirror was unreachable from the build container (`30-COVERAGE-REPORT.md:135-138`); zero rows |
| OS Points of Interest / OS NGD / OS Places API | **Not used** | Commercial/PSGA-gated, no public price found | N/A | Founder-priced-licence decision, not taken (`20-BLUEPRINT.md:180-181`, `50-FINAL-REPORT.md:84`) |
| 18 operator branch pages (PureGym, The Gym Group, JD Gyms, Nuffield, David Lloyd, Better/GLL, Freedom Leisure, Snap Fitness, Places Leisure, Bannatyne, Virgin Active, Fitness First, Village Gym, Total Fitness, Third Space, 24/7 Fitness, Simply Gym, and one more per manifest) | Verification / gap-fill (GD-02) | Unconfirmed per-operator (no full ToU read for any but PureGym/attempted Gym Group; robots.txt permissive posture, "read-only, low-rate, attribute, no bulk redistribution", `03-sources-operators-industry.md:9-14`) | Fetched 2026-09-06/07, one pass, no recurring cadence yet (`30-COVERAGE-REPORT.md:158`) | Name, address, postcode, phone, opening hours, per branch |

### 1.2 Merge / corroboration rules (GD-06, GD-19, GD-20 — `20-BLUEPRINT.md:48-56,227-240`)
Blocking: same postcode unit → same postcode sector + first name token →
250 m grid cell. Score: same brand +3; name Jaccard ≥0.85 +3, 0.6–0.85
+1; same postcode unit +2; same street number/name +2; within 100 m +2,
within 150 m +1; same phone +2; same website host +2. **Merge ≥5, review
3–5, distinct <3.** Companies House corroborates a venue only when the
postcode unit matches **and** the folded company name shares ≥2 tokens
or reaches Jaccard ≥0.5 with the venue name (GD-20); otherwise nothing
attaches (this is why the review queue's `possible_independent_gym`
entries — 2,702 of them — sit unattached, see §2). Brand attribution:
freshest brand-bearing source wins (operator feed > Overture > Active
Places `operatorname`); two rows carrying **different known brands never
merge** (hard veto, GD-19).

### 1.3 Named operator/brand feed check

| Chain | Own feed used? |
|---|---|
| PureGym, The Gym Group, JD Gyms, Nuffield Health, David Lloyd, Bannatyne, Better/GLL, Freedom Leisure, Snap Fitness, Places Leisure, Virgin Active, Village Gym, Total Fitness, Third Space, Fitness First, 24/7 Fitness, Simply Gym | **Used** — operator branch page fetched, provenance `operator:<key>` (`30-COVERAGE-REPORT.md:57-93`) |
| Anytime Fitness, Everyone Active, énergie, Everlast | **Evaluated and NOT used** — all four are behind Incapsula/Cloudflare bot-mitigation that blocked even a `robots.txt` GET (`03-sources-operators-industry.md:36,40,42`, `30-COVERAGE-REPORT.md:92-93,133-135`). Their rows come only from Active Places `operatorname` or Overture `brand`, never the operator's own page. |
| Sports Direct Fitness / Everlast Gyms+ | Same as Everlast above — not separately fetched |
| Xercise4Less | Retired brand, absorbed into JD Gyms (`03-sources-operators-industry.md:43`) — not a live target |
| Ultimate Performance | Not a chain researched under this name; "Ultimate Fitness" was flagged "not clearly identified as a distinct current UK chain" (`03-sources-operators-industry.md:58`) — treat as **unresolved**, not evaluated |
| Snap Fitness, Bannatyne, Village, Everyone Active, Better/GLL, Places Leisure | See table above (own feed for all but Everyone Active) |
| Gymbox, CrossFit affiliate map | Evaluated; Gymbox BLOCKED (Cloudflare), CrossFit flagged TERMS-SENSITIVE and not scraped (`03-sources-operators-industry.md:46,50`) — CrossFit's 474 dataset rows (see §2) come from Overture/Active Places, not the official map |

### 1.4 National register verdicts, one line each
- **Sport England Active Places**: **USED** (canonical). England only.
- **Active Places NI**: **USED** (canonical), 8-years-stale per its own portal.
- **DataMapWales**: **USED** (canonical), only 97 rows nationwide, dated 2022.
- **sportscotland**: **evaluated, ruled canonical, NOT YET ACQUIRED** — blocked on a free account the founder has not yet registered (`TASKBOARD.md:2430-2436`).
- **Sport Wales** (a distinct facility register beyond DataMapWales): **evaluated and found not to exist** — "Sport Wales does not publish an open facility database" (`02-sources-scotland-wales-ni.md:64-68`).
- **Sport NI**: same organisation as Active Places NI above — used.
- **OS POI**: **evaluated and rejected** on cost/licence (paid/PSGA-gated, GD-02).
- **OSM**: **evaluated, ruled cross-check-only, never actually run** (Overpass unreachable from the build container).
- **Companies House**: **used**, candidate-signal only, never a standalone venue source.
- **VOA**: **evaluated and rejected on licence** (GD-16) — this is the one source the founder's brief and doc 09 explicitly expected to use and it was pulled, found non-compliant, and deleted the same day.

---

## 2. Dataset statistics (independently recomputed)

Command: `python3` reading the decompressed `uk-gyms.v1.jsonl` (46,817
lines) directly, `collections.Counter` over each field. All figures
below matched the pipeline's own `coverage.v1.json`/`30-COVERAGE-REPORT.md`
on independent recount.

**Total: 46,817 canonical venues.** Status: `open` 44,210, `closed`
2,428, `pending` 179.

**By nation** (field: `country`, set by the pipeline from ONSPD/Overture,
not derived by me from postcode area — the pipeline's own `country`
field was read directly): England 40,075, Scotland 3,169, Wales 1,854,
Northern Ireland 1,353, unresolved (`null`) 366 (Overture coordinate-only
rows outside the GD-21 3 km ONSPD-sector fallback radius).

**By venue type** (`venue_type`, GD-03's 12 output categories, `excluded`
never appears in the canonical file):
independent_gym 16,759 · martial_arts 11,863 · other_fitness 7,808 ·
commercial_gym 5,262 · leisure_centre 2,583 · boutique_studio 1,002 ·
crossfit_functional 508 · health_club 401 · strength_gym 343 ·
womens_gym 214 · university_gym 55 · hotel_gym 19.

Read against the founder's category list: bodybuilding-specific and
powerlifting/strongman have **no dedicated `venue_type`** — they fold
into `independent_gym` or `strength_gym` by name-token classification
only (GD-03's last-resort tier); there is no source-evidenced
powerlifting/strongman classifier (the British Powerlifting/BDFPA club
lists identified in doc 03 §72-84 were **never wired into the
pipeline** — confirmed by their absence from the source table in §1.1
above and from every `source` value observed in the data, see §2
"top 30 brands" below, none of which is a powerlifting federation).

**Top 30 brands, by `brand_key`** (`Counter(r['brand_key'] for r in rows
if r['brand_key'])`, 3,556 of 46,817 rows carry a brand, 7.6%):
puregym 501, crossfit 474, the-gym-group 379, better 252,
anytime-fitness 243, fitness-first 194, everyone-active 166, jd-gyms 134,
nuffield-health 130, david-lloyd 128, energie 127, freedom-leisure 123,
snap-fitness 120, places-leisure 96, everlast 77, bannatyne 76,
virgin-active 74, f45 62, total-fitness 56, village-gym 40,
simply-gym 21, ultimate-fitness 16, third-space 15, parkwood-leisure 13,
247-fitness 12, gymbox 12, 1rebel 11, serco-leisure 4. (Only 28 distinct
brand keys exist in the whole file — there is no 29th/30th brand; the
long tail below rank 28 is zero.)

**Field completeness** (independently computed, `n = 46,817`):

| Field | Present | % |
|---|---:|---:|
| Coordinates (lat & lng) | 46,767 | 99.9% |
| Postcode | 42,520 | 90.8% |
| Town | 46,699 | 99.7% |
| Brand | 3,556 | 7.6% |
| Website | 38,295 | 81.8% |
| Phone | 40,309 | 86.1% |
| External source id (every row has ≥1 `source_records[].source_record_id`) | 46,817 | 100% |

**Postcode validity** (regex `^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$`
applied to all 42,520 rows carrying a postcode): **42,520/42,520 valid
(100.00%)**. The pipeline only ever writes a postcode it has already
regex-validated at intake, so this is a check of pipeline discipline,
not a discovery — no venue carries a malformed postcode string, but
90.8% is the real coverage ceiling: the other 9.2% (4,297 rows,
predominantly coordinate-only Overture rows, GD-21) carry **no**
postcode at all and were not counted as "invalid," they are absent.

**Pending/unverified/closed proportions**: `verification_status` —
single_source 40,674 (86.9%), multi_source 5,512 (11.8%),
operator_unconfirmed 631 (1.3%). `needs_review_reason` = 'not_in_operator_feed'
on exactly those 631 rows (GD-26). Status `pending` (unmoderated user
submissions or awaiting a second confirmer) = 179 rows (0.4%). Status
`closed` = 2,428 (5.2%) — a permanently retained history row, never
deleted (GD-07).

**Review-tier distribution** (`data/gyms/review-queue.v1.jsonl.gz` and
`review-weak.v1.jsonl.gz`, decompressed and counted directly):
`possible_duplicate` "likely" tier (moderator queue) 1,265 pairs;
`possible_independent_gym` (Companies House premises-like, no venue
match) 2,702; `possible_duplicate` "weak" tier (proximity-only, **nobody
is asked to work this queue**, GD-23) 10,743 pairs.

**Coordinate/area source**: `coord_source` — `source` 46,685,
`postcode_sector` centroid 82, `none` 50. `area_source` — `postcode`
42,520, `nearest_sector` (≤3 km fallback, GD-21) 4,037, unresolved
(`null`) 260 (all `open`, no ONSPD sector centroid within 3 km of a
coordinate-only row).

---

## 3. Chain coverage check

I did not re-fetch all 20 operators' own pages independently — the
source docs already carried out that exact exercise **the day before
this audit** (2026-09-06), with URLs, quoted text and dates, and
re-running twenty fetches to reproduce numbers already evidenced within
24 hours would not improve the estimate; I instead recomputed each
chain's dataset count independently from the raw file (below) and paired
it against the ALREADY-SOURCED public count, citing where each public
figure came from. Where a source doc's figure was itself only a search
summary (marked "(unverified, secondary)" in doc 03), I carry that
caveat through rather than presenting it as fact.

Dataset counts recomputed as `brand_key` matches from `uk-gyms.v1.jsonl`
directly (same command as §2); "own feed" = provenance
`operator:<key>` sub-count, independently recounted from
`source_records[].source`.

| Chain | Dataset ("any source") | Dataset ("own feed" only) | Public count cited | Public source | Estimated recall (any-source / public) |
|---|---:|---:|---:|---|---:|
| PureGym | 501 | 480 | 450+ (own site) / 362-400+ (secondary range) | `03-sources-operators-industry.md:30`, puregym.com/gyms/, Wikipedia | ~100-111% against 450, higher against the lower secondary figures — own-site figure is the more current, dataset is roughly at parity |
| The Gym Group | 379 | 267 | 264 (H1 2026, plc press release) | `tggplc.com` press release cited at `03:31` | 143% ("any source" inflated by Active Places/Overture rows not in the operator's own feed — own-feed count 267 is the tight match, 101%) |
| JD Gyms | 134 | 103 | 114 (sitemap-counted, exact) | jdgyms.co.uk `sitemap.xml`, direct count `03:32` | 118% any-source, 90% own-feed |
| Anytime Fitness | 243 | 0 | 185-190 (secondary, ScrapeHero/Statista via search summary) | `03:42` — unverified secondary | ~128-131%, but **0% own-feed** (site was BLOCKED, Incapsula) — every one of these 243 rows is Active Places `operatorname` or Overture `brand`, never confirmed against Anytime's own list |
| David Lloyd | 128 | 107 | 114 UK (secondary, aggregator site) / 149 UK+Europe | `03:34` — unverified secondary | ~112% any-source against the weaker secondary figure |
| Nuffield Health | 130 | 108 | ~109-111 (own site copy) | nuffieldhealth.com/gyms, `03:33` | ~117-119% any-source, ~97-99% own-feed (near parity) |
| Bannatyne | 76 | 65 | 68-72 (range) / "over 60" (own copy) | `03:39` | ~106-112% any-source |
| Everlast (Sports Direct Fitness) | 77 | 0 | ~60 UK & Ireland | `03:57`, Wikipedia — Everlast Gyms | ~128%, but **0% own-feed** (never fetched) |
| Snap Fitness | 120 | 107 | 100-111 UK & Ireland (own press: "100th club" milestone) | `03:41` | ~108-120% any-source |
| Energie (énergie) | 127 | 0 | 60-70+ (secondary, franchise directory) | `03:40` — unverified secondary | ~181-212%, but **0% own-feed** (site BLOCKED, Cloudflare JS challenge) — this figure is the least trustworthy in the table; the public figure itself is the weakest-sourced |
| Total Fitness | 56 | 2 | 15 (own "About" copy) | `03:45` | 373% any-source / 13% own-feed — the "any source" figure is almost entirely NOT Total Fitness's own confirmed estate; treat as noise (see `operator_unconfirmed`, §2: 54 of these 56 are flagged `not_in_operator_feed`) |
| Village Gym | 40 | 34 | 33 (own location-list page) | `03:44` | 121% any-source, 103% own-feed (near-exact match) |
| Everyone Active | 166 | 0 | 240+ managed sites, 65+ local authorities (own copy via search) | `03:36` | ~69%, **0% own-feed** (site BLOCKED) — this is the one chain where the dataset almost certainly UNDER-counts the public claim, since the operator's own page was never reachable |
| Better/GLL | 252 | 164 | 240 public sports/leisure sites (own copy) | `03:35` | 105% any-source, 68% own-feed |
| Places Leisure | 96 | 86 | 67 (pools-only ranking, not a full-estate count — different denominator) | `03:51` | Not directly comparable — the public figure counts pools only |
| Sports Direct Fitness / Xercise4Less | — | — | Xercise4Less: retired, absorbed into JD Gyms (`03:43`) | n/a | n/a — brand does not exist standalone; folding it into the JD Gyms count above is correct per doc 03's own ruling |
| Ultimate Performance | Not found under this exact name; "Ultimate Fitness" 16 (any-source), 0 own-feed | n/a | Doc 03 could not confirm a standalone "Ultimate Fitness"/"Ultimate Performance" find-a-gym surface (`03:58`) — **treat this chain as unresolved in both the research and this dataset**, not a confirmed miss | n/a | Cannot be computed — no reliable public denominator exists |
| Third Space | 15 | 15 | 13-16 London clubs | `03:47` | 94-115% — exact-ish match, and per GD-25 Third Space's own adapter previously produced a >2,000-character venue name that was caught and rejected at normalisation (see §5) |
| Virgin Active | 74 | 27 | ~43 (secondary, one source also cites 31 as a "Social Wellness Clubs" subset) | `03:38` — unverified secondary | 172% any-source / 63% own-feed — the "any source" figure is likely inflated by Active Places rows not matched to the current estate (47 of Virgin Active's 74 are `operator_unconfirmed`, see §2 table) |
| Fitness First | 194 | 21 | ~39 clubs (down from a larger historical estate after a 2020s restructuring) | `03:37` | 497% any-source / 54% own-feed — **the widest gap in the table**: 173 of Fitness First's 194 rows are `operator_unconfirmed` (`not_in_operator_feed`, per §2), almost certainly historic Active Places rows for clubs Fitness First has since closed or sold under its 2020s downsizing; the dataset is carrying stale brand attribution at a scale the pipeline's own GD-26 flag was built to catch and rank down, and the raw "any source" number should never be read as Fitness First's live estate |

**Reading across the table**: recall against a chain's own current
estate is high (Village Gym, Third Space, Nuffield, The Gym Group's
own-feed count, Bannatyne) where the operator's page was actually
fetched. Recall is structurally uncheckable for the four
Cloudflare/Incapsula-blocked chains (Everyone Active, Anytime Fitness,
énergie, Everlast) — their dataset counts come only from third-party
corroboration and could be over- or under-counted with no way to tell
from this pipeline alone; `operator_unconfirmed` (§2, 631 rows total) is
exactly the pipeline's own admission of this, concentrated in Fitness
First (173), The Gym Group (112), Better (89), Total Fitness (54) and
Virgin Active (47).

---

## 4. Spot checks

Method: exact and partial name search against `uk-gyms.v1.jsonl`
(`name`/`display_name` substring match, case-folded), independently for
each case, shown with full identifying fields.

| Case | Result | Evidence |
|---|---|---|
| PureGym Motherwell | **HIT** | `PureGym Motherwell` · Motherwell · ML1 1LX · 55.7887,-3.9898 · brand `puregym` · open · multi_source |
| Volt Gym, Burscough | **HIT** | `Volt Gym` · Burscough · L40 8TG · 53.5889,-2.8655 · voltgym.co.uk · open · single_source (the founder's own named test case, GD-15/GD-16/GD-17) |
| Strength Asylum, Stoke | **HIT** | `Strength Asylum` · Stoke-on-Trent · ST1 3LY · 53.0214,-2.1659 · open |
| Temple Gym, Birmingham | **MISS** | Three "Temple Gym"-named rows exist (Barnsley ×2 incl. one closed, Wincanton, Torquay) — **none in Birmingham**. Search for `temple`+`birmingham` jointly returns zero rows. |
| The Muscle Works, Enfield | **MISS** | The dataset holds a distinct "Muscleworks" chain (London, Orpington, Southwark) but no venue named "Muscle Works" (or "Muscleworks") in Enfield. |
| Ministry of Muscle | **HIT, but likely stale** | `Ministry Of Muscle` · Aylesford · ME20 7JZ — status **closed** |
| Kris Gethin Gyms | **MISS** | Zero rows match `kris` or `gethin` in name/display_name anywhere in the file. (Kris Gethin Gyms' UK franchise presence was short-lived; this may be a correct absence rather than a coverage gap — not independently confirmed either way this session.) |
| Monster Gym, Cheshunt | **PARTIAL / misattributed town** | A row exists with `name: "Monster Gym Cheshunt"` but `display_name: "Monster Gymnasium Ltd"` and `town: "Waltham Cross"` (postcode EN8 9SU) — the submitted/sourced name says Cheshunt, the resolved town field says Waltham Cross (these are adjacent settlements sharing postcodes; not necessarily wrong, but the display name has silently dropped the town the source called it). |
| Physique Warehouse Gym | **HIT, but display name is wrong** | `name: "Physique Warehouse"`, West Molesey, KT8 2TU, multi_source (2 sources), but **`display_name: "PhysicallyFit"`** — a different, unrelated-looking name is what the app would actually show a user searching "Physique Warehouse." Confirmed website is `thephysiquewarehouse.co.uk`, so the underlying venue is correctly identified; the display-name composition step has substituted the wrong source's name. |
| Iron Works Gym (any) | **PARTIAL** | "The Ironworks Gym," Clacton-on-Sea — a genuine, differently-branded hit exists; "Iron Works" as a compound also full-text-matches an unrelated martial-arts venue (false-positive risk of loose substring search, not a pipeline defect). |
| CrossFit box, Glasgow | **HIT** | `CrossFit Glasgow` · Glasgow · G5, `venue_type: crossfit_functional`, open — plus 4 more Glasgow-area CrossFit boxes (CrossFit MTN, Base Fitness & CrossFit, CrossFit Astraea, Crossfit Kirkintilloch) and 2 in greater Glasgow (Hamilton, Clydebank). |
| Council leisure centre, Motherwell | **HIT with an unresolved duplicate** | "Ravenscraig Regional Sports Centre, Motherwell" (ML1) and "Ravenscraig Regional Sport Centre" (ML1) are **two separate rows**, ~1.9 km apart by lat/lng, both sourced from Overture only (no Active Places corroboration for either), both classified `independent_gym` (not `leisure_centre`) — see §5 for why this pair escaped both review queues. "Ravenscraig Sports Centre" (Greenock, unrelated town) is a third, correctly distinct row. "Motherwell Aquatics" as a standalone name does not exist in the file (plausibly the pool wing of the same complex, not a separate source name — not necessarily a gap). |
| PureGym, Belfast | **HIT** | `PureGym Belfast Adelaide Street` · BT2 8GD · multi_source (operator feed + Overture) — plus 12 further Northern Ireland PureGym branches (Antrim, Ballymena ×2, Bangor, Coleraine, Craigavon, Derry/Londonderry, Dungannon, Lisburn, Newry, Newtownabbey, Boucher Road) |
| Gym, Cardiff | **HIT (volume)** | 251 rows carry `town` containing "Cardiff" |
| Gym, Aberdeen | **HIT (volume)** | 157 rows |
| Gym, Inverness | **HIT (volume)** | 48 rows |
| Gym, Truro | **HIT (volume)** | 49 rows |
| Gym, Isle of Wight | **HIT (volume), with noise** | 127 rows across IOW outward codes (PO30-PO41); includes plausible non-gym entries (a hotel, e.g. "Bembridge Coast Hotel") that were pulled in as `other_fitness`/hotel-adjacent — expected given GD-03's inclusive net, not a miss |
| Gym, Shetland | **HIT (low volume), with a classification error** | 6 rows on `ZE` outward codes: Shetland Weight Training Club, Gym Gair, SL Fitness, Shetland Budokai, Mossbank Community Gym — plus **"Breckenlea Shetland Pony Stud"**, a horse-riding livery business that has clearly been pulled into the fitness-category dataset by a category- or name-token false positive. This is a concrete, named data-quality defect, not a hypothetical one. |

**Hit/miss tally**: 15 clear hits, 2 clear misses (Temple Gym Birmingham,
The Muscle Works Enfield), 1 unconfirmed-absence (Kris Gethin — may be a
correct absence), 2 partial (Monster Gym Cheshunt's town field, Iron
Works generic), 1 hit-but-wrong-display-name (Physique Warehouse), 1
hit-with-uncaught-duplicate (Ravenscraig, Motherwell), 1 hit-with-false-
positive noise (Shetland pony stud). **What a miss looks like**: the
gym's actual UK trading name does not appear in `name` or `display_name`
under any of the source spellings tried — consistent with the coverage
report's own admission that Everyone Active/Anytime Fitness/énergie/
Everlast were never fetched from their own sites and that four
operators plus the whole of Wales run thin (§1, §3).

---

## 5. Identity and hygiene

**Canonical id scheme**: a deterministic UUIDv5-style hash (RFC 4122
§4.3, SHA-1, `scripts/gyms/lib/uuid.js:1-40`) computed over the "best"
cluster member's `source:source_record_id` key
(`scripts/gyms/build.mjs:247`, `uuidv5(keyOf(best))`), against a fixed
namespace UUID. **This is stable only as long as the pipeline keeps
choosing the same cluster member as "best."** If a fresher, higher-
priority source (e.g. an operator feed acquired for the first time)
displaces the previously-"best" member of an existing cluster, the same
physical venue gets a **new** `id` on the next rebuild — the scheme is
deterministic given fixed inputs, not permanent across pipeline runs
with changing inputs. `gym_venues.id` in the cloud schema has no
separate mechanism to preserve identity across such a change (no
"previous id" column; `succeeded_by` exists only for moderator-actioned
merges/closures, not for a `best`-member reselection). This is a real,
evidenced hygiene gap, not a hypothetical one, given how much of the
inflow is expected to keep changing (sportscotland unlock, more operator
feeds, later Overture releases).

**Dedupe method and observed duplicate rate**: multi-signal blocking +
scoring, §1.2 above. I independently sampled 200 of the 1,265
`possible_duplicate` "likely"-tier review pairs (`random.seed(7)`) and
checked, per pair, whether the two names are text-similar
(`difflib.SequenceMatcher` ratio > 0.55 on folded names) and whether
they share a postcode:

```
of 200 sampled 'likely' pairs: same postcode 87 (43.5%),
name-similar (ratio>0.55) 80 (40.0%), both 31 (15.5%)
```

Reading the actual pairs (examples, verbatim): `'Places Gym Sheffield'
[S20 7JJ] <-> 'Sam Jones' [S20 7JJ]` (score 4, same postcode + same
phone) and `'Freedom Leisure Portslade Sports Centre' [BN41 2WS] <->
'Brighton & Hove City Council' [BN41 2WS]` (score 4, same postcode +
same phone) are **not duplicates** — they are two different businesses
sharing a phone number or postcode unit (a shared-reception building, a
council switchboard), which the scoring model has no way to distinguish
from a genuine duplicate at score 4. Genuine likely duplicates also
appear in the sample (`'The Cambridge Belfry' <-> 'Cambridge Belfry
Health Club'`, `'Inshape Health Club' <-> 'Inshape GYM Louth'`, both
same postcode). **Estimate: roughly 15-40% of the "likely" moderator
queue is a genuine same-venue pair; the remainder is same-building/
same-phone noise that a human moderator, not the score alone, must
resolve** — the queue is correctly named "review," not "confirmed
duplicate," and the pipeline does not claim otherwise, but no person is
assigned to work it today (it is a generated file, not a queue with a
UI or a moderator screen — see §6).

**A concrete uncaught duplicate**: the Motherwell "Ravenscraig" pair
(§4) does **not** appear in either `review-queue.v1.jsonl` or
`review-weak.v1.jsonl`, confirmed by `grep -i ravenscraig` against both
decompressed files returning nothing. Both rows carry `postcode: null`
(Overture coordinate-only), their `sector` values differ (postcode-
sector-token blocking never pairs them), and they sit roughly 1.9 km
apart, correctly outside the 250 m grid-cell blocking radius. **This is
a real gap in the blocking strategy**: two rows with no postcode, a
shared brand-less near-identical name, and a distance too far for the
250 m grid but well within what a human would recognise as "the same
sports centre," are invisible to every blocking pass and so never even
reach the review queue, let alone get merged.

**Branch identity** ("PureGym Glasgow" vs "PureGym Glasgow Bath
Street"): resolves correctly for PureGym specifically —
`composeBrandBranch` (GD-18/GD-22) composes brand + branch names from
the operator's own feed, and the Belfast/Motherwell spot checks (§4)
show correctly distinct, fully-qualified branch names
("PureGym Belfast Adelaide Street," "PureGym Newtownabbey," etc., never
a bare "PureGym Belfast"). GD-25 additionally guards against a branch
name that repeats the brand or drags in the outward code as a word.

**Operator/brand normalisation**: `gym_brands` holds 28 keys with
alias lists (`brands.v1.json`); client-side `BRAND_ALIASES`
(`src/lib/gyms/rank.js:24-45`) duplicates 20 of those for ranking. Brand
attribution follows the freshest-source-wins rule (GD-19); a stale
brand from a source the current operator feed no longer confirms is
demoted, not deleted (`operator_unconfirmed`, GD-26, 631 rows, §2).

**Town casing**: **0 of 46,817 rows have a fully upper-case town**
(independently checked: `sum(1 for r in rows if r['town'] ==
r['town'].upper() and r['town'] != r['town'].lower())` → 0), confirming
GD-26's casing fix (Active Places towns like "WOLVERHAMPTON" are title-
cased on the way in) has actually landed in the shipped file, not just
been ruled.

**Coordinate precision**: `coord_source` is `source` (native to the
originating dataset, typically 5-8 decimal places, sub-metre to ~1 m
resolution) for 46,685 rows, `postcode_sector` centroid (a few hundred
metres to a few km of true position) for 82 rows, `none` for 50. No
separate precision/accuracy field is stored — a consumer cannot tell a
±1 m coordinate from a several-hundred-metre sector centroid without
cross-referencing `coord_source`.

**Postcode validity rate**: 100% of the 42,520 rows carrying a postcode
match the standard UK postcode regex (§2) — a pipeline-discipline
result, not evidence that 100% of postcodes are geographically correct
(regex validity ≠ correctness; no independent ONSPD cross-check of
"does this postcode actually exist" was run by me for this audit beyond
what geocode.mjs already does at intake).

**Name bounds**: shortest name observed 2 characters, longest 74
("Clubbercise/Broadway Boogie/Pound Arlesey and Lower Stondon with
Gabriella") — GD-25's 80-character/8-token cap is a hard **rejection**
gate at normalisation (names longer than that fall back to brand+town),
so 74 is inside the cap, not evidence the cap failed; several names in
the 65-74 range read as awkward multi-class-listing strings rather than
a single venue name (e.g. "Nuffield Health Wolverhampton Fitness &
Wellbeing Gym Wolverhampton" at 67 chars — a literal brand-repeats-town-
twice case the GD-25 fix targets but this particular one slipped
through under the 80-char ceiling).

---

## 6. Add-gym path

**Client form** (`src/screens/CommunityGymAddScreen.js`, GD-11): name,
address line, town, postcode, optional website, optional operator.

**What `gym_submissions` stores** (`supabase/migrate_162_gym_directory.sql:336-353`):
`id, submitter_id, name, address_line, town, postcode, website, operator,
lat, lng, status, duplicate_of, confirmations, created_at, reviewed_at,
reviewed_by`. Status is constrained to `pending | verified | rejected |
merged | duplicate`.

**Server-side validation and duplicate detection** (`gyms_submit`,
`migrate_162_gym_directory.sql:990-1229`):
- Every free-text field (`name`, `address_line`, `town`, `operator`,
  `website`) passes through `_community_clean_text`, the same ED-
  vocabulary blocked-terms gate every other Community free-text field
  uses (line 1035-1039) — a blocked term refuses the whole submission
  with `content_not_allowed`.
- Length caps: name 1-60, address 1-200, town 1-80, website ≤200 and
  must match `^https?://`, operator ≤80 (lines 1049-1063).
- Postcode must pass `_gyms_postcode_full_valid` AND resolve to a known
  ONSPD sector in `gym_postcode_sectors` — an unseeded sector (sectors
  not yet loaded from the seed chunks) refuses as `invalid_postcode`
  even for a genuinely valid postcode (line 1064-1077,
  `TASKBOARD.md:2422-2426` confirms sectors must be seeded before
  venues).
- Rate limit: 3 submissions per 24 hours per user (`_community_rate_check`,
  line 1068).
- Geocoding: **always the postcode SECTOR centroid**, never the exact
  address (line 1081-1084, `coord_source: 'postcode_sector'`) — a
  deliberate choice recorded in-line as a fix for finding 9 (two
  submissions in the same sector previously collided at distance 0).
- Duplicate detection: text-only match, **not distance-based** (finding
  9's fix) — same postcode unit AND token Jaccard ≥0.6, OR same outward
  code AND Jaccard ≥0.85 (lines 1097-1109), restricted to rows the
  submitter can see (`_gyms_visible`). A hit returns `{duplicate_of,
  display_name}` rather than creating a new row.
- A second, separate scan (lines 1127-1177, review-35 finding 22's fix)
  catches a **twin pending submission from a different user that the
  first submitter cannot see** (same text-match rule, no visibility
  filter, restricted to `status = 'pending'`): rather than creating a
  second duplicate pending row, the second submitter is recorded as an
  independent confirmer on the existing pending venue via the same
  confirm-and-maybe-flip sequence `gyms_confirm_submission` uses.
- Classification: `operator` field, if it folds to a known brand alias,
  sets `venue_type = 'commercial_gym'` and links the brand; otherwise
  the submission defaults to `independent_gym` (lines 1179-1190) — the
  only classification signal a garbage/absent operator field gets.

**Review tiers / when a submission becomes selectable**: `pending`
immediately on insert, immediately selectable **by its own submitter**
(the submitter is recorded as the first implicit `confirm` actor, lines
1220-1226). Visible to **everyone else** only after a second, distinct
confirmer (another user confirming it, or the twin-submission path
above) or a moderator's `gyms_review_submission(_id, 'approve', …)`
(lines 1367-1406) — there is **no auto-approve** path; every new
independent gym starts invisible to the wider Community until one of
those two things happens.

**Moderator actions available** (`gyms_review_submission`, lines
1367-1462; `gyms_review_report`, lines 1464-1518): `approve` (flips
`pending → open`, guarded to only act on a still-`pending` row since the
re-review fix), `reject` (flips `pending → closed`,
`verification_status = 'rejected'`, same `pending`-only guard as of the
re-review fix), `merge` (flips the source row to `merged`, sets
`succeeded_by`, re-points any `community_profiles.gym_id`/`other_gym_ids`
that referenced it, refuses a self-merge or a non-existent target).
`gyms_report` (lines 1308-1367, GD-12) lets any user flag `closed |
wrong_name | wrong_location | duplicate_of | not_a_gym | other` with an
optional detail string (also passed through the blocked-terms gate);
two independent reports of the same kind flag the row for moderator
review (not user-visible directly). **Rename/rebrand as a distinct
first-class action does not exist** — a rename is only reachable via a
moderator manually editing the row (no dedicated RPC for it was found in
this file) or via the report+moderator-review path with kind
`wrong_name`, which flags but does not itself apply a fix.

**Can garbage enter the canonical set?** Only as a `pending` row,
invisible to anyone but the submitter and any independent confirmer,
until a second confirmer or a moderator acts. The blocked-terms gate
stops ED-adjacent and other disallowed vocabulary at submission (device
checklist item 16, `40-VERIFICATION.md:130-138`, confirmed directly in
`CommunityGymAddScreen.js:41-46,96` — refused with a generic, non-
shaming message). A submission that is merely low-quality but not
blocked-vocabulary (a wrong postcode paired with a real gym's name, a
nonsense-but-clean name, a real address for a business that is not
actually a gym) is **not caught by any field beyond length/postcode-
shape/blocked-terms** — nothing validates that a submitted name is
plausible or that the address is actually a fitness venue. Two
strangers each submitting an identical low-quality entry can jointly
confirm it into `open`/`user_submitted_verified` status with **no
moderator ever seeing it** (review 35 finding 22, an accepted privacy
trade-off, not a defect — the moderator queue is the stated backstop,
but it is a backstop that only activates on a report, not proactively).

---

## 7. Missing-venue methodology

**What the pipeline does today to find venues it lacks: effectively
nothing, beyond user submissions.** There is no scheduled diff against a
live source, no OSM-gap-detection pass (ruled in principle, `01-...md:186-193`,
but never executed — every Overpass mirror was unreachable from the
build container, `30-COVERAGE-REPORT.md:135-138`), and no automated
"here is a venue in source X we don't have" alert. The only two
mechanisms that surface an unknown venue are (a) a user hitting "Can't
find your gym? Add it" (§6) and (b) a full pipeline re-run against a
newly-acquired or refreshed source, which is a manual, agent-run process
(`scripts/gyms/run-all.mjs`), not a scheduled job — no cron, GitHub
Actions workflow, or Supabase scheduled function was found referencing
any `scripts/gyms/*` script (checked: no `.github/workflows/*gym*` file
exists in the repo).

**Evaluated proposals for reaching comprehensive UK coverage** (from
`docs/gym-database-2026-09-06/01`, `02`, `11`; not implemented, evidence
only, per this audit's read-only mandate):

| Proposal | Coverage gain (evidenced) | Licence compatibility for bundling | Effort (evidenced) |
|---|---|---|---|
| sportscotland Sports Facilities (Active Places NI's Scottish sibling) | Unmeasured — access itself is blocked pending a free account (`02-sources-scotland-wales-ni.md:33-36`); Scotland currently sits on Overture+operators+Companies House only (3,169 rows) | OGL v3, once the account is live — compatible | Low once unblocked: a founder registers a free account (`TASKBOARD.md:2430,2436`) and sends the WFS/download link; no re-architecture needed, this is GD-02's own canonical-source slot already reserved |
| OS Points of Interest (paid) | Unmeasured — no comparison pull was ever authorised | Commercial/PSGA-gated, no public price found (`01-...md:96-101`) | Founder spend decision required first; technical effort otherwise low (a documented, mature API) |
| OS Open Names | N/A for venue names — gazetteer of place names, not individual gym addresses (`01-...md:112-113`) | OGL, compatible | Not applicable to this use case as a venue source |
| OSM `leisure=fitness_centre` / `amenity=gym` | Unmeasured UK count — "UK counts not obtained... get exact figures from taginfo... before relying on any OSM density estimate" (`01-...md:211-214`), i.e. the source docs explicitly flag this as never quantified | ODbL 1.0 — **direct copy into the canonical DB triggers share-alike and is ruled DO NOT USE without a dedicated legal read** (`01-...md:185-193,302`); gap-detection-only use (never storing OSM content) is "clean, low-risk" but was never executed | Not attempted — every Overpass mirror was unreachable from the build container this session, so even the "clean" cross-check use was never run |
| Google Places (runtime backfill) | N/A — terms forbid storing anything but the Place ID indefinitely; usable only as a live onboarding "search for your gym" lookup, never a bulk import (`01-...md:134-153`) | Explicitly **incompatible with bundling/storing** beyond a place-id pointer | Would need Google Cloud billing setup; a founder cost decision, separate from the licence question |
| Foursquare Open Source Places (direct, not via Overture) | Its rows already reach the dataset pre-conflated inside Overture (GD-17); a direct pull would only matter if it carried rows Overture's own Foursquare-sourced conflation missed — unmeasured, and the direct route is gated behind a Hugging Face account (`30-COVERAGE-REPORT.md:148-150`) | Apache 2.0 — compatible, no share-alike | Low if the account gate is accepted; not pursued because the marginal gain over the already-used Overture route is unmeasured and unlikely to be large |
| Operator feeds not yet fetched (Everyone Active, Anytime Fitness, énergie, Everlast/Sports Direct Fitness) | Direct gain per chain is bounded by that chain's total estate (§3: Everyone Active 240+, Anytime Fitness 185-190, énergie 60-70+, Everlast ~60 — a combined public-claim ceiling in the 545-560 range against the dataset's current "any source" counts of 166+243+127+77=613, meaning the dataset already sits at or above the public estimate for these four via non-operator sources, but with **zero own-feed confirmation**) | Would require solving the Cloudflare/Incapsula bot-mitigation blocking each site — not a licence question, an access-engineering one; the source docs recommend "manual spot-checks or a licensed data source instead" (`03-sources-operators-industry.md:151`) | Non-trivial: each site actively blocks automated fetching, so a compliant route (an API partnership, or manual entry) would be needed, not a bigger scraper |
| User reports / corrections at scale (already built, GD-12) | The existing mechanism, already wired; its bottleneck is a lack of any proactive prompt to users to report a missing gym (only a passive "Can't find your gym? Add it" entry point) | N/A — first-party data | Already built; the gap is product/UX, not data acquisition |

No concrete new-source implementation is proposed here — this is
evidence for the founder's own future decision, per the read-only
mandate.

---

## 8. App-side loading

**No bundled asset.** `data/gyms/*.gz` and `uk-gyms.v1.jsonl` are
**pipeline artefacts only** — inputs to `scripts/gyms/seed-sql.mjs`,
which generates `supabase/seed_gyms_v1/` (gitignored, regenerated at
apply time, GD-24/GD-25) for a one-time cloud seed. Confirmed by search:
no reference to `uk-gyms`, `data/gyms`, or any gym JSONL exists anywhere
under `src/` (`grep -rn "uk-gyms\|data/gyms" src/` → zero hits outside
`scripts/gyms` and `docs/`). The app never reads the JSONL/gzip files
directly, at build time or runtime.

**All reads and writes go through Supabase RPCs**, via
`src/lib/gyms/index.js` → `src/lib/gyms/transport.js` (`callGyms`) →
`src/lib/community/transport.js` (`callCommunity`) → the same
Community Supabase transport gates (sign-out wipe guard, Article 9
consent, session) every other Community read uses
(`src/lib/gyms/transport.js:1-21`). There is **no SQLite table, no
in-memory cache, and no local index** for gyms anywhere in `src/lib/gyms`
or `src/lib/database.js` (checked: no `gym` table/migration exists in
`src/lib/database.js`'s schema).

**Search index semantics** live entirely server-side in `gyms_search`
(`migrate_162_gym_directory.sql:734-832`): a recognised full postcode or
outward code matches `v.outward` exactly; otherwise, up to 8 folded
query tokens match against a `text[]` tokens column
(`v.tokens && v_toks`, a Postgres array-overlap, effectively a token-set
match, not a prefix index) OR brand aliases OR `town_key`, **plus** a
prefix-match fallback bounded to the LAST token only
(`t LIKE v_last_tok || '%'`, lines 812-819) — this fallback is what
makes partial-word typing ("puregy") return results; it was previously
gated behind a supplied bounding box or a recognised outward code
(review 35 finding 21) and that gate has since been **removed** in the
current file (confirmed directly: `migrate_162_gym_directory.sql:812`
carries no coordinate/outward precondition on the prefix branch,
matching finding 21's "Status: fixed" note in
`35-REVIEW-SECURITY-GYMS.md:726`). Client-side, `rankVenues`
(`src/lib/gyms/rank.js`) re-orders the server's ≤40 candidates: brand
match (weight 1000) > town match (300) > name-token match (60) >
distance (max 200, only if a distance was supplied) — GD-09's stated
order (brand, then locality, then distance).

**Search does NOT work offline.** Every call is a `callCommunity` RPC
over Supabase; there is no local fallback, no cache, and no offline
index. `src/lib/gyms/index.js`'s own header states the app never
requests, reads, or stores a device coordinate (GD-13), and the
transport layer surfaces a distinct `offline` error code
(`GYM_ERROR_CODES`, `transport.js:33-45`) precisely because a network
failure is the expected offline behaviour, not a local-search fallback.
Device checklist item 15 confirms the expected UX: "You are offline. Try
again when you have a connection." (`40-VERIFICATION.md:126-129`).

**Cloud (162) vs bundle (`data/gyms/*.gz`) divergence and
reconciliation**: the two are reconciled by construction, not by a
sync process — the seed SQL chunks (`seed-sql.mjs`) are generated
FROM the committed canonical JSONL at apply time and are the ONLY route
data enters `gym_venues`
(besides live user submissions/moderator actions once the app is live).
There is no two-way sync: once seeded, `gym_venues` in the cloud and
`uk-gyms.v1.jsonl.gz` in the repo diverge immediately and permanently as
live user submissions, confirmations, reports and moderator actions
accumulate against the cloud table — a future pipeline re-run producing
a new `uk-gyms.v1.jsonl.gz` has **no defined merge path back into a
seeded, live `gym_venues` table** (re-running `seed-sql.mjs` against an
already-seeded cloud table would need to be additive/idempotent per
CLAUDE.md's migration rules, and the file header does say every chunk
carries `INSERT ... ON CONFLICT (id) DO UPDATE`, but a fresh pipeline
run reassigning a venue's `id` under a different "best" source member,
§5, would not update the same row — it would insert a new one and
silently orphan the old row's history/user associations. This is not
evidenced as having happened, since no re-seed after go-live has
occurred; it is a structural risk this audit surfaces from reading the
id-generation code, not an observed incident).

**Coordinates and "near me" distance**: 99.9% of rows carry
lat/lng (§2). `_gyms_distance_m` (`migrate_162_gym_directory.sql:525-543`,
not read in full line-by-line here but referenced by both `gyms_search`
and `gyms_near`) computes a haversine distance server-side; `gyms_near`
(lines 837-880) is a fully-built RPC with a bounding-box pre-filter plus
haversine ordering and a mile-band-ready radius parameter. **But nothing
in the shipped app calls it**: `near()` in `src/lib/gyms/index.js:112-117`
exists and is exported, but `GymPicker` never calls it, and the module's
own header documents why — `expo-location` is not a project dependency,
so no device coordinate is ever available to pass in
(`src/lib/gyms/index.js:1-19`). "Near me" today is reachable only
through a typed postcode's server-resolved sector centroid, never the
device's live position — this is a deliberate, recorded deviation
(GD-10), not an oversight, and it is an open founder decision
(`TASKBOARD.md:2426-2429,50-FINAL-REPORT.md:77-80`).

---

## 9. Classification: founder questions, one line each

| Question | Answer | Status |
|---|---|---|
| Is there a canonical gym database? | Yes — `data/gyms/uk-gyms.v1.jsonl.gz` (46,817 rows) plus the cloud schema in `migrate_162`, both written | **Infrastructure only** — cloud not applied to production |
| UK gym count | 46,817 canonical venues, 801% of ukactive's cited 5,842-club estimate, but that denominator is itself sample-based, not a census (`30-COVERAGE-REPORT.md:10-16`) | Partial — measured, not verified against a census |
| England coverage | 40,075 rows, canonical source Active Places (daily-updated, CC BY 4.0) | Fully sourced for the canonical layer |
| Scotland coverage | 3,169 rows, **zero from the canonical sportscotland source** — Overture + operator feeds + Companies House only, pending a founder account registration | Partial |
| Wales coverage | 1,854 rows; the one Welsh national register (DataMapWales) holds only 97 rows nationwide, dated 2022 | Partial, thin canonical layer |
| Northern Ireland coverage | 1,353 rows; canonical source (Active Places NI) is 8 years stale per its own portal | Partial, stale canonical layer |
| Major-chain coverage | 28 brands recognised; recall is strong for chains whose own page was fetched (Village Gym, Third Space, Nuffield, own-feed Gym Group), structurally unverifiable for 4 Cloudflare/Incapsula-blocked chains (§3) | Partial |
| Independent-gym coverage | 16,759 rows classified `independent_gym` (the largest single category); the founder's own named test case (Volt Gym, Burscough) is present via Companies House + Overture, exactly the mechanism GD-16/17 built for this | Fully demonstrated for the one named test case; unmeasured at scale (no independent-gym census exists to compare against) |
| Bodybuilding-specific | No dedicated `venue_type`; folds into `independent_gym`/`strength_gym` by name-token guess only | Absent as a category |
| Powerlifting/strongman | No dedicated `venue_type`; British Powerlifting/BDFPA club-finder lists identified in research (doc 03) were **never wired into the pipeline** | Absent |
| CrossFit | Dedicated `venue_type: crossfit_functional`, 508 rows, includes a real hit for the spot-checked Glasgow box, but sourced from Overture/Active Places `brand` fields, **not** the official CrossFit affiliate map (flagged terms-sensitive and not scraped) | Partial |
| Leisure centres | Dedicated `venue_type: leisure_centre`, 2,583 rows — but at least one confirmed spot-check (Ravenscraig, Motherwell) shows a leisure centre misclassified as `independent_gym` because it lacked Active Places corroboration | Partial, with an observed classification defect |
| Specialist (martial arts, boutique studio, women's, university, hotel) | All have dedicated `venue_type` values with real counts (§2) | Fully categorised as types; unmeasured for completeness against any specialist census |
| Provenance | Every row carries ≥1 `source_records` entry with source name, url, retrieval date, licence (where known) | Fully present as a data field |
| Licence | Per-source licence tracked in `data/gyms/ATTRIBUTION.md` and `source_records[].licence`; one field (`ONSPD` attribution wording) is an explicit unresolved placeholder (`ATTRIBUTION.md:25-26`) | Mostly fully documented, one open item |
| Freshness | Tracked per source (§1.1); ranges from daily (Active Places) to 8-years-stale (Active Places NI) within the same file, with no field distinguishing a fresh row from a stale one at read time beyond knowing the source | Partial — present as documentation, not as a per-row freshness flag a consumer can act on |
| Identifiers | Deterministic UUIDv5 per venue, **not stable across a "best"-source reselection** (§5) | Partial |
| Dedupe | Multi-signal blocking+scoring, ~15-40% true-positive rate in the "likely" queue by independent sample (§5), a confirmed uncaught pair (Ravenscraig) exists outside all blocking | Partial, working but measurably imperfect |
| Canonical ids | Same as "Identifiers" above | Partial |
| Coordinates | 99.9% present, precision varies by `coord_source` with no separate accuracy field | Fully present as coverage, partial as precision transparency |
| Postcode | 90.8% present, 100% regex-valid among those present | Partial |
| Town | 99.7% present, casing normalised (GD-26, confirmed 0 upper-case towns) | Fully present |
| City | No distinct "city" field beyond `town`/`local_authority_name`/`region_name` — no dedicated city-tier hierarchy field | Absent as a named field (town/LA/region cover the same ground) |
| Branch identity | Resolves correctly for PureGym in spot checks (§4); general mechanism is GD-18/22/25 name composition, evidenced working | Fully demonstrated for the tested chain |
| Operator | `brand_id`/`brand_key`/`brand_name` on 7.6% of rows; `operator_unconfirmed` flag exists for stale attribution (631 rows) | Partial (low coverage, but the field and its caveat both exist) |
| Brand | Same field as operator above; 28 recognised brands, alias table both server- and client-side | Partial |
| Status | `open`/`closed`/`pending`/`merged` all implemented and observed in the data (44,210/2,428/179/and merges via moderator action) | Fully implemented |
| Can't-find-your-gym / add gym | Full client form + server RPC with validation, blocked-terms gate, duplicate detection, rate limiting (§6) | Fully implemented (pipeline written, not yet live in production) |
| Address / postcode / geolocation (submission) | Collected, validated (regex + ONSPD-sector lookup), geocoded to sector centroid only (never exact address) | Fully implemented as specified (sector-level, by design) |
| Duplicate detection (submission) | Text-only Jaccard match, no distance component (deliberate fix, §6) | Fully implemented |
| Moderation | `gyms_review_submission`/`gyms_review_report` RPCs exist, gated on `community_is_moderator()`, with approve/reject/merge and precondition guards fixed per the re-review (§6) | Fully implemented as RPCs; **no moderator UI/screen was found in `src/screens` or `src/components`** — moderation is callable only via direct RPC invocation today, not through any app surface |
| Verification | `verification_status` field with 5 observed states (`single_source`, `multi_source`, `operator_unconfirmed`, `user_submitted_pending`, `user_submitted_verified`/`moderator_verified`) | Fully implemented as a data model |
| User corrections | `gyms_report` (GD-12), 6 report kinds, 2-independent-reports flag-for-review rule | Fully implemented (not yet live) |
| Closure | `status = 'closed'`, `closed_at` timestamp, row retained forever (GD-07) | Fully implemented |
| Rename/rebrand | **No dedicated RPC** — only reachable via the generic `wrong_name` report (flags, does not apply) or manual moderator data edit outside any RPC found | Absent as a first-class action |
| Merge | `gyms_review_submission(_id, 'merge', _merge_into)` — reassigns `succeeded_by`, migrates `community_profiles.gym_id`/`other_gym_ids`, writes history on both sides | Fully implemented |
| Rejected | `gyms_review_submission(_id, 'reject')` → `status: closed`, `verification_status: rejected` | Fully implemented |
| Pending | `status: pending`, `verification_status: user_submitted_pending`, immediately selectable by the submitter only, visible to others after a second confirmer or moderator approval | Fully implemented |

---

## Ambiguities / could not determine

1. **`40-VERIFICATION.md`'s summary of findings 22-25 appears stale
   relative to `35-REVIEW-SECURITY-GYMS.md`'s own findings table.**
   `40-VERIFICATION.md:59-61` describes findings 22-25 in a way that
   reads as still-open (e.g. "reject has no status precondition"), while
   `35-REVIEW-SECURITY-GYMS.md`'s own "New findings from this pass"
   table (lines 724-730) marks 21-24 explicitly "Status: fixed," each
   with a live re-probe quoted, and finding 25 "left as is, per lead
   ruling" (an accepted trade-off, not an open defect). I read the
   actual SQL directly (`migrate_162_gym_directory.sql:753` limit clamp
   = 40, `:812-819` no coordinate gate on the prefix branch, `:1412-1414`
   `reject` precondition present) and it matches doc 35's "fixed"
   claims, not doc 40's summary. I could not determine whether doc 40
   was written from an earlier draft of 35 and never re-synced, or
   whether there is a version of the migration file I have not seen
   that doc 40 was describing. Flagging rather than resolving, per this
   agent's read-only, evidence-first mandate.
2. **"Ultimate Performance" (the founder's named question in scope)
   does not clearly map to any chain in the research or the dataset.**
   Doc 03 could not identify a standalone "Ultimate Performance"/"Ultimate
   Fitness" find-a-gym surface (`03:58`); the dataset's `ultimate-fitness`
   brand key (16 rows) may or may not be the same commercial entity the
   founder meant. Not resolved.
3. **Kris Gethin Gyms**: zero dataset hits. I could not determine from
   any source document whether this chain has any current live UK sites
   to miss, or whether the absence is correct. Not resolved either way.
4. **Whether the ~15-40% true-duplicate estimate for the "likely" review
   queue generalises to the full 1,265-pair queue**: my sample was 200
   of 1,265 (15.8%), randomly seeded; I did not attempt a rigorous
   statistical confidence interval, and "text-similar" (`difflib` ratio
   > 0.55) is an approximation for "is this the same venue," not a
   ground-truth label — some pairs below that threshold could still be
   genuine duplicates with very different names (e.g. a rebrand), and
   some above it could still be coincidentally similar names at
   different premises. Treat the 15-40% band as directional, not exact.
5. **Whether the cloud-vs-bundle reconciliation risk in §8 (a pipeline
   re-run reassigning a venue's id and orphaning the seeded row) has
   ever actually occurred**: it has not, because the cloud table has
   never been seeded (migration not applied). This is a structural risk
   read from the code, not an observed incident, and I could not test
   it against a live table since none exists.
6. **The exact per-operator "own site" branch counts in §3 for Anytime
   Fitness, Everlast, and énergie are themselves marked "(unverified,
   secondary)" in the source research** (search-summary figures, not a
   primary-page fetch, because the operator's own site was
   bot-blocked). The recall percentages computed against them in §3
   inherit that uncertainty and should not be read as more precise than
   the weakest input.
