# Campaign 16 — plan generation and bodybuilding programming closeout

Live log. Baseline `31c67b59`. Continuation session resumed from
`6a130d15`. Everything below that says LANDED is on `main` and green;
nothing is sitting on a branch.

## PHASE A — exercise and plan representation (COMPLETE)

| Job | State | Where |
|---|---|---|
| 3 movement/regional coverage | LANDED | `src/lib/exercise/movementFamily.js`, migration v74 |
| 9 canonical exercise identity | LANDED | `src/lib/exercise/canonicalId.js`, `resolvePlanAgainstLibrary` |
| 7 rep/rest/load prescription | LANDED | `src/lib/exercise/prescription.js` |

### Job 3 — what changed and why

FAMILY (are these the same movement?) is now separate from ROLE (does the
plan cover the job?). Back gained `vertical_pull`, `horizontal_lat`,
`upper_mid_row`, `shoulder_extension` plus `spinal_erector` for the hinge
work that was hiding in `lower_lat`. Quads gained `squat_press` vs
`knee_extension`.

Defects corrected, each of which was live in selection:

- straight-arm pulldown and pullover were tagged `vertical_pull`, so a plan
  could report a covered vertical pull with no pulldown or chin-up in it;
- `lower_lat` held the deadlift family and back extensions, could satisfy a
  lat slot, and generated copy telling users a deadlift builds their
  V-taper;
- `sweep` held BOTH knee-forward squats and the leg extension, so quad
  coverage of "both families" was satisfiable by two squats;
- `V-Bar Pulldown` was untagged and defaulted to the back muscle default,
  `horizontal_row`, so a pulldown counted as a row.

Also found: the generated pool and the hardcoded fallback POOL DISAGREED
with each other (Cable High Row, straight-arm pulldown). Which taxonomy a
plan obeyed depended on whether the user's library was thin enough to
trigger the fallback. Both now normalise through one authority at
`buildEffectivePool`.

Two regressions surfaced while landing it, both fixed rather than left:

- the hard-cap trim could drop a muscle's ONLY exercise on the stated
  grounds that it was "still trained on the split's OTHER day(s)" - which
  was assumed, not checked. Figure 5-day with arm weak points delivered
  chest = 0. Now computed across the assembled week.
- the canonicality gate could remove the only remaining exercise able to
  cover a required role, so a second leg session took a redundant squat,
  which cost the time the trim then took from a glute exercise. Coverage
  now falls back past the preference.

Rulings recorded: triceps `pushdown` is `whenVolumePermits` (14+ weekly),
not a hard requirement, because forcing it displaced a whole muscle. The
`Glute-Ham Raise Machine` retag was REVERTED and recorded as contested: it
is the only machine-profile hip-extension hamstring movement in the
library, so reclassifying it starves machines-only users.

### Job 9 — what changed and why

Identity is stamped at generation (`makeEx` carries `exerciseId`), the
fallback pool may only offer names the FULL catalogue has, and the dry run
and commit resolve through ONE function (`resolvePlanAgainstLibrary`). The
preview now returns the RESOLVED plan, so what is previewed is what is
written.

The catalogue gate is on the full catalogue, NOT the intent-filtered
library, deliberately: an excluded exercise still exists, and Campaign 9
requires that slot to be reported so the user chooses rather than silently
refilled. Gating on the filtered library would have swallowed that report.

### Job 7 — what changed and why

`heavy_compound` hypertrophy range 5-9 -> 6-10 (not 8-12; the tiers must
keep expressing how heavy the movement is). One exercise-specific override
only, the deadlift family at 5-8, with its reasoning stated - a
per-exercise rep table would be the micro-targeting the campaign was told
to avoid.

Second defect, worse than the logged one: a plan-level swap changed the
exercise and left the previous exercise's reps, rest AND STARTING WEIGHT on
the row. Load is now always cleared. Reps and rest are recalibrated only
when the row still carries the outgoing tier's default AND the tier
changes, so a user's own tuning is never overwritten.

## PHASE B — generation quality (COMPLETE)

| Job | State | Where |
|---|---|---|
| 5 initial vs rebuild continuity | LANDED | `src/lib/exercise/continuity.js` |
| 8 split/days/session matrix | LANDED | `campaign16.splitMatrix` (20 property tests) |
| 6 volume delivery integrity | LANDED | `src/lib/exercise/volumeAudit.js` + 16 tests |
| 1 dry-run/commit/activation identity | LANDED | `campaign16.canonicalIdentity` + volume suite |

Job 5 matches slots by MUSCLE + MOVEMENT FAMILY, not position, so a rebuild
that changes split/days/length still recognises the slot. The decision is
made by `programmeEpoch.slotVerdict`, not re-implemented. Continuity can
never override an exclusion, resurrect lost equipment, keep an
auto-ineligible exercise, or change a slot's sets/reps/rest. A test caught
a real defect: an incumbent the generator had already placed elsewhere was
being substituted into a second slot, duplicating it in one session.

