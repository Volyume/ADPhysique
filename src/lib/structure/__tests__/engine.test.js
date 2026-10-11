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
 * - focus keeps every other muscle at its standard and the week its sets
 *   (C5, R46);
 * - the clock never removes a set (founder Q1 = C): the same plan at every
 *   length, rest shortened first, and a choice asked for past the
 *   tolerance;
 * - men's physique: one leg day, no overhead pressing (F4, J1);
 * - a week the rules cannot hold is refused with the days that would;
 * - the rulings from the coach and user audits of the rendered plans
 *   (register D222, R24 to R31), and from the code review and third coach
 *   audit (R39 to R46; the matrix-wide ones are pinned in gate.test.js).
 */
import { buildStructurePlan, weeksFor, weeklyTargets } from '../engine';
import { checkPlan, checkFocusAgainstBaseline } from '../checker';
import { PROGRESSION, TIME_MODEL, PATTERNS, TIERS } from '../rulebook';

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

describe('focus keeps every other muscle at its standard and the week its sets (C5, R46)', () => {
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

  // R47 (round 4 user audit; the founder, D219: "Even with specialising
  // chest I get two exercises!"): at 4 days no upper session neighbours
  // neither chest day, so chest goes on the leg day.
  test("R30, R47: a men's physique chest focus takes a free upper day at 5 days, and the leg day at 4", () => {
    const five = plain('mens_physique', 5, { focus: ['chest'] });
    expect(five.ok).toBe(true);
    expect(five.plan.overflow.some((o) => o.muscle === 'chest')).toBe(true);
    expect(five.report.focusUnmet).toEqual([]);
    const four = plain('mens_physique', 4, { focus: ['chest'] });
    expect(four.report.focusUnmet).toEqual([]);
    const legs = four.plan.sessions.find((s) => s.key === 'legs');
    expect(legs.exercises.filter((ex) => ex.muscle === 'chest').length).toBeGreaterThanOrEqual(1);
    expect(legs.name).toMatch(/Chest/);
    expect(checkPlan(four.plan).ok).toBe(true);
  });

  test('R31, R38: session names say what the session holds; abs and calves are named unless the name says so', () => {
    for (const goal of ['mens_physique', 'general', 'bikini', 'wellness']) {
      for (const days of [3, 4, 5, 6]) {
        const r = plain(goal, days);
        if (!r.ok) continue;
        for (const s of r.plan.sessions) {
          const held = new Set(s.exercises.map((ex) => ex.muscle));
          if (held.has('abs')) expect([goal, days, s.name, /Abs|Core/.test(s.name)]).toEqual([goal, days, s.name, true]);
          if (held.has('calves')) expect([goal, days, s.name, /Calves|Legs|Lower/.test(s.name)]).toEqual([goal, days, s.name, true]);
        }
      }
    }
    expect(plain('figure', 4).plan.sessions.map((s) => s.name).slice(0, 3)).toEqual(['Back, Delts & Biceps', 'Lower A & Abs', 'Delts, Chest & Triceps']);
  });

  test('a dumbbells-only kit is never given a hanging raise (no bar)', () => {
    const r = plain('mens_physique', 4, { equipment: 'dumbbells_only' });
    expect(all(r).some((ex) => /^hanging /i.test(ex.name))).toBe(false);
  });
});

