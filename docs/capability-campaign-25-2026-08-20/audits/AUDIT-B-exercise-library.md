# AUDIT B — Exercise library schema and metadata

Evidence-gathering only. No product or architecture decisions. Every claim
below is either OBSERVED (verified directly against source, with the exact
command/file:line) or REPORTED (drawn from a comment/doc, not independently
re-derived) — labelled inline. Unverifiable items are listed in Section 14,
not asserted.

---

## 1. SCOPE/METHOD

Domain: the built-in exercise catalogue (seed data), its metadata schema
(local SQLite + cloud Supabase), the derivation/backfill infrastructure that
populates that metadata, custom-exercise creation and sync, and every reader
that consumes exercise metadata for selection/scoring/swap-ranking.

Method: static, read-only inspection of source files (`Read`/`Grep`/`grep`/
`sed`) plus verification scripts run with plain `node` (no Expo/RN runtime).
Coverage/value-domain numbers in Section 4 were NOT eyeballed or estimated —
they were computed by extracting the exact literal blocks (`SUBREGION_MAP`,
`RAW`, `EXERCISE_TYPE_MAP`, `SINGLE_IMPLEMENT_TOTAL`, `ASSISTED_NAMES`,
`deriveLoadSemantics`) verbatim out of `src/lib/seedExercises.js` via `sed`
line ranges, and the entire pure module `src/lib/exerciseMetadata.js` (zero
imports, confirmed by reading it in full), then executing them with Node's
`Function()` constructor and running the *actual* `rowToExercise()`/
`deriveExerciseMetadata()`/`deriveLoadSemantics()` logic over every row —
not a re-implementation. Scripts live in the scratchpad
(`/tmp/claude-0/-home-user-ADPhysique/95210e18-d5ce-44e1-b4ab-1a795e1337fa/scratchpad/analyze.js`
and companions) and are reproducible; the exact `sed`/`node` commands used
are shown next to each claim below. No Supabase MCP tools were used (out of
scope per brief: local file evidence only). No files outside this report
were written; no code was run other than read-only `node -e` analysis of
extracted literals.

---

## 2. CURRENT BEHAVIOUR

The exercise catalogue is offline-first and asymmetric by design:

- **Canonical (built-in) exercises** are seeded **locally, on-device**, from
  a hard-coded JS array (`RAW`, `src/lib/seedExercises.js:586-1285`). They
  are never pushed to or pulled from Supabase as a catalogue — each device
  independently re-seeds the same 552 rows under the same deterministic,
  name-derived IDs (Section 4/13). A legacy cloud `exercises` table still
  exists (pre-dates the 2026 custom/library split) and is pulled
  user-scoped only (`_pullExercises`, `src/lib/sync.js:2331-2347`), which in
  practice now only serves pre-migration-020 custom rows that were never
  migrated off it.
- **Custom exercises** are created on-device (two independent creation
  paths, Section 6), stored in the SAME local `exercises` table with
  `is_custom=1`, and synced to a **separate** cloud table,
  `custom_exercises` (composite PK `user_id,id`), which is the real
  cross-device sync target (Section 12).
- A large layer of **derived metadata** (`equipmentCategory`, `machineType`,
  `force`, `laterality`, `difficulty`, `machineOk`, `homeOk`,
  `equipmentProfiles`) is computed from the raw fields by pure functions in
  `src/lib/exerciseMetadata.js` and written into extra columns on the LOCAL
  `exercises` table only. It is deliberately never computed for custom
  exercises and does not exist as columns on either cloud table (Section 4,
  10).
- A parallel, separate module (`src/lib/exercise/movementFamily.js`)
  re-classifies TWO muscles' (`back`, `quads`) subregion tags by exercise
  NAME because the original library tags for those two were judged wrong at
  the time (Campaign 16 job 3); every other muscle's stored `subregion` is
  trusted as-is. This is a third layer of truth for "what movement is this"
  living outside the schema (Section 9/10).

---

## 3. FILES & FUNCTIONS

**Catalogue / seeding**
- `src/lib/seedExercises.js` (1572 lines) — `RAW` (the 552-row catalogue,
  :586-1285), `SUBREGION_MAP` (:45-581), `EXERCISE_TYPE_MAP` (:1301-1333),
  `SINGLE_IMPLEMENT_TOTAL`/`ASSISTED_NAMES`/`deriveLoadSemantics`
  (:1352-1399), `rowToExercise` (:1404-1425), `seedExercisesIfNeeded`
  (:1427-1455), `topUpNewExercisesIfNeeded` (:1463-1483),
  `backfillExerciseMetadataIfNeeded` (:1494-1513),
  `rederiveExerciseMetadataIfNeeded` (:1554-1572).
- `src/lib/exercise/canonicalId.js` — `canonicalExerciseId(name)` (:48-83),
  the deterministic name→UUID-shaped-hash used for every canonical ID.
  Re-exported from `seedExercises.js:32-34`.
- `src/lib/exerciseMetadata.js` (280 lines, zero imports) —
  `deriveEquipmentCategory` (:40-60), `deriveEquipmentProfiles` (:110-120),
  `deriveForce` (:132-149), `deriveLaterality` (:156-158),
  `deriveMachineType` (:204-209) + `MACHINE_TYPE_BY_NAME` (:163-202),
  `deriveMachineOk`/`deriveHomeOk` (:214-220), `deriveDifficulty`
  (:244-253), top-level `deriveExerciseMetadata` (:265-280).

**Third-taxonomy / normalisation layer**
- `src/lib/exercise/movementFamily.js` (~390 lines) — `FAMILY` enum
  (:80-104), curated name→family lists for back/quads (:113-187),
  `movementFamily(name, muscle, subregion)` (:246-266), `CLASSIFIED_MUSCLES`
  (:227, `['back','quads']`), `FAMILY_LABELS` calm-copy map (:283-…, feeds
  the C31 pattern-avoidance UI).
- `src/lib/poolGenerator.js` — `parseProfiles` (:104-111, the ONE
  `equipmentProfiles` JSON-string parser every consumer shares),
  `translateSubregion`/`SUBREGION_TRANSLATION`/`DEFAULT_SUBREGION`
  (:36-98), `toPoolEntry` (:113-135), `generatePoolFromLibrary`
  (:159-172), `deriveParamKey` (:23-28), `isHypertrophyExercise`
  (:148-152).

**Readers (selection/scoring/swap)**
- `src/lib/swapEngine.js` — `scoreCandidate` (:42-93), `buildSwapReason`
  (:107-…), `rankSwaps` (:200-260).
- `src/lib/planEngine.js` (3553 lines) — `filterPool` (:1330-1348),
  `selectExercisesForMuscle` (:1415-…), `toClassifierShape` (:2992-3002).
- `src/lib/exercise/intent.js` — the C31 read layer: `movementFamilyOf`
  (:242-247), `isPatternAvoided`/`isFamilyBlocked`/`isEligibleExercise`
  (:254-296), `rankPersonalised` (:600-…).
- `src/lib/exercise/movementConstraints.js` (53 lines) — the C31 write
  layer: `setMovementPatternAvoid`/`clearMovementPatternAvoid`.
- `src/lib/exerciseDisplay.js` (132 lines) — `matchesEquipmentFilter`
  (:42-72), `matchesMuscleFilter` (:81-86), `equipmentDisplayLabel`
  (:93-102), `difficultyDisplayLabel` (:109-120, reads a `notes`
  free-text convention — see Section 4/14), `subregionDisplayLabel`
  (:126-131).
- `src/lib/exerciseFuzzySearch.js` (154 lines) — `tokenize`, `fuzzyScore`,
  `fuzzySearch`, `levenshteinDistance`; name-only typo-tolerant search
  behind the exercise picker.
- `src/lib/formTips.js` (629 lines) — `FORM_TIPS`, a **separate**,
  name-keyed, free-text coaching-cue dictionary (554 entries), not stored in
  the database at all (Section 4).

**Custom exercise creation / storage / sync**
- `src/components/ExercisePickerModal.js` — the shared picker/creation
  modal; `handleCreate` (:232-286), `PICKER_MUSCLES`/`PICKER_EQUIPMENT`
  (:39-40), `EXERCISE_TYPE_OPTIONS`/`LOAD_SEMANTICS_OPTIONS` (:48-65).
- `src/lib/importExternal.js` — second, independent custom-exercise
  creation path: `createCustomExerciseRow` (:477-488), `bestMatch`/
  `similarity` fuzzy-match gate (:461-473), invoked from `src/screens/
  ImportScreen.js`.
