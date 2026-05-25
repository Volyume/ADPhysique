/**
 * proGate.js
 *
 * Single source of truth for tier entitlement.
 *
 * Beta phase (PRO_BETA_ACTIVE = true): all users get Complete-tier access.
 * Post-beta: reads userProfile.trialState (synced from
 * users_profile.trial_state via the registry).
 *
 * The three new helpers are locked in COMPLETE_TIER_SCOPE_LOCKED.md
 * lines 119-128:
 *   - isPaidTier(user)       → 'free' | 'pro' | 'complete'
 *   - hasFeature(user, feat) → boolean (per-tier FEATURE_MAP)
 *   - hasGoalUnlock(user, f) → boolean (goal-based, tier-independent)
 *
 * Per the same doc principle (line 8): safety logic is tier-blind.
 * Engine guardrails (FFM floor, ED-pattern lockout, rapid-loss
 * compression) MUST NOT consult these helpers. The engine consults
 * them only when deciding which output surfaces to populate.
 */

export const PRO_BETA_ACTIVE = true;
export const BETA_END_DATE = null;

// ────────────────────────────────────────────────────────────────────
// Feature flag map (locked in MOVE_5_TIER_INFRASTRUCTURE.md lines 40-76)
// Each tier inherits everything from the tier below.
// ────────────────────────────────────────────────────────────────────

const FREE_FEATURES = Object.freeze([
  'engine_safety_guardrails',
  'food_logging_basic',
  'weight_logging',
  'weekly_checkin_basic',
  'history_30_days',
  'csv_export',
]);

const PRO_FEATURES = Object.freeze([
  ...FREE_FEATURES,
  'food_logging_full',
  'adaptive_engine',
  'macro_rings',
  'history_90_days',
  'differential_paywall_disabled',
  'refeed_aggressive_cut_or_contest_prep',
]);

const COMPLETE_FEATURES = Object.freeze([
  ...PRO_FEATURES,
  'history_unlimited',
  'peak_week_module',
  'block_planning_extended',
  'photo_progress_local',
  'body_composition_summary',
  'coach_link_eligible',
  'share_pack_csv',
  'priority_support',
  // The four below are spec'd at Complete tier but deferred to v1.1
  // per BUDGET_POSTURE_LOCKED.md. They appear in the flag map so the
  // gating call sites can land now; the UI for each is implemented
  // when the feature ships.
  'refeed_automated_any_cut',
  'body_composition_deep',
  'share_pack_pdf',
]);

export const FEATURE_MAP = Object.freeze({
  free: FREE_FEATURES,
  pro: PRO_FEATURES,
  complete: COMPLETE_FEATURES,
});

// Goal-based unlocks per COMPLETE_TIER_SCOPE_LOCKED.md lines 33-44.
// Some features unlock on goal selection regardless of tier; a Pro
// user with the right goal gets the same access as a Complete user
// with the same goal.
const GOAL_UNLOCK_MAP = Object.freeze({
  advanced_protein_tier: ['physique_competition', 'advanced_recomp'],
  refeed_prescription: ['aggressive_cut', 'physique_competition'],
});

// ────────────────────────────────────────────────────────────────────
// Tier resolution
// ────────────────────────────────────────────────────────────────────

/**
 * Pure tier resolver. Exported as `_resolveTier` so tests can drive
 * the post-beta branches without globally mocking PRO_BETA_ACTIVE.
 */
export function _resolveTier(trialState, betaActive) {
  if (betaActive) return 'complete';
  switch (trialState) {
    case 'paid_complete':
    case 'complete_trial_active':
      return 'complete';
    case 'paid_pro':
    case 'pro_trial_active':
      return 'pro';
    case 'free':
    case 'cascade_expired':
    case 'unstarted':
    default:
      return 'free';
  }
}

/**
 * Resolve the user's current effective tier.
 *
 * Returns 'free' | 'pro' | 'complete'.
 *
 * During the closed-testing beta (PRO_BETA_ACTIVE) every signed-in
 * user gets 'complete' so the feature set is exercised end-to-end
 * before payments wire up. Post-beta, reads from userProfile.trialState
 * which mirrors users_profile.trial_state (kept in sync via the
 * registry).
 */
export function isPaidTier(userProfile) {
  return _resolveTier(userProfile?.trialState, PRO_BETA_ACTIVE);
}

/**
 * Return true if the user's current tier includes `feature`.
 * Feature names are locked in FEATURE_MAP above; unknown feature
 * names return false.
 */
export function hasFeature(userProfile, feature) {
  if (typeof feature !== 'string' || !feature) return false;
  const tier = isPaidTier(userProfile);
  const list = FEATURE_MAP[tier];
  return !!list && list.includes(feature);
}

/**
 * Return true if the user's current goal unlocks `feature`,
 * independent of tier. The goal-unlock layer sits alongside (not
 * inside) the tier check; a Pro user with the right goal gets the
 * same access as a Complete user with the same goal.
 */
export function hasGoalUnlock(userProfile, feature) {
  const allowed = GOAL_UNLOCK_MAP[feature];
  if (!allowed || !Array.isArray(allowed)) return false;
  const goal = userProfile?.trainingGoal ?? userProfile?.goalPhase ?? null;
  return typeof goal === 'string' && allowed.includes(goal);
}

// ────────────────────────────────────────────────────────────────────
// Legacy back-compat (existing callers across the codebase)
// ────────────────────────────────────────────────────────────────────

export function isProUser(userProfile) {
  if (PRO_BETA_ACTIVE) return true;
  return userProfile?.proEntitled === true;
}

export function getProLabel(userProfile) {
  if (isProUser(userProfile)) return 'Pro';
  return 'Free';
}

/**
 * Pro-only screen names. Gating is based on the user's CHOSEN tier
 * (store.tier === 'pro'), NOT isProUser() — during beta Pro is free
 * but a free user must still sign up and go through the upgrade flow
 * to switch.
 */
export const PRO_ROUTES = [
  'WeeklyCheckIn',
  'NutritionTargets',
  'BodyMetrics',
  'CoachOutput',
  'ProGoalSetup',
  'CoachingReminders',
];

export function isProRoute(routeName) {
  return PRO_ROUTES.includes(routeName);
}
