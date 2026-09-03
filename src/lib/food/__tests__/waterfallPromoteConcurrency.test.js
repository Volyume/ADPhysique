/**
 * _promoteAll (waterfall.js) used to await each live hit's cache-promotion
 * SQLite write in series -- a 10-result live search issued 10 sequential
 * round-trips before the results screen could render. D138 latency ruling:
 * promote concurrently via Promise.all. This pins that the writes are
 * actually issued concurrently (not just "fast"), and that the returned
 * order still matches the live results' order regardless of which write
 * settles first.
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
const { searchFoods } = require('../waterfall');

const offRow = (id) => ({
  food_ref: `off:${id}`, source: 'off_live', name: `Live ${id}`, brand: null,
  serving_g: 100, kcal_100g: 100, protein_100g: 10, carbs_100g: 10, fat_100g: 1,
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
});

test('a 10-hit live search issues all 10 promotion writes concurrently, not one at a time', async () => {
  searchLocalByName.mockResolvedValue([]); // no local hits -> falls through to network
  const offRows = Array.from({ length: 10 }, (_, i) => offRow(String(i)));
  searchOff.mockResolvedValue(offRows);

  let inFlight = 0;
  let maxInFlight = 0;
  const pendingResolvers = [];
  mockDb = {
    // Each promotion's first DB call. If the caller awaited these writes one
    // at a time, only one of these would ever be in flight simultaneously --
    // this fails maxInFlight === 1 in that case and passes at 10 once the
    // writes fan out via Promise.all.
    getFirstAsync: jest.fn(() => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise((resolve) => {
        pendingResolvers.push(() => { inFlight--; resolve(null); });
      });
    }),
    runAsync: jest.fn(async () => {}),
  };

  const resultPromise = searchFoods('u1', 'chicken');

  // Give every promotion call room to reach its first await (db() then
  // getFirstAsync) before any of them is allowed to resolve.
  for (let i = 0; i < 5; i++) await flush();

  expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(10);
  expect(maxInFlight).toBe(10);

  // Resolve them out of order (last-issued first) to prove the returned
  // order tracks the input rows, not settlement order.
  [...pendingResolvers].reverse().forEach((resolve) => resolve());

  const rows = await resultPromise;
  expect(rows.map((r) => r.name)).toEqual(offRows.map((r) => r.name));
  expect(rows.every((r) => r.food_ref.startsWith('global:'))).toBe(true);
});

test('dedupe on (source, source_id) still holds when promotions race concurrently', async () => {
  searchLocalByName.mockResolvedValue([]);
  // Two live rows resolve to the SAME (source, source_id): a real live
  // search shouldn't produce this, but a defensive concurrent-safety check
  // matters more, not less, once the writes are no longer serialised.
  searchOff.mockResolvedValue([offRow('dup'), offRow('dup')]);

  mockDb = {
    // No existing cached row yet.
    getFirstAsync: jest.fn(async () => null),
    // Simulate the SQLite unique index: the second concurrent insert for the
    // same (source, source_id) throws, exactly like the real uq_foods_source
    // _source_id constraint -- _promoteToLocal's existing race handler
    // catches this and re-reads.
    runAsync: jest.fn((() => {
      let inserted = false;
      return async () => {
        if (inserted) throw new Error('UNIQUE constraint failed: foods.source, foods.source_id');
        inserted = true;
      };
    })()),
  };
  // Second getFirstAsync (the two never actually resolve to "existing" up
  // front, so the raced insert's catch block re-reads); model that re-read.
  let getFirstCalls = 0;
  mockDb.getFirstAsync = jest.fn(async () => {
    getFirstCalls++;
    // First two calls (the up-front existing-row checks) find nothing;
    // the re-read inside the race handler finds the winner's row.
    return getFirstCalls > 2 ? { id: 'new-id' } : null;
  });

  const rows = await searchFoods('u1', 'chicken');
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => r.food_ref === 'global:new-id')).toBe(true);
});
