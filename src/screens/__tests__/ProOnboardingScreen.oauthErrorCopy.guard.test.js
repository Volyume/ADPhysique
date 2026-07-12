/**
 * FR-2 (ux-world-class-audit-2026-07-09): ProOnboardingScreen's OAuth error
 * path used to pass the raw provider/SDK error.message straight into
 * appAlert, so a GoTrue/native-SDK string could be the first thing a new
 * user reads. Pins that the provider-error branch shows only the calm
 * fallback sentence (matching LoginScreen's FR-2 fix and the L01-B35
 * pattern), never `result.error.message` interpolated into the alert body,
 * while logError still captures the real error unchanged.
 *
 * EP-18/UI-07 (end-user-polish audit): the thrown-exception catch (native-
 * bridge failure, browser-launch failure, malformed config) only logged,
 * leaving the wizard silently return to idle with no explanation. Pins that
 * the catch now shows the SAME calm fallback sentence as the resolved-error
 * branch above, while logError still captures the real thrown exception
 * unchanged.
 *
 * Source-scan guard (not a render test) because ProOnboardingScreen's OAuth
 * step needs a large amount of unrelated onboarding scaffolding mocked to
 * mount; a direct read of the fixed call site is a stronger, cheaper pin.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'ProOnboardingScreen.js'), 'utf8');

describe('ProOnboardingScreen OAuth error copy (FR-2)', () => {
  test('never interpolates the raw provider/SDK error.message into the alert', () => {
    expect(src).not.toMatch(/appAlert\(\s*['"]Sign-in failed['"]\s*,\s*result\.error\.message\s*\)/);
  });

  test('shows the calm fallback sentence, matching LoginScreen\'s fix', () => {
    expect(src).toMatch(/appAlert\(\s*['"]Sign-in failed['"]\s*,\s*"That didn't go through\. Try again\."\s*\)/);
  });

  test('logError still captures the real provider error, unchanged', () => {
    expect(src).toMatch(/logError\('ProOnboarding\.oauth\.providerError',\s*result\.error,\s*\{\s*provider\s*\}\)/);
  });
});

describe('ProOnboardingScreen OAuth thrown-exception copy (EP-18/UI-07)', () => {
  test('the thrown-exception catch shows the same calm fallback alert, not just a log', () => {
    expect(src).toMatch(
      /logError\('ProOnboarding\.oauth\.threw', e, \{ provider \}\);\s*\n[\s\S]{0,400}?appAlert\(\s*['"]Sign-in failed['"]\s*,\s*"That didn't go through\. Try again\."\s*\);/,
    );
  });

  test('the thrown-exception catch is not silent (logError alone, no user-facing call)', () => {
    const threwCatch = src.match(/\} catch \(e\) \{\s*\n\s*logError\('ProOnboarding\.oauth\.threw'[\s\S]*?\n\s*\} finally \{/);
    expect(threwCatch).toBeTruthy();
    expect(threwCatch[0]).toMatch(/appAlert\(/);
  });
});
