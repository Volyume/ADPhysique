/**
 * UI-13 (end-user-polish audit, 2026-07-12): the exercise-picker close
 * button was 40x40 with no compensating hitSlop, below the project's 44dp
 * touch-target contract (src/styles/layout.js touchTarget.minimum). Raised
 * to 44x44 outright; layout/behaviour otherwise unchanged.
 *
 * D1 sweep (design-consistency-audit-2026-08-06, DD4): BuildWorkoutScreen's
 * local hand-rolled exercise picker (with its own pickerClose control) was
 * replaced with the shared ExercisePickerModal component, the same one
 * RoutineDetailScreen.js and ManualBuilderScreen.js already use. The
 * touch-target intent this guard pins now lives in that shared component
 * (its pickerClose is 40x40 with a 12pt hitSlop on every side, giving a
 * 64x64 effective target, comfortably over the 44dp minimum) rather than in
 * BuildWorkoutScreen.js's own source.
 *
 * Source guard: no colocated render-test harness light enough to drive the
 * exercise-picker Modal in isolation, matching the project's convention of
 * pinning fixed layout source directly (see the sibling travelSheet guard
 * test in this same file).
 */
const fs = require('fs');
const path = require('path');

const screenSrc = fs.readFileSync(
  path.join(__dirname, '..', 'BuildWorkoutScreen.js'),
  'utf8',
);
const pickerSrc = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'ExercisePickerModal.js'),
  'utf8',
);

describe('BuildWorkoutScreen delegates its exercise picker to the shared ExercisePickerModal (DD4)', () => {
  test('BuildWorkoutScreen renders the shared component, not a local Modal-based picker', () => {
    expect(screenSrc).toContain("import ExercisePickerModal from '../components/ExercisePickerModal';");
    expect(screenSrc).toMatch(
      /<ExercisePickerModal[\s\S]*visible=\{showPicker\}[\s\S]*onClose=\{\(\) => setShowPicker\(false\)\}[\s\S]*onSelect=\{addExercise\}[\s\S]*saveLabel="Add to workout"/,
    );
    expect(screenSrc).not.toMatch(/pickerClose: \{ width: 40, height: 40/);
    expect(screenSrc).not.toMatch(/pickerClose: \{ width: 44, height: 44/);
  });

  test('the shared ExercisePickerModal close control meets the touch-target minimum via hitSlop', () => {
    expect(pickerSrc).toMatch(/pickerClose:\s*\{\s*width:\s*40,\s*height:\s*40,/);
    expect(pickerSrc).toMatch(
      /accessibilityLabel="Close exercise picker"[\s\S]*style=\{\[styles\.pickerClose, live\.pickerClose\]\}[\s\S]*hitSlop=\{\{ top: 12, bottom: 12, left: 12, right: 12 \}\}/,
    );
  });
});
