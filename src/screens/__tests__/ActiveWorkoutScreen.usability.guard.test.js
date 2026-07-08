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

  test('finish-workout confirmation and retry copy use the same action name', () => {
    expect(ACTIVE_WORKOUT).toContain("text: 'Finish workout'");
    expect(ACTIVE_WORKOUT).toContain('tap Finish workout again');
    expect(ACTIVE_WORKOUT).not.toContain("text: 'Finish',");
    expect(ACTIVE_WORKOUT).not.toContain('tap Finish again');
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
    expect(ACTIVE_WORKOUT).toContain('Tap More for form tips, warm-ups, swaps and session options.');
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
    expect(SET_ENTRY).toContain("import { workoutLoggerSize } from '../styles/layout';");
    expect(SET_ENTRY).toMatch(/fieldLabelWrap: \{\s*minWidth: workoutLoggerSize\.setEntryLabelWidth,[\s\S]*flexBasis: workoutLoggerSize\.setEntryLabelWidth,[\s\S]*flexShrink: 0,/);
    expect(SET_ENTRY).toMatch(/stepBtn: \{\s*minWidth: workoutLoggerSize\.setEntryStepperButton,[\s\S]*minHeight: workoutLoggerSize\.setEntryStepperButton,[\s\S]*aspectRatio: 1,/);
    expect(SET_ENTRY.match(/hitSlop=\{STEPPER_HIT_SLOP\}/g)?.length).toBeGreaterThanOrEqual(10);
    expect(ACTIVE_WORKOUT).toMatch(/setEntryCard: \{[\s\S]*padding: spacing\.xs2[\s\S]*gap: spacing\.xxs/);
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>');
    expect(ACTIVE_WORKOUT).toContain('exerciseName: { flex: 1, ...type.title, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.targetText} numberOfLines={1}>');
    expect(ACTIVE_WORKOUT).toContain('targetText: { flex: 1, ...type.captionTight, color: colors.textMuted }');
    expect(ACTIVE_WORKOUT).toMatch(/beatLine: \{[\s\S]*minHeight: 28/);
    expect(ACTIVE_WORKOUT).toMatch(/loggedSetRow: \{[\s\S]*minHeight: workoutLoggerSize\.loggedSetMinHeight/);
    expect(ACTIVE_WORKOUT).toContain('numberOfLines={1}');
  });

  test('high-impact workout text uses the semantic Inter type roles', () => {
    expect(ACTIVE_WORKOUT).toContain("timerText: { ...type.num('title'), color: colors.primary }");
    expect(ACTIVE_WORKOUT).toContain('completeBtnText: { ...type.bodyStrong, color: colors.onPrimary, letterSpacing: 0 }');
    expect(ACTIVE_WORKOUT).toContain('sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm }');
    expect(ACTIVE_WORKOUT).toContain('swapTitle: { ...type.h3, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).toContain('supTitle: { ...type.h3, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).not.toMatch(/exerciseName: \{ flex: 1, fontSize: fontSize\.lg,[\s\S]*fontWeight: fontWeight\.black/);
    expect(ACTIVE_WORKOUT).not.toMatch(/completeBtnText: \{ fontSize: fontSize\.md,[\s\S]*fontWeight: fontWeight\.bold/);
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
    expect(ACTIVE_WORKOUT).toContain("import { workoutLoggerSize } from '../styles/layout';");
    expect(ACTIVE_WORKOUT).toMatch(/overflowBtn: \{\s*width: workoutLoggerSize\.overflowButton,\s*height: workoutLoggerSize\.overflowButton,/);
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.swapBtn}');
    expect(ACTIVE_WORKOUT).not.toContain('swapBtnText');
    expect(ACTIVE_WORKOUT).toContain('headerFinishButton');
    expect(ACTIVE_WORKOUT).toContain('inlineActionPill');
    expect(ACTIVE_WORKOUT).toMatch(/completeBtn: \{[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight,[\s\S]*paddingVertical: spacing\.xs/);
    expect(ACTIVE_WORKOUT).toMatch(/extraSetBtnPromoted: \{[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight,[\s\S]*paddingVertical: spacing\.xs/);
    expect(ACTIVE_WORKOUT).toMatch(/addFirstBtn: \{[\s\S]*minHeight: workoutLoggerSize\.addExerciseMinHeight,[\s\S]*paddingHorizontal: spacing\.lg,[\s\S]*paddingVertical: spacing\.sm/);
    expect(ACTIVE_WORKOUT).toContain('addFirstBtnText: { ...type.label, color: colors.onPrimary }');
    expect(ACTIVE_WORKOUT).not.toContain('addFirstBtnText: { fontSize: fontSize.lg');
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
    expect(ACTIVE_WORKOUT).toContain("import BottomSheet from '../components/BottomSheet';");
    expect(ACTIVE_WORKOUT).toContain('function WorkoutSheetScroll');
    expect(ACTIVE_WORKOUT).toContain('function WorkoutBottomSheet');
    expect(ACTIVE_WORKOUT).toContain('<BottomSheet');
    expect(ACTIVE_WORKOUT.match(/<WorkoutBottomSheet/g)?.length).toBeGreaterThanOrEqual(5);
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.sheetOverlay}');
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.sheetHost}');
    expect(ACTIVE_WORKOUT).not.toContain('styles.sheetHandle');
    expect(ACTIVE_WORKOUT).toContain('keyboardShouldPersistTaps="handled"');
  });

  test('warm-up helper uses gym-floor language, not internal ramp wording', () => {
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Warm-up sets"');
    expect(ACTIVE_WORKOUT).toContain('<Text style={styles.sheetTitle}>Warm-up sets</Text>');
    expect(ACTIVE_WORKOUT).toContain('Choose a warm-up set to load it, then tap Log warm-up.');
    expect(ACTIVE_WORKOUT).toContain('Load as a warm-up set.');
    expect(ACTIVE_WORKOUT).not.toContain('Tap a row to load it as a warm-up');
    expect(ACTIVE_WORKOUT).not.toContain('<Text style={styles.sheetOptionLabel}>Warm-up ramp</Text>');
  });

  test('custom workout modals stay within the screen and keyboard-safe', () => {
    expect(ACTIVE_WORKOUT).toMatch(/supSheet: \{[\s\S]*maxHeight: '88%'[\s\S]*overflow: 'hidden'/);
    expect(ACTIVE_WORKOUT).toContain('supSheetScroll');
    expect(ACTIVE_WORKOUT).toContain('supSheetContent');
    expect(ACTIVE_WORKOUT).toMatch(/staleSheet: \{[\s\S]*maxHeight: '88%'[\s\S]*overflow: 'hidden'/);
    expect(ACTIVE_WORKOUT).toMatch(/discardSheet: \{[\s\S]*maxHeight: '88%'[\s\S]*overflow: 'hidden'/);
    expect(ACTIVE_WORKOUT).toContain('editSetKeyboard');
    expect(ACTIVE_WORKOUT).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(ACTIVE_WORKOUT).toMatch(/editSetSheet: \{[\s\S]*maxHeight: '88%'[\s\S]*overflow: 'hidden'/);
    expect(ACTIVE_WORKOUT).toContain('editSetScroll');
    expect(ACTIVE_WORKOUT).toContain('editSetContent');
  });
});
