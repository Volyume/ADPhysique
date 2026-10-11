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
import { PROGRESSION, TIME_MODEL, PATTERNS, TIERS, PER_SESSION } from '../rulebook';
import { sessionLoad } from '../measure';

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
    // General 4 days, Upper A (round 4 coach C4-10): the pulldown takes its
    // third set from the reverse pec deck, the rear delts' own minimum giving
    // way. Round 5 (C5-2): never from the side delts, which sit below normal
    // too; a row left at 2 beside them stays (moving it would only trade one
    // shortfall for another).
    const general = plain('general', 4);
    const upperA = session(general, 'upper_a');
    expect(upperA.exercises.find((ex) => ex.pattern === 'vpull').peak).toBeGreaterThanOrEqual(3);
    expect(general.report.weekly.side_delts.sets).toBeGreaterThanOrEqual(8);
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

describe('the round 5 coach and user audits', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const all = (r) => r.plan.sessions.flatMap((s) => s.exercises);
  const own = (r, m) => all(r).filter((ex) => ex.muscle === m).reduce((n, ex) => n + ex.peak, 0);

  test("C5-1: a beginner's leg day holds a lower-body compound", () => {
    for (const [goal, days] of [['mens_physique', 2], ['mens_physique', 4], ['mens_physique', 5], ['bikini', 3], ['bikini', 5]]) {
      const r = plain(goal, days, { experience: 'beginner' });
      for (const s of r.plan.sessions.filter((x) => /leg|lower|quads/i.test(x.key))) {
        expect([goal, days, s.key, s.exercises.some((ex) => PATTERNS[ex.pattern].kind === 'compound' && ['quads', 'hamstrings', 'glute_max'].includes(ex.muscle))])
          .toEqual([goal, days, s.key, true]);
      }
    }
  });

  test("C5-6, R54: figure 4 days keeps its side delts at normal volume; the biceps' own minimum does not take them", () => {
    for (const goal of ['figure', 'womens_physique']) expect([goal, plain(goal, 4).report.weekly.side_delts.sets]).toEqual([goal, 14]);
  });

  test('C5-7: classic physique 4 days rows on both upper days', () => {
    const r = plain('classic_physique', 4);
    expect(own(r, 'upper_back')).toBeGreaterThanOrEqual(5);
  });

  test("C5-11: men's physique with dumbbells flies its chest", () => {
    const r = plain('mens_physique', 4, { equipment: 'dumbbells_only' });
    expect(all(r).filter((ex) => ex.muscle === 'chest').map((ex) => ex.pattern)).toContain('fly');
  });

  test('C5-5: an abs focus at 5 and 6 days adds sets', () => {
    for (const days of [5, 6]) {
      const r = plain('mens_physique', days, { focus: ['abs'] });
      const res = r.report.focusResults.find((x) => x.muscle === 'abs');
      expect([days, res.after > res.before]).toEqual([days, true]);
    }
  });

  test('C5-9: the hinge day takes a leg curl once its hinge is full, so wellness 5 days builds in home kits', () => {
    for (const equipment of ['dumbbells_only', 'home_gym', 'bodyweight']) expect([equipment, plain('wellness', 5, { equipment }).ok]).toEqual([equipment, true]);
  });

  test('C5-9: every muscle below normal volume names a real binder, never an unplaced set', () => {
    for (const [goal, days] of [['general', 2], ['bodybuilding', 4], ['classic_physique', 5], ['figure', 4], ['wellness', 5]]) {
      const r = plain(goal, days);
      for (const b of r.report.belowTypical) {
        expect([goal, days, b.muscle, b.limits.some((l) => l === 'room' || l.startsWith('rules'))]).toEqual([goal, days, b.muscle, false]);
      }
    }
  });

  test('C5-16, C5-21: a beginner is never offered more than 4 days; the Copenhagen adduction takes 6 to 12 reps', () => {
    const r = plain('general', 3, { experience: 'beginner', lengthMinutes: 45 });
    if (r.report.daysThatFit != null) expect(r.report.daysThatFit).toBeLessThanOrEqual(4);
    const w = plain('wellness', 4, { equipment: 'dumbbells_only' });
    const cop = all(w).find((ex) => ex.name === 'Copenhagen Adduction');
    if (cop) expect(cop.repRange).toEqual([6, 12]);
  });
});

