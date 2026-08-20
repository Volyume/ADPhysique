# AUDIT A — Onboarding, profile, plan generation, plan library

Capability Campaign 25 (CC25), Wave 1. Evidence report. No recommendations,
no decisions. Every claim carries `file:line` against the working tree at
branch `claude/build-name-prompt-apple-auth-fp49by`, 2026-08-20.

Labels used throughout:
**OBSERVED** = read in live code this session. **REPORTED** = asserted by a
doc/comment and not (or not fully) confirmed in code. Conflicts are recorded
where found, and the live code is described as current behaviour.

---

## 1 SCOPE COVERED / METHOD

### Scope covered

- Both onboarding paths end to end: `FirstRunScreen` → `FreeStarterScreen`
  (free) and `ProOnboardingScreen` (Pro), plus the gate ordering in
  `RootNavigator.renderNavigator`.
- Every profile field collected anywhere in those paths, where each is
  stored (Zustand / AsyncStorage / SQLite / cloud), who reads it, and which
  screens can edit it later.
- `planAutoGen.generateAndSavePlan` / `generatePlanDryRun` /
  `assessScheduleFit` and `planEngine.generatePlan` end to end, into
  `poolGenerator`, `exercise/generation.js`, `exercise/intent.js`,
  `exercise/movementFamily.js`, `exercise/continuity.js`,
  `programmeStructureMemory.js`.
- Every exercise-filtering point in the generation path and in the manual
  picker; the equipment data contract.
- Plan library: `seedRoutines.js` (definition), `PlanLibraryScreen`,
  `PlanDetailScreen`, `FreeStarterScreen` (installation), `copyPlanFromLibrary`,
  the tag vocabulary, browse/filter mechanics, and the free/Pro gating on
  every plan surface.
- Manual builder (`ManualBuilderScreen`), plan edits (`RoutineDetailScreen`),
  plan rebuild (`PlanUpdateScreen`, `ProGoalSetupScreen`).
- Local schema (`database.js`) and cloud schema (`supabase/migrate_NNN_*.sql`,
  `supabase/README.md`) for every table in the above.

### Method

