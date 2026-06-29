# Workout logging — Hevy vs Volyume

Competitive teardown of Hevy v3.1.0 (decompiled Hermes corpus) against Volyume's
in-session logging experience. Evidence is from extracted strings; the Hermes
bundle concatenates tokens, so some are corroborated across multiple signals
(events_keys, screens_components, res_strings, bundle_strings). Thin evidence is
flagged honestly. **No Hevy code or assets are copied — these are learnings and
our-own-implementation ideas only.**

---

## How Hevy does it (cite the corpus tokens/events found)

### Set entry model — multiple rep-input types
Hevy does not assume "weight × reps". The bundle carries distinct exercise/set
view-models per input type:
- `isWeightRepsExerciseViewModel` / `isWeightRepsSetViewModel`
- `isWeightDurationExerciseViewModel` / `isWeightDurationSetViewModel`
- `RepsOnly` / `repsOnly`
- `isCustomMetricDurationExerciseViewModel` / `isCustomMetricDurationSetViewModel`
- `SelectRepInputTypeModal`, `selectRepInputType`
(all in `screens_components.txt` + `bundle_strings.txt`)
So a plank logs weight+duration, a cardio/bodyweight move logs reps-only or a
custom duration metric — same set grid, different columns. There is also a
`crunchWeightRepsExerciseBestSet` token (per-input-type "best set" handling).

### RPE as a first-class, explained input
- `RPESelectorViewModel`, `rpeSelector`, `rpeInfoModal`, `rpee`/`Rpe`
- `rpeSelector.6.title` … `rpeSelector.10.title` plus matching `.description`
  keys (extracted from the raw bundle): an **RPE 6–10 scale, half-steps, each
  value carrying a title + plain-English description** in a picker.
- `volumeDoubling` / `isVolumeDoublingEnabledForAllExercisesByDefault`: unilateral
  "count both sides" volume handling as a per-exercise default toggle.

### Set types
`res_strings`/`bundle_strings` confirm: **Normal, Warm-up, Drop set, Failure**
(`warmup`/`Warmup`/`WARM_UP` ×~180, `failure` ×27, `dropset`/`drop set`,
`SetTypeModal`, `WeightColumnLabel…setTypeModal`). A single `Cluster` token
appears (thin — likely not a full Hevy feature). Set types are chosen via a
dedicated `SetTypeModal`. There is a per-set complete/uncomplete toggle
(`SetCompletedUpdate`, `SetCompletedUpdateDuringWorkoutEditing`,
`CompleteSetIndexForSetRemoved`, `completeSetInSuperset`) — i.e. Hevy logs a set
by **checking it off in a row grid**, and you can un-check to edit.

### Warm-up calculator (a feature Volyume lacks entirely)
- `WarmupCalculatorSettingsScreen`, `WarmupCalculatorModal`, `warmupCalculator`
  (×15), `warmupSets`, `warmupSetsCount`, `WarmupSetsScreen`, `warmup_values_setting`
- `volume_includes_warmup_sets` (events): warm-ups excluded from volume by setting.
Hevy **auto-generates warm-up sets** (count + loads) from the working weight,
configurable globally and per exercise.

### Rest timer — auto-start, per-exercise default, system notification
- `defaultRestTimer`, `DefaultRestTimerSeconds`, `DefaultRestTimerEnabled`,
  `RestTimerSettings`, `restTimerSettingValue`, `TrainerRestTimerViewModel`
  (rest defaults even settable by a coach/program).
- `rest_timer` (events ×2), `ManualTimerModal`, `TimerModal`/`TimerScreen`.
- **Rest timer fires as a system notification with action buttons**, from
  `res_strings.xml`:
  - `rest_timer_complete_set_button_text` = "Complete Set"
  - `rest_timer_skip_button_text` = "Skip"
  - `rest_timer_add_15s` / `rest_timer_subtract_15s` = "+15s"/"-15s"
  - `rest_timer_add_exercise_button_text` = "Add an exercise"
  - `rest_timer_open_app_button_text` = "Open App"
  - `restTimerFinishedMessage`
  So the user can complete the next set / skip / ±15 **from the lock screen**,
  without reopening the app. Evidence is strong (dedicated string resources).

### Keep-awake
- `KeepAwakeDuringWorkout` (`…Enabled`, `…UI`, `…Update`), `keep_awake` (events),
  `keepAwake`. A user setting that **keeps the screen on during a workout**.

### Supersets — full UI surface
`SupersetModal`, `SupersetOverlay`, `addToSuperset`, `moveFromSuperset`,
`completeSetInSuperset`, `ReorderExercisesModal`/`ReorderExercisesScreen`.
Supersets are created/edited via a modal and exercises are drag-reordered
(`reorderExercises`, `SwipeToDelete…`, `SwipeToOptions…`).

