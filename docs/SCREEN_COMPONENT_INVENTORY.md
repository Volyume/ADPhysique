# Volyume — Screen & Component Inventory

_Last updated: 2026-05-16. Covers build as of branch `claude/build-volyume-app-srY9C`._

Each entry follows this template:

```
## ScreenName
File: src/screens/ScreenName.js
Route: NavigatorName > RouteName
Entry points: how you arrive
Exit points: where you can go
Actions: what the user can do
Components used: list
Data read: tables/functions
Data written: tables/functions
User-facing copy (verbatim): key labels, headings, button text
Known issues
```

---

## HomeScreen

**File:** `src/screens/HomeScreen.js`
**Route:** HomeStack > Home (Train tab root)

**Entry points:**
- Tab press (Train)
- WorkoutSummary `popToTop()` after saving
- Deep link (future)

**Exit points:**

| Action | Destination |
|--------|-------------|
| "Start Blank Workout" | BuildWorkoutScreen |
| Tap routine card | ActiveWorkoutScreen (starts workout) |
| "Continue Workout" (active workout banner) | ActiveWorkoutScreen |
| Quick nav "History" | ProgressTab > WorkoutHistory |
| Quick nav "Routines" | RoutinesTab (root) |
| Quick nav "Exercises" | RoutinesTab > ExerciseLibrary |

**Actions:**
- Load week stats on mount + focus
- Load routines on mount + focus
- Start blank workout → navigate to BuildWorkout
- Start routine → create workout, load exercises, start in Zustand, navigate to ActiveWorkout
- Continue active workout → navigate to ActiveWorkout

**Components used:** None external (all inline JSX)

**Data read:**
- `getAllWorkouts()` → `workouts` table (week stats, streak, active workout check)
- `getAllRoutines()` → `routines` table
- `getAllRoutineExerciseCounts()` → `routine_exercises` table

**Data written:** None on this screen

**User-facing copy:**

| Element | Copy |
|---------|------|
| Week stats label | "sessions this week" |
| Streak label | "day streak" |
| Section heading | "YOUR ROUTINES" |
| Empty routines | "No routines yet. Go to the Routines tab to create one." |
| Active workout banner | "ACTIVE WORKOUT" |
| Continue button | "Continue Workout" |
| Blank workout button | "Start Blank Workout" |
| Quick nav items | "History", "Routines", "Exercises" |

**Known issues:** None on this screen. "4 sessions" mystery was traced to test data, not a bug.

---

## BuildWorkoutScreen

**File:** `src/screens/BuildWorkoutScreen.js`
**Route:** HomeStack > BuildWorkout

**Entry points:**
- HomeScreen "Start Blank Workout"

**Exit points:**

| Action | Destination |
|--------|-------------|
| "Skip Setup" | ActiveWorkoutScreen (replace) |
| "Start Training (N)" | ActiveWorkoutScreen (replace) |
| Back button | HomeScreen |

**Actions:**
- Add exercises via ExercisePickerModal
- Configure sets (stepper ±1, 1–20)
- Configure repsMin / repsMax (text input)
- Configure rest time (stepper ±15s, 30s–600s)
- Configure starting weight (text input, kg)
- Remove exercise (swipe or delete button)
- Skip setup → creates workout immediately, no exercise config
- Start Training → creates workout + `routineExercise` objects (transient, not saved to routines table), navigates to ActiveWorkout

**Components used:** ExercisePickerModal (inline)

**Data read:**
- `getAllExercises()` → `exercises` table (for picker)

**Data written:**
- `createWorkout()` → `workouts` table
- Calls `startWorkout(workout, exercises)` in Zustand (no separate DB write for transient routine exercises)

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header left | "Skip Setup" |
| Header center | "Build Workout" |
| Section heading | "EXERCISES" |
| Empty state | "Add exercises to get started" |
| Add exercise button | "+ Add Exercise" |
| Sets label | "Sets" |
| Reps label | "Reps" |
| Rest label | "Rest" |
| Starting weight label | "Starting Weight (kg)" |
| Rest format | "30s", "1m", "1m 30s", etc. |
| Start button | "Start Training (N)" where N = exercise count |
| Start button disabled label | "Start Training" |

