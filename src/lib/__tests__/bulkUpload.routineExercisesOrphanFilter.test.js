/**
 * Regression test for Sentry VOLYUME-1A ("new row violates row-level
 * security policy for table routine_exercises").
 *
 * _pushRoutinesAndExercises (sync.js) pushes routines, then filters
 * routine_exercises down to rows whose routine_id is "pushable" before
 * upserting them -- cloud RLS on routine_exercises requires a matching
 * row to already exist in routines for the same user. The bug: the
 * filter's allow-list was built from every LOCAL routine, not the ones
 * that actually succeeded this push cycle. A routine whose own upsert
 * failed (RLS, network, whatever) still let its child exercises through,
 * which then hit RLS themselves because the parent genuinely wasn't in
 * cloud yet.
 *
 * These tests drive the real sync.js (via the exported bulkUploadLocalData)
 * with supabase + database mocked at the boundary, same convention as
 * bulkUpload.pushWatermark.test.js.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../database');

const { getSupabaseClient } = require('../supabase');
const db = require('../database');
const { bulkUploadLocalData } = require('../sync');

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

// routineFailIds: routine rows in an upserted slice whose id is in this
// set make the WHOLE slice error, matching real Postgrest semantics (one
// upsert call is one statement; a single bad row fails the batch, not
// just that row).
function makeClient({ routineFailIds = new Set(), captured }) {
  return {
    from: jest.fn((table) => ({
      upsert: jest.fn((payload) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        if (table === 'routines') {
          captured.routineCalls.push(rows.map(r => r.id));
          const fails = rows.some(r => routineFailIds.has(r.id));
          if (fails) {
            return makeChain({ error: { message: 'permission denied', code: '42501' }, data: null });
          }
          return makeChain({ error: null, data: [] });
        }
        if (table === 'routine_exercises') {
          captured.routineExerciseCalls.push(rows.map(r => r.id));
          return makeChain({ error: null, data: [] });
        }
        return makeChain({ error: null, data: [] });
      }),
      insert: jest.fn(() => makeChain({ error: null, data: [] })),
      update: jest.fn(() => makeChain({ error: null, data: [] })),
      delete: jest.fn(() => makeChain({ error: null, data: [] })),
      select: jest.fn(() => makeChain({ data: [], error: null })),
    })),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Every db getter is a benign empty result by default; the tests below
  // override getAllRoutinesForUser / getAllRoutineExercisesForUser.
  for (const k of Object.keys(db)) {
    if (typeof db[k] === 'function' && typeof db[k].mockResolvedValue === 'function') {
      db[k].mockResolvedValue([]);
    }
  }
  db.getAllWorkouts.mockResolvedValue([]);
  db.getWorkoutSetsForWorkout.mockResolvedValue([]);
  db.cleanupOrphanRoutineExercises.mockResolvedValue(undefined);
});

test('a routine that fails to push excludes its exercises from the routine_exercises upsert', async () => {
  db.getAllRoutinesForUser.mockResolvedValue([
    { id: 'r1', name: 'Push day' },
  ]);
  db.getAllRoutineExercisesForUser.mockResolvedValue([
    { id: 'ex1', routineId: 'r1', exerciseId: 'bench-press' },
  ]);
  const captured = { routineCalls: [], routineExerciseCalls: [] };
  getSupabaseClient.mockReturnValue(makeClient({ routineFailIds: new Set(['r1']), captured }));

  await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(captured.routineCalls).toEqual([['r1']]);
  // The old bug: routine_exercises would still be upserted here, pointing
  // at a routine_id RLS can't verify (r1 never landed), and would itself
  // be rejected. The fix: no call happens at all once every candidate
  // routine_id has been filtered out.
  expect(captured.routineExerciseCalls).toEqual([]);
});

test('a routine that pushes cleanly still carries its exercises through', async () => {
  db.getAllRoutinesForUser.mockResolvedValue([
    { id: 'r1', name: 'Push day' },
  ]);
  db.getAllRoutineExercisesForUser.mockResolvedValue([
    { id: 'ex1', routineId: 'r1', exerciseId: 'bench-press' },
  ]);
  const captured = { routineCalls: [], routineExerciseCalls: [] };
  getSupabaseClient.mockReturnValue(makeClient({ routineFailIds: new Set(), captured }));

  await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(captured.routineCalls).toEqual([['r1']]);
  expect(captured.routineExerciseCalls).toEqual([['ex1']]);
});

test('a mixed batch only carries exercises for the routines that actually succeeded', async () => {
  // Force two chunks (push chunks at 200) so one chunk can fail while the
  // other succeeds, proving the filter is keyed off real push outcomes
  // per-chunk, not an all-or-nothing local list.
  const okRoutines = Array.from({ length: 200 }, (_, i) => ({ id: `ok${i}`, name: `Routine ${i}` }));
  const routines = [...okRoutines, { id: 'bad0', name: 'Routine bad' }];
  db.getAllRoutinesForUser.mockResolvedValue(routines);
  db.getAllRoutineExercisesForUser.mockResolvedValue([
    { id: 'ex-ok', routineId: 'ok0', exerciseId: 'squat' },
    { id: 'ex-bad', routineId: 'bad0', exerciseId: 'deadlift' },
  ]);
  const captured = { routineCalls: [], routineExerciseCalls: [] };
  getSupabaseClient.mockReturnValue(makeClient({ routineFailIds: new Set(['bad0']), captured }));

  await bulkUploadLocalData('cloud-uid', 'local-uid');

  expect(captured.routineCalls).toHaveLength(2);
  expect(captured.routineCalls[0]).toHaveLength(200);
  expect(captured.routineCalls[1]).toEqual(['bad0']);
  // Only the exercise belonging to the successfully-pushed routine ships.
  expect(captured.routineExerciseCalls).toEqual([['ex-ok']]);
});
