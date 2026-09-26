# Per-muscle recovery, next-workout aware, recovery-sequenced plans -- SPEC

**Authority:** register D201 (founder decision 2026-09-25, verbatim in the
register: "2 but it needs to work as per the next workout. And the workouts
should be planned and built with the recovery in mind too so it flows your
legs are recovered as close as possible to when the next workout is legs and
so on."). Standing law: the coaching engine is deterministic and pure (no AI,
no randomness, no I/O in engine modules); the ED-safety system and the
calorie side are untouched; no new dependency; no schema change is needed.
**Status:** SPEC WRITTEN 2026-09-25, awaiting the founder's "go" (Section 4 of
CLAUDE.md: plan first, wait for go). Nothing is built.

Read lanes PR1 (plan building and sequencing) and PR2 (the next-workout
rule) mapped the machinery; every file:line below is from those maps or the
lead's own reading.

---

## 1. What exists today (the seams this builds into)

- **Recovery block** (`src/components/ReadinessCards.js`): three gauges
  that are seven-day half-life averages of the user's own ratings
  (`src/lib/recoveryEMA.js`: soreness before a session 1-3, fatigue after
  1-5, joint discomfort after 1-3), whole body; per-muscle "Training
  recency" chips that state only "Trained N days ago"
  (`src/lib/trainingRecency.js`, from `getLastTrainedPerMuscle`,
  `database.js:12029`); the weekly check-in row and trend sentence.
- **A prior ruling** (header of `trainingRecency.js`): the previous
  per-muscle model (`muscleRecovery.js`, deleted) banded elapsed hours
  against a fixed window into fatigued/recovering/fresh and read "no data"
  as "Ready"; it was removed because Volyume has no biological recovery
  signal and no surface may present elapsed time as though it were one.
  This spec builds an ESTIMATE from time AND dose AND the user's own
  rating and feedback, always labelled as such, never "Ready" without a
  logged session behind it. Section 8 reconciles the two.
- **Next workout** is session-sequenced (`src/lib/programmePosition.js`
  header: "Position beats calendar"): `resolveProgrammePosition(userId)`
  returns the active block week's required sessions with states
  (`src/lib/blockProgression.js:242-309`, `SESSION_STATE` outstanding /
  completed / skipped_by_user / ended_early) and `nextSession` = the first
  OUTSTANDING session in `routines.position` order. Home reads it
  (`HomeScreen.js:1317-1384`, `loadNextWorkout`), and the user may
  override with `HomeChangeWorkoutSheet` (`selectedWorkoutOverride`, line
  295). Nothing today reads any recovery input when choosing.
