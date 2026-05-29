# Volyume gap analysis: what we have vs what we need

Working document. Two halves:

1. **Complete features inventory** (section 1). Every user-visible capability + every engine / sync / telemetry feature. Read this to know what the app does.
2. **Gap closure work** (sections 2 onward). The deltas, ranked, with the next step to close each.

All claims carry file:line evidence. Verified against `src/`, `supabase/`, and `docs/CODE_TRUTH_SURVEY.md` on 2026-05-27.

**Status legend:**

- ✅ Built and working.
- ⚠️ Built with caveat (drift, dead input, partial, pending external action).
- ❌ Missing, real gap.
- 🚫 Out of scope per founder override.

---

## 1. Complete features inventory

### 1.1 Account + sign-in

| Feature | Evidence | Status |
|---|---|---|
| Email signup | `LoginScreen.js`, `supabase.signUpWithEmail` | ✅ |
| Email sign-in | `LoginScreen.js`, `supabase.signInWithEmail` | ✅ |
| Email confirmation flow ("check your email") | `LoginScreen.js` | ✅ |
| Password reset | `supabase.resetPassword` | ✅ |
| Google OAuth | `supabase.signInWithGoogle` | ✅ |
| Apple OAuth | `supabase.signInWithApple` (iOS-only) | ✅ |
| Microsoft OAuth | `supabase.signInWithMicrosoft` exported | ⚠️ UI surface unverified |
| Sign-out | `useAppStore.clearAuthStateForSignOut` + `supabase.signOut` | ✅ |
| Sign-out wipes local SQLite + AsyncStorage + SecureStore | `LoginScreen.js:126`, store action | ✅ |
| Cross-user wipe (different account previously signed in) | `LoginScreen.js:126` `wipeAllUserData(lastSignedInUserId)` | ✅ |
| Sentry user binding | `sentry.setSentryUser(session?.user)` | ✅ |
| Account deletion flow | `SettingsScreen.performDeleteAccount` → `delete-account` Edge Function | ✅ |
| No anonymous mode | per `IDENTITY_AND_OWNERSHIP_LOCKED.md`; every user has a real account | ✅ |

### 1.2 First-run + onboarding

| Feature | Evidence | Status |
|---|---|---|
| First-run unit picker (metric/imperial) | `FirstRunScreen.js` | ✅ |
| Welcome screen with tier comparison | `WelcomeScreen.js` + `TierComparisonStrip` | ✅ |
| Article 9 explicit health-data consent | `Article9ConsentScreen.js` + `record_health_consent` RPC + `consent_log` audit table | ✅ |
| Pro onboarding: stats (height, weight, sex, DOB) | `ProOnboardingScreen.js` | ✅ |
| Goal selection (physique + training phase) | `ProGoalSetupScreen.js` | ✅ |
| Weak-point declaration (gated by `GOALS_WITH_WEAK_POINTS`) | `ProGoalSetupScreen.js:85, 370` | ✅ |
| Goal lock consent (advanced goals) | `GoalLockConsentScreen.js`, `coachingGoals.shouldShowGoalLockOnboarding` | ✅ |
| SCOFF wellbeing screening | `WellbeingCheckScreen.js` | ✅ |
| Activity level | inside `ProOnboardingScreen.js` | ✅ |
| Equipment + frequency selection | inside `ProOnboardingScreen.js` | ✅ |
| Plan auto-generation at end of onboarding | `planAutoGen.generateAndSavePlan` | ✅ |
| Notification permission request | inside `ProOnboardingScreen.js`, `notifications.requestNotificationPermissions` | ✅ |
| Morning weight schedule choice | `ProOnboardingScreen.js:399` | ✅ |
| Weekly check-in schedule choice | `ProOnboardingScreen.js:402` | ✅ |
| First-run summary card | `ProSetupCompleteScreen.js` | ✅ |
| Onboarding profile cloud upsert | `supabase.upsertUserProfile` | ✅ |

### 1.3 Training: workout flow

| Feature | Evidence | Status |
|---|---|---|
| Start workout from a plan routine | `BuildWorkoutScreen.js:96` → `ActiveWorkoutScreen` | ✅ |
| Start freestyle workout | `BuildWorkoutScreen.js:109` | ✅ |
| Start from a past workout (copy) | `WorkoutHistoryScreen.js:87` | ✅ |
| Per-set logging (weight + reps) | `ActiveWorkoutScreen` + `SetEntry` component | ✅ |
| Live e1RM estimate as user types | `SetEntry.js` + `algorithms.calculate1RM` | ✅ |
| Plate calculator | `PlateCalculator.js` opened from SetEntry "Plates" pill | ✅ |
| Set type picker | only `straight` + `warmup` in picker | ⚠️ |
| Drop set support (display + counting) | `ActiveWorkoutScreen.js:55, 84`; not in picker | ⚠️ |
| Myo-rep support (display + counting) | `ActiveWorkoutScreen.js:57`; not in picker; cluster banner doesn't exist | ❌ |
| Rest-pause support (display + counting) | `ActiveWorkoutScreen.js:58`; not in picker | ❌ |
| AMRAP support (display + counting) | `ActiveWorkoutScreen.js:56`; not in picker | ❌ |
| Per-set RIR picker | deliberately removed `SetEntry.js:173-176`; `DEFAULT_SET.rir = 2` retained internally | 🚫 |
| Per-side L/R reps | no schema, no UI | ❌ |
| Repeat-last quick chip | per BACKLOG shipped May 2026 | ✅ |
| Stalled-progress nudge | per BACKLOG shipped May 2026 | ✅ |
| Superset pairing | `ActiveWorkoutScreen.js:186-212` `supersetGroupId` | ✅ |
| Auto-jump between paired exercises | `ActiveWorkoutScreen.js` | ✅ |
| Rest timer | `RestTimer.js` | ✅ |
| Rest timer sticky notification | `notifications/activeWorkout.js` + `restSound.js` | ✅ |
| Rest timer audio cues | `restSound.playRestBeep` | ✅ |
| Rest timer haptics | `expo-haptics` + `haptics.js` vocabulary | ✅ |
| PR detection (running max 1RM per exercise) | `algorithms.detectPR` | ✅ |
| PR celebration overlay | `PRCelebration.js` | ✅ |
| Time-crunch shortcut (cuts rest, drops not-yet-started isolations) | `mesocycle.applyTimeCrunch` | ✅ |
| Exercise swap modal with ranked candidates | `swapEngine.rankSwaps` | ✅ |
| Auto-swap on joint discomfort pattern | `swapEngine.detectJointDiscomfortPattern`, `autoSwapForJointDiscomfort` | ✅ |
| Form tips per exercise | `formTips.FORM_TIPS` | ✅ |
| Discard workout (hard-delete) | `database.deleteIncompleteWorkout` | ✅ |
| Discard double-tap guard | `ActiveWorkoutScreen.js` finishing ref | ✅ |
| Save workout as template | `database.createWorkoutTemplateFromWorkout` (`WorkoutSummary` dynamic require) | ✅ |
| Per-session adaptive engine writes `adaptation_events` | `algorithms.runAdaptiveEngine` + `WorkoutSummaryScreen.js:398` | ✅ |
| Per-muscle planned volume tracking | `upsertPlannedMuscleVolume` on `WorkoutSummary.js:421` | ✅ |
| Plan position advance after session | `database.advancePlanNextWorkout` | ✅ |
| "Next time" coaching notes | `database.saveNextTimeNote`, `markNoteShown` | ✅ |
| Mesocycle context chip on workout card | per BACKLOG shipped May 2026 | ✅ |
| Workout summary | `WorkoutSummaryScreen.js` | ✅ |
| Workout history list | `WorkoutHistoryScreen.js` | ✅ |
| Share PR / session card | `ShareCardScreen.js` via `Sharing.shareAsync` | ✅ |

