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
CORRECTED to standard: every Screen registration located by EXACT line in `src/navigation/RootNavigator.js`
(**108 registrations**; duplicates across stacks are distinct nav nodes, none collapsed). Component file =
`src/screens/<Name>Screen.js`. VALUE DEFERRED = each route's options/params only.
DIARY: Diary :225 · MealPlan :227 · FoodSearch :232 · AddCustomFood :237 · ScanBarcode :242 · ScanLabel :247 ·
LogCardio :252 · CardioHistory :257 · FoodInsights :262 · MyRecipes :267 · MyMeals :272 · RecipeBuilder :277
HOME: Home :293 · BuildWorkout :294 · ActiveWorkout :295 · WorkoutSummary :296 · WorkoutHistory :297 ·
VolumeHeatmap :298 · ShareCard :299 · CoachReview :300 · LogCardio :303 · ProUpgrade :304 · FreeStarter :306
PLANS: Plans :319 · PlanUpdate :320 · PlanDetail :321 · RoutineDetail :322 · ExerciseDetail :323 ·
ManualBuilder :324 · PlanLibrary :325 · MesocycleBuilder :326 · ProUpgrade :327 · FreeStarter :329
PROGRESS: Analytics :342 · WorkoutHistory :343 · WorkoutSummary :344 · VolumeHeatmap :345 · CoachReview :346 ·
BodyMetrics :347 · LiftProgress :348 · Consistency :349 · Partner :350 · ExerciseDetail :351 · YearOfLifts :352 ·
RecapStory :353 · ShareCard :354 · LogCardio :357 · CardioHistory :358 · ProUpgrade :359
PROFILE: You :372 · Settings :373 · SettingsAccount :374 · SettingsProfile :375 · SettingsCoaching :376 ·
SettingsNotifications :377 · SettingsDisplay :378 · SettingsHealth :379 · SettingsData :380 · Snapshots :381 ·
SettingsPrivacy :382 · SettingsAbout :383 · NutritionTargets :384 · NutritionEducation :385 · BodyMetrics :386 ·
WeeklyCheckIn :387 · CoachOutput :388 · Methodology :389 · ShareCard :390 · CoachHeldHistory :391 ·
BlockReflection :392 · ProGoalSetup :393 · GoalChangeSummary :394 · GoalLockConsent :395 · NotificationSettings :396 ·
Import :397 · CoachingReminders :398 · WellbeingCheck :399 · PrivacyPolicy :400 · DebugLog :401 ·
SubscriptionPolicy :402 · Subscription :403 · CascadeGate :404 · Paywall :405 · Credits :406 · ProUpgrade :407
TABS: HomeTab :445 · PlansTab :446 · DiaryTab :447 · ProgressTab :448 · ProfileTab :449
WELCOME/AUTH: Welcome :457 · QuizTraining :460 · PlanPreview :461 · Login :462
FIRST-RUN: FirstRunBranch :470 · FreeStarter :475 · PlanLibrary :476 · PlanDetail :477 · ActiveWorkout :478
CONSENT: Article9Consent :490 · PrivacyPolicy :494
PRO-ONBOARDING: ProOnboarding :502 · PlanLibrary :503 · PlanDetail :504 · ActiveWorkout :505 ·
ProSetupComplete :506 · NutritionEducation :509 · GoalLockConsent :513
COMPLETENESS: 108 registrations located by exact line (grep `name="` count = 108). Tier fork at
RootNavigator.js:1138 (tier==='pro' ? ProOnboardingStack : FirstRunStack).

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
