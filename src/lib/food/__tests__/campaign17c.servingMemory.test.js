/** Campaign 17C: serving memory is derived only from live, eaten evidence. */
const calls = [];
let memoryRow = { log_count: 1, last_logged_at: 100, last_quantity_g: 80 };
let entryRow = {
  entry_date: '2026-08-14', meal_slot: 'breakfast', food_ref: 'global:oats', is_planned: 0,
};

function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => {
      calls.push({ sql, params });
      return { changes: 1 };
    }),
    getFirstAsync: jest.fn(async (sql, params) => {
      calls.push({ sql, params });
      if (/SELECT entry_date, meal_slot, food_ref, is_planned/.test(sql)) return entryRow;
      if (/COUNT\(\*\) AS log_count/.test(sql)) return memoryRow;
      if (/COALESCE\(SUM\(kcal\)/.test(sql)) {
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async () => []),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');
const flat = (sql) => (sql || '').replace(/\s+/g, ' ').trim();

beforeEach(() => {
  calls.length = 0;
  memoryRow = { log_count: 1, last_logged_at: 100, last_quantity_g: 80 };
  entryRow = {
    entry_date: '2026-08-14', meal_slot: 'breakfast', food_ref: 'global:oats', is_planned: 0,
  };
  mockDb = makeDb();
});

test('deleting an actual rebuilds the exact user-slot-food memory from live actual rows', async () => {
  await food.deleteFoodEntry('e1', 'u1');

  const derive = calls.find((c) => /COUNT\(\*\) AS log_count/.test(c.sql));
  expect(flat(derive?.sql)).toContain('deleted_at IS NULL AND is_planned = 0');
  expect(derive?.params).toEqual(['u1', 'breakfast', 'global:oats']);

  const write = calls.find((c) => /INSERT INTO food_slot_recents/.test(c.sql));
  expect(write?.params.slice(0, 3)).toEqual(['u1', 'breakfast', 'global:oats']);
  expect(flat(write?.sql)).toContain('log_count = excluded.log_count');
});

test('deleting the only actual forgets the serving instead of learning from the mistake', async () => {
  memoryRow = { log_count: 0, last_logged_at: null, last_quantity_g: null };
  await food.deleteFoodEntry('e1', 'u1');
  const remove = calls.find((c) => /DELETE FROM food_slot_recents/.test(c.sql));
  expect(remove?.params).toEqual(['u1', 'breakfast', 'global:oats']);
});

test('deleting planned scaffolding never changes serving memory', async () => {
  entryRow = { ...entryRow, is_planned: 1 };
  await food.deleteFoodEntry('e1', 'u1');
  expect(calls.some((c) => /COUNT\(\*\) AS log_count|DELETE FROM food_slot_recents|INSERT INTO food_slot_recents/.test(c.sql))).toBe(false);
});

test('Undo restore rebuilds the same exact memory identity', async () => {
  await food.restoreFoodEntry('e1', 'u1');
  const derive = calls.find((c) => /COUNT\(\*\) AS log_count/.test(c.sql));
  expect(derive?.params).toEqual(['u1', 'breakfast', 'global:oats']);
});
