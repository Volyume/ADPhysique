/**
 * Logger audit (2026-10-17), source-level pins for the lead-verified findings
 * in ActiveWorkoutScreen, written to FAIL on the code before the fix:
 *   1. Finish does nothing while a set save is in flight.
 *   2. Finishing mid-rest stops the rest timer (Live Activity) before endWorkout.
 *   3. A finish and a discard remove this workout's set drafts.
 *   4. Tick-all continuation re-runs when `saving` ends.
 *   5. A throw AFTER createWorkoutSet never says the set was not saved; the
 *      post-save work has its own try/catch (ActiveWorkout.postSave).
 *   6. The pending set draft is flushed, not dropped, when the workout or
 *      exercise changes or the screen goes.
 *   7. A refused keystroke gives a light haptic from the existing vocabulary.
 *   8. A finished tick-all run gives one beat and one spoken line.
 *   9. Delete set is a DEFERRED hard delete with an Undo toast (re-pinned
 *      2026-10-17 on the founder's request and the lead's ruling; it was a
 *      confirm with no Undo). The queue still cannot withdraw a tombstone, so
 *      the Undo is safe only because nothing is deleted until the toast closes
 *      without it: Undo is local state, the real hard delete + cloud delete +
 *      queued tombstone run at close, a finish or unmount.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');
const between = (a, b) => {
  const i = SRC.indexOf(a);
  expect(i).toBeGreaterThan(-1);
  const j = SRC.indexOf(b, i + a.length);
  expect(j).toBeGreaterThan(i);
  return SRC.slice(i, j);
};

describe('logger finish and save safety (audit 2026-10-17)', () => {
  test('1. Finish returns early while a set save is in flight', () => {
    const head = between('async function handleFinishWorkout()', 'const snapshotExercises');
    expect(head).toMatch(/if \(saving\) return;/);
    expect(head.indexOf('if (saving) return;')).toBeLessThan(head.indexOf('setFinishingFlag(true)'));
  });

  test('2. finish stops an active rest timer before endWorkout()', () => {
    const tail = between('const finishedPRs = detectedPRs;', "hapticsVocab.workoutComplete();");
    expect(tail).toMatch(/restTimerActive\) \{\s*useAppStore\.getState\(\)\.stopRestTimer\(\);/);
    expect(tail.indexOf('stopRestTimer()')).toBeLessThan(tail.indexOf('endWorkout();'));
  });

  test('3. finish, discard and the silent empty discard all remove the workout drafts', () => {
    const helper = between('function clearWorkoutDrafts(workoutId)', 'async function discardWorkout');
    expect(helper).toContain('@volyume_setdraft_${workoutId}_');
    expect(helper).toContain('AsyncStorage.getAllKeys()');
    expect(helper).toContain('AsyncStorage.multiRemove(mine)');
    expect(helper).toMatch(/\.catch\(\(\) => \{ \/\*/); // best effort, with a comment
    const finish = between('const finishedPRs = detectedPRs;', 'hapticsVocab.workoutComplete();');
    expect(finish).toContain('clearWorkoutDrafts(activeWorkout.id);');
    const discard = between('async function discardWorkout', 'function handleCancelWorkout()');
    expect(discard).toContain('clearWorkoutDrafts(discardId);');
    const cancel = between('function handleCancelWorkout()', 'function confirmDiscard');
    expect(cancel).toContain('clearWorkoutDrafts(activeWorkout?.id);');
  });

  test('4. tick-all continuation waits on saving and re-runs when it ends', () => {
    const effect = between('useEffect(() => {\n    if (tickAllRemainingRef.current <= 0) return;', 'useEffect(() => { clearTickAll(); }, [currentExerciseIndex]);');
    expect(effect).toMatch(/if \(saving\) return;/);
    expect(effect).toMatch(/\}, \[loggedSets\.length, saving\]\);/);
  });

  test('5. post-save work has its own try/catch and never says "not saved"', () => {
    const fn = between('async function handleCompleteSet(overrides = {})', '// ─── Edit / delete an already-logged set');
    expect(fn).toContain('let setPersisted = false;');
    expect(fn.indexOf('setPersisted = true;')).toBeGreaterThan(fn.indexOf('await createWorkoutSet('));
    expect(fn.indexOf('setPersisted = true;')).toBeLessThan(fn.indexOf('detectPR('));
    expect(fn).toContain("logError('ActiveWorkout.postSave', postSaveError");
    // The inner try closes before the rest timer starts, so a PR or
    // prescription throw cannot stop it.
    expect(fn.indexOf("logError('ActiveWorkout.postSave', postSaveError"))
      .toBeLessThan(fn.indexOf('startRestTimer('));
    // A throw after the row is stored is logged, not announced as a failed save.
    expect(fn).toMatch(/if \(setPersisted\) \{[\s\S]*?logError\('ActiveWorkout\.postSave', e,[\s\S]*?\} else \{[\s\S]*?Your set was not saved\./);
    expect(fn).not.toContain("wasn't saved");
  });

  test('6. the pending draft is flushed when the workout or exercise changes or the screen goes', () => {
    const flush = between('const draftsClearedForRef = useRef(null);', 'if (!activeWorkout?.id || !exercise?.id) { draftRef.current = null;');
    expect(flush).toMatch(/useEffect\(\(\) => \(\) => \{/);
    expect(flush).toContain('AsyncStorage.setItem(pending.key, JSON.stringify(pending.payload))');
    expect(flush).toContain('}, [activeWorkout?.id, exercise?.id]);');
    // A finished or discarded workout's draft is never written back.
    expect(flush).toContain('draftsClearedForRef.current');
    // The timer is marked written once it fires, so only a pending one flushes.
    expect(SRC).toMatch(/draftSaveTimer\.current = setTimeout\(\(\) => \{\s*draftSaveTimer\.current = null;/);
  });

  test('7. a refused keystroke (reps, weight) gives the light press haptic', () => {
    const fn = between('function handleInputChange(raw)', '// An iOS number pad has no return key');
    expect(fn).toMatch(/else hapticsVocab\.press\(\);[^\n]*\n\s*\} else if \(text === ''\)/);
    expect(fn).toMatch(/if \(ok\) writeActiveField\('weight', text\);\s*else hapticsVocab\.press\(\);/);
  });

  test('8. a finished tick-all run gives one beat and one spoken line', () => {
    const effect = between('useEffect(() => {\n    if (tickAllRemainingRef.current <= 0) return;', 'useEffect(() => { clearTickAll(); }, [currentExerciseIndex]);');
    expect(effect).toContain('hapticsVocab.commit();');
    expect(effect).toContain("announceForAccessibility(`${total} ${total === 1 ? 'set' : 'sets'} logged.`)");
    expect(SRC).toContain('total: count };');
  });

  test('9. Delete set is deferred behind an Undo toast; the hard delete and its tombstone run only at close', () => {
    // Re-pinned 2026-10-17: the old pin (a confirm, "no Undo is built") held
    // while the delete ran at once. The delete now waits for the toast to
    // close, so an Undo has nothing to withdraw.
    const start = between('function handleDeleteSetWithUndo(target)', 'async function handleChangeLoggedSetType');
    expect(start).not.toContain('deleteWorkoutSet(');
    expect(start).toContain("variant: 'undo'");
    expect(start).toContain('onTimeout: () => { commitPendingDelete(target.id, true); },');
    const commit = between('async function commitPendingDelete(setId, fromToast = false)', 'function flushPendingDeletes()');
    expect(commit).toContain('await deleteWorkoutSet(p.userId, setId);');
    expect(commit).toContain("enqueueSyncOp('workout_set_delete'");
    expect(SRC).not.toContain('This cannot be undone.');
  });
});
