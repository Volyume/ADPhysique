import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);
// Re-pinned for D43 S1 extraction: LoggedSetRow and EmptyExerciseView moved
// out of ActiveWorkoutScreen.js into src/components/workout/ (pure
// extraction, no behaviour/visual change -- see the extraction's own header
// comments in each moved file). The assertions below that used to read these
// components' JSX/styles off ACTIVE_WORKOUT now read the same source text
// off the new files instead; the invariant each assertion pins is unchanged.
const EMPTY_EXERCISE_VIEW = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'EmptyExerciseView.js'),
  'utf8',
);
// Re-pinned for D43 S2: the "N notes" accordion (notesRail/notesChip/
// notesChipText/notesExpanded) was retired from ActiveWorkoutScreen.js and
// replaced by StatusStrip (content-labelled chips, tap-to-expand per chip,
// no count). Assertions that used to read the chip styling off ACTIVE_WORKOUT
// now read the same source text off StatusStrip.js instead.
// RE-ANCHORED 2026-07-12 (R3 logger rebuild, founder order: full page
// rebuild): the Now card, header and bottom bar became dedicated
// components; several pins below moved with them. Every invariant is
// carried, none deleted - only the source anchor moved.
const SESSION_TOOLBAR = fs.readFileSync(path.resolve(__dirname, '../../components/workout/session/SessionToolbar.js'), 'utf8');
const SECTION = fs.readFileSync(path.resolve(__dirname, '../../components/workout/session/ExerciseSection.js'), 'utf8');
const STATUS_STRIP = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'workout', 'StatusStrip.js'),
  'utf8',
);

