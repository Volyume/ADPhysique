/**
 * progressScanStore — S7-2 chain-resolution fixes (progress-tab audit second
 * pass, 2026-09-25, register D200 item 7, report §8).
 *
 * (a) getProgressScanCoachSummary used to return `comparableCount` exactly
 *     as stored on the scan's own deltaExplanation at finish time --
 *     scanComparability's per-pair POSE count (REQUIRED_SCAN_POSES.length,
 *     always 2 or 0), never a running count of comparable SCANS. It now
 *     recomputes the real running count at READ time from the ordered scan
 *     history (progressScanChain.comparableChainCount), the same seam every
 *     consumer (WeeklyCheckInScreen, CoachOutputScreen, AthleteProfileScreen,
 *     useVisualPillar) reads the bounded scan summary from.
 * (b) finishProgressScanSession already skipped ahead through prior scans
 *     to the nearest comparable one (a single poor scan must not sever the
 *     chain) -- this pins that behaviour is UNCHANGED after the extraction
 *     into the shared progressScanChain.resolveComparablePrevious (used by
 *     both this store write and the read-time Trend view).
 *
 * Same in-memory `db()` mock shape as progressScanStore.delete.test.js.
 */
const mockRows = [];
const mockRunCalls = [];
let mockPreviousScanRows = [];
let mockMetaMap = {};
let mockSession = null;

jest.mock('../database', () => ({
  db: jest.fn(async () => ({
    getAllAsync: async (sql) => {
      if (/FROM progress_scan_assets/.test(sql)) return mockRows;
      if (/FROM progress_scan_sessions/.test(sql) && /status = 'complete'/.test(sql)) return mockPreviousScanRows;
      return [];
    },
    getFirstAsync: async (sql) => {
      if (/FROM progress_scan_sessions/.test(sql)) return mockSession;
      return null;
    },
    runAsync: async (sql, params) => {
      mockRunCalls.push({ sql, params });
      return { changes: 1 };
    },
  })),
}));

jest.mock('../progressPhotoMeta', () => ({
  getPhotoMetaMap: jest.fn(async () => mockMetaMap),
  deletePhotoMeta: jest.fn(async () => true),
}));

jest.mock('../errorLog', () => ({ logError: jest.fn() }));
jest.mock('../uuid', () => ({ generateUUID: jest.fn(() => 'test-id') }));

const { finishProgressScanSession, getProgressScanCoachSummary } = require('../progressScanStore');

beforeEach(() => {
  mockRows.length = 0;
  mockRunCalls.length = 0;
  mockPreviousScanRows = [];
  mockMetaMap = {};
  mockSession = null;
});

const DAY = 86400000;
const BASE = Date.UTC(2026, 5, 1);

const frontSignal = {
  modelBacked: true,
  quality: { segmentationConfidence: 0.9, framingScore: 0.88, blurScore: 0.86, lightingScore: 0.92 },
  silhouetteRatios: { waistToShoulder: 0.64, waistToHip: 0.78, waistToHeight: 0.19, bodyAreaRatio: 0.30 },
  abstentionReasons: [],
};
const backSignal = { ...frontSignal, silhouetteRatios: { ...frontSignal.silhouetteRatios, waistToShoulder: 0.62 } };

// The session being finished (S3): a draft with real, good-quality assets --
// matches progressScanStore.delete.test.js's own seedCompletedSessionAssets
// shape, parameterised on capturedAt for the timeline this suite needs.
function seedFinishingSession(capturedAt) {
  mockSession = {
    id: 'scan-finishing', user_id: 'user-1', captured_at: capturedAt,
    status: 'draft', analysis_status: 'none', required_poses_complete: 0,
  };
  mockRows.splice(0, mockRows.length,
    {
      id: 'asset-front', scan_id: 'scan-finishing', user_id: 'user-1', pose: 'front',
      photo_name: `${capturedAt}-f.jpg`, uri: `file:///${capturedAt}-f.jpg`, taken_at: capturedAt,
      quality_score: 0.89, segmentation_confidence: 0.9, blur_score: 0.86, lighting_score: 0.92, framing_score: 0.88,
      signals_json: JSON.stringify(frontSignal),
    },
    {
      id: 'asset-back', scan_id: 'scan-finishing', user_id: 'user-1', pose: 'back',
      photo_name: `${capturedAt}-b.jpg`, uri: `file:///${capturedAt}-b.jpg`, taken_at: capturedAt,
      quality_score: 0.9, segmentation_confidence: 0.9, blur_score: 0.86, lighting_score: 0.92, framing_score: 0.88,
      signals_json: JSON.stringify(backSignal),
    });
}

