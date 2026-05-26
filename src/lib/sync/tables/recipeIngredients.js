/**
 * recipe_ingredients per-table push + pull.
 *
 * Registry entry: bidirectional + last_write_wins. The legacy
 * food domain bulk RPC does not include recipe_ingredients — it
 * was the one food child table that has been missing from
 * sync since the food domain shipped. This handler closes that
 * gap by pushing/pulling rows directly against the cloud table.
 *
 * Schema (both local and cloud):
 *   id TEXT PRIMARY KEY
 *   recipe_id TEXT NOT NULL
 *   food_ref TEXT NOT NULL
 *   quantity_g REAL NOT NULL
 *   order_index INTEGER
 *   user_id TEXT NOT NULL
 *   created_at INTEGER NOT NULL
 *
 * No updated_at and no soft-delete; LWW is effectively
 * last-push-wins which matches the recipe builder UX (you save
 * a recipe; the ingredient list replaces the previous one).
 */

import { logSyncError } from '../telemetry';

const PUSH_BATCH_SIZE = 200;

export async function pushRecipeIngredients(sb, { userId, localUserId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getAllRecipeIngredientsForUser } = require('../../database');
    const ingredients = await getAllRecipeIngredientsForUser(localUserId);
    if (!ingredients?.length) return { count: 0, errors: 0 };

    const rows = ingredients.map((r) => ({
      id: r.id,
      recipe_id: r.recipeId,
      food_ref: r.foodRef,
      quantity_g: r.quantityG,
      order_index: r.orderIndex ?? 0,
      user_id: userId,
      created_at: typeof r.createdAt === 'number'
        ? new Date(r.createdAt).toISOString()
        : r.createdAt,
    }));

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('recipe_ingredients')
        .upsert(batch, { onConflict: 'id' });
      if (error) {
        errors += 1;
        logSyncError('sync.tables.recipeIngredients.pushUpsert', error);
      } else {
        pushed += batch.length;
      }
    }
    return { count: pushed, errors };
  } catch (e) {
    logSyncError('sync.tables.recipeIngredients.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullRecipeIngredients(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('recipe_ingredients')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.recipeIngredients.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { upsertRecipeIngredientFromCloud } = require('../../database');
    let applied = 0;
    let errors = 0;
    for (const row of data) {
      try {
        await upsertRecipeIngredientFromCloud(userId, row);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.recipeIngredients.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.recipeIngredients.pull', e);
    return { count: 0, errors: 1 };
  }
}