Read each mechanism to its consuming function before concluding; constants
were traced to their readers. Line numbers were re-derived this session (the
existing architecture doc's numbers have drifted — recorded in §11).
"Checked-and-absent" claims name the exact search run.

### Not covered (out of scope or not reached)

- Nutrition engine internals (Audit H), coach precedence (F), progression /
  block learning (E), workout logging (D), sync engine internals (I).
- Runtime behaviour: nothing was executed. No app run, no test run.

---

## 2 CURRENT BEHAVIOUR (mechanism)

### 2.1 Gate order at the navigator

OBSERVED. `renderNavigator` in `src/navigation/RootNavigator.js:1838-1889`
resolves in exactly this order:

1. `if (!user) return <WelcomeStack />` (`RootNavigator.js:1848`).
2. Blocking splash while the Article 9 consent check is unresolved for a
   real (non-local) signed-in account that has not finished first run:
   `if (user && !user.isLocal && !firstRunComplete && !healthConsentChecked)
   return <SplashScreen />` (`:1862-1864`).
3. Article 9 gate: shown when `healthConsent === false`, or when consent is
   `null` for a user who has not finished first run
   (`consentUnresolvedForNewUser`, `:1877-1880`). A returning user
   (`firstRunComplete`) with a null consent read is not re-prompted (`:1877`).
4. `if (!firstRunComplete) return tier === 'pro' ? <ProOnboardingStack /> :
   <FirstRunStack />` (`:1881-1883`).
5. Otherwise `<LockedMainTabs />` (`:1887`).

The tier branch at step 4 is the ONLY thing that decides which onboarding a
user gets, and `tier` is set to `'pro'` by the trial grant that fires inside
the Article 9 step (comment `RootNavigator.js:1831-1834`). Free and Pro
therefore diverge only after consent.

`FirstRunStack` contains exactly two screens, `FirstRunBranch` and
`FreeStarter` (`RootNavigator.js:678-695`). `ProOnboardingStack` contains
`ProOnboarding`, `ProSetupComplete`, `NutritionEducation`,
`NotificationSettings`, `CoachingReminders`, `Methodology`
(`RootNavigator.js:713-740`). Neither stack can reach the plan library
(comment records the removal under D95, `:687-693`).

### 2.2 Free onboarding

OBSERVED. `FirstRunScreen` collects **one optional field**: first name
(`src/screens/FirstRunScreen.js:47-49`), and is hidden entirely for
Apple-authenticated users (`:59`). Units are forced: `const localUnits =
'kg'` with the comment "Gym weights are kg-only (UK). No unit choice"
(`:35-36`). `finish()` writes `{...userProfile, units:'kg'}` plus
`firstName` when non-empty via `saveLocalProfile` (`:88-96`), then
`navigation.navigate('FreeStarter', { fromFirstRun: true })` (`:99`).

`FreeStarterScreen` asks three questions — goal, equipment, days
(`src/lib/onboarding/freeStarter.js:24-52`) — and uses them ONLY to pick a
library plan: `getFreeStarterRecommendation(answers, plans)`
(`src/screens/FreeStarterScreen.js:75`). **The answers are never persisted.**
`saveLocalProfile` does not appear anywhere in `FreeStarterScreen.js`
(grep over the file returns no match; only `completeFirstRun` at `:38`,
`:115`, `:193`). Installation is `copyPlanFromLibrary` → `activatePlanWithBlock`
→ `completeFirstRun` (`:179`, `:188`, `:193`), with dedup by
`sourceProgrammeId`, then legacy name, then archived copies (`:163-176`).
Skip calls `completeFirstRun()` directly (`:110-121`).

Net: a free user finishes onboarding with a profile blob containing
`{ units: 'kg' }` and optionally `firstName`. No sex, age, height, weight,
experience, equipment, days, session length, goal, phase, weak points or
recovery rating is stored for them anywhere.

### 2.3 Pro onboarding

OBSERVED. Six internal steps, displayed as five
(`ProOnboardingScreen.js:76-77`, renumbering at `:228-230`). Fields and
their gates:

| Step | Fields | Gate |
|---|---|---|
| 1 Account | auth only | skipped when `user && !user.isLocal` (`:343`) |
| 2 Baseline | firstName (optional), **sex**, **body weight**, **age**, **height** | `advanceFrom2` (`:888-926`) + `canContinue` (`:1613-1617`) |
| 3 Body composition | body-fat %, body-fat source | none — "entirely optional" (`:930-937`) |
| 4 Training week | **experience**, **session length**, **days/week**, **equipment** | `advanceFrom4` (`:939-950`), `canContinue` (`:1944`) |
| 5 Targets | **trainingPhase**, **trainingGoal**, weak points (≤3), protein approach | `advanceFrom5` (`:954-964`), `canContinue` (`:2031`) |
| 6 Check-in rhythm | **recoveryRating**, morning hour, check-in day | `advanceFrom6` (`:1202-1206`), `canContinue` (`:2190`) |

`advanceFrom2` refuses on: sex not exactly `male`/`female` (`:894-897`),
body weight outside 30–300 kg (`:901-909`), age outside 13–100 (`:910-913`),
height outside `MIN_HEIGHT_CM=120` / `MAX_HEIGHT_CM=250` (`:152-153`,
`:919-924`). `canContinue` at `:1613-1617` repeats the same four predicates
through the same shared resolvers, so the disabled button and the alert
cannot drift (`:157-158`, `:1610-1612`).

There is no default day count: "FOUNDER LAW (2026-08-13): there is NO default
number of training days" (`:118-121`); `daysPerWeek` starts `null` (`:448`)
and `equipment` starts `null` (`:449`). By contrast `sessionLengthMinutes`
defaults to 60 (`:445`) and `trainingGoal` defaults to `'general'` (`:452`).

`advanceFrom6` (`:1202`) runs a one-shot schedule-fit check
(`assessScheduleFit`, `:1211-1220`) and only interrupts when the state is
`INSUFFICIENT_FOR_VALID_PLAN` or `VALID_TIME_CONSTRAINED`; then writes, in
order: notification prefs (`:1242`), the profile blob (`:1324-1361`), the
enrolment body metric + morning weight (`:1368-1409`), `user_body_profile`
(`:1411-1421`), effective-maintenance resolution + nutrition targets
(`:1423-1458`), and finally the plan (`:1462-1509`).

### 2.4 Generation: the chain from UI to engine

OBSERVED. `planProfileNow()` (`ProOnboardingScreen.js:1121-1132`) is the
single profile object handed to both the fit assessment and the build:

```
{ experience, daysPerWeek, sessionLengthMinutes, equipment,
  trainingGoal, trainingPhase, planWeakPoints, recoveryRating }
```

`generateAndSavePlan(user.id, planProfile)` (`ProOnboardingScreen.js:1487`)
→ `planAutoGen.generateAndSavePlan` (`src/lib/planAutoGen.js:657`).

Inside `generateAndSavePlan`:

1. `buildPlanInputs(profile)` (`:661` → `:94-119`) returns `null` unless
   `profile.trainingGoal` is set (`:95`), migrates legacy goal ids
   (`:102-105`), and back-fills defaults for everything else:
   `experience 'intermediate'`, `daysPerWeek DEFAULT_DAYS_PER_WEEK = 4`
   (`:82`, `:107`), `sessionLengthMinutes 60`, `equipment 'full_gym'`,
   `phase 'maintain'`, `weakPoints []`, `recoveryRating 'average'`,
   `nutritionPhase = phaseToNutritionKey(phase)` (`:106-118`).
2. `getAllExercises()` (`:672`), failing open to the engine's built-in POOL.
3. `loadGenerationIntent(userId)` (`:679` → `:296-307`): resolves the active
   block id via `getActiveBlock`, then `loadExerciseIntentState`. Best-effort;
   a failure returns `null`.
4. `filterLibraryForGeneration(allExercises, intentState)` (`:680` →
   `src/lib/exercise/generation.js:104-143`).
5. `libraryForReviewedProposal` removes ids the reviewed next-block proposal
   already voted REPLACE on (`:682`, `:747-750`).
6. `readDemonstratedStructure(userId, inputs.daysPerWeek)` (`:696` → `:179`).
7. `generatePlan({ ...inputs, demonstratedStructure, exerciseLibrary,
   canonicalNames })` (`:703-708`).
8. `withContinuity(...)` (`:722-725` → `:509-567`) splices retained
   incumbents back in.
9. `resolvePlanAgainstLibrary(planForWrite, buildExerciseIndex(allExercises),
   filteredLibrary)` (`:756-759` → `:579-618`) resolves each pick to a real
   catalogue row and applies `generationBlockFor`.
10. Writes: `createProgramme` → `createRoutine` per workout →
    `addExerciseToRoutine` per exercise, all inside one transaction
    (`:744-784`), then `activatePlanWithBlock` (`:812`) and
    `archiveOtherUserPlans` (`:819`).

### 2.5 Inside `generatePlan`

OBSERVED. `generatePlan` (`src/lib/planEngine.js:3100-3122`) is a thin
wrapper that sets a module-level `_effectivePool` via `buildEffectivePool`
and restores it in a `finally` (`:3104-3121`), keeping the module stateless
between runs. `_generatePlanInner` (`:3124`) then:

- Caps weak points at 3 (`:3155`), resolves them to internal muscle keys
  (`:3156`), stores the division goal in module state `_divisionGoal`
  (`:3163`).
- Clamps days to 2–6 (`:3178`); beginners are capped at 4 (`:3180`).
- Chooses the split: `DIVISION_MATRIX[goal][effectiveDays]` for the six
  specialised divisions, else `selectSplit(experience, effectiveDays,
  internalGoal)` (`:3197-3225`). Demonstrated structure can override only on
  the non-matrix path and only when its `dayCount` equals `effectiveDays`
  (`:3222-3225`), with a second check on what was actually built
  (`:3271-3274`).
- `computeLandmarks` → base weekly targets at MEV (`:3228-3234`) →
  `applyGoalOverlay` (`:3239`) → `enforceWeeklyFloorsAndCaps` (`:3240`).
- Builds workouts via one of the split builders (`:3242-3262`), all of which
  route per muscle into `buildSession` → `selectExercisesForMuscle`
  (`planEngine.js:1924-1955`).
- Post-processing: `clampDeliveredToMRV` (`:3302`), `computeStructuralFloors`
  (`:3306`), `fitToTimeBudget` (`:3361-3385`), per-session
  `deduplicateExercises` + `trimToTimeBudget` (`:3389-3395`), duration
  stamping (`:3417`), `buildDivisionCoverage` (`:3440`), `buildWarnings`,
  `buildVolumeSummary`, `buildPersonalisationSummary`, `buildWhyThis`
  (`:3443-3468`).

### 2.6 Exercise selection and the equipment filter

OBSERVED. `selectExercisesForMuscle` (`planEngine.js:1415`) applies, in order:

1. `filterPool(muscle, equipment, goal)` (`:1418` → `:1330-1345`). The hard
   equipment filter is one line: `const byEquip = pool.filter(e =>
   e.eq.includes(equipment))` (`:1332`). It runs FIRST and no later
   never-starve fallback re-admits an equipment-incompatible entry — the
   division-rule fallback falls back to `byEquip`, not to `pool` (`:1344`).
2. `isAutoEligible(e.n)` — a hard filter with deliberately no never-starve
   guard (`:1430-1431`, rationale `:1420-1429`).
3. A canonicality gate (STAPLE/COMMON preferred) with a never-starve guard
   and a retained `coverageFallbackPool` (`:1466-1470`).
4. Difficulty gate for beginners (`:1478-1483`) and an assisted-lift gate
   for non-beginners (`:1489-1494`), both never-starve.
5. Required-role computation from `SUBREGION_REQUIREMENTS` (`:1497-1508`) and
   the division's `REQUIRED_WHEN_FEASIBLE` roles (`:1526-1532`).
6. `sortScore` (`:1551-1615`): `reqBonus 100` → `paramBonus 10/tier` →
   division role nudge → goal/SFR nudge → canonicality `tierRank*2` →
   fatigue-stacking penalty 3 → pool index.
7. Pass 1 covers required roles, pass 2 fills with family diversity, then a
   growth loop and a set-distribution loop (`:1644-1810`).

`filterPool` is the ONLY place equipment is consulted during selection. The
other `equipment` uses are: an indirect-volume credit gate
(`planEngine.js:466`), `estimateSessionMinutes`'s per-equipment transition
cost (`:915-918`), and label text (`:2644-2652`, `:2695`).

### 2.7 Movement-pattern avoidance in generation (C31)

OBSERVED, and this answers §14 Q5 affirmatively.
`filterLibraryForGeneration` (`exercise/generation.js:104`) calls
`generationBlockReason` (`:55-70`) per library row, which asks
`isExcluded` / `isAvoidedThisBlock` on the exercise id, then derives
`movementFamilyOf(exercise)` and asks `isExcluded` / `isAvoidedThisBlock` /
`isPatternAvoided` against `familyTargetKey(family)` (`:60-68`). It fails
open on a malformed state (`:137-142`) and returns the SAME array by
reference when there is no intent (`:105-109`, `:77-86`).

Because `planEngine` can re-emit a filtered name through its hand-written
POOL fallback, `resolveSeed` (`planAutoGen.js:320-336`) re-checks each
resolved row with `generationBlockFor` (`exercise/generation.js:158-169`),
and blocked slots are REPORTED (`attachBlockedSlots`, `planAutoGen.js:630-645`)
rather than silently refilled. If every slot is blocked the plan is not
saved at all: error `'plan_blocked_by_exclusions'` (`planAutoGen.js:791-797`).

### 2.8 Demonstrated structure (returning users)

OBSERVED. `readDemonstratedStructure` (`planAutoGen.js:179-215`) walks
`getAllMesocycles`, parses each block's stored `blockLedger`, requires a
`programmeSignature` (`:191-194`), computes execution from
`getBlockTrainingData` + `trainingExecutionFact` (`:197-201`), judges the
block with `blockOutcomeFromLedger` (`:202-204`), drops unjudgeable blocks
(`:205`), and hands the list to `structureEvidence` → `demonstratedStructure`
(`:215`).

`demonstratedStructure` (`programmeStructureMemory.js:203-229`) requires
≥3 blocks on the same structure (`MIN_BLOCKS_FOR_STRUCTURE = 3`, `:35`),
adherence ≥0.7 per block (`STRUCTURE_ADHERENCE_MIN`, `:38`, applied at
`:172-174`), a failure fraction ≤0.5 (`:44`, `:215`), at least one productive
block (`:216`), and an exact `dayCount === daysPerWeek` match (`:212`). It
remembers ONLY `{ splitType, dayCount }` (`structureKey`, `:58`) — never
exercise identity (`:23-26`).

### 2.9 Plan library

OBSERVED. 31 library plans are defined as a single JS constant
`LIBRARY_PLANS` in `src/lib/seedRoutines.js:34-1470` (count: 31 `tags:`
entries). Each plan is `{ name, description, tags, difficulty, workouts:
[{ name, exercises: [{ name, sets, repsMin, repsMax, rest, notes }] }] }`
(shape at `:36-63`). Progression semantics are prose only, in `description`
and per-exercise `notes` (e.g. `:38`, `:68`) — there is no structured
progression field.

`seedRoutinesIfNeeded(userId)` (`:1475-1568`) is idempotent per device via
`SEED_KEY = '@volyume_routines_seeded_v12'` (`:9`) with a self-heal when the
marker is set but `getLibraryPlans()` is empty (`:1483-1493`), inserts any
missing `REQUIRED_EXERCISES` (`:1496-1505`), dedups by plan NAME (`:1512`),
and writes `createProgramme(userId, name, description, 1 /* is_library */,
tags, splitType, difficulty)` (`:1517-1525`) plus `createRoutine(...,
isLibrary=1, ..., isSample=true)` (`:1528-1537`) and
`addExerciseToRoutine` per exercise (`:1541-1551`).

It is called from `HomeScreen.js:433` and `PlanLibraryScreen.js:327` and
`FreeStarterScreen.js:57`. Library plans are therefore created **owned by
the seeding user** with `is_library = 1`.

Browse: `PlanLibraryScreen` loads `getLibraryPlans()` and
`getPlanWorkoutCounts` (`:15`, `:325-330`). Filtering is substring matching
on the `tags` string: `hasTag(plan, tag)` is
`plan.tags.toLowerCase().includes(tag.toLowerCase())` (`:122-124`), driving
`matchesCollection` over eight collections (`:35-44`, `:126-135`), a division
sub-filter `division:<key>` (`:472-476`), and a free-text search across
`[name, description, tags]` (`:473-476`). Default order is beginner-first
(`sortBeginnerFirst`, `:144-151`).

Installation writes: `copyPlanFromLibrary(libraryPlanId, userId)`
(`database.js:4560-4600`) creates a new programme with
`createProgramme(userId, name, description, 0)` — **no tags, no split_type,
no difficulty** — stamps `source_programme_id` (`:4570-4573`), then
duplicates each library routine and re-parents it with `is_library = 0`,
`is_template = 0` and the loop index as `position` (`:4581-4596`).

### 2.10 Custom builder

OBSERVED. `ManualBuilderScreen` (1790 lines) is reachable from PlansScreen's
"Create your own" card for both tiers (`PlansScreen.js:61-67`, `:88-95`) and
is registered unguarded (`RootNavigator.js:474`). It offers a goal label
(`ManualBuilderScreen.js:44-50`), a day count from `[2,3,4,5,6]` (`:54`), and
per-day exercise picking through `ExercisePickerModal` (`:10`, `:970`).
Persistence is `createProgramme(user.id, planName, goalLabel, 0)` (`:362`),
then a clear-and-reinsert of `routine_exercises` inside `persistDays`
(`:752`, `:762`), then optional `activatePlanWithBlock` (`:809`).
No engine, no equipment filter, no intent filter runs on this path — the
picker's own intent filter (§2.11) is the only one.

### 2.11 Manual exercise picker

OBSERVED. `ExercisePickerModal` filters on four ANDed terms
(`src/components/ExercisePickerModal.js:216-228`):
`matchesMuscleFilter`, `matchesEquipmentFilter` (a manual chip, not the
profile — the state starts empty at `:105`), `isEligible(intentState, e.id)`,
and `!isFamilyBlocked(intentState, movementFamilyOf(e))`. The last two are
bypassed by a user-facing `showExcluded` toggle (`:225`, `:227`).

---

## 3 FILES & FUNCTIONS

### Onboarding / navigation

| File | Key symbols |
|---|---|
| `src/navigation/RootNavigator.js` | `renderNavigator` `:1838`; `WelcomeStack` `:665`; `FirstRunStack` `:678`; `Article9ConsentStack` `:701`; `ProOnboardingStack` `:713`; gate comment `:1826-1837` |
| `src/screens/FirstRunScreen.js` | `FirstRunScreen` `:21`; `finish` `:86`; `hideNameField` `:59` |
| `src/screens/FreeStarterScreen.js` | `handleSkip` `:108`; `handleStartPlan` `:133`; recommendation memo `:75` |
| `src/lib/onboarding/freeStarter.js` | `FREE_STARTER_STEPS` `:24`; `getPlanDays` `:61`; `planEquipmentAllows` `:81`; `isStarterCandidate` `:95`; `scorePlanRecommendation` `:116`; `scoreStarterPlan` `:157`; `getFreeStarterRecommendation` `:186` |
| `src/screens/ProOnboardingScreen.js` | constants `:76-209`; `advanceFrom2` `:888`; `advanceFrom3` `:934`; `advanceFrom4` `:939`; `advanceFrom5` `:954`; `advanceFrom6` `:1202`; `planProfileNow` `:1121`; `runFitAssessment` `:1139`; `applyReminderPreferences` `:1028` |
| `src/lib/onboarding/quizFlow.js` | `ONBOARDING_QUIZ_FIRST = false` `:24`; `QUIZ_STEPS` `:29` |
| `src/screens/PlanPreviewScreen.js` | whole file (unreachable while the flag is false) |

### Generation

| File | Key symbols |
|---|---|
| `src/lib/planAutoGen.js` | `PLAN_WHYTHIS_KEY` `:51`; `makeUniquePlanName` `:60`; `DEFAULT_DAYS_PER_WEEK` `:82`; `buildPlanInputs` `:94`; `readDemonstratedStructure` `:179`; `assessScheduleFit` `:225`; `planShortfallNote` `:277`; `loadGenerationIntent` `:296`; `resolveSeed` `:320`; `equipmentReachable` `:361`; `buildExerciseIndex` `:368`; `loadIncumbentSlots` `:390`; `buildSlotEvidence` `:426`; `canonicalNameSet` `:467`; `reviewedReplacementIds` `:474`; `libraryForReviewedProposal` `:490`; `withContinuity` `:509`; `resolvePlanAgainstLibrary` `:579`; `attachBlockedSlots` `:630`; `generateAndSavePlan` `:657`; `generatePlanDryRun` `:871` |
| `src/lib/planEngine.js` | `computeLandmarks` `:127`; `applyGoalOverlay` `:154`; `enforceWeeklyFloorsAndCaps` `:365`; `POOL` `:525`; `MIN_GENERATED_PER_MUSCLE` `:708`; `normaliseFamilies` `:724`; `buildEffectivePool` `:742`; `SUBREGION_REQUIREMENTS` `:791`; `makeEx` `:867`; `estimateSessionMinutes` `:915`; `clampDeliveredToMRV` `:937`; `trimToTimeBudget` `:1017`; `computeStructuralFloors` `:1242`; `divisionGoalFor` `:1325`; `filterPool` `:1330`; `capForEntry` `:1382`; `numExHint` `:1396`; `selectExercisesForMuscle` `:1415`; `sortScore` `:1551`; `SELECTION_REASON` `:1830`; `selectSplit` `:1857`; `buildSession` `:1924`; split builders `:1973-2266`; `DIVISION_MATRIX` `:2268`; `buildFromMatrix` `:2493`; `buildWhyThis` `:2693`; `buildDivisionCoverage` `:3081`; `generatePlan` `:3100`; `_generatePlanInner` `:3124` |
| `src/lib/poolGenerator.js` | `deriveParamKey` `:23`; `SUBREGION_TRANSLATION` `:36`; `DEFAULT_SUBREGION` `:66`; `translateSubregion` `:83`; `parseProfiles` `:104`; `toPoolEntry` `:113`; `isHypertrophyExercise` `:148`; `generatePoolFromLibrary` `:159`; `findThinMuscles` `:179` |
| `src/lib/exercise/generation.js` | `GENERATION_BLOCK` `:36`; `generationBlockReason` `:55`; `filterLibraryForGeneration` `:104`; `generationBlockFor` `:158` |
| `src/lib/exercise/intent.js` | `loadExerciseIntentState` `:70`; `findPlanIntentConflicts` `:134`; `isExcluded` `:173`; `isAvoidedThisBlock` `:182`; `isEligible` `:197`; `familyTargetKey` `:226`; `movementFamilyOf` `:242`; `isPatternAvoided` `:254`; `isFamilyBlocked` `:271`; `isEligibleExercise` `:286`; `PATTERN_AVOID_DAYS` `:299`; `listActiveMovementConstraints` `:316` |
| `src/lib/exercise/movementConstraints.js` | `setMovementPatternAvoid` `:28`; `clearMovementPatternAvoid` `:48` |
| `src/lib/exercise/movementFamily.js` | `FAMILY` `:80`; `movementFamily` `:246`; `familyLabel` `:328`; `COVERAGE_ROLES` `:349`; `familySatisfiesRole` `:362` |
| `src/lib/programmeStructureMemory.js` | `structureKey` `:58`; `blockOutcomeFromLedger` (from `:79` header); `structureEvidence` `:165`; `demonstratedStructure` `:203`; `structureMemoryCopy` `:237` |
| `src/lib/planFit.js` | `PLAN_FIT` `:42`; `assessPlanFit` `:98`; `assessDurationOptions` `:165` |

### Library / builder / edit surfaces

| File | Key symbols |
|---|---|
| `src/lib/seedRoutines.js` | `REQUIRED_EXERCISES` `:12`; `LIBRARY_PLANS` `:34`; `seedRoutinesIfNeeded` `:1475` |
| `src/screens/PlanLibraryScreen.js` | `COLLECTIONS` `:35`; `DIVISIONS_MEN/WOMEN` `:47-92`; `QUIZ_STEPS` `:97`; `hasTag` `:122`; `matchesCollection` `:126`; `sortBeginnerFirst` `:144`; `getQuizRecommendation` `:177`; `handleAddToMyPlans` `:357`; `surfaceConflicts` `:503`; `handleConflictReplacement` `:519`; filter logic `:471-490` |
| `src/screens/PlanDetailScreen.js` | `handleAddToMyPlans` `:112`; activate `:151`, `:172` |
| `src/screens/ManualBuilderScreen.js` | `GOALS` `:43`; `DAY_COUNT_OPTIONS` `:54`; `createProgramme` `:362`; `persistDays` writes `:752`, `:762`; activate `:809` |
| `src/screens/PlanUpdateScreen.js` | `buildUpdatedProfile` `:124`; `handleRebuildPress` `:161`; `handleConfirmRebuild` `:215`; `saveLocalProfile` `:246` |
| `src/screens/ProGoalSetupScreen.js` | `updatedProfile` `:270-301`; `saveLocalProfile` `:438`; `generateAndSavePlan` `:456` |
| `src/screens/RoutineDetailScreen.js` | `openAvoidSheet` alert `:403`; `openPatternAvoidSheet` `:429`; `handleSetPatternAvoid` `:469`; `handleExcludeExercise` `:498` |
| `src/screens/AvoidedMovementsScreen.js` | whole file; `untilText` `:38` |
| `src/components/ExercisePickerModal.js` | filter `:216-228`; `handleCreate` `:232` |
| `src/lib/database.js` | `getAllExercises` `:2940`; `addExerciseToRoutine` `:4118`; `updateRoutineExerciseExercise` `:4195`; `createRoutine` `:3813`; `createProgramme` `:3944`; `getLibraryPlans` `:4531`; `copyPlanFromLibrary` `:4560`; `activatePlanWithBlock` `:4399`; `saveUserBodyProfile` `:5985`; `EXERCISE_INTENT` `:9728`; `setExerciseIntent` `:9756`; `getExerciseIntents` (reader with expiry sweep, see §7) |

---

## 4 TABLES & FIELDS

### 4.1 The user profile is NOT a SQLite table

OBSERVED. `userProfile` is a free-shaped JSON blob in AsyncStorage under
`PROFILE_KEY_PFX + userId`, written by `saveLocalProfile`
(`src/store/useAppStore.js:306-317`) and held in Zustand (`:216`). The sync
handler's own header states it: "The user profile lives in useAppStore in
memory (Zustand) backed by AsyncStorage, not in SQLite"
(`src/lib/sync/tables/profiles.js:5-7`).

Keys written by Pro onboarding (`ProOnboardingScreen.js:1324-1359`):
`units, bodyWeightUnits, sex, age, heightCm, weightKg, trainingGoal,
trainingPhase, goalPhase, phaseStartedAt, goalStartDate, trainingFreq,
trainingFreqBucket, daysPerWeek, experience, sessionLengthMinutes, equipment,
recoveryRating, planWeakPoints, proteinApproach, bodyFatPct, bodyFatSource,
goal` (+ `firstName` at `:1360`).

Keys written by free onboarding (`FirstRunScreen.js:93-95`): `units`,
optionally `firstName`.

### 4.2 Local SQLite

| Table | Columns relevant here | Where defined |
|---|---|---|
| `exercises` | `id, name, primary_muscle, secondary_muscles, equipment, movement_pattern, compound_isolation, default_rep_min/max, fatigue_cost, stimulus_to_fatigue_ratio, subregion, is_custom, notes, exercise_type, created_at, updated_at` | `database.js:198-216` |
| `exercises` (added) | `increment_kg`, `exercise_category` `:542-543`; `updated_at_v2`, `deleted_at` `:790-791`; `equipment_category, machine_type, force, laterality, difficulty, machine_ok, home_ok, cue, equipment_profiles` `:1335-1343` (re-issued `:1415-1423`); `exercise_type` `:1569`; `load_semantics` `:2615` | `database.js` |
| `programmes` | `id, user_id, name, description, is_library` base `:262-268`; + `is_active, next_workout_index, tags, split_type, is_archived, difficulty` `:~460-470`; `source_programme_id`; `folder_id` (migration 089) | `database.js` |
| `routines` | `id, user_id, name, description, split_type, is_active, is_library, is_sample, source_routine_id, programme_id, created_at, updated_at` `:~456-470`; + `is_template`, `position` | `database.js` |
| `routine_exercises` | base `id, routine_id, exercise_id, order_in_routine, recommended_sets, recommended_reps_min, recommended_reps_max, notes, created_at, updated_at`; + `starting_weight, rest_seconds, superset_group_id` `:445-447`; `updated_at, deleted_at, exercise_name` `:775-777`; `user_id` `:1135`; `selection_reason` `:2410` | `database.js` |
| `user_body_profile` | `id, user_id UNIQUE, sex, date_of_birth, height_cm, experience_level, training_age_years, primary_goal, gdpr_consented, created_at, updated_at`; + `scoff_score` `:607`, `deleted_at` `:792`, `goal_lock_advanced`, `goal_lock_set_at` `:1111-1112` | `database.js:404-416` |
| `exercise_intent` | `id, user_id, exercise_id (generic TARGET), kind, scope_mesocycle_id, reason, created_at, updated_at, deleted_at, UNIQUE(user_id, exercise_id)` + `expires_at_ms` | `database.js:2192-2203` |
| `mesocycles` | written by `activatePlanWithBlock` `database.js:4399+` (block start/end dates, `planned_weeks`, `deload_week`, `block_ledger`) | — |

**No capability, restriction, limitation, impairment, mobility or assistive
column exists in the local schema.** Search run:
`grep -cnE "(capability|restriction|limitation|impairment|mobility_|assistive)" src/lib/database.js`
→ `0`.

### 4.3 Cloud (Supabase, EU-Dublin)

| Cloud table | Notes | Migration |
|---|---|---|
| `users_profile` (registry name `profiles`) | receives only `first_name, units, training_focus, training_age, primary_equipment, bar_weight, diet_preference, sex, allergen_excludes` + `column_updates_at` | `sync/tables/profiles.js:30-44`; per-column merge from migration 045 (`:9-14`) |
| `user_body_profile` | `sex, date_of_birth, height_cm, experience_level, training_age_years, primary_goal, scoff_score, gdpr_consented, goal_lock_advanced, goal_lock_set_at` | pushed at `sync.js:1330-1357` |
| `programmes` | has `tags, split_type, difficulty, is_archived, next_workout_index` (`supabase/migrate_012_complete_sync.sql:112-117`), `folder_id` (`migrate_089`) | base `supabase/setup_complete.sql:340-351` (stale snapshot) |
| `routines`, `routine_exercises` | `supabase/setup_complete.sql:112`, `:124`; `routine_exercises.selection_reason` added by `migrate_139` | — |
| `exercise_intent` | created by `migrate_136_exercise_intent.sql`; `expires_at timestamptz` added by `migrate_142_exercise_intent_expiry.sql` (applied and verified 2026-08-18 per `supabase/README.md:342`) | 136, 142 |
| `exercises.load_semantics` / `custom_exercises.load_semantics` | four-value CHECK (total / per_hand / assisted / added_bodyweight) | `migrate_143` (applied, `README.md:343`) |

**No capability/restriction table or column exists in the cloud schema.**
Search run: `grep -rnE "(capability|restriction|limitation|impairment|assistive)" supabase/*.sql`
→ 2 files, both unrelated: `migrate_097_deletion_log_anonymise.sql:8`
("storage-limitation", GDPR Art. 5(1)(e)) and
`migrate_121_marketing_hq_tables.sql:239-248` (marketing channel autonomy
`capability` enum).

---

## 5 READERS

| Field | Read by (file:line) |
|---|---|
| `equipment` | `planAutoGen.buildPlanInputs:110`; `planEngine.filterPool:1330-1332`; `planEngine.enforceWeeklyFloorsAndCaps:466`; `estimateSessionMinutes:915-918`; `buildWhyThis:2695,:2759`; `planAutoGen.equipmentReachable:361-367` (via `withContinuity:509`, `:527-533`); `PlanUpdateScreen:97`; `ProGoalSetupScreen:153` |
| `daysPerWeek` | `buildPlanInputs:107`; `_generatePlanInner:3176-3180`; `DIVISION_MATRIX` lookup `:3197`; `demonstratedStructure` day guard `programmeStructureMemory.js:212`; `ProOnboardingScreen.daysToFreqBucket:122`; `buildNutritionEngineInputs` (`ProOnboardingScreen:1305`) |
| `sessionLengthMinutes` | `buildPlanInputs:108`; `fitToTimeBudget` (`planEngine:3361`); `trimToTimeBudget:3390`; `buildTimeConstraintResult:3448`; `planFit.assessPlanFit` |
| `experience` | `buildPlanInputs:106`; `computeLandmarks:127`; beginner day cap `:3180`; difficulty gate `:1478`; assisted gate `:1489`; `baseRir:861`; `selectSplit:1857` |
| `recoveryRating` | `buildPlanInputs:114`; `computeLandmarks:127`; `buildWhyThis:2763-2767` |
| `trainingGoal` (`goal`) | `applyGoalOverlay:3239`; `DIVISION_MATRIX:3197`; `divisionPoolRule` via `filterPool:1334`; `divisionRoleSpecs:1544`; `divisionPriorityMuscles:3324`; `buildDivisionCoverage:3440`; plan name `:3458` |
| `trainingPhase` (`phase`) | `internalGoal` mapping `:3188-3190`; `applyGoalOverlay` `:3239`; weak-point ceiling warning `:3449-3461`; `phaseToNutritionKey` (`planAutoGen:117`) |
| `planWeakPoints` | `resolveWeakPointKeys:3156`; `_weakPointKeys` for `buildSession`/`buildFromMatrix`; `enforceWeeklyFloorsAndCaps:365`; `fitToTimeBudget` weakPointKeys `:3366` |
| `sex` | ED calorie floor + BMR in `nutritionEngine` (via `buildNutritionEngineInputs`, `ProOnboardingScreen:1300`); `saveUserBodyProfile:1413`; cloud profile push `sync/tables/profiles.js:139`. **Not read by `planEngine`.** |
| `exercise_intent` rows | `loadExerciseIntentState` → `filterLibraryForGeneration` (`planAutoGen:680`, `:882`), `generationBlockFor` (`planAutoGen:335`), `buildSlotEvidence` (`planAutoGen:439`), `ExercisePickerModal:225-227`, `ActiveWorkoutScreen:678`, `RoutineDetailScreen:436`, `PlansScreen:281`, `AvoidedMovementsScreen:71`, `PlanLibraryScreen:507` |
| library `tags` | `PlanLibraryScreen.hasTag:122`; `freeStarter.hasTag:54`, `getPlanDays:61`, `planEquipmentAllows:81`, `scorePlanRecommendation:116`, `scoreStarterPlan:157` |
| `programmes.difficulty` | `isStarterCandidate` (`freeStarter.js:96`); `matchesCollection('beginner')` (`PlanLibraryScreen:130`); `DIFFICULTY_LABELS` (`PlanLibraryScreen:194`) |

---

## 6 WRITERS

| Target | Writers |
|---|---|
| `userProfile` blob | `FirstRunScreen:95`; `ProOnboardingScreen:1361`; `PlanUpdateScreen:246`; `ProGoalSetupScreen:381`, `:438`; `SettingsProfileScreen:138`, `:163`, `:182`, `:222`; `SettingsCoachingScreen:54`, `:62`, `:70`; `AthleteProfileScreen:363`, `:376`, `:394`; store setters `useAppStore.js:1908` (units), `:1925` (bodyWeightUnits), `:1944` (dietPreference), `:1966` (mealPlanExcludeTags) |
| `user_body_profile` | `ProOnboardingScreen:1413` (sex, heightCm, dateOfBirth, primaryGoal — **not** experienceLevel); `SettingsProfileScreen:140`, `:165`, `:184` |
| `programmes` / `routines` / `routine_exercises` (generated) | `planAutoGen.generateAndSavePlan:744-784` |
| `programmes` / `routines` / `routine_exercises` (library seed) | `seedRoutines.seedRoutinesIfNeeded:1517-1551` |
| `programmes` / `routines` (library copy) | `copyPlanFromLibrary` `database.js:4560-4600` |
| `programmes` / `routines` / `routine_exercises` (manual) | `ManualBuilderScreen:362`, `:752`, `:762` |
| `routine_exercises.exercise_id` (edit/swap) | `updateRoutineExerciseExercise` `database.js:4195`, called from `RoutineDetailScreen` and `PlanLibraryScreen.handleConflictReplacement:522` |
| `mesocycles` (block) | `activatePlanWithBlock` `database.js:4399` — called from `planAutoGen:812`, `FreeStarterScreen:188`, `PlanLibraryScreen:413`, `PlanDetailScreen:151`/`:172`, `ManualBuilderScreen:809` |
| `exercise_intent` | `setExerciseIntent` `database.js:9756`, reached from `RoutineDetailScreen:502` (per-exercise) and `movementConstraints.setMovementPatternAvoid:28` (family). Cleared by `clearExerciseIntent` / `clearMovementPatternAvoid:48` |
| `@volyume_plan_whythis_<uid>` | `planAutoGen:714` |
| `@volyume_nutrition_targets` | `ProOnboardingScreen:1447`; `ProGoalSetupScreen:421` |

---

## 7 CURRENT INVARIANTS (explicit laws in code / comments / guard tests)

1. **No default number of training days.** "FOUNDER LAW (2026-08-13): there
   is NO default number of training days… The athlete chooses, from two
   upwards, and the step will not advance until they have"
   (`ProOnboardingScreen.js:118-121`); enforced at `:944-948` and `:1944`.
   *But* `buildPlanInputs` back-fills `DEFAULT_DAYS_PER_WEEK = 4`
   (`planAutoGen.js:82`, `:107`) for any profile that lacks it.
2. **Biological sex is required and never defaulted.** `advanceFrom2:894-897`;
   `canContinue:1614`; `SEX_OPTIONS`/`ACCEPTED_SEX_VALUES:131-132`; draft
   restore clamps the step back to 2 on an invalid sex
   (`proOnboarding.sexGate.test.js:44-58`).
3. **Height, weight, age required, no silent fallback.** `ONBOARD-001`
   comment `:152-158`; `advanceFrom2:901-924`; second belt-and-braces check
   before the build that bounces the user back to step 2
   (`ProOnboardingScreen.js:1288-1300`).
4. **Equipment is a hard filter in generation, applied before every
   never-starve fallback.** `filterPool:1330-1345`; asserted in
   `planAutoGen.equipmentContinuity.test.js:6-13`.
5. **`isAutoEligible` (NEVER_AUTO) has no never-starve guard by design.**
   "An empty slot is the better failure" (`planEngine.js:1426-1429`).
6. **Auto-generated plans contain no supersets** (founder ruling,
   `planEngine.js:3396-3410`).
7. **The engine is pure and stateless between runs.** Header
   `planEngine.js:1-5`; `_effectivePool`/`_weakPointKeys` restored in a
   `finally` (`:3100-3121`).
8. **Intent never silently restores an exercise; a fully blocked slot is
   reported.** `exercise/generation.js:12-17`; `attachBlockedSlots`
   `planAutoGen.js:630-645`; `'plan_blocked_by_exclusions'`
   `planAutoGen.js:791-797`, `:938-944`.
9. **Intent reads fail OPEN.** `loadExerciseIntentState` catch
   (`intent.js:113-124`) and `filterLibraryForGeneration` catch
   (`generation.js:137-142`); `unavailable` distinguishes a read failure from
   a clean slate (`intent.js:79-86`, `planAutoGen.js:635-638`).
10. **The intent module can never write.** "campaign9.intent.test.js source
    guard" (`intent.js:60-63`; write side isolated in
    `movementConstraints.js:1-12`).
