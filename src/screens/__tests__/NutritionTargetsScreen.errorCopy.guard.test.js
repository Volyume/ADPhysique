/**
 * EP-19/UI-08/P-07 (Codex end-user-polish audit): handleCalculate's outer
 * catch showed `e.message || 'Could not calculate targets'` in a toast, so an
 * uncaught engine/SDK exception's raw text (potentially unstable, non-UK-
 * English, or implementation detail) could reach the user. The raw cause is
 * now only logged (via lib/errorLog's logError, matching this file's own
 * existing lazy-require pattern used at its inner save-catch a few lines
 * above), and the toast shows a stable, calm string.
 *
 * Source guard: this screen already has heavier render-based suites
 * (NutritionTargetsScreen.bodyMetricValidate.guard.test.js etc.) that don't
 * drive the engine into throwing, so pinning the exact fixed string in
 * source is the more direct contract here.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'NutritionTargetsScreen.js'),
  'utf8',
);

describe('NutritionTargetsScreen never shows a raw exception message to the user', () => {
  test('the outer calculate catch no longer interpolates e.message into the toast', () => {
    expect(src).not.toMatch(/toast\.show\(e\.message/);
    expect(src).not.toMatch(/toast\.show\(e\?\.message/);
  });

  test('the outer calculate catch logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('NutritionTargets\.calculate', e, \{ userId: user\?\.id \}\); \} catch \(_\) \{\}\s*\n\s*toast\.show\('Could not calculate your targets, try again', \{ variant: 'error' \}\);/,
    );
  });
});
