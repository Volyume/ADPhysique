/**
 * planner.test.js -- D219 lane B2: the plan builder, rebuilt on the evidence
 * (design sections 3 to 4.14 and 11, docs/audit/plan-builder-science-
 * 2026-10-04/00-AUDIT-AND-PLAN.md; register D219).
 *
 * What this pins, over a matrix of days, session lengths, goals and focus
 * picks, and why:
 *   1. No exercise above its cap (4 compound, 3 isolation; D8) and no muscle
 *      above its session cap (8 direct, 11 fractional, or what the plan
 *      allows a focus muscle) at the peak week, and in EVERY week served by
 *      prescribe(): the founder's "I've seen instances where I have 6 sets in
 *      an exercise as we progress".
 *   2. The standard floor (founder order 2026-10-10): every direct-trained
 *      growth muscle keeps its STANDARD_DIRECT_FLOOR in its own sets and at
 *      least 2 exercises at week 5; a session past the person's length or the
 *      D45 ceilings (8 exercises, 25 working sets) is reported, never trimmed.
 *   3. One number everywhere: week 5 served by prescribe() equals the
 *      planner's own peak for every exercise.
 *   4. Nothing planned above 30 fractional sets a week; a focus muscle never
 *      above its 22.
 *   5. Determinism: the same inputs give the same plan.
 *   6. The learned recovery factor and the recovery answer never change a
 *      weekly target (design 4.13, 4.2); they may change only the order.
 *   7. A muscle with a light and a heavy session has its heavy one followed
 *      by its longest gap (design 4.5 step 2; review blocker B2); a light
 *      session may share the longest gap with a heavy one, never have it
 *      alone.
 *   8. Inside a session the focus muscle's exercises come first, then
 *      multi-joint before single-joint (design 4.8).
 *   9. Every muscle the plan trains keeps at least one exercise.
 *  10. The readiness promise holds for the common plan (4 days, 75 minutes).
 */
import { buildPlan } from '../planner';
import { prescribeWeek } from '../prescribe';
import { exerciseCap, PER_SESSION, SESSION_CEILINGS, BLOCK, ROLE_TARGETS, STANDARD_DIRECT_FLOOR } from '../science';
import { TYPICAL_WEEK_GAP_HOURS } from '../../recovery/constants';
import { DIVISION_MATRIX } from '../../planEngine';

const CHOICES = require('./fixtures/choices');

const CREDITS = {};
for (const list of Object.values(CHOICES)) for (const c of list) CREDITS[c.name] = c.credits || {};

const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [45, 75];
const GOALS = ['general', 'mens_physique'];
const FOCUS = [[], ['glutes', 'side_delts', 'chest']];

function plan(over = {}) {
  return buildPlan({
    daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate',
    equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX, ...over,
  });
}

const MATRIX = [];
for (const daysPerWeek of DAYS) {
  for (const sessionLengthMinutes of MINUTES) {
    for (const goal of GOALS) {
      for (const focusMuscles of FOCUS) {
        MATRIX.push({ daysPerWeek, sessionLengthMinutes, goal, focusMuscles });
      }
    }
  }
}
const BUILT = MATRIX.map((inputs) => ({ inputs, plan: plan(inputs) }));

function sessionLoads(workout, setsKey = 'peakSets') {
  const direct = {};
  const fractional = {};
  for (const e of workout.exercises) {
    const n = e[setsKey];
    direct[e.muscle] = (direct[e.muscle] || 0) + n;
    fractional[e.muscle] = (fractional[e.muscle] || 0) + n;
    for (const [m, c] of Object.entries(CREDITS[e.name] || {})) {
      if (m !== e.muscle) fractional[m] = (fractional[m] || 0) + c * n;
    }
  }
  return { direct, fractional };
}

function serve(p, week) {
  const sessions = p.workouts.map((w) => ({
    id: w.sessionKey,
    slots: w.exercises.map((e) => ({
      id: e.slotKey, muscle: e.muscle, kind: e.kind, baseSets: e.sets, credits: CREDITS[e.name] || {}, thinEquipment: e.thinEquipment,
      focus: p.v2.roles[e.muscle] === 'focus',
    })),
  }));
  const weekTargets = Object.fromEntries(Object.entries(p.v2.weeklyTargets).map(([m, list]) => [m, list[week - 1]]));
  return prescribeWeek({ sessions, weekTargets, facts: { exposureShares: p.v2.exposureShares, sessionCaps: p.v2.sessionCaps } });
}

const label = ({ inputs }) => `${inputs.daysPerWeek} days, ${inputs.sessionLengthMinutes} min, ${inputs.goal}, focus ${inputs.focusMuscles.join('+') || 'none'}`;

