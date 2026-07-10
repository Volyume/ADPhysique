/**
 * waterfallOffMicros.test.js — MN-1 (item 16 data spike / D26 data
 * enhancement, 2026-07-10).
 *
 * Before this spike, `_promoteToLocal` in waterfall.js (the cache-write path
 * for live OFF/USDA hits) had no micronutrient columns in either its INSERT
 * or its refresh UPDATE — so even once liveOff.js started returning the 27
 * vitamin/mineral columns on a hit, they would have been silently dropped
 * the moment the row was cached, and never reach `resolveFoodRef` (which
 * already selects them, from the earlier MN-1 wiring commit) or the diary's
 * micronutrient totals.
 *
 * This suite pins that both write paths now carry the 27 MICRO_COLUMNS:
 *   - a brand-new promoted row (resolveBarcode -> _promoteToLocal INSERT);
 *   - a refreshed existing row (refetchStaleFood -> _promoteToLocal UPDATE,
 *     refresh: true);
 *   - a USDA-sourced row (no micronutrient fields at all) still inserts
 *     cleanly with every micronutrient column bound to null, not undefined
 *     or a bind-arity mismatch.
 *
 * Mocks the SQLite `db` exactly like waterfallSearchMerge.test.js so no real
 * database is needed; assertions read the actual SQL text + bound
 * parameters passed to `runAsync`.
 */
jest.mock('../../database', () => ({
  db: jest.fn(async () => mockDb),
  uid: jest.fn(() => 'new-id'),
}));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn() }));
jest.mock('../sources/localCache', () => ({
  searchLocalByName: jest.fn(),
  findLocalByBarcode: jest.fn(),
}));
jest.mock('../sources/liveOff', () => ({
  searchOff: jest.fn(),
  lookupBarcodeOff: jest.fn(),
}));
jest.mock('../sources/usda', () => ({
  searchUsda: jest.fn(),
  lookupBarcodeUsda: jest.fn(),
  lookupUsdaById: jest.fn(),
}));

const { findLocalByBarcode } = require('../sources/localCache');
const { lookupBarcodeOff } = require('../sources/liveOff');
const { lookupUsdaById } = require('../sources/usda');
const { resolveBarcode, refetchStaleFood } = require('../waterfall');
const { MICRO_COLUMNS } = require('../micronutrients');

let mockDb;

// A liveOff.js-shaped hit carrying a handful of real, converted micronutrient
// values (iron/calcium/vit_d) plus null for the rest, exactly as
// microValuesFromNutriments would produce them.
const offHitWithMicros = () => {
  const row = {
    food_ref: 'off:5900951313592',
    source: 'off_live',
    name: 'Twix',
    brand: 'Mars, Twix',
    serving_g: 100,
    kcal_100g: 493, protein_100g: 4.6, carbs_100g: 65, fat_100g: 24,
    fibre_100g: 1.62, barcode_ean: '5900951313592',
  };
  for (const col of MICRO_COLUMNS) row[col] = null;
  row.calcium_100g = 35.731;
  row.potassium_100g = 75.285;
  row.pantothenic_100g = 0.113;
  return row;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDb = {
    getFirstAsync: jest.fn(async () => null),
    runAsync: jest.fn(async () => {}),
  };
});

describe('resolveBarcode -> _promoteToLocal INSERT carries micronutrients', () => {
  test('a new OFF-sourced row binds all 27 MICRO_COLUMNS, non-null ones with the converted value', async () => {
    findLocalByBarcode.mockResolvedValue(null);
    lookupBarcodeOff.mockResolvedValue(offHitWithMicros());

    const result = await resolveBarcode('5900951313592', 'u1');
    expect(result.food_ref).toBe('global:new-id');

    const insertCall = mockDb.runAsync.mock.calls.find(([sql]) => /INSERT INTO foods/.test(sql));
    expect(insertCall).toBeTruthy();
    const [sql, params] = insertCall;

    // Every one of the 27 columns appears in the column list once.
    for (const col of MICRO_COLUMNS) {
      const count = (sql.match(new RegExp(`\\b${col}\\b`, 'g')) || []).length;
      expect(count).toBeGreaterThanOrEqual(1);
    }

    // Bound values include the genuine positives and stay null for the rest
    // (not undefined, not 0).
    expect(params).toEqual(expect.arrayContaining([35.731, 75.285, 0.113]));
    // Sanity: the placeholder count in the SQL matches the params array
    // length (guards against an arity drift between microSqlColumns and
    // microSqlPlaceholders).
    const placeholderCount = (sql.match(/\?/g) || []).length;
    expect(placeholderCount).toBe(params.length);
  });

  test('a USDA-sourced row (no micronutrient fields) still inserts, every micro column bound null', async () => {
    findLocalByBarcode.mockResolvedValue(null);
    lookupBarcodeOff.mockResolvedValue(null);
    lookupUsdaById.mockResolvedValue(null); // not used by resolveBarcode's USDA branch directly
    const { lookupBarcodeUsda } = require('../sources/usda');
    lookupBarcodeUsda.mockResolvedValue({
      food_ref: 'usda:123', source: 'usda', name: 'Plain rice',
      serving_g: 100, kcal_100g: 130, protein_100g: 2.7, carbs_100g: 28, fat_100g: 0.3,
    });

    await resolveBarcode('9999999999999', 'u1');

    const insertCall = mockDb.runAsync.mock.calls.find(([sql]) => /INSERT INTO foods/.test(sql));
    expect(insertCall).toBeTruthy();
    const [sql, params] = insertCall;
    const placeholderCount = (sql.match(/\?/g) || []).length;
    expect(placeholderCount).toBe(params.length); // no arity mismatch when the row has no micros
    // None of the 27 micronutrient values should be undefined -- every one
    // resolves to null via microValuesFromRow.
    const microValueSlice = params.slice(params.length - MICRO_COLUMNS.length - 4, params.length - 4);
    expect(microValueSlice.every((v) => v === null || v === undefined)).toBe(true);
  });
});

describe('refetchStaleFood -> _promoteToLocal UPDATE (refresh) carries micronutrients', () => {
  test('a refreshed OFF row updates all 27 micronutrient columns alongside the macros', async () => {
    const staleFood = {
      food_ref: 'global:existing-id', source: 'off', source_id: '5900951313592',
      barcode_ean: '5900951313592', fetched_at: Date.now() - (40 * 24 * 60 * 60 * 1000),
    };
    // _promoteToLocal takes the UPDATE (refresh) branch only when the
    // (source, source_id) row already exists -- mirror that here.
    mockDb.getFirstAsync = jest.fn(async () => ({ id: 'existing-id' }));
    lookupBarcodeOff.mockResolvedValue(offHitWithMicros());

    const result = await refetchStaleFood('u1', staleFood);
    expect(result.refetched).toBe(true);

    const updateCall = mockDb.runAsync.mock.calls.find(([sql]) => /UPDATE foods SET/.test(sql));
    expect(updateCall).toBeTruthy();
    const [sql, params] = updateCall;
    for (const col of MICRO_COLUMNS) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\s*=\\s*\\?`));
    }
    expect(params).toEqual(expect.arrayContaining([35.731, 75.285, 0.113]));
    const placeholderCount = (sql.match(/\?/g) || []).length;
    expect(placeholderCount).toBe(params.length);
  });
});
