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
    expect(SCAN_HISTORY).toMatch(/Volyume Score results/);
    expect(SCAN_HISTORY).toMatch(/Score for this set/);
    expect(SCREEN).not.toMatch(/Latest scan/);
  });

  test('has trend-only display preference and 14-day scan cadence', () => {
    expect(SCREEN).toMatch(/getProgressScanHideExactPreference/);
    expect(SCREEN).toMatch(/setProgressScanHideExactPreference/);
    expect(SCREEN).toMatch(/PROGRESS_SCAN_MIN_INTERVAL_MS\s*=\s*14 \* 86400000/);
    expect(SCREEN).toMatch(/Leave more time between photo sets/);
    expect(SCREEN).toMatch(/save photos today/);
    expect(SCREEN).toMatch(/Volyume Score may be less useful/);
    expect(SCREEN).toMatch(/without forcing a Volyume Score/);
    expect(SCREEN).not.toMatch(/at least a week apart/);
  });

  test('scan entries expose stored poses/photos through the existing full-size viewer', () => {
    expect(SCREEN).toMatch(/<ProgressScanHistoryCard/);
    expect(SCREEN).toMatch(/onOpenPhoto=\{openViewer\}/);
    expect(SCAN_HISTORY).toMatch(/scan\.assets\.map/);
    expect(SCAN_HISTORY).toMatch(/onOpenPhoto\?\.\(asset\.photoName\)/);
    expect(SCAN_HISTORY).not.toMatch(/scanStatsCopy/);
    expect(SCAN_HISTORY).not.toMatch(/scanReadCopy/);
  });

  test('scan entries have scan-specific comparison and share surfaces', () => {
    expect(SCREEN).toMatch(/ProgressScanCompare/);
    expect(SCREEN).toMatch(/Compare two Volyume Score entries/);
    expect(SCREEN).toMatch(/scanShareItemsFromEntries/);
    expect(SCREEN).toMatch(/scanShareItems\.length >= 2 \? scanShareItems : photos/);
    expect(SCREEN).toMatch(/hideScanRange=\{hideExactScans\}/);
    expect(SCREEN).toMatch(/hideWeight=\{hideExactScans && scanPhotoNames\.has\(viewerName\)\}/);
    expect(SCREEN).toMatch(/Share progress card/);
  });

  test('hide-exact and suppression gate scan deltas and weight stats', () => {
    expect(SCAN_HISTORY).toMatch(/if \(suppressed\) return 'Score detail is hidden right now/);
    expect(SCAN_HISTORY).toMatch(/if \(hideExact && scan\?\.deltaExplanation\?\.trendSummary\)/);
    expect(SCAN_HISTORY).toMatch(/whyLabel\(scan, \{ suppressed, hideExact \}\)/);
    expect(SCAN_HISTORY).toMatch(/weightLabel\(scan, \{ suppressed, hideExact \}\)/);
    expect(SCAN_COPY).toMatch(/!suppressed && !hideExact && Number\.isFinite\(stats\.weightKg\)/);
  });

  test('capture and deletion lifecycle cleans up scan assets', () => {
    expect(SCREEN).toMatch(/setScanReview\(\{\s*name,\s*saved,\s*flow,\s*pose,\s*\}\);/);
    expect(SCREEN).toMatch(/previewApproved/);
    expect(SCREEN).not.toMatch(/Use this photo\?/);
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
    expect(SCREEN).toMatch(/if \(!canWrite\(\)\) \{ abandonLapsedScanFlow\(flow\); return; \}[\s\S]*else setCaptureOpen\(true\);/);
  });

  test('viewer delete detaches scan analysis before deleting the source photo', () => {
    expect(SCREEN).toMatch(/deleteViewerProgressPhoto\(\{/);
    expect(SCREEN).toMatch(/detachProgressScanPhoto,/);
    expect(SCREEN).toMatch(/deletePhotoMeta,/);
    expect(SCREEN).toMatch(/deleteProgressPhoto,/);
  });

  test('scan sessions capture camera preferences and finish uses canonical body profile fallback', () => {
    expect(SCREEN).toMatch(/getProgressScanCapturePreferences/);
    expect(SCREEN).toMatch(/createProgressScanSession\(userId, \{ \.\.\.capturePrefs, capturedAt \}\)/);
    expect(SCREEN).toMatch(/getUserBodyProfile\(userId\)/);
    expect(SCREEN).toMatch(/buildProgressScanFinishPayload\(profile, bodyProfile, userSex\)/);
    expect(CONTROLLER).toMatch(/heightCm: safeProfile\.heightCm \?\? safeBodyProfile\.heightCm \?\? null/);
    expect(CONTROLLER).toMatch(/trainingGoal: safeProfile\.trainingGoal \?\? safeBodyProfile\.primaryGoal \?\? null/);
  });

  test('scan imports preserve high image quality before analysis', () => {
    expect(SCREEN).toMatch(/PROGRESS_SCAN_IMAGE_QUALITY\s*=\s*0\.92/);
    expect(SCREEN).toMatch(/launchImageLibraryAsync\(\{[\s\S]*quality: PROGRESS_SCAN_IMAGE_QUALITY/);
  });

  test('empty photo hero is plain text, not a fake body placeholder', () => {
    expect(SCREEN).toMatch(/heroTextHeader/);
    expect(SCREEN).toMatch(/Your private physique record/);
    expect(SCREEN).toMatch(/Private by default/);
    expect(SCREEN).toMatch(/Nothing is shared or exported unless you choose it/);
    expect(SCREEN).toMatch(/private progress index for like-for-like comparisons, not body fat/);
    expect(SCREEN).not.toMatch(/What the Volyume Score means/);
    expect(SCREEN).not.toMatch(/Latest result/);
    expect(SCREEN).not.toMatch(/signalCard/);
    expect(SCREEN).not.toMatch(/scoreGuideCard/);
    expect(SCREEN).not.toMatch(/heroPlaceholder/);
    expect(SCREEN).not.toMatch(/heroImageFrame/);
    expect(SCREEN).not.toMatch(/heroScrim/);
    expect(SCREEN).not.toMatch(/name="body-outline"/);
  });

  test('destructive scan copy says a set delete removes the full scored set', () => {
    expect(SCREEN).toMatch(/Delete photo set\?/);
    expect(SCREEN).toMatch(/This removes every photo in this set/);
    expect(SCREEN).toMatch(/text: 'Delete set'/);
    expect(SCREEN).toMatch(/Photo set deleted\./);
    expect(SCREEN).toMatch(/deleteProgressScanSession\(userId, scan\.id, \{ deleteFiles: true \}\)/);
  });

  test('camera fallback keeps the active scan pose instead of discarding the draft', () => {
    expect(SCREEN).toMatch(/pickScanPoseFromLibrary/);
    expect(SCREEN).toMatch(/onFallback=\{\(\) => \{ setCaptureOpen\(false\); if \(scanFlow\) pickScanPoseFromLibrary\(scanFlow, capturePose\); else pickFrom\('library'\); \}\}/);
    expect(SCREEN).not.toMatch(/discardScanDraft\(scanFlow\); pickFrom\('library'\)/);
  });

  test('library scan imports abandon unfinished draft sessions on every failed path', () => {
    expect(SCREEN).toMatch(/async function pickScanPoseFromLibrary\(flow = scanFlow, pose = capturePose\)/);
    expect(SCREEN).toMatch(/if \(!ImagePicker\) \{[\s\S]*await abandonLapsedScanFlow\(flow\);[\s\S]*Photos need a rebuild on this device/);
    expect(SCREEN).toMatch(/if \(result\?\.canceled\) \{[\s\S]*await abandonLapsedScanFlow\(flow\);[\s\S]*return;/);
    expect(SCREEN).toMatch(/if \(!uri\) \{[\s\S]*await abandonLapsedScanFlow\(flow\);[\s\S]*return;/);
    expect(SCREEN).toMatch(/let savedPhoto = null;[\s\S]*savedPhoto = saved;/);
    expect(SCREEN).toMatch(/catch \(e\) \{[\s\S]*if \(flow\?\.scanId\) await abandonLapsedScanFlow\(flow, savedPhoto\?\.name, savedPhoto\);/);
  });

  test('refresh results are guarded before committing photo and scan state', () => {
    expect(SCREEN).toMatch(/const refreshRequestRef = useRef\(0\);/);
    expect(SCREEN).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
    expect(SCREEN).toMatch(/const isCurrentRefresh = \(\) => refreshRequestRef\.current === requestId;/);
    expect(SCREEN).toMatch(/map = await getPhotoMetaMap\(rows\.map\(\(r\) => r\.name\), userId\);[\s\S]*if \(!isCurrentRefresh\(\)\) return;[\s\S]*setPhotos\(rows\);[\s\S]*setScans\(scanRows \|\| \[\]\);[\s\S]*setLoadError\(false\);/);
    expect(SCREEN).toMatch(/setLoadError\(true\);[\s\S]*logError\('ProgressPhotos\.refresh'/);
    expect(SCREEN).toMatch(/finally \{ if \(isCurrentRefresh\(\)\) setLoading\(false\); \}/);
  });
});
