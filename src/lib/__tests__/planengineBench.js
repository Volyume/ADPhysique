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
import { deriveExerciseMetadata } from '../exerciseMetadata';

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

// ---------------------------------------------------------------------------
// Library-path measurement (spec phase 3). The benchmarks above measure the
// deterministic internal POOL. The LIVE app feeds the DB exercise library
// (getAllExercises -> generatePoolFromLibrary -> _effectivePool), so 3a/3b
// (library tagging) are only verifiable on the library path. These helpers
// load the real seed library exactly as the seed does and run generatePlan
// against it, so the re-tag work has a measured before/after instead of being
// done blind. Lazy: the parse only runs when loadSeedLibrary() is called, so
// the POOL benchmarks above are not slowed.
// ---------------------------------------------------------------------------

let _seedLibraryCache = null;

export function loadSeedLibrary() {
  if (_seedLibraryCache) return _seedLibraryCache;
  const fs = require('fs');
  const path = require('path');
  const seedSrc = fs.readFileSync(path.join(__dirname, '../seedExercises.js'), 'utf8');

  const start = seedSrc.indexOf('const RAW = [');
  const end = seedSrc.indexOf('\n];', start);
  const body = seedSrc.slice(start, end);

  const smStart = seedSrc.indexOf('const SUBREGION_MAP = {');
  const smEnd = seedSrc.indexOf('\n};', smStart);
  const smBody = seedSrc.slice(smStart, smEnd);
  const subMap = {};
  for (const m of smBody.matchAll(/'([^']+)':\s*'(\w+)'/g)) subMap[m[1]] = m[2];

  const rows = [];
  const re = /\[\s*'([^']+)',\s*'([a-z_]+)',\s*\[([^\]]*)\],\s*'([a-z_]+)',\s*'([a-z_]+)',\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const base = {
      name: m[1], primaryMuscle: m[2], equipment: m[4], movementPattern: m[5],
      compoundIsolation: m[6] === 'true' ? 'compound' : 'isolation',
      fatigueCost: parseInt(m[9], 10), stimulusToFatigueRatio: parseInt(m[10], 10),
      subregion: subMap[m[1]] ?? null,
    };
    rows.push({ id: m[1], ...base, ...deriveExerciseMetadata(base) });
  }
  _seedLibraryCache = rows;
  return rows;
}

// generatePlan on the library path (real seed library as effective pool).
export function genLib(goal, opts = {}) {
  const lib = opts.library ?? loadSeedLibrary();
  return gen(goal, { ...opts, extra: { ...opts.extra, exerciseLibrary: lib } });
}

// The flat set of exercise names a plan selected.
export function exerciseSet(plan) {
  const s = new Set();
  for (const w of plan.workouts || []) for (const ex of w.exercises || []) s.add(ex.exerciseName);
  return s;
}

// Shared-exercise overlap as a fraction of the smaller program, matching the
// spec's "< 30% shared exercises" Bikini-vs-MP gate.
export function overlapPct(a, b) {
  const A = exerciseSet(a); const B = exerciseSet(b);
  let shared = 0;
  for (const n of A) if (B.has(n)) shared++;
  return shared / Math.max(1, Math.min(A.size, B.size));
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
