/**
 * proGate.js
 *
 * Single source of truth for tier entitlement.
 *
 * Gating is all-or-nothing (founder decision 2026-05-29): the app is
 * either Pro or Free, enforced by the ProGate component checking
 * store.tier === 'pro'. During the closed-testing beta
 * (PRO_BETA_ACTIVE) every signed-in user resolves to 'pro' so the full
 * feature set is exercised before payments wire up.
 *
 * History: a granular per-feature/per-route entitlement layer
 * (FEATURE_MAP, hasFeature, hasGoalUnlock, PRO_ROUTES, isProRoute,
 * isProUser, getProLabel) was built and tested per the earlier
 * COMPLETE_TIER_SCOPE_LOCKED 3-tier design but never wired into a
 * single screen; the app always gated on tier alone. It was removed
 * 2026-05-29 once the founder confirmed Pro is binary. If granular
 * gating is ever wanted, it comes back as a fresh build against the
 * then-current tier scope.
 *
 * Safety logic stays tier-blind: engine guardrails (FFM floor,
 * ED-pattern lockout, rapid-loss compression) MUST NOT consult tier.
 */

export const PRO_BETA_ACTIVE = true;

/**
 * Pure tier resolver. Exported as `_resolveTier` so tests can drive the
 * post-beta branches without globally mocking PRO_BETA_ACTIVE.
 *
 * 2-tier model. Legacy complete_trial_active / paid_complete states map
 * to 'pro' because anyone on a Complete trial has exactly the same
 * entitlement as paid_pro; the schema retains those values for
 * compatibility with already-applied migration 030.
 */
export function _resolveTier(trialState, betaActive) {
  if (betaActive) return 'pro';
  switch (trialState) {
    case 'paid_pro':
    case 'pro_trial_active':
    case 'paid_complete':         // legacy → mapped to pro
    case 'complete_trial_active': // legacy → mapped to pro
      return 'pro';
    case 'free':
    case 'cascade_expired':
    case 'unstarted':
    default:
      return 'free';
  }
}

/**
 * Resolve the user's current effective tier: 'free' | 'pro'.
 *
 * During the beta every signed-in user gets 'pro'. Post-beta, reads
 * userProfile.trialState (mirrors users_profile.trial_state via the
 * registry).
 */
export function isPaidTier(userProfile) {
  return _resolveTier(userProfile?.trialState, PRO_BETA_ACTIVE);
}
