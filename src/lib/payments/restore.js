/**
 * Restore purchases flow.
 *
 * Locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 328-333.
 * You → Subscription → Restore calls `Purchases.restorePurchases()`.
 * The active store provider returns the user's active subscriptions; we sync
 * trial_state accordingly.
 *
 * Restore is idempotent and never charges the user. It just makes
 * the device aware of an existing subscription the user already
 * pays for (e.g. fresh install, switched device).
 */

import { logInfo, logWarn } from '../errorLog';
import * as playBilling from './playBilling';
import { payAt, confirmPurchase } from './cascade';

/**
 * Returns:
 *   { ok: true, tier: 'pro' | null, alreadyCurrent: bool }
 *   { ok: false, error: string }
 *
 * tier: 'pro' if Play Billing reports an active Pro entitlement, else null
 *   (nothing to restore). alreadyCurrent: true when the local trial_state
 *   already matches, so no unlock was needed.
 *
 * 2-tier model: the only purchaseable entitlement is 'pro' (M-2: the legacy
 * 'complete' branch was removed; there is no Complete SKU).
 */
export async function restorePurchases({ currentTrialState = null } = {}) {
  let info;
  try {
    info = await playBilling.restorePurchases();
  } catch (e) {
    logWarn('payments.restore.playBilling', e?.message ?? 'unknown', {});
    return { ok: false, error: 'play_billing_failed' };
  }

  const entitlements = Array.isArray(info?.activeEntitlements)
    ? info.activeEntitlements
    : [];
  const restoredTier = entitlements.includes('pro') ? 'pro' : null;

  if (!restoredTier) {
    logInfo('payments.restore.nothingToRestore',
      'no active entitlement reported by Play Billing');
    return { ok: true, tier: null, alreadyCurrent: false };
  }

  // A restore is different from a purchase initiated for the current app
  // account: the device store can expose a subscription bought for another
  // Supabase identity. Require the buyer-bound server verifier before granting
  // or reporting success. In particular, never let payAt's optimistic local
  // unlock run for caller A when the authoritative store buyer is B.
  if (!info?.latestPurchaseToken || !info?.activeSku) {
    logWarn('payments.restore.confirm', 'missing_purchase_token', {});
    return { ok: false, error: 'missing_purchase_token' };
  }
  const confirm = await confirmPurchase({
    purchaseToken: info.latestPurchaseToken, subscriptionId: info.activeSku,
  });
  if (!confirm.ok) {
    logWarn('payments.restore.confirm', confirm.error ?? 'unknown', {});
    return { ok: false, error: confirm.error ?? 'verification_failed' };
  }

  // The server has now re-fetched the store transaction, checked caller=buyer,
  // and written/refreshed the authoritative tier. If local state already
  // matches there is nothing left to unlock.
  if (currentTrialState === `paid_${restoredTier}`) {
    return {
      ok: true, tier: restoredTier, alreadyCurrent: true, serverConfirmed: true,
    };
  }

  const ref = info?.latestTransactionId ?? null;
  const result = await payAt(restoredTier, ref ?? 'restore', 'restore_purchases');
  return {
    ok: result.ok,
    tier: restoredTier,
    alreadyCurrent: false,
    serverConfirmed: true,
    error: result.ok ? undefined : result.error,
  };
}