11. **Preview must equal commit.** `resolvePlanAgainstLibrary` is the single
    resolution both paths run (`planAutoGen.js:569-577`, `:756`, `:958`), and
    the dry run mirrors the zero-match guard (`:934-946`).
12. **Rebuild-first-then-save-profile (FF-002).** `PlanUpdateScreen:215-247`.
13. **One schedule-fit resolver for onboarding and Update Your Plan.**
    `planAutoGen.js:130-145`; used at `ProOnboardingScreen:1146` and
    `PlanUpdateScreen:187`.
14. **The athlete's stated days are senior to their demonstrated history**,
    verified on what was actually built, not on the label
    (`planEngine.js:3265-3275`); and demonstrated structure is only eligible
    at an exact day-count match (`programmeStructureMemory.js:208-212`).
15. **Structure memory never remembers exercise identity**
    (`programmeStructureMemory.js:23-26`).
16. **Family target keys are always prefixed `family:`**, constructed in
    exactly one place (`intent.js:213-227`).
17. **Expired day-bound intents are filtered at read and soft-deleted**
    (`database.getExerciseIntents`, expiry sweep in the reader — see §12.4).
18. **Free/Pro:** `PlanUpdate` and `ProGoalSetup` are `withProGuard`-wrapped
    (`RootNavigator.js:235-236`). `PlanLibrary`, `PlanDetail`, `ManualBuilder`,
    `BuildWorkout`, `RoutineDetail`, `MesocycleBuilder`, `AvoidedMovements`
    are registered unguarded (`RootNavigator.js:474`, `:481`, and the
    non-gated block above `:215`).

