# Volyume — Complete App Map

> Regenerated from source against `main` on 2026-06-26 (app version 1.2.0,
> iOS build 7, Android versionCode 14). Supersedes the 2026-05-18 map, which
> described a 4-tab, ~26-screen, local-user, pre-food app that no longer
> exists. This map is generated from `src/navigation/RootNavigator.js`,
> `src/screens/`, `src/lib/`, `src/store/`, and `supabase/`.

The app is **5 bottom tabs, 77 screens**, real-Supabase-account-only (no
anonymous/local-user mode), with the full food, cardio, coaching, and
billing domains live. The Diary (food) tab and most coaching/nutrition
surfaces are **Pro-gated** via `withProGuard`.

---

## Navigation Tree

Single navigator file: `src/navigation/RootNavigator.js`. Root gating
(`renderNavigator`):

```
App.js (ErrorBoundary, Sentry)
└── RootNavigator (Stack + BottomTab)
    ├── SplashScreen              while auth/consent in flight
    ├── !user                     → WelcomeStack       (real account required)
    ├── signed-in, no health consent → Article9ConsentStack
    ├── !firstRunComplete & Pro   → ProOnboardingStack
    ├── !firstRunComplete & free  → FirstRunStack
    └── onboarded                 → MainTabs

WelcomeStack         Welcome · QuizTraining(Quiz) · PlanPreview · Login
FirstRunStack        FirstRunBranch(FirstRun) · FreeStarter · PlanLibrary · PlanDetail · ActiveWorkout
Article9ConsentStack Article9Consent · PrivacyPolicy
ProOnboardingStack   ProOnboarding · PlanLibrary · PlanDetail · ActiveWorkout · ProSetupComplete · NutritionEducation · GoalLockConsent

MainTabs (5 tabs)
├── HomeTab   "Train"    → HomeStack
│   Home · BuildWorkout · ActiveWorkout · WorkoutSummary · WorkoutHistory
│   VolumeHeatmap · ShareCard · CoachReview · LogCardio[Pro,modal] · ProUpgrade[modal] · FreeStarter
│
├── PlansTab  "Plans"    → PlansStack
│   Plans · PlanUpdate[Pro] · PlanDetail · RoutineDetail · ExerciseDetail
│   ManualBuilder · PlanLibrary · MesocycleBuilder · ProUpgrade[modal] · FreeStarter
│
├── DiaryTab  "Diary"    → DiaryStack            ← ENTIRE STACK Pro-gated
│   Diary · MealPlan · FoodSearch[modal] · AddCustomFood[modal] · ScanBarcode[modal]
│   ScanLabel[modal] · LogCardio[modal] · CardioHistory · FoodInsights
│   MyRecipes[modal] · MyMeals[modal] · RecipeBuilder[modal]
│
├── ProgressTab "Progress" → ProgressStack
│   Analytics · WorkoutHistory · WorkoutSummary · VolumeHeatmap · CoachReview
│   BodyMetrics[Pro] · LiftProgress · Consistency · Partner · ExerciseDetail
│   YearOfLifts · RecapStory(=YearOfLifts) · ShareCard · LogCardio[Pro,modal] · CardioHistory[Pro] · ProUpgrade[modal]
│
└── ProfileTab "You"     → ProfileStack
    You · Settings · SettingsAccount · SettingsProfile · SettingsCoaching
    SettingsNotifications · SettingsDisplay · SettingsHealth · SettingsData
    Snapshots · SettingsPrivacy · SettingsAbout · NutritionTargets[Pro] · NutritionEducation
    BodyMetrics[Pro] · WeeklyCheckIn[Pro] · CoachOutput[Pro] · Methodology · ShareCard
    CoachHeldHistory · BlockReflection · ProGoalSetup[Pro] · GoalChangeSummary · GoalLockConsent
    NotificationSettings · Import · CoachingReminders[Pro] · WellbeingCheck · PrivacyPolicy
    DebugLog · SubscriptionPolicy · Subscription · CascadeGate[modal] · Paywall[modal] · Credits · ProUpgrade[modal]
```

