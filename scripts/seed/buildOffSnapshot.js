#!/usr/bin/env node
/**
 * buildOffSnapshot.js
 *
 * Generates assets/seed/off_uk_snapshot.dat from OpenFoodFacts.
 * The output file is bundled into the APK and imported into the
 * local foods cache by src/lib/food/seed.js on first launch.
 *
 * Why the search API and not the full dump:
 *   The OFF JSONL dump has every UK product entry (~180k) but only
 *   ~1% have usable macros — most are barcode+name only. The search
 *   API pre-filters for products with nutriments, so ~97 of every
 *   100 returned are usable. 300 pages × 100 = ~30k usable UK rows,
 *   which beats ~1.8k usable from the 11 GB dump.
 *
 *   .dat extension keeps Metro treating the file as a binary asset
 *   rather than inlining the parsed JSON into the JS bundle. See
 *   metro.config.js.
 *
 * Run this BEFORE each EAS build (or let the weekly GitHub Actions
 * workflow do it):
 *
 *   node scripts/seed/buildOffSnapshot.js
 *
 * Polite: identifies via User-Agent, paginates with a small delay,
 * retries transient 5xx / 429 with backoff, tolerates a few
 * consecutive page failures before bailing.
 *
 * Source: openfoodfacts.org search API filtered to
 * country=united-kingdom with non-null macros. ODbL 1.0.
 */
const fs = require('node:fs');
const path = require('node:path');

const OFF_BASE = 'https://world.openfoodfacts.org';
const USER_AGENT = 'Volyume-Snapshot-Builder/2.1 (https://volyume.app)';
const PAGE_SIZE = 1000;
const MAX_PAGES = 300;
const REQUEST_DELAY_MS = 800;
const MAX_CONSECUTIVE_FAILURES = 5;
const OUT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'seed', 'off_uk_snapshot.dat');

function log(...args) { console.log('[off-snapshot]', ...args); }
function warn(...args) { console.warn('[off-snapshot]', ...args); }
function err(...args) { console.error('[off-snapshot]', ...args); }

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function num(v) {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function toRow(product) {
  if (!product) return null;
  const n = product.nutriments || {};
  // Try _100g first (normalised). Fall back to _value when the
  // product is tagged nutrition_data_per='100g'. Last resort: derive
  // kcal from macros via the Atwater approximation.
  const per100 = product.nutrition_data_per === '100g' || !product.nutrition_data_per;
  const valueOf = (key100, keyValue) => num(n[key100]) ?? (per100 ? num(n[keyValue]) : null);
  const protein = valueOf('proteins_100g', 'proteins_value');
  const carbs = valueOf('carbohydrates_100g', 'carbohydrates_value');
  const fat = valueOf('fat_100g', 'fat_value');
  let kcal = valueOf('energy-kcal_100g', 'energy-kcal_value');
  if (kcal == null) {
    const kj = valueOf('energy_100g', 'energy_value');
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null && protein != null && carbs != null && fat != null) {
    // Atwater approximation: 4 kcal/g protein + 4 kcal/g carb + 9 kcal/g fat.
    kcal = (protein * 4) + (carbs * 4) + (fat * 9);
  }
  const row = {
    ean: product.code || null,
    name: product.product_name || product.product_name_en || product.generic_name || null,
    brand: product.brands || null,
    serving_g: num(product.serving_quantity),
    serving_label: product.serving_size || null,
    kcal_100g: kcal,
    protein_100g: protein,
    carbs_100g: carbs,
    fat_100g: fat,
    fibre_100g: valueOf('fiber_100g', 'fiber_value'),
    sodium_100g: valueOf('sodium_100g', 'sodium_value'),
    sugar_100g: valueOf('sugars_100g', 'sugars_value'),
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
    + `serving_quantity,serving_size,nutrition_data_per,nutriments`;
  const MAX_ATTEMPTS = 4;
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`OFF page ${page} returned ${res.status}`);
      } else if (!res.ok) {
        throw new Error(`OFF page ${page} returned ${res.status}`);
      } else {
        return res.json();
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < MAX_ATTEMPTS) {
      const backoffMs = 1500 * Math.pow(2, attempt - 1);
      warn(`page ${page} attempt ${attempt} failed (${lastErr.message}); retrying in ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }
  throw lastErr ?? new Error(`OFF page ${page} unknown failure`);
}

(async function main() {
  const t0 = Date.now();
  log('starting UK snapshot build (search API)');
  log(`output: ${OUT_PATH}`);

  const seenEan = new Set();
  const rows = [];
  let totalFetched = 0;
  let totalSkipped = 0;
  let consecutiveFailures = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    let payload;
    try {
      payload = await fetchPage(page);
      consecutiveFailures = 0;
    } catch (e) {
      err(`page ${page} fetch failed: ${e.message}`);
      consecutiveFailures++;
      if (rows.length === 0 && page === 1) throw e;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        warn(`${MAX_CONSECUTIVE_FAILURES} consecutive page failures; stopping at page ${page}`);
        break;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
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
    if (page % 10 === 0 || page <= 5) {
      log(`page ${page}: kept ${rows.length} so far (this page +${products.length} raw)`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const ms = Date.now() - t0;
  const out = {
    _meta: {
      format: 'off-uk-snapshot',
      version: 2,
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
  log(`wrote ${rows.length.toLocaleString()} rows (${mb} MB) in ${ms}ms`);
  log(`skipped ${totalSkipped} (missing fields or duplicate)`);
  log('done. commit assets/seed/off_uk_snapshot.dat + push.');
})().catch((e) => {
  err('fatal:', e.message);
  process.exit(1);
});
