/**
 * buildCofidSnapshot.test.js — MN-1 (item 16 data spike, 2026-07-10).
 *
 * Pins the CoFID vitamin/mineral parser added to build the 27 UK-NRV
 * micronutrient columns into assets/seed/cofid_uk.dat:
 *   - the "Tr"/"N" honesty distinction for micronutrients (both -> null,
 *     never 0) versus a genuine measured "0.0" (-> 0), using real values
 *     sampled from the downloaded CoFID workbook (Ackee/Agar/Bananas rows,
 *     recorded verbatim below so this test needs no network access and no
 *     checked-in workbook);
 *   - MICRO_FIELDS never drifts from the app's canonical MICRO_COLUMNS
 *     (src/lib/food/micronutrients.js) — every mapped column must be one of
 *     the 27, and the 3 CoFID cannot supply (fluoride, chromium, molybdenum)
 *     are exactly and only the ones absent from MICRO_FIELDS;
 *   - the sheet-join (buildMicroLookup / microValuesForCode) degrades a
 *     missing food code to all-null rather than throwing.
 *
 * buildCofidSnapshot.js is a plain Node CLI script (no Babel/Metro), so it
 * is required here via CommonJS; its `main()` IIFE is guarded behind
 * `require.main === module` so requiring it for these unit tests performs
 * no network I/O and writes no file.
 */
const {
  num, numMicro, MICRO_FIELDS, buildMicroLookup, microValuesForCode,
} = require('../buildCofidSnapshot');

// The 27-nutrient canonical list is an ES module (Metro/RN app code); babel-jest
// transforms it fine under `import`.
import { MICRO_COLUMNS } from '../../../src/lib/food/micronutrients';

describe('num() — macro parser (unchanged, guard against accidental edits)', () => {
  test('Tr (trace) parses to 0 for macros', () => {
    expect(num('Tr')).toBe(0);
    expect(num('tr')).toBe(0);
  });
  test('N (not measured) parses to null', () => {
    expect(num('N')).toBeNull();
    expect(num('n/a')).toBeNull();
  });
  test('numeric strings and numbers pass through', () => {
    expect(num('12.5')).toBe(12.5);
    expect(num(7)).toBe(7);
  });
  test('null/blank/non-numeric parses to null', () => {
    expect(num(null)).toBeNull();
    expect(num('')).toBeNull();
    expect(num('abc')).toBeNull();
  });
});

describe('numMicro() — micronutrient parser (stricter honesty rule)', () => {
  test('Tr (trace) parses to null, NOT 0 — the MN-1 honesty distinction', () => {
    expect(numMicro('Tr')).toBeNull();
    expect(numMicro('tr')).toBeNull();
  });
  test('N (not measured) parses to null', () => {
    expect(numMicro('N')).toBeNull();
    expect(numMicro('n/a')).toBeNull();
  });
  test('a genuine measured near-zero ("0.0") still parses to 0, distinct from Tr/N', () => {
    expect(numMicro('0.0')).toBe(0);
    expect(numMicro(0)).toBe(0);
  });
  test('numeric strings and numbers pass through unchanged', () => {
    expect(numMicro('1.1')).toBe(1.1);
    expect(numMicro(41)).toBe(41);
  });
  test('null/blank/non-numeric parses to null', () => {
    expect(numMicro(null)).toBeNull();
    expect(numMicro('')).toBeNull();
    expect(numMicro('xyz')).toBeNull();
  });
});

describe('MICRO_FIELDS — drift guard against src/lib/food/micronutrients.js', () => {
  test('every mapped column is one of the 27 canonical MICRO_COLUMNS', () => {
    const canonical = new Set(MICRO_COLUMNS);
    for (const f of MICRO_FIELDS) {
      expect(canonical.has(f.column)).toBe(true);
    }
  });

  test('columns are unique (no double-mapping)', () => {
    const cols = MICRO_FIELDS.map((f) => f.column);
    expect(new Set(cols).size).toBe(cols.length);
  });

  test('exactly the 3 nutrients CoFID does not publish are missing, no more no less', () => {
    const mapped = new Set(MICRO_FIELDS.map((f) => f.column));
    const missing = MICRO_COLUMNS.filter((c) => !mapped.has(c));
    expect(missing.sort()).toEqual(['chromium_100g', 'fluoride_100g', 'molybdenum_100g'].sort());
    expect(MICRO_FIELDS.length).toBe(MICRO_COLUMNS.length - 3);
  });

  test('every field targets a valid sheet and column index', () => {
    for (const f of MICRO_FIELDS) {
      expect(['inorganics', 'vitamins']).toContain(f.sheet);
      expect(Number.isInteger(f.col)).toBe(true);
      expect(f.col).toBeGreaterThan(6); // columns 0-6 are code/name/desc/group/prev/refs/footnote
    }
  });
});

