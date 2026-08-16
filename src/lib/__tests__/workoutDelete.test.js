/**
 * Workout delete (founder request 2026-06-12): the cloud half of deleting a
 * workout from history. Pins the RESURRECT-PREVENTION contract:
 *
 *  - deleteWorkoutFromCloud removes sets BEFORE resolving the workout (a
 *    mid-way failure leaves a set-less shell, never orphaned cloud sets);
 *  - a PostgREST error on either step reports failure (false) so the caller
 *    enqueues a 'workout_delete' op and the drainer retries — returning true
 *    on failure would strand the cloud copy, and a later restore pull would
 *    resurrect the session the user deleted;
 *  - missing client / ids are a benign false, never a throw.
 *
 * RELEASE-GATE AMENDMENT: the workout row is now TOMBSTONED (deleted_at set)
 * rather than hard-deleted. A hard delete made the deletion invisible to
 * every other device — a pull only ever selects live rows, so device B never
 * learned the session was gone, kept its stale local copy, and re-uploaded
 * it on its next bulk cycle, resurrecting a session the athlete had
 * deliberately deleted. The tombstone is durable cross-device truth a delta
 * pull can carry. Sets stay hard-deleted: the parent tombstone alone
 * suppresses them (see the pull-side apply in sync.js), so tombstoning every
 * child would be write amplification with no extra convergence.
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

// Chainable, thenable builder. Records the table + filter calls and any
// update payload so the order/scoping/tombstone assertions can read them back.
function makeClient({ setsError = null, workoutError = null } = {}) {
  const calls = [];
  const updates = [];
  const from = jest.fn((table) => {
    const error = table === 'workout_sets' ? setsError : workoutError;
    const chain = {
      delete: jest.fn(() => { calls.push({ table, op: 'delete' }); return chain; }),
      update: jest.fn((payload) => { updates.push({ table, payload }); return chain; }),
      eq: jest.fn((col, val) => { calls.push({ table, col, val }); return chain; }),
      then: (resolve) => resolve({ error, data: [] }),
    };
    return chain;
  });
  return { client: { from }, from, calls, updates };
}

beforeEach(() => jest.clearAllMocks());

describe('deleteWorkoutFromCloud', () => {
  test('deletes sets first, then TOMBSTONES the workout, both scoped to the user', async () => {
    const { client, from, calls } = makeClient();
    getSupabaseClient.mockReturnValue(client);

    const ok = await deleteWorkoutFromCloud('sb-user', 'w1');
    expect(ok).toBe(true);
    expect(from.mock.calls.map(([t]) => t)).toEqual(['workout_sets', 'workouts']);
    // Sets are still hard-deleted; the workout is not.
    expect(calls).toContainEqual({ table: 'workout_sets', op: 'delete' });
    expect(calls).not.toContainEqual({ table: 'workouts', op: 'delete' });
    // Every filter is user-scoped + id-scoped.
    expect(calls).toEqual(expect.arrayContaining([
      { table: 'workout_sets', col: 'user_id', val: 'sb-user' },
      { table: 'workout_sets', col: 'workout_id', val: 'w1' },
      { table: 'workouts', col: 'user_id', val: 'sb-user' },
      { table: 'workouts', col: 'id', val: 'w1' },
    ]));
  });

  test('the tombstone sets deleted_at AND bumps updated_at so a delta pull carries it', async () => {
    const { client, updates } = makeClient();
    getSupabaseClient.mockReturnValue(client);

    await deleteWorkoutFromCloud('sb-user', 'w1');

    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe('workouts');
    // Both must be present: deleted_at is the tombstone, updated_at is what
    // the watermark delta pull filters on - without the bump every other
    // device would skip the row as unchanged and never learn of the delete.
    expect(updates[0].payload.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(updates[0].payload.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('a sets-delete error reports failure and never touches the workout row', async () => {
    const { client, from } = makeClient({ setsError: { message: 'RLS denied' } });
    getSupabaseClient.mockReturnValue(client);

    const ok = await deleteWorkoutFromCloud('sb-user', 'w1');
    expect(ok).toBe(false);
    expect(from.mock.calls.map(([t]) => t)).toEqual(['workout_sets']);
  });

  test('a workout-tombstone error reports failure (the op must retry)', async () => {
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