// Round 6 coach and user audits (register D222, round 6 addendum). Each test
// pins one ruling against the real engine and library.
describe('the round 6 coach and user audits', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const all = (r) => r.plan.sessions.flatMap((s) => s.exercises);
  const LEGS = ['quads', 'hamstrings', 'glute_max', 'glute_med', 'adductors'];
  const kindOf = (ex) => (ex.kind === 'machine' && ['squat_machine', 'hip_thrust'].includes(ex.pattern) ? 'heavy_compound' : ex.kind);

  test("C6-1 (F4): a men's physique leg pick stays in the one leg session, and says why", () => {
    for (const days of [4, 5, 6]) {
      for (const focus of [['quads'], ['hamstrings'], ['quads', 'hamstrings']]) {
        const r = plain('mens_physique', days, { focus });
        const legDays = r.plan.sessions.filter((s) => s.exercises.some((ex) => LEGS.includes(ex.muscle)));
        expect([days, focus.join('+'), legDays.length]).toEqual([days, focus.join('+'), 1]);
        for (const f of r.report.focusResults) expect(f.legsOnce).toBe(true);
      }
    }
  });

  test('C6-2: a gym kit uses its own leg curl and adduction machines before the dumbbell and bodyweight supplements', () => {
    for (const [goal, days] of [['bodybuilding', 4], ['bodybuilding', 6], ['classic_physique', 5], ['wellness', 6]]) {
      const names = all(plain(goal, days)).map((ex) => ex.name);
      expect([goal, days, names.includes('Lying Dumbbell Leg Curl'), names.includes('Copenhagen Adduction')]).toEqual([goal, days, false, false]);
    }
    // The dumbbell kit keeps its supplement (round 5, U5-17).
    expect(all(plain('wellness', 4, { equipment: 'dumbbells_only' })).map((ex) => ex.name)).toContain('Lying Dumbbell Leg Curl');
  });

  test("C6-15: a session hinted for a curl never opens a hinge (wellness 5 days hinges on one day)", () => {
    const r = plain('wellness', 5);
    expect(r.plan.sessions.filter((s) => s.exercises.some((ex) => ex.pattern === 'hinge'))).toHaveLength(1);
  });

  test('C6-9: no session holds two heavy compounds for one muscle (no barbell incline after the barbell bench)', () => {
    for (const [goal, days] of [['general', 6], ['bodybuilding', 4], ['classic_physique', 6], ['figure', 6], ['womens_physique', 6]]) {
      for (const s of plain(goal, days).plan.sessions) {
        const heavy = {};
        for (const ex of s.exercises) if (kindOf(ex) === 'heavy_compound') heavy[ex.muscle] = (heavy[ex.muscle] || 0) + 1;
        expect([goal, days, s.key, Math.max(0, ...Object.values(heavy))]).toEqual([goal, days, s.key, expect.any(Number)]);
        expect(Math.max(0, ...Object.values(heavy))).toBeLessThanOrEqual(1);
      }
    }
  });

  test("C6-3: a back day's rows come before a chest top-up, and a top-up compound holds 3 sets or gives way", () => {
    const r = plain('mens_physique', 5);
    const back = r.plan.sessions[0].exercises;
    const press = back.findIndex((ex) => ex.muscle === 'chest');
    if (press >= 0) {
      expect(back.slice(press).some((ex) => ex.muscle === 'upper_back')).toBe(false);
      expect(back[press].peak).toBeGreaterThanOrEqual(3);
    }
    // C5-8's own case: the 2-set pulldown with the lats at their maximum
    // gives way; the lats keep their normal volume.
    const w = plain('general', 5, { experience: 'advanced' });
    const last = w.plan.sessions[4].exercises.filter((ex) => ex.muscle === 'lats' && PATTERNS[ex.pattern].kind === 'compound');
    expect(last.every((ex) => ex.peak >= 3)).toBe(true);
    expect(w.report.weekly.lats.sets).toBeGreaterThanOrEqual(w.report.weekly.lats.typical);
  });

  test('C6-6: two picks in one session share the sets a top-up gives up', () => {
    const r = plain('classic_physique', 5, { lengthMinutes: 75, focus: ['lats', 'side_delts'] });
    const res = Object.fromEntries(r.report.focusResults.map((f) => [f.muscle, f]));
    expect(res.lats.after).toBeGreaterThanOrEqual(res.lats.target);
    expect(res.side_delts.after).toBeGreaterThanOrEqual(16);
    expect(checkFocusAgainstBaseline(r.plan, plain('classic_physique', 5, { lengthMinutes: 75 }).plan).failures).toEqual([]);
  });

  test('C6-7: two exercises of one movement sit together, the second marked as a second angle; C6-8: a hinge before a hip thrust', () => {
    for (const [goal, days, experience] of [['bodybuilding', 5, 'intermediate'], ['figure', 5, 'intermediate'], ['bikini', 3, 'intermediate'], ['general', 3, 'beginner'], ['wellness', 4, 'intermediate']]) {
      for (const s of plain(goal, days, { experience }).plan.sessions) {
        const ex = s.exercises;
        ex.forEach((x, i) => {
          const j = ex.findIndex((y, k) => k > i && y.muscle === x.muscle && y.pattern === x.pattern);
          if (j > i) expect([goal, s.key, x.name, j - i]).toEqual([goal, s.key, x.name, 1]);
          if (i > 0) expect(x.secondAngle).toBe(ex[i - 1].muscle === x.muscle && ex[i - 1].pattern === x.pattern);
        });
        const thrust = ex.findIndex((x) => x.pattern === 'hip_thrust');
        const hinge = ex.findIndex((x) => x.pattern === 'hinge');
        if (thrust >= 0 && hinge >= 0) expect([goal, s.key, hinge < thrust]).toEqual([goal, s.key, true]);
      }
    }
  });

  test('C6-14: a second calf exercise before a fifth set, so calves reach their normal volume', () => {
    const r = plain('mens_physique', 4, { equipment: 'dumbbells_only' });
    expect(all(r).filter((ex) => ex.muscle === 'calves').every((ex) => ex.peak <= 4)).toBe(true);
    expect(r.report.belowTypical.some((b) => b.muscle === 'calves')).toBe(false);
  });

  test('U6-7: a glute focus trains the glutes in both lower sessions', () => {
    for (const goal of ['womens_physique', 'figure']) {
      const r = plain(goal, 4, { focus: ['glute_max'] });
      const lower = r.plan.sessions.filter((s) => /lower/.test(s.key));
      for (const s of lower) expect([goal, s.key, s.exercises.filter((ex) => ex.muscle === 'glute_max').reduce((t, ex) => t + ex.peak, 0) >= 2]).toEqual([goal, s.key, true]);
    }
  });

  test("U6-10: a leg day holding a chest focus keeps each half together, the leg work first", () => {
    const r = plain('mens_physique', 4, { focus: ['chest'] });
    const legs = r.plan.sessions.find((s) => s.exercises.some((ex) => ex.muscle === 'quads'));
    const half = legs.exercises.filter((ex) => ex.muscle !== 'abs').map((ex) => (['chest', 'triceps', 'side_delts'].includes(ex.muscle) ? 'U' : 'L')).join('');
    expect(half).toMatch(/^L+U*$/);
  });

  test('R55 (U6-1): a pick the week cannot give 2 more sets asks before saving, with the days that help', () => {
    const r = plain('bodybuilding', 4, { focus: ['chest'] });
    expect(r.report.needsFocusChoice).toBe(true);
    const c = r.report.focusChoice.find((x) => x.muscle === 'chest');
    expect(c.after - c.before).toBeLessThan(2);
    expect(c.moreDays).toBeGreaterThan(4);
    // A pick that gains 2 or more is not asked about.
    const g = plain('general', 4, { focus: ['chest'] });
    expect(g.report.focusChoice.some((x) => x.muscle === 'chest')).toBe(false);
  });

  test('C6-4: a muscle never reads as at its own per-session cap when another muscle\'s cap binds', () => {
    const r = plain('bikini', 2);
    for (const b of r.report.belowTypical) {
      if (b.limits[0] !== 'muscle_cap') continue;
      const atCap = r.plan.sessions.some((s) => s.exercises.filter((ex) => ex.muscle === b.muscle).reduce((t, ex) => t + ex.peak, 0) >= 8);
      expect([b.muscle, atCap]).toEqual([b.muscle, true]);
    }
  });

  test('C6-11, U6-4: the reasons and every focus week are the same at every length, and never "room"', () => {
    for (const [goal, days, experience, focus] of [['bodybuilding', 5, 'beginner', []], ['bodybuilding', 5, 'beginner', ['quads']], ['bodybuilding', 6, 'beginner', ['lats']], ['classic_physique', 5, 'beginner', ['side_delts']]]) {
      const runs = [30, 45, 60, 90].map((lengthMinutes) => plain(goal, days, { experience, focus, lengthMinutes }));
      const totals = runs.map((r) => JSON.stringify(Object.entries(r.report.weekly).map(([m, v]) => [m, v.sets])));
      const reasons = runs.map((r) => JSON.stringify(r.report.belowTypical.map((b) => [b.muscle, b.limits[0]])));
      expect([goal, days, focus.join(), new Set(totals).size, new Set(reasons).size]).toEqual([goal, days, focus.join(), 1, 1]);
      for (const r of runs) for (const b of r.report.belowTypical) expect(b.limits[0]).not.toBe('room');
      // A beginner's session keeps R25's five exercises above the minimum.
      for (const r of runs) for (const s of r.plan.sessions) expect(s.exercises.length).toBeLessThanOrEqual(6);
    }
  });

  test('U6-5: a beginner is never offered more than 4 days, refused or not', () => {
    for (const [goal, days, equipment] of [['wellness', 5, 'barbell_plates'], ['bikini', 5, 'barbell_plates'], ['mens_physique', 6, 'bodyweight']]) {
      const r = plain(goal, days, { equipment, experience: 'beginner' });
      if (!r.ok && r.refusal.suggestedDays != null) expect([goal, r.refusal.suggestedDays <= 4]).toEqual([goal, true]);
    }
  });

  test('C6-10: a week with much the same sets as one day fewer says so', () => {
    expect(plain('general', 6).report.sameAsFewerDays).toBe(5);
  });

  // RE-ANCHORED round 7 (U7-8, C7-9: two letter styles in one week, and
  // letters on a pair whose names did not match): a letter follows a name's
  // first part, and only where two sessions' names start the same.
  test('C6-12, U7-8: one letter style, after the first part, only where names start the same; the back never named twice', () => {
    for (const goal of ['general', 'bodybuilding', 'classic_physique', 'mens_physique', 'bikini', 'wellness', 'figure', 'womens_physique']) {
      for (const days of [3, 4, 5, 6]) {
        const r = plain(goal, days, { experience: days === 5 && goal === 'general' ? 'advanced' : 'intermediate' });
        if (!r.ok) continue;
        const names = r.plan.sessions.map((s) => s.name);
        expect([goal, days, new Set(names).size]).toEqual([goal, days, names.length]);
        const head = (nm) => nm.split(/, | & /)[0].replace(/ [A-F]$/, '');
        for (const name of names) {
          const parts = name.split(/, | & /);
          const lettered = / [A-F]$/.test(parts[0]);
          const shared = names.filter((x) => head(x) === head(name)).length > 1;
          expect([goal, days, name, parts.slice(1).some((p) => / [A-F]$/.test(p)), /\(/.test(name), lettered, /Lats/.test(name) && /Back/.test(name), parts.length <= 4])
            .toEqual([goal, days, name, false, false, shared, false, true]);
        }
      }
    }
  });

  test('U6-3: what a focus took is reported as own sets and as the counted week, which keeps the minimum', () => {
    const r = plain('wellness', 5, { experience: 'beginner', focus: ['quads'] });
    for (const x of r.report.focusTook) {
      expect(x.countedTo).toBeGreaterThanOrEqual(x.minimum);
      expect(x.to).toBeLessThan(x.from);
    }
  });
});

