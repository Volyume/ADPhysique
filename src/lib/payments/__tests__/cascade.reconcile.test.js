/**
 * C-2 / SUB-002 client safety net (trial-subscription audit 2026-06-08).
 *
 * reconcilePaidEntitlement must:
 *   * downgrade a paid_pro user via the server when the REAL Play provider
 *     definitively reports no active entitlement;
 *   * never revoke on a non-paid user, or on a transient failure WITHIN the
 *     offline grace window;
 *   * past the grace window, when the entitlement cannot be confirmed (no real
 *     provider, or a failing read), lock the device down LOCALLY (SUB-002);
 *   * refresh the last-verified clock on a confirmed-active read.
 * Runtime-critical (payments) per CLAUDE.md Rule 7.
 */

const mockRpc = jest.fn();
jest.mock('../../supabase', () => ({ getSupabaseClient: () => ({ rpc: mockRpc }) }));

let mockLastVerified = null;
const mockMarkVerified = jest.fn(() => Promise.resolve());
const mockLockStale = jest.fn(() => Promise.resolve());
jest.mock('../../../store/useAppStore', () => ({
  default: {
    getState: () => ({
      user: null,
      setOptimisticPaid: jest.fn(),
      readPaidEntitlementVerifiedAt: () => Promise.resolve(mockLastVerified),
      markPaidEntitlementVerified: mockMarkVerified,
      lockStalePaidEntitlement: mockLockStale,
    }),
  },
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

const DAY_MS = 24 * 60 * 60 * 1000;
const within = () => Date.now() - DAY_MS / 2;   // verified 12h ago: within grace
const stale = () => Date.now() - DAY_MS * 2;     // verified 48h ago: past grace

beforeEach(() => {
  jest.clearAllMocks();
  mockIsReal = true;
  mockLastVerified = null;
  mockRpc.mockResolvedValue({ data: {}, error: null });
});

describe('reconcilePaidEntitlement (C-2 safety net)', () => {
  test('no-op for a non-paid user', async () => {
    const r = await reconcilePaidEntitlement({ trialState: 'pro_trial_active' });
    expect(r.checked).toBe(false);
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('keeps Pro when Play reports an active entitlement, and refreshes the clock', async () => {
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: ['pro'] });
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: true });
    expect(mockMarkVerified).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('downgrades via the server when Play reports no active entitlement', async () => {
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: [] });
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: false, downgraded: true });
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', REVOKE_PAYLOAD);
    expect(mockLockStale).not.toHaveBeenCalled();
  });

  test('accepts the snake_case trial_state field too', async () => {
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: [] });
    await reconcilePaidEntitlement({ trial_state: 'paid_pro' });
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', REVOKE_PAYLOAD);
  });

  // audit 2026-07-01: a SUCCESSFUL read can be transiently empty (Play cache lag
  // right after purchase). Do not revoke a payer Play confirmed active within
  // grace on a single such read — defer and re-check.
  test('defers (does NOT downgrade) an inactive read when Play confirmed active within grace', async () => {
    mockLastVerified = within(); // verified active 12h ago
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: [] });
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: false, deferred: true });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockLockStale).not.toHaveBeenCalled();
  });

  test('downgrades an inactive read when the last active verification is PAST grace', async () => {
    mockLastVerified = stale(); // verified active 48h ago
    mockGetCustomerInfo.mockResolvedValue({ activeEntitlements: [] });
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: false, downgraded: true });
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', REVOKE_PAYLOAD);
  });
});

describe('reconcilePaidEntitlement offline grace (SUB-002)', () => {
  test('stub provider within grace is a no-op (never read as lapsed)', async () => {
    mockIsReal = false;
    mockLastVerified = within();
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r.checked).toBe(false);
    expect(mockLockStale).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('stub provider PAST grace locks the device down locally', async () => {
    mockIsReal = false;
    mockLastVerified = stale();
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: false, downgraded: true, reason: 'stale_no_provider' });
    expect(mockLockStale).toHaveBeenCalledTimes(1);
    // Local lockdown only: no server revoke RPC.
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('failed read within grace defers (never revoke on a transient blip)', async () => {
    mockGetCustomerInfo.mockRejectedValue(new Error('network'));
    mockLastVerified = within();
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r.checked).toBe(false);
    expect(mockLockStale).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('failed read PAST grace locks the device down locally', async () => {
    mockGetCustomerInfo.mockRejectedValue(new Error('network'));
    mockLastVerified = stale();
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r).toMatchObject({ checked: true, active: false, downgraded: true, reason: 'stale_read_failed' });
    expect(mockLockStale).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('no last-verified anchor never locks down (self-seeds on first good read)', async () => {
    // A legacy paid user with no recorded timestamp must not be locked out: the
    // grace window has no anchor, so we defer until a successful read seeds it.
    mockGetCustomerInfo.mockRejectedValue(new Error('network'));
    mockLastVerified = null;
    const r = await reconcilePaidEntitlement({ trialState: 'paid_pro' });
    expect(r.checked).toBe(false);
    expect(mockLockStale).not.toHaveBeenCalled();
  });
});