describe('the plan builder over a matrix of days, session lengths, goals and focus picks', () => {
  test.each(BUILT.map((b) => [label(b), b]))('%s: caps hold at the peak week', (_name, { plan: p }) => {
    for (const w of p.workouts) {
      for (const e of w.exercises) {
        expect({ exercise: e.name, sets: e.peakSets, ok: e.peakSets <= exerciseCap(e.kind, e.thinEquipment, { focus: p.v2.roles[e.muscle] === 'focus' }) })
          .toEqual({ exercise: e.name, sets: e.peakSets, ok: true });
      }
      const { direct, fractional } = sessionLoads(w);
      for (const [m, d] of Object.entries(direct)) {
        const cap = p.v2.sessionCaps?.[m]?.direct ?? PER_SESSION.directCap;
        expect({ session: w.name, muscle: m, d, ok: d <= cap }).toEqual({ session: w.name, muscle: m, d, ok: true });
      }
      for (const [m, f] of Object.entries(fractional)) {
        if (!direct[m]) continue;
        const cap = p.v2.sessionCaps?.[m]?.fractional ?? PER_SESSION.fractionalCap;
        expect({ session: w.name, muscle: m, f, ok: f <= cap + 1e-9 }).toEqual({ session: w.name, muscle: m, f, ok: true });
      }
    }
  });

  // Founder order 2026-10-10 (register D219 addendum, the standard floor):
  // nothing is reduced to fit the session length or the day count. Every
  // direct-trained growth muscle keeps its standard in its own sets, and a
  // session that runs past the person's length or the D45 ceilings is
  // reported, not trimmed.
  const GROWTH_DIRECT = ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
  test.each(BUILT.map((b) => [label(b), b]))('%s: the standard floor is kept at week 5', (_name, { plan: p }) => {
    const direct = {};
    const count = {};
    for (const w of p.workouts) {
      for (const e of w.exercises) {
        direct[e.muscle] = (direct[e.muscle] || 0) + e.peakSets;
        count[e.muscle] = (count[e.muscle] || 0) + 1;
      }
    }
    const served = serve(p, BLOCK.peakWeek).sets;
    const servedDirect = {};
    for (const w of p.workouts) for (const e of w.exercises) servedDirect[e.muscle] = (servedDirect[e.muscle] || 0) + (served[e.slotKey] || 0);
    for (const m of GROWTH_DIRECT) {
      expect({ muscle: m, exercises: count[m] || 0, ok: (count[m] || 0) >= 2 }).toEqual({ muscle: m, exercises: count[m] || 0, ok: true });
      expect({ muscle: m, direct: direct[m] || 0, ok: (direct[m] || 0) >= STANDARD_DIRECT_FLOOR[m] }).toEqual({ muscle: m, direct: direct[m] || 0, ok: true });
      expect({ muscle: m, served: servedDirect[m] || 0, ok: (servedDirect[m] || 0) >= STANDARD_DIRECT_FLOOR[m] }).toEqual({ muscle: m, served: servedDirect[m] || 0, ok: true });
    }
  });

  test.each(BUILT.map((b) => [label(b), b]))('%s: a session past the length or the D45 ceilings is reported, never trimmed', (_name, { inputs, plan: p }) => {
    p.workouts.forEach((w) => {
      const i = Number(w.sessionKey.slice(1));
      const minutes = p.v2.sessionMinutesAtPeak[i];
      expect(minutes).toBeDefined();
      const sets = w.exercises.reduce((a, e) => a + e.peakSets, 0);
      const overCeilings = w.exercises.length > SESSION_CEILINGS.exercises || sets > SESSION_CEILINGS.workingSets;
      expect({ session: w.name, reported: p.v2.overCeilings.includes(w.sessionKey) }).toEqual({ session: w.name, reported: overCeilings });
      // The length is reported when the session runs more than the generator's
      // 5-minute tolerance over it; rounding to a tenth of a minute is allowed.
      const over = minutes - inputs.sessionLengthMinutes;
      const reported = (p.v2.overTime[w.sessionKey] || 0) > 0;
      if (over > 5 + 0.05) expect({ session: w.name, reported }).toEqual({ session: w.name, reported: true });
      if (over <= 5 - 0.05) expect({ session: w.name, reported }).toEqual({ session: w.name, reported: false });
      if (reported) {
        expect(p.v2.overTime[w.sessionKey]).toBeGreaterThan(5);
        expect(p.estimatedSessionMinutes).toBeGreaterThanOrEqual(Math.ceil(minutes));
      }
    });
  });

  test.each(BUILT.map((b) => [label(b), b]))('%s: every week served inside the caps, and week 5 is the planner\'s own peak', (_name, { plan: p }) => {
    for (let week = 1; week <= BLOCK.weeks; week++) {
      const { sets } = serve(p, week);
      for (const w of p.workouts) {
        for (const e of w.exercises) expect(sets[e.slotKey]).toBeLessThanOrEqual(exerciseCap(e.kind, e.thinEquipment, { focus: p.v2.roles[e.muscle] === 'focus' }));
      }
    }
    const peak = serve(p, BLOCK.peakWeek).sets;
    for (const w of p.workouts) for (const e of w.exercises) expect({ e: e.name, s: peak[e.slotKey] }).toEqual({ e: e.name, s: e.peakSets });
    // Week 1 served in the saved order is the week the plan says and saves.
    const first = serve(p, 1).sets;
    for (const w of p.workouts) for (const e of w.exercises) expect({ e: e.name, s: first[e.slotKey] }).toEqual({ e: e.name, s: e.sets });
  });

  test.each(MATRIX.filter((x) => x.sessionLengthMinutes === 75).map((inputs) => [
    `${inputs.daysPerWeek} days, ${inputs.goal}, focus ${inputs.focusMuscles.join('+') || 'none'}`, inputs,
  ]))('%s, a slow recoverer with a learned factor: the order their clocks choose is the order served', (_name, inputs) => {
    const p = plan({ ...inputs, recoveryRating: 'slow', learnedFactor: 1.15 });
    const first = serve(p, 1).sets;
    const peak = serve(p, BLOCK.peakWeek).sets;
    for (const w of p.workouts) {
      for (const e of w.exercises) {
        expect({ e: e.name, week1: first[e.slotKey], peak: peak[e.slotKey] }).toEqual({ e: e.name, week1: e.sets, peak: e.peakSets });
      }
    }
  });

  test.each(BUILT.map((b) => [label(b), b]))('%s: nothing planned above 30, a focus muscle never above its planned ceiling', (_name, { plan: p }) => {
    for (const [m, v] of Object.entries(p.weeklyVolumeSummary)) {
      expect(v.fractional).toBeLessThanOrEqual(30);
      // A squat's glute credit can carry a focus muscle past its 22 peak; the design's planned ceiling is 30.
      if (p.v2.roles[m] === 'focus') expect(v.fractional).toBeLessThanOrEqual(ROLE_TARGETS.focus.plannedCeiling + 1e-9);
    }
  });

  test.each(BUILT.map((b) => [label(b), b]))('%s: the focus muscle first, then multi-joint before single-joint', (_name, { plan: p }) => {
    for (const w of p.workouts) {
      const focusFlags = w.exercises.map((e) => p.v2.roles[e.muscle] === 'focus');
      const firstNonFocus = focusFlags.indexOf(false);
      if (firstNonFocus >= 0) expect(focusFlags.slice(firstNonFocus).every((f) => !f)).toBe(true);
      const rest = w.exercises.filter((e) => p.v2.roles[e.muscle] !== 'focus').map((e) => e.kind === 'isolation');
      const firstIso = rest.indexOf(true);
      if (firstIso >= 0) expect(rest.slice(firstIso).every((iso) => iso)).toBe(true);
    }
  });

  test.each(BUILT.map((b) => [label(b), b]))('%s: a kind of session that comes more than once is lettered in the order it is trained', (_name, { plan: p }) => {
    const seen = {};
    for (const w of p.workouts) {
      const m = /^(.+) ([A-Z])$/.exec(w.name);
      if (!m) continue;
      seen[m[1]] = [...(seen[m[1]] || []), m[2]];
    }
    for (const [kind, letters] of Object.entries(seen)) {
      if (letters.length < 2) continue;
      expect({ kind, letters }).toEqual({ kind, letters: letters.map((_, i) => String.fromCharCode(65 + i)) });
    }
  });

  test.each(BUILT.map((b) => [label(b), b]))('%s: every muscle the plan trains keeps an exercise', (_name, { plan: p }) => {
    const trained = new Set(p.workouts.flatMap((w) => w.exercises.map((e) => e.muscle)));
    for (const [m, role] of Object.entries(p.v2.roles)) {
      if (role === 'maintenance') continue;
      if (!CHOICES[m]) continue;
      if (p.v2.family.startsWith('division_') && !Object.values(DIVISION_MATRIX.mens_physique).flat().some((sess) => sess?.muscles?.includes?.(m))) continue;
      expect({ muscle: m, trained: trained.has(m) }).toEqual({ muscle: m, trained: true });
    }
  });

  test.each(BUILT.map((b) => [label(b), b]))('%s: a light and heavy split keeps the heavy session before the longest gap', (_name, { plan: p }) => {
    const n = p.workouts.length;
    const order = p.workouts.map((w) => w.sessionKey);
    const usual = TYPICAL_WEEK_GAP_HOURS[n];
    for (const [m, light] of Object.entries(p.v2.lightCaps || {})) {
      const sessionsOfM = p.workouts.filter((w) => w.exercises.some((e) => e.muscle === m)).map((w) => w.sessionKey);
      if (sessionsOfM.length < 2) continue;
      const pos = sessionsOfM.map((k) => order.indexOf(k)).sort((a, b) => a - b);
      let heavy = -Infinity;
      let lightest = -Infinity;
      for (let i = 0; i < pos.length; i++) {
        const d = ((pos[(i + 1) % pos.length] - pos[i] + n) % n) || n;
        let h = 0;
        for (let j = 0; j < d; j++) h += usual[(pos[i] + j) % n];
        if (Object.prototype.hasOwnProperty.call(light, order[pos[i]])) lightest = Math.max(lightest, h);
        else heavy = Math.max(heavy, h);
      }
      // The longest gap follows a heavy session (a light one may only tie it).
      expect({ muscle: m, heavyHasLongest: heavy >= lightest }).toEqual({ muscle: m, heavyHasLongest: true });
    }
  });

  test('the matrix includes light and heavy splits, so the property above is exercised', () => {
    const split = BUILT.filter(({ plan: p }) => Object.keys(p.v2.lightCaps || {}).length > 0);
    expect(split.length).toBeGreaterThan(0);
  });
});

