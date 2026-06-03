/**
 * Tests for the food lookup waterfall orchestrator (src/lib/food/waterfall.js).
 *
 * Verifies first-hit-wins ordering, cache promotion of network results,
 * and the telemetry fire site for barcode lookups. Mocks each source
 * module so no real network calls or SQLite are exercised.
 *
 * Per TESTING_STRATEGY_LOCKED.md and FOOD_DATA_STRATEGY_LOCKED.md
 * waterfall ordering: local cache → live OFF → USDA, with manual /
 * OCR as a separate caller-side fallback.
 */

jest.mock('../food/sources/localCache', () => ({
  searchLocalByName: jest.fn(),
  findLocalByBarcode: jest.fn(),
}));
jest.mock('../food/sources/liveOff', () => ({
  searchOff: jest.fn(),
  lookupBarcodeOff: jest.fn(),
}));
jest.mock('../food/sources/usda', () => ({
  searchUsda: jest.fn(),
  lookupBarcodeUsda: jest.fn(),
}));

const mockDbWrites = [];
const mockGetFirstAsync = jest.fn(async () => null);
jest.mock('../database', () => ({
  db: async () => ({
    runAsync: async (sql, params) => { mockDbWrites.push({ sql, params }); },
    getFirstAsync: (...args) => mockGetFirstAsync(...args),
  }),
  uid: () => 'generated-uuid',
}));

const mockTrack = jest.fn(async () => {});
jest.mock('../engineTelemetry', () => ({
  track: (...args) => mockTrack(...args),
}));

const { searchFoods, resolveBarcode } = require('../food/waterfall');
const localCache = require('../food/sources/localCache');
const liveOff = require('../food/sources/liveOff');
const usda = require('../food/sources/usda');

const USER_ID = 'user-test';

beforeEach(() => {
  mockDbWrites.length = 0;
  mockGetFirstAsync.mockReset();
  mockGetFirstAsync.mockImplementation(async () => null);
  mockTrack.mockClear();
  Object.values(localCache).forEach(fn => fn.mockReset());
  Object.values(liveOff).forEach(fn => fn.mockReset());
  Object.values(usda).forEach(fn => fn.mockReset());
});

// ── searchFoods ───────────────────────────────────────────────────────

describe('searchFoods (text search waterfall)', () => {
  test('returns [] for a query under 2 chars without hitting any source', async () => {
    const r = await searchFoods(USER_ID, 'a');
    expect(r).toEqual([]);
    expect(localCache.searchLocalByName).not.toHaveBeenCalled();
    expect(liveOff.searchOff).not.toHaveBeenCalled();
    expect(usda.searchUsda).not.toHaveBeenCalled();
  });

  test('local hit short-circuits the waterfall: OFF and USDA not called', async () => {
    localCache.searchLocalByName.mockResolvedValue([
      { food_ref: 'global:local-1', source: 'off', name: 'Local Bread' },
    ]);
    const r = await searchFoods(USER_ID, 'bread');
    expect(r).toHaveLength(1);
    expect(r[0].food_ref).toBe('global:local-1');
    expect(liveOff.searchOff).not.toHaveBeenCalled();
    expect(usda.searchUsda).not.toHaveBeenCalled();
  });

  test('local empty -> OFF hit returns OFF promoted to local', async () => {
    localCache.searchLocalByName.mockResolvedValue([]);
    liveOff.searchOff.mockResolvedValue([
      {
        food_ref: 'off:5001234567890',
        source: 'off_live',
        name: 'OFF Chicken',
        kcal_100g: 165,
        protein_100g: 31,
        carbs_100g: 0,
        fat_100g: 3.6,
      },
    ]);
    const r = await searchFoods(USER_ID, 'chicken');
    expect(r).toHaveLength(1);
    expect(r[0].food_ref).toBe('global:generated-uuid');
    expect(usda.searchUsda).not.toHaveBeenCalled();
    // Cache promotion writes an INSERT into foods
    const insertWrite = mockDbWrites.find(w => /INSERT INTO foods/i.test(w.sql));
    expect(insertWrite).toBeTruthy();
  });

  test('local empty + OFF empty -> USDA hit returns USDA promoted', async () => {
    localCache.searchLocalByName.mockResolvedValue([]);
    liveOff.searchOff.mockResolvedValue([]);
    usda.searchUsda.mockResolvedValue([
      {
        food_ref: 'usda:123456',
        source: 'usda',
        name: 'USDA Cereal',
        kcal_100g: 380,
        protein_100g: 9,
        carbs_100g: 78,
        fat_100g: 2,
      },
    ]);
    const r = await searchFoods(USER_ID, 'cereal');
    expect(r).toHaveLength(1);
    expect(r[0].food_ref).toBe('global:generated-uuid');
  });

  test('all sources empty -> returns []', async () => {
    localCache.searchLocalByName.mockResolvedValue([]);
    liveOff.searchOff.mockResolvedValue([]);
    usda.searchUsda.mockResolvedValue([]);
    const r = await searchFoods(USER_ID, 'unobtanium');
    expect(r).toEqual([]);
  });
});

