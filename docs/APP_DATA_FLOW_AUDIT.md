# Volyume — App Data Flow Audit

_Last updated: 2026-05-16. Covers the build as it existed in May 2026
on the now-retired `claude/build-volyume-app-srY9C` branch._

> **Stale relative to current state.** Active branch is now `main`
> (also the GitHub default branch as of 2026-05-26). The food data
> layer, the FFM floor, Move #2 ED-pattern detection, Move #3 upward
> gate compression, Move #4 differential paywall, and the cascade /
> payment surface all postdate this audit. For the canonical map of
> shipped surfaces, see `HANDOFF.md` section 4 (functionality by area)
> and section 11 (56-screen inventory). Refresh as a follow-up pass
> when the next big surface rework happens.

This document maps every visible metric and data display to its source: which function computes it, which table(s) it reads, what filters are applied, and whether the logic is correct.

---

## Legend

| Symbol | Meaning |
|--------|--------|
| ✅ | Logic is correct |
| ⚠️ | Logic works but has a known edge case or UX concern |
| 🐛 | Bug — output is wrong or misleading |

---

## HomeScreen Metrics

### "X sessions this week"

| Field | Value |
|-------|-------|
| Displayed as | `{weekStats.sessions} sessions` |
| Source function | `loadWeekStats()` in HomeScreen |
| Reads from | `getAllWorkouts()` → SQLite `workouts` table |
| Filter | `w.startedAt >= weekAgo && w.isCompleted` |
| `weekAgo` definition | `Date.now() - 7 * 24 * 60 * 60 * 1000` |
| `isCompleted` type | INTEGER 0/1 in SQLite; truthy check in JS |
| Status | ✅ |
| Notes | `isCompleted` is stored as integer; JS truthy check on `1` works correctly. Rolling 7-day window (not calendar week Mon–Sun). |

### "X day streak"

| Field | Value |
|-------|-------|
| Displayed as | `{weekStats.streak} day streak` |
| Source function | `loadWeekStats()` in HomeScreen |
| Reads from | `getAllWorkouts()` → SQLite `workouts` table |
| Filter | `w.isCompleted`, sorted descending by `startedAt`, streak counted backwards from today |
| Status | ⚠️ |
| Notes | Streak resets if no workout on a given calendar day. Does not account for rest days being intentional (deload weeks will break streak). |

### Routine cards (quick start)

| Field | Value |
|-------|-------|
| Displayed as | Routine name + exercise count |
| Source function | `loadRoutines()` in HomeScreen |
| Reads from | `getAllRoutines()` + `getAllRoutineExerciseCounts()` → SQLite `routines` + `routine_exercises` tables |
| Filter | All routines for current user (`userId = currentUser.id`) |
| Status | ✅ |

---

## ActiveWorkoutScreen Metrics

### Previous performance (inline per exercise)

| Field | Value |
|-------|-------|
| Displayed as | Previous set rows above current set inputs |
| Source function | `loadPreviousPerformance(exerciseId)` in ActiveWorkoutScreen |
| Reads from | `getWorkoutSetsForExercise(exerciseId)` → SQLite `workout_sets` + `workouts` JOIN |
| Filter | `w.isCompleted = 1`, ordered by `ws.id DESC`, takes the most recent completed workout |
| Status | ✅ |
| Notes | Shows weight, reps for each set from the prior session. Does not show set type labels. |

### Progression suggestion (inline per set)

| Field | Value |
|-------|-------|
| Displayed as | Small text suggestion e.g. "Try 62.5 kg × 10" |
| Source function | `getProgressionSuggestion(currentSet, prevWorkoutSets)` in `algorithms.js` |
| Algorithm | Double progression: if RIR ≤ 1 for all sets in previous session → increase weight by 2.5 kg; if RIR ≥ 3 on any set → hold weight |
| RIR source | `s.rir ?? 2` — uses stored RIR if present, defaults to 2 internally |
| Status | ⚠️ |
| Notes | Default RIR of 2 is never shown to user. Users who log no RIR will always get suggestions based on RIR=2 assumption, which may not reflect actual difficulty. |

### Target sets progress banner

| Field | Value |
|-------|-------|
| Displayed as | "X / Y working sets" or green "Target Complete" banner |
| Source | `routineExercise.recommendedSets` vs `loggedSets.filter(s => s.setType !== 'warmup').length` |
| Status | ✅ |
| Notes | Warm-up sets are correctly excluded from working set count. |

### Rest timer

| Field | Value |
|-------|-------|
| Displayed as | RestTimer component: countdown bar + time display |
| Source | `restTimerDuration` from Zustand store; set via `startRestTimer(routineExercise?.restSeconds || 90)` |
| Default | 90 seconds if no per-exercise `restSeconds` configured |
| Status | ✅ |

