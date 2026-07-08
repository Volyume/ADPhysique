/**
 * Tests for the opportunistic re-fetch of a stale promoted network food
 * (audit §15 item 4), `refetchStaleFood` in src/lib/food/waterfall.js.
 *
 * Split from food.waterfall.test.js so this feature's mocks (a DB that
 * can already have an "existing" row, plus lookupUsdaById) don't disturb
 * the existing waterfall suite's assertions.
 *
 * Mocks every source module and the DB so no real network or SQLite is
 * exercised. Verifies: eligible rows re-fetch and update the cached row
 * via the promote path's refresh branch; ineligible rows (fresh, or a
 * non-network source) never touch the network; and a source failure
 * (miss or thrown error) leaves the cached row's write untouched.
 */

jest.mock('../food/sources/liveOff', () => ({
  searchOff: jest.fn(),
  lookupBarcodeOff: jest.fn(),
}));
jest.mock('../food/sources/usda', () => ({
  searchUsda: jest.fn(),
  lookupBarcodeUsda: jest.fn(),
  lookupUsdaById: jest.fn(),
}));
jest.mock('../food/sources/localCache', () => ({
  searchLocalByName: jest.fn(),
  findLocalByBarcode: jest.fn(),
}));

const mockDbWrites = [];
const mockGetFirstAsync = jest.fn(async () => ({ id: 'existing-local-id' }));
jest.mock('../database', () => ({
  db: async () => ({
    runAsync: async (sql, params) => { mockDbWrites.push({ sql, params }); },
    getFirstAsync: (...args) => mockGetFirstAsync(...args),
  }),
  uid: () => 'generated-uuid',
}));

jest.mock('../engineTelemetry', () => ({ track: jest.fn(async () => {}) }));

const { refetchStaleFood } = require('../food/waterfall');
const liveOff = require('../food/sources/liveOff');
const usda = require('../food/sources/usda');
const { STALE_THRESHOLD_MS } = require('../food/freshness');

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const STALE_OFF_FOOD = {
  food_ref: 'global:existing-local-id', source: 'off', source_id: '5001234567890',
  fetched_at: NOW - (STALE_THRESHOLD_MS + DAY_MS),
};
const STALE_USDA_FOOD = {
  food_ref: 'global:existing-local-id', source: 'usda', source_id: '654321',
  fetched_at: NOW - (STALE_THRESHOLD_MS + DAY_MS),
};

beforeEach(() => {
  mockDbWrites.length = 0;
  mockGetFirstAsync.mockReset();
  mockGetFirstAsync.mockImplementation(async () => ({ id: 'existing-local-id' }));
  liveOff.lookupBarcodeOff.mockReset();
  usda.lookupUsdaById.mockReset();
});

describe('refetchStaleFood eligibility gating', () => {
  test('a fresh off row never touches the network', async () => {
    const fresh = { ...STALE_OFF_FOOD, fetched_at: NOW - DAY_MS };
    const r = await refetchStaleFood('user-1', fresh);
    expect(r).toEqual({ refetched: false, reason: 'not_eligible' });
    expect(liveOff.lookupBarcodeOff).not.toHaveBeenCalled();
  });

  test('a custom-sourced food never touches the network however old', async () => {
    const custom = { food_ref: 'custom:1', source: 'custom', fetched_at: NOW - STALE_THRESHOLD_MS * 5 };
    const r = await refetchStaleFood('user-1', custom);
    expect(r).toEqual({ refetched: false, reason: 'not_eligible' });
    expect(liveOff.lookupBarcodeOff).not.toHaveBeenCalled();
    expect(usda.lookupUsdaById).not.toHaveBeenCalled();
  });

  test('a curated food never touches the network', async () => {
    const curated = { food_ref: 'curated:chicken', source: 'curated' };
    const r = await refetchStaleFood('user-1', curated);
    expect(r).toEqual({ refetched: false, reason: 'not_eligible' });
    expect(liveOff.lookupBarcodeOff).not.toHaveBeenCalled();
  });
});

