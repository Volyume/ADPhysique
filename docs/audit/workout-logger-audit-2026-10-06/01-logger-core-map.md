# Workout logger audit 2026-10-06, lane A1: the live logging screen, mapped

Authority: founder order 2026-10-06 (`briefs/common.md`), lane brief `briefs/A1-logger-core.md`.
Read-only audit of the code at commit `1ea429c` on branch `claude/workout-logger-audit-redesign-iykogt`.
Nothing under `src/`, `modules/`, `plugins/`, `supabase/` or any test was changed. This is the only file written.

## Key, and how to read the bullets

- Every bullet ends with `file:line`. `AWS` = `src/screens/ActiveWorkoutScreen.js` (7,170 lines, all read).
  Other files are written with their path under `src/` (or `modules/`, `docs/`).
- Short names: `NC` = `components/workout/NowCard.js`, `LSR` = `components/workout/LoggedSetRow.js`,
  `WO` = `components/workout/WorkoutOutline.js`, `WBB` = `components/workout/WorkoutBottomBar.js`,
  `WHD` = `components/workout/WorkoutHeader.js`, `SS` = `components/workout/StatusStrip.js`,
  `EEV` = `components/workout/EmptyExerciseView.js`, `SE` = `components/SetEntry.js`,
  `RT` = `components/RestTimer.js`, `EPM` = `components/ExercisePickerModal.js`,
  `PRC` = `components/PRCelebration.js`, `MB` = `components/ActiveSessionMiniBar.js`,
  `STORE` = `store/useAppStore.js`, `DB` = `lib/database.js`, `RN` = `navigation/RootNavigator.js`.
- An unlabelled bullet is an observation (what the code does, quoted or paraphrased from the line cited).
  **Suggests:** marks an inference drawn from an observation. **Unverified:** marks something I could not run
  or measure (there is no device or simulator here). Where two parts of the code disagree I say so and,
  if I could not settle it, it is also in section 14.
- "Working set" below means a set whose type is not `warmup` (the rule in `lib/algorithms.js:268-271`).
  "Progress set" means a set that ticks the plan target: not `warmup` and not `dropset` (`lib/workoutHelpers.js:15-20`).

## At a glance (shape of the thing)

- One screen component does everything: `ActiveWorkoutScreen` spans AWS:316-6435 (6,120 lines), then a frozen
  `StyleSheet` of 200 keys (AWS:6442-7001) and a live-theme override map of 139 keys (AWS:7016-7170).
- Counts inside the file: 63 `useState`, 41 `useRef`, 34 `useEffect`, 8 `useCallback`, 4 `useMemo`, 35 inner
  functions, 18 `react-hooks/exhaustive-deps` disables, 43 lazy `require` calls; about 2,190 `//` comment lines
  (about 31 percent of the file). Counted with grep over AWS.
- The visible workspace is already split into 8 child components (header, outline, status strip, now card,
  logged-set row, bottom bar, empty view, set-row menu) plus `SetEntry`, `RestTimer`, `ExercisePickerModal`
  (AWS:15-41, `components/workout/`). The orchestration, every sheet and every modal body still live inline in AWS.
- The session lives in the Zustand store and is snapshotted to AsyncStorage after every mutation
  (`STORE:193-247`); each logged set is written to SQLite before the screen updates (AWS:2822-2885).
- Cross-cutting findings a redesign meets first: the exercise object's shape depends on how the session started (13.1), Shorten session and the starter claim effects that never reach the timer (13.3), three different rules count "sets done" (13.6), the whole screen re-renders every second (10.4), and the previous-session reference is the smallest text on the Now card (11.2).

---

## 1. How the screen is reached

### 1.1 Registration, and who navigates here

- Registered once, in `HomeStack`, as route `ActiveWorkout` with `headerShown: false` and a hero zoom transition
  (`RN:476`); `HomeStack` is mounted once, as the `HomeTab` tab (`RN:762`). The bottom tab bar returns `null` while
  `ActiveWorkout` is the focused nested route (`components/VolyumeTabBar.js:110`), so the logger owns full height.
- The AWS comment says the screen is "registered in three stacks (Home, FirstRun, ProOnboarding)" (AWS:209-212).
  A grep of `RN` finds one `<Stack.Screen ... ActiveWorkoutScreen>` only (`RN:476`). Not reconciled: section 14.
- Every start path creates the `workouts` row first (`createWorkout`, `DB:3927-4040`, `is_completed = 0`, stamps
  the active mesocycle and week) and then calls `startWorkout(workout, initialExercises)` (`STORE:1758-1776`) before
  navigating. The screen never creates a workout itself; it reads `activeWorkout` from the store (AWS:326-330).
- Navigation call sites into the screen (all outside AWS):
  - Home, "start next workout": after the readiness/intent sheet, `navigate('ActiveWorkout', { starterSession, starterRoutineName })`
    (`screens/HomeScreen.js:1778-1795`).
  - Home, "just want to log" blank start: `createWorkout(user.id, null)` then `navigate('ActiveWorkout')` with no
    params (`screens/HomeScreen.js:1820-1826`).
  - Home, "Workout in progress" continue card: `navigate('ActiveWorkout')` (`screens/HomeScreen.js:2761-2775`).
  - Home, repeat last session (via the same intent sheet), and History, "repeat as is": build entries then navigate
    (`screens/HomeScreen.js:1834-1950`, `screens/WorkoutHistoryScreen.js:314-395`).
  - Plans, Plan detail, Routine detail "start": `navigate('HomeTab', { screen: 'ActiveWorkout', initial: false })`
    (`screens/PlansScreen.js:866`, `:1148`, `screens/PlanDetailScreen.js:361`, `screens/RoutineDetailScreen.js:1148`).
  - Build workout: `navigation.replace('ActiveWorkout')` for "Start training" and for the skip-to-blank link
    (`screens/BuildWorkoutScreen.js:175-218`).
  - Mini bar tap, from any tab: `navigate('HomeTab', { screen: 'ActiveWorkout', initial: false })` (`MB:144`).
  - Deep links: none resume it. `RN` maps `active-workout` links to Today, not to the logger, because the screen
    would mount with `activeWorkout = null` (`RN:950-956`).

### 1.2 Route params (the whole list)

- The screen accepts `{ navigation, route }` (AWS:316) and reads exactly two params, both optional:
  `route.params.starterSession` (boolean) and `route.params.starterRoutineName` (string) (AWS:3715, AWS:3725, AWS:3731).
- `starterSession` is applied once per mount: a ref gates it, then `navigation.setParams({ starterSession: false })`
  consumes it so a reused screen instance cannot re-apply it to a later full session (AWS:3720-3731).
  Home always passes it explicitly (`!!pending.starter`) so a normal start cannot inherit a stale `true`
  (`screens/HomeScreen.js:1790-1795`).
- There is no workout id, routine id or exercise param. The session is identified only by `activeWorkout.id` in the
  store (AWS:326-330). The old `blank: true` param is not read by the screen (`screens/HomeScreen.js:1812-1819`).

### 1.3 Modes the screen runs in, and how each changes what renders

| Mode | How it begins | What is different on screen |
| --- | --- | --- |
| Planned session (programme day) | Home next workout, Plans, Plan detail, Routine detail; entries from `getRoutineExercisesWithDetails` with a `routineExercise` (sets, rep band, rest, starting weight, group, notes) (`screens/HomeScreen.js:1729-1739`) | Full prescription: "Set n of m" line, rep range, "Last session" row, upcoming rows, weekly-allocation set counts, supersets and circuits hydrated from the plan (`screens/HomeScreen.js:1730-1738`, AWS:4385, AWS:5212-5236) |
| Starter session (15 minutes) | `starterSession` param (Home "starter" start) | First 4 exercises kept, 2 sets each, the rest marked `_timeCrunchSkipped`; "Starter session" chip with a "Full session" revert pill (AWS:3675-3731, AWS:4642-4664) |
| Repeat last session, with routine | Home repeat card or History "repeat as is" with a `routineId` | Same as a planned session (routine rows reloaded in full) (`screens/HomeScreen.js:1846-1856`, `screens/WorkoutHistoryScreen.js:329-340`) |
| Repeat last session, no routine | Same entry points, session had no routine | Entries rebuilt from the old session's logged sets, `routineExercise = { id, recommendedSets: workingSetCount || 3 }`, no rep band, so no rep range and a first-time-style prefill line; unresolved exercises are dropped with a toast (`screens/HomeScreen.js:1858-1944`, `screens/WorkoutHistoryScreen.js:341-388`) |
| Built session (Build workout, optionally the quick full-body session) | `BuildWorkoutScreen.handleStartTraining` | `routineExercise = { id, recommendedSets, recommendedRepsMin/Max, restSeconds, startingWeight, notes: null }`; no group fields (`screens/BuildWorkoutScreen.js:175-218`) |
| Blank / freeform / empty session | Home blank start, or the Build workout skip link (`BuildWorkoutScreen.handleSkip`); an empty routine's "Start blank workout" alert action leads to Build workout first (`screens/RoutineDetailScreen.js:1105-1118`) | No exercises, so the screen renders `EmptyExerciseView` (AWS:4471-4491); first picker add creates `{ exercise, routineExercise: null, sets: [], _userAdded: true }` and the store mints a slot id (`STORE:1596-1615`, `STORE:155-187`); target falls back to 3 sets (AWS:176, AWS:4278) |
| Resumed after the app was closed | `restoreActiveWorkout(user.id)` on Home mount (`screens/HomeScreen.js:283`) | Home shows a "Workout in progress" card; the logger is not reopened automatically (`screens/HomeScreen.js:2761-2775`). On open, `loggedSets` is rebuilt from the restored entry (AWS:2518-2519); see section 8 |
| Returned to via the mini bar or a tab round trip | Leaving by tab bar or navigation; the logger stays mounted in the stack | Same instance, same state; keep-awake is focus-scoped (AWS:723-746); the bar is hidden while the logger is focused (`components/VolyumeTabBar.js:110`) |
| Stale live session (over 4 hours since last activity) | Mount check | "Resume workout?" modal (Resume / Finish workout / Discard) (AWS:2033-2038, AWS:5565-5604) |
| Capability-served session (an applied temporary change) | Effect on first load of a fresh session | Rows substituted or omitted by `applyEffectiveViewToSession`; a quiet "Temporarily in for X" line and a session-level "left out" note (AWS:811-878, AWS:4511-4517, AWS:1056-1058) |
| Circuit / superset / giant-set sessions | Group stored on the routine rows | Circuit chip with round counts, per-round rest, heads-up modal; supersets alternate and skip rest between members (AWS:4665-4710, AWS:3134-3151, AWS:3167-3170) |
| Opened by a notification action | Lock-screen "Add exercise" opens the picker; "Log set" logs when a rest is live and the entry is not a ghost | AWS:2398-2430 |

- Suggests: "empty session" and "blank session" are one mode (zero entries); there is no separate "in-progress but empty" state
  beyond `EmptyExerciseView` (AWS:4471).
- The screen also renders `EmptyExerciseView` if `workoutExercises[currentExerciseIndex]` is undefined while entries exist
  (an out-of-range index), which is why that view carries a horizontal exercise tab strip (EEV:59-70, AWS:4471).

---

## 2. Anatomy, top to bottom, as the user sees it

### 2.0 Frame

- Root is `SafeAreaView edges={['top']}` around a `KeyboardAvoidingView` (iOS `padding`, Android no behaviour)
  (AWS:4494-4495). The bottom safe area is handled by the bottom bar itself; Android reports of a 0 inset are floored
  at 48 so the bar never sits under the nav buttons (AWS:712-720).
- Child order inside it: header, optional reduced-session note, outline, the workspace `ScrollView`, the bottom
  chrome (rest hint, rest strip, action bar), then every modal and sheet (AWS:4499, 4511, 4526, 4533, 5277, 5314-6421).
- When there is no current exercise the whole tree is replaced by `EmptyExerciseView` plus the picker (AWS:4471-4491).

### 2.1 Header (`WHD`, rendered at AWS:4499-4505)

- Left: close X, `testID volyume-workout-close`, label "Cancel workout", muted ink, 48dp target with 8dp slop.
  Does `handleCancelWorkout` (section 7) (WHD:56-65, AWS:4501).
- Centre: "Elapsed" overline over `m:ss` numerals (`type.num('title')`), plus an amber timer glyph while a shortened
  session is active; spoken as "Elapsed m:ss" (+ ", time crunch active") (WHD:68-80). No hours: 75 minutes reads `75:00` (AWS:4265-4269).
- Right: icon-only `checkmark-done` in brand amber, `testID volyume-workout-finish`, label "Finish workout" (WHD:83-104).
  Hidden when the bottom bar is itself offering "Finish workout" (`showFinish = !(targetComplete && !extraSetArmed && isLastExercise)`)
  so two finish controls never coexist (AWS:4504, WHD:44-47).
- Chromeless: no fill, border or radius, three equal-flex slots so the timer centres on the screen (WHD:110-132).

### 2.2 Session-level reduced note

- One quiet caption line under the header: "One exercise is left out of this session while your change lasts." or
  "{n} exercises are left out of this session while your change lasts." Only when the serve-time capability pass omitted rows (AWS:4511-4517, AWS:807-848).

### 2.3 Outline strip (`WO`, AWS:4526-4531)

- Renders nothing for a one-exercise session (WO:117). Otherwise a 44dp bar, collapsed by default: chevron, "Exercise N of M",
  `done/total sets`, over a 2dp amber session-progress line (WO:143-174, WO:254-264).
- Tap the strip: toggles expansion and ticks a selection haptic (WO:145). Long-press (300ms) on the strip or any row opens the reorder sheet (WO:146-147, WO:198-199).
- Expanded: a `ScrollView` capped at 6.5 rows of 36dp; each row = marker (check when complete, amber dot for current, hollow dot for upcoming),
  name, link glyph if grouped, `done/total` (an en dash when skipped for time) (WO:175-243, WO:42-43).
  Row tap = jump only (`handleJumpToExercise`) and collapse (WO:197, AWS:1328-1333). Skipped rows are 50 percent opacity but tappable (WO:272).
- Auto-collapses after 5 seconds without a touch (suppressed when a screen reader is on); also collapses on any exercise change (WO:48, WO:62-103).
- Totals come from `outlineItemsShown`: the current exercise uses the session-adjusted count, others the routine count (or the
  weekly served count on a plan the new planner built); anything without a number counts as 3 (AWS:4439-4469, AWS:176).

### 2.4 Workspace (`ScrollView`, AWS:4533-5243)

- A plain `ScrollView`, not a virtualised list. `keyboardShouldPersistTaps="handled"`; `keyboardDismissMode` is `interactive` on iOS and
  `none` on Android (drag-to-dismiss deliberately lost on Android, AWS:4538-4561). Content padding `lg` sides, `sm` gap (AWS:6523); a `spacing.xl` spacer ends it (AWS:5242).

#### 2.4a Exercise header row (AWS:4564-4632)

- Exercise name (13px semibold, 2 lines max) with a chevron: tap opens the exercise info sheet; label "Exercise details" (AWS:4570-4596, AWS:6559).
- "..." overflow button (48dp, no container): opens the overflow sheet; first-ever use shows a pulsing "Help" label and the
  label "Exercise options, including how logging works"; retired by an actual open, not by logging (AWS:4597-4625, AWS:2201-2216).

#### 2.4b Status strip chips (`SS`, built inline at AWS:4640-4890)

Chips wrap onto rows (48dp tall each) and tap-expand their content in place (SS:41-62, SS:70-79). In order, each only when its condition holds:

- "Starter session": starter applied; content = the message ("Short version of {routine}: n exercises, 2 sets each. The full session starts next time.")
  and a "Full session" pill that reverts (AWS:4642-4664, `lib/whyThisTemplates.js:278-282`).
- "Circuit" (stored kind `circuit`): text "Circuit · Round r of m · with {partners}"; extra line "This station missed a round." when one round behind (AWS:4665-4694, `lib/circuitRound.js:56`).
- "Superset" (any other group, pairs and giant sets alike): text "Superset - alternates with {partners}" (AWS:4695-4710). The outline and reorder sheet say "Giant set" for 3 or more (AWS:4454-4458, AWS:6090); the chip does not.
- "Avoided pattern": the exercise's movement family is currently avoided; copy "Avoiding {family} until {date}" / "for this block" / plain; "Swap" pill opens the swap sheet (AWS:4715-4741, AWS:962-975).
- "Limitation" (baseline or unknown) or "Temporary change" (episode, held or marker): one of five calm lines about injuries and limitations, with a "Swap" pill (AWS:4742-4773, AWS:1039-1126).
- "Coach note" (one chip per unseen "next time" note): text clamped to 4 lines with More/Less, "Got it" marks it shown (AWS:4774-4825, AWS:2041-2053).
- "Recovery": title "Block finished" / "Recovery-adjusted session" / "Recovery week", sub-line from `trainRecoveryDetail` or "Lighter on purpose. Full recovery, no PRs."; "Got it" dismisses for the screen (AWS:4826-4872).
- "Target met": "Target reached: n working set(s) done" once the plan count is reached (AWS:4873-4888).

#### 2.4c Side note

- "Volyume counts this one side at a time, matching the side you set." when a sided rule carves the movement (AWS:4905-4909, AWS:994-1001).

#### 2.4d Logged sets block (AWS:4919-4975)

- Shown only when at least one set is logged for this exercise. From 3 logged sets the earlier ones fold behind one 28dp line and only
  the most recent stays expanded; the line reads "{n} earlier set(s) logged" / "Hide earlier sets" (AWS:4920-4947). The fold resets on every exercise change (AWS:479-480).
- Each row is a `LoggedSetRow` inside an `AnimatedRow` (fade/rise in, fade out, siblings glide): number badge (or a flame glyph for warm-up),
  text `{weight}{unit} × {reps}` (exercise-type aware), suffix " - Warm-up" or " - Round n" plus " - Circuit/Ballistic" labels, chevron (LSR:155-180, AWS:4948-4972).
- Tap a row: it becomes the inline editor (section 3.7). Long-press (Android only): zeego menu "Edit set" / "Delete set" (SetRowMenu.js:22-41); iOS renders the bare row (SetRowMenu.ios.js:11-13).

#### 2.4e Now card (`NC`, AWS:4990-5102)

- Line 1, one tappable row: position text + " · " + rep range, e.g. "Set 2 of 3 - Working · 8-12 reps"; chevron; tap opens the set-type sheet (`testID volyume-set-type-btn`) (NC:104-124, AWS:4370-4390).
- Line 2, at most one context line (3 lines max): the group-focus flash ("Superset: now X", 2.5 s) or the warm-up explanation (NC:127-152, AWS:4998-5007).
- Prefill row (tappable, with a "Use" cue) or quiet line, see section 3.2 (NC:155-185, AWS:5025-5076).
- The input block: `SetEntry` in compact mode, weight and reps steppers side by side (NC:187-198, section 3.1).
- Record callout, only while the entry would break a record: trophy, "New PR if you complete this set" and one reason line per record (SE:472-486, `lib/workoutRecordLine.js:142-170`).
- Note row: collapsed "Add a note" link; expands to a multiline field "Add a note for this set" with "Remove note" (NC:200-239).
- Card border flashes brand amber for 700ms after a log (NC:100, AWS:2905-2907).

#### 2.4f In-flow banners (AWS:5104-5182)

- Per-side banner, after side one: "Side one logged", "{reps} reps @ {weight}{unit} - same on your other side", "Rest, switch sides, then tap Log other side." (compound) or "Switch sides when you're ready, then tap Log other side." (isolation), and "Cancel set" (AWS:5110-5133).
- Cluster banner: "{Myo-reps|Rest-pause} cluster", running tally "a + b + c = n reps @ w", a "Mini-set reps" field with "Mini-set" button, "Finish cluster", "Cancel" (AWS:5136-5182). The bottom bar is hidden while a cluster is open (AWS:5290).

#### 2.4g Upcoming rows (AWS:5212-5236)

