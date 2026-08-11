// Re-anchored under C7 F-12: the allow-list is now SHA-256 digests (no
// plaintext personal emails in the binary), resolved asynchronously and
// cached; tests warm the cache first, then assert the sync gate.
import { isProgressScanCalibrationExportAllowed, warmCalibrationAccess } from '../progressScanCalibrationAccess';

describe('progress scan calibration export access', () => {
  const originalDev = global.__DEV__;

  afterEach(() => {
    global.__DEV__ = originalDev;
  });

  test('allows founder test emails in release builds (after digest warm-up)', async () => {
    global.__DEV__ = false;

    expect(await warmCalibrationAccess({ email: 'allansdouglas1983@gmail.com' })).toBe(true);
    expect(await warmCalibrationAccess({ email: ' ALLANSDOUG1983@gmail.com ' })).toBe(true);
    expect(await warmCalibrationAccess({ email: 'allanhendy69@gmail.com' })).toBe(true);
    // The sync facade answers from the warmed cache.
    expect(isProgressScanCalibrationExportAllowed({ email: 'allansdouglas1983@gmail.com' })).toBe(true);
  });

  test('fails CLOSED before the digest has resolved (no plaintext compare exists any more)', () => {
    global.__DEV__ = false;
    expect(isProgressScanCalibrationExportAllowed({ email: 'never-warmed@example.com' })).toBe(false);
  });

  test('does not expose release APK calibration export to ordinary users', async () => {
    global.__DEV__ = false;

    expect(await warmCalibrationAccess({ email: 'athlete@example.com' })).toBe(false);
    expect(isProgressScanCalibrationExportAllowed({ email: 'athlete@example.com' })).toBe(false);
    expect(isProgressScanCalibrationExportAllowed({})).toBe(false);
    expect(isProgressScanCalibrationExportAllowed(null)).toBe(false);
  });

  test('allows local development builds for calibration debugging', () => {
    global.__DEV__ = true;

    expect(isProgressScanCalibrationExportAllowed({ email: 'athlete@example.com' })).toBe(true);
  });
});

