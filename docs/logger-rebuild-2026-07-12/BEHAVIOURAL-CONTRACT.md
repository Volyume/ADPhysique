# Logger rebuild — behavioural contract (founder order 2026-07-12)

Founder order (verbatim intent): rebuild the entire workout page from
nothing; no patching, no copying the old layout forward. The DESIGN is
replaced; every behaviour below is the contract the new page must honour
(extracted 2026-07-12 by full read of the old 4,763-line screen; line
numbers reference the pre-rebuild file at commit ece5dd8).

Founder rulings folded in (2026-07-12 device walk):
- The corner note pencil DIES (it was a one-way latch: only ever opened
  the box, no close path, dead after first tap). Note entry = a
  collapsed "Add a note" row on the card that expands to the input.
- The coach line ("Feeling sharp...") becomes CLOSABLE plain info - no
  chevron, no navigation to the execution/form-guide sheet. The
  adjustment controls (restore plan / dismiss tweak) stay reachable in
  the exercise info sheet via the exercise title/overflow.
- The beginner explainer paragraph leaves the set card entirely; novice
  education lives behind the overflow ("How logging works").
- The set-position line stays ONE tappable line (set type picker), no
  second affordance beside it.

## 1. Navigation contract
- Route params: `starterSession` (consumed once via setParams false),
  `starterRoutineName`. Workout itself comes from the store, never params.
- Exits: goBack (empty-cancel/discard/stale-discard/finish-no-workout),
  replace('WorkoutSummary', {workoutId, sessionAdjustments, routineId,
  startedAt, endedAt, durationMinutes, exerciseCount, setCount,
  workingSetCount, tonnage, exerciseNames, detectedPRs, exerciseData[]}).
