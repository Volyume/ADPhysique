# 01 — Schema and consumers: the current exercise contract

Authority: founder brief 2026-09-05 "VOLYUME — EXERCISE LIBRARY &
ALTERNATIVE TRAINING SYSTEM EXPANSION", Part "CURRENT PRODUCT CONTEXT —
VERIFY, DO NOT ASSUME STALE". Scope: read-only verification against the
tree at commit time of this doc. Every claim below carries a `file:line`.
Machine-readable companion data: `data/seed-export.json` (552 rows, full
derived shape) and `data/seed-enums.json` (per-field value counts),
produced by `scripts/exercise-library/loadSeed.mjs` +
`scripts/exercise-library/export-seed.mjs`.

**Headline correction to the campaign's own starting assumption**: the
README (`docs/exercise-library-expansion-2026-09-05/README.md:26`) and
every existing coverage report describe "the current 551-row corpus".
The real count is **552**. Section 1.1 below is the evidence.

---

## 1. The RAW tuple, the built-in count, and the seed function

### 1.1 Exact count — 552, not 551 (evidence)

`src/lib/seedExercises.js:589` declares `const RAW = [ ... ]`, closed at
`seedExercises.js:1288` (`];`). Every element is a 10-position array
literal, one per line.

**Every existing count of this array is built by parsing the source text
with a filter that misses one row.** Three independent places do this:

- `scripts/demand-coverage-report.mjs:29-30` — `if (!t.startsWith("['")) continue;`
- `scripts/adapted-setup-coverage.mjs:34-35` — the same filter, byte for byte
- `src/lib/__tests__/campaign16.helpers.js:36` — a regex anchored on
  `\[\s*'([^']+)'`, which likewise requires the row to open with `['`

All three skip `src/lib/seedExercises.js:927`:

```
["Farmer's Walk",                 'traps', ['forearms', 'abs'],         'dumbbell',     'carry',     true,  20, 40, 3, 4],
```

This row uses a **double-quoted** name literal because the name itself
contains an apostrophe (`'`). It is a completely ordinary, single-line,
bracket-balanced JS array literal — `(0, eval)` or `Function(...)` parses
it without error — it is simply not `['`. Verified directly:

```
$ node -e "... filter lines starting with '[\'' or '[\"' ..."
total rows 552
duplicate names: 0
```

```
$ node -e "... count lines trimming to a bracket-balanced literal starting with '[' ..."
lines starting with [: 552   unbalanced: 0
```

**Consequence**: `docs/capability-campaign-25-2026-08-20/CC27-DEMAND-COVERAGE.md`,
`ADAPTED-SETUP-COVERAGE.md`, and every Campaign 16 plan-quality test built
on `campaign16.helpers.js`'s `buildRealLibrary()` (its own header comment:
"the real seeded exercise library... every plan-quality suite in this
campaign judges the SAME thing") **have never once seen `Farmer's Walk`**.
It is missing from their coverage tables, their per-muscle counts, and
every generated-plan test's candidate pool — silently, with no failing
assertion, because nothing asserts the row count.

This loader (`scripts/exercise-library/loadSeed.mjs`) fixes the filter —
detects a row by bracket-balance, not by the first string's quote
character — rather than special-casing `Farmer's Walk`, per this brief's
"do not invent a new parser, reuse the existing approach" instruction:
the approach (parse the source text, isolate the RAW block, eval one
literal per line) is unchanged; only the one-line detection predicate is
corrected. Running it: **552 rows, 0 with demand-validation errors**
(`node scripts/exercise-library/loadSeed.mjs`).

### 1.2 A second, undocumented insertion path — up to +18 more

`src/lib/seedRoutines.js:21-38` defines `REQUIRED_EXERCISES`, 18 exercise
rows the library-plan templates depend on, inserted by
`seedRoutines.js:2116-2129` via `insertExercise(...)` (random `uid()`,
**not** `canonicalExerciseId`) the first time each plan-seeding pass runs
and finds the name missing. These:

- are **not** in `seedExercises.js`'s `RAW` array, so are invisible to
  `loadSeedRows()`, `demand-coverage-report.mjs`, `adapted-setup-coverage.mjs`,
  and `campaign16.helpers.js` alike — none of them read `seedRoutines.js`;
- get a **non-deterministic-across-devices** random ID
  (`insertExercise` → `database.js:3287-3288` → `uid()`), unlike every
  `RAW` row's `canonicalExerciseId(name)` hash
  (`seedExercises.js:1450`). `canonicalId.js:25-39` documents exactly why
  that matters: two devices seeding the same `REQUIRED_EXERCISES` name
  independently mint **two different IDs** for it, which is the precise
  cross-device join failure `canonicalExerciseId` exists to prevent — but
  only for rows seeded via `insertExerciseWithId`;
- get no `subregion` (never in `SUBREGION_MAP`, and
  `deriveExerciseMetadata`/`deriveDemandMetadata` don't derive it — only
  the `SUBREGION_MAP` lookup does, and that lives only in
  `seedExercises.js`);
- overlap by movement, not by exact name, with existing `RAW` rows (no
  exact-name duplicate — verified — but e.g. `Hip Thrust (Barbell)` next
  to `Barbell Hip Thrust`, `Dumbbell Goblet Squat` next to `Goblet Squat`,
  `Trap Bar Deadlift (Low Handle)` next to `Trap Bar Deadlift`,
  `Underhand Lat Pulldown` next to `Lat Pulldown (Neutral Grip)`).

Whether these 18 belong inside `RAW` (canonical, counted, `canonicalId`-
stable) or are a deliberate separate "template-only" tier is a decision
this campaign's identity policy (05-DECISIONS.md) needs to make
explicitly — they currently sit in neither category cleanly.

### 1.3 The RAW tuple schema

`seedExercises.js:586-588` (comment) and the destructure at
`seedExercises.js:1408`:

