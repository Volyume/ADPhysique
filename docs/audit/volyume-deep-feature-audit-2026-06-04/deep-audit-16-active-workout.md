# Deep Feature Audit — Item 15: Active Workout screen

**Document:** deep-audit-16-active-workout.md
**Item:** 15 of master inventory (screen #11 — `ActiveWorkoutScreen`; the live-logging core)
**File:** `src/screens/ActiveWorkoutScreen.js` (2430 lines), components `SetEntry`, `RestTimer`, `ExercisePickerModal`, libs `algorithms`, `swapEngine`, `clusterSet`, `unilateral`, `mesocycle`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

> Runtime-critical: live logging, store mutations, the workout timer, PR
> detection, the persistent notification, and cloud sync-on-finish all live here.
> Change 2 below touches the exercise-change hot path, so it is proposed with
> care and would be verified against the full suite.

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The live workout. Header (cancel / timer / finish), a horizontal exercise
navigator, then the current exercise: target row, rest timer, the SetEntry card
(weight/reps/RIR/set-type) with a stack of contextual cues (inline per-set
target, coach reason, stalled-progress nudge, "last time / can you hit N+1?"
beat-chip, repeat-last, ghost prefill, first-set hint), the primary Log-set /
Start-cluster / Next-exercise button, secondary actions (Note, Info, Add, Pair,
Remove), and the "This workout" logged-set list. Plus modals: exercise picker
(add/swap), superset heads-up, stale-recovery, set-type picker, exercise guide,
swap, discard. On finish it counts from the DB, writes the workout, fires
`workout_completed` telemetry, syncs to cloud immediately, and routes to the
summary.

### Findings
1. **Best-in-class live logging.** It matches or exceeds every item the 2026
   research names (Step B): auto-rest-timer on log, "see what you did last time"
   beat-chip, a progression engine that auto-bumps the target (`setTargets` +
   inline target chip + prefill), auto-copy via repeat-last + ghost prefill,
   plus clusters (myo/rest-pause), supersets with a first-timer heads-up,
   time-crunch, deload prescription, unilateral logging, and a drift-free timer.
   The runtime engineering is careful (shallow selectors to avoid re-render
   storms, split notification effects, double-finish guard, cancel-guarded async
   loads). This is a genuine flagship surface.
2. **Dead computation/IO left by superseded features (the meaningful finding).**
   Four state values are computed but never rendered (verified: each read-count
   is the declaration only):
   - `_progression` — `getProgressionSuggestion` runs in an effect on every
     weight/reps change AND after every logged set, but its result is never
     shown. It is superseded by the newer `setTargets`/beat-chip system (which IS
     rendered). The old `progressionBadge`/`progressionText` styles are dead.
   - `_weeklyPlan` / `_weeklyActual` — derived in `loadHistory` on every exercise
     change; the comment at `:1376` confirms the display ("the old weekly-sets
     calendar row") was removed. The underlying `getCurrentMesocycleWeek` /
     `getPlannedMuscleVolume` reads must stay (they feed the live `isDeloadWeek`
     + deload prescription); only the two `weeklyPlan`/`weeklyActual` derivations
     are dead.
   - `_exerciseNote` — `getExerciseUserNote` is read from the DB on every
     exercise change but feeds only this unrendered state. A purely dead read.
   Net: on every exercise switch the screen does one dead DB read
   (`getExerciseUserNote`) and redundant progression compute, for output nobody
   sees. In the most-used screen, that's worth reclaiming.
3. **20 dead style keys.** `headerMuscle`, `addExerciseBtn`, `prevCard`,
   `prevTitle`, `prevSetsSummary`, `prevEmpty`, `progressionBadge`,
   `progressionText`, `addWarmupBtn`, `addWarmupBtnText`, `modalOverlay`,
   `modalContent`, `sheetSection`, `sheetOptionActive`, `setTargetsBlock`,
   `setTargetsLabel`, `setTargetRow`, `setTargetNum`, `setTargetVal`,
   `setTargetReason` — all grep-verified at 0 references (left from the
   progression badge, a prev-sets card, an old set-targets block, and an
   add-warm-up button that the comments say were removed).
4. **A11y: strong on the main flow, gaps in the modals.** The header, nav tabs
   (with selected state), Log/Next/Finish, secondary actions, swap button, and
   cluster controls all carry roles + labels. Missing roles: the set-type picker
   options (`:1962`), the swap-modal close/items/browse (`:2027`, `:2041`,
   `:2058`), the stale-recovery buttons (`:1911-1917`), the discard-modal buttons
   (`:2081`, `:2084`), the superset-modal buttons (`:1869-1888`), and the
   `EmptyExerciseView` header (`:2112`, `:2116`).
5. **Copy is excellent.** Plain, instructional, non-judgemental ("Warm-up · not
   counted in your totals", the superset steps, the time-crunch explainer). No em
   dashes (uses –, ·, ↑↓). Nothing to rewrite.

### Design assessment (values cited)
- On-system throughout: `surface` cards, amber `primaryFill` Log button (dark
  label for WCAG contrast, commented), `warning` for warm-ups/deload, `success`
  for completion ticks, scale tokens. The contextual-cue stack is dense but each
  cue is conditional and earns its place (target, beat-chip, stalled nudge,
  ghost). This reads as a tool a serious lifter built.

### Flow / integration assessment
- Start → log → rest → next/superset-jump → finish is tight and guarded. Finish
  counts from the DB (not the in-memory list, so swapped-out sets still count),
  fires telemetry, and syncs to cloud immediately (a documented fix for the
  swipe-away-after-finish data loss). Crash/stale recovery, discard, and back-
  handler all converge correctly. Solid.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Log a set in under 30 s; big inputs, minimal taps.** Between-set time is for
  resting, not navigating. Volyume's prefilled SetEntry + one-tap Log + repeat-
  last hit this. [Setgraph; OverLoad]
- **Rest timer auto-starts after a logged set**, adjustable per exercise, with a
  notification to log the next set. Volyume auto-starts on log (per-exercise
  duration) and runs a persistent notification. [Setgraph]
- **"See what you did last time" is non-negotiable; progression engines auto-bump
  at the top of the rep range.** Volyume's beat-chip + `setTargets` prefill do
  exactly this — confirming the *live* progression path, and that the dead
  `_progression` is redundant. [Setgraph; OverLoad]

---

## STEP C — COMPARISON

### Where Volyume leads
- A genuinely flagship logger: prefilled targets, beat-chip, auto-rest, clusters,
  supersets with onboarding, time-crunch, deload prescription, unilateral, crash
  recovery, immediate cloud sync. It meets the research bar on every named axis
  and goes beyond on intensity techniques and block-aware coaching. [Setgraph;
  OverLoad]

### Where Volyume lags
- Carries dead compute/IO and 20 dead styles from superseded features (findings
  2-3).
- Modal/secondary a11y roles are incomplete vs the main flow (finding 4).

### Critical gaps
- None functional. The items are a hot-path tidy (with care), dead-style removal,
  and a11y completion.

---

## STEP D — PROPOSAL

### Summary
Three changes: remove the dead styles (safe), close the modal a11y gaps (safe),
and reclaim the dead hot-path compute/IO (careful, runtime-critical, full-suite
verified). No copy or visible-behaviour change.

### Specific changes — one by one

**1. Remove the 20 dead style keys. [Cleanup — Low, zero behaviour risk]**
- What: delete the orphaned keys in finding 3 (each grep-verified at 0 refs).

**2. Reclaim the dead compute/IO. [Perf — Medium, runtime-critical → verified]**
- What: remove `_progression` state + the progression effect + the two
  `getProgressionSuggestion` calls (superseded by `setTargets`/beat-chip);
  remove `_exerciseNote` state + the `getExerciseUserNote` read; remove
  `_weeklyPlan`/`_weeklyActual` state + their two derivation lines, KEEPING the
  `getCurrentMesocycleWeek`/`getPlannedMuscleVolume` reads (they feed the live
  deload logic). Net: one fewer DB read + redundant compute removed per exercise
  change.
- Care: this is the hot path, so I would run the FULL suite (not just screen-
  mount) and re-read the deload block to confirm `currentWeek`/`plannedVols`
  stay intact. **If you'd rather restore the progression/weekly display than
  remove it, that's the alternative — your call;** my recommendation is remove,
  since the live `setTargets`/beat-chip already covers progression.

**3. Close the modal/secondary a11y gaps. [A11y — Low]**
- What: `accessibilityRole="button"` + labels on the set-type picker options,
  the swap-modal close/items/browse, the stale-recovery buttons, the discard-
  modal buttons, the superset-modal buttons, and the `EmptyExerciseView` header.

### COPY CHANGES
None. The copy is exemplary.

### What to keep (with evidence)
- The prefilled SetEntry + beat-chip + auto-rest + repeat-last + ghost (the
  sub-30s logging core), clusters, supersets + heads-up, time-crunch, deload
  prescription, unilateral, the drift-free timer, crash recovery, and immediate
  cloud-sync-on-finish. [Setgraph; OverLoad]

### IMPACT / EFFORT
- **Impact:** Low (1, tidy) / Medium (2, hot-path IO + clarity) / Low (3, a11y).
- **Effort:** Low (1, 3); Medium (2 — careful removal + full-suite verification).

### SOURCES
- Setgraph — Best app to log workout, tested by lifters:
  https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters
- Setgraph — Rest timer:
  https://setgraph.app/articles/get-the-most-out-of-setgraph-s-rest-timer
- OverLoad — Gym workout tracker:
  https://apps.apple.com/us/app/overload-gym-workout-tracker/id6445851672
