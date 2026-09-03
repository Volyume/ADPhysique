/**
 * Public surface of the payments module — and, since the fully-free
 * decision, the INACTIVE BOUNDARY for billing.
 *
 * Internal call sites should import from this index, not from the
 * individual files, so the implementation can move without breaking
 * callers. The Supabase Edge Function (play-billing-rtdn) lives in
 * supabase/functions/play-billing-rtdn/ and is NOT re-exported here
 * because it doesn't ship in the client bundle.
 *
 * FOUNDER DECISION 2026-09-03 (fully-free product, see src/lib/proGate.js).
 * Volyume has no trial, no Free/Pro split, no paywall and no expiry. The
 * store/billing infrastructure is RETAINED DORMANT, not deleted: every
 * module below still compiles, still ships, and is still unit-tested
 * directly by its own suite in `__tests__/`. What changes is that while
 * FULL_ACCESS_FOR_ALL is true, nothing reached through THIS barrel may
 * start a purchase, confirm one, reconcile an entitlement, start a trial
 * cascade or open a churn episode. Each such export resolves to
 * `{ ok: false, error: 'billing_disabled' }` without touching the network,
 * the store or the OS notification layer.
 *
 * Product IDs (pro_monthly / pro_annual) are untouched, and the catalogue
 * and the pure selectors stay readable so a future monetisation flip is a
 * matter of setting FULL_ACCESS_FOR_ALL to false, not a rebuild.
 */

import * as _cascadeImpl from './cascade';
import * as _playBillingImpl from './playBilling';
import { restorePurchases as _restorePurchasesImpl } from './restore';
import { handlePotentialLapse as _handlePotentialLapseImpl } from './lapseDetect';
import { FULL_ACCESS_FOR_ALL } from '../proGate';

export * as catalogue from './catalogue';

// The single soft-no-op answer. Frozen so no caller can mutate the shared
// object it gets back.
const BILLING_DISABLED = Object.freeze({ ok: false, error: 'billing_disabled' });

/**
 * Replace the named members of a module namespace with a soft no-op that
 * never runs the real implementation. `overrides` supplies the exact
 * resolved shape where a caller reads more than `ok` (reconcile is read by
 * lapseDetect, which asks for `checked`/`active`).
 */
function _disable(impl, names, overrides = {}) {
  const out = { ...impl };
  for (const name of names) {
    const answer = Object.freeze({ ...BILLING_DISABLED, ...(overrides[name] ?? {}) });
    out[name] = async () => answer;
  }
  return Object.freeze(out);
}

// Trial cascade + purchase confirmation. startCascade / payAt /
// confirmPurchase / reconcilePaidEntitlement are the four members that call
// Supabase or write tier state; the pure read helpers (stageOf,
// canStillTrial, trialEndsAtMs, trialEndsLabel, daysRemaining) pass through
// untouched so a dormant surface can still describe state without acting.
// reconcilePaidEntitlement resolves with `checked: false` so lapseDetect's
// isConfirmedActive / isAuthoritativeLapse both read it as "nothing was
// observed" rather than as a lapse.
export const cascade = FULL_ACCESS_FOR_ALL
  ? _disable(
      _cascadeImpl,
      ['startCascade', 'payAt', 'confirmPurchase', 'reconcilePaidEntitlement'],
      { reconcilePaidEntitlement: { checked: false } },
    )
  : _cascadeImpl;

// Store SDK. Everything that opens a billing connection, initiates a
// purchase or reads entitlements is disabled; the pure selectors
// (selectOfferToken, selectDisplayPrice, getDisplayPrice...) pass through.
export const playBilling = FULL_ACCESS_FOR_ALL
  ? _disable(_playBillingImpl, [
      'initialise',
      'ensureBillingForUser',
      'purchasePackage',
      'restorePurchases',
      'getCustomerInfo',
    ])
  : _playBillingImpl;

// Restore purchases. Callers read { ok, tier, alreadyCurrent }; a disabled
// restore is an `ok: false` with the boundary's reason, never a silent
// "nothing to restore" that would read as a failed entitlement lookup.
export const restorePurchases = FULL_ACCESS_FOR_ALL
  ? async () => BILLING_DISABLED
  : _restorePurchasesImpl;

// Post-churn win-back. There is no churn while the product is free, so the
// episode is never opened and no win-back push is ever laid from here.
export const handlePotentialLapse = FULL_ACCESS_FOR_ALL
  ? async () => BILLING_DISABLED
  : _handlePotentialLapseImpl;
