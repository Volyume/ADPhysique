/**
 * Food lookup waterfall.
 *
 * Locked in FOOD_DATA_STRATEGY_LOCKED.md. Five sources, first hit
 * wins. Move 1 ships steps 1-3 (local cache, bundled OFF snapshot,
 * bundled CoFID). Live OFF and USDA APIs ship in Move 1.5 alongside
 * barcode scan.
 *
 * Latency targets: <250ms cache hit, <1500ms cold network lookup.
 */
import { searchLocalByName, findLocalByBarcode } from './sources/localCache';

/**
 * Free-text search across the waterfall.
 *
 * @param {string} userId
 * @param {string} query
 * @param {object} options
 * @param {number} [options.limit=25]
 * @returns {Promise<Array>} array of food rows shaped as
 *   { food_ref, source, name, brand, serving_g, serving_label,
 *     kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g }
 */
export async function searchFoods(userId, query, { limit = 25 } = {}) {
  // Step 1: local cache (custom_foods + foods, the latter populated
  // by bundled snapshots and prior sync pulls).
  const local = await searchLocalByName(userId, query, limit);
  if (local.length > 0) return local;

  // Move 1 ships only local search. Live OFF + USDA land in Move 1.5.
  // When no local results, return empty; the UI surfaces the "add
  // custom food" CTA so the user can enter it themselves.
  return [];
}

/**
 * Resolve a single barcode via the waterfall. Returns the first
 * matching food row or null.
 */
export async function resolveBarcode(ean) {
  if (!ean) return null;

  // Step 1: local cache. Hits when the user has previously scanned
  // this barcode or when the bundled OFF snapshot covers it.
  const local = await findLocalByBarcode(ean);
  if (local) return local;

  // Move 1.5 adds live OFF + USDA lookups. Until then, return null
  // and let the UI surface the "couldn't find this product" sheet.
  return null;
}
