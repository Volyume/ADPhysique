# Check-in and Coach audit, RESTART (authoritative current state)

Date: 2026-06-07. This supersedes the earlier 00/01/02 docs in this folder
where they conflict. The first pass missed the central defect (two flows
writing the same row) because it did not read WorkoutSummaryScreen or the
downstream consumers. Every claim below is cited to a line read in full
this session.

## Method (what was actually read end to end this pass)

Full reads: WeeklyCheckInScreen.js (1338), weeklyCoach.js (1207),
CoachOutputScreen.js (2018), algorithms.js (1263), nutritionEngine.js (923),
cardioEngine.js, stepsSummary.js, coachApply.js, insightsEngine.js,
recoveryEMA.js, ReadinessCards.js, notificationRoute.js, RootNavigator
onTap (490-519). Full function bodies in database.js: saveWeeklyCheckin
(4032), getLatestCheckin (4091), getRecentCheckins (4107),
getWeeklySessionStats (4118), getWeeklyPRCount (4183), saveCoachOutput
(4403), getNutritionTargets/saveNutritionTargets, getRecentIntakeSummary
(food/db 341). Consumer/writer grep across all of src (non-test).
WorkoutSummaryScreen.js write path (335-363, 27, 91, 743), CoachReviewScreen
recommendation builder (137-160), blockAdvisor.js readiness (45-160),
sync.js syncWeeklyCheckin (487-496), sync/tables/weeklyCheckins.js (62-73).

## THE HEADLINE DEFECT, missed first time: two writers, one row

`weekly_checkins` holds one row per user per week. `saveWeeklyCheckin`
(database.js 4032-4089) finds the week's row by a created_at window and
UPDATEs every column from the passed data, using `data.X ?? null`. So any
field the caller omits is written NULL, it does not preserve the existing
value.

There are TWO independent callers of saveWeeklyCheckin:

1. WeeklyCheckInScreen.handleSubmit (429-454), the weekly check-in. Writes:
   energyScore (1-5), sorenessScore (1-5), stressScore, sleepHours,
   calsAdherence ('yes'/'no'/'untracked'), stepsAvg (number), cardioAdherence
   ('hit'/'mostly'/'missed'), cycleOverride, trainingPerformance
   ('exceeded'/'hit'/'struggled'/'dropped'), jointPain (bool), soreMuscles,
   notes. It does NOT pass sleepQuality, so the save NULLS sleep_quality.

2. WorkoutSummaryScreen.handleFinish (347-363), runs after EVERY completed
   workout. Writes: energyScore (1-5), sorenessScore = soreness24hBefore
   (1-3, control max=3, labels Fresh/Mild/Sore, lines 27/743),
   sleepQuality (1-5), trainingPerformance = String(sessionDifficulty)
   (i.e. "1".."5"), jointPain (bool). It passes sleepHours/calsAdherence/
   stepsAdherence/soreMuscles/notes as null, and does NOT pass stepsAvg,
   cardioAdherence, cycleOverride or stressScore, so the save NULLS all of
   those.

Both compute the same local-Monday week boundary (WorkoutSummary
getWeekStart 34-42; WeeklyCheckIn localWeekStartMs), so they target the
SAME row. They overwrite each other within the week, last write wins.

### What this produces (ordering-dependent corruption)

- Weekly check-in submitted, then any workout finishes that week: the
  workout write NULLS calsAdherence, stepsAvg, cardioAdherence,
  cycleOverride, stressScore, sleepHours, and sets trainingPerformance to
  a number-string like "3". The weekly coach then reads calsAdherence as
  'untracked' (436), stepsAvg null, and a trainingPerformance the engine
  does not recognise. **This is the "it didn't pick up food calories,
  steps or training" symptom.**
- Workout finishes, then the weekly check-in submitted: the check-in NULLS
  sleep_quality, so CoachReview's avgSleep (138) and ReadinessCards' sleep
  insight (60) lose their only source.

### Value-scale and vocabulary conflicts on the shared columns

- soreness_score: weekly writes 1-5 (None..Very high); WorkoutSummary
  writes 1-3 (Fresh/Mild/Sore, raw soreness24hBefore at 352, NOT the
  remapped 2-4 it uses for the adaptation event at 231). Consumers read it
  as 1-5: weeklyCoach getRecoveryScore `s>=4` (140) and `highSoreness>=4`
  (524) can never fire on a workout-written value; ReadinessCards
  `s>=4` (67); blockAdvisor divides by 4 assuming 1-5 (48).
- training_performance: weekly writes a verdict; WorkoutSummary writes a
  difficulty string "1".."5". weeklyCoach getPerformanceScore (150-155)
  only matches the verdict strings, so a workout-written value silently
  falls through to the session-adherence branch.
- sleep: weekly writes sleep_hours (e.g. 7.5); WorkoutSummary writes
  sleep_quality (1-5). They are different columns with different meaning;
  CoachReview and ReadinessCards read sleep_quality, the weekly coach
  reads sleep_hours. Neither writer fills both.

