/**
 * Sync transport — Supabase RPC wrappers and per-table dispatch.
 *
 * Two surfaces:
 *
 * 1. Food-domain RPC wrappers (`pullChanges` + `pushChanges`).
 *    Thin layer over the existing food_sync_pull / food_sync_push
 *    calls. Kept for the food-domain RPC contract that the closed-
 *    test build expects.
 *
 * 2. Per-table dispatch (`pushTable` + `pullTable` + MIGRATED_TABLES).
 *    The registry-driven path called by runner.js per
 *    SYNC_ARCHITECTURE_LOCKED.md lines 156-238. Each table in
 *    MIGRATED_TABLES has its own push/pull handler in
 *    src/lib/sync/tables/<table>.js; unmigrated tables fall back to
 *    the legacy bulkUploadLocalData / pullFromCloud in src/lib/sync.js
 *    until their handler is added here. This file lists the migrated
 *    tables explicitly so the runner can iterate them deterministically
 *    and so removing a table from the legacy paths is a single-grep
 *    operation.
 */

import { getRegistryEntry } from './registry';
import { logSyncError } from './telemetry';
import {
  pushNotificationPreferences,
  pullNotificationPreferences,
} from './tables/notificationPreferences';
import {
  pushWeeklyCheckins,
  pullWeeklyCheckins,
} from './tables/weeklyCheckins';
import {
  pushBodyComposition,
  pullBodyComposition,
} from './tables/bodyComposition';
import {
  pushNutritionTargets,
  pullNutritionTargets,
} from './tables/nutritionTargets';
import { pullEdPatternFlags } from './tables/edPatternFlags';
import { pullTierHistory } from './tables/tierHistory';
import {
  pushRecipeIngredients,
  pullRecipeIngredients,
} from './tables/recipeIngredients';
import { pushWeightLog, pullWeightLog } from './tables/weightLog';
import { pushProfiles, pullProfiles } from './tables/profiles';
import {
  FOOD_DOMAIN_TABLES,
  foodPushFor,
  foodPullFor,
  beginRun as beginFoodRun,
} from './tables/foodDomain';

export { beginFoodRun };

// Lazy require so the supabase client module (which pulls in
// react-native-url-polyfill at top-level) is not loaded merely by
// importing transport.js — that broke sync.runner.triggers.test.js,
// which expects to load the runner without dragging in the full
// supabase stack. Production callers still resolve the same module.
function _getSupabaseClient() {
  // eslint-disable-next-line global-require
  return require('../supabase').getSupabaseClient();
}

/**
 * Tables whose push + pull is owned by this transport (not by the
 * legacy bulkUploadLocalData / pullFromCloud helpers in sync.js).
 * Add a table here at the same time you (a) write its handler file
 * under tables/, (b) remove its call from the legacy bulk helpers,
 * and (c) extend the regression tests under __tests__/.
 */
// All 16 locked tables now flow through transport. The seven
// food-domain tables share one bulk RPC pair via
// src/lib/sync/tables/foodDomain.js; the others have dedicated
// handlers under tables/.
export const MIGRATED_TABLES = Object.freeze([
  'notification_preferences',
  'weekly_checkins_v2',
  'body_composition_log',
  'weight_log',
  'nutrition_targets',
  'profiles',
  'ed_pattern_flags',
  'tier_history',
  'recipe_ingredients',
  ...FOOD_DOMAIN_TABLES,
]);

const PUSH_HANDLERS = {
  notification_preferences: pushNotificationPreferences,
  weekly_checkins_v2: pushWeeklyCheckins,
  body_composition_log: pushBodyComposition,
  weight_log: pushWeightLog,
  nutrition_targets: pushNutritionTargets,
  profiles: pushProfiles,
  recipe_ingredients: pushRecipeIngredients,
  // Pull-only tables intentionally absent — pushTable returns
  // skipped:'pull_only' before reaching this map:
  //   ed_pattern_flags, tier_history, daily_intake_rollups.
  // Food-domain bidirectional tables share the coordinator:
  food_entries: foodPushFor('food_entries'),
  custom_foods: foodPushFor('custom_foods'),
  saved_meals: foodPushFor('saved_meals'),
  recipes: foodPushFor('recipes'),
  food_favourites: foodPushFor('food_favourites'),
  daily_water: foodPushFor('daily_water'),
};

