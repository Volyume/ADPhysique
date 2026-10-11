/**
 * gate.test.js -- the structure engine's gate (D222, build plan phase 5):
 * every category at every day count in every equipment kit, with the real
 * seeded library, either builds a plan that passes every rulebook check or
 * is refused honestly. Nothing in between.
 *
 * Pins:
 * - no plan the engine returns fails the checker (09 s10 S9);
 * - a refusal names muscles that really are below their minimum, and the
 *   fewest days that would hold the week when there are any (09 B12);
 * - the weeks refused for an intermediate person are exactly the list
 *   below, each one a week the hard rules cannot hold (a regression that
 *   refuses more, or a rule change that quietly lets one through, fails
 *   here);
 * - men's physique, the founder's own category, builds at every day count in
 *   every gym kit;
 * - focus only adds (C5) and the clock never removes a set (Q1 = C).
 */
import { buildStructurePlan } from '../engine';
import { checkPlan, checkFocusAgainstBaseline } from '../checker';
import { CATEGORIES, DAY_COUNTS, TIERS, VOLUME } from '../rulebook';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

jest.setTimeout(600000);

const KITS = ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight'];
const build = (goal, days, equipment, over = {}) => buildStructurePlan({
  goal, days, lengthMinutes: 60, equipment, experience: 'intermediate', focus: [], library: LIBRARY, ...over,
});
const sig = (plan) => plan.sessions.map((s) => s.exercises.map((ex) => `${ex.name}x${ex.peak}`).join(',')).join('|');

// The weeks refused today for an intermediate person (32 of 240), all at 2
// or 3 days except one. Lead-checked by hand (map 10, register D222):
// - classic physique 3 days, every kit: the one leg session must carry
//   quads, hamstrings and calves at their priority minimum of 8 each plus
//   glute med, at least 27 sets against the 24-set cap;
// - side delts in the barbell and bodyweight kits at 2 and 3 days: one
//   lateral raise (plate or band), capped at 5 sets, in one session, below
//   the priority minimum of 6 or 8;
// - wellness 3 days in kits with no quad isolation: the quad sets the
//   minimum needs credit enough glute work to break recovery against the
//   glute session that neighbours it;
// - the rest are 2- and 3-day weeks in limited kits, plus wellness 5 days
//   with bodyweight, where one session carries a priority muscle that the
//   kit offers one or two exercises for.
// The list may only shrink. A refusal shows the fewest days that would hold
// the week (09 B12); the person chooses.
const KNOWN_REFUSALS = new Set([
  'bodybuilding 2d dumbbells_only', 'bodybuilding 2d barbell_plates', 'bodybuilding 2d home_gym', 'bodybuilding 2d bodyweight',
  'bodybuilding 3d barbell_plates', 'bodybuilding 3d bodyweight',
  'classic_physique 2d barbell_plates', 'classic_physique 2d bodyweight',
  'classic_physique 3d full_gym', 'classic_physique 3d machines_cables', 'classic_physique 3d dumbbells_only',
  'classic_physique 3d barbell_plates', 'classic_physique 3d home_gym', 'classic_physique 3d bodyweight',
  'mens_physique 2d barbell_plates', 'mens_physique 2d bodyweight', 'mens_physique 3d barbell_plates', 'mens_physique 3d bodyweight',
  'wellness 2d machines_cables',
  'wellness 3d dumbbells_only', 'wellness 3d barbell_plates', 'wellness 3d home_gym', 'wellness 3d bodyweight',
  'wellness 5d bodyweight',
  'figure 2d barbell_plates', 'figure 2d bodyweight', 'figure 3d barbell_plates', 'figure 3d bodyweight',
  'womens_physique 2d barbell_plates', 'womens_physique 2d bodyweight', 'womens_physique 3d barbell_plates', 'womens_physique 3d bodyweight',
]);

describe('every category, day count and kit (intermediate)', () => {
  const refused = [];
  const results = [];
  for (const goal of CATEGORIES) {
    for (const days of DAY_COUNTS) {
      for (const kit of KITS) results.push({ goal, days, kit, r: build(goal, days, kit) });
    }
  }

  test('every plan returned passes every check', () => {
    const bad = results.filter(({ r }) => r.ok && !checkPlan(r.plan).ok)
      .map(({ goal, days, kit, r }) => `${goal} ${days}d ${kit}: ${checkPlan(r.plan).failures.map((f) => f.code).join(',')}`);
    expect(bad).toEqual([]);
  });

  test('every refusal is honest: its muscles are below their minimum', () => {
    for (const { goal, days, kit, r } of results) {
      if (r.ok) continue;
      expect([goal, days, kit, r.refusal.reason]).toEqual([goal, days, kit, 'minimum_unreachable']);
      for (const m of r.refusal.muscles) {
        const min = VOLUME[TIERS[m.muscle][goal]].min[days];
        expect([goal, days, kit, m.muscle, m.sets < min]).toEqual([goal, days, kit, m.muscle, true]);
      }
      if (r.refusal.minimumDays != null) expect(r.refusal.minimumDays).toBeGreaterThan(days);
      refused.push(`${goal} ${days}d ${kit}`);
    }
  });

  test('the refused weeks are exactly the known ones', () => {
    expect(refused.filter((x) => !KNOWN_REFUSALS.has(x))).toEqual([]);
    expect([...KNOWN_REFUSALS].filter((x) => !refused.includes(x))).toEqual([]);
  });

  test("men's physique builds at every day count in every gym kit", () => {
    const mp = results.filter(({ goal, kit }) => goal === 'mens_physique' && ['full_gym', 'machines_cables', 'dumbbells_only', 'home_gym'].includes(kit));
    expect(mp).toHaveLength(20);
    expect(mp.filter(({ r }) => !r.ok).map(({ days, kit }) => `${days}d ${kit}`)).toEqual([]);
  });
});

describe('focus and the clock', () => {
  test.each(CATEGORIES)('%s: a focus pick at 4 days only adds (C5)', (goal) => {
    const pick = Object.keys(TIERS).find((m) => TIERS[m][goal] === 'P') || 'chest';
    const base = build(goal, 4, 'full_gym');
    const withFocus = build(goal, 4, 'full_gym', { focus: [pick] });
    expect(base.ok && withFocus.ok).toBe(true);
    expect(checkFocusAgainstBaseline(withFocus.plan, base.plan).failures).toEqual([]);
  });

  test.each(CATEGORIES)('%s: the same plan at 30 and 90 minutes (Q1 = C)', (goal) => {
    const short = build(goal, 4, 'full_gym', { lengthMinutes: 30 });
    const long = build(goal, 4, 'full_gym', { lengthMinutes: 90 });
    expect(sig(short.plan)).toBe(sig(long.plan));
    expect(short.report.needsLengthChoice).toBe(true);
  });
});
