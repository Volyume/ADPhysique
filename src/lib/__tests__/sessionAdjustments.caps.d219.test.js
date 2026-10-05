/**
 * D219 lane R3 (design 4.11, register D219 "Build rulings"): the session's own
 * +1 (COMP-015, algorithms.computeSessionAdjustments) stays inside the plan's
 * caps on a plan the new planner built.
 *
 * Today's +1 goes to the FIRST exercise of the muscle with no per-exercise cap
 * (R1 6.3: "No per-exercise cap exists"), and its ceiling gate reads that one
 * exercise's sets plus what the week has held, not the muscle's planned week.
 * So a plan whose exercises sit at their caps (bench press at 4 sets in the
 * peak week) was served a fifth set: the founder's "I've seen instances where I
 * have 6 sets in an exercise as we progress".
 *
 * Pins (each fails on the code before this lane, which has no `plan` limits,
 * no buildPlanLimits and no cap):
 *  - the +1 goes to the exercise with the most room under its cap, the first on
 *    a tie, and never to an exercise at its cap, in every week of the block;
 *  - it is placed only while one more set keeps the muscle's session under both
 *    session caps (8 direct and 11 fractional, or the plan's own) and the
 *    muscle's planned week under the role's top (the number a check-in may
 *    raise it to), and its gate reads the muscle's WEEKLY planned total, not
 *    one exercise's sets;
 *  - buildPlanLimits writes those limits from the plan's own facts and the week
 *    served for it (a focus muscle's isolation exercise may take 4 sets);
 *  - end to end, computeAndLogSessionAdjustments on a plan with facts never
 *    returns an adjusted exercise past its cap in any of the 5 climbing weeks,
 *    while a plan without facts runs exactly as before (the first exercise
 *    still takes the +1);
 *  - a plan with facts whose limits cannot be read fails CLOSED (no +1), the
 *    easing and the holds are untouched.
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

const database = require('../database');
const { computeSessionAdjustments } = require('../algorithms');
const { prescribeWeek } = require('../plan/prescribe');
const { exerciseCap, PER_SESSION } = require('../plan/science');
const { roleTop } = require('../plan/checkinPlacement');
const {
  buildPlanSessions,
  buildPlanLimits,
  computeAndLogSessionAdjustments,
} = require('../sessionAdjustments');

const NOW = Date.UTC(2026, 5, 11, 12, 0, 0);
const DAY = 86_400_000;

// ── the pure engine: where the +1 goes ───────────────────────────────────────

const READY = {
  lastTrainedAt: NOW - 2 * DAY,
  lastFeedback: { pump: 2, joint: 0, performance: 1 },
  checkinSore: false,
  checkinAt: null,
  presessionSoreness: 1,
};
const LIMITS = {
  cap: 4, sessionDirect: 6, sessionDirectCap: 8, sessionFractional: 6, sessionFractionalCap: 11, weekFractional: 12, weekTop: 24,
};
const lift = (exerciseId, plannedSets, plan, primaryMuscle = 'chest') => ({
  exerciseId, primaryMuscle, plannedSets, ...(plan ? { plan } : {}),
});
const run = (todaysExercises, extra = {}) => computeSessionAdjustments({
  todaysExercises,
  muscleSignals: { chest: READY, ...(extra.signals || {}) },
  weeklyContext: { doneThisWeekByMuscle: extra.done || {}, landmarks: extra.landmarks || {}, weeklySignal: 'hold', isDeload: false, weekStartMs: NOW - 4 * DAY },
  recentSessionEvents: [],
  now: NOW,
});

describe('the +1 on a plan with facts goes to the exercise with the most room under its cap', () => {
  test('not to the first exercise when another has more room', () => {
    const out = run([
      lift('bench', 4, { ...LIMITS, cap: 4 }),
      lift('incline', 2, { ...LIMITS, cap: 4 }),
      lift('fly', 3, { ...LIMITS, cap: 3 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ exerciseId: 'incline', setDelta: 1, plannedSets: 2, adjustedSets: 3 });
  });

  test('the first exercise takes it on a tie in room', () => {
    const out = run([lift('bench', 3, LIMITS), lift('incline', 3, LIMITS)]);
    expect(out[0]).toMatchObject({ exerciseId: 'bench', adjustedSets: 4 });
  });

  test('an exercise at its cap never takes a set: with every exercise at its cap nothing is added', () => {
    expect(run([lift('bench', 4, LIMITS), lift('incline', 4, LIMITS), lift('fly', 3, { ...LIMITS, cap: 3 })])).toEqual([]);
  });

  test('a focus muscle\'s isolation exercise (cap 4) takes a fourth set, and not a fifth', () => {
    const focusCap = exerciseCap('isolation', false, { focus: true });
    expect(focusCap).toBe(4);
    expect(run([lift('curl', 3, { ...LIMITS, cap: focusCap })])[0]).toMatchObject({ adjustedSets: 4 });
    expect(run([lift('curl', 4, { ...LIMITS, cap: focusCap })])).toEqual([]);
  });
});

describe('the +1 is placed only inside the session caps and the role\'s top', () => {
  test('a muscle already at its direct session cap takes nothing, whatever room an exercise has', () => {
    expect(run([lift('bench', 2, { ...LIMITS, sessionDirect: 8 })])).toEqual([]);
  });

  test('a muscle already at its fractional session cap takes nothing', () => {
    expect(run([lift('bench', 2, { ...LIMITS, sessionFractional: 11 })])).toEqual([]);
    expect(run([lift('bench', 2, { ...LIMITS, sessionFractional: 10.5 })])).toEqual([]);
    expect(run([lift('bench', 2, { ...LIMITS, sessionFractional: 10 })])[0]).toMatchObject({ setDelta: 1 });
  });

  test('the plan\'s own session cap is the one read (a focus muscle that may reach 10)', () => {
    const plan = { ...LIMITS, sessionDirect: 8, sessionDirectCap: 10 };
    expect(run([lift('bench', 2, plan)])[0]).toMatchObject({ setDelta: 1 });
    expect(run([lift('bench', 2, { ...plan, sessionDirect: 10 })])).toEqual([]);
  });

  test('the gate reads the muscle\'s planned WEEK, not one exercise\'s sets: two sets on the exercise, a week already at the top', () => {
    // Today's rule reads done (0) + this exercise's 2 sets = 2, far under any ceiling.
    const atTop = run([lift('bench', 2, { ...LIMITS, weekFractional: 24, weekTop: 24 })]);
    expect(atTop).toEqual([]);
    expect(run([lift('bench', 2, { ...LIMITS, weekFractional: 23, weekTop: 24 })])[0]).toMatchObject({ setDelta: 1 });
  });

  test('a week that ran ahead of the plan is never under-counted: sets already done plus today\'s session count', () => {
    const plan = { ...LIMITS, weekFractional: 10, sessionFractional: 6, weekTop: 24 };
    expect(run([lift('bench', 2, plan)], { done: { chest: 17 } })[0]).toMatchObject({ setDelta: 1 }); // 17 + 6 = 23, +1 = 24
    expect(run([lift('bench', 2, plan)], { done: { chest: 18 } })).toEqual([]); // 18 + 6 = 24, +1 = 25
  });

  test('the landmark tables no longer judge a plan with facts: a muscle past its old mav still takes the set under the role\'s top', () => {
    const landmarks = { chest: { mev: 6, mav: 10, mrv: 12 } };
    expect(run([lift('bench', 2, { ...LIMITS, weekFractional: 14 })], { landmarks })[0]).toMatchObject({ setDelta: 1 });
  });

  test('the readiness easing is unchanged: a sore, recently trained muscle still drops one set on its FIRST exercise', () => {
    const sore = { ...READY, lastTrainedAt: NOW - DAY, checkinSore: true, checkinAt: NOW - DAY };
    const out = run([lift('bench', 4, LIMITS), lift('incline', 2, LIMITS)], { signals: { chest: sore }, landmarks: { chest: { mev: 2, mav: 20, mrv: 30 } } });
    expect(out[0]).toMatchObject({ exerciseId: 'bench', setDelta: -1, adjustedSets: 3 });
  });
});

describe('a plan without facts is unchanged', () => {
  test('no limits on any exercise: the first exercise takes the +1 under the landmark gate, as before', () => {
    const out = run([lift('bench', 4), lift('incline', 2)], { landmarks: { chest: { mev: 6, mav: 14, mrv: 22 } } });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ exerciseId: 'bench', setDelta: 1, plannedSets: 4, adjustedSets: 5 });
  });
});

// ── the fixture: a 4-day upper/lower plan the new planner built ──────────────

const exercise = (id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles = []) => (
  { id, name: id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles }
);
const EX = {
  bench: exercise('bench', 'chest', 'barbell', 'compound', ['triceps', 'front_delts']),
  incdb: exercise('incdb', 'chest', 'dumbbell', 'compound', ['triceps', 'front_delts']),
  pecdeck: exercise('pecdeck', 'chest', 'machine_selectorised', 'isolation'),
  row: exercise('row', 'back', 'barbell', 'compound', ['biceps']),
  curl: exercise('curl', 'biceps', 'dumbbell', 'isolation'),
  hammer: exercise('hammer', 'biceps', 'dumbbell', 'isolation'),
  squat: exercise('squat', 'quads', 'barbell', 'compound', ['glutes']),
  legext: exercise('legext', 'quads', 'machine_selectorised', 'isolation'),
  dbbench: exercise('dbbench', 'chest', 'dumbbell', 'compound', ['triceps', 'front_delts']),
  pulldown: exercise('pulldown', 'back', 'cable', 'compound', ['biceps']),
};
const row = (reId, ex, extra = {}) => ({
  routineExercise: { id: reId, exerciseId: ex.id, recommendedSets: 3, groupKind: null, ...extra },
  exercise: ex,
});
const ROUTINES = [
  { id: 'r-ua', name: 'Upper A', programmeId: 'prog-1' },
  { id: 'r-la', name: 'Lower A', programmeId: 'prog-1' },
  { id: 'r-ub', name: 'Upper B', programmeId: 'prog-1' },
];
const ROWS = {
  'r-ua': [row('re-bench', EX.bench), row('re-incdb', EX.incdb), row('re-pecdeck', EX.pecdeck), row('re-row', EX.row), row('re-curl', EX.curl), row('re-hammer', EX.hammer)],
  'r-la': [row('re-squat', EX.squat), row('re-legext', EX.legext)],
  'r-ub': [row('re-dbbench', EX.dbbench), row('re-pulldown', EX.pulldown), row('re-curl2', EX.curl)],
};
// The week's direct-set target per muscle: weeks 1 to 5 climb, week 6 is the recovery week.
const TARGETS = {
  chest: [6, 8, 10, 12, 14, 6],
  back: [4, 5, 6, 7, 8, 4],
  biceps: [6, 8, 10, 12, 14, 6],
  quads: [4, 5, 6, 7, 8, 4],
};
const WEEKS = [1, 2, 3, 4, 5, 6];
const CLIMBING = [1, 2, 3, 4, 5];
const targetsOf = (w) => Object.fromEntries(Object.entries(TARGETS).map(([m, list]) => [m, list[w - 1]]));
const weekRows = () => WEEKS.flatMap((w) => Object.entries(targetsOf(w)).map(([muscle, planned_sets]) => (
  { mesocycle_week_id: `wk-${w}`, week_index: w, muscle, planned_sets, source: 'template' }
)));
const FACTS = {
  version: 2,
  roles: { chest: 'standard', back: 'standard', quads: 'standard', biceps: 'focus' },
  exposureShares: {
    chest: { 'r-ua': 0.6, 'r-ub': 0.4 },
    back: { 'r-ua': 0.5, 'r-ub': 0.5 },
    biceps: { 'r-ua': 0.6, 'r-ub': 0.4 },
  },
  sessionCaps: {},
};
const ctxFor = (facts = FACTS) => ({
  facts,
  sessions: buildPlanSessions(ROUTINES.map((routine) => ({ routine, rows: ROWS[routine.id] })), facts),
});

// ── buildPlanLimits ──────────────────────────────────────────────────────────

describe('buildPlanLimits writes the limits from the plan\'s own facts and the served week', () => {
  const limits = (w, routineId = 'r-ua', facts = FACTS) => buildPlanLimits({
    planContext: ctxFor(facts), routineId, weekTargets: targetsOf(w), exercises: ROWS[routineId],
  });

  test('the exercise cap is science.exerciseCap for the slot: 4 compound, 3 isolation, 4 for a focus muscle\'s isolation', () => {
    const l = limits(3);
    expect(l.bench.cap).toBe(4);
    expect(l.pecdeck.cap).toBe(3);
    expect(l.curl.cap).toBe(exerciseCap('isolation', false, { focus: true }));
    expect(l.curl.cap).toBe(4);
    expect(l.hammer.cap).toBe(4);
  });

  test('the session and week numbers are the served week\'s', () => {
    for (const w of CLIMBING) {
      const served = prescribeWeek({
        sessions: ctxFor().sessions, weekTargets: targetsOf(w), facts: { exposureShares: FACTS.exposureShares, sessionCaps: FACTS.sessionCaps },
      });
      const l = limits(w);
      const sessionChest = served.perSession['r-ua'].direct.chest;
      expect(l.bench.sessionDirect).toBe(sessionChest);
      expect(l.pecdeck.sessionDirect).toBe(sessionChest);
      expect(l.bench.sessionFractional).toBe(served.perSession['r-ua'].fractional.chest);
      const weekChest = ['r-ua', 'r-la', 'r-ub'].reduce((a, id) => a + (served.perSession[id].fractional.chest || 0), 0);
      expect(l.bench.weekFractional).toBe(weekChest);
    }
  });

  test('the session caps default to 8 direct and 11 fractional, and a plan\'s own caps are read', () => {
    const l = limits(2);
    expect(l.bench.sessionDirectCap).toBe(PER_SESSION.directCap);
    expect(l.bench.sessionFractionalCap).toBe(PER_SESSION.fractionalCap);
    const own = limits(2, 'r-ua', { ...FACTS, sessionCaps: { biceps: { direct: 10, fractional: 12 } } });
    expect(own.curl.sessionDirectCap).toBe(10);
    expect(own.curl.sessionFractionalCap).toBe(12);
    expect(own.bench.sessionDirectCap).toBe(8);
  });

  // Design 4.11: the +1 keeps the week under the ROLE's top (4.2), 20 for a
  // standard muscle, not the check-in ceiling's raised 24 (review finding 8).
  test('the week\'s top is the role\'s: a focus muscle 24, a standard muscle 20, a raised muscle 24, a maintenance muscle 6', () => {
    const l = limits(2, 'r-ua', { ...FACTS, roles: { ...FACTS.roles, back: 'maintenance' } });
    expect(l.curl.weekTop).toBe(roleTop('focus'));
    expect(l.curl.weekTop).toBe(24);
    expect(l.bench.weekTop).toBe(20);
    expect(l.row.weekTop).toBe(6);
    const raised = limits(2, 'r-ua', { ...FACTS, roles: { ...FACTS.roles, chest: 'raised' } });
    expect(raised.bench.weekTop).toBe(24);
  });

  test('null for a plan the new planner did not build, and for a routine that is not one of its sessions', () => {
    expect(buildPlanLimits({ planContext: null, routineId: 'r-ua', weekTargets: targetsOf(1), exercises: ROWS['r-ua'] })).toBeNull();
    expect(buildPlanLimits({ planContext: { facts: { version: 1 }, sessions: [] }, routineId: 'r-ua', weekTargets: {}, exercises: [] })).toBeNull();
    expect(limits(1, 'r-elsewhere')).toBeNull();
  });
});

// ── no exercise ever passes its cap after the +1, in any week ────────────────

describe('no exercise ever passes its cap after the +1, in any week', () => {
  const MUSCLES = Object.keys(TARGETS);

  test('every muscle, every session, every climbing week: the +1 keeps the exercise, the session and the week inside their limits', () => {
    let adds = 0;
    let blocked = 0;
    for (const w of CLIMBING) {
      const served = prescribeWeek({
        sessions: ctxFor().sessions, weekTargets: targetsOf(w), facts: { exposureShares: FACTS.exposureShares, sessionCaps: FACTS.sessionCaps },
      });
      for (const routine of ROUTINES) {
        const limits = buildPlanLimits({
          planContext: ctxFor(), routineId: routine.id, weekTargets: targetsOf(w), exercises: ROWS[routine.id],
        });
        for (const muscle of MUSCLES) {
          const todays = ROWS[routine.id]
            .filter((r) => r.exercise.primaryMuscle === muscle)
            .map((r) => ({
              exerciseId: r.exercise.id,
              primaryMuscle: muscle,
              plannedSets: served.sets[r.routineExercise.id],
              plan: limits[r.exercise.id],
            }));
          if (todays.length === 0) continue;
          const out = computeSessionAdjustments({
            todaysExercises: todays,
            muscleSignals: { [muscle]: READY },
            weeklyContext: { doneThisWeekByMuscle: {}, landmarks: {}, weeklySignal: 'hold', isDeload: false, weekStartMs: NOW - 4 * DAY },
            recentSessionEvents: [],
            now: NOW,
          });
          const plan0 = todays[0].plan;
          const sessionBefore = todays.reduce((a, t) => a + t.plannedSets, 0);
          if (out.length === 0) { blocked += 1; continue; }
          for (const d of out) {
            expect(d.setDelta).toBe(1);
            adds += 1;
            const t = todays.find((x) => x.exerciseId === d.exerciseId);
            expect(d.adjustedSets).toBeLessThanOrEqual(t.plan.cap);
            expect(sessionBefore + 1).toBeLessThanOrEqual(plan0.sessionDirectCap);
            expect(plan0.sessionFractional + 1).toBeLessThanOrEqual(plan0.sessionFractionalCap + 1e-9);
            expect(plan0.weekFractional + 1).toBeLessThanOrEqual(plan0.weekTop + 1e-9);
            // No other exercise of the muscle is moved.
            expect(out.filter((x) => x.muscle === muscle)).toHaveLength(1);
          }
        }
      }
    }
    // Not vacuous: the +1 is placed in the early weeks and refused where exercises sit at their caps.
    expect(adds).toBeGreaterThan(0);
    expect(blocked).toBeGreaterThan(0);
  });

  test('week 5, a lone chest exercise at 4 sets: today\'s rule gives it a fifth set, this lane does not', () => {
    const served = prescribeWeek({
      sessions: ctxFor().sessions, weekTargets: targetsOf(5), facts: { exposureShares: FACTS.exposureShares, sessionCaps: FACTS.sessionCaps },
    });
    expect(served.sets['re-dbbench']).toBe(4);
    const limits = buildPlanLimits({ planContext: ctxFor(), routineId: 'r-ub', weekTargets: targetsOf(5), exercises: ROWS['r-ub'] });
    const todays = [{
      exerciseId: 'dbbench', primaryMuscle: 'chest', plannedSets: served.sets['re-dbbench'], plan: limits.dbbench,
    }];
    const input = (exercises) => ({
      todaysExercises: exercises,
      muscleSignals: { chest: READY },
      weeklyContext: { doneThisWeekByMuscle: {}, landmarks: { chest: { mev: 6, mav: 20, mrv: 30 } }, weeklySignal: 'hold', isDeload: false, weekStartMs: NOW - 4 * DAY },
      recentSessionEvents: [],
      now: NOW,
    });
    expect(computeSessionAdjustments(input(todays))).toEqual([]);
    // The same session without limits (today's rule) gives it a fifth set.
    const legacy = computeSessionAdjustments(input(todays.map(({ plan, ...rest }) => rest)));
    expect(legacy[0]).toMatchObject({ exerciseId: 'dbbench', adjustedSets: 5 });
  });
});

// ── end to end through the orchestrator ──────────────────────────────────────

function wireDatabase({ facts = FACTS, week = 1 } = {}) {
  database.getSessionAdjustmentSignals.mockResolvedValue({
    perMuscle: Object.fromEntries(['chest', 'back', 'biceps', 'quads'].map((m) => [m, {
      lastTrainedAt: NOW - 2 * DAY, pump: 2, joint: 0, sessionDifficulty: 2,
    }])),
    checkin: null,
  });
  database.getLatestCoachOutput.mockResolvedValue(null);
  database.getCurrentMesocycleWeek.mockResolvedValue({ id: `wk-${week}`, mesocycleId: 'meso-1', weekIndex: week, isDeload: false });
  database.getAdaptiveLandmarkHistory.mockResolvedValue([]);
  database.getWeeklyVolumeByMuscle.mockResolvedValue([]);
  database.getRecentAdaptationEvents.mockResolvedValue([]);
  database.createAdaptationEvent.mockResolvedValue(undefined);
  database.getMesocycleWeekById.mockImplementation(async (id) => {
    const m = /^wk-(\d)$/.exec(id);
    return m ? { id, mesocycle_id: 'meso-1', week_index: Number(m[1]) } : null;
  });
  database.getPlannedMuscleVolumeForBlock.mockResolvedValue(weekRows());
  database.getRoutineById.mockImplementation(async (id) => ROUTINES.find((r) => r.id === id) ?? null);
  database.getProgrammePlanFacts.mockResolvedValue(facts);
  database.getProgrammeById.mockResolvedValue({ id: 'prog-1', isActive: 1 });
  database.getRoutinesForPlan.mockResolvedValue(ROUTINES);
  database.getRoutineExercisesWithDetails.mockImplementation(async (id) => ROWS[id] ?? []);
}

beforeEach(() => {
  jest.clearAllMocks();
  wireDatabase();
});

const startSession = (routineId, w) => computeAndLogSessionAdjustments({
  userId: 'u1',
  workout: { id: `wo-${routineId}-${w}`, mesocycleWeekId: `wk-${w}`, routineId },
  exercises: ROWS[routineId],
  now: NOW,
});
const isIsolation = (id) => Object.values(EX).find((e) => e.id === id).compoundIsolation === 'isolation';

describe('computeAndLogSessionAdjustments on a plan with facts', () => {
  test('in none of the 5 climbing weeks does an adjusted exercise pass its cap (4 compound, 3 isolation, 4 for a focus muscle\'s isolation)', async () => {
    let adds = 0;
    for (const w of CLIMBING) {
      wireDatabase({ week: w });
      for (const routine of ROUTINES) {
        const decisions = await startSession(routine.id, w);
        for (const d of decisions) {
          if (d.setDelta !== 1) continue;
          adds += 1;
          const focus = FACTS.roles[EX[ROWS[routine.id].find((r) => r.exercise.id === d.exerciseId).exercise.id].primaryMuscle] === 'focus';
          const cap = exerciseCap(isIsolation(d.exerciseId) ? 'isolation' : 'compound', false, { focus });
          expect(d.adjustedSets).toBeLessThanOrEqual(cap);
        }
      }
    }
    expect(adds).toBeGreaterThan(0);
  });

  test('week 5 chest on Upper A: the session sits at its caps, so there is no fifth bench press set', async () => {
    wireDatabase({ week: 5 });
    const decisions = await startSession('r-ua', 5);
    expect(decisions.filter((d) => d.muscle === 'chest' && d.setDelta === 1)).toEqual([]);
  });

  test('week 1 chest on Upper A: the set goes to the exercise with the most room, and is logged against it', async () => {
    wireDatabase({ week: 1 });
    const decisions = await startSession('r-ua', 1);
    const chest = decisions.find((d) => d.muscle === 'chest' && d.setDelta === 1);
    expect(chest).toBeDefined();
    expect(chest.adjustedSets).toBe(chest.plannedSets + 1);
    expect(database.createAdaptationEvent).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: chest.exerciseId, delta: 1 }));
  });

  test('a plan without facts runs exactly as before: the first exercise of the muscle takes the +1', async () => {
    wireDatabase({ facts: null, week: 1 });
    database.getAdaptiveLandmarkHistory.mockResolvedValue([]);
    const decisions = await startSession('r-ua', 1);
    const chest = decisions.find((d) => d.muscle === 'chest' && d.setDelta === 1);
    expect(chest).toBeDefined();
    expect(chest.exerciseId).toBe('bench');
  });

  test('a plan with facts whose session cannot be read fails closed: no +1 anywhere', async () => {
    wireDatabase({ week: 1 });
    // The facts say version 2, but the routine started is not one of the plan's sessions.
    database.getRoutinesForPlan.mockResolvedValue(ROUTINES.filter((r) => r.id !== 'r-ua'));
    const decisions = await startSession('r-ua', 1);
    expect(decisions.filter((d) => d.setDelta === 1)).toEqual([]);
  });
});
