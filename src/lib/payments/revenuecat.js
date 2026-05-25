/**
 * RevenueCat provider wrapper.
 *
 * Locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md line 49: RevenueCat on
 * top of Apple StoreKit 2 + Google Play Billing.
 *
 * At Phase A (current) the real RevenueCat SDK is not yet wired:
 *   * No Apple Developer account → no iOS app entity
 *   * No SDK key issued yet
 *   * No SKUs created in Play Console yet
 *
 * This module exposes the API surface the cascade module and UI
 * will call against, with a default "stub provider" that returns
 * safe no-op results. At Phase A exit we swap in the real provider
 * (`react-native-purchases`) by calling `injectProvider()` once at
 * app boot. Tests inject their own mock.
 *
 * Provider contract:
 *   {
 *     initialise({ apiKey, appUserID }) -> Promise<void>
 *     getCustomerInfo()                 -> Promise<CustomerInfo>
 *     purchasePackage(skuId)            -> Promise<{ transactionId, sku, customerInfo }>
 *     restorePurchases()                -> Promise<CustomerInfo>
 *     logOut()                          -> Promise<void>
 *   }
 *
 * CustomerInfo shape we care about:
 *   {
 *     activeEntitlements: ['pro' | 'complete' | ...],
 *     latestTransactionId: string | null,
 *     activeSku: string | null,
 *   }
 */

import { logInfo, logWarn } from '../errorLog';

let _provider = null;
let _initialised = false;
let _currentAppUserID = null;

const STUB_CUSTOMER_INFO = Object.freeze({
  activeEntitlements: [],
  latestTransactionId: null,
  activeSku: null,
});

const _stubProvider = Object.freeze({
  async initialise() { /* no-op */ },
  async getCustomerInfo() { return { ...STUB_CUSTOMER_INFO }; },
  async purchasePackage() {
    throw new Error('RevenueCat provider not injected (Phase A stub)');
  },
  async restorePurchases() { return { ...STUB_CUSTOMER_INFO }; },
  async logOut() { /* no-op */ },
});

/**
 * Replace the active provider. Called once at app boot in production
 * with the real `react-native-purchases` adapter; called by tests
 * with a mock.
 */
export function injectProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('injectProvider expects a provider object');
  }
  _provider = provider;
  _initialised = false;
  _currentAppUserID = null;
  logInfo('payments.revenuecat.providerInjected', 'real provider installed');
}

export function _resetForTests() {
  _provider = null;
  _initialised = false;
  _currentAppUserID = null;
}

function _active() {
  return _provider ?? _stubProvider;
}

export function isReal() {
  return _provider !== null;
}

export function isInitialised() {
  return _initialised;
}

export function currentAppUserID() {
  return _currentAppUserID;
}

/**
 * Initialise the SDK with the user's Volyume auth.uid() as the
 * RevenueCat appUserID. Locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md
 * lines 211-212: appUserID is our Supabase auth.uid().
 *
 * Safe to call repeatedly; re-init with the same appUserID is a
 * no-op. Switching users requires logOut() first.
 */
export async function initialise({ apiKey, appUserID }) {
  if (!appUserID) {
    logWarn('payments.revenuecat.init', 'missing appUserID; skipping');
    return false;
  }
  if (_initialised && _currentAppUserID === appUserID) return true;
  try {
    await _active().initialise({ apiKey, appUserID });
    _initialised = true;
    _currentAppUserID = appUserID;
    return true;
  } catch (e) {
    logWarn('payments.revenuecat.init.failed', e?.message ?? 'unknown', {});
    return false;
  }
}

export async function getCustomerInfo() {
  return _active().getCustomerInfo();
}

/**
 * Initiate a purchase. The cascade module wraps this with the
 * Volyume-side tier_history write via the upgrade_tier RPC after
 * the platform confirms the purchase. RevenueCat's webhook is the
 * authoritative source-of-truth side; this client-side call gives
 * the user immediate feedback.
 */
export async function purchasePackage(skuId) {
  return _active().purchasePackage(skuId);
}

export async function restorePurchases() {
  return _active().restorePurchases();
}

/**
 * Sign-out hook. Called from the Volyume sign-out flow so RevenueCat
 * doesn't keep the previous user's entitlements associated with the
 * device.
 */
export async function logOut() {
  if (!_initialised) return;
  try {
    await _active().logOut();
  } catch (e) {
    logWarn('payments.revenuecat.logOut.failed', e?.message ?? 'unknown', {});
  } finally {
    _initialised = false;
    _currentAppUserID = null;
  }
}
