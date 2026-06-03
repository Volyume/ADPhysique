/**
 * HP-9: getAllExercises caches the ~400-row exercise library in memory and
 * serves it until an exercise write invalidates the cache. These lock the
 * two properties that matter: the cache is actually used (repeat reads do
 * not re-query), and it is never stale (a write forces the next read to
 * re-query, so a created / edited / deleted / synced exercise shows up).
 */

let exercisesQueryCount = 0;
const exerciseRows = [{ id: 'e1', name: 'Bench Press', is_custom: 0 }];

jest.mock('expo-sqlite', () => {
  const makeDb = () => ({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ changes: 0, lastInsertRowId: 0 })),
    getAllAsync: jest.fn((sql) => {
      if (typeof sql === 'string' && /SELECT \* FROM exercises ORDER BY name/.test(sql)) {
        exercisesQueryCount += 1;
        return Promise.resolve(exerciseRows);
      }
      return Promise.resolve([]);
    }),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    withTransactionAsync: jest.fn(async (fn) => { await fn(); }),
    isInTransactionSync: jest.fn(() => false),
    closeAsync: jest.fn(() => Promise.resolve()),
  });
  const shared = makeDb();
  return {
    openDatabaseAsync: jest.fn(() => Promise.resolve(shared)),
    openDatabaseSync: jest.fn(() => shared),
    deleteDatabaseAsync: jest.fn(() => Promise.resolve()),
  };
});

const db = require('../database');

beforeEach(() => {
  exercisesQueryCount = 0;
  db._invalidateExercisesCache();
});

test('a repeat read is served from the cache, not re-queried', async () => {
  await db.getAllExercises();
  await db.getAllExercises();
  await db.getAllExercises();
  expect(exercisesQueryCount).toBe(1);
});

test('explicit invalidation forces the next read to re-query', async () => {
  await db.getAllExercises();
  db._invalidateExercisesCache();
  await db.getAllExercises();
  expect(exercisesQueryCount).toBe(2);
});

test('deleteExercise invalidates the cache so the next read is fresh', async () => {
  await db.getAllExercises();
  await db.deleteExercise('e1');
  await db.getAllExercises();
  expect(exercisesQueryCount).toBe(2);
});

test('insertExerciseWithId invalidates the cache', async () => {
  await db.getAllExercises();
  await db.insertExerciseWithId('e2', { name: 'Squat', isCustom: true });
  await db.getAllExercises();
  expect(exercisesQueryCount).toBe(2);
});
