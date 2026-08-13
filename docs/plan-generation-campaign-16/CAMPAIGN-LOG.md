# Campaign 16 — plan generation and bodybuilding programming closeout

Live log. Baseline `31c67b59`. Everything below that says LANDED is on
`main` and green; nothing is sitting on a branch.

## Status by job

| Job | State | Where |
|---|---|---|
| 1 trace + baseline harness | PARTIAL | trace done, `campaign16.helpers.js` landed; the formal dry-run/commit identity suite is NOT written |
| 2 exercise canonicality | LANDED | `src/lib/exercise/canonicality.js`, wired into `selectExercisesForMuscle` |
| 3 movement/regional coverage | NOT STARTED | current taxonomy traced in full below |
| 4 remove auto supersets | LANDED | `planEngine` finalise step, seeded-plan copy |
| 5 initial vs rebuild continuity | NOT STARTED | |
| 6 volume delivery integrity | PARTIAL | one real defect found and fixed (see below); no dedicated suite |
| 7 rep/rest/load prescription | NOT STARTED | one observation recorded below |
| 8 split/days/session matrix | NOT STARTED | |
| 9 canonical exercise identity | PARTIAL | the silent-drop defect is FIXED for the one live case; the name-matching architecture is unchanged |
| 10 structured why-this-plan | NOT STARTED | |
| 11 explain the rebuild | NOT STARTED | |
| 12 product matrix | NOT STARTED | |

## The baseline, captured before any change

Intermediate, 4 days, full gym, general hypertrophy, 60 min. Real seeded
library (551 exercises), real engine.

```
Upper A (72m)  Barbell Bench Press 3x5-9 | Lat Pulldown (Wide Grip) 5x8-12
               Dumbbell Lateral Raise 4x10-20 | Face Pull 3x10-20
               Barbell Curl 3x10-20 | Close-Grip Bench Press 3x5-9
Lower A (60m)  Barbell Front Squat 4x5-9 | Good Morning (Barbell) 3x5-9
               Barbell Hip Thrust 3x5-9 | Standing Calf Raise (Machine) 3x10-20 [SS]
               Cable Crunch 3x10-20 [SS]
Upper B (74m)  Incline Barbell Bench Press 3x5-9 | Barbell Row (Bent Over) 5x5-9
               Cable Lateral Raise 4x10-20 | Dumbbell Rear Delt Fly 3x10-20
               EZ Bar Curl 3x10-20 | JM Press 3x5-9
Lower B (57m)  Barbell Back Squat 4x5-9 | Nordic Curl 3x10-20 [SS]
               Standing Calf Raise (Barbell) 4x10-20 [SS] | Cable Pull-Through 3x8-12
               Hanging Leg Raise 3x10-20
```

Defects visible in that one plan: four obscure choices (JM Press, Nordic
Curl, Good Morning, Cable Pull-Through), two auto-supersets pairing
exercises across unknown gym stations, and both calf slots on the same
straight-knee pattern with no soleus work.

## The same plan after jobs 2 and 4

```
Upper A  Barbell Bench Press | Lat Pulldown (Wide Grip) | Dumbbell Lateral Raise
         Face Pull | Barbell Curl | Close-Grip Bench Press
Lower A  Barbell Front Squat | Romanian Deadlift | Barbell Hip Thrust
         Standing Calf Raise (Machine) | Cable Crunch
Upper B  Incline Barbell Bench Press | Barbell Row (Bent Over) | Cable Lateral Raise
         Dumbbell Rear Delt Fly | EZ Bar Curl | Smith Machine Close-Grip Press
Lower B  Barbell Back Squat | Lying Leg Curl | Dumbbell Hip Thrust
         Seated Calf Raise | Hanging Leg Raise
```

Every exercise staple or common, no supersets, calves now cover
straight-knee and bent-knee.

## Defect found and fixed on the way (job 6 / job 9 overlap)

The engine's hardcoded fallback POOL carried `Abductor Machine`. No
library entry has that name. The fallback is matched to the library by
NAME at save time, so the entry was generated for the glute-signature
divisions, counted in the plan's weekly volume summary, and then silently
dropped when the plan was written. Bikini and wellness users previewed
three sets of glute work they never received: bikini 3-day showed 14
weekly glute sets and delivered 11.

Corrected to the library's own `Abduction Machine`. A guard now proves no
POOL entry can drift from the library again. This is the concrete shape
of the job 9 defect class, found in the wild rather than theorised.

## Job 3 groundwork: the current back taxonomy, traced

The subregion tags that drive `SUBREGION_REQUIREMENTS.back`:

- `vertical_pull` (17): the pulldown/pull-up family, BUT also `Cable
  Straight-Arm Pulldown` and `Cable Lat Pullover`.
- `horizontal_row` (29): every row, lat-biased and upper-back-biased
  lumped together.
- `lower_lat` (9): actually the deadlift family plus back extensions.
  The label is wrong: this is hip hinge and spinal erector work.
- `face_pull` (1), plus 9 untagged back exercises.

Three real problems for job 3:

1. The shoulder-extension family (straight-arm pulldown, pullover) is
   tagged `vertical_pull`, so it can SATISFY the vertical-pull coverage
   requirement. A plan can believe it has a vertical pull when it has a
   straight-arm pulldown and no pulldown or chin-up at all.
2. `horizontal_row` cannot distinguish a lat-biased row from a
   scapular-retraction upper-back row, so the "pick a non-redundant
   family next" law has nothing to read.
3. `lower_lat` is mislabelled and mixes two unrelated roles.

Observed redundancy in a real generated plan (bikini, 3 days): `Lat
Pulldown (Wide Grip)` and `Lat Pulldown (Close Grip)` both selected, plus
four separate side-delt raises.

## Job 7 observation, not yet acted on

A `general` hypertrophy plan prescribes `3x5-9` for barbell bench,
incline bench and close-grip bench via `REP_RANGES.heavy_compound`. That
is a strength range appearing in a hypertrophy plan. Needs checking
against the intended REP_RANGES contract before anything is changed.

## Founder rulings recorded this campaign

- Curation: Claude rules all 551 tiers, flags the genuinely contested
  ones and holds those at the safer tier until the founder rules. The
  eleven currently held are listed in `CONTESTED` in canonicality.js.
- Default pool: staples first, common as filler, specialist only when
  recognisable options cannot cover the muscle.
