# Deep Feature Audit — Master Inventory

**Document:** deep-audit-01-master-inventory.md
**Date:** 2026-06-04
**Status:** AWAITING SCOPE CONFIRMATION
**Source:** derived from `src/navigation/RootNavigator.js` (authoritative
route/tab/gating registry) + full enumeration of `src/screens`,
`src/components`, `src/lib`, `src/hooks`, `src/store`, `src/styles`.

This is the agreed scope. Nothing is missed; nothing is added without reason.
Per the 2026-06-04 directive, prior audits do not exempt any item — every
item below gets a fresh clean-sheet audit. Each item is numbered; audits
proceed in the order given in §6.

Legend: 🔒 = Pro-gated via `withProGuard` · ⤴ = shared across multiple stacks.

---

## A. SCREENS (60 screen files + inline Splash)

### A1. Auth, onboarding, consent gates
1. **WelcomeScreen** — tier selection (Free/Pro). Entry of `WelcomeStack`.
2. **LoginScreen** — email/password + OAuth sign-in/up. `WelcomeStack`.
3. **SplashScreen** — brand splash (inline in `RootNavigator.js`, animated wordmark + tagline "Less thinking. More lifting.").
4. **FirstRunScreen** — Free quick setup. Entry of `FirstRunStack` ("FirstRunBranch").
5. **ProOnboardingScreen** — Pro guided 5-step wizard. Entry of `ProOnboardingStack`.
6. **ProSetupCompleteScreen** — Pro onboarding reveal/hand-off.
7. **Article9ConsentScreen** — health-data consent gate (`Article9ConsentStack`).
8. **GoalLockConsentScreen** ⤴ — competition-goal lock consent (onboarding + Profile).

### A2. Train tab (HomeTab → HomeStack)
9. **HomeScreen** — Train landing (continue/next session, cardio card, steps).
10. **BuildWorkoutScreen** — pre-session build/preview.
11. **ActiveWorkoutScreen** ⤴ — live workout logging (also in onboarding stacks).
12. **WorkoutSummaryScreen** ⤴ — post-session summary (also Progress).
13. **WorkoutHistoryScreen** ⤴ — session list (also Progress).
14. **VolumeHeatmapScreen** ⤴ — per-muscle volume heatmap (also Progress).
15. **CoachReviewScreen** ⤴ — weekly review (also Progress).

### A3. Plans tab (PlansTab → PlansStack)
16. **PlansScreen** — Plans landing (active plan, library entry).
17. **PlanDetailScreen** ⤴ — plan overview (also onboarding stacks).
18. **RoutineDetailScreen** — edit a routine/day.
19. **ExerciseDetailScreen** ⤴ — per-exercise detail/history (also Progress).
20. **ManualBuilderScreen** — manual workout builder.
21. **PlanLibraryScreen** ⤴ — seeded plan library (also onboarding stacks).
22. **MesocycleBuilderScreen** — training-block builder.

### A4. Diary tab (DiaryTab → DiaryStack)
23. **DiaryScreen** — food diary landing (calorie ring, meals, water, cardio line).
24. **FoodSearchScreen** — food search + plate multi-add (modal).
25. **AddCustomFoodScreen** — create a custom food (modal).
26. **ScanBarcodeScreen** — barcode scan (modal).
27. **ScanLabelScreen** — nutrition-label OCR scan (modal).
28. **LogCardioScreen** 🔒 — log a cardio session (modal).
29. **CardioHistoryScreen** — cardio sessions by day.
30. **FoodInsightsScreen** — food/nutrition insights.
31. **MyRecipesScreen** — recipe list (modal).
32. **MyMealsScreen** — saved-meals list (modal).
33. **RecipeBuilderScreen** — build/edit a recipe (modal).

### A5. Progress tab (ProgressTab → ProgressStack)
34. **AnalyticsScreen** — Progress landing (multi-card analytics dashboard).
35. **LiftProgressScreen** — per-lift estimated-1RM progress.
36. **ConsistencyScreen** — training frequency/consistency.
37. **BodyMetricsScreen** 🔒 ⤴ — body measurements/weight (also Profile).
38. **YearOfLiftsScreen** — year-in-review.

