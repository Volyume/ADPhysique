# 20 — GYM DIRECTORY BLUEPRINT (the build spec and the edit-gate spec)

Authority: founder brief 2026-09-06 (UK gym master database), standard
"Of course Volyume knows my gym", independent gyms included (test case:
Volt Gym, Burscough). Evidence `01`..`09`; synthesis `10`. Rulings GD-01..
GD-14 below. Every Section 2 inviolable of CLAUDE.md binds; no source is
imported whose licence is not in the USE column of `01`'s matrix or
confirmed in an acquisition record; no new npm dependency; Node and
Python 3 stdlib only in the pipeline; cloud migration additive and
WRITTEN, NOT APPLIED; agents STOP and report on ambiguity.

## Rulings
- **GD-01 The directory is infrastructure under Community**, not a
  profile field. It ships as its own cloud tables and RPCs, a versioned
  data asset in the repo, and a pipeline that can be re-run.
- **GD-02 Sources by role.** Canonical: Active Places (England), Active
  Places NI, DataMapWales leisure centres, sportscotland Sports Facilities
  (once the founder's free account exists), Foursquare Open Source Places
  and Overture Places (permissive, pipeline-only DuckDB approved by the
  founder 2026-09-07). NOT USED: the VOA rating list, whose download
  terms state that the Open Government Licence does not apply and confine
  use to non-domestic rating purposes (acquisition record 09); the
  extract was deleted on 2026-09-07 (GD-16). Candidate signal: Companies House SIC 93130 and 93110
  (a company is not a venue until a premises-like address or another
  source confirms it). Verification and gap-fill: operator branch pages
  (provenance URL, polite fetch, facts only). Cross-check only: OSM by
  sampled tiles, Foursquare and Overture in a later run. Runtime only:
  Google, never stored. Not used: OS paid products.
- **GD-03 Classification rule.** `venue_type` is assigned by source
  evidence in this order: operator brand type (chain table) > VOA
  description or special category > Active Places facility and ownership
  > NI ownership and flags > name tokens (last resort). Types:
  `commercial_gym`, `independent_gym`, `health_club`, `leisure_centre`,
  `strength_gym`, `crossfit_functional`, `womens_gym`, `boutique_studio`,
  `university_gym`, `hotel_gym`, `martial_arts`, `other_fitness`,
  `excluded`. Core search returns the first ten; `other_fitness` appears
  under "Other fitness venues"; `excluded` (school-only sites, private
  residential, closed-access workplace gyms, records with no address)
  never appears. A leisure centre with a fitness suite is a core venue.
- **GD-04 Site, not facility.** One canonical row per physical venue.
  Active Places facilities collapse to their site; a site with several
  countable fitness facilities is one venue with `facility_count`.
- **GD-05 Brands are first-class.** `gym_brands` holds the chain or
  operator with aliases (Wikidata QID where it exists, our own alias
  list: "Pure Gym", "PureGym", "the gym" > The Gym Group, "JD", "J D
  Gyms"). A venue's `display_name` is brand + locality ("PureGym
  Motherwell"); an independent's display name is its own name.
- **GD-06 Deduplication is multi-signal.** Blocking on postcode unit,
  then on postcode sector plus a name token, then on a 250 m grid cell.
  Score: same brand 3; name similarity (token Jaccard after folding and
  brand stripping) 0.85 or above 3, 0.6 to 0.85 1; same postcode unit 2;
  same street number and street 2; within 100 m 2, within 150 m 1; same
  phone 2; same website host 2. Merge at 5 or more; hold for review
  between 3 and 5; distinct below 3. Different brands within 30 m are
  distinct unless the address is identical (a gym inside a leisure
  centre stays a separate venue with a `parent_venue_id`).
- **GD-07 History is kept.** Status `open` | `closed` | `merged` |
  `pending`; a merged row keeps `succeeded_by`; closures keep the row
  with `closed_at`; nothing is deleted; user associations survive.
- **GD-08 Location hierarchy from the postcode.** ONSPD gives country,
  region, local authority and coordinates for every postcode; the venue
  town comes from the source address, folded, with the postcode sector
  centroid as the fallback coordinate (flagged `coord_source`
  `source` | `postcode_sector`).
- **GD-09 Search without extensions.** Server: a folded token array per
  venue plus brand aliases and the postcode outward code, matched by
  prefix on tokens and by district on a recognised postcode, restricted
  by a bounding box when coordinates are supplied, limited to 40
  candidates; client: the app's existing fuzzy ranker over those
  candidates, ranking brand match first, then locality, then distance.
  Postcode input is recognised by the UK pattern and searched by
  outward code; a town name matches the town field and the ONSPD
  built-up area name.
- **GD-10 Near me.** Mile bands 1, 2, 5, 10, 25 on a bounding box plus
  haversine; results show display name, town, outward code and distance
  to one decimal. "Use my location" is offered only if the app already
  holds a location permission dependency; otherwise search by postcode
  or town (a founder decision to add the dependency is recorded, not
  taken here).
- **GD-11 User-created gyms.** "Can't find your gym? Add it": name,
  address line, town, postcode (validated against ONSPD), optional
  website and operator; duplicates checked at submission with GD-06 and
  offered back ("Did you mean PureGym Motherwell?"); a new submission is
  `pending`, immediately selectable by its submitter, visible to others
  after a second independent confirmation or a moderator's verification;
  rate 3 submissions a day.
- **GD-12 Corrections.** Reports: closed, wrong name, wrong location,
  duplicate of, not a gym, other; two independent reports of the same
  kind flag the row for review; a moderator applies the change; the
  history row records it.
- **GD-13 Privacy.** A person's gym is a chosen fact (primary gym plus
  up to three other gyms), shown only under the existing Community
  visibility rules; "people at this gym" counts and lists only people who
  chose it and are viewable; there is no inference from sessions, no
  check-ins, no live presence. Sessions are never associated with a
  venue in this build.
- **GD-14 Community integration.** The profile's free-text gym label is
  replaced by a picker over the directory; `gym_id` becomes the
  Community gym key (`gym:<id>`), with the label kept for display and for
  pending user-created venues; the gym dimension page keys on `gym_id`;
  Find people "At my gym" and the gym summary use it; core onboarding is
  untouched (a person who never opens Community never sees a gym
  picker).

## Data model (cloud, migration 162; global read for authenticated, rpc-only writes)
```
gym_brands(id uuid PK, key text UNIQUE, name text, aliases text[], wikidata_qid text, website text, kind text)
gym_venues(id uuid PK, display_name text, name text, brand_id uuid NULL, venue_type text, status text,
  address_line text, town text, town_key text, local_authority_code text, local_authority_name text,
  region_code text, region_name text, country text, postcode text, outward text, sector text,
  lat double precision, lng double precision, coord_source text, geocell text, website text, phone text,
  facility_count int, parent_venue_id uuid NULL, succeeded_by uuid NULL, verification_status text,
  source_count int, tokens text[], first_seen timestamptz, last_verified timestamptz, closed_at timestamptz,
  created_at, updated_at)
gym_venue_sources(id uuid PK, venue_id uuid, source text, source_record_id text, source_url text,
  source_name text, source_status text, source_updated_at timestamptz, retrieved_at timestamptz, payload jsonb)
gym_venue_history(id uuid PK, venue_id uuid, change text, before jsonb, after jsonb, actor text, created_at)
gym_submissions(id uuid PK, submitter_id uuid, name, address_line, town, postcode, website, operator,
  lat, lng, status text, duplicate_of uuid NULL, confirmations int, created_at, reviewed_at, reviewed_by uuid)
gym_reports(id uuid PK, venue_id uuid, reporter_id uuid, kind text, detail text, status text, created_at, resolved_at)
gym_postcode_sectors(sector text PK, lat, lng, count int, country, region_code, local_authority_code)
```
Indexes: `(lat, lng)`, `geocell`, `outward`, `town_key`, GIN on `tokens`,
`brand_id`. RPCs: `gyms_search(_q, _lat, _lng, _limit)`,
`gyms_near(_lat, _lng, _radius_m, _limit)`, `gyms_in_place(_town_key,
_limit)`, `gyms_get(_id)`, `gyms_suggest(_q, _lat, _lng)` (8 rows for
autocomplete), `gyms_submit(_p)`, `gyms_confirm_submission(_id)`,
`gyms_report(_venue_id, _kind, _detail)`, moderator: `gyms_review_submission
(_id, _action, _merge_into)`, `gyms_review_report(_id, _action)`.
Community: `community_profiles.gym_id uuid NULL`, `other_gym_ids uuid[]`,
`gym_key` derived as `gym:<id>` when set; `community_gym_summary` and
`community_find_people('gym')` key on it; `community_gym_suggest` is
replaced by `gyms_suggest`.

## Pipeline (`scripts/gyms/`, Node ESM, stdlib only)
`fetch-*.mjs` per source (writes raw to the scratch folder with a
manifest), `normalise.mjs` (one schema: name, brand guess, address,
town, postcode, lat, lng, coord_source, venue_type guess, status,
source, source_record_id, source_url, phone, website),
`geocode.mjs` (ONSPD sector centroids; postcode validation),
`classify.mjs` (GD-03), `dedupe.mjs` (GD-06, writes merge decisions and
the review queue), `build.mjs` (canonical JSONL `data/gyms/uk-gyms.v1.
jsonl` plus `data/gyms/brands.v1.json` and `data/gyms/postcode-sectors.
v1.csv`), `audit.mjs` (coverage by nation, operator, local authority,
postcode area; single-source rows; unresolved matches; the named test
cases), `seed-sql.mjs` (generates `supabase/seed_gyms_v1.sql`, applied
only on the founder's phrase). Every script is idempotent and logs
counts. Attribution strings are carried in `data/gyms/ATTRIBUTION.md`.

## App
`src/lib/gyms/` (transport through the same gates as Community: `search`,
`near`, `inPlace`, `get`, `suggest`, `submit`, `report`, plus pure
`postcode.js` (UK postcode recognition and outward code) and `rank.js`
(client ranking over candidates)); `src/components/community/GymPicker.js`
(search bar with debounce 250 ms, recognised postcode chip, results as
"display name / town · outward · distance", "Can't find your gym? Add
it"); `CommunityGymAddScreen` (GD-11); the profile editor and Join use the
picker; the gym dimension page and Find people use `gym_id`.

## Tests and records
Pipeline unit tests over fixtures (normalise, classify, dedupe
thresholds, postcode recognition, ranking on the human inputs from the
brief: "PureGym Motherwell", "Puregym", "Pure Gym", "Motherwell
PureGym", "the gym motherwell", "JD", "J D Gyms", "Motherwell gym",
"gym near ML1", "ML1 1AA", "Hamilton", "Glasgow", "Bannatyne Hamilton",
"David Lloyd Glasgow", and misspellings); the coverage report `30`;
rpc-only guard over 162; privacy guard over `src/lib/gyms`; device
checklist in `40`.

## GD-15 The standard is "the best UK gyms database there is" (founder, 2026-09-06)
Completeness is measured, never asserted: the coverage report states
canonical venues by nation, local authority and operator against
ukactive's 5,842 clubs and each operator's own branch count, and lists
single-source rows, unresolved matches and suspected gaps by name. Every
open source that reaches independents is used (VOA premises, Companies
House, the national registers, operator feeds); every venue carries
coordinates, hierarchy, status and provenance; the pipeline re-runs on
each source's cadence; users correct it. Three founder unlocks raise the
ceiling and are recorded on the board: the free sportscotland account,
a pipeline-only Parquet reader for Foursquare and Overture, and an
optional paid OS Points of Interest licence.

## GD-16 VOA is excluded on licence grounds (2026-09-07)
The VOA compiled rating list download page states "An open government
licence does not apply" and limits use to non-domestic rating purposes
with a deletion obligation (record `09`). The 17,370-row extract was
deleted the same day and no VOA field enters the pipeline. Independents
are reached instead through Companies House (OGL; it found Volt Fitness
UK Limited at Swordfish Business Park, Burscough), Foursquare and Overture
places, operator feeds, Active Places where registered, and submissions.

## GD-17 Overture is a canonical source; Foursquare direct is not pursued (2026-09-07)
Overture Places release 2026-08-19.0 yielded 52,371 UK fitness-family
rows with per-row licences observed in the data (CDLA-Permissive-2.0 for
Overture, Meta and Microsoft rows; Apache 2.0 for the 5,944 Foursquare-
sourced rows), pulled with the founder-approved pipeline-only DuckDB over
HTTPS with row-group pruning. Foursquare's own download is now gated
behind an account and its rows already sit inside Overture, so it is not
pursued separately. Attribution for both licences is carried in
`data/gyms/ATTRIBUTION.md`. Volt Gym, Burscough (L40 8TG) is present.

## GD-18 to GD-24 Lead rulings on the first full pipeline run (2026-09-07)

Evidence: the first canonical build (46,754 venues) was lead-audited by
sampling. Observed: Active Places names arrive all-caps with "(CLOSED)"
and "(TOWN)" baked in and HTML entities undecoded (115 rows with
`&amp;`, 1,983 with "CLOSED" in the display name); Companies House
"corroboration" attached on postcode unit alone (a golf club
"corroborating" a yoga studio), inflating `multi_source`; 4,424 open
venues carry no nation and 4,323 no postcode (Overture rows with
coordinates only); the dedup name signal gave full marks to a
single-token operator branch name ("Moorgate" vs "THIRD SPACE
(MOORGATE)"); the review queue held 12,966 proximity-only pairs that are
mostly different businesses in one building; the operator adapters ran
over 6 of 18 folders because acquisition was still in flight.

- **GD-18 Display names.** Decode HTML entities. Strip status suffixes
  ("(CLOSED)", "- CLOSED", "(TEMPORARILY CLOSED)" and case variants);
  closure is `status`, never a name. Convert an all-caps name to title
  case with an exceptions list (brand casing from `brands.v1.json`,
  YMCA, JD, DW, LA, F45, UK, PT, roman numerals, "&"). A trailing
  bracketed qualifier becomes a plain suffix ("Third Space Moorgate").
  For a merged cluster the display name prefers the freshest mixed-case
  source (operator feed, then Overture, then Active Places); a branded
  venue is composed as brand plus branch ("PureGym Motherwell") when the
  source name is bare.
- **GD-19 Brand attribution.** The freshest brand-bearing source wins:
  operator feed, then Overture, then Active Places `operatorname`. A
  venue whose only brand signal is Active Places `operatorname` and
  whose fresher source name carries a different known brand or no brand
  drops the stale brand (the TruGym case). Two records carrying
  different known brands never merge (hard veto). Operator counts in the
  audit are reported twice: venues from the operator's own feed, and
  venues carrying the brand from any source.
- **GD-20 Companies House corroboration.** Attach a company only when
  the postcode unit matches AND the folded company name (legal suffixes
  and generic tokens gym, fitness, health, club, limited, ltd, uk
  removed) shares at least two tokens or reaches Jaccard 0.5 with the
  venue name. Otherwise nothing is attached and the row stays
  `single_source`.
- **GD-21 Hierarchy without a postcode.** A row with coordinates but no
  postcode takes sector, outward, country, region and local authority
  from the nearest ONSPD sector centroid within 3 km, with
  `area_source = 'nearest_sector'`; `postcode` stays null. A row with
  neither coordinates nor postcode is dropped unless multi-source, in
  which case it is kept `low_confidence`.
- **GD-22 Name matching.** Brand tokens are stripped only when both
  sides carry the same brand; the town token is excluded from the name
  Jaccard; a single-token name never earns name points on its own.
  Operator branch names are composed brand plus branch at normalisation.
- **GD-23 Review queue tiers.** `likely` needs a name, phone or website
  signal and is the moderator queue; proximity-only pairs are `weak`
  and go to a separate file that no person is asked to work.
- **GD-24 Repository hygiene and seeds.** `data/gyms/_work/` is
  gitignored. The canonical file, merge decisions and both review
  files are committed gzipped (`*.jsonl.gz`, read and written through
  zlib). `postcode-sectors.v1.csv` is built from ONSPD (sector, lat,
  lng, count, country, region_code, local_authority_code).
  `seed-sql.mjs` writes `supabase/seed_gyms_v1/` as chunked files of at
  most 1,000 rows each (`000-brands.sql`, `001-sectors-NNN.sql`,
  `1NN-venues-NNN.sql`, `2NN-sources-NNN.sql`), every chunk carrying the
  house header and `INSERT ... ON CONFLICT (id) DO UPDATE`, applied only
  on the founder's phrase, never by the app.
