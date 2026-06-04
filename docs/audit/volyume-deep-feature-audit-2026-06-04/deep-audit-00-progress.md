# Deep Feature Audit — Progress / Resume Marker

Single source of truth for where the audit stands. Update on each session end.

## Status as of 2026-06-04 (checkpoint)

Branch `main`, 0/0 with origin, working tree clean, repo eslint **0 problems**,
full suite green (174 suites, 2820 passing).

### Done (44 items + the lint sweep), each: audited → researched → proposed →
### approved → implemented → pushed. Doc per item in this folder.

| # | Item | Screen | Doc |
|---|------|--------|-----|
| 1 | Welcome | WelcomeScreen | deep-audit-02 |
| 2 | Login | LoginScreen | deep-audit-03 |
| 3 | Article 9 consent | Article9ConsentScreen | deep-audit-04 |
| 4 | Pro onboarding wizard | ProOnboardingScreen | deep-audit-05 |
| 5 | Pro setup complete | ProSetupCompleteScreen | deep-audit-06 |
| 6 | First-run (Free) | FirstRunScreen | deep-audit-07 |
| 7 | Train tab | HomeScreen | deep-audit-08 |
| 8 | Plans tab | PlansScreen | deep-audit-09 |
| 9 | Diary tab | DiaryScreen | deep-audit-10 |
| 10 | Progress tab | AnalyticsScreen | deep-audit-11 |
| 11 | You tab | YouScreen | deep-audit-12 |
| 12 | Splash | RootNavigator (inline) | deep-audit-13 |
| 13 | Goal lock consent | GoalLockConsentScreen | deep-audit-14 |
| 14 | Build Workout | BuildWorkoutScreen | deep-audit-15 |
| 15 | Active Workout | ActiveWorkoutScreen | deep-audit-16 |
| 16 | Workout Summary | WorkoutSummaryScreen | deep-audit-17 |
| 17 | Workout History | WorkoutHistoryScreen | deep-audit-18 |
| 18 | Volume Heatmap | VolumeHeatmapScreen | deep-audit-19 |
| 19 | Coach Review | CoachReviewScreen | deep-audit-20 |
| 20 | Plan Detail | PlanDetailScreen | deep-audit-21 |
| 21 | Routine Detail | RoutineDetailScreen | deep-audit-22 |
| 22 | Exercise Detail | ExerciseDetailScreen | deep-audit-23 |
| 23 | Manual Builder | ManualBuilderScreen | deep-audit-24 |
| 24 | Plan Library | PlanLibraryScreen | deep-audit-25 |
| 25 | Training Blocks | MesocycleBuilderScreen | deep-audit-26 |
| 26 | Food Search | FoodSearchScreen (+ FoodRow) | deep-audit-27 |
| 27 | Add Custom Food | AddCustomFoodScreen | deep-audit-28 |
| 28 | Scan Barcode | ScanBarcodeScreen | deep-audit-29 |
| 29 | Scan Label (OCR) | ScanLabelScreen | deep-audit-30 |
| 30 | Log Cardio | LogCardioScreen | deep-audit-31 |
| 31 | Cardio History | CardioHistoryScreen | deep-audit-32 |
| 32 | Food Insights | FoodInsightsScreen | deep-audit-33 |
| 33 | My Recipes | MyRecipesScreen | deep-audit-34 |
| 34 | My Meals | MyMealsScreen | deep-audit-35 |
| 35 | Recipe Builder | RecipeBuilderScreen | deep-audit-36 |
| 36 | Lift Progress | LiftProgressScreen | deep-audit-37 |
| 37 | Consistency | ConsistencyScreen (+ ProgressSections) | deep-audit-38 |
| 38 | Body Metrics | BodyMetricsScreen | deep-audit-39 |
| 39 | Year of Lifts | YearOfLiftsScreen | deep-audit-40 |
| 40 | Settings | SettingsScreen | deep-audit-41 |
| 41 | Nutrition Targets | NutritionTargetsScreen | deep-audit-42 |
| 42 | Nutrition Education | NutritionEducationScreen | deep-audit-43 |
| 43 | Weekly Check-in | WeeklyCheckInScreen | deep-audit-44 |
| 44 | Coach Output | CoachOutputScreen | deep-audit-45 |

Plus: the full lint sweep (779 → 0 warnings, 0 errors) across commits
e518807 / 16cbad7 / e345a06 / d2f797f, and the `__mocks__/expo-application.js`
test mock.

### Running logs
- `deep-audit-00-approved-proposals.md` — what was approved per item.
- `deep-audit-00-implementation-log.md` — what was implemented + verification.

## NEXT (resume here)

Inventory order, next un-audited screen: **#45 `CoachHeldHistoryScreen`**
(coaching history, held decisions), then #46 BlockReflection, #47 ProGoalSetup,
and the rest of the coach-engine surfaces. Master list:
`deep-audit-01-master-inventory.md`.

### Carry-over flag (Body Metrics, item 38)
- `BodyMetricsScreen` stores entry `loggedAt` via `new Date(metric_date)`
  (UTC-midnight; UK-safe via `localDayKey` round-trip but inconsistent with
  `parseLocalDay`), and the date is a free-text `YYYY-MM-DD` field. Consider
  `parseLocalDay` + a date picker. Founder's call.

### Out-of-band fix shipped this session (not an audit item)
- **Share-card spinner hang:** the share button spun forever when the off-screen
  WebView never posted a captured frame back (silent draw/encode failure, no
  timeout). Added a 10s failsafe + try/catch error reporting from the WebView.
  Commit `597ef9c`.

### Out-of-band fixes shipped this session (not audit items)
- **Cardio nav bug:** `LogCardio`/`CardioHistory` were registered only in the
  Diary stack, so launching from Train/Progress dumped the user on the food Diary
  on save. Registered `LogCardio` in the Home stack and both in the Progress
  stack (the `ProUpgrade` multi-stack pattern). Commit `a32e6a2`.
- **Check-in steps override:** the auto step average was read-only; now
  tap-to-override (food + cardio adherence were already overridable). Commit
  `6feeeb7`.

### Carry-over flags raised this session (Training Blocks, item 25)
- No manual block create/edit exists; blocks only start via plan activation.
  Founder call whether a "Start block" action is wanted on the screen.
- `createMesocycle` (`database.js:2890`) is dead code (no caller), vestige of the
  removed builder. Delete in a cleanup pass.
- `activatePlanWithBlock` sets block `startDate` via `toISOString().slice(0,10)`
  (UTC date) — BST-evening off-by-one risk. Fold into a TZ sweep.

### Carry-over flags raised but not actioned (for the founder)
- Article 9 (#3): Art 7(3) withdrawal wording + the server `_consent_version`
  column want legal/server sign-off.
- NotificationSettings: an orphaned debounced-save path (`scheduleApply` +
  `applyNotifications`, which schedules the morning/check-in reminders) is only
  reachable via removed handlers — retained with a documented eslint-disable, not
  deleted. Worth a proper look at that screen's save path.
- Diary (#9): per-user water target + photo/voice quick-log (roadmap).

### Cadence (locked by founder direction this session)
Per item: full read → live web research → proposal in the prescribed format →
STOP for approval → implement only on approval → verify (eslint + tests, FULL
suite for runtime-critical) → commit + push to `main`. Present, then await
approval; do not code first. Fresh audit: prior audit docs are not binding.
Propose freely (incl. copy); flag legal only where genuinely warranted.
