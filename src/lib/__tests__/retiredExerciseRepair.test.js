/**
 * Retired exercise ids (register D217; founder's TestFlight report
 * 2026-10-03: a lateral raise machine session missing from the workout
 * summary, the Volume heatmap and the "trained N days ago" line). The sets
 * carried ceab62c3-..., the canonical id of "Lateral Raise Machine", which the
 * corpus retired into "Machine Lateral Raise"; the retired row is gone after
 * the one-shot top-up, so nothing resolved the id.
 *
 * Against the REAL database.js on an in-memory SQLite:
 *   - the launch repair re-points routine rows, sets, notes and goals at the
 *     survivor, stamps the synced rows, and is a no-op the second time;
 *   - after it, the per-muscle recency read and the heatmap's credit both
 *     see the session (the symptom, closed);
 *   - a routine row or a set pulled from the cloud with the retired id lands
 *     with the survivor's id, and a set pulled with no name gets its name;
 *   - getExerciseById answers a retired id with the survivor's row;
 *   - createWorkoutSet never records a retired id;
 *   - mergeExerciseIdInto stamps the rows it re-points.
 */

jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {}, syncAll: () => Promise.resolve() }));
jest.mock('../engineTelemetry', () => ({ track: () => Promise.resolve() }));
jest.mock('../telemetry/firsts', () => ({ trackFirst: () => Promise.resolve() }));

const dbm = require('../database');
const { canonicalExerciseId } = require('../exercise/canonicalId');
const { creditedMuscles } = require('../volumeLogged');

const RETIRED = canonicalExerciseId('Lateral Raise Machine'); // ceab62c3-...
const SURVIVOR = canonicalExerciseId('Machine Lateral Raise');
const RETIRED_2 = canonicalExerciseId('Rope Pushdown');
const SURVIVOR_2 = canonicalExerciseId('Tricep Pushdown (Rope)');

let conn;
let seq = 0;
const freshUser = () => `user-d217-${++seq}`;

