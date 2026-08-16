/**
 * WorkoutExerciseRow source guards (logger redesign phase 2).
 *
 * Carries forward every invariant the retired ExerciseNav.completeColour
 * guard pinned - the pill strip's completion-colour rule moved verbatim onto
 * the vertical list rows - and adds the new list-row contract:
 *
 *   1. Completion = every planned set logged and not skipped for time, and a
 *      complete row's progress fill is success-GREEN, overriding every other
 *      state colour (founder request 2026-07-19, unchanged).
 *   2. Complete and skipped states are spoken to screen readers.
 *   3. A tap is a plain onPress (jump only - the row has no other tap
 *      side-effect), and long-press is the reorder entry, with the hold
 *      spelled out in the accessibility hint.
 *   4. Skipped-for-time rows dim but remain tappable (opacity style, no
 *      `disabled` prop), so a user can still jump onto one deliberately.
 *
 * Source-level guard, matching the workout-UI convention (the screen and its
 * extracted rows are pinned by fs reads rather than full mounts).
 */
import fs from 'fs';
import path from 'path';

const ROW = fs.readFileSync(
  path.join(__dirname, '..', 'WorkoutExerciseRow.js'),
  'utf8',
);

describe('WorkoutExerciseRow completion colour (ExerciseNav rule carried forward)', () => {
  test('completion is every planned set logged and not skipped', () => {
    expect(ROW).toMatch(/const complete = !skipped && total > 0 && done >= total;/);
  });

  test('a complete row fill is success-green, overriding the rest colour', () => {
    expect(ROW).toMatch(/const fillColor = complete \? t\.colors\.success : t\.colors\.textMuted;/);
    expect(ROW).toContain('backgroundColor: fillColor');
  });

  test('complete and skipped states are announced to screen readers', () => {
    expect(ROW).toContain("${complete ? ', complete' : ''}");
    expect(ROW).toContain("${skipped ? ', skipped for time' : ''}");
  });
});

describe('WorkoutExerciseRow jump/reorder contract', () => {
  test('tap is a plain jump and long-press is the reorder entry, both spoken', () => {
    expect(ROW).toContain('onPress={onPress}');
    expect(ROW).toContain('onLongPress={onLongPress}');
    expect(ROW).toContain("'Switches to this exercise. Hold to reorder the workout.'");
  });

  test('skipped rows dim but stay tappable (no disabled prop)', () => {
    expect(ROW).toContain('skipped && styles.rowSkipped');
    expect(ROW).toMatch(/rowSkipped: \{ opacity: 0\.5 \}/);
    expect(ROW).not.toContain('disabled={');
  });

  test('rows meet the thumb-target minimum', () => {
    expect(ROW).toContain('minHeight: workoutLoggerSize.primaryActionMinHeight');
  });
});