describe('refetchStaleFood success path', () => {
  test('a stale off row re-fetches via lookupBarcodeOff and updates the existing row', async () => {
    liveOff.lookupBarcodeOff.mockResolvedValue({
      food_ref: 'off:5001234567890', source: 'off', name: 'Updated Name',
      kcal_100g: 111, protein_100g: 11, carbs_100g: 11, fat_100g: 1,
    });
    const r = await refetchStaleFood('user-1', { ...STALE_OFF_FOOD, food_ref: 'global:existing-local-id-A' });
    expect(r).toEqual({ refetched: true });
    expect(liveOff.lookupBarcodeOff).toHaveBeenCalledWith('5001234567890');
    const update = mockDbWrites.find((w) => /UPDATE foods/i.test(w.sql));
    expect(update).toBeTruthy();
    expect(update.sql).toMatch(/fetched_at\s*=\s*\?/);
    expect(update.params).toContain('Updated Name');
  });

  test('a stale usda row re-fetches via lookupUsdaById', async () => {
    usda.lookupUsdaById.mockResolvedValue({
      food_ref: 'usda:654321', source: 'usda', name: 'Updated USDA Item',
      kcal_100g: 200, protein_100g: 20, carbs_100g: 20, fat_100g: 2,
    });
    const r = await refetchStaleFood('user-1', { ...STALE_USDA_FOOD, food_ref: 'global:existing-local-id-B' });
    expect(r).toEqual({ refetched: true });
    expect(usda.lookupUsdaById).toHaveBeenCalledWith('654321');
  });
});

describe('refetchStaleFood failure leaves the cached row intact', () => {
  test('a source miss (network returns nothing) writes nothing and reports source_miss', async () => {
    liveOff.lookupBarcodeOff.mockResolvedValue(null);
    const r = await refetchStaleFood('user-1', { ...STALE_OFF_FOOD, food_ref: 'global:existing-local-id-C' });
    expect(r).toEqual({ refetched: false, reason: 'source_miss' });
    expect(mockDbWrites.find((w) => /UPDATE foods/i.test(w.sql))).toBeUndefined();
  });

  test('a source rejecting (network error/timeout) is swallowed, not thrown, and writes nothing', async () => {
    liveOff.lookupBarcodeOff.mockRejectedValue(new Error('network timeout'));
    await expect(
      refetchStaleFood('user-1', { ...STALE_OFF_FOOD, food_ref: 'global:existing-local-id-D' })
    ).resolves.toEqual({ refetched: false, reason: 'error' });
    expect(mockDbWrites.find((w) => /UPDATE foods/i.test(w.sql))).toBeUndefined();
  });

  test('a partial/macro-incomplete source response is treated as a miss, not written', async () => {
    liveOff.lookupBarcodeOff.mockResolvedValue({
      food_ref: 'off:5001234567890', source: 'off', name: 'Half Data',
      kcal_100g: 100, protein_100g: null, carbs_100g: 10, fat_100g: 1,
    });
    const r = await refetchStaleFood('user-1', { ...STALE_OFF_FOOD, food_ref: 'global:existing-local-id-E' });
    expect(r).toEqual({ refetched: false, reason: 'source_miss' });
    expect(mockDbWrites.find((w) => /UPDATE foods/i.test(w.sql))).toBeUndefined();
  });

  test('the DB update itself throwing is swallowed and still reports success at the promote layer (best-effort, never crashes)', async () => {
    liveOff.lookupBarcodeOff.mockResolvedValue({
      food_ref: 'off:5001234567890', source: 'off', name: 'Updated Name',
      kcal_100g: 111, protein_100g: 11, carbs_100g: 11, fat_100g: 1,
    });
    // Force the UPDATE write itself to throw; _promoteToLocal's inner
    // try/catch must swallow it and still resolve (never surfaces upward).
    let calls = 0;
    jest.spyOn(require('../database'), 'db').mockResolvedValueOnce({
      runAsync: async () => { calls += 1; throw new Error('disk full'); },
      getFirstAsync: async () => ({ id: 'existing-local-id' }),
    });
    await expect(
      refetchStaleFood('user-1', { ...STALE_OFF_FOOD, food_ref: 'global:existing-local-id-F' })
    ).resolves.toEqual({ refetched: true });
    expect(calls).toBe(1);
  });
});
