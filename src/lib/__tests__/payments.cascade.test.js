/**
 * Tests for the cascade state-machine wrapper (src/lib/payments/cascade.js).
 *
 * The actual state machine lives server-side in migration 030's
 * start_cascade + upgrade_tier RPCs. This module is a thin client
 * wrapper. We assert it (a) calls the right RPC with the right args
 * for each verb, (b) maps RPC failures into the { ok: false } shape
 * without throwing, (c) computes pure helpers correctly.
 */

const mockRpc = jest.fn();
const mockClient = { rpc: (...args) => mockRpc(...args) };

jest.mock('../supabase', () => ({
  getSupabaseClient: () => mockClient,
}));

jest.mock('../errorLog', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

const cascade = require('../payments/cascade');

beforeEach(() => {
  mockRpc.mockReset();
});

// ── State-changing verbs ─────────────────────────────────────────────

describe('startCascade', () => {
  test('calls start_cascade RPC with no args', async () => {
    mockRpc.mockResolvedValue({ data: { trial_state: 'complete_trial_active' }, error: null });
    const r = await cascade.startCascade();
    expect(mockRpc).toHaveBeenCalledWith('start_cascade', {});
    expect(r.ok).toBe(true);
    expect(r.data.trial_state).toBe('complete_trial_active');
  });

  test('returns { ok: false } on RPC error without throwing', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc bang' } });
    const r = await cascade.startCascade();
    expect(r.ok).toBe(false);
    expect(r.error).toBe('rpc bang');
  });

  test('returns { ok: false } on RPC throw', async () => {
    mockRpc.mockRejectedValue(new Error('network out'));
    const r = await cascade.startCascade();
    expect(r.ok).toBe(false);
    expect(r.error).toBe('network out');
  });
});

describe('payAt', () => {
  test('user paying for complete calls upgrade_tier correctly', async () => {
    mockRpc.mockResolvedValue({ data: { trial_state: 'paid_complete' }, error: null });
    const r = await cascade.payAt('complete', 'txn_123', 'cascade_day14_gate');
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', {
      _target_tier: 'complete',
      _reason: 'user_paid',
      _source_surface: 'cascade_day14_gate',
      _payment_ref: 'txn_123',
    });
    expect(r.ok).toBe(true);
  });

  test('rejects payment without payment_ref before any RPC call', async () => {
    const r = await cascade.payAt('pro', null, 'paywall');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, error: 'payment_ref_required' });
  });

  test('rejects invalid target tier before any RPC call', async () => {
    const r = await cascade.payAt('platinum', 'txn_1', 'paywall');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, error: 'invalid_target_tier' });
  });
});

describe('skipToFree / skipToPro', () => {
  test('skipToFree sends user_skip → free', async () => {
    mockRpc.mockResolvedValue({ data: { trial_state: 'free' }, error: null });
    await cascade.skipToFree('cascade_day14_gate');
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', {
      _target_tier: 'free',
      _reason: 'user_skip',
      _source_surface: 'cascade_day14_gate',
      _payment_ref: null,
    });
  });

  test('skipToPro sends user_skip → pro', async () => {
    mockRpc.mockResolvedValue({ data: { trial_state: 'pro_trial_active' }, error: null });
    await cascade.skipToPro('cascade_day14_gate');
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', expect.objectContaining({
      _target_tier: 'pro',
      _reason: 'user_skip',
    }));
  });
});

describe('autoDowngrade', () => {
  test('day-14 worker: complete → pro auto downgrade', async () => {
    mockRpc.mockResolvedValue({ data: { trial_state: 'pro_trial_active' }, error: null });
    await cascade.autoDowngrade('pro', 'cascade_day14_worker');
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', expect.objectContaining({
      _target_tier: 'pro',
      _reason: 'auto_downgrade',
    }));
  });

  test('day-28 worker: pro → free auto downgrade', async () => {
    mockRpc.mockResolvedValue({ data: { trial_state: 'cascade_expired' }, error: null });
    await cascade.autoDowngrade('free', 'cascade_day28_worker');
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', expect.objectContaining({
      _target_tier: 'free',
      _reason: 'auto_downgrade',
    }));
  });

  test('rejects invalid target (only pro/free permitted)', async () => {
    const r = await cascade.autoDowngrade('complete', 'cascade_day14_worker');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(r.ok).toBe(false);
  });
});

