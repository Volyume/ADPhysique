/**
 * Tests for the live OpenFoodFacts source.
 * Mocks global fetch; no real network calls.
 *
 * MN-1 micronutrients (item 16 data spike / D26 data enhancement,
 * 2026-07-10): the block below pins `_toRow`'s vitamin/mineral mapping
 * using the same real OFF product fixtures as scripts/seed/__tests__/
 * buildOffSnapshot.test.js (barcodes 5900951313592 "Twix", 3159470000120
 * "Corn Flakes"), so the live-fetch path is proven against genuine OFF
 * response shapes, not synthetic ones. See that test file's header and
 * liveOff.js's own header comment for the full unit-conversion and
 * zero-vs-unknown evidence trail.
 */
import { lookupBarcodeOff, searchOff, OFF_MICRO_FIELDS } from '../food/sources/liveOff';
import { MICRO_COLUMNS } from '../food/micronutrients';
const { OFF_MICRO_FIELDS: BUILDER_OFF_MICRO_FIELDS } = require('../../../scripts/seed/buildOffSnapshot');

function _mockFetch(impl) {
  global.fetch = jest.fn().mockImplementation(impl);
}

describe('lookupBarcodeOff', () => {
  afterEach(() => { global.fetch = undefined; });

  test('returns null for empty input', async () => {
    const r = await lookupBarcodeOff('');
    expect(r).toBeNull();
  });

  test('returns a normalised row on hit', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          code: '5000169005064',
          product_name: 'Tesco Finest Sourdough',
          brands: 'Tesco',
          serving_quantity: 50,
          serving_size: '50g (1 slice)',
          nutriments: {
            'energy-kcal_100g': 245,
            proteins_100g: 8.5,
            carbohydrates_100g: 48.2,
            fat_100g: 1.4,
            fiber_100g: 3.1,
          },
        },
      }),
    }));
    const r = await lookupBarcodeOff('5000169005064');
    expect(r).toMatchObject({
      food_ref: 'off:5000169005064',
      source: 'off_live',
      name: 'Tesco Finest Sourdough',
      brand: 'Tesco',
      serving_g: 50,
      kcal_100g: 245,
      protein_100g: 8.5,
      barcode_ean: '5000169005064',
    });
  });

  test('returns null on miss (status 0)', async () => {
    _mockFetch(async () => ({ ok: true, json: async () => ({ status: 0 }) }));
    const r = await lookupBarcodeOff('0000000000000');
    expect(r).toBeNull();
  });

  test('returns null on partial macros', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          code: '123', product_name: 'Test',
          nutriments: { 'energy-kcal_100g': 100 }, // missing protein/carbs/fat
        },
      }),
    }));
    const r = await lookupBarcodeOff('123');
    expect(r).toBeNull();
  });

  test('returns null on network error', async () => {
    _mockFetch(async () => { throw new Error('net'); });
    const r = await lookupBarcodeOff('5000169005064');
    expect(r).toBeNull();
  });

  test('returns null on non-ok HTTP', async () => {
    _mockFetch(async () => ({ ok: false, status: 500 }));
    const r = await lookupBarcodeOff('5000169005064');
    expect(r).toBeNull();
  });

  test('derives kcal from kJ when kcal_100g missing', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          code: '1', product_name: 'X',
          nutriments: {
            energy_100g: 1000, // kJ
            proteins_100g: 5, carbohydrates_100g: 10, fat_100g: 2,
          },
        },
      }),
    }));
    const r = await lookupBarcodeOff('1');
    // 1000 / 4.184 ~= 239
    expect(Math.round(r.kcal_100g)).toBe(239);
  });
});

describe('searchOff', () => {
  afterEach(() => { global.fetch = undefined; });

  test('returns empty for short query', async () => {
    expect(await searchOff('')).toEqual([]);
    expect(await searchOff('  ')).toEqual([]);
  });

  test('returns normalised rows, filtering partial macros', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        products: [
          {
            code: '1', product_name: 'Good',
            nutriments: {
              'energy-kcal_100g': 100, proteins_100g: 5,
              carbohydrates_100g: 10, fat_100g: 2,
            },
          },
          {
            code: '2', product_name: 'Bad',
            nutriments: { 'energy-kcal_100g': 200 },
          },
        ],
      }),
    }));
    const rows = await searchOff('sourdough', 10);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Good');
  });

  test('returns empty array on network failure', async () => {
    _mockFetch(async () => { throw new Error('net'); });
    expect(await searchOff('milk')).toEqual([]);
  });
});