describe('the second audits (R32 to R38)', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const all = (r) => r.plan.sessions.flatMap((s) => s.exercises);

  test('R33: no session holds two pulldowns, whatever the grip', () => {
    for (const [goal, days] of [['general', 3], ['general', 5], ['classic_physique', 6], ['figure', 5], ['figure', 6], ['womens_physique', 6]]) {
      const r = plain(goal, days);
      expect([goal, days, r.ok]).toEqual([goal, days, true]);
      for (const s of r.plan.sessions) {
        expect([goal, days, s.key, s.exercises.filter((ex) => /pulldown/i.test(ex.name) && ex.pattern === 'vpull').length <= 1]).toEqual([goal, days, s.key, true]);
      }
    }
  });

  // At 5 days the arms reach their own minimum beside a week of rows. At 4
  // days both upper sessions are at the 24-set cap holding six priority
  // muscles' minimums, so the arms hold 4 own sets each (round 2 found one
  // 3-set hammer curl): measured, not a target.
  test('R34: a bodybuilder\'s first biceps exercise of the week is a curl, and the arms keep own sets beside a week of rows', () => {
    const own = (r, m) => all(r).filter((ex) => ex.muscle === m).reduce((n, ex) => n + ex.peak, 0);
    const five = plain('bodybuilding', 5);
    const t = weeklyTargets('bodybuilding', 5, 'intermediate', []);
    expect(own(five, 'biceps')).toBeGreaterThanOrEqual(t.biceps.min);
    expect(own(five, 'triceps')).toBeGreaterThanOrEqual(t.triceps.min);
    const four = plain('bodybuilding', 4);
    expect(all(four).filter((ex) => ex.muscle === 'biceps').map((ex) => ex.pattern)).toContain('curl');
    expect(own(four, 'biceps')).toBeGreaterThanOrEqual(4);
    expect(own(four, 'triceps')).toBeGreaterThanOrEqual(4);
  });

  test('R35: figure 3 days doses side delts lightly in Legs, the session before Push; women\'s physique keeps the general week', () => {
    const fig = plain('figure', 3);
    const legs = fig.plan.sessions.find((s) => s.key === 'legs_side');
    const lateral = legs.exercises.find((ex) => ex.pattern === 'lateral');
    expect(lateral.nextDayException).toBe(true);
    expect(fig.plan.sessions[(fig.plan.sessions.indexOf(legs) + 1) % 3].key).toBe('push');
    expect(plain('womens_physique', 3).plan.sessions.map((s) => s.key)).toEqual(['push', 'pull', 'legs']);
  });

  test('R37: a leg press or hack squat opens before a moderate compound; an upper-body machine compound rests at least 90 s', () => {
    for (const goal of ['general', 'bodybuilding', 'bikini']) {
      const r = plain(goal, 4, { lengthMinutes: 30 });
      for (const s of r.plan.sessions) {
        const i = s.exercises.findIndex((ex) => ex.kind === 'machine' && ['squat_machine', 'hip_thrust'].includes(ex.pattern));
        if (i > 0) expect([goal, s.key, s.exercises.slice(0, i).every((ex) => ex.kind === 'heavy_compound' || ['squat_machine', 'hip_thrust'].includes(ex.pattern))]).toEqual([goal, s.key, true]);
        for (const ex of s.exercises.filter((x) => x.kind === 'machine' && PATTERNS[x.pattern].kind === 'compound')) expect([ex.name, ex.restSec >= 90]).toEqual([ex.name, true]);
      }
    }
  });

  test('R38: a library twin is never offered beside its original, and a focus report says why it fell short', () => {
    for (const goal of ['general', 'womens_physique', 'classic_physique']) {
      for (const days of [4, 5, 6]) {
        const r = plain(goal, days);
        if (r.ok) expect([goal, days, all(r).some((ex) => ex.name === 'Seated Machine Calf Raise')]).toEqual([goal, days, false]);
      }
    }
    // Side delts at 4 days: both shoulder sessions already hold the most
    // one session may, and no session neighbours neither.
    const four = plain('mens_physique', 4, { focus: ['side_delts'] });
    expect(four.report.focusUnmet).toEqual([expect.objectContaining({ muscle: 'side_delts', reason: 'session_cap', sessions: 2 })]);
  });
});

