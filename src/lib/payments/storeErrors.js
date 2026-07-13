/**
 * Pure classification of store-side "cannot sell right now" errors, shared
 * by the paywall catch blocks (ProUpgradeScreen, CascadeGateScreen).
 *
 * These messages are produced by the STORE layer, not our code: Google
 * Play's billing client emits them whenever the install cannot be licensed
 * (a sideloaded CI build -- the founder's Android test loop -- always gets
 * one on any product query: "SKU not found" / ITEM_UNAVAILABLE /
 * BILLING_UNAVAILABLE), and both stores emit them during transient
 * catalogue outages. Nothing in our code can act on them; the user retries
 * or installs from the store. So the paywall logs them as a breadcrumb-
 * level info line (visible in the local debug log and attached to any
 * later real error) instead of a Sentry error event -- a sideloaded test
 * pass must not repaint Sentry red with Google's own refusal to license
 * the install (founder clean-slate mandate, 2026-07-13).
 *
 * Deliberately NOT matched: payment declines, developer errors, timeouts,
 * "already owned" states -- those are actionable and stay loud as
 * logError. Classification only; no purchase/restore/entitlement flow is
 * touched.
 */
const STORE_UNAVAILABLE = new RegExp(
  [
    'sku not found',
    'item.{0,12}unavailable',
    'billing.{0,12}unavailable',
    'service.{0,12}unavailable',
    'no play offer',
    'product not found',
    'not found.{0,12}sku',
  ].join('|'),
  'i',
);

export function isStoreUnavailableError(e) {
  const msg = String(e?.message ?? e ?? '');
  return STORE_UNAVAILABLE.test(msg);
}
