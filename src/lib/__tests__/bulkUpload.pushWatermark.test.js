/**
 * LB-5 contract: bulkUploadLocalData must not re-push the entire workout
 * history on every syncAll cycle (foreground / reconnect / 15-min timer).
 *
 * A completed workout is immutable (no path re-opens it; updated_at is
 * stamped at completion and is >= every set's updated_at), so once a
 * workout+sets has pushed cleanly it never needs pushing again. These
 * tests drive the real sync.js with supabase + database mocked at the
 * boundary and an in-memory AsyncStorage so the push watermark is
 * observable.
 *
 * The failure-safety case is the important one: a rejected push must
 * leave the watermark where it was, so the failed rows retry next cycle
 * and the sign-out push-first safety still sees them as un-pushed. A
 * watermark that advanced on failure would silently strand local data
 * and lose it at sign-out.
 */

const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = String(v); return Promise.resolve(); }),
  removeItem: jest.fn((k) => { delete mockStore[k]; return Promise.resolve(); }),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../database');

const { getSupabaseClient } = require('../supabase');
const db = require('../database');
const { bulkUploadLocalData } = require('../sync');
const { PUSH_WM_PREFIX } = require('../sync/watermark');

const WM_KEY = `${PUSH_WM_PREFIX}cloud-uid_workouts`;

function makeChain(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => result,
    then: (resolve) => resolve(result),
  };
  return chain;
}

// Captures the ids passed to from('workouts').upsert so a test can
// assert exactly which workouts were sent this cycle.
function makeClient(upsertError, capturedWorkoutIds) {
  const writeResult = { error: upsertError, data: [] };
  const readResult = { data: [], error: null };
  return {
    from: jest.fn((table) => ({
      upsert: jest.fn((payload) => {
        if (table === 'workouts') {
          const rows = Array.isArray(payload) ? payload : [payload];
          for (const r of rows) capturedWorkoutIds.push(r.id);
        }
        return makeChain(writeResult);
      }),
      insert: jest.fn(() => makeChain(writeResult)),
      update: jest.fn(() => makeChain(writeResult)),
      delete: jest.fn(() => makeChain(writeResult)),
      select: jest.fn(() => makeChain(readResult)),
    })),
    rpc: jest.fn(async () => ({ data: null, error: upsertError })),
  };
}

function makeWorkoutSchemaDriftClient(capturedWorkoutRows) {
  const readResult = { data: [], error: null };
  let workoutAttempts = 0;
  return {
    from: jest.fn((table) => ({
      upsert: jest.fn((payload) => {
        if (table === 'workouts') {
          workoutAttempts += 1;
          capturedWorkoutRows.push({ ...payload });
          if (workoutAttempts === 1) {
            return makeChain({
              data: null,
              error: {
                code: 'PGRST204',
                message: "Could not find the 'energy_score' column of 'workouts' in the schema cache",
              },
            });
          }
        }
        return makeChain({ error: null, data: [] });
      }),
      insert: jest.fn(() => makeChain({ error: null, data: [] })),
      update: jest.fn(() => makeChain({ error: null, data: [] })),
      delete: jest.fn(() => makeChain({ error: null, data: [] })),
      select: jest.fn(() => makeChain(readResult)),
    })),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  };
}

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  jest.clearAllMocks();
  // Every other db getter is a benign empty array so only the workouts
  // loop issues upserts.
  for (const k of Object.keys(db)) {
    if (typeof db[k] === 'function' && typeof db[k].mockResolvedValue === 'function') {
      db[k].mockResolvedValue([]);
    }
  }
  db.getWorkoutSetsForWorkout.mockResolvedValue([]);
});

test('cold cursor pushes all completed workouts and advances the watermark to the newest', async () => {
  db.getAllWorkouts.mockResolvedValue([
    { id: 'w1', isCompleted: true, updatedAt: 1000 },
    { id: 'w2', isCompleted: true, updatedAt: 3000 },
    { id: 'w3', isCompleted: false, updatedAt: 5000 }, // in-progress, never pushed
  ]);
  const captured = [];
  getSupabaseClient.mockReturnValue(makeClient(null, captured));

  const res = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(res.errors).toBe(0);
  expect(captured.sort()).toEqual(['w1', 'w2']);
  expect(mockStore[WM_KEY]).toBe('3000');
});

