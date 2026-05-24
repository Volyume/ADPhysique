# Volyume — Complete App Map

> Auto-generated reference. Last updated: 2026-05-18.
> Branch: `claude/build-volyume-app-srY9C`

> **⚠ Partially stale as of 2026-05-21.** Several screens listed below
> have since been removed (CoachBuilderScreen, OnboardingQuizScreen) and
> the auth / onboarding / Pro upgrade flows have been reworked. The
> canonical current-state reference is now `INFRASTRUCTURE.md` at the
> repo root. This file is kept for historical context and the screen
> deep-dives that haven't changed; treat anything to do with plan
> creation flow or first-run paths as historical, not current.

---

## Navigation Tree

```
App.js (ErrorBoundary)
└── RootNavigator (React Navigation v6)
    │
    ├── AuthStack  (shown when firstRunComplete === false)
    │   ├── FirstRunBranch   → FirstRunScreen
    │   ├── CoachBuilder     → CoachBuilderScreen
    │   ├── PlanLibrary      → PlanLibraryScreen
    │   └── PlanDetail       → PlanDetailScreen
    │
    └── MainTabs  (BottomTabNavigator — shown when firstRunComplete === true)
        ├── HomeTab      → HomeStack
        │   ├── Home             → HomeScreen          (default)
        │   ├── BuildWorkout     → BuildWorkoutScreen
        │   ├── ActiveWorkout    → ActiveWorkoutScreen
        │   ├── WorkoutSummary   → WorkoutSummaryScreen
        │   └── ShareCard        → ShareCardScreen
        │
        ├── PlansTab     → PlansStack
        │   ├── Plans            → PlansScreen          (default)
        │   ├── PlanDetail       → PlanDetailScreen
        │   ├── RoutineDetail    → RoutineDetailScreen
        │   ├── ExerciseLibrary  → ExerciseLibraryScreen
        │   ├── ExerciseDetail   → ExerciseDetailScreen
        │   ├── ManualBuilder    → ManualBuilderScreen
        │   ├── CoachBuilder     → CoachBuilderScreen
        │   └── PlanLibrary      → PlanLibraryScreen
        │
        ├── ProgressTab  → ProgressStack
        │   ├── Analytics        → AnalyticsScreen      (default)
        │   ├── WorkoutHistory   → WorkoutHistoryScreen
        │   ├── WorkoutSummary   → WorkoutSummaryScreen
        │   ├── VolumeHeatmap    → VolumeHeatmapScreen
        │   ├── PRWall           → PRWallScreen
        │   ├── BodyMetrics      → BodyMetricsScreen
        │   ├── ExerciseLibrary  → ExerciseLibraryScreen  (title: "Lift Progress")
        │   ├── ExerciseDetail   → ExerciseDetailScreen
        │   └── ShareCard        → ShareCardScreen
        │
        └── ProfileTab   → ProfileStack
            ├── AthleteHub       → AthleteHubScreen     (default)
            ├── Settings         → SettingsScreen
            ├── NutritionTargets → NutritionTargetsScreen
            ├── BodyMetrics      → BodyMetricsScreen
            ├── PRWall           → PRWallScreen
            ├── ExerciseLibrary  → ExerciseLibraryScreen
            ├── ExerciseDetail   → ExerciseDetailScreen
            ├── MesocycleBuilder → MesocycleBuilderScreen
            └── PeakWeek         → PeakWeekScreen
```

### Cross-tab navigation (uses `navigation.getParent()?.navigate`)
| From screen | Target | Code |
|---|---|---|
| AnalyticsScreen | PlansTab → CoachBuilder | `getParent()?.navigate('PlansTab', { screen: 'CoachBuilder' })` |
| AnalyticsScreen | PlansTab (plan active) | `getParent()?.navigate('PlansTab')` |
| AnalyticsScreen | ProfileTab → MesocycleBuilder | `getParent()?.navigate('ProfileTab', { screen: 'MesocycleBuilder' })` |
| HomeScreen | PlansTab → CoachBuilder | `navigate('PlansTab', { screen: 'CoachBuilder' })` |
| HomeScreen | PlansTab → PlanLibrary | `navigate('PlansTab', { screen: 'PlanLibrary' })` |
| HomeScreen | PlansTab → ManualBuilder | `navigate('PlansTab', { screen: 'ManualBuilder' })` |
| PRWallScreen | ProfileTab → BodyMetrics | `navigate('ProfileTab', { screen: 'BodyMetrics' })` |
| BodyMetricsScreen | ProfileTab → NutritionTargets | `navigate('ProfileTab', { screen: 'NutritionTargets' })` |