| # | Tuple field | Type | Maps to DB column via `rowToExercise` |
|---|---|---|---|
| 0 | name | string | `name` |
| 1 | primaryMuscle | string (muscle enum) | `primary_muscle` |
| 2 | secondaryMuscles | string[] (muscle enum), may be `[]` | `secondary_muscles` (JSON) |
| 3 | equipment | string (coarse equipment enum) | `equipment` |
| 4 | movementPattern | string (pattern enum) | `movement_pattern` |
| 5 | isCompound | bool | `compound_isolation` (`'compound'`/`'isolation'`) |
| 6 | minReps | integer | `default_rep_min` |
| 7 | maxReps | integer | `default_rep_max` |
| 8 | fatigueCost | integer 1-10 (10 = highest systemic fatigue) | `fatigue_cost` |
| 9 | sfr | integer 1-10 (10 = best stimulus:fatigue) | `stimulus_to_fatigue_ratio` |

This matches this campaign's own `scripts/exercise-library/loadSeed.mjs`
`SEED_ROW_COLUMNS` export verbatim (that export is documentation the
brief asked for, generated from this same reading).

### 1.4 The seed function: `rowToExercise` (`seedExercises.js:1407-1432`)

Builds a `base` object from the 10 tuple fields plus:
- `subregion: SUBREGION_MAP[name] ?? null` (`:1420`) — hand-authored, see
  section 2.
- `exerciseType: EXERCISE_TYPE_MAP[name] ?? 'weight_reps'` (`:1421`) —
  hand-authored override map, `seedExercises.js:1304-1336`.
- `isCustom: false` (`:1422`).
- `loadSemantics`, via `deriveLoadSemantics()` (`:1395-1402`), itself
  keyed on `ASSISTED_NAMES` (2 entries) and `SINGLE_IMPLEMENT_TOTAL` (33
  entries), both hand-authored name lists, `:1355-1379`.

Then spreads `deriveExerciseMetadata(base)` (`exerciseMetadata.js`) and
`deriveDemandMetadata(base)` (`capability/demands.js`) on top
(`seedExercises.js:1431`). **`rowToExercise` never sets**: `cue`,
`exerciseCategory`, `incrementKg`, `machineType` is set *by*
`deriveExerciseMetadata`, not `rowToExercise` directly — see section 3
for what that means for `cue`/`exercise_category`/`increment_kg`.

`seedExercisesIfNeeded()` (`:1434-1462`) runs this over every `RAW` row
via `insertExerciseWithId(canonicalExerciseId(row[0]), rowToExercise(row))`
only on a genuinely empty `exercises` table. `topUpNewExercisesIfNeeded()`
(`:1470-1490`) does the same per-row for any `canonicalExerciseId` not
already present, so an existing install picks up newly added `RAW` rows.
`backfillExerciseMetadataIfNeeded()` (`:1501-1520`) and
`rederiveExerciseMetadataIfNeeded()` (`:1561-1579`) both re-run
`deriveExerciseMetadata` over every non-custom row already in the table —
the former only where `equipment_category IS NULL`, the latter
unconditionally, each gated by its own `AsyncStorage` version flag
(`SEEDED_KEY`, `METADATA_BACKFILL_KEY`, `METADATA_REDERIVE_KEY`,
`LIBRARY_VERSION_KEY`, `seedExercises.js:9-22`).

---

## 2. SQLite schema — `exercises` table and every migration that touched it

Base `CREATE TABLE exercises` — `database.js:221-239`:

```
id, name, primary_muscle, secondary_muscles, equipment, movement_pattern,
compound_isolation, default_rep_min, default_rep_max, fatigue_cost,
stimulus_to_fatigue_ratio, subregion, is_custom, notes, exercise_type,
created_at, updated_at
```

Every later `ALTER TABLE exercises ADD COLUMN`, resolved to its
`SCHEMA_MIGRATIONS` array index (1-based = the local `PRAGMA user_version`
that array position becomes) by counting top-level `[` array starts:

| Migration (local v) | Line(s) | Column(s) added |
|---|---|---|
| v1 | `database.js:494` | `subregion` — the base `CREATE TABLE IF NOT EXISTS exercises` (`database.js:221-239`) already lists `subregion` for a brand-new install, but `CREATE TABLE IF NOT EXISTS` is a no-op against an existing table, so this `ALTER` is what actually adds the column for any install whose table predates it. Tolerant of "duplicate column" on installs where it's already there. |
| v3 | `database.js:565-566` | `increment_kg REAL DEFAULT 2.5`, `exercise_category TEXT DEFAULT 'compound'` |
| v19 | `database.js:813-814` | `updated_at_v2 INTEGER`, `deleted_at INTEGER` |
| v38 | `database.js:1358-1366` | `equipment_category`, `machine_type`, `force`, `laterality`, `difficulty`, `machine_ok INTEGER DEFAULT 0`, `home_ok INTEGER DEFAULT 0`, `cue TEXT`, `equipment_profiles TEXT` |
| v41 | `database.js:1437-1447` | **Duplicate re-apply of v38's 9 columns.** Comment at `:1422-1436` explains why: a mid-array insertion shifted v38 down by one index on installs that had already run past the old position, so those installs never got the 9 columns; this is a trailing corrective, tolerant of "duplicate column" via `isBenignMigrationError`. |
| v50 | `database.js:1591-1595` | `exercise_type TEXT DEFAULT 'weight_reps'` (also added to `custom_exercises` in the same migration) |
| v81 | `database.js:2639` | `load_semantics TEXT` |
| v83 | `database.js:2701-2711` | `position TEXT CHECK (position IN ('standing','seated','lying','kneeling','mixed'))`, `floor_access INTEGER`, `overhead_position INTEGER`, `grip_demand TEXT CHECK (grip_demand IN ('none','supportive','bar'))`, `unilateral_loadable INTEGER`, `bilateral_upper INTEGER`, `bilateral_lower INTEGER`, `axial_load INTEGER`, `impact INTEGER`, `balance_demand TEXT CHECK (balance_demand IN ('supported','stable','high'))` |
| v85 | `database.js:2741` | `weight_bearing_hands INTEGER` |
| v86 | `database.js:2897` | `load_semantics TEXT` on `custom_exercises` (not `exercises` — listed for completeness) |

Booleans are stored as `INTEGER` 0/1/NULL (never coerced to 0/1 by
`insertExerciseWithId` — NULL stays NULL, `database.js:3349-3358`).
`equipment_profiles` and `secondary_muscles` are JSON-stringified arrays
(`database.js:3317`, `:3340`).

