/**
 * Behavioural coverage for the cascade lifecycle: the mutating verbs must call
 * the upgrade_tier / start_cascade RPC with the exact server-contract payload
 * (the server is authoritative for tier), and the pure read helpers must map
 * trial_state correctly. The existing twoTierGuard test is a source grep; this
 * exercises the actual calls. Runtime-critical (payments) per CLAUDE.md Rule 7.
 */

const mockRpc = jest.fn();
jest.mock('../../supabase', () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));
// _trackTransition reads the store lazily (no signed-in user, returns early);
// payAt calls setOptimisticPaid (C-1 optimistic unlock), captured here.
const mockSetOptimisticPaid = jest.fn();
jest.mock('../../../store/useAppStore', () => ({
  default: { getState: () => ({ user: null, setOptimisticPaid: mockSetOptimisticPaid }) },
}));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

import {
  payAt, skipToFree, autoDowngrade, cancel, graceLapsed, refunded, skipToPro,
  stageOf, canStillTrial, daysRemaining,
} from '../cascade';

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockResolvedValue({ data: {}, error: null });
});

describe('cascade lifecycle verbs call upgrade_tier with the right payload', () => {
  test('payAt(pro) unlocks optimistically and does NOT write the tier (C-1)', async () => {
    // The paid grant is server-authoritative (RTDN). payAt must NOT call
    // upgrade_tier; it only sets the optimistic local unlock.
    const r = await payAt('pro', 'gpa.123', 'paywall');
    expect(r).toEqual({ ok: true, optimistic: true });
    expect(mockSetOptimisticPaid).toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalledWith('upgrade_tier', expect.objectContaining({ _reason: 'user_paid' }));
  });

  test('payAt rejects a missing payment ref without hitting the RPC', async () => {
    const r = await payAt('pro', '', 'paywall');
    expect(r).toEqual({ ok: false, error: 'payment_ref_required' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('payAt rejects a non-pro target (2-tier model) without hitting the RPC', async () => {
    const r = await payAt('complete', 'gpa.123', 'paywall');
    expect(r).toEqual({ ok: false, error: 'invalid_target_tier' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('skipToFree → upgrade_tier user_skip → free', async () => {
    await skipToFree('day14_gate');
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', {
      _target_tier: 'free', _reason: 'user_skip', _source_surface: 'day14_gate', _payment_ref: null,
    });
  });

  test('autoDowngrade(free) → upgrade_tier auto_downgrade; rejects non-free', async () => {
    await autoDowngrade('free', 'trial_expiry');
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', {
      _target_tier: 'free', _reason: 'auto_downgrade', _source_surface: 'trial_expiry', _payment_ref: null,
    });
    mockRpc.mockClear();
    const bad = await autoDowngrade('pro', 'x');
    expect(bad).toEqual({ ok: false, error: 'invalid_auto_downgrade_target' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('cancel / graceLapsed / refunded all downgrade to free with their own reason', async () => {
    await cancel();
    await graceLapsed();
    await refunded();
    const reasons = mockRpc.mock.calls.map(([, args]) => args._reason);
    expect(reasons).toEqual(['user_cancelled', 'grace_lapsed', 'refunded']);
    expect(mockRpc.mock.calls.every(([, a]) => a._target_tier === 'free')).toBe(true);
  });

  test('skipToPro is removed in the 2-tier model and never calls the RPC', async () => {
    const r = await skipToPro();
    expect(r).toEqual({ ok: false, error: 'skip_to_pro_removed_in_2_tier_model' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('an RPC error surfaces as { ok:false } and never throws', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    // Use a verb that still hits the RPC (payAt is now optimistic/no-RPC).
    const r = await skipToFree('day14_gate');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('boom');
  });
});

describe('cascade pure read helpers', () => {
  test('stageOf maps each trial_state (incl. legacy complete_*)', () => {
    expect(stageOf({ trialState: 'unstarted' })).toBe('unstarted');
    expect(stageOf({ trialState: 'pro_trial_active' })).toBe('pro_trial');
    expect(stageOf({ trialState: 'complete_trial_active' })).toBe('pro_trial');
    expect(stageOf({ trialState: 'paid_pro' })).toBe('paid');
    expect(stageOf({ trialState: 'paid_complete' })).toBe('paid');
    expect(stageOf({ trialState: 'cascade_expired' })).toBe('free');
    expect(stageOf({ trialState: 'free' })).toBe('free');
    expect(stageOf({})).toBe('unstarted');
  });

  test('canStillTrial is true only for an unstarted user', () => {
    expect(canStillTrial({ trialState: 'unstarted' })).toBe(true);
    expect(canStillTrial({ trialState: 'pro_trial_active' })).toBe(false);
    expect(canStillTrial({ trialState: 'cascade_expired' })).toBe(false);
  });

  test('daysRemaining counts down within a trial and is null/0 otherwise', () => {
    const now = Date.UTC(2026, 5, 6);
    const in5 = now + 5 * 24 * 60 * 60 * 1000;
    expect(daysRemaining({ trialState: 'pro_trial_active', proTrialEndsAt: in5 }, now)).toBe(5);
    // past end → 0, never negative
    expect(daysRemaining({ trialState: 'pro_trial_active', proTrialEndsAt: now - 1 }, now)).toBe(0);
    // not in a trial → null
    expect(daysRemaining({ trialState: 'paid_pro', proTrialEndsAt: in5 }, now)).toBeNull();
    expect(daysRemaining({ trialState: 'unstarted' }, now)).toBeNull();
  });
});
