// EL-9 (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md): a
// circuit shows with the SAME read-only chip style supersets use, plus
// rounds and round rest. Source-guard, matching this file's existing
// convention (RoutineDetailScreen.startWeightPlaceholder.guard.test.js) -
// this screen is impractical to mount in a test (SQLite, capability lane,
// swap sheet - see the other guard files' own header comments).
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

describe('RoutineDetailScreen circuit chip (EL-9)', () => {
  test('a circuit group reads its kind from routineExercise.groupKind, not a new field', () => {
    expect(ROUTINE_DETAIL).toMatch(/routineExercise\?\.groupKind === 'circuit'/);
  });

  test('the chip label reads "Circuit <letter>", reusing the superset chip style', () => {
    expect(ROUTINE_DETAIL).toMatch(/\{isCircuit \? 'Circuit' : 'Superset'\}/);
    expect(ROUTINE_DETAIL).toMatch(/styles\.supersetChip/);
  });

  test('the meta line shows rounds and round rest for a circuit, sets and rest otherwise', () => {
    expect(ROUTINE_DETAIL).toMatch(/round\{routineExercise\.recommendedSets === 1 \? '' : 's'\}/);
    expect(ROUTINE_DETAIL).toMatch(/roundRestSeconds/);
  });

  test('the tooltip explains the circuit gloss, not the superset one, on a circuit chip', () => {
    expect(ROUTINE_DETAIL).toMatch(/isCircuit \? GLOSSARY\.circuit : GLOSSARY\.superset/);
  });
});