describe('ActiveWorkoutScreen gym-use polish', () => {
  test('terminal workout completion has one primary finish control', () => {
    // R3 law: two finish affordances never co-exist. RE-PINNED for the
    // logger rebuild stage A (D220): the toolbar's Finish is the ONE finish
    // control, always present, so the bottom bar never offers Finish (its
    // advance is Next exercise or nothing). WorkoutHeader is no longer
    // rendered by the logger.
    expect(ACTIVE_WORKOUT).toContain('<SessionToolbar');
    expect(ACTIVE_WORKOUT).toContain('onFinish={handleFinishWorkout}');
    expect(ACTIVE_WORKOUT).not.toContain('<WorkoutHeader');
    expect(ACTIVE_WORKOUT).not.toContain("testID: 'volyume-btn-finish-primary'");
    // Stage B (D220): the bottom bar is retired from the render altogether.
    expect(ACTIVE_WORKOUT).not.toContain('<WorkoutBottomBar');
    expect(SESSION_TOOLBAR).toContain('testID="volyume-workout-finish"');
    expect(SESSION_TOOLBAR).toContain('accessibilityLabel="Finish workout"');
  });

  test('finish-workout confirmation and retry copy use the same action name', () => {
    expect(ACTIVE_WORKOUT).toContain("text: 'Finish workout'");
    expect(ACTIVE_WORKOUT).toContain('tap Finish workout again');
    expect(ACTIVE_WORKOUT).not.toContain("text: 'Finish',");
    expect(ACTIVE_WORKOUT).not.toContain('tap Finish again');
  });

  test('D218: only a database read that succeeded can say nothing is saved; a failed read never offers the discard', () => {
    // Adversarial review of D218 (2026-10-03): the empty-finish branch read
    // a failed getWorkoutSetsForWorkout as "no sets", so a workout whose only
    // sets sat on an exercise swapped out (saved, but gone from the logger's
    // list) offered "Discard workout" under "Nothing logged yet".
    // A failed read must stay distinguishable from an empty one: turning the
    // catch's null into [] would bring the discard back with every other pin
    // green (verification pass on the review fixes, NIT 4).
    expect(ACTIVE_WORKOUT).toContain('try { savedSets = await getWorkoutSetsForWorkout(activeWorkout.id); } catch (_) { savedSets = null; }');
    expect(ACTIVE_WORKOUT).toContain('const savedSetsRead = Array.isArray(savedSets);');
    expect(ACTIVE_WORKOUT).toContain('if (savedSetsRead && savedSets.length === 0 && memorySets.length === 0) {');
    expect(ACTIVE_WORKOUT).toContain('const confirmSets = savedSetsRead && savedSets.length ? savedSets : memorySets;');
    expect(ACTIVE_WORKOUT).not.toContain('if (confirmSets.length === 0) {');
    // The confirm never claims "0 sets" when it could not count them.
    expect(ACTIVE_WORKOUT).toContain("'The sets for this workout could not be counted just now.'");
    // The empty alert names what was typed (a number or a note), and never
    // says it "will be lost" beside Keep going (review NIT 12).
    expect(ACTIVE_WORKOUT).toContain(' What you typed in for ${exercise?.name || \'this exercise\'} is not logged yet. You can keep going and log it, or discard the workout.');
    expect(ACTIVE_WORKOUT).toContain("`This workout has no sets logged, so there is nothing to save.${typedSetNote}`");
  });

  test('stored workout name uses the same full-title rule as summary sharing', () => {
    expect(ACTIVE_WORKOUT).toContain("import { shareSessionName } from '../lib/sessionShareData';");
    // D218 (2026-10-03, audit F-7): the free-form title's names are the
    // exercises the workout's saved sets belong to (the finish's one report),
    // no longer the logger's list, which kept an exercise swapped in with
    // nothing logged and lost one swapped out after its sets were logged.
    expect(ACTIVE_WORKOUT).toContain('const exerciseNames = report.allExerciseNames;');
    // Founder device report 2026-08-24: the routine name was never even
    // offered here - the first argument was hard-coded null, so the
    // exercise-name fallback ran on every session from a named day and
    // swapping an exercise in silently renamed the whole workout. The rule
    // this test exists to protect is unchanged; it is now given the input
    // it always needed.
    expect(ACTIVE_WORKOUT).toContain('const sessionName = shareSessionName(finishedRoutineName, exerciseNames);');
    expect(ACTIVE_WORKOUT).not.toContain('shareSessionName(null, exerciseNames)');
    expect(ACTIVE_WORKOUT).toMatch(/finishedRoutineName = \(await getRoutineById\(activeWorkout\.routineId\)\)\?\.name/);
    expect(ACTIVE_WORKOUT).not.toContain("split(' ')[0]");
  });

  test('primary set CTA speaks the same action the user sees', () => {
    // R3: the bar's Button speaks its title (Button.js falls back
    // accessibilityLabel -> title), so the visible and spoken label are the
    // same string BY CONSTRUCTION - pin the label ternary and the fallback.
    // RE-PINNED for the logger rebuild stage B (D220): the primary is the
    // next row's check; its spoken name is the action's name (checkLabel),
    // "Log set n" by default and the guided-flow verbs otherwise.
    const label = ACTIVE_WORKOUT.match(/const nextCheckLabel = [\s\S]{0,420}?: undefined;/)?.[0] ?? '';
    expect(label).toContain("perSide ? 'Log other side'");
    expect(label).toContain("isWarmupEntry ? 'Log warm-up'");
    expect(label).toContain("? 'Start cluster'");
    expect(label).not.toContain('Complete set');
    expect(ACTIVE_WORKOUT).toContain('checkLabel: nextCheckLabel,');
    const SET_ROW = fs.readFileSync(path.resolve(__dirname, '../../components/workout/session/SetRow.js'), 'utf8');
    expect(SET_ROW).toContain('label={checkLabel || defaultCheckLabel(check, marker)}');
    expect(SET_ROW).toContain('accessibilityLabel={label}');
  });

  test('beginner education is a named overflow row, never chrome inside the set card (founder ruling 2026-07-12)', () => {
    // R3 rebuild: the in-card first-set paragraph is DELETED - the founder
    // ruled the set card carries the set, never a lesson. The same glossary
    // education is pull-only behind a named row.
    expect(ACTIVE_WORKOUT).toContain("'How logging works'");
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="How logging works"');
    expect(ACTIVE_WORKOUT).toContain('Use exercise options for form tips, warm-ups, swaps and session settings.');
    expect(ACTIVE_WORKOUT).toContain('accessibilityLabel="Exercise options"');
    expect(ACTIVE_WORKOUT).not.toContain('accessibilityLabel="More options for this exercise"');
    // The hint's RENDER is gone (its frozen style entries await the queued
    // dead-styles sweep, recorded on the board).
    expect(ACTIVE_WORKOUT).not.toContain('styles.firstSetHint');
    // The note input moved into NowCard, same calm placeholder.
    expect(STATUS_STRIP).toContain("item.icon && <Ionicons name={item.icon} size={14} color={item.iconColor || t.colors.textSecondary} />");
    expect(STATUS_STRIP).toMatch(/chip: \{[\s\S]*borderWidth: 1,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
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
    // Same-meaning re-anchor (C5-P14-02, D96). What this line pins is that a
    // swap reseeds the reps stepper from the NEW exercise's own rep band and
    // never inherits the outgoing exercise's numbers. A swapped-in exercise
    // is a zero-history first-ever set, so it now seeds the bottom of that
    // band, exactly like the loader's zero-history branch: a prefilled number
    // reads as an instruction, and the top of the band is the hardest end of
    // a range at a weight nobody knows yet.
    expect(swapWindow).toContain('reps: newRepMin || DEFAULT_SET.reps');
    expect(swapWindow).not.toContain('reps: newRepMax');
    expect(swapWindow).toContain('setGhostSet(null);');
    expect(swapWindow).toContain('setCluster(null);');
    expect(swapWindow).toContain("setClusterReps('');");
    expect(swapWindow).toContain('setExtraSetArmed(false);');
    expect(swapWindow).toContain("setNoteText('');");
    // R3: the note UI's open/closed state lives in NowCard, collapsed by
    // its noteResetKey (exercise index + logged count) - the screen only
    // clears the text.
    // Stage B (D220): the next set's note is noteText, edited in the row
    // sheet; the sheet reads it live, so the cleared text is what reopens.
    expect(ACTIVE_WORKOUT).toContain("note={rowSheet?.kind === 'next' ? noteText : (rowSheet?.set?.notes ?? null)}");
  });

  test('exercise changes clear stale per-exercise note UI', () => {
    const loadWindow = ACTIVE_WORKOUT.match(/\/\/ Load previous performance and set defaults when exercise changes[\s\S]*?async function loadHistory/)?.[0] ?? '';

    expect(loadWindow).toContain("setNoteText('');");
    // R3: see the swap test above - NowCard's noteResetKey collapses the
    // note row on every exercise change.
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


  test('set entry stays compact while keeping thumb-sized steppers', () => {
    // Regex, not a literal: the rule is that SetEntry reads its sizes from
    // the layout tokens, not which tokens it happens to import. `touchTarget`
    // joined `workoutLoggerSize` there when the hard-coded 44s were
    // consolidated onto the platform minimum.
    // Phase 2B (physical-device corrective redesign): the house-Card shell
    // is retired - the active set renders as the CURRENT ROW of the one
    // continuous sequence, a light surface, never a giant detached card.
    // Founder device order 2026-08-17: the 3dp coloured left accent is
    // retired too (decoration, not information) - uniform 1px border only.
    // Position + target still fold into its ONE tappable line; the prefill
    // row keeps a 36 min-height target.
    // Stage B (D220): the position line feeds the rest sheet's next-set line.
    expect(ACTIVE_WORKOUT).toContain('return `${orientationLabel} · ${w} ${units} × ${r}`;');
    // RE-PINNED for the logger rebuild stage A (D220): the active exercise's
    // name is the ExerciseSection header (amber title role, one line); the
    // old title row and its chevron are no longer rendered. The frozen
    // styles below stay pinned until the stage D clean-up removes them.
    expect(ACTIVE_WORKOUT).toContain('name={exercise.name}');
    // D220 addendum 10: the guide is behind the active header's name tap.
    expect(ACTIVE_WORKOUT).toContain('onPressHeader={handleOpenExerciseDetails}');
    // Re-pinned (founder orders 2026-08-17, Campaign 27/28): the exercise
    // name stepped down one notch, title -> bodyStrong ("ever so slightly
    // smaller"), and the tap row gained the details chevron - the name now
    // shrinks (minWidth: 0) so the chevron hugs its end, drops Android's
    // extra font padding for a true centre line with the dots, and the tap
    // row centres on the same 44dp axis the dots box uses.
    // Re-pinned 2026-08-18 (founder device order): a second step down,
    // bodyStrong -> label + semibold, after the 16px name overpowered the
    // outline strip on the S22 walk. Layout facts stay pinned unchanged.
    // Clean-up (D220): the title row's frozen styles are deleted with it;
    // the exercise name is ExerciseSection's title, one line. Re-pinned
    // (founder device verdict 2026-10-08, D220 addendum 7): the plan
    // detail's exercise row, bodyStrong in primary ink, not amber.
    // Addendum 10: the name is back at the founder's 2026-08-18 size, label
    // semibold, so every library name holds one line across the header.
    expect(SECTION).toContain("name: { ...t.type.w(t.type.label, 'semibold'), color: t.colors.textPrimary },");
    // D220 addendum 9 (founder render verdict): the name holds ONE line and
    // the whole header is the tap, a 56 dp row.
    expect(SECTION).toMatch(/style=\{\[styles\.name, live\.name, skipped && live\.nameSkipped\]\}\s*numberOfLines=\{1\}\s*adjustsFontSizeToFit\s*minimumFontScale=\{NAME_MIN_SCALE\}/);
    expect(SECTION).toMatch(/header: \{[\s\S]{0,120}?minHeight: HEADER_MIN_HEIGHT,/);
    expect(SECTION).toContain('const HEADER_MIN_HEIGHT = 56;');
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.exerciseNameChevron}');
    expect(ACTIVE_WORKOUT).not.toContain('targetRow:');
    expect(ACTIVE_WORKOUT).not.toContain('targetText:');
    // Re-pinned for D43 S1 extraction: loggedSetRow moved to
    // src/components/workout/LoggedSetRow.js's own frozen styles.
    expect(ACTIVE_WORKOUT).toContain('numberOfLines={1}');
    // Phase 2B (founder ruling, screenshot failure 7): routine estimated-max
    // copy is REMOVED from the entry card - the record system (recordRow /
    // recordLine.isRecord) is the only max-adjacent surface left.
  });

  test('high-impact workout text uses the semantic Inter type roles', () => {
    // R5 (D66, 2026-07-11): the elapsed timer moved off brand amber onto
    // textPrimary - it is data, not decoration, and the header amber
    // competed with the single filled Log set CTA. Same type.num role.
    // Clean-up (D220): the clock is SessionClock, tabular title numerals in
    // Re-pinned (D220 addendum 12): the clock sits on the session title's
    // line (SessionHeader), tabular title numerals in secondary ink, no pill,
    // no caption, and the toolbar no longer hosts it.
    const CLOCK = fs.readFileSync(path.resolve(__dirname, '../../components/workout/session/SessionClock.js'), 'utf8');
    expect(CLOCK).toContain("text: { ...t.type.num('title'), color: t.colors.textSecondary },");
    const HEADER = fs.readFileSync(path.resolve(__dirname, '../../components/workout/session/SessionHeader.js'), 'utf8');
    expect(HEADER).toContain('{startTime ? <SessionClock startTime={startTime} /> : null}');
    const TOOLBAR = fs.readFileSync(path.resolve(__dirname, '../../components/workout/session/SessionToolbar.js'), 'utf8');
    expect(TOOLBAR).not.toContain('SessionClock');
    // letterSpacing: 0 literal removed (design campaign D3, 2026-07-09): raw
    // letterSpacing literals are swept to tokens/deleted app-wide; 0 was
    // value-identical to the RN default so the property is simply gone now.
    // D148: the logger's primary is the standard primary (raised surface,
    // white label), not an amber fill.
    expect(ACTIVE_WORKOUT).toContain('completeBtnText: { ...type.bodyStrong, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).toContain('sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm }');
    expect(ACTIVE_WORKOUT).toContain('swapTitle: { ...type.title, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).toContain('supTitle: { ...type.h3, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).not.toMatch(/exerciseName: \{ flex: 1, fontSize: fontSize\.lg,[\s\S]*fontWeight: fontWeight\.black/);
    expect(ACTIVE_WORKOUT).not.toMatch(/completeBtnText: \{ fontSize: fontSize\.md,[\s\S]*fontWeight: fontWeight\.bold/);
  });



  test('menu and secondary actions are plain under fatigue', () => {
    expect(ACTIVE_WORKOUT).toContain("import { workoutLoggerSize } from '../styles/layout';");
    // Clean-up (D220): the overflow is the section footer's 48 dp target.
    expect(SECTION).toMatch(/more: \{\s*minWidth: touchTarget\.minimum,\s*height: touchTarget\.minimum,/);
    expect(ACTIVE_WORKOUT).not.toContain('style={styles.swapBtn}');
    expect(ACTIVE_WORKOUT).not.toContain('swapBtnText');
    // R3 rebuild: the header's finish control and the bar's actions moved
    // to WorkoutHeader/WorkoutBottomBar, both on the shared Button/thumb
    // minimums.
    // RE-ANCHORED 2026-07-27 (founder order: "get rid of the Finish wording
    // and just have the ticks so it matches the X on the other side"). Finish
    // is no longer a labelled pill with its own `finishBtn` style -- it shares
    // `iconBtn` with the cancel X. The GUARANTEE this test exists for is
    // unchanged and still pinned: the control is a full thumb-sized target.
    // iconBtn sets width AND height to the same token, so it is now pinned
    // squarely rather than as a minHeight.
    // RE-PINNED 2026-08-18 (founder device order: the header actions "look
    // completely out of place"): the 44dp bordered square became a 40dp
    // borderless DISC. The GUARANTEE this test exists for - a full
    // thumb-sized target under fatigue - is unchanged and still pinned, now
    // as the full-size target token PLUS the hitSlop on both controls. The
    // container came off entirely in the second pass; the thumb size did
    // not change.
    // RE-PINNED for the logger rebuild stage A (D220): the toolbar is
    // SessionToolbar. The GUARANTEE is the same: Cancel and Finish are each
    // a full 48 dp target (touchTarget.minimum on both axes), Finish keeps
    // its test id and its full spoken name.
    expect(SESSION_TOOLBAR).toMatch(/close: \{\s*width: touchTarget\.minimum,\s*height: touchTarget\.minimum/);
    expect(SESSION_TOOLBAR).toMatch(/finish: \{\s*width: touchTarget\.minimum,\s*height: touchTarget\.minimum/);
    expect(SESSION_TOOLBAR).toContain('testID="volyume-workout-close"');
    expect(SESSION_TOOLBAR).toContain('testID="volyume-workout-finish"');
    expect(ACTIVE_WORKOUT).toContain('inlineActionPill');
    // Re-pinned for D43 S1 extraction: addFirstBtn/addFirstBtnText moved to
    // src/components/workout/EmptyExerciseView.js's own frozen styles.
    expect(EMPTY_EXERCISE_VIEW).toMatch(/addFirstBtn: \{[\s\S]*minHeight: workoutLoggerSize\.addExerciseMinHeight,[\s\S]*backgroundColor: colors\.surface2,[\s\S]*paddingHorizontal: spacing\.lg,[\s\S]*paddingVertical: spacing\.sm/);
    expect(EMPTY_EXERCISE_VIEW).toContain('addFirstBtnText: { ...type.label, color: colors.textPrimary }');
    expect(EMPTY_EXERCISE_VIEW).not.toContain('addFirstBtnText: { fontSize: fontSize.lg');
    // D1 sweep (design-consistency-audit-2026-08-06, DD62/DD63): this
    // assertion's greedy [\s\S]* previously matched past inlineActionPill's
    // own closing brace and was satisfied by an unrelated literal
    // `minHeight: 44` further down the file (swapBrowseBtn, now converted to
    // the workoutLoggerSize token). inlineActionPill itself has used
    // workoutLoggerSize.primaryActionMinHeight since D43 S5 (see the comment
    // on that style); scope the match to its own block.
    expect(ACTIVE_WORKOUT).toMatch(/inlineActionPill: \{[\s\S]*?minHeight: workoutLoggerSize\.primaryActionMinHeight[\s\S]*?\n  \},/);
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
    expect(ACTIVE_WORKOUT).toContain('<Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Add exercise</Text>');
    // R3 rebuild (founder ruling 2026-07-12): the corner pencil was a
    // one-way latch (open only, dead after its first tap) and is DELETED.
    // NowCard's note row is the one entry point and toggles honestly both
    // ways - Add a note opens it, Remove note closes it.
    expect(ACTIVE_WORKOUT).not.toContain('volyume-note-corner-btn');
    // Re-pinned for D43 S2: the U-A-1 "N notes"/"N cues" count wording is
    // retired entirely -- StatusStrip labels every chip by content (Recovery,
    // Superset, Coach note, Starter session, Target met), never a count.
    // This assertion now pins the ABSENCE of the count pattern plus the
    // presence of the content-labelled chip items StatusStrip receives.
    // Re-pinned for D93-2 (Phase 2 terminology canon, concept 3): the
    // "Deload" chip leak is renamed "Recovery" so it never shows a second
    // name for the same "Recovery week" banner it expands into.
    expect(ACTIVE_WORKOUT).not.toContain('noteCount');
    expect(ACTIVE_WORKOUT).not.toMatch(/note\{.*!== 1 \? 's' : ''\}/);
    expect(ACTIVE_WORKOUT).toContain("label: 'Starter session'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Superset'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Coach note'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Recovery'");
    expect(ACTIVE_WORKOUT).toContain("label: 'Target met'");
    expect(ACTIVE_WORKOUT).toContain('<StatusStrip items={items} />');
    expect(ACTIVE_WORKOUT).not.toContain('testID="volyume-btn-add-mid-workout"');
    expect(ACTIVE_WORKOUT).not.toContain('secondaryActions: {');
    expect(ACTIVE_WORKOUT).not.toContain('actionBtnText');
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): live.keepTrainingBtnText
    // override appended (source: useTheme.js); frozen style byte-identical.
    expect(ACTIVE_WORKOUT).toContain('<Text style={[styles.keepTrainingBtnText, live.keepTrainingBtnText]}>Keep training</Text>');
    expect(ACTIVE_WORKOUT).not.toContain('>Keep Training<');
    // D220 review: the check is the one control, so the retry names it.
    expect(ACTIVE_WORKOUT).toContain("const retryAction = 'the check';");
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
    expect(ACTIVE_WORKOUT).toContain('<Text style={[styles.sheetTitle, live.sheetTitle]}>Warm-up sets</Text>');
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
  });

  // Founder-reported 2026-07-19: an accidentally-logged set could only be
  // removed via the (invisible) long-press menu. The inline editor now hosts a
  // discoverable destructive Delete, reusing the SAME handleDeleteEditedSet
  // confirm-then-remove flow the long-press menu already used.
  test('the in-place set editor exposes a discoverable Delete that reuses the existing delete flow', () => {
    // Stage B (D220): the row sheet's Delete set reuses openDeleteFromMenu,
    // which drives the SAME handleDeleteEditedSet confirm-then-remove flow.
    expect(ACTIVE_WORKOUT).toContain("onDelete={rowSheet?.kind === 'logged' ? () => openDeleteFromMenu(rowSheet.set) : undefined}");
  });

  test('modal actions use the same compact logger button system', () => {
    expect(ACTIVE_WORKOUT).toMatch(/staleResume: \{[\s\S]*backgroundColor: colors\.surface2,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toMatch(/keepTrainingBtn: \{[\s\S]*backgroundColor: colors\.surface2,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toContain('staleResumeText: { ...type.bodyStrong, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).toContain('keepTrainingBtnText: { ...type.bodyStrong, color: colors.textPrimary }');
    expect(ACTIVE_WORKOUT).not.toContain('staleResumeText: { fontSize: fontSize.md');
    expect(ACTIVE_WORKOUT).toMatch(/supPrimaryBtn: \{[\s\S]*backgroundColor: colors\.surface2,[\s\S]*minHeight: workoutLoggerSize\.primaryActionMinHeight/);
    expect(ACTIVE_WORKOUT).toContain('supPrimaryBtnText: { ...type.bodyStrong, color: colors.textPrimary }');
  });
});
