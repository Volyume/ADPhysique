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
export async function findLocalByBarcode(ean) {
  if (!ean) return null;
  const d = await db();
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
 * Resolve a food_ref ('global:<uuid>' or 'custom:<uuid>') to its
 * stored row. Returns null if not found or soft-deleted.
 */
export async function resolveFoodRef(userId, foodRef) {
  if (!foodRef) return null;
  const d = await db();
  const [scope, id] = String(foodRef).split(':');
  if (!id) return null;
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