- **Rest days are not enforced** (D17, founder: "user trains on the days
  they want and have lives"): the training-day schedule is DERIVED from
  habit (`src/lib/notifications/trainingHabitSchedule.js`,
  `deriveHabitualTrainingWeekdays`, six-week window, two full weeks of
  history minimum) and used only for reminders
  (`@volyume_schedule_v1`, `{ days: [0..6] }`).
- **Plans have an ORDER, never a weekday** (`planEngine.js:1911-1913`:
  "TWO DAYS MEANS TWO WORKOUTS IN THE SEQUENCE, never two named weekdays").
  `generatePlan()` returns `workouts[]` in build order
  (`buildFullBodyWorkouts` / `buildUpperLowerWorkouts` /
  `buildPPLWorkouts` / `buildWeightedUpperLower` / `buildFromMatrix`,
  `planEngine.js:1886-2591`); `planAutoGen.js:1076-1079` persists that
  order as `routines.position`. The only recovery-minded ordering today
  is `buildWeightedUpperLower`'s interleave (2117-2141, "C16 quality law
  5"); PPL and the hand-authored `DIVISION_MATRIX` (2297-2472) have fixed
  orders; "48 to 72 hours between sessions" exists only as copy
  (`planEngine.js:2739`, `seedRoutines.js:231`, `whyThisTemplates.js:174`).
- **Per-session muscle dose**: `allocateExerciseVolume(exercise)`
  (`algorithms.js:237-267`, primary 1.0, each secondary 0.5) is the one
  allocator; `plannedWeeklyVolumeByMuscle(routines)`
  (`planVolumeTargets.js:48-65`) gives a routine's planned sets per
  muscle from `getRoutineExercisesWithDetails` rows (pass one routine for
  one day). Logged sets carry the same allocation via
  `calculateWeeklyVolume`.
- **Landmarks and the recovery rating**: `computeLandmarks(experience,
  recoveryRating, nutritionPhase, age)` (`planEngine.js:127-148`) scales
  `VOLUME_LANDMARKS` (`algorithms.js:25-59`) by `REC_MULT` (poor MEV 1.10
  / MRV 0.80, average 1 / 1, good 0.95 / 1.15). `recoveryRating` is a
  required onboarding answer ("How's your recovery?", `poor | average |
  good`, `ProOnboardingScreen.js:243-247`), one body-wide scalar.
- **Session-start nudge** (`sessionAdjustments.js` ->
  `computeSessionAdjustments`, `algorithms.js:1181-1368`): reads
  `lastTrainedAt`, `trainedWithin72h`, last joint / pump / performance
  and pre-session soreness per muscle and moves at most one set on at
  most two exercises of the CURRENT session; never gates or reorders a
  session.
- **Block week clock**: `getCurrentBlockWeekIndex` (`mesocycle.js:164`)
  is calendar-based (start date + seven-day steps); weeks hold
  `planned_muscle_volume` per muscle per week; routines repeat every
  week. `workouts.started_at` / `ended_at` are the only real dates.

Muscle keys the engine uses (`VOLUME_LANDMARKS`): chest, back,
front_delts, side_delts, rear_delts, biceps, triceps, forearms, quads,
hamstrings, glutes, adductors, calves, abs, traps, neck, tibialis.

---

## 2. Evidence base (written into the module header of the model)

- Goulart et al. 2021, Eur J Sport Sci 21(7):935-943. Five sets of 8-10RM
  squat and leg press to failure: volume load down at 24 h, first-set
  volume still down at 48 h, jump and isometric strength back or above
  baseline at 72 h; soreness up throughout. -> lower-body baseline of
  about 72 h at a hard dose.
- Moran-Navarro et al. 2017, Eur J Appl Physiol. Sets to failure,
  especially high-repetition ones, leave mechanical function reduced up
  to 48 h; sets short of failure recover faster. -> intensity factor from
  the week's RIR target.
- Ferreira et al. 2017, Physiol Behav (bench press, trained men): peak
  torque and the ability to repeat work recover on different clocks; after
  high-volume work, multiple repetitions at best performance were not
  possible within 96 h; perceived fitness recovered at 72 h while torque
  and soreness took 96 h; subjective and objective measures agree poorly
  at the individual level and must be COMBINED, not swapped. -> dose
  factor; ratings as a modifier, never the estimate itself.
- Soares et al. 2015, J Strength Cond Res (highly trained men): elbow
  flexor torque still 8.4% down 24 h after single-joint work, back to
  baseline 24 h after multi-joint work. -> per-muscle baselines differ;
  arms after isolation-heavy sessions need their own baseline.
- Damas et al. 2016, J Physiol: myofibrillar protein synthesis relates to
  hypertrophy only after muscle damage attenuates; damage highest in week
  one of a block. -> a block's first week carries extra fatigue (factor
  in Section 3.2), and the model never claims "adaptation", only
  "recovery of function".
- Schoenfeld, Ogborn, Krieger 2016, Sports Med: each major muscle at least
  twice a week beats once. Schoenfeld, Grgic, Krieger 2019, J Sports Sci:
  with weekly volume equal, frequency matters much less. -> the
  sequencing rule spaces sessions for recovery but never trades a
  muscle's weekly volume for spacing.
