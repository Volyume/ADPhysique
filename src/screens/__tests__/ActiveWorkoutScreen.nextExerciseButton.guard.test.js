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
// RE-PINNED for the logger rebuild stage B (D220, 12-BUILD-SPEC section
// 4): the bottom bar is retired. The logging primary is the next row's check
// (SetRow, volyume-btn-complete-set); the advance is the next section's
// header or the unchanged 1.8 s auto-advance, whose countdown is the active
// section's footer line; the extra set is the footer's Add set. The founder
// ruling the file exists for is kept: after the set number of sets the
// screen moves on, and extra sets stay the person's call.
const SECTION = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'session', 'ExerciseSection.js'),
  'utf8',
);
const SET_ROW = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'session', 'SetRow.js'),
  'utf8',
);

describe('single primary CTA: Log set until target, then Next exercise / Finish workout in the SAME slot', () => {
  test('the advance gate is targetComplete && !extraSetArmed && !perSide, unchanged', () => {
    // D220 addendum 28 (2a): Add set before the target adds to this session's
    // target (extraTargetSets, reset on an exercise change); the fallback
    // chain inside the brackets is unchanged.
    expect(SRC).toContain('const targetSets = (adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS) + extraTargetSets;');
    expect(SRC).toContain('const workingLogged = countProgressSets(loggedSets);');
    expect(SRC).toContain('const targetComplete = targetSets && workingLogged >= targetSets;');
    expect(SRC).toContain('countdown={{ active: !!(autoAdvanceArmed && targetComplete && !extraSetArmed), ms: 1800, reduceMotion: !!reduceMotion }}');
  });

  test('when advance is present it IS the primary (variant primary, pinned testIDs); the logging primary does not co-render', () => {
    // Stage B (D220): there is no advance button and no second primary; the
    // check is the one logging control, Finish is the toolbar's alone.
    expect(SRC).not.toContain('<WorkoutBottomBar');
    expect(SRC).not.toContain('volyume-btn-next-exercise');
    expect(SRC).not.toContain("testID: 'volyume-btn-finish-primary'");
    expect(SRC).toContain('onFinish={handleFinishWorkout}');
    expect(SRC).toContain('onCheck: cluster ? finishCluster : handleCompleteSetPress,');
    expect(SET_ROW).toContain("const COMPLETE_SET_TEST_ID = 'volyume-btn-complete-set';");
    expect(SET_ROW).toContain("testID={ids.check ?? (check === 'next' ? COMPLETE_SET_TEST_ID : undefined)}");
    // The next section's header is the tap that moves on (the same jump the
    // outline made), and auto-advance still goes through handleNextExercise.
    expect(SRC).toContain('onPressHeader={() => handleJumpToExercise(i)}');
    expect(SRC).toMatch(/autoAdvanceRef\.current = setTimeout\(\(\) => \{\s*handleNextExercise\(\);\s*\}, 1800\);/);
  });

  test('the 1.8s countdown renders ON the primary CTA (countdownActive), never as a separate floating row', () => {
    // The old contradictory state is gone: no "Stay here" control, no
    // floating countdown row anywhere in the screen's render.
    expect(SRC).not.toContain('accessibilityLabel="Stay on this exercise"');
    expect(SRC).not.toContain('styles.autoAdvanceRow}');
    // Stage B (D220): the countdown is the active section's 2 dp footer
    // line, armed by the same gate, 1.8 s, decorative (hidden from assistive
    // tech), static under reduce-motion.
    expect(SRC).toContain('countdown={{ active: !!(autoAdvanceArmed && targetComplete && !extraSetArmed), ms: 1800, reduceMotion: !!reduceMotion }}');
    expect(SECTION).toContain('Animated.timing(progress, { toValue: 1, duration: ms, useNativeDriver: false }).start();');
    expect(SECTION).toContain('accessibilityElementsHidden');
    expect(SECTION).toContain('testID="volyume-countdown-line"');
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
    // Stage B (D220): the extra set is the active section's footer action
    // "Add set" (never a second primary: a label-and-glyph footer action).
    expect(SRC).toContain('onAddSet={armExtraSet}');
    expect(SECTION).toContain('testID="volyume-btn-extra-set"');
    // D220 addendum 15 (founder: no pill buttons): a glyph-and-label footer
    // action, never a boxed Button, so it can never read as a second primary.
    expect(SECTION).toMatch(/<FooterAction\s*testID="volyume-btn-extra-set"\s*icon="add"\s*label="Add set"/);
    expect(SECTION).not.toContain("import Button from");
  });

  test('arming cancels the countdown and returns the bar to Log set (prepare-not-commit, CL-6.1)', () => {
    const fn = SRC.match(/function armExtraSet\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fn).toContain('cancelAutoAdvance();');
    expect(fn).toContain('setExtraSetArmed(true);');
    // extraSetArmed still gates the SAME advance ternary; once true only the
    // logging primary remains, and it disarms on the next logged set or any
    // exercise change (the reset effect).
    expect(SRC).toContain('countdown={{ active: !!(autoAdvanceArmed && targetComplete && !extraSetArmed), ms: 1800, reduceMotion: !!reduceMotion }}');
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
    // Stage B (D220): the check stays through a per-side pair, relabelled to
    // commit side two; mid-cluster the check finishes the cluster.
    expect(SRC).toContain("const nextCheckLabel = cluster ? 'Finish cluster'");
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
    // D220 addendum 28 (2a): Add set before the target adds to this session's
    // target (extraTargetSets, reset on an exercise change); the fallback
    // chain inside the brackets is unchanged.
    expect(SRC).toContain('const targetSets = (adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS) + extraTargetSets;');
    expect(SRC).toContain('const pos = targetSets ? `Set ${workingLogged + 1} of ${targetSets}` : `Set ${workingLogged + 1}`;');
  });

  test('per-side pairs still count as ONE set toward whatever target resolves', () => {
    const fn = SRC.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const calls = fn.match(/handleCompleteSet\(/g) ?? [];
    expect(calls.length).toBe(1);
  });
});
