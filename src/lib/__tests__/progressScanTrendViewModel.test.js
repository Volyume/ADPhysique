// Wave 3 (results-ui-and-copy-blueprint.md §4; scoring-accuracy-and-
// validation-blueprint.md §7). Pins the trend view-model against the REAL
// scanComparability gate (progressScanAnalysis.js, never mocked): comparable-
// only connections, unconnected gaps with a reason, marker shape encodes
// confidence (never colour alone), and the fixed language ladder.
import { buildTrendPoints, trendLadderLabel, TREND_EMPTY_STATE_TEXT } from '../progressScanTrendViewModel';

const DAY = 86400000;
const base = Date.UTC(2026, 0, 1);

function scan(id, day, {
  score = 66,
  tier = 'moderate',
  lightingScore = 0.7,
} = {}) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: base + day * DAY,
    analysisStatus: score == null ? 'abstained' : 'complete',
    qualityLabel: score == null ? 'poor' : 'good',
    signals: score == null ? {} : {
      physiqueAssessment: {
        visualLeannessScore: score,
        leannessBandLabel: 'Defined',
        scanConfidenceTier: tier,
        scanConfidenceLabel: tier,
        progressSignalLabel: 'Slight positive trend',
      },
    },
    // Full quality metrics like a real measured scan (only lighting drifts in
    // the fixtures): scanSetupStability now fails closed below a minimum
    // compared-signal count (audit D-F3), matching real records that always
    // persist these fields.
    assets: [
      { pose: 'front', lightingScore, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
      { pose: 'back', lightingScore, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
    ],
  };
}

describe('buildTrendPoints', () => {
  test('empty scan list produces zero points', () => {
    expect(buildTrendPoints([]).points).toEqual([]);
    expect(buildTrendPoints([]).totalCount).toBe(0);
  });

  test('a mixed-comparability fixture: comparable scans connect, a setup break is an unconnected gap with a reason', () => {
    const scans = [
      scan('a', 1, { lightingScore: 0.7 }), // baseline
      scan('b', 9, { lightingScore: 0.68 }), // comparable to a (lighting drift small, 8 days apart)
      scan('c', 17, { lightingScore: 0.1 }), // lighting drifted hard vs b => not comparable
      scan('d', 25, { lightingScore: 0.12 }), // comparable to c (drift small again, 8 days apart)
    ];
    const { points, comparableCount, totalCount } = buildTrendPoints(scans);
    expect(totalCount).toBe(4);
    expect(points.map((p) => p.scanId)).toEqual(['a', 'b', 'c', 'd']);

    expect(points[0].isBaseline).toBe(true);
    expect(points[0].comparable).toBe(false);
    expect(points[0].gapReason).toBeNull();

    expect(points[1].comparable).toBe(true);
    expect(points[1].gapReason).toBeNull();

    expect(points[2].comparable).toBe(false);
    expect(points[2].gapReason).toEqual(expect.any(String));
    expect(points[2].gapReason.length).toBeGreaterThan(0);

    expect(points[3].comparable).toBe(true);
    expect(comparableCount).toBe(2); // b-vs-a, d-vs-c
  });

  // S7-2b (progress-tab audit second pass, 2026-09-25, register D200 item
  // 7, report §8): buildTrendPoints used to compare each point strictly
  // against the literal previous scan, while finishProgressScanSession
  // skipped ahead to the nearest comparable one at save time -- so the
  // Trend view and the stored status could disagree for a good scan that
  // follows one poor one. Both now share progressScanChain's resolver.
  test('S1 (good) / S2 (poor, 8+ days later) / S3 (good, 8+ days later): the Trend view marks S3 comparable, skipping the poor S2 (matches storage)', () => {
    const scans = [scan('s1', 1), scan('s2', 9), scan('s3', 17)];
    // Force s2 poor (scanComparability fails on either side's qualityLabel);
    // the scan() helper only derives 'poor' from a null score, so it is set
    // directly here.
    scans[1].qualityLabel = 'poor';
    const { points, comparableCount } = buildTrendPoints(scans);
    const byId = Object.fromEntries(points.map((p) => [p.scanId, p]));
    expect(byId.s2.comparable).toBe(false); // the poor scan itself never counts
    expect(byId.s3.comparable).toBe(true); // S3 skips S2 and connects to S1
    expect(byId.s3.gapReason).toBeNull();
    expect(comparableCount).toBe(1); // only s3 (skip-to-s1) is comparable
  });

  test('confidence is encoded by marker shape, never colour: solid for High/Moderate, hollow for Low, unscored for no score', () => {
    const scans = [
      scan('high', 1, { tier: 'high' }),
      scan('mid', 10, { tier: 'moderate' }),
      scan('low', 20, { tier: 'low' }),
      scan('none', 30, { score: null }),
    ];
    const { points } = buildTrendPoints(scans);
    const byId = Object.fromEntries(points.map((p) => [p.scanId, p]));
    expect(byId.high.shape).toBe('solid');
    expect(byId.mid.shape).toBe('solid');
    expect(byId.low.shape).toBe('hollow');
    expect(byId.none.shape).toBe('unscored');
  });

  test('a Low-tier point never renders its numeric score, only the chip label', () => {
    const { points } = buildTrendPoints([scan('a', 1, { tier: 'low' })]);
    expect(points[0].scoreText).toBeNull();
    expect(points[0].chipLabel).toBe('Low confidence');
  });

  test('a High/Moderate point renders the formatted score', () => {
    const { points } = buildTrendPoints([scan('a', 1), scan('b', 10)]);
    expect(points[1].scoreText).toBe('66/100');
  });
});

describe('trendLadderLabel: the fixed language ladder', () => {
  test('zero scans: no label (empty state copy is the caller responsibility)', () => {
    expect(trendLadderLabel(0, 0)).toBeNull();
  });

  test('1 scan (baseline only, no comparable pair yet): Your starting point', () => {
    expect(trendLadderLabel(0, 1)).toBe('Your starting point');
  });

  // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
  test('2 comparable scans: An early indication', () => {
    expect(trendLadderLabel(1, 2)).toBe('An early indication');
  });

  test('3+ comparable scans: A trend', () => {
    expect(trendLadderLabel(2, 3)).toBe('A trend');
    expect(trendLadderLabel(5, 6)).toBe('A trend');
  });
});

test('TREND_EMPTY_STATE_TEXT is the exact results-blueprint §7 copy', () => {
  expect(TREND_EMPTY_STATE_TEXT).toBe('Trends appear after three comparable photo sets.');
});