- Hardware back -> cancel flow. Cancel: 0 sets and no in-progress entry
  -> silent end+goBack; else discard confirm ("Keep training"/"Discard
  workout" -> endWorkout + deleteIncompleteWorkout). Stale (>4h) modal:
  Resume / Finish / Discard.
- hasInProgressSetEntry(): cluster || perSide || typed weight ||
  non-default reps || non-empty note - widens cancel AND finish confirms.

## 2. Store + DB surface (all preserved verbatim)
Store reads: user, units, activeWorkout, workoutExercises,
currentExerciseIndex, session, defaultRestSeconds, autoStartRestTimer,
workoutPrefsLoaded, workoutStartTime, lastActivityAt,
sessionAdjustments, tier, barWeight, showPRCelebration, reduceMotion,
userProfile.experience.
Store actions: setCurrentExerciseIndex, setWorkoutExercises (every
order/membership change; persists via _persistActiveWorkout),
addExerciseToWorkout, addSetToCurrentExercise,
updateSetInCurrentExercise, removeSetFromCurrentExercise,
startRestTimer, updateLastActivity, revertSessionAdjustment,
dismissReadinessTweak, showPRCelebration, endWorkout, loadWorkoutPrefs.
DB: getLastNWorkoutSets(2), getAllCompletedSetsForExercise,
createWorkoutSet, updateWorkoutSet, deleteWorkoutSet(+cloud delete with
enqueueSyncOp fallback), getWorkoutSetsForWorkout (finish count),
updateWorkout, deleteIncompleteWorkout, getCurrentMesocycleWeek,
getWeek1SetsForExercise, getNextTimeNotes/markNoteShown, getAllExercises.
Engine/lib: detectPR, bestPRPerExercise, computeSetTargets,
summariseWorkoutSets, generateDeloadPrescription, rankSwaps, cluster
helpers, workoutHelpers (countProgressSets, setNumberForKind,
getBestAnchorSet, prefillRepsForTarget, validateSetEntryValue,
shouldConfirmBeforeFinish), unilateral helpers, applyTimeCrunch,
readiness (getReadinessTweak/applyReadinessToSets/Targets), warmupRamp,
shareSessionName, FORM_TIPS, GLOSSARY. Lazy: engineTelemetry.track,
trackFirst+getFirstTouchSource, widgets/writer, partners
weekSignalWriter, notifications scheduler/trainingHabitSchedule/
activeWorkout.

## 3. Set logging (handleCompleteSet contract, 20 steps)
Press funnel: saving guard -> perSide? finishPerSide : uni? startPerSide
: cluster-type? startCluster : handleCompleteSet. Ref-mirrored for the
lock-screen action listener; ghost sets refuse lock-screen logging.
handleCompleteSet: cancelAutoAdvance -> validateSetEntryValue (appAlert
on fail) -> haptic (warmupLogged/setLogged) -> setNumberForKind (working
and warm-ups numbered independently) -> createWorkoutSet (setType,
targets from routineExercise, rir parsed, isAmrap, leftReps/rightReps
null) -> loggedSets append + addSetToCurrentExercise -> once-ever info
flag -> audit workout.set.logged -> 700ms log flash (tracked timeout)
-> TalkBack announce ("Warm-up set logged" / "Set N logged, W units, R
reps") -> PR detection (first-ever = honest first_lift celebration, NOT
a record and NOT in detectedPRs; else showPRCelebration(prs[0]) +
bestPRPerExercise tagged setId) -> carry weight/reps forward ->
updateLastActivity -> superset FORWARD-only jump (i >
currentExerciseIndex) with NO rest + announceGroupFocusChange -> rest
timer (autoStartRestTimer; routineExercise.restSeconds ||
defaultRestSeconds || 90; perSideCompound halves it) -> extraSetArmed
arms on SUCCESS when target already met -> auto-advance (justHitTarget
&& !isLastExercise -> 1800ms, cancellable "Stay here") -> D44
round-return to group first member -> warm-up auto-switch to straight
prefilled from targets/anchor. Errors: logError + calm retry appAlert;
finally setSaving(false).
Set types: straight/warmup/dropset/myo_reps/rest_pause/amrap. DEFAULT_SET
weight:'' reps:8 rir:2. Warm-ups excluded from countProgressSets.
Clusters: startCluster validates -> banner flow, 20s rests, whole
cluster = ONE row via summariseCluster/mergeClusterNote; bottom bar
hidden mid-cluster.
Unilateral (D9, founder-reversed same-reps): startPerSide (validate,
perSideRestPlan: compound = between-sides rest, isolation = prompt) ->
"Side one logged" banner -> finishPerSide = exactly ONE
handleCompleteSet (actualReps: perSide.reps, perSideCompound flag). ONE
row, leftReps/rightReps null. cancelPerSide writes nothing. Once-ever
walkthrough (@volyume_seen_unilateral_walkthrough) then quick asks;
sticky prefs via unilateral.js.
Ghost sets: armed from last session's matching index, isGhost muted
input state, cleared on log/change/exercise switch.
Beat line -> IN THE REBUILD becomes ghost placeholders in inputs + the
one-tap Use affordance (blueprint 3.4): tap = setLogged haptic + audit
workout.beatline.apply + fill. Three states: deload target / "Last: WxR
- Target range" / first-time target (non-tappable).
Readiness/COMP-015 (Pro-only, DOWNWARD-only): lower target wins
(Math.min); displaySetTargets = applyReadinessToTargets when reducing;
restore mechanics preserved (revertSessionAdjustment per-exercise when
setDelta!==0; dismissReadinessTweak session-wide);
readinessRestoreLabel honesty; session_adjustment_shown once/exercise.
Stalled advice: same weight+reps 3 sessions (>=9 sets), first working
set only.
Deload: prescription prefills, "Light set N - Easy", dismissible banner,
no PRs implied, coach line suppressed while banner shows.
Edit/delete logged sets: in-place editor in LoggedSetRow (single open
pair), validate -> updateWorkoutSet -> store update -> PR RE-EVAL
(exclude own pre-edit entry; edited-up celebrates; edited-down clears
stale badge) -> haptic+flash+"Set updated" announce. Delete: confirm ->
deleteWorkoutSet -> cloud delete (enqueueSyncOp on fail) -> store remove
-> prune sessionSetsRef + detectedPRs. Long-press zeego menu Edit/Delete
reuses the same confirm.

## 4. Exercise-level flows
Pills only when >1 exercise; badge = set count (rebuild: done/total
progress underline). Superset heads-up once per group per workout
(acknowledged BEFORE dismiss), pair vs giant-set copy by member count,
Got-it/Unlink/Swap. announceGroupFocusChange = selection() haptic
(distinct from setLogged) + announce + 2.5s banner hidden from a11y
tree. handleNextExercise skips _timeCrunchSkipped; isLastExercise
skip-aware; advance action gated targetComplete && !extraSetArmed &&
!perSide; targetSets = adjustedSetCount || recommendedSets ||
DEFAULT_FREEFORM_TARGET_SETS(3). Swap: rankSwaps top-8 (excludeAssisted
for beginners), rebuilds routineExercise (clears carried weight, keeps
set count), full state reset, "Search exercise library" -> picker swap
mode, volume clause copy verbatim (pinned). Add mid-session ->
addExerciseToWorkout + jump. Remove: blocked if last, confirm, filter +
reset. Execution/info sheet: muscle+equipment, targets, Adjusted
today/Eased for today controls, how-to from routineExercise.notes ||
FORM_TIPS || exercise.notes. Warm-up ramp: overflow pull-only, nothing
auto-logged, rampAnchorRef, weight-based types only, hidden mid-cluster.
History: last-2-sessions + all-time; layoff >7 days -> 0.9 multiplier.
Education once-ever keys: @volyume_seen_workout_info (pulse + card
hint), unilateral walkthrough, warm-up hint (session ref), superset
heads-up (session ref). Reorder: single path = overflow sheet with
DragReorderList + chevrons, block-aware swapAdjacentBlocks, WeakMap
keys. Overflow rows (rebuild adds "How logging works"): Swap, Add
exercise, Reorder (>1), Log per side (unilateral only), Warm-up sets,
Pair/Unpair superset, Shorten session / Undo, Remove. Time crunch:
applyTimeCrunch ~25min, _timeCrunchSkipped, rest -30%, error() haptic,
revert via preCrunchSnapshot. Starter session: 4x2 via same machinery,
one-time via setParams.

## 5. Timers + background
RestTimer mounted PROPLESS (store-driven); screen only ever calls
startRestTimer(seconds). Elapsed timer derived from workoutStartTime
(never a counter), 1s interval (skipped under Jest), AppState re-sync,
"M:SS". Keep-awake: useFocusEffect, per-instance tag, best-effort both
ways. Persistent notification: immediate on state change + 15s throttle,
countProgressSets+1 of adjustedSetCount, dismissed on unmount/end/
finish. Lock-screen actions: add_exercise (live workout -> picker),
complete_set (live + restTimerActive + not ghost ->
handleCompleteSetPressRef). Draft persistence:
@volyume_setdraft_{workoutId}_{exerciseId}, 250ms debounce + flush on
background, restored only if workingCount matches. Crash recovery is
store-side (restoreActiveWorkout) - the screen just renders store state.

## 6. Completion
Finish: finishingRef guard, audit workout.finish.tap, confirm via
shouldConfirmBeforeFinish || hasInProgressSetEntry ("You've logged N
sets across M exercises."), doFinish: DB-count via
getWorkoutSetsForWorkout -> summariseWorkoutSets -> shareSessionName ->
updateWorkout (completed) -> track workout_completed + trackFirst
first_workout_logged(first_touch_source) -> fire-and-forget widget
snapshot, week signals, activation nudge, habit schedule, syncWorkout ->
capture finishedAdjustments BEFORE endWorkout -> endWorkout +
workoutComplete() haptic + dismiss notification -> replace summary.
Error: reset guard + calm retry alert.

## 7. Safety / invariants
Unilateral same-reps (divergent ask ruled ED-adverse - never
re-propose). Adjustments downward-only, lower wins. First lift honest,
never "record". Deload = no PRs. Pro-only: sessionAdjustment +
readinessTweak surfaces; logging itself tier-blind. TalkBack announce
set (not live regions); group banner a11y-hidden; radiogroup semantics
on set-type picker; reduce-motion suppresses pulse/animations;
maxFontSizeMultiplier 1.3 everywhere. safeBottom floors Android bottom
inset at 48.

## 8. testIDs + pinned tests
testIDs that MUST survive (Maestro + guards): volyume-btn-complete-set,
volyume-btn-next-exercise, volyume-btn-finish-primary,
volyume-set-type-btn. volyume-note-corner-btn dies with the pencil
(re-anchor its pins to the new note row: volyume-note-row).
SetEntry testIDs volyume-weight-input/volyume-reps-input untouched.
Maestro 02-workout-backgrounding.yaml also asserts copy: "Add
exercise", "Skip rest timer", "Not now", "Edit set 1", "Workout in
progress".
BEHAVIOURAL pins (survive, re-anchor strings as needed): giantSet,
groupFocusCue, nextExerciseButton (formula/gating), prReEval, reorder,
supersetRest (forward-only), swapVolumeClause copy, unilateral,
loggedSetRowMenuStyle, e8FlashList, p9Talkback announcements,
gymBasics (keep-awake + warm-up pull-only + no plate calc),
screen-mount smoke.
LAYOUT-SOURCE pins (retire/re-anchor WITH dated rationale, invariant
carried where real): usability.guard (old visual structure),
supSheetInset, bottomBarInset (re-anchor to new bar).

## 9. Easy-to-lose specifics
Tracked timeouts cleared on unmount (logFlash 700ms, groupFocus 2.5s);
autoAdvanceRef+armed mirror with cancelAutoAdvance the only clear;
sessionSetsRef PR history; once-per-session dedupe refs; WeakMap
exercise keys; two AppState listeners (elapsed re-sync, draft flush);
BackHandler; notification-response listener; rampAnchor reset +
cancelAutoAdvance on index change; extraSetArmed reset on
exercise/set-count change; notification dismiss on unmount; IS_JEST
elapsed gate; LoggedSetRow re-export (`export { LoggedSetRow }`);
registered in THREE stacks (Home, FirstRun, ProOnboarding).
