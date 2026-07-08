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
import { microSqlColumns } from '../micronutrients';

// The columns every search/lookup row carries. sodium_100g / sugar_100g ride
// along for the food-detail display rows (gap #16 sugars, E4 sodium):
// display-only; scaleSugarG/scaleSodiumMg treat null as "no data".
const FOOD_COL_LIST = [
  'serving_g', 'serving_label',
  'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g', 'fibre_100g',
  'sodium_100g', 'sugar_100g',
];
const FOOD_COLS = FOOD_COL_LIST.join(', ');
const foodColsAs = (alias) => FOOD_COL_LIST.map((c) => `${alias}.${c}`).join(', ');

/**
 * Build an FTS5 MATCH expression from free text (E3): each word becomes a
 * quoted prefix token, so "chick brea" finds "Chicken Breast" and the porter
 * tokenizer's stemming covers inflections on whole words. Quoting neutralises
 * every FTS operator (AND/OR/NEAR/^/-), so user text can never be parsed as
 * query syntax. Returns null when nothing tokenisable remains.
 */
export function toFtsMatch(query) {
  const tokens = String(query || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '')}"*`).join(' ');
}

/**
 * Search local foods + custom_foods by name (+ brand under FTS). E3: the
 * first attempt is the FTS5 index (word-prefix + porter stemming, bm25
 * relevance); if the index is unavailable (FTS5 not compiled in, or the
 * migration skipped it) the LIKE path below answers exactly as before.
 * Both paths return the same row shape, with `rank` 0 for an exact
 * name-prefix match and 1 otherwise — the waterfall's local-confidence
 * check reads it (see waterfall._localIsStrong).
 *
 * Customs rank first (user's own data), then globals.
 */
export async function searchLocalByName(userId, query, limit = 25) {
  const d = await db();
  const q = (query || '').trim().toLowerCase();
  if (q.length === 0) return [];

  const match = toFtsMatch(q);
  if (match) {
    try {
      return await _searchFts(d, userId, q, match, limit);
    } catch (_) {
      // No FTS index on this install (or a match-syntax edge): the LIKE
      // fallback below is the complete pre-E3 behaviour.
    }
  }
  return _searchLike(d, userId, q, limit);
}

async function _searchFts(d, userId, q, match, limit) {
  const like = `${q}%`;
  const globals = await d.getAllAsync(
    `SELECT
       'global:' || f.id AS food_ref, f.source, f.name, f.brand,
       ${foodColsAs('f')},
       f.source_id, f.barcode_ean, f.fetched_at,
       CASE WHEN lower(f.name) LIKE ? THEN 0 ELSE 1 END AS rank
     FROM foods_fts
     JOIN foods f ON f.rowid = foods_fts.rowid
     WHERE foods_fts MATCH ?
     ORDER BY rank, f.verified DESC, bm25(foods_fts)
     LIMIT ?`,
    [like, match, limit]
  );
  const customs = await d.getAllAsync(
    `SELECT
       'custom:' || c.id AS food_ref, 'custom' AS source, c.name, c.brand,
       ${foodColsAs('c')},
       CASE WHEN lower(c.name) LIKE ? THEN 0 ELSE 1 END AS rank
     FROM custom_foods_fts
     JOIN custom_foods c ON c.rowid = custom_foods_fts.rowid
     WHERE custom_foods_fts MATCH ? AND c.user_id = ? AND c.deleted_at IS NULL
     ORDER BY rank, bm25(custom_foods_fts)
     LIMIT ?`,
    [like, match, userId, limit]
  );
  return [...customs, ...globals].slice(0, limit);
}

