/**
 * D219 lane S1: every week of a plan the new planner built is served through
 * prescribe(), and every reader of a week's set count reads that one number
 * (design 4.9 "Every week's sets come from one function", register D219
 * "Build rulings, 2026-10-04" items 1 to 3 and the sequencing ruling: the new
 * planner and prescribe() serve ONLY plans whose plan facts carry version 2).
 *
 * Pins (each fails on the code before this lane, which has no fourth argument,
 * no plan context and no v2 path):
 *  - computeWeeklySessionAllocation with a v2 plan context returns exactly
 *    prescribeWeek's sets restricted to today's exercises, in today's shape
 *    (exerciseId to sets), and in none of the 6 weeks passes 4 sets for a
 *    compound or 3 for an isolation exercise (the legacy multiplier serves 7
 *    sets of bench press in week 5 of the same plan);
 *  - the same exercise in two sessions never collides (slot ids);
 *  - a focus muscle (facts.roles[muscle] === 'focus', founder answer
 *    2026-10-04) is carried onto its slots, so its isolation exercise may take
 *    4 sets in every week of the block while every other muscle's isolation
 *    exercise never passes 3;
 *  - legacy is byte-identical: no context, another version, or no sessions
 *    run the old multiplier unchanged (the existing FQ-4 suites stay green and
 *    unedited);
 *  - buildPlanSessions turns the plan's routines and rows into the slots
 *    prescribe reads (kind, credits, thin equipment, circuits left out);
 *  - getSessionWeeklyAllocation reads the facts of the ACTIVE programme and
 *    falls back to the multiplier on every other path, including a read
 *    failure and a database that has none of the new functions;
 *  - ONE NUMBER EVERYWHERE: the logger's resolver, the mini bar's call and the
 *    plan screens' getCurrentWeekPlanSets return the same count for every
 *    exercise of one v2 fixture, in every week; and the source of every routed
 *    reader goes through that resolver;
 *  - the ED isolation holds for the new import: coachApply.js reaches
 *    prescribe.js only, which reaches science.js only, and nothing on that
 *    path is under src/lib/recovery.
 */