- `src/lib/database.js` (>10,000 lines) — schema + CRUD: `exercises`
  CREATE TABLE (:198-216), `custom_exercises` CREATE TABLE (:1155-1177),
  `uid()` (:58-67), `getAllExercises`/`getExerciseById` (:2940-2952),
  `insertExercise`/`insertExerciseWithId` (:2963-3021), `updateExerciseMetadata`
  (:3037-…), `insertOrUpdateExerciseFromCloud` (:9149-…), `getExerciseRowsById`
  (:5186-5199), `BACKUP_TABLES` (:6442-…).
- `src/lib/sync.js` — `syncExercises` (push, :226-280, custom only),
  `_pullExercises` (:2331-2347, legacy cloud `exercises`, user-scoped),
  `_pullCustomExercises` (:2570-2595, current cloud `custom_exercises`).
- `src/lib/uuid.js` — the *other* ID generator (`generateUUID`,
  CSPRNG via `expo-crypto`), used by `importExternal.js`, distinct from
  `database.js:uid()` (Math.random-based).

---

## 4. TABLES & FIELDS (local + cloud + seed data, migration refs)

### 4.1 Built-in exercise count — verified

`RAW.length === 552`, confirmed by executing the real array (not a text
count): `node analyze.js` → `RAW.length (total built-in exercises): 552`.
Duplicate-name check: 0 duplicates, 552 distinct names. A naive
`grep -c "^  \['" src/lib/seedExercises.js` returns **551**, undercounting
by one — the missing row is `["Farmer's Walk", ...]` (seedExercises.js:340,
approx.), which uses double quotes because the name contains an apostrophe,
so it doesn't match a single-quote-anchored grep. Confirmed by isolating
that exact line: `NON-STANDARD START ... "Farmer's Walk"`. **552 is the
correct, code-executed count; 551 is a grep artefact.**

### 4.2 Local schema — `exercises` (SQLite, `src/lib/database.js`)

Base `CREATE TABLE` (:198-216): `id, name, primary_muscle,
secondary_muscles, equipment, movement_pattern, compound_isolation,
default_rep_min, default_rep_max, fatigue_cost, stimulus_to_fatigue_ratio,
subregion, is_custom, notes, exercise_type, created_at, updated_at`.

Added later via `ALTER TABLE exercises ADD COLUMN` across the local
migration array (exact column names extracted via
`grep -n "ALTER TABLE exercises ADD COLUMN" src/lib/database.js`):
`increment_kg` (:542), `exercise_category` (:543), `updated_at_v2` (:790),
`deleted_at` (:791), `equipment_category, machine_type, force, laterality,
difficulty, machine_ok, home_ok, cue, equipment_profiles` (:1335-1343, a
9-column block, RE-APPLIED at :1415-1423 as a corrective duplicate — see
comment at :1399-1413, a documented mid-array-insertion bug that skipped
this block for some installs; both blocks are duplicate-column-tolerant),
`load_semantics` (:2615, C32/migrate_143 local mirror).

**Deduplicated total: 31 distinct columns** on the local `exercises` table
across all installs (`id, name, primary_muscle, secondary_muscles,
equipment, movement_pattern, compound_isolation, default_rep_min,
default_rep_max, fatigue_cost, stimulus_to_fatigue_ratio, subregion,
is_custom, notes, exercise_type, created_at, updated_at, cue, deleted_at,
difficulty, equipment_category, equipment_profiles, exercise_category,
force, home_ok, increment_kg, laterality, load_semantics, machine_ok,
machine_type, updated_at_v2`).

### 4.3 Local schema — `custom_exercises` (SQLite, unused mirror)

`CREATE TABLE` (database.js:1155-1177): `id, user_id, name, primary_muscle,
secondary_muscles, equipment, movement_pattern, compound_isolation,
default_rep_min, default_rep_max, fatigue_cost, stimulus_to_fatigue_ratio,
subregion, exercise_category, increment_kg, notes, exercise_type,
created_at, updated_at, deleted_at` (composite PK `user_id, id`), plus
`load_semantics` added at :2631. **Structurally lacks all 8 derived-metadata
columns** (`equipment_category` through `equipment_profiles`) — they were
never added to this table by any migration.

OBSERVED: no `INSERT` (or `INSERT OR REPLACE`/`INSERT OR IGNORE`) into this
table exists anywhere in `src/` — verified with
`grep -rniE "INSERT (OR [A-Z]+ )?INTO custom_exercises|INSERT.{0,3}custom_exercises" src/`
(zero matches). It is created and schema-migrated, queried defensively in
~10 `LEFT JOIN`s (workout-history display queries, e.g. database.js:3484,
7502, 7517…) and once directly (`getExerciseRowsById`, :5186-5199, merges
`custom_exercises` rows into a map keyed by id), and listed in export/backup
contexts (:6442 `BACKUP_TABLES` deliberately excludes it, per its own
comment at :6429-6441). Since nothing ever inserts into it, the `LEFT JOIN`s
and `getExerciseRowsById`'s custom-branch resolve against a permanently
empty table on every device. This exact fact is independently corroborated
by the test file's own header:
`src/lib/__tests__/customExerciseSync.contract.test.js:1-11` — "The local
`custom_exercises` table is an orphaned mirror nothing reads for display or
resolution." The REAL local custom-exercise storage is `exercises` with
`is_custom=1` (Section 6).

### 4.4 Cloud schema

