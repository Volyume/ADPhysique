# a-04 — Active Workout & Logging (code-verified)

> ULTIMATE-APP MANDATE, Phase 1 area 04. Branch `claude/admiring-bohr-2kb7pd`.
> Method: read the live code — `ActiveWorkoutScreen.js` (2,624 ln), `SetEntry.js`,
> `RestTimer.js`, `restTimerMath.js`, `PlateCalculator.js`, `BuildWorkoutScreen.js`,
> `WorkoutSummaryScreen.js` (1,623 ln), the Home pre-workout prompt, the store
> (`useAppStore.js`) persistence/restore, `lib/watch/bridge.js`,
> `lib/notifications/activeWorkout.js`, `lib/travelMode.js`, `lib/swapEngine.js`,
> `lib/unilateral.js`, `lib/clusterSet.js`, `RootNavigator.js`. Every claim carries
> file:line. No competitor speculation (that is Phase 2).
>
> **Verification of int-03 §1.2 (prior art).** Confirmed against current code:
> the COMP-001 chrome (3-line card header, single beat line, 2-button action row +
> ⋯ overflow, single-row 64pt rest timer, logged-sets-above-the-fold) is all
> present and matches. Two prior claims are now STALE/CORRECTED:
> - "PlateCalculator is dead/orphaned" — **still true** (imported by no screen;
>   `SetEntry.js` even keeps `plateBtn`/`plateBtnText` styles, 173–186, but renders
>   no button). Unchanged.
> - int-03 said "Unilateral/per-side logging is a device-local pref." That pref's
>   **setter is now wired to nothing** (see G2): it is read-only dead code.
> Branch has moved as described: the D1 milestone ladder is live on WorkoutSummary
> (`WorkoutSummaryScreen.js:19,124,708`) and the pre-workout intent+readiness
> prompt (COMP-008) is live on Home (`HomeScreen.js:1664–1740`).

---

## 1. WHAT — the in-gym flow, every control, every state

### 1.1 Tap-start to summary (flow map)
1. **Pre-workout prompt (planned sessions only).** Home → "Start workout" →
   `handleStartNextWorkout` (`HomeScreen.js:781`) preloads the routine's exercises,
   blanks readiness, opens the **intent + readiness sheet** (`:1664`): one of
   Sharp / Average / Below par (`:1675`) plus three optional chip rows — Soreness
   (1–3), Sleep (2/3/4), Energy (2/3/4) (`READINESS_ROWS`, `:65–81`). Any intent
   tap **or** Skip starts immediately; values go into `createWorkout` and onto the
   workout row (`confirmStart`, `:808–817`).
2. **Session opens.** `startWorkout` sets `activeWorkout`, `workoutStartTime`,
   `workoutExercises`, persists a crash snapshot (`useAppStore.js:1198–1211`).
   For Pro, `computeAndLogSessionAdjustments` runs in the background and the
   COMP-015 line appears a moment later (`HomeScreen.js:829–833`).
3. **ActiveWorkoutScreen renders.** Fixed header: ✕ Cancel · elapsed timer (+ amber
   `timer` glyph when time-crunch active) · "Finish" (`:1356–1389`). Optional
   starter-session banner (`:1393`). Horizontal exercise-nav pills when >1 exercise
   (`:1409–1441`).
4. **Per-exercise scroll.** Name (24pt/900) + **Swap** chip + **⋯** overflow
   (`:1451–1484`); conditional banners (superset chip, next-time notes, deload
   "Recovery week"); target line (`:1537`); **RestTimer** (renders only when active,
   `:1551`); target-complete banner; **SetEntry card** with the 3-line header;
   primary **Log set** CTA; **"This workout"** logged-set receipt; **Add exercise · Note**
   action row.
5. **Log a set.** `handleCompleteSet` (`:736`) validates reps + weight, writes via
   `createWorkoutSet`, flashes the card amber 700ms (`:828`), runs PR detection
   (`:834–849`), pre-fills the next set, starts the rest timer
   (`startRestTimer(restSeconds||90)`, `:888`), and auto-advances to the next
   exercise 1.8s after the working target is hit (`:891–898`).
