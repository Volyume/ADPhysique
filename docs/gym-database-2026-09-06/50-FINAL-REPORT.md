# 50: Final report: the UK gym master database

Founder brief 2026-09-06 (README.md): "Of course Volyume knows my gym."
Built end to end on branch `claude/volyume-social-discovery-h7dknu`, NOT
YET MERGED (`docs/TASKBOARD.md`).

## What was built

**Sources and licences** (attribution strings verbatim in
`data/gyms/ATTRIBUTION.md`): Sport England Active Places Power (CC BY
4.0, "Contains Data © Sport England"); Active Places NI and DataMapWales
(OGL v3); ONS Postcode Directory (OGL); Companies House (unrestricted,
candidate signal only, GD-02); Overture Places `2026-08-19.0`
(CDLA-Permissive-2.0, Apache-2.0 on Foursquare-sourced rows); Wikidata
(CC0, brand enrichment). VOA **excluded** (GD-16: "an open government
licence does not apply", non-domestic rating purposes only; 17,370-row
extract deleted). Google is runtime-only, never stored.

**Pipeline** (`scripts/gyms/`, Node ESM, stdlib only, 182 fixture tests
/ 13 suites): fetch adapters → `normalise.mjs` → `geocode.mjs` (ONSPD
sector centroids) → `classify.mjs` (GD-03) → `dedupe.mjs` (GD-06) →
`build.mjs` (canonical JSONL + brands) → `audit.mjs` (coverage report)
→ `seed-sql.mjs` (chunked, gitignored). Rebuilt four times under lead
audit, GD-18 to GD-26.

**Canonical model.** `data/gyms/uk-gyms.v1.jsonl.gz`: 46,817 venues, one
row per physical site (GD-04), with brand, address, hierarchy, source
coordinates with `coord_source`/`area_source` flags,
`verification_status`, full `source_records` provenance, and SCD-style
history (`succeeded_by`, `closed_at`). Full breakdown: `30-COVERAGE-REPORT.md`.

**Cloud schema and RPCs** (`supabase/migrate_162_gym_directory.sql`,
2,662 lines, **WRITTEN, NOT APPLIED**): seven tables (three
`global_read_only`, four `rpc_only`), eleven SECURITY DEFINER RPCs
(`gyms_search`, `gyms_near`, `gyms_in_place`, `gyms_get`,
`gyms_suggest`, `gyms_submit`, `gyms_confirm_submission`, `gyms_report`,
`gyms_review_submission`, `gyms_review_report`, `community_set_gyms`),
two additive `community_profiles` columns and a sync trigger, three
re-issued Community functions. Security review `35`: original hostile
pass found 3 P0s (ED-filter bypass, profile-edit lockout, an unrailed
61-second query) and 17 further findings; all fixed (`f09c612`); a
2026-09-07 re-review re-probed all 20 live. **Status: 1-13/16/18
closed; 14 re-rated P3 (shared `migrate_160` rate-rail property, not
162-specific); 5 new findings (21-25), 21 an open product ruling**
(picker matches whole tokens only, app sends no location). Re-review
verdict: see `35`, appended by the lead, table in `40-VERIFICATION.md`.

**App surfaces.** `src/lib/gyms/` (search/near/inPlace/get/suggest/
submit/report through the Community transport gates); `GymPicker`
replaces the free-text gym field on the profile editor and Join;
`CommunityGymAddScreen` (GD-11); the gym page carries member counts,
the report sheet and second-person confirmation; Find people's "At my
gym" door and "Also trains at your gym" reason (`other_gym_ids`, ≤3).

## The founder's standard, and where it stands
"Independent gyms, not just groups" (README), Volt Gym, Burscough is
**PRESENT** (Companies House found the trading entity by name; VOA did
not, since VOA never carries trading names, doc 09). GD-15: "the best
UK gyms database there is", measured never asserted. Against ukactive's
cited 5,842 UK health & fitness clubs (2026 report), the canonical file
holds 46,817 rows (801.4%), but 5,842 is a sample-based estimate (doc
03 §72: "74%/85%/88% sample coverage"), not a census, so 801.4%
compares against an estimated denominator, not a verified ~8x multiple.
Against what remains unacquired: sportscotland's own register (Scotland
runs on Overture + operator feeds only, 2,770 venues), four operators
never fetched from their own sites (Everyone Active, Anytime Fitness,
énergie, Gymbox), no OSM cross-check, and Foursquare's direct feed
(gated behind an account) reaching this build only pre-conflated inside
Overture.

## Founder-gated items
- **Apply migrations 160, 161, 162 and the seed chunks** on the exact
  phrase "run against production" (`supabase/README.md`; sectors before
  venues, an unseeded sector refuses `gyms_submit` as `invalid_postcode`).
- **sportscotland account**, register the free Spatial Hub account
  (data.spatialhub.scot); send the Fitness Suites download/WFS link.
- **expo-location dependency decision** for true device "near me" , 
  without it, near-me runs from a typed postcode (GD-10, TASKBOARD b).
  Bears on finding 21 too: relaxing the picker's prefix-search gate
  without a location dependency is a separate, measured-free option.
- **Image decision (unchanged, Community campaign item 3):** image
  upload needs an EU-residency moderation processor and a DPA; not
  built, not decided here.
- Optional: price an OS Points of Interest paid licence (GD-15).

## Lead rulings, GD-15 to GD-26 (one line each)
- **GD-15** standard is "the best UK gyms database there is", measured
  against ukactive and reported, never asserted.
- **GD-16** VOA excluded on licence grounds; extract deleted same day.
- **GD-17** Overture is a canonical source; Foursquare direct not
  pursued (its rows arrive pre-conflated inside Overture instead).
- **GD-18** display names decode HTML entities, strip status suffixes,
  title-case with a brand exceptions list.
- **GD-19** brand attribution follows the freshest brand-bearing
  source; two different known brands never merge.
- **GD-20** Companies House corroborates only on postcode-unit match
  plus a name-token/Jaccard test, else the row stays `single_source`.
- **GD-21** a coordinate-only row takes hierarchy from the nearest
  ONSPD sector within 3 km; neither present drops it unless multi-source.
- **GD-22** name-matching strips brand tokens only when both sides
  share the brand; a single-token name never earns points alone.
- **GD-23** review queue splits into `likely` (moderator-worked) and
  `weak` (proximity-only, nobody works it).
- **GD-24** seed folder is generated and gitignored, not committed;
  canonical data and review files are committed gzipped.
- **GD-25** an over-length/over-token source name is rejected at
  normalisation, falls back to brand plus town.
- **GD-26** town/address casing matches name casing; a brand known only
  outside its current feed is flagged `operator_unconfirmed`.

## Open items
- Review 35 finding 21 (picker prefix search dead without a coordinate)
  needs a founder ruling before or alongside the apply.
- Review 35 finding 14 (refused calls don't count against the shared
  rate rail) is tracked against `migrate_160`, not this file.
- 260 open venues have no resolved area (GD-21); 631 are
  `operator_unconfirmed` (GD-26); 3,967 rows sit in the `likely` queue.
- ATTRIBUTION.md's ONSPD attribution wording is an unresolved
  placeholder pending the cloud migration being founder-facing.
- Merge to main: not yet done ("BUILT ... NOT YET MERGED", TASKBOARD).
