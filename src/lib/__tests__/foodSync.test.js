/**
 * Tests for the food-domain sync layer.
 *
 * Covers the two halves wired in src/lib/sync.js:
 *   - applyXFromCloud helpers in food/db.js convert ISO timestamps to
 *     ms epoch and survive null/missing fields cleanly.
 *   - The cloud → local roundtrip preserves the row identity and
 *     respects soft-delete tombstones.
 *
 * Database is mocked via a thin in-memory recorder so we can assert
 * the SQL parameters without spinning up real SQLite.
 */

const mockWrites = [];
const mockGetAllAsync = jest.fn(async () => []);
const mockGetFirstAsync = jest.fn(async () => null);

jest.mock('../database', () => ({
  db: async () => ({
    runAsync: async (sql, params) => { mockWrites.push({ sql, params }); },
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
  }),
  // Mirror the real serialiser: this mock db has no withTransactionAsync,
  // so just run the task.
  runInTransaction: async (d, task) => (d.withTransactionAsync ? d.withTransactionAsync(task) : task()),
}));

beforeEach(() => {
  mockWrites.length = 0;
  mockGetAllAsync.mockClear();
  mockGetFirstAsync.mockClear();
});

const writes = mockWrites;

const UID = 'user-cloud-uid';

describe('applyFoodEntryFromCloud', () => {
  test('converts ISO timestamps to ms and uses the supabase uid as local user_id', async () => {
    const { applyFoodEntryFromCloud } = require('../food/db');
    const date = await applyFoodEntryFromCloud(UID, {
      id: 'fe-1',
      entry_date: '2026-05-23',
      meal_slot: 'breakfast',
      food_ref: 'global:abc',
      quantity_g: 150,
      kcal: 220,
      protein_g: 8,
      carbs_g: 40,
      fat_g: 4,
      fibre_g: 3,
      logged_at: '2026-05-23T08:15:00Z',
      created_at: '2026-05-23T08:15:00Z',
      updated_at: '2026-05-23T08:15:00Z',
      deleted_at: null,
    });
    expect(date).toBe('2026-05-23');
    expect(writes).toHaveLength(1);
    const { params } = writes[0];
    expect(params[0]).toBe('fe-1');
    expect(params[1]).toBe(UID);
    expect(params[2]).toBe('2026-05-23');
    expect(params[3]).toBe('breakfast');
    // weight_state (Ultimate-Audit item 12): defaults to 'as_weighed' when
    // the cloud row carries none.
    expect(params[11]).toBe('as_weighed');
    // eaten_at (Ultimate-Audit item 15, D22 15b): NULL here, never defaulted
    // to logged_at -- the cloud row carries no eaten_at at all.
    expect(params[12]).toBeNull();
    // logged_at, created_at, updated_at as ms numbers
    expect(typeof params[13]).toBe('number');
    expect(params[13]).toBe(Date.parse('2026-05-23T08:15:00Z'));
    expect(params[14]).toBeNull(); // deleted_at
    expect(params[15]).toBe(params[13]); // created_at
    expect(params[16]).toBe(params[13]); // updated_at
  });

  test('soft-delete tombstone surfaces as a non-null deleted_at', async () => {
    const { applyFoodEntryFromCloud } = require('../food/db');
    await applyFoodEntryFromCloud(UID, {
      id: 'fe-deleted',
      entry_date: '2026-05-22',
      meal_slot: 'snack',
      food_ref: 'custom:zzz',
      quantity_g: 30,
      kcal: 90, protein_g: 1, carbs_g: 22, fat_g: 0,
      fibre_g: null,
      logged_at: '2026-05-22T14:00:00Z',
      created_at: '2026-05-22T14:00:00Z',
      updated_at: '2026-05-22T15:00:00Z',
      deleted_at: '2026-05-22T15:00:00Z',
    });
    const { params } = writes[0];
    expect(params[14]).toBe(Date.parse('2026-05-22T15:00:00Z'));
  });

  test('returns null and skips the write when the row has no id', async () => {
    const { applyFoodEntryFromCloud } = require('../food/db');
    const out = await applyFoodEntryFromCloud(UID, { entry_date: '2026-05-23' });
    expect(out).toBeNull();
    expect(writes).toHaveLength(0);
  });

  test('F1: skips the write when the local row is the same age or newer (last-write-wins)', async () => {
    const { applyFoodEntryFromCloud } = require('../food/db');
    // Local copy was edited at 10:00 and has not pushed yet; the cloud delta
    // carries an older 09:00 version. Applying it would clobber the local edit.
    mockGetFirstAsync.mockResolvedValueOnce({ updated_at: Date.parse('2026-05-23T10:00:00Z') });
    const out = await applyFoodEntryFromCloud(UID, {
      id: 'fe-1', entry_date: '2026-05-23', meal_slot: 'breakfast', food_ref: 'global:abc',
      quantity_g: 150, kcal: 220, protein_g: 8, carbs_g: 40, fat_g: 4, fibre_g: 3,
      logged_at: '2026-05-23T08:00:00Z', created_at: '2026-05-23T08:00:00Z',
      updated_at: '2026-05-23T09:00:00Z', deleted_at: null,
    });
    expect(out).toBeNull();
    expect(writes).toHaveLength(0);
  });

  test('F1: applies when the cloud row is newer than the local copy', async () => {
    const { applyFoodEntryFromCloud } = require('../food/db');
    mockGetFirstAsync.mockResolvedValueOnce({ updated_at: Date.parse('2026-05-23T08:00:00Z') });
    const out = await applyFoodEntryFromCloud(UID, {
      id: 'fe-1', entry_date: '2026-05-23', meal_slot: 'breakfast', food_ref: 'global:abc',
      quantity_g: 150, kcal: 220, protein_g: 8, carbs_g: 40, fat_g: 4, fibre_g: 3,
      logged_at: '2026-05-23T08:00:00Z', created_at: '2026-05-23T08:00:00Z',
      updated_at: '2026-05-23T09:00:00Z', deleted_at: null,
    });
    expect(out).toBe('2026-05-23');
    expect(writes).toHaveLength(1);
  });
});