// ── resolveBarcode ────────────────────────────────────────────────────

describe('resolveBarcode (barcode lookup waterfall)', () => {
  test('returns null for empty input', async () => {
    const r = await resolveBarcode(null);
    expect(r).toBeNull();
    expect(localCache.findLocalByBarcode).not.toHaveBeenCalled();
  });

  test('local hit returns local row and emits local-hit telemetry', async () => {
    localCache.findLocalByBarcode.mockResolvedValue({
      food_ref: 'global:cached-1',
      source: 'off',
      name: 'Cached Yogurt',
    });
    const r = await resolveBarcode('5001234567890', USER_ID);
    expect(r.food_ref).toBe('global:cached-1');
    expect(liveOff.lookupBarcodeOff).not.toHaveBeenCalled();
    expect(usda.lookupBarcodeUsda).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(USER_ID, 'food_lookup_barcode',
      expect.objectContaining({ source: 'local' }));
    // HP-2: the scanned barcode is dietary content and must not be in
    // telemetry. Guard against a silent re-introduction.
    const payload = mockTrack.mock.calls.find(c => c[1] === 'food_lookup_barcode')?.[2] ?? {};
    expect(payload).not.toHaveProperty('ean');
  });

  test('local miss + OFF hit promotes to local and emits off_live telemetry', async () => {
    localCache.findLocalByBarcode.mockResolvedValue(null);
    liveOff.lookupBarcodeOff.mockResolvedValue({
      food_ref: 'off:5009999999999',
      source: 'off_live',
      name: 'OFF Live Hit',
      kcal_100g: 100,
      protein_100g: 5,
      carbs_100g: 15,
      fat_100g: 2,
    });
    const r = await resolveBarcode('5009999999999', USER_ID);
    expect(r.food_ref).toBe('global:generated-uuid');
    expect(usda.lookupBarcodeUsda).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(USER_ID, 'food_lookup_barcode',
      expect.objectContaining({ source: 'off_live' }));
    const insertWrite = mockDbWrites.find(w => /INSERT INTO foods/i.test(w.sql));
    expect(insertWrite).toBeTruthy();
  });

  test('local + OFF miss, USDA hit promotes and emits usda telemetry', async () => {
    localCache.findLocalByBarcode.mockResolvedValue(null);
    liveOff.lookupBarcodeOff.mockResolvedValue(null);
    usda.lookupBarcodeUsda.mockResolvedValue({
      food_ref: 'usda:42',
      source: 'usda',
      name: 'USDA Branded Item',
      kcal_100g: 200,
      protein_100g: 10,
      carbs_100g: 25,
      fat_100g: 8,
    });
    const r = await resolveBarcode('0123456789012', USER_ID);
    expect(r.food_ref).toBe('global:generated-uuid');
    expect(mockTrack).toHaveBeenCalledWith(USER_ID, 'food_lookup_barcode',
      expect.objectContaining({ source: 'usda' }));
  });

  test('all sources miss returns null and emits miss telemetry', async () => {
    localCache.findLocalByBarcode.mockResolvedValue(null);
    liveOff.lookupBarcodeOff.mockResolvedValue(null);
    usda.lookupBarcodeUsda.mockResolvedValue(null);
    const r = await resolveBarcode('9999999999999', USER_ID);
    expect(r).toBeNull();
    expect(mockTrack).toHaveBeenCalledWith(USER_ID, 'food_lookup_barcode',
      expect.objectContaining({ source: 'miss' }));
  });

  test('lookup without userId still resolves but emits no telemetry', async () => {
    localCache.findLocalByBarcode.mockResolvedValue({
      food_ref: 'global:cached-anon',
      source: 'off',
      name: 'Anon Cache Hit',
    });
    const r = await resolveBarcode('5001234567890', null);
    expect(r.food_ref).toBe('global:cached-anon');
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
