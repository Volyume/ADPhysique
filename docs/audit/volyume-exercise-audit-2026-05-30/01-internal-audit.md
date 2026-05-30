# 01 — Internal audit: exercise library and plan construction

Everything here is read from the repository as it stands on the
`claude/context-overflow-recovery-qVfVD` branch on 2026-05-30. Every claim
cites the file and, where useful, the line.

## 1. The exercise library

### 1.1 Where it lives

The canonical library is a single hardcoded table, `RAW`, in
`src/lib/seedExercises.js` (starts line 289). Each row is a fixed-position
tuple:

```
[name, primaryMuscle, secondaryMuscles[], equipment, movementPattern,
 isCompound, minReps, maxReps, fatigueCost, sfr]
```

`seedExercisesIfNeeded()` (line 800) writes every row into the local SQLite
`exercises` table on first launch, using `canonicalExerciseId(name)`
(line 30) to give each canonical exercise a deterministic, name-derived
UUID so the same exercise resolves to the same id on every device.

There is a second, separate field for anatomical detail: `SUBREGION_MAP`
(line 69), a `name -> subregion` object written into the `subregion`
column at seed time (line 829).

### 1.2 Inventory size and distribution

`RAW` holds roughly **445 exercises**. Distribution by primary muscle
(counted from the data):

| Muscle | Count | Muscle | Count |
|---|---|---|---|
| back | 55 | front_delts | 17 |
| abs | 54 | calves | 17 |
| quads | 49 | traps | 16 |
| chest | 42 | side_delts | 14 |
| glutes | 34 | neck | 14 |
| hamstrings | 33 | tibialis | 5 |
| triceps | 31 | rear_delts | 17 |
| biceps | 29 | forearms | 18 |

Sixteen primary-muscle buckets in total.

By equipment tag (counted from the data):

| Equipment | Count |
|---|---|
| bodyweight | 112 |
| barbell | 99 |
| dumbbell | 86 |
| cable | 74 |
| machine | 58 |
| smith_machine | 9 |
| kettlebell | 4 |

**Immediately obvious from these counts:**

- There is **no `plate_loaded` / iso-lateral category**. Hammer Strength
  and plate-loaded machines, the backbone of most commercial gyms, are
  either folded into the generic `machine` tag (e.g.
  `Hammer Strength Chest Press`, `Machine Row (Hammer Strength)`) or
  missing. A user cannot find or filter them.
- There is **no `landmine` category**. Landmine movements are mis-tagged
  as `barbell` (e.g. `Landmine Press`, `Landmine Row`, `Meadows Row`).
- There is **no `band` value in the data** even though the library
  browse screen offers a "Bands" filter (see §4). Band movements are
  tagged `bodyweight`.
- `machine` (58) is a large, undifferentiated bucket. There is no record
  of *which* machine (chest press vs pec deck vs leg press), so a
  machine-only plan cannot reason about machine type.
- `bodyweight` (112) is the single largest bucket, heavy relative to a
  hypertrophy-focused library where loaded machine/cable work carries
  most of the stimulus.

### 1.3 The exercise metadata schema (what each record carries)

The local `exercises` table (`src/lib/database.js`, lines 65–82) has:

```
id, name, primary_muscle, secondary_muscles, equipment,
movement_pattern, compound_isolation, default_rep_min, default_rep_max,
fatigue_cost, stimulus_to_fatigue_ratio, subregion, is_custom,
notes, created_at, updated_at
```

`subregion` was added later by a runtime migration
(`src/lib/database.js` line 308: `ALTER TABLE exercises ADD COLUMN
subregion TEXT`).

**Population quality:**

- Consistently populated for canonical exercises: `name`,
  `primary_muscle`, `secondary_muscles`, `equipment`,
  `movement_pattern`, `compound_isolation`, `default_rep_min/max`,
  `fatigue_cost`, `stimulus_to_fatigue_ratio`. These all come straight
  from the `RAW` tuple.
- **`subregion` is sparse.** It is only set for the names listed in
  `SUBREGION_MAP`, which covers a subset of the library (chest
  flat/incline/decline, back vertical_pull/horizontal_row/lower_lat,
  some delts, calves, hamstrings, abs). Most exercises get `subregion =
  null` (seed line 829: `SUBREGION_MAP[name] ?? null`). Whole muscle
  groups (biceps, triceps, quads, glutes, forearms, neck) have little or
  no subregion data in the DB map.
- **No fields exist for:** difficulty level, unilateral vs bilateral,
  machine type, "suitable for machine-only", "suitable for home/no-kit",
  coaching cues, or named alternatives. `notes` exists on the table but
  is not populated for canonical exercises.

**Anatomical subregion data exists, but only coarsely and only in two
disconnected places** (the DB `subregion` column, and a richer parallel
taxonomy inside planEngine, see §2.2). It is nowhere near the
"every subregion of every muscle" standard the brief sets.

## 2. Plan construction logic

### 2.1 Two exercise systems, bridged by name

