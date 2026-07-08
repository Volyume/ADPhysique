import { isProgressScanCalibrationExportAllowed } from '../progressScanCalibrationAccess';

describe('progress scan calibration export access', () => {
  const originalDev = global.__DEV__;

  afterEach(() => {
    global.__DEV__ = originalDev;
  });

  test('allows founder test emails in release builds', () => {
    global.__DEV__ = false;

    expect(isProgressScanCalibrationExportAllowed({ email: 'allansdouglas1983@gmail.com' })).toBe(true);
    expect(isProgressScanCalibrationExportAllowed({ email: ' ALLANSDOUG1983@gmail.com ' })).toBe(true);
    expect(isProgressScanCalibrationExportAllowed({ email: 'allanhendy69@gmail.com' })).toBe(true);
  });

  test('does not expose release APK calibration export to ordinary users', () => {
    global.__DEV__ = false;

    expect(isProgressScanCalibrationExportAllowed({ email: 'athlete@example.com' })).toBe(false);
    expect(isProgressScanCalibrationExportAllowed({})).toBe(false);
    expect(isProgressScanCalibrationExportAllowed(null)).toBe(false);
  });

  test('allows local development builds for calibration debugging', () => {
    global.__DEV__ = true;

    expect(isProgressScanCalibrationExportAllowed({ email: 'athlete@example.com' })).toBe(true);
  });
});