**Known issues:** None

---

## ActiveWorkoutScreen

**File:** `src/screens/ActiveWorkoutScreen.js`
**Route:** HomeStack > ActiveWorkout

**Entry points:**
- BuildWorkoutScreen "Start Training" or "Skip Setup"
- HomeScreen routine card tap
- HomeScreen "Continue Workout"
- RoutinesScreen Start button
- RoutineDetailScreen "Start Routine"
- WorkoutHistoryScreen "Repeat" (🐛 broken — navigates from wrong stack)

**Exit points:**

| Action | Destination |
|--------|-------------|
| "Finish Workout" | WorkoutSummaryScreen |
| "Discard Workout" (confirm modal) | HomeScreen |
| Stale workout modal dismiss | continues workout |

**Actions:**
- Navigate between exercises (swipe or chevron)
- Add exercise (ExercisePickerModal)
- Adjust weight (stepper ±2.5 or text input)
- Adjust reps (stepper ±1 or text input)
- Change set type (bottom sheet: Working / Warm-up / Drop Set)
- Complete set → saves to DB, starts rest timer, checks for PR, updates `lastActivityAt`
- Delete set (swipe)
- Finish workout → calculates summary params, navigates to WorkoutSummary
- Discard workout (confirm modal)
- Stale workout check (>4h inactivity → modal)

**Components used:**
- `RestTimer`
- `SetEntry`
- `PRCelebration` (overlay on PR)
- ExercisePickerModal (inline)

**Data read:**
- `getWorkoutSetsForExercise(exerciseId)` → `workout_sets` + `workouts` (previous performance)
- `getAllExercises()` (for picker)
- Zustand: `workoutExercises`, `workoutStartTime`, `lastActivityAt`, `restTimerActive`

**Data written:**
- `addWorkoutSet()` → `workout_sets` table
- `updateWorkoutSet()` → `workout_sets` table (set type changes)
- `deleteWorkoutSet()` → `workout_sets` table
- `updateWorkout()` → `workouts` table (`lastActivityAt`, `activeElapsedSeconds`, `isCompleted`, `durationMinutes`, etc.)
- Zustand: `updateLastActivity()`, `startRestTimer()`, `endWorkout()`

**User-facing copy:**

| Element | Copy |
|---------|------|
| Finish button | "Finish Workout" |
| Add exercise button | "+ Add Exercise" |
| Complete set button | "✓ COMPLETE SET" |
| Target banner (in progress) | "X / Y working sets" |
| Target banner (complete) | "Target Complete ✓" |
| Extra set button | "COMPLETE EXTRA SET" |
| Set type label | "Working · Change", "Warm-up · Change", "Drop Set · Change" |
| Previous performance heading | "LAST TIME" |
| Stale modal title | "Resume Workout?" |
| Stale modal body | "This workout was paused over 4 hours ago. Do you want to continue or discard it?" |
| Stale modal buttons | "Continue", "Discard" |
| Discard confirm title | "Discard Workout?" |
| Discard confirm body | "All logged sets will be lost." |
| Discard confirm buttons | "Cancel", "Discard" |

**Known issues:**
- `WorkoutHistoryScreen` "Repeat" navigates to `ActiveWorkout` from ProgressStack — route not registered there. Crashes or silently fails.

---

## WorkoutSummaryScreen

**File:** `src/screens/WorkoutSummaryScreen.js`
**Route:** HomeStack > WorkoutSummary AND ProgressStack > WorkoutSummary

**Entry points:**
- ActiveWorkoutScreen "Finish Workout" (with full params)
- WorkoutHistoryScreen row tap (read-only mode, no feedback form)

**Exit points:**

| Action | Destination |
|--------|-------------|
| "Save" / back | `navigation.popToTop()` → HomeScreen (if in HomeStack) or WorkoutHistory (if in ProgressStack) |

**Actions:**
- View workout stats (exercises, working sets, duration, total volume)
- View per-muscle volume status for this week
- View auto-reg recommendations
- Fill in difficulty/pump/soreness/fatigue/joint feedback (1–10 sliders)
- Save feedback → writes to workout row

