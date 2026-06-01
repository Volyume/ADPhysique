Status: COMPLETE | Timestamp: 2026-06-01 | Phase 1: Codebase audit

# Volyume plan-building system: codebase audit

This maps the actual plan-generation system as it stands on `main` at commit
`9a06d67`. Every claim cites a file and line. It covers two distinct surfaces:
the generative Coach (planEngine) and the seeded plan library.

## 1. Files involved in plan generation

- `src/lib/planEngine.js` (76 KB), the deterministic generation engine. Pure
  functions, no DB, no Math.random (header `:1-5`).
- `src/lib/coachingGoals.js` (20 KB), the division taxonomy, the per-division
  volume overlays (`GOAL_OVERLAYS` `:329`), phase overlays (`PHASE_OVERLAYS`
  `:458`), training phases, weak-point muscle list.
- `src/lib/algorithms.js` (46 KB), `VOLUME_LANDMARKS` (`:13`), the base
  per-muscle MV/MEV/MAV/MRV set landmarks (RP-style), plus volume maths.
- `src/lib/mesocycle.js` (18 KB), `MESO_SCHEDULE` (`:14`), the week-to-week
  set multipliers that turn a week-1 template into a multi-week block.
- `src/lib/planAutoGen.js` (8.5 KB), `buildPlanInputs` and
  `generateAndSavePlan` (`:107`), which read the user profile, call the engine
  (`:127`), and persist the plan.
- `src/lib/poolGenerator.js`, `generatePoolFromLibrary`, builds the exercise
  selection pool from the live exercise library.
- `src/lib/seedRoutines.js` (133 KB), the seeded plan library: an exercise
  catalogue plus 31 hand-written routine templates.
- `src/screens/PlanLibraryScreen.js`, the library browser (collections,
  division filters, copy-to-my-plans).
- `src/lib/database.js`, `getLibraryPlans`, `copyPlanFromLibrary`,
  `generateMesocycleWeeks` (`:2421`), library persistence.

The generative path and the library are separate systems. A user either lets
the Coach generate a plan from their profile, or copies a pre-built routine
from the library.

## 2. How selection criteria drive a generated plan (exact trace)

Entry: `generateAndSavePlan(userId, profile)` (`planAutoGen.js:107`) calls
`buildPlanInputs(profile)` then `generatePlan({ ...inputs, exerciseLibrary })`
(`planAutoGen.js:127`). The engine consumes only named fields and returns
`name / description / splitType / workouts / whyThis` (the persisted shape).

`generatePlan` (`planEngine.js:1263`) wraps `_generatePlanInner`
(`planEngine.js:1277`). The inputs (`:1278-1291`):

    experience, trainingAge, daysPerWeek, sessionLengthMinutes, equipment,
    goal, phase, weakPoints[], recoveryRating, nutritionPhase, age

The flow:

1. `weakPoints` capped at 3 (`:1294`), mapped to internal muscle keys by
   `resolveWeakPointKeys` via `WEAK_POINT_MAP` (`:29-46`).
2. `effectiveDays` = beginners capped at 4 days (`:1298`).
3. `internalGoal` shadow: `phase==='weak_point'` -> `weak_point_spec`;
   `phase==='strength_size'` -> `strength_hypertrophy`; else `goal` (`:1307`).
4. `splitType = selectSplit(experience, effectiveDays, internalGoal)` (`:1311`;
   `selectSplit` `:710`). Split is chosen by DAYS and EXPERIENCE only:
   3 days -> `ppl` (advanced/competitive) or `full_body`; 4 -> `upper_lower`;
   5 -> `ppl` (or `upper_lower_wp` for the weak-point path); 6 -> `ppl_ab`.
   The division (`goal`) does not change the split.
5. `landmarks = computeLandmarks(experience, recoveryRating, nutritionPhase,
   age)` (`:1314`; `:98`). Base `VOLUME_LANDMARKS` (`algorithms.js:13`) are
   scaled by `EXP_MULT` (`:67`), `REC_MULT` (`:74`), `NUT_MULT` (`:80`) and
   `ageMultipliers` (`:90`), giving per-muscle `{MV, MEV, MAVlow, MAVhigh,
   MRV}`.