## Consumers of weekly_checkins (the full configured set)

1. weeklyCoach (via CoachOutputScreen.load 1014-1055): energyScore,
   sorenessScore, calsAdherence, stepsAdherence (legacy), stepsAvg,
   cycleOverride, sleepHours, trainingPerformance, notes. Does NOT read
   stressScore, cardioAdherence, sleepQuality, soreMuscles, jointPain
   (jointPain only reaches it folded into the notes string, WeeklyCheckIn
   451).
2. CoachOutputScreen render builders: buildOffItems (95-122) and buildFocus
   (124-152) read sleepHours, jointPain, energyScore, sorenessScore,
   calsAdherence.
3. CoachReviewScreen recommendation builder (137-160): energyScore,
   sleepQuality, jointPain.
4. ReadinessCards.computeRecoveryTrendInsight (57-96): energyScore,
   sorenessScore, sleepQuality.
5. blockAdvisor (checkinReadiness 45-50, detectSignals 78-130,
   buildNextBlockRecommendation 154-): energyScore, sorenessScore.

## The other defects, re-verified end to end

### D1, no prefill / no completion state
WeeklyCheckInScreen never imports or calls getLatestCheckin. State inits to
null/empty (251-275); only freshly DERIVED values pre-select. Re-entering a
completed week shows a blank form. getLatestCheckin exists (4091) and
CoachOutputScreen already uses it (950). Confirmed.

### D2, calorie-adherence vocabulary, BROADER than first stated
Screen + DB store 'yes'/'no'/'untracked' raw (saveWeeklyCheckin 4054, no
remap). Code that expects 'hit'/'under'/'over':
- engine: adaptive adherenceFactor (586-588), cut step -150 vs -100 (628),
  what's-working credit (1034).
- CoachOutput render: buildOffItems under/over (116-119), buildFocus over
  (147-149). These never fire for current data.
- differentialPaywall.detectDifferentialTrigger filters the series to
  under/over/hit/untracked (125), so 'yes'/'no' are DROPPED and the 2-of-3
  paywall gate cannot fire for these users. Confirmed by reading the file.

### D3, food intake never reaches the safety floor
CoachOutputScreen.load (1014-1055) never passes recentIntakeAvgKcal /
recentIntakeDaysLogged / bodyFatPercent / bodyFatSource / sex. The engine's
FFM-floor gate (weeklyCoach 680-705) and adaptive-TDEE ffmFloorContext
(595-600) are therefore dead. A ready-made trailing-7-day helper,
getRecentIntakeSummary (food/db 341-363, documented "used by callers
feeding weeklyCoach inputs"), exists and is simply never called. Confirmed.

### D4, cardio adherence is a dead write
weekly_checkins.cardio_adherence is written by the check-in and synced
(sync/tables/weeklyCheckins 68) but the engine never reads
checkin.cardioAdherence (full weeklyCoach read). The engine derives cardio
compliance from cardioSessionsLogged off the cardio_log
(CoachOutputScreen 1010-1011, 1052; weeklyCoach 757-786). Confirmed.

### D5, Monday notification lands with no weekStart, verified across the seam
scheduleWeeklyCoachReady lays a recurring weekly Monday notification on
every check-in submit (WeeklyCheckIn 471-476; scheduler 320-340).
routeForNotificationType('weekly_coach_ready') returns CoachOutput with NO
params (notificationRoute 28-31). RootNavigator.onTap navigates with no
params (490-516). CoachOutputScreen reads route.params.weekStart = undefined
(683), so getWeeklySessionStats(undefined) gives a NaN window (0 sessions),
weekRangeLabel(undefined) is Invalid Date (1293), and the screen falls to
the baseline / adherence view. Confirmed end to end.

### D6, performance is attendance-based, not load-based
weeklyCoach judges training by session COUNT and PRs (getPerformanceScore
150-155, getWeeklySessionStats 4118-4140), never week-over-week working-set
volume or tonnage. calculateWeeklyVolume (algorithms 172) and
calculateTonnage (97) exist and are used by insightsEngine and
CoachReview, but CoachOutputScreen does not load the week's sets or an
exerciseMap, so no volume trend reaches the weekly coach. This is a design
extension, not a wiring bug.

## Sync note
Two sync paths carry different column sets. The immediate
syncWeeklyCheckin (sync.js 487-496) omits steps_avg, cardio_adherence,
sleep_quality. The bulk table sync (sync/tables/weeklyCheckins 62-73)
carries steps_avg and cardio_adherence but still omits sleep_quality, so
sleep_quality is local-only and lost on a fresh-device restore.

## Bottom line
The first audit's six defects are real, but the dominant problem is the
two-writer collision on weekly_checkins. Any fix to the check-in pipeline
has to resolve that first (separate the per-workout recovery feedback from
the weekly coaching row, or make the write a true partial update that
preserves existing non-null values), because otherwise prefill, calorie
wiring, steps and training-performance fixes all sit on a row that a single
post-check-in workout still wipes.
