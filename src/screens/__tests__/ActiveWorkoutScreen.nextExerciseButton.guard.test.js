/**
 * Source-level regression guard — the single primary CTA state machine.
 *
 * Founder ruling (2026-07-10, verbatim): "After set number of sets it should
 * give a button for next exercise not just show you to do many more sets."
 *
 * RE-PINNED (logger redesign phase 2, founder-accepted Option B): the bar is
 * now a SINGLE-primary state machine, replacing D43 S3's additive
 * primary-beside-advance layout AND the separate floating "Next exercise in
 * a moment / Stay here" row (the contradictory-CTA state the redesign was
 * ordered to eliminate). The pinned contract:
 *
 *   1. Target not complete: the logging action is the one primary
 *      (volyume-btn-complete-set). No advance control renders.
 *   2. Target complete (advance non-null, same gate as ever:
 *      targetComplete && !extraSetArmed && !perSide): the SAME primary slot
 *      becomes Next exercise / Finish workout (their pinned testIDs), and
 *      the 1.8s auto-advance countdown renders as that button's own
 *      progress track (countdownActive) - never as a second control.
 *      Tapping it advances immediately (the handler is the same
 *      handleNextExercise/handleFinishWorkout, whose first act cancels the
 *      timer): the countdown is a ceiling, not a mandatory delay.
 *   3. Extra sets stay reachable as the explicit SECONDARY action
 *      ("Log another set", volyume-btn-extra-set) which arms extraSetArmed
 *      (CL-6.1 prepare-not-commit) and cancels the countdown, returning the
 *      bar to state 1 - it never competes as a second primary (D8
 *      junk-volume: extra sets are the user's call, never a wall).
 *   4. Auto-advance timing and trigger are UNCHANGED: 1800ms, armed only on
 *      the justHitTarget edge, cancelled by every pre-existing trigger
 *      (logging another set, exercise removal, any index change, unmount,
 *      superset pre-emption) through the single cancelAutoAdvance choke
 *      point.
 *
 * ActiveWorkoutScreen.js is a huge screen with a live dependency surface
 * (store, SQLite, notifications, haptics); mounting it is impractical, so -
 * matching this file's existing convention - these are byte-level checks
 * against the source.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);
const BAR_START = SRC.indexOf('{cluster ? null : (\n          <WorkoutBottomBar');
const BAR_END = SRC.indexOf('{/* Exercise Picker Modal, shared by Add and Swap', BAR_START);
const BAR_COMPONENT = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'WorkoutBottomBar.js'),
  'utf8',
);
const bottomBarWindow = (BAR_START >= 0 && BAR_END > BAR_START) ? SRC.slice(BAR_START, BAR_END) : '';

describe('single primary CTA: Log set until target, then Next exercise / Finish workout in the SAME slot', () => {
  test('the advance gate is targetComplete && !extraSetArmed && !perSide, unchanged', () => {
    expect(SRC).toContain('const targetSets = adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS;');
    expect(SRC).toContain('const workingLogged = countProgressSets(loggedSets);');
    expect(SRC).toContain('const targetComplete = targetSets && workingLogged >= targetSets;');
    expect(bottomBarWindow).toContain('advance={(targetComplete && !extraSetArmed && !perSide)');
  });

  test('when advance is present it IS the primary (variant primary, pinned testIDs); the logging primary does not co-render', () => {
    expect(bottomBarWindow).toContain("label: 'Next exercise', onPress: handleNextExercise, testID: 'volyume-btn-next-exercise'");
    expect(bottomBarWindow).toContain("label: 'Finish workout', onPress: handleFinishWorkout, testID: 'volyume-btn-finish-primary'");
    // Inside the component: the advance branch renders the advance Button on
    // variant="primary", and the logging Button (volyume-btn-complete-set)
    // lives in the ELSE branch - one primary at a time by construction.
    const advanceBranch = BAR_COMPONENT.slice(
      BAR_COMPONENT.indexOf('{advance ? ('),
      BAR_COMPONENT.indexOf(') : ('),
    );
    expect(advanceBranch).toContain('testID={advance.testID}');
    expect(advanceBranch).toContain('variant="primary"');
    expect(advanceBranch).not.toContain('volyume-btn-complete-set');
    const elseBranch = BAR_COMPONENT.slice(BAR_COMPONENT.indexOf(') : ('));
    expect(elseBranch).toContain('testID="volyume-btn-complete-set"');
  });

  test('the 1.8s countdown renders ON the primary CTA (countdownActive), never as a separate floating row', () => {
    // The old contradictory state is gone: no "Stay here" control, no
    // floating countdown row anywhere in the screen's render.
    expect(SRC).not.toContain('accessibilityLabel="Stay on this exercise"');
    expect(SRC).not.toContain('styles.autoAdvanceRow}');
    // The countdown is a state of the same single primary slot.
    expect(bottomBarWindow).toContain('countdownActive={autoAdvanceArmed && targetComplete && !extraSetArmed}');
    expect(BAR_COMPONENT).toContain('countdownMs = 1800');
    expect(BAR_COMPONENT).toContain('duration: countdownMs');
    // The track is decorative: hidden from assistive tech, and the button's
    // accessibilityLabel stays the plain action label (same-string rule).
    expect(BAR_COMPONENT).toContain('accessibilityElementsHidden');
    expect(BAR_COMPONENT).toContain('accessibilityLabel={advance.label}');
    // Screen readers hear the arm exactly once, at the arm site.
    expect(SRC).toMatch(/setAutoAdvanceArmed\(true\);\s*try \{\s*AccessibilityInfo\.announceForAccessibility\('Next exercise in a moment'\);/);
  });

  test('auto-advance timing and trigger are unchanged: 1800ms on the justHitTarget edge, cancelAutoAdvance is the single clearing point', () => {
    expect(SRC).toContain('const justHitTarget = targetSets && newWorkingCount >= targetSets && workingLogged < targetSets;');
    expect(SRC).toContain('}, 1800);');
    expect(SRC).toContain('function cancelAutoAdvance() {');
    // The pre-existing cancellation triggers all still route through it:
    // logging another set, removal, next-exercise itself, and the index-
    // change/unmount backstop effect.
    expect(SRC).toMatch(/async function handleCompleteSet\(overrides = \{\}\) \{[\s\S]{0,400}?cancelAutoAdvance\(\);/);
    expect(SRC).toMatch(/function handleNextExercise\(\) \{\s*cancelAutoAdvance\(\);/);
    expect(SRC).toMatch(/return \(\) => cancelAutoAdvance\(\);/);
  });
});

describe('extra sets beyond the plan stay loggable as an explicit SECONDARY action (D8: never a wall, never a second primary)', () => {
  test('the bar exposes "Log another set" as the secondary, wired to armExtraSet', () => {
    expect(bottomBarWindow).toContain('onExtraSet={armExtraSet}');
    expect(BAR_COMPONENT).toContain('testID="volyume-btn-extra-set"');
    expect(BAR_COMPONENT).toContain('title="Log another set"');
    // Visually subordinate: the secondary rides variant="secondary" and the
    // primary keeps the larger flex share.
    expect(BAR_COMPONENT).toContain('variant="secondary"');
    expect(BAR_COMPONENT).toContain('primarySlot: { flex: 3');
    expect(BAR_COMPONENT).toContain('extraSlot: { flex: 2 }');
  });

  test('arming cancels the countdown and returns the bar to Log set (prepare-not-commit, CL-6.1)', () => {
    const fn = SRC.match(/function armExtraSet\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('cancelAutoAdvance();');
    expect(fn).toContain('setExtraSetArmed(true);');
    // extraSetArmed still gates the SAME advance ternary; once true only the
    // logging primary remains, and it disarms on the next logged set or any
    // exercise change (the reset effect).
    expect(bottomBarWindow).toContain('advance={(targetComplete && !extraSetArmed && !perSide)');
    expect(SRC).toContain('const [extraSetArmed, setExtraSetArmed] = useState(false);');
    expect(SRC).toMatch(/setExtraSetArmed\(false\);[\s\S]{0,120}?\}, \[currentExerciseIndex, loggedSets\.length\]\);/);
  });

  test('an implicit past-target log (keyboard Done) still arms on SUCCESS only, never on the tap', () => {
    // L1 review fix carried forward: handleCompleteSetPress never arms;
    // handleCompleteSet's success path does, so an invalid/aborted entry
    // cannot flip the bar's mode.
    const pressFn = SRC.match(/function handleCompleteSetPress\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(pressFn).not.toContain('setExtraSetArmed(true)');
    expect(SRC).toContain("if (currentSet.setType !== 'warmup' && targetSets && workingLogged >= targetSets && !extraSetArmed) {");
  });
});

describe('the advance state never shows mid-exercise, and never mid a per-side pair', () => {
  test('targetComplete requires the logged working-set count to reach the target, so pre-target never satisfies the gate', () => {
    expect(SRC).toContain('const targetComplete = targetSets && workingLogged >= targetSets;');
  });

  test('R4 (D64): the bar hides only for a cluster - mid per-side pair it STAYS, relabelled to commit side two', () => {
    expect(SRC).toMatch(/\{cluster \? null : \(\s*<WorkoutBottomBar/);
    expect(SRC).toContain('if (perSide) return finishPerSide();');
    expect(SRC).toContain("perSide ? 'Log other side'");
  });

  test('a trailing time-crunch-skipped exercise cannot leave the finish offer unreachable', () => {
    expect(SRC).toContain('const isLastExercise = !workoutExercises.some(');
    expect(SRC).toContain('(entry, i) => i > currentExerciseIndex && !entry?._timeCrunchSkipped,');
    expect(SRC).not.toContain('const isLastExercise = currentExerciseIndex === workoutExercises.length - 1;');
  });

  test('superset pre-emption stays senior: the forward jump returns before the auto-advance arm', () => {
    // In handleCompleteSet the group forward-jump `return`s before the
    // justHitTarget branch, so a superset transition consumes the moment and
    // the single-exercise countdown never arms for it.
    const fn = SRC.match(/async function handleCompleteSet\(overrides = \{\}\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const jumpIdx = fn.indexOf('announceGroupFocusChange(pairIdx, sgi);');
    const returnIdx = fn.indexOf('return;', jumpIdx);
    const armIdx = fn.indexOf('if (justHitTarget && !isLastExercise) {');
    expect(jumpIdx).toBeGreaterThan(-1);
    expect(returnIdx).toBeGreaterThan(jumpIdx);
    expect(armIdx).toBeGreaterThan(returnIdx);
  });
});

describe('target-set fallback matrix: targetSets always resolves to a real number', () => {
  test('root cause is pinned: addExerciseToWorkout still defaults routineExercise to null', () => {
    const STORE = fs.readFileSync(
      path.join(__dirname, '..', '..', 'store', 'useAppStore.js'),
      'utf8',
    );
    expect(STORE).toContain('addExerciseToWorkout: (exercise, routineExercise = null) => {');
    expect(SRC).toContain('addExerciseToWorkout(ex);');
  });

  test('auto-generated / manual-builder / swapped-in slots (routineExercise present) resolve via adjustedSetCount, unaffected by the fallback', () => {
    expect(SRC).toContain('const comp015SetCount = (sessionAdjustment && sessionAdjustment.setDelta !== 0)');
    expect(SRC).toContain('(weeklyAllocation?.[exercise?.id] ?? routineExercise?.recommendedSets);');
    const swapWindow = SRC.match(/function handleConfirmSwap\(newExercise\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    // CC33 W1 (D112 R2): the rebuild moved into the module-level helper
    // shared with the capability effective view. The pinned semantics are
    // unchanged - a swapped-in slot gets a REBUILT routineExercise that
    // keeps the slot's planned set count (`...prevRoutineEx`) - the pin
    // just follows the code into the helper.
    expect(swapWindow).toContain('const rebuiltRoutineEx = rebuildRoutineExerciseFor(newExercise, prevRoutineEx);');
    const helper = SRC.match(/function rebuildRoutineExerciseFor\(newExercise, prevRoutineEx\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(helper).toContain('...prevRoutineEx,');
    expect(helper).toContain('startingWeight: null,');
  });

  test('a slot with no routineExercise at all falls back to DEFAULT_FREEFORM_TARGET_SETS, never to undefined', () => {
    expect(SRC).toContain('const DEFAULT_FREEFORM_TARGET_SETS = 3;');
    expect(SRC).toContain('const targetSets = adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS;');
    expect(SRC).toContain('const pos = targetSets ? `Set ${workingLogged + 1} of ${targetSets}` : `Set ${workingLogged + 1}`;');
  });

  test('per-side pairs still count as ONE set toward whatever target resolves', () => {
    const fn = SRC.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const calls = fn.match(/handleCompleteSet\(/g) ?? [];
    expect(calls.length).toBe(1);
  });
});
