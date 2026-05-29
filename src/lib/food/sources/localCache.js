/**
 * Local SQLite cache source for the food waterfall.
 *
 * Step 1 of the lookup waterfall: search foods + custom_foods in the
 * client SQLite cache. Latency target: <50ms. Hits when the user has
 * previously logged the food, when another device has synced it down,
 * or when the bundled OFF / CoFID snapshot loaded on first run.
 *
 * Locked in FOOD_DATA_STRATEGY_LOCKED.md.
 */
import { db } from '../../database';
import { CURATED_FOODS } from '../curatedFoods';

/**
 * Search local foods + custom_foods by name. Returns up to `limit`
 * matches ordered by relevance (exact prefix first, then substring).
 */
export async function searchLocalByName(userId, query, limit = 25) {
  const d = await db();
  const q = (query || '').trim().toLowerCase();
  if (q.length === 0) return [];
  const like = `${q}%`;
  const contains = `%${q}%`;

  // Prefix matches first on both tables, then substring matches.
  const globals = await d.getAllAsync(
    `SELECT
       'global:' || id AS food_ref, source, name, brand,
       serving_g, serving_label,
       kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
       CASE WHEN lower(name) LIKE ? THEN 0 ELSE 1 END AS rank
     FROM foods
     WHERE lower(name) LIKE ?
     ORDER BY rank, verified DESC, lower(name)
     LIMIT ?`,
    [like, contains, limit]
  );

  const customs = await d.getAllAsync(
    `SELECT
       'custom:' || id AS food_ref, 'custom' AS source, name, brand,
       serving_g, serving_label,
       kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
       CASE WHEN lower(name) LIKE ? THEN 0 ELSE 1 END AS rank
     FROM custom_foods
     WHERE user_id = ? AND deleted_at IS NULL AND lower(name) LIKE ?
     ORDER BY rank, lower(name)
     LIMIT ?`,
    [like, userId, contains, limit]
  );

  // Customs rank first (user's own data), then globals.
  return [...customs, ...globals].slice(0, limit);
}

/**
 * Look up a single food by barcode. Returns the first match or null.
 */
export async function findLocalByBarcode(ean, userId = null) {
  if (!ean) return null;
  const d = await db();

  // Search the user's custom foods first: an item they keyed in
  // themselves beats anything from the shared library, since they
  // chose to override it. Requires barcode_ean to have been written
  // when the custom food was created (Move #1.5 phase 3 onward).
  if (userId) {
    const customRow = await d.getFirstAsync(
      `SELECT
         'custom:' || id AS food_ref, 'custom' AS source, name, brand,
         serving_g, serving_label,
         kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g
       FROM custom_foods
       WHERE user_id = ? AND barcode_ean = ? AND deleted_at IS NULL
       LIMIT 1`,
      [userId, ean]
    );
    if (customRow) return customRow;
  }

  const row = await d.getFirstAsync(
    `SELECT
       'global:' || id AS food_ref, source, name, brand,
       serving_g, serving_label,
       kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g
     FROM foods
     WHERE barcode_ean = ?
     LIMIT 1`,
    [ean]
  );
  return row ?? null;
}

/**
 * Resolve a food_ref ('global:<uuid>', 'custom:<uuid>' or
 * 'curated:<key>') to its stored row. Returns null if not found or
 * soft-deleted.
 *
 * Curated refs come from the suggested-meal library (curatedFoods.js).
 * They have no database row, so they are resolved from that static
 * table. Without this the diary falls through to a generic "Food"
 * label for every item logged from a suggested meal.
 */
export async function resolveFoodRef(userId, foodRef) {
  if (!foodRef) return null;
  const [scope, id] = String(foodRef).split(':');
  if (!id) return null;
  if (scope === 'curated') {
    const f = CURATED_FOODS[id];
    if (!f) return null;
    return {
      food_ref: `curated:${id}`,
      source: 'curated',
      name: f.name,
      brand: null,
      serving_g: null,
      serving_label: null,
      kcal_100g: f.kcal,
      protein_100g: f.protein,
      carbs_100g: f.carbs,
      fat_100g: f.fat,
      fibre_100g: null,
    };
  }
  const d = await db();
  if (scope === 'global') {
    return d.getFirstAsync(
      `SELECT 'global:' || id AS food_ref, source, name, brand,
              serving_g, serving_label,
              kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g
       FROM foods WHERE id = ? LIMIT 1`,
      [id]
    );
  }
  if (scope === 'custom') {
    return d.getFirstAsync(
      `SELECT 'custom:' || id AS food_ref, 'custom' AS source, name, brand,
              serving_g, serving_label,
              kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g
       FROM custom_foods
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, userId]
    );
  }
  return null;
}
