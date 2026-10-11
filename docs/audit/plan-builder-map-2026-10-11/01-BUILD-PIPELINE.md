# Plan builder map, part 1: the build pipeline of the live planner

Written 2026-10-11 for an independent review. Read against the working tree at
commit `39a1929f77f36a78384c747a4923cb842cf8a82d` (branch `main`, read from
`.git/HEAD`). Every claim cites `file:line`. Paths are relative to the repo
root; `planner.js`, `allocate.js` and the other bare names are in
`src/lib/plan/` unless a path is given.

Conventions used here:

- "Observed" means the code was executed (section 10 and section 11 say how)
  or read to the end of the function that consumes the value. "UNVERIFIED"
  means the claim rests on code not read to the end, with the reason stated.
- Where a comment and the code disagree, the code is described and the
  disagreement is listed in section 11.
- Sets: "direct" sets are an exercise's own sets for its muscle; "fractional"
  sets add 0.5 of a set to each muscle an exercise credits
  (`COUNTING.synergistCredit = 0.5`, `science.js:77-79`; the credits
  themselves are the catalogue's, section 3.4).
- A session order is written as the session indexes in the order trained,
  for example `0132` means s0, s1, s3, s2.

Out of scope for this part: how a saved plan is served week by week at run
time (check-ins, `checkinPlacement.js`, `coachApply.js`), the legacy generator
`planEngine.generatePlan` beyond the point where it is called, and the
internals of `exercise/continuity.js applyContinuity`, which this part did not
read (section 1.7 says what that leaves unverified).

---

## 0. The pipeline at a glance

In execution order, for a new plan with the release switch on and no style
pool:

1. `generateAndSavePlan` builds the inputs from the profile
   (`buildPlanInputs`, `planAutoGen.js:111-145`), loads the library, the
   person's exercise intent and the active plan's style tag
   (`planAutoGen.js:990-1029`).
2. It hands over to `saveWithPlannerV2` (`planAutoGen.js:1037-1043`), which
   asks continuity which of the person's current exercises are kept
   (`plannerV2KeptExercises`, `planAutoGen.js:1583-1613`).
3. `buildPlanWithPlannerV2` (`planAutoGen.js:1765-1816`) resolves the
   standard catalogue for the person's kit (`catalogue.js:685-743`), puts the
   kept exercises into it (`plannerV2KeptChoices`, `planAutoGen.js:1501-1569`),
   reads history (first block, learned factor, own gaps, logged weekly sets)
   and calls `buildPlan` (`planner.js:108-161`).
4. `buildPlan` picks the candidate week structures (a division's own list,
   or the general families), assigns every muscle a role (`roles.js:80-157`),
   evaluates every structure (`evaluateFamily`, `planner.js:399-1003`),
   chooses one (`chooseFamily`, `planner.js:1318-1336`), optionally re-orders
   it on the person's own recovery clocks (`personalise`,
   `planner.js:263-285`), computes each muscle's recovery-safe maximum
   (`planner.js:178-255`) and shapes the output (`toPlan`,
   `planner.js:1363-1453`).
5. Inside `evaluateFamily`: sessions a week per muscle, the peak week's sets
   (`allocatePeakWeek`, `allocate.js:133-548`), a session-count search, the
   rotation order (`rotation.js`), the light and heavy split, the six-week
   block (`targets.js`, `prescribe.js`), the readiness simulation
   (`readiness.js`), readiness fixes, the ramp, the slower-recoverer cap, the
   standard-floor guard and the family's scores.
6. Back in `saveWithPlannerV2`: one continuity and resolution pass
   (`resolvePlannerV2Plan`, `planAutoGen.js:1632-1657`), then one transaction
   writing the programme, routines, routine exercises and plan facts
   (`planAutoGen.js:1954-2003`), then block activation, the weekly
   planned-volume rows (`writePlannerV2WeeklyRows`,
   `planAutoGen.js:1827-1867`) and archiving of other plans.
