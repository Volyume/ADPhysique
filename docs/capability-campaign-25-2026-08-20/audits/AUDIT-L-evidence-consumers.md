# AUDIT L — Training-Evidence Consumer Map (mechanical evidence sweep)

Scope: every consumer of training-evidence data under `src/`, for the capability
campaign's architecture review. Read-only sweep. No product or architecture
judgement below the DATA FAMILY tables — evidence only.

Method: for each family, the storage-layer access function(s) in
`src/lib/database.js` (no equivalent functions exist for these families in
`src/lib/food/db.js` — confirmed: `food/db.js` defines no `CREATE TABLE`
statements of its own and reuses `database.js`'s connection only for food-domain
tables) were located, then every call site under `src/` was grepped by name.
Test files (`__tests__/`) are excluded from the main tables and rolled into the
GUARD TESTS section per family. Raw SQL string literals against the underlying
table names were grepped separately to catch bypasses of the helper functions
(DIRECT-SQL BYPASSES section).

Row format: `READER (file:function:line) | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER`.
Where a call site sits inside an anonymous `useEffect`/`useMemo`/inline JSX
handler rather than a named function, the function column names the nearest
enclosing named function if one was confirmed, otherwise a short evidenced
label (screen name + what the surrounding code is doing) rather than a guess.

---

## FAMILY 1 — workouts (sessions)

Storage: `workouts` table (`src/lib/database.js:217`). Columns include
`session_difficulty`, `overall_pump`, `soreness_24h_before`, `fatigue_level`,
`joint_discomfort`, `pre_workout_intent`, `is_completed`.

