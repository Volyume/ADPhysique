/**
 * Restore purchases flow.
 *
 * Locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 328-333.
 * You → Subscription → Restore calls `Purchases.restorePurchases()`.
 * Google Play Billing returns the user's active subscriptions via
 * getPurchaseHistory; we sync trial_state accordingly.
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

  // Skip the unlock if local state already matches.
  if (currentTrialState === `paid_${restoredTier}`) {
    return { ok: true, tier: restoredTier, alreadyCurrent: true };
  }

  // C-1: restore is server-authoritative like a purchase. The active
  // entitlement Play reports was originally written to the server by its
  // purchase RTDN, so payAt unlocks Pro optimistically and the next
  // refreshTierFromCloud reconciles to the server tier. The client does not
  // write its own paid tier (migration 067).
  const ref = info?.latestTransactionId ?? null;
  const result = await payAt(restoredTier, ref ?? 'restore', 'restore_purchases');
  // M-3 / SUB-003: server-verify the restored subscription so the authoritative
  // tier is (re)written server-side, not just optimistically unlocked. Without
  // this a device whose server tier is stale would revert to free after the
  // optimistic window. AWAITED (not fire-and-forget) so the server write is
  // attempted to completion before the restore reports success, matching the
  // purchase paths. A failed confirm does NOT fail the restore: Play already
  // reported the entitlement and payAt unlocked optimistically, and the next
  // refreshTierFromCloud reconciles. The outcome is returned as serverConfirmed
  // so callers can tell a server-confirmed restore from an optimistic one.
  let serverConfirmed = false;
  if (info?.latestPurchaseToken && info?.activeSku) {
    const confirm = await confirmPurchase({
      purchaseToken: info.latestPurchaseToken, subscriptionId: info.activeSku,
    });
    serverConfirmed = !!confirm.ok;
    if (!confirm.ok) {
      logWarn('payments.restore.confirm', confirm.error ?? 'unknown', {});
    }
  }
  return {
    ok: result.ok,
    tier: restoredTier,
    alreadyCurrent: false,
    serverConfirmed,
    error: result.ok ? undefined : result.error,
  };
}
