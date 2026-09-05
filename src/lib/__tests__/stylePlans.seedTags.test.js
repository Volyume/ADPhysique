/**
 * stylePlans.seedTags.test.js — final certification 2026-09-05, finding A11
 * (docs/final-certification-2026-09-05/04-TRAINING-STYLES.md section 2,
 * "A beginner-tagged plan reaches the experienced ballistic pool").
 *
 * What this suite pins and why: a library plan's `style:<pool>` tag is what
 * constrains its swaps and its regeneration, so a plan tagged `beginner`
 * that also carried `style:kettlebell_experienced` would offer a
 * self-declared beginner the Snatch, Jerk, Clean and single-arm Swing in
 * the swap sheet. EL-8's rule is "beginner kettlebell templates are
 * grind-only plus two-hand swings ... ballistics only at the experienced
 * level" (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md).
 *
 * Written to FAIL if either half of the contract regresses: the tag drifting
 * back to the experienced pool, or a ballistic row being added to a
 * beginner-tagged plan under the foundations tag.
 */
const { LIBRARY_PLANS } = require('../seedRoutines');
const { STYLE_POOLS, STYLE_POOL_KEYS, styleKeyFromTags } = require('../exercise/stylePools');

const planByName = (name) => LIBRARY_PLANS.find((p) => p.name === name);
const tagTokens = (plan) => String(plan?.tags || '').split(/\s+/).filter(Boolean);
const exerciseNames = (plan) => (plan?.workouts || [])
  .flatMap((w) => (w.exercises || []).map((e) => e.name));

describe('A11: a beginner-tagged kettlebell plan never points at the experienced pool', () => {
  test('Kettlebell Minimal: 3 Days is tagged style:kettlebell_foundations', () => {
    const plan = planByName('Kettlebell Minimal: 3 Days');
    expect(plan).toBeDefined();
    expect(styleKeyFromTags(plan.tags)).toBe(STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS);
  });

  test('every one of its exercises sits inside the foundations pool', () => {
    const plan = planByName('Kettlebell Minimal: 3 Days');
    const pool = STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS];
    for (const name of exerciseNames(plan)) {
      expect(pool).toContain(name);
    }
  });

  test('no plan tagged `beginner` points at the experienced kettlebell pool', () => {
    for (const plan of LIBRARY_PLANS) {
      if (!tagTokens(plan).includes('beginner')) continue;
      expect(styleKeyFromTags(plan.tags)).not.toBe(STYLE_POOL_KEYS.KETTLEBELL_EXPERIENCED);
    }
  });

  test('every style tag in the library resolves to a real pool', () => {
    for (const plan of LIBRARY_PLANS) {
      const key = styleKeyFromTags(plan.tags);
      if (!key) continue;
      expect(STYLE_POOLS[key]).toBeDefined();
    }
  });

  // Scoped to the FOUNDATIONS pool deliberately. The equivalent whole-library
  // assertion currently fails on 'Kettlebell Strength: 4 Days'
  // (style:kettlebell_experienced), whose row 'Kettlebell Floor Press
  // (Alternating)' is not in KETTLEBELL_EXPERIENCED_NAMES - a separate,
  // pre-existing pool/template mismatch outside A11's ruling, reported
  // rather than silently absorbed into an allow-list here.
  test('every foundations-tagged plan is entirely inside the foundations pool', () => {
    const pool = STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS];
    const tagged = LIBRARY_PLANS.filter(
      (p) => styleKeyFromTags(p.tags) === STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS,
    );
    expect(tagged.length).toBeGreaterThan(0);
    for (const plan of tagged) {
      for (const name of exerciseNames(plan)) {
        expect(pool).toContain(name);
      }
    }
  });
});