---

## Screens

### Authentication / First-Run

#### `FirstRunScreen`
- **Purpose:** Gateway screen shown on fresh install. Three paths: Coach Builder, Manual Builder, Plan Library.
- **Navigates to:** `CoachBuilder`, `ManualBuilder` (via PlansTab cross-tab), `PlanLibrary`
- **Store reads:** `user`, `completeFirstRun`

#### `LoginScreen`
- **Purpose:** Email/password sign-in; also restores crash log from AsyncStorage on mount.
- **Displays:** Crash log from previous session (dismissable red banner).
- **Navigates to:** `Onboarding` (replace), `MainTabs` (replace via store auth)

#### `OnboardingScreen`
- **Purpose:** 4-step profile setup (training focus, experience, equipment, units).
- **Writes:** `userProfile` to store + AsyncStorage via `saveLocalProfile`

---

### Home Tab

#### `HomeScreen`
- **Purpose:** Daily dashboard. Shows week stats, streak, next planned workout, last session.
- **Key data:** `getAllWorkouts`, `getCompletedWorkoutSets`, `getActivePlan`, `getRoutinesForPlan`, `getAllRoutineExerciseCounts`
- **Key actions:** Start next workout, Repeat last session (now pre-populates exercises), change workout
- **Navigates to:** `ActiveWorkout`, `BuildWorkout`, `PlansTab/*`

#### `BuildWorkoutScreen`
- **Purpose:** Pre-workout builder — pick exercises before starting.
- **Navigates to:** `ActiveWorkout` (replace)

#### `ActiveWorkoutScreen` ⭐ CRITICAL (1,342 lines)
- **Purpose:** Live workout logger. Exercise-by-exercise, set-by-set.
- **Store reads/writes:** `activeWorkout`, `workoutExercises`, `currentExerciseIndex`, `addSetToCurrentExercise`, `startRestTimer`, `showPRCelebration`, `endWorkout`
- **Key algorithms:** `getProgressionSuggestion`, `detectPR`, `calculate1RM`
- **Components used:** `SetEntry`, `RestTimer`, `PlateCalculator`
- **Key features:**
  - Previous performance inline
  - Rest timer auto-starts on set complete (haptics)
  - PR detection on every set → `PRCelebration` overlay
  - Auto-advance to next exercise after target sets
  - Time Crunch mode (cuts rest + drops exercises to fit a target duration)
  - Exercise swap (ranked substitutes)
  - Set type picker (straight, warmup, dropset, superset, myo-reps, AMRAP, rest-pause)
- **Navigates to:** `WorkoutSummary` (replace on finish)

#### `WorkoutSummaryScreen`
- **Purpose:** Post-workout review. Auto-saves feedback with 1s debounce. Shows volume status, auto-reg advice, deload prediction.
- **Params:** `workoutId`, `durationMinutes`, `exerciseCount`, `setCount`, `workingSetCount`, `tonnage`, `exerciseNames`, `readOnly`, `routineId`, `detectedPRs`, `exerciseData`
- **Key algorithms:** `calculateWeeklyVolume`, `getVolumeStatus`, `getAutoRegSuggestion`, `evaluateAutoReg`, `predictDeloadWeek`
- **Navigates to:** `ShareCard`, back/popToTop on Close

#### `ShareCardScreen`
- **Purpose:** Generate a shareable workout summary card (PNG export).

---

### Plans Tab