### Elapsed workout time

| Field | Value |
|-------|-------|
| Displayed as | `MM:SS` timer in header |
| Source | Local `useState(elapsedSeconds)` + `setInterval` every 1000ms |
| Initialised from | `Math.floor((Date.now() - workoutStartTime) / 1000)` where `workoutStartTime` is from Zustand |
| Status | ✅ |
| Notes | Timer persists across app foreground/background because it re-calculates from `workoutStartTime` on mount. |

---

## WorkoutSummaryScreen Metrics

### Working sets count

| Field | Value |
|-------|-------|
| Displayed as | "N Working Sets" in stats grid |
| Source | `workingSetCount` route param passed from ActiveWorkoutScreen `handleFinishWorkout()` |
| Calculation | `sets.filter(s => s.setType !== 'warmup').length` in ActiveWorkoutScreen |
| Status | ✅ |
| Fallback | `displayWorkingSets = workingSetCount ?? setCount ?? 0` — if param missing, falls back to total set count |

### Total volume (tonnage)

| Field | Value |
|-------|-------|
| Displayed as | "N kg Total Volume" in stats grid |
| Source | `tonnage` route param from ActiveWorkoutScreen `handleFinishWorkout()` |
| Calculation | `calculateTonnage(sets)` in `algorithms.js` — sums `weight × reps` for hard sets only (`setType !== 'warmup'`) |
| Status | ✅ |

### This week's volume after session

| Field | Value |
|-------|-------|
| Displayed as | Per-muscle rows with volume status label (color-coded) |
| Source function | Reads all workout sets from SQLite for current week; calls `calculateWeeklyVolume()` + `getVolumeStatus()` |
| Filter | Uses current week (rolling 7 days) + includes the just-finished workout |
| Status | ✅ |

### Auto-regulation recommendations

| Field | Value |
|-------|-------|
| Displayed as | Bullet-point text suggestions |
| Source function | `getAutoRegSuggestion(feedback, weeklyVolumes)` in `algorithms.js` |
| Inputs | User-filled difficulty/pump/soreness/fatigue/joint feedback sliders (1–10) |
| Minimum sessions check | `completedWorkoutCount < 4` → shows "Not enough data (need 4+ sessions)" |
| **BUG** | `completedWorkoutCount` = `allWorkouts.filter(w => w.isCompleted).length` — counts ALL time, not just recent sessions. A user with 4+ old sessions always bypasses the minimum even on a fresh mesocycle. |
| Status | 🐛 |
| Fix suggestion | Use `allWorkouts.filter(w => w.isCompleted && w.startedAt >= 4weeksAgo).length` |

---

## WorkoutHistoryScreen Metrics

### Set count per session card

| Field | Value |
|-------|-------|
| Displayed as | "{setCount} sets" label on each session card |
| Source | `workout.setCount` stored on the `workouts` row (incremented on set save) |
| **BUG** | `setCount` includes warm-up sets. Card label says "sets" not "working sets". |
| Status | 🐛 |
| Fix suggestion | Display `workingSetCount` (also stored) or qualify label as "total sets incl. warm-ups" |

### Duration per session card

| Field | Value |
|-------|-------|
| Displayed as | "{durationMinutes} min" |
| Source | `workout.durationMinutes` stored on workout completion |
| Status | ✅ |

---

## VolumeHeatmapScreen Metrics

### Weekly sets per muscle

| Field | Value |
|-------|-------|
| Displayed as | Color-coded horizontal bar per muscle group |
| Source function | `calculateWeeklyVolume(sets)` in `algorithms.js` |
| **BUG** | Loads ALL sets from `getWorkoutSetsForExercise()` for each exercise — does NOT filter to completed workouts only. An abandoned/in-progress workout contributes to the heatmap. |
| Filter actually needed | Should filter: `w.isCompleted = 1 AND w.started_at >= 7 days ago` |
| Status | 🐛 |
| Fix suggestion | In VolumeHeatmapScreen, filter sets to those belonging to completed workouts started within the rolling 7-day window. |

### MEV/MAV/MRV landmarks

| Field | Value |
|-------|-------|
| Displayed as | Vertical tick marks on the bar |
| Source | AsyncStorage key `@volyume_landmarks_{userId}`; falls back to defaults in `algorithms.js` `VOLUME_LANDMARKS` |
| Defaults | chest {mev:6, mav:14, mrv:22}, back {10,18,25}, shoulders {8,18,26}, quads {8,16,20}, hamstrings {6,12,16}, glutes {4,12,16}, biceps {6,14,20}, triceps {4,12,16}, calves {8,16,20} |
| Status | ✅ |

### Volume status label

