/**
 * AX-14 (launch accessibility audit, 2026-07-12) source guard.
 *
 * The SCOFF wellbeing questionnaire rendered each question above two buttons
 * whose only accessible names were "Yes" and "No" (accessibilityRole="button",
 * accessibilityState.selected), repeated identically across five questions -- so
 * on direct control navigation or re-entry a screen reader announced an
 * ambiguous "Yes, selected" with no idea which sensitive question it answered.
 *
 * The fix makes each question a labelled radiogroup of two mutually-exclusive
 * radios with a checked state, hides the now-redundant visible question from
 * assistive tech (the group label carries it), and explains the disabled Save.
 *
 * This is a scoped SOURCE guard (WellbeingCheckScreen is ED-safety-adjacent and
 * pulls in heavy scaffolding). It deliberately ALSO checks that the answer
 * scoring path (SCOFF_QUESTIONS, toggle) is still present and untouched, since
 * the a11y change must not alter the questionnaire's behaviour.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'WellbeingCheckScreen.js'),
  'utf8',
);

describe('AX-14: SCOFF questions are accessible radiogroups', () => {
  test('each question row is a radiogroup labelled with the question', () => {
    expect(SRC).toMatch(/accessibilityRole="radiogroup"\s+accessibilityLabel=\{q\}/);
  });

  test('the two options are radios, not plain buttons', () => {
    expect(SRC).toMatch(/accessibilityRole="radio"/);
    // No option button role should remain in the questionnaire rows.
    expect(SRC).not.toMatch(/accessibilityRole="button"[\s\S]*?accessibilityLabel="Yes"/);
  });

  test('the options expose a checked state (radio), not selected (button)', () => {
    expect(SRC).toMatch(/accessibilityState=\{\{ checked: answers\[i\] === true \}\}/);
    expect(SRC).toMatch(/accessibilityState=\{\{ checked: answers\[i\] === false \}\}/);
    expect(SRC).not.toMatch(/accessibilityState=\{\{ selected: answers\[i\]/);
  });

  test('the visible question is hidden from assistive tech (carried by the group label)', () => {
    expect(SRC).toMatch(/accessibilityElementsHidden\s+importantForAccessibility="no-hide-descendants"/);
  });

  test('the disabled Save state is explained as a polite live region', () => {
    expect(SRC).toMatch(/Answer all five questions to save/);
    expect(SRC).toMatch(/accessibilityLiveRegion="polite"/);
  });

  test('the questionnaire scoring path is untouched', () => {
    expect(SRC).toMatch(/SCOFF_QUESTIONS\.map/);
    expect(SRC).toMatch(/onPress=\{\(\) => toggle\(i, true\)\}/);
    expect(SRC).toMatch(/onPress=\{\(\) => toggle\(i, false\)\}/);
  });
});
