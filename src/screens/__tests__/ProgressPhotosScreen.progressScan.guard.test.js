const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../ProgressPhotosScreen.js'), 'utf8');

describe('ProgressPhotosScreen Progress Scan flagship guards', () => {
  test('uses enriched scan entries, not a bare latest scan row', () => {
    expect(SCREEN).toMatch(/listProgressScanEntries/);
    expect(SCREEN).toMatch(/Scan history/);
    expect(SCREEN).not.toMatch(/Latest scan/);
  });

  test('has trend-only display preference and 14-day scan cadence', () => {
    expect(SCREEN).toMatch(/getProgressScanHideExactPreference/);
    expect(SCREEN).toMatch(/setProgressScanHideExactPreference/);
    expect(SCREEN).toMatch(/PROGRESS_SCAN_MIN_INTERVAL_MS\s*=\s*14 \* 86400000/);
    expect(SCREEN).toMatch(/Give the scan time/);
    expect(SCREEN).not.toMatch(/at least a week apart/);
  });

  test('scan entries expose stored poses/photos through the existing full-size viewer', () => {
    expect(SCREEN).toMatch(/scan\.assets\.map/);
    expect(SCREEN).toMatch(/openViewer\(asset\.photoName\)/);
    expect(SCREEN).toMatch(/scanStatsCopy/);
    expect(SCREEN).toMatch(/scanReadCopy/);
  });

  test('hide-exact and suppression gate scan deltas and weight stats', () => {
    expect(SCREEN).toMatch(/scan\.deltaExplanation\?\.summary && !suppressed && !hideExactScans/);
    expect(SCREEN).toMatch(/scanStatsCopy\(scan, \{ suppressed, hideExact: hideExactScans \}\)/);
    expect(SCREEN).toMatch(/!suppressed && !hideExact && Number\.isFinite\(stats\.weightKg\)/);
  });

  test('capture and deletion lifecycle cleans up scan assets', () => {
    expect(SCREEN).toMatch(/Use this photo\?/);
    expect(SCREEN).toMatch(/Retake/);
    expect(SCREEN).toMatch(/deleteProgressScanSession\(userId, scanId, \{ deleteFiles: true \}\)/);
    expect(SCREEN).toMatch(/deleteScanEntry/);
    expect(SCREEN).toMatch(/detachProgressScanPhoto/);
  });
});
