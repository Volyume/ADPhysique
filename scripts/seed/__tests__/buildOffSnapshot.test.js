/**
 * buildOffSnapshot.test.js — MN-1 (item 16 data spike / D26 data
 * enhancement, 2026-07-10).
 *
 * Pins the OpenFoodFacts vitamin/mineral parser added to `toRow()`:
 *   - OFF_MICRO_FIELDS never drifts from the app's canonical MICRO_COLUMNS
 *     (src/lib/food/micronutrients.js) — all 27 are mapped (unlike CoFID,
 *     OFF's taxonomy defines a field for every one of them, though real
 *     coverage for fluoride/chromium/molybdenum is expected to be very low);
 *   - the grams -> mg/µg unit conversion (OFF always stores the raw `_100g`
 *     reading in plain grams, regardless of the nutrient's natural display
 *     unit — verified against real product JSON, not assumed);
 *   - the zero-vs-unknown honesty rule: a literal 0 (or missing/negative)
 *     reading resolves to null, never a verified zero, because OFF has no
 *     CoFID-style "Tr"/"N" trace marker and literal zeros are demonstrably
 *     untrustworthy (see the Twix fixture below: sodium_100g: 0 alongside
 *     salt-equivalent sodium that should read ~0.16 g, not 0);
 *   - coverage measurement matches a hand-counted expectation on a small
 *     fixture set.
 *
 * Fixture rows are real product JSON captured live from the OFF API during
 * this spike (barcodes 5900951313592 "Twix", 3159470000120 "Corn Flakes",
 * 7613038459912 "Sma Pro" infant formula), trimmed to the fields this test
 * needs and recorded verbatim so this suite needs no network access.
 *
 * buildOffSnapshot.js is a plain Node CLI script (no Babel/Metro), so it is
 * required here via CommonJS; its `main()` is guarded behind
 * `require.main === module` so requiring it performs no network I/O and
 * writes no file.
 */
const {
  num, toRow, microConvert, microRaw, microValuesFromNutriments,
  measureMicronutrientCoverage, OFF_MICRO_FIELDS,
} = require('../buildOffSnapshot');

// The 27-nutrient canonical list is an ES module (Metro/RN app code);
// babel-jest transforms it fine under `import`.
import { MICRO_COLUMNS } from '../../../src/lib/food/micronutrients';

describe('OFF_MICRO_FIELDS — drift guard against src/lib/food/micronutrients.js', () => {
  test('every mapped column is one of the 27 canonical MICRO_COLUMNS, and all 27 are covered', () => {
    const canonical = new Set(MICRO_COLUMNS);
    const mapped = new Set(OFF_MICRO_FIELDS.map((f) => f.column));
    for (const f of OFF_MICRO_FIELDS) expect(canonical.has(f.column)).toBe(true);
    // Unlike CoFID (3 nutrients absent), OFF's taxonomy defines a field for
    // every one of the 27 — none should be missing from this table.
    expect(mapped.size).toBe(MICRO_COLUMNS.length);
    expect([...mapped].sort()).toEqual([...canonical].sort());
  });

  test('columns are unique (no double-mapping)', () => {
    const cols = OFF_MICRO_FIELDS.map((f) => f.column);
    expect(new Set(cols).size).toBe(cols.length);
  });

  test('every field carries a valid unit (mg or µg — no micronutrient column is tracked in plain grams)', () => {
    for (const f of OFF_MICRO_FIELDS) {
      expect(['mg', 'µg']).toContain(f.unit);
      expect(typeof f.offKey).toBe('string');
      expect(f.offKey.length).toBeGreaterThan(0);
    }
  });
});

describe('num() — macro parser (unchanged, guard against accidental edits)', () => {
  test('numeric strings and numbers pass through', () => {
    expect(num('12.5')).toBe(12.5);
    expect(num(7)).toBe(7);
  });
  test('null/non-numeric parses to null', () => {
    expect(num(null)).toBeNull();
    expect(num('abc')).toBeNull();
  });
});

describe('microConvert() — grams -> mg/µg', () => {
  test('mg unit: ×1000', () => {
    expect(microConvert(0.008, 'mg')).toBe(8);
    expect(microConvert(0.000113, 'mg')).toBe(0.113);
  });
  test('µg unit: ×1,000,000', () => {
    expect(microConvert(0.0000084, 'µg')).toBe(8.4);
    expect(microConvert(0.00000142, 'µg')).toBe(1.42);
  });
});

describe('microRaw() — zero-vs-unknown honesty rule', () => {
  test('a genuine positive reading passes through', () => {
    expect(microRaw({ iron_100g: 0.008 }, 'iron', true)).toBe(0.008);
  });
  test('a literal 0 resolves to null, never a verified zero', () => {
    expect(microRaw({ iron_100g: 0 }, 'iron', true)).toBeNull();
  });
  test('a negative reading (bad data) resolves to null', () => {
    expect(microRaw({ iron_100g: -1 }, 'iron', true)).toBeNull();
  });
  test('a missing key resolves to null', () => {
    expect(microRaw({}, 'iron', true)).toBeNull();
  });
  test('falls back to `_value` only when per100 is true', () => {
    expect(microRaw({ iron_value: 0.01 }, 'iron', true)).toBe(0.01);
    expect(microRaw({ iron_value: 0.01 }, 'iron', false)).toBeNull();
  });
});