async function _searchLike(d, userId, q, limit) {
  const like = `${q}%`;
  const contains = `%${q}%`;

  // Prefix matches first on both tables, then substring matches.
  const globals = await d.getAllAsync(
    `SELECT
       'global:' || id AS food_ref, source, name, brand,
       ${FOOD_COLS},
       source_id, barcode_ean, fetched_at,
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
       ${FOOD_COLS},
       CASE WHEN lower(name) LIKE ? THEN 0 ELSE 1 END AS rank
     FROM custom_foods
     WHERE user_id = ? AND deleted_at IS NULL AND lower(name) LIKE ?
     ORDER BY rank, lower(name)
     LIMIT ?`,
    [like, userId, contains, limit]
  );

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
         kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
         sodium_100g, sugar_100g
       FROM custom_foods
       WHERE user_id = ? AND barcode_ean = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
      [userId, ean]
    );
    if (customRow) return customRow;
  }

  // When several library rows share a barcode (e.g. the bundled snapshot plus a
  // promoted live hit, or an OFF + CoFID duplicate), prefer a verified row, then
  // the most macro-complete one, then a stable id tiebreak — instead of the old
  // nondeterministic LIMIT 1 that could surface a half-empty row (food audit D-2).
  const row = await d.getFirstAsync(
    `SELECT
       'global:' || id AS food_ref, source, name, brand,
       serving_g, serving_label,
       kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
       sodium_100g, sugar_100g,
       source_id, barcode_ean, fetched_at
     FROM foods
     WHERE barcode_ean = ?
     ORDER BY verified DESC,
       (protein_100g IS NOT NULL) + (carbs_100g IS NOT NULL) + (fat_100g IS NOT NULL) DESC,
       id ASC
     LIMIT 1`,
    [ean]
  );
  return row ?? null;
}

/**
 * Resolve a food_ref ('global:<uuid>', 'custom:<uuid>', 'curated:<key>'
 * or 'recipe:<uuid>') to a food-shaped row. Returns null if not found
 * or soft-deleted.
 *
 * Curated refs come from the suggested-meal library (curatedFoods.js).
 * They have no database row, so they are resolved from that static
 * table. Recipe refs are resolved by summing the recipe's ingredients
 * into a per-100g profile so a logged recipe shows as one named line
 * and rescales on edit. Without these the diary falls through to a
 * generic "Food" label.
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
              kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
              sodium_100g, sugar_100g, ${microSqlColumns},
              source_id, barcode_ean, fetched_at
       FROM foods WHERE id = ? LIMIT 1`,
      [id]
    );
  }
  if (scope === 'custom') {
    return d.getFirstAsync(
      `SELECT 'custom:' || id AS food_ref, 'custom' AS source, name, brand,
              serving_g, serving_label,
              kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
              sodium_100g, sugar_100g, ${microSqlColumns}
       FROM custom_foods
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, userId]
    );
  }
  if (scope === 'recipe') {
    const recipe = await d.getFirstAsync(
      `SELECT name, total_servings FROM recipes
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, userId]
    );
    if (!recipe) return null;
    const ings = await d.getAllAsync(
      `SELECT food_ref, quantity_g FROM recipe_ingredients
       WHERE recipe_id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    let kcal = 0, protein = 0, carbs = 0, fat = 0, fibre = 0, grams = 0;
    for (const ing of ings || []) {
      const q = Number(ing.quantity_g);
      // Recipes never nest recipes (the builder only adds foods), but
      // guard against it so resolution can never recurse on itself.
      if (!Number.isFinite(q) || q <= 0 || String(ing.food_ref).startsWith('recipe:')) continue;
      const f = await resolveFoodRef(userId, ing.food_ref);
      if (!f) continue;
      const factor = q / 100;
      kcal += (f.kcal_100g ?? 0) * factor;
      protein += (f.protein_100g ?? 0) * factor;
      carbs += (f.carbs_100g ?? 0) * factor;
      fat += (f.fat_100g ?? 0) * factor;
      fibre += (f.fibre_100g ?? 0) * factor;
      grams += q;
    }
    if (grams <= 0) return null;
    const servings = Math.max(Number(recipe.total_servings) || 1, 0.01);
    const per100 = (v) => Math.round((v / grams) * 100 * 10) / 10;
    return {
      food_ref: `recipe:${id}`,
      source: 'recipe',
      name: recipe.name,
      brand: null,
      serving_g: Math.round((grams / servings) * 10) / 10,
      serving_label: 'serving',
      kcal_100g: Math.round((kcal / grams) * 100),
      protein_100g: per100(protein),
      carbs_100g: per100(carbs),
      fat_100g: per100(fat),
      fibre_100g: per100(fibre),
    };
  }
  return null;
}
