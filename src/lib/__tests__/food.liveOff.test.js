/**
 * Tests for the live OpenFoodFacts source.
 * Mocks global fetch; no real network calls.
 */
import { lookupBarcodeOff, searchOff } from '../food/sources/liveOff';

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