describe('applyCustomFoodFromCloud', () => {
  test('passes null through for optional macro columns', async () => {
    const { applyCustomFoodFromCloud } = require('../food/db');
    await applyCustomFoodFromCloud(UID, {
      id: 'cf-1',
      name: 'Tesco Finest sourdough',
      brand: 'Tesco',
      serving_g: 50,
      serving_label: '1 slice',
      kcal_100g: 240,
      protein_100g: 8,
      carbs_100g: 48,
      fat_100g: 1.2,
      fibre_100g: null,
      sodium_100g: null,
      sugar_100g: null,
      photo_url: null,
      notes: null,
      created_at: '2026-05-20T10:00:00Z',
      updated_at: '2026-05-20T10:00:00Z',
      deleted_at: null,
    });
    expect(writes).toHaveLength(1);
    const { params } = writes[0];
    expect(params[1]).toBe(UID);
    expect(params[2]).toBe('Tesco Finest sourdough');
    expect(params[10]).toBeNull(); // fibre_100g
    expect(params[11]).toBeNull(); // sodium_100g
    expect(params[12]).toBeNull(); // sugar_100g
    expect(params[15]).toBeNull(); // deleted_at
  });
});

describe('applySavedMealFromCloud', () => {
  test('stringifies items_json when the cloud row hands back parsed jsonb', async () => {
    const { applySavedMealFromCloud } = require('../food/db');
    await applySavedMealFromCloud(UID, {
      id: 'sm-1',
      name: 'Post-gym shake',
      items_json: [
        { food_ref: 'custom:whey', quantity_g: 30 },
        { food_ref: 'global:banana', quantity_g: 120 },
      ],
      created_at: '2026-05-20T18:00:00Z',
      updated_at: '2026-05-20T18:00:00Z',
      deleted_at: null,
    });
    const { params } = writes[0];
    const parsed = JSON.parse(params[3]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].food_ref).toBe('custom:whey');
  });

  test('accepts items_json already serialised as a string', async () => {
    const { applySavedMealFromCloud } = require('../food/db');
    await applySavedMealFromCloud(UID, {
      id: 'sm-2',
      name: 'Lunch',
      items_json: '[{"food_ref":"global:x","quantity_g":50}]',
      created_at: '2026-05-20T13:00:00Z',
      updated_at: '2026-05-20T13:00:00Z',
    });
    const { params } = writes[0];
    expect(params[3]).toBe('[{"food_ref":"global:x","quantity_g":50}]');
  });
});