- Practitioner consensus (Renaissance Periodization's stimulus-recovery-
  adaptation lengths, Israetel) supplies the per-muscle ordering where the
  literature is silent per muscle: small/high-blood-flow muscles (calves,
  abs, forearms, delts, arms) about 1.5-2.5 days; chest, back, triceps
  about 2-3 days; quads, hamstrings, glutes about 3-4 days. Labelled as
  consensus, not measurement, in the module.

Honesty rule carried into every surface: the output is an ESTIMATE from
time and volume, adjusted by the user's own rating and ratings; it is not a
measurement, and the copy says so wherever a figure appears.

---

## 3. The model: `src/lib/recovery/` (pure, deterministic, no I/O)

### 3.1 Constants (`src/lib/recovery/constants.js`, written by the lead first)

Baseline recovery length at a STANDARD dose (hours of real time from the
end of the session to estimated full recovery of function):

| Muscle | Base hours | Basis |
|---|---|---|
| quads, hamstrings, glutes | 72 | Goulart 2021 (lower body to failure back at 72 h); RP 3-4 days |
| adductors | 60 | between glutes and calves; consensus |
| back (lats/upper back), chest | 60 | multi-joint recovery 24-48 h (Soares 2015) at moderate dose, 48-72 at high (Ferreira 2017); RP 2-3 days |
| triceps, biceps | 48 | single-joint arm work still down at 24 h (Soares 2015); RP 1.5-2.5 days |
| side_delts, front_delts, rear_delts, traps | 48 | consensus |
| forearms, calves, abs, neck, tibialis | 36 | consensus (high blood flow, low damage) |

Reference dose per session: `REFERENCE_SETS = 6` working sets on the
muscle (direct 1.0 plus secondary 0.5 credit, as `allocateExerciseVolume`
counts them). Six is the median per-session target the generator itself
emits (`buildSession`: weekly target divided by sessions, capped at 8 or
12 for a weak point).

Factors (all clamped, all deterministic):

- `doseFactor = clamp(0.7, 1.5, sqrt(setsOnMuscle / REFERENCE_SETS))`
  (half the dose 0.71, double 1.41: diminishing, per the dose dependence
  in Ferreira 2017 and Goulart 2021).
- `ratingFactor`: poor 1.15, average 1.00, good 0.90 (the user's own
  "How's your recovery?" answer; the same spirit as `REC_MULT`).
- `intensityFactor` from the block week's `rir_target`: RIR 0-1 -> 1.15,
  RIR 2 -> 1.00, RIR 3 or more -> 0.90 (Moran-Navarro 2017). Unknown ->
  1.00.
- `firstWeekFactor`: 1.10 for a session in week 1 of a block or the first
  week after a recovery week (Damas 2016). Otherwise 1.00.
- `feedbackFactor` (the user's ratings COMBINED with the estimate,
  Ferreira 2017): pre-session soreness 3/3 reported at the NEXT session,
  or post-session fatigue 4-5, extends the session's length by 1.20;
  joint discomfort 2-3 adds 0.10; none reported leaves 1.00. Never below
  1.00: feedback can lengthen an estimate, never shorten it below the
  time-and-volume baseline.

`T(session, muscle) = baseHours[muscle] x doseFactor x ratingFactor x
intensityFactor x firstWeekFactor x feedbackFactor`, then clamped to
[24 h, 168 h].

### 3.2 Fatigue accumulation and the estimate (`src/lib/recovery/muscleRecoveryModel.js`)

Each completed session contributes, per muscle it loaded, a fatigue unit
`F = setsOnMuscle / REFERENCE_SETS` clamped to [0.25, 2.0], decaying
linearly from the session END (`endedAt ?? startedAt + durationMinutes ??
startedAt + 60 min`) to zero at `T` hours later. Residual at time `t`:

`R(muscle, t) = sum over sessions in the last 14 days of max(0, F_i x (1 - (t - end_i) / T_i))`

`recoveredPercent = clamp(0, 100, round(100 x (1 - R / peak)))` where peak
is the residual the instant the last contributing session ended, so every
session reads 0% as it ends and 100% once its residual clears; the dose
sets how long that takes (T), never the scale of the percent (D201
addendum 7, 2026-09-26: the first build divided by a fixed 1.0, which
showed a 26-set session at 0% for the first half of its recovery). Two
hard sessions inside one recovery window compound: the peak includes the
older session's remaining residual, so the second starts from a deeper
hole and takes longer to clear, which is the honest reading of training a
muscle again before it recovered.

