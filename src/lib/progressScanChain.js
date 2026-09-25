// progressScanChain.js — S7-2(b) (progress-tab audit second pass,
// 2026-09-25, register D200 item 7, report §8): ONE shared comparison-
// predecessor policy, used by both the scan-finish store write
// (progressScanStore.finishProgressScanSession) and the read-time Trend
// view (progressScanTrendViewModel.buildTrendPoints). Before this module,
// each call site ran its own logic: the store skipped ahead through up to
// ten prior scans to the nearest comparable one (so a single poor scan
// could not sever the chain), while the Trend view compared strictly
// against the literal previous scan, so the two disagreed on the same
// scan's comparable/not-comparable verdict. The skip-ahead policy is the
// one kept (a single poor scan must not sever the chain); both call sites
// now go through this module instead of repeating it.
//
// Also exports `comparableChainCount`, the running count of comparable
// scans across an ordered chain (S7-2a: the evidence chain's
// `trendWindow.count` needs a real running count of comparable SCANS, not
// scanComparability's own `comparableCount` field, which is a per-pair POSE
// count (REQUIRED_SCAN_POSES.length) and a different thing entirely). Both
// exports share the same resolver so a point's own `comparable` flag and
// the chain total can never disagree.
//
// Pure: no I/O, no store, no Date.now(). Operates on whatever scan shape
// the caller already holds -- progressScanStore's rowToScan rows and the
// richer UI scanEntry() objects both carry what scanComparability needs
// (scanComparability itself reads through scanSignals()/scan.assets, which
// covers either shape).
import { scanComparability } from './progressScanAnalysis';

// Matches the skip-ahead depth finishProgressScanSession already used
// before this extraction (progressScanStore.js: `getPreviousAnalysedProgressScans(
// userId, session.capturedAt, 10)`). This is now the one place that number
// lives for the comparison-partner search.
export const DEFAULT_CHAIN_LOOKBACK = 10;

/**
 * Resolves which prior scan `current` should be compared against: the
 * nearest one behind it (in `previousCandidates`, nearest-first) that
 * `scanComparability` accepts as comparable, skipping up to `lookback`
 * incomparable scans (poor quality, too-close dates, a mismatched setup...)
 * so a single poor scan cannot sever the chain. Falls back to the literal
 * nearest candidate (so the caller still gets a real reason, e.g. for the
 * Trend view's gap caption) when nothing in the window is comparable.
 *
 * @param {object|null} current
 * @param {Array<object>} previousCandidates - nearest-first (descending
 *   capturedAt, strictly before `current`) -- the order both existing call
 *   sites already hold their candidates in.
 * @param {{lookback?: number}} [opts]
 * @returns {{previous: (object|null), comparability: object}} `comparability`
 *   is scanComparability's own return shape for the chosen pair (or against
 *   `null` when there are no candidates at all).
 */
export function resolveComparablePrevious(current, previousCandidates = [], { lookback = DEFAULT_CHAIN_LOOKBACK } = {}) {
  const pool = Array.isArray(previousCandidates) ? previousCandidates.slice(0, Math.max(1, lookback)) : [];
  if (!pool.length) {
    return { previous: null, comparability: scanComparability(current, null) };
  }
  for (const candidate of pool) {
    const comparability = scanComparability(current, candidate);
    if (comparability.comparable) return { previous: candidate, comparability };
  }
  const nearest = pool[0];
  return { previous: nearest, comparability: scanComparability(current, nearest) };
}

/**
 * The running count of comparable scans across an ordered (oldest-first)
 * chain that ends at its last entry, using the SAME skip-ahead resolver as
 * `resolveComparablePrevious` -- so this total and each scan's own resolved
 * comparability can never disagree. The first (baseline) scan is never
 * comparable by definition and contributes nothing.
 *
 * @param {Array<object>} orderedScans - oldest-first.
 * @param {{lookback?: number}} [opts]
 * @returns {number}
 */
export function comparableChainCount(orderedScans = [], opts = {}) {
  const scans = Array.isArray(orderedScans) ? orderedScans : [];
  let count = 0;
  for (let i = 1; i < scans.length; i += 1) {
    const priorNearestFirst = scans.slice(0, i).reverse();
    const { comparability } = resolveComparablePrevious(scans[i], priorNearestFirst, opts);
    if (comparability.comparable) count += 1;
  }
  return count;
}
