# Volyume — Maestro E2E Tests

End-to-end regression flows for the Volyume APK. Each flow covers a full user journey using [Maestro](https://maestro.mobile.dev).

## Prerequisites

- **Maestro CLI** installed: `curl -Ls "https://get.maestro.mobile.dev" | bash`
- **Android device or emulator** with USB debugging enabled (or Android emulator running)
- **Debug APK** installed: `adb install app-debug.apk`
  - App bundle ID: `app.volyume`

## Test Flows

| File | Journey | Key Assertions |
|------|---------|----------------|
| `flows/01_navigation.yaml` | Tab navigation | Train/Plans/Progress/You tabs; no Log tab; Settings→Plans link |
| `flows/02_blank_workout.yaml` | Build + start | BuildWorkout screen; no timer during setup; add exercise; Start Training |
| `flows/03_active_workout.yaml` | Active workout | Warm-up/Working/Drop Set type counting; target complete flips to NEXT EXERCISE; mid-workout exercise add |
| `flows/04_programme_library.yaml` | Plan library | MY PLANS + PLAN LIBRARY sections; Add to My Plans from library; original unchanged |
| `flows/05_progress_history.yaml` | History | Completed session appears; read-only summary shows Done; Repeat opens new session |

## Running Tests Locally

```bash
# Run all flows (sequential)
maestro test maestro/flows/

# Run a single flow
maestro test maestro/flows/03_active_workout.yaml

# Run with JUnit XML output (for CI)
maestro test --format junit --output maestro-results.xml maestro/flows/

# Record a video of a single flow
maestro record maestro/flows/03_active_workout.yaml
```

## CI-Ready Command

```bash
maestro test \
  --format junit \
  --output maestro-results.xml \
  --timeout 120 \
  maestro/flows/
```

Exit code `0` = all flows passed. Any non-zero exit code indicates at least one failure.

## Screenshots and Videos on Failure

Maestro automatically captures a screenshot at the point of failure. Screenshots are written to:

```
~/.maestro/tests/<timestamp>/<flow-name>/screenshot.png
```

To capture a full video for a specific flow:

```bash
maestro record maestro/flows/03_active_workout.yaml --output maestro-output/
```

## Pass/Fail Report Format

With `--format junit`, the output file (`maestro-results.xml`) is a standard JUnit XML report compatible with GitHub Actions, CircleCI, and most CI systems.

Console output uses this format per flow:

```
✅ 01_navigation.yaml     PASSED  (12.4s)
✅ 02_blank_workout.yaml  PASSED  (18.7s)
❌ 03_active_workout.yaml FAILED  (22.1s) — assertVisible(id: volyume-btn-next-exercise) timed out
```

## Architecture

### Subflows (`maestro/subflows/`)

Reusable building blocks called from flows with `runFlow`:

| Subflow | Purpose |
|---------|---------|
| `_launch_fresh.yaml` | Clears app state, logs in as local user |
| `_log_warmup_set.yaml` | Switches to Warm-up type and completes one set |
| `_log_working_set.yaml` | Switches to Working type and completes one set |
| `_log_dropset.yaml` | Switches to Drop Set type and completes one set |

### testID Map

Key `testID` props added to source components for reliable element targeting:

| testID | Component | Purpose |
|--------|-----------|----------|
| `volyume-weight-input` | `SetEntry` | Weight TextInput |
| `volyume-reps-input` | `SetEntry` | Reps TextInput |
| `volyume-set-type-btn` | `SetEntry` | Set type picker trigger |
| `volyume-btn-complete-set` | `ActiveWorkoutScreen` | Primary CTA when target not yet met |
| `volyume-btn-next-exercise` | `ActiveWorkoutScreen` | Primary CTA when target met, not last exercise |
| `volyume-btn-finish-primary` | `ActiveWorkoutScreen` | Primary CTA when target met and last exercise |
| `volyume-btn-extra-set` | `ActiveWorkoutScreen` | Secondary CTA after target reached |
| `volyume-btn-next-exercise-ghost` | `ActiveWorkoutScreen` | Ghost Next Exercise before target is met |
| `volyume-btn-finish-ghost` | `ActiveWorkoutScreen` | Ghost Finish Workout before target is met |
| `volyume-btn-add-mid-workout` | `ActiveWorkoutScreen` | Header "+" to add exercise mid-workout |
| `volyume-btn-skip-setup` | `BuildWorkoutScreen` | Skip Setup → empty active workout |
| `volyume-btn-add-exercise` | `BuildWorkoutScreen` | Add exercise in build screen |
| `volyume-btn-start-training` | `BuildWorkoutScreen` | Start Training with configured exercises |
| `volyume-btn-copy-from-library` | `PlansScreen` | Add library plan to My Plans |
