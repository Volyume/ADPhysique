/**
 * Physique archetypes (founder ruling 2026-10-19, answers 1a, 2b, 3b, 4b).
 *
 * A person who is not competing picks a training style. Each archetype is the
 * general rulebook with some muscles re-tiered, built by the REAL engine and
 * judged by the REAL checker. This suite pins:
 *  1. The approved tier table exactly, and that no archetype lifts an
 *     indirect-only muscle (front delts, traps, forearms).
 *  2. Balanced is the general rulebook itself: the same plan as no archetype.
 *  3. Every archetype builds at 2 to 6 days and passes the checker, so every
 *     hard safety limit holds.
 *  4. Its priority muscles get more weekly work than under balanced.
 *  5. V-taper and upper-body density train on the upper-biased rotation with
 *     one leg day a week, glutes on it.
 *  6. Powerbuilder loads heavy compounds at 3 to 6 reps (never for a
 *     beginner); minimalist aims every muscle at its minimum.
 *  7. A competing category ignores an archetype; an unknown one is refused.
 *  8. A stored plan reads the same targets (so the weekly coach does).
 */
import { buildStructurePlan, weeklyTargets } from '../engine';
import { checkPlan } from '../checker';
import {
  ARCHETYPES, ARCHETYPE_KEYS, ARCHETYPE_CATEGORIES, TIERS, TEMPLATES, LEGS_ONCE, DAY_COUNTS,
  STRENGTH_REP_RANGE, REP_RANGES, rulebookCategory, archetypeCategory,
} from '../rulebook';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const build = (over = {}) => buildStructurePlan({
  goal: 'general', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'intermediate', focus: [], library: LIBRARY, ...over,
});
const weekly = (plan) => {
  const out = {};
  for (const s of plan.sessions) for (const ex of s.exercises) out[ex.muscle] = (out[ex.muscle] || 0) + ex.peak;
  return out;
};
const INDIRECT = ['front_delts', 'traps', 'forearms'];

describe('the approved table (1a)', () => {
  test('exactly the five styles plus balanced', () => {
    expect(ARCHETYPE_KEYS).toEqual(['balanced', 'v_taper', 'x_frame', 'upper_density', 'powerbuilder', 'minimalist']);
  });

  test('the re-tiered muscles, as approved', () => {
    const tier = (a, m) => TIERS[m][archetypeCategory(a)];
    expect(['lats', 'side_delts', 'upper_back'].map((m) => tier('v_taper', m))).toEqual(['P', 'P', 'P']);
    expect(['lats', 'side_delts', 'quads', 'hamstrings'].map((m) => tier('x_frame', m))).toEqual(['P', 'P', 'P', 'P']);
    expect(['chest', 'upper_back', 'lats'].map((m) => tier('upper_density', m))).toEqual(['P', 'P', 'P']);
    expect(['quads', 'hamstrings', 'glute_max', 'calves'].map((m) => tier('upper_density', m))).toEqual(['M', 'M', 'M', 'M']);
    expect(['quads', 'glute_max', 'chest', 'upper_back'].map((m) => tier('powerbuilder', m))).toEqual(['P', 'P', 'P', 'P']);
    expect(['side_delts', 'biceps', 'calves'].map((m) => tier('powerbuilder', m))).toEqual(['M', 'M', 'M']);
    for (const m of Object.keys(TIERS)) expect([m, tier('minimalist', m)]).toEqual([m, TIERS[m].general]);
  });

  test('no archetype lifts an indirect-only muscle', () => {
    for (const c of ARCHETYPE_CATEGORIES) for (const m of INDIRECT) expect([c, m, TIERS[m][c]]).toEqual([c, m, 'I']);
  });
});

describe('category resolution', () => {
  test('balanced is the general rulebook; a competing category ignores an archetype', () => {
    expect(rulebookCategory('general', 'balanced')).toBe('general');
    expect(rulebookCategory('general', 'v_taper')).toBe('general_v_taper');
    expect(rulebookCategory('strength_size', 'x_frame')).toBe('general_x_frame');
    expect(rulebookCategory('mens_physique', 'v_taper')).toBe('mens_physique');
    expect(rulebookCategory('bikini', 'powerbuilder')).toBe('bikini');
  });

  test('balanced builds exactly the plan no archetype builds', () => {
    for (const days of DAY_COUNTS) {
      const a = build({ days });
      const b = build({ days, archetype: 'balanced' });
      expect(JSON.stringify(b.plan)).toBe(JSON.stringify(a.plan));
    }
  });

  test('an unknown training style is refused, never read as balanced', () => {
    const r = build({ archetype: 'bulk_mode' });
    expect(r.ok).toBe(false);
    expect(r.refusal.reason).toBe('archetype_unknown');
  });
});