### 2.1 The custom-exercise path — verify, do not assume

**Custom exercises are NOT stored in the local `custom_exercises` table.**
That table exists (`CREATE TABLE custom_exercises`, `database.js:1178-1200`,
composite PK `(user_id, id)`, added at the same migration index as the
comment `database.js:1174-1176` — "Per-user exercise rows live in
custom_exercises... The legacy exercises table stays library-only" —
**describes intent that the actual write path does not follow.**

The real write path, `ExercisePickerModal.js:483-509` (comment at `:48-54`:
"Custom exercises are written with `isCustom:1` into the `exercises`
table, the same path ManualBuilder already shipped, so `getAllExercises()`
surfaces them and the existing `syncExercises` push covers them"), calls
`insertExercise()` → `database.js:3287-3363` → the **same `exercises`
table**, `is_custom = 1`, random `uid()` id. This is confirmed the sole
creation path: `grep insertExercise\(` across `src/screens` and
`src/components` finds exactly this one call site.

`sync.js:2611-2636`'s own comment documents the reconciliation: cloud
still uses a genuinely separate `custom_exercises` table (composite PK,
migration 020/021 server-side) for per-user rows, but the **pull** path
was fixed to write restored customs into the local `exercises` table
(`is_custom: 1`) rather than the local `custom_exercises` mirror,
"Before this, pulled customs went to the orphaned local `custom_exercises`
table and were invisible/unresolvable after a reinstall or device swap."
**The local `custom_exercises` table is therefore a schema fossil**: it
is created, migrated (v50 added `exercise_type` to it, v86 added
`load_semantics` to it), and joined against in several read queries
(`LEFT JOIN custom_exercises ce ...`, e.g. `database.js:3911`, `:8649`,
`:8664`, `:8715` and others) — but nothing writes a live row into it any
more, so every one of those joins matches nothing today. A new exercise
column plan must decide whether local `custom_exercises` is worth
deleting or is being kept as the eventual real per-user split; it is not
currently doing either job.

Because custom rows are `is_custom=1` rows in the same `exercises` table,
they carry the **same 32+ columns** as canonical rows structurally, but:
- `equipment_category`, `machine_type`, `force`, `laterality`,
  `difficulty`, `machine_ok`, `home_ok`, `equipment_profiles`, and all 11
  demand columns are **left NULL at creation** —
  `ExercisePickerModal.js:505-522`'s comment: "Demand axes are NOT derived
  here - section 8.4 says..." — confirmed the insert call passes none of
  those keys.
- `subregion` is also never set by the picker's create form.
- **Editing**: no edit path exists. `grep -rn "editCustomExercise\|EditExercise"` across `src/screens` and `src/components`: no matches.
- **Deleting**: `deleteExercise(id)` exists (`database.js:3365-3370`,
  `DELETE FROM exercises WHERE id = ? AND is_custom = 1`) but **is never
  called from any screen or component** — `grep -rn "deleteExercise\("`
  across `src` (excluding its own definition and tests): no call sites.
  A user cannot currently delete a custom exercise from the UI.
- **Sync**: `syncExercises()` (`sync.js:230-306`, aliased
  `syncCustomExercises`) pushes every `is_custom` row from the local
  `exercises` table to cloud `custom_exercises` (composite-PK upsert,
  `onConflict: 'user_id,id'`). Pull is `_pullCustomExercises`
  (`sync.js:2611-2636`), restoring into local `exercises` with
  `is_custom: 1` as described above.

---

## 3. Every metadata source

### 3.1 Hand-authored (curated by name, in `seedExercises.js` unless noted)

| Source | Location | Rows covered (of 552) |
|---|---|---|
| `SUBREGION_MAP` | `seedExercises.js:48-584` | 401 tagged, 151 untagged (`(null)`, `seed-enums.json`) |
| `EXERCISE_TYPE_MAP` | `seedExercises.js:1304-1336` | 25 non-default (15 `duration`, 10 `weighted_bodyweight`); remaining 527 default `weight_reps` |
| `SINGLE_IMPLEMENT_TOTAL` | `seedExercises.js:1355-1375` | 33 names (load-semantics override) |
| `ASSISTED_NAMES` | `seedExercises.js:1379` | 2 names |
| `CURATED_DEMANDS` | `capability/demands.js:139-363` | ~150 named overrides across the 11 demand axes, applied last and winning over every regex rule (`demands.js:572-574`) |
| `MACHINE_TYPE_BY_NAME` | `exerciseMetadata.js:163-202` | 38 names |
| `ADAPTED_SETUP` | `exercise/adaptedSetup.js:42-164` | ~28 names with a rich per-exercise entry (plus `CLASS_TEXT` class-level defaults covering any exercise `materialContextsFor` flags, `adaptedSetup.js:173-227`) |
| `FAMILY_LISTS` (back/quads movement family) | `exercise/movementFamily.js:113-187` | back: 4 vertical-pull + 15 horizontal-lat + 18 upper-mid-row + 3 shoulder-extension + 9 spinal-erector + 3 face-pull = 52 named; quads: 7 knee-extension named. Everything else in back/quads defaults per `movementFamily()`'s fallback (`:262`). |
| `CONTESTED` | `movementFamily.js:378-419` | 8 named exercises whose family call is recorded as a judgement, not asserted as fact |

### 3.2 Derived (pure functions, re-run identically by seed and backfill)

| Function | File | Inputs | Outputs |
|---|---|---|---|
| `deriveExerciseMetadata` | `exerciseMetadata.js:265-280` | name, equipment, movementPattern, primaryMuscle, compoundIsolation, fatigueCost | equipmentCategory, machineType, force, laterality, difficulty, machineOk, homeOk, equipmentProfiles |
| `deriveDemandMetadata` | `capability/demands.js:385-575` | name, equipment, movementPattern, primaryMuscle | position, floorAccess, overheadPosition, gripDemand, unilateralLoadable, bilateralUpper, bilateralLower, axialLoad, impact, balanceDemand, weightBearingHands (all null-able; NULL = UNKNOWN by design, CAP-8) |
| `deriveLoadSemantics` | `seedExercises.js:1395-1402` | name, equipment, exerciseType | loadSemantics |
| `movementFamily` | `exercise/movementFamily.js:246-266` | name, primaryMuscle, subregion | movementFamily (back/quads reclassified; every other muscle passes subregion through) |
| `materialContextsFor` / `adaptedSetupFor` | `exercise/adaptedSetup.js:194-245` | name, movementPattern, primaryMuscle, gripDemand, equipment, position, balanceDemand, impact | which `SETUP_CONTEXT`s apply, and the text line for each |
| `canonicalExerciseId` | `exercise/canonicalId.js:48-83` | name (lowercased, trimmed) | deterministic UUID-shaped hash |
| `validateDemandMetadata` | `capability/demands.js:584-608` | the 11 demand fields | list of contradiction strings (empty = passes) |

All are pure, dependency-free, and imported directly by
`scripts/exercise-library/loadSeed.mjs` (no reimplementation) — the one
exception is `deriveLoadSemantics`, copied verbatim into the loader
because `seedExercises.js` itself cannot be imported outside React
Native (it imports `AsyncStorage` and `./database` at module scope;
verified: `import()`ing it under plain Node throws `Directory import
'.../lib/database' is not supported`).

### 3.3 Stored-on-device backfills (`AsyncStorage` keys, `seedExercises.js:9-22`)

| Key | Bumping it does |
|---|---|
| `@volyume_exercises_seeded_v7` (`SEEDED_KEY`) | Controls whether `seedExercisesIfNeeded` runs at all — bump only for a breaking reseed, not attempted here. |
| `@volyume_exercise_metadata_backfilled_v1` (`METADATA_BACKFILL_KEY`) | Re-runs `deriveExerciseMetadata` over every row whose `equipment_category IS NULL` once more. |
| `@volyume_exercise_metadata_rederived_v2` (`METADATA_REDERIVE_KEY`) | Re-runs `deriveExerciseMetadata` over **every** non-custom row unconditionally once more (for rule changes, not just new columns). |
| `@volyume_exercise_library_topped_up_v3` (`LIBRARY_VERSION_KEY`) | Re-scans `RAW` for any `canonicalExerciseId` not yet present locally and inserts it. **This is the one a new-row PR must bump** (see section 8). |

Not a `seedExercises.js` key, but the same mechanism: `seedRoutines.js`'s
own `SEED_KEY = '@volyume_routines_seeded_v14'` (`seedRoutines.js:17`)
gates both the library-plan seed and the `REQUIRED_EXERCISES` insertion
pass (section 1.2) — a v14 bump re-runs `REQUIRED_EXERCISES` too, since
that loop runs unconditionally inside the "add new library plans" pass
once the top-level marker check permits it (`seedRoutines.js:2104-2129`).

---

## 4. Full field list — enum values as actually used (`seed-enums.json`)

All counts below are over the real 552-row corpus
(`data/seed-enums.json`, generated 2026-09-05). "Nullable" states whether
NULL is a value that actually occurs in the corpus and what it means to
consumers.

| Field | DB column | Nullable? | Values in use (count) | What NULL means |
|---|---|---|---|---|
| equipment | `equipment` | No (0 null) | bodyweight 128, barbell 113, dumbbell 103, cable 97, machine 90, smith_machine 10, kettlebell 6, ez_bar 5 | n/a |
| equipmentCategory | `equipment_category` | No (0 null) | bodyweight 107, barbell 105, dumbbell 103, cable 97, machine_selectorised 66, band 21, machine_plate_loaded 16, landmine 13, smith 10, other 8, kettlebell 6 | n/a for canonical rows; **NULL for every custom row** (never derived at creation) |
| machineType | `machine_type` | **Yes, majority** | 514 null; 38 rows carry one of 27 controlled values (`MACHINE_TYPE_BY_NAME`) | "not a controlled resistance-machine station", or simply undocumented for that machine |
| force | `force` | No | push 266, pull 218, static 68 | n/a |
| laterality | `laterality` | No | bilateral 495, unilateral 57 | n/a |
| difficulty | `difficulty` | No (1/2/3 only) | 1: 261, 2: 266, 3: 25 | n/a |
| machine_ok | `machine_ok` | No (bool) | false 292, true 260 | n/a |
| home_ok | `home_ok` | No (bool) | false 318, true 234 | n/a |
| equipment_profiles | `equipment_profiles` (JSON array) | Can be `[]` (custom rows, or a weighted-bodyweight compound per `deriveEquipmentProfiles`, `exerciseMetadata.js:113`) | full_gym / machines_cables / dumbbells_only / barbell_plates / home_gym / bodyweight (values combine per row) | empty array = "cannot be filtered into any generated plan"; `poolGenerator.js:179` drops such rows from the generated pool entirely |
| movementPattern | `movement_pattern` | No | isolation 285, push 68, pull 67, squat 59, hinge 58, carry 8, plyometric 4, core 1, lunge 1, power 1 | n/a |
| compoundIsolation | `compound_isolation` | No | isolation 304, compound 248 | n/a |
| subregion | `subregion` | **Yes** | 401 tagged (30 distinct values), 151 null | "no anatomical-subregion claim made"; `movementFamily()` still resolves back/quads to a default (never null there); other muscles' generated-pool entries fall back to a per-muscle `DEFAULT_SUBREGION` (`poolGenerator.js:66-81`) |
| movementFamily (derived, not stored) | — | Yes, 144 of 552 | see `subregion` table, mostly unchanged; back/quads reclassified per `movementFamily.js` | same as subregion, minus the 7 back/quad rows the reclassification defaults |
| body position | `position` | **Yes** | standing 284, lying 123, seated 96, mixed 27, kneeling 22; 0 null in the shipped 552 (every row currently resolves) | when null (possible for a future/custom row): capability filtering on this axis treats it as UNKNOWN, which is a hard "cannot confirm eligible" for a constrained user (CAP-8), not "fine" |
| grip | `grip_demand` | **Yes**, 0 null today | bar 393, none 109, supportive 50 | same UNKNOWN semantics as position |
| support/stability (balance) | `balance_demand` | **Yes**, 0 null today | supported 268, stable 255, high 29 | same |
| overhead | `overhead_position` | **Yes** | false 483, true 69, 0 null today | same |
| wrist/hands | `weight_bearing_hands` | **Yes** | false 516, true 23, **13 genuinely null** (`seed-enums.json`) | the 13 nulls are real UNKNOWNs left by the derivation — no name rule or curated override resolved them |
| axial | `axial_load` | **Yes** | false 431, true 121, 0 null today | same |
| impact | `impact` | No (regex-derived, always resolves true/false) | false 544, true 8 | n/a |
| range/depth | — | **Not a stored field.** `REDUCED_RANGE` is one of the 7 `adaptedSetup` `SETUP_CONTEXT` values, text-only, not a queryable column. | | |
| unilateral loadable | `unilateral_loadable` | **Yes** | false 305, true 221, **26 null** | genuinely unresolved by any rule or curated override |
| bilateral upper | `bilateral_upper` | **Yes** | false 300, true 251, **1 null** | same |
| bilateral lower | `bilateral_lower` | **Yes** | false 387, true 165, 0 null today | n/a for the current corpus |
| adapted-setup class | — | n/a, computed on read | `materialContextsFor` returns 0-4 of the 7 `SETUP_CONTEXT` values per row; `ADAPTED-SETUP-COVERAGE.md` puts materially-needing rows well under the full corpus | rows needing none carry a recorded reason (10 categories), not silence |
| logging/exercise type | `exercise_type` | No | weight_reps 527, duration 15, weighted_bodyweight 10 | n/a. No local SQLite CHECK constraint on this column (only a cloud-side one, per the `ExercisePickerModal.js:59-60` comment referencing `supabase/migrate_091_exercise_type.sql`); `reps_only` and `distance` also exist as UI options in `ExercisePickerModal.js:64-69` for **custom** exercises but no canonical row uses either |
| load semantics | `load_semantics` | No (defaults `'total'`) | total 467, per_hand 73, added_bodyweight 10, assisted 2 | n/a |
| rep/set defaults | `default_rep_min`/`default_rep_max` | No | integers per row, from tuple positions 6-7 | n/a |
| priority/score — fatigue | `fatigue_cost` | No | integer 1-10 per row (tuple position 8) | n/a for canonical; **NULL is a deliberate value for a custom exercise** (`sync.js:257-260`: "NULL is a DELIBERATE value... no claimed SFR/fatigue judgement") |
| priority/score — SFR | `stimulus_to_fatigue_ratio` | Same as fatigue_cost | integer 1-10 per row | same |
| `exercise_category` | `exercise_category` | No, but **dead** | **100% `'compound'`** (552/552, `seed-enums.json`) | see section 6 finding — never derived from `compoundIsolation`, always the DB default |
| `increment_kg` | `increment_kg` | No, but **dead** | **100% `2.5`** | same |
| `cue` | `cue` | **Always null for canonical rows** | 552/552 null | `rowToExercise` never sets it; read by `ExerciseDetailScreen.js:536` as `coachingCue` and rendered when truthy — for canonical exercises, never |

Aliases: **no alias field exists anywhere in the schema.** `grep -rn
"alias" src/lib/seedExercises.js src/lib/database.js
src/components/ExercisePickerModal.js`: only one incidental match (a
comment about "saveLabel / actionLabel are aliases for the create-form's
save button text" — unrelated to exercise names).

---

## 5. Search, matching, ranking, and ordering

`src/lib/exerciseFuzzySearch.js` (155 lines, pure, no RN dependency) is
the only matcher. It tokenizes the query and the candidate **name only**
(`tokenize`, `:37-39`) — there is no alias/synonym field to also match
against (confirmed above). Per-token scoring (`scoreTokenPair`,
`:86-111`) in strict preference order: exact match (1.0) > prefix match
(~0.9-1.0) > substring (~0.6-0.8) > in-order subsequence (~0.3-0.5) >
Levenshtein-distance typo tolerance scaled by token length (`:98-109`,
allowed distance 1/2/3 for tokens ≤4/≤7/>7 chars). `fuzzyScore` (`:121-138`)
requires **every** query token to match something in the name (AND
across query tokens; `:134` returns 0 the moment one token has no match
anywhere) — this is why "leg curl" does not also surface "leg press".
`fuzzySearch` (`:146-154`) filters to score > 0 and sorts descending,
stable tie-break by original index.

`ExercisePickerModal.js` calls this over `getAllExercises()`'s full
in-memory list (imported at `:20`) — no separate index or cache; the
"picker" and "search" are the same list, fuzzy-filtered client-side.

**"Recent"**: `getRecentlyUsedExerciseIds(userId, limit=8)`
(`database.js:3874-3888`) — the last 8 distinct `exercise_id`s from
completed, non-warmup `workout_sets`, ordered by most recent
`workouts.started_at`. Shown only in add-mode with no active filter/query
(`ExercisePickerModal.js:299-365`).

**"Favourites"**: does not exist for exercises. `grep -rln
"exercise.*favourite|favourite.*exercise" src --include=*.js`, excluding
the food domain: no matches. (Food has its own `food_favourites` table;
unrelated.)

**"History"**: not a picker concept — it is `ExerciseDetailScreen`'s own
past-sets list, reading `workout_sets` joined to `workouts`, unrelated to
ranking in the picker.

---

## 6. Every consumer and exactly which fields it reads

| Consumer | File | Exercise fields read |
|---|---|---|
| Pool generation | `src/lib/poolGenerator.js` (`toPoolEntry`, `:113-135`; `generatePoolFromLibrary`, `:172-184`) | name, primaryMuscle, subregion, equipmentCategory, compoundIsolation, equipmentProfiles (via `parseProfiles`), difficulty, stimulusToFatigueRatio, fatigueCost, secondaryMuscles, movementPattern (for the `NON_HYPERTROPHY_PATTERNS` exclusion, `:143-152`) |
| Plan generation core | `src/lib/planEngine.js` | Consumes `poolGenerator`'s `{n, sub, p, eq, difficulty, sfr, fatigue, equipmentCategory, secondary}` pool-entry shape (its hardcoded `POOL` fallback carries the same shape by hand); supersetting reads `_paramKey`/`_equipmentCategory`/`_muscle`/`exerciseName` tags it stamps on entries itself (`supersetParam`/`supersetModality`/`relationshipTier`, `:2911-2998`) |
| `planAutoGen.js` | persists `ex.supersetGroupId` (`:1033`) from the engine's pairing pass into `routine_exercises.superset_group_id` | id/name (via canonical-identity resolution, Campaign 16 job 9), supersetGroupId |
| `exercise/generation.js` | `generationBlockReason`/`filterLibraryForGeneration` (`:66-191`) | id, name, primaryMuscle, subregion (via `movementFamilyOf`), plus every capability demand field through `capabilityBlockReason` (below) |
| Swap ranking | `src/lib/swapEngine.js` (`scoreCandidate`/`buildSwapReason`/`rankSwaps`, whole file) | primaryMuscle, subregion, movementPattern, equipment, compoundIsolation, fatigueCost, stimulusToFatigueRatio, id, name, equipmentProfiles (via `parseProfiles`, for the equipment filter) |
| `exercise/intent.js` | `movementFamilyOf` (`:279-284`) | name, primaryMuscle (or `.muscle`), subregion |
| `exercise/swapScope.js` | n/a — an enum module only (`SESSION`/`PROGRAMME`), no exercise fields | — |
| `exercise/continuity.js` | reads `exerciseId`/`exerciseName` off historical routine/workout join rows, not raw exercise-table columns; `familyOf` is injected by the caller (the real `movementFamily`) | exerciseId, exerciseName |
| Capability / How You Train | `src/lib/capability/resolve.js` (`capabilityBlockReason` and friends, whole file) | id, name, primaryMuscle, subregion (via `movementFamily`), and all 11 demand fields: position, floorAccess, overheadPosition, gripDemand, unilateralLoadable, bilateralUpper, bilateralLower, axialLoad, impact, balanceDemand, weightBearingHands |
| `capability/eligibility.js` | `isExerciseConstrainedAt`/`constrainedMusclesAt`/`constrainedMusclesInWindow` (`:52-115`) | primaryMuscle (for the muscle-level rollup), plus whatever `capabilityBlockReason` reads (above), via the same exercise object |
| Supersets | Not a separate module — lives inside `planEngine.js` (`:2849-2998`, "Pairs adjacent accessory exercises into supersets"). C16 job 4 (founder ruling, comment `:3037-3046`) retired **automatic** superset generation; `ActiveWorkoutScreen` still runs user-created supersets read from `routine_exercises.superset_group_id` | (auto-pairing, retired) restSec/`_paramKey`/`_equipmentCategory`/`_muscle`/exerciseName; (live) `superset_group_id` only |
| Live workout | `src/screens/ActiveWorkoutScreen.js` | equipment, exerciseType, id, laterality, name, restSec, compoundIsolation, exerciseCategory (+ snake_case fallback `exercise_category`), incrementKg (+ `increment_kg`), loadSemantics, notes, primaryMuscle, recommendedSets |
| Exercise detail | `src/screens/ExerciseDetailScreen.js` | compoundIsolation, cue, defaultRepMax, defaultRepMin, exerciseType, fatigueCost, loadSemantics, name, notes, primaryMuscle, secondaryMuscles, stimulusToFatigueRatio, subregion, id; also calls `adaptedSetupFor(exercise)` (needs position/gripDemand/equipment/primaryMuscle/balanceDemand/impact/movementPattern to compute contexts) |
| Manual builder | `src/screens/ManualBuilderScreen.js` | compoundIsolation (+ snake_case), defaultRepMax/Min (+ snake_case), equipmentCategory (+ snake_case), id, name, primaryMuscle (+ snake_case) |
| `src/screens/BuildWorkoutScreen.js` | defaultRepMax/Min, equipment, id, name, primaryMuscle | |
| Routines library seed | `src/lib/seedRoutines.js` | Its own `REQUIRED_EXERCISES` rows carry name/primaryMuscle/equipment/movementPattern/compoundIsolation/defaultRepMin/defaultRepMax/fatigueCost/stimulusToFatigueRatio (same 10-ish fields as `RAW`, hand-typed separately — see section 1.2); `LIBRARY_PLANS` templates reference exercises **by name string** (matched against `getAllExercises()` via `byName`, `:2106-2109`) |
| Plan library | `src/screens/PlanLibraryScreen.js` | **No exercise-table fields at all.** Reads `plan.difficulty` — a routine/programme-level field from `LIBRARY_PLANS`/`createProgramme`, unrelated to the exercise-level `difficulty` column. Do not conflate the two `difficulty`s. |
| History/coaching | keys on `exercise_id` (workout_sets, routine_exercises) and `exercise_name` (denormalised snapshot column, `database.js:794-795` per `06-EVIDENCE-CONSUMERS.md` section 1) rather than re-reading exercise metadata after the fact | exercise_id, exercise_name |

---

## 7. Prioritisation — default pick vs alternative vs never generated

- **Never generated (hard exclusions)**: `poolGenerator.generatePoolFromLibrary`
  (`:172-184`) drops any row with no `name`/`primaryMuscle`, no
  `equipmentCategory` or `equipmentCategory === 'other'`, or an empty
  `equipmentProfiles` array (`entry.eq.length === 0`), and anything
  matching `isHypertrophyExercise`'s exclusion (`plyometric`/`power`
  movement patterns, or a named list of conditioning/power moves,
  `poolGenerator.js:143-152`).
- **The equipment_profiles rule that keeps bodyweight/bands out of loaded
  plans**: `deriveEquipmentProfiles` (`exerciseMetadata.js:110-120`).
  Bodyweight **isolation** movements get every profile (they're gym
  staples for any level); bodyweight **compounds** with `weighted` in the
  name get `[]` (no generated-plan slot at all — hand-pick only); other
  bodyweight compounds get `['bodyweight']` only. Bands get
  `['bodyweight']` only, **except** the two named D10/D19 exceptions
  (`Band Lat Pulldown`, `Band Assisted Pull-Up`), which also earn
  `dumbbells_only`/`barbell_plates`/`home_gym` because those profiles have
  zero non-band vertical-pull alternative (`:107-108`, `:116-118`). This
  is the single mechanism; there is no second gate elsewhere.
- **Default pick vs alternative**: no exercise carries a stored
  "default"/"priority" flag. Selection is the engine's own ranking inside
  the filtered pool (`stimulus_to_fatigue_ratio`, `fatigue_cost`,
  `difficulty`, movement-family/role coverage per
  `movementFamily.js:337-367`), not a library-side score.
- **Swap ranking's score** lives entirely in `swapEngine.js`'s five
  weighted terms (`:18-30`): same primary muscle (40) > same subregion
  within that muscle (25) > same movement pattern (20) > same equipment
  (15) > same compound/isolation (10) > similar fatigue cost (10) >
  similar SFR (10). No other module scores swap candidates.

---

## 8. Existing guards (tests/scripts that pin the seed)

| Guard | Path | What it pins |
|---|---|---|
| Demand-ontology coverage report | `scripts/demand-coverage-report.mjs` | Per-axis/per-muscle non-null coverage, contradiction check via `validateDemandMetadata`. **Undercounts by 1** (section 1.1). |
| Adapted-setup coverage report | `scripts/adapted-setup-coverage.mjs` | Every row needing adapted-setup text resolves to a specific or class-default line; **undercounts by 1**. |
| Capability demand invariants | `src/lib/capability/__tests__/capabilityDemands.test.js` | Axis coverage floors, contradiction-free derivation |
| Canonical ID stability/determinism | `src/lib/__tests__/campaign16.canonicalIdentity.test.js` (`:97,105,124-127`) | Same name → same ID; case-insensitive; a one-character name change avalanches to a different ID; the seed's re-export matches `canonicalId.js`'s own hash |
| Movement family classification | `src/lib/__tests__/campaign16.movementFamily.test.js` | Back/quads reclassification, `CONTESTED` list honesty |
| Adapted-setup content/wording | `src/lib/exercise/__tests__/adaptedSetup.test.js` | Names referenced in `ADAPTED_SETUP` exist in the live seed; wording law (no em dash, no clinical/technique language) |
| Biceps subregion fix | `src/lib/__tests__/database.bicepsSubregion.test.js` | The D8 long_head/short_head/brachialis tagging holds |
| Exercise metadata derivation | `src/lib/__tests__/exerciseMetadata.test.js` | `deriveExerciseMetadata`'s per-category rules |
| Backfill idempotency | `src/lib/__tests__/exerciseBackfill.test.js` | Backfill only touches null rows; safe to re-run |
| Demand metadata migration | `src/lib/__tests__/database.demandMetadataMigration.test.js` | The v83/v85 ALTER statements land the CHECK-constrained columns correctly |
| Plan-quality suites built on the real library | `src/lib/__tests__/campaign16.*.test.js` (helpers via `campaign16.helpers.js`) | Generated-plan correctness against "the real seeded library" — **also undercounts by 1** (section 1.1) |
| Pool generator | `src/lib/__tests__/poolGenerator.test.js` | `toPoolEntry`/`generatePoolFromLibrary`/`findThinMuscles` behaviour |
| Load semantics | `src/lib/__tests__/loadSemantics.test.js` | `deriveLoadSemantics` per-equipment/per-name rules |
| Capability scenario suites | `capabilityFamilyPlans.test.js`, `capabilityGeneratedPlans.test.js`, `capabilityOnboardingWalks.test.js`, `capabilityQ3Scenario.test.js`, `capability/__tests__/directoryScenarioMatrix.test.js`, `capability/__tests__/movementConstraintFixtures.test.js` | End-to-end capability filtering against real generated plans and fixture users |

**No test asserts the RAW row count itself** (551 or 552) — this is a gap:
nothing would fail if a future edit accidentally deleted a row.

---

## 9. What a new built-in row needs — the checklist

To be complete for every consumer above, a new canonical row must:

1. **Be added to `RAW`** (`seedExercises.js`) as a single-line, 10-field
   tuple — any quote style is fine as long as it stays on one line and
   brackets balance (section 1.1's fix now tolerates either style, but a
   multi-line literal would still need this loader special-cased, which
   the brief says to avoid — keep new rows single-line).
2. **Bump `LIBRARY_VERSION_KEY`** (`seedExercises.js:22`,
   `@volyume_exercise_library_topped_up_v3` → `v4`) so existing installs'
   `topUpNewExercisesIfNeeded()` actually scans for it. Forgetting this
   means only fresh installs ever see the new row.
3. **Add a `SUBREGION_MAP` entry** if the muscle has an enforced
   subregion split (chest/back/delts/hamstrings/triceps/calves/abs/
   glutes/quads/biceps — section 4's `subregion` table) — otherwise the
   row silently defaults (`poolGenerator.js:66-81` for pool generation;
   `movementFamily.js:262` specifically for back/quads).
4. **Check `EXERCISE_TYPE_MAP`** — only if the row is a timed hold or a
   commonly-loaded bodyweight rep movement (section 3.1); everything else
   correctly defaults to `weight_reps`.
5. **Check `SINGLE_IMPLEMENT_TOTAL`/`ASSISTED_NAMES`** — only if the row
   is a dumbbell/kettlebell exercise whose entered weight is the *whole*
   load (not per-hand) or an assistance-stack machine.
6. **Consider `CURATED_DEMANDS`** (`capability/demands.js:139-363`) —
   required whenever the name-rule regexes in the same file would
   misclassify or leave NULL an axis the row should carry with
   confidence. `validateDemandMetadata` (section 3.2) is the check; this
   campaign's `loadSeedRows()` runs it over every row and currently
   reports **0 failures**, so any new row that fails it must get a
   curated override before shipping.
7. **Consider `MACHINE_TYPE_BY_NAME`** if it is a controlled-vocabulary
   resistance-machine station (section 3.1 — 38 of 90 machine rows
   currently carry one; most machine rows do not, and that is normal).
8. **Consider `ADAPTED_SETUP`** if it's the kind of exercise
   `materialContextsFor` would flag (section 5's adapted-setup class) and
   a richer-than-class-default line is warranted; otherwise the class
   default (`CLASS_TEXT`) covers it automatically once the demand fields
   above resolve correctly — no action needed.
9. **If it changes back/quads' movement-family taxonomy**: add it to the
   correct `FAMILY_LISTS` array in `movementFamily.js:113-187`, or it
   silently defaults to `UPPER_MID_ROW` (back) / `SQUAT_PRESS` (quads).
10. **Do not set** `cue`, `exercise_category`, or `increment_kg` expecting
    them to matter for a canonical row — nothing in the seed path derives
    them from the tuple (section 6 finding); they are DB-insert-time
    constants (`null`, `'compound'`, `2.5`) for every canonical row today.
11. **No test currently fails if any of the above is skipped** except
    `validateDemandMetadata`'s contradiction check (run as part of the
    capability demand test suite) and the biceps/adapted-setup/movement-
    family suites for their specific scopes — there is no row-count
    guard and no "every RAW row has a subregion" guard. A new
    campaign-scale addition should add one.

---

## 10. Top systemic findings (evidence-first)

1. **The corpus is 552 rows, not 551.** Three independent parsers
   (`demand-coverage-report.mjs:29`, `adapted-setup-coverage.mjs:34`,
   `campaign16.helpers.js:36`) all filter RAW rows by
   `startsWith("['")`/`\[\s*'`, which misses `seedExercises.js:927`
   (`["Farmer's Walk", ...]`, double-quoted because the name has an
   apostrophe). Every downstream coverage report and Campaign 16
   plan-quality test built on these has silently excluded `Farmer's Walk`
   from its analysis. Section 1.1.
2. **A second, parallel exercise-insertion path exists outside
   `seedExercises.js` entirely.** `seedRoutines.js:21-38`'s
   `REQUIRED_EXERCISES` (18 rows) are inserted with `insertExercise()` —
   **random `uid()`, not `canonicalExerciseId`** — so the same named
   exercise gets a different ID on different devices, defeating the exact
   cross-device join guarantee `canonicalExerciseId` exists for
   (`canonicalId.js:25-39`). These rows are invisible to every seed-aware
   script and test. Section 1.2.
3. **`exercise_category` and `increment_kg` are dead columns for the
   canonical library.** `rowToExercise` never derives either from
   `compoundIsolation`; `insertExerciseWithId` defaults them to
   `'compound'`/`2.5` for every single row (`database.js:3330-3331`).
   `seed-enums.json` confirms: 552/552 `'compound'`, 552/552 `2.5`.
   `ActiveWorkoutScreen.js` and `algorithms.js:defaultIncrement`
   genuinely branch on `exerciseCategory` (`'isolation'`/`'accessory'`
   get smaller weight-increment steps), but that branch **never fires**
   for a canonical exercise today — every isolation movement (dumbbell
   curl, cable fly, leg extension...) gets the compound-sized 2.5kg/60kg
   step logic, not the isolation 1kg/20kg logic the code clearly intends.
4. **`cue` is stored, read, and rendered, but never populated.**
   `ExerciseDetailScreen.js:536` reads `exercise.cue` as a "coaching cue"
   and renders it when truthy; no canonical row has ever had one written
   (`rowToExercise` never sets it). Dead UI surface for 100% of the
   built-in library today.
5. **The local `custom_exercises` table is a fossil.** Migration comment
   (`database.js:1174-1176`) describes a split that the actual
   create/read/sync code does not implement: custom exercises live in
   `exercises` with `is_custom=1` (`ExercisePickerModal.js:483-509`), and
   `sync.js:2611-2636`'s own comment documents that the pull path was
   deliberately changed to write there instead of into
   `custom_exercises`, because the latter made restored customs
   "invisible/unresolvable after a reinstall or device swap." Several
   `LEFT JOIN custom_exercises` reads elsewhere therefore match nothing.
6. **No UI path edits or deletes a custom exercise.** `deleteExercise()`
   exists (`database.js:3365-3370`) but has zero call sites outside its
   own definition and tests.
7. **No alias/synonym field exists.** Search matches the `name` column
   only (`exerciseFuzzySearch.js`); a market-leading corpus with common
   alternate names ("RDL" for "Romanian Deadlift", "OHP" for "Overhead
   Press") has no schema slot to carry them without adding one.
8. **`subregion` and the derived `movementFamily` disagree in count**
   (151 vs 144 null) only for back/quads, by design
   (`movementFamily.js`'s deliberate reclassification) — anyone reading
   `subregion` directly instead of calling `movementFamily()` for those
   two muscles is reading the pre-fix taxonomy the whole module exists to
   correct. Every consumer that needs back/quads correctness must call
   `movementFamily()`, not read `subregion` raw; `poolGenerator.js` does
   this correctly (`translateSubregion`, `:90-92`), but any new consumer
   must be told to as well.
9. **13 rows carry a genuinely unresolved `weight_bearing_hands`, 26 an
   unresolved `unilateral_loadable`, 1 an unresolved `bilateral_upper`**
   (section 4) — real CAP-8 UNKNOWNs, not defects, but each is a hard
   "cannot confirm eligible" for a capability-constrained user on that
   axis. A corpus expansion that grows those axes' NULL counts widens
   that population's ineligible set.
10. **`ADAPTED_SETUP`'s per-exercise entries and `CURATED_DEMANDS`'s
    per-exercise overrides are both keyed by exact canonical **name**,
    not by ID.** Renaming any of the ~150 + ~28 named rows in those two
    maps silently drops its override with no error (a name mismatch
    fails closed to "no override", not a thrown exception) — verify by
    name-existence test before any renaming, not just before adding.

---

## 11. Ambiguous / unresolved for the founder or a later document

- Whether `seedRoutines.js`'s 18 `REQUIRED_EXERCISES` should be folded
  into `RAW` (canonical, ID-stable, counted) as part of this campaign's
  identity policy, or are intentionally a separate "template-scaffolding"
  tier — this doc surfaces the fact pattern (section 1.2) but the policy
  call belongs in `05-DECISIONS.md`.
- Whether the local `custom_exercises` table should be dropped
  (nothing writes to it) or is earmarked for a real future split — out of
  this doc's read-only scope to decide.
- `exercise_category`/`increment_kg` being dead for canonical rows
  (finding 3) was not something this doc was asked to fix — flagged for
  the campaign to decide whether closing it is in scope alongside the
  library expansion, since a large batch of new isolation rows would
  compound the same defaulting behaviour.
