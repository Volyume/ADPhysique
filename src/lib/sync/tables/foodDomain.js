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
 *   daily_intake_rollups  (pull-only, server-computed)
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
 * Resilience: the push sends one food_sync_push call PER non-empty
 * table, not one call carrying every table. A single RPC is one
 * transaction, so before this a failure in any one table (e.g. a
 * cloud column drift on daily_water) rolled the whole food domain
 * back and made every food table report an error. Per-table calls
 * isolate that: the healthy tables still commit and only the broken
 * table reports an error. Empty tables are skipped, so a typical
 * sync that touches one or two tables still makes one or two
 * round-trips, not seven. The RPC itself is unchanged (it already
 * guards each table with `IF changes ? '<table>'`), so the frozen
 * closed-test build, which sends all tables in one call, keeps
 * working exactly as before.
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

function _msToISOorNull(t) {
  if (t == null) return null;
  if (typeof t === 'string') return t;
  if (typeof t === 'number') return new Date(t).toISOString();
  return null;
}

// saved_meals.items_json is stored locally as a TEXT JSON array. Parse
// it to a real array for the push payload so it lands in the cloud's
// jsonb column as an array, not a quoted string. Tolerant of an already
// parsed array and of malformed/empty values (defaults to []).
function _parseItemsJson(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

// All food-domain mappers read snake_case fields off the raw
// SQLite rows returned by src/lib/food/db.js (which calls
// d.getAllAsync directly without a camelCase transform). An
// earlier extraction from the legacy sync.js introduced a
// regression where these mappers read camelCase (r.entryDate,
// r.mealSlot, etc.), which silently nulled every food row's
// per-column data on push. The regression-matrix test
// (sync.regressionMatrix.test.js) caught it; restored snake-case
// reads here match what production rows actually look like.

function _foodEntryToCloud(row, userId) {
  return {
    id: row.id,
    user_id: userId,
    entry_date: row.entry_date,
    meal_slot: row.meal_slot,
    food_ref: row.food_ref,
    quantity_g: row.quantity_g,
    kcal: row.kcal,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
    fibre_g: row.fibre_g ?? null,
    logged_at: _msToISOorNull(row.logged_at),
    created_at: _msToISOorNull(row.created_at),
    updated_at: _msToISOorNull(row.updated_at),
    deleted_at: _msToISOorNull(row.deleted_at),
  };
}

function _customFoodToCloud(row, userId) {
  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    brand: row.brand ?? null,
    barcode_ean: row.barcode_ean ?? null,
    kcal_100g: row.kcal_100g,
    protein_100g: row.protein_100g,
    carbs_100g: row.carbs_100g,
    fat_100g: row.fat_100g,
    fibre_100g: row.fibre_100g ?? null,
    serving_g: row.serving_g ?? null,
    serving_label: row.serving_label ?? null,
    created_at: _msToISOorNull(row.created_at),
    updated_at: _msToISOorNull(row.updated_at),
    deleted_at: _msToISOorNull(row.deleted_at),
  };
}

function _savedMealToCloud(row, userId) {
  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    // Canonical column is items_json (migrate_015 DDL + migrate_016
    // food_sync_push RPC + local schema + applySavedMealFromCloud all
    // agree). Emit the PARSED array, not the raw TEXT string: the cloud
    // column is jsonb and the RPC stores COALESCE(v_row->'items_json',
    // '[]'), so a JSON-encoded string would land as a quoted scalar
    // instead of an array. There is no slot/foods_json column; an
    // earlier draft invented both, which silently dropped every meal's
    // contents on sync (dormant until the saved-meals UI shipped).
    items_json: _parseItemsJson(row.items_json),
    created_at: _msToISOorNull(row.created_at),
    updated_at: _msToISOorNull(row.updated_at),
    deleted_at: _msToISOorNull(row.deleted_at),
  };
}

function _recipeToCloud(row, userId) {
  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    servings: row.servings ?? 1,
    notes: row.notes ?? null,
    created_at: _msToISOorNull(row.created_at),
    updated_at: _msToISOorNull(row.updated_at),
    deleted_at: _msToISOorNull(row.deleted_at),
  };
}

function _favouriteToCloud(row, userId) {
  // The local table column is `last_used_at`, not `updated_at`.
  // Pre-mig-048 code shipped `updated_at: null` which PostgREST
  // silently dropped, so the cloud row's `last_used_at` stayed
  // at DEFAULT now() on every push (wrong sort order on cross-
  // device restore). Ship the real value.
  // `kind` defaults to 'fav' for legacy rows that pre-date mig 048.
  return {
    user_id: userId,
    food_ref: row.food_ref,
    last_used_at: _msToISOorNull(row.last_used_at),
    kind: row.kind ?? 'fav',
  };
}