describe('applyFavouriteFromCloud', () => {
  test('gates the conflict update on a newer-or-equal cloud row so a stale row never overwrites a fresher local one (food review D-M2)', async () => {
    const { applyFavouriteFromCloud } = require('../food/db');
    await applyFavouriteFromCloud(UID, {
      food_ref: 'global:chicken',
      last_used_at: '2026-05-22T12:00:00Z',
    });
    const { sql } = writes[0];
    // LWW on BOTH columns: the whole update is gated, so a stale cloud row is a
    // no-op (the old MAX(last_used_at) form left `kind` overwritable).
    expect(sql).toMatch(/WHERE excluded\.last_used_at >= food_favourites\.last_used_at/);
  });

  test('skips write when food_ref is missing', async () => {
    const { applyFavouriteFromCloud } = require('../food/db');
    await applyFavouriteFromCloud(UID, { last_used_at: '2026-05-22T12:00:00Z' });
    expect(writes).toHaveLength(0);
  });
});

describe('applyWaterFromCloud', () => {
  test('clamps negative ml values to 0', async () => {
    const { applyWaterFromCloud } = require('../food/db');
    await applyWaterFromCloud(UID, {
      entry_date: '2026-05-23',
      ml: -250,
      updated_at: '2026-05-23T09:00:00Z',
    });
    const { params } = writes[0];
    expect(params[2]).toBe(0);
  });

  test('only overwrites when the cloud row is fresher', async () => {
    const { applyWaterFromCloud } = require('../food/db');
    await applyWaterFromCloud(UID, {
      entry_date: '2026-05-23',
      ml: 750,
      updated_at: '2026-05-23T09:00:00Z',
    });
    const { sql } = writes[0];
    expect(sql).toMatch(/WHERE excluded\.updated_at >= daily_water\.updated_at/);
  });
});

describe('Sync row fetchers issue updated_at-bounded queries', () => {
  test('getAllFoodEntriesSince filters by updated_at > sinceMs', async () => {
    const { getAllFoodEntriesSince } = require('../food/db');
    await getAllFoodEntriesSince('local-uid', 1716_400_000_000);
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/updated_at > \?/),
      ['local-uid', 1716_400_000_000],
    );
  });

  test('getAllFavouritesSince filters by last_used_at > sinceMs', async () => {
    const { getAllFavouritesSince } = require('../food/db');
    await getAllFavouritesSince('local-uid', 1716_400_000_000);
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/last_used_at > \?/),
      ['local-uid', 1716_400_000_000],
    );
  });
});

// ─── Mig-048 food preference cycle (fav / dislike / none) ─────────────────