jest.mock('../database', () => ({
  getSessionAdjustmentSignals: jest.fn(),
  getLatestCoachOutput: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getAdaptiveLandmarkHistory: jest.fn(),
  getWeeklyVolumeByMuscle: jest.fn(),
  getRecentAdaptationEvents: jest.fn(),
  createAdaptationEvent: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getMesocycleWeekById: jest.fn(),
  getRoutineById: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getProgrammeById: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const fs = require('fs');
const path = require('path');
const database = require('../database');
const { computeWeeklySessionAllocation } = require('../coachApply');
const { prescribeWeek } = require('../plan/prescribe');
const { SETS_PER_EXERCISE } = require('../plan/science');
const {
  buildPlanSessions,
  getSessionWeeklyAllocation,
  getCurrentWeekPlanSets,
  getPlanServeContextForRoutine,
} = require('../sessionAdjustments');

const SRC = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

// ── the fixture: a typical 4-day upper/lower plan, 6 weeks, week-1 sets 3 ────

const exercise = (id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles = []) => (
  { id, name: id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles }
);

const EX = {
  bench: exercise('bench', 'chest', 'barbell', 'compound', ['triceps', 'front_delts']),
  incdb: exercise('incdb', 'chest', 'dumbbell', 'compound', ['triceps', 'front_delts']),
  row: exercise('row', 'back', 'barbell', 'compound', ['biceps']),
  pushdown: exercise('pushdown', 'triceps', 'cable', 'isolation'),
  squat: exercise('squat', 'quads', 'barbell', 'compound', ['glutes']),
  legcurl: exercise('legcurl', 'hamstrings', 'machine_selectorised', 'isolation'),
  dbbench: exercise('dbbench', 'chest', 'dumbbell', 'compound', ['triceps', 'front_delts']),
  pecdeck: exercise('pecdeck', 'chest', 'machine_selectorised', 'isolation'),
  pulldown: exercise('pulldown', 'back', 'cable', 'compound', ['biceps']),
  ohext: exercise('ohext', 'triceps', 'cable', 'isolation'),
  legpress: exercise('legpress', 'quads', 'machine_plate_loaded', 'compound', ['glutes']),
  rdl: exercise('rdl', 'hamstrings', 'barbell', 'compound', ['glutes']),
};

const row = (reId, ex, extra = {}) => ({
  routineExercise: { id: reId, exerciseId: ex.id, recommendedSets: 3, groupKind: null, ...extra },
  exercise: ex,
});

// Rotation order UA, LA, UB, LB. Every routine-exercise id is unique.
const ROUTINES = [
  { id: 'r-ua', name: 'Upper A', programmeId: 'prog-1' },
  { id: 'r-la', name: 'Lower A', programmeId: 'prog-1' },
  { id: 'r-ub', name: 'Upper B', programmeId: 'prog-1' },
  { id: 'r-lb', name: 'Lower B', programmeId: 'prog-1' },
];
const ROWS = {
  'r-ua': [row('re-bench', EX.bench), row('re-incdb', EX.incdb), row('re-row', EX.row), row('re-pushdown', EX.pushdown)],
  'r-la': [row('re-squat', EX.squat), row('re-legcurl', EX.legcurl)],
  'r-ub': [row('re-dbbench', EX.dbbench), row('re-pecdeck', EX.pecdeck), row('re-pulldown', EX.pulldown), row('re-ohext', EX.ohext)],
  'r-lb': [row('re-legpress', EX.legpress), row('re-rdl', EX.rdl)],
};

// This week's direct-set target per muscle, weeks 1 to 5 climbing, week 6 the
// recovery week (the planned_muscle_volume rows' unit, direct sets).
const TARGETS = {
  chest: [6, 8, 10, 12, 14, 6],
  back: [4, 5, 6, 7, 8, 4],
  triceps: [4, 4, 5, 6, 6, 3],
  quads: [4, 5, 6, 7, 8, 4],
  hamstrings: [4, 4, 5, 6, 7, 3],
};
const WEEKS = [1, 2, 3, 4, 5, 6];
const weekTargets = (w, table = TARGETS) => Object.fromEntries(Object.entries(table).map(([m, list]) => [m, list[w - 1]]));
const weekRows = (table = TARGETS) => WEEKS.flatMap((w) => Object.entries(weekTargets(w, table)).map(([muscle, planned_sets]) => (
  { mesocycle_week_id: `wk-${w}`, week_index: w, muscle, planned_sets, source: 'template' }
)));

const FACTS = {
  version: 2,
  exposureShares: {
    chest: { 'r-ua': 0.6, 'r-ub': 0.4 },
    back: { 'r-ua': 0.5, 'r-ub': 0.5 },
    triceps: { 'r-ua': 0.5, 'r-ub': 0.5 },
    quads: { 'r-la': 0.5, 'r-lb': 0.5 },
    hamstrings: { 'r-la': 0.5, 'r-lb': 0.5 },
  },
  sessionCaps: {},
};

// The sessions as prescribe reads them, written by hand so the mapping from
// database rows (buildPlanSessions) is pinned against an independent copy.
const slot = (id, muscle, kind, credits = {}, extra = {}) => (
  { id, muscle, kind, baseSets: 3, credits, thinEquipment: false, focus: false, ...extra }
);
const SESSIONS = [
  { id: 'r-ua', slots: [
    slot('re-bench', 'chest', 'heavy_compound', { triceps: 0.5, front_delts: 0.5 }),
    slot('re-incdb', 'chest', 'mod_compound', { triceps: 0.5, front_delts: 0.5 }),
    slot('re-row', 'back', 'heavy_compound', { biceps: 0.5 }),
    slot('re-pushdown', 'triceps', 'isolation'),
  ] },
  { id: 'r-la', slots: [
    slot('re-squat', 'quads', 'heavy_compound', { glutes: 0.5 }),
    slot('re-legcurl', 'hamstrings', 'isolation'),
  ] },
  { id: 'r-ub', slots: [
    slot('re-dbbench', 'chest', 'mod_compound', { triceps: 0.5, front_delts: 0.5 }),
    slot('re-pecdeck', 'chest', 'isolation'),
    slot('re-pulldown', 'back', 'mod_compound', { biceps: 0.5 }),
    slot('re-ohext', 'triceps', 'isolation'),
  ] },
  { id: 'r-lb', slots: [
    slot('re-legpress', 'quads', 'machine', { glutes: 0.5 }),
    slot('re-rdl', 'hamstrings', 'heavy_compound', { glutes: 0.5 }),
  ] },
];

const todays = (routineId) => ROWS[routineId].map((r) => ({
  exerciseId: r.exercise.id,
  primaryMuscle: r.exercise.primaryMuscle,
  recommendedSets: r.routineExercise.recommendedSets,
  slotId: r.routineExercise.id,
}));
const CTX = { facts: FACTS, sessions: SESSIONS };

function wireDatabase({ facts = FACTS, active = true, routines = ROUTINES, rows = ROWS, table = TARGETS } = {}) {
  database.getMesocycleWeekById.mockImplementation(async (id) => {
    const m = /^wk-(\d)$/.exec(id);
    return m ? { id, mesocycle_id: 'meso-1', week_index: Number(m[1]) } : null;
  });
  database.getPlannedMuscleVolumeForBlock.mockResolvedValue(weekRows(table));
  database.getRoutineById.mockImplementation(async (id) => routines.find((r) => r.id === id) ?? null);
  database.getProgrammePlanFacts.mockResolvedValue(facts);
  database.getProgrammeById.mockResolvedValue({ id: 'prog-1', isActive: active ? 1 : 0 });
  database.getRoutinesForPlan.mockResolvedValue(routines);
  database.getRoutineExercisesWithDetails.mockImplementation(async (id) => rows[id] ?? []);
  database.getCurrentMesocycleWeek.mockResolvedValue({ id: 'wk-5', mesocycleId: 'meso-1', weekIndex: 5 });
}

beforeEach(() => {
  jest.clearAllMocks();
  wireDatabase();
});

// ── the pure allocator ───────────────────────────────────────────────────────

describe('computeWeeklySessionAllocation with a v2 plan context', () => {
  test('returns exactly prescribeWeek\'s sets restricted to today\'s exercises, in today\'s shape, in every week', () => {
    for (const w of WEEKS) {
      const expected = prescribeWeek({
        sessions: SESSIONS, weekTargets: weekTargets(w),
        facts: { exposureShares: FACTS.exposureShares, sessionCaps: FACTS.sessionCaps },
      }).sets;
      for (const s of SESSIONS) {
        const out = computeWeeklySessionAllocation(todays(s.id), weekTargets(w), weekTargets(1), CTX);
        const want = Object.fromEntries(ROWS[s.id].map((r) => [r.exercise.id, expected[r.routineExercise.id]]));
        expect(out).toEqual(want);
      }
    }
  });

  test('in none of the 6 weeks does any exercise pass 4 sets (compound) or 3 (isolation), and every one keeps its floor', () => {
    for (const w of WEEKS) {
      for (const s of SESSIONS) {
        const out = computeWeeklySessionAllocation(todays(s.id), weekTargets(w), weekTargets(1), CTX);
        for (const r of ROWS[s.id]) {
          const n = out[r.exercise.id];
          const cap = r.exercise.compoundIsolation === 'isolation'
            ? SETS_PER_EXERCISE.capIsolation : SETS_PER_EXERCISE.capCompound;
          expect(n).toBeLessThanOrEqual(cap);
          expect(n).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  test('the sets served across the plan add up to the week\'s direct target for every muscle, in every week', () => {
    for (const w of WEEKS) {
      const served = {};
      for (const s of SESSIONS) {
        const out = computeWeeklySessionAllocation(todays(s.id), weekTargets(w), weekTargets(1), CTX);
        for (const r of ROWS[s.id]) {
          const m = r.exercise.primaryMuscle;
          served[m] = (served[m] || 0) + out[r.exercise.id];
        }
      }
      for (const [m, target] of Object.entries(weekTargets(w))) expect(served[m]).toBe(target);
    }
  });

  test('week 5 of the typical plan: the legacy multiplier serves 7 sets of bench press, the v2 plan at most 4', () => {
    const legacy = computeWeeklySessionAllocation(todays('r-ua'), weekTargets(5), weekTargets(1));
    expect(legacy.bench).toBe(7);
    const v2 = computeWeeklySessionAllocation(todays('r-ua'), weekTargets(5), weekTargets(1), CTX);
    expect(v2.bench).toBeLessThanOrEqual(4);
    expect(v2.incdb).toBeLessThanOrEqual(4);
  });

  test('an exercise that is not in the plan gets no entry (the caller keeps its stored count)', () => {
    const out = computeWeeklySessionAllocation(
      [...todays('r-ua'), { exerciseId: 'ad-hoc-curl', primaryMuscle: 'biceps', recommendedSets: 3, slotId: 're-added-today' }],
      weekTargets(5), weekTargets(1), CTX,
    );
    expect(out['ad-hoc-curl']).toBeUndefined();
    expect(Object.keys(out).sort()).toEqual(['bench', 'incdb', 'pushdown', 'row']);
  });

  test('the same exercise in two sessions never collides: each slot is served its own count', () => {
    // Bench press is the first exercise of BOTH upper sessions, with a heavy
    // and a light exposure (60 and 40 percent of the week's chest sets).
    const dup = [
      { id: 'u1', slots: [slot('re-u1-bench', 'chest', 'heavy_compound'), slot('re-u1-inc', 'chest', 'mod_compound')] },
      { id: 'u2', slots: [slot('re-u2-bench', 'chest', 'heavy_compound'), slot('re-u2-fly', 'chest', 'isolation')] },
    ];
    const ctx = { facts: { version: 2, exposureShares: { chest: { u1: 0.7, u2: 0.3 } } }, sessions: dup };
    const direct = prescribeWeek({ sessions: dup, weekTargets: { chest: 10 }, facts: { exposureShares: ctx.facts.exposureShares } }).sets;
    expect(direct['re-u1-bench']).not.toBe(direct['re-u2-bench']);

    const first = computeWeeklySessionAllocation(
      [{ exerciseId: 'bench', primaryMuscle: 'chest', recommendedSets: 3, slotId: 're-u1-bench' }],
      { chest: 10 }, { chest: 6 }, ctx,
    );
    const second = computeWeeklySessionAllocation(
      [{ exerciseId: 'bench', primaryMuscle: 'chest', recommendedSets: 3, slotId: 're-u2-bench' }],
      { chest: 10 }, { chest: 6 }, ctx,
    );
    expect(first.bench).toBe(direct['re-u1-bench']);
    expect(second.bench).toBe(direct['re-u2-bench']);
  });

  test('without a slotId the slot is the exerciseId (the keying a caller with unique exercise ids uses)', () => {
    const sessions = [{ id: 's1', slots: [slot('bench', 'chest', 'heavy_compound'), slot('fly', 'chest', 'isolation')] }];
    const ctx = { facts: { version: 2 }, sessions };
    const out = computeWeeklySessionAllocation(
      [{ exerciseId: 'bench', primaryMuscle: 'chest', recommendedSets: 3 }, { exerciseId: 'fly', primaryMuscle: 'chest', recommendedSets: 3 }],
      { chest: 6 }, { chest: 6 }, ctx,
    );
    const direct = prescribeWeek({ sessions, weekTargets: { chest: 6 } }).sets;
    expect(out).toEqual({ bench: direct.bench, fly: direct.fly });
    expect(out.bench + out.fly).toBe(6);
  });
});

describe('legacy is byte-identical', () => {
  const week = { chest: 14, back: 7 };
  const base = { chest: 6, back: 5 };
  const ex = [
    { exerciseId: 'bench', primaryMuscle: 'chest', recommendedSets: 3 },
    { exerciseId: 'row', primaryMuscle: 'back', recommendedSets: 3 },
    { exerciseId: 'curl', primaryMuscle: 'biceps', recommendedSets: 3 },
  ];
  const legacy = computeWeeklySessionAllocation(ex, week, base);

  test('no context, a null context, another version and a context without sessions all run the old multiplier', () => {
    expect(legacy).toEqual({ bench: 7, row: 4, curl: 3 });
    expect(computeWeeklySessionAllocation(ex, week, base, null)).toEqual(legacy);
    expect(computeWeeklySessionAllocation(ex, week, base, undefined)).toEqual(legacy);
    expect(computeWeeklySessionAllocation(ex, week, base, { facts: { version: 1 }, sessions: SESSIONS })).toEqual(legacy);
    expect(computeWeeklySessionAllocation(ex, week, base, { facts: {}, sessions: SESSIONS })).toEqual(legacy);
    expect(computeWeeklySessionAllocation(ex, week, base, { facts: { version: 2 } })).toEqual(legacy);
    expect(computeWeeklySessionAllocation(ex, week, base, { facts: { version: 2 }, sessions: 'nope' })).toEqual(legacy);
  });

  test('a slotId on today\'s exercises changes nothing on the legacy path', () => {
    const withSlots = ex.map((e, i) => ({ ...e, slotId: `re-${i}` }));
    expect(computeWeeklySessionAllocation(withSlots, week, base)).toEqual(legacy);
  });
});

// ── the slots ────────────────────────────────────────────────────────────────

describe('buildPlanSessions', () => {
  const withRows = ROUTINES.map((routine) => ({ routine, rows: ROWS[routine.id] }));

  test('turns the plan\'s routines and rows into the sessions prescribe reads, in rotation order', () => {
    expect(buildPlanSessions(withRows, FACTS)).toEqual(SESSIONS);
  });

  test('the slot id is the routine exercise row id, unique across the plan even for a repeated exercise', () => {
    const repeated = [
      { routine: { id: 'a' }, rows: [row('re-a-bench', EX.bench)] },
      { routine: { id: 'b' }, rows: [row('re-b-bench', EX.bench)] },
    ];
    const ids = buildPlanSessions(repeated, FACTS).flatMap((s) => s.slots.map((x) => x.id));
    expect(ids).toEqual(['re-a-bench', 're-b-bench']);
  });

  test('facts.thin[routineId] lists the exercise ids that carry the thin-equipment bonus', () => {
    const sessions = buildPlanSessions(withRows, { ...FACTS, thin: { 'r-la': ['legcurl'] } });
    const flat = sessions.flatMap((s) => s.slots);
    expect(flat.find((x) => x.id === 're-legcurl').thinEquipment).toBe(true);
    expect(flat.filter((x) => x.thinEquipment)).toHaveLength(1);
  });

  test('a circuit member is left out: its stored count is the circuit\'s rounds, served as stored', () => {
    const sessions = buildPlanSessions([
      { routine: { id: 'c' }, rows: [row('re-circ1', EX.pushdown, { groupKind: 'circuit' }), row('re-plain', EX.bench)] },
    ], FACTS);
    expect(sessions[0].slots.map((x) => x.id)).toEqual(['re-plain']);
  });

  test('an exercise that did not resolve has no muscle and is served its stored count by prescribe', () => {
    const [session] = buildPlanSessions([
      { routine: { id: 'u' }, rows: [{ routineExercise: { id: 're-x', recommendedSets: 5, groupKind: null }, exercise: { id: 'gone' } }] },
    ], FACTS);
    expect(session.slots[0].muscle).toBeNull();
    expect(prescribeWeek({ sessions: [session], weekTargets: {} }).sets['re-x']).toBeLessThanOrEqual(4);
  });
});

const loggerAllocation = async (routineId, weekNo) => (await getSessionWeeklyAllocation({
  workout: { mesocycleWeekId: `wk-${weekNo}`, routineId },
  exercises: ROWS[routineId],
}));

// ── a focus muscle ───────────────────────────────────────────────────────────

describe('a focus muscle (facts.roles, founder answer 2026-10-04: its isolation exercise may take 4 sets)', () => {
  // Triceps climbs to 8 direct sets: one isolation exercise in each upper
  // session, so 8 needs 4 + 4, which only a focus muscle's isolation work may take.
  const FOCUS_TARGETS = { ...TARGETS, triceps: [4, 5, 6, 7, 8, 4] };
  const focusFacts = { ...FACTS, roles: { triceps: 'focus', chest: 'standard' } };
  const standardFacts = { ...FACTS, roles: { triceps: 'standard', chest: 'standard' } };
  const withRows = ROUTINES.map((routine) => ({ routine, rows: ROWS[routine.id] }));
  const TRICEPS_SLOTS = ['re-pushdown', 're-ohext'];
  const servedTriceps = (facts, w) => {
    const ctx = { facts, sessions: buildPlanSessions(withRows, facts) };
    const out = {};
    for (const s of SESSIONS) {
      const served = computeWeeklySessionAllocation(todays(s.id), weekTargets(w, FOCUS_TARGETS), weekTargets(1, FOCUS_TARGETS), ctx);
      for (const r of ROWS[s.id]) {
        if (TRICEPS_SLOTS.includes(r.routineExercise.id)) out[r.routineExercise.id] = served[r.exercise.id];
      }
    }
    return out;
  };

  test('buildPlanSessions marks exactly the slots of the muscle whose role is focus', () => {
    const flat = buildPlanSessions(withRows, focusFacts).flatMap((s) => s.slots);
    expect(flat.filter((x) => x.focus).map((x) => x.id).sort()).toEqual([...TRICEPS_SLOTS].sort());
    expect(flat.every((x) => typeof x.focus === 'boolean')).toBe(true);
  });

  test('another role, no roles at all, or a slot with no muscle never carries the flag', () => {
    for (const facts of [standardFacts, FACTS, { ...FACTS, roles: { triceps: 'raised', chest: 'maintenance' } }, { ...FACTS, roles: null }]) {
      const flat = buildPlanSessions(withRows, facts).flatMap((s) => s.slots);
      expect(flat.some((x) => x.focus)).toBe(false);
    }
    const [orphan] = buildPlanSessions(
      [{ routine: { id: 'u' }, rows: [{ routineExercise: { id: 're-x', recommendedSets: 3 }, exercise: { id: 'gone' } }] }],
      { ...FACTS, roles: { undefined: 'focus', null: 'focus' } },
    );
    expect(orphan.slots[0].focus).toBe(false);
  });

  test('in every one of the 6 weeks a focus isolation exercise may reach 4 sets and never passes it', () => {
    let reached = 0;
    for (const w of WEEKS) {
      const served = servedTriceps(focusFacts, w);
      for (const id of TRICEPS_SLOTS) {
        expect(served[id]).toBeLessThanOrEqual(4);
        expect(served[id]).toBeGreaterThanOrEqual(1);
        if (served[id] === 4) reached += 1;
      }
    }
    expect(reached).toBeGreaterThan(0);
    // Week 5, a target of 8 direct sets: 4 + 4, nothing left over.
    expect(servedTriceps(focusFacts, 5)).toEqual({ 're-pushdown': 4, 're-ohext': 4 });
  });

  test('the same plan without the focus role never serves an isolation exercise past 3, in any week', () => {
    for (const w of WEEKS) {
      const served = servedTriceps(standardFacts, w);
      for (const id of TRICEPS_SLOTS) expect(served[id]).toBeLessThanOrEqual(3);
    }
    // The sets that do not fit are a shortfall, not forced onto an exercise.
    expect(servedTriceps(standardFacts, 5)).toEqual({ 're-pushdown': 3, 're-ohext': 3 });
  });

  test('equals prescribeWeek run on slots marked focus by hand, in every week', () => {
    const marked = SESSIONS.map((s) => ({ ...s, slots: s.slots.map((x) => ({ ...x, focus: x.muscle === 'triceps' })) }));
    for (const w of WEEKS) {
      const expected = prescribeWeek({
        sessions: marked, weekTargets: weekTargets(w, FOCUS_TARGETS),
        facts: { exposureShares: FACTS.exposureShares, sessionCaps: FACTS.sessionCaps },
      }).sets;
      const served = servedTriceps(focusFacts, w);
      for (const id of TRICEPS_SLOTS) expect(served[id]).toBe(expected[id]);
    }
  });

  test('the resolver reads the role from the active programme\'s plan facts', async () => {
    wireDatabase({ facts: focusFacts, table: FOCUS_TARGETS });
    const focus = (await loggerAllocation('r-ua', 5)).allocation;
    expect(focus.pushdown).toBe(4);

    wireDatabase({ facts: standardFacts, table: FOCUS_TARGETS });
    const standard = (await loggerAllocation('r-ua', 5)).allocation;
    expect(standard.pushdown).toBe(3);
  });

  test('the plan screens read the same focus count as the logger', async () => {
    wireDatabase({ facts: focusFacts, table: FOCUS_TARGETS });
    database.getCurrentMesocycleWeek.mockResolvedValue({ id: 'wk-5', mesocycleId: 'meso-1', weekIndex: 5 });
    const bySlot = await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ub', rows: ROWS['r-ub'] });
    const logger = (await loggerAllocation('r-ub', 5)).allocation;
    expect(bySlot['re-ohext']).toBe(4);
    expect(bySlot['re-ohext']).toBe(logger.ohext);
  });
});

// ── the resolver ─────────────────────────────────────────────────────────────

describe('getSessionWeeklyAllocation', () => {
  test('a v2 plan on the active programme is served through prescribe() and says so', async () => {
    const { allocation, v2 } = await loggerAllocation('r-ua', 5);
    expect(v2).toBe(true);
    expect(allocation).toEqual(computeWeeklySessionAllocation(todays('r-ua'), weekTargets(5), weekTargets(1), CTX));
    expect(allocation.bench).toBeLessThanOrEqual(4);
  });

  test('a plan whose facts are not version 2 runs the multiplier exactly as before', async () => {
    for (const facts of [null, {}, { version: 1 }]) {
      wireDatabase({ facts });
      const { allocation, v2 } = await loggerAllocation('r-ua', 5);
      expect(v2).toBe(false);
      expect(allocation).toEqual(computeWeeklySessionAllocation(todays('r-ua'), weekTargets(5), weekTargets(1)));
      expect(allocation.bench).toBe(7);
    }
  });

  test('a programme that is not the active one is served as before, even with v2 facts', async () => {
    wireDatabase({ active: false });
    const { allocation, v2 } = await loggerAllocation('r-ua', 5);
    expect(v2).toBe(false);
    expect(allocation.bench).toBe(7);
  });

  test('a routine outside any programme is served as before', async () => {
    wireDatabase({ routines: [{ id: 'r-ua', name: 'Loose', programmeId: null }] });
    const { v2 } = await loggerAllocation('r-ua', 5);
    expect(v2).toBe(false);
  });

  test('a failed facts read degrades to the multiplier and never throws', async () => {
    database.getProgrammePlanFacts.mockRejectedValue(new Error('disk I/O'));
    const { allocation, v2 } = await loggerAllocation('r-ua', 5);
    expect(v2).toBe(false);
    expect(allocation.bench).toBe(7);
  });

  test('a database with none of the new functions (the shape older suites mock) serves the multiplier', async () => {
    for (const fn of ['getRoutineById', 'getProgrammePlanFacts', 'getProgrammeById', 'getRoutinesForPlan', 'getRoutineExercisesWithDetails']) {
      database[fn].mockImplementation(undefined);
      database[fn].mockReset();
    }
    const { allocation, v2 } = await loggerAllocation('r-ua', 5);
    expect(v2).toBe(false);
    expect(allocation).toEqual(computeWeeklySessionAllocation(todays('r-ua'), weekTargets(5), weekTargets(1)));
  });

  test('no mesocycle week or no rows still returns no allocation, as before', async () => {
    const none = await getSessionWeeklyAllocation({ workout: { routineId: 'r-ua' }, exercises: ROWS['r-ua'] });
    expect(none).toEqual({ allocation: null, weekRows: [], v2: false });
    database.getPlannedMuscleVolumeForBlock.mockResolvedValue([]);
    expect((await loggerAllocation('r-ua', 5)).allocation).toBeNull();
  });

  test('getPlanServeContextForRoutine returns the facts and the sessions for the active v2 plan, null otherwise', async () => {
    const ctx = await getPlanServeContextForRoutine('r-ub');
    expect(ctx.programmeId).toBe('prog-1');
    expect(ctx.facts.version).toBe(2);
    expect(ctx.sessions).toEqual(SESSIONS);
    expect(await getPlanServeContextForRoutine(null)).toBeNull();
    expect(await getPlanServeContextForRoutine('unknown')).toBeNull();
  });
});

// ── one number everywhere ────────────────────────────────────────────────────

describe('one number everywhere', () => {
  test('the logger, the mini bar and the plan screens return the same count for every exercise, in every week', async () => {
    for (const w of WEEKS) {
      database.getCurrentMesocycleWeek.mockResolvedValue({ id: `wk-${w}`, mesocycleId: 'meso-1', weekIndex: w });
      let planTotal = 0;
      for (const s of SESSIONS) {
        // The logger (ActiveWorkoutScreen) and the mini bar both call exactly this.
        const logger = (await loggerAllocation(s.id, w)).allocation;
        // The plan screens (PlanDetailScreen) read the routine's stored rows.
        const bySlot = await getCurrentWeekPlanSets({ userId: 'u1', routineId: s.id, rows: ROWS[s.id] });
        for (const r of ROWS[s.id]) {
          expect(bySlot[r.routineExercise.id]).toBe(logger[r.exercise.id]);
          planTotal += bySlot[r.routineExercise.id];
        }
      }
      // The plan's est. sets/week for the week is the sum of what the logger serves.
      const direct = prescribeWeek({
        sessions: SESSIONS, weekTargets: weekTargets(w),
        facts: { exposureShares: FACTS.exposureShares, sessionCaps: FACTS.sessionCaps },
      }).sets;
      expect(planTotal).toBe(Object.values(direct).reduce((a, b) => a + b, 0));
    }
  });

  test('a plan screen given the plan context it already resolved reads the same numbers', async () => {
    const planContext = await getPlanServeContextForRoutine('r-ua');
    const withCtx = await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ua', rows: ROWS['r-ua'], planContext });
    const without = await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ua', rows: ROWS['r-ua'] });
    expect(withCtx).toEqual(without);
    expect(Object.keys(withCtx).sort()).toEqual(['re-bench', 're-incdb', 're-pushdown', 're-row']);
  });

  test('for any other plan the plan screens get null and keep showing their stored counts', async () => {
    wireDatabase({ facts: { version: 1 } });
    expect(await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ua', rows: ROWS['r-ua'] })).toBeNull();
    wireDatabase({ facts: null });
    expect(await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ua', rows: ROWS['r-ua'] })).toBeNull();
    wireDatabase({ active: false });
    expect(await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ua', rows: ROWS['r-ua'] })).toBeNull();
    expect(await getCurrentWeekPlanSets({ userId: null, routineId: 'r-ua', rows: ROWS['r-ua'] })).toBeNull();
    expect(await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ua', rows: [] })).toBeNull();
  });

  test('no current week means null, never a guess', async () => {
    database.getCurrentMesocycleWeek.mockResolvedValue(null);
    expect(await getCurrentWeekPlanSets({ userId: 'u1', routineId: 'r-ua', rows: ROWS['r-ua'] })).toBeNull();
  });

  describe('the routed readers go through the resolver (source pins)', () => {
    test('ActiveWorkoutScreen: the allocation effect takes the v2 flag, and the outline shows the served count on every row', () => {
      const src = read('screens/ActiveWorkoutScreen.js');
      expect(src).toMatch(/getSessionWeeklyAllocation\(\{ workout: activeWorkout, exercises: workoutExercises \}\)/);
      expect(src).toMatch(/\.then\(\(\{ allocation, v2 \}\) => \{[\s\S]*?setPlanServedV2\(!!v2\);/);
      expect(src).toMatch(/const outlineItemsShown = planServedV2[\s\S]*?weeklyAllocation\?\.\[workoutExercises\[i\]\?\.exercise\?\.id\]/);
      expect(src).toContain('items={outlineItemsShown}');
      // The current exercise still reads the allocated base (the older pin, unchanged).
      expect(src).toContain('weeklyAllocation?.[exercise?.id] ?? routineExercise?.recommendedSets');
    });

    test('ActiveSessionMiniBar: the target comes from the same resolver call, stored count as the fallback', () => {
      const src = read('components/ActiveSessionMiniBar.js');
      expect(src).toContain("import { getSessionWeeklyAllocation } from '../lib/sessionAdjustments';");
      expect(src).toMatch(/getSessionWeeklyAllocation\(\{ workout: activeWorkout, exercises: workoutExercises \}\)/);
      expect(src).toContain('setServed(v2 ? allocation : null)');
      expect(src).toContain('const target = served?.[exerciseId] ?? recommended;');
      expect(src).toContain('`Set ${setsDone + 1} of ${target}`');
    });

    test('PlanDetailScreen: est. sets/week reads the resolver for the ACTIVE plan and keeps the stored counts otherwise', () => {
      const src = read('screens/PlanDetailScreen.js');
      expect(src).toContain("import { getPlanServeContextForRoutine, getCurrentWeekPlanSets } from '../lib/sessionAdjustments';");
      expect(src).toMatch(/active\?\.id === planId[\s\S]*?getCurrentWeekPlanSets\(\{ userId: user\.id, routineId: routine\.id, rows, planContext \}\)/);
      expect(src).toContain('servedSetCounts[w.id] || setCounts[w.id] || (exerciseCounts[w.id] || 0) * 3');
    });

    test('the legacy readers of the stored count are left exactly as they were', () => {
      expect(read('screens/ActiveWorkoutScreen.js')).toContain(': entry.routineExercise?.recommendedSets) || DEFAULT_FREEFORM_TARGET_SETS');
      expect(read('lib/sessionAdjustments.js')).toMatch(/getSessionWeeklyAllocation\(\{ workout, exercises \}\)/);
      expect(read('lib/sessionAdjustments.js')).toMatch(/plannedSets: allocation\?\.\[e\?\.exercise\?\.id\]/);
    });
  });
});

// ── the ED isolation, for the new import ────────────────────────────────────

describe('coachApply.js reaches prescribe.js and nothing under src/lib/recovery (CLAUDE.md section 2, ED-safety)', () => {
  const importsOf = (rel) => {
    const src = read(rel);
    const out = [];
    const re = /(?:\bfrom\s+|\brequire\(\s*)['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) out.push(m[1]);
    return out;
  };

  test('coachApply.js imports exactly one plan module, prescribe', () => {
    const plan = importsOf('lib/coachApply.js').filter((spec) => /(^|\/)plan(\/|$)/.test(spec));
    expect(plan).toEqual(['./plan/prescribe']);
  });

  test('prescribe.js imports only science.js, and science.js imports nothing', () => {
    expect(importsOf('lib/plan/prescribe.js')).toEqual(['./science']);
    expect(importsOf('lib/plan/science.js')).toEqual([]);
  });

  test('so no module on the path is under src/lib/recovery', () => {
    const seen = new Set();
    const walk = (rel) => {
      if (seen.has(rel)) return;
      seen.add(rel);
      for (const spec of importsOf(rel)) {
        if (!spec.startsWith('.')) continue;
        const next = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)) + '.js';
        expect(next).not.toMatch(/(^|\/)recovery\//);
        walk(next);
      }
    };
    walk('lib/plan/prescribe.js');
    expect([...seen].sort()).toEqual(['lib/plan/prescribe.js', 'lib/plan/science.js']);
  });
});