**Pro-guarded routes** (`withProGuard`, declared in `RootNavigator.js`):
WeeklyCheckIn, NutritionTargets, BodyMetrics, CoachOutput, ProGoalSetup,
PlanUpdate, CoachingReminders, the Diary tab root, LogCardio, CardioHistory,
MealPlan, FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, FoodInsights,
MyRecipes, MyMeals, RecipeBuilder. Food sub-screens are gated individually
**and** via the Diary tab root (defence-in-depth).

**No anonymous mode.** `RootNavigator.js` explicitly forbids LOCAL_USER
restore (per `IDENTITY_AND_OWNERSHIP_LOCKED.md`); a real Supabase account is
required. Splash minimum is `SPLASH_MIN_MS = 1600` (1.6s).

---

## Screen Inventory (77 screens)

### Auth / Onboarding (12)
| Screen | Purpose |
|---|---|
| `WelcomeScreen` | Tier-selection landing for unauthenticated users |
| `LoginScreen` | Email/password + Apple/Google OAuth sign-in |
| `QuizScreen` | Pre-account training quiz (COMP-030, Variant B) |
| `PlanPreviewScreen` | Pre-account "built for me" plan preview (COMP-030) |
| `FirstRunScreen` | Free-tier first run (name + units → FreeStarter) |
| `FreeStarterScreen` | Free guided 3-question on-ramp; installs a beginner library plan |
| `ProOnboardingScreen` | Pro guided setup wizard (profile → training → recovery → plan + nutrition) |
| `ProSetupCompleteScreen` | Pro onboarding hand-off / plan rationale |
| `ProGoalSetupScreen` | Re-run of Pro goal/training setup |
| `Article9ConsentScreen` | GDPR Article 9 health-data consent gate |
| `GoalLockConsentScreen` | Consent gate for competition-tier goals |
| `GoalChangeSummaryScreen` | Summary shown when a physique goal changes |

### Training / Workout (12)
| Screen | Purpose |
|---|---|
| `HomeScreen` | Train-tab dashboard (next session, streak, last session) |
| `BuildWorkoutScreen` | Pre-session exercise picker |
| `ActiveWorkoutScreen` | Live set-by-set logger (core experience; Live Activity / widget sync) |
| `WorkoutSummaryScreen` | Post-session review + feedback ratings |
| `WorkoutHistoryScreen` | Calendar + session list |
| `PlansScreen` | My Plans dashboard |
| `PlanDetailScreen` | Plan view/rationale, set active, start |
| `PlanLibraryScreen` | Curated library plans by division/collection |
| `PlanUpdateScreen` | Re-run plan generation with dry-run diff/preview [Pro] |
| `RoutineDetailScreen` | Edit a single workout day (muscle-coverage chips) |
| `ManualBuilderScreen` | Full manual plan builder |
| `MesocycleBuilderScreen` | Named training blocks |
| `ExerciseDetailScreen` | Per-exercise history graph + substitutes + form tips |

### Nutrition / Food (12) — all Pro
| Screen | Purpose |
|---|---|
| `DiaryScreen` | Food diary entry point; calorie-banking surface |
| `FoodSearchScreen` | Food picker / waterfall lookup |
| `AddCustomFoodScreen` | Manual custom-food entry |
| `ScanBarcodeScreen` | Live camera barcode scan (vision-camera) |
| `ScanLabelScreen` | Two-step front-of-pack + nutrition-panel OCR capture |
| `MealPlanScreen` | Generated meal plan + shopping list |
| `MyMealsScreen` | Saved meal templates |
| `MyRecipesScreen` | User recipes list |
| `RecipeBuilderScreen` | Create/edit a recipe |
| `FoodInsightsScreen` | Food adherence over a 7/14/30/90-day window; protein-consistency headline |
| `NutritionTargetsScreen` | Macro calculator (BMR/TDEE/protein approaches) |
| `NutritionEducationScreen` | Beginner calories/macros explainer |

### Cardio (2) — Pro
| Screen | Purpose |
|---|---|
| `LogCardioScreen` | User-led cardio logging |
| `CardioHistoryScreen` | Cardio log + done-vs-planned weekly trend |

