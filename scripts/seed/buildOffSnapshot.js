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
 *
 * MN-1 micronutrients (item 16 data spike / D26 data-enhancement,
 * 2026-07-10): the search API's `fields=...,nutriments` projection already
 * returns the FULL nutriments hash for a matched product (verified live --
 * requesting only `code,product_name,brands,nutriments` still returns every
 * vitamin/mineral key OFF holds for that product, not just the ones named in
 * `fields`), so no request-shape change was needed to reach this data --
 * only `toRow()` below gained a mapping step.
 *
 * OFF UNIT QUIRK (verified against live product JSON, not assumed): every
 * mass-based nutriment's `_100g` (and `_value`/`_serving`) field is stored in
 * PLAIN GRAMS internally, regardless of the nutrient's natural display unit.
 * E.g. a Kellogg's Corn Flakes product (barcode 3159470000120) reports
 * `"iron_100g": 0.008` (= 8 mg) and `"vitamin-d_100g": 0.0000084` (= 8.4 µg);
 * a Twix bar (5900951313592) reports `"pantothenic-acid_100g": 0.000113`
 * (= 0.113 mg). The taxonomy's documented "display unit" for each nutrient
 * (mg or µg, see openfoodfacts-server's taxonomies/nutrients.txt) is NOT the
 * unit the API value is expressed in -- it always comes back in grams, so
 * every mapped field here needs the ×1000 (mg) or ×1,000,000 (µg) conversion
 * in OFF_MICRO_FIELDS applied before it matches micronutrients.js's mg/µg
 * columns.
 *
 * OFF ZERO-VS-UNKNOWN (judgement call, evidence-based): unlike CoFID (a
 * curated government dataset with explicit "Tr"/"N" markers for trace/
 * not-measured), OFF is crowdsourced/bulk-imported and has no such marker --
 * every value is a bare number. Concrete proof that a literal 0 cannot be
 * trusted as a genuine measurement: the same Twix product (5900951313592)
 * reports `"sodium_100g": 0` alongside `"salt_100g": 0.4` -- physically
 * inconsistent, since sodium ~= salt / 2.5, so a real value would be ~0.16 g
 * (160 mg), not 0. That product also carries `"iron_100g": 0`,
 * `"vitamin-a_100g": 0`, `"zinc_100g": 0` etc. alongside genuinely nonzero
 * `"calcium_100g": 0.035731`, `"potassium_100g": 0.075285` and
 * `"pantothenic-acid_100g": 0.000113` on the SAME product -- consistent with
 * an edit-form default of 0 surviving for fields the contributor never
 * touched, not a declared zero. Per the app's "unknown, never 0" honesty
 * mandate (micronutrients.js header), and because a false zero is worse than
 * a missing value for a health-adjacent nutrient calculation, this builder
 * treats a literal 0 (or any non-finite/negative reading) for any of the 27
 * micronutrient fields as unknown (null) -- NEVER as a verified zero. This
 * is stricter than the treatment of OFF's core macro fields (kcal/protein/
 * carbs/fat/fibre/sodium/sugar), which are left exactly as before (a
 * pre-existing, out-of-scope behaviour -- see task report) because those are
 * the mandatory UK/EU label fields, cross-checked by Nutri-Score computation
 * and therefore far less likely to be silently defaulted.
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

