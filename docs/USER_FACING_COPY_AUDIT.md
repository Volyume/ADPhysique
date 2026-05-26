# Volyume — User-Facing Copy Audit

_Last updated: 2026-05-16. Covers the build as it existed in May 2026 on the now-retired `claude/build-volyume-app-srY9C` branch. Active branch is now `main`._

> **Stale relative to current state.** The food layer, cascade UI,
> paywall surfaces, and Article 9 consent screen all postdate this
> audit. Voice compliance is now guarded by snapshot tests
> (`weeklyCoach.voice.snapshot.test.js`, `whyThisTemplates.snapshot.test.js`,
> `jargonBlocklist.test.js`). The voice rules in `CLAUDE.md` and
> `COACHING_VOICE_SYNTHESIS_LOCKED.md` are the canonical reference for
> new copy; this doc is preserved for the per-screen historical
> review.

This document lists every piece of user-visible text by screen, flags terminology violations, and notes where copy is confusing, inconsistent, or wrong.

---

## Terminology Rules

From `PRODUCT_DIRECTION.md` and product context:

| Correct term | Wrong / avoid | Notes |
|-------------|---------------|-------|
| Working sets | "Hard sets", "sets", "effective sets" | When counting sets that count toward volume |
| Warm-up sets | "Warmup", "warm up" (no hyphen) | Set type label |
| Drop set | "Dropset" (one word) | Set type label |
| Volume | "load", "total work" | When discussing training stimulus |
| Rest time | "Rest period", "rest interval" | Rest between sets |
| Starting weight | "Initial weight", "first weight" | Pre-configured weight for new sessions |
| Routine | "Program", "plan", "split" | Unless user explicitly uses those words |
| Session | "Workout" (ambiguous — could be a routine OR an instance) | In analytics/history contexts |
| MEV | "minimum effective volume" (only in docs) | Label in heatmap legend |
| MAV | "maximum adaptive volume" (only in docs) | Label in heatmap legend |
| MRV | "maximum recoverable volume" (only in docs) | Label in heatmap legend |
| Personal record | "PR", "PB", "best" | In UI; "PR" as abbreviation is acceptable |

---

## HomeScreen

| Copy | Status | Notes |
|------|--------|-------|
| "sessions this week" | ✅ | |
| "day streak" | ✅ | |
| "YOUR ROUTINES" | ✅ | |
| "No routines yet. Go to the Routines tab to create one." | ✅ | |
| "ACTIVE WORKOUT" | ✅ | |
| "Continue Workout" | ✅ | |
| "Start Blank Workout" | ✅ | |
| "History" (quick nav) | ✅ | |
| "Routines" (quick nav) | ✅ | |
| "Exercises" (quick nav) | ✅ | |

---

## BuildWorkoutScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Build Workout" (header) | ✅ | |
| "Skip Setup" | ✅ | |
| "EXERCISES" | ✅ | |
| "Add exercises to get started" | ✅ | |
| "+ Add Exercise" | ✅ | |
| "Sets" | ✅ | |
| "Reps" | ✅ | |
| "Rest" | ✅ | |
| "Starting Weight (kg)" | ✅ | |
| "Start Training (N)" | ✅ | |

---

## ActiveWorkoutScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Finish Workout" | ✅ | |
| "+ Add Exercise" | ✅ | |
| "✓ COMPLETE SET" | ✅ | |
| "X / Y working sets" | ✅ | Correctly uses "working sets" |
| "Target Complete ✓" | ✅ | |
| "COMPLETE EXTRA SET" | ✅ | |
| "Working · Change" | ✅ | |
| "Warm-up · Change" | ✅ | |
| "Drop Set · Change" | ✅ | |
| "LAST TIME" | ✅ | Clear; shows previous session data inline |
| "Resume Workout?" | ✅ | Stale workout modal title |
| "This workout was paused over 4 hours ago. Do you want to continue or discard it?" | ✅ | |
| "Continue", "Discard" | ✅ | |
| "Discard Workout?" | ✅ | |
| "All logged sets will be lost." | ✅ | |
| "Cancel", "Discard" | ✅ | |

---

## WorkoutSummaryScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Workout Complete" | ✅ | |
| "Exercises" | ✅ | |
| "Working Sets" | ✅ | Correct terminology |
| "Duration" | ✅ | |
| "Total Volume" | ✅ | |
| "THIS WEEK AFTER SESSION" | ✅ | |
| "RECOMMENDATIONS" | ✅ | |
| "Complete at least 4 sessions to get personalised recommendations." | ⚠️ | Uses "sessions" correctly; however the 4-session check counts all-time sessions, not recent ones — copy will be misleading once user has 4+ old sessions |
| "HOW DID IT FEEL?" | ✅ | |
| "Difficulty" | ✅ | |
| "Pump quality" | ✅ | |
| "Soreness coming in" | ✅ | |
| "Fatigue" | ✅ | |
| "Joint discomfort" | ✅ | |
| "Save & Finish" | ✅ | |

---

## WorkoutHistoryScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Workout History" | ✅ | |
| "No completed workouts yet." | ✅ | |
| "{durationMinutes} min" | ✅ | |
| "{setCount} sets" | 🐛 | **Terminology violation.** Should be "working sets" or "N sets (+ M warm-up)". Current copy conflates all sets including warm-ups. |
| "Repeat" | ✅ | Clear CTA |

---

## RoutinesScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Routines" (header) | ✅ | |
| "MY ROUTINES" | ✅ | |
| "SAMPLE ROUTINES" | ✅ | |
| "No routines yet." | ✅ | |
| "+ Create Routine" | ✅ | |
| "Start" | ✅ | |
| "Edit", "Duplicate", "Delete" | ✅ | |
| "Delete '{name}'? This cannot be undone." | ✅ | |

