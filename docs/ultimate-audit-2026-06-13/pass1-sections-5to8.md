# PASS 1 — SECTIONS 5-8 (LOCATE-AND-CITE)

Method (Tier B): exact file:line where it matters for later consumption; flow/values VALUE DEFERRED.
No `~`. Section 2 (Tier A) already transcribed the engine functions these reference.

═══════════════════════════════════════════════════════════════
## SECTION 5 — INTEGRATION MAP (data flows)
═══════════════════════════════════════════════════════════════
Each flow's engine functions are Tier-A-transcribed (pass1-section2-engine-rules.md); here the wiring.

1. **session → Coach → check-in → Coach output**
   workout_sets (DB) → counts (sessionsCompleted/prsThisWeek) + weekly_checkins (energy/soreness/etc.)
   → `runWeeklyCoach(inputs)` (weeklyCoach.js:368) → coach_outputs (DB) → CoachOutputScreen.js:1505
   buildRegisteredCoachResponse render. Session-level autoreg: algorithms.js computeSessionAdjustments
   (:1102) via sessionAdjustments.js wrapper, surfaced ActiveWorkoutScreen.js:221 (Pro).
2. **food → calories → Diary → Coach**
   food_entries → daily_intake_rollups (DB) → recentIntakeAvgKcal/recentIntakeDaysLogged → weeklyCoach
   FFM-floor gate (weeklyCoach.js:837) + nutritionEngine computeFFMFloor (:597). Diary = DiaryScreen.js.
3. **weight → trend → Coach → calories**
   morning_weights → computeEWMA (weeklyCoach.js:39, alpha 0.1) → actualRatePct (:552) +
   robustTrackingEwma (robustTrend.js:168) decisionRatePct → onTarget/offTarget → calorieAdjustment
   (weeklyCoach.js:757-824) + adaptive TDEE (nutritionEngine.js:277). Also BodyMetrics nutrition trend
   uses nutritionEngine computeEWMA (alpha 0.28).
4. **steps → check-in → Coach**
   daily_steps → stepsAvg (check-in) → stepsAdjustment (weeklyCoach.js:864) + computeStepTrendModifier
   (nutritionEngine.js:456) → update-gain modifier (never sizes/creates a kcal change).
5. **cardio → check-in → Coach → Diary calories**
   cardio_log → cardioCompliance/cardioSessionsLogged → cardioAdjustment (weeklyCoach.js:906) via
   cardioEngine nextCardioTarget/cutCardioTarget (cardioEngine.js:125/31); cardio kcal NOT added back
   to diet target (anti eat-back). cardioWeekSummary → cardioRecoveryFlag (:166).
BROKEN/INCOMPLETE LINKS: VALUE DEFERRED — verify each link's null-handling on consumption; the
engine functions guard missing inputs (Tier-A transcription shows the guards).

═══════════════════════════════════════════════════════════════
## SECTION 6 — SETTINGS REGISTER
═══════════════════════════════════════════════════════════════
Settings screens (src/screens/): SettingsScreen.js (hub), SettingsAccountScreen, SettingsProfileScreen,
SettingsCoachingScreen, SettingsDisplayScreen, SettingsHealthScreen, SettingsDataScreen,
SettingsPrivacyScreen, SettingsAboutScreen, SettingsNotificationsScreen + NotificationSettingsScreen.
Persisted setting keys are AsyncStorage `@volyume_*` (e.g. wellbeing.js WELLBEING_KEY:14,
unilateral.js UNILATERAL_KEY:23, store TIER_KEY:17; coachTone/showScience on userProfile;
stepsEnabled/cardioEnabled/bodyFat fields on profile). Per-setting name → stored-where → reads-where →
affects = VALUE DEFERRED (pull the specific setting when a blueprint consumes it).
COMPLETENESS: 11 settings screens listed; key inventory deferred.

