# checkin-audit-01-current-state

Date: 2026-06-07. Answers every Phase 1 question from the actual code.
Citations are file:line read in full this session. Replaces the earlier
draft.

## Overarching finding (read this first)

`weekly_checkins` is written by TWO flows: the weekly check-in
(WeeklyCheckInScreen 349... no, 429-454) and EVERY completed workout
(WorkoutSummaryScreen 349-361). `saveWeeklyCheckin` (4032-4089) upserts the
week's single row and writes every column as `data.X ?? null`, so each
writer NULLs the fields it omits. They target the same row (same local-Monday
week) and the last write wins. They also disagree on scale/vocabulary for
shared columns (soreness 1-5 vs 1-3; training_performance verdict vs
difficulty string "1".."5"; sleep_hours vs sleep_quality). This corrupts the
data every downstream consumer reads and is the root cause of "the check-in
doesn't pick up food calories, steps or training". Every section below must
be read against this.

## CHECK-IN COMPLETION TRACKING

- Records completion for a week? Only as row existence; there is no
  completed/submitted column on weekly_checkins (schema 404-418 + migrations,
  none add one).
- Prefill on re-entry, or blank? Blank. WeeklyCheckInScreen never imports or
  calls getLatestCheckin; state inits null/empty (251-275); only freshly
  derived values pre-select.
- Where completed state is stored? Nowhere beyond the row.
- What prevents an unnecessary re-do? Nothing about "already done". The gates
  (310-395) are day/timing/weight only.

## CALORIE ADHERENCE SECTION