#### `PlansScreen`
- **Purpose:** Lists user's plans (active + archived) and library plans.
- **Navigates to:** `PlanDetail`, `ManualBuilder`, `CoachBuilder`, `PlanLibrary`

#### `PlanDetailScreen`
- **Purpose:** View/manage a single plan. Start a workout from it, set as active, duplicate, archive.
- **Params:** `planId`, `isLibrary`
- **Key actions:** Add to My Plans (library copy), Set Active, Start Workout, archive/duplicate

#### `PlanLibraryScreen`
- **Purpose:** Browse curated plans filtered by split type.
- **Params:** `fromFirstRun` — if true, calls `completeFirstRun()` after selecting
- **Navigates to:** `PlanDetail`

#### `RoutineDetailScreen`
- **Purpose:** Edit a single workout day within a plan (exercises, sets, reps, rest).
- **Navigates to:** `ExerciseLibrary` (to add exercises), `ExerciseDetail`

#### `ExerciseLibraryScreen`
- **Purpose:** Search/filter exercise database (~150 exercises). Used for both browsing and adding to routines.
- **Navigates to:** `ExerciseDetail`

#### `ExerciseDetailScreen`
- **Purpose:** Exercise history chart (est. 1RM over 8 sessions), substitutes list.
- **Params:** `exerciseId`
- **Key algorithms:** `calculate1RM`, `getExerciseSubstitutes`

#### `ManualBuilderScreen` (1,266 lines)
- **Purpose:** Full plan builder from scratch — name, split, add workout days, add exercises.

#### `CoachBuilderScreen` (935 lines)
- **Purpose:** AI-guided plan creation. Asks about goals, experience, equipment, frequency → generates a full plan and saves to `programmes` table.

---

### Progress Tab

#### `AnalyticsScreen`
- **Purpose:** Dashboard showing active plan pulse, volume trends, deload alert, training calendar, PR sparkline, navigation tiles.
- **Key data:** `getAllWorkouts`, `getCompletedWorkoutSets`, `getAllExercises`, `getActivePlan`
- **Algorithms:** `calculateWeeklyVolume`, `shouldDeload`, `computePRsPerWeek`
- **Navigates to:** `WorkoutHistory`, `VolumeHeatmap`, `PRWall`, `BodyMetrics`, `ExerciseLibrary`, `ProfileTab→MesocycleBuilder`

#### `WorkoutHistoryScreen`
- **Purpose:** Calendar month view + session list. Tap a session to open read-only WorkoutSummary. Repeat a session.
- **Navigates to:** `WorkoutSummary` (read-only), `ActiveWorkout` (repeat)

#### `VolumeHeatmapScreen`
- **Purpose:** Per-muscle weekly volume heatmap with MEV/MAV/MRV colour bands.
- **Algorithms:** `calculateWeeklyVolume`, `getVolumeStatus`, `VOLUME_LANDMARKS`

#### `PRWallScreen`
- **Purpose:** All-time personal records per exercise. Lifetime bests, strength standards vs bodyweight.
- **Navigates to:** `ProfileTab→BodyMetrics`

#### `BodyMetricsScreen`
- **Purpose:** Log + trend bodyweight and measurements. Weight chart, delta badges.
- **Navigates to:** `ProfileTab→NutritionTargets`

---

### Profile Tab

#### `AthleteHubScreen`
- **Purpose:** Profile hub. Shows milestones, streak, recovery status, quick stats, nav rows to all profile features.
- **Nav rows:** Nutrition Targets, Body Metrics, Training Blocks, Peak Week, Send Report to Coach, Personal Records, Settings
- **Key data:** `getAllWorkouts`, `getCompletedWorkoutSets`, `getBodyMetricLog`, `getNutritionTargets`
- **Algorithms:** `computeRecoveryEMAs`

#### `SettingsScreen`
- **Purpose:** Units, wellbeing mode, exercise library, data management, account.
- **Data actions:** Back up everything (JSON), Restore from backup, Export workout log (CSV), Clear workout history
- **Account:** Sign out, Delete account