6. **Finish.** "Finish" → confirm alert (`:1136`) → `doFinish` (`:1149`): re-reads
   sets from the DB (WK-2, so swapped-out exercises still count, `:1158`),
   `summariseWorkoutSets`, `updateWorkout`, fires `workout_completed` telemetry,
   widget snapshot + partner week-signal writes, immediate cloud `syncWorkout`
   (`:1209–1216`), captures session adjustments, `endWorkout()`, then
   `navigation.replace('WorkoutSummary', {...})` (`:1226`).
7. **WorkoutSummary.** Session Complete header + date, optional first-session line,
   **D1 milestone card** (`:708`), stats grid, 4-week comparison, per-muscle volume,
   optional difficulty/engagement/joint/fatigue feedback, "Notes for next time".

### 1.2 Set types and their flows (`SET_TYPE_OPTIONS`, `:39–46`)
All six exposed to every user in one bottom sheet (`:2050–2093`), each with a
description; no experience gating.
- **Working** (`straight`), **Warm-up** (`warmup`) — warm-up not auto-forced; user
  flips type via the sheet; not counted in totals; one-time hint shown (`:1575`).
- **Drop set** (`dropset`) — counts to volume, not the set-target counter.
- **Myo-reps** / **Rest-pause** — **cluster engine** (`lib/clusterSet.js`):
  `startCluster` (`:951`) logs an activation set + short 20s rest, `addMiniSet`
  (`:974`) appends mini-sets, `finishCluster` (`:986`) sums to one row with a
  breakdown note. Genuinely rare in the category. Bypassed for unilateral exercises
  (`:1834`) — but see G2, unilateral is unreachable.
- **AMRAP** — last-set max; stored with `isAmrap:true` (`:795`).

### 1.3 Rest timer (`RestTimer.js`)
Single 64pt row (`:237–244`): icon, numeral (countdown switches to a large warning
numeral ≤3s, `:189`), "rest"/"seconds" label, **−15/+15** (long-press repeats at
200ms, `:148–151`), **Skip**. Wall-clock derived: `tickRestTimer` recomputes from
real elapsed time, and a foreground `AppState` listener re-syncs so backgrounding
never freezes it (`:69–74`). Audio + haptic **3-2-1-GO** escalation (`:90–117`).
`clampRestDelta` (`restTimerMath.js:8`) stops a −15 ever flipping sign or dropping
below 5s. Compact variant on <700px screens (`:17`). **Lock-screen/Live-Activity
notification for the rest timer is deliberately disabled** (`:53–57`) — it showed a
wrong "Set N of M" and added friction.

### 1.4 Previous performance, live e1RM, PR detection, autoregulation
- **One beat line** (card header line 2, `:1605–1672`): "Last: 60kg × 8 · Target
  8–12 ↑" — tap applies last session's numbers (Hevy mechanic, `:1640`). Falls back
  to "First time · Target …" or deload variant. Pre-fill uses `getBestAnchorSet`
  (`:51`) + beat-rep logic + `computeSetTargets` (`:614`); ghost pre-fill from last
  session when computed weight is 0 (`:660–675`).
- **Live e1RM** beside the Reps label in `SetEntry` (`SetEntry.js:95`) and on each
  logged row (`:88`).
- **PR detection in-session**: `detectPR` runs before adding the current set to the
  session ref so it can't match itself (`:831–849`); fires `showPRCelebration`,
  dedupes one PR per exercise via `bestPRPerExercise`.
- **COMP-015 autoregulation surface (Pro)**: `sessionAdjustment` (`:219`) drives
  the adjusted set target everywhere (orientation row, target line, notification,
  `adjustedSetCount`, `:222`), a coaching line on the first working set (priority
  adjustment > stalled > targetReason, `:1680–1703`), and an **"Adjusted today"**
  section in the info sheet with a **"Use planned sets instead"** revert
  (`:2226–2250`). Coverage telemetry fires once per exercise (`:229–243`).
- **Stalled-progress nudge**: same weight/reps across last 3 sessions → concrete
  next-step copy on the first working set (`stalledAdvice`, `:1305–1329`).

