/**
 * USDA FoodData Central API source.
 *
 * Step 5 (final) of the food lookup waterfall
 * (FOOD_DATA_STRATEGY_LOCKED.md). Only hit when OFF (steps 2 + 4)
 * misses. USDA covers North American items and CoFID's gaps.
 *
 * Requires EXPO_PUBLIC_USDA_API_KEY at build time. The key is per-
 * developer (api.data.gov free tier, 1000 calls/hour). If the key
 * isn't set, the source short-circuits to empty so the waterfall
 * still returns gracefully.
 */
import { normaliseUsdaFood } from '../normalisers/usdaToFood';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_TIMEOUT_MS = 1500;

// Indirect key name avoids babel-preset-expo's compile-time
// inlining of EXPO_PUBLIC_* env vars (which substitutes both dot AND
// static bracket access at build time, baking the build value into
// the bundle). Computed access via a runtime variable defeats the
// inliner, keeping process.env readable at runtime (also matters for
// jest, which sets the value per test).
const _USDA_KEY_NAME = 'EXPO_PUBLIC_USDA_API_KEY';

function _apiKey() {
  return process.env[_USDA_KEY_NAME] || null;
}

function _fetchWithTimeout(url, timeoutMs, extraHeaders = null) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...(extraHeaders || {}) },
    signal: ctrl.signal,
  }).finally(() => clearTimeout(t));
}

/**
 * Free-text search on USDA. Returns up to `limit` rows.
 */
export async function searchUsda(query, limit = 25) {
  const key = _apiKey();
  if (!key) return [];
  const q = (query || '').trim();
  if (q.length === 0) return [];
  // Key goes in the X-Api-Key header, not the query string (food review D-m3),
  // so it isn't captured in proxy/CDN URL logs.
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(q)}&pageSize=${limit}`
            + '&dataType=Foundation,SR%20Legacy,Branded';
  try {
    const res = await _fetchWithTimeout(url, USDA_TIMEOUT_MS, { 'X-Api-Key': key });
    if (!res.ok) return [];
    const json = await res.json();
    const foods = Array.isArray(json?.foods) ? json.foods : [];
    return foods.map(normaliseUsdaFood).filter(Boolean).slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Look up a USDA item by GTIN/UPC. USDA's Branded dataset carries
 * GTINs for many North American supermarket items, providing a
 * fallback for the OFF gap on US-only products.
 */
export async function lookupBarcodeUsda(ean) {
  const key = _apiKey();
  if (!key || !ean) return null;
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(ean)}&pageSize=1&dataType=Branded`;
  try {
    const res = await _fetchWithTimeout(url, USDA_TIMEOUT_MS, { 'X-Api-Key': key });
    if (!res.ok) return null;
    const json = await res.json();
    const first = Array.isArray(json?.foods) ? json.foods[0] : null;
    return first ? normaliseUsdaFood(first) : null;
  } catch {
    return null;
  }
}
