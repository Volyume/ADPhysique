/**
 * Release-blocker fix (final release gate, baseline a50fba85):
 * playBilling.initialise() registers the purchase-completion listener, and
 * purchasePackage() settles its parked promise ONLY from that listener. But
 * initialise() was called from exactly ONE place: RootNavigator's
 * cold-launch bootstrap. A user who signed up or signed in during the SAME
 * app session (no restart) therefore reached the paywall with no listener
 * registered - Play took the payment, the promise hung to its 90s
 * E_PURCHASE_TIMEOUT, and the entitlement grant downstream
 * (cascade.payAt / cascade.confirmPurchase) never ran. They were told the
 * purchase failed while already being charged.
 *
 * These pin the module-level lifecycle contract that fix relies on. The
 * RootNavigator wiring itself is pinned separately by
 * src/navigation/__tests__/rootNavigatorBillingLifecycle.guard.test.js
 * (RootNavigator is not require-able under this jest config).
 *
 * Reuses the fake-RNIap harness shape from playBilling.offer.test.js.
 */
import {
  _buildRealProvider, injectProvider, _resetForTests,
  initialise, ensureBillingForUser, isInitialised, currentAppUserID,
  purchasePackage, restorePurchases, logOut,
} from '../playBilling';

const SKU = 'pro_monthly';

// A Play product carrying a usable offer token, so purchasePackage gets past
// its own "No Play offer" guard and actually reaches the listener bridge -
// which is the behaviour under test here.
function offerProduct() {
  return {
    id: SKU,
    subscriptionOfferDetailsAndroid: [{
      basePlanId: 'monthly',
      offerId: null,
      offerToken: 'offer-base-plan',
      pricingPhases: { pricingPhaseList: [{ priceAmountMicros: '990000', billingPeriod: 'P1M' }] },
    }],
  };
}

function makeFakeIap(overrides = {}) {
  let updatedCb = null;
  let errorCb = null;
  const removeUpdated = jest.fn();
  const removeError = jest.fn();
  return {
    initConnection: jest.fn().mockResolvedValue(undefined),
    endConnection: jest.fn().mockResolvedValue(undefined),
    finishTransaction: jest.fn().mockResolvedValue(true),
    getAvailablePurchases: jest.fn().mockResolvedValue([]),
    requestPurchase: jest.fn().mockResolvedValue({}),
    fetchProducts: jest.fn().mockResolvedValue([offerProduct()]),
    purchaseUpdatedListener: jest.fn((cb) => { updatedCb = cb; return { remove: removeUpdated }; }),
    purchaseErrorListener: jest.fn((cb) => { errorCb = cb; return { remove: removeError }; }),
    emitPurchase: (p) => updatedCb && updatedCb(p),
    emitError: (e) => errorCb && errorCb(e),
    _removeUpdated: removeUpdated,
    _removeError: removeError,
    ...overrides,
  };
}

function install(fake) {
  injectProvider(_buildRealProvider(fake));
}

beforeEach(() => {
  _resetForTests();
});

afterEach(() => {
  _resetForTests();
});

