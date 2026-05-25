/**
 * Google Play Billing provider wrapper.
 *
 * Founder override 2026-05-25: the original locked spec
 * (SUBSCRIPTION_AND_PAYMENT_LOCKED.md line 49) chose RevenueCat as
 * the abstraction layer. With iOS deferred indefinitely per the
 * Android-only Phase B decision, RevenueCat's main value
 * (cross-platform identity) is moot. Going direct against Google
 * Play Billing removes the 1%-above-£2.5k-MRR fee and one third-party
 * dependency. Logged in CURRENT_STATUS.md.
 *
 * This module exposes the API surface the cascade module and UI
 * call against, with a default stub provider that returns safe no-op
 * results. At Phase A exit we swap in the real provider, which wraps
 * `react-native-iap` (or `expo-in-app-purchases`) and talks directly
 * to Google Play Billing.
 *
 * Provider contract (identical regardless of underlying SDK):
 *   {
 *     initialise({ appUserID }) -> Promise<void>
 *     getCustomerInfo()         -> Promise<CustomerInfo>
 *     purchasePackage(skuId)    -> Promise<{ transactionId, sku, customerInfo }>
 *     restorePurchases()        -> Promise<CustomerInfo>
 *     logOut()                  -> Promise<void>
 *   }
 *
 * CustomerInfo shape we care about:
 *   {
 *     activeEntitlements: ['pro' | 'complete' | ...],
 *     latestTransactionId: string | null,
 *     activeSku: string | null,
 *   }
 *
 * Receipt validation lives server-side in the Supabase Edge Function
 * (supabase/functions/google-iap-rtdn/). The client passes the
 * purchase token; the function calls Google Play Developer API's
 * verifyPurchase endpoint, then fires `upgrade_tier` with the verified
 * transaction. Same flow shape as if RevenueCat had been chosen, just
 * fewer middlemen.
 */

import { logInfo, logWarn } from '../errorLog';
import { allSkuIds, skuById } from './catalogue';

let _provider = null;
let _initialised = false;
let _currentAppUserID = null;
let _purchaseListener = null;
let _errorListener = null;

// Lazy-require react-native-iap so the JS bundle still parses on
// environments where the native module isn't linked (Jest, dev
// without prebuild). Returns null if the module isn't available.
function _loadRNIap() {
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    return require('react-native-iap');
  } catch (_) {
    return null;
  }
}

/**
 * The real Google Play Billing provider. Wraps `react-native-iap` to
 * match the provider contract the cascade module + UI call against.
 * Returned by buildRealProvider() and injected by tryWireRealProvider()
 * at app boot when the native module is present.
 *
 * CustomerInfo shape we expose:
 *   { activeEntitlements: ['pro'], latestTransactionId: '…', activeSku: 'pro_monthly_…' }
 */
function _buildRealProvider() {
  const RNIap = _loadRNIap();
  if (!RNIap) return null;

  function _purchasesToCustomerInfo(purchases) {
    const known = (purchases || []).filter(p => {
      const sku = p?.productId ?? p?.sku;
      return sku && skuById(sku) !== null;
    });
    if (known.length === 0) {
      return { activeEntitlements: [], latestTransactionId: null, activeSku: null };
    }
    // Most-recent first by transactionDate (ms epoch).
    known.sort((a, b) => (b.transactionDate ?? 0) - (a.transactionDate ?? 0));
    const latest = known[0];
    const sku = latest.productId ?? latest.sku;
    const skuRecord = skuById(sku);
    return {
      activeEntitlements: skuRecord ? [skuRecord.tier] : [],
      latestTransactionId: latest.transactionId
        ?? latest.purchaseToken
        ?? null,
      activeSku: sku,
    };
  }

  return {
    async initialise({ appUserID } = {}) {
      await RNIap.initConnection();
      // Pre-fetch SKU metadata so the first call to requestSubscription
      // doesn't pay the round-trip cost while the user waits.
      try {
        await RNIap.getSubscriptions({ skus: allSkuIds() });
      } catch (e) {
        logWarn('payments.playBilling.getSubscriptions', e?.message ?? 'unknown', {});
      }
      // Purchase listener fires for both fresh purchases and pending
      // transactions resolved out of band (e.g. payment was
      // PENDING and later approved). Acknowledge via finishTransaction
      // so Google considers the purchase consumed/handled.
      _purchaseListener = RNIap.purchaseUpdatedListener(async (purchase) => {
        try {
          if (purchase?.purchaseToken && !purchase?.isAcknowledgedAndroid) {
            await RNIap.finishTransaction({ purchase, isConsumable: false });
          }
          logInfo('payments.playBilling.purchaseUpdated',
            `sku=${purchase?.productId} token=${purchase?.purchaseToken?.slice(0, 12)}…`);
        } catch (e) {
          logWarn('payments.playBilling.finishTransaction', e?.message ?? 'unknown', {});
        }
      });
      _errorListener = RNIap.purchaseErrorListener((err) => {
        // Don't log user-cancel as an error; it's a normal flow.
        const code = err?.code ?? '';
        if (code === 'E_USER_CANCELLED') return;
        logWarn('payments.playBilling.purchaseError',
          err?.message ?? 'unknown', { code });
      });
      if (appUserID) {
        // Stamp the obfuscated account ID so RTDN events come back
        // correlated to our auth uid (Google forwards this field in
        // the developer notification payload).
        try {
          await RNIap.setObfuscatedAccountIdAndroid?.(appUserID);
        } catch (_) { /* older lib versions don't expose this */ }
      }
    },

    async getCustomerInfo() {
      const purchases = await RNIap.getAvailablePurchases();
      return _purchasesToCustomerInfo(purchases);
    },

    async purchasePackage(skuId) {
      // requestSubscription returns a Promise resolving to the
      // purchase object once Google has confirmed. The purchase
      // listener also fires; we wait for the Promise here so the
      // caller gets a transactionId immediately.
      const purchase = await RNIap.requestSubscription({ sku: skuId });
      const info = _purchasesToCustomerInfo([purchase]);
      return {
        transactionId: purchase?.transactionId
          ?? purchase?.purchaseToken
          ?? null,
        sku: skuId,
        customerInfo: info,
      };
    },

    async restorePurchases() {
      const purchases = await RNIap.getAvailablePurchases();
      return _purchasesToCustomerInfo(purchases);
    },

    async logOut() {
      try { _purchaseListener?.remove?.(); } catch (_) { /* tolerate */ }
      try { _errorListener?.remove?.(); } catch (_) { /* tolerate */ }
      _purchaseListener = null;
      _errorListener = null;
      try { await RNIap.endConnection(); } catch (_) { /* tolerate */ }
    },
  };
}

