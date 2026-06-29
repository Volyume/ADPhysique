/**
 * In-session set edit/delete (Hevy-parity flagship): the CLOUD half of deleting
 * a single logged set. The local hard delete + the in-place edit have no SQL
 * engine under jest (repo convention: CRUD is exercised on device), so these
 * pin the resurrect-prevention contract for the cloud delete, exactly like
 * workoutDelete.test.js:
 *
 *  - deleteWorkoutSetFromCloud deletes the row scoped to BOTH user_id and id
 *    (never a broad delete);
 *  - a PostgREST error reports failure (false) so the caller enqueues a
 *    'workout_set_delete' op and the drainer retries — returning true on
 *    failure would strand the cloud row and a restore pull would resurrect the
 *    set the user removed;
 *  - missing client / ids are a benign false, never a throw.
 */

jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
}));
jest.mock('../database');

const { getSupabaseClient } = require('../supabase');
const { deleteWorkoutSetFromCloud } = require('../sync');

function makeClient({ error = null } = {}) {
  const calls = [];
  const from = jest.fn((table) => {
    const chain = {
      delete: jest.fn(() => chain),
      eq: jest.fn((col, val) => { calls.push({ table, col, val }); return chain; }),
      then: (resolve) => resolve({ error, data: [] }),
    };
    return chain;
  });
  return { client: { from }, from, calls };
}

beforeEach(() => jest.clearAllMocks());

describe('deleteWorkoutSetFromCloud', () => {
  test('deletes the one set scoped to user_id AND id', async () => {
    const { client, from, calls } = makeClient();
    getSupabaseClient.mockReturnValue(client);

    const ok = await deleteWorkoutSetFromCloud('sb-user', 'set-1');
    expect(ok).toBe(true);
    expect(from.mock.calls.map(([t]) => t)).toEqual(['workout_sets']);
    expect(calls).toEqual(expect.arrayContaining([
      { table: 'workout_sets', col: 'user_id', val: 'sb-user' },
      { table: 'workout_sets', col: 'id', val: 'set-1' },
    ]));
  });

  test('a PostgREST error reports failure so the op retries', async () => {
    const { client } = makeClient({ error: { message: 'RLS denied' } });
    getSupabaseClient.mockReturnValue(client);
    expect(await deleteWorkoutSetFromCloud('sb-user', 'set-1')).toBe(false);
  });

  test('missing client or ids are a benign false, never a throw', async () => {
    getSupabaseClient.mockReturnValue(null);
    expect(await deleteWorkoutSetFromCloud('sb-user', 'set-1')).toBe(false);
    const { client } = makeClient();
    getSupabaseClient.mockReturnValue(client);
    expect(await deleteWorkoutSetFromCloud(null, 'set-1')).toBe(false);
    expect(await deleteWorkoutSetFromCloud('sb-user', null)).toBe(false);
  });
});