6. `weeklyTargets` initialise at each muscle's `MEV` (`:1317-1320`). This is
   the WEEK-1 set count, not the block peak.
7. `adjustedTargets = applyGoalOverlay(weeklyTargets, landmarks, goal,
   weakPointKeys, phase)` (`:1323`; `:125`), see section 3.
8. Workouts are built by the split builder (`buildFullBodyWorkouts` `:769`,
   `buildUpperLowerWorkouts` `:788`, `buildPPLWorkouts` `:812`,
   `buildUpperLowerWPWorkouts` `:891`). Exercises come from
   `selectExercisesForMuscle` (`:570`) drawing on the effective pool
   (`buildEffectivePool` `:363` = `generatePoolFromLibrary` merged with the
   hard-coded `POOL` `:186` as fallback), with subregion coverage enforced by
   `SUBREGION_REQUIREMENTS` (`:382`).
9. Finalise (`:1357-1370`): dedupe, `trimToTimeBudget`, `assignSupersets`,
   stamp duration.

The multi-week build is applied separately when the plan is saved:
`generateMesocycleWeeks` (`database.js:2421`) multiplies the week-1 set counts
by `MESO_SCHEDULE` (`mesocycle.js:14`).

## 3. How muscle groups are prioritised per selection (actual data)

Division priority is implemented as a single layer: per-muscle multipliers in
`GOAL_OVERLAYS` (`coachingGoals.js:329-443`), applied to the week-1 MEV targets
in `applyGoalOverlay` (`planEngine.js:140-159`), then clamped to 110% of MRV
per muscle (`:162-165`) and a systemic total cap of 130 sets (`:167-174`).

The actual multipliers (1.00 = no bias; absent muscle = 1.00):

- `mens_physique`: side_delts 1.40, back 1.30, rear_delts 1.25, chest 1.20,
  biceps/triceps 1.15, front_delts 1.10; traps 0.70, quads 0.70, hamstrings
  0.70, calves 0.65, glutes 0.60, abs 0.60.
- `classic_physique`: calves 1.30, side_delts 1.25, back 1.20, chest/biceps/
  triceps/quads/rear_delts 1.15, hamstrings 1.10, glutes 1.05; traps 0.85,
  abs 0.80.
- `bodybuilding`: calves 1.25; chest/back/side_delts/biceps/triceps/quads 1.20;
  rear_delts/hamstrings/glutes/traps/forearms 1.15; abs/front_delts 1.10.
- `bikini`: glutes 1.55, hamstrings 1.35, side_delts 1.15, back 1.10,
  rear_delts 1.05; quads 0.90, biceps/triceps 0.90, chest 0.80, calves 0.80,
  traps 0.70, abs 0.65.
- `wellness`: glutes 1.60, hamstrings 1.40, quads 1.35, side_delts/back 1.10,
  rear_delts 1.05; calves 0.90, biceps/triceps 0.90, chest 0.85, traps 0.75,
  abs 0.70.
- `figure`: side_delts 1.30, back 1.25, glutes 1.25, rear_delts 1.20,
  hamstrings 1.15, quads 1.10, biceps/triceps 1.10, chest 1.05, calves 1.05;
  traps 0.85, abs 0.80.
- `womens_physique`: side_delts/back 1.25, quads/glutes 1.20, biceps/triceps/
  hamstrings/calves/rear_delts 1.15, chest 1.10, traps 1.00; abs 0.85.
- `general`: `{}` (no bias).

`adductors`, `neck` and `tibialis` exist in `VOLUME_LANDMARKS` but appear in NO
overlay, so no division biases them (notable for `wellness`, where adductors
are a judged driver, and `figure`/`bikini` which value the inner-thigh line).
`forearms` is only biased in `bodybuilding`.

## 4. How volume, frequency, sets, reps and load are prescribed (actual values)

