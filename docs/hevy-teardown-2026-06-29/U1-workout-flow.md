# Active-workout FLOW & ergonomics — Volyume vs Hevy

USABILITY/FLOW teardown of the in-session experience. The lens here is **taps,
keystrokes, reach, interruptions and glanceability**, not feature parity (that
is `01-workout-logging.md`). Evidence: Volyume from source (file:line);
Hevy from the decompiled Hermes corpus (`screens_components.txt`,
`res_strings.xml`, `events_keys.txt`, raw `index.android.bundle`). Hermes
concatenates string tokens, so Hevy flow steps are **inferred from screen /
view-model / string-resource names**, corroborated where possible and flagged
where thin. Neither app can be run; all step counts are reasoned, not measured.
**No Hevy code or assets copied — learnings only.**

---

### Tap/flow comparison

Taps counted from the home screen / mid-session surface to the stated outcome.
"Volyume taps" reflect the current build; bracketed notes show where a tap is
optional or avoidable.

| Task | Volyume taps | Hevy taps | Winner |
|---|---|---|---|
| **(a) Start a planned session** | 2–3: tap routine/Start → **intent sheet ("How are you feeling?")** → tap a mood OR Skip (`HomeScreen.js:782-825,1678-1749`) | 1–2: tap routine → Start Routine (`res_strings.xml:60 androidWidgets_startRoutine`; `UserRoutineDetailScreen`) | **Hevy** — Volyume injects a readiness modal on every start |
| **(a) Start a blank/empty session** | 1: Quick-start → direct (`HomeScreen.js:851-856`) | 1: "Start Empty Workout" | **Tie** |
| **(b) Log one set (values already prefilled)** | **1 tap**: Log set; or **0 extra** via keyboard Done (`SetEntry.js:130`, `ActiveWorkoutScreen.js:1028-1033,1925-1942`). Auto-fills last weight×reps (`:651-664`) | **1 tap**: check the set row's complete box (`SetCompletedUpdate`, `completeSetInSuperset`); previous column prefills (`previousSet`, `PrefilledIndicator`) | **Tie** (Volyume slightly faster via keyboard-completes-set) |
| **(b) Log one set, adjusting weight ±2.5** | 2: one stepper tap (`SetEntry.js:48-90`, 2.5 step) + Log set | 2: tap weight cell, type, tap complete (no stepper found in corpus) | **Volyume** — stepper avoids opening keyboard |
| **(c) Add an exercise mid-session** | 2: "Add exercise" → pick (`:1964-1973`, `handlePickerSelect :361-371`) | 2: Add exercise → pick; also reachable from rest-timer notification (`rest_timer_add_exercise_button_text`) | **Tie** (Hevy also offers it from the lock screen) |
| **(c) Swap current exercise** | 2–3: Swap → ranked list → pick (`:311-356,1501-1510`); escape hatch to full library is one more (`:2391-2403`) | 2–3: exercise menu → Replace → pick | **Tie** (Volyume's ranked suggestions are a genuine edge) |
| **(c) Reorder exercises mid-session** | **Not possible** — only a horizontal nav strip to jump (`:1456-1488`); order is fixed | drag-reorder screen (`ReorderExercisesModal`/`ReorderExercisesScreen`, `:78,423`) + swipe-to-delete | **Hevy** |
| **(d) Handle rest (in app)** | 0: auto-starts after a working set (`:940`); ±15 / Skip on the card (`RestTimer.js:198-224`) | 0: auto-starts (`DefaultRestTimerEnabled`); ±15 / Skip | **Tie** |
| **(d) Handle rest (phone locked)** | **Impossible** — lock-screen timer deliberately disabled (`RestTimer.js:54-59`); persistent notification has no actions (`:520-562`) | Complete Set / Skip / ±15 / Add exercise **from the system notification** (`res_strings.xml:892-896`) | **Hevy** (strong evidence) |
| **(e) Finish & review** | 3: Finish → **"Finish Workout?" confirm alert** → Finish → summary (`:1189,1197-1335,1287`) | 2: Finish → save/complete → summary (`workout_save_complete`) | **Hevy** — Volyume adds a confirm step |
| **(e) Discard with no sets logged** | 1: Cancel (✕) → straight back, no modal (`:378-389`) | 1: discard (`workout_discard`) | **Tie** |
| **Leave session running, do something else** | **Not possible** — `ActiveWorkout` is a full screen with no minimise; navigating away relies on a persistent notification only | **Minimise to a floating bar** (`PerMinimizedWorkoutViewModel`, `FloorsPerMinimizedWorkoutScreen`, `:411,624`) and keep browsing | **Hevy** (strong: dedicated minimized-workout view-models + screen) |

---

### Where Hevy's flow is better

1. **Persistent rest-timer control from the lock screen.** The single biggest
   ergonomic gap. A lifter who pockets/locks the phone between sets can, in
   Hevy, Complete Set / Skip / ±15 / Add exercise straight from the notification
   (`res_strings.xml:892-896`). Volyume's lock-screen timer is **switched off on
   purpose** (`RestTimer.js:54-59`) over an old "Set 3 of 2" label bug, and the
   surviving persistent notification carries **no action buttons**
   (`ActiveWorkoutScreen.js:520-562`). One-handed, mid-gym, screen-off: Hevy
   wins outright.

2. **Minimise the workout and keep moving.** Hevy can collapse the active
   session to a floating bar and let the user browse history, look up an
   exercise, or check another routine, then tap back in
   (`PerMinimizedWorkoutViewModel`, `FloorsPerMinimizedWorkoutScreen`). Volyume's
   `ActiveWorkout` is a hard full-screen takeover — the only way "out" is the
   notification, and any in-app navigation means leaving the logging UI entirely.
   This hurts interruption recovery (a text, a superset partner, checking last
   week's numbers).

3. **Fewer gates on the two highest-frequency actions: start and finish.**
   Volyume puts a **readiness modal in front of every planned start**
   ("How are you feeling?", `HomeScreen.js:1685`) and a **confirm alert in front
   of every finish** ("Finish Workout?", `:1197`). Both are Skip-able/one-tap,
   but they are taps Hevy doesn't charge. Across a week of sessions that is real
   friction on the two moments a user does most.

4. **In-session reorder + swipe gestures.** Hevy supports drag-reorder
   (`ReorderExercisesScreen`) and swipe-to-delete/options on rows. Volyume can
   only *jump* between exercises via the nav strip and *remove* via a two-step
   overflow→confirm; you cannot change the order once training.

5. **Edit an already-logged set in place.** Hevy's grid lets you un-check and
   re-edit a logged set in one tap (`SetCompletedUpdateDuringWorkoutEditing`,
   `UpdateSetRepsUpdate`). Volyume renders logged sets as **read-only rows**
   (`LoggedSetRow :62-86`) — fixing a fat-fingered set mid-session has no obvious
   path on the active screen.

---

### Where Volyume is better

1. **Weight steppers beat raw keyboard entry for the common nudge.** A ±2.5 kg
   change is one tap with no keyboard (`SetEntry.js:48-90`); in Hevy the corpus
   shows cell-based numeric entry, i.e. open keyboard → type → dismiss. For the
   "same as last set but +2.5" case (very common), Volyume is faster and more
   one-hand-friendly.

2. **Keyboard "Done" completes the set.** The reps field's Done key logs the set
   directly (`SetEntry.js:126-130`, `handleCompleteSetPress :1028-1033`), so a
   typed set needs **zero reach to a button** — finger never leaves the keyboard.
   Genuinely lower-friction than tapping a separate complete control.

3. **Auto-advance to the next exercise.** When the target set count is hit,
   Volyume scrolls to the next exercise after 1.8s (`:942-950`) — a step Hevy
   does not appear to automate. Removes a manual "next" tap per exercise.

4. **Prefill carries forward what you actually lifted**, not a stale target
   (`:651-664,910-915`), and a one-tap "Last: 60kg × 8" beat line re-applies the
   previous set (`:1700-1767`). Parity with Hevy's previous column, plus the
   ghost-input treatment is a nice glance cue.

5. **Smarter swap.** Volyume ranks swap candidates by similarity with a plain
   reason string (`swapEngine`, `:311-356,2373-2380`) and always offers a full
   library escape hatch. Hevy's replace is a flat browse. More glanceable, fewer
   wrong picks.

6. **Crash/background recovery of the in-progress set.** The typed-but-unlogged
   set is drafted to storage on a 250ms debounce **and** flushed instantly on
   background (`:761-786`), keyed to the exact set position so it never lands on
   the wrong row. Strong interruption recovery for the *current* set
   (separate from the minimise gap above).

7. **Glanceable rest countdown with escalating 3-2-1 audio+haptics**
   (`RestTimer.js:92-119`) so the user feels the timer end without looking —
   though this only helps when the app is foregrounded (see Hevy gap #1).

---

### Friction defects in our flow (file:line)

- **F1 — Readiness modal on every planned start.**
  `HomeScreen.js:782-798,1678-1749`. An extra full-screen sheet between intent
  and training. Optional, but unconditional and shown every session.
- **F2 — Confirm alert on every finish.**
  `ActiveWorkoutScreen.js:1197-1201`. A blocking native alert ("Finish
  Workout?") on the single most-repeated end action. Justified only for
  accidental taps; charges everyone.
- **F3 — No lock-screen timer / no notification actions.**
  `RestTimer.js:54-59`; `ActiveWorkoutScreen.js:520-562`. Timer dies when the
  phone locks; the persistent notification is display-only. Biggest real-gym
  defect.
- **F4 — No minimise; `ActiveWorkout` is a full-screen takeover.**
  Whole-screen `SafeAreaView` (`:1414-1415`) with cancel/finish as the only
  exits. Any side-trip means leaving the logging UI.
- **F5 — Logged sets are read-only mid-session.**
  `LoggedSetRow :62-86`; rendered list `:1947-1959`. No tap-to-edit a prior set;
  a mistyped set can only be left wrong or the whole flow worked around.
- **F6 — No in-session reorder.** Nav strip only (`:1456-1488`); order is fixed
  once started.
- **F7 — Banner/notes rail can still push inputs down.** The collapsed "N notes"
  rail (`:1541-1637`) helps, but on a short screen the nav strip + rest timer +
  rail + card header (3–4 lines, `:1663-1798`) stack above the weight input;
  glanceability of the actual inputs degrades when several context lines are live.
- **F8 — Remove exercise is overflow → destructive alert** (two steps + confirm,
  `:281-309,2271-2281`) where Hevy uses one swipe.

---

### Recommendations

Effort S/M/L, priority P1–P3. Ordered by flow impact per hour.

| # | Fix | Effort | Priority | Notes |
|---|---|---|---|---|
| U1 | **Make the readiness sheet skippable-by-default / remember "Skip".** Show it on first session of a routine, then collapse to a one-line chip the user can tap to expand. Removes F1 from the daily path without losing the coaching signal. | S | **P1** | Pure UX gating; engine input stays optional. Touches `HomeScreen.js` only. |
| U2 | **Drop the Finish confirm for sessions with logged sets, or downgrade it to an undoable toast.** Keep a guard only for a genuine mis-tap (e.g. long-press to finish, or confirm only when 0 sets / very short session). Removes F2. | S | **P1** | `ActiveWorkoutScreen.js:1197`. Already double-tap-guarded via `finishingRef`. |
| U3 | **Re-enable the rest-timer notification with Skip + ±15 actions** (defer "Complete Set"). The "Set N of M" bug that disabled it is already solved — `countProgressSets` counts working sets correctly (`workoutHelpers`). Reuse `lib/notifications/activeWorkout`. Closes F3, the top defect. | M | **P1** | Founder rule: this is the lock-screen ergonomics win. Mirrors `01-workout-logging.md` R3. |
| U4 | **Tap-to-edit a logged set.** Make `LoggedSetRow` open the set back into the entry card (or an inline editor) and re-save. Closes F5; removes the "wrong set is stuck" dead-end. | M | **P2** | `ActiveWorkoutScreen.js:62-86,1947-1959`; needs an `updateWorkoutSet` path. |
| U5 | **Minimise-to-bar for the active workout.** Let the user collapse `ActiveWorkout` to a persistent in-app bar and navigate elsewhere, tapping back in. Closes F4; the biggest interruption-recovery gap. | L | **P2** | Real navigation change (the session already survives via store + draft, so state is safe); schedule deliberately. |
| U6 | **In-session drag-reorder + swipe-to-remove** on the nav strip. Closes F6/F8. | M | **P3** | Nav strip + overflow covers the 80% case today; nice-to-have. |
| U7 | **Guard input visibility on short screens.** Cap simultaneously-visible context lines (e.g. fold the target line into the notes rail when a coaching line is live) so the weight/reps inputs always sit above the fold. Addresses F7. | S | **P3** | `ActiveWorkoutScreen.js:1663-1798`; the COMP-001 fold maths already exists to build on. |

> Evidence caveats: Hevy's **lock-screen timer actions** (dedicated string
> resources `rest_timer_*`) and **minimise-to-floating-bar**
> (`PerMinimizedWorkoutViewModel` + `FloorsPerMinimizedWorkoutScreen`) are
> **strong**. Hevy **reorder/swipe** is **medium** (view-model/screen names,
> concatenated). Exact Hevy **tap counts** are inferred from screen/handler
> names, not observed — treat the comparison table's numbers as reasoned
> estimates, not measurements. Volyume figures are read directly from source.
