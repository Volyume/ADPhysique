/**
 * Sync transport, per-table dispatch.
 *
 * Per-table dispatch (`pushTable` + `pullTable` + MIGRATED_TABLES). The
 * registry-driven path called by runner.js per SYNC_ARCHITECTURE_LOCKED.md
 * lines 156-238. Each table in MIGRATED_TABLES has its own push/pull handler
 * in src/lib/sync/tables/<table>.js; unmigrated tables fall back to the legacy
 * bulkUploadLocalData / pullFromCloud in src/lib/sync.js until their handler is
 * added here. This file lists the migrated tables explicitly so the runner can
 * iterate them deterministically and so removing a table from the legacy paths
 * is a single-grep operation.
 *
 * The food domain shares one bulk RPC pair via tables/foodDomain.js; the thin
 * pullChanges/pushChanges wrappers that used to sit here were unused and were
 * removed (audit B5).
 */

import { getRegistryEntry } from './registry';
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
import { pushDailySteps, pullDailySteps } from './tables/dailySteps';
import { pushCardioLog, pullCardioLog } from './tables/cardioLog';
import { pushProfiles, pullProfiles } from './tables/profiles';
import { pushPartners, pullPartners } from './tables/partners';
import { pushMealPlans, pullMealPlans } from './tables/mealPlans';
import { pushPlanFolders, pullPlanFolders } from './tables/planFolders';
import {
  FOOD_DOMAIN_TABLES,
  foodPushFor,
  foodPullFor,
  beginRun as beginFoodRun,
} from './tables/foodDomain';

export { beginFoodRun };

// Lazy require so the supabase client module (which pulls in
// react-native-url-polyfill at top-level) is not loaded merely by
// importing transport.js, that broke sync.runner.triggers.test.js,
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
  'daily_steps',
  'cardio_log',
  'partner_signals',
  'meal_plans',
  'plan_folders',
  ...FOOD_DOMAIN_TABLES,
  // recipe_ingredients after recipes (in FOOD_DOMAIN_TABLES) so the parent is
  // pushed and pulled before the child within a cycle (audit B6).
  'recipe_ingredients',
]);

const PUSH_HANDLERS = {
  notification_preferences: pushNotificationPreferences,
  weekly_checkins_v2: pushWeeklyCheckins,
  body_composition_log: pushBodyComposition,
  weight_log: pushWeightLog,
  nutrition_targets: pushNutritionTargets,
  profiles: pushProfiles,
  recipe_ingredients: pushRecipeIngredients,
  daily_steps: pushDailySteps,
  cardio_log: pushCardioLog,
  partner_signals: pushPartners,
  meal_plans: pushMealPlans,
  plan_folders: pushPlanFolders,
  // Pull-only tables intentionally absent, pushTable returns
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
  daily_steps: pullDailySteps,
  cardio_log: pullCardioLog,
  partner_signals: pullPartners,
  meal_plans: pullMealPlans,
  plan_folders: pullPlanFolders,
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
