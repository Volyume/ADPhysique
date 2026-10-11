/**
 * engine.test.js -- the structure engine (D222) builds from the rulebook and
 * keeps the founder's rules. Real seeded library throughout.
 *
 * Pins:
 * - the block ladder (09 s8, B9): week 1 about 70% of peak, at most +1 set a
 *   week, peak in week 5, half in the recovery week, RIR 3 2 2 1 1 4, and
 *   a next-day exception held at RIR 2 or more (R1);
 * - every plan the engine returns passes the full checker;
 * - same inputs, same plan (C19);
 * - focus only ever adds (C5);
 * - the clock never removes a set (founder Q1 = C): the same plan at every
 *   length, rest shortened first, and a choice asked for past the
 *   tolerance;
 * - men's physique: one leg day, no overhead pressing (F4, J1);
 * - a week the rules cannot hold is refused with the days that would.
 */
import { buildStructurePlan, weeksFor, weeklyTargets } from '../engine';
import { checkPlan, checkFocusAgainstBaseline } from '../checker';
import { PROGRESSION, TIME_MODEL } from '../rulebook';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const build = (over = {}) => buildStructurePlan({
  goal: 'mens_physique', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'intermediate', focus: [], library: LIBRARY, ...over,
});
const totalSets = (plan) => plan.sessions.reduce((t, s) => t + s.exercises.reduce((u, ex) => u + ex.peak, 0), 0);
const signature = (plan) => plan.sessions.map((s) => `${s.key}:${s.exercises.map((ex) => `${ex.name}x${ex.peak}`).join(',')}`).join('|');

describe('the block ladder (09 s8)', () => {
  test('peak 4: 3, 3, 4, 4, 4 then 2 at RIR 3 2 2 1 1 4', () => {
    expect(weeksFor(4)).toEqual([
      { sets: 3, rir: 3 }, { sets: 3, rir: 2 }, { sets: 4, rir: 2 }, { sets: 4, rir: 1 }, { sets: 4, rir: 1 }, { sets: 2, rir: 4 },
    ]);
  });

  test('never more than one set added a week, never below 2 in a loading week', () => {
    for (let peak = 2; peak <= 5; peak += 1) {
      const w = weeksFor(peak);
      for (let i = 1; i < PROGRESSION.peakWeek; i += 1) expect(w[i].sets - w[i - 1].sets).toBeLessThanOrEqual(PROGRESSION.maxStepPerWeek);
      for (let i = 0; i < PROGRESSION.peakWeek; i += 1) expect(w[i].sets).toBeGreaterThanOrEqual(2);
      expect(w[PROGRESSION.peakWeek - 1].sets).toBe(peak);
    }
  });

  test('R1: a next-day exception never drops below RIR 2 before the recovery week', () => {
    expect(weeksFor(3, { nextDayException: true }).map((x) => x.rir)).toEqual([3, 2, 2, 2, 2, 4]);
  });
});

describe("men's physique 4 days, full gym", () => {
  const r = build();

  test('builds, and the plan passes every check', () => {
    expect(r.ok).toBe(true);
    expect(checkPlan(r.plan).failures).toEqual([]);
  });

  test('one leg day, no overhead press, every category muscle at or above its minimum', () => {
    const legDays = r.plan.sessions.filter((s) => s.exercises.some((ex) => ['quads', 'hamstrings'].includes(ex.muscle)));
    expect(legDays.map((s) => s.key)).toEqual(['legs']);
    expect(r.plan.sessions.flatMap((s) => s.exercises).some((ex) => ex.pattern === 'ohp')).toBe(false);
    const t = weeklyTargets('mens_physique', 4, 'intermediate', []);
    for (const [m, v] of Object.entries(r.report.weekly)) expect([m, v.sets >= t[m].min]).toEqual([m, true]);
  });

  test('chest leads with the incline press (R20)', () => {
    const chestDay = r.plan.sessions.find((s) => s.key === 'chest_triceps');
    expect(chestDay.exercises.find((ex) => ex.muscle === 'chest').pattern).toBe('press_incline');
  });

  test('same inputs, same plan (C19)', () => {
    expect(JSON.stringify(build().plan)).toBe(JSON.stringify(r.plan));
  });
});

describe('focus only ever adds (C5)', () => {
  test.each([
    ['mens_physique', ['side_delts']],
    ['mens_physique', ['biceps', 'side_delts', 'biceps']],
    ['bikini', ['glute_max']],
    ['general', ['chest', 'lats', 'quads']],
  ])('%s with %j', (goal, focus) => {
    const base = build({ goal });
    const withFocus = build({ goal, focus });
    expect(base.ok && withFocus.ok).toBe(true);
    expect(checkFocusAgainstBaseline(withFocus.plan, base.plan).failures).toEqual([]);
    expect(totalSets(withFocus.plan)).toBeGreaterThanOrEqual(totalSets(base.plan));
  });

  test('duplicate focus picks are counted once, then capped at three', () => {
    const r = build({ focus: ['biceps', 'biceps', 'side_delts', 'lats', 'chest'] });
    expect(r.plan.focus).toEqual(['biceps', 'side_delts', 'lats']);
    expect(r.report.focusDropped).toEqual(['chest']);
  });

  test('a focus on an indirect-only muscle is reported, not trained', () => {
    const r = build({ focus: ['front_delts'] });
    expect(r.report.focusIgnored).toEqual(['front_delts']);
    expect(r.plan.sessions.flatMap((s) => s.exercises).some((ex) => ex.muscle === 'front_delts')).toBe(false);
  });
});

describe('the clock never removes a set (founder Q1 = C)', () => {
  const lengths = TIME_MODEL.lengths;
  const plans = lengths.map((lengthMinutes) => build({ lengthMinutes }));

  test('the same exercises and sets at every chosen length', () => {
    const sigs = plans.map((r) => signature(r.plan));
    expect(new Set(sigs).size).toBe(1);
  });

  test('a session past the length plus 5 minutes asks for a choice, with a longer length offered', () => {
    const short = plans[0];
    expect(short.report.longestMinutes).toBeGreaterThan(30 + TIME_MODEL.toleranceMinutes);
    expect(short.report.needsLengthChoice).toBe(true);
    expect(short.report.suggestedLength).toBeGreaterThan(30);
    expect(short.report.restTrimmed).toBe(true);
    const long = plans[lengths.length - 1];
    expect(long.report.needsLengthChoice).toBe(long.report.longestMinutes > 90 + TIME_MODEL.toleranceMinutes);
  });

  test('rest is never below its floor', () => {
    expect(checkPlan(plans[0].plan).failures.filter((f) => f.code === 'C7')).toEqual([]);
  });
});

describe('refusals', () => {
  test('a week the rules cannot hold is refused with the fewest days that would (09 B12)', () => {
    const r = build({ goal: 'classic_physique', days: 3 });
    expect(r.ok).toBe(false);
    expect(r.refusal.reason).toBe('minimum_unreachable');
    expect(r.refusal.minimumDays).toBe(4);
  });

  test('days outside 2 to 6 are refused, never clamped', () => {
    expect(build({ days: 7 }).ok).toBe(false);
    expect(build({ days: 1 }).refusal.reason).toBe('days_out_of_range');
  });
});
