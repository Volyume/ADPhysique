# checkin-audit-00-system-map

Date: 2026-06-07. Authoritative system map. Every line, table and function
below was read in full this session. Where a prior audit already recorded a
finding, it is cited. This replaces the earlier draft of this file.

## Audit documents reviewed

Read in full and relevant to this pipeline:
- volyume-deep-feature-audit-2026-06-04: 44 (weekly check-in), 45 (coach
  output), 20 (coach review), 48 (coach-engine + notification surfaces).
  These were a11y/cleanup passes; their "flow is sound" verdicts were NOT
  contract-tested and are corrected here.
- volyume-cardio-qa-2026-06-03/cardio-qa-03-coaching-integration.md: already
  records CI-1 (High) "cardio compliance captured but unused, the loop is
  broken at the final step", CI-2 (recovery load not reaching the coach),
  CI-3 (cardio cut-only, founder decision). D4 below is the same finding.
- volyume-cardio-integration-2026-06-03 (library/flow proposals).
- volyume-coach-plan-audit-2026-06-01/coach-audit-05-gap-analysis.md:
  about plan GENERATION and division volume distribution (volume landmarks,
  GOAL_OVERLAYS), tangential to the check-in pipeline. Noted, not central.

Out of scope for this task (read titles, judged unrelated to the check-in to
coach data pipeline): the nine coach-audit-02 division-research docs and the
planengine-rebuild weak-point/composition docs. They concern per-muscle
volume distribution in plan generation, not check-in data flow. Flagged
here for honesty rather than claimed as fully read.

## The systems and how they connect

### 1. Weekly check-in, `src/screens/WeeklyCheckInScreen.js` (1338 lines)

Four-step gated form. Renders local components `StepBar`, `SectionLabel`,
`ChipRow`, `OptionRow`, plus inline muscle chips and training-perf cards.

- Gate (`load()` 285-405): `loading | wrong_day | too_soon | need_weights |
  open`. None of the gates check whether a check-in already exists for the
  week.
- Derivation helpers: `deriveTrainingPerformance` (79-86, session
  count/planned + PRs), `deriveCalsAdherence` (92-99, 5+ logged days, avg
  vs target within 10%).
- On mount it loads: nutrition targets, bio sex, cycle pref, weekly steps
  (`getDailyStepsRange`+`summariseWeekSteps`), cardio compliance prefill
  (`getCardioLogRange`+`summariseWeekCardio`+`cardioComplianceFromLog`),
  and in `load()`: morning weights, `getWeeklySessionStats`,
  `getWeeklyPRCount`, `getNutritionTargets`, `getRollupsForRange`.
- Submit (`handleSubmit` 419-513): `saveWeeklyCheckin(...)`, reschedules
  reminders, lays the recurring Monday coach-ready notification, navigates
  to `CoachOutput` with the local-Monday weekStart.
- It never reads back an existing row (no `getLatestCheckin` import).

### 2. Coach output + engine

`src/screens/CoachOutputScreen.js` (2018 lines) is the orchestrator:
`load()` (948-1181) reads the check-in (`getLatestCheckin(weekStart)`),
weights, session stats, PRs, nutrition, recent check-ins, last output,
cardio log, then calls `runWeeklyCoach` (1014-1055) and `saveCoachOutput`.
Render builders `buildHeadline` (76), `buildOffItems` (95), `buildFocus`
(124) read the check-in directly. There is no background job: the
`coach_outputs` row is created the first time this screen loads for a week.

`src/lib/weeklyCoach.js` (1207 lines), `runWeeklyCoach(inputs)` (316): pure.
Reads a camelCase `checkin` plus weight/session/nutrition/steps/cardio
context. Internals: `assessDataConfidence` (100), `getRecoveryScore` (137),
`getPerformanceScore` (150), `autoregulationMatrix` (162), calorie block
(541-667), FFM-floor gate (669-705), steps (707-747), cardio (749-795),
deload (811-824), diet break (826-852), macro cycle (854-875), refeed
(877-908), ED-pattern (910-937), held decisions (939-1005), what's working
(1007-1051), why (1053-1074).