---

## 8 CURRENT TESTS

| Suite | What it pins |
|---|---|
| `src/lib/__tests__/proOnboarding.sexGate.test.js` | Source-level guards: `advanceFrom2` blocks a non-male/female sex; step-2 `canContinue` requires an explicit choice; the button is genuinely `disabled`; `sex` state starts `null`; a restored draft with invalid sex clamps back to step 2 (`:24-58`) |
| `src/lib/__tests__/proOnboarding.heightGate.test.js` | The ONBOARD-001 height gate |
| `src/lib/__tests__/proOnboardingDraft.test.js` | Wizard draft save/restore |
| `src/lib/__tests__/identityGate.proOnboarding.test.js` | Identity invariant on the wizard |
| `src/screens/__tests__/ProOnboardingScreen.notificationPrefs.guard.test.js`, `.polish.guard.test.js`, `.oauthErrorCopy.guard.test.js` | Reminder prefs dual-write, copy/polish, OAuth error copy |
| `src/lib/onboarding/__tests__/freeStarter.test.js` | Deterministic starter mapping; difficulty-0 only; equipment as a HARD filter, with decoys (`:1-7`) |
| `src/lib/onboarding/__tests__/planPreview.test.js` | Pre-account preview builder |
| `src/lib/__tests__/planAutoGen.test.js` | `buildPlanInputs` default back-fill for partial/legacy profiles (`:1-7`) |
| `src/lib/__tests__/planAutoGen.equipmentContinuity.test.js` | Equipment loss survives the continuity/rebuild layer; documents that `filterLibraryForGeneration` has no equipment logic (`:1-27`) |
| `src/lib/__tests__/planAutoGenErrorReporting.guard.test.js` | No raw exception text reaches the user |
| `src/lib/exercise/__tests__/campaign9.generation.test.js` | The founder's generation laws: excluded exercises are not seeded; block-scope expiry; the POOL fallback cannot smuggle an excluded name back in; a blocked slot is reported; a no-intent user generates byte-identically (`:1-22`) |
| `src/lib/exercise/__tests__/campaign9.intent.test.js` | The read layer can never reach a DB write |
| `src/lib/exercise/__tests__/campaign9.closeout.test.js` | Plan-intent conflict reporting after copying a plan |
| `src/lib/__tests__/planEngine.test.js`, `planEngineGoalBias.test.js`, `planEngineSessionCap.test.js`, `planEngineSecondaryMuscle.test.js`, `planengineStructuralVolume.test.js`, `planengineLandmarkSource.test.js`, `planengineRebuildPhase{1,2,3,3e,4}.test.js`, `planengineFullVerification.test.js` | Engine structure, scoring, per-entry caps, volume floors/caps |
| `src/lib/__tests__/planengineDayClamp.test.js` | 2 days produces exactly 2 sessions ("Do NOT silently clamp 2 → 3"); 1 and 7 clamp (`:1-24`) |
| `src/lib/__tests__/planEngineLibraryPool.test.js` | Library-derived pool selection, determinism, no `_effectivePool` leak, thin-library fallback (`:1-7`) |
| `src/lib/__tests__/poolGenerator.test.js` | Pool derivation from the library |
| `src/lib/__tests__/campaign16.planFit.test.js`, `campaign16.planFitResolver.test.js` | Schedule-fit states and the single resolver |
| `src/lib/__tests__/programmeStructureMemory.test.js` + `.production.test.js` | Pure structure logic, and (production suite) that the reader works on the shapes the app really stores (`:1-27`) |
| `src/lib/__tests__/engine-invariants.test.js`, `engineRobustness.fuzz.test.js` | No throws / NaN / out-of-bounds on fuzzed inputs |
| `src/lib/__tests__/planExercisePlacement.audit.test.js`, `planDiff.test.js`, `planDisplay.test.js` | Placement audit, rebuild diff, display |
| `src/screens/__tests__/PlanLibraryScreen.emptyState.guard.test.js`, `.quizBottomSheet.guard.test.js` | Library empty/error state and quiz sheet |
| `src/screens/__tests__/PlanUpdateScreen.errorCopy.guard.test.js`, `PlansScreen.*.guard.test.js`, `PlanDetailScreen.reorder.guard.test.js`, `FirstRunScreen.errorCopy.guard.test.js`, `HomeScreen.planGenErrorCopy.guard.test.js` | Copy and hierarchy guards on the plan surfaces |

