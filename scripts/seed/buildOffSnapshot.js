#!/usr/bin/env node
/**
 * buildOffSnapshot.js
 *
 * Generates assets/seed/off_uk_snapshot.dat from OpenFoodFacts.
 * Bundled into the APK; imported into the local foods cache by
 * src/lib/food/seed.js on first launch.
 *
 * Strategy: multi-axis paginated search.
 *
 *   The OFF search.pl API caps responses at 100 rows per page AND
 *   30 pages per query. A single "country=UK" query therefore tops
 *   out at ~3,000 rows. To get full UK coverage we run the same
 *   30-page query against multiple stacked filters and dedupe by
 *   EAN across the runs:
 *
 *     - UK alone (catches uncategorised entries)
 *     - UK × each of ~30 major OFF categories
 *     - UK × each of ~10 major UK supermarket / own-brand brands
 *
 *   Each axis returns up to 3,000 products. With heavy overlap, the
 *   unique-after-dedup count typically lands ~50-120k UK foods with
 *   full macros. ~15-25 min on GitHub Actions ubuntu-latest.
 *
 *   The dump-based approach was tried (see git history) and produced
 *   only ~1-5% of UK products with usable macros; the dump is mostly
 *   barcode+name placeholders. The search API pre-filters for rows
 *   with nutriments, so the pages we pull are mostly usable.
 *
 * .dat extension keeps Metro treating the file as a binary asset
 * (numeric registry id for Asset.fromModule) rather than inlining
 * the parsed JSON into the JS bundle. See metro.config.js.
 *
 * Source: openfoodfacts.org search API, ODbL 1.0.
 */
const fs = require('node:fs');
const path = require('node:path');

const OFF_BASE = 'https://world.openfoodfacts.org';
const USER_AGENT = 'Volyume-Snapshot-Builder/3.0 (https://volyume.app)';
const PAGE_SIZE = 100;
const MAX_PAGES_PER_AXIS = 30;
const REQUEST_DELAY_MS = 500;
const MAX_CONSECUTIVE_FAILURES_PER_AXIS = 4;
const OUT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'seed', 'off_uk_snapshot.dat');

// OFF's major categories. Stacking each with country=united-kingdom
// pulls a different slice of the UK catalogue. Order doesn't matter;
// dedupe-by-EAN handles overlap.
const CATEGORIES = [
  'beverages', 'dairies', 'plant-based-foods-and-beverages', 'snacks',
  'breakfasts', 'cereals-and-potatoes', 'meats-and-their-products', 'fish-and-seafood',
  'breads', 'cereals', 'fruits', 'vegetables', 'fats',
  'sugary-snacks', 'salty-snacks', 'condiments', 'sauces', 'soups',
  'meals', 'frozen-foods', 'chocolates', 'biscuits-and-cakes',
  'yogurts', 'cheeses', 'eggs', 'pastas', 'rice',
  'ice-creams', 'fruit-juices', 'waters',
  'alcoholic-beverages', 'spreads', 'nuts', 'legumes',
  'desserts', 'baby-foods', 'sandwiches', 'pizzas-pies-and-quiches',
];

// Major UK supermarket / own-brand tags. Different OFF brand tags
// catch products that aren't well-categorised.
const BRANDS = [
  'tesco', 'sainsbury-s', 'asda', 'morrisons', 'waitrose',
  'marks-spencer', 'lidl', 'aldi', 'the-co-operative', 'iceland',
  'cadbury', 'walkers', 'mcvitie-s', 'nestle', 'kellogg-s',
];

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
  // product is tagged nutrition_data_per='100g'. Derive kcal via
  // Atwater (4P + 4C + 9F) if macros present but kcal missing.
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

// Build a search URL with stacked tag filters. Each axis is a
// (tagtype, tag) pair; OFF accepts up to 9 axes per query.
function buildUrl({ axes, page }) {
  let qs = `action=process&json=1&page=${page}&page_size=${PAGE_SIZE}`
    + `&fields=code,product_name,product_name_en,generic_name,brands,`
    + `serving_quantity,serving_size,nutrition_data_per,nutriments`;
  axes.forEach(([type, tag], i) => {
    qs += `&tagtype_${i}=${type}&tag_contains_${i}=contains`
       +  `&tag_${i}=${encodeURIComponent(tag)}`;
  });
  return `${OFF_BASE}/cgi/search.pl?${qs}`;
}

