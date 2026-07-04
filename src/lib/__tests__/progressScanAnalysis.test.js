import {
  analyseProgressScan,
  buildEstimateRange,
  coachSummaryFromScan,
  compareScanEstimates,
  deriveProgressScanBiasFlagsFromProfile,
  explainMeasuredScanDelta,
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

  test('mixed required-pose model availability abstains instead of using one analysed pose', () => {
    const out = analyseProgressScan({
      assets: [
        modelBackedAssets[0],
        {
          ...goodAssets[1],
          signals: { modelBacked: false, abstentionReasons: ['model_unavailable'] },
        },
      ],
      modelEstimate: null,
    });
    expect(out.analysisStatus).toBe('abstained');
    expect(out.abstentionReasons).toContain('model_unavailable');
    expect(out.estimate).toBeNull();
    expect(out.range).toBeNull();
  });

  test('model-backed silhouette signals produce measured context without a body-fat estimate', () => {
    const estimate = estimateBodyFatFromScanAssets({
      assets: modelBackedAssets,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(estimate).toBeNull();

    const out = analyseProgressScan({
      assets: modelBackedAssets,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(out.analysisStatus).toBe('measured');
    expect(out.estimate).toBeNull();
    expect(out.range).toBeNull();
    expect(out.biasFlags).toContain('skin_tone_not_collected_validation_gap');
    expect(out.copySummary).toMatch(/not a body-fat estimate/i);
  });

  test('demographic and physique validation gaps materially widen any future displayed range', () => {
    const base = buildEstimateRange(20, {
      quality: { label: 'good' },
      biasFlags: ['physique_athlete_validation_pending', 'skin_tone_not_collected_validation_gap'],
    });
    const flagged = buildEstimateRange(20, {
      quality: { label: 'usable' },
      biasFlags: [
        'female_overestimation_risk',
        'darker_skin_overestimation_risk',
        'stage_lean_or_prep',
        'very_muscular',
        'physique_athlete_validation_pending',
        'skin_tone_not_collected_validation_gap',
      ],
    });
    expect(flagged.high - flagged.low).toBeGreaterThan(base.high - base.low);
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

  test('measured delta explanation never fabricates visual observations', () => {
    const current = {
      analysisStatus: 'measured',
      qualityLabel: 'good',
      stats: { weightKg: 80 },
      signals: {
        assets: [{ pose: 'front' }, { pose: 'back' }],
        estimatorInputs: {
          waistToHeight: 0.18,
          waistToShoulder: 0.61,
        },
      },
    };
    const previous = {
      analysisStatus: 'measured',
      qualityLabel: 'good',
      signals: {
        stats: { weightKg: 82 },
        assets: [{ pose: 'front' }, { pose: 'back' }],
        estimatorInputs: {
          waistToHeight: 0.21,
          waistToShoulder: 0.66,
        },
      },
    };

    const out = explainMeasuredScanDelta({ currentScan: current, previousScan: previous });
    expect(out.measuredSignalsOnly).toBe(true);
    expect(out.comparisonStatus).toBe('comparable');
    expect(out.summary).toMatch(/not a body-fat estimate/i);
    expect(out.summary).not.toMatch(/estimate moved|estimate is/i);
    expect(out.summary).toMatch(/waist-to-height/i);
    expect(out.summary).not.toMatch(/quad|abs|separation|vascular|looks|appears|visible/i);
  });

  test('coach summary is suppressed under calm or ED mode', () => {
    const scan = {
      analysisStatus: 'measured',
      capturedAt: 1,
      estimateConfidence: 'low',
      qualityLabel: 'good',
      trendDirection: 'steady',
      signalsJson: JSON.stringify({
        deltaExplanation: {
          comparisonStatus: 'comparable',
          comparableCount: 1,
          trendDirection: 'steady',
          lines: ['Measured scan signals are broadly steady.'],
          coachSummary: 'Measured scan signals are broadly steady. I am treating it as low-confidence context only.',
        },
      }),
      biasFlagsJson: JSON.stringify(['physique_athlete_validation_pending']),
    };
    expect(coachSummaryFromScan(scan, { suppressed: true })).toBeNull();
    expect(coachSummaryFromScan(scan, { suppressed: false })).toMatchObject({
      source: 'photo_scan',
      confidence: 'low',
      trendDirection: 'steady',
      comparisonStatus: 'comparable',
      comparableCount: 1,
    });
    expect(JSON.stringify(coachSummaryFromScan(scan, { suppressed: false }))).not.toMatch(/estimateBodyFatPercent|rangeLow|rangeHigh/);
  });
});
