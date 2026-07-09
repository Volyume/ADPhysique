// Wave 3 (results-ui-and-copy-blueprint.md, governing; scoring-accuracy-and-
// validation-blueprint.md §5/§9). Pins the pure tier-rendered-contract and
// receipt-builder view-models against the REAL engine (progressScanAnalysis.js
// is imported transitively, never mocked): per-tier what a caller may show,
// the fixed confidence chip labels, the Low-tier reveal gate, and the receipt
// sentence + Why? lines built from reason/setup-finding codes.
import {
  buildScanReceipt,
  buildScoreTierContract,
  CONFIDENCE_CHIP_LABEL,
  confidenceChipLabel,
  isRecalibratedAssessment,
  resolveConfidenceTier,
} from '../progressScanResultsContract';

function assessment(overrides = {}) {
  return {
    visualLeannessScore: 74,
    leannessBandLabel: 'Defined',
    scanConfidenceTier: 'high',
    scanConfidenceLabel: 'High',
    progressSignalLabel: 'Slight positive trend',
    ...overrides,
  };
}

function scanWith(overrides = {}) {
  return {
    id: 'scan-1',
    analysisStatus: 'complete',
    signals: { physiqueAssessment: assessment(overrides.assessment) },
    ...overrides,
  };
}

describe('confidenceChipLabel / resolveConfidenceTier', () => {
  test('fixed chip label set matches the results blueprint §2 wording exactly', () => {
    expect(CONFIDENCE_CHIP_LABEL).toEqual({
      high: 'High confidence',
      moderate: 'Moderate confidence',
      low: 'Low confidence',
      not_enough: 'Not enough confidence',
    });
  });

  test('an unrecognised or missing tier resolves to not_enough (never rendered as a real tier)', () => {
    expect(resolveConfidenceTier(scanWith({ assessment: { scanConfidenceTier: 'unknown' } }))).toBe('not_enough');
    expect(resolveConfidenceTier(scanWith({ assessment: { scanConfidenceTier: undefined } }))).toBe('not_enough');
    expect(resolveConfidenceTier(scanWith({ assessment: { scanConfidenceTier: 'bogus' } }))).toBe('not_enough');
    expect(confidenceChipLabel('bogus')).toBe('Not enough confidence');
  });
});

describe('buildScoreTierContract: the rendered contract per tier (scoring blueprint §5 table)', () => {
  test('High: score, band and trend direction/size are all shown', () => {
    const c = buildScoreTierContract(scanWith({ assessment: { scanConfidenceTier: 'high' } }));
    expect(c.tier).toBe('high');
    expect(c.chipLabel).toBe('High confidence');
    expect(c.showScore).toBe(true);
    expect(c.scoreText).toBe('74/100');
    expect(c.showBand).toBe(true);
    expect(c.showTrendDirection).toBe(true);
    expect(c.showTrendSize).toBe(true);
    expect(c.requiresRevealAffordance).toBe(false);
    expect(c.accessibilityLabel).toBe('Volyume Score 74/100, High confidence.');
  });

  test('Moderate: score and band shown, trend size softened (no exact-size headline)', () => {
    const c = buildScoreTierContract(scanWith({ assessment: { scanConfidenceTier: 'moderate' } }));
    expect(c.tier).toBe('moderate');
    expect(c.showScore).toBe(true);
    expect(c.showTrendDirection).toBe(true);
    expect(c.showTrendSize).toBe(false);
    expect(c.requiresRevealAffordance).toBe(false);
  });

  test('Low: band and reasons lead; the integer is gated behind a reveal affordance', () => {
    const scan = scanWith({ assessment: { scanConfidenceTier: 'low' } });
    const hidden = buildScoreTierContract(scan);
    expect(hidden.tier).toBe('low');
    expect(hidden.chipLabel).toBe('Low confidence');
    expect(hidden.showBand).toBe(true);
    expect(hidden.bandLabel).toBe('Defined');
    expect(hidden.showScore).toBe(false);
    expect(hidden.showTrendDirection).toBe(false);
    expect(hidden.requiresRevealAffordance).toBe(true);
    expect(hidden.accessibilityLabel).not.toContain('74/100');
    expect(hidden.accessibilityLabel).toContain('Low confidence');

    const revealed = buildScoreTierContract(scan, { revealed: true });
    expect(revealed.showScore).toBe(true);
    expect(revealed.scoreText).toBe('74/100');
    expect(revealed.caveatText).toMatch(/low confidence/i);
    expect(revealed.accessibilityLabel).toBe('Volyume Score 74/100, Low confidence.');
  });

  test('Not enough: only the withhold receipt is implied; no score, band or trend', () => {
    const c = buildScoreTierContract(scanWith({ assessment: { visualLeannessScore: null, scanConfidenceTier: 'not_enough' } }));
    expect(c.tier).toBe('not_enough');
    expect(c.chipLabel).toBe('Not enough confidence');
    expect(c.showScore).toBe(false);
    expect(c.showBand).toBe(false);
    expect(c.scoreText).toBeNull();
  });

  test('a numeric score with an unrecognised tier renders as Not-enough, never as if the tier were real', () => {
    const c = buildScoreTierContract(scanWith({ assessment: { scanConfidenceTier: 'nonsense' } }));
    expect(c.tier).toBe('not_enough');
    expect(c.showScore).toBe(false);
  });

  test('suppression hides everything, including the chip, and never leaks the score', () => {
    const c = buildScoreTierContract(scanWith({ assessment: { scanConfidenceTier: 'high' } }), { suppressed: true });
    expect(c.showScore).toBe(false);
    expect(c.chipLabel).toBeNull();
    expect(c.scoreText).toBeNull();
    expect(c.accessibilityLabel).toBe('Score hidden.');
  });
});

