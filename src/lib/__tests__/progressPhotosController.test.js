import {
  buildScanPhotoNameSet,
  buildProgressScanFinishPayload,
  cleanupRetakenScanPose,
  cleanupUnattachedSavedScanPhoto,
  deleteViewerProgressPhoto,
  enrichProgressPhotos,
  scanShareItemsFromEntries,
  shouldGateProgressScanStart,
  visibleCompletedScans,
} from '../progressPhotosController';

describe('progressPhotosController transforms', () => {
  test('enrichProgressPhotos uses meta takenAt and falls back to filename timestamp', () => {
    const photos = [
      { name: 'a.jpg', uri: 'file:///a.jpg', ts: 100 },
      { name: 'b.jpg', uri: 'file:///b.jpg', ts: 200 },
    ];
    const metaMap = { 'a.jpg': { takenAt: 123, pose: 'front' } };

    expect(enrichProgressPhotos(photos, metaMap)).toEqual([
      { name: 'a.jpg', uri: 'file:///a.jpg', ts: 100, takenAt: 123, pose: 'front' },
      { name: 'b.jpg', uri: 'file:///b.jpg', ts: 200, takenAt: 200, pose: null },
    ]);
  });

  test('visibleCompletedScans and buildScanPhotoNameSet mirror the screen scan filters', () => {
    const complete = { id: 's1', status: 'complete', requiredPosesComplete: true, assets: [{ photoName: 'front.jpg' }, { photoName: null }] };
    const measured = { id: 's2', status: 'measured', requiredPosesComplete: true, assets: [{ photoName: 'back.jpg' }] };
    const draft = { id: 's3', status: 'draft', requiredPosesComplete: true, assets: [{ photoName: 'draft.jpg' }] };
    const incomplete = { id: 's4', status: 'complete', requiredPosesComplete: false, assets: [{ photoName: 'side.jpg' }] };

    const visible = visibleCompletedScans([complete, measured, draft, incomplete]);
    expect(visible).toEqual([complete, measured]);
    expect([...buildScanPhotoNameSet(visible)].sort()).toEqual(['back.jpg', 'front.jpg']);
  });

  test('scanShareItemsFromEntries ignores drafts and prefers the front asset', () => {
    const front = { photoName: 'front.jpg', uri: 'file:///front.jpg', pose: 'front', takenAt: 50 };
    const side = { photoName: 'side.jpg', uri: 'file:///side.jpg', pose: 'side', takenAt: 40 };
    const scans = [
      { id: 's1', status: 'complete', requiredPosesComplete: true, capturedAt: 100, assets: [side, front] },
      { id: 's2', status: 'draft', requiredPosesComplete: true, capturedAt: 90, assets: [front] },
      { id: 's3', status: 'complete', requiredPosesComplete: false, capturedAt: 80, assets: [front] },
      { id: 's4', status: 'complete', requiredPosesComplete: true, assets: [{ uri: 'file:///fallback.jpg', pose: 'back', takenAt: 70 }] },
    ];

    const items = scanShareItemsFromEntries(scans, 999);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: 'front.jpg', uri: 'file:///front.jpg', ts: 100, scan: scans[0] });
    expect(items[1]).toMatchObject({ name: 's4-back', uri: 'file:///fallback.jpg', ts: 70, scan: scans[3] });
  });

  test('shouldGateProgressScanStart gates only recent completed required-pose scans', () => {
    const min = 14 * 86400000;
    const recent = { id: 'recent', status: 'complete', requiredPosesComplete: true, capturedAt: 10_000 };
    const draft = { id: 'draft', status: 'draft', requiredPosesComplete: true, capturedAt: 11_000 };

    expect(shouldGateProgressScanStart([draft, recent], 10_000 + min - 1, min)).toEqual({
      gated: true,
      latestCompleted: recent,
    });
    expect(shouldGateProgressScanStart([recent], 10_000 + min, min).gated).toBe(false);
    expect(shouldGateProgressScanStart([draft], 11_000, min)).toEqual({ gated: false, latestCompleted: null });
  });

  test('buildProgressScanFinishPayload preserves profile-first scan profile precedence', () => {
    expect(buildProgressScanFinishPayload({
      sex: 'female',
      heightCm: 170,
      weightKg: 68,
      bodyweightKg: 69,
      bodyWeightKg: 70,
      trainingGoal: 'figure',
      trainingPhase: 'cut',
      goal: 'bulk',
      darkerSkinOverestimationRisk: true,
    }, {
      sex: 'male',
      heightCm: 180,
      primaryGoal: 'mens_physique',
    }, 'male')).toEqual({
      sex: 'female',
      heightCm: 170,
      weightKg: 68,
      trainingGoal: 'figure',
      trainingPhase: 'cut',
      darkerSkinOverestimationRisk: true,
    });
  });

  test('buildProgressScanFinishPayload falls back to body profile and user sex only where the screen did before', () => {
    expect(buildProgressScanFinishPayload({
      bodyweightKg: 82,
      goal: 'prep',
      darkerSkinOverestimationRisk: false,
    }, {
      sex: 'male',
      heightCm: 181,
      primaryGoal: 'classic_physique',
    }, 'female')).toEqual({
      sex: 'male',
      heightCm: 181,
      weightKg: 82,
      trainingGoal: 'classic_physique',
      trainingPhase: 'prep',
      darkerSkinOverestimationRisk: false,
    });

    expect(buildProgressScanFinishPayload(null, null, 'female')).toEqual({
      sex: 'female',
      heightCm: null,
      weightKg: null,
      trainingGoal: null,
      trainingPhase: null,
      darkerSkinOverestimationRisk: false,
    });
  });
});

