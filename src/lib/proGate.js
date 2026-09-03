/**
 * proGate.js
 *
 * Single source of truth for tier entitlement.
 *
 * Gating is all-or-nothing (founder decision 2026-05-29): the app is
 * either Pro or Free, enforced by the ProGate component checking
 * store.tier === 'pro'. PRO_BETA_ACTIVE was the closed-test override that
 * forced every signed-in user to 'pro'; it is now false for the
 * production launch (2026-06-06), so tier comes from each user's real
 * trial / subscription state.
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

// FOUNDER DECISION 2026-09-03: Volyume is FULLY FREE. No trial, no
// Free/Pro split, no paywall, no expiry. Every signed-in user resolves to
// 'pro' (the full-access tier) and nothing in the runtime experience may
// suggest otherwise.
//
// The store/billing infrastructure (catalogue, playBilling, cascade,
// restore, lapseDetect, winbackState, the differential paywall detector)
// is RETAINED DORMANT behind an inactive boundary
// (src/lib/payments/index.js) so it stays compiled and unit-tested. It is
// not deleted, and the live product IDs pro_monthly / pro_annual are
// unchanged.
//
// Reintroducing monetisation is a deliberate act, not an accident: flip
// this constant to false AND re-register the dormant surfaces (the
// paywall / upgrade / subscription screens, the cascade scheduling calls
// and the cascade pg_cron job paused by supabase/migrate_157). Nothing
// below this line silently re-arms on its own.
export const FULL_ACCESS_FOR_ALL = true;

// Historic name for the same override. Kept exported as an ALIAS so every
// existing import site keeps compiling and keeps meaning "force 'pro'".
// It was the closed-test beta override (false at the 2026-06-06 production
// launch); it is now the fully-free override.
export const PRO_BETA_ACTIVE = FULL_ACCESS_FOR_ALL;

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
 * While FULL_ACCESS_FOR_ALL is true (the fully-free product, founder
 * decision 2026-09-03) every user gets 'pro'. With the override off it
 * reads userProfile.trialState (mirrors users_profile.trial_state via the
 * registry).
 */
export function isPaidTier(userProfile) {
  return _resolveTier(userProfile?.trialState, PRO_BETA_ACTIVE);
}