// Real rows sampled directly from the downloaded McCance & Widdowson 2021
// workbook (1.4 Inorganics / 1.5 Vitamins sheets), recorded verbatim so this
// test file needs no network access. Header rows (indices 0-2) are the
// sheets' actual long-name / short-code / label rows; data starts at index 3
// per the sheets' own layout (confirmed against the live download).
const INORGANICS_HEADER_ROWS = [
  [' ', 'Food Name', 'Description', 'Group', 'Previous', 'Main data references', 'Footnote', 'Sodium (mg)', 'Potassium (mg)', 'Calcium (mg)', 'Magnesium (mg)', 'Phosphorus (mg)', 'Iron (mg)', 'Copper (mg)', 'Zinc (mg)', 'Chloride (mg)', 'Manganese (mg)', 'Selenium (µg)', 'Iodine (µg)'],
  [null, null, null, null, null, null, null, 'NA', 'K', 'CA', 'MG', 'P', 'FE', 'CU', 'ZN', 'CL', 'MN', 'SE', 'I'],
  [null, null, null, null, null, null, null, 'Sodium', 'Potassium', 'Calcium', 'Magnesium', 'Phosphorus', 'Iron', 'Copper', 'Zinc', 'Chloride', 'Manganese', 'Selenium', 'Iodine'],
];
const INORGANICS_DATA_ROWS = [
  // "13-145" Ackee, canned, drained
  ['13-145', 'Ackee, canned, drained', '8 cans', 'DG', 554, 'MW4, 1978', null, '240', '270', '35', '40', '47', '0.70', '0.27', '0.6', '340', 'N', 'N', 'Tr'],
  // "13-147" Agar, dried, soaked and drained
  ['13-147', 'Agar, dried, soaked and drained', 'Literature sources', 'DG', null, 'Wu Leung et al.', null, '10', '20', '110', '75', '8', '3.50', 'N', '2.5', 'N', '0.40', 'N', 'N'],
];
const INORGANICS_GRID = [...INORGANICS_HEADER_ROWS, ...INORGANICS_DATA_ROWS];

const VITAMINS_HEADER_ROWS = [
  ['Food Code', 'Food Name', 'Description', 'Group', 'Previous', 'Main data references', 'Footnote', 'Retinol (µg)', 'Carotene (µg)', 'Retinol Equivalent (µg)', 'Vitamin D (µg)', 'Vitamin E (mg)', 'Vitamin K1 (µg)', 'Thiamin (mg)', 'Riboflavin (mg)', 'Niacin (mg)', 'Tryptophan/60 (mg)', 'Niacin equivalent (mg)', 'Vitamin B6 (mg)', 'Vitamin B12 (µg)', 'Folate (µg)', 'Pantothenate (mg)', 'Biotin (µg)', 'Vitamin C (mg)'],
  [null, null, null, null, null, null, null, 'RET', 'CAREQU', 'RETEQU', 'VITD', 'VITE', 'VITK1', 'THIA', 'RIBO', 'NIAC', 'TRYP60', 'NIACEQU', 'VITB6', 'VITB12', 'FOLT', 'PANTO', 'BIOT', 'VITC'],
  [null, null, null, null, null, null, null, 'Retinol', 'Carotene', 'Total retinol equivalent', 'Total Vitamin D', 'Total Vitamin E', 'Phylloquinone', 'Thiamin', 'Riboflavin', 'Niacin', 'Tryptophan divided by 60', 'Niacin equivalent', 'Vitamin B6', 'Vitamin B12', 'Folate', 'Pantothenate', 'Biotin', 'Vitamin C'],
];
const VITAMINS_DATA_ROWS = [
  // "13-145" Ackee, canned, drained — vit_a (RETEQU) is "N" (unknown), vit_d
  // is a genuine measured "0.0" (known zero), vit_k1 cell is blank (null).
  ['13-145', 'Ackee, canned, drained', '8 cans', 'DG', 554, 'MW4, 1978', null, '0', 'N', 'N', '0.0', 'N', null, '0.03', '0.07', '0.6', '0.5', 1.1, '0.06', '0.0', '41', 'N', 'N', '30'],
  // "13-147" Agar, dried, soaked and drained
  ['13-147', 'Agar, dried, soaked and drained', 'Literature sources', 'DG', null, 'Wu Leung et al.', null, '0', '0', '0', '0.0', 'Tr', null, '0.01', '0.04', '0.1', 'N', 'N', 'Tr', '0.0', '0', 'Tr', 'Tr', '0'],
];
const VITAMINS_GRID = [...VITAMINS_HEADER_ROWS, ...VITAMINS_DATA_ROWS];

