/**
 * A failed import leaves nothing behind (adversarial audit 2026-08-26,
 * finding 6).
 *
 * TWO DEFECTS, both about work that escaped the import's own boundary.
 *
 * 1. CUSTOM EXERCISES WERE CREATED OUTSIDE THE TRANSACTION. runImport opened
 *    its transaction only after creating a row in `exercises` for every
 *    unmatched name. So an import that failed part-way rolled back every
 *    workout and every set, and kept the exercises: a library full of entries
 *    from an import the user was told had failed, referenced by nothing, and
 *    pushed to cloud on the next sync. The screen says "all or nothing"; the
 *    exercises are the part the user actually sees, so they have to be in it.
 *
 * 2. THE EXERCISES CACHE WAS NEVER INVALIDATED. database.js keeps the whole
 *    exercises table in memory and states, in a comment, that "every function
 *    that writes the exercises table calls _invalidateExercisesCache ... the
 *    cache is never stale". This file writes to that table and did not call it,
 *    which made the claim false here. That is worse than a stale library
 *    screen: syncExercises reads THROUGH getAllExercises and filters isCustom,
 *    so every exercise an import created stayed off the cloud for the rest of
 *    the session, and the workout_sets that referenced them synced without
 *    them.
 */

const mockRows = { exercises: [], workouts: [], workout_sets: [] };
let mockFailOnInsertNumber = 0;
let mockInserts = 0;
const mockInvalidate = jest.fn();

/** A database whose transaction really rolls back, so atomicity is testable. */
function makeDb() {
  let snapshot = null;
  return {
    runAsync: async (sql, params = []) => {
      mockInserts += 1;
      if (mockFailOnInsertNumber && mockInserts === mockFailOnInsertNumber) {
        throw new Error('SYNTHETIC: import failed part-way');
      }
      if (/INSERT (OR IGNORE )?INTO exercises/i.test(sql)) {
        mockRows.exercises.push({ id: params[0], name: params[1] });
      } else if (/INSERT INTO workouts/i.test(sql)) {
        mockRows.workouts.push({ id: params[0], user_id: params[1], started_at: params[2] });
      } else if (/INSERT INTO workout_sets/i.test(sql)) {
        mockRows.workout_sets.push({ id: params[0], user_id: params[1], workout_id: params[2] });
      }
      return {};
    },
    getFirstAsync: async (sql, params = []) => {
      if (/FROM workouts WHERE user_id = \? AND started_at = \?/.test(sql)) {
        return mockRows.workouts.find(
          (w) => w.user_id === params[0] && w.started_at === params[1],
        ) ?? null;
      }
      return null;
    },
    getAllAsync: async () => [],
    _begin() { snapshot = JSON.parse(JSON.stringify(mockRows)); },
    _rollback() { Object.assign(mockRows, snapshot); },
  };
}

let mockDb;

jest.mock('../database', () => ({
  db: async () => mockDb,
  runInTransaction: async (d, task) => {
    d._begin();
    try {
      return await task();
    } catch (e) {
      d._rollback();
      throw e;
    }
  },
  _invalidateExercisesCache: (...a) => mockInvalidate(...a),
}));

jest.mock('../uuid', () => {
  let n = 0;
  return { generateUUID: () => `id-${++n}` };
});

const { runImport } = require('../importExternal');

const USER = 'user-1';

/** One workout, two sets, both on an exercise name the library does not have. */
function fixture() {
  return {
    parsed: {
      exerciseNames: ['Zercher Squat'],
      workouts: [{
        startedAt: 1756300000000,
        endedAt: 1756303600000,
        title: 'Legs',
        sets: [
          { exerciseName: 'Zercher Squat', reps: 5, weightKg: 100 },
          { exerciseName: 'Zercher Squat', reps: 5, weightKg: 105 },
        ],
      }],
    },
    analysis: { unmappedNames: ['Zercher Squat'], unmappedCount: 1, _mappedIndex: new Map() },
  };
}

beforeEach(() => {
  mockRows.exercises = [];
  mockRows.workouts = [];
  mockRows.workout_sets = [];
  mockInserts = 0;
  mockFailOnInsertNumber = 0;
  mockInvalidate.mockClear();
  mockDb = makeDb();
});

