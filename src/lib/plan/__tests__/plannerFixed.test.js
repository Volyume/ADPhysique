/**
 * plannerFixed.test.js -- D219 lane C1a: the planner's fixed-structure mode
 * (register D219, build ruling 5; founder Q1 = A; design 8 and 4.2 to 4.9).
 *
 * A LIBRARY or KIT plan keeps its authored sessions and exercises; the new
 * planner sets its sets, its climb and its rotation order around them. This
 * suite pins, over authored plans (a 5-day body-part split, a 3-day full-body
 * library plan, a 4-day upper and lower with a long session) and why:
 *   1. Every authored exercise is kept, in the session it was authored in, in
 *      the order it was authored in, opened at its 2-set floor at least, and
 *      carries its exerciseId; each session carries its routineId (so the
 *      caller can write targets onto the person's own rows).
 *   2. The structure is the person's: a muscle's sessions are exactly the
 *      sessions whose exercises train it (no session-count search, no extra or
 *      fewer sessions from the readiness check), and the family is 'fixed'.
 *   3. No exercise above its cap (4 compound, 3 isolation, 4 for a focus
 *      muscle's isolation) in any of the 6 served weeks (prescribe() over the
 *      output), and week 5 served equals the planner's own peak: one number
 *      everywhere, the lead ruling that holds in this mode too.
 *   4. A focus muscle's sets are never cut for the session length or the D45
 *      ceilings (founder rule 2026-10-04); a session the authored exercises
 *      alone take past D45 keeps all of them and says so.
 *   5. Determinism: the same inputs give the same plan.
 *   6. An authored muscle the plan would not train directly (traps, forearms,
 *      neck) keeps its exercise, held at maintenance, never grown.
 *   7. Bad input is refused loudly, never turned into a different structure:
 *      fewer than 2 or more than 6 sessions, or an exercise with no muscle.
 *   8. Without fixedSessions the planner is unchanged (an absent, empty or
 *      undefined list builds the same plan as no list at all).
 */
import { buildPlan } from '../planner';
import { prescribeWeek } from '../prescribe';
import { exerciseCap, SESSION_CEILINGS, BLOCK } from '../science';
import { DIVISION_MATRIX } from '../../planEngine';

const CHOICES = require('./fixtures/choices');

const BY_NAME = {};
for (const [muscle, list] of Object.entries(CHOICES)) {
  for (const c of list) BY_NAME[c.name] = { muscle, ...c };
}
const CREDITS = Object.fromEntries(Object.values(BY_NAME).map((c) => [c.name, c.credits || {}]));

/** An authored exercise, shaped the way the caller will hand it over. */
const ex = (name, over = {}) => {
  const c = BY_NAME[name];
  if (!c) throw new Error(`fixture has no ${name}`);
  return { exerciseId: `id-${name}`, name, muscle: c.muscle, kind: c.kind, credits: c.credits || {}, ...over };
};
const session = (name, routineId, names) => ({ name, routineId, exercises: names.map((n) => ex(n)) });

// A 5-day body-part split, the shape many library plans have.
const BRO_SPLIT = [
  session('Chest', 'r-chest', ['Barbell Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)', 'Cable Overhead Tricep Extension', 'Tricep Pushdown (Rope)']),
  session('Back', 'r-back', ['Lat Pulldown (Wide Grip)', 'Seated Cable Row', 'Lat Pulldown (Neutral Grip)', 'EZ Bar Preacher Curl', 'Barbell Curl']),
  session('Legs', 'r-legs', ['Barbell Back Squat', 'Leg Press', 'Leg Extension', 'Seated Leg Curl', 'Romanian Deadlift (Barbell)', 'Standing Calf Raise (Machine)']),
  session('Shoulders', 'r-shoulders', ['Dumbbell Lateral Raise', 'Cable Lateral Raise', 'Machine Lateral Raise', 'Reverse Pec Deck', 'Face Pull', 'Cable Crunch']),
  session('Arms', 'r-arms', ['EZ Bar Preacher Curl', 'Barbell Curl', 'Cable Overhead Tricep Extension', 'Tricep Pushdown (Rope)', 'Hanging Knee Raise']),
];

// A 3-day full-body library plan: every session trains every big muscle.
const FULL_BODY = [
  session('Full Body A', 'r-fb-a', ['Barbell Back Squat', 'Barbell Bench Press', 'Lat Pulldown (Wide Grip)', 'Dumbbell Lateral Raise', 'EZ Bar Preacher Curl', 'Cable Crunch']),
  session('Full Body B', 'r-fb-b', ['Romanian Deadlift (Barbell)', 'Incline Dumbbell Press', 'Seated Cable Row', 'Cable Overhead Tricep Extension', 'Standing Calf Raise (Machine)', 'Reverse Pec Deck']),
  session('Full Body C', 'r-fb-c', ['Leg Press', 'Barbell Bench Press', 'Lat Pulldown (Neutral Grip)', 'Cable Lateral Raise', 'Seated Leg Curl', 'Tricep Pushdown (Rope)']),
];