// A previously-stored, already-finished scan row -- close enough in setup to
// the finishing session's own assets (lighting/framing/segmentation all
// within threshold) to be genuinely comparable when both sides are 'good'.
function priorScanRow(id, capturedAt, { qualityLabel = 'good', score = 70 } = {}) {
  return {
    id, user_id: 'user-1', captured_at: capturedAt, status: 'complete', analysis_status: 'complete',
    required_poses_complete: 1, quality_label: qualityLabel,
    signals_json: JSON.stringify({
      physiqueAssessment: { visualLeannessScore: score, scanConfidenceTier: 'moderate' },
      assets: [
        { pose: 'front', lightingScore: 0.92, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
        { pose: 'back', lightingScore: 0.92, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
      ],
    }),
  };
}

describe('finishProgressScanSession comparison-partner resolution (S7-2b)', () => {
  test('S1 (good) / S2 (poor, 8+ days later) / S3 (good, 8+ days later): finishing S3 skips the poor S2 and stores comparable against S1', async () => {
    const s1 = priorScanRow('s1', BASE, { qualityLabel: 'good', score: 70 });
    const s2 = priorScanRow('s2', BASE + 8 * DAY, { qualityLabel: 'poor' });
    seedFinishingSession(BASE + 16 * DAY); // S3
    mockPreviousScanRows = [s2, s1]; // nearest-first, as the real query returns

    await finishProgressScanSession('user-1', 'scan-finishing', { sex: 'male', heightCm: 180, weightKg: 82 });

    const update = mockRunCalls.find((c) => /UPDATE progress_scan_sessions SET/.test(c.sql));
    const signals = JSON.parse(update.params[14]);
    expect(signals.deltaExplanation.comparisonStatus).toBe('comparable');
    // previousLeannessScore proves the chosen partner was S1 (score 70), not
    // S2 (which has no physiqueAssessment at all and fails the quality gate).
    expect(signals.deltaExplanation.previousLeannessScore).toBe(70);
  });

  test('when nothing in the lookback window is comparable, the stored status is not_comparable (unchanged fallback behaviour)', async () => {
    const s1 = priorScanRow('s1', BASE, { qualityLabel: 'poor' });
    seedFinishingSession(BASE + 8 * DAY);
    mockPreviousScanRows = [s1];

    await finishProgressScanSession('user-1', 'scan-finishing', { sex: 'male', heightCm: 180, weightKg: 82 });

    const update = mockRunCalls.find((c) => /UPDATE progress_scan_sessions SET/.test(c.sql));
    const signals = JSON.parse(update.params[14]);
    expect(signals.deltaExplanation.comparisonStatus).toBe('not_comparable');
  });
});

describe('getProgressScanCoachSummary real running comparable-scan count (S7-2a)', () => {
  test('a chain of three real comparable scans (plus the latest) reports comparableCount 3, not the stored per-pair pose count', async () => {
    const s1 = priorScanRow('s1', BASE);
    const s2 = priorScanRow('s2', BASE + 8 * DAY);
    const s3 = priorScanRow('s3', BASE + 16 * DAY);
    mockPreviousScanRows = [s3, s2, s1]; // nearest-first
    // The latest scan itself, already finished, with a STALE stored
    // comparableCount of 2 (the old per-pair pose-count semantic) on its
    // deltaExplanation -- proving the fix reads the real chain, not this
    // stored value.
    mockSession = {
      id: 's4', user_id: 'user-1', captured_at: BASE + 24 * DAY, status: 'complete', analysis_status: 'complete',
      required_poses_complete: 1, quality_label: 'good',
      signals_json: JSON.stringify({
        physiqueAssessment: { visualLeannessScore: 66, scanConfidenceTier: 'moderate' },
        deltaExplanation: { comparisonStatus: 'comparable', comparableCount: 2, trendDirection: 'down' },
        assets: [
          { pose: 'front', lightingScore: 0.92, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
          { pose: 'back', lightingScore: 0.92, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
        ],
      }),
    };

    const summary = await getProgressScanCoachSummary('user-1', { suppressed: false });

    expect(summary).not.toBeNull();
    expect(summary.comparableCount).toBe(3);
    expect(summary.comparableCount).not.toBe(2);
  });

  test('a poor scan in the chain costs only itself: comparableCount is not reset to zero', async () => {
    const s1 = priorScanRow('s1', BASE, { qualityLabel: 'good' });
    const s2 = priorScanRow('s2', BASE + 8 * DAY, { qualityLabel: 'poor' });
    const s3 = priorScanRow('s3', BASE + 16 * DAY, { qualityLabel: 'good' });
    mockPreviousScanRows = [s3, s2, s1];
    mockSession = {
      id: 's4', user_id: 'user-1', captured_at: BASE + 24 * DAY, status: 'complete', analysis_status: 'complete',
      required_poses_complete: 1, quality_label: 'good',
      signals_json: JSON.stringify({
        physiqueAssessment: { visualLeannessScore: 66, scanConfidenceTier: 'moderate' },
        assets: [
          { pose: 'front', lightingScore: 0.92, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
          { pose: 'back', lightingScore: 0.92, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
        ],
      }),
    };

    const summary = await getProgressScanCoachSummary('user-1', { suppressed: false });
    // s2 (poor) never counts; s3 skips to s1 (counts); s4 (latest) is
    // comparable to s3 directly (counts) -- 2, not 0 and not 3.
    expect(summary.comparableCount).toBe(2);
  });

  test('suppressed or missing user still returns null, unaffected by the new history read', async () => {
    expect(await getProgressScanCoachSummary('user-1', { suppressed: true })).toBeNull();
    expect(await getProgressScanCoachSummary(null, { suppressed: false })).toBeNull();
  });
});