beforeAll(async () => {
  conn = await dbm.db();
  expect(RETIRED).toBe('ceab62c3-23b6-47d9-9c3f-89422c95c4e1');
  // The survivors exist, as the seed chain's top-up leaves them; the retired rows do not.
  await dbm.insertExerciseWithId(SURVIVOR, { name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', equipment: 'machine', compoundIsolation: 'isolation' });
  await dbm.insertExerciseWithId(SURVIVOR_2, { name: 'Tricep Pushdown (Rope)', primaryMuscle: 'triceps', equipment: 'cable', compoundIsolation: 'isolation' });
});

async function seedSession(userId, exerciseId, { startedAt = Date.now() - 3600e3, sets = 3 } = {}) {
  const workoutId = `w-${userId}-${exerciseId.slice(0, 8)}-${startedAt}`;
  await conn.runAsync(
    'INSERT INTO workouts (id, user_id, started_at, ended_at, is_completed, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [workoutId, userId, startedAt, startedAt + 1800e3, startedAt, startedAt],
  );
  for (let i = 1; i <= sets; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await conn.runAsync(
      'INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, set_type, actual_reps, weight, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [`${workoutId}-s${i}`, userId, workoutId, exerciseId, i, 'straight', 15, 85, startedAt + i, startedAt + i],
    );
  }
  return workoutId;
}

describe('the launch repair', () => {
  test('re-points routine rows, sets, notes and goals at the survivor, stamps the synced rows, then has nothing left to do', async () => {
    const u = freshUser();
    const old = Date.now() - 86400e3 * 10;
    await conn.runAsync('INSERT INTO routines (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [`r-${u}`, u, 'Back + Delts', old, old]);
    await conn.runAsync(
      'INSERT INTO routine_exercises (id, routine_id, exercise_id, exercise_name, order_in_routine, recommended_sets, created_at, updated_at) VALUES (?, ?, ?, ?, 4, 3, ?, ?)',
      [`re-${u}`, `r-${u}`, RETIRED, 'Lateral Raise Machine', old, old],
    );
    const workoutId = await seedSession(u, RETIRED, { startedAt: old });
    await conn.runAsync('INSERT INTO exercise_user_notes (id, user_id, exercise_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [`n-${u}`, u, RETIRED, 'seat 4', old, old]);
    await conn.runAsync('INSERT INTO exercise_goals (id, user_id, exercise_id, target_weight, created_at) VALUES (?, ?, ?, 100, ?)', [`g-${u}`, u, RETIRED, old]);

    const first = await dbm.repairRetiredExerciseReferences();
    expect(first.routineRows).toBeGreaterThanOrEqual(1);
    expect(first.setRows).toBeGreaterThanOrEqual(3);
    expect(first.noteRows).toBe(1);
    expect(first.goalRows).toBe(1);

    const re = await conn.getFirstAsync('SELECT exercise_id, exercise_name, updated_at FROM routine_exercises WHERE id = ?', [`re-${u}`]);
    expect(re.exercise_id).toBe(SURVIVOR);
    expect(re.exercise_name).toBe('Lateral Raise Machine'); // the snapshot is history and stays
    expect(Number(re.updated_at)).toBeGreaterThan(old);
    const sets = await conn.getAllAsync('SELECT exercise_id, updated_at FROM workout_sets WHERE workout_id = ?', [workoutId]);
    expect(sets).toHaveLength(3);
    sets.forEach((s) => { expect(s.exercise_id).toBe(SURVIVOR); expect(Number(s.updated_at)).toBeGreaterThan(old); });
    const note = await conn.getFirstAsync('SELECT exercise_id FROM exercise_user_notes WHERE id = ?', [`n-${u}`]);
    expect(note.exercise_id).toBe(SURVIVOR);
    const goal = await conn.getFirstAsync('SELECT exercise_id FROM exercise_goals WHERE id = ?', [`g-${u}`]);
    expect(goal.exercise_id).toBe(SURVIVOR);

    const stampAfterFirst = Number(re.updated_at);
    const second = await dbm.repairRetiredExerciseReferences();
    expect(second).toEqual({ routineRows: 0, setRows: 0, noteRows: 0, goalRows: 0, intentPairs: 0 });
    const reAgain = await conn.getFirstAsync('SELECT updated_at FROM routine_exercises WHERE id = ?', [`re-${u}`]);
    expect(Number(reAgain.updated_at)).toBe(stampAfterFirst);
  });

  test('a person holding a note for both the retired and the surviving id keeps the survivor\'s note', async () => {
    const u = freshUser();
    const t = Date.now() - 5000;
    await conn.runAsync('INSERT INTO exercise_user_notes (id, user_id, exercise_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [`n1-${u}`, u, RETIRED_2, 'old', t, t]);
    await conn.runAsync('INSERT INTO exercise_user_notes (id, user_id, exercise_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [`n2-${u}`, u, SURVIVOR_2, 'kept', t, t]);
    await dbm.repairRetiredExerciseReferences();
    const rows = await conn.getAllAsync('SELECT id, exercise_id, note FROM exercise_user_notes WHERE user_id = ?', [u]);
    expect(rows).toEqual([{ id: `n2-${u}`, exercise_id: SURVIVOR_2, note: 'kept' }]);
  });
});

describe('the symptom, closed: the session counts once its id is repaired', () => {
  test('the per-muscle recency read and the heatmap credit both see the lateral raise sets', async () => {
    const u = freshUser();
    const startedAt = Date.now() - 86400e3; // yesterday
    await seedSession(u, RETIRED, { startedAt, sets: 6 });
    const before = await dbm.getLastTrainedByMuscle(u);
    expect(before.side_delts).toBeUndefined();
    const map0 = Object.fromEntries((await dbm.getAllExercises()).map((e) => [e.id, e]));
    expect(creditedMuscles({ exerciseId: RETIRED, setType: 'straight' }, map0, new Map())).toEqual([]);

    await dbm.repairRetiredExerciseReferences();

    const after = await dbm.getLastTrainedByMuscle(u);
    expect(after.side_delts).toBeDefined();
    expect(after.side_delts.lastDate).toBe(startedAt);
    expect(after.side_delts.daysAgo).toBe(1);
    const sets = await dbm.getWorkoutSetsForWorkout(await conn.getFirstAsync('SELECT id FROM workouts WHERE user_id = ?', [u]).then((r) => r.id));
    const map = Object.fromEntries((await dbm.getAllExercises()).map((e) => [e.id, e]));
    const credited = sets.flatMap((s) => creditedMuscles(s, map, new Map()));
    expect(credited.filter((m) => m === 'side_delts')).toHaveLength(6);
  });
});

describe('the pull writers', () => {
  test('a routine row pulled with the retired id lands with the survivor\'s id', async () => {
    const u = freshUser();
    const t = new Date().toISOString();
    await conn.runAsync('INSERT INTO routines (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [`r-${u}`, u, 'Pull', Date.now(), Date.now()]);
    await dbm.insertRoutineExerciseFromCloud({
      id: `re-cloud-${u}`, routine_id: `r-${u}`, exercise_id: RETIRED, exercise_name: 'Lateral Raise Machine',
      order_in_routine: 0, recommended_sets: 3, created_at: t, updated_at: t,
    });
    const row = await conn.getFirstAsync('SELECT exercise_id FROM routine_exercises WHERE id = ?', [`re-cloud-${u}`]);
    expect(row.exercise_id).toBe(SURVIVOR);
  });

  test('a set pulled with the retired id and no name lands with the survivor\'s id and name', async () => {
    const u = freshUser();
    const startedAt = Date.now() - 7200e3;
    await conn.runAsync('INSERT INTO workouts (id, user_id, started_at, is_completed, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)', [`w-${u}`, u, startedAt, startedAt, startedAt]);
    await dbm.insertWorkoutSetFromCloud(u, {
      id: `s-cloud-${u}`, workout_id: `w-${u}`, exercise_id: RETIRED, exercise_name: null,
      set_number: 2, set_type: 'straight', actual_reps: 15, weight: 85,
      created_at: new Date(startedAt).toISOString(), updated_at: new Date(startedAt).toISOString(),
    });
    const row = await conn.getFirstAsync('SELECT exercise_id, exercise_name FROM workout_sets WHERE id = ?', [`s-cloud-${u}`]);
    expect(row.exercise_id).toBe(SURVIVOR);
    expect(row.exercise_name).toBe('Machine Lateral Raise');
  });

  test('a cloud row whose id is unknown but whose snapshot carries a retired NAME heals to the survivor', async () => {
    const u = freshUser();
    await conn.runAsync('INSERT INTO routines (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [`r-${u}`, u, 'Heal', Date.now(), Date.now()]);
    const t = new Date().toISOString();
    await dbm.insertRoutineExerciseFromCloud({
      id: `re-heal-${u}`, routine_id: `r-${u}`, exercise_id: 'random-id-from-an-old-build', exercise_name: 'Rope Pushdown',
      order_in_routine: 0, recommended_sets: 3, created_at: t, updated_at: t,
    });
    const row = await conn.getFirstAsync('SELECT exercise_id FROM routine_exercises WHERE id = ?', [`re-heal-${u}`]);
    expect(row.exercise_id).toBe(SURVIVOR_2);
  });
});

describe('the other entry points', () => {
  test('getExerciseById answers a retired id with the survivor\'s row', async () => {
    const row = await dbm.getExerciseById(RETIRED);
    expect(row?.id).toBe(SURVIVOR);
    expect(row?.name).toBe('Machine Lateral Raise');
  });

  test('createWorkoutSet never records a retired id, and names the set after the survivor', async () => {
    const u = freshUser();
    const w = await dbm.createWorkout(u, null);
    const set = await dbm.createWorkoutSet({ userId: u, workoutId: w.id, exerciseId: RETIRED, setNumber: 1, actualReps: 15, weight: 85 });
    const row = await conn.getFirstAsync('SELECT exercise_id, exercise_name FROM workout_sets WHERE id = ?', [set.id ?? set]);
    expect(row.exercise_id).toBe(SURVIVOR);
    expect(row.exercise_name).toBe('Machine Lateral Raise');
  });

  test('mergeExerciseIdInto stamps the rows it re-points', async () => {
    const u = freshUser();
    const old = Date.now() - 86400e3 * 3;
    const fromId = 'dup-row-id';
    await dbm.insertExerciseWithId(fromId, { name: 'A duplicate', primaryMuscle: 'triceps' });
    const workoutId = await seedSession(u, fromId, { startedAt: old, sets: 2 });
    await dbm.mergeExerciseIdInto(fromId, SURVIVOR_2);
    const sets = await conn.getAllAsync('SELECT exercise_id, updated_at FROM workout_sets WHERE workout_id = ?', [workoutId]);
    sets.forEach((s) => { expect(s.exercise_id).toBe(SURVIVOR_2); expect(Number(s.updated_at)).toBeGreaterThan(old); });
    expect(await conn.getFirstAsync('SELECT 1 AS x FROM exercises WHERE id = ?', [fromId])).toBeNull();
  });
});