describe('the round 7 coach and user audits', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const all = (r) => r.plan.sessions.flatMap((s) => s.exercises);
  const directIn = (s, m) => s.exercises.filter((ex) => ex.muscle === m).reduce((t, ex) => t + ex.peak, 0);

  test('C7-1, U7-12: the length offered is the shortest that holds the week without asking', () => {
    for (const [goal, days, lengthMinutes] of [['bodybuilding', 6, 45], ['mens_physique', 4, 30], ['bikini', 5, 45], ['figure', 4, 45]]) {
      const r = plain(goal, days, { lengthMinutes });
      expect(r.report.needsLengthChoice).toBe(true);
      const offered = r.report.suggestedLength;
      expect([goal, days, plain(goal, days, { lengthMinutes: offered }).report.needsLengthChoice]).toEqual([goal, days, false]);
      for (const l of TIME_MODEL.lengths.filter((x) => x > lengthMinutes && x < offered)) {
        expect([goal, days, l, plain(goal, days, { lengthMinutes: l }).report.needsLengthChoice]).toEqual([goal, days, l, true]);
      }
    }
    expect(plain('bodybuilding', 6, { lengthMinutes: 45 }).report.suggestedLength).toBe(60);
  });

  test('C7-2: a whole isolation moves onto the same movement in a lighter session rather than ask for a longer one', () => {
    const r = plain('wellness', 5);
    expect(r.report.needsLengthChoice).toBe(false);
    const long = plain('wellness', 5, { lengthMinutes: 90 });
    expect(JSON.stringify(Object.entries(r.report.weekly).map(([m, v]) => [m, v.sets])))
      .toBe(JSON.stringify(Object.entries(long.report.weekly).map(([m, v]) => [m, v.sets])));
    expect(checkPlan(r.plan).ok).toBe(true);
  });

  test("C7-3, U7-3: a cause names the session it is true of; a muscle's own cap only where that session holds 8 of it", () => {
    for (const [goal, days, equipment, focus] of [['mens_physique', 5, 'full_gym', ['quads']], ['general', 3, 'machines_cables', []], ['bodybuilding', 5, 'full_gym', []], ['general', 4, 'full_gym', ['chest']]]) {
      const r = plain(goal, days, { equipment, focus });
      const entries = [...r.report.belowTypical, ...r.report.focusResults.filter((f) => f.causes)];
      for (const b of entries) {
        for (const g of (b.causes || { groups: [] }).groups) {
          for (const sessionName of g.sessions) {
            const s = r.plan.sessions.find((x) => x.name === sessionName);
            expect([goal, b.muscle, sessionName, !!s]).toEqual([goal, b.muscle, sessionName, true]);
            // At the cap, or so near it that every step there breaks it.
            const l = sessionLoad(s, PROGRESSION.peakWeek)[b.muscle] || { direct: 0, fractional: 0 };
            if (g.code === 'muscle_cap') expect([goal, b.muscle, sessionName, l.direct + 2 > PER_SESSION.directCap || l.fractional + 2 > PER_SESSION.fractionalCap]).toEqual([goal, b.muscle, sessionName, true]);
            if (g.code === 'set_cap') expect([goal, b.muscle, sessionName, s.exercises.reduce((t, ex) => t + ex.peak, 0) >= 23]).toEqual([goal, b.muscle, sessionName, true]);
          }
        }
        if (b.causes && b.causes.every) expect(b.causes.groups).toHaveLength(1);
      }
    }
    // The coach's case: one more leg extension set breaks only the 24 sets.
    const q = plain('mens_physique', 5, { focus: ['quads'] });
    const legs = q.plan.sessions.find((s) => s.exercises.some((ex) => ex.muscle === 'quads'));
    const quads = q.report.focusResults.find((f) => f.muscle === 'quads');
    if (quads.causes && quads.causes.groups[0].code === 'muscle_cap') expect(directIn(legs, 'quads')).toBeGreaterThanOrEqual(8);
  });

  test('C7-4, C7-6: a lone 2-set lead compound takes its third set from an isolation whose muscle stays above normal', () => {
    for (const [goal, days, experience] of [['figure', 5, 'advanced'], ['womens_physique', 5, 'advanced'], ['classic_physique', 5, 'intermediate']]) {
      const r = plain(goal, days, { experience });
      for (const s of r.plan.sessions) {
        for (const ex of s.exercises.filter((x) => ['chest', 'lats', 'upper_back', 'quads', 'glute_max'].includes(x.muscle) && PATTERNS[x.pattern].kind === 'compound')) {
          const lone = s.exercises.filter((y) => y.muscle === ex.muscle && PATTERNS[y.pattern].kind === 'compound').length === 1;
          if (!lone || ex.peak >= 3) continue;
          // Still at 2 only where no isolation in the session could give.
          const donors = s.exercises.filter((y) => PATTERNS[y.pattern].kind === 'isolation' && y.peak > 2 && y.muscle !== ex.muscle
            && r.report.weekly[y.muscle] && r.report.weekly[y.muscle].sets - 1 >= r.report.weekly[y.muscle].typical + 1);
          expect([goal, s.name, ex.name, donors.map((d) => d.name)]).toEqual([goal, s.name, ex.name, []]);
        }
      }
    }
  });

  test('C7-5: an upper session with a calf finisher is never named "Full Body"', () => {
    const r = plain('figure', 5, { equipment: 'barbell_plates', experience: 'advanced' });
    for (const s of r.plan.sessions) {
      const legs = s.exercises.some((ex) => ['quads', 'hamstrings', 'glute_max', 'glute_med', 'adductors'].includes(ex.muscle));
      if (/Full Body/.test(s.name)) expect([s.name, legs]).toEqual([s.name, true]);
    }
    // Round 8 (C8-1): the leg day keeps a calf raise; the finisher may sit
    // on any upper day.
    expect(r.plan.sessions.some((s) => s.exercises.some((ex) => ex.muscle === 'quads') && s.exercises.some((ex) => ex.muscle === 'calves'))).toBe(true);
  });

  test("C7-7: men's physique 5 days gives calves and abs their normal volume, at least what 4 days gives", () => {
    const five = plain('mens_physique', 5).report.weekly;
    const four = plain('mens_physique', 4).report.weekly;
    for (const m of ['calves', 'abs']) {
      expect([m, five[m].sets >= five[m].typical]).toEqual([m, true]);
      expect([m, five[m].sets >= four[m].sets]).toEqual([m, true]);
    }
  });

  test('C7-8: in a lower session a leg curl comes before the calf raise (P before S before M)', () => {
    for (const s of plain('bikini', 4).plan.sessions) {
      const curl = s.exercises.findIndex((ex) => ex.pattern === 'leg_curl');
      const calf = s.exercises.findIndex((ex) => ex.pattern === 'calf');
      if (curl >= 0 && calf >= 0) expect([s.name, curl < calf]).toEqual([s.name, true]);
    }
  });

  test('C7-9: a session holding side-glute work names the side glutes, or is a lower-body session', () => {
    for (const [goal, days, experience] of [['wellness', 6, 'intermediate'], ['wellness', 6, 'advanced'], ['wellness', 6, 'beginner'], ['bikini', 4, 'intermediate']]) {
      for (const s of plain(goal, days, { experience }).plan.sessions) {
        if (s.exercises.some((ex) => ex.muscle === 'glute_med')) expect([goal, s.name, /Side Glutes|Lower|Legs/.test(s.name)]).toEqual([goal, s.name, true]);
      }
    }
  });

  test('C7-10: a pick within 2 sets of the focus maximum is already close to the most, and takes nothing', () => {
    const r = plain('classic_physique', 6, { experience: 'advanced', focus: ['lats'] });
    const f = r.report.focusResults[0];
    expect(f.reason).toBe('at_max');
    expect(f.nearMax).toBe(true);
    expect(f.max - f.before).toBeLessThan(2);
    expect(r.report.focusTook).toEqual([]);
    expect(r.report.needsFocusChoice).toBe(false);
  });

  test('U7-1: a muscle the kit cannot train is reported with its counted sets, and below its minimum', () => {
    const r = plain('bodybuilding', 4, { equipment: 'barbell_plates' });
    const lats = r.report.untrainableSets.find((u) => u.muscle === 'lats');
    expect(lats.sets).toBeLessThan(lats.minimum);
    expect(r.report.belowMinimum).toContain('lats');
    expect(all(r).some((ex) => ex.muscle === 'lats')).toBe(false);
    // A full gym leaves none below the minimum.
    expect(plain('bodybuilding', 4).report.belowMinimum).toEqual([]);
  });

  test('U7-2: the day count R55 offers gains at least 2 sets over its own plain week, at the figure it states', () => {
    for (const [goal, days, focus] of [['general', 2, ['glute_med']], ['mens_physique', 4, ['rear_delts']], ['general', 3, ['chest']], ['bodybuilding', 4, ['chest']]]) {
      const r = plain(goal, days, { focus });
      for (const c of r.report.focusChoice.filter((x) => x.moreDays != null)) {
        const then = plain(goal, c.moreDays, { focus });
        const res = then.report.focusResults.find((x) => x.muscle === c.muscle);
        expect([goal, days, c.muscle, res.after - res.before >= 2, res.after]).toEqual([goal, days, c.muscle, true, c.setsThen]);
        expect([goal, days, c.lengthThen == null, then.report.needsLengthChoice]).toEqual([goal, days, !then.report.needsLengthChoice, then.report.needsLengthChoice]);
      }
    }
  });

  test('U7-4: a pick the kit cannot train asks before saving', () => {
    const r = plain('mens_physique', 3, { equipment: 'barbell_plates', focus: ['lats'] });
    expect(r.report.needsFocusChoice).toBe(true);
    expect(r.report.focusChoice.find((c) => c.muscle === 'lats')).toMatchObject({ untrainable: true, moreDays: null });
  });

  test("U7-5: a beginner's calf focus fills the room it opened; no reason is ever \"room\"", () => {
    const r = plain('mens_physique', 3, { experience: 'beginner', focus: ['calves'] });
    const f = r.report.focusResults[0];
    expect(f.after - f.before).toBeGreaterThanOrEqual(2);
    expect((f.limits || [])[0]).not.toBe('room');
  });

  test('U7-10: a refusal offers the length its day count needs', () => {
    const r = plain('bikini', 5, { equipment: 'barbell_plates' });
    expect(r.ok).toBe(false);
    const then = plain('bikini', r.refusal.suggestedDays, { equipment: 'barbell_plates' });
    expect(r.refusal.suggestedLength == null).toBe(!then.report.needsLengthChoice);
    if (r.refusal.suggestedLength != null) {
      expect(plain('bikini', r.refusal.suggestedDays, { equipment: 'barbell_plates', lengthMinutes: r.refusal.suggestedLength }).report.needsLengthChoice).toBe(false);
    }
  });

  test('U7-13: a week with fewer sets than one day fewer says by how many', () => {
    const r = plain('general', 6, { equipment: 'home_gym' });
    const five = plain('general', 5, { equipment: 'home_gym' });
    const total = (w) => Object.values(w).reduce((t, v) => t + v.sets, 0);
    expect(r.report.fewerSetsThan).toEqual({ days: 5, sets: Math.round(total(five.report.weekly) - total(r.report.weekly)) });
  });
});

