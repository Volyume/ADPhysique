import {
  buildProgressScanCompareModel,
  defaultScanPair,
  nextScanCompareSelection,
  normaliseScanCompareSelection,
  orderedScanEntries,
  poseRowsForPair,
  resolveScanComparePair,
} from '../progressScanCompareViewModel';

const base = Date.UTC(2026, 0, 1);
const DAY = 86400000;

function scan(id, day, score = 66, poses = ['front', 'back']) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: base + day * DAY,
    analysisStatus: 'complete',
    qualityLabel: 'good',
    stats: { photoCount: poses.length },
    signals: {
      physiqueAssessment: {
        visualLeannessScore: score,
        leannessBandLabel: score >= 65 ? 'Lean' : 'Defined',
        scanConfidenceLabel: 'Moderate',
        progressSignalLabel: day > 1 ? 'Slight positive trend' : 'Baseline scan',
      },
      estimatorInputs: {
        waistToHeight: score >= 65 ? 0.18 : 0.21,
        waistToShoulder: score >= 65 ? 0.61 : 0.66,
      },
    },
    assets: poses.map((pose) => ({ id: `${id}-${pose}`, pose, uri: `file:///${id}-${pose}.jpg` })),
  };
}

describe('progressScanCompareViewModel', () => {
  test('orders completed entries and defaults earliest to latest', () => {
    const scans = [scan('new', 20), { id: 'draft', status: 'draft', requiredPosesComplete: true, assets: [] }, scan('old', 1)];
    const ordered = orderedScanEntries(scans);
    expect(ordered.map((s) => s.id)).toEqual(['old', 'new']);
    expect(defaultScanPair(scans)).toEqual(['old', 'new']);
  });

  test('normalise and next selection preserve existing component behaviour', () => {
    const entries = orderedScanEntries([scan('old', 1), scan('mid', 10), scan('new', 20)]);
    expect(normaliseScanCompareSelection(['old', 'new'], entries)).toEqual(['old', 'new']);
    expect(normaliseScanCompareSelection(['missing'], entries)).toEqual(['old', 'new']);
    expect(nextScanCompareSelection(['old', 'mid'], 'new')).toEqual(['mid', 'new']);
    expect(nextScanCompareSelection(['old', 'new'], 'old')).toEqual(['new']);
  });

  test('resolves selected ids oldest-first and builds pose rows plus measured delta', () => {
    const entries = orderedScanEntries([scan('new', 20, 72, ['front', 'back', 'side']), scan('old', 1, 60, ['front', 'back'])]);
    expect(resolveScanComparePair(entries, ['new', 'old']).map((s) => s.id)).toEqual(['old', 'new']);
    expect(poseRowsForPair(entries[0], entries[1]).map((row) => row.pose)).toEqual(['front', 'back', 'side']);

    const model = buildProgressScanCompareModel(entries, ['new', 'old']);
    expect(model.earlier.id).toBe('old');
    expect(model.later.id).toBe('new');
    expect(model.rows.map((row) => row.pose)).toEqual(['front', 'back', 'side']);
    expect(model.delta.summary).toContain('Volyume Leanness Score is up 12 points');
  });
});