- Read-only 26dp lines for the working sets still to come, `n  8-12 reps` (or "Set n"), from `workingLogged + 2` to the target. None on a warm-up entry (AWS:5213).

### 2.5 Bottom chrome (inside one measured `View`, AWS:5277-5311)

- First-rest caption: "Rest started because you logged a set. Adjust with the buttons, or skip it." with "Got it"; once per install (AWS:5282-5287, AWS:2232-2258, `components/HintCaption.js:19-35`).
- Rest strip: self-hides when idle; see section 4 (AWS:5288, RT:441).
- Action bar (`WBB`), one primary slot (AWS:5290-5310, WBB:76-150):
  - Target not reached: primary only. Label "Log set", "Log warm-up", "Log other side" (mid-pair) or "Start cluster" (cluster set types without per-side) (AWS:5292-5296). Shows a spinner while saving (WBB:143).
  - Target reached (`targetComplete && !extraSetArmed && !perSide`): the primary becomes "Next exercise" (`volyume-btn-next-exercise`) or, on the last exercise, "Finish workout" (`volyume-btn-finish-primary`), flanked by a secondary "Log another set" (`volyume-btn-extra-set`) (AWS:5300-5306, WBB:87-133).
  - While the 1.8 s auto-advance runs, a 3dp amber track fills under the primary (WBB:112-131, AWS:3188-3201).
- The wrapper reports its height so the PR toast can dock above it; heights over 320dp are ignored (AWS:372-392, AWS:5277).

### 2.6 Sheets, modals and alerts (all rendered at the end of the tree)

| Surface | Trigger | Contents | Where |
| --- | --- | --- | --- |
| Exercise picker (modal) | Overflow "Add exercise", lock-screen "Add exercise", empty view button, swap-sheet footer | Search, recents, filters, custom create; one component for add and swap (section 5.1) | AWS:5314-5319, EPM:198-1132 |
| Superset / giant set / circuit heads-up (modal) | First time ever a grouped exercise is reached | Title, member list, 4 steps, tip, "Got it, start", "Unlink" (not on circuits), "Swap exercise" | AWS:5328-5451, AWS:2081-2115 |
| Per-side walkthrough (modal) | First time ever a unilateral exercise is reached | "Log this one side at a time?", 4 steps, "Yes, log per side" / "No, log as normal" | AWS:5463-5562, AWS:2131-2196 |
| Stale session (modal) | Live session idle over 4 hours | "Resume workout?" with Resume / Finish workout / Discard (+ a confirm alert) | AWS:5565-5604 |
| Set type (sheet) | Now card line 1 | Six radio rows with one-line descriptions | AWS:5620-5661, AWS:225-232 |
| Warm-up sets (sheet) | Overflow "Warm-up sets" | Suggested ramp rows, tap loads one as a warm-up entry | AWS:5668-5769 |
| Exercise options (sheet) | "..." button | Ten actions (list below) | AWS:5774-6022 |
| Reorder exercises (sheet) | Overflow row, or long-press on the outline | Drag list with up/down chevrons per row | AWS:6041-6124 |
| Exercise info (sheet) | Tap the exercise name | Name, muscle · equipment, target line, "Adjusted today" and "Eased for today" sections, plan note, Setup / Execution / Watch | AWS:6127-6255 |
| Swap exercise (full-screen modal) | Overflow "Swap exercise", "I can't do this" > "Just for today", chip "Swap" pills, heads-up "Swap exercise" | Scope choice, ranked candidates, escape to full library | AWS:6258-6392 |
| Discard (modal) | Cancel with logged or typed work | "Discard workout?" / "Keep training" | AWS:6394-6421 |

- Overflow sheet actions, in order, with their conditions (AWS:5782-6019): "Swap exercise"; "I can't do this" (alert with Cancel / "Just for today" / "From now on");
  "Add exercise"; "How logging works" (alert); "Reorder exercises" (more than one exercise); "Log per side" / "Logging per side" (unilateral exercises only);
  "Warm-up sets" (weight and reps types, not mid-cluster); "Pair as superset" / "Unpair superset" (not on the last exercise); "Shorten session" (not active, exercises remain) / "Undo shortening";
  "Remove exercise" (red).
- Native alerts raised by the screen (appAlert): "Cannot remove", "Remove exercise?", the validation alerts, "Couldn't save set", "Couldn't save changes", "Delete set?",
  "Couldn't delete set", "Enter reps" / "Enter weight" (cluster, per-side), "Log this one side at a time?", "Couldn't finish workout", the ended-early confirm, "Nothing logged yet",
  "Finish workout?", "Discard workout?" (stale path), "Can't do {exercise}?", "How logging works" (AWS:1466, 1470, 2791, 3278, 3426, 3437, 3450, 3498-3618, 2181, 4124, 4185, 4232, 4255, 5590, 5810, 5864).
  Android adds "Exact rest alerts" the first time a rest runs (RT:317-335).
- Toasts raised by the screen: three "could not be checked" warnings when opening the swap sheet, "{new} now replaces {old} in your plan.", the swap-into-plan failure warning, and "Couldn't discard this workout, try again" (AWS:1689-1693, 1827, 1837, 1974).

### 2.7 Celebration and other surfaces that are not in the screen's tree

- PR celebration is a bottom-docked toast mounted by `App.js` from `store.prCelebration`, not by the logger (`App.js:1099-1111`, PRC:127-245); see section 6.
- Mini bar (outside the logger, other tabs only), lock-screen/shade rest notification and the iOS Live Activity: sections 4 and 8.

---

## 3. Logging a set, end to end

### 3.1 Inputs, and the keyboard or stepper behind each

- The input schema is chosen from `exercise.exerciseType || 'weight_reps'` (AWS:4400, AWS:5091). Suggests: for planned sessions this
  field is absent from the entry's exercise object, see 13.1 (the most consequential inconsistency found).
- `weight_reps` and `weighted_bodyweight`: a weight stepper and a reps stepper (SE:72, SE:156-268). Compact (Now card) puts them side by side
  with labels above; the inline editor stacks them as labelled rows (SE:274-295, SE:452-461).
  - Weight label by load meaning: "Weight (kg)", "Weight (kg, per hand)", "Assistance (kg)", "Added weight (kg)" (SE:74-80).
  - Weight field: `decimal-pad`, "next" key moves to reps, select-on-focus; accepts up to 3 integer digits and 2 decimals, refuses over 500 (SE:171-199).
  - Weight step = the exercise's `incrementKg`, else `defaultIncrement(weight, units, category)`: compound 2.5 kg from 60 kg else 1.25; isolation 1 from 20 kg else 0.5;
    accessory 1.25 from 40 kg else 0.75 (AWS:5093-5094, `lib/algorithms.js:430-439`). Clamp 0 to 500, rounded to 2 dp (SE:87-98).
  - Reps field: `number-pad`, "done" key logs the set; step 1, clamp 1 to 200, typing 0 becomes 1 so a 0-rep set cannot be entered (SE:90, SE:230-253).
- `reps_only`: the reps stepper alone; weight is neither shown nor required (SE:282-295, `lib/workoutHelpers.js:127-135`).
- `duration`: one mm:ss field with a plus/minus 5 second stepper; seconds are stored in the `reps` column and weight is 0 (SE:297-345, SE:129-146).
- `distance`: a distance field (label "Distance (m)" when units are kg, "(yd)" otherwise) plus the mm:ss field; distance is stored in the `weight` column (SE:347-447, `lib/workoutHelpers.js:171-186`).
- Every stepper repeats while held: long-press after 300ms, then every 200ms (SE:122-125, SE:161-163).
- Keyboard: iOS gets a "Done" accessory bar (SE:497-513); weight, distance and reps fields dismiss the keyboard after 8 s idle (SE:57-67); the keyboard is dismissed when a set logs (AWS:2808);
  Android cannot drag-dismiss (AWS:4561).
- Decimal comma: `parseDecimalInput` accepts "82,5" (`lib/parseDecimalInput.js:32-61`) but the weight field's regex does not admit a comma (SE:185). Suggests: a comma-region keyboard cannot type a fractional weight here. Unverified on device.
  Validation itself uses `parseFloat` (`lib/workoutHelpers.js:84`, `:140`) while the cluster and per-side checks use `parseDecimalInput` (AWS:3502, AWS:3616): two parsers on one screen.
- Gym units are forced to `kg` at store level; lbs was removed (`STORE:2220-2227`, `STORE:1161`). Body-weight units are separate and not used here.

### 3.2 How the plan's target and the previous session are shown

- Target is shown twice: the Now card's line 1 carries the rep range (`8-12 reps`, from the resolver's `repsBand`, else the routine row's band) and "Set n of m" (NC:116-121, AWS:5018-5024, AWS:4385).
  `m` is `adjustedSetCount || routine.recommendedSets || 3` (AWS:4278), where `adjustedSetCount` = the week's persisted allocation, then a COMP-015 session adjustment, then the lower of that and a readiness trim of one set (AWS:1171-1207, AWS:652-670).
  Warm-up entries show no range (AWS:5082). Upcoming sets are listed as quiet rows below (AWS:5212-5236).
- Previous session is shown as one tappable row above the inputs, "Last session: 80kg x 8 [Use]". It is the matching working-set number from the most recent completed session
  (`prevWorking[workingLogged]`); nothing shows once you pass the number of sets last time (AWS:5011-5051, `DB:4466-4485`). The text is hard-coded `{weight}{unit} x {reps}` and ignores exercise type (AWS:5045; compare LSR:137).
- Two other prefill rows: "Recovery week - {w}{unit} x {reps}" on a recovery-week prescription (AWS:5027-5036), and a quiet, non-tappable first-time line on the first working set of an exercise with no history:
  "First time on this lift." + "Pick a weight you could lift about {max} times, with a couple in reserve. It is saved for next time." (AWS:5052-5076).
- The prescription itself is seeded INTO the real inputs, ghost-styled (muted ink) until touched; tapping a stepper or typing clears the ghost flag (SE:173, SE:233, SE:98, SE:106, AWS:2680-2690).
- What decides the number: `resolveSetPrescription(packet, { index, evidenceClass })` over the last 3 completed sessions, today's sets and any override (AWS:2473, AWS:2651-2670, `lib/livePrescription.js:981-1117`).
  Output `{ weight, repsTarget, repsBand, provenance (13 codes), confidence, prefill, reference }`. Timed exercises, drop sets, myo-reps, rest-pause, warm-ups and circuit or ballistic positions get history only, no prefill (`lib/livePrescription.js:1005-1026`).
  First exposure with no history: the routine's starting weight or blank, reps at the band minimum (`lib/livePrescription.js:1028-1040`). A "never explain" rule retired the in-card coach line (AWS:141-153).
- A logged weight or reps that differs from what was presented counts as a deliberate choice for the rest of that exercise today (Law G) and feeds the next re-resolution (AWS:3037-3066).

### 3.3 Auto-fill, "kept as filled in" versus typed (migrate_189)

- `seededEntryRef` records the weight and reps the app itself put in the entry. It is written at: exercise load (AWS:2690-2691), after each logged non-warm-up set (AWS:3098-3117),
  after a warm-up logs and the entry flips to working (AWS:3233-3265), after a swap (AWS:1855-1859), and when the untouched-ghost re-seed effect re-resolves after an edit or delete (AWS:4356-4366).
  It is not written by typing, stepper taps, the "Use" chip or a restored draft (AWS:410-415, AWS:2709-2721).
- At log time `deriveEntryTyped({ entry, seed, loggedReps })` returns 1 (weight text or reps differ from the seed, or a cluster total differs), 0 (exactly as filled) or null (no seed) (`lib/workoutHelpers.js:252-258`, AWS:2854-2858).
  A stepper tap and the tap back to the same number counts as 0; "Use" counts as typed when its values differ from the seed.
- Stored locally as `workout_sets.entry_typed` (INTEGER 1/0/NULL) (`DB:2893-2919`, `DB:4607`); an edit that changes weight or reps flips it to 1 in the same UPDATE (`DB:4640-4675`).
  It is not in the store's `setData` (AWS:2861-2881), so the screen cannot see it after logging, and nothing on screen shows it.
- Push: omitted from every set while `ENTRY_TYPED_PUSH = false` (`lib/sync/featureFlags.js:74`, `lib/sync.js:602`); migrate_189 header says "Applied remotely: NO" (`supabase/migrate_189_workout_sets_entry_typed.sql:49-60`).
  The recovery learner reads it from local rows (`lib/recovery/personalRecovery.js:254-255`). The store's watch-event set path (unwired, section 13.2) writes NULL (`STORE:1712-1732`).

### 3.4 Set types

| Type (value, label) | Counts toward the plan target? | Counts for volume, tonnage, set total? | Can set a PR? | Rest after | Source |
| --- | --- | --- | --- | --- | --- |
| `straight` "Working" | yes | yes | yes | full rest | AWS:226, `lib/workoutHelpers.js:15-20` |
| `warmup` "Warm-up" | no | no | no | full rest (same as working) | AWS:227, AWS:3160-3171 |
| `dropset` "Drop set" | no | yes (counted as a working set) | yes (not excluded) | full rest | AWS:228, `lib/algorithms.js:268-271`, `:472-484` |
| `myo_reps` "Myo-reps" | yes (one row) | yes | no | 20 s between mini-sets, then full rest | AWS:229, AWS:3515, AWS:3561 |
| `rest_pause` "Rest-pause" | yes (one row) | yes | no | as myo-reps | AWS:230 |
| `amrap` "AMRAP" | yes | yes | yes | full rest; `is_amrap = 1`, prescription rep target null | AWS:231, AWS:2836, `lib/livePrescription.js:1071-1074` |

- There is no "failure" set type and no RPE or RIR capture: `rpe` is always null, `failed` always false, and `rir` is null except a recovery-week seed or a restored draft (AWS:127-134, AWS:2832-2834, AWS:2687-2689).
  The per-set RIR picker was removed (AWS:127-133, SE:488-491).
- The set-type picker applies to the current entry only, but it is sticky: after a logged working set the next entry keeps the chosen type (AWS:3101); only a logged warm-up resets the entry to Working (AWS:3233-3265).
  All six types are offered for every exercise type, including timed ones (AWS:5634-5657).
- A logged row does not name its type except warm-up, circuit and ballistic; a drop set shows the same number badge as the working set before it (AWS:4955, LSR:166-177).
- `evidence_class` ('circuit', 'ballistic', 'circuit_ballistic', null) is stamped from group structure and exercise metadata, never chosen; warm-ups are always null (AWS:781-784, AWS:2844).
- Per-side commits are stored as an ordinary working row (reps once, no side data) (AWS:3641-3654, AWS:2838-2839).

### 3.5 The tap sequence for "Log set", in order

1. Press: the primary `Button` fires a selection tick as it presses (`components/Button.js:200-202`), then `handleCompleteSetPress` (AWS:5297, AWS:3528-3545): ignored while `saving`;
   mid-pair routes to `finishPerSide`; a unilateral exercise routes to `startPerSide`; a cluster type to `startCluster`; otherwise `handleCompleteSet`.
2. `handleCompleteSet` cancels any auto-advance countdown, then validates (AWS:2777-2793): reps at least 1, and for weight types a positive weight unless the equipment name matches /body\s*weight/i; failure shows an alert and keeps the keyboard up
   (`lib/workoutHelpers.js:104-145`, AWS:2790-2793).
3. Dismisses the keyboard, sets `saving` (button shows a spinner), fires the haptic: `warmupLogged` (selection) for a warm-up, `setLogged` (Light impact) otherwise (AWS:2808-2812, WBB:143).
4. Numbers the set within its kind (`setNumberForKind`), then **awaits** `createWorkoutSet`, a SQLite insert through the write queue (AWS:2820-2859, `DB:4544-4613`). The row is not on screen until this resolves.
5. Appends `setData` to `loggedSets` state and to the store entry, which re-snapshots the whole session to AsyncStorage (AWS:2861-2885, `STORE:1623-1635`, `STORE:193-247`).
6. Audit event, 700ms border flash, spoken "Set n logged, w kg, r reps" (or "Warm-up set logged") (AWS:2895-2919).
7. Record check for weight and reps types: first-ever set shows the quiet "starting point" toast; otherwise `detectPR`; see section 6 (AWS:2942-3021).
8. Re-resolves the next prescription in memory and re-seeds the entry (weight/reps carried or changed by the resolver) (AWS:3031-3118).
9. `updateLastActivity`; if the exercise is grouped and a later member exists, jump to it with a cue and stop here: no rest timer (AWS:3121-3151).
10. Otherwise starts the rest timer if the auto-start preference is on (section 4) (AWS:3160-3171).
11. If this set reached the plan target and a later exercise exists: arms the 1.8 s auto-advance (spoken "Next exercise in a moment"); a past-target set arms `extraSetArmed`; the last member of a group returns focus to the first member (AWS:3173-3221).
12. Clears the note; after a warm-up, flips the entry to Working and seeds from the first working position (AWS:3226-3265). On any throw: logs, and alerts "Couldn't save set. Your set wasn't saved. Tap {Log set|Log warm-up|Start cluster} to try again. If it keeps happening, please contact support." (AWS:3266-3281). `saving` always resets (AWS:3282-3284).

- Unverified: end-to-end latency of step 4 and step 5 on a long session (no profiling possible here). The code shows no optimistic path: the Log button is disabled with a spinner until the insert returns.

### 3.6 Completing, un-completing, editing, deleting, reordering, adding, noting

- Logging is completing. There is no separate tick state and no un-complete; the only undo is delete (see Delete, below). A logged set never reverts to an entry (AWS:2822-2885).
- Edit: tap a logged row, one row at a time (a single `editingSet` / `editValue` pair, AWS:3301-3313). The inline editor reuses the full `SetEntry` with Delete (left), Cancel and Save (LSR:79-128).
  Save writes `weight` and `actualReps` only, so set type, note and RIR cannot be changed after logging (AWS:3363). It re-runs the record check for weight types and prunes or awards the session PR entry (AWS:3367-3408).
  Feedback: setLogged haptic, border flash, spoken "Set updated"; failure alert "Couldn't save changes. Your edit was not saved. Tap Save to retry..." (AWS:3410-3429).
- Delete: from the editor's "Delete" or the Android long-press menu, then a confirm "Delete set?" ("This set is removed and your session totals update. This cannot be undone.") (AWS:3435-3488, AWS:3322-3342).
  Hard delete locally, paired cloud delete with a queued retry, then store and state removal (`DB:4691-4700`, AWS:3448-3465). Set numbers are not repaired, so the next set after a middle delete reuses a number (`setNumberForKind` counts rows, `lib/workoutHelpers.js:33-37`).
- Reordering sets and adding an empty set: not offered. The only "add a set" is past the target: the secondary "Log another set" arms one more entry and the primary returns to "Log set" (AWS:1317-1321, AWS:3185-3187, WBB:89-100).
- Notes: per set only. The note typed on the Now card is written to the NEXT logged set's `notes` column and cleared (AWS:2799, AWS:2835, AWS:3227); clusters merge their breakdown in (AWS:3564-3572, `lib/clusterSet.js:78-83`).
  A logged row does not show its note and the editor cannot change it (LSR:155-180, AWS:3363). There is no exercise-level or session-level note in the logger; the plan's note for the exercise is read-only in the info sheet (AWS:6216-6224).
- Per-set menu: Android only, zeego long-press "Edit set" / "Delete set"; iOS shows none after the 2026-07-12 start-up crash (VOLYUME-1X), so the row tap is the only route (SetRowMenu.js:22-41, SetRowMenu.ios.js:1-13, LSR:192-199).

### 3.7 The three guided flows

- Cluster (myo-reps, rest-pause): choose the type, primary reads "Start cluster", tap checks reps (at least 1) and weight (positive unless bodyweight), opens the banner and starts a 20 s rest (AWS:3495-3516).
  Each "Mini-set" adds reps and restarts a 20 s rest (AWS:3552-3562). "Finish cluster" commits ONE row: `actual_reps` is the sum, `notes` is "Myo-reps: 15, 5, 4" merged with any typed note (AWS:3564-3572, `lib/clusterSet.js:62-83`).
  It counts as one progress set and is excluded from estimated-max records (`lib/workoutHelpers.js:15-20`, `lib/algorithms.js:472-484`).