describe('OFF_MICRO_FIELDS — drift guard between liveOff.js and buildOffSnapshot.js', () => {
  afterEach(() => { global.fetch = undefined; });

  test('every mapped column is one of the 27 canonical MICRO_COLUMNS, all 27 covered', () => {
    const canonical = new Set(MICRO_COLUMNS);
    const mapped = new Set(OFF_MICRO_FIELDS.map((f) => f.column));
    for (const f of OFF_MICRO_FIELDS) expect(canonical.has(f.column)).toBe(true);
    expect([...mapped].sort()).toEqual([...canonical].sort());
  });

  test('liveOff.js and buildOffSnapshot.js map identical offKey/unit per column (cannot silently drift)', () => {
    const byColumn = (list) => Object.fromEntries(list.map((f) => [f.column, { offKey: f.offKey, unit: f.unit }]));
    expect(byColumn(OFF_MICRO_FIELDS)).toEqual(byColumn(BUILDER_OFF_MICRO_FIELDS));
  });
});

describe('lookupBarcodeOff — micronutrient mapping on real OFF fixtures', () => {
  afterEach(() => { global.fetch = undefined; });

  test('Twix (5900951313592): literal-0 micronutrients resolve to null; genuine positives convert grams -> mg', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
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
            calcium_100g: 0.035731,
            potassium_100g: 0.075285,
            'pantothenic-acid_100g': 0.000113,
            iron_100g: 0,
            'vitamin-a_100g': 0,
            'vitamin-c_100g': 0,
          },
        },
      }),
    }));
    const r = await lookupBarcodeOff('5900951313592');
    expect(r.calcium_100g).toBe(35.731);
    expect(r.potassium_100g).toBe(75.285);
    expect(r.pantothenic_100g).toBe(0.113);
    // Literal 0 -> null, never a verified zero (this product's own
    // sodium_100g: 0 is the evidence it's a placeholder, not a real zero:
    // it declares real sugars/fat on the label, so genuine zeros elsewhere
    // on the same row cannot be assumed trustworthy).
    expect(r.iron_100g).toBeNull();
    expect(r.vit_a_100g).toBeNull();
    expect(r.vit_c_100g).toBeNull();
    // Never sent by OFF for this product at all.
    expect(r.folate_100g).toBeNull();
    expect(r.vit_b12_100g).toBeNull();
  });

  test('Corn Flakes (3159470000120): mg and µg conversions match hand-calculated expectations', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
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
            iron_100g: 0.008,
            'vitamin-b1_100g': 0.0009,
            'vitamin-d_100g': 0.0000084,
            'vitamin-pp_100g': 0.013,
          },
        },
      }),
    }));
    const r = await lookupBarcodeOff('3159470000120');
    expect(r.iron_100g).toBe(8); // 0.008g -> 8mg
    expect(r.thiamin_100g).toBe(0.9); // 0.0009g -> 0.9mg
    expect(r.vit_d_100g).toBe(8.4); // 0.0000084g -> 8.4µg
    expect(r.niacin_100g).toBe(13); // vitamin-pp 0.013g -> 13mg
    expect(r.calcium_100g).toBeNull(); // absent from this product entirely
  });

  test('a product with no micronutrient fields at all still returns null for every column, not undefined/0', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          code: '1', product_name: 'Plain',
          nutriments: {
            'energy-kcal_100g': 100, proteins_100g: 5,
            carbohydrates_100g: 10, fat_100g: 2,
          },
        },
      }),
    }));
    const r = await lookupBarcodeOff('1');
    for (const col of MICRO_COLUMNS) expect(r[col]).toBeNull();
  });

  test('a negative micronutrient reading (bad data) resolves to null, not a negative amount', async () => {
    _mockFetch(async () => ({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          code: '2', product_name: 'Bad data',
          nutriments: {
            'energy-kcal_100g': 100, proteins_100g: 5,
            carbohydrates_100g: 10, fat_100g: 2,
            iron_100g: -0.01,
          },
        },
      }),
    }));
    const r = await lookupBarcodeOff('2');
    expect(r.iron_100g).toBeNull();
  });
});
