# Volyume — Complete Technical Architecture Map

> **Reconciled against `main` on 2026-06-26** · app version 1.2.0 (iOS build 7,
> Android versionCode 14). This document describes the Volyume React Native
> (Expo) app so an AI assistant can understand its architecture, data model,
> business logic, and screens. The front matter and structural sections below
> are current; some deep algorithm/column detail in the later numbered
> sections predates the June sprint — where it disagrees with §0 (Current
> State) or `INFRASTRUCTURE.md`, those win.

## 0. Current State (2026-06-26) — read this first

The app has grown well beyond the original "hypertrophy logbook". The major
facts that supersede older detail in the numbered sections:

- **5 bottom tabs, 77 screens** (not 4 tabs / ~26 screens). Tabs:
  **Train · Plans · Diary · Progress · You**. The **Diary** tab and most
  coaching/nutrition surfaces are **Pro-gated** via `withProGuard`. See
  `APPMAP.md` for the authoritative nav tree + screen inventory.
- **Real Supabase account required** — the anonymous/local-UUID user mode is
  removed (`RootNavigator.js` forbids LOCAL_USER restore per
  `IDENTITY_AND_OWNERSHIP_LOCKED.md`).
- **Two tiers, Free / Pro**, source of truth `src/lib/proGate.js`
  (`PRO_BETA_ACTIVE = false` — entitlement is real, driven by native store
  purchases). Billing is `react-native-iap` (Play Billing + StoreKit2);
  products `pro_monthly` / `pro_annual`.
- **Local DB is SQLCipher-encrypted** `expo-sqlite` (key in
  `expo-secure-store`, `src/lib/dbCrypto.js`), ~47 tables, schema v23.
- **Sync layer `src/lib/sync/`** (registry-driven, watermark incremental
  pull, conflict strategies) syncs to Supabase (EU Dublin), ~88 migrations.
- **Precision Coaching engine + ED safety live in `src/lib/`** (NOT
  `src/coaching/` — that directory does not exist). Deterministic, no LLM,
  no `Math.random` in any decision path. Safety is **tier-blind**.
- **New domains since v2.0.0:** food diary + meal planning + barcode/label
  scanning, cardio (log + passive Health import), Apple Health / Health
  Connect, training partners, Year-of-Lifts recap, Great-Week share card,
  differential paywall + day-21 trial cascade.
