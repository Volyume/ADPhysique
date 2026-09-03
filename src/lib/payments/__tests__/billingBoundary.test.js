/**
 * billingBoundary.test.js — the inactive billing boundary.
 *
 * FOUNDER DECISION 2026-09-03: Volyume is fully free. No trial, no Free/Pro
 * split, no paywall, no expiry. The store/billing infrastructure is RETAINED
 * DORMANT: every module still compiles, ships and is unit-tested directly by
 * its own suite. What must be true is that nothing reached through the public
 * barrel (src/lib/payments/index.js) can start a purchase, confirm one,
 * reconcile an entitlement, start a trial cascade or open a churn episode.
 *
 * This suite pins the boundary BEHAVIOURALLY, not by reading source. Every
 * outward edge the guarded functions could use is mocked with a spy that
 * FAILS the test if it is touched:
 *
 *   - the Supabase client (rpc + functions.invoke)  → network
 *   - the Zustand store (getState/setState)          → tier + entitlement cache
 *   - the store SDK provider (react-native-iap)      → the store itself
 *   - the notification scheduler                     → the OS queue
 *
 * So a future edit that quietly restores a live call fails here rather than
 * charging someone.
 */

const mockRpc = jest.fn();
const mockInvoke = jest.fn();
jest.mock('../../supabase', () => ({
  getSupabaseClient: () => ({
    rpc: (...a) => mockRpc(...a),
    functions: { invoke: (...a) => mockInvoke(...a) },
    from: () => { throw new Error('boundary breach: supabase .from() was called'); },
  }),
}));

const mockGetState = jest.fn(() => ({ user: { id: 'u1' }, userProfile: null }));
const mockSetState = jest.fn();
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: {
    getState: (...a) => mockGetState(...a),
    setState: (...a) => mockSetState(...a),
  },
}));

const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));

const mockCancelWinback = jest.fn(() => Promise.resolve());
const mockScheduleWinback = jest.fn(() => Promise.resolve());
const mockCancelMorning = jest.fn(() => Promise.resolve());
const mockCancelEvening = jest.fn(() => Promise.resolve());
jest.mock('../../notifications/scheduler', () => ({
  cancelWinbackNotification: (...a) => mockCancelWinback(...a),
  scheduleWinbackNotification: (...a) => mockScheduleWinback(...a),
  cancelMorningNotification: (...a) => mockCancelMorning(...a),
  cancelEveningWeightReminder: (...a) => mockCancelEvening(...a),
}));

const mockProviderCall = jest.fn();
jest.mock('react-native-iap', () => new Proxy({}, {
  get: () => (...a) => mockProviderCall(...a),
}));

const payments = require('../index');
const { FULL_ACCESS_FOR_ALL } = require('../../proGate');

const NETWORK_AND_STORE_SPIES = () => [
  ['supabase.rpc', mockRpc],
  ['supabase.functions.invoke', mockInvoke],
  ['store.setState', mockSetState],
  ['react-native-iap', mockProviderCall],
  ['scheduler.scheduleWinbackNotification', mockScheduleWinback],
];

beforeEach(() => {
  jest.clearAllMocks();
});

function expectNothingTouched() {
  for (const [name, spy] of NETWORK_AND_STORE_SPIES()) {
    expect([name, spy.mock.calls.length]).toEqual([name, 0]);
  }
}

test('the boundary this suite is written against is actually on', () => {
  expect(FULL_ACCESS_FOR_ALL).toBe(true);
});

describe('every guarded barrel export answers billing_disabled', () => {
  const CASES = [
    ['cascade.startCascade', () => payments.cascade.startCascade()],
    ['cascade.payAt', () => payments.cascade.payAt('pro', 'ref-1', 'test')],
    ['cascade.confirmPurchase', () => payments.cascade.confirmPurchase({
      purchaseToken: 'tok', subscriptionId: 'pro_monthly',
    })],
    ['cascade.reconcilePaidEntitlement', () => payments.cascade.reconcilePaidEntitlement({
      trialState: 'paid_pro',
    })],
    ['restorePurchases', () => payments.restorePurchases({ currentTrialState: 'paid_pro' })],
    ['handlePotentialLapse', () => payments.handlePotentialLapse(
      { checked: true, active: false }, 'u1',
    )],
    ['playBilling.initialise', () => payments.playBilling.initialise({ appUserID: 'u1' })],
    ['playBilling.ensureBillingForUser', () => payments.playBilling.ensureBillingForUser('u1')],
    ['playBilling.purchasePackage', () => payments.playBilling.purchasePackage('pro_monthly')],
    ['playBilling.restorePurchases', () => payments.playBilling.restorePurchases()],
    ['playBilling.getCustomerInfo', () => payments.playBilling.getCustomerInfo()],
  ];

  test.each(CASES)('%s resolves { ok: false, error: billing_disabled }', async (_name, call) => {
    const r = await call();
    expect(r.ok).toBe(false);
    expect(r.error).toBe('billing_disabled');
  });

  test.each(CASES)('%s reaches neither the network, the store, the SDK nor the OS queue', async (_name, call) => {
    await call();
    expectNothingTouched();
  });

  test.each(CASES)('%s never throws (callers await it on launch and tap paths)', async (_name, call) => {
    await expect(call()).resolves.toBeDefined();
  });
});

describe('the disabled answers are the shapes their callers read', () => {
  test('reconcilePaidEntitlement reads as "nothing observed", never as a lapse', async () => {
    const { isAuthoritativeLapse, isConfirmedActive } = require('../lapseDetect');
    const r = await payments.cascade.reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r.checked).toBe(false);
    // Both must be false: a lapse would open a churn episode and lay a
    // win-back for a product nobody pays for.
    expect(isAuthoritativeLapse(r)).toBe(false);
    expect(isConfirmedActive(r)).toBe(false);
  });

  test('the answer object is frozen, so no caller can mutate the shared no-op', async () => {
    const r = await payments.cascade.startCascade();
    expect(Object.isFrozen(r)).toBe(true);
  });
});

describe('the dormant infrastructure is retained, not deleted', () => {
  test('the pure read helpers still pass through the barrel', () => {
    expect(typeof payments.cascade.stageOf).toBe('function');
    expect(typeof payments.cascade.trialEndsAtMs).toBe('function');
    expect(typeof payments.cascade.canStillTrial).toBe('function');
    expect(payments.cascade.stageOf({ trialState: 'paid_pro' })).toBe('paid');
  });

  test('the product identifiers are unchanged and still reachable', () => {
    // docs/rules/billing.md: pro_monthly / pro_annual NEVER change.
    expect(payments.catalogue.allSkuIds()).toEqual(
      expect.arrayContaining(['pro_monthly', 'pro_annual']),
    );
  });

  test('the underlying modules are still importable and still export their real implementations', () => {
    // The boundary is the barrel. Direct imports keep working so the modules
    // stay unit-testable, which is what their own suites do.
    const cascadeImpl = require('../cascade');
    expect(typeof cascadeImpl.startCascade).toBe('function');
    expect(cascadeImpl.startCascade).not.toBe(payments.cascade.startCascade);
  });
});