#### `NutritionTargetsScreen`
- **Purpose:** Calculate and display daily calorie + macro targets (protein, carbs, fat).
- **Engine:** `nutritionEngine.js` — bodybuilding-level protein targets (2.2g/kg+ lean gain)

#### `MesocycleBuilderScreen`
- **Purpose:** Create and manage named training blocks (mesocycles) with start date, duration, experience level.

#### `PeakWeekScreen`
- **Purpose:** 7-day contest prep protocol (carb deplete → load → water/sodium taper).
- **Federations:** BPA, 2BROS, FitX, FMX, IBFA, NABBA, NPC, PCA, UKBFF (default: BPA)
- **Engine:** `peakWeekEngine.js`

---

## Components

| Component | Purpose | Props |
|---|---|---|
| `SetEntry` | Weight/reps/set-type input row | `value`, `onChange`, `units`, `onOpenSetTypePicker` |
| `RestTimer` | Countdown timer with animated progress bar, haptics, +/− adjustments | (reads from store directly) |
| `PlateCalculator` | Inline plate math for any weight | `weight`, `units`, `barWeight` |
| `VolumeBars` | MEV/MAV/MRV coloured volume bars | `muscle`, `sets`, `landmarks` |
| `PRCelebration` | Full-screen confetti + haptic overlay on new PR | `pr`, `onDismiss`, `subdued` |
| `ExerciseCard` | Search result row in exercise library | `exercise`, `onPress` |
| `BrandMark` / `BrandTag` | "Volyume" logo lockup | `size`, `color` |
| `EmptyState` | Generic empty-state placeholder | `icon`, `title`, `subtitle`, `action` |

---

## Library Modules (`src/lib/`)

### `database.js` — SQLite layer
- Opens `volyume.db` with WAL mode via `openDatabaseAsync`
- Versioned migrations via `PRAGMA user_version` (currently at v2)
- All rows snake_case → camelCase via `rowToCamel`
- **Key exports:** `initDatabase`, `getAllWorkouts`, `getCompletedWorkoutSets`, `getAllWorkoutSets`, `createWorkout`, `updateWorkout`, `createWorkoutSet`, `getWorkoutSetsForWorkout`, `getPreviousWorkoutSets`, `getAllExercises`, `getExerciseById`, `getAllRoutines`, `createRoutine`, `getRoutineExercisesWithDetails`, `addExerciseToRoutine`, `getActivePlan`, `setActivePlan`, `getRoutinesForPlan`, `getProgrammeById`, `advancePlanNextWorkout`, `copyPlanFromLibrary`, `getAllPlansForUser`, `getLibraryPlans`, `saveNutritionTargets`, `getNutritionTargets`, `savePeakWeekPlan`, `getActivePeakWeekPlan`, `logBodyMetric`, `getBodyMetricLog`, `getLatestBodyWeight`, `buildWorkoutCSV`, `clearWorkoutHistory`, `dumpAllTables`, `restoreAllTables`, `BACKUP_TABLES`

### `algorithms.js` — Hypertrophy intelligence
Ten pure functions, no side-effects:

| Function | Purpose |
|---|---|
| `calculateWeeklyVolume(sets, exerciseMap)` | Hard sets per muscle (RIR ≤2 or RPE ≥7 only) |
| `getProgressionSuggestion(currentSets, prevSets, repsMin, repsMax, units)` | Double-progression suggestion |
| `detectPR(newSet, historicalSets, exercise, units)` | Returns PR type array; triggers celebration |
| `calculate1RM(weight, reps)` | Ensemble Epley/Brzycki with rep-range weighting |
| `getVolumeStatus(weeklyVolume, muscle)` | below / optimal / over using VOLUME_LANDMARKS |
| `getAutoRegSuggestion(feedback, weeklyVolumes)` | Volume adjustment advice |
| `shouldDeload(last4Weeks)` | Multi-signal deload detection |
| `getExerciseSubstitutes(exercise, allExercises, equipment)` | SFR-ranked substitutes |
| `calculateTonnage(sets)` | sum(weight × reps) for hard sets |
| `getProgressionPath(thisWeek, lastWeek)` | Next block suggestion |