### A6. You tab (ProfileTab → ProfileStack)
39. **YouScreen** — profile landing.
40. **SettingsScreen** — settings hub.
41. **NutritionTargetsScreen** 🔒 — calorie/macro targets calculator.
42. **NutritionEducationScreen** ⤴ — nutrition primer (also onboarding).
43. **WeeklyCheckInScreen** 🔒 — weekly check-in form.
44. **CoachOutputScreen** 🔒 — "Precision Coaching" weekly output.
45. **CoachHeldHistoryScreen** — coaching history (held decisions).
46. **BlockReflectionScreen** — end-of-block reflection.
47. **ProGoalSetupScreen** 🔒 — coached goal/plan setup.
48. **GoalChangeSummaryScreen** — goal-change summary.
49. **CoachingRemindersScreen** 🔒 — coaching reminder settings.
50. **WellbeingCheckScreen** — wellbeing check (ED/RED-S adjacent).
51. **NotificationSettingsScreen** — notification preferences.
52. **ImportScreen** — import training history.
53. **PrivacyPolicyScreen** — privacy policy.
54. **SubscriptionPolicyScreen** — subscription terms.
55. **SubscriptionScreen** — manage subscription.
56. **CascadeGateScreen** — trial/grace cascade gate (modal).
57. **PaywallScreen** — paywall (modal).
58. **ProUpgradeScreen** ⤴ — Pro upgrade prompt (modal; in every tab stack).
59. **CreditsScreen** — credits.
60. **DebugLogScreen** — debug/error log viewer.

> Note: `AnalyticsScreen` also nests `WorkoutHistory`, `WorkoutSummary`,
> `VolumeHeatmap`, `CoachReview`, `ExerciseDetail`, `ShareCard` (listed once
> above). **ShareCardScreen** ⤴ is reachable from Home/Progress/Profile.

## B. COMPONENTS (shared UI library)

### B1. `src/components` (47)
AnimatedEntrance, BackHeader, BlockProgressCard, BodyDiagramHeatmap,
BottomSheet, BrandMark, Button, Card, CardioCard, CardioPlanCard, Chip,
DifferentialBadge, EmptyState, EngineLog, ExerciseCard, ExercisePickerModal,
FatigueTrendCard, FeedbackSheet, GradientCard, Illustrations, InfoTooltip,
OptionCard, PRCelebration, PeekMenu, PlateCalculator, PressableCard, ProGate,
ProgressSections, ReadinessCards, RestTimer, ScreenHeader, SearchBar,
SegmentedControl, SetEntry, Skeleton, Sparkline, Stepper, StepsCard,
SvgBarSparkline, SvgLineChart, TierComparisonStrip, Toast, VolumeBars,
WhatsNewSheet.

### B2. `src/components/auth`
EmailPasswordFields, OAuthButtons.

### B3. `src/components/food`
EmptyDiary, EntryRow, FoodDetailSheet, FoodRow, HeldDecisionCard,
MacroBreakdownSheet, MacroRings, MealSection, QuickAddSheet, ServingPicker,
SourceChip.

### B4. Component states to assess per item
For each component: default, active/pressed, empty, loading (Skeleton),
error, disabled, and accessibility (touch target ≥44pt, labels, contrast,
Reduce Motion, Larger Text).

## C. FEATURES (functional capabilities)

### C1. Identity & access
F1 Sign up · F2 Sign in (email/password) · F3 Sign in (OAuth) · F4 Sign out ·
F5 Account delete · F6 Session restore / cross-device · F7 Article 9 health
consent · F8 Tier selection (Free/Pro).

### C2. Monetisation
F9 Pro upgrade · F10 Paywall · F11 Differential paywall · F12 Subscription
management · F13 Restore purchases · F14 Trial/grace cascade gate · F15 Tier
history.

### C3. Onboarding
F16 Free first-run setup · F17 Pro 5-step wizard · F18 Goal lock · F19
Onboarding plan selection/generation.

### C4. Planning
F20 Coached plan generation · F21 Auto plan generation · F22 Plan library
(seeded) · F23 Manual workout builder · F24 Mesocycle/block builder · F25
Routine editing · F26 Exercise swap engine · F27 Plan switch/activation.

### C5. Training / logging
F28 Workout logging (sets/reps/weight) · F29 Set types (warm-up, drop, super,
myo-reps, rest-pause, AMRAP) · F30 Cluster sets · F31 Unilateral logging · F32
Rest timer · F33 Plate calculator · F34 In-workout exercise add/swap/remove ·
F35 Time-crunch mode · F36 PR detection + celebration · F37 Live progression
suggestions · F38 Workout notes · F39 Workout summary · F40 Workout history ·
F41 Exercise detail/history.