- `public.exercises` — legacy, mixed-ownership historically (library rows
  `user_id NULL`, pre-2020-migration customs `user_id` set). No migration
  in `supabase/` adds the 8 derived-metadata columns to it. Canonical
  catalogue rows are NOT pushed here by app code (seeded locally only, per
  `src/lib/seedExercises.js` design and corroborated by
  `insertOrUpdateExerciseFromCloud`'s own comment, database.js:9133-9148).
- `public.custom_exercises` — created by `supabase/migrate_020_custom_exercises.sql`
  (:26-47): `id, user_id, name, primary_muscle, secondary_muscles,
  equipment, movement_pattern, compound_isolation, default_rep_min,
  default_rep_max, fatigue_cost, stimulus_to_fatigue_ratio, subregion,
  exercise_category, increment_kg, notes, created_at, updated_at,
  deleted_at` (composite PK `user_id,id`, RLS on `auth.uid() = user_id`).
  `exercise_type` added by `supabase/migrate_091_exercise_type.sql`
  (:51-88, CHECK vocabulary `weight_reps, reps_only, duration, distance,
  weighted_bodyweight`). `load_semantics` added by
  `supabase/migrate_143_load_semantics.sql` (:62-84, CHECK vocabulary
  `total, per_hand, assisted, added_bodyweight`), mirrored on `public.exercises`
  too (same file). **Also structurally lacks all 8 derived-metadata
  columns** — confirmed by the same migration list and independently by
  `src/lib/__tests__/insertOrUpdateExerciseFromCloud.test.js:1-20`'s header.
- Adjacent (not this domain's schema, but the target this campaign
  extends — flagged for cross-reference, full analysis left to Audit C):
  `exercise_intent` and its columns/migrations
  `supabase/migrate_136_exercise_intent.sql`,
  `migrate_137_exercise_swap_scope.sql`,
  `migrate_139_routine_exercises_selection_reason.sql`,
  `migrate_142_exercise_intent_expiry.sql`. Not opened in full for this
  report; `src/lib/exercise/intent.js` and `movementConstraints.js` (read
  above) are the READ/WRITE surface this domain's readers (Section 5)
  compose with.

OBSERVED discrepancy (documentation, not schema): `supabase/migrate_143_load_semantics.sql:37-42`
states "Applied remotely: YES — 2026-08-18 ... Verified after the apply:
load_semantics present ... on BOTH tables." `src/lib/database.js:2612`
(the local mirror migration's comment) states "Cloud counterpart:
supabase/migrate_143_load_semantics.sql (NOT applied; founder-gated)."
Both are comments, not live schema queries (this audit has no Supabase
access); the two statements contradict each other and neither was
re-verified against the live database by this audit — flagged, not
resolved, in Section 14.

Also OBSERVED: `ls supabase/migrate_*.sql | wc -l` → **141** files on disk,
highest `migrate_144_apple_review_password_reset.sql`; CLAUDE.md's own
STATUS block (top of file) states "133 files, highest migrate_136" and the
campaign log (`_CAMPAIGN-LOG.md`) already flags this as stale. Noted for
completeness, not re-litigated here.

### 4.5 Field-by-field coverage table (built-ins, n=552) — THE CORE DELIVERABLE

Computed by executing `deriveLoadSemantics`/`deriveExerciseMetadata` over
every real `RAW` row (method in Section 1). "Populated" = non-null/non-empty
(arrays: length > 0).

| Field | Source | Populated | % | Distinct values | Value counts |
|---|---|---|---|---|---|
| `name` | raw | 552/552 | 100% | 552 (0 dupes) | — |
| `primaryMuscle` | raw | 552/552 | 100% | 17 | back65 quads57 chest56 abs62 hamstrings38 glutes37 triceps41 biceps36 rear_delts24 front_delts23 calves21 forearms22 traps19 side_delts17 neck14 adductors11 tibialis9 |
| `secondaryMuscles` | raw | 318/552 | 57.6% | 14 (used-as-secondary vocab) | glutes104 biceps55 triceps53 back50 front_delts41 hamstrings41 traps25 quads28 side_delts18 chest13 forearms13 rear_delts12 calves8 abs7. Never used as secondary: `adductors, neck, tibialis` |
| `equipment` | raw | 552/552 | 100% | 8 | bodyweight128 barbell113 dumbbell103 cable97 machine90 smith_machine10 kettlebell6 ez_bar5 |
| `movementPattern` | raw | 552/552 | 100% | 10 | isolation285 push68 pull67 squat59 hinge58 carry8 plyometric4 core1 lunge1 power1 — three values (`core`,`lunge`,`power`) are true singletons (exactly 1 exercise each) |
| `compoundIsolation` | raw | 552/552 | 100% | 2 | isolation304 compound248 |
| `defaultRepMin` | raw | 552/552 | 100% | range 3-60 | most common: 8 (121), 10 (141) |
| `defaultRepMax` | raw | 552/552 | 100% | range 5-120 | most common: 15 (185), 20 (142) |
| `fatigueCost` | raw | 552/552 | 100% | **1-5**, not 1-10 as the file's own header comment claims (seedExercises.js:583-585 says "1-10") | 2:261 3:151 1:75 4:52 5:13 |
| `stimulusToFatigueRatio` | raw | 552/552 | 100% | **3-5 only**, not 1-10 as the same header comment claims | 4:318 5:135 3:99 |
| `subregion` | raw (`SUBREGION_MAP`, name-keyed) | 401/552 | 72.6% | 29 tags | see per-muscle breakdown below |
| `exerciseType` | raw (`EXERCISE_TYPE_MAP`, name-keyed) | 552/552 | 100% | 3 of 5 CHECK-vocab values used | weight_reps527 duration15 weighted_bodyweight10. `reps_only` and `distance` are in the CHECK constraint and the custom-creation picker's option list but **used by zero built-in exercises** |
| `loadSemantics` (C32) | derived (`deriveLoadSemantics`) | 552/552 | 100% | all 4 vocab values | total467 per_hand73 added_bodyweight10 assisted2 |
| `equipmentCategory` | derived | 552/552 | 100% | 11 | bodyweight107 barbell105 cable97 dumbbell103 machine_selectorised66 band21 machine_plate_loaded16 landmine13 smith10 other8 kettlebell6 |
| `machineType` | derived (name-keyed lookup, 43 curated entries) | 38/552 overall; **38/82 (46.3%) within machine_selectorised+machine_plate_loaded rows** | 6.9% overall | 27 distinct tokens actually hit | leg_press×4, reverse_pec_deck×3, chest_press×2, seated_row×2, calf_raise_seated×2, calf_raise_standing×2, lying_leg_curl×2, neck_machine×2, + 19 singletons |
| `force` | derived | 552/552 | 100% | 3 | push266 pull218 static68 |
| `laterality` | derived (name regex) | 552/552 | 100% | 2 | bilateral495 unilateral57 |
| `difficulty` | derived | 552/552 | 100% | 3 | 2:266 1:261 3:25 |
| `machineOk` | derived (boolean) | 552/552 | 100% | 2 | true260 false292 |
| `homeOk` | derived (boolean) | 552/552 | 100% | 2 | true234 false318 |
| `equipmentProfiles` | derived (array) | 549/552 | 99.5% | 6 vocab values | full_gym495 machines_cables260 barbell_plates191 dumbbells_only182 home_gym182 bodyweight125. 3 rows resolve to `[]` (weighted-bodyweight compounds, deliberately excluded from every generated-plan profile — `exerciseMetadata.js:80-89`) |
| `cue` | schema column, never written | **0/552** | **0%** | — | column exists (database.js:1342/1422), read at `ExerciseDetailScreen.js:506`, no writer anywhere (`rowToExercise` never sets it, `deriveExerciseMetadata` never returns it) |
| `notes` | schema column, never written | **0/552** | **0%** | — | column exists, read via a `difficulty:(beginner\|intermediate\|advanced)` regex convention at `exerciseDisplay.js:113-114`, but **no writer for that convention exists anywhere** (grep across screens/components/lib: zero matches) — dead reader |
| `exerciseCategory` | schema column, constant | 552/552 populated, **0% discriminating** | 100%/0% | 1 | always `'compound'` — the SQL/JS default (`database.js:3002` `data.exerciseCategory ?? 'compound'`); `rowToExercise` never sets it, no migration ever varies it (confirmed: `grep -n increment_kg src/lib/database.js` shows no `UPDATE ... SET`) |
| `incrementKg` | schema column, constant | 552/552 populated, 0% discriminating | 100%/0% | 1 | always `2.5` (same default mechanism) |

**`subregion` coverage per primary muscle** (computed):

| Muscle | Tagged/Total | % | Subregion values present |
|---|---|---|---|
| back | 65/65 | 100% | upper_mid_row20, horizontal_lat16, vertical_pull16, spinal_erector9, shoulder_extension3, face_pull1 |
| glutes | 37/37 | 100% | activator18, stretcher10, pumper9 |
| rear_delts | 24/24 | 100% | horiz_abduction20, face_pull4 |
| biceps | 36/36 | 100% | short_head20, long_head9, brachialis7 |
| quads | 50/57 | 88% | squat_press43, knee_extension7 |
| triceps | 36/41 | 88% | pushdown22, overhead14 |
| calves | 18/21 | 86% | gastro13, soleus5 |
| chest | 46/56 | 82% | flat27, incline12, decline7 |
| hamstrings | 27/38 | 71% | hip_extension16, knee_flexion11 |
| abs | 39/62 | 63% | flexion13, anti_extension13, rotation13 |
| side_delts | 10/17 | 59% | lateral_raise10 |
| front_delts | 13/23 | 57% | overhead_press13 (all 13 are press variants; every front-raise variant is untagged — Section 4.6) |
| **forearms** | 0/22 | **0%** | none — no subregion vocabulary defined for this muscle at all |
| **neck** | 0/14 | **0%** | none |
| **tibialis** | 0/9 | **0%** | none |
| **traps** | 0/19 | **0%** | none |
| adductors | 0/11 | **0%** | none |

### 4.6 Concrete same-family tagging inconsistencies (exercise identity =
`canonicalExerciseId(name)`, deterministic — cited by name, the practical
stable identifier)

1. **Front-delt raises vs presses**: every front_delts *press* variant is
   subregion-tagged `overhead_press` (13/13), but **every** front_delts
   *raise* variant is untagged (`subregion=null`): `Dumbbell Front Raise`,
   `Cable Front Raise`, `Barbell Front Raise`, `Plate Front Raise`,
   `Landmine Front Raise` (verified: `rows.filter(r => r.primaryMuscle ===
   'front_delts' && !r.subregion)`). One movement-type of the muscle is
   100% tagged, the sibling movement-type is 0% tagged.
2. **Chest**: `Dumbbell Pullover` and `Dumbbell Pullover (Chest)` — two
   near-duplicate names for the same movement — are BOTH untagged, as is
   `Cable Fly (High to Low)` while its mirror `Cable Fly (Low to High)` is
   tagged `incline` and `Cable Fly (Neutral)`/`Cable Fly (Chest Height)` are
   tagged `flat`. `Hammer Strength Chest Press` is untagged while its
   equivalent `Machine Chest Press` is tagged `flat`.
3. **`Calf Raise on Leg Press Sled` vs `Leg Press Calf Raise`** — same
   muscle (calves), same raw `equipment: 'machine'`
   (`seedExercises.js:867,875`), same subregion (`gastro`), same
   movement/rep/fatigue/SFR tuple — but different derived
   `equipmentCategory`: `Leg Press Calf Raise` → `machine_selectorised`
   (correct, gets `machineType: 'calf_raise_standing'`); `Calf Raise on Leg
   Press Sled` → **`other`** (loses machine classification, `machineOk`,
   `machineType`, and `machines_cables` from `equipmentProfiles`). Root
   cause, verified: `CONDITIONING_RE` (`exerciseMetadata.js:38`,
   `/sled|prowler|battle rope|...`) exists to catch strongman conditioning
   work like "Sled Push", but matches the substring **"Sled"** inside "Leg
   Press **Sled**" (the machine's carriage), a name-collision false
   positive in `deriveEquipmentCategory` (:53-56).
4. **`laterality` vs `load_semantics`' own SINGLE_IMPLEMENT_TOTAL
   exception list disagree** on 12 exercises the load-semantics list
   explicitly documents as "one implement worked one side at a time" (i.e.
   unilateral in effect) but whose name contains no keyword `deriveLaterality`'s
   `UNILATERAL_RE` recognises, so `laterality` reads `bilateral` for all of
   them: `Dumbbell Row`, `Kroc Row`, `Dumbbell Side Bend`, `Suitcase Carry`,
   `Half-Kneeling Shoulder Press`, `Egyptian Lateral Raise`, `Leaning
   Lateral Raise`, `Kettlebell Snatch`, `Kettlebell Clean and Press`,
   `Turkish Get-Up`, `Windmill`, `Dumbbell Pronation/Supination` (computed
   by cross-referencing `SINGLE_IMPLEMENT_TOTAL`, `seedExercises.js:1352-1372`,
   against `deriveLaterality`, `exerciseMetadata.js:154-158`). These are two
   independently-built, name-based classifiers for overlapping but
   different concerns (what the entered number means vs how many limbs
   move independently) that were never reconciled against each other.
5. **`machineType` curation lags the library**: 44/82 machine-category rows
   have no `machineType` even though `MACHINE_TYPE_BY_NAME` is meant to
   cover "resistance machines" generally — includes `Hyperextension (Back
   Extension)`, `Reverse Hyperextension`, `GHD Sit-Up`, `Hip Adduction
   Machine`, `Plate-Loaded Incline Press`, `Plate-Loaded Chest Press`, all
   `Neck Harness`/`Neck Flexion (Machine)`-adjacent rows bar two. The
   library-expansion comment in `seedExercises.js:16-18` (~100 rows added
   2026-07-09) postdates the last visible curation pass over
   `MACHINE_TYPE_BY_NAME`.

---

## 5. READERS

Grep-verified field-by-field. "Reads" means the field is an input to a
filter/score/sort decision, not merely displayed.

| Field | Reader | file:line |
|---|---|---|
| `primaryMuscle` | `scoreCandidate` same-muscle term (+40) | `swapEngine.js:45` |
| `subregion` | `scoreCandidate` same-subregion term (+25, gated on same muscle) | `swapEngine.js:51-56` |
| `movementPattern` | `scoreCandidate` same-pattern term (+20) | `swapEngine.js:60-62` |
| `equipment` (raw string) | `scoreCandidate` same-equipment term (+15) | `swapEngine.js:64-66`, also `buildSwapReason` :112 |
| `compoundIsolation` | `scoreCandidate` (+10) | `swapEngine.js:68-70` |
| `fatigueCost` | `scoreCandidate`, ±1 similarity (+10) | `swapEngine.js:72-78` |
| `stimulusToFatigueRatio` | `scoreCandidate`, ±1 similarity (+10), explicit `!= null` guard so an unknown SFR skips rather than scores as 0 | `swapEngine.js:80-90` |
| `equipmentProfiles` | `rankSwaps` hard equipment filter (via `parseProfiles`) | `swapEngine.js:232-240`, parser at `poolGenerator.js:104-111` |
| `equipment` (array form) | `rankSwaps` legacy chip-array filter | `swapEngine.js:234` |
| `equipmentProfiles`/`eq` | `filterPool` hard equipment filter | `planEngine.js:1332` (`pool.filter(e => e.eq.includes(equipment))`) |
| exercise `name` | `isAutoEligible` (NEVER_AUTO hard filter), `tierRank`/`AUTO_TIER` (staple/common/specialist/niche preference gate), `ASSISTED_RE` regression filter | `planEngine.js:1431`, `:1467`, `:1492` (all name-string matches from `exercise/canonicality.js`) |
| `difficulty` | beginner gate (never-starve) | `planEngine.js:1478-1483` |
| `subregion` (translated) | `SUBREGION_REQUIREMENTS` coverage requirement | `planEngine.js:1499-1509`, translation at `poolGenerator.js:83-98` |
| `secondaryMuscles` | indirect-volume fractional-set modelling | `planEngine.js:133` (`toPoolEntry`), consumed further in plan volume accounting (not traced beyond the pool entry for this report) |
| `name`+`primaryMuscle`+`subregion` | `movementFamilyOf` → C31 pattern-avoidance eligibility | `exercise/intent.js:242-247`, `movementFamily.js:246-266` |
| `equipmentCategory`, raw `equipment` | Library filter chips (`matchesEquipmentFilter`), category-first with raw-string fallback | `exerciseDisplay.js:42-71` |
| `primaryMuscle` | Library muscle filter chip (case-insensitive exact match) | `exerciseDisplay.js:81-86` |
| `difficulty`, `notes` (dead convention) | `difficultyDisplayLabel` | `exerciseDisplay.js:109-119` |
| `equipmentCategory` | `machineOk`/`homeOk` derivation itself | `exerciseMetadata.js:214-220` |
| `movementPattern`, name (`NON_HYPERTROPHY_NAMES`) | `isHypertrophyExercise` pool-generation exclusion | `poolGenerator.js:143-152` |
| `equipmentCategory` | `generatePoolFromLibrary` requires a non-null, non-`'other'` category | `poolGenerator.js:164` |
| `isCustom`/`is_custom` | Hard exclusion from the generated-plan pool (doubled up with the `equipmentCategory` check above, since customs never get one) | `poolGenerator.js:163` |

No stored substitution/alternatives/compatibility table exists anywhere in
`src/`, `supabase/`, or the local schema — REPORTED, corroborating this
audit's own reading:
`docs/exercise-intelligence-2026-08-12/EXERCISE-SELECTION-ARCHITECTURE.md:41-43`
("`src/lib/swapEngine.js` is the only ranking engine in the app. There is no
substitution table, no alternatives table and no compatibility matrix
anywhere..."), independently confirmed by this audit's reading of
`swapEngine.js` (similarity is computed ad hoc from the fields above on
every call, never read from a stored table) and `movementFamily.js` (name
lists are curated code, not a database table).

---

## 6. WRITERS

**Canonical exercises** — one writer path, local only:
`seedExercisesIfNeeded`/`topUpNewExercisesIfNeeded` →
`insertExerciseWithId` (`database.js:2972-3021`, full 29-column INSERT).
Retroactive corrections to already-seeded rows use TWO further mechanisms
(Section 9): name-scoped one-off `UPDATE exercises SET <col> = <value>
WHERE name IN (...)` migrations in the local `SCHEMA_MIGRATIONS` array
(e.g. `database.js:481-496` delt-muscle split, `:1921-1945` biceps
subregion, `:2307-2390` back/quad `movementFamily` fix), and generic
`AsyncStorage`-version-gated backfill/rederive passes
(`backfillExerciseMetadataIfNeeded`, `rederiveExerciseMetadataIfNeeded`,
`migrateLoadSemanticsBackfill`) that call the same pure `deriveX` functions
over every row still needing it. **All canonical writes are local-only** —
none of this touches Supabase.

**Custom exercises** — TWO independent creation paths:

1. **`ExercisePickerModal.handleCreate`** (`src/components/ExercisePickerModal.js:232-286`),
   the shared modal used from the workout builder, plan builder, routine
   editor, and in-workout swap fall-through. Collects: `name` (required),
   `primaryMuscle` (chip, optional), `secondaryMuscles` (multi-chip,
   optional), `equipment` (chip, optional), `exerciseType` (chip, defaults
   `weight_reps`), `loadSemantics` (chip, only shown for
   weight_reps/weighted_bodyweight types, else forced `'total'`).
   Explicitly leaves `stimulusToFatigueRatio: null` with an inline
   rationale comment (:256-260, "never a guessed midpoint"). Does **not**
   ask for: `movementPattern`, `compoundIsolation`, `subregion`,
   `fatigueCost`, `defaultRepMin/Max`, `difficulty`, `laterality`, `force`,
   `equipmentCategory`, `machineType`, `equipmentProfiles`, `cue`, `notes`.
   These all resolve to `insertExerciseWithId`'s defaults: `null` / `false`
   / `'compound'` (`exerciseCategory`) / `2.5` (`incrementKg`).
2. **`importExternal.createCustomExerciseRow`** (`src/lib/importExternal.js:477-488`),
   triggered from `src/screens/ImportScreen.js` when a bulk workout-history
   import contains an exercise name that fails a fuzzy `bestMatch` against
   the existing library (similarity threshold 0.7, :461-473). Writes a
   near-empty row directly via SQL: `name` only; `primary_muscle,
   secondary_muscles, equipment, movement_pattern` all explicit `NULL`;
   `exercise_category` hard-coded `'compound'`; `increment_kg` hard-coded
   `2.5`. Even sparser than path 1. Uses a **different** ID generator:
   `uuid()` from `src/lib/uuid.js` (`generateUUID()`, CSPRNG via
   `expo-crypto`, Math.random fallback — header at `uuid.js:1-15` describes
   it as the post-A2-036 consolidated generator), whereas path 1 goes
   through `insertExercise()` → `uid()` (`database.js:58-67`,
   Math.random-based). Both produce v4-shaped UUID strings; this is two
   live implementations for the same conceptual ID, not one.

**Value-domain mismatch, custom vs canonical, `equipment` field**: the
picker's `PICKER_EQUIPMENT` chip set (`ExercisePickerModal.js:40`) is
`['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine',
'Bands']` — capitalised, spaced, human-readable — and the selected label is
written **verbatim** into the `equipment` column
(`setCreateEquipment(prev => prev === eq ? '' : eq)`, :400; `equipment:
createEquipment || null`, :246). Canonical rows store lowercase snake_case
(`barbell`, `dumbbell`, `smith_machine`, …; verified value domain in
Section 4.5). Consequence: `swapEngine.js:64` and `:112`
(`candidate.equipment === original.equipment`, case-sensitive exact match)
will not match a custom exercise's `'Dumbbell'` against a canonical
exercise's `'dumbbell'`, silently costing the 15-point same-equipment swap
term whenever a custom exercise is either side of a comparison. Browse
filtering is NOT affected the same way: `matchesEquipmentFilter`
(`exerciseDisplay.js:42-71`) lower-cases and substring-matches, so it
tolerates the casing/spacing difference.

By contrast, `PICKER_MUSCLES = Object.keys(MUSCLE_DISPLAY_NAMES)`
(`ExercisePickerModal.js:39`, sourced from `algorithms.js:61-79`) uses the
exact same lowercase snake_case 17-value vocabulary as canonical
`primaryMuscle` — **no mismatch on this field**, noted for balance.

**Custom exercise deletion**: `deleteExercise(id)` — `DELETE FROM exercises
WHERE id = ? AND is_custom = 1` (`database.js:3023-3028`, guarded so a
canonical row can never be deleted this way). Sign-out/local-wipe path
clears all customs: `DELETE FROM exercises WHERE is_custom = 1`
(`database.js:6273`).

---

## 7. CURRENT INVARIANTS

- Every canonical exercise gets a **deterministic** ID:
  `canonicalExerciseId(name)` — lowercase+trim the name, four-lane
  MurmurHash-style mixer, formatted as a UUIDv4-shaped string
  (`exercise/canonicalId.js:48-83`). Same name ⇒ same ID on every device
  and every fresh install. A rename mints a new ID (REPORTED, matches the
  architecture doc's framing, `EXERCISE-SELECTION-ARCHITECTURE.md:81-83`).
- Custom exercises get a random ID from one of two generators (Section 6);
  never the deterministic hash.
- `INSERT OR IGNORE` on canonical seeding (`database.js:2976`) — re-running
  the seed against an existing row is a no-op, not an overwrite.
- The generated-plan pool (`generatePoolFromLibrary`,
  `poolGenerator.js:159-172`) **categorically excludes** every custom
  exercise (`isCustom` check, :163) and every canonical exercise with no
  `equipmentCategory` or `equipmentCategory === 'other'` (:164) — customs
  are excluded twice over, since the first condition alone would suffice.
- `backfillExerciseMetadataIfNeeded`/`rederiveExerciseMetadataIfNeeded`/
  `migrateLoadSemanticsBackfill` all explicitly skip `is_custom` rows
  (`seedExercises.js:1502,1562`; `database.js` backfill body reads
  `WHERE is_custom = 0`, :2637) — derived metadata is a canonical-only
  concept by construction, not an oversight in one place.
- An absent/unknown `equipmentProfiles` on a candidate is **never** treated
  as "hide this exercise" in the swap engine — `rankSwaps` explicitly
  passes an untagged (custom) exercise through its equipment filter
  (`swapEngine.js:236-238`, "Never hide someone's own exercise on an
  absence of data").
- `deriveForce`'s `default` branch checks `STATIC_PATTERNS.has(movementPattern)`
  (`exerciseMetadata.js:130,147`) for `'carry'`/`'core'`, but both values
  are already handled by an explicit `case` earlier in the same `switch`
  (:140-142) — the `STATIC_PATTERNS` check in the `default` branch is
  unreachable for its own named values (minor, does not affect any actual
  output; `plyometric`/`power`/`lunge` fall through the same `default` to
  `'push'`).
- `notes` and `cue` are schema-present, reader-present, writer-absent for
  every exercise in the app today (Section 4.5) — invariant is "always
  null," not enforced by any constraint, simply true by construction of
  every current writer.

---

## 8. CURRENT TESTS

Exercise-library-relevant test files (headers read in full; bodies spot-checked):

- `src/lib/__tests__/exerciseMetadata.test.js` — direct unit tests of every
  `deriveX` function in `exerciseMetadata.js`.
- `src/lib/__tests__/exerciseDisplay.test.js` — `matchesEquipmentFilter`/
  `matchesMuscleFilter`/label helpers; explicitly pins the band
  reclassification behaviour (`equipment='bodyweight'`,
  `equipmentCategory='band'` must still match the "Bands" chip).
- `src/lib/__tests__/exerciseBackfill.test.js` — pins
  `backfillExerciseMetadataIfNeeded` idempotency and its custom/already-populated
  skip conditions (mocked AsyncStorage + database).
- `src/lib/__tests__/exerciseCache.test.js` — pins `getAllExercises()`'s
  in-memory cache + invalidation-on-write contract. Header comment says
  "the ~400-row exercise library" — stale relative to the verified 552
  (library grew under later campaigns; comment not updated).
- `src/lib/__tests__/exerciseFuzzySearch.test.js` — pins `tokenize`/
  `fuzzyScore`/`fuzzySearch` typo-tolerance behaviour.
- `src/lib/__tests__/insertOrUpdateExerciseFromCloud.test.js` — "column
  preservation guard": pins that `exercise_type` round-trips through cloud
  restore, and explicitly documents (header, :1-20) that the 8
  derived-metadata columns are deliberately excluded from the cloud
  round-trip.
- `src/lib/__tests__/customExercisePush.test.js` — pins that `syncExercises`
  sends `exercise_type` on push, defaulting to `weight_reps` when absent
  locally.
- `src/lib/__tests__/customExerciseSync.contract.test.js` — a source-grep
  guard (reads `sync.js` as text) locking `_pullCustomExercises` onto
  writing into local `exercises` (`is_custom=1`), not the orphaned local
  `custom_exercises` mirror.
- `src/lib/__tests__/database.recentlyUsedExerciseIds.test.js` — pins the
  "Recent" row query behind the picker (distinct exercise, most-recent
  completed workout, warm-ups excluded, default limit 8).
- `src/lib/__tests__/campaign9.exerciseIntentSync.test.js`,
  `src/lib/exercise/__tests__/campaign9.*.test.js` (`closeout`,
  `generation`, `intent`, `progression`) — C31 intent-layer tests; touch
  `movementFamilyOf`/pattern-avoidance but are primarily Audit C's domain.
- `src/components/__tests__/ExercisePickerModal.a11y.test.js`,
  `ExercisePickerModal.firstOpenGate.test.js` — UI-behaviour guards on the
  shared picker, not metadata-content tests.
- `src/screens/__tests__/ExerciseDetailScreen.loadState.test.js`,
  `ExerciseDetailScreen.logic.test.js` — detail-screen display logic.
- `src/lib/__tests__/planExercisePlacement.audit.test.js`,
  `routineExerciseSoftDelete.guard.test.js`,
  `bulkUpload.routineExercisesOrphanFilter.test.js` — adjacent
  routine/placement guards that reference exercise identity but are not
  metadata-coverage tests.

No test file was found that asserts field-coverage percentages, cross-field
consistency (e.g. laterality vs load-semantics agreement), or a canonical
"every built-in exercise has X, Y, Z populated" contract — the coverage
gaps and inconsistencies in Section 4.5-4.6 are not guarded by any test
today (absence checked via `grep -rl "subregion" src/lib/__tests__ src/lib/exercise/__tests__`
and manual inspection of the matches; none assert coverage thresholds).

---

## 9. REUSABLE INFRASTRUCTURE

Three co-existing, independently-invented idioms for getting metadata onto
already-seeded rows, all found in `src/lib/database.js`'s local migration
array and `seedExercises.js`:

1. **Name-scoped one-off SQL migration** — `UPDATE exercises SET <col> =
   <value> WHERE name IN (...)` (or `WHERE name LIKE '%...%'`), added as a
   new entry in the local `SCHEMA_MIGRATIONS` array so it runs exactly once
   per device via `PRAGMA user_version`. Examples: delt-muscle split
   (`database.js:478-497`, `LIKE` pattern matching), biceps subregion fix
   (`:1900-1945`, exact `name IN (...)` lists, 36 names across 3 UPDATEs),
   back/quad `movementFamily` fix (`:2307-2390`, `subregion` rewritten by
   name/pattern to match `movementFamily.js`'s curated families). Each
   carries a header comment stating purpose, local-only scope (no cloud
   counterpart — canonical exercises aren't synced), idempotency
   (re-setting an already-correct value is a no-op), and an explicit
   rollback note.
2. **Generic version-gated backfill/rederive pass** — an `AsyncStorage` key
   guards a one-time (or one-time-per-rule-change) full-table pass calling
   the live pure `deriveX` function(s) over every canonical row.
   `backfillExerciseMetadataIfNeeded` (`seedExercises.js:1494-1513`) fills
   only NULL `equipmentCategory` rows (post-column-add backfill).
   `rederiveExerciseMetadataIfNeeded` (:1554-1572) recomputes on EVERY
   canonical row regardless of current value, for when the derivation
   RULES change (not just new columns) — version key bumped
   `v1`→`v2` when "equipment profiles now keep bodyweight compounds and
   bands out of loaded plans" (comment, :9-12).
3. **The C32 template**: `migrateLoadSemanticsBackfill`
   (`database.js:2629-2649`) — adds the column
   (`ALTER TABLE ... ADD COLUMN load_semantics TEXT`), lazy-`require`s
   `deriveLoadSemantics` from `seedExercises.js` (avoiding an import cycle;
   both modules are fully loaded by migration time), runs it over every
   `is_custom = 0` row read fresh via `SELECT id, name, equipment,
   exercise_type ... WHERE is_custom = 0`, writes only the non-`'total'`
   results (`UPDATE ... WHERE id = ?` per row), then a single trailing
   `UPDATE ... SET load_semantics = 'total' WHERE load_semantics IS NULL`
   catches everything else. Best-effort: wrapped in `try/catch`, a failure
   leaves rows NULL, which every reader already treats as `'total'`
   (documented explicitly, :2620-2628). The **exception list** pattern
   (`SINGLE_IMPLEMENT_TOTAL`, a hand-maintained `Set` of 36 names,
   `seedExercises.js:1352-1372`, plus `ASSISTED_NAMES`, 2 names, :1376) is
   the reviewable-judgement-record idiom: the derivation function is a
   short, generic rule (dumbbell/kettlebell ⇒ `per_hand` unless listed),
   and every exception to that rule is named in one place with an inline
   reason, rather than encoded as more regex.
4. **`parseProfiles`** (`poolGenerator.js:104-111`) — the single shared
   JSON-string-or-array normaliser for `equipmentProfiles`, imported by
   both `swapEngine.js:12` and consumed identically by `planEngine.js:2998`'s
   own inline `Array.isArray(...)` check. This is the one place a
   stringified-JSON column reliably becomes a real array across all
   consumers; `rowToCamel` (`database.js:85-97`) does NOT parse it
   generically (it only special-cases `secondary_muscles`), so any NEW
   consumer reading `equipmentProfiles` off a raw `getAllExercises()` row
   without going through `parseProfiles` would receive a JSON string, not
   an array.
5. **`movementFamily.js`** (Section 3) is itself reusable normalisation
   infrastructure: a name-keyed override registry with a documented "trust
   an already-valid stored tag, else recompute" rule
   (`movementFamily()`, :246-266), built specifically to reconcile two
   taxonomies that disagreed (`seedExercises.js`'s `SUBREGION_MAP` vs
   `planEngine`'s historical hand-written POOL). It also carries a
   ready-made calm-copy label map (`FAMILY_LABELS`) for surfacing any
   family/subregion key in plain English to a user — already used by the
   C31 pattern-avoidance UI (comment at `movementFamily.js:274-282`
   explicitly names this as "D107-2 injury/constraint layer").

---

## 10. CONFLICTS WITH NEW SYSTEM

(Evidence only — no framing of "which is right".)

- **Derived metadata is canonical-only by construction, at three
  independent enforcement points** (Section 6/7): the custom-creation form
  never asks for it, the backfill/rederive passes explicitly skip
  `is_custom` rows, and the local/cloud `custom_exercises` schemas don't
  even have the columns. Any new capability/restriction model that wants to
  reason over `equipmentCategory`/`force`/`laterality`/`difficulty`/
  `equipmentProfiles` for a user's OWN exercise gets nothing for it today —
  not partial data, structurally absent data.
- **Three overlapping "what kind of movement is this" taxonomies** coexist
  and are not reconciled with each other: (a) `subregion`
  (`SUBREGION_MAP`, seed-time, 72.6% covered, 29 values), (b)
  `movementFamily()`'s corrected family vocabulary for `back`/`quads` only
  (name-keyed override, 8 values), (c) `poolGenerator`'s
  `SUBREGION_TRANSLATION` mapping table that translates (a) into yet a
  THIRD vocabulary planEngine's pool actually filters on
  (`poolGenerator.js:36-61`) — some values pass through unchanged, some are
  renamed (e.g. `abs.rotation` → pool `anti_rotation`), and 12 muscles have
  a `DEFAULT_SUBREGION` fallback for when (a) is null. A capability system
  gating by "movement family" would need to pick which of these three it
  binds to, since they don't always agree (that disagreement is the
  documented REASON (b) and (c) exist).
- **`laterality` is a single boolean with no limb-pair information** — it
  cannot by itself answer "does this need both hands" vs "does this need
  both legs"; that requires ALSO cross-referencing `primaryMuscle` against
  an external upper/lower-body grouping this audit had to construct itself
  for Section 13 (no such grouping exists as a field or constant anywhere
  in the codebase this audit found). And even that combination is unproven
  reliable — laterality itself is name-regex-derived and disagrees with the
  load-semantics exception list on 12 exercises (Section 4.6, item 4).
- **No position/setup/ROM/joint/support field exists at all** — confirmed
  by the full column enumeration in Section 4.2/4.4: nothing named
  `position`, `posture`, `stance`, `rom`, `joint`, `support`, `stability`,
  `grip`, or similar exists on either table. Whatever a capability system
  needs here (Section 13, Q3) must be net-new or derived from name text,
  which this audit found to be highly partial (Section 13).
- **`equipmentCategory`/`equipmentProfiles` encode "what apparatus" and
  "which training contexts can supply it," not "does this apparatus
  physically support/stabilise the athlete."** `cable` and
  `machine_selectorised` both count toward `machineOk`/the
  `machines_cables` profile, but a standing cable crossover offers no more
  physical support than a standing dumbbell press — the categories were
  built for plan-generation equipment-availability filtering, not balance/
  support reasoning.
- **The generated-plan pool structurally cannot contain a custom
  exercise** (Section 7), so any capability-aware generation path that is
  expected to select or substitute a user's own custom exercise cannot
  reuse `generatePoolFromLibrary` unmodified.
- **The C31 pattern-avoidance system (`exercise/intent.js`,
  `movementConstraints.js`) already operates at exactly the `movementFamily`/
  `subregion` granularity** (`familyTargetKey`, `intent.js:222-228`,
  target string is `family:<value>` where `<value>` is a `movementFamily()`
  or pass-through-`subregion` output) — it has no concept of a functional
  demand (standing, overhead, grip) independent of that taxonomy. A new
  functional-demand vocabulary (Section 13 H4 in the campaign's
  challenge-pass doc) would sit alongside, not inside, today's family/
  subregion targets, since today's targets are keyed to movement identity,
  not physical demand.

---

## 11. PROVENANCE RISKS

- **Sync push silently launders "explicitly unknown" into a guessed
  value.** `ExercisePickerModal.js:256-260` deliberately leaves
  `stimulusToFatigueRatio: null` on creation, with an explanatory comment
  that a guessed value would make the exercise "falsely read as a real,
  ranked candidate." `syncExercises` (`sync.js:252-253`) pushes
  `fatigue_cost: e.fatigueCost ?? 1` and `stimulus_to_fatigue_ratio:
  e.stimulusToFatigueRatio ?? 3` to the cloud `custom_exercises` row —
  overwriting the deliberate `null` with a guessed `1`/`3` on every push.
  `insertOrUpdateExerciseFromCloud` (`database.js:9198`) reads the cloud
  row back with the SAME `?? 1`/`?? 3` defaulting. Consequence: after one
  sign-out/sign-in cycle (or a pull on a second device), the local row
  carries `fatigueCost: 1, stimulusToFatigueRatio: 3` as if they were real
  data — and `swapEngine.js:72-90`'s similarity terms will then score
  against them as genuine values, exactly what the original `null` was
  written to prevent. The `null` survives only until the first
  push-then-pull round trip.
- **Two independent ID-generation implementations for the same "custom
  exercise" concept** (Section 6): `database.js:uid()` (Math.random) via
  the picker, `lib/uuid.js:generateUUID()` (expo-crypto CSPRNG) via CSV
  import. Both are v4-shaped and both work today; this is a provenance
  fact (two code paths can diverge independently in future), not a
  reported failure.
- **The equipment-string casing mismatch (Section 6) is a silent scoring
  degradation, not an error** — nothing throws, nothing logs, the swap
  engine simply under-scores a custom exercise's equipment match every
  time, with no signal anywhere that this happened.
- **`getExerciseRowsById` (`database.js:5186-5199`) queries a table
  (`custom_exercises`) that this audit verified is never written to**
  (Section 4.3) — any caller relying on this function to see a user's
  customs via that branch gets nothing from it silently; it degrades to
  exactly the `exercises`-table-only result with no error or log.
- **`FORM_TIPS` (`src/lib/formTips.js`) carries 3 orphaned entries**
  (`Abductor Machine`, `Sumo Deadlift (High Bar)`, `Plate-Loaded Seated
  Row`) that match no current `RAW` name (computed: 555 `FORM_TIPS` keys
  vs 552 `RAW` names, 0 missing from `RAW`'s side, 3 extra on `FORM_TIPS`'s
  side). `Abductor Machine` is the exact name `exercise/canonicalId.js:16-18`'s
  own header cites as the historical example of a plan-engine POOL entry
  with no matching library row — corroborating (not just asserting) that
  this is genuine historical drift, not a coincidence.
- **Migration-application status contradiction** already flagged in
  Section 4.4 (`migrate_143` header says applied remotely YES;
  `database.js:2612`'s comment says the cloud counterpart is NOT applied,
  founder-gated) — this audit did not query live Supabase to resolve it
  (out of scope; see Section 14).

---

## 12. SYNC/MIGRATION ISSUES

- **Push/pull asymmetry across three tables for one concept.** Canonical
  catalogue: local-seed-only, never pushed, legacy cloud `exercises` rows
  pulled but user-scoped only (`_pullExercises`, `sync.js:2331-2347`) so
  library rows (`user_id NULL`) are never touched by it. Custom exercises:
  pushed to cloud `custom_exercises` (`syncExercises`, `sync.js:226-280`),
  pulled from the SAME cloud table by a **separate** function
  (`_pullCustomExercises`, `sync.js:2570-2595`) that writes into the LOCAL
  `exercises` table (not the local `custom_exercises` mirror — deliberate,
  per its own comment and the contract test in Section 8). Both `_pullExercises`
  and `_pullCustomExercises` run in the same `pullFromCloud` cycle
  (confirmed call sites: `sync.js:2078` and `:2208`) — not dead code, two
  genuinely different historical eras of the same feature still both live.
- **Cross-device ID merge.** `insertOrUpdateExerciseFromCloud`
  (`database.js:9149-9180`) detects a same-name-different-ID local row on
  every cloud upsert and rewrites `routine_exercises`, `workout_sets`,
  `exercise_user_notes`, `exercise_goals`, and (via
  `remapExerciseIdInIntentTables`) the C31 intent tables, then deletes the
  stale local row. This is the mechanism that makes the deterministic
  canonical-ID scheme actually converge across devices that seeded at
  different library versions; REPORTED corroboration from
  `EXERCISE-SELECTION-ARCHITECTURE.md:85-93`, independently confirmed by
  reading the implementation.
- **Column asymmetry is permanent, not transitional**: the 8
  derived-metadata columns have never been added to either cloud table by
  any of the 141 migration files on disk (`grep`-verified: no migration
  file adds `equipment_category`/`machine_type`/`force`/`laterality`/
  `difficulty`/`machine_ok`/`home_ok`/`cue`/`equipment_profiles` to
  `custom_exercises` or cloud `exercises`), and `insertOrUpdateExerciseFromCloud`'s
  own comment (`database.js:9133-9148`) states this is deliberate, not an
  oversight: reading them off a cloud row "would only ever produce null."
- **`exercise_type`/`load_semantics` round-trip was a fixed bug, not
  always-true**: `insertOrUpdateExerciseFromCloud.test.js`'s header
  documents that `exercise_type` used to be silently dropped on cloud
  restore (INSERT OR REPLACE omitting a column resets it to the SQL
  default) until fixed; the fix (reading it back explicitly,
  `database.js:9203`) and the matching push-side fix
  (`customExercisePush.test.js`) are both now guarded by tests. This
  pattern — "a column silently reverts to its SQL default on cloud
  restore unless explicitly listed in BOTH the push row-builder and the
  restore INSERT's column list" — is a structural trap for any NEW
  column added to custom exercises in future (both sides must be updated
  by hand; nothing enforces the column lists stay in sync).

---

## 13. ANSWERS TO SPECIFIC QUESTIONS

**(1) Complete coverage table.** Section 4.5.

**(2) Which fields do selection/scoring/swap-ranking actually READ?**
Section 5 (full grep table). Summary: `swapEngine.scoreCandidate` reads
`primaryMuscle, subregion, movementPattern, equipment (raw), compoundIsolation,
fatigueCost, stimulusToFatigueRatio`. `rankSwaps` additionally hard-filters
on `equipmentProfiles`/`equipment` (array form). `planEngine.filterPool`/
`selectExercisesForMuscle` hard-filter on `equipmentProfiles` (as pool `eq`),
exercise `name` (three separate name-string classifiers: NEVER_AUTO,
tier/popularity, assisted-regression), and `difficulty`; soft-require
translated `subregion`. The C31 read layer (`exercise/intent.js`) reads
`primaryMuscle`+`subregion`+`name` only via `movementFamilyOf`.
`equipmentCategory`, `machineType`, `force`, `laterality`, `homeOk` are
**not** read by any selection/scoring/swap-ranking code this audit found —
`laterality`/`force`/`machineType` have no reader at all outside
`exerciseMetadata.js` itself and `poolGenerator.toPoolEntry`'s pass-through
(which carries `difficulty`/`sfr`/`fatigue`/`equipmentCategory`/`secondary`
into the pool entry shape but not `force`/`laterality`/`machineType`/`homeOk`
— verified against `toPoolEntry`, `poolGenerator.js:113-135`, which does not
reference those four).

**(3) Per functional axis: can today's metadata express or derive it?**

- **Requires standing.** No field. Name-parsing signal exists but is
  asymmetric and low-recall: 16/552 names literally contain "seated," 6/552
  "lying," 10/552 "standing," 14/552 "kneeling"/"half-kneeling" (all
  computed via regex over the 552 names). These are high-precision (a name
  that says "Seated X" almost certainly is) but very low-recall — the vast
  majority of inherently standing exercises (`Barbell Back Squat`,
  `Conventional Deadlift`, most `push`/`pull` compounds) carry no positional
  word at all. **Not reliably derivable today**; only a small, explicitly-
  worded minority is name-detectable, and absence of a keyword is not
  evidence of standing (many seated machine exercises — `Leg Press`, `Leg
  Extension`, `Pec Deck (Machine Fly)` — carry no "seated" keyword either).
- **Requires floor access (lying/kneeling).** Same mechanism, same
  weakness: "lying" 6/552, "kneeling" 14/552, "floor" 3/552 (`Floor Press
  (Dumbbell)`, `Close-Grip Floor Press`, `Deficit Push-Up` does NOT match
  despite being floor-based — false negative confirmed by inspection).
  Genuinely floor-based bodyweight moves with no positional word in the
  name (`Push-Up`, `Plank`, `Sit-Up`, `Dead Bug`, `Hollow Body Hold`) are
  entirely undetected by this method. **Partial, low-recall, name-parsing
  only.**
- **Requires two-handed/conventional grip.** No direct field.
  `equipmentCategory`/`equipment` narrows candidates (a barbell/cable-bar
  exercise usually implies two hands on one implement) but does not
  distinguish reliably — `equipment='cable'` includes both two-handed
  presses/rows AND explicitly single-arm cable work (`Single-Arm Cable
  Row`, `Single-Arm Cable Rear Delt Fly`). `laterality='bilateral'` is the
  closer proxy (495/552) but conflates grip with the "both limbs of
  whichever pair this muscle uses" question below, and is itself
  name-regex-derived with documented gaps (Section 4.6, item 4). **Partial
  and indirect**: `equipmentCategory` + `laterality` together give a
  reasonable heuristic for upper-body exercises specifically, with known
  false negatives on the 12 exercises in Section 4.6.
- **Requires both lower limbs.** No direct field. Derivable only by
  combining `primaryMuscle` ∈ {quads, hamstrings, glutes, calves,
  adductors} with `laterality='bilateral'`. Computed cross-tab: of
  164 lower-body-primary-muscle exercises, 34 are tagged `unilateral`
  (name-regex), leaving 130 assumed bilateral by the absence of a
  matching keyword — the same low-recall risk as above applies to any
  lower-body exercise whose unilateral nature isn't named (this audit did
  not find a concrete miss on the lower-body side comparable to Section
  4.6 item 4, but the mechanism generating that risk is identical). **Derivable
  with a caveat**, not directly expressed.
- **Requires both upper limbs.** Same construction, `primaryMuscle` ∈
  {chest, back, front_delts, side_delts, rear_delts, biceps, triceps,
  forearms, traps}: 303 upper-body-primary rows, 20 tagged unilateral,
  283 assumed bilateral. Section 4.6 item 4's 12 exercises are concrete,
  confirmed misses inside this population (their `primaryMuscle` is
  chest/back/side_delts/traps and their real load-semantics-documented
  behaviour is one-side-at-a-time, but `laterality` says bilateral).
  **Derivable with a caveat, with confirmed false negatives.**
- **Balance demand / external support available (machine-supported vs
  free).** No field means this directly. `equipmentCategory ∈
  {machine_selectorised, machine_plate_loaded, smith}` is the closest
  proxy for "apparatus provides some external bracing," but `cable` and
  free-weight categories are lumped with genuinely balance-free work
  (standing cable crossover) despite `cable` counting toward the same
  `machines_cables` `equipmentProfiles` bucket as a seated chest-supported
  row. A few individual exercise NAMES self-report support explicitly —
  `matched 4/552 names containing "supported"` (`Machine Row (Chest
  Supported)`, `Chest-Supported Row (Dumbbell)`, `Chest-Supported Row
  (Barbell)`, `Chest-Supported T-Bar Row`) — but this is a tiny,
  incidental subset, not a systematic tag. **Not expressible**; the
  nearest proxy (`equipmentCategory`) measures apparatus TYPE, not
  stabilisation, and this audit found no case where the two reliably
  coincide across the whole library.
- **Overhead position required.** Partially expressible for exactly TWO
  muscle groups, because their `subregion` vocabulary happens to use the
  word: `front_delts.subregion === 'overhead_press'` (13/23 front_delts
  rows, all press variants — but see Section 4.6 item 1, the raise
  variants of the SAME muscle are untagged, not falsely negative-tagged,
  just silent) and `triceps.subregion === 'overhead'` (14/41). No other
  muscle's subregion vocabulary encodes overhead position (e.g. a
  hypothetical overhead squat or snatch, not in this library, would have
  no mechanism to flag it via subregion). Name-parsing "overhead" catches
  10/552 names, a subset of the subregion-tagged set plus a few more
  (`Overhead Dumbbell Extension`, `Overhead Cable Tricep Extension`, etc.).
  **Partial, muscle-group-scoped, coincidental** (the vocabulary word
  happening to be "overhead" is a naming convenience, not a designed
  cross-muscle position tag).
- **Axial/spinal loading.** No field, no reliable name signal, not even
  partially. Distinguishing `Barbell Back Squat`/`Conventional Deadlift`
  (axial) from `Leg Press`/`Hack Squat Machine` (not, or much less, axial)
  requires equipment+name judgement this audit found no existing
  derivation attempting. **Not expressible or derivable today.**
- **Seated-performable.** No field. "Seated" appears literally in 16/552
  names (all high-precision positives) but this drastically undercounts —
  inherently-seated machine exercises with no "seated" keyword
  (`Leg Press`, `Leg Extension`, `Pec Deck (Machine Fly)`, `Hack Squat
  Machine` on some machine designs) are invisible to this method. **Partial,
  asymmetric, precision-only-on-the-matched-subset** — the same shape of
  gap as "requires standing" and "requires floor access" above (this
  audit found no exercise-metadata field anywhere that expresses ANY
  body position systematically; every position signal available today is
  an unplanned side-effect of free-text naming).

**(4) Exact built-in count, custom-exercise handling, ID scheme, sync
path.** 552 (Section 4.1). Custom-exercise handling: two creation paths,
minimal-to-partial metadata, zero derived metadata, stored in `exercises`
with `is_custom=1` (Section 6). ID scheme: canonical = deterministic name
hash; custom = random UUID from one of two generators (Section 6/7). Sync
path: push via `syncExercises`→cloud `custom_exercises`; pull via
`_pullCustomExercises`←cloud `custom_exercises`→local `exercises`
(is_custom=1), plus a legacy `_pullExercises`←cloud `exercises`
(user-scoped) path still live for pre-2020-migration rows (Section 12).

**(5) Normalisation/dedupe/backfill infrastructure; the C32 backfill as
template.** Section 9, full detail. Three idioms: name-scoped one-off SQL
migrations, generic version-gated backfill/rederive passes over
`deriveX()`, and the C32-specific pattern (shared pure derivation function
+ hand-curated exception-list `Set`, called identically from the seed and
from a lazy-required migration function, `database.js:2629-2649`).

---

## 14. UNKNOWN/UNVERIFIED

- **Live Supabase schema/data was not queried** (out of scope per this
  audit's read-only-local-files mandate). All cloud-schema claims in
  Section 4.4 are from migration FILES only, not a live `information_schema`
  check. The `migrate_143` applied-remotely contradiction (Section 4.4/11)
  is unresolved by this audit.
- **`toPoolEntry`'s downstream consumption of `secondary` (secondaryMuscles)
  for "indirect volume modelling"** (`planEngine.js:133` comment) was not
  traced further into the volume-accounting code — this audit confirms the
  field reaches the pool entry shape but did not verify how (or whether)
  every consumer of a pool entry actually uses `.secondary`.
  UNVERIFIED beyond the pool-entry boundary.
- **`tierRank`/`AUTO_TIER`/`isAutoEligible`** (`planEngine.js:1431,1467`,
  sourced from `exercise/canonicality.js` per its own header) — this audit
  read `canonicality.js`'s header/purpose only (Section 3), not its full
  name-tier list or scoring logic. The exact staple/common/specialist/niche
  tier boundaries and which of the 552 names fall into each are UNVERIFIED
  by this report.
- **`exercise/continuity.js`** (Campaign 16 job 5, "what a rebuild keeps")
  — header read only; not analysed for whether/how it reads exercise
  metadata fields, since its concern (plan-rebuild continuity) sits closer
  to Audit A/E's domain than the library-schema question this audit was
  scoped to.
- **`exercise/generation.js` and `exercise/volumeAudit.js`** — not opened
  at all in this audit; unknown whether either reads exercise-metadata
  fields not already covered in Section 5.
- **Whether any OTHER screen besides `ExerciseDetailScreen.js` reads
  `cue`** — this audit's grep found exactly one reader; a broader
  whole-repo semantic search (rather than literal-string grep) was not
  performed, so a dynamically-constructed field access (e.g.
  `exercise[someVar]`) reading `cue` indirectly cannot be fully ruled out,
  though none was found.
- **Whether `exercise_category`/`increment_kg` are read meaningfully
  anywhere this audit didn't check** beyond the confirmed
  `defaultIncrement()` fallback-argument usage in `ActiveWorkoutScreen.js`
  (Section 4.5) — a full trace of `defaultIncrement()`'s own logic (in
  `algorithms.js`, not opened by this audit) was not performed, so how much
  practical effect the constant `'compound'` value actually has downstream
  is UNVERIFIED.
- **Whether `schema.sql`/`setup_complete.sql`'s cloud `exercises`
  CREATE TABLE reflects anything currently live** — CLAUDE.md itself
  states these are "stale snapshots"; this audit did not cross-check them
  further and relied on the numbered migration files as canonical, per
  CLAUDE.md's own instruction.
- **Full behaviour of `remapExerciseIdInIntentTables`** — its existence and
  call site are confirmed (`database.js:9176`), and it's independently
  named in the architecture doc (`EXERCISE-SELECTION-ARCHITECTURE.md:88-93`),
  but its full body was not read in this audit (Audit C's domain).
