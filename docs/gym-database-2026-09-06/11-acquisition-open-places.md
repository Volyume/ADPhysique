# Acquisition Report: Foursquare Open Places & Overture Maps Places (2026-09-07)

Scratch location: `/tmp/claude-0/-home-user-ADPhysique/8a1da388-bf6f-50f3-8ac9-99853301c7d5/scratchpad/gyms/`
(session-local; not in the repo). DuckDB CLI lives at `tools/duckdb`, never
added to the app/package.json/repo.

---

## 0. DuckDB CLI

Downloaded `duckdb_cli-linux-amd64.zip` from
`https://github.com/duckdb/duckdb/releases/latest/download/...` into `tools/`,
unzipped, `chmod +x`.

- **Version:** `v1.5.5 (Variegata)`
- **Licence:** MIT (DuckDB project licence)
- Proxy: DuckDB's own httpfs client needed `SET http_proxy='http://127.0.0.1:44533'`
  inside the SQL session (env `HTTPS_PROXY` alone was not read by duckdb's
  internal HTTP client); combined with `INSTALL httpfs; LOAD httpfs;` this
  worked without needing curl pre-downloads.

## 1. Foursquare Open Source Places — BLOCKED, not acquired

The brief's path (`s3://fsq-os-places-us-east-1/release/dt=<date>/places/parquet/`)
is dead for anonymous access.

**Observed directly:**
- Anonymous `ListObjectsV2` on the bucket root (no prefix, no delimiter)
  returns `KeyCount=2`, `IsTruncated=false` — the entire publicly-listable
  bucket contains only `LICENSE.txt` and `NOTICE.txt`. No `release/` prefix
  exists at all (confirmed with and without a delimiter, and with
  `prefix=release` returning `KeyCount=0`).
- `LICENSE.txt`/`NOTICE.txt` still state Apache License 2.0 with a Foursquare
  attribution NOTICE requirement — the licence text itself is unchanged.
- `https://huggingface.co/api/datasets/foursquare/fsq-os-places` reports
  `"gated":"auto"` and description *"Foursquare OS Places is now a gated
  dataset on Hugging Face"*, with the current config pointing at
  `release/dt=2026-08-11/places/parquet/*.parquet` behind that gate.
- Foursquare's own docs page (fetched) states OS Places "is now delivered
  through the Foursquare Places Portal, using an Iceberg-based data catalog
  instead of the legacy public S3 bucket."

**Inference (labelled as such, not fact):** these three observations together
suggest Foursquare migrated OS Places off the legacy public S3 bucket to a
gated, account-required Hugging Face/Iceberg distribution before this task
ran (2026-09-07); the linked Medium rationale post itself returned HTTP 403
to fetch, so its content was not read.

No credential/account for the gated HF dataset was provisioned or approved
for this pipeline-only task, and acquiring one wasn't attempted — per
"no silent corner-cutting," this is surfaced as a founder decision rather
than substituted with a workaround:

**Founder decision needed (pick one):**
1. Approve creating a Hugging Face account and accepting FSQ's click-through
   terms to pull `dt=2026-08-11` (adds an outside-account dependency).
2. Accept the Foursquare-sourced rows already re-hosted inside Overture's
   places dataset as sufficient for this pass (5,944 UK-bbox rows carry
   `sources[].dataset == "Foursquare"`, licence `Apache-2.0`, see below).
3. Skip Foursquare entirely for now.

`raw/foursquare/uk-gyms.ndjson` was **not created** (no legitimate data to
put in it). `raw/foursquare/manifest.json` records the above.

## 2. Overture Maps Places — acquired

- **Release used:** `2026-08-19.0` (confirmed by listing
  `s3://overturemaps-us-west-2/release/` — two releases visible,
  `2026-07-22.0` and `2026-08-19.0`; took the newer).
- **Path:** `s3://overturemaps-us-west-2/release/2026-08-19.0/theme=places/type=place/`
  — 16 parquet parts, each ~600–700 MB (whole theme ≈ 10.5 GB uncompressed
  scan target). Never downloaded whole files.

### Pruning approach (no whole-file downloads)
Queried directly over HTTPS with DuckDB's `httpfs` + `read_parquet()`,
filtering on the `bbox` struct column (`xmin/xmax/ymin/ymax` — present as a
parquet column with row-group stats), which DuckDB prunes via HTTP range
reads. Verified the partitioning is a contiguous global longitude/latitude
tiling (checked min/max bbox per part across all 16 files, ~2.5 min): only
**part-00006** (lng ‑77.03..‑3.08, lat 38.74..83.57) and **part-00007**
(lng ‑3.08..3.35, lat 38.74..66.52) overlap the UK bbox; parts 05 and 08
(adjacent tiles) were spot-checked and returned 0 matching rows, confirming
the boundary. Only those two files (of 16) were queried for extraction.