- Per-side (unilateral): only for exercises whose `laterality` is `unilateral` and the person said yes once (a device-local choice per exercise, plus a suggestion that fires once per exercise and waits for the capability read) (AWS:2131-2196, `lib/unilateral.js:79-134`).
  "Log set" is side one: it starts a half rest for compounds or shows a "switch sides" prompt for isolation; "Log other side" commits one row with the same reps for both sides (AWS:3609-3654, `lib/unilateral.js:170-177`).
  Observed: the commit reads weight and set type from the live entry, not from the frozen pair (AWS:3649-3652 against AWS:2783), and reps edits between sides are ignored (the override wins).
- Warm-up: select the Warm-up type or load a ramp row; log (soft haptic, spoken "Warm-up set logged"); the entry flips back to Working and seeds from the resolver's first working position; a one-line explanation shows once per session (AWS:3233-3265, AWS:5003-5005, AWS:4372).

---

## 4. The rest timer

### 4.1 When it starts

- Automatically after a logged set, only if the device preference `autoStartRestTimer` is on (default on) (AWS:3160-3171, `STORE:2100-2101`).
  A grouped exercise that jumps to its next member returns before this point, so there is no rest between members; the rest fires after the last member (AWS:3134-3151, AWS:3161-3166).
- Regardless of that preference: the 20 s pause at cluster activation and after each mini-set, and the between-sides pause for a compound per-side set (AWS:3515, AWS:3561, AWS:3634-3635); also the store's unwired watch-event set path (13.2, `STORE:1739-1741`).
- There is no manual start: the strip returns `null` when idle and has no start control (RT:441). With auto-start switched off, a straight set never starts a rest.
- Logging a new set while a rest runs replaces it with a fresh full-length rest (`STORE:1946-1977`).

### 4.2 How the length is chosen

- `fullRest` = for a circuit station the group's `roundRestSeconds`, otherwise the routine row's `restSeconds`, then the device default (Settings, 90 s unless changed), then 90 (AWS:3167-3169, `STORE:2100`, AWS:1258-1260).
  A compound per-side set halves it (`halfRestSeconds`, rounded up) (AWS:3170, `lib/unilateral.js:141-146`). `startRestTimer` clamps to 1..`REST_MAX_SECONDS`, else 90 (`STORE:1961-1970`).
- `lib/restSuggest.js` (180 s compound, 90 s isolation, 60 s warm-up, 20 s cluster) is not read by the logger. Its only consumers are the builders (`lib/quickSession.js`, `screens/BuildWorkoutScreen.js`, `screens/ManualBuilderScreen.js`),
  and its header says it never touches runtime rest (`lib/restSuggest.js:22-25`). So a freeform or added exercise always rests the device default, a warm-up rests as long as a working set, and compound and isolation rest alike unless the routine row says otherwise.
- A swap re-derives rest only when the outgoing rest was its tier's default (`restAfterSwap`, AWS:1735-1737, `lib/exercise/swapCarry.js:73-83`). "Shorten session" and the starter claim a rest cut that never reaches the timer: see 13.3.

### 4.3 What the user can adjust

- A running rest: "−15" and "+15" (tap, or hold: 300ms then every 200ms); a decrement can never take the rest under 5 s (RT:388-411, RT:496-513, `lib/restTimerMath.js:8-15`). "Skip" ends it (RT:514-522).
- From the lock screen or shade (Android): "+15s" and "Skip rest" always; "−15s", "Log set" and "Add exercise" on the long-rest sticky (`lib/notifications/categories.js:106-111`, `lib/notifications/restForeground.js:14-26`).
- Not adjustable here: the length before it starts, the per-exercise rest, an "add 30 / 60 seconds" step. The defaults and the three rest preferences (auto-start, end-of-rest alert, sounds) live in Settings (`STORE:2093-2157`; Settings is lane A2).

### 4.4 Sound and haptics

- Countdown cues at 3, 2, 1 s and 0: synthesised beeps at 660, 770, 880 Hz and a longer 1100 Hz "go" tone, with escalating haptics (Medium, Heavy, Heavy plus Warning, then the "rest done" ladder) (RT:337-364, `lib/restSound.js:4-8`, `lib/haptics.js:130-158`).
- Beeps are gated by the `restSoundsEnabled` preference only (`lib/restSound.js:178-197`); haptics are gated by Reduce Motion, OS or in-app (`lib/haptics.js:30-33`, `:85-96`). The audio mode plays in iOS silent mode and stays active in the Android background (`lib/restSound.js:132-138`).
- Beep buffers are never released: `unloadRestBeeps` has no caller (`lib/restSound.js:218`; grep).

### 4.5 When the app is in the background

- Android, rest of 170 s or less: a native foreground service hosts a ticking chronometer notification with "+15s" and "Skip rest" (RT:149-203, `lib/notifications/restForeground.js:33-57`).
  Longer rests: the module's plain chronometer notification (OS-rendered, no JS), and only in builds without the module a static "Resting" sticky reading "Ends HH:MM  ·  {exercise}" with five actions (RT:205-253, `lib/notifications/restForeground.js:97-112`, `lib/notifications/activeWorkout.js:240-285`).
- Both platforms: an OS-scheduled local notification at the end time, "Rest done" / "Next set when you're ready.", skipped when the Settings switch is off or the rest is under 2 s; foreground delivery is suppressed elsewhere (`lib/notifications/restEnd.js:41-75`, `STORE:1978-1984`).
- Android, when the app goes to the background mid-rest: the 3-2-1 and go cues are handed to AlarmManager and cancelled on return (RT:260-275, `lib/notifications/restForeground.js:150-172`). A one-time "Exact rest alerts" prompt appears on the first rest (RT:317-335).
- Notification actions: "Log set" opens the app and logs only if a rest is running and the current entry is not an untouched ghost; "Add exercise" opens the picker (AWS:2398-2430).
- What the Android native side draws (`modules/rest-timer-live`): the foreground service posts one ongoing, low-priority "progress" notification, public on the lock screen, in the amber accent: title = the exercise name (default "Rest timer"), text "Rest in progress", a chronometer counting down to the end time, and two text-only actions "+15s" and "Skip rest" that re-enter the service and never open the app (`WorkoutForegroundService.kt:337-366`, `:112`, `:182`). Channel `rest-timer`, importance low (`WorkoutForegroundService.kt:76`, `:315-325`).
  The service is declared and started as a short-service foreground service, stops itself at rest end and in `onTimeout` (`WorkoutForegroundService.kt:265-277`, `:292-299`, `AndroidManifest.xml:3-18`). The non-service path posts the same title, text and chronometer without actions (`RestTimerLiveModule.kt:154-203`). Taps reach JS as an `onRestTimerAction` event (`RestTimerLiveModule.kt:137`, `WorkoutForegroundService.kt:128-171`).
  The 3-2-1 and go cues come from `AlarmManager` exact alarms (`setExactAndAllowWhileIdle`, only when exact alarms are permitted) handled by `RestCueReceiver`, which plays the cached `volyume-beeps/{three,two,one,go}.wav` through `MediaPlayer` as an alarm-usage sound and is silent if the file is absent (`RestTimerLiveModule.kt:340-372`, `RestCueReceiver.kt:42-69`). The same module can host a whole-workout foreground notification (`startWorkoutForeground`, `RestTimerLiveModule.kt:221-250`); the JS caller returns before using it (`lib/notifications/activeWorkout.js:142-143`).
- iOS: a Live Activity started with every rest (`STORE:1989-1999`): lock-screen card with exercise name, workout name, a 44pt amber live countdown and "Rest in progress"; Dynamic Island expanded, compact and minimal forms; set numbers are deliberately not sent
  (`modules/live-activity/widget/VolyumeRestTimerLiveActivity.swift:44-139`, `STORE:1986-1988`). Colours are hard-coded amber/white/black, not themed (same file, lines 68, 107, 123).
  Updated on ±15 (`STORE:2046-2049`), ended on skip and natural expiry (`STORE:2009-2012`, `STORE:2086-2089`) and by a cold-launch sweep (`App.js:567-579`, `STORE:1792`).
  Finishing the workout mid-rest calls `endWorkout()` (AWS:3973), which does not end it; `discardWorkout` explicitly stops the timer first (AWS:1967-1969). Suggests: the iOS card can outlive a finished session until the system or the next launch removes it. Unverified on device.
- A persistent whole-session notification (workout name, "Set n of m", elapsed) is disabled: `showActiveWorkoutNotification` returns on its first line (`lib/notifications/activeWorkout.js:136-143`), although the screen still builds and sends its arguments after every set and every 15 s (AWS:2327-2374).

### 4.6 What it looks like

- A docked strip, not a card: background colour, 1px top hairline, a 2dp draining line along the top (scaleX, native driver; static under Reduce Motion), then a row of at least 48dp: "REST" overline, `m:ss` (16px numerals, minimum width 44), "−15", "+15", "Skip" (RT:456-523, RT:533-622).
  The line and the numerals turn the warning colour at 10 s or less; at 3 s or less the numerals become a single large digit (RT:438-439, RT:490-494, RT:97-99).
- On expiry the strip becomes a success-tinted 36dp "Start next set" with a check for 3 s (RT:447-454, RT:361-363). It is mounted outside the workspace scroll so it never pushes the inputs (AWS:5268-5276, RT:528-532).
- Accessibility: the readout is not a live region; spoken edges are "Rest timer started" and "Rest over. Start your next set."; digits cap at 1.15 times font scale (RT:312-315, RT:360, RT:485-493).
- The logger itself subscribes only to a boolean `restTimerActive`, so the per-second tick does not re-render the screen (AWS:362-366). The strip and the mini bar subscribe to the remaining seconds (RT:63-74, `MB:51-62`).
  Every store action, including each `tickRestTimer`, also emits an observability breadcrumb (`STORE:2507`, `lib/observability.js:383-424`). Unverified: the cost of that at 1 Hz.

---

## 5. Exercises during a session

### 5.1 Adding one (the picker)

- Entry points: overflow "Add exercise", the lock-screen "Add exercise" action, the empty view's button, and (in swap mode) the swap sheet footer. There is no "+" on the outline or header (AWS:5843-5856, AWS:2405-2416, EEV:76-85, AWS:6365-6385).
- `handlePickerSelect` appends the exercise to the END of the session and jumps to it; the entry is `{ exercise, routineExercise, sets: [], _userAdded: true }` and the store mints a slot id (AWS:1872-1882, `STORE:1596-1615`).
  `routineExercise` carries no rep band, rest or starting weight, so the target is the fixed 3-set fallback and rest is the device default (AWS:176, AWS:4278, AWS:3169).
  The resolver then falls back to an 8-12 band, so the Now card shows "8-12 reps" for an exercise nobody planned (`lib/livePrescription.js:805-807`, AWS:5018-5024). Suggests: a target the person never set is displayed as if it were a plan.
- Picker, add mode (`EPM`): search field with autofocus ("Search exercises") using an alias-aware tiered fuzzy match (EPM:854-860, EPM:447-457);
  a horizontal "Recent" chip rail and, in the list, sections Recent, "In your plan" (needs a `planExercises` prop, which the logger never passes), Staples, All exercises (EPM:871-893, EPM:1025-1037, `lib/exercisePickerSections.js:76-110`, AWS:5314-5319);
  muscle chips and equipment chips (EPM:955-1003); two toggles that appear only when relevant: "Show / Hide what you have set aside" and "Show / Hide movements that clash with your limitations" (EPM:925-953);
  rows show the name and one caption (set-aside text, a limitation caption, or the raw `primaryMuscle` key with `textTransform: capitalize`, so `front_delts` reads "Front_delts") (EPM:1047-1091, EPM:1177).
  Tapping a row adds immediately unless a limitation conflict triggers one of three alerts (clinician-reported rule, unknown, self-declared) (EPM:481-535).
- Custom exercises: footer "Create a custom exercise" opens a form (name, primary and secondary muscles, equipment, exercise type, "Weight entered as", single-axis asks only for axes the person constrains, a "Looks like X already exists. Use it instead?" nudge)
  and writes an `exercises` row with `isCustom` (EPM:537-613, EPM:676-850, EPM:1094-1113).
- Swap mode is thinner: no chips, no Recent rail, a flat fuzzy list, no create-custom footer; mode is decided by `buttonLabel.toLowerCase().includes('swap')` (EPM:233-234, EPM:395, EPM:447-454, EPM:1094).
  The AWS comments claim a swap can fall through to "the custom-exercise form" and handle "a freshly created custom one" (AWS:481-483, AWS:1869-1871, AWS:6362-6364); the picker offers no way to create one in swap mode. Section 13.5.
- Duplicate recents in add mode: the rail and the first list section show the same recent exercises when the query is empty (EPM:871-893, `lib/exercisePickerSections.js:76-98`).

### 5.2 Swapping and replacing (one flow)

- Entry points: overflow "Swap exercise"; overflow "I can't do this" > "Just for today" (sets `workAroundSwapRef`; "From now on" navigates to `HowYouTrain` instead, no swap); the "Swap" pill on the avoided-pattern and limitation chips; the heads-up modal's "Swap exercise" (AWS:5782-5792, AWS:5810-5833, AWS:4729-4737, AWS:4761-4769, AWS:5434-5445).
- Which candidates (`handleOpenSwap`, AWS:1595-1721): the cached library minus anything already in the session (AWS:1603-1604, `DB:3429-3449`); filtered to the person's equipment profile (AWS:1612); restricted to the plan's style pool when the plan is style-tagged (AWS:1616-1626, AWS:1642);
  assisted regressions dropped unless the person is a beginner (AWS:1644, `lib/swapEngine.js:36`, `:246`); `rankSwaps` scores top 20 (same primary muscle first, then +40 same muscle, +25 same subregion, +20 movement pattern, +15 equipment, +10 compound/isolation, +10 fatigue, +10 stimulus ratio) (`lib/swapEngine.js:18-30`, `:224-296`);
  `rankPersonalised` drops set-aside and limitation-blocked movements and reorders by personal history, tags "Your default here", "Last used here", "You've chosen this replacement several times", "Progressing consistently", "Used recently", "Previously used" (`lib/exercise/intent.js:667-780`); the screen shows the first 8 (AWS:1647, AWS:1660-1663).
  Circuit stations also lose candidates that share a primary muscle with an adjacent station (AWS:1704-1717).
- The sheet (AWS:6258-6392): title and exercise name; a note ("Choose a close match. It keeps this slot's sets and reps, and sets you log count towards the new exercise's own muscle in your weekly volume." or the "for today" variant) (AWS:6282-6284);
  a "Just this session" / "From now on" segmented choice, offered only when the slot has a plan row and this is not the work-around route, with a one-line hint (AWS:1631-1634, AWS:6285-6297, `lib/exercise/swapCarry.js:276-297`);
  "{n} movement(s) left out for your limitations." (AWS:6302-6306); "Showing {style} exercises" plus "Show all exercises" (AWS:6310-6319); rows with name, personal tag, reason, and for "From now on" a muscle-move note (AWS:6326-6352); empty text; footer "Search exercise library" which closes the sheet and opens the picker in swap mode (AWS:6353-6386).
- Reason lines are assembled from raw columns: "Targets {primaryMuscle} with the same {movementPattern} pattern", "uses {equipment} instead" (`lib/swapEngine.js:140-158`). Suggests: snake_case keys such as `horizontal_row` can reach the screen.
- What a confirmed swap carries (`handleConfirmSwap`, AWS:1723-1867): the slot's sets and rep range stay, `startingWeight` is cleared, rest follows the new exercise's tier only if the old rest was the tier default (AWS:1730-1737, `lib/exercise/swapCarry.js:73-105`);
  the entry becomes `{ exercise: new, routineExercise: carried, sets: [], _userAdded: true }` with any capability marker cleared (AWS:1761-1770); the week's served set count is carried to the new id (capped on the new planner) (AWS:1776-1785);
  "From now on" writes the plan row through `applyExerciseSwap` and reports "{new} now replaces {old} in your plan." (plus a muscle note), failure shows "Swapped for this session. Your plan could not be updated just now." (AWS:1807-1839, `lib/exercise/swapApply.js:42-64`); "Just this session" writes nothing to the plan and logs a session-scope swap that is not preference evidence.
  Then every per-exercise state resets and the entry reseeds at the band minimum (AWS:1840-1866).
- Sets already logged for the outgoing exercise stay in SQLite and still count at finish, but leave the entry and the screen (AWS:1766, AWS:1850, AWS:3812). The swap note says sets you log count toward the new exercise (AWS:6283).
- `ExerciseConflictSheet` is not part of this flow (its only consumer is `screens/PlanLibraryScreen.js:998`); in-session conflicts are the picker's alerts and the sheet's filtering and "left out" line.
- "Replace" is the same code: there is no separate replace surface.

### 5.3 Removing

- Overflow "Remove exercise" > confirm "Remove exercise?" "Remove {name} from this session. Your plan is not changed." (Cancel / Remove). Refused with "Cannot remove" when it is the only exercise (AWS:1464-1593, AWS:6009-6019).
- The confirm does not say that sets already logged stay saved and still count; they do, because finish reads SQLite (AWS:3812). Removal may also write a durable "omitted" record against the plan slot for a limitation-excused row (AWS:1540-1579).

### 5.4 Reordering

- One path: the reorder sheet, from overflow "Reorder exercises" or a long-press on the outline (AWS:5884-5896, WO:146-147). A draggable list, block-aware (a superset or giant set moves as a unit), with per-row up and down chevrons as the accessible route (AWS:6041-6124, `lib/reorder.js:118-131`).
  Both routes write through `setWorkoutExercises` and re-point the current index (AWS:1439-1462). Jumping, reordering and skipping are separate by law: a row tap only changes the index (AWS:1323-1333).

### 5.5 Supersets, giant sets, circuits

- Pair: overflow "Pair as superset" links the current exercise with the NEXT one (joining an existing group, so a pair can grow into a giant set); "Unpair superset" clears the whole group and its circuit fields (AWS:5964-5976, AWS:1380-1422). Not offered on the last exercise.
- On the first grouped exercise ever reached, a heads-up modal teaches the 4 steps; afterwards the chip carries it (AWS:2081-2115, AWS:5328-5451). A circuit is announced as one and has no Unlink, because a circuit is edited in the plan (AWS:5415-5433, AWS:777).
- Running order: log member A, focus jumps to the next later member with a selection haptic, a spoken "Superset: now X" and a 2.5 s Now-card line; after the last member the rest runs and focus returns to the first member (AWS:3134-3151, AWS:3202-3221, AWS:1344-1361).

### 5.6 Instructions and detail

- Tap the exercise name for the info sheet (AWS:6127-6255): name, "Muscle · Equipment", the target line ("n sets of a-b reps") only when the routine row has sets, the adjustment sections (5.7), a "Plan note", then "Setup", "Execution", "Watch" from the exercise corpus by name, else the exercise's own notes, else
  "No instructions for this exercise yet. Start light, move with control and stop a couple of reps before you truly cannot do any more." (AWS:6137-6152, AWS:6214-6252, `lib/exerciseInstructions.js:18-29`).
- There is no image, GIF or video in the logger: the screen imports no media component (AWS:3, AWS:8). There is no navigation from the logger to the Exercise detail screen: the screen's only outbound navigations are `goBack`, `replace('WorkoutSummary')` and `navigate('HowYouTrain')` (grep of AWS `navigat`).

### 5.7 "Why this" copy

