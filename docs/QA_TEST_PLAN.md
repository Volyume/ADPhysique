# Volyume QA Test Plan — Phase 1.5

## Phase 1.5 Verdict
**PENDING** — awaiting APK build from this branch.

---

## Navigation Map

| Tab | Label | Screens |
|---|---|---|
| HomeTab | Train | Home → BuildWorkout → ActiveWorkout → WorkoutSummary |
| RoutinesTab | Routines | Routines → RoutineDetail → ExerciseLibrary → ExerciseDetail |
| ProgressTab | Progress | Analytics → WorkoutHistory → WorkoutSummary · VolumeHeatmap · PRWall · BodyMetrics |
| ProfileTab | You | Settings · MesocycleBuilder |

---

## A. Smoke Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| A1 | Install APK on Android device | Installs without error | Critical |
| A2 | Tap app icon | Opens within 3 seconds, no crash | Critical |
| A3 | Cold start (after device restart) | Opens correctly | Critical |
| A4 | Tap "Continue without account" | Home screen loads | Critical |
| A5 | Kill app, reopen | Returns to correct screen, no crash | Critical |
| A6 | Tap Train tab | Home screen visible | High |
| A7 | Tap Routines tab | Routines screen visible | High |
| A8 | Tap Progress tab | Progress screen visible | High |
| A9 | Tap You tab | Profile & Settings visible | High |
| A10 | Navigate all tabs repeatedly | No crash, no blank screens | High |

---

## B. Navigation Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| B1 | Train tab present | Label "Train", home icon | Critical |
| B2 | Routines tab present | Label "Routines", list icon | Critical |
| B3 | Progress tab present | Label "Progress", stats-chart icon | Critical |
| B4 | You tab present | Label "You", person icon | Critical |
| B5 | No "Log" tab visible | Log tab absent from nav bar | Critical |
| B6 | Train → "Start Blank Workout" | Opens Build Workout screen, NOT ActiveWorkout directly | High |
| B7 | Train → History quick link | Navigates to Progress tab WorkoutHistory | High |
| B8 | Train → Routines quick link | Navigates to Routines tab | High |
| B9 | Train → Exercises quick link | Navigates to Routines tab ExerciseLibrary | High |
| B10 | Progress → "Workout History" card | WorkoutHistory screen opens in Progress stack | High |

---

## C. Build Workout Screen Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| C1 | Tap "Start Blank Workout" on Train | Build Workout screen opens | Critical |
| C2 | Screen header shows "Build Workout" | "Skip Setup" on left | High |
| C3 | Tap "Skip Setup" | ActiveWorkout opens with no exercises (timer starts) | High |
| C4 | Tap "Add Exercise" | Exercise picker modal opens | Critical |
| C5 | Search for "Bench" | Results filtered correctly | High |
| C6 | Tap an exercise | Added to build list with defaults (3 sets · 8–12 reps · 90s rest) | Critical |
| C7 | Tap "–" next to Sets | Sets decrements, min 1 | High |
| C8 | Tap "+" next to Sets | Sets increments | High |
| C9 | Tap "–" next to Rest | Rest decrements by 15s, min 30s | High |
| C10 | Tap "+" next to Rest | Rest increments by 15s | High |
| C11 | Edit reps min/max fields | Values update | High |
| C12 | Set Starting Weight | Value stored | Medium |
| C13 | Add 3 exercises | All 3 appear in list | Critical |
| C14 | Remove an exercise | Removed from list | High |
| C15 | Tap "Start Training (3)" | ActiveWorkout opens with 3 exercises loaded | Critical |
| C16 | Verify targets in ActiveWorkout | Set counter shows "SET 1 / {configured sets}" | High |
| C17 | Tap "Start Training" with no exercises | Alert shown: "Add at least one exercise" | Medium |

---