### Previous performance, e1RM, plate calculator
- Previous: `previousSet`, `PrefilledIndicator`/`PrefilledFromHealthIndicator`,
  ` sync_previous`, `exo_controls_previous` — a "previous" column that prefills
  and is visibly marked as prefilled.
- e1RM: `oneRepMax`, `1RM` (×11), `OneRepMaxRecord`, `e1RMsProgression`,
  `oneRepMaxPercentageMap`, `convertServerSetPRToUserUnit`, `findBestSet` — 1RM is
  computed, recorded as a PR, and drives a %1RM map.
- Plate calculator: `PlateCalculatorViewModel`, `plateCalculator` (×23),
  `plateCalculatorBars`, `barWeightInput`, `availablePlatesScreen`,
  `plateCalculatorExerciseCountUnsupported` — configurable bars + available
  plates, gated to barbell exercises.

### Editing / notes / save / discard
- Mid-set edit: `SetCompletedUpdateDuringWorkoutEditing`, `UpdateSetRepsUpdate`.
- Notes: `exercise_notes` (events), `ShareExerciseModal`, `workout_comments`.
- Save/discard: `workout_save_complete`, `workout_discard`, `workout_delete`,
  `Discard and Save` (bundle), `write_workout`, `workouts_batch`.

---

## How Volyume does it today (cite file:line)

- **Set entry is weight × reps only.** `SetEntry.js:9-143` renders a Weight
  stepper (2.5 step, `SetEntry.js:17`) and Reps stepper; no duration / reps-only
  / custom-metric path. `DEFAULT_SET` is `{ weight, reps, setType, notes, rir }`
  (`ActiveWorkoutScreen.js:35`).
- **RPE/RIR is hidden.** RIR is recorded internally (defaulted to 2 in
  `DEFAULT_SET`) but the per-set effort picker was removed — comment at
  `SetEntry.js:145-148`. `rpe` is always `null` on save
  (`ActiveWorkoutScreen.js:851`, `:868`).
- **Set types: 6 options** — straight/warmup/dropset/myo_reps/rest_pause/amrap
  (`ActiveWorkoutScreen.js:39-46`), richer than Hevy's 4. Myo-reps/rest-pause use
  a bespoke cluster flow (`ActiveWorkoutScreen.js:995-1060`, `lib/clusterSet.js`).
  Chosen via a set-type picker opened from the orientation row
  (`ActiveWorkoutScreen.js:1672-1682`).
- **Logging model is a single live "current set" card**, not a row grid. One set
  is entered and committed via `handleCompleteSet` (`:798-993`); committed sets
  render as read-only `LoggedSetRow`s (`:62-86`). There is no per-row check/edit
  of an already-logged set in-session.
- **Rest timer**: in-app card only (`RestTimer.js`). Auto-starts after a working
  set with per-exercise duration (`ActiveWorkoutScreen.js:940`,
  `routineExercise.restSeconds || 90`). ±15 with long-press repeat, Skip, 3-2-1
  beeps/haptics (`RestTimer.js:23,92-119,198-224`). **Lock-screen / Live Activity
  notification is deliberately disabled** (`RestTimer.js:54-59`) — there is a
  persistent active-workout notification but it has **no quick actions**
  (`ActiveWorkoutScreen.js:520-562`).
- **Previous performance**: a tappable "beat line" prefills last session's
  weight×reps (`ActiveWorkoutScreen.js:1700-1767`) plus a ghost prefill into the
  inputs (`:606-619,666-681`). This is good and close to Hevy's "previous" column.
- **e1RM**: live estimate beside Reps (`SetEntry.js:35-103`) and on each logged
  row (`ActiveWorkoutScreen.js:80-82`); `calculate1RM` at `algorithms.js:77`.
