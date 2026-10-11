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
 * - a week the rules cannot hold is refused with the days that would;
 * - the rulings from the coach and user audits of the rendered plans
 *   (register D222, R24 to R31).
 */
import { buildStructurePlan, weeksFor, weeklyTargets } from '../engine';
import { checkPlan, checkFocusAgainstBaseline } from '../checker';
import { PROGRESSION, TIME_MODEL, PATTERNS } from '../rulebook';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const build = (over = {}) => buildStructurePlan({
  goal: 'mens_physique', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'intermediate', focus: [], library: LIBRARY, ...over,
});
const totalSets = (plan) => plan.sessions.reduce((t, s) => t + s.exercises.reduce((u, ex) => u + ex.peak, 0), 0);
// The week's sets wherever they fall, and where everything but abs and
// calves falls: the clock may move a whole abs or calf exercise to a
// shorter session (R28), never remove or change a set (Q1 = C).
const signature = (plan) => plan.sessions.flatMap((s) => s.exercises.map((ex) => `${ex.name}x${ex.peak}`)).sort().join(',')
  + plan.sessions.map((s) => `${s.key}:${s.exercises.filter((ex) => !['abs', 'calves'].includes(ex.muscle)).map((ex) => ex.name).join(',')}`).join('|');

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

describe('the audits of the rendered plans (R24 to R31)', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const all = (r) => r.plan.sessions.flatMap((s) => s.exercises);

  test('R24: hamstrings take a hinge and a curl, never two Romanian deadlifts; abs come last', () => {
    for (const goal of ['general', 'bikini', 'mens_physique']) {
      const r = plain(goal, 2);
      expect([goal, r.ok]).toEqual([goal, true]);
      for (const s of r.plan.sessions) {
        expect([goal, s.key, s.exercises.filter((ex) => ex.pattern === 'hinge').length <= 1]).toEqual([goal, s.key, true]);
        const firstAbs = s.exercises.findIndex((ex) => ex.muscle === 'abs');
        if (firstAbs >= 0) expect([goal, s.key, s.exercises.slice(firstAbs).every((ex) => ex.muscle === 'abs')]).toEqual([goal, s.key, true]);
      }
      const hams = all(r).filter((ex) => ex.muscle === 'hamstrings').map((ex) => ex.pattern);
      if (hams.length >= 2) expect([goal, hams.includes('hinge') && hams.includes('leg_curl')]).toEqual([goal, true]);
    }
  });

  test('R26: every loaded hinge counts for the lower-back rules', () => {
    expect(PATTERNS.hinge.joints).toContain('spinal_axial');
  });

  test("R27: both of men's physique's back days hold a vertical pull; every bikini glute day leads with a hip thrust", () => {
    const mp = plain('mens_physique', 4);
    for (const key of ['back_a_delts', 'back_b_delts']) {
      expect([key, mp.plan.sessions.find((s) => s.key === key).exercises.some((ex) => ex.pattern === 'vpull')]).toEqual([key, true]);
    }
    const bikini = plain('bikini', 4);
    for (const s of bikini.plan.sessions.filter((x) => x.exercises.some((ex) => ex.muscle === 'glute_max'))) {
      expect([s.key, s.exercises.find((ex) => ex.muscle === 'glute_max').pattern]).toEqual([s.key, 'hip_thrust']);
    }
  });

  test('R27: bodybuilding arms have sets of their own, not credit alone', () => {
    const r = plain('bodybuilding', 4);
    expect(r.ok).toBe(true);
    const own = (m) => all(r).filter((ex) => ex.muscle === m).reduce((t, ex) => t + ex.peak, 0);
    expect(own('biceps')).toBeGreaterThanOrEqual(3);
    expect(own('triceps')).toBeGreaterThanOrEqual(3);
  });

  test('R25: a beginner session stays inside 5 exercises above the minimum', () => {
    const r = build({ goal: 'general', days: 3, lengthMinutes: 45, experience: 'beginner' });
    expect(r.ok).toBe(true);
    for (const s of r.plan.sessions) expect([s.key, s.exercises.length <= 5]).toEqual([s.key, true]);
  });

  test('R28: a six-day week that fits at 60 minutes does not ask for longer, and never offers more days', () => {
    const r = plain('general', 6);
    expect(r.report.needsLengthChoice).toBe(false);
    const asks = plain('bodybuilding', 6, { lengthMinutes: 30 });
    expect(asks.report.needsLengthChoice).toBe(true);
    expect(asks.report.moreDaysPossible).toBe(false);
  });

  test('R29: a leg press or hack squat rests as a heavy compound', () => {
    const r = plain('general', 4, { lengthMinutes: 30 });
    for (const ex of all(r).filter((x) => x.pattern === 'squat_machine' && x.kind === 'machine')) expect([ex.name, ex.restSec >= 120]).toEqual([ex.name, true]);
  });

  test("R30: a men's physique chest focus takes a free upper day at 5 days, and says why it cannot at 4", () => {
    const five = plain('mens_physique', 5, { focus: ['chest'] });
    expect(five.ok).toBe(true);
    expect(five.plan.overflow.some((o) => o.muscle === 'chest')).toBe(true);
    expect(five.report.focusUnmet).toEqual([]);
    const four = plain('mens_physique', 4, { focus: ['chest'] });
    expect(four.report.focusUnmet.map((f) => f.muscle)).toEqual(['chest']);
  });

  test('R31: session names say what the session holds', () => {
    const r = plain('mens_physique', 4);
    expect(r.plan.sessions.find((s) => s.key === 'chest_triceps').name).toBe('Chest, Triceps & Abs');
    expect(plain('figure', 4).plan.sessions.map((s) => s.name).slice(0, 3)).toEqual(['Back, Delts & Biceps', 'Lower A', 'Delts, Chest & Triceps']);
  });

  test('a dumbbells-only kit is never given a hanging raise (no bar)', () => {
    const r = plain('mens_physique', 4, { equipment: 'dumbbells_only' });
    expect(all(r).some((ex) => /^hanging /i.test(ex.name))).toBe(false);
  });
});
