/**
 * resolveFoodRefs (D138 latency ruling): the add-food and diary screens
 * looped resolveFoodRef one ref at a time -- up to 60 sequential SQLite
 * round-trips. This batches every ref kind (global/custom/curated/recipe)
 * into one IN (...) query per kind, chunked at 200 ids like seed.js's
 * CHUNK_SIZE.
 *
 * These tests pin that the batch function returns EXACTLY what
 * resolveFoodRef would return for the same ref, ref for ref, regardless of
 * input order, with null for anything resolveFoodRef itself would reject
 * (unknown id, wrong user, soft-deleted, unrecognised scope), and that a
 * request over 200 ids issues more than one chunked query.
 */
const FOODS = {
  f1: {
    source: 'off', name: 'Chicken breast', brand: null,
    serving_g: 100, serving_label: null,
    kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6, fibre_100g: 0,
    sodium_100g: 74, sugar_100g: 0,
    source_id: 'off1', barcode_ean: '5000000000001', fetched_at: 1000,
  },
  f2: {
    source: 'usda', name: 'White rice', brand: null,
    serving_g: 150, serving_label: 'cup',
    kcal_100g: 130, protein_100g: 2.7, carbs_100g: 28, fat_100g: 0.3, fibre_100g: 0.4,
    sodium_100g: 1, sugar_100g: 0.1,
    source_id: 'usda1', barcode_ean: null, fetched_at: 2000,
  },
};

const CUSTOMS = {
  c1: {
    user_id: 'u1', name: 'My shake', brand: 'Home',
    serving_g: 300, serving_label: 'bottle',
    kcal_100g: 80, protein_100g: 5, carbs_100g: 10, fat_100g: 2, fibre_100g: 1,
    sodium_100g: 20, sugar_100g: 8, deleted_at: null,
  },
  c2: { // soft-deleted -- must resolve to null for both single and batch
    user_id: 'u1', name: 'Deleted thing', brand: null,
    serving_g: 50, serving_label: null,
    kcal_100g: 10, protein_100g: 1, carbs_100g: 1, fat_100g: 1, fibre_100g: 0,
    sodium_100g: 0, sugar_100g: 0, deleted_at: 999,
  },
  c3: { // belongs to a different user -- must resolve to null for u1
    user_id: 'u2', name: "Someone else's food", brand: null,
    serving_g: 50, serving_label: null,
    kcal_100g: 10, protein_100g: 1, carbs_100g: 1, fat_100g: 1, fibre_100g: 0,
    sodium_100g: 0, sugar_100g: 0, deleted_at: null,
  },
};

const RECIPES = {
  r1: { user_id: 'u1', name: 'Chicken and rice', total_servings: 2, deleted_at: null },
};
const RECIPE_INGREDIENTS = {
  r1: [
    { food_ref: 'global:f1', quantity_g: 200 },
    { food_ref: 'global:f2', quantity_g: 300 },
  ],
};

