# Check-in and Coach audit, 00: system map

Date: 2026-06-07. Branch: main. Author: code-grounded audit, every claim
below is tied to a file and line that was read in full, not inferred.

This document maps the systems the weekly check-in touches. Nothing here
is a proposal. The current-state findings are in 01, proposals in 02.

## Method

Read in full this session: WeeklyCheckInScreen.js (1338 lines),
weeklyCoach.js (1207), the runWeeklyCoach call site in CoachOutputScreen.js
(948-1126) plus its weekStart resolution (683), InsufficientDataView (660)
and render gate (1216), the check-in DB functions in database.js
(saveWeeklyCheckin 4032, getLatestCheckin 4091, getRecentCheckins 4107,
getWeeklySessionStats 4118, getWeeklyPRCount 4183, saveCoachOutput 4403,
getLatestCoachOutput 4447), cardioEngine.js (174), stepsSummary.js (30),
coachApply.js, insightsEngine.js, recoveryEMA.js, notificationRoute.js,
scheduler.js (weekly coach ready, 295-351), and the HomeScreen coach banner
(719-815). Storage of stepsTarget / cardioPrescription / cardioTarget
confirmed by grep across src.

## The pieces

### 1. The check-in screen, `src/screens/WeeklyCheckInScreen.js`

Four steps behind a gate.

- Gate states: `loading | wrong_day | too_soon | need_weights | open`
  (line 195). Resolved in the `load()` effect, 285-405. None of the gates
  check whether a check-in already exists for the week.
- Step 0 (renderStep0, 517): energy chip, stress chip, sleep hours.
- Step 1 (renderStep1, 571): weight-trend read-out, optional cycle flag,
  calorie adherence (auto-derived note + three blind buttons), steps
  (auto average or manual), cardio adherence (three buttons, gated on a
  prescription).
- Step 2 (renderStep2, 721): soreness chip, sore-muscle multiselect,
  joint pain, free-text notes.
- Step 3 (renderStep3, 807): training-performance four-card pick,
  pre-selected from derived data.
- Submit (handleSubmit, 419): writes via `saveWeeklyCheckin`, reschedules
  reminders, lays the recurring Monday "coach ready" notification, then
  navigates to `CoachOutput` with the local-Monday `weekStart`.

Derivation helpers in this file:
- `deriveTrainingPerformance({completed, planned, prs})` (79): ratio of
  completed to planned plus PR count, returns exceeded/hit/struggled/
  dropped or null. Uses session COUNT, not load or volume.
- `deriveCalsAdherence({rollups, targetKcal})` (92): needs 5+ logged days,
  compares average daily kcal to target, returns `'yes'` within 10 percent
  else `'no'`, or null below 5 days.

Data this screen loads on mount: nutrition targets, bio sex, cycle pref,
weekly steps (getDailyStepsRange + summariseWeekSteps), cardio compliance
prefill (getCardioLogRange + summariseWeekCardio + cardioComplianceFromLog),
and inside load(): morning weights, weekly session stats, weekly PR count,
nutrition targets again, and food rollups for the week (getRollupsForRange).

### 2. The coach engine, `src/lib/weeklyCoach.js`

`runWeeklyCoach(inputs)` (316). Pure. Reads a camelCase `checkin` object
plus weight, session, nutrition, steps and cardio context. Produces the
coach output card: trend, what's working, training/calorie/steps/cardio
adjustments, held decisions, deload, diet break, macro cycle, refeed,
ED-pattern state, differential paywall.

Key internals:
- `assessDataConfidence` (100): data_hold when fewer than 3 weigh-ins.
- `getRecoveryScore` (137) and `getPerformanceScore` (150) feed
  `autoregulationMatrix` (162) which sets the volume signal.
- Calorie adjustment block (541-667), FFM-floor gate (669-705), steps
  prescription (707-747), cardio prescription (749-795), deload (811-824),
  diet break (826-852), macro cycle (854-875), refeed (877-908),
  ED-pattern (910-937), held decisions (939-1005), what's working
  (1007-1051), why-this-week (1053-1074).

What the engine reads off `checkin`: weekStart, energyScore, sorenessScore,
stressScore (not used downstream), calsAdherence, stepsAdherence (legacy),
stepsAvg, cycleOverride, sleepHours, trainingPerformance, notes. It does
NOT read checkin.cardioAdherence anywhere.

### 3. The DB layer, `src/lib/database.js`

- `saveWeeklyCheckin(userId, data)` (4032): upserts the week's row by
  created_at window. Writes cals_adherence, cardio_adherence,
  training_performance, steps_avg and the rest RAW, with no value mapping.