// Real product JSON, captured live from the OFF API during this spike.
// Trimmed to the fields relevant here; verbatim values, not rounded.
const TWIX = {
  code: '5900951313592',
  product_name: 'Twix',
  brands: 'Mars, Twix',
  nutrition_data_per: '100g',
  nutriments: {
    'energy-kcal_100g': 493,
    proteins_100g: 4.6,
    carbohydrates_100g: 65,
    fat_100g: 24,
    fiber_100g: 1.62,
    sodium_100g: 0,
    sugars_100g: 48,
    calcium_100g: 0.035731,
    potassium_100g: 0.075285,
    'pantothenic-acid_100g': 0.000113,
    iron_100g: 0,
    zinc_100g: 0,
    copper_100g: 0,
    manganese_100g: 0,
    phosphorus_100g: 0,
    selenium_100g: 0,
    'vitamin-a_100g': 0,
    'vitamin-c_100g': 0,
    'vitamin-e_100g': 0,
    'vitamin-k_100g': 0,
  },
};

const CORN_FLAKES = {
  code: '3159470000120',
  product_name: 'CORN FLAKES',
  brands: "Kellogg's",
  nutrition_data_per: '100g',
  nutriments: {
    'energy-kcal_100g': 376.666666666667,
    proteins_100g: 7,
    carbohydrates_100g: 84,
    fat_100g: 0.9,
    fiber_100g: 3,
    sodium_100g: 0.44,
    sugars_100g: 8,
    iron_100g: 0.008,
    'vitamin-b1_100g': 0.0009,
    'vitamin-b2_100g': 0.00133333333333333,
    'vitamin-b6_100g': 0.0012,
    'vitamin-d_100g': 0.0000084,
    'vitamin-pp_100g': 0.013,
  },
};

// nutrition_data_per is '100ml' here (not '100g'), exercising the per100
// === false branch: `_100g` fields are still read directly (OFF normalises
// them regardless), only the `_value` fallback is skipped.
const SMA_INFANT_FORMULA = {
  code: '7613038459912',
  product_name: 'Breast milk substitute',
  brands: 'Sma pro',
  nutrition_data_per: '100ml',
  nutriments: {
    'energy-kcal_100g': 67,
    proteins_100g: 1.24,
    carbohydrates_100g: 7.5,
    fat_100g: 3.6,
    fiber_100g: 0.1,
    sodium_100g: 0.021,
    sugars_100g: 7.3,
    'vitamin-a_100g': 0.00006,
    'vitamin-d_100g': 0.0000015,
    'vitamin-e_100g': 0.0015,
    'vitamin-k_100g': 0.0000042,
    'vitamin-c_100g': 0.01,
    'vitamin-pp_100g': 0.00051,
    folates_100g: 0.0000222,
    biotin_100g: 0.00000142,
    'pantothenic-acid_100g': 0.00052,
    potassium_100g: 0.077,
    chloride_100g: 0.05,
    calcium_100g: 0.043,
    phosphorus_100g: 0.024,
    magnesium_100g: 0.0057,
    iron_100g: 0.00031,
    zinc_100g: 0.00048,
    copper_100g: 0.00006,
    manganese_100g: 0.00002,
    fluoride_100g: 0.00001,
    selenium_100g: 0.0000036,
    iodine_100g: 0.0000149,
  },
};

