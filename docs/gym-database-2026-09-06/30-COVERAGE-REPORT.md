# 30: Coverage report: the UK gym master database

Measured against `data/gyms/uk-gyms.v1.jsonl.gz` (46,817 rows), read
directly with `python3`/`gzip`, cross-checked against the pipeline's own
`data/gyms/coverage.v1.md`/`coverage.v1.json` (generated
2026-09-07T02:45:15.998Z), every figure matched on independent recount
unless stated otherwise. Rulings cited are `20-BLUEPRINT.md` GD-nn.

## Headline
- **46,817 canonical venues** (44,210 `open`, 2,428 `closed`, 179
  `pending`), 801.4% of ukactive's cited 5,842 UK health & fitness clubs
  (2026 report). That 5,842 is itself a sample-based estimate, not a
  census (doc 03 §72: "sample coverage of 74% of private operators, 85%
  of public operators and 88% of independent operators", flagged there
  as "a report estimate/extrapolation, not a raw census"), 801.4% is a
  comparison against an estimated denominator, not ~8x true coverage.
- Review queue (GD-23): **3,967 likely** (1,265 `possible_duplicate` +
  2,702 `possible_independent_gym`, Companies House premises-like, no
  venue match), **10,743 weak** (`possible_duplicate`, proximity-only).
  Both confirmed by direct read of `review-queue`/`review-weak.v1.jsonl.gz`.

## By nation
England 40,075 · Scotland 3,169 · Wales 1,854 · N. Ireland 1,353 ·
unresolved 366 (Overture rows outside the GD-21 3 km fallback radius).

## By venue type
independent_gym 16,759 · martial_arts 11,863 · other_fitness 7,808 ·
commercial_gym 5,262 · leisure_centre 2,583 · boutique_studio 1,002 ·
crossfit_functional 508 · health_club 401 · strength_gym 343 ·
womens_gym 214 · university_gym 55 · hotel_gym 19 (`excluded` not
carried into the canonical file).

## Source count / coordinate source / area source
1 source: 41,147 (87.9%) · 2+ sources: 5,670 (12.1%). Coordinate source:
from-dataset 46,685 · postcode_sector centroid 82 · none 50. Area
source (GD-21): postcode 42,520 · nearest_sector (≤3 km) 4,037 ·
**null (unresolved) 260**, all `open`, no ONSPD sector centroid within
3 km; separately 4,296 open rows carry no `postcode` (coordinates-only
Overture rows).

## Local authority top 10 / bottom 10 (recomputed independently, matches `coverage.v1.md`)
Top: Birmingham 571, Leeds 554, Cornwall 490, Buckinghamshire 460,
North Yorkshire 458, Somerset 429, Glasgow City 423, Wiltshire 409,
Bristol 397, Westminster 389. Bottom: Isles of Scilly 1, Shetland
Islands 6, Orkney Islands 6, Na h-Eileanan Siar 11, Clackmannanshire 27,
East Renfrewshire 28, Blaenau Gwent 28, Merthyr Tydfil 31, Ceredigion
33, Boston/Bolsover 34 (tied).

