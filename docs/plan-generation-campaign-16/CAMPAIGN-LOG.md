# Campaign 16 — plan generation and bodybuilding programming closeout

Live log. Baseline `31c67b59`. Continuation session resumed from
`6a130d15`.

> **STATUS CORRECTION, 2026-08-14 (founder completion pass).** This log
> twice reported Campaign 16 as delivered while requested PRODUCT behaviour
> was not live. Jobs 10 and 11 were marked LANDED with an engine and a copy
> table but no user-facing surface; Phase C was marked COMPLETE while the
> block-boundary review reached the user as a single sentence and applied no
> exercise change; the campaign was declared CLOSED with three items in the
> amendment table still reading NOT STARTED. Those claims were wrong and are
> corrected below rather than deleted. From this point the standard is the
> founder's: **module exists, helper exists, test passes and doc says landed
> are NOT delivery — the live product path is.** Every status below has been
> re-checked against production code, not against this log.

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

## PHASE C — longitudinal intelligence (ENGINE COMPLETE 2026-08-11, PRODUCT COMPLETE 2026-08-14)

**What was wrong with the earlier COMPLETE.** The epoch engine and
`blockReview` were correct and tested, and the verdict sentence reached the
decision card - but `reviewSections` was computed and discarded, and BOTH
block-boundary buttons called `activatePlanWithBlock` on the same programme
id. Continue With Adjustments therefore changed volume and nothing else: no
exercise the engine judged was ever replaced. Corrected in the completion
pass (see the closure addendum 3 below).


`src/lib/blockReview.js` is the assembly point and the epoch engine's first
production consumer. `getBlockAdvice` builds it on the finished-block
branch (Pro-only, best-effort) and returns `programmeReview`;
`PlansScreen` renders the verdict on the decision card and the
recovery-week heads-up on the recovery card. The block-ready push goes
through the EXISTING `WEEKLY_COACH_READY` category, one fixed identifier,
routed to `PlansTab/Plans`.

Two real defects found while wiring:

- `programmeVerdict` promised in its own comment that "a two-exercise
  change is never a rebuild" and did not enforce it (2/4 slots = 50% churn
  = REBUILD). Now an absolute floor of 3 changed slots, checked before any
  ratio. This closes the `consider_rebuild` mismatch the founder named.
- That ratio reused `EPOCH_CONTINUITY_SIMILARITY`, giving it a second
  meaning its own docs forbid. Churn now has `REBUILD_CHURN_RATIO`.
- `proposeNextBlock` passed plan objects to `countEpochBlocks`, which
  compares SIGNATURES. It matched nothing and reported a zero-block epoch
  for a mature programme, which would have suppressed structural review
  forever.

The routing-truth guard caught a push with no destination.

## PHASE D — explanation (COMPLETE)

`SELECTION_REASON` is emitted BY THE SELECTOR at the moment of choice;
`planRationale.js` only translates, and returns null for an unmapped code
rather than inventing prose. A test pins that no implementation word
reaches the user (it caught one).

`campaign16.longitudinal` runs the named scenarios and found a real defect:
when the generator re-picked the incumbent, continuity short-circuited to
RETAINED **without consulting the verdict**, so an excluded exercise could
survive a rebuild.

## CAMPAIGN CLOSE — gates (SUPERSEDED, see closure addendum 3)

This section declared the campaign closed. It was premature: the amendment
table immediately below it still listed the review screen, the UX tests and
the Repeat enforcement as NOT STARTED, and Jobs 10 and 11 had no surface.
The gates themselves were real; the word CLOSE was not.


- `npm run lint`: clean
- identity invariant: clean
- 13 Campaign 16 suites: 291 passed
- ONE full suite: **887 suites, 11,430 tests, 0 failures** (both known
  flakes passed)

## Founder amendment (programme epochs) — status

| Item | State |
|---|---|
| Epoch model + verdicts (engine) | LANDED `src/lib/programmeEpoch.js` |
| Required tests 1-16 | LANDED, 39 cases incl. longitudinal A-H |
| Required tests 17-20 (UX copy/notification) | LANDED 2026-08-14, `campaign16.liveDelivery.test.js` |
| Wiring epoch verdicts into the real next-block flow | LANDED 2026-08-14, `PlansScreen.openNextBlockReview` / `runBlockActivation` |
| Recovery-week in-app heads-up | LANDED 2026-08-11, `blockAdvisor` + `PlansScreen` |
| Next-block review screen (verdict, stays/changes/why) | LANDED 2026-08-14, the next-block review sheet in `PlansScreen` |
| Block-complete push via existing category | LANDED 2026-08-11, `WEEKLY_COACH_READY` |
| Repeat bypasses elective refresh | LANDED 2026-08-14, enforced twice: `refine: false` at the repeat call site AND `mayRefine` in `runBlockActivation` |

