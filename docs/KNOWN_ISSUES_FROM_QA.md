# Volyume — Known Issues from QA

_Last updated: 2026-05-20. Original audit dated 2026-05-16; all P1 issues and most P2/P3 issues have been resolved in subsequent commits. Status flags below reflect the current state._

## Resolution summary

| Issue | Severity | Status | Resolved in |
|---|---|---|---|
| 001 — WorkoutHistory Repeat → ActiveWorkout | P1 | **Fixed** | Switched to `navigation.getParent()?.navigate('HomeTab', ...)` |
| 002 — Settings "Manage Routines" route | P1 | **Fixed** | Manage Routines link removed from Settings; routines are now reached via Plans |
| 003 — Settings "Volume Heatmap" via AnalyticsTab | P1 | **Fixed** | Link removed; Volume Heatmap is reached via Progress → Volume Heatmap |
| 004 — VolumeHeatmap includes incomplete workouts | P2 | **Fixed** | `getCompletedWorkoutSets` already filters `is_completed = 1` at SQL level |
| 005 — WorkoutHistory set count includes warm-ups | P3 | **Fixed** | Displays `workingSetCount` separately |
| 006 — WorkoutSummary 4-session check is all-time | P3 | **Fixed** | Now filters last 28 days |
| 007 — seedRoutines "RIR 2" jargon | P3 | **Fixed** | Jargon sweep removed all RIR/MEV/MAV/MRV from user-visible strings |
| 008 — Sample routine name prefix fragile | P4 | **Fixed** | `is_sample` boolean column added (migration v13); `createRoutine` and `seedRoutines` use it; no screen references `[SAMPLE]` prefix |
| 009 — MEV/MAV/MRV unexplained on heatmap | P4 | **Fixed** | InfoTooltip explains tick marks in plain English (no abbreviations shown) |
| 010 — "Landmarks" jargon in UI | P4 | **Fixed** | UI already reads "Edit Volume Targets" throughout |
| 011 — seedRoutines missing restSeconds | P3 | **Fixed** | `seedRoutinesIfNeeded` now passes `def.rest` to `addExerciseToRoutine` |
| 012 — RestTimer bar desync after background | P4 | **Fixed** | Animation already uses `remaining * 1000`, not `duration * 1000` |
| 013 — No visual confirmation of exercise added | P4 | **Fixed** | App now navigates directly to the newly added exercise |
| 014 — Analytics weekly volume same as 004 | P2 | **Fixed** | Uses `getCompletedWorkoutSets` |
| 015 — OAuth buttons without credentials | P3 | **Fixed** | Apple/Google sign-in not shown; email auth only |
| 016 — Streak counter on deload | P4 | **Fixed** | Streak redefined as weekly sessions, not calendar-day |
| 017 — Progression suggestion uses silent RIR=2 | P3 | **Accepted** | Documented limitation; resolves if RIR input is added later |
| 018 — WorkoutSummary no read-only mode | P3 | **Fixed** | `readOnly` route param already implemented; feedback section hidden in read-only mode |
| 019 — Deload warning needs 4 weeks minimum | P4 | **Accepted** | Intentional for new users; low priority |
| 020 — Mesocycles not connected to app logic | P3 | **Fixed** | HomeScreen uses `getCurrentMesocycleWeek` + `getPlannedMuscleVolume` for block progress; deload algorithm takes mesocycle week context; Coach Builder v2 generates multi-week progressive plans |

The detailed issue records below are kept for historical reference. The "Status" field on each was set to "Open" at the time of the audit and is no longer maintained — refer to the table above for current status.

---

---

## Legend

| Severity | Meaning |
|----------|--------|
| P1 — Critical | App crash or complete loss of functionality |
| P2 — High | Feature is broken or data is wrong; workaround is poor |
| P3 — Medium | Misleading UX or confusing copy; workaround exists |
| P4 — Low | Polish / cosmetic; no functional impact |

| Status | Meaning |
|--------|--------|
| Open | Not fixed |
| In Progress | Being worked on |
| Fixed | Resolved in a commit |

---

## Issue 001

| Field | Value |
|-------|-------|
| **Title** | WorkoutHistoryScreen "Repeat" navigates to ActiveWorkout from ProgressStack — route not registered |
| **Severity** | P1 — Critical |
| **Screen** | WorkoutHistoryScreen |
| **File** | `src/screens/WorkoutHistoryScreen.js` |
| **Suspected cause** | `handleRepeatWorkout` calls `navigation.navigate('ActiveWorkout')` but this screen is mounted inside ProgressStack, which does not contain an `ActiveWorkout` route. React Navigation throws a "Could not find a navigator" or silently does nothing. |
| **Suggested fix** | Change navigation to cross-tab: `navigation.navigate('HomeTab', { screen: 'ActiveWorkout' })` after `startWorkout()` |
| **Status** | Open |

