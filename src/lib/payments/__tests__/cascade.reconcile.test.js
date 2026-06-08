/**
 * C-2 client safety net (trial-subscription audit 2026-06-08).
 * reconcilePaidEntitlement must downgrade a paid_pro user only when the REAL
 * Play provider definitively reports no active entitlement, and must never
 * revoke on a non-paid user, on the stub provider, or on a failed Play read.
 * Runtime-critical (payments) per CLAUDE.md Rule 7.
 */

const mockRpc = jest.fn();
jest.mock('../../supabase', () => ({ getSupabaseClient: () => ({ rpc: mockRpc }) }));
jest.mock('../../../store/useAppStore', () => ({
  default: { getState: () => ({ user: null, setOptimisticPaid: jest.fn() }) },
}));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

let mockIsReal = true;
const mockGetCustomerInfo = jest.fn();
jest.mock('../playBilling', () => ({
  isReal: () => mockIsReal,
  getCustomerInfo: (...a) => mockGetCustomerInfo(...a),
}));

import { reconcilePaidEntitlement } from '../cascade';

const REVOKE_PAYLOAD = {
  _target_tier: 'free',
  _reason: 'user_cancelled',
  _source_surface: 'client_reconcile',
  _payment_ref: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsReal = true;
  mockRpc.mockResolvedValue({ data: {}, error: null });
});

describe('reconcilePaidEntitlement (C-2 safety net)', () => {
  test('no-op for a non-paid user', async () => {
    const r = await reconcilePaidEntitlement({ trialState: 'pro_trial_active' });
    expect(r.checked).toBe(false);
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('no-op on the stub provider (isReal false) — never read as lapsed', async () => {
    mockIsReal = false;
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r.checked).toBe(false);
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('never revokes on a failed Play read (transient)', async () => {
    mockGetCustomerInfo.mockRejectedValue(new Error('network'));
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r.checked).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('keeps Pro when Play reports an active entitlement', async () => {
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: ['pro'] });
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('downgrades when Play reports no active entitlement', async () => {
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: [] });
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: false, downgraded: true });
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', REVOKE_PAYLOAD);
  });

  test('accepts the snake_case trial_state field too', async () => {
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: [] });
    await reconcilePaidEntitlement({ trial_state: 'paid_pro' });
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', REVOKE_PAYLOAD);
  });
});
