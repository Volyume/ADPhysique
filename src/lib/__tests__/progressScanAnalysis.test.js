import {
  analyseProgressScan,
  buildEstimateRange,
  coachSummaryFromScan,
  compareScanEstimates,
  deriveProgressScanBiasFlagsFromProfile,
  estimateBodyFatFromScanAssets,
  measuredSignalsSummaryFromAssets,
  uncertaintyMarginPctPoints,
} from '../progressScanAnalysis';

const goodAssets = [
  { pose: 'front', qualityScore: 0.9, lightingScore: 0.9, blurScore: 0.9, framingScore: 0.9, landmarkConfidence: 0.9, segmentationConfidence: 0.9 },
  { pose: 'back', qualityScore: 0.9, lightingScore: 0.9, blurScore: 0.9, framingScore: 0.9, landmarkConfidence: 0.9, segmentationConfidence: 0.9 },
];

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

const modelBackedAssets = [
  { pose: 'front', qualityScore: 0.89, lightingScore: 0.92, blurScore: 0.86, framingScore: 0.88, segmentationConfidence: 0.9, signals: frontSignal },
  { pose: 'back', qualityScore: 0.9, lightingScore: 0.92, blurScore: 0.86, framingScore: 0.88, segmentationConfidence: 0.9, signals: backSignal },
];

describe('Progress Scan uncertainty and abstention', () => {
  test('bias and lower quality widen the body-fat range instead of hiding uncertainty', () => {
    const base = buildEstimateRange(20, { quality: { label: 'good' }, biasFlags: [] });
    const widened = buildEstimateRange(20, {
      quality: { label: 'usable' },
      biasFlags: ['female_overestimation_risk', 'darker_skin_overestimation_risk', 'very_muscular'],
    });
    expect(widened.margin).toBeGreaterThan(base.margin);
    expect(widened.low).toBeLessThan(base.low);
    expect(widened.high).toBeGreaterThan(base.high);
  });

  test('uncertainty margin is concrete for demographic and physique flags', () => {
    const plain = uncertaintyMarginPctPoints({ quality: { label: 'good' }, biasFlags: [] });
    const flagged = uncertaintyMarginPctPoints({
      quality: { label: 'good' },
      biasFlags: ['female_overestimation_risk', 'stage_lean_or_prep', 'physique_athlete_validation_pending'],
    });
    expect(flagged).toBeGreaterThan(plain);
  });

  test('missing required front/back poses abstains', () => {
    const out = analyseProgressScan({ assets: [{ pose: 'front', qualityScore: 0.9 }], modelEstimate: 20 });
    expect(out.analysisStatus).toBe('abstained');
    expect(out.abstentionReasons).toContain('missing_required_pose');
    expect(out.estimate).toBeNull();
  });

  test('model unavailable abstains rather than fabricating a visual estimate', () => {
    const out = analyseProgressScan({ assets: goodAssets, modelEstimate: null, sex: 'female' });
    expect(out.analysisStatus).toBe('abstained');
    expect(out.abstentionReasons).toContain('model_unavailable');
    expect(out.copySummary).toMatch(/not available/i);
    expect(out.biasFlags).toContain('female_overestimation_risk');
  });

  test('model-backed silhouette signals produce a provisional range without a manual estimate', () => {
    const estimate = estimateBodyFatFromScanAssets({
      assets: modelBackedAssets,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(estimate).toMatchObject({
      source: 'photo_scan',
      confidence: 'low',
      estimatorVersion: 'progress_scan_silhouette_regressor_v1',
    });
    expect(estimate.limitations).toContain('not_dexa_equivalent');

    const out = analyseProgressScan({
      assets: modelBackedAssets,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(out.analysisStatus).toBe('complete');
    expect(out.estimate).toBeGreaterThan(5);
    expect(out.range.low).toBeLessThan(out.estimate);
    expect(out.range.high).toBeGreaterThan(out.estimate);
    expect(out.biasFlags).toContain('skin_tone_not_collected_validation_gap');
    expect(out.copySummary).toMatch(/provisional/i);
  });

  test('demographic and physique validation gaps materially widen the displayed range', () => {
    const base = analyseProgressScan({
      assets: modelBackedAssets,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
      userBiasFlags: [],
    });
    const flagged = analyseProgressScan({
      assets: modelBackedAssets,
      sex: 'female',
      heightCm: 168,
      weightKg: 62,
      userBiasFlags: ['darker_skin_overestimation_risk', 'stage_lean_or_prep', 'very_muscular'],
    });
    const baseWidth = base.range.high - base.range.low;
    const flaggedWidth = flagged.range.high - flagged.range.low;
    expect(flaggedWidth).toBeGreaterThan(baseWidth);
    expect(flagged.biasFlags).toContain('female_overestimation_risk');
    expect(flagged.biasFlags).toContain('darker_skin_overestimation_risk');
  });

  test('profile context creates concrete uncertainty flags without guessing from the photo', () => {
    const flags = deriveProgressScanBiasFlagsFromProfile({
      trainingGoal: 'classic_physique',
      trainingPhase: 'mild_cut',
    });
    expect(flags).toEqual(expect.arrayContaining([
      'physique_competition_context',
      'very_muscular',
      'stage_lean_or_prep',
    ]));
  });

  test('stored measured-signal summary excludes raw photo URIs and fabricated observations', () => {
    const summary = measuredSignalsSummaryFromAssets(modelBackedAssets, { inputs: { waistToShoulder: 0.63 } });
    expect(summary.measuredSignalsOnly).toBe(true);
    expect(JSON.stringify(summary)).not.toMatch(/uri|photoName|looked|appears|visible abs/i);
    expect(summary.assets[0].silhouetteRatios.waistToShoulder).toBe(0.64);
  });

  test('inside uncertainty range reads as steady, not fake progress', () => {
    const trend = compareScanEstimates(
      { estimateBodyFatPercent: 20.4, estimateRangeHigh: 24, estimateRangeLow: 16 },
      { estimateBodyFatPercent: 20.0, estimateRangeHigh: 23.5, estimateRangeLow: 16.5 },
    );
    expect(trend.direction).toBe('steady');
    expect(trend.explanation).toMatch(/inside the scan range/i);
  });

  test('coach summary is suppressed under calm or ED mode', () => {
    const scan = {
      analysisStatus: 'complete',
      capturedAt: 1,
      estimateBodyFatPercent: 20,
      estimateRangeLow: 16,
      estimateRangeHigh: 24,
      estimateConfidence: 'low',
      qualityLabel: 'good',
      trendDirection: 'steady',
      trendMagnitudePctPoints: 0.4,
      biasFlagsJson: JSON.stringify(['physique_athlete_validation_pending']),
    };
    expect(coachSummaryFromScan(scan, { suppressed: true })).toBeNull();
    expect(coachSummaryFromScan(scan, { suppressed: false })).toMatchObject({
      source: 'photo_scan',
      estimateBodyFatPercent: 20,
      confidence: 'low',
      trendDirection: 'steady',
    });
  });
});