---

## Issue 002

| Field | Value |
|-------|-------|
| **Title** | SettingsScreen "Manage Routines" uses non-existent route `RoutineBuilder` |
| **Severity** | P1 — Critical |
| **Screen** | SettingsScreen |
| **File** | `src/screens/SettingsScreen.js` |
| **Suspected cause** | `navigate('RoutineBuilder')` — no route named `RoutineBuilder` exists in any navigator. The correct destination is `RoutinesTab > Routines`. |
| **Suggested fix** | Change to `navigation.navigate('RoutinesTab', { screen: 'Routines' })` |
| **Status** | Open |

---

## Issue 003

| Field | Value |
|-------|-------|
| **Title** | SettingsScreen "Volume Heatmap" navigates to `AnalyticsTab` — tab renamed to `ProgressTab` |
| **Severity** | P1 — Critical |
| **Screen** | SettingsScreen |
| **File** | `src/screens/SettingsScreen.js` |
| **Suspected cause** | `navigation.navigate('AnalyticsTab', { screen: 'VolumeHeatmap' })` — the tab was renamed `ProgressTab` in `RootNavigator.js` but the call in SettingsScreen was not updated. |
| **Suggested fix** | Change to `navigation.navigate('ProgressTab', { screen: 'VolumeHeatmap' })` |
| **Status** | Open |

---

## Issue 004

| Field | Value |
|-------|-------|
| **Title** | VolumeHeatmapScreen includes sets from incomplete/abandoned workouts |
| **Severity** | P2 — High |
| **Screen** | VolumeHeatmapScreen, AnalyticsScreen |
| **Files** | `src/screens/VolumeHeatmapScreen.js`, `src/screens/AnalyticsScreen.js` |
| **Suspected cause** | `getAllWorkoutSets()` returns all sets regardless of workout completion status. The screen passes these directly to `calculateWeeklyVolume()`. |
| **Effect** | A user who starts a workout and logs 10 sets but abandons it will see inflated volume numbers on the heatmap. |
| **Suggested fix** | Filter sets to those belonging to completed workouts: join `workout_sets` with `workouts` on `workout_id` and filter `workouts.is_completed = 1 AND workouts.started_at >= weekAgo`. |
| **Status** | Open |

---

## Issue 005

| Field | Value |
|-------|-------|
| **Title** | WorkoutHistoryScreen set count card shows total sets including warm-ups |
| **Severity** | P3 — Medium |
| **Screen** | WorkoutHistoryScreen |
| **File** | `src/screens/WorkoutHistoryScreen.js` |
| **Suspected cause** | `workout.setCount` is incremented on every set completion regardless of set type. Card displays `{setCount} sets`. |
| **Effect** | A session with 3 warm-up sets + 12 working sets shows "15 sets" — misleading about training volume. |
| **Suggested fix** | Display `workout.workingSetCount` (already stored separately) and label it "working sets", or show "12 sets (+ 3 warm-up)". |
| **Status** | Open |

---

## Issue 006

| Field | Value |
|-------|-------|
| **Title** | WorkoutSummaryScreen auto-reg "4 sessions" check counts all-time sessions, not recent |
| **Severity** | P3 — Medium |
| **Screen** | WorkoutSummaryScreen |
| **File** | `src/screens/WorkoutSummaryScreen.js` |
| **Suspected cause** | `completedWorkoutCount = allWorkouts.filter(w => w.isCompleted).length` — counts all completed workouts ever. |
| **Effect** | A user who logged 10 sessions 6 months ago and has just restarted training will always see recommendations even though their recent training data is sparse. Conversely, the copy "Complete at least 4 sessions" is technically fulfilled but misleading. |
| **Suggested fix** | Filter to recent sessions: `allWorkouts.filter(w => w.isCompleted && w.startedAt >= Date.now() - 28 * 24 * 60 * 60 * 1000).length` (last 4 weeks). |
| **Status** | Open |

---

## Issue 007

