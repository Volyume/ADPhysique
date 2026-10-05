/**
 * prescribe.test.js -- D219 lane A1: the one function every week's sets per
 * exercise come from (design 4.9, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md).
 *
 * What this pins, and why:
 *   - No exercise ever goes past its cap (4 compound, 3 isolation, plus the
 *     thin-equipment bonus where the plan allowed it) in any week, unless the
 *     person typed the number themselves. The founder: "I've seen instances
 *     where I have 6 sets in an exercise as we progress" (register D219).
 *     The legacy FQ-4 multiplier serves 7 sets of bench press in week 5 of
 *     the typical 4-day plan; the comparison test below records that and
 *     pins the fix.
 *   - Every set of a week's target is either placed or reported as a
 *     shortfall: never forced onto an exercise, never dropped in silence.
 *   - The per-session caps hold: 8 direct, 11 fractional (direct plus half
 *     credit from other exercises), or what the plan allows a focus muscle.
 *   - The planner's heavy and light shares are kept.
 *   - Determinism: the same plan gives the same answer whatever the key
 *     order of the objects passed in.
 * Property tests run over seeded random plans; the generator is in the test
 * only (the engine itself never uses randomness).
 */
import { prescribeWeek, fillSession, splitByWeights } from '../prescribe';
import { PER_SESSION, SETS_PER_EXERCISE, exerciseCap } from '../science';
import { computeWeeklySessionAllocation } from '../../coachApply';

