/**
 * EP-19/UI-08/P-07 (Codex end-user-polish audit): finish()'s catch showed
 * `e?.message ?? 'Try again.'` in the appAlert body, so a raw thrown
 * exception's message (e.g. an AsyncStorage/SQLite error string) could reach
 * a brand-new user on their very first screen. The raw cause is now logged
 * via lib/errorLog (newly imported at the top of this file) and the alert
 * shows only the stable fallback copy.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'FirstRunScreen.js'),
  'utf8',
);

describe('FirstRunScreen never shows a raw exception message to the user', () => {
  test('finish()\'s catch no longer interpolates e.message/e?.message into the alert', () => {
    expect(src).not.toMatch(/appAlert\([^)]*e\?\.message/);
    expect(src).not.toMatch(/appAlert\([^)]*e\.message/);
  });

  test('finish()\'s catch logs the cause and shows calm, stable copy', () => {
    expect(src).toContain("import { logError } from '../lib/errorLog';");
    expect(src).toMatch(
      /logError\('FirstRunScreen\.finish', e, \{ userId: user\?\.id \}\);\s*\n\s*appAlert\('Something went wrong', 'Try again\.'\);/,
    );
  });
});