test('warm cursor skips already-pushed workouts, re-pushes the boundary and anything newer', async () => {
  mockStore[WM_KEY] = '3000';
  db.getAllWorkouts.mockResolvedValue([
    { id: 'w1', isCompleted: true, updatedAt: 1000 }, // below cursor: skip
    { id: 'w2', isCompleted: true, updatedAt: 3000 }, // boundary (>=): re-push, idempotent
    { id: 'w4', isCompleted: true, updatedAt: 7000 }, // newer: push
  ]);
  const captured = [];
  getSupabaseClient.mockReturnValue(makeClient(null, captured));

  await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(captured.sort()).toEqual(['w2', 'w4']);
  expect(mockStore[WM_KEY]).toBe('7000');
});

test('a rejected push leaves the watermark unchanged so the row retries next cycle', async () => {
  mockStore[WM_KEY] = '3000';
  db.getAllWorkouts.mockResolvedValue([
    { id: 'w4', isCompleted: true, updatedAt: 7000 },
  ]);
  const captured = [];
  getSupabaseClient.mockReturnValue(makeClient({ message: 'permission denied', code: '42501' }, captured));

  const res = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(res.errors).toBeGreaterThan(0);
  expect(mockStore[WM_KEY]).toBe('3000');
});

test('stale workouts schema retries without optional readiness columns and still advances watermark', async () => {
  db.getAllWorkouts.mockResolvedValue([
    {
      id: 'w4',
      isCompleted: true,
      updatedAt: 7000,
      sleepQuality: 8,
      energyScore: 7,
    },
  ]);
  const capturedRows = [];
  getSupabaseClient.mockReturnValue(makeWorkoutSchemaDriftClient(capturedRows));

  const res = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(res.errors).toBe(0);
  expect(capturedRows).toHaveLength(2);
  expect(capturedRows[0]).toMatchObject({ id: 'w4', sleep_quality: 8, energy_score: 7 });
  expect(capturedRows[1]).toMatchObject({ id: 'w4' });
  expect(capturedRows[1]).not.toHaveProperty('sleep_quality');
  expect(capturedRows[1]).not.toHaveProperty('energy_score');
  expect(mockStore[WM_KEY]).toBe('7000');
});

// A client that accepts every workouts upsert but rejects every workout_sets
// upsert, so a workout shell lands while its sets do not.
function makeSetsFailClient(capturedWorkoutIds) {
  const readResult = { data: [], error: null };
  return {
    from: jest.fn((table) => ({
      upsert: jest.fn((payload) => {
        if (table === 'workouts') {
          const rows = Array.isArray(payload) ? payload : [payload];
          for (const r of rows) capturedWorkoutIds.push(r.id);
          return makeChain({ error: null, data: [] });
        }
        if (table === 'workout_sets') {
          return makeChain({ error: { message: 'permission denied', code: '42501' }, data: null });
        }
        return makeChain({ error: null, data: [] });
      }),
      insert: jest.fn(() => makeChain({ error: null, data: [] })),
      update: jest.fn(() => makeChain({ error: null, data: [] })),
      delete: jest.fn(() => makeChain({ error: null, data: [] })),
      select: jest.fn(() => makeChain(readResult)),
    })),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  };
}

test('a workout_sets chunk failure holds the watermark so the workout retries (LS-02/H-11)', async () => {
  mockStore[WM_KEY] = '1000';
  db.getAllWorkouts.mockResolvedValue([
    { id: 'w-old', isCompleted: true, updatedAt: 2000 }, // its sets will fail
    { id: 'w-new', isCompleted: true, updatedAt: 4000 },
  ]);
  // Each workout has a set; the client fails every workout_sets upsert.
  db.getWorkoutSetsForWorkout.mockResolvedValue([{ id: 's1', workoutId: 'w-old', exerciseId: 'e1' }]);
  const captured = [];
  getSupabaseClient.mockReturnValue(makeSetsFailClient(captured));

  const res = await bulkUploadLocalData('cloud-uid', 'local-uid');

  // Shells were sent, but every set chunk failed, so the push is reported as
  // failed and the watermark must NOT advance past the workouts whose sets
  // never landed. Before the fix _upsertSets swallowed the error, errors was
  // 0, and the watermark jumped to 4000 - losing w-old's sets forever.
  expect(res.errors).toBeGreaterThan(0);
  expect(mockStore[WM_KEY]).toBe('1000');
});

test('nothing newer than the cursor: no upserts, watermark unchanged', async () => {
  mockStore[WM_KEY] = '5000';
  db.getAllWorkouts.mockResolvedValue([
    { id: 'w1', isCompleted: true, updatedAt: 1000 },
  ]);
  const captured = [];
  getSupabaseClient.mockReturnValue(makeClient(null, captured));

  await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(captured).toEqual([]);
  expect(mockStore[WM_KEY]).toBe('5000');
});
