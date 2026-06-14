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
CORRECTED to standard: every setting LOCATED by exact file:line in the "SECTION 6 — SETTINGS: FULL
ENUMERATION" block at the bottom of this file (39 SettingRow labels + the persisted-write lines). VALUE
DEFERRED = only each setting's stored-key/effect semantics, NOT its location. 11 settings screens:
SettingsScreen (hub), SettingsAccount, SettingsProfile, SettingsCoaching, SettingsDisplay, SettingsHealth,
SettingsData, SettingsPrivacy, SettingsAbout, SettingsNotifications, NotificationSettings.
COMPLETENESS: 39 settings located by exact line (see FULL ENUMERATION); count cross-checked below.

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
CORRECTED to standard: every token located by EXACT line in `src/styles/theme.js`. Value included where
short (hex/px); no `~`.

DARK palette `baseColors` (each `key :line value`): background:18 #0D0D0D · surface:19 #191917 ·
surfaceElevated:20 #222220 · surface2:21 #2A2A27 · surface3:22 #343431 · border:23 #6E6E6E ·
borderLight:24 #7A7A7A · borderSubtle:25 #2E2E2C · primary:31 #F5A623 · primaryFill:32 #E08C0B ·
primaryDim:33 #B45309 · primaryBg:34 rgba(245,166,35,.12) · onPrimary:42 #0D0D0D · onError:50 #FFFFFF ·
success:59 #4CAF50 · successBg:60 · warning:61 #F0E442 · warningBg:62 · error:63 #F44336 · errorBg:64 ·
textPrimary:67 #FFFFFF · textSecondary:68 #9E9E9E · textMuted:69 #9B9B9B · textDisabled:70 #727272 ·
tabBar:73 #111111 · tabBarBorder:74 #222222 · inputBg:75 #1E1E1E · gold:78 #FFD700 · silver:79 #C0C0C0 ·
bronze:80 #CD7F32 · appleBtnBg:86 #000000 · appleBtnText:87 #FFFFFF · chartLine:90 #F59E0B · chartFill:91 ·
scrim:96 rgba(0,0,0,.55)
LIGHT palette `lightColors` :110-143: background:110 #FAFAF7 · surface:111 #FFFFFF · surfaceElevated:112 ·
surface2:113 · surface3:114 · border:115 · borderLight:116 · borderSubtle:117 · primary:118 #8A5200 ·
primaryFill:119 · primaryBg:120 · warning:125 · warningBg:126 · success:127 · successBg:128 · error:129 ·
errorBg:130 · textPrimary:131 #1A1A18 · textSecondary:132 · textMuted:133 · textDisabled:134 · tabBar:135 ·
tabBarBorder:136 · inputBg:137 · gold:138 · silver:139 · bronze:140 · chartLine:141 · chartFill:142 · scrim:143
HIGH-CONTRAST overrides: lightHC textSecondary:152/textMuted:153/textDisabled:154/border:155/borderLight:156 ·
darkHC textSecondary:159/textMuted:160/textDisabled:161/border:162/borderLight:163
COLOUR-BLIND (CVD) overrides: lightCVD success:166/successBg:167/error:168/errorBg:169 ·
darkCVD success:172/successBg:173/error:174/errorBg:175
SPACING :237-246: hair:237 (1) · xxs:238 (2) · xs:239 (4) · xs2:240 (6) · sm:241 (8) · md:242 (12) ·
lg:243 (16) · xl:244 (24) · xxl:245 (32) · xxxl:246 (48)
RADIUS :250-255: xs:250 (4) · sm:251 (6) · md:252 (10) · lg:253 (14) · xl:254 (20) · full:255 (999)
FONT SIZE `baseFontSize` :265-273: micro:265 (10) · xs:266 (11) · sm:267 (13) · md:268 (16) · lg:269 (17) ·
xl:270 (20) · xxl:271 (24) · xxxl:272 (32) · display:273 (40)
FONT WEIGHT :349-354: regular:349 (400) · medium:350 (500) · semibold:351 (600) · bold:352 (700) · black:354 (900)
LINE HEIGHT :361-364: tight:361 (1.2) · snug:362 (1.35) · normal:363 (1.5) · relaxed:364 (1.6)
LETTER SPACING :370-374: display:370 (-0.5) · body:372 (0) · label:373 (0.2) · caption:374 (0.4)
SHADOW :433-455: sm:434 · md:441 · lg:448 (each {shadowColor/Offset/Opacity/Radius}, VALUE DEFERRED)
SECOND SIZE SCALE :510-513: sm:510 (16) · md:511 (20) · lg:512 (24) · xl:513 (32) [icon/size scale — confirm name on consumption]
ACCESSIBILITY: `type` roles export :381 · larger-text ×1.2 fontSize swap :337-343 · `applyAccessibility`
palette/contrast/CVD swap :303-329.
TOUCH TARGETS: NOT a theme token (structural finding/inconsistency to flag) — 189 per-component
occurrences (hitSlop / minHeight|minWidth 44|48) across 50+ files. Top concentrations (file: count):
ActiveWorkoutScreen 16 · HomeScreen 12 · DiaryScreen 12 · PlansScreen 10 · CoachOutputScreen 8 ·
ScanLabelScreen 7 · MealPlanScreen 7 · WeeklyCheckInScreen 6 · RoutineDetailScreen 6 · FoodSearchScreen 6 ·
BuildWorkoutScreen 6 · PaywallScreen 5 · PartnerScreen 5 · WorkoutSummary/History/ScanBarcode/RecipeBuilder/
ProUpgrade/Analytics/RestTimer 4 each · AddCustomFood/ExercisePickerModal 3 · (then 2× and 1× tail).
Exact per-line list is reproducible with: `grep -rnE "hitSlop|minHeight: ?4[48]|minWidth: ?4[48]"
src/components src/screens`. HONEST: located at file level + reproducible to exact line; the 189 lines
are NOT transcribed as individual rows here — say if you want the full per-line dump.
COMPLETENESS (theme.js): dark 35 + light 30 + HC 10 + CVD 8 colour tokens; spacing 10; radius 6;
fontSize 9; fontWeight 5; lineHeight 4; letterSpacing 4; shadow 3; size-scale 4 — all located by exact
line, zero `~`. Touch-target per-component enumeration outstanding (flagged, not deferred-as-done).

