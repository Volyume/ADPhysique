/**
 * Differential paywall trigger detection (Move #4).
 *
 * Locked in MOVE_4_DIFFERENTIAL_PAYWALL.md. The conversion lever for
 * free users: when their weekly coach output references a context
 * where food data would change the conclusion, surface a one-tap
 * "Try Pro free for 14 days" badge with the locked copy.
 *
 * Trigger conditions (ALL must hold):
 *   1. user is on the 'free' tier
 *   2. weekly check-in adherence is 'under' or 'over' in 2 of the last
 *      3 check-ins (a single off-week does NOT fire)
 *   3. exactly one of six locked contexts matches
 *
 * The trigger does NOT fire for paid users, ever. Per the locked
 * tier scope, paid tiers carry the `differential_paywall_disabled`
 * feature flag.
 *
 * Copy variants are verbatim from MOVE_4_DIFFERENTIAL_PAYWALL.md
 * lines 62-86. Each under 25 words; no jargon-blocklist terms.
 *
 * CTA selection:
 *   - User still has trial entitlement -> 'try_pro_14d'
 *   - User has already used trial      -> 'buy_pro' (price reads from
 *                                         catalogue at render time)
 */

// ────────────────────────────────────────────────────────────────────
// Locked verbatim copy. Editing requires updating the snapshot test.
// ────────────────────────────────────────────────────────────────────

export const LOCKED_COPY = Object.freeze({
  stalled_lift: "Your bench has stalled for three weeks. With food data, we could tell you if it's training or fuel. Try Pro free for 14 days.",
  extreme_soreness: "Your soreness scores are stacking up. Food intake usually explains half of recovery. See yours with Pro, free for 14 days.",
  deload: "We're holding a deload this week. With food data, we'd know if your fuel is the cause. Pro shows you, free for 14 days.",
  missing_tdee: "Your weight is moving faster than your calories suggest. Pro tracks your true daily burn from your own data. 14 days free.",
  block_summary: "Your training block ended. With food data, we'd show how fuel shaped your results. Try Pro free for 14 days.",
  energy_crash: "Your energy scores have dropped two weeks running. Food data usually shows why. Pro can tell you. 14 days free.",
});

// Alternate copy for users who've already used their cascade trial.
// Same six contexts but the closer pivots to a direct purchase CTA
// per MOVE_4 doc lines 88-90 ("We don't lie about a trial they've
// used"). The price string is rendered at the UI layer using
// catalogue.priceTextFor() so it stays in sync with the SKU the
// purchase will actually charge.
export const LOCKED_COPY_NO_TRIAL = Object.freeze({
  stalled_lift: "Your bench has stalled for three weeks. With food data, we could tell you if it's training or fuel.",
  extreme_soreness: "Your soreness scores are stacking up. Food intake usually explains half of recovery. See yours with Pro.",
  deload: "We're holding a deload this week. With food data, we'd know if your fuel is the cause.",
  missing_tdee: "Your weight is moving faster than your calories suggest. Pro tracks your true daily burn.",
  block_summary: "Your training block ended. With food data, we'd show how fuel shaped your results.",
  energy_crash: "Your energy scores have dropped two weeks running. Food data usually shows why.",
});

export const TRIGGER_CONTEXTS = Object.freeze([
  'extreme_soreness',  // safety-adjacent → highest priority
  'energy_crash',      // safety-adjacent
  'deload',            // this week's decision
  'stalled_lift',      // multi-week training signal
  'missing_tdee',      // engine confidence signal
  'block_summary',     // end-of-block recap → lowest priority
]);

// ────────────────────────────────────────────────────────────────────
// Pure detector
// ────────────────────────────────────────────────────────────────────