7. Any planner failure, an empty catalogue or a plan that resolves to nothing
   (not because of the person's exclusions) returns `null`, and the legacy
   generator `planEngine.generatePlan` builds the plan instead
   (`planAutoGen.js:1042-1047`).

---

## 1. Entry points (`src/lib/planAutoGen.js`)

### 1.1 The release switch

- `PLANNER_V2 = true` (`src/lib/plan/release.js:22`). The only importer in
  `src/` outside tests is `planAutoGen.js:47` (grep for `plan/release`).
- It is read at exactly two places: `generateAndSavePlan`
  (`planAutoGen.js:1037`) and `generatePlanDryRun` (`planAutoGen.js:2324`).
  `planGeneratedRebuildV2` and `planFixedRebuildV2` call the new planner
  without reading the switch (`planAutoGen.js:2087-2183`).

### 1.2 Which generator runs

| Case | Generator | Code |
|---|---|---|
| Switch on, active plan's tags carry no `style:` key, or a key `stylePoolFor` does not know | New planner (`saveWithPlannerV2`) | `planAutoGen.js:1024-1043`; `stylePoolFor` returns null for an unknown key (`exercise/stylePools.js:189-193`) |
| Switch on, active plan has a known style key (kettlebell or circuit library template) | Legacy `generatePlan` with `stylePool` | `planAutoGen.js:1029`, `1045-1061` |
| New planner returns `null` (planner threw, no workouts, no `v2`, the catalogue had no row for the kit, or nothing resolved and no slot was blocked by the person's exclusions) | Legacy `generatePlan` | `planAutoGen.js:1914-1919`, `1929-1939`, `1765-1779` |
| New planner resolves nothing because the person's exclusions blocked every slot | Neither: returns `{ ok: false, error: 'plan_blocked_by_exclusions', ... }` | `planAutoGen.js:1929-1937` |

`planGeneratedRebuildV2` treats ANY style key as `style_plan` (refuses)
(`planAutoGen.js:2093-2097`), whereas the save path only diverts when the key
resolves to a pool. Listed in section 11 (P15).

### 1.3 `generateAndSavePlan(userId, profile, { ledger, allowLearnedCarry, continuityProposal, keepBlock })`

`planAutoGen.js:975-1238`. Callers found by grep: `startWithPlan.js:147`,
`PlanUpdateScreen.js:361` (passes `keepBlock`), `ProOnboardingScreen.js:2022`
and `:2080`, `PlansScreen.js:767` (passes `ledger: seedRanges`,
`allowLearnedCarry: true`, `continuityProposal`).

Reads, in order:

1. `buildPlanInputs(profile)`; null means `{ ok: false, error: 'Profile incomplete' }` (`:979-980`).
2. `getAllExercises()` (`:990-993`), failure tolerated as `[]`.
3. `loadGenerationIntent(userId)` (`:999`, defined `:358-369`): `getActiveBlock` then `loadExerciseIntentState`; any failure returns `null`.
4. `filterLibraryForGeneration(allExercises, intentState)` (`:1000`); returns `{ library, dropped, ... }`; with no intents and no capability rules it returns the same array (`exercise/generation.js:148-157`).
5. `reviewedReplacementIds(continuityProposal)` (`:1001`, defined `:653-660`): ids whose reviewed verdict is `replace` or `remove_or_redistribute`; `libraryForReviewedProposal` removes them (`:670-673`). The result is `generationLibrary`.
6. `readDemonstratedStructure(userId, inputs.daysPerWeek)` (`:1012-1015`). This result is passed only to the legacy generator (`:1049`); the new planner never receives it, and the preview reports `structureMemory: null` for the new planner (`:2247`).
7. `getActivePlan(userId)` for the style tag (`:1024-1029`).

Then, with the switch on and no pool, `saveWithPlannerV2` (`:1889-2060`, section 8). If it returns a result, that is returned (`:1042`). Otherwise the legacy path runs from `:1045`.

### 1.4 `generatePlanDryRun(userId, profile, { continuityProposal })`

`planAutoGen.js:2285-2423`. Callers: `startWithPlan.js:104`,
`PlanUpdateScreen.js:228`, `PlansScreen.js:692`. Same reads as 1.3 steps 1 to
7 (`:2287-2319`). With the switch on and no pool it calls
`previewWithPlannerV2` (`:2195-2263`), which runs the same kept-exercise pass,
`buildPlanWithPlannerV2` and `resolvePlannerV2Plan` as the save and returns
`{ ok: true, plan: { ...plan, workouts }, sessionLengthMinutes,
structureMemory: null, continuity, partial?, missedCount?, missedExercises? }`
plus the blocked-slot fields (`:2241-2262`). It writes nothing. It returns
`null`, and so falls back to the legacy preview, in the same cases as the save
(`:2217-2239`).

### 1.5 `planGeneratedRebuildV2({ userId, profile, daysPerWeek, replaceIds })`

`planAutoGen.js:2087-2134`. Caller: `planRebuild.js:332`, with
`daysPerWeek: routines.length` of the plan being rebuilt and
`replaceIds` = generator picks outside the catalogue (`planRebuild.js:329-334`).

1. `inputs = { ...buildPlanInputs(profile), daysPerWeek }` (`:2089-2091`).
2. `plannerV2SessionCount(inputs) !== daysPerWeek` returns `days_not_kept` (`:2092`). `plannerV2SessionCount` is `max(2, min(6, round(daysPerWeek || 3)))`, capped at 4 for a beginner (`:1664-1668`), the same rule as `planner.js:311-316`.
3. Any `style:` tag on the active plan returns `style_plan` (`:2093-2097`).
4. Library, intent, filter as 1.3; `continuityProposal` is always `null` here (`:2099-2102`).
5. Kept exercises (`plannerV2KeptExercises`) minus `replaceIds` (`:2107-2111`).
6. `buildPlanWithPlannerV2` (`:2112`); null returns `no_catalogue`; no workouts or no `v2` returns `no_plan`; a workout count different from `daysPerWeek` returns `days_not_kept` (`:2113-2115`).
7. `resolvePlannerV2Plan` with incumbents narrowed by `replaceIds` (`:2116-2126`); nothing resolved returns `nothing_resolved`; a resolved workout count different from `daysPerWeek` returns `days_not_kept` (`:2127-2128`).
8. Returns `{ ok: true, inputs, plan, resolved, planName }` (`:2129-2130`). It never writes; the writer is `database.rebuildPlanKeepingBlockV2`, called from `planRebuild.js` (not traced here).

### 1.6 `planFixedRebuildV2({ userId, profile, fixedSessions })`

`planAutoGen.js:2152-2183`. Caller: `planRebuild.js:397`, for a library, kit
or manual plan. It calls `buildPlan` directly with `fixedSessions` and
`daysPerWeek: sessions.length` (`:2162-2178`); `choices` and `loggedWeekly`
are not passed. In fixed mode the planner ignores `choices` and `daysPerWeek`
(`planner.js:98-106`, `109-110`) and skips the ramp (`planner.js:893`).
Returns `{ ok: true, inputs, plan }` or `{ ok: false, reason }`.

### 1.7 Helpers shared by the new-planner paths

| Helper | Lines | What it does |
|---|---|---|
| `plannerV2KeptExercises` | `1583-1613` | Loads the current plan's exercises (`loadIncumbentSlots`, `452-482`), de-duplicated by id, offers them to `withContinuity` (`685-760`) as one workout, keeps those whose decision is `SLOT_OUTCOME.RETAINED`, returns their library rows in plan order. Any failure returns `[]`. |
| `buildPlanWithPlannerV2` | `1765-1816` | Catalogue, kept choices, focus muscles, history, `buildPlan`, legacy-shaped summary. Detailed in section 2. |
| `plannerV2LoggedNames` | `1433-1441` | `getRecentlyUsedExerciseIds(userId, 400)` mapped to names. |
| `plannerV2FirstBlock` | `1448-1457` | `true` unless some mesocycle's `blockCompletionState` is `COMPLETED`; a read failure answers `true`. |
| `plannerV2Personalisation` | `1718-1751` | Reads the active plan's routines (in their stored order) and its facts' `builtFactor`, then `recovery/load.js loadPlanPersonalisation` (`load.js:515-561`). Returns `{ learnedFactor, ownGaps }`, each `null` on any failure. The learned factor is `null` unless the recovery learner has a personal reading and is not paused; when paused it is the old plan's `builtFactor` (`load.js:522-534`). `ownGaps` comes from `ownGapsFromHistory` over the last `ROTATION.ownGapsWindowWeeks` (8) weeks (`load.js:540-555`); its internals were not read (UNVERIFIED beyond that). |
| `plannerV2LoggedWeekly` | `1698-1716` | `getWeeklyVolumeByMuscle(userId, 4)`; keeps weeks with any positive volume; averages each muscle over those weeks; `null` when no week trained or on failure. |
| `resolvePlannerV2Plan` | `1632-1657` | Shapes workouts for writing (`plannerV2WorkoutsForWrite`, `1296-1325`), runs `withContinuity`, then `resolvePlanAgainstLibrary` (`772-833`), then `orderSamePositionContiguously` (`914-929`). |

`withContinuity` calls `applyContinuity` (`exercise/continuity.js`), which can
substitute a retained incumbent into a generated slot (`planAutoGen.js:742-755`).
This part did not read `applyContinuity`; whether a substituted exercise keeps
the planner's `muscle`, `kind` and `credits` fields on the row written to the
facts (`planAutoGen.js:1983-1988`) is UNVERIFIED.

`resolvePlanAgainstLibrary` drops an exercise that does not resolve to a
library row (`missedCount`) or that the person's intent blocks
(`blockedSlots`) (`planAutoGen.js:788-817`). The planner's facts (targets,
shares, caps) were computed before this pass and are written as computed
(`planAutoGen.js:1997-2001`); a dropped exercise is not re-planned. In the new
planner's path the catalogue only chooses from `generationLibrary`, which the
intent filter has already narrowed, so this should be rare; how often it occurs
is UNVERIFIED.

---

## 2. `buildPlanInputs` and what reaches the planner

### 2.1 `buildPlanInputs(profile)` (`planAutoGen.js:111-145`)

1. No `profile.trainingGoal`: returns `null` (`:112`).
2. `migrateProfileGoals(profile)` (`coachingGoals.js:402-430`): `general_hypertrophy` becomes `general`; `strength_hypertrophy` becomes `general` with phase `strength_size` when the phase was `bulk`, `lean_gain` or empty; `weak_point_spec` becomes `general` with phase `weak_point` under the same condition; every other goal is unchanged.

| Output field | Source | Default | Line |
|---|---|---|---|
| `experience` | `experience` | `'intermediate'` | `:123` |
| `daysPerWeek` | `daysPerWeek` | `DEFAULT_DAYS_PER_WEEK = 4` (`:99`) | `:124` (not clamped here) |
| `sessionLengthMinutes` | `sessionLengthMinutes` | `60` | `:125` |
| `equipment` | `equipment` | `'full_gym'` | `:126` |
| `goal` | `trainingGoal` (migrated) | none | `:127` |
| `phase` | `trainingPhase` (migrated) | `'maintain'` | `:121`, `:132` |
| `weakPoints` | `planWeakPoints` | `[]` | `:133` |
| `recoveryRating` | `recoveryRating` | `'average'` | `:134` |
| `nutritionPhase` | `phaseToNutritionKey(phase)` | `'maintain'` for an unknown phase | `:135`; `coachingGoals.js:306-308` |
| `age` | `ageFromDateOfBirth(dateOfBirth)` | `null` | `:143` |

`phaseToNutritionKey` maps (`coachingGoals.js:229-299`): `lean_gain` to
`lean_gain`, `bulk` to `build`, `strength_size` to `build`, `weak_point` to
`lean_gain`, `cut` to `mild_cut`, `recomp` to `recomp`, `maintain` to
`maintain`. Observed by execution (section 11, P8).

### 2.2 What `buildPlanWithPlannerV2` passes to `buildPlan` (`planAutoGen.js:1786-1809`)

| `buildPlan` input | Value | Notes |
|---|---|---|
| `daysPerWeek` | `inputs.daysPerWeek` | clamped inside the planner (2.3) |
| `sessionLengthMinutes` | `inputs.sessionLengthMinutes` | |
| `equipment` | `inputs.equipment` | the planner uses it only for transition time (`allocate.js:53-55`, `228`); the catalogue uses it as the kit (`planAutoGen.js:1774-1778`) |
| `goal` | `inputs.goal` | |
| `experience` | `inputs.experience` | beginner clamp and beginner first-block peak |
| `nutritionPhase` | `inputs.nutritionPhase` | read only by `roles.js:91` for `'aggressive_cut'`, which the profile path never produces (P8) |
| `recoveryRating` | `inputs.recoveryRating` | changes the person's own clocks (order and reported readiness only, `planner.js:143-155`) |
| `focusMuscles` | `resolveWeakPointKeys(inputs.weakPoints.slice(0, 3))` | `planEngine.js:61-89`. Labels map to keys: Chest and Upper Chest to `chest`; Lats / Back Width and Back Thickness to `back`; Side Delts, Rear Delts, Front Delts, Biceps, Triceps, Quads, Hamstrings, Glutes, Adductors, Calves to their keys; Core / Abs to `abs`; Traps to `traps`. Duplicate keys are dropped after the slice (P13). |
| `addedMuscles` | `[]` | no profile field exists (`planAutoGen.js:1781-1783`) |
| `firstBlock` | `plannerV2FirstBlock(userId)` | |
| `learnedFactor`, `ownGaps` | `plannerV2Personalisation` | |
| `loggedWeekly` | `plannerV2LoggedWeekly(userId)` | `null` for a person with no training in the last 4 weeks |
| `choices` | catalogue with kept exercises | section 3 |
| `divisionMatrix` | `planEngine.DIVISION_MATRIX` | section 5.2 |
| `isStrength` | `inputs.phase === 'strength_size'` | rep ranges and rest only (section 7.4) |

Not passed: `phase` itself (so the `weak_point` phase has no effect on the new
planner; weak points become focus muscles in every phase, `roles.js:7-9`),
`age`, and the demonstrated structure.

### 2.3 Clamps and defaults inside `buildPlan` (`planner.js:108-155`)

- Sessions `n` = `clampDays(inputs)`: `max(2, min(6, round(daysPerWeek || 3)))`, then at most 4 for `experience === 'beginner'` (`planner.js:311-316`). Fixed mode uses the authored session count (2 to 6, else `RangeError`, `planner.js:334-338`).
- `focusMuscles` filtered to `PLAN_MUSCLES` (`planner.js:111`; `roles.js:39-44`).
- `goal` defaults to `'general'` (`planner.js:132`); `equipment` to `'full_gym'` (`:136`); `sessionLengthMinutes` to 60 when not positive (`:137`).
- `typical` = `TYPICAL_WEEK_GAP_HOURS[n]` (`planner.js:138`; `recovery/constants.js:689-697`).
- `ownGaps` used only when its length equals `n` (`planner.js:139`).
- `factor` = `learnedFactor` clamped to `[LEARNED_FACTOR.min 0.75, LEARNED_FACTOR.max 1.4]`, else `null` (`planner.js:127-129`; `science.js:205-212`).
- `lowestRir` = `min(BLOCK.rirLadder[0..4])` = 1 (`planner.js:142`; `science.js:140`).
- `hoursVolume` = the population clock (rating `average`, no factor) (`planner.js:146`, `154`); every structural decision uses it.
- `personal` = factor present or rating not `average` (`planner.js:155`); only then does `personalise` run.

A beginner who asks for 6 days gets a 4-session plan; `buildPlanInputs`
still reports 6 (`planAutoGen.js:124`). Observed by execution (probe in
section 11, P14).

---

## 3. The exercise catalogue (`src/lib/plan/catalogue.js`)

### 3.1 `resolveCatalogue({ library, profile, loggedExerciseNames })` (`catalogue.js:685-743`)

1. Kit = `profile`, or `'full_gym'` when empty (`:686`). The six kits are `CATALOGUE_PROFILES` (`:143-145`). An unknown kit matches no row (`profilesOf(row).includes(kit)` is false, `:702`), so every muscle resolves empty and `buildPlanWithPlannerV2` returns `null` (`planAutoGen.js:1779`): the legacy generator runs.
2. The library is indexed by name for catalogue names only; a built-in row beats a custom row of the same name, then the lower id (`indexLibrary`, `:608-621`).
3. For each muscle in `CATALOGUE_MUSCLES` order (`:136-141`), for each role in catalogue order (`:709`):
   - credited roles are skipped (`:710`);
   - `pick(names)`: names not already taken for this muscle, present in the library, with a load prescription (`exerciseType` `weight_reps` or `weighted_bodyweight`, `:599-602`) and carrying the kit in `equipmentProfiles` (`:698-704`). Among those, the first that is in `loggedExerciseNames`, else the first in catalogue order (`:705-706`). Recency of the logged list plays no part: the first logged name in catalogue order wins.
   - If none, and the role's rank is 1 or 2, the kit's `THIN_KIT[kit][muscle][roleId]` names are tried the same way; a pick from there is `thinKit: true` (`:713-719`).
   - The chosen row becomes `{ name, exerciseId, role, rank, kind, credits, direct: 1, primaryMuscle, reason, grade, source, thinKit, optIn, logged }` (`:723-738`).
4. `kind` = `paramKeyOf(row)` (`:573-580`): `isolation` when `compoundIsolation === 'isolation'`; else `heavy_compound` for equipment category `barbell` or `landmine`; else `machine` for `machine_selectorised` or `machine_plate_loaded`; else `mod_compound`.

### 3.2 Roles per muscle (`catalogue.js:167-477`)

| Muscle | Rank: role id: names in preference order |
|---|---|
| chest | 1 `flat_press`: Barbell Bench Press, Dumbbell Bench Press, Machine Chest Press. 2 `incline_press`: Incline Dumbbell Press, Incline Barbell Bench Press, Incline Machine Press. 3 `chest_fly`: Pec Deck (Machine Fly), Cable Crossover (High to Low) |
| back | 1 `vertical_pull`: Lat Pulldown (Wide Grip), Pull-Up, Chin-Up, Lat Pulldown (Neutral Grip). 2 `horizontal_row`: Seated Cable Row, Chest-Supported Row (Dumbbell), Machine Row (Chest Supported), Barbell Row (Bent Over), Dumbbell Row. 3 `other_pull`: all of the above in that order |
| side_delts | 1 `lateral_raise`: Dumbbell Lateral Raise. 2 `lateral_raise_alt`: Cable Lateral Raise, Machine Lateral Raise |
| rear_delts | 1 `reverse_fly`: Reverse Pec Deck. 2 `rear_delt_alt`: Face Pull, Dumbbell Rear Delt Fly |
| front_delts | 1 credited (`front_credit`). 2 `overhead_press`: Barbell Overhead Press, Dumbbell Shoulder Press, Machine Shoulder Press |
| traps | 1 `shrug`: Dumbbell Shrug, Barbell Shrug |
| biceps | 1 `preacher_curl`: EZ Bar Preacher Curl, Preacher Curl (Dumbbell), Preacher Curl Machine, Preacher Curl (Barbell). 2 `standing_curl`: Barbell Curl, Dumbbell Curl, Cable Curl. 3 `hammer_curl`: Hammer Curl |
| triceps | 1 `overhead_extension`: Cable Overhead Tricep Extension, Dumbbell Overhead Tricep Extension. 2 `pushdown`: Tricep Pushdown (Rope), Tricep Pushdown (Bar). 3 `close_grip_press`: Close-Grip Bench Press |
| quads | 1 `squat_or_press`: Barbell Back Squat, Hack Squat Machine, Leg Press. 2 `leg_extension`: Leg Extension. 3 `other_squat`: Leg Press, Hack Squat Machine, Barbell Back Squat. 4 `lunge`: Walking Lunge, Bulgarian Split Squat |
| hamstrings | 1 `leg_curl`: Seated Leg Curl, Lying Leg Curl. 2 `hip_hinge`: Romanian Deadlift (Barbell), Romanian Deadlift (Dumbbell) |
| glutes | 1 credited (`glute_credit`). 2 `hip_thrust`: Barbell Hip Thrust, Machine Hip Thrust. 3 `other_hip_thrust`: Machine Hip Thrust, Barbell Hip Thrust. 4 `glute_kickback`: Glute Kickback Machine, Cable Kickback. 5 `glute_bridge`: Barbell Glute Bridge, Dumbbell Glute Bridge, Glute Bridge |
| calves | 1 `standing_calf`: Standing Calf Raise (Machine). 2 `seated_calf`: Seated Calf Raise, Seated Machine Calf Raise. 3 `leg_press_calf`: Leg Press Calf Raise |
| abs | 1 `loaded_crunch`: Cable Crunch, Machine Crunch. 2 `hanging_raise`: Hanging Knee Raise, Hanging Leg Raise |
| forearms (opt-in flag) | 1 `wrist_curl`: Barbell Wrist Curl, Dumbbell Wrist Curl, Cable Wrist Curl, Band Wrist Curl |
| adductors (opt-in flag) | 1 credited. 2 `adduction_machine`: Hip Adduction Machine |
| neck (opt-in flag) | 1 `neck_machine`: Neck Flexion (Machine), Neck Extension (Machine), Plate Neck Curl, Neck Curl |
| tibialis (opt-in flag) | 1 `tibialis_raise`: Tibialis Raise (Wall), Seated Tibialis Raise, Dumbbell Tibialis Raise (Seated) |

The `optIn` flag is carried on the choice (`:736`) but `resolveCatalogue`
returns these muscles' choices for every person; whether they are trained is
decided by the roles (section 4), not by the catalogue.

### 3.3 Thin kits (`catalogue.js:486-545`)

Used only for a rank 1 or 2 role with no listed name for the kit
(`:713`). `full_gym` has none. `machines_cables`: traps shrug (Cable Shrug,
Machine Shrug), hamstrings hinge (Smith Machine Romanian Deadlift).
`dumbbells_only` and `home_gym` share `DUMBBELL_KIT` (`:486-492`): triceps
pushdown (Dumbbell Skull Crusher), quads squat (Goblet Squat) and leg
extension (Bulgarian Split Squat), glutes hip thrust (Dumbbell Hip Thrust,
Dumbbell Glute Bridge), calves (Dumbbell Calf Raise (Standing); Seated
Dumbbell Calf Raise), abs (Decline Crunch, Weighted Dumbbell Crunch).
`barbell_plates` (`:510-518`) and `bodyweight` (`:519-544`) have their own
lists. A thin-kit pick reads `thinKitReason`, grade `D` (`:553-555`, `732-734`).

"Thin kit" (a catalogue fallback) is a different thing from the allocator's
"thin equipment" (a muscle with exactly one choice, section 6.6.2). The second
fires in a full gym for every muscle the catalogue gives one non-credited role:
front delts, traps, forearms, adductors, neck and tibialis (observed, P7).

### 3.4 Credits (`catalogue.js:97-109`, `649`, `663-673`)

Credits are curated per role, never the corpus's secondary muscles. At 0.5 a
set: flat and incline presses credit triceps and front delts; the overhead
press triceps and side delts; vertical pulls biceps (the wide-grip pulldown
also rear delts); rows biceps, rear delts and traps; squat, hack squat and leg
press glutes and adductors; hinges glutes; hip thrusts and bridges hamstrings;
lunges and split squats glutes; the close-grip bench press (and thin-kit dips
and diamond push-ups listed under triceps) chest and front delts. Isolation
rows credit nothing. `creditsByName` overrides the role's credits for named
exercises (`:151-160`, `204-206`, `289`, `295`, `312`, `318-320`).
`catalogueCredits(muscle, name)` returns the credits of the role of that
muscle that lists the name (or lists it as a thin-kit name), else `{}`
(`:663-673`).

### 3.5 Continuity of the person's own exercises: `plannerV2KeptChoices` (`planAutoGen.js:1501-1569`)

Input: the catalogue's choices, the kept rows from `plannerV2KeptExercises`
(in the person's plan order) and `rowOf` (choice to library row).

1. Each kept row is skipped if it has no name, a name already seen, an `exerciseType` other than `weight_reps` or `weighted_bodyweight`, or a primary muscle with no catalogue key; a primary muscle of `shoulders` is read as `side_delts` (`:1509-1516`).
2. The kept choice is `{ name, exerciseId, role: null, rank: 1, kind: deriveParamKey(category, compoundIsolation), credits: catalogueCredits(muscle, name), direct: 1, primaryMuscle, thinKit: false, logged: true, kept: true, ... }` (`:1519-1541`). A kept exercise the muscle's catalogue does not list has no credits.
3. Per muscle (`:1545-1567`): the same name already in the list keeps its place; else the first unclaimed catalogue choice of the same family (`slotKey(muscle, movementFamily(...))`) is replaced, keeping that place's `role` and `rank`; else, if the family exists but every place is claimed, it goes right after the family's last place; else it goes to the FRONT of the muscle's list, in plan order.
4. With nothing kept, the catalogue's own object is returned (`:1543`).

Because the allocator takes a muscle's choices in list order (section 6.6.2),
a kept exercise at the front of a list displaces the catalogue's first choice
from the plan whenever the muscle is trained with fewer exercises than the
list holds.

---

## 4. Roles (`src/lib/plan/roles.js`, `divisionStandard.js`, `coachingGoals.js`)

### 4.1 `assignRoles` (`roles.js:80-157`)

Constants: `PLAN_MUSCLES` (17 keys, `:39-44`); `GROWTH_MUSCLES` = chest,
back, side_delts, rear_delts, biceps, triceps, quads, hamstrings, glutes,
calves, abs (`:47-50`); `INDIRECT_MUSCLES` = front_delts, traps, forearms,
adductors (`:53`); `OPT_IN_MUSCLES` = neck, tibialis (`:56`);
`MAX_FOCUS_MUSCLES = 3` (`:58`); `MAINTENANCE_TARGET = { deEmphasised: 6,
indirect: 4 }` (`:61`).

- `cut` = 2 (`BLOCK.cutPhasePeakReduction`, `science.js:141`) when `nutritionPhase === 'aggressive_cut'`, else 0 (`:63`, `:91`).
- `standardPeak` = 14 (`ROLE_TARGETS.standard.firstBlockBeginnerPeak`) for a beginner in a first block, else 20 (`ROLE_TARGETS.standard.peakMax`) (`:92-94`; `science.js:97`).

For each muscle in `PLAN_MUSCLES` order:

| Case (first that applies) | role | weight | peak (fractional) | growthFloor | directFloor | direct | Lines |
|---|---|---|---|---|---|---|---|
| In focus list (first 3 distinct valid keys) | focus | 1.5 | 22 minus cut | 20 | division floor, else `STANDARD_DIRECT_FLOOR[m]`, else 4 | true | `:101-111` |
| Growth muscle, or overlay at least 1.0, or added; and trainable; overlay above 1.0 | standard | `min(1.5, overlay)` | `standardPeak` minus cut | 10 | as above | true | `:120-139` |
| As above, overlay exactly 1.0 or absent | standard | 1.0 | `standardPeak` minus cut | 10 | as above | true | same |
| As above, overlay below 1.0 ("de-emphasised") | standard | 0 | `max(directFloor, 6)` minus `min(cut, 2)` | `min(10, directFloor)` | as above | true | `:131-136` |
| Opt-in (neck, tibialis) not focused or added | absent from the output | | | | | | `:143` |
| Anything else (front delts, traps, forearms, adductors not judged) | maintenance | 0 | 4 | 0 | 0 | false | `:147-154` |

`trainedMuscles` is only set in fixed mode (`planner.js:124`); for a generated
plan every muscle can train (`:85`, `:99`).

The file header says a division's de-emphasised muscles become maintenance at
6 (`roles.js:15-17`); the code makes them standard with weight 0 (`:113-139`).
Listed in section 11 (P12).

Standard direct floors (`science.js:116-132`): chest 10, back 12, quads 10,
hamstrings 8, glutes 8, calves 8, biceps 8, triceps 8, side_delts 8,
rear_delts 6, abs 6, traps 4, adductors 4, forearms 4; anything else 4
(`STANDARD_DIRECT_FLOOR_DEFAULT`).

### 4.2 `GOAL_OVERLAYS` and the roles they produce (`coachingGoals.js:461-595`)

Overlay values (1.0 means no entry or exactly 1.0):

| Goal | Above 1.0 (standard, weight = value, capped at 1.5) | Exactly 1.0 | Below 1.0 |
|---|---|---|---|
| general | none | | none |
| mens_physique | side_delts 1.40, back 1.30, rear_delts 1.25, chest 1.20, biceps 1.15, triceps 1.15, front_delts 1.10 | | traps 0.70, quads 0.70, hamstrings 0.70, glutes 0.60, calves 0.65, abs 0.60 |
| classic_physique | calves 1.30, side_delts 1.25, back 1.20, chest 1.15, biceps 1.15, triceps 1.15, quads 1.15, rear_delts 1.15, hamstrings 1.10, glutes 1.05 | | traps 0.85, abs 0.80 |
| bodybuilding | chest, back, side_delts, biceps, triceps, quads 1.20; calves 1.25; rear_delts, hamstrings, glutes, traps, forearms 1.15; abs, front_delts 1.10 | | none |
| bikini | glutes 1.55 (weight 1.5), hamstrings 1.35, adductors 1.10, side_delts 1.15, back 1.10, rear_delts 1.05 | | quads 0.90, chest 0.80, biceps 0.90, triceps 0.90, abs 0.65, traps 0.70, calves 0.80 |
| wellness | glutes 1.60 (weight 1.5), quads 1.35, hamstrings 1.40, adductors 1.40, side_delts 1.10, back 1.10, rear_delts 1.05 | | chest 0.85, biceps 0.90, triceps 0.90, abs 0.70, traps 0.75, calves 0.90 |
| figure | side_delts 1.30, back 1.25, rear_delts 1.20, glutes 1.25, adductors 1.10, hamstrings 1.15, quads 1.10, chest 1.05, biceps 1.10, triceps 1.10, calves 1.05 | | abs 0.80, traps 0.85 |
| womens_physique | side_delts, back 1.25; quads, glutes 1.20; hamstrings, biceps, triceps, calves, rear_delts 1.15; chest, adductors 1.10 | traps 1.00 | abs 0.85 |
| womens_bodybuilding | back 1.30; side_delts 1.25; rear_delts 1.20; quads 1.35; hamstrings 1.30; glutes 1.20; chest 1.15; biceps, triceps 1.20; calves 1.25; abs, traps, adductors 1.10 | | none |

Consequences by the table in 4.1:

- A growth muscle with an overlay below 1.0 is "de-emphasised": standard, weight 0, low peak. A non-growth muscle (traps, front delts, forearms, adductors) with an overlay below 1.0, or with none, is maintenance and gets no exercise of its own (`direct: false`).
- A non-growth muscle with an overlay of 1.0 or more is trained for growth: front delts in mens_physique and bodybuilding; traps in bodybuilding, womens_physique (1.00) and womens_bodybuilding; forearms in bodybuilding; adductors in bikini, wellness, figure, womens_physique and womens_bodybuilding.
- `PHASE_OVERLAYS` (`coachingGoals.js:610-616`) is not read by the new planner (grep of `src/lib/plan/`: no match).

### 4.3 Division standards (`divisionStandard.js:40-141`)

`divisionDirectFloor(goal, m)` (`:132-135`) and `divisionSessions(goal, m,
days)` (`:138-141`) override the general direct floor and the general
sessions-a-week rule. Goals with an entry: mens_physique, classic_physique,
bodybuilding, bikini, wellness, figure, womens_physique. No entry exists for
`general` or `womens_bodybuilding`, and no `sessions` entry exists for 2 days.

| Goal | directFloor | sessions a week (days 3 / 4 / 5 / 6) |
|---|---|---|
| mens_physique | chest 10, back 12, side_delts 10, rear_delts 6, biceps 8, triceps 8, quads 8, hamstrings 6, glutes 4, calves 8, abs 8 | quads, hamstrings, glutes 1/1/1/1; calves 2/2/2/2 |
| classic_physique | chest 10, back 12, side_delts 8, rear_delts 6, biceps 8, triceps 8, quads 12, hamstrings 10, glutes 8, calves 10, abs 6 | none |
| bodybuilding | chest 12, back 14, side_delts 8, rear_delts 6, biceps 8, triceps 8, quads 12, hamstrings 10, glutes 8, calves 10, abs 6 | none |
| bikini | glutes 12, hamstrings 8, quads 6, calves 6, adductors 4, back 8, side_delts 8, rear_delts 4, chest 4, biceps 4, triceps 4, abs 4 | glutes, hamstrings 2/2/2/3; quads, chest, biceps, triceps, calves 1/1/1/1 |
| wellness | glutes 12, quads 10, hamstrings 10, adductors 4, calves 8, back 8, side_delts 6, rear_delts 4, biceps 6, triceps 6, chest 2, abs 6 | glutes, hamstrings 2/2/2/3; quads 2/2/2/2; chest, biceps, triceps 1/1/1/1; side_delts, back 1/2/2/2; calves 1/1/1/2 |
| figure | side_delts 10, rear_delts 6, back 12, chest 8, biceps 8, triceps 8, quads 10, hamstrings 8, glutes 8, calves 8, abs 6 | chest 1/1/1/2 |
| womens_physique | chest 8, back 12, side_delts 10, rear_delts 6, biceps 8, triceps 8, quads 10, hamstrings 8, glutes 8, calves 8, abs 6 | none |

A focus muscle never takes the division's sessions value
(`planner.js:423`, `456`), but does take its direct floor (`roles.js:107`).

---

## 5. Week structures

### 5.1 General families (`families.js:42-87`)

Muscle sets (`families.js:22-28`): UPPER = chest, back, side_delts,
rear_delts, front_delts, traps, biceps, triceps, forearms, neck. LOWER =
quads, hamstrings, glutes, adductors, calves, abs, tibialis. PUSH = chest,
side_delts, front_delts, triceps, abs. PULL = back, rear_delts, traps, biceps,
forearms, abs, neck. LEGS = LOWER. ARMS_SHOULDERS = biceps, triceps,
side_delts, rear_delts, front_delts, forearms, abs. FULL = UPPER + LOWER.

| Days | key (recognisable) | Sessions (muscle set) |
|---|---|---|
| 2 | `full_body_ab` (0) | Full Body A (FULL), Full Body B (FULL) |
| 2 | `upper_lower` (0) | Upper (UPPER), Lower (LOWER) |
| 3 | `ppl` (0) | Push (PUSH), Pull (PULL), Legs (LEGS) |
| 3 | `full_body_abc` (0) | Full Body A, B, C (FULL) |
| 3 | `upper_lower_full` (1) | Upper, Lower, Full Body |
| 4 | `upper_lower_x2` (0) | Upper A, Lower A, Upper B, Lower B |
| 4 | `ppl_upper` (1) | Push, Pull, Legs, Upper |
| 4 | `ppl_arms` (1) | Push, Pull, Legs, Arms and Shoulders (ARMS_SHOULDERS) |
| 5 | `ppl_upper_lower` (0) | Push, Pull, Legs, Upper, Lower |
| 5 | `upper_lower_x2_full` (1) | Upper A, Lower A, Upper B, Lower B, Full Body |
| 5 | `upper_lower_x2_focus` (2, only with a focus muscle) | Upper A, Lower A, Upper B, Lower B, Focus (the focus muscles, then ARMS_SHOULDERS not already listed) |
| 5 | `body_part` (1) | Chest and Triceps (chest, triceps, front_delts); Back and Biceps (back, biceps, rear_delts, traps, forearms); Quads and Calves (quads, calves, adductors, tibialis); Shoulders and Abs (side_delts, front_delts, rear_delts, traps, abs, neck); Hamstrings and Glutes (hamstrings, glutes, adductors, abs) |
| 6 | `ppl_x2` (0) | Push A, Pull A, Legs A, Push B, Pull B, Legs B |
| 6 | `upper_lower_x3` (1) | Upper A, Lower A, Upper B, Lower B, Upper C, Lower C |

`familiesFor(n, { focusMuscles })` (`families.js:97-113`) clamps n to 2 to 6,
drops `needsFocus` families without a focus muscle, and fills the Focus
session's list.

### 5.2 `DIVISION_MATRIX` (`planEngine.js:2363-2538`)

Six goals have an entry, each for 3, 4, 5 and 6 days. There is no 2-day entry
for any goal, and no entry for general, bodybuilding or womens_bodybuilding.
Muscles are in list order (the order is used by `ownSessionFor`, section 6.9).

**mens_physique** (label "V-Taper", `:2364-2392`)

| Days | Session | Muscles |
|---|---|---|
| 3 | Upper A (Width) | back, side_delts, chest, rear_delts, triceps, biceps |
| 3 | Legs + Abs | quads, hamstrings, glutes, calves, abs |
| 3 | Upper B (Detail) | side_delts, back, chest, rear_delts, biceps, triceps, calves |
| 4 | Upper A (Width) | back, side_delts, chest, rear_delts, triceps, biceps |
| 4 | Legs + Abs | quads, hamstrings, glutes, calves, abs |
| 4 | Upper B (Detail) | side_delts, back, chest, rear_delts, biceps, triceps, calves |
| 4 | Shoulders + Arms | side_delts, rear_delts, front_delts, biceps, triceps, abs |
| 5 | Chest + Triceps | chest, triceps, front_delts, abs |
| 5 | Back + Biceps | back, rear_delts, biceps, traps |
| 5 | Legs | quads, hamstrings, glutes, calves |
| 5 | Shoulders + Chest | side_delts, rear_delts, chest, abs |
| 5 | Arms + Back + Calves | biceps, triceps, back, side_delts, calves, abs |
| 6 | Push A (Chest) | chest, side_delts, triceps, front_delts |
| 6 | Pull A (Width) | back, rear_delts, biceps |
| 6 | Legs + Abs | quads, hamstrings, glutes, calves, abs |
| 6 | Push B (Delts) | side_delts, chest, triceps, abs |
| 6 | Pull B (Thickness) | back, side_delts, rear_delts, biceps, traps |
| 6 | Shoulders + Arms | side_delts, rear_delts, biceps, triceps, calves, abs |

**classic_physique** (label "X-Frame", `:2393-2421`)

| Days | Session | Muscles |
|---|---|---|
| 3 | Upper A (Back + Delt) | back, chest, side_delts, rear_delts, biceps, triceps |
| 3 | Legs (Quad) | quads, hamstrings, glutes, calves, abs |
| 3 | Upper B + Legs | chest, back, quads, hamstrings, side_delts, biceps |
| 4 | Upper A (Back + Delt) | back, side_delts, rear_delts, chest, biceps, triceps |
| 4 | Legs (Quad) | quads, glutes, hamstrings, calves, abs |
| 4 | Upper B (Chest + Arm) | chest, back, side_delts, biceps, triceps, rear_delts |
| 4 | Legs (Ham) | hamstrings, glutes, quads, calves, abs |
| 5 | Quads + Calves | quads, glutes, calves, abs |
| 5 | Chest + Side Delts | chest, side_delts, triceps |
| 5 | Back | back, rear_delts, biceps, traps |
| 5 | Hamstrings + Glutes | hamstrings, glutes, calves, abs |
| 5 | Shoulders + Arms | side_delts, rear_delts, biceps, triceps, chest |
| 6 | Chest + Abs | chest, side_delts, triceps, abs |
| 6 | Back (Width) | back, rear_delts, biceps |
| 6 | Legs (Quad) | quads, glutes, calves, abs |
| 6 | Shoulders + Arms | side_delts, rear_delts, biceps, triceps |
| 6 | Back (Thickness) + Hams | back, hamstrings, traps, rear_delts |
| 6 | Legs (Ham) + Calves | hamstrings, glutes, quads, calves, abs |

**bikini** (label "Glute Focus", `:2422-2450`)

| Days | Session | Muscles |
|---|---|---|
| 3 | Glutes + Hams A + Delts | glutes, hamstrings, quads, adductors, calves, side_delts |
| 3 | Upper (Delts + Back) | side_delts, back, rear_delts, chest, biceps, triceps |
| 3 | Glutes + Hams B + Abs | glutes, hamstrings, adductors, calves, abs |
| 4 | Lower A (Glute + Ham) | glutes, hamstrings, adductors, calves, abs |
| 4 | Upper A (Delts + Back) | side_delts, back, rear_delts, chest, abs |
| 4 | Lower B (Glute + Quad) | glutes, quads, hamstrings, calves, abs |
| 4 | Upper B (Delts + Arms) | side_delts, back, rear_delts, biceps, triceps, abs |
| 5 | Glutes + Hams | glutes, hamstrings, adductors, calves |
| 5 | Upper A (Delts + Back) | side_delts, back, rear_delts, chest, abs |
| 5 | Glutes + Quads | glutes, quads, hamstrings, calves, abs |
| 5 | Upper B (Delts + Arms) | side_delts, back, rear_delts, biceps, triceps, abs |
| 5 | Glutes (Pump) + Abs | glutes, hamstrings, adductors, abs |
| 6 | Glutes + Hams | glutes, hamstrings, adductors, calves |
| 6 | Upper A (Delts + Back) | side_delts, back, rear_delts, chest, abs |
| 6 | Glutes + Quads | glutes, quads, hamstrings, calves, abs |
| 6 | Upper B (Delts + Arms) | side_delts, back, rear_delts, biceps, triceps |
| 6 | Glutes (Pump) | glutes, hamstrings, adductors, abs |
| 6 | Core + Delts | abs, side_delts, rear_delts, calves |

**wellness** (label "Lower Focus", `:2451-2479`)

| Days | Session | Muscles |
|---|---|---|
| 3 | Glutes + Hams | glutes, hamstrings, quads, adductors, calves |
| 3 | Upper | side_delts, back, rear_delts, biceps, triceps, chest |
| 3 | Quads + Glutes + Abs | quads, glutes, hamstrings, adductors, calves, abs |
| 4 | Lower A (Glute + Ham) | glutes, hamstrings, quads, adductors, calves |
| 4 | Upper A | side_delts, back, rear_delts, biceps, triceps, chest |
| 4 | Lower B (Quad + Glute) | quads, glutes, hamstrings, adductors, calves, abs |
| 4 | Upper B + Abs | side_delts, back, rear_delts, abs, calves |
| 5 | Glutes | glutes, hamstrings, adductors, abs |
| 5 | Upper A | side_delts, back, rear_delts, biceps, triceps, chest |
| 5 | Quads | quads, adductors, glutes, calves |
| 5 | Hams + Glutes | hamstrings, glutes, quads, calves, abs |
| 5 | Upper B | side_delts, back, rear_delts, abs |
| 6 | Glutes | glutes, hamstrings, adductors, abs |
| 6 | Upper A | side_delts, back, rear_delts, biceps, triceps, chest |
| 6 | Quads | quads, adductors, glutes, calves |
| 6 | Hams + Glutes | hamstrings, glutes, calves, abs |
| 6 | Upper B | side_delts, back, rear_delts, abs |
| 6 | Quads + Glutes (Pump) | quads, glutes, hamstrings, calves |

**figure** (label "X-Frame", `:2480-2508`)

| Days | Session | Muscles |
|---|---|---|
| 3 | Shoulders + Back | side_delts, back, rear_delts, biceps, triceps, chest |
| 3 | Legs + Glutes | quads, hamstrings, glutes, calves, abs |
| 3 | Upper B + Legs | back, side_delts, chest, quads, hamstrings, triceps |
| 4 | Shoulders + Back | side_delts, back, rear_delts, biceps, triceps |
| 4 | Legs + Glutes A | quads, hamstrings, glutes, calves, abs |
| 4 | Chest + Arms + Delts | chest, side_delts, biceps, triceps, rear_delts, back |
| 4 | Legs + Glutes B | glutes, hamstrings, quads, calves, abs |
| 5 | Legs | quads, hamstrings, glutes, calves, abs |
| 5 | Back + Delts + Biceps | back, side_delts, rear_delts, biceps |
| 5 | Chest + Triceps + Delts | chest, triceps, side_delts, abs |
| 5 | Legs (Glute) | glutes, hamstrings, quads, calves, abs |
| 5 | Delts + Back + Arms | side_delts, back, rear_delts, biceps, triceps |
| 6 | Pull A | back, rear_delts, side_delts, biceps |
| 6 | Push A | side_delts, chest, triceps |
| 6 | Legs | quads, hamstrings, glutes, calves, abs |
| 6 | Pull B | back, side_delts, rear_delts, biceps |
| 6 | Push B | side_delts, chest, triceps, abs |
| 6 | Legs (Glute) | glutes, hamstrings, quads, calves, abs |

**womens_physique** (label "V-Taper", `:2509-2537`)

| Days | Session | Muscles |
|---|---|---|
| 3 | Upper A | back, side_delts, chest, rear_delts, biceps, triceps |
| 3 | Legs | quads, hamstrings, glutes, calves, abs |
| 3 | Upper B + Legs | side_delts, back, chest, quads, hamstrings, biceps |
| 4 | Upper A (Width) | back, side_delts, rear_delts, chest, triceps, biceps |
| 4 | Lower A | quads, hamstrings, glutes, calves, abs |
| 4 | Upper B (Thickness) | back, chest, side_delts, rear_delts, biceps, triceps |
| 4 | Lower B | hamstrings, glutes, quads, calves, abs |
| 5 | Glutes + Hams | glutes, hamstrings, calves, abs |
| 5 | Chest + Back | chest, back, biceps, triceps |
| 5 | Quads + Lower | quads, glutes, hamstrings, calves, abs |
| 5 | Shoulders + Upper Back | side_delts, rear_delts, back, traps |
| 5 | Glutes + Arms | glutes, biceps, triceps, side_delts, abs |
| 6 | Pull A | back, rear_delts, side_delts, biceps |
| 6 | Push A | side_delts, chest, triceps |
| 6 | Legs | quads, hamstrings, glutes, calves, abs |
| 6 | Pull B | back, side_delts, rear_delts, biceps |
| 6 | Push B | chest, side_delts, triceps, abs |
| 6 | Legs (Glute) | glutes, hamstrings, quads, calves, abs |

A muscle a list names is trained there only if its role trains it directly:
traps in mens_physique's 5- and 6-day lists is maintenance (overlay 0.70) and
gets no exercise (`planner.js:410-411`, `432`).

### 5.3 How a family is turned into sessions per muscle

- `divisionFamily(matrix, goal, n)` (`families.js:119-130`) returns `{ key: 'division_<goal>_<n>', label, recognisable: 0, division: true, sessions }` or `null`. When it is not null it is the ONLY family evaluated (`planner.js:112-113`). Observed: mens_physique at 2 days gets the general `full_body_ab` (probe, section 11 P14 notes).
- `sessionsListed(family, m)` (`families.js:139-143`): indexes of sessions whose list names m.
- `sessionsAllowing(family, m, { focus, atLeast })` (`families.js:145-177`): the listed sessions; and, when m is a focus muscle or fewer sessions list it than `atLeast`, also every session "of its half": a session counts for a half when, ignoring abs, it names at least two muscles of that half, or names some and they are at least half its list; for abs every session counts (`:159-162`). `bodyHalf` is lower for LOWER muscles, else upper (`:31-33`).
- `placeExposures(allowed, k, n, rotate, cost)` (`families.js:185-217`): with k at least the allowed count, all allowed sessions; otherwise every k-subset is scored by the key `[-smallest cyclic gap, largest gap minus smallest gap, summed cost, offset of the first index from rotate, the indexes]`, lowest first. The planner passes `rotate` = the muscle's position in the trainable list and `cost` = a running count of muscles already placed on each session (`planner.js:485-486`, `490-494`, `1009-1014`). The comment at `families.js:207-211` describes `cost` as the muscles a session lists; the code passes the running count (P12).

---

## 6. `buildPlan` and `evaluateFamily`, in execution order (`src/lib/plan/planner.js`)

### 6.1 `buildPlan` (`planner.js:108-161`)

1. `fixed = prepareFixed(inputs.fixedSessions)` (`:109`, `:334-372`).
2. `n` (section 2.3), `focusMuscles` filtered, `division = divisionFamily(...)` (not in fixed mode), `families` = the fixed family, else the division family, else `familiesFor(n, { focusMuscles })` (`:110-113`).
3. `assigned = assignRoles(...)` with `firstBlock: inputs.firstBlock !== false` (`:114-125`); fixed mode then holds every authored muscle that has no direct role at maintenance on its own exercises (`heldWhereAuthored`, `:382-395`).
4. `ctx` (`:130-155`, section 2.3).
5. Every family evaluated: `evaluateFamily(family, ctx)` (`:157`).
6. `chooseFamily(evaluated)` (`:158`, section 6.16).
7. `personalise(chosen, ctx)` when `ctx.personal` (`:159`, section 6.17).
8. `toPlan({ ...final, recoverySafeMax: recoverySafeMax(final, ctx) }, ctx, inputs, factor)` (`:160`).

### 6.2 Setup inside `evaluateFamily` (`planner.js:399-433`)

For every muscle with `roles[m].direct` (`:410-411`):

- `oneSessionRoom = min(PER_SESSION.directCap 8, exercisesAllowed(m) x SETS_PER_EXERCISE.capIsolation 3)` (`:419`; `science.js:41`, `30`, `309-316`).
- `own = divisionSessions(goal, m, n)` unless m is focus (`:423`).
- `standardNeeds` (`:424-427`): 1 for maintenance; else `own` when the division gives one; else 2 when (peak at least `FREQUENCY.preferTwoExposuresFromWeekly` 12 and n at least `FREQUENCY.preferTwoExposuresMinSessions` 4) or (m in the big five and n at least 3) or (directFloor above `oneSessionRoom`); else 1.
- `allowedBy[m]` = `sessionsAllowing(family, m, { focus, atLeast: standardNeeds })`; fixed mode: the sessions whose authored exercises train m (`:429`).
- `listedBy[m]` = `sessionsListed(family, m)` (`:430`).

`trainable` = muscles with at least one allowed session and at least one
catalogue choice (fixed mode: any), sorted by `PLAN_MUSCLES` order
(`:432-433`). A muscle with no choice for the kit is not trained, and `evaluateFamily` adds no note or `limitedBy` entry for it.

Per-exercise and per-session constants used throughout: `exerciseCap(kind,
thin, { focus })` = 3 for `isolation` unless focus, else 4, plus
`SETS_PER_EXERCISE.thinEquipmentBonus` 2 when thin (`science.js:301-306`);
`exercisesAllowed(m, { focus })` = `EXERCISES_PER_MUSCLE_PER_SESSION[m]`
(chest, back, quads 3; side_delts, rear_delts, biceps, triceps, glutes,
calves, abs, hamstrings 2; front_delts, traps 1; others 1), plus 1 for a focus
muscle (`science.js:49-68`, `309-316`).

### 6.3 Sessions a week per muscle, `k` (`planner.js:440-472`)

For each trainable muscle (`:441-464`):

- `two` = peak at least 12 and n at least 4.
- `fullBodyBig` = the family key starts with `full_body` and m is in the big five (`FULL_BODY_TWICE` = quads, hamstrings, glutes, chest, back, `:68`).
- `bigTwice` = m in the big five (`BIG_MUSCLES`, `:72`), n at least 3, role not maintenance.
- `floorNeedsTwo` = not maintenance and directFloor above `min(8, exercisesAllowed(m) x 3)`.
- `start` = the division's `own` value when given and m is not focus, else 2 when any of the four is true, else 1.
- `k[m]` = fixed: the authored session count; else `min(allowed count, max(start, listed count when the family is a division, else 0))`.

So in a division family a muscle is trained in at least every session its list
names, capped by the allowed sessions.

Floors on `k` used by later steps (`:470-472`): `twiceAtLeast(m)` = not
fixed, not maintenance, at least 2 allowed sessions and `standardNeeds` at
least 2. `lowestK(m)` = `max(twiceAtLeast ? 2 : 1, division ? min(allowed
count, listed count) : 1)`.

State (`:473-475`): `k`, `lightCaps {}`, `forcedSplit {}`, `maxSlots {}`,
`sessionCaps {}`, `slowerCaps {}`, `standardCaps {}`, `roles`,
`placementOrder` = the authored order.

### 6.4 Which sessions train each muscle: `exposuresNow` (`planner.js:478-513`)

Muscles are placed in trainable order, each adding 1 to a running `cost` per
session it takes (`:485-486`). For muscle m with `k = state.k[m]`:

- If the listed sessions are at least k, or listed equals allowed: `placeInOrder(listed if at least k else allowed, k, placementOrder, i, cost)` (`:493-495`).
- Else: all listed sessions, then extra allowed sessions one at a time, each the one with the largest smallest cyclic distance (in `placementOrder`) to those already chosen, then the lowest running cost, then the lowest index (`:497-510`).

### 6.5 One build of the peak week: `run({ unlimited })` (`planner.js:519-581`)

1. Session caps (`:522-557`): start from `state.sessionCaps`; a focus muscle whose `k` equals its allowed count gets `PER_SESSION.focusDirectCap` 10 direct and `focusFractionalCap` 12 fractional, every other trainable muscle's entry is deleted; fixed mode raises the direct cap to what the authored exercises hold at their floors; each `standardCaps[m]` raises m's fractional cap; each `slowerCaps[m]` lowers m's direct cap.
2. `exposures = exposuresNow()` (`:558`).
3. `allocatePeakWeek` (`:559-573`) with `sessionLengthMinutes: Infinity` when `unlimited`, `gapAfter = gapAfterSessions(placementOrder, ownGaps || typical)` (`:570`, `:1017-1021`), `twiceFirst` = the big five only in a `full_body*` family (`:571`), `bigFirst` = the big five (`:572`).
4. `balanceSlots(alloc, roles, fixed, sessionCaps)` (`:574`, `:1140-1169`): each session's exercises are put in their final order (`orderSession`, section 6.6.7; fixed mode: authored order), then each muscle's sets in the session are re-split by `fillSession` (floors first, then the exercise with the most room, first on a tie, `prescribe.js:113-133`), unless the re-split would push a direct-trained credited muscle's fractional total in that session above its cap and above what it was (`:1155-1165`). The session's `minutes`, `overMinutes` and `overCeilings` were computed inside `allocatePeakWeek` before this re-split and are not recomputed (`:1167` updates only `workingSets`), so the reported minutes can differ slightly from the sets saved (trace: Upper B reported 76.0 minutes; recomputed after the re-split, 76.5).
5. Exposures that took no sets are removed (`:577-579`).

### 6.6 `allocatePeakWeek` (`src/lib/plan/allocate.js:133-548`)

#### 6.6.1 Time model (`allocate.js:46-96`, `142`, `226-241`)

- Rest by kind: `REST_BY_KIND` heavy_compound 180 s, mod_compound 150 s, machine 120 s, isolation 75 s (`:46-51`). The slot's `restSec` is `choice.restSec ?? REST_BY_KIND[kind] ?? 120` (`:286`); catalogue choices carry no `restSec`.
- `SET_SECONDS` 60 (`:52`); transition per exercise after the first: full_gym 120 s, machines_cables 90, home_gym 60, dumbbells_only 45, barbell_plates 75, bodyweight 30 (`:53-55`).
- Minutes = 7.5 + one per "compound" after the first, where a compound is a slot whose rest is at least 150 s, plus sets x 60 s, plus (sets minus 1) x rest per exercise, plus transitions (`:85-96`, `:230-231`). Because "compound" is read from the rest, a trimmed mod_compound (120 s) stops counting as a compound.
- Time limit = `sessionLengthMinutes + TIME_TOLERANCE_MINUTES` (5) (`:56`, `:142`); Infinity in an `unlimited` run.
- The strength rest (`STRENGTH_REST`, `exercise/prescription.js:79-84`) is not used here (P10).

#### 6.6.2 Which exercise fills a muscle's next slot (`allocate.js:149-205`, `276-294`)

- `thin(m)` = not fixed and the muscle has exactly one choice (`:149`); a thin slot's cap gains 2 and is marked `thinEquipment` (`:288-290`).
- `slotsAllowed(m, s)` = `min(exercisesAllowed(m, { focus }), maxSlots[m], choice count)` (`:152-156`).
- `slotChoice(m, s, slotIndex)` (`:171-205`): for a muscle trained in ONE session, compounds first then isolation lifts, in catalogue order (`:186-190`). Otherwise the first two choices alternate by the session's position among the muscle's exposures (`index = (order + slotIndex) % 2` for the first two slots, `:179-181`); and when the first choice is a compound and the second is not, the muscle's second and fourth exposures (`order % 2 === 1`) open with the next compound on the list after the first two, then the second choice, then the first (`:196-203`). Slot index 2 and above take choice 2 and above in order.

#### 6.6.3 Limits checked for every placement: `fits` (`allocate.js:245-262`)

Always checked: the muscle's direct sets in the session within its direct cap
(the light cap when one applies, `:157-161`); its fractional sets within its
fractional cap (`:162`); every credited muscle that is trained directly stays
within ITS fractional cap in that session (`:249-253`). A credited muscle
held on indirect work (maintenance, `direct: false`) has no cap here.

Checked only when `ignoreTime` is false: working sets at most
`SESSION_CEILINGS.workingSets` 25, exercises at most `SESSION_CEILINGS.exercises`
8 (D45), minutes within the time limit (`:258-260`; `science.js:71-74`).

#### 6.6.4 The steps, in order

**Step 1, opening exercises (`allocate.js:307-368`).** Every muscle's
sessions are queued (`:307-308`).

- `placeRound(muscles, 0, ignoreTime = true)` (`:360`): every muscle, in plan muscle order, opens one exercise at `SETS_PER_EXERCISE.floor` 2 sets in its least-loaded queued session (fewest exercises, then fewest working sets, `:313-319`). If even 2 sets do not fit the caps of 6.6.3, `limitedBy[m] = 'floor_did_not_fit'` (`:323-327`).
- Full-body families only: the big five (not focus) open their remaining sessions (`:366`), `ignoreTime = true`.
- Focus muscles open their remaining sessions (`:367`), `ignoreTime = true`.
- Rounds after round 0 go to the muscle furthest below its growth floor first (`behind`, `:333-342`).
- Fixed mode instead opens every authored exercise at 2 sets without any check (`:343-356`).

**Step 2, maintenance muscles trained directly (`allocate.js:370-378`).** Up
to their peak, time and ceilings respected. Only fixed mode produces a
maintenance muscle with `direct: true` (`planner.js:382-395`); in a generated
plan this step has no member.

**Step 3, floors (`allocate.js:397-481`).** Five floor steps run in order.
In each, the loop repeatedly takes the best single placement among the
step's members until none is possible (`:454-481`). A member stops when it
reaches its level, or (fractional steps only) when one more set would pass its
peak (`:468`). The best placement is chosen by the key `[floor(progress x 10),
-focus shortfall closed, -weighted standard shortfall closed, progress, role
rank, muscle order, session]` (`:471-474`), where "closed" counts the credits
a set gives other muscles towards their floors (`closes`, `:399-416`). A set
on an existing exercise is tried before opening a new one (`:461`, `allowOpening`
false then true).

| # | Members | Level | Opens new exercises | Ignores time and D45 | Lines |
|---|---|---|---|---|---|
| a | every growing muscle | `min(4, floor)` fractional (`ROLE_TARGETS.maintenance.target` 4) | no | no | `:418` |
| b | focus muscles | growth floor `min(20, peak)` fractional | yes | yes | `:422` |
| c | big five not focus; first opens their remaining sessions (`placeRemaining(opens, true)`, `:457`) | `min(growthFloor, peak)` fractional | yes | yes | `:434-438` |
| d | every other standard muscle; first opens their remaining sessions | `min(growthFloor, peak)` fractional | yes | yes | `:439-443` |
| e | every growing muscle | `min(directFloor, peak)` in DIRECT sets; the peak check is skipped | yes | yes | `:451-453`, `:468` |

**Step 4, the greedy (`allocate.js:484-498`).** Repeatedly, for every
growing muscle below its peak by at least one set, `bestStepFor` (time and
ceilings respected) is valued by `stepValue` (`:591-605`): for the muscle and
each credited muscle, `credit x weight x OBJECTIVE.marginalCoefficient 0.84 /
sqrt(max(W, 1))`, zero for a maintenance muscle, a weight-0 muscle or a
credit that would pass the credited muscle's peak. The step with the highest
value wins, then role rank, muscle order, session, existing exercise before a
new one (`:493`). A step of value 0 is still taken when it is the best
available; the loop stops only when no muscle has a fitting step.

`bestStepFor` (`allocate.js:554-588`): for each of the muscle's sessions, a
set on the existing exercise with the most room under its cap; else, when
allowed and the session holds fewer of the muscle's exercises than allowed,
a new exercise at 2 sets. Among sessions: fewer of the muscle's sets first,
then an existing exercise before a new one, then (for a new one) the session
with fewer exercises, then the session followed by the longer gap
(`gapAfter`), then the lower index (`:584`).

**After step 4.** `limitedBy[m] = 'limits'` for a growing muscle still at
least one set below its peak and not already marked (`:501-504`).

**Rest ladder (`allocate.js:510-530`; `REST_LADDER` `:66-72`).** A session
over `sessionLengthMinutes + 5` trims rest rung by rung, stopping at the first
rung that fits:

| Rung | Kinds | Applies to | New rest |
|---|---|---|---|
| `small_isolation` | isolation | small muscles (`SMALL_MUSCLES`, `:73`) that are not focus | 60 s |
| `isolation` | isolation | all | 60 s |
| `machine` | machine | all | 90 s |
| `mod_compound` | mod_compound | all | 120 s |
| `heavy_compound` | heavy_compound | all | 150 s |

What is still over after the last rung is reported (`overMinutes`), not cut
(`:538`). `overCeilings` is true when a session has more than 8 exercises or
more than 25 working sets (`:540-541`). In an `unlimited` run no rest is
trimmed (`:512`).

#### 6.6.5 Output

`{ sessions: [{ slots (sets above 0), minutes (one decimal), overMinutes,
restRung, overCeilings, workingSets }], weekly: { m: { direct, fractional } },
limitedBy }` (`allocate.js:532-547`). Credits are added to `weekly` by
`addCredit` (`:211-225`) without any check against the credited muscle's own
peak.

#### 6.6.6 Peak

A muscle's own sets stop at its peak (`:468`, `:489`), but credits from other
muscles' sets are added after that check, so a muscle's fractional total can
end above its role's peak (observed: biceps 24 against a focus peak of 22,
section 10.4; P4).

#### 6.6.7 Exercise order inside a session (`sessionOrder.js:27-58`)

Sort keys, in order: focus muscle first (`:39`); non-isolation before
isolation (`:42`); kind rank heavy_compound 0, mod_compound 1, machine 2,
isolation 3, unknown 2 (`:20`, `:43-45`); role weight descending (`:48`);
plan muscle order (`:51`); `choiceIndex` (`:54`); original index.

### 6.7 The session-count search (`planner.js:661-712`)

1. First build without the session length: `run({ unlimited: true })` (`:661`).
2. Up to `4 x trainable count` iterations (none in fixed mode, `:677`). Each iteration builds a move list:
   - **raises** (`:679-690`): m with k below its allowed count and at least one set below its peak, AND (one of its sessions at its cap, or below its floor with `limitedBy` `'limits'`, or below its direct floor). In a division family a raise beyond the listed count is allowed only for a muscle below its direct floor (`:688`). Sorted by largest floor gap.
   - **lowers** (`:691-693`): m with k above `lowestK(m)` that sits in a "crowded" session: one at 8 or more exercises where a growing muscle below its floor could take another exercise (`crowdedSessions`, `:1067-1081`).
   - Moves already rejected at the same k are skipped (`:694-695`).
3. Each move is tried with `run({ unlimited: true })` and kept only if every trainable muscle still has an exercise (`covered`, `:662`) and the result `improves` (`:669-674`): a lower `floorShortfall` vector, compared element by element, else a higher objective `sum(weight x sqrt(fractional))` over non-maintenance muscles (`:663-667`). The first kept move clears the rejected set and starts a new iteration; if none is kept the search ends (`:696-711`).
4. `floorShortfall` (`:1031-1055`) = `[maintenance, focus, direct, big, standard]`: shortfall below `min(2, floor)`; focus shortfall below its floor; direct-set shortfall below each growing muscle's directFloor; weighted shortfall of the big five; weighted shortfall of other standard muscles.

### 6.8 Standard floor through the fractional cap (`planner.js:717-733`)

Up to 8 rounds (none in fixed mode): every growing muscle below its direct
floor raises its own `standardCaps` (fractional cap) by one, and so does every
direct-trained muscle its choices credit (`:721-731`); then `run({ unlimited:
true })` (`:732`).

Then the plan is built with the person's session length: `run()` (`:734`).

### 6.9 Order and the light and heavy split (`planner.js:736-764`; `rotation.js`)

- `layouts = spacingLayouts(n, typical, ownGaps)` (`rotation.js:50-60`): back to back (`ROTATION.backToBackSlotHours` 24 each), typical (`TYPICAL_WEEK_GAP_HOURS[n]`, or 168/n), even (168/n), and own (when every own gap is finite and positive). `usual` = own, else typical (`planner.js:737`).
- `TYPICAL_WEEK_GAP_HOURS` (`recovery/constants.js:689-697`): 2: [72, 96]; 3: [48, 48, 72]; 4: [24, 48, 24, 72]; 5: [24, 24, 24, 24, 72]; 6: [24, 24, 24, 24, 24, 48]. Entry p is the hours from position p to p+1; the last is the wrap.
- `hoursPeak(m, sets)` = population clock at `lowestRir` 1 (`planner.js:739`).
- `orderFor(alloc)` = `bestOrder({ loads, layouts, hoursFor: hoursPeak, accept: holds })` (`planner.js:745`; `rotation.js:200-213`): every permutation (`rotation.js:176-192`, lexicographic, identity first), scored by `prepareRotation` (`rotation.js:101-167`), lowest total wins, the earlier permutation on a tie (`TIE` 1e-9); if no permutation passes `accept`, the lowest total of all is returned with `accepted: false`.
- The score: for each muscle and each session that trains it (`trains`: direct at least `EXPOSURE.minDirect` 2 or fractional at least `EXPOSURE.minFractional` 6, `rotation.js:36-40`; `science.js:169-172`), `T90 = 0.895 x hours(m, dose)` with dose = the session's fractional sets for m (`rotation.js:116-117`); for each scenario `short = max(0, 1 - (H - 1) / T90)` where H is the hours to the muscle's next session (wrap included; `ROTATION.sessionHours` 1 is taken off) (`:149-151`); the term is `sum(a_scenario x short^2)` weighted by the NEXT exposure's `w = clamp(F / 6, 0.25, 2)` (`:67-70`, `:153`). Scenario weights without own gaps: back to back 0.5, typical 0.35, even 0.15; with own gaps 0.25, 0.15, 0.10, own 0.5 (`science.js:185-186`; `rotation.js:63-65`, `104`).
- Plus the clash term (`rotation.js:73-86`, `158-164`): for every cyclically adjacent pair of sessions, with overlap = shared direct sets (muscles with at least 2 direct sets in both, the smaller count) over the smaller session's such sets, `1000 x (1 + overlap - 0.5)` when overlap is above 0.5. `CLASH_BASE` 1000 (`:28`) against recovery terms of order 1 means the clash term decides the order whenever any adjacency clashes (P6).
- `holds(order)` (`planner.js:744`): every split muscle's longest gap follows a heavy exposure, ties allowed (`heavyBeforeLongestGap`, `:292-309`).

Sequence:

1. `order = orderFor(alloc)` (`:751`).
2. Up to 2 passes (`:752-757`): if the order differs from `placementOrder`, set `placementOrder = order`, `run()`, and `order = orderFor(alloc)` again. (The exposures are re-spaced in the new cycle.)
3. Up to 2 passes (`:758-764`): `split = sparingFocus(lightCapsFor(exposures, order, usual, hoursPeak, trainable, ownSessionFor))`; if it equals the current light caps, stop; else set them, `run()`, `order = orderFor(alloc)`.

`lightCapsForMuscle(m, exposures, order, usual, hoursPeak, force, ownSession)`
(`planner.js:1197-1233`): only for a muscle with 2 or more exposures. Each
exposure's following gap is `sum(usual over the positions to the next
exposure) - ROTATION.sessionHours`. The heavy exposure is the one followed by
the longest gap (the first on a tie), except that in a division family the
session whose list names the muscle earliest (`ownSessionFor`, `:584-593`;
on a tie in list position, the earlier session) is the heavy one regardless
of its gap (`:1217-1220`). Every other exposure whose gap is below
`0.895 x hoursPeak(m, HEAVY_LIGHT.heavyDirectHigh 8)` (or every other one when
`force`) gets a light cap: the largest d from `HEAVY_LIGHT.lightDirectHigh` 4
down to `lightDirectLow` 2 with `0.895 x hoursPeak(m, d)` within the gap,
and 2 when no d clears (`:1221-1231`; `science.js:176-181`).

`sparingFocus` (`:641-643`) keeps a muscle's light caps only if
`keepsFocusFloor` (`:618-625`): the summed room over its exposures (each
`min(light cap, sessionRoom)`, `sessionRoom` = `min(direct cap, the first
slotsAllowed choices' exercise caps summed)`, `:594-606`) is at least the
directFloor, and for a focus muscle at least its growth floor.

The light caps are recomputed only in these two passes and in `resplit` after
a readiness fix changes k. The readiness step (6.10) can still change the
order afterwards without recomputing them (P3).

### 6.10 The block and the readiness check (`planner.js:766-797`; `readiness.js`; recovery model)

`settle()` (`:772-784`), up to `SETTLE_TRIES` 3 times (`:1109`):

1. `block = buildBlock(alloc, exposures, n, ctx, sessionCaps, order)` (section 7.1).
2. `best = readinessOrder(block, alloc, layouts, usual, hoursPeak, hoursVolume, loadsOf, holds)`, or without `holds` if none passes it (`:775-776`). `readinessOrder` (`:1110-1126`): all permutations accepted by `holds`, sorted by rotation penalty (ties to the earlier permutation); of the cheapest `READINESS_ORDER_TRIES` 8 (`:1106`), the first whose simulation passes, else the one with the smallest `readinessDeficit` (strictly smaller wins, so the cheaper on a tie).
3. `order = best.order`, `sim = best.sim`; stop when the order did not change. After 3 tries the block is rebuilt in the last order and simulated (`:782-783`).

`simulateBlock({ order, weekLoads, rirLadder, layout, hoursFor })`
(`readiness.js:42-74`): sessions run in order for every week of the block,
starting at hour 0, session p starting `layout[p]` hours after p-1. At the
start of each session, every muscle the session trains (`trains`, 6.9) is read
as `recoveredFractionAt(past sessions within LOOKBACK_DAYS 14 days, now)`;
recovered when at least `RECOVERED_FRACTION` 0.895 (`readiness.js:30`,
`57-59`). Each session then adds, for every muscle with fractional sets above
0, `{ endMs: start + 1 h, sets: fractional, hoursT: hoursFor(m, sets, rir of
the week) }` (`:62-68`). `passes` = no failing reading.

The recovery model (`recovery/muscleRecoveryModel.js`):
`recoveredFractionAt = clamp(0, 1, 1 - residual(now) / peakResidual)`
(`:321-325`), `residual = sum(F x max(0, 1 - (t - end) / T))` with
`F = clamp(0.25, 2, sets / 6)` (`:222-253`), and `peakResidual` = the residual
at the end of the last contributing session, at least 0.25 (`:304-307`).

The clock `recoveryHours(m, { sets, rirTarget, recoveryRating,
personalFactor })` (`recovery/constants.js:594-604`, `639-663`) = `BASE_RECOVERY_HOURS[m]
x doseFactor(sets) x speed x intensityFactor(rir)`, clamped to 24 to 168 h,
where:

- `BASE_RECOVERY_HOURS` (`:111-144`): quads 54, hamstrings 60, glutes 54, adductors 60, back 60, chest 60, triceps 48, biceps 48, side_delts 48, front_delts 48, rear_delts 48, traps 48, forearms 36, calves 36, abs 36, neck 36, tibialis 36.
- `doseFactor = clamp(0.7, 1.5, sqrt(sets / 6))` (`:153-157`, `471-475`); the planner passes FRACTIONAL sets.
- `speed` = the learned factor clamped to 0.75 to 1.4 when given, else `RATING_FACTOR` poor 1.15, average 1.0, good 0.9 (`:160`, `629-636`).
- `intensityFactor`: RIR at most 0 gives 1.25, at most 1 gives 1.10, below 3 gives 1.0, 3 or more gives 0.8 (`:494-505`). With the ladder [3, 2, 2, 1, 1, 4] that is 0.8, 1.0, 1.0, 1.1, 1.1, 0.8 by week.
- Novelty, long-length, indirect and feedback factors are neutral in the planner's calls (not passed).

`readinessDeficit(sim)` = sum over failing readings of `0.895 - fraction`
(`planner.js:1089-1091`).

### 6.11 Readiness fixes (`planner.js:819-888`)

Up to `MAX_FIX_ROUNDS` 8 rounds (`:73`) while the simulation fails. Each
round takes the two worst failing trainable muscles (`worstByMuscle`: each
muscle's lowest reading, lowest first, `:1094-1098`) and, for each, tries in
order:

| Attempt | Offered when | Action | Lines |
|---|---|---|---|
| `split` | not tried for m and k at least 2 | `lightCapsForMuscle(..., force = true, ownSession)`; acts only if the caps exist and `keepsFocusFloor` holds; sets `forcedSplit[m]` | `:825`, `835-842` |
| `extra_session` | not fixed, not tried, k below the allowed count | k + 1 and `resplit(m)` | `:827`, `843-847`, `787-792` |
| `fewer_sessions` | not fixed; acts only if m fails on the population clocks, not tried, and k above `lowestK(m)` | k - 1 and `resplit(m)` | `:828`, `849-857` |
| `peak_lowered` | always offered; acts only if m fails and `floor(W) - 1` is at least its growth floor | `peak = floor(W) - 1`, where W is the muscle's fractional total with credits, so the "lowered" peak can be ABOVE the role's peak (trace: biceps 22 became 23) | `:829`, `858-862` |

After an action, `rebuild()` = `run()` then `settle()` (`:793-796`, `866`).
The fix is kept only if m's fractional total stays at least `min(growth
floor, its total before)`, every trainable muscle's direct total stays at
least `min(directFloor, its total before)`, AND the readiness deficit fell
(`:870-873`). A kept fix is noted `{ muscle, kind, peak }` and starts the next
round; otherwise the state is restored (`snapshot`/`restore`, `:801-810`,
`878`). A round with no kept fix ends the loop (`:882`). Still failing: a
`promise_limited` note per failing muscle with its lowest reading (`:884-888`).

### 6.12 Ramp (`planner.js:893-908`)

Runs only when `ctx.loggedWeekly` is truthy and not fixed (`:893`). Up to 3
passes: a muscle whose week-1 fractional sets exceed `logged + RAMP.maxAboveLogged`
(3), or, for a muscle absent from `loggedWeekly`, `(ROLE_TARGETS.standard.peakMax
20 - BLOCK.week1BelowPeak 8) + RAMP.maxAboveStandardStartNoHistory 4` = 16, and
that holds more than one exercise in some session, gets `maxSlots[m]` = that
most minus one; then `rebuild()`; noted `ramped` (`:895-907`; `science.js:147-151`).
`planAutoGen.plannerV2LoggedWeekly` returns `null` for a person with no
training in the last 4 weeks, so for them the ramp does not run at all,
although the comment at `planAutoGen.js:1695-1697` says the planner then ramps
from its no-history limit (P9).

### 6.13 Slower-recoverer cap (`planner.js:916-944`)

Only when not fixed and the clamped learned factor is above 1. `cap = max(
LEARNED_FACTOR.slowerDirectCapFloor 6, floor(8 x min(1, 1/factor)))`
(`:917`). Candidates: trainable muscles with at least 2 exposures. All
candidates capped at once; if any muscle loses fractional sets or an exercise
count changes, each candidate is tried alone and kept only if nothing is lost
(`:926-935`). Kept: `settle()`; else restored (`:936-942`).

### 6.14 Standard floor, last (`planner.js:952-975`)

Up to 8 rounds (not fixed): a growing muscle below its direct floor first loses
its light caps and forced split; if it has none, its `standardCaps` and those
of every direct-trained muscle its choices credit rise by one; then
`rebuild()`.

### 6.15 What the family reports (`planner.js:977-1002`)

`penalty` = the rotation penalty's recovery part only (`finalScore.recovery`,
`:977`, `996`); `objective` = `sum(weight x 1.68 x sqrt(fractional))` from a
final `run({ unlimited: true })` (`:988-993`); `builtObjective` from the plan
as built; `floorShortfall` from the unlimited run (`:999`); `readinessPasses`,
`readinessDeficit`.

### 6.16 `chooseFamily` (`planner.js:1318-1336`)

1. Pool = families whose `floorShortfall` is all zero; if none, the single family with the smallest vector (element-wise, earlier index on a tie) (`:1319-1324`).
2. If any family in the pool passes readiness, keep only those; else keep those within `ROTATION.familyPenaltyTolerance` 0.05 of the smallest deficit (`:1325-1331`).
3. Keep those within 0.05 of the smallest recovery penalty (`:1332-1333`).
4. Sort by structural objective (higher first), then `recognisable` (lower first), then authored index (`:1334`).

### 6.17 `personalise` (`planner.js:263-285`)

Only when `ctx.personal`. Finds the order with the person's own clocks
(`readinessOrder` with `hoursPerson`, under `heavyBeforeLongestGap`); if it
differs, rebuilds the block in that order (`buildBlock` with the same
allocation) and keeps it only if the deficit on the person's clocks is
strictly lower. No set count changes; `sim`/`readinessPasses` are read with the
person's clocks.

### 6.18 `recoverySafeMax` (`planner.js:178-255`)

For each muscle with a target (sorted), starting at its planned peak: unless
it already fails on the population clocks, or is maintenance, raise its
target for weeks 1 to 5 to X (peak + 1 up to peak + `SAFE_MAX_SEARCH` 12),
re-prescribe and simulate; stop when no extra set is placed in week 5 or a
new muscle fails (`:191-210`). Then all maxima together: while a muscle not
failing at the plan fails, or a raised muscle has a prescribe shortfall, the
failing muscle and the muscles whose exercises credit it give back one set
above their peaks; after 48 iterations, or when nothing can give, every muscle
returns to its peak (`:240-253`). Written into the plan facts
(`planAutoGen.js:1373-1374`), not into the weekly rows' `mrv` that the comment
at `planner.js:163-167` describes (P12).

---

## 7. The block

### 7.1 `buildBlock` (`planner.js:1255-1310`)

- Block sessions keep the allocation's sessions and slot order; each slot gets id `s<si>x<xi>`, `baseSets` = 2, `credits`, `thinEquipment`, `focus` (`:1256-1267`).
- `peakByMuscle[m]` = the allocation's direct sets for m (`:1268-1276`).
- `exposureShares[m][sid]` = that session's share of m's peak direct sets, stored only for a muscle in more than one session (`:1277-1283`).
- `targets[m] = blockTargets({ peak: peakByMuscle[m], floors: 2 x m's slot count, maintenance: 0 })` (`:1284-1288`). No `seededStart` is passed.
- For each of `BLOCK.weeks` 6 weeks: `prescribeWeek({ sessions in rotation order, weekTargets, facts: { exposureShares, sessionCaps } })`; the loads are stored by session index (`:1293-1304`).
- `week1Fractional` (`:1305-1308`).

### 7.2 `blockTargets` (`targets.js:30-52`)

- `top = max(round(peak), round(floors))`.
- `start = max(floors, top - BLOCK.week1BelowPeak 8)` (a `seededStart` would be clamped to at least `max(floors, top - 8)` and at most `top`, `:35-37`; the planner never passes one).
- Weeks 1 to 5: `start + round((top - start) x i / 4)` for i = 0..4, then any step above `ROLE_TARGETS.focus.maxClimb` 3 is cut to 3 (`:45-48`). Since `top - start` is at most 8 the step is at most 2 before rounding.
- Week 6: `min(top, max(round(maintenance), round(top x BLOCK.recoveryWeekShare 0.5)))` (`:49-50`). `Math.round` rounds a half up.

Targets are direct sets.

### 7.3 `prescribeWeek` (`prescribe.js:149-259`)

Per muscle, in sorted order:

1. `D` = this week's target minus sets the person typed (`:182-185`).
2. The muscle's sessions (with a free slot, in rotation order) get caps: `min(direct cap from facts or 8, sum of exercise caps)` (`:198-205`).
3. Shares: `splitByWeights(D, weights)` (largest remainder, earlier on a tie, `:90-105`); weights are the stored `exposureShares` when they name these sessions, else the slots' `baseSets` (`sessionWeights`, `:312-325`).
4. Each share capped; the excess goes one set at a time to the session with the largest weight that has room (`:212-223`); what is left is `shortfall`.
5. If the week covers every exercise's 2-set floor, a session below its floors takes sets from the session with the most above its floors (`:230-243`).
6. Inside a session `fillSession` (2-set floor, or 1 when the week cannot cover 2 for every exercise; then the exercise with the most room) (`:246-251`, `113-133`).
7. `keepCreditedCaps` (`:270-299`): where a crediting exercise pushes a credited muscle past its fractional cap in that session, sets move within the session to the muscle's exercises that do not credit it.
8. `rebalanceFractional` (`:359-422`): a session over a muscle's fractional cap gives the excess to the muscle's other sessions with room, or moves a crediting set elsewhere (`moveCreditingSet`, `:431-473`), else counts it as shortfall.

### 7.4 RIR ladder, rep ranges, rest

- `BLOCK.rirLadder` [3, 2, 2, 1, 1, 4] (`science.js:140`) is stored on every new block (`database.js:34`, `5696-5705`) and written per week by `generateMesocycleWeeks` (`database.js:6079-6123`, `rir_target = rirLadder[i]`). `activatePlanKeepingBlock` keeps the running block's ladder (`database.js:5787-5795`). The planner reads it for the readiness simulation and `lowestRir` and copies it into the facts (`planner.js:142`, `1313`, `1438`).
- Rep ranges (`exercise/prescription.js:54-67`, `125-133`): hypertrophy heavy_compound 6 to 10, mod_compound 8 to 12, machine 8 to 15, isolation 10 to 20; strength (`isStrength`) 4 to 6, 5 to 8, 8 to 12, 10 to 15. The deadlift family overrides to 5 to 8 outside strength (`:101-112`); none of the catalogue's names is in that family.
- Rest (`prescription.js:72-84`, `136-139`): hypertrophy 180, 150, 120, 75 s; strength 210, 180, 120, 75 s. `toPlan` writes the trimmed rest when the rest ladder trimmed the slot, else `restFor(kind, isStrength)` (`planner.js:1389`).

---

## 8. The output and what is saved

### 8.1 `toPlan` (`planner.js:1363-1453`)

| Field | Value |
|---|---|
| `name` | `"<family label> <n>×/week"` (`:1418`), for example "V-Taper 4×/week" |
| `goal` | `inputs.goal` |
| `splitType` | the family key (`division_<goal>_<n>` for a division) |
| `daysPerWeek` | n |
| `estimatedSessionMinutes` | `max(sessionLengthMinutes, ceil(longest session's minutes))` (`:1424`) |
| `workouts` | in rotation order; name lettered by rotation for names ending " A"/" B" when a kind repeats (`letteredInOrder`, `:1346-1361`); `sessionKey` `s<index>`; exercises `{ name, muscle, kind, sets (week 1), peakSets, repMin, repMax, restSec, selectionReason 'catalogue' or 'authored', reason, thinEquipment, slotKey, exerciseId (fixed mode) }` |
| `weeklyVolumeSummary` | per muscle `{ direct, fractional }` at the peak, plus `plannedSets` = week 1 direct sets where the muscle has an exercise (`:1409-1414`) |
| `v2` | `version 2`, `family`, `order`, `roles` (role names), `weeklyTargets`, `exposureShares`, `sessionCaps`, `lightCaps` (keyed `s<i>`), `gapRanks` (0 = longest following gap at `ownGaps || typical`), `builtFactor`, `rirLadder`, `readiness { passes, lowest per muscle }`, `notes`, `limitedBy`, `recoverySafeMax`, `sessionMinutesAtPeak` (by session index), `overTime` (sessions more than 5 minutes over), `overCeilings` (`:1427-1451`) |

### 8.2 What `saveWithPlannerV2` writes (`planAutoGen.js:1889-2060`)

Before any write: kept exercises, the planner, the continuity and resolution
pass, the zero-match guard (`:1895-1939`). Then:

1. `AsyncStorage` `@volyume_plan_whythis_<userId>` = `{}` (`:1943-1945`).
2. Plan name via `makeUniquePlanName` (adds ", <day> <Mon>" then a time when the name exists, `:77-97`).
3. One transaction (`:1954-2003`):
   - `createProgramme(userId, planName, plan.description ?? '', 0, null, null, null, false)`; `toPlan` sets no `description`, so it is `''`.
   - Per resolved workout, in rotation order: `createRoutine(userId, workout.name, null, plan.splitType, 0, null, programmeId, false, false)`; position = rotation position.
   - Per exercise: `addExerciseToRoutine(routineId, exerciseId, position, repMin, repMax, notes null, sets = week 1, startingWeight null, restSec, superset null, false, selectionReason)`. `selectionReason` is `coverage_fallback` for a thin-kit choice, else `required_role` (`plannerV2SelectionReason`, `:1281-1285`).
   - `setProgrammePlanFacts(programmeId, plannerV2PlanFacts(...), { scheduleSync: false })` (`:1997-2001`; `database.js:4956-4965`, column `programmes.plan_facts`). The facts (`:1342-1376`): `version, family, roles, weeklyTargets, exposureShares, sessionCaps, lightCaps, gapRanks` (session keys replaced by routine ids), `thin` (routine id to library ids of thin-equipment slots), `slots` (routine id to exercise id to `{ muscle, kind, credits }`; first slot only when an exercise repeats in a session), `builtFactor, rirLadder, readiness, notes, limitedBy, sessionMinutesAtPeak, overTime, overCeilings, recoverySafeMax` (finite, non-negative values only). `v2.order` is not stored; the routine positions carry it.
4. Activation: with `keepBlock`, `activatePlanKeepingBlock` (no mesocycle write); otherwise, or with no block to keep, `activatePlanWithBlock(userId, programmeId, planName, { ledger, allowLearnedCarry })` (`:2011-2020`), which inserts a 6-week mesocycle (`BLOCK_PLANNED_WEEKS` 6, deload week 6, `mesocycle.js:28-29`) with `rir_ladder` [3, 2, 2, 1, 1, 4], creates its weeks, and seeds `planned_muscle_volume` for all 17 `VOLUME_LANDMARKS` muscles with the template ramp (`mev` to `mav` over the accumulation weeks, `mev` in the deload week) or a ledger seed (`database.js:5600-5771`, `6268-6374`; `algorithms.js:28-62`).
5. `writePlannerV2WeeklyRows` (`:1827-1867`): for each week from week 1 (or the current week when the block was kept), for each muscle in `weeklyTargets` that has a `VOLUME_LANDMARKS` entry, `upsertPlannedMuscleVolume({ plannedSets: target, mev, mav, mrv from VOLUME_LANDMARKS, source: 'template' })`. The upsert updates only `planned_sets`, `source` and `updated_at` on conflict (`database.js:6825-6836`), and the rows already exist from step 4, so `mev`, `mav` and `mrv` keep the values step 4 wrote. Muscles not in `weeklyTargets` keep step 4's template or seeded rows (P11). A failure here is logged and the plan stays active.
6. `archiveOtherUserPlans(userId, programmeId)` (`:2024`); `trackFirst('first_plan_generated')`.
7. Result: `{ ok: true, programmeId, blockKept, continuity: { isRebuild, decisions, summary }, partial?, missedCount?, missedExercises? }` plus blocked-slot fields (`:2030-2048`). A write failure deletes the programme and returns `{ ok: false, error }` (`:2049-2059`).

The `weeklyVolumeSummary` handed to readers is reshaped by
`plannerV2LegacySummary` (`:1407-1428`) into the 11 legacy buckets (the three
delt heads summed into `shoulders`, with `heads` nested; forearms and
adductors dropped), `isWeakPoint` set for the focus muscles' buckets. This
summary is returned on the plan object; the save does not store it.

---

## 9. What the planner prioritises, in order

Derived from the code paths above. Each line says what wins when two aims
conflict and where the code decides it.

1. **The day count and the beginner clamp.** 2 to 6 sessions, a beginner at most 4; nothing later changes n (`planner.js:311-316`).
2. **The division's structure.** A division goal at 3 to 6 days has exactly one candidate structure, its matrix list (`planner.js:112-113`). Every muscle trains in at least every session its list names (`planner.js:462-463`), and readiness fixes cannot go below that (`lowestK`, `:472`; `fewer_sessions`, `:853`). A session beyond the list is added only to reach a direct floor, never for growth (`:688`).
3. **Per-exercise caps and per-muscle-per-session caps.** 3 or 4 sets an exercise (+2 thin), 8 direct and 11 fractional per muscle per session (10 and 12 for a focus muscle that cannot get another session), and a direct-trained credited muscle's fractional cap. These bind every placement, floors included (`allocate.js:245-253`; caps set at `planner.js:522-557`; served by `prescribe.js:198-205`). Only fixed mode opens authored exercises above them (`allocate.js:343-356`). The standard floor can raise a muscle's fractional cap (`planner.js:717-733`, `966-972`).
4. **Every trained muscle gets at least one exercise**, placed before anything else and regardless of time and D45 (`allocate.js:360`).
5. **Floors, in this order, all past the session length and D45 ceilings:** focus muscles' remaining sessions (`allocate.js:367`); the focus growth floor 20 (`allocate.js:422`); the big five's sessions and growth floor 10 (`allocate.js:434-438`); every other standard muscle's sessions and growth floor (`allocate.js:439-443`); every growing muscle's direct floor (`allocate.js:451-453`). Before these, a time-respecting pass brings every growing muscle to 4 fractional sets on its existing exercises (`allocate.js:418`).
6. **Structure search by floor shortfall:** maintenance-band shortfall, then focus, then direct floors, then big five, then other standard muscles; then growth (`planner.js:669-674`, `1031-1055`).
7. **Session length and the D45 ceilings (8 exercises, 25 working sets).** They bind only the time-respecting maintenance pass and the greedy growth above the floors (`allocate.js:258-260`, `418`, `484-498`). When a session still runs over, rest is trimmed down the ladder; whatever remains is reported (`overMinutes`, `overCeilings`), never cut (`allocate.js:510-541`).
8. **Growth above the floors, by marginal value with role weights** (focus 1.5, division overlay up to 1.5, standard 1.0, de-emphasised 0), up to each muscle's peak (`allocate.js:484-498`, `591-605`). Credits from other muscles are not limited by the credited muscle's peak (`allocate.js:211-225`).
9. **Order of sessions:** the clash term (near-identical neighbours) first in practice, then predicted recovery shortfall across back-to-back, typical and even spacings (`rotation.js:101-167`); then, among the 8 cheapest orders, the readiness deficit (`planner.js:1110-1126`).
10. **Light and heavy split** for a muscle that cannot clear a full dose before its next session, but never below a focus muscle's growth floor or any muscle's direct floor (`planner.js:618-625`, `641-643`), and in a division with the muscle's "own day" heavy regardless of its gap (`:1217-1220`).
11. **The readiness promise.** Fixed by structure first (split, extra session), then by volume (fewer sessions, a lower peak), each kept only if no growth floor or direct floor is lost and the deficit falls (`planner.js:819-883`). Otherwise reported as `promise_limited` (`:884-888`). Floors beat readiness.
12. **Ramp from logged history** (only with history), by dropping exercises (`planner.js:893-908`).
13. **Slower-recoverer cap**, only if no weekly total or exercise count changes (`planner.js:916-944`).
14. **The direct floor, restored last** over anything above (`planner.js:952-975`).
15. **Choice between families:** floors met, then readiness, then recovery penalty within 0.05, then structural growth, then recognisability, then authored order (`planner.js:1318-1336`).
16. **The person's own clocks** only re-order sessions, and only when that improves readiness on those clocks (`planner.js:263-285`).

---

## 10. Worked trace: mens_physique, 4 days, 60 minutes, full gym, intermediate, focus side delts and biceps

### 10.1 How it was produced

A temporary Jest test outside `src/` (in the session scratchpad, run with a
Jest config whose `rootDir` is the repo, `TZ=Europe/London`) required the
REAL modules, wrapped `allocatePeakWeek` and `rotation.bestOrder` with
recorders (the wrappers call the real functions and return their results
unchanged), and wrote every intermediate value to JSON. No repo file was
created or changed. The library is `LIBRARY` from
`src/lib/__tests__/campaign16.helpers.js` (the corpus built as the seed builds
it); `choices = resolveCatalogue({ library: LIBRARY, profile: 'full_gym',
loggedExerciseNames: [] })`; `divisionMatrix = DIVISION_MATRIX`.

Inputs passed to `buildPlan`: `daysPerWeek 4, sessionLengthMinutes 60,
equipment 'full_gym', goal 'mens_physique', experience 'intermediate',
focusMuscles ['side_delts', 'biceps'], addedMuscles [], isStrength false`.
Not stated in the brief, set to what `planAutoGen` passes a new person with a
profile lacking those fields: `nutritionPhase 'maintain'` (phase `maintain`),
`recoveryRating 'average'`, `firstBlock true`, `learnedFactor null`,
`ownGaps null`, `loggedWeekly null`. So `personalise`, the ramp and the
slower cap do not run.

Week-by-week sets in 10.9 were re-derived by calling `prescribeWeek` on the
plan's own sessions, targets, shares and caps, the way `buildBlock` does; the
re-derived week 1 equals the planner's `workouts[].sets` on all 35 exercises
(0 mismatches), and the re-simulated readiness equals `v2.readiness.lowest`.

### 10.2 Roles (`assignRoles`)

| Muscle | Role | Weight | Peak (fractional) | Growth floor | Direct floor | Direct | Why |
|---|---|---|---|---|---|---|---|
| chest | standard | 1.2 | 20 | 10 | 10 | yes | overlay 1.20 |
| back | standard | 1.3 | 20 | 10 | 12 | yes | overlay 1.30 |
| side_delts | focus | 1.5 | 22 | 20 | 10 | yes | focus; division floor 10 |
| rear_delts | standard | 1.25 | 20 | 10 | 6 | yes | overlay 1.25 |
| front_delts | standard | 1.1 | 20 | 10 | 4 | yes | overlay 1.10 judged; default floor 4 |
| traps | maintenance | 0 | 4 | 0 | 0 | no | overlay 0.70, not a growth muscle |
| biceps | focus | 1.5 | 22 | 20 | 8 | yes | focus |
| triceps | standard | 1.15 | 20 | 10 | 8 | yes | overlay 1.15 |
| forearms | maintenance | 0 | 4 | 0 | 0 | no | no overlay |
| quads | standard (de-emphasised) | 0 | 8 | 8 | 8 | yes | overlay 0.70: peak max(8, 6) |
| hamstrings | standard (de-emphasised) | 0 | 6 | 6 | 6 | yes | overlay 0.70 |
| glutes | standard (de-emphasised) | 0 | 6 | 4 | 4 | yes | overlay 0.60: peak max(4, 6), floor min(10, 4) |
| adductors | maintenance | 0 | 4 | 0 | 0 | no | no overlay |
| calves | standard (de-emphasised) | 0 | 8 | 8 | 8 | yes | overlay 0.65 |
| abs | standard (de-emphasised) | 0 | 8 | 8 | 8 | yes | overlay 0.60 |
| neck, tibialis | absent | | | | | | opt-in |

### 10.3 Choices per muscle (catalogue, full gym, no logged names)

| Muscle | Choices in order (kind; credits) |
|---|---|
| chest | Barbell Bench Press (heavy_compound; triceps 0.5, front_delts 0.5); Incline Dumbbell Press (mod_compound; same); Pec Deck (Machine Fly) (isolation) |
| back | Lat Pulldown (Wide Grip) (mod_compound; biceps 0.5, rear_delts 0.5); Seated Cable Row (mod_compound; biceps, rear_delts, traps 0.5); Lat Pulldown (Neutral Grip) (mod_compound; biceps 0.5) |
| side_delts | Dumbbell Lateral Raise (isolation); Cable Lateral Raise (isolation) |
| rear_delts | Reverse Pec Deck (isolation); Face Pull (isolation) |
| front_delts | Barbell Overhead Press (heavy_compound; triceps 0.5, side_delts 0.5) |
| traps | Dumbbell Shrug (isolation) |
| biceps | EZ Bar Preacher Curl, Barbell Curl, Hammer Curl (all isolation) |
| triceps | Cable Overhead Tricep Extension (isolation); Tricep Pushdown (Rope) (isolation); Close-Grip Bench Press (heavy_compound; chest 0.5, front_delts 0.5) |
| quads | Barbell Back Squat (heavy_compound; glutes 0.5, adductors 0.5); Leg Extension (isolation); Leg Press (machine; glutes, adductors 0.5); Walking Lunge (mod_compound; glutes 0.5) |
| hamstrings | Seated Leg Curl (isolation); Romanian Deadlift (Barbell) (heavy_compound; glutes 0.5) |
| glutes | Barbell Hip Thrust (heavy_compound; hamstrings 0.5); Machine Hip Thrust (machine; hamstrings 0.5); Glute Kickback Machine (isolation); Barbell Glute Bridge (heavy_compound; hamstrings 0.5) |
| calves | Standing Calf Raise (Machine); Seated Calf Raise; Leg Press Calf Raise (all isolation) |
| abs | Cable Crunch; Hanging Knee Raise (isolation) |
| forearms, adductors, neck, tibialis | one choice each (not trained: no direct role) |

No thin-kit fallback was used (full gym has none). Front delts has one choice,
so the allocator treats it as thin equipment (section 10.5).

### 10.4 Structure, sessions per muscle and exposures

Only family: `division_mens_physique_4`, sessions s0 Upper A (Width), s1 Legs
+ Abs, s2 Upper B (Detail), s3 Shoulders + Arms (section 5.2).

| Muscle | own (division sessions) | standardNeeds | listed | allowed | start | k | exposures |
|---|---|---|---|---|---|---|---|
| chest | none | 2 (peak 20, n 4) | s0, s2 | s0, s2 | 2 | 2 | s0, s2 |
| back | none | 2 | s0, s2 | s0, s2 | 2 | 2 | s0, s2 |
| side_delts | (focus) | 2 | s0, s2, s3 | s0, s2, s3 (focus: the lower day is not of its half) | 2 | 3 | s0, s2, s3 |
| rear_delts | none | 2 | s0, s2, s3 | s0, s2, s3 | 2 | 3 | s0, s2, s3 |
| front_delts | none | 2 | s3 | s0, s2, s3 (listed below 2, so its half is added) | 2 | 2 | s0, s3 |
| biceps | (focus) | 2 | s0, s2, s3 | s0, s2, s3 | 2 | 3 | s0, s2, s3 |
| triceps | none | 2 | s0, s2, s3 | s0, s2, s3 | 2 | 3 | s0, s2, s3 |
| quads | 1 | 1 | s1 | s1 | 1 | 1 | s1 |
| hamstrings | 1 | 1 | s1 | s1 | 1 | 1 | s1 |
| glutes | 1 | 1 | s1 | s1 | 1 | 1 | s1 |
| calves | 2 | 2 | s1, s2 | s1, s2 | 2 | 2 | s1, s2 |
| abs | none | 2 (direct floor 8 above one-session room 6) | s1, s3 | s1, s3 | 2 (floorNeedsTwo) | 2 | s1, s3 |

Front delts' second session: s0 and s2 are both one cyclic step from s3 and
both carried 4 muscles when front delts was placed, so the lower index s0 was
taken (`planner.js:503-508`).

Session caps in every run: side delts and biceps are focus muscles with k equal
to their allowed count, so `{ direct: 10, fractional: 12 }` (`planner.js:524-526`).

### 10.5 Allocation calls, in order (6 in total)

| # | Call site | Session length | Light caps | Peak changes | Result |
|---|---|---|---|---|---|
| 0 | `run({ unlimited: true })`, `planner.js:661` | Infinity | none | none | sets below (minutes 97.3, 90, 88.8, 76.5 with full rest) |
| 1 | `run()`, `:734` | 60 | none | none | IDENTICAL sets to call 0; rest trimmed to the last rung in all four sessions; minutes 87.5, 82.5, 80, 71.5 |
| 2 | light caps pass 1, `:762` | 60 | rear_delts s2: 2, biceps s2: 2, triceps s2: 2 | none | the final allocation (below) |
| 3 | readiness fix, side delts `peak_lowered`, `:866` | 60 | same | side delts peak 22 to 20 | unchanged allocation (side delts still 19 direct, 21.5 fractional); restored |
| 4 | readiness fix, biceps `peak_lowered` | 60 | same | biceps peak 22 to 23 | unchanged (biceps 18 direct, 24 fractional); restored |
| 5 | structural score, `:988` | Infinity | same | none | for the family's objective |

The session-count search made no trial: no raise was possible (every muscle
was at its allowed count or, for front delts, at its listed count without a
direct-floor shortfall, `planner.js:680`, `688`) and no session was "crowded"
because every growing muscle was at or above its floor (`:1074`). The
standard-cap loops found no muscle below its direct floor.

Final peak-week allocation (call 2), per session, in the session's final
exercise order, with the rest the ladder left:

| Session | Exercises (muscle: sets at peak, rest) | Working sets | Exercises | Minutes | Over by |
|---|---|---|---|---|---|
| s0 Upper A (Width) | side_delts DB Lateral Raise 4 (60 s); biceps EZ Bar Preacher Curl 4 (60); biceps Barbell Curl 4 (60); chest Barbell Bench Press 4 (150); front_delts Barbell Overhead Press 2 (150, thin); back Lat Pulldown (Wide Grip) 4 (120); back Seated Cable Row 4 (120); rear_delts Reverse Pec Deck 2 (60); triceps Cable Overhead Tricep Extension 3 (60) | 31 | 9 | 89.5 | 29.5 |
| s1 Legs + Abs | quads Barbell Back Squat 4 (150); hamstrings Romanian Deadlift (Barbell) 4 (150); glutes Barbell Hip Thrust 4 (150); quads Leg Press 4 (90); hamstrings Seated Leg Curl 2 (60); calves Standing Calf Raise (Machine) 3 (60); calves Seated Calf Raise 2 (60); abs Cable Crunch 3 (60) | 26 | 8 | 82.5 | 22.5 |
| s2 Upper B (Detail) | side_delts DB Lateral Raise 4; side_delts Cable Lateral Raise 4; biceps Barbell Curl 2; chest Barbell Bench Press 3; back Seated Cable Row 4; chest Incline Dumbbell Press 3; rear_delts Face Pull 2; triceps Tricep Pushdown (Rope) 2; calves Seated Calf Raise 3 | 27 | 9 | 76 | 16 |
| s3 Shoulders + Arms | side_delts DB Lateral Raise 4; side_delts Cable Lateral Raise 3; biceps EZ Bar Preacher Curl 4; biceps Barbell Curl 4; front_delts Barbell Overhead Press 3 (thin); rear_delts Reverse Pec Deck 2; triceps Cable Overhead Tricep Extension 3; abs Cable Crunch 3; abs Hanging Knee Raise 2 | 28 | 9 | 73.5 | 13.5 |

The rows list the sets after `balanceSlots` (the plan's `peakSets`). The
re-split changed two pairs: in s2 the allocator's Incline 4 and Bench 2 became
Bench 3 and Incline 3; in s3 its Hanging Knee Raise 3 and Cable Crunch 2
became Cable Crunch 3 and Hanging Knee Raise 2. The minutes column is the
allocator's, computed before the re-split (section 6.5). Rest in s2 and s3
follows the same ladder values as s0 and s1 (isolation 60, machine 90,
mod_compound 120, heavy_compound 150).

All four sessions are `overCeilings` (9, 8, 9, 9 exercises; 31, 26, 27, 28
working sets) and over the 60 minutes after the whole rest ladder
(`restRung: heavy_compound`). `estimatedSessionMinutes` = 90.

Weekly totals at the peak (direct / fractional): chest 10 / 10, back 12 / 12,
side_delts 19 / 21.5, rear_delts 6 / 12, front_delts 5 / 10, biceps 18 / 24,
triceps 8 / 15.5, quads 8 / 8, hamstrings 6 / 8, glutes 4 / 10, calves 8 / 8,
abs 8 / 8, traps 0 / 4, adductors 0 / 4. `limitedBy` 'limits': chest, back,
rear_delts, front_delts, triceps.

Every number above is at a floor: chest 10 (growth floor), back 12 (direct
floor), side delts 19 own sets, which with the overhead press's credit at
that moment reached its floor of 20, and the overhead press's later sets
added 1.5 more (21.5); biceps 18 own sets reached 20 with the back's first 4
sets' credit, and the back's later floor sets added 4 more (24, above its
peak of 22); front delts 10 fractional (5 direct + 5 from the chest presses,
its growth floor); triceps 8 direct (its direct floor). The greedy (step 4)
could add nothing because every session was already past the D45 ceilings or
the time limit.

### 10.6 Light caps

Computed for the order at that moment, `0123` (s0, s1, s2, s3), with gaps
24, 48, 24, 72 h (`TYPICAL_WEEK_GAP_HOURS[4]`). Population clocks at RIR 1,
fractional dose (from `recoveryHours`):

| Muscle | 2 sets | 4 | 6 | 8 | 10 | 12 (hours) |
|---|---|---|---|---|---|---|
| side_delts, rear_delts, biceps, triceps, front_delts | 37.0 | 43.1 | 52.8 | 61.0 | 68.2 | 74.7 |
| chest, back, hamstrings | 46.2 | 53.9 | 66.0 | 76.2 | 85.2 | 93.3 |
| quads, glutes | 41.6 | 48.5 | 59.4 | 68.6 | 76.7 | 84.0 |
| calves, abs | 27.7 | 32.3 | 39.6 | 45.7 | 51.1 | 56.0 |

Heavy threshold for the arm and delt muscles: `0.895 x 61.0 = 54.6` h. In
`0123`, for muscles trained in s0, s2 and s3: gaps (minus 1 h) after s0 71 h,
after s2 23 h, after s3 71 h.

- biceps: own day s3 (named 4th in s3, 5th in s2, 6th in s0); s0 71 h is not light; s2 23 h is light; even 2 sets need 33.1 h, so the cap is 2. Kept: room 10 + 2 + 10 = 22 is at least 20.
- rear_delts: own day s3; s2 light, cap 2. Room 6 + 2 + 6 = 14 is at least 6.
- triceps: own day s0 (5th in s0 and s3, 6th in s2; the earlier session wins); s2 light, cap 2. Room 14 at least 8.
- side_delts: own day s2 (named first in s2 and s3; s2 is earlier), so s2 is heavy although it is followed by 23 h; s0 and s3 are followed by 71 h, so neither is light: no caps.

### 10.7 Order

| Step | Order | Source |
|---|---|---|
| After call 1 | `0123`, total penalty 2186.65 (recovery 1.47, clash 2185.19) | `orderFor`, `planner.js:751`; equal to the authored order, so no re-spacing |
| After call 2 (light caps) | `2310`, total 1168.31 (recovery 1.65, clash 1166.67) | `orderFor`, `:763`; the light caps for `2310` came out the same, so the split loop ended (`:760`) |
| `settle()` | `0132` | `readinessOrder`, `:775`: no order of the 8 cheapest passes readiness; `0132` has the smallest deficit |

The 8 cheapest orders for the final block's peak loads, with the readiness
deficit re-simulated on the final block (the planner's first `settle`
iteration read the block prescribed in `2310`, so its deficits can differ
slightly; it arrived at `0132` and the second iteration confirmed it):

| Order | Total penalty | Recovery | Clash | Passes | Deficit |
|---|---|---|---|---|---|
| 2310 | 1168.313 | 1.646 | 1166.667 | no | 7.494 |
| 0132 | 1168.345 | 1.678 | 1166.667 | no | 6.642 |
| 1023 | 1168.356 | 1.689 | 1166.667 | no | 8.082 |
| 3201 | 1168.361 | 1.694 | 1166.667 | no | 7.090 |
| 3102 | 1168.548 | 1.881 | 1166.667 | no | 13.174 |
| 0231 | 1168.557 | 1.891 | 1166.667 | no | 13.268 |
| 2013 | 1168.588 | 1.921 | 1166.667 | no | 12.216 |
| 1320 | 1168.605 | 1.939 | 1166.667 | no | 12.151 |

Every one of the 24 orders has a clash of at least 1166.67: three upper
sessions in a cycle of four always leave two upper sessions adjacent. Outside
the 8 cheapest, `1032` (penalty 1180.12) has a smaller deficit, 6.516.

Final order `0132`: Upper A (Width), then 24 h, Legs + Abs, then 48 h,
Shoulders + Arms, then 24 h, Upper B (Detail), then 72 h. `gapRanks`: s2 0,
s1 1, s0 2, s3 3.

In `0132` the light caps chosen for `0123` sit on s2, which is now followed
by the 72 h gap, while s3 (biceps 8, side delts 7, rear delts 2, triceps 3
direct sets) is followed by 24 h and then s2. `heavyBeforeLongestGap` accepts
this because s0, a heavy exposure, also precedes a 72 h gap (tie allowed,
`planner.js:308`).

### 10.8 Readiness and the fix attempts

Simulated on the population clocks at the typical spacing. Failing readings,
all at the start of s2 (Upper B, position 4):

| Muscle | Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Week 6 |
|---|---|---|---|---|---|---|
| side_delts | 0.656 | 0.479 | 0.429 | 0.390 | 0.366 | 0.656 |
| biceps | 0.734 | 0.525 | 0.479 | 0.403 | 0.409 | passes |
| triceps | 0.847 | 0.678 | 0.627 | 0.503 | 0.503 | passes |
| rear_delts | 0.856 | 0.685 | 0.685 | 0.622 | 0.622 | passes |

Threshold 0.895. Every other muscle reads 1.0 at every session.

Fix round 1 (worst two: side delts 0.366, biceps 0.403):

- side delts `split`: forced caps in `0132` would be s0 4, s3 2 with s2 (its own day) heavy; room 4 + 2 + 8 = 14 is below its growth floor 20, so not acted.
- side delts `extra_session`: not offered (k 3 equals its allowed sessions).
- side delts `fewer_sessions`: k 3 is not above `lowestK` 3 (the division lists it in 3 sessions), so not acted.
- side delts `peak_lowered`: `floor(21.5) - 1 = 20` is at least 20, so the peak became 20; the rebuild produced the same allocation (call 3), the deficit did not fall, restored.
- biceps `split`: forced caps s0 4, s2 4 with s3 heavy; room 4 + 4 + 10 = 18 below 20, not acted.
- biceps `extra_session`, `fewer_sessions`: as side delts.
- biceps `peak_lowered`: `floor(24) - 1 = 23`, which RAISES its peak from 22 to 23 (W includes the back's credits); same allocation (call 4); restored.
- No fix kept: the loop ended. Notes: `promise_limited` for side_delts (0.37), biceps (0.40), triceps (0.50), rear_delts (0.62).

Ramp: not run (`loggedWeekly` null). Slower cap: not run (no factor). Standard
floor: met. `personalise`: not run.

`recoverySafeMax` (direct sets): abs 9, back 12, biceps 18, calves 9, chest
12, front_delts 12, glutes 4, hamstrings 7, quads 8, rear_delts 6,
side_delts 19, triceps 8. The four failing muscles stay at their planned
peaks (`planner.js:194`).

### 10.9 The six weeks of targets (direct sets) and the sets served

| Muscle | Peak (direct) | Slots | Floors | W1 | W2 | W3 | W4 | W5 | W6 |
|---|---|---|---|---|---|---|---|---|---|
| side_delts | 19 | 5 | 10 | 11 | 13 | 15 | 17 | 19 | 10 |
| biceps | 18 | 5 | 10 | 10 | 12 | 14 | 16 | 18 | 9 |
| chest | 10 | 3 | 6 | 6 | 7 | 8 | 9 | 10 | 5 |
| front_delts | 5 | 2 | 4 | 4 | 4 | 5 | 5 | 5 | 3 |
| back | 12 | 3 | 6 | 6 | 8 | 9 | 11 | 12 | 6 |
| rear_delts | 6 | 3 | 6 | 6 | 6 | 6 | 6 | 6 | 3 |
| triceps | 8 | 3 | 6 | 6 | 7 | 7 | 8 | 8 | 4 |
| quads | 8 | 2 | 4 | 4 | 5 | 6 | 7 | 8 | 4 |
| hamstrings | 6 | 2 | 4 | 4 | 5 | 5 | 6 | 6 | 3 |
| glutes | 4 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 2 |
| calves | 8 | 3 | 6 | 6 | 7 | 7 | 8 | 8 | 4 |
| abs | 8 | 3 | 6 | 6 | 7 | 7 | 8 | 8 | 4 |

Week 1 starts at `max(floors, peak - 8)`; week 6 is `round(peak x 0.5)`. No
muscle has a prescribe shortfall or an above-target count in any week.

Stored shares (`exposureShares`): side_delts s0 0.211, s2 0.421, s3 0.368;
biceps s0 0.444, s2 0.111, s3 0.444; chest s0 0.4, s2 0.6; front_delts s0
0.4, s3 0.6; back s0 0.667, s2 0.333; rear_delts one third each; triceps s0
0.375, s2 0.25, s3 0.375; calves s1 0.625, s2 0.375; abs s1 0.375, s3 0.625.

**Week 1, in rotation order** (reps; rest after trimming):

| Session | Exercise | Sets | Reps | Rest (s) |
|---|---|---|---|---|
| Upper A (Width) | Dumbbell Lateral Raise | 2 | 10-20 | 60 |
| | EZ Bar Preacher Curl | 2 | 10-20 | 60 |
| | Barbell Curl | 2 | 10-20 | 60 |
| | Barbell Bench Press | 2 | 6-10 | 150 |
| | Barbell Overhead Press | 2 | 6-10 | 150 |
| | Lat Pulldown (Wide Grip) | 2 | 8-12 | 120 |
| | Seated Cable Row | 2 | 8-12 | 120 |
| | Reverse Pec Deck | 2 | 10-20 | 60 |
| | Cable Overhead Tricep Extension | 2 | 10-20 | 60 |
| Legs + Abs | Barbell Back Squat | 2 | 6-10 | 150 |
| | Romanian Deadlift (Barbell) | 2 | 6-10 | 150 |
| | Barbell Hip Thrust | 2 | 6-10 | 150 |
| | Leg Press | 2 | 8-15 | 90 |
| | Seated Leg Curl | 2 | 10-20 | 60 |
| | Standing Calf Raise (Machine) | 2 | 10-20 | 60 |
| | Seated Calf Raise | 2 | 10-20 | 60 |
| | Cable Crunch | 2 | 10-20 | 60 |
| Shoulders + Arms | Dumbbell Lateral Raise | 2 | 10-20 | 60 |
| | Cable Lateral Raise | 2 | 10-20 | 60 |
| | EZ Bar Preacher Curl | 2 | 10-20 | 60 |
| | Barbell Curl | 2 | 10-20 | 60 |
| | Barbell Overhead Press | 2 | 6-10 | 150 |
| | Reverse Pec Deck | 2 | 10-20 | 60 |
| | Cable Overhead Tricep Extension | 2 | 10-20 | 60 |
| | Cable Crunch | 2 | 10-20 | 60 |
| | Hanging Knee Raise | 2 | 10-20 | 60 |
| Upper B (Detail) | Dumbbell Lateral Raise | 3 | 10-20 | 60 |
| | Cable Lateral Raise | 2 | 10-20 | 60 |
| | Barbell Curl | 2 | 10-20 | 60 |
| | Barbell Bench Press | 2 | 6-10 | 150 |
| | Seated Cable Row | 2 | 8-12 | 120 |
| | Incline Dumbbell Press | 2 | 8-12 | 120 |
| | Face Pull | 2 | 10-20 | 60 |
| | Tricep Pushdown (Rope) | 2 | 10-20 | 60 |
| | Seated Calf Raise | 2 | 10-20 | 60 |

Week 1 working sets: 18, 16, 18, 19 (71 in total).

**Week 5 (the peak), same order:**

| Session | Sets per exercise, in the order above | Working sets |
|---|---|---|
| Upper A (Width) | 4, 4, 4, 4, 2, 4, 4, 2, 3 | 31 |
| Legs + Abs | 4, 4, 4, 4, 2, 3, 2, 3 | 26 |
| Shoulders + Arms | 4, 3, 4, 4, 3, 2, 3, 3, 2 | 28 |
| Upper B (Detail) | 4, 4, 2, 3, 4, 3, 2, 2, 3 | 27 |

Week 5 equals the peak allocation exercise for exercise (112 working sets).

### 10.10 What would be saved

Programme "V-Taper 4×/week" (or with a date suffix), routines in the order
Upper A (Width), Legs + Abs, Shoulders + Arms, Upper B (Detail), each
exercise with week 1's sets, the reps and rest above, `selection_reason`
`required_role`. Plan facts as in 8.2, with `thin` naming the Barbell
Overhead Press in Upper A and in Shoulders + Arms. Weekly rows: the 12
muscles above get the targets in 10.9 with `source 'template'`; traps,
forearms, adductors, neck and tibialis keep `activatePlanWithBlock`'s
template ramp for a person with no learned seed (for example traps 4, 7, 9, 12, 14, deload 4; from `mev` 4 to
`mav` 14, `algorithms.js:59`), although the plan has no exercise for them
(P11). The legacy summary's `plannedSets` (week 1 direct): chest 6, back 6,
shoulders 21 (side 11, rear 6, front 4), biceps 10, triceps 6, quads 4,
hamstrings 4, glutes 2, calves 6, abs 6, traps 0; `isWeakPoint` on shoulders
and biceps.

---

## 11. Observed problems

Each item gives the location, what was observed, and how to reproduce it.
"Trace" means section 10's run. "Probe" means the same harness calling
`buildPlan` with the inputs stated (full gym, `LIBRARY`, `DIVISION_MATRIX`,
`recoveryRating 'average'`, `firstBlock true`, no factor, no own gaps,
`loggedWeekly null` unless stated).

**P1. The person's session length does not limit any set placed by a floor,
and in the trace it changed nothing.** `allocate.js:360`, `366-367`, `422`,
`437`, `442`, `452`, `457` pass `ignoreTime = true`, which skips the time and
D45 checks (`:258-260`). Trace: allocation call 0 (no time limit) and call 1
(60 minutes) placed identical sets; the sessions run 89.5, 82.5, 76 and 73.5
minutes at the peak after every rest rung, and `estimatedSessionMinutes` is
90 for a 60-minute request. Probe `general`, 4 days, 60 minutes, no focus:
`upper_lower_x2`, 83, 74, 74, 71 minutes. Reproduce: `buildPlan` with the
trace inputs; read `v2.sessionMinutesAtPeak` and `v2.overTime`.

**P2. The D45 ceilings (8 exercises, 25 working sets) are exceeded in every
session of the trace.** Same mechanism as P1. Trace: 9, 8, 9 and 9 exercises;
31, 26, 27 and 28 working sets at the peak; `v2.overCeilings` lists all four
sessions. The allocator's header lists these as limits (`allocate.js:12-19`)
without saying that floors bypass them. Reproduce: as P1, read
`v2.overCeilings` and count `workouts[].exercises`.

**P3. The light and heavy split is not recomputed when the readiness search
changes the order, so a light session can end before the long gap and a heavy
one before the short gap.** Light caps are set at `planner.js:758-764` for the
order of that moment; `settle()` (`:772-784`) then moves the order through
`readinessOrder` and nothing recomputes the caps (only `resplit` after a k
change, `:787-792`). `heavyBeforeLongestGap` accepts the result when any heavy
exposure ties the longest gap (`:308`). Trace: caps biceps, rear delts and
triceps 2 sets on s2 were computed for order `0123` (s2 followed by 24 h);
the saved order is `0132`, where s2 is followed by 72 h (`gapRanks.s2 = 0`)
and s3, with biceps 8 and side delts 7 direct sets at the peak, is followed by
24 h and then s2; every readiness failure is at that s2. Reproduce: trace
inputs; compare `v2.lightCaps`, `v2.order` and `v2.gapRanks`.

**P4. Credits push a muscle's weekly total above its role's peak, and the
`peak_lowered` readiness fix then has no effect.** `allocate.js:468` and
`489` stop a muscle's OWN sets at its peak; `addCredit` (`:211-225`) adds
other muscles' credits without that check. Trace: biceps 24 fractional
against a focus peak of 22 (+6 from back rows and pulldowns placed in the
back's later floor steps). The fix at `planner.js:858-862` sets the peak to
`floor(W) - 1` with W including credits: it lowered side delts from 22 to 20
but RAISED biceps from 22 to 23 (allocation calls 3 and 4), and the
allocation did not change in either case (21.5 and 24), so both were
restored. The explanation text says a
focus muscle is never planned above 30 (`explain.js:98`); no code in
`buildPlan` enforces `ROLE_TARGETS.focus.plannedCeiling` (grep: used only in
`checkinPlacement.js:116`, `181` and `explain.js:98`). Reproduce: trace;
`weeklyVolumeSummary.biceps.fractional`.

**P5. In the trace the readiness promise fails for four muscles and no fix is
possible.** Side delts 0.37, biceps 0.40, triceps 0.50, rear delts 0.62 at the
start of Upper B. The split is refused by `keepsFocusFloor`
(`planner.js:618-625`) because the division's own day must be the heavy one
(`:1217-1220`); extra and fewer sessions are blocked by the division's listed
count (`lowestK`, `:472`); lowering the peak is defeated by P4. The plan is
saved with `readiness.passes false` and four `promise_limited` notes.
Reproduce: trace, `v2.readiness` and `v2.notes`.

**P6. The rotation's clash term outweighs the recovery term by about three
orders of magnitude.** `CLASH_BASE = 1000` (`rotation.js:28`, `85`) against
recovery terms of 1.5 to 2.2 in the trace. With three upper sessions in a
4-session cycle every order clashes (minimum 1166.67), so recovery only ranks
orders inside the same clash band, and `readinessOrder` looks only at the 8
cheapest (`planner.js:1106`, `1119`). Trace: order `1032` (penalty 1180.12)
has a smaller readiness deficit (6.516) than the chosen `0132` (6.642) and
was never examined. Reproduce: trace, `prepareRotation` over all 24
permutations with the plan's peak loads.

**P7. A single-choice muscle is treated as "thin equipment" in a full gym.**
`allocate.js:149` marks any muscle with exactly one choice as thin, giving
its exercise cap +2 (`:288`) and `thinEquipment: true`. The catalogue gives
one non-credited role to front delts, traps, forearms, adductors, neck and
tibialis (`catalogue.js:245-276`, `438-476`), so in a full gym these resolve
to one choice each (probe: `singleChoice` = front_delts Barbell Overhead
Press, traps Dumbbell Shrug, forearms Barbell Wrist Curl, adductors Hip
Adduction Machine, neck Neck Flexion (Machine), tibialis Tibialis Raise
(Wall)). Trace: the Barbell Overhead Press is `thinEquipment: true` in two
sessions, saved into `facts.thin` (`planAutoGen.js:1977-1980`), and
`explain.js:253-255` then tells the person "Where your equipment gives a
muscle a single exercise, it can take up to 2 more sets." Reproduce: trace,
`workouts[].exercises[].thinEquipment`.

**P8. The aggressive-cut peak reduction cannot be reached from a profile.**
`roles.js:63`, `91` reduce peaks only for `nutritionPhase === 'aggressive_cut'`.
`buildPlanInputs` sets `nutritionPhase = phaseToNutritionKey(phase)`
(`planAutoGen.js:135`), whose values are only `lean_gain`, `build`,
`mild_cut`, `recomp`, `maintain` (`coachingGoals.js:229-299`). Probe: every
phase mapped; `cut` gives `mild_cut`. Reproduce:
`buildPlanInputs({ trainingGoal: 'general', trainingPhase: 'cut' }).nutritionPhase`.

**P9. The ramp is skipped entirely for a person with no recent training,
which the caller's comment says it is not.** `planner.js:893` requires
`ctx.loggedWeekly` to be truthy; `plannerV2LoggedWeekly` returns `null` when
no week of the last four trained (`planAutoGen.js:1703`), and its comment
says the planner then "ramps from its no-history limit as before"
(`planAutoGen.js:1695-1697`). The no-history limit (16 fractional sets,
`planner.js:898-900`) applies only to a muscle missing from a non-null
`loggedWeekly`. Probe: `loggedWeekly: null` against `loggedWeekly: {}` for
4 goals x 4 day counts x 4 focus sets (64 input combinations): no plan differed, so no
effect was observed in those cases. Reproduce: as described.

**P10. For a strength-phase plan the session-length estimate uses the
hypertrophy rest, while the saved rest is the strength rest.**
`allocate.js:46-51`, `286` (180/150/120/75 s) against
`planner.js:1389` with `restFor(kind, true)` (210/180/120/75 s,
`prescription.js:79-84`) for untrimmed slots. Probe `general`, 3 days,
120 minutes, `isStrength: true`: estimated 97.5 and 87.3 minutes for Upper and
Lower; recomputed with the saved rests 102 and 93 minutes. Reproduce: as
described, `sessionMinutes` over the saved exercises.

**P11. Weekly planned-volume rows for muscles the plan does not target keep
the template ramp.** `activatePlanWithBlock` seeds all 17 `VOLUME_LANDMARKS`
muscles (`database.js:6309-6368`); `writePlannerV2WeeklyRows` overwrites only
muscles in `weeklyTargets` (`planAutoGen.js:1845-1859`). For the trace plan
traps, forearms, adductors, neck and tibialis keep targets such as traps 4,
7, 9, 12, 14 with no exercise to serve them. Also, both the planner's rows and
the untouched template rows carry `source 'template'`
(`planAutoGen.js:1858`, `database.js:6329`), so the source cannot tell them
apart, and the planned sets of a ledger seed passed by `PlansScreen.js:767-771` survive only for
muscles the planner does not target. What screens or check-ins do with these
rows was not traced (UNVERIFIED). Reproduce: by reading the two writers; not
executed against a database.

**P12. Comments that disagree with the code (the code is described in this
document).**
- `roles.js:15-17`: de-emphasised muscles "at 6" as maintenance; code: standard, weight 0, peak `max(directFloor, 6)` (`:113-139`).
- `planner.js:163-167`: recovery-safe maximum "written into the plan's weekly rows (`mrv`)"; code: written into the plan facts only (`planAutoGen.js:1368-1374`), read from the facts (`checkinPlacement.js:187-197`).
- `planner.js:1190-1196`: a light cap is "the largest dose (2 to 4 direct sets) that does clear within that gap"; code: 2 when no dose clears (`:1226-1229`; trace: 2 sets need 33.1 h against a 23 h gap).
- `families.js:207-211`: `cost` is "the muscles a session lists"; the planner passes a running count of muscles already placed (`planner.js:485-486`).
- `planEngine.js:2345-2357` (the comment above `DIVISION_MATRIX`, written for the legacy generator; the new planner reads the same lists): "the week opens with that muscle's top compound (back -> vertical pull for Men's Physique ...)" and "every list carries ... lower body twice from 4 days up"; the new planner opens Upper A with the focus lateral raise and curls (`sessionOrder.js:39`), and the mens_physique lists train legs once (`planEngine.js:2368-2375`).
- `allocate.js:12-19`: lists the session length and the D45 ceilings among the limits that stop placement; floors ignore them (P1, P2).

**P13. Weak points are cut to three before duplicates are merged.**
`planAutoGen.js:1784` and `2160`: `resolveWeakPointKeys(weakPoints.slice(0, 3))`.
Two labels map to `chest` and two to `back` (`planEngine.js:61-78`). Probe:
`['Chest', 'Upper Chest', 'Biceps', 'Triceps']` gives focus `['chest',
'biceps']`; triceps is lost although only two distinct focus muscles remain.
Whether the selector lets a person pick more than three labels is UNVERIFIED.

**P14. The plan's day count can differ from the profile's without the inputs
saying so.** A beginner asking for 6 days: `buildPlanInputs` reports
`daysPerWeek: 6` (`planAutoGen.js:124`), the planner builds 4
(`planner.js:311-316`). Probe: `general`, 6 days, beginner gives
`upper_lower_x2`, 4 days. Also: no goal has a 2-day division list, so
mens_physique at 2 days gets the general `full_body_ab` (probe), with the
division's overlays and floors still applied.

**P15. The style-pool test differs between the save and the generated
rebuild.** The save diverts to the legacy generator only when the style key
resolves to a pool (`planAutoGen.js:1029`, `1037`); `planGeneratedRebuildV2`
refuses on any `style:` key (`:2097`). A plan tagged with an unknown style key
is built by the new planner on save but never rebuilt. Reproduce by reading;
not executed.

**P16. The demonstrated-structure read is computed on the save path and not
used.** `planAutoGen.js:1012-1015` reads the person's completed blocks before
the new planner runs; the new planner does not take it (`:1037-1043`) and its
preview reports `structureMemory: null` (`:2247`). The read runs on every
save. Reproduce by reading.
