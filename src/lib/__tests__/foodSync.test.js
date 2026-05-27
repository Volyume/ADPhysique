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
    // logged_at, created_at, updated_at as ms numbers
    expect(typeof params[11]).toBe('number');
    expect(params[11]).toBe(Date.parse('2026-05-23T08:15:00Z'));
    expect(params[12]).toBeNull(); // deleted_at
    expect(params[13]).toBe(params[11]); // created_at
    expect(params[14]).toBe(params[11]); // updated_at
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
    expect(params[12]).toBe(Date.parse('2026-05-22T15:00:00Z'));
  });

  test('returns null and skips the write when the row has no id', async () => {
    const { applyFoodEntryFromCloud } = require('../food/db');
    const out = await applyFoodEntryFromCloud(UID, { entry_date: '2026-05-23' });
    expect(out).toBeNull();
    expect(writes).toHaveLength(0);
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
  test('uses MAX(last_used_at) on conflict so a stale cloud row never overwrites a fresher local one', async () => {
    const { applyFavouriteFromCloud } = require('../food/db');
    await applyFavouriteFromCloud(UID, {
      food_ref: 'global:chicken',
      last_used_at: '2026-05-22T12:00:00Z',
    });
    const { sql } = writes[0];
    expect(sql).toMatch(/MAX\(food_favourites\.last_used_at, excluded\.last_used_at\)/);
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

  test('setFoodPreference(null) deletes the row', async () => {
    const { setFoodPreference } = require('../food/db');
    await setFoodPreference(UID, 'off:789', null);
    expect(writes[0].sql).toMatch(/^DELETE FROM food_favourites/);
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

  test('cycleFoodPreference: dislike -> none (deletes the row)', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ kind: 'dislike' });
    const { cycleFoodPreference } = require('../food/db');
    const next = await cycleFoodPreference(UID, 'off:33');
    expect(next).toBe(null);
    expect(writes.at(-1).sql).toMatch(/^DELETE FROM food_favourites/);
  });

  test('toggleFavourite back-compat: dislike flips straight to fav', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ kind: 'dislike' });
    const { toggleFavourite } = require('../food/db');
    const nowFav = await toggleFavourite(UID, 'off:44');
    expect(nowFav).toBe(true);
    expect(writes.at(-1).params[3]).toBe('fav');
  });

  test('toggleFavourite back-compat: fav clears (delete)', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ kind: 'fav' });
    const { toggleFavourite } = require('../food/db');
    const nowFav = await toggleFavourite(UID, 'off:55');
    expect(nowFav).toBe(false);
    expect(writes.at(-1).sql).toMatch(/^DELETE FROM food_favourites/);
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
      // kind absent — pre-mig-048 cloud row
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
