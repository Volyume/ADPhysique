/**
 * Phase 4 benchmark (rebuild spec): weak-point specialisation composed with the
 * division split.
 *
 * Before this phase, the weak_point phase dropped to a generic upper/lower split
 * (upper_lower_wp), losing the division character, and could even REDUCE an
 * already-emphasised muscle (Bikini glutes 23 -> 19). Now the six specialised
 * divisions keep their matrix split in the weak_point phase, the weak muscle is
 * boosted toward its (division-aware) MRV via extra sessions + a flexed
 * per-session cap, and the boost respects MRV.
 *
 * Measured on the library path (the live app path).
 */
import { genLib } from './planengineBench';

const MATRIX_DIVISIONS = [
  ['mens_physique', 'V-Taper'],
  ['classic_physique', 'X-Frame'],
  ['bikini', 'Glute Focus'],
  ['wellness', 'Lower Focus'],
  ['figure', 'X-Frame'],
  ['womens_physique', 'V-Taper'],
];

const gluteMRV = (g) => (g === 'bikini' || g === 'wellness') ? 30 : 16;

function vol(plan) { return plan.weeklyVolumeSummary; }
function wp(goal) {
  return genLib(goal, { days: 5, experience: 'advanced', extra: { phase: 'weak_point', weakPoints: ['Glutes'] } });
}
function base(goal) {
  return genLib(goal, { days: 5, experience: 'advanced' });
}

describe('Phase 4: weak-point composes with the division split', () => {
  test.each(MATRIX_DIVISIONS)('%s keeps its division split (%s) in the weak_point phase', (goal, label) => {
    expect(wp(goal).splitType).toBe(label);
  });

  // Divisions where glutes are NOT already the top priority: weak-pointing must
  // raise them. Bikini and Wellness already train glutes at their delivered
  // ceiling (#1 priority), so weak-pointing correctly keeps them at max rather
  // than raising further, and the engine warns the user (covered separately).
  const GLUTE_NOT_MAXED = MATRIX_DIVISIONS.map(([g]) => g).filter(g => g !== 'bikini' && g !== 'wellness');
  test.each(GLUTE_NOT_MAXED)('%s: a glute weak-point raises glutes vs base', (goal) => {
    expect(vol(wp(goal)).glutes.plannedSets).toBeGreaterThan(vol(base(goal)).glutes.plannedSets);
  });

  test('Bikini/Wellness: glutes stay at max under a glute weak-point, and the user is warned', () => {
    for (const g of ['bikini', 'wellness']) {
      expect(vol(wp(g)).glutes.plannedSets).toBeGreaterThanOrEqual(vol(base(g)).glutes.plannedSets);
      const plan = genLib(g, { days: 5, experience: 'advanced', extra: { phase: 'weak_point', weakPoints: ['Glutes'] } });
      expect(plan.warnings.some(w => /highest-priority muscles|already trained near/i.test(w))).toBe(true);
    }
  });

  test.each(MATRIX_DIVISIONS.map(([g]) => g))('%s: weak-point glutes never exceed division MRV', (goal) => {
    expect(vol(wp(goal)).glutes.plannedSets).toBeLessThanOrEqual(gluteMRV(goal));
  });

  test('Bikini weak-point no longer REDUCES its already-emphasised glutes', () => {
    // The old bug: weak-pointing Bikini glutes clamped them to the generic MRV
    // 16 and dropped a generic split, delivering LESS than the base plan.
    expect(vol(wp('bikini')).glutes.plannedSets).toBeGreaterThanOrEqual(vol(base('bikini')).glutes.plannedSets);
  });

  test('Men\'s Physique keeps shoulder dominance when glutes are weak-pointed', () => {
    const v = vol(wp('mens_physique'));
    expect(v.shoulders.plannedSets).toBeGreaterThan(v.glutes.plannedSets);
  });
});
