/**
 * SYNC-1 contract: bulkUploadLocalData must REPORT push failures.
 *
 * The legacy bulk push runs ~13 helpers that each swallow their own
 * PostgREST {error} (via logPgErr) so one table's failure can't abort the
 * rest. That resilience used to hide failures from the runner / sign-out
 * push-first safety: the function returned undefined, errored_count stayed
 * 0, the status read 'synced', and sign-out wiped local data that never
 * reached cloud.
 *
 * These tests drive the real sync.js with the supabase client + database
 * mocked at the boundary, and assert the returned { errors } reflects
 * whether a push was rejected.
 */

jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
}));
// Auto-mock the whole database surface (every getAll* becomes a jest.fn
// returning undefined → guarded helpers no-op). Override only the two
// getters that need real shapes to reach a push.
jest.mock('../database');

const { getSupabaseClient } = require('../supabase');
const db = require('../database');
const { bulkUploadLocalData } = require('../sync');

// A robust supabase mock: every builder method is both chainable (returns the
// same object, so .upsert().select().eq()... never hits an undefined method)
// AND thenable (await at any point resolves to `result`). upsert/insert/etc.
// resolve to the given error; reads resolve to empty data. This avoids spurious
// throws (which now count as errors) from a helper using any method shape.
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
function clientWithUpsertError(upsertError) {
  const writeResult = { error: upsertError, data: [] };
  const readResult = { data: [], error: null };
  return {
    from: jest.fn(() => ({
      upsert: jest.fn(() => makeChain(writeResult)),
      insert: jest.fn(() => makeChain(writeResult)),
      update: jest.fn(() => makeChain(writeResult)),
      delete: jest.fn(() => makeChain(writeResult)),
      select: jest.fn(() => makeChain(readResult)),
    })),
    rpc: jest.fn(async () => ({ data: null, error: upsertError })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default every mocked db getter to a benign empty array so no push helper
  // throws on an undefined read (production getters return arrays; a throw now
  // legitimately counts as an error, so we must not introduce spurious ones).
  for (const k of Object.keys(db)) {
    if (typeof db[k] === 'function' && typeof db[k].mockResolvedValue === 'function') {
      db[k].mockResolvedValue([]);
    }
  }
  // One programme row so _pushProgrammes actually issues an upsert.
  db.getAllProgrammes.mockResolvedValue([{ id: 'p1', name: 'Push/Pull', isLibrary: false, isActive: true }]);
});

test('reports errors > 0 when a legacy table push is rejected (PostgREST error)', async () => {
  getSupabaseClient.mockReturnValue(
    clientWithUpsertError({ message: 'permission denied', code: '42501' }),
  );

  const result = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(result).toBeDefined();
  expect(result.errors).toBeGreaterThan(0);
});

test('reports errors === 0 on a clean push', async () => {
  getSupabaseClient.mockReturnValue(clientWithUpsertError(null));

  const result = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(result).toBeDefined();
  expect(result.errors).toBe(0);
});

test('returns { errors: 0 } and does not throw when there is no client', async () => {
  getSupabaseClient.mockReturnValue(null);

  const result = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(result).toEqual({ errors: 0 });
});

test('counts a helper that THROWS while reading local data (not just PostgREST {error})', async () => {
  // Clean cloud client (no upsert errors), but a push helper's local read
  // throws. Its own catch swallows the throw with logBulkWarn, which must still
  // count so the sign-out push-first safety sees the failure (SYNC-1 re-audit).
  getSupabaseClient.mockReturnValue(clientWithUpsertError(null));
  db.getAllProgrammes.mockRejectedValue(new Error('sqlite read failed'));

  const result = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(result.errors).toBeGreaterThan(0);
});

test('counts a THROWN failure in the workouts push loop (sets read fails)', async () => {
  // Clean cloud client, one completed workout, but reading its sets throws.
  // The workouts loop catch must count it (it's a throw, not a PostgREST
  // {error}) so the sign-out push-first safety sees the failure (SYNC-1
  // re-audit: this loop was previously logWarn, uncounted).
  getSupabaseClient.mockReturnValue(clientWithUpsertError(null));
  db.getAllWorkouts.mockResolvedValue([{ id: 'w1', isCompleted: true }]);
  db.getWorkoutSetsForWorkout.mockRejectedValue(new Error('sqlite read failed'));

  const result = await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(result.errors).toBeGreaterThan(0);
});
