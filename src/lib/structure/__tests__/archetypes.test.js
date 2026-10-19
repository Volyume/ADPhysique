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
 *  5. V-taper and upper-body density keep one leg day a week, glutes on it
 *     (founder answer 1b); upper-body density trains chest and back twice a
 *     week from 4 days; powerbuilder has no Shoulders & Arms day.
 *  6. Powerbuilder loads its main lifts (squat, bench, deadlift, barbell
 *     row) at 3 to 6 reps, never for a beginner, with size work at normal
 *     ranges (founder answer 2); minimalist aims every muscle at its minimum.
 *  Refusals at 2 or 3 days for styles with many priority muscles stay
 *  honest, as for bodybuilding and classic physique (founder answer 3a).
 *  7. A competing category ignores an archetype; an unknown one is refused.
 *  8. A stored plan reads the same targets (so the weekly coach does).
 */
import { buildStructurePlan, weeklyTargets } from '../engine';
import { checkPlan } from '../checker';
import {
  ARCHETYPES, ARCHETYPE_KEYS, ARCHETYPE_CATEGORIES, TIERS, TEMPLATES, LEGS_ONCE, DAY_COUNTS,
  STRENGTH_REP_RANGE, STRENGTH_PATTERNS, REP_RANGES, rulebookCategory, archetypeCategory, ruleKeyOf, strengthRangeFor,
} from '../rulebook';
import { planFromFacts } from '../stored';
import { structureFacts } from '../adapt';

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
    expect(['quads', 'hamstrings', 'glute_max', 'calves'].map((m) => tier('v_taper', m))).toEqual(['M', 'M', 'M', 'M']);
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

// Where a style with many priority muscles cannot reach its minimums in too
// few days, it is refused honestly with a suggestion, as bodybuilding and
// classic physique are at 2 and 3 days (founder answer 3a).
const REFUSED = Object.freeze({ x_frame: [2, 3], powerbuilder: [2] });

describe('every archetype builds and passes the checker, or is refused honestly', () => {
  for (const a of ARCHETYPE_KEYS) {
    for (const days of DAY_COUNTS) {
      const refused = (REFUSED[a] || []).includes(days);
      test(`${a}, ${days} days: ${refused ? 'refused with a suggestion' : 'builds'}`, () => {
        const r = build({ days, archetype: a });
        if (refused) {
          expect(r.ok).toBe(false);
          expect(r.refusal.reason).toBe('minimum_unreachable');
          expect(r.refusal.suggestedDays).toBeGreaterThan(days);
          return;
        }
        expect([a, days, r.ok, r.refusal?.reason]).toEqual([a, days, true, undefined]);
        expect([a, days, checkPlan(r.plan).failures]).toEqual([a, days, []]);
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

  test('upper_density trains chest and back twice a week from 4 days', () => {
    const c = archetypeCategory('upper_density');
    for (const days of [4, 5, 6]) {
      const count = (m) => TEMPLATES[c][days].filter((s) => s.muscles.includes(m)).length;
      expect([days, count('chest') >= 2, count('lats') >= 2, count('upper_back') >= 2]).toEqual([days, true, true, true]);
    }
  });

  test('powerbuilder has no Shoulders & Arms day', () => {
    const c = archetypeCategory('powerbuilder');
    for (const days of DAY_COUNTS) expect(TEMPLATES[c][days].map((s) => s.key)).not.toContain('shoulders_arms');
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

  test('powerbuilder loads its main lifts at 3 to 6 reps, never for a beginner', () => {
    const all = (plan) => plan.sessions.flatMap((s) => s.exercises);
    const heavy = (plan) => all(plan).filter((ex) => ex.kind === 'heavy_compound');
    const pb = build({ days: 4, archetype: 'powerbuilder' }).plan;
    const main = all(pb).filter((ex) => ex.kind === 'heavy_compound' && STRENGTH_PATTERNS.includes(ex.pattern));
    expect(main.length).toBeGreaterThan(0);
    for (const ex of main) expect(ex.repRange).toEqual([...STRENGTH_REP_RANGE]);
    // Size work around the main lifts keeps its normal range.
    for (const ex of all(pb).filter((e) => !STRENGTH_PATTERNS.includes(e.pattern))) expect(ex.repRange).not.toEqual([...STRENGTH_REP_RANGE]);
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

  test('a plan stores its category and style apart, and a stored plan reads the same targets', () => {
    const r = build({ days: 4, archetype: 'x_frame' });
    // An older build reading this synced plan sees an ordinary general plan.
    expect(r.plan.category).toBe('general');
    expect(r.plan.archetype).toBe('x_frame');
    expect(ruleKeyOf(r.plan)).toBe('general_x_frame');
    expect(weeklyTargets(ruleKeyOf(r.plan), 4, 'intermediate', []).quads.tier).toBe('P');
    const factsOf = (res) => structureFacts(res, { lengthMinutes: 75 }, { routineIds: res.plan.sessions.map((_, i) => `r${i}`) });
    const facts = factsOf(r);
    expect(facts.structure.category).toBe('general');
    expect(facts.structure.archetype).toBe('x_frame');
    const back = planFromFacts(facts);
    expect(back.archetype).toBe('x_frame');
    expect(checkPlan(back).failures).toEqual([]);
    // A balanced plan carries no style field at all, exactly as before.
    expect(build({ days: 4, archetype: 'balanced' }).plan).not.toHaveProperty('archetype');
  });

  test('a stored style a build does not know is dropped, never guessed', () => {
    const r = build({ days: 4, archetype: 'x_frame' });
    const facts = structureFacts(r, { lengthMinutes: 75 }, { routineIds: r.plan.sessions.map((_, i) => `r${i}`) });
    facts.structure.archetype = 'from_a_newer_build';
    expect(planFromFacts(facts)).not.toHaveProperty('archetype');
  });

  test('the weekly coach opens powerbuilder main lifts at the strength range', () => {
    expect(strengthRangeFor({ archetype: 'powerbuilder', experience: 'advanced' })).toBe(true);
    expect(strengthRangeFor({ archetype: 'powerbuilder', experience: 'beginner' })).toBe(false);
    expect(strengthRangeFor({ archetype: 'x_frame', experience: 'advanced' })).toBe(false);
    expect(strengthRangeFor(null)).toBe(false);
  });

  test('upper_density at 2 days keeps the legs and abs session core', () => {
    const legs = TEMPLATES.general_upper_density[2].find((x) => x.key === 'legs_abs');
    expect(legs.core.length).toBeGreaterThan(0);
  });
});
