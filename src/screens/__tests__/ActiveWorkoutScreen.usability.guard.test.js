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
  test('terminal workout completion has one primary finish control', () => {
    expect(ACTIVE_WORKOUT).toContain('targetComplete && !extraSetArmed && isLastExercise');
    expect(ACTIVE_WORKOUT).toContain('testID="volyume-btn-finish-primary"');
    expect(ACTIVE_WORKOUT).toContain('<View style={styles.headerTapTarget} />');
  });

  test('stored workout name uses the same full-title rule as summary sharing', () => {
    expect(ACTIVE_WORKOUT).toContain("import { shareSessionName } from '../lib/sessionShareData';");
    expect(ACTIVE_WORKOUT).toContain('const exerciseNames = snapshotExercises.map(e => e.exercise?.name).filter(Boolean);');
    expect(ACTIVE_WORKOUT).toContain('const sessionName = shareSessionName(null, exerciseNames);');
    expect(ACTIVE_WORKOUT).not.toContain("split(' ')[0]");
  });

  test('primary set CTA speaks the same action the user sees', () => {
    const spokenLabel = ACTIVE_WORKOUT.match(/accessibilityLabel=\{\s*currentSet\.setType === 'warmup'[\s\S]{0,420}\}/)?.[0] ?? '';

    expect(spokenLabel).toContain("currentSet.setType === 'warmup' ? 'Log warm-up'");
    expect(spokenLabel).toContain("? 'Start cluster' : 'Log set'");
    expect(spokenLabel).not.toContain("? 'Start cluster' : 'Complete set'");
    expect(ACTIVE_WORKOUT).toContain("currentSet.setType === 'warmup' ? 'Log warm-up'");
    expect(ACTIVE_WORKOUT).not.toContain("currentSet.setType === 'warmup' ? 'Done'");
  });

  test('first-set hint names the More control instead of relying on the glyph', () => {
    expect(ACTIVE_WORKOUT).toContain("if (activeExerciseType === 'duration') return 'Enter the time, then tap Log set when done.';");
    expect(ACTIVE_WORKOUT).toContain("if (activeExerciseType === 'distance') return 'Enter distance and time, then tap Log set when done.';");
    expect(ACTIVE_WORKOUT).toContain("if (activeExerciseType === 'reps_only') return 'Enter reps, then tap Log set when done.';");
    expect(ACTIVE_WORKOUT).toContain('return \'Enter weight and reps, then tap Log set when done.\';');
    expect(ACTIVE_WORKOUT).toContain('Open More for form tips, warm-ups, swaps and session options.');
  });

  test('previous performance cues use a compact control instead of inline link copy', () => {
    expect(ACTIVE_WORKOUT).not.toContain('Tap to use');
    expect(ACTIVE_WORKOUT).toContain('beatLineCue');
    expect(ACTIVE_WORKOUT).toContain('beatLineCueText');
  });

  test('logged set edit rows include the set content in the spoken label', () => {
    expect(ACTIVE_WORKOUT).toContain('const spokenSetLabel = [');
    expect(ACTIVE_WORKOUT).toContain("isWarmup ? 'Edit warm-up set' : `Edit set ${progressNum}`");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel={spokenSetLabel}');
  });

  test('set entry stays compact while keeping thumb-sized steppers', () => {
    expect(SET_ENTRY).toContain('const STEPPER_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };');
    expect(SET_ENTRY).toMatch(/fieldLabelWrap: \{\s*width: 86,\s*flexShrink: 0,\s*gap: 1,/);
    expect(SET_ENTRY).toMatch(/stepBtn: \{\s*width: 36,\s*height: 36,/);
    expect(SET_ENTRY.match(/hitSlop=\{STEPPER_HIT_SLOP\}/g)?.length).toBeGreaterThanOrEqual(10);
    expect(ACTIVE_WORKOUT).toMatch(/setEntryCard: \{[\s\S]*padding: spacing\.xs2[\s\S]*gap: spacing\.xxs/);
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>');
    expect(ACTIVE_WORKOUT).toMatch(/exerciseName: \{ flex: 1, fontSize: fontSize\.lg,/);
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.targetText} numberOfLines={1}>');
    expect(ACTIVE_WORKOUT).toMatch(/targetText: \{ flex: 1, fontSize: fontSize\.xs,/);
    expect(ACTIVE_WORKOUT).toMatch(/beatLine: \{[\s\S]*minHeight: 28/);
    expect(ACTIVE_WORKOUT).toMatch(/loggedSetRow: \{[\s\S]*minHeight: 36/);
    expect(ACTIVE_WORKOUT).toContain('numberOfLines={1}');
  });

  test('distance time input is announced as time, not duration', () => {
    const durationWindow = SET_ENTRY.match(/testID="volyume-duration-input"[\s\S]{0,700}/)?.[0] ?? '';
    const distanceWindow = SET_ENTRY.match(/testID="volyume-distance-time-input"[\s\S]{0,700}/)?.[0] ?? '';
    expect(durationWindow).toContain('accessibilityLabel="Time in minutes and seconds"');
    expect(durationWindow).not.toContain('accessibilityLabel="Duration in minutes and seconds"');
    expect(distanceWindow).toContain('accessibilityLabel="Time in minutes and seconds"');
    expect(distanceWindow).not.toContain('accessibilityLabel="Duration in minutes and seconds"');
  });

  test('all set-entry steppers support tired-thumb hold-to-adjust', () => {
    expect(SET_ENTRY).toContain('function startSecondsRepeat(delta)');
    expect(SET_ENTRY).toContain('accessibilityLabel={`Decrease weight by ${Number(weightStepKg) > 0 ? Number(weightStepKg) : 2.5} ${units}`}');
    expect(SET_ENTRY).toContain('accessibilityLabel="Decrease reps by 1"');
    expect(SET_ENTRY.match(/accessibilityHint="Hold to keep adjusting"/g)?.length).toBeGreaterThanOrEqual(8);
  });

  test('menu and secondary actions are plain under fatigue', () => {
    expect(ACTIVE_WORKOUT).toMatch(/overflowBtn: \{\s*width: 44,\s*height: 44,/);
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.swapBtn}');
    expect(ACTIVE_WORKOUT).not.toContain('swapBtnText');
    expect(ACTIVE_WORKOUT).toContain('headerFinishButton');
    expect(ACTIVE_WORKOUT).toContain('inlineActionPill');
    expect(ACTIVE_WORKOUT).toMatch(/inlineActionPill: \{[\s\S]*minHeight: 44/);
    expect(ACTIVE_WORKOUT).toMatch(/autoAdvanceRowActionBtn: \{[\s\S]*minHeight: 44/);
    expect(ACTIVE_WORKOUT).toContain("<Text style={styles.actionBtnText}>Add note</Text>");
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.keepTrainingBtnText}>Keep training</Text>');
    expect(ACTIVE_WORKOUT).not.toContain('>Keep Training<');
    expect(ACTIVE_WORKOUT).toContain("const retryAction = currentSet.setType === 'warmup'");
    expect(ACTIVE_WORKOUT).toContain("? 'Log warm-up'");
    expect(ACTIVE_WORKOUT).toMatch(/Your set wasn't saved\. Tap \$\{retryAction\} to try again/);
  });

  test('long workout utility sheets are scroll-safe on phone screens', () => {
    expect(ACTIVE_WORKOUT).toContain('function WorkoutSheetScroll');
    expect(ACTIVE_WORKOUT.match(/<WorkoutSheetScroll>/g)?.length).toBeGreaterThanOrEqual(5);
    expect(ACTIVE_WORKOUT).toContain("sheetHost: { flex: 1, justifyContent: 'flex-end' }");
    expect(ACTIVE_WORKOUT.match(/<View style=\{styles\.sheetHost\}>/g)?.length).toBeGreaterThanOrEqual(5);
    expect(ACTIVE_WORKOUT).toMatch(/sheet: \{[^}]*maxHeight: '92%'/);
    expect(ACTIVE_WORKOUT).toContain('keyboardShouldPersistTaps="handled"');
  });
});
