# 03 Real samples from the live planner (generated 2026-10-11)

Every plan below was produced by the live planner code on `main`, with the real seeded exercise library, by `tools/generate-samples.jest.js` in this folder. Nothing was typed by hand. Inputs not listed: first block, no logged history, average recovery rating, no learned factor, no continuity, not strength phase. "Usual gap" is `TYPICAL_WEEK_GAP_HOURS` in src/lib/recovery/constants.js (4 days: Mon, Tue, Thu, Fri). Users have no fixed training days, so any back-to-back pair can fall on consecutive days.

## A. Men's physique, 4 days, 60 min, focus side delts and biceps, with all six weeks

This is the structure behind the founder's plan of 10 October (screenshots in the conversation: Legs + Abs, Upper A (Width), Shoulders + Arms, Upper B (Detail)). The founder's own plan shows different exercise names (machine chest press, hack squat, Smith machine Romanian deadlift) because the live app's catalogue prefers exercises the person has logged and the rebuild keeps the person's existing exercises (`plannerV2KeptChoices`, `src/lib/exercise/continuity.js`), and a different served order because the person's recovery rating, learned recovery factor and own gaps between sessions change the order (`personalise` in `src/lib/plan/planner.js`). This sample has no logged history, so it shows the catalogue's first choices and the population order.

### mens_physique, 4 days, 60 min, full_gym, intermediate, focus side_delts + biceps

Plan name: V-Taper 4×/week. Structure: `division_mens_physique_4`. Served order: Upper A (Width), Legs + Abs, Shoulders + Arms, Upper B (Detail).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): side_delts 37%, biceps 40%, triceps 50%, rear_delts 62%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Width) +29.5 min, Legs + Abs +22.5 min, Upper B (Detail) +16 min, Shoulders + Arms +13.5 min. Sessions past 8 exercises or 25 sets: Upper A (Width), Legs + Abs, Upper B (Detail), Shoulders + Arms.

