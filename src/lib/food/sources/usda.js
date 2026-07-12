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

// AC-12: babel-preset-expo/Metro only inline EXPO_PUBLIC_* vars when
// accessed via a STATIC dot path (process.env.EXPO_PUBLIC_X) at build
// time; that's how the value reaches the release bundle at all (there
// is no runtime process.env in a release build otherwise). The
// previous computed bracket lookup keyed off a runtime variable was
// never inlined, so it silently evaluated to undefined in every real build
// and USDA never ran -- Jest masked this because Jest's real
// process.env made the computed form work in tests. Static dot-access
// only.
function _apiKey() {
  return process.env.EXPO_PUBLIC_USDA_API_KEY || null;
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
 * Look up a single USDA item by its fdcId (the id promoted rows carry
 * as `foods.source_id`). Used for the opportunistic re-fetch of a stale
 * promoted USDA row (audit §15 item 4) -- a direct id lookup instead of
 * a name/GTIN search, since we already know exactly which record to
 * re-check.
 */
export async function lookupUsdaById(fdcId) {
  const key = _apiKey();
  if (!key || !fdcId) return null;
  const url = `${USDA_BASE}/food/${encodeURIComponent(fdcId)}`;
  try {
    const res = await _fetchWithTimeout(url, USDA_TIMEOUT_MS, { 'X-Api-Key': key });
    if (!res.ok) return null;
    const json = await res.json();
    return normaliseUsdaFood(json);
  } catch {
    return null;
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