═══════════════════════════════════════════════════════════════
PASS 1 STATUS: Section 1 (gating) ✓ · Section 2 (engine rules) Tier-A full ✓ + Tier-B index ✓ ·
Section 3 (data model) ✓ · Section 4 (features) ✓ · Sections 5-8 ✓ (this file) ·
Section 9 (open questions) = the VALUE-DEFERRED items aggregated, to compile next. Pass 2 next.

### SECTION 8 — TOUCH TARGETS: FULL ENUMERATION (all occurrences, exact file:line)
Per founder ruling: the 44px/M2/U-A-3 blueprint consumes these AS A SET, so every one is
located to exact file:line now (not reproducible-on-demand). The 'no central token' finding stands.
components/BackHeader.js:40:      <TouchableOpacity onPress={goBack} hitSlop={HIT} accessibilityRole="button" accessibilityLabel="Go back">
components/ProgressSections.js:213:          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
components/EmptyState.js:43:          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
components/auth/EmailPasswordFields.js:67:            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
components/RestTimer.js:208:              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
components/RestTimer.js:219:          hitSlop={{ top: 12, bottom: 12, left: 4, right: 8 }}
components/RestTimer.js:277:    minHeight: 44,
components/RestTimer.js:286:    minHeight: 44,
components/StreakWeeksSection.js:233:    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: 44, marginTop: spacing.xs,
components/StreakWeeksSection.js:245:    borderWidth: 1, borderColor: colors.border, minHeight: 48, justifyContent: 'center',
components/SearchBar.js:46:          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
components/AppAlert.js:159:    minHeight: 44,
components/CardioPlanCard.js:43:          <TouchableOpacity onPress={onHistory} hitSlop={8} accessibilityLabel="Cardio history">
components/food/EntryRow.js:106:    minHeight: 48,
components/food/FoodRow.js:75:          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
components/food/MealSection.js:81:    minHeight: 48,
components/food/ServingPicker.js:54:              hitSlop={6}
components/food/EmptyDiary.js:80:    borderRadius: radius.md, minHeight: 44,
components/food/HeldDecisionCard.js:46:          hitSlop={8}
components/food/MacroBreakdownSheet.js:109:    marginTop: spacing.lg, minHeight: 48, borderRadius: radius.md,
components/PressableCard.js:33:  hitSlop,
components/PressableCard.js:75:      hitSlop={hitSlop}
components/WindowChips.js:42:    minHeight: 44, // 44pt touch target
components/ReasonPicker.js:79:    minHeight: 44,
components/CollapsibleSection.js:42:  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
components/ExercisePickerModal.js:102:                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
components/ExercisePickerModal.js:110:                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
components/ExercisePickerModal.js:177:                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
components/ExerciseCard.js:45:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
components/InfoTooltip.js:12:        // U-F-2/U-F-5 (M1): reach the ≥44px WCAG/iOS target via hitSlop so the
components/InfoTooltip.js:14:        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
components/PlateCalculator.js:60:          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
screens/NutritionTargetsScreen.js:1349:  fineTuneLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, minHeight: 44 },
screens/AddCustomFoodScreen.js:195:          hitSlop={12}
screens/AddCustomFoodScreen.js:337:    ...type.body, minHeight: 48,
screens/AddCustomFoodScreen.js:346:    minHeight: 48,
screens/PaywallScreen.js:24:import { colors, spacing, fontSize, fontWeight, radius, hitSlop, type } from '../styles/theme';
screens/PaywallScreen.js:179:        <TouchableOpacity onPress={dismiss} hitSlop={hitSlop} accessibilityLabel="Close">
screens/PaywallScreen.js:248:            hitSlop={hitSlop}
screens/PaywallScreen.js:257:            hitSlop={hitSlop}
screens/PaywallScreen.js:266:            hitSlop={hitSlop}
screens/WorkoutHistoryScreen.js:454:            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/WorkoutHistoryScreen.js:475:          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/WorkoutHistoryScreen.js:487:          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/WorkoutHistoryScreen.js:571:          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/WeeklyCheckInScreen.js:1179:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
screens/WeeklyCheckInScreen.js:1209:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
screens/WeeklyCheckInScreen.js:1237:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
screens/WeeklyCheckInScreen.js:1268:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
screens/WeeklyCheckInScreen.js:1306:          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
screens/WeeklyCheckInScreen.js:1597:    flex: 1, minHeight: 48,
screens/CascadeGateScreen.js:29:import { colors, spacing, fontSize, fontWeight, radius, hitSlop, type } from '../styles/theme';
screens/CascadeGateScreen.js:225:        <TouchableOpacity onPress={dismiss} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Close">
screens/WorkoutSummaryScreen.js:723:                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/WorkoutSummaryScreen.js:938:                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
screens/WorkoutSummaryScreen.js:1019:                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/FreeStarterScreen.js:136:          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/CoachOutputScreen.js:364:          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
screens/CoachOutputScreen.js:549:              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
screens/CoachOutputScreen.js:1418:        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }} style={{ paddingHorizontal: spacing.md }} accessibilityRole="button" accessibilityLabel="Back">
screens/CoachOutputScreen.js:1887:    minHeight: 44, // U-B-1 §5: WCAG/iOS touch target
screens/CoachOutputScreen.js:2117:    minHeight: 44, // U-B-1 §5: WCAG/iOS touch target
screens/CoachOutputScreen.js:2191:  link44: { minHeight: 44, justifyContent: 'center' },
screens/CoachOutputScreen.js:2192:  heldLearnMore: { marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' },
screens/CoachOutputScreen.js:2440:    minHeight: 44, // U-B-1 §5
screens/BlockReflectionScreen.js:101:            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/FoodSearchScreen.js:578:          hitSlop={12}
screens/FoodSearchScreen.js:588:            hitSlop={12}
screens/FoodSearchScreen.js:596:            hitSlop={12}
screens/FoodSearchScreen.js:694:              <TouchableOpacity onPress={() => setShowPlate(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/FoodSearchScreen.js:705:                  <TouchableOpacity onPress={() => removeFromPlate(it.key)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${it.food.name}`}>
screens/FoodSearchScreen.js:802:    minHeight: 48,
screens/RecipeBuilderScreen.js:173:        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/RecipeBuilderScreen.js:177:        <TouchableOpacity onPress={onSave} disabled={!canSave} hitSlop={12} accessibilityRole="button" accessibilityState={{ disabled: !canSave }} accessibilityLabel="Save recipe">
screens/RecipeBuilderScreen.js:238:            <TouchableOpacity onPress={onPickIngredient} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add ingredient">
screens/RecipeBuilderScreen.js:264:              <TouchableOpacity onPress={() => onRemove(i)} hitSlop={8} style={{ marginLeft: spacing.sm }} accessibilityRole="button" accessibilityLabel={`Remove ${ing.food?.name ?? ing.food_ref}`}>
screens/FoodInsightsScreen.js:129:        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/FoodInsightsScreen.js:283:    minHeight: 48,
screens/CardioHistoryScreen.js:71:        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
screens/CardioHistoryScreen.js:101:              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.activityName} session`}>
screens/ShareCardScreen.js:1566:    paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, minWidth: 44, alignItems: 'center',
screens/WelcomeScreen.js:175:            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
screens/ProOnboardingScreen.js:790:              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/ExerciseDetailScreen.js:450:              <TouchableOpacity onPress={openGoalSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Edit target">
screens/MyRecipesScreen.js:128:          hitSlop={12}
screens/MyRecipesScreen.js:147:          <TouchableOpacity onPress={onCreate} hitSlop={12} accessibilityRole="button" accessibilityLabel="New recipe">
screens/ScanBarcodeScreen.js:152:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/ScanBarcodeScreen.js:182:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/ScanBarcodeScreen.js:201:        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
screens/ScanBarcodeScreen.js:207:          hitSlop={12}
screens/HomeScreen.js:989:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:997:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:1030:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:1059:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:1090:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:1107:                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:1116:              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
screens/HomeScreen.js:1233:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:1485:                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/HomeScreen.js:1561:              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
screens/HomeScreen.js:1877:        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/YearOfLiftsScreen.js:493:            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/YearOfLiftsScreen.js:503:          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/LoginScreen.js:294:                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/LoginScreen.js:407:    minHeight: 44,
screens/ManualBuilderScreen.js:671:    minWidth: 44,
screens/AnalyticsScreen.js:189:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/AnalyticsScreen.js:234:              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/AnalyticsScreen.js:325:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/AnalyticsScreen.js:415:        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
screens/ProUpgradeScreen.js:303:                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ProUpgradeScreen.js:327:            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ProUpgradeScreen.js:360:            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ProUpgradeScreen.js:500:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/DiaryScreen.js:514:              <TouchableOpacity onPress={gotoToday} hitSlop={12} style={styles.todayPill} accessibilityRole="button" accessibilityLabel="Jump to today">
screens/DiaryScreen.js:520:            <TouchableOpacity onPress={gotoYesterday} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous day">
screens/DiaryScreen.js:524:            <TouchableOpacity onPress={gotoTomorrow} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next day">
screens/DiaryScreen.js:531:              hitSlop={12}
screens/DiaryScreen.js:563:              <TouchableOpacity onPress={onDismissOffCard} hitSlop={8} accessibilityRole="button" accessibilityLabel="Not now">
screens/DiaryScreen.js:568:                hitSlop={8}
screens/DiaryScreen.js:661:          <TouchableOpacity onPress={exitSelection} hitSlop={10} style={styles.selCancel} accessibilityRole="button" accessibilityLabel="Cancel selection">
screens/DiaryScreen.js:765:          <TouchableOpacity style={styles.waterBtn} onPress={onSub} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove 250 millilitres of water">
screens/DiaryScreen.js:768:          <TouchableOpacity style={styles.waterBtn} onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add 250 millilitres of water">
screens/DiaryScreen.js:802:  selAction: { alignItems: 'center', minWidth: 48, gap: spacing.xxs },
screens/DiaryScreen.js:821:    minHeight: 48, justifyContent: 'center',
screens/DiaryScreen.js:878:    gap: spacing.xs, minHeight: 44,
screens/PlanDetailScreen.js:295:                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
screens/PlanDetailScreen.js:304:                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
screens/DebugLogScreen.js:89:          <TouchableOpacity onPress={load} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Refresh logs">
screens/DebugLogScreen.js:212:  entryLevel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', minWidth: 44 },
screens/GoalChangeSummaryScreen.js:169:        <TouchableOpacity onPress={handleDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close">
screens/LogCardioScreen.js:154:        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/LogCardioScreen.js:200:            <TouchableOpacity onPress={toggleFavourite} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: isFavourite }} accessibilityLabel={isFavourite ? 'Remove from your cardio' : 'Add to your cardio'}>
screens/PartnerScreen.js:154:            <TouchableOpacity onPress={confirmUnpair} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel invitation">
screens/PartnerScreen.js:278:    paddingVertical: spacing.md, minHeight: 48,
screens/PartnerScreen.js:286:    paddingVertical: spacing.md, minHeight: 44,
screens/PartnerScreen.js:322:    paddingVertical: spacing.sm, minHeight: 44, ...type.body,
screens/PartnerScreen.js:326:    paddingHorizontal: spacing.md, justifyContent: 'center', minHeight: 44,
screens/QuizScreen.js:137:  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' },
screens/MealPlanScreen.js:28:import { colors, fontSize, fontWeight, spacing, radius, hitSlop } from '../styles/theme';
screens/MealPlanScreen.js:76:              hitSlop={hitSlop}
screens/MealPlanScreen.js:356:                  hitSlop={hitSlop}
screens/MealPlanScreen.js:429:                          hitSlop={hitSlop}
screens/MealPlanScreen.js:447:                  hitSlop={hitSlop}
screens/MealPlanScreen.js:609:  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: spacing.sm, minHeight: 44 },
screens/MealPlanScreen.js:615:  prefsToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, minHeight: 44 },
screens/PlansScreen.js:515:                <TouchableOpacity onPress={() => handlePlanOptions(activePlan)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Plan options">
screens/PlansScreen.js:616:                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
screens/PlansScreen.js:628:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/PlansScreen.js:636:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/PlansScreen.js:655:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/PlansScreen.js:686:                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
screens/PlansScreen.js:698:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/PlansScreen.js:706:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/PlansScreen.js:744:                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
screens/ScanLabelScreen.js:190:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/ScanLabelScreen.js:217:          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
screens/ScanLabelScreen.js:241:        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
screens/ScanLabelScreen.js:247:          hitSlop={12}
screens/ScanLabelScreen.js:306:                <TouchableOpacity onPress={skipName} hitSlop={12} style={styles.skipBtn} accessibilityRole="button" accessibilityLabel="Skip name">
screens/ScanLabelScreen.js:313:                <TouchableOpacity onPress={gotoManual} hitSlop={12} style={styles.skipBtn} accessibilityRole="button" accessibilityLabel="Type it in">
screens/BuildWorkoutScreen.js:162:        <TouchableOpacity testID="volyume-btn-skip-setup" onPress={handleSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Skip setup and start an empty session">
screens/BuildWorkoutScreen.js:196:                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
screens/BuildWorkoutScreen.js:212:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/BuildWorkoutScreen.js:222:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/BuildWorkoutScreen.js:262:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/BuildWorkoutScreen.js:272:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1363:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1384:              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1445:                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1464:                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
screens/ActiveWorkoutScreen.js:1491:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1520:                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1566:                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1617:              hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
screens/ActiveWorkoutScreen.js:1653:                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
screens/ActiveWorkoutScreen.js:1683:                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
screens/ActiveWorkoutScreen.js:1721:                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
screens/ActiveWorkoutScreen.js:2389:        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cancel workout">
screens/ActiveWorkoutScreen.js:2393:        <TouchableOpacity onPress={onFinish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Finish workout">
screens/ActiveWorkoutScreen.js:2458:    alignSelf: 'flex-start', minHeight: 44,
screens/ActiveWorkoutScreen.js:2515:  extraSetBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
screens/ActiveWorkoutScreen.js:2538:  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, minHeight: 44, borderWidth: 1, borderColor: colors.border },
screens/RoutineDetailScreen.js:112:          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/RoutineDetailScreen.js:362:                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/RoutineDetailScreen.js:377:                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
screens/RoutineDetailScreen.js:393:                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
screens/RoutineDetailScreen.js:401:                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
screens/RoutineDetailScreen.js:416:                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}

### SECTION 6 — SETTINGS: FULL ENUMERATION (every SettingRow label + persisted key, exact file:line)
-- SettingRow labels (the user-facing settings) --
SettingsAboutScreen.js:17:          label="Send feedback"
SettingsAboutScreen.js:23:          label="Rate Volyume"
SettingsAboutScreen.js:53:          label="Credits"
SettingsAccountScreen.js:28:          label="Subscription"
SettingsAccountScreen.js:35:            label="Go Pro"
SettingsAccountScreen.js:43:            label="Switch to Free"
SettingsCoachingScreen.js:115:          label="Calmer experience"
SettingsCoachingScreen.js:131:              label="Daily step target"
SettingsCoachingScreen.js:163:              label="Cardio"
SettingsCoachingScreen.js:219:              label="Show the science"
SettingsCoachingScreen.js:238:            label="Cycle tracking"
SettingsDataScreen.js:171:          label="Import from another app"
SettingsDataScreen.js:177:          label="Back up everything (JSON)"
SettingsDataScreen.js:182:          label="Restore from backup"
SettingsDataScreen.js:187:          label="Restore a snapshot"
SettingsDataScreen.js:193:          label="Export workout log (CSV)"
SettingsDataScreen.js:198:          label="Clear workout history"
SettingsDisplayScreen.js:101:          label="Larger text"
SettingsDisplayScreen.js:121:          label="Higher contrast"
SettingsDisplayScreen.js:138:          label="Colour-blind safe palette"
SettingsDisplayScreen.js:155:          label="Reduce motion"
SettingsHealthScreen.js:178:          label="Read morning weight"
SettingsHealthScreen.js:197:          label="Read daily steps"
SettingsHealthScreen.js:216:          label="Write workouts"
SettingsHealthScreen.js:245:            label="Open Health settings"
SettingsNotificationsScreen.js:16:          label="Training reminders"
SettingsNotificationsScreen.js:23:            label="Coaching reminders"
SettingsPrivacyScreen.js:45:          label="Health-data consent"
SettingsPrivacyScreen.js:57:          label="Share scanned labels with Open Food Facts"
SettingsPrivacyScreen.js:71:          label="Share usage data"
SettingsPrivacyScreen.js:85:          label="Privacy Policy"
SettingsScreen.js:19:          label="Account"
SettingsScreen.js:25:          label="Profile"
SettingsScreen.js:31:          label="Coaching"
SettingsScreen.js:37:          label="Notifications"
SettingsScreen.js:43:          label="Display and accessibility"
SettingsScreen.js:57:          label="Your data"
SettingsScreen.js:63:          label="Privacy and legal"
SettingsScreen.js:69:          label="Help and about"
-- persisted writes (saveLocalProfile keys / AsyncStorage setItem) --
SettingsCoachingScreen.js:45:      await saveLocalProfile(user.id, { ...(userProfile || {}), coachTone: next });
SettingsCoachingScreen.js:53:      await saveLocalProfile(user.id, { ...(userProfile || {}), showScience: value });
SettingsCoachingScreen.js:74:      await saveLocalProfile(user.id, { ...(userProfile || {}), stepsEnabled: value });
SettingsCoachingScreen.js:98:      await saveLocalProfile(user.id, { ...(userProfile || {}), stepsTarget: next });
SettingsCoachingScreen.js:173:                    if (user?.id) await saveLocalProfile(user.id, { ...(userProfile || {}), cardioEnabled: next });
SettingsDisplayScreen.js:84:                  await setAccessibilityPref('theme', opt.value);
SettingsDisplayScreen.js:111:                await setAccessibilityPref('largerText', v);
SettingsDisplayScreen.js:128:                await setAccessibilityPref('higherContrast', v);
SettingsDisplayScreen.js:145:                await setAccessibilityPref('colorBlindSafe', v);
SettingsDisplayScreen.js:161:              onValueChange={v => setAccessibilityPref('reduceMotion', v)}
SettingsPrivacyScreen.js:18:  const { healthConsent, privacy, setAnalyticsOptOut } = useAppStore(
SettingsPrivacyScreen.js:22:      setAnalyticsOptOut: s.setAnalyticsOptOut,
SettingsPrivacyScreen.js:77:              onValueChange={v => setAnalyticsOptOut(!v)}
SettingsProfileScreen.js:17:  const { user, userProfile, saveLocalProfile, setDietPreference } = useAppStore(
SettingsProfileScreen.js:22:      setDietPreference: s.setDietPreference,
SettingsProfileScreen.js:46:                await saveLocalProfile(user.id, { ...(userProfile || {}), firstName: name || undefined });
SettingsProfileScreen.js:73:                  onPress={() => { setDiet(opt.value); setDietPreference(opt.value); }}
NotificationSettingsScreen.js:59:  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
NotificationSettingsScreen.js:372:      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ ...existing, ...nextPrefs }));
NotificationSettingsScreen.js:397:      await AsyncStorage.setItem(REMINDER_PREF_KEY, value ? 'true' : 'false');
NotificationSettingsScreen.js:420:            await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify({ hour: h, minute: m }));

