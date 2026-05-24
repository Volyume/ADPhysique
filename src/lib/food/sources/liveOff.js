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
 */

const OFF_BASE = 'https://world.openfoodfacts.org';

// Single user action -> single API call. OFF asks for sensible rate
// limits; the waterfall already debounces at the call site, but we
// also cap the abort timeout so a slow network falls through to the
// next step (USDA) rather than hanging the UI.
const OFF_TIMEOUT_MS = 1200;

const USER_AGENT = 'Volyume/1.1 (https://volyume.app)';

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
