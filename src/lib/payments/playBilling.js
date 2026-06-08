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

// C-2: localised display prices per sku, captured from the store at fetch time.
// Store policy (Apple + Google) requires showing the store's localised price,
// not a hardcoded one. Populated by the real provider's loadOfferTokens; read by
// the paywall surfaces (via usePlayPrices), falling back to the catalogue text
// before products load. Module-level so the UI can read it without the provider
// closure.
const _displayPrices = {};
export function getDisplayPrice(skuId) {
  return _displayPrices[skuId] ?? null;
}
export function getDisplayPrices() {
  return { ..._displayPrices };
}

// Funnel telemetry for the IAP dialog. Reads user from the store
// lazily so the payments module stays free of store imports at
// evaluation time. Falls back to _currentAppUserID (set during
// initialise) when the store hasn't seeded the user yet.
function _trackPurchase(event, payload) {
  try {
    let uid = _currentAppUserID;
    if (!uid) {
      // eslint-disable-next-line global-require
      const useAppStore = require('../../store/useAppStore').default;
      uid = useAppStore.getState().user?.id ?? null;
    }
    if (!uid) return;
    // eslint-disable-next-line global-require
    const { track } = require('../engineTelemetry');
    track(uid, event, payload ?? {}).catch(() => {});
  } catch (_) { /* tolerate */ }
}

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
 * Pick the Play offer token to purchase a subscription with.
 *
 * Google returns, per subscription product, a list of offers in
 * `subscriptionOfferDetailsAndroid`: the base plan (no `offerId`) plus any
 * offers, e.g. the 7-day free trial. To buy WITH the free trial we must pass
 * that offer's `offerToken`; pass the base plan's token (or none) and Google
 * bills immediately at the regular price. Eligibility is enforced server
 * side: once a user has used the intro offer Google stops returning it, so we
 * fall back to the base plan automatically.
 *
 * Preference order:
 *   1. an offer whose pricing has a free phase (priceAmountMicros === 0)
 *   2. the base plan offer (no offerId)
 *   3. the first offer
 * Returns null only if the product exposes no offers at all (misconfigured).
 *
 * @param {object} product  a ProductSubscription from fetchProducts({type:'subs'})
 * @returns {string|null}
 */
export function selectOfferToken(product) {
  const offers = product?.subscriptionOfferDetailsAndroid;
  if (!Array.isArray(offers) || offers.length === 0) return null;
  const hasFreePhase = (o) =>
    Array.isArray(o?.pricingPhases?.pricingPhaseList)
    && o.pricingPhases.pricingPhaseList.some(
      (p) => p && Number(p.priceAmountMicros) === 0,
    );
  const freeTrial = offers.find(hasFreePhase);
  if (freeTrial?.offerToken) return freeTrial.offerToken;
  const basePlan = offers.find((o) => !o?.offerId);
  if (basePlan?.offerToken) return basePlan.offerToken;
  return offers[0]?.offerToken ?? null;
}

/**
 * The localised recurring price string to display for a subscription product,
 * read from the store (e.g. "£4.99", "$6.99", "8,99 €"). Returns the first
 * non-free pricing phase's `formattedPrice` from the base plan (or any offer),
 * which is the price the user actually pays after any trial. Returns null when
 * the product exposes no priced phase, so callers fall back to the catalogue
 * text. Pure; mirrors selectOfferToken so it can be unit-tested.
 *
 * @param {object} product a ProductSubscription from fetchProducts({type:'subs'})
 * @returns {string|null}
 */
export function selectDisplayPrice(product) {
  const offers = product?.subscriptionOfferDetailsAndroid;
  if (!Array.isArray(offers) || offers.length === 0) return null;
  const pricedPhase = (o) =>
    (o?.pricingPhases?.pricingPhaseList || []).find(
      (p) => p && Number(p.priceAmountMicros) > 0 && p.formattedPrice,
    );
  // Prefer the base plan's recurring price; fall back to any offer's.
  const basePlan = offers.find((o) => !o?.offerId);
  const fromBase = basePlan && pricedPhase(basePlan);
  if (fromBase?.formattedPrice) return fromBase.formattedPrice;
  for (const o of offers) {
    const ph = pricedPhase(o);
    if (ph?.formattedPrice) return ph.formattedPrice;
  }
  return null;
}

