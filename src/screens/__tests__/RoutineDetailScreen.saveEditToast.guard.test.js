// Campaign 24 Wave A, WAVE-A-FINDINGS.md STATE_DEFECT (:296-311). saveEdit
// used to return silently on invalid sets/reps input (0/NaN, e.g. the user
// clears a field and taps Save): no toast, no visible reason the BottomSheet
// stayed open. Every sibling save path in this wave (ManualBuilderScreen's
// validate()) shows a warning toast on invalid input; this pins the same
// pattern here, matching this file's existing source-guard convention
// (RoutineDetailScreen.reorder.guard.test.js /
// RoutineDetailScreen.editSheetBottomSheet.guard.test.js) rather than a
// full render, since this screen's real data loads make a render harness
// heavy.
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

describe('RoutineDetailScreen saveEdit warns on invalid input instead of a silent no-op (Wave A)', () => {
  test('invalid sets/reps shows a warning toast and returns before the write', () => {
    const fnSource = ROUTINE_DETAIL.match(/async function saveEdit\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(fnSource).toContain('if (!sets || !repsMin || !repsMax) {');
    expect(fnSource).toContain(
      "toast.show('Enter a value for sets and reps before saving', { variant: 'warning' });"
    );
    // The toast fires, then the function bails, before updateRoutineExercise.
    const guardIndex = fnSource.indexOf('if (!sets || !repsMin || !repsMax) {');
    const writeIndex = fnSource.indexOf('await updateRoutineExercise(');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(writeIndex).toBeGreaterThan(guardIndex);
  });

  test('the guard is no longer a bare silent return', () => {
    expect(ROUTINE_DETAIL).not.toContain('if (!sets || !repsMin || !repsMax) return;');
  });
});
