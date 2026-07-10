#!/usr/bin/env node
/**
 * buildCofidSnapshot.js
 *
 * Downloads McCance and Widdowson's Composition of Foods Integrated
 * Dataset (CoFID), 7th edition (2021), from gov.uk and converts the
 * "1.3 Proximates" sheet (macros) plus the "1.4 Inorganics" (minerals) and
 * "1.5 Vitamins" sheets into assets/seed/cofid_uk.dat — the bundled
 * snapshot of ~2,850 generic UK foods.
 *
 * CoFID is static. The 7th edition has not changed since 2021 and is
 * unlikely to. This script exists for reproducibility, not for a
 * weekly cron. Run once when adding the data, again only if OHID
 * publishes a new edition.
 *
 *   node scripts/seed/buildCofidSnapshot.js
 *
 * Output:
 *   assets/seed/cofid_uk.dat — JSON document with _meta + rows array.
 *   Each row has the same shape as the OFF snapshot rows
 *   (ean is reused to carry the CoFID food code so source_id stays
 *   meaningful in the local cache), plus the 27 UK-NRV micronutrient
 *   columns from src/lib/food/micronutrients.js (MN-1, item 16 data spike,
 *   2026-07-10) wherever CoFID carries a value for them.
 *
 * MN-1 vitamin/mineral sheets (item 16 data spike, 2026-07-10):
 *   The workbook (downloaded fresh for this spike; NOT checked into the
 *   repo -- see TMP_XLSX below) publishes 14 data sheets. Two of them join
 *   1:1 onto every "1.3 Proximates" row by food code (verified: all 2,886
 *   Proximates food codes are present in both "1.4 Inorganics" and
 *   "1.5 Vitamins", zero misses):
 *     - "1.4 Inorganics" -- sodium, potassium, calcium, magnesium,
 *       phosphorus, iron, copper, zinc, chloride, manganese, selenium,
 *       iodine. CoFID does NOT publish fluoride, chromium or molybdenum in
 *       any sheet of this workbook -- those 3 of the app's 27 nutrients
 *       stay unknown (null) for every CoFID-sourced food, honestly, not a
 *       parsing gap.
 *     - "1.5 Vitamins" -- retinol, carotene, retinol equivalent, vitamin D,
 *       vitamin E, vitamin K1, thiamin, riboflavin, niacin, tryptophan/60,
 *       niacin equivalent, vitamin B6, vitamin B12, folate, pantothenate,
 *       biotin, vitamin C. All 13 vitamins the app tracks are covered.
 *   Column-by-column mapping, unit check and judgement calls are in
 *   MICRO_FIELDS below (each entry documents its own unit match / rationale
 *   so nothing here needs cross-checking against micronutrients.js by hand).
 *
 * Licence: Open Government Licence v3.0. Attribution required in the
 * app's Credits screen: "Contains public sector information licensed
 * under the Open Government Licence v3.0."
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

let XLSX;
try {
  // eslint-disable-next-line global-require
  XLSX = require('xlsx');
} catch (_) {
  console.error('[cofid] missing dependency: xlsx. Run: npm install --save-dev xlsx');
  process.exit(1);
}

const SOURCE_URL = 'https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx';
const USER_AGENT = 'Volyume-Cofid-Builder/1.0 (https://volyume.app)';
const SHEET_NAME = '1.3 Proximates';
const SHEET_NAME_INORGANICS = '1.4 Inorganics';
const SHEET_NAME_VITAMINS = '1.5 Vitamins';
const OUT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'seed', 'cofid_uk.dat');
const TMP_XLSX = path.join(require('node:os').tmpdir(), 'cofid-mw-2021.xlsx');

// 0-indexed column positions in sheet "1.3 Proximates".
const COL = {
  code:    0,    // "13-145"
  name:    1,    // "Ackee, canned, drained"
  desc:    2,    // free-text description / sample count
  group:   3,    // "DG" etc.
  protein: 9,    // per 100g
  fat:     10,
  carbs:   11,
  kcal:    12,
  sugar:   16,   // Total sugars
  fibre:   24,   // Englyst fibre (col 25 is AOAC, but 24 is more widely populated)
};

// MN-1 (item 16 data spike, 2026-07-10) -- vitamin/mineral column mapping.
//
// Every row here targets one of the 27 columns in `src/lib/food/
// micronutrients.js` (`MICRO_COLUMNS`). This script is a plain Node CLI
// (no Metro/Babel), so it cannot `import` that ES module directly; instead
// `scripts/seed/__tests__/buildCofidSnapshot.test.js` cross-checks this
// list's `column` values against the app's canonical `MICRO_COLUMNS` so the
// two cannot silently drift.
//
// Both source sheets join 1:1 onto "1.3 Proximates" by food code (column 0,
// e.g. "13-145") -- verified directly against the downloaded workbook: all
// 2,886 Proximates food codes are present in both "1.4 Inorganics" and
// "1.5 Vitamins" sheets, zero misses.
//
// Units: every mapped CoFID column already reports in the exact unit
// `micronutrients.js` expects (mg or µg per 100g) -- NO unit conversion is
// needed anywhere in this table. Each entry states that explicitly so the
// "no conversion needed" claim is a checked fact, not an assumption.
const MICRO_FIELDS = [
  // ── "1.4 Inorganics" (minerals). Column 7 (Sodium, mg) is deliberately
  // NOT mapped: sodium is already tracked as its own `sodium_100g` column
  // outside the 27 micronutrients (see micronutrients.js header, "sodium
  // excluded, already tracked separately") -- Proximates' own sodium_100g
  // mapping is untouched by this change (still hard-set null, a pre-existing
  // gap outside MN-1's 27-nutrient scope; not fixed here, see task report).
  { column: 'potassium_100g',  sheet: 'inorganics', col: 8,  unit: 'mg', note: 'Potassium (mg) -- direct match, no conversion.' },
  { column: 'calcium_100g',    sheet: 'inorganics', col: 9,  unit: 'mg', note: 'Calcium (mg) -- direct match, no conversion.' },
  { column: 'magnesium_100g',  sheet: 'inorganics', col: 10, unit: 'mg', note: 'Magnesium (mg) -- direct match, no conversion.' },
  { column: 'phosphorus_100g', sheet: 'inorganics', col: 11, unit: 'mg', note: 'Phosphorus (mg) -- direct match, no conversion.' },
  { column: 'iron_100g',       sheet: 'inorganics', col: 12, unit: 'mg', note: 'Iron (mg) -- direct match, no conversion.' },
  { column: 'copper_100g',     sheet: 'inorganics', col: 13, unit: 'mg', note: 'Copper (mg) -- direct match, no conversion.' },
  { column: 'zinc_100g',       sheet: 'inorganics', col: 14, unit: 'mg', note: 'Zinc (mg) -- direct match, no conversion.' },
  { column: 'chloride_100g',   sheet: 'inorganics', col: 15, unit: 'mg', note: 'Chloride (mg) -- direct match, no conversion.' },
  { column: 'manganese_100g',  sheet: 'inorganics', col: 16, unit: 'mg', note: 'Manganese (mg) -- direct match, no conversion.' },
  { column: 'selenium_100g',   sheet: 'inorganics', col: 17, unit: 'µg', note: 'Selenium (µg) -- direct match, no conversion.' },
  { column: 'iodine_100g',     sheet: 'inorganics', col: 18, unit: 'µg', note: 'Iodine (µg) -- direct match, no conversion.' },
  // fluoride_100g, chromium_100g, molybdenum_100g: CoFID publishes none of
  // these in any sheet of this workbook (verified against the full
  // SheetNames list). Deliberately absent from this table -- they stay
  // null/unknown for every CoFID-sourced food, which is honest (the maths
  // module already renders null as "unknown", never 0), not a parsing gap.

  // ── "1.5 Vitamins".
  {
    column: 'vit_a_100g', sheet: 'vitamins', col: 9, unit: 'µg',
    note: 'JUDGEMENT CALL: mapped from "Retinol Equivalent (µg)" (col 9), '
      + 'not raw "Retinol (µg)" (col 7). The app\'s NRV for vitamin A (800 '
      + 'µg) is the EU/UK Retinol Equivalent reference value, so RE is the '
      + 'correct comparator -- it already folds in the retinol-equivalent '
      + 'contribution from dietary carotenes. Direct unit match, no '
      + 'conversion.',
  },
  { column: 'vit_d_100g', sheet: 'vitamins', col: 10, unit: 'µg', note: 'Vitamin D (µg) -- direct match, no conversion.' },
  { column: 'vit_e_100g', sheet: 'vitamins', col: 11, unit: 'mg', note: 'Vitamin E (mg) -- direct match, no conversion.' },
  {
    column: 'vit_k_100g', sheet: 'vitamins', col: 12, unit: 'µg',
    note: 'LIMITATION: CoFID only reports "Vitamin K1 (µg)" (phylloquinone). '
      + 'It does not publish menaquinones (K2), so foods whose vitamin K '
      + 'comes mainly from K2 (some fermented/animal foods) will read lower '
      + 'than their true total vitamin K. This is a known limitation shared '
      + 'by most food composition databases (including USDA), not fixable '
      + 'from this source. Unit (µg) matches directly, no conversion.',
  },
  { column: 'thiamin_100g', sheet: 'vitamins', col: 13, unit: 'mg', note: 'Thiamin (mg) -- direct match, no conversion.' },
  { column: 'riboflavin_100g', sheet: 'vitamins', col: 14, unit: 'mg', note: 'Riboflavin (mg) -- direct match, no conversion.' },
  {
    column: 'niacin_100g', sheet: 'vitamins', col: 17, unit: 'mg',
    note: 'JUDGEMENT CALL: mapped from "Niacin equivalent (mg)" (col 17), '
      + 'not raw "Niacin (mg)" (col 15). The EU/UK NRV for niacin (16 mg) '
      + 'is conventionally expressed and compared as niacin equivalents (NE '
      + '-- preformed niacin plus the contribution from dietary tryptophan, '
      + '60 mg tryptophan ~= 1 mg niacin), which is what "Niacin equivalent" '
      + 'already computes per CoFID\'s own column pair (col 16 is '
      + '"Tryptophan/60"). Using raw niacin would systematically '
      + 'under-count. Direct unit match, no conversion.',
  },
  { column: 'vit_b6_100g', sheet: 'vitamins', col: 18, unit: 'mg', note: 'Vitamin B6 (mg) -- direct match, no conversion.' },
  { column: 'vit_b12_100g', sheet: 'vitamins', col: 19, unit: 'µg', note: 'Vitamin B12 (µg) -- direct match, no conversion.' },
  { column: 'folate_100g', sheet: 'vitamins', col: 20, unit: 'µg', note: 'Folate (µg) -- direct match, no conversion.' },
  { column: 'pantothenic_100g', sheet: 'vitamins', col: 21, unit: 'mg', note: 'Pantothenate (mg) == pantothenic acid -- direct match, no conversion.' },
  { column: 'biotin_100g', sheet: 'vitamins', col: 22, unit: 'µg', note: 'Biotin (µg) -- direct match, no conversion.' },
  { column: 'vit_c_100g', sheet: 'vitamins', col: 23, unit: 'mg', note: 'Vitamin C (mg) -- direct match, no conversion.' },
];

function log(...args) { console.log('[cofid]', ...args); }
function warn(...args) { console.warn('[cofid]', ...args); }
function err(...args) { console.error('[cofid]', ...args); }

// CoFID values can be "Tr" (trace, treat as 0), "N" (not measured,
// treat as null), or a number / numeric string.
function num(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s === '' || s === 'N' || s === 'n/a') return null;
  if (s === 'Tr' || s === 'tr') return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Micronutrient values use a stricter honesty rule than the macro `num()`
// above: MN-1's "unknown, never 0" invariant (src/lib/food/
// micronutrients.js header) means CoFID's "Tr" (trace -- present but below
// the quantifiable threshold) must NOT collapse to 0 the way it does for
// macros. A trace vitamin/mineral reading is not a verified zero; showing
// 0% of NRV for a nutrient that's merely "present in a trace amount" would
// be dishonest in the same direction the app's own maths module guards
// against. Both "Tr" and "N" (not measured) map to null here.
function numMicro(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s === '' || s === 'N' || s === 'n/a' || s === 'Tr' || s === 'tr') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Parse "1.4 Inorganics" or "1.5 Vitamins" (both share the same 3-header-row
// shape as Proximates) into a Map keyed by food code, holding only the
// MICRO_FIELDS columns relevant to that sheet.
function buildMicroLookup(grid, sheetKey) {
  const map = new Map();
  const fields = MICRO_FIELDS.filter((f) => f.sheet === sheetKey);
  for (let i = 3; i < grid.length; i++) {
    const r = grid[i];
    if (!Array.isArray(r)) continue;
    const code = r[0];
    if (!code) continue;
    const values = {};
    for (const f of fields) {
      values[f.column] = numMicro(r[f.col]);
    }
    map.set(String(code), values);
  }
  return map;
}

// Merge a food code's micronutrient values (from the two lookup maps) onto
// a row object, in MICRO_FIELDS order. A code missing from a lookup (should
// not happen -- verified 1:1 join above) leaves every one of that sheet's
// columns null rather than throwing, so a join gap degrades to "unknown"
// rather than crashing the build.
function microValuesForCode(code, inorganicsLookup, vitaminsLookup) {
  const inorg = inorganicsLookup.get(String(code)) || {};
  const vits = vitaminsLookup.get(String(code)) || {};
  const out = {};
  for (const f of MICRO_FIELDS) {
    out[f.column] = f.sheet === 'inorganics' ? (inorg[f.column] ?? null) : (vits[f.column] ?? null);
  }
  return out;
}

function downloadXlsx(url, destPath) {
  return new Promise((resolve, reject) => {
    log(`downloading ${url}`);
    const t0 = Date.now();
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, {
      headers: { 'User-Agent': USER_AGENT },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (_) { /* tolerate */ }
        return downloadXlsx(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (_) { /* tolerate */ }
        return reject(new Error(`CoFID download returned HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close((closeErr) => {
          if (closeErr) return reject(closeErr);
          const ms = Date.now() - t0;
          const mb = (fs.statSync(destPath).size / 1024 / 1024).toFixed(2);
          log(`download complete: ${mb} MB in ${(ms / 1000).toFixed(1)}s`);
          resolve();
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(60_000, () => req.destroy(new Error('download timed out')));
  });
}

function loadSheetGrid(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    err(`sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
}

async function main() {
  const t0 = Date.now();
  log(`output: ${OUT_PATH}`);

  if (!fs.existsSync(TMP_XLSX)) {
    await downloadXlsx(SOURCE_URL, TMP_XLSX);
  } else {
    log(`using cached download: ${TMP_XLSX}`);
  }

  const wb = XLSX.readFile(TMP_XLSX);

  log(`parsing sheet "${SHEET_NAME}"`);
  const grid = loadSheetGrid(wb, SHEET_NAME);
  log(`total grid rows: ${grid.length}`);

  log(`parsing sheet "${SHEET_NAME_INORGANICS}" (minerals)`);
  const inorganicsLookup = buildMicroLookup(loadSheetGrid(wb, SHEET_NAME_INORGANICS), 'inorganics');
  log(`parsing sheet "${SHEET_NAME_VITAMINS}" (vitamins)`);
  const vitaminsLookup = buildMicroLookup(loadSheetGrid(wb, SHEET_NAME_VITAMINS), 'vitamins');

  // First 3 rows are headers (long names / short codes / short labels).
  // Data rows start at index 3.
  const rows = [];
  const seenCode = new Set();
  let skipped = 0;
  for (let i = 3; i < grid.length; i++) {
    const r = grid[i];
    if (!Array.isArray(r)) { skipped++; continue; }
    const code = r[COL.code];
    const name = r[COL.name];
    if (!code || !name || typeof name !== 'string') { skipped++; continue; }
    if (seenCode.has(code)) { skipped++; continue; }
    const kcal = num(r[COL.kcal]);
    const protein = num(r[COL.protein]);
    const carbs = num(r[COL.carbs]);
    const fat = num(r[COL.fat]);
    if (kcal == null || protein == null || carbs == null || fat == null) {
      skipped++;
      continue;
    }
    seenCode.add(code);
    rows.push({
      ean: String(code),
      name: name.trim(),
      brand: null,
      serving_g: 100,
      serving_label: null,
      kcal_100g: kcal,
      protein_100g: protein,
      carbs_100g: carbs,
      fat_100g: fat,
      fibre_100g: num(r[COL.fibre]),
      sodium_100g: null,
      sugar_100g: num(r[COL.sugar]),
      ...microValuesForCode(code, inorganicsLookup, vitaminsLookup),
    });
  }

  // Coverage measurement (item 16 data spike, 2026-07-10): how many of the
  // retained rows carry a value for each of the 24 CoFID-mappable
  // micronutrients (the 3 CoFID never publishes -- fluoride, chromium,
  // molybdenum -- are excluded from this table on purpose, not measured as
  // 0%). Logged plainly so the founder gets honest numbers, not estimates.
  const coverage = {};
  for (const f of MICRO_FIELDS) coverage[f.column] = 0;
  let nutrientsWithDataSum = 0;
  for (const row of rows) {
    let rowCount = 0;
    for (const f of MICRO_FIELDS) {
      if (row[f.column] != null) { coverage[f.column]++; rowCount++; }
    }
    nutrientsWithDataSum += rowCount;
  }
  const totalTrackedNutrients = 27; // full MN-1 set, including the 3 CoFID cannot supply
  const medianPerFood = rows.length
    ? [...rows]
      .map((row) => MICRO_FIELDS.reduce((n, f) => n + (row[f.column] != null ? 1 : 0), 0))
      .sort((a, b) => a - b)[Math.floor(rows.length / 2)]
    : 0;

  const ms = Date.now() - t0;
  const out = {
    _meta: {
      format: 'cofid-uk-snapshot',
      version: 2,
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      sourceUrl: SOURCE_URL,
      source: 'McCance and Widdowson\'s Composition of Foods Integrated Dataset (CoFID), 7th edition, 2021',
      sourceLicense: 'Open Government Licence v3.0',
      attribution: 'Contains public sector information licensed under the Open Government Licence v3.0.',
      buildMs: ms,
      skippedRows: skipped,
      micronutrientCoverage: coverage,
      micronutrientCoverageNote: 'Count of rows (out of rowCount) carrying a non-null value per column. '
        + 'fluoride_100g/chromium_100g/molybdenum_100g are absent from this object: CoFID does not publish '
        + 'those 3 of the app\'s 27 tracked nutrients in any sheet, so they are always null/unknown, not a gap here.',
      medianMicronutrientsWithDataPerFood: medianPerFood,
      totalTrackedNutrients,
    },
    rows,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const bytes = fs.statSync(OUT_PATH).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  log(`wrote ${rows.length.toLocaleString()} rows (${mb} MB) in ${ms}ms`);
  log(`skipped ${skipped} rows (missing fields, duplicates, or non-data)`);
  log(`median micronutrients-with-data per food: ${medianPerFood} / ${totalTrackedNutrients}`);
  for (const f of MICRO_FIELDS) {
    const pct = rows.length ? ((coverage[f.column] / rows.length) * 100).toFixed(1) : '0.0';
    log(`  ${f.column}: ${coverage[f.column]}/${rows.length} (${pct}%)`);
  }
  log('done.');
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
  numMicro,
  MICRO_FIELDS,
  buildMicroLookup,
  microValuesForCode,
  COL,
  SHEET_NAME,
  SHEET_NAME_INORGANICS,
  SHEET_NAME_VITAMINS,
};