### 1.4 Training: planning + programming

| Feature | Evidence | Status |
|---|---|---|
| Browse exercise library | `ExerciseLibraryScreen.js` | ✅ |
| Add custom exercise | `database.insertExercise` from `ExerciseLibraryScreen.js:114` | ✅ |
| Delete custom exercise | `database.deleteExercise` | ✅ |
| Exercise detail with 1RM trend chart | `ExerciseDetailScreen.js` + victory-native | ✅ |
| Plateau detection per exercise | `algorithms.detectPlateau` | ✅ |
| Per-exercise weight goals (target weight + date) | `database.saveExerciseGoal`, `markGoalAchieved`, `deleteExerciseGoal` | ✅ |
| Strength standards labels (Beginner → Elite) | `strengthStandards.getStrengthLevel` + `algorithms.getStrengthStandard` (older + simpler; cross-referenced) | ⚠️ Migration to single source pending PRWallScreen refactor |
| Browse plan library | `PlanLibraryScreen.js` | ✅ |
| Plan library guided quiz | `PlanLibraryScreen.js:526-732` | ✅ |
| Copy plan from library to user account | `database.copyPlanFromLibrary` | ✅ |
| Activate plan with block | `database.activatePlanWithBlock` | ✅ |
| Plan-switch mid-block confirmation | `planSwitch.confirmPlanSwitchMidBlock` | ✅ |
| Plan archive on goal change | per BACKLOG shipped May 2026; collapsible "Archived plans" section | ✅ |
| Unarchive plan | `database.unarchivePlan` | ✅ |
| Duplicate plan | `database.duplicatePlan` | ✅ |
| Routine editor (reorder exercises) | `RoutineDetailScreen.js:234` `updateRoutineExerciseOrder` | ✅ |
| Routine editor (edit sets/reps/rest per exercise) | `RoutineDetailScreen.js:174` `updateRoutineExercise` | ✅ |
| Permanent exercise swap in a routine | `RoutineDetailScreen.js:209` `updateRoutineExerciseExercise` | ✅ |
| Manual plan builder from scratch | `ManualBuilderScreen.js` | ✅ |
| Mesocycle builder + tonnage chart | `MesocycleBuilderScreen.js` | ✅ |
| Deload week prediction | `mesocycle.predictDeloadWeek` | ✅ |
| Auto deload-week detection + amber banner on Home | `algorithms.shouldDeload` + HomeScreen | ✅ |
| Block-end reflection card | `BlockReflectionScreen.js` | ✅ |
| Travel-mode plan generation (bands / bodyweight / hotel gym) | `travelMode.generateTravelPlan` | ✅ |
| Why-this-exercise card | `whyThisTemplates.getExerciseWhyThis` | ✅ |
| Coach Builder periodisation (Foundation / Building / Peak / Deload) | `planEngine.buildWeeklyPlan` | ✅ |

### 1.5 Training: history + analytics

| Feature | Evidence | Status |
|---|---|---|
| Workout history list | `WorkoutHistoryScreen.js` | ✅ |
| Tonnage trend chart | `AnalyticsScreen.js` | ✅ |
| PRs over time bar sparkline | `AnalyticsScreen.computePRsPerWeek` | ✅ |
| PR wall (all-time bests with strength-level chips) | `PRWallScreen.js` | ✅ |
| Weekly volume per muscle | `algorithms.calculateWeeklyVolume` + `getVolumeStatus` | ✅ |
| Volume vs MEV/MAV/MRV landmarks | `algorithms.VOLUME_LANDMARKS` | ✅ |
| Volume heatmap on body diagram (front + back) | `VolumeHeatmapScreen.js` + `BodyDiagramHeatmap` | ✅ |
| Muscle freshness card (recovery state per muscle) | `AthleteHubScreen.MuscleFreshnessCard` | ✅ |
| Fatigue trend card (last 6 sessions) | `FatigueTrendCard.js` on Home | ✅ |
| Block progress card (planned vs actual per muscle) | `BlockProgressCard.js` on Analytics | ✅ |
| Rep regression detection (2+ weeks dropping reps) | `AthleteHubScreen.js:50 detectRepRegressions` (single definition, earlier survey claim of duplication was wrong) | ✅ |
| Lagging muscle detection | `algorithms.detectLaggingMuscles` | ✅ |
| Year of Lifts unlock at 365-day mark | `YearOfLiftsScreen.js` + `database.getYearOfLiftsData` | ✅ |
| Acute / chronic workload ratio | `database.getAcuteChronicWorkload` | ✅ |
| Session milestones (1, 10, 25, 50, 100, 250, 500) | `AthleteHubScreen.MILESTONES` | ✅ |
| Insights cards (engine-generated, dismissible) | `insightsEngine.generateInsights` + `database.runInsightsEngine` + `AnalyticsScreen` | ✅ |
| Effective sets (RIR-weighted) | `algorithms.calculateEffectiveSets` | ✅ |
| Adaptation events timeline | `database.getRecentAdaptationEvents` + `AthleteHubScreen` event feed | ✅ |
| Body comp trend (BF%, measurements over time) | `BodyMetricsScreen` ships weight trend only | ❌ |

### 1.6 Engine: weekly Precision Coaching

