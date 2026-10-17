/**
 * Source guards for the audit of 2026-10-17 (E2, E5, E12):
 *   E2  the keep window's sweep also runs when the app returns to the
 *       foreground (HomeScreen was the only caller, once per session, so a
 *       phone left open for days never swept); the sweep's own 6 hour
 *       throttle keeps it cheap;
 *   E5  saving to the gallery asks for write-only access (add, never read),
 *       on both the share screen and the before/after share sheet.
 * Written to FAIL against the files before.
 */
const fs = require('fs');
const path = require('path');

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', '..', ...p), 'utf8');

describe('E2: the keep window sweeps on every return to the foreground', () => {
  const HOME = read('screens', 'HomeScreen.js');

  test('HomeScreen listens for AppState and sweeps on "active"', () => {
    expect(HOME).toMatch(/AppState\.addEventListener\('change', \(state\) => \{\s*if \(state !== 'active'\) return;[\s\S]{0,200}sweepExpiredClips\(uid\)/);
    expect(HOME).toMatch(/return \(\) => \{ sub\?\.remove\?\.\(\); \};/);
  });

  test('the sweep keeps its throttle and never forces on foreground', () => {
    const STORE = read('lib', 'clips', 'store.js');
    expect(STORE).toMatch(/if \(!force && now - lastSweepAt < SWEEP_EVERY_MS\) return 0;/);
    expect(HOME).not.toMatch(/sweepExpiredClips\([^)]*force/);
  });
});

describe('E5: saving asks for write-only gallery access', () => {
  test('ShareCardScreen', () => {
    const SC = read('screens', 'ShareCardScreen.js');
    expect(SC).toMatch(/MediaLibrary\.requestPermissionsAsync\(true\)/);
    expect(SC).not.toMatch(/MediaLibrary\.requestPermissionsAsync\(\)/);
  });

  test('BeforeAfterShareSheet', () => {
    const BA = read('components', 'BeforeAfterShareSheet.js');
    expect(BA).toMatch(/MediaLibrary\.requestPermissionsAsync\(true\)/);
    expect(BA).not.toMatch(/MediaLibrary\.requestPermissionsAsync\(\)/);
  });
});