## D. Routine Management Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| D1 | Routines tab landing | Shows "Routines" title, "Create New Routine" button | Critical |
| D2 | My Routines section | User-created routines listed | High |
| D3 | Sample Routines section | [SAMPLE] routines appear without [SAMPLE] prefix | High |
| D4 | Routine card shows exercise count | "X exercises" pill visible | High |
| D5 | Tap "Start" on routine | ActiveWorkout opens in Train tab with exercises loaded | Critical |
| D6 | Tap "…" on my routine | Alert with Edit, Duplicate, Delete options | High |
| D7 | Tap Edit | RoutineDetail screen opens | High |
| D8 | Tap Duplicate | New "... (copy)" routine created, RoutineDetail opens | Medium |
| D9 | Tap Delete → confirm | Routine removed from list | High |
| D10 | Tap "Create New Routine" | Name input modal appears | Critical |
| D11 | Enter name, tap Create | Routine created, RoutineDetail opens | Critical |
| D12 | No existing routines shown when creating | Only name input modal visible, not the routine list | High |
| D13 | Start routine with no exercises | Alert: "No exercises" with "Add Exercise" and "Start Blank Workout" options | High |
| D14 | [SAMPLE] routines have no "…" menu | Only chevron/view button | Medium |

---

## E. Routine Detail Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| E1 | Open routine detail | Exercise list, Start button at top | High |
| E2 | Exercise card shows sets · reps · rest | e.g. "3 sets · 8–12 reps · 90s rest" | High |
| E3 | Starting weight shown | "Start: 60 kg" if configured | Medium |
| E4 | Add exercise | Appears at end of list | High |
| E5 | Remove exercise | Removed with confirmation | High |
| E6 | Tap "Start This Workout" | ActiveWorkout opens in Train tab | Critical |

---

## F. Active Workout Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| F1 | ActiveWorkout opens | Timer starts at 0 (or elapsed since start) | Critical |
| F2 | Previous session card | Shows "Xkg × Y" format, no RIR | High |
| F3 | Previous session prefills weight/reps | Weight and reps from last session pre-filled | High |
| F4 | Starting weight from Build Workout | Pre-fills weight if no previous session | High |
| F5 | No RIR chips visible | Absent from all views | Critical |
| F6 | No RPE chips visible | Absent from all views | Critical |
| F7 | Set type label | "Working" by default | High |
| F8 | Set counter with routine | "SET 1 / {target}" format | High |
| F9 | Set counter blank workout | "SET 1 · Working" (no slash) | High |
| F10 | Add exercise mid-workout | Exercise added, user stays on current exercise | Critical |
| F11 | "X added" confirmation | Banner appears briefly after adding exercise | High |
| F12 | No jump to added exercise | Current exercise index unchanged | Critical |
| F13 | Target reached (working sets = target) | Green "Target reached — X sets done" banner appears | Critical |
| F14 | Button label after target | "COMPLETE EXTRA SET" replaces "COMPLETE SET" | High |
| F15 | Warm-ups excluded from target count | Target banner only counts working + drop sets | Critical |
| F16 | Complete a set | Rest timer starts automatically | Critical |
| F17 | Rest timer duration from routine | Uses exercise's configured rest_seconds | Medium |
| F18 | Rest timer at 3s | Large "3" displayed, haptic fires | High |
| F19 | Rest timer at 2s | "2" displayed, haptic fires | High |
| F20 | Rest timer at 1s | "1" displayed, haptic fires | High |
| F21 | Rest timer at 0 | "Start next set" banner appears for ~3 seconds | High |
| F22 | Info button | Bottom sheet with exercise name, target, notes | High |
| F23 | Finish workout | Confirmation alert with set count | Critical |
| F24 | Finish with no sets | "Discard?" confirmation | High |

---

## G. Stale Workout Recovery Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| G1 | Open workout, force 4h inactivity (manual test via date shift or code stub) | Recovery modal appears on next open | High |
| G2 | Recovery modal title | "Resume workout?" | High |
| G3 | Tap "Resume" | Modal dismisses, workout continues | High |
| G4 | Tap "Finish Workout" | Normal finish flow triggered | High |
| G5 | Tap "Discard" → confirm | Workout cleared, navigates back | High |
| G6 | Logging a set updates last activity | After set complete, stale timer resets | High |

---

## H. Set Type Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| H1 | No RIR chips visible | Absent | Critical |
| H2 | No RPE chips visible | Absent | Critical |
| H3 | Default set type label | "Working" | Critical |
| H4 | Tap "Change" set type | Bottom sheet: Working, Warm-up, Drop Set only | Critical |
| H5 | Explainer text | "Working sets count toward your weekly volume. Warm-up sets do not." visible | High |
| H6 | Select Warm-up | Label updates to "Warm-up" | High |
| H7 | Select Drop Set | Label updates to "Drop Set", counts toward volume | High |
| H8 | No Superset option | Not visible | Medium |
| H9 | Session Logged shows "Working Sets" | Label correct | High |
| H10 | Warm-up excluded from Working Sets count | Count in Session Logged excludes warm-ups | Critical |
| H11 | Drop Set counts as 1 working set | Counted in weekly volume and session count | High |