### Progress / Analytics (8)
| Screen | Purpose |
|---|---|
| `AnalyticsScreen` | Progress-tab hub |
| `VolumeHeatmapScreen` | Per-muscle MEV/MAV/MRV heatmap |
| `LiftProgressScreen` | Strength standing + per-lift est-1RM trajectory (replaced PRWall) |
| `ConsistencyScreen` | Training block / recovery / load / 12-week calendar |
| `BodyMetricsScreen` | Bodyweight + measurements; recomp-reframe card [Pro] |
| `YearOfLiftsScreen` | Swipeable "Year of Lifts" recap (also routed as RecapStory) |
| `PartnerScreen` | Training-partner home (NEW-002) |
| `ShareCardScreen` | Skia-rendered workout / PR / milestone / Great-Week share card |

### Coaching (8) — mostly Pro
| Screen | Purpose |
|---|---|
| `WeeklyCheckInScreen` | Weekly check-in (weight + recovery) [Pro] |
| `CoachOutputScreen` | Precision Coaching weekly output card [Pro] |
| `CoachReviewScreen` | Weekly review (progressive-overload wins) |
| `CoachHeldHistoryScreen` | History of held coaching adjustments |
| `CoachingRemindersScreen` | Pro coaching reminder settings [Pro] |
| `BlockReflectionScreen` | End-of-block reflection |
| `MethodologyScreen` | "How Precision Coaching works" (COMP-006, static) |
| `WellbeingCheckScreen` | Wellbeing check-in |

### Settings (12)
`SettingsScreen` (landing) · `SettingsAccountScreen` · `SettingsProfileScreen`
· `SettingsCoachingScreen` · `SettingsNotificationsScreen` ·
`SettingsDisplayScreen` (free appearance, COMP-029) · `SettingsHealthScreen`
(Apple Health / Health Connect scopes) · `SettingsDataScreen` ·
`SettingsPrivacyScreen` · `SettingsAboutScreen` · `NotificationSettingsScreen`
(morning weight / check-in reminders) · `SnapshotsScreen` (restore DB
snapshots, COMP-009).