describe('food preference cycle (migration 048)', () => {
  test('setFoodPreference(fav) inserts/updates with kind=fav', async () => {
    const { setFoodPreference } = require('../food/db');
    await setFoodPreference(UID, 'off:123', 'fav');
    expect(writes).toHaveLength(1);
    expect(writes[0].sql).toMatch(/INSERT INTO food_favourites/);
    expect(writes[0].sql).toMatch(/ON CONFLICT\(user_id, food_ref\) DO UPDATE SET\s+kind = excluded\.kind/);
    expect(writes[0].params[0]).toBe(UID);
    expect(writes[0].params[1]).toBe('off:123');
    expect(writes[0].params[3]).toBe('fav');
  });

  test('setFoodPreference(dislike) writes kind=dislike', async () => {
    const { setFoodPreference } = require('../food/db');
    await setFoodPreference(UID, 'off:456', 'dislike');
    expect(writes[0].params[3]).toBe('dislike');
  });

  test('setFoodPreference(null) soft-deletes the row (D1-#8 tombstone)', async () => {
    const { setFoodPreference } = require('../food/db');
    await setFoodPreference(UID, 'off:789', null);
    // D1-#8: clearing a preference now sets deleted_at instead of a hard DELETE,
    // so the deletion propagates cross-device via the food sync `deleted` slice.
    expect(writes[0].sql).toMatch(/^UPDATE food_favourites/);
    expect(writes[0].sql).toMatch(/deleted_at = \?/);
  });

  test('setFoodPreference rejects an unknown kind', async () => {
    const { setFoodPreference } = require('../food/db');
    await expect(setFoodPreference(UID, 'off:1', 'unknown'))
      .rejects.toThrow(/invalid kind/);
  });

  test('cycleFoodPreference: none -> fav', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const { cycleFoodPreference } = require('../food/db');
    const next = await cycleFoodPreference(UID, 'off:11');
    expect(next).toBe('fav');
    expect(writes.at(-1).params[3]).toBe('fav');
  });

  test('cycleFoodPreference: fav -> dislike', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ kind: 'fav' });
    const { cycleFoodPreference } = require('../food/db');
    const next = await cycleFoodPreference(UID, 'off:22');
    expect(next).toBe('dislike');
    expect(writes.at(-1).params[3]).toBe('dislike');
  });

  test('cycleFoodPreference: dislike -> none (soft-deletes the row)', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ kind: 'dislike' });
    const { cycleFoodPreference } = require('../food/db');
    const next = await cycleFoodPreference(UID, 'off:33');
    expect(next).toBe(null);
    // D1-#8: soft-delete (set deleted_at), not a hard DELETE.
    expect(writes.at(-1).sql).toMatch(/^UPDATE food_favourites/);
    expect(writes.at(-1).sql).toMatch(/deleted_at = \?/);
  });

  test('toggleFavourite back-compat: dislike flips straight to fav', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ kind: 'dislike' });
    const { toggleFavourite } = require('../food/db');
    const nowFav = await toggleFavourite(UID, 'off:44');
    expect(nowFav).toBe(true);
    expect(writes.at(-1).params[3]).toBe('fav');
  });

  test('toggleFavourite back-compat: fav clears (soft-delete)', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ kind: 'fav' });
    const { toggleFavourite } = require('../food/db');
    const nowFav = await toggleFavourite(UID, 'off:55');
    expect(nowFav).toBe(false);
    // D1-#8: soft-delete (set deleted_at), not a hard DELETE.
    expect(writes.at(-1).sql).toMatch(/^UPDATE food_favourites/);
    expect(writes.at(-1).sql).toMatch(/deleted_at = \?/);
  });

  test('getFavourites filters to kind=fav only', async () => {
    const { getFavourites } = require('../food/db');
    await getFavourites(UID);
    expect(mockGetAllAsync).toHaveBeenLastCalledWith(
      expect.stringMatching(/WHERE user_id = \? AND kind = 'fav'/),
      [UID],
    );
  });

  test('getDislikes filters to kind=dislike only', async () => {
    const { getDislikes } = require('../food/db');
    await getDislikes(UID);
    expect(mockGetAllAsync).toHaveBeenLastCalledWith(
      expect.stringMatching(/WHERE user_id = \? AND kind = 'dislike'/),
      [UID],
    );
  });

  test('applyFavouriteFromCloud preserves kind=dislike on pull', async () => {
    const { applyFavouriteFromCloud } = require('../food/db');
    await applyFavouriteFromCloud(UID, {
      food_ref: 'off:99',
      last_used_at: '2026-05-27T08:00:00Z',
      kind: 'dislike',
    });
    expect(writes[0].sql).toMatch(/kind = excluded\.kind/);
    expect(writes[0].params[3]).toBe('dislike');
  });

  test('applyFavouriteFromCloud defaults pre-mig-048 rows to kind=fav', async () => {
    const { applyFavouriteFromCloud } = require('../food/db');
    await applyFavouriteFromCloud(UID, {
      food_ref: 'off:legacy',
      last_used_at: '2026-05-20T08:00:00Z',
      // kind absent, pre-mig-048 cloud row
    });
    expect(writes[0].params[3]).toBe('fav');
  });

  test('applyFavouriteFromCloud rejects malformed kind values (falls back to fav)', async () => {
    const { applyFavouriteFromCloud } = require('../food/db');
    await applyFavouriteFromCloud(UID, {
      food_ref: 'off:bad',
      last_used_at: '2026-05-20T08:00:00Z',
      kind: 'malformed',
    });
    expect(writes[0].params[3]).toBe('fav');
  });
});

// ─── Recipe CRUD ──────────────────────────────────────────────────────────

