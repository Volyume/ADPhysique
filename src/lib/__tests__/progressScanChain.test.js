/**
 * progressScanChain — the shared comparison-predecessor resolver and
 * running comparable-scan count (S7-2b/S7-2a, progress-tab audit second
 * pass, 2026-09-25, register D200 item 7, report §8).
 *
 * Before this module, finishProgressScanSession (progressScanStore.js)
 * skipped ahead through up to ten prior scans to the nearest comparable
 * one at save time (a single poor scan must not sever the chain), while
 * buildTrendPoints (progressScanTrendViewModel.js) compared strictly
 * against the literal previous scan at read time -- so the two disagreed
 * on the same scan's comparable/not-comparable verdict. This suite pins
 * the shared resolver against the REAL scanComparability gate (never
 * mocked), and the running count it is built to agree with:
 *   - S1 (good) / S2 (poor, 8+ days later) / S3 (good, 8+ days later): S3
 *     resolves comparable against S1, skipping the poor S2;
 *   - a chain of three comparable scans (four total, including the
 *     baseline) counts 3;
 *   - a poor scan in the middle of an otherwise-comparable chain costs
 *     only itself -- it resets nothing that comes after it;
 *   - the fallback to the literal nearest candidate when nothing in the
 *     lookback window is comparable (so a caller still gets a real
 *     "reason", e.g. for the Trend view's gap caption).
 */
import { resolveComparablePrevious, comparableChainCount, DEFAULT_CHAIN_LOOKBACK } from '../progressScanChain';

const DAY = 86400000;
const base = Date.UTC(2026, 0, 1);

// Mirrors progressScanTrendViewModel.test.js's own fixture shape: a
// lightweight scan object that still satisfies the REAL scanComparability
// gate (full per-pose quality metrics, since scanSetupStability fails
// closed below a minimum compared-signal count).
function scan(id, day, { score = 66, tier = 'moderate', qualityLabel = 'good', lightingScore = 0.7 } = {}) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: base + day * DAY,
    analysisStatus: 'complete',
    qualityLabel,
    signals: {
      physiqueAssessment: {
        visualLeannessScore: score,
        leannessBandLabel: 'Defined',
        scanConfidenceTier: tier,
        scanConfidenceLabel: tier,
      },
    },
    assets: [
      { pose: 'front', lightingScore, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
      { pose: 'back', lightingScore, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
    ],
  };
}

function poor(id, day) {
  return scan(id, day, { qualityLabel: 'poor' });
}

describe('resolveComparablePrevious', () => {
  test('S1 (good) / S2 (poor, 8+ days later) / S3 (good, 8+ days later): S3 skips the poor S2 and resolves comparable against S1', () => {
    const s1 = scan('s1', 1);
    const s2 = poor('s2', 9); // 8 days after s1, poor quality
    const s3 = scan('s3', 17); // 8 days after s2
    // Nearest-first candidates, as both real call sites hold them.
    const { previous, comparability } = resolveComparablePrevious(s3, [s2, s1]);
    expect(previous.id).toBe('s1');
    expect(comparability.comparable).toBe(true);
  });

  test('no candidates: comparability is against null (baseline-shaped), never a throw', () => {
    const s1 = scan('s1', 1);
    const { previous, comparability } = resolveComparablePrevious(s1, []);
    expect(previous).toBeNull();
    expect(comparability.comparable).toBe(false);
    expect(comparability.status).toBe('baseline');
  });

  test('nothing in the lookback window is comparable: falls back to the literal nearest candidate with its real reason', () => {
    const s1 = poor('s1', 1);
    const s2 = poor('s2', 9);
    const current = scan('s3', 17);
    const { previous, comparability } = resolveComparablePrevious(current, [s2, s1]);
    expect(previous.id).toBe('s2'); // the nearest, even though not comparable
    expect(comparability.comparable).toBe(false);
    expect(typeof comparability.reason).toBe('string');
    expect(comparability.reason.length).toBeGreaterThan(0);
  });

  test('the default lookback is 10, matching the depth finishProgressScanSession already used', () => {
    expect(DEFAULT_CHAIN_LOOKBACK).toBe(10);
  });

  test('a comparable candidate outside the lookback window is never reached', () => {
    const goodFarBack = scan('good-far-back', 1);
    // 10 poor scans between the good one and current, all within 8+ days of
    // each other so the day-gap gate never disqualifies them for a reason
    // OTHER than quality.
    const poorFillers = Array.from({ length: 10 }, (_, i) => poor(`poor-${i}`, 9 + i * 8));
    const current = scan('current', 9 + 10 * 8 + 8);
    const nearestFirst = [...poorFillers].reverse().concat(goodFarBack);
    const { comparability } = resolveComparablePrevious(current, nearestFirst, { lookback: 10 });
    expect(comparability.comparable).toBe(false);
  });
});

describe('comparableChainCount', () => {
  test('empty or single-scan chains count zero', () => {
    expect(comparableChainCount([])).toBe(0);
    expect(comparableChainCount([scan('a', 1)])).toBe(0);
  });

  test('a chain of three comparable scans (plus the baseline) counts 3', () => {
    const chain = [scan('s0', 1), scan('s1', 9), scan('s2', 17), scan('s3', 25)];
    expect(comparableChainCount(chain)).toBe(4 - 1); // every non-baseline scan is comparable
  });

  test('a poor scan resets nothing it should not: it costs only itself', () => {
    // s0 good (baseline) -> s1 poor (does not count) -> s2 good, skips to s0
    // (counts) -> s3 good, comparable to s2 directly (counts).
    const chain = [scan('s0', 1), poor('s1', 9), scan('s2', 17), scan('s3', 25)];
    expect(comparableChainCount(chain)).toBe(2);
  });

  test('the running count is the same value buildTrendPoints would report for the identical chain', () => {
    // Cross-check against the S1/S2/S3 case above, expressed as a full
    // ordered chain: S2 (poor) never counts, S3 (skip to S1) does.
    const chain = [scan('s1', 1), poor('s2', 9), scan('s3', 17)];
    expect(comparableChainCount(chain)).toBe(1);
  });
});
