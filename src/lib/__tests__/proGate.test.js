/**
 * Tests for the proGate tier resolver.
 *
 * Gating is binary (Pro or Free) per the 2026-05-29 founder decision;
 * the granular FEATURE_MAP / hasFeature / hasGoalUnlock / PRO_ROUTES
 * layer was removed as never-wired dead code, so its tests went with it.
 *
 * FULLY-FREE PRODUCT (founder decision 2026-09-03). Volyume has no trial,
 * no Free/Pro split, no paywall and no expiry: FULL_ACCESS_FOR_ALL is the
 * override and every user resolves to 'pro'. The FREE EXPECTATIONS BELOW
 * ARE THEREFORE INVERTED from what this suite pinned before - a state that
 * used to resolve 'free' now resolves 'pro', by decision, not by defect.
 *
 * The dormant state machine is still pinned in full: `_resolveTier(state,
 * false)` maps every trial_state exactly as it always did, so flipping
 * FULL_ACCESS_FOR_ALL back to false restores known behaviour rather than
 * untested behaviour.
 */

const realProGate = require('../proGate');

describe('the fully-free override', () => {
  test('FULL_ACCESS_FOR_ALL is on, and PRO_BETA_ACTIVE is its alias', () => {
    expect(realProGate.FULL_ACCESS_FOR_ALL).toBe(true);
    // Every historic import site reads PRO_BETA_ACTIVE; it must mean exactly
    // the same thing or half the app would resolve a different tier.
    expect(realProGate.PRO_BETA_ACTIVE).toBe(realProGate.FULL_ACCESS_FOR_ALL);
  });
});

describe('proGate live isPaidTier (fully free: everyone is pro)', () => {
  test('every trial state, and no profile at all, resolves to pro', () => {
    expect(realProGate.isPaidTier({ trialState: 'paid_pro' })).toBe('pro');
    expect(realProGate.isPaidTier({ trialState: 'pro_trial_active' })).toBe('pro');
    // INVERTED: these five each returned 'free' before the fully-free decision.
    expect(realProGate.isPaidTier({ trialState: 'free' })).toBe('pro');
    expect(realProGate.isPaidTier({ trialState: 'cascade_expired' })).toBe('pro');
    expect(realProGate.isPaidTier({ trialState: 'unstarted' })).toBe('pro');
    expect(realProGate.isPaidTier(null)).toBe('pro');
    expect(realProGate.isPaidTier({})).toBe('pro');
  });

  test('a lapsed or never-started user is never demoted (no paywall exists)', () => {
    for (const state of [null, undefined, 'free', 'cascade_expired', 'unstarted', 'nonsense']) {
      expect(realProGate.isPaidTier({ trialState: state })).toBe('pro');
    }
  });
});

// _resolveTier is the pure version of isPaidTier that takes the beta
// flag as a parameter, so we can exercise every trial_state branch
// including the post-beta path without globally mocking PRO_BETA_ACTIVE.
// The DORMANT state machine. This is what comes back if FULL_ACCESS_FOR_ALL
// is ever flipped to false, so it stays pinned exactly as it was.
describe('_resolveTier (dormant entitlement state machine, override=false)', () => {
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

  test('override=true (the live setting) forces pro whatever the state', () => {
    expect(realProGate._resolveTier('free', true)).toBe('pro');
    expect(realProGate._resolveTier(null, true)).toBe('pro');
    expect(realProGate._resolveTier('paid_pro', true)).toBe('pro');
  });
});
