/**
 * stylePlans.pools.test.js — EL-8, EL-11, docs/exercise-library-expansion-
 * 2026-09-05/09-STYLE-PLANS.md sections 1 and 5.
 *
 * What this suite pins and why: the style pools are the mechanism that
 * makes a style plan behave differently from an ordinary one (EL-11), so
 * their exact contents are load-bearing, not incidental.
 *  - kettlebell_foundations contains no single-arm swing, clean, snatch,
 *    jerk or push press (RKC/StrongFirst competence ordering, 04 section
 *    3); kettlebell_experienced does.
 *  - the circuit pools (circuit_dumbbell, circuit_bodyweight) contain
 *    only STAPLE/COMMON rows - never a NICHE/SPECIALIST/NEVER_AUTO one.
 *  - a style plan's swap candidates (rankSwaps) never leave its pool
 *    unless the caller relaxes it (the sheet's "Show all exercises").
 *  - an ordinary (non-style) plan is unaffected: no stylePool means no
 *    restriction, exactly as before this campaign.
 */
const {
  STYLE_POOLS, STYLE_POOL_KEYS, KETTLEBELL_NEVER_AUTO_EXCEPTIONS,
  stylePoolFor, isInStylePool, styleKeyFromTags,
} = require('../exercise/stylePools');
const { autoTier, AUTO_TIER } = require('../exercise/canonicality');
const { rankSwaps } = require('../swapEngine');

const FOUNDATIONS_FORBIDDEN = [
  'Kettlebell Swing (Single-Arm)',
  'Kettlebell Swing (Alternating)',
  'Kettlebell Clean',
  'Kettlebell Snatch',
  'Kettlebell Jerk',
  'Kettlebell Push Press',
];

describe('kettlebell pools (EL-8)', () => {
  test('foundations contains no single-arm swing, clean, snatch, jerk or push press', () => {
    const pool = STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS];
    for (const forbidden of FOUNDATIONS_FORBIDDEN) {
      expect(pool).not.toContain(forbidden);
    }
  });

  test('foundations is entirely a subset of experienced (grinds + two-hand swing only)', () => {
    const foundations = STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS];
    const experienced = STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_EXPERIENCED];
    for (const name of foundations) expect(experienced).toContain(name);
  });

  test('experienced contains the ballistics foundations forbids', () => {
    const pool = STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_EXPERIENCED];
    for (const name of FOUNDATIONS_FORBIDDEN) {
      expect(pool).toContain(name);
    }
  });

  test('every NEVER_AUTO row in either kettlebell pool is in the declared exception list', () => {
    const exceptionSet = new Set(KETTLEBELL_NEVER_AUTO_EXCEPTIONS);
    for (const key of [STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS, STYLE_POOL_KEYS.KETTLEBELL_EXPERIENCED]) {
      for (const name of STYLE_POOLS[key]) {
        if (autoTier(name) === AUTO_TIER.NEVER_AUTO) {
          expect(exceptionSet.has(name)).toBe(true);
        }
      }
    }
  });

  test('KETTLEBELL_NEVER_AUTO_EXCEPTIONS is non-empty (the deliberate EL-8 exception actually does something)', () => {
    expect(KETTLEBELL_NEVER_AUTO_EXCEPTIONS.length).toBeGreaterThan(0);
  });
});

describe('circuit pools contain only staple/common rows (09 section 1)', () => {
  test.each([STYLE_POOL_KEYS.CIRCUIT_DUMBBELL, STYLE_POOL_KEYS.CIRCUIT_BODYWEIGHT])('%s', (key) => {
    const pool = STYLE_POOLS[key];
    expect(pool.length).toBeGreaterThan(0);
    for (const name of pool) {
      const tier = autoTier(name);
      expect([AUTO_TIER.STAPLE, AUTO_TIER.COMMON]).toContain(tier);
    }
  });
});

