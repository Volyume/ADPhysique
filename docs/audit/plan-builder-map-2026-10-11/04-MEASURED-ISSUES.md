# 04 Measured issues across every input combination (generated 2026-10-11)

Built 1440 plans with the live planner and the real exercise library: 8 categories x 2 to 6 days x 45 and 75 minutes x 6 equipment settings x 3 focus picks (none; chest; glutes + side delts + chest), intermediate, first block. Generator: tools/generate-samples.jest.js. Each measure is computed from the plan the app would save; definitions are under the table.

Plans that failed to build: 0.

## All plans

| Measure | Plans affected |
|---|---|
| The planner's own readiness check fails | 1158 of 1440 (80%) |
| At least one back-to-back pair trains the same muscle directly (2+ sets in both) | 1168 of 1440 (81%) |
| ...and that pair is 24 h apart in the app's usual layout | 532 of 1440 (37%) |
| The same exercise appears in two back-to-back sessions | 1062 of 1440 (74%) |
| The front delts are pressed in two back-to-back sessions | 661 of 1440 (46%) |
| An overhead press appears in 2 or more sessions | 360 of 1440 (25%) |
| A session runs more than 5 min past the chosen length | 1147 of 1440 (80%) |
| A session holds more than 8 exercises or 25 sets | 1142 of 1440 (79%) |
| A growth muscle sits below its category's direct floor | 544 of 1440 (38%) |

## By category

| Category | Plans | Readiness fails | Back-to-back same muscle | ...24 h apart | Front delts pressed back to back | Over length | Over 8 ex / 25 sets | Longest session min | Lower-body sessions per week (min-max) |
|---|---|---|---|---|---|---|---|---|---|
| mens_physique | 180 | 144 | 180 | 108 | 138 | 139 | 134 | 175 | 1-2 |
| classic_physique | 180 | 144 | 103 | 31 | 72 | 144 | 128 | 187 | 2-3 |
| bodybuilding | 180 | 143 | 106 | 16 | 104 | 164 | 174 | 221 | 1-3 |
| bikini | 180 | 136 | 180 | 108 | 36 | 133 | 132 | 166 | 2-3 |
| wellness | 180 | 160 | 180 | 108 | 36 | 143 | 166 | 177 | 2-4 |
| figure | 180 | 145 | 144 | 60 | 75 | 140 | 132 | 185 | 2-2 |
| womens_physique | 180 | 146 | 144 | 60 | 84 | 142 | 143 | 196 | 2-3 |
| general | 180 | 140 | 131 | 41 | 116 | 142 | 133 | 192 | 1-3 |

## By days per week

| Days | Plans | Readiness fails | Back-to-back same muscle | ...24 h apart | Over length | Longest session min |
|---|---|---|---|---|---|---|
| 2 | 288 | 160 | 288 | 0 | 288 | 221 |
| 3 | 288 | 236 | 288 | 0 | 277 | 176 |
| 4 | 288 | 216 | 128 | 127 | 230 | 132 |
| 5 | 288 | 284 | 240 | 208 | 186 | 108 |
| 6 | 288 | 262 | 224 | 197 | 166 | 107 |

## By equipment

| Equipment | Plans | Readiness fails | Back-to-back same muscle | Over length | Below floor |
|---|---|---|---|---|---|
| full_gym | 240 | 203 | 187 | 214 | 0 |
| machines_cables | 240 | 199 | 191 | 196 | 4 |
| dumbbells_only | 240 | 177 | 201 | 179 | 30 |
| home_gym | 240 | 177 | 201 | 185 | 30 |
| barbell_plates | 240 | 203 | 199 | 207 | 240 |
| bodyweight | 240 | 199 | 189 | 166 | 240 |

## Which muscles are trained directly in back-to-back sessions, and how often

| Muscle | Plans where it is trained directly in two back-to-back sessions |
|---|---|
| calves | 739 of 1440 |
| abs | 721 of 1440 |
| glutes | 684 of 1440 |
| hamstrings | 615 of 1440 |
| chest | 583 of 1440 |
| triceps | 562 of 1440 |
| side_delts | 558 of 1440 |
| back | 537 of 1440 |
| biceps | 514 of 1440 |
| quads | 506 of 1440 |
| rear_delts | 371 of 1440 |
| front_delts | 196 of 1440 |
| traps | 137 of 1440 |
| adductors | 105 of 1440 |
| forearms | 91 of 1440 |

## Definitions

- Back-to-back: two sessions next to each other in the served order, including the last session to the first. The app does not fix training days, so any such pair can be trained on consecutive days.
- Trained directly: the muscle has 2 or more peak-week sets on its own exercises in that session.
- Front delts pressed: the session has an overhead press (a compound exercise whose muscle is front delts) or a press whose catalogue credits include the front delts.
- Readiness check: `v2.readiness.passes` from the planner, which simulates recovery at the app's usual spacing (src/lib/plan/readiness.js).
- Over length: `v2.overTime`, more than 5 minutes past the chosen session length after the rest ladder. Direct floor: src/lib/plan/divisionStandard.js, else src/lib/plan/science.js STANDARD_DIRECT_FLOOR.