`readyAtMs` = the earliest `t` at which `recoveredPercent >= 90` (the
piecewise-linear residual makes this a closed-form walk over the
sessions' end times, no search). `status`:

- `recovered` (>= 90%), `nearly` (75-89%), `recovering` (< 75%);
- `no_recent_session` when nothing loaded the muscle in the last 14 days:
  shown as "No session in the last 14 days" and treated as 100% for
  planning. (The recency chip's factual "Trained N days ago" stays beside
  the estimate, and "Not logged" stays for a muscle never trained.)

Output shape, per muscle key:

```
{ muscle, recoveredPercent, status, readyAtMs, lastSessionEndMs,
  lastSessionSets, basis: 'time_and_volume' | 'time_volume_and_ratings',
  contributingSessions: [{ workoutId, endMs, sets, hoursT }] }
```

`projectRecovery(map, atMs)` re-evaluates the same residual at a future
instant (no new inputs), for "by your next session".

### 3.3 Session readiness (`src/lib/recovery/sessionReadiness.js`)

Input: a routine's planned sets per muscle (`plannedWeeklyVolumeByMuscle([routine])`)
and the recovery map at an instant. For every muscle with at least 2
planned sets, take its `recoveredPercent`; the routine's readiness is the
MINIMUM over its primary-loaded muscles (`limitingMuscle` named), with a
sets-weighted mean kept for display. Verdict: `ready` (min >= 90),
`nearly` (75-89), `not_yet` (< 75). A muscle with `no_recent_session`
counts as 100.

---

## 4. Reading it against the NEXT WORKOUT

### 4.1 When is "next"?

`nextLikelyTrainingTime(nowMs, habitualWeekdays, typicalStartMinute)`:
the next habitual training weekday at or after now (from
`deriveHabitualTrainingWeekdays`, six-week habit, D17), at the user's
typical start time (median `started_at` minute-of-day over the same
window; default 18:00 local when unknown). With no habit yet (fewer than
two full weeks of history) the projection is "now", and the copy says
"ready now" or "ready by <weekday>" from `readyAtMs` alone.

### 4.2 The recommendation rule (`src/lib/recovery/nextWorkoutRecommendation.js`)

Input: `position.sessions` from `resolveProgrammePosition`, each
routine's planned sets per muscle, the recovery map, the projected time.
Output:

```
{ programmeNext: { routineId }, recommended: { routineId } | null, reason,
  perSession: [{ routineId, state, readinessNow, readinessAtProjected,
                 verdict, limitingMuscle, limitingReadyAtMs }] }
```

Rule (lead, under D17 "advise, never block", and the session-sequenced
design):

1. `programmeNext` is unchanged: the first OUTSTANDING session in
   programme order (`nextOutstandingSession`).
2. `recommended` is set ONLY when `programmeNext`'s verdict at the
   projected time is `not_yet` AND another OUTSTANDING session of the
   same week is `ready` at that time AND does not share
   `programmeNext`'s limiting muscle as one of its own primary-loaded
   muscles. Then `recommended` is the ready session with the highest
   minimum readiness (ties by programme order).
3. Required-session invariants stay exactly as they are: nothing is
   skipped, resolved or reordered in storage; the recommendation is a
   suggestion the user accepts with one tap (it sets the existing
   `selectedWorkoutOverride`), and the week still completes only when
   every required session is resolved.
4. Copy (calm, plain): "Legs is next. Quads are estimated 64% recovered,
   ready by Thursday. Push is ready now." Never "you must", never
   "skip".

### 4.3 Where it shows

- Home's next-session card: one line under the session name, and the
  "Change workout" sheet lists every outstanding session with its verdict
  and limiting muscle.
- The Recovery block on Consistency: a "Next workout" row (Section 6).
- The session-start nudge (`computeSessionAdjustments`) is unchanged; a
  later decision may feed the estimate into it.

---

## 5. Plan sequencing for recovery (`src/lib/recovery/sequenceSessions.js`, called from planEngine)

Goal (founder): each muscle's next session lands as close as possible to
its estimated recovery, given the user's days per week, without imposing
weekdays (D17) and without trading weekly volume for spacing
(Schoenfeld 2019).

Rule, applied ONCE at generation, after `workouts[]` is built and before
`whyThis`:

1. Compute each session's sets per muscle (its exercises through the
   same allocator) and each muscle's `T` at the plan's reference dose
   (Section 3.1, session dose from the plan itself, the user's rating,
   the block's opening RIR).
2. Assume the N sessions are spread evenly over a seven-day week
   (gap = 168 / N hours between consecutive sessions, circular from the
   last session to the first of the next week). No weekday is assumed.
3. Score every permutation of the N sessions (N <= 6, at most 720):
   `penalty = sum over muscles, over each consecutive pair of sessions
   loading that muscle (>= 2 sets), of max(0, T_muscle - gapHours)^2`
   (under-recovered on arrival), plus `0.25 x max(0, gapHours - 2 x
   T_muscle)^2 / 24` (a muscle left far past recovery when a better slot
   existed), plus an adjacency term for two consecutive sessions whose
   primary-loaded muscle sets overlap by more than half (systemic
   overlap; the C16 law generalised).
4. Take the minimum-penalty order; ties resolve to the original order
   (stable), so a split that is already well sequenced is unchanged.
5. `whyThis` gains one sentence naming the spacing actually achieved for
   the longest-recovery muscles: "Legs are placed so the quads and
   hamstrings get about 84 hours before their next session."

Where the generator's order is hand-authored (`DIVISION_MATRIX`), the
scorer may replace it only when its penalty is strictly lower (founder
fork F2; lead recommendation: allow it, the matrix's muscle priorities
are untouched, only the day order moves).

Existing plans are not rewritten. The next regenerate (PlanUpdate) picks
the rule up; a "Re-sequence my plan for recovery" action on Plan detail
is a follow-on decision, not in this build.

---

## 6. Surfaces and copy

- **Recovery block** (`ReadinessCards.js`, under the gauges and their
  caption, as first specified; the 2026-09-26 reorder that put it first
  and hid the dials was withdrawn the same day on the founder's word,
  register D204): the body figure
  (`BodyDiagramHeatmap` with a recovery palette: recovered / nearly /
  recovering / no recent session), a sub-line "Estimated · last 14
  days" that carries "Estimated" for every percent below it, and the
  per-muscle list (`MuscleRecoveryList.js`, D201 addendum 9, 2026-09-26,
  built from the JeFit/Fitbod research): rows grouped under the legend's
  three words in the spec's order (Recovering, Nearly recovered,
  Recovered), each group headed by its band dot, label and count; one
  row is the band dot, the name, the estimated percent in tabular
  figures, a chevron, a full-width bar filled to that percent in the
  band colour, and one muted line "Ready by Thu · Trained 2 days ago";
  tapping a row, or its muscle on the figure, opens the breakdown behind
  the estimate (last session's counted sets and date, sessions and sets
  in the 14-day window, what it is based on), one row open at a time.
  The first build showed one sentence per row ("Quads, estimated 64%
  recovered, ready by Thu. Trained 2 days ago."). The existing recency
  chips fold into these rows (the factual part stays verbatim). One
  caption: "Estimated from the time since each muscle's last session and
  how much it did, adjusted by your recovery answer and your ratings.
  Not a measurement." (Superseded 2026-09-26 by section 14: the caption
  now also names "how your lifts went when you trained each muscle
  again".) A "Next workout" row per Section 4.
- **Home**: the one-line readiness under the next session, and the
  change-workout sheet's verdicts.
- **Plan detail**: the `whyThis` sentence from Section 5.
- Calm mode and an open ED flag: no bodyweight or food is involved, so
  nothing is withheld; the tone rules apply (no shame, no "you must").
- Accessibility: every row's label carries the percent, the word
  "estimated", the ready-by day and the trained-ago fact.

---

## 7. Data, purity and performance

- No schema change. Inputs: completed workouts (last 14 days, with
  `ended_at`, `duration_minutes`, `mesocycle_week_id`, ratings), their
  sets, the exercise map, the block's week rows (`rir_target`, week
  index), the profile's `recoveryRating`, the habit-derived weekdays,
  the plan's routines with exercises. All read through existing
  `database.js` exports plus one additive read if needed (`getCompletedWorkoutsSince`
  with sets, if the current pair of reads is awkward).