Feeders into the coach (read in full): `nutritionEngine.js`
(`computeFFMFloor` 426, `computeAdaptiveTDEEAdjustment` 260,
`calculateNutritionTargets` 554), `coachApply.js`, `cardioEngine.js`
(`cutCardioTarget`, `nextCardioTarget`, `cardioComplianceFromLog`,
`summariseWeekCardio`, `cardioRecoveryFlag`), `recoveryEMA.js`,
`insightsEngine.js`, `algorithms.js` (`calculateWeeklyVolume` 172,
`calculateTonnage` 97, `detectLaggingMuscles` 1207, `shouldDeload` 719),
`edPatternDetector`, `differentialPaywall.js`.

### 3. Food / diary log

- `food_entries` (raw per-item rows) → `daily_intake_rollups`
  (PK user_id+entry_date; kcal_total, protein_g, carbs_g, fat_g, fibre_g,
  entries_count) schema database.js 839-850.
- Write: `recomputeRollup(userId, entryDate)` (food/db 230-263) SUMs
  food_entries for the day into the rollup. Called on every food write.
- Read: `getRollupsForRange` (food/db 323), `getRollupForDay` (315),
  `getRecentIntakeSummary` (341-363) which returns
  `{avgKcal, daysLogged}` over a trailing-7-day LOCAL window and is
  documented "used by callers feeding weeklyCoach inputs".

### 4. Training session log

- `workouts` (database.js 84-100): started_at, ended_at, session_difficulty,
  overall_pump, soreness_24h_before, fatigue_level, is_completed.
- `workout_sets` (101-123): set_type, target_reps_min/max, actual_reps,
  weight, rir, rpe, failed, post_set_pump, joint_discomfort, is_amrap.
