/**
 * repeatSession.test.js - what Repeat on a finished session starts again.
 *
 * D231 (app layout rework, batch 2): Repeat moved from Today's last-session row
 * to the newest card in Train's Recent sessions, and the assembly moved out of
 * HomeScreen.js into src/lib/repeatSession.js. These are the D218 (founder order
 * 2026-10-03, audit F-2, P7) tests that used to drive it through the mounted
 * Today screen (HomeScreen.d218Reporting.test.js), now against the module, with
 * the same fixtures and the same expectations:
 *
 *  - a session with a routine repeats the FULL routine, with its superset and
 *    circuit stamps;
 *  - a session with no routine keeps the exercises of its own sets, in the order
 *    first logged, each with the previous session's working-set count (a warm-up
 *    is not one), and a minted slot id (R13-1);
 *  - an exercise whose id this device cannot find is kept through its name
 *    snapshot when that matches; one still missing is left out and said so,
 *    calmly and exactly; a read that FAILED is "could not be loaded", never "not
 *    on this device" (review of D218, NIT 11).
 */
const mockDb = {
  getRoutineExercisesWithDetails: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getExerciseById: jest.fn(),
  getExerciseLookup: jest.fn(),
};
let mockUidSeq = 0;
jest.mock('../database', () => ({
  getRoutineExercisesWithDetails: (...a) => mockDb.getRoutineExercisesWithDetails(...a),
  getWorkoutSetsForWorkout: (...a) => mockDb.getWorkoutSetsForWorkout(...a),
  getExerciseById: (...a) => mockDb.getExerciseById(...a),
  getExerciseLookup: (...a) => mockDb.getExerciseLookup(...a),
  uid: () => { mockUidSeq += 1; return `slot-${mockUidSeq}`; },
}));

const { prepareRepeatSession } = require('../repeatSession');
const { buildExerciseLookup } = require('../exercise/lookup');

