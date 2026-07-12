/**
 * EP-19/UI-08/P-07 (Codex end-user-polish audit): four catch blocks in
 * SettingsDataScreen showed a raw `e?.message` to the user (export, full
 * backup, restore, clear-history), which can surface a raw filesystem,
 * SQLite or JSON-parse error string. Each now logs the real cause via
 * logError (added where missing) and shows only stable, calm copy.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'SettingsDataScreen.js'),
  'utf8',
);

describe('SettingsDataScreen never shows a raw exception message to the user', () => {
  test('none of the four catch blocks interpolate e.message/e?.message into user-facing copy', () => {
    expect(src).not.toMatch(/toast\.show\(e\?\.message/);
    expect(src).not.toMatch(/appAlert\([^)]*e\?\.message/);
  });

  test('exportData logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('SettingsScreen\.exportData', e, \{ userId: user\?\.id \}\);\s*\n\s*toast\.show\('Could not export your data, try again', \{ variant: 'error' \}\);/,
    );
  });

  test('handleFullBackup logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('SettingsScreen\.handleFullBackup', e\);\s*\n\s*appAlert\('Backup failed', 'Could not create a backup\. Please try again\.'\);/,
    );
  });

  test('handleRestoreBackup logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('SettingsScreen\.handleRestoreBackup', e\);\s*\n\s*appAlert\('Restore failed', 'Could not read that backup file\.'\);/,
    );
  });

  test('handleClearHistory keeps its existing logError and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('SettingsScreen\.handleClearHistory', e, \{ userId: user\.id \}\);\s*\n\s*appAlert\('Couldn\\'t clear history', 'Try again\.'\);/,
    );
  });
});
