/**
 * Source-level regression guard — "Next exercise" button on target reached.
 *
 * Founder ruling (2026-07-10, verbatim): "After set number of sets it should
 * give a button for next exercise not just show you to do many more sets."
 *
 * ActiveWorkoutScreen.js is a huge screen with a live dependency surface
 * (store, SQLite, notifications, Live Activity, haptics); mounting it is
 * impractical, so — matching this file's existing convention (reorder.guard,
 * supersetRest.guard, unilateral.guard, usability.guard) — these are
 * byte-level checks against the source that pin the exact behaviour:
 *
 *   1. The bottom-bar primary action swaps to "Next exercise" only once the
 *      exercise's planned/adjusted working-set target is reached
 *      (targetComplete = targetSets && workingLogged >= targetSets), and
 *      only while no extra set has been armed. Before target it stays the
 *      ordinary "Log set" action — no button, no auto-navigation.
 *   2. Logging MORE sets than planned stays possible: "Log another set"
 *      (volyume-btn-extra-set) arms extraSetArmed, which flips the bottom
 *      bar straight back to the normal Log set action — the button is an
 *      offer, never a wall (D8 junk-volume: extra sets are the user's call).
 *   3. On the last exercise, the same slot offers "Finish workout" instead,
 *      routed through handleFinishWorkout so its conditional confirm logic
 *      (shouldConfirmBeforeFinish / hasInProgressSetEntry) still applies.
 *   4. Both the button row and the whole bottom bar are hidden while a
 *      cluster or a per-side (D9 unilateral) pair is mid-flight, so a
 *      two-phase per-side set — which logs ONE row for the pair — cannot
 *      show "Next exercise" mid-pair.
 *
 * Founder follow-up (same day): the button "doesn't always happen ... it
 * goes on and adds more and more sets". Root cause: targetSets used to be
 * adjustedSetCount alone, which is undefined for any exercise slot with no
 * routineExercise row - a blank/freeform workout (HomeScreen's "Just want to
 * log? Start a blank workout", startWorkout(workout, [])) and ANY exercise
 * added mid-session via the "+ Add exercise" picker both hit this, because
 * addExerciseToWorkout(exercise, routineExercise = null) in useAppStore.js
 * defaults routineExercise to null and the screen's only call site
 * (handlePickerSelect) passes just the exercise. `undefined && n >= undefined`
 * is always falsy, so targetComplete never fires for those slots and the
 * entry card offers a plain "Log set" forever - exactly the reported
 * behaviour. The fix gives targetSets an explicit, non-silent fallback
 * chain (below) so it always resolves to a real number.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

// The bottom-pinned action bar: from the (cluster || perSide) guard through
// the closing of that ternary, just before the Exercise Picker Modal comment.
//
// CP-10 stage 3 (theming FINAL batch, 2026-07-10): ActiveWorkoutScreen now
// reads a live theme (src/hooks/useTheme.js), so `styles.bottomBar` gained a
// `live.bottomBar` neighbour in its style array (frozen `styles` block is
// byte-identical; only the JSX call site grew). The regex below is widened
// to allow that, no other change to the pinned shape.
const bottomBarWindow = SRC.match(
  /\{\(cluster \|\| perSide\) \? null : \(\s*<View style=\{\[styles\.bottomBar, live\.bottomBar,[\s\S]*?\)\}\n\s*<\/View>\s*\)\}/,
)?.[0] ?? '';

describe('target-reached bottom bar swaps "Next exercise" / "Finish workout" in for "Log set"', () => {
  test('the swap gate is targetComplete && !extraSetArmed, not tied to anything else', () => {
    expect(SRC).toContain('const targetSets = adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS;');
    expect(SRC).toContain('const workingLogged = countProgressSets(loggedSets);');
    expect(SRC).toContain('const targetComplete = targetSets && workingLogged >= targetSets;');
    expect(bottomBarWindow).toContain('{targetComplete && !extraSetArmed ? (');
  });

  test('reaching target on a non-last exercise shows "Next exercise", wired to the existing handleNextExercise nav', () => {
    expect(bottomBarWindow).toContain('testID="volyume-btn-next-exercise"');
    expect(bottomBarWindow).toContain('onPress={handleNextExercise}');
    expect(bottomBarWindow).toContain('accessibilityLabel="Move to next exercise"');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): live theme override
    // appended after the frozen style, same mechanical change as above.
    expect(bottomBarWindow).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.completeBtnText, live.completeBtnText]}>Next exercise</Text>');
  });

  test('reaching target on the last exercise shows "Finish workout" instead, routed through handleFinishWorkout', () => {
    expect(bottomBarWindow).toContain('isLastExercise ? (');
    expect(bottomBarWindow).toContain('testID="volyume-btn-finish-primary"');
    expect(bottomBarWindow).toContain('onPress={handleFinishWorkout}');
    expect(bottomBarWindow).toContain('accessibilityLabel="Finish workout"');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): live theme override
    // appended after the frozen style, same mechanical change as above.
    expect(bottomBarWindow).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.completeBtnText, live.completeBtnText]}>Finish workout</Text>');
  });

  test('a trailing time-crunch-skipped exercise cannot leave the finish offer unreachable: last means no un-skipped exercise remains after this one', () => {
    // Product ruling 2026-07-10: handleNextExercise skips _timeCrunchSkipped
    // slots, so isLastExercise must use the same skip-aware definition or the
    // second-to-last slot would show a Next button that no-ops.
    expect(SRC).toContain('const isLastExercise = !workoutExercises.some(');
    expect(SRC).toContain('(entry, i) => i > currentExerciseIndex && !entry?._timeCrunchSkipped,');
    expect(SRC).not.toContain('const isLastExercise = currentExerciseIndex === workoutExercises.length - 1;');
  });

  test('before target is reached, the bar still shows the ordinary Log set action, never the nav buttons', () => {
    expect(bottomBarWindow).toContain('testID="volyume-btn-complete-set"');
    expect(bottomBarWindow).toContain('onPress={handleCompleteSetPress}');
    // The Log set branch is the ELSE of the same ternary the nav buttons live
    // in, so it can only render when targetComplete && !extraSetArmed is false.
    const logSetIndex = bottomBarWindow.indexOf('testID="volyume-btn-complete-set"');
    const nextExerciseIndex = bottomBarWindow.indexOf('testID="volyume-btn-next-exercise"');
    const gateIndex = bottomBarWindow.indexOf('{targetComplete && !extraSetArmed ? (');
    expect(gateIndex).toBeGreaterThanOrEqual(0);
    expect(nextExerciseIndex).toBeGreaterThan(gateIndex);
    expect(logSetIndex).toBeGreaterThan(nextExerciseIndex);
  });
});

describe('extra sets beyond the plan stay loggable (D8 junk-volume: never a wall)', () => {
  test('"Log another set" is offered once target is reached and not yet armed', () => {
    expect(SRC).toContain('testID="volyume-btn-extra-set"');
    expect(SRC).toContain('onPress={() => setExtraSetArmed(true)}');
    expect(SRC).toContain('accessibilityLabel="Log another set"');
    expect(SRC).toMatch(/\(cluster \|\| perSide\) \? null : \(targetComplete && !extraSetArmed\) \? \(\s*<Button\s*testID="volyume-btn-extra-set"/);
  });

  test('arming extraSetArmed flips the bottom bar back to the normal Log set action', () => {
    // extraSetArmed is part of the SAME gate the nav buttons check, so once
    // true, targetComplete && !extraSetArmed is false and the bar falls
    // through to the ordinary Log-set branch even though target was met.
    expect(bottomBarWindow).toContain('{targetComplete && !extraSetArmed ? (');
    expect(SRC).toContain('const [extraSetArmed, setExtraSetArmed] = useState(false);');
  });
});

describe('the button never shows mid-exercise, and never mid a per-side pair', () => {
  test('targetComplete requires the logged working-set count to reach the target, so pre-target never satisfies the gate', () => {
    expect(SRC).toContain('const targetComplete = targetSets && workingLogged >= targetSets;');
  });

  test('the whole bottom bar (and its Next exercise / Finish slot) is hidden while a cluster or per-side pair is mid-flight', () => {
    expect(SRC).toMatch(/\{\(cluster \|\| perSide\) \? null : \(\s*<View style=\{\[styles\.bottomBar/);
  });

  test('the promoted "Log another set" row is likewise hidden mid-cluster/mid-per-side', () => {
    expect(SRC).toMatch(/\(cluster \|\| perSide\) \? null : \(targetComplete && !extraSetArmed\) \? \(/);
  });

  test('no auto-navigation fires on reaching target from this change — advancing is a tap, never automatic', () => {
    // The pre-existing auto-advance timer (C3) is a separate, cancellable,
    // visibly-announced countdown ("Next exercise in a moment / Stay here"),
    // not something this fix adds to or silently extends.
    expect(SRC).toContain('Next exercise in a moment');
    expect(SRC).toContain('accessibilityLabel="Stay on this exercise"');
  });
});

describe('target-set fallback matrix: targetSets always resolves to a real number', () => {
  test('root cause is pinned: addExerciseToWorkout still defaults routineExercise to null', () => {
    // If this default is ever removed, the fallback chain below is still
    // correct (harmless no-op), but the root-cause note above would go
    // stale — this assertion is a tripwire, not a requirement to keep the
    // default, so update the comment above if it ever changes.
    const STORE = fs.readFileSync(
      path.join(__dirname, '..', '..', 'store', 'useAppStore.js'),
      'utf8',
    );
    expect(STORE).toContain('addExerciseToWorkout: (exercise, routineExercise = null) => {');
    expect(SRC).toContain('addExerciseToWorkout(ex);');
  });

  test('auto-generated / manual-builder / swapped-in slots (routineExercise present) resolve via adjustedSetCount, unaffected by the new fallback', () => {
    // adjustedSetCount itself already folds routineExercise?.recommendedSets
    // in via comp015SetCount when there is no active session adjustment —
    // this fix only adds what happens when adjustedSetCount is falsy.
    expect(SRC).toContain('const comp015SetCount = (sessionAdjustment && sessionAdjustment.setDelta !== 0)');
    expect(SRC).toContain('recommendedSets;');
    // handleConfirmSwap deliberately keeps the slot's planned set count
    // (rebuiltRoutineEx spreads prevRoutineEx), so a swapped-in exercise
    // still carries a routineExercise with recommendedSets.
    const swapWindow = SRC.match(/function handleConfirmSwap\(newExercise\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(swapWindow).toContain('const rebuiltRoutineEx = prevRoutineEx');
    expect(swapWindow).toContain('...prevRoutineEx,');
  });

  test('a slot with no routineExercise at all falls back to DEFAULT_FREEFORM_TARGET_SETS, never to undefined', () => {
    expect(SRC).toContain('const DEFAULT_FREEFORM_TARGET_SETS = 3;');
    expect(SRC).toContain('const targetSets = adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS;');
    // Re-pinned for D43 S2: the separate "Target: N sets - X-Y reps" display
    // line is retired (folded into orientationLabel's own "Set X of
    // targetSets" text on the Now card's Line 1). targetSets is the single
    // shared source for that display now, so this pins targetSets itself
    // being read straight into orientationLabel's set-position text, the
    // same DEFAULT_FREEFORM_TARGET_SETS fallback chain asserted above.
    expect(SRC).toContain('const pos = targetSets ? `Set ${workingLogged + 1} of ${targetSets}` : `Set ${workingLogged + 1}`;');
  });

  test('per-side pairs still count as ONE set toward whatever target resolves', () => {
    // finishPerSide commits through the single shared handleCompleteSet path
    // (one workout_sets row per pair), and countProgressSets counts rows —
    // so a per-side exercise reaches its (now-guaranteed) target after N
    // pairs, not 2N, whether the exercise is plan-driven or freeform.
    const fn = SRC.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const calls = fn.match(/handleCompleteSet\(/g) ?? [];
    expect(calls.length).toBe(1);
  });
});