async function fetchPage(url, label) {
  const MAX_ATTEMPTS = 4;
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`${label} returned ${res.status}`);
      } else if (!res.ok) {
        throw new Error(`${label} returned ${res.status}`);
      } else {
        return res.json();
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < MAX_ATTEMPTS) {
      const backoffMs = 1500 * Math.pow(2, attempt - 1);
      await sleep(backoffMs);
    }
  }
  throw lastErr ?? new Error(`${label} unknown failure`);
}

async function runAxis({ axes, label, seenEan, rows }) {
  const t0 = Date.now();
  let consecutiveFailures = 0;
  let pagesFetched = 0;
  let newRowsThisAxis = 0;
  let skippedThisAxis = 0;
  for (let page = 1; page <= MAX_PAGES_PER_AXIS; page++) {
    let payload;
    try {
      payload = await fetchPage(buildUrl({ axes, page }), `${label} p${page}`);
      consecutiveFailures = 0;
      pagesFetched++;
    } catch (e) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_PER_AXIS) {
        warn(`${label}: ${MAX_CONSECUTIVE_FAILURES_PER_AXIS} consecutive failures, abandoning axis at p${page}`);
        break;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    const products = Array.isArray(payload?.products) ? payload.products : [];
    if (products.length === 0) break;
    for (const p of products) {
      const row = toRow(p);
      if (!row) { skippedThisAxis++; continue; }
      if (seenEan.has(row.ean)) { skippedThisAxis++; continue; }
      seenEan.add(row.ean);
      rows.push(row);
      newRowsThisAxis++;
    }
    if (products.length < PAGE_SIZE) break;
    await sleep(REQUEST_DELAY_MS);
  }
  const ms = Date.now() - t0;
  log(`${label}: +${newRowsThisAxis} (${pagesFetched}p, skipped ${skippedThisAxis}, ${(ms/1000).toFixed(1)}s, total=${rows.length})`);
}

(async function main() {
  const t0 = Date.now();
  log('starting multi-axis UK snapshot build');
  log(`axes: 1 country-only + ${CATEGORIES.length} category + ${BRANDS.length} brand = ${1 + CATEGORIES.length + BRANDS.length} runs`);
  log(`output: ${OUT_PATH}`);

  const seenEan = new Set();
  const rows = [];

  // Axis 0: country only. Catches uncategorised entries.
  await runAxis({
    axes: [['countries', 'united-kingdom']],
    label: 'UK',
    seenEan, rows,
  });

  // Axes 1..N: country × category.
  for (const cat of CATEGORIES) {
    await runAxis({
      axes: [['countries', 'united-kingdom'], ['categories', cat]],
      label: `UK×${cat}`,
      seenEan, rows,
    });
  }

  // Axes N..M: country × brand.
  for (const brand of BRANDS) {
    await runAxis({
      axes: [['countries', 'united-kingdom'], ['brands', brand]],
      label: `UK×${brand}`,
      seenEan, rows,
    });
  }

  const ms = Date.now() - t0;
  const out = {
    _meta: {
      format: 'off-uk-snapshot',
      version: 3,
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      source: 'openfoodfacts.org search API, multi-axis UK + category + brand',
      sourceLicense: 'Open Database License (ODbL) 1.0',
      buildMs: ms,
      axesRun: 1 + CATEGORIES.length + BRANDS.length,
    },
    rows,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const bytes = fs.statSync(OUT_PATH).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  log(`wrote ${rows.length.toLocaleString()} unique rows (${mb} MB) in ${(ms/1000).toFixed(1)}s`);
  log('done. commit assets/seed/off_uk_snapshot.dat + push.');
})().catch((e) => {
  err('fatal:', e.message);
  process.exit(1);
});
