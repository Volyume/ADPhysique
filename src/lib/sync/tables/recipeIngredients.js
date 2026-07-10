/**
 * recipe_ingredients per-table push + pull.
 *
 * Bidirectional, last_write_wins, soft-delete. The food-domain
 * bulk RPC does not include this table, recipe_ingredients is
 * synced directly against the cloud table.
 *
 * Schema (matching both ends after the deleted_at + updated_at
 * additions):
 *   (user_id, id) PRIMARY KEY
 *   id          TEXT NOT NULL
 *   recipe_id   TEXT NOT NULL
 *   food_ref    TEXT NOT NULL
 *   quantity_g  REAL NOT NULL
 *   order_index INTEGER
 *   user_id     TEXT NOT NULL
 *   created_at  INTEGER NOT NULL
 *   updated_at  INTEGER NOT NULL  (backfilled = created_at for legacy rows)
 *   deleted_at  INTEGER NULL      (tombstone, soft delete)
 *
 * Push: read every row for the user including tombstones, map to
 * the cloud schema, upsert in 200-row batches on user_id + id. Tombstones
 * ship as rows with deleted_at set; the cloud side either accepts
 * them (creates / updates the tombstone) or its LWW gate rejects
 * (cloud row is newer than this client's delete).
 *
 * Pull: read every row for the user from the cloud, including
 * tombstones. For each row, compare local updated_at against
 * cloud updated_at; only upsert when the cloud is strictly newer
 * (LWW). Local writes that haven't synced yet are NOT clobbered.
 */

import { logSyncError } from '../telemetry';

const PUSH_BATCH_SIZE = 200;

function _toIso(ms) {
  if (!ms) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

function _toMs(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Date.parse(t) || 0;
  return 0;
}

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
      created_at: _toIso(r.createdAt) ?? new Date().toISOString(),
      updated_at: _toIso(r.updatedAt ?? r.createdAt) ?? new Date().toISOString(),
      deleted_at: r.deletedAt ? _toIso(r.deletedAt) : null,
    }));

    let pushed = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
      const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
      const { error } = await sb
        .from('recipe_ingredients')
        .upsert(batch, { onConflict: 'user_id,id' });
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
    const {
      upsertRecipeIngredientFromCloud,
      getRecipeIngredientUpdatedAt,
    } = require('../../database');
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    for (const row of data) {
      try {
        // LWW gate: skip cloud rows that the local copy has
        // already written past. Avoids the "pulled row echoes
        // back as fresh write" loop the Codex re-audit flagged
        // for notification_preferences (F4).
        const localUpdatedAt = await getRecipeIngredientUpdatedAt(userId, row.id);
        const cloudUpdatedAt = _toMs(row.updated_at);
        if (localUpdatedAt && cloudUpdatedAt && localUpdatedAt >= cloudUpdatedAt) {
          skipped += 1;
          continue;
        }
        await upsertRecipeIngredientFromCloud(userId, row);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.recipeIngredients.pullRow', e);
      }
    }
    return { count: applied, errors, ...(skipped ? { skipped } : {}) };
  } catch (e) {
    logSyncError('sync.tables.recipeIngredients.pull', e);
    return { count: 0, errors: 1 };
  }
}
