const mockRows = [];
const mockRunCalls = [];
let mockMetaMap = {};
let mockSession = null;

jest.mock('../database', () => ({
  db: jest.fn(async () => ({
    getAllAsync: async (sql) => {
      if (/FROM progress_scan_assets/.test(sql)) return mockRows;
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

const { deleteProgressScanSession, detachProgressScanPhoto, finishProgressScanSession } = require('../progressScanStore');
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
  test('stores Volyume physique assessment while leaving body-fat estimate columns null', async () => {
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
      physiqueScoreVersion: 'volyume_physique_scan_score_v1',
      physiqueAssessment: {
        analysisType: 'visual_physique_score',
        visualLeannessScore: 68,
        leannessBandLabel: 'Lean',
        scanConfidenceTier: 'moderate',
      },
    });
    expect(JSON.stringify(signals)).not.toMatch(/estimateBodyFatPercent|estimateRangeLow|estimateRangeHigh/);
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
