# Volyume — Complete Technical Architecture Map

> Version 1.1.0 (versionCode 2) · Generated from source · 2026-05-17
>
> This document is self-contained. It describes the entire Volyume React Native app so that an AI assistant can understand the full architecture, data model, business logic, and screen inventory without seeing any source code.

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Navigation Structure](#2-navigation-structure)
3. [Database Schema](#3-database-schema)
4. [Global State (Zustand Store)](#4-global-state-zustand-store)
5. [Screen Inventory](#5-screen-inventory)
6. [Component Library](#6-component-library)
7. [Algorithms and Calculations](#7-algorithms-and-calculations)
8. [Volume Landmarks System](#8-volume-landmarks-system)
9. [Exercise Data Model](#9-exercise-data-model)
10. [Workout Session Flow](#10-workout-session-flow)
11. [Plan Generation (CoachBuilder / planEngine)](#11-plan-generation-coachbuilder--planengine)
12. [Theme and Design System](#12-theme-and-design-system)
13. [Authentication and User Flow](#13-authentication-and-user-flow)
14. [Data Flows Between Screens](#14-data-flows-between-screens)
15. [Known Gaps and Stage Notes](#15-known-gaps-and-stage-notes)

---

## 1. App Overview

**App name:** Volyume  
**Slug:** volyume  
**Version:** 1.1.0 (versionCode 2)  
**Bundle IDs:** app.volyume (iOS and Android)  
**Tagline:** "Intelligent Hypertrophy Logbook"

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.74.5 with Expo ~51.0.0 (managed workflow) |
| State management | Zustand ^4.5.2 (no persist middleware — manual AsyncStorage) |
| Local database | expo-sqlite ~14.0.4 (WAL journal mode, single file) |
| Cloud backend | Supabase @supabase/supabase-js ^2.43.4 (lazy init, optional) |
| Navigation | React Navigation v6: bottom tabs + stack navigators |
| Date utilities | date-fns ^3.6.0 |
| Vector graphics | react-native-svg 15.2.0 |
| Animations | react-native-reanimated ~3.10.1 |
| Haptics | expo-haptics ~13.0.1 |
| Icons | @expo/vector-icons (Ionicons) |
| Secure storage | expo-secure-store |
| Safe areas | react-native-safe-area-context |
| Share cards | expo-file-system, expo-sharing, react-native-webview |
| Photos | expo-image-picker (permissions declared) |

### Core Architecture Principles

- **Local-first, offline-capable.** All data is stored in SQLite on-device. Supabase is optional and absent when env vars are missing; `isSupabaseConfigured()` returns false and the app functions fully without it.
- **UUID-based local user.** A UUID is generated on first launch and stored at AsyncStorage key `@volyume_local_user_id`. The user object is `{ id, isLocal: true }`.
- **Auth gate bypassed.** The login/signup flow exists but the auth gate in RootNavigator is disabled for the local-first phase. The app goes straight to the main tabs.
- **Dark mode only.** `userInterfaceStyle: "dark"`, background `#0D0D0D`.
- **UK English conventions.** Number formatting uses `en-GB` locale (e.g., `toLocaleString('en-GB')`).
- **No Math.random() in plan generation.** `planEngine.js` is fully deterministic.
- **GDPR consent gate** for body/nutrition data (checkboxes in relevant screens).

### Entry Point

`App.js` wraps the app in:
1. `ErrorBoundary` (class component) — global crash handler writes to `AsyncStorage` key `@volyume_crash_log`
2. `GestureHandlerRootView`
3. `SafeAreaProvider`
4. `PRCelebration` overlay (reads `prCelebration` from Zustand store, renders globally)
5. `StatusBar style="light" backgroundColor="#0D0D0D"`

---

## 2. Navigation Structure

**File:** `src/navigation/RootNavigator.js`

### Tab Navigator (4 tabs)

| Tab | Screen Name | Root Screen |
|---|---|---|
| Train | HomeTab | HomeScreen |
| Plans | PlansTab | PlansScreen |
| Progress | ProgressTab | AnalyticsScreen |
| You | ProfileTab | AthleteHubScreen |

Tab bar colors: background `#111111`, border `#222222`.

### Stack Definitions

**HomeStack (HomeTab)**
```
Home → BuildWorkout → ActiveWorkout → WorkoutSummary → ShareCard
```

**PlansStack (PlansTab)**
```
Plans → PlanDetail → RoutineDetail → ExerciseLibrary → ExerciseDetail
     → ManualBuilder → CoachBuilder → PlanLibrary
```

**ProgressStack (ProgressTab)**
```
Analytics → WorkoutHistory → WorkoutSummary → VolumeHeatmap → PRWall → BodyMetrics
```

**ProfileStack (ProfileTab)**
```
AthleteHub → Settings → NutritionTargets → BodyMetrics → MesocycleBuilder
```

**AuthStack (not active in current phase)**
```
Login → Onboarding
```

### Bootstrap Sequence (RootNavigator)

1. `initDatabase()` — creates/migrates all SQLite tables
2. `seedExercisesIfNeeded()` — seeds 200+ exercises if AsyncStorage key `@volyume_exercises_seeded_v3` absent or exercises table empty
3. Supabase session check — `getCurrentUser()` (returns null if unconfigured)
4. `initLocalUser()` — reads or creates UUID at `@volyume_local_user_id`

### Splash Screen

Duration: 2000ms minimum. Animation sequence:
1. VolyumeMark (SVG V logo): scale + fade in
2. Wordmark "VOLYUME": slide + fade in
3. Tagline "Intelligent Hypertrophy Logbook": fade in

---

## 3. Database Schema

**File:** `src/lib/database.js`  
**Engine:** expo-sqlite (WAL journal mode, single file)  
**Helper:** `rowToCamel()` — converts snake_case columns to camelCase, parses `secondary_muscles` JSON  
**ID helper:** `uid()` = `Date.now().toString(36)` + random base36

### Tables

#### exercises
```
id TEXT PK
name TEXT
primary_muscle TEXT
secondary_muscles TEXT (JSON string: [{muscle, contribution}])
equipment TEXT
movement_pattern TEXT
compound_isolation TEXT ('compound' | 'isolation')
default_rep_min INTEGER
default_rep_max INTEGER
fatigue_cost REAL  (1–5 scale)
stimulus_to_fatigue_ratio REAL  (1–5 scale, abbreviated SFR)
is_custom INTEGER DEFAULT 0
notes TEXT
created_at INTEGER
updated_at INTEGER
```

#### workouts
```
id TEXT PK
user_id TEXT
routine_id TEXT (nullable)
mesocycle_id TEXT (nullable)
started_at INTEGER (Unix ms)
ended_at INTEGER (nullable)
duration_minutes INTEGER (nullable)
notes TEXT
session_difficulty INTEGER 0–5
overall_pump INTEGER 0–3
soreness_24h_before INTEGER 0–3
fatigue_level INTEGER 0–5
is_completed INTEGER DEFAULT 0
name TEXT (nullable — set on finish)
set_count INTEGER (nullable — set on finish)
total_volume REAL (nullable — set on finish)
last_activity_at INTEGER (migration column)
active_elapsed_seconds INTEGER (migration column)
created_at INTEGER
updated_at INTEGER
```

#### workout_sets
```
id TEXT PK
user_id TEXT
workout_id TEXT
exercise_id TEXT
set_number INTEGER
set_type TEXT DEFAULT 'straight'  ('straight'|'warmup'|'dropset'|'superset'|'myo_reps'|'rest_pause'|'amrap')
target_reps_min INTEGER
target_reps_max INTEGER
actual_reps INTEGER
weight REAL
rir INTEGER (Reps In Reserve)
rpe REAL (Rate of Perceived Exertion)
failed INTEGER DEFAULT 0
notes TEXT
post_set_pump INTEGER
post_set_muscle_connection INTEGER
joint_discomfort INTEGER
is_amrap INTEGER DEFAULT 0
amrap_reps INTEGER
created_at INTEGER
updated_at INTEGER
```

#### routines
```
id TEXT PK
user_id TEXT
name TEXT
description TEXT
split_type TEXT
is_active INTEGER DEFAULT 1
is_library INTEGER DEFAULT 0
is_template INTEGER (migration column)
source_routine_id TEXT (migration column)
programme_id TEXT (migration column — links routine to a programme/plan)
created_at INTEGER
updated_at INTEGER
```

#### programmes
```
id TEXT PK
user_id TEXT
name TEXT
description TEXT
is_library INTEGER DEFAULT 0
is_active INTEGER DEFAULT 0
next_workout_index INTEGER DEFAULT 0  (rotation pointer)
tags TEXT (migration column)
split_type TEXT (migration column)
is_archived INTEGER DEFAULT 0 (migration column)
created_at INTEGER
updated_at INTEGER
```

#### routine_exercises
```
id TEXT PK
routine_id TEXT
exercise_id TEXT
order_in_routine INTEGER DEFAULT 0
recommended_sets INTEGER DEFAULT 3
recommended_reps_min INTEGER DEFAULT 6
recommended_reps_max INTEGER DEFAULT 12
notes TEXT
starting_weight REAL (migration column)
rest_seconds INTEGER (migration column)
created_at INTEGER
updated_at INTEGER
```

#### mesocycles
```
id TEXT PK
user_id TEXT
name TEXT
start_date TEXT (YYYY-MM-DD)
end_date TEXT (YYYY-MM-DD)
duration_weeks INTEGER
focus TEXT (nullable)
goals TEXT
is_active INTEGER DEFAULT 1
deload_week INTEGER
auto_regulation_enabled INTEGER DEFAULT 1
created_at INTEGER
updated_at INTEGER
```

#### nutrition_targets
```
id TEXT PK
user_id TEXT
bmr REAL
tdee REAL
target_kcal REAL
protein_g REAL
carbs_g REAL
fat_g REAL
phase TEXT
bmr_method TEXT
activity_level TEXT
confidence TEXT
warnings TEXT
gdpr_consented INTEGER DEFAULT 0
created_at INTEGER
updated_at INTEGER
```

> Note: `nutrition_targets` is in SQLite but the app currently saves nutrition data to AsyncStorage key `@volyume_nutrition_targets` instead. The SQLite table exists but the save path uses `saveNutritionTargets()` only from `nutritionEngine.js` code paths, not all screen paths.

#### body_metric_log
```
id TEXT PK
user_id TEXT
logged_at INTEGER
weight_kg REAL
body_fat_percent REAL
body_fat_source TEXT
waist_cm REAL
chest_cm REAL
hips_cm REAL
thigh_cm REAL
arm_cm REAL
notes TEXT
created_at INTEGER
```

> Note: `BodyMetricsScreen` saves to AsyncStorage key `@volyume_body_metrics_{userId}`, not this table.

#### user_body_profile
```
id TEXT PK
user_id TEXT UNIQUE
sex TEXT
date_of_birth TEXT
height_cm REAL
experience_level TEXT
training_age_years REAL
primary_goal TEXT
gdpr_consented INTEGER DEFAULT 0
created_at INTEGER
updated_at INTEGER
```

### Column Migrations

Applied via `ALTER TABLE ... ADD COLUMN` with try/catch (idempotent):
- `routine_exercises`: `starting_weight`, `rest_seconds`
- `workouts`: `last_activity_at`, `active_elapsed_seconds`, `name`, `set_count`, `total_volume`
- `routines`: `is_library`, `source_routine_id`, `programme_id`, `is_template`
- `programmes`: `is_active`, `next_workout_index`, `tags`, `split_type`, `is_archived`

### Key Database Functions

| Function | Description |
|---|---|
| `getAllExercises()` | All exercises (seeded + custom) |
| `getExerciseById(id)` | Single exercise by ID |
| `getExercisesByMuscle(muscle)` | Filter by primary_muscle |
| `insertExercise(data)` | Insert custom exercise |
| `getAllWorkouts(userId)` | All workouts for user |
| `createWorkout(userId, routineId)` | Create new workout row |
| `updateWorkout(id, fields)` | Update workout fields (used to save feedback + completion) |
| `getAllWorkoutSets(userId)` | All sets for user |
| `getWorkoutSetsForWorkout(workoutId)` | Sets for one workout |
| `getWorkoutSetsForExercise(exerciseId, userId, limit)` | Per-exercise history |
| `getPreviousWorkoutSets(exerciseId, userId, currentWorkoutId)` | Last session's sets |
| `getAllCompletedSetsForExercise(exerciseId, userId)` | All-time sets for PR detection |
| `createWorkoutSet(data)` | Log a set |
| `getAllRoutines(userId)` | All non-deleted routines |
| `createRoutine(userId, name, ...)` | Create routine (optionally linked to programme) |
| `softDeleteRoutine(id)` | Set `is_active=0` |
| `getRoutineExercisesWithDetails(routineId)` | Returns `[{exercise, routineExercise}]` |
| `addExerciseToRoutine(routineId, exerciseId, order, repsMin, repsMax, notes, sets)` | Add exercise to routine |
| `updateRoutineExercise(id, fields)` | Update sets/reps/rest |
| `duplicateRoutine(routineId, userId, newProgrammeId)` | Deep copy routine |
| `removeExerciseFromRoutine(routineExerciseId)` | Remove from routine |
| `getActivePlan(userId)` | Returns the active programme or null |
| `setActivePlan(userId, programmeId)` | Sets one plan active, deactivates others |
| `getAllPlansForUser(userId)` | Non-archived programmes for user |
| `getLibraryPlans()` | `is_library=1` plans |
| `getRoutinesForPlan(programmeId)` | Routines linked to a programme |
| `advancePlanNextWorkout(planId, routineCount)` | Increments `next_workout_index` modulo routineCount |
| `copyPlanFromLibrary(planId, userId)` | Deep copy library plan → user's plans |
| `archivePlan(planId)` | Set `is_archived=1` |
| `duplicatePlan(planId, userId)` | Deep copy user plan |
| `getWorkoutTemplates(userId)` | Routines with `is_template=1` |
| `createWorkoutTemplateFromWorkout(userId, workoutId, name)` | Save workout as template |
| `saveNutritionTargets(userId, data)` | Upsert nutrition_targets |
| `getNutritionTargets(userId)` | Read nutrition_targets |
| `logBodyMetric(userId, data)` | Insert body_metric_log row |
| `getBodyMetricLog(userId, limit)` | Recent body metrics |
| `saveUserBodyProfile(userId, data)` | Upsert user_body_profile |
| `getUserBodyProfile(userId)` | Read user_body_profile |
| `clearWorkoutHistory(userId)` | Delete all workouts + sets for user |

### Indexes

- `workouts.user_id`
- `workout_sets.workout_id`
- `workout_sets.exercise_id` + `user_id`
- `routines.user_id`
- `routine_exercises.routine_id`
- `mesocycles.user_id`
- `nutrition_targets.user_id`
- `body_metric_log.user_id` + `logged_at`

---

## 4. Global State (Zustand Store)

**File:** `src/store/useAppStore.js`  
No persist middleware — persistence is manual via AsyncStorage where needed.

### State Shape

```
// Auth
user: null | { id: string, email?: string, isLocal: boolean }
session: null | SupabaseSession
userProfile: null | object
isAuthLoading: boolean  (default: true)

// Active workout
activeWorkout: null | WorkoutRow
workoutExercises: Array<{ exercise, routineExercise, sets[] }>
currentExerciseIndex: number  (default: 0)
workoutStartTime: number | null  (Unix ms)
lastActivityAt: number | null  (Unix ms — updated per set logged)

// Rest timer
restTimerActive: boolean  (default: false)
restTimerDuration: number  (default: 90 seconds)
restTimerRemaining: number  (default: 90)

// PR celebration
prCelebration: null | { type, label, exerciseName }

// Preferences
units: 'kg' | 'lbs'  (default: 'kg')
barWeight: number  (default: 20)
```

### Actions

| Action | Description |
|---|---|
| `startWorkout(workout, initialExercises)` | Sets `activeWorkout`, `workoutExercises`, `workoutStartTime` |
| `endWorkout()` | Clears all active workout state |
| `addSetToCurrentExercise(setData)` | Appends set to `workoutExercises[currentExerciseIndex].sets`, updates `lastActivityAt` |
| `addExerciseToWorkout(exercise, routineExercise)` | Appends new exercise slot to `workoutExercises` |
| `setCurrentExerciseIndex(index)` | Navigate between exercises |
| `startRestTimer(duration)` | Sets `restTimerActive=true`, `restTimerDuration` and `restTimerRemaining` |
| `stopRestTimer()` | Clears rest timer |
| `tickRestTimer()` | Decrements `restTimerRemaining` by 1 |
| `addRestTime(delta)` | Adds delta seconds to `restTimerRemaining`, clamped to ≥5 |
| `showPRCelebration(pr)` | Sets `prCelebration` |
| `hidePRCelebration()` | Clears `prCelebration` |
| `setUnits(units)` | Sets `units` preference |
| `setBarWeight(weight)` | Sets `barWeight` preference |
| `setUser(user)` | Sets `user` |
| `setUserProfile(profile)` | Sets `userProfile` |
| `initLocalUser()` | Reads/creates UUID at `@volyume_local_user_id`, sets `user.isLocal=true` |

---

## 5. Screen Inventory

### HomeScreen (`src/screens/HomeScreen.js`)

**Tab:** Train. Uses `useFocusEffect` to reload data.

- **Week stats card:** sessions / sets / total volume vs soft targets `WEEK_TARGETS = {sessions:5, sets:80, volume:15000}`. Display only.
- **Active workout banner:** if `activeWorkout` in store → green "Session in Progress" card → navigates to `ActiveWorkout`.
- **Active plan hero card:** if active plan + nextWorkout → shows plan name, next workout name, "Start Workout" + "Change" (bottom sheet modal to select different workout).
- **No plan state:** 3 builder cards (CoachBuilder / PlanLibrary / BuildWorkout).
- **Last session card:** navigates to `WorkoutHistory`.
- **Quick nav row:** History / Records / Volume (→ WorkoutHistory, PRWall, VolumeHeatmap).
- **`handleStartNextWorkout`:** `createWorkout` → `getRoutineExercisesWithDetails` → `startWorkout(store)` → navigate `ActiveWorkout`.
- Plan advancement uses `(plan.nextWorkoutIndex || 0) % routines.length`.
- `seedRoutinesIfNeeded(user.id)` called on first focus.

---

### PlansScreen (`src/screens/PlansScreen.js`)

**Tab:** Plans.

- **ACTIVE PLAN section:** active plan card with ACTIVE badge, "Start Next Workout", "View Plan", ellipsis options.
- **MY PLANS section:** inactive plans list with "Set Active" + ellipsis options.
- **WORKOUT TEMPLATES section:** routines with `is_template=1`, each showing "Start" + ellipsis.
- **START OR BUILD A PLAN section:** 3 action cards — CoachBuilder (Recommended badge), PlanLibrary, ManualBuilder.
- **`handlePlanOptions`:** Alert sheet → View Plan / Set Active / Duplicate / Archive.
- **`handleTemplateOptions`:** Alert sheet → Edit (→ RoutineDetail) / Delete.
- **`handleStartNextWorkout`:** same flow as HomeScreen.

---

### CoachBuilderScreen (`src/screens/CoachBuilderScreen.js`)

7-step wizard with progress dots.

| Step | Content |
|---|---|
| 1 | Experience level (beginner/intermediate/advanced/competitive) + optional training age pills |
| 2 | Days per week (3/4/5/6) + session length (45/60/75/90 min) |
| 3 | Equipment (full_gym/machines_cables/dumbbells_only/barbell_plates/home_gym/bodyweight) |
| 4 | Goal (6 options: general_hypertrophy/bodybuilding_volume/strength_hypertrophy/aesthetic_focus/strength_performance/recomp_maintain) |
| 5 | Weak points (up to 3 from WEAK_POINT_MUSCLES list — shown only for qualifying goals) |
| 6 | Recovery rating (poor/average/good); shows nutrition phase banner if `@volyume_nutrition_targets` detected |
| 7 | Generated plan preview: editable name, warnings, "Built around you" summary, "Why this plan?" expandable, workout cards |

- **`handleGenerate`:** reads `@volyume_nutrition_targets` → `getPlanNutritionContext()` → `generatePlan()`.
- **`handleSave(activate)`:** `createProgramme` → for each workout: `createRoutine` + `addExerciseToRoutine` (matches exercise by name, case-insensitive) → optionally `setActivePlan`.
- V-Taper suggestions shown on step 5: `['Side Delts', 'Lats / Back Width', 'Upper Chest', 'Rear Delts']`.

---

### ManualBuilderScreen (`src/screens/ManualBuilderScreen.js`)

2-page flow.

**Page 1:** Plan name (TextInput) + goal selector (5 goals) + days per week (3/4/5/6). Creates programme row and moves to page 2.

**Page 2:** Day cards (editable day name, exercise list with long-press-to-remove, "Add Exercise" button), "Add Day" dashed button, "Save Draft" + "Save & Activate" actions.

- **`ExercisePickerModal`** (embedded): search + create custom exercise (name required, muscle/equipment optional).
- **`persistDays()`:** creates routine per day + `addExerciseToRoutine` for each exercise.
- Success modal with "Stay Here" / "Go to Train" actions.

---

### PlanLibraryScreen (`src/screens/PlanLibraryScreen.js`)

- Horizontal filter chips: All / Beginner / Upper-Lower / PPL / Full Body / Bodybuilding / Aesthetic / Weak Point / Short Sessions.
- Search input (filters by name + description).
- Plan cards: name, description (2 lines), splitType tag, difficulty tag, "Preview Plan" + "Add to My Plans" buttons.
- `handleAddToMyPlans`: `copyPlanFromLibrary` → optional `setActivePlan`.

---

### PlanDetailScreen (`src/screens/PlanDetailScreen.js`)

Shows plan header (name, description, workouts count, est. sets), then workout list.

- **Library mode (`isLibrary=true`):** "Add to My Plans" primary button.
- **User plan + active:** "Deactivate" button.
- **User plan + inactive:** "Set Active" button.
- Workout rows show exercise count + edit + play buttons (non-library).
- MANAGE section: Duplicate Plan / Archive Plan.
- `handleStartWorkout(routine)`: creates workout, loads exercises, starts in store, navigates to ActiveWorkout.

---

### RoutineDetailScreen (`src/screens/RoutineDetailScreen.js`)

FlatList of exercises in a routine. Each row: order badge, exercise name, sets × rep range, rest, starting weight, trash icon to remove.

- "Start This Workout" header button.
- "Add Exercise" footer button → slide-up modal with search.
- Exercises are removed via `removeExerciseFromRoutine(routineExercise.id)`.

---

### BuildWorkoutScreen (`src/screens/BuildWorkoutScreen.js`)

Ad-hoc workout builder (no plan context). "Skip Setup" link → starts blank workout immediately.

- Add exercises from picker (shows top 50, filterable by search).
- Per-exercise controls: sets (stepper 1–20), rep range (two TextInputs), rest (stepper ±15s, 30–600s range), starting weight.
- "Start Training (N)" footer button → `createWorkout` → `startWorkout` → `navigation.replace('ActiveWorkout')`.

---

### ActiveWorkoutScreen (`src/screens/ActiveWorkoutScreen.js`)

Core workout logging screen. Complex; key behaviours:

- **Elapsed timer** from `workoutStartTime`.
- **Exercise tabs:** horizontal scrollable tabs showing exercise name + set count badge. Pressing a tab sets `currentExerciseIndex`.
- **Previous session card:** last session's sets formatted as `weight×reps` via `getPreviousWorkoutSets`.
- **Progression badge:** `getProgressionSuggestion()` result.
- **SetEntry component:** weight + reps inputs with ±2.5kg / ±1 rep steppers, set type picker.
- **Warm-up logic:** first exercise → auto-set type=warmup, weight=50% of prev working weight, reps=min(recommendedRepsMax+4, 20). After warmup logged → auto-switch to straight.
- **COMPLETE SET button → action:**
  1. `createWorkoutSet` in DB
  2. `addSetToCurrentExercise` in store
  3. `detectPR()` using `allTimeSetsRef` + `sessionSetsRef` (refs, not state)
  4. If PR: `showPRCelebration(pr)`
  5. `startRestTimer(restSeconds || 90)`
  6. Auto-advance to next exercise after 1800ms when target sets hit (if not last exercise)
- **FINISH WORKOUT:** `updateWorkout({endedAt, durationMinutes, isCompleted:true, name, setCount, totalVolume})` → `endWorkout()` → `navigation.replace('WorkoutSummary', params)`
- **WorkoutSummary params:** `{workoutId, routineId, durationMinutes, exerciseCount, setCount, workingSetCount, tonnage, exerciseNames[], detectedPRs[], exerciseData[]}`
- **Exercise swap:** `rankSwaps()` excludes exercises already in workout, shows up to 8 candidates.
- **Stale workout modal:** triggered if `lastActivityAt` > 4 hours ago.
- **ExercisePickerModal** (inline): search + create custom exercise.
- **Info modal:** exercise execution notes.
- **Note modal:** per-exercise session notes.
- **Plate Calculator:** accessible from weight field; `PlateCalculator` component.

---

### WorkoutSummaryScreen (`src/screens/WorkoutSummaryScreen.js`)

Can be reached from `ActiveWorkout` (new session) or `WorkoutHistory` (read-only replay).

**Route params:** `workoutId, durationMinutes, exerciseCount, setCount, workingSetCount, tonnage, exerciseNames[], readOnly(false), routineId(null), detectedPRs[], exerciseData[]`

- On mount: `advancePlanNextWorkout` if `routineId` matches active plan routines.
- Stats grid: Exercises / Working Sets / Duration / Total kg.
- Exercise list with sets × rep range summary.
- PR row if `detectedPRs.length > 0`.
- **THIS WEEK AFTER SESSION:** muscle volume status via `calculateWeeklyVolume` + `getVolumeStatus`.
- **RECOMMENDATIONS:** `getAutoRegSuggestion` (shows "Learning your landmarks" if <4 completed workouts).
- **SESSION FEEDBACK (collapsible):** difficulty (0–5), pump (0–3), soreness (0–3), fatigue (0–5), joint discomfort (0–3), notes text. Saved via debounced `updateWorkout` (1000ms).
- "Save as Workout Template" button (non-plan blank sessions only).
- Sticky footer: "Save & Close" + share icon.
- `handleShareCard` → navigate `ShareCard` with `{sessionData, prData}`.

---

### AnalyticsScreen (`src/screens/AnalyticsScreen.js`)

**Tab:** Progress.

- **THIS WEEK stats:** workouts count, working sets, total kg, avg session duration.
- **Deload alert:** shown if `shouldDeload()` returns `deload: true`.
- **Volume Heatmap nav card** → `VolumeHeatmap`.
- **Recent Sessions** (last 3 completed) with date, duration, RPE chip.
- **ANALYSE links grid:** Session History / Personal Records / Volume Heatmap / Body Metrics / Lift Progress (→ ExerciseLibrary).

---

### WorkoutHistoryScreen (`src/screens/WorkoutHistoryScreen.js`)

FlatList of up to 50 completed workouts, newest first.

Each card shows: date, relative time, duration, working set count, exercise names (up to 4), "View Details" → `WorkoutSummary` (readOnly:true) + "Repeat" button.

**"Repeat":** `createWorkout(userId, workout.routineId || null)` → `startWorkout(newWorkout)` → navigate `HomeTab > ActiveWorkout`.

---

### VolumeHeatmapScreen (`src/screens/VolumeHeatmapScreen.js`)

Rolling 7-day window. Shows all 12 muscle groups as bar rows.

- Each row: muscle name (90px width), progress bar (fill % = sets/MRV, clamped to 100%), MEV tick mark, MAV tick mark, set count (colored), /MRV label.
- Colors from `getVolumeStatus()`.
- Custom landmarks stored at `@volyume_landmarks_{userId}` (AsyncStorage).
- **Edit Landmarks mode:** inline TextInputs for MEV/MAV/MRV per muscle.
- `saveLandmarks()` → parses ints → writes to AsyncStorage.
- `resetToDefaults()` → removes AsyncStorage key, restores `VOLUME_LANDMARKS` defaults.

---

### PRWallScreen (`src/screens/PRWallScreen.js`)

Filter tabs: All Time / This Month / This Week.

Loads all `workout_sets` + exercises → groups by exercise name → calculates:
- Best estimated 1RM (`calculate1RM`)
- Heaviest weight lifted

Displays: exercise name, Est. 1RM with date, Heaviest × reps.

Strength standards card: shown only if `bodyWeight` available (currently hardcoded `null`).

`getLevelColor`: Beginner→textMuted, Novice→textSecondary, Intermediate→success, Advanced→primary, Elite→gold.

---

### ExerciseLibraryScreen (`src/screens/ExerciseLibraryScreen.js`)

Search + filter (muscle group, equipment) FlatList of all exercises. Max 100 results shown.

- `lastLogged` per exercise: looks up user's sets, shows weight × reps + days ago.
- "Add Exercise" button → full-screen Modal with name (required), muscle chips, equipment chips.
- Filter bottom sheet Modal.
- When accessed via `route.params.onSelect` (from ActiveWorkout), shows add button on each card.

---

### ExerciseDetailScreen (`src/screens/ExerciseDetailScreen.js`)

Shows for a single exercise:
- Tags: primary muscle, equipment, compound/isolation.
- Secondary muscles list.
- Est. 1RM (best across history).
- SFR / Fatigue Cost / Rep range metadata row.
- HISTORY: last 8 sessions, each showing all sets (weight × reps), est. 1RM per session.
- SUBSTITUTES: top 3 from `getExerciseSubstitutes`, each tappable → `ExerciseDetail` push.
- Execution notes (if `exercise.notes` set).

---

### ShareCardScreen (`src/screens/ShareCardScreen.js`)

**Route params:** `sessionData`, `prData` (both optional).

- Card types: "session" or "pr" (auto-selects based on prData presence).
- Formats: "square" (1:1, 1080×1080) or "story" (9:16, 1080×1920).
- Privacy toggles: showDate, showPlanName, showVolume, showExercises, showPRWeight, showPrevBest.
- Hidden WebView renders HTML5 canvas at full resolution (1080px wide).
- Canvas: gradient background, top accent bar, VolyumeMark (V shape), session/PR content.
- On share: `injectJavaScript` with params → canvas renders → `postMessage` base64 PNG → `expo-file-system` write → `expo-sharing shareAsync`.
- Lazy imports: WebView, FileSystem, Sharing, LinearGradient (try/catch for missing modules).
- Native preview components: `SessionPreview`, `PRPreview` at ~270px width.
- Stats shown: Sets, Duration, Total kg (if `showVolume`), PR count (if `prCount > 0`).

---

### AthleteHubScreen (`src/screens/AthleteHubScreen.js`)

**Tab:** You (ProfileTab root).

- Profile card: avatar initial (from displayName), displayName, trainingFocus + trainingAge, sessions completed count.
- Nutrition Targets card: reads `@volyume_nutrition_targets` from AsyncStorage → shows phase + kcal + macro pills.
- Body Metrics card: reads `@volyume_body_metrics_{userId}` from AsyncStorage → shows latest weight/BF/waist.
- Settings cog → `Settings`.
- About: "Volyume v1.0.0 · Intelligent Hypertrophy Logbook".

---

### SettingsScreen (`src/screens/SettingsScreen.js`)

- **PREFERENCES:** Weight units (kg/lbs dialog), Bar weight (15/20kg dialog), Notifications toggle (UI only — no actual implementation).
- **EXERCISE LIBRARY:** "Browse & manage" → ExerciseLibrary.
- **DATA & PRIVACY:** Export my data (CSV) → Alert "coming soon". Clear workout history → `clearWorkoutHistory()` with confirmation.
- **ACCOUNT:** Sign out (removes `@volyume_local_user_id` + `supabase.signOut()`). Delete account (calls `delete_user_data` RPC on Supabase).
- About: "VOLYUME v1.0.0 · Free during beta · Intelligent Hypertrophy Logbook".

---

### NutritionTargetsScreen (`src/screens/NutritionTargetsScreen.js`)

Saves to AsyncStorage `@volyume_nutrition_targets` (not SQLite).

- **GDPR consent checkbox** required before Calculate button is enabled.
- **Inputs:** sex, age, height (cm), weight (kg), body fat % (optional), BF source (dexa/caliper/bia/visual/none), activity level (5 options), training days per week, goal.
- **Goals:** lean_gain (+10%), build (+17%), maintain (0%), recomp (-5%), mild_cut (-13%), aggressive_cut (-22%).
- **Results display:** hero kcal, macro cards (protein g/kg shown), phase card, confidence card, warnings list, expandable "How was this calculated?" (BMR formula, BMR value, TDEE, phase adjustment, target rate).
- **Recalculate button.**
- Auto-seeds body metrics: if weight entered and no today's entry in `@volyume_body_metrics_{userId}`.
- Disclaimer: "These targets are estimates, not medical advice."

---

### BodyMetricsScreen (`src/screens/BodyMetricsScreen.js`)

Saves to AsyncStorage `@volyume_body_metrics_{userId}`.

- **Nutrition Targets card** at top (reads `@volyume_nutrition_targets`).
- **Latest snapshot card:** body weight (large), delta badge vs previous entry, measurement grid (9 measurements in cm).
- **"Log Body Weight" button** → inline form (date, body weight, 9 measurements, notes).
- **HISTORY** (last 10 entries): date + weight rows.
- `DeltaBadge` component: shows trending-up/down icon + delta value in green/red.
- Measurements tracked: chest, shoulders, arms (flex), forearms, waist, hips, quads, hamstrings, calves.

---

### MesocycleBuilderScreen (`src/screens/MesocycleBuilderScreen.js`)

FlatList of mesocycles. "Create New Mesocycle" button at top.

Each mesocycle card shows: ACTIVE badge (if active), name, date range, focus, week progress dots (active ones only), deload week label.

Create modal: name, start date, end date (strings YYYY-MM-DD), focus, deload week chip selector (Week 3/4/5/6).

Duration calculated via `differenceInWeeks(endDate, startDate)`.

---

### LoginScreen (`src/screens/LoginScreen.js`)

Modes: signin / signup (toggled).

- Email + password with eye toggle.
- Forgot password link.
- "Continue without an account" → `initLocalUser()`.
- Shows previous crash log if `@volyume_crash_log` exists.
- Copy: "Free during beta · No subscription required", "Your data stays on this device..."
- On signup with session: `navigation.replace('Onboarding')`.

---

### OnboardingScreen (`src/screens/OnboardingScreen.js`)

4 steps with progress dots.

| Step | Options |
|---|---|
| Training focus | bodybuilding / hypertrophy / strength_hypertrophy / physique |
| Training age | 1yr / 2yr / 4yr / 6yr values |
| Primary equipment | commercial / home / both |
| Units | kg / lbs |

On complete: `upsertUserProfile` (if not local) → `setUnits` → `navigation.reset` to Login.

---

## 6. Component Library

All components live in `src/components/`.

### SetEntry (`SetEntry.js`)

Props: `value {weight, reps, setType}`, `onChange`, `units`, `onOpenSetTypePicker`

- Weight row: label "Weight (units)", stepper (−2.5 / TextInput / +2.5), decimal pad.
- Reps row: label "Reps", stepper (−1 / TextInput / +1), numeric pad.
- Set type row: compact inline tap → calls `onOpenSetTypePicker`. Shows `SET_TYPE_LABELS` mapping.
- Stepper steppers trigger `Haptics.selectionAsync()`.
- `adjust(field, delta)`: clamps weight 0–500, reps 1–100.
- `testID` values: `volyume-weight-input`, `volyume-reps-input`, `volyume-set-type-btn`.

`SET_TYPE_LABELS`:
```
straight → 'Working'
warmup   → 'Warm-up'
dropset  → 'Drop Set'
superset → 'Working'
myo_reps → 'Working'
rest_pause → 'Working'
amrap    → 'Working'
```

---

### RestTimer (`RestTimer.js`)

Reads from Zustand store: `restTimerActive, restTimerRemaining, restTimerDuration, stopRestTimer, tickRestTimer, addRestTime`.

- Animated progress bar (Animated.timing from 1→0 over `restTimerDuration * 1000ms`).
- Time display: `M:SS` format; switches to large countdown number at ≤3 seconds.
- Color switches to warning (`#FFC107`) when ≤10 seconds remain.
- Haptics: heavy impact at 3/2/1 seconds; `notificationAsync(Warning)` + double heavy at 0.
- "Done" state: shows "Start next set" with success icon for 3 seconds.
- Adjustment buttons: −30s / −15s / +15s / +30s (clamped: never drops below 5 seconds remaining).
- Component returns `null` when `!restTimerActive && restTimerRemaining === 0 && !showDone`.

---

### BrandMark / VolyumeMark (`BrandMark.js`)

Exports: `VolyumeMark` (default), `VolyumeWordmark`, `BrandTag`.

**VolyumeMark:** SVG V shape. ViewBox `0 0 28 24`.
- Left arm: `M2 2 L14 22` — white/textPrimary, strokeWidth 3.2, rounded caps.
- Right arm: `M14 22 L26 2` — white/textPrimary, strokeWidth 3.2.
- Cyan accent: `M16.5 22 L26 6` — primary color, strokeWidth 1.8, opacity 0.85 (shorter line inside right arm).
- Fallback (no react-native-svg): text "V" + colored accent bar.

**VolyumeWordmark:** VolyumeMark + "VOLYUME" text (letterSpacing 2, fontWeight black).

**BrandTag:** VolyumeMark sized to match cap-height + "olyume" text flush together as a logotype (the V mark IS the "V" in "Volyume").

---

### PRCelebration (`PRCelebration.js`)

Props: `pr { type, label }`, `onDismiss`

Full-screen overlay triggered by Zustand `prCelebration` state.

- 40 particles emitted from screen center in all directions via `Animated.spring`.
- Particle colors cycle: `primary (#00E5FF)`, `gold (#FFD700)`, `success (#4CAF50)`, `#FF6B35`, `#9C27B0`.
- Overlay fades to `opacity: 0.85` black.
- Card springs in from scale 0.5 to 1.0.
- Haptics: `notificationAsync(Success)` + two heavy impacts at 150ms / 300ms.
- Auto-dismisses after 3000ms. Tap anywhere to dismiss.
- PR type icons: `1rm_estimate` → trophy, `heaviest_weight` → barbell, `most_reps_at_weight` → flash.
- PR labels: "New Estimated 1RM" / "New Heaviest Weight" / "Most Reps at Weight".

---

### ExerciseCard (`ExerciseCard.js`)

Props: `exercise`, `onPress`, `onAdd`, `lastLogged {weight, reps, daysAgo}`, `units`, `showAddButton`

- Exercise name (bold, truncated 1 line).
- Tags: primary muscle (primaryBg), equipment (surface2), Custom (primaryBg, if `isCustom`).
- `lastLogged` row: "Last: Xkg × Y reps · Zd ago".
- Add button (circular, primaryBg) + chevron-forward icon.
- Handles both camelCase (`primaryMuscle`) and snake_case (`primary_muscle`) field names.

---

### VolumeBars (`VolumeBars.js`)

Props: `weeklyVolume {}`, `customLandmarks null`

Simplified version of the VolumeHeatmap rows (no MRV label, no editing). Used in WorkoutSummaryScreen.

- All 12 muscles from `VOLUME_LANDMARKS` keys.
- Per muscle: name (90px), bar track (fill + MEV/MAV tick marks), set count.
- Colors from `getVolumeStatus()`.

---

### PlateCalculator (`PlateCalculator.js`)

Props: `targetWeight`, `onClose`

Modal-style component (not Modal itself — caller wraps it).

- Reads `barWeight` and `units` from Zustand store.
- Two inputs: target weight + bar weight.
- `calculatePlates(targetWeight, barNum)` from algorithms.
- Visual bar diagram: bar stub + plates in color-coded blocks (25→red, 20→blue, 15→yellow, 10→green, 5→white, 2.5→gray, 1.25→light gray).
- Text list: "X kg × N total (each side: M)".
- Total and "Each side" shown in header.

---

## 7. Algorithms and Calculations

**File:** `src/lib/algorithms.js`

### 1. calculateWeeklyVolume(sets, exerciseMap)

Groups sets by primary and secondary muscles.
- Primary muscle: +1.0 working set contribution per non-warmup set.
- Secondary muscles: +0.5 contribution per non-warmup set.
- Returns: `{ [muscle]: { workingSets, reps, tonnage } }`.

### 2. getProgressionSuggestion(lastSets, targetRepsMin, targetRepsMax, units)

Double progression logic:
- If all sets hit top of rep range → suggest weight increase.
- Weight increment threshold: weight ≥ 60kg → 2.5kg; otherwise 1.25kg.
- Returns a suggestion string or null.

### 3. detectPR(newSet, historicalSets, exercise, units)

Checks 3 PR types:
- `1rm_estimate`: new 1RM estimate > best historical × 1.001
- `heaviest_weight`: new weight > all previous weights
- `most_reps_at_weight`: new reps at same weight > historical reps at that weight

Returns `{ type, label, exerciseName }` or null.

### 4. calculate1RM(weight, reps)

Epley + Brzycki ensemble:
- reps ≤ 10: 60% Epley + 40% Brzycki
- reps > 20: Brzycki only
- Otherwise: simple average of Epley and Brzycki
- Epley: `weight * (1 + reps / 30)`
- Brzycki: `weight / (1.0278 - 0.0278 * reps)`

### 5. getVolumeStatus(workingSets, muscle, customLandmarks)

Returns `{ status, color, label, landmarks }`.

| Status | Condition | Color |
|---|---|---|
| `below` | sets < MEV | `#616161` (textMuted) |
| `minimum` | sets == MEV | `#FFB300` |
| `optimal` | MEV < sets ≤ MAV | `#00C853` |
| `near_mrv` | MAV < sets < MRV | `#FFB300` |
| `over_mrv` | sets ≥ MRV | `#FF3D00` |

Uses `customLandmarks` if provided (from AsyncStorage), else `VOLUME_LANDMARKS` defaults.

### 6. getAutoRegSuggestion(workoutFeedback, weeklyVolumeByMuscle, customLandmarks)

Takes `workoutFeedback { sessionDifficulty, overallPump, soreness24hBefore, fatiguLevel, jointDiscomfort }`.

Returns a string recommendation based on difficulty (high/low), volume status, and fatigue markers. Returns "Learning your landmarks" message if insufficient data.

### 7. shouldDeload(last4WeeksData)

Input: array of 4 objects `{ avgReps, avgSoreness, hasOverMRV, weeksSinceLastDeload }`.

Checks:
- Rep decline across consecutive weeks
- Sustained elevated soreness (≥3 for multiple weeks)
- `weeksSinceLastDeload` threshold exceeded
- `hasOverMRV` flag (in current usage this is hardcoded `false`)

Returns `{ deload: boolean, reasons: string[] }`.

### 8. getExerciseSubstitutes(targetExercise, allExercises, userEquipment)

Scores all exercises vs target: same primary muscle (+40), same movement pattern (+20), same equipment (+15), same compound/isolation (+10), similar fatigueCost ±1 (+10), similar SFR ±1 (+10). Max score 105.

Filters out: same exercise, no equipment match if `userEquipment` specified. Returns top 3, sorted by SFR desc then fatigue asc.

### 9. calculateTonnage(sets)

Sum of `weight × actualReps` for all non-warmup sets.

### 10. getProgressionPath(thisWeekSets, lastWeekSets, units)

Week-over-week rep comparison per exercise. Returns change indicators.

### 11. calculatePlates(targetWeight, barWeight, availablePlates)

Greedy algorithm: subtracts bar weight, then divides by 2 for each side. Iterates available plates `[25, 20, 15, 10, 5, 2.5, 1.25]` largest first.

Returns `{ plates (array per side), totalWeight, sideWeight }`.

### 12. STRENGTH_STANDARDS

For bench press, squat, deadlift — 5 levels each (Beginner, Novice, Intermediate, Advanced, Elite) as bodyweight multipliers. `getStrengthStandard(lift, estimated1RM, bodyWeight)` returns level and color.

---

## 8. Volume Landmarks System

**File:** `src/lib/algorithms.js` — `VOLUME_LANDMARKS` constant  
**Customization stored at:** AsyncStorage `@volyume_landmarks_{userId}`

### Default Landmarks (sets per week)

| Muscle | MEV | MAV | MRV |
|---|---|---|---|
| chest | 8 | 12 | 22 |
| back | 10 | 14 | 25 |
| shoulders | 8 | 16 | 26 |
| biceps | 8 | 12 | 26 |
| triceps | 8 | 12 | 26 |
| forearms | 4 | 8 | 20 |
| quads | 8 | 12 | 20 |
| hamstrings | 6 | 10 | 20 |
| glutes | 4 | 8 | 16 |
| calves | 8 | 12 | 20 |
| abs | 6 | 12 | 25 |
| traps | 4 | 8 | 20 |

MEV = Minimum Effective Volume. MAV = Maximum Adaptive Volume. MRV = Maximum Recoverable Volume.

### MUSCLE_DISPLAY_NAMES

Maps internal keys to display strings:
```
chest → Chest, back → Back, shoulders → Shoulders, biceps → Biceps,
triceps → Triceps, forearms → Forearms, quads → Quads,
hamstrings → Hamstrings, glutes → Glutes, calves → Calves,
abs → Abs, traps → Traps
```

### Volume Status Display Pipeline

1. `calculateWeeklyVolume(recentSets, exerciseMap)` → muscle volume map
2. `getVolumeStatus(sets, muscle, customLandmarks)` → `{color, status, label, landmarks}`
3. Bar fill: `Math.min(sets / mrv, 1) * 100%`
4. Tick marks at `(mev/mrv)*100%` and `(mav/mrv)*100%`

---

## 9. Exercise Data Model

**File:** `src/lib/seedExercises.js`  
**AsyncStorage key:** `@volyume_exercises_seeded_v3`  
**Count:** 200+ exercises seeded as a raw array.

### Exercise Seed Format

Each exercise is a tuple:
```
[name, primaryMuscle, secondaryMuscles[], equipment, movementPattern, isCompound(bool), minReps, maxReps, fatigueCost(1-5), sfr(1-5)]
```

### Movement Patterns Used

`horizontal_push`, `vertical_push`, `horizontal_pull`, `vertical_pull`, `squat`, `hinge`, `lunge`, `isolation_curl`, `isolation_extension`, `isolation_lateral`, `isolation_fly`, `isolation_raise`, `core_stability`, `carry`, `hip_thrust`

### Equipment Types Used

`Barbell`, `Dumbbell`, `Cable`, `Machine`, `Bodyweight`, `Smith Machine`, `Bands`, `EZ Bar`, `Kettlebell`, `Plate`, `Hammer Strength`, `Other`

### Muscle Groups Covered

chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, traps, forearms

### Custom Exercises

Users can create exercises via:
- `ExerciseLibraryScreen` modal
- `ActiveWorkoutScreen` ExercisePickerModal
- `ManualBuilderScreen` ExercisePickerModal

Custom exercises: `is_custom=1`, optional `primaryMuscle` and `equipment`, no SFR/fatigueCost (defaulted to 3).

### Library Seed Routine

**File:** `src/lib/seedRoutines.js`  
**AsyncStorage key:** `@volyume_routines_seeded_v3`

Seeds one programme: "Aesthetic Upper Rotation" (`is_library=1`) with 2 routines:
1. "Day 1 — Width, Rear Delts and Back Detail" (8 exercises)
2. "Day 2 — Upper Chest, Lateral Delts and Shoulder Refinement" (7 exercises)

Requires and inserts 11 exercises (Hammer Strength machines, cable variations) if not present.

---

## 10. Workout Session Flow

### 1. Starting a Workout

**From HomeScreen (active plan):**
```
getRoutinesForPlan(planId)
  → routines[(nextWorkoutIndex % count)]
  → createWorkout(userId, routineId)
  → getRoutineExercisesWithDetails(routineId)
  → startWorkout(workout, initialExercises) [Zustand]
  → navigate('ActiveWorkout')
```

**From BuildWorkoutScreen (ad-hoc):**
```
createWorkout(userId)                    ← no routineId
startWorkout(workout, initialExercises)  ← initialExercises built from user selections
navigate('ActiveWorkout')
```

**From WorkoutHistory (repeat):**
```
createWorkout(userId, workout.routineId || null)
startWorkout(newWorkout, [])   ← no pre-loaded exercises
navigate('HomeTab > ActiveWorkout')
```

### 2. Logging a Set

In `ActiveWorkoutScreen.handleCompleteSet()`:

```
1. Validate: weight > 0 OR reps > 0 required
2. createWorkoutSet({
     userId, workoutId, exerciseId,
     setNumber: (logged sets count) + 1,
     setType, weight, actualReps: reps,
     targetRepsMin, targetRepsMax
   })
3. addSetToCurrentExercise(setData)  ← updates Zustand
4. detectPR(newSet, allTimeSets + sessionSets, exercise, units)
5. If PR → showPRCelebration(pr)
6. startRestTimer(routineExercise.restSeconds || 90)
7. If target sets reached && not last exercise:
     setTimeout(→ setCurrentExerciseIndex(next), 1800)
```

### 3. Rest Timer Lifecycle

```
startRestTimer(duration) → restTimerActive=true
↓
RestTimer component starts Animated.timing (1→0 over duration*1000ms)
+ setInterval(tickRestTimer, 1000)
↓
At ≤10s: color → warning
At ≤3s: show countdown number + heavy haptic per second
At 0s: notificationAsync(Warning) + double heavy haptic + show "Start next set" for 3s
↓
stopRestTimer() OR new set logged → clear timer
```

### 4. Finishing a Workout

`handleFinishWorkout()`:

```
1. Calculate durationMinutes = (Date.now() - workoutStartTime) / 60000
2. Calculate tonnage, setCount, workingSetCount, exerciseNames
3. updateWorkout(workoutId, {
     endedAt, durationMinutes, isCompleted: true,
     name: exerciseNames[0] || 'Session',
     setCount, totalVolume: tonnage
   })
4. endWorkout()  ← clears Zustand active workout state
5. navigation.replace('WorkoutSummary', {
     workoutId, routineId, durationMinutes,
     exerciseCount, setCount, workingSetCount,
     tonnage, exerciseNames, detectedPRs, exerciseData
   })
```

### 5. Post-Workout Flow

`WorkoutSummaryScreen`:

```
1. advancePlanNextWorkout(planId, routineCount)  ← increments rotation index
2. Display stats + PRs + volume status + recommendations
3. SESSION FEEDBACK saved via debounced updateWorkout (1000ms)
4. "Save & Close" → navigate back to HomeTab
5. Share icon → navigate ShareCard
```

---

## 11. Plan Generation (CoachBuilder / planEngine)

**File:** `src/lib/planEngine.js`

### generatePlan(inputs)

Pure function. No Math.random(). Deterministic.

**Inputs:**
```
experience: 'beginner' | 'intermediate' | 'advanced' | 'competitive'
trainingAge: number (years)
daysPerWeek: number (default: 4)
sessionLengthMinutes: number (default: 60)
equipment: string
goal: string
weakPoints: string[] (up to 3)
recoveryRating: 'poor' | 'average' | 'good'
nutritionPhase: string | null
nutritionContext: object | null (from getPlanNutritionContext())
```

### Volume Calculations

**BASE_VOLUME per muscle (working sets/week):**
```
beginner:     4–8
intermediate: 8–12
advanced:     10–16
competitive:  12–18
```

**NUTRITION_VOLUME_MOD multipliers:**
```
lean_gain / build:       1.10
maintain / recomp:       1.00
mild_cut:                0.85
aggressive_cut:          0.75
```

**PER_EX_CAP (max sets per exercise per session):**
```
beginner: 2, intermediate: 3, advanced: 4, competitive: 5
```

**SESSION_MAX_SETS:**
```
beginner: 14, intermediate: 20, advanced: 25, competitive: 30
```

### Exercise Parameters by Type

| Type | repMin | repMax | restSec |
|---|---|---|---|
| compound | 5 | 10 | 150 |
| compound_strength | 5 | 8 | 180 |
| machine | 8 | 12 | 105 |
| isolation | 10 | 20 | 75 |

### Split Selection

| Days | Experience | Split |
|---|---|---|
| 3 | beginner/intermediate | full_body |
| 3 | advanced/competitive | ppl |
| 4 | all | upper_lower |
| 5 | beginner/intermediate | ppl |
| 5 | advanced/competitive | upper_lower_wp |
| 6 | all | ppl_ab |

Beginners requesting >4 days are capped to 4 (generates a warning).

### Session Time Estimation

```
estimateWorkoutSeconds():
  5min warmup
  + 30s transitions per exercise
  + exerciseBlockSeconds per exercise

exerciseBlockSeconds:
  setup + warmupExtra + sets*(work+rest) - trailing rest

setWorkSeconds = (repMin + repMax) / 2 * 3.5s

exerciseSetupSeconds:
  compound → 120s, machine → 60s, isolation → 40s
```

### Special Passes

- **deduplicateExercises():** removes duplicate exercise names within a session.
- **capSessionVolume():** Phase 1: reduce sets back-to-front to minimum 3. Phase 2: drop exercises from back if still over `SESSION_MAX_SETS`.
- **fitToSessionLength():** same two-phase approach for time budget.
- **applyVTaperBias():** if aesthetic goal, injects lateral raise + rear delt fly if missing.
- **applyStrengthNotes():** adds progression notes to low-rep compounds.

### Output Shape

```
{
  name: string,
  goal: string,
  splitType: string,
  daysPerWeek: number,
  estimatedSessionMinutes: number,
  workouts: [
    {
      name: string,         // e.g. "Upper A", "Push", "Full Body"
      exercises: [
        {
          exerciseName: string,
          primaryMuscle: string,
          sets: number,
          repMin: number,
          repMax: number,
          restSeconds: number,
          notes: string | null,
        }
      ]
    }
  ],
  weeklyVolumeSummary: { [muscle]: number },
  personalisationSummary: string,
  whyThis: {
    schedule: string,
    volume: string,
    splits: string,
    progression: string,
    weakPoints?: string,    // conditional
    goalChoices?: string,   // conditional
    nutritionImpact?: string, // conditional
    recoveryNote?: string,  // conditional
  },
  warnings: string[],
  nutritionContext: object | null,
}
```

### swapEngine (`src/lib/swapEngine.js`)

`rankSwaps(originalExercise, allExercises, options)`:

Scoring:
- Same primary muscle: +40
- Same movement pattern: +20
- Same equipment: +15
- Same compound/isolation: +10
- Similar fatigueCost ±1: +10
- Similar SFR ±1: +10

`buildSwapReason()`: returns ≤20 word plain English explanation.

`numResults` default: 5. Excludes original + `excludeIds`. Optional equipment filter.

### nutritionEngine (`src/lib/nutritionEngine.js`)

`calculateNutritionTargets(inputs)`:

**BMR:**
- Mifflin-St Jeor (no BF): male: `10W + 6.25H - 5A + 5`; female: `10W + 6.25H - 5A - 161`
- Katch-McArdle (with credible BF): `370 + 21.6 * LBM`

**Activity multipliers:** sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9

**Safety floors:** male ≥ 1500 kcal, female ≥ 1200 kcal. Hard gate: max loss rate 1.5% BW/week. Warning at 0.8%.

**Protein:** 1.8–2.2 g/kg by goal; aggressive_cut/contest_prep with credible LBM → 2.5 × LBM.

**Fat:** `max(0.25 * targetKcal / 9, 0.5 * weightKg, 30g)`

**Confidence levels:** dexa/caliper → high, bia → medium, visual → low, none → medium.

`getPlanNutritionContext(targets)`: returns `{ phaseType, recoveryModifier(0.75–1.15), volumeCeiling, failureExposureLevel, deloadFrequencyWeeks(4–6), explanation }`.

---

## 12. Theme and Design System

**File:** `src/styles/theme.js`

### Colors

| Token | Value | Usage |
|---|---|---|
| `background` | `#0D0D0D` | App background, always dark |
| `surface` | `#1A1A1A` | Cards, modals |
| `surface2` | `#242424` | Input backgrounds, secondary surfaces |
| `surface3` | `#2E2E2E` | Bar tracks, dividers |
| `border` | `#333333` | Standard borders |
| `borderLight` | `#404040` | Lighter borders |
| `primary` | `#00E5FF` | Accent cyan — CTAs, highlights |
| `primaryDim` | `#0097A7` | Dimmed primary |
| `primaryBg` | `rgba(0,229,255,0.10)` | Primary tinted backgrounds |
| `success` | `#4CAF50` | Optimal volume, positive states |
| `warning` | `#FFC107` | Deload alerts, near-MRV, almost done timer |
| `error` | `#F44336` | Over MRV, errors, destructive |
| `warningBg` | (derived) | Deload alert background |
| `successBg` | (derived) | Timer done background |
| `textPrimary` | `#FFFFFF` | Main text |
| `textSecondary` | `#9E9E9E` | Secondary text, labels |
| `textMuted` | `#616161` | Hints, placeholders, below-MEV |
| `textDisabled` | `#424242` | Disabled state |
| `tabBar` | `#111111` | Tab bar background |
| `tabBarBorder` | `#222222` | Tab bar top border |
| `inputBg` | `#1E1E1E` | Text input backgrounds |
| `gold` | `#FFD700` | PR celebration, Elite level |
| `silver` | `#C0C0C0` | Second-place metals |
| `bronze` | `#CD7F32` | Third-place metals |
| `chartLine` | `#00E5FF` | Chart line color |
| `chartFill` | `rgba(0,229,255,0.08)` | Chart fill area |

### Spacing

```
xs:4, sm:8, md:12, lg:16, xl:24, xxl:32, xxxl:48
```

### Border Radius

```
sm:6, md:10, lg:14, xl:20, full:999
```

### Font Sizes

```
xs:11, sm:13, md:15, lg:17, xl:20, xxl:24, xxxl:32, display:40
```

### Font Weights

```
regular:'400', medium:'500', semibold:'600', bold:'700', heavy:'800', black:'900'
```

### Volume Colors (theme alias)

```
below: textMuted (#616161)
optimal: success (#4CAF50)
overMav: warning (#FFC107)
overMrv: error (#F44336)
```

### Shadow Presets

Three presets: `shadow.sm`, `shadow.md`, `shadow.lg` — platform-specific (elevation on Android, shadow* on iOS).

### Hit Slop

Standard: `{ top: 12, bottom: 12, left: 12, right: 12 }` — applied to small touch targets.

### Naming Conventions

All section titles use: `fontSize.xs`, `fontWeight.black`, `colors.textMuted`, `letterSpacing: 1.5`, uppercase text.

Card pattern: `backgroundColor: colors.surface`, `borderRadius: radius.lg`, `padding: spacing.lg`, `borderWidth: 1`, `borderColor: colors.border`.

---

## 13. Authentication and User Flow

**File:** `src/lib/supabase.js`

### Supabase Client

Lazy singleton via `getSupabaseClient()`. Returns `null` if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars are missing.

`isSupabaseConfigured()`: boolean check — app functions fully without Supabase.

Session persistence: AsyncStorage (Supabase native React Native adapter).

### Auth Functions

```
getCurrentUser()        → null if unconfigured
signInWithEmail(email, password)
signUpWithEmail(email, password)
signOut()
resetPassword(email)
```

### Cloud Profile

```
upsertUserProfile(userId, profile) → users_profile table
getUserProfile(userId)
```

### Local User Flow (current active path)

1. `initLocalUser()` in Zustand store:
   - Reads `@volyume_local_user_id` from AsyncStorage
   - If absent: generates UUID via `generateUUID()`, writes to AsyncStorage
   - Sets `user = { id: uuid, isLocal: true }`
2. All DB operations use this `user.id` as `user_id` in SQLite.
3. Auth gate in `RootNavigator` is bypassed — users go directly to main tabs.

### Sign-out Flow

`SettingsScreen`:
1. `AsyncStorage.removeItem('@volyume_local_user_id')`
2. `supabase.signOut()` (if configured)
3. `setUser(null)` in store
4. Navigate to `LoginScreen`

### Delete Account Flow

Calls Supabase RPC `delete_user_data` (server-side). Falls back gracefully if Supabase unconfigured.

---

## 14. Data Flows Between Screens

### Flow: Start Next Workout (Home/Plans → ActiveWorkout)

```
HomeScreen or PlansScreen
  → getActivePlan(userId)
  → getRoutinesForPlan(planId)
  → routine = routines[nextWorkoutIndex % count]
  → createWorkout(userId, routineId)           [SQLite INSERT]
  → getRoutineExercisesWithDetails(routineId)  [SQLite JOIN]
  → startWorkout(workout, exercises)           [Zustand]
  → navigate('ActiveWorkout')

ActiveWorkoutScreen
  → reads workoutExercises from Zustand store
  → per set: createWorkoutSet(...)             [SQLite INSERT]
  → addSetToCurrentExercise(...)               [Zustand]
  → on finish: updateWorkout(...)              [SQLite UPDATE]
  → endWorkout()                               [Zustand]
  → navigate('WorkoutSummary', params)

WorkoutSummaryScreen
  → advancePlanNextWorkout(planId, count)      [SQLite UPDATE next_workout_index]
  → displayStats (from route.params)
  → SESSION FEEDBACK → updateWorkout(...)      [SQLite UPDATE, debounced 1s]
```

### Flow: Volume Heatmap

```
Any screen needing volume data:
  getAllWorkoutSets(userId)         [SQLite]
  → filter to rolling 7 days
  getAllExercises()                 [SQLite]
  → exerciseMap = { id: exercise }
  calculateWeeklyVolume(sets, exerciseMap)     [algorithms.js]
  → weeklyVolume = { muscle: { workingSets, reps, tonnage } }
  AsyncStorage.getItem('@volyume_landmarks_{userId}')
  → customLandmarks (or null)
  getVolumeStatus(sets, muscle, customLandmarks)  [algorithms.js]
  → { color, status, label, landmarks }
  → Render VolumeBars or VolumeHeatmapScreen rows
```

### Flow: PR Detection

```
ActiveWorkoutScreen mounts:
  getAllCompletedSetsForExercise(exerciseId, userId)  → allTimeSetsRef
  
Per set logged:
  sessionSetsRef.current[exerciseId].push(newSet)
  detectPR(newSet, [...allTimeSets, ...sessionSets], exercise, units)
  → if PR: showPRCelebration(pr)  [Zustand]

App.js:
  prCelebration from useAppStore()
  → render <PRCelebration pr={prCelebration} onDismiss={hidePRCelebration} />
```

### Flow: Coach Builder → Save Plan

```
CoachBuilderScreen (step 7 handleSave):
  createProgramme(userId, name, goal, 0)            [SQLite INSERT programmes]
  → programmeId
  for each workout in generatedPlan.workouts:
    createRoutine(userId, workout.name, ..., programmeId)  [SQLite INSERT routines]
    → routineId
    for each exercise in workout.exercises:
      find matching exercise by name (case-insensitive) from DB
      addExerciseToRoutine(routineId, exerciseId, ...)     [SQLite INSERT routine_exercises]
  if activate:
    setActivePlan(userId, programmeId)              [SQLite UPDATE programmes]
```

### Flow: Nutrition → Plan Generation

```
NutritionTargetsScreen:
  calculateNutritionTargets(inputs)         [nutritionEngine.js]
  → targets { targetKcal, proteinG, carbsG, fatG, phase, ... }
  AsyncStorage.setItem('@volyume_nutrition_targets', JSON.stringify(targets))

CoachBuilderScreen (step 6 / handleGenerate):
  AsyncStorage.getItem('@volyume_nutrition_targets')
  → getPlanNutritionContext(targets)         [nutritionEngine.js]
  → { phaseType, recoveryModifier, volumeCeiling, ... }
  generatePlan({ ...inputs, nutritionPhase, nutritionContext })  [planEngine.js]
  → accounts for volume ceiling and recovery modifier in plan
```

### Flow: Body Metrics

```
NutritionTargetsScreen:
  If weight entered and no today entry:
    AsyncStorage.getItem('@volyume_body_metrics_{userId}')
    → auto-insert today's weight entry if absent
    AsyncStorage.setItem('@volyume_body_metrics_{userId}', ...)

BodyMetricsScreen:
  AsyncStorage.getItem('@volyume_body_metrics_{userId}')
  → show history, latest snapshot, delta badges
  On save: prepend to array, setItem

AthleteHubScreen:
  AsyncStorage.getItem('@volyume_body_metrics_{userId}')
  → show summary card (latest entry)
```

### Flow: AsyncStorage Keys Reference

| Key | Owner | Contents |
|---|---|---|
| `@volyume_local_user_id` | RootNavigator / Zustand | UUID string |
| `@volyume_exercises_seeded_v3` | seedExercises.js | `"true"` flag |
| `@volyume_routines_seeded_v3` | seedRoutines.js | `"true"` flag |
| `@volyume_nutrition_targets` | NutritionTargetsScreen | JSON: full targets object |
| `@volyume_landmarks_{userId}` | VolumeHeatmapScreen | JSON: `{ [muscle]: {mev,mav,mrv} }` |
| `@volyume_body_metrics_{userId}` | BodyMetricsScreen | JSON: array of metric entries |
| `@volyume_crash_log` | App.js ErrorBoundary | Last crash info string |

---

## 15. Known Gaps and Stage Notes

This section documents areas where the implementation is in an early "Stage 1" state or has known limitations.

### Authentication
- **Auth gate disabled.** The Login/Onboarding screens exist and work, but `RootNavigator` bypasses them. All users are currently local users only.
- **Supabase sync not active.** Cloud upsert functions exist (`upsertUserProfile`, `saveNutritionTargets` via Supabase path) but the SQLite path is used instead for nutrition targets.

### Data Storage Inconsistencies
- **Nutrition targets:** calculated and stored in AsyncStorage (`@volyume_nutrition_targets`), not in the `nutrition_targets` SQLite table. The SQLite table exists but is not the primary read path in screens.
- **Body metrics:** stored in AsyncStorage (`@volyume_body_metrics_{userId}`), not in the `body_metric_log` SQLite table. The SQLite table and `logBodyMetric()` function exist but are unused by `BodyMetricsScreen`.
- **User body profile:** `user_body_profile` table and `saveUserBodyProfile()` exist but the Onboarding screen uses `upsertUserProfile` (Supabase path only for non-local users), so local users have no profile saved to SQLite.

### PR Wall — Strength Standards
- Body weight is hardcoded as `null` in `PRWallScreen`, so the strength standards card never appears even if a user has logged body metrics.

### Deload Detection
- `shouldDeload()` in `AnalyticsScreen` sets `hasOverMRV: false` hardcoded. The actual volume data could compute this, but doesn't.

### Export
- "Export my data (CSV)" in `SettingsScreen` shows Alert "coming soon" — not implemented.

### Notifications
- Toggle exists in `SettingsScreen` but has no backend implementation.

### Mesocycles
- `mesocycles` table and `MesocycleBuilderScreen` exist. However, the `mesocycle_id` foreign key on `workouts` is never populated in the create-workout flows. Mesocycles are purely informational display objects currently.

### RoutinesScreen / ProgrammesScreen
- Files exist at `src/screens/RoutinesScreen.js` and `src/screens/ProgrammesScreen.js` but are not registered in `RootNavigator`. These appear to be older/legacy screens superseded by `PlansScreen` + `PlanDetailScreen`.

### RoutineBuilderScreen
- `src/screens/RoutineBuilderScreen.js` exists but is not registered in `RootNavigator`. `RoutineDetailScreen` serves the edit function instead.

### Exercise History Chart
- `ExerciseDetailScreen` shows set history as text cards per session. No chart/graph is rendered despite `react-native-svg` being available.

### Plan Library Content
- The plan library (is_library plans) is seeded via `seedRoutines.js` with only the "Aesthetic Upper Rotation" plan. The `PlanLibraryScreen` UI is built for browsing many plans, but content is sparse.

### Workout Templates
- `createWorkoutTemplateFromWorkout()` exists and is called from `WorkoutSummaryScreen`. However, there is a condition that limits it to "non-plan blank sessions" — sessions from a plan do not offer the template save option.

### GDPR Consent
- Body/nutrition screens have consent checkboxes. However, the `gdpr_consented` field in `nutrition_targets` and `user_body_profile` is only written when going through the SQLite path, which isn't the primary path. Consent state in AsyncStorage is not separately tracked.

---

*End of Volyume Technical Architecture Map.*
