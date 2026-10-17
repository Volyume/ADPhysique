/**
 * Founder request 2026-10-17 (logger), source-level pins in
 * ActiveWorkoutScreen, written to FAIL on the code before the change:
 *   1. The set that finishes the session's work asks "That is everything".
 *   2. The set that finishes the LAST exercise while another was never started
 *      asks "Something left" (Go back / Finish anyway / Keep going), never
 *      twice for the same state; the ended-early confirm names the missed
 *      exercises and gains Go back; Finish anyway skips that confirm.
 *   3. Remove set: a per-exercise target map (not a single number reset on
 *      every exercise change), floored at logged + 1.
 *   4. A logged set's type is changed from its sheet and written through
 *      updateWorkoutSet, then renumbered and re-judged for a record.
 *   5. Renumber after a delete and a type change (database.renumberWorkoutSets).
 *   6. Reorder of logged sets is NOT built: see the note at the end.
 *   7. Delete set is deferred with an Undo toast; the real delete runs only
 *      when the toast closes, and always before a finish or on unmount.
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

describe('finish prompts (items 1 and 2)', () => {
  const logPath = () => between('// Founder request 2026-10-17: the set that finishes the session\'s work', '// Clear ghost, will be re-computed');

  test('the list the prompts judge has the just-logged set in it', () => {
    const w = logPath();
    expect(w).toMatch(/i === currentExerciseIndex \? \{ \.\.\.entry, sets: newLoggedSets \} : entry/);
  });

  test('"That is everything" needs the target hit, nothing missed and every exercise worked', () => {
    const w = logPath();
    expect(w).toContain('const everythingDone = !!justHitTarget && missedAfterLog.length === 0 && everyExerciseHasWorkingSet(afterLog);');
    expect(w).toContain("promptAfterFinalExercise(everythingDone ? 'done' : 'left', missedAfterLog)");
  });

  test('"Something left" needs the target hit on the LAST exercise with others never started', () => {
    expect(logPath()).toContain('const leftSomething = !!justHitTarget && isLastExercise && missedAfterLog.length > 0;');
  });

  test('a prompt cancels the auto-advance the lines above it armed', () => {
    const w = logPath();
    expect(w.indexOf('if (justHitTarget && !isLastExercise) {')).toBeLessThan(w.indexOf('promptAfterFinalExercise('));
    const fn = between('function promptAfterFinalExercise(kind, missed)', 'async function handleFinishWorkout()');
    expect(fn.indexOf('cancelAutoAdvance();')).toBeGreaterThan(-1);
    expect(fn.indexOf('cancelAutoAdvance();')).toBeLessThan(fn.indexOf('appAlert('));
  });

  test('copy and buttons: the finish prompt', () => {
    const fn = between('function promptAfterFinalExercise(kind, missed)', 'async function handleFinishWorkout()');
    expect(fn).toContain("'That is everything'");
    expect(fn).toContain("'Every exercise is done. Would you like to finish the workout?'");
    expect(fn).toMatch(/\{ text: 'Keep going', style: 'cancel' \},\s*\{ text: 'Finish', onPress: \(\) => \{ finishRef\.current\?\.\(\); \} \}/);
  });

  test('copy and buttons: the missed-exercise prompt', () => {
    const fn = between('function promptAfterFinalExercise(kind, missed)', 'async function handleFinishWorkout()');
    expect(fn).toContain("'Something left'");
    expect(fn).toContain('`You have not done ${missedNamesPhrase(missed)} yet.`');
    expect(fn).toContain("{ text: 'Go back', onPress: () => { jumpRef.current?.(missed[0].index); } }");
    expect(fn).toContain("text: 'Finish anyway'");
    expect(fn).toContain('skipEndedEarlyConfirmRef.current = true;');
    expect(fn).toMatch(/\{ text: 'Keep going', style: 'cancel' \}/);
  });

  test('the same state never prompts twice, and the buttons use the current render\'s handlers', () => {
    const fn = between('function promptAfterFinalExercise(kind, missed)', 'async function handleFinishWorkout()');
    expect(fn).toContain('if (endPromptKeyRef.current === key) return;');
    expect(fn).toContain("const key = `${kind}|${exercise?.id ?? ''}|${missed.map((m) => m.id).join(',')}`;");
    expect(SRC).toContain('finishRef.current = handleFinishWorkout;');
    expect(SRC).toContain('jumpRef.current = handleJumpToExercise;');
  });

  test('Finish anyway closes as ended early WITHOUT the ended-early confirm; an unlogged entry still gets a confirm', () => {
    const fn = between('async function handleFinishWorkout()', 'let pendingSessionResolution = null;');
    expect(fn).toContain('const skipEndedEarlyConfirm = skipEndedEarlyConfirmRef.current;');
    // Audit A3 (2026-10-17): read and cleared only AFTER the saving and
    // finishing guards, so a call they drop cannot use up the confirmation; it
    // is still cleared before any work, so it can never leak to a later tap.
    expect(fn.indexOf('skipEndedEarlyConfirmRef.current = false;')).toBeGreaterThan(fn.indexOf('if (finishingRef.current) return;'));
    expect(fn.indexOf('skipEndedEarlyConfirmRef.current = false;')).toBeLessThan(fn.indexOf('await flushPendingDeletes()'));
    const skip = between('if (isEndedEarly && skipEndedEarlyConfirm && !hasInProgressSetEntry()) {', 'const missedAtFinish');
    expect(skip).toContain("resolution: 'ended_early'");
    expect(skip).not.toContain('appAlert(');
  });

  test('the ended-early confirm names what was missed and offers Go back', () => {
    const conf = between('const missedAtFinish = missedExercises(snapshotExercises);', 'D218 (founder order 2026-10-03, audit F-7, F-19)');
    expect(conf).toContain('`You have not done ${missedNamesPhrase(missedAtFinish)} yet. `');
    expect(conf).toContain("text: 'Go back'");
    expect(conf).toContain('handleJumpToExercise(missedAtFinish[0].index)');
    // Keep going and Finish for today are still there.
    expect(conf).toContain("style: 'cancel'");
    expect(conf).toContain('text: copy.confirm');
  });
});

describe('Remove set (item 3)', () => {
  test('the target adjustment is a per-exercise map, not reset on an exercise change', () => {
    expect(SRC).toContain('const [targetAdjustments, setTargetAdjustments] = useState({});');
    expect(SRC).not.toContain('setExtraTargetSets');
    const reset = between('// An exercise change (a jump, an advance, a group jump) closes the keypad', 'function editIsDirty()');
    expect(reset).not.toContain('targetAdjustments');
  });

  test('targetSets applies the exercise\'s own adjustment and never drops below one', () => {
    expect(SRC).toContain('targetAdjustments[exercise?.id] ?? 0,');
    expect(SRC).toContain('1 - (adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS),');
    expect(SRC).toContain('const targetSets = (adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS) + extraTargetSets;');
  });

  test('Remove set steps the target down one, only while canRemovePendingSet allows it', () => {
    const fn = between('function handleRemoveSet()', 'function armExtraSet()');
    expect(fn).toContain('if (!canRemovePendingSet(targetSets, workingLogged)) return;');
    expect(fn).toContain('adjustTargetSets(-1);');
    expect(SRC).toContain('onRemoveSet={canRemovePendingSet(targetSets, workingLogged) ? handleRemoveSet : null}');
  });

  test('Add set before the target still adds a row, by the same map', () => {
    expect(between('function armExtraSet()', 'setExtraSetArmed(true)')).toContain('adjustTargetSets(+1)');
  });
});

describe('change a logged set\'s type (item 4) and renumber (item 5)', () => {
  test('the sheet is given the same options the next row\'s picker uses', () => {
    const sheet = between('<SetRowSheet', 'Exercise Picker Modal');
    expect(sheet).toContain("typeOptions={rowSheet?.kind === 'logged' ? SET_TYPE_OPTIONS : undefined}");
    expect(sheet).toContain('handleChangeLoggedSetType(rowSheet.set, value)');
  });

  test('the type is written through updateWorkoutSet, with the evidence class it would have been logged with', () => {
    const fn = between('async function handleChangeLoggedSetType(target, newType)', '// ─── Cluster sets');
    expect(fn).toContain("const newEvidenceClass = newType === 'warmup' ? null : currentEvidenceClass;");
    expect(fn).toContain('await updateWorkoutSet(target.id, { setType: newType, evidenceClass: newEvidenceClass });');
    // local state updates at once, so the row marker changes
    expect(fn).toContain('updateSetInCurrentExercise(target.id, fields);');
    expect(fn).toContain('setLoggedSets((prev) => prev.map((x) => (x.id === target.id ? { ...x, ...fields } : x)));');
  });

  test('a set that stops being a working set loses its record; one that becomes working is judged again', () => {
    const fn = between('async function handleChangeLoggedSetType(target, newType)', '// ─── Cluster sets');
    expect(fn).toContain('if (isWeightReps && isWorkingSetRow({ setType: newType })) {');
    expect(fn).toContain('...loggedSets.filter((x) => x.id !== target.id && isWorkingSetRow(x)),');
    expect(fn).toContain('detectPR({ weight, actualReps, setType: newType, evidenceClass: newEvidenceClass }, history, exercise, units)');
    expect(fn).toContain('const without = prev.filter((r) => r.setId !== target.id);');
    expect(fn).toContain('if (!cur || cur.setId !== target.id) return prev;');
  });

  test('it renumbers in the database and in local state', () => {
    const fn = between('async function handleChangeLoggedSetType(target, newType)', '// ─── Cluster sets');
    expect(fn).toContain('await renumberWorkoutSets(activeWorkout.id, exercise.id);');
    expect(fn).toContain('renumberLocalSets(exercise.id);');
  });
});

describe('Delete set with Undo (item 7)', () => {
  test('the row sheet\'s Delete set defers; there is no confirm', () => {
    expect(SRC).toContain("onDelete={rowSheet?.kind === 'logged' ? () => openDeleteFromMenu(rowSheet.set) : undefined}");
    expect(between('function openDeleteFromMenu(set)', 'useRef(false)')).toContain('handleDeleteSetWithUndo(set);');
    expect(SRC).not.toContain("'Delete set?'");
    expect(SRC).not.toContain('This cannot be undone.');
  });

  test('the row leaves the screen, the store and the PR lists at once; nothing is hard-deleted yet', () => {
    const fn = between('function handleDeleteSetWithUndo(target)', 'async function handleChangeLoggedSetType');
    expect(fn).toContain('removeSetFromCurrentExercise(target.id);');
    expect(fn).toContain('setLoggedSets((prev) => prev.filter((x) => x.id !== target.id));');
    expect(fn).toContain('sessionSetsRef.current = sessionSetsRef.current.filter((x) => x.id !== target.id);');
    expect(fn).toContain('setDetectedPRs((prev) => prev.filter((r) => r.setId !== target.id));');
    expect(fn).not.toContain('await deleteWorkoutSet(');
    // the undo toast, with the exact copy, and the commit on close
    expect(fn).toContain("toast.show('Set deleted.', {");
    expect(fn).toContain("variant: 'undo',");
    expect(fn).toContain("action: { label: 'Undo', onPress: () => undoDeleteSet(target.id) },");
    expect(fn).toContain('onTimeout: () => { commitPendingDelete(target.id, true); },');
  });

  test('Undo is local state only: it never touches the database or the cloud', () => {
    const fn = between('function undoDeleteSet(setId)', 'async function commitPendingDelete(setId, fromToast = false)');
    expect(fn).toContain('restoreRemovedSet(p);');
    expect(fn).not.toMatch(/deleteWorkoutSet|renumberWorkoutSets|deleteWorkoutSetFromCloud|enqueueSyncOp|updateWorkoutSet/);
  });

  test('the real delete keeps the hard local delete, the cloud delete and the queued tombstone, then renumbers', () => {
    const fn = between('async function commitPendingDelete(setId, fromToast = false)', 'function flushPendingDeletes()');
    expect(fn).toContain('await deleteWorkoutSet(p.userId, setId);');
    expect(fn).toContain('deleteWorkoutSetFromCloud(p.supabaseUserId, setId)');
    expect(fn).toContain("enqueueSyncOp('workout_set_delete', setId, p.supabaseUserId)");
    expect(fn.indexOf('deleteWorkoutSet(')).toBeLessThan(fn.indexOf('renumberWorkoutSets('));
    expect(fn).toContain('await renumberWorkoutSets(p.workoutId, p.exerciseId);');
    // a failed delete puts the row back and says so, instead of hiding a stored set
    expect(fn).toContain('restoreRemovedSet(p);');
    expect(fn).toContain("appAlert('Could not delete set'");
  });

  test('a pending delete is committed before a finish counts sets, and when the screen goes', () => {
    const head = between('async function handleFinishWorkout()', 'const snapshotExercises');
    expect(head).toContain('await flushPendingDeletes();');
    expect(head.indexOf('if (saving) return;')).toBeLessThan(head.indexOf('await flushPendingDeletes();'));
    expect(SRC).toContain('useEffect(() => () => { flushPendingDeletesRef.current(); }, []);');
  });
});

describe('Move up / Move down for logged sets (item 6) is NOT built', () => {
  test('the logged list is ordered by log order in memory, not by a stored field that can be swapped', () => {
    // loggedSets comes from the store entry's `sets` array, appended in the
    // order sets are logged (addSetToCurrentExercise); the stored order is
    // created_at. Nothing here orders by set_number (which repeats across
    // kinds), so a reorder control is not added. See the build report.
    expect(SRC).toContain('const newLoggedSets = [...loggedSets, setData];');
    expect(SRC).not.toContain('Move up');
    expect(SRC).not.toContain('Move down');
  });
});