- Queries: `getWeeklySessionStats` (4118-4140) completed count + planned =
  max(completed, avg of prior 4 weeks' counts, or 3); `getWeeklyPRCount`
  (4183-4204) distinct exercises with a weight PR; `calculateWeeklyVolume`
  (algorithms 172) per-muscle working sets from sets+exerciseMap;
  `getYearOfLiftsData` tonnage.
- Write: `WorkoutSummaryScreen.handleFinish` writes session feedback to
  `workouts` via `updateWorkout` (336-343) AND a check-in row via
  `saveWeeklyCheckin` (349-361). See the two-writer note below.

### 5. Step log

- `daily_steps` (database.js 1112-1119): PK user_id+entry_date; steps,
  source ('manual'|'auto').
- Write: `setDailySteps` (3731-3748) upserts the day; `recordTodaySteps`
  (activitySteps 130-143) reads Health Connect when permission granted and
  writes source 'auto', called from the app-foreground handler.
- Read: `getDailyStepsRange` (3767), `summariseWeekSteps` (stepsSummary,
  registered at >=4 logged days, returns {daysLogged, avgSteps, registered}).

### 6. Cardio log

- `cardio_log` (database.js 1196-): PK user_id+id (many per day);
  entry_date, activity_name, duration_min, intensity, met, est_kcal
  (FEEDBACK only, never added to the calorie target), recovery_impact,
  deleted_at (soft delete).
- Write: `insertCardioLog` (3788-3828) from `LogCardioScreen`.
- Read: `getCardioLogRange` (3895), `summariseWeekCardio` (cardioEngine 102,
  {sessions,totalMinutes,totalKcal,highImpactSessions}),
  `cardioComplianceFromLog` (88, hit/mostly/missed vs target sessionsPerWeek).

### 7. Coach prescription storage (where targets live)

- Calorie target: `nutrition_targets.target_kcal` (saveNutritionTargets
  2925; the row also has tdee, protein_g, carbs_g, fat_g, phase).
- Step target: `userProfile.stepsTarget` (local profile), default 8000,
  set at onboarding, changed by the coach apply (CoachOutput 773) and
  Settings.
- Cardio: `userProfile.cardioPrescription` (label) + `userProfile.cardioTarget`
  (object), written only by `handleApplyCardio` (789-813).
- Training volume: `planned_muscle_volume` per mesocycle week, via
  `upsertPlannedMuscleVolume` (coach apply `handleApplyTraining` 731-759).
- Weekly output: `coach_outputs` (PK user_id+week_start; output_json plus
  denormalised goal_phase, volume_signal, calorie_change, steps_target,
  cardio_prescription, why_this). `saveCoachOutput` 4403, `getLatestCoachOutput`
  4447 (parses output_json).

### 8. Train-screen "review is in" notification

- `scheduleWeeklyCoachReady` (scheduler 320-340): a RECURRING weekly Monday
  09:00 local notification (title "Your week's plan is ready"), laid on
  every check-in submit (WeeklyCheckIn 471-476). Not gated on a check-in or
  output existing.
- `routeForNotificationType('weekly_coach_ready')` (notificationRoute 28-31):
  returns `{tab:'ProfileTab', screen:'CoachOutput'}` with NO params.
- `RootNavigator.onTap` (490-516): `navigationRef.navigate('ProfileTab',
  {screen:'CoachOutput'})`, no params passed.
- The Train (Home) banner is a SEPARATE surface: `HomeScreen` `showCoachBanner`
  (719) gated on a saved `latestCoachOutput` within 7 days, taps to
  `CoachOutput` WITH that weekStart (787). The banner is correctly gated;
  the notification is not.
- "Building your baseline" is `InsufficientDataView` (CoachOutput 660-678),
  shown when `!output || !output.hasEnoughData` (1216).

### saveWeeklyCheckin / getLatestCheckin (full bodies)

`saveWeeklyCheckin(userId, data)` (database.js 4032-4089): finds the week's
row by `created_at` within [weekStart, weekStart+7d]; UPDATEs (4046-4060) or
INSERTs (4064-4079) writing every column as `data.X ?? null`. **Omitted
fields are written NULL, not preserved.** Fire-and-forget cloud push.

`getLatestCheckin(userId, weekStart)` (4091-4105): with weekStart returns
that week's row, without it the most recent row of any week; `rowToCamel`.

### weekly_checkins columns (base 404-418 + migrations)

id, user_id, week_start, energy_score, soreness_score, stress_score,
sleep_hours, cals_adherence, steps_adherence, cycle_override, notes,
created_at, updated_at, + training_performance (440), joint_pain (441),
sore_muscles (453), sleep_quality (470), deleted_at (625), cardio_adherence
(1072), steps_avg (1181). **There is NO completed/submitted column.**

### THE TWO WRITERS OF weekly_checkins (central finding)

| Writer | Fields it sets | Fields it NULLs (omits) |
|---|---|---|
| WeeklyCheckInScreen.handleSubmit (429-454) | energy(1-5), soreness(1-5), stress, sleep_hours, cals_adherence(yes/no/untracked), steps_avg, cardio_adherence, cycle_override, training_performance(verdict), joint_pain, sore_muscles, notes | sleep_quality |
| WorkoutSummaryScreen.handleFinish (349-361), every completed workout | energy(1-5), soreness=soreness_24h_before(1-3), sleep_quality(1-5), training_performance=String(sessionDifficulty)("1".."5"), joint_pain | sleep_hours, cals_adherence, steps_adherence, steps_avg, cardio_adherence, cycle_override, stress_score, sore_muscles, notes |

Both compute the same local-Monday week (WorkoutSummary getWeekStart 34-42;
WeeklyCheckIn localWeekStartMs), so they hit the same row. Last write wins;
omitted fields are nulled.

### Consumers of weekly_checkins (full set)

1. weeklyCoach (via CoachOutput 1014-1055): energy, soreness, calsAdherence,
   stepsAdherence(legacy), stepsAvg, cycleOverride, sleepHours,
   trainingPerformance, notes.
2. CoachOutput render buildOffItems (95-122) / buildFocus (124-152):
   sleepHours, jointPain, energyScore, sorenessScore, calsAdherence.
3. CoachReviewScreen recs (137-160): energyScore, sleepQuality, jointPain.
4. ReadinessCards.computeRecoveryTrendInsight (57-96): energyScore,
   sorenessScore, sleepQuality.
5. blockAdvisor (45-160): energyScore, sorenessScore.

## Data flow summary

check-in submit → saveWeeklyCheckin (weekly row) → navigate CoachOutput
(weekStart) → runWeeklyCoach(checkin + weights/sessions/PRs/cardio) →
saveCoachOutput → Home banner reads saved output. In parallel, every
completed workout also writes the same weekly row with a different, partly
conflicting field set.
