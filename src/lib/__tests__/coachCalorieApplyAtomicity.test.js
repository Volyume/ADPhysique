/**
 * C3 (final audit 2026-10-17): real-SQLite fault injection for the coach
 * CALORIE apply (the weekly calorie step and a diet break).
 *
 * The new nutrition target and the coach receipt that says it was applied
 * are one commit. Pinned: a failure on either write rolls BOTH back, so the
 * target never moves without its receipt (which re-offered Apply and let a
 * second tap stack another step) and a receipt never claims a change that did
 * not land. Nothing here computes a calorie value; the floors stay in
 * coachApply and are untouched.
 */

const { DatabaseSync } = require('node:sqlite');
const { applyCoachCalorieAdjustmentWithDb } = require('../database');

const USER = 'user-a';
const WEEK = 1770000000000;

function fixture(failOn = null) {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`
    CREATE TABLE nutrition_targets (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, bmr REAL, tdee REAL,
      target_kcal REAL, protein_g REAL, carbs_g REAL, fat_g REAL, phase TEXT,
      bmr_method TEXT, activity_level TEXT, confidence TEXT, warnings TEXT,
      gdpr_consented INTEGER DEFAULT 0, goal TEXT, protein_approach TEXT,
      created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE coach_outputs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, week_start INTEGER NOT NULL,
      goal_phase TEXT, volume_signal INTEGER, load_signal TEXT, recovery_flag TEXT,
      calorie_change INTEGER, steps_target INTEGER, why_this TEXT, output_json TEXT,
      applied INTEGER, created_at INTEGER, updated_at INTEGER
    );
    INSERT INTO nutrition_targets (id, user_id, target_kcal, protein_g, carbs_g, fat_g)
      VALUES ('nt-1', '${USER}', 2200, 160, 230, 70);
  `);
  const d = {
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    runAsync: async (sql, params = []) => {
      if (failOn && failOn.test(sql.trim())) throw new Error('injected write failure');
      return raw.prepare(sql).run(...params);
    },
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try { await fn(); raw.exec('COMMIT'); } catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
    isInTransactionSync: () => raw.isTransaction,
  };
  return { raw, d };
}

const targets = { targetKcal: 2000, proteinG: 160, carbsG: 180, fatG: 70, phase: 'cut' };
const coachOutput = {
  weekStart: WEEK,
  goalPhase: 'cut',
  adjustments: { calories: { change: -200 } },
  appliedAdjustments: { calories: { newKcal: 2000 } },
};

function state(raw) {
  return {
    kcal: raw.prepare('SELECT target_kcal FROM nutrition_targets WHERE user_id = ?').get(USER).target_kcal,
    receipts: raw.prepare('SELECT COUNT(*) AS n FROM coach_outputs WHERE user_id = ?').get(USER).n,
  };
}

describe('coach calorie apply is one commit', () => {
  test('both writes land together on the normal path', async () => {
    const { raw, d } = fixture();
    await applyCoachCalorieAdjustmentWithDb(d, { userId: USER, targets, coachOutput });
    expect(state(raw)).toEqual({ kcal: 2000, receipts: 1 });
    const stored = JSON.parse(raw.prepare('SELECT output_json FROM coach_outputs').get().output_json);
    expect(stored.appliedAdjustments.calories.newKcal).toBe(2000);
  });

  test('a failed receipt rolls the target back: it never moves without its receipt', async () => {
    const { raw, d } = fixture(/^INSERT INTO coach_outputs/);
    await expect(applyCoachCalorieAdjustmentWithDb(d, { userId: USER, targets, coachOutput })).rejects.toThrow();
    expect(state(raw)).toEqual({ kcal: 2200, receipts: 0 });
  });

  test('a failed target write leaves no receipt claiming it applied', async () => {
    const { raw, d } = fixture(/^UPDATE nutrition_targets/);
    await expect(applyCoachCalorieAdjustmentWithDb(d, { userId: USER, targets, coachOutput })).rejects.toThrow();
    expect(state(raw)).toEqual({ kcal: 2200, receipts: 0 });
  });

  test('an invalid identity is refused before any write', async () => {
    const { raw, d } = fixture();
    await expect(applyCoachCalorieAdjustmentWithDb(d, { userId: USER, targets, coachOutput: { weekStart: null } })).rejects.toThrow();
    await expect(applyCoachCalorieAdjustmentWithDb(d, { userId: null, targets, coachOutput })).rejects.toThrow();
    expect(state(raw)).toEqual({ kcal: 2200, receipts: 0 });
  });
});
