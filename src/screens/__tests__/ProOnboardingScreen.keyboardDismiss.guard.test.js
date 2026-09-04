/**
 * Founder defect 2026-09-04 (Android device walk): on the setup wizard the
 * keyboard stayed up across Continue, Back and the selectors until the user
 * closed it by hand. Android's number pad has no Done bar (the iOS bar is
 * TextField's, A1), the wizard's ScrollViews keep control taps from
 * blurring the field, and Android does not reliably hide the IME when the
 * focused input unmounts with the step. This pins the fix: every step
 * transition and every non-text selector on an input step calls
 * Keyboard.dismiss() first, and the wizard's scroll views carry the app's
 * iOS drag-to-dismiss convention (Android 'none', per ActiveWorkoutScreen's
 * recorded reason).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ProOnboardingScreen.js'), 'utf8');

describe('ProOnboardingScreen puts the keyboard away on its own', () => {
  test('Keyboard is imported from react-native', () => {
    expect(SRC).toMatch(/import \{[^}]*\bKeyboard\b[^}]*\} from 'react-native'/);
  });

  test.each(['advanceFrom2', 'advanceFrom3', 'advanceFrom4', 'advanceFrom5', 'advanceFrom6'])(
    '%s dismisses the keyboard before anything else',
    (fn) => {
      const re = new RegExp(`function ${fn}\\(\\) \\{\\s*Keyboard\\.dismiss\\(\\);`);
      expect(SRC).toMatch(re);
    },
  );

  test('advanceFrom7 and goBack dismiss it too', () => {
    expect(SRC).toMatch(/async function advanceFrom7\(\) \{\s*Keyboard\.dismiss\(\);/);
    expect(SRC).toMatch(/function goBack\(\) \{\s*if \(step === 1\) return;\s*Keyboard\.dismiss\(\);/);
  });

  test('the sex, height-unit and weight-unit selectors on the input step dismiss it', () => {
    expect(SRC).toContain('onChange={(v) => { Keyboard.dismiss(); setSex(v); }}');
    expect(SRC).toContain('onChange={(v) => { Keyboard.dismiss(); setLocalHeightUnits(v); }}');
    expect(SRC).toContain('onChange={(v) => { Keyboard.dismiss(); setLocalBWUnits(v); }}');
    expect(SRC).toContain('onChange={(v) => { Keyboard.dismiss(); setBfSource(v); }}');
  });

  test('every wizard scroll view carries the platform-split dismiss mode', () => {
    const scrollViews = SRC.match(/<ScrollView ref=\{scrollRef\} contentContainerStyle=\{styles\.scroll\}[^>]*>/g) || [];
    expect(scrollViews.length).toBeGreaterThanOrEqual(6);
    for (const sv of scrollViews) {
      expect(sv).toContain("keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}");
    }
  });
});
