/**
 * Structural-volume protection invariants (founder decisions T-A/T-B/T-C/T-D,
 * 2026-07-04; audit/content-quality/plan-builder.md §5 A/B/C/D).
 *
 * These pin the four approved changes to the deterministic plan engine against
 * the REAL engine (internal POOL path, no library, so they run in CI and cannot
 * drift). Each was a shortfall the time-budget trimmer or split selector caused,
 * and each fix must never silently regress:
 *
 *  - T-A: a 60-min intermediate 4-day upper/lower must not shave a structural
 *    compound (back) below its weekly MEV to fit the clock. Before: back = 6
 *    (MEV 10). The trimmer now protects a structural mover's MEV share.
 *  - T-B: a 5-day general/hypertrophy/strength/cut routine must train legs
 *    >= 2x/week, not one ~80-min leg day. Before: PPL routed legs 1x/week.
 *  - T-C: a physique division's de-emphasised structural muscle must still be
 *    DELIVERED to its documented maintenance floor (6 at >= 4 days), not left
 *    below it because its single leg day had a lift trimmed. Before: Men's
 *    Physique quads = 3.
 *  - T-D: a beginner full-body plan must balance antagonist volume, chest at
 *    least its MEV and pull:push not 2:1. Before: back = 7, chest = 3.
 *
 * The plans must also stay within every existing safety guardrail (MRV clamp,
 * combined delt cap 26) and stay deterministic. Those are pinned too.
 */
import { generatePlan, SPEC_LANDMARKS } from '../planEngine';

// Weekly direct sets per external muscle bucket, as the engine reports them.
function weekly(plan) {
  const out = {};
  for (const [k, v] of Object.entries(plan.weeklyVolumeSummary || {})) out[k] = v?.plannedSets ?? 0;
  return out;
}
// How many separate sessions in the plan train at least one leg muscle.
const LEG_RE = /squat|leg press|leg curl|leg ext|lunge|hip thrust|romanian|deadlift|calf|hack|goblet|step-up|good morning|nordic|glute|abduct|pull-through|sissy|pendulum|stiff-leg|bridge/i;
function legDays(plan) {
  return plan.workouts.filter(w => w.exercises.some(e => LEG_RE.test(e.exerciseName))).length;
}
// Division-aware MRV, matching the engine's ceiling (bikini/wellness glutes 30).
function mrvFor(muscle, goal) {
  if (muscle === 'glutes' && (goal === 'bikini' || goal === 'wellness')) return 30;
  if (muscle === 'shoulders') return 26 + 2; // side+rear+front bucket, +2 per-head rounding
  return SPEC_LANDMARKS[muscle]?.MRV;
}
function noMuscleOverMRV(plan) {
  const w = weekly(plan);
  const over = [];
  for (const [m, n] of Object.entries(w)) {
    const cap = mrvFor(m, plan.goal);
    if (cap != null && n > cap) over.push(`${m} ${n} > ${cap}`);
  }
  return over;
}

const BASE = {
  equipment: 'full_gym',
  recoveryRating: 'average',
  weakPoints: [],
};

// ─── T-A ────────────────────────────────────────────────────────────────────
describe('T-A: 60-min 4-day upper/lower protects structural compound MEV', () => {
  // The engine's intermediate back MEV is 10 (VOLUME_LANDMARKS back mev 10);
  // the fix must deliver at least that, not the pre-fix 6, at a 60-min budget.
  const cases = [
    { name: 'hypertrophy', extra: { phase: null, nutritionPhase: 'lean_gain' } },
    { name: 'strength', extra: { phase: 'strength_size', nutritionPhase: null } },
  ];
  test.each(cases)('intermediate / $name / 4d / 60min: back >= MEV 10, chest >= MEV 6', ({ extra }) => {
    const plan = generatePlan({
      ...BASE, experience: 'intermediate', goal: 'general', daysPerWeek: 4,
      sessionLengthMinutes: 60, ...extra,
    });
    const w = weekly(plan);
    expect(plan.splitType).toBe('upper_lower');
    expect(w.back).toBeGreaterThanOrEqual(10);
    expect(w.chest).toBeGreaterThanOrEqual(6);
    expect(noMuscleOverMRV(plan)).toEqual([]);
  });

  test('advanced / 4d / 60min: back stays >= its higher MEV (12)', () => {
    const plan = generatePlan({
      ...BASE, experience: 'advanced', goal: 'general', daysPerWeek: 4,
      sessionLengthMinutes: 60, phase: null, nutritionPhase: 'lean_gain',
    });
    expect(weekly(plan).back).toBeGreaterThanOrEqual(12);
    expect(noMuscleOverMRV(plan)).toEqual([]);
  });
});

