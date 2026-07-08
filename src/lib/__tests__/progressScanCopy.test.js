import { scanReadCopy, scanStatsCopy, trendOnlyScanCopy } from '../progressScanCopy';

const scoredScan = {
  analysisStatus: 'complete',
  trendDirection: 'down',
  signals: {
    physiqueAssessment: {
      visualLeannessScore: 72,
      leannessBandLabel: 'Lean',
      scanConfidenceLabel: 'High',
      progressSignalLabel: 'Slight positive trend',
    },
  },
  stats: {
    photoCount: 2,
    weightKg: 82.4,
    poses: ['front', 'back'],
  },
};

describe('progressScanCopy', () => {
  test('scanReadCopy explains Volyume Score as a private visual progress score', () => {
    expect(scanReadCopy(scoredScan)).toBe(
      'Volyume Score 72/100. Lean band. Result confidence: High. Progress change: Slight positive trend. Private visual progress score from repeatable photos.',
    );
  });

  test('hide-exact keeps the trend and hides the detailed score', () => {
    expect(scanReadCopy(scoredScan, { hideExact: true })).toBe(
      'Lean band. Progress change: Slight positive trend. Detailed score is hidden.',
    );
  });

  test('suppression hides score details completely', () => {
    expect(scanReadCopy(scoredScan, { suppressed: true })).toBe(
      'Photo set saved privately. Score details are hidden right now.',
    );
  });

  test('measured scans use trend-only copy when exact details are hidden', () => {
    expect(scanReadCopy({
      analysisStatus: 'measured',
      trendDirection: 'steady',
      copySummary: 'Measured and saved.',
    }, { hideExact: true })).toBe('Progress change: holding steady.');
  });

  test('trendOnlyScanCopy handles not-comparable and baseline states', () => {
    expect(trendOnlyScanCopy({ deltaExplanation: { comparisonStatus: 'not_comparable' } })).toBe(
      'Saved, but not compared because the setup changed too much.',
    );
    expect(trendOnlyScanCopy({})).toBe('Baseline photo set saved.');
  });

  test('scanStatsCopy includes weight only when not suppressed and not hide-exact', () => {
    expect(scanStatsCopy(scoredScan)).toBe('2 photos | 82.4 kg weight snapshot | Front, Back');
    expect(scanStatsCopy(scoredScan, { hideExact: true })).toBe('2 photos | Front, Back');
    expect(scanStatsCopy(scoredScan, { suppressed: true })).toBe('2 photos | Front, Back');
  });

  test('scanStatsCopy falls back when scan stats are empty', () => {
    expect(scanStatsCopy({})).toBe('Stored photo set');
  });

  test('legacy v1 scan numbers are recalibrated before display copy', () => {
    const legacy = {
      ...scoredScan,
      signals: {
        physiqueAssessment: {
          assessmentVersion: 'volyume_physique_scan_score_v1',
          visualLeannessScore: 37,
          leannessBandLabel: 'Athletic',
          scanConfidenceLabel: 'Moderate',
          progressSignalLabel: 'Baseline scan',
        },
      },
    };
    const copy = scanReadCopy(legacy);
    expect(copy).toContain('Volyume Score 71/100');
    expect(copy).not.toContain('37/100');
  });
});
