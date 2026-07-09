# Workout logger — interaction, feature-completeness & flow audit

Scope: interactions, feature completeness, and session flow of the workout
logger only. Layout/responsiveness (screen fit, safe areas, touch targets) is
covered by a separate audit and is deliberately NOT duplicated here. Workout
logging is a FREE feature (CLAUDE.md §2) — nothing below suggests Pro-gating
any of it.

**Method.** Read the full current source of `src/screens/ActiveWorkoutScreen.js`
(3,668 lines), `BuildWorkoutScreen.js`, `ManualBuilderScreen.js`,
`WorkoutSummaryScreen.js`, `WorkoutHistoryScreen.js`,
`src/components/RestTimer.js`, `SetEntry.js`, `ExercisePickerModal.js`,
`ActiveSessionMiniBar.js`, `PRCelebration.js`, the notification/rest-timer
stack (`src/lib/notifications/activeWorkout.js`, `categories.js`,
`listeners.js`, `restForeground.js`) and the native module surface
(`modules/rest-timer-live/index.ts`). Every claim below was checked against
this current code, not against the prior audit docs — the three source
documents named in the brief (`docs/hevy-teardown-2026-06-29/01-workout-logging.md`,
`U1-workout-flow.md`, `_PARITY-SCORECARD-AND-BACKLOG.md`) and
`docs/world-class-audit-2026-07-03/02-training-core.md` are 10 days to six
weeks stale on several flagship items; where they diverge from current code
that is called out explicitly, because a lot has shipped since.

**Headline finding.** The three prior audits' single biggest flagged gap —
**editable/deletable logged sets in-session** — is now shipped in full
(`ActiveWorkoutScreen.js:1352-1455,3172-3234`), along with several other
items the backlog carried as open: the rest-timer lock-screen notification
with actions, a minimise-to-bar surface, a warm-up calculator, keep-awake,
and multi-schema set entry (duration/distance/reps-only). The remaining gaps
are narrower and more specific than the older docs suggest.

---

## 1. Set logging ergonomics

