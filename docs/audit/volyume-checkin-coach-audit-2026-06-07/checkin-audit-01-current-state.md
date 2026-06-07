# Check-in and Coach audit, 01: current state

Date: 2026-06-07. Every finding cites a line that was read. Where I could
not verify something, I say so rather than guess.

## Check-in completion tracking

- **Does the check-in record that it has been completed for a week?**
  In the database, yes: `saveWeeklyCheckin` writes one row per week
  (database.js 4032-4089). On the SCREEN, no: `WeeklyCheckInScreen.js`
  never reads back any existing row. Its imports (11-21) do not include
  `getLatestCheckin`, and there is no read of the week's row on mount.
- **On re-entry to a completed week, prefill or blank?** Blank. All form
  state initialises to null/empty (251-276). The only values that get
  pre-set are the freshly DERIVED ones (calsAdherence, trainingPerformance,
  cardioAdherence, stepsSummary) computed live on mount, not the values the
  user previously saved.
- **Where is completed/submitted state stored?** Only in the DB row. The
  screen has no notion of it.
- **What stops an unnecessary re-do?** Nothing specific to "already done
  this week". The gates (wrong_day, too_soon, need_weights) are about day
  and weight-history, not about an existing submission (310-395). On the
  scheduled day with 3+ weigh-ins, the form opens blank every time.

Conclusion: confirmed. Re-entering a completed week shows a blank survey.
A `getLatestCheckin(userId, weekStart.getTime())` read exists in the DB
layer (4091) and is already used by CoachOutputScreen (950); the check-in
screen simply does not call it.

## Calorie adherence section

