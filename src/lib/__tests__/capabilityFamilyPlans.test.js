/**
 * CC28 - the capability-led routine families (Amendment deliverable 2;
 * Amendment sections 13/15/16/17; CC-F3 gate).
 *
 * Compatibility BY CONSTRUCTION, proven mechanically:
 *  - every exercise name in every family plan resolves against the seed
 *    library (or seedRoutines' own REQUIRED_EXERCISES);
 *  - each family's rows pass ITS OWN capability profile through the real
 *    resolver + derivation (fullyCompatible - zero conflicts AND zero
 *    unknowns, so a family plan can never dead-end its own audience);
 *  - Amendment section 17 programme checks: session sizes, weekly sets,
 *    rep and rest sanity;
 *  - Amendment section 16 coverage: each family trains its claimed scope
 *    (full-body families cover upper AND lower; upper families cover the
 *    pressing and pulling sides);
 *  - CC-F3/CAP-3: function-named only - no population or condition
 *    labels anywhere in names, tags or descriptions.
 */
const { computePlanCompatibility } = require('../capability/planCompat');
const { buildCapabilityResolveState } = require('../capability/resolve');
const { deriveExerciseMetadata } = require('../exerciseMetadata');
const { deriveDemandMetadata } = require('../capability/demands');

const NOW = 1_750_000_000_000;
const fs = require('fs');
const path = require('path');

// ── The real library, derived the same way the seed derives ─────────────
function realLibraryByName() {
  const seedSrc = fs.readFileSync(path.resolve(__dirname, '../seedExercises.js'), 'utf8');
  const start = seedSrc.indexOf('const RAW = [');
  const body = seedSrc.slice(start, seedSrc.indexOf('\n];', start));
  const out = new Map();
  const re = /\[\s*'([^']+)',\s*'([a-z_]+)',\s*\[([^\]]*)\],\s*'([a-z_]+)',\s*'([a-z_]+)',\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const base = {
      name: m[1], primaryMuscle: m[2], equipment: m[4], movementPattern: m[5],
      compoundIsolation: m[6] === 'true' ? 'compound' : 'isolation',
    };
    out.set(m[1], { id: m[1], ...base, ...deriveExerciseMetadata(base), ...deriveDemandMetadata(base) });
  }
  return out;
}