- **Plate calculator EXISTS but is ORPHANED**: `PlateCalculator.js` is a complete
  component (bar/plate visual, per-side breakdown), `calculatePlates` /
  `PLATE_SETS` / `DEFAULT_BAR_WEIGHT` at `algorithms.js:836-843`, and `SetEntry.js`
  even has `plateBtn`/`plateBtnText` styles (`:183-196`) — but **nothing renders
  or imports PlateCalculator anywhere in src/** (grep: only its own definition).
  It is dead/unwired in the active workout.
- **Keep-awake: ABSENT.** No `expo-keep-awake` / `useKeepAwake` anywhere in src/.
  The screen can sleep mid-set.
- **Supersets**: adjacent same-`supersetGroupId` entries, toggled via
  `handleTogglePair` (`:264-279`), heads-up modal (`:434-447`), auto-jump between
  the pair on log (`:924-937`). No drag-reorder of exercises in-session.
- **Notes**: per-set note input (`ActiveWorkoutScreen.js:1825-1837`).
- **Save/discard**: `handleFinishWorkout` (`:1189`), discard modal (`:378-389`),
  immediate cloud sync on finish (`:1270-1277`).
- **Auto-advance**: advances to next exercise 1.8s after the target set count is
  hit (`:942-950`) — a nicety Hevy does **not** appear to have.

---

## Gaps (what Hevy has/does better that we don't)

1. **Rest timer has no lock-screen quick actions.** Hevy lets the user Complete
   Set / Skip / ±15 / Add exercise from a system notification; Volyume disabled
   its notification entirely. A lifter who locks their phone between sets loses
   the timer.
2. **No keep-awake.** Screen sleeps mid-workout — a basic gym-app expectation
   Hevy ships as a setting; Volyume has nothing.
3. **Plate calculator is built but unreachable.** We have the whole component and
   the maths; it's simply not wired to a button on the set card.
4. **Single rep-input model.** No weight+duration / reps-only / time-based logging
   (planks, carries, timed holds, cardio-as-exercise). Hevy keys logging off the
   exercise's input type.
5. **RPE/effort is invisible to the user.** Hevy makes RPE a deliberate,
   explained 6–10 picker; we collect RIR silently and show nothing — users can't
   set or see effort, and there's no in-app RPE education.
6. **No warm-up calculator.** Hevy auto-builds warm-up sets from the working
   weight; Volyume makes the user hand-enter every warm-up.
7. **No per-row set grid / un-complete to edit.** Editing an already-logged set
   in-session is awkward (Hevy: tap a row, change it, re-check).
8. **No in-session drag-reorder of exercises.** Hevy has `ReorderExercisesModal`
   + swipe-to-delete; Volyume only has a horizontal nav strip.

---

## Recommendations

| # | Recommendation | Adopt/Adapt | Effort | Priority | Why |
|---|---|---|---|---|---|
| R1 | **Wire up the existing PlateCalculator** — add a small "Plates" button on the weight row (the `plateBtn` style already exists) that opens `PlateCalculator` for barbell exercises, seeded with the current weight + `barWeight`. | Adopt (our code) | **S** | **P1** | Component + maths already written and tested; pure wiring. Highest value-per-hour win in this area. |
| R2 | **Add keep-awake during an active workout** via `expo-keep-awake` (Expo-managed, no eject), behind a setting defaulting on. | Adapt | **S** | **P1** | Table-stakes; trivial; removes a real in-gym annoyance. *(Requires founder OK to add the `expo-keep-awake` dependency — state it before installing.)* |
| R3 | **Re-enable the rest-timer notification with quick actions** (Complete Set / Skip / ±15), reusing the existing active-workout notification channel. Fix the "Set N of M" label bug that got it disabled (`RestTimer.js:54-59`) — Volyume already counts working sets correctly via `countProgressSets`, so the original blocker is solvable. | Adapt | **M** | **P1** | Closes the biggest functional gap; the infra (notification module) already exists. |
| R4 | **Surface RPE/RIR as an optional, explained per-set control** — a compact 6–10 (or RIR 0–4) selector with one-line descriptions, off the critical path, feeding the autoregulation engine we already populate silently. | Adapt (NOT copy Hevy's scale text) | **M** | **P2** | We already store RIR; exposing it improves coaching signal and matches a feature serious lifters expect. Engine boundary unaffected (deterministic, no AI). |
| R5 | **Warm-up calculator**: generate N warm-up sets (e.g. 40/60/80% ramp) from the prefilled working weight, one-tap to add as `warmup` sets (which we already exclude from volume). | Adapt | **M** | **P2** | Removes repetitive manual entry; reuses our existing warmup set-type + counting. |
| R6 | **Duration / reps-only input types** keyed off exercise metadata (planks, carries, timed holds). | Adapt | **L** | **P3** | Real model change touching DB/summaries; valuable but large — schedule deliberately, not opportunistically. |
| R7 | **In-session exercise drag-reorder + swipe-to-remove** on the nav strip. | Adapt | **M** | **P3** | Nice-to-have; current nav strip + remove-via-overflow covers the 80% case. |

---

## Quick wins (≤3, shippable fast)

1. **R1 — wire the orphaned PlateCalculator to a "Plates" button** on the weight
   row of `SetEntry.js` (barbell exercises only). Code already exists; this is
   wiring + a modal. **S / P1.**
2. **R2 — `expo-keep-awake` during active workout**, setting-gated, default on.
   A few lines in `ActiveWorkoutScreen.js`. **S / P1** (pending dependency OK).
3. **R3-lite — restore a basic rest-timer notification** showing the countdown
   with a **Skip** + **±15** action, deferring the "Complete Set" action to a
   follow-up. Reuses `lib/notifications/activeWorkout`. **S–M / P1.**

> Honest evidence caveats: rest-timer notification actions, RPE 6–10 scale, and
> warm-up calculator are **strong** (dedicated string resources / multiple
> corroborating tokens). The single `Cluster` token is **thin** — Volyume's
> myo-rep/rest-pause cluster flow is likely *ahead* of Hevy here, not behind.