describe('recipes (CRUD helpers)', () => {
  test('createRecipe rejects blank name', async () => {
    const { createRecipe } = require('../food/db');
    await expect(createRecipe(UID, { name: '   ', totalServings: 4 }))
      .rejects.toThrow(/name is required/);
  });

  test('createRecipe rejects non-positive totalServings', async () => {
    const { createRecipe } = require('../food/db');
    await expect(createRecipe(UID, { name: 'Chilli', totalServings: 0 }))
      .rejects.toThrow(/totalServings must be > 0/);
    await expect(createRecipe(UID, { name: 'Chilli', totalServings: -2 }))
      .rejects.toThrow(/totalServings must be > 0/);
  });

  test('createRecipe writes a single INSERT with trimmed name + numeric servings', async () => {
    const { createRecipe } = require('../food/db');
    const id = await createRecipe(UID, { name: '  My Chilli  ', totalServings: 4, notes: 'spicy' });
    expect(typeof id).toBe('string');
    expect(writes).toHaveLength(1);
    expect(writes[0].sql).toMatch(/INSERT INTO recipes/);
    expect(writes[0].params[2]).toBe('My Chilli');
    expect(writes[0].params[3]).toBe(4);
    expect(writes[0].params[4]).toBe('spicy');
  });

  test('updateRecipe with no patch fields is a no-op (no SQL fires)', async () => {
    const { updateRecipe } = require('../food/db');
    await updateRecipe(UID, 'r-1', {});
    expect(writes).toHaveLength(0);
  });

  test('updateRecipe rejects a blank name', async () => {
    const { updateRecipe } = require('../food/db');
    await expect(updateRecipe(UID, 'r-1', { name: '  ' }))
      .rejects.toThrow(/name cannot be blank/);
  });

  test('updateRecipe only writes the fields present in the patch', async () => {
    const { updateRecipe } = require('../food/db');
    await updateRecipe(UID, 'r-1', { name: 'Updated' });
    expect(writes).toHaveLength(1);
    expect(writes[0].sql).toMatch(/SET name = \?, updated_at = \?\s+WHERE/);
  });

  test('deleteRecipe soft-deletes the recipe AND tombstones its ingredients', async () => {
    const { deleteRecipe } = require('../food/db');
    await deleteRecipe(UID, 'r-2');
    expect(writes).toHaveLength(2);
    expect(writes[0].sql).toMatch(/UPDATE recipes\s+SET deleted_at = \?/);
    expect(writes[1].sql).toMatch(/UPDATE recipe_ingredients\s+SET deleted_at = \?/);
  });

  test('listRecipes filters by deleted_at IS NULL and orders by updated_at DESC', async () => {
    const { listRecipes } = require('../food/db');
    await listRecipes(UID);
    expect(mockGetAllAsync).toHaveBeenLastCalledWith(
      expect.stringMatching(/WHERE user_id = \? AND deleted_at IS NULL\s+ORDER BY updated_at DESC/),
      [UID],
    );
  });

  test('getRecipeWithIngredients returns null when the recipe row is missing', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const { getRecipeWithIngredients } = require('../food/db');
    const result = await getRecipeWithIngredients(UID, 'r-missing');
    expect(result).toBeNull();
    // Should NOT have called the ingredients query
    expect(mockGetAllAsync).not.toHaveBeenCalled();
  });

  test('getRecipeWithIngredients merges the recipe row + ingredient rows', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ id: 'r-3', name: 'Chilli', total_servings: 4 });
    mockGetAllAsync.mockResolvedValueOnce([
      { id: 'i-1', food_ref: 'off:111', quantity_g: 200, order_index: 0 },
      { id: 'i-2', food_ref: 'off:222', quantity_g: 100, order_index: 1 },
    ]);
    const { getRecipeWithIngredients } = require('../food/db');
    const result = await getRecipeWithIngredients(UID, 'r-3');
    expect(result.id).toBe('r-3');
    expect(result.ingredients).toHaveLength(2);
    expect(result.ingredients[0].food_ref).toBe('off:111');
  });
});