// MN-1 (item 16 data spike, 2026-07-10) -- OFF nutriment key -> one of the 27
// columns in `src/lib/food/micronutrients.js` (`MICRO_COLUMNS`). This is a
// plain Node CLI (no Metro/Babel), so, like scripts/seed/buildCofidSnapshot.js,
// it cannot `import` that ES module directly; `scripts/seed/__tests__/
// buildOffSnapshot.test.js` cross-checks this list's `column` values against
// the canonical MICRO_COLUMNS so the two cannot silently drift.
//
// Every OFF key here was confirmed against openfoodfacts-server's
// taxonomies/nutrients.txt (canonical nutrient IDs) AND against real product
// JSON pulled live during this spike (see header comment). `unit` drives the
// grams -> mg/µg conversion in `microConvert()` (OFF always stores the raw
// `_100g` value in grams, see header).
const OFF_MICRO_FIELDS = [
  // Vitamins (13)
  {
    column: 'vit_a_100g', offKey: 'vitamin-a', unit: 'µg',
    note: 'LIMITATION: openfoodfacts-server\'s nutrients taxonomy glosses '
      + '"vitamin-a" with "(Retinol)" in several languages (de/es/pt/fr), '
      + 'i.e. this is raw retinol, NOT the Retinol Equivalent (RE) CoFID '
      + 'supplies. The app\'s 800 µg NRV is an RE reference value, so '
      + 'OFF-sourced vitamin A will read systematically LOW for '
      + 'carotene-rich plant foods (carrots, leafy greens, sweet potato) '
      + 'versus their CoFID-sourced equivalents. A source-format '
      + 'limitation, not a mapping bug -- flagged for the founder, matches '
      + 'the spirit of CoFID\'s own documented vitamin-K1/niacin caveats.',
  },
  { column: 'vit_d_100g', offKey: 'vitamin-d', unit: 'µg', note: 'Direct match.' },
  { column: 'vit_e_100g', offKey: 'vitamin-e', unit: 'mg', note: 'Direct match.' },
  { column: 'vit_k_100g', offKey: 'vitamin-k', unit: 'µg', note: 'OFF does not split K1/K2 in its taxonomy (unlike CoFID\'s explicit K1-only column) -- mapped as-is, whatever total the source declares.' },
  { column: 'vit_c_100g', offKey: 'vitamin-c', unit: 'mg', note: 'Direct match.' },
  { column: 'thiamin_100g', offKey: 'vitamin-b1', unit: 'mg', note: 'Direct match.' },
  { column: 'riboflavin_100g', offKey: 'vitamin-b2', unit: 'mg', note: 'Direct match.' },
  {
    column: 'niacin_100g', offKey: 'vitamin-pp', unit: 'mg',
    note: 'LIMITATION: OFF\'s "vitamin-pp" taxonomy entry (aliases: '
      + '"Vitamin B3/PP (Niacin)") is plain niacin, with no niacin-equivalent '
      + '(NE, preformed niacin + tryptophan/60) variant published anywhere '
      + 'in the taxonomy -- unlike CoFID, which supplies NE directly. The '
      + 'app\'s 16 mg NRV is conventionally an NE reference, so OFF-sourced '
      + 'niacin can read slightly low versus its CoFID-sourced equivalent. '
      + 'Source-format limitation, not fixable from this field.',
  },
  { column: 'vit_b6_100g', offKey: 'vitamin-b6', unit: 'mg', note: 'Direct match.' },
  { column: 'folate_100g', offKey: 'folates', unit: 'µg', note: 'OFF\'s taxonomy ID is "folates" (not "vitamin-b9", which is a synonym in the taxonomy but not the live nutriment key) -- verified against real product JSON.' },
  { column: 'vit_b12_100g', offKey: 'vitamin-b12', unit: 'µg', note: 'Direct match.' },
  { column: 'biotin_100g', offKey: 'biotin', unit: 'µg', note: 'Direct match.' },
  { column: 'pantothenic_100g', offKey: 'pantothenic-acid', unit: 'mg', note: 'Direct match.' },
  // Minerals (14). Sodium is already tracked separately (sodium_100g,
  // pre-existing, out of MN-1's 27-nutrient scope) -- not touched here.
  { column: 'potassium_100g', offKey: 'potassium', unit: 'mg', note: 'Direct match.' },
  { column: 'chloride_100g', offKey: 'chloride', unit: 'mg', note: 'Direct match.' },
  { column: 'calcium_100g', offKey: 'calcium', unit: 'mg', note: 'Direct match.' },
  { column: 'phosphorus_100g', offKey: 'phosphorus', unit: 'mg', note: 'Direct match.' },
  { column: 'magnesium_100g', offKey: 'magnesium', unit: 'mg', note: 'Direct match.' },
  { column: 'iron_100g', offKey: 'iron', unit: 'mg', note: 'Direct match.' },
  { column: 'zinc_100g', offKey: 'zinc', unit: 'mg', note: 'Direct match.' },
  { column: 'copper_100g', offKey: 'copper', unit: 'mg', note: 'Direct match.' },
  { column: 'manganese_100g', offKey: 'manganese', unit: 'mg', note: 'Direct match.' },
  { column: 'fluoride_100g', offKey: 'fluoride', unit: 'mg', note: 'OFF\'s taxonomy defines this field (unlike CoFID, which never publishes fluoride at all) -- real-world coverage is expected to be extremely low; measured honestly below, not assumed.' },
  { column: 'selenium_100g', offKey: 'selenium', unit: 'µg', note: 'Direct match.' },
  { column: 'chromium_100g', offKey: 'chromium', unit: 'µg', note: 'OFF\'s taxonomy defines this field (unlike CoFID) -- coverage expected to be extremely low; measured, not assumed.' },
  { column: 'molybdenum_100g', offKey: 'molybdenum', unit: 'µg', note: 'OFF\'s taxonomy defines this field (unlike CoFID) -- coverage expected to be extremely low; measured, not assumed.' },
  { column: 'iodine_100g', offKey: 'iodine', unit: 'µg', note: 'Direct match.' },
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

// grams -> mg/µg, per the header's OFF-always-stores-grams finding. Rounded
// to 4dp: enough precision at both the mg scale (e.g. calcium) and the µg
// scale (e.g. biotin) while clearing binary floating-point noise the ×1000/
// ×1e6 multiply introduces.
function microConvert(grams, unit) {
  const factor = unit === 'µg' ? 1e6 : 1000;
  return Math.round(grams * factor * 10000) / 10000;
}

// A raw OFF micronutrient reading, honest per the header's zero-vs-unknown
// policy: null/non-finite/zero/negative all resolve to null (unknown),
// never 0. Only a genuinely positive reading converts.
function microRaw(n, offKey, per100) {
  const raw = num(n[`${offKey}_100g`]) ?? (per100 ? num(n[`${offKey}_value`]) : null);
  return (raw == null || raw <= 0) ? null : raw;
}

/**
 * Map a product's `nutriments` hash onto the 27 MICRO_COLUMNS, per
 * OFF_MICRO_FIELDS. `per100` mirrors toRow()'s own per-100g/`_value`
 * fallback logic so a product tagged `nutrition_data_per: '100g'` is read
 * identically for micronutrients and macros.
 */
function microValuesFromNutriments(n, per100) {
  const out = {};
  for (const f of OFF_MICRO_FIELDS) {
    const raw = microRaw(n, f.offKey, per100);
    out[f.column] = raw == null ? null : microConvert(raw, f.unit);
  }
  return out;
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
    ...microValuesFromNutriments(n, per100),
  };
  if (!row.ean || !row.name) return null;
  if (row.kcal_100g == null || row.protein_100g == null
      || row.carbs_100g == null || row.fat_100g == null) {
    return null;
  }
  return row;
}

