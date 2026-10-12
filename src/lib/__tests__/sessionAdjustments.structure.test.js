/**
 * sessionAdjustments.structure.test.js -- D222 phase 6 (R62): the weekly
 * serving of a plan the structure engine built, through the ONE resolver the
 * logger, the mini bar and the plan screens share (getSessionWeeklyAllocation).
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md
 * R62 and R68. The facts are the real adapter's (structureFacts) over the real
 * engine's week, saved the way the save path saves them. What this suite pins
 * and why:
 *   - every block week, 1 to 6 (the recovery week included), serves each
 *     engine exercise the engine's own ladder for that week, not prescribe()'s
 *     answer over the compat targets;
 *   - the next-day exception's RIR comes back where it is above the block
 *     week's RIR, and only there;
 *   - a count the person typed still wins;
 *   - an exercise added by hand later (no structure match) is served as today.
 * Each fails on the resolver before phase 6 (no structure serving).
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
const { getSessionWeeklyAllocation } = require('../sessionAdjustments');
const { buildStructurePlan } = require('../structure/engine');
const { structureFacts, structureWeeklyTargets } = require('../structure/adapt');
const { PROGRESSION } = require('../structure/rulebook');
const { LIBRARY, BY_NAME } = require('./campaign16.helpers');

jest.setTimeout(120000);

const ARGS = { goal: 'mens_physique', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
let result;
let facts;
let routinesWithRows;
let light;

beforeAll(() => {
  result = buildStructurePlan({ ...ARGS, library: LIBRARY });
  const routineIds = result.plan.sessions.map((_, i) => `routine-${i}`);
  const routineExerciseIds = result.plan.sessions.map((s, i) => s.exercises.map((_, j) => `re-${i}-${j}`));
  facts = structureFacts(result, ARGS, { routineIds, routineExerciseIds });
  routinesWithRows = result.plan.sessions.map((s, i) => ({
    routine: { id: routineIds[i], programmeId: 'programme-1' },
    rows: s.exercises.map((ex, j) => ({
      routineExercise: { id: `re-${i}-${j}`, exerciseId: ex.id, recommendedSets: ex.weeks[0].sets, groupKind: null },
      exercise: BY_NAME.get(ex.id),
    })),
  }));
  const si = result.plan.sessions.findIndex((s) => s.exercises.some((ex) => ex.nextDayException));
  light = { si, ex: result.plan.sessions[si].exercises.find((ex) => ex.nextDayException) };
});

// The block's weekly rows as the save writes them (structureWeeklyTargets).
function plannedRows() {
  const targets = structureWeeklyTargets(result.plan);
  const rows = [];
  for (let w = 1; w <= 6; w += 1) {
    for (const [muscle, list] of Object.entries(targets)) {
      rows.push({ mesocycle_week_id: `week-${w}`, week_index: w, muscle, planned_sets: list[w - 1] });
    }
  }
  return rows;
}

beforeEach(() => {
  jest.clearAllMocks();
  database.getMesocycleWeekById.mockImplementation(async (id) => {
    const w = Number(id.replace('week-', ''));
    return { id, mesocycle_id: 'mesocycle-1', week_index: w, is_deload: w === 6 ? 1 : 0, rir_target: PROGRESSION.rirLadder[w - 1] };
  });
  database.getPlannedMuscleVolumeForBlock.mockResolvedValue(plannedRows());
  database.getRoutineById.mockImplementation(async (id) => ({ id, programmeId: 'programme-1' }));
  database.getProgrammePlanFacts.mockImplementation(async () => facts);
  database.getProgrammeById.mockResolvedValue({ id: 'programme-1', isActive: 1 });
  database.getRoutinesForPlan.mockResolvedValue(routinesWithRows.map((r) => r.routine));
  database.getRoutineExercisesWithDetails.mockImplementation(async (id) => routinesWithRows.find((r) => r.routine.id === id).rows);
});

const serve = (si, w, rows = routinesWithRows[si].rows) => getSessionWeeklyAllocation({
  workout: { mesocycleWeekId: `week-${w}`, routineId: `routine-${si}` },
  exercises: rows,
});

test('weeks 1 to 6 serve the engine ladder for every exercise, the recovery week included', async () => {
  for (let si = 0; si < result.plan.sessions.length; si += 1) {
    for (let w = 1; w <= 6; w += 1) {
      // eslint-disable-next-line no-await-in-loop
      const { allocation, v2 } = await serve(si, w);
      expect(v2).toBe(true);
      for (const ex of result.plan.sessions[si].exercises) expect(allocation[ex.id]).toBe(ex.weeks[w - 1].sets);
    }
  }
});

test('the next-day exception serves its RIR above the block week\'s, and only there', async () => {
  expect(light.ex).toBeTruthy();
  for (let w = 1; w <= 6; w += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { rir } = await serve(light.si, w);
    const blockRir = PROGRESSION.rirLadder[w - 1];
    const ladderRir = light.ex.weeks[w - 1].rir;
    if (ladderRir > blockRir) expect(rir[light.ex.id]).toBe(ladderRir);
    else expect(rir?.[light.ex.id]).toBeUndefined();
  }
  const { rir } = await serve(light.si, 4);
  expect(rir[light.ex.id]).toBe(2);
});

test('a typed count still wins', async () => {
  const first = routinesWithRows[0].rows[0];
  database.getProgrammePlanFacts.mockImplementation(async () => ({ ...facts, typed: { [first.routineExercise.id]: 6 } }));
  const { allocation } = await serve(0, 3);
  expect(allocation[first.exercise.id]).toBe(6);
});

test('an exercise added by hand is served as today, not from the ladder', async () => {
  const added = BY_NAME.get('Cable Crunch') || LIBRARY.find((e) => e.primaryMuscle === 'abs');
  const rows = [...routinesWithRows[0].rows, {
    routineExercise: { id: 're-by-hand', exerciseId: added.id, recommendedSets: 3, groupKind: null },
    exercise: added,
  }];
  const { allocation } = await serve(0, 2, rows);
  for (const ex of result.plan.sessions[0].exercises) expect(allocation[ex.id]).toBe(ex.weeks[1].sets);
  // Served exactly as the resolver serves it without the structure block.
  const { structure, ...withoutStructure } = facts;
  expect(structure.version).toBe(3);
  database.getProgrammePlanFacts.mockImplementation(async () => withoutStructure);
  const before = await serve(0, 2, rows);
  expect(before.allocation[added.id]).toBeDefined();
  expect(allocation[added.id]).toBe(before.allocation[added.id]);
});