## Postcode area top 10 / bottom 10
Top: BT 1,358, B 1,137, SW 926, S 848, NE 836, M 832, BS 810, NG 805,
BN 779, G 762 (BT leading is an artefact of NI having one outward
letter-pair nationwide, not a coverage claim, see Known gaps on Active
Places NI's age). Bottom: NPT 1, Z 1, U 1, JE 1, BF 1, C 2, F 2, ZE 6,
HS 11, KW 14.

## Operator coverage: own feed vs any source vs researched (GD-19)
"Own feed" = provenance from the operator's own branch page. "Any
source" = brand from any source. "Researched" = independent count from
doc 03, established for five operators only.

| Operator | Own feed | Any source | Researched | unconfirmed |
|---|---:|---:|---:|---:|
| PureGym | 480 | 501 | not established | 22 |
| The Gym Group | 267 | 379 | 264 | 112 |
| Nuffield Health | 108 | 130 | not established | 22 |
| David Lloyd | 107 | 128 | not established | 21 |
| Better (GLL) | 164 | 252 | not established | 89 |
| Freedom Leisure | 115 | 123 | not established | 8 |
| Snap Fitness | 107 | 120 | not established | 13 |
| JD Gyms | 103 | 134 | 114 | 31 |
| Places Leisure | 86 | 96 | not established | 10 |
| Bannatyne | 65 | 76 | not established | 11 |
| Virgin Active | 27 | 74 | not established | 47 |
| Fitness First | 21 | 194 | 39 | 173 |
| Village Gym | 34 | 40 | not established | 6 |
| Total Fitness | 2 | 56 | 15 | 54 |
| Third Space | 15 | 15 | 15 | 1 |
| 24/7 Fitness | 1 | 12 | not established | 11 |
| Ultimate Fitness | 0 | 16 | not established | 0 |
| Anytime Fitness | 0 | 243 | not established | 0 |
| Everyone Active | 0 | 166 | not established | 0 |
| énergie | 0 | 127 | not established | 0 |
| Everlast | 0 | 77 | not established | 0 |
| CrossFit | 0 | 474 | not established | 0 |
| F45 | 0 | 62 | not established | 0 |
| Simply Gym | 0 | 21 | not established | 0 |
| Parkwood Leisure | 0 | 13 | not established | 0 |
| Gymbox | 0 | 12 | not established | 0 |
| 1Rebel | 0 | 11 | not established | 0 |
| Serco Leisure | 0 | 4 | not established | 0 |

Everyone Active, Anytime Fitness, énergie and Everlast show 0 "own
feed" (Known gaps: none fetched from their own sites).
## operator_unconfirmed (GD-26): total 631
Per operator: The Gym Group 112, Fitness First 173, Total Fitness 54,
Virgin Active 47, Better (GLL) 89, David Lloyd 21, Nuffield Health 22,
PureGym 22, JD Gyms 31, Freedom Leisure 8, Snap Fitness 13, 24/7 Fitness
11, Places Leisure 10, Village Gym 6, Third Space 1. **Ruling GD-26:**
these carry a brand from a source other than the operator's own
(complete) feed, mostly historic Active Places rows the current feed no
longer lists; the row keeps its Active Places `status` but is flagged
`needs_review_reason = 'not_in_operator_feed'`, ranks below feed-
confirmed branches, and shows no "confirmed by the operator" line.

## Dedup outcomes (GD-06)
`dedupe.mjs` folded 57,677 normalised records into **46,831 clusters**
(`merge-decisions.v1.jsonl.gz`): 41,138 singleton and **5,693 merged**
(2+ members, GD-06 score ≥5), together 54,895 of the 57,677 records , 
2,782 did not cluster. The canonical file carries 46,817 rows, 14 fewer
than the 46,831 clusters; `build.mjs`'s GD-21 log (`build.mjs:485-504`)
attributes build-stage drops to "single-source rows with neither
coordinates nor postcode/sector", consistent with, not independently
re-derived to, that gap. Review tiers (GD-23): **likely** (3,967) needs
a name/phone/website signal, moderator queue; **weak** (10,743) is
proximity-only, "no person is asked to work" it.

## Named lookups (founder test cases)
**"Volt Gym", Burscough, PRESENT** (id `54603096-…`): `independent_gym`,
4 Osprey Pl, Burscough, **L40 8TG**, 53.58889/-2.86554, `coord_source:
source`, voltgym.co.uk, 01704 893666, `verification_status:
single_source`, `source_count: 1` (4 `source_records`, Foursquare,
Overture and meta entries folded under one canonical source, Overture).
**"PureGym Motherwell", PRESENT, two sources** (id `a9e6d071-…`):
`commercial_gym`, Brandon Parade Shopping Centre, Motherwell, **ML1
1LX**, 55.78867/-3.98981, puregym.com/gyms/motherwell/,
`verification_status: multi_source`, `source_count: 2` , 
`operator:puregym` + `overture` (two entries).

## Known gaps (stated plainly, not hidden)
- **sportscotland not yet acquired**, needs the founder's free account
  registration (docs 02, 06; TASKBOARD c); Scotland's 3,169 rows come
  entirely from Overture, operator feeds and Companies House.
- **Everyone Active, Anytime Fitness, énergie and Gymbox never
  fetched** from their own sites (doc 08 block list); rows come only
  from Active Places `operatorname` or Overture `brand`.
- **OSM cross-check not run** (every Overpass mirror unreachable from
  this container, docs 01/11) and **Google Places is runtime-only,
  never imported** (GD-02), both contribute zero stored rows.
- **VOA excluded on licence grounds (GD-16)**, 17,370-row extract
  deleted 2026-09-07; no VOA field is in the pipeline or output.
- **260 open venues have no resolved area** (GD-21), no ONSPD sector
  centroid within 3 km; count taken directly from the data.
- **Northern Ireland relies on Active Places NI** (2,404 rows, "8 years
  ago", `metadata_modified` 2017-11-17) plus Overture; no fresher NI
  source acquired (doc 06). **Wales's own register is 97 rows, dated
  2022-11-07** (3.8+ years stale) and lists at least one commercial gym
  (Simply Gym Wrexham) closed while the register itself is what is stale.
- Foursquare's direct extract (public S3) was blocked (gated behind a
  Hugging Face account, doc 11 §1); rows reach this database only
  pre-conflated inside Overture, under Apache-2.0.

## Freshness (`data/gyms/ATTRIBUTION.md` and the acquisition records)
Active Places (England): pulled 2026-09-06/07, source updated daily.
ONSPD: August 2026 release, pulled 2026-09-06/07. Companies House:
monthly snapshot dated 2026-09-01. Overture: release `2026-08-19.0`,
pulled 2026-09-07. Active Places NI: "8 years ago", `metadata_modified`
2017-11-17. DataMapWales: dated 07 Nov 2022. Operator pages (18): fetched
2026-09-06/07, one pass each, no recurring cadence yet. ATTRIBUTION.md's
ONSPD wording is an unresolved "[PLACEHOLDER, confirm ... once the
founder-facing cloud migration is prepared]".