This is the central architectural finding. There are **two independent
exercise datasets**:

1. The **library** (`seedExercises.js` `RAW`, ~445 exercises) that the
   user browses and that routines reference.
2. A **separate hardcoded `POOL`** inside `src/lib/planEngine.js`
   (lines 184–338), a different and much smaller list of exercises, each
   tagged `{ n: name, sub: subregion, p: paramKey, eq: [equipment
   profiles] }`.

`planEngine.generatePlan()` builds plans using **only its internal
`POOL`** (it does no DB read). It outputs exercise *names*.
`planAutoGen.js` then matches those names back against the DB library to
write routine rows, and **logs a warning and drops the exercise when a
name does not match** (`planAutoGen.js` lines 149–152). So the two lists
must be kept in lockstep by hand, and any drift silently removes
exercises from a generated plan. This is fragile and is a primary target
for the proposal.

### 2.2 planEngine's subregion and equipment taxonomy

planEngine's `POOL` carries a **richer subregion vocabulary than the DB**
(`planEngine.js` 184–338). Distinct `sub` values:

- chest: `flat`, `incline`, `lower`
- back: `vertical_pull`, `horizontal_row`, `lower_lat`
- side_delts: `side`
- rear_delts: `face_pull`, `horiz_abduction`
- front_delts: `press`, `front_raise`
- biceps: `long_head`, `short_head`, `brachialis`
- triceps: `overhead`, `lateral`
- quads: `vasti`, `rectus`
- hamstrings: `hip_extension`, `knee_flexion`
- glutes: `glute_max`, `glute_med`
- calves: `gastro`, `soleus`
- abs: `flexion`, `anti_extension`, `anti_rotation`
- traps: `upper`, `mid_lower`

`SUBREGION_REQUIREMENTS` (planEngine.js 344–352) names the muscles where
weekly balance is *enforced* once weekly sets clear a threshold, e.g.
`back: required ['vertical_pull','horizontal_row']`, `hamstrings:
['hip_extension','knee_flexion']`, `chest: ['incline','flat']`,
`rear_delts`, `calves`, `abs`. `selectExercisesForMuscle()`
(lines 525–628) sorts required subregions first and rotates them across
session slots so the week collectively covers them (line 569).

**Key gaps in this taxonomy vs the brief's standard:**

- Chest has no inner/outer distinction; `lower` exists but only as
  weighted dips.
- Triceps has `overhead` (long head) and `lateral` but no `medial`.
- Quads has `vasti` and `rectus` but no VMO or outer-sweep distinction.
- Hamstrings splits hip vs knee, but not proximal/distal emphasis beyond
  that.
- Glutes has max and med but not min as a distinct target.
- Biceps split is good (long/short/brachialis); back lacks an explicit
  upper-back/mid-trap/rhomboid target separate from `horizontal_row`,
  and lacks a distinct lower-back target.
- **The DB `subregion` column and the planEngine `sub` tags are two
  different taxonomies that do not fully align** (e.g. the DB map uses
  `gastro`/`soleus`/`flexion`/`lateral_raise`/`overhead_press` strings;
  planEngine uses `gastro`/`soleus`/`flexion`/`side`/`overhead`). Any
  subregion-aware feature has to pick one and reconcile.

### 2.3 Equipment profiles and how they gate selection

Six equipment profiles exist, declared per-exercise in the `POOL`'s `eq`
array and filtered by `filterPool()` (`planEngine.js` 514–517):

`full_gym`, `machines_cables`, `dumbbells_only`, `barbell_plates`,
`home_gym`, `bodyweight`.

The user's profile stores a single `equipment` value
(`planAutoGen.buildPlanInputs`, reads `migrated.equipment ?? 'full_gym'`,
line 90; profile field `primaryEquipment` synced via
`sync/tables/profiles.js`). `generatePlan` threads it through every split
and session builder and into `filterPool`, so generation respects the
chosen profile.

**Equipment is enforced, but bluntly.** It is one profile per user, and
the `machines_cables` profile is the only "machine-only" path. There is
no machine-type awareness, and because the engine selects from the
internal `POOL` (not the DB), the machine-only plan is limited to
whatever machine entries the `POOL` happens to contain, which is thin.

### 2.4 Goal alignment

Goal alignment exists, but only at the **volume** level, not the
exercise-choice level:

- `applyGoalOverlay()` (`planEngine.js` 123–175) biases weekly set
  targets per muscle for physique-category goals (e.g. mens_physique,
  bikini get custom muscle multipliers).
- Phase overlays (`weak_point`, `strength_size`) change rep ranges (e.g.
  strength uses 4–6 for compounds, lines 405–410) and trim isolation
  volume.
- Nutrition phase scales MEV/MRV (lines 78–86).

What does **not** change by goal: *which exercises* are picked for a
muscle. A hypertrophy user and a strength user pull from the same `POOL`
with the same selection logic; only set counts and rep ranges differ. The
brief's requirement (strength should bias compound barbell lifts;
hypertrophy should bias machines/cables for stimulus-to-fatigue) is **not
implemented**.