describe('the code review and third coach audit (R39 to R45)', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const week = (r) => r.plan.sessions.map((s) => `${s.key}:${s.exercises.map((ex) => `${ex.name}x${ex.peak}@${ex.restSec}`).join(',')}`);

  test('R40: the start turns the finished week; any whole number is read round the cycle, anything else as session 1', () => {
    const base = plain('mens_physique', 5);
    const at = (startIndex) => week(plain('mens_physique', 5, { startIndex }));
    const turned = (k) => week(base).map((_, i) => week(base)[(i + k) % 5]);
    expect(at(2)).toEqual(turned(2));
    expect(at(7)).toEqual(turned(2));
    expect(at(-1)).toEqual(turned(4));
    expect(at(1.5)).toEqual(week(base));
    expect(at('2')).toEqual(week(base));
    const r = plain('mens_physique', 5, { startIndex: 3 });
    expect(r.report.minutes).toEqual(base.report.minutes.map((_, i) => base.report.minutes[(i + 3) % 5]));
    expect(checkPlan(r.plan).ok).toBe(true);
  });

  // R46: a full week (general 4 days: both upper sessions at 24 sets) used
  // to give a chest focus nothing. The focus now takes room above other
  // muscles' standard, the lowest tier first, never from a higher tier or
  // another pick, and the plan names who gave.
  test('R46: in a full week a focus takes room above the standard, from its own tier or lower, and says so', () => {
    const rankOf = (goal, m) => ['P', 'S', 'M'].indexOf(TIERS[m][goal]);
    for (const [goal, days, focus] of [['general', 4, ['chest']], ['mens_physique', 4, ['side_delts']], ['bikini', 4, ['glute_max']], ['classic_physique', 5, ['lats']]]) {
      const base = plain(goal, days);
      const r = plain(goal, days, { focus });
      const m = focus[0];
      expect([goal, r.ok]).toEqual([goal, true]);
      expect(checkFocusAgainstBaseline(r.plan, base.plan).failures).toEqual([]);
      expect(checkPlan(r.plan).ok).toBe(true);
      for (const x of r.report.focusTook) {
        expect([goal, x.muscle, x.to >= x.minimum, rankOf(goal, x.muscle) >= rankOf(goal, m)]).toEqual([goal, x.muscle, true, true]);
      }
      if (goal === 'general') {
        expect(r.report.weekly.chest.sets).toBeGreaterThan(base.report.weekly.chest.sets);
        expect(r.report.focusTook.length).toBeGreaterThan(0);
      }
    }
  });

  test('R45: an experience level the rulebook does not know is refused; none given means intermediate', () => {
    const r = plain('general', 4, { experience: 'expert' });
    expect(r.ok).toBe(false);
    expect(r.refusal.reason).toBe('experience_unknown');
    expect(week(plain('general', 4, { experience: undefined }))).toEqual(week(plain('general', 4, { experience: 'intermediate' })));
  });
});