### C6. Nutrition / food
F42 Food search (OFF/USDA/curated/CoFID) · F43 Barcode scan · F44 Label OCR ·
F45 Custom food · F46 Recipes · F47 Saved meals · F48 Quick add · F49 Plate
multi-add · F50 Meal slots (numbered + peri-workout) · F51 Water logging · F52
Frequents · F53 Food insights · F54 Macro rings/rollup · F55 Nutrition targets
(BMR/Katch/adaptive TDEE/macros) · F56 Nutrition education · F57 Diet
preference · F58 Food library delta sync.

### C7. Cardio & steps
F59 Cardio logging (library, MET, intensity, kcal feedback) · F60 Cardio
history · F61 Cardio plan card · F62 Cardio recovery load · F63 Step tracking
(daily_steps) · F64 Health Connect / steps import.

### C8. Body & check-in
F65 Body-weight (morning weight) logging · F66 Body metrics/measurements · F67
Weekly check-in.

### C9. Progress & analytics
F68 Per-muscle weekly volume vs MEV/MAV/MRV · F69 Volume heatmap · F70 Lift
progress (e1RM) · F71 Tonnage · F72 PR wall · F73 Strength standards · F74
Consistency/frequency · F75 Training load (ACWR) · F76 Fatigue trend · F77
Readiness · F78 Block progress · F79 Year of lifts · F80 Body-diagram heatmap.

### C10. Coaching
F81 Weekly coach (runWeeklyCoach) · F82 Precision Coaching output · F83 Coach
review · F84 Coach apply (confirm-then-apply) · F85 Held-decisions history ·
F86 "Why this" explanations · F87 Block reflection/advisor · F88 Coaching
goals · F89 Goal change · F90 Coaching reminders · F91 Wellbeing check · F92
ED/RED-S pattern detection + FFM floor.

### C11. Notifications
F93 Morning-weight reminder · F94 Weekly check-in reminder · F95 Training
reminders · F96 Push tokens (remote) · F97 Quiet hours · F98 Channels.

### C12. Sharing & misc
F99 Share cards (workout/PR/wordmark) · F100 Insights engine · F101 Travel
mode · F102 Cycle prefs.

### C13. Settings & data
F103 Units (kg-only) + body-weight units · F104 Bar weight · F105
Accessibility (Reduce Motion, Larger Text) · F106 Privacy prefs / analytics
opt-out · F107 Data backup / CSV export · F108 Import history · F109 Debug log
· F110 Rate the app · F111 Credits · F112 What's New sheet.

## D. FLOWS (end-to-end journeys)

FL1 First launch → Welcome (tier) → Login (sign up/in) → [Article 9 consent]
→ onboarding (Free FirstRun / Pro wizard) → plan select/generate → Home.
FL2 Start & log a workout → Home → BuildWorkout → ActiveWorkout → finish →
WorkoutSummary → (Share).
FL3 Log food → Diary → FoodSearch / Scan / QuickAdd / Recipe → entry → rollup.
FL4 Log cardio → Diary → LogCardio → CardioHistory.
FL5 Weekly loop → WeeklyCheckIn → CoachOutput (Precision Coaching) → apply →
(Held history).
FL6 Build/choose a plan → Plans → PlanLibrary / ManualBuilder /
MesocycleBuilder → activate.
FL7 Track progress → Progress (Analytics) → LiftProgress / VolumeHeatmap /
Consistency / BodyMetrics / YearOfLifts.
FL8 Upgrade → ProUpgrade / Paywall → purchase → CascadeGate → Pro.
FL9 Account/settings → You → Settings → (sign out / delete / subscription /
notifications / import / backup / privacy).
FL10 Body-weight log → Home (log weight) → BodyMetrics.
FL11 Goal change/lock → ProGoalSetup → GoalLockConsent → GoalChangeSummary.

## E. FACILITIES (background systems)