- `src/lib/recovery/*.js` are pure; a single loader
  `src/lib/recovery/load.js` (`loadMuscleRecovery(userId, nowMs)`) does
  the I/O and hands the pure functions their inputs, the pattern
  `sessionAdjustments.js` already uses.
- Cost: at most a few hundred sets and a 17-muscle map; the sequencing
  scorer runs once at generation over at most 720 permutations of six
  sessions.

---

## 8. Reconciliation with prior rulings

- `trainingRecency.js`'s header (no elapsed-time-as-recovery) stands for
  the FACTUAL layer, which is kept verbatim. The estimate layer is new,
  different in kind (time AND dose AND the user's rating and ratings),
  and labelled. The header gains a paragraph pointing to
  `src/lib/recovery/` as the one sanctioned estimate, so the two can never
  be confused again. Register: D201 addendum.
- D17 (no enforced rest days): the projection uses habit; the
  recommendation advises; the sequencing assumes even spacing, never
  weekdays.
- Session-sequenced progression (`programmePosition.js`): untouched in
  its truth; the recommendation is a view over it.
- The nudge (`computeSessionAdjustments`): untouched.
- ED-safety, calorie floors, notifications: untouched.

---

## 9. Tests (the contract; written to fail against the old code)

- Model: every baseline in the table; the dose factor's clamp and sqrt;
  each factor; compounding of two sessions inside one window; `readyAtMs`
  closed form; projection; `no_recent_session` after 14 days; the
  [24 h, 168 h] clamp; determinism (same inputs, same output, twice).
- Session readiness: the limiting muscle, the 2-set threshold, the
  verdict bands.
- Next-workout rule: programme order kept when ready; a recommendation
  only under all three conditions of 4.2 step 2; never a resolved
  session; ties by programme order; copy strings.
- Sequencing: 4-day upper/lower stays alternating; 6-day PPL keeps
  P/P/L/P/P/L with legs on the longest gap; a deliberately bad order is
  repaired; the stable tie-break; a DIVISION_MATRIX order replaced only
  when strictly better; `whyThis` sentence present; determinism.
- Surfaces: the Recovery block rows and caption, the body figure palette,
  the Home line and sheet verdicts, accessibility labels; a source guard
  that no recovery surface renders a percent without the word
  "estimated".
- Guards: `trainingRecency.js`'s factual labels unchanged; no import of
  `src/lib/recovery` from any ED-safety module; the model files import
  no I/O.

---

## 10. Lanes and order (two at a time, Section 4 discipline)

0. **Lead, hands-on first**: `src/lib/recovery/constants.js` with the
   evidence header (Section 2) and the factor tables, and the D201
   addendum. Everything else builds on it.
1. **Lane R-A (Sonnet)**: `muscleRecoveryModel.js`, `sessionReadiness.js`
   and their tests (Section 3).
2. **Lane R-B (Sonnet)**: `sequenceSessions.js`, the planEngine hook
   after `workouts[]` is built, the `whyThis` sentence, the
   DIVISION_MATRIX rule, tests (Section 5). Runs beside R-A (disjoint
   files; both read only `constants.js`).
3. **Lane R-C (Sonnet, after R-A lands)**: `load.js`,
   `nextWorkoutRecommendation.js`, `nextLikelyTrainingTime`, the Home
   line and the change-workout sheet verdicts, tests (Section 4).
4. **Lane R-D (Sonnet, after R-A lands, beside R-C)**: the Recovery block
   surface (body figure palette, rows, caption, next-workout row) and
   tests (Section 6).
5. **Review lane (Opus)**: fresh-eyes adversarial review of the whole
   feature against this spec before the founder's device walk.

Each lane lands as its own lead-reviewed commit over a green tree; the
board records every hash; device checklists are delivered in chat.

---

## 11. Founder forks (decide before "go") and lead rulings

- **F1. When the programme's next session is estimated not ready and
  another is ready:** (a, recommended) recommend the other with the
  reason, one tap to accept, programme order unchanged; (b) make the
  ready one the next automatically; (c) show the estimates with no
  recommendation.
- **F2. Hand-authored division day orders:** (a, recommended) let the
  scorer move the day order when strictly better for recovery, muscle
  priorities untouched; (b) leave every division order fixed and apply
  the rule to generated splits only.
- **F3. The figure on the body:** (a, recommended) a percent with the
  word "estimated" and a band colour; (b) band words only.

Lead rulings (D33, best product): the 14-day window; the 90 / 75 bands;
the factor values in Section 3.1 (each traceable to a source or named as
consensus); feedback can only lengthen an estimate; no rewrite of
existing plans; ties keep the original order.

---

## 12. Device checklist (outline; each lane delivers the exact steps)

1. Train legs hard, open Consistency: the body figure shows quads,
   hamstrings and glutes recovering with an estimated percent and a
   ready-by day; chest reads recovered or "no session in the last 14
   days".
2. The next day: the percent has risen; the ready-by day is unchanged.
3. Home: "Legs is next" or the recommendation with its reason when legs
   are not ready and another session is; accepting it switches the
   session; declining leaves programme order.
4. Regenerate a 4-day plan: upper/lower alternate; a 6-day PPL keeps
   legs on the longest gap; Plan detail's why-this names the spacing.
5. Rate a session as very fatiguing: that muscle's ready-by moves later.
6. Calm mode on: everything above unchanged.

---

## 13. Noticed, not in scope

- `buildPlanInputs` (`planAutoGen.js:96-122`) never passes `age`, so
  `computeLandmarks`' age multipliers are always neutral in production
  (PR1). A separate, small fix; not part of this programme.
- `weeklyCoach.js` was not read in depth by PR1; this programme does not
  touch it.

---

## 14. Personal recovery learning (register D210, added 2026-09-26)

**STATUS 2026-09-26: the build described below was WITHDRAWN after its adversarial review (D210 addendum: noisy dips from missed-set counts, false guarantees, misread assisted and timed exercises, untrue copy, cost). Nothing reached main. It is REPLACED by `14-PERSONAL-LEARNING-V2.md` (the rebuild, as built: one recovery speed per person, from the same lift on the same day of the week, calibrated by simulation, shown on the "Your recovery speed" card; D210 addenda 2 and 3). The text below is kept only as the record of what was withdrawn; build nothing from it.**

Founder, 2026-09-26: "We had recovery intelligence that learns people's
recovery and adjusts as it goes along based on performance from a start. Is
that what you've used for the recovery section or have you used rudimentary
numbers?" Sections 2 and 3 built an estimate that never learns. This section
adds the learning; D210 records the ruling and the rejected alternatives.

**14.1 What is learned.** One factor per muscle, `factor`, that takes the
place of `ratingFactor(recoveryRating)` in `recoveryHours` (the
`personalFactor` option). It starts at the recovery answer's factor (poor
1.15, average 1.0, good 0.9) and is bounded to `[PERSONAL_FACTOR_MIN,
PERSONAL_FACTOR_MAX]` = [0.75, 1.40]. Every session length stays clamped to
[24, 168] h.