| Feature | Evidence | Status |
|---|---|---|
| Weekly check-in screen | `WeeklyCheckInScreen.js` | ✅ |
| Weekly coach card (CoachOutput) | `CoachOutputScreen.js` runs `weeklyCoach.runWeeklyCoach` | ✅ |
| EWMA weight trend (alpha 0.1 + 7-day lookback) | `weeklyCoach.computeEWMA` + `getEwmaSevenDaysAgo` | ✅ |
| Data confidence assessment | `weeklyCoach.assessDataConfidence` | ✅ |
| Autoregulation matrix (recovery × performance) | `weeklyCoach.autoregulationMatrix` | ✅ |
| FFM-aware energy floor safety gate | `nutritionEngine.computeFFMFloor` + gate at `weeklyCoach.js:553-589` | ✅ |
| ED-pattern detector (4-signal, 2-of-3 or 3-of-4 by goal lock) | `edPatternDetector.js` + `weeklyCoach.js:700-727` | ✅ |
| ED-pattern flag raise + clear lifecycle | `database.raiseEdPatternFlag` / `clearEdPatternFlag` | ✅ |
| Rapid-loss compressed upward gate (Move #3) | `weeklyCoach.js:487-521` `rapidLossOverride` | ✅ |
| Diet break trigger (MATADOR, 8+ weeks deficit) | `nutritionEngine.shouldSuggestDietBreak` + `weeklyCoach.js:672-698` | ✅ |
| Held decisions card (FFM floor, ED pattern, rapid loss) | `weeklyCoach.js:729-794` + `HeldDecisionCard` + locked copy in `whyThisTemplates.js` | ✅ |
| Differential paywall trigger | `differentialPaywall.detectDifferentialTrigger` + `DifferentialBadge` | ✅ |
| Calorie target change: confirm-then-apply to `nutrition_targets` | `CoachOutputScreen.handleApplyCalories` + `coachApply.computeCalorieTargets` | ✅ |
| Training signal: confirm-then-apply to next week's `planned_muscle_volume` | `CoachOutputScreen.handleApplyTraining` + `coachApply.computeVolumeApply` | ✅ |
| Steps target: confirm-then-apply to `userProfile.stepsTarget` (gates check-in adherence) | `CoachOutputScreen.handleApplySteps` | ✅ |
| Cardio prescription: confirm-then-apply to `userProfile.cardioPrescription` (gates check-in adherence) | `CoachOutputScreen.handleApplyCardio` + migration 050 | ✅ |
| Deload: confirm-then-apply, flips next mesocycle week to a recovery week | `CoachOutputScreen.handleApplyDeload` + `setMesocycleWeekDeload` + `coachApply.computeDeloadVolume` | ✅ |
| Diet break: confirm-then-apply, raises deficit to maintenance for the week | `CoachOutputScreen.handleApplyDietBreak` + `coachApply.computeDietBreakTargets` | ✅ |
| Refeed prescription | confirm-then-apply: `coachApply.computeRefeedDay` + coach cadence + `CoachOutputScreen` "Refeed day" card + diary next-training-day target. Aggressive cuts / competitors only | ✅ |
| High-day / low-day macro shift | confirm-then-apply carb cycle: `coachApply.computeMacroCycle` + coach gate + `CoachOutputScreen` "Carbs by day" card + diary day-aware target. Advanced cuts / competitors only | ✅ |
| Cycle-aware safety branch | reads `cycleOverride`; UI never sets it | ❌ |
| Coach output history | `CoachHeldHistoryScreen.js` + `database.getCoachOutputHistory` | ✅ |
| Daily narrative on Home hero | `dailyNarrative.buildDailyNarrative` | ✅ |
| Recovery EMA (soreness, fatigue, joint) | `recoveryEMA.computeRecoveryEMAs` | ✅ |
| Progression suggestion per exercise | `algorithms.getProgressionSuggestion` | ✅ |
| Set target computation (per-set rep + weight targets) | `algorithms.computeSetTargets` | ✅ |
| Adaptive landmarks (per-user MEV/MAV/MRV calibration) | `algorithms.computeAdaptiveLandmarks` | ✅ |
| Adaptive TDEE adjustment | `nutritionEngine.computeAdaptiveTDEEAdjustment` | ✅ |
| Block advisor (block-end transition recommendation) | `blockAdvisor.getBlockAdvice` | ✅ |
| Coach training note generator | `coachingGoals.getTrainingNote` | ✅ |

### 1.7 Engine: per-session adaptation (post-workout)

| Feature | Evidence | Status |
|---|---|---|
| Per-session adaptive decision (soreness × performance) | `algorithms.computeAdaptiveDecision` | ✅ |
| Decision types: add_set / hold / drop_set / rotate_exercise / deload_trigger | same | ✅ |
| Post-workout autoregulation note | `mesocycle.evaluateAutoReg` (per-session; distinct from weekly) | ⚠️ Drift: parallel matrix vs weeklyCoach. |
| Deload prescription on trigger | `algorithms.generateDeloadPrescription` | ✅ |
| Pre-workout volume status review | `CoachReviewScreen.js` | ✅ |

### 1.8 Nutrition: diary

| Feature | Evidence | Status |
|---|---|---|
| Diary screen with date pager | `DiaryScreen.js` | ✅ |
| Four meal slots (breakfast, lunch, dinner, snacks) | `DiaryScreen.js` + `MealSection` | ✅ |
| Macro rings | `MacroRings.js` | ✅ |
| Macro ring colour scheme | three-band adherence colour in `MacroRings.bandColour` (under = amber, within 5% = green, over = amber). Over is amber not red; numbers warn only above 105% | ✅ (row 8) |
| Swipe-delete entries | `EntryRow.SwipeableEntryRow` | ✅ |
| Copy-yesterday FAB | per BACKLOG shipped May 2026 | ✅ |
| Water tracker | `food/db.setWater` / `getWater` + `daily_water` table | ✅ |
| Daily intake rollups (denormalised) | `food/db.recomputeRollup` + `daily_intake_rollups` table | ✅ |
| Food search (debounced) | `FoodSearchScreen.js` | ✅ |
| 3-source waterfall (local cache → OFF → USDA) | `food/waterfall.searchFoods` + `resolveBarcode` | ✅ |
| Source chips (OFF / USDA / Custom / CoFID) | `FoodRow.SOURCE_LABEL` + `SourceChip.js` | ✅ |
| Barcode scan (vision-camera) | `ScanBarcodeScreen.js` + `food/sources/liveOff.lookupBarcodeOff` | ✅ |
| Nutrition label OCR (MLKit on-device) | `ScanLabelScreen.js` + `food/ocr` + `food/ocrParser.parseNutritionLabel` | ✅ |
| OCR write-back to OFF community DB (consent-gated) | `food/writeback.queueContribution` + `getConsent` | ✅ |
| Custom food add with sanity check | `AddCustomFoodScreen.js` + `food/sanityChecks` | ✅ |
| Favourites + dislikes via `food_favourites.kind` | `food/db.cycleFoodPreference` + FoodSearch long-press | ✅ (cloud column pending migration 048) |
| Favourites section | `FoodSearchScreen.js` | ✅ |
| Excluded foods (dislikes) section | `FoodSearchScreen.js` | ✅ |
| Recipe builder | `MyRecipesScreen.js` + `RecipeBuilderScreen.js` | ✅ |
| Recipe macros computation (per-serving + total) | `food/db.computeRecipeMacros` | ✅ |
| Recipe ingredient picker (re-uses FoodSearch) | `RecipeBuilderScreen.js:115` | ✅ |
| Atomic ingredient replacement | `food/db.setRecipeIngredients` via `withTransactionAsync` | ✅ |
| Saved meals UI (My Meals templates) | back-end exists, no screen | ❌ |
| Food insights screen (7-day adherence chart) | `FoodInsightsScreen.js` | ✅ |
| CSV export of food diary | `food/csvExport.exportDiaryCsv` | ✅ |
| Today's intake card on Train tab | `HomeScreen.js` reads `food/db.getRollupForDay` | ✅ |
| Long-press multi-select toolbar | per BACKLOG deferred | ❌ |
| Per-meal macro breakdown sheet (tap macro ring) | per BACKLOG deferred | ❌ |
| First-run OFF + CoFID snapshot import | `food/seed.importOffSnapshotIfNeeded` + `importCofidSnapshotIfNeeded` (transaction-mutex serialised) | ✅ |
| Cloud food library delta pull | `food/libraryDelta.pullFoodLibraryDelta` + migration 028 RPC | ✅ |
| Recent foods | `food/db.getRecentFoodEntries` | ✅ |

### 1.9 Nutrition: targets + math

| Feature | Evidence | Status |
|---|---|---|
| Nutrition targets editor | `NutritionTargetsScreen.js` | ✅ |
| BMR + TDEE + target kcal + macros from height/weight/activity/phase/goal | `nutritionEngine.calculateNutritionTargets` | ✅ |
| Protein approaches (4 options + custom g/kg) | `nutritionEngine.PROTEIN_APPROACHES` + `ADVANCED_PROTEIN_GOALS` | ✅ |
| Protein floor calc (FFM + Morton 2018 cap) | `nutritionEngine.calcProtein` | ✅ |
| Weekly rate-of-change target | `nutritionEngine.estimateWeeklyRate` + phase config | ✅ |
| Adaptive TDEE from EWMA + weekly weight change | `nutritionEngine.computeAdaptiveTDEEAdjustment` | ✅ |
| Phase mismatch banner on Home | `HomeScreen.js:760-779` | ✅ |
| GDPR consent stamp on save | `NutritionTargetsScreen.js:304` `{ gdprConsented: true }` | ✅ |
| Nutrition education screen (static) | `NutritionEducationScreen.js` | ✅ |
| Wellbeing-aware copy (calm mode) | `wellbeing.getWellbeingMode` + `isCalm` consumed by NutritionTargets | ✅ |

### 1.10 Body metrics

| Feature | Evidence | Status |
|---|---|---|
| Weight log (morning weight, dedicated `morning_weights` table) | `database.logMorningWeight` | ✅ |
| Weight log (body metric, `body_metric_log` table) | `database.logBodyMetric` | ✅ |
| 7-day EWMA weight trend chart | `BodyMetricsScreen.js` + `nutritionEngine.computeEWMA` | ✅ |
| Body fat % log | `database.logBodyMetric` accepts BF% | ✅ |
| Lean mass log | same | ✅ |
| Body measurements (chest, shoulders, arms, forearms, waist, hips, quads, hamstrings, calves) | `BodyMetricsScreen.js:76-86 MEASUREMENTS`, form state at line 306-307, `FIELD_MAP` at line 44-55 | ✅ |
| BF% input + log | **No input UI anywhere** despite `body_metric_log.body_fat_percent` column existing and `nutritionEngine.computeFFMFloor` consuming it for the FFM safety floor. Without input, the floor falls back to sex-based defaults. | ❌ |
| BF% trend chart over time | not built (no input either) | ❌ |
| Measurement trend chart over time | `BodyMetricsScreen.MeasurementTrendChart` line 190, used at line 830 | ✅ |
| Health Connect / HealthKit weight import | `health.importNewWeights` from Settings | ✅ |
| Health Connect / HealthKit step read | `health.readStepsToday` | ✅ |
| Health Connect / HealthKit workout write | `health.writeWorkoutToHealth` | ✅ |
| Recent intake summary (7-day average) | `food/db.getRecentIntakeSummary` consumed by BodyMetrics | ✅ |

### 1.11 Notifications

| Feature | Evidence | Status |
|---|---|---|
| Permission request | `notifications/permissions.requestNotificationPermissions` | ✅ |
| Permission status check | `notifications/permissions.getNotificationPermissionStatus` | ✅ |
| Morning weight reminder schedule | `notifications/scheduler.scheduleMorningWeightNotification` | ✅ |
| Weekly check-in reminder schedule | `notifications/scheduler.scheduleCheckinReminder` | ✅ |
| Next-week check-in reminder (after submit) | `notifications/scheduler.scheduleNextCheckinReminder` | ✅ |
| Training-day reminders | `notifications/trainingReminders.scheduleTrainingReminders` | ✅ |
| Active workout sticky notification | `notifications/activeWorkout.showActiveWorkoutNotification` | ✅ |
| Rest timer end alert | `RestTimer.js` + `restSound` | ✅ |
| Quiet hours (22:00-07:00 default, wrap-aware) | `notifications/quietHours.js` | ✅ |
| Foreground smart suppression | `notifications/handler.configureNotificationHandler` | ✅ |
| Per-category preferences (cloud-synced) | `notifications/preferences.js` + `notification_preferences` table + sync | ✅ |
| Sent / tapped / failed telemetry | `notifications/telemetry.js` + migration 040 | ✅ |
| Year of Lifts unlock notification | `notifications/scheduler.checkYearOfLiftsUnlock` | ✅ |
| Cascade gate push (day 19, 21) | spec'd, scheduler not written | ❌ |
| Subscription payment failure push | spec'd, scheduler not written | ❌ |
| Weekly coach output ready push | spec'd, scheduler not written | ❌ |
| User preference UI for category enable / disable | `NotificationSettingsScreen.js` + `CoachingRemindersScreen.js` | ✅ |
| Local-only delivery (no server push at v1) | `expo-notifications` local schedule only | ✅ |
| Tap-routing back into app | `notifications/listeners.installNotificationListeners` | ✅ |

### 1.12 Payments + subscription

| Feature | Evidence | Status |
|---|---|---|
| 2-tier model (Free + Pro) | `proGate.FEATURE_MAP` | ✅ |
| Free feature set (6 features) | `proGate.FREE_FEATURES` | ✅ |
| Pro feature set (15 features) | `proGate.PRO_FEATURES` | ✅ |
| 3 v1.1 Pro features flagged but not shipped | `refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf` | ⚠️ Entitlement check would say "yes" with no UI |
| Beta override (PRO_BETA_ACTIVE=true → all signed-in users get Pro) | `proGate.js:22` | ✅ Intentional during closed testing |
| 21-day Pro trial start at Article 9 consent | `Article9ConsentScreen.js:90` calls `cascade.startCascade` | ✅ |
| Cascade state machine (7 transitions) | `payments/cascade.js` | ✅ |
| Day-21 cascade gate | `CascadeGateScreen.js` (with day14 + day28 alias) | ✅ |
| 3 SKUs (open beta / founders / standard) | `payments/catalogue.SKU_CATALOGUE` | ✅ |
| Pricing windows | `payments/catalogue.PRICING_WINDOWS` | ✅ |
| Current pricing window resolver | `payments/catalogue.skuFor` + `priceTextFor` | ✅ |
| Google Play Billing direct via `react-native-iap` | `payments/playBilling.js` real provider | ✅ |
| Injectable provider for tests | `playBilling.tryWireRealProvider` + `injectProvider` + `_resetForTests` | ✅ |
| Purchase flow with `finishTransaction` acknowledgement | `playBilling.purchasePackage` | ✅ |
| Restore purchases | `payments/restore.restorePurchases` | ✅ |
| Differential paywall (engine-driven) | `differentialPaywall.js` + `DifferentialBadge` + `PaywallScreen` | ✅ |
| Tier comparison strip | `TierComparisonStrip.js` consumed by ProUpgrade + Paywall | ✅ |
| Subscription management screen | `SubscriptionScreen.js` | ✅ |
| Pro upgrade flow with sign-up combine | `ProUpgradeScreen.js` | ✅ |
| Subscription policy view | `SubscriptionPolicyScreen.js` | ✅ |
| Tier history audit | `tier_history` table + migration 030 | ✅ |
| RTDN Edge Function | `supabase/functions/play-billing-rtdn/index.ts` written | ⚠️ Not deployed |
| Sandbox purchase test | not run | ⚠️ |
| Cascade telemetry (14 events) | `payments/cascade._trackTransition` | ✅ |
| Auto-downgrade on grace lapse | `cascade.autoDowngrade` + `graceLapsed` | ✅ |
| Refund handler | `cascade.refunded` | ✅ |

### 1.13 Privacy + data ownership

| Feature | Evidence | Status |
|---|---|---|
| UK GDPR Article 9 explicit consent | `Article9ConsentScreen.js` + migration 019 + RPC | ✅ |
| Consent log audit table | `consent_log` table | ✅ |
| Consent withdrawal flow | `SettingsScreen.js:227+` + migration 041 | ✅ |
| Account deletion: data wipe RPC | `delete_user_data` RPC (migration 025) | ✅ |
| Account deletion: auth.users delete | `auth.admin.deleteUser` via Edge Function | ✅ |
| Account deletion: non-cascading audit | `account_deletions_log` (migration 039) + start/complete RPCs | ✅ |
| FTC HBNR breach-notification language in privacy policy | `public/privacy/index.html` | ⚠️ Verify text |
| PII scrub on Sentry events | `observability/sentryScrub.js` + 110 audit tests | ✅ |
| Local SQLite as device source of truth | per `IDENTITY_AND_OWNERSHIP_LOCKED.md` | ✅ |
| Sign-out wipes everything device-side | store action + `wipeAllUserData` | ✅ |
| Cross-user wipe protection | `LoginScreen.js:126` | ✅ |
| Composite `(user_id, id)` PKs on all user-scoped tables | per identity refactor (migrations 018, 020, 021, 024) | ✅ |
| CI grep enforces no `SET user_id` | `scripts/check-identity-invariant.sh` | ✅ |
| Privacy policy URL at `volyume.app/privacy` | `public/privacy/index.html` + `deploy-pages.yml` | ⚠️ DNS pending |
| Single URL source | `lib/links.LINKS` | ✅ |
| Health-data consent flag in user profile | `users_profile.health_data_consent` | ✅ |
| `record_health_consent` RPC for consent + withdraw | migration 019 | ✅ |
| OFF write-back consent toggle | `food/writeback.getConsent` / `setConsent` | ✅ |

### 1.14 Settings + accessibility

| Feature | Evidence | Status |
|---|---|---|
| Units (kg / lbs / stone) | `useAppStore.setUnits` + `units.js` | ✅ |
| Body weight units (kg / lbs / stone) | `useAppStore.bodyWeightUnits` | ✅ |
| Larger text toggle | `Settings.setAccessibilityPref('largerText', v)` | ✅ |
| Reduce motion toggle | `accessibility.reduceMotion` consumed by PRCelebration, HomeScreen | ✅ |
| Accessibility prefs persistence | `lib/accessibilityPrefs.js` + AsyncStorage | ✅ |
| Account name edit | `Settings.js:729` `saveLocalProfile` | ✅ |
| Tester build identifier copy | `SettingsScreen` per BACKLOG | ✅ |
| BETA badge in About | per BACKLOG | ✅ |
| Data export (CSV diary) | `food/csvExport.exportDiaryCsv` | ✅ |
| Data export (CSV workouts) | `database.buildWorkoutCSV` | ✅ |
| Full JSON backup | `dataBackup.exportBackup` | ✅ |
| Full JSON restore | `dataBackup.importBackup` | ✅ |
| Sign-out | confirmed in `SettingsScreen.js:363` | ✅ |
| Health permissions management | `health.openSystemHealthSettings` | ✅ |
| Notification settings landing | `NotificationSettingsScreen.js` | ✅ |
| Coaching reminders | `CoachingRemindersScreen.js` | ✅ |
| Wellbeing mode (calm) | `wellbeing.setWellbeingMode` | ✅ |
| Debug log access | `DebugLogScreen.js` | ✅ |
| Credits / attribution | `CreditsScreen.js` | ✅ |
| EAS Update (OTA) on launch | `expo-updates` + Settings prompt | ✅ |
| App version + native version display | `expo-application` + Settings | ✅ |
| Orphaned routine cleanup (dev) | `database.deleteOrphanedRoutines` | ✅ |
| Workout history wipe | `database.clearWorkoutHistory` | ✅ |
| Import (external CSV / Strong / Hevy) | `ImportScreen.js` + `importExternal.js` | ✅ |

### 1.15 Observability + telemetry

| Feature | Evidence | Status |
|---|---|---|
| Sentry error reporting | `lib/sentry.js` | ✅ |
| Sentry breadcrumbs from telemetry events | `telemetry/sentryBridge.mirrorAsBreadcrumb` | ✅ |
| Crash detection on cold-launch | `observability.detectCrashedLastSession` | ✅ |
| Shutdown handler | `observability.installShutdownHandler` | ✅ |
| Current screen + user binding | `observability.setCurrentScreen` / `setCurrentUserId` | ✅ |
| Engine telemetry queue | `engineTelemetry.track` + `flushPendingTelemetry` | ✅ |
| Allow-list enforcement | `telemetry/events.ALLOWED_EVENTS` (38 live, 4 deferred) | ✅ |
| 8 dashboard panels | 7 wired, Panel 7 absent from canonical list | ⚠️ |
| 22 user-action audit breadcrumbs | `observability.audit` calls across workout / food / auth / privacy / payments | ✅ |
| `engine_telemetry_daily` view for cohorts | migration 017 | ✅ |
| Error ring buffer (200 events) | `errorLog.js` | ✅ |
| Local error / warn / info log | `errorLog.logError` / `logWarn` / `logInfo` | ✅ |
| Crash log capture | `errorLog.getCrashLog` | ✅ |
| Errors export as text | `errorLog.exportErrorsAsText` | ✅ |
| In-app feedback prompt + sheet | `lib/feedback.js` + `FeedbackSheet.js` | ✅ |
| Store review prompt (Android Play Store) | `lib/storeReview.js` | ✅ |
| Toast notifications | `Toast.js` provider + `useToast` | ✅ |
| Sync status badge in nav header | `SyncStatusBadge.js` | ✅ |
| Skeleton loaders on 8 screens | per BACKLOG | ✅ |
| Empty-state illustrations (5) | `Illustrations.js` | ✅ |

### 1.16 Sync (cloud)

| Feature | Evidence | Status |
|---|---|---|
| 16-table sync registry | `lib/sync/registry.SYNC_REGISTRY` | ✅ |
| Bidirectional sync for 13 tables | registry | ✅ |
| Pull-only sync for 3 server-authoritative tables | `daily_intake_rollups`, `ed_pattern_flags`, `tier_history` | ✅ |
| Last-write-wins conflict resolution | `lib/sync/conflict.js` | ✅ |
| Per-column merge strategy for profiles | `column_updates_at` jsonb + migration 045 | ✅ |
| Soft-delete tombstone propagation | `deleted_at` on 7 of 16 tables | ✅ |
| Sync queue (offline writes) | `pending_sync_ops` + `syncQueue.js` | ✅ |
| Debounced sync after each DB write (~2s) | `database.js:14 _scheduleSync` | ✅ |
| Foreground / network reconnect trigger | App.js AppState listener | ✅ |
| 15-min periodic sync | App.js | ✅ |
| Bulk upload on first sign-in | `sync.bulkUploadLocalData` | ✅ |
| Pull from cloud on sign-in | `sync.pullFromCloud` | ✅ |
| Per-table push handlers (10 files) | `lib/sync/tables/*` | ✅ |
| Food domain coordinator (7 tables, single bulk RPC pair) | `tables/foodDomain.js` | ✅ |
| Sync conflict telemetry | migration 043 + `sync_conflict_resolved` event | ✅ |
| Sync run telemetry | `sync_run` event | ✅ |
| Two coexisting sync layers (legacy `sync.js` + modular `sync/`) | drift to resolve | ⚠️ |
| Cloud schema drift audit query | `supabase/audit_cloud_schema_drift.sql` | ✅ |

### 1.17 Polish + UX details

| Feature | Evidence | Status |
|---|---|---|
| Theme tokens (no hardcoded hex) | `src/styles/theme.js` | ✅ |
| Outstanding hex lapses | `Article9ConsentScreen.js:151,262`, `CoachOutputScreen.js:1391`, `NutritionTargetsScreen.js:906` | ⚠️ |
| Hidden em dashes in code comments | various files | ⚠️ |
| British English throughout user copy | per voice rules | ✅ |
| `Precision Coaching` proper noun | `whyThisTemplates.js` | ✅ |
| Jargon blocklist tests | `__tests__/jargonBlocklist.test.js` | ✅ |
| Voice snapshot tests | `weeklyCoach.voice.snapshot.test.js`, `whyThisTemplates.snapshot.test.js` | ✅ |
| Brand mark + variants | `BrandMark.js` (`VolyumeMark`, `VolyumeIcon`, `VolyumeWordmark`, `BrandTag`) | ✅ |
| Locked background `#0D0D0D`, no gradients | per CLAUDE.md design rule | ✅ |
| Skeleton loading on 8 screens | per BACKLOG | ✅ |
| Toast surface | `Toast.js` provider | ✅ |
| Pull-to-refresh on Analytics + AthleteHub + Plans + Home | `RefreshControl` per screen | ✅ |
| Haptics vocabulary (`setLogged`, `prAchieved`, `restDone`, etc.) | `lib/haptics.js` | ✅ |
| Plate calculator | `PlateCalculator.js` | ✅ |
| Info tooltips per surface | `InfoTooltip.js` | ✅ |
| Peek menu (long-press action sheet) | `PeekMenu.js` | ✅ |
| Date picker / pager helpers | per Diary + WeeklyCheckIn | ✅ |

---

## 2. Genuinely outstanding features (the ranked punch list)

Pulled from the ❌ and ⚠️ rows above. **Founder decisions locked 2026-05-27 evening** are inline in the rows below.

| Rank | Item | Decision | Effort | Owner |
|---|---|---|---|---|
| 1 | ~~Saved meals UI (My Meals templates)~~ **Done 2026-05-29.** `MyMealsScreen` lists saved meals (reached from the food search "My meals" CTA); tap logs the whole bundle to the diary in one go, long-press renames or deletes. Create path is the diary multi-select toolbar's "Save as meal" (snapshots the selected entries into items_json). New `food/db.js` helpers: `createSavedMeal` / `listSavedMeals` / `getSavedMeal` / `renameSavedMeal` / `deleteSavedMeal` / `applySavedMealToDiary` / `computeSavedMealTotals`. **Latent sync bug fixed in passing:** `_savedMealToCloud` serialised `foods_json` + `slot`, columns that exist in neither the cloud DDL (migrate_015) nor the food_sync_push RPC (migrate_016, reads `items_json`), so every meal would have silently lost its contents on sync the moment this UI shipped. Now emits the parsed `items_json` array; `audit_cloud_schema_drift.sql` corrected to match. No migration (table existed since 015). 17 new tests (CRUD + apply + serialiser contract). | done | Claude |
| 2 | ~~BF% input + trend chart in BodyMetrics~~ **Done 2026-05-29.** `BodyMetricsScreen` now has a "Body fat (%)" input in the log form (saves `bodyFatPercent` + `bodyFatSource: 'manual'`; `body_metrics` already had the columns, no migration) and a `BodyFatTrendChart` (mirrors the weight chart) plus a latest-value + delta line in the snapshot card. Delta is rendered neutrally (no good/bad colour) given the screen's ED-sensitivity gate. The engine path is ready: `weeklyCoach.computeFFMFloor` already accepts `bodyFatPercent`; wiring the latest logged BF% into the coach inputs is the remaining FFM-floor follow-up. | done | Claude |
| 3 | ~~Coach training auto-apply (volumeDelta)~~ **Done 2026-05-28** (commit `75dc2d8`). Confirm-then-apply: "Training next week" card surfaces the volume signal with an Apply button; tapping spreads the delta across every trained muscle in next week's `planned_muscle_volume`, each clamped to its own `[mev, mrv]`, source `'coach'`. Founder decided the coach owns next-week volume, so the per-session WorkoutSummary next-week write was removed (no double-count). Pure compute in `coachApply.computeVolumeApply` with tests. | done | Claude |
| 4 | ~~Coach steps + cardio auto-apply~~ **Done 2026-05-28** (steps `6cd63cd`, cardio `7b2757a`). Confirm-then-apply: steps writes `userProfile.stepsTarget`; cardio writes `userProfile.cardioPrescription`. Both gate an adherence question on the weekly check-in (the existing destination), feeding the next coach run. Cardio adherence needed a column: local migration in `database.js` + cloud migration 050 (`weekly_checkins_v2.cardio_adherence`, additive/nullable, founder applies). | done | Claude |
| 5 | ~~Coach deload + diet break auto-apply~~ **Done 2026-05-28**. Confirm-then-apply. **Deload** (founder: "what's done in real life"): applying brings the recovery week forward, next mesocycle week flipped to a deload (`setMesocycleWeekDeload`: `is_deload=1`, `rir_target=4`, both already cloud-synced) and its planned volume cut to the floor (`computeDeloadVolume`, source `'coach'`). `ActiveWorkoutScreen` reads `is_deload` off that week to drive the deload prescription. The coach's deload note was computed but never rendered (void destination); now it replaces the volume row in "Training next week" when suggested. The scheduled final deload stays; coach re-evaluates weekly. `blockAdvisor` is advice-only (never writes), so no write-side reconciliation. **Diet break** (founder: maintenance week): applying raises the deficit back to maintenance (stored `tdee`) for the week, protein held, fat + carbs scaled (`computeDietBreakTargets`), written to `nutrition_targets` like the calorie apply. No migration (all columns exist + sync; applied-state rides in the `output_json` blob). Bug fixed in passing: the calorie apply (`computeCalorieTargets`) was passing only the 3 changed macros to `saveNutritionTargets`, which writes the whole row, so it silently nulled `tdee`/`bmr`/`phase`. Now spreads the full row. New tests in `coachApply.test.js` (27 total). | done | Claude |
| 6 | ~~High-day / low-day macro shift in coach~~ **Done 2026-05-28.** Confirm-then-apply carb cycle, gated by goal phase: fires only when `phase.isCut && (goalLockAdvanced || isCompetitionGoal(trainingGoal))`, so beginner / intermediate cuts stay flat. Pure compute in `coachApply.computeMacroCycle` (protein + fat held every day, carbs cut 25% on rest days and spread onto training days, weekly average kcal unchanged) with tests. The coach embeds the split as `output.macroCycle`; `CoachOutputScreen` shows a "Carbs by day" card with one Apply that writes `userProfile.macroCycle`. `DiaryScreen` reads it and swaps the day's target between the training-day and rest-day split, with the day type derived from whether a workout exists for the date (`hasWorkoutOnDate`), so it stays coach-driven, not a user setting. New `isCompetitionGoal` predicate exported from `coachingGoals.js`. No migration (blob on the local profile, same destination as steps / cardio). | done | Claude |
| 7 | ~~Refeed wiring~~ **Done 2026-05-28.** The dead refeed math (`nutritionEngine.getPlanNutritionContext.refeedRecommendation`) is now live as confirm-then-apply, gated to aggressive cuts + physique competitors (matches the `refeed_prescription` entitlement in `proGate`). Pure compute `coachApply.computeRefeedDay` (raise the day to maintenance via carbs, protein + fat held) with tests. The coach proposes a refeed on a cadence (weekly for competitors, every two weeks for an aggressive cut, tracked via `userProfile.refeed.appliedAt`) and embeds `output.refeed`. `CoachOutputScreen` shows a "Refeed day" card with one Apply that writes `userProfile.refeed` with the confirm timestamp. The Diary resolves the refeed onto the next training day on or after that timestamp (`getFirstWorkoutDateOnOrAfter`) and shows the maintenance / high-carb target there, taking precedence over the row-6 cycle. Coach picks the day, user confirms before the swap. No migration. | done | Claude |
| 8 | ~~Macro rings colour scheme~~ **Done 2026-05-28.** Three-band adherence colour in `MacroRings.bandColour` (exported, tested): under target = brand amber, within 5% of target = success green, over target = warning amber. Applied to the kcal ring and all three macro rings (the old decorative per-macro tints, blue carbs / orange fat, are gone). The over band is amber (`#FFC107`), deliberately not red, so an over-target day reads as a gentle signal; the numeric readouts only turn warning above 105% (was above 100%), softening the prior behaviour toward the adherence-neutral brief. | done | Claude |
| 9 | Cascade gate push notifications (day 19, 21) | Build per spec | S-M | Claude |
| 10 | Subscription payment failure push | Build per spec | S | Claude |
| 11 | Weekly coach output ready push | Build per spec | S | Claude |
| 12 | Sync-layer rework (full-resync cost) | **12b done 2026-05-29.** Discovery: migrate_012 already added `updated_at` + `(user_id, updated_at DESC)` indexes to every heavy table, so the full-resync fix needed NO migration, only a client watermark. `pullFromCloud` now reads a per-table watermark (`lib/sync/watermark.js`, 11 tests) and asks the cloud only for rows changed since the last pull, for: workouts (+sets by parent id), routines (+routine_exercises), mesocycles (+mesocycle_weeks), programmes, morning_weights, coach_outputs, exercise_user_notes. Each cursor advances only on a clean pass and is cleared on sign-out, so sign-in/reinstall still does a full restore. This is a single-device app (per the test-matrix scope), so the watermark is purely a cost win: stop re-pulling rows the device already has every foreground. Tables without a cloud `updated_at` (custom_exercises, user_insights, workout_notes, exercise_goals, planned_muscle_volume, adaptation_events, user_prefs) still full-pull; they'd each need a column to go incremental. 12a (consumer migration off the legacy helpers) remains as optional hygiene. | 12b done | Claude |
| 13 | ~~Two-telemetry-module drift~~ **Done 2026-05-28** (commit `099738f`). Queue + push logic moved from `engineTelemetry.js` into `telemetry/transport.js`; old file is a thin re-export shim so existing callers keep working. New tests at `lib/telemetry/__tests__/transport.test.js` cover allow-list rejection, persist + persist-failure, no-op flushes, multi-row push, partial failures, shim wiring. Bug caught in passing: `useAppStore.clearAuthStateForSignOut` destructured `flushPendingTelemetry` from the wrong module (`lib/sync` instead of `lib/engineTelemetry`); the TypeError was silently swallowed so the flush never ran at sign-out. Fixed. | done | Claude |
| 14 | ~~`STRENGTH_STANDARDS` dedup~~ **Done 2026-05-28** (commit `48717e0`). PRWallScreen now uses only `strengthStandards.getStrengthLevel`. Local `STRENGTH_LIFT_MAP` + `liftKeyFor` removed. The two duplicate per-card display paths (sub-row + chip + next-milestone) collapsed into a single readout. `algorithms.STRENGTH_STANDARDS` + `getStrengthStandard` deleted. `strengthStandards` regex broadened to match the alt names PRWallScreen had locally (`ohp`/`shoulder press`/`military press`, `yates row`, `pendlay`, `safety bar squat`). New tests cover 15 paths. `computeEWMA` confirmed intentional separation, annotation already in place at both `nutritionEngine.js:152` and `weeklyCoach.js:23`. `detectRepRegressions` confirmed single definition (only at `AthleteHubScreen.js:50`); the duplicate flagged in CODE_TRUTH_SURVEY was already removed. | done | Claude |
| 15 | ~~`cycleOverride` dead input~~ **Done 2026-05-28.** The input is now live: opt-in privacy gate is a Settings toggle (`lib/cyclePrefs.js`, off by default, shown only to female users), and when it's on the weekly check-in shows an optional cycle question (`WeeklyCheckInScreen` step 1) whose answer flows into `saveWeeklyCheckin({ cycleOverride })` and on through the existing sync + coach path. **Onboarding was NOT changed:** biological sex is already collected at onboarding by `ProOnboardingScreen` (the basic-stats wizard every beta user hits) and saved to `user_body_profile`, so adding a sex question would duplicate it. The GAP premise came from the stale `strengthStandards.js:6` comment, now corrected. No migration: `cycle_override` and `sex` columns already exist. Gating logic + pref persistence are unit-tested. | done | Claude |
| 16 | ~~Delete `phaseEngine.js` + `coachExport.js`~~ **Done** (commit `9e556c4`). Both files removed; confirmed 2026-05-29 no consumers remain anywhere in `src`. | done | Claude |
| 17 | ~~Move `WEAK_POINT_MUSCLES` to `coachingGoals.js`~~ **Done 2026-05-27.** | done | Claude |
| 18 | Drop `peak_week_plans` table | Migration 049 drafted. **Hold apply** until next AAB ships. `workout_notes` v1 is NOT legacy. | S (when AAB ships) | Both |
| 19 | ~~Drop-set / myo-rep / rest-pause / AMRAP picker~~ **Done 2026-05-29.** Picker shipped earlier (all four in the set-type bottom sheet). **Cluster banner now done:** marking a set myo-reps or rest-pause turns the "Log set" button into "Start cluster"; that locks in the activation effort and opens a banner with a running rep tally (`15 + 5 + 4 = 24 reps`), a mini-set reps input + "Mini-set" button, and "Finish cluster". The whole cluster commits as ONE working set: `actual_reps` is the summed total and the breakdown rides in `notes` ("Myo-reps: 15, 5, 4, 3"), so it counts once for volume + progress with no schema change. Pure logic in `lib/clusterSet.js` (`summariseCluster` / `mergeClusterNote`, 11 tests); `handleCompleteSet` threads the cluster total/notes via an overrides arg. | done | Claude |
| 20 | ~~Per-side L/R reps (unilateral logging)~~ **Done 2026-05-29.** `left_reps` + `right_reps` on `workout_sets` (local schema + cloud migration 054, additive/nullable). A "Track left / right" toggle in SetEntry (per-exercise, remembered on-device via `lib/unilateral.js` AsyncStorage; no exercise-library migration); when on, SetEntry shows two rep steppers and ActiveWorkoutScreen requires both sides. Key design: `actual_reps` stores the LOWER side, so volume + PR + progression (all read `actual_reps`) "use the lower side" with ZERO engine change; the per-side values are a display record ("L 10 / R 9" on logged rows). Sync push (`_upsertSets`) + pull (`insertWorkoutSetFromCloud`) + `createWorkoutSet` carry both columns. Unilateral takes precedence over the cluster path if an exercise is somehow both. 12 tests on the helper; column/placeholder balance verified. | done | Claude |
| 21 | ~~Voice + hex sweep~~ **Done 2026-05-28** (commit `79e06f2`). Hex sweep landed 2026-05-27. Em-dash sweep: `find src -name '*.js' \| sed -i 's/ — /, /g'` covered 814 of 821 instances; 17 trailing em-dashes stripped via a second sed; 4 UI placeholders (`'—'` rendered for null values in SyncStatusBadge, TierComparisonStrip x2, SettingsScreen consent row) replaced with `'-'`; 3 section-header decorators in `algorithms.js` cleaned. Deliberately preserved: `food/ocrParser.js:24` (the `[–—]` regex IS the substitution rule mapping en/em dashes to hyphens in OCR'd labels) and `differentialPaywall.test.js:399, 415` (the literal `'—'` IS the lint guard). 141 files changed, 818/818 line symmetry confirms pure character substitution. | done | Claude |
| 22 | ~~Microsoft OAuth~~ **Done** (export removed in commit `9e556c4`). Only Google + Apple are wired (`signInWithGoogle` / `signInWithApple`). 2026-05-29: corrected the stale "Microsoft / Azure" comments in `supabase.js` to "Google / Apple". | done | Claude |
| 23 | ~~Body measurement UI in BodyMetrics~~ **Confirmed shipped 2026-05-27** (9 measurements + per-measurement chart). | done | Claude |
| 24 | ~~FTC HBNR language in privacy~~ **Confirmed present 2026-05-27** at section 11. | done | Claude |
| 25 | ~~3 v1.1 features in FEATURE_MAP~~ **Done 2026-05-29** (bar the deferred photo item). Refeed = row 7. BF% input + trend = row 2. **BF% trend smoothing now done:** the BodyFatTrendChart plots an EWMA-smoothed line (new generic `ewmaValues` in `nutritionEngine.js`, same 0.28 alpha as the weight trend, 5 tests) with the raw readings as a faint second line. **Share-pack PDF now done:** ShareCardScreen has a "Save as PDF" action that builds a branded one-page summary (locked #0D0D0D + amber, no gradients) from the same session/PR data via `expo-print` and shares it through `expo-sharing`. Only delta-since-photo remains, still deferred (blocked on the photo timeline per `BUDGET_POSTURE_LOCKED.md`). | done (delta-since-photo deferred) | Claude |
| 26 | ~~Long-press multi-select toolbar on Diary~~ **Done 2026-05-28.** Long-press a diary row enters selection mode (checkboxes, swipe disabled); bottom toolbar offers Move (slot picker), Copy to today, Delete. Bulk ops live in `lib/food/bulkEntryOps.js` (tested). Move sends the full field set through `updateFoodEntry` so macros survive; copy reuses `logFoodEntry`. | done | Claude |
| 27 | ~~Per-meal macro breakdown sheet on macro ring tap~~ **Done 2026-05-28.** Tapping the macro rings opens `MacroBreakdownSheet` (per-meal kcal + P/C/F + day total), computed from the in-memory entries by the tested `mealBreakdown` helper. Note: the GAP cell pointed at a `BACKLOG.md` deferred entry that does not exist; built a clean minimal sheet to the row's intent instead. | done | Claude |
| 28 | ~~Search subnav tabs~~ **Done 2026-05-28** (client) + **migration pending founder apply.** `FoodSearchScreen` is now a 5-tab subnav (`lib/food/searchTabs.js`): Recents / Favourites / Frequents / Custom / Database, per `UI_FLOWS_LOCKED.md`. Recents/Favourites/Custom read existing local sources; Database is the 250ms waterfall; the query filters curated tabs by name client-side. **Frequents server pipeline** shipped as `migrate_051_food_frequents.sql` (cloud cache table + RLS + nightly `pg_cron` worker computing top-20-over-30-days + `food_frequents_pull` RPC, mirroring migrations 031 + 016), a local cache table, and `lib/food/frequents.js` (refresh-on-tab-open if cache >12h stale; sits outside the runtime-critical food sync cycle). **Founder must apply migrate_051** (see `supabase/README.md` § Verify food_frequents); until then the Frequents tab shows its empty state. **Note:** the old ad-hoc "Excluded" browse list was dropped (not one of the 5 locked tabs); the dislike preference still works via long-press. `selectTabRows` + `frequentsCacheStale` unit-tested. | done* | Claude |

---

## 3. Founder action queue (external)

| Item | Status | Why |
|---|---|---|
| Apply migration 048 (`food_favourites.kind`) | **Approved to apply now** 2026-05-27. | unlocks dislike toggle cloud-side |
| Apply migration 049 (drop `peak_week_plans`) | **Hold until next AAB ships** to avoid sync errors on the closed-test build. | schema hygiene |
| Tear down `volyume-e2e-test` Supabase project + 4 secrets | pending | T7/T8 suite deleted as out of scope |
| Close PR #5 without merging | pending | live-cloud work reverted |
| Point `volyume.app` DNS at GitHub Pages | pending | privacy URL resolution |
| Add `EXPO_PUBLIC_USDA_API_KEY` repo secret (optional) | pending | enables USDA fallback in waterfall |
| Generate Android upload keystore | pending Phase A exit prep | blocks any new AAB |
| Deploy `play-billing-rtdn` Edge Function + Pub/Sub topic + service account | pending Phase A exit prep | RTDN purchases |
| Create 3 SKU products in Play Console | pending Phase A exit prep | enables purchase flow |
| Sandbox tester setup + end-to-end purchase test | pending Phase A exit prep | verifies tier_history + trial_state |

---

## 4. Out of scope (kept here so nothing gets re-proposed)

Per `BACKLOG.md` NEVER list and `CURRENT_STATUS.md § 8 EXPLICITLY OUT OF SCOPE`:

**Hard product exclusions:**

- Social feed / community.
- Gamification beyond the week-streak chip carve-out.
- Wearable / Health API integration beyond Health Connect / HealthKit one-way weight/steps reads + workout write.
- Peak Week module (founder removed 2026-05-25; `peak_week_plans` table cleanup outstanding).
- AI / LLM-assisted plan generation.
- RevenueCat (founder switched to Play Billing direct 2026-05-25).
- Complete tier + 28-day Complete→Pro cascade (consolidated to 2-tier 2026-05-25).

**Deferred to v1.1 or later:**

- Recipe URL importer.
- Body composition deep charts.
- Share-pack PDF.
- Refeed automation across any cut.
- Coach surface (phase 2 B2B).
- Email notifications client-facing.
- Photo cloud sync (photos stay on-device forever).
- AI photo logging (never).
- Apple Watch app (never at v1).
- Web app for end users (never at v1).
- iOS / Apple Developer / App Store Connect (Android-first, iOS after Android ships, not locked never).
- Cloud infrastructure migration to Azure / AWS (until post-launch stability).

---

## 5. Reading order for new sessions

1. `CLAUDE.md` (voice + engineering rules + branch policy).
2. `docs/CURRENT_STATUS.md` (executive summary of where we are).
3. **This doc** (what we have vs what we need, ranked).
4. `docs/CODE_TRUTH_SURVEY.md` (file:line evidence for everything claimed above).
5. Locked specs (`*_LOCKED.md`) when touching that surface.