- **What it shows:** an auto-derived note when 5+ days are logged ("Read
  from your diary: N days logged, average X kcal vs target Y. Tap to
  override.", 630-633) and ALWAYS the three buttons Hit it / Missed it /
  Didn't track (635-643).
- **Loads the target?** Yes, getNutritionTargets in the mount effect (215)
  and again in load() (341).
- **Loads what was logged?** Yes, getRollupsForRange for the week (347),
  but only when a target exists.
- **Calculates average daily kcal?** Yes, in deriveCalsAdherence (96) and
  again for the note's calsMeta.avgKcal (365). Average is over days with
  kcal_total > 0.
- **Derives a verdict?** Yes: within 10 percent of target is `'yes'`, else
  `'no'`, null below 5 logged days (92-99). When derived it pre-selects the
  button (372).
- **Blind buttons with no data?** Below 5 logged days, yes, the note is
  absent and the user picks blind.
- **Where the selected value goes:** saved as `calsAdherence` (433) which
  is `'yes' | 'no' | 'untracked'`. saveWeeklyCheckin writes it raw to
  cals_adherence (4054). The engine reads checkin.calsAdherence (436).

**The mapping defect (confirmed).** The screen and DB use `'yes' / 'no' /
'untracked'`. The engine has three places that expect `'hit' / 'under' /
'over'`:
- adaptive TDEE adherenceFactor (586-588): `=== 'under' ? 0.9 : === 'over'
  ? 1.1 : 1.0`. The screen never sends under/over, so the factor is always
  1.0. The intended adherence correction never applies.
- cut calorie step (628): `calsAdherence === 'hit' ? -150 : -100`. Never
  'hit', so always -100. The larger, adherence-confirmed step is dead.
- what's-working credit (1034): `if (calsAdherence === 'hit')` push "You
  hit your calorie target." Never fires. A user who hit calories is never
  told so.
The gates that use `!== 'untracked'` (407, 566) DO work for yes/no, so the
adjustment still gates correctly; it is the refinements that silently die.

## Training performance section

- **What it shows:** four cards (Beat my targets / Hit as planned /
  Struggled / Performance dropped, 824-853), with a note "Read from your
  sessions: C/P sessions, N PRs" when derived (819-822), pre-selected from
  the derived verdict (371).
- **Loads session data?** Yes: getWeeklySessionStats and getWeeklyPRCount
  in load() (338-342).
- **Shows count, sets, load, PRs?** Only session count and PR count. NOT
  total sets, NOT load volume. deriveTrainingPerformance uses
  completed/planned and prs only (79-86).
- **Compares to last week?** No. planned comes from getWeeklySessionStats,
  which itself averages the prior 4 weeks' COUNTS to estimate planned
  (4133-4138), but the screen does not show or use a load comparison.
- **Derived verdict?** Yes, from session count ratio plus PRs (82-85).
- **Where the value goes:** saved as trainingPerformance (446), raw to
  training_performance (4057). Engine reads it (528) and getPerformanceScore
  maps exceeded/hit/struggled/dropped to a 1-4 score (150-155), which
  drives the autoregulation matrix and the volume signal. This path WORKS.
- **How the coach uses it:** getPerformanceScore (150) combined with
  recovery score in autoregulationMatrix (162) sets volumeDelta and the
  training signal. So the verdict does influence volume. The limitation is
  the verdict's INPUT: session count and PRs, not measured load or volume.

## Steps compliance

- **Coach allocates a step target?** Yes, userProfile.stepsTarget, default
  8000, set at onboarding and changed by coach apply (CoachOutputScreen
  773) and Settings (SettingsCoachingScreen 77).
- **Appears in the check-in?** Yes, gated on hasStepsTarget (281): enabled
  and a target present. Shows the registered weekly average with override
  (660-677) or a manual field (678-697).
- **Weekly compliance derived and shown?** The average IS derived
  (summariseWeekSteps, registered at 4+ logged days). But the check-in does
  NOT show target-vs-actual or a compliance verdict; it shows only the
  average number. The comparison to target happens later, inside the engine
  (716, 1022-1027), not in the check-in UI.
- **Override?** Yes, tap to switch to a manual field prefilled with the
  auto average (663-668).
- **Stored and passed?** Saved as stepsAvg, a number (435-443). Engine
  reads checkin.stepsAvg (442) and uses it for the steps prescription (716)
  and what's-working (1022). This path WORKS.
- **Coach uses step compliance?** Yes: if the user is below 90 percent of
  target the coach holds the target and says hit it first (716-723);
  otherwise it may bump by 1000 within the phase band (724-739).

## Cardio compliance

- **Coach allocates cardio?** Yes, but only as an applied prescription:
  userProfile.cardioPrescription + cardioTarget, written when the user
  applies a cardio card in CoachOutput (802-803). The engine only
  prescribes cardio in a cut, off-target, steps maxed (757).
- **Appears in the check-in?** Yes, gated on hasCardioPrescription (283),
  three buttons Did it / Mostly / Missed it (706-714), prefilled from the
  log via cardioComplianceFromLog (227-234).
- **Compliance derived and shown?** The verdict is derived from the log
  (cardioComplianceFromLog, hit/mostly/missed, 88-95) and pre-selects the
  button. The prescribed vs logged counts are not shown as numbers.
- **Override?** Yes, the buttons are editable.
- **Stored and passed?** Saved as cardioAdherence (444), raw to
  cardio_adherence (4055). **But the engine never reads
  checkin.cardioAdherence.** Confirmed by reading weeklyCoach.js end to
  end: the only cardio inputs are currentCardioTarget, cardioSessionsLogged
  and cardioWeekSummary (389-392), and the CoachOutput caller fills
  cardioSessionsLogged from the log directly (1010-1011, 1052). So the
  user's reported cardio compliance is a DEAD WRITE; the engine recomputes
  compliance from the log inside nextCardioTarget (132).
- **Coach uses cardio compliance?** Yes, but from the log, not the
  check-in: nextCardioTarget escalates on a logged hit and holds on a
  logged miss (134-150).

## Coach data mapping

What saveWeeklyCheckin writes (4047-4078): energy_score, soreness_score,
stress_score, sleep_hours, cals_adherence, steps_adherence, cardio_adherence,
steps_avg, cycle_override, notes, training_performance, joint_pain,
sore_muscles, sleep_quality.

What the engine reads off checkin: energyScore, sorenessScore,
calsAdherence, stepsAdherence (legacy, always null from this screen, 257),
stepsAvg, cycleOverride, sleepHours, trainingPerformance, notes, weekStart.

- **Saved but never read by the engine:** stress_score, cardio_adherence,
  sore_muscles, joint_pain (joint_pain is only folded into the notes
  string at 451, so it reaches the engine as free text, not a field),
  sleep_quality.
- **Decisions that should use check-in data but cannot:**
  - The calorie magnitude/adherence refinements (under/over/hit) die on the
    yes/no vocabulary mismatch (above).
  - The FFM-floor safety gate (669-705) needs recentIntakeAvgKcal and
    recentIntakeDaysLogged. The CoachOutput caller does NOT pass them
    (1014-1055), so the floor can never fire and the adaptive TDEE never
    gets its ffmFloorContext (595-600). The check-in already computes these
    exact values (calsMeta, 364-366) but does not persist the magnitude,
    and the caller does not recompute it.
  - bodyFatPercent, bodyFatSource, sex are also not passed (1014-1055), so
    even if the floor fired it would use defaults.
- **Training performance influences volume?** Yes (confirmed path above).
- **Calorie adherence influences calorie target?** The GATE yes, the
  adherence-sized REFINEMENT no (vocabulary mismatch).
- **Step compliance influences step target?** Yes.
- **Cardio compliance influences cardio?** From the log yes, from the
  check-in field no.

## Train screen notification

- **Files:** scheduler.js scheduleWeeklyCoachReady (320), notificationRoute.js
  (28), the tap is laid in WeeklyCheckInScreen handleSubmit (471-476), the
  destination is CoachOutputScreen.
- **Trigger condition:** recurring weekly Monday 09:00, set once any
  check-in is submitted. It is NOT conditioned on a check-in or output
  existing for the current week. It repeats every Monday until cancelled.
- **Where it navigates:** routeForNotificationType returns CoachOutput with
  NO weekStart (31). At the screen, `const { weekStart } = route.params ??
  {}` is undefined (683).
- **Correct screen?** No. With weekStart undefined:
  - getLatestCheckin(undefined) returns the most recent check-in of ANY
    week (4100-4104), possibly stale.
  - getWeeklySessionStats(undefined) computes weekEnd = undefined + number
    = NaN, so the SQL window matches nothing, completed = 0, planned
    defaults to 3 (4118-4139). Session adherence becomes 0/3 < 0.5.
  - getWeeklyPRCount(undefined) similarly returns 0.
  - weekRangeLabel(undefined) renders an Invalid Date header (1293).
  - The engine then either returns the baseline view (if weeksInPhase < 2
    or fewer than 4 weights) or the adherence view ("Get back to your full
    plan", _buildAdherenceOutput) because session adherence reads as 0.
  Either way the tap lands on a wrong or baseline screen for a user who did
  train and check in this week.
- **Shown when no review exists?** Yes, every Monday regardless.
- **The "Building baseline" screen:** InsufficientDataView (660), title
  "Building your baseline." (667). It is correct as a genuine baseline
  state (weeksInPhase < 2, or fewer than 4 weigh-ins), but it is being
  reached as the destination of the notification tap because weekStart is
  missing, not because the user is truly in baseline.
- **What gates real review vs baseline:** the engine's hasEnoughData,
  weeksInPhase >= 2 and morningWeights.length >= 4 (483). A saved
  coach_outputs row for the week (getLatestCoachOutput) is what the Home
  banner uses to know a review exists (719).

## Performance assessment logic

- **How improvement/stagnation/decline is assessed:** through the
  autoregulation matrix only. Recovery score (energy + soreness) and
  performance score (session adherence + PRs + the trainingPerformance
  verdict) map to a volume delta (137-180). There is no week-over-week
  load-volume trend in the weekly coach.
- **Uses session load week over week?** No. The weekly coach uses session
  COUNT (sessionsCompleted vs planned) and PR count, not tonnage or working
  sets. Load/volume trend analysis lives elsewhere: insightsEngine.js
  (stalled_lift, peaked_lift, under_mev_muscle via calculateWeeklyVolume)
  and CoachReviewScreen, but those are separate surfaces and do not feed
  runWeeklyCoach.
- **Uses PR data?** Yes (getPerformanceScore 151, what's-working 1016).
- **Uses the manual button or the derived data?** The button value
  (trainingPerformance), which is pre-filled from derived session counts.
  So it is "derived then user-confirmable", but the derivation is
  count-based, not load-based.
- **Signals for increase/hold/reduce volume:** autoregulationMatrix (162):
  recovery 4 or (3 and perf 4) deloads; a 3 on either holds; both clean
  pushes. consecutivePoorRecoveryWeeks gates the deload flag (535).
- **Complete, partial, absent?** The recovery-times-performance matrix is
  complete and tested. The performance INPUT is partial: it judges whether
  sessions happened and whether PRs landed, not whether load/volume
  progressed week over week.

## Summary of confirmed defects

1. No completion state or prefill on the check-in screen; re-entry is
   always a blank form. (WeeklyCheckInScreen, no getLatestCheckin read.)
2. Calorie adherence vocabulary mismatch: screen writes yes/no/untracked,
   engine refinements expect hit/under/over. Adherence factor stuck at 1.0,
   cut step stuck at -100, "hit your calorie target" credit never shown.
3. Food intake magnitude (avg kcal, days logged) never reaches the engine
   at the call site, so the FFM-floor safety gate and adaptive-TDEE intake
   context are dead. bodyFatPercent/source/sex also not passed.
4. Cardio adherence is a dead write: saved by the check-in, never read by
   the engine (engine uses the log count instead).
5. The Monday "your plan is ready" notification is a blind weekly recurrence
   routed to CoachOutput with no weekStart, landing on a wrong/baseline
   screen and rendering an Invalid Date header.
6. Training-performance assessment is count-based and PR-based, with no
   week-over-week load/volume trend feeding the weekly coach.

Each is independent. None requires a schema change to fix at minimum (the
columns already exist), though some proposals in 02 add a column or two if
you want persistence of derived values.
