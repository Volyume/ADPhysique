# checkin-audit-02-proposals

Date: 2026-06-07. One proposal per issue, each naming exact files and
functions. The weekly coach is a runtime-critical system (CLAUDE.md Rule 5),
so every engine-touching change ships with tests in the same commit (Rule 7),
and changes are additive where possible. Nothing is implemented until each
proposal is confirmed. Replaces the earlier draft.

Decision points are marked DECISION. Where the founder already chose during
the first pass, the choice is noted; the two-writer finding (D0) changes some
of them, so they are re-surfaced.

---

## PROPOSAL 0 (prerequisite) — resolve the two-writer collision (D0)

Everything else sits on top of this. Today `saveWeeklyCheckin`
(database.js 4032-4089) is called by both WeeklyCheckInScreen.handleSubmit
(429-454) and WorkoutSummaryScreen.handleFinish (349-361), and it NULLs every
omitted field. They share columns with different scales.

Two ways to fix. DECISION required: which one.

Option A (separate the two purposes, recommended):
- Stop WorkoutSummaryScreen writing weekly_checkins. Move its per-workout
  recovery feedback (energy, soreness_24h_before, sleep_quality,
  session_difficulty, joint) to where it already partly lives: the `workouts`
  row (it already writes session_difficulty / soreness_24h_before /
  fatigue_level / overall_pump via updateWorkout 336-343). The recovery
  surfaces that currently read these off weekly_checkins
  (ReadinessCards.computeRecoveryTrendInsight, CoachReview avgSleep/avgEnergy)
  switch to reading the per-session feedback off `workouts` (the same source
  `computeRecoveryEMAs` already uses in ReadinessCards 128).
- Result: weekly_checkins becomes single-writer (the weekly check-in only).
  No more clobbering, no scale conflict, the coaching fields are stable.
- Effort: medium. Touches WorkoutSummaryScreen, ReadinessCards, CoachReview.
  Tests for the recovery-trend insight reading workouts.

Option B (make the write preserving, smaller):
- Change saveWeeklyCheckin's UPDATE to COALESCE: keep the existing column
  value when the caller passes null/undefined, only overwrite on a real
  value. Add an explicit clear path for fields the user genuinely blanks.
- Still leaves two writers on one row and the scale/vocabulary conflicts
  (soreness 1-3 vs 1-5; training_performance "3" vs verdict), which then need
  per-field normalisation. So B alone does not fix the soreness scale or the
  training_performance pollution; those need the writers reconciled anyway.

Recommendation: Option A. It removes the conflict at the source; B papers
over it and still needs the scale fixes. DECISION: A or B.

Files: WorkoutSummaryScreen.js, ReadinessCards.js, CoachReviewScreen.js (A);
or database.js saveWeeklyCheckin (B). Tests alongside.

---

## PROPOSAL 1 — completion state and prefill (D1)

After P0 makes the row single-writer:
- WeeklyCheckInScreen: import getLatestCheckin (exists, 4091) and in load()
  (285) read getLatestCheckin(user.id, weekStart.getTime()). If a row exists,
  prefill every field (energyScore, stressScore, sleepHours, sorenessScore,
  soreMuscles split on comma, jointPain, calsAdherence, stepsAvg/override,
  cardioAdherence, trainingPerformance, cycle, notes). Derived defaults only
  fill fields the saved row left empty.
- Show a one-line "checked in this week, editing" state; saveWeeklyCheckin
  already upserts so an edit overwrites cleanly.

DECISION: editable prefilled form (recommended, matches the upsert) vs a
read-only summary with an Edit button.

Files: WeeklyCheckInScreen.js. Test: a saved row prefills on mount.

---

## PROPOSAL 2 — smart calorie adherence (D2 + D3)

- Target: getNutritionTargets(user.id).targetKcal (already loaded).
- Logged data: getRecentIntakeSummary(user.id) (food/db 341), trailing-7-day
  {avgKcal, daysLogged} (founder chose trailing 7 days). The check-in already
  computes an equivalent for display.
