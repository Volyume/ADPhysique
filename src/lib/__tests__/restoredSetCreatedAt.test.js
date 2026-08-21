/**
 * PD-6 (bundle 2 prelude) - restored sets keep their chronology.
 *
 * Cloud restore used to stamp Date.now() into workout_sets.created_at,
 * collapsing every restored set's chronology to restore time and
 * breaking created_at-ordered consumers (the PR path). Pins:
 *  - a cloud stamp is preserved verbatim;
 *  - a cloud row with no stamp keeps the existing local created_at;
 *  - restore arrival order cannot reorder true chronology;
 *  - the push now carries the set's true local created_at forward.
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

const fs = require('fs');
const path = require('path');
const { db, insertWorkoutSetFromCloud, insertExerciseWithId } = require('../database');

const USER = 'u-pd6';
const T1 = Date.parse('2026-01-05T10:00:00Z');
const T2 = Date.parse('2026-02-10T10:00:00Z');

beforeAll(async () => {
  await db();
  await insertExerciseWithId('ex-pd6', {
    name: 'PD6 Row', primaryMuscle: 'back', equipment: 'barbell',
    movementPattern: 'horizontal_pull', compoundIsolation: 'compound',
  });
});

describe('PD-6: restore preserves workout_sets.created_at', () => {
  test('a cloud stamp survives verbatim; arrival order cannot reorder chronology', async () => {
    // The NEWER set restores FIRST - created_at ordering must still put
    // the January set before the February one.
    await insertWorkoutSetFromCloud(USER, {
      id: 's-feb', workout_id: 'w-1', exercise_id: 'ex-pd6', actual_reps: 8,
      created_at: '2026-02-10T10:00:00Z', updated_at: '2026-02-10T10:05:00Z',
    });
    await insertWorkoutSetFromCloud(USER, {
      id: 's-jan', workout_id: 'w-1', exercise_id: 'ex-pd6', actual_reps: 8,
      created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:05:00Z',
    });
    const d = await db();
    const rows = await d.getAllAsync(
      "SELECT id, created_at FROM workout_sets WHERE workout_id = 'w-1' ORDER BY created_at ASC",
    );
    expect(rows.map((r) => r.id)).toEqual(['s-jan', 's-feb']);
    expect(rows[0].created_at).toBe(T1);
    expect(rows[1].created_at).toBe(T2);
  });

  test('a cloud row with no stamp keeps the existing local created_at', async () => {
    const d = await db();
    await d.runAsync(
      `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, actual_reps, created_at, updated_at)
       VALUES ('s-keep', ?, 'w-2', 'ex-pd6', 8, ?, ?)`,
      [USER, T1, T1],
    );
    await insertWorkoutSetFromCloud(USER, {
      id: 's-keep', workout_id: 'w-2', exercise_id: 'ex-pd6', actual_reps: 9,
      updated_at: '2026-03-01T10:00:00Z', // newer, so the row updates...
    });
    const row = await d.getFirstAsync("SELECT actual_reps, created_at FROM workout_sets WHERE id = 's-keep'");
    expect(row.actual_reps).toBe(9);
    expect(row.created_at).toBe(T1); // ...but chronology stands.
  });

  test('the push carries the true local created_at forward', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');
    expect(src).toMatch(/created_at: new Date\(s\.createdAt \?\? s\.updatedAt \?\? Date\.now\(\)\)\.toISOString\(\)/);
  });
});
