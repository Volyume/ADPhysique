/**
 * plannedNotEaten.test.js — Campaign 17A Job 2.
 *
 * FOUNDER LAW: "A meal-plan item that has merely been placed in the diary is a
 * PLAN. It does NOT become actual intake until explicitly confirmed/logged as
 * eaten. Planned rows must not count toward calorie/protein adherence, feed
 * adaptive TDEE, count as consumed protein, teach favourites/preferences,
 * teach meal-count behaviour, or teach that the user likes a generated meal."
 *
 * WHAT THIS SUITE PINS, AND WHY
 *
 * The boundary itself already existed and is good: `logFoodEntry` writes
 * meal-plan rows with `is_planned = 1` and a NULL `eaten_at`, and confirming
 * flips them to 0. What was NOT complete was the set of READERS that honour
 * it. Three real queries counted planned rows as eaten:
 *
 *   - getLoggedMealSlotsForDay, which sizes the next meal suggestion from how
 *     many meals are "already eaten" (the meal-count clause, exactly);
 *   - getRecentLoggedDays, the "copy a previous day" picker, which showed a
 *     day of pure scaffolding as a logged day and counted its calories;
 *   - getFoodEntriesForRange, which backs the weekly micronutrient card and
 *     the diary CSV/PDF export a user may hand to a coach or a clinician.
 *
 * These tests assert the REAL SQL each reader issues, in the same db()-mock
 * style as logFoodEntry.guard.test.js and confirmPlannedMeal.test.js
 * (expo-sqlite is unavailable under node). They are written to fail against
 * the pre-17A queries.
 *
 * The rollup is pinned here too. It is the single number adherence and
 * adaptive TDEE read, so its `is_planned = 0` clause is the load-bearing one
 * for the whole law; it was already correct and must stay correct.
 */