- Info-sheet sections: "Adjusted today" (reason text from the session adjustment, "Last trained {weekday}.", a "Use planned sets instead" revert) and "Eased for today" (the readiness why lines and a restore button labelled "Use planned targets instead" or "Use your coach's targets instead") (AWS:6157-6207, AWS:1246-1250).
- Readiness copy comes from a fixed table: "Rough night: one set fewer on each lift today keeps quality up.", "Low energy today: ...", "Feeling below par: ...", "Suggested loads are a little lighter so every rep stays controlled." (`lib/sessionAdjustments.js:640-657`). The "Feeling sharp..." acknowledgement string has no consumer (`lib/sessionAdjustments.js:655`; grep).
- Swap rows carry a tag and a reason line (5.2); the limitation and avoided-pattern chips carry their own lines (2.4b). The standing in-card coach line was retired by founder order 2026-08-17 (AWS:141-153).

### 5.8 Warm-up ramp

- Pull only, from overflow "Warm-up sets" (never suggested automatically) (AWS:5941-5963, `lib/warmupRamp.js:19-26`). The sheet builds rows from the entry's working weight (or an anchor captured on first open): barbell lifts get an "Empty bar x 10" row, then 40 percent x 5, 60 percent x 3, 80 percent x 2, rounded to 2.5 kg, dropping rows that collapse or reach the working weight (AWS:5676-5766, `lib/warmupRamp.js:30-83`).
  Bar weight is `store.barWeight || 20`, read-only at runtime (AWS:5687, `STORE:2362-2371`). Tapping a row loads it into the entry as a warm-up; nothing is logged (AWS:5744-5762).
  No weight yet: a barbell lift offers the empty bar, others a one-line explanation (AWS:5688-5726).

### 5.9 Shorten session and the starter session

- Overflow "Shorten session": snapshot, then `applyTimeCrunch` for a 25 minute target over the remaining exercises; dropped ones that have no sets are marked `_timeCrunchSkipped`, kept ones get `restSec * 0.70` on their exercise object; a message "Rest cut by 30%. {X} removed to fit your time. Estimated session: n minutes." appears in the overflow and the header gets an amber timer (AWS:3733-3785, `lib/mesocycle.js:372-409`, `lib/whyThisTemplates.js:254-264`). "Undo shortening" restores the snapshot (AWS:3660-3668).
- Starter session (param): first 4 exercises, 2 sets each, rest 70 percent, revert via the chip's "Full session" (AWS:3675-3731). Defects in both: 13.3.

---

## 6. Records and milestones

- When it runs: at log time only, for weight-bearing types (`weight_reps`, `weighted_bodyweight`), never for a warm-up, and only when a bar exists and the history read did not fail (AWS:2986-2991). Reps-only and timed exercises never produce a record, and a set with weight 0 never does (`lib/algorithms.js:511`).
- The bar to beat is every completed working set the person has ever logged for the exercise (excluding this workout) plus today's earlier working sets for it; warm-ups are out on both sides (AWS:2942-2984, `lib/algorithms.js:472-484`).
  History is read once per exercise change; a set logged before that read lands triggers a fresh read, and a failed read means no claim at all (AWS:2942-2951, AWS:418-425).
- First ever working set on record: no record claimed; a quiet toast "{w}{unit} x {reps} logged as your starting point" and it never joins the session list (AWS:2992-3007).
- What counts (`detectPR`, `lib/algorithms.js:506-611`): estimated max beats the best by more than 0.1 percent (`1rm_estimate`); strictly heavier than anything before (`heaviest_weight`); more reps than the best at the same weight within 0.1, when a prior set at that weight exists (`most_reps_at_weight`).
  Assistance machines invert: lower assistance at no fewer reps (`least_assistance`), or more reps at the same assistance (`lib/algorithms.js:525-560`). Excluded rows: warm-up, myo-reps, rest-pause, ballistic (`lib/algorithms.js:472-484`). Volume is not a record type.
- Estimated max formula (`calculate1RM`): 1 rep is the weight; up to 10 reps, 60 percent Epley plus 40 percent Brzycki; above 10, Epley alone; reps are clamped at 20 for the formula (`lib/algorithms.js:104-144`).
- Celebration: only the first record of the set is shown (order: estimated max, heaviest, most reps) via `showPRCelebration`, which queues in the store (AWS:3009, `STORE:2196-2200`). `App.js` mounts a calm bottom-docked toast: icon (trophy, barbell or flash), title ("New estimated max lift", "New heaviest weight", "Most reps at weight", or "First lift logged"), the label line, auto-dismiss at 2.2 s, tap to dismiss
  (`App.js:1099-1111`, PRC:127-245). The full-screen overlay and confetti were retired for in-session records; confetti remains only on the summary (PRC:128-142, `screens/WorkoutSummaryScreen.js:43`).
- Haptics and speech: a PR ladder (iOS rich pattern, else Success plus two Heavy) for a real record, a single selection tick for first lifts or when calm mode or Reduce Motion is on; spoken "Personal record. {type}: {label}." (PRC:176-216, `lib/haptics.js:111-128`). Calm mode changes only the haptic, not the toast (`App.js:564-565`, `:1108-1111`).
- Where it is stored: one best record per exercise in `store.sessionPRs` (type rank estimated max, then heaviest/least assistance, then most reps; larger value within a type), tagged with the earning `setId` and persisted in the session snapshot (AWS:3017-3020, `lib/algorithms.js:616-662`, `STORE:1476-1484`, `STORE:211`).
  It is passed to the summary as `detectedPRs` (AWS:3972, AWS:3991). There is no local personal-records table (`DB:10008` comment); later screens derive records from the set rows.
- Live "on for a record" cue: the Now card's callout uses the same `detectPR` call over the same history shape, so it cannot promise what the log withholds (AWS:4408-4427, `lib/workoutRecordLine.js:9-18`). It computes a "Best 80kg x 8" label in every state that is never rendered (`lib/workoutRecordLine.js:113-122`; no consumer outside tests).
- Edits and deletes re-evaluate: an edited-up set can earn the toast, an edited-down set loses its entry, a deleted set's entry is pruned (AWS:3367-3408, AWS:3466-3472).
- Not gated: a recovery week still detects and celebrates records although its banner says "no PRs" (AWS:2990, AWS:4852). Milestones, streaks and consistency celebrations: none in the logger (grep of AWS).

---

## 7. Finishing

### 7.1 Two exits

- Finish: the header check icon or the bottom bar's "Finish workout" (last exercise, target met), or "Finish workout" in the stale-session modal (AWS:4499-4505, AWS:5300-5303, AWS:5585).
- Cancel: the header X or the Android hardware back (always routed to the cancel flow, even mid-sheet owners aside) (AWS:2000-2007, AWS:4501).

### 7.2 Cancel and discard

- `handleCancelWorkout` (AWS:1980-1997): if no set is logged anywhere AND nothing is in progress in the entry, it silently ends the store session, dismisses the notification and goes back. Otherwise it opens the "Discard workout?" modal ("This will delete the current workout session. Your plan will not advance." / "Keep training" / "Discard workout") (AWS:6394-6421).
  "In progress" means a typed-but-unlogged entry that differs from what the app seeded, an open cluster or per-side pair, or a typed note (AWS:1916-1924).
- `discardWorkout` (AWS:1946-1978): a bounded (8 s) transactional delete of the in-progress workout and its sets, then stop any running rest, end the session and go back; a failure toasts "Couldn't discard this workout, try again" and keeps the screen. The delete is `deleteIncompleteWorkout` (`DB:4067-4096`).
- The silent-empty path never calls the delete, so the `workouts` row created at start (`is_completed = 0`) is left in SQLite (AWS:1989-1993, `DB:3927-4040`). Whether anything later sweeps such a row is not traced: section 14.

### 7.3 Finish, step by step (`handleFinishWorkout`, AWS:3787-4263)

1. Guards: no active workout goes back; a ref blocks a double tap; an audit event is emitted; exercises and elapsed time are snapshotted (AWS:3788-3799).
2. Confirmation, in this order:
   - Every planned exercise (ignoring ones dropped by "Shorten session") has at least one set and nothing is in progress: finish immediately, no confirm (AWS:4142-4145, `lib/workoutHelpers.js:64-71`).
   - Some exercises done, some untouched, and the programme week and routine are known: an "ended early" confirm, "Finish {session} here?" with "The work you've logged will still count. The exercises you didn't do won't be logged as completed, and Volyume will move on from this workout." (plus "After this, your recovery week will begin." when it is the last required session), buttons "Keep going" / "Finish for today" (AWS:4166-4208, `lib/blockProgression.js:399-408`).
     Confirming finishes with an `ended_early` resolution in one SQLite transaction (AWS:4196-4202, `DB:6627`).
   - The database read worked and nothing is saved: "Nothing logged yet" ("This workout has no sets logged, so there is nothing to save.") with "Keep going" or "Discard workout"; an empty workout cannot be completed (AWS:4222-4245).
   - Otherwise "Finish workout?" with "You've logged n sets across m exercises." plus a note naming any unlogged entry, "Keep going" / "Finish workout" (AWS:4246-4262, AWS:4147-4151).
3. `runFinish` first writes the limitation "completion effects" record (best-effort, never blocks), then `doFinish` (AWS:4011-4131).
4. `doFinish` (AWS:3803-4009):
   - reads every set of the workout from SQLite (memory only if that read fails), so sets on swapped or removed exercises still count (AWS:3810-3816);
   - builds one `sessionReport` from those rows and the unfiltered exercise lookup: set count, working set count, tonnage with load semantics, exercise count and names (AWS:3832-3841, `lib/sessionReport.js:158-173`);
   - names the workout after its routine, else "A & B +more", else "Workout complete" (AWS:3851-3857, `lib/sessionShareData.js:236-242`);
   - writes `endedAt`, `durationMinutes` (rounded wall-clock minutes from `workoutStartTime`), `isCompleted`, `name`, `setCount` (working sets), `totalVolume` (tonnage) (AWS:3858-3874);
   - retires a consumed re-entry ease, refreshes the community consistency counters, emits `workout_completed` and `first_workout_logged` telemetry (counts only), rewrites the widget snapshot, re-lays notification schedules (activation nudge, habit-derived training reminder, weigh-in relay) (AWS:3882-3947);
   - pushes the workout and all its sets to the cloud straight away (`syncWorkout`), queueing a retry on failure (AWS:3956-3963, `lib/sync.js:376-413`);
   - captures session adjustments and PRs, calls `endWorkout()` (clears the store, cancels the end-of-rest alert, removes the snapshot), plays the completion haptic, dismisses the notification and replaces the route with `WorkoutSummary` (AWS:3964-4008, `STORE:1907-1933`).
5. Failure: log, reset the double-tap guard and alert "Couldn't finish workout. Your sets are still saved, but the workout did not close on your device, so tap Finish workout again." (AWS:4114-4130).

### 7.4 How incomplete and empty sets are treated

- There is no half-logged set in the data: an entry becomes a row only when it validates (reps at least 1; weight positive unless bodyweight, reps-only or duration) (`lib/workoutHelpers.js:104-145`). A typed-but-unlogged entry at finish is dropped, and the confirm says so (AWS:4147-4151).
- Planned exercises with no sets produce no rows and no zeros; "ended early" records that fact against the programme week (AWS:4166-4208). Exercises skipped by "Shorten session" do not trigger a confirm (`lib/workoutHelpers.js:64-71`).
- Duration is wall-clock since the session began, including rests, idle gaps and time the app was closed; the workouts table has `last_activity_at` and `active_elapsed_seconds` columns that the logger never writes (AWS:3860, `DB:4001-4015`).

### 7.5 What is written locally, and what is pushed

- At each log: one `workout_sets` row (id, user, workout, exercise, denormalised exercise name, set number, type, target rep band, actual reps, weight, rir, rpe null, failed, notes, is_amrap, left/right reps null, evidence class, entry_typed, timestamps) (`DB:4544-4613`).
- At finish: the `workouts` update above; capability effects rows when relevant; a programme-week resolution for ended-early.
- Pushed at finish: the workout row plus every set, with `evidence_class` included and `entry_typed` omitted while its flag is off (`lib/sync.js:376-413`, `lib/sync.js:566-625`, `lib/sync/featureFlags.js:27`, `:74`). In-progress workouts never sync (`DB:4061-4066`).
  Also: consistency counters (self-gated), widget snapshot (local), notification schedules (local), engagement telemetry (no exercise names or loads) (AWS:3889-3947).
- What the user sees next: `WorkoutSummary` with `workoutId`, adjustments, `routineId`, `startedAt`, `endedAt`, `durationMinutes`, `exerciseCount`, `setCount`, `workingSetCount`, `tonnage`, `exerciseNames`, `detectedPRs` and a per-exercise `exerciseData` list (each with recommended sets, rep band from the logger entry, and the logged sets) (AWS:3979-4008). `replace` means there is no back to the logger. The summary is lane A2.

---

## 8. Persistence and resilience

### 8.1 What is saved, and when

- Set rows: SQLite at the moment of logging, before the screen shows the set (AWS:2822-2859).
- Session state: no timer-based autosave. After every store mutation (a set added, edited or removed; an exercise added, removed, reordered, swapped or paired; the index changing; the PR list changing; a readiness dismissal) the whole session is JSON-stringified and written to AsyncStorage: workout, every entry with its exercise object and sets, index, start time,
  session adjustments, session PRs, the last 500 applied watch event ids, the rest anchor and duration, and a saved-at stamp (`STORE:193-247`, `STORE:1479-1484`, `STORE:1579-1670`). A write failure is logged and otherwise ignored; the code notes Android's roughly 2 MB row limit on long sessions (`STORE:225-229`).
- A typed but unlogged entry: a per-workout, per-exercise draft in AsyncStorage, written 250 ms after the last change and flushed at once when the app goes to the background or inactive (AWS:2738-2765). Saved only when the weight is non-empty; stores weight, reps, rir, set type and the working-set count; restored only onto the same set position (AWS:2699-2724, AWS:2745-2746).
  Draft keys are never removed at finish or discard; the only removal is when the weight box is emptied (AWS:2751; grep: `@volyume_setdraft_` appears only at AWS:2704 and AWS:2742).
- Not persisted at all: the note being typed, an open cluster, a half-done per-side pair, the "log another set" arming, the history fold, shorten-session and starter state (`timeCrunchActive`, `starterActive`, the revert snapshot), rest-hint and heads-up bookkeeping refs (AWS:468-503, AWS:616-623, AWS:479).

### 8.2 Resume after the app is killed

- `restoreActiveWorkout` runs from Home (`screens/HomeScreen.js:283`): it ends any stale iOS Live Activity, checks the snapshot belongs to this account, and that the `workouts` row still exists and is incomplete; an unreadable database leaves the snapshot for the next launch, a malformed one is logged and removed (`STORE:1784-1843`).
  It restores entries, index, start time (so the elapsed clock keeps counting real time, including time the app was dead), adjustments, PRs, applied ids and a rest that is still in the future (`STORE:1848-1876`). `lastActivityAt` is reset to now, so the 4 hour stale prompt cannot fire after a restore (`STORE:1854`, AWS:2033-2038).
- Home then shows "Workout in progress / Tap to return to your workout"; nothing reopens the logger by itself (`screens/HomeScreen.js:2761-2775`).
- On opening, `loggedSets` is rebuilt from the restored entry's `sets`, the prescription is re-resolved from SQLite history, and a matching draft is re-applied (AWS:2433-2724). Restored entry sets are the store shape (`setData`), which carries no note or entry_typed; those exist only in SQLite (AWS:2861-2881).
- Lost after a kill: the typed note, an open cluster or pair, entry values with no draft, "log another set" arming, the history fold, and the Undo for a shortened or starter session. The `_timeCrunchSkipped` marks stay on the entries, so dropped exercises remain dropped with no undo control (AWS:616-623, AWS:3767).

### 8.3 The mini bar when the user navigates away

- While a workout is live every other tab shows a docked bar: live dot, current exercise name, and either the rest countdown or progress text; tap returns to the logger (`MB:112-154`, `components/VolyumeTabBar.js:110-114`). It is a pure display of store state.
- Its progress text is `Set {done+1} of {target}` or `{n} set(s) done`, where `done` is the entry's total set count including warm-ups and drop sets and `target` ignores session adjustments (`MB:56`, `MB:80`, `MB:94-96`). The logger counts progress sets and applies adjustments (AWS:4278-4279). The two can disagree on the same exercise.

### 8.4 Timers across background

- Elapsed time is derived from the persisted `workoutStartTime` every second and again when the app returns to the foreground, so backgrounding cannot drift it (AWS:2264-2298).
- The rest is a wall-clock anchor (`restTimerEndsAt`); JS ticks are suspended in the background, so the strip re-syncs on foreground and fires the end haptic if the rest elapsed while away (`STORE:1935-1977`, RT:260-294). OS alerts, the Android service and the iOS Live Activity carry it meanwhile (section 4.5).
- The screen stays awake while focused (AWS:723-746).

### 8.5 Failure handling and orphans

- A failed set write alerts and leaves the entry intact for a retry (AWS:3266-3284). The database clamps impossible numbers (weight over 5000, reps over 1000, non-finite to 0) while the screen's own caps are 500 and 200 (`DB:4517-4542`, SE:90).
- Left behind: the `workouts` row from a silent empty cancel (7.2); draft keys (8.1); beep buffers never unloaded (4.4); the iOS Live Activity after a finish mid-rest (4.5).
- "Undo shortening" and the starter's "Full session" restore a snapshot of whole entries, including their `sets` arrays, so sets logged after the snapshot drop out of the store entry and the persisted snapshot while remaining in SQLite (AWS:3660-3668, AWS:3678, AWS:3735). Section 13.3.

---

## 9. Units, loads and maths

### 9.1 kg, lb and unit strings

- Gym weight units are always `'kg'`: `setUnits` ignores its argument, and a cloud or profile `lbs` value is forced to `'kg'` on load (`STORE:2220-2227`, `STORE:1161`). The logger reads `units` from the store and prints it into labels and copy (AWS:326-361).
- The `lbs` branches left in logger code cannot be reached at runtime: the `defaultIncrement` lbs tiers (`lib/algorithms.js:430-439`), the `Distance (m|yd)` label picked by `units === 'kg'` (SE:355), and the kettlebell ladder skip in `resolveLoadIncrement` (`lib/livePrescription.js:168-192`). The warm-up ramp is "kg-only by design" (`lib/warmupRamp.js:14`, `:49-55`).
- Distance has no unit of its own: it borrows the weight unit (m when kg). A distance set stores metres in `weight` and seconds in `reps` (SE:347-441, `lib/workoutHelpers.js:171-195`).
- Unit spacing and the multiplication sign differ by surface: "80kg × 8" on a logged row (`lib/workoutHelpers.js:186`), "80kg x 8" on the Last-session prefill and the first-lift toast (AWS:5045, AWS:3005), "80 kg x 8" on a warm-up ramp row (AWS:5759). Suggests: one formatter would remove the drift.

### 9.2 Steps, rounding and plates

- No plate calculator, no per-side plate breakdown and no bar-and-plates picker exist in the logger. The store records the rule: "D57: the plate calculator never reappears" (`STORE:2362-2371`); the plate-maths module was deleted under D95 and only `DEFAULT_BAR_KG` survived (`lib/warmupRamp.js:49-53`).
- The weight stepper moves by `exercise.incrementKg`, else `defaultIncrement(weight, units, category)`: compound 2.5 kg from 60 kg else 1.25; isolation 1 kg from 20 kg else 0.5; accessory 1.25 from 40 kg else 0.75 (AWS:5093-5094, `lib/algorithms.js:430-439`). It clamps to 0..500 and rounds to 2 dp (SE:87-98).
- The live resolver's own load step is the same default, capped at 5 percent of the load, snapped to 0.25 kg with a 0.25 kg floor; a kettlebell instead moves to the next bell on a 4 kg cast ladder (`lib/livePrescription.js:168-192`, `:88-130`). Every resolved load goes through `roundQuarter` (`lib/livePrescription.js:80-82`, `:1097`).
- Readiness easing (x0.95) and the layoff factor (x0.9) trim a load downward and floor it to 0.25 kg, not to the stepper's grid (`lib/livePrescription.js:200-205`, `:955`, `:1076-1090`, `lib/sessionAdjustments.js:640-657`). Suggests: a trimmed load such as 78.25 kg is not reachable with a 2.5 kg plate pair on a barbell. Unverified: how often a user sees one.
- The warm-up ramp rounds to 2.5 kg whatever the exercise's own step: the screen passes only `isBarbell` and `barKg`, so `roundKg` stays at its default (AWS:5728-5731, `lib/warmupRamp.js:55`). It ignores load semantics and is offered for `weight_reps`, `weighted_bodyweight` or an unset type only (AWS:5941).
- Bar weight is `barWeight` from the store (default 20, read-only at runtime) else `DEFAULT_BAR_KG` 20; a "barbell" is any exercise whose `equipment` text matches `/barbell/i` (AWS:221, AWS:5686-5687, `STORE:2362-2371`). Suggests: an EZ bar or trap bar tagged "Barbell" would be offered the 20 kg empty-bar row. Unverified: how the library tags those.