// ── The family plans + REQUIRED_EXERCISES, parsed from seedRoutines ─────
function parseSeedRoutines() {
  const src = fs.readFileSync(path.resolve(__dirname, '../seedRoutines.js'), 'utf8');
  const plansStart = src.indexOf('const LIBRARY_PLANS = [');
  const plansBody = src.slice(plansStart, src.indexOf('\n];', plansStart));
  const plans = [];
  const planRe = /\{\s*\n\s*name: '((?:[^'\\]|\\.)*)',\s*\n\s*description: '((?:[^'\\]|\\.)*)',\s*\n\s*tags: '([^']*)'/g;
  let m;
  const indices = [];
  while ((m = planRe.exec(plansBody)) !== null) {
    indices.push({ name: m[1], description: m[2], tags: m[3], start: m.index });
  }
  for (let i = 0; i < indices.length; i++) {
    const seg = plansBody.slice(indices[i].start, indices[i + 1]?.start ?? plansBody.length);
    const exNames = [...seg.matchAll(/\{ name: '((?:[^'\\]|\\.)*)',\s*sets: (\d+),\s*repsMin: (\d+),\s*repsMax: (\d+),\s*rest: (\d+)/g)]
      .map((x) => ({ name: x[1], sets: +x[2], repsMin: +x[3], repsMax: +x[4], rest: +x[5] }));
    const workoutCount = (seg.match(/name: 'Day /g) ?? []).length;
    plans.push({ ...indices[i], exercises: exNames, workoutCount });
  }
  const required = [...src.matchAll(/name: '((?:[^'\\]|\\.)*)',\s*primaryMuscle/g)].map((x) => x[1]);
  return { plans, required: new Set(required) };
}

const LIB = realLibraryByName();
const { plans, required } = parseSeedRoutines();

const cap = (rules) => buildCapabilityResolveState(
  rules.map((ruleValue, i) => ({
    id: `c${i}`, userId: 'u', role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue, laterality: null, startsAt: NOW - 1, endsAt: null, state: 'active',
    endedAt: null, endedReason: null, episodeGroupId: null, deletedAt: null,
  })),
  { atMs: NOW },
);

// Each family's OWN capability profile - the audience the plan claims.
const FAMILY_PROFILES = {
  'Seated Full Body': cap(['standing']),
  'Seated Upper Strength': cap(['standing']),
  'No-Floor Full Body': cap(['floor_access']),
  'Supported Machine Builder': cap(['balance_high']),
  'Supported Machine Builder II': cap(['balance_high']),
  'One-Arm Upper Builder': cap(['bilateral_upper']),
  'One-Leg Lower Builder': cap(['bilateral_lower']),
  'Steady-Base Full Body': cap(['balance_high']),
  'Dumbbell & Band Foundations': cap([]),
  'No-Overhead Upper Split': cap(['overhead_position']),
};

const FAMILY_NAMES = Object.keys(FAMILY_PROFILES);
const familyPlans = plans.filter((p) => FAMILY_NAMES.includes(p.name));

test('all nine families are present in the seed with real content', () => {
  expect(familyPlans.map((p) => p.name).sort()).toEqual(FAMILY_NAMES.sort());
  for (const p of familyPlans) {
    expect(p.exercises.length).toBeGreaterThanOrEqual(8);
    expect(p.workoutCount).toBeGreaterThanOrEqual(2);
  }
});

test('every referenced exercise name resolves against the library', () => {
  const missing = [];
  for (const p of familyPlans) {
    for (const ex of p.exercises) {
      if (!LIB.has(ex.name) && !required.has(ex.name)) missing.push({ plan: p.name, name: ex.name });
    }
  }
  expect(missing).toEqual([]);
});

test("each family's rows pass ITS OWN capability profile - compatible by construction", () => {
  const failures = [];
  for (const p of familyPlans) {
    const rows = p.exercises.map((ex) => LIB.get(ex.name)).filter(Boolean);
    const verdict = computePlanCompatibility(FAMILY_PROFILES[p.name], rows);
    for (const c of verdict.conflicts) failures.push({ plan: p.name, name: c.row.name, reason: c.reason });
    for (const u of verdict.unknowns) failures.push({ plan: p.name, name: u.row.name, reason: u.reason });
  }
  expect(failures).toEqual([]);
});

test('Amendment section 17: session sizes, weekly sets, rep and rest sanity', () => {
  for (const p of familyPlans) {
    const perDay = p.exercises.length / p.workoutCount;
    expect({ plan: p.name, perDay }).toEqual({ plan: p.name, perDay: expect.any(Number) });
    expect(perDay).toBeGreaterThanOrEqual(4);
    expect(perDay).toBeLessThanOrEqual(6);
    const weeklySets = p.exercises.reduce((s, e) => s + e.sets, 0);
    expect(weeklySets).toBeGreaterThanOrEqual(20);
    for (const ex of p.exercises) {
      expect(ex.repsMin).toBeGreaterThanOrEqual(5);
      expect(ex.repsMax).toBeLessThanOrEqual(25);
      expect(ex.rest).toBeGreaterThanOrEqual(45);
      expect(ex.rest).toBeLessThanOrEqual(180);
    }
  }
});

test('Amendment section 16: each family covers its claimed scope', () => {
  const muscleOf = (name) => LIB.get(name)?.primaryMuscle ?? null;
  const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'tibialis']);
  for (const p of familyPlans) {
    const muscles = new Set(p.exercises.map((e) => muscleOf(e.name)).filter(Boolean));
    if (/Full Body|Foundations/.test(p.name)) {
      expect([...muscles].some((mu) => LOWER.has(mu))).toBe(true);
      expect([...muscles].some((mu) => !LOWER.has(mu))).toBe(true);
      expect(muscles.size).toBeGreaterThanOrEqual(5);
    }
    if (/Upper/.test(p.name)) {
      expect(muscles.has('chest') || muscles.has('front_delts')).toBe(true);
      expect(muscles.has('back')).toBe(true);
    }
    if (/Lower/.test(p.name)) {
      expect(muscles.has('quads')).toBe(true);
      expect(muscles.has('hamstrings') || muscles.has('glutes')).toBe(true);
    }
  }
});

test('CC-F3/CAP-3: function names only - no population or condition labels anywhere', () => {
  const banned = /wheelchair|disabilit|amputee|paraplegi|stroke|parkinson|sclerosis|arthrit|elderly|senior|impair/i;
  for (const p of familyPlans) {
    expect(`${p.name} ${p.description} ${p.tags}`).not.toMatch(banned);
  }
});