- Base volume landmarks (`algorithms.js:13`), direct sets per muscle per week:
  chest 4/6/14/22, back 8/10/16/25, side_delts 0/8/16/26, rear_delts 0/6/14/22,
  front_delts 0/0/6/12, biceps 5/6/14/22, triceps 4/6/12/18, forearms 2/4/12/14,
  quads 6/8/14/20, hamstrings 4/6/12/20, glutes 0/4/10/16, adductors 0/0/8/14,
  calves 6/8/14/20, abs 0/4/16/25, traps 0/4/12/20 (MV/MEV/MAV/MRV). These
  match the Renaissance Periodization (Israetel) landmark model.
- Week-1 target = MEV x division multiplier, capped at 110% MRV and a 130-set
  systemic total.
- Building / maximum volume is delivered by `MESO_SCHEDULE` (`mesocycle.js:14`):
  standard (beginner/intermediate) ramps x1.00 -> x1.10 -> x1.20 -> x1.25 then
  a x0.50 deload over 5 weeks; advanced/competitive ramps over 6 weeks to the
  same x1.25 peak. So "maximum" is roughly week-1 x 1.25.
- Frequency is an emergent property of the split (how many times a muscle's
  group appears across the week), not a per-muscle target. There is no explicit
  per-muscle weekly frequency prescription.
- Rep ranges by MOVEMENT TYPE, not division (`REP_RANGES` `:416`):
  heavy_compound 5-9, mod_compound 8-12, machine 8-15, isolation 10-20.
  `STRENGTH_REP_RANGES` (`:423`) lower these for the strength_size phase.
- Rest by movement type (`REST_SEC` `:396`): 180/150/120/75 s.
- Load is prescribed as RIR by experience (`baseRir` `:437`): beginner 3,
  intermediate 2, advanced/competitive 1, plus progression notes.

## 5. How weak-point specialisation modifies the base plan (exact implementation)

Weak points are selected from `WEAK_POINT_MUSCLES` (`coachingGoals.js:117`),
capped at 3, mapped to muscle keys (`planEngine.js:29-55`). Specialisation is a
PHASE (`phase==='weak_point'`), not a goal.

In `applyGoalOverlay` (`:132-139`), when the phase is `weak_point`:

    for each muscle: if it is a weak-point key -> target = max(MEV, MRV-2);
                     otherwise               -> target = MV (maintenance).

Then the split becomes `upper_lower_wp` at 5 days (`selectSplit:716`), which
adds a dedicated weak-point day (`buildWeakPointDay` `:861`,
`buildUpperLowerWPWorkouts` `:891`).

Critical behaviour: the weak-point branch IGNORES the division overlay entirely
(comment `:128-131`: "ignore the physique-category overlay"). So a Men's
Physique competitor who runs a weak-point block loses all division emphasis for
that block, and every non-weak-point muscle drops to maintenance volume. The
specialisation is therefore a full REPLACEMENT of the emphasis model, not an
additive overlay on top of the division priorities. This is the single biggest
divergence from the brief's "additive, not destructive" requirement and is
examined in the gap analysis.

## 6. The plan library (seeded routines)

`seedRoutines.js` holds an exercise catalogue plus 31 routine templates. Each
template carries a `tags` string used by `PlanLibraryScreen` collections and
filters. The 31 plans, by tag:

- General build/beginner/intermediate: beginner full body 3x, beginner PPL,
  intermediate upper/lower 4x, PPL 3x, advanced PPL 6x, bro split 4x, short
  full body 3x, short upper/lower 4x, minimalist full body 2x, strength 3x,
  dumbbell-only full body, bodyweight/home full body, women's beginner full
  body, women's upper/lower 4x (glutes), women's glute/ham 5x.
- Aesthetic accessory rotations: aesthetic upper rotation, v-taper, arms,
  masters width.
- Weak-point mini-blocks: chest/shoulders, back, legs (quads/hams),
  glutes/hams, arms.
- Division stage-prep / build plans (8): `mens_physique` (5 day, stage_prep),
  `classic_physique` (5 day), `mens_bodybuilding` (5 day), `bikini` (4 day),
  `wellness` (5 day), `figure` (5 day), `womens_physique` (5 day),
  `womens_bodybuilding` (5 day).