/**
 * Call once at app boot. Injects the real Google Play Billing
 * provider if the native module is linked; otherwise leaves the
 * default stub in place (cascade UI still renders, purchase tap
 * throws "provider not injected" until a real build ships).
 *
 * Safe to call multiple times — only the first install replaces the
 * provider; subsequent calls are no-ops.
 */
export function tryWireRealProvider() {
  if (_provider !== null) return true;
  const real = _buildRealProvider();
  if (!real) return false;
  injectProvider(real);
  return true;
}

const STUB_CUSTOMER_INFO = Object.freeze({
  activeEntitlements: [],
  latestTransactionId: null,
  activeSku: null,
});

const _stubProvider = Object.freeze({
  async initialise() { /* no-op */ },
  async getCustomerInfo() { return { ...STUB_CUSTOMER_INFO }; },
  async purchasePackage() {
    throw new Error('Play Billing provider not injected (Phase A stub)');
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
  logInfo('payments.playBilling.providerInjected', 'real provider installed');
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
 * Initialise the underlying IAP SDK with the user's Volyume
 * auth.uid() as the SDK-side userID. The locked spec used appUserID
 * for cross-platform reconciliation; on Play-only that's our local
 * key for tying purchaseTokens back to the right Supabase user.
 *
 * Safe to call repeatedly; re-init with the same appUserID is a
 * no-op. Switching users requires logOut() first.
 */
export async function initialise({ apiKey, appUserID }) {
  if (!appUserID) {
    logWarn('payments.playBilling.init', 'missing appUserID; skipping');
    return false;
  }
  if (_initialised && _currentAppUserID === appUserID) return true;
  try {
    await _active().initialise({ apiKey, appUserID });
    _initialised = true;
    _currentAppUserID = appUserID;
    return true;
  } catch (e) {
    logWarn('payments.playBilling.init.failed', e?.message ?? 'unknown', {});
    return false;
  }
}

export async function getCustomerInfo() {
  return _active().getCustomerInfo();
}

/**
 * Initiate a purchase. The cascade module wraps this with the
 * Volyume-side tier_history write via the upgrade_tier RPC after
 * the platform confirms the purchase. Google Play Billing's
 * Real-Time Developer Notification (RTDN) Pub/Sub topic, processed
 * by our Supabase Edge Function, is the authoritative source of
 * truth for renewals / cancellations / refunds; this client-side
 * call gives the user immediate feedback at purchase time.
 */
export async function purchasePackage(skuId) {
  return _active().purchasePackage(skuId);
}

export async function restorePurchases() {
  return _active().restorePurchases();
}

/**
 * Sign-out hook. Called from the Volyume sign-out flow so the IAP
 * SDK doesn't keep the previous user's entitlements associated with the
 * device.
 */
export async function logOut() {
  if (!_initialised) return;
  try {
    await _active().logOut();
  } catch (e) {
    logWarn('payments.playBilling.logOut.failed', e?.message ?? 'unknown', {});
  } finally {
    _initialised = false;
    _currentAppUserID = null;
  }
}