describe('buildScanReceipt: one calm sentence + Why? lines per outcome', () => {
  test('withheld: uses the engine copySummary verbatim and turns abstention reasons into fix-tip lines', () => {
    const scan = {
      id: 'w1',
      analysisStatus: 'abstained',
      copySummary: 'No score this time. The back photo was too dark to read reliably. Your photos are saved.',
      abstentionReasons: ['too_dark', 'too_blurry'],
      signals: { physiqueAssessment: { visualLeannessScore: null } },
    };
    const receipt = buildScanReceipt(scan);
    expect(receipt.outcome).toBe('withheld');
    expect(receipt.sentence).toBe(scan.copySummary);
    expect(receipt.whyLines).toEqual([
      'One of the photos was too dark to read reliably. Even front light will fix this next time.',
      'One of the photos was too blurry to read reliably.',
    ]);
  });

  test('duplicate-pose-content withhold carries the exact safety-blueprint copy', () => {
    const scan = {
      id: 'w2',
      analysisStatus: 'abstained',
      copySummary: 'Two poses used the same photo, so this set was not scored. Retake each pose separately and the set will score.',
      abstentionReasons: ['duplicate_pose_content'],
      signals: { physiqueAssessment: { visualLeannessScore: null } },
    };
    const receipt = buildScanReceipt(scan);
    expect(receipt.whyLines).toEqual([
      'Two poses used the same photo, so this set was not scored. Retake each pose separately and the set will score.',
    ]);
  });

  test('baseline: exact blueprint copy, no Why? lines', () => {
    const scan = scanWith({ deltaExplanation: { comparisonStatus: 'baseline' } });
    const receipt = buildScanReceipt(scan);
    expect(receipt.outcome).toBe('baseline');
    expect(receipt.sentence).toBe('Your starting set is saved. Take your next set the same way, at least a week from now, to unlock comparison.');
    expect(receipt.whyLines).toEqual([]);
  });

  test('not comparable: sentence from the engine, Why? lines from setup drift codes', () => {
    const previousScan = { id: 'prev', assets: [{ pose: 'front', lightingScore: 0.8 }] };
    const scan = scanWith({
      deltaExplanation: { comparisonStatus: 'not_comparable', summary: 'This scan is saved, but the setup changed too much for a fair comparison.' },
      assets: [{ pose: 'front', lightingScore: 0.2 }],
    });
    const receipt = buildScanReceipt(scan, { previousScan });
    expect(receipt.outcome).toBe('not_comparable');
    expect(receipt.sentence).toBe('This scan is saved, but the setup changed too much for a fair comparison.');
    expect(receipt.whyLines).toEqual(['Confidence is lower this time because the lighting changed between sets.']);
  });

  test('scored: High/Moderate tier with no downgrade reasons', () => {
    const scan = scanWith({ assessment: { scanConfidenceTier: 'moderate' }, deltaExplanation: { comparisonStatus: 'comparable' } });
    const receipt = buildScanReceipt(scan);
    expect(receipt.outcome).toBe('scored');
    expect(receipt.whyLines).toEqual([]);
  });

  test('scored_downgraded: Low tier or an engaged anchor produces the downgraded outcome', () => {
    const lowTier = scanWith({ assessment: { scanConfidenceTier: 'low' }, deltaExplanation: { comparisonStatus: 'comparable' } });
    expect(buildScanReceipt(lowTier).outcome).toBe('scored_downgraded');

    const anchorEngaged = scanWith({
      assessment: { scanConfidenceTier: 'moderate', anchorEngaged: true },
      deltaExplanation: { comparisonStatus: 'comparable' },
    });
    expect(buildScanReceipt(anchorEngaged).outcome).toBe('scored_downgraded');
  });

  test('scored_downgraded Why? lines surface quality warnings as calm condition-blaming sentences, never internal flag names', () => {
    const scan = scanWith({
      assessment: { scanConfidenceTier: 'low' },
      deltaExplanation: { comparisonStatus: 'comparable' },
      qualityWarnings: ['clothing_or_background_uncertain', 'camera_tilted'],
    });
    const receipt = buildScanReceipt(scan);
    expect(receipt.whyLines).toEqual([
      'Clothing or background made the outline less certain.',
      'The camera was tilted more than usual.',
    ]);
    expect(receipt.whyLines.join(' ')).not.toMatch(/female_overestimation_risk|darker_skin|very_muscular|large_body/);
  });
});

describe('isRecalibratedAssessment', () => {
  test('true only when the wave-1 migration flags are present', () => {
    expect(isRecalibratedAssessment({ indexInputs: { displayScoreCalibratedFrom: 'volyume_physique_scan_score_v1' } })).toBe(true);
    expect(isRecalibratedAssessment({ indexInputs: { displayScoreRecoveredFromStoredRawScore: 41 } })).toBe(true);
    expect(isRecalibratedAssessment({ indexInputs: {} })).toBe(false);
    expect(isRecalibratedAssessment(null)).toBe(false);
    expect(isRecalibratedAssessment({})).toBe(false);
  });
});