- Show: target, logged average, derived verdict (on target within 10%; under;
  significantly under; not logged below 5 days). The override buttons appear
  only to correct the derived verdict.
- Map at the boundary (founder chose this): in CoachOutput.load build the
  engine's calsAdherence from the stored yes/no/untracked plus the intake
  average vs target: yes->'hit'; no->'under' if avg<target else 'over';
  untracked->'untracked'. Pass the mapped value as checkin.calsAdherence so
  the engine's hit/under/over branches (586-588, 628, 1034), the render's
  buildOffItems/buildFocus, and detectDifferentialTrigger all come alive.
  Also map the recentWeeklyHistory entries the same way so the differential
  2-of-3 gate counts them.
- Wire intake into the floor (D3): in CoachOutput.load pass recentIntakeAvgKcal,
  recentIntakeDaysLogged (from getRecentIntakeSummary), and bodyFatPercent /
  bodyFatSource (latest getBodyMetricLog) / sex (getUserBodyProfile) into
  runWeeklyCoach (1014-1055). This activates the RED-S FFM-floor gate
  (680-705) and the adaptive-TDEE ffmFloorContext (595-600).

DECISION: confirm the under/over rule (avg vs target). Files:
CoachOutputScreen.js, WeeklyCheckInScreen.js (display). Tests: mapper unit
test + a coach run where intake below floor holds a cut.

---

## PROPOSAL 3 — smart training performance (D6 input quality)

- Load for the week: getWeeklySessionStats (count, planned), getWeeklyPRCount,
  and NEW: the week's working-set volume and tonnage via getCompletedWorkoutSets
  + an exerciseMap + calculateWeeklyVolume (algorithms 172) / calculateTonnage
  (97), plus last week's equivalent for comparison.
- Derive the verdict from volume/PRs not just attendance: beat = volume up and
  a PR; hit = volume on track and sessions complete; struggled = volume down or
  sessions shortened; dropped = sessions missed significantly. Show the user
  session count, load vs last week, PRs and the derived verdict so the reasoning
  is visible. Keep override.
- Store the verdict (unchanged column) and ensure WorkoutSummary no longer
  writes training_performance (P0 Option A removes that pollution).
- Coach use: the verdict already feeds getPerformanceScore (150-155). The
  load-trend itself feeding the matrix is PROPOSAL 6.

DECISION: the exact volume/PR thresholds for the four verdicts (founder to
set; I will not invent the numbers). Files: WeeklyCheckInScreen.js, a pure
volume-trend helper, tests.

---

## PROPOSAL 4 — steps compliance in check-in (display)

- hasStepsTarget already gates the section (281). When a target exists, show
  the target alongside the derived average and a one-line verdict (on target
  >= target; close >= 90%; below), using the engine's own thresholds
  (1022-1027). Keep tap-to-override.
- No contract change: stepsAvg stays what the engine reads (442). Steps already
  works end to end; this is transparency only.

DECISION: include the verdict line, yes/no. Files: WeeklyCheckInScreen.js.

---

## PROPOSAL 5 — cardio compliance in check-in (D4)

Prior audit cardio-qa-03 CI-1 already flagged this. The founder chose
"override feeds the engine".
- Engine: add an optional input (e.g. cardioSessionsReported, or pass the
  check-in's cardioAdherence verdict) that supersedes the log-derived count
  inside the cardio block (weeklyCoach 757-786, via nextCardioTarget). Additive,
  defaulted so every other caller is unchanged.
- CoachOutput.load: read the week's checkin.cardioAdherence (or the override
  count) and pass it in.
- Check-in: show prescribed sessions vs logged sessions (numbers) with the
  override; store cardioAdherence (already written).