**No test in this domain asserts anything about capability, position,
restriction provenance, or non-equipment exercise suitability.**

---

## 9 REUSABLE INFRASTRUCTURE (factual)

Mechanisms that already exist and are load-bearing in this domain:

1. **A typed, user-scoped, target-generic intent store.**
   `exercise_intent` reuses `exercise_id` as a generic target column and
   already carries three kinds, a block scope, an optional free-text
   `reason`, and a millisecond expiry (`database.js:2192-2203`;
   `EXERCISE_INTENT` `:9728-9738`). Family targets use the `family:` prefix
   built in exactly one place (`intent.js:213-227`). Cloud half is live
   (`migrate_136`, `migrate_142`; `supabase/README.md:342`).
2. **A single pure eligibility question** that every generator, picker and
   swap sheet already routes through: `isEligibleExercise(state, exercise)`
   (`intent.js:286-290`), a strict superset of the id-level check.
3. **A pre-engine library filter with a machine-readable drop report.**
   `filterLibraryForGeneration` returns `{ library, droppedIds,
   droppedNames, dropped, reasonById, reasonByName }`
   (`generation.js:93-136`); the engine stays pure because the decision
   happens on the library it is handed (`:19-21`).
4. **A post-engine re-check for name-based reintroduction.**
   `generationBlockFor` (`generation.js:158-169`) called from `resolveSeed`
   (`planAutoGen.js:335`).
5. **A blocked-slot reporting contract already rendered by two screens.**
   `{ blockedByIntent, needsChoice, blockedCount, blockedSlots[] }`
   (`planAutoGen.js:630-645`), with `blockedSlots` carrying
   `{ exerciseId, exerciseName, reason, workoutName, position }`
   (`planAutoGen.js:600-607`).
6. **A shared functional vocabulary already exists for movements**:
   `FAMILY` (18 keys, `movementFamily.js:80-104`), `familyLabel` for calm
   non-clinical copy (`:328-331`), and `COVERAGE_ROLES` /
   `familySatisfiesRole` separating "same movement" from "covers the job"
   (`:349-372`).
7. **A constraint list surface with per-row removal**, already free-tier and
   already reading the same state: `AvoidedMovementsScreen` +
   `listActiveMovementConstraints` (`intent.js:316-341`), entry point
   `PlansScreen.js:1522`, badge count `:276-282`.
8. **A read-only generation dry run** with the same intent and continuity
   passes as the commit: `generatePlanDryRun` (`planAutoGen.js:871-975`),
   and `assessScheduleFit` which "writes nothing: no programme, no routine,
   no draft, no AsyncStorage" (`planAutoGen.js:140-143`).
9. **A per-slot selection-reason code that survives persistence.**
   `SELECTION_REASON` (`planEngine.js:1830-1848`), written to
   `routine_exercises.selection_reason` (`planAutoGen.js:775-781`;
   `database.js:2410`; cloud `migrate_139`).
10. **A plan-conflict reporter for installed plans.**
    `findPlanIntentConflicts(planId, state)` (`intent.js:134-165`), rendered
    with a replacement picker at `PlanLibraryScreen.js:503-526`.
11. **A per-field write-timestamp mechanism for profile columns** with a
    server-side safe-merge trigger (`sync/tables/profiles.js:9-14`;
    `PROFILE_FIELDS_TRACKED` `useAppStore.js:58-78`).
12. **An equipment reachability predicate exported for direct testing**,
    failing open on unknown: `equipmentReachable` (`planAutoGen.js:349-367`).
13. **A never-starve gate idiom** used four times in selection (canonicality,
    difficulty, assisted, division rule) — a preference applied only while
    enough options remain (`planEngine.js:1466-1494`, `:1344`).

---

## 10 PLAN LIBRARY

### 10.1 Where defined, and structure

OBSERVED. One JS array, `LIBRARY_PLANS`, `src/lib/seedRoutines.js:34-1470`.
31 plans. Per plan: `name`, `description` (prose, carries the progression
rule), `tags` (single space-separated string), `difficulty` (0/1/2),
`workouts[]`. Per workout: `name`, `exercises[]`. Per exercise: `name`
(string, matched to the catalogue by name at seed time), `sets`, `repsMin`,
`repsMax`, `rest`, `notes`.

There is no structured progression model: the rule lives in prose, e.g.
"Add a rep each session; once you hit the top of the rep range, add a little
weight and start again" (`:38`) and "Add weight each session (2.5 kg on
compound barbell lifts)" (`:68`). `splitType` is referenced at `:1523`
(`plan.splitType || null`) but **no plan in the array defines it** — grep for
`splitType:` inside `LIBRARY_PLANS` returns nothing, so every seeded library
plan has `split_type = NULL`.

24 exercises the plans need but the base exercise seed may lack are inserted
first (`REQUIRED_EXERCISES`, `:12-31`). A name that still cannot be resolved
is skipped with a warning and the plan installs one exercise shorter
(`:1546-1549`).

### 10.2 Tag vocabulary (complete, verbatim from the 31 plans)

Structured (prefixed): `gender:men|women|all`; `goal:build_muscle|
get_stronger|conditioning|stage_prep`; `days:2|3|4|5|6`;
`equipment:dumbbell|bodyweight`; `audience:beginner|masters`;
`category:division`; `division:mens_physique|bikini|wellness|
classic_physique|figure|womens_physique|womens_bodybuilding|
mens_bodybuilding`.

Unprefixed: `featured`, `beginner`, `intermediate`, `advanced`, `short`,
`aesthetic`, `bodybuilding`, `upper`, `full_body`, `upper_lower`, `ppl`,
`bro_split`, `minimalist`, `strength`, `weak_point`, `home`, `barbell`,
`v_taper`, `width`, `glutes`, `hamstrings`, `quads`, `legs`, `back`,
`chest`, `shoulders`, `arms`.

Note the equipment axis is only ever `equipment:dumbbell` and
`equipment:bodyweight` (2 plans out of 31 carry an equipment tag at all);
everything else is implicitly full-gym.

### 10.3 Browse and filtering mechanics

OBSERVED. Eight collection chips (`PlanLibraryScreen.js:35-44`), each a
substring test over the tag string (`matchesCollection:126-135`), plus a
nine-division grid under the `division` chip (`:47-92`, `:472-476`) and a
free-text search over `name + description + tags` (`:473-476`). Default
ordering is beginner-first (`sortBeginnerFirst:144-151`) over
`getLibraryPlans()`'s `created_at ASC` (`database.js:4531-4535`).

A two-question quiz (goal, equipment — `QUIZ_STEPS:97-118`) yields one
recommendation via `getQuizRecommendation` (`:177-189`), which applies
`planEquipmentAllows` as a HARD filter then `scorePlanRecommendation` with
`includeDivisions: true`. The three-question free-starter quiz shares the
same two helpers (`freeStarter.js:81`, `:116`) and adds a difficulty-0 gate
(`isStarterCandidate:95-98`).

### 10.4 Installation — what it writes

OBSERVED. Three entry points, all ending in `copyPlanFromLibrary`:

- `PlanLibraryScreen.handleAddToMyPlans:357-430` — a three-button alert
  ("Cancel" / "Save for later" / "Add and start this plan"); the second
  branch also runs `confirmPlanSwitchMidBlock` and `activatePlanWithBlock`
  (`:410-413`). **Only this entry point calls `surfaceConflicts`**
  (`:391`, `:418`, defined `:503-517`).
- `PlanDetailScreen.handleAddToMyPlans:112-160` — same two outcomes,
  `copyPlanFromLibrary` at `:129`/`:144`, `activatePlanWithBlock` at `:151`.
  **No conflict surfacing on this path** (`findPlanIntentConflicts` does not
  appear in the file).
- `FreeStarterScreen.handleStartPlan:133-199` — dedup, copy, activate,
  `completeFirstRun`. **No conflict surfacing.**

`copyPlanFromLibrary` (`database.js:4560-4600`) writes a new `programmes`
row with only `(userId, name, description, is_library=0)`, then stamps
`source_programme_id`, then duplicates every routine with `is_library = 0`,
`is_template = 0`, `source_routine_id`, and `position = loop index`.
**`tags`, `split_type` and `difficulty` are not carried onto the copy** —
so all browse metadata is lost the moment a plan is installed.

`activatePlanWithBlock` (`database.js:4399+`) sets the active plan, may
derive a learned seed ledger for Pro (`:4422-4436`), and inserts one
`mesocycles` row with `BLOCK_PLANNED_WEEKS` weeks and a deload week.

### 10.5 Do library plans and generated plans share one storage model?

OBSERVED: **Yes.** Both are `programmes` → `routines` → `routine_exercises`,
and both are consumed identically by `PlanDetailScreen`, `RoutineDetailScreen`,
`HomeScreen` and `ActiveWorkoutScreen`. The only differences are provenance
flags (`is_library`, `is_sample`, `source_programme_id`, `source_routine_id`)
and the columns generation fills that a copy does not
(`routine_exercises.selection_reason`, written only by
`planAutoGen.js:775-781`).

### 10.6 Could a library routine carry capability/position metadata today?

**No — checked and absent.** Searches run this session:

- `grep -nE "tags: '.*(seated|standing|wheelchair|adaptive|accessible|chair|no_floor|floor|limb|amput|para|injur|pain|mobility)" src/lib/seedRoutines.js` → **0 matches**.
- `grep -rniE "body_position|bodyPosition|requires_standing|requiresStanding|requires_floor|floorRequired|posture|capability_profile|capabilityProfile|wheelchair|seated_only|seatedOnly|grip_required|gripRequired" src/ supabase/ --include=*.js --include=*.sql` → no capability hits (`posture` matches are unrelated prose; `body_position_changed` is a progress-photo alignment code, `src/lib/progressScanResultsContract.js:192`).
- `grep -cnE "(capability|restriction|limitation|impairment|mobility_|assistive)" src/lib/database.js` → **0**.
- `grep -rniE "accessib" src/lib/exercise/ src/lib/planEngine.js src/lib/planAutoGen.js src/lib/poolGenerator.js src/lib/seedRoutines.js src/lib/seedExercises.js` → **0**.

The `programmes.tags` column is free text (`database.js` ALTER
`'ALTER TABLE programmes ADD COLUMN tags TEXT'`), so a tag *could*
mechanically be added; but it is not synced (§13.2) and it is not copied
onto an installed plan (§10.4), so a capability tag on a library plan would
not survive installation today.

The only position-like words that exist anywhere are inside **exercise
names** ("Seated Cable Row", "Standing Calf Raise (Machine)", "Prone Leg
Curl", "Half-Kneeling Cable Row" — e.g. `seedExercises.js:61`, `:216`,
`:180`, `:417`). They are strings, not queryable metadata.

### 10.7 Free/Pro gating on library and builder surfaces

OBSERVED. `withProGuard` call sites are enumerated at
`RootNavigator.js:215-255`. Of the plan surfaces, only **`PlanUpdate`**
(`:236`) and **`ProGoalSetup`** (`:235`) are wrapped. `PlanLibrary`,
`PlanDetail`, `RoutineDetail`, `ManualBuilder`, `BuildWorkout`,
`MesocycleBuilder` and `AvoidedMovements` are registered without a guard.