**VOLUME_LANDMARKS** (MEV / MAV / MRV per muscle group):
```
chest: 6/14/22  back: 10/18/25  front_delts: 0/6/12  side_delts: 8/16/26
rear_delts: 4/16/22  biceps: 8/16/26  triceps: 6/12/18  quads: 8/14/20
hamstrings: 6/12/20  glutes: 4/10/16  calves: 8/14/20  abs: 0/18/25  traps: 6/12/20
```

### `nutritionEngine.js` — Macro calculator
Bodybuilding-level targets. Protein per kg by goal:
- `lean_gain`: 2.2g/kg | `build`: 2.0g/kg | `maintain`: 2.0g/kg
- `recomp`: 2.5g/kg | `mild_cut`: 2.5g/kg | `aggressive_cut`: 2.7g/kg | `contest_prep`: 2.7g/kg

### `mesocycle.js` — Block periodisation
- `getMesoSchedule(experience)` → 5-week standard or 6-week advanced schedule
- `getCurrentMesoWeek(startDateMs, experience)` → 1-based week number
- `evaluateAutoReg(feedbackWindow)` → action + sets adjustment
- `predictDeloadWeek(feedbackWindow, mesoWeek, experience)` → weeks until deload

### `peakWeekEngine.js` — Contest prep
- `FEDERATIONS`: `['BPA', '2BROS', 'FitX', 'FMX', 'IBFA', 'NABBA', 'NPC', 'PCA', 'UKBFF']`
- `buildPeakWeek(inputs)` → 7-day deterministic protocol (carb/fat/water/sodium per day)
- Protocol: 3-day depletion → 2-day load → 1-day taper → show day

### `dataBackup.js` — Local backup / restore
- `exportBackup()` → dumps all SQLite tables + AsyncStorage prefs to JSON → native share sheet
- `importBackup()` → file picker → validates → restores inside a single transaction

### `planEngine.js` — Plan generation
- Generates workout splits from CoachBuilder inputs (frequency, focus, experience, equipment)

### `insightsEngine.js` — Automated coaching insights
- Analyses workout history → surfaces actionable recommendations (volume, recovery, progression)

### `recoveryEMA.js` — Recovery tracking
- Exponential moving averages on soreness/fatigue/pump feedback

### `coachExport.js` — PDF report
- Builds "Last 4 weeks" report (volume, PRs, bodyweight) for sending to a coach

### `swapEngine.js` — Exercise substitution
- `rankSwaps(exercise, allExercises, options)` → sorted substitute list by SFR + equipment match

### `wellbeing.js` — Wellbeing mode
- `getWellbeingMode()` / `setWellbeingMode()` → calm mode toggles certain UI effects off

### `phaseEngine.js` — Phase detection
- Detects current training phase (bulk/cut/recomp/maintain) from bodyweight trend + nutrition goal

### `setTypeEngine.js` — Set type logic
- Validation and display helpers for straight / warmup / dropset / superset / myo-reps / AMRAP / rest-pause

### `travelMode.js` — Travel/minimal equipment
- Adapts exercise selection to available equipment