describe('every archetype builds and passes the checker at 2 to 6 days', () => {
  for (const a of ARCHETYPE_KEYS) {
    for (const days of DAY_COUNTS) {
      test(`${a}, ${days} days`, () => {
        const r = build({ days, archetype: a });
        expect([a, days, r.ok, r.refusal?.reason]).toEqual([a, days, true, undefined]);
        const verdict = checkPlan(r.plan);
        expect([a, days, verdict.errors ?? verdict.failures ?? []]).toEqual([a, days, []]);
      });
    }
  }
});

describe('what each style changes', () => {
  test('priority muscles get more weekly work than under balanced', () => {
    const base = weekly(build({ days: 4 }).plan);
    for (const a of ['v_taper', 'x_frame', 'upper_density', 'powerbuilder']) {
      const w = weekly(build({ days: 4, archetype: a }).plan);
      const priority = Object.entries(ARCHETYPES[a].tiers).filter(([, t]) => t === 'P').map(([m]) => m);
      const gained = priority.filter((m) => (w[m] || 0) > (base[m] || 0));
      expect([a, gained.length > 0]).toEqual([a, true]);
    }
  });

  test('v_taper and upper_density train legs once a week, glutes on that day', () => {
    for (const a of ['v_taper', 'upper_density']) {
      const c = archetypeCategory(a);
      expect(LEGS_ONCE[c]).toEqual(LEGS_ONCE.mens_physique);
      for (const days of DAY_COUNTS) {
        const legDays = TEMPLATES[c][days].filter((s) => s.muscles.includes('quads'));
        expect([a, days, legDays.length]).toEqual([a, days, 1]);
        expect(legDays[0].muscles).toEqual(expect.arrayContaining(['glute_max', 'glute_med']));
      }
    }
  });

  test('powerbuilder loads heavy compounds at 3 to 6 reps, never for a beginner', () => {
    const heavy = (plan) => plan.sessions.flatMap((s) => s.exercises).filter((ex) => ex.kind === 'heavy_compound');
    const pb = build({ days: 4, archetype: 'powerbuilder' }).plan;
    expect(heavy(pb).length).toBeGreaterThan(0);
    for (const ex of heavy(pb)) expect(ex.repRange).toEqual([...STRENGTH_REP_RANGE]);
    const beginner = build({ days: 4, archetype: 'powerbuilder', experience: 'beginner' }).plan;
    for (const ex of heavy(beginner)) expect(ex.repRange).not.toEqual([...STRENGTH_REP_RANGE]);
    // Other styles keep the normal range.
    for (const ex of heavy(build({ days: 4, archetype: 'x_frame' }).plan)) expect(ex.repRange).toEqual([...REP_RANGES.heavy_compound]);
  });

  test('minimalist aims every muscle at its minimum, focus picks still add', () => {
    const t = weeklyTargets('general_minimalist', 4, 'intermediate', []);
    for (const m of Object.keys(t)) expect([m, t[m].typical]).toEqual([m, t[m].min]);
    const f = weeklyTargets('general_minimalist', 4, 'intermediate', ['side_delts']);
    expect(f.side_delts.target).toBeGreaterThan(f.side_delts.min);
    const total = (plan) => Object.values(weekly(plan)).reduce((x, y) => x + y, 0);
    expect(total(build({ days: 4, archetype: 'minimalist' }).plan)).toBeLessThan(total(build({ days: 4 }).plan));
  });

  test('the plan records its archetype as its rulebook category, so a stored plan reads the same targets', () => {
    const r = build({ days: 4, archetype: 'x_frame' });
    expect(r.plan.category).toBe('general_x_frame');
    expect(weeklyTargets(r.plan.category, 4, 'intermediate', []).quads.tier).toBe('P');
  });
});
