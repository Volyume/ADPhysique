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
const NOW_CARD = fs.readFileSync(
  path.resolve(__dirname, '../../components/workout/NowCard.js'),
  'utf8',
);
const REST_TIMER = fs.readFileSync(
  path.resolve(__dirname, '../../components/RestTimer.js'),
  'utf8',
);

// The whole prefill decision, from the recovery-week branch down to the close
// of the `if (!isWarmupSet)` block that owns all three variants.
const PREFILL_BLOCK = ACTIVE_WORKOUT.slice(
  ACTIVE_WORKOUT.indexOf('let prefill = null;'),
  ACTIVE_WORKOUT.indexOf('positionLabel={orientationLabel}'),
);

describe('the first-time prefill line', () => {
  test('the copy exists, and never restates the range or says "Target"', () => {
    expect(PREFILL_BLOCK).toContain("label: 'First time on this lift.',");
    expect(PREFILL_BLOCK).toContain(
      'Pick a weight you could lift about ${bandMax} times, with a couple in reserve. It is saved for next time.',
    );
    // Band unavailable (freeform slot, no recommended reps): the same
    // instruction without a number, never a blank or a fabricated range.
    expect(PREFILL_BLOCK).toContain(
      "'Pick a weight you could lift for the full rep range, with a couple in reserve. It is saved for next time.'",
    );
    // The retired phrasing. "First time - Target 8-12 reps" duplicated the
    // position line; the branch that builds this row may never reintroduce
    // it. Sliced from the code (not the comment above it, which quotes the
    // retired string on purpose) to the close of the prefill object.
    const code = PREFILL_BLOCK.slice(
      PREFILL_BLOCK.indexOf('const bandMax = currentPrescription'),
      PREFILL_BLOCK.indexOf('return (', PREFILL_BLOCK.indexOf('const bandMax = currentPrescription')),
    );
    expect(code).not.toMatch(/Target/);
    // Nor the range string itself - that is the position line's job.
    expect(code).not.toContain('${range}');
  });

  test('it reads the same band the position line resolves from', () => {
    expect(PREFILL_BLOCK).toMatch(
      /const bandMax = currentPrescription\s*\?\s*currentPrescription\.repsBand\.max\s*:\s*\(routineExercise\?\.recommendedRepsMax \?\? null\);/,
    );
  });

  test('it is the last resort only: never over a real history row, never on a warm-up, and only on the first working set', () => {
    // Order matters: recovery-week hold, then Last session, then this.
    const recoveryAt = PREFILL_BLOCK.indexOf('SENIOR_RECOVERY_HOLD');
    const lastSessionAt = PREFILL_BLOCK.indexOf("label: 'Last session:',");
    const firstTimeAt = PREFILL_BLOCK.indexOf("label: 'First time on this lift.',");
    expect(recoveryAt).toBeGreaterThan(-1);
    expect(lastSessionAt).toBeGreaterThan(recoveryAt);
    expect(firstTimeAt).toBeGreaterThan(lastSessionAt);
    // The whole chain sits inside the warm-up exclusion.
    expect(PREFILL_BLOCK).toMatch(/if \(!isWarmupSet\) \{/);
    // One appearance per exercise per session, not a line above every set.
    expect(PREFILL_BLOCK).toContain('} else if (workingLogged === 0) {');
  });

  test('it renders through the quiet, non-tappable NowCard variant', () => {
    // No onUse anywhere in the first-time branch: there is no history to
    // apply, so a tap target would promise something that does not exist.
    const branch = PREFILL_BLOCK.slice(PREFILL_BLOCK.indexOf('} else if (workingLogged === 0) {'));
    expect(branch).not.toContain('onUse');
    // And NowCard still routes an onUse-less prefill to the quiet row.
    expect(NOW_CARD).toContain('prefill.onUse ? (');
    expect(NOW_CARD).toMatch(/styles\.prefillQuiet/);
    // The quiet row must be free to wrap: this copy is a sentence, not a
    // number pair, and a one-line clamp would cut it.
    const quiet = NOW_CARD.slice(NOW_CARD.indexOf('styles.prefillQuiet'), NOW_CARD.indexOf('<SetEntry'));
    expect(quiet).not.toContain('numberOfLines');
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
