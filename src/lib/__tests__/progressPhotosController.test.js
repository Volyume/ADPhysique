import {
  buildCheckInCompletenessModel,
  buildScanPhotoNameSet,
  buildProgressScanFinishPayload,
  buildPhysiqueStudioNextAction,
  cleanupRetakenScanPose,
  cleanupUnattachedSavedScanPhoto,
  deleteViewerProgressPhoto,
  deleteViewerProgressPhotoSet,
  enrichProgressPhotos,
  findScanForPhotoName,
  isFirstPoseCapture,
  localDayKeyForScanMatch,
  progressCheckInCadenceLabel,
  resolveScanForCheckIn,
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
    const metaMap = {
      'a.jpg': {
        takenAt: 123, pose: 'front', weightKg: 82.4, note: 'Same setup', unscored: true,
      },
    };

    expect(enrichProgressPhotos(photos, metaMap)).toEqual([
      {
        name: 'a.jpg', uri: 'file:///a.jpg', ts: 100, takenAt: 123, pose: 'front', weightKg: 82.4, note: 'Same setup', unscored: true,
      },
      {
        name: 'b.jpg', uri: 'file:///b.jpg', ts: 200, takenAt: 200, pose: null, weightKg: null, note: null, unscored: false,
      },
    ]);
  });

  test('isFirstPoseCapture is true only the first time a pose is ever saved', () => {
    expect(isFirstPoseCapture([], 'front')).toBe(true);
    expect(isFirstPoseCapture([{ pose: 'back' }], 'front')).toBe(true);
    expect(isFirstPoseCapture([{ pose: 'front' }], 'front')).toBe(false);
    expect(isFirstPoseCapture([{ pose: 'front' }, { pose: 'back' }], 'back')).toBe(false);
    // No pose assigned is never a "first ever" case.
    expect(isFirstPoseCapture([], null)).toBe(false);
    expect(isFirstPoseCapture([{ pose: 'front' }], undefined)).toBe(false);
  });

  describe('resolveScanForCheckIn (quick-add fence, founder gate F2)', () => {
    // Local-constructed timestamps so the day-key match is independent of the
    // test runner's timezone. The fixture map is built with the SAME exported
    // localDayKeyForScanMatch the screen uses, so a key-format drift between
    // map build and lookup fails here instead of silently missing in the app.
    const DAY_MS = new Date(2026, 6, 1, 10).getTime();
    const DAY_KEY = localDayKeyForScanMatch(DAY_MS);
    const OTHER_DAY_MS = new Date(2026, 0, 1, 10).getTime();
    const scan = { id: 'scan-1', capturedAt: DAY_MS - 3_600_000, assets: [{ photoName: 'front.jpg' }, { photoName: 'back.jpg' }] };
    const scanByPhotoName = new Map([['front.jpg', scan], ['back.jpg', scan]]);
    const scansByDateKey = new Map([[DAY_KEY, [scan]]]);

    test('matches by cover photo identity first', () => {
      const item = { cover: { name: 'front.jpg' }, photos: [{ name: 'front.jpg' }], takenAt: DAY_MS };
      expect(resolveScanForCheckIn(item, scanByPhotoName, scansByDateKey)).toBe(scan);
    });

    test('matches by any photo identity when the cover itself is not a scan asset', () => {
      const item = { cover: { name: 'quick.jpg' }, photos: [{ name: 'quick.jpg' }, { name: 'back.jpg' }], takenAt: DAY_MS };
      expect(resolveScanForCheckIn(item, scanByPhotoName, scansByDateKey)).toBe(scan);
    });

    test('falls back to same-day proximity only when no photo in the check-in is scored and none is unscored', () => {
      const item = { cover: { name: 'unrelated.jpg' }, photos: [{ name: 'unrelated.jpg' }], takenAt: DAY_MS };
      expect(resolveScanForCheckIn(item, scanByPhotoName, scansByDateKey)).toBe(scan);
    });

    test('a quick-add (unscored) photo never borrows an unrelated scan via same-day coincidence', () => {
      const item = {
        cover: { name: 'quickadd.jpg', unscored: true },
        photos: [{ name: 'quickadd.jpg', unscored: true }],
        takenAt: DAY_MS,
      };
      expect(resolveScanForCheckIn(item, scanByPhotoName, scansByDateKey)).toBeNull();
    });

    test('a mixed check-in with any unscored photo is fenced even if other photos are unrelated', () => {
      const item = {
        cover: { name: 'unrelated.jpg' },
        photos: [{ name: 'unrelated.jpg' }, { name: 'quickadd.jpg', unscored: true }],
        takenAt: DAY_MS,
      };
      expect(resolveScanForCheckIn(item, scanByPhotoName, scansByDateKey)).toBeNull();
    });

    test('no candidates on that day resolves to null regardless of the fence', () => {
      const item = { cover: { name: 'unrelated.jpg' }, photos: [{ name: 'unrelated.jpg' }], takenAt: OTHER_DAY_MS };
      expect(resolveScanForCheckIn(item, scanByPhotoName, scansByDateKey)).toBeNull();
    });
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

  test('findScanForPhotoName resolves the full scan set that owns a photo', () => {
    const scan = {
      id: 'scan-1',
      assets: [
        { photoName: 'front.jpg' },
        { photoName: 'back.jpg' },
      ],
    };
    expect(findScanForPhotoName([scan], 'back.jpg')).toBe(scan);
    expect(findScanForPhotoName([scan], 'side.jpg')).toBeNull();
    expect(findScanForPhotoName([scan], null)).toBeNull();
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

  test('progressCheckInCadenceLabel keeps cadence calm and non-pressuring', () => {
    const min = 14 * 86400000;
    const latest = Date.UTC(2026, 6, 1, 12);

    expect(progressCheckInCadenceLabel(null, latest, min)).toBe('Capture baseline');
    expect(progressCheckInCadenceLabel(latest, latest + min, min)).toBe('Ready now');
    expect(progressCheckInCadenceLabel(latest, latest + min - 86400000, min)).toBe('Tomorrow');
    expect(progressCheckInCadenceLabel(latest, latest + min - 3 * 86400000, min)).toBe('In 3 days');
  });

  test('buildPhysiqueStudioNextAction completes the latest partial photo set before anything else', () => {
    const partial = { type: 'checkin', takenAt: 300, poses: ['side'], cover: { uri: 'file:///side.jpg' } };
    const olderComplete = { type: 'checkin', takenAt: 100, poses: ['front', 'side', 'back'] };

    expect(buildPhysiqueStudioNextAction({
      checkIns: [olderComplete, partial],
      scans: [{ id: 's1', status: 'complete', requiredPosesComplete: true }, { id: 's2', status: 'complete', requiredPosesComplete: true }],
    })).toMatchObject({
      kind: 'complete_pose',
      title: 'Add front photo',
      body: 'Your latest date is missing the front photo.',
      reason: 'Front and back are needed before the set can be scored.',
      detailItems: [
        'Use similar lighting, distance and camera height.',
        'If the photo is not clear enough, keep it as a normal progress photo.',
      ],
      cta: 'Add Front photo',
      pose: 'front',
      checkIn: partial,
    });
  });

  test('buildCheckInCompletenessModel explains complete and partial photo sets', () => {
    expect(buildCheckInCompletenessModel({ poses: ['front', 'back'] })).toEqual({
      complete: true,
      present: ['front', 'back'],
      missing: [],
      percent: 100,
      label: 'Front and back saved',
      detail: 'Front and back are saved. Add side next time for a complete set.',
      nextPose: null,
      nextPoseLabel: null,
    });

    expect(buildCheckInCompletenessModel({ poses: ['front'] })).toMatchObject({
      complete: false,
      present: ['front'],
      missing: ['back'],
      percent: 50,
      label: '1 of 2 scoring photos added',
      detail: 'Add back photo for this date to score it.',
      nextPose: 'back',
      nextPoseLabel: 'Back',
    });

    expect(buildCheckInCompletenessModel({ poses: ['front', 'side', 'back'] })).toMatchObject({
      complete: true,
      percent: 100,
      label: 'Front, back and side saved',
      detail: 'Front, back and side are saved together.',
      nextPose: null,
    });
  });

  test('buildPhysiqueStudioNextAction prioritises missing poses, scan compare, then matched photo compare', () => {
    const completeA = { type: 'checkin', takenAt: 100, poses: ['front', 'side', 'back'] };
    const completeB = { type: 'checkin', takenAt: 200, poses: ['front', 'side', 'back'] };
    const scans = [
      { id: 's1', status: 'complete', requiredPosesComplete: true, signals: { physiqueAssessment: { visualLeannessScore: 41 } } },
      { id: 's2', status: 'measured', requiredPosesComplete: true, signals: { physiqueAssessment: { visualLeannessScore: 45 } } },
    ];
    const unscoredScans = [
      { id: 's1', status: 'complete', requiredPosesComplete: true },
      { id: 's2', status: 'measured', requiredPosesComplete: true },
    ];

    expect(buildPhysiqueStudioNextAction({ checkIns: [completeA, completeB], scans }).kind).toBe('compare_scans');
    expect(buildPhysiqueStudioNextAction({ checkIns: [completeA, completeB], scans }).title).toBe('Compare photo sets');
    expect(buildPhysiqueStudioNextAction({ checkIns: [completeA, completeB], scans }).reason)
      .toBe('2 scored photo sets are ready.');
    expect(buildPhysiqueStudioNextAction({ checkIns: [completeA, completeB], scans, suppressed: true }))
      .toBeNull();
    expect(buildPhysiqueStudioNextAction({ checkIns: [completeA, completeB], scans: [] }).kind)
      .toBe('compare_checkins');
    expect(buildPhysiqueStudioNextAction({ checkIns: [completeA, completeB], scans: unscoredScans }).kind)
      .toBe('compare_checkins');
    expect(buildPhysiqueStudioNextAction({ checkIns: [], scans: [] })).toBeNull();
    expect(buildPhysiqueStudioNextAction({ checkIns: [], scans: [], readOnly: true })).toBeNull();
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

  test('deleteViewerProgressPhotoSet deletes every photo in a saved set', async () => {
    const detachProgressScanPhoto = jest.fn(async () => true);
    const deletePhotoMeta = jest.fn(async () => true);
    const deleteProgressPhoto = jest.fn(async () => true);

    await deleteViewerProgressPhotoSet({
      userId: 'u1',
      names: ['front.jpg', 'side.jpg', 'back.jpg'],
      photos: [
        { name: 'front.jpg', uri: 'file:///front.jpg' },
        { name: 'side.jpg', uri: 'file:///side.jpg' },
        { name: 'back.jpg', uri: 'file:///back.jpg' },
      ],
      detachProgressScanPhoto,
      deletePhotoMeta,
      deleteProgressPhoto,
    });

    expect(detachProgressScanPhoto).toHaveBeenCalledTimes(3);
    expect(deletePhotoMeta).toHaveBeenCalledTimes(3);
    expect(deleteProgressPhoto).toHaveBeenCalledTimes(3);
    expect(deleteProgressPhoto).toHaveBeenNthCalledWith(1, 'u1', 'file:///front.jpg');
    expect(deleteProgressPhoto).toHaveBeenNthCalledWith(2, 'u1', 'file:///side.jpg');
    expect(deleteProgressPhoto).toHaveBeenNthCalledWith(3, 'u1', 'file:///back.jpg');
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
