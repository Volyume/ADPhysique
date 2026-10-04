# D219 lane R1: how a training plan is built, and every path that adds or changes sets

Lane R1 of programme D219 (read-only phase 1). Authority: register entry D219 (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:11848`, read in full with its four founder additions of 2026-10-04). Repo read: branch `claude/plan-builder-science`, head `aee1af4e`. Nothing under `src/` was changed.

## 0. Conventions and provenance

- `[OBS]` = read in the code at the `path:line` given, or produced by a scratch probe calling the real functions. `[INF]` = my inference, reasoning stated. `[STOP-n]` = ambiguity or conflict with a pinned test or locked ruling, recorded and not interpreted (all in 10.2).
- Probe: a scratch jest file ran the REAL `generatePlan` on the REAL 918-row corpus (`CORPUS.map(corpusEntryToSeedRow)` sorted `name ASC`, exactly as `getAllExercises` returns it, `src/lib/database.js:3366-3369`), the REAL `computeWeeklySessionAllocation`, `computeVolumeApply` and `recoveryHours`, and a REPLICA of the block template ramp (`database.js:5997-5998`). It is a pure-function reproduction, not a device walk. Default profile ("typical plan"): intermediate, 60-minute sessions, `full_gym`, goal `general`, phase `lean_gain`, average recovery, no weak points, age unknown.
- Probe outputs: probe1 plans 2-6 days; probe2/2b weekly serve and coach +3; probe3 ranking replica; probe4 swap sheets; probe5 swap effect on served sets; probe6 library census; probe7/7b/7c weak points; probe8 weak-point served sets; probe9 63-plan tier census; probe10 library-order experiment; probe12 canonicality-pin check; probe13 recovery hours; probe14 two-day plan with and without a clock.

## Headline findings (expanded below)

1. Two stores of sets: `routine_exercises.recommended_sets` (written once at generation, `planAutoGen.js:1091-1102`, and by hand) and per-muscle per-week `planned_muscle_volume` rows (seeded at activation, `database.js:5925-6030`, edited by check-in apply). Since FQ-4 the logger serves `round(recommended_sets x weekPlanned / week1Planned)` per exercise (`coachApply.js:335-351`): no per-exercise cap, no exercise added, no redistribution. (section 6)
2. That is how 6+ sets happen. Typical 4-day plan, served sets weeks 1-5: Barbell Bench Press 3,4,5,6,7; Ab Rollout 3,5,8,10,12; B-Stance Hip Thrust 3,5,7,9,11. D8's 4/3 cap exists only at generation (`planEngine.js:1445-1450`), where a "relax" rule still emits 5-set singles (`:1853-1857`).
3. The ramp baseline is the template's week-1 row (raw `VOLUME_LANDMARKS`, `database.js:5399`), not the routine's own weekly total, so any gap between generator base and template MEV is multiplied (abs 6 vs 4, glutes 6 vs 4, every weak-point boost).
4. A check-in "+N" is uniform (all muscle rows, next week only, clamp [mev,mrv]), then proportional per exercise with half-up rounding (+3 planned on chest became +4 served). Session "+1" has no per-exercise cap and gates on one exercise's sets, not the muscle's weekly total.
5. Exercise choice adds the alphabetical library index raw (`planEngine.js:1685`), 1 point a position against 2 points a canonicality tier (`:1671`).
6. Session order is optimised once at build (`planEngine.js:3548`) against a typical Mon-Fri gap layout, opening-week dose at RIR 3, self-reported rating only; frozen as routine positions. At runtime ten sites recommend or allow another next session.
7. The personal-recovery learner feeds display and Home's recommendation only.
8. Weak points act only in the generator, and for goal `general` outside phase `weak_point` change nothing while the text says they do.
9. The 3-set-per-entry floor and frequency rules mean days change distribution more than dose; 2-3 day plans train most muscles once a week.
10. Swaps: scopes exist, no this-once/permanent choice on the plain swap path; cross-muscle swaps move volume silently.
11. Explanation text is static and partly untrue; the one recovery-order sentence is stored and never shown.

---

## 1. Entry points and call chain

### 1.1 Every way a plan comes into being

| # | Entry | Chain |
|---|---|---|
| 1 | Onboarding final step | `ProOnboardingScreen.js:2016` `generateAndSavePlan` (retry `:2074`). Kettlebell or band kit skips the engine: `copyPlanFromLibrary` then `activatePlanWithBlock` (`ProOnboardingScreen.js:1993`, `startWithPlan.js:285-312`). |
| 2 | "Start with a plan" (Home, Plans) | `prepareStartWithPlan`: capability pre-flight, then `generatePlanDryRun` (`startWithPlan.js:104`), diff and receipt; `commitStartWithPlan` then `generateAndSavePlan` (`:147`). |
| 3 | Goal, phase or weak-point change | `ProGoalSetupScreen.js:631` (prepare), `:650` (commit), after `confirmPlanSwitchMidBlock` (`planSwitch.js:48`). |
| 4 | "Update your plan" | `PlanUpdateScreen.js:227` dry run, `:360` `generateAndSavePlan(..., { keepBlock })`; D140 keep-block path `activatePlanKeepingBlock` (`database.js:5444`, called `planAutoGen.js:1155`). |
| 5 | Block to block, "Adjust" with a refined programme | `PlansScreen.runBlockActivation` (`PlansScreen.js:726`): `buildSeedRangesForNextBlock`, `generateAndSavePlan({ ledger, allowLearnedCarry, continuityProposal })` (`:761`); on failure falls back to `activatePlanWithBlock` on the existing plan. |
| 6 | Block to block, "Repeat", or Adjust with no exercise change | `activatePlanWithBlock(..., { ledger, allowLearnedCarry: seedIntent !== 'repeat' })` (`PlansScreen.js:786-789`). No generation: routine rows (and `recommended_sets`) are the first block's. |
| 7 | Library plan | `copyPlanFromLibrary` (`database.js:5541`) then `activatePlanWithBlock` (`:5257`); callers `PlanDetailScreen.js:207,222`, `startWithPlan.js:312`. Content is hand-authored `LIBRARY_PLANS` (`seedRoutines.js:2574-2600`), fixed sets, outside the engine. |
| 8 | Manual builder | `ManualBuilderScreen.js:927,937,960`; sets typed by hand. |

Engine runs go through `generateAndSavePlan` (`planAutoGen.js:959`) or its read-only twin `generatePlanDryRun` (`:1225`; used by `PlanPreviewSheet`, `PlansScreen.js:686`, `PlanUpdateScreen.js:227`). `planFit.js` also calls the real generator for alternatives and persists nothing (`planFit.js:1-45`).

### 1.2 Generation chain

| Step | What | Evidence |
|---|---|---|
| 1 | Profile to inputs: experience, days, session length, equipment, goal (division), phase (default `maintain`), weak points, recovery rating, nutrition phase, age from date of birth | `planAutoGen.js:97-131` |
| 2 | Load library (`ORDER BY name ASC`), drop excluded, avoided and capability-blocked rows | `planAutoGen.js:976,984`; `exercise/generation.js:148` |
| 3 | Demonstrated structure from completed blocks (needs 3 blocks, adherence 0.7; used only when day count matches and the goal is not a matrix division) | `planAutoGen.js:190,998`; `programmeStructureMemory.js` (`MIN_BLOCKS_FOR_STRUCTURE = 3`); `planEngine.js:3317-3322` |
| 4 | Style pool if the active plan carries a style tag | `planAutoGen.js:1013` |
| 5 | `planEngine.generatePlan` (pure): landmarks, targets, overlay, floors and caps, split builders, selection, MRV clamp, structural floors, time fit, per-session trim, recovery sequencing, why-this | `planEngine.js:3189-3690` |
| 6 | Cache `plan.whyThis` in AsyncStorage | `planAutoGen.js:1046` |
| 7 | Continuity on rebuild: incumbent keeps its slot (matched by muscle plus movement family) unless `slotVerdict` names a reason | `planAutoGen.js:1052`; `exercise/continuity.js:1-60` |
| 8 | Persist in engine order: `createProgramme` (`:1064`), `createRoutine` per workout (`:1086`; `position` = max+1, `database.js:4643-4649`), `addExerciseToRoutine` with sets, reps, rest, `selectionReason` (`:1091-1102`). The engine's `rirTarget` is NOT written (no argument; no RIR column, `database.js:320-331`) | |
| 9 | Activate: `activatePlanWithBlock` (`:1159`) or keep-block (`:1155`) | |

Block creation (`database.js:5257-5430`): 6 planned weeks, deload week 6, `rir_ladder '[3,2,1,0,0,4]'` (`:5361`; `mesocycle.js:28-29`), `generateMesocycleWeeks` (`:5736`), `generateInitialPlannedVolume` (`:5925`, called `:5399` with raw `VOLUME_LANDMARKS`).

Inputs the generator does NOT read [OBS: no read in `planAutoGen.js` or `planEngine.js`]: the recovery model, check-ins, the block ledger (it goes only to `activatePlanWithBlock`, `:1159`), personal recovery speed, coach outputs. The only recovery import is `planEngine.js:38-39`.

---

## 2. Split choice, templates, muscle assignment, sessions per muscle

### 2.1 Day count to split

Days are clamped to 2-6 and capped at 4 for beginners (`planEngine.js:3267-3270`). The six matrix divisions (Men's Physique, Classic, Bikini, Wellness, Figure, Women's Physique) take their split and session list from `DIVISION_MATRIX[goal][days]` (`:2343-2568`, selected `:3289-3293`). General, Bodybuilding and Women's Bodybuilding use `selectSplit` (`:1932-1993`):

| Days | Split | Notes |
|---|---|---|
| 2 | `full_body` | "real 2-day training", never clamped to 3 |
| 3 | `full_body`; `ppl` for advanced and competitive | lower-focus divisions get full body |
| 4 | `upper_lower` | Upper A, Lower A, Upper B, Lower B |
| 5 | `upper_lower_wp` if phase `weak_point` (via internal goal `weak_point_spec`, `:3283`); `lower_focus` for lower-led divisions; else `balanced_ul` | 5-day PPL no longer chosen (legs once a week) |
| 6 | `lower_focus` (lower-led) else `ppl_ab` | |

A remembered structure replaces the default only off the matrix path and only when its day count equals today's (`:3317-3322`).

### 2.2 Builders and sessions per muscle

| Split | Builder | Sessions per muscle |
|---|---|---|
| full_body | `buildFullBodyWorkouts` `:2048` | `max(1, min(days, round(target/5)))` (`:2062`); muscles dealt into the least-loaded days, most frequent first |
| upper_lower | `:2089` | 2 for every muscle |
| balanced_ul, lower_focus | `buildWeightedUpperLower` `:2119` | general and strength goals: `max(1, min(days, round(target/2)))`; other goals every day of that type; upper and lower interleaved (law 5, `:2171-2188`) |
| ppl (3d), ppl_ab (6d) | `buildPPLWorkouts` `:2190` | 1 each (3d); 2 each (6d) |
| upper_lower_wp (5d weak point) | `:2278` plus `buildWeakPointDay` `:2239` | weak muscles also in a dedicated third-position session at target `max(MEV, MRV-2)` |
| matrix divisions | `buildFromMatrix` `:2568` | count of template sessions listing the muscle, plus weak-point augmentation (`:2588-2621`: up to `min(3, sessions, max(2, ceil(target/9)))`, same movement pattern only, weak muscle placed first, `:2613`) |

### 2.3 What a typical plan looks like (probe 1)

| Days | Sessions (min / sets) | Weekly direct sets (x = sessions that train it) | Time status at 60 min |
|---|---|---|---|
| 2 | Full Body A 85/25, B 79/23 | back 9 (2x), quads 6 (2x); hamstrings 6, rear delts 6, side delts 3, calves 3, chest 3, triceps 3, biceps 3, glutes 3, abs 3 (1x) | user_decision_required |
| 3 | A 82/21, B 73/22, C 65/20 | back 10, quads 8, side delts 8, calves 6 (2x); chest 6, hamstrings 6, rear delts 6, glutes 4, triceps 3, biceps 3, abs 3 (1x) | user_decision_required |
| 4 | Upper A 72/21, Lower A 60/16, Upper B 71/21, Lower B 51/17 | chest 6, back 10, side delts 8, rear delts 6, biceps 6, triceps 6, quads 8, hamstrings 6, glutes 6, calves 7, abs 6 (all 2x) | user_decision_required |
| 5 | Upper A 62/18, Lower A 51/17, Upper B 60/18, Lower B 60/16, Upper C 60/18 | chest 9, back 9, side delts 9, triceps 9 (3x); rear delts 6, biceps 6, quads 8, hamstrings 6, glutes 6, calves 7, abs 6, traps 6 (2x) | constrained_but_valid |
| 6 | Push A 39/10, Pull A 45/14, Legs A 60/16, Push B 36/10, Pull B 47/14, Legs B 51/17 | same as 4-day plus traps 6 (all 2x) | fit |

### 2.4 Observations

- [OBS] The weekly dose is set by landmarks, not by days: the 4-day and 6-day plans carry identical weekly sets (probe 1). More days spread the same dose thinner, so a 6-day plan fits 60 minutes and the 4-day plan runs 72.
- [OBS] At 5 days chest, triceps, back and side delts get 9 (three sessions of one 3-set entry) against a target of 6 for chest and triceps. [INF] cause: `sliceFreq` rounds frequency up (`:2143-2152`) and the per-entry floor of 3 (`:1845-1870`) over-delivers; `clampDeliveredToMRV` only bounds at MRV.
- [OBS] At 2 days the plan is the same with no clock (probe 14, len 0: chest 3, biceps 3, triceps 3, glutes 3, abs 3): the D45 session ceilings (8 exercises, 25 sets, `planEngine.js:1068-1069`) bind (sessions of 25 and 23 sets). Direct chest, biceps, triceps, glutes and abs sit at 3 a week, below the maintenance floor of 4 at 3 days or fewer (`:361-363`). At 3 days with no clock triceps and biceps reach 6.
- [OBS] `user_decision_required` at 2, 3 and 4 days at 60 minutes: the engine keeps the weekly minimums and reports the overrun (`timeConstraint.js:60-73`); pinned by `planengineStructuralVolume.test.js` T-A (back not below MEV for the clock).
- [OBS] Session order in these plans is the persisted rotation (U-L-U-L, U-L-U-L-U, PPL A/B).

---

## 3. Exercise selection

### 3.1 Pipeline (per muscle per session, `selectExercisesForMuscle`, `planEngine.js:1481-1895`)

| # | Stage | Evidence |
|---|---|---|
| 1 | Library row to pool entry; skipped: no name or muscle, equipment category missing or `other`, plyometric/power patterns and 8 named conditioning moves, exercise type not `weight_reps`/`weighted_bodyweight`, no equipment profile | `poolGenerator.js:113-135,148-152,172-198` |
| 2 | Upstream filter: excluded, avoided (block or pattern), capability-blocked | `planAutoGen.js:984`; `exercise/generation.js:148` |
| 3 | Equipment: `e.eq.includes(equipment)`; division pool rule, never-starve | `planEngine.js:1385-1414` |
| 4 | NEVER_AUTO hard filter (99 names), no never-starve guard | `:1506`; `canonicality.js:439` |
| 5 | Recognisable gate: keep STAPLE and COMMON only if at least `max(2, ceil(target/4))` remain; wider list kept as coverage fallback | `:1541-1545,1698-1700` |
| 6 | Beginner: drop difficulty-3 lifts if enough remain; everyone else: drop `assisted` lifts | `:1553-1559,1566-1572` |
| 7 | Required roles when weekly sets reach the muscle's minimum (`SUBREGION_REQUIREMENTS`: back vertical_pull+horizontal_row at 6; hamstrings hip_extension+knee_flexion 6; quads squat_press+knee_extension 8; chest incline+flat 10; rear delts face_pull+horiz_abduction 6; triceps overhead 8; calves gastro+soleus 10; abs flexion+anti_extension 10; biceps long+short head 8; glutes activator+pumper 16), plus division roles | `:846-893,1574-1587,1611-1620` |
| 8 | Score and sort (3.2) | `:1626-1693` |
| 9 | Pass 1 required roles (rotated by slot if roles exceed exercises), pass 2 a different family first then same-family fill, growth loop, distribution with relax | `:1721-1895` |

### 3.2 Score (lower is better): `reqBonus + paramBonus + divBonus + goalBonus + canonBonus + fatiguePenalty + idx` (`:1685`)

| Term | Value | Line |
|---|---|---|
| reqBonus | 0 if it satisfies a required role, else 100 | 1627 |
| paramBonus | 10 x tier: heavy_compound 0, mod_compound 1, machine 2, isolation 3 | 1628-1629 |
| divBonus | `-5/(roleIndex+1)` for the division's ordered roles | 1648 |
| goalBonus | `-sfr/10` (strength goal: -3 for heavy barbell or landmine) | 1649-1660 |
| canonBonus | 2 x tierRank (STAPLE 0, COMMON 1, below that more) | 1671 |
| fatiguePenalty | +3 only after the session holds 2 high-fatigue lifts | 1684 |
| idx | position in the filtered list, 1 point each | 1685 |

### 3.3 Exercises per muscle per session; regional coverage

`numExHint = ceil(target/4)` (`:1462`), clamped to `floor(target/3)` (`:1716`), grown while capacity is short (`:1800-1812`). In practice one exercise per muscle per session at targets up to 5; the variety is across sessions (names are not reused within a muscle across the week). [OBS] Default plans contain no incline press: chest requires `incline` only from 10 weekly sets (`:846-893`), and the typical chest dose is 6-9.

### 3.4 Addendum A3: how standard, well-known and available an exercise is

| Signal | Where | Used by the generator? |
|---|---|---|
| Canonicality tier (name-keyed lists STAPLE 68, COMMON 274, NICHE 246, NEVER_AUTO 99, SPECIALIST 231 of 918; unlisted defaults to SPECIALIST) | `canonicality.js:74,145,301,439,550,815-818` | NEVER_AUTO filter, recognisable gate, 2 points per tier |
| Equipment category and profile (`full_gym` also admits suspension, sled, medicine ball, sandbag, landmine, kettlebell) | `exerciseMetadata.js:102-126` | filter only |
| Difficulty 1-3, derived by name regex (`ADVANCED_RE`, `SIMPLE_RE`) | `exerciseMetadata.js:287-288` | beginners only |
| SFR (1-10), fatigue cost (1-5) | corpus fields via `poolGenerator.js:113-135` | under 1 point; stacking nudge |
| Popularity or "found in every gym" field | none | n/a |
| Library list position `idx` (alphabetical, `database.js:3366-3369`) | accident, not metadata | yes, up to dozens of points |

Mechanism [OBS]: the ranking comment says a recognisable movement "beats an obscure one on a straight tie" (`:1660-1670`), but `idx` is not a tie: calves with `idx` score `Donkey Calf Raise` [common] 131.6 against `Leg Press Calf Raise` [staple] 132.6 (replica of `:1626-1685`); without `idx` the staples lead.

Real-engine experiment (probe 10): same 918 rows, same inputs, only library order changed.

| Library order | Staples of 22 picks | Examples |
|---|---|---|
| `name ASC` (as shipped) | 11 | B-Stance RDL, B-Stance Hip Thrust, Donkey Calf Raise, Ab Rollout, Bayesian Curl, Cable Face Pull |
| `name DESC` | 4 | TRX Face Pull, TRX Chest Press, TRX Knee Tuck, Spider Curl, Sissy Squat Machine, Weighted Sit-Up |
| tier first, then name | 21 | Face Pull, Romanian Deadlift, Cable Curl, Cable Pushdown, Seated Calf Raise, Hanging Knee Raise |

Pinned-test blind spot [OBS, probe 12]: `campaign16.canonicality.test.js:144-148` requires staples over 60%. Its rig (`campaign16.helpers.js:1-60`) feeds corpus order, giving 0.68 (default), 0.72, 0.62, 0.64 across its four cases. In the shipped order the same inputs give 0.50, 0.50, 0.46, 0.41 (beginner). `planengineBench.js:109-111` also feeds corpus order. `database.deleteExercise.test.js:68` pins the `ORDER BY name ASC` SQL. [STOP-2]

Census over 63 plans (3 experiences x 3 day counts x 7 goals, full gym; probe 9): 1,484 picks, 644 STAPLE (43%), 829 COMMON (56%), 11 SPECIALIST (0.7%: Zercher Sumo Squat (Adductor Focus) x6, Cossack Squat (Dumbbell) x3, Lateral Lunge x2). Most frequent COMMON picks: B-Stance Hip Thrust 63, B-Stance Romanian Deadlift 60, Donkey Calf Raise 56, Ab Rollout 54, Cable Face Pull 53, Bent-Over Cable Rear Delt Fly 49, Bayesian Curl 39, Cross-Body Cable Lateral Raise 37, Chest-Supported Row (Barbell) 35, Barbell Skull Crusher 34, Landmine Romanian Deadlift 20, Assisted Pull-Up 18, Cable Donkey Kickback 18. Full-gym auto-eligible staple supply is thin for glutes (2), traps (2), abs (3), side delts (3) (probe 6), so some COMMON picks are unavoidable there; the index decides which.

Typical plans (probe 1), tier shown, [S] staple, [C] common. Unique picks: 3-day 18, 4-day 22, 5-day 28.

| Plan | Non-staple picks [C] | Staple picks [S] |
|---|---|---|
| 3-day | Donkey Calf Raise, Donkey Calf Raise (Machine), Decline Barbell Bench Press, Cable Face Pull, Bent-Over Cable Rear Delt Fly, B-Stance Hip Thrust, Barbell Front Squat, B-Stance Romanian Deadlift, Ab Rollout | Lat Pulldown (Close Grip), Barbell Back Squat, Barbell Bench Press, Close-Grip Bench Press, Barbell Row (Bent Over), Cable and Dumbbell Lateral Raise, Lying Leg Curl, Barbell Curl |
| 4-day | the above minus Front Squat, plus Bayesian Curl, Dip Machine, Ab Wheel (Kneeling) | adds Leg Extension, Barbell Hip Thrust |
| 5-day | the 4-day set plus Cable Chest Press (Standing), Cable Shrug, Cross-Body Cable Lateral Raise, Cable Face Pull (Rope), Smith Machine Close-Grip Press | adds Dumbbell Shrug, Lat Pulldown (Neutral Grip) |

My reading of recognisability [INF, judgement; the code has no such field]: a gym-goer would query B-Stance Hip Thrust, B-Stance Romanian Deadlift, Donkey Calf Raise (and its Machine form, a machine many gyms lack), Bayesian Curl, Bent-Over Cable Rear Delt Fly, Cross-Body Cable Lateral Raise, Smith Machine Close-Grip Press; Decline Barbell Bench Press and Barbell Front Squat need a decline bench and a rack. Same movement under two names appears in one plan: Ab Rollout and Ab Wheel (Kneeling) (4-5 days), Donkey Calf Raise and its Machine form, Cable Face Pull and Cable Face Pull (Rope) (5 days). The 3-day Full Body A holds three bench-press variants in one session (Barbell Bench, Decline, Close-Grip for triceps). Names are the only duplicate guard (`usedNames`), not movement identity.

How swaps stay in the person's hands [OBS]: the logger sheet shows 8 of a 20-deep structural slate (`ActiveWorkoutScreen.js:1597-1620`), then "Search all exercises or create your own" opens the full library (`:6227`, `:1777`); "Don't suggest" and pattern-avoid (7, 14, 30 days, this block, indefinitely) exist on the plan screen (`RoutineDetailScreen.js:800-870`); excluded exercises are not re-seeded (`generation.js:12-17`); on rebuild a user's swapped-in incumbent keeps its slot unless `slotVerdict` names a reason (`continuity.js:1-60`). The sheet itself sorts by personal standing, then canonicality, then structural score (`intent.js:693-780`), yet is not filtered by tier: specialists appear (probe 4: Cambered Bar Bench Press, Band-Resisted Bench Press, Long-Lever Plank, Barbell Thruster).

---

## 4. Set allocation

### 4.1 From landmarks to per-exercise sets

| Step | Rule | Evidence |
|---|---|---|
| Landmarks | `MEV = round(base.mev x exp x rec x nut x age)`, `MRV` likewise; clash guard `MEV >= MRV` gives `max(2, MRV-2)`; floor MRV 4 / MEV 2; `MAVlow = MEV+2`, `MAVhigh = max(MAVlow, MRV-1)` | `planEngine.js:133-154` |
| Multipliers (MEV / MRV) | experience: beginner .70/.75, intermediate 1/1, advanced 1.15/1.10, competitive 1.25/1.15. Recovery: poor 1.10/.80, average 1/1, good .95/1.15. Nutrition: lean_gain and build .95/1.10, maintain and recomp 1/1, mild_cut 1/.90, aggressive_cut 1.05/.80. Age: unknown or 30-39 1/1, under 30 1/1.05, 40s 1/.92, 50s 1.05/.85, 60+ 1.10/.75 | `:99-127` |
| Base table | e.g. chest 6/14/22, back 10/16/25, quads 8/14/20, glutes 4/14/22, abs 4/16/25 (mev/mav/mrv) | `algorithms.js:25-59` |
| Week-1 weekly target | `= MEV` for every muscle | `planEngine.js:3329-3332` |
| Division overlay | priority (multiplier above 1): `MAVlow + min(1,(mult-1)/0.6) x (MRV-MAVlow)`; de-emphasised: scaled from MEV; `strength_size` phase multipliers | `:164-196`; `coachingGoals.js:461,610` |
| Weak-point boost, only when `phase === 'weak_point'` | `bonus = max(2, round((mrvCap - t) x 0.7))`, offset by trimming lowest-priority non-weak muscles toward MV | `:206-232` |
| Clamp and systemic cap | each muscle to 110% of MRV; total scaled so it does not exceed `round(sum(MRV) x 0.40)` (0.34 at 3 days or fewer, non-matrix) | `:240,263-272` |
| Floors and caps | maintenance floor 6 (4 at 3 days or fewer) for chest, back, side delts, quads, hamstrings, glutes; overlay at or above 1 gets MEV; lower-led divisions arms 4 at 5+ days; synergist trims (biceps minus round(0.4 x back), triceps minus round(0.5 x chest), glutes minus round(0.3 x quads) minus round(0.4 x hamstrings); skipped for weak points and under 3 days; floor MEV+2); MRV cap (`divisionMRV`, glutes 30 for raised-ceiling divisions); delts combined cap 26; 2-day glute floor | `:371-522` (`:443-476`) |
| Per session | `sessionTarget = min(cap, round(weekly / sessionsForMuscle))`, cap 8 (12 weak point); a target under 2 skips the muscle that session | `:2020-2022` |
| Per exercise | cap 4 compound or machine, 3 isolation (`CAP_COMPOUND`, `CAP_ISOLATION`, `capForEntry`, `:1445-1450`; isolation when the pool entry is tagged isolation, unknown data reads as 4); entry floor 3 (`:1447`, `:1845-1870`); relax rule lets the LAST entry absorb a shortfall when capacity is short (`:1853-1857`) | |
| After building | `clampDeliveredToMRV` (`:992`), structural floors (`:1297`; session floor cap 6, weak 9), `fitToTimeBudget` whole-week (`timeConstraint.js:120`; trim order forearms, abs, calves, traps, adductors, rear delts, front delts, biceps, triceps, side delts, glutes, hamstrings, quads, back, chest; weak points last; tolerance 5 min `:81`), per-session `trimToTimeBudget` (`:1072-1265`; budget = length minus 2, hard ceilings 8 exercises and 25 sets `:1068-1069`, shaves back-to-front `:1126-1160`, never below 3 sets) | |
| Time estimate | 7.5 min overhead plus 1 per extra compound, 60 s a set plus rest between sets, plus equipment transitions (`TRANS_SEC`, `:900-906`) | `:956-985` |

### 4.2 Three landmark tables [OBS]

1. Individualised `computeLandmarks` (`planEngine.js:133`): drives the weekly targets.
2. `SPEC_LANDMARKS` (`:302-323`, generator overrides such as rear delts MEV 0 MRV 14, glutes 6/16, biceps MEV 8): drives floors, caps, MRV clamps.
3. Raw `VOLUME_LANDMARKS` (`algorithms.js:25-59`): seeds the block's weekly rows and their clamp band (`database.js:5399,5993`).
Plus adaptive landmarks (`algorithms.js:1146`) for the session path and display (`sessionAdjustments.js:131`, `effectiveLandmarks.js:225`). The set the person sees on a Plans screen (3) is not the set the generator sized from (1) and (2).

### 4.3 Fractional counting of secondary muscles

- Generator: `INDIRECT_SET_FRACTION = 0.5` (`:337`) is used for REPORTING `indirectSets` (`buildVolumeSummary`, `:2650-2700`, rounded to halves) and, as rates, in the synergist trims above. Per-exercise caps, per-session targets and the time trim count only an exercise's primary muscle.
- Tracker: `allocateExerciseVolume` credits primary 1.0 and each secondary 0.5 or its listed contribution (`algorithms.js:277-306`); logged volume and the sequencer's dose (not its "trains" test, which counts primary sets only) use it.
- `planned_muscle_volume` rows are direct-set targets; the check-in apply and FQ-4 scaling never see secondary credit.

---

## 5. Order of sessions and of exercises (with addendum A2)

### 5.1 How rotation order is fixed at build

`generatePlan` hands the finished sessions to `sequenceSessionsForRecovery` once (`planEngine.js:3532,3548-3553`, `rirTarget: PLAN_OPENING_RIR = 3`, `recovery/constants.js:383`), then `reletterByPosition` renames repeated letters by final position (`:808,3565`). The result is written as routine `position` 0..N-1 in that order (`database.js:4643-4649`). So build-time order IS the persisted rotation; the user can reorder permanently (`PlanDetailScreen.js:285-362` to `updateRoutinePosition`, `database.js:5191`).

### 5.2 What the sequencer optimises, and assumes [OBS unless marked]

| Aspect | Fact | Evidence |
|---|---|---|
| Search | lead session (authored index 0) never moves; the rest permuted exhaustively; more than 7 sessions returns unchanged; ties keep authored order | `sequenceSessions.js:50-58,153,455,474-484` |
| Counts as "trains" | a muscle needs 2 or more PRIMARY sets in the session | `:149` |
| Pair penalty | per muscle, circular consecutive pairs: `underRecovered = max(0, T - gap)^2`, `overRecovered = 0.25 x max(0, gap - 2T)^2 / 24` | `:322-348` |
| Clash law 5 | linear-adjacent pair with primary overlap above 0.5 costs `1e6 x (1 + overlap - 0.5)` | `:164,295` |
| T (hours) | `recoveryHours(muscle, { sets, recoveryRating, rirTarget })`: base 72 legs, 60 back and chest, 48 arms, delts, traps, 36 calves and abs; x `sqrt(sets/6)` clamped .7-1.5; x rating (poor 1.15, good 0.9); x RIR (0-1: 1.15, 3+: 0.90); no feedback ratings, no personal factor | `:332`; `constants.js:81-130,242-340` |
| Gap layout | typical calendar week prior: 2 sessions [72,96], 3 [48,48,72], 4 [24,48,24,72], 5 [24,24,24,24,72], 6 [24x5,48], 7 [24x7]; no weekday assigned (D17) | `constants.js:385-393` |
| Dose scored | the generator's OPENING week sets at RIR 3, for all six block weeks | `planEngine.js:3548-3553` |
| Sentence | `whyThis.sequencing`, e.g. "Assuming a usual 4-day week, sessions are ordered to leave about 72 hours before the next session that trains the glutes, hamstrings and quads." | `sequenceSessions.js:523-540`; `planEngine.js:3605-3606` |

[OBS, probe 13, real `recoveryHours`] the model's own recovery times for the served week-5 dose at RIR 0 against the opening dose at RIR 3 the order was scored on: chest 38 h to 75 h, back 49 to 80, quads 53 to 89, hamstrings 46 to 89, glutes 46 to 112, abs 24 to 59, side delts 35 to 64, biceps 31 to 60. [INF] a rotation that fits the opening week leaves less margin as the block ramps; nothing re-scores.

Exercise order inside a session: the session's muscle list order (full body: most frequent muscles first, `:2062-2080`; matrix: division priority order, weak muscle first) with each muscle's exercises in selection order; no compound-first or fatigue-aware pass (`buildSession`, `:1999-2042`). `trimToTimeBudget` removes from the back (`:1126`), so the muscles listed last (abs, calves, arms) lose sets first. [OBS] probe 1 Full Body A: back, quads, calves, chest, chest, triceps: calves precede the chest presses. Auto supersets are removed (`:3497-3515`).

### 5.3 Runtime authority for "next"

Training is session-sequenced, not calendar-sequenced (`blockProgression.js:1-30`; `programmePosition.js:1-25`). `requiredSessions` orders by routine `position` (`blockProgression.js:194-216`); `nextOutstandingSession` is the first OUTSTANDING by order (`:305-309`), so training A then C leaves B next. A temporary out-of-order session does not renumber.

### 5.4 Every place the app suggests or allows a different next session than the plan's own next

| # | Site | What it does or says | Called from |
|---|---|---|---|
| 1 | `recommendNextWorkout` (`nextWorkoutRecommendation.js:249-341`) | sets `recommended` only when programme-next is `not_yet` at the projected time, another OUTSTANDING session is `ready`, and it has under 2 planned sets on programme-next's limiting muscle; best readiness wins. Reason (`:218-230`): "<Next> is next in your plan. <Muscle> are estimated N% recovered, ready by <day>. <Other> is estimated ready now." | `HomeScreen.js:1480,1509`; `ReadinessCards.js:755` |
| 2 | Home override | `recoveryOverride` becomes the hero's session (`HomeScreen.js:1998-2005`); "Keep <name>" (`:2068-2078`, UI `:2989-3000`); kept flag stored per day (`:191,1528`); hero line (`:2093-2104`) | pinned by `HomeScreen.recoveryRecommendation.test.js` |
| 3 | Change-workout sheet | list of every plan routine with "Next up" badge (programme order), per-row recovery line, "View workout", "Blank workout", "Skip this workout" ("Just this once, not the whole plan.") | `HomeChangeWorkoutSheet.js:101-191`; opened `HomeScreen.js:3055,3411` |
| 4 | Skip | `handleSkipThisWorkout` records `skipped_by_user` | `HomeScreen.js:1559`; `blockProgression.js` |
| 5 | Recovery screen sentence and rows | `buildNextWorkoutSentence` (`ReadinessCards.js:340-366`, shown `:982`) names the programme-next session and its limiting muscle ("Upper A is next: Back is the least recovered of the muscles it trains, estimated 60% recovered, ready by tomorrow."); `buildStillToDoRows` (`:376-404`, `:985`) lists every outstanding session with its own readiness | `ReadinessCards.js` |
| 6 | Plan-week card | subline "<week words> · <Name> is next" from `position.nextSession` (programme order only) | `progress/planWeek.js:178-224` |
| 7 | Workout summary | "Next up: <name>." from `resolveNextSession` (programme order only) | `WorkoutSummaryScreen.js:362-365,1754-1756` |
| 8 | Plans hero | "Start next workout" starts `position.nextSession` | `PlansScreen.js:830-862` |
| 9 | Home screen widget | `nextSession.name = routines[0]` (always the FIRST routine, "per-day routine rotation is a later refinement"), not the programme's next | `widgets/writer.js:45-61` [OBS inconsistency, STOP-10] |
| 10 | Projection used by 1 | `nextLikelyTrainingTime`: next habitual weekday at the median start minute; with no habit the projection is NOW | `nextLikelyTrainingTime.js:55-87` |

[OBS] Only sites 1, 2, 3 and 5 (rows, and the sentence when it carries a swap reason) present a different session; 6 to 8 follow programme order; 9 disagrees with programme order. [STOP-4]

---

## 6. Every path that changes sets after the plan exists

### 6.1 Two stores

- Static: `routine_exercises.recommended_sets`; written only by generation (`planAutoGen.js:1091-1102`) and by the person (`RoutineDetailScreen.js:566-606` to `updateRoutineExercise`, `database.js:4976-5005`; sets field `maxLength={2}` at `:1420`, no cap, no nudge; the D8 calm nudge exists only in `ManualBuilderScreen.js:796-813`).
- Per muscle per week: `planned_muscle_volume`. Template ramp: week i of 5 accumulation weeks = `round(mev + (mav - mev) x i/4)`, week 6 = mev (`database.js:5997-5998,6017`). Block 2+ with a ledger: linear start to peak, deload `deloadSets ?? mev` (`blockLedgerGather.js:486-501`; start and peak clamped to [floor, 30] with one +1 capacity probe on a learned peak, `blockSeed.js:72-73,194`). Chest template: 6, 8, 10, 12, 14, then 6.
- Only the logger reads the allocation (`ActiveWorkoutScreen.js:631-640`, derived targets `:1144,1174,1176,4168`) and `sessionAdjustments`. The Plans and plan-detail screens show the static rows or the planned rows, never the served count. [OBS: `getSessionWeeklyAllocation` has no other caller.]

### 6.2 Paths

| # | Path | Trigger | Writes | Reaches the session | Cap |
|---|---|---|---|---|---|
| 1 | Week-to-week ramp | block activation | template or seeded rows | via 2 | none per exercise |
| 2 | FQ-4 serve-time scaling | every session start | nothing (derived) | `targetSets` | none; half-up rounding; floor 1; factor 1 if a row is missing or zero (`coachApply.js:335-351`; `sessionAdjustments.js:48-73`) |
| 3 | Check-in volume apply | person taps Apply | next week's rows only, source `coach` (`CoachOutputScreen.js:1322-1400`; `database.js:9833-9868`; row upsert `:6482-6493`) | via 2 | each muscle clamped to [mev, mrv] of its row |
| 4 | Early deload apply | person taps | next week flagged deload, rows `max(deloadFloor, round(min(peak,current) x share))` (`coachApply.js:175-200`; `CoachOutputScreen.js:1412-1460`) | via 2 | reductions only |
| 5 | Reintroduction ramp | capability episode ends, confirmed | rows source `reintroduction` up to the block's own peak (`capability/reintroduction.js:32-110`) | via 2 | block peak |
| 6 | Session "+1" / "-1" (COMP-015) | session start | `adaptation_events`; in-memory delta | that exercise only | none per exercise (below) |
| 7 | Readiness easing | pre-session answer or re-entry | in-memory, downward only | all exercises | lower target wins |
| 8 | Adaptive landmarks | history of 3+ points | no rows; moves the `mav`/`mrv` the +1 gate reads (`algorithms.js:1146-1240`) and display bands | indirect | adjustment within about plus or minus 4 |
| 9 | Manual edit | person | routine row | next sessions | none (2 digits) |
| 10 | Rebuild | person | new routine rows | via generation | D8 4/3 |
| 11 | Block-to-block seed | block boundary | new weekly rows (start, peak per muscle), routine rows unchanged unless refined | via 2 | seed peak at most 30 |

### 6.3 How "+N sets for muscle M" becomes rows [OBS]

1. Signal: `autoregulationMatrix(recovery, performance)` gives +3 (both 1), +2 (either 1), +1 (both 2), 0 (hold), -2 (deload) (`weeklyCoach.js:401-419`; lower grade is better). After 3 consecutive "exceeded" weeks a push may take one extra step, ceiling 3 (`:2201-2230`). A joint-pain or illness hold zeroes any push (`:1265-1275`).
2. Card: "Add N sets to each muscle group" / "Pull back N sets per muscle group" (`CoachOutputScreen.js:411-415`), footnote "These are next week's planned sets. Each session can still adjust them on the day." (`:497`).
3. Apply: all rows for the next week; every muscle row moves by N (`computeVolumeApply`, `coachApply.js:269-310`), including muscles with no exercises (front delts, forearms, adductors, neck, tibialis in probe 2b); increases skip muscles held for capability or flagged sore (`coachApplySafety.js:7-45`).
4. Only the next week's row is written (`database.js:9833-9868`). [INF] later rows keep the template value, so an applied +3 on week 3 (10 to 13) is followed by a template week 4 of 12: a one-week bump, not a level shift.
5. Serve: each exercise independently `round(base x 13 / 6)`. No exercise is added, none receives "the" N, nothing is redistributed. Chest at week 3 with a +3: both chest exercises go 5 to 7, so 14 sets are served for 13 planned (probe 2b).
6. Then COMP-015: the first exercise of each muscle may get +1 (max 2 adjusted exercises a session, `algorithms.js:1443-1444`), only if the week has a coach row (`sessionAdjustments.js:146-149`).

COMP-015 detail: only the first exercise per muscle (`algorithms.js:1284`), silent in deload (`:1273`); +1 needs last trained within 14 days, performance 1-2, pump 1-2, `projectedPlanned < mav`, no add this week, no safety hold, weekly signal not reduce (`:1381-1396`); `projectedPlanned = doneThisWeek + THIS exercise's plannedSets` (`:1331`), not the muscle's weekly planned total, so the ceiling gate under-counts a muscle that has more exercises still to come. No per-exercise cap exists.

### 6.4 Reproduction: how an exercise reaches 6 sets and beyond (probes 2, 2b, 8)

Generation (week 1): at most 5, through the relax rule: back 10 a week over 2 sessions gives a session target of 5, `numEx = min(ceil(5/4), floor(5/3)) = 1`, so one entry takes 5 (Lat Pulldown (Close Grip), Barbell Row (Bent Over)); probe 7 shows 4 at most once weak points spread over several exercises.

Typical 4-day plan, served sets by week (template ramp, no coach, week 6 is the deload and equals week 1):

| Exercise (muscle, base) | W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|---|
| Barbell Bench Press (chest 3) | 3 | 4 | 5 | 6 | 7 |
| Lat Pulldown (Close Grip) (back 5) | 5 | 6 | 7 | 8 | 8 |
| Barbell Back Squat (quads 4) | 4 | 5 | 6 | 7 | 7 |
| B-Stance Hip Thrust (glutes 3) | 3 | 5 | 7 | 9 | 11 |
| Ab Rollout (abs 3) | 3 | 5 | 8 | 10 | 12 |
| Donkey Calf Raise (calves 3) | 3 | 4 | 4 | 5 | 5 |

Weekly muscle totals, planned (template) against served: chest 6,8,10,12,14 both; abs planned 4,7,10,13,16 served 6,10,16,20,24; glutes planned 4,7,9,12,14 served 6,10,14,18,22. Why: the baseline is the template week-1 row (abs mev 4, glutes mev 4) while the generator base was 6; ratio 16/4 = 4 times 3 sets = 12. A 5-day plan reaches triceps 21 and traps 22 at week 5.

Weak-point plan (4 days, side delts and glutes, phase `weak_point`, probe 8): weekly served side delts 18,24,30,30,36 (the generator's combined delt cap is 26, `planEngine.js:332,495`); glutes 16,28,36,48,56; 14 sets on one exercise (Barbell Hip Thrust, Lower A, week 5). The generator already boosted the base; the template ramp (glutes 4 to 14) multiplies it again.

Coach +3 on week 3 (probe 2b): chest 10 to 13; Barbell Bench 5 to 7, Lat Pulldown 7 to 8 (a +3 did not move back by 3 per exercise), B-Stance Hip Thrust 7 to 9, Ab Rollout 8 to 10.

[INF, arithmetic from code, not probed] block 2 with a seed (for example chest start 12, peak 15) and unchanged routine rows (3+3): the generator never reads the ledger (`planAutoGen.js:1159` is its only use), baseline is the seeded week-1 row, so week 1 serves 3+3 = 6 (planned 12) and week 5 serves 4+4 = 8 (planned 15). The seeded block starts below block 1's peak at the exercise rows. [STOP-11]

### 6.5 Other points

- Deload: week 6 row = mev (`database.js:6017`), so the served deload equals the week-1 count, RIR target 4 (ladder `[3,2,1,0,0,4]`, `:5361`; per-week RIR is `mesocycle_weeks.rir_target`, `:5759-5775`). Weeks 4 and 5 carry the highest served sets and RIR 0.
- `mesocycle.js` `MESO_SCHEDULE` multipliers feed narrative only; no caller changes sets. `whyThis.progression` (`planEngine.js:2831`) says "add roughly one to two sets per muscle group per week", static text, while template steps are 2.5 a week for glutes and 3 for abs.
- Scope note [INF]: a change at serve time (FQ-4) reaches every active block at once; a change at generation reaches only new or rebuilt plans (D8: "existing plans untouched").

---

## 7. Weak-point and priority muscles

Selection: UI labels map to muscle keys, at most 3 (`planEngine.js:61-78,3245`); "Upper Chest" maps to `chest` and "Lats / Back Width" and "Back Thickness" both to `back`, so subregion intent is lost. All nine goals enable weak points (`coachingGoals.js:118`); the chips show whatever the phase (`ProGoalSetupScreen.js:265,757`: "Your plan puts extra work into them").

| Effect | Condition | Evidence |
|---|---|---|
| Additive weekly boost to 70% of the gap to MRV, funded by trimming other muscles toward MV | only `phase === 'weak_point'` | `planEngine.js:206-232` |
| Per-session cap 12 not 8; synergist trim skipped; session floor 9 | any phase | `:2020`, `:429`, `:1308` |
| Extra same-pattern sessions, weak muscle first | matrix divisions, any phase | `:2588-2621` |
| 5-day split with a Weak Point Specialisation day | phase `weak_point`, non-matrix goal | `:1949`, `:2239-2276` |
| Time trim keeps it last | any phase | `timeConstraint.js:93-101` |

[OBS probe 7, goal general, 4 and 5 days] weak points [Side Delts, Glutes] with phase `lean_gain` give a plan byte-identical to none; with phase `weak_point` side delts rise to 18 (4d) and glutes to 16, while rear delts and abs drop out entirely and back falls 10 to 8, quads 8 to 6. [OBS probe 7b] for Bikini and Men's Physique weak points do change the plan without the phase (Bikini 4d side delts 9 to 14). [OBS probe 7c] with `lean_gain` and weak points the plan text still says "Side Delts and Glutes receive more weekly sets than the rest of the plan" (`planEngine.js:2873`) and flags them `isWeakPoint`. [STOP-6]

After generation: no weak-point or priority reference exists in `coachApply.js`, `weeklyCoach.js`, `sessionAdjustments.js`, `algorithms.js`, `blockLedgerGather.js`, `interBlock.js`, `blockSeed.js`, `blockAdvisor.js`, `effectiveLandmarks.js`, `planVolumeTargets.js` [OBS grep]. The check-in raises every muscle by the same N; the sequencer is weak-point-blind.

---

## 8. Locked rules this programme must respect

| Source | Rule |
|---|---|
| D8 (`DECISIONS...:43`) | 4 compound / 3 isolation; overflow goes to a different-angle exercise with weekly volume preserved, never trimmed; auto-gen enforces; manual builder shows a calm nudge, never blocks; existing plans untouched, no migration prompt |
| D45 (`:830`) | session ceilings 8 exercises and 25 working sets, same trim, never below 3, opener kept |
| D17, D201 add. 3 | no enforced training days; the gap layout is a generation-only prior, no weekday assigned |
| D201 add. 1-6 (`:9804-9965`) | F1 recommend never silently switch, programme order unchanged in storage; F2 division day order may move when strictly better; lead session fixed; adjacency linear; `TYPICAL_WEEK_GAP_HOURS`; letters follow final position; recommendation copy is three facts; primary-loaded = 2 primary sets; law 5 dominant; scored at RIR 3 |
| D204 (`:10067`) | the app describes, never tells anyone to train easier or harder |
| D96 FQ-4 (`first-use-audit-2026-08-10/D96-RULINGS.md:401-410`) | apply is confirm-then-apply end to end; UNAPPLIED changes nothing; APPLIED reaches the session; write failure leaves no partial change |
| `injury-disability-audit-2026-08-28/DESIGN-RULING.md:76-80` | records that the allocator scales entries "with no per-entry cap" |
| D139/D140 | rebuild keeping every exercise keeps the block; plan edit "changes this workout only. Your weekly set targets stay with the block" (`RoutineDetailScreen.js:1405`) |
| Campaign 16 (`plan-generation-campaign-16/CAMPAIGN-LOG.md`) | job 2 staples first, common as filler, a gate not a nudge, default SPECIALIST; job 3 roles; job 4 no auto supersets; job 5 rebuild continuity first; job 6 no phantom volume; job 7 no inherited starting load, no rep-range rotation by block; time is a constraint: never delete a muscle's only exercise, no supersets, no added days; real 2-day plans; quality laws 1-6 (swap scope, replacements start empty, evidence maturity, fatigue nudge, session ordering, KEEP is a decision); division intent senior |
| T-A to T-D (2026-07-04) | back not below MEV at 60 min 4-day; legs at least 2x at 5 days; maintenance floor 6 at 4+ days; beginner chest at least MEV |
| `DIVISION-EVIDENCE-REGISTER.md` | division roles and priorities; weak points compose with division; time trim protects division priorities |
| Plans screen spec (`plans-screen-campaign-25.../PLANS-SCREEN-SPEC.md:44-46`) | hero keeps "Start next workout" |
| Stale: `plan-B-weak-point-sets.md:199` | says progression "cannot stack more sets onto an existing exercise row"; false since FQ-4 [STOP-8] |

---

## 9. Tests that pin current behaviour

| Area | Test | Pins |
|---|---|---|
| Caps | `planExercisePlacement.audit.test.js:202-300` | no multi-exercise group stacks an entry past its 4/3 cap; one relaxed entry only when capacity is short; movement-pattern placement sweep |
| | `engine-invariants.test.js` (`:591-680`, fuzz) | `selectExercisesForMuscle` cap and spill invariants; `computeSessionAdjustments` invariants |
| | `planEngineSessionCap.test.js` | D45: 8 exercises, 25 sets; the cap binds; determinism |
| Volume | `planengineLandmarkSource.test.js`, `planVolumeTargets.test.js` | exact `SPEC_LANDMARKS` table; band built from the plan's landmarks |
| | `planengineRebuildPhase1` to `4`, `3e`, `planengineStructuralVolume`, `planEngineSecondaryMuscle`, `planengineDayClamp` | no structural zero, none over MRV, no sub-3 entry; division specialisation and overlap; indirect sets; weak point composed with division; T-A to T-D; real 2-day plans |
| Selection | `campaign16.canonicality.test.js` | registry sound, NEVER_AUTO never generated, every pick STAPLE or COMMON, staples over 60% (corpus order, see 3.4), no NICHE |
| | `campaign16.division`, `.movementFamily`, `.qualityLaws`, `.continuity`, `.volumeIntegrity`, `planEngineLibraryPool`, `planEngineGoalBias` | roles, families, six laws, rebuild continuity, delivered equals persisted, library path |
| Split and order | `campaign16.splitMatrix`, `.closure`, `.planFit`, `.noAutoSupersets`, `planEngine.recoverySequencing`, `recovery/__tests__/sequenceSessions.test.js` | quality properties by division, days and length; time as constraint; no supersets; order already at minimum penalty; lead fixed, linear adjacency, gap layout |
| Next session | `recovery/__tests__/nextWorkoutRecommendation.test.js`, `HomeScreen.recoveryRecommendation.test.js` | the D201 F1 rule and copy; Home override |
| After plan | `coachApply.test.js`, `coachApplySafety.test.js`, `coachApplyAtomicity.test.js`, `applyWiring.fq4.test.js`, `sessionAdjustments.test.js`, `mesocycle.test.js` | volume apply clamps; FQ-4 allocator and the unapplied gate; COMP-015 matrix |
| Swaps | `swapEngine.test.js`, `swapEngine.equipment.test.js`, `campaign16.prescription.test.js:187-312`, `ActiveWorkoutScreen.swapVolumeClause.test.js`, `RoutineDetailScreen.swapPickerHandoff.guard.test.js`, `PlanLibraryScreen.installSwapProvenance.guard.test.js`, `swapSheetCapabilityNarrowing.guard.test.js`, `capabilityPlanRewrite.test.js`, `sessionEffective.serveGuard.test.js` | scoring and equipment; swap clears load, recalibrates across tiers only when untouched, keeps a user-tuned range, leaves within-tier alone, retained id kept; sheet clause "count towards the new exercise's own muscle"; picker handoff; install provenance; narrowing line |
| Library | `database.deleteExercise.test.js:68` | the `ORDER BY name ASC` SQL string |

No test pins a specific alphabetical pick (B-Stance, Donkey, Bayesian), so a ranking change breaks no exact-pick test; it must still satisfy the canonicality, division and coverage pins.

---

## 10. Gaps against founder goals 1 to 6, and STOP items

### 10.1 Gaps (OBSERVED facts)

| Goal | Facts |
|---|---|
| 1 Balance recovery and volume; next session finds muscles recovered; no fixed days | Weekly dose ignores days (2.4). Order scored once at the opening dose and RIR 3 against an assumed calendar (5.2) and never re-scored while served recovery times roughly double (probe 13). Recovery input is the self-reported rating only; the learned speed, habit and check-ins are not read at build (section 11). Order is a persisted rotation; runtime offers other sessions at four sites (5.4). |
| 2 Maximum sets per exercise, science-grounded; seen 6 | Cap 4/3 is generation-only; relax rule gives 5; serve scaling, check-in and +1 are uncapped; manual edit uncapped (6.2). Reproduced at 6, 7, 12 and 14 (6.4). The numbers 4/3 are the founder's D8; the evidence for them is the S lane's. |
| 3 "+N" spread across exercises, new exercise when needed, redistribute | Not implemented: uniform per-muscle row, proportional per-exercise scaling with rounding, no addition, no redistribution; a growth loop that adds exercises exists only at generation (`planEngine.js:1789-1812`). |
| 4 Structure and order by days; weak areas | Splits by days exist (2.1). Weak-point focus is generation-only, phase-gated for the boost (7). Structure never changes after generation except by rebuild. Three or fewer days leave most muscles at once a week (2.3). |
| 5 Recovery screen says "tomorrow is chest and arms, recovered by tomorrow" | The screen names the programme-next session and its LIMITING muscle with percent and ready-by (`ReadinessCards.js:340-366`), not "chest and arms". "By tomorrow" needs a habitual weekday; with no habit the projection is now (`nextLikelyTrainingTime.js:55-87`). The estimate reads the last sessions, not the plan's future dose. |
| 6 Serious formulas, deterministic | The recovery model cites its evidence (`constants.js`). Plan constants flagged in comments as heuristics or tuned: fit tolerance 5 min, stacking limit 2, systemic factor 0.40 ("keeps an average intermediate near the previous 130", `planEngine.js:249-262`), synergist rates "tuned conservative", weak-point 70% gap closure, 8/12 per-session caps. Engine is pure and deterministic (checked by `planEngineSessionCap` and fuzz). |

### 10.2 STOP items (recorded, not interpreted)

- **STOP-1** Cap versus serve scaling. D8 (4/3, volume "never trimmed", existing plans untouched) is enforced only at generation; FQ-4 (D96) scales rows with "no per-entry cap" (`DESIGN-RULING.md:76-80`), pinned by `applyWiring.fq4.test.js`; `planExercisePlacement.audit.test.js` and `engine-invariants.test.js` pin generation caps. Where a cap and a redistribution live is a ruling.
- **STOP-2** Library order drives selection: `idx` (`planEngine.js:1685`), `ORDER BY name ASC` pinned (`database.deleteExercise.test.js:68`), canonicality pin blind to shipped order (`campaign16.canonicality.test.js:144-148` over `campaign16.helpers.js` and `planengineBench.js`, both corpus order). Breaking ties independently of list order needs re-pinning with shipped-order rigs.
- **STOP-3** "Standard and available in all gyms" has no data field. COMMON includes variants the founder describes as obscure; `full_gym` admits suspension, sled, medicine ball, sandbag, landmine (`exerciseMetadata.js:102-126`). What the source of truth is (registry edit, new tier or flag) is a decision.
- **STOP-4** D201 F1 (Home recommends another session; pinned by `nextWorkoutRecommendation.test.js` and `HomeScreen.recoveryRecommendation.test.js`; copy rulings add. 4 rulings 5, 6, 10) against the D219 clarification (no surface recommends a different session or asks for a reorder). Sites 1, 2, 3, 5 of 5.4.
- **STOP-5** Sequencer locks (D201 add. 2-6, D17: lead fixed, linear adjacency, typical gap layout, 2 primary sets, law 5 dominant, scored at RIR 3, 7 sessions) against D219's robustness to unknown spacing and the whole block's dose.
- **STOP-6** Weak points outside phase `weak_point`: copy and `whyThis.weakPoints` promise extra sets that `general` plans do not get (probe 7); matrix divisions do get a change (probe 7b). Needs a ruling on intended behaviour.
- **STOP-7** Swap semantics: D219 "same sets and reps" against `campaign16.prescription.test.js:187-312` (reps and rest recalibrate on tier change when untouched), `RoutineDetailScreen.js:1540` ("targets stay the same"), in-session `rebuildRoutineExerciseFor` (`ActiveWorkoutScreen.js:297-312`, new exercise's own rep band, old rest), and the NA-wr-3 clause pinned by `ActiveWorkoutScreen.swapVolumeClause.test.js` (logged sets credit the swapped-in muscle).
- **STOP-8** `plan-B-weak-point-sets.md:199` is false since FQ-4. The founder's "6 sets as we progress" is the FQ-4 mechanism, not plan-B's pre-D8 generation defect.
- **STOP-9** Whether the untrue or unrendered explanation lines are in scope: `whyThis.weakPoints` (`planEngine.js:2873`), `whyThis.progression` (`:2831`), `RoutineDetailScreen.js:1540`, `whyThis.sequencing` unrendered (`PlanDetailScreen.js:42`, `ProSetupCompleteScreen.js:35`).
- **STOP-10** `widgets/writer.js:45-61` names `routines[0]` as the next session (mentioned, not changed).
- **STOP-11** Ramp baseline: FQ-4 uses the block's week-1 row (pinned "legacy byte-identical", `applyWiring.fq4.test.js`), not the routine's real weekly total; the learned seed never reaches the generator or the routine rows (6.4 [INF]). Whether the baseline should be the routine's own total is a design ruling.

---

## 11. Addendum A1: what the plan builder reads from recovery, and what it explains

### 11.1 Reads

| Where | Reads | Evidence |
|---|---|---|
| Generation | the self-reported `recoveryRating` only: MEV and MRV multipliers (`planEngine.js:106-110,133-154`), sequencer rating factor (`constants.js:110`), static `whyThis.recovery` (poor or good only, `:2850-2855`) and warnings (`:2887`). Nothing else: no check-in, no recovery map, no learned factor, no habit, no ledger | [OBS] |
| Block to block | check-in-derived per-muscle aggregates (late soreness, joint discomfort, readiness slope, sleep flags, deload flag fired) to a strain weight and class (RESPONSIVE, OVERREACHED, STALE, STRAINED) to seed start and peak; 7 or 10 recovery days proposal; `userProfile.recoveryRating` | `blockLedgerGather.js:106,424`; `interBlock.js:79-137`; `blockExplain.js:454-458` |
| Check-in | self-reported recovery and performance grades; peak-week softening | `weeklyCoach.js:373-419` |
| `sessionAdjustments` | per-muscle last-session pump, performance, joint, soreness, weekly signal | `algorithms.js:1263-1456` |
| Learned personal speed | `personalRecovery.js` via `recovery/load.js:360-385` into the recovery map and the Recovery card, Home recommendation | [OBS] no caller in any plan-affecting module |

[OBS grep, all non-test files outside `src/lib/recovery/`] importers of the recovery model: `BodyDiagramHeatmap`, `FatigueTrendCard`, `MuscleRecoveryList`, `ReadinessCards`, `RecoveryLearningCard`, `AnalyticsScreen`, `HomeScreen`, and `planEngine.js` (sequencer, no learned factor). `planAutoGen`, `coachApply`, `weeklyCoach`, `sessionAdjustments`, `blockLedger*`, `interBlock`, `mesocycle`, `planVolumeTargets` import none.

### 11.2 Explanations, what each says and from which function

| Surface | Function | Says | Gap |
|---|---|---|---|
| Plan reveal and plan detail "Why this plan" | `buildWhyThis` (`planEngine.js:2768-2877`), rendered via `WHY_ORDER` (`PlanDetailScreen.js:42,692-699`; `ProSetupCompleteScreen.js:35,392-398`) | schedule, goal, experience, progression, equipment, recovery (poor or good), nutrition, weak points | `sequencing` and `capability` not in `WHY_ORDER`; weak-point and progression lines untrue in some cases (STOP-6, 9) |
| Per-exercise reason | `explainSelection` (`planRationale.js:58`) at `RoutineDetailScreen.js:1209` | "Covers a movement your week needs.", "A different movement to the rest of this session...", "Adds the remaining sets this muscle needs for the week." | no recovery or set-count reason; `selection_reason` is not updated by a plan-level swap (`database.js:5084-5100`) |
| Block-to-block | `buildChangeReceipt` (`planRationale.js`), `blockExplain.js` seed receipt and block-start lines, `recoveryProposalLine` ("...a longer recovery of about 10 days is suggested ... Your call.") | stays and changes with reasons; learned claims | per muscle, not per exercise sets |
| Weekly coach card | `getTrainingNote` (`coachingGoals.js`), `CoachOutputScreen.js:411-415,494-497`, `buildRampPositionLine` (`blockExplain.js:474-503`) | "Add N sets to each muscle group"; "Week N of M in your block. The planned climb adds N sets next week. This week your coach added N sets on top." | totals from planned rows, not served sets |
| Recovery screen | `buildNextWorkoutSentence`, `buildStillToDoRows` (`ReadinessCards.js:340-404`), `RecoveryLearningCard` (`recoveryLearningCopy`: "Your recovery is now estimated to take about N% less time than the first estimate.") | readiness of the programme-next session and every outstanding one; the learned speed | the learned speed changes no plan decision |
| Home hero | `heroRecoveryLine` (`HomeScreen.js:2093-2104`) | one recovery line | |
| Logger | COMP-015 reason text, readiness tweak, "Set N of M" | why a set was added or dropped | no reason for the base count |

Nothing explains why this order, why a muscle has one session at 3 days, why a set count is what it is, or what the learned recovery speed did to the plan (nothing).

---

## 12. Addendum A4: swaps

### 12.1 Every swap path

| # | Path | Scope | What is written | Rebuild and block treatment |
|---|---|---|---|---|
| 1 | Logger "Swap exercise" (`ActiveWorkoutScreen.js:1566-1672`, confirm `:1677-1760`) | this workout only; sheet says "Your plan is not changed, and sets you log count towards the new exercise's own muscle in your weekly volume" (`:6158`) | in-memory row replaced; `exercise_swaps` scope `session` (`:1733-1744`, cause `style` or `constraint` when applicable; `database.js:11848-11893`); later sets logged against the new id | routine rows unchanged, rebuild sees the original; session swaps are never negative preference (`intent.js:473-500`) but feed "Last used here" ordering |
| 2 | Logger "Can't do X?" (`:5693-5698`) | asks "just for today, or from now on"; "From now on" opens Injuries and limitations (a movement rule), "Just for today" opens the swap sheet with cause `constraint` | rule rows, not a slot replacement | rules drive serve-time substitution and a plan-rewrite offer |
| 3 | Plan-level swap (`RoutineDetailScreen.js:617-945`) | programme: from now on | routine row updated in place (`updateRoutineExerciseExercise`, `database.js:5033-5105`); scope `programme` swap row; undo toast (`:927-938`); after repeated picks "Use it as the default when this exercise comes up?" (`:919`, `setExerciseSlotDefault` `database.js:11925`) | the swapped-in exercise is the incumbent; kept unless `slotVerdict` names a reason; programme swaps count toward USER_SWAPPED_AWAY (`intent.js:473`); a slot default only re-ranks swap sheets (read only in `intent.js`) |
| 4 | Install-time replacement | programme | same update and swap row (`PlanLibraryScreen.js:644-663`) | as 3 |
| 5 | Capability plan rewrite | programme, cause constraint | `updateRoutineExerciseExercise` plus swap row (`sessionEffective.js:802-821`) | as 3 |
| 6 | Capability serve-time substitution | session | effective view at session start, same primary muscle, tier then name order (`capability/effective.js:109-120`; `ActiveWorkoutScreen.js:782-860`) | rows unchanged |
| 7 | Exercise detail "substitutes" | none | display only (`ExerciseDetailScreen.js:524`) | |

One-off versus permanent [OBS]: the plain "Swap exercise" entries (`ActiveWorkoutScreen.js:4612,4644,5320,5665`) open the one-off sheet with no choice; the permanent route is a separate screen. The "Can't do X?" alert already asks just for today or from now on (path 2), and the meal plan asks "just this time" or "persistent" (`MealPlanScreen.js:738-770,1600,1617`). No path converts a logger swap into a plan change.

### 12.2 What the new exercise inherits

| Item | Plan-level (`database.js:5033-5105`) | In-session (`ActiveWorkoutScreen.js:297-312`) |
|---|---|---|
| Set count | kept (`recommended_sets` untouched) | kept (spreads the old row) |
| Rep range | kept, unless the row still carries the default for the OUTGOING tier and the new exercise sits in a different tier, then the new tier's defaults (`prescription.js` `repRangeFor`, `isDefaultPrescription`) | always the new exercise's own default band |
| Rest | same rule as reps | kept from the old row |
| Starting load | cleared to null | cleared to null |
| RIR or effort | not a slot field: block week `rir_target` | same |
| Per-slot id | row id kept | `routineExercise` id kept |
| Notes, superset group, selection reason | kept (stale reason after a swap, `:5084-5100`; read at `RoutineDetailScreen.js:1209`) | kept |
| Week scaling | applies, keyed by the row's current muscle | lost: `weeklyAllocation` is keyed by exercise id and read once per workout (`ActiveWorkoutScreen.js:631-640,1144`), so the new id falls back to the unscaled `recommendedSets` [OBS code read; same miss for serve-time substitution, not device-walked] |
| Suggested weight | from the new exercise's own history only (zero-history seeding at the rep floor, `:1740-1760`) | |

Copy: the plan sheet says "Your set, rep and rest targets stay the same" (`RoutineDetailScreen.js:1540`), untrue on a tier-changing swap of an untouched row.

### 12.3 Can a swap change the muscle and silently move volume

[OBS] Yes, on every path. `rankSwaps` scores same primary muscle 40, same subregion 25, same pattern 20, same equipment 15, same compound/isolation 10, similar fatigue 10, similar SFR 10, and does not filter by muscle (`swapEngine.js:19-37,210-276`); the full-library picker accepts anything. Probe 4: 4 of 22 typical swap sheets list another muscle's exercise (Cable Lateral Raise lists Bayesian Curl; Leg Extension lists Abduction Machine, Calf Raise on Leg Press Sled, Donkey Kickback (Machine), Glute Kickback Machine). Probe 5, served sets weeks 1-6 for a plan-level swap (the slot is then scaled by the NEW muscle's ratio):

| Slot | W1 | W2 | W3 | W4 | W5 | W6 |
|---|---|---|---|---|---|---|
| Leg Extension (quads, 4) | 4 | 5 | 6 | 7 | 7 | 4 |
| swapped to Abduction Machine (glutes) | 4 | 7 | 9 | 12 | 14 | 4 |
| swapped to Calf Raise on Leg Press Sled (calves) | 4 | 5 | 6 | 7 | 7 | 4 |
| Lying Leg Curl (hamstrings, 3) | 3 | 4 | 5 | 6 | 7 | 3 |
| swapped to Abduction Machine (glutes) | 3 | 5 | 7 | 9 | 11 | 3 |

In-session, logged sets credit the swapped-in exercise's muscle by ruling NA-wr-3 and the sheet says so; at plan level nothing says the quads lose a slot while glutes gain one.

### 12.4 Tests pinning swaps
See section 9, "Swaps" row.

---

## Appendix: probe index
Files in `/tmp/claude-0/-home-user-ADPhysique/786bfebd-8f9e-5cc9-9432-3682cc10db7d/scratchpad/d219/R1/`: `probe1` to `probe14` JSON, `zzR1Probe.test.js.txt` (all probe code, copy of the deleted repo file), and notes 1-3 (working notes, not deliverables). Not verified by me: device behaviour of the logger and widget, any cloud state, planAutoGen behaviour with real intent, capability or history data, and custom exercises.
Probe evidence is copied into this folder at `probes-R1/` (the JSON outputs, the probe source as `zzR1Probe.test.js.txt`, and the lane's working notes), so it survives the session scratchpad.