---

## I. Session Complete Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| I1 | Finish workout | "Session Logged" title | High |
| I2 | Stats grid shows "Working Sets" | Not "Sets" or "Hard Sets" | Critical |
| I3 | Working Sets count excludes warm-ups | Accurate count | Critical |
| I4 | Volume status labels | "Below target", "Growth range", "Near recovery ceiling", "Recovery debt" | High |
| I5 | "THIS WEEK AFTER SESSION" section | Muscle rows with correct working set counts | High |
| I6 | Tap Save & Return | Returns to Train tab | Critical |
| I7 | Workout appears in History | Visible on Progress → Workout History | Critical |

---

## J. Progress Tab Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| J1 | Progress tab shows analytics | Title "Progress", weekly stats, volume bars | Critical |
| J2 | "DEEP DIVE" section has History card | "Workout History" link visible | High |
| J3 | Tap Workout History card | WorkoutHistory screen opens | High |
| J4 | Workout History shows completed sessions | Sorted newest first | High |
| J5 | Tap "View Details" on session | WorkoutSummary opens in Progress stack | High |
| J6 | "Repeat" button on history card | New workout starts with same routine | High |
| J7 | Empty history state | "No sessions yet. Start a session from the Train tab." | High |

---

## K. Data Consistency Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| K1 | Complete workout, check Train tab | Session count increments | High |
| K2 | Train "WEEKLY WORKING SETS" matches Progress | Same muscles, same counts | High |
| K3 | Kill and reopen, navigate to Progress → History | Workout still present | Critical |
| K4 | Mixed warm-up/working sets — Session Logged | Working Sets count excludes warm-ups | Critical |
| K5 | New sets — RIR and RPE stored as null | Confirmed via history display (no RIR shown) | Low |
| K6 | [SAMPLE] routines appear once after reinstall | No duplicates | Critical |

---

## L. Compliance and Quality Checks

| # | Check | Expected | Severity |
|---|---|---|---|
| L1 | No "Hard Sets" anywhere in UI | "Working Sets" used consistently | Critical |
| L2 | No "Log" tab in navigation | Absent | Critical |
| L3 | No medical/injury prevention claims | Absent | Critical |
| L4 | No PED/pharmacology content | Absent | Critical |
| L5 | No emoji in functional UI copy | Absent | Medium |
| L6 | No broken navigation | All tappable elements work | High |
| L7 | No crash across any screen | App stable | Critical |
| L8 | Tab labels: Train / Routines / Progress / You | Correct | Critical |
| L9 | App works offline | No network required for core flow | Critical |
| L10 | [SAMPLE] prefix on seeded routines | Both labelled in DB, [SAMPLE] hidden in Routines display | High |

---

## Regression Checklist

Run before every build push:

### Navigation Regression
- [ ] All 4 tabs present: Train · Routines · Progress · You
- [ ] No "Log" tab
- [ ] "Start Blank Workout" → BuildWorkoutScreen (not directly to ActiveWorkout)
- [ ] Starting routine from Routines tab → ActiveWorkout in Train tab
- [ ] WorkoutHistory accessible from Progress tab

### Workout Regression
- [ ] Create routine with 3 exercises → Start → exercises load in order → log sets → finish → history shows session
- [ ] Blank workout via BuildWorkoutScreen → 3 exercises → configure sets/reps → Start Training → targets shown in ActiveWorkout
- [ ] Start routine with no exercises → alert with correct options

### Set Type Regression
- [ ] No RIR chips visible
- [ ] No RPE chips visible
- [ ] Working / Warm-up / Drop Set only in picker
- [ ] Warm-ups excluded from working set count
- [ ] Target banner appears after hitting target sets

### RestTimer Regression
- [ ] Timer starts after set completion
- [ ] 3-2-1 haptic countdown
- [ ] "Start next set" shown after 0
- [ ] Per-exercise rest duration used when configured

### General
- [ ] App launches without internet
- [ ] Set data persists after app restart
- [ ] Exercise library loads with 100+ exercises
- [ ] [SAMPLE] routines appear once (no duplication)
