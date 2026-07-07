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

jest.mock('../progressPhotos', () => ({
  deleteProgressPhoto: jest.fn(async () => true),
}));

jest.mock('../progressPhotoMeta', () => ({
  getPhotoMetaMap: jest.fn(async () => mockMetaMap),
  deletePhotoMeta: jest.fn(async () => true),
}));

jest.mock('../errorLog', () => ({
  logError: jest.fn(),
}));

jest.mock('../uuid', () => ({
  generateUUID: jest.fn(() => 'test-id'),
}));

const {
  deleteProgressScanSession,
  detachProgressScanPhoto,
  finishProgressScanSession,
  getProgressScanSession,
} = require('../progressScanStore');
const { deleteProgressPhoto } = require('../progressPhotos');
const { deletePhotoMeta } = require('../progressPhotoMeta');
const { logError } = require('../errorLog');

function seedAsset() {
  mockRows.splice(0, mockRows.length, {
    id: 'asset-1',
    scan_id: 'scan-1',
    user_id: 'user-1',
    pose: 'front',
    photo_name: '100.jpg',
    uri: 'file:///doc/progress_photos/users/user-1/100.jpg',
    taken_at: 100,
  });
}

beforeEach(() => {
  mockRows.length = 0;
  mockRunCalls.length = 0;
  mockPreviousScanRows = [];
  mockMetaMap = {};
  mockSession = null;
  deleteProgressPhoto.mockClear();
  deletePhotoMeta.mockClear();
  logError.mockClear();
  deleteProgressPhoto.mockResolvedValue(true);
  deletePhotoMeta.mockResolvedValue(true);
});

const frontSignal = {
  modelBacked: true,
  quality: { segmentationConfidence: 0.9, framingScore: 0.88, blurScore: 0.86, lightingScore: 0.92 },
  silhouetteRatios: {
    waistToShoulder: 0.64,
    waistToHip: 0.78,
    waistToHeight: 0.19,
    bodyAreaRatio: 0.30,
  },
  abstentionReasons: [],
};

const backSignal = {
  ...frontSignal,
  silhouetteRatios: {
    waistToShoulder: 0.62,
    waistToHip: 0.76,
    waistToHeight: 0.18,
    bodyAreaRatio: 0.29,
  },
};

function seedCompletedSessionAssets() {
  mockSession = {
    id: 'scan-1',
    user_id: 'user-1',
    captured_at: 1000,
    status: 'draft',
    analysis_status: 'none',
    required_poses_complete: 0,
  };
  mockRows.splice(0, mockRows.length,
    {
      id: 'asset-front',
      scan_id: 'scan-1',
      user_id: 'user-1',
      pose: 'front',
      photo_name: '100.jpg',
      uri: 'file:///doc/progress_photos/users/user-1/100.jpg',
      taken_at: 100,
      quality_score: 0.89,
      segmentation_confidence: 0.9,
      blur_score: 0.86,
      lighting_score: 0.92,
      framing_score: 0.88,
      signals_json: JSON.stringify(frontSignal),
    },
    {
      id: 'asset-back',
      scan_id: 'scan-1',
      user_id: 'user-1',
      pose: 'back',
      photo_name: '101.jpg',
      uri: 'file:///doc/progress_photos/users/user-1/101.jpg',
      taken_at: 101,
      quality_score: 0.9,
      segmentation_confidence: 0.9,
      blur_score: 0.86,
      lighting_score: 0.92,
      framing_score: 0.88,
      signals_json: JSON.stringify(backSignal),
    });
}

describe('deleteProgressScanSession cleanup', () => {
  test('normalises stored v1 Volyume Scores when reading old local scans', async () => {
    mockSession = {
      id: 'scan-1',
      user_id: 'user-1',
      captured_at: 1000,
      status: 'complete',
      analysis_status: 'complete',
      required_poses_complete: 1,
      signals_json: JSON.stringify({
        physiqueScoreVersion: 'volyume_physique_scan_score_v1',
        physiqueAssessment: {
          assessmentVersion: 'volyume_physique_scan_score_v1',
          analysisType: 'visual_physique_score',
          visualLeannessScore: 37,
          leannessBand: 'athletic',
          leannessBandLabel: 'Athletic',
          progressSignal: 'baseline',
          progressSignalLabel: 'Baseline scan',
          scanConfidenceTier: 'moderate',
          scanConfidenceLabel: 'Moderate',
        },
      }),
      copy_summary: 'Baseline Volyume Score index 37. Athletic band.',
    };

    const scan = await getProgressScanSession('user-1', 'scan-1');

    expect(scan.signals.physiqueScoreVersion).toBe('volyume_physique_scan_score_v2');
    expect(scan.signals.legacyPhysiqueScoreVersion).toBe('volyume_physique_scan_score_v1');
    expect(scan.signals.physiqueAssessment).toMatchObject({
      assessmentVersion: 'volyume_physique_scan_score_v2',
      legacyAssessmentVersion: 'volyume_physique_scan_score_v1',
      visualLeannessScore: 71,
      leannessBand: 'defined',
      leannessBandLabel: 'Defined',
    });
    expect(scan.signals.physiqueAssessment.indexInputs).toMatchObject({
      legacyVisualLeannessScore: 37,
      displayScoreCalibratedFrom: 'volyume_physique_scan_score_v1',
    });
    expect(scan.copySummary).toMatch(/Volyume index 71/);
    expect(scan.copySummary).not.toMatch(/index 37/);
  });

  test('deletes scan rows first and logs when photo file cleanup fails', async () => {
    seedAsset();
    deleteProgressPhoto.mockResolvedValue(false);

    const ok = await deleteProgressScanSession('user-1', 'scan-1', { deleteFiles: true });

    expect(ok).toBe(true);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_assets/);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_sessions/);
    expect(logError).toHaveBeenCalledWith(
      'progressScanStore.delete.files',
      expect.any(Error),
      { userId: 'user-1', scanId: 'scan-1' },
    );
  });

  test('deletes scan rows first and leaves the file retryable when metadata cleanup fails', async () => {
    seedAsset();
    deletePhotoMeta.mockResolvedValue(false);

    const ok = await deleteProgressScanSession('user-1', 'scan-1', { deleteFiles: true });

    expect(ok).toBe(true);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_assets/);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_sessions/);
    expect(deleteProgressPhoto).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'progressScanStore.delete.files',
      expect.any(Error),
      { userId: 'user-1', scanId: 'scan-1' },
    );
  });

  test('deletes scan rows and then removes metadata before the photo file', async () => {
    seedAsset();

    const ok = await deleteProgressScanSession('user-1', 'scan-1', { deleteFiles: true });

    expect(ok).toBe(true);
    expect(deletePhotoMeta).toHaveBeenCalledWith('user-1', '100.jpg');
    expect(deleteProgressPhoto).toHaveBeenCalledWith('user-1', 'file:///doc/progress_photos/users/user-1/100.jpg');
    expect(deletePhotoMeta.mock.invocationCallOrder[0]).toBeLessThan(deleteProgressPhoto.mock.invocationCallOrder[0]);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_assets/);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_sessions/);
  });
});

