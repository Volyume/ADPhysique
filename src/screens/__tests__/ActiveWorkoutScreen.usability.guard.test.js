import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);
const SET_ENTRY = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'SetEntry.js'),
  'utf8',
);

describe('ActiveWorkoutScreen gym-use polish', () => {
  test('primary set CTA speaks the same action the user sees', () => {
    const spokenLabel = ACTIVE_WORKOUT.match(/accessibilityLabel=\{\s*currentSet\.setType === 'warmup'[\s\S]{0,420}\}/)?.[0] ?? '';

    expect(spokenLabel).toContain("? 'Start cluster' : 'Log set'");
    expect(spokenLabel).not.toContain("? 'Start cluster' : 'Complete set'");
  });

  test('first-set hint names the More control instead of relying on the glyph', () => {
    expect(ACTIVE_WORKOUT).toContain('Open More above for how to do this exercise correctly.');
  });

  test('logged set edit rows include the set content in the spoken label', () => {
    expect(ACTIVE_WORKOUT).toContain('const spokenSetLabel = [');
    expect(ACTIVE_WORKOUT).toContain("isWarmup ? 'Edit warm-up set' : `Edit set ${progressNum}`");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel={spokenSetLabel}');
  });

  test('set entry keeps a stable label column beside the thumb steppers', () => {
    expect(SET_ENTRY).toMatch(/fieldLabelWrap: \{\s*width: 104,\s*flexShrink: 0,\s*gap: 2,/);
  });
});