Access functions (`src/lib/database.js`): `getAllWorkouts:3063`,
`getCompletedWorkoutStartTimestamps:3081`, `getRecentCompletedWorkouts:3096`,
`getWorkoutById:3113`, `createWorkout:3131`, `updateWorkout:3233`,
`deleteIncompleteWorkout:3244`, `deleteWorkoutAndSets:3271`,
`hasWorkoutOnDate:7437`, `getFirstWorkoutDateOnOrAfter:7456`,
`insertWorkoutFromCloud:8827`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/RoutineDetailScreen.js:658` (start-from-routine handler) | `createWorkout` — opens a new session from a routine | Workout logging (`ActiveWorkoutScreen`) |
| `src/screens/BuildWorkoutScreen.js:161,187` (start handlers) | `createWorkout` — freeform / template-start session | Workout logging |
| `src/screens/PlansScreen.js:685` (`handleStartNextWorkout`, PlansScreen.js:667-701) | `createWorkout` for the plan's next routine | Workout logging |
| `src/screens/PlansScreen.js:955` (`handleStartTemplate`, PlansScreen.js:953-973) | `createWorkout` from a saved workout template | Workout logging |
| `src/screens/PlanDetailScreen.js:185` (start handler) | `createWorkout` | Workout logging |
| `src/screens/HomeScreen.js:1557` (`handleStartNextWorkout`, HomeScreen.js:1493-1551 boundary; call itself at 1557 is just past, inside `confirmStart`, HomeScreen.js:1551-1594) | `createWorkout` with pre-workout intent/readiness | Workout logging; readiness state reset |
| `src/screens/HomeScreen.js:1597` (`startBlankSession`, HomeScreen.js:1594-1608) | `createWorkout(user.id, null, {intent:null})` | Workout logging |
| `src/screens/ActiveWorkoutScreen.js:1583` (`loadHistory`, ActiveWorkoutScreen.js:1560-1851) | `getWorkoutById` — reloads current session row | Live session state |
| `src/screens/ActiveWorkoutScreen.js:4198,4864` (stale/duplicate workout discard modal handlers) | `deleteIncompleteWorkout` | Workout-logging integrity (abandoned sessions) |
| `src/screens/WorkoutHistoryScreen.js:147` (`loadWorkouts`, WorkoutHistoryScreen.js:134-195) | `getRecentCompletedWorkouts(user.id,50)` | History list UI |
| `src/screens/WorkoutHistoryScreen.js:197` (`handleRepeatAsIs`, WorkoutHistoryScreen.js:195-264) | `createWorkout` to repeat a past session | Workout logging |
| `src/screens/WorkoutHistoryScreen.js:290` (`handleDeleteWorkout`, WorkoutHistoryScreen.js:279-328) | `deleteWorkoutAndSets` | History list UI |
| `src/screens/WorkoutSummaryScreen.js:459` (post-finish reload) | `getWorkoutById` | Summary screen render |
| `src/screens/WorkoutSummaryScreen.js:620` (`loadVolumeAndHistory`, WorkoutSummaryScreen.js:606-760) | `getAllWorkouts` — feeds weekly-volume comparison | Volume-vs-landmark banner on the summary screen |
| `src/screens/YouScreen.js:235` (coach-home data load) | `getAllWorkouts` | Coach-home summary tiles |
| `src/screens/CoachReviewScreen.js:318` (`loadData`, CoachReviewScreen.js:289-461) | `getAllWorkouts` | Weekly volume/deload recommendation build |
| `src/screens/MesocycleBuilderScreen.js:115` (`loadActiveStats`, MesocycleBuilderScreen.js:110-171) | `getAllWorkouts` | Active-mesocycle dashboard stats |
| `src/screens/AthleteProfileScreen.js:304` (stats load) | `getAllWorkouts` | In-app profile/progress-stats screen |
| `src/hooks/useProgressData.js:141` (`load`, useProgressData.js:128-186) | `getAllWorkouts` | Shared progress-data hook (Analytics/Volume screens) |
| `src/components/ReadinessCards.js:154` (data load) | `getAllWorkouts` | Readiness gauge cards (Consistency/MesocycleBuilder/ProSetupComplete) |
| `src/lib/livePrescription.js:662` (async IO seam, §19) | `getWorkoutById` | In-session live prescription (rest-timer/next-set guidance) |
| `src/lib/blockAdvisor.js:734` (block-advice evidence gather) | `getRecentCompletedWorkouts(userId,1)` | Next-block advice (`getBlockAdvice`) |
| `src/store/useAppStore.js:1575` (session-restore path) | `getWorkoutById` | Zustand session state |
| `src/lib/sync.js:309` (single-row push helper) | `getWorkoutById` | Cloud push payload build |
| `src/lib/sync.js:688` (`pushWorkouts`-style bulk push) | `getAllWorkouts(localUserId)` | Supabase push (legacy sync, table not yet migrated to `src/lib/sync/tables/`) |
| `src/lib/sync.js:2122,2131` (pull/reconcile) | `deleteWorkoutAndSets` / `insertWorkoutFromCloud` | Cloud→local pull reconciliation |
| `src/lib/notifications/handler.js:165,192` (notification content builders) | `getAllWorkouts` | Push-notification copy (streak/reminder content) |
| `src/lib/notifications/trainingHabitSchedule.js:133` (habit-window inference) | `getCompletedWorkoutStartTimestamps` | Scheduled training-reminder timing |
| `src/lib/notifications/scheduler.js:316,810,937,1166` (schedule/rebuild passes) | `getRecentCompletedWorkouts` / `getAllWorkouts` | Notification scheduling decisions |
| `src/lib/importExternal.js` (see DIRECT-SQL BYPASSES) | Direct `INSERT INTO workouts` from Hevy/Strong CSV import, bypassing `createWorkout` | Imported history enters the same tables workout-logging reads from |

`hasWorkoutOnDate` and `getFirstWorkoutDateOnOrAfter` have **no call site outside `database.js`** (checked repo-wide) — unused/reserved.

---

## FAMILY 2 — workout sets (+ load/weight, reps, RIR/effort fields)

Storage: `workout_sets` table (`src/lib/database.js:234`). Columns: `actual_reps`,
`weight`, `rir`, `rpe`, `post_set_pump`, `post_set_muscle_connection`,
`joint_discomfort`, `is_amrap`, `amrap_reps`, `failed`.

Access functions: `getAllWorkoutSets:3285` (no external caller — unused),
`getCompletedWorkoutSets:3295`, `getWorkoutSetsSince:3313`,
`getWorkoutSetsForWorkoutIds:3335`, `getWeeklyVolumeByMuscle:3351`,
`getLastTrainedByMuscle:3415`, `getRecentlyUsedExerciseIds:3447`,
`getAcuteChronicWorkload:3468`, `getWorkoutSetsForWorkout:3521`,
`getRoutineWorkoutTonnages:3540`, `getCompletedSetHistoryForExercise:3577`,
`getWorkoutSetsForExercise:3589` (no external caller — unused),
`getPreviousWorkoutSets:3600` (no external caller — unused),
`getLastNWorkoutSets:3617`, `getAllCompletedSetsForExercise:3637`,
`createWorkoutSet:3649`, `updateWorkoutSetPostRating:3704` (no external
caller found — unused), `updateWorkoutSet:3727`, `deleteWorkoutSet:3756`,
`getExerciseStimulusRatings:3769` (no external caller — unused),
`getPriorCompletedSets:5118`, `getWeek1SetsForExercise:5450`,
`insertWorkoutSetFromCloud:9068`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/ActiveWorkoutScreen.js:1896` (`handleCompleteSet`, 1851-2347) | `createWorkoutSet` — writes the just-logged set | Workout logging; live-activity/rest-timer trigger |
| `src/screens/ActiveWorkoutScreen.js:2366` (`handleSaveEditedSet`, 2347-2429) | `updateWorkoutSet(id,{weight,actualReps})` | Set-edit sheet |
| `src/screens/ActiveWorkoutScreen.js:2442` (`handleDeleteEditedSet`, 2429-2489) | `deleteWorkoutSet` | Set-edit sheet |
| `src/screens/ActiveWorkoutScreen.js:1565,1567` (progression-teaser lookup) | `getLastNWorkoutSets` / `getAllCompletedSetsForExercise` | In-session "last time" prescription |
| `src/screens/ActiveWorkoutScreen.js:1650` (week-1 anchor lookup) | `getWeek1SetsForExercise` | Progression-anchor comparison in-session |
| `src/screens/ActiveWorkoutScreen.js:2806` (`loadHistory`, 1560-1851) | `getWorkoutSetsForWorkout` | Rehydrates in-progress session on resume |
| `src/store/useAppStore.js:1482` (`applyRemoteSetEvent`, 1449-1509 — the watch-bridge headless set-commit path, COMP-020) | `createWorkoutSet` from a companion-watch payload (weight/reps/RIR), bypassing the screen entirely | Same `workout_sets` row workout-logging reads; PR check deferred to summary |
| `src/screens/ExerciseDetailScreen.js:334` (history load) | `getCompletedSetHistoryForExercise` | Per-exercise history chart |
| `src/screens/WorkoutSummaryScreen.js:618,733` (`loadVolumeAndHistory`, 606-760) | `getCompletedWorkoutSets`, `getWorkoutSetsForWorkout` | Weekly-volume + PR/record-line build for the summary |
| `src/screens/WorkoutSummaryScreen.js:421` (4-week routine-tonnage `useEffect`) | `getRoutineWorkoutTonnages` | "Better/worse than last time" comparison banner |
| `src/screens/CoachReviewScreen.js:319` (`loadData`, 289-461) | `getCompletedWorkoutSets` | Weekly volume/deload recommendation build |
| `src/screens/MesocycleBuilderScreen.js:116` (`loadActiveStats`) | `getCompletedWorkoutSets` | Active-mesocycle dashboard |
| `src/screens/LiftProgressScreen.js:164` | `getCompletedWorkoutSets` | Lift-progress chart / PR indices (`buildLiftProgressRows`, `derivePRIndices`) |
| `src/screens/AthleteProfileScreen.js:305` | `getCompletedWorkoutSets` | In-app profile/progress-stats |
| `src/screens/WorkoutHistoryScreen.js:151,223,338` (`loadWorkouts`; `handleRepeatAsIs`; `handleToggleExpand`) | `getWorkoutSetsForWorkoutIds` / `getWorkoutSetsForWorkout` | History list expansion + repeat-session sizing |
| `src/screens/BodyMetricsScreen.js:825` (recomposition `useMemo`, line 639, over data gathered near `loadHistory`) | `getWorkoutSetsSince` feeds `buildLiftProgressRows` via `deriveRecomp` (`src/lib/recompReframe.js:import 39, call 639`) | Body-metrics "recomposition" card — **food/body domain reading training evidence** |
| `src/screens/HomeScreen.js:772,1016,1275` (plateau-banner `useEffect`≈766-801; `loadWeekStats` 1000-1141; `loadBlockProgress` 1164-1297) | `getWorkoutSetsSince` | Plateau banner, week-volume stats, block-progress panel |
| `src/screens/VolumeHeatmapScreen.js:150` (`loadData`, 126-257) | `getCompletedWorkoutSets` | Muscle-volume heatmap |
| `src/hooks/useProgressData.js:142` (`load`, 128-186) | `getCompletedWorkoutSets` | Shared progress hook |
| `src/lib/blockLedgerRunner.js:252,519` (`computeAndStoreBlockLedger`, `buildSeedRangesForNextBlock`) | `getPriorCompletedSets` — pre-block baseline for newness/prior-best checks | Block ledger; next-block seed ranges |
| `src/components/EngineLog.js:76` (coach-decision transparency panel) | `getCompletedWorkoutSets` | `CoachOutputCards.js`, `CoachHeldHistoryScreen.js` (coach "why" panel) |
| `src/lib/livePrescription.js:652` (async IO seam) | `getLastNWorkoutSets(exerciseId,workoutId,3)` | In-session live weight/rep prescription |
| `src/components/ReadinessCards.js:155` | `getCompletedWorkoutSets` | Readiness gauge cards |
| `src/lib/sync.js:312,714` (push helpers) | `getWorkoutSetsForWorkout` | Cloud push |
| `src/lib/sync.js:2142` (pull/reconcile) | `insertWorkoutSetFromCloud` | Cloud→local pull |
| `src/screens/WeeklyCheckInScreen.js:471` (`useEffect`, weekly-volume comparison, WeeklyCheckInScreen.js:461-471) | `getWeeklyVolumeByMuscle` | Check-in screen's own volume recap |
| `src/screens/VolumeHeatmapScreen.js:166,170` (`loadData`) | `getWeeklyVolumeByMuscle`, `getLastTrainedByMuscle` | Heatmap trend + "last trained" chips |
| `src/hooks/useProgressData.js:161` (`load`) | `getAcuteChronicWorkload` | Analytics/Volume acute:chronic ratio card |
| `src/lib/sessionAdjustments.js:123` (session-prescription build) | `getWeeklyVolumeByMuscle(userId,1,now)` | In-session load/rep adjustment engine |
| `src/components/ExercisePickerModal.js:176` (recency list) | `getRecentlyUsedExerciseIds` | Exercise-picker "recently used" row |
| `src/lib/exercise/intent.js:88` (`loadExerciseIntentState`, 70-~120) | `getExerciseUsageStats` | Feeds family 6/7/8's combined intent state (canonicality ranking) |
| **Field-level engine consumers of load/weight, reps, RIR** (all operate on sets already fetched by the rows above, not separate DB calls): `src/lib/algorithms.js:calculate1RM:101`, `detectPR:389`, `calculateTonnage:183`, `calculateWeeklyVolume:270`, `buildLast4WeekDeloadBuckets:685`, `computeSessionAdjustments:1082`, `detectPlateau:1408`, `detectProgressionConsistency:1576` | Estimated-1RM, PR detection, tonnage, weekly volume, deload-bucket averages, session load/rep adjustment, plateau/consistency detection | `src/lib/bestLift.js:pickBestLift:40` (best-lift-of-week); `src/lib/workoutRecordLine.js:buildRecordLine:54` (in-session PR banner, `ActiveWorkoutScreen.js:77`); `src/lib/liftProgress.js` (`LiftProgressScreen.js`, `ExerciseDetailScreen.js`, `src/lib/recompReframe.js`, `src/lib/athleteProfileSummary.js`); `src/lib/strengthStandards.js` (`LiftProgressScreen.js`, `athleteProfileSummary.js`); `src/lib/insightsEngine.js:topSetOf:24` (dead — see FAMILY 16 note); `src/lib/exercise/intent.js` (plateau/consistency feed exercise-swap ranking) |
| `src/lib/importExternal.js` (see DIRECT-SQL BYPASSES) | Direct `INSERT INTO workout_sets` from CSV import, bypassing `createWorkoutSet` | Imported sets enter the same table every reader above reads from |