const PULL_HANDLERS = {
  notification_preferences: pullNotificationPreferences,
  weekly_checkins_v2: pullWeeklyCheckins,
  body_composition_log: pullBodyComposition,
  weight_log: pullWeightLog,
  nutrition_targets: pullNutritionTargets,
  profiles: pullProfiles,
  ed_pattern_flags: pullEdPatternFlags,
  tier_history: pullTierHistory,
  recipe_ingredients: pullRecipeIngredients,
  // Food-domain tables share the coordinator (incl. pull-only
  // daily_intake_rollups which is reported as a count of dates
  // whose rollups were locally recomputed):
  food_entries: foodPullFor('food_entries'),
  custom_foods: foodPullFor('custom_foods'),
  saved_meals: foodPullFor('saved_meals'),
  recipes: foodPullFor('recipes'),
  food_favourites: foodPullFor('food_favourites'),
  daily_water: foodPullFor('daily_water'),
  daily_intake_rollups: foodPullFor('daily_intake_rollups'),
};

/**
 * Push one table's local changes to the cloud. Looks up the
 * registry entry, refuses pull-only tables, dispatches to the
 * per-table handler. Returns { count, errors, skipped? }.
 */
export async function pushTable(tableName, { userId, localUserId } = {}) {
  const entry = getRegistryEntry(tableName);
  if (!entry) {
    return { count: 0, errors: 1, reason: 'unknown_table' };
  }
  if (entry.direction === 'pull_only') {
    return { count: 0, errors: 0, skipped: 'pull_only' };
  }
  const handler = PUSH_HANDLERS[tableName];
  if (!handler) {
    return { count: 0, errors: 0, skipped: 'no_handler' };
  }
  const sb = _getSupabaseClient();
  if (!sb) {
    return { count: 0, errors: 0, skipped: 'no_client' };
  }
  return handler(sb, { userId, localUserId });
}

/**
 * Pull one table's remote changes into the local mirror. Returns
 * { count, errors }. Pull is supported for both bidirectional and
 * pull_only tables (anything in the registry).
 */
export async function pullTable(tableName, { userId } = {}) {
  const entry = getRegistryEntry(tableName);
  if (!entry) {
    return { count: 0, errors: 1, reason: 'unknown_table' };
  }
  const handler = PULL_HANDLERS[tableName];
  if (!handler) {
    return { count: 0, errors: 0, skipped: 'no_handler' };
  }
  const sb = _getSupabaseClient();
  if (!sb) {
    return { count: 0, errors: 0, skipped: 'no_client' };
  }
  return handler(sb, { userId });
}

/**
 * Pull changes since last_pulled_at. Returns the unwrapped
 * food_sync_pull response shape (timestamp + per-table changes).
 */
export async function pullChanges(lastPulledAt) {
  const sb = _getSupabaseClient();
  if (!sb) return { timestamp: null, changes: {} };
  const { data, error } = await sb.rpc('food_sync_pull', {
    _since: lastPulledAt ?? null,
  });
  if (error) {
    logSyncError('sync.transport.pullChanges', error);
    return { timestamp: null, changes: {} };
  }
  return data ?? { timestamp: null, changes: {} };
}

/**
 * Push pending changes. `changes` matches the food_sync_push shape:
 *   { food_entries: [{op, row}, ...], custom_foods: [...], ... }
 *
 * Returns the server response (per-record accepted/rejected/errored).
 */
export async function pushChanges(changes) {
  const sb = _getSupabaseClient();
  if (!sb) return { accepted: [], rejected: [], errored: [] };
  const { data, error } = await sb.rpc('food_sync_push', { _changes: changes ?? {} });
  if (error) {
    logSyncError('sync.transport.pushChanges', error);
    return { accepted: [], rejected: [], errored: [], _error: error };
  }
  return data ?? { accepted: [], rejected: [], errored: [] };
}