In-screen tier checks exist only in `PlansScreen`: the "adjust" intent
redirects free users to the upgrade flow (`:469-470`, `:1423`), block advice
is Pro-only (`:342`, `:391`, `:404`), and the action-card set differs by tier
(`:1032`). `PlanLibraryScreen` contains no tier read at all (its only "tier"
occurrence is the word "tier-blind" in a comment, `:377`).

---

## 11 CONFLICTS WITH NEW SYSTEM (factual friction points)

1. **The only user-facing "can I do this?" axis is a six-value equipment
   enum.** `EQUIPMENT_OPTIONS` = `full_gym | machines_cables | dumbbells_only
   | barbell_plates | home_gym | bodyweight`
   (`ProOnboardingScreen.js:189-196`); the same six are the `eq` vocabulary
   the pool filters on (`planEngine.js:1332`; `PROFILES_BY_CATEGORY`
   `exerciseMetadata.js:66-78`). There is no axis for body position,
   grip, balance, floor transfer, laterality requirement or range.
2. **`exercises.laterality` exists but is not read by generation.** The
   column is added (`database.js:1338`) and derived from the NAME by regex
   (`exerciseMetadata.js:152-157`: `UNILATERAL_RE.test(name) ? 'unilateral'
   : 'bilateral'`), but `laterality` appears nowhere in `planEngine.js`,
   `planAutoGen.js` or `poolGenerator.js` (`toPoolEntry` does not carry it,
   `poolGenerator.js:113-135`).
3. **The generator explicitly tells the user its output is safe.**
   `buildWhyThis` writes: "Exercises were selected for {equipment}. Every
   lift in the plan is available **and safe to perform** with the equipment
   you specified, with no substitutions needed."
   (`planEngine.js:2759`). Equipment reachability is the only thing actually
   checked.
4. **A free user has no stored capability-relevant state at all**, because
   the free path persists only `units` and `firstName`
   (`FirstRunScreen.js:93-95`) and the free quiz answers are discarded
   (`FreeStarterScreen.js`, no `saveLocalProfile`). Any free-tier
   capability feature has nowhere to read from today.
5. **Equipment and days are Pro-only to EDIT.** The only screens that write
   `equipment`, `daysPerWeek`, `experience`, `sessionLengthMinutes`,
   `recoveryRating` are `ProOnboardingScreen`, `PlanUpdateScreen` (Pro-gated)
   and `ProGoalSetupScreen` (Pro-gated). `SettingsProfileScreen` edits only
   firstName, sex, height, age, diet (`:204-317`).
6. **`buildPlanInputs` silently substitutes `full_gym` and 4 days** for any
   profile missing them (`planAutoGen.js:107-110`). `HomeScreen.js:2238`
   calls `generateAndSavePlan(user.id, userProfile)` with the raw profile,
   so a partially-populated profile generates a full-gym 4-day plan.
7. **Library installation bypasses every filter.** `copyPlanFromLibrary`
   applies no equipment filter and no intent filter; conflicts are only
   *reported*, only for id-level intents, and only from one of the three
   install entry points (§10.4, §11.8).
8. **`findPlanIntentConflicts` uses `isEligible`, not `isEligibleExercise`**
   (`intent.js:151`). A plan whose exercises are all fine individually but
   whose whole movement FAMILY is under an active PATTERN_AVOID installs with
   **no conflict reported at all** — the family check exists
   (`isEligibleExercise:286`) and is simply not used on this path.
9. **PATTERN_AVOID is day-bound-or-block-bound-or-indefinite, with one row
   per family and no history.** `UNIQUE(user_id, exercise_id)`
   (`database.js:2203`) plus upsert-on-target
   (`setExerciseIntent:9756-9784`) means setting a new duration replaces the
   old one and the previous state is unrecoverable.
10. **The three PATTERN_AVOID kinds collapse to one question at the
    generation seam.** `isFamilyBlocked` ORs all three (`intent.js:271-275`)
    and `isEligibleExercise` calls it; only `generationBlockReason`
    (`generation.js:60-68`) and `listActiveMovementConstraints`
    (`intent.js:316-341`) preserve which kind is live.
11. **"Dislike" and "can't" are the same record.** `EXERCISE_INTENT.EXCLUDED`
    is documented as "'Don't suggest this exercise' - indefinite"
    (`database.js:9729`) and is what "avoid this movement pattern
    indefinitely" writes (`movementConstraints.js:36-38`). The user-facing
    copy is preference-framed throughout ("This only changes what Volyume
    offers you", `RoutineDetailScreen.js:405`).
12. **Library browse metadata cannot express capability and would not
    survive installation even if it could** (§10.4, §10.6).
13. **The manual builder has no capability or equipment awareness**: the
    picker's equipment chip is a manual browse filter starting empty
    (`ExercisePickerModal.js:105`) and matches loosely on strings
    (`exerciseDisplay.matchesEquipmentFilter`), not on the user's profile.
14. **Onboarding has no place to put a constraint.** All six steps are
    accounted for (§2.3); adding a capability step means changing
    `TOTAL_STEPS`, `STEP_LABELS` and `STEP_OUTCOMES`
    (`ProOnboardingScreen.js:76-105`) and the draft-restore step clamp
    (`:709-726`), which is guarded by `proOnboarding.sexGate.test.js:44-58`.
15. **Doc drift in the map this campaign was told to use.**
    `docs/exercise-intelligence-2026-08-12/EXERCISE-SELECTION-ARCHITECTURE.md`
    was written against commit `2177030e` (`:3`) and its line numbers no
    longer hold. Verified drift: `selectExercisesForMuscle` cited at
    `planEngine.js:1216`, actually `:1415`; equipment filter cited `:1135`,
    actually `filterPool:1330-1332`; `sortScore` cited `:1264`, actually
    `:1551`; `generatePoolFromLibrary` cited `poolGenerator.js:138`, actually
    `:159`; `generateAndSavePlan` cited `planAutoGen.js:123`, actually `:657`;
    `addExerciseToRoutine` cited `database.js:3571`, actually `:4118`;
    `updateRoutineExerciseExercise` cited `:3624`, actually `:4195`;
    `activatePlanWithBlock` cited `:3780`, actually `:4399`; `getAllExercises`
    ORDER BY cited `:2429`, actually `:2943`; `handleOpenSwap` cited
    `ActiveWorkoutScreen.js:805`, actually `:1012`. The doc also predates
    PATTERN_AVOID entirely (it lists only two intent kinds in its
    `loadExerciseIntentState` sketch, `:128-135`). **The mechanisms it
    describes are still accurate; only the coordinates and the C31 additions
    are stale.**
16. **`planAutoGen.js`'s own header is stale.** It says the module is shared
    by "ProOnboardingScreen.advanceFrom4 (initial creation)"
    (`planAutoGen.js:6`) — generation actually runs in `advanceFrom6`
    (`ProOnboardingScreen.js:1487`) since the step renumbering at `:70-76`.

---

## 12 PROVENANCE RISKS

Places where forced or temporary behaviour is indistinguishable from free
choice in today's data.

1. **`equipment` cannot distinguish "this is my gym" from "this is what I
   can use".** A wheelchair user who selects `machines_cables` because they
   cannot use free weights, and a person training in a machine-only gym,
   produce byte-identical profiles (`ProOnboardingScreen.js:189-196` →
   `planEngine.js:1332`). Every downstream consumer — plan generation,
   `equipmentReachable`, the continuity `equipmentLost` verdict
   (`planAutoGen.js:439-441`), the whyThis copy (`planEngine.js:2759`) — reads
   it as an availability fact.
2. **`daysPerWeek`, `sessionLengthMinutes` and `recoveryRating` cannot
   distinguish preference from constraint.** `recoveryRating: 'poor'` is
   offered as "Often sore, disrupted sleep, high life stress"
   (`ProOnboardingScreen.js:198-202`) and is consumed purely as a volume
   multiplier (`REC_MULT`, `planEngine.js:100`); a chronic condition and a
   bad month are the same value.
3. **The three PATTERN_AVOID durations are the only provenance signal, and
   two of them are borrowed kinds.** "Indefinitely" writes
   `EXCLUDED` and "For this block" writes `AVOIDED_BLOCK`
   (`movementConstraints.js:31-38`) — the exact same rows a user gets from
   "Stop suggesting this exercise" (`RoutineDetailScreen.js:410-415`). A
   permanent functional impossibility and a passing dislike are the same
   record with the same `kind`.
4. **Expired constraints are destroyed, not archived.**
   `getExerciseIntents` filters rows whose `expires_at_ms <= now` out of the
   result AND fires an `UPDATE exercise_intent SET deleted_at = ?` for them
   (reader in `database.js`, expiry sweep block). Once a 30-day avoidance
   lapses, nothing records that it ever existed, so no consumer can later
   ask "was this block trained under a restriction?".
5. **`exercise_intent.reason` is never written by any live path.** The column
   exists locally (`database.js:2192-2203`) and in the cloud
   (`migrate_136`), `setExerciseIntent` accepts it
   (`database.js:9756`) and `setMovementPatternAvoid` forwards it
   (`movementConstraints.js:28-44`), but the only two UI callers pass no
   reason: `RoutineDetailScreen.js:502-504` (per-exercise) and `:474`
   (pattern). So every stored constraint's reason is `NULL`.
6. **Nothing stamps a plan, block, routine or set with the constraint state
   it was created under.** `routine_exercises` carries `selection_reason`
   (`planAutoGen.js:775-781`) whose vocabulary is
   `REQUIRED_ROLE | COVERAGE_FALLBACK | FAMILY_DIVERSITY | VOLUME_FILL |
   ONLY_OPTION` (`planEngine.js:1830-1848`) — programming reasons, never
   constraint reasons. `blockedSlots` are reported to the caller and
   discarded after the toast/sheet.
7. **The profile blob is overwritten in place with no history.**
   `saveLocalProfile` does `AsyncStorage.setItem(PROFILE_KEY_PFX + userId,
   JSON.stringify(profile))` (`useAppStore.js:306-309`). The only versioning
   anywhere is `userProfileFieldUpdatedAt`, a per-field *last-write*
   timestamp for **10 fields only** (`PROFILE_FIELDS_TRACKED`,
   `useAppStore.js:58-78`) — `equipment`, `daysPerWeek`, `experience`,
   `sessionLengthMinutes`, `recoveryRating`, `trainingGoal`, `trainingPhase`
   and `planWeakPoints` are not among them, and it is a timestamp, not a
   history.
8. **A library plan installed under a constraint carries no trace of it.**
   `copyPlanFromLibrary` records `source_programme_id` only
   (`database.js:4570-4573`).
9. **Structure memory inherits all of the above.** `readDemonstratedStructure`
   judges a past block productive/unproductive from its ledger
   (`planAutoGen.js:179-215`) with no way to know the block ran under a
   temporary restriction; `demonstratedStructure` then proposes that
   structure back (`programmeStructureMemory.js:203-229`).
10. **Free-tier answers vanish.** The three free-starter answers (goal,
    equipment, days) exist only in React state
    (`FreeStarterScreen.js:43`) and are gone the moment the screen unmounts.

---

## 13 SYNC / MIGRATION ISSUES

1. **The generator's entire input set is device-local.** The cloud profile
   push carries exactly nine fields — `first_name, units, training_focus,
   training_age, primary_equipment, bar_weight, diet_preference, sex,
   allergen_excludes` (`sync/tables/profiles.js:30-44`). Confirmed absent:
   `grep -rn "daysPerWeek\|recoveryRating\|planWeakPoints\|sessionLengthMinutes" src/lib/sync.js src/lib/sync/` → **no matches**. Note
   `primary_equipment` is a DIFFERENT key from the generator's `equipment`
   (`useAppStore.js:63` vs `ProOnboardingScreen.js:1349`).
2. **A fresh device rebuilds a profile without any generator input.** The
   hydration path constructs `{ firstName, trainingFocus, trainingAgeYears,
   primaryEquipment, units, barWeight, trialState, proTrialEndsAt, sex }`
   (`useAppStore.js:992-1010`) and flags it `_profileBlobRebuilt`
   (`:1014`). `equipment`, `daysPerWeek`, `experience`,
   `sessionLengthMinutes`, `trainingGoal`, `trainingPhase`, `planWeakPoints`,
   `recoveryRating` are all absent. A regeneration on that device would go
   through `buildPlanInputs`' defaults (§11.6).
3. **`user_body_profile.experience_level` is pushed but never written by
   onboarding.** `_pushUserBodyProfile` sends `experience_level:
   p.experienceLevel ?? null` (`sync.js:1339`), but
   `ProOnboardingScreen.js:1413-1418` writes only `sex, heightCm,
   dateOfBirth, primaryGoal`.
4. **`programmes.tags`, `split_type`, `difficulty`, `next_workout_index` are
   local-only, by documented design.** `_pushProgrammes` omits them
   (`sync.js:819-835`) and `insertProgrammeFromCloud`'s UPDATE never names
   them, with the reason stated in the comment: "local-only columns (tags,
   split_type, next_workout_index, difficulty, deleted_at) survive untouched
   because the UPDATE never names them" (`database.js:406-415` of that
   function, i.e. `database.js:8406-8415`). The cloud columns DO exist
   (`migrate_012_complete_sync.sql:112-117`).