---

## RoutineDetailScreen

| Copy | Status | Notes |
|------|--------|-------|
| Routine name (inline editable) | ✅ | |
| "EXERCISES" | ✅ | |
| "No exercises yet. Add some!" | ✅ | |
| "+ Add Exercise" | ✅ | |
| "Sets" | ✅ | |
| "Reps" | ✅ | |
| "Rest" | ✅ | |
| "Starting Weight (kg)" | ✅ | |
| "Start Routine" | ✅ | |

---

## ExerciseLibraryScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Exercise Library" | ✅ | |
| "Search exercises..." | ✅ | |
| "No exercises found." | ✅ | |
| Muscle group filter labels | ✅ | |
| Equipment filter labels | ✅ | |

---

## ExerciseDetailScreen

| Copy | Status | Notes |
|------|--------|-------|
| Tabs: "History", "PRs", "About" | ✅ | |
| "No sets logged for this exercise yet." | ✅ | |
| "Personal Records" | ✅ | |

---

## AnalyticsScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Progress" (header) | ✅ | |
| "THIS WEEK" | ✅ | |
| "Deload Recommended" | ✅ | |
| "DEEP DIVE" | ✅ | |
| "Workout History", "Volume Heatmap", "PR Wall", "Body Metrics" | ✅ | |

---

## VolumeHeatmapScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Volume Heatmap" | ✅ | |
| "MEV", "MAV", "MRV" | ⚠️ | Abbreviations only, no expansion on first use. First-time users won't know what these mean. Consider tooltip or one-line legend. |
| "Below target" | ✅ | |
| "Minimum stimulus" | ✅ | |
| "Growth range" | ✅ | |
| "Near recovery ceiling" | ✅ | |
| "Recovery debt" | ✅ | |
| "EDIT LANDMARKS" | ⚠️ | "Landmarks" is RP Hypertrophy jargon. May confuse users unfamiliar with the framework. Consider "Edit Targets" or "Set My Goals". |
| "Reset to Defaults" | ✅ | |
| Muscle labels: "Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Biceps", "Triceps", "Calves" | ✅ | |

---

## PRWallScreen

| Copy | Status | Notes |
|------|--------|-------|
| "PR Wall" | ✅ | |
| "No personal records yet. Start logging!" | ✅ | |
| "Best set" | ✅ | |
| "Est. 1RM" | ✅ | |

---

## BodyMetricsScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Body Metrics" | ✅ | |

---

## SettingsScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Settings" | ✅ | |
| "PROFILE" | ✅ | |
| "TRAINING" | ✅ | |
| "DATA" | ✅ | |
| "ACCOUNT" | ✅ | |
| "Manage Routines" | ✅ | Copy is fine; navigation is broken |
| "Volume Heatmap" | ✅ | Copy is fine; navigation is broken |
| "Mesocycle Planner" | ✅ | |
| "Export Data" | ✅ | |
| "Sign Out" | ✅ | |
| "kg / lbs" toggle | ✅ | |

---

## seedRoutines.js — Exercise Notes (Visible in Info Sheet)

The exercise notes seeded by `src/lib/seedRoutines.js` appear in the RoutineDetailScreen Info bottom sheet. These are the only place where internal calculation concepts appear as user-facing copy:

| Exercise | Seeded note | Status | Issue |
|----------|-------------|--------|-------|
| Various compound exercises | "Target: 4 × 20–25 · RIR 2" | 🐛 | **"RIR 2" should not appear in UI.** RIR is an internal algorithm input only; users should not see this jargon in the routine detail. |
| Various exercises | "Target: 3 × 8–12 · RIR 2" | 🐛 | Same issue. |

**Fix:** Remove "· RIR 2" suffix from all seeded exercise notes in `seedRoutines.js`. Replace with plain rep range and effort cue if needed, e.g. "Target: 4 × 20–25 · Hard effort".

---

## RestTimer Component

| Copy | Status | Notes |
|------|--------|-------|
| "seconds" (countdown suffix) | ✅ | |
| "rest" (timer suffix) | ✅ | |
| "Skip" | ✅ | |
| "Start next set" (done banner) | ✅ | |

---

## PRCelebration Component

| Copy | Status | Notes |
|------|--------|-------|
| PR type label (e.g. "New PR — Best Set!") | ✅ | |

---

## LoginScreen

| Copy | Status | Notes |
|------|--------|-------|
| "Volyume" | ✅ | |
| "Sign In" | ✅ | |
| "Sign Up" | ✅ | |
| "Continue with Apple" | ✅ | |
| "Continue with Google" | ✅ | |

---

## OnboardingScreen

| Copy | Status | Notes |
|------|--------|-------|
| Step labels | ✅ | |
| Goal options | ✅ | |
| Experience level options | ✅ | |
| Equipment options | ✅ | |

---

## Summary of Copy Issues

| # | Severity | Screen/Component | Copy | Issue |
|---|----------|-----------------|------|-------|
| 1 | Medium | WorkoutHistoryScreen | "{setCount} sets" | Should be "working sets" or clarify total vs working |
| 2 | Medium | seedRoutines.js notes | "RIR 2" in exercise notes | RIR is internal; should not appear as user-facing copy |
| 3 | Low | VolumeHeatmapScreen | "MEV", "MAV", "MRV" | Unexplained abbreviations; add legend text |
| 4 | Low | VolumeHeatmapScreen | "EDIT LANDMARKS" | Jargon; consider "Edit Targets" |
| 5 | Low | WorkoutSummaryScreen | "4 sessions to get recommendations" | Will be misleading once user has 4+ old sessions (data logic bug underlying) |
