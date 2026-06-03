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
}));
// Auto-mock the whole database surface (every getAll* becomes a jest.fn
// returning undefined → guarded helpers no-op). Override only the two
// getters that need real shapes to reach a push.
jest.mock('../database');

const { getSupabaseClient } = require('../supabase');
const db = require('../database');
const { bulkUploadLocalData } = require('../sync');

// A supabase client whose .from(t).upsert() resolves to the given error.
function clientWithUpsertError(upsertError) {
  return {
    from: jest.fn(() => ({
      upsert: jest.fn(async () => ({ error: upsertError })),
      select: jest.fn(() => ({
        eq: jest.fn(async () => ({ data: [], error: null })),
      })),
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // getAllWorkouts is iterated unconditionally (.filter); keep it an array.
  db.getAllWorkouts.mockResolvedValue([]);
  db.getWorkoutSetsForWorkout.mockResolvedValue([]);
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
