/**
 * Live OpenFoodFacts API source.
 *
 * Step 4 of the food lookup waterfall (FOOD_DATA_STRATEGY_LOCKED.md).
 * Hits the public OFF API when the local cache + bundled snapshot
 * miss. No API key required; OFF is open data. The app's User-Agent
 * identifies Volyume per OFF's terms (https://world.openfoodfacts.org
 * /files/api-documentation.html#3-rules-for-using-the-api).
 *
 * Hit results are written to the local `foods` cache by the caller
 * (waterfall.js) so the next lookup is a Step 1 hit.
 *
 * MN-1 micronutrients (item 16 data spike / D26 data-enhancement,
 * 2026-07-10): `_toRow` also maps the 27 UK-NRV nutrient columns from
 * `src/lib/food/micronutrients.js`, same field table and unit/honesty rules
 * as `scripts/seed/buildOffSnapshot.js` (read that file's header for the
 * full evidence trail), so a freshly fetched food carries micros going
 * forward exactly like a bundled-snapshot one:
 *
 *   - UNIT QUIRK: every mass-based OFF nutriment's `_100g` field is stored
 *     in plain GRAMS internally regardless of its natural display unit
 *     (verified against live product JSON) -- converted here via ×1000
 *     (mg) / ×1,000,000 (µg) per OFF_MICRO_FIELDS' `unit`.
 *   - ZERO-VS-UNKNOWN: OFF is crowdsourced with no CoFID-style "Tr"/"N"
 *     marker, and a literal 0 is demonstrably untrustworthy (a real product
 *     was found reporting `sodium_100g: 0` alongside `salt_100g: 0.4` on
 *     the same row -- physically inconsistent). A literal 0 (or any
 *     non-finite/negative reading) for any of the 27 columns is treated as
 *     unknown (null), never a verified zero.
 */

const OFF_BASE = 'https://world.openfoodfacts.org';

// Single user action -> single API call. OFF asks for sensible rate
// limits; the waterfall already debounces at the call site, but we
// also cap the abort timeout so a slow network falls through to the
// next step (USDA) rather than hanging the UI.
const OFF_TIMEOUT_MS = 1200;

const USER_AGENT = 'Volyume/1.1 (https://volyume.app)';

// OFF nutriment key -> one of the 27 columns in ./micronutrients.js
// (MICRO_COLUMNS). Self-contained (not imported from micronutrients.js) so
// it mirrors scripts/seed/buildOffSnapshot.js's OFF_MICRO_FIELDS exactly;
// exported only so __tests__/food.liveOff.test.js can cross-check both the
// column set and every offKey/unit pair against that file, so the two
// mappers cannot silently drift.
export const OFF_MICRO_FIELDS = [
  { column: 'vit_a_100g', offKey: 'vitamin-a', unit: 'µg' },
  { column: 'vit_d_100g', offKey: 'vitamin-d', unit: 'µg' },
  { column: 'vit_e_100g', offKey: 'vitamin-e', unit: 'mg' },
  { column: 'vit_k_100g', offKey: 'vitamin-k', unit: 'µg' },
  { column: 'vit_c_100g', offKey: 'vitamin-c', unit: 'mg' },
  { column: 'thiamin_100g', offKey: 'vitamin-b1', unit: 'mg' },
  { column: 'riboflavin_100g', offKey: 'vitamin-b2', unit: 'mg' },
  { column: 'niacin_100g', offKey: 'vitamin-pp', unit: 'mg' },
  { column: 'vit_b6_100g', offKey: 'vitamin-b6', unit: 'mg' },
  { column: 'folate_100g', offKey: 'folates', unit: 'µg' },
  { column: 'vit_b12_100g', offKey: 'vitamin-b12', unit: 'µg' },
  { column: 'biotin_100g', offKey: 'biotin', unit: 'µg' },
  { column: 'pantothenic_100g', offKey: 'pantothenic-acid', unit: 'mg' },
  { column: 'potassium_100g', offKey: 'potassium', unit: 'mg' },
  { column: 'chloride_100g', offKey: 'chloride', unit: 'mg' },
  { column: 'calcium_100g', offKey: 'calcium', unit: 'mg' },
  { column: 'phosphorus_100g', offKey: 'phosphorus', unit: 'mg' },
  { column: 'magnesium_100g', offKey: 'magnesium', unit: 'mg' },
  { column: 'iron_100g', offKey: 'iron', unit: 'mg' },
  { column: 'zinc_100g', offKey: 'zinc', unit: 'mg' },
  { column: 'copper_100g', offKey: 'copper', unit: 'mg' },
  { column: 'manganese_100g', offKey: 'manganese', unit: 'mg' },
  { column: 'fluoride_100g', offKey: 'fluoride', unit: 'mg' },
  { column: 'selenium_100g', offKey: 'selenium', unit: 'µg' },
  { column: 'chromium_100g', offKey: 'chromium', unit: 'µg' },
  { column: 'molybdenum_100g', offKey: 'molybdenum', unit: 'µg' },
  { column: 'iodine_100g', offKey: 'iodine', unit: 'µg' },
];