### 2.5 Sequencing

Sequencing is minimal. `selectExercisesForMuscle` orders required
subregions first and compounds before isolation within a muscle, and
`generatePlan` assigns supersets and trims to a time budget
(lines 1360–1375). There is **no antagonist pairing, no cross-muscle
session ordering by fatigue, and no explicit compound-before-isolation
rule across the whole session** (only within a muscle's own list).

### 2.6 The weekly Coach does not touch exercise selection

`weeklyCoach.runWeeklyCoach()` and `coachApply.js` adjust **sets
(volume), calories, macros, steps, cardio, deloads, diet breaks** only.
They never change which exercises are programmed (confirmed across
`weeklyCoach.js` and `coachApply.js`). So exercise selection is a
one-time event at plan generation; nothing re-selects or rotates
exercises over a training block.

### 2.7 Swapping

`swapEngine.rankSwaps()` (lines 154–191) ranks alternatives by
primaryMuscle (+40), movementPattern (+20), equipment (+15),
compound/isolation (+10), and fatigue/SFR similarity. It **does not use
subregion**, so a swap can silently change the subregion a slot was
meant to cover (e.g. swapping an incline press for a flat press),
undermining the balance planEngine tried to enforce. There is also a
joint-discomfort auto-swap path (lines 210–273).

## 3. The pre-built plan library (`seedRoutines.js`)

The library routines are **hardcoded JSON**, not generated. Roughly a
dozen-plus routines (e.g. Aesthetic Upper Rotation, Beginner Full Body
3x, PPL 3x/6x, Upper/Lower 4x, Bro Split, Express variants, Chest &
Shoulder Specialisation, Back Width & Thickness, Leg Priority), each a
fixed list of workouts with exercises referenced **by name** (e.g. `HS
Plate-Loaded Lat Pulldown`, line ~49). `seedRoutines.js` is ~1,560 lines
and references ~734 name/set rows.

**Consequences:**

- Because routines reference exercises by name, a routine can name an
  exercise that is **not in the library** (e.g. `HS Plate-Loaded Lat
  Pulldown` is referenced in a routine but there is no `plate_loaded`
  entry in `RAW`), producing the same name-match failure mode as §2.1.
- The routines are not tagged by subregion coverage, so there is no
  automated check that, say, the Back specialisation actually hits both
  vertical pull and horizontal row across the week.
- There is no machine-only routine in the library as a first-class,
  named option.

## 4. The library browse screen (`ExerciseLibraryScreen.js`)

Filters exist for **muscle** and **equipment** (`filterMuscle`,
`filterEquipment`, lines 32–33). The equipment filter chips are:
`Barbell, Dumbbell, Cable, Machine, Bodyweight, Smith Machine, Bands`
(line 18); the create-exercise list is `Barbell, Dumbbell, Cable,
Machine, Bodyweight, Kettlebell, Band, Other` (line 26).

**Mismatches with the data:**

- The filter offers "Bands" and "Smith Machine"; the data has
  `smith_machine` (9) but **no `band`** value, so the Bands filter
  returns nothing.
- There is **no Plate-loaded filter**, no Landmine filter, and **no
  subregion / target-area filter at all**. The angle/region knowledge in
  `SUBREGION_MAP` and the planEngine `POOL` is invisible to the user.

## 5. Machine-only pathway: current state

- A machine-only *generation* path exists only as the `machines_cables`
  equipment profile inside planEngine (`filterPool`). It is not surfaced
  as a named, first-class choice anywhere in the UI flow, and it is
  limited to the thin machine coverage in the internal `POOL`.
- The **library has enough generic `machine` (58) + `cable` (74)
  entries** to look broad, but with no machine-type metadata it cannot
  guarantee coverage of the standard commercial-gym machine set across
  every muscle and subregion. The research phase will pin down the
  required machine inventory; the gap analysis will check the library
  against it.

## 6. Summary of the load-bearing findings

1. **Two exercise systems** (library `RAW` vs planEngine `POOL`) bridged
   by fragile name-matching; drift silently drops exercises.
2. **No plate-loaded, landmine, or band equipment class**; `machine` is
   one undifferentiated bucket with no machine type.
3. **Subregion data is sparse, coarse, and split across two
   non-aligned taxonomies**; whole muscles have no subregion targeting.
4. **Goal affects volume and rep range but not exercise choice.**
5. **Equipment is enforced but only as one blunt profile**; machine-only
   is a hidden profile, not a first-class pathway, and rests on thin
   machine coverage.
6. **Swapping ignores subregion**, so it can undo programmed balance.
7. **Library routines are hardcoded, name-referenced, and untagged for
   coverage**, and some name exercises the library does not contain.
8. **No metadata for difficulty, laterality, machine type, cues, or
   alternatives**, all of which the brief requires for intelligent
   construction.