### 9.3 Bodyweight, assisted, per-hand and added loads

- A bodyweight exercise is one whose `equipment` text matches `/body\s*weight/i`; it may be logged with no weight (`lib/workoutHelpers.js:81-85`, `:127-137`). `reps_only` and `duration` skip the weight check altogether (`lib/workoutHelpers.js:128`). The cluster and per-side starts repeat this check inline instead of calling the validator (AWS:3501-3506, AWS:3615-3620; 13.8).
- The logger never reads the user's own bodyweight for any calculation: the only bodyweight references in AWS are the equipment regex (AWS:3501, AWS:3615). Tonnage counts only the entered number, and the assisted case is excluded on purpose because counting bodyweight minus assistance "would pull the user's bodyweight into training analytics, which is ED-adjacent and out" (`lib/algorithms.js:165-170`).
- Tonnage (the end-of-session figure): weight x reps over every set that is not a warm-up, so drop sets, myo-reps and rest-pause count; `per_hand` doubles the entered weight; `assisted` counts zero; `added_bodyweight` counts the added load only; distance and duration exercises are excluded when a type map is passed (`lib/algorithms.js:157-244`, `:226-235`). The finish report passes both maps (AWS:3832-3841, `lib/sessionReport.js:158-173`).
- Assisted work inverts the record rule: the lowest assistance wins with reps as the tie-break, no estimated max is computed, and the types are `least_assistance` and `most_reps_at_weight` (`lib/algorithms.js:524-560`, `lib/workoutRecordLine.js:78-81`, `:98-104`). On routine-backed entries `loadSemantics` is undefined at the logger, so both the live record line and the on-log detector take the non-assisted branch (AWS:4422, AWS:2990-2991; 13.1).
- Load meaning also changes the weight label ("per hand", "Assistance", "Added weight") (SE:74-80); with `loadSemantics` undefined it always reads "Weight (kg)" (AWS:5092, 13.1).

### 9.4 e1RM, records and volume counting

- Estimated max: `calculate1RM` returns the weight at 1 rep, clamps reps at 20, and uses 0.6 x Epley + 0.4 x Brzycki for 10 reps or fewer, Epley alone above 10 (`lib/algorithms.js:104-143`; Epley = w(1 + r/30), Brzycki = w/(1.0278 - 0.0278r)).
- Record types the logger can award: `1rm_estimate` (more than 0.1 percent over the best estimate), `heaviest_weight` (strictly above the heaviest), `most_reps_at_weight` (same weight within 0.1, only when a prior set exists at it), and the assisted pair; warm-up, myo-reps, rest-pause and ballistic rows never qualify (`lib/algorithms.js:472-484`, `:506-640`, `lib/workoutRecordLine.js:68-77`). Gating before the call: weight-based exercise types only, never a warm-up, only when history exists (AWS:2990-2992; section 6).
- Set-count rules differ by purpose, and all three are in play in one session:
  - target progress ("Set 2 of 4", "Target reached", outline counts) ignores warm-ups and drop sets (`lib/workoutHelpers.js:15-20`, AWS:4278-4280);
  - the finish report's "working sets" ignores warm-ups only, so drop sets count (`lib/algorithms.js:246-267`, AWS:3832-3841);
  - the mini bar counts every set including warm-ups and drop sets (`MB:56`, `MB:80`, `MB:94-96`).
  The algorithms comment calls the drop-set choice "a separate product decision" (`lib/algorithms.js:246-254`). Listed in 13.6.
- Set numbers are stamped within their own kind (warm-ups 1, 2; others 1, 2, 3, drop sets included) (`lib/workoutHelpers.js:33-37`, AWS:2820). The watch-event path numbers with `countProgressSets + 1` instead (`STORE:1679-1756`; 13.2).

### 9.5 Time-based and distance sets

- A timed set (`duration`) is one `mm:ss` field; the seconds are stored in the `reps` column, clamped 0..5999, stepper +/-5 s, keyboard `numbers-and-punctuation`, Done logs the set (SE:297-345, SE:130-136, `lib/workoutHelpers.js:88-104`).
- A distance set has a distance field (weight column, up to 5 digits typed, but the stepper clamps to 500) and a `mm:ss` time field (reps column) (SE:347-441, SE:90, SE:377). Mixed limits: typing 800 is accepted, then pressing "+" snaps it to 500.
- Neither type gets a record line, a record detection, a tonnage contribution or an estimated max (`lib/workoutRecordLine.js:68-77`, AWS:2990, `lib/algorithms.js:157`); the NowCard "Last session" row ignores the type and prints `{weight}kg x {reps}` (AWS:5044-5051). Suggests: a timed hold would read "0kg x 45", a distance set "{metres}kg x {seconds}" and a reps-only set "0kg x 12" there. Unverified on device.
- The rest timer, targets and prefill treat these types as history-only: the resolver returns no weight and the lower rep band for `duration` and `distance` (`lib/livePrescription.js:1005-1026`, section 3.2).

---

## 10. State and performance

### 10.1 What lives where

- Component state (AWS:316-6435): 63 `useState` and 41 `useRef`. The live entry box `currentSet` (AWS:409), the current exercise's rows `loggedSets` (AWS:432), history `prevSets` and `allTimeSets` (AWS:416-417), edit state (AWS:436-437), every sheet, modal and banner flag (AWS:554-578, AWS:577-604), cluster and per-side state (AWS:503-531), shorten-session and starter state (AWS:616-622), the typed note (AWS:485), elapsed seconds (AWS:461).
- Store (`STORE`): the session itself, which survives leaving the screen: `activeWorkout`, `workoutExercises` (each entry with its `sets`), `currentExerciseIndex`, `workoutStartTime`, `lastActivityAt`, `sessionAdjustments`, `sessionPRs`, the rest-timer fields and the workout prefs (`STORE:193-247`, `STORE:1476-1484`, `STORE:1579-1670`, `STORE:1946-2157`). Screen reads use one `useShallow` selector (AWS:326-361) plus a boolean `restTimerActive` selector chosen so the 1 Hz rest countdown never re-renders the screen (AWS:363-367); the elapsed-time state re-renders it every second regardless (10.4).
- SQLite: the truth for sets. Written before the UI updates (AWS:2822-2859); read on every exercise change and at finish (10.5).
- AsyncStorage: the session snapshot (`STORE:193-247`), the per-exercise set draft (AWS:2738-2765) and "seen once" flags (AWS:2019-2020, AWS:2202, AWS:2243-2251).

### 10.2 One logged set lives in four places

- A logged set is held as a SQLite row (AWS:2822-2859), as `entry.sets` in the store (`addSetToCurrentExercise`, AWS:2883-2885, `STORE:1623`), as `loggedSets` in component state (AWS:2883) and as `sessionSetsRef` (AWS:686, AWS:2985). Edits and deletes must touch all four by hand (AWS:3363-3372, AWS:3459-3471).
- The component copy is rebuilt from the store entry on each exercise change (AWS:2518-2519); the store entry is rebuilt from the snapshot on restore (`STORE:1848-1876`). The store and UI shape (`setData`) omits note, `entry_typed`, `is_amrap`, `failed` and the target band that SQLite holds (AWS:2861-2881 against AWS:2822-2859).
- `sessionSetsRef` is write-only now: appended at AWS:2985 and trimmed at AWS:1588, AWS:1866, AWS:2435, AWS:3372, AWS:3471, but PR history is built from `loggedSets` (AWS:2975-2983). Its declaration comment and the PR comment still describe it as the PR source (AWS:686, AWS:2921-2923). Listed in 13.9.

### 10.3 Render structure

- Root: `SafeAreaView` (top edge only) > `KeyboardAvoidingView` (padding on iOS, none on Android) > header, outline, one `ScrollView`, then the bottom chrome block (AWS:4494-4533, AWS:5277-5309).
- The workspace is a plain `ScrollView` of 1 exercise, not a list: the current exercise's logged rows, Now card and upcoming rows are all mounted; other exercises are not rendered in it, so mounted size is bounded by one exercise's sets (AWS:4533, AWS:4919-5230). Only the swap list uses `FlashList` (AWS:6320); the outline's expanded list is a small `ScrollView` capped at 6.5 rows (WO:178).
- The module is loaded lazily on first render (`lazyScreen`, `RN:69-79`, `RN:90`): the 7,170-line file, its frozen `StyleSheet` and 43 deferred `require` calls evaluate on first open, not at app start.
- Sheets and modals are mounted inline in AWS and shown by flags: `BottomSheet` for the set-type, warm-up, overflow, reorder and info sheets, and raw `Modal` for the swap list, the group and per-side walkthroughs, the stale prompt and the discard prompt (AWS:5328, AWS:5463, AWS:5565, AWS:5620-6258, AWS:6258, AWS:6394).

### 10.4 What re-renders, and when

- Once per second the whole component re-renders: `setElapsedSeconds` runs from a 1000 ms interval for the life of the screen (AWS:2264-2298; skipped under Jest, AWS:2272-2277). Each render also rebuilds the live-theme style map, 139 keys of object spreads, with no `useMemo` (AWS:402, AWS:7016-7170).
- The 4 memoised derivations do not depend on elapsed time: the evidence packet (AWS:1220-1241), the circuit round (AWS:4291), the per-position prescriptions (AWS:4327-4339) and the record line (AWS:4408-4427). Everything else, including roughly 1,940 lines of JSX (AWS:4494-6435), is re-evaluated each tick.
- Memoisation that exists is defeated. `LoggedSetRow` is wrapped in `React.memo` (LSR:46) but receives `onSaveEdit={handleSaveEditedSet}` and `onDeleteEdit={handleDeleteEditedSet}`, plain inner functions with a new identity each render (AWS:3344, AWS:3435, AWS:4963, AWS:4965), so every visible logged row re-renders every second. `SetEntry` is wrapped in `memo` (SE:518) but sits inside `NowCard` (a plain function component), which passes `onSubmitComplete={handleCompleteSetPress}`, also recreated each render (AWS:3528, AWS:5090). Only 8 `useCallback` exist in the file (AWS:372, :737, :897, :2260, :3301, :3317, :3332, :4429). Unverified: the cost on a mid-range Android, since nothing here was run.
- Per keystroke or stepper press: `setCurrentSet` re-renders the whole screen (AWS:4429-4432), `buildRecordLine` runs `detectPR` over all prior working sets for the exercise plus today's (AWS:4408-4427, `lib/workoutRecordLine.js:68-171`), and a 250 ms draft timer is reset (AWS:2749-2752). Suggests: negligible at hundreds of history rows; `getAllCompletedSetsForExercise` is unbounded (`DB:4487`).
- `progressNum` for each visible logged row re-counts `loggedSets.slice(0, i + 1)` and `loggedSets.indexOf(s)` is called per row, so the list is O(n squared) per render (AWS:4949-4955). Small n; noted for completeness.
- While a rest runs, a second 1 Hz source ticks: `RestTimer` calls `tickRestTimer` every 1000 ms (RT:123), and `instrumentStore` wraps every store action in a breadcrumb call, so each tick emits an `action.store.tickRestTimer` breadcrumb (`STORE:2500-2509`, `lib/observability.js:383-424`). Unverified: whether this crowds out other breadcrumbs in Sentry.

### 10.5 Reads and writes on the hot paths

- Logging one set, in order: SQLite insert awaited (AWS:2822); store mutation with a whole-session JSON write to AsyncStorage (`STORE:1623`, `STORE:193-247`); `setLoggedSets` (AWS:2883); PR detection over in-memory history, re-reading it from SQLite only if it had not landed (AWS:2942-2990); the next-set resolve (AWS:3068-3117); `updateLastActivity` (AWS:3121); rest start, which calls the OS notification scheduler and the Live Activity or Android service bridge (`STORE:1946-2000`); two or three `audit()` events (AWS:2692, AWS:2770, AWS:2895); and a re-run of the draft and notification effects.
- On each exercise change (`loadHistory`, AWS:2433-2730): `getLastNWorkoutSets(ex, workoutId, 3)` (AWS:2473), the unbounded `getAllCompletedSetsForExercise` (AWS:2475), up to 3 sequential `getWorkoutById` calls (AWS:2488-2501), `stampCapabilityConstrainedSessions` (AWS:2508-2509), the current mesocycle week, programme position and, in a deload week, the week-1 sets and a deload prescription (AWS:2538-2573), then a draft read (AWS:2704).
- Opening swap: `getAllExercises()` (cached in memory after the first call, `DB:3421-3445`) then `rankSwaps` over the whole library and `rankPersonalised` with a programme-facts read and an intent-state read (AWS:1603-1660).
- At finish: one read of every set in the workout, a report build, a workout update, then a push of the workout and all its sets (section 7.3, AWS:3810-3963).

### 10.6 The file itself

- 7,170 lines: component 6,120 (AWS:316-6435), frozen styles 560 (AWS:6442-7001), live map 155 (AWS:7016-7170). About 31 percent of lines are comments, many of them dated rulings and audit ids; the screen has no TODO, FIXME or console call (grep).
- The largest units: `handleCompleteSet` about 510 lines (AWS:2777-3285), `handleFinishWorkout` about 480 lines (AWS:3787-4263), the load-history effect about 300 lines (AWS:2433-2730), and the render about 1,940 lines (AWS:4494-6435).
- 35 inner functions, 18 `react-hooks/exhaustive-deps` suppressions and 43 lazy `require` calls inside handlers and effects (counted by grep over AWS). Suggests: the suppressions mark the places where a handler closes over state that the effect does not list; each is a potential stale read, none was audited here.
- Children already split out: header, outline, status strip, Now card, logged row, bottom bar, empty view, set-row menu (`components/workout/`). Still inline: every sheet and modal body, the cluster and per-side banners, the status-chip builder, the deload and target banners, the swap list and all orchestration (AWS:4640-4905, AWS:5110-5230, AWS:5328-6435).
- The screen re-exports `LoggedSetRow` for tests (AWS:286).

---

## 11. Look and feel, as coded

Everything below is read from code. There is no device or simulator here, so no pixel, frame-rate or feel claim is made; sizes are token arithmetic and marked as such.

### 11.1 Tokens in use, and every hard-coded value

- Colours: no hex or rgba literal in any logger file (grep: 0 in AWS, `components/workout/*`, SE, RT, PRC, MB, EPM). Colours come from the frozen `colors` import and from `useTheme().colors` (AWS:12-13, AWS:401). Dark default: background `#0D0D0D`, surface `#191917`, surface2 `#2A2A27`, surface3 `#343431`, border `#6E6E6E`, borderSubtle `#2E2E2C`, amber `primary #F5A623`, `primaryFill #E08C0B` (`styles/theme.js:47-63`). Light, higher-contrast and colour-blind variants layer on top (`theme.js:223-330`, `resolveTheme` at `theme.js:470-500`).
- Alpha: 12 `withAlpha` sites; 6 use literal 0.502 or 0.251 instead of the tokens `alpha.half` (0.5) and `alpha.edge` (0.25) (AWS:6750, :6764, :6974, :7081, :7085, :7163; `theme.js:766-774`).
- Type: always a role from `type.*` (`theme.js:627-700`): label 13 px, caption 11, bodySm 13, body and bodyStrong 16, title 17, overline 11 uppercase, h3 20. Numerals use `type.num(role)` (tabular): set values (SE:600-606), logged rows (LSR:223), timers (WHD:136, RT:556). Only literal: `lineHeight: 16` on the swap list's reason and tag lines (AWS:6616, AWS:6618).
- Spacing and radius: tokens throughout (`theme.js:413-436`): the screen gutter is `spacing.lg` 16 (AWS:6523), every small surface is `radius.md` 10, sheets and buttons `radius.lg` 16.
- Icon sizes are not tokenised in practice: AWS has 42 literal `size={n}` props (18 x13, 16 x11, 14 x5, 20 x4, 11 x3, 24 x2, 15 x2, 32 x1, 13 x1) against 2 `iconSize` token uses; SE has 10 literal 20s; the other logger components add 12, 13, 14, 15, 16, 18, 22, 24 and 64 (`styles/theme.js:913-918` defines only 16, 20, 24, 32).
- Hard-coded layout numbers (no token): swap item icon 32 (AWS:6605-6606), reorder chevron 28 (AWS:6864), superset pair chip 22 and connector 2 x 14 (AWS:6930-6933), upcoming row 26 and number 22 (AWS:6815-6818), fold toggle 28 (AWS:6824), outline strip 44 and dots 8 and 7 (WO:255, WO:274-275), prefill row 36, quiet prefill 20, note input 60, note toggle 28 (NC:286-303), record row 36 and label width cap 100 (SE:575, SE:543), rest readout min width 44 and done strip 36 (RT:562, RT:613), save button 96 (LSR:236), bottom-chrome ceiling 320 (AWS:291), Android bottom-inset floor 48 (AWS:720).
- Sizing tokens that do exist (`styles/layout.js:12-39`): touch target minimum 48; header action, overflow and primary-action targets 48; logged-set row 36 (a documented exception); number badge 22; label column 96; stepper button 36; compact sheet option 52.

### 11.2 Visual hierarchy

