# Plan A — Exercise library expansion

Founder question: "Should we be increasing our exercise library? What specific
categories or exercises are we missing, and how do we extend that into the
plan builder?"

Method: read the actual code and data (no summaries). Counts below were
produced by extracting the live `RAW` array from `src/lib/seedExercises.js`
and running it through the real `deriveExerciseMetadata`
(`src/lib/exerciseMetadata.js`) and `generatePoolFromLibrary`
(`src/lib/poolGenerator.js`) — the same functions the app uses at runtime —
in a throwaway Node script (not committed, no source touched).

---

## 1. Current census

**Total canonical exercises: 449** rows in `RAW`
(`src/lib/seedExercises.js:376`–906`), zero duplicate names. This sits inside
the competitive bar already researched in
`docs/ultimate-audit-2026-06-13/pass3-exercise-library.md` (EL-2: "~250
specialist floor to ~1,400 JEFIT-breadth ceiling") — mid-pack, closer to the
specialist floor than the breadth ceiling.

**By primary muscle** (17 buckets, `src/lib/algorithms.js:56` MUSCLE_DISPLAY_NAMES):

| Muscle | Count | Muscle | Count |
|---|---|---|---|
| back | 56 | rear_delts | 17 |
| abs | 53 | calves | 17 |
| quads | 49 | forearms | 17 |
| chest | 45 | traps | 16 |
| triceps | 34 | side_delts | 15 |
| glutes | 32 | front_delts | 15 |
| biceps | 30 | neck | 12 |
| hamstrings | 29 | adductors | 7 |
| | | tibialis | 5 |

By raw count alone nothing looks "thin" — but raw count is misleading; see
§2, which cross-references count against equipment context and subregion
("angle") coverage and finds several muscles that look fine in aggregate but
are hollow in specific contexts.

**By equipment (coarse `equipment` field):** barbell 99, bodyweight 91,
dumbbell 86, machine 80, cable 76, smith_machine 9, ez_bar 4, kettlebell 4,
**band 0**.

**By derived `equipmentCategory`** (`exerciseMetadata.js:40`, the granular
field the pool filter actually reads): barbell 96, bodyweight 91, dumbbell 86,
cable 76, machine_selectorised 56, machine_plate_loaded 16, smith 9, other 8,
landmine 7, kettlebell 4, **band 0**.

**By movement pattern:** isolation 225, pull 56, push 55, squat 50, hinge 49,
carry 7, plyometric 4, power 1, core 1, lunge 1.

**Compound vs isolation:** 208 compound / 241 isolation.

**Laterality** (`deriveLaterality`, name-pattern detected): 411 bilateral, 38
unilateral. Per muscle, unilateral count is 0 for side_delts, rear_delts,
abs, traps, forearms, tibialis, neck, and adductors is only 2/7 — i.e. almost
every "symmetry" muscle has no single-arm/single-side option at all.

**Difficulty** (`deriveDifficulty`): 201 beginner (1), 228 intermediate (2),
20 advanced (3). Per muscle, front_delts is the outlier: only 2/15 are
beginner-difficulty, and its two barbell/kettlebell power moves are the only
advanced ones — the muscle simply has almost no low-skill (machine) direct
option (see §2.6).

**machine_ok:** 217/449. **home_ok:** 178/449.

**Metadata vocabulary available for the "second angle" question** (weak-point
plan, parallel workstream): `subregion` (`SUBREGION_MAP`,
`seedExercises.js:81`–371, 258 tagged names), enforced weekly via
`SUBREGION_REQUIREMENTS` (`planEngine.js:603`) for **back, hamstrings,
glutes, quads, chest, rear_delts, triceps, calves, abs only** — side_delts,
front_delts, biceps, forearms, traps, neck, adductors and tibialis carry no
enforced subregion split, they just get one `DEFAULT_SUBREGION`
(`poolGenerator.js:50`) for every exercise. `force` (push/pull/static),
`laterality` (bilateral/unilateral), `equipmentProfiles` (the exact context
list: full_gym / machines_cables / dumbbells_only / barbell_plates /
home_gym / bodyweight), `machineType` (controlled vocab, resistance machines
only), `difficulty` (1–3). This is the exact vocabulary a weak-point "second
angle" feature would need to read — for the 9 subregion-enforced muscles the
plumbing already exists; for the other 8 it would need new subregion tags
plus (if enforcement is wanted) a `SUBREGION_REQUIREMENTS` entry.

---

## 2. Gap analysis — named, not just categorical

All of the following were verified by actually running
`generatePoolFromLibrary` against the real library and checking, per
required subregion, whether any exercise carries a given `equipmentProfile`
— i.e. these are not guesses, they are zero-count results from the live
selection pool.

### 2.1 Resistance bands are entirely absent — P1

`equipmentCategory: 'band'` has **zero** entries (band detection is
name-pattern `\bband(ed)?\b/i`, `exerciseMetadata.js:27`, and no RAW name
matches it). Yet `ExercisePickerModal.js:31` ships a **"Bands" filter chip**
(`PICKER_EQUIPMENT`) that a free or Pro user can tap right now and get an
empty list. This is the single starkest, most user-visible gap: a filter
that promises content and delivers nothing.

Named additions (all straightforward — band work is a well-understood,
low-skill-injury-risk category):
- Band Pull-Apart (rear_delts, horiz_abduction)
- Band Face Pull (rear_delts, face_pull)
- Band Lateral Raise (side_delts)
- Band Row (back, horizontal_row)
- Band Lat Pulldown (back, vertical_pull — see §2.2, this is also the fix for
  the home/dumbbell vertical-pull hole)
- Band Assisted Pull-Up (back, vertical_pull)
- Band Chest Press (chest, flat)
- Band Bicep Curl (biceps)
- Band Tricep Pushdown (triceps, pushdown)
- Band Squat (quads)
- Band Good Morning / Band Pull-Through (hamstrings/glutes, hip_extension)
- Band Overhead Tricep Extension (triceps, overhead — see §2.6)
- Banded Lateral Walk (glutes, pumper)
- Band Deadlift (hamstrings/glutes, hip_extension)

### 2.2 Back: vertical pull has zero dumbbells-only, barbell-only, or home-gym option — P1

`back` requires `vertical_pull` + `horizontal_row` (`SUBREGION_REQUIREMENTS`,
minSets 6). Verified against the generated pool: `vertical_pull` has **0**
entries tagged `dumbbells_only`, **0** `barbell_plates`, **0** `home_gym`.
Every vertical-pull exercise in the library (Lat Pulldown variants, Pull-Up
family) is either `cable` (full_gym/machines_cables only) or `bodyweight`
compound — and bodyweight compounds are deliberately confined to the
`['bodyweight']` profile only (`exerciseMetadata.js:80`–98, founder rule:
"not everyone can do a pull-up"), never `home_gym` or `dumbbells_only`.

Concretely: a user who selects **"Dumbbells Only"** at onboaring
(`ProOnboardingScreen.js:176`, a real, distinct, user-facing equipment
option, described as "Adjustable or fixed dumbbells" — no bar implied) gets
a back day that can satisfy horizontal rows (Dumbbell Row, Chest-Supported
Row, Kroc Row, Helms Row) but literally cannot include a single vertical-pull
movement. Same for "Barbell & Plates" and "Home Gym".

Fix is the band additions in §2.1 (Band Lat Pulldown / Band Assisted
Pull-Up, tagged `home_gym` + `dumbbells_only` + `barbell_plates`), which is
why bands and this gap are really one fix, not two.

### 2.3 Hamstrings: hip_extension pattern has no machine or bodyweight option — P1

`hip_extension` (RDL-pattern) subregion has **0** entries tagged
`machines_cables` and **0** tagged `bodyweight`. Every hip_extension exercise
is barbell, dumbbell or cable pull-through. A machines-only or
bodyweight-only plan can hit `knee_flexion` (leg curl machine, Nordic curl)
but never the hinge-pattern half of the hamstring requirement.

Named additions:
- Bodyweight Single-Leg RDL (balance-only, no load) — hamstrings, hip_extension, bodyweight
- Glute-Ham Raise Machine (hip_extension emphasis variant) — hamstrings, hip_extension, machine_selectorised
- Cable Pull-Through already exists but is tagged `glutes` primary, not
  `hamstrings` — worth a metadata review, not a new exercise (see §3).

### 2.4 Rear delts: face_pull pattern is cable-only — P1

`face_pull` subregion: **0** entries for `dumbbells_only`, `barbell_plates`,
`home_gym`, or `bodyweight`. Every face-pull-pattern rear delt exercise in
the library is a cable move. `horiz_abduction` is better (Dumbbell Rear Delt
Fly covers dumbbells_only/home_gym) but still **0** for `barbell_plates` and
`bodyweight`.

Named additions: Band Face Pull (also closes §2.1), Prone Reverse Fly /
"Superman Y-Raise" (bodyweight, horiz_abduction, no equipment).

### 2.5 Chest: no bodyweight incline option — P2

`incline` subregion: **0** entries tagged `bodyweight`. Push-Up family
covers `flat` and `decline`, but there is no hands-elevated / pike-style
incline-emphasis push-up in the library.

Named addition: Incline Push-Up (Hands Elevated) — chest, incline,
bodyweight.

### 2.6 Front delts: almost no beginner/machine option — P2

Front delts has only 2/15 exercises at difficulty 1, and (oddity worth
flagging) both machine shoulder-press entries (`Machine Shoulder Press`,
`Viking Press`, `seedExercises.js:479-480`) are tagged primary muscle
`side_delts`, not `front_delts` — so front_delts has **no machine-based
press at all**, only free-weight barbell/dumbbell compounds. A
machines-only or true-beginner plan has nothing low-skill to reach for.

Named addition: Machine Shoulder Press (Front Delt Focus) tagged
`front_delts` primary — or a metadata reclassification if the existing
machine press's primary muscle assignment was a deliberate call (flag to
confirm, see §5).

Related, smaller: triceps `overhead` subregion has 0 bodyweight entries
(genuinely hard to fix without equipment — band is the natural answer,
already listed in §2.1); calves `soleus` (bent-knee/seated) subregion has 0
`barbell_plates` and 0 `bodyweight` entries — a bodyweight seated calf raise
(feet under a fixed object, or a simple "Seated Bodyweight Calf Raise") would
close the bodyweight side.

### 2.7 Obliques / rotation work is thin and not even required — P2

`abs` is 53 exercises but only 4 are subregion-tagged `rotation` (Russian
Twist, Cable Woodchop, Landmine Twist, Landmine Rotation) against ~13
`flexion` and ~9 `anti_extension`. More tellingly, `abs`'s
`SUBREGION_REQUIREMENTS` entry (`planEngine.js:626`) only requires
`['flexion', 'anti_extension']` — rotation/anti-rotation is not enforced at
all, so a generated plan can go a full week without a single anti-rotation
or rotation movement even though `Pallof Press` (already in the library,
anti-rotation) exists.

Two separate items here: (a) more named rotation exercises — Standing Cable
Woodchop (High-to-Low / Low-to-High already exist as names but are untagged
in `SUBREGION_MAP`, so they default to `flexion` and don't count as
rotation work at all — a metadata fix, not a new exercise), Oblique
V-Up, Side Bend variants (Dumbbell/Cable Side Bend exist, also untagged);
(b) whether rotation/anti-rotation should become a required third subregion
for abs — that is an engine-behaviour decision, not a library-content one
(see §5 Q3).

### 2.8 Unilateral/symmetry options are sparse outside legs — P3

side_delts, rear_delts, abs, traps, forearms, tibialis and neck all show
**0** unilateral-tagged exercises (`deriveLaterality`, name-pattern
detected). Some of this is inherent to the muscle (a neck curl doesn't need
a single-side variant), but side_delts and rear_delts genuinely lack a
single-arm cable lateral raise / single-arm rear delt row, which are
completely standard gym movements and easy, low-risk additions:
- Single-Arm Cable Lateral Raise (side_delts)
- Single-Arm Cable Rear Delt Fly (rear_delts)

### 2.9 Distance-based cardio has no clean library entry — P3

Noted directly in the seed's own comment (`seedExercises.js:920-921`): "No
row is tagged 'distance': the library has no clean treadmill/rower distance
entry, so per the spec we default to weight_reps when unsure." Treadmill
run/walk, rowing machine (distance), stationary bike (distance) are absent
as loggable strength-library entries with a `distance` `exerciseType`. Lower
priority because `src/lib/cardio/cardioActivities.js` is a separate cardio
module (Pro cardio logging) that may already cover this need outside the
strength exercise library — worth confirming before duplicating (see §5 Q4),
flagged here only because the seed file itself calls it out as unfinished.

### 2.10 Not a gap, but a related decision already on file

`docs/ultimate-audit-2026-06-13/pass3-exercise-library.md` (Q-EL1/Q-EL2) and
`docs/hevy-teardown-2026-06-29/03-exercise-library.md` (R1, R6) already
identified: no per-exercise media/video/muscle-diagram, and a coarser
muscle taxonomy than competitors (no lats/upper-back/lower-back/obliques
split within back/abs). Both are real but are a different, much larger body
of work (asset production, muscle re-tagging across 449 rows +
`planEngine.js` landmarks) than "add more named exercises" — flagged so this
plan isn't read as silently superseding those open items.

---

## 3. How expansion reaches the plan builder

Three consumers of the library, each behaves differently:

**a) Precision Coaching auto-gen (Pro) — automatic, metadata-driven.**
`generateAndSavePlan` (`src/lib/planAutoGen.js:119`) loads
`getAllExercises()` and hands it to `generatePlan({ ...inputs,
exerciseLibrary: allExercises })`. Inside the engine,
`buildEffectivePool` (`planEngine.js:584`) calls
`generatePoolFromLibrary` (`poolGenerator.js:128`), which turns every
library row with a `primaryMuscle`, a non-`other` `equipmentCategory`, a
non-empty `equipmentProfiles`, and a hypertrophy-eligible `movementPattern`
into a selectable pool entry automatically. **A new exercise with correct
metadata needs zero engine code changes to become selectable** — this is
exactly the mechanism the 05/06 library-rebuild work (referenced throughout
`seedExercises.js` comments) was built for.

The one place this is NOT fully automatic: **subregion**. If a new exercise
targets a muscle with enforced `SUBREGION_REQUIREMENTS` (back, hamstrings,
glutes, quads, chest, rear_delts, triceps, calves, abs) and you want it to
count toward a *specific* required subregion (e.g. a new `vertical_pull`
back exercise), it must be added to `SUBREGION_MAP` in `seedExercises.js`
AND, if the muscle's translation table needs it, `SUBREGION_TRANSLATION` in
`poolGenerator.js`. Skip this and the exercise still becomes selectable, it
just falls back to that muscle's `DEFAULT_SUBREGION` and doesn't add angle
diversity — it fills volume but not the coverage the exercise was added for.
For the 8 unenforced muscles (side_delts, front_delts, biceps, forearms,
traps, neck, adductors, tibialis), adding a subregion tag today does nothing
functional (no `SUBREGION_REQUIREMENTS` entry reads it) — it would need a
new engine requirement entry to matter, a founder decision (§5 Q3).

**b) Free-tier "Plan Library" curated routines — NOT automatic, needs hand-editing.**
`PlanLibraryScreen.js` shows hand-authored routines from
`LIBRARY_PLANS` in `src/lib/seedRoutines.js` (1,568 lines), each day
referencing specific exercise names as plain strings. A `routineIntegrity`
regression test (`src/lib/__tests__/routineIntegrity.test.js`) already
guards that every referenced name resolves to either `RAW` or a small
`REQUIRED_EXERCISES` auto-create list unique to this file. **Adding an
exercise to `RAW` does not put it into any curated plan** — if the founder
wants new exercises to actually appear in the free templates (e.g. a band
row inserted into the "Home / no equipment" plan), that is separate,
deliberate hand-editing of specific routine days in `seedRoutines.js`.

**c) Manual builder / exercise picker (free and Pro) — automatic, no work needed.**
`ExercisePickerModal.js` and `ManualBuilderScreen.js` both just read
`getAllExercises()` and filter by muscle/equipment/text
client-side — any exercise present in the local database (seeded or
topped-up) appears immediately, with no separate registration step.

---

## 4. Cost / shape of expansion

**Per-exercise data shape** (one row in `RAW`, `seedExercises.js:376`):
`[name, primaryMuscle, secondaryMuscles[], equipment, movementPattern,
isCompound, minReps, maxReps, fatigueCost 1-10, sfr 1-10]`. Everything else
(`equipmentCategory`, `equipmentProfiles`, `force`, `laterality`,
`difficulty`, `machineOk`, `homeOk`) is derived automatically by
`deriveExerciseMetadata` — no hand-editing of those columns, ever.

**Mandatory extra step per exercise, enforced by a regression test:** a form
tip in `src/lib/formTips.js` (`FORM_TIPS` map). The `formTipsCoverage.test.js`
guard fails the build if any library exercise has no tip — so "add N
exercises" always means "write N form-tip paragraphs" too (British English,
calm/plain voice per `COACHING_VOICE_SYNTHESIS_LOCKED.md`), not just a data
row. Budget roughly one paragraph (3-4 sentences) of coaching-voice copy per
exercise.

**Optional, situational steps:**
- `SUBREGION_MAP` entry (`seedExercises.js`) — only if the exercise should
  count toward a specific required subregion on an enforced muscle (§3a).
- `EXERCISE_TYPE_MAP` entry (`seedExercises.js:922`) — only for
  `duration` (timed holds/stationary cardio) or `weighted_bodyweight`
  (loadable bodyweight reps); everything else defaults correctly to
  `weight_reps`.
- `routineIntegrity`/`formTipsCoverage`/`exerciseMetadata` test suites
  (`src/lib/__tests__/`) already assert these invariants — `npm test` will
  catch a missed form tip or a broken routine reference immediately.

**Seeding mechanism — already built for exactly this, no new mechanism
needed.** `topUpNewExercisesIfNeeded` (`seedExercises.js:1009`) is an
idempotent top-up: any `RAW` row whose canonical ID (name-hash,
`canonicalExerciseId`) isn't already in the local DB gets inserted on next
app launch, gated by `LIBRARY_VERSION_KEY` (currently `v2`, bump the version
string to force a re-scan on existing installs). This is precisely the
mechanism used for every past library addition (phase 7, the 05/06
rebuild). **No Supabase migration needed** — canonical (non-custom)
exercises never sync to cloud (`src/lib/sync.js:218` filters to
`is_custom` only); they are purely local/derived, so cost is app-version
only, not backend.

**Perf/cap considerations:** none observed. `generatePoolFromLibrary` is a
single pass over `getAllExercises()` (already loaded for every plan
generation); adding ~50-100 rows is negligible against the existing 449.
`ExercisePickerModal`/`ManualBuilderScreen` render off the same list with
client-side filtering, no pagination concerns raised in the code.

---

## 5. Sized options

**Option A — ~+40 targeted fills (small, ~1-2 focused sessions).**
Fixes every P1/P2 named gap in §2 with the minimum exercise count: the band
set (§2.1, ~14 exercises, also closes §2.2 and part of §2.4), the
hip_extension bodyweight/machine fills (§2.3, 2 exercises), chest bodyweight
incline (§2.5, 1), front-delt machine press (§2.6, 1, or a metadata
reclassification instead — see below), rotation/oblique subregion tagging
(§2.7, metadata-only, 0 new exercises, just tags on existing untagged names),
symmetry unilateral adds (§2.8, 2), plus form tips for every new row.
Unlocks: the empty "Bands" filter becomes real, every equipment context
(Dumbbells Only / Barbell & Plates / Home Gym / Machines & Cables /
Bodyweight) can actually satisfy every enforced subregion requirement for
every muscle. This is the option that turns "the pool filter never fails
silently" (the founder rule embedded in `poolGenerator.js`'s own comments)
into "the pool never comes up *empty* for a legitimate equipment choice
either."

**Option B — ~+100 comprehensive (medium, several sessions + review pass).**
Everything in A, plus: broader P3 fills (more unilateral variants across
muscles, more rotation/oblique named exercises rather than just re-tagging
existing ones, a distance-cardio set of library entries if §5 Q4 says the
strength library should own that rather than the cardio module), plus
opening up subregion enforcement for 2-3 of the currently-unenforced
muscles (front_delts press-vs-raise, biceps long-head-vs-short-head, or
side_delts angle split) with matching `SUBREGION_REQUIREMENTS` entries —
this is the option that most directly serves the weak-point "second angle"
workstream running in parallel, since it gives 2-3 more muscles the same
angle-aware selection back/chest/quads already have.

**Option C — equipment-context completeness (framing, not a fixed count).**
Instead of sizing by exercise count, size by "zero-count entries in §2
cells" and treat every one as a must-fix regardless of total added
exercises (likely lands close to Option A's count in practice, ~35-45
exercises, but the deliverable is framed as "no enforced subregion has a
zero-coverage equipment context" rather than a target number). Best framing
if the founder cares primarily about the auto-gen engine never silently
degrading a plan for a real equipment selection, less about raw library
size or media/competitive parity.

All three options are pure data + copy work (RAW rows + form tips +
targeted `SUBREGION_MAP`/`SUBREGION_TRANSLATION` entries); none require
touching `planEngine.js`'s selection algorithm itself, except the
subregion-enforcement extension called out explicitly in Option B.

---

## 6. Open questions for the founder

1. **Which sized option?**
   a) Option A — ~40 targeted fills, closes every P1/P2 gap in §2, cheapest.
   b) Option B — ~100 comprehensive, also extends subregion enforcement to
      2-3 more muscles for the weak-point "second angle" work.
   c) Option C — reframe as "zero equipment-context gaps" rather than a
      target count (similar size to A, different acceptance criterion).
   d) Something else / hold — state what.

2. **Bands (§2.1): add now regardless of which option, given the picker
   already advertises an empty filter?**
   a) Yes, fold the ~14-exercise band set into whichever option is chosen.
   b) No — remove/hide the "Bands" filter chip instead until bands are
      built (smaller, narrower fix).
   c) Something else.

3. **Rotation/anti-rotation for abs (§2.7): should it become a required
   third subregion** (`SUBREGION_REQUIREMENTS.abs.required` currently
   `['flexion', 'anti_extension']` only), or stay a soft/optional category?
   This is an engine-behaviour change, not a content change, so it needs an
   explicit call even under Option A/C.
   a) Yes, add `rotation`/`anti_rotation` as required (with a minSets figure
      to set).
   b) No, keep it soft — just improve the named exercise coverage and
      tagging, no enforcement change.

4. **Distance-based cardio (§2.9): does `src/lib/cardio/cardioActivities.js`
   already own this need**, or should the strength exercise library also
   carry treadmill/rowing/bike entries with a `distance` `exerciseType`?
   a) Cardio module already covers it — leave the strength library as is.
   b) Strength library should also carry distance-loggable entries — scope
      as a follow-up, not part of this expansion.
   c) Need a quick audit of the cardio module first before deciding.

5. **Front-delt machine press (§2.6): reclassify existing rows or add a new one?**
   `Machine Shoulder Press` and `Viking Press` are currently tagged primary
   muscle `side_delts`. Front delts has no machine press at all as a result.
   a) Reclassify one of the two existing rows to `front_delts` primary
      (zero new exercises, but changes what a real user's existing logged
      history attributes to — check impact on past volume stats first).
   b) Add a new, distinct `front_delts`-primary machine press exercise
      (leaves history alone, adds one row + one form tip).
   c) Leave as is — not worth the risk either way.
