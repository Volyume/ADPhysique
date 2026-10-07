# Lane A1 (Sonnet, read-only): the live logging screen, mapped completely

Read first: common.md. Then read, in full, src/screens/ActiveWorkoutScreen.js
(7,170 lines; read ALL of it in chunks, it is the subject), every file in
src/components/workout/, src/components/SetEntry.js,
src/components/RestTimer.js, src/components/ExercisePickerModal.js,
src/components/PRCelebration.js, src/components/ExerciseConflictSheet.js,
src/components/ActiveSessionMiniBar.js, and the lib modules the screen
imports (follow its import list; expected among them: restSuggest.js,
restTimerMath.js, restSound.js, warmupRamp.js, sessionAdjustments.js,
sessionEffective.js, swapEngine.js and src/lib/exercise/swap*.js,
clusterSet.js, quickSession.js, quickSessionKit.js, pastWorkoutPRs.js,
workoutHelpers.js, workoutRecordLine.js, exerciseDisplay.js,
exerciseInstructions.js). Also modules/rest-timer-live and
modules/live-activity (what the native side shows), and the tests under
src/components/workout/__tests__ and src/screens/__tests__ that pin the
screen (list what each pins in one line).

Write ONE file: docs/audit/workout-logger-audit-2026-10-06/01-logger-core-map.md

Sections, in this order:
1. How the screen is reached: every route param it accepts, every mode it
   runs in (a planned session from a programme day, a freestyle or quick
   session, a resumed session after the app was closed, an empty session,
   anything else), and how each mode changes what renders.
2. Anatomy, top to bottom, as the user sees it: every region (header,
   status strip, now card, outline, set rows, bottom bar, sheets, modals,
   menus, toasts, celebration), what each shows, every control in it, and
   what each control does. Note what is shown only in some states.
3. Logging a set, end to end: the inputs (weight, reps, time, distance,
   bodyweight, assisted, anything else), the keyboard or stepper used, how
   the target from the plan is shown, how the previous session's set is
   shown (ghost, placeholder, prefilled), auto-fill and "kept as filled in"
   versus typed (migrate_189 touched this), set types (warm-up, working,
   drop, cluster, failure, AMRAP, anything else), RPE or RIR capture,
   completing, un-completing, editing, deleting, reordering, adding a set,
   notes per exercise or per set, the per-set menu (SetRowMenu and its iOS
   variant). What happens on each tap, in order.
4. The rest timer: when it starts (automatic or manual), how the length is
   chosen (restSuggest, restTimerMath), what the user can adjust, sound and
   haptics, the notification when the app is in the background, the Live
   Activity (iOS) and the Android rest-timer surface, skipping, and what
   the timer looks like on screen.
5. Exercises during a session: adding one (the picker: search, sections,
   filters, recents, custom exercises), swapping (which candidates, how the
   carry of sets and targets works, the conflict sheet), replacing,
   removing, reordering, supersets or pairing if any, instructions and
   detail, the "why this" copy, warm-up ramp, the cluster set.
6. Records and milestones: how a PR is detected during the session, what
   counts (weight, reps, e1RM, volume), the celebration, where it is stored.
7. Finishing: the finish flow step by step, how incomplete or empty sets are
   treated, discard, duration, what is written to the database and what is
   pushed to sync, what the user sees next.
8. Persistence and resilience: autosave cadence, resume after kill, the
   mini bar when the user navigates away, what is lost on crash, timers
   across background.
9. Units, loads and maths: kg and lb handling, plate rounding or plate
   maths if any, bodyweight and assisted loads, e1RM formula used, volume
   counting rules, time-based sets.
10. State and performance: what lives in component state, what in the
    store, what in the database; render structure (FlatList, ScrollView,
    sections); anything that suggests jank on a long session (whole-list
    re-renders, inline closures over large arrays, synchronous DB writes
    on keystroke); the size and shape of the file itself.
11. Look and feel, as coded: the theme tokens used (colours, type sizes,
    spacing, radii) and every hard-coded value; the visual hierarchy of
    a set row and of the now card; density (how many sets fit a phone
    screen); iconography; animation and haptics; dark and light handling;
    accessibility (labels, hit targets, dynamic type, reduced motion).
12. Copy: every user-facing string family on the screen (instructions,
    empty states, errors, confirmations), with tone notes against
    docs/COACHING_VOICE_SYNTHESIS_LOCKED.md (calm, plain, no commands).
13. Flags, TODOs, dead code, duplicated logic, and anything inconsistent
    between two paths (e.g. a swap surface that ignores something the add
    surface honours).
14. Ambiguities: anything you could not settle from the code.
15. Tests: one line per suite naming what it pins.

Do not touch: anything outside your one report file. Lane A2 is mapping
the periphery (entry points, summary, history, exercise detail, settings,
data model, widgets) at the same time; do not duplicate that, but do note
every hand-off point from the logging screen to those surfaces.