describe('the round 4 coach and user audits (R47 to R53)', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const all = (r) => r.plan.sessions.flatMap((s) => s.exercises);
  const own = (r, m) => all(r).filter((ex) => ex.muscle === m).reduce((n, ex) => n + ex.peak, 0);
  const session = (r, key) => r.plan.sessions.find((s) => s.key === key);

  test("R20 restored: every men's physique chest session leads with an incline press; a fly before any flat press", () => {
    for (const days of [4, 5, 6]) {
      const r = plain('mens_physique', days);
      for (const s of r.plan.sessions) {
        const chest = s.exercises.filter((ex) => ex.muscle === 'chest');
        if (!chest.length) continue;
        expect([days, s.key, chest[0].pattern]).toEqual([days, s.key, 'press_incline']);
        expect([days, s.key, chest.some((ex) => ex.pattern === 'press_flat') && !chest.some((ex) => ex.pattern === 'fly')]).toEqual([days, s.key, false]);
      }
      expect(all(r).filter((ex) => ex.muscle === 'chest').some((ex) => ex.pattern === 'fly')).toBe(true);
    }
  });

  test('R49: a lead muscle gives its only compound in a session at least 3 sets before an isolation there passes 3', () => {
    const classic = plain('classic_physique', 4);
    expect(session(classic, 'upper_a').exercises.find((ex) => ex.muscle === 'chest').peak).toBeGreaterThanOrEqual(3);
    const general = plain('general', 4);
    for (const key of ['upper_a', 'upper_b']) {
      const s = session(general, key);
      for (const m of ['lats', 'upper_back']) {
        const comps = s.exercises.filter((ex) => ex.muscle === m && PATTERNS[ex.pattern].kind === 'compound');
        if (comps.length === 1 && s.exercises.some((ex) => PATTERNS[ex.pattern].kind === 'isolation' && ex.peak > 3)) {
          expect([key, comps[0].name, comps[0].peak >= 3]).toEqual([key, comps[0].name, true]);
        }
      }
    }
  });

  test('R50: classic physique 5 days trains the lats in a second session', () => {
    const r = plain('classic_physique', 5);
    expect(r.plan.sessions.filter((s) => s.exercises.some((ex) => ex.muscle === 'lats')).length).toBeGreaterThanOrEqual(2);
    expect(checkPlan(r.plan).ok).toBe(true);
  });

  test('R51: a session named for the arms gives each at least 4 sets of its own', () => {
    const r = plain('general', 5);
    const s = session(r, 'shoulders_arms');
    for (const m of ['biceps', 'triceps']) {
      expect([m, s.exercises.filter((ex) => ex.muscle === m).reduce((n, ex) => n + ex.peak, 0) >= 4]).toEqual([m, true]);
    }
  });

  test('R52: a focus adds to what the plain week gives, or says it is at the most a week holds', () => {
    for (const [goal, days, m] of [['bikini', 5, 'glute_max'], ['mens_physique', 4, 'biceps'], ['bodybuilding', 5, 'biceps']]) {
      const base = plain(goal, days);
      const r = plain(goal, days, { focus: [m] });
      const res = r.report.focusResults.find((x) => x.muscle === m);
      expect([goal, m, res.after > base.report.weekly[m].sets || res.reason === 'at_max']).toEqual([goal, m, true]);
      expect(checkFocusAgainstBaseline(r.plan, base.plan).failures).toEqual([]);
    }
  });

  test('R53: no fifth set beside a short exercise of the same muscle, and no two 2-set exercises of one movement in a session', () => {
    for (const [goal, days, equipment] of [['mens_physique', 4, 'dumbbells_only'], ['mens_physique', 5, 'machines_cables'], ['wellness', 4, 'dumbbells_only'], ['figure', 3, 'bodyweight'], ['figure', 4, 'full_gym']]) {
      const r = plain(goal, days, { equipment });
      for (const s of r.plan.sessions) {
        for (const m of new Set(s.exercises.map((ex) => ex.muscle))) {
          const mine = s.exercises.filter((ex) => ex.muscle === m);
          expect([goal, days, equipment, s.key, m, mine.some((ex) => ex.peak > 4) && mine.some((ex) => ex.peak < 4)]).toEqual([goal, days, equipment, s.key, m, false]);
          const twos = mine.filter((ex) => ex.peak === 2).map((ex) => ex.pattern);
          expect([goal, days, s.key, m, new Set(twos).size === twos.length]).toEqual([goal, days, s.key, m, true]);
        }
      }
    }
  });

  test('a second curl variant where the fresh hinge cannot go, and the dumbbell kit trains the adductors', () => {
    const w6 = plain('wellness', 6);
    expect(own(w6, 'hamstrings')).toBeGreaterThan(12);
    const db = plain('wellness', 4, { equipment: 'dumbbells_only' });
    expect(db.report.untrainable).not.toContain('adductors');
    expect(own(db, 'adductors')).toBeGreaterThanOrEqual(2);
  });

  test("a beginner's leg day opens with a machine or dumbbell compound; bodyweight compounds take reps by effort", () => {
    const r = plain('general', 3, { experience: 'beginner', lengthMinutes: 45 });
    const legs = r.plan.sessions.find((s) => /leg/i.test(s.key));
    expect(legs.exercises[0].kind).not.toBe('heavy_compound');
    const bw = plain('figure', 3, { equipment: 'bodyweight' });
    const pushUp = all(bw).find((ex) => ex.name === 'Push-Up');
    expect(pushUp.repRange).toEqual([6, 30]);
  });

  test('a lift that loads the spine comes before one that does not, whatever the focus', () => {
    const r = plain('womens_physique', 4, { focus: ['glute_max'] });
    for (const s of r.plan.sessions) {
      const names = s.exercises.map((ex) => ex.name);
      if (names.includes('Barbell Back Squat') && names.includes('Barbell Hip Thrust')) {
        expect(names.indexOf('Barbell Back Squat')).toBeLessThan(names.indexOf('Barbell Hip Thrust'));
      }
    }
  });

  test('the report names what binds a muscle below normal volume and the days that would fit or reach a focus', () => {
    const r = plain('bodybuilding', 4);
    expect(r.report.belowTypical.length).toBeGreaterThan(0);
    for (const b of r.report.belowTypical) expect(b.limits.length).toBeGreaterThan(0);
    const asks = plain('general', 4, { lengthMinutes: 45 });
    if (asks.report.needsLengthChoice) {
      expect(asks.report.overSessions.length).toBeGreaterThan(0);
      expect(asks.report.moreDaysPossible).toBe(asks.report.daysThatFit != null);
    }
  });
});