The engine layer is complete and pure: `structureSignature`,
`countEpochBlocks`, `slotVerdict`, `programmeVerdict`, `epochContinues`. It
is now consumed in `blockAdvisor.buildProgrammeReview` and applied by
`PlansScreen.runBlockActivation`.

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
| 1 dry-run/commit/activation identity | LANDED | identity + volume-integrity suites |
| 2 exercise canonicality | LANDED | `src/lib/exercise/canonicality.js`, wired into `selectExercisesForMuscle` |
| 3 movement/regional coverage | LANDED | `src/lib/exercise/movementFamily.js` + migration v74 |
| 4 remove auto supersets | LANDED | `planEngine` finalise step, seeded-plan copy |
| 5 initial vs rebuild continuity | LANDED | `exercise/continuity.js` |
| 6 volume delivery integrity | LANDED (invariant utility by design; the generator enforces the contract) | `exercise/volumeAudit.js` |
| 7 rep/rest/load prescription | LANDED | `src/lib/exercise/prescription.js` |
| 8 split/days/session matrix | LANDED | `campaign16.splitMatrix` |
| 9 canonical exercise identity | LANDED | `src/lib/exercise/canonicalId.js`, one resolution seam |
| 10 structured why-this-plan | LANDED (engine 2026-08-11, **product 2026-08-14**) | `SELECTION_REASON` + `planRationale.js`, persisted via local v76 `routine_exercises.selection_reason`, rendered by `RoutineDetailScreen` |
| 11 explain the rebuild | LANDED (engine 2026-08-11, **product 2026-08-14**) | `buildChangeReceipt`, rendered by `PlanUpdateScreen` and the next-block review sheet |
| 12 product matrix | LANDED | `campaign16.longitudinal` |

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

## CLOSURE ADDENDUM — the two live user-contract failures

### 1. Session duration is now a constraint

BEFORE: a 45-minute request routinely returned 66-78 minute sessions with
an accurate note. 30-minute requests returned 60-78.

AFTER: `src/lib/timeConstraint.js` sees the whole week and works the
founder's ladder in order - redundant coverage, minimum sensible exercise
count, frequency redistributed across AVAILABLE sessions, then
discretionary sets from the lowest-priority muscles. It will not cross a
volume floor: weak points and division-emphasised muscles are untouchable
and no muscle goes below its own MEV. Result is structured (FIT /
CONSTRAINED_BUT_VALID / USER_DECISION_REQUIRED) and classified from the
STAMPED durations after every trim. Tolerance 5 min, documented as a
product heuristic.

45-minute worst session, before -> after: 4d 73 -> reported infeasible with
the sessions named; 5d 70 -> 65; 6d 68 -> 60. Where a four-day upper/lower
carries six muscles at MEV, 45 minutes is genuinely infeasible and the plan
says so rather than silently overrunning.

### 2. Real two-day support

BEFORE: quiz offered 2 days, plan surfaces offered 3-6, engine clamped
2 -> 3. A user could choose two sessions and receive three, untold.

AFTER: 2 days produces exactly 2 sessions, `full_body`, covering chest,
back, delts, quads, hamstrings, arms and calves/abs across the sequence.
No weekday is ever assigned. 1 and 7+ still clamp.

Two defects that had never been reachable before:
- the sole-session protection was a static snapshot, so two sessions both
  read "trained elsewhere" and both dropped the same muscle - a two-day
  machines-only plan lost its glutes entirely. Now a live shared count.
- glutes (landmark MEV 0, fed indirectly by design) are floored to the
  maintenance floor at 2 days, applied LAST because every earlier position
  was undone by the division overlay or the indirect-credit trim.

### Gates

lint clean; identity invariant clean; 14 Campaign 16 suites 316 tests;
ONE full suite: **888 suites, 11,458 tests, 0 failures**.

### Residual

A bodyweight or machines-only two-day physique plan lands one set below
the glute maintenance floor (3 vs 4). It is an equipment reality, the
muscle is still trained, and it is pinned as such rather than hidden.

---

## Closure addendum 2, 2026-08-13: the three founder additions

Folded into the post-handover correction as ordered, not spun out as a
Campaign 16B. Three additions, all landed on main.

### A. Intelligent training availability and onboarding plan-fit guidance

