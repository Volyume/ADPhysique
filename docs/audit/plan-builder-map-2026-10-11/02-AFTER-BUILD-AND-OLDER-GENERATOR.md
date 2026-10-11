# 02 After the build, and the older generator

Date: 2026-10-11. Repo state: branch `main` as checked out on that date. Scope: everything that happens to a plan after it is built (serving each week, the weekly check-in, swaps, continuity and rebuilds, the fixed-structure mode for library and kit plans), and the older generator (`src/lib/planEngine.js` `generatePlan`). The new planner's build pipeline (`src/lib/plan/planner.js`, `allocate.js`, `roles.js`, `families.js`, `catalogue.js`, `targets.js`, and planAutoGen's build entry points) is documented in `01-BUILD-PIPELINE.md` and is only referred to here.

Conventions:
- Every claim cites `file:line` (paths relative to the repo root). Numbers name their constant.
- Where a comment and the executing code disagree, the code is followed and the disagreement is listed.
- "Sample" means real output of the real code on the real exercise library (`src/lib/__tests__/campaign16.helpers.js` `LIBRARY`, the corpus the seed inserts), produced on 2026-10-11 by temporary jest files run outside the repo (see the Appendix). Nothing in `src/` was changed.
- "Code-read" marks a reproduction that was traced through the code but not executed. "UNVERIFIED" marks a claim that could not be confirmed, with the reason.

Contents:
0. The shared sample plan
1. Serving a session
2. The weekly check-in and the coach
3. Swaps
4. Continuity and rebuilds
5. Library and kit plans: the fixed-structure mode
6. The older generator
7. Every path that can change a plan after it is built
8. Observed problems
Appendix: how the samples were produced

---

## 0. The shared sample plan

Built as the brief specifies: `choices = resolveCatalogue({ library: LIBRARY, profile: 'full_gym', loggedExerciseNames: [] })` (`src/lib/plan/catalogue.js:685`), then `buildPlan({ daysPerWeek: 4, sessionLengthMinutes: 60, equipment: 'full_gym', goal: 'mens_physique', experience: 'intermediate', focusMuscles: ['side_delts','biceps'], addedMuscles: [], firstBlock: true, choices, divisionMatrix: DIVISION_MATRIX })` (`src/lib/plan/planner.js:107`).

The same plan was also saved through the real save path (`generateAndSavePlan`, `src/lib/planAutoGen.js:975`, real SQLite) with the profile `{ trainingGoal: 'mens_physique', trainingPhase: 'maintain', experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60, equipment: 'full_gym', recoveryRating: 'average', planWeakPoints: ['Side Delts','Biceps'] }`. The saved routines, rows and every week's served sets were identical to the pure build (Appendix, run B).

Plan name "V-Taper 4×/week", family `division_mens_physique_4`, rotation order `s0, s1, s3, s2` (saved as routine positions 0 to 3).

Facts the plan carries (`plannerV2PlanFacts`, `src/lib/planAutoGen.js:1342`):

| Fact | Value in the sample |
|---|---|
| roles | focus: side_delts, biceps. maintenance: traps, forearms, adductors. standard: every other trained muscle |
| sessionCaps | side_delts and biceps `{direct: 10, fractional: 12}` (`PER_SESSION.focusDirectCap`, `focusFractionalCap`, `src/lib/plan/science.js:43-44`); every other muscle the default 8 and 11 |
| lightCaps | rear_delts, biceps, triceps: 2 direct sets in Upper B |
| gapRanks | Upper B 0 (longest gap after it), Legs + Abs 1, Upper A 2, Shoulders + Arms 3 |
| recoverySafeMax | abs 9, back 12, biceps 18, calves 9, chest 12, front_delts 12, glutes 4, hamstrings 7, quads 8, rear_delts 6, side_delts 19, triceps 8 |
| readiness.passes | false (lowest readings: side_delts 0.37 in week 5, biceps 0.40 and triceps 0.50 and rear_delts 0.62 in week 4, all in Upper B) |
| overCeilings | all four sessions (more than 8 exercises or 25 working sets, `SESSION_CEILINGS`, `science.js:71-74`) |
| sessionMinutesAtPeak / overTime | Upper A 89.5 min (29.5 over), Legs + Abs 82.5 (22.5 over), Upper B 76 (16 over), Shoulders + Arms 73.5 (13.5 over), against 60 asked; `estimatedSessionMinutes` 90 |

Weekly direct-set targets (`v2.weeklyTargets`, weeks 1 to 6, week 6 the recovery week):

| Muscle | w1 | w2 | w3 | w4 | w5 | w6 |
|---|---|---|---|---|---|---|
| side_delts | 11 | 13 | 15 | 17 | 19 | 10 |
| biceps | 10 | 12 | 14 | 16 | 18 | 9 |
| chest | 6 | 7 | 8 | 9 | 10 | 5 |
| front_delts | 4 | 4 | 5 | 5 | 5 | 3 |
| back | 6 | 8 | 9 | 11 | 12 | 6 |
| rear_delts | 6 | 6 | 6 | 6 | 6 | 3 |
| triceps | 6 | 7 | 7 | 8 | 8 | 4 |
| quads | 4 | 5 | 6 | 7 | 8 | 4 |
| hamstrings | 4 | 5 | 5 | 6 | 6 | 3 |
| glutes | 2 | 3 | 3 | 4 | 4 | 2 |
| calves | 6 | 7 | 7 | 8 | 8 | 4 |
| abs | 6 | 7 | 7 | 8 | 8 | 4 |

The week-5 peaks for quads (8), hamstrings (6) and glutes (4) equal the men's physique direct floors (`src/lib/plan/divisionStandard.js:43-44`). Why the targets are what they are is 01's subject.

