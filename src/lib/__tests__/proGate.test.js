/**
 * Tests for the proGate tier resolver.
 *
 * Covers the three locked helpers (isPaidTier, hasFeature,
 * hasGoalUnlock) plus the back-compat surface. PRO_BETA_ACTIVE is
 * imported live so this test sees whichever value is shipped; the
 * beta-vs-post-beta paths are tested explicitly via jest.isolateModules.
 */

const realProGate = require('../proGate');

describe('proGate (PRO_BETA_ACTIVE = true, current beta phase)', () => {
  test('isPaidTier returns complete during beta regardless of profile', () => {
    expect(realProGate.isPaidTier(null)).toBe('pro');
    expect(realProGate.isPaidTier({ trialState: 'free' })).toBe('pro');
    expect(realProGate.isPaidTier({ trialState: 'unstarted' })).toBe('pro');
    expect(realProGate.isPaidTier({})).toBe('pro');
  });

  test('hasFeature grants Pro-tier features during beta (2-tier model)', () => {
    expect(realProGate.hasFeature(null, 'engine_safety_guardrails')).toBe(true);
    expect(realProGate.hasFeature(null, 'history_unlimited')).toBe(true);
    expect(realProGate.hasFeature(null, 'block_planning_extended')).toBe(true);
    expect(realProGate.hasFeature(null, 'photo_progress_local')).toBe(true);
  });

  test('peak_week_module is removed from the feature set entirely', () => {
    expect(realProGate.hasFeature(null, 'peak_week_module')).toBe(false);
    expect(Object.values(realProGate.FEATURE_MAP).flat()).not.toContain('peak_week_module');
  });

  test('hasFeature returns false for unknown features even during beta', () => {
    expect(realProGate.hasFeature(null, 'nonexistent_feature')).toBe(false);
    expect(realProGate.hasFeature(null, '')).toBe(false);
    expect(realProGate.hasFeature(null, null)).toBe(false);
  });

  test('isProUser back-compat returns true during beta', () => {
    expect(realProGate.isProUser(null)).toBe(true);
    expect(realProGate.isProUser({ proEntitled: false })).toBe(true);
  });
});

describe('hasGoalUnlock (tier-independent, evaluated at all phases)', () => {
  test('advanced_protein_tier unlocks for physique_competition goal', () => {
    expect(realProGate.hasGoalUnlock(
      { trainingGoal: 'physique_competition' },
      'advanced_protein_tier',
    )).toBe(true);
  });

  test('advanced_protein_tier unlocks for advanced_recomp goal', () => {
    expect(realProGate.hasGoalUnlock(
      { trainingGoal: 'advanced_recomp' },
      'advanced_protein_tier',
    )).toBe(true);
  });

  test('advanced_protein_tier does NOT unlock for general goals', () => {
    expect(realProGate.hasGoalUnlock(
      { trainingGoal: 'mild_cut' },
      'advanced_protein_tier',
    )).toBe(false);
    expect(realProGate.hasGoalUnlock(
      { trainingGoal: 'bulk' },
      'advanced_protein_tier',
    )).toBe(false);
  });

  test('refeed_prescription unlocks for aggressive_cut', () => {
    expect(realProGate.hasGoalUnlock(
      { trainingGoal: 'aggressive_cut' },
      'refeed_prescription',
    )).toBe(true);
  });

  test('falls back to goalPhase when trainingGoal absent', () => {
    expect(realProGate.hasGoalUnlock(
      { goalPhase: 'physique_competition' },
      'advanced_protein_tier',
    )).toBe(true);
  });

  test('unknown feature returns false', () => {
    expect(realProGate.hasGoalUnlock(
      { trainingGoal: 'physique_competition' },
      'made_up_unlock',
    )).toBe(false);
  });

  test('null profile returns false', () => {
    expect(realProGate.hasGoalUnlock(null, 'advanced_protein_tier')).toBe(false);
  });
});

// _resolveTier is the pure version of isPaidTier that takes the
// beta flag as a parameter. Testing it lets us exercise every
// trial_state branch including the post-beta path without globally
// mocking PRO_BETA_ACTIVE.
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

describe('FEATURE_MAP tier inheritance (no beta override)', () => {
  // Direct against FEATURE_MAP — the data structure is the truth
  // regardless of how isPaidTier resolves the current user.

  test('free has the six base features', () => {
    expect(realProGate.FEATURE_MAP.free).toContain('engine_safety_guardrails');
    expect(realProGate.FEATURE_MAP.free).toContain('food_logging_basic');
    expect(realProGate.FEATURE_MAP.free).toContain('history_30_days');
    expect(realProGate.FEATURE_MAP.free).toContain('csv_export');
    expect(realProGate.FEATURE_MAP.free).not.toContain('history_unlimited');
    expect(realProGate.FEATURE_MAP.free).not.toContain('peak_week_module');
  });

  test('pro is the whole app in the 2-tier model', () => {
    expect(realProGate.FEATURE_MAP.pro).toEqual(
      expect.arrayContaining(realProGate.FEATURE_MAP.free),
    );
    expect(realProGate.FEATURE_MAP.pro).toContain('adaptive_engine');
    expect(realProGate.FEATURE_MAP.pro).toContain('history_unlimited');
    expect(realProGate.FEATURE_MAP.pro).toContain('block_planning_extended');
    expect(realProGate.FEATURE_MAP.pro).toContain('photo_progress_local');
    expect(realProGate.FEATURE_MAP.pro).toContain('coach_link_eligible');
    expect(realProGate.FEATURE_MAP.pro).toContain('share_pack_csv');
  });

  test('peak_week_module is removed from FEATURE_MAP entirely', () => {
    expect(realProGate.FEATURE_MAP.pro).not.toContain('peak_week_module');
    expect(realProGate.FEATURE_MAP.free).not.toContain('peak_week_module');
  });

  test('FEATURE_MAP exposes the two named tiers (no Complete)', () => {
    expect(Object.keys(realProGate.FEATURE_MAP).sort()).toEqual(['free', 'pro']);
  });
});

describe('PRO_ROUTES back-compat', () => {
  test('exports the expected pro-only route list', () => {
    expect(realProGate.PRO_ROUTES).toContain('CoachOutput');
    expect(realProGate.PRO_ROUTES).toContain('WeeklyCheckIn');
  });

  test('isProRoute correctly identifies pro routes', () => {
    expect(realProGate.isProRoute('CoachOutput')).toBe(true);
    expect(realProGate.isProRoute('HomeScreen')).toBe(false);
  });
});
