/**
 * confirmPlannedMeal.test.js
 *
 * Pins the food audit item 1 fix ("mark planned meal eaten", one tap):
 * DiaryScreen/MealSection now confirm a SINGLE meal slot's planned rows,
 * not just the whole day. This suite locks that confirmPlannedDay's
 * optional mealSlot filter is a REAL SQL WHERE clause against
 * food_entries (the actual intake write path: the plan already wrote real
 * rows via logFoodEntry(isPlanned:true); confirming just flips
 * is_planned 1 -> 0 on them so they count as eaten), never a cosmetic
 * client-side flag, and that whole-day callers (the day-level banner,
 * WeeklyCheckInScreen's retroactive confirm) are unaffected.
 *
 * It also pins the constitution ban (CLAUDE.md sec.2): nothing in this
 * flow computes or returns an adherence score, a streak, or any
 * red/green pass-fail judgement. confirmPlannedDay is a plain row-count.
 *
 * Same db() mock harness as logFoodEntry.guard.test.js: expo-sqlite is
 * unavailable under node, so db() is mocked and we assert the SQL/params
 * each call issues.
 */
const runCalls = [];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => {
      runCalls.push({ sql, params });
      // UPDATE food_entries ... is_planned = 0 -> pretend 2 rows matched.
      if (/UPDATE food_entries SET is_planned = 0/.test(sql)) return { changes: 2 };
      return { changes: 0 };
    }),
    getFirstAsync: jest.fn(async (sql) => {
      if (/FROM food_entries/.test(sql)) {
        return { kcal_total: 500, protein_g: 40, carbs_g: 50, fat_g: 10, fibre_g: 5, entries_count: 2 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async () => []),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));

const food = require('../db');

function updateCalls() {
  return runCalls.filter((c) => /UPDATE food_entries SET is_planned = 0/.test(c.sql));
}

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockDb = makeDb();
});

describe('confirmPlannedDay per-meal filter (food audit item 1)', () => {
  test('with no mealSlot, confirms the WHOLE day (existing whole-day callers unaffected)', async () => {
    const n = await food.confirmPlannedDay('u1', '2026-07-08');
    const calls = updateCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).not.toMatch(/meal_slot/);
    expect(calls[0].params).toEqual([expect.any(Number), expect.any(Number), 'u1', '2026-07-08']);
    expect(n).toBe(2); // the real changes count from the UPDATE, not a guess
  });

  test('with a mealSlot, the UPDATE is scoped to that slot only (a REAL WHERE clause)', async () => {
    await food.confirmPlannedDay('u1', '2026-07-08', 'meal_2');
    const calls = updateCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/AND meal_slot = \?/);
    expect(calls[0].params).toEqual([expect.any(Number), expect.any(Number), 'u1', '2026-07-08', 'meal_2']);
  });

  test('still flips is_planned via a real UPDATE against food_entries, not an in-memory/cosmetic flag', async () => {
    await food.confirmPlannedDay('u1', '2026-07-08', 'meal_1');
    const calls = updateCalls();
    expect(calls[0].sql).toMatch(/UPDATE food_entries SET is_planned = 0, logged_at = \?, updated_at = \?/);
    expect(calls[0].sql).toMatch(/WHERE user_id = \? AND entry_date = \? AND is_planned = 1 AND deleted_at IS NULL/);
  });

  test('recomputes the rollup after confirming (the real intake write path, not just a flag flip)', async () => {
    await food.confirmPlannedDay('u1', '2026-07-08', 'meal_1');
    const rollupWrite = runCalls.find((c) => /INSERT INTO daily_intake_rollups/.test(c.sql));
    expect(rollupWrite).toBeDefined();
  });

  test('the return value is a plain count: no adherence score, streak, or judgement field', async () => {
    const result = await food.confirmPlannedDay('u1', '2026-07-08', 'meal_1');
    expect(typeof result).toBe('number');
    // Guard against a future regression bolting a score/streak object on:
    // the contract stays "how many rows were confirmed", nothing else.
    expect(result).not.toHaveProperty?.('score');
    expect(result).not.toHaveProperty?.('streak');
  });
});

describe('confirmPlannedDay backward compatibility (existing whole-day callers)', () => {
  test('WeeklyCheckInScreen / day-level banner style calls (2 args) still confirm the whole day', async () => {
    await food.confirmPlannedDay('u1', '2026-07-08');
    expect(updateCalls()[0].sql).not.toMatch(/meal_slot/);
  });
});