Every exercise as saved (reps and rest come from the planner: `repRangeFor`/`restFor`, rest shortened for time where `restTrimmed`, `planner.js:1379`, `:1387-1389`; stored sets are week 1's, `planner.js:1385`). Credits are the catalogue's curated half sets.

| Session (position) | Exercise | Muscle | Kind | Reps | Rest s | Credits |
|---|---|---|---|---|---|---|
| Upper A (Width) (0) | Dumbbell Lateral Raise | side_delts | isolation | 10-20 | 60 | none |
| | EZ Bar Preacher Curl | biceps | isolation | 10-20 | 60 | none |
| | Barbell Curl | biceps | isolation | 10-20 | 60 | none |
| | Barbell Bench Press | chest | heavy_compound | 6-10 | 150 | triceps 0.5, front_delts 0.5 |
| | Barbell Overhead Press (thin) | front_delts | heavy_compound | 6-10 | 150 | triceps 0.5, side_delts 0.5 |
| | Lat Pulldown (Wide Grip) | back | mod_compound | 8-12 | 120 | biceps 0.5, rear_delts 0.5 |
| | Seated Cable Row | back | mod_compound | 8-12 | 120 | biceps 0.5, rear_delts 0.5, traps 0.5 |
| | Reverse Pec Deck | rear_delts | isolation | 10-20 | 60 | none |
| | Cable Overhead Tricep Extension | triceps | isolation | 10-20 | 60 | none |
| Legs + Abs (1) | Barbell Back Squat | quads | heavy_compound | 6-10 | 150 | glutes 0.5, adductors 0.5 |
| | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 6-10 | 150 | glutes 0.5 |
| | Barbell Hip Thrust | glutes | heavy_compound | 6-10 | 150 | hamstrings 0.5 |
| | Leg Press | quads | machine | 8-15 | 90 | glutes 0.5, adductors 0.5 |
| | Seated Leg Curl | hamstrings | isolation | 10-20 | 60 | none |
| | Standing Calf Raise (Machine) | calves | isolation | 10-20 | 60 | none |
| | Seated Calf Raise | calves | isolation | 10-20 | 60 | none |
| | Cable Crunch | abs | isolation | 10-20 | 60 | none |
| Shoulders + Arms (2) | Dumbbell Lateral Raise | side_delts | isolation | 10-20 | 60 | none |
| | Cable Lateral Raise | side_delts | isolation | 10-20 | 60 | none |
| | EZ Bar Preacher Curl | biceps | isolation | 10-20 | 60 | none |
| | Barbell Curl | biceps | isolation | 10-20 | 60 | none |
| | Barbell Overhead Press (thin) | front_delts | heavy_compound | 6-10 | 150 | triceps 0.5, side_delts 0.5 |
| | Reverse Pec Deck | rear_delts | isolation | 10-20 | 60 | none |
| | Cable Overhead Tricep Extension | triceps | isolation | 10-20 | 60 | none |
| | Cable Crunch | abs | isolation | 10-20 | 60 | none |
| | Hanging Knee Raise | abs | isolation | 10-20 | 60 | none |
| Upper B (Detail) (3) | Dumbbell Lateral Raise | side_delts | isolation | 10-20 | 60 | none |
| | Cable Lateral Raise | side_delts | isolation | 10-20 | 60 | none |
| | Barbell Curl | biceps | isolation | 10-20 | 60 | none |
| | Barbell Bench Press | chest | heavy_compound | 6-10 | 150 | triceps 0.5, front_delts 0.5 |
| | Seated Cable Row | back | mod_compound | 8-12 | 120 | biceps 0.5, rear_delts 0.5, traps 0.5 |
| | Incline Dumbbell Press | chest | mod_compound | 8-12 | 120 | triceps 0.5, front_delts 0.5 |
| | Face Pull | rear_delts | isolation | 10-20 | 60 | none |
| | Tricep Pushdown (Rope) | triceps | isolation | 10-20 | 60 | none |
| | Seated Calf Raise | calves | isolation | 10-20 | 60 | none |

Block rows as saved (`planned_muscle_volume`, sets per week 1 to 6, all `source: 'template'`). The first 12 muscles carry the planner's targets above; the last five are rows the planner never wrote (see 1.6):

| Muscle | Rows w1 to w6 | mev/mav/mrv on the row |
|---|---|---|
| planner muscles | as the targets table | `VOLUME_LANDMARKS` values (e.g. side_delts 8/16/26, quads 8/14/20) |
| traps | 4, 7, 9, 12, 14, 4 | 4/14/24 |
| forearms | 4, 7, 10, 13, 16, 4 | 4/16/22 |
| adductors | 0, 3, 5, 8, 10, 0 | 0/10/14 |
| neck | 2, 4, 5, 7, 8, 2 | 2/8/12 |
| tibialis | 2, 4, 5, 7, 8, 2 | 2/8/12 |

---

## 1. Serving a session

### 1.1 Which week a session belongs to

- A block is created by `activatePlanWithBlock` (`src/lib/database.js:5600`): one `mesocycles` row with `planned_weeks` and `duration_weeks` = `BLOCK_PLANNED_WEEKS`, `deload_week` = `BLOCK_DELOAD_WEEK` (sample: 6 and 6), and `rir_ladder` = `NEW_BLOCK_RIR_LADDER` = `JSON.stringify(BLOCK.rirLadder)` = `[3,2,2,1,1,4]` (`database.js:34`, `science.js:140`), inserted at `database.js:5695-5705`.
- `generateMesocycleWeeks` (`database.js:6079`) writes one `mesocycle_weeks` row per week; the last week is the recovery week (`is_deload = 1`), and `rir_target = rirLadder[i]` (`database.js:6100-6102`). Sample: weeks 1 to 6 carry RIR 3, 2, 2, 1, 1, 4.
- The calendar week: `getCurrentMesocycleWeek` (`database.js:6141`) computes `getCurrentBlockWeekIndex(startDate, plannedWeeks)` (`src/lib/mesocycle.js:164-171`): `floor(daysElapsed / 7) + 1`, clamped to `[1, plannedWeeks]`. After week 6 it stays at week 6 with `awaitingDecision: true`. Sample: calendar weeks 7 and 9 both resolved to week index 6, `isDeload: true`, `rirTarget: 4`, `awaitingDecision: true`.
- The week a started workout is linked to: `createWorkout` (`database.js:3927`). When the caller passes a week id (Home and Plans do: `HomeScreen.js:1753` stores `programmePosition?.activeWeekId` on the pending start and `HomeScreen.js:1788-1791` passes it; `PlansScreen.js:855` likewise), that week is used (`database.js:3967-3974`); otherwise the calendar week (`database.js:3975-3977`).
- The programme position week (`src/lib/programmePosition.js:131-171`): the earliest accumulation week, from the block's floor up to the calendar week and below the recovery week, that still has an outstanding required session; if none, the calendar week capped at the recovery week. It can lag the calendar week. See problem P10 for what reads which week.

### 1.2 The call path from the logger to a set count

1. Home starts the session: `createWorkout(...)` then `startWorkout(workout, pending.initialExercises)` (`HomeScreen.js:1788-1795`), then in the background `computeAndLogSessionAdjustments` (`HomeScreen.js:1805`).
2. The logger, once per workout id, calls `getSessionWeeklyAllocation({ workout: activeWorkout, exercises: workoutExercises })` (`src/screens/ActiveWorkoutScreen.js:739-751`) and keeps `allocation` (exercise id to sets) and `v2`.
3. `getSessionWeeklyAllocation` (`src/lib/sessionAdjustments.js:291-330`):
   - reads the week row by `workout.mesocycleWeekId` and the block's `planned_muscle_volume` rows (`:295-298`); no week id, no block, or no rows for this week returns `{ allocation: null }` and every reader falls back to the routine's stored count;
   - splits rows into this week's and the block's lowest `week_index` rows (the baseline) (`:300-304`);
   - resolves the plan context with `getPlanServeContextForRoutine` (`:169-184`): the routine's programme must have `plan_facts.version === 2` and be the active programme; then every routine of the plan, in position order, is turned into prescribe's session shape by `buildPlanSessions` (`:85-121`);
   - for every exercise of today's session computes `cap = servedSetsCap(row, planContext)` (`:243-269`);
   - calls `computeWeeklySessionAllocation(todays, weekRows, baselineRows, planContext)` (`src/lib/coachApply.js:392-429`) and passes the result through `manualRecoveryWeekSets` (`sessionAdjustments.js:206-217`).
4. `computeWeeklySessionAllocation`:
   - a v2 plan (`facts.version === 2`): `prescribeWeek({ sessions, weekTargets: this week's rows, facts: { exposureShares, sessionCaps } })` (`coachApply.js:395-401`); each of today's exercises takes the sets of its slot (`slotId` = the routine exercise id), held to `min(served, cap)` when `cap` is a whole number (`:402-413`);
   - any other plan: the FQ-4 multiplier `max(1, round(recommendedSets x weekPlanned[m] / week1Planned[m]))`, factor 1 when either row is missing or zero (`:416-428`).
5. `buildPlanSessions` slot fields (`sessionAdjustments.js:92-117`): `id` the routine exercise id; `muscle`, `kind`, `credits` from `facts.slots[routineId][exerciseId]` when present (the planner's own model), otherwise the corpus primary muscle (`allocateExerciseVolume`), `deriveParamKey(equipmentCategory, compoundIsolation)` and the corpus secondary credits; `baseSets` = the stored `recommended_sets`; `thinEquipment` from `facts.thin`; `focus` = `facts.roles[muscle] === 'focus'`; `typedSets` from `facts.typed[routineExerciseId]` when it is a number of at least 1. Circuit members are left out (`:95`).
6. `servedSetsCap` (`sessionAdjustments.js:243-269`): undefined (no cap) for a non-v2 plan, a row with no slot, or a typed slot; the planned exercise in its slot gets `exerciseCap(kind, thin, {focus})`; any other exercise in the slot (a one-off swap) gets `exerciseCap` of its own kind, no thin bonus.
7. `manualRecoveryWeekSets` (`sessionAdjustments.js:206-217`): only for `facts.kind === 'manual'` in a week with `is_deload = 1`: each typed count is served as `max(1, round(n / 2))`.

### 1.3 What `prescribeWeek` does (`src/lib/plan/prescribe.js:149-259`)

Constants (`science.js`): `SETS_PER_EXERCISE` cap 4 compound, 3 isolation, floor 2, floor in a low week 1, thin-equipment bonus +2 (`:28-37`); `exerciseCap` gives a focus muscle's isolation exercise 4 (`:301-306`); `PER_SESSION` direct cap 8, fractional cap 11 (`:40-45`), overridden per muscle by `facts.sessionCaps`.

1. Every slot is indexed by its muscle in rotation order; a typed slot is served its typed count (`:157-170`).
2. Per muscle, in sorted muscle order: target = this week's row (or, with no row, the sum of the slots' stored counts clamped to their caps, `:182-184`); `D = max(0, target - typed sets)` (`:185`). No free slot: the whole `D` is a shortfall (`:186-189`).
3. Each session's cap for the muscle = `min(direct cap - typed sets here, sum of the exercise caps here)` (`:198-205`).
4. `D` is split across the muscle's sessions by `facts.exposureShares[m]` when those name the sessions, else by the slots' stored week-1 sets (`sessionWeights`, `:312-325`), with the largest-remainder method (`splitByWeights`, `:90-105`).
5. A share above its session cap moves to the heaviest-weighted session with room; what is left is a shortfall (`:212-223`).
6. Floors: only when the week's placed sets cover every session's floors (2 per exercise), a session below its floors takes sets from the session with the most above its own floors (`:230-243`). When the week is below the floors, exercises can be served 1 set (`fillSession`, `:113-133`, uses `floorInLowWeek` when `total < 2 x count`).
7. Inside a session: every exercise starts at its floor, then one set at a time goes to the exercise with the most room under its cap, the earlier exercise on a tie (`fillSession`).
8. `keepCreditedCaps` (`:270-299`) moves sets inside a session off an exercise whose credit pushes another muscle past its fractional cap; `rebalanceFractional` (`:359-422`) moves direct sets of a muscle whose fractional total in a session passes its cap to another session with room, else a shortfall; `moveCreditingSet` (`:431-473`) may move a crediting muscle's set to that muscle's other session.
9. Returns `{ sets, shortfall, aboveTarget, perSession }`.

What prescribe does not do: it never reads the recovery model, the order of the sessions in time, or which sessions are adjacent; it never adds or removes an exercise; it never checks the D45 session ceilings (8 exercises, 25 working sets); it never checks the category's direct floor.

### 1.4 The number the logger shows, and the session's own +1 or -1

- Set count shown (`ActiveWorkoutScreen.js:1260-1296`): `comp015SetCount` = the session adjustment's `adjustedSets` when one with a non-zero delta exists, else `allocation[exerciseId]`, else the routine's `recommendedSets`. A readiness tweak (`READINESS_RULES`, `sessionAdjustments.js:640-657`: below par -1 set, loads x 0.95; sharp and average change nothing) gives `readinessSetCount`; the lower of the two wins (`:1294-1296`). No readiness tweak in a deload week (`:1276-1283`).
- The session adjustment (`computeAndLogSessionAdjustments`, `sessionAdjustments.js:496-620`; engine `computeSessionAdjustments`, `src/lib/algorithms.js:1344`): silent in a deload week (`algorithms.js:1354`); per muscle, the first exercise of the muscle is considered; joint discomfort holds; soreness on a muscle trained within 72 h drops 1 set (`:1452`); a well-recovered under-stimulated muscle (feedback within 14 days, performance at most "met", pump at most "mild") may get +1 (`:1473-1497`). On a v2 plan the +1 goes to the exercise with the most room under its cap, only while the session stays under the muscle's direct and fractional session caps and the week (the larger of the planned week and what was done plus today) stays under the role's top (`planAddTarget`, `algorithms.js:1306-1326`; limits from `buildPlanLimits`, `sessionAdjustments.js:366-407`; tops from `roleTop`, `checkinPlacement.js:128-133`: standard 20, raised 24, focus 24, maintenance 6). At most 2 exercises adjusted per session (`algorithms.js:1542-1546`). The weekly coach's push only reaches the session once an Apply has written `source: 'coach'` rows for the week (`sessionAdjustments.js:575-578`). Nothing here is written to the plan; decisions are logged as `adaptation_events`.

### 1.5 Reps, rest, effort, load

- Reps: the routine row's `recommended_reps_min/max`, unchanged across the block (`ActiveWorkoutScreen.js:2891-2893`). For a planner plan they were written from `repRangeFor(name, kind, isStrength)` (`planner.js:1379`).
- Rest: `routineExercise.restSeconds`, else the person's default, else 90 s (`restSecondsForEntry`, `ActiveWorkoutScreen.js:1495-1499`).
- Effort: the week's `rir_target` (block ladder [3,2,2,1,1,4]). The logger does not show a weekly effort line (removed, `ActiveWorkoutScreen.js:711-714`); the recovery model and Home read it (`src/lib/recovery/load.js:204`, `src/lib/readinessSummary.js:68`). In the recovery week the loads are seeded from week 1's logged sets at the same weight, half the reps, RIR 4 (`generateDeloadPrescription(week1Sets, true)`, `ActiveWorkoutScreen.js:2838-2843`, `algorithms.js:1892-1916`).
- Load: the live prescription resolver (`src/lib/livePrescription.js`), fed by the exercise's history; its `targetSets` input is the routine row's stored count (`ActiveWorkoutScreen.js:2894`), not the week's served count. UNVERIFIED whether the resolver uses `targetSets` for anything the person sees; the set count displayed is `adjustedSetCount` (`:1294`, `:4644`).

### 1.6 Where the weekly rows come from

- Every activation runs `generateInitialPlannedVolume(blockId, VOLUME_LANDMARKS, ledger)` (`database.js:5742`, `:6268-6369`): for every muscle in `VOLUME_LANDMARKS` (17 muscles including neck and tibialis), accumulation week i gets `round(mev + (mav - mev) x i / (accWeeks - 1))`, the recovery week gets `mev`, unless a learned seed range exists (`buildSeededWeeklyTargets`), and capability-blocked muscles get 0 with mrv 0. Inserted with `INSERT OR IGNORE`.
- A plan the new planner saves then overwrites `planned_sets` and `source` for each muscle in `plan.v2.weeklyTargets` (`writePlannerV2WeeklyRows`, `planAutoGen.js:1827-1867`, called at `:2021`). Its upsert only updates `planned_sets`, `source`, `updated_at` on conflict (`database.js:6825-6836`), so mev/mav/mrv stay the template's `VOLUME_LANDMARKS` values.
- Muscles the planner does not target keep the template ramp (sample: traps 4 to 14, forearms 4 to 16, adductors 0 to 10, neck and tibialis 2 to 8). No exercise serves them; prescribe reports them as shortfall every week (sample: week 5 shortfall `{adductors 10, forearms 16, neck 8, tibialis 8, traps 14}`). See P2.
- `recoverySafeMax` is stored in the facts, not in the rows (`planAutoGen.js:1368-1374`). The comments at `planner.js:164-167` and `planner.js:1446` say it is written into the rows' `mrv`; the code does not (see P16).

### 1.7 Week 6, and after it

- Week 6 is `is_deload = 1`, RIR 4. A planner plan serves `weeklyTargets[m][5]`, about half the peak (`BLOCK.recoveryWeekShare` 0.5, `science.js:139`); exercises can be served 1 set (sample: Barbell Overhead Press, Reverse Pec Deck, Seated Leg Curl and others at 1). Loads come from the deload prescription (1.5). The session adjustment and the readiness tweak are silent.
- After week 6 the calendar resolver stays at week 6 with `awaitingDecision: true` (1.1), so sessions keep being linked to week 6 and served week 6's sets until the person decides on the next block (PlansScreen's block decision; see 4.5). The coach's next-week apply is unavailable (`CoachOutputScreen.js:2402-2406`: no next week row).

### 1.8 Other readers of the same number