- What it shows: a derived note when 5+ days are logged ("Read from your
  diary: N days, average X kcal vs target Y. Tap to override.", 630-633) and
  ALWAYS three buttons Hit it / Missed it / Didn't track (635-643).
- Loads the target? Yes, getNutritionTargets (215, 341).
- Loads logged data? Yes, getRollupsForRange for the week (347), only when a
  target exists.
- Calculates average daily kcal? Yes (96; calsMeta.avgKcal 365), over days
  with kcal_total>0.
- Derives a verdict? Yes: within 10% = 'yes', else 'no', null below 5 days
  (92-99); pre-selects the button (372).
- Blind buttons with no data? Below 5 logged days, yes.
- Where the value goes: saved as calsAdherence 'yes'/'no'/'untracked' (433),
  written raw to cals_adherence (4054), read by the engine (436). BUT the
  engine and render have branches keyed on 'hit'/'under'/'over' that this
  vocabulary never satisfies (see COACH DATA MAPPING).

## TRAINING PERFORMANCE SECTION

- What it shows: four cards (Beat targets / Hit as planned / Struggled /
  Performance dropped, 824-853) with a note "Read from your sessions: C/P
  sessions, N PRs" when derived (819-822), pre-selected from the derived
  verdict (371).
- Loads session data? Yes, getWeeklySessionStats + getWeeklyPRCount (338-342).
- Shows count/sets/load/PRs? Only session count and PR count. NOT total sets,
  NOT load volume (deriveTrainingPerformance 79-86 uses completed/planned +
  prs).
- Compares to last week? No load/volume comparison. planned is itself an
  average of the prior 4 weeks' COUNTS (4133-4138).
- Derived verdict? Yes, from count ratio + PRs.
- Manual buttons with no data? Buttons exist; derived data backs them when
  there is session data, else manual.
- Where the value goes: saved as trainingPerformance verdict (446), raw to
  training_performance (4057), read by the engine (528).
- How the coach uses it: getPerformanceScore (150-155) maps the verdict to
  1-4, fed to autoregulationMatrix (162) which sets volumeDelta and the
  training signal. This path WORKS for the weekly-check-in verdict. BUT
  WorkoutSummary overwrites training_performance with "1".."5"
  (sessionDifficulty), which getPerformanceScore does not match, so a
  workout write silently neutralises it back to the session-adherence branch.

## STEPS COMPLIANCE

- Coach allocates a step target? Yes, userProfile.stepsTarget (default 8000),
  set at onboarding (ProOnboarding 485), changed by coach apply
  (CoachOutput 773) and Settings.
- Appears in the check-in? Yes, gated on hasStepsTarget (281). Shows the
  registered weekly average with override (660-677) or a manual field
  (678-697).
- Compliance (target vs actual) derived and shown? The average IS derived
  (summariseWeekSteps, registered >=4 days), but the check-in shows only the
  average number, NOT a target-vs-actual verdict. The comparison happens
  inside the engine (716, 1022-1027), not in the UI.
- Stored and passed? Saved as stepsAvg number (435-443), read by the engine
  (442). This path WORKS, except WorkoutSummary nulls steps_avg if it writes
  the row after the check-in.
- Coach uses step compliance? Yes: below 90% of target it holds and says hit
  it first (716-723); otherwise may bump +1000 within the phase band
  (724-739).

## CARDIO COMPLIANCE

- Coach allocates cardio? Yes, but only as an applied prescription
  (userProfile.cardioPrescription + cardioTarget, handleApplyCardio 800-804),
  and only in a cut (engine gating 757).
- Appears in the check-in? Yes, gated on hasCardioPrescription (283); three
  buttons Did it / Mostly / Missed it (706-714), prefilled from the log
  (227-234).
- Compliance derived and shown? Verdict derived from the log
  (cardioComplianceFromLog 88, hit/mostly/missed) and pre-selects the button;
  prescribed-vs-logged counts not shown as numbers.
- Stored and passed? Saved as cardioAdherence (444), raw to cardio_adherence
  (4055), synced (sync/tables/weeklyCheckins 68). BUT the engine never reads
  checkin.cardioAdherence (full weeklyCoach read; confirmed by prior audit
  cardio-qa-03 CI-1). It derives compliance from cardioSessionsLogged off the
  log instead (1010-1011, 1052; weeklyCoach 757-786). So the saved value is a
  dead write.
- Coach uses cardio compliance? Yes, but from the log, not the check-in.

## COACH DATA MAPPING

saveWeeklyCheckin writes (per writer, see system-map table): energy_score,
soreness_score, stress_score, sleep_hours, cals_adherence, steps_adherence,
cardio_adherence, steps_avg, cycle_override, notes, training_performance,
joint_pain, sore_muscles, sleep_quality.

The engine reads off checkin: energyScore, sorenessScore, calsAdherence,
stepsAdherence (legacy, always null from the weekly screen), stepsAvg,
cycleOverride, sleepHours, trainingPerformance, notes.

- Saved but the engine never reads: stress_score, cardio_adherence,
  sore_muscles, sleep_quality, joint_pain (joint_pain reaches the engine only
  folded into the notes string, WeeklyCheckIn 451). cardio_adherence,
  sleep_quality, soreMuscles, stress are read by OTHER surfaces (CoachReview,
  ReadinessCards, blockAdvisor) but not by the weekly coach.
- Decisions that should use check-in data but cannot:
  - Calorie adherence refinements: the engine's adherenceFactor (586-588),
    the -150-vs-100 cut step (628), and the "You hit your calorie target"
    credit (1034) are keyed on 'hit'/'under'/'over'; the screen writes
    'yes'/'no'/'untracked', so they never fire. The CoachOutput render's
    buildOffItems under/over (116-119) and buildFocus over (147-149) are
    dead for the same reason. differentialPaywall.detectDifferentialTrigger
    filters to under/over/hit/untracked (125), so 'yes'/'no' are dropped and
    its 2-of-3 gate cannot fire.
  - FFM-floor safety + adaptive-TDEE intake: the engine accepts
    recentIntakeAvgKcal / recentIntakeDaysLogged / bodyFatPercent /
    bodyFatSource / sex (weeklyCoach 359-360, 595-600, 680-705) but
    CoachOutput.load (1014-1055) never passes them. getRecentIntakeSummary
    (food/db 341) exists ready to supply the first two and is never called.
    So the food-calorie magnitude never reaches the coach and the RED-S floor
    cannot fire.
- Does training performance influence volume? Yes via the verdict path
  (above), when not clobbered by a workout write.
- Does calorie adherence influence the calorie target? The adjustment GATE
  works on yes/no (407, 566); the adherence-sized refinement does not
  (vocabulary).
- Does step compliance influence the step target? Yes.
- Does cardio compliance influence cardio? From the log yes, from the
  check-in field no.

## TRAIN SCREEN NOTIFICATION

- Files: scheduler.scheduleWeeklyCoachReady (320-340), notificationRoute (28-31),
  laid in WeeklyCheckIn.handleSubmit (471-476), consumed by RootNavigator.onTap
  (490-516), destination CoachOutputScreen.
- Trigger to show: recurring weekly Monday 09:00, set once any check-in is
  submitted. NOT conditioned on a check-in or output existing for the week.
- Where it navigates: CoachOutput with NO params (route returns none, onTap
  passes none), so route.params.weekStart is undefined (683).
- Correct screen? No. With weekStart undefined: getLatestCheckin(undefined)
  returns the most recent row of any week; getWeeklySessionStats(undefined)
  builds a NaN window so completed=0/planned=3; getWeeklyPRCount(undefined)=0;
  weekRangeLabel(undefined) is Invalid Date (1293). The engine then returns
  the baseline view (weeksInPhase<2 or <4 weights) or the adherence view
  (session adherence reads 0). So the tap lands on a wrong/baseline screen.
- Shown when no review exists? Yes, every Monday.
- "Building baseline": InsufficientDataView (660-678, title "Building your
  baseline."). Correct as a genuine baseline state (hasEnoughData false,
  weeksInPhase>=2 && weights>=4 at 483), but it is being reached because the
  notification passes no weekStart, not because the user is truly in baseline.
- What gates real review vs baseline: the engine's hasEnoughData (483); a
  saved coach_outputs row (getLatestCoachOutput) is what the Home banner uses
  to know a review exists.

## PERFORMANCE ASSESSMENT LOGIC

- How improvement/stagnation/decline is assessed: only via the autoregulation
  matrix. Recovery score (energy+soreness, 137-144) x performance score
  (session adherence + PRs + the trainingPerformance verdict, 150-156) maps
  to a volume delta (162-180).
- Uses session load week-over-week? No. The weekly coach uses session COUNT
  and PR count, never tonnage or working sets. calculateWeeklyVolume
  (algorithms 172) and calculateTonnage (97) exist and are used by
  insightsEngine and CoachReview, but CoachOutput does not load the week's
  sets or an exerciseMap, so no volume trend reaches the weekly coach.
- Uses PR data? Yes (151, 1016).
- Uses the manual button or derived data? The verdict (pre-filled from
  derived session counts), i.e. derived-then-confirmable, but the derivation
  is count-based, not load-based.
- Signals for increase/hold/reduce: autoregulationMatrix (162):
  recovery 4 or (3 and perf 4) deloads; a 3 on either holds; both clean
  pushes. consecutivePoorRecoveryWeeks gates the deload flag (535).
- Complete/partial/absent: the recovery x performance matrix is complete and
  tested. The performance INPUT is partial: attendance + PRs, not load/volume
  progression.

## Confirmed defect list

D0 (root) Two writers clobber the weekly_checkins row; scale/vocabulary
   conflicts on shared columns.
D1 No completion state / no prefill (no getLatestCheckin in the screen).
D2 Calorie-adherence vocabulary mismatch (yes/no vs hit/under/over) kills
   engine refinements, CoachOutput render branches, and the differential
   paywall gate.
D3 Food intake magnitude + body composition never passed to the coach, so the
   RED-S floor and adaptive-TDEE intake context are dead.
D4 Cardio adherence is a dead write (engine uses the log; prior audit CI-1).
D5 Monday notification reaches CoachOutput with weekStart undefined.
D6 Performance assessment is attendance/PR based, not load/volume based.
