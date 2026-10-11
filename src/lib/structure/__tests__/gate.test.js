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
 *   a gym and from 3 days with dumbbells or a home gym;
 * - focus only adds (C5) and the clock never removes a set (Q1 = C).
 */
import { buildStructurePlan } from '../engine';
import { checkPlan, checkFocusAgainstBaseline } from '../checker';
import { senseCheck } from '../sense';
import { CATEGORIES, DAY_COUNTS, TIERS, VOLUME } from '../rulebook';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

jest.setTimeout(600000);

const KITS = ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight'];
const build = (goal, days, equipment, over = {}) => buildStructurePlan({
  goal, days, lengthMinutes: 60, equipment, experience: 'intermediate', focus: [], library: LIBRARY, ...over,
});
// The week's sets, wherever they fall: the clock never removes or changes a
// set (Q1 = C); it may only move a whole abs or calf exercise to a shorter
// session (R28).
const sig = (plan) => plan.sessions.flatMap((s) => s.exercises.map((ex) => `${ex.name}x${ex.peak}`)).sort().join(',');
const placement = (plan) => plan.sessions.map((s) => s.exercises.filter((ex) => !['abs', 'calves'].includes(ex.muscle)).map((ex) => ex.name).join(',')).join('|');

// The weeks refused today for an intermediate person (48 of 240), most at
// 2 or 3 days. Every muscle the category trains must have an
// exercise of its own (the founder's sense order, D222), which costs session
// slots. Lead-checked by hand (register D222):
// - impossible under the rules: bodybuilding 2 days (the upper session
//   needs 9 exercises against the 8 limit) and 3 days (the leg session needs
//   26 sets against 24); classic physique 3 days (27 sets); wellness 2 days
//   (the lower session needs 9 exercises); men's physique 6 days with barbell and plates (the
//   shoulder sessions have two exercises in the kit, too thin to be worth
//   the trip, S5);
// - tight weeks the engine has not packed yet: figure and women's physique
//   at 2 days in a full gym or machines, which fit by hand at exactly 24
//   sets and 8 exercises; classic physique 2 days;
// - from the coach and user audits of the rendered plans (R24, R26):
//   men's physique 6 days with bodyweight (Shoulders A would be a band
//   lateral raise and one rear-delt movement, a band pull-apart and a band
//   rear fly being one movement); bikini 5 and 6 days and wellness 6 days
//   with barbell and plates (the glutes-and-hamstrings session cannot hinge
//   beside the squat session, every loaded hinge loading the lower back,
//   which leaves a hip thrust and a slider curl, too thin to be worth the
//   trip); wellness 5 days with dumbbells, barbell or a home gym (09's
//   hinge-only hamstring session holds one hinge, two hinges loading the
//   lower back twice, so hamstrings fall short of 10);
// - once dumbbells train the lats (the straight-arm pullover, register
//   D222): men's physique, figure and women's physique at 2 days with
//   dumbbells or a home gym (the one upper session would need nine
//   exercises to give every upper muscle its own, against the 8 limit;
//   these weeks built before only by leaving the lats without one).
// The list may only shrink, except by a ruling recorded in register D222. A refusal names the nearest day count that
// works (09 B12); the person chooses.
const KNOWN_REFUSALS = new Set([
  ...['full_gym', 'machines_cables', 'dumbbells_only', 'home_gym'].flatMap((k) => [`bodybuilding 2d ${k}`]),
  ...['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight'].flatMap((k) => [
    `bodybuilding 3d ${k}`, `classic_physique 2d ${k}`, `classic_physique 3d ${k}`,
  ]),
  'mens_physique 6d barbell_plates', 'mens_physique 6d bodyweight',
  'bikini 5d barbell_plates', 'bikini 6d barbell_plates', 'wellness 6d barbell_plates',
  'wellness 5d dumbbells_only', 'wellness 5d barbell_plates', 'wellness 5d home_gym',
  'mens_physique 2d dumbbells_only', 'mens_physique 2d home_gym', 'figure 2d dumbbells_only', 'figure 2d home_gym',
  'womens_physique 2d dumbbells_only', 'womens_physique 2d home_gym',
  'wellness 2d full_gym', 'wellness 2d machines_cables',
  'wellness 3d full_gym', 'wellness 3d dumbbells_only', 'wellness 3d barbell_plates', 'wellness 3d home_gym', 'wellness 3d bodyweight',
  'wellness 5d bodyweight',
  'figure 2d full_gym', 'figure 2d machines_cables',
  'womens_physique 2d full_gym', 'womens_physique 2d machines_cables',
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

  test('every plan returned passes the sense layer (founder order, D222)', () => {
    const bad = results.filter(({ r }) => r.ok && !senseCheck(r.plan).ok)
      .map(({ goal, days, kit, r }) => `${goal} ${days}d ${kit}: ${senseCheck(r.plan).failures.map((f) => f.detail).join('; ')}`);
    expect(bad).toEqual([]);
  });

  test('every refusal is honest: its muscles are below their minimum, or it names the sense fault', () => {
    for (const { goal, days, kit, r } of results) {
      if (r.ok) continue;
      expect([goal, days, kit, ['minimum_unreachable', 'sense_failed'].includes(r.refusal.reason)]).toEqual([goal, days, kit, true]);
      if (r.refusal.reason === 'sense_failed') {
        expect(r.refusal.failures.length).toBeGreaterThan(0);
        refused.push(`${goal} ${days}d ${kit}`);
        continue;
      }
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

  test("men's physique builds at every day count in a gym, and from 3 days with dumbbells or a home gym", () => {
    const mp = results.filter(({ goal, kit }) => goal === 'mens_physique' && ['full_gym', 'machines_cables', 'dumbbells_only', 'home_gym'].includes(kit));
    expect(mp).toHaveLength(20);
    expect(mp.filter(({ r }) => !r.ok).map(({ days, kit }) => `${days}d ${kit}`)).toEqual(['2d dumbbells_only', '2d home_gym']);
    for (const { r } of mp.filter((x) => !x.r.ok)) expect(r.refusal.suggestedDays).toBe(3);
  });
});

describe('every experience level and focus pick passes both layers', () => {
  test.each(CATEGORIES)('%s: beginner, intermediate and advanced, with and without focus, every day count, full gym and dumbbells', (goal) => {
    const pick = Object.keys(TIERS).find((m) => TIERS[m][goal] === 'P') || 'chest';
    const bad = [];
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      for (const kit of ['full_gym', 'dumbbells_only']) {
        for (const days of DAY_COUNTS) {
          for (const focus of [[], [pick]]) {
            const r = build(goal, days, kit, { experience, focus });
            if (!r.ok) continue;
            const c = checkPlan(r.plan);
            const sc = senseCheck(r.plan);
            if (!c.ok || !sc.ok) bad.push(`${experience} ${kit} ${days}d ${focus.join('+')}: ${[...c.failures, ...sc.failures].map((f) => f.code).join(',')}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
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
    expect(placement(short.plan)).toBe(placement(long.plan));
    expect(short.report.needsLengthChoice).toBe(true);
  });
});