describe('determinism and the person\'s clocks', () => {
  test('the same inputs give the same plan', () => {
    const a = plan({ daysPerWeek: 5, focusMuscles: ['biceps'] });
    const b = plan({ daysPerWeek: 5, focusMuscles: ['biceps'] });
    expect(a).toEqual(b);
  });

  test.each([[4], [5], [6]])('%i days: the learned factor and the recovery answer never change a weekly target', (days) => {
    const base = plan({ daysPerWeek: days });
    for (const over of [{ learnedFactor: 1.35 }, { learnedFactor: 0.8 }, { recoveryRating: 'poor' }, { recoveryRating: 'good' }]) {
      const other = plan({ daysPerWeek: days, ...over });
      expect(other.v2.weeklyTargets).toEqual(base.v2.weeklyTargets);
      expect(other.weeklyVolumeSummary).toEqual(base.weeklyVolumeSummary);
    }
  });

  test('the plan records the factor it was built on, and the new effort ladder', () => {
    expect(plan({ learnedFactor: 1.2 }).v2.builtFactor).toBe(1.2);
    expect(plan().v2.builtFactor).toBeNull();
    expect(plan().v2.rirLadder).toEqual([3, 2, 2, 1, 1, 4]);
  });
});

describe('focus muscles keep their programmed sets (founder rule 2026-10-04)', () => {
  test('three focus muscles in four 75-minute sessions each reach their 20 sets a week', () => {
    const p = plan({ focusMuscles: ['glutes', 'side_delts', 'chest'] });
    // Side delts on two upper days: a focus isolation exercise may take 4 sets (4 + 3 + 3 a session).
    for (const m of ['glutes', 'side_delts', 'chest']) {
      expect({ muscle: m, ok: p.weeklyVolumeSummary[m].fractional >= 20 - 1e-9 }).toEqual({ muscle: m, ok: true });
    }
  });

  test('a 45-minute session keeps every focus set too: the time gives, not the volume', () => {
    const p = plan({ sessionLengthMinutes: 45, focusMuscles: ['glutes'] });
    expect(p.weeklyVolumeSummary.glutes.fractional).toBeGreaterThanOrEqual(20 - 1e-9);
  });

  test('no session mixes the halves of the body: no lateral raises on a leg day, no glute work on a push day', () => {
    const LOWER = ['quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'tibialis'];
    for (const { plan: p } of BUILT) {
      for (const w of p.workouts) {
        if (/full|focus/i.test(w.name)) continue; // a full-body or focus day trains both by design
        const halves = new Set(w.exercises.filter((e) => e.muscle !== 'abs').map((e) => (LOWER.includes(e.muscle) ? 'lower' : 'upper')));
        expect({ session: w.name, halves: halves.size <= 1 }).toEqual({ session: w.name, halves: true });
      }
    }
  });
});

describe('the readiness promise (design 4.14)', () => {
  test('the common plan, 4 days at 75 minutes, starts every session with every muscle estimated recovered', () => {
    const p = plan();
    expect(p.v2.family).toBe('upper_lower_x2');
    expect(p.v2.readiness.passes).toBe(true);
  });

  test('every growing muscle in the common plan sits in the normal growth range or above', () => {
    const p = plan();
    for (const [m, role] of Object.entries(p.v2.roles)) {
      if (role !== 'standard' || !CHOICES[m]) continue;
      expect({ muscle: m, ok: p.weeklyVolumeSummary[m].fractional >= 10 - 1e-9 }).toEqual({ muscle: m, ok: true });
    }
  });
});
