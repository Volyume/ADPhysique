/**
 * Food lookup waterfall.
 *
 * Locked in FOOD_DATA_STRATEGY_LOCKED.md. Five sources, first hit
 * wins:
 *   1. Local SQLite cache (custom_foods + foods)        <50ms
 *   2. Bundled OFF snapshot (already in `foods`)        <50ms
 *   3. Bundled CoFID (already in `foods`)               <50ms
 *   4. Live OpenFoodFacts API                           ~800ms
 *   5. USDA FoodData Central API                        ~1200ms
 *
 * Steps 1-3 share the `foods` SQLite table; that's the cache. Live
 * hits from steps 4-5 are written back into `foods` (cache
 * promotion) so the next lookup is a step-1 hit.
 *
 * Latency targets: <250ms cache hit, <1500ms cold network lookup.
 */
import { db, uid } from '../database';
import { searchLocalByName, findLocalByBarcode } from './sources/localCache';
import { searchOff, lookupBarcodeOff } from './sources/liveOff';
import { searchUsda, lookupBarcodeUsda } from './sources/usda';
import { track as trackEvent } from '../engineTelemetry';

const MIN_QUERY_LEN = 2;
const NETWORK_SEARCH_FANOUT_LIMIT = 10;

/**
 * Cache promotion: write a network-sourced food row into the local
 * `foods` table so the next lookup is a step-1 hit. Idempotent via
 * the (source, source_id) unique index.
 *
 * Source rows arrive shaped as:
 *   { food_ref: 'off:<ean>' | 'usda:<fdcId>', source, name, brand,
 *     serving_g, serving_label, kcal_*, protein_*, carbs_*, fat_*,
 *     fibre_*, barcode_ean }
 *
 * Returns the local food_ref (`global:<uuid>`) replacing the
 * source-prefixed ref so downstream callers store a stable id.
 */
async function _promoteToLocal(row) {
  if (!row?.source) return row;
  const d = await db();
  const sourceId = (row.food_ref || '').split(':')[1] || null;
  if (!sourceId) return row;

  const existing = await d.getFirstAsync(
    'SELECT id FROM foods WHERE source = ? AND source_id = ? LIMIT 1',
    [row.source, sourceId]
  );
  if (existing?.id) {
    return { ...row, food_ref: `global:${existing.id}` };
  }
  const id = uid();
  const now = Date.now();
  try {
    await d.runAsync(
      `INSERT INTO foods
        (id, source, source_id, barcode_ean, name, brand,
         serving_g, serving_label,
         kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
         verified, fetched_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id, row.source, sourceId, row.barcode_ean ?? null,
        row.name ?? 'Unknown', row.brand ?? null,
        row.serving_g ?? 100, row.serving_label ?? null,
        row.kcal_100g, row.protein_100g, row.carbs_100g, row.fat_100g,
        row.fibre_100g ?? null,
        now, now, now,
      ]
    );
    return { ...row, food_ref: `global:${id}` };
  } catch {
    // Race on uq_foods_source_source_id: re-read.
    const again = await d.getFirstAsync(
      'SELECT id FROM foods WHERE source = ? AND source_id = ? LIMIT 1',
      [row.source, sourceId]
    );
    return again?.id ? { ...row, food_ref: `global:${again.id}` } : row;
  }
}

async function _promoteAll(rows) {
  const out = [];
  for (const r of rows) out.push(await _promoteToLocal(r));
  return out;
}

/**
 * Free-text search across the waterfall.
 *
 * @param {string} userId
 * @param {string} query
 * @param {object} options
 * @param {number} [options.limit=25]
 * @returns {Promise<Array>} array of food rows
 */
export async function searchFoods(userId, query, { limit = 25 } = {}) {
  const q = (query || '').trim();
  if (q.length < MIN_QUERY_LEN) return [];

  const local = await searchLocalByName(userId, q, limit);
  if (local.length > 0) return local;

  // Network fan-out: try OFF first (broader UK coverage). If empty,
  // fall through to USDA. Both are gated by request timeouts inside
  // the source modules so this never blocks the UI for long.
  const off = await searchOff(q, NETWORK_SEARCH_FANOUT_LIMIT);
  if (off.length > 0) {
    return _promoteAll(off);
  }
  const usda = await searchUsda(q, NETWORK_SEARCH_FANOUT_LIMIT);
  if (usda.length > 0) {
    return _promoteAll(usda);
  }
  return [];
}

/**
 * Resolve a single barcode via the waterfall. Returns the first
 * matching food row or null. Emits `food_lookup_barcode` telemetry
 * with the source that produced the hit (or 'miss').
 */
export async function resolveBarcode(ean, userId = null) {
  if (!ean) return null;
  const t0 = Date.now();

  const local = await findLocalByBarcode(ean);
  if (local) {
    if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'local', ms: Date.now() - t0, ean });
    return local;
  }

  const off = await lookupBarcodeOff(ean);
  if (off) {
    const promoted = await _promoteToLocal(off);
    if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'off_live', ms: Date.now() - t0, ean });
    return promoted;
  }

  const usda = await lookupBarcodeUsda(ean);
  if (usda) {
    const promoted = await _promoteToLocal(usda);
    if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'usda', ms: Date.now() - t0, ean });
    return promoted;
  }

  if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'miss', ms: Date.now() - t0, ean });
  return null;
}
