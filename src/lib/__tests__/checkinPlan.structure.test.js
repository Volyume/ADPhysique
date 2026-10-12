/**
 * checkinPlan.structure.test.js -- D222 phase 7 (R78, R78a, R72): a weekly
 * check-in on a plan the structure engine built.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/24-PHASE7-AFTER-BUILD-SPEC.md
 * R78 and R78a (BLOCKER before switch-on: phase 6 serves the stored ladder,
 * so a check-in that only rewrote the weekly rows would be ignored). The facts
 * are the real adapter's over the real engine's week. What this pins and why:
 *   1. Resolving writes nothing (D96).
 *   2. A reduce changes the structure ladder from next week on (the weeks
 *      before it are untouched), the version 2 fields are rebuilt from it
 *      (R72), next week's rows for the screen's atomic apply and the later
 *      weeks' rows equal the refreshed weeklyTargets, and Apply writes the
 *      facts and the later rows (source 'coach').
 *   3. A second Apply after the write (a retry) changes the ladder no further.
 *   4. A hold changes nothing and offers no Apply (09 s8).
 *   5. A raise never adds a fault, and a raise with no room says so.
 */
const mockDb = {
  getActivePlan: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
  setProgrammePlanFacts: jest.fn(),
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
  updateRoutineExerciseOrder: jest.fn(),
};
jest.mock('../database', () => mockDb);
jest.mock('../exercise/intent', () => ({ loadExerciseIntentState: jest.fn() }));
jest.mock('../errorLog', () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));

const { loadExerciseIntentState } = require('../exercise/intent');
const { resolveCheckinPlan, writeCheckinPlan } = require('../checkinPlan');
const { buildStructurePlan } = require('../structure/engine');
const { structureFacts, structureWeeklyTargets } = require('../structure/adapt');
const { planFromFacts, recheck } = require('../structure/stored');
const { LIBRARY, BY_NAME } = require('./campaign16.helpers');

jest.setTimeout(120000);

const WEEKS = [1, 2, 3, 4, 5, 6].map((w) => ({ id: `w${w}`, week_index: w, is_deload: w === 6 ? 1 : 0 }));

function setup(args) {
  const result = buildStructurePlan({ ...args, library: LIBRARY });
  const routineIds = result.plan.sessions.map((_, i) => `r${i}`);
  const reIds = result.plan.sessions.map((s, i) => s.exercises.map((_, j) => `re${i}_${j}`));
  const facts = structureFacts(result, args, { routineIds, routineExerciseIds: reIds });
  const rowsByRoutine = Object.fromEntries(result.plan.sessions.map((s, i) => [routineIds[i], s.exercises.map((ex, j) => ({
    routineExercise: { id: reIds[i][j], recommendedSets: ex.weeks[0].sets, orderInRoutine: j },
    exercise: BY_NAME.get(ex.id),
  }))]));
  const targets = structureWeeklyTargets(result.plan);
  const planned = [];
  for (const w of WEEKS) {
    for (const [muscle, list] of Object.entries(targets)) {
      planned.push({ mesocycle_week_id: w.id, week_index: w.week_index, muscle, planned_sets: list[w.week_index - 1], mev: 4, mav: 14, mrv: 24, source: 'template' });
    }
  }
  return { result, facts, rowsByRoutine, planned, routineIds };
}

function arrange(s, { facts = s.facts, current = 'w2' } = {}) {
  for (const fn of Object.values(mockDb)) fn.mockReset();
  loadExerciseIntentState.mockReset();
  mockDb.getActivePlan.mockResolvedValue({ id: 'p1', name: 'My plan' });
  mockDb.getProgrammePlanFacts.mockResolvedValue(facts);
  mockDb.getCurrentMesocycleWeek.mockResolvedValue({ id: current, mesocycleId: 'm1', weekIndex: Number(current.slice(1)), awaitingDecision: false });
  mockDb.getMesocycleWeeks.mockResolvedValue(WEEKS);
  mockDb.getPlannedMuscleVolumeForBlock.mockResolvedValue(s.planned);
  mockDb.getRoutinesForPlan.mockResolvedValue(s.routineIds.map((id) => ({ id, name: id })));
  mockDb.getRoutineExercisesWithDetails.mockImplementation(async (id) => s.rowsByRoutine[id]);
  mockDb.getAllExercises.mockResolvedValue(LIBRARY);
  mockDb.getActiveBlock.mockResolvedValue({ id: 'm1' });
  mockDb.getRecentlyUsedExerciseIds.mockResolvedValue([]);
  mockDb.addExerciseToRoutine.mockResolvedValue({ id: 'new-row' });
  loadExerciseIntentState.mockResolvedValue({ unavailable: false, capability: null });
}
const WRITERS = ['addExerciseToRoutine', 'upsertPlannedMuscleVolume', 'setProgrammePlanFacts', 'updateRoutineExerciseOrder'];

