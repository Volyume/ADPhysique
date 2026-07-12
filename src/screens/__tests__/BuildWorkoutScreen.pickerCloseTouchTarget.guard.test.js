/**
 * UI-13 (end-user-polish audit, 2026-07-12): the exercise-picker close
 * button was 40x40 with no compensating hitSlop, below the project's 44dp
 * touch-target contract (src/styles/layout.js touchTarget.minimum). Raised
 * to 44x44 outright; layout/behaviour otherwise unchanged.
 *
 * Source guard: BuildWorkoutScreen has no colocated render-test harness
 * light enough to drive the exercise-picker Modal in isolation, matching the
 * project's convention of pinning fixed layout source directly (see the
 * sibling travelSheet guard test in this same file).
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'BuildWorkoutScreen.js'),
  'utf8',
);

describe('BuildWorkoutScreen exercise-picker close button meets the touch-target minimum (UI-13)', () => {
  test('pickerClose is 44x44, not 40x40', () => {
    expect(src).toContain("pickerClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }");
    expect(src).not.toMatch(/pickerClose: \{ width: 40, height: 40/);
  });

  test('the close control keeps its press handler and accessibility label', () => {
    expect(src).toContain('onPress={() => setShowPicker(false)} style={styles.pickerClose} accessibilityRole="button" accessibilityLabel="Close exercise picker"');
  });
});