describe('stylePoolFor / isInStylePool / styleKeyFromTags', () => {
  test('resolves both a bare key and a full style: tag to the same pool', () => {
    const byKey = stylePoolFor('kettlebell_foundations');
    const byTag = stylePoolFor('style:kettlebell_foundations');
    expect(byTag).toBe(byKey); // same frozen array reference
    expect(byKey.length).toBeGreaterThan(0);
  });

  test('an unknown pool key resolves to null, never an empty-but-truthy pool', () => {
    expect(stylePoolFor('style:not_a_real_pool')).toBeNull();
    expect(stylePoolFor(null)).toBeNull();
    expect(stylePoolFor(undefined)).toBeNull();
  });

  test('isInStylePool is false for an unknown pool and true for a real member', () => {
    expect(isInStylePool('kettlebell_foundations', 'Kettlebell Goblet Squat')).toBe(true);
    expect(isInStylePool('kettlebell_foundations', 'Kettlebell Snatch')).toBe(false);
    expect(isInStylePool('not_a_real_pool', 'Kettlebell Goblet Squat')).toBe(false);
  });

  test('styleKeyFromTags extracts the style tag from a plan tags string', () => {
    expect(styleKeyFromTags('style:kettlebell_foundations equipment:kettlebell kettlebell home')).toBe('kettlebell_foundations');
    expect(styleKeyFromTags('circuit equipment:dumbbell style:circuit_dumbbell home')).toBe('circuit_dumbbell');
    expect(styleKeyFromTags('bodybuilding gender:men goal:build_muscle days:2')).toBeNull();
    expect(styleKeyFromTags(null)).toBeNull();
    expect(styleKeyFromTags(undefined)).toBeNull();
  });
});

// ─── rankSwaps: pool containment (EL-11) ───────────────────────────────────

function makeExercise(id, name, overrides = {}) {
  return {
    id, name, primaryMuscle: 'quads', movementPattern: 'squat',
    equipment: 'kettlebell', compoundIsolation: 'compound',
    fatigueCost: 3, stimulusToFatigueRatio: 4, ...overrides,
  };
}

describe('rankSwaps respects a style pool, and relaxes only when asked (EL-11)', () => {
  const original = makeExercise('orig', 'Kettlebell Goblet Squat');
  // A mixed library: some pool members, some emphatically NOT (a barbell
  // squat and an out-of-pool kettlebell ballistic), so containment is a
  // real assertion, not a vacuous one.
  const library = [
    original,
    makeExercise('a', 'Kettlebell Front Rack Squat (Double)'),
    makeExercise('b', 'Kettlebell Deadlift'),
    makeExercise('c', 'Barbell Back Squat', { equipment: 'barbell' }),
    makeExercise('d', 'Kettlebell Snatch'), // NEVER_AUTO ballistic, not in foundations
  ];
  const foundationsPool = STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS];

  test('candidates never leave the pool when stylePool is supplied', () => {
    const ranked = rankSwaps(original, library, { numResults: 10, stylePool: foundationsPool });
    expect(ranked.length).toBeGreaterThan(0);
    for (const { exercise } of ranked) {
      expect(foundationsPool).toContain(exercise.name);
    }
    // Both the barbell squat and the out-of-pool ballistic must be gone.
    expect(ranked.some((r) => r.exercise.name === 'Barbell Back Squat')).toBe(false);
    expect(ranked.some((r) => r.exercise.name === 'Kettlebell Snatch')).toBe(false);
  });

  test('omitting stylePool ("Show all exercises") relaxes the restriction', () => {
    const ranked = rankSwaps(original, library, { numResults: 10 });
    expect(ranked.some((r) => r.exercise.name === 'Barbell Back Squat')).toBe(true);
    expect(ranked.some((r) => r.exercise.name === 'Kettlebell Snatch')).toBe(true);
  });

  test('an ordinary plan (no stylePool passed at all) is unaffected - pin for EL-11\'s "unchanged" clause', () => {
    const withNoOption = rankSwaps(original, library, { numResults: 10 });
    const withExplicitNull = rankSwaps(original, library, { numResults: 10, stylePool: null });
    expect(withNoOption.map((r) => r.exercise.id)).toEqual(withExplicitNull.map((r) => r.exercise.id));
  });
});
