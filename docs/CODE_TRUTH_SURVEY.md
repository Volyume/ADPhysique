# Volyume code-truth survey

Working document. Gitignored. **This file will not survive container teardown unless committed** — ask Claude to keep it if you want it preserved.

Every claim must carry a `file:line` reference. No interpretation, only verifiable facts. Findings (dead imports, drift candidates, missing wiring) flagged inline as **FLAG**.

Used by Phase 2 to audit every doc in the repo line by line.

---

## Index

### Screens (58)
- [x] ActiveWorkoutScreen.js
- [x] AddCustomFoodScreen.js
- [x] AnalyticsScreen.js
- [x] Article9ConsentScreen.js
- [x] AthleteHubScreen.js
- [x] BlockReflectionScreen.js
- [x] BodyMetricsScreen.js
- [x] BuildWorkoutScreen.js
- [x] CascadeGateScreen.js
- [x] CoachHeldHistoryScreen.js
- [x] CoachOutputScreen.js
- [x] CoachReviewScreen.js
- [x] CoachingRemindersScreen.js
- [x] CreditsScreen.js
- [x] DebugLogScreen.js
- [x] DiaryScreen.js
- [x] ExerciseDetailScreen.js
- [x] ExerciseLibraryScreen.js
- [x] FirstRunScreen.js
- [x] FoodInsightsScreen.js
- [x] FoodSearchScreen.js
- [x] GoalChangeSummaryScreen.js
- [x] GoalLockConsentScreen.js
- [x] HomeScreen.js
- [x] ImportScreen.js
- [x] LoginScreen.js
- [x] ManualBuilderScreen.js
- [x] MesocycleBuilderScreen.js
- [x] MyRecipesScreen.js
- [x] NotificationSettingsScreen.js
- [x] NutritionEducationScreen.js
- [x] NutritionTargetsScreen.js
- [x] OnboardingScreen.js
- [x] PRWallScreen.js
- [x] PaywallScreen.js
- [x] PlanDetailScreen.js
- [x] PlanLibraryScreen.js
- [x] PlansScreen.js
- [x] PrivacyPolicyScreen.js
- [x] ProGoalSetupScreen.js
- [x] ProOnboardingScreen.js
- [x] ProSetupCompleteScreen.js
- [x] ProUpgradeScreen.js
- [x] RecipeBuilderScreen.js
- [x] RoutineDetailScreen.js
- [x] ScanBarcodeScreen.js
- [x] ScanLabelScreen.js
- [x] SettingsScreen.js
- [x] ShareCardScreen.js
- [x] SubscriptionPolicyScreen.js
- [x] SubscriptionScreen.js
- [x] VolumeHeatmapScreen.js
- [x] WeeklyCheckInScreen.js
- [x] WelcomeScreen.js
- [x] WellbeingCheckScreen.js
- [x] WorkoutHistoryScreen.js
- [x] WorkoutSummaryScreen.js
- [x] YearOfLiftsScreen.js

### Lib (top-level, 43)
- [ ] accessibilityPrefs.js
- [x] algorithms.js
- [x] blockAdvisor.js
- [x] coachExport.js
- [x] coachingGoals.js
- [x] dailyNarrative.js
- [x] dataBackup.js
- [x] database.js
- [x] differentialPaywall.js
- [x] edPatternDetector.js
- [x] engineTelemetry.js
- [x] errorLog.js
- [x] feedback.js
- [x] formTips.js
- [x] haptics.js
- [x] health.js
- [x] importExternal.js
- [x] insightsEngine.js
- [x] links.js
- [x] mesocycle.js
- [ ] nutritionEngine.js
- [x] observability.js
- [x] phaseEngine.js
- [x] planAutoGen.js
- [x] planEngine.js
- [x] planSwitch.js
- [x] proGate.js
- [x] recoveryEMA.js
- [x] restSound.js
- [x] seedExercises.js
- [x] seedRoutines.js
- [x] sentry.js
- [x] storeReview.js
- [x] strengthStandards.js
- [x] supabase.js
- [x] swapEngine.js
- [x] sync.js
- [x] syncQueue.js
- [x] travelMode.js
- [x] units.js
- [x] weeklyCoach.js (already covered in screens-phase deep read)
- [x] wellbeing.js
- [x] whyThisTemplates.js

### Components (top-level, 27)
- [x] All 27 surveyed (tabular summary below)

### Components/food (9)
- [x] All 9 surveyed (tabular summary below)