function _waterToCloud(row, userId) {
  return {
    user_id: userId,
    entry_date: row.entry_date,
    ml: row.ml,
    updated_at: _msToISOorNull(row.updated_at),
  };
}

// Local updated_at of a source row in ms. Rows come straight from the
// food_* tables where updated_at is an integer ms epoch; tolerate an ISO
// string just in case. Returns null when it can't be read.
function _rowUpdatedMs(r) {
  // food_favourites has no updated_at; its change-time column is last_used_at,
  // which is also what getAllFavouritesSince filters on. Without this fallback
  // a favourites-only push left latestTsMs null, so the shared watermark never
  // advanced and those rows re-pushed every cycle (re-audit finding).
  const v = r?.updated_at ?? r?.updatedAt ?? r?.last_used_at ?? r?.lastUsedAt;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
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

  const bucket = (rows, mapper) => {
    const out = { created: [], updated: [], deleted: [] };
    for (const r of rows) out[_bucketFoodRow(r)].push(mapper(r, userId));
    return out;
  };

  // One payload slice per table. Each is pushed in its own
  // food_sync_push call so a failure in one table can't roll back the
  // rest (see the resilience note in the file header).
  // Third tuple element is the SOURCE rows (not just a count) so the
  // watermark can advance to their newest local updated_at (see SYNC-5 below).
  const slices = [
    ['food_entries',    bucket(entries, _foodEntryToCloud),  entries],
    ['custom_foods',    bucket(customs, _customFoodToCloud),  customs],
    ['saved_meals',     bucket(meals, _savedMealToCloud),     meals],
    ['recipes',         bucket(recipesRows, _recipeToCloud),  recipesRows],
    ['food_favourites', { created: [], updated: favs.map((f) => _favouriteToCloud(f, userId)), deleted: [] }, favs],
    ['daily_water',     { created: [], updated: water.map((w) => _waterToCloud(w, userId)), deleted: [] }, water],
  ];

  const counts = { ...EMPTY_COUNTS };
  const errorsByTable = {};
  let anyError = false;
  let pushedAny = false;
  let latestTsMs = null;

  for (const [table, slice, rows] of slices) {
    if (rows.length === 0) continue; // nothing changed: skip the round-trip
    const { error } = await sb.rpc('food_sync_push', { changes: { [table]: slice } });
    if (error) {
      logSyncError(`sync.tables.foodDomain.push.${table}`, error);
      errorsByTable[table] = 1;
      anyError = true;
      continue;
    }
    counts[table] = rows.length;
    pushedAny = true;
    // SYNC-5: advance the watermark to the newest LOCAL updated_at among the
    // rows we actually pushed, NOT the server timestamp. The change query
    // filters on local updated_at (WHERE updated_at > sinceMs); comparing
    // that against a server clock could skip a row whose local updated_at
    // fell at/below the recorded server time (a row written during the RPC
    // round-trip, or under clock skew) and never push it. Keeping both sides
    // on one clock means anything written after this batch is strictly newer
    // than the watermark and gets picked up next cycle.
    for (const r of rows) {
      const ms = _rowUpdatedMs(r);
      if (ms !== null && (latestTsMs === null || ms > latestTsMs)) latestTsMs = ms;
    }
  }

  // Advance the shared watermark only when every non-empty table
  // succeeded. On a partial failure we leave it, so the tables that did
  // succeed re-push next cycle (idempotent via the RPC's ON CONFLICT)
  // and nothing is skipped past the watermark while one table is broken.
  if (pushedAny && !anyError && latestTsMs !== null) {
    try { await AsyncStorage.setItem(key, String(latestTsMs)); } catch (_) { /* tolerate */ }
  }

  return { counts, errorsByTable, errors: anyError ? 1 : 0 };
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
        // Only this table's own push outcome, so one table's failure no
        // longer reports as an error for every other food table.
        errors: _pushResult.errorsByTable?.[tableName] ?? 0,
      };
    } catch (e) {
      logSyncError(`sync.tables.foodDomain.push.${tableName}`, e);
      return { count: 0, errors: 1 };
    }
  };
}

/**
 * Per-table pull handler factory. Same caching model as
 * foodPushFor, the first food-pull call per run drives the bulk
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
