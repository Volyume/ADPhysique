/**
 * proGate.js
 * Single source of truth for Pro entitlement.
 *
 * Beta phase: all users have full Pro access.
 * When paid tiers launch, replace isProUser() with a RevenueCat
 * entitlement check and store the result in userProfile.proEntitled.
 */

export const PRO_BETA_ACTIVE = true;
export const BETA_END_DATE = null; // set to a timestamp when beta closes

/**
 * Returns true if the user has Pro access.
 * During beta this is always true.
 * Post-beta: check userProfile.proEntitled or RevenueCat entitlement.
 */
export function isProUser(userProfile) {
  if (PRO_BETA_ACTIVE) return true;
  return userProfile?.proEntitled === true;
}

/**
 * Returns a short label for display in UI ("Beta" / "Pro" / "Free")
 */
export function getProLabel(userProfile) {
  if (PRO_BETA_ACTIVE) return 'Beta';
  if (isProUser(userProfile)) return 'Pro';
  return 'Free';
}

/**
 * Returns the banner text shown at the top of Pro screens during beta.
 */
export function getBetaBannerText() {
  if (!PRO_BETA_ACTIVE) return null;
  return 'Pro is free during beta. Your feedback shapes this.';
}

/**
 * Pro-only feature areas. Free tier is essentially a logger plus the
 * plan library and the manual (custom) builder. Everything coaching-
 * intelligent is Pro.
 *
 * Gating is based on the user's CHOSEN tier (store.tier === 'pro'),
 * NOT isProUser() — during beta Pro is free but a free user must still
 * sign up and go through the upgrade flow to switch.
 */
export const PRO_ROUTES = [
  'CoachBuilder',
  'WeeklyCheckIn',
  'NutritionTargets',
  'BodyMetrics',
  'MesocycleBuilder',
  'CoachOutput',
  'ProGoalSetup',
];

export function isProRoute(routeName) {
  return PRO_ROUTES.includes(routeName);
}