// MN-1 coverage measurement (item 16 data spike, 2026-07-10): how many of
// the retained rows carry a value for each of the 27 tracked micronutrients,
// plus the median nutrients-with-data per food. Shared between the snapshot
// build and its test suite so the numbers reported to the founder and the
// numbers pinned in tests can never silently diverge.
function measureMicronutrientCoverage(rows) {
  const coverage = {};
  for (const f of OFF_MICRO_FIELDS) coverage[f.column] = 0;
  const perFoodCounts = [];
  for (const row of rows) {
    let rowCount = 0;
    for (const f of OFF_MICRO_FIELDS) {
      if (row[f.column] != null) { coverage[f.column]++; rowCount++; }
    }
    perFoodCounts.push(rowCount);
  }
  perFoodCounts.sort((a, b) => a - b);
  const medianPerFood = perFoodCounts.length
    ? perFoodCounts[Math.floor(perFoodCounts.length / 2)]
    : 0;
  return { coverage, medianPerFood };
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

async function main() {
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

  // MN-1 coverage measurement (item 16 data spike, 2026-07-10): logged
  // plainly, no estimation -- OFF's crowdsourced coverage is expected to be
  // much patchier than CoFID's, especially for the 3 nutrients (fluoride,
  // chromium, molybdenum) CoFID cannot supply at all but OFF's taxonomy at
  // least defines.
  const { coverage, medianPerFood } = measureMicronutrientCoverage(rows);

  const ms = Date.now() - t0;
  const out = {
    _meta: {
      format: 'off-uk-snapshot',
      version: 4,
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      source: 'openfoodfacts.org search API, multi-axis UK + category + brand',
      sourceLicense: 'Open Database License (ODbL) 1.0',
      buildMs: ms,
      axesRun: 1 + CATEGORIES.length + BRANDS.length,
      micronutrientCoverage: coverage,
      micronutrientCoverageNote: 'Count of rows (out of rowCount) carrying a non-null value per column. '
        + 'OFF is crowdsourced, so this is expected to be far patchier than CoFID\'s curated coverage; '
        + 'a literal 0 read from the raw API is treated as unknown (see file header), never as data, '
        + 'so these counts are not inflated by placeholder zeros.',
      medianMicronutrientsWithDataPerFood: medianPerFood,
      totalTrackedNutrients: OFF_MICRO_FIELDS.length,
    },
    rows,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const bytes = fs.statSync(OUT_PATH).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  log(`wrote ${rows.length.toLocaleString()} unique rows (${mb} MB) in ${(ms/1000).toFixed(1)}s`);
  log(`median micronutrients-with-data per food: ${medianPerFood} / ${OFF_MICRO_FIELDS.length}`);
  for (const f of OFF_MICRO_FIELDS) {
    const pct = rows.length ? ((coverage[f.column] / rows.length) * 100).toFixed(2) : '0.00';
    log(`  ${f.column}: ${coverage[f.column]}/${rows.length} (${pct}%)`);
  }
  log('done. commit assets/seed/off_uk_snapshot.dat + push.');
}

if (require.main === module) {
  main().catch((e) => {
    err('fatal:', e.message);
    err(e.stack);
    process.exit(1);
  });
}

module.exports = {
  num,
  toRow,
  buildUrl,
  microConvert,
  microRaw,
  microValuesFromNutriments,
  measureMicronutrientCoverage,
  OFF_MICRO_FIELDS,
};
