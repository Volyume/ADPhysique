import {
  analyseProgressScan,
  abstentionReasonsForAssets,
  buildEstimateRange,
  calibrateVolyumeScore,
  computeScanConfidenceScore,
  computeVisualLeannessScore,
  coachSummaryFromScan,
  compareScanEstimates,
  deriveProgressScanBiasFlagsFromProfile,
  explainMeasuredScanDelta,
  estimateBodyFatFromScanAssets,
  leannessBandForScore,
  measuredSignalsSummaryFromAssets,
  normaliseStoredPhysiqueAssessment,
  PROGRESS_SCAN_SCORE_VERSION,
  scanComparability,
  scanSetupStability,
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

const DAY_MS = 86400000;

function comparableScan({ id = 'scan', score = 66, confidence = 'moderate', side = false, lighting = 0.9, framing = 0.88, segmentation = 0.9, tilt = 0, centerX = 0.5, centerY = 0.5, height = 0.78, width = 0.36 } = {}) {
  const poses = side ? ['front', 'back', 'side'] : ['front', 'back'];
  return {
    id,
    analysisStatus: 'complete',
    qualityLabel: 'good',
    signals: {
      physiqueAssessment: {
        visualLeannessScore: score,
        scanConfidenceTier: confidence,
      },
      assets: poses.map((pose) => ({
        pose,
        quality: {
          lightingScore: lighting,
          framingScore: framing,
          segmentationConfidence: segmentation,
          cameraTiltDegrees: tilt,
        },
        bodyBox: { centerX, centerY, height, width },
      })),
      estimatorInputs: {
        waistToHeight: score >= 65 ? 0.18 : 0.22,
        waistToShoulder: score >= 65 ? 0.61 : 0.68,
      },
    },
  };
}

describe('Progress Scan uncertainty and abstention', () => {
  test('bias and lower quality widen any internal uncertainty range instead of hiding uncertainty', () => {
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

  test('non-model-backed ratio data cannot produce a Volyume Score', () => {
    const out = analyseProgressScan({
      assets: [
        { ...modelBackedAssets[0], signals: { ...frontSignal, modelBacked: false } },
        { ...modelBackedAssets[1], signals: { ...backSignal, modelBacked: false } },
      ],
      modelEstimate: null,
    });
    expect(out.analysisStatus).toBe('abstained');
    expect(out.abstentionReasons).toContain('model_unavailable');
    expect(out.physiqueAssessment.visualLeannessScore).toBeNull();
  });

  test('model-backed photos with incomplete silhouette ratios do not fabricate a score', () => {
    const incompleteBack = {
      ...modelBackedAssets[1],
      signals: {
        ...backSignal,
        silhouetteRatios: {
          waistToShoulder: 0.62,
          waistToHip: 0.76,
          waistToHeight: 0.18,
        },
      },
    };
    const out = analyseProgressScan({
      assets: [modelBackedAssets[0], incompleteBack],
      modelEstimate: null,
    });
    expect(out.analysisStatus).toBe('abstained');
    expect(out.abstentionReasons).toContain('measured_signals_incomplete');
    expect(out.physiqueAssessment.visualLeannessScore).toBeNull();
  });

  test('final abstention gate matches model-backed vision thresholds instead of re-blocking usable scans', () => {
    const usableSignal = {
      ...frontSignal,
      quality: {
        segmentationConfidence: 0.42,
        framingScore: 0.4,
        blurScore: 0.4,
        lightingScore: 0.4,
        poseConfidence: 0.35,
        cameraTiltDegrees: 12,
        backgroundSeparation: 0.34,
      },
      abstentionReasons: [],
    };
    const usableAssets = [
      { pose: 'front', qualityScore: 0.4, lightingScore: 0.4, blurScore: 0.4, framingScore: 0.4, segmentationConfidence: 0.42, signals: usableSignal },
      { pose: 'back', qualityScore: 0.4, lightingScore: 0.4, blurScore: 0.4, framingScore: 0.4, segmentationConfidence: 0.42, signals: { ...usableSignal, silhouetteRatios: backSignal.silhouetteRatios } },
    ];
    expect(abstentionReasonsForAssets(usableAssets)).toEqual([]);
    const out = analyseProgressScan({ assets: usableAssets, modelEstimate: null });
    expect(out.analysisStatus).toBe('complete');
    expect(out.physiqueAssessment.visualLeannessScore).toBe(89);
    expect(out.physiqueAssessment.scanConfidenceTier).toBe('low');
  });

  test('borderline but model-measured required poses keep a low-confidence Volyume Score', () => {
    const borderlineFront = {
      ...frontSignal,
      engine: 'mlkit_selfie_segmentation',
      quality: {
        segmentationConfidence: 0.52,
        framingScore: 0.52,
        blurScore: 0.52,
        lightingScore: 0.52,
        poseConfidence: 0.52,
        backgroundSeparation: 0.5,
        foregroundThreshold: 0.36,
        componentDominance: 0.9,
      },
      mask: {
        foregroundRatio: 0.31,
        foregroundMeanProbability: 0.44,
        backgroundMeanProbability: 0.08,
      },
    };
    const borderlineBack = {
      ...borderlineFront,
      silhouetteRatios: backSignal.silhouetteRatios,
    };
    const assets = [
      {
        pose: 'front',
        qualityScore: 0.52,
        lightingScore: 0.52,
        blurScore: 0.52,
        framingScore: 0.52,
        segmentationConfidence: 0.52,
        signals: borderlineFront,
      },
      {
        pose: 'back',
        qualityScore: 0.52,
        lightingScore: 0.52,
        blurScore: 0.52,
        framingScore: 0.52,
        segmentationConfidence: 0.52,
        signals: borderlineBack,
      },
    ];

    const out = analyseProgressScan({ assets, modelEstimate: null });

    expect(out.analysisStatus).toBe('complete');
    expect(out.abstentionReasons).toEqual([]);
    expect(out.physiqueAssessment.visualLeannessScore).toBe(89);
    expect(out.physiqueAssessment.scanConfidenceTier).toBe('low');
    expect(out.copySummary).toMatch(/Baseline Volyume Score 89\/100/i);

    const summary = measuredSignalsSummaryFromAssets(assets, null, {
      physiqueAssessment: out.physiqueAssessment,
    });
    expect(summary.assets[0]).toMatchObject({
      engine: 'mlkit_selfie_segmentation',
      quality: {
        foregroundThreshold: 0.36,
        componentDominance: 0.9,
      },
      mask: {
        foregroundRatio: 0.31,
        foregroundMeanProbability: 0.44,
        backgroundMeanProbability: 0.08,
      },
    });
  });

  test('valid front and back outline signals show a score even when confidence is only just usable', () => {
    const weakFront = {
      ...frontSignal,
      quality: {
        segmentationConfidence: 0.31,
        framingScore: 0.31,
        blurScore: 0.22,
        lightingScore: 0.30,
        poseConfidence: 0.26,
        backgroundSeparation: 0.24,
        cameraTiltDegrees: 12,
        foregroundThreshold: 0.38,
        componentDominance: 0.82,
      },
      mask: {
        foregroundRatio: 0.28,
        foregroundMeanProbability: 0.38,
        backgroundMeanProbability: 0.13,
      },
      abstentionReasons: [],
    };
    const weakBack = {
      ...weakFront,
      silhouetteRatios: backSignal.silhouetteRatios,
    };
    const assets = [
      {
        pose: 'front',
        qualityScore: 0.31,
        lightingScore: 0.30,
        blurScore: 0.22,
        framingScore: 0.31,
        landmarkConfidence: 0.26,
        segmentationConfidence: 0.31,
        signals: weakFront,
      },
      {
        pose: 'back',
        qualityScore: 0.31,
        lightingScore: 0.30,
        blurScore: 0.22,
        framingScore: 0.31,
        landmarkConfidence: 0.26,
        segmentationConfidence: 0.31,
        signals: weakBack,
      },
    ];

    expect(abstentionReasonsForAssets(assets)).toEqual([]);
    const out = analyseProgressScan({ assets, modelEstimate: null });

    expect(out.analysisStatus).toBe('complete');
    expect(out.physiqueAssessment.visualLeannessScore).toBe(89);
    expect(out.physiqueAssessment.scanConfidenceTier).toBe('low');
    expect(out.physiqueAssessment.progressSignal).toBe('baseline');
    expect(out.copySummary).toMatch(/Baseline Volyume Score 89\/100/i);
  });

  test('soft vision warnings lower confidence without erasing a complete measured score', () => {
    const warnedFront = {
      ...frontSignal,
      quality: {
        segmentationConfidence: 0.29,
        framingScore: 0.45,
        blurScore: 0.35,
        lightingScore: 0.48,
        poseConfidence: 0.42,
        backgroundSeparation: 0.19,
        cameraTiltDegrees: 24,
      },
      abstentionReasons: ['segmentation_low_confidence', 'clothing_or_background_uncertain', 'camera_tilted'],
    };
    const warnedBack = {
      ...warnedFront,
      silhouetteRatios: backSignal.silhouetteRatios,
    };
    const assets = [
      {
        pose: 'front',
        qualityScore: 0.34,
        lightingScore: 0.48,
        blurScore: 0.35,
        framingScore: 0.45,
        landmarkConfidence: 0.42,
        segmentationConfidence: 0.29,
        signals: warnedFront,
      },
      {
        pose: 'back',
        qualityScore: 0.34,
        lightingScore: 0.48,
        blurScore: 0.35,
        framingScore: 0.45,
        landmarkConfidence: 0.42,
        segmentationConfidence: 0.29,
        signals: warnedBack,
      },
    ];

    expect(abstentionReasonsForAssets(assets)).toEqual([
      'segmentation_low_confidence',
      'clothing_or_background_uncertain',
      'camera_tilted',
    ]);
    const out = analyseProgressScan({ assets, modelEstimate: null });

    expect(out.analysisStatus).toBe('complete');
    expect(out.abstentionReasons).toEqual([]);
    expect(out.qualityWarnings).toEqual(expect.arrayContaining([
      'segmentation_low_confidence',
      'clothing_or_background_uncertain',
      'camera_tilted',
    ]));
    expect(out.physiqueAssessment.visualLeannessScore).toBe(89);
    expect(out.physiqueAssessment.scanConfidenceTier).toBe('low');
    expect(out.copySummary).toMatch(/Baseline Volyume Score 89\/100/i);
  });

  test('model-backed silhouette signals produce a Volyume physique assessment without public body fat fields', () => {
    const estimate = estimateBodyFatFromScanAssets({
      assets: modelBackedAssets,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(estimate).toMatchObject({
      source: 'photo_scan',
      confidence: 'low',
      provisional: true,
      estimatorVersion: 'progress_scan_bf_estimator_v1',
      value: 16.8,
    });
    expect(estimate.inputs).toMatchObject({
      sex: 'male',
      bmi: 25.3,
      waistToHeight: 0.185,
      waistToShoulder: 0.63,
    });
    expect(estimate.limitations).toContain('never_authoritative_for_safety_floors');

    const out = analyseProgressScan({
      assets: modelBackedAssets,
      modelEstimate: estimate,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(out.analysisStatus).toBe('complete');
    expect(out.estimate).toBeNull();
    expect(out.range).toBeNull();
    expect(out.hiddenLegacyRange).toMatchObject({ midpoint: 16.8, low: 10, high: 23.6, margin: 6.8 });
    expect(out.physiqueAssessment).toMatchObject({
      source: 'photo_scan',
      analysisType: 'visual_physique_score',
      visualLeannessScore: 83,
      leannessBandLabel: 'Lean',
      scanConfidenceTier: 'moderate',
      progressSignal: 'baseline',
      calibrationStatus: 'still_calibrating_for_your_body_type',
    });
    expect(out.biasFlags).toContain('skin_tone_not_collected_validation_gap');
    expect(out.biasFlags).toContain('side_pose_missing');
    expect(out.copySummary).toMatch(/Baseline Volyume Score 83\/100/i);
    expect(out.copySummary).toMatch(/Score from photos taken in similar conditions/i);
  });

  test('private estimator anchor keeps a lean scan from looking falsely low', () => {
    const leanEstimate = {
      source: 'photo_scan',
      estimatorVersion: 'progress_scan_bf_estimator_v1',
      value: 10,
      inputs: {
        sex: 'male',
        bmi: 24,
        waistToShoulder: 0.72,
        waistToHip: 0.94,
        waistToHeight: 0.27,
        bodyAreaRatio: 0.37,
        frontBackWaistSpread: 0.01,
      },
      biasFlags: [],
    };

    const out = analyseProgressScan({
      assets: modelBackedAssets,
      modelEstimate: leanEstimate,
      sex: 'male',
      heightCm: 180,
      weightKg: 78,
    });

    expect(out.analysisStatus).toBe('complete');
    expect(out.estimate).toBeNull();
    expect(out.range).toBeNull();
    expect(out.physiqueAssessment.indexInputs).toMatchObject({
      silhouetteScore: 30,
      rawSilhouetteScore: 30,
      calibratedSilhouetteScore: 66,
      estimatorAnchorScore: 92,
    });
    expect(out.physiqueAssessment.visualLeannessScore).toBe(86);
    expect(out.physiqueAssessment.leannessBandLabel).toBe('Lean');
  });

  test('provisional estimator cannot drag a strong silhouette into a demoralising score', () => {
    const highEstimate = {
      source: 'photo_scan',
      estimatorVersion: 'progress_scan_bf_estimator_v1',
      value: 35,
      inputs: {
        sex: 'male',
        bmi: 28,
        waistToShoulder: 0.63,
        waistToHip: 0.77,
        waistToHeight: 0.185,
        bodyAreaRatio: 0.295,
        frontBackWaistSpread: 0.01,
      },
      biasFlags: [],
    };

    const out = analyseProgressScan({
      assets: modelBackedAssets,
      modelEstimate: highEstimate,
      sex: 'male',
      heightCm: 180,
      weightKg: 91,
    });

    expect(out.analysisStatus).toBe('complete');
    expect(out.physiqueAssessment.indexInputs).toMatchObject({
      rawSilhouetteScore: 68,
      calibratedSilhouetteScore: 89,
      boundedEstimatorAnchorScore: 81,
    });
    expect(out.physiqueAssessment.indexInputs.estimatorAnchorAdjustment).toBeGreaterThan(0);
    expect(out.physiqueAssessment.visualLeannessScore).toBeGreaterThanOrEqual(80);
    expect(out.physiqueAssessment.leannessBandLabel).toBe('Lean');
  });

  test('stored v2 raw scores recover to the calibrated display score when available', () => {
    const assessment = normaliseStoredPhysiqueAssessment({
      assessmentVersion: PROGRESS_SCAN_SCORE_VERSION,
      visualLeannessScore: 37,
      leannessBand: 'athletic',
      leannessBandLabel: 'Athletic',
      indexInputs: {
        rawSilhouetteScore: 37,
        calibratedSilhouetteScore: 71,
      },
    });

    expect(assessment.visualLeannessScore).toBe(71);
    expect(assessment.leannessBandLabel).toBe('Defined');
    expect(assessment.indexInputs.displayScoreRecoveredFromStoredRawScore).toBe(37);
  });

  test('optional side photo quality cannot withhold a clear front and back score', () => {
    const optionalBadSide = {
      pose: 'side',
      qualityScore: 0.2,
      lightingScore: 0.2,
      blurScore: 0.9,
      framingScore: 0.2,
      segmentationConfidence: 0.2,
      signals: {
        modelBacked: true,
        quality: {
          segmentationConfidence: 0.2,
          framingScore: 0.2,
          blurScore: 0.9,
          lightingScore: 0.2,
          poseConfidence: 0.2,
          cameraTiltDegrees: 14,
          backgroundSeparation: 0.2,
        },
        silhouetteRatios: {
          waistToShoulder: 0.9,
          waistToHip: 1.1,
          waistToHeight: 0.4,
          bodyAreaRatio: 0.5,
        },
        abstentionReasons: ['too_dark', 'whole_body_not_visible', 'camera_tilted'],
      },
    };
    const assets = [...modelBackedAssets, optionalBadSide];
    const estimate = estimateBodyFatFromScanAssets({
      assets,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    const out = analyseProgressScan({
      assets,
      modelEstimate: estimate,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(out.analysisStatus).toBe('complete');
    expect(out.abstentionReasons).toEqual([]);
    expect(out.physiqueAssessment.visualLeannessScore).toBe(83);
    expect(out.physiqueAssessment.scanConfidenceTier).toBe('moderate');
    expect(out.copySummary).toMatch(/Baseline Volyume Score 83\/100/i);
  });

  test('known bias flags concretely lower scan confidence, not just copy', () => {
    const base = computeScanConfidenceScore({
      assets: modelBackedAssets,
      quality: { score: 0.9, label: 'good' },
      biasFlags: [],
    });
    const flagged = computeScanConfidenceScore({
      assets: modelBackedAssets,
      quality: { score: 0.9, label: 'good' },
      biasFlags: ['female_overestimation_risk', 'darker_skin_overestimation_risk', 'stage_lean_or_prep', 'very_muscular'],
    });
    expect(flagged).toBeLessThan(base);
  });

  test('visual leanness score is deterministic from measured silhouette inputs, then calibrated for display', () => {
    expect(computeVisualLeannessScore({
      waistToShoulder: 0.63,
      waistToHip: 0.77,
      waistToHeight: 0.185,
      bodyAreaRatio: 0.295,
      frontBackWaistSpread: 0.01,
    })).toBe(68);
    expect(calibrateVolyumeScore(37)).toBe(71);
    expect(calibrateVolyumeScore(68)).toBe(89);
    expect(computeVisualLeannessScore({
      waistToShoulder: 0.63,
      waistToHip: 0.77,
      waistToHeight: 0.185,
      bodyAreaRatio: 0.295,
      frontBackWaistSpread: 0.01,
      sideWaistToHeight: 0.34,
    })).toBeLessThan(68);
  });

  test('Volyume Score bands are calibrated for normal users and lean athletes', () => {
    expect(leannessBandForScore(59).label).toBe('Active');
    expect(leannessBandForScore(60).label).toBe('Athletic');
    expect(leannessBandForScore(71).label).toBe('Defined');
    expect(leannessBandForScore(83).label).toBe('Lean');
    expect(leannessBandForScore(92).label).toBe('Very Lean');
    expect(leannessBandForScore(97).label).toBe('Peak Condition');
  });

  test('demographic and physique validation gaps materially widen any future internal range', () => {
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
    expect(trend.explanation).toMatch(/uncertainty bands overlap/i);
  });

  test('overlapping wide ranges stay steady even when midpoint movement looks large', () => {
    const trend = compareScanEstimates(
      { estimateBodyFatPercent: 37, estimateRangeLow: 33, estimateRangeHigh: 41 },
      { estimateBodyFatPercent: 30, estimateRangeLow: 26, estimateRangeHigh: 34 },
    );
    expect(trend.direction).toBe('steady');
    expect(trend.explanation).toMatch(/uncertainty bands overlap/i);
  });

  test('untrusted numeric estimates cannot be persisted as photo_scan estimate fields', () => {
    const out = analyseProgressScan({
      assets: modelBackedAssets,
      modelEstimate: 20,
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
    });
    expect(out.analysisStatus).toBe('complete');
    expect(out.estimate).toBeNull();
    expect(out.range).toBeNull();
    expect(out.physiqueAssessment.visualLeannessScore).toBe(89);
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
    expect(out.summary).toMatch(/progress context/i);
    expect(out.summary).not.toMatch(/estimate moved|estimate is/i);
    expect(out.summary).toMatch(/waist-to-height/i);
    expect(out.summary).not.toMatch(/quad|abs|separation|vascular|looks|appears|visible/i);
  });

  test('measured delta explanation with no measured comparable signals is withheld, not invented as steady', () => {
    const current = {
      analysisStatus: 'measured',
      qualityLabel: 'good',
      signals: { assets: [{ pose: 'front' }, { pose: 'back' }] },
    };
    const previous = {
      analysisStatus: 'measured',
      qualityLabel: 'good',
      signals: { assets: [{ pose: 'front' }, { pose: 'back' }] },
    };

    const out = explainMeasuredScanDelta({ currentScan: current, previousScan: previous });
    expect(out.comparisonStatus).toBe('not_comparable');
    expect(out.trendDirection).toBe('uncertain');
    expect(out.summary).toMatch(/not enough measured signals/i);
  });

  test('legacy estimate fields do not leak into delta explanation copy', () => {
    const current = {
      analysisStatus: 'complete',
      qualityLabel: 'good',
      estimateBodyFatPercent: 16,
      estimateRangeLow: 12,
      estimateRangeHigh: 20,
      stats: { weightKg: 80 },
      signals: {
        physiqueAssessment: {
          visualLeannessScore: 66,
          scanConfidenceTier: 'moderate',
        },
        assets: [{ pose: 'front' }, { pose: 'back' }],
        estimatorInputs: {
          waistToHeight: 0.18,
          waistToShoulder: 0.61,
        },
      },
    };
    const previous = {
      analysisStatus: 'complete',
      qualityLabel: 'good',
      estimateBodyFatPercent: 25,
      estimateRangeLow: 21,
      estimateRangeHigh: 29,
      signals: {
        physiqueAssessment: {
          visualLeannessScore: 54,
          scanConfidenceTier: 'moderate',
        },
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
    expect(out.summary).toMatch(/Volyume Score is up 12 points/i);
    expect(out.summary).toMatch(/visual physique signal/i);
    expect(out.summary).not.toMatch(/body fat ranges|midpoint|provisional photo-scan estimate/i);
    expect(out.summary).not.toMatch(/quad|abs|separation|vascular|looks|appears|visible/i);
  });

  test('scan comparability ignores optional side-pose changes but still refuses setup changes before reporting progress', () => {
    const previous = comparableScan({ id: 'old', side: true });
    const withoutSide = comparableScan({ id: 'new', side: false });
    expect(scanComparability(withoutSide, previous)).toMatchObject({
      comparable: true,
      reason: 'Comparable front and back photo set.',
    });
    expect(scanSetupStability(withoutSide, previous).issues).not.toContain('side_pose_set_changed');

    const movedCamera = comparableScan({ id: 'new', side: true, height: 0.62, centerY: 0.32, tilt: 6 });
    const setup = scanSetupStability(movedCamera, previous);
    expect(setup.stable).toBe(false);
    expect(setup.issues).toEqual(expect.arrayContaining([
      'front_camera_distance_changed',
      'front_camera_height_changed',
      'front_camera_angle_changed',
    ]));
    expect(scanComparability(movedCamera, previous).comparable).toBe(false);
  });

  test('scan comparability supports weekly photo sets and refuses shorter intervals', () => {
    const previous = comparableScan({ id: 'old', score: 60 });
    const current = comparableScan({ id: 'new', score: 72 });
    previous.capturedAt = Date.parse('2026-07-01T08:00:00Z');
    current.capturedAt = previous.capturedAt + (7 * DAY_MS);

    expect(scanComparability(current, previous)).toMatchObject({
      comparable: true,
      status: 'comparable',
    });

    current.capturedAt = previous.capturedAt + (7 * DAY_MS);
    current.capturedAt -= 1;

    const comparability = scanComparability(current, previous);
    expect(comparability).toMatchObject({
      comparable: false,
      status: 'not_comparable',
      reason: 'Photo sets are too close together for a fair progress comparison.',
    });

    const out = explainMeasuredScanDelta({ currentScan: current, previousScan: previous });
    expect(out.comparisonStatus).toBe('not_comparable');
    expect(out.summary).toMatch(/too close together/i);
    expect(out.progressSignal).toBeUndefined();
  });

  test('comparison progress signal is withheld when the weaker scan confidence is low', () => {
    const previous = comparableScan({ id: 'old', score: 60, confidence: 'low' });
    const current = comparableScan({ id: 'new', score: 72, confidence: 'high' });

    const out = explainMeasuredScanDelta({ currentScan: current, previousScan: previous });
    expect(out.comparisonStatus).toBe('comparable');
    expect(out.pairConfidenceTier).toBe('low');
    expect(out.progressDeltaScore).toBe(12);
    expect(out.progressSignal).toBe('inconclusive');
    expect(out.visualTrendDirection).toBe('uncertain');
    expect(out.trendDirection).toBe('uncertain');
    expect(out.trendMagnitudePctPoints).toBeNull();
    expect(out.summary).toMatch(/not calling a progress trend/i);
    expect(out.trendSummary).toMatch(/not calling progress/i);
    expect(out.previousLeannessScore).toBe(60);
  });

  test('coach summary is suppressed under calm or ED mode', () => {
    const scan = {
      analysisStatus: 'complete',
      capturedAt: 1,
      estimateConfidence: 'low',
      estimateRangeLow: 10,
      estimateRangeHigh: 23.6,
      qualityLabel: 'good',
      trendDirection: 'steady',
      signalsJson: JSON.stringify({
        physiqueAssessment: {
          visualLeannessScore: 66,
          leannessBand: 'lean',
          leannessBandLabel: 'Lean',
          scanConfidenceTier: 'moderate',
          scanConfidenceScore: 0.78,
          progressSignal: 'holding_steady',
          progressSignalLabel: 'Holding steady',
          progressDirection: 'steady',
        },
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
      confidence: 'moderate',
      trendDirection: 'steady',
      comparisonStatus: 'comparable',
      comparableCount: 1,
      visualLeannessScore: 66,
      leannessBandLabel: 'Lean',
      rangeLow: null,
      rangeHigh: null,
    });
    expect(JSON.stringify(coachSummaryFromScan(scan, { suppressed: false }))).not.toMatch(/estimateBodyFatPercent|midpoint|rangeLow":\d|rangeHigh":\d/i);
  });
});