describe('toRow() / microValuesFromNutriments() — real OFF fixture rows', () => {
  test('Twix: literal-0 micronutrients all resolve to null; genuine positives convert correctly', () => {
    const row = toRow(TWIX);
    expect(row).not.toBeNull();
    // Genuine positives (grams -> mg).
    expect(row.calcium_100g).toBe(35.731);
    expect(row.potassium_100g).toBe(75.285);
    expect(row.pantothenic_100g).toBe(0.113);
    // Literal 0 on the same product's iron/zinc/copper/manganese/
    // phosphorus/selenium/vitamin-a/vitamin-c/vitamin-e/vitamin-k must all
    // be null, never 0 — this is the smoking-gun product: its own
    // sodium_100g reads 0 despite genuinely having salt on the label,
    // proving OFF's literal zeros here are placeholder artefacts.
    expect(row.iron_100g).toBeNull();
    expect(row.zinc_100g).toBeNull();
    expect(row.copper_100g).toBeNull();
    expect(row.manganese_100g).toBeNull();
    expect(row.phosphorus_100g).toBeNull();
    expect(row.selenium_100g).toBeNull();
    expect(row.vit_a_100g).toBeNull();
    expect(row.vit_c_100g).toBeNull();
    expect(row.vit_e_100g).toBeNull();
    expect(row.vit_k_100g).toBeNull();
    // Fields entirely absent from this product's nutriments (never sent by
    // OFF at all) are also null, not 0.
    expect(row.thiamin_100g).toBeNull();
    expect(row.folate_100g).toBeNull();
  });

  test('Corn Flakes: mg and µg conversions both verified against hand-calculated expectations', () => {
    const row = toRow(CORN_FLAKES);
    expect(row).not.toBeNull();
    expect(row.iron_100g).toBe(8); // 0.008g -> 8mg
    expect(row.thiamin_100g).toBe(0.9); // 0.0009g -> 0.9mg
    expect(row.riboflavin_100g).toBeCloseTo(1.3333, 3); // 0.001333...g -> 1.333mg
    expect(row.vit_b6_100g).toBe(1.2); // 0.0012g -> 1.2mg
    expect(row.vit_d_100g).toBe(8.4); // 0.0000084g -> 8.4µg
    expect(row.niacin_100g).toBe(13); // vitamin-pp 0.013g -> 13mg
    // Fields this product doesn't carry at all.
    expect(row.calcium_100g).toBeNull();
    expect(row.vit_a_100g).toBeNull();
  });

  test('Sma Pro infant formula: broad micronutrient panel (21 of 27 present in this fixture), including mineral fields Corn Flakes/Twix lack', () => {
    const row = toRow(SMA_INFANT_FORMULA);
    expect(row).not.toBeNull();
    expect(row.vit_a_100g).toBe(60); // 0.00006g -> 60µg
    expect(row.vit_d_100g).toBe(1.5);
    expect(row.vit_e_100g).toBe(1.5);
    expect(row.vit_k_100g).toBe(4.2);
    expect(row.vit_c_100g).toBe(10);
    expect(row.niacin_100g).toBeCloseTo(0.51, 5);
    expect(row.folate_100g).toBeCloseTo(22.2, 5);
    expect(row.biotin_100g).toBeCloseTo(1.42, 5);
    expect(row.pantothenic_100g).toBe(0.52);
    expect(row.potassium_100g).toBe(77);
    expect(row.chloride_100g).toBe(50);
    expect(row.calcium_100g).toBe(43);
    expect(row.phosphorus_100g).toBe(24);
    expect(row.magnesium_100g).toBe(5.7);
    expect(row.iron_100g).toBeCloseTo(0.31, 5);
    expect(row.zinc_100g).toBeCloseTo(0.48, 5);
    expect(row.copper_100g).toBeCloseTo(0.06, 5);
    expect(row.manganese_100g).toBeCloseTo(0.02, 5);
    expect(row.fluoride_100g).toBeCloseTo(0.01, 5);
    expect(row.selenium_100g).toBeCloseTo(3.6, 5);
    expect(row.iodine_100g).toBeCloseTo(14.9, 5);
    // Chromium/molybdenum: this product carries neither, so both stay null
    // — OFF's taxonomy defines the fields but real coverage is sparse.
    expect(row.chromium_100g).toBeNull();
    expect(row.molybdenum_100g).toBeNull();
    // vitamin-b1/b2/b6/vitamin-b12 are entirely absent from this product.
    expect(row.thiamin_100g).toBeNull();
    expect(row.riboflavin_100g).toBeNull();
    expect(row.vit_b6_100g).toBeNull();
    expect(row.vit_b12_100g).toBeNull();
  });

  test('microValuesFromNutriments returns exactly the 27 canonical keys', () => {
    const values = microValuesFromNutriments(SMA_INFANT_FORMULA.nutriments, false);
    expect(Object.keys(values).sort()).toEqual([...MICRO_COLUMNS].sort());
  });

  test('a row missing core macros is still filtered out regardless of micronutrient content (unchanged behaviour)', () => {
    const noMacros = { ...CORN_FLAKES, nutriments: { ...CORN_FLAKES.nutriments, fat_100g: undefined } };
    expect(toRow(noMacros)).toBeNull();
  });
});

describe('measureMicronutrientCoverage() — coverage measurement', () => {
  test('counts per-column non-null coverage and computes the median across a small fixture set', () => {
    const rows = [toRow(TWIX), toRow(CORN_FLAKES), toRow(SMA_INFANT_FORMULA)];
    const { coverage, medianPerFood } = measureMicronutrientCoverage(rows);
    // Twix: calcium, potassium, pantothenic = 3 with data.
    // Corn Flakes: iron, thiamin, riboflavin, vit_b6, vit_d, niacin = 6.
    // Sma: 21 of 27 (this fixture omits thiamin/riboflavin/vit_b6/vit_b12,
    // which the test object simply never captured, plus chromium/
    // molybdenum which the real product doesn't carry).
    expect(coverage.calcium_100g).toBe(2); // Twix + Sma
    expect(coverage.iron_100g).toBe(2); // Corn Flakes + Sma (Twix's iron is 0 -> null)
    expect(coverage.chromium_100g).toBe(0);
    expect(coverage.molybdenum_100g).toBe(0);
    // Sorted per-food counts: [3, 6, 21] -> median (middle index 1) = 6.
    expect(medianPerFood).toBe(6);
  });

  test('an empty row set yields zero coverage and a zero median without throwing', () => {
    const { coverage, medianPerFood } = measureMicronutrientCoverage([]);
    expect(medianPerFood).toBe(0);
    expect(Object.values(coverage).every((v) => v === 0)).toBe(true);
  });
});
