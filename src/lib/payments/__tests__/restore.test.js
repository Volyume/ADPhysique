/**
 * SUB-003: restore re-verifies the entitlement server-side, AWAITED (not
 * fire-and-forget), matching the purchase paths. A failed confirm does not fail
 * the restore (Play already reported the entitlement and payAt unlocked
 * optimistically); the outcome is returned as serverConfirmed.
 */
jest.mock('../playBilling');
jest.mock('../cascade');
jest.mock('../../errorLog', () => ({ logInfo: jest.fn(), logWarn: jest.fn() }));

import * as playBilling from '../playBilling';
import { payAt, confirmPurchase } from '../cascade';
import { restorePurchases } from '../restore';

describe('restorePurchases server confirmation (SUB-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    payAt.mockResolvedValue({ ok: true });
  });

  test('awaits confirmPurchase and reports serverConfirmed on success', async () => {
    playBilling.restorePurchases.mockResolvedValue({
      activeEntitlements: ['pro'],
      latestPurchaseToken: 'tok',
      activeSku: 'pro_monthly',
      latestTransactionId: 'tx1',
    });
    confirmPurchase.mockResolvedValue({ ok: true });

    const res = await restorePurchases();

    expect(confirmPurchase).toHaveBeenCalledWith({ purchaseToken: 'tok', subscriptionId: 'pro_monthly' });
    expect(res.ok).toBe(true);
    expect(res.tier).toBe('pro');
    expect(res.serverConfirmed).toBe(true);
  });

  test('a failed confirm does not fail the restore (optimistic unlock holds)', async () => {
    playBilling.restorePurchases.mockResolvedValue({
      activeEntitlements: ['pro'],
      latestPurchaseToken: 'tok',
      activeSku: 'pro_monthly',
    });
    confirmPurchase.mockResolvedValue({ ok: false, error: 'invoke_failed' });

    const res = await restorePurchases();

    expect(res.ok).toBe(true);
    expect(res.serverConfirmed).toBe(false);
  });

  test('nothing to restore short-circuits without a confirm call', async () => {
    playBilling.restorePurchases.mockResolvedValue({ activeEntitlements: [] });

    const res = await restorePurchases();

    expect(res.tier).toBeNull();
    expect(confirmPurchase).not.toHaveBeenCalled();
  });
});
