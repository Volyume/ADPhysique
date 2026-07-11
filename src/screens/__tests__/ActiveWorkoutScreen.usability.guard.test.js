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
// Re-pinned for D43 S1 extraction: LoggedSetRow and EmptyExerciseView moved
// out of ActiveWorkoutScreen.js into src/components/workout/ (pure
// extraction, no behaviour/visual change -- see the extraction's own header
// comments in each moved file). The assertions below that used to read these
// components' JSX/styles off ACTIVE_WORKOUT now read the same source text
// off the new files instead; the invariant each assertion pins is unchanged.
const LOGGED_SET_ROW = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'LoggedSetRow.js'),
  'utf8',
);
const EMPTY_EXERCISE_VIEW = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'EmptyExerciseView.js'),
  'utf8',
);
// Re-pinned for D43 S2: the "N notes" accordion (notesRail/notesChip/
// notesChipText/notesExpanded) was retired from ActiveWorkoutScreen.js and
// replaced by StatusStrip (content-labelled chips, tap-to-expand per chip,
// no count). Assertions that used to read the chip styling off ACTIVE_WORKOUT
// now read the same source text off StatusStrip.js instead.
const STATUS_STRIP = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'StatusStrip.js'),
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
    // R4 (D64): the per-side branch now leads the ternary - mid-pair the
    // primary is "Log other side" and the spoken label matches it.
    const spokenLabel = ACTIVE_WORKOUT.match(/accessibilityLabel=\{\s*perSide \? 'Other side done, log this set'[\s\S]{0,460}\}/)?.[0] ?? '';

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
    expect(ACTIVE_WORKOUT).toContain('Use exercise options for form tips, warm-ups, swaps and session settings.');
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Exercise options"');
    expect(ACTIVE_WORKOUT).not.toContain('accessibilityLabel="More options for this exercise"');
    expect(ACTIVE_WORKOUT).toContain('placeholder="Add a note for this set"');
    expect(ACTIVE_WORKOUT).not.toContain('placeholder="Add a note..."');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): ActiveWorkoutScreen
    // now reads a live theme (src/hooks/useTheme.js); inline colour props
    // moved from the frozen `colors.*` singleton to `t.colors.*`.
    expect(ACTIVE_WORKOUT).toContain('name="information-circle-outline" size={14} color={t.colors.primary}');
    // Re-pinned for D43 S2: the "16px textSecondary info-circle" belonged to
    // the retired notesChip; StatusStrip's chip icon carries the equivalent
    // "content-labelled, textSecondary by default" contract now.
    expect(STATUS_STRIP).toContain("item.icon && <Ionicons name={item.icon} size={14} color={item.iconColor || t.colors.textSecondary} />");
    expect(STATUS_STRIP).toMatch(/chip: \{[\s\S]*borderWidth: 1,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toMatch(/firstSetHint: \{[\s\S]*backgroundColor: colors\.surface,[\s\S]*borderColor: colors\.borderSubtle/);
    expect(ACTIVE_WORKOUT).not.toContain('sparkles');
  });

  test('previous performance cues use a compact control instead of inline link copy', () => {
    expect(ACTIVE_WORKOUT).not.toContain('Tap to use');
    expect(ACTIVE_WORKOUT).toContain('beatLineCue');
    expect(ACTIVE_WORKOUT).toContain('beatLineCueText');
  });

  test('exercise swaps reset stale in-progress logger state', () => {
    const swapWindow = ACTIVE_WORKOUT.match(/function handleConfirmSwap\(newExercise\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

    expect(swapWindow).toContain('cancelAutoAdvance();');
    expect(swapWindow).toContain('setCurrentSet({');
    expect(swapWindow).toContain('reps: newRepMax || DEFAULT_SET.reps');
    expect(swapWindow).toContain('setGhostSet(null);');
    expect(swapWindow).toContain('setCluster(null);');
    expect(swapWindow).toContain("setClusterReps('');");
    expect(swapWindow).toContain('setExtraSetArmed(false);');
    expect(swapWindow).toContain("setNoteText('');");
    expect(swapWindow).toContain('setShowNoteInput(false);');
    expect(swapWindow).toContain('setNotesExpanded(false);');
  });

  test('exercise changes clear stale per-exercise note UI', () => {
    const loadWindow = ACTIVE_WORKOUT.match(/\/\/ Load previous performance and set defaults when exercise changes[\s\S]*?async function loadHistory/)?.[0] ?? '';

    expect(loadWindow).toContain("setNoteText('');");
    expect(loadWindow).toContain('setShowNoteInput(false);');
    expect(loadWindow).toContain('setNotesExpanded(false);');
  });

  test('empty workout state uses the same fixed header layout as the logger', () => {
    // Re-pinned for D43 S1 extraction: EmptyExerciseView is now its own
    // module (src/components/workout/EmptyExerciseView.js), so the window is
    // the whole file rather than a slice of ActiveWorkoutScreen.js.
    const emptyWindow = EMPTY_EXERCISE_VIEW.match(/export default function EmptyExerciseView[\s\S]*?const styles = StyleSheet\.create/)?.[0] ?? '';

    expect(emptyWindow).toContain('style={styles.headerSide}');
    expect(emptyWindow).toContain('style={styles.headerCenter}');
    expect(emptyWindow).toContain('style={styles.headerSideRight}');
    expect(emptyWindow).not.toContain('<Text style={styles.timerText}>{elapsed}</Text>\n        <TouchableOpacity');
  });

  test('logged set edit rows include the set content in the spoken label', () => {
    // Re-pinned for D43 S1 extraction: LoggedSetRow is now its own module
    // (src/components/workout/LoggedSetRow.js); ActiveWorkoutScreen.js only
    // keeps `export { LoggedSetRow };` as a re-export, so this invariant
    // reads the new file's source instead.
    expect(LOGGED_SET_ROW).toContain('const spokenSetLabel = [');
    expect(LOGGED_SET_ROW).toContain("isWarmup ? 'Edit warm-up set' : `Edit set ${progressNum}`");
    expect(LOGGED_SET_ROW).toContain('accessibilityLabel={spokenSetLabel}');
    const loggedRowWindow = LOGGED_SET_ROW.match(/export const LoggedSetRow[\s\S]*?\n\}\);/)?.[0] ?? '';
    expect(loggedRowWindow).toContain('name="chevron-forward"');
    expect(loggedRowWindow).not.toContain('name="checkmark-circle"');
  });

  test('set entry stays compact while keeping thumb-sized steppers', () => {
    expect(SET_ENTRY).toContain('const STEPPER_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };');
    expect(SET_ENTRY).toContain("import { workoutLoggerSize } from '../styles/layout';");
    expect(SET_ENTRY).toMatch(/fieldLabelWrap: \{\s*minWidth: workoutLoggerSize\.setEntryLabelWidth,[\s\S]*flexBasis: workoutLoggerSize\.setEntryLabelWidth,[\s\S]*flexShrink: 0,/);
    expect(SET_ENTRY).toMatch(/stepBtn: \{\s*minWidth: workoutLoggerSize\.setEntryStepperButton,[\s\S]*minHeight: workoutLoggerSize\.setEntryStepperButton,[\s\S]*aspectRatio: 1,/);
    expect(SET_ENTRY).toContain("...type.num('bodyStrong')");
    expect(SET_ENTRY).not.toContain('fontWeight: fontWeight.bold');
    expect(SET_ENTRY.match(/hitSlop=\{STEPPER_HIT_SLOP\}/g)?.length).toBeGreaterThanOrEqual(10);
    // Re-pinned for D43 S2: the bespoke radius.md/6px-padding setEntryCard
    // is retired -- the Now card now sits on the house Card (radius lg,
    // padding lg passed as PROPS at the call site, asserted separately
    // below); this frozen style only carries the internal row gap now.
    expect(ACTIVE_WORKOUT).toMatch(/setEntryCard: \{ gap: spacing\.xs \}/);
    expect(ACTIVE_WORKOUT).toContain('radius="lg"\n            padding="lg"');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): exerciseName/targetText
    // gained a live.* override in their style arrays (source: useTheme.js);
    // the frozen `styles` definitions asserted next are byte-identical.
    expect(ACTIVE_WORKOUT).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.exerciseName, live.exerciseName]} numberOfLines={2}>{exercise.name}</Text>');
    expect(ACTIVE_WORKOUT).toContain('exerciseName: { flex: 1, ...type.title, color: colors.textPrimary }');
    // Re-pinned for D43 S2: the separate targetRow/targetText line is
    // retired -- the reps target now folds into orientationText's own Text
    // node on Line 1 ("Set 2 of 3 - Working - 8-12 reps"), one line where
    // two stood.
    expect(ACTIVE_WORKOUT).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.orientationText, live.orientationText]} numberOfLines={1}>');
    expect(ACTIVE_WORKOUT).toContain('orientationTarget: { ...type.label, color: colors.textMuted }');
    expect(ACTIVE_WORKOUT).not.toContain('targetRow:');
    expect(ACTIVE_WORKOUT).not.toContain('targetText:');
    expect(ACTIVE_WORKOUT).toMatch(/beatLine: \{[\s\S]*minHeight: 36/);
    // Re-pinned for D43 S1 extraction: loggedSetRow moved to
    // src/components/workout/LoggedSetRow.js's own frozen styles.
    expect(LOGGED_SET_ROW).toMatch(/loggedSetRow: \{[\s\S]*minHeight: workoutLoggerSize\.loggedSetMinHeight/);
    expect(ACTIVE_WORKOUT).toContain('numberOfLines={1}');
    expect(SET_ENTRY).toContain('>Est. max ~{Math.round(live1RM)}{units}</Text>');
    expect(SET_ENTRY).not.toContain('>−</Text>');
    expect(SET_ENTRY).not.toContain('Est. max ≈');
  });

  test('high-impact workout text uses the semantic Inter type roles', () => {
    expect(ACTIVE_WORKOUT).toContain("timerText: { ...type.num('title'), color: colors.primary }");
    // letterSpacing: 0 literal removed (design campaign D3, 2026-07-09): raw
    // letterSpacing literals are swept to tokens/deleted app-wide; 0 was
    // value-identical to the RN default so the property is simply gone now.
    expect(ACTIVE_WORKOUT).toContain('completeBtnText: { ...type.bodyStrong, color: colors.onPrimary }');
    expect(ACTIVE_WORKOUT).toContain('sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm }');
    expect(ACTIVE_WORKOUT).toContain('swapTitle: { ...type.title, color: colors.textPrimary }');
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
    // Re-pinned for D43 S1 extraction: addFirstBtn/addFirstBtnText moved to
    // src/components/workout/EmptyExerciseView.js's own frozen styles.
    expect(EMPTY_EXERCISE_VIEW).toMatch(/addFirstBtn: \{[\s\S]*minHeight: workoutLoggerSize\.addExerciseMinHeight,[\s\S]*backgroundColor: colors\.primaryFill,[\s\S]*paddingHorizontal: spacing\.lg,[\s\S]*paddingVertical: spacing\.sm/);
    expect(EMPTY_EXERCISE_VIEW).toContain('addFirstBtnText: { ...type.label, color: colors.onPrimary }');
    expect(EMPTY_EXERCISE_VIEW).not.toContain('addFirstBtnText: { fontSize: fontSize.lg');
    expect(ACTIVE_WORKOUT).toMatch(/inlineActionPill: \{[\s\S]*minHeight: 44/);
    // Re-pinned for D43 S2: notesChip's thumb-target contract moved to
    // StatusStrip's chip style (see the StatusStrip assertions above).
    expect(ACTIVE_WORKOUT).toMatch(/clusterCancel: \{[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toMatch(/autoAdvanceRowActionBtn: \{[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toContain('function openAddExercisePicker()');
    expect(ACTIVE_WORKOUT).toContain("setPickerMode('add');");
    expect(ACTIVE_WORKOUT).toContain('onAdd={openAddExercisePicker}');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): sheetOptionLabel
    // gained a live.sheetOptionLabel override in its style array (source:
    // useTheme.js); the frozen `styles.sheetOptionLabel` is byte-identical.
    expect(ACTIVE_WORKOUT).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Add exercise</Text>');
    // Re-pinned for D43 S3 (blueprint 3.8): the overflow's "Add/edit note"
    // row (a sheetOptionLabel Text showing noteActionLabel) is DELETED --
    // the S2 card-corner pencil (volyume-note-corner-btn) is the one entry
    // point, using noteActionLabel only in its accessibilityLabel, not as
    // visible sheet-row text.
    expect(ACTIVE_WORKOUT).toContain("const noteActionLabel = showNoteInput || noteText.trim().length > 0 ? 'Edit note' : 'Add note';");
    expect(ACTIVE_WORKOUT).toContain('testID="volyume-note-corner-btn"');
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel={`${noteActionLabel} for this set`}');
    expect(ACTIVE_WORKOUT).not.toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{noteActionLabel}</Text>');
    // Re-pinned for D43 S2: the U-A-1 "N notes"/"N cues" count wording is
    // retired entirely -- StatusStrip labels every chip by content (Deload,
    // Superset, Coach note, Starter session, Target met), never a count.
    // This assertion now pins the ABSENCE of the count pattern plus the
    // presence of the content-labelled chip items StatusStrip receives.
    expect(ACTIVE_WORKOUT).not.toContain('noteCount');
    expect(ACTIVE_WORKOUT).not.toMatch(/note\{.*!== 1 \? 's' : ''\}/);
    expect(ACTIVE_WORKOUT).toContain("label: 'Starter session'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Superset'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Coach note'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Deload'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Target met'");
    expect(ACTIVE_WORKOUT).toContain('<StatusStrip items={items} />');
    expect(ACTIVE_WORKOUT).not.toContain('testID="volyume-btn-add-mid-workout"');
    expect(ACTIVE_WORKOUT).not.toContain('secondaryActions: {');
    expect(ACTIVE_WORKOUT).not.toContain('actionBtnText');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): live.keepTrainingBtnText
    // override appended (source: useTheme.js); frozen style byte-identical.
    expect(ACTIVE_WORKOUT).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.keepTrainingBtnText, live.keepTrainingBtnText]}>Keep training</Text>');
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
    expect(ACTIVE_WORKOUT.match(/<WorkoutBottomSheet/g)?.length).toBeGreaterThanOrEqual(4);
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.sheetOverlay}');
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.sheetHost}');
    expect(ACTIVE_WORKOUT).not.toContain('styles.sheetHandle');
    expect(ACTIVE_WORKOUT).toContain('keyboardShouldPersistTaps="handled"');
  });

  test('warm-up helper uses gym-floor language, not internal ramp wording', () => {
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Warm-up sets"');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): live.sheetTitle
    // override appended (source: useTheme.js); frozen style byte-identical.
    expect(ACTIVE_WORKOUT).toContain('<Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Warm-up sets</Text>');
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
  });

  // D43 S4 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
  // section 3.6/5): the edit-set MODAL is gone -- editing is now in-place
  // inside LoggedSetRow, so the modal-keyboard-safety and modal-button-system
  // assertions that used to read editSetKeyboard/editSetSheet/editSetSaveBtn
  // off ACTIVE_WORKOUT are re-pinned here to read the SAME invariants
  // (a Save action on the compact logger button system: colors.primaryFill,
  // workoutLoggerSize-scaled minHeight via the shared Button component,
  // type.bodyStrong text) off LoggedSetRow's inline editor instead. The
  // "no modal round-trip" half of the invariant is now a positive
  // assertion that the row hosts SetEntry + Save/Cancel directly, not a
  // "stays within the screen" keyboard-safety claim about a Modal that no
  // longer exists.
  test('the in-place set editor composes with SetEntry and the shared Button system, no modal', () => {
    expect(ACTIVE_WORKOUT).not.toContain('editSetKeyboard');
    expect(ACTIVE_WORKOUT).not.toContain('editSetSheet');
    expect(LOGGED_SET_ROW).toContain("import SetEntry from '../SetEntry';");
    expect(LOGGED_SET_ROW).toContain("import Button from '../Button';");
    expect(LOGGED_SET_ROW).toContain('if (isEditing) {');
    expect(LOGGED_SET_ROW).toMatch(/<SetEntry[\s\S]*value=\{editValue\}[\s\S]*onChange=\{onChangeEditValue\}/);
    expect(LOGGED_SET_ROW).toMatch(/<Button[\s\S]*variant="primary"[\s\S]*onPress=\{onSaveEdit\}[\s\S]*title="Save"/);
    expect(LOGGED_SET_ROW).toContain('accessibilityLabel="Cancel editing set"');
  });

  test('modal actions use the same compact logger button system', () => {
    expect(ACTIVE_WORKOUT).toMatch(/staleResume: \{[\s\S]*backgroundColor: colors\.primaryFill,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toMatch(/keepTrainingBtn: \{[\s\S]*backgroundColor: colors\.primaryFill,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toContain('staleResumeText: { ...type.bodyStrong, color: colors.onPrimary }');
    expect(ACTIVE_WORKOUT).toContain('keepTrainingBtnText: { ...type.bodyStrong, color: colors.onPrimary }');
    expect(ACTIVE_WORKOUT).not.toContain('staleResumeText: { fontSize: fontSize.md');
    expect(ACTIVE_WORKOUT).toMatch(/supPrimaryBtn: \{[\s\S]*backgroundColor: colors\.primaryFill,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toContain('supPrimaryBtnText: { ...type.bodyStrong, color: colors.onPrimary }');
  });
});
