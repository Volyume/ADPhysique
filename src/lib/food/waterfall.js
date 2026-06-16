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
async function _promoteToLocal(row, userId = null) {
  if (!row?.source) return row;
  const d = await db();
  const sourceId = (row.food_ref || '').split(':')[1] || null;
  if (!sourceId) return row;

  // Canonicalise the live-OFF source label to the bundled snapshot's 'off' so
  // the (source, source_id) unique index collapses a live hit onto its already
  // bundled row instead of creating a duplicate (food audit D-3). It also fixes
  // display: SOURCE_LABEL maps 'off' but not 'off_live', so live rows otherwise
  // showed no source chip.
  const source = row.source === 'off_live' ? 'off' : row.source;

  const existing = await d.getFirstAsync(
    'SELECT id FROM foods WHERE source = ? AND source_id = ? LIMIT 1',
    [source, sourceId]
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
         sodium_100g, sugar_100g,
         verified, fetched_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id, source, sourceId, row.barcode_ean ?? null,
        row.name ?? 'Unknown', row.brand ?? null,
        row.serving_g ?? 100, row.serving_label ?? null,
        row.kcal_100g, row.protein_100g, row.carbs_100g, row.fat_100g,
        row.fibre_100g ?? null,
        // Carry sodium/sugar when the source has them, matching the bundled +
        // custom-food rows so the cache shape is consistent (food review D-m1).
        row.sodium_100g ?? null, row.sugar_100g ?? null,
        now, now, now,
      ]
    );
    return { ...row, food_ref: `global:${id}` };
  } catch (_e) {
    // Race on uq_foods_source_source_id: re-read and use the existing row.
    const again = await d.getFirstAsync(
      'SELECT id FROM foods WHERE source = ? AND source_id = ? LIMIT 1',
      [source, sourceId]
    );
    if (again?.id) return { ...row, food_ref: `global:${again.id}` };
    // Not a race: the food shows but never caches, so every lookup re-hits the
    // network. Surface it (source only, no PII) so it's diagnosable. Fixes the
    // long-broken call here (food audit D-6): it passed the event name as the
    // userId arg and used an unlisted event, so it never recorded — now the
    // correct (userId, event, payload) arity + an allow-listed name.
    if (userId) {
      try { trackEvent(userId, 'food_promote_failed', { source }); } catch (_) { /* tolerate */ }
    }
    return row;
  }
}

async function _promoteAll(rows, userId = null) {
  const out = [];
  for (const r of rows) out.push(await _promoteToLocal(r, userId));
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
  const t0 = Date.now();

  const local = await searchLocalByName(userId, q, limit);
  if (local.length > 0) {
    if (userId) trackEvent(userId, 'food_search_attempt', {
      source_hit: 'local', query_len: q.length, ms: Date.now() - t0,
    });
    return local;
  }

  // Network fan-out: try OFF first (broader UK coverage). If empty,
  // fall through to USDA. Both are gated by request timeouts inside
  // the source modules so this never blocks the UI for long.
  const off = await searchOff(q, NETWORK_SEARCH_FANOUT_LIMIT);
  if (off.length > 0) {
    const promoted = await _promoteAll(off, userId);
    if (userId) trackEvent(userId, 'food_search_attempt', {
      source_hit: 'off_live', query_len: q.length, ms: Date.now() - t0,
    });
    return promoted;
  }
  const usda = await searchUsda(q, NETWORK_SEARCH_FANOUT_LIMIT);
  if (usda.length > 0) {
    const promoted = await _promoteAll(usda, userId);
    if (userId) trackEvent(userId, 'food_search_attempt', {
      source_hit: 'usda', query_len: q.length, ms: Date.now() - t0,
    });
    return promoted;
  }
  if (userId) trackEvent(userId, 'food_search_attempt', {
    source_hit: 'miss', query_len: q.length, ms: Date.now() - t0,
  });
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

  // HP-2: the telemetry below carries the lookup source + latency only.
  // The barcode (ean) identifies the exact product the user scanned, which
  // is their dietary content, so it is not sent.
  const local = await findLocalByBarcode(ean, userId);
  if (local) {
    if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'local', ms: Date.now() - t0 });
    return local;
  }

  const off = await lookupBarcodeOff(ean);
  if (off) {
    const promoted = await _promoteToLocal(off, userId);
    if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'off_live', ms: Date.now() - t0 });
    return promoted;
  }

  const usda = await lookupBarcodeUsda(ean);
  if (usda) {
    const promoted = await _promoteToLocal(usda, userId);
    if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'usda', ms: Date.now() - t0 });
    return promoted;
  }

  if (userId) trackEvent(userId, 'food_lookup_barcode', { source: 'miss', ms: Date.now() - t0 });
  return null;
}
