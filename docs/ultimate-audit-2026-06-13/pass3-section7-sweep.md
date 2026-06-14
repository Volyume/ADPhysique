# PASS-3 SECTION-7 SWEEP — every screen reconciled against the comparison matrix

Purpose: close the completeness gap the founder flagged ("it's clear things have been missed"). The comparison
matrix was built around the **15 research areas**; this sweep walks **all 77 screen files** (`src/screens/*.js`,
minus `paywallExcerpts.js` data) and asks of each: is its user-facing capability graded somewhere in the matrix?
Existence is evidenced by `RootNavigator.js` registration (read) + the screen's own header comment (read for the
flagged ones). This sweep finds **coverage gaps**, i.e. feature domains the 15-area prompt never had a bar for.

Classes: **A** = infrastructure / no competitor quality bar (legitimately out of a competitive matrix); **B-cov**
= feature graded in a matrix area; **B-DROP** = real feature domain NOT graded (finding).

## THE HEADLINE FINDING

The 15 research areas are not the same set as the app's feature domains. Several **whole Pro/Free feature
domains have no matrix area and no research bar** — the EXTERNAL-RESEARCH-PROMPT's 15 areas never included
them, so they were never gathered and never graded:

| Domain | Screens (read-confirmed) | Tier | In matrix? | Competitor bar exists? |
|---|---|---|---|---|
| **Cardio logging** | `LogCardioScreen` ("user-led cardio logging… estimate never added to food target"), `CardioHistoryScreen` | Pro | ❌ none | Yes (Strava/Apple Fitness/most trackers) → **RESEARCH NEEDED** |
| **Smart meal planning** | `MealPlanScreen` ("the generated meal plan… plates, Swap, Log this day") | Pro | ❌ none | Yes (Eat This Much, MacroFactor) → **RESEARCH NEEDED** |
| **Recipes** | `RecipeBuilderScreen` ("create or edit a recipe… per-serving macros"), `MyRecipesScreen` | Pro | ❌ none | Yes (MFP/Cronometer recipes) → **RESEARCH NEEDED** |
| **Food insights / nutrition analytics** | `FoodInsightsScreen` ("7-day adherence… kcal vs target, macro hit rate, CSV export") | Pro | ❌ none | Yes (MacroFactor analytics) → **RESEARCH NEEDED** |
| **Annual recap** | `YearOfLiftsScreen` ("Year of Lifts as a swipeable story… big hero number") | Free | ❌ none (retention) | Yes (Strava/Spotify-Wrapped pattern) → **RESEARCH NEEDED** |
| **Manual workout builder** | `BuildWorkoutScreen`, `ManualBuilderScreen`, `RoutineDetailScreen` | Free | ❌ none | Yes (Strong/Hevy routine builders) → **RESEARCH NEEDED** |

**Plus one dropped LEAD, now corrected in the matrix:** `ScanLabelScreen` (on-device two-step OCR food capture,
"the way Cronometer does it") is the FL **"AI photo logging"** bar — it was treated as competitor-only. FL row
updated to credit it (deterministic OCR, no 15–40% AI-vision error) + barcode.

## FULL SCREEN CLASSIFICATION (all 77)

**A — infrastructure / no competitive bar (legitimately out of matrix):** Article9Consent, CascadeGate, Credits,
DebugLog, GoalChangeSummary, GoalLockConsent, Import, Login, NotificationSettings, CoachingReminders, Paywall,
PrivacyPolicy, ProUpgrade, Settings, SettingsAbout, SettingsAccount, SettingsCoaching, SettingsData,
SettingsDisplay, SettingsHealth, SettingsNotifications, SettingsPrivacy, SettingsProfile, ShareCard, Snapshots,
Subscription, SubscriptionPolicy, Methodology, NutritionEducation, ProSetupComplete. (Billing/legal/auth/sync/
config/education — no competitor *quality* bar in scope; billing is locked per CLAUDE.md.)

**B-cov — graded in the matrix:**
- WS: ActiveWorkout, WorkoutSummary, WorkoutHistory · PR: Analytics, BodyMetrics, LiftProgress, VolumeHeatmap,
  Consistency · PG: PlanLibrary, PlanDetail, PlanUpdate, MesocycleBuilder, Plans · EL: ExerciseDetail · FL:
  Diary, FoodSearch, AddCustomFood, ScanBarcode, ScanLabel(now), MyMeals · NU: NutritionTargets · AC: CoachOutput,
  CoachReview, CoachHeldHistory, ProGoalSetup · CK: WeeklyCheckIn · RE: Partner · ON: Welcome, FirstRun,
  FreeStarter, Quiz, ProOnboarding, PlanPreview · NA/hub: Home, You · safety: WellbeingCheck.

**B-DROP — feature domain NOT graded (the findings above):** LogCardio, CardioHistory, MealPlan, RecipeBuilder,
MyRecipes, FoodInsights, YearOfLifts, BuildWorkout, ManualBuilder, RoutineDetail, BlockReflection.

Borderline (feature surfaces inside a covered domain, low marginal grading value): BlockReflection (per-block
review — engagement), GoalChangeSummary (coaching infra). Flagged, not separately graded.

## WHAT THIS MEANS

1. **The matrix is complete for the 15 research areas, but the app is larger than the 15 areas.** Six feature
   domains (cardio, meal-planning, recipes, food-insights, annual-recap, manual-builder) sit outside them and
   cannot be graded without a research bar that was never gathered.
2. **The root cause is upstream:** the EXTERNAL-RESEARCH-PROMPT defined 15 areas that don't map 1:1 to the app's
   feature set. Fixing this properly = add these domains to a research pass, then add matrix rows.
3. **One concrete correction already applied** (FL label-scan lead). The rest need bars before grading — listed
   under RESEARCH NEEDED below and in the matrix's research-needed section.

## RESEARCH NEEDED (added to the matrix's list)
- Cardio logging/tracking quality bar (Strava/Apple Fitness/Garmin).
- Smart meal-planning/suggestion quality bar (Eat This Much, MacroFactor meal ideas).
- Recipe builder/import quality bar (MFP/Cronometer).
- Nutrition-analytics/insights quality bar (MacroFactor).
- Annual-recap/engagement quality bar (Strava year-in-sport).
- Manual workout/routine builder quality bar (Strong/Hevy).

## COMPLETENESS STATEMENT
This sweep covers **100% of `src/screens/*.js` (77 files)**. It does NOT cover non-screen feature surfaces
(modals/components rendered inside screens, e.g. `components/food/*`, `components/PlateCalculator.js`) beyond
those already surfaced by the register reconciliation. A component-level sweep would be the next depth if the
founder wants it; at the screen level, every screen now has a class and the uncovered domains are named.
