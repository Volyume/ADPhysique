/**
 * localCache reads must carry sodium_100g + sugar_100g (gap #16 sugars, E4
 * sodium). Both columns are stored on foods AND custom_foods, but every local
 * read path used to drop them, so a locally resolved food could never show a
 * sugars or sodium figure on its detail sheet: the display helpers
 * (scaleSugarG / scaleSodiumMg) read food.sugar_100g / food.sodium_100g and
 * render nothing on null. These pins keep the columns in every SELECT that
 * produces a food-shaped row.
 */
let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));

const { searchLocalByName, findLocalByBarcode, resolveFoodRef } = require('../sources/localCache');

beforeEach(() => { jest.clearAllMocks(); });

function recordingDb() {
  const calls = [];
  mockDb = {
    calls,
    getAllAsync: jest.fn(async (sql, params) => { calls.push({ sql, params }); return []; }),
    getFirstAsync: jest.fn(async (sql, params) => { calls.push({ sql, params }); return null; }),
  };
  return mockDb;
}

test('searchLocalByName selects sodium_100g and sugar_100g from both tables', async () => {
  const d = recordingDb();
  await searchLocalByName('u1', 'chicken', 25);
  expect(d.calls).toHaveLength(2);
  for (const { sql } of d.calls) {
    expect(sql).toMatch(/sodium_100g/);
    expect(sql).toMatch(/sugar_100g/);
  }
});

test('findLocalByBarcode selects them on the custom and global lookups', async () => {
  const d = recordingDb();
  await findLocalByBarcode('5012345678900', 'u1');
  expect(d.calls).toHaveLength(2); // custom first, then foods
  for (const { sql } of d.calls) {
    expect(sql).toMatch(/sodium_100g/);
    expect(sql).toMatch(/sugar_100g/);
  }
});

test('resolveFoodRef selects them for global and custom refs', async () => {
  const d = recordingDb();
  await resolveFoodRef('u1', 'global:abc');
  await resolveFoodRef('u1', 'custom:def');
  expect(d.calls).toHaveLength(2);
  for (const { sql } of d.calls) {
    expect(sql).toMatch(/sodium_100g/);
    expect(sql).toMatch(/sugar_100g/);
  }
});