BEFORE: Pro onboarding defaulted `daysPerWeek` to 4 and never required an
answer, then fed that guess to the split, the weekly volume and the calorie
target. It offered 3-6, so the two-day support Campaign 16 had just landed
was unreachable from the wizard. Nothing anywhere told an athlete whether
the time they had could carry the plan they were about to receive, and
`plan.timeConstraint` - the structured result the correction built - was
rendered by no screen at all.

AFTER: `src/lib/planFit.js` answers by RUNNING the generator. It is pure and
deterministic, so asking "what would you build at 3 x 45?" is free and its
answer is exactly what the athlete would get. Four states: room to spare,
fits, fits with lower-priority work started lighter, and cannot be done
without the sessions running long. Every alternative offered is generated
and checked at that schedule before it is offered.

No lookup table and no minutes-per-day rule, because there is no scientific
basis for one, and the matrix proves it: at four sessions the base profile
needs 75 minutes, a competitive athlete 90, and a Bikini competitor fits
inside 60. Same day count, three different answers, all derived from the
athlete's own prescription.

`assessScheduleFit` in planAutoGen.js is the ONE resolver. Onboarding and
Update Your Plan both call it, so the two surfaces cannot disagree about the
same week. It reads the catalogue and the athlete's exercise intent and
writes nothing.

Onboarding now requires an explicit 2-6 selection and assesses fit at the
END of the wizard, after division, weak points and recovery are known -
three of those four inputs are missing at the schedule question, so a
confident answer there would have been fake precision. The panel appears
only when the schedule cannot carry the plan comfortably, decorates every
session length with what it means for THIS athlete, and keeps "start with
what I chose" first-class and honestly worded: where sessions will overrun,
it says how long they will take.

