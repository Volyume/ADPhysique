const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../ProgressPhotosScreen.js'), 'utf8');
const SCAN_COPY = fs.readFileSync(path.resolve(__dirname, '../../lib/progressScanCopy.js'), 'utf8');
const CONTROLLER = fs.readFileSync(path.resolve(__dirname, '../../lib/progressPhotosController.js'), 'utf8');

describe('ProgressPhotosScreen Progress Scan flagship guards', () => {
  test('uses enriched scan entries, not a bare latest scan row', () => {
    expect(SCREEN).toMatch(/listProgressScanEntries/);
    expect(SCREEN).toMatch(/PROGRESS_SCAN_LIBRARY_LIMIT\s*=\s*100/);
    expect(SCREEN).toMatch(/listProgressScanEntries\(userId, PROGRESS_SCAN_LIBRARY_LIMIT\)/);
    expect(SCREEN).toMatch(/function latestScanScoreLabel\(\{ assessment = null, latestScan = null, suppressed = false \} = \{\}\)/);
    expect(SCREEN).toMatch(/formatVolyumeScore\(score\)/);
    expect(SCREEN).not.toMatch(/`index \$\{score\}`/);
    expect(SCREEN).toMatch(/const scanStatusLabel = latestScanScoreLabel\(\{/);
    expect(SCREEN).not.toMatch(/progressSignal === 'baseline' \? 'baseline'/);
    expect(SCREEN).toMatch(/function libraryScanSummary\(scan\)/);
    expect(SCREEN).toMatch(/label: 'Score'/);
    expect(SCREEN).toMatch(/label: 'Leanness'/);
    expect(SCREEN).toMatch(/label: 'Change'/);
    expect(SCREEN).not.toMatch(/label: 'Signal'/);
    expect(SCREEN).not.toMatch(/Latest scan|Latest score/);
  });

  test('has no score-hiding switch and keeps one-week scan cadence', () => {
    expect(SCREEN).not.toMatch(/getProgressScanHideExactPreference/);
    expect(SCREEN).not.toMatch(/setProgressScanHideExactPreference/);
    expect(SCREEN).not.toMatch(/Hide score/);
    expect(SCREEN).toMatch(/PROGRESS_SCAN_MIN_INTERVAL_MS\s*=\s*7 \* 86400000/);
    expect(SCREEN).toMatch(/Best about a week apart/);
    expect(SCREEN).toMatch(/about a week apart/);
    expect(SCREEN).toMatch(/retake sooner if you are fixing photo quality/);
    expect(SCREEN).toMatch(/save photos today/);
    expect(SCREEN).toMatch(/score may be less useful/);
    expect(SCREEN).toMatch(/Front and back are needed for a score; side helps comparison/);
    expect(SCREEN).not.toMatch(/Save without estimate/);
    expect(SCREEN).not.toMatch(/at least a week apart|at least 1 week apart/);
  });

  test('scan entries expose stored poses/photos through the existing full-size viewer', () => {
    expect(SCREEN).not.toMatch(/<ProgressScanHistoryCard/);
    expect(SCREEN).toMatch(/const scanSummary = libraryScanSummary\(scanForDay\);/);
    expect(SCREEN).toMatch(/scanSummary\.map/);
    expect(SCREEN).toMatch(/onPress=\{readOnly \? undefined : \(\) => openViewer\(cover\.name\)\}/);
  });

  test('scan entries have scan-specific comparison and share surfaces', () => {
    expect(SCREEN).toMatch(/ProgressScanCompare/);
    expect(SCREEN).toMatch(/Compare two photo sets/);
    expect(SCREEN).toMatch(/scanShareItemsFromEntries/);
    expect(SCREEN).toMatch(/scanShareItems\.length >= 2 \? scanShareItems : photos/);
    expect(SCREEN).toMatch(/hideScanRange=\{false\}/);
    expect(SCREEN).toMatch(/hideWeight=\{false\}/);
    expect(SCREEN).toMatch(/Share comparison/);
  });

  test('suppression gates scan deltas while scores stay visible otherwise', () => {
    expect(SCREEN).toMatch(/const scoreValue = suppressed \? 'Hidden'/);
    expect(SCREEN).toMatch(/assessment\?\.progressSignalLabel \|\| scan\?\.deltaExplanation\?\.trendSummary/);
    expect(SCAN_COPY).toMatch(/!suppressed && !hideExact && Number\.isFinite\(stats\.weightKg\)/);
  });

  test('capture and deletion lifecycle cleans up scan assets', () => {
    expect(SCREEN).toMatch(/import \{ SafeAreaView, useSafeAreaInsets \} from 'react-native-safe-area-context';/);
    expect(SCREEN).toMatch(/const insets = useSafeAreaInsets\(\);/);
    expect(SCREEN).toMatch(/contentContainerStyle=\{\[\s*styles\.captureRouteList,[\s\S]*insets\.bottom \+ spacing\.lg/);
    expect(SCREEN).toMatch(/<\/ScrollView>\s*<View style=\{\[styles\.scanReviewFooter, \{ paddingBottom: Math\.max\(spacing\.lg, insets\.bottom \+ spacing\.md\) \}\]\}>/);
    expect(SCREEN).toMatch(/scanReviewImageWrap: \{[\s\S]*minHeight: 220,[\s\S]*maxHeight: 460/);
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
    expect(SCREEN).toMatch(/deleteViewerProgressPhoto/);
    expect(SCREEN).toMatch(/progress_scan_asset_save_failed/);
    expect(SCREEN).toMatch(/const scanSaveInFlightRef = useRef\(new Set\(\)\);/);
    expect(SCREEN).toMatch(/if \(saveKey && scanSaveInFlightRef\.current\.has\(saveKey\)\) return;/);
    expect(SCREEN).toMatch(/if \(saveKey && !committed\) scanSaveInFlightRef\.current\.delete\(saveKey\);/);
  });

  test('scan finish refreshes visible photos even when scoring or list refresh fails', () => {
    expect(SCREEN).toMatch(/let finished = false;/);
    expect(SCREEN).toMatch(/await finishProgressScanSession\(userId, scanId, buildProgressScanFinishPayload\(profile, bodyProfile, userSex\)\);[\s\S]*finished = true;/);
    expect(SCREEN).toMatch(/ProgressPhotos\.finishScan\.refreshScans/);
    expect(SCREEN).toMatch(/ProgressPhotos\.finishScan\.refreshPhotos/);
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
    expect(SCREEN).toMatch(/Physique progress/);
    expect(SCREEN).toMatch(/Private on this device unless you choose to share or export/);
    expect(SCREEN).toMatch(/Add clear front and back photos once a week/);
    expect(SCREEN).toMatch(/Add side too if you can/);
    expect(SCREEN).toMatch(/Volyume scores the set and saves it to your library/);
    expect(SCREEN).not.toMatch(/What the Volyume Score means/);
    expect(SCREEN).not.toMatch(/Latest result/);
    expect(SCREEN).not.toMatch(/signalCard/);
    expect(SCREEN).not.toMatch(/scoreGuideCard/);
    expect(SCREEN).not.toMatch(/heroPlaceholder/);
    expect(SCREEN).not.toMatch(/heroImageFrame/);
    expect(SCREEN).not.toMatch(/heroScrim/);
    expect(SCREEN).not.toMatch(/name="body-outline"/);
  });

  test('photo-count badge stays legible over the dark thumbnail scrim', () => {
    expect(SCREEN).toContain('Ionicons name="images-outline" size={13} color={colors.textPrimary}');
    expect(SCREEN).toContain('checkInCoverBadgeText: { ...type.caption, color: colors.textPrimary }');
    expect(SCREEN).not.toContain('Ionicons name="images-outline" size={13} color={colors.onPrimary}');
    expect(SCREEN).not.toContain('checkInCoverBadgeText: { ...type.caption, color: colors.onPrimary }');
  });

  test('compare action copy is specific without adding another prompt card', () => {
    expect(SCREEN).toMatch(/title="Compare"/);
    expect(SCREEN).not.toMatch(/const compareButtonTitle = 'Compare photo sets';/);
    expect(SCREEN).toMatch(/accessibilityLabel="Compare two photo sets"/);
  });

  test('photo-set sheets keep titles and date fields narrow-screen safe', () => {
    expect(SCREEN).toMatch(/<Text style=\{styles\.scanDateValue\} numberOfLines=\{1\} ellipsizeMode="tail">/);
    expect(SCREEN).toMatch(/captureRouteTitle: \{ \.\.\.type\.title/);
    expect(SCREEN).toMatch(/scanDateTitle: \{ \.\.\.type\.bodyStrong/);
  });

  test('timeline controls wrap safely instead of crowding narrow devices', () => {
    expect(SCREEN).toMatch(/controlRow: \{[\s\S]*flexWrap: 'wrap'[\s\S]*paddingHorizontal: spacing\.lg/);
    expect(SCREEN).toMatch(/sortGroup: \{ flexDirection: 'row', gap: spacing\.xs, flexGrow: 1, flexBasis: 156, minWidth: 156 \}/);
    expect(SCREEN).toMatch(/datesControl: \{[\s\S]*flexGrow: 1,[\s\S]*flexBasis: 148,[\s\S]*minWidth: 0/);
    expect(SCREEN).toMatch(/datesChip: \{[\s\S]*flex: 1, minWidth: 0/);
    expect(SCREEN).toMatch(/datesChipText: \{ \.\.\.type\.label, color: colors\.textMuted, flex: 1, minWidth: 0 \}/);
  });

  test('missing-pose and route recommendation controls avoid loose amber links', () => {
    expect(SCREEN).toContain('Ionicons name="camera-outline" size={iconSize.sm} color={colors.textSecondary}');
    expect(SCREEN).toMatch(/completeCheckInButton: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(SCREEN).toContain('completeCheckInText: { ...type.label, color: colors.textPrimary }');
    expect(SCREEN).toContain("route.recommendationLabel || 'Recommended'");
    expect(SCREEN).not.toContain("route.recommendationLabel || 'Best next'");
    expect(SCREEN).not.toContain('completeCheckInText: { ...type.label, color: colors.primary }');
  });

  test('destructive scan copy says a set delete removes the full scored set', () => {
    expect(SCREEN).toMatch(/const owningScan = findScanForPhotoName\(visibleScans, name\);/);
    expect(SCREEN).toMatch(/deleteProgressScanSession\(uid, owningScan\.id, \{ deleteFiles: true \}\)/);
    expect(SCREEN).toMatch(/setViewerOpen\(false\);/);
  });

  test('camera fallback keeps the active scan pose instead of discarding the draft', () => {
    expect(SCREEN).toMatch(/pickScanPoseFromLibrary/);
    expect(SCREEN).toMatch(/onFallback=\{\(\) => \{ setCaptureOpen\(false\); if \(scanFlow\) pickScanPoseFromLibrary\(scanFlow, capturePose\); else pickFrom\('library'\); \}\}/);
    expect(SCREEN).not.toMatch(/discardScanDraft\(scanFlow\); pickFrom\('library'\)/);
  });

  test('library scan imports abandon unfinished draft sessions on every failed path', () => {
    expect(SCREEN).toMatch(/async function pickScanPoseFromLibrary\(flow = scanFlow, pose = capturePose\)/);
    expect(SCREEN).toMatch(/if \(!ImagePicker\) \{[\s\S]*await abandonLapsedScanFlow\(flow\);[\s\S]*Photo library isn't available on this device/);
    expect(SCREEN).toMatch(/if \(result\?\.canceled\) \{[\s\S]*await abandonLapsedScanFlow\(flow\);[\s\S]*return;/);
    expect(SCREEN).toMatch(/if \(!uri\) \{[\s\S]*await abandonLapsedScanFlow\(flow\);[\s\S]*return;/);
    expect(SCREEN).toMatch(/let savedPhoto = null;[\s\S]*savedPhoto = saved;/);
    expect(SCREEN).toMatch(/catch \(e\) \{[\s\S]*if \(flow\?\.scanId\) await abandonLapsedScanFlow\(flow, savedPhoto\?\.name, savedPhoto\);/);
  });

  test('scan start and score matching are idempotent and asset-owned', () => {
    expect(SCREEN).toMatch(/const captureRouteActionRef = useRef\(false\);/);
    expect(SCREEN).toMatch(/const progressScanOpeningRef = useRef\(false\);/);
    expect(SCREEN).toMatch(/if \(progressScanOpeningRef\.current\) return;/);
    expect(SCREEN).toMatch(/if \(scanDateOpen \|\| scanDatePickerOpen \|\| scanFlow \|\| progressScanOpeningRef\.current\) return;/);
    expect(SCREEN).toMatch(/if \(!route \|\| route\.disabled \|\| !canWrite\(\) \|\| captureRouteActionRef\.current\) return;/);
    expect(SCREEN).toMatch(/await openProgressScan\('guided'\);/);
    expect(SCREEN).toMatch(/const scanByPhotoName = useMemo/);
    expect(SCREEN).toMatch(/const scansByDateKey = useMemo/);
    expect(SCREEN).toMatch(/function scanForCheckIn\(item\)/);
    expect(SCREEN).toMatch(/if \(coverName && scanByPhotoName\.has\(coverName\)\) return scanByPhotoName\.get\(coverName\);/);
    expect(SCREEN).toMatch(/const scanForDay = scanForCheckIn\(item\);/);
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
