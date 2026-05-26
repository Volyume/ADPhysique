/**
 * Food-domain coordinator for the 7 tables that share the
 * food_sync_push / food_sync_pull bulk RPCs:
 *
 *   food_entries
 *   custom_foods
 *   saved_meals
 *   recipes
 *   food_favourites
 *   daily_water
 *   daily_intake_rollups  (pull-only — server-computed)
 *
 * Per-table dispatch via transport.pushTable / pullTable still
 * works: every food table registers a thin handler that calls
 * into this coordinator. The coordinator triggers the bulk RPC
 * exactly once per syncAll cycle and caches the per-table
 * counts; subsequent food-table handlers read from the cache.
 *
 * The runner calls `beginRun()` at the start of every syncAll
 * so a single sync cycle gets fresh caches without state
 * bleeding between cycles.
 *
 * Rationale: collapsing the bulk RPC into 7 separate per-table
 * RPCs would 7x the network round-trips on every sync, which is
 * a real cost on mobile (battery, latency). Server-side
 * refactoring food_sync_push into per-table endpoints is out of
 * scope per the CLAUDE.md release policy (the closed-test build
 * still expects the bulk shape). The coordinator preserves the
 * single-RPC efficiency while satisfying the registry-driven
 * per-table dispatch contract.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logSyncError } from '../telemetry';

const FOOD_LAST_PUSHED_KEY = (userId) => `@volyume_food_last_pushed_${userId}`;
const FOOD_LAST_PULLED_KEY = (userId) => `@volyume_food_last_pulled_${userId}`;

export const FOOD_DOMAIN_TABLES = Object.freeze([
  'food_entries',
  'custom_foods',
  'saved_meals',
  'recipes',
  'food_favourites',
  'daily_water',
  'daily_intake_rollups',
]);

const EMPTY_COUNTS = {
  food_entries: 0,
  custom_foods: 0,
  saved_meals: 0,
  recipes: 0,
  food_favourites: 0,
  daily_water: 0,
  daily_intake_rollups: 0,
};

let _pushResult = null;
let _pullResult = null;
let _pushPromise = null;
let _pullPromise = null;

/**
 * Reset cached coordinator state. Called by the runner at the
 * start of every syncAll cycle.
 */
export function beginRun() {
  _pushResult = null;
  _pullResult = null;
  _pushPromise = null;
  _pullPromise = null;
}

function _bucketFoodRow(r) {
  if (r.deleted_at) return 'deleted';
  if (r.created_at && r.updated_at && r.created_at === r.updated_at) return 'created';
  return 'updated';
}

function _foodEntryToCloud(r, userId) {
  return {
    id: r.id, user_id: userId, entry_date: r.entryDate, meal_slot: r.mealSlot,
    food_ref: r.foodRef, quantity_g: r.quantityG, kcal: r.kcal,
    protein_g: r.proteinG, carbs_g: r.carbsG, fat_g: r.fatG, fibre_g: r.fibreG ?? null,
    notes: r.notes ?? null,
    created_at: typeof r.createdAt === 'number' ? new Date(r.createdAt).toISOString() : r.createdAt,
    updated_at: typeof r.updatedAt === 'number' ? new Date(r.updatedAt).toISOString() : r.updatedAt,
    deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
  };
}

function _customFoodToCloud(r, userId) {
  return {
    id: r.id, user_id: userId, name: r.name, brand: r.brand ?? null,
    barcode_ean: r.barcodeEan ?? null,
    kcal_100g: r.kcal100g, protein_100g: r.protein100g, carbs_100g: r.carbs100g,
    fat_100g: r.fat100g, fibre_100g: r.fibre100g ?? null,
    serving_g: r.servingG ?? null, serving_label: r.servingLabel ?? null,
    created_at: typeof r.createdAt === 'number' ? new Date(r.createdAt).toISOString() : r.createdAt,
    updated_at: typeof r.updatedAt === 'number' ? new Date(r.updatedAt).toISOString() : r.updatedAt,
    deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
  };
}

