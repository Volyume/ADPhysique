/**
 * RoutineDetailScreen.typedSets.guard.test.js -- D219 lane B7 (lead ruling 6,
 * design 4.3, docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md):
 * a set count the person types for an exercise of a plan the new planner built
 * is theirs for the rest of the block. saveEdit writes it to the routine row as
 * it always did, and now also records it in the plan's facts
 * (recordTypedSetCount: facts.typed[routineExerciseId]), which the reader hands
 * to prescribe() so the count is served as typed in every week, with no climb
 * on top of it.
 *
 * Source-level pin (repo convention: fs.readFileSync + regex), matching
 * RoutineDetailScreen.saveEditToast.guard.test.js and the other guards for this
 * screen, whose real data loads make a render harness heavy. What the write
 * does is pinned behaviourally in database.planFactsServe.test.js, and what the
 * reader makes of it in planFacts.slotsTyped.test.js. Pinned here:
 *  - the screen imports recordTypedSetCount from the database module;
 *  - saveEdit records the count only on the ordinary (non-circuit) branch, only
 *    when the person CHANGED the set count (an edit of reps or rest alone must
 *    not freeze the plan's own sets), after the routine row is written, for the
 *    routine's own programme and the edited routine exercise, and a failure to
 *    record is logged and never blocks the edit;
 *  - a circuit station's rounds are never recorded (they are not a set count).
 */
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);
const SAVE_EDIT = ROUTINE_DETAIL.match(/async function saveEdit\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

describe('saveEdit records a typed set count for a plan the new planner built (D219 lane B7)', () => {
  test('the database function is imported by the screen', () => {
    const importBlock = ROUTINE_DETAIL.match(/import \{[^}]*\} from '\.\.\/lib\/database';/)?.[0] ?? '';
    expect(importBlock).toContain('recordTypedSetCount');
  });

  test('the ordinary branch records it, after the routine row is written', () => {
    const ordinary = SAVE_EDIT.slice(SAVE_EDIT.indexOf('} else {'));
    expect(ordinary).toContain('await recordTypedSetCount(routine?.programmeId, editingExercise.routineExercise.id, sets);');
    expect(ordinary.indexOf('await updateRoutineExercise(')).toBeGreaterThan(-1);
    expect(ordinary.indexOf('await recordTypedSetCount(')).toBeGreaterThan(ordinary.indexOf('await updateRoutineExercise('));
  });

  test('only a CHANGED set count is recorded: editing reps or rest alone leaves the plan\'s own sets alone', () => {
    expect(SAVE_EDIT).toMatch(/if \(sets !== Number\(editingExercise\.routineExercise\.recommendedSets\)\) \{\s*try \{\s*await recordTypedSetCount\(/);
  });

  test('a failure to record is logged and never blocks the edit', () => {
    const recordIdx = SAVE_EDIT.indexOf('await recordTypedSetCount(');
    const tail = SAVE_EDIT.slice(recordIdx);
    expect(tail).toMatch(/^[^]*?\} catch \(e\) \{\s*logError\('RoutineDetailScreen\.recordTypedSetCount', e, \{ routineId \}\);\s*\}/);
    // The edit still closes and reloads after it.
    expect(tail.indexOf('setEditingExercise(null);')).toBeGreaterThan(tail.indexOf('logError('));
    expect(tail).toContain('await loadRoutine();');
  });

  test('a circuit station\'s rounds are never recorded, and nothing is recorded before validation', () => {
    const circuit = SAVE_EDIT.slice(SAVE_EDIT.indexOf('if (editingIsCircuit) {\n      // F-17'), SAVE_EDIT.indexOf('} else {'));
    expect(circuit.length).toBeGreaterThan(200);
    expect(circuit).not.toContain('recordTypedSetCount');
    const guardIdx = SAVE_EDIT.indexOf('if (!sets || !repsMin || !repsMax) {');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(SAVE_EDIT.indexOf('recordTypedSetCount')).toBeGreaterThan(guardIdx);
  });

  test('it is the only caller on the screen, so a count typed elsewhere is not silently marked', () => {
    expect(ROUTINE_DETAIL.match(/recordTypedSetCount\(/g)).toHaveLength(1);
  });
});