`constraintChoiceCopy` deleted. No screen called it, and its wording ("the
full target") would have failed the plain-English law the moment one did.

### B. Plain English by default

Applied to the Campaign 16 surfaces and pinned by
`campaign16.plainEnglish.test.js`, which calls every copy producer on those
surfaces with every code it accepts and reads what comes out: no banned
term, no leaked SCREAMING_SNAKE reason code, no em dash, no US spelling, no
shame or command voice, no first line longer than a sentence. The engine
stays technical; nothing the athlete reads does.

### C. Division-specific shape and exercise intelligence

Research first. `DIVISION-EVIDENCE-REGISTER.md` quotes the current NPC and
IFBB Pro League criteria verbatim with sources, and reads three primary
papers in full: PMID 34743671 (equal volume, different exercise, different
regional growth), PMID 41379528 (leg extension grows rectus femoris, back
squat grows the distal vastus lateralis, which IS the sweep) and PMID
35438660 (systematic variation on an anatomical construct helps; random
rotation and redundant stimuli hurt). The last is the evidence basis for the
founder's own rule: personal evidence may pick the exercise for a role, but
must not erase the role.

BEFORE: division character was written down in four places - multipliers in
coachingGoals, pool rules and subregion bias in two planEngine tables, split
character in an inline goal list, and the glute ceiling in a fourth. Six of
nine divisions had a bias entry; three had none.

AFTER: `src/lib/division/profile.js` is the one model, all nine divisions,
each carrying its criteria and the register section that quotes them. Roles
are ORDERED, because the criteria are not one role deep. Figure gets back
depth AND width plus the quad sweep its published criteria name in writing
and it never had. Both Bodybuilding divisions and Women's Physique get both
roles of every two-role muscle. Bikini gets the round glute, the tie-in, and
lat width with no waist-thickening work. General invents nothing.

Two live defects found and fixed:
- **A specialisation block suspended the division.** A weak-point or
  strength-size block rewrites the goal to a legacy ID before selection, so
  every division rule keyed off it vanished for the whole block: a Bikini
  athlete on a weak-point block was being given barbell bench press, back
  squat and bent-over rows - the three things her criteria exclude. A phase
  is not a division.
- **The per-session trim did not know about division priorities.** It
  protected structural floors only, so the clock could take its cut out of
  the judged muscle while discretionary work sat untouched earlier in the
  session. Both trims now read the same list, unioned with the division's
  own rather than inferred from an arithmetic side effect.

### Gates

lint clean. New suites: planFit 32, planFitResolver 7, plainEnglish 6,
division 34. ONE full suite: **892 suites, 11,547 tests, 1 failure** -
`src/lib/widgets/__tests__/storage.test.js` "never touches the iOS bridge on
Android", which passes in isolation and fails identically on a clean tree
with this work stashed. Pre-existing cross-suite pollution, unrelated;
mentioned rather than fixed, per the no-drive-by rule.

### Residual, surfaced not parked

At 45 minutes over four days, an extreme squeeze, the judged muscle can give
up marginally more than the plan average once every discretionary entry has
already reached its floor - it is simply the only place left with sets to
give. Protection is an ORDER, not an exemption. Pinned at "keeps at least
75% of its work" rather than hidden behind a softer assertion.

---

## Closure addendum 3, 2026-08-14: the product completion pass

Ordered after this log's completion accounting was found to be untrue twice.
Everything here is a PRODUCT change: an engine that already computed the
right answer, connected to the path a user actually walks.

### The false claims, and what now exists

| Was claimed | What was actually there | What is live now |
|---|---|---|
| Job 10 LANDED | `selectionReason` stamped in memory, dropped by the INSERT, no screen | Local migration **v76** adds `routine_exercises.selection_reason`; `addExerciseToRoutine` writes the CODE; `RoutineDetailScreen` renders `explainSelection(...)` per exercise, falling back to the generic template only for plans saved before this and for manually added moves |
| Job 11 LANDED | `buildChangeReceipt` with no caller; user saw a generic added/dropped list | `PlanUpdateScreen` builds the receipt from the SAME dry-run decisions the commit acts on and renders **What stays / What changes / New in your plan**, each line with its reason |
| Phase C COMPLETE | verdict sentence on a card; both buttons reactivated the same plan | `openNextBlockReview` dry-runs the real generator, shows a review sheet, and `runBlockActivation` rebuilds the programme through `generateAndSavePlan` **with the resolved ledger** when the proposal contains justified exercise changes |
| Review screen NOT STARTED | `reviewSections` computed and discarded | A next-block review sheet showing stays, changes, why, set-target moves, and the verdict in plain English - shown BEFORE anything is written |
| Repeat NOT WIRED | structurally safe, but the promised call-site assertion did not exist | Enforced twice: the repeat route passes `refine: false`, and `runBlockActivation` recomputes `mayRefine` from the seed intent so a repeat cannot refine even if asked |
| Division roles | ranking nudges only; a judged role could vanish silently | `ROLE_IMPORTANCE` (REQUIRED_WHEN_FEASIBLE / HIGH_PRIORITY / OPTIONAL). A required role becomes real coverage when the athlete's own filtered pool can fill it; when it cannot, `plan.divisionCoverage` reports it with a cause, and both Plan Fit and the routine screen say so |

### Design decisions worth knowing

- **No churn for churn's sake.** The refine branch runs only when the dry
  run contains an actual exercise change. All-retained decisions reactivate
  the existing programme exactly as before.
- **History stays true.** A refinement creates a NEW programme and archives
  the old one. Past mesocycles keep pointing at the plan the athlete really
  trained; nothing is mutated in place.
- **SWEEP is never compulsory.** It is an emphasis, not a family, so making
  it required would let two squats pass as two roles - the exact confusion
  job 3 removed. Its absence is reported, never forced.
- **Coverage causes are coarse on purpose.** `not_available` (nothing in the
  athlete's pool can fill it) versus `not_selected` (something could and the
  plan did not). The generator cannot separate time from capacity after the
  fact without guessing, and a guess inside a truthfulness report is worse
  than a coarse fact.

### Dead-helper audit, run before declaring anything

| Helper | Classification |
|---|---|
| `explainSelection`, `buildPlanExplanation` | LIVE (`RoutineDetailScreen`) |
| `buildChangeReceipt`, `receiptHeadline`, `explainReason` | LIVE (`PlanUpdateScreen`, next-block review) |
| `proposeNextBlock`, `verdictCopy`, `recoveryHeadsUp`, `blockReadyNotificationBody` | LIVE (`blockAdvisor`, scheduler) |
| `reviewSections` | still no consumer: the review sheet renders the receipt from the dry run instead, because that is what the commit acts on. Recorded as a residual, not as delivery |
| `fitCopy`, `alternativeCopy`, `keepChoiceCopy`, `assessDurationOptions`, `coverageCopy` | LIVE (onboarding, Update Your Plan) |
| `divisionCoverageLine`, `computeDivisionCoverage` | LIVE (`RoutineDetailScreen`) |
| `volumeAudit` | TEST-ONLY BY DESIGN - an invariant utility; the generator itself enforces the volume contract it checks |
| `isWorkable`, `fillsDivisionRole`, `divisionVolumeBias`, `isDivision`, `DIVISION_KEYS` | accessors used by tests and by the model's own readability; no product behaviour depends on them |
