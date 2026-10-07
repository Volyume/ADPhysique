/**
 * First-run activation in the logger (activation ruling, coherence pass).
 *
 * What this suite pins and why. A first-time user standing at a machine met
 * three avoidable stalls in the logger, all of them things Volyume already
 * knew and did not say:
 *
 *  1. THE BLANK WEIGHT BOX. With no history for a lift there was no prefill
 *     row at all - Phase 2B had retired the old quiet line because it
 *     REPEATED the position line's own range ("Set 1 of 6 - Working ·
 *     8-12 reps" then "First time - Target 8-12 reps"). The repetition was
 *     the objection, not the row. The line returns in words, never as a
 *     second copy of the range, on the FIRST working set of each exercise
 *     only, and through the quiet (non-tappable) NowCard variant - there is
 *     no history to apply, so there is nothing to tap. The word "Target" must
 *     never come back into it: that was the retired phrasing.
 *  2. THE UNANNOUNCED REST TIMER. The strip auto-starts on a logged set, so
 *     its first appearance is unexplained. One caption, once per install,
 *     dismissed on "Got it" or when the rest ends.
 *  3. THE LOCK-SCREEN COUNTDOWN THAT CANNOT SHOW. That same first rest is
 *     the honest, in-context moment to ask for notification access - and only
 *     if the OS prompt has never been answered. A user who has already
 *     granted or denied is never asked again, and nothing is asked on mount.
 *
 * Source-level guards, this screen's convention (see
 * ActiveWorkoutScreen.usability.guard.test.js): the behaviour lives inside a
 * 6,500-line component whose render path needs the whole workout stack, so
 * the contract is pinned against the source text.
 *
 * NOT pinned here: RestTimer's own Android exact-alarm ask. It is untouched
 * by this work and keeps its own key; the last test only proves it is still
 * there and still the only owner of that prompt.
 */
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);
const REST_TIMER = fs.readFileSync(
  path.resolve(__dirname, '../../components/RestTimer.js'),
  'utf8',
);

// RE-ANCHORED for the logger rebuild stage B (D220): the prefill rows are
// retired. Last session is the next row's Last cell (lastCellFor), the
// recovery-week numbers are the row's Target cell and ghost seed, and the
// first-time copy is the quiet line above the table (firstTimeLine). The
// block under test is that derivation.
const PREFILL_BLOCK = ACTIVE_WORKOUT.slice(
  ACTIVE_WORKOUT.indexOf('const firstTimeLine = '),
  ACTIVE_WORKOUT.indexOf('// Logger phase 2B: the outline navigator'),
);