- Logged row: one line, 36 dp minimum, 13 px tabular text in textPrimary, a 22 dp `surface2` number badge (11 px bold) or a flame glyph for a warm-up, and a trailing chevron. No border, no card since phase 2B. Warm-ups tint the row with the warning background and colour the text (LSR:204-224, LSR:166-180).
- Now card: line 1 is the position and target at 16 px ("Set 2 of 4" in bodyStrong, " - 8-12 reps" in body, textSecondary) (NC:104-124); an optional 11 px context line with a 14 px icon (NC:127-152); an 11 px prefill row on `surface2` with a hairline ("Last session: 80kg x 8" plus a "Use" cue) (NC:155-185); then 13 px labels over 16 px tabular values in 36 dp stepper boxes with amber glyphs (SE:274-295, SE:582-606); then a 28 dp "Add a note" row (NC:201-239).
- The previous-session reference, the one fact a lifter checks before each set, is the smallest text on the card (11 px caption, NC:164-167) while the entry values are 16 px.
- Card edge: `borderSubtle` (#2E2E2C on #191917), turning amber for 700 ms after a log (NC:96-101, AWS:2905-2907); the stepper boxes carry the brighter `border` (#6E6E6E) (SE:582-591).
- Exercise name: `type.label` 13 px semibold (AWS:6559), smaller than the Now card's first line and the set values (both 16 px). The comments record two founder orders that stepped it down to stop it overpowering the outline strip (AWS:6544-6559).
- Primary action: "Log set" is a `Button` variant `primary`, size `lg` (charcoal `surface2`, `border`, white semibold label); `primaryIcon` is never passed, so the button carries no amber glyph, although `Button.js:9-25` says a primary is marked by "the amber glyph, not fill" (WBB:136-146, AWS:5291-5309). "Next exercise", "Finish workout" and "Log other side" use the same style, and amber's `emphatic` fill variant is not used on this screen (WBB:102-146).
- Where amber does appear: stepper +/- glyphs (SE:169-442), the header Finish tick (WHD:98-102), the outline's top rule, chevron, progress line and current dot (WO:131, WO:156, WO:169, WO:212), "+15" and the drain bar on the rest strip (RT:589-606), the auto-advance countdown fill (WBB:118-130) and the PR toast (PRC).

### 11.3 Density (computed from tokens, not measured)

- Pinned top chrome: header 65 dp (48 target + 2 x 8 padding + 1 border; WHD:110-128, `layout.js:30`) plus the collapsed outline 49 dp (2 + 44 + 2 + 1; WO:253-263). Pinned bottom chrome: action bar at least 79 dp (12 + 54 + max(12, inset + 8) + 1; WBB:153-160, WBB:82-84, `Button.js:85`, `:152-153`) plus the rest strip 51 dp while resting (48 + 2 + 1; RT:534-546, RT:596-600). So 114 dp above and 79 dp below when idle, 130 dp below while resting, before status and navigation bars.
- Scrolling workspace: 8 dp top padding and an 8 dp gap between blocks (AWS:6523); exercise header row 48 dp (AWS:6533); each status chip row 48 dp and chips wrap (the `StatusStrip` chip `minHeight` is `primaryActionMinHeight`, SS:78); each logged row 36 dp plus a 6 dp gap (AWS:6807, LSR:211); an upcoming row 26 dp (AWS:6813-6817).
- Now card height: 138 dp without a prefill row (8 padding + 2 border + 36 position row + 4 gap + 56 stepper pair + 4 gap + 28 note row) and 178 dp with one; a context line, a record callout (36 dp plus 8) or an open note box (60 dp input) add to it (NC:252-304, SE:521-575).
- Folding: from the third logged set the earlier rows collapse behind one 28 dp toggle and only the latest row (AWS:4919-4945), so the Now card stops moving down at about 70 dp of logged content; before that it moves down 42 dp per set.
- Example (arithmetic only): in a 700 dp window the workspace is 507 dp when idle (700 - 114 - 79); less 8 + 56 for the top padding and exercise row and 178 + 8 for the card, about 257 dp remain, room for 6 unfolded logged rows at 42 dp. With a rest running (51 dp more) about 206 dp remain, 4 rows. Unverified on any real device.

### 11.4 Iconography

- Ionicons only (`@expo/vector-icons`), mostly the outline set, about 40 distinct glyphs across the logger files: close, checkmark-done (header), ellipsis-horizontal (overflow), chevrons, flame-outline (warm-up), swap-horizontal (swap and group focus), link and repeat (superset and circuit), trophy (record), timer and time-outline (elapsed, stale), trash-outline, create-outline, shield-outline (limitation), battery-charging-outline (recovery), bulb-outline (coach note), flash-outline (starter), body-outline (constraint) (AWS:4645-4877, WHD:56-104, NC:104-239, SE, EEV).
- Status chips take their icon from a per-chip `icon` field (AWS:4646, :4677, :4699, :4719, :4751, :4782, :4830, :4877; SS:36-52). Sizes: see 11.1.

### 11.5 Animation and haptics, complete inventory

- Animations: log flash on the Now card, 700 ms (AWS:2905-2907); `AnimatedRow` on every logged row, fade-rise in 320 ms with a 30 ms stagger capped at 8, fade out 220 ms, siblings glide 200 ms (AWS:4951, `components/AnimatedRow.js:33-42`); info-tip pulse on the overflow glyph, scale 1 to 1.35 and back at 750 ms, first use only (AWS:2201-2216, AWS:4619-4624); auto-advance countdown bar, 1800 ms, JS-driven (`useNativeDriver: false`) (WBB:57-74, AWS:3174-3201); rest drain bar and an amber-to-warning shift near the end (RT:416-436); modal fades and slides (AWS:5331, :5466, :5565, :6258, :6394); PR toast animation (PRC, 19 `Animated.` uses); mini bar (5 uses); scroll to top 50 ms after a jump (AWS:1328-1340).
- Reduce Motion (OS or in-app) is honoured by: `AnimatedRow` (plain `View`), the pulse (skipped), the countdown (static full bar), every modal `animationType` (`none`), the rest drain, the PR toast (calmer variant) and all haptics (`components/AnimatedRow.js:33-35`, AWS:2205, WBB:64-72, AWS:5331, RT:421, PRC, `lib/haptics.js:30-33`).
- Haptics fired by the logger (`hapticsVocab`): `setLogged` (Light impact) on a set, a cluster start, a mini-set, per-side side one, an edit save, and a prefill "Use" tap (AWS:2812, AWS:3414, AWS:3513, AWS:3560, AWS:3633, AWS:5032, AWS:5047); `warmupLogged` (selection) (AWS:2811); `selection` on 10 navigation and toggle actions (AWS:1319, :1354, :1421, :1446, :2109, :2179, :4928, :5639, :5710, :5749); `commit` (Medium) on Undo shortening (AWS:3667); `error` (Warning) on "Shorten session" (AWS:3784); `workoutComplete` at finish (AWS:3976); the rest strip adds a 3-2-1 ladder and a rest-done pattern (RT, section 4.4); the PR toast adds a PR pattern or a gentle tick (PRC).
- Double tick: the "Log set" `Button` is variant `primary`, which fires `haptics.selection()` as its press handler runs, and `handleCompleteSet` then fires `setLogged` (`Button.js:200-202`, AWS:2808-2812). Suggests: a normal set log gives two haptic events a few ms apart. Unverified on device.
- Under Reduce Motion every haptic is silent, including the set-logged confirmation. The file's own header says whether haptics should follow motion "is an open founder/lead decision" (`lib/haptics.js:12-23`, `:83-97`).

### 11.6 Dark and light, and the dual style system

- Two style systems run side by side: a frozen `StyleSheet.create` block built from the module-level `colors` and `type` at import (AWS:6442-7001), and a "live" override map built from `useTheme()` on every render and appended after the frozen style in 215 style arrays (AWS:401-402, AWS:7003-7170; 215 `live.` references by grep). The pairing makes theme, higher-contrast and larger-text changes apply to the mounted screen without a restart; the test that pins this mounts only `LoggedSetRow` (`screens/__tests__/cp10Stage3WorkoutShellsLiveTheme.test.js:146`).
- The same map is written out three times, not shared: `buildLiveStyles` exists separately in AWS (AWS:7016), `LoggedSetRow` (LSR:247) and `EmptyExerciseView` (EEV:155); the AWS header comment says one shared function serves all three scopes (AWS:7003-7015). Section 13.9.
- The newer components (header, Now card, bottom bar, outline, status strip) skip the map and read `useTheme()` inline for colours (WHD:49, NC:68-100, WBB:56-84), so the logger family now uses two theming idioms (frozen plus live map, and inline live tokens). Both are live.
- `largerText` multiplies every `fontSize` token by 1.2 (`theme.js:480-491`); fixed heights in the logger use `minHeight` for rows but `height` for the outline strip (44) and outline rows (36) (WO:255, WO:266). Unverified: how those clip at large text.

### 11.7 Accessibility, as coded

- Labels and roles: 51 `accessibilityLabel` and 35 `accessibilityRole` in AWS; 17 labels and 10 hints in SE ("Hold to keep adjusting" on every stepper) (SE:166-440). Set rows speak "Edit set 2: 80kg × 8" (LSR:139-143); the Now card speaks position, target and "tap to change set type" (NC:109-110).
- Announcements: "Set N logged, W kg, R reps", "Warm-up set logged", "Set updated", "Next exercise in a moment", "Superset: now X" (AWS:2914-2917, AWS:3200, AWS:1344-1360). The rest timer is not a per-second live region; it speaks the start and the end only (`__tests__/p9Talkback.guard.test.js`).
- Screen readers: the outline's 5 s auto-collapse is suppressed when one is on (WO:64-67); the group-focus line is hidden from the tree because it is announced instead (NC:127-133).
- Hit targets (visible size plus `hitSlop`, computed): header X and Finish 48 (+8); overflow 48; stepper buttons 36 (+8); Now position row 36 (+8 top, +4 bottom) = 48; logged row 36 (+4 each side) = 44; prefill row 36 (+4) = 44; note toggle 28 (+8) = 44; outline strip 44 (+4) = 52; outline row 36 (+2) = 40; history fold 28 (+4) = 36 (WHD:60, :98; NC:108, :160, :232; LSR:161; WO:148, :200; AWS:4929). Against `touchTarget.minimum` 48 (`layout.js:13`), 5 targets fall under it by the computed figures.
- Dynamic type: `allowFontScaling` is left at its default everywhere; only the rest readout caps scaling (`maxFontSizeMultiplier` 1.15, RT:491, RT:493).
- Keyboard: numeric pads for weight and reps, Done on reps logs the set, an iOS Done bar above the keypad, an 8 s idle dismiss (SE:50-67, SE:244-249, SE:497-513). Android has no drag-to-dismiss on this screen by design (AWS:4561).

### 11.8 Platform differences in the experience

- iOS: `KeyboardAvoidingView` padding, keyboard Done bar, no long-press menu on logged rows (the menu crashed iOS), Core Haptics patterns for records and rest end, Live Activity for the rest, `interactive` keyboard dismiss (AWS:4495, AWS:4561, SE:497-513, `components/workout/SetRowMenu.ios.js`, `lib/haptics.js:36-97`, `STORE:1946-2000`).
- Android: no `KeyboardAvoidingView`, no drag-to-dismiss, a long-press menu (Edit set, Delete set) on logged rows, a 48 dp bottom-inset floor, the shortService foreground chronometer plus alarm cues for the rest (AWS:4495, AWS:720, `components/workout/SetRowMenu.js`, RT:160-250, section 4.5).

---

## 12. Copy

### 12.1 How tone was judged

- Yardstick (brief): `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` and the project voice rule "calm, plain, no shame, no guilt, no clipped commands" (`CLAUDE.md` section 3). The voice document is written for coaching-engine output, so applying it to a logger button label is an extension; every tone note below is labelled Suggests.
- Rules used: mirror data, never infer state (voice doc, pattern 3, line 140); rationale attached (pattern 6, line 156); no motivational filler without a data referent (pattern 9, line 170); the honesty test, "would this sentence still be true if the user did nothing but kept logging" (section 1, pattern 8); no fake autonomy on locked decisions (pattern 15, line 199); and the failure catalogue ("you should / you must", "crush", "streak broken / you missed a day", `COACHING_VOICE_SYNTHESIS_LOCKED.md:577-595`).
- Em dashes: the lint forbids them in user-facing copy; the logger uses " - " (spaced hyphen) as its separator and an en dash for skipped outline counts (WO:237). Not re-linted here.

### 12.2 String families on the screen

A. Position, target and previous-session lines
- "Set 2 of 4 - Working", "Warm-up - Set W1", "Light set 2 - Easy" (deload week), "Round 2 of 3 - Circuit", then " · 8-12 reps" (AWS:4370-4393, AWS:5082).
- Prefill row: "Last session: 80kg x 8" with a "Use" cue; "Recovery week - 60kg x 8" in a held recovery week; first-ever set: "First time on this lift. Pick a weight you could lift about 12 times, with a couple in reserve. It is saved for next time." (AWS:5025-5076, NC:155-185).
- Warm-up context line: "Warm-up - not counted in your totals." and, the first time, "Light weight, easy reps; tap Log warm-up when you're ready to work." (AWS:5000-5006).
- Record callout: "New PR if you complete this set" plus reasons "Heaviest weight yet · Previous best 80kg", "Most reps at 80kg · Previous best 8 reps", "Est. max ~104kg · Previous best ~101kg", "Least assistance yet · ..." (`lib/workoutRecordLine.js:142-168`).

B. Entry labels and validation
- Labels: "Weight (kg)", "Weight (kg, per hand)", "Assistance (kg)", "Added weight (kg)", "Reps", "Time (mm:ss)", "Distance (m)"; notes "Add a note", "Add a note for this set", "Remove note" (SE:74-80, SE:303, SE:355, NC:201-239).
- Alerts: "Enter reps / Please enter the number of reps completed."; "Enter weight / Enter the weight used (in kg) before completing this set."; "Enter time / Please enter the duration for this set."; cluster and per-side variants "Enter your activation set reps first.", "Enter the mini-set reps.", "Enter the reps to do on each side." (`lib/workoutHelpers.js:104-145`, AWS:3498-3555, AWS:3612-3618).
- Set save failure: "Couldn't save set. Your set wasn't saved. Tap Log set to try again. If it keeps happening, please contact support." (the label follows the primary button) (AWS:3278-3281); edit failure "Couldn't save changes. Your edit was not saved. Tap Save to retry. If this keeps happening, tell us from Settings > Help." (AWS:3426-3429); delete "Delete set? This set is removed and your session totals update. This cannot be undone." and "Couldn't delete set. That set couldn't be removed. Please try again." (AWS:3437-3450).

C. Set types
- "Working / Counts towards your weekly volume and progress tracking."; "Warm-up / Lighter sets before your main work. Not counted in your weekly volume."; "Drop set / Reduce the weight once you can't do any more reps, then keep going. ..."; "Myo-reps / A heavy activation set, then short mini-sets with a few breaths between. ..."; "Rest-pause / Go until you can't do any more reps, rest 10 to 20 seconds, then squeeze out more reps. ..."; "AMRAP / As many reps as possible, usually the last set. ..." (AWS:225-232); sheet title "Set type" and the explainer "Pick how this set was done. Working sets and intensity techniques count towards your training; warm-ups do not. This helps Volyume read the session correctly." (AWS:5623-5632).
- Warm-up ramp sheet: "Empty bar" row, "No working weight yet. Start with the empty bar, then set your working weight and come back for the rest of the ramp. ...", "Set your working weight on the set card and your warm-up sets appear here. ...", "This is light enough to start at 40 kg. You can begin with your working set today.", "Working up to 80 kg. Choose a warm-up set to load it, then tap Log warm-up. ..." (AWS:5668-5760).

D. Banners, chips and one-line notes
- Chips: "Starter session" with a "Full session" pill; "Circuit · Round 2 of 3 · with A and B" and "This station missed a round."; "Superset - alternates with X"; "Avoided pattern" ("Avoiding X until 12 Oct", "... for this block", "Avoiding X") with a "Swap" pill; "Limitation" or "Temporary change" with "Swap"; "Coach note" with More or Less and "Got it"; "Recovery" with "Block finished", "Recovery-adjusted session" or "Recovery week" and "Holding at recovery-week volume until you choose your next block" or "Lighter on purpose. Full recovery, no PRs."; "Target met / Target reached: 4 working sets done" (AWS:4640-4905, AWS:962-975, `lib/circuitRound.js:56`).
- Quiet lines: "One exercise is left out of this session while your change lasts." / "N exercises are left out ..." (AWS:4511-4516); "Volyume counts this one side at a time, matching the side you set." (AWS:4907); starter message "Short version of Push A: 4 exercises, 2 sets each. The full session starts next time." and shorten message "Rest cut by 30%. X removed to fit your time. Estimated session: 24 minutes." (`lib/whyThisTemplates.js:254-284`).
- Per-side banner: "Side one logged", "6 reps @ 40kg - same on your other side", "Rest, switch sides, then tap Log other side." or "Switch sides when you're ready, then tap Log other side.", "Cancel set" (AWS:5110-5134). Cluster banner: "Myo-reps cluster", "12 + 4 + 3 = 19 reps @ 20kg", "Mini-set reps", "Mini-set", "Finish cluster", "Cancel" (AWS:5136-5185).
- Readiness copy (lib): "Rough night: one set fewer on each lift today keeps quality up.", "Low energy today: one set fewer on each lift keeps quality up.", "Feeling below par: ...", "Suggested loads are a little lighter so every rep stays controlled.", "Welcome back: one set fewer on each lift today keeps quality up." (`lib/sessionAdjustments.js:645-649`, `:753`). The "sharp" acknowledgement exists but is never shown (`lib/sessionAdjustments.js:655`).

E. Rest
- Strip: "Rest", the countdown, "-15", "+15", "Skip", and "Start next set" when done; spoken "Rest timer started" and "Rest over. Start your next set." (RT:314, RT:360, RT:451, RT:489-521). First rest only: "Rest started because you logged a set. Adjust with the buttons, or skip it." (AWS:5284). OS alert: "Rest done / Next set when you're ready." (`lib/notifications/restEnd.js:61-62`).

F. Records
- Toast titles "First lift logged", "New estimated max lift", "New heaviest weight", "Most reps at weight" with the record label as the value line ("80kg x 8 logged as your starting point" for a first lift); spoken "Personal record. {title}: {label}." (PRC:127-245, AWS:3005, `lib/algorithms.js:577`, `:592`, `:606`).

G. Finish, discard and end-of-session
- "Finish workout? / You've logged 12 sets across 4 exercises." with "Keep going" and "Finish workout"; "Finish {session} here? / The work you've logged will still count. The exercises you didn't do won't be logged as completed, and Volyume will move on from this workout." with "Keep going" and "Finish for today"; "Nothing logged yet / This workout has no sets logged, so there is nothing to save." with "Keep going" and "Discard workout"; failure "Couldn't finish workout. Your sets are still saved, but the workout did not close on your device, so tap Finish workout again." (AWS:4124-4262, `lib/blockProgression.js:399-408`).
- Discard modal "Discard workout? / This will delete the current workout session. Your plan will not advance." with "Keep training" and "Discard workout" (AWS:6394-6420); stale prompt "Resume workout? / This workout has been inactive for a while. What would you like to do?" with "Resume", "Finish workout", "Discard" and a second confirm "Discard workout? / All logged sets will be lost." (AWS:5565-5600); remove exercise "Remove exercise? / Remove {name} from this session. Your plan is not changed." and "Cannot remove / This is the only exercise in your session." (AWS:1466-1471); discard failure toast "Couldn't discard this workout, try again" (AWS:1974).

H. Overflow, help and walkthroughs
- Rows: "Swap exercise", "I can't do this", "Add exercise", "How logging works", "Reorder exercises", "Log per side" / "Logging per side" ("One side, then the other. Still counts as one set."), "Warm-up sets" ("Suggested light sets up to today's working weight."), "Pair as superset" / "Unpair superset", "Shorten session" ("Shortens the rest of today's session to fit the time you have left. Undo any time."), "Undo shortening", "Remove exercise" (AWS:5774-6022).
- "Can't do {name}? / Volyume will swap it for another exercise that works the same muscle group. Choose whether that is just for today, or from now on." with "Just for today" and "From now on" (AWS:5810-5833). "How logging works / A rep is one full repetition ... A set is a number of reps ... Enter weight and reps, then tap Log set when done. Use exercise options for form tips, warm-ups, swaps and session settings." (AWS:5864-5867, `lib/coachGlossary.js:104-107`).
- Walkthrough modals: "Superset coming up", "Giant set coming up", "Circuit coming up" with four steps ("Set up every station now if you can.", "Do all reps of the first exercise.", "Move straight to the next. No rest between.", "After the last one, rest the full rest period, then repeat.") and a tip; "Log this one side at a time?" with "Yes, log per side" and "No, log as normal" (AWS:5328-5560).
- Exercise info sheet: name, "Chest · Barbell", "3 sets of 8-12 reps", "Adjusted today", "Eased for today", "Use planned sets instead", Setup, Execution, Watch, and the empty fallback "No instructions for this exercise yet. Start light, move with control and stop a couple of reps before you truly cannot do any more." (AWS:6127-6250).

I. Swap and add
- Swap sheet: "Swap exercise", "Choose a close match. It keeps this slot's sets and reps, and sets you log count towards the new exercise's own muscle in your weekly volume." (or "... for today. Your plan is not changed, ..."), scope "Just this session" and "From now on", "{n} movements left out for your limitations.", "Showing {style} exercises" with "Show all exercises", "No close matches within your limitations." / "No close matches yet" / "Search the full library instead.", footer "Search exercise library" (AWS:6258-6390, `lib/exercise/swapCarry.js` scope strings).
- Toasts: "{new} now replaces {old} in your plan.", "Swapped for this session. Your plan could not be updated just now.", and three "could not be checked, so nothing is filtered" warnings (AWS:1689-1693, AWS:1827, AWS:1837). Picker strings: section 5.

### 12.3 Tone notes (all Suggests unless stated)

1. Technique commands in the set-type sheet: "Reduce the weight once you can't do any more reps", "Go until you can't do any more reps, rest 10 to 20 seconds, then squeeze out more reps" (AWS:228, AWS:230). Imperative, push-to-failure language; nearest to the catalogue's push-harder phrases (`COACHING_VOICE_SYNTHESIS_LOCKED.md:588`). Describing the technique would fit the calm register.
2. Intensity advice at the entry box: "Pick a weight you could lift about 12 times, with a couple in reserve" (AWS:5073) and the empty-instructions fallback "stop a couple of reps before you truly cannot do any more" (AWS:6246). Plain and non-shaming, but a command that sets an effort target; neither has a data referent.
3. "Lighter on purpose. Full recovery, no PRs." (AWS:4852) states a rule the code does not apply: the record detector has no deload condition (AWS:2990). Fails the honesty test (section 1 of the voice doc). The glossary frames it as advice, "not a week for trying to set new personal records" (`lib/coachGlossary.js:16`).
4. "Light set 2 - Easy" (AWS:4374) asserts how the set feels; it is a label on the week, not an observation (pattern 3).
5. "Rest cut by 30%." (`lib/whyThisTemplates.js:254-264`) and "Shortens the rest of today's session to fit the time you have left" (AWS:5988) describe effects the code does not produce: the rest cut never reaches the timer and the target is a fixed 25 minutes, not the time left (13.3). Honesty test.
6. "Can't do {name}? Volyume will swap it for another exercise ..." (AWS:5811-5812): neither button swaps for the user; "Just for today" opens a chooser and "From now on" opens Injuries & limitations (AWS:5814-5832). The copy promises an action the screen leaves to the user.
7. "Side one logged" (AWS:5113) while the card's own Cancel says "nothing is logged" (AWS:5128): the same card states both.
8. "Rough night: ... keeps quality up." (`lib/sessionAdjustments.js:645`) names a cause from the user's sleep answer and claims an outcome ("keeps quality up") the app cannot observe; "Welcome back: ..." (`:753`) warms without quoting the gap in days (pattern 9 asks for a data referent).
9. "This station missed a round." (`lib/circuitRound.js:56`): "missed" is the catalogue's flagged vocabulary for streaks (`COACHING_VOICE_SYNTHESIS_LOCKED.md:589`); here it is about a station, not a day, and is factual.
10. Clipped commands in walkthrough steps: "Move straight to the next. No rest between." and "Set up every station now if you can." (AWS:5376-5390). Fit for a how-to card but short of the "no clipped commands" rule.
11. The same intent has several labels: leaving a finish prompt is "Keep going" (AWS:4166-4262), leaving the discard prompt is "Keep training" (AWS:6398-6410), and the stale and remove prompts use "Cancel" (AWS:5590, AWS:1473). The discard body also differs between its two prompts ("... Your plan will not advance." against "All logged sets will be lost.") (AWS:6399-6401, AWS:5590).
12. Good as written (data-referenced, calm, plain): "You've logged 12 sets across 4 exercises", "Target reached: 4 working sets done", "Couldn't save set. Your set wasn't saved. Tap Log set to try again.", "Rest done / Next set when you're ready.", "First lift logged / ... logged as your starting point".

---

## 13. Flags, TODOs, dead code, duplicated logic and inconsistencies

Numbering is referenced from earlier sections. There is no `TODO`, `FIXME`, `HACK` or `console` call in AWS, the workout components, SE, RT, EPM, PRC or MB (grep).

### 13.1 The exercise object depends on how the session was started (the most consequential inconsistency found)

- Routine-backed starts (Home "start next", Plans, Plan detail, Routine detail, History repeat) hand the logger `exercise` objects built by `getRoutineExercisesWithDetails`, a hand-written literal of 17 fields: id, name, primaryMuscle, subregion, secondaryMuscles, equipment, movementPattern, compoundIsolation, defaultRepMin, defaultRepMax, fatigueCost, stimulusToFatigueRatio, equipmentCategory, laterality, loadCharacter, cue, unresolved (`DB:5049-5123`, `screens/HomeScreen.js:1729-1741`). `startWorkout` adds nothing (`STORE:1758-1776`).
- Exercises added from the picker, swapped in, or picked for a freestyle session are full `exercises` rows (`SELECT *`, `DB:3429-3445`) and so also carry `exerciseType`, `loadSemantics`, `incrementKg`, `exerciseCategory`, `isCustom`, and `notes` (columns at `DB:265`, `:594-595`, `:2670`). A swap replaces the planned object with a library row (AWS:1763-1768), so the same slot changes shape mid-session.
- The screen reads the missing fields through defaults: `exerciseType || 'weight_reps'` (AWS:2615, AWS:4400, `lib/workoutHelpers.js:111`), `loadSemantics ?? 'total'` (AWS:4422, AWS:4957, AWS:5092, `lib/algorithms.js:524`), `incrementKg ?? null` and `exerciseCategory || 'compound'` (AWS:2616-2617, AWS:3048-3050, AWS:4967-4968, AWS:5093-5094), `exercise.notes` (AWS:6246). It also reads `exercise.recommendedSets` and `exercise.restSec` (AWS:3684, AWS:3742-3744), which no origin supplies: the `exercises` table has neither column (`DB:250-268`), `recommended_sets` and `rest_seconds` live on `routine_exercises` (`DB:337`, `DB:498`) (13.3).
- The screen records the gap and works around it for one purpose only: the capability notices resolve the full library row with `getExerciseById` into `judgedExercise` "for JUDGEMENT only (display keeps the entry's object)" (AWS:928-960). The type, load-meaning, step and category reads above keep using the entry's own object.
- Suggests (from the code paths; not run on a device), for a routine-backed exercise whose real type or load meaning is not the default:
  - a timed, distance or reps-only exercise gets the weight x reps schema and is judged `weight_reps` by the validator and the record gate (AWS:2800, AWS:2990), so it can be asked for a weight and compared against heaviest-weight records;
  - a dumbbell lift reads "Weight (kg)" not "per hand", an assistance machine reads "Weight" and is judged by the non-assisted record rule, in the live record line and on log (AWS:5092, AWS:4422, `lib/algorithms.js:524-560`);
  - the stepper and the resolver's load step use the compound tier for every planned exercise (2.5 kg from 60 kg), whatever its category (AWS:5094, AWS:2616, `lib/livePrescription.js:168-192`);
  - the info sheet's "How to do it" fallback loses `exercise.notes` (AWS:6246).
- What is not established: whether routines contain such exercises. Auto-generated plans admit only `weight_reps` and `weighted_bodyweight` rows (`lib/planAutoGen.js:1512`, `lib/poolGenerator.js:188-191`), so the type effects need a manual routine or a plan edit. The load-semantics effects apply to `weight_reps` rows (dumbbells, assistance machines), and the lines read filter on type only. Unverified: how many shipped plans hold per-hand or assisted rows. Also in section 14.
- The mount tests build entries by hand with only `id`, `name`, `equipment` and `primaryMuscle` (`__tests__/screen-mount.test.js:1738-1745`), so neither real shape is exercised there.

### 13.2 Disabled or half-wired features that are still driven

- The persistent session notification is disabled in its first executable line (`lib/notifications/activeWorkout.js:136-143`), yet AWS recomputes and sends its arguments after every set and every 15 s (AWS:2327-2374) and dismisses it on cancel, on finish and on unmount (AWS:1992, AWS:3978, AWS:2381). The lock-screen `complete_set` and `add_exercise` listener (AWS:2398-2430) can only be fed by the rest notifications, which exist in builds without the native rest module.
- The iOS Live Activity is not ended by finishing a workout mid-rest; `discardWorkout` stops the timer first, `endWorkout` does not (AWS:1967-1969, AWS:3973, `STORE:1907-1933`). Section 4.5.
- The "sharp" readiness acknowledgement is defined and never shown (`lib/sessionAdjustments.js:655`; grep finds no consumer). `unloadRestBeeps` has no caller (`lib/restSound.js:218`). `WorkoutBottomBar` accepts `primaryIcon`, which AWS never passes (WBB:48, WBB:138). `NowCard` supports a dismiss control on the context line that AWS does not use (NC:140-147).
- `restSuggest.js` (the 180 s, 90 s, 60 s and 20 s table) is not read by the logger (section 4.2); the cluster rest is a separate hard-coded 20 s (AWS:3515, AWS:3561).
- `applyRemoteSetEvent`, a second set-logging path in the store (no PR detection, `countProgressSets + 1` numbering, its own rest default), has no caller in `src/`; the docs say no wrist traffic exists (`STORE:1679-1756`, `docs/ux-world-class-audit-2026-07-09/watch-app-scoping-memo.md:150`, `:283`). Suggests: if it is wired later, the screen's component copy of the rows (`loggedSets`) would not see sets the store adds, because it is rebuilt only on exercise change (AWS:2518-2519). Unverified.

### 13.3 Shorten session and the starter session

- Observed: both write the 30 percent rest cut to `entry.exercise.restSec` (AWS:3710, AWS:3773). The rest that actually starts reads `routineExercise.restSeconds` (AWS:3167-3169, AWS:3634), and no logger code reads `exercise.restSec`; no exercise object carries it (`DB:250-268`; `rest_seconds` is a `routine_exercises` column, `DB:498`). The message "Rest cut by 30%" (`lib/whyThisTemplates.js:254-264`) describes an effect the timer never gets.
- Observed: "Shorten session" estimates from `exercise.recommendedSets ?? 3` and `exercise.restSec ?? 90` (AWS:3742-3744); neither field exists on any exercise object, so every exercise estimates as 3 sets at 90 s. The starter reads `routineExercise.recommendedSets` first (AWS:3684). The target is a fixed 25 minutes (AWS:3748), while the overflow row says "to fit the time you have left" (AWS:5988). The "Estimated session: n minutes" figure is therefore not the user's plan or time.
- Observed: the starter caps `routineExercise.recommendedSets` to 2 (AWS:3702-3706), but the target on screen is `weeklyAllocation[exercise.id] ?? routineExercise.recommendedSets` (AWS:1173, AWS:4278), and the allocation exists for any programme session with planned volume rows (`lib/sessionAdjustments.js:291-330`). Suggests: on such a plan the chip can say "2 sets each" above a card that reads "Set 1 of 4". Unverified on device.
- Observed, the undo hazard: "Undo shortening" and the starter's "Full session" call `setWorkoutExercises(preCrunchSnapshot)`, a copy of the whole entries array taken when shortening began (AWS:3660-3668, AWS:3678, AWS:3735). Anything changed after that point is reverted in the store and the persisted snapshot: sets logged, exercises added, swapped, reordered or removed. SQLite keeps the set rows and finish reads them from SQLite (AWS:3810-3816), so totals survive but the sets disappear from the entries, the outline counts and a restore. Suggests: the screen's own `loggedSets` copy is rebuilt only when the exercise id or index changes (AWS:2730), so the rows stay visible until the user moves on, then vanish; unverified on device.
- Observed: shortening state (`timeCrunchActive`, `starterActive`, the snapshot, the message) is component state, lost on a kill, while the `_timeCrunchSkipped` marks persist on the entries; after a restore the dropped exercises stay dropped with no Undo (AWS:616-622, AWS:3767).
- Observed: `handleTimeCrunch` fires the `error` (Warning) haptic on completion (AWS:3784), a failure pattern on a benign action.

### 13.4 What a removed, swapped or abandoned exercise or session leaves behind

- Remove exercise filters the entry out of the store but deletes no `workout_sets` rows; the confirm says only "Remove X from this session. Your plan is not changed." and not that its logged sets still count (AWS:1464-1500, AWS:3810-3816). Finish reads every set in SQLite, so removed and swapped-out exercises' sets stay in the set count and tonnage.
- Swapping an exercise that already has logged sets replaces the entry with `sets: []` (AWS:1766) and resets the screen's rows (AWS:1848-1866); the old sets stay in SQLite and vanish from the entry, the outline and the snapshot. The swap sheet gives no warning.
- Silent cancel of an empty session ends the store session but never deletes the `workouts` row created at start, unlike the discard modal and the stale-discard path (AWS:1989-1993 against AWS:1946-1977, `DB:4067-4096`). Section 14.
- Draft keys `@volyume_setdraft_{workoutId}_{exerciseId}` are removed only when the weight is cleared, never at finish or discard (AWS:2704, AWS:2742-2751).

### 13.5 Add picker versus swap surfaces

- Mode comes from a label string: `isSwapAction = (saveLabel || actionLabel).toLowerCase().includes('swap')`, and AWS passes `'Swap in'` or `'Add to workout'` (EPM:232-234, AWS:5314-5319). Renaming the button would change the picker's behaviour.
- Add mode: search with autofocus, a Recent rail, list sections (Recent, In your plan, Staples, All exercises), muscle and equipment chips, set-aside and limitation toggles, "Create custom exercise", capability confirm alerts on pick. AWS passes no `planExercises`, so "In your plan" never appears, and the Recent rail and the first Recent section repeat the same exercises (EPM:193-199, EPM:395, EPM:447-457, EPM:871-893, AWS:5314).
- Swap mode (the footer "Search exercise library" of the swap sheet): no chips, no Recent rail, a flat fuzzy list, no create-custom footer (EPM:233-234, EPM:447-454, EPM:1094). The swap sheet's own list applies equipment from the profile, a style pool, a circuit-adjacency filter, the already-in-workout exclusion, capability narrowing and personalised ranking (AWS:1595-1720); the picker applies the person's set-aside and limitation filters (each with a toggle) and the capability alerts (EPM:416-428, EPM:481-535) but not the profile equipment, the style pool, circuit adjacency or the already-in-workout exclusion, and it has no exclusion prop (no `excludeIds` in EPM), so an exercise already in the session can be added, or swapped in, from it.
- AWS comments say a swap can fall through to "the custom-exercise form" and handle "a freshly created custom one" (AWS:481-483, AWS:1869-1871, AWS:6362-6364); swap mode has no way to create one.
- Picker rows, in both modes, print the raw muscle key capitalised (for example "Front_delts") (EPM:1064, EPM:1177), and the swap reason copy interpolates raw columns ("Targets {primaryMuscle} with the same {movementPattern} pattern") (`lib/swapEngine.js:140-158`).
- `ExerciseConflictSheet` exists in the brief's list but the logger never mounts it; the in-session surfaces use the picker's own alerts (`components/ExerciseConflictSheet.js`, used only at `screens/PlanLibraryScreen.js:998`).

### 13.6 Set counting and numbering disagree

- Three definitions of "sets done" run in one session: target progress ignores warm-ups and drop sets (`lib/workoutHelpers.js:15-20`, AWS:4279); the finish report counts everything but warm-ups (`lib/algorithms.js:258-267`); the mini bar counts every set including warm-ups and drop sets and ignores session adjustments (`MB:56`, `MB:80`, `MB:94-96`).
- Numbering: the stored `set_number` counts drop sets within the working kind (`lib/workoutHelpers.js:33-37`, AWS:2820) but the row badge counts progress sets only, so a drop set repeats the badge of the set before it (AWS:4955, LSR:166-177).
- "Last session" indexing mixes the two rules: `prevWorking` removes warm-ups only, yet it is indexed by `workingLogged`, which also excludes drop sets (AWS:5010-5014, AWS:4279). If last session had a drop set, the prefill for a later set can be that drop set.
- Draft restore compares two counts: the draft stores `countProgressSets(loggedSets)` (AWS:2743) and the restore compares it with a count of non-warm-up sets (AWS:2707), which differ once a drop set is logged, so that draft is skipped.
- Totals shown during the session (outline `done/total`, "Target reached") use `adjustedSetCount` for the current exercise but `entry.routineExercise.recommendedSets` for the others unless the plan is v2 (AWS:4439-4470).

### 13.7 Logging-path inconsistencies

- Per-side commit: the banner prints `perSide.weight` captured at side one (AWS:5116), but `finishPerSide` passes only the reps and `handleCompleteSet` reads the live `currentSet.weight` and set type (AWS:3641-3648, AWS:2797-2799, AWS:2811). If the weight box is edited between the sides, the banner and the saved row disagree. The unilateral header in `lib/unilateral.js:1-40` still describes lower-of-two-sides reps and an "L 10 / R 9" note that `finishPerSide` no longer writes.
- Parsers and limits: the weight and distance boxes accept only a dot. The change handler tests the raw text against `/^\d{0,3}\.?\d{0,2}$/` (distance `\d{0,5}`) and ignores anything else, so a comma keystroke is dropped before `parseDecimalInput` sees it (SE:185-189, SE:377). `parseDecimalInput` states the opposite policy, "NORMALISE, never reject" (`lib/parseDecimalInput.js:18-20`), and `numericInputLocale.guard` pins only that SE imports it and has no raw `parseFloat` (`lib/__tests__/numericInputLocale.guard.test.js:28-65`). Suggests: on a device whose decimal pad offers a comma (iOS in most EU regions) the comma key does nothing in the weight box, so a fractional weight cannot be typed there; unverified on device. The validator and the cluster and per-side starts parse differently again (`lib/workoutHelpers.js:84`, `:140` use `parseFloat`; AWS:3502, AWS:3616 use `parseDecimalInput`). Limits: weight 500 and reps 200 on screen, 5000 and 1000 in the database, 5 typed digits for distance against a 500 stepper clamp (SE:90, SE:377, `DB:4517-4542`).
- Record line: `buildRecordLine` builds `bestLabel` ("Best 80kg × 8") in every non-null state, and SE renders only the record callout (`lib/workoutRecordLine.js:113-122`, SE:472-486). The deload banner fallback says "no PRs" while the detector has no deload condition (AWS:4852, AWS:2990).
- One-time education is device-scoped, not per account: the unilateral walkthrough, the superset walkthrough, the first-rest hint, the notification-permission ask and the overflow info-tip pulse are `@volyume_seen_*` or `@volyume_rest_notif_asked` AsyncStorage keys with no reset path in the logger (AWS:183-205, AWS:2019-2020, AWS:2202, AWS:2243-2251). Suggests: a second person on the same device would not see them; unverified whether sign-out clears them.
- Edit save updates `weight` and `actualReps` only; the editor holds a `setType` it does not persist (AWS:3359-3365).
- The `Log set` button is a `primary` `Button` and presses `selection` itself, then `setLogged` fires on top (`Button.js:200-202`, AWS:2808-2812). Section 11.5.

### 13.8 Duplicated logic

- Weight-required validation is written three times: the shared validator (`lib/workoutHelpers.js:104-145`), the cluster start (AWS:3501-3506) and the per-side start (AWS:3615-3620), with the same `/body\s*weight/i` test each time (also AWS:3501, AWS:3615).
- Slot rebuild on swap: `rebuildRoutineExerciseFor` in AWS (AWS:306-314) and `carryPrescription` in `lib/exercise/swapCarry.js:94-105` do the same carry with the same rest rule; AWS does not import the lib version.
- The same live-theme map is written three times (13.9), and `EmptyExerciseView`'s own comment calls its header "header twin of ActiveWorkoutScreen - kept identical" while it is the older contained chrome (EEV:25-57, WHD:56-104).
- Record history is assembled twice from `allTimeSets` plus `loggedSets` (on log AWS:2975-2983; for the live line AWS:4408-4427) and a third time on edit (AWS:3375-3407); the agreement is pinned by a test (`lib/__tests__/recordLineLogAgreement.test.js`).
- Unit and number formatting is repeated inline (13.7, 9.1); the "Elapsed" `m:ss` string is built in AWS and again in the persistent-notification helper (AWS:4265, `lib/notifications/activeWorkout.js:208`).

### 13.9 Dead code, stale comments and the tests that pin them

- AWS styles: 54 of 200 frozen keys are never read by `styles.KEY`: header, headerSide, headerTapTarget, headerSideRight, headerIconBtn, headerFinishButton, headerCenter, headerTimerBlock, headerTimerLabel, headerTimerValueRow, timerText, exerciseNav, exerciseNavContent, navTab and its 5 variants, setEntryCard (3), noteCornerBtn, warmupBanner (2), orientationRow, orientationText, orientationTarget, beatLine (6), coachLine (2), noteInput, btnDisabled, completeBtnWarmup (2), extraSetBtn (4), autoAdvanceRow (5), bottomBar (2), loggedTitle, groupFocusBanner (2) (AWS:6444-6911). 37 of 139 live-map keys are unread (AWS:7019-7130). There is no dynamic style lookup that could read them (`styles[`, `live[` do not occur).
- Tests pin three of the dead keys, so deleting them would break tests that guard nothing visible: `headerFinishButton` and `noteCornerBtn` (`screens/__tests__/loggerHeaderCohesion.guard.test.js:79-83`, `:156-162`) and `beatLineCue` (`screens/__tests__/ActiveWorkoutScreen.usability.guard.test.js:137-138`). A fourth test pins the absence of the old `autoAdvanceRow` usage, not the style (`screens/__tests__/ActiveWorkoutScreen.nextExerciseButton.guard.test.js:83`).
- `SetEntry` keeps the RIR picker styles (`rirRow`, `rirBtn*`, SE:611-636) and a comment saying RIR is "defaulted in DEFAULT_SET" (SE:488-491) while `DEFAULT_SET.rir` is null (AWS:134).
- `sessionSetsRef` is write-only (10.2); its comments claim it feeds PR detection (AWS:686, AWS:2921-2923). `LoggedSetRow`'s hint says "Opens a sheet to change or delete this logged set" although editing is inline (LSR:164). The AWS header says the logger is registered in three stacks (AWS:209-212; one registration at `RN:476`). The live-map comment says one shared function serves three scopes (AWS:7003-7015) while three copies exist (AWS:7016, LSR:247, EEV:155). Test headers and `WorkoutHeader` say 44 dp for header targets; the token is 48 (`loggerHeaderCohesion.guard.test.js:14`, `:78`, `:85`, WHD:7, WHD:26, `styles/layout.js:13`). `lib/unilateral.js` header: see 13.7.
- `EmptyExerciseView` carries its own older header (a contained 24 px X, a labelled "Finish" button) beside a chromeless, icon-only `WorkoutHeader` (EEV:30-57, WHD:56-104); it renders when the session has no exercises or the index is out of range, so a blank session shows a different header from every other state (AWS:4471).

### 13.10 Flags, preferences and hand-offs

- Flags the logger depends on: `IS_JEST` (AWS:215, AWS:2272) only skips the 1 Hz interval under test; `ENTRY_TYPED_PUSH` is false, so `entry_typed` is local only, and `CIRCUIT_SYNC_COLUMNS_ENABLED` is true (`lib/sync/featureFlags.js:27`, `:74`, `lib/sync.js:602`). No tier or `FULL_ACCESS_FOR_ALL` check exists in the logger (grep).
- Preferences read: `defaultRestSeconds`, `autoStartRestTimer`, `restEndAlertEnabled`, `restSoundsEnabled`, in-app and OS Reduce Motion, "larger text", theme and contrast (`STORE:2100-2109`, `STORE:2215-2227`, `lib/haptics.js:30-33`). There is no in-logger setting for rest length or for turning off set-type options; those live in Settings (lane A2).
- Open founder decisions found in comments: whether haptics should follow Reduce Motion (`lib/haptics.js:12-23`); whether a drop set should count as a whole set (`lib/algorithms.js:246-254`).
- Hand-offs from the logger to other surfaces (for lane A2): `WorkoutSummary` via `replace` with the payload in 7.5 (AWS:3979-4008); Home "Workout in progress" card and the mini bar via the store; `HowYouTrain` (Injuries and limitations) from "From now on" and the constraint chips (AWS:5827-5832, AWS:4718-4770); `PlanLibraryScreen` is not reached from the logger; History reads the rows written at log time and at finish (`DB:4544-4613`).
- Safety-adjacent note, outside this lane: at finish the logger calls `relayWeighInAfterTrainingReturn()` (AWS:3945). That function gates on a category preference, notification permission and `tier === 'pro'` (`lib/notifications/scheduler.js:442-472`) and re-lays the weigh-in reminders through two callees that withhold while an ED flag is open (`lib/notifications/scheduler.js:162`, `:374`). The logger itself reads no calorie, food or bodyweight data and consults neither calm mode nor the ED flag (grep of AWS and the workout components); the PR toast takes its calm variant from `App.js` (section 6). The suppression logic was not audited here.

---

## 14. Ambiguities

1. Registration count: AWS says the screen is "registered in three stacks (Home, FirstRun, ProOnboarding)" (AWS:209-212); `RN:476` is the only registration found. Unknown whether the comment is stale or another stack mounts it by another route.
2. Orphan workout row: the silent empty cancel ends the store session without deleting the `is_completed = 0` row created at start (AWS:1989-1993). Whether Home, History or a start-up sweep ever removes it was not traced (lane A2 surfaces).
3. Real exposure to 13.1: whether any shipped or user-built routine holds timed, distance, reps-only, per-hand or assisted rows. The auto planner filters on exercise type only (`lib/poolGenerator.js:188-191`, `lib/planAutoGen.js:1512`); the manual builders and plan edits were not read for a filter.
4. Starter cap against allocation (13.3): whether `getSessionWeeklyAllocation` returns rows for a starter session, which decides if "2 sets each" reaches the Now card (AWS:1173, `lib/sessionAdjustments.js:291-330`).
5. Live Activity after finish: whether iOS dismisses the card at its end time or leaves it until the next launch's sweep. The JS and Swift sides were read; the OS behaviour cannot be (`STORE:1907-1933`, `App.js:567-579`, `modules/live-activity/widget/VolyumeRestTimerLiveActivity.swift`).
6. Android keyboard: `KeyboardAvoidingView` is iOS-only (AWS:4495) and `app.json` sets no `softwareKeyboardLayoutMode`; whether the pinned bottom chrome rides above the keyboard on Android depends on Expo's default and was not run.
7. Restore trigger: `restoreActiveWorkout` is called from the Home mount only (`screens/HomeScreen.js:283`). Whether any launch path (a notification, a deep link into another tab) can reach the logger or mini bar before Home mounts was not traced (`RN:950-956` maps the logger link to Today).
8. Performance: nothing was measured. Every statement in 10.4 (1 Hz whole-screen render, defeated memos, 1 Hz breadcrumbs, per-keystroke record line) is from code shape.
9. Haptics: code shows two events on "Log set" and a Reduce Motion gate that silences the set-logged tick (11.5); how they feel, and whether set-logged feedback should follow Reduce Motion, is an open decision in the file's own header (`lib/haptics.js:12-23`).
10. Watch path: whether any build outside `src/` calls `applyRemoteSetEvent`; no caller exists in `src/` and the docs say no wrist traffic ships (13.2).
11. One-time education flags: whether sign-out or an account switch clears the `@volyume_seen_*` keys; the logger has no reset path and the account code was not traced (13.7).
12. Which test statement is current: guard-suite headers call the screen "impractical to mount" (`screens/__tests__/loggerHeaderCohesion.guard.test.js:6-8`), while `__tests__/screen-mount.test.js` mounts it in about 20 cases (section 15).
13. Comma keypad: the weight and distance boxes drop a comma keystroke (SE:185-189, SE:377); whether the decimal pad on a comma-region iOS device, or on Android, actually offers a comma key was not run (13.7).

---

## 15. Tests

Shape: most suites are source-level guards (`fs.readFileSync` plus regex on the screen and components); the real screen is mounted only in `__tests__/screen-mount.test.js`. Counts are `test(` or `it(` lines found by grep. There is no render test of `NowCard`, `StatusStrip`, `WorkoutBottomBar`, `RestTimer` or `PRCelebration` on their own (grep of the test tree finds them only inside source-text guards and the mount harness). Dead styles are pinned by three of these suites (13.9).

### 15.1 `src/screens/__tests__` (23 suites, 236 tests)

- `ActiveWorkoutScreen.circuit.guard` (9): EL-9 circuits reuse the superset group advance: no rest between stations, the round rest after the last station.
- `ActiveWorkoutScreen.circuitLanguage.guard` (21): F-13 circuit wording: heads-up title and body, chip, "Round n of m" set line, round rest copy, no "Giant set" or "Superset" language on a circuit.
- `ActiveWorkoutScreen.finishAndNoteExpand.guard` (6): the finish-failure alert names an on-device write, not a connection; note expansion and reset.
- `ActiveWorkoutScreen.firstRunActivation.guard` (9): first-run help: the first-time prefill line, the one-time rest hint and the one-time notification ask.
- `ActiveWorkoutScreen.giantSet.guard` (6): groups of three or more: advance to the next later member, rest after the last, labels.
- `ActiveWorkoutScreen.groupFocusCue.guard` (11): D44 group focus changes carry a haptic, a spoken line and a 2.5 s banner.
- `ActiveWorkoutScreen.loggedSetRowMenuStyle` (1): the long-press menu wrapper re-passes the row style so rows stay horizontal.
- `ActiveWorkoutScreen.nextExerciseButton.guard` (15): the single-primary bar: Log set, Log other side, Next exercise, Finish workout, Log another set and the countdown.
- `ActiveWorkoutScreen.prReEval.guard` (9): records are re-judged after an in-session edit or delete (real `detectPR` and `bestPRPerExercise` plus the wiring).
- `ActiveWorkoutScreen.reEntryEase.guard` (5): the readiness tweak composes the intent-sheet reading with re-entry ease and finish retires the pending ease.
- `ActiveWorkoutScreen.reducedSessionSignal.guard` (10): T2-06 the session-level "left out" note for a reduced session.
- `ActiveWorkoutScreen.reorder.guard` (9): the in-session reorder sheet is block-aware and uses the drag list.
- `ActiveWorkoutScreen.sideCarveNote.guard` (28): T2-20 the one-side carve is named and suppresses the per-side prompt.
- `ActiveWorkoutScreen.supSheetInset.guard` (4): walkthrough sheets pad for the Android bottom inset.
- `ActiveWorkoutScreen.supersetRest.guard` (2): K-1 the superset jump targets later partners only, so the between-round rest fires.
- `ActiveWorkoutScreen.swapVolumeClause` (4): a mid-session swap credits the swapped-in exercise's muscle.
- `ActiveWorkoutScreen.unilateral.guard` (21): per-side logging after the D9 reversal: same reps both sides, one row, laterality gating, rest class.
- `ActiveWorkoutScreen.usability.guard` (22): gym-use polish: one finish control, confirm and retry copy, a failed read never offers discard (D218), CTA wording, beginner help row, fold and steppers, hold-to-adjust, scroll-safe sheets, the in-place editor.
- `ActiveWorkoutScreen.verticalLogger.guard` (10): jump is not reorder or skip; the outline sits above the workspace; completed rows above, active card, upcoming rows below; the reorder engine is untouched.
- `ActiveWorkoutScreen.workAroundPreselect.guard` (8): T2-11 "From now on" navigates with a preselect and no orphaned swap sheet.
- `loggerHeaderCohesion.guard` (12): header X and Finish share one geometry, elapsed overline and numerals, rest strip cannot clip, tabular numerals (pins dead `headerFinishButton` and `noteCornerBtn`).
- `loggerVisualArchitecture.guard` (12): phase 2B laws: active-set stability fold, quiet rest strip, no card chrome on completed rows, fixed outline.
- `cp10Stage3WorkoutShellsLiveTheme` (2): a mounted `LoggedSetRow` and the summary's stat box flip theme live on the same instance (the two screens themselves are not mounted there).

### 15.2 `src/components/workout/__tests__` (3 suites)

- `WorkoutOutline.guard` (10): completion rule, quiet complete rows, jump and reorder split, skipped rows dimmed but tappable, spoken states.
- `WorkoutOutlineAutoCollapse` (6): closes after 5 s, not while being read or scrolled, cleared on unmount, off for screen readers.
- `loggerHeaderFinishIconOnly.guard` (5): Finish is an icon-only control on the same chrome as the X.

### 15.3 `src/components/__tests__` and `src/__tests__` (logger-adjacent)

- `SetEntry.test` (3): the reps Done key logs the set when a handler is supplied.
- `SetEntry.exerciseType.test` (13): the field schema per exercise type; `weight_reps` unchanged; key chaining.
- `SetEntry.adversarial.test` (4): no estimated-max hint on non-load schemas.
- `SetEntry.inputFocusStability.test` (12): typing keeps focus; the Android keyboard-dismiss mode.
- `ExercisePickerModal.a11y.test` (3): the spoken row label includes the set-aside and capability captions.
- `ExercisePickerModal.customCreate.test` (4): create hands back the row just made, found by id.
- `ExercisePickerModal.el20Sections.test` (8): the empty-query sections and fuzzy search are wired in.
- `ExercisePickerModal.firstOpenGate.test` (6): the first-open list race workaround.
- `miniBarTabBar.test` (14): mini bar only while live, rest countdown or honest progress text, return navigation, tab bar.
- `__tests__/screen-mount.test.js` (logger cases at L1291, L1737-2025, L2043-2520, L2606-2707, L3163-3299): mounts the real screen with a stubbed database and taps every touchable; resolver wiring (a to f), restore and replay (i to iv), the auto-advance countdown, and the `entry_typed` kept-versus-typed capture (5 tests).
- `__tests__/p9Talkback.guard` (9): rest timer is not a live region; set log and edit are spoken.
- `__tests__/e6aRestSurvival.guard` (10): the native rest service uses the short-service type and exact alarms, never the health type.
- `__tests__/bottomBarInset.guard` (5): the bottom bar respects the system inset while the tab bar hides.
- `store/__tests__/sessionPRsSurviveTheSession` (9): session records live in the store and survive leaving the screen and a restore.

### 15.4 `src/lib/__tests__` and neighbours (logic the screen calls)

- `workoutHelpers` (29): "Set n of m", loggable weight, finish-confirm rules, set numbering by kind, formatting, `entry_typed` derivation.
- `workoutRecordLine` (21): the live record line never promises a record `detectPR` would withhold; the three record types are named apart.
- `recordLineLogAgreement` (4): the live flag and the celebration read the same history, today's sets included.
- `detectPR.firstLift` (4): a first lift is a starting point, not a record.
- `pastWorkoutPRs` (10): a past workout re-derives its records with the logger's rules.
- `livePrescription` (37), `.fq3` (12), `.kettlebell` (23), `.properties` (15), `.scenarios` (46): the resolver's boundaries, the FQ-3 law, the bell ladder, determinism properties and the design's 46-row scenario matrix.
- `restSuggest` (14): the fixed rest table (builders only); `restTimerMath` (5): a decrement never drops below 5 s; `restEnd` (8): the end-of-rest alert; `notifications.restForeground` (12): the Android service window and fallbacks; `liveActivity.wiring` (15): the iOS Live Activity is a safe no-op when absent; `notifications/__tests__/restCuesBackground.guard` (5): rest cues survive minimising.
- `warmupRamp` (14): the fixed ramp scheme; `clusterSet` (11): cluster sums and notes; `circuitRound` (19): round derivations; `unilateral` (25): per-side maths, rest plan and the legacy read path.
- `swapEngine` (13), `.equipment` (8), `.sameMuscle` (10): scoring, kit the person does not have, muscle moves; `swapScope.plan` (16) and `.review` (15): one-off versus permanent swaps; `exercise/__tests__/swapCarry` (31): sets, reps and rest carry on a swap.
- `sessionAdjustments` (56), `.caps.d219` (24), `.servedCap` (11): the readiness and plus-one rules, plan caps and the served count; `sessionEffective.effectiveCount` (7), `.planEffectiveSummary` (21), `.serveGuard` (30), `.styleEquipmentScope` (16): the serve-time capability view.
- `quickSession` (33): the quick full-body session; `reorder` (28): block-move arithmetic.
- `entryTyped.logging` (26), `database.entryTyped` (16), `sync.entryTypedPush` (15): how `entry_typed` is derived, stored, and withheld from push.
- `haptics.importBan` (4) and `haptics.richCurves` (9): one importer of the haptics library and the iOS pattern contract; `exerciseDisplay` (31): equipment labels and chips; `motionFitRules.guard` (4): motion-system fit rules over product source.

### 15.5 Other suites that read the screen's source

- `__tests__/gymBasics.guard` (8): keep-awake is focus-scoped and tagged; the warm-up helper opens only from an explicit tap.
- `__tests__/e8FlashList.guard` (3): the logger's swap list stays a recycled `FlashList`.
- `__tests__/campaign5.firstUse.test` (165, logger block at L550+): the finish confirm compares against what the app seeded, the first-lift guard keys on working sets, the recovery banner's "Got it".
- `__tests__/blockProgression.production` (28): finishing early closes workout and resolution in one database operation; the logger resolves the programme position.
- `__tests__/recoveryVisibility.production` (19): the logger's recovery banner reads the same resolved state as Home.
- `__tests__/campaign6.longitudinal` (23): layoff days in the logger match the engine's seven-day rule.
- `__tests__/capabilityCopyLeakage.guard` (7): no system vocabulary in the logger's string literals.
- `lib/__tests__/capabilityCensus.guard` (9): the capability helpers the screen calls (notice kind, removal conflicts, sided shape).
- `lib/__tests__/capabilityPlanRewrite` (11): the in-session baseline conflict is marked quietly, judged on the library-resolved row.
- `lib/__tests__/capabilityPosture.w1.guard` (10): an empty session marks the effective view applied; a failed capability read on the swap surfaces says so.
- `lib/capability/__tests__/laterality` (34): the one-side carve reads `sidedRuleTouches`.
- `lib/exercise/__tests__/capabilityComposition` (22): `rankPersonalised` drops capability-blocked candidates.
- `screens/__tests__/swapScope.surfaces.guard` (14): the scope picker wiring on both swap surfaces.
- `screens/__tests__/swapSheetCapabilityNarrowing.guard` (12): the narrowing count, reason and toggle on the swap sheets.
- `screens/__tests__/keyboardDismissModeAndroid.guard` (2): keyboard dismiss is `none` on Android and `interactive` on iOS.
- `lib/__tests__/prDetectionRace` (10): a set logged while history reloads is judged against real history, never an empty list.
- `lib/__tests__/sessionKeepsItsWorkoutName` (8): the finished workout keeps its routine's name.
- `lib/__tests__/applyWiring.fq4` (11): the logger reads the allocated base (`weeklyAllocation ?? recommendedSets`).
- `lib/__tests__/planFacts.serve` (41): the logger, mini bar and plan screens read one served set count; the allocation effect passes the v2 flag.
- `lib/__tests__/attribution` (16): the coarse source attaches to `first_workout_logged` only.
- `lib/__tests__/numericInputLocale.guard` (6): `SetEntry` and the logger import `parseDecimalInput` and hold no raw `parseFloat`; it does not pin that a comma can be typed (13.7).
- `lib/notifications/__tests__/campaign14.inactivityStandDown` (35): the finish flow re-lays the weigh-in family.
- `store/__tests__/workoutPrefs` (6): the rest fallback `restSeconds || defaultRestSeconds || 90` resolves to the stored default.
- `components/__tests__/Button.hierarchy.guard` (8): the logger primaries (`completeBtn`, `supPrimaryBtn`, `staleResume`, `keepTrainingBtn`) are raised surfaces with white labels.
- `components/__tests__/AppAlert.overflow.guard` (7): the alert caps and scrolls like the logger's 88 percent sheet.
- Mentioning the logger only in passing (lane A2): `screens/__tests__/workoutSummaryFooterBand.guard`, `WorkoutHistoryScreen.repeatAsIs`, `WorkoutSummaryScreen.constraintEffectLine.guard`, `RoutineDetailScreen.capabilityPlanMarkers.guard`, `PlansScreen.blockReceipt.guard`, `ExerciseDetailScreen.logic`, `DiaryScreen.holdHints.guard`, `ProOnboardingScreen.keyboardDismiss.guard`.