**Taps per set: at par or better than Hevy/Strong.** Values prefilled from
history auto-fill (`ActiveWorkoutScreen.js:933` "Pre-fill from what was
ACTUALLY lifted last time"), and logging is 1 tap (Log set) or 0 extra taps
via the keyboard's Done key on the Reps field, which completes the set
directly (`SetEntry.js:356-360`, `onSubmitComplete`). This is a genuine edge
over Hevy's row-grid tap-to-check model — no other lifting app in the
teardown corpus offers keyboard-completes-the-set.

**Steppers are plate-friendly and per-exercise.** `SetEntry.js:22-39`
honours `exercise.incrementKg` (e.g. 1.0 for dumbbell moves, 2.5 barbell
default) rather than a single global step; long-press repeats at 200ms
(`SetEntry.js:62-66`). This is above par — Hevy's corpus shows plain
cell-based numeric entry with no stepper.

**Repeat-last-set exists as a one-tap "beat line".** `ActiveWorkoutScreen.js:2248-2273`
renders `Last: {prev.weight}{units} x {prev.actualReps}` with a tappable
"Use" cue that re-applies the previous set's values
(`beatLineCue`/`beatLineCueText`, `:2271`). Deload weeks get their own
variant (`:2219-2234`, "Recovery week - {target}"); first-time exercises show
a target-based cue (`:2279-2284`). This is parity-plus with Hevy's
"previous" column — Volyume's version is a one-tap apply, not just a
prefill.

**Multi-schema set entry now exists — the single biggest gap in the prior
teardown is closed.** `SetEntry.js:13-392` renders distinct input rows keyed
off `exerciseType`: `weight_reps`/`weighted_bodyweight` (weight+reps),
`reps_only` (reps only, weight row hidden, `:317`), `duration` (mm:ss time
stepper, `:166-212`), `distance` (distance+time, `:218-311`). This directly
answers R6 in `01-workout-logging.md` (previously flagged as "**L**, large
model change") — it has already been built and shipped. **Above par**: this
now matches Hevy's per-input-type view-model split.

**RIR/RPE is still hidden from the user (unchanged from the prior audit).**
`SetEntry.js:381-384` — the effort picker is deliberately removed ("Effort
picker removed, was rarely used in practice. RIR still gets recorded
internally... we just don't ask the user to set it per-set"). `DEFAULT_SET.rir`
defaults to 2 (`ActiveWorkoutScreen.js:53`) and `rpe` is hard-coded `null` on
every save (`:1135,1152`). Per CLAUDE.md's backlog
(`_PARITY-SCORECARD-AND-BACKLOG.md`, GATED section), RPE-per-set entry is
explicitly flagged as touching the "deterministic-coaching boundary" and
needs a founder decision — **do not build this without that decision**, but
flag it as a below-par gap versus Hevy's explained 6–10 RPE picker. Severity
**B** (a founder call, not a build call).

**Warm-up sets: a full calculator is now shipped (was entirely absent).**
`ActiveWorkoutScreen.js:2754-2825` (`warmupRamp` from `lib/warmupRamp.js`)
generates a suggested ramp of warm-up sets up to the working weight,
barbell-aware (`BARBELL_EQUIPMENT`, empty-bar row, `:2784-2786`), opened
pull-only from the exercise overflow menu (`:2896-2918`) — a deliberate
no-auto-suggest decision, documented in-code. Tapping a row loads it into
the entry as a `warmup` set. This closes R5 from `01-workout-logging.md`.
At par with Hevy's warm-up calculator.

**Plate calculator: the orphaned component from the prior audit no longer
exists at all** — `find src -iname "*platecalc*"` returns nothing. This
matches the backlog's explicit note ("Plate calculator — REJECTED by founder
(kept deleted)"). Not a gap; a recorded decision. `DEFAULT_BAR_KG` from
`lib/plateMath.js` is still used, but only to seed the warm-up ramp's
empty-bar row (`:2786`), not a plate-breakdown UI.

**Supersets: full pairing UI, capped at pairs by design, with a giant-set
bug that was fixed at the source.** In-session: adjacent same-`supersetGroupId`
entries pair via `handleTogglePair` (`:493-504`), a heads-up modal shows once
per pair (`supersetHeadsUp`, `:259,2564-2600`), and completing a set
auto-jumps to the paired exercise (`:1258-1261`). The prior training-core
audit (07-03, finding #6) flagged that the *builder* allowed 3+ exercises in
one `supersetGroupId` while the live session only ever pairs two adjacent
ones, "silently breaking mid-session". This is now fixed at the builder:
`ManualBuilderScreen.js:490-494` caps selection at a pair with an explicit
toast ("Supersets pair two exercises for now.") and `:515-518` belt-and-braces
enforces it again before grouping. **Closed as of this read** — no giant-set
authoring path remains that a live session could break on.

**Notes: per-set note input exists**, opened from the exercise overflow menu
(`noteActionLabel`, `ActiveWorkoutScreen.js:2863-2876`, input at
`:showNoteInput`). No per-exercise *persistent* note across sessions (the
training-core audit's finding #12, "no per-exercise personal notes") — this
remains open; a "next time" note captured at session end
(`saveNextTimeNote`, `WorkoutSummaryScreen.js:20,646`) resurfaces at the
*next* session start (`getNextTimeNotes`, `ActiveWorkoutScreen.js:21`) but is
session-scoped, not a durable per-exercise notebook. Severity **C**.

---

## 2. Mistake recovery

**Edit / delete a logged set in-session: SHIPPED IN FULL.** This was the
flagship gap named in `_PARITY-SCORECARD-AND-BACKLOG.md` Tier 1 item 1
("Editable / deletable logged sets in-session... `LoggedSetRow` is
render-only; no `deleteWorkoutSet`/`updateWorkoutSet` in `database.js`").
Current code:
- `LoggedSetRow` (`ActiveWorkoutScreen.js:124-166`) is now a `TouchableOpacity`
  with `onPress={() => onEdit(set)}`, full accessibility label/hint
  ("Opens a sheet to change or delete this logged set", `:146`).
- `openEditSet` (`:1352-1360`) opens a modal (`:3172-3234`) that reuses
  `SetEntry` itself, so every exercise type (weight/reps, duration,
  distance, reps-only) gets the correct edit inputs for free (`:3193-3200`).
- `handleSaveEditedSet` (`:1362-1407`) validates via the same
  `validateSetEntryValue` the log path uses, calls `updateWorkoutSet`, updates
  the store and the on-screen receipt, and gives a haptic + TalkBack
  acknowledgement (`:1388-1393`).
- `handleDeleteEditedSet` (`:1409-1455`) confirms via a native alert, calls
  `deleteWorkoutSet`, mirrors the cloud delete exactly like
  `WorkoutHistoryScreen` (queued retry on failure, `:1430-1437`), and
  recomputes the local receipt.
This is now **at par with Hevy's un-check-and-re-edit grid**, delivered as a
cleaner dedicated sheet rather than an inline row-edit. One real gap versus
Hevy remains: **PR detection does not re-run on edit or delete**
(documented in-code at `:1346-1347`, "PR detection is a log-time concern and
is NOT re-run on an edit/delete"). Two concrete consequences: (a) editing a
set upward into what would now be a PR shows no celebration and no live PR
badge; (b) deleting a set that *was* flagged as a session PR leaves the
already-shown celebration/badge stale for the rest of the session (derived
analytics elsewhere — ExerciseDetail, PR list — recompute correctly from the
DB on next view, so this is a same-session cosmetic staleness, not a data
integrity issue). Severity **B**.

**Undo:** no generic undo/snackbar-revert on delete — deletion is
confirm-then-permanent via the native alert (`handleDeleteEditedSet`,
`:1409-1455`). This is a reasonable, common pattern (Hevy uses a similar
destructive-confirm, not a toast-undo) — not flagged as below par.

**Swap exercise mid-session:** ranked-suggestion swap sheet
(`handleOpenSwap`, `:540`) with a "why" reason string per candidate
(matches the prior audit's description; still true) and a full-library
escape hatch via `ExercisePickerModal` in swap mode. At par-to-above Hevy
(flat browse-only replace).

**Abandon/resume a session:** Cancel (`✕`) opens a discard confirmation
modal (`showDiscardModal`, `:287,3135-3163`) rather than the "straight back,
no modal" the prior U1 doc described — current code DOES gate discard with a
confirm, which is a *change* from the prior doc's claim; verify this is
intentional (the modal correctly protects against an accidental full-session
loss, which is arguably the more defensible choice for a destructive,
un-recoverable action, unlike the merely-repetitive Finish gate below).

**App-kill / crash recovery: strong, unchanged from prior praise.**
`useAppStore.js:1328-1388` (`restoreActiveWorkout`) restores from an
AsyncStorage snapshot, validates the workout row still exists and is
incomplete in the DB, re-checks for a race against a freshly-started session,
rehydrates `sessionAdjustments` without recomputing (avoiding duplicate
adaptation events), and resumes an in-flight rest timer from wall-clock time
if it hasn't already elapsed. Also sweeps any stale iOS Live Activity left
counting down by a killed process (`:1334-1337`). This is best-in-class and
should be protected, not touched.

---

## 3. Rest timer

**Auto-start, adjust, skip: at par, in-screen.** `RestTimer.js` auto-starts
after a working set, ±15s with long-press repeat (`TIME_ADJUSTMENTS`,
`:50-53`, `startRepeat`/`stopRepeat` `:311-324`), Skip
(`stopRestTimer`, `:416-424`), escalating 3-2-1 beeps+haptics
(`:258-286`), and a draining visual fill (`:326-349`).

**Lock-screen / background behaviour: the prior audit's top defect (F3) is
now closed, with a genuinely sophisticated two-tier implementation.**
- A persistent notification with **four action buttons** — Log set, +15s,
  −15s, Skip rest (`categories.js:61-80`, `REST_TIMER_ACTIONS`) — is posted
  once per rest and re-anchored on adjustment (`RestTimer.js:157-184`,
  `presentRestTimerNotification`). Actions are wired end-to-end:
  `listeners.js:70-82` intercepts the action identifier and routes to
  `handleRestTimerAction` before it reaches normal tap-navigation, gated so
  a stale tap on a lingering notification is a no-op.
- On Android, when a rest fits inside a ~3-minute window, a **native
  chronometer foreground service** (`modules/rest-timer-live`,
  `startRestForeground`) replaces the sticky notification with a live,
  natively-ticking lock-screen countdown that keeps the process alive for
  the window (`RestTimer.js:107-155`); the static sticky is silent while the
  chronometer owns the shade and reclaims it once the OS window closes
  (`:171-176`).
- This directly answers R3/U3 from the prior audits, which described the
  notification as "deliberately disabled... over an old 'Set N of M' label
  bug". That bug's root cause (set-numbering) is sidestepped entirely — the
  rest notification shows only a countdown + exercise name, never a set
  count (`RestTimer.js:14-17` comment).
- **iOS gap (new finding, not in prior docs):** `rest-timer-live` is
  `requireNativeModule` on the Expo module and the whole chronometer/
  foreground-service path is Android-only per `index.ts:47-49`
  (`isAvailable()` returns `Platform.OS === 'android'`). On iOS the rest
  timer while backgrounded falls back to the plain `expo-notifications`
  sticky (still with the 4 actions, since that part is cross-platform via
  `Notifications.scheduleNotificationAsync`), but with a **static** "Ends
  HH:MM" body rather than a live countdown, and no Live Activity (that is
  the explicitly gated/deferred item 14 in CLAUDE.md's STATUS line, so this
  is a known and already-tracked gap, not a new ask). Severity **C** (already
  gated, correctly deferred).
- **Missing one action vs Hevy:** Hevy's corpus additionally offers "Add an
  exercise" from the notification (`rest_timer_add_exercise_button_text`);
  Volyume's four actions cover Log set/±15/Skip but not Add exercise.
  Severity **C**.

**Exact-alarm accuracy (above-par nicety not in the prior docs):**
`RestTimer.js:219-250` asks once, in-context, for Android 12+ exact-alarm
permission so the end-of-rest alert lands to the second rather than being
batched by the OS — a real-world accuracy detail Hevy's corpus doesn't
surface evidence of.

**In-screen visibility:** the compact layout recomputes on
`useWindowDimensions` changes rather than once at load (`RestTimer.js:351-352`),
closing a rotation/split-screen limitation the prior audit flagged.

---

## 4. Exercise picker

**Search: plain substring match**, case-insensitive, against the full
library (`ExercisePickerModal.js:61-68`). No fuzzy matching, no muscle/
equipment ranking of results — an exact-Hevy-parity gap for typo-tolerance,
but functional. Severity **C**.

**Filters: muscle + equipment chips now exist, and the previously-dead
`matchesEquipmentFilter` is wired.** `ExercisePickerModal.js:14,27-28,61-68`
imports and calls `matchesMuscleFilter`/`matchesEquipmentFilter` from
`lib/exerciseDisplay.js` against two horizontal chip rows
(`PICKER_MUSCLES`, `PICKER_EQUIPMENT`, `:219-250`). This closes Tier 1 item 2
from the parity backlog ("448 rows by text search only... wire the dead
`matchesEquipmentFilter`"). Filters are correctly suppressed in swap mode
(`showBrowseFilters = !isSwapAction`, `:37`) so a mid-session replace stays a
focused search-and-pick, not two rows of unrelated chips — a considered UX
call, not an omission.

**Recents: absent.** No most-recently-used or most-frequently-used exercise
surfacing in the picker (grep for "recent" in the file: no matches). Hevy
surfaces recents; this is a real, still-open gap. Severity **B**.

**Custom exercise creation: shipped with the data-integrity fix already
applied.** `ExercisePickerModal.js:70-102` creates via `insertExercise` with
muscle + equipment chip pickers (`:155-176`). The prior backlog's item 11
("store SFR null, not a fake 3") is done — `:81-85` explicitly sets
`stimulusToFatigueRatio: null` with an in-code rationale (a hard-coded
midpoint would make a brand-new exercise falsely rank as a scored candidate
in swap/plan engines). **Still open from that same backlog item:** no
secondary-muscle multi-select and no exercise-type axis (duration/reps-only/
distance) on the create form — every custom exercise defaults to
`weight_reps` (`database.js:2018`, `data.exerciseType ?? 'weight_reps'`), so
a user who wants to log a custom plank or carry as a custom exercise cannot
get the duration/distance input schema for it. Severity **B** (the schema
now exists and is used for seeded exercises; custom-exercise authoring just
doesn't expose it yet).

---

## 5. Session lifecycle

**Start from a plan:** not directly re-audited here (HomeScreen/readiness
modal is out of this file's scope per the brief's file list), but
`BuildWorkoutScreen.js` — the ad-hoc/blank builder — has a first-class
"Start without a plan" CTA in the footer whenever no exercises are queued
(`:338-347`), plus Travel/hotel-gym one-tap session generation
(`:157-184,212-217,360-400`) and a picker with search + graceful truncation
messaging when the library exceeds the render cap (`:186-196,452-457`).

**Mid-session add/reorder exercises:** Add exercise is 2 taps (overflow →
pick, `ActiveWorkoutScreen.js:2849-2862`). **Reorder remains impossible
in-session** — only the horizontal nav-strip lets the user jump between
already-added exercises (`:3263-3273` in the empty-state variant; same
pattern in the populated view); there is no drag or up/down control on the
live session. This matches the prior audits' F6/U6 finding, and it remains
open — it was not part of this cycle's ship list (drag-to-reorder is
explicitly GATED in the backlog, needing a founder-approved
`react-native-draggable-flatlist` dependency decision). Severity **B**
(same status as before, correctly gated rather than silently skipped).

**Auto-advance now has a visible, cancellable countdown (prior gap closed).**
The training-core audit (07-03, finding #9) flagged the 1.8s auto-advance to
the next exercise as "silent... visible countdown/cancel" needed. Current
code shows an inline row — "Next exercise in a moment" / "Stay here"
(`ActiveWorkoutScreen.js:2439-2450`) — gated by `autoAdvanceArmed`, with
`cancelAutoAdvance()` as the single place that clears the timer
(`:466-474`), and a `useEffect` backstop that cancels it on any other route
out of the exercise (nav-strip tap, swipe, unmount, `:353-361`). Closed.

**Finish flow:** still gated by an unconditional native confirm alert on
every finish — "Finish workout? You've logged N sets across M exercises"
(`:1656-1671`), double-tap-guarded via `finishingRef`
(`:1658-1659,1807`). This is the one item from the prior U1/training-core
docs that is **unchanged and still below par** versus Hevy's single-tap
finish → save. It is a deliberate guard against a mis-tap on the
single most-repeated end action, and it charges every user, every session.
Severity **B** (matches prior finding U2, still open).

**PR handling:** `PRCelebration.js` is fully reduce-motion and calm-aware —
`subduedMode = subdued || !!reduceMotion || isFirstLift` (`:120`), a named
haptics vocabulary (`haptics.prAchieved()`, `:161`), spoken
TalkBack announcements on both the full and subdued paths (`:137-150`), and
a first-lift is never dressed as a "PERSONAL RECORD" (`:116-119,209`,
"an honest first... beats nothing"). This closes backlog item 7
("PRCelebration honours reduce-motion + named haptics") — already shipped,
not merely planned. As noted in §2, live in-session PR state does not
re-evaluate after an edit/delete of a logged set.

**"Update routine after a logged session" loop: still absent, and this
looks like an architectural choice, not an oversight.** No code path in
`WorkoutSummaryScreen.js` writes back to the routine's planned
sets/reps/weight. What DOES exist: an in-session adaptive-engine write
(`createAdaptationEvent`, `:617-641`) that logs a per-muscle signal to the
Coach tab's Engine Log, and a free-text "next time" note
(`saveNextTimeNote`, `:644-650`) that resurfaces at the next session start.
The code comment at `:611-616` is explicit: "The per-session engine no
longer writes NEXT-WEEK planned volume. Founder decision 2026-05-28: the
weekly coach owns next-week volume... Letting both write next week's plan
double-counted volume." So the Hevy-style "you hit 5x5 at 100kg, bump next
time?" inline prompt is deliberately NOT built here because the deterministic
weekly coach (`weeklyCoach.js`) owns that decision on a confirm-then-apply
card instead. This remains Tier 3 item 18 in the parity backlog — flag as
open, but note the architectural reason so nobody proposes bypassing the
weekly-coach ownership boundary to "fix" it. Severity **C** (by design,
revisit only via the weekly-coach surface, not this screen).

---

## 6. History — findability, drill-down, in-logger "last time"

**Findability of a past workout: no text search.** `WorkoutHistoryScreen.js`
offers a filter-chip row (`filter` state, `:89`, values inferred from
`FILTERS`) plus a calendar view (`buildCalendarCells`, `:334-345`) and
`isSameDay` date narrowing (`:284`) — but grep for `SearchBar`/`search`
inside the file returns no import; there is no way to type an exercise or
workout name and jump to it. For a user with a long history this is a real
gap versus Hevy/Strong, both of which support search-by-exercise across
history. Severity **B**.

**Tappable drill-down: shipped, with a change since the 07-03 audit.** The
training-core doc (finding #8, dated 2026-07-03) said "WorkoutHistory
exercise rows not tappable → no jump to ExerciseDetail (367-376)". Current
code contradicts that: each exercise row inside an expanded workout card
IS a `TouchableOpacity` that navigates to `ExerciseDetail`
(`WorkoutHistoryScreen.js:414-430`,
`navigateCrossTab(navigation, 'ProgressTab', 'ExerciseDetail', { exerciseId: ex.exerciseId })`,
with a proper accessibility label "See progress for {name}"). This has
evidently been fixed in the six days since that audit — treat the 07-03
finding as **stale**, not current. A "View summary" affordance also exists
per workout for the full read-only `WorkoutSummaryScreen` drill-down
(`:447-`).

**Per-exercise history from within the active logger ("last time: X kg × Y"):
already strong, at par-plus with Hevy.** Covered fully in §1 — the beat line
(`ActiveWorkoutScreen.js:2248-2273`) is exactly this feature, tappable to
apply, not just a passive label. The `lastTime`/`latestE1rm` headline gap the
training-core audit flagged (finding #4) was scoped to the *ExerciseDetail
chart screen*, not the in-session logger — the logger itself has carried
this since before that audit; it is out of this file's scope to verify
whether ExerciseDetail's headline has since shipped (that lives in
`ExerciseDetailScreen.js`, not in this audit's file list).

---

## Severity-tagged findings summary

| # | Finding | Area | Severity |
|---|---|---|---|
| F1 | RIR/RPE per-set entry hidden from the user (gated — needs founder decision, do not build unilaterally) | §1 | B |
| F2 | PR detection/celebration does not re-run after an in-session set edit/delete | §1/§2/§5 | B |
| F3 | No per-exercise persistent note across sessions (only session-scoped "next time" note) | §1 | C |
| F4 | No "Add exercise" action on the rest-timer lock-screen notification (Hevy has it) | §3 | C |
| F5 | iOS rest timer has no live chronometer/Live Activity while backgrounded (Android-only native module); already CLAUDE.md item 14, gated | §3 | C |
| F6 | No fuzzy/typo-tolerant search in the exercise picker | §4 | C |
| F7 | No "recents" row in the exercise picker | §4 | B |
| F8 | Custom-exercise creation has no secondary-muscle multi-select or exercise-type axis (always defaults to weight_reps) | §4 | B |
| F9 | No in-session drag-reorder of exercises (nav-strip jump only); GATED pending a dependency decision | §5 | B |
| F10 | Unconditional "Finish workout?" confirm alert on every finish | §5 | B |
| F11 | No text search across workout history | §6 | B |

## What is now AT PAR OR ABOVE Hevy/Strong (do not regress)

- Editable/deletable logged sets in-session, reusing `SetEntry` for every
  exercise type (`ActiveWorkoutScreen.js:1352-1455,3172-3234`).
- Keyboard-Done-completes-the-set (`SetEntry.js:356-360`) — zero-tap logging
  for a typed set, which Hevy's row-grid does not offer.
- Per-exercise weight-increment steppers with long-press repeat
  (`SetEntry.js:22-39,62-66`).
- Tappable one-tap "beat line" repeat-last-set / recovery-week / first-time
  target cue (`ActiveWorkoutScreen.js:2219-2284`).
- Multi-schema set entry (weight/reps, weighted bodyweight, reps-only,
  duration, distance) — `SetEntry.js:13-392`.
- Warm-up calculator (`ActiveWorkoutScreen.js:2754-2825`, `lib/warmupRamp.js`).
- Superset giant-set bug fixed at the authoring source
  (`ManualBuilderScreen.js:490-518`), capped at pairs everywhere.
- Rest-timer lock-screen notification with 4 actions
  (`categories.js:61-80`, `listeners.js:70-82`), plus an Android native
  chronometer foreground service for short rests
  (`modules/rest-timer-live`, `RestTimer.js:107-184`).
- Minimise-equivalent: `ActiveSessionMiniBar` docked above the tab bar on
  every screen while a session is live (`VolyumeTabBar.js:99`,
  `ActiveSessionMiniBar.js`), closing the prior "no minimise, full-screen
  takeover only" gap.
- Robust crash/app-kill session recovery with wall-clock rest-timer resume
  and stale-Live-Activity sweep (`useAppStore.js:1328-1388`).
- Exercise picker muscle + equipment filter chips wired to previously-dead
  matcher functions, custom-exercise SFR integrity fix
  (`ExercisePickerModal.js`).
- PR celebration fully reduce-motion/calm-aware with spoken announcements
  and an honest (non-inflated) first-lift treatment (`PRCelebration.js`).
- Auto-advance now shows a visible, cancellable "Next exercise in a moment /
  Stay here" row (`ActiveWorkoutScreen.js:2439-2450`).

---

## Prioritised top-10 improvement list

1. **Add a "recents" row to the exercise picker** (most-recently-used, above
   or beside the filter chips). `ExercisePickerModal.js`. **S.**
2. **Downgrade or condition the "Finish workout?" confirm alert** — e.g. skip
   it for sessions with any logged sets and reserve it for the genuinely
   accidental 0-set tap, or make it a long-press instead of a two-step
   dialog. `ActiveWorkoutScreen.js:1656-1671`. **S.**
3. **Add text search to WorkoutHistoryScreen** (exercise name or workout
   name), alongside the existing date filter/calendar. `WorkoutHistoryScreen.js`.
   **M.**
4. **Re-run PR detection on set edit/delete** so an edited-up set can still
   trigger the celebration and a deleted PR set clears its live-session
   badge; derived analytics already recompute correctly, this closes the
   same-session gap. `ActiveWorkoutScreen.js:1362-1455`, PR detection in
   `algorithms.js`. **M.**
5. **Extend custom-exercise creation with an exercise-type selector**
   (weight_reps/reps_only/duration/distance) and secondary-muscle
   multi-select, matching the schema that seeded exercises already use.
   `ExercisePickerModal.js:70-176`, `database.js:2018`. **M.**
6. **Add "Add exercise" as a fifth rest-timer notification action**, mirroring
   Hevy's `rest_timer_add_exercise_button_text`, reusing the existing
   category-action wiring. `categories.js:61-80`, `listeners.js`. **S.**
7. **Fuzzy/typo-tolerant search in the exercise picker** (currently exact
   substring only). `ExercisePickerModal.js:61-68`. **S–M.**
8. **In-session drag-reorder of exercises** — GATED, needs founder sign-off
   on a dependency (`react-native-draggable-flatlist` or a hand-rolled
   reanimated implementation; gesture-handler/reanimated are already
   installed). Present as a founder decision before building. **M–L.**
9. **Per-exercise persistent notes** (not just the session-scoped "next
   time" note) — additive migration, Hevy parity item from the training-core
   audit (finding #12). **M.**
10. **RPE/RIR as an optional, explained per-set control** — explicitly
    GATED per `_PARITY-SCORECARD-AND-BACKLOG.md` (deterministic-coaching
    boundary); present as a founder decision with the engine-boundary
    tradeoffs spelled out before any build work starts. **M** (if approved).