const ARGS = { goal: 'general', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
let s;
beforeAll(() => { s = setup(ARGS); });

describe('R78a: a check-in reaches the structure ladder', () => {
  test('a reduce: resolving writes nothing; Apply writes the ladder, the refreshed facts and the later rows', async () => {
    arrange(s);
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: -2 });
    for (const name of WRITERS) expect(mockDb[name]).not.toHaveBeenCalled();
    expect(resolved.card.showApply).toBe(true);
    const next = resolved.structure.facts;
    expect(next).toBeTruthy();
    // The weeks before next week (w3) are untouched; later weeks lose sets.
    const before = s.facts.structure.sessions.flatMap((x) => x.exercises);
    const after = next.structure.sessions.flatMap((x) => x.exercises);
    let fewer = 0;
    after.forEach((ex, i) => {
      expect(ex.weeks.slice(0, 2)).toEqual(before[i].weeks.slice(0, 2));
      if (ex.weeks[2].sets < before[i].weeks[2].sets) fewer += 1;
    });
    expect(fewer).toBeGreaterThan(0);
    // R72: the compat fields are rebuilt from the new ladder.
    expect(next.weeklyTargets).toEqual(structureWeeklyTargets(planFromFacts(next)));
    // Next week's rows for the atomic apply equal the refreshed targets.
    for (const c of resolved.nextWeekChanges) expect(c.plannedSets).toBe(next.weeklyTargets[c.muscle][2]);
    expect(resolved.nextWeekChanges.length).toBeGreaterThan(0);
    for (const c of resolved.laterChanges) expect(c.plannedSets).toBe(next.weeklyTargets[c.muscle][c.weekIndex - 1]);
    // No new fault.
    expect(recheck(planFromFacts(next)).hard.length).toBeLessThanOrEqual(recheck(planFromFacts(s.facts)).hard.length);

    await writeCheckinPlan(resolved);
    expect(mockDb.setProgrammePlanFacts).toHaveBeenCalledTimes(1);
    const written = mockDb.setProgrammePlanFacts.mock.calls[0][1];
    expect(written.structure.checkin.weekId).toBe('w3');
    for (const call of mockDb.upsertPlannedMuscleVolume.mock.calls) {
      expect(call[0].source).toBe('coach');
      expect(call[0].mesocycleWeekId).not.toBe('w3');
    }

    // A retry reads the written facts: the ladder moves no further.
    arrange(s, { facts: written });
    const again = await resolveCheckinPlan({ userId: 'u1', signal: -2 });
    expect(again.structure.facts).toBeNull();
    expect(again.card).toEqual(written.structure.checkin.card);
  });

  test('a hold changes nothing and offers no Apply', async () => {
    arrange(s);
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 0 });
    expect(resolved.card.showApply).toBe(false);
    expect(resolved.structure.facts).toBeNull();
    expect(resolved.changes).toEqual([]);
  });

  test('a raise adds no fault; one with no room says so and offers no Apply', async () => {
    arrange(s);
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 3 });
    for (const name of WRITERS) expect(mockDb[name]).not.toHaveBeenCalled();
    if (resolved.structure.facts) {
      expect(recheck(planFromFacts(resolved.structure.facts)).hard.length).toBeLessThanOrEqual(recheck(planFromFacts(s.facts)).hard.length);
      expect(resolved.card.showApply).toBe(true);
    } else {
      expect(resolved.card.showApply).toBe(false);
      expect(resolved.card.unplacedLines.length).toBeGreaterThan(0);
      expect(resolved.card.unplacedLines[0]).toMatch(/^No room for more .+ this block\.$/);
    }
  });

  test('a plan the structure engine did not build takes the version 2 path (no structure block)', async () => {
    const plain = { ...s.facts };
    delete plain.structure;
    arrange(s, { facts: plain });
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: -2 });
    expect(resolved == null || resolved.structure === undefined).toBe(true);
  });
});
