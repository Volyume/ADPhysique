// Division-correctness contract for the Coach (coach-plan audit 2026-06-01).
// Asserts the stable invariants of the science-first overlay rework. Delivered
// lower-body numbers tighten further once the division-aware split lands; this
// suite covers what must hold regardless of split tuning.
import { generatePlan } from '../planEngine';

function vol(plan) {
  const out = {};
  for (const [k, v] of Object.entries(plan.weeklyVolumeSummary || {})) out[k] = v?.plannedSets ?? 0;
  out._total = Object.values(out).reduce((s, n) => s + n, 0);
  return out;
}
const cfg = (goal, over = {}) => ({ goal, experience: 'intermediate', daysPerWeek: 5, equipment: 'full_gym', sessionLengthMinutes: 75, ...over });

describe('Coach division contract', () => {
  test('Women\'s Bodybuilding is a real Coach goal that generates a valid plan', () => {
    const plan = generatePlan(cfg('womens_bodybuilding'));
    expect(Array.isArray(plan.workouts)).toBe(true);
    expect(plan.workouts.length).toBeGreaterThan(0);
    expect(plan.name).toContain("Women's Bodybuilding");
  });

  test('Men\'s Physique delivers more shoulder volume than general (emphasis reaches the plate)', () => {
    expect(vol(generatePlan(cfg('mens_physique'))).shoulders)
      .toBeGreaterThan(vol(generatePlan(cfg('general'))).shoulders);
  });

  test('Men\'s Physique keeps legs de-emphasised relative to its shoulders', () => {
    const v = vol(generatePlan(cfg('mens_physique')));
    expect(v.shoulders).toBeGreaterThan(v.quads + v.glutes);
  });

  test('the systemic cap is individualised: advanced delivers more total than beginner for the same division', () => {
    const adv = vol(generatePlan(cfg('bodybuilding', { experience: 'advanced', daysPerWeek: 6 })))._total;
    const beg = vol(generatePlan(cfg('bodybuilding', { experience: 'beginner', daysPerWeek: 3 })))._total;
    expect(adv).toBeGreaterThan(beg);
  });

  test('lower-body divisions deliver real glute volume (stage 2 split)', () => {
    // Was 4 sets before the lower-focus split; must now reach the working band.
    expect(vol(generatePlan(cfg('bikini'))).glutes).toBeGreaterThanOrEqual(14);
    expect(vol(generatePlan(cfg('wellness'))).glutes).toBeGreaterThanOrEqual(14);
  });

  test('Bikini and Wellness are no longer identical (Wellness carries more quad volume)', () => {
    const bikini = vol(generatePlan(cfg('bikini')));
    const wellness = vol(generatePlan(cfg('wellness')));
    expect(wellness.quads).toBeGreaterThan(bikini.quads);
  });

  test('leg-judged divisions deliver real leg volume at 5 days (stage 2b)', () => {
    // Was quads ~6 / calves ~4 / figure glutes 2 on the 5-day PPL (one leg day).
    expect(vol(generatePlan(cfg('classic_physique'))).calves).toBeGreaterThanOrEqual(8);
    expect(vol(generatePlan(cfg('figure'))).glutes).toBeGreaterThanOrEqual(10);
    expect(vol(generatePlan(cfg('bodybuilding'))).quads).toBeGreaterThanOrEqual(8);
  });

  test('general and Men\'s Physique keep the PPL split (default and upper-dominant unchanged)', () => {
    expect(generatePlan(cfg('general')).splitType).toBe('ppl');
    expect(generatePlan(cfg('mens_physique')).splitType).toBe('ppl');
  });

  test('weak-point specialisation is additive, not destructive (stage 4)', () => {
    const base = vol(generatePlan(cfg('mens_physique', { experience: 'advanced' })));
    const wp = vol(generatePlan(cfg('mens_physique', { experience: 'advanced', phase: 'weak_point', weakPoints: ['Glutes'] })));
    // The weak point is brought up hard...
    expect(wp.glutes).toBeGreaterThan(base.glutes + 8);
    // ...while the division character is retained, not wiped to maintenance:
    // shoulders stay the dominant muscle for Men's Physique.
    expect(wp.shoulders).toBeGreaterThanOrEqual(12);
    expect(wp.shoulders).toBeGreaterThan(wp.quads);
  });

  test('Men\'s Physique prioritises upper-chest incline work (stage 3 exercise bias)', () => {
    const names = generatePlan(cfg('mens_physique')).workouts
      .flatMap(w => w.exercises.map(e => e.exerciseName));
    expect(names.some(n => /incline/i.test(n))).toBe(true);
  });

  test('every division generates a non-empty plan with a recoverable session count', () => {
    for (const g of ['mens_physique', 'classic_physique', 'bodybuilding', 'bikini',
      'wellness', 'figure', 'womens_physique', 'womens_bodybuilding']) {
      const plan = generatePlan(cfg(g));
      expect(plan.workouts.length).toBeGreaterThan(0);
      for (const w of plan.workouts) expect(w.estimatedDurationMinutes).toBeLessThanOrEqual(95);
    }
  });
});
