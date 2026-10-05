/**
 * D219 lane C1b: a MANUAL plan is served as typed in weeks 1 to 5 and at half
 * in the recovery week (register D219 build ruling 5: "a MANUAL plan keeps
 * everything the person built, and every set count in it is treated as typed by
 * the person (served as typed in weeks 1 to 5, half in the recovery week, never
 * climbed on top)").
 *
 * prescribe() serves a typed count as typed in EVERY week, the recovery week
 * included (planFacts.slotsTyped.test.js pins weeks 1 to 5 only), so a manual
 * plan marked typed everywhere would have lost its recovery week: the person's
 * own plan is served by the old multiplier today, which does scale it down in
 * week 6. This suite pins the one resolver every reader goes through
 * (getSessionWeeklyAllocation, which the logger, the mini bar and the plan
 * screens' getCurrentWeekPlanSets all call):
 *  - a plan whose facts say kind 'manual' serves each typed count as typed in
 *    weeks 1 to 5, and round(half), never below 1, in a recovery week
 *    (mesocycle_weeks.is_deload);
 *  - the logger and the plan screens read the SAME halved number (one number
 *    everywhere, design test 7);
 *  - it is scoped: a plan the planner built (any other kind, or none) with a
 *    typed count keeps serving it as typed in the recovery week, exactly as
 *    before; nothing else about serving changes.
 * Each assertion on the recovery week fails on the code before this lane.
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
const { getSessionWeeklyAllocation, getCurrentWeekPlanSets } = require('../sessionAdjustments');

const exercise = (id, primaryMuscle, equipmentCategory, compoundIsolation) => (
  { id, name: id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles: [] }
);
const EX = {
  bench: exercise('bench', 'chest', 'barbell', 'compound'),
  row: exercise('row', 'back', 'barbell', 'compound'),
  pushdown: exercise('pushdown', 'triceps', 'cable', 'isolation'),
};
const ROWS = [
  { routineExercise: { id: 're-bench', exerciseId: 'bench', recommendedSets: 6, groupKind: null }, exercise: EX.bench },
  { routineExercise: { id: 're-row', exerciseId: 'row', recommendedSets: 5, groupKind: null }, exercise: EX.row },
  { routineExercise: { id: 're-pushdown', exerciseId: 'pushdown', recommendedSets: 1, groupKind: null }, exercise: EX.pushdown },
];
const TYPED = { 're-bench': 6, 're-row': 5, 're-pushdown': 1 };

// The block's rows as a manual rebuild writes them: flat in weeks 1 to 5, half in week 6.
const rowsForBlock = () => [1, 2, 3, 4, 5, 6].flatMap((w) => [['chest', 6], ['back', 5], ['triceps', 1]].map(([muscle, n]) => (
  { mesocycle_week_id: `wk-${w}`, week_index: w, muscle, planned_sets: w === 6 ? Math.max(1, Math.round(n / 2)) : n, source: 'template' }
)));

const wire = (facts) => {
  jest.clearAllMocks();
  database.getMesocycleWeekById.mockImplementation(async (id) => {
    const w = Number(String(id).replace('wk-', ''));
    return { id, mesocycle_id: 'meso-1', week_index: w, is_deload: w === 6 ? 1 : 0 };
  });
  database.getPlannedMuscleVolumeForBlock.mockResolvedValue(rowsForBlock());
  database.getRoutineById.mockResolvedValue({ id: 'r-m', programmeId: 'prog-m' });
  database.getProgrammePlanFacts.mockResolvedValue(facts);
  database.getProgrammeById.mockResolvedValue({ id: 'prog-m', isActive: 1 });
  database.getRoutinesForPlan.mockResolvedValue([{ id: 'r-m', name: 'Day 1', programmeId: 'prog-m' }]);
  database.getRoutineExercisesWithDetails.mockResolvedValue(ROWS);
  database.getCurrentMesocycleWeek.mockResolvedValue({ id: 'wk-6' });
};

const served = async (weekNo) => (await getSessionWeeklyAllocation({
  workout: { mesocycleWeekId: `wk-${weekNo}`, routineId: 'r-m' },
  exercises: ROWS,
})).allocation;

const MANUAL = { version: 2, kind: 'manual', typed: TYPED, roles: {} };

describe('a manual plan: typed in weeks 1 to 5, half in the recovery week', () => {
  beforeEach(() => wire(MANUAL));

  test.each([1, 2, 3, 4, 5])('week %i serves every count exactly as typed', async (w) => {
    expect(await served(w)).toEqual({ bench: 6, row: 5, pushdown: 1 });
  });

  test('the recovery week serves round(half), never below 1', async () => {
    // 6 -> 3, 5 -> 3 (round half up, as the planner rounds its own recovery week), 1 stays 1.
    expect(await served(6)).toEqual({ bench: 3, row: 3, pushdown: 1 });
  });

  test('the plan screens show the same number the logger serves, in the recovery week', async () => {
    const bySlot = await getCurrentWeekPlanSets({ userId: 'u', routineId: 'r-m', rows: ROWS });
    expect(bySlot).toEqual({ 're-bench': 3, 're-row': 3, 're-pushdown': 1 });
    const logger = await served(6);
    expect(bySlot['re-bench']).toBe(logger.bench);
    expect(bySlot['re-row']).toBe(logger.row);
  });

  test('the half is of the person\'s own count, so a count typed later is halved the same way', async () => {
    wire({ ...MANUAL, typed: { ...TYPED, 're-bench': 8 } });
    expect((await served(6)).bench).toBe(4);
    expect((await served(5)).bench).toBe(8);
  });

  test('a count in the facts that is not a usable number is left to prescribe, not halved', async () => {
    wire({ ...MANUAL, typed: { ...TYPED, 're-row': 'five' } });
    const sets = await served(6);
    expect(sets.bench).toBe(3);
    expect(sets.row).toBeGreaterThanOrEqual(1);
  });
});

describe('scoped to manual plans: a planner-built plan keeps serving a typed count as typed in the recovery week', () => {
  test.each([
    ['kind generated', { version: 2, kind: 'generated', typed: TYPED, roles: {} }],
    ['kind library', { version: 2, kind: 'library', typed: TYPED, roles: {} }],
    ['no kind (a plan the planner built at activation)', { version: 2, typed: TYPED, roles: {} }],
  ])('%s', async (_name, facts) => {
    wire(facts);
    expect(await served(6)).toEqual({ bench: 6, row: 5, pushdown: 1 });
  });

  test('a plan the new planner did not build is served as before (no v2 context at all)', async () => {
    wire({ version: 1, kind: 'manual', typed: TYPED });
    const out = await getSessionWeeklyAllocation({ workout: { mesocycleWeekId: 'wk-6', routineId: 'r-m' }, exercises: ROWS });
    expect(out.v2).toBe(false);
  });
});