FAC1 Plan engine (`planEngine`, `planAutoGen`, `poolGenerator`, `swapEngine`,
`seedRoutines`). FAC2 Coach logic (`weeklyCoach`, `coachApply`, `blockAdvisor`,
`coachingGoals`, `whyThisTemplates`, `recoveryEMA`). FAC3 Training maths
(`algorithms`: 1RM, volume, progression, deload, plates; `mesocycle`,
`liftProgress`, `strengthStandards`, `clusterSet`, `unilateral`,
`restTimerMath`). FAC4 Nutrition engine (`nutritionEngine`: BMR / Katch /
adaptive TDEE / macros / FFM floor). FAC5 ED/RED-S safety (`edPatternDetector`,
`wellbeing`). FAC6 Cardio engine (`cardio/cardioActivities`, `cardioEngine`,
`cardioMath`). FAC7 Food system (`food/db`, `sources/*`, `normalisers/*`,
`curatedFoods`, `curatedMeals`, `mealSuggest`, `ocr`/`ocrParser`, `frequents`,
`searchTabs`, `sanityChecks`, `waterfall`, `writeback`, `seed`,
`libraryDelta`, `mealSlots`). FAC8 Steps/health (`activitySteps`,
`stepsSummary`, `health`). FAC9 Database + migrations (`database`). FAC10 Sync
(`sync/runner`, `registry`, `transport`, `conflict`, `watermark`, `queue`,
`signOutGuard`, `tables/*`; `syncQueue`). FAC11 Backend client (`supabase`).
FAC12 Payments (`payments/cascade`, `playBilling`, `restore`, `catalogue`;
`proGate`, `differentialPaywall`). FAC13 Notifications
(`notifications/scheduler`, `handler`, `listeners`, `channels`, `quietHours`,
`permissions`, `pushToken`, `trainingReminders`, `preferences`). FAC14
Telemetry + observability (`telemetry/transport`, `events`;
`observability/sentryScrub`; `sentry`; `errorLog`). FAC15 Insights
(`insightsEngine`, `chartGeometry`). FAC16 Prefs & utilities
(`accessibilityPrefs`, `privacyPrefs`, `cyclePrefs`, `travelMode`, `haptics`,
`units`, `dayKey`, `uuid`, `links`, `storeReview`, `dataBackup`,
`importExternal`, `exerciseMetadata`, `exerciseDisplay`, `seedExercises`,
`formTips`). FAC17 State store (`store/useAppStore`). FAC18 Design system
(`styles/theme`).

## F. AUDIT ORDER

Per the ordering rule (highest user-impact → most granular; within a group,
by frequency of encounter):

**Group 1 — Core flows**
1. FL1 Onboarding & first run (Welcome → Login → consent → setup → first plan)
2. F20/F21 Plan generation (the coached/auto engine output a new user first sees)
3. FL2 First workout (BuildWorkout → ActiveWorkout → WorkoutSummary)

**Group 2 — Primary tab landings**
4. Train (HomeScreen) · 5. Plans (PlansScreen) · 6. Diary (DiaryScreen) ·
7. Progress (AnalyticsScreen) · 8. You (YouScreen)

**Group 3 — Primary features within tabs**
9. Workout logging (ActiveWorkoutScreen depth) · 10. Food logging
(FoodSearch + Diary entry) · 11. Cardio logging · 12. Weekly check-in →
Precision Coaching · 13. Progress detail screens (Lift/Volume/Consistency/
YearOfLifts/BodyMetrics) · 14. Plan building (Manual/Mesocycle/Library/
RoutineDetail/ExerciseDetail) · 15. Nutrition targets + education.

**Group 4 — Secondary features & settings**
16. Barcode/label scan · 17. Recipes/saved meals · 18. Food insights ·
19. Body metrics/check-in extras · 20. Share cards · 21. Notifications ·
22. Settings hub + data (units, accessibility, privacy, backup, import,
debug, rate, credits) · 23. Subscription/paywall/cascade · 24. Wellbeing /
block reflection / coaching reminders / goal change.

**Group 5 — Components** (B1–B3, audited by family: buttons/cards/inputs/
chips/charts/sheets/empty+loading+error states/navigation/feedback).

**Group 6 — Background facilities** (FAC1–FAC18, audited by subsystem).

> Exact per-item granularity inside Groups 3–6 can be adjusted on your
> confirmation. Each numbered item becomes one `deep-audit-NN-<item>.md`.

---

## G. Confirmation requested

Before any item audit begins, confirm:
1. **Inventory completeness** — anything missing or mis-scoped?
2. **Ordering** — accept the Group 1→6 order above, or reprioritise?
3. **Granularity** — audit at the item level shown, or split/merge any?
4. **Per-item cadence** — one proposal at a time, await approval (default), or
   a different batching?

Nothing is audited or coded until this is confirmed.