- Plan screens: `getCurrentWeekPlanSets` (`sessionAdjustments.js:428-449`) runs the same resolver for the CALENDAR week (`:431`), used by `PlanDetailScreen.js:174` and `RoutineDetailScreen.js:430`.
- Mini bar: `ActiveSessionMiniBar.js:72` (the workout's week).
- Recovery forecast: `servedSetsResolver` (`sessionAdjustments.js:468-483`) via `getCurrentWeekPlanSets` (calendar week), from `HomeScreen.js:1496` and `ReadinessCards.js:725`.

### 1.9 Sample: every session, weeks 1 to 6, as the logger's resolver serves it

Source: the SQLite run (real save path, `getSessionWeeklyAllocation` per routine per week, block moved week by week); identical to `prescribeWeek` on the pure build. Cap = `exerciseCap` (focus isolation 4; thin heavy compound 4 + 2 = 6). Shortfall was empty for every planner muscle in every week.

Upper A (Width):

| Exercise | Cap | w1 | w2 | w3 | w4 | w5 | w6 |
|---|---|---|---|---|---|---|---|
| Dumbbell Lateral Raise | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| EZ Bar Preacher Curl | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Barbell Curl | 4 | 2 | 2 | 3 | 3 | 4 | 2 |
| Barbell Bench Press | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Barbell Overhead Press | 6 | 2 | 2 | 2 | 2 | 2 | 1 |
| Lat Pulldown (Wide Grip) | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Seated Cable Row | 4 | 2 | 2 | 3 | 3 | 4 | 2 |
| Reverse Pec Deck | 3 | 2 | 2 | 2 | 2 | 2 | 1 |
| Cable Overhead Tricep Extension | 3 | 2 | 3 | 3 | 3 | 3 | 2 |
| Working sets (9 exercises) | | 18 | 23 | 25 | 29 | 31 | 16 |

Legs + Abs:

| Exercise | Cap | w1 | w2 | w3 | w4 | w5 | w6 |
|---|---|---|---|---|---|---|---|
| Barbell Back Squat | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Romanian Deadlift (Barbell) | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Barbell Hip Thrust | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Leg Press | 4 | 2 | 2 | 3 | 3 | 4 | 2 |
| Seated Leg Curl | 3 | 2 | 2 | 2 | 2 | 2 | 1 |
| Standing Calf Raise (Machine) | 3 | 2 | 2 | 2 | 3 | 3 | 2 |
| Seated Calf Raise | 3 | 2 | 2 | 2 | 2 | 2 | 1 |
| Cable Crunch | 3 | 2 | 3 | 3 | 3 | 3 | 2 |
| Working sets (8 exercises) | | 16 | 20 | 21 | 25 | 26 | 14 |

Shoulders + Arms:

| Exercise | Cap | w1 | w2 | w3 | w4 | w5 | w6 |
|---|---|---|---|---|---|---|---|
| Dumbbell Lateral Raise | 4 | 2 | 3 | 3 | 3 | 4 | 2 |
| Cable Lateral Raise | 4 | 2 | 2 | 3 | 3 | 3 | 2 |
| EZ Bar Preacher Curl | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Barbell Curl | 4 | 2 | 2 | 3 | 3 | 4 | 2 |
| Barbell Overhead Press | 6 | 2 | 2 | 3 | 3 | 3 | 2 |
| Reverse Pec Deck | 3 | 2 | 2 | 2 | 2 | 2 | 1 |
| Cable Overhead Tricep Extension | 3 | 2 | 2 | 2 | 3 | 3 | 1 |
| Cable Crunch | 3 | 2 | 2 | 2 | 3 | 3 | 1 |
| Hanging Knee Raise | 3 | 2 | 2 | 2 | 2 | 2 | 1 |
| Working sets (9 exercises) | | 18 | 20 | 23 | 26 | 28 | 14 |

Upper B (Detail):

| Exercise | Cap | w1 | w2 | w3 | w4 | w5 | w6 |
|---|---|---|---|---|---|---|---|
| Dumbbell Lateral Raise | 4 | 3 | 3 | 3 | 4 | 4 | 2 |
| Cable Lateral Raise | 4 | 2 | 2 | 3 | 3 | 4 | 2 |
| Barbell Curl | 4 | 2 | 2 | 2 | 2 | 2 | 1 |
| Barbell Bench Press | 4 | 2 | 2 | 3 | 3 | 3 | 2 |
| Seated Cable Row | 4 | 2 | 3 | 3 | 4 | 4 | 2 |
| Incline Dumbbell Press | 4 | 2 | 2 | 2 | 2 | 3 | 1 |
| Face Pull | 3 | 2 | 2 | 2 | 2 | 2 | 1 |
| Tricep Pushdown (Rope) | 3 | 2 | 2 | 2 | 2 | 2 | 1 |
| Seated Calf Raise | 3 | 2 | 3 | 3 | 3 | 3 | 1 |
| Working sets (9 exercises) | | 19 | 21 | 23 | 25 | 27 | 13 |

Observations from the sample, without judgement:
- No exercise is ever above its cap. Upper A, Shoulders + Arms and Upper B hold 9 exercises every week (D45's limit is 8); Legs + Abs holds 8. Working sets reach 25 in Upper A from week 3 and in every session from week 4 (Upper A 29, Shoulders + Arms 26, Legs + Abs and Upper B 25), and every session is above 25 in week 5 (up to 31 in Upper A).
- Biceps in Upper A in week 5: 12 fractional sets (8 direct plus half sets from the two back rows), exactly the focus fractional cap of 12.
- The rotation is Upper A, Legs + Abs, Shoulders + Arms, Upper B, then Upper A again. Shoulders + Arms is followed by Upper B: side delts (week 5: 8.5 then 8 fractional), biceps (8 then 4), triceps (4.5 then 5) and rear delts (2 then 4) are trained directly in both. Upper B is followed, across the week boundary, by Upper A, which trains side delts, biceps, triceps, rear delts, chest and back directly again. The light caps (rear delts, biceps, triceps 2 direct in Upper B) are visible in Upper B's 2-set biceps and triceps.
- Week 1 serves every exercise at the 2-set floor except Upper B's Dumbbell Lateral Raise (3).

### 1.10 A plan served without v2 facts (the FQ-4 multiplier)

Any plan whose facts are not `version: 2`, or whose programme is not active, is served `round(recommendedSets x thisWeek[m] / week1[m])` (`coachApply.js:416-428`), with no per-exercise cap. Sample, using the older generator's men's physique plan (section 6.4) and the template rows a new block receives (1.6, no ledger):

| Shoulders + Arms (older generator) | w1 | w2 | w3 | w4 | w5 | w6 |
|---|---|---|---|---|---|---|
| Cable Lateral Raise (isolation, stored 5) | 5 | 6 | 8 | 9 | 10 | 5 |
| Cable Face Pull (Rope) | 3 | 5 | 6 | 7 | 8 | 3 |
| Barbell Overhead Press (front_delts row week 1 is 0, factor stays 1) | 3 | 3 | 3 | 3 | 3 | 3 |
| Incline Dumbbell Curl | 3 | 4 | 5 | 6 | 7 | 3 |
| Dumbbell Overhead Tricep Extension | 3 | 4 | 5 | 6 | 7 | 3 |

| Legs + Abs (older generator) | w1 | w2 | w3 | w4 | w5 | w6 |
|---|---|---|---|---|---|---|
| Bulgarian Split Squat | 3 | 4 | 4 | 5 | 5 | 3 |
| Leg Extension | 3 | 4 | 4 | 5 | 5 | 3 |
| Romanian Deadlift | 3 | 4 | 5 | 6 | 7 | 3 |
| Lying Leg Curl | 3 | 4 | 5 | 6 | 7 | 3 |
| Barbell Hip Thrust | 3 | 5 | 7 | 9 | 11 | 3 |
| Seated Calf Raise (Barbell) | 3 | 4 | 4 | 5 | 5 | 3 |

Upper A's week 5 under the same rule: Lat Pulldown 6, Barbell Row 5, Dumbbell Lateral Raise 6, both bench presses 7, Cable Face Pull 8, Spider Curl 7. The recovery week equals week 1 because the template's recovery row equals `mev`, the same as week 1's row.

Which plans are served this way today: see P17.

---

## 2. The weekly check-in and the coach

### 2.1 The coach's volume signal (`src/lib/weeklyCoach.js`)

Pre-filters: not enough data returns a baseline output (`:1187-1192`); session adherence below 0.5 returns the adherence output (`:1199-1201`). Both carry `volumeSignal: 0` (`:2697`, `:2752`).

Scores:
- Recovery 1 to 4 (`getRecoveryScore`, `:309-325`): soreness ≥ 4 is 4; energy ≤ 2 or soreness ≥ 3 is 3; energy ≥ 4 and soreness ≤ 1 is 1; else 2; stress ≥ 4 lifts a 1 or 2 to 3. Missing answers default to 3.
- Performance 1 to 4 (`getPerformanceScore`, `:345-355`): "exceeded", or PR density ≥ 0.3 per session (`PR_DENSITY_STRONG`) or block e1RM slope ≥ 1.5% (`BLOCK_SLOPE_STRONG_PCT`) with adherence ≥ 0.9, is 1; "dropped" or adherence < 0.5 is 4; "struggled" or adherence < 0.75 is 3; else 2.
- Peak-week softening (`contextAdjustedRecovery`, `:374-391`): a soreness-driven 3 in the block's last accumulation week (with no earlier poor weeks) reads as 2 for the hold and push branches only.

Matrix (`autoregulationMatrix`, `:401-419`):

| Recovery (raw) / for push | Performance | Signal |
|---|---|---|
| raw 4, or raw ≥ 3 with performance 4 | any | -2, reduce, deload flag |
| for-push 3, or performance 3 | | 0, hold |
| for-push 1 and performance 1 | | +3, push |
| for-push 1 or performance 1 | | +2, push |
| both 2 | | +1, push |

The doc comment says `volumeDelta: -2|-1|0|1|2|3`; the code never returns -1.

Modifiers, in execution order:
1. Safety hold (`:1265-1274`): joint pain answered, or an injury or illness word in the person's own note text: a positive signal becomes 0, a push becomes a hold.
2. Outcome memory (`volumeDecisionMemory`, `:1429-1438`): may set a positive signal to 0 while an earlier increase is still being judged or did nothing.
3. Coordination (`coordinateChanges`, `:1810-1832`): one change at a time with calories, or an active constraint: a non-zero signal becomes 0.
4. Sustained escalation (`:2201-2230`): after 3 consecutive "exceeded" weeks (`EXCEEDED_ESCALATION_WEEKS`) on a push with no safety flag, +1, never above 3 (`MATRIX_PUSH_CEILING`).

### 2.2 What Apply does (`src/screens/CoachOutputScreen.js:1353-1466`)

- The target week is the calendar week after the current one (`:2402-2406`). No next week (week 6, or a finished block) means no Apply. A positive signal never applies onto a recovery week (`:1364`).
- For an increase, `loadVolumeIncreaseHolds` (`src/lib/coachApplySafety.js:7`) returns the muscles under a capability rule or flagged sore; a failed read withholds the increase (`CoachOutputScreen.js:1376-1387`).
- `resolveCheckinPlan` (`src/lib/checkinPlan.js:181-228`) returns null for any plan without v2 facts, or when the current week is awaiting a decision, or there is no next week, or next week is the recovery week (`checkinPlan.js:83-137`). Non-null: `writeCheckinPlan` (`:236-285`) adds the opened exercises (`addExerciseToRoutine` with 2 sets, `repRangeFor`/`restFor`, reason `volume_fill`), updates the facts (`roles[m] = 'raised'`, new `slots`), and upserts every later week's rows with `source: 'coach'`, each write on its own (`upsertPlannedMuscleVolume`, not one transaction); then `applyCoachTrainingAdjustmentAtomically` (`database.js:10429-10469`) writes next week's rows (`source: 'coach'`) and the coach output in one transaction (`CoachOutputScreen.js:1449-1455`).
- Null (any other plan): `computeVolumeApply(rows of next week, delta, holdMuscles)` legacy path (2.5).
- A v2 hold or withheld increase has an Apply button only when the card shows one (`:1361`). On any other plan a 0 signal is informational.

### 2.3 `planCheckin` (`src/lib/plan/checkinPlacement.js:250-470`), for plans the new planner built

Inputs: the plan's sessions (prescribe shape plus `name`, `exerciseId`), the facts (`roles`, `exposureShares`, `sessionCaps`, `gapRanks`, `recoverySafeMax`), the block's weeks from the current week on, their rows, the signal, `withheld`, held muscles, and (for an increase) the person's catalogue (`loadCatalogue`, `checkinPlan.js:146-163`: their kit, exclusions and capability limits applied; a failed read gives `{}`).

1. Kind and step (`checkinKind`, `:92-98`; `checkinStep`, `:101-108`; `CHECKIN_STEPS`, `science.js:154-159`): signal ≥ 2 is INCREASE with step +3 (`strong`); 0 < signal < 2 is PLANNED_CLIMB (nothing to apply, `:285`); 0 is HOLD (or WITHHELD); negative is PULL_BACK with step -2.
2. Returns early (`reason`) with no next week or a recovery next week (`:265-266`).
3. Per muscle that has a slot and a row this week (`:282`), with c = this week's row and s = next week's row:
   - HOLD/WITHHELD: `want = min(s, c)` (`:293-297`).
   - PULL_BACK: `want = min(s, max(c - 2, min(c, floorDirect)))`, where `floorDirect = ceil(4 - (weekly fractional - weekly direct))` (`PULL_BACK_FLOOR` = `ROLE_TARGETS.maintenance.target` = 4, `:85`, `:298-302`).
   - INCREASE: held muscles and maintenance muscles are skipped; `room = floor(roleCeiling(role) - this week's served fractional)` (`roleCeiling`: focus 30, maintenance 6, else 24, `:115-119`); `by = min(3, room)`, skipped if < 1; `want = max(s, min(c + by, max(s, raiseCap)))`, `raiseCap = min(row mrv (else mav, else 30), facts.recoverySafeMax[m])` (`:195-199`, `:303-311`).
4. `settle` (`:518-552`) runs `findProblem` (`:484-510`) until none: for muscles raised above the plan's own row, (a) a shortfall prescribe cannot place beyond the base week's own, (b) weekly fractional above the role ceiling, (c) a session whose working sets exceed 25 (`SESSION_CEILINGS.workingSets`) and its pre-check-in count. A shortfall may first try `tryOpen` when `allowOpen`; otherwise the target is cut by one at a time, never below the plan's own row. Opened exercises that turn out unneeded are removed.
5. `allowOpen` = INCREASE and `!hasSafeMax(facts)` (`:337`). `hasSafeMax` is true whenever `facts.recoverySafeMax` holds any number (`:190-193`). The planner writes a number for every muscle with a target (`planner.js:190-193`), so for every plan the new planner builds, a check-in never opens an exercise (see P4).
6. `tryOpen` (`:593-648`), when reachable: candidate sessions that train the muscle, ordered by `gapRanks` (longest gap after first), then fewest of the muscle's sets, then rotation order; skipped if the muscle already has `exercisesAllowed` exercises there, the session has 8 exercises, the session's direct or fractional cap is reached, or any existing slot of the muscle is below its cap; the exercise is the first catalogue choice not in the session and of a role not covered there, preferring one not used anywhere for the muscle (`nextChoice`, `:572-584`); accepted only if it reduces the shortfall and keeps the session's working sets at most `max(25, before)`.
7. Later weeks (`:365-406`): for each week after next, a muscle whose path changed climbs the plan's own step from the new level (`climb = max(0, stored this week - stored previous week)`), bounded by `raiseCap`; the recovery week takes `min(stored, previous)`. Each later week goes through `settle` with `allowOpen: false`; cuts are reported in `laterUnplaced`.
8. The card's per-muscle lines compare this week's served sets with next week's (`:408-444`); `raisedRoles` lists standard muscles whose served fractional passes 20 in any week (`:459-466`); `plannedClimb` is the mode of the positive next-minus-this differences (`:284`, `modeOfPositive`, `:201-210`).
9. `describeCheckin` (`:684-767`) writes the card.

What placement checks and does not check:
- Recovery: no recovery model is read (the module imports only `science.js` and `prescribe.js`, `:67-70`). The only recovery input is the build-time `recoverySafeMax` cap.
- Adjacency of sessions: not checked. `gapRanks` is read only to choose where an opened exercise goes.
- Caps: per-exercise caps and session direct/fractional caps through prescribe; role ceilings; D45 working sets (25) only against the pre-check-in count; D45 exercise count (8) only when opening.
- The category's direct floor: not checked by any kind (hold and pull-back can go below it; sample 2.7).

### 2.4 The early deload (`CoachOutputScreen.js:1476-1520`)

Applies to every plan, v2 or not: next week's rows go through `computeDeloadVolume` (`coachApply.js:185-210`): with the achieved peak, `max(deloadFloor(mev), round(min(peak, current) x deloadSharePct(strain) / 100))` (`deloadSharePct` = 60 - 5 x strain, strain clamped 0 to 4, `:140-152`; `deloadFloor` = `max(1, round(mev x 0.5))`, `:162-164`); without a peak, `mev`; a row only ever goes down. The week is flipped to `is_deload = 1`, RIR 4 (`database.js:6216-6221`, `:10451`). The block's own week 6 recovery week stays.

### 2.5 Plans without v2 facts: the legacy check-in

`computeVolumeApply` legacy branch (`coachApply.js:309-348`): every row of next week moves by the signal, clamped to `[mev, mrv]` (mrv falls back to mav, then `ABSOLUTE_WEEKLY_SET_CEILING` 30, `:60`); increases skip held muscles. Only next week changes; the week after returns to the template. Served through the multiplier (1.10). Sample: +3 on week 3 of the template rows took side delts 12 to 15, so Cable Lateral Raise (stored 5) went from 8 to 9 sets (`round(5 x 15 / 8)`), Incline Dumbbell Curl 5 to 7, Cable Face Pull (Rope) 6 to 7.

### 2.6 What each kind writes, in one line each

| Kind | Next week | Later weeks | Exercises |
|---|---|---|---|
| v2 increase | rows raised where they fit | each later week climbs from the new level, cut where it does not fit | opened only if the facts hold no `recoverySafeMax` |
| v2 planned climb (+1) | nothing | nothing | nothing |
| v2 hold / withheld | rows = this week's level where the plan climbed | each later week lowered by the same amount (the climb resumes from the lower level) | nothing |
| v2 pull-back | rows -2, not below the fractional maintenance floor | climb resumes from the lower level; recovery week `min(stored, previous)` | nothing |
| legacy +n / -n | every row ± n, clamped to [mev, mrv] | nothing | nothing |
| early deload | rows cut, week flipped to recovery | nothing | nothing |

### 2.7 Sample: the shared plan at week 2, three signals (pure run, rows as the save writes them)

Strong increase (signal 3), current week 2, next week 3:

| Muscle | Role | This week (c) | Plan's next (s) | raiseCap | want | Written w3 | Card "added" | Unplaced |
|---|---|---|---|---|---|---|---|---|
| side_delts | focus | 13 | 15 | 19 | 16 | 16 | 3 | 0 |
| biceps | focus | 12 | 14 | 18 | 15 | 14 (no change) | 2 | 1 |
| chest | standard | 7 | 8 | 12 | 10 | 8 (no change) | 1 | 2 |
| front_delts | standard | 4 | 5 | 12 | 7 | 6 | 2 | 1 |
| back | standard | 8 | 9 | 12 | 11 | 9 (no change) | 1 | 2 |
| rear_delts | standard | 6 | 6 | 6 | 6 | 6 (no change) | 0 | 0 |
| triceps | standard | 7 | 7 | 8 | 8 | 8 | 1 | 0 |
| quads | standard | 5 | 6 | 8 | 8 | 7 | 2 | 1 |
| hamstrings | standard | 5 | 5 | 7 | 7 | 6 | 1 | 1 |
| glutes | standard | 3 | 3 | 4 | 4 | 4 | 1 | 0 |
| calves | standard | 7 | 7 | 9 | 9 | 8 | 1 | 1 |
| abs | standard | 7 | 7 | 9 | 9 | 7 (no change) | 0 | 2 |

- Rows written: week 3 only (calves 8, front_delts 6, glutes 4, hamstrings 6, quads 7, side_delts 16, triceps 8): 7 sets above the plan's own week 3. Weeks 4 and 5 unchanged: every carried raise was cut (`laterUnplaced` week 4: side_delts, front_delts, quads, hamstrings, calves 1 each) because each session already sat at or above 25 working sets.
- Opened: none (the plan has `recoverySafeMax`). Run again with `recoverySafeMax` removed: still none opened (the binding problem was the 25-set ceiling, not a shortfall); triceps reached 9.
- Served week 3 after the raise: Upper A 25 (unchanged), Legs + Abs 21 to 25 (Back Squat, RDL, Hip Thrust 3 to 4, Standing Calf Raise 2 to 3), Shoulders + Arms 23 to 25 (Overhead Press 3 to 4, Cable Overhead Tricep Extension 2 to 3), Upper B 23 to 24 (Dumbbell Lateral Raise 3 to 4). No exercise over its cap.
- Card (verbatim): heading "Next week: 3 more sets for each muscle that can take them"; lines include "Biceps, 2 more sets next week: Barbell Curl 2 to 3 and Barbell Curl 2 to 3." (the plan's own climb), "Rear delts, 0 more sets next week." and "Abs, 0 more sets next week."; eight "could not be placed without going over a limit" lines; "If you leave this, your plan's planned climb of 1 set goes ahead." (`plannedClimb` = 1, the mode; side delts and biceps climb 2).

Pull-back (signal -2): rows written for weeks 3, 4, 5 and one in week 6:

| Muscle | w3 plan to written | w4 | w5 | w6 |
|---|---|---|---|---|
| side_delts | 15 to 11 | 17 to 13 | 19 to 15 | 10 |
| biceps | 14 to 10 | 16 to 12 | 18 to 14 | 9 |
| chest | 8 to 5 | 9 to 6 | 10 to 7 | 5 |
| front_delts | 5 to 2 | 5 to 2 | 5 to 2 | 3 to 2 |
| back | 9 to 6 | 11 to 8 | 12 to 9 | 6 |
| rear_delts | 6 to 4 | 6 to 4 | 6 to 4 | 3 |
| triceps | 7 to 5 | 8 to 6 | 8 to 6 | 4 |
| quads | 6 to 4 | 7 to 5 | 8 to 6 | 4 |
| hamstrings | 5 to 3 | 6 to 4 | 6 to 4 | 3 |
| glutes | 3 to 1 | 4 to 2 | 4 to 2 | 2 |
| calves | 7 to 5 | 8 to 6 | 8 to 6 | 4 |
| abs | 7 to 5 | 8 to 6 | 8 to 6 | 4 |

Hold (signal 0): six muscles change, three weeks each: back 9/11/12 to 8/10/11, biceps 14/16/18 to 12/14/16, chest 8/9/10 to 7/8/9, front_delts 5/5/5 to 4/4/4, quads 6/7/8 to 5/6/7, side_delts 15/17/19 to 13/15/17. Muscles whose plan did not climb from week 2 to 3 are untouched. The block's remaining peak is lower for every muscle that changed.

Against the men's physique direct floors (`divisionStandard.js:43-44`; front delts, not listed there, against `STANDARD_DIRECT_FLOOR_DEFAULT` 4, `science.js:132`), the hold leaves back 11 (floor 12), chest 9 (floor 10) and quads 7 (floor 8) at week 5; the pull-back leaves every muscle but side delts and biceps below its floor at week 5.

### 2.8 Sample: a strong check-in on a MANUAL plan

Manual plans rebuilt by `rebuildManual` carry facts `{version: 2, kind: 'manual', roles, typed, weeklyTargets}` with no `recoverySafeMax` (`src/lib/planRebuild.js:500`), so `allowOpen` is true. Pure run: two sessions, every count typed (r1: Barbell Bench Press 4, Pec Deck 3, Tricep Pushdown (Rope) 3; r2: Lat Pulldown (Wide Grip) 4, Barbell Curl 3), flat weekly rows chest 7, triceps 3, back 4, biceps 3, signal +3 at week 2:
- Opened into the person's own sessions: r2 Seated Cable Row (back, 3 sets), r2 EZ Bar Preacher Curl (biceps, 3), r1 Incline Dumbbell Press (chest, 1 set in a normal week), r1 Cable Overhead Tricep Extension (triceps, 3).
- Rows written for weeks 3, 4 and 5: back 7, biceps 6, chest 8, triceps 6. Unplaced: chest 2.
- `writeCheckinPlan` would add these four rows with `recommended_sets` 2 and reason `volume_fill`, and record them in `facts.slots`, not in `facts.typed`.

---

## 3. Swaps

### 3.1 The candidate list

`rankSwaps` (`src/lib/swapEngine.js:224`) lists exercises of the same primary muscle first (`:275`, sort at `:282`); other muscles are not filtered out. The logger's sheet may also restrict to a style pool until "Show all" (`ActiveWorkoutScreen.js:2072-2075`).

### 3.2 One-off ("Just this session")

- In the logger (`handleConfirmSwap`, `ActiveWorkoutScreen.js:1975` onwards): the entry's exercise is replaced in memory; the routine row is carried with load cleared and rest per `restAfterSwap` (`ActiveWorkoutScreen.js:1987-1988`). The week's served number for the slot is carried onto the new exercise: `carriedSetCount` = the served sets, held to the new exercise's own `exerciseCap` on a v2 plan (no thin bonus; focus per the facts) (`ActiveWorkoutScreen.js:2028-2037`, `src/lib/exercise/swapCarry.js:114-120`). On every later read (remount, crash restore) `servedSetsCap` gives the same cap (1.2 step 6).
- `applyExerciseSwap` with scope `session` writes nothing to the plan; it records the swap with scope `session` (`src/lib/exercise/swapApply.js:42-64`).
- From the routine screen, a one-off applies to the workout started there (`applySessionSwaps`, `swapCarry.js:262-274`).
- What is checked: the new exercise's per-exercise cap only. A set lost to a lower cap is not given to another exercise. The muscle, the session's caps, the day and recovery are not checked.
- Sample (SQLite, week 5): Upper A's Barbell Bench Press (served 4) swapped for one session to Band Chest Fly (Standing) (isolation): served 3. Every other exercise unchanged; chest in that session 4 to 3.

### 3.3 Permanent ("From now on")

`applyExerciseSwap` with scope `programme` and a routine row calls `updateRoutineExerciseExercise` (`database.js:5218-5296`):
1. Reads the plan state before the change (`readSwapPlanState`, `:5321-5371`): the facts (v2 only), the muscle change `{from, to}` (`slotMuscleChange`, `swapCarry.js:160-165`: the facts' entry wins over the corpus), and, only when the muscle changes on the ACTIVE plan's running block, the slot's served sets in the current week and every later week (prescribe on the plan as it stands).
2. Updates the row: new exercise id and name, `starting_weight = NULL`; rest changed only if `restAfterSwap` says so (`swapCarry.js:73-83`: the new tier's default rest replaces the old only when the tier changes AND the old rest equals the old tier's default in `REST_SEC` or `STRENGTH_REST`, `src/lib/exercise/prescription.js:72-83`, `:150-159`). Sets and reps stay.
3. Then, in one transaction of its own (`inOneWrite`, `database.js:5285-5290`; the row update in step 2 is a separate statement before it): `planFactsAfterSwap` adds `facts.slots[routineId][newExerciseId] = {muscle, kind, credits}` (`swapCarry.js:140-153`); for a muscle change on a running block, `moveSlotSetsInBlock` (`database.js:5410-5441`) subtracts each week's served sets from the old muscle's row (not below 0) and adds them to the new muscle's row (or creates it with the `VOLUME_LANDMARKS` band), current and later weeks only; it refuses the whole move when the destination row is `source: 'reintroduction'` or has `mrv <= 0`. `moveSlotShares` re-normalises `exposureShares`, `moveWeeklyTargets` moves `facts.weeklyTargets` the same way (`swapCarry.js:200-241`).

What is checked: only the reintroduction/blocked destination rule. Not checked: the destination muscle's `recoverySafeMax`, its role ceiling, its session caps (prescribe will report a shortfall instead), the day the exercise lands on or its neighbours in the rotation, the category's direct floor for either muscle. The new exercise's kind is the corpus's (`deriveParamKey`), so its cap follows at serve time.

Samples (SQLite, block in week 5):

| Swap | Rows before (w1 to w6) | Rows after | Served after (week 5) |
|---|---|---|---|
| Legs + Abs: Seated Leg Curl (hamstrings) to Leg Extension (quads) | quads 4,5,6,7,8,4; hamstrings 4,5,5,6,6,3 | quads 4,5,6,7,10,5; hamstrings 4,5,5,6,4,2 | Back Squat 4 to 3, Leg Press 4 to 3, Leg Extension 2, RDL 4; quads 8 direct in the session (cap 8), quads shortfall 2 |
| Upper A: Reverse Pec Deck (rear_delts) to Barbell Shrug (traps, isolation) | traps 4,7,9,12,14,4 (template row); rear_delts 6,6,6,6,6,3 | traps 4,7,9,12,16,5; rear_delts 6,6,6,6,4,2 | Barbell Shrug 3 (the slot served 2 before), traps shortfall 13 |

- The quads week-5 target (10) is above the plan's `recoverySafeMax.quads` (8); `recoverySafeMax` was not updated (quads 8, hamstrings 7 after).
- Hamstrings week 5 (4) and rear delts week 5 (4) are below the men's physique floors (6 and 6).
- `facts.weeklyTargets` moved the same way (quads ...10,5; hamstrings ...4,2). `exposureShares` has no quads or hamstrings entry in this plan (single-session muscles), so nothing moved there.
- Traps has no `facts.weeklyTargets` series and role `maintenance`, so only the template row moved.

---

## 4. Continuity and rebuilds

### 4.1 Continuity (`src/lib/exercise/continuity.js`, wrapper `withContinuity`, `src/lib/planAutoGen.js:685-760`)

- Incumbents: every exercise of the person's active plan, with key `primaryMuscle::movementFamily` (`loadIncumbentSlots`, `planAutoGen.js:452-482`; `slotKey`, `continuity.js:76-78`). The raw library `primaryMuscle` is used, not the planner's slot muscle.
- `applyContinuity` (`continuity.js:112-379`): for each generated exercise, the first unused incumbent with the same key that the generator did not itself place elsewhere and that is not already in this workout; a reviewed REPLACE may match any unused incumbent of the same muscle (`:203-209`). The verdict is `slotVerdict(evidence, context)` from `programmeEpoch` (or the reviewed proposal's verdict, except a reviewed keep of a capability-ineligible movement, `:280-282`). Keep: the incumbent's id replaces the generated one, everything else in the slot (sets, reps, rest, position) stays the generator's (`:327-347`); a reviewed prescription change applies its rep range. Not keep: the generated exercise stays, reported REPLACED. Incumbents that matched nothing are reported NO_LONGER_IN (`:362-376`).
- Evidence: equipment reachability is computed from all exercises against the new equipment (`planAutoGen.js:726-731`); context `{ epochBlocks: 0 }`, so elective variation is off (`:750-753`).
- Continuity never changes sets, never adds or removes slots, and never checks recovery or adjacency.

### 4.2 Continuity for the new planner

- `plannerV2KeptExercises` (`planAutoGen.js:1583-1613`) offers each unique incumbent to `withContinuity` as its own slot; the RETAINED ones are the kept exercises.
- `plannerV2KeptChoices` (`planAutoGen.js:1501-1569`) inserts them into the catalogue choices handed to the planner: (1) the same exercise keeps its place; (2) otherwise it takes the first catalogue place of the same family; (3) a family the catalogue has no choice for goes to the front of the muscle's list. Rows without a load prescription (`weight_reps`, `weighted_bodyweight` only) are not handed over. Kind = `deriveParamKey`, credits = `catalogueCredits` (else none).
- After the planner builds, `resolvePlannerV2Plan` (`planAutoGen.js:1632-1657`) runs `withContinuity` again over the planner's workouts (the receipt), resolves against the library, and orders same-position work. If continuity swaps in an incumbent of the same family that the planner did not pick, the slot's `muscle`, `kind` and `credits` written into `facts.slots` are the planner choice's, under the incumbent's id (`saveWithPlannerV2`, `planAutoGen.js:1983-1988`). UNVERIFIED whether this occurs in practice (it needs the planner to leave a kept exercise unpicked while continuity keeps it).

### 4.3 Rebuild at next session (`src/lib/planRebuild.js`)

Trigger: `ensureActivePlanRebuilt(userId)` (`:668-680`), awaited before loading by Home (`HomeScreen.js:535`), Plans (`PlansScreen.js:354`) and Plan detail (`PlanDetailScreen.js:129`). The header (`:7-9`) also names "the session"; no session screen calls it. Release switch `PLAN_REBUILD_AT_NEXT_SESSION = true` (`:88`).

`run` (`:594-652`): nothing to do when the active plan's facts are version 2, or this device recorded it done or skipped, or failed `MAX_ATTEMPTS` = 2 times (`:92`, `:601-610`). Kind (`classifyPlanKind`, `:117-126`): LIBRARY when `source_programme_id` points at a library programme (kit plans are library copies); GENERATED when any routine has a `split_type` or any row a `selection_reason`; else MANUAL.

| Kind | Builds with | Writes (`rebuildPlanKeepingBlockV2`, `database.js:6894-7087`, one transaction) | Kept | Replaced |
|---|---|---|---|---|
| GENERATED (`:329-389`) | `planGeneratedRebuildV2` (`planAutoGen.js:2087-2134`): the planner with the plan's routine count as days, kept exercises per 4.2, generator picks outside the catalogue that the person never logged excluded from the kept set (`generatorPicksOutsideCatalogue`, `planRebuild.js:271-298`) | a NEW programme (mode `new_programme`): routines, rows, facts with `kind: 'generated'`; activated; only the replaced programme archived | the block, its weeks, past weeks' rows, the stored RIR ladder (`database.js:7015-7025`) | every routine and exercise row; the block's rows for the current and later weeks |
| LIBRARY (`:391-472`) | `planFixedRebuildV2` (section 5) | mode `in_place`: `recommended_sets` of every planned row and routine `position`; facts with `kind: 'library'` and `typed` for rows the planner cannot set | exercises, their order in each session, reps, rest, notes, load, supersets; circuits and timed rows (served as typed) | set counts, session order, block rows from the current week |
| MANUAL (`:474-508`) | no planner | facts `{version 2, kind 'manual', roles all 'standard', typed: every stored count, weeklyTargets: the person's sums, flat, half in week 6}` | every row | block rows from the current week |

Skips (`:321-327`, `planAutoGen.js:2090-2134`): no goal (retried later), days the planner cannot hold (`days_not_kept`, e.g. a beginner with 5 or 6 routines), a style-tagged plan (`style_plan`), no catalogue for the kit, nothing resolved; library plans with fewer than 2 or more than 6 sessions or an empty planned session.

Rows written for the current and later weeks (`database.js:7027-7071`): accumulation week i takes `targets[min(i, len - 1) - 1]`, the recovery week the last entry; existing rows are skipped only when `source = 'reintroduction'` or `mrv = 0` (`REBUILD_KEEPS_SOURCES`, `:6849`, `:7051`); `source: 'coach'` rows are overwritten. A person in week 4 enters the new plan at its week-4 level.

Sample (SQLite): the shared plan saved, block moved to week 3, chest week 4 raised by a coach row to 12, facts cleared so it reads as a generated plan without v2 facts; `ensureActivePlanRebuilt` returned `rebuilt`, kind `generated`, a new programme; old programme `is_active 0, is_archived 1`; facts `version 2`, `kind 'generated'`, `rirLadder [3,2,2,1,1,4]` (the block's). Chest rows before `6,7,8,12(coach),10,5`, after `6,7,8,9,10,5`. Side delts, quads and traps rows unchanged in value (same planner, same profile). A second call returned `current`.

### 4.4 "Update your plan" (`PlanUpdateScreen.js:349-361`)

`generateAndSavePlan(userId, profile, { keepBlock })`, `keepBlock = keepsBlockOnRebuild(...)` (`src/lib/planDiff.js:162-185`: true only when the block is active or in recovery and no exercise is added, dropped, replaced or no longer in). With the planner on and no style pool, `saveWithPlannerV2` (`planAutoGen.js:1889-2060`): new programme; `activatePlanKeepingBlock` (`database.js:5787`) when keeping the block, else `activatePlanWithBlock`; then `writePlannerV2WeeklyRows` from the current week (kept block) or week 1 (new block), with no source check (see P12). The older generator's own keep-block branch writes no rows at all (`planAutoGen.js:1184-1190`).

### 4.5 Block boundary and every other activation

- Refined next block (`PlansScreen.js:747-781`): `generateAndSavePlan` with the ledger's seed ranges and the reviewed continuity proposal; a new programme and a new block with the planner's rows (when the planner builds it).
- Repeat, or an unrefined continue (`PlansScreen.js:790-796`), the refinement's fallback (`:781`), "Set active" on a saved plan (`PlansScreen.js:910`, `PlanDetailScreen.js:338`), library and kit installs (`startWithPlan.js:314`, `PlanLibraryScreen.js:528`, `PlanDetailScreen.js:317`), manual plans (`ManualBuilderScreen.js:1023`): `activatePlanWithBlock` only. The new block's rows come from `generateInitialPlannedVolume` (template ramp or learned seed). For a plan already carrying v2 facts nothing rewrites them with the planner's targets, and the rebuild trigger does not fire (facts are version 2). Sample: see P1.
- `planSwitch.js` changes nothing itself: `confirmPlanSwitchMidBlock` (`src/lib/planSwitch.js:48-128`) only shows the confirmation dialogues (first activation, recovery week, awaiting decision, mid-block restart) and `readActiveBlockStatus` (`:15-29`) reads the block position.

---

## 5. Library and kit plans: the fixed-structure mode

Path: `rebuildFixed` (`planRebuild.js:391-472`) builds `fixedSessions` with `fixedSessionsFromPlan` (`:150-184`): per routine in position order, every row except circuit members, rows with no load prescription and rows with no primary muscle (those become `typed` at their stored count); each exercise carries the corpus primary muscle, `deriveParamKey` kind, and the catalogue's curated credits or else the corpus credits. Then `planFixedRebuildV2` (`planAutoGen.js:2152-2183`) calls `buildPlan` with `daysPerWeek: sessions.length` and `fixedSessions`.

In the planner (`planner.js`):
- `prepareFixed` (`:334-370`): 2 to 6 sessions or it throws; the only family is the person's sessions (`key: 'fixed'`); a muscle's sessions are exactly those whose exercises train it.
- `heldWhereAuthored` (`:382-397`): a muscle the goal would not train directly but the person authored is held at maintenance on its own exercise.
- Session caps are raised to what the authored exercises hold at their 2-set floors (`:535-542`); light caps never go below the authored floors (`withAuthoredFloors`, `:631-640`); `sessionRoom` uses the person's own exercises, never the thin bonus (`:596-601`).
- Not run in fixed mode: the session-count search, readiness fixes that add or remove a session (`:677`, `:717`, `:827-828`), the ramp from logged history (`:893`), the slower-recoverer cap (`:916`), the extra-exercise loops (`:952`).
- `balanceSlots(..., keepAuthored = true)` keeps each session's authored exercise order (`:1140-1143`); the rotation order of the sessions is still chosen (`toPlan`, `:1369-1377`).

What is fixed: the sessions, the exercises in each, their order inside the session, reps, rest, notes, load, supersets (none of these is written: `database.js:6995-7012`). What the planner changes: every planned exercise's set count in every week (stored count becomes week 1's), the block rows for the current and later weeks, the order of the sessions, the light and heavy split, the facts (`kind: 'library'`).

Sample (pure, fixed sessions built as `fixedSessionsFromPlan` builds them; profile goal general, intermediate, 60 min):

Beginner Push / Pull / Legs (`src/lib/seedRoutines.js:189`), rotation order unchanged:

| Session | Exercise | Authored sets | Planner w1 | w5 (served) | w6 |
|---|---|---|---|---|---|
| Push | Barbell Bench Press | 4 | 2 | 4 | 2 |
| | Incline Dumbbell Press | 3 | 2 | 4 | 2 |
| | Dumbbell Shoulder Press | 3 | 2 | 2 | 1 |
| | Dumbbell Lateral Raise | 3 | 2 | 3 | 2 |
| | Tricep Pushdown (Rope) | 3 | 2 | 3 | 2 |
| Pull | Lat Pulldown (Wide Grip) | 4 | 2 | 3 | 2 |
| | Seated Cable Row | 3 | 2 | 3 | 1 |
| | Machine Row (Chest Supported) | 3 | 2 | 2 | 1 |
| | EZ Bar Curl | 3 | 2 | 3 | 2 |
| | Hammer Curl | 2 | 2 | 3 | 1 |
| Legs | Barbell Back Squat | 4 | 2 | 3 | 2 |
| | Leg Press | 3 | 2 | 3 | 1 |
| | Romanian Deadlift (Barbell) | 3 | 2 | 4 | 2 |
| | Leg Extension | 3 | 2 | 2 | 1 |
| | Lying Leg Curl | 3 | 2 | 3 | 2 |

Weekly targets at week 5: chest 8 (authored 7), back 8 (authored 10), biceps 6 (5), side delts 3 (3), triceps 3 (3), front delts 2 (3), quads 8 (10), hamstrings 7 (6). Roles: front delts held at maintenance on its own exercise (Dumbbell Shoulder Press, `heldWhereAuthored`); rear delts, glutes, calves and abs are maintenance with no exercise and no target in this plan. Week-5 session totals 16, 14, 15.

Upper / Lower 4×/Week (`seedRoutines.js:230`): authored order Upper A, Lower A, Upper B, Lower B; rotation chosen `Lower A, Upper B, Lower B, Upper A`. Conventional Deadlift is planned as a back exercise (its corpus primary muscle): 2 sets in weeks 1 and 5 (peak 2; authored 3). Week-5 back target 12, served Lat Pulldown 2 (authored 4) and Machine Row 2 in Upper B, Barbell Row 3 and Seated Cable Row 3 in Upper A, the deadlift 2 in Lower B.

---

## 6. The older generator (`src/lib/planEngine.js` `generatePlan`)

### 6.1 When it runs

- Save: `generateAndSavePlan` uses it when `PLANNER_V2` is false (`src/lib/plan/release.js:22` sets it true), when the active plan carries a style tag (kettlebell or circuit pool, `planAutoGen.js:1023-1029`, `:1037`), or when `saveWithPlannerV2` returns null: the planner threw, the catalogue has nothing for the kit, the plan has no workouts or no `v2`, or nothing resolved for a reason other than the person's exclusions (`planAutoGen.js:1889-1938`). Call at `:1047`.
- Preview: `generatePlanDryRun`, same cases (`planAutoGen.js:2319-2333`).
- Always, for every plan regardless of which builder saves it: the schedule-fit answer during onboarding and Update your plan (`assessScheduleFit`, `planAutoGen.js:250-295`, generator call at `:278`; `ProOnboardingScreen.js:1634`, `PlanUpdateScreen.js:247`); the division fingerprint and coverage lines (`computeDivisionDiff`, `computeDivisionCoverage`, `src/lib/divisionDiff.js:87-95`, `:196-203`; `RoutineDetailScreen.js:500-503`, `VolumeHeatmapScreen.js:441`). See P9.

A plan it saves has no v2 facts, so it is served by the multiplier (1.10) until the rebuild at next session replaces it (4.3), which skips style plans permanently.

### 6.2 Pipeline, in execution order

`generatePlan` (`:3210-3241`) sets the module's effective pool from the library (`buildEffectivePool`, `:759-797`: the library-generated pool, normalised to movement families; a muscle with fewer than 3 generated entries, `MIN_GENERATED_PER_MUSCLE`, takes the hand-written `POOL` entries that exist in the catalogue) and the style allow-list, then `_generatePlanInner` (`:3243`):

1. Inputs and clamps: weak points capped at 3 and mapped to muscle keys (`resolveWeakPointKeys`, `:82-89`, `WEAK_POINT_MAP` `:61-79`); days clamped to 2 to 6, a beginner to 4 (`:3289-3291`); `internalGoal` = `weak_point_spec` for phase `weak_point`, `strength_hypertrophy` for `strength_size`, else the goal (`:3300-3302`).
2. Split: a matrix division (`DIVISION_MATRIX` keys: mens_physique, classic_physique, bikini, wellness, figure, womens_physique, `:2363-2538`) takes its cell for the day count (`:3310-3312`); general, bodybuilding and women's bodybuilding use `selectSplit` (`:1939-2000`): 2 days full body; 3 days full body (ppl for advanced or competitive, not lower-led); 4 upper_lower; 5 upper_lower_wp for `weak_point_spec`, lower_focus for lower-led divisions, balanced_ul otherwise; 6 lower_focus for lower-led, else ppl_ab. A demonstrated structure from completed blocks replaces the selector only off the matrix and only for the same day count (`:3335-3344`).
3. Landmarks (`computeLandmarks`, `:135-156`): `VOLUME_LANDMARKS` x experience, recovery, nutrition and age multipliers (`EXP_MULT`, `REC_MULT`, `NUT_MULT`, `ageMultipliers`, `:101-128`); `MAVlow = MEV + 2`, `MAVhigh = max(MAVlow, MRV - 1)`.
4. Base weekly targets = MEV (`:3350-3353`).
5. `applyGoalOverlay` (`:162-277`): a division multiplier above 1 places the muscle at `MAVlow + min(1, (mult - 1) / 0.6) x (MRV - MAVlow)` (`PRIORITY_NORM`); below 1 multiplies MEV; phase overlays multiply (`PHASE_OVERLAYS.strength_size`, `coachingGoals.js:610-616`); for phase `weak_point` only, each weak point gets `max(2, round(0.7 x (divisionMRV - t)))` and the added sets are taken from the lowest-priority muscles down to MV; every muscle capped at 110% of MRV; a systemic cap `round(sum of MRVs x 0.40)` (0.34 for a non-matrix 3-day week) scales everything down proportionally when exceeded.
6. `enforceWeeklyFloorsAndCaps` (`:373-524`), on `SPEC_LANDMARKS` (`:299-326`, which differ from `VOLUME_LANDMARKS` for rear delts, traps, glutes, side delts, biceps, abs, forearms, adductors): structural muscles (chest, back, side delts, quads, hamstrings, glutes) at least the maintenance floor (6, or 4 at 3 days or fewer); muscles with a division multiplier ≥ 1 at least their MEV; lower-led divisions at 5+ days give biceps and triceps 4; synergist trims (biceps by 0.4 x back, triceps by 0.5 x chest, glutes by 0.3 x quads + 0.4 x hamstrings when the drivers can deliver glute work), never for a weak point, not below MEV + 2 (or `max(3, maintenance - credit)` for a de-emphasised muscle); per-muscle `divisionMRV` (glutes 30 for raised-ceiling divisions, else the spec MRV); the three delt heads scaled together to 26 (`SIDE_REAR_DELT_CAP`); at 2 days glutes at least the maintenance floor.
7. Build sessions: matrix cells via `buildFromMatrix` (`:2589-2652`): a missing structural muscle is appended to a session of the same movement pattern; each weak point is added (at the front) to further same-pattern sessions up to `min(3, sessions, max(2, ceil(target / 9)))`, one added muscle per session. The weak-point list is read whatever the phase. Other splits via `buildFullBodyWorkouts`, `buildUpperLowerWorkouts`, `buildWeightedUpperLower`, `buildPPLWorkouts`, `buildUpperLowerWPWorkouts` (`:2062-2338`).
8. `buildSession` (`:2006-2056`), per muscle in the session's order: `sessionTarget = min(sessionCap, round(weekly / sessionsForMuscle))`, `sessionCap` 12 for a weak point (any phase), else 8 (`:2027-2028`); below 2 the muscle is skipped (`:2029`); `roleSlot` = how many times this muscle has been visited this week (`:2037-2038`).
9. `selectExercisesForMuscle` (`:1488-1902`): pool filtered by equipment, style pool and division rules (`filterPool`, `:1392-1421`); `NEVER_AUTO` names removed; staple and common names preferred when at least `max(2, ceil(target/4))` remain; beginners lose difficulty-3 lifts and others lose assisted lifts under the same never-starve rule; required roles from `SUBREGION_REQUIREMENTS` (`:853-900`) once the weekly target reaches `minSets`, plus a division's feasible required roles; ranking `sortScore` (6.3). `numEx = min(ceil(target / 4), max(1, floor(target / 3)))` (`:1715-1723`). Pass 1 covers required roles; when there are more roles than exercises the roles rotate by `roleSlot` (`(roleSlot + k) % roles`, `:1734-1740`), so a muscle trained twice covers both roles across the week. Pass 2 fills with a new family, then any. A growth loop adds an exercise while the chosen exercises' caps cannot hold the target and another 3-set entry fits (`:1807-1817`). Distribution: each entry `min(cap, remaining - 3 x entries after)`, rounded up, at least 3 (`MIN_SETS_PER_ENTRY`); when the chosen exercises' caps cannot hold the target the LAST entry takes the remainder over its cap (`:1840-1868`). `makeEx` (`:929-957`): reps and rest from `repRangeFor`/`restFor`, `rirTarget` by experience (beginner 3, intermediate 2, else 1, +1 on a cut), sets at least 3 for compounds and 2 for isolations. The `rirTarget` is not stored: `addExerciseToRoutine` has no effort column (`database.js:5125`).
10. Strength notes on long-rest lifts for `strength_hypertrophy` (`:3406-3414`).
11. `clampDeliveredToMRV` (`:999-1038`): a muscle (delts together at 26) over its MRV loses sets, over-cap entries first, entries kept at 3 or more, never a muscle's last entry.
12. `computeStructuralFloors` (`:1304-1344`) and the priority muscles (above MAVlow, or the division's priority list, `:3439-3444`); `sessionsRemaining` counts sessions per muscle (`:3461-3466`).
13. `fitToTimeBudget` (`src/lib/timeConstraint.js:120-287`, called at `planEngine.js:3480`): per session while over the length + 5 min (`TIME_TOLERANCE_MIN`): drop a second exercise of a muscle (not a required-role one, not protected, floors kept); else drop a muscle's exercise from a session when the muscle is trained elsewhere, lowest priority first; else shave a set (not below 3), lowest priority first. Status FIT, CONSTRAINED_BUT_VALID or USER_DECISION_REQUIRED.
14. Per session: `deduplicateExercises` (`:2658-2665`), then `trimToTimeBudget` (`:1079-1272`): shave then drop to meet the clock, 8 exercises (`MAX_EXERCISES_PER_SESSION`) and 25 sets (`MAX_WORKING_SETS_PER_SESSION`), a desperate pass that relaxes structural floors, then a hard backstop that drops exercises (never the last of a muscle for the week) and shaves sets to 25. Internal tags are stripped; a session more than 15 minutes over gets a duration note.
15. Empty sessions removed (`:3553`).
16. `sequenceSessionsForRecovery` (`src/lib/recovery/sequenceSessions.js:438-504`, called at `planEngine.js:3569-3576` with `PLAN_OPENING_RIR`): the first session never moves; every order of the rest is scored by `recoveryHours` against the typical week's gaps (`TYPICAL_WEEK_GAP_HOURS`), plus a 1e6 penalty for two literally adjacent sessions sharing more than half of their primary sets (the wrap pair is never scored for adjacency); the strictly lowest wins.
17. `reletterByPosition` (`:810-830`): generated splits are re-lettered by final position ("Upper A", "Lower A", ...); matrix names are kept.
18. Division coverage, warnings, weekly summary, why-this, plan name (`:3595-3712`).

### 6.3 Priorities

- Weekly volume per muscle is decided before structure (steps 3 to 6); sessions only distribute it (step 8); clamps and the clock then remove from it (steps 11 to 14).
- Exercise ranking, `sortScore` (`:1633-1693`): required role (0 or 100) + parameter tier x 10 (heavy compound 0, moderate 10, machine 20, isolation 30) + division role nudge (-5 / (rank + 1)) + goal bias (strength: -3 for barbell or landmine heavy compounds; else -SFR/10) + canonicality (tier rank x 2) + fatigue stacking (+3 once 2 high-fatigue lifts are in the session) + the candidate's index in the filtered pool. The comment above it (`:1601-1603`) says each term is an order of magnitude below the previous; the pool index is not bounded (pools after the staple-and-common gate, full gym: chest 36, back 41, quads 31, biceps 23 entries), so position in the pool can outweigh the parameter tier, canonicality and the division nudge (see P8).
- Time: weak points and division priority muscles are trimmed last; structural floors bind the per-session trim; nothing can take a muscle to zero for the week.

### 6.4 Samples (real library, inputs from `buildPlanInputs`, `planAutoGen.js:111-145`; intermediate, full gym, 60 minutes, phase maintain)

Men's physique, 4 days ("Men's Physique · Maintain · V-Taper 4×/week"; time status `user_decision_required`: Upper A 78 min, Upper B 83 min). The matrix order is Upper A, Legs + Abs, Upper B, Shoulders + Arms (`planEngine.js:2371-2376`); the recovery sequencer chose the order below:

| Session | Exercise | Muscle | Kind | Sets | Reps | Rest | RIR | Reason |
|---|---|---|---|---|---|---|---|---|
| Upper A (Width), 78 min, 22 sets | Lat Pulldown (Close Grip) | back | mod | 4 | 8-12 | 150 | 2 | required_role |
| | Barbell Row (Bent Over) | back | heavy | 3 | 6-10 | 180 | 2 | required_role |
| | Dumbbell Lateral Raise | side_delts | iso | 3 | 10-20 | 75 | 2 | family_diversity |
| | Incline Barbell Bench Press | chest | heavy | 3 | 6-10 | 180 | 2 | required_role |
| | Barbell Bench Press | chest | heavy | 3 | 6-10 | 180 | 2 | required_role |
| | Cable Face Pull | rear_delts | iso | 3 | 10-20 | 75 | 2 | required_role |
| | Spider Curl | biceps | iso | 3 | 10-20 | 75 | 2 | required_role |
| Shoulders + Arms, 51 min, 17 sets | Cable Lateral Raise | side_delts | iso | 5 (cap 3) | 10-20 | 75 | 2 | family_diversity |
| | Cable Face Pull (Rope) | rear_delts | iso | 3 | 10-20 | 75 | 2 | required_role |
| | Barbell Overhead Press | front_delts | heavy | 3 | 6-10 | 180 | 2 | family_diversity |
| | Incline Dumbbell Curl | biceps | iso | 3 | 10-20 | 75 | 2 | required_role |
| | Dumbbell Overhead Tricep Extension | triceps | iso | 3 | 10-20 | 75 | 2 | required_role |
| Legs + Abs, 62 min, 18 sets | Bulgarian Split Squat | quads | mod | 3 | 8-12 | 150 | 2 | family_diversity |
| | Leg Extension | quads | iso | 3 | 10-20 | 75 | 2 | family_diversity |
| | Romanian Deadlift | hamstrings | heavy | 3 | 6-10 | 180 | 2 | required_role |
| | Lying Leg Curl | hamstrings | iso | 3 | 10-20 | 75 | 2 | required_role |
| | Barbell Hip Thrust | glutes | heavy | 3 | 6-10 | 180 | 2 | family_diversity |
| | Seated Calf Raise (Barbell) | calves | iso | 3 | 10-20 | 75 | 2 | family_diversity |
| Upper B (Detail), 83 min, 25 sets | Leaning Lateral Raise | side_delts | iso | 4 (cap 3) | 10-20 | 75 | 2 | family_diversity |
| | Lat Pulldown (Neutral Grip) | back | mod | 3 | 8-12 | 150 | 2 | required_role |
| | Chest-Supported T-Bar Row | back | heavy | 3 | 6-10 | 180 | 2 | required_role |
| | Incline Dumbbell Press | chest | mod | 3 | 8-12 | 150 | 2 | required_role |
| | Floor Press (Barbell) | chest | heavy | 3 | 6-10 | 180 | 2 | required_role |
| | Dumbbell Rear Delt Fly | rear_delts | iso | 3 | 10-20 | 75 | 2 | required_role |
| | Barbell Curl | biceps | iso | 3 | 10-20 | 75 | 2 | required_role |
| | EZ Bar Skull Crusher | triceps | iso | 3 | 10-20 | 75 | 2 | required_role |

Delivered direct sets a week: back 13, side delts 12, chest 12, rear delts 9, biceps 9, triceps 6, quads 6, hamstrings 6, front delts 3, glutes 3, calves 3, abs 0.

How the numbers arise (worked by hand from the code with the printed landmarks, not instrumented; the delivered numbers match the run): overlay targets side delts 21, back 19, rear delts 15, chest 13, biceps 12, triceps 12, front delts 4, quads 6, hamstrings 4, glutes 2, calves 5, abs 2, traps 3 (systemic total 126 under the cap 138); after step 6: biceps trimmed to 10 (credit 8 from back), triceps to 8, glutes to 3, hamstrings and quads floored at 6, the delt heads scaled from 20 + 14 + 4 to 14 + 10 + 3. Per-session targets (step 8): back 8 (19/2 capped), side delts 5 (14/3), chest 7, rear delts 3, biceps 3, triceps 3, calves 3, abs 1 (skipped, below 2), front delts 3, quads 6, hamstrings 6, glutes 3. A 5-set side-delt target with `numEx` clamped to 1 gives one isolation exercise 5 sets (step 9's remainder rule). The time and D45 trims then removed Upper A's triceps and Upper B's calves and shaved several 4-set entries to 3. Matrix muscles that end with nothing: abs (in two sessions of the matrix, delivered 0), calves in Upper B, triceps in Upper A.

General, 4 days ("Build Muscle · Maintain · Upper-Lower 4×/week"; `user_decision_required`: Upper A 72 min, Upper B 69 min):

| Session | Exercises (sets) |
|---|---|
| Upper A, 72 min, 21 sets | Barbell Bench Press 3, Lat Pulldown (Close Grip) 5 (compound cap 4), Dumbbell Lateral Raise 4 (cap 3), Cable Face Pull 3, Barbell Curl 3, Close-Grip Bench Press 3 |
| Lower A, 51 min, 17 sets | Leg Extension 4 (cap 3), Lying Leg Curl 3, B-Stance Hip Thrust 3, Standing Calf Raise (Barbell) 4 (cap 3), Weighted Sit-Up 3 |
| Upper B, 69 min, 21 sets | Incline Barbell Bench Press 3, Barbell Row (Bent Over) 5 (cap 4), Leaning Lateral Raise 4 (cap 3), Dumbbell Rear Delt Fly 3, EZ Bar Curl 3, Barbell Skull Crusher 3 |
| Lower B, 60 min, 16 sets | Barbell Back Squat 4, Romanian Deadlift 3, Barbell Hip Thrust 3, Seated Calf Raise (Barbell) 3, Cable Crunch 3 |

Delivered: chest 6, back 10, side delts 8, rear delts 6, biceps 6, triceps 6, quads 8, hamstrings 6, glutes 6, calves 7, abs 6, front delts 0. Reps and rest as the table above by kind (heavy 6-10 / 180 s, moderate 8-12 / 150 s, isolation 10-20 / 75 s), RIR 2. Each per-session target of 4 or 5 sets became a single exercise (step 9: `numEx` is 1 for targets 4 and 5), so an isolation exercise took 4 (cap 3) and a compound took 5 (cap 4). The quads are covered by one exercise a session, knee extension in the session named Lower A and squat in Lower B, consistent with the role rotation (step 9) followed by relettering after the sequencer reordered the week (UNVERIFIED which built session became which name; the sequencer's internal order is not exposed).

With weak points Side Delts and Biceps, phase maintain: the same structure; side delts 13 and biceps 10 delivered (the weak-point session cap of 12 applies; the weekly bonus does not, it needs phase `weak_point`; both muscles already sit in three sessions, so the matrix augmentation adds none); Incline Dumbbell Curl 4 (cap 3). With phase `weak_point` (nutrition key `lean_gain`): biceps 18 delivered (two curls in each of three sessions), triceps falls to 3 (only Dumbbell Overhead Tricep Extension), side delts 12; warning "Biceps is already one of this division's highest-priority muscles...".

---

## 7. Every path that can change a plan after it is built

"Recovery" = reads the recovery model or a recovery-derived limit. "Adjacency" = looks at which sessions are next to each other in the rotation. "Standard" = the category's direct floor (`STANDARD_DIRECT_FLOOR`, `DIVISION_STANDARD`); `grep` finds it read only in `src/lib/plan/roles.js:34`, the build.

| Path | Trigger | What it changes | Recovery | Adjacency | Caps checked | Standard | Where |
|---|---|---|---|---|---|---|---|
| Weekly serving (v2) | every session, plan screen, forecast | this week's sets per exercise (not stored) | no | no | per-exercise, session direct and fractional | no | `coachApply.js:395-415`, `prescribe.js:149` |
| Weekly serving (no v2 facts) | same | sets = stored x week row / week-1 row | no | no | none | no | `coachApply.js:416-428` |
| Session -1 / +1 | session start | this session's sets on up to 2 exercises | soreness and feedback only | no | v2: exercise cap, session caps, role top; else MEV/MAV/MRV | no | `algorithms.js:1344`, `sessionAdjustments.js:496` |
| Readiness or re-entry ease | intent sheet, return from a gap | this session: -1 set each, loads x 0.95 | no | no | floor 1 set | no | `sessionAdjustments.js:640-785`, `ActiveWorkoutScreen.js:1276-1296` |
| One-off swap | swap sheet, "Just this session" | this session's exercise; sets held to its cap | no | no | the new exercise's cap | no | `ActiveWorkoutScreen.js:2028-2037`, `sessionAdjustments.js:243` |
| Permanent swap | "From now on" (logger or routine screen) | the row's exercise, load, maybe rest; `facts.slots`; for a muscle change on the running block: rows, `exposureShares`, `weeklyTargets` from the current week | no | no | refuses only a reintroduction or blocked destination | no | `database.js:5218-5441`, `swapCarry.js` |
| Typed set count | editing a row's sets on the routine screen | `facts.typed`: served as typed every week, caps do not apply | no | no | none | no | `RoutineDetailScreen.js:648-668`, `database.js:4981-4990` |
| Manual add or remove of an exercise | routine screen | rows; prescribe redistributes the muscle's week across the remaining slots; an added exercise has no `facts.slots` entry and is served on the corpus's model | no | no | prescribe's caps | no | `sessionAdjustments.js:104-113` (UNVERIFIED which screens can add rows to a v2 plan's routines) |
| Check-in, v2 increase | Apply on the coach card | next week's rows, later weeks' rows, roles raised; exercises opened only without `recoverySafeMax` | build-time `recoverySafeMax` only | no (`gapRanks` only to place an opened exercise) | per-exercise, session caps, role ceiling, 25 working sets against the prior count, 8 exercises when opening | no | `checkinPlacement.js:250-470`, `checkinPlan.js:181-285` |
| Check-in, v2 hold / withheld / pull-back | Apply | next and later weeks' rows (lower) | no | no | pull-back: fractional maintenance floor 4 | no | `checkinPlacement.js:293-302`, `:365-406` |
| Check-in, legacy | Apply | next week's rows ± signal | no | no | row [mev, mrv] | no | `coachApply.js:309-348` |
| Early deload | Apply on the deload suggestion | next week flipped to recovery, rows cut | strain grade only | no | row floor `max(1, round(mev/2))` | no | `CoachOutputScreen.js:1476-1520`, `coachApply.js:185-210` |
| Reintroduction ramp | person ends a capability episode | rows of released muscles for weeks after "the current" week, `source: 'reintroduction'` | no | no | never above the block's own peak | no | `src/lib/capability/reintroduction.js:32-104` (see P15) |
| Rebuild at next session | first open of an active plan without v2 facts | generated: new programme and rows from the current week; library: sets and session order; manual: facts | the planner's own (build) | the planner's own (build) | the planner's own (build) | the planner's own (build) | `planRebuild.js:594-652`, `database.js:6894-7087` |
| Update your plan | PlanUpdateScreen | new programme; block kept or restarted; rows from the current week (kept) or week 1 | build | build | build | build | `PlanUpdateScreen.js:349-361`, `planAutoGen.js:1889-2060` |
| Next block, refined | block decision with changes | new programme and block | build | build | build | build | `PlansScreen.js:747-781` |
| Next block, repeat / continue; set active; library, kit, manual install | block decision, plan list, plan detail, library | new block with template or learned rows; the programme unchanged | no | no | landmark ramp only | no | `PlansScreen.js:781`, `:793`, `:910`; `PlanDetailScreen.js:317`, `:338`; `startWithPlan.js:314`; `ManualBuilderScreen.js:1023`; `database.js:5600-5755` |

---

## 8. Observed problems

P1. A plan the new planner built loses its planner targets at the next block and whenever it is activated again.
- Location: `activatePlanWithBlock` seeds rows from `generateInitialPlannedVolume` (`database.js:5742`, `:6268-6369`); the planner's targets are written only by `writePlannerV2WeeklyRows`, called only from `saveWithPlannerV2` (`planAutoGen.js:2021`). Callers that activate an existing plan: `PlansScreen.js:781`, `:793`, `:910`, `PlanDetailScreen.js:338`. The plan keeps `facts.version: 2`, so the rebuild trigger never fires (`planRebuild.js:603`).
- Reproduction (run, SQLite): save the shared plan; call `activatePlanWithBlock(userId, programmeId, 'Next block', { ledger: null, allowLearnedCarry: false })`. New block rows: side delts 8, 10, 12, 14, 16, 8 (facts 11 to 19), biceps 6 to 14 (facts 10 to 18), quads 8 to 14 (facts 4 to 8, `recoverySafeMax` 8), glutes 4 to 14 (facts 2 to 4, `recoverySafeMax` 4), back 10 to 16. Served by prescribe on those rows: week 1 Legs + Abs Barbell Back Squat 4, Romanian Deadlift 4, Barbell Hip Thrust 4, Leg Press 4 (the first block's week 1 served 2 each); week 1 Upper A Barbell Curl 1 and Barbell Overhead Press 1.

P2. The block keeps template rows for muscles the planner does not target, and they leak into readers and swaps.
- Location: `generateInitialPlannedVolume` writes all 17 `VOLUME_LANDMARKS` muscles; `writePlannerV2WeeklyRows` only overwrites the planner's (`planAutoGen.js:1846-1866`).
- Reproduction (run): the shared plan's block holds traps 4 to 14, forearms 4 to 16, adductors 0 to 10, neck 2 to 8, tibialis 2 to 8 with no exercise; prescribe reports them as shortfall every week (week 5: 56 sets). The coach card's ramp totals sum every row (`CoachOutputScreen.js:1925-1929`): week 1 83 against 71 served, week 5 168 against 112 served (arithmetic from the printed rows). A permanent swap of Reverse Pec Deck to Barbell Shrug added 2 to the traps template row (14 to 16) and the shrug was served 3 sets (the slot served 2), with a traps shortfall of 13 (3.3).

P3. A strong check-in on a planner plan adds far less than its card says, and the card counts the plan's own climb.
- Location: `checkinPlacement.js:303-311` (want relative to this week, floored at the plan's next week), `:484-510` (the 25-set ceiling cut), `:408-444` (card lines from this week's served sets), `:284` and `:691-693` (`plannedClimb` is a mode), `describeCheckin` `:716-731`.
- Reproduction (run): shared plan, week 2, signal 3: 7 sets above the plan's own week 3 in total (one each for side delts, front delts, triceps, quads, hamstrings, glutes, calves), nothing for chest, back, biceps, rear delts, abs; weeks 4 and 5 unchanged (every carried raise cut by the 25-set ceiling). The card's heading is "Next week: 3 more sets for each muscle that can take them"; it shows "Biceps, 2 more sets next week" (the plan's own 12 to 14), "Rear delts, 0 more sets next week." (blocked by `recoverySafeMax` 6, not listed as not raised), and "your plan's planned climb of 1 set" while side delts and biceps climb 2.

P4. Check-in exercise opening never runs for planner plans, and does run for manual plans.
- Location: `checkinPlacement.js:337` (`allowOpen` needs no `recoverySafeMax`), `planner.js:190-193` (every target muscle gets a number), `planRebuild.js:500` (manual facts have none).
- Reproduction (run): 2.7 (no exercise opened, with or without `recoverySafeMax`, because the 25-set cut came first) and 2.8 (four catalogue exercises opened into a person's manual sessions, Incline Dumbbell Press at 1 set in week 3).

P5. Served sessions exceed the D45 ceilings: three sessions hold 9 exercises in every week, and working sets pass 25 from week 4.
- Location: prescribe never checks `SESSION_CEILINGS` (`prescribe.js:149-259`); the planner records the breach in `facts.overCeilings` (`planner.js:1450-1451`).
- Reproduction (run): 1.9: Upper A, Shoulders + Arms and Upper B 9 exercises every week; Upper A 29 and 31 working sets in weeks 4 and 5; every session above 25 in week 5; `sessionMinutesAtPeak` 73.5 to 89.5 against 60. (The cause is in the build; 01 and 04 cover it.)

P6. The older generator writes exercises above the per-exercise cap, and the multiplier then raises them further.
- Location: `planEngine.js:1715-1723` (`numEx` clamped to 1 for targets of 4 and 5), `:1840-1868` (the last entry takes the remainder over its cap), `clampDeliveredToMRV` (`:999-1038`) only trims to the weekly MRV; `coachApply.js:416-428` scales without a cap.
- Reproduction (run): general 4 days: Lat Pulldown (Close Grip) 5, Barbell Row 5 (cap 4), Dumbbell Lateral Raise 4, Leaning Lateral Raise 4, Leg Extension 4, Standing Calf Raise 4 (cap 3). Men's physique: Cable Lateral Raise 5. Served on template rows: Cable Lateral Raise 10 and Barbell Hip Thrust 11 sets in week 5 (1.10).

P7. The older generator's men's physique 4-day plan delivers no abs and drops matrix muscles.
- Location: `buildSession` skip below 2 (`planEngine.js:2029`) with the abs target 2 split over 2 sessions; `trimToTimeBudget` hard caps (`:1079-1272`).
- Reproduction (run): 6.4: abs 0, calves 3, glutes 3 a week; triceps absent from Upper A and calves from Upper B although the matrix lists them (`planEngine.js:2371-2376`); two sessions 78 and 83 minutes against 60.

P8. The older generator's exercise ranking adds the raw pool index, contrary to its comment.
- Location: `planEngine.js:1601-1603` (comment) against the score's `+ idx` (`:1692`, the index from `rank`, `:1695-1698`).
- Reproduction (arithmetic from the code, not run): two candidates for the same non-required slot, a moderate compound at filtered index 0 (score 10 + 0) and a heavy compound at index 15 (score 0 + 15): the moderate compound ranks first. The filtered full-gym pools hold 23 to 41 staple and common entries for the major muscles (run).

P9. Screens describe the older generator's plan while the saved plan is the new planner's.
- Location: `assessScheduleFit` (`planAutoGen.js:250-295`), `computeDivisionDiff` and `computeDivisionCoverage` (`divisionDiff.js:87-95`, `:196-203`), used at `ProOnboardingScreen.js:1634`, `PlanUpdateScreen.js:247`, `RoutineDetailScreen.js:500-503`, `VolumeHeatmapScreen.js:441`.
- Reproduction (code-read): the schedule-fit answer for men's physique, 4 days, 60 minutes is computed from the generator's plan (6.4: two sessions over the length, `user_decision_required`); the plan saved is the planner's (section 0: all four sessions over, 73.5 to 89.5 minutes). The two disagree on structure and on which sessions are over. UNVERIFIED what each screen then shows.

P10. Different surfaces serve different weeks when the programme position lags the calendar.
- Location: the workout is linked to the position week (`HomeScreen.js:1753`, `:1791`; `database.js:3967-3974`) and served from it; the logger's recovery-week state reads the calendar week (`ActiveWorkoutScreen.js:2805-2809`); plan screens and the forecast serve the calendar week (`sessionAdjustments.js:431`); the check-in's this and next week are calendar weeks (`checkinPlan.js:98`, `CoachOutputScreen.js:2402-2404`); the session adjustment reads the calendar week's deload flag (`sessionAdjustments.js:548`, `:587`).
- Reproduction (code-read, not run): a block in calendar week 6 with a week-5 session outstanding: Home starts the week-5 session (position), the logger serves week-5 peak sets while `isDeloadWeek` is true from the calendar, so the loads are seeded from the recovery-week prescription (week-1 weight, half reps, RIR 4, when week-1 sets for the exercise exist) on peak set counts, and the session adjustment is silent; the plan screens show week 6's sets for the same session.

P11. The rebuild at next session discards applied check-ins for the current and later weeks.
- Location: `database.js:6849`, `:7051` (only `reintroduction` and mrv 0 rows are kept).
- Reproduction (run): 4.3: chest week 4 `12 (coach)` became 9.

P12. "Update your plan" with the block kept overwrites rows the next-session rebuild protects.
- Location: `writePlannerV2WeeklyRows` (`planAutoGen.js:1827-1867`) has no source or mrv check, unlike `rebuildPlanKeepingBlockV2` (`database.js:7051`).
- Reproduction (code-read): during a reintroduction ramp (rows `source: 'reintroduction'`), an Update your plan that keeps every exercise calls `activatePlanKeepingBlock` then `writePlannerV2WeeklyRows` with `blockKept: true`; every row of a planner muscle from the current week is upserted with `source: 'template'`, ramp rows included.

P13. A permanent swap into another muscle is not held to the destination's limits and can leave either muscle below its standard.
- Location: `moveSlotSetsInBlock` (`database.js:5410-5441`) checks only `reintroduction` and `mrv <= 0`; nothing re-reads `recoverySafeMax`, role ceilings or `DIVISION_STANDARD`.
- Reproduction (run): 3.3: quads week 5 10 (`recoverySafeMax` 8), quads shortfall 2 in the same session, Barbell Back Squat 4 to 3; hamstrings week 5 4 and rear delts week 5 4, both below the men's physique floor of 6.

P14. A permanent swap across tiers keeps the planner's shortened rest as if the person had set it.
- Location: `restAfterSwap` (`swapCarry.js:73-83`) treats any rest other than the `REST_SEC`/`STRENGTH_REST` default as the person's own; the planner writes shortened rests (`allocate.js:505-528`, `planner.js:1389`; sample isolation 60 s against the default 75).
- Reproduction (code-read): swap a planner isolation slot with rest 60 to a heavy compound "From now on": `isDefaultPrescription('isolation', { restSec: 60 })` is false, so the row keeps 60 s for the compound.

P15. The reintroduction ramp always treats week 1 as the current week.
- Location: `capability/reintroduction.js:51-54` picks the week with `started_at <= end` else the first week with `completed_at` null; `mesocycle_weeks.started_at` and `completed_at` (`database.js:564-565`) are never written (no `UPDATE mesocycle_weeks` sets them: `database.js:962`, `:1198`, `:6219` are the only updates).
- Reproduction (code-read, not run): end an episode in week 4; the ramp computes from week 1's planned sets and rewrites weeks 2 to 5 for the released muscles, including weeks already past.

P16. Comments that disagree with the executing code.
- `planner.js:164-167` and `:1446`: `recoverySafeMax` "written into the plan's weekly rows (mrv)"; the code stores it in the facts (`planAutoGen.js:1368-1374`) and the rows carry `VOLUME_LANDMARKS` mrv.
- `checkinPlacement.js:55-58`: "The level the step sets carries forward"; later weeks go through `settle` and are cut back (P3 sample: no later week changed).
- `weeklyCoach.js:396`: the matrix may return -1; it never does (`:401-419`).
- `planRebuild.js:7-9`: called from "the session"; only Home, Plans and Plan detail call it.
- `planEngine.js:1601-1603`: see P8.
- `planEngine.js:2359-2362` (matrix header): "the weak_point phase keeps its dedicated UL+WP builder"; a matrix division uses its matrix cell in every phase (`:3310-3312`, `:3383-3386`).

P17. Plans still served by the uncapped multiplier.
- Location: `coachApply.js:416-428`; rebuild skips (`planAutoGen.js:2090-2134`, `planRebuild.js:394-395`, `:494`) and `MAX_ATTEMPTS` 2 (`planRebuild.js:92`, `:608-610`).
- Reproduction (run plus code-read): any style-tagged generated plan (`style_plan` is a permanent skip), any plan the planner cannot rebuild (failed twice, or days it cannot hold), and any plan opened from a screen that does not call the trigger before its first session, are served as in 1.10 (Cable Lateral Raise 10, Barbell Hip Thrust 11 in week 5). UNVERIFIED how many live plans fall in these groups.

P18. The check-in's later-week writes are not in the transaction that writes next week.
- Location: `writeCheckinPlan` upserts each later-week row and adds exercises separately (`checkinPlan.js:240-283`); next week's rows and the receipt follow in `applyCoachTrainingAdjustmentAtomically` (`CoachOutputScreen.js:1449-1455`).
- Reproduction (code-read): a failure between the two leaves later weeks raised and possibly exercises added while next week and the coach output are not. The header (`checkinPlan.js:26-28`) says a retry recomputes from the device; UNVERIFIED whether a retry then stacks the later-week raise (the recompute starts from the already-raised later rows).

---

## Appendix: how the samples were produced

The edit gate on `src/` (`.claude/hooks/edit-gate.sh`) blocks writing files under `src/`, so the temporary jest files were kept in the session's scratchpad (outside the repo) and run with a jest config that reuses `package.json`'s jest settings with `rootDir` set to the repo and `roots` set to the scratchpad and the repo's `__mocks__`. Command: `npx cross-env TZ=Europe/London npx jest -c <scratch>/jest.config.js <scratch>/__tests__/<file>`. The files were deleted after use; no file in the repo was changed except this document.

- A (pure planner, check-in): `resolveCatalogue` + `buildPlan` as in section 0; sessions built as `buildPlanSessions` builds them (slot id `slotKey`, muscle and kind from the planner, credits from the catalogue choices, `baseSets` week 1, focus from roles); `prescribeWeek` per week with `weeklyTargets[m][w-1]`; rows with `VOLUME_LANDMARKS` mev/mav/mrv as the save writes them; `planCheckin({ sessions, facts: { version: 2, roles, exposureShares, sessionCaps, gapRanks, recoverySafeMax }, weeks: w2..w6 (w6 deload), rows, signal, catalogue: choices })`, then with `recoverySafeMax: {}`.
- B (SQLite, save path): the harness of `src/lib/__tests__/swapScope.review.test.js` (in-memory `node:sqlite` behind `dbCrypto`, real transactions), library inserted with `insertExerciseWithId(canonicalExerciseId(name), ...)`; `generateAndSavePlan` with the section 0 profile; the block start moved to place it in each week; `getSessionWeeklyAllocation` per routine; swaps through `applyExerciseSwap`; rebuild through `ensureActivePlanRebuilt` after `UPDATE programmes SET plan_facts = NULL`.
- C (SQLite, reactivation): B's setup, then `activatePlanWithBlock(userId, programmeId, 'Next block', { ledger: null, allowLearnedCarry: false })`.
- D (pure, manual check-in): hand-built manual sessions with `typedSets`, facts in `rebuildManual`'s shape, `planCheckin` with signal 3 and the real catalogue; and the shrug serve on the shared plan.
- E (pure, older generator): `generatePlan({ ...buildPlanInputs(profile), exerciseLibrary: LIBRARY, canonicalNames: canonicalNameSet(LIBRARY) })`; caps judged by `deriveParamKey` of the library row.
- F (pure, legacy serving): `computeWeeklySessionAllocation(exercises, weekRows, week1Rows, null)` over E's men's physique plan and C's template rows; `computeVolumeApply(rows, 3, new Set(), null)`.
- G (pure, fixed mode): `LIBRARY_PLANS` sessions turned into `fixedSessions` as `fixedSessionsFromPlan` does, `buildPlan({ ..., fixedSessions })`, `prescribeWeek` for weeks 1, 5, 6.
- H (pure, pool sizes): `generatePoolFromLibrary(LIBRARY)` filtered to full gym, `isAutoEligible`, tier rank at most 1.