describe('a successful import writes everything', () => {
  test('the workout, its sets and the custom exercise all land', async () => {
    const { parsed, analysis } = fixture();
    const result = await runImport(USER, parsed, analysis);
    expect(result).toMatchObject({ workouts: 1, sets: 2, exercisesCreated: 1, skipped: 0 });
    expect(mockRows.exercises).toHaveLength(1);
    expect(mockRows.workouts).toHaveLength(1);
    expect(mockRows.workout_sets).toHaveLength(2);
  });

  test('everything is written against the importing user', async () => {
    const { parsed, analysis } = fixture();
    await runImport(USER, parsed, analysis);
    expect(mockRows.workouts.every((w) => w.user_id === USER)).toBe(true);
    expect(mockRows.workout_sets.every((s) => s.user_id === USER)).toBe(true);
  });

  test('a duplicate workout in the file is skipped, not written twice', async () => {
    const { parsed, analysis } = fixture();
    parsed.workouts.push({ ...parsed.workouts[0] });   // same startedAt
    const result = await runImport(USER, parsed, analysis);
    expect(result.workouts).toBe(1);
    expect(result.skipped).toBe(1);
    expect(mockRows.workouts).toHaveLength(1);
  });
});

describe('a failed import leaves the library exactly as it was', () => {
  test('a failure while writing sets rolls the custom exercise back too', async () => {
    // The defect: exercises were created before the transaction opened, so
    // this rollback used to keep them.
    const { parsed, analysis } = fixture();
    mockFailOnInsertNumber = 3;    // exercise, workout, then fail on the first set
    await expect(runImport(USER, parsed, analysis)).rejects.toThrow('SYNTHETIC');
    expect(mockRows.exercises).toEqual([]);
    expect(mockRows.workouts).toEqual([]);
    expect(mockRows.workout_sets).toEqual([]);
  });

  test('a failure on the very first workout also leaves no exercises', async () => {
    const { parsed, analysis } = fixture();
    mockFailOnInsertNumber = 2;    // exercise created, then the workout fails
    await expect(runImport(USER, parsed, analysis)).rejects.toThrow('SYNTHETIC');
    expect(mockRows.exercises).toEqual([]);
  });

  test('pre-existing library rows survive a failed import', async () => {
    // Rolling back must undo the import, not the user's library.
    mockRows.exercises.push({ id: 'existing', name: 'Back Squat' });
    const { parsed, analysis } = fixture();
    mockFailOnInsertNumber = 3;
    await expect(runImport(USER, parsed, analysis)).rejects.toThrow('SYNTHETIC');
    expect(mockRows.exercises).toEqual([{ id: 'existing', name: 'Back Squat' }]);
  });

  test('the error still reaches the caller, so the screen can report it', async () => {
    const { parsed, analysis } = fixture();
    mockFailOnInsertNumber = 2;
    await expect(runImport(USER, parsed, analysis)).rejects.toThrow(/SYNTHETIC/);
  });
});

describe('the exercises cache is invalidated, so an import is not invisible', () => {
  test('after a successful import', async () => {
    // Not cosmetic: syncExercises reads through getAllExercises and filters
    // isCustom, so a stale cache kept imported exercises off the cloud for the
    // rest of the session.
    const { parsed, analysis } = fixture();
    await runImport(USER, parsed, analysis);
    expect(mockInvalidate).toHaveBeenCalled();
  });

  test('after a failed one too', async () => {
    // A read taken inside the rolled-back transaction could have filled the
    // cache from data that no longer exists.
    const { parsed, analysis } = fixture();
    mockFailOnInsertNumber = 3;
    await expect(runImport(USER, parsed, analysis)).rejects.toThrow();
    expect(mockInvalidate).toHaveBeenCalled();
  });

  test('an import with nothing to do is a clean no-op', async () => {
    await expect(runImport(USER, null, null)).resolves.toEqual({
      workouts: 0, sets: 0, exercisesCreated: 0, skipped: 0,
    });
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});
