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
  return 'Pro is free during beta — your feedback shapes this.';
}
