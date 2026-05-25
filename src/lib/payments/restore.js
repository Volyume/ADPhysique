/**
 * Restore purchases flow.
 *
 * Locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 328-333.
 * You → Subscription → Restore calls `Purchases.restorePurchases()`.
 * RevenueCat returns the user's entitlements; we sync trial_state
 * accordingly.
 *
 * Restore is idempotent and never charges the user. It just makes
 * the device aware of an existing subscription the user already
 * pays for (e.g. fresh install, switched device).
 */

import { logInfo, logWarn } from '../errorLog';
import * as revenuecat from './revenuecat';
import { payAt } from './cascade';

/**
 * Returns:
 *   { ok: true, tier: 'pro' | 'complete' | null, alreadyCurrent: bool }
 *   { ok: false, error: string }
 *
 * tier: the entitled tier RevenueCat reports, or null if nothing to
 *   restore. alreadyCurrent: true when the local trial_state already
 *   matches; no upgrade_tier call was needed.
 */
export async function restorePurchases({ currentTrialState = null } = {}) {
  let info;
  try {
    info = await revenuecat.restorePurchases();
  } catch (e) {
    logWarn('payments.restore.revenuecat', e?.message ?? 'unknown', {});
    return { ok: false, error: 'revenuecat_failed' };
  }

  const entitlements = Array.isArray(info?.activeEntitlements)
    ? info.activeEntitlements
    : [];
  let restoredTier = null;
  if (entitlements.includes('complete')) restoredTier = 'complete';
  else if (entitlements.includes('pro')) restoredTier = 'pro';

  if (!restoredTier) {
    logInfo('payments.restore.nothingToRestore',
      'no active entitlement reported by RevenueCat');
    return { ok: true, tier: null, alreadyCurrent: false };
  }

  // Skip the round-trip if local state already matches.
  if (currentTrialState === `paid_${restoredTier}`) {
    return { ok: true, tier: restoredTier, alreadyCurrent: true };
  }

  // Sync server-side. Use 'admin' reason — restore is not a fresh
  // purchase, it's a tier-state reconciliation against an existing
  // entitlement. payment_ref carries the latest RevenueCat transaction
  // ID so the audit row points at the right transaction.
  const ref = info?.latestTransactionId ?? null;
  const result = await payAt(restoredTier, ref ?? 'restore', 'restore_purchases');
  return {
    ok: result.ok,
    tier: restoredTier,
    alreadyCurrent: false,
    error: result.ok ? undefined : result.error,
  };
}
