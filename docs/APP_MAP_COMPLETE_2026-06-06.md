# Volyume complete app map

Built 2026-06-06 from the code (`src/navigation/RootNavigator.js`, `src/screens`,
`src/lib`, `src/components/ProGate.js`, `src/lib/proGate.js`), cross-checked
against the screen list. 69 screens, 5 tabs, plus pre-auth/onboarding stacks.

This map's primary job is the **real tier-gating boundary** (free vs Pro as
actually implemented), because that is the prerequisite for any trial/paywall
work and it is currently partial and inconsistent.

## How gating actually works (the truth)
- Binary, all-or-nothing: `tier === 'pro'` (founder decision 2026-05-29). The
  granular `FEATURE_MAP`/`PRO_ROUTES` layer was built then removed; nothing gates
  per-feature.
- Two enforcement mechanisms:
  1. **`withProGuard(Screen, label)`** in `RootNavigator.js` (lines 113-118):
     wraps a whole screen so a free user is bounced to the upsell. Six screens.
  2. **Inline `tier === 'pro'`** checks inside a screen, hiding individual cards
     (HomeScreen has 11, PlansScreen 5).
- **`PRO_BETA_ACTIVE = true`** (`src/lib/proGate.js`) forces every signed-in user
  to `tier = 'pro'` during the closed beta, so the free path below is NOT
  exercised on your test device. You always see Pro.

## The tier boundary, as implemented

### Pro, gated by `withProGuard` (free user is bounced to upsell)
- `WeeklyCheckInScreen` ("Weekly check-in")
- `NutritionTargetsScreen` ("Nutrition targets")
- `BodyMetricsScreen` ("Body metrics")
- `CoachOutputScreen` ("Your week")
- `ProGoalSetupScreen` ("Pro goal setup", the Update-your-plan flow)
- `CoachingRemindersScreen` ("Coaching reminders")

### Pro, gated inline (cards hidden from free users)
- Home: morning-weight card, daily-steps card, cardio card, coach banner,
  next-workout card, and the today-weight/coach/first-run data loads
  (`HomeScreen.js` 200, 719, 860, 950, 956, 1006). Free users get the
  `tier !== 'pro'` stripped Home (1218, 1236).
- Plans: the goal-change action routes to `ProUpgrade` for free users; some
  action cards differ (`PlansScreen.js` 273, 372, 450, 527).

### FREE today (ungated) — including things your Play copy calls Pro
- **The entire Diary tab is ungated.** `DiaryStack` (DiaryScreen, FoodSearch,
  AddCustomFood, **ScanBarcode**, ScanLabel, **LogCardio**, CardioHistory,
  FoodInsights, MyRecipes, MyMeals, RecipeBuilder) has no guard. So food logging,
  barcode scanning, label scanning, cardio logging and recipes are reachable by
  free users. **This contradicts the Play Store copy**, which lists the food
  diary, barcode and cardio as Pro. This is the main leak.
- Training: ActiveWorkout, WorkoutSummary, WorkoutHistory, VolumeHeatmap,
  BuildWorkout, ShareCard are ungated (free).
- Plans tab: Plans, PlanDetail, RoutineDetail, ExerciseDetail, ManualBuilder,
  **PlanLibrary**, MesocycleBuilder are ungated (free). Plan Library is free by
  design (matches Play copy).
- Progress tab: Analytics, LiftProgress, Consistency, YearOfLifts, ExerciseDetail
  are ungated; only BodyMetrics within Progress is guarded.

Net: a real free user keeps the Plan Library, training + logging, progress
charts, AND (currently, by leak) the whole food diary + barcode + cardio logging.
They lose the coaching layer: weekly check-in, the "Your week" coach output,
nutrition targets, body metrics, goal setup, and the Home coaching surfaces.

## Navigation tree (tabs -> stacks -> screens)

MainTabs (post-auth):
- **HomeTab / HomeStack:** Home, BuildWorkout, ActiveWorkout, WorkoutSummary,
  WorkoutHistory, VolumeHeatmap, ShareCard, CoachReview, LogCardio, ProUpgrade.
- **PlansTab / PlansStack:** Plans, PlanDetail, RoutineDetail, ExerciseDetail,
  ManualBuilder, PlanLibrary, MesocycleBuilder, ProUpgrade.
- **DiaryTab / DiaryStack:** Diary, FoodSearch, AddCustomFood, ScanBarcode,
  ScanLabel, LogCardio, CardioHistory, FoodInsights, MyRecipes, MyMeals,
  RecipeBuilder. (Whole stack ungated.)
- **ProgressTab / ProgressStack:** Analytics, WorkoutHistory, WorkoutSummary,
  VolumeHeatmap, CoachReview, BodyMetrics (guarded), LiftProgress, Consistency,
  ExerciseDetail, YearOfLifts, ShareCard, LogCardio, CardioHistory, ProUpgrade.
