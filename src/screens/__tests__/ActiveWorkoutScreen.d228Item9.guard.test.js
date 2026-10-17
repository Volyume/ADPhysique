/**
 * Source-level guard for D228 item 9 (the logger's two small improvements):
 *
 *  A. "Use last session" in the exercise's More sheet fills the pending
 *     sets from last session by position, through the same code the Last
 *     cell's single tap uses (so entry provenance stays correct), and logs
 *     nothing. Hidden for warm-up, cluster, per-side and superset entries.
 *  B. Tick-all (the ALL column word) now also serves a superset member
 *     (this exercise's remaining sets only, no partner jump) and a
 *     per-side exercise (each remaining row is ONE set with both sides,
 *     the one-row storage invariant finishPerSide keeps).
 *
 * The screen is too large to mount, so, as the sibling guards do, these
 * read the source. Each pin names the behaviour it protects.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');
// The overflow sheet's JSX moved to SessionSheets.js (D228 item 9, monolith
// first cut); the row's strings and its show condition are read from there.
const SHEETS = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'workout', 'session', 'SessionSheets.js'), 'utf8');
const body = (startMarker, endMarker) => {
  const a = SRC.indexOf(startMarker);
  expect(a).toBeGreaterThan(-1);
  const b = SRC.indexOf(endMarker, a);
  expect(b).toBeGreaterThan(a);
  return SRC.slice(a, b);
};

describe('"Use last session" overflow row', () => {
  test('the row exists with its exact label and sub', () => {
    expect(SHEETS).toContain('accessibilityLabel="Use last session"');
    expect(SHEETS).toContain('>Use last session</Text>');
    expect(SHEETS).toContain('Fill the pending sets from last time');
  });

  test('it is shown only with a last session, a pending row and a plain straight entry', () => {
    const cond = body('const canUseLastSession =', 'The bar\'s last action');
    expect(cond).toContain('prevWorkingSets.length > 0');
    expect(cond).toContain('nextRowShown && pendingCount > 0');
    expect(cond).toContain('currentSGI == null');
    expect(cond).toContain('!isWarmupEntry && !cluster && !perSide');
    expect(cond).toContain('!isClusterType(currentSet.setType)');
    expect(cond).toContain('unilateralExercises.has(exercise.id)');
    expect(SHEETS).toContain('{canUseLastSession && (');
  });

  test('tapping it fills the entry and logs nothing', () => {
    const fn = body('function handleUseLastSession()', 'useEffect(() => { setUseLastRunId(null)');
    expect(fn).toContain('setUseLastRunId(exercise?.id ?? null);');
    expect(fn).toContain('applyLastSetToEntry(lastCellFor(workingLogged))'.replace('lastCellFor(workingLogged)', 'lc'));
    expect(fn).not.toMatch(/handleCompleteSet|startPerSide|finishPerSide|startRestTimer|logSet|addWorkoutSet/);
  });

  test('the Last cell tap and Use last session share one entry writer (same provenance path)', () => {
    expect(SRC).toContain('applyLastSetToEntry(nextLast);');
    const w = body('function applyLastSetToEntry(lc)', 'function handleUseLastSession()');
    expect(w).toContain('setCurrentSet(');
    // seededEntryRef is NOT touched: the entry stays "typed" (entry_typed).
    expect(w).not.toContain('seededEntryRef');
  });

  test('after each log the next entry follows last session by position, seed left as the resolver wrote it', () => {
    expect(SRC).toContain('const lc = lastCellFor(seedPosForCompletedSet);');
    expect(SRC).toContain('if (lc) applyLastSetToEntry(lc);');
    expect(SRC).toContain('useLastRunId === (exercise?.id ?? null) && !isClusterType(currentSet.setType)');
  });

  test('pending rows show last session\'s numbers while it is on, and it clears on an exercise change', () => {
    expect(SRC).toContain('const followLast = useLastRunId != null && useLastRunId === (exercise?.id ?? null) && lc;');
    expect(SRC).toContain('useEffect(() => { setUseLastRunId(null); }, [currentExerciseIndex]);');
  });
});

describe('tick-all for a superset member', () => {
  const tick = body('const tickAllCount = (', ') ? pendingCount : 0;');

  test('the superset exclusion is gone; circuits stay out', () => {
    expect(tick).not.toContain('currentSGI == null\n');
    expect(tick).toContain('(currentSGI == null || !isCircuitGroup)');
  });

  test('while a run is on for this exercise the partner jump and round-return cannot fire', () => {
    expect(SRC).toContain('if (tickAllRemainingRef.current > 0 && tickAllRunRef.current?.exerciseId === (exercise?.id ?? null)) {\n          sgi = null;\n          pairIdx = -1;');
    // After the forward-only rule and before the jump itself.
    const rule = SRC.indexOf('i > currentExerciseIndex && e.supersetGroupId === sgi');
    const reset = SRC.indexOf('sgi = null;\n          pairIdx = -1;');
    const jump = SRC.indexOf('if (pairIdx >= 0) {\n          setCurrentExerciseIndex(pairIdx);');
    expect(rule).toBeLessThan(reset);
    expect(reset).toBeLessThan(jump);
  });
});

describe('tick-all for a per-side exercise', () => {
  test('the unilateral exclusion is gone from tickAllCount', () => {
    const tick = body('const tickAllCount = (', ') ? pendingCount : 0;');
    expect(tick).not.toContain('unilateralExercises');
    expect(tick).toContain('!perSide');
  });

  test('each remaining row is ONE handleCompleteSet with both sides, the finishPerSide shape', () => {
    const step = body('function tickAllStep()', 'function clearTickAll()');
    expect(step).toContain('unilateralExercises.has(exercise.id)');
    expect(step).toContain('return handleCompleteSet({');
    expect(step).toContain('actualReps: reps,');
    expect(step).toContain("perSideCompound: exercise?.compoundIsolation === 'compound',");
    // The one-row invariant: no left/right reps are ever written.
    expect(step).not.toMatch(/leftReps|rightReps|left_reps|right_reps/);
    expect(step).toContain('return handleCompleteSetPress();');
  });

  test('both tick-all call sites go through the step', () => {
    expect(SRC).toContain('tickAllRunRef.current = { exerciseId: exercise?.id ?? null, expectedLength: loggedSets.length, total: count };\n            tickAllStep();');
    expect(SRC).toContain('if (tickAllRemainingRef.current > 0) tickAllStep();');
  });
});
