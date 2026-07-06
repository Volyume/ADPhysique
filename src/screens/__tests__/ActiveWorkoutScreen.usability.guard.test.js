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
    expect(ACTIVE_WORKOUT).toContain("if (activeExerciseType === 'duration') return 'Enter the time, then tap Log set when done.';");
    expect(ACTIVE_WORKOUT).toContain("if (activeExerciseType === 'distance') return 'Enter distance and time, then tap Log set when done.';");
    expect(ACTIVE_WORKOUT).toContain("if (activeExerciseType === 'reps_only') return 'Enter reps, then tap Log set when done.';");
    expect(ACTIVE_WORKOUT).toContain('return \'Enter weight and reps, then tap Log set when done.\';');
    expect(ACTIVE_WORKOUT).toContain('Open the menu above for how to do this exercise correctly.');
  });

  test('logged set edit rows include the set content in the spoken label', () => {
    expect(ACTIVE_WORKOUT).toContain('const spokenSetLabel = [');
    expect(ACTIVE_WORKOUT).toContain("isWarmup ? 'Edit warm-up set' : `Edit set ${progressNum}`");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel={spokenSetLabel}');
  });

  test('set entry keeps a stable label column beside the thumb steppers', () => {
    expect(SET_ENTRY).toMatch(/fieldLabelWrap: \{\s*width: 104,\s*flexShrink: 0,\s*gap: 2,/);
  });

  test('all set-entry steppers support tired-thumb hold-to-adjust', () => {
    expect(SET_ENTRY).toContain('function startSecondsRepeat(delta)');
    expect(SET_ENTRY).toContain('accessibilityLabel={`Decrease weight by ${Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5} ${units}`}');
    expect(SET_ENTRY).toContain('accessibilityLabel="Decrease reps by 1"');
    expect(SET_ENTRY.match(/accessibilityHint="Hold to keep adjusting"/g)?.length).toBeGreaterThanOrEqual(8);
  });

  test('menu and secondary actions are plain under fatigue', () => {
    expect(ACTIVE_WORKOUT).toMatch(/overflowBtn: \{\s*width: 44,\s*height: 44,/);
    expect(ACTIVE_WORKOUT).toContain("<Text style={styles.actionBtnText}>Add note</Text>");
    expect(ACTIVE_WORKOUT).toContain("const retryAction = currentSet.setType === 'warmup'");
    expect(ACTIVE_WORKOUT).toContain('`Your set wasn\'t saved. Tap ${retryAction} to retry.');
  });
});
