/**
 * planengineBench.js
 *
 * Reusable measurement harness for the planEngine rebuild (spec phases 0-4).
 * Pure measurement, no assertions, so the baseline and every phase doc can
 * report the SAME measured fields. Benchmarks (the per-phase tests) import
 * these helpers and assert on them.
 *
 * Measured against the deterministic internal POOL path (no DB library),
 * which is where the structural behaviour lives and is reproducible in CI.
 */
import { generatePlan } from '../planEngine';

// Spec landmark table (Israetel/RP classic, intermediate), from the rebuild
// specification. Side+rear delts share a combined MRV of 26. Front delts are
// separate. Used to flag over-MRV. MV is the no-zero floor.
export const SPEC_LANDMARKS = {
  chest:      { MV: 4, MEV: 6,  MRV: 22 },
  back:       { MV: 8, MEV: 10, MRV: 25 },
  shoulders:  { MV: 6, MEV: 8,  MRV: 26 }, // side+rear+front as the engine buckets it; spec caps side+rear at 26
  biceps:     { MV: 5, MEV: 8,  MRV: 26 },
  triceps:    { MV: 4, MEV: 6,  MRV: 18 },
  quads:      { MV: 6, MEV: 8,  MRV: 20 },
  hamstrings: { MV: 4, MEV: 6,  MRV: 20 },
  glutes:     { MV: 0, MEV: 0,  MRV: 16 },
  calves:     { MV: 6, MEV: 8,  MRV: 20 },
  abs:        { MV: 0, MEV: 0,  MRV: 25 },
  traps:      { MV: 0, MEV: 0,  MRV: 26 },
};

export const DIVISIONS = [
  ['general', 'General'],
  ['mens_physique', "Men's Physique"],
  ['classic_physique', 'Classic Physique'],
  ['bodybuilding', 'Bodybuilding'],
  ['bikini', 'Bikini'],
  ['wellness', 'Wellness'],
  ['figure', 'Figure'],
  ['womens_physique', "Women's Physique"],
  ['womens_bodybuilding', "Women's Bodybuilding"],
];

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];

export function gen(goal, opts = {}) {
  return generatePlan({
    goal,
    experience: opts.experience ?? 'intermediate',
    daysPerWeek: opts.days ?? 4,
    equipment: 'full_gym',
    sessionLengthMinutes: 75,
    recoveryRating: 'average',
    ...opts.extra,
  });
}

// Per-muscle weekly sets as the engine reports them (external buckets).
export function weeklySets(plan) {
  const out = {};
  for (const [k, v] of Object.entries(plan.weeklyVolumeSummary || {})) out[k] = v?.plannedSets ?? 0;
  return out;
}

export function leadLift(plan) {
  const w = plan.workouts?.[0];
  return w?.exercises?.[0]?.exerciseName ?? null;
}

// Every (exerciseName, sets) entry below 3 sets across the whole program.
export function fragments(plan) {
  const out = [];
  for (const w of plan.workouts || []) {
    for (const ex of w.exercises || []) {
      if (ex.sets < 3) out.push(`${w.name}: ${ex.exerciseName} (${ex.sets})`);
    }
  }
  return out;
}

// Structural/judged muscles that the spec says must never be zero in any plan.
const NO_ZERO = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];

// Division-aware MRV ceiling. Glutes get the higher Bikini/Wellness cap (30,
// Contreras split-by-type) matching the engine; everything else uses the table.
function mrvFor(muscle, goal) {
  if (muscle === 'glutes' && (goal === 'bikini' || goal === 'wellness')) return 30;
  return SPEC_LANDMARKS[muscle]?.MRV;
}

export function measure(plan) {
  const sets = weeklySets(plan);
  const goal = plan.goal;
  const zeros = NO_ZERO.filter(m => (sets[m] ?? 0) === 0);
  const overMRV = Object.entries(sets)
    .filter(([m, n]) => mrvFor(m, goal) != null && n > mrvFor(m, goal))
    .map(([m, n]) => `${m} ${n} > MRV ${mrvFor(m, goal)}`);
  return {
    name: plan.name,
    split: plan.splitType,
    lead: leadLift(plan),
    sets,
    total: Object.values(sets).reduce((s, n) => s + n, 0),
    zeros,
    overMRV,
    fragments: fragments(plan),
  };
}