### 1.5 States: planned vs ad-hoc; deload; offline; app-kill
- **Planned**: routine exercises preloaded with `routineExercise` targets +
  superset group IDs (`HomeScreen.js:787–792`).
- **Ad-hoc / blank**: `startBlankSession` (`HomeScreen.js:850`) or BuildWorkout's
  "Skip Setup" (`BuildWorkoutScreen.js:108`) → empty session → `EmptyExerciseView`
  (`:2349`) "Add your first exercise". **No intent/readiness prompt on these paths.**
- **BuildWorkout (ad-hoc builder)**: add exercises with Sets/Reps/Rest/Start
  steppers (`BuildWorkoutScreen.js:179–296`), **Travel/Hotel Gym** quick-fill chip
  (`:173`) → `generateTravelPlan` (bodyweight/dumbbells/hotel, full-body day,
  `:119–146`), then Start Training.
- **Deload week**: `getCurrentMesocycleWeek` → "Recovery week" banner (`:1517`),
  deload prescription pre-fills (`:691–716`), beat line shows "Recovery week" and
  PR/coaching lines suppressed.
- **Offline**: local DB is source of truth; `createWorkoutSet`/`updateWorkout` are
  local; cloud `syncWorkout` is fire-and-forget with its own retry queue
  (`:1209–1216`). Fully functional offline.
- **App-kill / crash resume**: every store mutation persists a snapshot
  (`_persistActiveWorkout`, `useAppStore.js:77–103`) incl. exercises, index,
  start time, session adjustments, applied watch event IDs. Home's
  `restoreActiveWorkout` (`useAppStore.js`, called `HomeScreen.js:96–106`)
  rehydrates an incomplete session; guards against wrong-user, completed, deleted,
  live-session and mid-async-race clobber (test suite covers all,
  `activeWorkoutPersistence.test.js:41–157`).
- **Stale recovery**: >4h since last activity → Resume / Finish / Discard sheet
  (`:391–396, 2008–2045`).
- **Watch (COMP-020)**: `lib/watch/bridge.js` mirrors a phone-composed session
  script + cursor to a paired watch (no-op when none) and routes watch set-log
  events into the idempotent `applyRemoteSetEvent`. Phone composes all strings so
  "Set 3 of 2" is impossible (`composeSetLine`, `bridge.js:32–39`). **Watch UI is
  native (`modules/watch-bridge`), not in JS.**
- **Widget (COMP-019)**: finish writes a home-screen widget snapshot
  (`lib/widgets/writer`, `:1196`).

---

## 2. WHERE — entry points, reachability, one-handed reality

### 2.1 Ways IN (entry points)
- Home "Start workout" hero → intent/readiness prompt → ActiveWorkout
  (`HomeScreen.js:781`, navigates `:821`).
- Home blank/quick-start → `startBlankSession` (`:850`, navigates `:855`).
- Home "Continue session" resume card (`navigation.navigate('ActiveWorkout')`,
  `HomeScreen.js:1148`) after crash-restore.
- BuildWorkout → Start Training / Skip Setup (`BuildWorkoutScreen.js:99,112`).
- Routes registered in `RootNavigator.js`: BuildWorkout `:294`, ActiveWorkout
  `:295` (plus `:478,505` in other stacks), WorkoutSummary `:296,344`.

### 2.2 Ways OUT
- **Finish** (header + CTA state-swap on target-complete) → confirm → WorkoutSummary
  via `replace` (`:1226`).
- **✕ Cancel / hardware back** → `handleCancelWorkout` (`:362`): 0 sets ends
  silently; otherwise Discard sheet (`:2312`). Back is intercepted (`:376–383`).
- **Stale sheet** → Resume / Finish / Discard (`:2008`).

### 2.3 Mid-set reach vs buried in overflow
- **On the permanent surface (one tap, mid-set)**: Log set, Weight/Reps steppers,
  set-type (via header orientation row, `:1589`), beat-line apply, rest ±15/Skip,
  Swap chip, exercise-nav pills, Add exercise, Note.