**Components used:** None external

**Data read:**
- Route params: `workoutId`, `durationMinutes`, `exerciseCount`, `setCount`, `workingSetCount`, `tonnage`, `exerciseNames`
- `getAllWorkouts()` (for `completedWorkoutCount` check — BUG: counts all time)
- `getWorkoutSetsForExercise()` (for weekly volume post-session)

**Data written:**
- `updateWorkout(workoutId, { difficulty, pumpQuality, sorenessIn, fatigue, jointDiscomfort })` → `workouts` table

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Workout Complete" |
| Stats labels | "Exercises", "Working Sets", "Duration", "Total Volume" |
| Section heading | "THIS WEEK AFTER SESSION" |
| Section heading | "RECOMMENDATIONS" |
| Insufficient data message | "Complete at least 4 sessions to get personalised recommendations." |
| Feedback section | "HOW DID IT FEEL?" |
| Feedback labels | "Difficulty", "Pump quality", "Soreness coming in", "Fatigue", "Joint discomfort" |
| Save button | "Save & Finish" |

**Known issues:**
- `completedWorkoutCount` counts ALL historical workouts, not recent ones. Users with any 4 past sessions always see recommendations even with no recent data.

---

## WorkoutHistoryScreen

**File:** `src/screens/WorkoutHistoryScreen.js`
**Route:** ProgressStack > WorkoutHistory

**Entry points:**
- AnalyticsScreen "Workout History" card
- HomeScreen quick nav "History"

**Exit points:**

| Action | Destination |
|--------|-------------|
| Tap session card | WorkoutSummaryScreen (read-only) |
| "Repeat" button on card | ActiveWorkoutScreen (🐛 broken — not in ProgressStack) |

**Actions:**
- View list of all completed workouts (newest first)
- Tap session to view summary
- Tap "Repeat" to re-run the same workout

**Components used:** None external

**Data read:**
- `getAllWorkouts()` → `workouts` table, filtered `w.isCompleted`, sorted desc

**Data written:** None (repeat creates new workout via navigation)

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Workout History" |
| Empty state | "No completed workouts yet." |
| Card date format | e.g., "Monday, 12 May" |
| Card secondary | "{durationMinutes} min · {setCount} sets" |
| Repeat button | "Repeat" |

**Known issues:**
- Card shows `{setCount} sets` which includes warm-ups. Should say "working sets" or show `workingSetCount`.
- "Repeat" navigates to `ActiveWorkout` from ProgressStack — that route does not exist in ProgressStack.

---

## RoutinesScreen

**File:** `src/screens/RoutinesScreen.js`
**Route:** RoutinesStack > Routines (Routines tab root)

**Entry points:**
- Tab press (Routines)
- HomeScreen quick nav "Routines"

**Exit points:**

| Action | Destination |
|--------|-------------|
| Tap My Routine row / "…" Edit | RoutineDetailScreen |
| Tap Sample Routine chevron | RoutineDetailScreen |
| My Routine "Start" | ActiveWorkoutScreen (via `HomeTab > ActiveWorkout`) |
| Sample Routine "Start" | ActiveWorkoutScreen (via `HomeTab > ActiveWorkout`) |
| "Create Routine" button | RoutineDetailScreen (new) |

**Actions:**
- View My Routines (non-sample) and Sample Routines separately
- Start routine → loads exercises, `startWorkout()`, cross-tab navigate
- Duplicate routine
- Delete routine (confirm)
- Create new routine

**Components used:** None external

**Data read:**
- `getAllRoutines()` → `routines` table
- `getAllRoutineExerciseCounts()` → `routine_exercises` table

**Data written:**
- `duplicateRoutine()` → `routines` + `routine_exercises`
- `deleteRoutine()` → `routines` (cascade deletes `routine_exercises`)

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Routines" |
| My Routines heading | "MY ROUTINES" |
| Sample Routines heading | "SAMPLE ROUTINES" |
| Empty my routines | "No routines yet." |
| Create button | "+ Create Routine" |
| Context menu | "Edit", "Duplicate", "Delete" |
| Start button | "Start" |
| Delete confirm | "Delete '{name}'? This cannot be undone." |