The library's division filter (`PlanLibraryScreen.js:33-76`) offers eight
divisions split by gender, including Men's Bodybuilding and Women's
Bodybuilding as separate entries. Neither the library nor the Coach has a
Men's 212 plan.

## 7. Every variable a user can select (confirmed from code)

From `buildPlanInputs` (`planAutoGen.js`) and the onboarding sources:

- `goal` / division: one of `general`, `mens_physique`, `classic_physique`,
  `bodybuilding`, `bikini`, `wellness`, `figure`, `womens_physique`
  (`coachingGoals.js:26-103`). Eight options.
- `phase` / training phase: includes `weak_point` and `strength_size` plus the
  nutrition phases (`TRAINING_PHASES` `coachingGoals.js:158`).
- `daysPerWeek`: 3-6 (beginners forced to <=4).
- `experience`: beginner / intermediate / advanced / competitive (`EXP_MULT`).
- `equipment`: full_gym / machines_cables / dumbbells_only / home_gym /
  barbell_plates / bodyweight (`EQUIPMENT_LABELS` `:964`).
- `weakPoints`: up to 3 from 16 labels (`WEAK_POINT_MUSCLES`).
- `recoveryRating`: poor / average / good (`REC_MULT`).
- `nutritionPhase` / `age` / `trainingAge`: feed the landmark multipliers.
- `sessionLengthMinutes`: trims the session to a time budget.

## 8. Where the system is generic vs division-specific

Division-specific TODAY: per-muscle weekly VOLUME distribution only, via
`GOAL_OVERLAYS`. That is the whole of it.

Generic (identical across divisions for the same days/experience/equipment):

- Split structure (`selectSplit` is division-blind). A Wellness or Bikini
  athlete at 5 days gets the same PPL as a Men's Physique athlete, with the
  lower-body emphasis delivered only by allocating more sets inside the same
  one or two leg sessions, not by restructuring the week.
- Exercise selection and ordering (`selectExercisesForMuscle`) keys off
  equipment, subregion coverage and stimulus-to-fatigue, not division. Men's
  Physique gets no preferential lateral-raise or upper-chest weighting beyond
  the generic chest incline/flat requirement; Wellness gets no glute-biased
  exercise ordering beyond extra glute sets; Bikini gets no specific
  hip-thrust / abduction prescription.
- Rep ranges, rest, RIR, progression and the mesocycle ramp are all
  division-blind.

## 9. Does Men's Physique generate a different plan than Classic Physique today?

Yes, but only in set distribution. At the same days/experience/equipment, both
produce the same split, the same exercise pool and the same rep/rest/RIR
scheme. They differ in how many sets each muscle receives: e.g. Men's Physique
biases side_delts x1.40, calves x0.65, quads x0.70, abs x0.60; Classic biases
calves x1.30, quads x1.15, side_delts x1.25, abs x0.80. So the divisions are
distinguished by volume allocation, not by structure, exercise choice or
loading. Whether the resulting set counts land in the elite per-division range
is tested in the gap analysis (Phase 5) using the stress simulation (Phase 6).

## Headline findings carried into the gap analysis

1. Division-specificity is volume-distribution-only. Split, exercise selection,
   ordering, reps and loading are division-blind.
2. Weak-point specialisation REPLACES the division emphasis and drops
   everything else to maintenance, rather than layering additively.
3. `adductors` is biased by no division despite mattering for Wellness/Figure/
   Bikini; `forearms` only for bodybuilding.
4. The Coach taxonomy lacks Women's Bodybuilding; the library has Women's
   Bodybuilding and Men's Bodybuilding as separate entries. Men's 212 is
   deliberately OUT of scope (founder direction 2026-06-01: 212 is Open
   bodybuilding at a weight cap, not a separate programming target). The 212
   research file is retained as reference only and drives no proposal.
5. Open/`bodybuilding` volumes (and the RP landmarks) are calibrated for
   advanced trainees; the research flags that published Open volumes assume
   enhanced athletes and must scale down for natural/general users.
6. Lower-body-dominant divisions (Wellness, Bikini) carry very high glute/ham
   multipliers (up to x1.60) but are squeezed into a generic split with limited
   lower-body frequency, which the stress test must check for deliverability.