- **Behind ⋯ overflow sheet** (`:2098–2191`): Swap, Exercise info, Pair/Unpair
  superset, **Time crunch today**, Revert time crunch, **Remove exercise**.
- **Buried two deep**: "How to do it" form text → ⋯ → Exercise info (`:2252`), or
  the coaching-line tap (`:1684`). Plate help: **nowhere** (G1).

### 2.4 One-handed-in-the-gym lens (founder)
- **Good**: 52pt weight/reps steppers (`SetEntry.js:207–213`), 64pt rest row, big
  amber Log set (`:2463`), large hit-slop on small controls, wall-clock timers that
  survive screen-lock, type-to-edit fields. All thumb-reachable.
- **Friction**: the set-type sheet is the *only* way to mark a warm-up (no quick
  "Add warm-up" button — that affordance was removed, `:677–683`), so a beginner's
  warm-up is a 2-tap sheet trip. Time-crunch and Remove are 2 taps deep (fine —
  rare). Note input pushes the keyboard up over the card.

---

## 3. FEEL — taps-to-log, density, tone, interruption tolerance

- **Taps to log (common case)**: **1 tap.** Prefilled weight+reps from targets/beat
  line; Log set commits. Class-leading, intact (`:1829–1850`).
- **Density**: COMP-001 card is calm — 3 header lines, 2 stepper rows, one CTA. Only
  one context line at a time (deload XOR adjustment XOR stalled XOR target reason).
- **Copy tone mid-effort**: short and plain. "Last: 60kg × 8 · Target 8–12 ↑";
  "Target reached: 3 working sets done"; warm-up hint "Light weight, easy reps. Tap
  Done when you're ready to work." British English throughout. The set-type sheet
  explainer is one warm sentence (`:2065`).
- **Besa (first session)**: meets the intent prompt ("How are you feeling today?"),
  lands on a clean working-set card, sees a pulsing ⋯ info tip until tapped
  (`:436–451, 1704`), and a first-set hint pointing at "how to do this exercise
  correctly" (`:1707`). BUT she also meets the full 6-type set sheet incl.
  "Myo-reps"/"Rest-pause" jargon (G3), and the info payoff is text-only with ~38%
  coverage (G1, carried from int-03).
- **Eddie (heavy day)**: cluster logging for myo/rest-pause, AMRAP, live e1RM,
  deload prescriptions, stalled nudges, COMP-015 adjustments. Misses: **no per-set
  RIR/RPE capture** (removed; defaulted internally, `SetEntry.js:135–138`,
  `DEFAULT_SET.rir=2` at `:35`), and **no equipment filter on the in-session swap**.
- **Interruption tolerance**: strong. Workout timer derives from `workoutStartTime`
  and re-syncs on foreground (`:455–480`); rest timer recomputes from wall clock on
  foreground (`RestTimer.js:69–74`); a phone call / screen-lock / app-kill all
  resume cleanly (snapshot + restore). Double-tap Finish guarded (`finishingRef`,
  `:197,1130`); double-log guarded by `saving` (`:768,1837`).

---

## 4. GAPS / FRICTION (code-verified, ranked)

**G1 — PlateCalculator is still wired to nothing.** `PlateCalculator.js` (263 ln,
complete) is imported by no screen (grep: only docs). `SetEntry.js` even retains
orphan `plateBtn` styles (`:173–186`) with no button. A beginner has no in-app help
loading a barbell. Unchanged since int-03; the build cost is already paid — pure
wiring.

**G2 — Unilateral / per-side logging is dead code (NEW vs int-03).** The screen
*reads* the pref (`loadUnilateralExercises`, `:387`) and `LoggedSetRow` renders
`formatPerSide` (`:73`), but the **setter `setUnilateralExercise` is never called
from any screen** (grep: only `lib/unilateral.js` + tests), and `handleCompleteSet`
always writes `leftReps:null, rightReps:null` (`:796–797, 810–811`). So no UI turns
it on and no set ever stores per-side reps. int-03 listed it as a live "device-local
pref" — that is now incorrect; it is unreachable.