- **Removed screens** (do not reference): `CoachBuilderScreen`,
  `OnboardingQuizScreen`/`OnboardingScreen`, `PRWallScreen`
  (→ `LiftProgressScreen`), `ExerciseLibraryScreen` (→ `ExerciseDetailScreen`
  only), `AthleteHubScreen` (→ `YouScreen`), `PeakWeekScreen` (peak-week
  engine removed; `migrate_049` dropped `peak_week_plans`).

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Navigation Structure](#2-navigation-structure)
3. [Database Schema](#3-database-schema)
4. [Global State (Zustand Store)](#4-global-state-zustand-store)
5. [Screen Inventory](#5-screen-inventory)
6. [Component Library](#6-component-library)
7. [Algorithms and Calculations](#7-algorithms-and-calculations)
8. [Intelligence Engines](#8-intelligence-engines)
9. [Volume Landmarks System](#9-volume-landmarks-system)
10. [Exercise Data Model](#10-exercise-data-model)
11. [Workout Session Flow](#11-workout-session-flow)
12. [Plan Generation (planEngine / planAutoGen)](#12-plan-generation-planengine--planautogen)
13. [Theme and Design System](#13-theme-and-design-system)
14. [Authentication and User Flow](#14-authentication-and-user-flow)
15. [Data Flows Between Screens](#15-data-flows-between-screens)
16. [AsyncStorage Keys Reference](#16-asyncstorage-keys-reference)
17. [Known Gaps and Stage Notes](#17-known-gaps-and-stage-notes)

---

## 1. App Overview

**App name:** Volyume
**Slug:** volyume
**Version:** 1.2.0 (iOS build 7, Android versionCode 14)
**Bundle IDs:** app.volyume (iOS and Android)
**EAS project:** `2f60a6ed-8b37-4cd6-8057-60ee04e39ea8` (owner/slug `volyume`)

### Tech Stack (current — see `INFRASTRUCTURE.md` §1 for the authoritative table)

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + React 19.1.0 with Expo SDK ~54 (managed; New Architecture on) |
| State management | Zustand ^4.5 (manual AsyncStorage persistence) |
| Local database | expo-sqlite (SQLCipher-encrypted, `useSQLCipher`), WAL, single file; v23 |
| DB key | expo-secure-store (256-bit per-device key, `src/lib/dbCrypto.js`) |
| Cloud backend | Supabase @supabase/supabase-js ^2.43 (EU Dublin; lazy init) |
| Sync | `src/lib/sync/` registry-driven layer |
| Navigation | React Navigation v6: bottom tabs + stack navigators |
| Billing | react-native-iap (Play Billing + StoreKit2) |
| Health | react-native-health (iOS) / react-native-health-connect (Android) |
| Scanning | react-native-vision-camera + @react-native-ml-kit/text-recognition |
| Graphics | @shopify/react-native-skia, react-native-reanimated ~4, react-native-svg |
| Audio | expo-av (rest-timer sound) |
| Crash/telemetry | @sentry/react-native (PII-scrubbed) |
| Icons | @expo/vector-icons (Ionicons) |
| Async storage | @react-native-async-storage/async-storage |

### Core Architecture Principles

- **Offline-first, local source of truth.** All data is stored in encrypted SQLite on-device. Components read from local storage / the store, never from Supabase directly. Supabase is the sync target; the app functions fully offline (`isSupabaseConfigured()` gate, lazy client).
- **Real account required.** A real Supabase account is required to use the app; the old anonymous local-UUID mode is removed (`RootNavigator.js` forbids LOCAL_USER restore per `IDENTITY_AND_OWNERSHIP_LOCKED.md`).
- **Deterministic coaching, no AI.** The Precision Coaching engine (`src/lib/weeklyCoach.js`, `coachApply.js`, `nutritionEngine.js`, …) and plan generation (`planEngine.js`/`planAutoGen.js`) are fully deterministic — no LLM, no `Math.random` in any decision path.
- **ED safety is always-on and tier-blind.** Calorie floors (1500 male / 1200 female), FFM energy floor (30 kcal/kg FFM), rapid-loss gate (-1.5%/week), ED-pattern detector, and Beat UK signposting live in `src/lib/` and never consult tier (`proGate.js` mandate). Do not modify.
- **Dark mode only.** `userInterfaceStyle: "dark"`, background `#0D0D0D`.
- **British English** in user-facing strings; `en-GB` number formatting.
- **EU data residency** — all user data stays in Supabase EU Dublin; no PII to third parties (telemetry is allow-listed coded enums/counts only).
- **Jargon-free UI.** MEV/MAV/MRV never appear in the UI — shown as Min/Target/Max. "Deload" is "Lighter week".
- **Only completed sessions count.** Analytics, volume, PR detection, and streaks use `getCompletedWorkoutSets()` (JOIN on `workouts.is_completed = 1`), never `getAllWorkoutSets()`.

### Entry Point

`App.js` wraps the app in `ErrorBoundary` (global crash handler) + Sentry,
`GestureHandlerRootView`, `SafeAreaProvider`, the global `PRCelebration`
overlay, and a light `StatusBar`. It also initialises billing
(`react-native-iap`, no-ops cleanly if the native module isn't linked) and
checks for OTA updates (`expo-updates`) on cold launch.

---

## 2. Navigation Structure

**File:** `src/navigation/RootNavigator.js` (single navigator file). For the
full nav tree, screen inventory, and Pro-gating list, see `APPMAP.md` — the
authoritative source. Summary here:

### Tab Navigator (5 tabs)

| Tab key | Title | Stack | Root screen |
|---|---|---|---|
| HomeTab | "Train" | HomeStack | HomeScreen |
| PlansTab | "Plans" | PlansStack | PlansScreen |
| DiaryTab | "Diary" | DiaryStack | DiaryScreen (**entire stack Pro-gated**) |
| ProgressTab | "Progress" | ProgressStack | AnalyticsScreen |
| ProfileTab | "You" | ProfileStack | YouScreen |

### Root gating (`renderNavigator`)

```
SplashScreen                          while auth/consent in flight
!user                                 → WelcomeStack (real account required)
signed-in, no health consent          → Article9ConsentStack
!firstRunComplete & tier==='pro'      → ProOnboardingStack
!firstRunComplete & tier!=='pro'      → FirstRunStack
onboarded                             → MainTabs
```

Pre-auth/onboarding stacks: **WelcomeStack** (Welcome · Quiz · PlanPreview ·
Login), **FirstRunStack** (free: FirstRun · FreeStarter · PlanLibrary ·
PlanDetail · ActiveWorkout), **Article9ConsentStack** (health-data consent),
**ProOnboardingStack** (Pro guided setup → plan + nutrition).

**Pro-guarded routes** (`withProGuard`): the Diary tab root + all food
sub-screens, MealPlan, WeeklyCheckIn, NutritionTargets, BodyMetrics,
CoachOutput, ProGoalSetup, PlanUpdate, CoachingReminders, LogCardio,
CardioHistory. Food sub-screens are gated individually **and** via the Diary
tab root (defence-in-depth).

### Bootstrap Sequence

`initDatabase()` (encrypted SQLite, migrate to v23) → seed exercises/routines
if needed → Supabase session check → **require a real account** (no
`initLocalUser`) → health-consent gate → `firstRunComplete` routes to the Pro
or Free onboarding stack or `MainTabs`.

### Splash Screen

`SPLASH_MIN_MS = 1600` (1.6s minimum). VolyumeMark logo + wordmark animation.

---

## 3. Database Schema

**File:** `src/lib/database.js`
**Engine:** expo-sqlite, **SQLCipher-encrypted** (`useSQLCipher: true`; 256-bit per-device key in expo-secure-store via `src/lib/dbCrypto.js`), WAL, single file
**Schema version:** `PRAGMA user_version` against an ordered `SCHEMA_MIGRATIONS` array — currently **v23**
**Helper:** `rowToCamel()` — snake_case → camelCase, parses JSON columns

> **⚠ Current state:** the local DB now has **~47 tables**, far more than the
> dozen documented below. The schemas below for `exercises`, `workouts`,
> `workout_sets`, `routines`, `routine_exercises`, `programmes`,
> `mesocycles`, `body_metric_log`, etc. remain broadly accurate, but the
> following **table groups are NOT documented here** (read `database.js` for
> their columns): nutrition/food (`foods`, `custom_foods`, `food_entries`,
> `daily_intake_rollups`, `saved_meals`, `recipes`, `recipe_ingredients`,
> `meal_plans`, favourites/frequents/recents, `daily_water`), activity
> (`daily_steps`, `cardio_log` incl. `ext_id`), coaching/check-in
> (`weekly_checkins`, `coach_outputs`, `morning_weights`, `adaptation_events`,
> `planned_muscle_volume`), partners (`partnerships`, `partner_week_signals`,
> `partner_cheers`), and safety/tier/telemetry/sync plumbing
> (`ed_pattern_flags`, `tier_history`, `engine_telemetry`,
> `pending_sync_ops`, `sync_meta`). `peak_week_plans` was removed
> (`migrate_049`). The cloud schema is ~88 migrations; see `INFRASTRUCTURE.md`
> §4 and the `src/lib/sync/` registry for what syncs and how.

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

> Note: `nutrition_targets` exists in SQLite but the app currently saves nutrition data to AsyncStorage key `@volyume_nutrition_targets` as well. Both paths exist.

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
shoulders_cm REAL (migration column)
forearm_cm REAL (migration column)
ham_cm REAL (migration column)
calf_cm REAL (migration column)
notes TEXT
created_at INTEGER
```

> Note: `BodyMetricsScreen` migrates legacy AsyncStorage entries into this SQLite table on first focus. New entries are saved directly via `logBodyMetric()`. `getLatestBodyWeight(userId)` reads from this table.

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

#### insights (in-memory / generated)

Insights are not persisted in SQLite; they are generated on demand by `runInsightsEngine()` and stored in a module-level cache with `getActiveInsights()` / `dismissInsight()` (AsyncStorage-backed dismissal list).

### Column Migrations

Applied via `ALTER TABLE ... ADD COLUMN` with try/catch (idempotent):
- `routine_exercises`: `starting_weight`, `rest_seconds`
- `workouts`: `last_activity_at`, `active_elapsed_seconds`, `name`, `set_count`, `total_volume`
- `routines`: `is_library`, `source_routine_id`, `programme_id`, `is_template`
- `programmes`: `is_active`, `next_workout_index`, `tags`, `split_type`, `is_archived`
- `body_metric_log`: `shoulders_cm`, `forearm_cm`, `ham_cm`, `calf_cm`

### Key Database Functions

#### Exercise Functions
| Function | Description |
|---|---|
| `getAllExercises()` | All exercises (seeded + custom), ordered by name |
| `getExerciseById(id)` | Single exercise by ID |
| `getExercisesByMuscle(muscle)` | Filter by primary_muscle |
| `insertExercise(data)` | Insert custom exercise (`is_custom=1`) |

#### Workout Functions
| Function | Description |
|---|---|
| `getAllWorkouts(userId)` | All workouts for user, newest first |
| `createWorkout(userId, routineId)` | Create new workout row |
| `updateWorkout(id, fields)` | Update any workout fields (feedback, completion, name, etc.) |
| `getAllWorkoutSets(userId)` | ALL sets for user (includes abandoned sessions — avoid for analytics) |
| `getCompletedWorkoutSets(userId)` | Sets from completed sessions only — JOINs on `workouts.is_completed = 1`. Use for all analytics, volume, PR, streak calculations. |
| `getWorkoutSetsForWorkout(workoutId)` | Sets for one specific workout |
| `getWorkoutSetsForExercise(exerciseId, userId, limit)` | Per-exercise history (newest first) |
| `getPreviousWorkoutSets(exerciseId, userId, currentWorkoutId)` | Last session's sets (excludes current workout) |
| `getAllCompletedSetsForExercise(exerciseId, userId)` | All-time completed sets for PR detection |
| `createWorkoutSet(data)` | Log a set (full row insert) |
| `buildWorkoutCSV(userId)` | Generates CSV of all workout sets with exercise names. Returns `{ csv: string, rowCount: number }`. |
| `clearWorkoutHistory(userId)` | DELETE all workouts + sets for user |

#### Plan / Routine / Programme Functions
| Function | Description |
|---|---|
| `getAllRoutines(userId)` | Non-deleted routines (is_active=1) |
| `createRoutine(userId, name, desc, isActive, splitType, programmeId)` | Insert routine |
| `softDeleteRoutine(id)` | Set `is_active=0` |
| `getRoutineExercisesWithDetails(routineId)` | Returns `[{exercise, routineExercise}]` (JOIN) |
| `addExerciseToRoutine(routineId, exerciseId, order, repsMin, repsMax, notes, sets, startingWeight, restSeconds)` | Link exercise to routine |
| `updateRoutineExercise(id, fields)` | Update sets/reps/rest/startingWeight |
| `removeExerciseFromRoutine(routineExerciseId)` | Hard delete from routine_exercises |
| `duplicateRoutine(routineId, userId, newProgrammeId)` | Deep copy routine + its exercises |
| `getAllPlansForUser(userId)` | Non-archived programmes where `is_library = 0 OR is_library IS NULL` |
| `getLibraryPlans()` | Programmes where `is_library = 1` (18 seeded templates) |
| `getActivePlan(userId)` | Single active programme (`is_active=1`) or null |
| `setActivePlan(userId, programmeId)` | Set one plan active, deactivate all others |
| `getRoutinesForPlan(programmeId)` | Routines linked to a programme |
| `advancePlanNextWorkout(planId, routineCount)` | Increment `next_workout_index` modulo routineCount |
| `copyPlanFromLibrary(planId, userId)` | Deep copy library plan → user's plans (copies programme + routines + exercises) |
| `archivePlan(planId)` | Set `is_archived=1` |
| `duplicatePlan(planId, userId)` | Deep copy user plan |
| `getRoutinesForPlan(programmeId)` | All routines linked to a programme |
| `createProgramme(userId, name, desc, isLibrary)` | Insert programme |
| `getAllProgrammes(userId)` | All programmes including archived |

#### Template Functions
| Function | Description |
|---|---|
| `getWorkoutTemplates(userId)` | Routines with `is_template=1` |
| `createWorkoutTemplateFromWorkout(userId, workoutId, name)` | Copy workout's sets into a new template routine |

#### Analytics / Body / Nutrition Functions
| Function | Description |
|---|---|
| `getAllMesocycles(userId)` | All mesocycles for user |
| `createMesocycle(userId, data)` | Insert mesocycle row |
| `logBodyMetric(userId, data)` | Insert body_metric_log row |
| `getBodyMetricLog(userId, limit)` | Recent body metric entries (default limit 50) |
| `getLatestBodyWeight(userId)` | Most recent `weight_kg` from body_metric_log |
| `saveNutritionTargets(userId, data)` | Upsert nutrition_targets |
| `getNutritionTargets(userId)` | Read nutrition_targets |
| `saveUserBodyProfile(userId, data)` | Upsert user_body_profile |
| `getUserBodyProfile(userId)` | Read user_body_profile |
| `getAllRoutineExerciseCounts(routineIds[])` | Batch count of exercises per routine |
| `copyRoutineFromLibrary(routineId, userId)` | Deep copy single routine |
| `duplicateRoutine(routineId, userId, programmeId)` | Deep copy routine with new programme link |

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

> **⚠ Current state:** auth is **real-account only** — there is no
> `initLocalUser`/`isLocal` offline-UUID path any more. The store also holds
> **`tier`** (`'free'|'pro'`, source of truth via `src/lib/proGate.js`) and a
> local calorie-bank profile field, among other preferences. The shape below
> documents the workout/timer/PR core, which is still accurate.

### State Shape

```javascript
// Auth (real Supabase account required)
user: null | { id: string, email?: string }
session: null | SupabaseSession
userProfile: null | object
tier: 'free' | 'pro' | null
isAuthLoading: boolean  (default: true)
firstRunComplete: boolean  (default: false)

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

// Preferences (persisted manually to AsyncStorage)
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
| `setSession(session)` | Sets `session` |
| `setUserProfile(profile)` | Sets `userProfile` |
| `setTier(tier)` / `refreshTierFromCloud()` | Set / refresh Pro entitlement (cloud `users_profile.tier`) |
| `completeFirstRun()` / `resetFirstRun()` | Set / reset the onboarding gate |

(The old `initLocalUser()` action is removed — accounts are real-only.)

---

## 5. Screen Inventory

> **⚠ This section is organised by the old 4-tab structure and predates the
> food/cardio/coaching/billing screens. For the authoritative current
> inventory — 5 tabs, 77 screens, with Pro-gating — see `APPMAP.md`. The
> per-screen deep-dives below remain useful for the screens that still
> exist; ignore `CoachBuilderScreen`, `OnboardingScreen`, `PRWallScreen`,
> `ExerciseLibraryScreen`, `AthleteHubScreen`, and `PeakWeekScreen` (all
> removed).**

### Train Tab

---

#### HomeScreen (`src/screens/HomeScreen.js`)

**Tab:** Train (root). `useFocusEffect` reloads on every focus.

**Data sources:** `getAllWorkouts(userId)`, `getCompletedWorkoutSets(userId)`, `getAllExercises()`, Zustand (`activeWorkout`, `user`)

**Week stats card:** Sessions / working sets / total kg vs soft targets `WEEK_TARGETS = {sessions:5, sets:80, volume:15000}`. Display only.

**Streak:** Weekly 7-day buckets (not calendar days):
```javascript
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const trainedWeeks = new Set(completed.map(w => Math.floor((w.startedAt ?? w.createdAt) / WEEK_MS)));
let streak = 0;
let week = Math.floor(Date.now() / WEEK_MS);
if (!trainedWeeks.has(week)) week -= 1;  // allow current or last week to start streak
while (trainedWeeks.has(week)) { streak += 1; week -= 1; }
```
Displayed as "{streak} week streak 🔥" (only if streak ≥ 1).

**Active workout banner:** if `activeWorkout` in store → green "Session in Progress" card → navigates to `ActiveWorkout`.

**Active plan hero card:** active plan + next workout → "Start Workout" + "Change" (bottom sheet to select different routine from plan).

**No plan state:** 3 builder cards (CoachBuilder / PlanLibrary / BuildWorkout).

**Last session card:** navigates to `WorkoutHistory`.

**Quick nav row:** History / Records / Volume (→ WorkoutHistory, PRWall, VolumeHeatmap).

**`handleStartNextWorkout`:** `createWorkout` → `getRoutineExercisesWithDetails` → `startWorkout(store)` → navigate `ActiveWorkout`. Plan advancement uses `(plan.nextWorkoutIndex || 0) % routines.length`.

`seedRoutinesIfNeeded(user.id)` called on first focus (seeds 18 library plans once).

---

#### BuildWorkoutScreen (`src/screens/BuildWorkoutScreen.js`)

Ad-hoc workout builder (no plan context). "Skip Setup" link → starts blank workout immediately.

- Add exercises from picker (top 50, filterable by search).
- Per-exercise: sets (stepper 1–20), rep range (two TextInputs), rest (stepper ±15s, 30–600s range), starting weight.
- "Start Training (N)" footer button → `createWorkout` → `startWorkout` → `navigation.replace('ActiveWorkout')`.

---

#### ActiveWorkoutScreen (`src/screens/ActiveWorkoutScreen.js`)

Core workout logging screen. Complex; key behaviours:

- **Elapsed timer** from `workoutStartTime`.
- **Exercise tabs:** horizontal scrollable tabs: exercise name + set count badge. Tap → `setCurrentExerciseIndex`.
- **Previous session card:** last session's sets formatted as `weight×reps` via `getPreviousWorkoutSets`.
- **Progression badge:** `getProgressionSuggestion()` result.
- **SetEntry component:** weight + reps inputs with ±2.5kg / ±1 rep steppers, set type picker.
- **Warm-up logic:** first exercise → auto type=warmup, weight=50% of prev working weight, reps=min(recommendedRepsMax+4, 20). After warmup logged → auto-switch to straight.
- **COMPLETE SET → action:**
  1. `createWorkoutSet` in SQLite
  2. `addSetToCurrentExercise` in Zustand store
  3. `detectPR()` using `allTimeSetsRef` + `sessionSetsRef` (refs, not state)
  4. If PR → `showPRCelebration(pr)` → Zustand → App.js overlay
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

#### WorkoutSummaryScreen (`src/screens/WorkoutSummaryScreen.js`)

Reached from `ActiveWorkout` (new session) or `WorkoutHistory` (readOnly replay).

**Route params:** `workoutId, durationMinutes, exerciseCount, setCount, workingSetCount, tonnage, exerciseNames[], readOnly(false), routineId(null), detectedPRs[], exerciseData[]`

- On mount: `advancePlanNextWorkout` if `routineId` matches active plan routines.
- Stats grid: Exercises / Working Sets / Duration / Total kg.
- Exercise list with sets × rep range summary.
- PR row if `detectedPRs.length > 0`.
- **THIS WEEK AFTER SESSION:** muscle volume status via `calculateWeeklyVolume` + `getVolumeStatus` (uses `getCompletedWorkoutSets`).
- **RECOMMENDATIONS:** `getAutoRegSuggestion`. Shows "Learning your landmarks" if fewer than 4 completed sessions in the last 28 days.
  ```javascript
  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const recent = allWorkouts.filter(w => w.isCompleted && w.startedAt >= fourWeeksAgo);
  // show recommendation only if recent.length >= 4
  ```
- **SESSION FEEDBACK (collapsible):** difficulty (0–5), pump (0–3), soreness (0–3), fatigue (0–5), joint discomfort (0–3), notes text. Saved via debounced `updateWorkout` (1000ms).
- "Save as Workout Template" button (non-plan blank sessions only).
- Sticky footer: "Save & Close" + share icon.
- `handleShareCard` → navigate `ShareCard` with `{sessionData, prData}`.

---

#### WorkoutHistoryScreen (`src/screens/WorkoutHistoryScreen.js`)

FlatList of up to 50 completed workouts, newest first.

Each card: date, relative time, duration, working set count, exercise names (up to 4), "View Details" → `WorkoutSummary` (readOnly:true), "Repeat" button.

**"Repeat":** `createWorkout(userId, workout.routineId || null)` → `startWorkout(newWorkout)` → navigate `HomeTab > ActiveWorkout`.

---

#### ShareCardScreen (`src/screens/ShareCardScreen.js`)

**Route params:** `sessionData`, `prData` (both optional).

- Card types: "session" or "pr" (auto-selects based on prData presence).
- Formats: "square" (1:1, 1080×1080) or "story" (9:16, 1080×1920).
- Privacy toggles: showDate, showPlanName, showVolume, showExercises, showPRWeight, showPrevBest.
- Hidden WebView renders HTML5 canvas at full resolution (1080px wide).
- Canvas: gradient background, top accent bar, VolyumeMark (V shape), session/PR content.
- On share: `injectJavaScript` with params → canvas renders → `postMessage` base64 PNG → `expo-file-system` write → `expo-sharing shareAsync`.
- Stats shown: Sets, Duration, Total kg (if `showVolume`), PR count (if `prCount > 0`).

---

### Plans Tab

---

#### PlansScreen (`src/screens/PlansScreen.js`)

**Tab:** Plans (root). `useFocusEffect` reloads on focus.

- **ACTIVE PLAN section:** active plan card with ACTIVE badge, "Start Next Workout", "View Plan", ellipsis options.
- **MY PLANS section:** inactive plans list with "Set Active" + ellipsis options.
- **WORKOUT TEMPLATES section:** routines with `is_template=1`, each showing "Start" + ellipsis.
- **START OR BUILD A PLAN section:** 3 action cards — CoachBuilder (Recommended badge), PlanLibrary, ManualBuilder.
- **`handlePlanOptions`:** Alert sheet → View Plan / Set Active / Duplicate / Archive.
- **`handleTemplateOptions`:** Alert sheet → Edit (→ RoutineDetail) / Delete.
- **`handleStartNextWorkout`:** same flow as HomeScreen.

---

#### PlanDetailScreen (`src/screens/PlanDetailScreen.js`)

Shows plan header (name, description, workouts count, est. sets), then workout list.

- **Library mode (`isLibrary=true`):** "Add to My Plans" primary button.
- **User plan + active:** "Deactivate" button.
- **User plan + inactive:** "Set Active" button.
- Workout rows show exercise count + edit + play buttons (non-library).
- MANAGE section: Duplicate Plan / Archive Plan.
- `handleStartWorkout(routine)`: creates workout, loads exercises, starts in store, navigates to ActiveWorkout.

---

#### RoutineDetailScreen (`src/screens/RoutineDetailScreen.js`)

FlatList of exercises in a routine. Each row: order badge, exercise name, sets × rep range, rest, starting weight, trash icon.

- "Start This Workout" header button.
- "Add Exercise" footer button → slide-up modal with search.
- Exercises removed via `removeExerciseFromRoutine(routineExercise.id)`.

---

#### CoachBuilderScreen (`src/screens/CoachBuilderScreen.js`)

7-step wizard with progress dots.

| Step | Content |
|---|---|
| 1 | Experience level (beginner/intermediate/advanced/competitive) + optional training age pills |
| 2 | Days per week (3/4/5/6) + session length (45/60/75/90 min) |
| 3 | Equipment (full_gym/machines_cables/dumbbells_only/barbell_plates/home_gym/bodyweight) |
| 4 | Goal (6 options: general_hypertrophy/bodybuilding_volume/strength_hypertrophy/aesthetic_focus/strength_performance/recomp_maintain) |
| 5 | Weak points (up to 3 from WEAK_POINT_MUSCLES list — qualifying goals only) |
| 6 | Recovery rating (poor/average/good); shows nutrition phase banner if `@volyume_nutrition_targets` detected |
| 7 | Generated plan preview: editable name, warnings, "Built around you" summary, "Why this plan?" expandable, workout cards |

- **`handleGenerate`:** reads `@volyume_nutrition_targets` → `getPlanNutritionContext()` → `generatePlan()`.
- **`handleSave(activate)`:** `createProgramme` → per workout: `createRoutine` + `addExerciseToRoutine` (matches exercise by name, case-insensitive) → optionally `setActivePlan`.
- V-Taper suggestions on step 5: `['Side Delts', 'Lats / Back Width', 'Upper Chest', 'Rear Delts']`.

---

#### ManualBuilderScreen (`src/screens/ManualBuilderScreen.js`)

2-page flow.

**Page 1:** Plan name + goal selector (5 goals) + days per week (3/4/5/6). Creates programme row → page 2.

**Page 2:** Day cards (editable name, exercise list with long-press-to-remove, "Add Exercise"), "Add Day" button, "Save Draft" + "Save & Activate" actions.

**PlanBalanceCard (volume guardrail):** Rendered between day cards and action buttons.
- `computePlanVolume(days)`: groups exercises by primaryMuscle, sums recommended sets.
- `muscleStatus(muscle, totalSets)`:
  ```javascript
  if (totalSets === 0) return lm.mev === 0 ? 'good' : 'none'; // glutes/abs: mev=0 means covered
  if (totalSets < lm.mev) return 'low';
  if (totalSets <= lm.mav) return 'good';
  if (totalSets <= lm.mrv) return 'high';
  return 'over';
  ```
- Status 'none' → "No {Muscle} work" warning. Status 'low' → "Low {Muscle} volume". Status 'over' → "Too much {Muscle}" warning. Status 'good'/'high' → no warning shown.

**`ExercisePickerModal`** (embedded): search + create custom exercise (name required, muscle/equipment optional).

**`persistDays()`:** creates routine per day + `addExerciseToRoutine` for each exercise.

Success modal: "Stay Here" / "Go to Train" actions.

---

#### PlanLibraryScreen (`src/screens/PlanLibraryScreen.js`)

- Horizontal filter chips: All / Beginner / Upper-Lower / PPL / Full Body / Bodybuilding / Aesthetic / Weak Point / Short Sessions.
- Search input (filters by name + description text — tags are embedded in description for `matchesFilter`).
- Plan cards: name, description (2 lines), splitType tag, difficulty tag, "Preview Plan" + "Add to My Plans".
- `handleAddToMyPlans`: `copyPlanFromLibrary` → optional `setActivePlan`.

**18 seeded plan templates** (AsyncStorage key `@volyume_routines_seeded_v4`):
Full Body 3x, Upper-Lower 4x, PPL 6x, PHUL (Power Hypertrophy), PHAT, Full Body Advanced, Upper-Lower Advanced, PPL Advanced, Arms Specialisation, Shoulder & Upper Chest Focus, Legs Specialisation, V-Taper Aesthetic, Women's Aesthetic, Short Sessions (45 min), Home Gym Dumbbell, Travel/Minimal Equipment, Beginner Full Body, Intermediate PPL.

---

#### ExerciseLibraryScreen (`src/screens/ExerciseLibraryScreen.js`)

Searchable exercise directory (reachable from PlansTab, SettingsScreen, AnalyticsScreen).

**Data sources:** `getAllExercises()`, `getCompletedWorkoutSets(userId)`, `insertExercise()`.

- Search + filter (muscle group, equipment). Max 100 results.
- `lastLogged` per exercise: most recent completed set → `{ weight, reps, daysAgo }`.
- "Add Exercise" button → full-screen Modal (name required, muscle chips, equipment chips, privacy note).
- Filter bottom sheet Modal (muscle + equipment pickers).
- When accessed with `route.params.onSelect` (from ActiveWorkout), shows Add button on each card.

---

#### ExerciseDetailScreen (`src/screens/ExerciseDetailScreen.js`)

**Route params:** `{ exerciseId }`

**Data sources:** `getExerciseById(exerciseId)`, `getWorkoutSetsForExercise(exerciseId, userId)`, `getAllExercises()`.

- Overview card: muscle/equipment/compound tags, secondary muscles list, est. 1RM (gold background if > 0).
- SFR row: 3 stat items — Stimulus-to-Fatigue Ratio, Fatigue Cost, Rep Range.
- **Strength Trend Chart:** `CartesianChart` (victory-native) + `Line` + `Area`. Groups sets by workout session, maps to `{x: sessionIndex, est1rm: max(calculate1RM()) in session}`. Last 8 sessions.
- **History section:** last 8 sessions. Per session: date, all sets (weight × reps with warmup/dropset badges), session est. 1RM.
- **All-Time PRs section:** up to 5 records with icons (🥇 1RM, 🏋️ heaviest, 🔁 most reps), value, date.
- **Substitutes section:** `getExerciseSubstitutes()` → tappable rows (each → push new ExerciseDetail).
- Notes card (if `exercise.notes` set).

---

### Progress Tab

---

#### AnalyticsScreen (`src/screens/AnalyticsScreen.js`)

**Tab:** Progress (root). `useFocusEffect` reloads on focus.

**Data sources:** `getAllWorkouts(userId)`, `getCompletedWorkoutSets(userId)`, `getAllExercises()`, `getAllMesocycles(userId)`, `getActiveInsights(userId)`, `runInsightsEngine(userId)`.

**6 sections:**

**1. MesocyclePulseCard**
- Active block name, week progress bar (0–100%), weekly tonnage BarChart (gifted-charts, last 4 weeks).
- `mesoProgress()` = weeks elapsed / durationWeeks.
- Bar colors: current week → primary, deload week → warning, others → primary dimmed.
- Empty state: "Create a training block" CTA → `MesocycleBuilder`.

**2. InsightStack**
- Dismissible insight rows with severity icons (info/warning/error).
- `runInsightsEngine(userId)` called on load, generates 6 rule-based insights.
- Dismissed insights stored in AsyncStorage.

**3. VolumeSnapshotGrid**
- 3-column grid of muscle groups with colored dots (volume status) and working set counts.
- Uses `calculateWeeklyVolume(last7DaySets, exerciseMap)`.
- `volumeDotColor(muscle, workingSets)` maps status to color.
- "Full view" → VolumeHeatmap.

**4. PRSparkline**
- BarChart (gifted-charts) of PR count per week.
- `computePRsPerWeek(allSets, exerciseMap, windowDays)`: tracks running 1RM per exercise per week using `calculate1RM()`, counts novel bests.
- Toggleable window: 30 days / 90 days.

**5. TrainingCalendar**
- `CalendarHeatmap` (react-native-calendar-heatmap) showing 12 weeks of training days.
- One dot per day with a session.

**6. RecentSessionsStrip**
- Last 3 completed workouts: date, duration, difficulty chip.

**NavTiles (EXPLORE section):** PRWall, BodyMetrics, ExerciseLibrary, WorkoutHistory.

---

#### VolumeHeatmapScreen (`src/screens/VolumeHeatmapScreen.js`)

**Data sources:** `getCompletedWorkoutSets(userId)`, `getAllExercises()`, AsyncStorage `@volyume_landmarks_{userId}`.

**Rolling window selector:** 3 options (1 week, 2 weeks, 4 weeks). Loads current + previous window sets for ghost bar comparison.

**Ghost bar logic:** Previous period fill at `opacity: 0.25` behind current fill. Both normalized to MRV for percentage width.

**Muscle bar rows:** 12 muscles. Each row:
- Muscle name (90px fixed width)
- Bar track: ghost fill (prev period) + current fill (colored by status via `getVolumeStatus()`)
- 2 landmark tick marks (MEV=Min, MAV=Target) at scaled positions
- Set count (right, colored)
- MRV=Max label (gray, far right)

**Legend:** 4 dots — "Below minimum", "Optimal", "Near ceiling", "Over ceiling" (no jargon).

**Edit Volume Targets mode:** TextInput grid for Min/Target/Max per muscle. Column headers use plain labels, not MEV/MAV/MRV.
- `saveLandmarks()` → parse ints → `AsyncStorage.setItem('@volyume_landmarks_{userId}', JSON.stringify(landmarks))`
- Reset button → removes AsyncStorage key, restores `VOLUME_LANDMARKS` defaults. Dialog: "Reset volume targets?" (not "landmarks").

---

#### PRWallScreen (`src/screens/PRWallScreen.js`)

**Data sources:** `getCompletedWorkoutSets(userId)`, `getAllExercises()`, `getLatestBodyWeight(userId)`.

**Filter tabs:** All Time / This Month / This Week.

Per exercise: best estimated 1RM (`calculate1RM`) + heaviest weight + most reps at weight.

**Strength Standards card** (shown if bodyWeight available from `getLatestBodyWeight`):
- Bench, Squat, Deadlift matched via `STRENGTH_LIFT_MAP` regex.
- `getStrengthStandard(lift, est1RM, bodyWeight)` → `{ ratio: "X.Yx", label }`.
- 5 levels: Beginner, Novice, Intermediate, Advanced, Elite → colors `textMuted/textSecondary/success/primary/gold`.

**Body weight prompt** (if no weight logged): "Add your body weight" → navigates to `ProfileTab > BodyMetrics`.

---

#### WorkoutHistoryScreen

(Also reachable from ProgressStack — see Train tab section above.)

---

### You Tab (Profile)

---

#### AthleteHubScreen (`src/screens/AthleteHubScreen.js`)

**Tab:** You (root). `useFocusEffect` reloads on focus.

**Data sources:** `getAllWorkouts(userId)`, `getCompletedWorkoutSets(userId)`, `getBodyMetricLog(userId)`, `getNutritionTargets(userId)`, Zustand (`user`, `userProfile`).

**Profile card:** Avatar initial (from firstName), name, training age, session count, week streak (shown if ≥ 2 consecutive weeks).

**Streak logic (weekly buckets):**
```javascript
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const trainedWeeks = new Set(completed.map(w => Math.floor((w.startedAt ?? w.createdAt) / WEEK_MS)));
// same bucket algorithm as HomeScreen
```
Displayed as "{streak} week streak".

**Milestone card:**
- `MILESTONES = [1, 10, 25, 50, 100, 250, 500]` completed sessions.
- Shows last unlocked milestone badge + next milestone progress bar + sessions-to-go count.

**Recovery Signals:**
- 3 `RecoveryGauge` tiles: Soreness, Fatigue, Joint Comfort.
- Values from `computeRecoveryEMAs(completedWorkouts)` → 7-day exponentially weighted moving averages.
- Colors: green (low concern) / yellow (moderate) / red (high concern).

**Quick Stats row:** Sets this week (hard sets only) + all-time session count.

**Nutrition Targets card:** Daily kcal + 3 macro pills (protein/carbs/fat) if configured. Links to `NutritionTargets`.

**Body Metrics card:** Latest weight + date, body fat %, waist if logged. Links to `BodyMetrics`.

**Management nav:** Training Blocks (→ MesocycleBuilder), Personal Records (→ PRWall), Settings.

**About footer:** Branding + version.

---

#### BodyMetricsScreen (`src/screens/BodyMetricsScreen.js`)

**Physique tracking gate:** Reads `@volyume_physique_tracking_enabled` via `useFocusEffect`.
- `null` → render null (loading)
- `false` → render `PhysiqueOptIn` component only
- `true` → full screen

**Gate state machine:**
```
physiqueEnabled = null  →  loading (render nothing)
physiqueEnabled = false →  PhysiqueOptIn card
physiqueEnabled = true  →  full dashboard + log form
```

**PhysiqueOptIn component:** lock icon + explanation + "Enable Physique Tracking" button. Writes `@volyume_physique_tracking_enabled = 'true'` to AsyncStorage on enable.

**Data migration:** On first enable, reads legacy `@volyume_body_metrics_{userId}` AsyncStorage entries and migrates them to `logBodyMetric()` (SQLite). Migration flag stored at `@volyume_body_metrics_migrated_{userId}`.

**Data sources:** `logBodyMetric(userId, data)`, `getBodyMetricLog(userId)`, AsyncStorage `@volyume_nutrition_targets` (nutrition card display), `@volyume_physique_tracking_enabled`.

**Phase detection (`detectPhase(entries)`):**
Linear regression on last 8 weight entries (sorted ascending):
- slope > 0.15 kg/entry → Gaining (green)
- slope < -0.15 kg/entry → Cutting (orange)
- else → Maintaining (primary cyan)
Returns `{ label, color, icon }`.

**Weight trend chart (`WeightTrendChart`):**
gifted-charts `LineChart`:
```javascript
const axisRange = Math.max(maxW - minW, 1);
// yAxisOffset subtracts from data values internally, so maxValue = range
yAxisOffset={minW}
maxValue={axisRange}  // NOT minValue (not a valid prop)
```
Curved line, gradient fill. Hides data points if > 6 entries.

**DeltaBadge:** Shows weight change between latest and previous entry with up/down icon.

**Log entry form:** date picker, body weight, collapsible measurements section (9 fields: chest, shoulders, arms, forearms, waist, hips, quads, hamstrings, calves — all in cm), optional notes.

**Measurements tracked:**
```
body_weight → weightKg
chest → chestCm
shoulders → shouldersCm
arms → armCm
forearms → forearmCm
waist → waistCm
hips → hipsCm
quads → thighCm
hamstrings → hamCm
calves → calfCm
```

**Nutrition card:** Always shown (even before physique enabled). Reads `@volyume_nutrition_targets`.

**History section:** Last 10 entries listed by date with weights.

---

#### SettingsScreen (`src/screens/SettingsScreen.js`)

`useFocusEffect` re-reads `@volyume_physique_tracking_enabled` on every focus to stay in sync with BodyMetrics opt-in.

**Sections:**

**PREFERENCES:**
- Weight units (kg/lbs dialog), Bar weight (15/20kg dialog)
- Physique tracking: Switch toggle (`togglePhysique(value)`). On enable: Alert with consent text ("Your data never leaves your phone") → writes `@volyume_physique_tracking_enabled = 'true'`.
- Notifications: Switch toggle (UI only — no backend).

**EXERCISE LIBRARY:** "Browse & manage exercises" → `ExerciseLibrary`.

**DATA & PRIVACY:**
- "Export my data (CSV)" → `exportData()` → `buildWorkoutCSV(userId)` → write to cache → `Sharing.shareAsync()`. Shows rowCount in success.
- "Clear workout history" (destructive) → `clearWorkoutHistory(userId)` with confirmation.

**ACCOUNT:**
- "Sign out" (destructive) → removes `@volyume_local_user_id` + Supabase signOut + `setUser(null)`.
- "Delete account" (destructive) → Supabase RPC `delete_user_data` + signOut.

**About:** "Volyume · v1.0.0 · Free during beta · Intelligent Hypertrophy Logbook".

---

#### NutritionTargetsScreen (`src/screens/NutritionTargetsScreen.js`)

Multi-step nutrition calculator. Saves to AsyncStorage `@volyume_nutrition_targets`.

**4-step form:**
1. About You: sex pills, age, height (cm), weight (kg), body fat % (optional)
2. Body fat source: Visual / BIA / Caliper / DEXA → affects confidence level
3. Activity & Training: activity level (5 options: sedentary/light/moderate/active/very_active), training days per week (3–6 pills)
4. Goal & Phase: 6-card grid

**Goals:**
```
lean_gain (+10%), build (+17%), maintain (0%),
recomp (-5%), mild_cut (-13%), aggressive_cut (-22%)
```

**Consent card:** GDPR checkbox required before Calculate button enables.

**Results display:**
- Hero card: daily energy target (kcal + range).
- Macro cards: protein (g + g/kg), carbs (g), fat (g).
- Phase card: name + description.
- Confidence card: green checkmark (high: DEXA/caliper), yellow info (medium: BIA), red alert (low: visual).
- Warnings banners.
- Expandable "How calculated?" (BMR formula, BMR value, TDEE, phase, rate).
- Recalculate button.

**Auto-seeds body metrics:** if weight entered and no today's entry in `@volyume_body_metrics_{userId}`.

---

#### MesocycleBuilderScreen (`src/screens/MesocycleBuilderScreen.js`)

**Data sources:** `getAllMesocycles(userId)`, `createMesocycle()`, `getAllWorkouts(userId)`, `getCompletedWorkoutSets(userId)`, `computeRecoveryEMAs()`, `predictDeloadWeek()`, `evaluateAutoReg()`.

**Active block dashboard** (if active mesocycle exists):
- Block name, "Week X of Y", focus.
- Progress bar (weeks elapsed / durationWeeks).
- Weekly tonnage BarChart (gifted-charts) spanning full block. Week coloring: current=primary, deload=warning, others=primary dimmed.
- `calculateTonnage(setsInWeek)` per week.
- Recovery row: 3 items (Soreness / Fatigue / Joints) with EMA values from `computeRecoveryEMAs(last4Workouts)`.
- Deload banner: shows if `evaluateAutoReg(feedbackWindow).action === 'deload_now'` (urgent, error color) or `predictDeloadWeek().weeksUntilDeload <= 2` (advisory, warning color).
- UI says "Lighter week recommended" not "deload".

**All blocks list:** Mesocycle cards with ACTIVE badge, name, date range, focus, week progress dots, deload week label.

**Create modal:** name, start_date, end_date (YYYY-MM-DD strings), focus, recovery week picker (Weeks 3–6), auto-regulation toggle.

---

### Auth / First-Run Screens

---

#### LoginScreen (`src/screens/LoginScreen.js`)

**Stack:** AuthStack. Shown only if `!user || !firstRunComplete`.

Modes: signin / signup (toggled).

- Email + password with eye toggle.
- Forgot password link.
- "Continue without an account" → `initLocalUser()`.
- Crash log banner (reads `@volyume_crash_log`).
- Copy: "Free during beta · No subscription required".
- On signup: `navigation.replace('Onboarding')`.

---

#### OnboardingScreen (`src/screens/OnboardingScreen.js`)

4 steps with progress dots.

| Step | Options |
|---|---|
| Training focus | bodybuilding / hypertrophy / strength_hypertrophy / physique |
| Training age | 1yr / 2yr / 4yr / 6yr |
| Primary equipment | commercial / home / both |
| Units | kg / lbs |

On complete: `upsertUserProfile` (if not local) → `setUnits` → `navigation.reset` to Login.

---

#### FirstRunScreen (`src/screens/FirstRunScreen.js`)

**Stack:** FirstRunStack. Shown on first launch before main tabs.

**Mode 'branch' (choice screen):**
- Brand row.
- Path A: "Generate my plan" (sparkles icon) → `CoachBuilder`.
- Path B: "I have my own plan" (edit icon) → mode='quick'.

**Mode 'quick' (fast setup):**
- Units selector (kg/lbs).
- Optional body weight input → `logBodyMetric()` on complete.
- "Start logging" button → `completeFirstRun()` (Zustand) → routes to MainTabs.

---

### Orphaned Screens (implemented but not routed)

| File | Status |
|---|---|
| `src/screens/RoutinesScreen.js` | Imported in RootNavigator but not mounted in any stack. Superseded by PlansScreen + PlanDetailScreen. |
| `src/screens/ProgrammesScreen.js` | Imported in RootNavigator but not mounted in any stack. Superseded by PlansScreen. |
| `src/screens/RoutineBuilderScreen.js` | File exists, not registered. RoutineDetailScreen serves the edit function. |

---

## 6. Component Library

All components in `src/components/`.

---

### SetEntry (`SetEntry.js`)

Props: `value {weight, reps, setType}`, `onChange`, `units`, `onOpenSetTypePicker`

- Weight row: label "Weight (units)", stepper (−2.5 / TextInput / +2.5), decimal pad.
- Reps row: label "Reps", stepper (−1 / TextInput / +1), numeric pad.
- Set type row: compact inline tap → calls `onOpenSetTypePicker`. Shows `SET_TYPE_LABELS`.
- Steppers trigger `Haptics.selectionAsync()`.
- `adjust(field, delta)`: clamps weight 0–500, reps 1–100.
- `testID` values: `volyume-weight-input`, `volyume-reps-input`, `volyume-set-type-btn`.

```javascript
SET_TYPE_LABELS = {
  straight: 'Working',  warmup: 'Warm-up',  dropset: 'Drop Set',
  superset: 'Working',  myo_reps: 'Working',  rest_pause: 'Working',  amrap: 'Working'
}
```

---

### RestTimer (`RestTimer.js`)

Reads from Zustand: `restTimerActive`, `restTimerRemaining`, `restTimerDuration`, `stopRestTimer`, `tickRestTimer`, `addRestTime`.

**Critical animation fix:** Uses `restTimerRemaining` (not `restTimerDuration`) for bar starting position. This ensures bar stays in sync after app backgrounding or mid-timer adjustments:
```javascript
progressAnim.stopAnimation();
const remaining = restTimerRemaining > 0 ? restTimerRemaining : restTimerDuration;
const startValue = restTimerDuration > 0 ? remaining / restTimerDuration : 1;
progressAnim.setValue(startValue);
Animated.timing(progressAnim, {
  toValue: 0, duration: remaining * 1000, useNativeDriver: false,
}).start();
```

- Animated progress bar (1→0 over `remaining * 1000ms`).
- Time display: `M:SS` format; switches to large countdown at ≤3 seconds.
- Color → warning (`#FFC107`) at ≤10 seconds remaining.
- Haptics: heavy impact at 3/2/1 seconds; `notificationAsync(Warning)` + double heavy at 0.
- "Done" state: "Start next set" with success icon for 3 seconds.
- Adjustment buttons: −30s / −15s / +15s / +30s (minimum 5 seconds remaining).
- Returns `null` when `!restTimerActive && restTimerRemaining === 0 && !showDone`.

---

### BrandMark / VolyumeMark (`BrandMark.js`)

Exports: `VolyumeMark` (default), `VolyumeWordmark`, `BrandTag`.

**VolyumeMark:** SVG V shape. ViewBox `0 0 28 24`.
- Left arm: `M2 2 L14 22` — white, strokeWidth 3.2, rounded caps.
- Right arm: `M14 22 L26 2` — white, strokeWidth 3.2.
- Cyan accent: `M16.5 22 L26 6` — primary color (#00E5FF), strokeWidth 1.8, opacity 0.85 (shorter inner line on right arm).
- Fallback (no react-native-svg): text "V" + colored accent bar.

**VolyumeWordmark:** VolyumeMark + "VOLYUME" text (letterSpacing 2, fontWeight black).

**BrandTag:** VolyumeMark sized to cap-height + "olyume" text flush — V mark IS the "V" in "Volyume".

---

### PRCelebration (`PRCelebration.js`)

Full-screen overlay triggered by Zustand `prCelebration` state. Rendered globally in `App.js`.

- 40 particles emitted from screen center via `Animated.spring`.
- Particle colors: `primary (#00E5FF)`, `gold (#FFD700)`, `success (#4CAF50)`, `#FF6B35`, `#9C27B0`.
- Overlay fades to `opacity: 0.85` black.
- Card springs in from scale 0.5 to 1.0.
- Haptics: `notificationAsync(Success)` + two heavy impacts at 150ms / 300ms.
- Auto-dismisses after 3000ms.

PR type icons and labels:
- `1rm_estimate` → trophy → "New Estimated 1RM"
- `heaviest_weight` → barbell → "New Heaviest Weight"
- `most_reps_at_weight` → flash → "Most Reps at Weight"

---

### ExerciseCard (`ExerciseCard.js`)

Props: `exercise`, `onPress`, `onAdd`, `lastLogged {weight, reps, daysAgo}`, `units`, `showAddButton`

- Exercise name (bold, 1 line truncated).
- Tags: primary muscle (primaryBg), equipment (surface2), Custom (primaryBg, if `isCustom`).
- `lastLogged` row: "Last: Xkg × Y reps · Zd ago".
- Add button (circular, primaryBg) + chevron-forward icon.
- Handles both camelCase (`primaryMuscle`) and snake_case (`primary_muscle`) field names.

---

### VolumeBars (`VolumeBars.js`)

Props: `weeklyVolume {}`, `customLandmarks null`

Simplified heatmap rows (no MRV label, no editing). Used in `WorkoutSummaryScreen`.

- All 12 muscles from `VOLUME_LANDMARKS` keys.
- Per muscle: name (90px), bar track (fill + MEV/MAV tick marks), set count.
- Colors from `getVolumeStatus()`.

---

### PlateCalculator (`PlateCalculator.js`)

Props: `targetWeight`, `onClose`

Reads `barWeight` and `units` from Zustand store.

- Two inputs: target weight + bar weight.
- `calculatePlates(targetWeight, barNum)` from algorithms.
- Visual bar diagram: bar stub + color-coded plate blocks (25→red, 20→blue, 15→yellow, 10→green, 5→white, 2.5→gray, 1.25→light gray).
- Text list: "X kg × N total (each side: M)".

---

### EmptyState (`EmptyState.js`)

Props: `icon`, `title`, `subtitle`, `actionLabel`, `onAction`

Reusable centered empty-state component with Ionicons icon, title, subtitle, optional action button. Used throughout for zero-data states.

---

## 7. Algorithms and Calculations

**File:** `src/lib/algorithms.js`

Pure functions, no side effects.

### 1. `calculateWeeklyVolume(sets, exerciseMap)`

Groups sets by primary and secondary muscles. Hard sets only (non-warmup):
- Primary muscle: +1.0 contribution per set
- Secondary muscles: +0.5 contribution per set (`secondaryMuscles[].contribution` ignored — flat 0.5)

Returns: `{ [muscle]: { workingSets, reps, tonnage } }`.

### 2. `getProgressionSuggestion(lastSets, targetRepsMin, targetRepsMax, units)`

Double progression:
- All sets hit top of rep range → suggest weight increase.
- Increment: weight ≥ 60kg → +2.5kg; otherwise → +1.25kg.
- Returns suggestion string or null.

### 3. `detectPR(newSet, historicalSets, exercise, units)`

Checks 3 PR types:
- `1rm_estimate`: new `calculate1RM(weight, reps)` > best historical × 1.001
- `heaviest_weight`: new weight > all previous weights
- `most_reps_at_weight`: new reps at same weight > historical reps at that weight

Returns `{ type, label, exerciseName }` or null.

### 4. `calculate1RM(weight, reps)`

Ensemble of Epley + Brzycki:
- Epley: `weight * (1 + reps / 30)`
- Brzycki: `weight / (1.0278 - 0.0278 * reps)`
- reps ≤ 10: 60% Epley + 40% Brzycki
- reps > 20: Brzycki only
- Otherwise: average of both

### 5. `getVolumeStatus(workingSets, muscle, customLandmarks)`

Returns `{ status, color, label, landmarks }`.

| Status | Condition | Color |
|---|---|---|
| `below` | sets < MEV | `#616161` (textMuted) |
| `minimum` | sets == MEV | `#FFB300` |
| `optimal` | MEV < sets ≤ MAV | `#00C853` |
| `near_mrv` | MAV < sets < MRV | `#FFB300` |
| `over_mrv` | sets ≥ MRV | `#FF3D00` |

Uses `customLandmarks` from AsyncStorage if provided, else `VOLUME_LANDMARKS` defaults.

### 6. `getAutoRegSuggestion(workoutFeedback, weeklyVolumeByMuscle, customLandmarks)`

Takes `workoutFeedback { sessionDifficulty, overallPump, soreness24hBefore, fatigueLevel, jointDiscomfort }`.

Returns a recommendation string based on difficulty (high/low), volume status, and fatigue markers. Returns "Learning your landmarks" message if insufficient data (< 4 sessions in last 28 days — checked by caller).

### 7. `shouldDeload(last4WeeksData)`

Input: array of 4 objects `{ avgReps, avgSoreness, hasOverMRV, weeksSinceLastDeload }`.

Checks: rep decline across weeks, sustained elevated soreness (≥3 for multiple weeks), `weeksSinceLastDeload` threshold, `hasOverMRV`.

Returns `{ deload: boolean, reasons: string[] }`.

### 8. `getExerciseSubstitutes(targetExercise, allExercises, userEquipment)`

Scoring: same primary muscle (+40), same movement pattern (+20), same equipment (+15), same compound/isolation (+10), similar fatigueCost ±1 (+10), similar SFR ±1 (+10).

Returns top 3, sorted by SFR desc then fatigue asc. Excludes same exercise and equipment mismatches.

### 9. `calculateTonnage(sets)`

Sum of `weight × actualReps` for all non-warmup sets.

### 10. `getProgressionPath(thisWeekSets, lastWeekSets, units)`

Week-over-week rep comparison per exercise. Returns change indicators.

### 11. `calculatePlates(targetWeight, barWeight, availablePlates)`

Greedy algorithm: subtract bar weight, divide by 2 for each side. Iterate plates `[25, 20, 15, 10, 5, 2.5, 1.25]` largest first.

Returns `{ plates (array per side), totalWeight, sideWeight }`.

### 12. `getStrengthStandard(lift, estimated1RM, bodyWeight)`

For bench / squat / deadlift — 5 levels each (Beginner, Novice, Intermediate, Advanced, Elite) as bodyweight multipliers.

Returns `{ ratio: "X.Yx", label, color }`. Colors: Beginner→textMuted, Novice→textSecondary, Intermediate→success, Advanced→primary, Elite→gold.

---

## 8. Intelligence Engines

> The hypertrophy/recovery engines below are the original set and remain
> current. The **Precision Coaching engine, ED safety system, and the
> food/cardio engines** were added later and are the most important pieces;
> they are documented here at the top. All are deterministic — **no LLM, no
> `Math.random` in any decision path** (verified by grep across the modules).

### Precision Coaching engine (`src/lib/weeklyCoach.js` + `coachApply.js`)

`runWeeklyCoach(inputs)` is a pure function (no I/O, no DB) — it reads the
weekly check-in, 14-day morning weights, sessions completed vs planned, PRs,
goal phase, and current cal/steps/cardio targets, and returns adjustments
that are applied **only after the user taps Apply** (`coachApply.js`).

- **Weight trend:** dual EWMA — safety reads a plain ~10-day EWMA; the
  off-target decision reads a cycle-robust Holt's trend (`robustTrend.js`).
  Rapid-loss / ED / floor logic stay on the plain trend, never the robust one.
- **Data-confidence gate:** <3 weigh-ins → `data_hold` (plan held).
- **Volume/training:** recovery(1–4)×performance(1–4) autoregulation matrix →
  volumeDelta −2..+3; joint pain / illness / injury notes block any push.
- **Calories:** off-target gate (2 high-confidence / 3 low weeks) + 2-week
  cooldown + ±5% cap; fixed step nudges right-sized by adaptive TDEE.
- **Steps** (lowest-fatigue lever) and **cardio** (cut + off-target + steps
  maxed) escalate in order; both pause on poor recovery.
- **Holds** have strict precedence: ED lockout → FFM floor → rapid-loss →
  generic, surfaced as structured `heldDecisions[]`.

Key modules: `weeklyCoach.js`, `coachApply.js` (`computeCalorieTargets`,
`computeMacroCycle`, `computeRefeedDay`, `computeVolumeApply`),
`coachingGoals.js` (incl. `dayCalorieCyclingAllowed`), `robustTrend.js`,
`differentialPaywall.js`, `whyThisTemplates.js` (coach-voice narration).

### ED safety system (`src/lib/` — woven into the nutrition/coach modules)

**Tier-blind by design** — `proGate.js` mandates that guardrails never consult
tier, and no safety module reads it. **Do not modify.**

| Guarantee | Value | Where |
|---|---|---|
| Sex calorie floors | 1500 male / 1200 female | `nutritionEngine.js:789`, `coachApply.js` |
| FFM energy floor | 30 kcal/kg fat-free mass (IOC RED-S) | `computeFFMFloor` `nutritionEngine.js:594` |
| FFM enforcement | blocks cuts only, never raises; ≥5/7 days logged | `weeklyCoach.js:826` |
| Rapid-loss hard gate | −1.5% bodyweight/week (upward-only correction) | `nutritionEngine.js:805`, `weeklyCoach.js:677` |
| Max-safe-loss warning | 0.8% BW/week | `nutritionEngine.js:815` |
| ED-pattern detector | 4 signals; fires ≥2; clears after 2 clean weeks | `edPatternDetector.js` |
| Beat UK signposting | Beat Eating Disorders UK 0808 801 0677 | `wellbeing.js`, `HeldDecisionCard.js` |
| Calm/wellbeing mode | softens UX, gates deficit suggestions | `wellbeing.js` |

### Food / nutrition engines (`src/lib/food/**` + `nutritionEngine.js`)

- **Targets:** `calculateNutritionTargets` (Mifflin/Katch-McArdle → activity
  TDEE → phase adjustment → safety floors); adaptive TDEE
  (`computeAdaptiveTDEEAdjustment`, damped, FFM-clamped).
- **Precision macro solver** (founder 2026-06-23): `mealPlanAssembler.js`
  minimises summed squared %-deviation across kcal/protein/carbs/fat — holds
  all macros to ~1%. Deterministic (seeded mulberry32, not `Math.random`).
- **Calorie banking** (`calorieBank.js`): pure per-day redistribution, weekly
  total held constant, MIN 50 / MAX 500 kcal bump, no day below the safe
  floor (max of sex floor and FFM floor).
- **Grocery list** (`groceryList.js`): `buildGroceryList(plan)` aggregates
  weekly grams per ingredient, sections by macro role.
- **Food DB waterfall** (`waterfall.js`): local SQLite cache → bundled
  OpenFoodFacts snapshot → bundled CoFID → live OpenFoodFacts API → USDA
  FoodData Central; network hits promoted back into local `foods`.
- No reverse-diet feature; the maintenance-restore mechanism is the **diet
  break** (`shouldSuggestDietBreak`, MATADOR-based).

### Cardio engine (`src/lib/cardio/**`)

`cardioEngine.js` (`cutCardioTarget`, `nextCardioTarget` capped at
`MAX_CARDIO_SESSIONS = 5`, `cardioComplianceFromLog`, **`summariseCardioByWeek`**
trend view), `cardioMath.js` (MET-based `estimateCardioKcal` — **feedback only,
never moves the calorie target**), `cardioActivities.js` (37 frozen activities,
2024 Compendium METs). Passive import via `health.js`
(`readCardioSessionsSince`, Pro-gated, de-dups on `ext_id`).

### recoveryEMA (`src/lib/recoveryEMA.js`)

`computeRecoveryEMAs(completedWorkouts)`:

Calculates 7-day half-life exponentially weighted moving averages for session feedback fields:
- `soreness` ← `soreness24hBefore`
- `fatigue` ← `fatigueLevel`
- `joint` ← `jointDiscomfort`

Half-life = 7 days → decay factor `λ = ln(2) / 7`.

Returns `{ soreness: number|null, fatigue: number|null, joint: number|null }` (null if no data).

Used in: `AthleteHubScreen` (RecoveryGauge tiles), `MesocycleBuilderScreen` (active block dashboard).

---

### mesocycle (`src/lib/mesocycle.js`)

**`evaluateAutoReg(feedbackWindow)`:**
Analyzes last 4 workouts' session difficulty, pump, soreness, fatigue, joint comfort.
Returns `{ action, reason }` where action ∈ `'increase'`, `'maintain'`, `'reduce'`, `'deload_now'`.

**`predictDeloadWeek(workouts, activeBlock)`:**
Forecasts when athlete should deload based on recovery signals and block progression.
Returns `{ weeksUntilDeload: number, recommended: boolean }`.

**`applyTimeCrunch(plan, availableMinutes)`:**
Modifies a generated plan to fit a shorter time budget.

**`checkDoubleProgressionReady(exerciseSets, targetRepsMax)`:**
Returns true if all sets in last session hit the top of the rep range.

Used in: `MesocycleBuilderScreen`, `WorkoutSummaryScreen`.

---

### insightsEngine (`src/lib/insightsEngine.js`)

`runInsightsEngine(userId)`:

Generates up to 6 rule-based insights from recent training data. Each insight: `{ id, severity: 'info'|'warning'|'error', title, body, actionLabel?, actionRoute? }`.

Rules include:
1. Volume drop — muscle group below MEV for 2+ weeks
2. No deload — consecutive weeks above MAV without lighter week
3. Staleness — same exercises for 4+ weeks without variation
4. Recovery signal — elevated EMA soreness/fatigue
5. Undertraining — fewer than 2 sessions in last 7 days
6. PR stagnation — no new PRs in 4+ weeks

Dismissed insights stored in AsyncStorage `@volyume_dismissed_insights`. `getActiveInsights(userId)` filters out dismissed IDs.

Used in: `AnalyticsScreen` (InsightStack section).

---

### nutritionEngine (`src/lib/nutritionEngine.js`)

**`calculateNutritionTargets(inputs)`:**

**BMR formulas:**
- Mifflin-St Jeor (no BF): male: `10W + 6.25H - 5A + 5`; female: `10W + 6.25H - 5A - 161`
- Katch-McArdle (with credible BF): `370 + 21.6 * LBM`

**Activity multipliers:** sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9.

**Safety floors:** male ≥ 1500 kcal, female ≥ 1200 kcal. Max loss rate 1.5% BW/week. Warning at 0.8%.

**Protein:** 1.8–2.2 g/kg by goal; aggressive_cut/contest_prep with credible LBM → 2.5 × LBM.

**Fat:** `max(0.25 * targetKcal / 9, 0.5 * weightKg, 30g)`

**Confidence:** dexa/caliper → high, bia → medium, visual/none → low/medium.

**`getPlanNutritionContext(targets)`:**
Returns `{ phaseType, recoveryModifier (0.75–1.15), volumeCeiling, failureExposureLevel, deloadFrequencyWeeks (4–6), explanation }`.

Used in: `NutritionTargetsScreen` (calculate button), `CoachBuilderScreen` (step 6, plan generation).

---

### planEngine (`src/lib/planEngine.js`)

See Section 12 for full details.

Pure function. No Math.random(). ~1200 lines. Deterministic plan generation.

---

### phaseEngine (`src/lib/phaseEngine.js`)

Handles competition phases for strength_performance goal:
- Off-season, Pre-contest, Peaking, Maintenance.
- Modifies volume and rep ranges based on contest proximity.

Used in: `planEngine.js`.

---

### setTypeEngine (`src/lib/setTypeEngine.js`)

Recommends advanced set types (dropsets, myo-reps, rest-pause) based on exercise context, experience level, and recovery capacity.

Used in: `planEngine.js`.

---

### swapEngine (`src/lib/swapEngine.js`)

**`rankSwaps(originalExercise, allExercises, options)`:**

Scoring: same primary muscle (+40), same movement pattern (+20), same equipment (+15), same compound/isolation (+10), similar fatigueCost ±1 (+10), similar SFR ±1 (+10).

**`buildSwapReason(original, substitute)`:** returns ≤20 word plain English explanation.

`numResults` default: 5. Excludes original + `excludeIds`. Optional equipment filter.

Used in: `ActiveWorkoutScreen` (exercise swap modal).

---

### travelMode (`src/lib/travelMode.js`)

Filters and re-weights exercises for bodyweight/minimal equipment constraints.

Used in: `planEngine.js` for bodyweight/home_gym equipment selections.

---

### whyThisTemplates (`src/lib/whyThisTemplates.js`)

String templates for the "Why this plan?" section in `CoachBuilderScreen`.

Returns human-readable explanations keyed by split type, goal, experience, recovery, and nutrition phase.

Used in: `planEngine.js` (constructs `whyThis` object in plan output).

---

## 9. Volume Landmarks System

**File:** `src/lib/algorithms.js` — `VOLUME_LANDMARKS` constant
**Customization stored at:** AsyncStorage `@volyume_landmarks_{userId}`
**UI terminology:** Min (MEV), Target (MAV), Max (MRV) — internal jargon never shown to user

### Default Landmarks (sets per week)

| Muscle | MEV (Min) | MAV (Target) | MRV (Max) |
|---|---|---|---|
| chest | 8 | 12 | 22 |
| back | 10 | 14 | 25 |
| shoulders | 8 | 16 | 26 |
| biceps | 8 | 12 | 26 |
| triceps | 8 | 12 | 26 |
| forearms | 4 | 8 | 20 |
| quads | 8 | 12 | 20 |
| hamstrings | 6 | 10 | 20 |
| glutes | 0 | 4 | 16 |
| calves | 8 | 12 | 20 |
| abs | 0 | 6 | 25 |
| traps | 4 | 8 | 20 |

> glutes MEV=0 and abs MEV=0: these muscles are covered by compound movements; 0 direct sets is acceptable. `muscleStatus()` returns 'good' (not 'none') when totalSets=0 for muscles with mev=0.

### MUSCLE_DISPLAY_NAMES

```javascript
chest→Chest, back→Back, shoulders→Shoulders, biceps→Biceps,
triceps→Triceps, forearms→Forearms, quads→Quads,
hamstrings→Hamstrings, glutes→Glutes, calves→Calves,
abs→Abs, traps→Traps
```

### Volume Status Display Pipeline

1. `getCompletedWorkoutSets(userId)` → filter to rolling window (7/14/28 days)
2. `getAllExercises()` → `exerciseMap = { id: exercise }`
3. `calculateWeeklyVolume(sets, exerciseMap)` → `{ muscle: { workingSets } }`
4. `AsyncStorage.getItem('@volyume_landmarks_{userId}')` → `customLandmarks` (or null)
5. `getVolumeStatus(sets, muscle, customLandmarks)` → `{ color, status, label, landmarks }`
6. Bar fill: `Math.min(sets / mrv, 1) * 100%`
7. Tick marks at `(mev/mrv)*100%` and `(mav/mrv)*100%`

---

## 10. Exercise Data Model

**File:** `src/lib/seedExercises.js`
**AsyncStorage key:** `@volyume_exercises_seeded_v3`
**Count:** 200+ exercises seeded.

### Exercise Seed Format

Each exercise is a tuple:
```javascript
[name, primaryMuscle, secondaryMuscles[], equipment, movementPattern,
 isCompound(bool), minReps, maxReps, fatigueCost(1-5), sfr(1-5)]
```

### Movement Patterns

`horizontal_push`, `vertical_push`, `horizontal_pull`, `vertical_pull`, `squat`, `hinge`, `lunge`, `isolation_curl`, `isolation_extension`, `isolation_lateral`, `isolation_fly`, `isolation_raise`, `core_stability`, `carry`, `hip_thrust`

### Equipment Types

`Barbell`, `Dumbbell`, `Cable`, `Machine`, `Bodyweight`, `Smith Machine`, `Bands`, `EZ Bar`, `Kettlebell`, `Plate`, `Hammer Strength`, `Other`

### Muscle Groups

chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, traps, forearms

### Custom Exercises

Created via `ExerciseLibraryScreen`, `ActiveWorkoutScreen ExercisePickerModal`, or `ManualBuilderScreen ExercisePickerModal`.

Custom: `is_custom=1`, optional `primaryMuscle` + `equipment`, SFR/fatigueCost default to 3.

### Plan Library Seed

**File:** `src/lib/seedRoutines.js`
**AsyncStorage key:** `@volyume_routines_seeded_v4`

Seeds 18 library plan templates (`is_library=1`). The seed:
1. Calls `createProgramme(userId, plan.name, plan.description, 1)` for each plan
2. Calls `createRoutine(..., 1 /*is_active*/, null, programme.id)` per workout day
3. Calls `addExerciseToRoutine(routine.id, exercise.id, i, def.repsMin, def.repsMax, def.notes||null, def.sets, null, def.rest)` per exercise

Library plans are isolated from user plans: `getAllPlansForUser()` filters `is_library = 0 OR is_library IS NULL`.

---

## 11. Workout Session Flow

### 1. Starting a Workout

**From HomeScreen / PlansScreen (active plan):**
```
getActivePlan(userId)
  → getRoutinesForPlan(planId)
  → routine = routines[(nextWorkoutIndex || 0) % count]
  → createWorkout(userId, routineId)           [SQLite INSERT]
  → getRoutineExercisesWithDetails(routineId)  [SQLite JOIN]
  → startWorkout(workout, exercises)           [Zustand]
  → navigate('ActiveWorkout')
```

**From BuildWorkoutScreen (ad-hoc):**
```
createWorkout(userId)                    ← no routineId
startWorkout(workout, initialExercises)  ← user-built exercise list
navigate('ActiveWorkout')
```

**From WorkoutHistory (repeat):**
```
createWorkout(userId, workout.routineId || null)
startWorkout(newWorkout, [])   ← no pre-loaded exercises
navigate('HomeTab > ActiveWorkout')
```

### 2. Logging a Set

`ActiveWorkoutScreen.handleCompleteSet()`:
```
1. Validate: weight > 0 OR reps > 0 required
2. createWorkoutSet({ userId, workoutId, exerciseId, setNumber, setType,
                      weight, actualReps, targetRepsMin, targetRepsMax })  [SQLite INSERT]
3. addSetToCurrentExercise(setData)  [Zustand update]
4. detectPR(newSet, allTimeSetsRef.current + sessionSetsRef.current[exerciseId], exercise, units)
5. If PR → showPRCelebration(pr)  [Zustand → App.js overlay]
6. startRestTimer(routineExercise.restSeconds || 90)
7. If target sets reached && not last exercise:
     setTimeout(→ setCurrentExerciseIndex(next), 1800)
```

### 3. Rest Timer Lifecycle

```
startRestTimer(duration) → restTimerActive=true, restTimerDuration=duration, restTimerRemaining=duration
↓
RestTimer component: progressAnim.setValue(remaining/duration), Animated.timing(→0, remaining*1000ms)
+ setInterval(tickRestTimer, 1000)
↓
At ≤10s: color → warning
At ≤3s: large countdown number + heavy haptic per second
At 0s: notificationAsync(Warning) + double heavy haptic + show "Start next set" for 3s
↓
stopRestTimer() OR new set logged → clear interval + stop animation
```

### 4. Finishing a Workout

`handleFinishWorkout()`:
```
1. durationMinutes = (Date.now() - workoutStartTime) / 60000
2. Compute tonnage, setCount, workingSetCount, exerciseNames
3. updateWorkout(workoutId, {
     endedAt, durationMinutes, isCompleted: true,
     name: exerciseNames[0] || 'Session',
     setCount, totalVolume: tonnage
   })                                          [SQLite UPDATE]
4. endWorkout()                               [Zustand: clears active workout]
5. navigation.replace('WorkoutSummary', {
     workoutId, routineId, durationMinutes,
     exerciseCount, setCount, workingSetCount,
     tonnage, exerciseNames, detectedPRs, exerciseData
   })
```

> **Note:** `updateWorkout({isCompleted: true})` is always awaited before navigating to WorkoutSummary. This means `getCompletedWorkoutSets()` in WorkoutSummary WILL include the just-finished session.

### 5. Post-Workout Flow

`WorkoutSummaryScreen`:
```
1. advancePlanNextWorkout(planId, routineCount)  [SQLite UPDATE next_workout_index]
2. Display stats from route.params
3. Load completed sets via getCompletedWorkoutSets → calculateWeeklyVolume → getVolumeStatus
4. Load auto-reg recommendation (if ≥4 sessions in last 28 days)
5. SESSION FEEDBACK → debounced updateWorkout (1000ms)
6. "Save & Close" → navigate HomeTab
7. Share icon → navigate ShareCard
```

---

## 12. Plan Generation (planEngine / planAutoGen)

**File:** `src/lib/planEngine.js` (pure engine) + `src/lib/planAutoGen.js`
(orchestration + persistence).

> **⚠ The `CoachBuilderScreen` entry point is removed.** Plans are now
> generated through `ProOnboardingScreen` / `ProGoalSetupScreen` (Pro) and
> the Free `FreeStarter` / Plan Library / Manual Builder paths. The
> `planEngine` internals below are current. `planAutoGen.js` also exposes
> **`generatePlanDryRun`** — a read-only twin used by `PlanUpdateScreen` to
> show a before/after diff (`src/lib/planDiff.js`) before committing a rebuild.

### `generatePlan(inputs)`

Pure function. No Math.random(). Deterministic.

**Inputs:**
```javascript
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
beginner: 4–8, intermediate: 8–12, advanced: 10–16, competitive: 12–18
```

**NUTRITION_VOLUME_MOD multipliers:**
```
lean_gain / build: 1.10, maintain / recomp: 1.00, mild_cut: 0.85, aggressive_cut: 0.75
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

Beginners requesting > 4 days are capped to 4 (generates a warning).

### Session Time Estimation

```
estimateWorkoutSeconds():
  5min warmup
  + 30s transitions per exercise
  + exerciseBlockSeconds per exercise

exerciseBlockSeconds = setup + warmupExtra + sets*(work+rest) - trailing rest
setWorkSeconds = (repMin + repMax) / 2 * 3.5s

exerciseSetupSeconds: compound→120s, machine→60s, isolation→40s
```

### Special Passes

- **deduplicateExercises():** removes duplicate exercise names within a session.
- **capSessionVolume():** Phase 1: reduce sets back-to-front to minimum 3. Phase 2: drop exercises from back if still over `SESSION_MAX_SETS`.
- **fitToSessionLength():** same two-phase approach for time budget.
- **applyVTaperBias():** if aesthetic goal, injects lateral raise + rear delt fly if missing.
- **applyStrengthNotes():** adds progression notes to low-rep compounds.

### Output Shape

```javascript
{
  name: string,
  goal: string,
  splitType: string,
  daysPerWeek: number,
  estimatedSessionMinutes: number,
  workouts: [{
    name: string,              // e.g. "Upper A", "Push", "Full Body"
    exercises: [{
      exerciseName: string,
      primaryMuscle: string,
      sets: number,
      repMin: number,
      repMax: number,
      restSeconds: number,
      notes: string | null,
    }]
  }],
  weeklyVolumeSummary: { [muscle]: number },
  personalisationSummary: string,
  whyThis: {
    schedule: string,
    volume: string,
    splits: string,
    progression: string,
    weakPoints?: string,
    goalChoices?: string,
    nutritionImpact?: string,
    recoveryNote?: string,
  },
  warnings: string[],
  nutritionContext: object | null,
}
```

---

## 13. Theme and Design System

**File:** `src/styles/theme.js`

### Colors

| Token | Value | Usage |
|---|---|---|
| `background` | `#0D0D0D` | App background |
| `surface` | `#1A1A1A` | Cards, modals |
| `surface2` | `#242424` | Input backgrounds, secondary surfaces |
| `surface3` | `#2E2E2E` | Bar tracks, dividers |
| `border` | `#333333` | Standard borders |
| `borderLight` | `#404040` | Lighter borders |
| `primary` | `#00E5FF` | Accent cyan — CTAs, highlights |
| `primaryDim` | `#0097A7` | Dimmed primary |
| `primaryBg` | `rgba(0,229,255,0.10)` | Primary tinted backgrounds |
| `errorBg` | `rgba(244,67,54,0.10)` | Error/destructive tinted backgrounds |
| `success` | `#4CAF50` | Optimal volume, positive states |
| `warning` | `#FFC107` | Near-MRV, deload advisory, timer |
| `error` | `#F44336` | Over-MRV, errors, destructive actions |
| `textPrimary` | `#FFFFFF` | Main text |
| `textSecondary` | `#9E9E9E` | Secondary text, labels |
| `textMuted` | `#616161` | Hints, placeholders, below-MEV |
| `textDisabled` | `#424242` | Disabled state |
| `tabBar` | `#111111` | Tab bar background |
| `tabBarBorder` | `#222222` | Tab bar top border |
| `inputBg` | `#1E1E1E` | Text input backgrounds |
| `gold` | `#FFD700` | PR celebration, Elite strength level |
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

### Volume Colors (internal mapping — never shown as jargon)

```
below MEV:  textMuted (#616161) — "Below minimum"
at MEV:     warning (#FFB300)   — "At minimum"
optimal:    success (#4CAF50)   — "Optimal"
near MRV:   warning (#FFC107)   — "Near ceiling"
over MRV:   error (#FF3D00)     — "Over ceiling"
```

### Shadow Presets

Three presets: `shadow.sm`, `shadow.md`, `shadow.lg` — platform-specific (elevation on Android, shadow* on iOS).

### Hit Slop

Standard: `{ top: 12, bottom: 12, left: 12, right: 12 }` — applied to small touch targets.

### Section Header Convention

All section titles: `fontSize.xs`, `fontWeight.black`, `colors.textMuted`, `letterSpacing: 1.5`, uppercase text.

### Card Pattern

`backgroundColor: colors.surface`, `borderRadius: radius.lg`, `padding: spacing.lg`, `borderWidth: 1`, `borderColor: colors.border`.

---

## 14. Authentication and User Flow

**File:** `src/lib/supabase.js`

### Supabase Client

Lazy singleton via `getSupabaseClient()`. Returns `null` if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars are missing.

`isSupabaseConfigured()`: boolean — app functions fully without Supabase.

Session persistence: AsyncStorage (Supabase native React Native adapter).

### Auth Functions

```javascript
getCurrentUser()                    → null if unconfigured
signInWithEmail(email, password)
signUpWithEmail(email, password)
signOut()
resetPassword(email)
upsertUserProfile(userId, profile)  → users_profile table (Supabase cloud)
getUserProfile(userId)
```

### User Flow (current active path)

**Real Supabase account required** — the anonymous local-UUID path
(`initLocalUser`) is removed. `RootNavigator.js` explicitly refuses LOCAL_USER
restore (per `IDENTITY_AND_OWNERSHIP_LOCKED.md`).

1. `WelcomeStack` → `LoginScreen` (email/password, Apple, or Google OAuth).
2. `supabase.auth.onAuthStateChange` `SIGNED_IN` → restore session + profile
   + `firstRunComplete` from the cloud row; resolve `tier` from
   `users_profile.tier` (`refreshTierFromCloud`).
3. Health-consent gate (Article 9) → onboarding (Pro or Free) → `MainTabs`.
4. All DB operations use the authenticated `user.id` as `user_id` in SQLite;
   the `src/lib/sync/` layer syncs to Supabase.

### Sign-out Flow

`clearAuthStateForSignOut()` wipes user/session/tier/profile/firstRun, with a
sync wipe-guard (`signOutGuard.js`) ensuring any in-flight sync writes land
first; back to `WelcomeStack`.

### Delete Account Flow

Calls Supabase RPC `delete_user_data` (server-side). Falls back gracefully if Supabase unconfigured.

---

## 15. Data Flows Between Screens

### Flow: Start Next Workout

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
  → reads workoutExercises from Zustand
  → per set: createWorkoutSet(...)             [SQLite INSERT]
  → addSetToCurrentExercise(...)               [Zustand]
  → on finish: updateWorkout({isCompleted:true, ...})  [SQLite UPDATE]
  → endWorkout()                               [Zustand]
  → navigate('WorkoutSummary', params)

WorkoutSummaryScreen
  → advancePlanNextWorkout(planId, count)      [SQLite UPDATE next_workout_index]
  → getCompletedWorkoutSets(userId) → calculateWeeklyVolume → getVolumeStatus
  → SESSION FEEDBACK → updateWorkout(...)      [SQLite UPDATE, debounced 1s]
```

### Flow: Volume Status (Analytics / Summary / Heatmap)

```
getCompletedWorkoutSets(userId)         [SQLite JOIN workouts on is_completed=1]
  → filter to rolling window (7/14/28 days)
getAllExercises()                        [SQLite]
  → exerciseMap = { id: exercise }
calculateWeeklyVolume(sets, exerciseMap) [algorithms.js]
  → { muscle: { workingSets, reps, tonnage } }
AsyncStorage.getItem('@volyume_landmarks_{userId}')
  → customLandmarks (or null → use VOLUME_LANDMARKS defaults)
getVolumeStatus(sets, muscle, customLandmarks)  [algorithms.js]
  → { color, status, label, landmarks }
Render VolumeBars / VolumeHeatmapScreen rows / VolumeSnapshotGrid
```

### Flow: PR Detection

```
ActiveWorkoutScreen mounts:
  getAllCompletedSetsForExercise(exerciseId, userId) → allTimeSetsRef

Per set logged:
  sessionSetsRef.current[exerciseId].push(newSet)
  detectPR(newSet, [...allTimeSets, ...sessionSets], exercise, units)  [algorithms.js]
  → if PR: showPRCelebration(pr)  [Zustand]

App.js:
  prCelebration from useAppStore()
  → render <PRCelebration pr={prCelebration} onDismiss={hidePRCelebration} />
```

### Flow: Coach Builder → Save Plan

```
CoachBuilderScreen handleSave():
  createProgramme(userId, name, goal, 0)                    [SQLite INSERT programmes]
  → programmeId
  for each workout in generatedPlan.workouts:
    createRoutine(userId, workout.name, ..., programmeId)   [SQLite INSERT routines]
    → routineId
    for each exercise in workout.exercises:
      find exercise by name (case-insensitive) from getAllExercises()
      addExerciseToRoutine(routineId, exerciseId, ...)       [SQLite INSERT routine_exercises]
  if activate:
    setActivePlan(userId, programmeId)                      [SQLite UPDATE programmes]
```

### Flow: Nutrition → Plan Generation

```
NutritionTargetsScreen:
  calculateNutritionTargets(inputs)    [nutritionEngine.js]
  → targets { targetKcal, proteinG, carbsG, fatG, phase, ... }
  AsyncStorage.setItem('@volyume_nutrition_targets', JSON.stringify(targets))

CoachBuilderScreen step 6 / handleGenerate:
  AsyncStorage.getItem('@volyume_nutrition_targets')
  → getPlanNutritionContext(targets)   [nutritionEngine.js]
  → { phaseType, recoveryModifier, volumeCeiling, ... }
  generatePlan({ ...inputs, nutritionPhase, nutritionContext })  [planEngine.js]
  → accounts for volume ceiling and recovery modifier
```

### Flow: Physique Tracking Gate

```
SettingsScreen (useFocusEffect):
  AsyncStorage.getItem('@volyume_physique_tracking_enabled')
  → setPhysiqueEnabled(v === 'true')
  Toggle ON → Alert consent → AsyncStorage.setItem('...', 'true') → setPhysiqueEnabled(true)
  Toggle OFF → AsyncStorage.setItem('...', 'false') → setPhysiqueEnabled(false)

BodyMetricsScreen (useFocusEffect):
  AsyncStorage.getItem('@volyume_physique_tracking_enabled')
  → if null: loading state
  → if 'false': render PhysiqueOptIn only
  → if 'true': load full screen
    → getBodyMetricLog(userId) [SQLite]
    → migrate legacy AsyncStorage entries if @volyume_body_metrics_migrated_{userId} absent
    → render weight trend chart + log form + history
  
  PhysiqueOptIn "Enable" button:
    → AsyncStorage.setItem('@volyume_physique_tracking_enabled', 'true')
    → forces screen to reload (same as Settings toggle)
```

### Flow: Body Metrics Data

```
BodyMetricsScreen "Save" button:
  logBodyMetric(userId, { weightKg, chestCm, shouldersCm, armCm, forearmCm,
                          waistCm, hipsCm, thighCm, hamCm, calfCm, notes })  [SQLite INSERT]
  → refresh getBodyMetricLog(userId)

PRWallScreen strength standards:
  getLatestBodyWeight(userId)  [SQLite: SELECT weight_kg FROM body_metric_log LIMIT 1]
  → if result: show strength standards card
  → if null: show "Add your body weight" prompt

AthleteHubScreen Body Metrics card:
  getBodyMetricLog(userId, 1)  [SQLite: latest entry]
  → show weight + body fat + waist if logged
```

### Flow: Analytics Screen Load

```
useFocusEffect (user.id change)
  ↓
load()
  ├─ Promise.all([
  │   getAllWorkouts(userId)           → workouts[]
  │   getCompletedWorkoutSets(userId) → sets[]
  │   getAllExercises()               → exercises[]
  │ ])
  ├─ exerciseMap = { id → exercise }
  │
  ├─ loadMesocycle(workouts, sets, exMap)
  │   ├─ getAllMesocycles(userId) → find active
  │   └─ calculateTonnage per week → BarChart bars
  │
  ├─ runInsightsEngine(userId) → insights[]
  │
  ├─ loadVolumeSnapshot(sets, exMap)
  │   └─ calculateWeeklyVolume(last7dSets) → muscle volume map
  │
  ├─ computePRsPerWeek(sets, exMap, windowDays) → [prCounts per week]
  │
  ├─ CalendarHeatmap data: { date, count } for 84 days
  │
  └─ recentSessions: filter completed, sort desc, take 3
```

---

## 16. AsyncStorage Keys Reference

| Key | Owner | Contents |
|---|---|---|
| `@volyume_local_user_id` | RootNavigator / Zustand | UUID string |
| `@volyume_exercises_seeded_v3` | seedExercises.js | `"true"` flag |
| `@volyume_routines_seeded_v4` | seedRoutines.js | `"true"` flag (v4 = 18 plans) |
| `@volyume_nutrition_targets` | NutritionTargetsScreen | JSON: full targets object |
| `@volyume_landmarks_{userId}` | VolumeHeatmapScreen | JSON: `{ [muscle]: {mev,mav,mrv} }` |
| `@volyume_physique_tracking_enabled` | SettingsScreen + BodyMetricsScreen | `"true"` or `"false"` |
| `@volyume_body_metrics_migrated_{userId}` | BodyMetricsScreen | `"true"` flag (migration ran) |
| `@volyume_crash_log` | App.js ErrorBoundary | Last crash info string |
| `@volyume_dismissed_insights` | insightsEngine.js | JSON: array of dismissed insight IDs |

> **Removed:** `@volyume_body_metrics_{userId}` — legacy AsyncStorage storage for body metrics. Body metrics now live in `body_metric_log` SQLite table. Migration from this key runs once on first BodyMetricsScreen focus.

---

## 17. Known Gaps and Stage Notes

### Authentication
- **Auth gate disabled.** Login/Onboarding screens work but RootNavigator bypasses them. All users are currently local-only.
- **Supabase sync not active.** Cloud functions exist but SQLite is the sole data store.

### Data Storage
- **Nutrition targets:** stored in AsyncStorage (`@volyume_nutrition_targets`), not the `nutrition_targets` SQLite table. Table exists but is not the primary read path.
- **User body profile:** `user_body_profile` table + `saveUserBodyProfile()` exist but Onboarding only writes to Supabase (`upsertUserProfile`) for non-local users. Local users have no profile in SQLite. Training age comes from `userProfile` Zustand field which is not persisted between sessions.

### Mesocycles
- `mesocycles` table and `MesocycleBuilderScreen` are fully implemented.
- However, the `mesocycle_id` foreign key on `workouts` is never populated in create-workout flows. Mesocycles are purely informational.

### Orphaned Screens
- `RoutinesScreen`, `ProgrammesScreen`, `RoutineBuilderScreen` exist in `src/screens/` but are not registered in any navigator stack. They are superseded by `PlansScreen` + `PlanDetailScreen` + `RoutineDetailScreen`.

### Notifications
- Toggle exists in SettingsScreen with no backend implementation.

### GDPR Consent
- `gdpr_consented` field in `nutrition_targets` SQLite table is not reliably written (AsyncStorage path is primary). Consent is implied by user action but not separately tracked in a durable field.

### Deload Detection
- `shouldDeload()` in `AnalyticsScreen` passes `hasOverMRV: false` hardcoded. Actual volume data could compute this dynamically.

### Workout Templates
- `createWorkoutTemplateFromWorkout()` is limited to non-plan blank sessions. Plan-originated sessions don't offer the template save option.

---

*End of Volyume Technical Architecture Map v2.0.0.*