| Field | Value |
|-------|-------|
| Displayed as | "Growth range" / "Near recovery ceiling" / etc. color chip |
| Source function | `getVolumeStatus(weeklyVolume, muscle, landmarks)` in `algorithms.js` |
| Thresholds | `< mev` → "Below target" (gray); `mev..mav` → "Minimum stimulus" (blue); `mav..mrv` → "Growth range" (green); `mrv..mrv+4` → "Near recovery ceiling" (amber); `> mrv+4` → "Recovery debt" (red) |
| Status | ✅ |

---

## AnalyticsScreen Metrics

### Weekly volume grid

| Field | Value |
|-------|-------|
| Displayed as | Sets per muscle this week (condensed list) |
| Source function | Same as VolumeHeatmapScreen — `calculateWeeklyVolume()` |
| **BUG** | Inherits same bug: includes sets from incomplete workouts |
| Status | 🐛 |

### Deload warning

| Field | Value |
|-------|-------|
| Displayed as | Amber warning banner "Deload Recommended" |
| Source function | `shouldDeload(last4WeeksData)` in `algorithms.js` |
| Inputs | Last 4 weeks of `weeklyVolume` snapshots |
| Status | ⚠️ |
| Notes | If user has fewer than 4 weeks of data, deload warning never fires (intentional). |

---

## HomeScreen — "Sessions" vs "Streak" Edge Cases

| Scenario | Sessions count | Streak count | Expected? |
|----------|---------------|--------------|----------|
| 2 workouts same day | 2 | 1 | ⚠️ Streak only counts unique calendar days |
| Deload week (intentional rest) | 0 | 0 | ⚠️ Streak breaks even on intended rest |
| Workout started at 11:58pm, ended 12:02am | Counted in day started | Streak counts day started | ✅ |

---

## Algorithms.js — Core Logic Summary

| Algorithm | Function | Key inputs | Key output | Status |
|-----------|----------|-----------|-----------|--------|
| Weekly volume | `calculateWeeklyVolume(sets)` | Array of set objects with muscle mappings | `{muscle: hardSetCount}` | ✅ Secondary muscles credited at 0.5 |
| Progression suggestion | `getProgressionSuggestion(currentSet, prevSets)` | Current set config, previous workout sets | Weight/rep suggestion string | ⚠️ Uses RIR=2 default silently |
| PR detection | `detectPR(newSet, historicalSets)` | New set, all historical sets for exercise | `{isPR: bool, type: string}` | ✅ |
| 1RM estimate | `calculate1RM(weight, reps)` | Weight, reps | Estimated 1RM in same unit | ✅ Ensemble Epley/Brzycki |
| Volume status | `getVolumeStatus(weeklyVolume, muscle)` | Set count, muscle name | Status string + color | ✅ |
| Auto-reg suggestion | `getAutoRegSuggestion(feedback, volumes)` | Feedback sliders, weekly volumes | Text advice | ✅ Input only from completed sessions |
| Deload detection | `shouldDeload(last4Weeks)` | 4-week volume history | Boolean | ⚠️ Needs 4 data points |
| Exercise substitutes | `getExerciseSubstitutes(ex, all, equipment)` | Exercise, library, user equipment | Ranked substitute array | ✅ SFR-ranked |
| Tonnage | `calculateTonnage(sets)` | Array of set objects | Sum weight×reps for hard sets | ✅ |
| Progression path | `getProgressionPath(thisWeek, lastWeek)` | Two weeks of volume data | Next step suggestion | ✅ |

---

## isHardSet() Definition

```
isHardSet(set) → set.setType !== 'warmup'
```

All set types except `warmup` count as working/hard sets: `straight`, `dropset`, `amrap`, `myo_reps`, `rest_pause`, `superset`.

---

## Data Tables Read Per Screen

| Screen | Tables read |
|--------|-------------|
| HomeScreen | `workouts`, `routines`, `routine_exercises` |
| BuildWorkoutScreen | `exercises` (via ExercisePickerModal) |
| ActiveWorkoutScreen | `workouts`, `workout_sets`, `exercises`, `routine_exercises` |
| WorkoutSummaryScreen | `workouts`, `workout_sets`, `exercises` |
| WorkoutHistoryScreen | `workouts` |
| RoutinesScreen | `routines`, `routine_exercises` (count only) |
| RoutineDetailScreen | `routines`, `routine_exercises`, `exercises` |
| ExerciseLibraryScreen | `exercises` |
| ExerciseDetailScreen | `exercises`, `workout_sets`, `workouts` |
| AnalyticsScreen | `workouts`, `workout_sets`, `exercises` |
| VolumeHeatmapScreen | `workout_sets`, `exercises`, `workouts` |
| PRWallScreen | `workout_sets`, `exercises` |
| BodyMetricsScreen | `body_metrics` |
| SettingsScreen | none (reads from Zustand + AsyncStorage) |
