/**
 * EP-19/UI-08/P-07 (Codex end-user-polish audit): the Article 9
 * withdraw-consent catch showed `e?.message ?? 'Unknown error.'` in the
 * appAlert body, so a raw thrown exception's message (Supabase RPC error
 * text, etc.) could reach the user during a consent-withdrawal / account-
 * deletion flow. logError already captures the real cause on the line
 * above; only the shown copy changes here.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'useAccountActions.js'),
  'utf8',
);

describe('useAccountActions withdraw-consent alert never shows a raw exception message', () => {
  test('the catch no longer interpolates e.message/e?.message', () => {
    expect(src).not.toMatch(/appAlert\("Couldn't withdraw", e\?\.message/);
  });

  test('the catch logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('SettingsScreen\.withdrawConsent', e, \{ uid: user\?\.id \}\);\s*\n\s*appAlert\("Couldn't withdraw", 'Try again in a moment\.'\);/,
    );
  });
});