describe('progressPhotosController cleanup orchestration', () => {
  test('deleteViewerProgressPhoto detaches scan analysis before deleting meta then file', async () => {
    const order = [];
    const detachProgressScanPhoto = jest.fn(async () => { order.push('detach'); return true; });
    const deletePhotoMeta = jest.fn(async () => { order.push('meta'); return true; });
    const deleteProgressPhoto = jest.fn(async () => { order.push('file'); return true; });

    await deleteViewerProgressPhoto({
      userId: 'u1',
      name: 'front.jpg',
      photos: [{ name: 'front.jpg', uri: 'file:///front.jpg' }],
      detachProgressScanPhoto,
      deletePhotoMeta,
      deleteProgressPhoto,
    });

    expect(order).toEqual(['detach', 'meta', 'file']);
    expect(detachProgressScanPhoto).toHaveBeenCalledWith('u1', 'front.jpg');
    expect(deletePhotoMeta).toHaveBeenCalledWith('u1', 'front.jpg');
    expect(deleteProgressPhoto).toHaveBeenCalledWith('u1', 'file:///front.jpg');
  });

  test.each([
    ['progress_scan_detach_photo_failed', { detach: false, meta: true, file: true }],
    ['progress_photo_meta_delete_failed', { detach: true, meta: false, file: true }],
    ['progress_photo_delete_failed', { detach: true, meta: true, file: false }],
  ])('deleteViewerProgressPhoto throws %s when a required cleanup step fails', async (message, result) => {
    await expect(deleteViewerProgressPhoto({
      userId: 'u1',
      name: 'front.jpg',
      photos: [{ name: 'front.jpg', uri: 'file:///front.jpg' }],
      detachProgressScanPhoto: jest.fn(async () => result.detach),
      deletePhotoMeta: jest.fn(async () => result.meta),
      deleteProgressPhoto: jest.fn(async () => result.file),
    })).rejects.toThrow(message);
  });

  test('cleanupRetakenScanPose deletes file then metadata and uses retake error names', async () => {
    const order = [];
    await cleanupRetakenScanPose({
      userId: 'u1',
      name: 'scan.jpg',
      saved: { uri: 'file:///scan.jpg' },
      deleteProgressPhoto: jest.fn(async () => { order.push('file'); return true; }),
      deletePhotoMeta: jest.fn(async () => { order.push('meta'); return true; }),
    });
    expect(order).toEqual(['file', 'meta']);

    await expect(cleanupRetakenScanPose({
      userId: 'u1',
      name: 'scan.jpg',
      saved: { uri: 'file:///scan.jpg' },
      deleteProgressPhoto: jest.fn(async () => false),
      deletePhotoMeta: jest.fn(async () => true),
    })).rejects.toThrow('progress_scan_retake_photo_delete_failed');

    await expect(cleanupRetakenScanPose({
      userId: 'u1',
      name: 'scan.jpg',
      saved: { uri: 'file:///scan.jpg' },
      deleteProgressPhoto: jest.fn(async () => true),
      deletePhotoMeta: jest.fn(async () => false),
    })).rejects.toThrow('progress_scan_retake_meta_delete_failed');
  });

  test('cleanupUnattachedSavedScanPhoto is best effort and never throws', async () => {
    await expect(cleanupUnattachedSavedScanPhoto({
      userId: 'u1',
      name: 'scan.jpg',
      saved: { uri: 'file:///scan.jpg' },
      deleteProgressPhoto: jest.fn(async () => { throw new Error('file locked'); }),
      deletePhotoMeta: jest.fn(async () => false),
    })).resolves.toEqual({ fileDeleted: false, metaDeleted: false });
  });
});