const BENCH = { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: [], exerciseType: 'weight_reps', loadSemantics: 'total' };
const DB_CURL = { id: 'ex-db-curl', name: 'Dumbbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [], exerciseType: 'weight_reps', loadSemantics: 'per_hand' };
const LOOKUP = buildExerciseLookup([BENCH, DB_CURL]);

let seq = 0;
function setRow(workoutId, exerciseId, weight, reps, extra = {}) {
  seq += 1;
  return { id: `s-${seq}`, workoutId, exerciseId, weight, actualReps: reps, setType: 'straight', createdAt: Date.now() - 3600000, ...extra };
}
const warmUp = (workoutId, exerciseId) => setRow(workoutId, exerciseId, 40, 10, { setType: 'warmup' });
const named = (workoutId, exerciseId, exerciseName, weight, reps) => setRow(workoutId, exerciseId, weight, reps, { exerciseName });

const NO_ROUTINE = { id: 'w-last', routineId: null };
const ONE = 'One exercise from that session is not on this device, so it was left out.';
const TWO = '2 exercises from that session are not on this device, so they were left out.';
const ONE_UNREAD = 'One exercise from that session could not be loaded, so it was left out.';
const TWO_UNREAD = '2 exercises from that session could not be loaded, so they were left out.';
const byId = async (id) => ({ 'ex-bench': BENCH }[id] ?? null);

beforeEach(() => {
  seq = 0;
  mockUidSeq = 0;
  mockDb.getRoutineExercisesWithDetails.mockReset();
  mockDb.getWorkoutSetsForWorkout.mockReset().mockResolvedValue([]);
  mockDb.getExerciseById.mockReset().mockImplementation(byId);
  mockDb.getExerciseLookup.mockReset().mockResolvedValue(LOOKUP);
});

// Bench resolves by id; the curl's id is unknown here but its snapshot name matches the library; the third is nowhere.
const SETS_ONE_MISSING = (id) => [
  warmUp(id, 'ex-bench'),
  setRow(id, 'ex-bench', 100, 8),
  setRow(id, 'ex-bench', 100, 8),
  named(id, 'id-from-another-device', 'Dumbbell Curl', 30, 10),
  named(id, 'id-from-another-device', 'Dumbbell Curl', 30, 10),
  named(id, 'id-gone', 'Mystery Move', 20, 12),
];

describe('a session with a routine repeats the full routine', () => {
  test('every routine exercise, with its superset and circuit stamps, and no sets yet', async () => {
    mockDb.getRoutineExercisesWithDetails.mockResolvedValue([
      { exercise: BENCH, routineExercise: { id: 're1', supersetGroupId: 'ss1', groupKind: null, roundRestSeconds: null } },
      { exercise: DB_CURL, routineExercise: { id: 're2', supersetGroupId: null, groupKind: 'circuit', roundRestSeconds: 45 } },
    ]);
    const out = await prepareRepeatSession({ id: 'w-last', routineId: 'r1' });
    expect(mockDb.getRoutineExercisesWithDetails).toHaveBeenCalledWith('r1');
    expect(mockDb.getWorkoutSetsForWorkout).not.toHaveBeenCalled();
    expect(out.routineId).toBe('r1');
    expect(out.leftOutNote).toBeNull();
    expect(out.initialExercises).toHaveLength(2);
    expect(out.initialExercises[0]).toMatchObject({ exercise: BENCH, supersetGroupId: 'ss1', groupKind: null, roundRestSeconds: null, sets: [] });
    expect(out.initialExercises[1]).toMatchObject({ exercise: DB_CURL, supersetGroupId: null, groupKind: 'circuit', roundRestSeconds: 45, sets: [] });
  });

  test('a snake_case routine id (a raw row) is read the same way', async () => {
    mockDb.getRoutineExercisesWithDetails.mockResolvedValue([]);
    const out = await prepareRepeatSession({ id: 'w-last', routine_id: 'r9' });
    expect(out.routineId).toBe('r9');
  });

  test('a routine that cannot be read throws, for the caller to say calmly', async () => {
    mockDb.getRoutineExercisesWithDetails.mockRejectedValue(new Error('unreadable'));
    await expect(prepareRepeatSession({ id: 'w-last', routineId: 'r1' })).rejects.toThrow('unreadable');
  });
});

describe('D218 (F-2, P7): a session with no routine keeps what it can find and says what it cannot', () => {
  test('an exercise whose id this device lacks is kept through its name snapshot; the one still missing is dropped with the exact note', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue(SETS_ONE_MISSING('w-last'));
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.leftOutNote).toBe(ONE);
    expect(out.initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench', 'ex-db-curl']);
    // The target line stays honest: the previous session's working sets per logged exercise (a warm-up is not one).
    expect(out.initialExercises.map((e) => e.routineExercise.recommendedSets)).toEqual([2, 2]);
    expect(out.initialExercises.every((e) => e.sets.length === 0 && typeof e.routineExercise.id === 'string')).toBe(true);
    expect(out.routineId).toBeNull();
  });

  test('R13-1: every row carries a minted slot id, none is keyless', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue(SETS_ONE_MISSING('w-last'));
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.initialExercises.map((e) => e.routineExercise.id)).toEqual(['slot-1', 'slot-2']);
  });

  test('an all-warm-up previous session falls to 3 sets, not the warm-up count', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue([warmUp('w-last', 'ex-bench'), warmUp('w-last', 'ex-bench')]);
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.initialExercises.map((e) => e.routineExercise.recommendedSets)).toEqual([3]);
  });

  test('two exercises still missing: the plural copy names the count', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue([
      setRow('w-last', 'ex-bench', 100, 8),
      named('w-last', 'id-gone-1', 'Mystery Move', 20, 12),
      named('w-last', 'id-gone-2', 'Another Mystery', 20, 12),
    ]);
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.leftOutNote).toBe(TWO);
    expect(out.initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench']);
  });

  test('nothing missing: no note, and the repeat carries every exercise', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue([setRow('w-last', 'ex-bench', 100, 8), setRow('w-last', 'ex-db-curl', 30, 10)]);
    mockDb.getExerciseById.mockImplementation(async (id) => ({ 'ex-bench': BENCH, 'ex-db-curl': DB_CURL }[id] ?? null));
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.leftOutNote).toBeNull();
    expect(out.initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench', 'ex-db-curl']);
  });

  test('two logged ids that are one exercise are repeated once', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue([
      setRow('w-last', 'ex-bench', 100, 8),
      named('w-last', 'retired-bench-id', 'Bench Press', 100, 8),
    ]);
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench']);
    expect(out.leftOutNote).toBeNull();
  });

  test('a read that fails for one id is treated as not found: the snapshot is tried, then the note if it still misses', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue([
      setRow('w-last', 'ex-bench', 100, 8),
      named('w-last', 'id-explodes', 'Dumbbell Curl', 30, 10),
    ]);
    mockDb.getExerciseById.mockImplementation(async (id) => {
      if (id === 'id-explodes') throw new Error('row unreadable');
      return id === 'ex-bench' ? BENCH : null;
    });
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.leftOutNote).toBeNull();
    expect(out.initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench', 'ex-db-curl']);
  });

  test('a read that fails and a snapshot that still misses: "could not be loaded", never "not on this device"', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue([
      setRow('w-last', 'ex-bench', 100, 8),
      named('w-last', 'id-explodes', 'Mystery Move', 30, 10),
      named('w-last', 'id-gone', 'Another Mystery', 20, 12),
    ]);
    mockDb.getExerciseById.mockImplementation(async (id) => {
      if (id === 'id-explodes') throw new Error('row unreadable');
      return id === 'ex-bench' ? BENCH : null;
    });
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.leftOutNote).toBe(`${ONE} ${ONE_UNREAD}`);
    expect(out.initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench']);
  });

  test('with the lookup unreadable the repeat proceeds with the exercises found by id and says how many could not be loaded', async () => {
    mockDb.getWorkoutSetsForWorkout.mockResolvedValue(SETS_ONE_MISSING('w-last'));
    mockDb.getExerciseLookup.mockRejectedValue(new Error('exercises unreadable'));
    const out = await prepareRepeatSession(NO_ROUTINE);
    expect(out.initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench']);
    // The curl is on this device (its snapshot names it); the read failed, so
    // neither is said to be missing.
    expect(out.leftOutNote).toBe(TWO_UNREAD);
    expect(out.leftOutNote).not.toBe(TWO);
  });

  test('a session whose sets cannot be read throws, for the caller to say calmly', async () => {
    mockDb.getWorkoutSetsForWorkout.mockRejectedValue(new Error('sets unreadable'));
    await expect(prepareRepeatSession(NO_ROUTINE)).rejects.toThrow('sets unreadable');
  });
});
