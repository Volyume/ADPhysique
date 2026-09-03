/**
 * resolveSlotRecentRefs (D138 latency ruling): the diary's "Add again" rail
 * looped resolveSlotRecentRef once per recent-slot row. This batches every
 * 'meal:<id>' ref into one saved_meals IN (...) query and passes every
 * other ref straight through to localCache's resolveFoodRefs, exactly as
 * resolveSlotRecentRef passes straight through to resolveFoodRef.
 *
 * Pins equality against resolveSlotRecentRef ref for ref, including the
 * meal: branch's own shape (savedMealId/itemCount/serving_label), order
 * independence, and null for an unknown saved meal id.
 */
const SAVED_MEALS = {
  m1: {
    user_id: 'u1', name: 'Breakfast combo', deleted_at: null,
    items_json: JSON.stringify([
      { foodRef: 'global:f1', quantityG: 100, kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fibreG: 0 },
      { foodRef: 'global:f2', quantityG: 150, kcal: 195, proteinG: 4, carbsG: 42, fatG: 0.5, fibreG: 0.6 },
    ]),
  },
  m2: { // wrong user
    user_id: 'u2', name: 'Not mine', deleted_at: null,
    items_json: JSON.stringify([]),
  },
};

const FOODS = {
  f1: {
    source: 'off', name: 'Chicken breast', brand: null,
    serving_g: 100, serving_label: null,
    kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6, fibre_100g: 0,
    sodium_100g: 0, sugar_100g: 0, source_id: 's1', barcode_ean: null, fetched_at: 0,
  },
};

function makeDb() {
  return {
    getFirstAsync: jest.fn(async (sql, params) => {
      if (/FROM foods WHERE id = \?/.test(sql)) {
        const f = FOODS[params[0]];
        return f ? { food_ref: `global:${params[0]}`, ...f } : null;
      }
      if (/FROM saved_meals/.test(sql) && /id = \?/.test(sql)) {
        const [id, userId] = params;
        const m = SAVED_MEALS[id];
        if (!m || m.user_id !== userId || m.deleted_at) return null;
        return { id, name: m.name, items_json: m.items_json, created_at: 0, updated_at: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql, params) => {
      if (/FROM foods WHERE id IN/.test(sql)) {
        return params.map((id) => (FOODS[id] ? { food_ref: `global:${id}`, ...FOODS[id] } : null)).filter(Boolean);
      }
      if (/FROM saved_meals/.test(sql) && /id IN/.test(sql)) {
        const userId = params[params.length - 1];
        const ids = params.slice(0, -1);
        return ids
          .map((id) => {
            const m = SAVED_MEALS[id];
            if (!m || m.user_id !== userId || m.deleted_at) return null;
            return { id, name: m.name, items_json: m.items_json, created_at: 0, updated_at: 0 };
          })
          .filter(Boolean);
      }
      return [];
    }),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const { resolveSlotRecentRef, resolveSlotRecentRefs } = require('../db');

beforeEach(() => {
  jest.clearAllMocks();
  mockDb = makeDb();
});

const REFS = ['meal:m1', 'global:f1', 'meal:missing', 'meal:m2', 'global:missing'];

test('resolveSlotRecentRefs matches resolveSlotRecentRef ref-for-ref, order-independent', async () => {
  const single = {};
  for (const ref of REFS) single[ref] = await resolveSlotRecentRef('u1', ref);

  expect(single['meal:m1']).not.toBeNull();
  expect(single['meal:m1'].savedMealId).toBe('m1');
  expect(single['meal:m1'].itemCount).toBe(2);
  expect(single['global:f1']).not.toBeNull();
  expect(single['meal:missing']).toBeNull();
  expect(single['meal:m2']).toBeNull(); // wrong user
  expect(single['global:missing']).toBeNull();

  const batchMap = await resolveSlotRecentRefs('u1', [...REFS].reverse());
  for (const ref of REFS) {
    expect(batchMap.get(ref)).toEqual(single[ref]);
  }
});

test('a batch of only meal: refs issues one saved_meals query', async () => {
  await resolveSlotRecentRefs('u1', ['meal:m1', 'meal:missing']);
  const calls = mockDb.getAllAsync.mock.calls.filter(([sql]) => /FROM saved_meals/.test(sql));
  expect(calls).toHaveLength(1);
});

test('empty/absent input returns an empty map without touching the db', async () => {
  expect((await resolveSlotRecentRefs('u1', [])).size).toBe(0);
  expect((await resolveSlotRecentRefs('u1', undefined)).size).toBe(0);
  expect(mockDb.getAllAsync).not.toHaveBeenCalled();
  expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
});