| Field | Value |
|-------|-------|
| **Title** | seedRoutines.js exercise notes expose "RIR 2" jargon to users |
| **Severity** | P3 — Medium |
| **Screen** | RoutineDetailScreen (Info bottom sheet) |
| **File** | `src/lib/seedRoutines.js` |
| **Suspected cause** | Exercise notes were written with internal algorithm language (e.g., "Target: 4 × 20–25 · RIR 2") and these notes are displayed verbatim in the RoutineDetail Info sheet. |
| **Effect** | Users unfamiliar with RIR terminology see unexplained jargon in a prominent UI element. |
| **Suggested fix** | Remove "· RIR 2" suffix from all seeded notes. Replace with plain effort cue, e.g. "Hard effort" or "Leave 1–2 reps in reserve". |
| **Status** | Open |

---

## Issue 008

| Field | Value |
|-------|-------|
| **Title** | Sample routines identified by `[SAMPLE]` name prefix — fragile pattern |
| **Severity** | P4 — Low |
| **Screen** | RoutinesScreen |
| **File** | `src/screens/RoutinesScreen.js`, `src/lib/seedRoutines.js` |
| **Suspected cause** | `myRoutines = routines.filter(r => !r.name.startsWith('[SAMPLE]'))` — relies on a naming convention rather than a dedicated column. |
| **Effect** | Any user-created routine starting with "[SAMPLE]" would be mis-categorised. Edge case, but fragile. |
| **Suggested fix** | Add a boolean `is_sample` column to `routines` table (SQLite + migration). Set it on seeding. Filter by column, not name prefix. |
| **Status** | Open |

---

## Issue 009

| Field | Value |
|-------|-------|
| **Title** | "MEV / MAV / MRV" abbreviations shown without explanation on Volume Heatmap |
| **Severity** | P4 — Low |
| **Screen** | VolumeHeatmapScreen |
| **File** | `src/screens/VolumeHeatmapScreen.js` |
| **Suspected cause** | Legend only shows the three-letter codes with no expanded form. |
| **Effect** | First-time users don't know what the tick marks mean. |
| **Suggested fix** | Add a tooltip or one-line legend: "MEV = Minimum Effective Volume · MAV = Maximum Adaptive Volume · MRV = Maximum Recoverable Volume". |
| **Status** | Open |

---

## Issue 010

| Field | Value |
|-------|-------|
| **Title** | "Edit Landmarks" uses jargon; should read "Edit Targets" |
| **Severity** | P4 — Low |
| **Screen** | VolumeHeatmapScreen |
| **File** | `src/screens/VolumeHeatmapScreen.js` |
| **Suspected cause** | "Landmarks" is RP Hypertrophy internal terminology. Acceptable in docs, confusing in the UI. |
| **Suggested fix** | Rename section heading to "Edit Volume Targets" and the buttons/labels accordingly. |
| **Status** | Open |

---

## Issue 011

| Field | Value |
|-------|-------|
| **Title** | seedRoutines.js does not pass `startingWeight` or `restSeconds` — exercises default to null |
| **Severity** | P3 — Medium |
| **Screen** | ActiveWorkoutScreen (per-exercise rest timer), RoutineDetailScreen |
| **File** | `src/lib/seedRoutines.js` |
| **Suspected cause** | `addExerciseToRoutine` was extended to accept `startingWeight` and `restSeconds` in Phase 1.5, but `seedRoutines.js` still calls it with the old shorter signature. |
| **Effect** | All sample routine exercises have `startingWeight = null` and `restSeconds = null`. ActiveWorkoutScreen falls back to 90s rest and no weight pre-fill, which works but provides no benefit from the Phase 1.5 configuration features for sample routines. |
| **Suggested fix** | Update `seedRoutines.js` to pass sensible defaults: e.g., `restSeconds: 120` for compounds, `90` for isolation; `startingWeight` left as null (acceptable). Also increment seed version key to `@volyume_routines_seeded_v2` to force re-seed on existing installs. |
| **Status** | Open |

---

## Issue 012

| Field | Value |
|-------|-------|
| **Title** | RestTimer progress bar animation duration is fixed at `restTimerDuration * 1000ms` — does not account for timer resuming mid-count |
| **Severity** | P4 — Low |
| **Screen** | RestTimer component (visible in ActiveWorkoutScreen) |
| **File** | `src/components/RestTimer.js` |
| **Suspected cause** | `Animated.timing(progressAnim, { duration: restTimerDuration * 1000 })` — always animates for the full duration. If the user backgrounds the app and returns mid-timer, the visual bar restarts from full width while the numeric countdown is correct. |
| **Effect** | Bar animation desynchronises from numeric countdown after app background/foreground. Purely visual. |
| **Suggested fix** | On `restTimerActive` change (the `useEffect` dependency), set animation duration to `restTimerRemaining * 1000` instead of `restTimerDuration * 1000`. |
| **Status** | Open |