---

## FAMILY 3 — soreness

Storage: `workouts.soreness_24h_before` (1-3, pre-session) and
`weekly_checkins.soreness_score` / `weekly_checkins.sore_muscles` (post-week).
No dedicated accessor — read as a field on rows already fetched by Family-1/17
functions and `getSessionAdjustmentSignals:10066` (joins `workouts`+`workout_sets`
+`exercises`, and folds in `getLatestCheckin`'s `soreMuscles`).

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/WorkoutSummaryScreen.js:206,462,539-547` (state init; post-finish reload; save) | Captures/pre-fills `soreness24hBefore` on the feedback form | `updateWorkout` write-back |
| `src/screens/HomeScreen.js:132,352,1532-1644,2634,2653` (readiness-prompt state + resets) | Pre-session readiness capture (soreness/sleep/energy) | `createWorkout` intent payload |
| `src/components/ReadinessCards.js:171-208` (data-shape/gauge build) | Buckets recent workouts' `soreness24hBefore` into a 3-domain readiness gauge | Consistency/MesocycleBuilder/ProSetupComplete screens |
| `src/lib/mesocycle.js:227` (`weightedAvg('soreness24hBefore')`) | Recency-weighted average soreness feeding deload advisory | `CoachReviewScreen` deload copy |
| `src/lib/readinessSummary.js:139` (`buildReadinessSummary`) | High-soreness flag → "sore" readiness chip copy | HomeScreen readiness card |
| `src/lib/insightsEngine.js:170-171` (`generateInsights`) | Soreness trend for a `recovery_warn` insight type — **dead**, see FAMILY 16 note | n/a (unreachable) |
| `src/lib/algorithms.js:738,748` (`buildLast4WeekDeloadBuckets`) | Weekly average/series of soreness for the deload-bucket model | `shouldDeload` → HomeScreen/CoachReviewScreen/useProgressData deload banners |
| `src/lib/sessionAdjustments.js:155` (`buildSessionAdjustmentInput`-adjacent, `presessionSoreness`) | Feeds in-session load/rep auto-regulation | `computeSessionAdjustments` |
| `src/lib/recoveryEMA.js:56` (`computeRecoveryEMAs`) | Soreness EMA point series | `MesocycleBuilderScreen`, `ReadinessCards`, `insightsEngine` (dead path) |
| `src/lib/blockLedgerGather.js:314` (`structureEvidence`-adjacent aggregation) | `soreness13` per-workout evidence point for the block ledger | Block ledger (`blockLedgerRunner.js`) |
| `src/lib/blockMetrics.js:424` (late-block soreness average) | `sorenessLateAvg` used by `interBlock.js` block classification | Block classification → programme structure memory / next-block advisor |
| `src/lib/sync.js:429` (push) | `soreness_24h_before: w.soreness24hBefore` | Cloud push (legacy `sync.js`, not yet on the registry) |
| `src/screens/CoachReviewScreen.js:454` (deload-gate check, alongside joint) | `.soreness24hBefore` on this week's workouts | Recovery-gated deload recommendation |
| Weekly-checkin side: `src/screens/WeeklyCheckInScreen.js` (form fields `sorenessScore`, `soreMuscles`) → `saveWeeklyCheckin` | Captures post-week soreness | `weeklyCoach.js`, `coachRegister.js`, `coachResponse.js`, `coachOutput/viewCopy.js` (all coach-domain) |

---

## FAMILY 4 — fatigue

Storage: `workouts.fatigue_level` (1-5, post-session). Read via
`getRecentWorkoutFeedback:10108` (last N completed workouts with a non-null
`fatigue_level`) and as a raw field on Family-1 rows.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/WorkoutSummaryScreen.js:67,178,476,781,1743` (feedback form) | Captures `fatigueLevel` 1-5 post-session | `updateWorkout` write-back |
| `src/screens/HomeScreen.js:944` (`loadFatigueTrend`, HomeScreen.js:941-951) | `getRecentWorkoutFeedback(user.id,6)` | `src/components/FatigueTrendCard.js` — **home-surface trend card** |
| `src/hooks/useProgressData.js:224` (`loadFatigueTrend`, 222-231) | `getRecentWorkoutFeedback(user.id,6)` | Shared progress hook consumers |
| `src/lib/homeCoachBrief.js:31,65` (`buildCoachBrief`) | Average recent `fatigueLevel` → brief-copy severity | `src/components/CoachBriefCard.js` on **HomeScreen** / **ConsistencyScreen** |
| `src/lib/mesocycle.js:226` (`weightedAvg('fatigueLevel')`) | Recency-weighted average fatigue for deload advisory | `CoachReviewScreen` |
| `src/lib/recoveryEMA.js:57` (`computeRecoveryEMAs`) | Fatigue EMA point series | `MesocycleBuilderScreen`, `ReadinessCards`, `insightsEngine` (dead path) |
| `src/lib/readinessSummary.js:152` (`buildReadinessSummary`) | Fatigue-history chip in readiness copy | HomeScreen readiness card |
| `src/components/FatigueTrendCard.js:35,60` | Renders last-2-session fatigue delta | HomeScreen, ConsistencyScreen |
| `src/lib/sync.js:430` (push) | `fatigue_level: w.fatigueLevel` | Cloud push |
| `src/lib/database.js:10112` (`getRecentWorkoutFeedback` body) | Also returns `session_difficulty`, `overall_pump` alongside fatigue | Same consumer set as above |

---

## FAMILY 5 — joint discomfort / pain

Storage: **two** fields — `workout_sets.joint_discomfort` (per-set) and
`workouts.joint_discomfort` (per-session summary, added v4), plus
`weekly_checkins.joint_pain` (boolean, post-week).

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/WorkoutSummaryScreen.js:68,106,179,475,542-555,1742` (feedback form) | Captures per-session `jointDiscomfort` 0-3 | `updateWorkout` |
| `src/screens/CoachReviewScreen.js:172,454` (`loadData` / deload-gate) | `.jointPain`/`.jointDiscomfort` on checkins+workouts | Deload recommendation gating |
| `src/lib/programmeEpoch.js:66,250,283` (`slotVerdict`) | Repeated joint discomfort → `SLOT_VERDICT.REPLACE` with `SLOT_REASON.JOINT_DISCOMFORT` | **Exercise-swap suggestion engine** (`RoutineDetailScreen` swap prompts) |
| `src/lib/mesocycle.js:232,241` (deload-advisory) | `jointDiscomfort>=3` → immediate deload signal; `jointAlerts` count | `CoachReviewScreen` |
| `src/lib/algorithms.js:741,754,990-1021` (`buildLast4WeekDeloadBuckets`; `computeAdaptiveLandmarks`'s `quality` term) | Weekly joint-discomfort average/series; landmark-quality penalty | Deload banners; adaptive MEV/MAV/MRV personalisation |
| `src/lib/recoveryEMA.js:58` (`computeRecoveryEMAs`) | `maxJointDiscomfort`/`jointDiscomfort` EMA | `MesocycleBuilderScreen`, `ReadinessCards`, `insightsEngine` (dead path) |
| `src/lib/blockLedgerGather.js:315` (evidence aggregation) | Per-workout `joint` evidence point + `jointDiscomfortAvg` | Block ledger |
| `src/lib/blockLedgerRunner.js:386` (ledger record assembly) | Carries `jointDiscomfortAvg` into the stored ledger | `mesocycles.block_ledger` |
| `src/lib/interBlock.js:132,374` (`classifyMuscleBlock`) | `jointDiscomfortAvg >= JOINT_HIGH` weighs toward `OVERREACHED` classification | Block classification → `learnedRange.js`, `blockSeed.js`, next-block advisor |
| `src/lib/blockMetrics.js:86,147,425` (`LATE_JOINT_OK`, per-workout joint map) | Late-block joint average | Block ledger / classification |
| `src/components/ReadinessCards.js:208` | `.maxJointDiscomfort`/`.jointDiscomfort` count | Readiness gauge |
| `src/lib/database.js:10079,10092` (`getSessionAdjustmentSignals`) | Per-muscle latest `joint_discomfort` | `sessionAdjustments.js` in-session load auto-regulation |
| `src/lib/weeklyCoach.js:1236-1253,2508` (`jointPainFlagged`) | Weekly-checkin `jointPain` → coaching safety-hold | `coachRegister.js:205`, `coachResponse.js:281`, `coachOutput/viewCopy.js:54,93` (coach copy + autonomy-hold) |
| `src/lib/sync.js:431,489` (push) | `joint_discomfort` on both `workouts` and `workout_sets` payloads | Cloud push |
| `src/lib/sync/tables/weeklyCheckins.js:73` (registry push) | `joint_pain: c.jointPain` | Cloud push (this table **is** migrated to the new registry) |

---

## FAMILY 6 — exercise swaps

Storage: `exercise_swaps` table (`src/lib/database.js:2205`).
Access: `recordExerciseSwap:9842`, `getExerciseSwaps:9859`,
`getAllExerciseSwapsForUser:10459`, `insertOrUpdateExerciseSwapFromCloud:10544`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/RoutineDetailScreen.js:543` (swap-confirm handler) | `recordExerciseSwap` — writes the swap as evidence | Future ranking via `exercise/intent.js` |
| `src/screens/ActiveWorkoutScreen.js:1090` (`handleConfirmSwap`, 1048-1122) | `recordExerciseSwap` (in-session swap) | Same |
| `src/lib/exercise/intent.js:86` (`loadExerciseIntentState`) | Folds swap history into the canonical intent/ranking state | Every screen listed under Family 7/8 below |
| `src/lib/sync.js:1240,2471` (push/pull) | `getAllExerciseSwapsForUser` / `insertOrUpdateExerciseSwapFromCloud` | Cloud sync (legacy `sync.js`) |

---

## FAMILY 7 — exercise_intent (all kinds)

Storage: `exercise_intent` table (`src/lib/database.js:2192`). Kinds:
`EXERCISE_INTENT` enum (`database.js:9728`) — `EXCLUDED`, `AVOIDED_BLOCK`,
`PATTERN_AVOID` (and others per the enum).
Access: `setExerciseIntent:9756`, `clearExerciseIntent:9791`,
`getExerciseIntents:9811`, `getAllExerciseIntentsForUser:10449`,
`insertOrUpdateExerciseIntentFromCloud:10495`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/lib/exercise/intent.js:34,70-97` (`loadExerciseIntentState`) | THE canonical load point — combines intents+swaps+slot-defaults+usage+progression into one state object | `RoutineDetailScreen.js`, `PlansScreen.js`, `ActiveWorkoutScreen.js`, `AvoidedMovementsScreen.js`, `ExercisePickerModal.js`, `PlanLibraryScreen.js`, `BuildWorkoutScreen.js`, `src/lib/blockAdvisor.js` |
| `src/screens/RoutineDetailScreen.js:389,502` (`handleExcludeExercise`) | `clearExerciseIntent` / `setExerciseIntent` | Exercise picker exclusion state |
| `src/screens/ActiveWorkoutScreen.js:682,686` (avoid-label render) | Reads `EXERCISE_INTENT` kind to label an avoided exercise in-session | In-session swap-prompt copy |
| `src/screens/AvoidedMovementsScreen.js:39,43` | Renders each intent row's expiry/duration | Settings-style "avoided movements" list screen |
| `src/lib/exercise/movementConstraints.js:32,37,41,51` (duration-mapped wrapper) | Thin wrapper over `setExerciseIntent`/`clearExerciseIntent` for the PATTERN_AVOID family-scoped flow | Called from the injury/constraint UI (RoutineDetailScreen exclude flow) |
| `src/components/ExercisePickerModal.js:622` | `clearExerciseIntent` (undo-exclude action) | Exercise picker |
| `src/components/ExerciseConflictSheet.js:83` | `clearExerciseIntent` (resolve-conflict action) | Exercise-conflict resolution sheet |
| `src/lib/sync.js:1209,2441,2445` (push/pull) | `getAllExerciseIntentsForUser` / `insertOrUpdateExerciseIntentFromCloud` | Cloud sync (legacy `sync.js`) |

---

## FAMILY 8 — exercise slot defaults

Storage: `exercise_slot_defaults` table (`src/lib/database.js:2219`).
Access: `setExerciseSlotDefault:9878`, `clearExerciseSlotDefault:9907`,
`getExerciseSlotDefaults:9920`, `getAllExerciseSlotDefaultsForUser:10469`,
`insertOrUpdateExerciseSlotDefaultFromCloud:10574`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/RoutineDetailScreen.js:565` (swap-confirm "always use this" option) | `setExerciseSlotDefault` | Future slot-fill default |
| `src/lib/exercise/intent.js:87` (`loadExerciseIntentState`) | Folds slot defaults into the combined intent state | Same consumer list as Family 7 |
| `src/lib/sync.js:1310,2528` (push/pull) | `getAllExerciseSlotDefaultsForUser` / `insertOrUpdateExerciseSlotDefaultFromCloud` | Cloud sync |

`clearExerciseSlotDefault:9907` has no confirmed call site outside `database.js`
in production code (only referenced in tests) — UNVERIFIED, see final section.

---

## FAMILY 9 — session resolutions

Storage: `session_resolutions` table (`src/lib/database.js:2508`). Values
include `resolution` (e.g. `ended_early`, `skipped`).
Access: `recordSessionResolution:5261`, `finishWorkoutWithSessionResolution:5281`,
`getSessionResolutionsForWeek:5310` (no external caller — unused),
`getAllSessionResolutionsForUser:5324`, `getLiveSessionResolutions:5338`,
`insertOrUpdateSessionResolutionFromCloud:5344`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/HomeScreen.js:1375` (`handleSkipThisWorkout`, 1358-1413) | `recordSessionResolution` (skip) | Programme-position resolver |
| `src/screens/ActiveWorkoutScreen.js:2835` (`runFinish`, 2967 boundary — call site is inside the finish-flow just above `doFinish`/`runFinish`) | `finishWorkoutWithSessionResolution` (ended-early / completed) | Same |
| `src/lib/programmePosition.js:113-114` (`resolveProgrammePosition`) | `getLiveSessionResolutions` — used to tell a genuinely-finished session from a partial one | Calendar/week-position logic feeding HomeScreen's recovery-phase gate (per the code's own C18 comment) |
| `src/lib/database.js:5100-5118` (`getBlockTrainingData`) | Cross-references `session_resolutions.resolution='ended_early'` against `workouts` to build `fullyCompletedWorkouts` (a stricter subset than "closed") | `blockLedgerRunner.js`, `blockAdvisor.js`, `planAutoGen.js` (block-evidence adherence) |
| `src/lib/sync.js:1084,2947` (push/pull) | `getAllSessionResolutionsForUser` / `insertOrUpdateSessionResolutionFromCloud` | Cloud sync |

---

## FAMILY 10 — planned_muscle_volume / planned volume

Storage: `planned_muscle_volume` table (`src/lib/database.js:517`).
Access: `generateInitialPlannedVolume:4942`, `getPlannedMuscleVolumeForBlock:5134`,
`getPlannedMuscleVolume:5416` (singular, per-week), `upsertPlannedMuscleVolume:5477`,
`getAllPlannedMuscleVolumeForUser:8286`, `insertOrUpdatePlannedMuscleVolumeFromCloud:9385`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/lib/database.js:4500` (`activatePlanWithBlock`) | `generateInitialPlannedVolume` — seeds week-1 planned sets from landmarks/ledger | New-block activation |
| `src/screens/CoachOutputScreen.js:1281,1353` (`handleApplyTraining` 1270-1342; `handleApplyDeload` 1342-1397) | `getPlannedMuscleVolume` then `upsertPlannedMuscleVolume` | Applies the weekly coach's volume adjustment |
| `src/screens/CoachOutputScreen.js:1786` (`load`, 1470-2284) | `getPlannedMuscleVolumeForBlock` | Coach-output block-volume review |
| `src/screens/HomeScreen.js:1208,1274` (`loadBlockProgress`, 1164-1297) | `getPlannedMuscleVolumeForBlock`, `getPlannedMuscleVolume` | Home block-progress panel |
| `src/lib/blockLedgerRunner.js:253` (`computeAndStoreBlockLedger`) | `getPlannedMuscleVolumeForBlock` | Block-ledger adherence (planned vs completed sets) |
| `src/lib/sessionAdjustments.js:55` (session-prescription build) | `getPlannedMuscleVolumeForBlock` | In-session load/set-count adjustment |
| `src/hooks/useProgressData.js:238` (`loadBlockState`, 231-250) | `getPlannedMuscleVolume(week.id)` | Analytics/Volume progress hook |
| `src/lib/sync.js:1452,2630` (push/pull) | `getAllPlannedMuscleVolumeForUser` / `insertOrUpdatePlannedMuscleVolumeFromCloud` | Cloud sync |

---

## FAMILY 11 — block ledger / block classifications / blockSeed

Storage: `mesocycles.block_ledger` (TEXT JSON, `database.js:2123`) and
`mesocycles.block_type` (`database.js:501`). Engine: `src/lib/blockSeed.js`
(seeding fallback resolver), `src/lib/blockLedgerRunner.js` (orchestrator),
`src/lib/blockLedgerGather.js` (evidence aggregation), `src/lib/blockAdvisor.js`
(next-block recommendation), `src/lib/interBlock.js` (block classification),
`src/lib/nextBlockPreview.js` (adjust-preview copy).
Access: `storeBlockLedger:5388`, `getBlocksWithTrainingEvidence:5067`,
`getBlockTrainingData:5086`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/lib/blockLedgerRunner.js:computeAndStoreBlockLedger:213` | Full block-ledger computation (adherence, recovery aggregates, classification) then `storeBlockLedger` | Everything below reads the stored `block_ledger` JSON |
| `src/lib/blockLedgerRunner.js:getAchievedWeeklyPeaks:454`, `computeLiveBlockSlopePct:500` | Peak-week/slope derivations from the ledger | `src/screens/CoachOutputScreen.js:1359-1360,1804-1805` (both `require`d lazily inside `load`/a later handler) |
| `src/lib/blockLedgerRunner.js:backfillMissingBlockLedgers:571`, `buildSeedRangesForNextBlock:740`, `buildLearnedSeedRangesForActivation:672`, `recordSeedOutcome:836` | Next-block volume-range seeding from ledger history | `src/screens/PlansScreen.js:372,394,397,538,546,588,596` (block-restart/activation flow) |
| `src/lib/blockAdvisor.js:getBlockAdvice:663` | Recommendation (repeat/adjust/new) from ledger + checkins + training evidence | `src/screens/PlansScreen.js:342` |
| `src/screens/BlockReflectionScreen.js:145,162,166,172` | `getBlockReflectionData` (database.js:7878) + `computeAndStoreBlockLedger` + **direct read of `meso.blockLedger`** | End-of-block reflection screen |
| `src/screens/HomeScreen.js:1228,1230,1264` (`loadBlockProgress`, 1164-1297) | **Direct read of `m.blockLedger`** (parsed JSON) from a prior mesocycle, bypassing any accessor function | Home block-progress panel's "last block" comparison |
| `src/lib/planAutoGen.js:193,203` | Parses `m.blockLedger` directly + `getBlockTrainingData` | Auto-plan generation's continuity/evidence checks |
| `src/lib/programmePosition.js:113` (`resolveProgrammePosition`) | `getBlockTrainingData` | Calendar/week-position resolver |
| `src/lib/interBlock.js:classifyMuscleBlock` | Per-muscle block classification (RESPONSIVE/OVERREACHED/etc.) from recovery+adherence | `src/lib/learnedRange.js`, `src/lib/blockSeed.js`, `src/lib/blockLedgerRunner.js` |
| `src/lib/sync.js:1015,1038-1041` (push) | `block_type: m.blockType`, `block_ledger: JSON.parse(m.blockLedger)` | Cloud push (legacy `sync.js`) |
| `src/lib/database.js:8881,8909-8932` (`insertMesocycleFromCloud`) | LWW merge of incoming vs local `block_ledger` by embedded `version` | Cloud→local pull |

---

## FAMILY 12 — adaptation_events

Storage: `adaptation_events` table (`src/lib/database.js:529`).
Access: `createAdaptationEvent:5398`, `getRecentAdaptationEvents:5430`,
`getAllAdaptationEventsForUser:8306`, `insertOrUpdateAdaptationEventFromCloud:9641`,
`runAdaptationEventBatch:9715`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/WorkoutSummaryScreen.js:845` (`createAdaptationEvents`, WorkoutSummaryScreen.js:864 is the logError context for this same block) | Logs an engine decision (e.g. load-adjustment reason) at session-finish | Adaptation-event log |
| `src/store/useAppStore.js:1296` (store-level adaptation write, alongside the watch-bridge set-commit path) | `createAdaptationEvent` | Same |
| `src/lib/sessionAdjustments.js:127,173` (session-prescription build) | Reads `getRecentAdaptationEvents(userId,6)` as a rolling-window input, then writes new ones | In-session load/rep auto-regulation |
| `src/components/EngineLog.js:71` | `getRecentAdaptationEvents(userId,4)` | Coach "why this decision" transparency panel (`CoachOutputCards.js`, `CoachHeldHistoryScreen.js`) |
| `src/lib/sync.js:1493,2655,2659` (push/pull) | `getAllAdaptationEventsForUser` / `insertOrUpdateAdaptationEventFromCloud` / `runAdaptationEventBatch` | Cloud sync |

---

## FAMILY 13 — exercise history / recent performance recall

Access: `getCompletedSetHistoryForExercise:3577`, `getWorkoutSetsForExercise:3589`
(unused), `getPreviousWorkoutSets:3600` (unused), `getLastNWorkoutSets:3617`,
`getAllCompletedSetsForExercise:3637`, `getExerciseUsageStats:9941`,
`getExerciseProgressionSessions:9967`, `getProgressionTeaser:9036`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/ExerciseDetailScreen.js:334,347` | `getCompletedSetHistoryForExercise`, then `detectPlateau` | Per-exercise history chart + plateau flag |
| `src/screens/ActiveWorkoutScreen.js:1565,1567,1650` | `getLastNWorkoutSets`, `getAllCompletedSetsForExercise`, `getWeek1SetsForExercise` | In-session "last time" / week-1-anchor prescription |
| `src/screens/HomeScreen.js:1105` (`loadNextWorkout`, 1297-1358) | `getProgressionTeaser(user.id, lastWorkoutId, prevWorkoutId)` | Home "since last time" teaser copy |
| `src/lib/exercise/intent.js:88-97` (`loadExerciseIntentState`) | `getExerciseUsageStats`, `getExerciseProgressionSessions` → `detectProgressionConsistency`, `detectPlateau` | Exercise-swap/default ranking (feeds Family 6/7/8 screens) |
| `src/lib/plateauSurfacing.js:63` | `detectPlateau(sessions.map(s=>s.sets))` | Plateau banner surfacing (consumer of the same per-session arrays gathered above) |
| `src/lib/livePrescription.js:652,662` | `getLastNWorkoutSets`, `getWorkoutById` | In-session live prescription |

`getWorkoutSetsForExercise` and `getPreviousWorkoutSets` — confirmed no call
site outside `database.js` — unused/reserved.

---

## FAMILY 14 — PRs / records

Engine: `src/lib/algorithms.js:calculate1RM:101`, `detectPR:389`,
`bestPRPerExercise:524`. Access: `getWeeklyPRCount:7486`, `getBestLiftThisWeek:7557`
(delegates to `src/lib/bestLift.js:pickBestLift:40`).

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/ActiveWorkoutScreen.js:77` (import), used inside `handleCompleteSet` (1851-2347) | `src/lib/workoutRecordLine.js:buildRecordLine:54` (uses `calculate1RM`+`detectPR`) | In-session PR celebration banner |
| `src/screens/CoachOutputScreen.js:1544` (`handleApplyTraining`-adjacent load, inside `load` 1470-2284) | `getWeeklyPRCount` | Weekly coach output copy |
| `src/screens/CoachOutputScreen.js:2497` (`handleShareWeek`, 2492-2601) | `getBestLiftThisWeek` | `src/lib/shareCard/greatWeek.js:buildWeeklyRecapParams:87` — **share-card export of the week's best lift (weight+reps)** |
| `src/screens/WeeklyCheckInScreen.js:446` (`useEffect`, weekly PR count) | `getWeeklyPRCount` | Check-in screen's own recap |
| `src/screens/WeeklyStoryScreen.js:81` | `getWeeklyPRCount` | "Connected weekly story" narrative screen (composes existing coach-domain reads; Pro-gated identically to CoachOutputScreen per its own header comment) |
| `src/screens/BlockReflectionScreen.js:145` | `getBlockReflectionData` (includes PR-adjacent stats) | End-of-block reflection screen |
| `src/screens/YearOfLiftsScreen.js:572,577,584,591,596,597` (`load`, 556-641) | `getRecapData`, `getBlockReflectionData`, `getYearOfLiftsData`, `getLifetimeTonnage`, `getLifetimeWorkoutStats` | "Year of Lifts" recap/story screen (`StoryCard`, `handleShareYear:685`) |
| `src/screens/CascadeGateScreen.js:195,199` | `getRecapData`, `getWeeklyPRCount` | **Billing cascade/downgrade gate screen** — "what you'd lose" copy built from PR/training-recap data |
| `src/lib/coachReport.js:265` | `getRecapData` | Coach-domain report builder |
| `src/lib/partners/weekSignalWriter.js:51` | `getWeeklyPRCount` — `hitPb` boolean | **Accountability-partner weekly signal** (shared with a training partner) |
| `src/screens/LiftProgressScreen.js:26-28` | `buildLiftProgressRows`, `buildExerciseMetricSeries`, `derivePRIndices`, `getStrengthLevel`, `summariseStrengthStanding` | Lift-progress screen (strength-standard tier display) |
| `src/lib/athleteProfileSummary.js:1-2` | Same `liftProgress`/`strengthStandards` functions | `src/screens/AthleteProfileScreen.js` |

---

## FAMILY 15 — programme structure memory / demonstrated split

Engine: `src/lib/programmeStructureMemory.js` — `structureKey:58`,
`blockOutcomeFromLedger:126`, `structureEvidence:166`,
`demonstratedStructure:205`, `structureMemoryCopy:239`. Inputs are block-ledger
records (Family 11) plus `mesocycles.block_type`, not a separate table.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/lib/planAutoGen.js:184` (lazy `require`) | `structureEvidence`, `demonstratedStructure`, `blockOutcomeFromLedger` over the user's block-ledger history | Auto-generated next plan's structure choice |
| `src/screens/PlanUpdateScreen.js:19` | `structureMemoryCopy(demonstrated, splitLabel)` | Plan-update screen's explanatory copy |

---

## FAMILY 16 — recovery EMA / readiness

Engine: `src/lib/recoveryEMA.js` — `emaValue:23`, `computeRecoveryEMAs:48`,
`emaWeekOverWeekPct:77`, `dailySeries:97`. `src/lib/readinessSummary.js:buildReadinessSummary:80`.
Inputs are Family 1/3/4/5 fields on already-fetched workout rows — no dedicated table.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/MesocycleBuilderScreen.js:26` (import), used in `loadActiveStats` | `computeRecoveryEMAs` | Active-mesocycle dashboard |
| `src/components/ReadinessCards.js:22` | `computeRecoveryEMAs` | Readiness gauge cards |
| `src/screens/HomeScreen.js:101` (import) | `buildReadinessSummary` | Home readiness-summary chip |
| `src/lib/insightsEngine.js:15,95,170-192` (`generateInsights`) | `computeRecoveryEMAs`, `emaWeekOverWeekPct`, `calculateWeeklyVolume` for `recovery_warn`/`under_mev_muscle`/`stalled_lift`/`peaked_lift` insight types | **DEAD IN PRODUCTION** — `runInsightsEngine`/`getActiveInsights`/`persistInsights`/`dismissInsight` (database.js:5860-5981) have no live screen/component caller; the only production entry point (`AnalyticsScreen.js`) is explicitly guarded against reintroducing them (`src/screens/__tests__/AnalyticsScreen.campaign23.guard.test.js:31-40`, asserting no `insightsEngine`/`runInsightsEngine`/`dismissInsight`/`InsightRow`). Confirmed via repo-wide grep: `runInsightsEngine`/`getActiveInsights` appear only in `database.js` and test mocks (`useProgressData.test.js:19,67`, `screen-mount.test.js:1212`) |
| `src/lib/blockLedgerRunner.js:computeLiveBlockSlopePct:500` (comment cross-ref in `weeklyCoach.js:609`) | Live within-block trend slope | `CoachOutputScreen.js:1804-1805` |
| `src/lib/effectiveLandmarks.js:getAdaptedLandmarks:151` → `database.js:getAdaptiveLandmarkHistory:6543` | Recovery-informed personalised MEV/MAV/MRV | `getEffectiveLandmarks` (`WorkoutSummaryScreen`, `CoachReviewScreen`, `AnalyticsScreen`, `VolumeHeatmapScreen`, `blockLedgerRunner.js`, `blockSeed.js`) |
| `src/lib/widgets/writer.js:gatherWidgetInputs:29` (via `getCurrentMesocycleWeek`, `getWeeklySessionStats`) | Week-in-block position feeding the **home-screen widget** | `src/widgets/widgets.js`, `src/widgets/widgetTaskHandler.js` |

---

## FAMILY 17 — check-in answers

Storage: `weekly_checkins` table (`src/lib/database.js:566`).
Access: `saveWeeklyCheckin:7192`, `getLatestCheckin:7286`, `getRecentCheckins:7306`,
`getCheckinsInRange:5203`, `getAllWeeklyCheckinsForUser:8172`,
`insertWeeklyCheckinFromCloud:8618`. This table **is** on the new sync registry:
`src/lib/sync/tables/weeklyCheckins.js`.

| READER | WHAT IT COMPUTES/FEEDS | ONWARD CONSUMER |
|---|---|---|
| `src/screens/WeeklyCheckInScreen.js:503,795,822-826` | `getLatestCheckin` (pre-fill) then `saveWeeklyCheckin` | Check-in write; safety notes on `jointPain` |
| `src/screens/YouScreen.js:237` | `getLatestCheckin` | Coach-home tile |
| `src/screens/CoachOutputScreen.js:1471,1493,1616` (`load`, 1470-2284) | `getLatestCheckin`, `getRecentCheckins(4)` | Weekly coach output build |
| `src/screens/CoachReviewScreen.js:321` (`loadData`) | `getRecentCheckins(4)` | Weekly volume/deload recommendation |
| `src/screens/NotificationSettingsScreen.js:287`, `src/screens/CoachingRemindersScreen.js:300` | `getLatestCheckin` | **Notification-settings/reminders screens** — gates preview copy on check-in recency |
| `src/screens/HomeScreen.js:517,552,837` | `getLatestCheckin`, `getAllWeeklyCheckinsForUser`, `getRecentCheckins(3)` | Home readiness/coach-brief tiles |
| `src/lib/blockAdvisor.js:671` (`getBlockAdvice`) | `getRecentCheckins(userId,8)` | Next-block recommendation's checkin-readiness input (`checkinReadiness:49`) |
| `src/lib/blockLedgerRunner.js:255` (`computeAndStoreBlockLedger`) | `getCheckinsInRange` | Block ledger |
| `src/components/ReadinessCards.js:218` | `getRecentCheckins(userId,6)` | Readiness gauge cards |
| `src/lib/notifications/handler.js:101-133`, `src/lib/notifications/scheduler.js:658-659,1049` | `getLatestCheckin` | **Notification content/scheduling** — missed-checkin nudges, reminder copy |
| `src/lib/database.js:10101` (`getSessionAdjustmentSignals`) | `getLatestCheckin` → `soreMuscles`, `checkinAt` | In-session load auto-regulation |
| `src/lib/weeklyCoach.js`, `src/lib/coachRegister.js`, `src/lib/coachResponse.js`, `src/lib/coachOutput/viewCopy.js` | Consume the checkin object already fetched above (`jointPain`, `sorenessScore`, `stressScore`, `energyScore`, `trainingPerformance`, `calsAdherence`) | Weekly coach decisions and copy |
| `src/lib/sync/tables/weeklyCheckins.js:54,73,132` | `getAllWeeklyCheckinsForUser` / push mapping / `insertWeeklyCheckinFromCloud` | Cloud sync (registry-based, not legacy `sync.js`) |

---

## HIDDEN CONSUMERS

Every reader confirmed above that is **not** part of plan generation, workout
logging, coach output, or progression/stats. These are the contamination paths
the campaign is asking about.

| SURFACE TYPE | READER | TRAINING-EVIDENCE FAMILY TOUCHED |
|---|---|---|
| **Share card** | `src/lib/shareCard/greatWeek.js:buildWeeklyRecapParams:87` via `src/screens/CoachOutputScreen.js:handleShareWeek:2492` → `getBestLiftThisWeek` | 14 (PRs/best lift) |
| **Export** | `src/lib/database.js:buildWorkoutCSV:5801` via `src/screens/SettingsDataScreen.js:137` | 1, 2 (raw workouts + sets → CSV) |
| **Export/import** | `src/lib/importExternal.js` via `src/screens/ImportScreen.js` | 1, 2 (writes directly, see DIRECT-SQL BYPASSES) |
| **Home/today surface** | `src/components/FatigueTrendCard.js` (on `HomeScreen.js`, `ConsistencyScreen.js`) | 4 (fatigue) |
| **Home/today surface** | `src/components/CoachBriefCard.js` + `src/lib/homeCoachBrief.js` (on `HomeScreen.js`, `ConsistencyScreen.js`) | 4 (fatigue) |
| **Home/today surface** | `src/components/ReadinessCards.js` (on `MesocycleBuilderScreen.js`, `ConsistencyScreen.js`, `ProSetupCompleteScreen.js`) | 1, 2, 3, 4, 5, 13, 16, 17 |
| **Home/today surface** | `src/screens/HomeScreen.js:1228-1264` direct `blockLedger` read | 11 (block ledger) |
| **Widget** | `src/lib/widgets/writer.js:gatherWidgetInputs:29` → `src/widgets/widgets.js`, `src/widgets/widgetTaskHandler.js` | 9 (session resolution/position), 16 (week-in-block via `getCurrentMesocycleWeek`), 1 (`getWeeklySessionStats`) |
| **Notifications** | `src/lib/notifications/scheduler.js`, `handler.js`, `trainingHabitSchedule.js` | 1 (workouts), 17 (check-ins) |
| **Billing** | `src/screens/CascadeGateScreen.js:195,199` — `getRecapData`, `getWeeklyPRCount` | 1, 14 (training recap + PR count feeding the trial/downgrade "what you'd lose" screen) |
| **Partner/social** | `src/lib/partners/weekSignalWriter.js:51` — `getWeeklyPRCount` (`hitPb`) | 14 (PRs), surfaced to an accountability partner |
| **Food/body domain** | `src/lib/recompReframe.js:deriveRecomp` via `src/screens/BodyMetricsScreen.js:639,825` — `buildLiftProgressRows` over `getWorkoutSetsSince` | 2 (load/weight → estimated-1RM trend) |
| **Analytics/telemetry** | `src/lib/engineTelemetry.js:track` imported by `src/lib/food/waterfall.js`, `src/lib/food/writeback.js`, `src/lib/food/mealPlanService.js` (food-domain files posting named telemetry events) — payload content not fully audited; flagged as UNVERIFIED whether any training-evidence values are embedded (see final section) | Potential 2/14 |
| **Notification settings** | `src/screens/NotificationSettingsScreen.js:287`, `src/screens/CoachingRemindersScreen.js:300` | 17 (check-in recency) |
| **Connected narrative screen** | `src/screens/WeeklyStoryScreen.js:81` — `getWeeklyPRCount`; composes existing coach-domain reads across training/eating/body/decision. Borderline: Pro-gated and framed as coach-adjacent by its own header, but is a distinct screen outside the four named domains, so listed here for completeness | 1, 14 |
| **Recap/story screen** | `src/screens/YearOfLiftsScreen.js:load:556` — `getRecapData`, `getBlockReflectionData`, `getYearOfLiftsData`, `getLifetimeTonnage`, `getLifetimeWorkoutStats`, plus `handleShareYear:685` (share export) | 1, 2, 14 |
| **Coach-decision transparency (borderline)** | `src/components/EngineLog.js` (on `CoachOutputCards.js`, `CoachHeldHistoryScreen.js`) | 2, 12 — noted but classified as coach-domain (explains coach decisions), not counted as hidden in the family tables above; listed here only for completeness since it is its own component outside `weeklyCoach.js`/`coachApply.js` proper |

---

## DIRECT-SQL BYPASSES

Raw table-name SQL outside `database.js` / `food/db.js`.

| FILE | TABLES TOUCHED | DETAIL |
|---|---|---|
| `src/lib/importExternal.js:283,300,362,373,402,481` | `exercises` (SELECT, INSERT OR IGNORE), `workouts` (SELECT, INSERT), `workout_sets` (INSERT) | Hevy/Strong CSV import (`analyzeImport:279`, `runImport:325`) writes `workouts`/`workout_sets`/`exercises` directly with hand-built `INSERT` statements, entirely bypassing `createWorkout`/`createWorkoutSet`/`insertExercise`. Used by `src/screens/ImportScreen.js`. This is the only production file found doing this — repo-wide search for `FROM workouts|INTO workouts|UPDATE workouts`, `FROM workout_sets|INTO workout_sets|UPDATE workout_sets`, and the equivalent for `weekly_checkins`, `session_resolutions`, `planned_muscle_volume`, `adaptation_events`, `exercise_intent`, `exercise_swaps`, `exercise_slot_defaults`, `mesocycles` returned only `database.js` and test files for every other table. |

No other family's table has a confirmed direct-SQL bypass.

---

## GUARD TESTS

Per family, test suites whose names/content were observed pinning that family's
behaviour (not exhaustively re-read line-by-line; listed from direct grep hits
during this sweep).

| FAMILY | GUARD-TEST SUITES (all under `__tests__/`) |
|---|---|
| 1 — workouts | `workoutTombstoneConvergence.test.js`, `incompleteWorkoutDelete.test.js`, `cloudRestoreLWW.test.js`, `campaign18.hostileLifecycle.test.js`, `blockWeekResolver.test.js`, `campaign15.matureAthleteRestore.test.js`, `campaign7.upgrade.test.js`, `campaign6.lapse90.test.js` |
| 2 — workout sets / load / RIR | `campaign10m.estMaxRecordConsistency.test.js`, `database.recentlyUsedExerciseIds.test.js`, `coachCoherenceTrace.test.js`, `workoutSetEdit.test.js`, `clusterSet.test.js`, `supersetPractical.test.js`, `workoutHelpers.test.js`, `detectPR.firstLift.test.js` |
| 3 — soreness | `blockMetrics.stage3.test.js`, `readinessSummary.test.js`, `algorithms.deloadBuckets.test.js`, `campaign10k.doseResponseRecovery.test.js`, `campaign10g.blockEvidence.test.js`, `blockLedgerGather.stage6.test.js`, `campaign1.integrity.test.js`, `MesocycleBuilderScreen.noDeloadAdvisory.guard.test.js` |
| 4 — fatigue | `recoveryEMA.test.js`, `readinessSummary.test.js`, `weeklyCoach.stage4.fatigueContext.test.js`, `campaign5.firstUse.test.js` |
| 5 — joint discomfort/pain | `campaign16.programmeEpoch.test.js`, `coachTrainingExecution.test.js`, `CoachReviewScreen.recoveryGate.test.js`, `CoachReviewScreen.setCountNotInflated.test.js`, `campaign1.integrity.test.js`, `campaign10e.test.js`, `weeklyCoach.signals.audit.test.js`, `interBlock.stage2.test.js`, `campaign10j.earlyDeloadEvidence.test.js`, `WorkoutSummaryScreen.feedback.guard.test.js` |
| 6 — exercise swaps | `campaign9.exerciseIntentSync.test.js`, `campaign14.manualIntent.test.js`, `campaign8.manualIntent.test.js`, `exercise/__tests__/campaign9.closeout.test.js` |
| 7 — exercise_intent | `campaign9.exerciseIntentSync.test.js`, `campaign16.qualityLaws.test.js`, `exercise/__tests__/campaign9.closeout.test.js`, `campaign14.manualIntent.test.js`, `campaign8.manualIntent.test.js` |
| 8 — exercise slot defaults | `campaign9.exerciseIntentSync.test.js`, `exercise/__tests__/campaign9.closeout.test.js` |
| 9 — session resolutions | `blockWeekResolver.test.js`, `campaign18.hostileLifecycle.test.js` |
| 10 — planned_muscle_volume | `campaign16.volumeIntegrity.test.js`, `campaign13.trainingIntelligence.test.js` |
| 11 — block ledger/classification/blockSeed | `blockLedgerGather.stage6.test.js`, `blockSeed.stage6.test.js`, `campaign6.sixBlock.test.js`, `campaign6.applyRepeat.test.js`, `campaign6.longitudinal.test.js`, `campaign6.dividend.test.js`, `campaign6.athlete180.test.js`, `campaign10i.engineConsistency.test.js`, `campaign10j.earlyDeloadEvidence.test.js`, `interBlock.stage2.test.js`, `learnedRange.stage5.test.js`, `adaptiveBlock.e2e.test.js`, `coachAdversarial.test.js`, `coachCoherenceTrace.test.js`, `campaign10n.learnedFreshness.test.js` |
| 12 — adaptation_events | `campaign13.trainingIntelligence.test.js` (plus the sessionAdjustments/coach suites listed under 5/11 that exercise the same signal path) |
| 13 — exercise history/recall | `campaign16.qualityLaws.test.js`, `campaign10m.estMaxRecordConsistency.test.js` |
| 14 — PRs/records | `detectPR.firstLift.test.js`, `campaign10m.estMaxRecordConsistency.test.js` |
| 15 — programme structure memory | `programmeStructureMemory.test.js`, `programmeStructureMemory.production.test.js` |
| 16 — recovery EMA/readiness | `recoveryEMA.test.js`, `readinessSummary.test.js`, `recoveryWordingSource.test.js`, `AnalyticsScreen.campaign23.guard.test.js` (pins the insights pipeline as REMOVED — see Family 16 note), `AnalyticsScreen.stage3Guards.test.js`, `AnalyticsScreen.stateMatrix.test.js` |
| 17 — check-in answers | `checkinCoachAudit.guard.test.js`, `checkinIntegrity.a7.guard.test.js`, `campaign1.integrity.test.js`, `campaign10e.test.js`, `weeklyCoach.d15ExceededEscalation.test.js`, `weeklyCoach.d16AutonomyHold.test.js`, `sync/__tests__/sync.transport.test.js` |

---

## UNKNOWN / UNVERIFIED

- **`src/lib/engineTelemetry.js` payload content in the food domain.** `track()`
  is imported by `src/lib/food/waterfall.js`, `src/lib/food/writeback.js`, and
  `src/lib/food/mealPlanService.js`. Confirmed these files post named telemetry
  events; NOT verified whether any event payload embeds a training-evidence
  value (e.g. a set's weight/RIR) rather than food-domain-only data. Flagged
  rather than asserted either way.
- **`clearExerciseSlotDefault` (`database.js:9907`).** No call site found
  outside `database.js` in production code; only referenced in tests. Possibly
  dead, possibly reachable through a path this grep-based sweep did not surface
  (e.g. a dynamically-built string import). Not asserted as dead with the same
  confidence as `hasWorkoutOnDate`/`getFirstWorkoutDateOnOrAfter`/
  `getAllWorkoutSets`/`getWorkoutSetsForExercise`/`getPreviousWorkoutSets`/
  `getExerciseStimulusRatings`/`updateWorkoutSetPostRating`/
  `getSessionResolutionsForWeek`, each of which was cross-checked with a second,
  differently-worded grep pass.
- **`src/components/HomeBlockShapeSheet.js` and `src/components/SetEntry.js`.**
  Both matched an initial `rir|rpe|weight` grep; on inspection `HomeBlockShapeSheet.js`'s
  only hit is a glossary-tooltip string (`GLOSSARY.rir`), not a data read, and
  `SetEntry.js` is the in-session set-entry row (workout-logging domain, not
  hidden) — not tabulated further, but noted so their absence from the tables
  above isn't mistaken for an oversight.
- **`src/lib/telemetry/firsts.js`, `src/lib/telemetry/index.js`, `src/lib/partners/telemetry.js`, `src/lib/partners/service.js`.**
  Confirmed as `engineTelemetry` importers (17-file list under Family-adjacent
  research) but their event payloads were not individually opened; listed here
  rather than in the main tables since "what it computes/feeds" was not
  confirmed to first-hand line evidence for training-evidence content
  specifically (as opposed to partner/social-feature telemetry generally).
- **Native module glue (`modules/live-activity`, `modules/rest-timer-live`, `modules/progress-scan-image`).**
  Out of the stated `src/` scope for this sweep; not searched. If the Live
  Activity widget or rest-timer native surface reads set/weight/RIR data via a
  bridge this sweep would not have caught it — flagged for a follow-up sweep if
  the campaign needs native-layer coverage.