**Known issues:**
- Sample routine names are stored with `[SAMPLE]` prefix in DB and stripped on display. This is fragile — any routine starting with `[SAMPLE]` would be mis-categorised.

---

## RoutineDetailScreen

**File:** `src/screens/RoutineDetailScreen.js`
**Route:** RoutinesStack > RoutineDetail

**Entry points:**
- RoutinesScreen row tap / Edit
- RoutinesScreen "Create Routine"

**Exit points:**

| Action | Destination |
|--------|-------------|
| Add Exercise | ExerciseLibraryScreen |
| Tap exercise info icon | ExerciseDetailScreen |
| "Start Routine" | ActiveWorkoutScreen (via `HomeTab > ActiveWorkout`) |
| Back | RoutinesScreen |

**Actions:**
- Edit routine name
- Add/remove exercises
- Reorder exercises (drag handle)
- Configure per-exercise: sets, repsMin, repsMax, rest time, starting weight, notes
- Start routine
- Save changes

**Components used:** None external

**Data read:**
- `getRoutine(routineId)` → `routines` table
- `getRoutineExercises(routineId)` → `routine_exercises` + `exercises` JOIN

**Data written:**
- `updateRoutine(id, data)` → `routines` table
- `updateRoutineExercise(id, data)` → `routine_exercises` table
- `addExerciseToRoutine(...)` → `routine_exercises` table
- `removeExerciseFromRoutine(id)` → `routine_exercises` table

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | Routine name (editable inline) |
| Section heading | "EXERCISES" |
| Empty | "No exercises yet. Add some!" |
| Add button | "+ Add Exercise" |
| Exercise config labels | "Sets", "Reps", "Rest", "Starting Weight (kg)" |
| Rest format | Same as BuildWorkoutScreen |
| Start button | "Start Routine" |
| Info button tooltip | (none — navigates to ExerciseDetail) |

**Known issues:** None

---

## ExerciseLibraryScreen

**File:** `src/screens/ExerciseLibraryScreen.js`
**Route:** RoutinesStack > ExerciseLibrary

**Entry points:**
- RoutineDetailScreen "Add Exercise"
- HomeScreen quick nav "Exercises"

**Exit points:**

| Action | Destination |
|--------|-------------|
| Tap exercise row | ExerciseDetailScreen (browse mode) OR back with selection (add-to-routine mode) |
| Back | Caller screen |

**Actions:**
- Search exercises by name
- Filter by muscle group
- Filter by equipment
- Select exercise (if in selection mode for routine)

**Components used:** None external

**Data read:**
- `getAllExercises()` → `exercises` table

**Data written:** None

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Exercise Library" |
| Search placeholder | "Search exercises..." |
| Filter labels | Muscle group chips, equipment chips |
| Empty search | "No exercises found." |

**Known issues:** None

---

## ExerciseDetailScreen

**File:** `src/screens/ExerciseDetailScreen.js`
**Route:** RoutinesStack > ExerciseDetail

**Entry points:**
- ExerciseLibraryScreen row tap
- RoutineDetailScreen info icon

**Exit points:**

| Action | Destination |
|--------|-------------|
| Back | Caller screen |

**Actions:**
- View exercise description, muscle groups, equipment
- View 8-session history chart (weight vs session)
- View PRs for this exercise
- View suggested substitutes

**Components used:** None external (inline chart)

**Data read:**
- `getExercise(id)` → `exercises` table
- `getWorkoutSetsForExercise(id)` → `workout_sets` + `workouts` JOIN

**Data written:** None

**User-facing copy:**

| Element | Copy |
|---------|------|
| Tabs | "History", "PRs", "About" |
| Empty history | "No sets logged for this exercise yet." |
| PRs heading | "Personal Records" |

**Known issues:** None

---

## AnalyticsScreen

**File:** `src/screens/AnalyticsScreen.js`
**Route:** ProgressStack > Analytics (Progress tab root)

**Entry points:**
- Tab press (Progress)

**Exit points:**