**1. Upper A (Width)** (about 90 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 4 | 10-20 | 60 |
| 2 | EZ Bar Preacher Curl | biceps | isolation | 2 | 4 | 10-20 | 60 |
| 3 | Barbell Curl | biceps | isolation | 2 | 4 | 10-20 | 60 |
| 4 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 5 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 150 |
| 6 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 7 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 8 | Reverse Pec Deck | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |

**2. Legs + Abs** (about 83 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Shoulders + Arms** (about 74 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 4 | 10-20 | 60 |
| 2 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 3 | EZ Bar Preacher Curl | biceps | isolation | 2 | 4 | 10-20 | 60 |
| 4 | Barbell Curl | biceps | isolation | 2 | 4 | 10-20 | 60 |
| 5 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 3 | 6-10 | 150 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**4. Upper B (Detail)** (about 76 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Lateral Raise | side_delts | isolation | 3 | 4 | 10-20 | 60 |
| 2 | Cable Lateral Raise | side_delts | isolation | 2 | 4 | 10-20 | 60 |
| 3 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 4 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 5 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 6 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 7 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: side_delts 19, biceps 18, back 12, chest 10, triceps 8, quads 8, calves 8, abs 8, rear_delts 6, hamstrings 6, front_delts 5, glutes 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 1. Overhead presses per session: 1 / 0 / 1 / 0. Sessions that press the front delts (overhead press or a press crediting them): 3, of which back-to-back pairs: 2.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A (Width) | Legs + Abs | 24 | - | - | - |
| Legs + Abs | Shoulders + Arms | 48 | abs | - | Cable Crunch |
| Shoulders + Arms | Upper B (Detail) | 24 | biceps, rear_delts, side_delts, triceps | front_delts | Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl |
| Upper B (Detail) | Upper A (Width) | 72 | back, biceps, chest, rear_delts, side_delts, triceps | front_delts | Dumbbell Lateral Raise, Barbell Curl, Barbell Bench Press, Seated Cable Row |

Sets per exercise in each week of the 6-week block, as the week server (prescribeWeek) serves them:

| Session | Exercise | W1 | W2 | W3 | W4 | W5 | W6 |
|---|---|---|---|---|---|---|---|
| Upper A (Width) | Dumbbell Lateral Raise | 2 | 3 | 3 | 4 | 4 | 2 |
| Upper A (Width) | EZ Bar Preacher Curl | 2 | 3 | 3 | 4 | 4 | 2 |
| Upper A (Width) | Barbell Curl | 2 | 2 | 3 | 3 | 4 | 2 |
| Upper A (Width) | Barbell Bench Press | 2 | 3 | 3 | 4 | 4 | 2 |
| Upper A (Width) | Barbell Overhead Press | 2 | 2 | 2 | 2 | 2 | 1 |
| Upper A (Width) | Lat Pulldown (Wide Grip) | 2 | 3 | 3 | 4 | 4 | 2 |
| Upper A (Width) | Seated Cable Row | 2 | 2 | 3 | 3 | 4 | 2 |
| Upper A (Width) | Reverse Pec Deck | 2 | 2 | 2 | 2 | 2 | 1 |
| Upper A (Width) | Cable Overhead Tricep Extension | 2 | 3 | 3 | 3 | 3 | 2 |
| Legs + Abs | Barbell Back Squat | 2 | 3 | 3 | 4 | 4 | 2 |
| Legs + Abs | Romanian Deadlift (Barbell) | 2 | 3 | 3 | 4 | 4 | 2 |
| Legs + Abs | Barbell Hip Thrust | 2 | 3 | 3 | 4 | 4 | 2 |
| Legs + Abs | Leg Press | 2 | 2 | 3 | 3 | 4 | 2 |
| Legs + Abs | Seated Leg Curl | 2 | 2 | 2 | 2 | 2 | 1 |
| Legs + Abs | Standing Calf Raise (Machine) | 2 | 2 | 2 | 3 | 3 | 2 |
| Legs + Abs | Seated Calf Raise | 2 | 2 | 2 | 2 | 2 | 1 |
| Legs + Abs | Cable Crunch | 2 | 3 | 3 | 3 | 3 | 2 |
| Shoulders + Arms | Dumbbell Lateral Raise | 2 | 3 | 3 | 3 | 4 | 2 |
| Shoulders + Arms | Cable Lateral Raise | 2 | 2 | 3 | 3 | 3 | 2 |
| Shoulders + Arms | EZ Bar Preacher Curl | 2 | 3 | 3 | 4 | 4 | 2 |
| Shoulders + Arms | Barbell Curl | 2 | 2 | 3 | 3 | 4 | 2 |
| Shoulders + Arms | Barbell Overhead Press | 2 | 2 | 3 | 3 | 3 | 2 |
| Shoulders + Arms | Reverse Pec Deck | 2 | 2 | 2 | 2 | 2 | 1 |
| Shoulders + Arms | Cable Overhead Tricep Extension | 2 | 2 | 2 | 3 | 3 | 1 |
| Shoulders + Arms | Cable Crunch | 2 | 2 | 2 | 3 | 3 | 1 |
| Shoulders + Arms | Hanging Knee Raise | 2 | 2 | 2 | 2 | 2 | 1 |
| Upper B (Detail) | Dumbbell Lateral Raise | 3 | 3 | 3 | 4 | 4 | 2 |
| Upper B (Detail) | Cable Lateral Raise | 2 | 2 | 3 | 3 | 4 | 2 |
| Upper B (Detail) | Barbell Curl | 2 | 2 | 2 | 2 | 2 | 1 |
| Upper B (Detail) | Barbell Bench Press | 2 | 2 | 3 | 3 | 3 | 2 |
| Upper B (Detail) | Seated Cable Row | 2 | 3 | 3 | 4 | 4 | 2 |
| Upper B (Detail) | Incline Dumbbell Press | 2 | 2 | 2 | 2 | 3 | 1 |
| Upper B (Detail) | Face Pull | 2 | 2 | 2 | 2 | 2 | 1 |
| Upper B (Detail) | Tricep Pushdown (Rope) | 2 | 2 | 2 | 2 | 2 | 1 |
| Upper B (Detail) | Seated Calf Raise | 2 | 3 | 3 | 3 | 3 | 1 |

Weekly target per muscle (direct sets), weeks 1 to 6: side_delts 11/13/15/17/19/10; biceps 10/12/14/16/18/9; chest 6/7/8/9/10/5; front_delts 4/4/5/5/5/3; back 6/8/9/11/12/6; rear_delts 6/6/6/6/6/3; triceps 6/7/7/8/8/4; quads 4/5/6/7/8/4; hamstrings 4/5/5/6/6/3; glutes 2/3/3/4/4/2; calves 6/7/7/8/8/4; abs 6/7/7/8/8/4.

## B. Every category, 3 to 6 days, 60 minutes, full gym, no focus

### mens_physique, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 3×/week. Structure: `division_mens_physique_3`. Served order: Upper A (Width), Legs + Abs, Upper B (Detail).
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Width) +30.5 min, Legs + Abs +22.5 min, Upper B (Detail) +44 min. Sessions past 8 exercises or 25 sets: Upper A (Width), Legs + Abs, Upper B (Detail).

**1. Upper A (Width)** (about 91 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 10 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**2. Legs + Abs** (about 83 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper B (Detail)** (about 104 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 11 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, chest 10, biceps 8, triceps 8, abs 8, quads 8, calves 8, rear_delts 6, hamstrings 6, front_delts 5, glutes 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 1. Overhead presses per session: 1 / 0 / 1. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 1.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A (Width) | Legs + Abs | 48 | abs | - | Hanging Knee Raise |
| Legs + Abs | Upper B (Detail) | 48 | calves | - | Seated Calf Raise |
| Upper B (Detail) | Upper A (Width) | 72 | back, biceps, chest, front_delts, rear_delts, side_delts, triceps | - | Barbell Bench Press, Barbell Overhead Press, Lat Pulldown (Wide Grip), Dumbbell Lateral Raise, Cable Lateral Raise, EZ Bar Preacher Curl, Tricep Pushdown (Rope) |

### mens_physique, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 4×/week. Structure: `division_mens_physique_4`. Served order: Shoulders + Arms, Upper B (Detail), Legs + Abs, Upper A (Width).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): side_delts 48%, triceps 48%, biceps 62%, rear_delts 62%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Width) +16.5 min, Legs + Abs +22.5 min, Upper B (Detail) +12 min. Sessions past 8 exercises or 25 sets: Legs + Abs, Upper B (Detail).

**1. Shoulders + Arms** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 6 | 6-10 | 180 |
| 2 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 2 | 10-20 | 75 |
| 4 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Upper B (Detail)** (about 72 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |

**3. Legs + Abs** (about 83 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**4. Upper A (Width)** (about 77 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 10, chest 10, front_delts 8, biceps 8, triceps 8, abs 8, calves 8, quads 8, rear_delts 6, hamstrings 6, glutes 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 1. Overhead presses per session: 1 / 0 / 0 / 1. Sessions that press the front delts (overhead press or a press crediting them): 3, of which back-to-back pairs: 2.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Shoulders + Arms | Upper B (Detail) | 24 | biceps, rear_delts, side_delts, triceps | front_delts | Dumbbell Lateral Raise |
| Upper B (Detail) | Legs + Abs | 48 | calves | - | Seated Calf Raise |
| Legs + Abs | Upper A (Width) | 24 | - | - | - |
| Upper A (Width) | Shoulders + Arms | 72 | biceps, front_delts, rear_delts, side_delts, triceps | - | Barbell Overhead Press, Dumbbell Lateral Raise, Reverse Pec Deck, EZ Bar Preacher Curl, Cable Overhead Tricep Extension |

### mens_physique, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 5×/week. Structure: `division_mens_physique_5`. Served order: Arms + Back + Calves, Chest + Triceps, Back + Biceps, Legs, Shoulders + Chest.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): triceps 62%, back 71%, rear_delts 73%, abs 83%, biceps 89%.
Sessions past the chosen length by more than 5 minutes at the peak: Legs +15.5 min. Sessions past 8 exercises or 25 sets: none.

**1. Arms + Back + Calves** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 8 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Chest + Triceps** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 3 | 6-10 | 180 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 150 |
| 4 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |

**3. Back + Biceps** (about 61 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**4. Legs** (about 76 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |

**5. Shoulders + Chest** (about 65 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 180 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 150 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: back 14, chest 12, side_delts 11, biceps 9, triceps 8, calves 8, abs 8, rear_delts 8, quads 8, hamstrings 6, front_delts 5, glutes 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 1. Overhead presses per session: 0 / 1 / 0 / 0 / 1. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Arms + Back + Calves | Chest + Triceps | 24 | abs, triceps | - | Tricep Pushdown (Rope), Cable Crunch |
| Chest + Triceps | Back + Biceps | 24 | - | - | - |
| Back + Biceps | Legs | 24 | - | - | - |
| Legs | Shoulders + Chest | 24 | - | - | - |
| Shoulders + Chest | Arms + Back + Calves | 72 | abs, side_delts | rear_delts | Dumbbell Lateral Raise, Cable Lateral Raise |

### mens_physique, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 6×/week. Structure: `division_mens_physique_6`. Served order: Shoulders + Arms, Push A (Chest), Pull B (Thickness), Legs + Abs, Push B (Delts), Pull A (Width).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): front_delts 53%, side_delts 60%, triceps 62%, rear_delts 82%, biceps 82%, abs 83%.
Sessions past the chosen length by more than 5 minutes at the peak: Legs + Abs +15.5 min. Sessions past 8 exercises or 25 sets: none.

**1. Shoulders + Arms** (about 51 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 2 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 3 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 75 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |

**2. Push A (Chest)** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 4 | 6-10 | 180 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |

**3. Pull B (Thickness)** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**4. Legs + Abs** (about 76 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**5. Push B (Delts)** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**6. Pull A (Width)** (about 65 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: chest 16, back 16, side_delts 13, rear_delts 12, biceps 9, triceps 8, calves 8, abs 8, front_delts 8, quads 8, hamstrings 6, glutes 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 1. Overhead presses per session: 0 / 1 / 0 / 0 / 0 / 1. Sessions that press the front delts (overhead press or a press crediting them): 3, of which back-to-back pairs: 1.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Shoulders + Arms | Push A (Chest) | 24 | side_delts, triceps | - | Cable Overhead Tricep Extension |
| Push A (Chest) | Pull B (Thickness) | 24 | side_delts | - | Dumbbell Lateral Raise |
| Pull B (Thickness) | Legs + Abs | 24 | - | - | - |
| Legs + Abs | Push B (Delts) | 24 | abs | - | - |
| Push B (Delts) | Pull A (Width) | 24 | - | front_delts | - |
| Pull A (Width) | Shoulders + Arms | 48 | biceps, rear_delts | - | Reverse Pec Deck, EZ Bar Preacher Curl |

### classic_physique, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 3×/week. Structure: `division_classic_physique_3`. Served order: Upper B + Legs, Legs (Quad), Upper A (Back + Delt).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 71%, hamstrings 78%, quads 79%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Back + Delt) +31.5 min, Legs (Quad) +30 min, Upper B + Legs +54.5 min. Sessions past 8 exercises or 25 sets: Upper A (Back + Delt), Legs (Quad), Upper B + Legs.

**1. Upper B + Legs** (about 115 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 5 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 6 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 7 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 11 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 13 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |

**2. Legs (Quad)** (about 90 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper A (Back + Delt)** (about 92 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 8 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 10 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: quads 13, back 12, calves 11, side_delts 11, chest 10, hamstrings 10, glutes 8, biceps 8, triceps 8, abs 6, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 1.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper B + Legs | Legs (Quad) | 48 | calves, glutes, hamstrings, quads | - | Romanian Deadlift (Barbell), Standing Calf Raise (Machine), Seated Calf Raise, Leg Extension |
| Legs (Quad) | Upper A (Back + Delt) | 48 | - | - | - |
| Upper A (Back + Delt) | Upper B + Legs | 72 | back, biceps, chest, side_delts, triceps | - | Barbell Bench Press, Seated Cable Row, Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl, Tricep Pushdown (Rope) |

### classic_physique, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 4×/week. Structure: `division_classic_physique_4`. Served order: Upper A (Back + Delt), Legs (Quad), Upper B (Chest + Arm), Legs (Ham).
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Back + Delt) +23 min, Legs (Quad) +15.5 min, Upper B (Chest + Arm) +14 min, Legs (Ham) +8 min. Sessions past 8 exercises or 25 sets: Upper A (Back + Delt), Upper B (Chest + Arm).

**1. Upper A (Back + Delt)** (about 83 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |

**2. Legs (Quad)** (about 76 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper B (Chest + Arm)** (about 74 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

**4. Legs (Ham)** (about 68 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: quads 13, back 12, side_delts 11, calves 11, chest 10, hamstrings 10, biceps 8, triceps 8, glutes 8, rear_delts 6, abs 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A (Back + Delt) | Legs (Quad) | 24 | - | - | - |
| Legs (Quad) | Upper B (Chest + Arm) | 48 | - | - | - |
| Upper B (Chest + Arm) | Legs (Ham) | 24 | - | - | - |
| Legs (Ham) | Upper A (Back + Delt) | 72 | - | - | - |

### classic_physique, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 5×/week. Structure: `division_classic_physique_5`. Served order: Shoulders + Arms, Quads + Calves, Back, Chest + Side Delts, Hamstrings + Glutes.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): back 87%.
Sessions past the chosen length by more than 5 minutes at the peak: Quads + Calves +15.5 min, Hamstrings + Glutes +8 min. Sessions past 8 exercises or 25 sets: none.

**1. Shoulders + Arms** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |

**2. Quads + Calves** (about 76 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Back** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**4. Chest + Side Delts** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |

**5. Hamstrings + Glutes** (about 68 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: quads 13, back 12, chest 12, side_delts 11, calves 11, hamstrings 10, rear_delts 9, biceps 9, triceps 9, glutes 8, abs 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Shoulders + Arms | Quads + Calves | 24 | - | - | - |
| Quads + Calves | Back | 24 | - | - | - |
| Back | Chest + Side Delts | 24 | - | - | - |
| Chest + Side Delts | Hamstrings + Glutes | 24 | - | - | - |
| Hamstrings + Glutes | Shoulders + Arms | 72 | - | - | - |

### classic_physique, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 6×/week. Structure: `division_classic_physique_6`. Served order: Shoulders + Arms, Legs (Ham) + Calves, Back (Width), Legs (Quad), Chest + Abs, Back (Thickness) + Hams.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 69%, quads 79%, abs 83%, rear_delts 86%.
Sessions past the chosen length by more than 5 minutes at the peak: none. Sessions past 8 exercises or 25 sets: none.

**1. Shoulders + Arms** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |

**2. Legs (Ham) + Calves** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**3. Back (Width)** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**4. Legs (Quad)** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 3 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**5. Chest + Abs** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |

**6. Back (Thickness) + Hams** (about 65 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: back 16, chest 13, quads 13, side_delts 11, rear_delts 11, hamstrings 11, calves 11, biceps 9, triceps 8, glutes 8, abs 7.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 0 / 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Shoulders + Arms | Legs (Ham) + Calves | 24 | - | - | - |
| Legs (Ham) + Calves | Back (Width) | 24 | - | - | - |
| Back (Width) | Legs (Quad) | 24 | - | - | - |
| Legs (Quad) | Chest + Abs | 24 | abs | - | - |
| Chest + Abs | Back (Thickness) + Hams | 24 | - | - | - |
| Back (Thickness) + Hams | Shoulders + Arms | 48 | rear_delts | biceps | - |

### bodybuilding, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: Full body with rotating emphasis 3×/week. Structure: `full_body_abc`. Served order: Full Body A, Full Body B, Full Body C.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 79%, triceps 89%.
Sessions past the chosen length by more than 5 minutes at the peak: Full Body A +56 min, Full Body C +83 min, Full Body B +49.5 min. Sessions past 8 exercises or 25 sets: Full Body A, Full Body C, Full Body B.

**1. Full Body A** (about 116 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 150 |
| 4 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 60 |
| 13 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 14 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**2. Full Body B** (about 110 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |
| 9 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |
| 10 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Full Body C** (about 143 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 6 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 7 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 11 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 13 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 14 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |
| 15 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |

Weekly direct sets at the peak week: back 14, quads 13, chest 12, calves 11, abs 11, hamstrings 10, forearms 10, biceps 8, triceps 8, glutes 8, side_delts 8, traps 8, rear_delts 6, front_delts 5.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 1 / 1 / 0. Sessions that press the front delts (overhead press or a press crediting them): 3, of which back-to-back pairs: 3.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Full Body A | Full Body B | 48 | abs, back, front_delts, hamstrings, triceps | - | Barbell Overhead Press, Lat Pulldown (Wide Grip), Cable Overhead Tricep Extension, Seated Leg Curl, Cable Crunch, Hanging Knee Raise |
| Full Body B | Full Body C | 48 | back, forearms, glutes, side_delts, traps | front_delts, triceps | Lat Pulldown (Wide Grip), Cable Lateral Raise, Dumbbell Shrug, Barbell Wrist Curl |
| Full Body C | Full Body A | 72 | back, biceps, calves, chest, quads | front_delts, rear_delts, triceps | Barbell Bench Press, Lat Pulldown (Wide Grip), Standing Calf Raise (Machine), Seated Calf Raise, EZ Bar Preacher Curl, Leg Extension |

### bodybuilding, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: Upper and lower, twice 4×/week. Structure: `upper_lower_x2`. Served order: Upper A, Lower A, Upper B, Lower B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A +58 min, Lower A +22.5 min, Upper B +41 min, Lower B +13 min. Sessions past 8 exercises or 25 sets: Upper A, Lower A, Upper B, Lower B.

**1. Upper A** (about 118 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 5 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 11 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |
| 13 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |

**2. Lower A** (about 83 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper B** (about 101 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |
| 11 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |

**4. Lower B** (about 73 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: back 14, quads 13, chest 12, calves 11, abs 11, forearms 10, hamstrings 10, side_delts 8, biceps 8, triceps 8, traps 8, glutes 8, rear_delts 6, front_delts 5.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 1 / 0 / 1 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A | Lower A | 24 | - | - | - |
| Lower A | Upper B | 48 | - | - | - |
| Upper B | Lower B | 24 | - | - | - |
| Lower B | Upper A | 72 | - | - | - |

### bodybuilding, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: Push, pull, legs, upper, lower 5×/week. Structure: `ppl_upper_lower`. Served order: Upper, Legs, Push, Pull, Lower.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): chest 87%, triceps 89%.
Sessions past the chosen length by more than 5 minutes at the peak: Push +6 min, Pull +6.5 min, Legs +22.5 min, Upper +30 min, Lower +13 min. Sessions past 8 exercises or 25 sets: Legs, Upper, Lower.

**1. Upper** (about 90 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |
| 10 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |

**2. Legs** (about 83 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Push** (about 66 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

**4. Pull** (about 67 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Dumbbell Shrug | traps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |

**5. Lower** (about 73 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: back 14, quads 13, chest 12, calves 11, abs 11, forearms 10, hamstrings 10, side_delts 8, biceps 8, triceps 8, glutes 8, traps 7, rear_delts 6, front_delts 5.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 1 / 0 / 1 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper | Legs | 24 | - | - | - |
| Legs | Push | 24 | - | - | - |
| Push | Pull | 24 | - | - | - |
| Pull | Lower | 24 | - | - | - |
| Lower | Upper | 72 | - | - | - |

### bodybuilding, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: Push, pull, legs, twice 6×/week. Structure: `ppl_x2`. Served order: Push A, Pull A, Legs A, Push B, Pull B, Legs B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Push A +6 min, Pull A +10.5 min, Legs A +10.5 min, Legs B +6 min. Sessions past 8 exercises or 25 sets: Pull A.

**1. Push A** (about 66 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

**2. Pull A** (about 71 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |
| 6 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Legs A** (about 71 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |

**4. Push B** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**5. Pull B** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Dumbbell Shrug | traps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |

**6. Legs B** (about 66 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: back 14, quads 13, chest 12, abs 12, calves 11, forearms 10, hamstrings 10, side_delts 8, triceps 8, biceps 8, glutes 8, front_delts 7, traps 7, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 1 / 0 / 0 / 1 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Push A | Pull A | 24 | - | - | - |
| Pull A | Legs A | 24 | - | - | - |
| Legs A | Push B | 24 | - | - | - |
| Push B | Pull B | 24 | - | - | - |
| Pull B | Legs B | 24 | - | - | - |
| Legs B | Push A | 48 | - | - | - |

### bikini, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: Glute Focus 3×/week. Structure: `division_bikini_3`. Served order: Glutes + Hams A + Delts, Upper (Delts + Back), Glutes + Hams B + Abs.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Glutes + Hams A + Delts +14.5 min, Upper (Delts + Back) +37.5 min, Glutes + Hams B + Abs +12 min. Sessions past 8 exercises or 25 sets: Upper (Delts + Back).

**1. Glutes + Hams A + Delts** (about 75 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 3 | 6-10 | 150 |
| 4 | Leg Press | quads | machine | 2 | 3 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |

**2. Upper (Delts + Back)** (about 98 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |

**3. Glutes + Hams B + Abs** (about 72 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Hip Adduction Machine | adductors | isolation | 2 | 4 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: glutes 12, hamstrings 9, side_delts 9, back 8, adductors 7, quads 6, calves 6, rear_delts 6, biceps 5, abs 5, chest 4, triceps 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Glutes + Hams A + Delts | Upper (Delts + Back) | 48 | side_delts | - | Dumbbell Lateral Raise |
| Upper (Delts + Back) | Glutes + Hams B + Abs | 48 | - | - | - |
| Glutes + Hams B + Abs | Glutes + Hams A + Delts | 72 | adductors, calves, glutes, hamstrings | - | Barbell Hip Thrust, Romanian Deadlift (Barbell), Hip Adduction Machine |

### bikini, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: Glute Focus 4×/week. Structure: `division_bikini_4`. Served order: Upper A (Delts + Back), Lower B (Glute + Quad), Upper B (Delts + Arms), Lower A (Glute + Ham).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): abs 83%.
Sessions past the chosen length by more than 5 minutes at the peak: Lower B (Glute + Quad) +8.5 min. Sessions past 8 exercises or 25 sets: none.

**1. Upper A (Delts + Back)** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**2. Lower B (Glute + Quad)** (about 69 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Back Squat | quads | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Leg Press | quads | machine | 2 | 3 | 8-15 | 90 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**3. Upper B (Delts + Arms)** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**4. Lower A (Glute + Ham)** (about 65 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 4 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: glutes 12, side_delts 11, back 10, hamstrings 9, abs 8, adductors 7, quads 6, calves 6, rear_delts 5, biceps 5, chest 4, triceps 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A (Delts + Back) | Lower B (Glute + Quad) | 24 | abs | - | - |
| Lower B (Glute + Quad) | Upper B (Delts + Arms) | 48 | abs | - | - |
| Upper B (Delts + Arms) | Lower A (Glute + Ham) | 24 | abs | - | - |
| Lower A (Glute + Ham) | Upper A (Delts + Back) | 72 | abs | - | - |

### bikini, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: Glute Focus 5×/week. Structure: `division_bikini_5`. Served order: Glutes + Quads, Upper B (Delts + Arms), Glutes + Hams, Upper A (Delts + Back), Glutes (Pump) + Abs.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): hamstrings 66%, glutes 66%, adductors 78%, abs 83%.
Sessions past the chosen length by more than 5 minutes at the peak: none. Sessions past 8 exercises or 25 sets: none.

**1. Glutes + Quads** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Barbell Back Squat | quads | heavy_compound | 2 | 3 | 6-10 | 180 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 120 |
| 4 | Leg Press | quads | machine | 2 | 3 | 8-15 | 120 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Upper B (Delts + Arms)** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 75 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**3. Glutes + Hams** (about 62 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 180 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 120 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 5 | 10-20 | 75 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |

**4. Upper A (Delts + Back)** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**5. Glutes (Pump) + Abs** (about 62 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 180 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 120 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 5 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: glutes 16, hamstrings 13, back 10, adductors 10, abs 9, side_delts 9, quads 6, calves 6, rear_delts 5, biceps 5, triceps 4, chest 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Glutes + Quads | Upper B (Delts + Arms) | 24 | abs | - | - |
| Upper B (Delts + Arms) | Glutes + Hams | 24 | - | - | - |
| Glutes + Hams | Upper A (Delts + Back) | 24 | - | - | - |
| Upper A (Delts + Back) | Glutes (Pump) + Abs | 24 | abs | - | - |
| Glutes (Pump) + Abs | Glutes + Quads | 72 | abs, glutes, hamstrings | adductors | Romanian Deadlift (Barbell), Machine Hip Thrust, Hanging Knee Raise |

### bikini, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: Glute Focus 6×/week. Structure: `division_bikini_6`. Served order: Glutes + Quads, Upper B (Delts + Arms), Glutes (Pump), Upper A (Delts + Back), Glutes + Hams, Core + Delts.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 66%, hamstrings 78%, calves 83%, abs 83%, rear_delts 86%.
Sessions past the chosen length by more than 5 minutes at the peak: none. Sessions past 8 exercises or 25 sets: none.

**1. Glutes + Quads** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Barbell Back Squat | quads | heavy_compound | 2 | 3 | 6-10 | 180 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 120 |
| 4 | Leg Press | quads | machine | 2 | 3 | 8-15 | 120 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Upper B (Delts + Arms)** (about 59 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 75 |

**3. Glutes (Pump)** (about 41 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |
| 3 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**4. Upper A (Delts + Back)** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**5. Glutes + Hams** (about 62 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 180 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 120 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 5 | 10-20 | 75 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 2 | 10-20 | 75 |

**6. Core + Delts** (about 46 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 2 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

Weekly direct sets at the peak week: glutes 15, side_delts 12, rear_delts 12, hamstrings 11, back 10, abs 8, adductors 8, calves 7, quads 6, biceps 5, triceps 4, chest 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 0 / 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Glutes + Quads | Upper B (Delts + Arms) | 24 | - | - | - |
| Upper B (Delts + Arms) | Glutes (Pump) | 24 | - | - | - |
| Glutes (Pump) | Upper A (Delts + Back) | 24 | abs | - | Cable Crunch |
| Upper A (Delts + Back) | Glutes + Hams | 24 | - | - | - |
| Glutes + Hams | Core + Delts | 24 | calves | - | Standing Calf Raise (Machine) |
| Core + Delts | Glutes + Quads | 48 | abs, calves | - | Hanging Knee Raise |

### wellness, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: Lower Focus 3×/week. Structure: `division_wellness_3`. Served order: Glutes + Hams, Upper, Quads + Glutes + Abs.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 88%.
Sessions past the chosen length by more than 5 minutes at the peak: Glutes + Hams +21 min, Upper +37.5 min, Quads + Glutes + Abs +19 min. Sessions past 8 exercises or 25 sets: Glutes + Hams, Upper, Quads + Glutes + Abs.

**1. Glutes + Hams** (about 81 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |

**2. Upper** (about 98 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 2 | 6-10 | 150 |
| 2 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 2 | 10-20 | 60 |

**3. Quads + Glutes + Abs** (about 79 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 90 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: glutes 13, hamstrings 10, quads 10, calves 8, back 8, adductors 6, triceps 6, side_delts 6, rear_delts 6, biceps 6, abs 6, chest 2.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Glutes + Hams | Upper | 48 | - | - | - |
| Upper | Quads + Glutes + Abs | 48 | - | - | - |
| Quads + Glutes + Abs | Glutes + Hams | 72 | adductors, calves, glutes, hamstrings, quads | - | Barbell Hip Thrust, Romanian Deadlift (Barbell), Machine Hip Thrust, Hip Adduction Machine, Seated Calf Raise |

### wellness, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: Lower Focus 4×/week. Structure: `division_wellness_4`. Served order: Lower B (Quad + Glute), Upper A, Lower A (Glute + Ham), Upper B + Abs.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): calves 82%, glutes 88%.
Sessions past the chosen length by more than 5 minutes at the peak: Lower A (Glute + Ham) +16 min, Upper A +14.5 min, Lower B (Quad + Glute) +10 min. Sessions past 8 exercises or 25 sets: Upper A.

**1. Lower B (Quad + Glute)** (about 70 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 90 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**2. Upper A** (about 75 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 2 | 6-10 | 150 |
| 2 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 2 | 10-20 | 60 |

**3. Lower A (Glute + Ham)** (about 76 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |

**4. Upper B + Abs** (about 64 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: glutes 13, side_delts 11, hamstrings 10, quads 10, back 10, calves 8, adductors 6, abs 6, triceps 6, biceps 6, rear_delts 5, chest 2.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Lower B (Quad + Glute) | Upper A | 24 | - | - | - |
| Upper A | Lower A (Glute + Ham) | 48 | - | - | - |
| Lower A (Glute + Ham) | Upper B + Abs | 24 | calves | - | Standing Calf Raise (Machine) |
| Upper B + Abs | Lower B (Quad + Glute) | 72 | abs, calves | - | - |

### wellness, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: Lower Focus 5×/week. Structure: `division_wellness_5`. Served order: Hams + Glutes, Upper A, Quads, Upper B, Glutes.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 69%, adductors 71%, abs 83%, back 87%, hamstrings 88%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A +16.5 min. Sessions past 8 exercises or 25 sets: Upper A.

**1. Hams + Glutes** (about 61 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 3 | Leg Press | quads | machine | 2 | 4 | 8-15 | 120 |
| 4 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Upper A** (about 77 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 2 | 6-10 | 150 |
| 2 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 2 | 10-20 | 60 |

**3. Quads** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 120 |
| 3 | Hip Adduction Machine | adductors | isolation | 2 | 4 | 10-20 | 75 |
| 4 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 75 |

**4. Upper B** (about 61 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**5. Glutes** (about 61 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 3 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Hip Adduction Machine | adductors | isolation | 2 | 5 | 10-20 | 75 |
| 5 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

Weekly direct sets at the peak week: glutes 12, back 12, hamstrings 11, quads 11, side_delts 11, adductors 9, calves 8, abs 6, triceps 6, rear_delts 6, biceps 6, chest 2.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Hams + Glutes | Upper A | 24 | - | - | - |
| Upper A | Quads | 24 | - | - | - |
| Quads | Upper B | 24 | - | - | - |
| Upper B | Glutes | 24 | abs | - | Cable Crunch |
| Glutes | Hams + Glutes | 72 | abs, glutes, hamstrings | - | Barbell Hip Thrust, Romanian Deadlift (Barbell) |

### wellness, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: Lower Focus 6×/week. Structure: `division_wellness_6`. Served order: Glutes, Upper A, Hams + Glutes, Quads, Upper B, Quads + Glutes (Pump).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 47%, quads 79%, hamstrings 81%, calves 82%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A +16.5 min. Sessions past 8 exercises or 25 sets: Upper A.

**1. Glutes** (about 41 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |
| 3 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Upper A** (about 77 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 2 | 6-10 | 150 |
| 2 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 2 | 10-20 | 60 |

**3. Hams + Glutes** (about 51 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 2 | 6-10 | 180 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 3 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**4. Quads** (about 52 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 120 |
| 3 | Hip Adduction Machine | adductors | isolation | 2 | 5 | 10-20 | 75 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 2 | 10-20 | 75 |

**5. Upper B** (about 61 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**6. Quads + Glutes (Pump)** (about 42 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 120 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 120 |
| 3 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: hamstrings 13, glutes 12, back 12, side_delts 11, quads 10, adductors 8, calves 8, abs 7, triceps 6, rear_delts 6, biceps 6, chest 2.
Muscles below the category's direct floor: none. Sessions with lower-body work: 4. Overhead presses per session: 0 / 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Glutes | Upper A | 24 | - | - | - |
| Upper A | Hams + Glutes | 24 | - | - | - |
| Hams + Glutes | Quads | 24 | calves, glutes | - | - |
| Quads | Upper B | 24 | - | - | - |
| Upper B | Quads + Glutes (Pump) | 24 | - | - | - |
| Quads + Glutes (Pump) | Glutes | 48 | glutes, hamstrings | - | Seated Leg Curl |

### figure, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 3×/week. Structure: `division_figure_3`. Served order: Upper B + Legs, Legs + Glutes, Shoulders + Back.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 71%, hamstrings 78%, adductors 78%.
Sessions past the chosen length by more than 5 minutes at the peak: Shoulders + Back +41 min, Legs + Glutes +28 min, Upper B + Legs +45.5 min. Sessions past 8 exercises or 25 sets: Shoulders + Back, Legs + Glutes, Upper B + Legs.

**1. Upper B + Legs** (about 106 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 5 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |

**2. Legs + Glutes** (about 88 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Shoulders + Back** (about 101 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 11 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, chest 10, quads 10, hamstrings 8, glutes 8, biceps 8, triceps 8, adductors 6, abs 6, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 1.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper B + Legs | Legs + Glutes | 48 | adductors, calves, glutes, hamstrings, quads | - | Romanian Deadlift (Barbell), Hip Adduction Machine, Standing Calf Raise (Machine), Seated Calf Raise |
| Legs + Glutes | Shoulders + Back | 48 | - | - | - |
| Shoulders + Back | Upper B + Legs | 72 | back, biceps, chest, side_delts, triceps | - | Seated Cable Row, Incline Dumbbell Press, Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl, Tricep Pushdown (Rope) |

### figure, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 4×/week. Structure: `division_figure_4`. Served order: Shoulders + Back, Legs + Glutes A, Chest + Arms + Delts, Legs + Glutes B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Shoulders + Back +14.5 min, Legs + Glutes A +19 min, Chest + Arms + Delts +16 min, Legs + Glutes B +8 min. Sessions past 8 exercises or 25 sets: Shoulders + Back, Legs + Glutes A, Chest + Arms + Delts.

**1. Shoulders + Back** (about 75 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

**2. Legs + Glutes A** (about 79 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Chest + Arms + Delts** (about 76 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |

**4. Legs + Glutes B** (about 68 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 3 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 4 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, quads 10, hamstrings 9, biceps 8, triceps 8, glutes 8, chest 8, rear_delts 6, adductors 6, abs 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Shoulders + Back | Legs + Glutes A | 24 | - | - | - |
| Legs + Glutes A | Chest + Arms + Delts | 48 | - | - | - |
| Chest + Arms + Delts | Legs + Glutes B | 24 | - | - | - |
| Legs + Glutes B | Shoulders + Back | 72 | - | - | - |

### figure, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 5×/week. Structure: `division_figure_5`. Served order: Legs, Back + Delts + Biceps, Chest + Triceps + Delts, Legs (Glute), Delts + Back + Arms.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): side_delts 62%, triceps 73%, abs 82%.
Sessions past the chosen length by more than 5 minutes at the peak: Legs +17 min, Legs (Glute) +6 min. Sessions past 8 exercises or 25 sets: Legs.

**1. Legs** (about 77 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**2. Back + Delts + Biceps** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 75 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 75 |

**3. Chest + Triceps + Delts** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**4. Legs (Glute)** (about 66 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 3 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 4 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**5. Delts + Back + Arms** (about 64 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: back 14, calves 11, side_delts 11, quads 10, hamstrings 9, glutes 8, rear_delts 8, biceps 8, chest 8, triceps 8, abs 7, adductors 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Legs | Back + Delts + Biceps | 24 | - | - | - |
| Back + Delts + Biceps | Chest + Triceps + Delts | 24 | side_delts | - | - |
| Chest + Triceps + Delts | Legs (Glute) | 24 | abs | - | - |
| Legs (Glute) | Delts + Back + Arms | 24 | - | - | - |
| Delts + Back + Arms | Legs | 72 | - | - | - |

### figure, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: X-Frame 6×/week. Structure: `division_figure_6`. Served order: Push A, Legs, Pull A, Push B, Legs (Glute), Pull B.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): side_delts 63%, abs 82%.
Sessions past the chosen length by more than 5 minutes at the peak: Legs +17 min, Legs (Glute) +6 min. Sessions past 8 exercises or 25 sets: Legs.

**1. Push A** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |

**2. Legs** (about 77 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**3. Pull A** (about 61 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**4. Push B** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**5. Legs (Glute)** (about 66 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 3 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 4 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**6. Pull B** (about 64 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: chest 16, back 16, side_delts 14, triceps 12, calves 11, quads 10, hamstrings 9, rear_delts 9, biceps 9, glutes 8, abs 7, adductors 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Push A | Legs | 24 | - | - | - |
| Legs | Pull A | 24 | - | - | - |
| Pull A | Push B | 24 | side_delts | - | - |
| Push B | Legs (Glute) | 24 | abs | - | - |
| Legs (Glute) | Pull B | 24 | - | - | - |
| Pull B | Push A | 48 | side_delts | - | Dumbbell Lateral Raise |

### womens_physique, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 3×/week. Structure: `division_womens_physique_3`. Served order: Upper B + Legs, Legs, Upper A.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 71%, hamstrings 78%, adductors 78%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A +50 min, Legs +28 min, Upper B + Legs +52.5 min. Sessions past 8 exercises or 25 sets: Upper A, Legs, Upper B + Legs.

**1. Upper B + Legs** (about 113 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 12 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 13 | Dumbbell Shrug | traps | isolation | 2 | 3 | 10-20 | 60 |

**2. Legs** (about 88 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper A** (about 110 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 11 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 13 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, chest 10, quads 10, hamstrings 8, glutes 8, biceps 8, triceps 8, traps 7, adductors 6, abs 6, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 1.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper B + Legs | Legs | 48 | adductors, calves, glutes, hamstrings, quads | - | Romanian Deadlift (Barbell), Standing Calf Raise (Machine), Seated Calf Raise, Hip Adduction Machine |
| Legs | Upper A | 48 | - | - | - |
| Upper A | Upper B + Legs | 72 | back, biceps, chest, side_delts, traps, triceps | - | Seated Cable Row, Incline Dumbbell Press, Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl, Tricep Pushdown (Rope), Dumbbell Shrug |

### womens_physique, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 4×/week. Structure: `division_womens_physique_4`. Served order: Upper A (Width), Lower A, Upper B (Thickness), Lower B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Width) +26 min, Lower A +19 min, Upper B (Thickness) +28.5 min, Lower B +8 min. Sessions past 8 exercises or 25 sets: Upper A (Width), Lower A, Upper B (Thickness).

**1. Upper A (Width)** (about 86 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |

**2. Lower A** (about 79 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper B (Thickness)** (about 89 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 10 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |

**4. Lower B** (about 68 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, chest 10, quads 10, hamstrings 9, biceps 8, triceps 8, traps 8, glutes 8, rear_delts 6, adductors 6, abs 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A (Width) | Lower A | 24 | - | - | - |
| Lower A | Upper B (Thickness) | 48 | - | - | - |
| Upper B (Thickness) | Lower B | 24 | - | - | - |
| Lower B | Upper A (Width) | 72 | - | - | - |

### womens_physique, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 5×/week. Structure: `division_womens_physique_5`. Served order: Glutes + Arms, Quads + Lower, Chest + Back, Glutes + Hams, Shoulders + Upper Back.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): hamstrings 50%, glutes 55%, chest 71%, adductors 78%, abs 83%, back 87%, triceps 89%.
Sessions past the chosen length by more than 5 minutes at the peak: Glutes + Hams +13.5 min, Chest + Back +7 min, Shoulders + Upper Back +9.5 min. Sessions past 8 exercises or 25 sets: Glutes + Hams.

**1. Glutes + Arms** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 8 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Quads + Lower** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 120 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 2 | 8-15 | 120 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**3. Chest + Back** (about 67 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |

**4. Glutes + Hams** (about 74 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**5. Shoulders + Upper Back** (about 70 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, quads 10, chest 10, triceps 9, glutes 8, biceps 8, hamstrings 8, traps 8, abs 7, adductors 6, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Glutes + Arms | Quads + Lower | 24 | abs, glutes | - | - |
| Quads + Lower | Chest + Back | 24 | - | - | - |
| Chest + Back | Glutes + Hams | 24 | - | - | - |
| Glutes + Hams | Shoulders + Upper Back | 24 | - | - | - |
| Shoulders + Upper Back | Glutes + Arms | 72 | side_delts | biceps | Dumbbell Lateral Raise, Cable Lateral Raise |

### womens_physique, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: V-Taper 6×/week. Structure: `division_womens_physique_6`. Served order: Pull A, Legs, Push A, Pull B, Legs (Glute), Push B.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): side_delts 62%, abs 83%.
Sessions past the chosen length by more than 5 minutes at the peak: Legs +17 min, Legs (Glute) +6 min. Sessions past 8 exercises or 25 sets: Legs.

**1. Pull A** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**2. Legs** (about 77 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**3. Push A** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 4 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 75 |
| 6 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**4. Pull B** (about 61 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 4 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**5. Legs (Glute)** (about 66 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**6. Push B** (about 65 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Dumbbell Shrug | traps | isolation | 2 | 4 | 10-20 | 75 |

Weekly direct sets at the peak week: back 16, chest 16, calves 11, side_delts 10, quads 10, rear_delts 9, biceps 9, hamstrings 9, glutes 8, triceps 8, traps 8, abs 7, adductors 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Pull A | Legs | 24 | - | - | - |
| Legs | Push A | 24 | abs | - | - |
| Push A | Pull B | 24 | side_delts | - | - |
| Pull B | Legs (Glute) | 24 | - | - | - |
| Legs (Glute) | Push B | 24 | - | - | - |
| Push B | Pull A | 48 | side_delts | - | - |

### general, 3 days, 60 min, full_gym, intermediate, focus none

Plan name: Upper, lower, full body 3×/week. Structure: `upper_lower_full`. Served order: Full Body, Lower, Upper.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 71%, hamstrings 78%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper +27 min, Lower +21 min, Full Body +64.5 min. Sessions past 8 exercises or 25 sets: Upper, Lower, Full Body.

**1. Full Body** (about 125 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 13 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 14 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 15 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**2. Lower** (about 81 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper** (about 87 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, abs 11, chest 10, quads 10, hamstrings 8, glutes 8, biceps 8, triceps 8, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 1.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Full Body | Lower | 48 | abs, calves, glutes, hamstrings, quads | - | Romanian Deadlift (Barbell), Standing Calf Raise (Machine), Seated Calf Raise, Cable Crunch, Hanging Knee Raise |
| Lower | Upper | 48 | - | - | - |
| Upper | Full Body | 72 | back, biceps, chest, side_delts, triceps | rear_delts | Incline Dumbbell Press, Seated Cable Row, Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl, Tricep Pushdown (Rope) |

### general, 4 days, 60 min, full_gym, intermediate, focus none

Plan name: Upper and lower, twice 4×/week. Structure: `upper_lower_x2`. Served order: Upper A, Lower A, Upper B, Lower B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A +23 min, Lower A +14 min, Upper B +14 min, Lower B +11 min. Sessions past 8 exercises or 25 sets: Upper A, Upper B.

**1. Upper A** (about 83 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |

**2. Lower A** (about 74 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper B** (about 74 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

**4. Lower B** (about 71 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, abs 11, chest 10, quads 10, hamstrings 9, biceps 8, triceps 8, glutes 8, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A | Lower A | 24 | - | - | - |
| Lower A | Upper B | 48 | - | - | - |
| Upper B | Lower B | 24 | - | - | - |
| Lower B | Upper A | 72 | - | - | - |

### general, 5 days, 60 min, full_gym, intermediate, focus none

Plan name: Push, pull, legs, upper, lower 5×/week. Structure: `ppl_upper_lower`. Served order: Upper, Legs, Pull, Push, Lower.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): abs 83%, back 87%.
Sessions past the chosen length by more than 5 minutes at the peak: Legs +10 min. Sessions past 8 exercises or 25 sets: none.

**1. Upper** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |

**2. Legs** (about 70 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**3. Pull** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 4 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**4. Push** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |

**5. Lower** (about 63 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: chest 12, back 12, side_delts 11, calves 11, quads 10, abs 10, triceps 9, hamstrings 9, biceps 8, glutes 8, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper | Legs | 24 | - | - | - |
| Legs | Pull | 24 | abs | - | Hanging Knee Raise |
| Pull | Push | 24 | - | - | - |
| Push | Lower | 24 | - | - | - |
| Lower | Upper | 72 | - | - | - |

### general, 6 days, 60 min, full_gym, intermediate, focus none

Plan name: Push, pull, legs, twice 6×/week. Structure: `ppl_x2`. Served order: Push A, Pull A, Legs A, Push B, Pull B, Legs B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: none. Sessions past 8 exercises or 25 sets: none.

**1. Push A** (about 63 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**2. Pull A** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**3. Legs A** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |

**4. Push B** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**5. Pull B** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**6. Legs B** (about 65 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 120 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 120 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 75 |
| 5 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: back 16, abs 12, rear_delts 12, biceps 12, quads 12, side_delts 11, calves 11, chest 10, triceps 9, hamstrings 9, glutes 8.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Push A | Pull A | 24 | - | - | - |
| Pull A | Legs A | 24 | - | - | - |
| Legs A | Push B | 24 | - | - | - |
| Push B | Pull B | 24 | - | - | - |
| Pull B | Legs B | 24 | - | - | - |
| Legs B | Push A | 48 | - | - | - |

## C. Variations: equipment, session length, focus, experience, 2 days

### mens_physique, 4 days, 45 min, dumbbells_only, intermediate, focus none

Plan name: V-Taper 4×/week. Structure: `division_mens_physique_4`. Served order: Shoulders + Arms, Upper B (Detail), Legs + Abs, Upper A (Width).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): side_delts 53%, triceps 53%, rear_delts 62%, biceps 62%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Width) +21.8 min, Legs + Abs +26 min, Upper B (Detail) +14.8 min. Sessions past 8 exercises or 25 sets: Upper A (Width), Legs + Abs.

**1. Shoulders + Arms** (about 50 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Shoulder Press | front_delts | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 75 |
| 3 | Dumbbell Rear Delt Fly | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Preacher Curl (Dumbbell) | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Dumbbell Overhead Tricep Extension | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Decline Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Upper B (Detail)** (about 60 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Dumbbell Bench Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 3 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 4 | 10-20 | 60 |
| 5 | Dumbbell Rear Delt Fly | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Dumbbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Dumbbell Skull Crusher | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Seated Dumbbell Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |

**3. Legs + Abs** (about 71 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Goblet Squat | quads | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Bulgarian Split Squat | quads | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Romanian Deadlift (Dumbbell) | hamstrings | mod_compound | 2 | 6 | 8-12 | 120 |
| 4 | Dumbbell Hip Thrust | glutes | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Dumbbell Calf Raise (Standing) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Dumbbell Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Decline Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**4. Upper A (Width)** (about 67 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Chest-Supported Row (Dumbbell) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Dumbbell Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Dumbbell Bench Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Dumbbell Shoulder Press | front_delts | mod_compound | 2 | 2 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 4 | 10-20 | 60 |
| 6 | Dumbbell Rear Delt Fly | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Preacher Curl (Dumbbell) | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Dumbbell Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 10, chest 10, biceps 8, triceps 8, abs 8, calves 8, quads 8, rear_delts 7, front_delts 6, hamstrings 6, glutes 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 1. Overhead presses per session: 1 / 0 / 0 / 1. Sessions that press the front delts (overhead press or a press crediting them): 3, of which back-to-back pairs: 2.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Shoulders + Arms | Upper B (Detail) | 24 | biceps, rear_delts, side_delts, triceps | front_delts | Dumbbell Lateral Raise, Dumbbell Rear Delt Fly |
| Upper B (Detail) | Legs + Abs | 48 | calves | - | Seated Dumbbell Calf Raise |
| Legs + Abs | Upper A (Width) | 24 | - | - | - |
| Upper A (Width) | Shoulders + Arms | 72 | biceps, front_delts, rear_delts, side_delts, triceps | - | Dumbbell Shoulder Press, Dumbbell Lateral Raise, Dumbbell Rear Delt Fly, Preacher Curl (Dumbbell), Dumbbell Overhead Tricep Extension |

### mens_physique, 5 days, 75 min, full_gym, intermediate, focus chest

Plan name: V-Taper 5×/week. Structure: `division_mens_physique_5`. Served order: Arms + Back + Calves, Legs, Shoulders + Chest, Back + Biceps, Chest + Triceps.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): chest 62%, rear_delts 62%, front_delts 77%, calves 83%, triceps 89%.
Sessions past the chosen length by more than 5 minutes at the peak: none. Sessions past 8 exercises or 25 sets: none.

**1. Arms + Back + Calves** (about 74 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 75 |
| 8 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**2. Legs** (about 78 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |

**3. Shoulders + Chest** (about 79 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 4 | 6-10 | 180 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**4. Back + Biceps** (about 64 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |

**5. Chest + Triceps** (about 71 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 4 | 6-10 | 180 |
| 4 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |

Weekly direct sets at the peak week: back 16, chest 16, side_delts 12, biceps 9, triceps 8, calves 8, abs 8, quads 8, front_delts 8, rear_delts 8, hamstrings 6, glutes 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 1. Overhead presses per session: 0 / 0 / 1 / 0 / 1. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Arms + Back + Calves | Legs | 24 | calves | - | Seated Calf Raise |
| Legs | Shoulders + Chest | 24 | - | - | - |
| Shoulders + Chest | Back + Biceps | 24 | rear_delts | - | Face Pull |
| Back + Biceps | Chest + Triceps | 24 | - | - | - |
| Chest + Triceps | Arms + Back + Calves | 72 | abs, triceps | - | Tricep Pushdown (Rope), Cable Crunch |

### bikini, 4 days, 60 min, full_gym, intermediate, focus glutes

Plan name: Glute Focus 4×/week. Structure: `division_bikini_4`. Served order: Upper A (Delts + Back), Lower A (Glute + Ham), Upper B (Delts + Arms), Lower B (Glute + Quad).
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): abs 83%.
Sessions past the chosen length by more than 5 minutes at the peak: Lower B (Glute + Quad) +30 min. Sessions past 8 exercises or 25 sets: Lower B (Glute + Quad).

**1. Upper A (Delts + Back)** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 3 | 8-12 | 120 |
| 4 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**2. Lower A (Glute + Ham)** (about 65 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 3 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 180 |
| 4 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Hip Adduction Machine | adductors | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

**3. Upper B (Delts + Arms)** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Face Pull | rear_delts | isolation | 2 | 2 | 10-20 | 60 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**4. Lower B (Glute + Quad)** (about 90 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 90 |
| 3 | Glute Kickback Machine | glutes | isolation | 2 | 3 | 10-20 | 60 |
| 4 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 5 | Barbell Back Squat | quads | heavy_compound | 2 | 3 | 6-10 | 150 |
| 6 | Leg Press | quads | machine | 2 | 3 | 8-15 | 90 |
| 7 | Hip Adduction Machine | adductors | isolation | 2 | 4 | 10-20 | 60 |
| 8 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Crunch | abs | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: glutes 18, side_delts 11, back 10, hamstrings 9, abs 8, adductors 7, calves 6, quads 6, rear_delts 5, biceps 5, chest 4, triceps 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A (Delts + Back) | Lower A (Glute + Ham) | 24 | abs | - | - |
| Lower A (Glute + Ham) | Upper B (Delts + Arms) | 48 | abs | - | - |
| Upper B (Delts + Arms) | Lower B (Glute + Quad) | 24 | abs | - | - |
| Lower B (Glute + Quad) | Upper A (Delts + Back) | 72 | abs | - | - |

### wellness, 5 days, 75 min, home_gym, intermediate, focus none

Plan name: Lower Focus 5×/week. Structure: `division_wellness_5`. Served order: Glutes, Upper A, Hams + Glutes, Upper B, Quads.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): hamstrings 66%, glutes 71%, abs 83%, back 87%.
Sessions past the chosen length by more than 5 minutes at the peak: none. Sessions past 8 exercises or 25 sets: Upper A.

**1. Glutes** (about 43 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Hip Thrust | glutes | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Romanian Deadlift (Dumbbell) | hamstrings | mod_compound | 2 | 5 | 8-12 | 150 |
| 3 | Decline Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |

**2. Upper A** (about 69 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Chest-Supported Row (Dumbbell) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Dumbbell Bench Press | chest | mod_compound | 2 | 2 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 5 | 10-20 | 75 |
| 4 | Dumbbell Rear Delt Fly | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Preacher Curl (Dumbbell) | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Dumbbell Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Dumbbell Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 8 | Dumbbell Skull Crusher | triceps | isolation | 2 | 3 | 10-20 | 75 |

**3. Hams + Glutes** (about 60 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Hip Thrust | glutes | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Romanian Deadlift (Dumbbell) | hamstrings | mod_compound | 2 | 5 | 8-12 | 150 |
| 3 | Bulgarian Split Squat | quads | mod_compound | 2 | 4 | 8-12 | 150 |
| 4 | Seated Dumbbell Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**4. Upper B** (about 59 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Chest-Supported Row (Dumbbell) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Dumbbell Row | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 5 | 10-20 | 75 |
| 4 | Dumbbell Rear Delt Fly | rear_delts | isolation | 2 | 5 | 10-20 | 75 |
| 5 | Decline Crunch | abs | isolation | 2 | 2 | 10-20 | 75 |

**5. Quads** (about 57 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Dumbbell Glute Bridge | glutes | mod_compound | 2 | 4 | 8-12 | 150 |
| 2 | Goblet Squat | quads | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Bulgarian Split Squat | quads | mod_compound | 2 | 4 | 8-12 | 150 |
| 4 | Dumbbell Calf Raise (Standing) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Seated Dumbbell Calf Raise | calves | isolation | 2 | 2 | 10-20 | 75 |

Weekly direct sets at the peak week: glutes 12, back 12, quads 12, hamstrings 10, side_delts 10, rear_delts 8, calves 8, abs 7, biceps 6, triceps 6, chest 2.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 0 / 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 1, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Glutes | Upper A | 24 | - | - | - |
| Upper A | Hams + Glutes | 24 | - | - | - |
| Hams + Glutes | Upper B | 24 | abs | - | - |
| Upper B | Quads | 24 | - | - | - |
| Quads | Glutes | 72 | glutes | - | - |

### general, 2 days, 60 min, full_gym, intermediate, focus none

Plan name: Full body A and B 2×/week. Structure: `full_body_ab`. Served order: Full Body A, Full Body B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Full Body A +84.5 min, Full Body B +87 min. Sessions past 8 exercises or 25 sets: Full Body A, Full Body B.

**1. Full Body A** (about 145 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 4 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 5 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 6 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 7 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 11 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 13 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 14 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 15 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 16 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 17 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**2. Full Body B** (about 147 min at the peak week; next session follows after 96 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 6 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 7 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 13 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 14 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 15 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 16 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 17 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, abs 11, chest 10, quads 10, hamstrings 9, glutes 8, biceps 8, triceps 8, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 2.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Full Body A | Full Body B | 72 | abs, back, biceps, calves, chest, glutes, hamstrings, quads, side_delts, triceps | - | Romanian Deadlift (Barbell), Incline Dumbbell Press, Lat Pulldown (Wide Grip), Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl, Tricep Pushdown (Rope), Standing Calf Raise (Machine), Seated Calf Raise, Cable Crunch, Hanging Knee Raise |
| Full Body B | Full Body A | 96 | abs, back, biceps, calves, chest, glutes, hamstrings, quads, side_delts, triceps | - | Romanian Deadlift (Barbell), Incline Dumbbell Press, Lat Pulldown (Wide Grip), Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl, Tricep Pushdown (Rope), Standing Calf Raise (Machine), Seated Calf Raise, Cable Crunch, Hanging Knee Raise |

### general, 3 days, 45 min, full_gym, beginner, focus none

Plan name: Upper, lower, full body 3×/week. Structure: `upper_lower_full`. Served order: Full Body, Lower, Upper.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): glutes 71%, hamstrings 78%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper +42 min, Lower +36 min, Full Body +79.5 min. Sessions past 8 exercises or 25 sets: Upper, Lower, Full Body.

**1. Full Body** (about 125 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 5 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 11 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 12 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 13 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 14 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 15 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 60 |

**2. Lower** (about 81 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 3 | 6-10 | 150 |
| 3 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper** (about 87 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 3 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 3 | 8-12 | 120 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, side_delts 11, calves 11, abs 11, chest 10, quads 10, hamstrings 8, glutes 8, biceps 8, triceps 8, rear_delts 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 1.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Full Body | Lower | 48 | abs, calves, glutes, hamstrings, quads | - | Romanian Deadlift (Barbell), Standing Calf Raise (Machine), Seated Calf Raise, Cable Crunch, Hanging Knee Raise |
| Lower | Upper | 48 | - | - | - |
| Upper | Full Body | 72 | back, biceps, chest, side_delts, triceps | rear_delts | Incline Dumbbell Press, Seated Cable Row, Dumbbell Lateral Raise, Cable Lateral Raise, Barbell Curl, Tricep Pushdown (Rope) |

### bodybuilding, 6 days, 90 min, full_gym, intermediate, focus chest + back

Plan name: Upper and lower, three times 6×/week. Structure: `upper_lower_x3`. Served order: Upper A, Lower A, Upper B, Lower B, Upper C, Lower C.
Readiness check passes: **false**. Limited muscles (lowest estimated recovery before a session): chest 64%, back 64%, glutes 79%, biceps 82%, front_delts 89%.
Sessions past the chosen length by more than 5 minutes at the peak: Upper C +14.5 min. Sessions past 8 exercises or 25 sets: Upper A, Upper C.

**1. Upper A** (about 91 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 3 | 4 | 6-10 | 180 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 3 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 180 |
| 6 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Dumbbell Shrug | traps | isolation | 2 | 3 | 10-20 | 60 |

**2. Lower A** (about 70 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 120 |
| 3 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 75 |

**3. Upper B** (about 77 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 150 |
| 3 | Cable Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Dumbbell Shrug | traps | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 75 |

**4. Lower B** (about 78 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 120 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 120 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 75 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

**5. Upper C** (about 105 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Bench Press | chest | heavy_compound | 3 | 4 | 6-10 | 150 |
| 2 | Incline Dumbbell Press | chest | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Lat Pulldown (Wide Grip) | back | mod_compound | 3 | 4 | 8-12 | 120 |
| 4 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 5 | Barbell Overhead Press | front_delts | heavy_compound | 2 | 2 | 6-10 | 150 |
| 6 | Dumbbell Lateral Raise | side_delts | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Lateral Raise | side_delts | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 9 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 10 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |
| 11 | Barbell Wrist Curl | forearms | isolation | 2 | 5 | 10-20 | 60 |

**6. Lower C** (about 79 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 180 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 180 |
| 3 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 75 |
| 4 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 75 |
| 6 | Seated Leg Curl | hamstrings | isolation | 2 | 3 | 10-20 | 75 |
| 7 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 75 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 2 | 10-20 | 75 |

Weekly direct sets at the peak week: chest 20, back 20, calves 17, abs 16, hamstrings 14, quads 14, glutes 12, forearms 10, biceps 8, side_delts 8, triceps 8, rear_delts 6, traps 6, front_delts 4.
Muscles below the category's direct floor: none. Sessions with lower-body work: 3. Overhead presses per session: 1 / 0 / 0 / 0 / 1 / 0. Sessions that press the front delts (overhead press or a press crediting them): 3, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A | Lower A | 24 | - | - | - |
| Lower A | Upper B | 24 | - | - | - |
| Upper B | Lower B | 24 | - | - | - |
| Lower B | Upper C | 24 | - | - | - |
| Upper C | Lower C | 24 | - | - | - |
| Lower C | Upper A | 48 | - | - | - |

### classic_physique, 4 days, 45 min, machines_cables, intermediate, focus none

Plan name: X-Frame 4×/week. Structure: `division_classic_physique_4`. Served order: Upper A (Back + Delt), Legs (Quad), Upper B (Chest + Arm), Legs (Ham).
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Upper A (Back + Delt) +28.5 min, Legs (Quad) +18 min, Upper B (Chest + Arm) +22 min, Legs (Ham) +20 min. Sessions past 8 exercises or 25 sets: Upper A (Back + Delt), Upper B (Chest + Arm).

**1. Upper A (Back + Delt)** (about 74 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Lat Pulldown (Wide Grip) | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 3 | Machine Chest Press | chest | machine | 2 | 4 | 8-15 | 90 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 5 | 10-20 | 60 |
| 5 | Reverse Pec Deck | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Preacher Curl Machine | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Curl | biceps | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |

**2. Legs (Quad)** (about 63 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Smith Machine Romanian Deadlift | hamstrings | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Hack Squat Machine | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 4 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 2 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Seated Leg Curl | hamstrings | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Cable Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Upper B (Chest + Arm)** (about 67 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Seated Cable Row | back | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Machine Chest Press | chest | machine | 2 | 3 | 8-15 | 90 |
| 3 | Incline Machine Press | chest | machine | 2 | 3 | 8-15 | 90 |
| 4 | Cable Lateral Raise | side_delts | isolation | 2 | 5 | 10-20 | 60 |
| 5 | Face Pull | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Cable Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Cable Overhead Tricep Extension | triceps | isolation | 2 | 3 | 10-20 | 60 |
| 8 | Tricep Pushdown (Rope) | triceps | isolation | 2 | 2 | 10-20 | 60 |

**4. Legs (Ham)** (about 65 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Smith Machine Romanian Deadlift | hamstrings | mod_compound | 2 | 4 | 8-12 | 120 |
| 2 | Leg Press | quads | machine | 2 | 4 | 8-15 | 90 |
| 3 | Machine Hip Thrust | glutes | machine | 2 | 3 | 8-15 | 90 |
| 4 | Standing Calf Raise (Machine) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Leg Extension | quads | isolation | 2 | 3 | 10-20 | 60 |
| 7 | Glute Kickback Machine | glutes | isolation | 2 | 2 | 10-20 | 60 |
| 8 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: quads 13, back 12, calves 11, chest 10, side_delts 10, hamstrings 10, glutes 9, biceps 8, triceps 8, rear_delts 6, abs 6.
Muscles below the category's direct floor: none. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Upper A (Back + Delt) | Legs (Quad) | 24 | - | - | - |
| Legs (Quad) | Upper B (Chest + Arm) | 48 | - | - | - |
| Upper B (Chest + Arm) | Legs (Ham) | 24 | - | - | - |
| Legs (Ham) | Upper A (Back + Delt) | 72 | - | - | - |

### figure, 4 days, 60 min, barbell_plates, intermediate, focus none

Plan name: X-Frame 4×/week. Structure: `division_figure_4`. Served order: Shoulders + Back, Legs + Glutes A, Chest + Arms + Delts, Legs + Glutes B.
Readiness check passes: **true**. Limited muscles (lowest estimated recovery before a session): none.
Sessions past the chosen length by more than 5 minutes at the peak: Legs + Glutes A +5.3 min, Chest + Arms + Delts +19.8 min, Legs + Glutes B +10 min. Sessions past 8 exercises or 25 sets: none.

**1. Shoulders + Back** (about 65 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Row (Bent Over) | back | heavy_compound | 2 | 6 | 6-10 | 180 |
| 2 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 180 |
| 3 | Prone Reverse Fly | rear_delts | isolation | 2 | 3 | 10-20 | 75 |
| 4 | EZ Bar Preacher Curl | biceps | isolation | 2 | 3 | 10-20 | 75 |
| 5 | Barbell Curl | biceps | isolation | 2 | 2 | 10-20 | 75 |
| 6 | EZ Bar Skull Crusher | triceps | isolation | 2 | 2 | 10-20 | 75 |

**2. Legs + Glutes A** (about 65 min at the peak week; next session follows after 48 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Hip Thrust | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Standing Calf Raise (Barbell) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 5 | Seated Calf Raise (Barbell) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Decline Crunch | abs | isolation | 2 | 3 | 10-20 | 60 |

**3. Chest + Arms + Delts** (about 80 min at the peak week; next session follows after 24 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Row (Bent Over) | back | heavy_compound | 2 | 6 | 6-10 | 150 |
| 2 | Close-Grip Bench Press | triceps | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 4 | Incline Barbell Bench Press | chest | heavy_compound | 2 | 4 | 6-10 | 150 |
| 5 | Prone Reverse Fly | rear_delts | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Barbell Curl | biceps | isolation | 2 | 3 | 10-20 | 60 |

**4. Legs + Glutes B** (about 70 min at the peak week; next session follows after 72 h in the app's usual layout)

| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |
|---|---|---|---|---|---|---|---|
| 1 | Barbell Glute Bridge | glutes | heavy_compound | 2 | 4 | 6-10 | 150 |
| 2 | Romanian Deadlift (Barbell) | hamstrings | heavy_compound | 2 | 4 | 6-10 | 150 |
| 3 | Barbell Back Squat | quads | heavy_compound | 2 | 3 | 6-10 | 150 |
| 4 | Barbell Lunge | quads | heavy_compound | 2 | 3 | 6-10 | 150 |
| 5 | Standing Calf Raise (Barbell) | calves | isolation | 2 | 3 | 10-20 | 60 |
| 6 | Seated Calf Raise (Barbell) | calves | isolation | 2 | 2 | 10-20 | 60 |
| 7 | Hanging Knee Raise | abs | isolation | 2 | 3 | 10-20 | 60 |

Weekly direct sets at the peak week: back 12, calves 11, triceps 10, quads 10, biceps 8, glutes 8, hamstrings 8, chest 8, rear_delts 6, abs 6.
Muscles below the category's direct floor: side_delts. Sessions with lower-body work: 2. Overhead presses per session: 0 / 0 / 0 / 0. Sessions that press the front delts (overhead press or a press crediting them): 2, of which back-to-back pairs: 0.

Back-to-back sessions (in served order, wrapping to the start):

| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |
|---|---|---|---|---|---|
| Shoulders + Back | Legs + Glutes A | 24 | - | - | - |
| Legs + Glutes A | Chest + Arms + Delts | 48 | - | - | - |
| Chest + Arms + Delts | Legs + Glutes B | 24 | - | - | - |
| Legs + Glutes B | Shoulders + Back | 72 | - | - | - |
