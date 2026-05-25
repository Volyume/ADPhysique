#!/usr/bin/env node
/**
 * buildOffSnapshot.js
 *
 * Generates assets/seed/off_uk_snapshot.json from OpenFoodFacts.
 * The output file is bundled into the APK and imported into the
 * local foods cache by src/lib/food/seed.js on first launch.
 *
 * Run this BEFORE each EAS build to refresh the bundled snapshot:
 *
 *   node scripts/seed/buildOffSnapshot.js
 *
 * No API key needed. Polite: identifies via User-Agent, paginates
 * with a small delay, respects OFF's request rate guideline.
 *
 * Source: OFF Search API filtered to country=united-kingdom with
 * non-null macros. The full OFF dump is ~7GB; using the search API
 * with pagination gets us the products that actually have usable
 * data, without the dump download. Caps at whatever OFF's
 * pagination tolerates (currently ~25 pages = ~25k products on
 * 1000-per-page queries).
 *
 * Free / on-device per BUDGET_POSTURE_LOCKED.md and
 * FOOD_DATA_STRATEGY_LOCKED.md.
 */
const fs = require('node:fs');
const path = require('node:path');

const OFF_BASE = 'https://world.openfoodfacts.org';
const USER_AGENT = 'Volyume-Snapshot-Builder/1.2 (https://volyume.app)';
const PAGE_SIZE = 1000;
const MAX_PAGES = 30;            // OFF's pagination practically caps around this for large queries
const REQUEST_DELAY_MS = 800;    // Be polite. 1 req/sec is well within OFF's guideline.
const OUT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'seed', 'off_uk_snapshot.json');

// ─── Helpers ──────────────────────────────────────────────────────────────

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[off-snapshot]', ...args);
}

function warn(...args) {
  // eslint-disable-next-line no-console
  console.warn('[off-snapshot]', ...args);
}

function err(...args) {
  // eslint-disable-next-line no-console
  console.error('[off-snapshot]', ...args);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(v) {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function toRow(product) {
  if (!product) return null;
  const n = product.nutriments || {};
  const kcal = num(n['energy-kcal_100g'])
    ?? (num(n.energy_100g) != null ? num(n.energy_100g) / 4.184 : null);
  const row = {
    ean: product.code || null,
    name: product.product_name || product.product_name_en || product.generic_name || null,
    brand: product.brands || null,
    serving_g: num(product.serving_quantity),
    serving_label: product.serving_size || null,
    kcal_100g: kcal,
    protein_100g: num(n.proteins_100g),
    carbs_100g: num(n.carbohydrates_100g),
    fat_100g: num(n.fat_100g),
    fibre_100g: num(n.fiber_100g),
    sodium_100g: num(n.sodium_100g),
    sugar_100g: num(n.sugars_100g),
  };
  if (!row.ean || !row.name) return null;
  if (row.kcal_100g == null || row.protein_100g == null
      || row.carbs_100g == null || row.fat_100g == null) {
    return null;
  }
  return row;
}

async function fetchPage(page) {
  const url = `${OFF_BASE}/cgi/search.pl`
    + `?action=process&json=1`
    + `&tagtype_0=countries&tag_contains_0=contains&tag_0=united-kingdom`
    + `&page=${page}&page_size=${PAGE_SIZE}`
    + `&fields=code,product_name,product_name_en,generic_name,brands,`
    + `serving_quantity,serving_size,nutriments`;
  // Retry transient failures (5xx, network errors, timeouts) with
  // exponential backoff. OFF's CDN occasionally throws a 503 even
  // for legitimate paginated requests; the script should ride that
  // out rather than fatal on first failure.
  const MAX_ATTEMPTS = 4;
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (res.status >= 500 || res.status === 429) {
        // Transient: retry.
        lastErr = new Error(`OFF page ${page} returned ${res.status}`);
      } else if (!res.ok) {
        // 4xx other than 429: bail, no retry will help.
        throw new Error(`OFF page ${page} returned ${res.status}`);
      } else {
        return res.json();
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < MAX_ATTEMPTS) {
      const backoffMs = 1500 * Math.pow(2, attempt - 1);   // 1.5s, 3s, 6s
      warn(`page ${page} attempt ${attempt} failed (${lastErr.message}); retrying in ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }
  throw lastErr ?? new Error(`OFF page ${page} unknown failure`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

(async function main() {
  const t0 = Date.now();
  log('starting UK snapshot build');
  log(`output: ${OUT_PATH}`);

  const seenEan = new Set();
  const rows = [];
  let totalFetched = 0;
  let totalSkipped = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    let payload;
    try {
      payload = await fetchPage(page);
    } catch (e) {
      err(`page ${page} fetch failed: ${e.message}`);
      // Two consecutive fetch failures would be unusual; one failure
      // we tolerate by skipping the page. If pagination genuinely
      // dies, we stop with what we have.
      if (rows.length === 0) throw e;
      break;
    }
    const products = Array.isArray(payload?.products) ? payload.products : [];
    totalFetched += products.length;
    if (products.length === 0) {
      log(`page ${page}: empty, stopping pagination`);
      break;
    }
    for (const p of products) {
      const row = toRow(p);
      if (!row) { totalSkipped++; continue; }
      if (seenEan.has(row.ean)) { totalSkipped++; continue; }
      seenEan.add(row.ean);
      rows.push(row);
    }
    log(`page ${page}: kept ${rows.length} so far (this page +${products.length} raw)`);
    await sleep(REQUEST_DELAY_MS);
  }

  const ms = Date.now() - t0;
  const out = {
    _meta: {
      format: 'off-uk-snapshot',
      version: 1,
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      source: 'openfoodfacts.org search API, country=united-kingdom',
      sourceLicense: 'Open Database License (ODbL) 1.0',
      buildMs: ms,
      totalFetched,
      totalSkipped,
    },
    rows,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const bytes = fs.statSync(OUT_PATH).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  log(`wrote ${rows.length} rows (${mb}MB) in ${ms}ms`);
  log(`skipped ${totalSkipped} (missing fields or duplicate)`);
  log('done. commit assets/seed/off_uk_snapshot.json + push.');
})().catch((e) => {
  err('fatal:', e.message);
  process.exit(1);
});