### `supabase.js` — Auth client
- Supabase client init (reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- `signOut()`, `getSupabaseClient()`

### `seedExercises.js` / `seedRoutines.js`
- One-time seeding of ~150 canonical exercises and starter routines into SQLite on first launch

---

## Zustand Store (`useAppStore`)

```
── Auth ─────────────────────────────────────────────────
user            { id, email, isLocal? }   null when logged out
session         Supabase session object
userProfile     { trainingFocus, trainingAgeYears, primaryEquipment, units, ... }
isAuthLoading   bool

setUser / setSession / setUserProfile / setAuthLoading
initLocalUser()     → creates UUID user stored in AsyncStorage (offline mode)
saveLocalProfile()  → persists profile to AsyncStorage
clearLocalUser()    → wipes local user

── First-run ─────────────────────────────────────────────
firstRunComplete    bool (default true to avoid flash)
firstRunChecked     bool
checkFirstRun()     → reads AsyncStorage, sets flags
completeFirstRun()  → writes AsyncStorage, sets true

── Active Workout ────────────────────────────────────────
activeWorkout           { id, routineId, ... }
workoutExercises        [{ exercise, routineExercise, sets: [setData] }]
currentExerciseIndex    int
workoutStartTime        epoch ms
lastActivityAt          epoch ms

startWorkout(workout, initialExercises)
endWorkout()
setWorkoutExercises(arrayOrFn)   ← supports functional updater
addExerciseToWorkout(exercise, routineExercise)
addSetToCurrentExercise(setData)
setCurrentExerciseIndex(i)
updateLastActivity()

── Rest Timer ────────────────────────────────────────────
restTimerActive     bool
restTimerDuration   seconds
restTimerRemaining  seconds

startRestTimer(duration)
stopRestTimer()
addRestTime(seconds)
tickRestTimer()     ← called by setInterval in RestTimer component

── PR Celebration ────────────────────────────────────────
prCelebration    { type, value, label, ... } | null
showPRCelebration(pr)
hidePRCelebration()

── Units ────────────────────────────────────────────────
units       'kg' | 'lb'
setUnits(u)

── Bar weight ───────────────────────────────────────────
barWeight   kg (default 20)
setBarWeight(w)
```

---

## SQLite Database (`volyume.db`)

Schema version tracked via `PRAGMA user_version` (currently v2).

| Table | Purpose | Key columns |
|---|---|---|
| `exercises` | Canonical + custom exercises | `id`, `name`, `primary_muscle`, `secondary_muscles`, `equipment`, `compound_isolation`, `sfr` |
| `workouts` | Workout sessions | `id`, `user_id`, `routine_id`, `started_at`, `ended_at`, `is_completed`, `session_difficulty`, `fatigue_level`, `soreness_24h_before`, `overall_pump`, `name`, `set_count`, `total_volume` |
| `workout_sets` | Individual logged sets | `id`, `workout_id`, `exercise_id`, `user_id`, `set_number`, `set_type`, `actual_reps`, `weight`, `rir`, `rpe`, `failed`, `missed_reps` |
| `routines` | Workout templates (days within a plan) | `id`, `user_id`, `programme_id`, `name`, `is_template`, `is_library` |
| `routine_exercises` | Exercises within a routine | `id`, `routine_id`, `exercise_id`, `order`, `recommended_sets`, `recommended_reps_min`, `recommended_reps_max`, `starting_weight`, `rest_seconds` |
| `programmes` | Training plans (CoachBuilder / ManualBuilder output) | `id`, `user_id`, `name`, `is_active`, `next_workout_index`, `split_type`, `tags`, `is_archived` |
| `mesocycles` | Named training blocks | `id`, `user_id`, `name`, `start_date`, `duration_weeks`, `experience_level` |
| `nutrition_targets` | Daily macro targets | `id`, `user_id`, `goal`, `calories`, `protein_g`, `carbs_g`, `fat_g` |
| `peak_week_plans` | Contest prep protocols | `id`, `user_id`, `show_date`, `federation`, `current_bodyweight`, `lean_estimate`, `plan_json` |
| `body_metric_log` | Weight + measurements over time | `id`, `user_id`, `logged_at`, `body_weight`, `waist_cm`, `chest_cm`, `arms_cm`, `legs_cm`, `shoulders_cm`, `forearm_cm`, `ham_cm`, `calf_cm` |
| `user_insights` | Automated coaching insights | `id`, `user_id`, `type`, `message`, `dismissed_at` |
| `user_body_profile` | Physical stats (height, age, sex) | `id`, `user_id`, `height_cm`, `age`, `sex`, `training_age_years` |

**Backup tables** (exported by `dumpAllTables`): all except `exercises` (re-seeded on launch).

---

## AsyncStorage Keys

| Key | Purpose |
|---|---|
| `@volyume_local_user_id` | Offline user UUID |
| `@volyume_first_run_complete` | Onboarding gate |
| `@volyume_user_profile_<userId>` | Onboarding selections |
| `@volyume_wellbeing_mode` | Calm mode preference |
| `@volyume_physique_tracking_enabled` | Body metrics section toggle in AthleteHub |
| `@volyume_exercises_seeded_v<n>` | Exercise seed version guard |
| `@volyume_routines_seeded_v<n>` | Routine seed version guard |
| `@volyume_nutrition_targets` | Legacy cache (real data in SQLite `nutrition_targets`) |
| `@volyume_landmarks_<userId>` | Custom MEV/MAV/MRV overrides per user |
| `@volyume_crash_log` | Last crash message (surfaced on LoginScreen; excluded from backup) |

---

## APK Build

Trigger: push to `claude/build-volyume-app-srY9C` → GitHub Actions (`build-android.yml`).

```
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease --no-daemon
```

**IMPORTANT: always `assembleRelease`, never `assembleDebug`.**
Release APK embeds the JS bundle. Debug APK requires a Metro server and crashes with "Unable to load script" when run standalone.

Artifact: uploaded as `app-release.apk` in the Actions run.

---

## Bug Fixes Applied (This Branch)

| Fix | File | Description |
|---|---|---|
| setWorkoutExercises functional updater | `store/useAppStore.js` | Now accepts `fn(prev)` or plain array; Time Crunch was passing a function, corrupting the exercise array |
| addSetToCurrentExercise index guard | `store/useAppStore.js` | Bails if `currentExerciseIndex` is out of range instead of crashing on `.sets` |
| ExerciseDetailScreen null exercise | `screens/ExerciseDetailScreen.js` | Returns early if `getExerciseById` returns null; no more `.name` crash |
| ExerciseDetailScreen Math.max empty | `screens/ExerciseDetailScreen.js` | Guards empty `sessionSets` array before `Math.max(...)` spread |
| AnalyticsScreen MesocycleBuilder nav | `screens/AnalyticsScreen.js` | Uses `getParent()?.navigate('ProfileTab', { screen: 'MesocycleBuilder' })` — was navigating within ProgressStack which has no MesocycleBuilder |
| ShareCard missing from ProgressStack | `navigation/RootNavigator.js` | Added ShareCard to ProgressStack so WorkoutSummary → Share works from history view |
| BodyMetrics date crash | `screens/BodyMetricsScreen.js` | Guards `latest?.metric_date` before formatting |
| SetEntry limits undefined | `components/SetEntry.js` | Falls back to `[0, 9999]` if field not in limits map |
| Glutes MEV 0→4 | `lib/algorithms.js` | Secondary sets from squats no longer instantly green-signal glutes |
| Protein targets (bodybuilding) | `lib/nutritionEngine.js` | Raised to 2.2g/kg lean gain (was 1.8g/kg) |
| Repeat last session blank | `screens/HomeScreen.js` | Loads previous session exercises and pre-populates new workout |
| Custom calendar grid | `screens/AnalyticsScreen.js` | Replaced unreliable library with custom 12×7 View grid |
| PR bars zero-height | `screens/AnalyticsScreen.js` | Custom View bars with minimum heights replace collapsing BarChart |
| Duplicate Settings icon | `screens/AthleteHubScreen.js` | Removed gear from header; Settings nav row is sufficient |
| Personal Records → Body Metrics | `screens/AthleteHubScreen.js` | Fixed navigate target to `PRWall` |
| Body metrics race condition | `screens/AthleteHubScreen.js` | Added `useEffect([user?.id])` alongside `useFocusEffect` |
| Lift Progress unresponsive | `navigation/RootNavigator.js` | Added ExerciseLibrary + ExerciseDetail to ProgressStack |
| UK Federations (Peak Week) | `lib/peakWeekEngine.js` | BPA, 2BROS, FitX, FMX, IBFA, NABBA, NPC, PCA, UKBFF |
| Crash report always visible | `App.js` | Error message in fixed red box above scroll, selectable |
| Versioned DB migrations | `lib/database.js` | `PRAGMA user_version` runner replaces swallow-all loop |
| JSON backup/restore | `lib/dataBackup.js` | Full export + import via share sheet / document picker |