/**
 * Detect which (if any) differential trigger fires this week.
 *
 * @param {object} args
 * @param {'free'|'pro'|'complete'} args.userTier
 * @param {boolean} args.hasUsedTrial           true once cascade has started
 * @param {'under'|'hit'|'over'|'untracked'|null} args.calsAdherence  current week
 * @param {Array<{adherence?: string, energy?: number, soreness?: number}>} args.recentWeeklyHistory
 *   Most-recent first. Used to evaluate the 2-of-3 adherence gate
 *   and the multi-week signal contexts (energy_crash, extreme_soreness).
 * @param {number|null} args.energyScore        current week
 * @param {number|null} args.sorenessScore      current week
 * @param {boolean} args.deloadSuggested        this week's engine flag
 * @param {boolean} args.blockEnded             true at end-of-mesocycle boundary
 * @param {number|null} args.weeksLiftStalled   distinct from PRs; null if unknown
 * @param {boolean} args.missingTdeeSignal      true when reported adherence and
 *                                              actual weight movement disagree
 *
 * @returns {{ shown: boolean, trigger?: string, with_food_data_message?: string, paywall_cta?: string }}
 */
export function detectDifferentialTrigger({
  userTier,
  hasUsedTrial = false,
  calsAdherence = null,
  recentWeeklyHistory = null,
  energyScore = null,
  sorenessScore = null,
  deloadSuggested = false,
  blockEnded = false,
  weeksLiftStalled = null,
  missingTdeeSignal = false,
}) {
  // Tier gate: paid users NEVER see the differential paywall.
  if (userTier !== 'free') return { shown: false };

  // Adherence gate: 'under' or 'over' in 2 of the last 3 weeks.
  // Current week + last 2 from history. Tolerates missing history
  // (a brand-new user has none yet → fails the gate, no fire).
  const adherenceSeries = [
    calsAdherence,
    ...(Array.isArray(recentWeeklyHistory)
      ? recentWeeklyHistory.slice(0, 2).map(w => w?.adherence ?? null)
      : []),
  ].filter(a => a === 'under' || a === 'over' || a === 'hit' || a === 'untracked');

  if (adherenceSeries.length < 3) return { shown: false };

  const offTargetCount = adherenceSeries.filter(a => a === 'under' || a === 'over').length;
  if (offTargetCount < 2) return { shown: false };

  // Detect which context fires (priority order).
  const trigger = _firstMatchingContext({
    energyScore,
    sorenessScore,
    recentWeeklyHistory,
    deloadSuggested,
    blockEnded,
    weeksLiftStalled,
    missingTdeeSignal,
  });

  if (!trigger) return { shown: false };

  const copy = hasUsedTrial ? LOCKED_COPY_NO_TRIAL : LOCKED_COPY;
  return {
    shown: true,
    trigger,
    with_food_data_message: copy[trigger],
    paywall_cta: hasUsedTrial ? 'buy_pro' : 'try_pro_14d',
  };
}

function _firstMatchingContext(signals) {
  // Iterate in locked priority order; return the first match.
  for (const ctx of TRIGGER_CONTEXTS) {
    if (_contextFires(ctx, signals)) return ctx;
  }
  return null;
}

function _contextFires(context, s) {
  switch (context) {
    case 'extreme_soreness': {
      // Current week soreness ≥4 OR 2-of-3 weeks with soreness ≥4.
      if (s.sorenessScore != null && s.sorenessScore >= 4) return true;
      const recent = Array.isArray(s.recentWeeklyHistory) ? s.recentWeeklyHistory.slice(0, 3) : [];
      const highCount = recent.filter(w => (w?.soreness ?? 0) >= 4).length;
      return highCount >= 2;
    }
    case 'energy_crash': {
      // Current week energy ≤2 AND at least one prior of the two
      // most recent also ≤2. (Per locked copy "two weeks running".)
      if (s.energyScore != null && s.energyScore <= 2) {
        const prior = Array.isArray(s.recentWeeklyHistory) ? s.recentWeeklyHistory.slice(0, 2) : [];
        return prior.some(w => (w?.energy ?? 99) <= 2);
      }
      return false;
    }
    case 'deload':
      return !!s.deloadSuggested;
    case 'stalled_lift':
      // Caller passes the plateau count from the insightsEngine
      // output (null until that data flows in). 3+ weeks plateaued
      // matches the locked copy "stalled for three weeks".
      return typeof s.weeksLiftStalled === 'number' && s.weeksLiftStalled >= 3;
    case 'missing_tdee':
      return !!s.missingTdeeSignal;
    case 'block_summary':
      return !!s.blockEnded;
    default:
      return false;
  }
}
