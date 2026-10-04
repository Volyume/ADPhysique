/**
 * planEngine.libraryOrder.test.js — D219 lane B1 (design 1.3 and 4.7,
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md; R1 3.2, 3.4).
 *
 * What this suite pins and why:
 *
 * The selection score added each exercise's position in the library list to
 * its score, one point a position, against two points a canonicality tier.
 * The app hands the engine the library as `ORDER BY name ASC`, so the
 * alphabet decided between exercises the registry had ranked equal or close:
 * with the same 918 rows the shipped order picked 11 staples out of 22, the
 * reverse order 4, and a tier-first order 21 (R1 probe 10). A person's plan
 * carried B-Stance Hip Thrust, Donkey Calf Raise and Bayesian Curl because of
 * where those names fall in the alphabet.
 *
 * The founder's rule (D219): "the most standard exercises that are available
 * in all gyms. No random selection of complex exercises out the box that
 * aren't very well known." So:
 *
 *   - The same profile and the same inputs give the SAME generated plan in
 *     ANY library order: the shipped order, its reverse and seeded shuffles.
 *     This is the contract; it fails on a score that reads the list position.
 *   - A tie on every other term is broken by the canonicality tier and then by
 *     the exercise name, a comparison of values, never by position.
 *   - Source guard: the score no longer adds the list position.
 *
 * Nothing else in the score or the pipeline changes, so the per-term order
 * (required role, compound first, division role, SFR, tier, fatigue) is the
 * one Campaign 16 locked.
 */
const fs = require('fs');
const path = require('path');
const { generatePlan } = require('../planEngine');
const { LIBRARY, inputs } = require('./campaign16.helpers');

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const SHIPPED = [...LIBRARY].sort(byName);

/** A small seeded generator (mulberry32), so every shuffle is the same on every run. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, seed) {
  const out = [...list];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ORDERS = [
  ['reversed', [...SHIPPED].reverse()],
  ['seeded shuffle 1', shuffled(LIBRARY, 20261004)],
  ['seeded shuffle 2', shuffled(LIBRARY, 7)],
  ['corpus order', LIBRARY],
];

const planFor = (over, library) => generatePlan({ ...inputs(over), exerciseLibrary: library });

// Every equipment profile, every division and the strength goal, the day
// counts, three experience levels, session lengths, and a weak point.
const CASES = [
  ['the default plan', {}],
  ['2 days', { daysPerWeek: 2 }],
  ['3 days', { daysPerWeek: 3 }],
  ['5 days', { daysPerWeek: 5 }],
  ['6 days, advanced', { daysPerWeek: 6, experience: 'advanced' }],
  ['a beginner', { experience: 'beginner' }],
  ['45 minute sessions', { sessionLengthMinutes: 45 }],
  ['90 minute sessions', { sessionLengthMinutes: 90 }],
  ['machines and cables', { equipment: 'machines_cables' }],
  ['dumbbells only', { equipment: 'dumbbells_only' }],
  ['barbell and plates', { equipment: 'barbell_plates' }],
  ['a home gym', { equipment: 'home_gym' }],
  ['bodyweight', { equipment: 'bodyweight' }],
  ['bodybuilding', { goal: 'bodybuilding', daysPerWeek: 5 }],
  ['classic physique', { goal: 'classic_physique', daysPerWeek: 5 }],
  ["men's physique", { goal: 'mens_physique', daysPerWeek: 5 }],
  ['bikini', { goal: 'bikini', daysPerWeek: 5 }],
  ['wellness', { goal: 'wellness', daysPerWeek: 4 }],
  ['figure', { goal: 'figure', daysPerWeek: 4 }],
  ["women's physique", { goal: 'womens_physique', daysPerWeek: 5 }],
  ['strength and size', { goal: 'strength_hypertrophy', daysPerWeek: 4 }],
  ['a side delts weak point', { phase: 'weak_point', weakPoints: ['Side Delts'], daysPerWeek: 5 }],
];

describe('D219 B1: the same inputs give the same plan in any library order', () => {
  test.each(CASES)('%s', (_label, over) => {
    const reference = planFor(over, SHIPPED);
    // A plan that is empty would make the comparison vacuous.
    expect(reference.workouts.length).toBeGreaterThan(0);
    const wanted = JSON.stringify(reference);
    for (const [orderLabel, library] of ORDERS) {
      const got = JSON.stringify(planFor(over, library));
      // Compare the picks first so a failure names the exercises that moved.
      if (got !== wanted) {
        const names = p => p.workouts.map(w => `${w.name}: ${w.exercises.map(e => e.exerciseName).join(' | ')}`);
        expect({ order: orderLabel, picks: names(planFor(over, library)) })
          .toEqual({ order: orderLabel, picks: names(reference) });
      }
      expect(got).toBe(wanted);
    }
  });

  test('the library is not mutated by generating from it', () => {
    const before = JSON.stringify(SHIPPED.map(e => e.name));
    planFor({}, SHIPPED);
    expect(JSON.stringify(SHIPPED.map(e => e.name))).toBe(before);
  });
});

describe('D219 B1: the score no longer reads the list position (source guard)', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'planEngine.js'), 'utf8');

  test('the selection score does not add the position term', () => {
    expect(source).not.toMatch(/fatiguePenalty\s*\+\s*idx/);
    expect(source).not.toMatch(/sortScore\(e,\s*idx\)/);
    expect(source).not.toMatch(/\.map\(\(e,\s*idx\)\s*=>\s*\(\{\s*e,\s*score:\s*sortScore/);
  });

  test('a tie is broken by tier then name, as a comparison of values', () => {
    expect(source).toMatch(/tierRank\(a\.e\.n\)\s*-\s*tierRank\(b\.e\.n\)|a\.tier\s*-\s*b\.tier/);
    // Not localeCompare: it depends on the device's locale, so the same plan
    // could differ between two phones.
    const rankBlock = source.slice(source.indexOf('const rank = list'), source.indexOf('const sorted = rank(available)'));
    expect(rankBlock).not.toMatch(/localeCompare/);
  });
});
