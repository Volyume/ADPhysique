const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../ProgressPhotosScreen.js'), 'utf8');
const SCAN_COPY = fs.readFileSync(path.resolve(__dirname, '../../lib/progressScanCopy.js'), 'utf8');
const CONTROLLER = fs.readFileSync(path.resolve(__dirname, '../../lib/progressPhotosController.js'), 'utf8');
const SCAN_HISTORY = fs.readFileSync(path.resolve(__dirname, '../../components/ProgressScanHistoryCard.js'), 'utf8');

describe('ProgressPhotosScreen Progress Scan flagship guards', () => {
  test('uses enriched scan entries, not a bare latest scan row', () => {
    expect(SCREEN).toMatch(/listProgressScanEntries/);
    expect(SCREEN).toMatch(/PROGRESS_SCAN_LIBRARY_LIMIT\s*=\s*100/);
    expect(SCREEN).toMatch(/listProgressScanEntries\(userId, PROGRESS_SCAN_LIBRARY_LIMIT\)/);
    expect(SCAN_HISTORY).toMatch(/Scan history/);
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
    expect(SCREEN).toMatch(/<ProgressScanHistoryCard/);
    expect(SCREEN).toMatch(/onOpenPhoto=\{openViewer\}/);
    expect(SCAN_HISTORY).toMatch(/scan\.assets\.map/);
    expect(SCAN_HISTORY).toMatch(/onOpenPhoto\?\.\(asset\.photoName\)/);
    expect(SCAN_HISTORY).toMatch(/scanStatsCopy/);
    expect(SCAN_HISTORY).toMatch(/scanReadCopy/);
  });

  test('scan entries have scan-specific comparison and share surfaces', () => {
    expect(SCREEN).toMatch(/ProgressScanCompare/);
    expect(SCREEN).toMatch(/Compare scans/);
    expect(SCREEN).toMatch(/scanShareItemsFromEntries/);
    expect(SCREEN).toMatch(/scanShareItems\.length >= 2 \? scanShareItems : photos/);
    expect(SCREEN).toMatch(/hideScanRange=\{hideExactScans\}/);
    expect(SCREEN).toMatch(/hideWeight=\{hideExactScans && scanPhotoNames\.has\(viewerName\)\}/);
    expect(SCREEN).toMatch(/Share scan/);
  });

  test('hide-exact and suppression gate scan deltas and weight stats', () => {
    expect(SCAN_HISTORY).toMatch(/scan\.deltaExplanation\?\.summary && !suppressed && !hideExact/);
    expect(SCAN_HISTORY).toMatch(/scanStatsCopy\(scan, \{ suppressed, hideExact \}\)/);
    expect(SCAN_COPY).toMatch(/!suppressed && !hideExact && Number\.isFinite\(stats\.weightKg\)/);
  });

  test('capture and deletion lifecycle cleans up scan assets', () => {
    expect(SCREEN).toMatch(/Use this photo\?/);
    expect(SCREEN).toMatch(/cancelable: false/);
    expect(SCREEN).toMatch(/Front saved[\s\S]*cancelable: false/);
    expect(SCREEN).toMatch(/Back saved[\s\S]*cancelable: false/);
    expect(SCREEN).toMatch(/Retake/);
    expect(SCREEN).toMatch(/const deleted = await deleteProgressScanSession\(userId, scanId, \{ deleteFiles: true \}\)/);
    expect(SCREEN).toMatch(/if \(!deleted\) throw new Error\('progress_scan_discard_failed'\)/);
    expect(SCREEN).toMatch(/cleanupRetakenScanPose/);
    expect(SCREEN).toMatch(/cleanupUnattachedSavedScanPhoto/);
    expect(SCREEN).toMatch(/deleteScanEntry/);
    expect(SCREEN).toMatch(/deleteViewerProgressPhoto/);
    expect(SCREEN).toMatch(/progress_scan_asset_save_failed/);
  });

  test('post-capture scan writes re-check the live tier and abandon drafts on lapse', () => {
    expect(SCREEN).toMatch(/const canWrite = useCallback\(\(\) => useAppStore\.getState\(\)\.tier === 'pro', \[\]\);/);
    expect(SCREEN).toMatch(/abandonLapsedScanFlow/);
    expect(SCREEN).toMatch(/if \(!canWrite\(\)\) \{\s*await abandonLapsedScanFlow\(flow, name, saved\);/);
    expect(SCREEN).toMatch(/const vision = await analyseProgressScanPhoto\(\{ uri: saved\.uri, pose \}\);[\s\S]*if \(!canWrite\(\)\) \{[\s\S]*await abandonLapsedScanFlow\(flow, name, saved\);/);
    expect(SCREEN).toMatch(/if \(!canWrite\(\)\) \{ abandonLapsedScanFlow\(flow\); return; \} setCaptureOpen\(true\);/);
  });

  test('viewer delete detaches scan analysis before deleting the source photo', () => {
    expect(SCREEN).toMatch(/deleteViewerProgressPhoto\(\{/);
    expect(SCREEN).toMatch(/detachProgressScanPhoto,/);
    expect(SCREEN).toMatch(/deletePhotoMeta,/);
    expect(SCREEN).toMatch(/deleteProgressPhoto,/);
  });

  test('scan sessions capture camera preferences and finish uses canonical body profile fallback', () => {
    expect(SCREEN).toMatch(/getProgressScanCapturePreferences/);
    expect(SCREEN).toMatch(/createProgressScanSession\(userId, capturePrefs\)/);
    expect(SCREEN).toMatch(/getUserBodyProfile\(userId\)/);
    expect(SCREEN).toMatch(/buildProgressScanFinishPayload\(profile, bodyProfile, userSex\)/);
    expect(CONTROLLER).toMatch(/heightCm: safeProfile\.heightCm \?\? safeBodyProfile\.heightCm \?\? null/);
    expect(CONTROLLER).toMatch(/trainingGoal: safeProfile\.trainingGoal \?\? safeBodyProfile\.primaryGoal \?\? null/);
  });

  test('camera fallback keeps the active scan pose instead of discarding the draft', () => {
    expect(SCREEN).toMatch(/pickScanPoseFromLibrary/);
    expect(SCREEN).toMatch(/onFallback=\{\(\) => \{ setCaptureOpen\(false\); if \(scanFlow\) pickScanPoseFromLibrary\(scanFlow, capturePose\); else pickFrom\('library'\); \}\}/);
    expect(SCREEN).not.toMatch(/discardScanDraft\(scanFlow\); pickFrom\('library'\)/);
  });
});