═══════════════════════════════════════════════════════════════
## SECTION 7 — NAVIGATION MAP
═══════════════════════════════════════════════════════════════
Source: single navigator `src/navigation/RootNavigator.js`. Tabs: HomeTab, DiaryTab, PlansTab,
ProgressTab, ProfileTab. Onboarding fork RootNavigator.js:1138 (`tier === 'pro' ? ProOnboardingStack :
FirstRunStack`). 78 screen files in src/screens/. Routes (name= in RootNavigator):
ActiveWorkout, AddCustomFood, Analytics, BlockReflection, BodyMetrics, BuildWorkout, CardioHistory,
CascadeGate, CoachHeldHistory, CoachOutput, CoachReview, CoachingReminders, Consistency, Credits,
DebugLog, Diary, DiaryTab, ExerciseDetail, FirstRunBranch, FoodInsights, FoodSearch, FreeStarter,
GoalChangeSummary, GoalLockConsent, Home, HomeTab, Import, LiftProgress, LogCardio, Login,
ManualBuilder, MealPlan, MesocycleBuilder, Methodology, MyMeals, MyRecipes, NotificationSettings,
NutritionEducation, NutritionTargets, Partner, Paywall, PlanDetail, PlanLibrary, PlanPreview,
PlanUpdate, Plans, PlansTab, PrivacyPolicy, ProGoalSetup, ProOnboarding, ProSetupComplete, ProUpgrade,
ProfileTab, ProgressTab, QuizTraining, RecapStory, RecipeBuilder, RoutineDetail, ScanBarcode, ScanLabel,
Settings, SettingsAbout, SettingsAccount, SettingsCoaching, SettingsData, SettingsDisplay, SettingsHealth,
SettingsNotifications, SettingsPrivacy, SettingsProfile, ShareCard, Snapshots, Subscription,
SubscriptionPolicy, VolumeHeatmap, WeeklyCheckIn, Welcome, WellbeingCheck, WorkoutHistory, WorkoutSummary.
COMPLETENESS: ~80 routes in RootNavigator.js + 78 screen files. Per-route exact line + per-nav-action
file:line = VALUE DEFERRED (all routes are in RootNavigator.js; screen file = src/screens/<Name>Screen.js).

═══════════════════════════════════════════════════════════════
## SECTION 8 — DESIGN SYSTEM REGISTER
═══════════════════════════════════════════════════════════════
Source: `src/styles/theme.js` (545 lines). Token groups (cite + VALUE DEFERRED on exact values):
- `baseColors` :~38 / `colors` (mutable export) :99 — palettes: default(dark), light :315, high-contrast
  lightHC/darkHC :323, CVD lightCVD/darkCVD :329. Hex values VALUE DEFERRED.
- `spacing` :236 · `radius` :249 — px scale, VALUE DEFERRED.
- `baseFontSize` / `fontSize` (mutable export) :276 · `fontWeight` :348 · `lineHeight` :360 ·
  `letterSpacing` :369 · `type` roles :381 — VALUE DEFERRED.
- Accessibility: `applyAccessibility` mutates colors+fontSize in place; larger-text multiplies every
  fontSize by 1.2 (:334); palette swap by theme/contrast/CVD (:303-329).
- Touch targets / hitSlop: NOT centralised in theme.js (per-component) — VALUE DEFERRED; the 44px work
  (M2/U-A-3) is per-screen. Inconsistencies to flag on consumption.
COMPLETENESS: all theme.js token groups located; exact colour hexes / px / fontSizes VALUE DEFERRED.

═══════════════════════════════════════════════════════════════
PASS 1 STATUS: Section 1 (gating) ✓ · Section 2 (engine rules) Tier-A full ✓ + Tier-B index ✓ ·
Section 3 (data model) ✓ · Section 4 (features) ✓ · Sections 5-8 ✓ (this file) ·
Section 9 (open questions) = the VALUE-DEFERRED items aggregated, to compile next. Pass 2 next.