// ─── T-B ────────────────────────────────────────────────────────────────────
describe('T-B: 5-day general/strength/cut trains legs >= 2x/week', () => {
  const variants = [
    { name: 'hypertrophy', extra: { phase: null, nutritionPhase: 'lean_gain' } },
    { name: 'strength', extra: { phase: 'strength_size', nutritionPhase: null } },
    { name: 'cut', extra: { phase: null, nutritionPhase: 'mild_cut' } },
  ];
  test.each(variants)('intermediate / general / $name / 5d: legs on >= 2 days, not a 5-day PPL', ({ extra }) => {
    const plan = generatePlan({
      ...BASE, experience: 'intermediate', goal: 'general', daysPerWeek: 5,
      sessionLengthMinutes: 60, ...extra,
    });
    expect(plan.splitType).not.toBe('ppl');
    expect(legDays(plan)).toBeGreaterThanOrEqual(2);
    expect(noMuscleOverMRV(plan)).toEqual([]);
  });

  test('advanced / general / 5d: legs on >= 2 days', () => {
    const plan = generatePlan({
      ...BASE, experience: 'advanced', goal: 'general', daysPerWeek: 5,
      sessionLengthMinutes: 60, nutritionPhase: 'lean_gain',
    });
    expect(legDays(plan)).toBeGreaterThanOrEqual(2);
  });

  test('division splits are untouched: Men\'s Physique 5d keeps its V-Taper (legs stay de-emphasised)', () => {
    const plan = generatePlan({
      ...BASE, experience: 'advanced', goal: 'mens_physique', daysPerWeek: 5,
      sessionLengthMinutes: 60, nutritionPhase: 'lean_gain',
    });
    expect(plan.splitType).toBe('V-Taper');
  });
});

// ─── T-C ────────────────────────────────────────────────────────────────────
describe('T-C: division de-emphasised structural muscle reaches its maintenance floor', () => {
  // STRUCTURAL_MUSCLES maintenance floor is 6 at >= 4 training days. Men's
  // Physique de-emphasises legs (quads/glutes overlay 0.70/0.60) but delivery
  // must still reach that floor, not the pre-fix 3.
  const exps = ['beginner', 'intermediate', 'advanced', 'competitive'];
  test.each(exps)('Men\'s Physique / %s / 5d: quads and glutes >= maintenance floor 6', (exp) => {
    const plan = generatePlan({
      ...BASE, experience: exp, goal: 'mens_physique', daysPerWeek: 5,
      sessionLengthMinutes: 60, nutritionPhase: 'lean_gain',
    });
    const w = weekly(plan);
    expect(w.quads).toBeGreaterThanOrEqual(6);
    expect(w.glutes).toBeGreaterThanOrEqual(6);
    expect(noMuscleOverMRV(plan)).toEqual([]);
  });
});

// ─── T-D ────────────────────────────────────────────────────────────────────
describe('T-D: beginner full-body balances antagonist volume', () => {
  // Beginner chest MEV is 4 (VOLUME_LANDMARKS chest mev 6 * beginner/nutrition
  // multipliers). The first plan must put chest at least at MEV and read no
  // worse than back:chest < 2:1, instead of the pre-fix back 7 / chest 3.
  const equipments = ['full_gym', 'dumbbells_only', 'machines_cables'];
  test.each(equipments)('beginner / general / 3d full body / %s: chest >= MEV, back:chest < 2:1', (equipment) => {
    const plan = generatePlan({
      ...BASE, equipment, experience: 'beginner', goal: 'general', daysPerWeek: 3,
      sessionLengthMinutes: 60, nutritionPhase: 'lean_gain',
    });
    const w = weekly(plan);
    expect(plan.splitType).toBe('full_body');
    expect(w.chest).toBeGreaterThanOrEqual(4);
    // Not a 2:1 pull:push imbalance on the chest/back antagonist pair.
    expect(w.back).toBeLessThan(2 * w.chest);
    expect(noMuscleOverMRV(plan)).toEqual([]);
  });
});

// ─── Determinism (all four run through the same protected trim path) ─────────
describe('structural-volume protection stays deterministic', () => {
  const inputs = [
    { experience: 'intermediate', goal: 'general', daysPerWeek: 4, sessionLengthMinutes: 60, nutritionPhase: 'lean_gain' },
    { experience: 'intermediate', goal: 'general', daysPerWeek: 5, sessionLengthMinutes: 60, nutritionPhase: 'mild_cut' },
    { experience: 'advanced', goal: 'mens_physique', daysPerWeek: 5, sessionLengthMinutes: 60, nutritionPhase: 'lean_gain' },
    { experience: 'beginner', goal: 'general', daysPerWeek: 3, sessionLengthMinutes: 60, nutritionPhase: 'lean_gain' },
  ];
  test.each(inputs)('identical inputs -> byte-identical plan ($goal $daysPerWeek d)', (extra) => {
    const a = generatePlan({ ...BASE, ...extra });
    const b = generatePlan({ ...BASE, ...extra });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