### Subfolder libs (51 files)
- lib/food/ (13): csvExport, db, libraryDelta, normalisers/usdaToFood, ocr, ocrParser, sanityChecks, seed, sources/liveOff, sources/localCache, sources/usda, waterfall, writeback
- lib/notifications/ (12): activeWorkout, categories, channels, handler, index, listeners, permissions, preferences, quietHours, scheduler, telemetry, trainingReminders
- lib/observability/ (1): sentryScrub
- lib/payments/ (5): cascade, catalogue, index, playBilling, restore
- lib/sync/ (16): conflict, index, queue, registry, runner, tables/* (10), telemetry, transport
- lib/telemetry/ (4): events, index, sentryBridge, transport

---

## Findings register

A live list of FLAGs found during the survey, copied here for easy doc-audit cross-reference.

(empty — populated as survey progresses)

---

# Screens

## ActiveWorkoutScreen.js (2,427 lines)

**Purpose:** In-workout set-logging UI; primary surface during a session.

**Exports:** default `ActiveWorkoutScreen({ navigation, route })` (line 88). Private `ExercisePicker` component from line 1976.

**Reads from store (Zustand, shallow):** `user`, `units`, `activeWorkout`, `workoutExercises`, `currentExerciseIndex`, `workoutStartTime`, `lastActivityAt`, `accessibility.reduceMotion`.

**Writes to store:** `setCurrentExerciseIndex`, `setWorkoutExercises`, `addExerciseToWorkout`, `addSetToCurrentExercise`, `startRestTimer`, `endWorkout`, `updateLastActivity`.

**DB writes (verified call sites):**
- `createWorkoutSet` (line 679) — persists each logged set
- `updateWorkout` (line 935) — finalises workout
- `deleteIncompleteWorkout` (lines 1747, 1916) — discards abandoned workout
- `insertExercise` (line 2000) — user-created exercise from picker
- `markNoteShown` (line 1155) — marks coaching note as seen

**DB reads (verified):** `getAllCompletedSetsForExercise`, `getCurrentMesocycleWeek`, `getPlannedMuscleVolume`, `getWeek1SetsForExercise`, `getLastNWorkoutSets`, `getExerciseUserNote`, `getNextTimeNotes`, `getAllExercises`.

**Imports from src/lib:** `database` (15 functions), `algorithms` (7 functions: `detectPR`, `getProgressionSuggestion`, `computeSetTargets`, `calculate1RM`, `calculateTonnage`, `MUSCLE_DISPLAY_NAMES`, `generateDeloadPrescription`), `swapEngine.rankSwaps`, `formTips.FORM_TIPS`, `mesocycle.applyTimeCrunch`, `whyThisTemplates.getTimeCrunchMessage`, `planEngine.estimateWorkoutMinutes`, `observability.audit`, `errorLog.logError`, `haptics`.

**Imports from src/components:** `SetEntry`, `PlateCalculator`, `RestTimer`, `InfoTooltip`.

**Navigation:** `navigation.replace('WorkoutSummary', ...)` on finish (line 962). `navigation.goBack()` on discard/back (4 sites).

**Local state:** 24 `useState` hooks covering current set, previous + all-time sets, PR detection, elapsed time, modals (exercise picker, set type, plate calc, execution notes, swap, discard), time-crunch state, weekly plan vs actual volume, deload flag, ghost-set pre-fill.

**Key UI surfaces:**
- Set type picker (`SET_TYPE_OPTIONS` line 62): `straight` + `warmup` only. Display labels at line 52 also recognise `dropset`, `amrap`, `myo_reps`, `rest_pause`, `superset` — those are written by importer (`importExternal.js:199`), never by user picker.
- Plate calculator modal
- Rest timer
- Exercise swap modal via `rankSwaps`
- Time-crunch shortcut: cuts rest 30%, drops not-yet-started isolations, keeps main lifts
- PR celebration overlay
- Deload-week banner

**FLAG: Dead imports (imported, zero call sites):**
- `saveExerciseUserNote` — imported line 30, never called
- `updateWorkoutSetPostRating` — imported line 30, never called

**FLAG: Drift candidates for doc audits:**
- Does NOT persist per-set RIR — `DEFAULT_SET` line 49 has `rir: 2` but no UI; deliberate per `SetEntry.js:173-176`
- Does NOT persist per-side L/R reps — no `leftReps` / `rightReps` field
- Does NOT read or react to `volumeSignal` / `trainingSignal` from `weeklyCoach` — plan is not auto-adjusted from check-in
- Does NOT log set tempo or duration

---

# Lib (top-level)

## accessibilityPrefs.js (14 lines)

**Purpose:** AsyncStorage read helper for accessibility prefs.

**Exports:**
- `A11Y_PREFS_KEY = '@volyume_a11y_prefs'` (line 3)
- `async loadA11yPrefs()` (line 7) — returns parsed prefs object or `null` on miss/error

**Persistence:** Reads AsyncStorage key `@volyume_a11y_prefs`. No write helper here — callers that save prefs do so directly via AsyncStorage using the exported constant.

**Notes:** Errors swallowed; returns `null` on failure.

---

# Screens (continued)

## AddCustomFoodScreen.js (271 lines)

**Purpose:** Manual food entry form — creates a `custom_foods` row and logs a `food_entries` row in one flow.

**Exports:** default `AddCustomFoodScreen({ navigation, route })` (line 30).

**Reads from store:** `user`.

**Route params consumed:** `mealSlot` (default `'snack'`), `entryDate` (default today ISO), `prefillBarcode`, `prefillMacros`, `from`.

**DB writes:**
- `insertCustomFood(userId, food)` (line 92) — via `lib/food/db`
- `logFoodEntry(userId, entry)` (line 116) — via `lib/food/db`

**DB reads:** none.

**Engine/telemetry:**
- `audit('food.custom.create', ...)` (line 93)
- `track(userId, 'custom_food_created', ...)` (line 105) — dynamic require of `lib/engineTelemetry`

**Imports from src/lib:** `food/db` (`insertCustomFood`, `logFoodEntry`), `food/sanityChecks` (`checkFoodSanity`), `observability` (`audit`).

**Imports from src/components:** none beyond Ionicons.

**Navigation:** `navigation.goBack()` on save (line 127) or close.

**Local state:** 10 `useState` hooks (name, brand, servingG, kcal, protein, carbs, fat, fibre, quantityG, saving).

**Notes:**
- Sanity check at line 76 (`checkFoodSanity`); on fail, user gets "Numbers look off" Alert with Edit / Save anyway
- "Persisting the barcode to custom_foods is a phase 3 follow-up" comment line 38-39 — known gap
- Per-entry macros denormalised at log time so future edits to custom food don't rewrite history (comment line 113)

---

## AnalyticsScreen.js (1,393 lines)

**Purpose:** Progress tab. Charts and insights for completed training: tonnage trend, PRs over time, weekly volume per muscle, muscle freshness, deload alerts, fatigue trend, block progress, rep regressions.

**Exports:** default `AnalyticsScreen({ navigation })` (line 96).

**Reads from store:** `user`, `units`.

**DB reads:** `getCompletedWorkoutSets`, `getAllWorkouts`, `getAllExercises`, `getAllMesocycles`, `getActiveInsights`, `getActivePlan`, `getAcuteChronicWorkload`, `getRecentWorkoutFeedback`, `getCurrentMesocycleWeek`, `getPlannedMuscleVolume`.

**DB writes:**
- `runInsightsEngine(user.id)` (line 238) — writes computed insights to `insights` table
- `dismissInsight(insightId)` (line 433) — marks insight dismissed

**Imports from src/lib:** `database` (10 fns), `algorithms` (`calculateWeeklyVolume`, `VOLUME_LANDMARKS`, `MUSCLE_DISPLAY_NAMES`, `calculate1RM`, `calculateTonnage`, `shouldDeload`), `errorLog.logError`.

**Imports from src/components:** `ScreenHeader`, `EmptyChartIllustration`, `InfoTooltip`, `SvgBarSparkline`, `FatigueTrendCard`, `BlockProgressCard`.

**Navigation:** `navigation.navigate(...)` to `VolumeHeatmap`, `WorkoutHistory`, `PRWall`, `ExerciseLibrary`, `YearOfLifts`; also cross-tab to `PlansTab/MesocycleBuilder` and `PlansTab/PlanLibrary`.

**Local state:** 22 `useState` hooks.

**Local helper logic (in-file, not in lib):**
- `computePRsPerWeek(allSets, exerciseMap, windowDays)` (line 45) — running-max 1RM bins by week
- `volumeDotColor(muscleKey, workingSets)` (line 86) — chip colour vs MEV/MAV/MRV
- `detectRepRegressions(sets, exerciseMap)` — at line ~50 inside the screen

**Notes:** No writes apart from insight dismissal — primarily read/analyse.

---

## Article9ConsentScreen.js (273 lines)

**Purpose:** UK/EU explicit health-data consent gate. Blocks the rest of the app until ticked + continued.

**Exports:** default `Article9ConsentScreen()` (line 32).

**Reads from store:** `user`, `healthConsentGranted`.

**DB writes (cloud RPC):**
- `sb.rpc('record_health_consent', { _granted, _app_version, _platform })` (line 47) — Supabase RPC that updates `users_profile.health_data_consent` + appends to `consent_log`

**AsyncStorage writes:** `${CONSENT_KEY_PFX}${user.id}` = `'true'` (line 62), where `CONSENT_KEY_PFX = '@volyume_health_consent_'`.

**Cascade trigger:** `cascade.startCascade()` (line 90) — dynamic require of `lib/payments`. Locked per `SUBSCRIPTION_AND_PAYMENT_LOCKED.md`: trial cascade starts at Article 9 consent.

**Engine/telemetry:**
- `audit('consent.article9.continue.tap')` (line 42)
- `logInfo('Article9.consent.granted', ...)` (line 64)
- `track('article9_consent_recorded', ...)` (line 74)

**Imports from src/lib:** `supabase` (`getSupabaseClient`), `errorLog` (`logError`, `logInfo`), `observability` (`audit`), `links` (`LINKS`), dynamic: `engineTelemetry`, `payments`.

**Navigation:** none direct — calls store hook `healthConsentGranted()` which presumably flips a flag the app shell reads to advance past the gate.

**Local state:** `agreed`, `busy`.

**Notes:**
- Cloud RPC failure does NOT block consent — local AsyncStorage flag is still set; cloud sync will reconcile later (comment line 52-57)
- The copy is locked in `docs/PRIVACY_CONSENT_LOCKED.md`

---

## AthleteHubScreen.js (1,240 lines)

**Purpose:** "You" tab landing — high-level athlete dashboard. Recent recovery, weight trend, muscle freshness, weekly volume, milestones, goal management, settings shortcuts.

**Exports:** default `AthleteHubScreen({ navigation })` (line 226).

**Reads from store:** `user`, `userProfile`, `units`, `bodyWeightUnits`, `tier`, `lastSetLoggedAt`, `cloudSyncVersion`.

**DB reads:** `getAllWorkouts`, `getCompletedWorkoutSets`, `getBodyMetricLog`, `getNutritionTargets`, `getRecentAdaptationEvents`, `getAllExercises`, `getLatestCheckin`, `getMorningWeightsLast14Days`, `getRecentCheckins`, `getLastTrainedPerMuscle`, `getLatestBodyWeight`.

**DB writes:** none — pure read screen.

**Imports from src/lib:** `database` (11 fns), `units.formatBodyWeightShort`, `recoveryEMA.computeRecoveryEMAs`, `weeklyCoach.computeEWMA`, `algorithms.MUSCLE_DISPLAY_NAMES`, `wellbeing.getWellbeingMode`, `wellbeing.isCalm`.

**Imports from src/components:** `ScreenHeader`, `GradientCard`, `PressableCard`, `InfoTooltip`, `ProBadge`, `SkeletonCard`.

**Imports from external:** `react-native-gifted-charts.LineChart`.

**Navigation:** `WeeklyCheckIn`, `NutritionTargets`, `NutritionEducation`, `BodyMetrics`, `ProUpgrade` (3 sites), `ProGoalSetup`, `CoachHeldHistory`, `GoalLockConsent` (editMode), `WellbeingCheck`, `Settings`.

**Local state:** 18 `useState` hooks.

**Local helper logic:**
- `MILESTONES` constant (line 35) — session-count milestones (1/10/25/50/100/250/500)
- `detectRepRegressions(sets, exerciseMap)` (line 50) — duplicated from AnalyticsScreen (same name, same purpose)
- `MuscleFreshnessCard` sub-component (line 159) — uses time-since-last-trained per muscle, surfaces `Just trained` / `Recovering` / `Nearly ready` / `Ready` chips

**Notes:**
- Adaptation events feed surfaces engine decisions including `drop_set` / `deload_trigger` / `add_set` from `algorithms.computeAdaptiveDecision`
- Goal-lock advanced edit mode is one of the nav targets

**FLAG: Duplicated `detectRepRegressions` between Analytics and AthleteHub** — same function, same behaviour, two definitions. Drift risk if one is updated and not the other.

---

## BlockReflectionScreen.js (329 lines)

**Purpose:** Block-end reflection card; shown after the final week of a mesocycle.

**Exports:** default `BlockReflectionScreen({ navigation, route })` (line 76).

**Reads from store:** `user`, `units`.

**DB reads:** `getBlockReflectionData` (single import, called once).

**DB writes:** none.

**Imports from src/lib:** `database.getBlockReflectionData`.

**Imports from src/components:** `SkeletonCard`.

**Navigation:**
- `navigation.goBack()` on close / done (3 sites)
- `navigation.navigate('MesocycleBuilder')` after a brief delay (line 200) — when user chooses to start a new block

**Local state:** 3 `useState` hooks.

**Notes:** Pure read + display. No data mutation. Acts as a hand-off between completing a block and creating the next one.

---

## BodyMetricsScreen.js (1,025 lines)

**Purpose:** Body weight + body comp logging. Morning weight entry, BF%, lean mass, optional notes; surfaces EWMA trend.

**Exports:** default `BodyMetricsScreen` (line 283).

**Reads from store:** `user`, `session`, `units`, `bodyWeightUnits`, `tier`, `userProfile`.

**DB reads:** `getBodyMetricLog`, `getRecentIntakeSummary` (food/db).

**DB writes:**
- `logBodyMetric(user.id, data)` (lines 380, 415, 510) — three call sites: standard save, onboarding seed save, additional save path
- `syncBodyMetric(...)` — from `lib/sync` (called somewhere; verify in next pass)

**Imports from src/lib:** `database` (`logBodyMetric`, `getBodyMetricLog`), `food/db.getRecentIntakeSummary`, `sync.syncBodyMetric`, `nutritionEngine.computeEWMA`, `nutritionEngine.computeWeeklyWeightChange`, `units` (4 helpers), `wellbeing` (`getWellbeingMode`, `isCalm`, `WELLBEING_HELPLINE`).

**Imports from src/components:** `EmptyBodyIllustration`.

**Navigation:** none direct in grep — likely uses navigation header buttons.

**Local state:** 13 `useState` hooks.

**Notes:** Uses `nutritionEngine.computeEWMA` (NOT the `weeklyCoach.computeEWMA`).

---

## BuildWorkoutScreen.js (626 lines)

**Purpose:** Pre-workout setup. Pick a routine / travel-mode plan, then start the live workout.

**Exports:** default `BuildWorkoutScreen` (line ~20 by `useAppStore` context).

**Reads from store:** `user`, `startWorkout`, `units`.

**DB reads:** `getAllExercises`.

**DB writes:** `createWorkout(user.id)` (lines 82, 107) — two call sites (routine path + travel-mode path).

**Imports from src/lib:** `database` (`getAllExercises`, `createWorkout`), `algorithms.MUSCLE_DISPLAY_NAMES`, `travelMode.generateTravelPlan`, `errorLog.logError`.

**Navigation:** `navigation.replace('ActiveWorkout')` (lines 96, 109) — two paths.

**Local state:** 8 `useState` hooks.

---

## CascadeGateScreen.js (313 lines)

**Purpose:** Day-19 + day-21 trial cascade gate. Surfaces conversion CTAs based on `cascade` state from `lib/payments`.

**Exports:** default.

**Reads from store:** none (grep shows zero `useAppStore`).

**DB reads/writes:** none direct.

**Imports from src/lib:**
- `payments/cascade` (namespace import — uses cascade state machine)
- `payments/playBilling` (namespace import — Google Play Billing)
- `payments/catalogue.skuFor`
- `errorLog` (`logError`, `logInfo`)
- `observability.audit`

**Imports from src/components:** none.

**Navigation:** `navigation.goBack()` (line 82, conditional on `canGoBack`).

**Local state:** 2 `useState` hooks.

**Notes:**
- Sample CTA texts include `'Drop to Free'` (line 54) — this is the trial-conversion drop, **not** a training drop-set
- Direct integration with Play Billing (no RevenueCat)

---

## CoachHeldHistoryScreen.js (283 lines)

**Purpose:** History of weekly coach outputs — shows which "held decisions" and adjustments fired over recent weeks. Read-only audit trail.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getCoachOutputHistory`.

**DB writes:** none.

**Imports from src/lib:** `database.getCoachOutputHistory`.

**Imports from src/components:** `SkeletonCard`.

**Navigation:** `navigation.goBack()` (line 106).

**Local state:** 3 `useState` hooks.

**Notes:** Reads `adjustments.training.signal` from each output row at lines 36-41 — the only consumer of the historical `trainingSignal` value. Renders it as "More work added" / "Volume pulled back" text.

---

## CoachOutputScreen.js (1,525 lines)

**Purpose:** The weekly Precision Coaching card. Runs `weeklyCoach`, persists the output, auto-applies calorie changes, surfaces held decisions / ED-pattern / rapid-loss / refeed flags / differential paywall.

**Exports:** default `CoachOutputScreen` (containing function around line 508).

**Reads from store:** `user`, `userProfile`, `units`.

**DB reads:** `getLatestCheckin`, `getRecentCheckins`, `getMorningWeightsLast14Days`, `getMorningWeights`, `getWeeklySessionStats`, `getWeeklyPRCount`, `getNutritionTargets`, `getLatestCoachOutput`, `getCoachOutputHistory`, `getOpenEdPatternFlag`.

**DB writes:**
- `raiseEdPatternFlag(user.id, ...)` (line 605) — ED-pattern flag raise
- `clearEdPatternFlag(user.id)` (line 614) — ED-pattern flag clear
- `saveCoachOutput(user.id, ...)` (line 664) — persist the weekly card
- `saveNutritionTargets(user.id, newTargets)` (line 680) — **calorie auto-apply** (protein constant, fat/carbs scaled by ratio)
- `AsyncStorage.setItem('@volyume_nutrition_targets', ...)` (line 681) — local cache

**Engine/telemetry:**
- `trackEngineEvent('ed_pattern_flag_fired'|'ed_pattern_flag_cleared'|'rapid_loss_compression_triggered'|'weekly_coach_run'|'ffm_floor_hold_fired', ...)` (lines 609, 615, 632, 647, 655)

**Imports from src/lib:** `weeklyCoach.runWeeklyCoach`, `database` (12 fns), `engineTelemetry.track`, `nutritionEngine` (`computeEWMA`, `computeAdaptiveTDEEAdjustment`), `errorLog.logError`, `whyThisTemplates` (ED_PATTERN_LOCKOUT_COPY, ED_PATTERN_CLEARED_COPY, RAPID_LOSS_CORRECTED_COPY, getEdSupportLink).

**Imports from src/components:** `DifferentialBadge`, `SkeletonCard`.

**Navigation:**
- `navigation.popToTop()` (line 738)
- `navigation.navigate('Paywall', ...)` (line 921) — gated upsell

**Local state:** 7 `useState` hooks.

**Notes:**
- **This is the only screen that calls `saveNutritionTargets` driven by the coach output** — confirms the "calorie auto-apply" claim
- Uses `nutritionEngine.computeEWMA` (NOT `weeklyCoach.computeEWMA`)
- No write for `adjustments.steps`, `adjustments.cardio`, or `adjustments.training` — those are advisory only

---

## CoachReviewScreen.js (812 lines)

**Purpose:** Pre-workout review card. Shows current volume status per muscle (vs MEV/MAV/MRV), deload signal, autoregulation suggestion, lagging-muscle detector — surfaces it BEFORE the user picks a workout.

**Exports:** default `CoachReviewScreen` (function at line ~229).

**Reads from store:** `user`.

**DB reads:** `getAllWorkouts`, `getCompletedWorkoutSets`, `getAllExercises`, `getRecentCheckins`.

**DB writes:** none — pure read + compute.

**Imports from src/lib:** `database` (4 read fns), `algorithms` (`calculateWeeklyVolume`, `getVolumeStatus`, `shouldDeload`, `getAutoRegSuggestion`, `MUSCLE_DISPLAY_NAMES`, `VOLUME_LANDMARKS`, `detectLaggingMuscles`).

**Imports from src/components:** `SkeletonCard`.

**Navigation:** none (no `navigation.navigate` in grep).

**Local state:** 9 `useState` hooks.

**Notes:**
- This is the "what should I train today" surface — distinct from CoachOutput (weekly card) and from AthleteHub (dashboard)
- Uses `getAutoRegSuggestion` from algorithms — soreness × performance → volume signal at the per-session level (different from weeklyCoach's matrix at the weekly level)

---

## CoachingRemindersScreen.js (339 lines)

**Purpose:** User-facing settings for daily-weight and weekly check-in reminders. Schedules / cancels local notifications.

**Exports:** default.

**Reads from store:** `useAppStore.getState().user?.id` (line 143) — not a hook subscription, snapshot only.

**DB reads/writes:** none — pure AsyncStorage + notifications module.

**AsyncStorage:** `@volyume_notification_prefs` (line 32) — read + write of prefs object (weekday, hour, minute, enabled flags).

**Imports from src/lib:** `notifications` (`scheduleMorningWeightNotification`, `scheduleCheckinReminder`, `cancelAllNotifications`, `requestNotificationPermissions`).

**Imports from src/components:** `Toast.useToast`.

**Navigation:** none direct.

**Local state:** 9 `useState` hooks.

**Notes:**
- HOURS_MORNING (line 34): 5-12 inclusive
- HOURS_EVENING (line 35): 14-21 inclusive
- `computeNextCheckinFireDate(weekday, hour, minute, lastCheckinMs, minGapDays=7)` (line 49) — local helper for next-fire scheduling

---

## CreditsScreen.js (147 lines)

**Purpose:** Static credits / acknowledgements page.

**Exports:** default `CreditsScreen({ navigation })` (line 30).

**Reads from store:** none.

**DB reads/writes:** none.

**Imports from src/lib:** none.

**Imports from src/components:** none.

**Navigation:** uses `navigation` for header back (not via grep'd `navigate` calls).

**Local state:** none (0 `useState`).

**Notes:** Truly static screen. No data, no state.

---

## DebugLogScreen.js (217 lines)

**Purpose:** Internal debug surface — recent errors, crash log, sync conflicts. Reachable via Settings.

**Exports:** default.

**Reads from store:** `useAppStore.getState().session?.user?.id` (line 53) — snapshot.

**DB reads:** `diagnoseSyncConflicts` (from `database`).

**DB writes (via errorLog module):**
- `clearErrors()`, `clearCrashLog()` (line 40) — clears recent + crash logs
- (these are local-only data, not user data)

**Imports from src/lib:** `errorLog` (`getRecentErrors`, `clearErrors`, `exportErrorsAsText`, `getCrashLog`, `clearCrashLog`, `logInfo`), `database.diagnoseSyncConflicts`.

**Imports from src/components:** none.

**Navigation:** `navigation.goBack()` (line 85).

**Local state:** 5 `useState` hooks.

**Notes:** Sync-conflict diagnostics is a real function that exists in `database.js` — worth verifying when surveying that lib.

---

## DiaryScreen.js (446 lines)

**Purpose:** Daily food diary. Today's meals (breakfast/lunch/dinner/snacks), macro rings, water, navigation into food search / barcode scanner.

**Exports:** default.

**Reads from store:** `user` (shallow).

**DB reads:** `getFoodEntriesForDay`, `getRollupForDay`, `getWater`, `getNutritionTargets`.

**DB writes:**
- `updateFoodEntry(entry.id, userId, ...)` (line 153) — edit a food entry
- `deleteFoodEntry(...)` (lines 169, 194) — two delete sites (sheet delete + row swipe delete)
- `setWater(userId, selectedDate, next)` (line 175) — water log update
- `recomputeRollup` — imported, called somewhere in the flow
- `logFoodEntry` — dynamic require inside re-log path (line 225-227)

**Engine/telemetry:** `audit(...)` calls (from `observability`).

**Imports from src/lib:** `food/db` (7 fns), `food/sources/localCache.resolveFoodRef`, `database.getNutritionTargets`, `observability.audit`.

**Imports from src/components:** `MacroRings`, `FoodDetailSheet`, `EmptyDiary`, `MealSection`, `friendlyFoodName` (from EntryRow), `ScreenHeader`.

**Navigation:**
- `navigation.navigate('FoodSearch', { mealSlot, entryDate })` (line 130)
- `navigation.navigate('FoodInsights')` (line 278)
- `navigation.navigate('ScanBarcode', { entryDate })` (line 321)

**Local state:** 8 `useState` hooks.

**Notes:**
- Logs water via `setWater` — water target also presumably elsewhere (verify in next pass)
- Uses dynamic `require('../lib/food/db')` for `logFoodEntry` on the re-log path — code-splitting pattern

---

## ExerciseDetailScreen.js (1,045 lines)

**Purpose:** Per-exercise history view. Set history, 1RM trend chart, goal tracking, plateau detection, swap suggestions.

**Exports:** default.

**Reads from store:** `user`, `units`, `accessibility.reduceMotion`.

**DB reads:** `getExerciseById`, `getWorkoutSetsForExercise`, `getAllExercises`, `getExerciseGoal`.

**DB writes:**
- `saveExerciseGoal(user.id, exerciseId, { targetWeight, targetDate })` (line 182) — set/update a weight goal
- `markGoalAchieved(loadedGoal.id)` (line 123) — auto-mark when current >= target
- `deleteExerciseGoal(user.id, exerciseId)` (line 192) — remove a goal

**Imports from src/lib:** `database` (7 fns), `algorithms` (`calculate1RM`, `MUSCLE_DISPLAY_NAMES`, `detectPlateau`), `swapEngine.rankSwaps`, `formTips.FORM_TIPS`.

**Imports from src/components:** `InfoTooltip`.

**Imports external:** `victory-native` (`CartesianChart`, `Line`, `Area`).

**Navigation:** `navigation.push('ExerciseDetail', ...)` (line 553) — drill into a swap candidate.

**Local state:** 13 `useState` hooks.

**Notes:**
- Display label "· Drop Set" at line 489 — recognises imported drop-set sets in history (read-only)
- Plateau detection via `detectPlateau` from algorithms

---

## ExerciseLibraryScreen.js (747 lines)

**Purpose:** Browse and search the exercise library. Add user-created exercises, soft-delete custom ones.

**Exports:** default.

**Reads from store:** `user`, `units`.

**DB reads:** `getAllExercises`, `getCompletedWorkoutSets`.

**DB writes:**
- `insertExercise({...})` (line 114) — user-created exercise
- `deleteExercise(item.id)` (line 154) — remove custom exercise

**Imports from src/lib:** `database` (4 fns), `errorLog.logError`, `algorithms.MUSCLE_DISPLAY_NAMES`.

**Imports from src/components:** `ExerciseCard`, `PeekMenu`.

**Navigation:** `navigation.navigate('ExerciseDetail', { exerciseId })` (line 273).

**Local state:** 19 `useState` hooks.

---

## FirstRunScreen.js (134 lines)

**Purpose:** First-launch welcome / unit picker before sign-up.

**Exports:** default.

**Reads from store:** `user`, `units`, `setUnits`, `userProfile`, `saveLocalProfile`, `completeFirstRun`.

**DB writes:**
- `saveLocalProfile(user.id, merged)` (line 33) — persists initial profile

**Imports from src/lib:** none.

**Imports from src/components:** none.

**Navigation:** none direct.

**Local state:** 4 `useState` hooks.

**Notes:** Calls `completeFirstRun` store action which presumably flips a flag the shell reads to advance past first-run.

---

## FoodInsightsScreen.js (279 lines)

**Purpose:** Multi-day food adherence / macro trend view, plus CSV export.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getRollupsForRange`, `getFoodEntriesForRange`, `getNutritionTargets`.

**DB writes:** none.

**Imports from src/lib:** `food/db` (`getRollupsForRange`, `getFoodEntriesForRange`), `database.getNutritionTargets`, `food/csvExport.exportDiaryCsv`.

**Imports from src/components:** none.

**Navigation:** `navigation.goBack()` (line 126).

**Local state:** 4 `useState` hooks.

---

## FoodSearchScreen.js (421 lines)

**Purpose:** Food search + log entry. Local cache + Open Food Facts waterfall, favourites, dislikes, recent.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getRecentFoodEntries`, `getFavourites`, `getDislikes`, `getFoodPreference`.

**DB writes:**
- `logFoodEntry(userId, ...)` (line 174) — log a selected food
- `cycleFoodPreference(userId, food.food_ref)` (line 190) — toggle like / dislike / clear

**Engine:** `audit(...)` calls.

**Imports from src/lib:** `food/db` (6 fns), `food/waterfall.searchFoods`, `food/sources/localCache.resolveFoodRef`, `observability.audit`.

**Imports from src/components:** `FoodDetailSheet`, `FoodRow`.

**Navigation:**
- `navigation.navigate(returnTo, ...)` (line 158) — return to caller (Diary) with selected food
- `navigation.goBack()` (lines 185, 298)
- `navigation.replace('AddCustomFood', { mealSlot, entryDate })` (line 210) — escape hatch to manual entry
- `navigation.navigate('ScanBarcode', { mealSlot, entryDate })` (line 303)
- `navigation.navigate(item.target, ...)` (line 263) — dynamic nav based on quick-action target

**Local state:** 11 `useState` hooks.

---

## GoalChangeSummaryScreen.js (354 lines)

**Purpose:** Read-only confirmation card shown after a goal change. Displays old vs new phase / protein approach.

**Exports:** default.

**Reads from store:** none (data passed via route params).

**DB reads/writes:** none.

**Imports from src/lib:** `coachingGoals` (`GOAL_LABELS`, `PHASE_LABELS`), `nutritionEngine.PROTEIN_APPROACHES`.

**Navigation:** `navigation.popToTop()` (line 157) / `goBack()` (line 159).

**Local state:** none.

**Notes:** Pure display screen.

---

## GoalLockConsentScreen.js (204 lines)

**Purpose:** Toggle the advanced "goal lock" — raises the ED-pattern detector threshold from 2 to 3 signals. User must consent explicitly.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getGoalLockAdvanced(user.id)`.

**DB writes:**
- `setGoalLockAdvanced(user.id, advanced)` (line 58) — flip the flag
- `recordEngineTelemetry(user.id, 'goal_lock_set' | 'goal_lock_cleared', ...)` (line 59)

**Imports from src/lib:** `database` (3 fns).

**Navigation:** `navigation.goBack()` (line 66).

**Local state:** 3 `useState` hooks.

---

## HomeScreen.js (2,422 lines)

**Purpose:** "Train" tab landing — daily narrative, today's planned workout, morning weight entry, weekly volume snapshot, coach card link, recent activity.

**Exports:** default.

**Reads from store:** `user`, `userProfile`, `startWorkout`, `activeWorkout`, `tier`, `bodyWeightUnits`, `cloudSyncVersion`.

**DB reads:** `getAllWorkouts`, `getCompletedWorkoutSets`, `getActivePlan`, `getRoutinesForPlan`, `getAllRoutineExerciseCounts`, `getRoutineExercisesWithDetails`, `getWorkoutSetsForWorkout`, `getExerciseById`, `getCurrentMesocycleWeek`, `getPlannedMuscleVolume`, `getAllExercises`, `getMorningWeightToday`, `getMorningWeights`, `getProgressionTeaser`, `getRecentWorkoutFeedback`, `getLatestCoachOutput`, `getRollupForDay`.

**DB writes:**
- `logMorningWeight(user.id, { weightKg, loggedAt })` (line 383) — morning weight entry from the home card
- `createWorkout(user.id, pending.routineId, { intent })` (line 602) — start from a planned routine
- `createWorkout(user.id, null, { intent: null })` (line 624) — start a freestyle workout
- `generateAndSavePlan(...)` — dynamic via `planAutoGen` (called from a path; verify on lib survey)
- `seedRoutinesIfNeeded()` (imported, called on mount)

**Dynamic import:** `await import('../lib/coachingGoals')` (line 292) for TRAINING_PHASES.

**Imports from src/lib:** `units` (5 fns), `dailyNarrative.buildDailyNarrative`, `planAutoGen.generateAndSavePlan`, `food/db.getRollupForDay`, `errorLog.logError`, `algorithms` (5 fns), `seedRoutines.seedRoutinesIfNeeded`, `database` (17 fns).

**Imports from src/components:** `VolyumeIcon` (BrandMark), `ScreenHeader`, `GradientCard`, `PressableCard`, `SkeletonCard`, `Sparkline`, `InfoTooltip`.

**Navigation:** `ActiveWorkout` (3 sites), `CoachOutput`, `CoachReview`, `DiaryTab`, `ProUpgrade`, `PlansTab`, `BuildWorkout`.

**Local state:** 38 `useState` hooks (largest in survey so far).

**Notes:**
- Morning weight is loggable directly from Home (no need to go to BodyMetrics)
- `buildDailyNarrative` from `dailyNarrative.js` is the "today's plan" copy generator — verify in lib survey

---

## ImportScreen.js (484 lines)

**Purpose:** CSV import from external apps (Strong, Hevy, etc.). Parses + analyses + runs the import.

**Exports:** default.

**Reads from store:** `user`.

**DB reads/writes:** done indirectly via `runImport` in `lib/importExternal`.

**Engine:**
- `analyzeImport(...)` (imported, line 28)
- `runImport(user.id, parsed, analysis)` (line 116) — heavy lifter

**Imports from src/lib:** `importExternal` (`analyzeImport`, `runImport`), `errorLog`.

**Imports from src/components:** `Toast.useToast`, `PressableCard`.

**Imports external:** `expo-document-picker`, `expo-file-system`.

**Navigation:** `navigation.goBack()` (line 270).

**Local state:** 7 `useState` hooks.

---

## LoginScreen.js (607 lines)

**Purpose:** Sign-in / sign-up / password reset. Email+password plus Google/Apple. Handles the "different user signed in than was last cached locally" wipe.

**Exports:** default.

**Reads from store:** `user: localUser`, `userProfile`, `tier`, `setTier`.

**DB writes:**
- `wipeAllUserData(lastSignedInUserId)` (line 126) — when a new user signs in on a device that had a different user's data
- `setTier('pro', 'LoginScreen.newAccountSetup')` (line 162) — sets new account tier (store action that probably persists)
- Indirectly: `syncProfile`, `bulkUploadLocalData`, `pullFromCloud` (via `lib/sync`)

**AsyncStorage:**
- Read: `@volyume_last_supabase_user_id` (line 116)
- Write: `@volyume_last_supabase_user_id` (line 136)
- Remove: `@volyume_body_metrics_migrated_${lastSignedInUserId}` (line 129)

**Imports from src/lib:** `supabase` (`signInWithEmail`, `signUpWithEmail`, `resetPassword`, `signInWithGoogle`, `signInWithApple`), `sync` (`syncProfile`, `bulkUploadLocalData`, `pullFromCloud`), `database.wipeAllUserData`, `errorLog.logError`, `observability.audit`.

**Imports from src/components:** `VolyumeMark` (BrandMark), `Toast.useToast`.

**Navigation:** none direct in this file — likely uses store flags to drive shell-level redirects.

**Local state:** 9 `useState` hooks.

**Notes:**
- Per `IDENTITY_AND_OWNERSHIP_LOCKED.md` — sign-out wipes local data; this screen handles the inverse: sign-in with different user also wipes
- New accounts default to `tier='pro'` immediately on signup (line 162) — worth verifying against tier policy docs
- `bulkUploadLocalData` and `pullFromCloud` are fire-and-forget (error-logged but not awaited for completion)

---

## ManualBuilderScreen.js (1,268 lines)

**Purpose:** Manual workout-plan builder. User constructs days, picks exercises, sets reps/sets. Persists as a programme + routines.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getAllExercises`.

**DB writes:**
- `insertExercise({...})` (line 72) — user-created exercise from picker
- `createProgramme(user.id, planName, goalLabel, 0)` (line 377) — creates new programme
- `createRoutine(...)` (line 496) — creates a routine within the programme
- `addExerciseToRoutine` (imported, called from `persistDays` flow)
- `activatePlanWithBlock` (imported)
- `persistDays()` (lines 516, 531) — internal helper that calls the create + addExercise chain

**Imports from src/lib:** `database` (6 fns), `algorithms` (`MUSCLE_DISPLAY_NAMES`, `VOLUME_LANDMARKS`).

**Imports from src/components:** `Toast.useToast`.

**Navigation:**
- `navigation.navigate('PlansTab')` (line 532)
- `navigation.navigate('HomeTab')` (line 720) — success flow

**Local state:** 21 `useState` hooks.

---

## MesocycleBuilderScreen.js (541 lines)

**Purpose:** Mesocycle creator + viewer. Tonnage bar chart per week, deload prediction, autoreg evaluation.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getAllMesocycles`, `getAllWorkouts`, `getCompletedWorkoutSets`, `getActivePlan`, `getRoutinesForPlan`.

**DB writes:** none in this file (creation handled elsewhere or via direct DB call).

**Imports from src/lib:** `database` (5 fns), `errorLog.logError`, `algorithms.calculateTonnage`, `recoveryEMA.computeRecoveryEMAs`, `mesocycle` (`predictDeloadWeek`, `evaluateAutoReg`).

**Imports from src/components:** `InfoTooltip`.

**Imports external:** `react-native-gifted-charts.BarChart`.

**Navigation:** `navigation.navigate('BlockReflection', { mesocycleId })` (line 233).

**Local state:** 4 `useState` hooks.

**Notes:**
- `predictDeloadWeek` is in `lib/mesocycle.js` — verify in lib survey
- `evaluateAutoReg` is in `lib/mesocycle.js` — autoreg surface separate from algorithms.js's `computeAdaptiveDecision`

---

## MyRecipesScreen.js (160 lines)

**Purpose:** Recipe library landing. Lists user-created recipes, allows delete + drill into builder.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `listRecipes` (food/db).

**DB writes:**
- `deleteRecipe(userId, recipe.id)` (line 72)

**Imports from src/lib:** `food/db` (`listRecipes`, `deleteRecipe`).

**Imports from src/components:** none.

**Navigation:**
- `navigation.navigate('RecipeBuilder', { mealSlot, entryDate })` (line 55) — new recipe
- `navigation.navigate('RecipeBuilder', { recipeId, mealSlot, entryDate })` (line 59) — edit
- `navigation.goBack()` (line 102)

**Local state:** 3 `useState` hooks.

---

## NotificationSettingsScreen.js (935 lines)

**Purpose:** All notification preference toggles + scheduling. Morning weight, weekly check-in, training day reminders.

**Exports:** default.

**Reads from store:** `useAppStore.getState().user?.id` (line 101) — snapshot only, plus `tier` hook (line 199).

**AsyncStorage / DB:**
- `setPrefRow(userId, kind, ...)` (lines 110, 114, 128, 365, 456) — writes to a per-user preference table via `lib/notifications/preferences`
- `migrateFromLegacyBlob(...)` (imported, presumably called once on mount)

**Notification scheduling (via `lib/notifications`):**
- `cancelAllNotifications()` (line 80)
- `scheduleMorningWeightNotification(hour, minute)` (line 82)
- `scheduleCheckinReminder(...)` (line 89)
- `scheduleTrainingReminders()` (lines 517, 540)
- `cancelTrainingReminders()` (line 519)

**Imports from src/lib:**
- `notifications` (`scheduleMorningWeightNotification`, `scheduleCheckinReminder`, `cancelAllNotifications`, `requestNotificationPermissions`)
- `notifications/trainingReminders` (`scheduleTrainingReminders`, `cancelTrainingReminders`, `REMINDER_PREF_KEY`, `REMINDER_TIME_KEY`)
- `notifications/preferences` (`setPreference as setPrefRow`, `migrateFromLegacyBlob`)

**Imports from src/components:** none in grep.

**Navigation:** `navigation.navigate('CoachingReminders')` (line 583).

**Local state:** 15 `useState` hooks.

**Notes:**
- Subscribes to `tier` to gate training-reminder UI
- Three separate notification modules: top-level `notifications`, `notifications/trainingReminders`, `notifications/preferences` — worth verifying in subfolder lib survey

---

## NutritionEducationScreen.js (306 lines)

**Purpose:** Static educational article about how Volyume's nutrition logic works.

**Exports:** default.

**Reads from store:** none.

**DB reads/writes:** none.

**Imports from src/lib:** none.

**Imports from src/components:** none.

**Navigation:** `navigation.goBack()` (line 23).

**Local state:** 0 (static).

**Notes:** Pure content screen — no data path.

---

## NutritionTargetsScreen.js (1,736 lines)

**Purpose:** Set / edit nutrition targets — kcal, macros, protein approach. Computes via `calculateNutritionTargets`, persists via `saveNutritionTargets`. Also logs current weight when changed.

**Exports:** default.

**Reads from store:** `user`, `userProfile` (shallow).

**DB reads:** `getNutritionTargets`, `getUserBodyProfile`.

**DB writes:**
- `saveNutritionTargets(user.id, { ...targets, gdprConsented: true })` (line 304) — fire-and-forget (caught)
- `logBodyMetric(user.id, ...)` (line 321) — when user updates weight inside this flow

**Imports from src/lib:** `nutritionEngine` (`calculateNutritionTargets`, `PROTEIN_APPROACHES`), `database` (4 fns), `wellbeing` (`getWellbeingMode`, `isCalm`).

**Imports from src/components:** `InfoTooltip`.

**Navigation:** `navigation.navigate('NutritionEducation')` (line 380).

**Local state:** 20 `useState` hooks.

**Notes:**
- `gdprConsented: true` set in the persistance payload — implicit consent at save time
- Uses `calculateNutritionTargets` from nutritionEngine (the engine path that actually IS called — distinct from the dead `getPlanNutritionContext`)

---

## OnboardingScreen.js (357 lines)

**Purpose:** First-account onboarding chip selector — training age, goal, etc.

**Exports:** default.

**Reads from store:** `user`, `setUnits`, `saveLocalProfile`.

**DB writes:**
- `saveLocalProfile(user.id, profileData)` (line 136) — local profile persist (store action that probably also writes to DB)
- `saveUserBodyProfile(user.id, { trainingAgeYears })` (line 148)
- `upsertUserProfile(user.id, selections)` (line 150) — cloud upsert via supabase

**Imports from src/lib:** `supabase.upsertUserProfile`, `database.saveUserBodyProfile`.

**Imports from src/components:** none.

**Navigation:** none direct.

**Local state:** 4 `useState` hooks.

---

## PRWallScreen.js (567 lines)

**Purpose:** All-time PRs view. Per-exercise 1RM bests, strength-standard ranking (novice/intermediate/advanced/elite by bodyweight ratio).

**Exports:** default.

**Reads from store:** `user`, `units`.

**DB reads:** `getCompletedWorkoutSets`, `getAllExercises`, `getLatestBodyWeight`.

**DB writes:** none.

**Imports from src/lib:** `database` (3 fns), `algorithms` (`calculate1RM`, `getStrengthStandard`), `strengthStandards.getStrengthLevel`.

**Imports from src/components:** `EmptyPRsIllustration`, `PeekMenu`, `InfoTooltip`.

**Navigation:**
- `navigation.navigate('ExerciseDetail', { exerciseId })` (line 69) — via PeekMenu drill-in
- `navigation.navigate('BodyMetrics')` (line 240) — for the "log bodyweight" prompt

**Local state:** 9 `useState` hooks.

**Notes:**
- TWO strength functions imported: `getStrengthStandard` from `algorithms` and `getStrengthLevel` from `strengthStandards`. Confirm distinct purposes in lib survey — possible overlap / drift.

---

## PaywallScreen.js (192 lines)

**Purpose:** Pro upgrade purchase surface. Direct Google Play Billing.

**Exports:** default.

**Reads from store:** `user`.

**DB writes:** none directly — done via `playBilling` namespace.

**Cascade state:** uses `cascade` namespace import (`lib/payments/cascade`) — verifies current cascade state and reflects in CTA copy.

**Telemetry:** `trackEvent(...)` from engineTelemetry.

**Imports from src/lib:** `payments/cascade`, `payments/playBilling`, `payments/catalogue` (`skuFor`, `priceTextFor`), `engineTelemetry.track`, `errorLog`, `observability.audit`.

**Imports from src/components:** `TierComparisonStrip`.

**Navigation:** `navigation.goBack()` (lines 53, 76).

**Local state:** 2 `useState` hooks.

**Notes:** All purchase logic delegated to `lib/payments/*`. This screen is presentation + handler routing.

---

## PlanDetailScreen.js (375 lines)

**Purpose:** Detail view for a single training plan. Activate, archive, duplicate, copy-from-library, start workout.

**Exports:** default.

**Reads from store:** `user`, `startWorkout`, `tier`.

**DB reads:** `getProgrammeById`, `getRoutinesForPlan`, `getAllRoutineExerciseCounts`, `getRoutineExercisesWithDetails`, `getActivePlan`.

**DB writes:**
- `copyPlanFromLibrary(planId, user.id)` (line 69) — fork a library plan into user's own
- `activatePlanWithBlock(user.id, planId, plan.name)` (lines 80, 99) — two activation sites
- `createWorkout(user.id, routine.id)` (line 110) — start a workout from this plan
- `archivePlan`, `duplicatePlan` (imported, called from action handlers)

**Engine:** `confirmPlanSwitchMidBlock` from `lib/planSwitch` — guards mid-block plan switches

**Imports from src/lib:** `database` (8 fns), `errorLog`, `planSwitch.confirmPlanSwitchMidBlock`.

**Imports from src/components:** `Toast.useToast`.

**Navigation:**
- `navigation.goBack()` (4 sites)
- `navigation.navigate('HomeTab', { screen: 'ActiveWorkout' })` (line 117)
- `navigation.replace('PlanDetail', { planId: copy.id, isLibrary: false })` (line 150) — switch view after fork
- `navigation.navigate('RoutineDetail', { routineId })` (line 259)

**Local state:** 6 `useState` hooks.

---

## PlanLibraryScreen.js (793 lines)

**Purpose:** Browse the bundled training plan library. Includes a guided quiz to suggest a plan.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getLibraryPlans`, `getPlanWorkoutCounts`.

**DB writes:**
- `copyPlanFromLibrary(plan.id, user.id)` (line 271)
- `activatePlanWithBlock(user.id, copy.id, plan.name)` (line 293)
- `seedRoutinesIfNeeded()` (imported, called on mount)

**Imports from src/lib:** `database` (4 fns), `planSwitch.confirmPlanSwitchMidBlock`, `seedRoutines.seedRoutinesIfNeeded`.

**Imports from src/components:** none direct in grep.

**Navigation:**
- `ProSetupComplete` or `goBack` (lines 282, 294, 295) — branches on `fromFirstRun`
- `PlanDetail` with `isLibrary: true` (lines 472, 502, 586)

**Local state:** 11 `useState` hooks.

**Notes:** Quiz path at lines 526-732 — multi-step modal-like flow.

---

## PlansScreen.js (997 lines)

**Purpose:** "Plans" tab landing — active plan view, recent + archived plans, quick start, plan management actions.

**Exports:** default.

**Reads from store:** `user`, `startWorkout`, `tier`, `userProfile`.

**DB reads:** `getActivePlan`, `getAllPlansForUser`, `getArchivedPlansForUser`, `getWorkoutTemplates`, `getPlanWorkoutCounts`, `getAllRoutineExerciseCounts`, `getRoutinesForPlan`, `getRoutineExercisesWithDetails`, `getActiveBlock`.

**DB writes:**
- `activatePlanWithBlock(user.id, plan.id, plan.name)` (lines 190, 236)
- `createWorkout(user.id, routine.id)` (lines 218, 327) — two start-workout sites
- `duplicatePlan(plan.id, user.id)` (line 266)
- `archivePlan(plan.id)` (line 282) — destructive (with confirm)
- `unarchivePlan` (imported)
- `softDeleteRoutine` (imported)

**Imports from src/lib:** `database` (12 fns), `blockAdvisor.getBlockAdvice`, `planSwitch.confirmPlanSwitchMidBlock`, `errorLog`.

**Imports from src/components:** `ScreenHeader`, `PressableCard`, `PeekMenu`, `EmptyPlanIllustration`.

**Navigation:**
- `ActiveWorkout` (2 sites)
- `PlanDetail` (4 sites)
- `RoutineDetail`
- `ProGoalSetup` (tier-gated) / `ProUpgrade` (line 421)

**Local state:** 11 `useState` hooks.

**Notes:**
- Plan switch guarded by `confirmPlanSwitchMidBlock` — prevents losing mid-block progress
- Block advisor (`getBlockAdvice`) surfaces phase-aware suggestions in the Plans landing

---

## PrivacyPolicyScreen.js (140 lines)

**Purpose:** In-app privacy policy text.

**Exports:** default.

**Reads from store:** none.

**DB reads/writes:** none.

**Imports from src/lib:** none.

**Imports from src/components:** none.

**Navigation:** `navigation.goBack()` (line 13).

**Local state:** 0.

**Notes:** Static content.

---

## ProGoalSetupScreen.js (754 lines)

**Purpose:** Pro tier goal setup — physique goal, training phase, weak-point declaration, regenerates plan + nutrition targets.

**Exports:** default.

**Reads from store:** `user`, `userProfile`, `saveLocalProfile`, `useAppStore.getState().userProfile` (line 181 snapshot).

**DB reads:** `getMorningWeightsLast14Days`.

**DB writes:**
- `saveLocalProfile(user.id, ...)` (lines 213, 244) — two paths
- `saveNutritionTargets(user.id, nextTargets)` (line 233)
- `generateAndSavePlan(user.id, updatedProfile)` (line 252) — regenerates the training plan

**Imports from src/lib:** `coachingGoals` (`PHYSIQUE_GOALS`, `PHYSIQUE_GOAL_GROUPS`, `TRAINING_PHASES`, `GOALS_WITH_WEAK_POINTS`, `phaseToCoachingKey`, `phaseToNutritionKey`, `daysToActivityLevel`), `nutritionEngine` (`calculateNutritionTargets`, `PROTEIN_APPROACHES`, `ADVANCED_PROTEIN_GOALS`), `database` (2 fns), `weeklyCoach.computeEWMA`, `planAutoGen.generateAndSavePlan`.

**Imports from src/components:** none.

**Navigation:**
- `navigation.replace('GoalChangeSummary', ...)` (line 269) — confirmation card
- `navigation.goBack()` (line 296)

**Local state:** 11 `useState` hooks.

**Notes:**
- **Weak-points ARE built** (`planWeakPoints` state, `GOALS_WITH_WEAK_POINTS` gate)
- Weak-points list is in-file (lines 19-25), not in coachingGoals lib — duplication risk if lib has its own list
- Uses `weeklyCoach.computeEWMA` (NOT `nutritionEngine.computeEWMA`)

---

## ProOnboardingScreen.js (1,340 lines)

**Purpose:** The Pro tier full onboarding flow — sign up, body metrics, goal, plan generation, notification setup. The single longest screen on the goal/setup side.

**Exports:** default.

**Reads from store:** several fields via shallow selector (line 136).

**DB writes (in order):**
- `saveLocalProfile(user.id, merged)` (line 464)
- `logBodyMetric(user.id, { weightKg, loggedAt })` (line 467) — body metric record
- `logMorningWeight(user.id, { weightKg, loggedAt })` (line 473) — also morning weight seed
- `saveUserBodyProfile(user.id, ...)` (line 477)
- `saveNutritionTargets(user.id, nutritionData)` (line 494)
- `generateAndSavePlan(user.id, planProfile)` (line 511)

**Cloud auth:** `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signInWithApple` (via lib/supabase).

**Cloud sync (fire-and-forget):** `bulkUploadLocalData`, `syncProfile`, `pullFromCloud` (via lib/sync).

**Notifications:**
- `scheduleMorningWeightNotification(morningHour, 0)` (line 399)
- `scheduleCheckinReminder(checkinDay, 12, 0)` (line 402)
- `requestNotificationPermissions` (imported)

**Imports from src/lib:** `database` (4 fns), `units` (3 fns), `supabase` (4 sign-in fns), `sync` (3 fns), `planAutoGen.generateAndSavePlan`, `notifications` (3 fns), `coachingGoals` (6 fns/constants), `nutritionEngine.calculateNutritionTargets`.

**Imports from src/components:** `VolyumeIcon`.

**Navigation:**
- `navigation.navigate('GoalLockConsent', { ... })` (line 362)
- `navigation.replace('ProSetupComplete')` (line 528)
- `navigation.goBack()` (line 364)

**Local state:** 32 `useState` hooks.

**Notes:**
- Logs morning weight AND body metric for the same kg value on signup — two records, deliberate (each table represents different data)
- Defaults check-in reminder to 12:00 PM
- Plan generation is the final step before `ProSetupComplete`

---

## ProSetupCompleteScreen.js (383 lines)

**Purpose:** Post-onboarding success card. Summarises generated plan + nutrition targets, completes first-run state.

**Exports:** default.

**Reads from store:** `user`, `userProfile`, `completeFirstRun`, `accessibility.reduceMotion`.

**DB reads:** `getActivePlan`, `getRoutinesForPlan`.

**DB writes:**
- `completeFirstRun()` (line 73) — store action that flips a flag (probably persists)

**Imports from src/lib:** `coachingGoals` (`GOAL_LABELS`, `PHASE_LABELS`), `database` (2 fns).

**Imports from src/components:** `VolyumeIcon`.

**Navigation:** `navigation.navigate('NutritionEducation')` (line 168).

**Local state:** 5 `useState` hooks.

---

## ProUpgradeScreen.js (526 lines)

**Purpose:** Upgrade-to-Pro flow. Combines sign-up/sign-in with tier flip + activation.

**Exports:** default.

**Reads from store:** `user`, `session`, `userProfile`, `tier`, `setTier`, `refreshTierFromCloud`, `resetFirstRun`.

**DB writes:**
- `setTier('pro', 'ProUpgradeScreen.activatePro')` (line 43) — store action that persists tier
- `activatePro(supabaseUserId, { isNew })` — local helper (line 36), called from 3 sites (52, 93, 135)

**Cloud auth:** `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signInWithApple` (via lib/supabase).

**Cloud sync:** `syncProfile`, `bulkUploadLocalData`, `pullFromCloud` (via lib/sync).

**Imports from src/lib:** `supabase` (5 fns inc `getSupabaseClient`), `sync` (3 fns).

**Imports from src/components:** none.

**Navigation:**
- `navigation.goBack()` (3 sites)
- `navigation.navigate('SubscriptionPolicy')` (line 241)

**Local state:** 9 `useState` hooks.

**Notes:**
- This screen sets tier='pro' directly via store. Combined with `LoginScreen.js:162` (new signups also default to pro), the question is whether there's any path that doesn't grant Pro.
- No reference to `playBilling` in this file — it's the AUTH path for an existing Pro purchase, not the purchase itself. Purchase goes via PaywallScreen.

---

## RecipeBuilderScreen.js (332 lines)

**Purpose:** Recipe creation / editing. Pick ingredients (via FoodSearch return-flow), set serving size, compute macros, save.

**Exports:** default.

**Reads from store:** `user`.

**DB reads:** `getRecipeWithIngredients`, `computeRecipeMacros` (both from food/db).

**DB writes:**
- `createRecipe(userId, ...)` (line 139)
- `updateRecipe(userId, id, ...)` (line 145)
- `setRecipeIngredients(userId, id, ingredients)` (line 151)
- `resolveFoodRef(userId, ing.food_ref)` (line 72) — read, not write

**Imports from src/lib:** `food/db` (5 fns), `food/sources/localCache.resolveFoodRef`.

**Imports from src/components:** none.

**Navigation:**
- `navigation.navigate('FoodSearch', { ... })` (line 115) — to add ingredients
- `navigation.goBack()` (lines 156, 167)

**Local state:** 7 `useState` hooks.

---

## RoutineDetailScreen.js (867 lines)

**Purpose:** View / edit a single routine (a day within a plan). Reorder exercises, swap, edit sets/reps, start a workout from it.

**Exports:** default.

**Reads from store:** `user`, `startWorkout`.

**DB reads:** `getRoutineById`, `getRoutineExercisesWithDetails`, `getAllExercises`.

**DB writes:**
- `updateRoutineExercise(routineExercise.id, ...)` (line 174) — edit sets/reps/rest
- `updateRoutineExerciseExercise(routineExerciseId, newExercise.id)` (line 209) — swap
- `updateRoutineExerciseOrder(routineExercise.id, index)` (lines 234, 235) — reorder pair
- `addExerciseToRoutine`, `removeExerciseFromRoutine` (imported)
- `createWorkout(user.id, routineId)` (line 262) — start workout

**Imports from src/lib:** `database` (8 fns), `algorithms.MUSCLE_DISPLAY_NAMES`, `whyThisTemplates.getExerciseWhyThis`, `swapEngine.rankSwaps`, `errorLog`, `observability.audit`.

**Imports from src/components:** none.

**Navigation:**
- `navigation.navigate('HomeTab', { screen: 'BuildWorkout' })` (line 255)
- `navigation.navigate('HomeTab', { screen: 'ActiveWorkout' })` (line 270)

**Local state:** 15 `useState` hooks.

**Notes:**
- This is the routine editor — `updateRoutineExercise` here is the canonical edit site
- Uses swap engine for exercise alternatives

---

## ScanBarcodeScreen.js (270 lines)

**Purpose:** Barcode scanner for food entry. On hit, routes into FoodSearch; on miss, routes into ScanLabel (OCR).

**Exports:** default.

**Reads from store:** `user`.

**DB writes:** none — only reads via `resolveBarcode`.

**Engine:** `resolveBarcode(value, userId)` (line 106) — walks the food source waterfall.

**Imports from src/lib:** `food/waterfall.resolveBarcode`, `errorLog`, `observability.audit`.

**Imports from src/components:** none.

**Navigation:**
- `navigation.replace('FoodSearch', { ... })` (line 110) — barcode resolved
- `navigation.replace('ScanLabel', { ... })` (line 115) — barcode miss, OCR fallback
- `navigation.goBack()` (3 sites)

**Local state:** 6 `useState` hooks.

---

## ScanLabelScreen.js (320 lines)

**Purpose:** Nutrition-label OCR scanner. Captures image, runs OCR, parses macros, prefills `AddCustomFood`.

**Exports:** default.

**Reads from store:** `user`.

**DB writes:** none directly — the OCR contribution write is via `queueContribution` (imported but call site not in grep — likely fires after successful parse).

**Engine:**
- `isOcrConfigured()` (imported)
- `recogniseText(...)` — OCR run
- `parseNutritionLabel(...)` — parser
- `queueContribution(...)` — fire-and-forget data-source contribution (gated by `getConsent`)

**Imports from src/lib:** `food/ocr` (`isOcrConfigured`, `recogniseText`), `food/ocrParser.parseNutritionLabel`, `food/writeback` (`queueContribution`, `getConsent`).

**Imports from src/components:** none.

**Navigation:**
- `navigation.replace('AddCustomFood', { ... })` (4 sites: lines 93, 116, 120, 127) — three success / partial / failure prefill paths
- `navigation.goBack()` (3 sites)

**Local state:** 6 `useState` hooks.

---

## SettingsScreen.js (1,199 lines)

**Purpose:** All-in-one settings landing — account, units, accessibility, data export/import, sign-out, wipe, health permissions, off-writeback consent, wellbeing mode, dev panel.

**Exports:** default.

**Reads from store:** `user`, `userProfile`, `tier`, `accessibility`, `healthConsent`. Plus store actions: `setUser`, `setSession`, `clearAuthStateForSignOut`, `saveLocalProfile`, `setTier`, `setAccessibilityPref`, `loadAccessibility`, `setHealthConsent`.

**DB reads:** `getOrphanedRoutines`.

**DB writes:**
- `setOffWritebackConsent(value)` (line 135) — food contribution consent toggle (via `lib/food/writeback`)
- `setAccessibilityPref('largerText', v)` (line 801) — and other a11y prefs
- `setWellbeingMode(mode)` (line 130)
- `setHealthConsent(...)`
- `importNewWeights(user?.id)` (lines 164, 212) — pulls new weights from system health provider
- `wipeAllUserData(userId)` (line 518)
- `clearWorkoutHistory(user.id)` (line 683)
- `deleteOrphanedRoutines(user.id)` (line 655) — cleanup
- `saveLocalProfile(user.id, ...)` (line 729) — name change
- `clearAuthStateForSignOut()` (lines 351, 521)

**Auth:** `signOut()` (lines 363, 513) via lib/supabase.

**Backup:** `exportBackup()` (line 595), `importBackup()` (line 616) via lib/dataBackup.

**Sharing:** `Sharing.shareAsync(uri, ...)` (CSV export path).

**Imports from src/lib:** `supabase` (`getSupabaseClient`, `signOut`), `database` (5 fns), `errorLog`, `observability.audit`, `dataBackup` (`exportBackup`, `importBackup`), `wellbeing` (`getWellbeingMode`, `setWellbeingMode`), `food/writeback` (`getConsent`, `setConsent`), `health` (6 fns).

**Imports from src/components:** `Toast.useToast`, `FeedbackSheet.useFeedback`.

**Imports external:** `expo-secure-store`, `expo-file-system`, `expo-sharing`, `expo-constants`, `expo-updates`.

**Navigation:** `ProUpgrade`, `CoachingReminders`, `NotificationSettings`, `Subscription`, `Credits`, `Import`, `SubscriptionPolicy`, `PrivacyPolicy`.

**Local state:** 10 `useState` hooks.

**Notes:**
- Sign-out path: `clearAuthStateForSignOut` (store) → `signOut` (supabase) → also `wipeAllUserData` is called in the "delete account" branch (line 518)
- Per `IDENTITY_AND_OWNERSHIP_LOCKED.md`, sign-out should wipe local SQLite — verify in store survey that `clearAuthStateForSignOut` does this
- DEV panel: `getOrphanedRoutines` + `deleteOrphanedRoutines` — internal diagnostics
- Health import calls `importNewWeights` from `lib/health` — two sites (manual + auto-on-permission)

---

## ShareCardScreen.js (1,169 lines)

**Purpose:** Generate a shareable image (PR card, milestone, weekly summary, etc.) and route through native share sheet.

**Exports:** default.

**Reads from store:** none in grep — likely takes data from route params.

**DB reads/writes:** none.

**Engine:**
- `FileSystem.writeAsStringAsync(uri, pure, ...)` (line 649) — base64 PNG to filesystem
- `Sharing.isAvailableAsync()` (line 650)
- `Sharing.shareAsync(uri, ...)` (line 652)

**Imports from src/lib:** none (per grep).

**Imports from src/components:** none (per grep).

**Imports external:** `expo-file-system` and `expo-sharing` are used (writes / shares).

**Navigation:** none in grep — uses header back.

**Local state:** 11 `useState` hooks.

**Notes:** Pure presentation + image generation + share. No data writes.

---

## SubscriptionPolicyScreen.js (205 lines)

**Purpose:** In-app subscription terms / cancellation policy.

**Exports:** default.

**Reads from store:** none.

**DB reads/writes:** none.

**Imports from src/lib:** none.

**Imports from src/components:** none.

**Navigation:** `navigation.goBack()` (line 26).

**Local state:** 0.

---

## SubscriptionScreen.js (274 lines)

**Purpose:** Current subscription status view + restore purchases.

**Exports:** default.

**Reads from store:** `userProfile`.

**Engine:**
- `restorePurchases()` (imported, called somewhere in the flow — likely a button handler)
- `cascade` namespace (imported)
- `skuFor` (imported)

**Imports from src/lib:** `proGate.isPaidTier`, `payments/cascade`, `payments/restore.restorePurchases`, `payments/catalogue.skuFor`, `errorLog`, `observability.audit`.

**Imports from src/components:** none.

**Navigation:** none direct in grep.

**Local state:** 2 `useState` hooks.

---

## VolumeHeatmapScreen.js (634 lines)

**Purpose:** Body-diagram heatmap showing weekly working sets per muscle.

**Exports:** default.

**Reads from store:** `user`, `units`.

**DB reads:** `getCompletedWorkoutSets`, `getAllExercises`, `getWeeklyVolumeByMuscle`, `getLastTrainedByMuscle`.

**DB writes:** none.

**Imports from src/lib:** `database` (4 fns), `errorLog`.

**Imports from src/components:** `InfoTooltip`, `BodyDiagramHeatmap`, `Toast.useToast`.

**Navigation:** none in grep — header back only.

**Local state:** 9 `useState` hooks.

---

## WeeklyCheckInScreen.js (1,188 lines)

**Purpose:** The weekly check-in form. Energy / stress / sleep / soreness / training performance / adherence / notes. Saves to `weekly_checkins` then navigates to CoachOutput.

**Exports:** default.

**Reads from store:** `user`, `userProfile`, `units`, `bodyWeightUnits`.

**DB reads:** `getMorningWeightsLast14Days`, `getWeeklySessionStats`, `getWeeklyPRCount`, `getNutritionTargets`, `getRollupsForRange` (food).

**DB writes:**
- `saveWeeklyCheckin(userId, { ... })` (line 385) — primary
- `logMorningWeight` (imported, used in the weight-entry step)

**Notifications:** `scheduleNextCheckinReminder` (line 408) — fires after submit.

**Imports from src/lib:** `units.formatBodyWeightShort`, `weeklyCoach.computeEWMA`, `database` (7 fns), `food/db.getRollupsForRange`, `notifications` (3 fns), `errorLog`, `observability.audit`.

**Imports from src/components:** `SkeletonCard`.

**Navigation:**
- `navigation.navigate('CoachOutput', { weekStart })` (line 417)
- `navigation.navigate('NutritionTargets')` (line 562)
- `navigation.goBack()` (multiple gate exit sites)

**Local state:** 22 `useState` hooks.

**Notes:**
- Uses `weeklyCoach.computeEWMA` (NOT `nutritionEngine.computeEWMA`) — same drift as AthleteHub
- Saves: energyScore, sorenessScore, stressScore, sleepHours, calsAdherence, stepsAdherence, trainingPerformance, jointPain, soreMuscles, notes
- **Does NOT collect cycleOverride** — coach reads it (`weeklyCoach.js:375`) but it's permanently false because no UI sets it
- **Does NOT collect hunger, hydration, mood**

---

## WelcomeScreen.js (276 lines)

**Purpose:** Pre-login welcome screen with tier comparison + sign-in entry.

**Exports:** default.

**Reads from store:** `accessibility.reduceMotion`, `tier`.

**DB reads/writes:** none.

**Imports from src/lib:** none (per grep).

**Imports from src/components:** none (per grep).

**Navigation:** `navigation.navigate('Login', { intent: 'pro_signup' | 'free_signup' })` (line 49, 141).

**Local state:** 0.

**Notes:**
- Branches the intent based on `tier`. Tier check before login implies first-run sees this with a default tier.

---

## WellbeingCheckScreen.js (191 lines)

**Purpose:** SCOFF wellbeing screening questionnaire. Determines if `scoffPositive` flag should be raised on the user profile.

**Exports:** default.

**Reads from store:** `user`, `userProfile`, `saveLocalProfile`.

**DB writes:**
- `saveLocalProfile(user.id, { ...userProfile, scoffScore: score })` (line 51) — local profile
- `saveUserBodyProfile(user.id, { scoffScore: score })` (line 52) — cloud-sync record

**Imports from src/lib:** `database.saveUserBodyProfile`.

**Imports from src/components:** none.

**Navigation:** `navigation.goBack()` (3 sites including post-submit).

**Local state:** 3 `useState` hooks.

**Notes:** SCOFF result feeds `scoffPositive` in `weeklyCoach.js:305` — gates whether deficit calorie suggestions are allowed.

---

## WorkoutHistoryScreen.js (910 lines)

**Purpose:** All-time workout history list. Quick start a new workout from a past one.

**Exports:** default.

**Reads from store:** `user`, `startWorkout`.

**DB reads:** `getAllWorkouts`, `getAllWorkoutSets`, `getAllExercises`, `getWorkoutSetsForWorkout`, `getRoutineExercisesWithDetails`.

**DB writes:**
- `createWorkout(user.id, workout.routineId || null)` (line 87) — copy past workout
- `createWorkout(user.id, null)` (line 176) — start blank workout

**Imports from src/lib:** `database` (6 fns), `errorLog`, `algorithms.calculateTonnage`.

**Imports from src/components:** `PressableCard`, `EmptyWorkoutsIllustration`, `SkeletonRow`.

**Navigation:** `navigation.navigate('WorkoutSummary', ...)` (lines 343, 367) — drill into past summary.

**Local state:** 10 `useState` hooks.

---

## WorkoutSummaryScreen.js (1,317 lines)

**Purpose:** Post-workout summary. The single biggest writer in the app — finalises the workout, runs adaptive engine, writes adaptation events, updates planned volume, advances plan position, prompts for app review.

**Exports:** default.

**Reads from store:** `user`, `units`, `userProfile`, `session`, `accessibility.reduceMotion`.

**DB reads:** `getCompletedWorkoutSets`, `getAllExercises`, `getAllWorkouts`, `getActivePlan`, `getRoutinesForPlan`, `getCurrentMesocycleWeek`, `getNextMesocycleWeek`, `getRecentAdaptationEvents`, `getRoutineWorkoutTonnages`, `getWorkoutSetsForWorkout` (dynamic).

**DB writes:**
- `updateWorkout(workoutId, ...)` (lines 274, 364) — finalises + post-feedback
- `saveWeeklyCheckin(user.id, ...)` (line 377) — feedback-driven weekly checkin update (worth flagging — this is a SECOND write path for `weekly_checkins` beyond `WeeklyCheckInScreen`)
- `createAdaptationEvent(...)` (line 398) — engine decision record
- `upsertPlannedMuscleVolume(...)` (line 421) — sets next week's planned volume
- `advancePlanNextWorkout` (imported, called somewhere — advances plan position)
- `saveNextTimeNote(user.id, { routineId, note })` (line 438) — "next time" coaching note
- `createWorkoutTemplateFromWorkout(user.id, name, exerciseData)` (line 532, dynamic require) — save-as-template
- `syncWorkout(...)` (imported from `lib/sync`) — cloud push

**Engine:**
- `runAdaptiveEngine`, `computeAdaptiveDecision`, `getAutoRegSuggestion`, `evaluateDeloadTriggers` from algorithms
- `evaluateAutoReg`, `predictDeloadWeek`, `getMesoSchedule` from mesocycle
- `getDeloadPredictionMessage`, `getAutoRegMessage` from whyThisTemplates
- `incrementSessionCount`, `shouldPromptReview`, `requestReview` from storeReview
- `shouldPrompt` from feedback

**Imports from src/lib:** `feedback`, `database` (12 fns), `algorithms` (8 fns), `mesocycle` (3 fns), `whyThisTemplates` (2 fns), `sync.syncWorkout`, `storeReview` (3 fns).

**Imports from src/components:** `InfoTooltip`, `FeedbackSheet.useFeedback`, `Toast.useToast`.

**Navigation:**
- `navigation.goBack()` (line 357)
- `navigation.popToTop()` (lines 360, 473)
- `navigation.navigate('ShareCard', { sessionData, prData })` (line 514)

**Local state:** 20 `useState` hooks.

**Notes:**
- **`runAdaptiveEngine` from algorithms is the per-session autoregulation that writes `adaptation_events`** — distinct from weeklyCoach
- Adaptation events feed the AthleteHubScreen "engine decisions" timeline
- The post-workout flow is where the engine actually MUTATES the plan (via `upsertPlannedMuscleVolume` for next week + `advancePlanNextWorkout`) — this is the closest thing to "coach adjusts training" that exists, but it's per-session driven not weekly-coach driven
- Saves an entry to `weekly_checkins` (line 377) — second write path for that table, **drift risk**: WeeklyCheckIn screen and WorkoutSummary both write to it with potentially different field sets

---

## YearOfLiftsScreen.js (478 lines)

**Purpose:** Year-end summary card / "wrapped" style retrospective.

**Exports:** default.

**Reads from store:** `user`, `units`.

**DB reads:** `getYearOfLiftsData`.

**DB writes:** none.

**Imports from src/lib:** `database.getYearOfLiftsData`.

**Imports from src/components:** `GradientCard`.

**Navigation:** `navigation.goBack()` (3 sites).

**Local state:** 4 `useState` hooks.

---

# Screens summary

**All 58 screens surveyed.** Key cross-cutting findings collected during the survey:

1. **`computeEWMA` duplication.** `nutritionEngine.js:151` and `weeklyCoach.js:23` — different signatures. Consumers split: AthleteHub + WeeklyCheckIn + ProGoalSetup use weeklyCoach's; BodyMetrics + CoachOutput use nutritionEngine's.
2. **`detectRepRegressions` duplication.** Defined in both `AnalyticsScreen.js:50` and `AthleteHubScreen.js:50` — same name, same purpose, two definitions.
3. **`WEAK_POINT_MUSCLES` defined in screen.** `ProGoalSetupScreen.js:19` — local list rather than imported from coachingGoals. Drift risk.
4. **Dead imports.** `ActiveWorkoutScreen.js:30` — `saveExerciseUserNote`, `updateWorkoutSetPostRating` imported, never called.
5. **`cycleOverride` is a dead input.** `weeklyCoach.js` reads it; `WeeklyCheckInScreen` never captures it.
6. **`weekly_checkins` has two write paths.** `WeeklyCheckInScreen.js:385` and `WorkoutSummaryScreen.js:377` — second is feedback-driven inside post-workout flow.
7. **Tier=pro on every new signup.** `LoginScreen.js:162` + `ProUpgradeScreen.js:43`.
8. **Strength helpers split.** `algorithms.getStrengthStandard` + `strengthStandards.getStrengthLevel` — possible overlap.
9. **Auto-applied vs advisory.** Only calorie change is auto-applied to DB (`CoachOutputScreen.js:680`). Steps target, cardio prescription, training signal, deload suggestion, diet break suggestion all rendered as advisory text only — no DB writes.
10. **Adaptive engine surface split.** `algorithms.runAdaptiveEngine` writes per-session adaptation events from `WorkoutSummaryScreen`; `weeklyCoach.runWeeklyCoach` produces the weekly card. Two engines, two surfaces.

---

# Lib (top-level, continued)

## algorithms.js (1,132 lines)

**Purpose:** Training-side math + decision engine. Volume landmarks, 1RM, tonnage, autoregulation matrix, deload detection, PR detection, strength standards, plateau detection, lagging-muscle detection.

**Public exports (27 total):**
- Constants: `VOLUME_LANDMARKS`, `MUSCLE_DISPLAY_NAMES`, `STRENGTH_STANDARDS`
- Volume: `calculateTonnage`, `calculateWeeklyVolume`, `getVolumeStatus`, `getVolumeConfidence`, `calculateEffectiveSets`
- Per-set: `calculate1RM`, `getSetEffectivenessWeight`, `calculatePlates`
- Progression: `getProgressionSuggestion`, `computeSetTargets`, `getProgressionPath`, `detectPR`, `detectPlateau`
- Autoregulation: `getAutoRegSuggestion`, `computeAdaptiveDecision`, `runAdaptiveEngine`, `computeAdaptiveLandmarks`, `evaluateDeloadTriggers`, `shouldDeload`, `generateDeloadPrescription`
- Lagging muscles: `detectLaggingMuscles`
- Swap helper: `getExerciseSubstitutes`
- Strength: `getStrengthStandard`

**Consumers:** ActiveWorkout, Analytics, AthleteHub, CoachReview, ExerciseDetail, ExerciseLibrary, HomeScreen, MesocycleBuilder, ManualBuilder, PRWall, RoutineDetail, VolumeHeatmap, WorkoutHistory, WorkoutSummary.

**Notes:**
- `computeAdaptiveDecision` (line 739) — soreness × performance → `{ decision: 'add_set'|'hold'|'drop_set'|'rotate_exercise'|'deload_trigger', delta, reasonCode, reasonText }`. This is the per-session adaptive engine.
- `runAdaptiveEngine` (line 830) — wrapper that processes weekly feedback into multiple decisions
- `STRENGTH_STANDARDS` here covers the basic four (squat/bench/deadlift/OHP) — see also `lib/strengthStandards.js`
- This file is the largest engine in the codebase by surface area

---

## blockAdvisor.js (381 lines)

**Purpose:** Block-end recommendation engine. Synthesises recent check-ins + active block + user profile into a single transition decision (continue / prepare for deload / start deload / new block / variant swap / rebuild).

**Public exports (1):**
- `async getBlockAdvice(userId, activeBlock, userProfile)` (line 217) — returns the recommendation

**Imports from src/lib:** `database.getRecentCheckins`.

**Consumers:** `PlansScreen.js:21`.

**Notes:**
- Documents a 7-step hierarchy from least to most disruptive (header comment lines 11-18)
- "Recovery week is performance-enabling, not corrective" — explicit design principle
- "Banister fitness-fatigue model is NOT used" — explicit non-use
- "All decisions are proposed to the user, never auto-executed" — explicit
- Internal: includes readiness computation section

---

## coachExport.js (295 lines)

**Purpose:** Generates a printable PDF report of the last 4 weeks of training for an external coach. Renders dark-themed HTML, converts via `expo-print`, shares via `expo-sharing`.

**Public exports (1):**
- `async exportCoachReport(userId, opts = {})` (line 203)

**Consumers:** searched — not found in screen imports surveyed. Likely called from SettingsScreen via a dynamic require, or from a Pro-only menu item. **FLAG: possibly dead code or hidden behind a dev path; needs verification.**

**Notes:**
- Bodyweight trend drawn as inline SVG polyline (deterministic; avoids Skia capture inside print renderer)
- "The app stores nutrition *targets* but never logged intake" — comment line says adherence cannot be computed. **This contradicts the existence of `food_entries` and `getRollupForDay`. Either the comment is stale or the report intentionally only uses targets.** Worth verifying when surveying the file.

---

## coachingGoals.js (493 lines)

**Purpose:** Goal taxonomy. Physique goals, training phases, conversion helpers, weak-point gating, training-note generator for the coach.

**Public exports (14):**
- Constants: `PHYSIQUE_GOAL_GROUPS`, `PHYSIQUE_GOALS`, `GOAL_LABELS`, `GOALS_WITH_WEAK_POINTS`, `TRAINING_PHASES`, `PHASE_LABELS`, `GOAL_OVERLAYS`, `PHASE_OVERLAYS`
- Helpers: `shouldShowGoalLockOnboarding`, `phaseToNutritionKey`, `phaseToCoachingKey`, `daysToActivityLevel`, `migrateProfileGoals`, `getTrainingNote`

**Consumers:** GoalChangeSummary, HomeScreen, ProGoalSetup, ProOnboarding, ProSetupComplete, plus `getTrainingNote` consumed by `weeklyCoach.js:471`.

**Notes:**
- No `WEAK_POINT_MUSCLES` list exported. The list in `ProGoalSetupScreen.js:19` is the ONLY definition of weak-point muscles. **Not duplication after all — but it should arguably live here for consistency** (and so plan generation can validate names from a single source).
- `GOALS_WITH_WEAK_POINTS` derived from `PHYSIQUE_GOALS` at line 109 — the gate is in this lib.

---

## dailyNarrative.js (135 lines)

**Purpose:** Generates the single-line "today's story" for the Home hero. One sentence (two at most), or null if no signal worth surfacing.

**Public exports (1):**
- `async buildDailyNarrative(userId)` (line 32) — returns `{ headline, tone }` or `null`

**Imports from src/lib:** `database` (`getAllWorkouts`, `getMorningWeightsLast14Days`).

**Consumers:** `HomeScreen.js:17`.

**Notes:**
- Returns null deliberately when no specific thing to say — UI falls back to greeting
- "Deload detection is handled by the existing phase banner on Home so we deliberately don't repeat it"

---

## dataBackup.js (132 lines)

**Purpose:** User-facing backup export / import. JSON dump of local data.

**Public exports (2):**
- `async exportBackup()` (line 45)
- `async importBackup()` (line 80)

**Consumers:** `SettingsScreen.js:20`.

---

## database.js (5,237 lines)

**Purpose:** SQLite layer. Schema definition, migrations, all DB read/write functions.

**Public exports:** 185 functions/constants. Cannot list all here; key surfaces below.

**Schema — 39 unique tables:**

| Table | Purpose |
|---|---|
| `exercises` | exercise catalogue (seed + user-added) |
| `custom_exercises` | (separate table for user-created? worth checking — has both `exercises` and `custom_exercises`) |
| `workouts` | session header |
| `workout_sets` | individual logged sets |
| `routines` | a day within a programme |
| `programmes` | training plan container |
| `routine_exercises` | join table: which exercises in a routine |
| `mesocycles` | block periodisation |
| `mesocycle_weeks` | weekly state inside a mesocycle |
| `nutrition_targets` | kcal + macro targets |
| `peak_week_plans` | **LEGACY** — peak week is OUT OF SCOPE per founder, table remains |
| `body_metric_log` | weight + BF% + lean mass log |
| `morning_weights` | dedicated morning weight series for EWMA |
| `weekly_checkins` | weekly check-in record |
| `coach_outputs` | persisted weekly coach card |
| `user_insights` | insights engine output |
| `user_body_profile` | sex, age, height, SCOFF score, etc. |
| `planned_muscle_volume` | per-muscle planned sets per week |
| `planned_muscle_volume_sync` | sync staging |
| `adaptation_events` | per-session engine decisions |
| `adaptation_events_sync` | sync staging |
| `exercise_user_notes` | per-user per-exercise notes |
| `workout_notes` | (legacy) per-workout notes |
| `workout_notes_v2` | (current) per-workout notes |
| `exercise_goals` | weight/date targets per exercise |
| `pending_sync_ops` | offline write queue |
| `sync_meta` | last-pull timestamps etc. |
| `foods` | seeded food catalogue |
| `custom_foods` | user-created foods |
| `food_entries` | logged food entries |
| `daily_intake_rollups` | per-day kcal/macro rollup (denormalised) |
| `saved_meals` | reusable meal templates |
| `recipes` | recipe header |
| `recipe_ingredients` | recipe items |
| `food_favourites` | fav + dislike (composite — `kind` column distinguishes) |
| `daily_water` | water log |
| `ed_pattern_flags` | ED-pattern detector state |
| `tier_history` | tier transitions audit |
| `engine_telemetry` | engine event log |

**Sync coupling:** every mutating write function calls `_scheduleSync()` (line 14) which lazy-requires `lib/sync` and debounces a full cloud push. Comment line 9-13 explains the circular-import workaround.

**ID generation:** `uid()` (line 21) — UUID v4 mandatory for Supabase compat (comment lines 22-25 records the older compact format that silently FK-failed).

**Row mapping:** `rowToCamel(row)` (line 32) — converts snake_case → camelCase, with special handling for `secondary_muscles` JSON.

**Consumers:** virtually every screen + many libs (sync, blockAdvisor, dailyNarrative, planAutoGen, weeklyCoach test surfaces, etc.).

**Notes:**
- **TWO tables for workout notes (`workout_notes` and `workout_notes_v2`)** — drift, the v1 may be legacy
- **`exercises` and `custom_exercises` both exist** — likely user vs seed separation, but worth verifying contract
- `peak_week_plans` table remains despite peak week being out of scope (per founder direction)
- `food_dislikes` is NOT a separate table — it lives inside `food_favourites` via the `kind` column. The earlier session's claim about "migration 048 food_preferences kind column" — the actual column lives on `food_favourites`. **Verify migration alignment in supabase/ folder.**

---

## differentialPaywall.js (181 lines)

**Purpose:** Move #4 differential paywall — surfaces a context-specific upsell card on the Coach output when free-tier users hit one of the trigger contexts.

**Public exports (4):**
- `LOCKED_COPY` (line 32) — frozen object of CTA copy variants
- `LOCKED_COPY_NO_TRIAL` (line 47) — variant for users who already used the trial
- `TRIGGER_CONTEXTS` (line 56) — frozen array of context strings
- `detectDifferentialTrigger({ ... })` (line 89) — pure detector function

**Consumers:** `weeklyCoach.js:14` (`import { detectDifferentialTrigger } from './differentialPaywall'`).

**Notes:**
- Pure function, no DB writes
- Locked copy means content is canonical and shouldn't be edited without doc lock

---

## edPatternDetector.js (146 lines)

**Purpose:** Multi-signal ED-pattern detector. Decides when to raise (or clear) an ED-pattern flag based on weekly history + weight trend + goal-lock level.

**Public exports (3):**
- `detectEdPatternFlag(userState, weeklyHistory, goalLockAdvanced = false)` (line 54)
- `hasEdPatternCleared(userState, weeklyHistory)` (line 81)
- `ED_PATTERN_CONSTANTS` (line 138) — thresholds object

**Consumers:** `weeklyCoach.js:13`.

**Notes:**
- Pure function
- `goalLockAdvanced=true` raises threshold from 2 signals to 3 (per `weeklyCoach.js:319-321` comments)

---

## engineTelemetry.js (203 lines)

**Purpose:** Engine event tracking. Writes to local `engine_telemetry` table, periodically flushes to cloud.

**Public exports (2):**
- `async track(userId, event, payload = null)` (line 145)
- `async flushPendingTelemetry()` (line 176)

**Consumers:** AddCustomFood (`custom_food_created`), Article9Consent (`article9_consent_recorded`), CoachOutput (`weekly_coach_run`, `ed_pattern_flag_*`, `rapid_loss_compression_triggered`, `ffm_floor_hold_fired`), Paywall (purchase events).

**Notes:**
- Telemetry surface gated by an allow-list (per the locked telemetry catalogue) — verify when surveying the file in depth
- Cloud writes via the `engine_telemetry` table push

---

## errorLog.js (307 lines)

**Purpose:** Local error / warn / info log + crash recovery + global handlers.

**Public exports (10):**
- `VERBOSE_LOGGING` constant
- `logError(scope, error, context)`, `logWarn(scope, message, context)`, `logInfo(scope, message, context)`
- `async getRecentErrors(limit)`, `async clearErrors()`, `async exportErrorsAsText()`
- `async getCrashLog()`, `async clearCrashLog()`
- `installGlobalHandlers()` — wires uncaught exception / promise rejection

**Consumers:** virtually every screen and lib.

---

## feedback.js (238 lines)

**Purpose:** Periodic in-app feedback prompting (NPS / store review-adjacent).

**Public exports (4):**
- `async shouldPrompt(triggerKey)` (line 49)
- `async markPromptShown(triggerKey)` (line 68)
- `async submitFeedback({ ... })` (line 89)
- `async flushPendingFeedback(userId)` (line 202)

**Consumers:** `WorkoutSummaryScreen.js:11`, `FeedbackSheet` component.

---

## formTips.js (196 lines)

**Purpose:** Hardcoded form-cue map for major exercises.

**Public exports (1):**
- `FORM_TIPS` constant (object keyed by exercise name)

**Consumers:** `ActiveWorkoutScreen.js:43`, `ExerciseDetailScreen.js:18`.

**Notes:** Static lookup, no logic.

---

## haptics.js (80 lines)

**Purpose:** Haptic feedback vocabulary — semantic wrappers around `expo-haptics` so call sites read like intent ("setLogged", "prAchieved") not API ("ImpactFeedbackStyle.Light").

**Public exports (10):** `setLogged`, `warmupLogged`, `prAchieved`, `restDone`, `restAlmostDone`, `selection`, `press`, `workoutComplete`, `error`, `commit`.

**Consumers:** `ActiveWorkoutScreen.js:21`.

---

## health.js (475 lines)

**Purpose:** System health-provider bridge (Health Connect on Android, Apple Health on iOS). Reads weight, steps, writes workouts.

**Public exports (12):** `isHealthAvailable`, `getHealthProviderLabel`, `requestHealthPermissions`, `getHealthPermissionStatus`, `openSystemHealthSettings`, `readLatestWeight`, `readWeightsSince`, `readStepsToday`, `writeWorkoutToHealth`, `getLastImportMs`, `setLastImportMs`, `importNewWeights`.

**Consumers:** `SettingsScreen.js:27` (most direct user-facing functions).

**Notes:**
- `importNewWeights(userId)` (line 434) — pulls new weight readings into the local DB
- Two-way: reads weight, writes workouts (training data flows out to Health Connect)

---

## importExternal.js (488 lines)

**Purpose:** CSV import from Strong / Hevy. Parse + analyse + run.

**Public exports (6):**
- `parseCSV(text)` (line 64)
- `detectFormat(rows)` (line 128)
- `parseHevy(rows)` (line 151), `parseStrong(rows)` (line 213)
- `async analyzeImport(userId, parsed)` (line 270)
- `async runImport(userId, parsed, analysis)` (line 316)

**Consumers:** `ImportScreen.js:26`.

**Notes:**
- `parseHevy` and `parseStrong` are the two formats currently supported
- Set type normaliser at line 199 — `dropset` / `drop_set` / `drop-set` all map to `dropset`

---

## insightsEngine.js (232 lines)

**Purpose:** Generates insights cards from workout data — stalled lifts, rep regressions, lagging muscles, etc.

**Public exports (2):**
- `generateInsights({ workouts, sets, exerciseMap, now })` (line 60)
- `rankAndCapInsights(insights, max = 3)` (line 228)

**Consumers:** `database.js:2` (called from inside `runInsightsEngine` DB function), and Analytics reads the persisted `user_insights` via `getActiveInsights`.

---

## links.js (26 lines)

**Purpose:** Centralised URL constants.

**Public exports (1):**
- `LINKS` constant (object map of named URLs)

**Consumers:** `Article9ConsentScreen.js:14`.

---

## mesocycle.js (472 lines)

**Purpose:** Mesocycle math + autoreg + time-crunch logic.

**Public exports (11):**
- `getCurrentMesoWeek(startDateMs, experience, nowMs)` (line 48)
- `getMesoSchedule(experience)` (line 69)
- `getWeekSetsMultiplier(mesoWeek, experience)` (line 82)
- `isRecoveryWeek(mesoWeek, experience)` (line 95)
- `getVolumeTargetsForWeek(baseSets, mesoWeek, experience)` (line 113)
- `buildWeeklyProgression(baseSets, mrvSets, experience)` (line 130)
- `evaluateAutoReg(feedbackWindow)` (line 165) — autoreg matrix per-session
- `predictDeloadWeek(feedbackWindow, mesoWeek, experience)` (line 269)
- `applyTimeCrunch(exercises, targetMinutes, estimateFn)` (line 326)
- `checkDoubleProgressionReady(sessionHistory)` (line 385)
- `getBlockStatus(startDateMs, plannedWeeks, nowMs)` (line 448)

**Consumers:** ActiveWorkout (`applyTimeCrunch`), MesocycleBuilder (`predictDeloadWeek`, `evaluateAutoReg`), WorkoutSummary (`evaluateAutoReg`, `predictDeloadWeek`, `getMesoSchedule`).

**Notes:**
- `evaluateAutoReg` here is the per-session autoreg matrix — **distinct from `weeklyCoach.js`'s recovery×performance matrix** (which operates weekly). Both exist. **Drift candidate.**
- `predictDeloadWeek` is the inverse: looks at upcoming weeks to flag when a deload is needed
- `applyTimeCrunch` drops not-yet-started isolation work, cuts rest 30%

---

## observability.js (721 lines)

**Purpose:** Session tracking, crash detection, PII redaction, audit logging, store instrumentation. The most comprehensive lib in the codebase.

**Public exports (16):**
- Session: `getSessionId`, `getSessionStart`, `setCurrentScreen`, `setCurrentUserId`, `getCurrentScreen`, `getCurrentUserId`
- PII: `redactPII(value, depth)` (line 110)
- Crash: `detectCrashedLastSession`, `installShutdownHandler`, `uninstallShutdownHandler`, `getLastCrashMeta`, `recordCrashMeta`
- Event tracking: `track` namespace (line 241) — `track.*` methods, `audit(name, props)` (line 346)
- Store instrumentation: `instrumentStore(useStore)` (line 367)

**Consumers:** AddCustomFood, Article9Consent, CascadeGate, DiaryScreen, FoodSearch, Paywall, RoutineDetail, ScanBarcode, ScanLabel, Settings, Subscription, WeeklyCheckIn, ActiveWorkout (`audit`).

**Notes:**
- The `track` namespace at line 241 is the user-facing analytics surface; `audit` at line 346 is for internal event recording
- Crash recovery: on app boot, `detectCrashedLastSession` checks for a heartbeat marker from last run

---

## phaseEngine.js (242 lines)

**Purpose:** Competition-phase awareness. Computes peak_week / early_prep / late_prep / offseason from a comp date, applies phase modifiers to plan inputs, generates session add-ons.

**Public exports (7):**
- `getCompPhase(compDateMs)` (line 28) — returns `'peak_week' | 'early_prep' | 'late_prep' | 'offseason'`
- `getWeeksToComp(compDateMs)` (line 50)
- `getPhaseModifiers(phase)` (line 76)
- `applyPhaseToInputs(planInputs, compDateMs)` (line 126)
- `buildSessionAddons(phase, weeksToComp)` (line 164)
- `getPhaseLabel(phase)` (line 218)
- `getPhaseDescription(phase, weeksToComp)` (line 229)

**Consumers:** searched — **NOT FOUND in any screen or lib import surveyed so far.** Might be invoked from planEngine internally, or might be dead. **FLAG: verify when surveying planEngine.**

**Notes:**
- `getCompPhase` returns `'peak_week'` — the code path exists despite peak week being out of scope. Likely benign (just a label), but worth noting in any "peak week is removed" doc claim.

---

## planAutoGen.js (176 lines)

**Purpose:** Glue layer. Reads user profile → builds `planEngine` inputs → calls `generatePlan` → persists the result to DB.

**Public exports (2):**
- `buildPlanInputs(profile)` (line 69) — pure transform
- `async generateAndSavePlan(userId, profile)` (line 101) — the saver

**Consumers:** HomeScreen, ProGoalSetup, ProOnboarding.

**Notes:** The single entry point for "generate a plan from this profile". Used during onboarding + goal change.

---

## planEngine.js (1,455 lines)

**Purpose:** The plan generator. Goal+split+experience → workouts → mesocycle progression. Pure functions only.

**Public exports (6):**
- `GOAL_LABELS` re-export (line 14)
- `SPLIT_LABELS` constant (line 16)
- `estimateWorkoutMinutes(exercises)` (line 431)
- `getWeeklySetProgression(baseSetCount, weekNum, totalWeeks)` (line 847)
- `buildWeeklyPlan(baseWorkouts, totalWeeks=6, mesocycleName)` (line 883)
- `generatePlan(inputs)` (line 1281)

**Consumers:** ActiveWorkout, planAutoGen, HomeScreen, PlanLibraryScreen and Plans (indirectly via planAutoGen).

**Notes:**
- **planEngine does NOT consume `weeklyCoach` signals.** Plan is generated once with a static set-count ramp per week, deload as the last week. No re-generation from weekly feedback.
- Week labels at lines 856-872: 6-week plans use `[Foundation, Building, Building, Peak, Peak, Deload]`; 8-week use `[Foundation, Foundation, Building, Building, Building, Peak, Peak, Deload]`.
- Mesocycle schedule for advanced vs intermediate (lines 907-925): advanced gets 6 weeks (1.0/1.10/1.15/1.20/1.25/0.50 multipliers); intermediate gets 5 weeks (1.0/1.10/1.20/1.25/0.50).

---

## planSwitch.js (53 lines)

**Purpose:** Single guard function for switching plans mid-block — confirms with user before discarding progress.

**Public exports (1):**
- `async confirmPlanSwitchMidBlock(userId, opts)` (line 18)

**Consumers:** PlanDetail, PlanLibrary, Plans.

---

## proGate.js (185 lines)

**Purpose:** Tier + feature gating. The canonical source for "what can this user access".

**Public exports (10):**
- `PRO_BETA_ACTIVE = true` (line 22) — **all signed-in users currently get Pro automatically**
- `BETA_END_DATE = null` (line 23)
- `FEATURE_MAP` (line 70) — frozen `{ free: [...], pro: [...] }`
- `_resolveTier(trialState, betaActive)` (line 98) — pure resolver, exposed for tests
- `isPaidTier(userProfile)`, `hasFeature(userProfile, feature)`, `hasGoalUnlock(userProfile, feature)`, `isProUser(userProfile)`, `getProLabel(userProfile)`, `PRO_ROUTES`, `isProRoute(routeName)`

**Consumers:** SubscriptionScreen (`isPaidTier`); pro gating likely used in store and across navigators (broader survey will confirm).

**Notes — this file is the SOURCE OF TRUTH for tier policy:**
- 2-tier model (free + pro) — Complete tier collapsed per founder 2026-05-25 (header comment lines 25-33)
- During `PRO_BETA_ACTIVE`, every signed-in user gets Pro tier (line 99 in `_resolveTier`). This explains `LoginScreen.js:162` and `ProUpgradeScreen.js:43` defaulting to Pro — intentional.
- Peak Week explicitly removed (comment lines 66-68)
- **Free features (6):** `engine_safety_guardrails`, `food_logging_basic`, `weight_logging`, `weekly_checkin_basic`, `history_30_days`, `csv_export`
- **Pro features (includes all free, plus):** `food_logging_full`, `adaptive_engine`, `macro_rings`, `differential_paywall_disabled`, `refeed_aggressive_cut_or_contest_prep`, `history_unlimited`, `block_planning_extended`, `photo_progress_local`, `body_composition_summary`, `coach_link_eligible`, `share_pack_csv`, `priority_support`
- **v1.1 deferrals** (in feature map but ship later): `refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf`
- Legacy trial states `complete_trial_active` / `paid_complete` map to `pro` (comment lines 92-97)

---

## recoveryEMA.js (114 lines)

**Purpose:** Exponentially weighted moving averages for recovery signals (soreness, fatigue, joint) over a 14-day half-life.

**Public exports (4):**
- `emaValue(points, now, halfLifeDays)` (line 23)
- `computeRecoveryEMAs(workouts, now)` (line 48)
- `emaWeekOverWeekPct(points, now)` (line 77)
- `dailySeries(points, days=28, now)` (line 97)

**Consumers:** AthleteHubScreen (`computeRecoveryEMAs`), MesocycleBuilder (`computeRecoveryEMAs`).

---

## restSound.js (188 lines)

**Purpose:** Rest-timer audio cues. Preloads beep assets, plays on demand.

**Public exports (3):**
- `playRestBeep(key)` (line 154)
- `preloadRestBeeps()` (line 173)
- `async unloadRestBeeps()` (line 181)

**Consumers:** searched — not found in screen imports. Likely consumed by `RestTimer` component.

---

## seedExercises.js (839 lines)

**Purpose:** First-run seeding of the exercise catalogue.

**Public exports (2):**
- `canonicalExerciseId(name)` (line 30)
- `async seedExercisesIfNeeded()` (line 800)

**Consumers:** searched — `seedExercisesIfNeeded` not found in surveyed screens. Likely called from store init or App.js. **Verify when surveying components / store.**

---

## seedRoutines.js (1,568 lines)

**Purpose:** First-run seeding of the bundled training plan library.

**Public exports (1):**
- `async seedRoutinesIfNeeded(userId)` (line 1475)

**Consumers:** `HomeScreen.js:32`, `PlanLibraryScreen.js:13`.

**Notes:**
- Largest data-heavy lib by line count (1,568 lines of seed data)
- Contains the library plans referenced by `PlanLibrary`

---

## sentry.js (192 lines)

**Purpose:** Sentry SDK wrapper. Safe to call even when SDK isn't installed.

**Public exports (6):**
- `isSentryAvailable()` (line 30)
- `initSentry({ release, environment })` (line 42)
- `setSentryUser(user)` (line 110)
- `captureError(error, ctx)` (line 134)
- `captureWarning(message, ctx)` (line 154)
- `addBreadcrumb(message, ctx)` (line 176)

**Consumers:** searched — not found in surveyed screen/lib imports. Possibly called from `errorLog.js` internally or from App.js init.

---

## storeReview.js (40 lines)

**Purpose:** Native store-review prompt logic. Increments session count, checks threshold, fires native prompt.

**Public exports (3):** `incrementSessionCount`, `shouldPromptReview`, `requestReview`.

**Consumers:** `WorkoutSummaryScreen.js:25`.

---

## strengthStandards.js (92 lines)

**Purpose:** Strength standards lookup. Returns `'Beginner'/'Novice'/'Intermediate'/'Advanced'/'Elite'` for an exercise + 1RM + bodyweight.

**Public exports (3):**
- `STRENGTH_STANDARDS` constant (line 15) — table of standards
- `LEVEL_LABELS` constant (line 41)
- `getStrengthLevel(exerciseName, oneRm, bodyweight)` (line 58)

**Consumers:** `PRWallScreen.js:15`.

**Notes:**
- **`algorithms.js` also has its own `STRENGTH_STANDARDS` (line 695) + `getStrengthStandard` (line 719).** Two implementations. PRWallScreen imports BOTH. **Genuine drift — needs reconciliation.**

---

## supabase.js (194 lines)

**Purpose:** Supabase client init + auth surface.

**Public exports (12):**
- `getSupabaseClient()`, `isSupabaseConfigured()`, `getCurrentUser()`
- Auth: `signInWithEmail`, `signUpWithEmail`, `signOut`, `resetPassword`, `signInWithGoogle`, `signInWithApple`, `signInWithMicrosoft`
- Profile: `upsertUserProfile(userId, profile)`, `getUserProfile(userId)`

**Consumers:** Article9Consent, LoginScreen, OnboardingScreen, ProUpgrade, Settings, ProOnboarding.

**Notes:**
- Three social auth providers wired: Google, Apple, Microsoft (line 171 — Microsoft is unusual, worth verifying if any UI surfaces it)

---

## swapEngine.js (273 lines)

**Purpose:** Exercise swap recommendations. Ranks candidates by equipment match, primary muscle, secondary muscle overlap, joint friendliness.

**Public exports (4):**
- `buildSwapReason(original, candidate)` (line 75) — human-readable why
- `rankSwaps(originalExercise, allExercises, options)` (line 154) — main entry
- `detectJointDiscomfortPattern(discomfortLog, exerciseId, windowMs)` (line 210) — 30-day window default
- `autoSwapForJointDiscomfort(flaggedExerciseIds, exerciseLibrary, options)` (line 251)

**Consumers:** ActiveWorkout, ExerciseDetail, RoutineDetail.

---

## sync.js (1,640 lines)

**Purpose:** Local SQLite ↔ Supabase sync. Per-table push helpers, debounced full sync, conflict resolution.

**Public exports (13+ — partial list):**
- `syncProfile(supabaseUserId, userProfile, _tier, opts)` (line 133)
- `syncExercises(supabaseUserId, opts)` (line 184)
- `syncCustomExercises = syncExercises` (line 231) — alias
- `syncWorkout(supabaseUserId, workoutId)` (line 239)
- `scheduleSync()`, `cancelScheduledSync()` (lines 367, 399)
- `syncMorningWeight(supabaseUserId, entry)` (line 406)
- `syncWeeklyCheckin(supabaseUserId, checkin)` (line 433)
- `syncBodyMetric(supabaseUserId, metric)` (line 465)
- `bulkUploadLocalData(supabaseUserId, localUserId)` (line 516)
- `syncUserPref(supabaseUserId, key, value)` (line 1081)
- `pullFromCloud(supabaseUserId)` (line 1122)
- `syncNutritionTargets(supabaseUserId, localUserId)` (line 1594)

**Consumers:** virtually every write-bearing screen + database.js (indirect via `scheduleSync` from inside DB writes).

**Notes:**
- 1,640 lines is the second-largest lib file
- `scheduleSync()` is called from `database.js:_scheduleSync` after every write, debounced ~2s
- `bulkUploadLocalData` and `pullFromCloud` are the heavy initial sync paths called from LoginScreen / ProOnboarding / ProUpgrade
- **Per-table sync helpers exist for**: profile, exercises, workouts, morning weights, weekly checkins, body metrics, user prefs, nutrition targets. **Coverage of all 39 tables needs verifying** — the sync table count needs to match the locked sync registry doc.

---

## syncQueue.js (220 lines)

**Purpose:** Offline write queue. Buffers writes when offline / cloud unreachable; drains on reconnect.

**Public exports (4):**
- `enqueueSyncOp(opType, entityId, userId, payload)` (line 46)
- `drainSyncQueue(supabaseClient, userId)` (line 73)
- `getQueueStats(userId)` (line 190)
- `clearQueueForUser(userId)` (line 214)

**Consumers:** internal to sync.js.

**Notes:** Backs the `pending_sync_ops` table.

---

## travelMode.js (295 lines)

**Purpose:** Generates a travel-friendly workout based on available equipment (bands, bodyweight, etc.).

**Public exports (2):**
- `generateTravelPlan({ ... })` (line 175)
- `TRAVEL_EQUIPMENT_OPTIONS` constant (line 291)

**Consumers:** `BuildWorkoutScreen.js:12`.

---

## units.js (121 lines)

**Purpose:** kg ↔ lbs ↔ stone conversion + formatting.

**Public exports (10):**
- Conversion: `stoneLbsToKg`, `kgToStoneLbs`, `kgToLbs`, `lbsToKg`, `parseBodyWeightToKg`, `kgToStoneLbsStrings`, `ftInToCm`
- Formatting: `formatBodyWeight`, `formatBodyWeightShort`, `bodyWeightUnitLabel`
- Helpers: `usesImperialHeight`

**Consumers:** AthleteHub, BodyMetrics, HomeScreen, ProOnboarding, WeeklyCheckIn.

---

## weeklyCoach.js (983 lines) — already deep-surveyed above

**Public exports (5):** `computeEWMA`, `getLatestEwma`, `computeWeeklyTrendPct`, `getEwmaSevenDaysAgo`, `assessDataConfidence`, `runWeeklyCoach`.

**Key facts (recap from earlier deep read):**
- `runWeeklyCoach(inputs)` is the main weekly coach card builder
- Inputs check-in fields, weight series, sessions/PRs, phase, weeks-in-phase, off-target counters, last cal adjustment, current cal+steps targets, bodyweight, BF%, sex, recent intake, weekly history (ED detector), tier, trial state
- Returns the weekly card with: trend, what's working, adjustments (training signal, calorie change, steps target, cardio), why-this-week, deload/diet-break flags, held decisions, rapid-loss compression, FFM-floor hold, ED-pattern result, differential paywall trigger
- **Auto-applied:** ONLY calorie change (via `CoachOutputScreen.js:680`)
- **Advisory only:** training signal, steps target, cardio, deload, diet break
- **Dead engine code:** refeedRecommendation in `nutritionEngine.js:773` — not consumed by weeklyCoach
- **Dead input:** `cycleOverride` — read at line 375, never written by check-in UI

---

## wellbeing.js (36 lines)

**Purpose:** "Calm" mode toggle for SCOFF-positive users — reduces app's edge / intensity.

**Public exports (5):**
- `WELLBEING_KEY = '@volyume_wellbeing_mode'` (line 14)
- `WELLBEING_HELPLINE` constant (line 16)
- `async getWellbeingMode()` (line 19)
- `async setWellbeingMode(mode)` (line 28)
- `isCalm(mode)` (line 34)

**Consumers:** AthleteHubScreen (`getWellbeingMode`, `isCalm`), BodyMetricsScreen (3 helpers), NutritionTargets (`getWellbeingMode`, `isCalm`), Settings (`getWellbeingMode`, `setWellbeingMode`).

---

## whyThisTemplates.js (419 lines)

**Purpose:** Library of "why" copy strings. Every coach-facing explanation lives here.

**Public exports (12):**
- `getExerciseWhyThis(exerciseName, subregion)` (line 131)
- `getVolumeStatusMessage(status, muscleDisplayName, currentSets)` (line 148)
- `getProgressionMessage(action, currentWeight, suggestedWeight, units)` (line 171)
- `getAutoRegMessage(action, weeksInBlock)` (line 194)
- `getWeekPhaseDescription(phase, week)` (line 215)
- `getSplitRationale(splitType)` (line 243)
- `getDeloadPredictionMessage(weeksUntilDeload, reason)` (line 258)
- `getTimeCrunchMessage(droppedExercises, restReductionPct, newEstimatedMins)` (line 283)
- `getTravelModeMessage(equipmentLabel, weeks)` (line 306)
- `getPosingConditioningMessage(type, minutesPerSession, weeksToComp)` (line 325) — **comp-prep specific**
- Locked copy: `ED_PATTERN_LOCKOUT_COPY` (line 346), `ED_PATTERN_CLEARED_COPY` (line 366), `RAPID_LOSS_CORRECTED_COPY` (line 380)
- `ED_SUPPORT_LINKS` (line 389), `getEdSupportLink(locale)` (line 396)

**Consumers:** ActiveWorkout, CoachOutput, MesocycleBuilder (indirect), RoutineDetail, WorkoutSummary.

**Notes:**
- `getPosingConditioningMessage` mentions weeksToComp — used by phaseEngine? **Possible coupling**. Worth verifying.
- ED-pattern locked copy is the only place the lockout text lives — single source of truth

---

# Lib summary (43 / 43 complete)

**Cross-cutting findings from libs:**

11. **`STRENGTH_STANDARDS` + `getStrengthStandard` (algorithms.js)** vs **`STRENGTH_STANDARDS` + `LEVEL_LABELS` + `getStrengthLevel` (strengthStandards.js)** — two implementations, both imported by `PRWallScreen.js`. Genuine drift.
12. **`evaluateAutoReg` in `mesocycle.js`** vs **`autoregulationMatrix` in `weeklyCoach.js`** — different scopes (per-session vs weekly), but possible drift in what counts as "high recovery".
13. **`phaseEngine.js` may be entirely dead.** Not imported by any screen or lib surveyed. Has `peak_week` phase support.
14. **`coachExport.js` may be entirely dead.** Not imported by any screen. Possibly hidden behind a Pro-only menu.
15. **`sentry.js` may be entirely dead.** Not imported by any surveyed file — possibly initialised in App.js.
16. **`seedExercises.js` consumer not found** — likely called from App.js init or store; verify in component/store survey.
17. **2-tier model fully in place** (`proGate.js`). `PRO_BETA_ACTIVE=true` makes every signed-in user Pro right now. Legacy `complete_*` trial states still mapped to `pro` for migration-030 compat.
18. **v1.1 deferred features** in FEATURE_MAP that don't yet ship: `refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf`. **Docs should reflect "in feature map, not yet shipped" — not "shipped".**
19. **food_dislikes lives in `food_favourites.kind`** — not a separate table.
20. **Three event-tracking surfaces**: `engineTelemetry.track`, `observability.track` namespace, `observability.audit`. Different scopes — engine events, UI events, internal audit. Need a doc that says which goes where.

---

# Components

Compact tabular survey. Each row: file, lines, exports, lib imports (if any), notes.

## Top-level components (27)

| File | Lines | Exports | Lib imports | Notes |
|---|---|---|---|---|
| `BlockProgressCard.js` | 103 | default | — | Pure presenter. Renders planned vs actual per muscle. |
| `BodyDiagramHeatmap.js` | 315 | default | — | SVG anatomical figure with tap regions. Pure UI. |
| `BrandMark.js` | 85 | `VolyumeMark`, `VolyumeIcon`, `VolyumeWordmark`, `BrandTag`, default | — | Logo variants. |
| `DifferentialBadge.js` | 115 | default | — | Renders the differential paywall badge on CoachOutput. |
| `EmptyState.js` | 129 | default | — | Generic empty-state card. |
| `ExerciseCard.js` | 126 | default | — | Exercise list row with optional Add button. |
| `FatigueTrendCard.js` | 86 | default | — | Sparkline of session feedback. |
| `FeedbackSheet.js` | 486 | `useFeedback`, `FeedbackProvider`, default | `lib/feedback` (`submitFeedback`, `markPromptShown`) | Provider + sheet. Writes feedback. |
| `GradientCard.js` | 127 | default | — | Gradient backdrop card. Used by AthleteHub + Home. |
| `Illustrations.js` | 167 | `EmptyWorkoutsIllustration`, `EmptyPlanIllustration`, `EmptyPRsIllustration`, `EmptyChartIllustration`, `EmptyBodyIllustration` | — | 5 SVG empty-state illustrations. |
| `InfoTooltip.js` | 50 | default | — | Inline help "i" icon with bottom-sheet body. |
| `PRCelebration.js` | 278 | default | — | Animated PR card overlay. |
| `PeekMenu.js` | 224 | default | — | Long-press context-action menu. |
| `PlateCalculator.js` | 235 | default | — | Pure compute — uses `lib/algorithms.calculatePlates` via screen-side prop. |
| `PressableCard.js` | 81 | default | — | Reusable touchable card with press animation. |
| `ProGate.js` | 252 | default, `ProLocked`, `withProGuard`, `ProBadge` | — (gating via store) | Render-prop + HOC for feature gating. Surfaces upsell UI. |
| `RestTimer.js` | 323 | default | `lib/restSound` (`playRestBeep`, `preloadRestBeeps`) | Countdown + sound + haptics. Reads store for active timer state. |
| `ScreenHeader.js` | 73 | default | — | Title bar component. |
| `SetEntry.js` | 341 | default | `lib/algorithms.calculate1RM` | Per-set input. **`SET_TYPE_LABELS` line 9: straight, warmup, dropset, superset, myo_reps, rest_pause, amrap all labelled "Working"** (warmup is the only distinct label). Comment lines 173-176 documents the deliberate removal of per-set RIR picker. |
| `Skeleton.js` | 101 | `Skeleton`, `SkeletonCard`, `SkeletonRow` | — | Loading shimmer. |
| `Sparkline.js` | 75 | default | — | Tiny line chart. |
| `SvgBarSparkline.js` | 84 | default | — | Tiny bar chart for PR/duration trends. |
| `SyncStatusBadge.js` | 226 | default | `lib/sync` (`getStatus`, `syncAll`) | Visual sync indicator. Calls `syncAll` on tap. |
| `TierComparisonStrip.js` | 119 | default | — | Free vs Pro feature compare strip. Used by ProUpgrade + Paywall. |
| `Toast.js` | 244 | `useToast`, `ToastProvider` | — | Provider + hook. In-memory toast surface. |
| `VolumeBars.js` | 80 | default | — | Per-muscle volume vs MEV/MAV/MRV bars. |
| `WhatsNewSheet.js` | 247 | default | — | Release-notes modal. Settings prop. |

**Component-side findings:**
- `SetEntry.js` is the canonical place where the deliberate per-set RIR removal is documented (lines 173-176). DEFAULT_SET in screens still has `rir: 2` for internal tracking.
- `SyncStatusBadge` calls `syncAll` from `lib/sync` — direct user-triggered sync.
- `ProGate` is the runtime UI gate; `lib/proGate.js` is the logic source. Both files named ProGate, no shared code — **drift risk if one changes**.
- No component does a DB write directly (besides FeedbackSheet via the feedback lib).

## Food components (9)

| File | Lines | Exports | Lib imports | Notes |
|---|---|---|---|---|
| `EmptyDiary.js` | 41 | `EMPTY_DIARY_COPY`, default | — | Pure UI. |
| `EntryRow.js` | 96 | `friendlyFoodName`, `EntryRow`, `SwipeableEntryRow`, default | — | Row + swipe-to-delete variant. |
| `FoodDetailSheet.js` | 324 | default | (none direct in grep) | Bottom sheet with food detail, quantity picker. |
| `FoodRow.js` | 81 | `SOURCE_LABEL`, `kcalForServing`, default | — | Food search result row. `SOURCE_LABEL` maps source codes (off/usda/custom/...) to user labels. |
| `HeldDecisionCard.js` | 105 | default | — | Renders coach held-decision rows (ffm_floor, rapid_loss_corrected, ed_pattern_lockout, etc.) with the locked copy. |
| `MacroRings.js` | 204 | default | — | Three rings (protein/carbs/fat) + numbers. Pure render from rollup + targets. |
| `MealSection.js` | 51 | default | — | Meal slot wrapper. |
| `ServingPicker.js` | 110 | default | — | Quantity + unit picker. |
| `SourceChip.js` | 49 | default | — | Tag showing food data source. |

**Component-side food findings:**
- `HeldDecisionCard` consumes `whyThisTemplates.ED_PATTERN_LOCKOUT_COPY` etc. — render layer for the canonical copy.
- **`MacroRings.js:61-75, 104-125` — over-target IS coloured warning.** Rings + numbers turn `colors.warning` when `value > target` (or `kcalOver`). "Adherence-neutral rings" is NOT in place. This contradicts any doc that claims neutrality.

---

# Lib subfolders

## lib/food/ (13 files)

| File | Lines | Exports | Notes |
|---|---|---|---|
| `csvExport.js` | 94 | `buildDiaryCsv`, `buildFoodLookup`, `exportDiaryCsv` | CSV writer for food diary. |
| `db.js` | 816 | **40 exports** | The food-domain DB layer. Includes: `logFoodEntry`, `updateFoodEntry`, `deleteFoodEntry`, `getFoodEntriesForDay`, `getRecentFoodEntries`, `getFoodEntriesForRange`, `insertCustomFood`, `getCustomFoodById`, `getAllCustomFoods`, `recomputeRollup`, `getRollupForDay`, `getRollupsForRange`, `getRecentIntakeSummary`, `setWater`, `getWater`, `setFoodPreference`, `getFoodPreference`, `cycleFoodPreference`, `toggleFavourite`, `getFavourites`, `getDislikes`, `createRecipe`, `updateRecipe`, `deleteRecipe`, `listRecipes`, `getRecipeWithIngredients`, `setRecipeIngredients`, `computeRecipeMacros` and more. |
| `libraryDelta.js` | 243 | `pullFoodLibraryDelta` | Pulls food-library delta from cloud. |
| `normalisers/usdaToFood.js` | 65 | `normaliseUsdaFood` | USDA response → internal food shape. |
| `ocr.js` | 61 | `isOcrConfigured`, `recogniseText` | OCR runner. |
| `ocrParser.js` | 147 | `parseNutritionLabel` | Parses OCR text into macros. |
| `sanityChecks.js` | 92 | `checkKcalPlausible`, `checkMacroMass`, `checkKcalMatchesMacros`, `checkFoodSanity` | Numeric sanity for food entry. |
| `seed.js` | 257 | `importOffSnapshotIfNeeded`, `importCofidSnapshotIfNeeded` | First-run seeding from bundled snapshots (OFF + CoFID UK food composition). |
| `sources/liveOff.js` | 106 | `lookupBarcodeOff`, `searchOff` | Open Food Facts live API. |
| `sources/localCache.js` | 122 | `searchLocalByName`, `findLocalByBarcode`, `resolveFoodRef` | Local SQLite cache (foods + custom_foods union). |
| `sources/usda.js` | 81 | `searchUsda`, `lookupBarcodeUsda` | USDA FoodData Central live API. |
| `waterfall.js` | 167 | `searchFoods`, `resolveBarcode` | The 3-source waterfall: localCache → OFF → USDA. |
| `writeback.js` | 158 | `getConsent`, `setConsent`, `queueContribution`, `flushQueue` | OFF contributions (when user updates a food, optionally writes back to OFF community DB). |

**Food findings:**
- Waterfall is **3 sources** (localCache → OFF → USDA) per `waterfall.js:19-21`. Worth checking against any "food sources" doc claim.
- `seed.js:62, 74` — two seed snapshots: Open Food Facts (`importOffSnapshotIfNeeded`) and **CoFID** (`importCofidSnapshotIfNeeded`) — UK Composition of Foods Integrated Dataset. Worth flagging in any food-data doc.
- `db.js:514` — `listRecipes(userId)` is the canonical recipe lister. `MyRecipesScreen` consumes it. Recipe domain is real and built.
- `food_favourites.kind` column handles fav + dislike (confirmed at db.js:303 `setFoodPreference`).

## lib/notifications/ (12 files)

**Internal layout (per NOTIFICATIONS_LOCKED.md header in `index.js`):**
- `categories.js` — category enum + channel routing
- `quietHours.js` — 22:00 → 07:00 default time-shift
- `permissions.js` — request / status
- `handler.js` — foreground delivery handler with smart suppression
- `scheduler.js` — schedule + cancel helpers
- `telemetry.js` — `notification_sent` / `_tapped` / `_failed` firers
- `listeners.js` — tap handler install
- `preferences.js` — per-user category preference storage (NEW since the lock)
- `trainingReminders.js` — separate from generic notifications (AsyncStorage-backed)
- `activeWorkout.js` — sticky in-workout notification
- `channels.js` — `ensureNotifChannels()` for Android channels
- `index.js` — public API

| File | Lines | Key exports |
|---|---|---|
| `activeWorkout.js` | 197 | `showActiveWorkoutNotification`, `dismissActiveWorkoutNotification` |
| `categories.js` | 93 | `CATEGORY`, `CHANNEL`, `CATEGORY_CHANNELS`, `isPushCategory`, `categoryForDataType` |
| `channels.js` | 41 | `ensureNotifChannels` |
| `handler.js` | 85 | `configureNotificationHandler` |
| `index.js` | 68 | re-exports the public API only |
| `listeners.js` | 101 | `installNotificationListeners({ onTap })` |
| `permissions.js` | 51 | `requestNotificationPermissions`, `getNotificationPermissionStatus` |
| `preferences.js` | 287 | `ensureTable`, `setPreference`, `applyPreferenceFromPull`, `getPreference`, `getAllPreferences`, `getPreferencesUpdatedSince`, `migrateFromLegacyBlob`, `deletePreferencesForUser` |
| `quietHours.js` | 124 | `getQuietHours`, `setQuietHours`, `isInsideQuietHours`, `shiftHourMinuteOutOfQuietHours`, `shiftDateOutOfQuietHours`, `DEFAULT_QUIET_HOURS`, `QUIET_HOURS_KEY` |
| `scheduler.js` | 274 | `scheduleMorningWeightNotification`, `scheduleCheckinReminder`, `scheduleNextCheckinReminder`, `cancelMorningNotification`, `cancelCheckinNotification`, `cancelAllNotifications`, `restoreNotifications`, `checkYearOfLiftsUnlock` |
| `telemetry.js` | 105 | `trackNotificationSent`, `trackNotificationTapped`, `trackNotificationFailed` |
| `trainingReminders.js` | 178 | `SCHEDULE_KEY`, `REMINDER_PREF_KEY`, `REMINDER_TIME_KEY`, `ensureTrainingReminderChannel`, `cancelTrainingReminders`, `scheduleTrainingReminders` |

**Notifications findings:**
- **Surfaces still pending** per `index.js` header (lines 17-22): cascade gate (day 19, 21) push, subscription payment failure, weekly coach output ready. Spec'd in categories.js but not yet built.
- `preferences.js` is the new per-user pref table (replaces an old AsyncStorage blob via `migrateFromLegacyBlob`).
- `trainingReminders.js` is separate from the rest — uses AsyncStorage for its own scheduling. **Inconsistent with the rest of the module** (preferences uses SQLite table; trainingReminders uses three AsyncStorage keys). Drift candidate.

## lib/observability/ (1 file)

| File | Lines | Exports | Notes |
|---|---|---|---|
| `sentryScrub.js` | 229 | `SENSITIVE_KEY_PATTERNS`, `SENSITIVE_VALUE_SUBSTRINGS`, `isSensitiveKey`, `scrubValue`, `scrubObject`, `scrubEvent`, `scrubBreadcrumb` | PII redaction for Sentry events. Pure functions. |

## lib/payments/ (5 files)

**Public API at `payments/index.js`:** `export * as catalogue`, `export * as cascade`, `export * as playBilling`, `export { restorePurchases }`. The Supabase Edge Function `play-billing-rtdn` lives in `supabase/functions/` — server-side, not in client bundle.

| File | Lines | Key exports | Notes |
|---|---|---|---|
| `cascade.js` | 253 | `startCascade`, `payAt`, `skipToFree`, `skipToPro`, `autoDowngrade`, `cancel`, `graceLapsed`, `refunded`, `stageOf`, `canStillTrial` | The trial-cascade state machine. Triggered by Article 9 consent (per locked spec). |
| `catalogue.js` | 84 | `PRICING_WINDOWS` (open_beta / founders / standard), `TIERS` (just `['pro']`), `SKU_CATALOGUE`, `skuFor`, `priceTextFor`, `skuById`, `allSkuIds` | Pricing windows + SKUs. 2-tier model confirmed: only `'pro'` in TIERS. |
| `index.js` | 14 | re-exports above | Public surface. |
| `playBilling.js` | 339 | `tryWireRealProvider`, `injectProvider`, `_resetForTests`, `isReal`, `isInitialised`, `currentAppUserID`, `initialise`, `getCustomerInfo`, `purchasePackage`, `restorePurchases` | Google Play Billing wrapper with injectable provider (testable + mock fallback). |
| `restore.js` | 67 | `restorePurchases` | Restore-purchases flow with cascade reconciliation. |

**Payments findings:**
- `TIERS` (catalogue.js:18) confirmed as `['pro']` — 2-tier consolidation reflected here. There's no `'complete'` SKU.
- `PRICING_WINDOWS` includes `'founders'` (line 17) — separate pricing for early adopters.
- `playBilling.js` has `tryWireRealProvider` + `injectProvider` + `_resetForTests` — implies a testable façade with a mock fallback. Verify the mock path doesn't accidentally ship enabled.
- Per `index.js` header (lines 6-7), there's a server-side `play-billing-rtdn` Edge Function for real-time developer notifications. **Worth checking that doc claims about RTDN match the existence of that function.**

## lib/sync/ (16 files)

**Note:** The TOP-LEVEL `lib/sync.js` (1,640 lines) is the legacy/incumbent sync layer (still consumed by screens). The `lib/sync/` subfolder is the newer modular layer (per `SYNC_ARCHITECTURE_LOCKED.md`). **Both currently coexist** — drift risk if they diverge.

**Public API at `sync/index.js`:** `syncAll`, `syncTable`, `getStatus`, plus re-exports of the registry, queue, conflict resolver, and telemetry helpers.

### sync/ root (6 files)

| File | Lines | Key exports |
|---|---|---|
| `conflict.js` | 102 | `resolve({ table, recordId, local, server, userId })` — single conflict resolver. |
| `index.js` | 39 | re-exports the public API |
| `queue.js` | 150 | `ensureSyncQueueTable`, `enqueue`, `listPending`, `getQueueDepth`, `markSucceeded`, `markFailed`, `clearQueue` |
| `registry.js` | 177 | `SYNC_REGISTRY` (16 entries), `getRegistryEntry`, `listSyncableTables`, `listBidirectionalTables`, `listPullOnlyTables` |
| `runner.js` | 242 | `syncAll`, `syncTable`, `getStatus`, `_resetRunnerForTests` |
| `telemetry.js` | 86 | `trackSyncRun`, `trackSyncConflictResolved`, `logSyncError` |
| `transport.js` | 211 | `MIGRATED_TABLES`, `pushTable`, `pullTable`, `pullChanges`, `pushChanges` |

### sync/tables (10 files) — per-table push/pull handlers

| File | Lines | Exports | Notes |
|---|---|---|---|
| `bodyComposition.js` | 152 | `pushBodyComposition`, `pullBodyComposition` | Local `body_metric_log` ↔ cloud `body_metrics`. |
| `edPatternFlags.js` | 50 | `pullEdPatternFlags` | Pull-only (server authoritative). |
| `foodDomain.js` | 363 | `FOOD_DOMAIN_TABLES`, `beginRun`, `foodPushFor`, `foodPullFor` | All food tables routed through a single shared run context. |
| `notificationPreferences.js` | 149 | `pushNotificationPreferences`, `pullNotificationPreferences` | Per-user category prefs. |
| `nutritionTargets.js` | 89 | `pushNutritionTargets`, `pullNutritionTargets` | Bidirectional (recently corrected from pull-only). |
| `profiles.js` | 163 | `pushProfiles`, `pullProfiles` | Uses `merge` conflict strategy (per-column). |
| `recipeIngredients.js` | 135 | `pushRecipeIngredients`, `pullRecipeIngredients` | |
| `tierHistory.js` | 52 | `pullTierHistory` | Pull-only. |
| `weeklyCheckins.js` | 138 | `pushWeeklyCheckins`, `pullWeeklyCheckins` | Local `weekly_checkins` ↔ cloud `weekly_checkins_v2`. |
| `weightLog.js` | 24 | `pushWeightLog`, `pullWeightLog` | **INTENTIONAL NO-OP** — aliased to `body_composition_log`. Comment lines 1-15 explain. Reports `{count:0, errors:0, skipped:'aliased_to_body_composition_log'}`. |

**Sync registry (16 tables) — full list with direction:**

| Table | Direction | Conflict strategy | Soft delete |
|---|---|---|---|
| `weekly_checkins_v2` | bidirectional | last_write_wins | no |
| `weight_log` | bidirectional* | last_write_wins | no | *aliased — handler is a no-op |
| `food_entries` | bidirectional | last_write_wins | yes |
| `custom_foods` | bidirectional | last_write_wins | yes |
| `saved_meals` | bidirectional | last_write_wins | yes |
| `recipes` | bidirectional | last_write_wins | yes |
| `recipe_ingredients` | bidirectional | last_write_wins | yes |
| `food_favourites` | bidirectional | last_write_wins | no |
| `daily_water` | bidirectional | last_write_wins | no |
| `daily_intake_rollups` | **pull_only** | server_wins | no |
| `ed_pattern_flags` | **pull_only** | server_wins | no |
| `tier_history` | **pull_only** | server_wins | no |
| `body_composition_log` | bidirectional | last_write_wins | yes |
| `nutrition_targets` | bidirectional | last_write_wins | no |
| `profiles` | bidirectional | **merge** | no |
| `notification_preferences` | bidirectional | last_write_wins | no |

**Sync findings:**
- **16 table entries, 15 unique cloud tables** (weight_log + body_composition_log map to same data).
- **3 pull-only** server-authoritative tables: `daily_intake_rollups`, `ed_pattern_flags`, `tier_history`.
- **`profiles` uses merge strategy** (per-column) — distinct from last-write-wins. Locked decision.
- `nutrition_targets` direction note at line 128-137 explicitly corrects a previous wrong registry entry (was pull_only, now bidirectional).
- **TWO sync layers coexist:** top-level `lib/sync.js` (1,640 lines, monolithic) and subfolder `lib/sync/` (modular). The subfolder is the migration target per the locked architecture; the top-level is still consumed. **Significant drift risk** — any sync claim in docs must specify which layer it refers to.

## lib/telemetry/ (4 files)

**Public API at `telemetry/index.js`:** `track(userId, event, payload)`, `flush()`, plus re-exports `TELEMETRY_EVENTS`, `ALLOWED_EVENTS`, `isDeferred`.

**Note:** legacy `engineTelemetry.js` (top-level lib) is the actual queue + push implementation; `telemetry/transport.js` delegates to it. Per `index.js` comment lines 11-14, "future PRs can fold engineTelemetry.js into this module directly without re-plumbing callers." **Both currently coexist.**

| File | Lines | Key exports |
|---|---|---|
| `events.js` | 110 | `TELEMETRY_EVENTS` (frozen, 42 entries), `ALLOWED_EVENTS` (Set of non-deferred), `isDeferred(eventName)` |
| `index.js` | 38 | `track`, `flush`, re-exports of events |
| `sentryBridge.js` | 34 | `mirrorAsBreadcrumb(event, payload)` |
| `transport.js` | 47 | `postEvent(userId, event, payload)`, `flushPending()` |

**Telemetry events — canonical list (42 events, 8 dashboard panels):**

| Panel | Events |
|---|---|
| 1: Lifecycle | sign_in, sign_out, app_cold_start, app_foregrounded, app_backgrounded |
| 2: Engine health | ed_pattern_flag_fired, ed_pattern_flag_cleared, goal_lock_set, goal_lock_cleared, weekly_coach_run, ffm_floor_hold_fired, rapid_loss_compression_triggered, **held_decision_created** (deferred), **held_decision_cleared** (deferred) |
| 3: Food layer | food_lookup_barcode, ocr_writeback_attempted, food_logged, food_search_attempt, custom_food_created |
| 4: Sync health | sync_run, sync_conflict_resolved |
| 5: Cascade + conversion | tier_changed, cascade_started, cascade_advanced, cascade_skipped_ahead, cascade_state_transition, paid_converted, churn_at_gate, subscription_cancelled, paywall_shown, paywall_tapped_cta, purchase_initiated, purchase_completed, purchase_failed, restore_purchases_attempted |
| 6: Notifications | notification_sent, notification_tapped, notification_failed |
| 8: Privacy + consent | article9_consent_recorded, article9_consent_withdrawn, account_created, **account_deleted** (deferred — replaced by `account_deletions_log` per CURRENT_STATUS.md § 4) |

(Panel 7 missing — verify whether it's an intentional gap or a doc drift.)

**Telemetry findings:**
- **Two telemetry modules coexist:** `engineTelemetry.js` (top-level, the actual queue) and `telemetry/` (the spec'd 4-file split that delegates back to it). The newer one is a thin wrapper. Documented intent is to fold the legacy in eventually.
- **42 total events, 4 deferred** (3 listed: `account_deleted`, `held_decision_created`, `held_decision_cleared`). Deferred events have `deferralReason` strings explaining why.
- **`account_deleted` cannot fire from client** — `engine_telemetry.user_id` has ON DELETE CASCADE. The non-cascading `account_deletions_log` table (migration 039) is the audit trail.
- **Held-decision umbrella event is deferred** — per-type events (ed/ffm/rapid) already populate Panel 2.

---

# Subfolder libs summary (51 / 51 complete)

**Cross-cutting findings from subfolders:**

21. **Two sync layers coexist.** Top-level `lib/sync.js` (1,640 lines, monolithic, still consumed by screens) vs `lib/sync/` (modular, the locked architecture). Per-table push/pull files in `sync/tables/` reflect newer migration target. **Docs must specify which layer they describe.**
22. **Two telemetry modules coexist.** `engineTelemetry.js` is the active queue; `lib/telemetry/` is the spec'd public API that wraps it.
23. **weight_log is an alias** — `sync/tables/weightLog.js` is intentionally a no-op (handlers report `skipped:'aliased_to_body_composition_log'`). 16 registry entries = 15 unique cloud tables.
24. **3 pull-only tables** (server authoritative): `daily_intake_rollups`, `ed_pattern_flags`, `tier_history`.
25. **`profiles` uses per-column merge strategy** — distinct from all other LWW tables.
26. **`nutrition_targets` direction recently corrected** — was pull_only in legacy registry, now bidirectional (comment registry.js:128-137).
27. **Food waterfall is 3-source** — localCache → OFF → USDA. Two seed snapshots: OFF + CoFID (UK food composition).
28. **OFF writeback exists** — `food/writeback.js` queues contributions for community DB. Gated by consent.
29. **Payments has injectable provider** — `playBilling.js:245` `injectProvider` + mock fallback. Verify mock can't ship.
30. **42 telemetry events across 8 panels** (Panel 7 missing — gap or doc drift?). Allow-list enforced at `transport.js`.
31. **Notification surfaces still pending** per `notifications/index.js:17-22`: cascade gate push, subscription payment failure, weekly coach output ready. **Spec'd but not yet built.**
32. **`trainingReminders.js` uses AsyncStorage** while the rest of the notifications module uses SQLite `notification_preferences`. Drift candidate.

---

---