describe('setRecipeIngredients', () => {
  // setRecipeIngredients runs inside a transaction; the test mock
  // executes the body immediately so we can assert the writes.
  beforeEach(() => {
    mockWrites.length = 0;
    mockGetAllAsync.mockReset();
    mockGetFirstAsync.mockReset();
  });

  function mockDb() {
    // Override the standard db() mock just for this block so it
    // exposes withTransactionAsync.
    const dbMock = {
      runAsync: async (sql, params) => { mockWrites.push({ sql, params }); },
      getAllAsync: mockGetAllAsync,
      getFirstAsync: mockGetFirstAsync,
      withTransactionAsync: async (fn) => { await fn(); },
    };
    jest.doMock('../database', () => ({
      db: async () => dbMock,
      runInTransaction: async (d, task) => (d.withTransactionAsync ? d.withTransactionAsync(task) : task()),
    }));
    jest.resetModules();
  }

  test('writes a tombstone update + one INSERT per new ingredient + updates the recipe row', async () => {
    mockDb();
    const { setRecipeIngredients } = require('../food/db');
    await setRecipeIngredients(UID, 'r-1', [
      { food_ref: 'off:111', quantity_g: 200 },
      { food_ref: 'off:222', quantity_g: 100 },
    ]);
    // 1 tombstone + 2 inserts + 1 recipe-updated_at bump
    expect(mockWrites).toHaveLength(4);
    expect(mockWrites[0].sql).toMatch(/UPDATE recipe_ingredients\s+SET deleted_at/);
    expect(mockWrites[1].sql).toMatch(/INSERT OR REPLACE INTO recipe_ingredients/);
    expect(mockWrites[1].params[4]).toBe(200);
    expect(mockWrites[1].params[5]).toBe(0);  // order_index 0
    expect(mockWrites[2].params[5]).toBe(1);  // order_index 1
    expect(mockWrites[3].sql).toMatch(/UPDATE recipes SET updated_at/);
  });

  test('skips ingredients with missing food_ref or non-positive quantity_g', async () => {
    mockDb();
    const { setRecipeIngredients } = require('../food/db');
    await setRecipeIngredients(UID, 'r-1', [
      { food_ref: 'off:111', quantity_g: 200 },     // OK
      { food_ref: '',         quantity_g: 100 },    // skip
      { food_ref: 'off:222',  quantity_g: 0 },      // skip
      { food_ref: 'off:333',  quantity_g: -10 },    // skip
      { food_ref: 'off:444',  quantity_g: 50 },     // OK
    ]);
    // 1 tombstone + 2 inserts (only valid rows) + 1 recipe bump
    expect(mockWrites).toHaveLength(4);
    expect(mockWrites[1].params[3]).toBe('off:111');
    expect(mockWrites[2].params[3]).toBe('off:444');
  });
});

describe('computeRecipeMacros', () => {
  test('sums kcal/protein/carbs/fat scaled by quantity_g / 100 across ingredients', () => {
    const { computeRecipeMacros } = require('../food/db');
    const result = computeRecipeMacros([
      { food: { kcal_100g: 200, protein_100g: 20, carbs_100g: 30, fat_100g: 5 }, quantity_g: 100 },
      { food: { kcal_100g: 100, protein_100g: 5,  carbs_100g: 20, fat_100g: 1 }, quantity_g: 200 },
    ], 4);
    expect(result.total.kcal).toBe(400);     // 200 + 200
    expect(result.total.protein).toBe(30);   // 20 + 10
    expect(result.total.carbs).toBe(70);     // 30 + 40
    expect(result.total.fat).toBe(7);        // 5 + 2
    expect(result.perServing.kcal).toBe(100);
    expect(result.perServing.protein).toBe(7.5);
    expect(result.perServing.carbs).toBe(17.5);
  });

  test('treats missing macro fields as 0', () => {
    const { computeRecipeMacros } = require('../food/db');
    const result = computeRecipeMacros([
      { food: { kcal_100g: 200 }, quantity_g: 100 },
    ], 1);
    expect(result.total.kcal).toBe(200);
    expect(result.total.protein).toBe(0);
    expect(result.total.carbs).toBe(0);
    expect(result.total.fat).toBe(0);
  });

  test('ignores ingredients with no resolved food (food was deleted upstream)', () => {
    const { computeRecipeMacros } = require('../food/db');
    const result = computeRecipeMacros([
      { food: null, quantity_g: 100 },
      { food: { kcal_100g: 100 }, quantity_g: 100 },
    ], 1);
    expect(result.total.kcal).toBe(100);
  });

  test('falls back to 1 serving when totalServings is missing or zero', () => {
    const { computeRecipeMacros } = require('../food/db');
    const result = computeRecipeMacros([
      { food: { kcal_100g: 200 }, quantity_g: 100 },
    ], 0);
    // totalServings = 0 should fall back to 1 (per-serving = total)
    expect(result.perServing.kcal).toBe(result.total.kcal);
  });
});