function _savedMealToCloud(r, userId) {
  return {
    id: r.id, user_id: userId, name: r.name, slot: r.slot ?? null,
    foods_json: typeof r.foodsJson === 'string' ? r.foodsJson : JSON.stringify(r.foodsJson ?? []),
    created_at: typeof r.createdAt === 'number' ? new Date(r.createdAt).toISOString() : r.createdAt,
    updated_at: typeof r.updatedAt === 'number' ? new Date(r.updatedAt).toISOString() : r.updatedAt,
    deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
  };
}

function _recipeToCloud(r, userId) {
  return {
    id: r.id, user_id: userId, name: r.name, servings: r.servings ?? 1,
    notes: r.notes ?? null,
    created_at: typeof r.createdAt === 'number' ? new Date(r.createdAt).toISOString() : r.createdAt,
    updated_at: typeof r.updatedAt === 'number' ? new Date(r.updatedAt).toISOString() : r.updatedAt,
    deleted_at: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
  };
}

function _favouriteToCloud(r, userId) {
  return {
    user_id: userId, food_ref: r.foodRef,
    updated_at: typeof r.updatedAt === 'number' ? new Date(r.updatedAt).toISOString() : r.updatedAt,
  };
}

function _waterToCloud(r, userId) {
  return {
    user_id: userId, entry_date: r.entryDate, ml: r.ml,
    updated_at: typeof r.updatedAt === 'number' ? new Date(r.updatedAt).toISOString() : r.updatedAt,
  };
}

async function _doPushAll(sb, { userId, localUserId }) {
  // eslint-disable-next-line global-require
  const food = require('../../food/db');
  const key = FOOD_LAST_PUSHED_KEY(userId);
  const sinceStr = await AsyncStorage.getItem(key);
  const sinceMs = sinceStr ? Number(sinceStr) : 0;

  const [entries, customs, meals, recipesRows, favs, water] = await Promise.all([
    food.getAllFoodEntriesSince(localUserId, sinceMs),
    food.getAllCustomFoodsSince(localUserId, sinceMs),
    food.getAllSavedMealsSince(localUserId, sinceMs),
    food.getAllRecipesSince(localUserId, sinceMs),
    food.getAllFavouritesSince(localUserId, sinceMs),
    food.getAllWaterSince(localUserId, sinceMs),
  ]);

  const counts = { ...EMPTY_COUNTS };
  const bucket = (rows, mapper) => {
    const out = { created: [], updated: [], deleted: [] };
    for (const r of rows) out[_bucketFoodRow(r)].push(mapper(r, userId));
    return out;
  };

  const changes = {
    food_entries: bucket(entries, _foodEntryToCloud),
    custom_foods: bucket(customs, _customFoodToCloud),
    saved_meals: bucket(meals, _savedMealToCloud),
    recipes: bucket(recipesRows, _recipeToCloud),
    food_favourites: { created: [], updated: favs.map((f) => _favouriteToCloud(f, userId)), deleted: [] },
    daily_water: { created: [], updated: water.map((w) => _waterToCloud(w, userId)), deleted: [] },
  };

  counts.food_entries = entries.length;
  counts.custom_foods = customs.length;
  counts.saved_meals = meals.length;
  counts.recipes = recipesRows.length;
  counts.food_favourites = favs.length;
  counts.daily_water = water.length;

  const totalRows = counts.food_entries + counts.custom_foods + counts.saved_meals
    + counts.recipes + counts.food_favourites + counts.daily_water;
  if (totalRows === 0) return { counts: { ...EMPTY_COUNTS }, errors: 0 };

  const { data, error } = await sb.rpc('food_sync_push', { changes });
  if (error) {
    logSyncError('sync.tables.foodDomain.push', error);
    return { counts: { ...EMPTY_COUNTS }, errors: 1 };
  }

  const ts = data?.timestamp ?? new Date().toISOString();
  const tsMs = Date.parse(ts);
  if (Number.isFinite(tsMs)) {
    try { await AsyncStorage.setItem(key, String(tsMs)); } catch (_) { /* tolerate */ }
  }
  return { counts, errors: 0 };
}