- **ProfileTab / ProfileStack:** You, Settings (+ SettingsAccount, Profile,
  Coaching, Notifications, Display, Health, Data, Privacy, About),
  NutritionTargets (guarded), NutritionEducation, BodyMetrics (guarded),
  WeeklyCheckIn (guarded), CoachOutput (guarded), ShareCard, CoachHeldHistory,
  BlockReflection, ProGoalSetup (guarded), GoalChangeSummary, GoalLockConsent,
  NotificationSettings, Import, CoachingReminders (guarded), WellbeingCheck,
  PrivacyPolicy, DebugLog, SubscriptionPolicy, Subscription, CascadeGate,
  Paywall, Credits, ProUpgrade.

Pre-auth / onboarding (chosen in RootNavigator by auth + first-run + tier):
- **WelcomeStack:** Welcome, Login.
- **FirstRunStack** (free signup path): FirstRunBranch (FirstRunScreen),
  PlanLibrary, PlanDetail, ActiveWorkout.
- **ProOnboardingStack** (Pro signup path): ProOnboarding, PlanLibrary,
  PlanDetail, ActiveWorkout, ProSetupComplete, NutritionEducation,
  GoalLockConsent.
- **Article9** gate: Article9ConsentScreen, PrivacyPolicy (health-data consent,
  starts the trial state).

## Screen purposes (one line each, by area)
Auth/onboarding: Welcome (tier choice), Login (email + Google/Apple OAuth, web),
FirstRun (free first-run), ProOnboarding (paid wizard), ProSetupComplete,
Article9Consent (health-data consent + trial start), NutritionEducation,
GoalLockConsent.
Train: Home (dashboard), BuildWorkout, ActiveWorkout (live logging),
WorkoutSummary (finish + share), WorkoutHistory, VolumeHeatmap, ShareCard,
CoachReview, YearOfLifts.
Plans: Plans (active plan), PlanDetail, RoutineDetail, ExerciseDetail,
ManualBuilder, PlanLibrary (prebuilt plans, free), MesocycleBuilder.
Diary (free): Diary (day food/water/steps), FoodSearch, AddCustomFood,
ScanBarcode, ScanLabel, LogCardio, CardioHistory, FoodInsights, MyRecipes,
MyMeals, RecipeBuilder.
Progress: Analytics, LiftProgress, Consistency, BodyMetrics (Pro),
ExerciseDetail.
Coaching (Pro): WeeklyCheckIn, CoachOutput ("Your week"), NutritionTargets,
ProGoalSetup (Update your plan), GoalChangeSummary, CoachHeldHistory,
BlockReflection, CoachingReminders, WellbeingCheck.
Account/settings: You, Settings + 8 sub-settings, NotificationSettings, Import,
DebugLog, Credits, PrivacyPolicy.
Payments: Subscription, SubscriptionPolicy, CascadeGate (trial gate), Paywall,
ProUpgrade (the upsell free users are bounced to).

## Core lib subsystems
Engine: algorithms, planEngine, planAutoGen, planSwitch, mesocycle, poolGenerator,
swapEngine, blockAdvisor, weeklyCoach, coachApply, coachingGoals, recoveryEMA,
strengthStandards, nutritionEngine, edPatternDetector, differentialPaywall,
insightsEngine, liftProgress.
Data/sync: database (SQLite), sync (+ sync/, syncQueue, syncStatusLabel),
supabase, dataBackup, importExternal, seedExercises, seedRoutines.
Payments: payments/ (catalogue, cascade, playBilling stub, restore).
Domains: food/, cardio/, health, activitySteps, stepsSummary, wellbeing.
Platform: notifications/, observability/ + sentry, engineTelemetry/telemetry/,
errorLog, haptics, units, dayKey, workoutDate, uuid, accessibilityPrefs,
privacyPrefs, links, restSound, restTimerMath, storeReview.

## What this means for monetisation (the headline)
The free/Pro boundary is **not coherent yet**:
- The coaching layer is correctly gated (withProGuard on the 6 coaching screens +
  inline on Home).
- But the **food diary, barcode, label scan and cardio logging are free**, even
  though the Play copy sells them as Pro. Either the copy is wrong or the gating
  is missing. This must be resolved before the trial/paywall, because the trial's
  value proposition (and what a lapsed user loses) depends on it.
- All of it is masked by `PRO_BETA_ACTIVE`, so none of this is observable on the
  beta build; it only bites when the flag flips.

Before any trial-trigger or paywall work: decide the definitive free/Pro list,
then make the gating match it (add `withProGuard` or a tab-level guard to the
Diary surfaces if food/barcode/cardio are meant to be Pro), and only then move
the trial start to the first Pro touch.
