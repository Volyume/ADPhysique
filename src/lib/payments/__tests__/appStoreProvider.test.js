/**
 * Apple App Store (StoreKit) provider: display-price selection + the purchase
 * bridge. The iOS sibling of playBilling.offer.test.js. It verifies the request
 * we build for StoreKit (no offer token, appAccountToken bound, ios shape), the
 * StoreKit-JWS verification token surfaced to confirmPurchase, and that
 * finishTransaction is called on the purchased event.
 *
 * The on-device purchase itself still needs an App Store sandbox run; this
 * covers the request we build and the event handling, not Apple's side.
 */
import { selectIosDisplayPrice, _buildIosStoreKitProvider } from '../playBilling';

const SKU = 'pro_monthly';

function iosProduct(displayPrice = '£2.99') {
  // StoreKit products carry their own localised price; no Android offer details.
  return { id: SKU, displayPrice, type: 'subs' };
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

describe('selectIosDisplayPrice (C-2: show the store-localised price on iOS)', () => {
  it('returns the StoreKit displayPrice', () => {
    expect(selectIosDisplayPrice(iosProduct('£2.99'))).toBe('£2.99');
    expect(selectIosDisplayPrice({ id: SKU, displayPrice: '8,99 €' })).toBe('8,99 €');
  });
  it('falls back to localizedPrice then priceString', () => {
    expect(selectIosDisplayPrice({ localizedPrice: '$6.99' })).toBe('$6.99');
    expect(selectIosDisplayPrice({ priceString: '￥800' })).toBe('￥800');
  });
  it('returns null when no string price is present', () => {
    expect(selectIosDisplayPrice(null)).toBeNull();
    expect(selectIosDisplayPrice({})).toBeNull();
    // a numeric-only price is not a user-facing localised string
    expect(selectIosDisplayPrice({ price: 4.99 })).toBeNull();
  });
});

describe('_buildIosStoreKitProvider', () => {
  it('returns null when the native module is absent', () => {
    expect(_buildIosStoreKitProvider(null)).toBeNull();
  });

  it('builds a StoreKit request (no offer token) with the appAccountToken and surfaces the JWS', async () => {
    const fake = makeFakeIap({ fetchProducts: jest.fn().mockResolvedValue([iosProduct()]) });
    const provider = _buildIosStoreKitProvider(fake);

    await provider.initialise({ appUserID: 'user-uuid-1' });
    expect(fake.fetchProducts).toHaveBeenCalledWith({ skus: expect.arrayContaining([SKU]), type: 'subs' });

    const purchasing = provider.purchasePackage(SKU);
    await Promise.resolve();
    // StoreKit delivers the signed JWS as purchaseToken in the v15 unified shape.
    fake.emitPurchase({ productId: SKU, purchaseToken: 'jws-token-1', transactionId: 'txn-1' });

    const res = await purchasing;
    expect(res.transactionId).toBe('txn-1');
    expect(res.purchaseToken).toBe('jws-token-1');
    expect(res.sku).toBe(SKU);
    expect(res.customerInfo.activeEntitlements).toContain('pro');
    expect(res.customerInfo.latestPurchaseToken).toBe('jws-token-1');
    expect(fake.finishTransaction).toHaveBeenCalledWith({
      purchase: expect.objectContaining({ purchaseToken: 'jws-token-1' }),
      isConsumable: false,
    });
    expect(fake.requestPurchase).toHaveBeenCalledWith({
      request: { ios: { sku: SKU, appAccountToken: 'user-uuid-1' } },
      type: 'subs',
    });
    // No Android offer plumbing leaked into the iOS request.
    const call = fake.requestPurchase.mock.calls[0][0];
    expect(call.request.google).toBeUndefined();
  });

  it('reads the JWS from jwsRepresentationIos when purchaseToken is absent (older shape)', async () => {
    const fake = makeFakeIap({ fetchProducts: jest.fn().mockResolvedValue([iosProduct()]) });
    const provider = _buildIosStoreKitProvider(fake);
    await provider.initialise({ appUserID: 'u' });

    const purchasing = provider.purchasePackage(SKU);
    await Promise.resolve();
    fake.emitPurchase({ productId: SKU, jwsRepresentationIos: 'jws-old', transactionId: 'txn-2' });

    const res = await purchasing;
    expect(res.purchaseToken).toBe('jws-old');
  });

  it('omits appAccountToken when no user id is provided', async () => {
    const fake = makeFakeIap({ fetchProducts: jest.fn().mockResolvedValue([iosProduct()]) });
    const provider = _buildIosStoreKitProvider(fake);
    await provider.initialise({});

    const purchasing = provider.purchasePackage(SKU);
    await Promise.resolve();
    fake.emitPurchase({ productId: SKU, purchaseToken: 'jws', transactionId: 't' });
    await purchasing;

    expect(fake.requestPurchase).toHaveBeenCalledWith({
      request: { ios: { sku: SKU } },
      type: 'subs',
    });
  });

  it('rejects the awaiting purchase when StoreKit reports a purchase error', async () => {
    const fake = makeFakeIap({ fetchProducts: jest.fn().mockResolvedValue([iosProduct()]) });
    const provider = _buildIosStoreKitProvider(fake);
    await provider.initialise({ appUserID: 'u' });

    const purchasing = provider.purchasePackage(SKU);
    await Promise.resolve();
    fake.emitError({ code: 'E_UNKNOWN', message: 'boom' });
    await expect(purchasing).rejects.toMatchObject({ code: 'E_UNKNOWN' });
  });

  it('maps available purchases to customer info on restore', async () => {
    const fake = makeFakeIap({
      getAvailablePurchases: jest.fn().mockResolvedValue([
        { productId: SKU, purchaseToken: 'jws-active', transactionId: 'txn-9', transactionDate: 2 },
      ]),
    });
    const provider = _buildIosStoreKitProvider(fake);
    await provider.initialise({ appUserID: 'u' });

    const info = await provider.restorePurchases();
    expect(info.activeEntitlements).toContain('pro');
    expect(info.activeSku).toBe(SKU);
    expect(info.latestPurchaseToken).toBe('jws-active');
    // restore finishes any outstanding transaction before reading
    expect(fake.finishTransaction).toHaveBeenCalled();
  });
});
