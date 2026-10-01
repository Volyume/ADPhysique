/**
 * D214 (progress audit 2026-10-01), RC-36, VH-18 and VH-3, against a REAL
 * SQLite (node:sqlite) through database.js's own schema and queries:
 *
 *  - a completed session whose sets carry no `set_type` (NULL) counts for
 *    "Trained N days ago" on both recency reads. In SQL, `set_type !=
 *    'warmup'` is NULL, not true, for a NULL set_type, so both reads
 *    silently dropped such sessions;
 *  - the weekly volume trend excludes explosive sets (evidence_class
 *    'ballistic' / 'circuit_ballistic') exactly as the heatmap rows do, so
 *    the two paths count the same sets and "not counted here" is true.
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
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const { __raw: raw } = require('../dbCrypto');
const {
  db, getLastTrainedPerMuscle, getLastTrainedByMuscle, getWeeklyVolumeByMuscle,
} = require('../database');

const U = 'user-d214';
const DAY = 86400000;

function insertExercise(id, primary, secondary) {
  raw.prepare(`INSERT INTO exercises (id, name, primary_muscle, secondary_muscles, exercise_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'weight_reps', 1, 1)`).run(id, id, primary, secondary);
}
function insertWorkout(id, startedAt) {
  raw.prepare(`INSERT INTO workouts (id, user_id, started_at, ended_at, is_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)`).run(id, U, startedAt, startedAt + 3600000, startedAt, startedAt);
}
function insertSet(id, workoutId, exerciseId, createdAt, setType, evidenceClass = null) {
  raw.prepare(`INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, set_type, actual_reps, weight, created_at, updated_at, evidence_class)
    VALUES (?, ?, ?, ?, 1, ?, 8, 60, ?, ?, ?)`).run(id, U, workoutId, exerciseId, setType, createdAt, createdAt, evidenceClass);
}

beforeAll(async () => {
  await db();
  insertExercise('ex-row', 'back', '["biceps"]');
  insertExercise('ex-swing', 'glutes', '["hamstrings"]');
});

test('RC-36 / VH-18: a session whose sets have no set_type counts for both recency reads', async () => {
  const yesterday = Date.now() - DAY;
  insertWorkout('w-untyped', yesterday);
  insertSet('s-untyped', 'w-untyped', 'ex-row', yesterday, null);

  const perMuscle = await getLastTrainedPerMuscle(U);
  expect(perMuscle.back).toBe(yesterday);

  const byMuscle = await getLastTrainedByMuscle(U);
  expect(byMuscle.back).toBeDefined();
  expect(byMuscle.back.daysAgo).toBe(1);
});

test('warm-up sets still do not count for recency', async () => {
  const twoDays = Date.now() - 2 * DAY;
  insertWorkout('w-warm', twoDays);
  insertSet('s-warm', 'w-warm', 'ex-swing', twoDays, 'warmup');
  const perMuscle = await getLastTrainedPerMuscle(U);
  expect(perMuscle.glutes).toBeUndefined();
});

test('VH-3: the weekly volume trend excludes explosive sets as the heatmap rows do', async () => {
  const anchor = Date.now();
  const inWindow = anchor - 3 * DAY;
  insertWorkout('w-trend', inWindow);
  insertSet('s-plain', 'w-trend', 'ex-swing', inWindow, 'straight', null);
  insertSet('s-ballistic', 'w-trend', 'ex-swing', inWindow + 1000, 'straight', 'ballistic');
  insertSet('s-circuit-ballistic', 'w-trend', 'ex-swing', inWindow + 2000, 'straight', 'circuit_ballistic');

  const weeks = await getWeeklyVolumeByMuscle(U, 2, anchor);
  const total = weeks.reduce((t, w) => t + (w.volumeByMuscle.glutes || 0), 0);
  // One plain set: primary credit 1.0 for glutes; the two explosive sets add nothing.
  expect(total).toBe(1);
  const hams = weeks.reduce((t, w) => t + (w.volumeByMuscle.hamstrings || 0), 0);
  expect(hams).toBe(0.5);
});