Job 6 counts volume INDEPENDENTLY (against the catalogue, not the
generation pool) and names anything unresolvable instead of counting it as
zero. All four stages pinned. The block's planned volume is deliberately
NOT asserted equal to delivered sets - it is a per-week ramp - but every
trained muscle must have a real non-zero target.

Job 8 asserts plan QUALITY across experience x days x length x equipment x
division x weak points x recovery. Found no further defects: split suits
days, ceilings hold, equipment is honoured, overruns self-declare,
determinism holds.

Incidental fix: plan activation used `await import()` where the file uses
lazy `require` everywhere else, which made activation untestable.

## ADDITIONAL QUALITY LAWS 1-6 (LANDED)

Folded into the existing decision/reason system per the founder's
instruction, not a separate campaign.

1. **Session vs programme swaps.** LIVE DEFECT: `ActiveWorkoutScreen`
   recorded a mid-workout substitution - on a sheet that says the plan is
   unchanged, usually a busy machine - identically to a permanent plan
   edit. Two busy-machine days reached the >= 2 threshold and the exercise
   was proposed for removal. Swaps now carry `scope`; only `programme`
   counts as negative preference. Unknown (pre-migration) rows are NOT
   counted - under-counting costs one more swap, over-counting deletes
   something the user likes. Local v75, cloud `migrate_137` (NOT applied,
   founder-gated; ship order does not matter for this one).
2. **Replacements start empty.** Load already cleared (job 7); confidence
   cannot transfer because maturity derives from the exercise's own
   exposures.
3. **Evidence maturity.** NONE / EMERGING / ESTABLISHED, a named level
   never a percentage. Personal standing is weighted by maturity with
   canonicality as the baseline it must earn past. An approved default is
   exempt - intent, not evidence.
4. **Fatigue compatibility.** Library `fatigueCost` reaches the pool; a
   session already holding two high-fatigue movements nudges further ones
   behind equally valid alternatives. A nudge, an order of magnitude below
   required coverage, so coverage always wins. Unknown = never penalised.
5. **Session ordering.** LIVE DEFECT: the 5-day balanced split emitted
   Lower, Upper, Lower, Upper, UPPER. Now spreads the more numerous type;
   lower-focus divisions are byte-identical.
6. **KEEP is a decision.** Every KEEP names a positive reason;
   `PERSONAL_FIT_KEEP` added so an established fit is not reported as
   "nothing was wrong".

## Founder amendment (programme epochs) — status

| Item | State |
|---|---|
| Epoch model + verdicts (engine) | LANDED `src/lib/programmeEpoch.js` |
| Required tests 1-16 | LANDED, 39 cases incl. longitudinal A-H |
| Required tests 17-20 (UX copy/notification) | NOT STARTED - needs the screens |
| Wiring epoch verdicts into the real next-block flow | NOT STARTED |
| Recovery-week in-app heads-up | NOT STARTED |
| Next-block review screen (verdict, stays/changes/why) | NOT STARTED |
| Block-complete push via existing category | NOT STARTED |
| Repeat bypasses elective refresh | NOT WIRED (law encoded, not yet enforced at the call site) |

The engine layer is complete and pure: `structureSignature`,
`countEpochBlocks`, `slotVerdict`, `programmeVerdict`, `epochContinues`.
What remains is consuming it in `blockAdvisor` / `buildSeedRangesForNextBlock`
and rendering it.

Key design decisions worth knowing before continuing:

- The structural signature excludes sets, ramps, recovery, rep ranges,
  rest AND the programme database id. Volume changes therefore cannot
  reset the epoch, and a copied plan does not fake a new one.
- `EPOCH_CONTINUITY_SIMILARITY` (0.6) decides only whether the epoch
  counter continues. It is NOT a refresh-eligibility threshold and
  nothing consults it to decide whether an exercise may change.
- Exactly one reason is gated on the 3-block threshold
  (SYSTEMATIC_VARIATION). `isEarlyTrigger()` exports that law so it is
  checkable rather than implicit in the ordering.
- `EPOCH_REVIEW_BLOCKS = 3` is documented in code as a product heuristic,
  explicitly not as a scientific claim.

## Status by job

| Job | State | Where |
|---|---|---|
| 1 dry-run/commit/activation identity | PARTIAL | dry-run vs commit identity PINNED by `campaign16.canonicalIdentity`; activation leg outstanding |
| 2 exercise canonicality | LANDED | `src/lib/exercise/canonicality.js`, wired into `selectExercisesForMuscle` |
| 3 movement/regional coverage | LANDED | `src/lib/exercise/movementFamily.js` + migration v74 |
| 4 remove auto supersets | LANDED | `planEngine` finalise step, seeded-plan copy |
| 5 initial vs rebuild continuity | NOT STARTED | |
| 6 volume delivery integrity | PARTIAL | two real defects found and fixed; dedicated suite outstanding |
| 7 rep/rest/load prescription | LANDED | `src/lib/exercise/prescription.js` |
| 8 split/days/session matrix | NOT STARTED | |
| 9 canonical exercise identity | LANDED | `src/lib/exercise/canonicalId.js`, one resolution seam |
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
