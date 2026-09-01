/** F-07 real-SQLite fault injection for training/deload apply atomicity. */

const { DatabaseSync } = require('node:sqlite');
const { applyCoachTrainingAdjustmentWithDb } = require('../database');

const USER = 'user-a';
const WEEK = 1770000000000;
const WEEK_ID = 'week-2';

function fixture(failAt = null) {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`
    CREATE TABLE mesocycles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE mesocycle_weeks (
      id TEXT PRIMARY KEY, mesocycle_id TEXT NOT NULL, is_deload INTEGER NOT NULL,
      rir_target INTEGER NOT NULL, updated_at INTEGER
    );
    CREATE TABLE planned_muscle_volume (
      id TEXT PRIMARY KEY, mesocycle_week_id TEXT NOT NULL, muscle TEXT NOT NULL,
      planned_sets INTEGER NOT NULL, mev INTEGER, mav INTEGER, mrv INTEGER,
      source TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE coach_outputs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, week_start INTEGER NOT NULL,
      goal_phase TEXT, volume_signal INTEGER, load_signal TEXT, recovery_flag TEXT,
      calorie_change INTEGER, steps_target INTEGER, why_this TEXT, output_json TEXT,
      applied INTEGER, created_at INTEGER, updated_at INTEGER
    );
    INSERT INTO mesocycles(id,user_id) VALUES ('meso-1','${USER}');
    INSERT INTO mesocycle_weeks(id,mesocycle_id,is_deload,rir_target)
      VALUES ('${WEEK_ID}','meso-1',0,1);
  `);
  for (const muscle of ['chest', 'back', 'quads']) {
    raw.prepare(`INSERT INTO planned_muscle_volume
      (id,mesocycle_week_id,muscle,planned_sets,mev,mav,mrv,source,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      `pmv_${WEEK_ID}_${muscle}`, WEEK_ID, muscle, 10, 6, 10, 20, 'template', 1, 1,
    );
  }

  let mutation = 0;
  const d = {
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    runAsync: async (sql, params = []) => {
      if (/^(INSERT INTO planned_muscle_volume|UPDATE mesocycle_weeks|INSERT INTO coach_outputs|UPDATE coach_outputs)/.test(sql.trim())) {
        mutation += 1;
        if (mutation === failAt) throw new Error(`injected mutation failure ${mutation}`);
      }
      return raw.prepare(sql).run(...params);
    },
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try { await fn(); raw.exec('COMMIT'); }
      catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
    isInTransactionSync: () => raw.isTransaction,
  };
  return { raw, d, clearFault: () => { failAt = null; mutation = 0; } };
}

const changes = ['chest', 'back', 'quads'].map((muscle, index) => ({
  muscle,
  plannedSets: 11 + index,
  mev: 6,
  mav: 10,
  mrv: 20,
}));

function args(extra = {}) {
  return {
    userId: USER,
    weekStart: WEEK,
    mesocycleWeekId: WEEK_ID,
    changes,
    coachOutput: {
      weekStart: WEEK,
      goalPhase: 'build',
      appliedAdjustments: { training: { appliedAt: WEEK, volumeDelta: 1 } },
      adjustments: { training: { applied: true } },
    },
    ...extra,
  };
}

function state(raw) {
  return {
    planned: raw.prepare('SELECT muscle, planned_sets FROM planned_muscle_volume ORDER BY muscle').all(),
    receiptCount: raw.prepare('SELECT count(*) AS n FROM coach_outputs').get().n,
    week: raw.prepare('SELECT is_deload, rir_target FROM mesocycle_weeks WHERE id = ?').get(WEEK_ID),
  };
}

test.each([1, 2, 3, 4])('training failure at mutation %i rolls back every target and receipt', async (failAt) => {
  const { raw, d } = fixture(failAt);
  await expect(applyCoachTrainingAdjustmentWithDb(d, args())).rejects.toThrow(/injected/);
  expect(state(raw)).toEqual({
    planned: [
      { muscle: 'back', planned_sets: 10 },
      { muscle: 'chest', planned_sets: 10 },
      { muscle: 'quads', planned_sets: 10 },
    ],
    receiptCount: 0,
    week: { is_deload: 0, rir_target: 1 },
  });
  raw.close();
});

test('deload receipt failure rolls back the week flag and all volume targets', async () => {
  // deload UPDATE + three muscle writes + receipt INSERT
  const { raw, d } = fixture(5);
  await expect(applyCoachTrainingAdjustmentWithDb(d, args({ setDeload: true }))).rejects.toThrow(/injected/);
  expect(state(raw).week).toEqual({ is_deload: 0, rir_target: 1 });
  expect(state(raw).planned.every((row) => row.planned_sets === 10)).toBe(true);
  expect(state(raw).receiptCount).toBe(0);
  raw.close();
});

test('retry after rollback commits once, and duplicate Apply is idempotent', async () => {
  const { raw, d, clearFault } = fixture(2);
  await expect(applyCoachTrainingAdjustmentWithDb(d, args())).rejects.toThrow(/injected/);
  clearFault();
  await applyCoachTrainingAdjustmentWithDb(d, args());
  await applyCoachTrainingAdjustmentWithDb(d, args());

  expect(state(raw).planned).toEqual([
    { muscle: 'back', planned_sets: 12 },
    { muscle: 'chest', planned_sets: 11 },
    { muscle: 'quads', planned_sets: 13 },
  ]);
  expect(state(raw).receiptCount).toBe(1);
  raw.close();
});

test('a target week owned by another account fails before any mutation', async () => {
  const { raw, d } = fixture();
  await expect(applyCoachTrainingAdjustmentWithDb(d, args({ userId: 'user-b' }))).rejects.toThrow(/not owned/);
  expect(state(raw).receiptCount).toBe(0);
  raw.close();
});