**14.2 The evidence (`src/lib/recovery/personalRecovery.js`).** For every
completed session B in the last `PERSONAL_WINDOW_DAYS` (84), for each lift
whose PRIMARY muscle is m: its baseline is the most recent earlier session
of the same exercise within `PERSONAL_BASELINE_MAX_GAP_DAYS` (28) that is not
a recovery week, not under an injury limit for m, and trained to the same
RIR target as B (or both outside any plan). The lift DIPPED if B's best
estimated max (`sessionBestE1rm`, trend-eligible sets only) is below
`PERFORMANCE_DIP_RATIO` (0.97) of the baseline's, or B missed more working
sets (failed, or reps below the target's bottom) with no gain past
`E1RM_PROGRESS_MARGIN`; otherwise it HELD. m's outcome in B is DIP when all
its lifts dipped, HELD when none did, none when they disagree; its baseline
is the latest of its lifts' baselines. Skipped: B in a recovery week, B
under an injury limit for m, and B with no session on m in the
`LOOKBACK_DAYS` before it.

**14.3 The check.** The curve of section 3.2 is re-read at the start of B
and of its baseline, every earlier session's length computed with a
candidate factor. Readings rank Recovering < Nearly recovered < Recovered
(a baseline with no recent session on m ranks Recovered). Cost per
exposure (`DISAGREEMENT_COST`): HELD with B two bands below the baseline 1,
one band below 0.5; DIP with B no lower than the baseline 1; else 0. The
estimate is checked on the change it predicts, never on one reading, because
a steady schedule gives the same lifts whether recovery is fast or steadily
partial.

**14.4 The fit.** Candidates: `PERSONAL_FACTOR_GRID` (0.75 to 1.40 in 0.05
steps) plus the start. Total = the exposures' costs +
`PERSONAL_MOVE_COST_PER_TENTH` (1) x |ln(k / start)| / ln(1.1). Lowest total
wins; ties to the candidate nearest the start, then to the longer. Fewer
than `PERSONAL_MIN_EXPOSURES` (3) exposures: the start. Consequences, each
pinned by a test: a steady schedule never moves it; a single session moves
it one step at most; it shortens when lifts hold after gaps it calls too
short, and lengthens when lifts dip after gaps it calls long enough.

**14.5 Wiring.** `load.js` reads `PERSONAL_HISTORY_DAYS` (126: the window,
the baseline gap and the lookback), marks each session's recovery week
(`indexWeeks` `isDeload`), builds the injury-limit exclusions from
`getCapabilityConstraints` through `capability/eligibility.constrainedMusclesAt`
(as `getAdaptiveLandmarkHistory` does), runs the learner and passes its
result to `buildMuscleRecoveryMap` (`personal`), which carries each muscle's
`{ factor, prior, checked }` on its entry. Best-effort: a failed injury read
teaches from every session; a failed learner leaves the map on the recovery
answer alone; neither degrades the map. Home's recommendation reads the same
map. Plan sequencing (section 5) stays on the population prior.

**14.6 On screen.** Each muscle's breakdown (MuscleRecoveryList) adds
"Adjusted to you": "Recovers faster than first estimated · N sessions
compared", "Recovers more slowly than first estimated · N sessions
compared", "No change so far · N sessions compared", or "Not yet, too few
sessions to compare". The caption: "Estimated from the time since each
muscle's last session and how many sets it did, adjusted by your recovery
answer, your ratings and how your lifts went when you trained each muscle
again. Not a measurement."

**14.7 Device checklist additions.**
1. A new account with fewer than three comparable chest sessions: open
   Progress, Recovery, tap Chest: "Adjusted to you: Not yet, too few
   sessions to compare"; every percent reads exactly as before.
2. Over three to four weeks, outside a plan (or inside one plan week),
   alternate: bench, five or six working sets at the same weights, four
   days after the last chest session, then again about 40 hours later.
   Once three or more of the 40-hour sessions have held their lifts,
   Chest's breakdown reads "Recovers faster than first estimated", and 40
   hours after a chest session Chest reads a higher percent than it did
   before. (Fewer pairs, or lifts that dipped, leave "No change so far".)
3. A recovery (deload) week never changes any "Adjusted to you" line.
4. Calm mode on: unchanged (no bodyweight or food is involved).

