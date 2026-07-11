/**
 * Differential paywall trigger detection (Move #4).
 *
 * Locked in MOVE_4_DIFFERENTIAL_PAYWALL.md (amended 2026-07-11, C1,
 * founder ruling): the message BODY carries no trial duration - the two
 * files stating different numbers (7 here, 14 on the badge CTA) shipped
 * as a visible contradiction. The CTA rendered by DifferentialBadge.js
 * is the single source of truth for the offer (14-day cardless trial
 * while eligible; live store price once spent).
 *
 * Trigger conditions (ALL must hold):
 *   1. user is on the 'free' tier
 *   2. weekly check-in adherence is 'under' or 'over' in 2 of the last
 *      3 check-ins (a single off-week does NOT fire)
 *   3. exactly one of four locked contexts matches
 *
 * The trigger does NOT fire for paid users, ever. Per the locked
 * tier scope, paid tiers carry the `differential_paywall_disabled`
 * feature flag.
 *
 * Safety note (audit 2026-05-31, founder decision): the two
 * safety-adjacent distress contexts (`extreme_soreness`,
 * `energy_crash`) were REMOVED as conversion triggers. Surfacing a
 * paywall because a user's soreness or energy is crashing reads as
 * monetising distress and works against the tier-blind safety system.
 * The detector still accepts `energyScore`/`sorenessScore` (callers
 * pass them), but they no longer fire a paywall. The actual recovery
 * guardrails remain free and unaffected.
 *
 * Copy variants are verbatim from MOVE_4_DIFFERENTIAL_PAYWALL.md.
 * Each under 25 words; no jargon-blocklist terms.
 *
 * CTA selection:
 *   - User still has trial entitlement -> 'try_pro_14d'
 *   - User has already used trial      -> 'buy_pro' (price reads from
 *                                         catalogue at render time)
 */

// ────────────────────────────────────────────────────────────────────
// Locked verbatim copy. Editing requires updating the snapshot test.
// ────────────────────────────────────────────────────────────────────

// C1 (founder ruling 2026-07-11): no trial duration in the body. This
// module and DifferentialBadge.js each carried an opposite-number
// rationale (7 vs 14) and both rendered together on screen. The body now
// states only the insight; the badge CTA states the offer and is the
// single source of truth, so the two can never drift again. These
// variants are deliberately identical to LOCKED_COPY_NO_TRIAL below.
export const LOCKED_COPY = Object.freeze({
  stalled_lift: "Your bench hasn't moved in three weeks. Lifting data alone can't show if the cause is training or fuel.",
  deload: "Precision Coaching is holding a lighter week. Your food log could show whether fuel is the cause.",
  missing_tdee: "Your weight is moving faster than your logged calories explain. Pro tracks the calories your body actually uses.",
  block_summary: "Your training block just ended. With your food log, Precision Coaching could show how fuel shaped your results.",
});

// Alternate copy for users who've already used their cascade trial.
// Same six contexts but the closer pivots to a direct purchase CTA
// per MOVE_4 doc lines 88-90 ("We don't lie about a trial they've
// used"). The price string is rendered at the UI layer from Google
// Play's localised price (usePlayPrices); until it loads the CTA shows
// a price-free "Get Pro" rather than a hardcoded figure (PLAY-002).
export const LOCKED_COPY_NO_TRIAL = Object.freeze({
  stalled_lift: "Your bench hasn't moved in three weeks. Lifting data alone can't show if the cause is training or fuel.",
  deload: "Precision Coaching is holding a lighter week. Your food log could show whether fuel is the cause.",
  missing_tdee: "Your weight is moving faster than your logged calories explain. Pro tracks the calories your body actually uses.",
  block_summary: "Your training block just ended. With your food log, Precision Coaching could show how fuel shaped your results.",
});

// Safety-adjacent distress contexts (extreme_soreness, energy_crash) were
// removed here (audit 2026-05-31). The remaining contexts are training and
// engine signals, never a user's distress.
export const TRIGGER_CONTEXTS = Object.freeze([
  'deload',            // this week's decision → highest priority
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