---

## Issue 013

| Field | Value |
|-------|-------|
| **Title** | ExercisePickerModal in ActiveWorkoutScreen adds exercise but stays on current exercise (not the new one) |
| **Severity** | P4 — Low |
| **Screen** | ActiveWorkoutScreen |
| **File** | `src/screens/ActiveWorkoutScreen.js` |
| **Suspected cause** | Main view ExercisePickerModal `onSelect` intentionally does NOT call `setCurrentExerciseIndex`. This is correct by design (user adds an exercise without losing their place). However, there is no confirmation that the exercise was added. |
| **Effect** | After adding a new exercise mid-workout, the user doesn't know they need to swipe to reach it. They only see an `addedMsg` banner for 2.5s. |
| **Suggested fix** | The `addedMsg` banner is already implemented. Consider also scrolling the exercise list or briefly highlighting the new entry to confirm the addition. |
| **Status** | Open |

---

## Issue 014

| Field | Value |
|-------|-------|
| **Title** | AnalyticsScreen weekly volume inherits VolumeHeatmap bug (includes incomplete workouts) |
| **Severity** | P2 — High |
| **Screen** | AnalyticsScreen |
| **File** | `src/screens/AnalyticsScreen.js` |
| **Suspected cause** | Same root cause as Issue 004 — loads all sets without `isCompleted` filter. |
| **Status** | Open (duplicate root cause of #004; fix both together) |

---

## Issue 015

| Field | Value |
|-------|-------|
| **Title** | Apple and Google OAuth buttons shown but credentials not configured |
| **Severity** | P3 — Medium |
| **Screen** | LoginScreen |
| **File** | `src/screens/LoginScreen.js` |
| **Suspected cause** | OAuth requires Supabase dashboard configuration + Apple/Google developer credentials. Neither is set up yet. |
| **Effect** | Tapping "Continue with Apple" or "Continue with Google" will fail silently or show an error. |
| **Suggested fix** | Either configure OAuth credentials in Supabase, or hide/disable these buttons with a "Coming soon" note until credentials are ready. |
| **Status** | Open |

---

## Issue 016

| Field | Value |
|-------|-------|
| **Title** | Streak counter breaks on intentional rest days (deload week) |
| **Severity** | P4 — Low |
| **Screen** | HomeScreen |
| **File** | `src/screens/HomeScreen.js` |
| **Suspected cause** | Streak is counted as consecutive calendar days with at least one completed workout. A scheduled rest day resets the streak. |
| **Effect** | Users on a 4-days-on / 3-days-off split will lose their streak every weekend. Streak number becomes misleading. |
| **Suggested fix** | Consider redefining streak as "consecutive planned training days" (based on routine schedule) or "workouts in last N days" rather than calendar-day streak. Alternatively, display "X sessions this month" instead of streak. |
| **Status** | Open |

---

## Issue 017

| Field | Value |
|-------|-------|
| **Title** | `getProgressionSuggestion` silently uses RIR=2 default — suggestion may be irrelevant |
| **Severity** | P3 — Medium |
| **Screen** | ActiveWorkoutScreen (progression suggestion chip) |
| **File** | `src/lib/algorithms.js`, `src/screens/ActiveWorkoutScreen.js` |
| **Suspected cause** | `s.rir ?? 2` in `getProgressionSuggestion` — if user never inputs RIR, algorithm assumes RIR 2 and may never trigger weight increase suggestion. |
| **Effect** | Users who train hard but don't log RIR will see "Hold weight" suggestions forever. Conversely, users training at lower intensities who do log RIR will get more accurate progression suggestions. |
| **Suggested fix** | This is acceptable as-is since SetEntry intentionally has no RIR input (advanced feature). Document the assumption clearly. If RIR input is added in Phase 2, this resolves automatically. |
| **Status** | Open (accepted limitation) |

---

## Issue 018

| Field | Value |
|-------|-------|
| **Title** | WorkoutSummaryScreen has no read-only mode — feedback form always shown even when viewing old sessions |
| **Severity** | P3 — Medium |
| **Screen** | WorkoutSummaryScreen |
| **File** | `src/screens/WorkoutSummaryScreen.js` |
| **Suspected cause** | No conditional rendering based on whether the screen is accessed post-workout (with params) vs from history (without feedback params). The feedback form renders regardless. |
| **Effect** | When viewing an old session from WorkoutHistory, the user sees empty feedback sliders and a "Save & Finish" button that does nothing meaningful (or overwrites old feedback with empty values). |
| **Suggested fix** | Add a `readOnly` route param. When `readOnly = true`, hide the feedback section and replace "Save & Finish" with "Done". |
| **Status** | Open |

---

## Issue 019

| Field | Value |
|-------|-------|
| **Title** | DeloadScreen deload warning `shouldDeload()` requires 4 full weeks of data — never fires on new installations |
| **Severity** | P4 — Low |
| **Screen** | AnalyticsScreen |
| **File** | `src/lib/algorithms.js`, `src/screens/AnalyticsScreen.js` |
| **Suspected cause** | `shouldDeload(last4WeeksData)` — if fewer than 4 weeks of data exist, the function returns `false`. New users will never see a deload recommendation for the first month. |
| **Effect** | Intentional behaviour for fresh users; however, a very new user who overtrained heavily in 3 weeks would not receive a deload warning. |
| **Suggested fix** | Consider partial-data deload check: if 2+ weeks of data and volume is consistently near/above MRV, warn even without 4 weeks. |
| **Status** | Open (accepted limitation; low priority) |

---

## Issue 020

| Field | Value |
|-------|-------|
| **Title** | MesocycleBuilderScreen navigation is accessible but mesocycles are not connected to routine/workout start flow |
| **Severity** | P3 — Medium |
| **Screen** | MesocycleBuilderScreen |
| **File** | `src/screens/MesocycleBuilderScreen.js` |
| **Suspected cause** | Mesocycles can be created, but no screen uses `activeMesocycle` data to contextualise workout suggestions, volume accumulation, or deload timing. The feature is essentially a placeholder. |
| **Effect** | Users can set up a mesocycle but it has no effect on the app's suggestions or tracking. The feature appears functional but is inert. |
| **Suggested fix** | Phase 2 work: wire `activeMesocycle` into `shouldDeload()`, `getAutoRegSuggestion()`, and the weekly volume heatmap (use mesocycle week number rather than rolling 7-day window). |
| **Status** | Open (Phase 2 scope) |

---

## Summary Table

| # | Severity | Screen | Title | Status |
|---|----------|--------|-------|--------|
| 001 | P1 | WorkoutHistoryScreen | Repeat navigates to wrong stack | **Fixed** |
| 002 | P1 | SettingsScreen | "Manage Routines" route doesn't exist | **Fixed** |
| 003 | P1 | SettingsScreen | "Volume Heatmap" uses wrong tab name | **Fixed** |
| 004 | P2 | VolumeHeatmapScreen | Includes incomplete workout sets | **Fixed** |
| 005 | P3 | WorkoutHistoryScreen | Set count includes warm-ups | **Fixed** |
| 006 | P3 | WorkoutSummaryScreen | 4-session check counts all-time | **Fixed** |
| 007 | P3 | RoutineDetailScreen | "RIR 2" jargon in seeded notes | **Fixed** |
| 008 | P4 | RoutinesScreen | Sample routine identified by name prefix | **Fixed** |
| 009 | P4 | VolumeHeatmapScreen | MEV/MAV/MRV unexplained | **Fixed** |
| 010 | P4 | VolumeHeatmapScreen | "Landmarks" jargon in UI | **Fixed** |
| 011 | P3 | ActiveWorkoutScreen | Seeded exercises missing rest/weight defaults | **Fixed** |
| 012 | P4 | RestTimer | Progress bar desync after background | **Fixed** |
| 013 | P4 | ActiveWorkoutScreen | No visual confirmation of exercise added | **Fixed** |
| 014 | P2 | AnalyticsScreen | Includes incomplete workout sets (same as #004) | **Fixed** |
| 015 | P3 | LoginScreen | OAuth buttons visible but not configured | **Fixed** |
| 016 | P4 | HomeScreen | Streak breaks on rest days | **Fixed** |
| 017 | P3 | ActiveWorkoutScreen | Progression suggestion uses silent RIR=2 | Accepted |
| 018 | P3 | WorkoutSummaryScreen | No read-only mode for history view | **Fixed** |
| 019 | P4 | AnalyticsScreen | Deload warning needs 4 weeks minimum | Accepted |
| 020 | P3 | MesocycleBuilderScreen | Mesocycles not connected to app logic | **Fixed** |
