/**
 * CC28 GATE - the onboarding walk fixtures (ROADMAP CC28 gate).
 *
 * Four scenario users - seated (wheelchair-profile), no-floor, one-arm,
 * grip-limited - walk the FREE first-plan path: capability state ->
 * computed plan compatibility over the REAL seeded library plans -> the
 * real free-starter recommender over the compatible pool. Each walk must
 * end on a recommendation that is FULLY compatible with that user's
 * state - the day-one promise (section 11.3), proven against real
 * content, real derivation, real resolver, real recommender.
 */
const { getCapabilityAwareStarterRecommendation, getPlanDays } = require('../onboarding/freeStarter');
const { computePlanCompatibility } = require('../capability/planCompat');
const { buildCapabilityResolveState } = require('../capability/resolve');
const { deriveExerciseMetadata } = require('../exerciseMetadata');
const { deriveDemandMetadata } = require('../capability/demands');

const fs = require('fs');
const path = require('path');
const NOW = 1_750_000_000_000;

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

// Parse EVERY library plan from the seed into { plan meta, exercise rows }.
function parsePlans(LIB) {
  const src = fs.readFileSync(path.resolve(__dirname, '../seedRoutines.js'), 'utf8');
  const plansStart = src.indexOf('const LIBRARY_PLANS = [');
  const plansBody = src.slice(plansStart, src.indexOf('\n];', plansStart));
  const planRe = /\{\s*\n\s*name: '((?:[^'\\]|\\.)*)',\s*\n\s*description: '((?:[^'\\]|\\.)*)',\s*\n\s*tags: '([^']*)'/g;
  const indices = [];
  let m;
  while ((m = planRe.exec(plansBody)) !== null) {
    indices.push({ name: m[1], description: m[2], tags: m[3], start: m.index });
  }
  const plans = [];
  for (let i = 0; i < indices.length; i++) {
    const seg = plansBody.slice(indices[i].start, indices[i + 1]?.start ?? plansBody.length);
    const diff = /difficulty: (\d+)/.exec(seg);
    const rows = [...seg.matchAll(/\{ name: '((?:[^'\\]|\\.)*)',\s*sets: (\d+)/g)]
      .map((x) => LIB.get(x[1]))
      .filter(Boolean);
    plans.push({
      id: indices[i].name, name: indices[i].name, tags: indices[i].tags,
      description: indices[i].description, difficulty: diff ? +diff[1] : null,
      rows,
    });
  }
  return plans;
}

const LIB = realLibraryByName();
const PLANS = parsePlans(LIB);

const capState = (rules) => buildCapabilityResolveState(
  rules.map((ruleValue, i) => ({
    id: `c${i}`, userId: 'u', role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue, laterality: null, startsAt: NOW - 1, endsAt: null, state: 'active',
    endedAt: null, endedReason: null, episodeGroupId: null, deletedAt: null,
  })),
  { atMs: NOW },
);

const SCENARIOS = [
  { label: 'seated user (cannot stand)', rules: ['standing'] },
  { label: 'no floor access', rules: ['floor_access'] },
  { label: 'one-arm user', rules: ['bilateral_upper'] },
  { label: 'grip-limited user', rules: ['grip_bar'] },
];

// The FREE walk: goal + equipment + days answered, then the capability
// step, then the recommendation over the compatible pool - exactly what
// FreeStarterScreen computes.
function walk(rules, answers) {
  const state = capState(rules);
  const compatible = PLANS.filter((p) => computePlanCompatibility(state, p.rows).fullyCompatible);
  const rec = getCapabilityAwareStarterRecommendation(answers, PLANS, new Set(compatible.map((p) => p.id)));
  return { state, compatible, rec };
}

describe.each(SCENARIOS)('$label', ({ rules }) => {
  test('a fully compatible plan pool exists in the seeded library', () => {
    const { compatible } = walk(rules, { goal: 'build_muscle', equipment: 'full_gym', days: 3 });
    expect(compatible.length).toBeGreaterThanOrEqual(1);
  });

  test('the free-starter walk ends on a compatible first plan', () => {
    const { state, rec } = walk(rules, { goal: 'build_muscle', equipment: 'full_gym', days: 3 });
    expect(rec).toBeTruthy();
    const verdict = computePlanCompatibility(state, PLANS.find((p) => p.name === rec.name).rows);
    expect({ plan: rec.name, fullyCompatible: verdict.fullyCompatible })
      .toEqual({ plan: rec.name, fullyCompatible: true });
  });
});

test('the compatible pools come from NORMAL browse content, never a segregated shelf (Amendment section 13)', () => {
  // The family plans carry ordinary tags (days:N, goal:...) exactly like
  // every other library plan - the recommender needs no special casing.
  for (const p of PLANS.filter((pl) => /adapted/.test(pl.tags))) {
    expect(getPlanDays(p)).not.toBeNull();
    expect(p.tags).toMatch(/goal:/);
  }
});
