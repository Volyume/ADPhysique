/**
 * Tests for the proGate tier resolver.
 *
 * Gating is binary (Pro or Free) per the 2026-05-29 founder decision;
 * the granular FEATURE_MAP / hasFeature / hasGoalUnlock / PRO_ROUTES
 * layer was removed as never-wired dead code, so its tests went with it.
 * What remains: the live surface (isPaidTier + the _resolveTier state
 * machine), with the beta-vs-post-beta paths exercised explicitly.
 */

const realProGate = require('../proGate');

describe('proGate live isPaidTier (production, PRO_BETA_ACTIVE = false)', () => {
  test('reads the real trial state: paid and active trial are pro, the rest free', () => {
    expect(realProGate.isPaidTier({ trialState: 'paid_pro' })).toBe('pro');
    expect(realProGate.isPaidTier({ trialState: 'pro_trial_active' })).toBe('pro');
    expect(realProGate.isPaidTier({ trialState: 'free' })).toBe('free');
    expect(realProGate.isPaidTier({ trialState: 'cascade_expired' })).toBe('free');
    expect(realProGate.isPaidTier({ trialState: 'unstarted' })).toBe('free');
    expect(realProGate.isPaidTier(null)).toBe('free');
    expect(realProGate.isPaidTier({})).toBe('free');
  });
});

// _resolveTier is the pure version of isPaidTier that takes the beta
// flag as a parameter, so we can exercise every trial_state branch
// including the post-beta path without globally mocking PRO_BETA_ACTIVE.
describe('_resolveTier (post-beta state machine, beta=false)', () => {
  const r = (state) => realProGate._resolveTier(state, false);

  test.each([
    // 2-tier model: complete_* states map to 'pro' (legacy schema
    // values still resolve to the equivalent entitlement).
    ['paid_complete',         'pro'],
    ['complete_trial_active', 'pro'],
    ['paid_pro',              'pro'],
    ['pro_trial_active',      'pro'],
    ['free',                  'free'],
    ['cascade_expired',       'free'],
    ['unstarted',             'free'],
    [null,                    'free'],
    [undefined,               'free'],
    ['unknown_state',         'free'],
  ])('trial_state %s -> %s', (state, expected) => {
    expect(r(state)).toBe(expected);
  });

  test('beta=true overrides everything to pro', () => {
    expect(realProGate._resolveTier('free', true)).toBe('pro');
    expect(realProGate._resolveTier(null, true)).toBe('pro');
    expect(realProGate._resolveTier('paid_pro', true)).toBe('pro');
  });
});