5. **Library plans are per-device seeded but DO sync.** They are created with
   `user_id = <seeding user>` and `is_library = 1`
   (`seedRoutines.js:1517-1525`) and `_pushProgrammes` sends
   `is_library: !!p.isLibrary` (`sync.js:822`). Dedup on re-seed is by NAME
   only (`seedRoutines.js:1512`, rationale `:1507-1511`), and the seed marker
   is a device-local AsyncStorage key (`:9`).
6. **Exercise ids are rewritable at sync time.** REPORTED at
   `EXERCISE-SELECTION-ARCHITECTURE.md:85-93` ("`_pullExercises` remaps local
   ids to cloud ids when the names match but the ids differ, rewriting
   references in `routine_exercises`, `workout_sets`, `exercise_user_notes`
   and `exercise_goals`") with the consequence stated: "any new per-exercise
   table must join that remap list or a cross-device id collision orphans
   every exclusion the user ever set." **NOT re-verified this session** — the
   remap code was not read (see §15).
7. **Family-target intent rows are immune to the id remap by construction**,
   because their target is `family:<key>`, not an exercise id
   (`intent.js:213-227`; `migrate_142` header lines 10-21). OBSERVED for the
   key construction; the remap side is unverified (item 6).
8. **Cloud/local timestamp unit mismatch on the intent expiry is handled in
   the sync layer.** Local `expires_at_ms` INTEGER vs cloud `expires_at`
   timestamptz, converted on push/pull
   (`supabase/migrate_142_exercise_intent_expiry.sql:22-36`).
9. **Migration ledger status for this domain (from `supabase/README.md`):**
   136 exercise_intent LIVE; 139 `routine_exercises.selection_reason` LIVE
   (`README.md:339`); 142 `exercise_intent.expires_at` applied and verified
   2026-08-18 (`:342`); 143 `load_semantics` applied and verified (`:343`).
   `migrate_144_apple_review_password_reset.sql` exists on disk. **Conflict:**
   `CLAUDE.md` §STATUS says "133 files, highest `migrate_136`" and "132-135
   written and awaiting the phrase" — the on-disk set runs to
   `migrate_144` and the README ledger records 137-143 as live. The README
   is the ledger the repo names as authority; `CLAUDE.md` is stale. (Already
   noted by the campaign log, `_CAMPAIGN-LOG.md` Log entry 2026-08-20.)
10. **`setup_complete.sql` and `schema.sql` are stale snapshots** and
    disagree with the migrations (e.g. `setup_complete.sql:373-385` defines
    `user_body_profile` with `birth_date`/`biological_sex`/`activity_level`,
    which is not the shape the client pushes at `sync.js:1334-1354`).
    `CLAUDE.md` already states migrations are canonical.

---

## 14 ANSWERS TO SPECIFIC QUESTIONS

### Q1 — Exact generator input list, with the signature chain

**Chain (Pro onboarding):**

```
ProOnboardingScreen.advanceFrom6()                       ProOnboardingScreen.js:1202
  └─ planProfileNow()                                                        :1121
  └─ generateAndSavePlan(user.id, planProfile)                               :1487
       planAutoGen.generateAndSavePlan(userId, profile, {ledger,
              allowLearnedCarry, continuityProposal})              planAutoGen.js:657
         ├─ buildPlanInputs(profile)                                          :94
         ├─ getAllExercises()                                    database.js:2940
         ├─ loadGenerationIntent(userId)                                     :296
         │    └─ getActiveBlock(userId) → loadExerciseIntentState(userId,
         │         {activeMesocycleId})                             intent.js:70
         ├─ filterLibraryForGeneration(allExercises, intentState) generation.js:104
         ├─ libraryForReviewedProposal(filteredLibrary, replacementIds)      :490
         ├─ readDemonstratedStructure(userId, inputs.daysPerWeek)            :179
         └─ generatePlan({...inputs, demonstratedStructure,
                exerciseLibrary, canonicalNames})               planEngine.js:3100
              └─ _generatePlanInner(inputs)                                 :3124
```

Other entry points: `PlanUpdateScreen.handleConfirmRebuild:227` and
`ProGoalSetupScreen:456` (same signature, profile from
`buildUpdatedProfile:124` / `updatedProfile:270`); `HomeScreen.js:2238`
passes the raw `userProfile`; `generatePlanDryRun(userId, profile,
{continuityProposal})` (`planAutoGen.js:871`) and
`assessScheduleFit(profile, {userId, durationOptions, dayOptions})`
(`:225`) are the read-only twins.

**The profile object handed in** (`planProfileNow`,
`ProOnboardingScreen.js:1121-1132`): `experience, daysPerWeek,
sessionLengthMinutes, equipment, trainingGoal, trainingPhase, planWeakPoints,
recoveryRating`.

**The engine input object** (`buildPlanInputs` output,
`planAutoGen.js:106-118`) — this is the complete list the engine ever sees
from the caller:

| Key | Source | Default if missing |
|---|---|---|
| `experience` | profile | `'intermediate'` |
| `daysPerWeek` | profile | `4` (`DEFAULT_DAYS_PER_WEEK:82`) |
| `sessionLengthMinutes` | profile | `60` |
| `equipment` | profile | `'full_gym'` |
| `goal` | `profile.trainingGoal` | **required** — `null` return if absent (`:95`) |
| `phase` | `profile.trainingPhase` | `'maintain'` |
| `weakPoints` | `profile.planWeakPoints` | `[]` |
| `recoveryRating` | profile | `'average'` |
| `nutritionPhase` | `phaseToNutritionKey(phase)` | derived |

Plus three added by `generateAndSavePlan` at the call site (`:703-708`):
`demonstratedStructure`, `exerciseLibrary`, `canonicalNames`.

`_generatePlanInner` also destructures `trainingAge` (unused, `:3127`),
`nutritionContext` (passed through to the output, `:3135`, `:3470`) and
`age` (`:3134`, consumed by `computeLandmarks`' `ageMultipliers:115`) —
none of which `buildPlanInputs` supplies, so on every production path they
are `undefined`/`null`.

### Q2 — Where does exercise filtering happen, and what is the filter's data contract?

Six distinct filtering points on the generation path, in execution order:

| # | Where | Predicate | Data contract |
|---|---|---|---|
| 1 | `filterLibraryForGeneration` (`generation.js:104`) — pre-engine | `generationBlockReason(state, ex)`: id in `EXCLUDED`/`AVOIDED_BLOCK`, or `movementFamilyOf(ex)`'s `family:<key>` target in `EXCLUDED`/`AVOIDED_BLOCK`/`PATTERN_AVOID` | in: full library rows + intent state. out: `{library, droppedIds, droppedNames, dropped[], reasonById:Map, reasonByName:Map}` |
| 2 | `generatePoolFromLibrary` (`poolGenerator.js:159`) | skips rows with no `name`/`primaryMuscle`, `isCustom`, no/`'other'` `equipmentCategory`, non-hypertrophy patterns, and empty `equipmentProfiles` (`:162-167`) | in: library rows. out: `{ muscle: [{n, sub, p, eq, difficulty, sfr, fatigue, equipmentCategory, secondary}] }` (`toPoolEntry:113-135`) |
| 3 | `buildEffectivePool` (`planEngine.js:742`) | per-muscle fallback to the hand-written `POOL` when the generated pool has `< MIN_GENERATED_PER_MUSCLE (3)` entries (`:708`, `:770-777`), gated so the fallback may only offer names the FULL catalogue contains (`:762-768`) | in: library + `canonicalNames:Set<string>` |
| 4 | **`filterPool` (`planEngine.js:1330`) — the equipment filter** | `pool.filter(e => e.eq.includes(equipment))` (`:1332`), then the division `allowSubs`/`denySubs`/`denyParams` rule with a fallback to `byEquip` (`:1334-1345`) | in: `muscle:string`, `equipment:'full_gym'\|'machines_cables'\|'dumbbells_only'\|'barbell_plates'\|'home_gym'\|'bodyweight'`, `goal:string`. `e.eq` is `string[]` from `equipment_profiles` (JSON TEXT), parsed by `parseProfiles` (`poolGenerator.js:104-111`) |
| 5 | Selection gates (`planEngine.js:1430-1494`) | `isAutoEligible(name)` hard; canonicality tier, beginner difficulty (`e.difficulty < 3`), assisted-name regex `/\bassisted\b/i` — the last three never-starve | names and pool-entry fields only |
| 6 | `resolveSeed` → `generationBlockFor` (`planAutoGen.js:320-336`; `generation.js:158-169`) — post-engine | id first, then lower-cased name, against the maps from #1 | out: `'excluded'\|'avoided_block'\|'pattern_avoid'\|null`; a hit becomes a `blockedSlots[]` entry (`planAutoGen.js:600-607`) |

Two more outside generation:
`equipmentReachable(ex, equipment)` in the continuity layer
(`planAutoGen.js:361-367`, fails open on no equipment and on rows with no
profiles), and the manual picker's four ANDed terms
(`ExercisePickerModal.js:216-228`).

**Where `equipment_profiles` comes from:**
`deriveEquipmentProfiles(equipmentCategory, name, compoundIsolation)`
(`exerciseMetadata.js:110-120`) over `PROFILES_BY_CATEGORY` (`:66-78`), with
two deliberate overrides — bodyweight isolations get `BW_LOADED_PROFILES`,
weighted-bodyweight names get `[]`, and named band exceptions get
`D10_BAND_LOADED_EXCEPTION_PROFILES` (`:111-118`).

### Q3 — A user who cannot perform standing / floor-based / barbell-gripped movements

**Factual enumeration of today's behaviour.**

There is no input anywhere in the app that expresses any of those three
constraints. The nearest available lever is the equipment enum. Taking
`machines_cables` (the closest approximation to "no barbell") with
`goal: 'general'`, the pool after `filterPool` (`planEngine.js:1332`) still
contains, from the hand-written `POOL` alone:

- **quads**: `Leg Press`, `Hack Squat Machine`, `Pendulum Squat`,
  `Smith Machine Squat`, `Leg Extension` (`planEngine.js:616-626`) — three
  of the five require standing/loaded lower-limb positioning; `Smith Machine
  Squat` is a standing barbell-pattern movement.
- **hamstrings**: `Lying Leg Curl`, `Seated Leg Curl`, `Standing Leg Curl`
  (`:634-637`). `SUBREGION_REQUIREMENTS.hamstrings` requires BOTH
  `hip_extension` and `knee_flexion` at ≥6 weekly sets (`:797`); no
  `hip_extension` entry exists for `machines_cables` in the fallback POOL
  (all five are `full_gym`/`barbell_plates`, `:629-633`).
- **glutes**: `Smith Machine Hip Thrust`, `Cable Pull-Through`,
  `Abduction Machine`, `Cable Hip Abduction` (`:640-655`) — hip thrust and
  pull-through both require floor/bench transfer and a standing hinge
  respectively.
- **calves**: `Standing Calf Raise (Machine)`, `Leg Press Calf Raise`,
  `Single-Leg Calf Raise (Bodyweight)`, `Seated Calf Raise` (`:657-662`).
- **abs**: `Cable Crunch` (kneeling), `Plank`, `Side Plank` (floor),
  `Pallof Press`, `Cable Woodchop` (standing) (`:663-672`).

Selecting `bodyweight` instead removes the machines but leaves `Push-Up`,
`Pull-Up`, `Inverted Row`, `Glute Bridge`, `Sissy Squat`, `Nordic Hamstring
Curl`, `Plank`, `Ab Rollout`, `Hanging Leg Raise` — i.e. an almost entirely
floor- and hang-based set (`:534`, `:551`, `:562`, `:644`, `:627`, `:636`,
`:667-670`).

**Selection points with no way to avoid such movements:**

1. `filterPool` (`planEngine.js:1330-1332`) — the only hard filter; matches
   on the six-value equipment enum, nothing else.
2. `SUBREGION_REQUIREMENTS` required-role coverage
   (`planEngine.js:791-844`, applied `:1497-1508`, `:1662-1676`) — pass 1
   will reach into `coverageFallbackPool` to fill a required role, which is
   exactly where the canonicality/difficulty/assisted preferences get
   overridden.
3. The division `REQUIRED_WHEN_FEASIBLE` roles (`:1526-1532`).
4. The "never starve" fallbacks: division rule (`:1344`), canonicality
   (`:1467-1470`), difficulty (`:1479-1482`), assisted (`:1490-1493`), and
   the `ONLY_OPTION` last resort (`:1705-1709`) — each of which can put back
   a movement a preference had removed.
5. `buildEffectivePool`'s per-muscle POOL fallback (`:770-777`) — a thin
   library re-introduces the hand-written list by name.
6. The thin-equipment cap relax (`:1746-1760`), which lets one entry exceed
   its 4/3 cap rather than under-deliver.
7. Continuity splice-back (`withContinuity`, `planAutoGen.js:509-567`) —
   filtered only on intent and equipment (`:527-533`).
8. Library plan installation (`copyPlanFromLibrary`,
   `database.js:4560-4600`) — no filter of any kind.
9. Manual builder + picker (`ManualBuilderScreen.js:970`;
   `ExercisePickerModal.js:216-228`) — muscle/equipment chips and intent
   only.

**The one thing that WOULD work today**, and its limits: the user can
long-press an exercise in a routine and choose "Avoid this movement
pattern…" (`RoutineDetailScreen.js:429-467`), which writes a family-scoped
row that generation honours (§2.7). The available families are the 18 in
`FAMILY` (`movementFamily.js:80-104`) — `squat_press`, `hip_extension`,
`vertical_pull` etc. None of them is a position or grip: there is no family
meaning "standing", "floor", or "barbell grip", so "no standing movements"
cannot be expressed even at family level, and the user must first find an
exercise of that family already sitting in a plan in order to reach the
control at all.

### Q4 — Which onboarding/profile fields are editable later, from where, and is anything versioned?

| Field | Set at | Editable later from | Guard |
|---|---|---|---|
| `firstName` | FirstRun `:95` / ProOnboarding `:1360` | `SettingsProfileScreen:222` | none |
| `units` | FirstRun `:93` (forced kg) | not user-editable (comment `SettingsProfileScreen:228-232`) | — |
| `bodyWeightUnits` | ProOnboarding `:1327` | not user-editable (same comment) | — |
| `sex` | ProOnboarding `:1328` | `SettingsProfileScreen:182` (+ `user_body_profile:184`), behind `requestSexChange` confirmation | none |
| `age` / DOB | ProOnboarding `:1329` | `SettingsProfileScreen:163` (+ `:165`) | none |
| `heightCm` | ProOnboarding `:1330` | `SettingsProfileScreen:138` (+ `:140`) | none |
| `weightKg` | ProOnboarding `:1331` | BodyMetrics / morning weight (separate tables); profile value stays the enrolment reading (`ProGoalSetupScreen:400-405`) | none |
| `bodyFatPct`, `bodyFatSource` | ProOnboarding `:1355-1356` | `ProGoalSetupScreen:434-436` | Pro |
| `trainingGoal` | ProOnboarding `:1333` | `PlanUpdateScreen:130`, `ProGoalSetupScreen:272` | **Pro** |
| `trainingPhase` (+`goalPhase`,`goal`,`phaseStartedAt`,`goalStartDate`) | ProOnboarding `:1334-1338` | `ProGoalSetupScreen:273-291` only | **Pro** |
| `planWeakPoints` | ProOnboarding `:1352` | `PlanUpdateScreen:131`, `ProGoalSetupScreen:292` | **Pro** |
| `experience` | ProOnboarding `:1346` | `PlanUpdateScreen:132`, `ProGoalSetupScreen:295` | **Pro** |
| `daysPerWeek` (+`trainingFreq`,`trainingFreqBucket`) | ProOnboarding `:1339-1345` | `PlanUpdateScreen:133`, `ProGoalSetupScreen:296` | **Pro** |
| `sessionLengthMinutes` | ProOnboarding `:1347` | `PlanUpdateScreen:134`, `ProGoalSetupScreen:297` | **Pro** |
| `equipment` | ProOnboarding `:1348` | `PlanUpdateScreen:135`, `ProGoalSetupScreen:298` | **Pro** |
| `recoveryRating` | ProOnboarding `:1350` | `PlanUpdateScreen:136`, `ProGoalSetupScreen:300` | **Pro** |
| `proteinApproach` | ProOnboarding `:1353` | `ProGoalSetupScreen:290` | **Pro** |
| `dietPreference` | — | `SettingsProfileScreen:305-311` | none |
| `coachTone`, `coachAutonomy`, `showScience` | — | `SettingsCoachingScreen:54,62,70` | none |
| `avatarUri`, `avatarPreset` | — | `AthleteProfileScreen:363,376,394` | none |

**Versioning: essentially none.** `saveLocalProfile` overwrites the whole
blob (`useAppStore.js:306-309`). The only per-field metadata is
`userProfileFieldUpdatedAt`, a *last-write timestamp map* covering exactly
ten keys — `firstName, units, trainingFocus, trainingAgeYears,
primaryEquipment, barWeight, bodyWeightUnits, dietPreference, sex,
mealPlanExcludeTags` (`useAppStore.js:58-78`) — persisted to AsyncStorage
(`_persistProfileTimestamps:80-95`) and used for the cloud per-column merge
(`sync/tables/profiles.js:9-14`). No generator-input field is in that list,
and it is a timestamp, not a history. `user_body_profile` is a single-row
UPSERT (`database.js:5985-6020`). `phaseStartedAt` is the one field that
records *when* a value changed, and only for the training phase
(`ProGoalSetupScreen.js:287-289`).

### Q5 — Does generation or selection consult `exercise_intent` / `movementConstraints` (C31) yet?

**Yes.** Not checked-and-absent; the wiring is live on both the commit and
dry-run paths.

- `planAutoGen.generateAndSavePlan:679-680` — `loadGenerationIntent(userId)`
  then `filterLibraryForGeneration(allExercises, intentState)`.
- `planAutoGen.generatePlanDryRun:881-882` — the same two calls.
- `planAutoGen.assessScheduleFit:238-243` — the same filter, so the fit
  answer matches the plan the athlete would get.
- `generationBlockReason` (`generation.js:55-70`) calls `isPatternAvoided`
  (`intent.js:254-261`) against `familyTargetKey(movementFamilyOf(exercise))`
  — this is the C31 read.
- `planAutoGen.resolveSeed:320-336` re-checks each resolved row with
  `generationBlockFor`, closing the POOL-fallback name hole.
- `planAutoGen.buildSlotEvidence:439-441` uses `isEligibleExercise` (family
  included) so a family-avoided incumbent is not carried forward as
  "retained".

Search used: `grep -rn "findPlanIntentConflicts\|isEligibleExercise\|filterEligibleExercises\|isFamilyBlocked\|listActiveMovementConstraints\|setMovementPatternAvoid" src/ --include=*.js | grep -v __tests__`.

**Where it is NOT consulted** (checked and absent):

- `planEngine.js` — zero references to intent, constraints or families as
  blocks. Search: `grep -n "intent\|Avoid\|constraint" src/lib/planEngine.js`
  returns only unrelated matches (`isAutoEligible`, comments about
  exclusions being handled upstream, e.g. `:762-768`, `:3068`). The engine is
  pure by design (`generation.js:19-21`).
- `copyPlanFromLibrary` (`database.js:4560-4600`) — no intent read.
- `PlanDetailScreen` and `FreeStarterScreen` install paths — no
  `findPlanIntentConflicts` (grep over both files returns no match).
- `PlanLibraryScreen.surfaceConflicts:503-517` DOES read intent, but
  `findPlanIntentConflicts` uses id-level `isEligible` only
  (`intent.js:151`), so family-level PATTERN_AVOID conflicts in an installed
  plan are not reported (§11.8).
- `ManualBuilderScreen` — no direct intent read; only the picker filters
  (`ExercisePickerModal.js:225-227`).

---

## 15 UNKNOWN / UNVERIFIED

1. **The sync id-remap.** `EXERCISE-SELECTION-ARCHITECTURE.md:85-93`
   (REPORTED) says `_pullExercises` (`sync.js:1797`) rewrites local exercise
   ids to cloud ids on a name match, across `routine_exercises`,
   `workout_sets`, `exercise_user_notes`, `exercise_goals`. Not read this
   session. Whether `exercise_intent` rows are included in that remap list —
   which decides whether an id-level exclusion survives a device swap — is
   **UNVERIFIED**.
2. **Whether `exercise_intent` push/pull actually carries `expires_at`.**
   `migrate_142`'s header states it does (`:31-36`, REPORTED). The
   `_pushExerciseIntent` / `_pullExerciseIntent` bodies were not read.
3. **`getExerciseIntents` line number.** The function was read in full and
   its expiry-sweep behaviour is OBSERVED, but the exact starting line was
   not recorded; cited by name only in §7/§12.
4. **`programmes.folder_id` pull asymmetry.** `_pushProgrammes` sends
   `folder_id` (`sync.js:832`) but `insertProgrammeFromCloud`'s UPDATE/INSERT
   do not name it (`database.js:8426-8455`). The comment at `:8414-8415`
   says folder_id "has synced since 089". Not resolved — outside this
   audit's lane (Audit I).
5. **Whether the free tier reliably gets library plans seeded.**
   `seedRoutinesIfNeeded` is called from `HomeScreen:433`,
   `PlanLibraryScreen:327` and `FreeStarterScreen:57`. The ordering
   guarantees on a cold first run (is the user id available at
   `FreeStarterScreen:57`?) were not traced.
6. **`MesocycleBuilderScreen` read-only claim.**
   `EXERCISE-SELECTION-ARCHITECTURE.md:26` states it is read-only (REPORTED).
   Not verified this session.
7. **Runtime verification.** No tests were run and the app was not executed.
   Every behavioural statement here is derived from reading source.
8. **`buildPlanPreview` / `QuizScreen`.** Read only far enough to establish
   `ONBOARDING_QUIZ_FIRST = false` (`quizFlow.js:24`) makes them unreachable
   from `WelcomeScreen:69`. Their content was not audited. The store slice
   they write (`onboardingQuiz`) IS still read as a prefill by
   `ProOnboardingScreen:548-552`.
9. **`exercises.force`, `machine_type`, `machine_ok`, `home_ok`, `cue`.**
   These columns exist (`database.js:1337-1342`) and were not traced to
   readers; whether any of them could carry position information was not
   established.
10. **Exact count of exercises in the seeded library** and their
    equipment-profile distribution. Not computed; the pool analysis in
    §14 Q3 is against the hand-written `POOL` fallback
    (`planEngine.js:525-681`), which is what a thin library falls back to,
    not against the full seeded catalogue.
