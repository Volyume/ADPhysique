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
  test('scanReadCopy explains Volyume Score without presenting body fat percentage', () => {
    expect(scanReadCopy(scoredScan)).toBe(
      'Volyume Score 72. Lean band. Scan Confidence: High. Progress Signal: Slight positive trend. This is a 0-100 visual progress score for photos taken in similar conditions, not a body fat percentage.',
    );
  });

  test('hide-exact keeps the trend and hides the detailed score', () => {
    expect(scanReadCopy(scoredScan, { hideExact: true })).toBe(
      'Lean band. Progress Signal: Slight positive trend. Detailed score is hidden. This is not a body fat percentage.',
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
    }, { hideExact: true })).toBe('Progress Signal: holding steady.');
  });

  test('trendOnlyScanCopy handles not-comparable and baseline states', () => {
    expect(trendOnlyScanCopy({ deltaExplanation: { comparisonStatus: 'not_comparable' } })).toBe(
      'Trend context: saved, but not compared because the setup changed too much.',
    );
    expect(trendOnlyScanCopy({})).toBe('Trend context: baseline photo set saved.');
  });

  test('scanStatsCopy includes weight only when not suppressed and not hide-exact', () => {
    expect(scanStatsCopy(scoredScan)).toBe('2 photos | 82.4 kg weight snapshot | Front, Back');
    expect(scanStatsCopy(scoredScan, { hideExact: true })).toBe('2 photos | Front, Back');
    expect(scanStatsCopy(scoredScan, { suppressed: true })).toBe('2 photos | Front, Back');
  });

  test('scanStatsCopy falls back when scan stats are empty', () => {
    expect(scanStatsCopy({})).toBe('Stored photo set');
  });
});
