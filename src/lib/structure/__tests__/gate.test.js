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
 * - focus keeps every other muscle at its standard (C5) and the clock never
 *   removes a set (Q1 = C);
 * - the code review and third coach audit (register D222, R39 to R46): a
 *   focus at every day count and kit, built last on the finished week,
 *   keeps every other muscle at its standard (C5 as R46 reads it, founder
 *   F2); the start of the rotation never changes the week; a gym is never
 *   given a stand-in meant for a thinner kit; a next-day light dose only
 *   where the next session trains the muscle; rest trimmed by rest class.
 */
import { buildStructurePlan } from '../engine';
import { checkPlan, checkFocusAgainstBaseline } from '../checker';
import { senseCheck } from '../sense';
import { CATEGORIES, DAY_COUNTS, TIERS, VOLUME, REST_TRIM_ORDER, PROGRESSION, restClassFor, restSecondsFor } from '../rulebook';
import { sessionLoad, isTrained } from '../measure';

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

// The weeks refused today for an intermediate person (46 of 240), most at
// 2 or 3 days. Every muscle the category trains must have an
// exercise of its own (the founder's sense order, D222), which costs session
// slots. Lead-checked by hand (register D222):
// - impossible under the rules: bodybuilding 2 days (the upper session
//   needs 9 exercises against the 8 limit) and 3 days (the leg session needs
//   26 sets against 24); classic physique 3 days (27 sets); wellness 2 days
//   (the lower session needs 9 exercises);
// - tight weeks the engine has not packed yet: figure and women's physique
//   at 2 days in a full gym or machines, which fit by hand at exactly 24
//   sets and 8 exercises; classic physique 2 days;
// - from the coach and user audits of the rendered plans (R24, R26):
//   bikini 5 and 6 days with barbell and plates (the glutes-and-hamstrings
//   session cannot hinge
//   beside the squat session, every loaded hinge loading the lower back,
//   which leaves a hip thrust and a slider curl, too thin to be worth the
//   trip); wellness 5 days with barbell and plates (the hinge day holds one
//   hinge, two loading the lower back twice, and the kit has no leg curl to
//   follow it, so hamstrings fall short of 10);
// - once dumbbells train the lats (the straight-arm pullover, register
//   D222): men's physique, figure and women's physique at 2 days with
//   dumbbells or a home gym (the one upper session would need nine
//   exercises to give every upper muscle its own, against the 8 limit;
//   these weeks built before only by leaving the lats without one);
// - once every kit trains the adductors (round 4 coach audit, register
//   D222): wellness at 2 days with dumbbells, barbell and plates, a home gym
//   or bodyweight, as already in a gym (the lower session would need nine
//   exercises; these weeks built before only by reporting the adductors
//   untrainable, which was untrue).
// Round 4 (R50: a priority or standard muscle short of normal volume may
// take one more session of its half) let three weeks build that the sense
// layer had refused as too thin: men's physique 6 days with barbell and
// plates or bodyweight, and wellness 6 days with barbell and plates.
// Round 5 (a template's hint leads a session, not limits it) let wellness 5
// days with dumbbells, a home gym or bodyweight build: the hinge day takes a
// leg curl once its one hinge is full.
// The list may only shrink, except by a ruling recorded in register D222. A refusal names the nearest day count that
// works (09 B12); the person chooses.
const KNOWN_REFUSALS = new Set([
  ...['full_gym', 'machines_cables', 'dumbbells_only', 'home_gym'].flatMap((k) => [`bodybuilding 2d ${k}`]),
  ...['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight'].flatMap((k) => [
    `bodybuilding 3d ${k}`, `classic_physique 2d ${k}`, `classic_physique 3d ${k}`,
  ]),
  'bikini 5d barbell_plates', 'bikini 6d barbell_plates',
  'wellness 5d barbell_plates',
  'mens_physique 2d dumbbells_only', 'mens_physique 2d home_gym', 'figure 2d dumbbells_only', 'figure 2d home_gym',
  'womens_physique 2d dumbbells_only', 'womens_physique 2d home_gym',
  'wellness 2d full_gym', 'wellness 2d machines_cables',
  'wellness 2d dumbbells_only', 'wellness 2d barbell_plates', 'wellness 2d home_gym', 'wellness 2d bodyweight',
  'wellness 3d full_gym', 'wellness 3d dumbbells_only', 'wellness 3d barbell_plates', 'wellness 3d home_gym', 'wellness 3d bodyweight',
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

  test('R39 and R46: a focus pick keeps every other muscle at its standard, at every day count and in every kit (C5)', () => {
    const bad = [];
    for (const { goal, days, kit, r } of results) {
      if (!r.ok) continue;
      const pick = Object.keys(TIERS).find((m) => TIERS[m][goal] === 'P');
      const f = build(goal, days, kit, { focus: [pick] });
      if (!f.ok) { bad.push(`${goal} ${days}d ${kit}: refused with focus`); continue; }
      const c5 = checkFocusAgainstBaseline(f.plan, r.plan);
      if (!c5.ok) bad.push(`${goal} ${days}d ${kit}: ${c5.failures.map((x) => x.detail).join('; ')}`);
    }
    expect(bad).toEqual([]);
  });

  test('R40: every start in a gym builds the same week, turned', () => {
    const bad = [];
    const names = (sessions) => sessions.map((s) => `${s.key}:${s.exercises.map((ex) => `${ex.name}x${ex.peak}@${ex.restSec}`).join(',')}`).join('|');
    for (const { goal, days, kit, r } of results.filter((x) => x.kit === 'full_gym' && x.r.ok)) {
      for (let start = 1; start < days; start += 1) {
        const turned = r.plan.sessions.map((_, i) => r.plan.sessions[(i + start) % days]);
        const s = build(goal, days, kit, { startIndex: start });
        if (!s.ok || names(s.plan.sessions) !== names(turned)) bad.push(`${goal} ${days}d start ${start}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('R41: a gym is never given a stand-in meant for a thinner kit', () => {
    const bad = results.filter(({ kit, r }) => r.ok && ['full_gym', 'machines_cables'].includes(kit))
      .flatMap(({ goal, days, kit, r }) => r.plan.sessions.flatMap((s) => s.exercises)
        .filter((ex) => /TRX|Slider|Seated .*Lateral Raise|Straight-Arm Dumbbell Pullover|Reverse Crunch/.test(ex.name))
        .map((ex) => `${goal} ${days}d ${kit}: ${ex.name}`));
    expect(bad).toEqual([]);
  });

  test('R42: a next-day light dose only where the next session trains that muscle', () => {
    const bad = [];
    for (const { goal, days, kit, r } of results.filter((x) => x.r.ok)) {
      const n = r.plan.sessions.length;
      r.plan.sessions.forEach((s, i) => {
        const next = sessionLoad(r.plan.sessions[(i + 1) % n], PROGRESSION.peakWeek);
        for (const ex of s.exercises) if (ex.nextDayException && !isTrained(next, ex.muscle)) bad.push(`${goal} ${days}d ${kit} ${s.key}: ${ex.name}`);
      });
    }
    expect(bad).toEqual([]);
  });

  test('R43: rest is trimmed by rest class, a class only once every earlier one is at its floor', () => {
    const bad = [];
    for (const { goal, days, kit, r } of results.filter((x) => x.r.ok)) {
      for (const s of r.plan.sessions) {
        for (const ex of s.exercises) {
          const cls = restClassFor(ex.kind, ex.pattern);
          if (ex.restSec >= restSecondsFor(ex.kind, ex.pattern).default) continue;
          const earlier = REST_TRIM_ORDER.slice(0, REST_TRIM_ORDER.indexOf(cls));
          const notFloored = s.exercises.filter((x) => earlier.includes(restClassFor(x.kind, x.pattern)) && x.restSec > restSecondsFor(x.kind, x.pattern).floor);
          if (notFloored.length) bad.push(`${goal} ${days}d ${kit} ${s.key}: ${ex.name} trimmed before ${notFloored[0].name}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  // Round 5 audits (C5-3, U5-2): a session's name says only what it holds.
  test('every muscle word in a session name has an exercise of at least 2 sets in that session', () => {
    const WORDS = {
      Abs: ['abs'], Calves: ['calves'], Chest: ['chest'], Biceps: ['biceps'], Triceps: ['triceps'], Quads: ['quads'],
      Hamstrings: ['hamstrings'], Glutes: ['glute_max'], 'Side Glutes': ['glute_med'], 'Inner Thighs': ['adductors'],
      Lats: ['lats'], 'Side Delts': ['side_delts'], 'Rear Delts': ['rear_delts'], Arms: ['biceps', 'triceps'],
    };
    const bad = [];
    for (const { goal, days, kit, r } of results.filter((x) => x.r.ok)) {
      for (const s of r.plan.sessions) {
        const held = new Set(s.exercises.filter((ex) => ex.peak >= 2).map((ex) => ex.muscle));
        for (const part of s.name.replace(/ \([A-C]\)$/, '').split(/, | & /)) {
          const promised = WORDS[part.replace(/ [A-C]$/, '')];
          if (promised && !promised.some((m) => held.has(m))) bad.push(`${goal} ${days}d ${kit} ${s.name}: ${part}`);
        }
      }
    }
    expect(bad).toEqual([]);
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
  test.each(CATEGORIES)('%s: a focus pick at 4 days keeps every other muscle at its standard (C5)', (goal) => {
    const pick = Object.keys(TIERS).find((m) => TIERS[m][goal] === 'P') || 'chest';
    const base = build(goal, 4, 'full_gym');
    const withFocus = build(goal, 4, 'full_gym', { focus: [pick] });
    expect(base.ok && withFocus.ok).toBe(true);
    expect(checkFocusAgainstBaseline(withFocus.plan, base.plan).failures).toEqual([]);
  });

  // R48 (round 4 coach audit: classic physique 6 days built 120 sets at 60
  // minutes and 110 at 75 and 90): every muscle's own sets, and where every
  // exercise but abs and calves falls, are the same at every length; the
  // clock moves only abs, calves and single sets between sessions that
  // both list the muscle.
  test.each(CATEGORIES)('%s: the same week at 45, 60, 75 and 90 minutes, at every day count (Q1 = C, R48)', (goal) => {
    const ownSets = (plan) => {
      const out = {};
      for (const s of plan.sessions) for (const ex of s.exercises) out[ex.muscle] = (out[ex.muscle] || 0) + ex.peak;
      return JSON.stringify(Object.entries(out).sort());
    };
    for (const days of DAY_COUNTS) {
      const builds = [45, 60, 75, 90].map((lengthMinutes) => build(goal, days, 'full_gym', { lengthMinutes }));
      expect([goal, days, builds.map((b) => b.ok)]).toEqual([goal, days, builds.map(() => builds[0].ok)]);
      if (!builds[0].ok) continue;
      expect([goal, days, builds.map((b) => ownSets(b.plan))]).toEqual([goal, days, builds.map(() => ownSets(builds[0].plan))]);
      expect([goal, days, builds.map((b) => placement(b.plan))]).toEqual([goal, days, builds.map(() => placement(builds[0].plan))]);
    }
  });

  test.each(CATEGORIES)('%s: the same plan at 30 and 90 minutes (Q1 = C)', (goal) => {
    const short = build(goal, 4, 'full_gym', { lengthMinutes: 30 });
    const long = build(goal, 4, 'full_gym', { lengthMinutes: 90 });
    expect(sig(short.plan)).toBe(sig(long.plan));
    expect(placement(short.plan)).toBe(placement(long.plan));
    expect(short.report.needsLengthChoice).toBe(true);
  });
});