### SECTION 7 — ROUTES: MECHANICAL EXTRACTION (grep-sourced, authoritative over the hand-typed list above)
225:      <Stack.Screen name="Diary"
293:      <Stack.Screen name="Home"
294:      <Stack.Screen name="BuildWorkout"
295:      <Stack.Screen name="ActiveWorkout"
296:      <Stack.Screen name="WorkoutSummary"
297:      <Stack.Screen name="WorkoutHistory"
298:      <Stack.Screen name="VolumeHeatmap"
299:      <Stack.Screen name="ShareCard"
300:      <Stack.Screen name="CoachReview"
303:      <Stack.Screen name="LogCardio"
304:      <Stack.Screen name="ProUpgrade"
306:      <Stack.Screen name="FreeStarter"
319:      <Stack.Screen name="Plans"
320:      <Stack.Screen name="PlanUpdate"
321:      <Stack.Screen name="PlanDetail"
322:      <Stack.Screen name="RoutineDetail"
323:      <Stack.Screen name="ExerciseDetail"
324:      <Stack.Screen name="ManualBuilder"
325:      <Stack.Screen name="PlanLibrary"
326:      <Stack.Screen name="MesocycleBuilder"
327:      <Stack.Screen name="ProUpgrade"
329:      <Stack.Screen name="FreeStarter"
342:      <Stack.Screen name="Analytics"
343:      <Stack.Screen name="WorkoutHistory"
344:      <Stack.Screen name="WorkoutSummary"
345:      <Stack.Screen name="VolumeHeatmap"
346:      <Stack.Screen name="CoachReview"
347:      <Stack.Screen name="BodyMetrics"
348:      <Stack.Screen name="LiftProgress"
349:      <Stack.Screen name="Consistency"
350:      <Stack.Screen name="Partner"
351:      <Stack.Screen name="ExerciseDetail"
352:      <Stack.Screen name="YearOfLifts"
353:      <Stack.Screen name="RecapStory"
354:      <Stack.Screen name="ShareCard"
357:      <Stack.Screen name="LogCardio"
358:      <Stack.Screen name="CardioHistory"
359:      <Stack.Screen name="ProUpgrade"
372:      <Stack.Screen name="You"
373:      <Stack.Screen name="Settings"
374:      <Stack.Screen name="SettingsAccount"
375:      <Stack.Screen name="SettingsProfile"
376:      <Stack.Screen name="SettingsCoaching"
377:      <Stack.Screen name="SettingsNotifications"
378:      <Stack.Screen name="SettingsDisplay"
379:      <Stack.Screen name="SettingsHealth"
380:      <Stack.Screen name="SettingsData"
381:      <Stack.Screen name="Snapshots"
382:      <Stack.Screen name="SettingsPrivacy"
383:      <Stack.Screen name="SettingsAbout"
384:      <Stack.Screen name="NutritionTargets"
385:      <Stack.Screen name="NutritionEducation"
386:      <Stack.Screen name="BodyMetrics"
387:      <Stack.Screen name="WeeklyCheckIn"
388:      <Stack.Screen name="CoachOutput"
389:      <Stack.Screen name="Methodology"
390:      <Stack.Screen name="ShareCard"
391:      <Stack.Screen name="CoachHeldHistory"
392:      <Stack.Screen name="BlockReflection"
393:      <Stack.Screen name="ProGoalSetup"
394:      <Stack.Screen name="GoalChangeSummary"
395:      <Stack.Screen name="GoalLockConsent"
396:      <Stack.Screen name="NotificationSettings"
397:      <Stack.Screen name="Import"
398:      <Stack.Screen name="CoachingReminders"
399:      <Stack.Screen name="WellbeingCheck"
400:      <Stack.Screen name="PrivacyPolicy"
401:      <Stack.Screen name="DebugLog"
402:      <Stack.Screen name="SubscriptionPolicy"
403:      <Stack.Screen name="Subscription"
404:      <Stack.Screen name="CascadeGate"
405:      <Stack.Screen name="Paywall"
406:      <Stack.Screen name="Credits"
407:      <Stack.Screen name="ProUpgrade"
445:      <Tab.Screen name="HomeTab"
446:      <Tab.Screen name="PlansTab"
447:      <Tab.Screen name="DiaryTab"
448:      <Tab.Screen name="ProgressTab"
449:      <Tab.Screen name="ProfileTab"
457:      <Stack.Screen name="Welcome"
460:      <Stack.Screen name="QuizTraining"
461:      <Stack.Screen name="PlanPreview"
462:      <Stack.Screen name="Login"
470:      <Stack.Screen name="FirstRunBranch"
475:      <Stack.Screen name="FreeStarter"
476:      <Stack.Screen name="PlanLibrary"
477:      <Stack.Screen name="PlanDetail"
478:      <Stack.Screen name="ActiveWorkout"
490:      <Stack.Screen name="Article9Consent"
494:      <Stack.Screen name="PrivacyPolicy"
502:      <Stack.Screen name="ProOnboarding"
503:      <Stack.Screen name="PlanLibrary"
504:      <Stack.Screen name="PlanDetail"
505:      <Stack.Screen name="ActiveWorkout"
506:      <Stack.Screen name="ProSetupComplete"
509:      <Stack.Screen name="NutritionEducation"
513:      <Stack.Screen name="GoalLockConsent"
