/**
 * react-native-iap v15 provider: offer-token selection + the purchase bridge.
 *
 * These cover the parts that broke when the dependency moved to v15 (the old
 * code targeted v12's requestSubscription/getSubscriptions): selecting the
 * 7-day free-trial offer token, and bridging the v15 event-based purchase
 * result back to the awaited purchasePackage() contract the paywall relies on.
 *
 * The on-device purchase itself still needs a Play sandbox run; this verifies
 * the request we build and the event handling, not Google's side.
 */

import { selectOfferToken, _buildRealProvider } from '../playBilling';

const FREE_TOKEN = 'offer-free-7d';
const BASE_TOKEN = 'offer-base-plan';
const SKU = 'pro_monthly';

function trialProduct() {
  return {
    id: SKU,
    subscriptionOfferDetailsAndroid: [
      {
        basePlanId: 'monthly',
        offerId: null,
        offerToken: BASE_TOKEN,
        pricingPhases: { pricingPhaseList: [{ priceAmountMicros: '990000', billingPeriod: 'P1M' }] },
      },
      {
        basePlanId: 'monthly',
        offerId: 'free-trial-7d',
        offerToken: FREE_TOKEN,
        pricingPhases: { pricingPhaseList: [
          { priceAmountMicros: '0', billingPeriod: 'P1W' },
          { priceAmountMicros: '990000', billingPeriod: 'P1M' },
        ] },
      },
    ],
  };
}

function makeFakeIap(overrides = {}) {
  let updatedCb = null;
  let errorCb = null;
  return {
    initConnection: jest.fn().mockResolvedValue(undefined),
    endConnection: jest.fn().mockResolvedValue(undefined),
    finishTransaction: jest.fn().mockResolvedValue(true),
    getAvailablePurchases: jest.fn().mockResolvedValue([]),
    requestPurchase: jest.fn().mockResolvedValue({}),
    fetchProducts: jest.fn().mockResolvedValue([]),
    purchaseUpdatedListener: jest.fn((cb) => { updatedCb = cb; return { remove: jest.fn() }; }),
    purchaseErrorListener: jest.fn((cb) => { errorCb = cb; return { remove: jest.fn() }; }),
    emitPurchase: (p) => updatedCb && updatedCb(p),
    emitError: (e) => errorCb && errorCb(e),
    ...overrides,
  };
}

describe('selectOfferToken', () => {
  it('prefers the offer with a free pricing phase (the trial)', () => {
    expect(selectOfferToken(trialProduct())).toBe(FREE_TOKEN);
  });

  it('falls back to the base plan offer (no offerId) when no free phase exists', () => {
    const product = {
      subscriptionOfferDetailsAndroid: [
        { offerId: 'promo', offerToken: 'promo-tok', pricingPhases: { pricingPhaseList: [{ priceAmountMicros: '500000' }] } },
        { offerId: null, offerToken: BASE_TOKEN, pricingPhases: { pricingPhaseList: [{ priceAmountMicros: '990000' }] } },
      ],
    };
    expect(selectOfferToken(product)).toBe(BASE_TOKEN);
  });

  it('falls back to the first offer when every offer has an offerId and none is free', () => {
    const product = {
      subscriptionOfferDetailsAndroid: [
        { offerId: 'a', offerToken: 'tok-a', pricingPhases: { pricingPhaseList: [{ priceAmountMicros: '990000' }] } },
        { offerId: 'b', offerToken: 'tok-b', pricingPhases: { pricingPhaseList: [{ priceAmountMicros: '990000' }] } },
      ],
    };
    expect(selectOfferToken(product)).toBe('tok-a');
  });

  it('returns null for a product with no offers or a missing product', () => {
    expect(selectOfferToken(null)).toBeNull();
    expect(selectOfferToken({})).toBeNull();
    expect(selectOfferToken({ subscriptionOfferDetailsAndroid: [] })).toBeNull();
  });
});

describe('_buildRealProvider', () => {
  it('returns null when the native module is absent', () => {
    expect(_buildRealProvider(null)).toBeNull();
  });

  it('caches the trial offer token and builds a v15 request with it + the account id', async () => {
    const fake = makeFakeIap({ fetchProducts: jest.fn().mockResolvedValue([trialProduct()]) });
    const provider = _buildRealProvider(fake);

    await provider.initialise({ appUserID: 'user-1' });
    expect(fake.fetchProducts).toHaveBeenCalledWith({ skus: expect.arrayContaining([SKU]), type: 'subs' });

    const purchasing = provider.purchasePackage(SKU);
    await Promise.resolve(); // let the request microtask run + pending get set
    fake.emitPurchase({ productId: SKU, purchaseToken: 'tok-1', transactionId: 'txn-1', isAcknowledgedAndroid: false });

    const res = await purchasing;
    expect(res.transactionId).toBe('txn-1');
    expect(res.sku).toBe(SKU);
    expect(res.customerInfo.activeEntitlements).toContain('pro');
    expect(fake.finishTransaction).toHaveBeenCalledWith({ purchase: expect.objectContaining({ purchaseToken: 'tok-1' }), isConsumable: false });
    expect(fake.requestPurchase).toHaveBeenCalledWith({
      request: {
        google: {
          skus: [SKU],
          subscriptionOffers: [{ sku: SKU, offerToken: FREE_TOKEN }],
          obfuscatedAccountId: 'user-1',
        },
      },
      type: 'subs',
    });
  });

  it('rejects clearly when no offer token is cached for the sku', async () => {
    const fake = makeFakeIap({ fetchProducts: jest.fn().mockResolvedValue([]) });
    const provider = _buildRealProvider(fake);
    await provider.initialise({ appUserID: 'u' });
    await expect(provider.purchasePackage(SKU)).rejects.toThrow(/No Play offer/);
    expect(fake.requestPurchase).not.toHaveBeenCalled();
  });

  it('rejects with E_USER_CANCELLED when the user dismisses the dialog', async () => {
    const fake = makeFakeIap({ fetchProducts: jest.fn().mockResolvedValue([trialProduct()]) });
    const provider = _buildRealProvider(fake);
    await provider.initialise({ appUserID: 'u' });

    const purchasing = provider.purchasePackage(SKU);
    await Promise.resolve();
    fake.emitError({ code: 'E_USER_CANCELLED', message: 'cancelled' });

    await expect(purchasing).rejects.toMatchObject({ code: 'E_USER_CANCELLED' });
  });
});