// grams -> mg/µg (OFF always stores the raw `_100g` reading in grams). See
// file header for the evidence. Rounded to 4dp to clear float noise.
function _microConvert(grams, unit) {
  const factor = unit === 'µg' ? 1e6 : 1000;
  return Math.round(grams * factor * 10000) / 10000;
}

// Map a live product's `nutriments` hash onto the 27 micronutrient columns.
// A missing key, non-finite reading, or literal 0/negative all resolve to
// null (unknown) per the zero-vs-unknown policy above -- never 0.
function _microValuesFromNutriments(n) {
  const out = {};
  for (const f of OFF_MICRO_FIELDS) {
    const raw = n[`${f.offKey}_100g`];
    const g = typeof raw === 'string' ? parseFloat(raw) : raw;
    out[f.column] = (!Number.isFinite(g) || g <= 0) ? null : _microConvert(g, f.unit);
  }
  return out;
}

function _fetchWithTimeout(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: ctrl.signal,
  }).finally(() => clearTimeout(t));
}

function _toRow(product, sourceLabel = 'off_live') {
  if (!product) return null;
  const n = product.nutriments || {};
  const num = (v) => {
    const x = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(x) ? x : null;
  };
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) ? num(n['energy_100g']) / 4.184 : null);
  return {
    food_ref: `off:${product.code}`,
    source: sourceLabel,
    name: product.product_name || product.product_name_en || product.generic_name || 'Unknown product',
    brand: product.brands || null,
    serving_g: num(product.serving_quantity) ?? 100,
    serving_label: product.serving_size || null,
    kcal_100g: kcal,
    protein_100g: num(n.proteins_100g),
    carbs_100g: num(n.carbohydrates_100g),
    fat_100g: num(n.fat_100g),
    fibre_100g: num(n.fiber_100g),
    barcode_ean: product.code || null,
    ..._microValuesFromNutriments(n),
  };
}

function _hasMacros(row) {
  if (!row) return false;
  return row.kcal_100g != null
    && row.protein_100g != null
    && row.carbs_100g != null
    && row.fat_100g != null;
}

/**
 * Look up a product by barcode (EAN-13 / UPC-A / EAN-8).
 * Returns a food row or null. Rows that lack core macros are
 * filtered out so the waterfall can fall through to USDA.
 */
export async function lookupBarcodeOff(ean) {
  if (!ean) return null;
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(ean)}.json`;
  try {
    const res = await _fetchWithTimeout(url, OFF_TIMEOUT_MS);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 1 || !json.product) return null;
    const row = _toRow(json.product);
    return _hasMacros(row) ? row : null;
  } catch {
    return null;
  }
}

/**
 * Free-text search on OFF. Returns up to `limit` rows.
 * Rows without core macros are filtered out.
 */
export async function searchOff(query, limit = 25) {
  const q = (query || '').trim();
  if (q.length === 0) return [];
  const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}`
            + `&search_simple=1&action=process&json=1&page_size=${limit}`
            + '&fields=code,product_name,product_name_en,generic_name,brands,'
            + 'serving_quantity,serving_size,nutriments';
  try {
    const res = await _fetchWithTimeout(url, OFF_TIMEOUT_MS);
    if (!res.ok) return [];
    const json = await res.json();
    const products = Array.isArray(json?.products) ? json.products : [];
    return products.map(p => _toRow(p)).filter(_hasMacros).slice(0, limit);
  } catch {
    return [];
  }
}