/**
 * The real Google Play Billing provider. Wraps `react-native-iap` v15 to
 * match the provider contract the cascade module + UI call against.
 * Returned by _buildRealProvider() and injected by tryWireRealProvider()
 * at app boot when the native module is present.
 *
 * v15 note: the purchase result arrives via purchaseUpdatedListener, NOT the
 * return of requestPurchase. purchasePackage() bridges that event back to its
 * awaited Promise so the paywall callers keep the same contract (await ->
 * { transactionId, sku, customerInfo }).
 *
 * The RNIap argument defaults to the lazily-required native module; tests
 * inject a fake.
 *
 * CustomerInfo shape we expose:
 *   { activeEntitlements: ['pro'], latestTransactionId: '…', activeSku: 'pro_monthly_…' }
 */
export function _buildRealProvider(RNIap = _loadRNIap()) {
  if (!RNIap) return null;

  // sku -> offerToken, filled in initialise() from fetchProducts so the
  // 7-day trial offer is ready before the first purchase.
  const offerTokens = {};
  // Captured at initialise(); v15 takes obfuscatedAccountId in the request.
  let providerAppUserID = null;
  // The single in-flight purchase bridge. v15 delivers the result on the
  // listener, so purchasePackage() parks its resolve/reject here and the
  // listeners settle it.
  let pending = null; // { skus:Set, resolve, reject, timer }

  function _settleResolve(purchase) {
    if (!pending) return;
    const pid = purchase?.productId
      ?? (Array.isArray(purchase?.ids) ? purchase.ids[0] : null);
    // If we can read a product id and it isn't the one we're waiting on, this
    // is an out-of-band event (e.g. a restore); leave our pending alone.
    if (pid && pending.skus.size && !pending.skus.has(pid)) return;
    const p = pending; pending = null;
    try { clearTimeout(p.timer); } catch (_) { /* tolerate */ }
    p.resolve(purchase);
  }
  function _settleReject(err) {
    if (!pending) return;
    const p = pending; pending = null;
    try { clearTimeout(p.timer); } catch (_) { /* tolerate */ }
    p.reject(err);
  }

  // Fetch the subscription products and cache each one's offer token (the
  // 7-day free trial when present, else the base plan). Called at initialise
  // and again lazily from purchasePackage if the map is empty, so a transient
  // network failure on the first load doesn't permanently block a purchase.
  async function loadOfferTokens() {
    try {
      const products = await RNIap.fetchProducts({ skus: allSkuIds(), type: 'subs' });
      for (const product of products || []) {
        const id = product?.id ?? product?.productId;
        const token = selectOfferToken(product);
        if (id && token) offerTokens[id] = token;
        // C-2: cache the localised display price for the paywall surfaces.
        const price = selectDisplayPrice(product);
        if (id && price) _displayPrices[id] = price;
      }
    } catch (e) {
      logWarn('payments.playBilling.fetchProducts', e?.message ?? 'unknown', {});
    }
  }

  // M-2 (audit): acknowledge any purchase Google still considers unacknowledged.
  // Google auto-refunds an unacknowledged purchase after 3 days. The
  // purchaseUpdatedListener finishes fresh purchases, but one whose event was
  // missed (app killed before it fired) or that only surfaces via
  // getAvailablePurchases (restore) would otherwise never be acknowledged.
  // Idempotent: a finished/acknowledged purchase is skipped.
  async function acknowledgeOutstanding() {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      for (const purchase of purchases || []) {
        const isPending = purchase?.purchaseStateAndroid === 2;
        if (purchase?.purchaseToken && !purchase?.isAcknowledgedAndroid && !isPending) {
          try {
            await RNIap.finishTransaction({ purchase, isConsumable: false });
            logInfo('payments.playBilling.ackOutstanding', `sku=${purchase?.productId}`);
          } catch (e) {
            logWarn('payments.playBilling.ackOutstanding.finish', e?.message ?? 'unknown', {});
          }
        }
      }
    } catch (e) {
      logWarn('payments.playBilling.ackOutstanding', e?.message ?? 'unknown', {});
    }
  }

  function _purchasesToCustomerInfo(purchases) {
    const known = (purchases || []).filter(p => {
      const sku = p?.productId ?? p?.sku;
      return sku && skuById(sku) !== null;
    });
    if (known.length === 0) {
      return { activeEntitlements: [], latestTransactionId: null, activeSku: null, latestPurchaseToken: null };
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
      // M-3: the raw Play purchase token, so restore can server-verify the
      // active subscription (confirmPurchase) rather than only optimistically
      // unlocking and waiting for a cloud read.
      latestPurchaseToken: latest.purchaseToken ?? null,
      activeSku: sku,
    };
  }

  return {
    // Exposed so the paywall can force a price fetch if initialise hasn't run.
    loadProducts: loadOfferTokens,
    async initialise({ appUserID } = {}) {
      providerAppUserID = appUserID ?? null;
      await RNIap.initConnection();
      // Pre-fetch the subscription products so the offer tokens (the 7-day
      // free trial) are cached before the first purchase, and the first tap
      // doesn't pay the round-trip while the user waits.
      await loadOfferTokens();
      // Purchase listener fires for fresh purchases and for pending
      // transactions resolved out of band (e.g. payment was PENDING and later
      // approved). Acknowledge via finishTransaction so Google considers it
      // handled, then settle the awaiting purchasePackage() call.
      _purchaseListener = RNIap.purchaseUpdatedListener(async (purchase) => {
        try {
          // L-1: only acknowledge a PURCHASED transaction. Android delivers
          // PENDING purchases (slow payment, parental approval) to this listener
          // too; acknowledging one errors. purchaseStateAndroid: 1=purchased,
          // 2=pending. Treat anything explicitly pending as not-yet-finishable.
          const isPending = purchase?.purchaseStateAndroid === 2;
          if (purchase?.purchaseToken && !purchase?.isAcknowledgedAndroid && !isPending) {
            await RNIap.finishTransaction({ purchase, isConsumable: false });
          }
          logInfo('payments.playBilling.purchaseUpdated',
            `sku=${purchase?.productId} token=${purchase?.purchaseToken?.slice(0, 12)}…`);
          _trackPurchase('purchase_completed', {
            sku: purchase?.productId ?? null,
            transaction_id: purchase?.transactionId
              ?? purchase?.purchaseToken?.slice(0, 24)
              ?? null,
          });
        } catch (e) {
          logWarn('payments.playBilling.finishTransaction', e?.message ?? 'unknown', {});
        } finally {
          _settleResolve(purchase);
        }
      });
      _errorListener = RNIap.purchaseErrorListener((err) => {
        const code = err?.code ?? '';
        // User-cancel is a normal flow, not an error to log, but it still has
        // to settle the awaiting call so the UI stops spinning.
        if (code !== 'E_USER_CANCELLED') {
          logWarn('payments.playBilling.purchaseError',
            err?.message ?? 'unknown', { code });
          _trackPurchase('purchase_failed', {
            error_code: code || 'unknown',
            error_message: err?.message ?? 'unknown',
          });
        }
        const e = new Error(err?.message ?? 'purchase_error');
        e.code = code || 'purchase_error';
        _settleReject(e);
      });
      // M-2: sweep up any purchase left unacknowledged by a missed event on a
      // previous run, so it isn't auto-refunded by Google after 3 days.
      acknowledgeOutstanding().catch(() => {});
    },

    async getCustomerInfo() {
      const purchases = await RNIap.getAvailablePurchases();
      return _purchasesToCustomerInfo(purchases);
    },

    async purchasePackage(skuId) {
      _trackPurchase('purchase_initiated', { sku: skuId });
      let offerToken = offerTokens[skuId] ?? null;
      // The token map can be empty if initialise's fetch failed (transient
      // network) or the user reached the paywall before it finished. Re-fetch
      // once on demand before giving up, so a flaky first load doesn't
      // permanently block the purchase.
      if (!offerToken) {
        await loadOfferTokens();
        offerToken = offerTokens[skuId] ?? null;
      }
      // Android subscriptions must name an offer; without a token the trial
      // can't be selected and Google rejects the purchase, so fail clearly
      // rather than firing a request that silently bills full price or errors.
      if (!offerToken) {
        throw new Error(`No Play offer for ${skuId} (product not found or no base plan configured)`);
      }
      // v15: result comes via the listener. Park resolve/reject here, fire the
      // request, and let the listeners settle. A timeout guards against a
      // dialog the user dismisses without an event ever arriving.
      const purchase = await new Promise((resolve, reject) => {
        const entry = { skus: new Set([skuId]), resolve, reject, timer: null };
        entry.timer = setTimeout(() => {
          if (pending === entry) {
            pending = null;
            const e = new Error('purchase_timed_out');
            e.code = 'E_PURCHASE_TIMEOUT';
            reject(e);
          }
        }, 90000);
        // A previous purchase bridge can still be parked here (the user backed
        // out of the Play dialog without an event firing, then tapped again
        // before the 90s timeout). Settle it as superseded so its awaiting
        // caller stops spinning and its timer doesn't outlive it.
        if (pending) {
          const stale = pending;
          pending = null;
          try { clearTimeout(stale.timer); } catch (_) { /* tolerate */ }
          const se = new Error('purchase_superseded');
          se.code = 'E_PURCHASE_SUPERSEDED';
          try { stale.reject(se); } catch (_) { /* tolerate */ }
        }
        pending = entry;
        Promise.resolve()
          .then(() => RNIap.requestPurchase({
            request: {
              google: {
                skus: [skuId],
                subscriptionOffers: [{ sku: skuId, offerToken }],
                ...(providerAppUserID ? { obfuscatedAccountId: providerAppUserID } : {}),
              },
            },
            type: 'subs',
          }))
          .catch((err) => {
            // Synchronous store rejection (E_NOT_PREPARED, validation, …).
            if (pending === entry) {
              pending = null;
              try { clearTimeout(entry.timer); } catch (_) { /* tolerate */ }
            }
            reject(err);
          });
      });
      const info = _purchasesToCustomerInfo([purchase]);
      return {
        transactionId: purchase?.transactionId
          ?? purchase?.purchaseToken
          ?? null,
        // The Play purchase token, needed for server-side verification.
        purchaseToken: purchase?.purchaseToken ?? null,
        sku: skuId,
        customerInfo: info,
      };
    },

    async restorePurchases() {
      _trackPurchase('restore_purchases_attempted', {});
      // M-2: acknowledge before reading, so a restored-but-unacknowledged
      // purchase is finished rather than auto-refunded.
      await acknowledgeOutstanding();
      const purchases = await RNIap.getAvailablePurchases();
      return _purchasesToCustomerInfo(purchases);
    },

    async logOut() {
      try { _purchaseListener?.remove?.(); } catch (_) { /* tolerate */ }
      try { _errorListener?.remove?.(); } catch (_) { /* tolerate */ }
      _purchaseListener = null;
      _errorListener = null;
      if (pending) {
        try { clearTimeout(pending.timer); } catch (_) { /* tolerate */ }
        pending = null;
      }
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
 * Safe to call multiple times, only the first install replaces the
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
  latestPurchaseToken: null,
});

const _stubProvider = Object.freeze({
  async initialise() { /* no-op */ },
  async loadProducts() { /* no-op; no store prices in the stub env */ },
  async getCustomerInfo() { return { ...STUB_CUSTOMER_INFO }; },
  async purchasePackage() {
    throw new Error('Play Billing provider not injected (Phase A stub)');
  },
  async restorePurchases() { return { ...STUB_CUSTOMER_INFO }; },
  async logOut() { /* no-op */ },
});

/**
 * Ensure the localised display prices are loaded, then return the
 * { skuId: formattedPrice } map. The paywall calls this; if prices are already
 * cached (initialise ran at sign-in) it returns immediately, otherwise it forces
 * one fetch. Returns {} in the stub env, so callers fall back to catalogue text.
 */
export async function ensureDisplayPrices() {
  if (Object.keys(_displayPrices).length > 0) return getDisplayPrices();
  try { await _active().loadProducts?.(); } catch (_) { /* tolerate */ }
  return getDisplayPrices();
}

/**
 * Replace the active provider. Called once at app boot in production
 * with the real `react-native-iap` v15 adapter; called by tests
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
