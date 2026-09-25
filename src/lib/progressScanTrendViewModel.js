// progressScanTrendViewModel.js — progress-photos wave 3 (results-ui-and-
// copy-blueprint.md §4; scoring-accuracy-and-validation-blueprint.md §7/§8).
//
// Pure view-model for the score-over-time trend view: which scans are
// comparable (existing scanComparability gate, read-only), the language
// ladder (starting point / early read / trend), and the empty state. No
// chart maths, no smoothing, no projection: this only orders scans and
// classifies each one against its immediately preceding scan, exactly the
// pairwise pattern the engine itself already uses.
import { orderedScanEntries } from './progressScanCompareViewModel';
import { resolveComparablePrevious, comparableChainCount } from './progressScanChain';
import { progressScanAssessmentForDisplay, progressScanScoreForDisplay, formatVolyumeScore } from './progressScanDisplay';
import { resolveConfidenceTier, confidenceChipLabel } from './progressScanResultsContract';

export const TREND_EMPTY_STATE_TEXT = 'Trends appear after three comparable photo sets.';

// Confidence is encoded by SHAPE, never colour alone (results blueprint §4/§8).
// 'solid' = High/Moderate scored point, 'hollow' = Low-confidence scored
// point, 'unscored' = no score at all (withheld/not-enough).
function markerShapeForTier(tier) {
  if (tier === 'high' || tier === 'moderate') return 'solid';
  if (tier === 'low') return 'hollow';
  return 'unscored';
}

// One display value per point, respecting the tier contract: a Low-tier
// point never shows its number here (the trend view has no per-point
// "show anyway" affordance; the timeline score row is where that lives), a
// not-enough/withheld point shows no score at all.
function pointValueText(score, tier) {
  if (score == null) return null;
  if (tier === 'high' || tier === 'moderate') return formatVolyumeScore(score);
  return null;
}

// Builds the ordered point list plus the count of scans that landed a
// successful comparison. S7-2(b): resolves each point's predecessor with
// the SAME skip-ahead policy finishProgressScanSession uses at save time
// (progressScanChain.resolveComparablePrevious) -- skipping up to ten
// earlier, incomparable scans so a single poor scan cannot sever the
// chain -- rather than the literal immediately-preceding scan, so the
// Trend view's per-point verdict and the stored status agree for the same
// scan. `comparableCount` is the shared running count
// (progressScanChain.comparableChainCount), computed with the identical
// resolver so it can never disagree with the per-point `comparable` flags
// above.
export function buildTrendPoints(scans = []) {
  const ordered = orderedScanEntries(scans);

  const points = ordered.map((scan, index) => {
    const assessment = progressScanAssessmentForDisplay(scan);
    const score = progressScanScoreForDisplay(scan);
    const tier = score != null ? resolveConfidenceTier(scan) : 'not_enough';
    const isBaseline = index === 0;
    // Nearest-first candidates: every earlier scan in the ordered chain,
    // most recent first (the same order finishProgressScanSession's own
    // candidate list already holds).
    const priorCandidates = ordered.slice(0, index).reverse();
    const comparability = isBaseline
      ? { comparable: false, status: 'baseline', reason: 'This is the first scan in the comparison set.' }
      : resolveComparablePrevious(scan, priorCandidates).comparability;

    return {
      scanId: scan.id,
      capturedAt: scan.capturedAt,
      score,
      scoreText: pointValueText(score, tier),
      tier,
      chipLabel: confidenceChipLabel(tier),
      shape: markerShapeForTier(score != null ? tier : 'not_enough'),
      comparable: !!comparability.comparable,
      isBaseline,
      gapReason: !isBaseline && !comparability.comparable ? comparability.reason : null,
      progressSignalLabel: assessment?.progressSignalLabel ?? null,
    };
  });

  return { points, comparableCount: comparableChainCount(ordered), totalCount: points.length };
}

// Language ladder (results-ui-and-copy-blueprint.md §4, fixed wording): the
// count of comparable scans, not scan-taking itself, is what strengthens the
// language, and it never becomes a streak/achievement framing.
export function trendLadderLabel(comparableCount, totalCount) {
  if (!totalCount) return null;
  const chainLength = 1 + Math.max(0, comparableCount); // the baseline point plus each comparable one
  if (chainLength >= 3) return 'A trend';
  if (chainLength === 2) return 'An early read';
  return 'Your starting point';
}