describe('the first-time prefill line', () => {
  test('the copy exists, and never restates the range or says "Target"', () => {
    expect(PREFILL_BLOCK).toContain('First time on this lift. Pick a weight you could lift about ${band.max} times, with a couple in reserve. It is saved for next time.');
    // Band unavailable (freeform slot, no recommended reps): the same
    // instruction without a number, never a blank or a fabricated range.
    expect(PREFILL_BLOCK).toContain(
      'Pick a weight you could lift for the full rep range, with a couple in reserve. It is saved for next time.',
    );
    // The retired phrasing. "First time - Target 8-12 reps" duplicated the
    // position line; the branch that builds this row may never reintroduce
    // it. Sliced from the code (not the comment above it, which quotes the
    // retired string on purpose) to the close of the prefill object.
    const code = PREFILL_BLOCK.slice(
      PREFILL_BLOCK.indexOf('const band = bandFor(0);'),
      PREFILL_BLOCK.indexOf(': null;', PREFILL_BLOCK.indexOf('const band = bandFor(0);')),
    );
    expect(code).not.toMatch(/Target/);
    // Nor the range string itself - that is the position line's job.
    expect(code).not.toContain('${range}');
  });

  test('it reads the same band the position line resolves from', () => {
    // bandFor(index) reads the resolver's band for the position, else the
    // routine row's own; the first-time line reads position 0 through it.
    expect(PREFILL_BLOCK).toContain('const band = bandFor(0);');
    expect(ACTIVE_WORKOUT).toMatch(/function bandFor\(index\) \{\s*const p = prescriptions\[index\];\s*if \(p\?\.repsBand\) return p\.repsBand;/);
    expect(ACTIVE_WORKOUT).toContain('return { min: routineExercise.recommendedRepsMin, max: routineExercise.recommendedRepsMax };');
  });

  test('it is the last resort only: never over a real history row, never on a warm-up, and only on the first working set', () => {
    // Gated on: not a warm-up entry, the first working set, and no previous
    // working set at all (the Last cell would otherwise carry history).
    expect(PREFILL_BLOCK).toContain("(!isWarmupEntry && workingLogged === 0 && prevWorkingSets.length === 0 && setTableKind === 'weight_reps')");
    // Last session lives on the row itself now, never as a line.
    expect(ACTIVE_WORKOUT).toContain('const nextLast = isWarmupEntry ? null : lastCellFor(workingLogged);');
  });

  test('it renders as a quiet, non-tappable line that may wrap', () => {
    // No tap target: there is no history to apply.
    expect(PREFILL_BLOCK).not.toContain('onPress');
    const line = ACTIVE_WORKOUT.slice(ACTIVE_WORKOUT.indexOf('{firstTimeLine ? ('), ACTIVE_WORKOUT.indexOf(') : null}', ACTIVE_WORKOUT.indexOf('{firstTimeLine ? (')));
    expect(line).toContain('styles.sideCarveNote');
    expect(line).not.toContain('numberOfLines');
    expect(line).not.toContain('onPress');
  });
});

describe('the rest timer introduction and its one permission ask', () => {
  test('the once-ever keys exist, on the same @volyume_seen_ convention', () => {
    expect(ACTIVE_WORKOUT).toContain("const REST_HINT_SEEN_KEY = '@volyume_seen_rest_hint';");
    expect(ACTIVE_WORKOUT).toContain("const REST_NOTIF_ASKED_KEY = '@volyume_rest_notif_asked';");
  });

  test('the caption says where the countdown came from, and is dismissible', () => {
    expect(ACTIVE_WORKOUT).toContain(
      'text="Rest started because you logged a set. Adjust with the buttons, or skip it."',
    );
    expect(ACTIVE_WORKOUT).toMatch(/<HintCaption\s+text="Rest started because[\s\S]{0,120}onDismiss=\{dismissRestHint\}/);
    // Directly above the strip it explains.
    const captionAt = ACTIVE_WORKOUT.indexOf('text="Rest started because');
    const stripAt = ACTIVE_WORKOUT.indexOf('<RestTimer />');
    expect(captionAt).toBeGreaterThan(-1);
    expect(stripAt).toBeGreaterThan(captionAt);
  });

  test('it fires on the first running rest, not on mount, and clears when the rest ends', () => {
    const effect = ACTIVE_WORKOUT.slice(
      ACTIVE_WORKOUT.indexOf('const restHintCheckedRef = useRef(false);'),
      ACTIVE_WORKOUT.indexOf('const dismissRestHint = useCallback'),
    );
    expect(effect).toContain('if (!restTimerActive) {');
    expect(effect).toContain('setShowRestHint(false);');
    expect(effect).toContain('}, [restTimerActive]);');
    expect(effect).toContain("if (await AsyncStorage.getItem(REST_HINT_SEEN_KEY) === 'true') return;");
    expect(effect).toContain("await AsyncStorage.setItem(REST_HINT_SEEN_KEY, 'true');");
  });

  test('the notification ask is gated on an UNDETERMINED status and runs at most once per install', () => {
    const effect = ACTIVE_WORKOUT.slice(
      ACTIVE_WORKOUT.indexOf('const restHintCheckedRef = useRef(false);'),
      ACTIVE_WORKOUT.indexOf('const dismissRestHint = useCallback'),
    );
    // Non-prompting read first (permissions.js), then the single ask.
    expect(effect).toContain('const status = await getNotificationPermissionStatus();');
    expect(effect).toContain("if (status !== 'undetermined') return;");
    expect(effect).toContain('await requestNotificationPermissions();');
    expect(effect).toContain("if (await AsyncStorage.getItem(REST_NOTIF_ASKED_KEY) === 'true') return;");
    // Order: caption first, then the status read, then the ask. A user who
    // has already granted or denied never reaches the last line.
    const captionAt = effect.indexOf('setShowRestHint(true);');
    const statusAt = effect.indexOf('const status = await getNotificationPermissionStatus();');
    const askAt = effect.indexOf('await requestNotificationPermissions();');
    expect(captionAt).toBeGreaterThan(-1);
    expect(statusAt).toBeGreaterThan(captionAt);
    expect(askAt).toBeGreaterThan(statusAt);
    // Non-prompting helper imported from the permissions module itself.
    expect(ACTIVE_WORKOUT).toContain(
      "import { getNotificationPermissionStatus, requestNotificationPermissions } from '../lib/notifications/permissions';",
    );
  });

  test("RestTimer's exact-alarm ask is untouched and stays its sole owner", () => {
    expect(REST_TIMER).toContain("const EXACT_ALARM_PROMPTED_KEY = '@volyume_exact_alarm_prompted';");
    expect(REST_TIMER).toContain('await AsyncStorage.setItem(EXACT_ALARM_PROMPTED_KEY');
    expect(REST_TIMER).toContain("appAlert(\n          'Exact rest alerts',");
    // The screen never duplicates it.
    expect(ACTIVE_WORKOUT).not.toContain('EXACT_ALARM_PROMPTED_KEY');
    expect(ACTIVE_WORKOUT).not.toContain('requestExactAlarmAccess');
  });
});
