/**
 * SUB-003: restore re-verifies the entitlement server-side, AWAITED (not
 * fire-and-forget), matching the purchase paths. A failed confirm fails
 * the restore. Store-local entitlement presence is not proof that the signed-in
 * Supabase caller owns the purchase, so payAt must remain untouched until the
 * buyer-bound server verifier succeeds.
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

  test('a failed buyer-bound confirmation fails closed without optimistic unlock', async () => {
    playBilling.restorePurchases.mockResolvedValue({
      activeEntitlements: ['pro'],
      latestPurchaseToken: 'tok',
      activeSku: 'pro_monthly',
    });
    confirmPurchase.mockResolvedValue({ ok: false, error: 'invoke_failed' });

    const res = await restorePurchases();

    expect(res).toEqual({ ok: false, error: 'invoke_failed' });
    expect(payAt).not.toHaveBeenCalled();
  });

  test('an unexpected confirmation rejection cannot optimistically unlock', async () => {
    playBilling.restorePurchases.mockResolvedValue({
      activeEntitlements: ['pro'],
      latestPurchaseToken: 'tok',
      activeSku: 'pro_monthly',
    });
    confirmPurchase.mockRejectedValue(new Error('verifier unavailable'));

    await expect(restorePurchases()).rejects.toThrow('verifier unavailable');
    expect(payAt).not.toHaveBeenCalled();
  });

  test('a store entitlement without verifier material fails closed', async () => {
    playBilling.restorePurchases.mockResolvedValue({
      activeEntitlements: ['pro'],
      latestTransactionId: 'tx-without-token',
    });

    const res = await restorePurchases();

    expect(res).toEqual({ ok: false, error: 'missing_purchase_token' });
    expect(confirmPurchase).not.toHaveBeenCalled();
    expect(payAt).not.toHaveBeenCalled();
  });

  test('already-current restore still proves buyer binding before success', async () => {
    playBilling.restorePurchases.mockResolvedValue({
      activeEntitlements: ['pro'],
      latestPurchaseToken: 'tok',
      activeSku: 'pro_monthly',
      latestTransactionId: 'tx1',
    });
    confirmPurchase.mockResolvedValue({ ok: true });

    const res = await restorePurchases({ currentTrialState: 'paid_pro' });

    expect(res).toEqual({
      ok: true, tier: 'pro', alreadyCurrent: true, serverConfirmed: true,
    });
    expect(confirmPurchase).toHaveBeenCalledTimes(1);
    expect(payAt).not.toHaveBeenCalled();
  });

  test('nothing to restore short-circuits without a confirm call', async () => {
    playBilling.restorePurchases.mockResolvedValue({ activeEntitlements: [] });

    const res = await restorePurchases();

    expect(res.tier).toBeNull();
    expect(confirmPurchase).not.toHaveBeenCalled();
  });
});
