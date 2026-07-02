/**
 * searchFoods live-merge (E3 defect fix, dossier C7). The old behaviour —
 * ANY local hit suppresses ALL live results — meant one poor cached match hid
 * better OFF/USDA matches forever. Pins the approved behaviour:
 *   - a STRONG local answer (3+ hits including a prefix match) returns alone,
 *     with no network touch (the fast/offline path is preserved);
 *   - a WEAK local answer (few hits, or substring-only matches) renders FIRST
 *     and live results merge in below it, deduped by food_ref;
 *   - live rows are still cache-promoted exactly once per row;
 *   - offline (live sources return []) leaves the weak local rows standing;
 *   - no local and no live is still a miss.
 */
let mockDb;
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
}));

const { searchLocalByName } = require('../sources/localCache');
const { searchOff } = require('../sources/liveOff');
const { searchUsda } = require('../sources/usda');
const { track } = require('../../engineTelemetry');
const { searchFoods } = require('../waterfall');

const localRow = (id, rank = 0) => ({
  food_ref: `global:${id}`, source: 'off', name: `Local ${id}`, brand: null, rank,
});
const offRow = (id) => ({
  food_ref: `off:${id}`, source: 'off_live', name: `Live ${id}`, brand: null,
  serving_g: 100, kcal_100g: 100, protein_100g: 10, carbs_100g: 10, fat_100g: 1,
});

beforeEach(() => {
  jest.clearAllMocks();
  // Promotion path: no existing (source, source_id) row, insert succeeds.
  mockDb = {
    getFirstAsync: jest.fn(async () => null),
    runAsync: jest.fn(async () => {}),
  };
});

test('a strong local answer (3+ hits with a prefix match) returns alone, no network', async () => {
  searchLocalByName.mockResolvedValue([localRow('a'), localRow('b', 1), localRow('c', 1)]);
  const rows = await searchFoods('u1', 'chicken');
  expect(rows).toHaveLength(3);
  expect(searchOff).not.toHaveBeenCalled();
  expect(searchUsda).not.toHaveBeenCalled();
  expect(track).toHaveBeenCalledWith('u1', 'food_search_attempt',
    expect.objectContaining({ source_hit: 'local' }));
});

test('ONE local hit no longer suppresses live: local first, live merged below', async () => {
  searchLocalByName.mockResolvedValue([localRow('a')]);
  searchOff.mockResolvedValue([offRow('111'), offRow('222')]);
  const rows = await searchFoods('u1', 'chicken');
  expect(rows.map((r) => r.name)).toEqual(['Local a', 'Live 111', 'Live 222']);
  // Promoted refs replace the off: prefix (cache promotion ran).
  expect(rows[1].food_ref).toMatch(/^global:/);
  expect(track).toHaveBeenCalledWith('u1', 'food_search_attempt',
    expect.objectContaining({ source_hit: 'local_plus_live' }));
});

test('substring-only local hits (no prefix match) are weak even at 3+, so live merges', async () => {
  searchLocalByName.mockResolvedValue([localRow('a', 1), localRow('b', 1), localRow('c', 1)]);
  searchOff.mockResolvedValue([offRow('111')]);
  const rows = await searchFoods('u1', 'bread');
  expect(rows).toHaveLength(4);
  expect(searchOff).toHaveBeenCalled();
});

test('a live row already in the local set is deduped by food_ref', async () => {
  searchLocalByName.mockResolvedValue([localRow('exists')]);
  // Promotion finds the existing (source, source_id) row and returns its ref.
  mockDb.getFirstAsync = jest.fn(async () => ({ id: 'exists' }));
  searchOff.mockResolvedValue([offRow('exists')]);
  const rows = await searchFoods('u1', 'oats');
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe('Local exists');
});

test('offline: weak local rows stand alone when live returns nothing', async () => {
  searchLocalByName.mockResolvedValue([localRow('a')]);
  searchOff.mockResolvedValue([]);
  searchUsda.mockResolvedValue([]);
  const rows = await searchFoods('u1', 'porridge');
  expect(rows).toHaveLength(1);
  expect(track).toHaveBeenCalledWith('u1', 'food_search_attempt',
    expect.objectContaining({ source_hit: 'local' }));
});

test('no local: OFF answers as before; USDA only when OFF is empty', async () => {
  searchLocalByName.mockResolvedValue([]);
  searchOff.mockResolvedValue([]);
  searchUsda.mockResolvedValue([offRow('999')]);
  const rows = await searchFoods('u1', 'quinoa');
  expect(rows).toHaveLength(1);
  expect(track).toHaveBeenCalledWith('u1', 'food_search_attempt',
    expect.objectContaining({ source_hit: 'usda' }));
});

test('nothing anywhere is still a miss', async () => {
  searchLocalByName.mockResolvedValue([]);
  searchOff.mockResolvedValue([]);
  searchUsda.mockResolvedValue([]);
  expect(await searchFoods('u1', 'zzzz')).toEqual([]);
  expect(track).toHaveBeenCalledWith('u1', 'food_search_attempt',
    expect.objectContaining({ source_hit: 'miss' }));
});

test('the merged list respects the limit, local rows first', async () => {
  searchLocalByName.mockResolvedValue([localRow('a'), localRow('b', 1)]);
  searchOff.mockResolvedValue([offRow('1'), offRow('2'), offRow('3')]);
  const rows = await searchFoods('u1', 'rice', { limit: 4 });
  expect(rows).toHaveLength(4);
  expect(rows[0].name).toBe('Local a');
  expect(rows[1].name).toBe('Local b');
});
