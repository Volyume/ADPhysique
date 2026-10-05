/**
 * checkinPlan.test.js -- D219 lane A3: the I/O around the pure check-in
 * placement (design 4.10; register D219).
 *
 * What this pins, and why:
 *   1. Nothing changes without Apply (D96, design 11 test 10): resolving a
 *      check-in reads and writes nothing, whatever the signal.
 *   2. A plan the new planner did not build gets null, so the screen runs
 *      today's path untouched: no plan facts, another version, no next week,
 *      and next week being the recovery week all give null.
 *   3. On Apply, the writes are exactly: the new exercise row (an ordinary
 *      routine exercise, 2 sets, last in its session, with a valid selection
 *      reason), the plan's facts (the new slot's muscle, kind and credits,
 *      and a raised role), and the later weeks' rows with source 'coach'.
 *      Next week's rows are left to the screen's atomic apply, and carry only
 *      the columns that apply writes.
 *   4. An exercise the app adds on its own is never one the person has said no
 *      to: when their exclusions or capability limits could not be read,
 *      nothing opens and the sets that do not fit are reported.
 *   5. A retry after a partial failure does not add the exercise twice.
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
};
jest.mock('../database', () => mockDb);
jest.mock('../exercise/intent', () => ({ loadExerciseIntentState: jest.fn() }));
jest.mock('../plan/catalogue', () => ({ resolveCatalogue: jest.fn() }));
jest.mock('../errorLog', () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));

const { loadExerciseIntentState } = require('../exercise/intent');
const { resolveCatalogue } = require('../plan/catalogue');
const { resolveCheckinPlan, writeCheckinPlan, checkinWithheld } = require('../checkinPlan');
const { SELECTION_REASON } = require('../planEngine');

const WEEKS = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5'].map((id, i) => ({ id, week_index: i, is_deload: i === 5 ? 1 : 0 }));
const PATHS = { chest: [8, 10, 12, 14, 16, 8], triceps: [4, 6, 6, 6, 6, 3] };

function plannedRows() {
  const rows = [];
  for (const [muscle, list] of Object.entries(PATHS)) {
    list.forEach((planned, i) => rows.push({
      mesocycle_week_id: `w${i}`, week_index: i, muscle, planned_sets: planned, mev: 4, mav: 14, mrv: 24, source: 'template',
    }));
  }
  return rows;
}

const ex = (id, name, primaryMuscle, compoundIsolation = 'isolation', equipmentCategory = 'cable') => ({
  id, name, primaryMuscle, secondaryMuscles: [], compoundIsolation, equipmentCategory,
});
const rowOf = (id, exercise, sets, order) => ({
  routineExercise: { id, recommendedSets: sets, orderInRoutine: order },
  exercise,
});

const ROUTINE_ROWS = {
  r0: [
    rowOf('a', ex('ex-bench', 'Barbell Bench Press', 'chest', 'compound', 'barbell'), 3, 0),
    rowOf('b', ex('ex-incline', 'Incline Dumbbell Press', 'chest', 'compound', 'dumbbell'), 3, 1),
    rowOf('c', ex('ex-pushdown', 'Triceps Pushdown', 'triceps'), 3, 2),
  ],
  r1: [
    rowOf('d', ex('ex-flat', 'Flat Dumbbell Press', 'chest', 'compound', 'dumbbell'), 4, 0),
    rowOf('e', ex('ex-fly', 'Pec Deck (Machine Fly)', 'chest', 'isolation', 'machine'), 2, 1),
    rowOf('f', ex('ex-overhead', 'Overhead Triceps Extension', 'triceps'), 3, 2),
  ],
};
const FACTS = {
  version: 2,
  roles: { chest: 'standard', triceps: 'standard' },
  exposureShares: { chest: { r0: 0.5, r1: 0.5 } },
  sessionCaps: {},
  gapRanks: { r0: 1, r1: 0 },
  slots: {
    r0: {
      'ex-bench': { muscle: 'chest', kind: 'heavy_compound', credits: {} },
      'ex-incline': { muscle: 'chest', kind: 'mod_compound', credits: {} },
      'ex-pushdown': { muscle: 'triceps', kind: 'isolation', credits: {} },
    },
    r1: {
      'ex-flat': { muscle: 'chest', kind: 'mod_compound', credits: {} },
      'ex-fly': { muscle: 'chest', kind: 'isolation', credits: {} },
      'ex-overhead': { muscle: 'triceps', kind: 'isolation', credits: {} },
    },
  },
};
const CATALOGUE = {
  triceps: [
    { name: 'Triceps Pushdown', exerciseId: 'ex-pushdown', role: 'pushdown', rank: 1, kind: 'isolation', credits: {} },
    { name: 'Overhead Triceps Extension', exerciseId: 'ex-overhead', role: 'overhead', rank: 2, kind: 'isolation', credits: {} },
    { name: 'Skull Crusher', exerciseId: 'ex-skull', role: 'skull', rank: 3, kind: 'isolation', credits: {} },
  ],
};
const LIBRARY = [
  ex('ex-skull', 'Skull Crusher', 'triceps'),
  ...Object.values(ROUTINE_ROWS).flat().map((r) => r.exercise),
];

function arrange({ facts = FACTS, weeks = WEEKS, current = 'w2', intent = { unavailable: false, capability: null } } = {}) {
  for (const fn of Object.values(mockDb)) fn.mockReset();
  loadExerciseIntentState.mockReset();
  resolveCatalogue.mockReset();
  mockDb.getActivePlan.mockResolvedValue({ id: 'p1', name: 'My plan' });
  mockDb.getProgrammePlanFacts.mockResolvedValue(facts);
  mockDb.getCurrentMesocycleWeek.mockResolvedValue({ id: current, mesocycleId: 'm1', weekIndex: weeks.find((w) => w.id === current).week_index, awaitingDecision: false });
  mockDb.getMesocycleWeeks.mockResolvedValue(weeks);
  mockDb.getPlannedMuscleVolumeForBlock.mockResolvedValue(plannedRows());
  mockDb.getRoutinesForPlan.mockResolvedValue([{ id: 'r0', name: 'Upper A' }, { id: 'r1', name: 'Upper B' }]);
  mockDb.getRoutineExercisesWithDetails.mockImplementation(async (id) => ROUTINE_ROWS[id]);
  mockDb.getAllExercises.mockResolvedValue(LIBRARY);
  mockDb.getActiveBlock.mockResolvedValue({ id: 'm1' });
  mockDb.getRecentlyUsedExerciseIds.mockResolvedValue([]);
  mockDb.addExerciseToRoutine.mockResolvedValue({ id: 'new-row' });
  mockDb.setProgrammePlanFacts.mockResolvedValue(undefined);
  mockDb.upsertPlannedMuscleVolume.mockResolvedValue(undefined);
  loadExerciseIntentState.mockResolvedValue(intent);
  resolveCatalogue.mockReturnValue(CATALOGUE);
}

const WRITERS = ['addExerciseToRoutine', 'upsertPlannedMuscleVolume', 'setProgrammePlanFacts'];
const expectNoWrites = () => { for (const name of WRITERS) expect(mockDb[name]).not.toHaveBeenCalled(); };

describe('a preview writes nothing (D96)', () => {
  test.each([[3], [2], [1], [0], [-2]])('signal %s: reads only', async (signal) => {
    arrange();
    await resolveCheckinPlan({ userId: 'u1', signal });
    expectNoWrites();
  });

  test('a withheld increase: reads only', async () => {
    arrange();
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 0, withheld: true });
    expect(resolved.card.heading).toBe('Next week stays at this week\'s level');
    expectNoWrites();
  });
});

describe('only a plan the new planner built gets a check-in plan', () => {
  test.each([
    ['no plan facts', () => arrange({ facts: null })],
    ['another facts version', () => arrange({ facts: { ...FACTS, version: 1 } })],
  ])('%s: null, and nothing is read past the facts', async (_name, setup) => {
    setup();
    expect(await resolveCheckinPlan({ userId: 'u1', signal: 3 })).toBeNull();
    expect(mockDb.getRoutinesForPlan).not.toHaveBeenCalled();
    expectNoWrites();
  });

  test('no active plan: null', async () => {
    arrange();
    mockDb.getActivePlan.mockResolvedValue(null);
    expect(await resolveCheckinPlan({ userId: 'u1', signal: 3 })).toBeNull();
  });

  test('the last week of the block (no next week): null', async () => {
    arrange({ current: 'w5' });
    expect(await resolveCheckinPlan({ userId: 'u1', signal: 3 })).toBeNull();
  });

  test('next week is the recovery week: null, the screen\'s own words stand', async () => {
    arrange({ current: 'w4' });
    expect(await resolveCheckinPlan({ userId: 'u1', signal: 3 })).toBeNull();
  });

  test('a finished block awaiting a decision: null', async () => {
    arrange();
    mockDb.getCurrentMesocycleWeek.mockResolvedValue({ id: 'w2', mesocycleId: 'm1', weekIndex: 2, awaitingDecision: true });
    expect(await resolveCheckinPlan({ userId: 'u1', signal: 3 })).toBeNull();
  });
});

describe('what a +3 resolves to', () => {
  test('the card names each exercise set by set and the exercise that joins', async () => {
    arrange();
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 3, profile: { equipment: 'full_gym' } });
    expect(resolved.card.showApply).toBe(true);
    expect(resolved.card.lines.join(' ')).toMatch(/Chest, 3 more sets next week: Barbell Bench Press 3 to 4/);
    expect(resolved.card.lines.join(' ')).toMatch(/Skull Crusher joins with 3 sets/);
    expect(resolveCatalogue).toHaveBeenCalledWith(expect.objectContaining({ profile: 'full_gym' }));
  });

  test('the rows come through computeVolumeApply: next week\'s are bare, later weeks carry their week', async () => {
    arrange();
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 3 });
    expect(resolved.nextWeekId).toBe('w3');
    for (const c of resolved.nextWeekChanges) {
      expect(Object.keys(c).sort()).toEqual(['mav', 'mev', 'mrv', 'muscle', 'plannedSets']);
    }
    expect(resolved.nextWeekChanges.find((c) => c.muscle === 'chest').plannedSets).toBe(15);
    expect(resolved.laterChanges.every((c) => c.mesocycleWeekId !== 'w3' && typeof c.weekIndex === 'number')).toBe(true);
    expect(resolved.changes).toEqual(resolved.plan.changes);
  });

  test('a hold and a pull-back never read the catalogue', async () => {
    arrange();
    await resolveCheckinPlan({ userId: 'u1', signal: 0 });
    await resolveCheckinPlan({ userId: 'u1', signal: -2 });
    expect(resolveCatalogue).not.toHaveBeenCalled();
  });
});

describe('on Apply', () => {
  test('the new exercise row, the plan facts and the later weeks are written', async () => {
    arrange();
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 3 });
    const out = await writeCheckinPlan(resolved);

    // an ordinary routine exercise: last in its session, 2 sets, a valid reason
    expect(mockDb.addExerciseToRoutine).toHaveBeenCalledTimes(1);
    const args = mockDb.addExerciseToRoutine.mock.calls[0];
    expect(args[0]).toBe('r1'); // the session with the longest gap after it
    expect(args[1]).toBe('ex-skull');
    expect(args[2]).toBe(3); // after the session's three exercises (orders 0, 1, 2)
    expect(args[6]).toBe(2);
    expect(args[10]).toBe(false); // sync is scheduled once, by the facts write
    expect(args[11]).toBe(SELECTION_REASON.VOLUME_FILL);
    expect(out.added.map((a) => a.routineExerciseId)).toEqual(['new-row']);

    // the plan's facts: the new slot's own model, the other facts kept
    expect(mockDb.setProgrammePlanFacts).toHaveBeenCalledTimes(1);
    const [programmeId, facts] = mockDb.setProgrammePlanFacts.mock.calls[0];
    expect(programmeId).toBe('p1');
    expect(facts.slots.r1['ex-skull']).toEqual({ muscle: 'triceps', kind: 'isolation', credits: {} });
    expect(facts.slots.r1['ex-overhead']).toBeDefined();
    expect(facts.exposureShares).toEqual(FACTS.exposureShares);
    expect(facts.version).toBe(2);

    // later weeks only, source 'coach'; next week is the screen's atomic apply
    expect(mockDb.upsertPlannedMuscleVolume).toHaveBeenCalledTimes(resolved.laterChanges.length);
    for (const call of mockDb.upsertPlannedMuscleVolume.mock.calls) {
      expect(call[0].source).toBe('coach');
      expect(call[0].mesocycleWeekId).not.toBe('w3');
      expect(Number.isInteger(call[0].plannedSets)).toBe(true);
    }
  });

  test('a hold writes later weeks only: no exercise and no facts', async () => {
    arrange();
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 0 });
    await writeCheckinPlan(resolved);
    expect(mockDb.addExerciseToRoutine).not.toHaveBeenCalled();
    expect(mockDb.setProgrammePlanFacts).not.toHaveBeenCalled();
    expect(mockDb.upsertPlannedMuscleVolume).toHaveBeenCalledTimes(resolved.laterChanges.length);
  });

  test('a retry after a partial failure does not add the exercise twice', async () => {
    arrange();
    const first = await resolveCheckinPlan({ userId: 'u1', signal: 3 });
    expect(first.plan.opened.length).toBe(1);
    // The exercise row was written before the failure: the session now has it.
    ROUTINE_ROWS.r1.push(rowOf('new-row', ex('ex-skull', 'Skull Crusher', 'triceps'), 2, 3));
    try {
      const second = await resolveCheckinPlan({ userId: 'u1', signal: 3 });
      expect(second.plan.opened).toEqual([]);
    } finally {
      ROUTINE_ROWS.r1.pop();
    }
  });
});

describe('an exercise the app adds is never one the person has said no to', () => {
  test.each([
    ['their exclusions could not be read', { unavailable: true, capability: null }],
    ['their capability limits could not be read', { unavailable: false, capability: { unavailable: true } }],
  ])('%s: nothing opens and the sets that do not fit are reported', async (_name, intent) => {
    arrange({ intent });
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 3 });
    expect(resolved.plan.opened).toEqual([]);
    expect(resolveCatalogue).not.toHaveBeenCalled();
    expect(resolved.card.unplacedLines.length).toBeGreaterThan(0);
    await writeCheckinPlan(resolved);
    expect(mockDb.addExerciseToRoutine).not.toHaveBeenCalled();
  });

  test('the catalogue is resolved from the library after their exclusions are applied', async () => {
    arrange();
    await resolveCheckinPlan({ userId: 'u1', signal: 3, profile: { equipment: 'dumbbells_only' } });
    expect(resolveCatalogue).toHaveBeenCalledTimes(1);
    const arg = resolveCatalogue.mock.calls[0][0];
    expect(arg.profile).toBe('dumbbells_only');
    expect(Array.isArray(arg.library)).toBe(true);
  });
});

describe('a muscle held by a capability limit or a soreness answer', () => {
  test('a function for the holds is read only for an increase on a plan the new planner built', async () => {
    const read = jest.fn(async () => new Set(['triceps']));
    arrange({ facts: null });
    expect(await resolveCheckinPlan({ userId: 'u1', signal: 3, holdMuscles: read })).toBeNull();
    arrange();
    await resolveCheckinPlan({ userId: 'u1', signal: 0, holdMuscles: read });
    await resolveCheckinPlan({ userId: 'u1', signal: -2, holdMuscles: read });
    expect(read).not.toHaveBeenCalled();
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 3, holdMuscles: read });
    expect(read).toHaveBeenCalledTimes(1);
    // the held muscle is not raised, and the card says so
    expect(resolved.plan.notRaised).toEqual(expect.arrayContaining([{ muscle: 'triceps', why: 'held' }]));
    expect(resolved.card.notRaisedLine).toMatch(/Triceps \(held by an Injuries & limitations entry or a soreness answer\)/);
    expect(resolved.changes.some((c) => c.muscle === 'triceps')).toBe(false);
  });

  test('a read that came back null counts as none at preview time', async () => {
    arrange();
    const resolved = await resolveCheckinPlan({ userId: 'u1', signal: 3, holdMuscles: async () => null });
    expect(resolved.plan.notRaised.filter((n) => n.why === 'held')).toEqual([]);
  });
});

describe('the withheld flag', () => {
  test('a coordination hold, the outcome memory or a safety note withholds', () => {
    expect(checkinWithheld({ coordination: { volumeHeld: 'sessions_missed' } })).toBe(true);
    expect(checkinWithheld({ volumeMemoryHeld: 'last_volume_increase_made_things_worse' })).toBe(true);
    expect(checkinWithheld({ safetyHold: true })).toBe(true);
    expect(checkinWithheld({ coordination: { volumeHeld: null }, volumeMemoryHeld: null, safetyHold: false })).toBe(false);
    expect(checkinWithheld(null)).toBe(false);
  });
});

test('the selection reason literal is the planner\'s own constant', () => {
  expect(SELECTION_REASON.VOLUME_FILL).toBe('volume_fill');
});