const calls = [];

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { calls.push({ sql, params }); return { changes: 0 }; }),
    getFirstAsync: jest.fn(async (sql, params) => {
      calls.push({ sql, params });
      if (/COALESCE\(SUM\(kcal\)/.test(sql)) {
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql, params) => { calls.push({ sql, params }); return []; }),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');

/** The SQL of the last call whose text matches. */
function sqlMatching(re) {
  const hit = [...calls].reverse().find((c) => re.test(c.sql));
  return hit ? hit.sql : null;
}

/** Collapse whitespace so multi-line SQL can be asserted as one string. */
const flat = (sql) => (sql || '').replace(/\s+/g, ' ').trim();

beforeEach(() => {
  calls.length = 0;
  mockDb = makeDb();
});

describe('meal-count behaviour is never taught by a planned row', () => {
  test('getLoggedMealSlotsForDay counts only eaten slots', async () => {
    await food.getLoggedMealSlotsForDay('u1', '2026-08-14');
    const sql = flat(sqlMatching(/SELECT DISTINCT meal_slot/));
    expect(sql).toBeTruthy();
    expect(sql).toContain('is_planned = 0');
  });

  test('the meal-count reader agrees with the rollup, which has always excluded planned', async () => {
    // The suggestion sizer reads BOTH: `consumed` from the rollup and
    // `mealsLeft` from the slot list. If only one excludes planned rows the
    // two halves of the same calculation describe different days.
    await food.getLoggedMealSlotsForDay('u1', '2026-08-14');
    const slots = flat(sqlMatching(/SELECT DISTINCT meal_slot/));
    calls.length = 0;
    await food.recomputeRollup('u1', '2026-08-14');
    const rollup = flat(sqlMatching(/COALESCE\(SUM\(kcal\)/));
    expect(slots).toContain('is_planned = 0');
    expect(rollup).toContain('is_planned = 0');
  });
});

describe('adherence and adaptive TDEE never see planned food', () => {
  test('the rollup - the one number adherence and adaptive TDEE read - excludes planned rows', async () => {
    await food.recomputeRollup('u1', '2026-08-14');
    const sql = flat(sqlMatching(/COALESCE\(SUM\(kcal\)/));
    expect(sql).toBeTruthy();
    expect(sql).toContain('is_planned = 0');
    // And it is a real WHERE clause on the aggregate, not a post-filter.
    expect(sql).toMatch(/FROM food_entries WHERE .*is_planned = 0/);
  });
});

describe('planned food is never presented as logged history', () => {
  test('getRecentLoggedDays ("copy a previous day") lists only days with eaten food', async () => {
    await food.getRecentLoggedDays('u1', '2026-08-14', 14);
    const sql = flat(sqlMatching(/GROUP BY entry_date/));
    expect(sql).toBeTruthy();
    expect(sql).toContain('is_planned = 0');
    // The COUNT and SUM the user recognises the day by are inside the same
    // filtered query, so a scaffolded day cannot inflate either.
    expect(sql).toMatch(/COUNT\(\*\)[\s\S]*SUM\(kcal\)[\s\S]*is_planned = 0/);
  });

  test('getFoodEntriesForRange (micronutrients + diary export) returns only eaten rows', async () => {
    await food.getFoodEntriesForRange('u1', '2026-08-01', '2026-08-14');
    const sql = flat(sqlMatching(/entry_date BETWEEN/));
    expect(sql).toBeTruthy();
    expect(sql).toContain('is_planned = 0');
  });

  test('hasAnyFoodEntries does not count scaffolding as "this user logs food"', async () => {
    await food.hasAnyFoodEntries('u1');
    const sql = flat(sqlMatching(/SELECT 1 AS one FROM food_entries/));
    expect(sql).toContain('is_planned = 0');
  });
});

describe('the diary itself still SEES planned rows, because it has to render them', () => {
  test('getFoodEntriesForDay returns planned and eaten alike', async () => {
    // This is the one reader that must NOT filter: the diary draws the
    // planned scaffolding with its confirm/clear banner. The read-only view
    // filters in the view model instead (diaryViewModel), not in SQL.
    await food.getFoodEntriesForDay('u1', '2026-08-14');
    const sql = flat(sqlMatching(/ORDER BY meal_slot, logged_at/));
    expect(sql).toBeTruthy();
    expect(sql).not.toContain('is_planned');
  });
});

describe('a planned row carries no eaten moment until it is confirmed', () => {
  test('logFoodEntry writes is_planned=1 with a NULL eaten_at for a plan row', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-08-14', mealSlot: 'meal_1', foodRef: 'curated:oats',
      quantityG: 100, kcal: 400, proteinG: 30, carbsG: 50, fatG: 8, isPlanned: true,
    });
    const insert = [...calls].find((c) => /INSERT INTO food_entries/.test(c.sql));
    expect(insert).toBeTruthy();
    // Column order: ... logged_at, is_planned, weight_state, eaten_at, ...
    const cols = flat(insert.sql).match(/\(([^)]*)\) VALUES/)[1].split(',').map((c) => c.trim());
    const plannedIdx = cols.indexOf('is_planned');
    const eatenIdx = cols.indexOf('eaten_at');
    expect(insert.params[plannedIdx]).toBe(1);
    expect(insert.params[eatenIdx]).toBeNull();
  });

  test('an ordinary log is an actual with a real eaten moment', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-08-14', mealSlot: 'meal_1', foodRef: 'curated:oats',
      quantityG: 100, kcal: 400, proteinG: 30, carbsG: 50, fatG: 8,
    });
    const insert = [...calls].find((c) => /INSERT INTO food_entries/.test(c.sql));
    const cols = flat(insert.sql).match(/\(([^)]*)\) VALUES/)[1].split(',').map((c) => c.trim());
    expect(insert.params[cols.indexOf('is_planned')]).toBe(0);
    expect(typeof insert.params[cols.indexOf('eaten_at')]).toBe('number');
  });
});

describe('planned rows never leave the device, so nothing server-side can learn from them', () => {
  test('the food push slice excludes planned rows', async () => {
    await food.getAllFoodEntriesSince('u1', 0);
    const sql = flat(sqlMatching(/updated_at > \?/));
    expect(sql).toBeTruthy();
    expect(sql).toContain('is_planned = 0');
  });
});

describe('preference learning is explicit only: nothing implicit can be taught', () => {
  test('the only writer of food_favourites is the explicit setFoodPreference call', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../db.js'), 'utf8');
    const writes = src.match(/INSERT INTO food_favourites/g) || [];
    // Two: the explicit user action, and the sync PULL applying a cloud row.
    expect(writes.length).toBe(2);
    // Neither sits inside logFoodEntry / confirmPlannedDay / confirmPlannedEntry.
    for (const fn of ['export async function logFoodEntry', 'export async function confirmPlannedDay', 'export async function confirmPlannedEntry']) {
      const start = src.indexOf(fn);
      expect(start).toBeGreaterThan(-1);
      const body = src.slice(start, src.indexOf('\nexport ', start + 1));
      expect(body).not.toMatch(/INSERT INTO food_favourites/);
    }
  });
});