- Also close CI-2 if wanted: pass cardioWeekSummary to cardioRecoveryFlag (the
  engine already computes cardioFlag 799-801; it renders 1379-1384). This is
  already partly wired; confirm it is reaching the user.

DECISION: confirm "override feeds engine" still holds post-restart, and
whether to also wire CI-2 recovery load into the training hold/push. Files:
weeklyCoach.js, CoachOutputScreen.js, WeeklyCheckInScreen.js, tests.

---

## PROPOSAL 6 — performance progression assessment (load-based) (D6)

Founder chose working-set volume as the metric and "the coach is already set
up" (feed the signal into the existing matrix, do not build a new action
layer).
- CoachOutput.load: compute this-week vs last-week total working-set volume
  (sum over muscles from calculateWeeklyVolume) and pass a volume-trend signal
  into runWeeklyCoach.
- Engine: fold the trend into getPerformanceScore (150-156) so the existing
  autoregulationMatrix acts on it (no new threshold->action layer). Recovery
  signals already modify the matrix via getRecoveryScore.
- DECISION still needed: the trend thresholds (what counts as up / flat /
  down) and how many weeks before it shifts the performance score. The
  founder's earlier "flat 2wk hold, down 2wk reduce" answer came through
  garbled; I will restate and confirm before coding. I will not invent the
  numbers.

Files: CoachOutputScreen.js, weeklyCoach.js, a pure helper, full tests. This
is the one genuine design extension; it goes last.

---

## PROPOSAL 7 — Train screen notification fix (D5)

Founder chose "suppress until checked in" plus the screen-level current-week
fallback.
- Screen guard: CoachOutputScreen default weekStart to localWeekStartMs()
  when route.params.weekStart is undefined (683), and guard
  getWeeklySessionStats / getWeeklyPRCount / weekRangeLabel against a missing
  value so a NaN window / Invalid Date can never render.
- Firing: change scheduleWeeklyCoachReady from a recurring weekly trigger to a
  one-off scheduled for the next Monday, laid on each check-in submit. A week
  with no check-in then gets no notification ("suppress until checked in").
- The Home banner already gates correctly on a saved coach_outputs row; no
  change there.

DECISION: confirm one-off-per-check-in firing (recommended implementation of
"suppress until checked in"). Files: scheduler.js, CoachOutputScreen.js,
notificationRoute.js if week-aware routing is wanted. Tests: route test +
screen test that an undefined param resolves to the current week.

---

## PROPOSAL 8 — coach data mapping fix (consolidation)

Make every check-in field either feed a coach decision or be deliberately
display-only.
- calsAdherence: fixed by P2.
- cardioAdherence: fixed by P5.
- recentIntake*: fixed by P2/D3.
- training_performance pollution: fixed by P0 Option A.
- stress_score: founder chose to wire it into the recovery picture. Add it to
  getRecoveryScore / the deload signal in weeklyCoach (additive, tested).
- joint_pain: founder chose to let it hold volume. Promote it from a notes
  string to a structured signal that can hold a volume push (weeklyCoach,
  additive, tested).
- sleep_quality: weekly check-in never sets it; under P0 Option A it becomes a
  per-session (workouts) field. Drop the always-null write from the weekly
  path. CoachReview/ReadinessCards read it from workouts instead.
- soreMuscles: keep as the targeted-recovery display it is (no engine wiring
  unless you ask).

No migration needed for P0-P5, P7, P8 (columns exist). P6 and any decision to
persist a new derived value would add a column and follow the migration
tracking rules (Rule 6) with a supabase/README.md entry.

---

## Suggested order
0 (collision) → 7 (notification) and 2/D3 (calorie + safety floor) → 1
(prefill) → 4 (steps) → 5 (cardio) → 3 (training-perf input) → 6 (load-based
progression, last, with your thresholds) → 8 (mapping cleanup, folded through).

STOP. Awaiting confirmation per proposal, and specifically the P0 decision
(A vs B), before any code.