| Action | Destination |
|--------|-------------|
| "Workout History" card | WorkoutHistoryScreen |
| "Volume Heatmap" card | VolumeHeatmapScreen |
| "PR Wall" card | PRWallScreen |
| "Body Metrics" card | BodyMetricsScreen |

**Actions:**
- View weekly stats grid
- View deload warning (if triggered)
- Navigate to deep-dive screens

**Components used:** None external

**Data read:**
- `getAllWorkouts()` → `workouts` table
- `getAllWorkoutSets()` → `workout_sets` table (for weekly volume — BUG: includes incomplete workouts)

**Data written:** None

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Progress" |
| Stats section | "THIS WEEK" |
| Deload warning | "Deload Recommended" + explanation text |
| Deep dive section | "DEEP DIVE" |
| Cards | "Workout History", "Volume Heatmap", "PR Wall", "Body Metrics" |

**Known issues:**
- Weekly volume includes sets from incomplete/abandoned workouts.

---

## VolumeHeatmapScreen

**File:** `src/screens/VolumeHeatmapScreen.js`
**Route:** ProgressStack > VolumeHeatmap

**Entry points:**
- AnalyticsScreen "Volume Heatmap" card

**Exit points:** Back to AnalyticsScreen

**Actions:**
- View per-muscle volume bars vs MEV/MAV/MRV
- Edit personal landmarks (form per muscle)
- Reset landmarks to defaults

**Components used:** None external

**Data read:**
- `getAllWorkoutSets()` (BUG: includes incomplete workouts)
- AsyncStorage `@volyume_landmarks_{userId}`

**Data written:**
- AsyncStorage `@volyume_landmarks_{userId}` (on save landmarks)

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Volume Heatmap" |
| Legend | "MEV", "MAV", "MRV" |
| Status chips | "Below target", "Minimum stimulus", "Growth range", "Near recovery ceiling", "Recovery debt" |
| Edit section | "EDIT LANDMARKS" |
| Muscle labels | "Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Biceps", "Triceps", "Calves" |
| Reset button | "Reset to Defaults" |

**Known issues:**
- Volume bars include sets from incomplete workouts.

---

## PRWallScreen

**File:** `src/screens/PRWallScreen.js`
**Route:** ProgressStack > PRWall

**Entry points:**
- AnalyticsScreen "PR Wall" card

**Exit points:** Back to AnalyticsScreen

**Actions:**
- View all-time PRs per exercise
- View estimated 1RM

**Components used:** None external

**Data read:**
- `getAllWorkoutSets()` → `workout_sets` + exercises JOIN
- `calculate1RM()` from `algorithms.js`

**Data written:** None

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "PR Wall" |
| Empty state | "No personal records yet. Start logging!" |
| PR labels | "Best set", "Est. 1RM" |

**Known issues:** None

---

## BodyMetricsScreen

**File:** `src/screens/BodyMetricsScreen.js`
**Route:** ProgressStack > BodyMetrics

**Entry points:**
- AnalyticsScreen "Body Metrics" card

**Exit points:** Back to AnalyticsScreen

**Actions:**
- Log bodyweight
- Log measurements (chest, waist, hips, etc.)
- View bodyweight chart

**Components used:** None external

**Data read/written:**
- `body_metrics` table

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Body Metrics" |

**Known issues:** None critical identified

---

## SettingsScreen

**File:** `src/screens/SettingsScreen.js`
**Route:** ProfileStack > Settings (You tab root)

**Entry points:**
- Tab press (You)

**Exit points:**

| Action | Destination |
|--------|-------------|
| "Manage Routines" | 🐛 `navigate('RoutineBuilder')` — route does not exist |
| "Volume Heatmap" | 🐛 `navigate('AnalyticsTab', { screen: 'VolumeHeatmap' })` — tab name wrong (should be `ProgressTab`) |
| "Mesocycle" | MesocycleBuilderScreen ✅ |
| Sign out | LoginScreen |

**Actions:**
- View/edit profile (name, units)
- Navigate to routine management
- Navigate to volume heatmap
- Navigate to mesocycle builder
- Sign out
- Data export (UI only)

**Components used:** None external