describe('initialise() idempotency (no duplicate purchase listeners)', () => {
  test('a second call for the SAME user does not re-register listeners', async () => {
    const fake = makeFakeIap();
    install(fake);

    await initialise({ appUserID: 'user-a' });
    await initialise({ appUserID: 'user-a' });

    expect(fake.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
    expect(fake.purchaseErrorListener).toHaveBeenCalledTimes(1);
    expect(isInitialised()).toBe(true);
    expect(currentAppUserID()).toBe('user-a');
  });

  test('a failed initialise leaves state uninitialised so a later attempt retries', async () => {
    const fake = makeFakeIap({
      initConnection: jest.fn().mockRejectedValue(new Error('store unavailable')),
    });
    install(fake);

    const ok = await initialise({ appUserID: 'user-a' });

    expect(ok).toBe(false);
    expect(isInitialised()).toBe(false);
  });

  test('missing appUserID is a no-op, never a partial init', async () => {
    const fake = makeFakeIap();
    install(fake);

    const ok = await initialise({ appUserID: null });

    expect(ok).toBe(false);
    expect(isInitialised()).toBe(false);
    expect(fake.purchaseUpdatedListener).not.toHaveBeenCalled();
  });
});

describe('ensureBillingForUser (the one entry point auth + purchase both use)', () => {
  test('initialises when nothing has been initialised yet (the same-session sign-in case)', async () => {
    const fake = makeFakeIap();
    install(fake);

    const ready = await ensureBillingForUser('user-a');

    expect(ready).toBe(true);
    expect(fake.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
    expect(currentAppUserID()).toBe('user-a');
  });

  test('already initialised for that user is a cheap no-op', async () => {
    const fake = makeFakeIap();
    install(fake);

    await ensureBillingForUser('user-a');
    await ensureBillingForUser('user-a');

    expect(fake.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
  });

  test('CONCURRENT callers share one attempt, never registering duplicate listeners', async () => {
    const fake = makeFakeIap();
    install(fake);

    // The auth-enter hook and a fast paywall tap firing together.
    await Promise.all([
      ensureBillingForUser('user-a'),
      ensureBillingForUser('user-a'),
      ensureBillingForUser('user-a'),
    ]);

    expect(fake.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
    expect(fake.purchaseErrorListener).toHaveBeenCalledTimes(1);
  });

  test('a DIFFERENT user tears the previous session down before binding the new one', async () => {
    const fake = makeFakeIap();
    install(fake);

    await ensureBillingForUser('user-a');
    expect(currentAppUserID()).toBe('user-a');

    await ensureBillingForUser('user-b');

    // The previous user's listeners were actually removed, not just orphaned.
    expect(fake._removeUpdated).toHaveBeenCalled();
    expect(fake._removeError).toHaveBeenCalled();
    // And the new user is now the bound identity.
    expect(currentAppUserID()).toBe('user-b');
    expect(fake.purchaseUpdatedListener).toHaveBeenCalledTimes(2);
  });

  test('no appUserID resolves false rather than half-initialising', async () => {
    const fake = makeFakeIap();
    install(fake);

    expect(await ensureBillingForUser(null)).toBe(false);
    expect(isInitialised()).toBe(false);
  });
});

describe('purchasePackage cannot outrun initialisation', () => {
  test('an explicit appUserID initialises billing before the purchase is requested', async () => {
    const fake = makeFakeIap();
    install(fake);

    // Never initialised: this is the exact same-session sign-up -> buy case.
    expect(isInitialised()).toBe(false);

    const p = purchasePackage('pro_monthly', { appUserID: 'user-a' });
    // Let the ensure + request run, then settle via the listener that must
    // now exist. If the listener were missing this would hang to the 90s
    // timeout - which is precisely the shipped bug.
    await new Promise((r) => setTimeout(r, 0));
    fake.emitPurchase({ productId: 'pro_monthly', purchaseToken: 'tok-1' });
    const result = await p;

    expect(fake.purchaseUpdatedListener).toHaveBeenCalled();
    expect(result.purchaseToken).toBe('tok-1');
  });

  test('a failed initialisation refuses the purchase instead of firing an unlistened request', async () => {
    const fake = makeFakeIap({
      initConnection: jest.fn().mockRejectedValue(new Error('store unavailable')),
    });
    install(fake);

    await expect(purchasePackage('pro_monthly', { appUserID: 'user-a' }))
      .rejects.toMatchObject({ code: 'E_BILLING_NOT_INITIALISED' });
    // No charge was ever initiated.
    expect(fake.requestPurchase).not.toHaveBeenCalled();
  });

  test('an already-initialised session purchases without re-initialising', async () => {
    const fake = makeFakeIap();
    install(fake);
    await ensureBillingForUser('user-a');

    const p = purchasePackage('pro_monthly');
    await new Promise((r) => setTimeout(r, 0));
    fake.emitPurchase({ productId: 'pro_monthly', purchaseToken: 'tok-2' });
    await p;

    expect(fake.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
  });
});

describe('restorePurchases (the self-service recovery path) also ensures billing', () => {
  test('an initialised session restores normally', async () => {
    const fake = makeFakeIap({
      getAvailablePurchases: jest.fn().mockResolvedValue([
        { productId: 'pro_monthly', purchaseToken: 'tok-r' },
      ]),
    });
    install(fake);
    await ensureBillingForUser('user-a');

    const info = await restorePurchases();

    expect(fake.getAvailablePurchases).toHaveBeenCalled();
    expect(info).toBeTruthy();
  });
});

describe('logOut tears the session down so a user switch cannot inherit it', () => {
  test('listeners are removed and identity cleared', async () => {
    const fake = makeFakeIap();
    install(fake);
    await ensureBillingForUser('user-a');

    await logOut();

    expect(fake._removeUpdated).toHaveBeenCalled();
    expect(fake._removeError).toHaveBeenCalled();
    expect(isInitialised()).toBe(false);
    expect(currentAppUserID()).toBeNull();
  });

  test('logOut with nothing initialised is a safe no-op', async () => {
    const fake = makeFakeIap();
    install(fake);

    await expect(logOut()).resolves.toBeUndefined();
    expect(fake.endConnection).not.toHaveBeenCalled();
  });
});