// A 4-day upper and lower whose upper days carry 9 exercises (past D45's 8).
const UPPER_LOWER = [
  session('Upper A', 'r-ua', ['Barbell Bench Press', 'Lat Pulldown (Wide Grip)', 'Incline Dumbbell Press', 'Seated Cable Row', 'Dumbbell Lateral Raise', 'Reverse Pec Deck', 'EZ Bar Preacher Curl', 'Cable Overhead Tricep Extension', 'Tricep Pushdown (Rope)']),
  session('Lower A', 'r-la', ['Barbell Back Squat', 'Seated Leg Curl', 'Leg Extension', 'Barbell Hip Thrust', 'Standing Calf Raise (Machine)', 'Cable Crunch']),
  session('Upper B', 'r-ub', ['Incline Dumbbell Press', 'Seated Cable Row', 'Barbell Bench Press', 'Lat Pulldown (Neutral Grip)', 'Cable Lateral Raise', 'Face Pull', 'Barbell Curl', 'Tricep Pushdown (Rope)']),
  session('Lower B', 'r-lb', ['Romanian Deadlift (Barbell)', 'Leg Press', 'Seated Leg Curl', 'Walking Lunge', 'Seated Calf Raise', 'Hanging Knee Raise']),
];

const STRUCTURES = { 'a 5-day body-part split': BRO_SPLIT, 'a 3-day full-body library plan': FULL_BODY, 'a 4-day upper and lower': UPPER_LOWER };