### Subscription / Billing (5)
`SubscriptionScreen` (tier + cascade stage + locked price + manage) ·
`SubscriptionPolicyScreen` · `CascadeGateScreen` (day-21 trial-cascade
decision modal) · `PaywallScreen` (differential paywall, Move #4) ·
`ProUpgradeScreen` (generic upgrade-to-Pro modal).

### Profile / misc (6)
`YouScreen` (You-tab root) · `ImportScreen` (CSV import from Hevy/Strong) ·
`CreditsScreen` (food-data licence attribution: OFF / CoFID) ·
`PrivacyPolicyScreen` · `DebugLogScreen` (on-device error buffer, 200 events).

> Screens removed since the May map (do not reference): `CoachBuilderScreen`,
> `OnboardingScreen`, `PRWallScreen` (→ `LiftProgressScreen`),
> `ExerciseLibraryScreen` (only `ExerciseDetailScreen` survives),
> `AthleteHubScreen` (→ `YouScreen`), `PeakWeekScreen` (peak-week engine
> removed; `migrate_049` dropped `peak_week_plans`).

---

## Library Modules (`src/lib/`)

The lib layer has grown well beyond the original hypertrophy helpers. Key
groupings (representative, not exhaustive):

- **Training / hypertrophy:** `algorithms.js` (weekly volume, PR detection,
  1RM, volume status, auto-reg, deload), `swapEngine.js`, `setTypeEngine.js`,
  `mesocycle.js`, `phaseEngine.js`, `planEngine.js` / `planAutoGen.js`
  (deterministic plan generation; `generatePlanDryRun` for plan diff/preview),
  `planDiff.js`.
- **Precision Coaching engine:** `src/coaching/**` — deterministic weekly loop
  (`weeklyCoach.js`, `coachingGoals.js` incl. `dayCalorieCyclingAllowed`),
  plus the **ED safety system in `src/coaching/safety/**`** (calorie floors,
  FFM floor, rapid-loss threshold, ED-pattern flags, Beat UK signposting) —
  **do not modify**.
- **Nutrition / food:** `src/lib/food/**` — meal-plan assembler/solver
  (precision macro solver, holds macros to ~1%), `calorieBank.js`,
  `groceryList.js`, `db.js` (food DB, OpenFoodFacts / USDA / CoFID waterfall),
  sanity checks, telemetry.
- **Cardio:** `src/lib/cardio/cardioEngine.js` (`summariseCardioByWeek`,
  compliance) + passive Health import.
- **Progress / recap:** `recompReframe.js`, recap-card builders
  (`YearOfLiftsScreen`/`ShareCardScreen`).
- **Data / sync:** `database.js` (encrypted SQLite), `dbCrypto.js`,
  `supabase.js`, and the `src/lib/sync/**` registry-driven sync layer.
- **Payments:** `src/lib/payments/**` (`playBilling.js`, `cascade.js`,
  `catalogue.js`).
- **Platform:** `health.js` / `activitySteps.js` (Apple Health / Health
  Connect), notifications, error logging (PII-scrubbed), seeds
  (`seedExercises.js`, `seedRoutines.js`).

---

## State (`src/store/useAppStore.js`)

Zustand store. Auth is **real-account only** — there is no `initLocalUser`
offline UUID path any more. The store still holds active-workout state, rest
timer, PR celebration, units/bar weight, tier/entitlement, and various
preferences (incl. the local calorie-bank profile field). Components read
from the local SQLite database and the store, never from Supabase directly.

---

## Local Database (`volyume.db`)

- **Engine:** `expo-sqlite` (SQLCipher-encrypted at rest; 256-bit per-device
  key in `expo-secure-store`), WAL mode, single file.
- **Schema version:** `PRAGMA user_version` against an ordered
  `SCHEMA_MIGRATIONS` array — currently **v23**.
- **~47 local tables**, grouped: training (`exercises`, `workouts`,
  `workout_sets`, `routines`, `routine_exercises`, `programmes`, notes),
  periodisation/coaching (`mesocycles`, `planned_muscle_volume`,
  `adaptation_events`, `coach_outputs`, `user_body_profile`), body/check-in
  (`body_metric_log`, `morning_weights`, `weekly_checkins`), nutrition/food
  (`nutrition_targets`, `foods`, `custom_foods`, `food_entries`,
  `daily_intake_rollups`, `saved_meals`, `recipes`, `recipe_ingredients`,
  `meal_plans`, favourites/frequents/recents, `daily_water`), activity
  (`daily_steps`, `cardio_log` incl. `ext_id`), partners (`partnerships`,
  `partner_week_signals`, `partner_cheers`), and safety/tier/telemetry/sync
  plumbing (`ed_pattern_flags`, `tier_history`, `engine_telemetry`,
  `pending_sync_ops`, `sync_meta`).

---

## Supabase (sync target — EU Dublin)

- **~88 migrations** in `supabase/` (`migrate_001`…`migrate_088`, with a few
  gaps and one `085` number collision). Baselines: `schema.sql`,
  `setup_complete.sql` (canonical fresh-deploy).
- **Auto-deploy:** `.github/workflows/deploy-migrations.yml` applies
  `migrate_*.sql` on push to `main` (tracked in `claude_schema_migrations`).
  A small HELD list (049, 059) and explicitly founder-pending migrations are
  excluded from auto-apply.
- **Outstanding manual founder migrations:**
  `migrate_087_cardio_log_ext_id.sql` (apply via Dashboard, never from app).
- **Sync layer (`src/lib/sync/`):** registry-driven, two-track (migrated
  per-table handlers + legacy bulk), incremental pull via per-(user,table)
  watermarks, conflict strategies (last-write-wins / server-wins / per-column
  merge for profiles), soft-delete propagation, sign-out wipe guard.

---

## Build

- **Expo managed** (never eject); native modules via Expo config plugins only.
- **Version:** 1.2.0 · iOS build 7 · Android versionCode 14 · ids `app.volyume`.
- **Android build:** `.github/workflows/build-android.yml` (free GitHub
  runner → APK sideload + AAB for Play). Triggers on push to `main` /
  `claude/**` (docs paths ignored).
- **iOS build:** `.github/workflows/build-ios.yml` — **manual only**
  (`workflow_dispatch`; each EAS iOS build costs credits), builds via EAS
  cloud → TestFlight.
- **CI:** `main-ci.yml` (jest + eslint + Expo Doctor).

See `INFRASTRUCTURE.md` for full runtime/config detail, `ARCHITECTURE.md` for
the deep technical map, and `VOLYUME_DEEPMAP.md` for the feature inventory.