**Data read:**
- Zustand `currentUser`
- AsyncStorage (unit preference)

**Data written:**
- AsyncStorage (unit preference)
- Supabase (profile updates)

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Settings" |
| Sections | "PROFILE", "TRAINING", "DATA", "ACCOUNT" |
| Nav items | "Manage Routines", "Volume Heatmap", "Mesocycle Planner", "Export Data", "Sign Out" |
| Units toggle | "kg / lbs" |

**Known issues:**
- `navigate('RoutineBuilder')` — this route does not exist. Should navigate to `RoutinesTab`.
- `navigate('AnalyticsTab', ...)` — tab is named `ProgressTab` in RootNavigator. Navigation silently fails.

---

## MesocycleBuilderScreen

**File:** `src/screens/MesocycleBuilderScreen.js`
**Route:** ProfileStack > MesocycleBuilder

**Entry points:**
- SettingsScreen "Mesocycle Planner"

**Exit points:** Back to SettingsScreen

**Actions:**
- Create/edit mesocycle (name, start date, end date, goal)
- View current mesocycle progress

**Data read/written:**
- `mesocycles` table via SQLite

**Known issues:** None critical identified

---

## LoginScreen

**File:** `src/screens/LoginScreen.js`
**Route:** AuthStack > Login

**Entry points:**
- App launch (unauthenticated)

**Exit points:**

| Action | Destination |
|--------|-------------|
| Sign in success | HomeScreen (MainTabs) |
| Sign up success | OnboardingScreen |

**User-facing copy:**

| Element | Copy |
|---------|------|
| Header | "Volyume" |
| Sign in button | "Sign In" |
| Sign up button | "Sign Up" |
| Apple button | "Continue with Apple" |
| Google button | "Continue with Google" |

**Known issues:** Apple/Google OAuth requires developer credentials not yet configured.

---

## OnboardingScreen

**File:** `src/screens/OnboardingScreen.js`
**Route:** AuthStack > Onboarding

**Entry points:**
- LoginScreen sign up

**Exit points:**
- Step 4 complete → HomeScreen

**Actions:**
- 4-step flow: name → goal → experience → equipment
- Saves to Supabase `users_profile` on complete

**Known issues:** None

---

## Components

### RestTimer

**File:** `src/components/RestTimer.js`

| Property | Value |
|----------|-------|
| Purpose | Countdown timer after completing a set |
| Shown when | `restTimerActive = true` in Zustand |
| Dismissed when | Timer expires OR user taps "Skip" |
| Done banner | Shows "Start next set" for 3s after timer reaches 0 |
| Haptics | Heavy at 3, 2, 1s remaining; Warning + 2× Heavy at 0 |
| Countdown display | Large single digit for last 3s; `M:SS` format otherwise |

**Known issues:** None

### SetEntry

**File:** `src/components/SetEntry.js`

| Property | Value |
|----------|-------|
| Purpose | Single set row: weight + reps inputs with steppers |
| Weight stepper | ±2.5 kg, range 0–500 |
| Reps stepper | ±1, range 1–100 |
| Set type | Shown as chip: "Working · Change" / "Warm-up · Change" / "Drop Set · Change" |
| No RIR/RPE fields | Intentional (advanced setting only, Phase 2) |

**Known issues:** None

### PRCelebration

**File:** `src/components/PRCelebration.js`

| Property | Value |
|----------|-------|
| Purpose | Full-screen overlay on PR detection |
| Trigger | `detectPR()` returns `isPR: true` after set save |
| Duration | ~2s visible, then auto-dismiss |
| Effects | Haptic triple-pulse + confetti animation |

**Known issues:** None

### PlateCalculator

**File:** `src/components/PlateCalculator.js`

| Property | Value |
|----------|-------|
| Purpose | In-context plate math (shows which plates to load) |
| Trigger | Accessible from SetEntry weight row |

**Known issues:** None critical identified

### ExerciseCard

**File:** `src/components/ExerciseCard.js`

| Property | Value |
|----------|-------|
| Purpose | Single exercise row in search results / library |
| Shows | Exercise name, primary muscle, equipment icon |

**Known issues:** None
