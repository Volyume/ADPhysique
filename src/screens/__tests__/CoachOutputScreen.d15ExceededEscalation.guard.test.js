/**
 * D15 (founder ruling 2026-07-09, DECISIONS-2026-07-09.md): CoachOutputScreen
 * wiring for the consecutiveExceededWeeks escalation input and the
 * "adherence-why" first-real-output line.
 *
 * This screen cannot be safely `require`'d in Jest (expo-notifications,
 * Reanimated, the live zustand store; no existing mock scaffold -- see
 * CoachOutputScreen.progressScanAssessment.test.js and
 * CoachOutputScreen.profileMerge.guard.test.js, both source-guard-only for
 * the same reason). This suite follows that same established house
 * convention: fs.readFileSync + regex against the real source.
 *
 * Pins:
 *  1. consecutiveExceededWeeks is derived with the SAME iterate-and-break
 *     style as the existing consecutivePoorRecoveryWeeks (same recentCheckins
 *     rows, most-recent-first), keyed off the check-in's own stored
 *     trainingPerformance === 'exceeded' verdict, not an invented metric.
 *  2. Both consecutiveExceededWeeks and calmMode (the wellbeing calm-mode
 *     read already computed on this screen) are threaded into the
 *     runWeeklyCoach() call.
 *  3. The adherence-why line uses the '@volyume_seen_*' once-ever convention,
 *     is gated on hasEnoughData (never shown on a baseline/insufficient-data
 *     run), and is set to render at most once (never re-armed once seen).
 *  4. The rendered line is the exact copy, contains no mention of weight,
 *     body or calories/intake (D15 ED-safety: training/logging-only framing).
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

describe('D15: consecutiveExceededWeeks derivation + threading', () => {
  test('derived from recentCheckins with the same iterate-and-break style as consecutivePoorRecoveryWeeks', () => {
    const fnMatch = SCREEN.match(
      /const consecutiveExceededWeeks = \(\(\) => \{[\s\S]*?\}\)\(\);/,
    );
    expect(fnMatch).toBeTruthy();
    const fn = fnMatch[0];
    expect(fn).toMatch(/for \(const ci of recentCheckins\)/);
    expect(fn).toMatch(/ci\.trainingPerformance === 'exceeded'/);
    expect(fn).toMatch(/count\+\+/);
    expect(fn).toMatch(/else break;/);
  });

  test('both consecutiveExceededWeeks and calmMode are passed into runWeeklyCoach', () => {
    const callMatch = SCREEN.match(/const result = runWeeklyCoach\(\{[\s\S]*?\n\s{6}\}\);/);
    expect(callMatch).toBeTruthy();
    const call = callMatch[0];
    expect(call).toMatch(/consecutiveExceededWeeks,/);
    expect(call).toMatch(/calmMode: calmNow,/);
  });
});

describe('D15: adherence-why once-ever line', () => {
  test('the seen-flag follows the @volyume_seen_* convention', () => {
    expect(SCREEN).toMatch(/const ADHERENCE_WHY_SEEN_KEY = '@volyume_seen_coach_adherence_why';/);
  });

  test('only armed inside the hasEnoughData branch, and only once (checks the seen-flag first)', () => {
    const blockMatch = SCREEN.match(
      /if \(result\.hasEnoughData\) \{[\s\S]*?\n\s{6}\}/,
    );
    expect(blockMatch).toBeTruthy();
    const block = blockMatch[0];
    expect(block).toMatch(/AsyncStorage\.getItem\(ADHERENCE_WHY_SEEN_KEY\)/);
    expect(block).toMatch(/if \(seenAdherenceWhy !== 'true'\) \{/);
    expect(block).toMatch(/setShowAdherenceWhy\(true\)/);
    expect(block).toMatch(/AsyncStorage\.setItem\(ADHERENCE_WHY_SEEN_KEY, 'true'\)/);
  });

  test('showAdherenceWhy starts false and is never set anywhere outside that one guarded branch', () => {
    expect(SCREEN).toMatch(/const \[showAdherenceWhy, setShowAdherenceWhy\] = useState\(false\);/);
    const setterSites = SCREEN.match(/setShowAdherenceWhy\(/g) || [];
    // Exactly one call site: inside the seen-flag guard above (initial state
    // declaration's default doesn't count as a "setter call").
    expect(setterSites.length).toBe(1);
  });

  test('the rendered line is gated on showAdherenceWhy and carries the exact approved copy', () => {
    const renderMatch = SCREEN.match(
      /\{showAdherenceWhy \? \([\s\S]*?\) : null\}/,
    );
    expect(renderMatch).toBeTruthy();
    const block = renderMatch[0];
    expect(block).toContain(
      'Consistency is what your coach reads best. The more sessions you log, the better it understands how your body responds, and the more precisely it can adjust your plan.',
    );
  });

  test('the line never mentions weight, body composition or calories/intake (training/logging-only framing)', () => {
    const renderMatch = SCREEN.match(/\{showAdherenceWhy \? \([\s\S]*?\) : null\}/);
    const block = renderMatch[0].toLowerCase();
    expect(block).not.toMatch(/\bweight\b|\bbodyweight\b|\bcalorie|\bintake\b/);
    expect(block).not.toMatch(/—/);
  });
});