/** mulberry32: small, seeded, good enough for a property test. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'calves', 'abs'];
const SYNERGISTS = { chest: ['triceps', 'front_delts'], back: ['biceps', 'rear_delts'], quads: ['glutes'], hamstrings: ['glutes'] };

function randomPlan(rand) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const nSessions = 2 + Math.floor(rand() * 5);
  let slotId = 0;
  const sessions = [];
  for (let s = 0; s < nSessions; s++) {
    const nSlots = 3 + Math.floor(rand() * 6);
    const slots = [];
    for (let x = 0; x < nSlots; x++) {
      const muscle = pick(MUSCLES);
      const kind = rand() < 0.5 ? 'isolation' : 'heavy_compound';
      const credits = {};
      for (const syn of SYNERGISTS[muscle] || []) if (rand() < 0.7) credits[syn] = 0.5;
      const slot = {
        id: `x${slotId++}`,
        muscle,
        kind,
        baseSets: 2 + Math.floor(rand() * 3),
        credits,
      };
      if (rand() < 0.08) slot.typedSets = 1 + Math.floor(rand() * 7);
      if (rand() < 0.05) slot.thinEquipment = true;
      slots.push(slot);
    }
    sessions.push({ id: `s${s}`, slots });
  }
  const weekTargets = {};
  for (const m of MUSCLES) if (rand() < 0.9) weekTargets[m] = Math.floor(rand() * 26);
  const facts = {};
  if (rand() < 0.4) {
    const m = pick(MUSCLES);
    const ids = sessions.filter((se) => se.slots.some((sl) => sl.muscle === m)).map((se) => se.id);
    if (ids.length >= 2) facts.exposureShares = { [m]: { [ids[0]]: 1 / 3, [ids[1]]: 2 / 3 } };
  }
  return { sessions, weekTargets, facts };
}

function slotsOf(plan) {
  return plan.sessions.flatMap((s) => s.slots.map((slot) => ({ session: s, slot })));
}

const isTyped = (slot) => typeof slot.typedSets === 'number';

describe('prescribeWeek: properties over 400 seeded random plans', () => {
  const plans = [];
  for (let seed = 1; seed <= 400; seed++) plans.push(randomPlan(seeded(seed)));

  test('no exercise the person did not type goes past its cap, and none is served zero sets', () => {
    for (const plan of plans) {
      const { sets } = prescribeWeek(plan);
      for (const { slot } of slotsOf(plan)) {
        if (isTyped(slot)) {
          expect(sets[slot.id]).toBe(slot.typedSets);
          continue;
        }
        expect(sets[slot.id]).toBeLessThanOrEqual(exerciseCap(slot.kind, slot.thinEquipment === true));
        expect(sets[slot.id]).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('every set of a target is placed or reported: placed + shortfall - aboveTarget = target - typed', () => {
    for (const plan of plans) {
      const { sets, shortfall, aboveTarget } = prescribeWeek(plan);
      for (const [m, target] of Object.entries(plan.weekTargets)) {
        const mine = slotsOf(plan).filter(({ slot }) => slot.muscle === m);
        const typed = mine.filter(({ slot }) => isTyped(slot)).reduce((a, { slot }) => a + slot.typedSets, 0);
        const placed = mine.filter(({ slot }) => !isTyped(slot)).reduce((a, { slot }) => a + sets[slot.id], 0);
        expect(placed + (shortfall[m] || 0) - (aboveTarget[m] || 0)).toBe(Math.max(0, target - typed));
      }
    }
  });

  test('no session holds more than 8 direct sets of a muscle from exercises the person did not type, beyond one-set floors', () => {
    for (const plan of plans) {
      const { sets } = prescribeWeek(plan);
      for (const session of plan.sessions) {
        const byMuscle = {};
        for (const slot of session.slots) {
          if (isTyped(slot)) continue;
          (byMuscle[slot.muscle] = byMuscle[slot.muscle] || []).push(sets[slot.id]);
        }
        for (const list of Object.values(byMuscle)) {
          const total = list.reduce((a, b) => a + b, 0);
          expect(total).toBeLessThanOrEqual(Math.max(PER_SESSION.directCap, list.length));
        }
      }
    }
  });

  test('a session over its fractional cap for a muscle has nothing left to move: every exercise of that muscle there sits at its floor', () => {
    for (const plan of plans) {
      const { sets, perSession } = prescribeWeek(plan);
      for (const session of plan.sessions) {
        const fractional = perSession[session.id].fractional;
        for (const [m, f] of Object.entries(fractional)) {
          if (f <= PER_SESSION.fractionalCap + 1e-9) continue;
          const free = session.slots.filter((slot) => slot.muscle === m && !isTyped(slot));
          for (const slot of free) expect(sets[slot.id]).toBeLessThanOrEqual(SETS_PER_EXERCISE.floor);
        }
      }
    }
  });

  test('the same plan gives the same answer whatever the key order of its objects', () => {
    for (const plan of plans.slice(0, 120)) {
      const first = prescribeWeek(plan);
      const reversedTargets = Object.fromEntries(Object.entries(plan.weekTargets).reverse());
      const reversedCredits = {
        ...plan,
        weekTargets: reversedTargets,
        sessions: plan.sessions.map((s) => ({
          ...s,
          slots: s.slots.map((slot) => ({ ...slot, credits: Object.fromEntries(Object.entries(slot.credits).reverse()) })),
        })),
      };
      expect(prescribeWeek(reversedCredits)).toEqual(first);
      expect(prescribeWeek(plan)).toEqual(first);
    }
  });
});

describe('prescribeWeek: worked examples (design 4.9)', () => {
  const upper = (id) => ({
    id,
    slots: [
      { id: `${id}-bench`, muscle: 'chest', kind: 'heavy_compound', baseSets: 3 },
      { id: `${id}-incline`, muscle: 'chest', kind: 'mod_compound', baseSets: 3 },
    ],
  });

  test('chest over two sessions climbs inside the caps: 8 a week is 2 + 2 twice, 16 is 4 + 4 twice', () => {
    const sessions = [upper('A'), upper('B')];
    const w1 = prescribeWeek({ sessions, weekTargets: { chest: 8 } });
    expect(w1.sets).toEqual({ 'A-bench': 2, 'A-incline': 2, 'B-bench': 2, 'B-incline': 2 });
    const w5 = prescribeWeek({ sessions, weekTargets: { chest: 16 } });
    expect(w5.sets).toEqual({ 'A-bench': 4, 'A-incline': 4, 'B-bench': 4, 'B-incline': 4 });
    expect(w5.shortfall).toEqual({});
  });

  test('an odd target gives the extra set to the first choice: 10 a week is 3 + 2 twice', () => {
    const { sets } = prescribeWeek({ sessions: [upper('A'), upper('B')], weekTargets: { chest: 10 } });
    expect(sets).toEqual({ 'A-bench': 3, 'A-incline': 2, 'B-bench': 3, 'B-incline': 2 });
  });

  test('a target past the caps is reported, never forced: 18 a week places 16 and reports 2', () => {
    const { sets, shortfall } = prescribeWeek({ sessions: [upper('A'), upper('B')], weekTargets: { chest: 18 } });
    for (const n of Object.values(sets)) expect(n).toBeLessThanOrEqual(4);
    expect(shortfall).toEqual({ chest: 2 });
  });

  test('the planner\'s heavy and light shares hold: quads 12 a week is 4 light and 8 heavy', () => {
    const lower = (id, n) => ({
      id,
      slots: [
        { id: `${id}-squat`, muscle: 'quads', kind: 'heavy_compound', baseSets: 2 },
        { id: `${id}-legext`, muscle: 'quads', kind: 'isolation', baseSets: 2 },
        { id: `${id}-press`, muscle: 'quads', kind: 'machine', baseSets: 2 },
      ].slice(0, n),
    });
    const { sets } = prescribeWeek({
      sessions: [lower('LA', 2), lower('LB', 3)],
      weekTargets: { quads: 12 },
      facts: { exposureShares: { quads: { LA: 1 / 3, LB: 2 / 3 } } },
    });
    const total = (id) => (sets[`${id}-squat`] || 0) + (sets[`${id}-legext`] || 0) + (sets[`${id}-press`] || 0);
    expect(total('LA')).toBe(4);
    expect(total('LB')).toBe(8);
  });

  test('no exercise is served one set in a normal week: a share below its exercises\' floors takes sets from the session with the most to spare', () => {
    const lower = (id) => ({
      id,
      slots: [
        { id: `${id}-squat`, muscle: 'quads', kind: 'heavy_compound', baseSets: 2 },
        { id: `${id}-legext`, muscle: 'quads', kind: 'isolation', baseSets: 2 },
        { id: `${id}-press`, muscle: 'quads', kind: 'machine', baseSets: 2 },
      ],
    });
    // The shares alone would give LA 4 sets over 3 exercises (2, 1, 1).
    const { sets } = prescribeWeek({
      sessions: [lower('LA'), lower('LB')],
      weekTargets: { quads: 12 },
      facts: { exposureShares: { quads: { LA: 1 / 3, LB: 2 / 3 } } },
    });
    for (const n of Object.values(sets)) expect(n).toBe(2);
    // A week below every exercise's floor still serves one-set exercises.
    const low = prescribeWeek({
      sessions: [lower('LA'), lower('LB')],
      weekTargets: { quads: 9 },
      facts: { exposureShares: { quads: { LA: 1 / 3, LB: 2 / 3 } } },
    });
    expect(Object.values(low.sets).reduce((a, b) => a + b, 0)).toBe(9);
    expect(Math.min(...Object.values(low.sets))).toBe(1);
  });

  test('a set count the person typed is served as typed and counts toward the week', () => {
    const sessions = [
      { id: 'A', slots: [
        { id: 'A-bench', muscle: 'chest', kind: 'heavy_compound', baseSets: 3, typedSets: 6 },
        { id: 'A-incline', muscle: 'chest', kind: 'mod_compound', baseSets: 3 },
      ] },
      upper('B'),
    ];
    const { sets, shortfall } = prescribeWeek({ sessions, weekTargets: { chest: 14 } });
    expect(sets['A-bench']).toBe(6);
    expect(sets['A-incline'] + sets['B-bench'] + sets['B-incline']).toBe(8);
    expect(shortfall).toEqual({});
  });

  test('half credit counts toward the session cap: triceps past 11 fractional in one session move to the other', () => {
    // Push day A: 8 chest sets and 4 overhead-press sets each credit the
    // triceps half a set (6 fractional). Triceps 10 a week with 60% in A
    // would put 6 direct there: 12 fractional, past 11, so one set moves to B.
    const sessions = [
      { id: 'A', slots: [
        { id: 'A-bench', muscle: 'chest', kind: 'heavy_compound', baseSets: 4, credits: { triceps: 0.5 } },
        { id: 'A-incline', muscle: 'chest', kind: 'mod_compound', baseSets: 4, credits: { triceps: 0.5 } },
        { id: 'A-press', muscle: 'front_delts', kind: 'heavy_compound', baseSets: 4, credits: { triceps: 0.5 } },
        { id: 'A-pushdown', muscle: 'triceps', kind: 'isolation', baseSets: 3 },
        { id: 'A-overhead', muscle: 'triceps', kind: 'isolation', baseSets: 3 },
      ] },
      { id: 'B', slots: [
        { id: 'B-pushdown', muscle: 'triceps', kind: 'isolation', baseSets: 3 },
        { id: 'B-overhead', muscle: 'triceps', kind: 'isolation', baseSets: 3 },
      ] },
    ];
    const { sets, perSession, shortfall } = prescribeWeek({
      sessions,
      weekTargets: { chest: 8, front_delts: 4, triceps: 10 },
      facts: { exposureShares: { triceps: { A: 0.6, B: 0.4 } } },
    });
    expect(perSession.A.fractional.triceps).toBe(11);
    expect(sets['A-pushdown'] + sets['A-overhead']).toBe(5);
    expect(sets['B-pushdown'] + sets['B-overhead']).toBe(5);
    expect(shortfall).toEqual({});
  });

  test('a recovery week below two sets an exercise keeps every exercise at one set or more', () => {
    const { sets } = prescribeWeek({ sessions: [upper('A'), upper('B')], weekTargets: { chest: 5 } });
    for (const n of Object.values(sets)) expect(n).toBeGreaterThanOrEqual(1);
    expect(Object.values(sets).reduce((a, b) => a + b, 0)).toBe(5);
  });

  test('a muscle with no weekly row is served its stored sets, never above its cap', () => {
    const { sets } = prescribeWeek({
      sessions: [{ id: 'A', slots: [{ id: 'A-raise', muscle: 'side_delts', kind: 'isolation', baseSets: 5 }] }],
      weekTargets: {},
    });
    expect(sets['A-raise']).toBe(3);
  });
});

describe('the legacy FQ-4 multiplier against prescribeWeek, the typical 4-day plan in week 5', () => {
  // R1 probe 2 (d4): week 1 chest row 6, week 5 row 14; bench press stored at
  // 3 sets in each upper session.
  test('FQ-4 serves 7 sets of bench press; prescribeWeek serves at most 4 and still places all 14 chest sets', () => {
    const legacy = computeWeeklySessionAllocation(
      [{ exerciseId: 'bench', primaryMuscle: 'chest', recommendedSets: 3 }],
      { chest: 14 },
      { chest: 6 },
    );
    expect(legacy.bench).toBe(7);

    const sessions = ['UA', 'UB'].map((id) => ({
      id,
      slots: [
        { id: `${id}-bench`, muscle: 'chest', kind: 'heavy_compound', baseSets: 3 },
        { id: `${id}-incline`, muscle: 'chest', kind: 'mod_compound', baseSets: 3 },
      ],
    }));
    const { sets, shortfall } = prescribeWeek({ sessions, weekTargets: { chest: 14 } });
    for (const n of Object.values(sets)) expect(n).toBeLessThanOrEqual(4);
    expect(Object.values(sets).reduce((a, b) => a + b, 0)).toBe(14);
    expect(shortfall).toEqual({});
  });
});

describe('fillSession and splitByWeights', () => {
  test('fillSession starts every exercise at two sets and fills the one with most room, the first choice on a tie', () => {
    expect(fillSession(4, [4, 4]).sets).toEqual([2, 2]);
    expect(fillSession(5, [4, 4]).sets).toEqual([3, 2]);
    expect(fillSession(5, [4, 3]).sets).toEqual([3, 2]);
    expect(fillSession(7, [4, 3]).sets).toEqual([4, 3]);
    expect(fillSession(8, [4, 3])).toEqual({ sets: [4, 3], unplaced: 1 });
  });

  test('fillSession keeps one set per exercise when the session holds fewer than two each', () => {
    expect(fillSession(3, [4, 4]).sets).toEqual([2, 1]);
    expect(fillSession(1, [4, 4]).sets).toEqual([1, 1]);
  });

  test('splitByWeights is exact and gives remainders to the largest fraction, then the earlier session', () => {
    expect(splitByWeights(10, [1, 1])).toEqual([5, 5]);
    expect(splitByWeights(11, [1, 1])).toEqual([6, 5]);
    expect(splitByWeights(12, [1, 2])).toEqual([4, 8]);
    expect(splitByWeights(7, [0, 0, 0])).toEqual([3, 2, 2]);
    expect(splitByWeights(0, [1, 2])).toEqual([0, 0]);
  });
});