// Round 8 coach and user audits (register D222, round 8 addendum). Each test
// pins a finding so a later fix cannot quietly bring it back.
describe('the round 8 coach and user audits', () => {
  const plain = (goal, days, over = {}) => build({ goal, days, lengthMinutes: 60, ...over });
  const legDaysWithCalves = (r) => r.plan.sessions.filter((s) => s.exercises.some((ex) => ['quads', 'hamstrings'].includes(ex.muscle))
    && s.exercises.some((ex) => ex.muscle === 'calves')).length;

  test('C8-1: a week that trains calves keeps a calf raise on a leg day', () => {
    for (const [goal, days, over] of [['mens_physique', 5, { experience: 'advanced' }], ['mens_physique', 5, { experience: 'advanced', equipment: 'machines_cables', lengthMinutes: 75 }],
      ['mens_physique', 5, { experience: 'advanced', equipment: 'dumbbells_only' }], ['bodybuilding', 6, {}], ['bodybuilding', 6, { experience: 'advanced' }],
      ['figure', 6, { experience: 'advanced' }], ['womens_physique', 6, { experience: 'advanced' }], ['general', 6, { experience: 'advanced' }],
      ['figure', 5, { equipment: 'barbell_plates', experience: 'advanced', lengthMinutes: 75 }]]) {
      const r = plain(goal, days, over);
      expect([goal, days, over, legDaysWithCalves(r) >= 1]).toEqual([goal, days, over, true]);
      expect([goal, days, over, r.report.weekly.calves.sets >= r.report.weekly.calves.typical]).toEqual([goal, days, over, true]);
    }
  });

  test('C8-2: the top-up order reads the name the person sees', () => {
    const r = plain('classic_physique', 5, { lengthMinutes: 75, focus: ['lats', 'side_delts'] });
    const s = r.plan.sessions.find((x) => /Lats/.test(x.name) && /Arms/.test(x.name));
    const lastLats = Math.max(...s.exercises.map((ex, i) => (ex.muscle === 'lats' ? i : -1)));
    const firstArm = s.exercises.findIndex((ex) => ['biceps', 'triceps', 'rear_delts'].includes(ex.muscle));
    expect(lastLats).toBeLessThan(firstArm);
    const w = plain('wellness', 5);
    const lower = w.plan.sessions.find((x) => /^Lower Body A/.test(x.name));
    const at = (m) => lower.exercises.findIndex((ex) => ex.muscle === m);
    expect(at('glute_med')).toBeLessThan(at('calves'));
  });

  test("C8-3: a lone 2-set row takes its third set from a curl whose muscle stays above normal", () => {
    const r = plain('general', 4);
    for (const s of r.plan.sessions) {
      const rows = s.exercises.filter((ex) => ex.muscle === 'upper_back' && PATTERNS[ex.pattern].kind === 'compound');
      if (rows.length === 1) expect([s.name, rows[0].name, rows[0].peak >= 3]).toEqual([s.name, rows[0].name, true]);
    }
  });

  test("C8-4: a beginner's cause is the 3 sets an exercise, never the muscle's cap below 8 sets", () => {
    const r = plain('wellness', 3, { experience: 'beginner', lengthMinutes: 45 });
    for (const b of r.report.belowTypical || []) {
      if (b.limits[0] === 'muscle_cap') {
        const most = Math.max(...r.plan.sessions.map((s) => s.exercises.filter((ex) => ex.muscle === b.muscle).reduce((t, ex) => t + ex.peak, 0)));
        expect([b.muscle, most]).toEqual([b.muscle, PER_SESSION.directCap]);
      }
    }
  });

  test("U8-2: a beginner's focus pick never lowers its muscle, and where it changes nothing a session limit is the stated cause", () => {
    let changed = 0;
    let total = 0;
    for (const goal of ['general', 'bodybuilding', 'classic_physique']) {
      for (const days of [2, 3, 4]) {
        for (const m of ['chest', 'lats', 'side_delts', 'biceps']) {
          const base = plain(goal, days, { experience: 'beginner' });
          const r = plain(goal, days, { experience: 'beginner', focus: [m] });
          const gain = r.report.weekly[m].sets - base.report.weekly[m].sets;
          total += 1;
          expect([goal, days, m, gain >= 0]).toEqual([goal, days, m, true]);
          if (gain > 0) { changed += 1; continue; }
          const res = r.report.focusResults.find((f) => f.muscle === m);
          expect([goal, days, m, ['exercise_cap', 'set_cap', 'muscle_cap', 'exercise_full'].includes((res.limits || [])[0]) || res.reason === 'at_max'])
            .toEqual([goal, days, m, true]);
        }
      }
    }
    // Before round 8 no beginner pick at 2 to 4 days changed the week.
    expect(changed / total).toBeGreaterThan(0.6);
  });
});

