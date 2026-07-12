/**
 * EP-19/UI-08/P-07 (Codex end-user-polish audit): two catch blocks showed the
 * raw `e?.message` to the user — handlePickFile's file-read error (could
 * surface a native filesystem path/error string) and handleConfirmImport's
 * import-failure alert (could surface a raw SQLite write error). Both are
 * already logged via the existing logError call in the same catch; only the
 * shown copy changes here, to the calm fallback that was previously only
 * used when e.message was absent.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ImportScreen.js'),
  'utf8',
);

describe('ImportScreen never shows a raw exception message to the user', () => {
  test('neither catch block interpolates e.message/e?.message into user-facing copy', () => {
    expect(src).not.toMatch(/setError\(e\?\.message/);
    expect(src).not.toMatch(/appAlert\(\s*'Import failed',\s*e\?\.message/);
  });

  test('handlePickFile shows calm, stable copy after logging the cause', () => {
    expect(src).toMatch(
      /logError\('ImportScreen\.handlePickFile', e\);\s*\n\s*setError\('Could not read that file\. Try again\.'\);/,
    );
  });

  test('handleConfirmImport shows calm, stable copy after logging the cause', () => {
    expect(src).toMatch(
      /logError\('ImportScreen\.runImport', e\);\s*\n\s*setStage\('preview'\);\s*\n\s*appAlert\(\s*\n\s*'Import failed',\s*\n\s*'Something went wrong writing the data\. Nothing was saved\.',/,
    );
  });
});
