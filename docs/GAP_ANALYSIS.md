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
| Calorie target change auto-applied to DB | `CoachOutputScreen.js:680` `saveNutritionTargets` | ✅ |
| Training signal (push / hold / reduce): advisory only | `weeklyCoach.js:465-471` rendered as text | ⚠️ |
| Steps target change: advisory only | `weeklyCoach.js:592-617` rendered, never persisted | ⚠️ |
| Cardio prescription: advisory only | `weeklyCoach.js:623-647` rendered, never persisted | ⚠️ |
| Deload week suggestion: advisory only | `weeklyCoach.js:660-670` | ⚠️ |
| Diet break suggestion: advisory only | `weeklyCoach.js:680-698` | ⚠️ |
| Refeed prescription | engine math in `nutritionEngine.getPlanNutritionContext`; **never called** | ❌ |
| High-day / low-day macro shift | not in code at all | ❌ |
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
| Over-target colours rings warning | `MacroRings.js:61-75` | ⚠️ (Adherence-neutral wanted) |
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
| 1 | Saved meals UI (My Meals templates) | Build it. Mirror the recipe pattern. | M | Claude |
| 2 | BF% input + trend chart in BodyMetrics. Required for accurate FFM-aware floor. | Build it as part of body composition deep (v1.1 row 25 below). | S-M | Claude |
| 3 | Coach training auto-apply (volumeDelta) | **Confirm-then-apply.** Coach card surfaces "+2 sets" suggestion with Apply button. User taps to commit. | S impl | Claude |
| 4 | Coach steps + cardio auto-apply | **Confirm-then-apply** (matches training). | S impl | Claude |
| 5 | Coach deload + diet break auto-apply | **Confirm-then-apply** (matches training + steps). | S impl | Claude |
| 6 | High-day / low-day macro shift in coach | **Build it, gated by goal phase.** Fires for advanced cuts + physique_competition only. Beginner / intermediate cuts stay flat. | M | Claude |
| 7 | Refeed wiring | **Wire as confirm-then-apply.** Coach picks the day, user confirms before the kcal swap. Matches the broader auto-apply policy. | M | Claude |
| 8 | Macro rings colour scheme | **Three-band: under = primary amber, at = success green (within 5%), over = warning amber.** Kcal ring same scheme. | S | Claude |
| 9 | Cascade gate push notifications (day 19, 21) | Build per spec | S-M | Claude |
| 10 | Subscription payment failure push | Build per spec | S | Claude |
| 11 | Weekly coach output ready push | Build per spec | S | Claude |
| 12 | Resolve two-sync-layer drift (legacy `sync.js` vs `lib/sync/`) | Migrate consumers off legacy, delete duplicated helpers | M | Claude |
| 13 | ~~Step 1 of two-telemetry-module drift~~ **Done 2026-05-27.** `engineTelemetry.ALLOWED_EVENTS` now imports from canonical `telemetry/events.js`. Full fold-in of the queue + push logic into `telemetry/transport.js` still pending. | S (remaining fold-in) | Claude |
| 14 | `STRENGTH_STANDARDS` dedup (PRWallScreen refactor to use only `strengthStandards.getStrengthLevel`). `computeEWMA` confirmed intentional separation, annotated. `detectRepRegressions` confirmed single definition. | S-M | Claude |
| 15 | `cycleOverride` dead input | **Build the input with privacy gate** + **ask biological sex at onboarding**. If female, cycle checkbox appears on weekly check-in. Coach reads it via existing path. | M (onboarding + schema + check-in) | Claude |
| 16 | Delete `phaseEngine.js` + `coachExport.js` | **Delete both.** No consumers; phase 2 will rebuild from current requirements. | S | Claude |
| 17 | ~~Move `WEAK_POINT_MUSCLES` to `coachingGoals.js`~~ **Done 2026-05-27.** | done | Claude |
| 18 | Drop `peak_week_plans` table | Migration 049 drafted. **Hold apply** until next AAB ships. `workout_notes` v1 is NOT legacy. | S (when AAB ships) | Both |
| 19 | Drop-set / myo-rep / rest-pause / AMRAP picker | **Add all four with cluster banner.** Plain-language labels; cluster banner shows activation set + mini-set counter + "Cluster complete" button. | M | Claude |
| 20 | Per-side L/R reps (unilateral logging) | **Build it.** `leftReps` + `rightReps` columns on `workout_sets`. Per-exercise "track L/R" toggle. SetEntry shows two rep inputs when on. PR detection uses lower side. | M (schema + migration + UI + engine) | Claude |
| 21 | Voice + hex sweep | **Hex done 2026-05-27** (ScanBarcode, CoachingReminders, Apple OAuth tokens). Em-dash sweep over code comments still pending. | S | Claude |
| 22 | Microsoft OAuth | **Remove the unused export from `supabase.js:171`.** Google + Apple cover the paths used. | S | Claude |
| 23 | ~~Body measurement UI in BodyMetrics~~ **Confirmed shipped 2026-05-27** (9 measurements + per-measurement chart). | done | Claude |
| 24 | ~~FTC HBNR language in privacy~~ **Confirmed present 2026-05-27** at section 11. | done | Claude |
| 25 | 3 v1.1 features in FEATURE_MAP | **Ship all three.** Refeed = row 7 above. Body comp deep = BF% input + trend smoothing + delta-since-photo (extends row 2). Share-pack PDF = extend ShareCardScreen to PDF export. | M (across the three) | Claude |
| 26 | Long-press multi-select toolbar on Diary | **Build full toolbar: Delete + Copy to today + Move meal slot.** | S-M | Claude |
| 27 | Per-meal macro breakdown sheet on macro ring tap | Build per `BACKLOG.md` deferred entry. | S | Claude |
| 28 | Search subnav tabs (Recents / Favourites / Frequents / My Foods / My Recipes / Database) | Build per `UI_FLOWS_LOCKED.md`. | S-M | Claude |

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