function makeDb() {
  return {
    getFirstAsync: jest.fn(async (sql, params) => {
      if (/FROM foods WHERE id = \?/.test(sql)) {
        const f = FOODS[params[0]];
        return f ? { food_ref: `global:${params[0]}`, ...f } : null;
      }
      if (/FROM custom_foods/.test(sql) && /id = \?/.test(sql)) {
        const [id, userId] = params;
        const c = CUSTOMS[id];
        if (!c || c.user_id !== userId || c.deleted_at) return null;
        return { food_ref: `custom:${id}`, source: 'custom', ...c };
      }
      if (/FROM recipes/.test(sql) && /id = \?/.test(sql)) {
        const [id, userId] = params;
        const r = RECIPES[id];
        if (!r || r.user_id !== userId || r.deleted_at) return null;
        return { name: r.name, total_servings: r.total_servings };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql, params) => {
      if (/FROM foods WHERE id IN/.test(sql)) {
        return params.map((id) => (FOODS[id] ? { food_ref: `global:${id}`, ...FOODS[id] } : null)).filter(Boolean);
      }
      if (/FROM custom_foods/.test(sql) && /id IN/.test(sql)) {
        const userId = params[params.length - 1];
        const ids = params.slice(0, -1);
        return ids
          .map((id) => {
            const c = CUSTOMS[id];
            if (!c || c.user_id !== userId || c.deleted_at) return null;
            return { food_ref: `custom:${id}`, source: 'custom', ...c };
          })
          .filter(Boolean);
      }
      if (/FROM recipes/.test(sql) && /id IN/.test(sql)) {
        const userId = params[params.length - 1];
        const ids = params.slice(0, -1);
        return ids
          .map((id) => {
            const r = RECIPES[id];
            if (!r || r.user_id !== userId || r.deleted_at) return null;
            return { id, name: r.name, total_servings: r.total_servings };
          })
          .filter(Boolean);
      }
      if (/FROM recipe_ingredients/.test(sql) && /recipe_id = \?/.test(sql)) {
        return RECIPE_INGREDIENTS[params[0]] || [];
      }
      if (/FROM recipe_ingredients/.test(sql) && /recipe_id IN/.test(sql)) {
        const ids = params.slice(0, -1);
        const out = [];
        for (const id of ids) {
          for (const ing of RECIPE_INGREDIENTS[id] || []) out.push({ recipe_id: id, ...ing });
        }
        return out;
      }
      return [];
    }),
  };
}

let mockDb;
jest.mock('../../../database', () => ({ db: jest.fn(async () => mockDb) }));

const { resolveFoodRef, resolveFoodRefs } = require('../localCache');

beforeEach(() => {
  jest.clearAllMocks();
  mockDb = makeDb();
});

const REFS = ['global:f1', 'global:f2', 'custom:c1', 'curated:oats', 'recipe:r1', 'custom:c2', 'custom:c3', 'global:missing'];

test('resolveFoodRefs matches resolveFoodRef ref-for-ref, order-independent', async () => {
  const single = {};
  for (const ref of REFS) single[ref] = await resolveFoodRef('u1', ref);

  // Sanity: the fixtures actually exercise every branch (a hit and a miss
  // for each kind), so this test would fail loudly if the mock DB were
  // wrong rather than silently passing on all-nulls.
  expect(single['global:f1']).not.toBeNull();
  expect(single['custom:c1']).not.toBeNull();
  expect(single['curated:oats']).not.toBeNull();
  expect(single['recipe:r1']).not.toBeNull();
  expect(single['custom:c2']).toBeNull(); // soft-deleted
  expect(single['custom:c3']).toBeNull(); // wrong user
  expect(single['global:missing']).toBeNull();

  const shuffled = [...REFS].reverse();
  const batchMap = await resolveFoodRefs('u1', shuffled);

  for (const ref of REFS) {
    expect(batchMap.get(ref)).toEqual(single[ref]);
  }
});

test('duplicate refs in the input collapse to one entry, still correct', async () => {
  const map = await resolveFoodRefs('u1', ['global:f1', 'global:f1', 'custom:c1']);
  expect(map.size).toBe(2);
  expect(map.get('global:f1').name).toBe('Chicken breast');
  expect(map.get('custom:c1').name).toBe('My shake');
});

test('unrecognised scope, malformed ref, and unknown ids all resolve to null', async () => {
  const map = await resolveFoodRefs('u1', ['bogus', 'weird:', 'partner:xyz', 'global:missing', 'custom:missing', 'recipe:missing']);
  expect(map.get('bogus')).toBeNull();
  expect(map.get('weird:')).toBeNull();
  expect(map.get('partner:xyz')).toBeNull();
  expect(map.get('global:missing')).toBeNull();
  expect(map.get('custom:missing')).toBeNull();
  expect(map.get('recipe:missing')).toBeNull();
});

test('empty/absent input returns an empty map without touching the db', async () => {
  expect((await resolveFoodRefs('u1', [])).size).toBe(0);
  expect((await resolveFoodRefs('u1', null)).size).toBe(0);
  expect(mockDb.getAllAsync).not.toHaveBeenCalled();
  expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
});

test('chunks the IN (...) query at 200 ids', async () => {
  const bigFoods = {};
  for (let i = 0; i < 450; i++) {
    bigFoods[`g${i}`] = {
      source: 'off', name: `Food ${i}`, brand: null,
      serving_g: 100, serving_label: null,
      kcal_100g: 100, protein_100g: 1, carbs_100g: 1, fat_100g: 1, fibre_100g: 0,
      sodium_100g: 0, sugar_100g: 0, source_id: `s${i}`, barcode_ean: null, fetched_at: 0,
    };
  }
  mockDb.getAllAsync = jest.fn(async (sql, params) => {
    if (/FROM foods WHERE id IN/.test(sql)) {
      return params.map((id) => (bigFoods[id] ? { food_ref: `global:${id}`, ...bigFoods[id] } : null)).filter(Boolean);
    }
    return [];
  });

  const refs = Object.keys(bigFoods).map((id) => `global:${id}`);
  const map = await resolveFoodRefs('u1', refs);

  expect(map.size).toBe(450);
  const calls = mockDb.getAllAsync.mock.calls.filter(([sql]) => /FROM foods WHERE id IN/.test(sql));
  expect(calls).toHaveLength(3); // 200 + 200 + 50
  expect(calls[0][1]).toHaveLength(200);
  expect(calls[1][1]).toHaveLength(200);
  expect(calls[2][1]).toHaveLength(50);
});

test('recipe batch de-dupes a shared ingredient across two recipes into one lookup', async () => {
  RECIPES.r2 = { user_id: 'u1', name: 'Rice bowl', total_servings: 1, deleted_at: null };
  RECIPE_INGREDIENTS.r2 = [{ food_ref: 'global:f2', quantity_g: 100 }];

  const map = await resolveFoodRefs('u1', ['recipe:r1', 'recipe:r2']);
  expect(map.get('recipe:r1')).not.toBeNull();
  expect(map.get('recipe:r2')).not.toBeNull();

  const foodsIdCalls = mockDb.getAllAsync.mock.calls.filter(([sql]) => /FROM foods WHERE id IN/.test(sql));
  expect(foodsIdCalls).toHaveLength(1); // one shared query, not one per recipe
  expect(foodsIdCalls[0][1].sort()).toEqual(['f1', 'f2']);

  delete RECIPES.r2;
  delete RECIPE_INGREDIENTS.r2;
});
