# 05 Before and after: the same 1,440 plans built by three versions of the code

Generated 2026-10-11. Three copies of the repository were measured with one shared measurement script (`tools/measure-core.js`), so every number below is computed the same way for each version. Nothing was edited in any version.

| Version | Commit | What builds plans in the app |
|---|---|---|
| 3 Oct | `a7c4333` (2026-10-03 18:06) | The older generator, `src/lib/planEngine.js` `generatePlan`. The new planner did not exist yet. |
| 9 Oct | `ddcf0a5` (2026-10-09 19:26) | The new planner, `src/lib/plan/planner.js` `buildPlan`, switched on 2026-10-05 09:22 (`4907cee`, `PLANNER_V2 = true`). This is the state before the lead's changes of 10 October. |
| Now | `39a1929` (main, version 2.13.0) | The new planner after the lead's 10 October changes (see 06-CHANGE-HISTORY.md). |

Inputs, the same for every version: 8 categories (mens_physique, classic_physique, bodybuilding, bikini, wellness, figure, womens_physique, general) x 2 to 6 days x 45 and 75 minutes x 6 equipment settings (full_gym, machines_cables, dumbbells_only, home_gym, barbell_plates, bodyweight) x 3 focus picks (none; chest; glutes + side delts + chest), intermediate. The new planner was called the way the app calls it, with the real seeded exercise library (`src/lib/__tests__/campaign16.helpers.js` LIBRARY, built from `src/lib/exerciseCorpus` as the seed builds it). The older generator was called the way the app called it before 5 October (`generatePlan` with its built-in exercise pool), with focus picks passed as its weak-point labels.

Read the measures with these limits:

- **Back-to-back** means two sessions next to each other in the served order, including the last session back to the first. The app does not fix training days, so any back-to-back pair may be trained on consecutive days. At 2 and 3 days a week, the same muscles in neighbouring sessions is ordinary full-body training, because those sessions are 48 to 96 hours apart in the usual layout. The **24 h apart** rows are the meaningful recovery measure.
- **Session minutes** for the older generator are its own estimate (`estimatedDurationMinutes`). For the new planner they are the planner's estimate at the peak week (`v2.sessionMinutesAtPeak`). The two formulas differ, so compare the over-length rows within a version more than across versions.
- **Readiness check** is the new planner's own recovery simulation (`v2.readiness.passes`). The older generator has no such check.
- **Below today's category floor** measures every version against the per-category floors written on 10 October (`src/lib/plan/divisionStandard.js`, else `src/lib/plan/science.js` `STANDARD_DIRECT_FLOOR`). Those floors did not exist on 3 or 9 October, so this row shows how far the earlier versions sat from them, not a defect those versions were built to avoid.
- **Front delts pressed** means an overhead press, or a press that credits the front delts (new planner: catalogue credits; older generator: the pool's secondary muscles).

## All 1,440 combinations

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Plans built | 1440 of 1440 | 1440 of 1440 | 1440 of 1440 |
| Older generator: exercise names it could not map to a muscle | 0 | n/a | n/a |
| The planner's own readiness check fails | no such check | 470 (33%) | 1158 (80%) |
| Same muscle trained directly in two back-to-back sessions (any gap) | 1169 (81%) | 839 (58%) | 1168 (81%) |
| ...where that pair is 24 h apart in the usual layout | 380 (26%) | 84 (6%) | 532 (37%) |
| Same exercise in two back-to-back sessions | 631 (44%) | 773 (54%) | 1062 (74%) |
| Front delts pressed in two back-to-back sessions (any gap) | 200 (14%) | 548 (38%) | 661 (46%) |
| ...24 h apart | 11 (1%) | 21 (1%) | 87 (6%) |
| Overhead press in 2+ sessions | 36 (3%) | 52 (4%) | 360 (25%) |
| A session runs more than 5 min past the chosen length | 810 (56%) | 410 (28%) | 1147 (80%) |
| A session holds more than 8 exercises or 25 sets | 0 (0%) | 243 (17%) | 1142 (79%) |
| A growth muscle below today's category floor (floors set 10 Oct) | 1434 (100%) | 1436 (100%) | 544 (38%) |
| Average exercises per session | 5.5 | 5.9 | 9.3 |
| Average sets per exercise (peak week for the new planner) | 3.7 | 3.3 | 3.4 |
| Average total direct sets per week | 74.6 | 71.9 | 109.1 |

## mens_physique (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 37 (21%) | 144 (80%) |
| Same muscle directly, back-to-back 24 h apart | 60 (33%) | 7 (4%) | 108 (60%) |
| Front delts pressed back-to-back | 30 (17%) | 72 (40%) | 138 (77%) |
| Over the chosen length by 5+ min | 106 (59%) | 69 (38%) | 139 (77%) |
| Over 8 exercises or 25 sets | 0 (0%) | 42 (23%) | 134 (74%) |
| Longest session, minutes | 93 | 130 | 175 |
| Lower-body sessions per week, min to max | 1 to 2 | 1 to 2 | 1 to 2 |
| Below today's category floor | 180 (100%) | 180 (100%) | 60 (33%) |
| Average total direct sets per week | 73.0 | 71.7 | 102.3 |

## classic_physique (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 39 (22%) | 144 (80%) |
| Same muscle directly, back-to-back 24 h apart | 6 (3%) | 0 (0%) | 31 (17%) |
| Front delts pressed back-to-back | 24 (13%) | 72 (40%) | 72 (40%) |
| Over the chosen length by 5+ min | 103 (57%) | 46 (26%) | 144 (80%) |
| Over 8 exercises or 25 sets | 0 (0%) | 24 (13%) | 128 (71%) |
| Longest session, minutes | 89 | 130 | 187 |
| Lower-body sessions per week, min to max | 1 to 2 | 1 to 2 | 2 to 3 |
| Below today's category floor | 180 (100%) | 179 (99%) | 72 (40%) |
| Average total direct sets per week | 76.9 | 74.0 | 109.8 |

## bodybuilding (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 107 (59%) | 143 (79%) |
| Same muscle directly, back-to-back 24 h apart | 0 (0%) | 24 (13%) | 16 (9%) |
| Front delts pressed back-to-back | 69 (38%) | 106 (59%) | 104 (58%) |
| Over the chosen length by 5+ min | 96 (53%) | 71 (39%) | 164 (91%) |
| Over 8 exercises or 25 sets | 0 (0%) | 49 (27%) | 174 (97%) |
| Longest session, minutes | 94 | 135 | 221 |
| Lower-body sessions per week, min to max | 1 to 2 | 1 to 3 | 1 to 3 |
| Below today's category floor | 174 (97%) | 180 (100%) | 68 (38%) |
| Average total direct sets per week | 83.7 | 83.9 | 135.5 |

## bikini (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 42 (23%) | 136 (76%) |
| Same muscle directly, back-to-back 24 h apart | 72 (40%) | 1 (1%) | 108 (60%) |
| Front delts pressed back-to-back | 0 (0%) | 34 (19%) | 36 (20%) |
| Over the chosen length by 5+ min | 104 (58%) | 41 (23%) | 133 (74%) |
| Over 8 exercises or 25 sets | 0 (0%) | 23 (13%) | 132 (73%) |
| Longest session, minutes | 92 | 135 | 166 |
| Lower-body sessions per week, min to max | 2 to 4 | 2 to 4 | 2 to 3 |
| Below today's category floor | 180 (100%) | 180 (100%) | 60 (33%) |
| Average total direct sets per week | 71.4 | 60.2 | 91.2 |

## wellness (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 32 (18%) | 160 (89%) |
| Same muscle directly, back-to-back 24 h apart | 95 (53%) | 0 (0%) | 108 (60%) |
| Front delts pressed back-to-back | 11 (6%) | 30 (17%) | 36 (20%) |
| Over the chosen length by 5+ min | 101 (56%) | 36 (20%) | 143 (79%) |
| Over 8 exercises or 25 sets | 0 (0%) | 23 (13%) | 166 (92%) |
| Longest session, minutes | 88 | 135 | 177 |
| Lower-body sessions per week, min to max | 2 to 5 | 2 to 4 | 2 to 4 |
| Below today's category floor | 180 (100%) | 180 (100%) | 72 (40%) |
| Average total direct sets per week | 70.2 | 58.2 | 98.0 |

## figure (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 51 (28%) | 145 (81%) |
| Same muscle directly, back-to-back 24 h apart | 87 (48%) | 16 (9%) | 60 (33%) |
| Front delts pressed back-to-back | 6 (3%) | 45 (25%) | 75 (42%) |
| Over the chosen length by 5+ min | 112 (62%) | 40 (22%) | 140 (78%) |
| Over 8 exercises or 25 sets | 0 (0%) | 23 (13%) | 132 (73%) |
| Longest session, minutes | 89 | 135 | 185 |
| Lower-body sessions per week, min to max | 1 to 2 | 1 to 2 | 2 to 2 |
| Below today's category floor | 180 (100%) | 180 (100%) | 72 (40%) |
| Average total direct sets per week | 76.1 | 72.1 | 109.2 |

## womens_physique (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 50 (28%) | 146 (81%) |
| Same muscle directly, back-to-back 24 h apart | 60 (33%) | 0 (0%) | 60 (33%) |
| Front delts pressed back-to-back | 18 (10%) | 71 (39%) | 84 (47%) |
| Over the chosen length by 5+ min | 101 (56%) | 49 (27%) | 142 (79%) |
| Over 8 exercises or 25 sets | 0 (0%) | 24 (13%) | 143 (79%) |
| Longest session, minutes | 93 | 130 | 196 |
| Lower-body sessions per week, min to max | 1 to 2 | 1 to 2 | 2 to 3 |
| Below today's category floor | 180 (100%) | 180 (100%) | 72 (40%) |
| Average total direct sets per week | 77.2 | 75.8 | 114.6 |

## general (180 combinations each)

| Measure | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| Readiness check fails | no such check | 112 (62%) | 140 (78%) |
| Same muscle directly, back-to-back 24 h apart | 0 (0%) | 36 (20%) | 41 (23%) |
| Front delts pressed back-to-back | 42 (23%) | 118 (66%) | 116 (64%) |
| Over the chosen length by 5+ min | 87 (48%) | 58 (32%) | 142 (79%) |
| Over 8 exercises or 25 sets | 0 (0%) | 35 (19%) | 133 (74%) |
| Longest session, minutes | 86 | 130 | 192 |
| Lower-body sessions per week, min to max | 2 to 3 | 1 to 3 | 1 to 3 |
| Below today's category floor | 180 (100%) | 177 (98%) | 68 (38%) |
| Average total direct sets per week | 68.7 | 79.6 | 112.3 |

## Muscles trained directly in back-to-back sessions 24 h apart (plans affected)

| Muscle | 3 Oct (older generator, before the rebuild) | 9 Oct (new planner, before 10 Oct changes) | Now, 2.13.0 on main |
|---|---|---|---|
| chest | 0 | 21 | 19 |
| back | 0 | 1 | 2 |
| side_delts | 191 | 37 | 148 |
| rear_delts | 2 | 2 | 65 |
| front_delts | 0 | 0 | 0 |
| biceps | 58 | 0 | 51 |
| triceps | 0 | 0 | 65 |
| quads | 4 | 3 | 0 |
| hamstrings | 0 | 0 | 4 |
| glutes | 160 | 1 | 65 |
| calves | 4 | 4 | 145 |
| abs | 21 | 28 | 406 |
| traps | 0 | 0 | 0 |

## The founder's plan, built by each version

Men's physique, 60 minutes, full gym, intermediate. New-planner sets are shown as week 1 / peak week; the older generator shows its prescribed sets. Session order is the served order.

#### 3 Oct older generator: men's physique, 4 days, 60 min, full gym, focus side delts + biceps

- **Back + Delts (Width)** (about 68 min): Incline Dumbbell Curl 3x10-20; Barbell Curl 3x10-20; Lat Pulldown (Wide Grip) 3x8-12; Barbell Row (Bent Over) 3x6-10; Cable Lateral Raise 3x10-20; Dumbbell Lateral Raise 4x10-20; Face Pull 3x10-20
- **Lower + Abs** (about 70 min): Bulgarian Split Squat 3x8-12; Leg Extension 3x10-20; Romanian Deadlift (Barbell) 3x6-10; Lying Leg Curl 3x8-15; Barbell Hip Thrust 3x8-12; Standing Calf Raise (Machine) 3x10-20; Cable Crunch 3x10-20
- **Chest + Arms** (about 55 min): Incline Barbell Bench Press 4x6-10; Barbell Bench Press 3x6-10; EZ Bar Skull Crusher 3x10-20; Spider Curl 3x10-20; EZ Bar Curl 3x10-20
- **Back + Delts (Thickness)** (about 64 min): Lat Pulldown (Close Grip) 4x8-12; T-Bar Row 3x6-10; Reverse Pec Deck 3x10-20; Machine Lateral Raise 3x10-20; Leaning Lateral Raise 4x10-20; Barbell Shrug 3x10-20

#### 3 Oct older generator: men's physique, 4 days, 60 min, full gym, no focus

- **Back + Delts (Width)** (about 58 min): Lat Pulldown (Wide Grip) 4x8-12; Barbell Row (Bent Over) 4x6-10; Cable Lateral Raise 3x10-20; Dumbbell Lateral Raise 3x10-20; Face Pull 3x10-20
- **Chest + Arms** (about 55 min): Incline Barbell Bench Press 4x6-10; Barbell Bench Press 3x6-10; EZ Bar Skull Crusher 3x10-20; Incline Dumbbell Curl 3x10-20; Barbell Curl 3x10-20
- **Lower + Abs** (about 70 min): Bulgarian Split Squat 3x8-12; Leg Extension 3x10-20; Romanian Deadlift (Barbell) 3x6-10; Lying Leg Curl 3x8-15; Barbell Hip Thrust 3x8-12; Standing Calf Raise (Machine) 3x10-20; Cable Crunch 3x10-20
- **Back + Delts (Thickness)** (about 61 min): Lat Pulldown (Close Grip) 4x8-12; T-Bar Row 3x6-10; Reverse Pec Deck 3x10-20; Machine Lateral Raise 3x10-20; Leaning Lateral Raise 3x10-20; Barbell Shrug 3x10-20

#### 3 Oct older generator: men's physique, 5 days, 60 min, full gym, no focus

- **Pull (Width)** (about 53 min): Lat Pulldown (Wide Grip) 4x8-12; Barbell Row (Bent Over) 4x6-10; Face Pull 4x10-20; Incline Dumbbell Curl 3x10-20
- **Legs + Abs** (about 70 min): Bulgarian Split Squat 3x8-12; Leg Extension 3x10-20; Romanian Deadlift (Barbell) 3x6-10; Lying Leg Curl 3x8-15; Barbell Hip Thrust 3x8-12; Standing Calf Raise (Machine) 3x10-20; Cable Crunch 3x10-20
- **Delts + Arms** (about 52 min): Machine Lateral Raise 3x10-20; Leaning Lateral Raise 4x10-20; Reverse Pec Deck 5x10-20; Cable Overhead Tricep Extension 4x10-20; Spider Curl 3x10-20
- **Pull (Thickness)** (about 50 min): Lat Pulldown (Close Grip) 4x8-12; T-Bar Row 4x6-10; Barbell Shrug 3x10-20; Barbell Curl 3x10-20
- **Push (Delts + Chest)** (about 63 min): Cable Lateral Raise 3x10-20; Dumbbell Lateral Raise 3x10-20; Incline Barbell Bench Press 3x6-10; Barbell Bench Press 3x6-10; Barbell Overhead Press 3x6-10; EZ Bar Skull Crusher 3x10-20

#### 9 Oct new planner: men's physique, 4 days, 60 min, full gym, focus side delts + biceps (readiness check passes: true)

- **Chest + Arms** (about 65 min at peak): EZ Bar Preacher Curl 2/4x10-20; Barbell Curl 2/3x10-20; Hammer Curl 2/3x10-20; Barbell Bench Press 2/4x6-10; Incline Dumbbell Press 2/4x8-12; Cable Overhead Tricep Extension 2/2x10-20
- **Back + Delts (Width)** (about 61 min at peak): Dumbbell Lateral Raise 2/4x10-20; Cable Lateral Raise 2/4x10-20; Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; Reverse Pec Deck 2/3x10-20
- **Lower + Abs** (about 64 min at peak): Barbell Back Squat 2/4x6-10; Romanian Deadlift (Barbell) 2/3x6-10; Barbell Hip Thrust 2/3x6-10; Leg Extension 2/2x10-20; Seated Leg Curl 2/2x10-20; Standing Calf Raise (Machine) 2/2x10-20; Cable Crunch 2/2x10-20
- **Back + Delts (Thickness)** (about 61 min at peak): Dumbbell Lateral Raise 2/4x10-20; Cable Lateral Raise 2/4x10-20; Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; Face Pull 2/3x10-20

#### 9 Oct new planner: men's physique, 4 days, 60 min, full gym, no focus (readiness check passes: true)

- **Chest + Arms** (about 65 min at peak): Barbell Bench Press 2/4x6-10; Incline Dumbbell Press 2/4x8-12; EZ Bar Preacher Curl 2/3x10-20; Barbell Curl 2/3x10-20; Cable Overhead Tricep Extension 2/3x10-20; Tricep Pushdown (Rope) 2/3x10-20
- **Back + Delts (Width)** (about 64 min at peak): Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; Dumbbell Lateral Raise 2/3x10-20; Cable Lateral Raise 2/3x10-20; Reverse Pec Deck 2/3x10-20; Face Pull 2/3x10-20
- **Lower + Abs** (about 64 min at peak): Barbell Back Squat 2/4x6-10; Romanian Deadlift (Barbell) 2/3x6-10; Barbell Hip Thrust 2/3x6-10; Leg Extension 2/2x10-20; Seated Leg Curl 2/2x10-20; Standing Calf Raise (Machine) 2/2x10-20; Cable Crunch 2/2x10-20
- **Back + Delts (Thickness)** (about 64 min at peak): Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; Dumbbell Lateral Raise 2/3x10-20; Cable Lateral Raise 2/3x10-20; Reverse Pec Deck 2/3x10-20; Face Pull 2/3x10-20

#### 9 Oct new planner: men's physique, 5 days, 60 min, full gym, no focus (readiness check passes: true)

- **Delts + Arms** (about 43 min at peak): Dumbbell Lateral Raise 2/3x10-20; Cable Lateral Raise 2/3x10-20; Face Pull 2/3x10-20; Cable Overhead Tricep Extension 2/3x10-20; Tricep Pushdown (Rope) 2/3x10-20
- **Legs + Abs** (about 64 min at peak): Barbell Back Squat 2/4x6-10; Romanian Deadlift (Barbell) 2/3x6-10; Barbell Hip Thrust 2/3x6-10; Leg Extension 2/2x10-20; Seated Leg Curl 2/2x10-20; Standing Calf Raise (Machine) 2/2x10-20; Cable Crunch 2/2x10-20
- **Pull (Width)** (about 38 min at peak): Lat Pulldown (Wide Grip) 2/3x8-12; Reverse Pec Deck 2/3x10-20; Face Pull 2/3x10-20; EZ Bar Preacher Curl 2/3x10-20
- **Push (Delts + Chest)** (about 64 min at peak): Barbell Bench Press 2/4x6-10; Barbell Overhead Press 2/4x6-10; Incline Dumbbell Press 2/4x8-12; Dumbbell Lateral Raise 2/3x10-20; Cable Overhead Tricep Extension 2/2x10-20
- **Pull (Thickness)** (about 49 min at peak): Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; EZ Bar Preacher Curl 2/3x10-20; Barbell Curl 2/3x10-20

#### Now, 2.13.0: men's physique, 4 days, 60 min, full gym, focus side delts + biceps (readiness check passes: false)

- **Upper A (Width)** (about 90 min at peak): Dumbbell Lateral Raise 2/4x10-20; EZ Bar Preacher Curl 2/4x10-20; Barbell Curl 2/4x10-20; Barbell Bench Press 2/4x6-10; Barbell Overhead Press 2/2x6-10; Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; Reverse Pec Deck 2/2x10-20; Cable Overhead Tricep Extension 2/3x10-20
- **Legs + Abs** (about 83 min at peak): Barbell Back Squat 2/4x6-10; Romanian Deadlift (Barbell) 2/4x6-10; Barbell Hip Thrust 2/4x6-10; Leg Press 2/4x8-15; Seated Leg Curl 2/2x10-20; Standing Calf Raise (Machine) 2/3x10-20; Seated Calf Raise 2/2x10-20; Cable Crunch 2/3x10-20
- **Shoulders + Arms** (about 74 min at peak): Dumbbell Lateral Raise 2/4x10-20; Cable Lateral Raise 2/3x10-20; EZ Bar Preacher Curl 2/4x10-20; Barbell Curl 2/4x10-20; Barbell Overhead Press 2/3x6-10; Reverse Pec Deck 2/2x10-20; Cable Overhead Tricep Extension 2/3x10-20; Cable Crunch 2/3x10-20; Hanging Knee Raise 2/2x10-20
- **Upper B (Detail)** (about 76 min at peak): Dumbbell Lateral Raise 3/4x10-20; Cable Lateral Raise 2/4x10-20; Barbell Curl 2/2x10-20; Barbell Bench Press 2/3x6-10; Seated Cable Row 2/4x8-12; Incline Dumbbell Press 2/3x8-12; Face Pull 2/2x10-20; Tricep Pushdown (Rope) 2/2x10-20; Seated Calf Raise 2/3x10-20

#### Now, 2.13.0: men's physique, 4 days, 60 min, full gym, no focus (readiness check passes: false)

- **Shoulders + Arms** (about 65 min at peak): Barbell Overhead Press 2/6x6-10; Dumbbell Lateral Raise 2/2x10-20; Reverse Pec Deck 2/2x10-20; EZ Bar Preacher Curl 2/3x10-20; Cable Overhead Tricep Extension 2/2x10-20; Cable Crunch 2/3x10-20; Hanging Knee Raise 2/2x10-20
- **Upper B (Detail)** (about 72 min at peak): Barbell Bench Press 2/3x6-10; Seated Cable Row 2/4x8-12; Incline Dumbbell Press 2/3x8-12; Dumbbell Lateral Raise 2/3x10-20; Cable Lateral Raise 2/2x10-20; Face Pull 2/2x10-20; Barbell Curl 2/2x10-20; Tricep Pushdown (Rope) 2/3x10-20; Seated Calf Raise 2/3x10-20
- **Legs + Abs** (about 83 min at peak): Barbell Back Squat 2/4x6-10; Romanian Deadlift (Barbell) 2/4x6-10; Barbell Hip Thrust 2/4x6-10; Leg Press 2/4x8-15; Seated Leg Curl 2/2x10-20; Standing Calf Raise (Machine) 2/3x10-20; Seated Calf Raise 2/2x10-20; Cable Crunch 2/3x10-20
- **Upper A (Width)** (about 77 min at peak): Barbell Bench Press 2/4x6-10; Barbell Overhead Press 2/2x6-10; Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; Dumbbell Lateral Raise 2/3x10-20; Reverse Pec Deck 2/2x10-20; EZ Bar Preacher Curl 2/3x10-20; Cable Overhead Tricep Extension 2/3x10-20

#### Now, 2.13.0: men's physique, 5 days, 60 min, full gym, no focus (readiness check passes: false)

- **Arms + Back + Calves** (about 65 min at peak): Lat Pulldown (Wide Grip) 2/3x8-12; Seated Cable Row 2/3x8-12; Dumbbell Lateral Raise 2/3x10-20; Cable Lateral Raise 2/2x10-20; Barbell Curl 2/3x10-20; Tricep Pushdown (Rope) 2/2x10-20; Seated Calf Raise 2/3x10-20; Cable Crunch 2/2x10-20
- **Chest + Triceps** (about 63 min at peak): Barbell Bench Press 2/3x6-10; Barbell Overhead Press 2/3x6-10; Incline Dumbbell Press 2/3x8-12; Cable Overhead Tricep Extension 2/3x10-20; Tricep Pushdown (Rope) 2/3x10-20; Cable Crunch 2/3x10-20
- **Back + Biceps** (about 61 min at peak): Lat Pulldown (Wide Grip) 2/4x8-12; Seated Cable Row 2/4x8-12; Reverse Pec Deck 2/3x10-20; Face Pull 2/2x10-20; EZ Bar Preacher Curl 2/3x10-20; Barbell Curl 2/3x10-20
- **Legs** (about 76 min at peak): Barbell Back Squat 2/4x6-10; Romanian Deadlift (Barbell) 2/4x6-10; Barbell Hip Thrust 2/4x6-10; Leg Press 2/4x8-15; Seated Leg Curl 2/2x10-20; Standing Calf Raise (Machine) 2/3x10-20; Seated Calf Raise 2/2x10-20
- **Shoulders + Chest** (about 65 min at peak): Barbell Bench Press 2/3x6-10; Barbell Overhead Press 2/2x6-10; Incline Dumbbell Press 2/3x8-12; Dumbbell Lateral Raise 2/3x10-20; Cable Lateral Raise 2/3x10-20; Face Pull 2/3x10-20; Hanging Knee Raise 2/3x10-20