function plan(fixedSessions, over = {}) {
  return buildPlan({
    sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate', equipment: 'full_gym',
    choices: CHOICES, divisionMatrix: DIVISION_MATRIX, fixedSessions, ...over,
  });
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

const MATRIX = [];
for (const [label, fixed] of Object.entries(STRUCTURES)) {
  for (const sessionLengthMinutes of [45, 75]) {
    for (const focusMuscles of [[], ['chest'], ['side_delts', 'glutes']]) {
      MATRIX.push([`${label}, ${sessionLengthMinutes} min, focus ${focusMuscles.join('+') || 'none'}`, { fixed, sessionLengthMinutes, focusMuscles }]);
    }
  }
}
const BUILT = MATRIX.map(([label, c]) => [label, c, plan(c.fixed, { sessionLengthMinutes: c.sessionLengthMinutes, focusMuscles: c.focusMuscles })]);

describe('authored plans build, and every authored exercise is kept', () => {
  test.each(Object.entries(STRUCTURES))('%s builds in the fixed family with every session and exercise', (_label, fixed) => {
    const p = plan(fixed);
    expect(p.v2.family).toBe('fixed');
    expect(p.splitType).toBe('fixed');
    expect(p.daysPerWeek).toBe(fixed.length);
    expect(p.workouts).toHaveLength(fixed.length);
    expect(p.v2.readiness).toBeDefined();
    expect(p.v2.order).toHaveLength(fixed.length);
  });

  test.each(BUILT)('%s: each session keeps its exercises, in the authored order, from the 2-set floor', (_label, c, p) => {
    for (const authored of c.fixed) {
      const w = p.workouts.find((x) => x.routineId === authored.routineId);
      expect(w).toBeDefined();
      expect(w.name).toBe(authored.name);
      expect(w.exercises.map((e) => e.exerciseId)).toEqual(authored.exercises.map((e) => e.exerciseId));
      expect(w.exercises.map((e) => e.name)).toEqual(authored.exercises.map((e) => e.name));
      // At the peak every authored exercise holds its 2-set floor at least. (A non-peak
      // week may serve one set where an exposure's share is under its floors: prescribe(),
      // as for every generated plan.)
      for (const e of w.exercises) {
        expect({ exercise: e.name, ok: e.peakSets >= 2 }).toEqual({ exercise: e.name, ok: true });
      }
    }
    // Each routine appears once: the rotation order may move sessions, never duplicate or drop one.
    expect(p.workouts.map((w) => w.routineId).sort()).toEqual(c.fixed.map((s) => s.routineId).sort());
  });

  test('a muscle is trained in exactly the sessions whose exercises train it: no session is added or removed', () => {
    for (const [, c, p] of BUILT) {
      const authoredSessions = (m) => c.fixed.filter((s) => s.exercises.some((e) => e.muscle === m)).map((s) => s.routineId).sort();
      const plannedSessions = (m) => p.workouts.filter((w) => w.exercises.some((e) => e.muscle === m)).map((w) => w.routineId).sort();
      for (const m of new Set(c.fixed.flatMap((s) => s.exercises.map((e) => e.muscle)))) {
        expect({ muscle: m, sessions: plannedSessions(m) }).toEqual({ muscle: m, sessions: authoredSessions(m) });
      }
    }
  });

  test('a body-part split keeps chest in its one session, where a generated 5-day plan would train it twice', () => {
    const fixed = plan(BRO_SPLIT);
    expect(fixed.workouts.filter((w) => w.exercises.some((e) => e.muscle === 'chest'))).toHaveLength(1);
    const generated = plan(undefined, { daysPerWeek: 5 });
    expect(generated.workouts.filter((w) => w.exercises.some((e) => e.muscle === 'chest')).length).toBeGreaterThan(1);
  });

  test('the plan names every session by its routineId and every exercise by its exerciseId, and nothing else is invented', () => {
    const p = plan(FULL_BODY);
    const ids = new Set(FULL_BODY.flatMap((s) => s.exercises.map((e) => e.exerciseId)));
    for (const w of p.workouts) {
      expect(FULL_BODY.map((s) => s.routineId)).toContain(w.routineId);
      for (const e of w.exercises) {
        expect(ids.has(e.exerciseId)).toBe(true);
        expect(e.selectionReason).toBe('authored');
        expect(e.thinEquipment).toBe(false);
      }
    }
  });
});

describe('caps hold in every served week, and week 5 is the planner\'s own peak', () => {
  test.each(BUILT)('%s: no exercise above its cap in any of the 6 weeks', (_label, _c, p) => {
    expect(p.v2.family).toBe('fixed');
    for (let week = 1; week <= BLOCK.weeks; week++) {
      const { sets } = serve(p, week);
      for (const w of p.workouts) {
        for (const e of w.exercises) {
          const cap = exerciseCap(e.kind, e.thinEquipment, { focus: p.v2.roles[e.muscle] === 'focus' });
          expect({ week, exercise: e.name, sets: sets[e.slotKey], ok: sets[e.slotKey] <= cap }).toEqual({ week, exercise: e.name, sets: sets[e.slotKey], ok: true });
        }
      }
    }
  });

  test.each(BUILT)('%s: week 5 served equals the peak the planner placed', (_label, _c, p) => {
    expect(p.v2.family).toBe('fixed');
    const peak = serve(p, BLOCK.peakWeek).sets;
    for (const w of p.workouts) for (const e of w.exercises) expect({ e: e.name, s: peak[e.slotKey] }).toEqual({ e: e.name, s: e.peakSets });
  });

  test('the authored session\'s week 1 sets are what the plan carries as its starting sets', () => {
    const p = plan(BRO_SPLIT);
    expect(p.v2.family).toBe('fixed');
    const week1 = serve(p, 1).sets;
    for (const w of p.workouts) for (const e of w.exercises) expect({ e: e.name, s: week1[e.slotKey] }).toEqual({ e: e.name, s: e.sets });
  });
});

describe('a focus muscle\'s sets are kept, and the session length gives, not the volume', () => {
  test('a focus muscle takes every set its authored exercises can hold at 45 minutes, as at 120: the clock gives, not the volume', () => {
    const short = plan(FULL_BODY, { sessionLengthMinutes: 45, focusMuscles: ['chest'] });
    const long = plan(FULL_BODY, { sessionLengthMinutes: 120, focusMuscles: ['chest'] });
    expect(short.v2.family).toBe('fixed');
    // Chest has one exercise in each of the 3 sessions, 4 sets each at most: the caps, not the clock, limit it.
    expect(short.weeklyVolumeSummary.chest.direct).toBe(12);
    expect(long.weeklyVolumeSummary.chest.direct).toBe(12);
    for (const w of short.workouts) {
      for (const e of w.exercises.filter((x) => x.muscle === 'chest')) expect(e.peakSets).toBe(4);
    }
  });

  test('a focus muscle trained in one session still takes the sets its exercises can hold, at any session length', () => {
    const at = (minutes) => {
      const p = plan(BRO_SPLIT, { sessionLengthMinutes: minutes, focusMuscles: ['chest'] });
      expect(p.v2.family).toBe('fixed');
      return p.weeklyVolumeSummary.chest.direct;
    };
    // Three chest exercises in one session: a focus muscle's session holds 10 direct sets.
    expect(at(30)).toBe(10);
    expect(at(120)).toBe(10);
  });

  test('a focus muscle\'s isolation exercise may take 4 sets in a fixed plan too, and no more', () => {
    const p = plan(FULL_BODY, { focusMuscles: ['side_delts'], sessionLengthMinutes: 120 });
    expect(p.v2.family).toBe('fixed');
    const raises = p.workouts.flatMap((w) => w.exercises.filter((e) => e.muscle === 'side_delts'));
    expect(Math.max(...raises.map((e) => e.peakSets))).toBeLessThanOrEqual(4);
    expect(raises.every((e) => e.peakSets >= 2)).toBe(true);
  });

  test('a session the authored exercises alone take past D45 keeps all of them and is reported', () => {
    const p = plan(UPPER_LOWER, { sessionLengthMinutes: 60 });
    const upperA = p.workouts.find((w) => w.routineId === 'r-ua');
    expect(upperA.exercises).toHaveLength(9);
    expect(upperA.exercises.length).toBeGreaterThan(SESSION_CEILINGS.exercises);
    expect(p.v2.overCeilings).toContain(upperA.sessionKey);
  });
});

describe('determinism, and the structure is never rewritten by the readiness check', () => {
  test.each(Object.entries(STRUCTURES))('%s: the same inputs give the same plan', (_label, fixed) => {
    const a = plan(fixed, { focusMuscles: ['biceps'] });
    expect(a.v2.family).toBe('fixed');
    expect(a).toEqual(plan(fixed, { focusMuscles: ['biceps'] }));
  });

  test('no note says a session was added or removed for a muscle', () => {
    for (const [, , p] of BUILT) {
      for (const n of p.v2.notes) expect(['extra_session', 'fewer_sessions', 'ramped']).not.toContain(n.kind);
    }
  });

  test('the person\'s recovery clocks reorder the rotation at most, and never change a weekly target', () => {
    const base = plan(BRO_SPLIT);
    const other = plan(BRO_SPLIT, { learnedFactor: 1.35, recoveryRating: 'poor' });
    expect(base.v2.family).toBe('fixed');
    expect(other.v2.weeklyTargets).toEqual(base.v2.weeklyTargets);
    expect(other.weeklyVolumeSummary).toEqual(base.weeklyVolumeSummary);
  });

  test('a logged history never drops an authored exercise to ramp a muscle in (the structure is the person\'s)', () => {
    const p = plan(BRO_SPLIT, { loggedWeekly: { chest: 2, back: 2, quads: 2 } });
    const authoredCount = BRO_SPLIT.reduce((a, s) => a + s.exercises.length, 0);
    expect(p.workouts.reduce((a, w) => a + w.exercises.length, 0)).toBe(authoredCount);
  });
});

describe('authored floors the session caps would otherwise cut', () => {
  test('five exercises of one muscle in one session keep their floors, and the plan\'s cap for the muscle rises to hold them', () => {
    const chestDay = session('Chest', 'r-chest', ['Barbell Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)']);
    chestDay.exercises.push(ex('Barbell Bench Press', { exerciseId: 'id-bench-again' }), ex('Incline Dumbbell Press', { exerciseId: 'id-incline-again' }));
    const p = plan([chestDay, BRO_SPLIT[1], BRO_SPLIT[2]], { sessionLengthMinutes: 120 });
    expect(p.v2.family).toBe('fixed');
    const chest = p.workouts.find((w) => w.routineId === 'r-chest').exercises.filter((e) => e.muscle === 'chest');
    expect(chest).toHaveLength(5);
    expect(chest.every((e) => e.peakSets >= 2)).toBe(true);
    // 5 x 2 = 10 direct sets: above the usual 8, so the plan states the cap it really holds.
    expect(p.v2.sessionCaps.chest.direct).toBeGreaterThanOrEqual(10);
    const peak = serve(p, BLOCK.peakWeek).sets;
    for (const w of p.workouts) for (const e of w.exercises) expect({ e: e.name, s: peak[e.slotKey] }).toEqual({ e: e.name, s: e.peakSets });
    for (let week = 1; week <= BLOCK.weeks; week++) {
      const { sets } = serve(p, week);
      for (const w of p.workouts) for (const e of w.exercises) expect(sets[e.slotKey]).toBeLessThanOrEqual(exerciseCap(e.kind, e.thinEquipment, { focus: p.v2.roles[e.muscle] === 'focus' }));
    }
  });

  test('a light session never holds fewer sets than its authored exercises do at their floors: chest in all five sessions, two exercises each', () => {
    const everyDay = ['A', 'B', 'C', 'D', 'E'].map((x, i) => session(`Day ${x}`, `r-day-${x}`, [
      i % 2 ? 'Barbell Bench Press' : 'Incline Dumbbell Press', i % 2 ? 'Pec Deck (Machine Fly)' : 'Barbell Bench Press', 'Lat Pulldown (Wide Grip)',
    ]));
    const p = plan(everyDay);
    expect(p.v2.family).toBe('fixed');
    // Five consecutive days: the sessions followed by a short gap are light, and light holds the floors (4), not 2.
    expect(Object.keys(p.v2.lightCaps.chest || {}).length).toBeGreaterThan(0);
    for (const [sessionKey, cap] of Object.entries(p.v2.lightCaps.chest)) {
      expect(cap).toBeGreaterThanOrEqual(4);
      const w = p.workouts.find((x) => x.sessionKey === sessionKey);
      const sets = w.exercises.filter((e) => e.muscle === 'chest').reduce((a, e) => a + e.peakSets, 0);
      expect({ sessionKey, ok: sets <= cap && w.exercises.filter((e) => e.muscle === 'chest').every((e) => e.peakSets >= 2) }).toEqual({ sessionKey, ok: true });
    }
    const peak = serve(p, BLOCK.peakWeek).sets;
    for (const w of p.workouts) for (const e of w.exercises) expect({ e: e.name, s: peak[e.slotKey] }).toEqual({ e: e.name, s: e.peakSets });
  });
});

describe('authored muscles the plan would not otherwise train directly', () => {
  const WITH_TRAPS = [
    session('Pull', 'r-pull', ['Lat Pulldown (Wide Grip)', 'Seated Cable Row', 'EZ Bar Preacher Curl']),
    session('Push', 'r-push', ['Barbell Bench Press', 'Dumbbell Lateral Raise', 'Cable Overhead Tricep Extension']),
  ];
  WITH_TRAPS[0].exercises.push({ exerciseId: 'id-shrug', name: 'Dumbbell Shrug', muscle: 'traps', kind: 'isolation', credits: {} });
  WITH_TRAPS[0].exercises.push({ exerciseId: 'id-wrist', name: 'Wrist Curl', muscle: 'forearms', kind: 'isolation', credits: {} });
  WITH_TRAPS[1].exercises.push({ exerciseId: 'id-neck', name: 'Neck Machine Flexion', muscle: 'neck', kind: 'isolation', credits: {} });

  test('a shrug, a wrist curl and a neck exercise are kept, held at maintenance and never above their caps', () => {
    const p = plan(WITH_TRAPS);
    const kept = p.workouts.flatMap((w) => w.exercises).filter((e) => ['id-shrug', 'id-wrist', 'id-neck'].includes(e.exerciseId));
    expect(kept).toHaveLength(3);
    for (const e of kept) {
      expect(e.peakSets).toBeGreaterThanOrEqual(2);
      expect(e.peakSets).toBeLessThanOrEqual(exerciseCap(e.kind, false));
      expect(p.v2.roles[e.muscle]).toBe('maintenance');
    }
  });
});

describe('input the planner refuses rather than turn into a different structure', () => {
  test('fewer than 2 or more than 6 sessions throws a RangeError', () => {
    expect(() => plan([BRO_SPLIT[0]])).toThrow(RangeError);
    expect(() => plan([...BRO_SPLIT, ...BRO_SPLIT.slice(0, 2)])).toThrow(RangeError);
  });

  test('an exercise with no muscle, or a session with no exercise list, throws a TypeError', () => {
    const noMuscle = [{ name: 'A', routineId: 'a', exercises: [{ exerciseId: 'x', name: 'Mystery', kind: 'isolation' }] }, BRO_SPLIT[1]];
    expect(() => plan(noMuscle)).toThrow(TypeError);
    expect(() => plan([{ name: 'A', routineId: 'a' }, BRO_SPLIT[1]])).toThrow(TypeError);
  });
});

describe('without fixedSessions the planner is unchanged', () => {
  test('an absent, undefined or empty list builds the same plan, with no routine or exercise ids', () => {
    const base = buildPlan({ daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate', equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX });
    expect(plan(undefined, { daysPerWeek: 4 })).toEqual(base);
    expect(plan([], { daysPerWeek: 4 })).toEqual(base);
    expect(base.v2.family).not.toBe('fixed');
    for (const w of base.workouts) {
      expect('routineId' in w).toBe(false);
      for (const e of w.exercises) {
        expect('exerciseId' in e).toBe(false);
        expect(e.selectionReason).toBe('catalogue');
      }
    }
  });
});