describe('cancel / graceLapsed / refunded', () => {
  test.each([
    ['cancel',      'user_cancelled', 'play_billing_rtdn'],
    ['graceLapsed', 'grace_lapsed',   'grace_timer'],
    ['refunded',    'refunded',       'play_billing_rtdn'],
  ])('%s fires upgrade_tier with %s reason and default surface %s', async (verb, reason, defaultSurface) => {
    mockRpc.mockResolvedValue({ data: { trial_state: 'free' }, error: null });
    await cascade[verb]();
    expect(mockRpc).toHaveBeenCalledWith('upgrade_tier', expect.objectContaining({
      _target_tier: 'free',
      _reason: reason,
      _source_surface: defaultSurface,
    }));
  });
});

// ── Pure helpers ────────────────────────────────────────────────────

describe('stageOf', () => {
  test.each([
    [{ trialState: 'unstarted' },             'unstarted'],
    [{ trialState: 'complete_trial_active' }, 'complete_trial'],
    [{ trialState: 'pro_trial_active' },      'pro_trial'],
    [{ trialState: 'paid_complete' },         'paid'],
    [{ trialState: 'paid_pro' },              'paid'],
    [{ trialState: 'free' },                  'free'],
    [{ trialState: 'cascade_expired' },       'free'],
    [{},                                      'unstarted'],
    [null,                                    'unstarted'],
  ])('%j → %s', (profile, expected) => {
    expect(cascade.stageOf(profile)).toBe(expected);
  });

  test('accepts snake_case trial_state from raw cloud payloads', () => {
    expect(cascade.stageOf({ trial_state: 'paid_pro' })).toBe('paid');
  });
});

describe('canStillTrial', () => {
  test('true only for unstarted users', () => {
    expect(cascade.canStillTrial({ trialState: 'unstarted' })).toBe(true);
    expect(cascade.canStillTrial({ trialState: 'free' })).toBe(false);
    expect(cascade.canStillTrial({ trialState: 'paid_pro' })).toBe(false);
    expect(cascade.canStillTrial({ trialState: 'cascade_expired' })).toBe(false);
    expect(cascade.canStillTrial(null)).toBe(true);
  });
});

describe('daysRemaining', () => {
  const NOW = new Date('2026-06-01T10:00:00Z').getTime();

  test('null when not in a trial', () => {
    expect(cascade.daysRemaining({ trialState: 'free' }, NOW)).toBeNull();
    expect(cascade.daysRemaining({ trialState: 'paid_pro' }, NOW)).toBeNull();
    expect(cascade.daysRemaining({ trialState: 'unstarted' }, NOW)).toBeNull();
  });

  test('counts down to completeTrialEndsAt during complete trial', () => {
    const endsAt = new Date('2026-06-08T10:00:00Z').toISOString(); // +7 days
    const r = cascade.daysRemaining(
      { trialState: 'complete_trial_active', completeTrialEndsAt: endsAt },
      NOW,
    );
    expect(r).toBe(7);
  });

  test('counts down to proTrialEndsAt during pro trial', () => {
    const endsAt = new Date('2026-06-04T10:00:00Z').toISOString(); // +3 days
    const r = cascade.daysRemaining(
      { trialState: 'pro_trial_active', proTrialEndsAt: endsAt },
      NOW,
    );
    expect(r).toBe(3);
  });

  test('returns 0 at the exact cutover moment, never negative', () => {
    const past = new Date('2026-05-30T00:00:00Z').toISOString();
    const r = cascade.daysRemaining(
      { trialState: 'complete_trial_active', completeTrialEndsAt: past },
      NOW,
    );
    expect(r).toBe(0);
  });

  test('null when end timestamp missing or invalid', () => {
    expect(cascade.daysRemaining({ trialState: 'complete_trial_active' }, NOW)).toBeNull();
    expect(cascade.daysRemaining({
      trialState: 'complete_trial_active', completeTrialEndsAt: 'not-a-date',
    }, NOW)).toBeNull();
  });

  test('accepts snake_case end timestamps from raw cloud payloads', () => {
    const endsAt = new Date('2026-06-15T10:00:00Z').toISOString();
    expect(cascade.daysRemaining(
      { trial_state: 'complete_trial_active', complete_trial_ends_at: endsAt },
      NOW,
    )).toBe(14);
  });
});
