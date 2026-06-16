/**
 * findLocalByBarcode global-row ordering (food audit D-2). When multiple library
 * rows share a barcode, the lookup must be deterministic and prefer a verified,
 * macro-complete row rather than an arbitrary LIMIT 1.
 */
let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));

const { findLocalByBarcode } = require('../sources/localCache');

beforeEach(() => { jest.clearAllMocks(); });

test('global barcode lookup orders by verified, then macro completeness, then id', async () => {
  const calls = [];
  mockDb = { getFirstAsync: jest.fn(async (sql, params) => { calls.push({ sql, params }); return null; }) };
  await findLocalByBarcode('5012345678900'); // no userId -> straight to the foods table
  const sql = calls[0].sql;
  expect(sql).toMatch(/FROM foods/);
  expect(sql).toMatch(/ORDER BY verified DESC/);
  expect(sql).toMatch(/protein_100g IS NOT NULL\) \+ \(carbs_100g IS NOT NULL\) \+ \(fat_100g IS NOT NULL\) DESC/);
  expect(sql).toMatch(/id ASC/);
  expect(calls[0].params).toEqual(['5012345678900']);
});

test('returns null when nothing matches', async () => {
  mockDb = { getFirstAsync: jest.fn(async () => null) };
  expect(await findLocalByBarcode('0000000000000')).toBeNull();
});

test('no barcode -> no query', async () => {
  const getFirstAsync = jest.fn();
  mockDb = { getFirstAsync };
  expect(await findLocalByBarcode('')).toBeNull();
  expect(getFirstAsync).not.toHaveBeenCalled();
});
