/**
 * checkinPlan.authoredRir.test.js -- review fix 2 on the off-season library
 * plan (docs/audit/offseason-allan-2026-10-12/01-SPEC.md D3).
 *
 * What this pins, and why: when an authored check-in shifts the ramp (a hold
 * writes run.phases), Apply writes the plan's facts AND the running block's
 * later working weeks' mesocycle_weeks.rir_target from the new ladder in ONE
 * write (setProgrammePlanFactsWithWeekRir), so the stored effort never
 * disagrees with the shifted phases. This week, a recovery week and a
 * checkin that does not apply are never rewritten.
 */
const mockDb = {
  getActivePlan: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
  setProgrammePlanFacts: jest.fn(),
  setProgrammePlanFactsWithWeekRir: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getMesocycleWeeks: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getAllExercises: jest.fn(),
  getActiveBlock: jest.fn(),
  getRecentlyUsedExerciseIds: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  upsertPlannedMuscleVolume: jest.fn(),
};
jest.mock('../database', () => mockDb);
jest.mock('../exercise/intent', () => ({ loadExerciseIntentState: jest.fn() }));
jest.mock('../plan/catalogue', () => ({ resolveCatalogue: jest.fn() }));
jest.mock('../errorLog', () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));

const { writeCheckinPlan } = require('../checkinPlan');

// A hold at week 3 of a block: Ramp 2 repeats, the later weeks move back one.
const nextFacts = {
  kind: 'authored',
  rirLadder: [3, 3, 2, 2, 1, 1, 1, 4],
  authored: { run: { block: 1, phases: ['ramp1', 'ramp2', 'ramp2', 'growth', 'growth', 'growth', 'growth', 'reduction'] } },
};
const weeks = [3, 4, 5, 6, 7, 8].map((index) => ({ id: `w${index}`, index, deload: index === 8 }));

beforeEach(() => jest.clearAllMocks());

test('a shifted ramp rewrites next week onward from the new ladder, with the facts, in one write', async () => {
  await writeCheckinPlan({
    programmeId: 'p1', plan: {}, laterChanges: [], routinesWithRows: [], profile: null,
    weeks, authored: { applies: true, nextFacts },
  });
  expect(mockDb.setProgrammePlanFactsWithWeekRir).toHaveBeenCalledTimes(1);
  expect(mockDb.setProgrammePlanFacts).not.toHaveBeenCalled();
  const [id, facts, rirByWeek] = mockDb.setProgrammePlanFactsWithWeekRir.mock.calls[0];
  expect(id).toBe('p1');
  expect(facts).toBe(nextFacts);
  // This week (w3) and the recovery week (w8) are left alone.
  expect(rirByWeek).toEqual({ w4: 2, w5: 1, w6: 1, w7: 1 });
});

test('a check-in that does not apply writes nothing to the facts or the weeks', async () => {
  await writeCheckinPlan({
    programmeId: 'p1', plan: {}, laterChanges: [], routinesWithRows: [], profile: null,
    weeks, authored: { applies: false, nextFacts },
  });
  expect(mockDb.setProgrammePlanFactsWithWeekRir).not.toHaveBeenCalled();
  expect(mockDb.setProgrammePlanFacts).not.toHaveBeenCalled();
});

test('the database write keeps facts and week efforts in one transaction', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'database.js'), 'utf8');
  const i = src.indexOf('export async function setProgrammePlanFactsWithWeekRir');
  const body = src.slice(i, src.indexOf('\n}\n', i));
  expect(body).toContain('runInTransaction');
  expect(body).toContain('UPDATE programmes SET plan_facts');
  expect(body).toContain('UPDATE mesocycle_weeks SET rir_target');
});