async function _doPullAll(sb, { userId }) {
  const key = FOOD_LAST_PULLED_KEY(userId);
  const sinceStr = await AsyncStorage.getItem(key);
  const lastPulledAt = sinceStr
    ? new Date(Number(sinceStr)).toISOString()
    : new Date(0).toISOString();

  const { data, error } = await sb.rpc('food_sync_pull', { last_pulled_at: lastPulledAt });
  if (error) {
    logSyncError('sync.tables.foodDomain.pull', error);
    return { counts: { ...EMPTY_COUNTS }, errors: 1 };
  }

  const changes = data?.changes ?? {};
  // eslint-disable-next-line global-require
  const food = require('../../food/db');

  const counts = { ...EMPTY_COUNTS };
  const datesToRecompute = new Set();

  const applyGroup = async (table, applyFn, perRowSideEffect) => {
    const g = changes[table] ?? { created: [], updated: [], deleted: [] };
    const all = [...(g.created ?? []), ...(g.updated ?? []), ...(g.deleted ?? [])];
    let n = 0;
    for (const row of all) {
      try {
        const result = await applyFn(userId, row);
        if (perRowSideEffect) perRowSideEffect(row, result);
        n += 1;
      } catch (e) {
        logSyncError(`sync.tables.foodDomain.pull.${table}`, e);
      }
    }
    return n;
  };

  counts.food_entries = await applyGroup(
    'food_entries',
    food.applyFoodEntryFromCloud,
    (_row, date) => { if (date) datesToRecompute.add(date); },
  );
  counts.custom_foods = await applyGroup('custom_foods', food.applyCustomFoodFromCloud);
  counts.saved_meals = await applyGroup('saved_meals', food.applySavedMealFromCloud);
  counts.recipes = await applyGroup('recipes', food.applyRecipeFromCloud);
  counts.food_favourites = await applyGroup('food_favourites', food.applyFavouriteFromCloud);
  counts.daily_water = await applyGroup('daily_water', food.applyWaterFromCloud);

  if (typeof food.recomputeRollup === 'function') {
    for (const d of datesToRecompute) {
      try { await food.recomputeRollup(userId, d); } catch (_) { /* tolerate */ }
    }
  }

  // daily_intake_rollups is server-computed; the count of rolled
  // dates we recomputed locally is the best proxy.
  counts.daily_intake_rollups = datesToRecompute.size;

  const ts = data?.timestamp ?? new Date().toISOString();
  const tsMs = Date.parse(ts);
  if (Number.isFinite(tsMs)) {
    try { await AsyncStorage.setItem(key, String(tsMs)); } catch (_) { /* tolerate */ }
  }
  return { counts, errors: 0 };
}

/**
 * Per-table push handler factory. Every food-domain bidirectional
 * table registers via foodPushFor(table). The first call per run
 * triggers the bulk push; subsequent calls return their slice of
 * the cached counts.
 */
export function foodPushFor(tableName) {
  return async function pushFood(sb, ctx) {
    if (!sb || !ctx?.userId) return { count: 0, errors: 0 };
    try {
      if (!_pushPromise) {
        _pushPromise = _doPushAll(sb, ctx);
      }
      if (!_pushResult) {
        _pushResult = await _pushPromise;
      }
      return {
        count: _pushResult.counts[tableName] ?? 0,
        errors: _pushResult.errors,
      };
    } catch (e) {
      logSyncError(`sync.tables.foodDomain.push.${tableName}`, e);
      return { count: 0, errors: 1 };
    }
  };
}

/**
 * Per-table pull handler factory. Same caching model as
 * foodPushFor — the first food-pull call per run drives the bulk
 * pull; the rest read their per-table count from the cache.
 */
export function foodPullFor(tableName) {
  return async function pullFood(sb, ctx) {
    if (!sb || !ctx?.userId) return { count: 0, errors: 0 };
    try {
      if (!_pullPromise) {
        _pullPromise = _doPullAll(sb, ctx);
      }
      if (!_pullResult) {
        _pullResult = await _pullPromise;
      }
      return {
        count: _pullResult.counts[tableName] ?? 0,
        errors: _pullResult.errors,
      };
    } catch (e) {
      logSyncError(`sync.tables.foodDomain.pull.${tableName}`, e);
      return { count: 0, errors: 1 };
    }
  };
}