**G3 — Set-type sheet exposes all 6 expert techniques to every user.** `isBeginner`
is computed (`:135`) but used **only** to filter assisted-machine swaps (`:320`); it
does not gate the set-type sheet (`:2068–2091`). Besa meets "Myo-reps"/"Rest-pause"
mid-session. Pure progressive-disclosure gap. (int-03 F3, still open.)

**G4 — No intent/readiness on ad-hoc paths.** The COMP-008 prompt only fires from
`handleStartNextWorkout` (planned sessions, `HomeScreen.js:797`). Blank sessions
(`startBlankSession`) and BuildWorkout (`Skip Setup`/`Start Training`) skip it
entirely, so readiness columns (`migrate_072`) are blank for every ad-hoc session
— inconsistent capture that weakens the adaptive signal.

**G5 — Form guidance is buried + text-only, and "How to do it" is the only
in-workout learning.** Reachable only via ⋯ → Exercise info or the coaching-line tap
(`:2252`); payoff is `FORM_TIPS`/`routineExercise.notes`/fallback prose
(`:2254`) — no media. Plus general jargon with no tooltips (Working/warm-up/AMRAP/
Superset/"Est. max"). (int-03 F1/F6/F8, still open.) **Smaller observed nits:** the
mid-effort first-set hint literally says "Tap ⋯ above" (`:1709`) — a glyph
reference that depends on the ⋯ being on screen; the swap sheet has the library
escape hatch (`:2291`) but **no equipment filter** for "dumbbells only, now".

---

## 5. SURFACE INVENTORY

**Screens (3):** `ActiveWorkoutScreen.js` (2,624), `BuildWorkoutScreen.js` (621),
`WorkoutSummaryScreen.js` (1,623). (Pre-workout intent/readiness prompt is a Modal
inside `HomeScreen.js`, not a separate screen.)

**Components (4):** `SetEntry.js`, `RestTimer.js`, `PlateCalculator.js` (**orphan**),
`ExercisePickerModal.js`. Plus reused `PRCelebration.js`, `AppAlert`, `Toast`,
`Button`.

**In-screen sheets/modals (9):** exercise picker (add/swap shared), superset
heads-up, stale-recovery, set-type (6 options), exercise overflow, info/"How to do
it", swap (ranked + library escape hatch), discard, + EmptyExerciseView.

**Lib modules (~13):** `swapEngine.js`, `travelMode.js`, `restTimerMath.js`,
`clusterSet.js`, `unilateral.js` (read-only in practice — G2), `workoutHelpers.js`
(`countProgressSets`), `formTips.js`, `whyThisTemplates.js` (time-crunch/starter
copy), `mesocycle.js` (`applyTimeCrunch`), `algorithms.js` (e1RM/PR/targets/deload),
`sessionAdjustments.js` (COMP-015), `notifications/activeWorkout.js`,
`watch/bridge.js` (+ native `modules/watch-bridge`), `widgets/writer.js`,
`restSound.js`, `haptics.js`.

**Flags / params:** `route.params.starterSession` + `starterRoutineName` (COMP-013,
`:1064–1072`); `timeCrunchActive`/`starterActive` state; `tier==='pro'` gates the
COMP-015 surface (`:219`); `isBeginner` (only gates assisted-machine swaps, `:320`);
`@volyume_seen_workout_info` (info-tip pulse, `:437`); `reduceMotion` a11y.

**Telemetry (audit + track):** `audit()` — `workout.exercise.next`,
`workout.exercise.removed`, `workout.loggedsets.visible`, `workout.set.logged`,
`workout.finish.tap`, `workout.overflow.open`, `workout.beatline.apply` (×2).
`track()` (engineTelemetry) — `session_adjustment_shown`, `workout_completed`;
watch bridge — `watch_set_logged`, `watch_apply_duplicate_dropped`,
`watch_session_attached`. (Readiness/intent capture writes to the workout row but is
not separately instrumented.)

**Tests:** `activeWorkoutPersistence.test.js` (crash/resume, 12 cases),
`restTimerMath.test.js`, `swapEngine.test.js`, `sessionAdjustments.test.js`,
`notifications.activeWorkout.test.js`, `watch/__tests__/bridge.test.js`.