describe('detachProgressScanPhoto privacy cleanup', () => {
  test('clears derived scan signals when one scan photo is deleted', async () => {
    seedAsset();

    const ok = await detachProgressScanPhoto('user-1', '100.jpg');

    expect(ok).toBe(true);
    const update = mockRunCalls.find((call) => /UPDATE progress_scan_sessions SET/.test(call.sql));
    expect(update).toBeTruthy();
    expect(update.sql).toMatch(/signals_json = NULL/);
    expect(update.sql).toMatch(/bias_flags_json = NULL/);
    expect(update.sql).toMatch(/quality_score = NULL/);
    expect(update.params[0]).toContain('scan_photo_deleted');
  });
});

describe('finishProgressScanSession estimator persistence', () => {
  test('stores Volyume physique assessment while leaving body fat estimate columns null', async () => {
    seedCompletedSessionAssets();

    await finishProgressScanSession('user-1', 'scan-1', {
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });

    const update = mockRunCalls.find((call) => /UPDATE progress_scan_sessions SET/.test(call.sql));
    expect(update).toBeTruthy();
    expect(update.params[0]).toBe('complete');
    expect(update.params[1]).toBe('complete');
    expect(update.params[2]).toBe(1);
    expect(update.params[3]).toBeNull();
    expect(update.params[4]).toBeNull();
    expect(update.params[5]).toBeNull();
    expect(update.params[6]).toBeNull();
    expect(update.params[7]).toBeNull();
    const signals = JSON.parse(update.params[14]);
    expect(signals).toMatchObject({
      physiqueScoreVersion: 'volyume_physique_scan_score_v2',
      physiqueAssessment: {
        analysisType: 'visual_physique_score',
        visualLeannessScore: 83,
        leannessBandLabel: 'Lean',
        scanConfidenceTier: 'moderate',
        progressSignal: 'baseline',
      },
    });
    expect(signals.physiqueAssessment.progressSignal).not.toBe('inconclusive');
    expect(JSON.stringify(signals)).not.toMatch(/estimateBodyFatPercent|estimateRangeLow|estimateRangeHigh/);
  });

  test('keeps the score visible when the previous scan cannot be used for a trend', async () => {
    seedCompletedSessionAssets();
    mockPreviousScanRows = [{
      id: 'previous-scan',
      user_id: 'user-1',
      captured_at: 500,
      status: 'complete',
      analysis_status: 'complete',
      required_poses_complete: 1,
      quality_label: 'good',
      signals_json: JSON.stringify({
        physiqueAssessment: {
          visualLeannessScore: 60,
          scanConfidenceTier: 'moderate',
        },
        assets: [{ pose: 'front' }, { pose: 'back' }],
      }),
    }];

    await finishProgressScanSession('user-1', 'scan-1', {
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });

    const update = mockRunCalls.find((call) => /UPDATE progress_scan_sessions SET/.test(call.sql));
    const signals = JSON.parse(update.params[14]);
    expect(signals.physiqueAssessment.visualLeannessScore).toBe(83);
    expect(signals.physiqueAssessment.progressSignal).toBe('trend_pending');
    expect(signals.physiqueAssessment.progressSignalLabel).toBe('Trend not ready');
    expect(signals.deltaExplanation.comparisonStatus).toBe('not_comparable');
    expect(signals.deltaExplanation.summary).toMatch(/not comparing it yet/i);
  });

  test('prefers the scan-day weight snapshot over stale profile weight', async () => {
    seedCompletedSessionAssets();
    mockMetaMap = {
      '100.jpg': { weightKg: 90 },
      '101.jpg': { weightKg: 90 },
    };

    await finishProgressScanSession('user-1', 'scan-1', {
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });

    const update = mockRunCalls.find((call) => /UPDATE progress_scan_sessions SET/.test(call.sql));
    expect(update.params[3]).toBeNull();
    expect(update.params[4]).toBeNull();
    expect(update.params[5]).toBeNull();
    expect(update.params[14]).toContain('"bmi":27.8');
  });
});
