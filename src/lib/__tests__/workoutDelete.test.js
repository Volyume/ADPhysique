/**
 * Workout delete (founder request 2026-06-12): the cloud half of deleting a
 * workout from history. The local hard delete has no SQL engine under jest,
 * so these pin the RESURRECT-PREVENTION contract instead:
 *
 *  - deleteWorkoutFromCloud removes sets BEFORE the workout (a mid-way
 *    failure leaves a set-less shell, never orphaned cloud sets);
 *  - a PostgREST error on either step reports failure (false) so the caller
 *    enqueues a 'workout_delete' op and the drainer retries — returning true
 *    on failure would strand the cloud copy, and a later restore pull would
 *    resurrect the session the user deleted;
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
const { deleteWorkoutFromCloud } = require('../sync');

// Chainable, thenable delete builder. Records the table + filter calls so the
// order/scoping assertions can read them back.
function makeClient({ setsError = null, workoutError = null } = {}) {
  const calls = [];
  const from = jest.fn((table) => {
    const error = table === 'workout_sets' ? setsError : workoutError;
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

describe('deleteWorkoutFromCloud', () => {
  test('deletes sets first, then the workout, both scoped to the user', async () => {
    const { client, from, calls } = makeClient();
    getSupabaseClient.mockReturnValue(client);

    const ok = await deleteWorkoutFromCloud('sb-user', 'w1');
    expect(ok).toBe(true);
    expect(from.mock.calls.map(([t]) => t)).toEqual(['workout_sets', 'workouts']);
    // Every filter is user-scoped + id-scoped.
    expect(calls).toEqual(expect.arrayContaining([
      { table: 'workout_sets', col: 'user_id', val: 'sb-user' },
      { table: 'workout_sets', col: 'workout_id', val: 'w1' },
      { table: 'workouts', col: 'user_id', val: 'sb-user' },
      { table: 'workouts', col: 'id', val: 'w1' },
    ]));
  });

  test('a sets-delete error reports failure and never touches the workout row', async () => {
    const { client, from } = makeClient({ setsError: { message: 'RLS denied' } });
    getSupabaseClient.mockReturnValue(client);

    const ok = await deleteWorkoutFromCloud('sb-user', 'w1');
    expect(ok).toBe(false);
    expect(from.mock.calls.map(([t]) => t)).toEqual(['workout_sets']);
  });

  test('a workout-delete error reports failure (the op must retry)', async () => {
    const { client } = makeClient({ workoutError: { message: '500' } });
    getSupabaseClient.mockReturnValue(client);
    expect(await deleteWorkoutFromCloud('sb-user', 'w1')).toBe(false);
  });

  test('missing client or ids are a benign false, never a throw', async () => {
    getSupabaseClient.mockReturnValue(null);
    expect(await deleteWorkoutFromCloud('sb-user', 'w1')).toBe(false);
    const { client } = makeClient();
    getSupabaseClient.mockReturnValue(client);
    expect(await deleteWorkoutFromCloud(null, 'w1')).toBe(false);
    expect(await deleteWorkoutFromCloud('sb-user', null)).toBe(false);
  });
});
