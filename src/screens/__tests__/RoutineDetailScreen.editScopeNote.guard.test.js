/**
 * RoutineDetailScreen.editScopeNote.guard.test.js -- D139 (lead programme
 * ruling): the sets/reps/rest edit sheet must say its scope truthfully.
 * saveEdit rewrites this routine's own routine_exercises row only; it never
 * touches the block's weekly set-target ledger (mesocycles.block_ledger),
 * which only moves on a rebuild. The old sheet said nothing about scope, so
 * a user could plausibly believe editing one workout's sets moved the
 * block's weekly targets.
 *
 * Source-level pin (repo convention: fs.readFileSync + regex), matching
 * RoutineDetailScreen.editSheetBottomSheet.guard.test.js's own approach for
 * the same sheet.
 */
import fs from 'fs';
import path from 'path';

const ROUTINE_DETAIL = fs.readFileSync(
  path.join(__dirname, '..', 'RoutineDetailScreen.js'),
  'utf8',
);

function editSheetWindow() {
  return ROUTINE_DETAIL.match(/\{\/\* Edit exercise modal\.[\s\S]*?<\/BottomSheet>/)?.[0] ?? '';
}

describe('the edit-exercise sheet states its scope truthfully (D139)', () => {
  test('a muted scope line sits inside the edit sheet, right after the title', () => {
    const editWindow = editSheetWindow();
    expect(editWindow).toContain(
      'This changes this workout only. Your weekly set targets stay with the block.',
    );
    // Right after the exercise-name title, before the sets/reps/rest fields --
    // read before editing, not buried below the inputs.
    const titleIdx = editWindow.indexOf('{editingExercise?.exercise?.name}');
    const noteIdx = editWindow.indexOf('This changes this workout only');
    const firstFieldIdx = editWindow.indexOf('label="Sets"');
    expect(titleIdx).toBeGreaterThan(-1);
    expect(noteIdx).toBeGreaterThan(titleIdx);
    expect(noteIdx).toBeLessThan(firstFieldIdx);
  });

  test('the note uses the muted caption style, not a warning colour', () => {
    expect(ROUTINE_DETAIL).toContain(
      "editScopeNote: { ...type.captionTight, color: colors.textMuted, marginBottom: spacing.sm },",
    );
    expect(ROUTINE_DETAIL).toContain(
      "editScopeNote: { ...t.type.captionTight, color: t.colors.textMuted },",
    );
  });

  test('the swap sheet toast is left untouched ("in future sessions")', () => {
    // Negative control: this build does not touch the swap sheet's existing
    // scope copy (already correct, per the brief).
    expect(ROUTINE_DETAIL).toMatch(/in future sessions/);
  });
});