- `getLatestCheckin(userId, weekStart)` (4091): with a weekStart returns
  that week's row, without one returns the most recent row of any week.
  Maps snake to camel via rowToCamel.
- `getWeeklySessionStats(userId, weekStart)` (4118): completed = count of
  completed workouts in the week. planned = max(completed, round(avg of
  the previous 4 weeks' completed counts) or 3). planned is never below
  completed, so session adherence is capped at 1.0.
- `getWeeklyPRCount` (4183): distinct exercises with a weight PR this week.
- `saveCoachOutput` / `getLatestCoachOutput` (4403, 4447): one row per
  (user_id, week_start), full output JSON in output_json.

### 4. The coach output screen, `src/screens/CoachOutputScreen.js`

- `weekStart` comes only from `route.params` (683). No fallback.
- load() (948) reads checkin, weights, session stats, PRs, nutrition,
  recent check-ins, last output, cardio log, then calls runWeeklyCoach
  (1014-1055) and saves the result (1125). There is no background job;
  the output row is created the first time this screen loads for a week.
- InsufficientDataView (660): the "Building your baseline." screen, shown
  whenever `!output || !output.hasEnoughData` (1216).

### 5. The Train (Home) banner, `src/screens/HomeScreen.js`

`showCoachBanner` (719): Pro, a latestCoachOutput exists, not dismissed,
within 7 days of its weekStart. Taps to CoachOutput with that weekStart
(787). Copy: "Precision Coaching™ · this week's review" (795). This banner
is correctly gated on a real saved output.

### 6. The notification, `src/lib/notifications/scheduler.js` + `notificationRoute.js`

- `scheduleWeeklyCoachReady` (320): a RECURRING weekly Monday 09:00 local
  notification, identifier volyume_weekly_coach_ready, data type
  weekly_coach_ready. Title "Your week's plan is ready". Laid every time a
  check-in is submitted (WeeklyCheckInScreen 471-476). It repeats every
  Monday until cancelled, regardless of whether a check-in or output
  exists for that week.
- `routeForNotificationType('weekly_coach_ready')` (notificationRoute 28):
  returns `{ tab: 'ProfileTab', screen: 'CoachOutput' }` with NO params,
  so weekStart is undefined at the screen.

### 7. Where coach prescriptions live

- `userProfile.stepsTarget` (default 8000): set at onboarding
  (ProOnboardingScreen 485), changed by the coach apply (CoachOutputScreen
  773) and Settings (SettingsCoachingScreen 77).
- `userProfile.stepsEnabled`: onboarding toggle (ProOnboardingScreen 486).
- `userProfile.cardioPrescription` (label) and `userProfile.cardioTarget`
  (object): written only when the user applies a cardio card in
  CoachOutput (802-803). So the check-in's cardio section appears only
  after a cardio prescription has been applied at least once.

## The data flow, check-in to coach

1. User submits check-in. saveWeeklyCheckin writes the row (raw values).
2. Navigate to CoachOutput with the local-Monday weekStart.
3. CoachOutput.load reads the row with getLatestCheckin(weekStart), reads
   weights/sessions/PRs/cardio from their own tables, builds inputs, calls
   runWeeklyCoach, saves the output, renders.
4. Next visit to Home shows the banner from the saved output.

## The fields, end to end

| Check-in writes | Column | Engine reads | Used by engine? |
|---|---|---|---|
| energyScore | energy_score | checkin.energyScore | yes, recovery score |
| sorenessScore | soreness_score | checkin.sorenessScore | yes, recovery score |
| stressScore | stress_score | (none) | no |
| sleepHours | sleep_hours | checkin.sleepHours | yes, deload trigger |
| calsAdherence yes/no/untracked | cals_adherence | checkin.calsAdherence | partial, see 01 |
| stepsAvg (number) | steps_avg | checkin.stepsAvg | yes |
| cardioAdherence hit/mostly/missed | cardio_adherence | (none) | NO, engine uses log count |
| trainingPerformance | training_performance | checkin.trainingPerformance | yes, performance score |
| cycleOverride | cycle_override | checkin.cycleOverride | yes |
| jointPain | joint_pain | (none directly) | folded into notes only |
| soreMuscles | sore_muscles | (none) | no |
| notes | notes | checkin.notes | yes, hasUnusualEvent |

Intake magnitude (average daily kcal from the food log) is NOT written by
the check-in and NOT passed to the engine at the call site, even though the
engine accepts `recentIntakeAvgKcal` / `recentIntakeDaysLogged` and the
check-in already computes them. Detail in 01.
