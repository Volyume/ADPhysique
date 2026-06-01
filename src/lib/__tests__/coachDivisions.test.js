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

  test('every division generates a non-empty plan with a recoverable session count', () => {
    for (const g of ['mens_physique', 'classic_physique', 'bodybuilding', 'bikini',
      'wellness', 'figure', 'womens_physique', 'womens_bodybuilding']) {
      const plan = generatePlan(cfg(g));
      expect(plan.workouts.length).toBeGreaterThan(0);
      for (const w of plan.workouts) expect(w.estimatedDurationMinutes).toBeLessThanOrEqual(95);
    }
  });
});