### UK bounding box used
`lat 49.8–60.9, lng -8.7–1.8` (as given). This box also covers part of the
Republic of Ireland — output rows include some `country: "IE"` addresses
(e.g. Cork). Filter `addresses[].country == 'GB'` downstream for strict
UK-only.

### Category filter
Task-named categories (`fitness_center, health_club, crossfit,
personal_trainer`) do **not** occur as literal `categories.primary` values
in this release's live taxonomy for the UK bbox. Queried the actual
distinct `categories.primary` values present and selected the real fitness
family found: `gym, health_club, fitness_center, boxing_gym, climbing_gym,
rock_climbing_gym, cycle_studio, outdoor_gym, pilates_studio, yoga_studio,
boxing_class, kickboxing_club, martial_arts_club, chinese_martial_arts_club,
gymnastics_center, gymnastics_club, fitness_trainer, personal_trainer,
crossfit, aerial_fitness_center, fitness_exercise_equipment,
fitness_equipment_wholesaler` (superset covering all synonyms + adjacent
ones; only categories actually observed in-bbox contributed rows). Full
`categories{primary, alternate}` kept per row for the lead to reclassify;
`fitness_exercise_equipment`/`fitness_equipment_wholesaler` (86 rows) look
like equipment retailers, not venues — flagged, not excluded.

### Output
- `raw/overture/uk-gyms.ndjson` — **52,371 rows**, 31.5 MB.
  Fields: `id, name_primary, categories{primary,alternate}, addresses[],
  phones[], websites[], brand, confidence,
  sources[]{dataset,record_id}, lat, lng` (lat/lng via `ST_X/ST_Y` on the
  point geometry, spatial extension).
- `raw/overture/manifest.json` — release, partitions used, UK-bbox note,
  counts by primary category (gym 26,951; martial_arts_club 11,194;
  yoga_studio 4,467; fitness_trainer 4,246; pilates_studio 2,795;
  boxing_class 1,342; gymnastics_center 1,099; remainder <100 each),
  and **row-level licence findings** (observed directly in the `sources[]`
  struct's own `license` field, not inferred): `Overture` →
  `CDLA-Permissive-2.0` (52,371 rows), `meta` → `CDLA-Permissive-2.0`
  (42,412), `Foursquare` → `Apache-2.0` (5,944), `Microsoft` →
  `CDLA-Permissive-2.0` (4,015). A row can carry more than one source entry
  (Overture's own record plus the upstream contributor it was conflated
  from), so these counts are per source-entry, not mutually exclusive rows.

## 3. Test lookups

**"Volt" near Burscough (L40, lat 53.6, lng ‑2.85)** — found in the Overture
extract (Foursquare's own dataset was not acquired, see §1):
- `"Volt Gym"`, 4 Osprey Pl, Burscough, **L40 8TG**, lat 53.58889 lng
  ‑2.86554, tel `01704 893666`, `voltgym.co.uk`, source `Foursquare`
  (`record_id: 210b785d98b54653785e09ac`).
- `"VOLT GYM"` (near-duplicate), Seafire Wy, Ormskirk, **L40 8AH**, lat
  53.59534 lng ‑2.85935, tel `+441704893666`, source `meta`. Same
  brand/phone family as above — a dedup candidate for the lead.
- Also present nearby but not a Burscough match: "VOLT Studio Fitness"
  (Penrith, CA11), "Volt Fitness" (Rochdale, OL11), "Voltage" (Drogheda, IE),
  "High Voltage Pole" (Wisbech) — kept for completeness, not the target.

**"PureGym Motherwell"** — found:
- `"PureGym Motherwell"`, Shopping Centre, Brandon Parade South, 54-62
  Brandon Parade E, Motherwell, **ML1 1LX**, lat 55.78910 lng ‑3.99034, tel
  `+443444770005`, `puregym.com/gyms/motherwell/`, brand name `"PureGym US"`
  (mislabelled brand field — flag for the lead), source `meta`.

## 4. What failed and how

- Foursquare OS Places: public S3 route removed (§1) — blocked pending a
  founder decision on the three options above.
- Overture: no failures. `read_parquet` glob patterns were not needed —
  used the discrete two-file list once the covering parts were identified,
  which kept total transferred bytes to the pruned row groups rather than
  the full ~1.3 GB the two files sum to.