describe('buildMicroLookup() + microValuesForCode() — real CoFID row fixtures', () => {
  const inorganicsLookup = buildMicroLookup(INORGANICS_GRID, 'inorganics');
  const vitaminsLookup = buildMicroLookup(VITAMINS_GRID, 'vitamins');

  test('minerals parse per the documented column mapping', () => {
    const ackee = inorganicsLookup.get('13-145');
    expect(ackee.potassium_100g).toBe(270);
    expect(ackee.calcium_100g).toBe(35);
    expect(ackee.magnesium_100g).toBe(40);
    expect(ackee.phosphorus_100g).toBe(47);
    expect(ackee.iron_100g).toBe(0.7);
    expect(ackee.copper_100g).toBe(0.27);
    expect(ackee.zinc_100g).toBe(0.6);
    expect(ackee.chloride_100g).toBe(340);
    // "N" (manganese, selenium) -> null; "Tr" (iodine) -> null, never 0.
    expect(ackee.manganese_100g).toBeNull();
    expect(ackee.selenium_100g).toBeNull();
    expect(ackee.iodine_100g).toBeNull();
  });

  test('vitamins parse per the documented column mapping, including the RE/NE judgement calls', () => {
    const ackee = vitaminsLookup.get('13-145');
    // vit_a_100g comes from Retinol Equivalent (col 9 = "N"), not raw
    // Retinol (col 7 = "0") — must be null, not 0.
    expect(ackee.vit_a_100g).toBeNull();
    // vit_d_100g is a genuine measured "0.0" -> 0, distinct from the "N"/"Tr"
    // cases above.
    expect(ackee.vit_d_100g).toBe(0);
    // vit_e is "N" -> null.
    expect(ackee.vit_e_100g).toBeNull();
    // vit_k1 cell is blank (null in the grid) -> null.
    expect(ackee.vit_k_100g).toBeNull();
    expect(ackee.thiamin_100g).toBe(0.03);
    expect(ackee.riboflavin_100g).toBe(0.07);
    // niacin_100g comes from Niacin equivalent (col 17 = 1.1), not raw
    // Niacin (col 15 = "0.6").
    expect(ackee.niacin_100g).toBe(1.1);
    expect(ackee.vit_b6_100g).toBe(0.06);
    // vit_b12 is a genuine measured "0.0" -> 0.
    expect(ackee.vit_b12_100g).toBe(0);
    expect(ackee.folate_100g).toBe(41);
    // pantothenate/biotin are "N" -> null.
    expect(ackee.pantothenic_100g).toBeNull();
    expect(ackee.biotin_100g).toBeNull();
    expect(ackee.vit_c_100g).toBe(30);
  });

  test('Agar row: "Tr" markers across both sheets all resolve to null, never 0', () => {
    const agarMinerals = inorganicsLookup.get('13-147');
    const agarVitamins = vitaminsLookup.get('13-147');
    expect(agarMinerals.copper_100g).toBeNull(); // "N"
    expect(agarMinerals.iodine_100g).toBeNull(); // "N"
    expect(agarVitamins.vit_e_100g).toBeNull(); // "Tr"
    expect(agarVitamins.vit_b6_100g).toBeNull(); // "Tr"
    expect(agarVitamins.biotin_100g).toBeNull(); // "Tr"
    // But its own genuine "0.0"/"0" measurements still read as 0.
    expect(agarVitamins.vit_d_100g).toBe(0);
    expect(agarVitamins.vit_c_100g).toBe(0);
  });

  test('microValuesForCode joins both sheets into one flat object, in MICRO_FIELDS order keys', () => {
    const merged = microValuesForCode('13-145', inorganicsLookup, vitaminsLookup);
    expect(Object.keys(merged).sort()).toEqual(MICRO_FIELDS.map((f) => f.column).sort());
    expect(merged.potassium_100g).toBe(270);
    expect(merged.vit_a_100g).toBeNull();
  });

  test('a food code missing from a lookup degrades to all-null for that sheet, does not throw', () => {
    expect(() => microValuesForCode('99-999', inorganicsLookup, vitaminsLookup)).not.toThrow();
    const merged = microValuesForCode('99-999', inorganicsLookup, vitaminsLookup);
    for (const f of MICRO_FIELDS) {
      expect(merged[f.column]).toBeNull();
    }
  });
});
