# Cardio integration audit - Phase 5: Cardio library proposal

Status: COMPLETE. Timestamp: 2026-06-03. Scope: cardio only.
Grounded in Phase 1 (internal) + Phases 2-4 (research). MET values are 2024
Compendium representative figures, verified per row at seed (QA step in §6).

---

## 1. Architecture decision: a separate `cardio_activities` table

**Recommendation: a separate canonical table, built with the same discipline as
the lifting library, not the same schema.**

The lifting `exercises` table (`database.js:66-83`) is built around
`primary_muscle`, `secondary_muscles`, `movement_pattern`,
`compound_isolation`, `default_rep_min/max`, `fatigue_cost`,
`stimulus_to_fatigue_ratio`, `subregion`. **None of those apply to cardio.**
Cardio is duration-based and MET-based; it has no sets, reps, muscle
allocation, or SFR. Reusing `exercises` with a type flag would:

- pollute the **plan generator pool** (`planEngine` filters `exercises` by
  `equipmentProfiles` and muscle; a cardio row has no muscle and would need
  special-casing everywhere),
- break the **volume allocator** (`allocateExerciseVolume` reads
  `primary_muscle` + `secondary_muscles`; cardio has neither),
- confuse the **swap engine**, **difficulty gating**, and **metadata deriver**
  (`exerciseMetadata.js` assumes resistance equipment; note it already shoves
  cardio implements into `other` precisely to keep them out, line 38),
- and force `is_custom`/sync paths to branch on type.

So: **do not reuse `exercises`.** Instead, **copy the lifting library's
discipline** onto a purpose-built table:
- a small **authored seed** (~35-40 rows), not hand-edited bloat,
- **deterministic canonical IDs** (`canonicalCardioId(name)`, same hash
  approach as `canonicalExerciseId`, `seedExercises.js:41-76`) so the same
  activity has the same id on every device and a `cardio_log` row round-trips,
- a **pure deriver** (`cardioMetadata.js`) shared by seed + backfill for the
  derived flags, exactly as `exerciseMetadata.js` is shared,
- **custom activities** in a per-user composite-PK table if ever needed, mirror
  of `custom_exercises`.

This is the "derive not duplicate" rule from the prework, applied correctly:
same engineering pattern, right-sized schema.

---

## 2. User-selection model (cardio is browsed, never prescribed)

The library is built to be **chosen by the user**, per Phases 2-4. Design:

- **Browse by category** (the §4 categories) with a flat, short list under each.
  No deep taxonomy: ~35-40 activities total, so a single scroll with category
  headers beats a multi-level tree (matches Volyume's plain, one-screen ethos).
- **Search** by name (the same `SearchBar` pattern used in the exercise library
  and food search), since a user who knows "rowing" should not scroll.
- **Filters** (optional, secondary): "Low impact" and "No equipment" are the two
  that earn their place (joint-friendly and home/outdoor). More filters would be
  bloat for a 40-row list.
- **Favourites**: the user stars the activities they actually do. Stored on the
  profile (`cardioFavourites: [activityId]`), the same lightweight blob pattern
  as `stepsTarget`/`cardioPrescription` (no migration). Favourites sort to the
  top of the picker and are the default quick-log chips.
- **Recents**: derived from the last N `cardio_log` rows, shown above the full
  library at log time so the common case is one tap.
- **Preferred activities set in onboarding** (Phase 6): the user picks 1-3
  favourites when they opt in, seeding the favourites list so the first log is
  already fast.
- **Surfacing at log time**: favourites + recents first, then "Browse all" into
  the categorised library. The user never has to confirm a coach's choice; the
  coach only ever shows a *dose*.

This is the Strava/Garmin/Apple selection pattern (broad browsable library,
user picks) at Volyume's scale.

---

## 3. Cardio activity metadata schema

Canonical table `cardio_activities` (ships in every install; deterministic IDs):

| Field | Type | Allowed values | Why / how used |
|---|---|---|---|
| `id` | TEXT PK | `canonicalCardioId(name)` UUID-shape | Stable cross-device id so `cardio_log.activity_id` round-trips (mirrors exercises) |
| `name` | TEXT | unique canonical name | Lookup + search |
| `display_name` | TEXT | human label | UI (e.g. "Indoor Bike (Spin)") |
| `category` | TEXT | walking, running, cycling, rowing, swimming, machine, hiit, conditioning, sport, other | Browse grouping + coach steer (low-impact categories) |
| `equipment` | TEXT | none, treadmill, bike_indoor, bike_outdoor, rower, pool, elliptical, stair, rope, kettlebell, bag, battle_ropes, sled, outdoor | "No equipment" filter; home/outdoor availability |
| `met_low` | REAL | 1.3-18 | MET at easy effort; calorie feedback |
| `met_moderate` | REAL | 1.3-18 | MET at moderate effort |
| `met_high` | REAL | 1.3-18 | MET at hard effort |
| `default_intensity` | TEXT | low, moderate, high | Pre-selected intensity at log time |
| `recovery_impact` | TEXT | low, moderate, high | Feeds recovery model + coach stacking flag |
| `impact_type` | TEXT | cardiovascular, musculoskeletal, both | Distinguishes central vs leg-overlap fatigue (interference) |
| `coach_targetable` | INTEGER | 0/1 | Whether the coach may reference it for guidance (all 1 except niche sport rows) |
| `is_custom` | INTEGER | 0/1 | Canonical vs user-added |
| `created_at` / `updated_at` | INTEGER | epoch ms | Standard |

**Derived flags** (`cardioMetadata.js`, pure, from the row, not stored):
- `lowImpact` = `equipment in {bike_indoor, bike_outdoor, rower, pool,
  elliptical}` or category in {cycling, swimming, rowing} and not interval. Used
  by the "Low impact" filter and the coach steer in a hypertrophy block.
- `legOverlap` = impact_type in {musculoskeletal, both} and category in
  {running, hiit, conditioning, sport, stair}. Used to flag stacking on leg
  days (interference, Phase 2 §5).
- `metFor(intensity)` = picks the right MET column.
- `homeOk` = `equipment in {none, outdoor}` or category in {walking, running,
  hiit, conditioning(some)}. Used by "No equipment" filter.

**Calorie method** (one method, energy-balance compliant):
`est_kcal = round(metFor(intensity) × bodyweightKg × durationMin / 60)`.
bodyweightKg from the latest morning weight, else profile weight. Stored on the
log row as **feedback**, never added to the nutrition target (Phase 6 §6).

**Session log table** `cardio_log` (additive migration, mirrors `daily_steps`
`migrate_056` + LWW/soft-delete from `migrate_047`):
`PRIMARY KEY (user_id, id)`, `entry_date` (local day key), `activity_id`,
`activity_name` (denormalised snapshot, like food entries snapshot macros),
`duration_min`, `intensity`, `est_kcal`, `distance` (nullable),
`avg_hr` (nullable, wearable-later), `source` (manual|auto|wearable),
`notes` (nullable), `updated_at`, `deleted_at`, `created_at`. Frozen-AAB safe:
the old build has no writer/reader, fully additive.

---

## 4. Full activity list at launch (by category)

MET = (low / moderate / high), 2024 Compendium representative; verify per row at
seed. RI = recovery impact; IT = impact type. ~38 activities.

**Walking**
- Walking (3.0 / 4.3 / 5.0) · none/outdoor/treadmill · RI low · IT cardiovascular
- Incline Treadmill Walk (4.5 / 5.3 / 6.5) · treadmill · RI low · IT both
- Hiking (5.3 / 6.0 / 7.3) · outdoor · RI moderate · IT both

**Running**
- Treadmill Run (8.3 / 9.8 / 11.8) · treadmill · RI moderate · IT both
- Outdoor Run (8.3 / 9.8 / 12.3) · outdoor · RI moderate · IT both
- Trail Run (8.5 / 10.0 / 12.0) · outdoor · RI high · IT both
- Sprint Intervals (running) (9.0 / 12.0 / 15.0) · outdoor/treadmill · RI high · IT both

**Cycling**
- Indoor Bike (Steady) (4.8 / 7.0 / 8.5) · bike_indoor · RI low · IT cardiovascular
- Spin Class / Bike Intervals (6.0 / 8.5 / 11.0) · bike_indoor · RI high · IT cardiovascular
- Outdoor Cycling (4.0 / 8.0 / 10.0) · bike_outdoor · RI low · IT cardiovascular
- Recumbent Bike (3.5 / 5.0 / 6.8) · bike_indoor · RI low · IT cardiovascular

**Rowing**
- Indoor Row (Steady) (4.8 / 7.0 / 8.5) · rower · RI moderate · IT both
- Row Intervals (6.0 / 8.5 / 12.0) · rower · RI high · IT both

**Swimming**
- Swim (Freestyle, easy) (5.8 / 7.0 / 8.3) · pool · RI low · IT cardiovascular
- Swim (Hard / intervals) (8.3 / 9.5 / 10.0) · pool · RI moderate · IT cardiovascular
- Swim (Breaststroke) (5.3 / 6.5 / 8.0) · pool · RI low · IT cardiovascular

**Machine (cardio machines)**
- Elliptical (4.6 / 5.0 / 6.8) · elliptical · RI low · IT cardiovascular
- Stair Climber / Stepmill (8.0 / 9.0 / 9.5) · stair · RI moderate · IT both
- Ski Erg (5.0 / 7.0 / 9.0) · rower(ski) · RI moderate · IT both
- Assault / Air Bike (6.0 / 8.5 / 11.0) · bike_indoor · RI high · IT both

**HIIT**
- HIIT (general) (6.0 / 8.0 / 10.0) · none · RI high · IT both
- Tabata / Sprint Intervals (8.0 / 10.0 / 12.0) · none · RI high · IT both
- Jump Rope (8.8 / 11.0 / 12.3) · rope · RI moderate · IT both

**Conditioning (strength-cardio)**
- Circuit Training (5.0 / 6.5 / 8.0) · none · RI moderate · IT both
- Kettlebell Cardio (6.0 / 8.0 / 9.8) · kettlebell · RI high · IT both
- Battle Ropes (6.0 / 8.0 / 10.0) · battle_ropes · RI high · IT both
- Sled / Prowler Push (6.0 / 8.0 / 9.5) · sled · RI high · IT both
- Boxing / Bag Work (6.0 / 7.8 / 9.5) · bag · RI moderate · IT both
- Kickboxing / Sparring (7.0 / 9.0 / 12.0) · bag · RI high · IT both

**Sport (general, user-logged)**
- Football / Soccer (7.0 / 8.0 / 10.0) · outdoor · RI moderate · IT both · coach_targetable 0
- Basketball (6.0 / 8.0 / 9.3) · outdoor · RI moderate · IT both · coach_targetable 0
- Racket Sports (Tennis/Squash/Padel) (5.0 / 7.0 / 8.0) · outdoor · RI moderate · IT both · coach_targetable 0
- Climbing / Bouldering (5.0 / 7.5 / 9.0) · outdoor · RI moderate · IT both · coach_targetable 0

**Other**
- Dance / Cardio Dance (5.0 / 6.5 / 7.8) · none · RI low · IT both
- Elliptical/Cross-trainer HIIT (6.0 / 8.0 / 9.0) · elliptical · RI moderate · IT cardiovascular
- Other Cardio (user MET fallback 6.0 / 7.0 / 8.0) · none · RI moderate · IT both · catch-all so anything is loggable

`coach_targetable = 0` on the sport rows: the coach can count them toward a
weekly cardio target the user logs, but will not *suggest* a duration/intensity
for a team sport it can't dose. They remain fully user-led.

---

## 5. Calorie estimation method (restated, because it is the trap)

`est_kcal = MET(intensity) × bodyweightKg × hours`, stored as session feedback
on `cardio_log`. **It is never added to `nutrition_targets` or the Diary
budget.** The adaptive TDEE (`nutritionEngine.computeAdaptiveTDEEAdjustment`)
already absorbs cardio through the weight trend within ~2 weeks
([MacroFactor](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)).
Adding the MET figure to the target would double-count it against the adaptive
correction. The figure exists so a user sees "≈320 kcal" as feedback, the same
way the live e1RM chip is feedback, not a target.

---

## 6. Gap vs the lifting library, and how to handle each

| Lifting concept | Cardio equivalent | Handling |
|---|---|---|
| sets × reps | duration × intensity | New fields; no set model |
| primary/secondary muscle | impact_type + legOverlap | Recovery only, not volume allocation |
| fatigue_cost / SFR | recovery_impact | Drives recovery EMA contribution + coach flag |
| equipmentProfiles (plan pool) | equipment + lowImpact/homeOk | Used for filters, NOT a plan generator pool |
| volume landmarks (MEV/MAV/MRV) | none | Cardio has no volume-landmark model; the coach uses a session/duration target instead |
| canonical IDs, derive-not-duplicate, seed+backfill, custom table | identical pattern | **Reused wholesale** (the discipline, not the schema) |
| consumed by planEngine/swap/volume | consumed by coach target + log + recovery flag | Separate consumers; no overlap with lifting engines |

**Seed-time QA (named so it is not skipped):** before shipping, every row's
`met_low/moderate/high` is checked against the 2024 Adult Compendium
(pacompendium.com) and its activity code recorded in a comment, exactly as the
food curated tables compute macros from a sourced table rather than hand-typing.
