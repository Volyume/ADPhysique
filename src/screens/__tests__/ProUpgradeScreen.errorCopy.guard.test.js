/**
 * EP-19/UI-08/P-07 / EP-18/UI-07 (Codex end-user-polish audit): handleOAuth's
 * provider-error branch showed `result.error.message || 'Sign-in failed'` in
 * a toast, so a raw Supabase/provider error string (which is neither
 * guaranteed to exist nor guaranteed to be user-appropriate copy) could reach
 * the user instead of the calm, stable line the thrown-exception branch a
 * few lines below already uses ("Sign-in did not complete, try again").
 * logError already captured the real result.error on the line above; only
 * the shown copy changes here.
 *
 * Source guard: this screen's colocated ProUpgradeScreen.oauth.guard.test.js
 * covers the shared-OAuthButtons wiring, not this specific toast string.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ProUpgradeScreen.js'),
  'utf8',
);

describe('ProUpgradeScreen OAuth provider-error toast never shows the raw SDK message', () => {
  test('the provider-error branch no longer interpolates result.error.message', () => {
    expect(src).not.toMatch(/toast\.show\(result\.error\.message/);
  });

  test('the provider-error branch shows the same calm, stable copy as the thrown-exception branch', () => {
    expect(src).toMatch(
      /logError\('ProUpgrade\.oauth\.providerError', result\.error, \{ provider \}\);\s*\n\s*toast\.show\('Sign-in did not complete, try again', \{ variant: 'error' \}\);/,
    );
  });
});
