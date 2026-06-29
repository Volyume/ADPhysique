/**
 * Tests for the USDA FoodData Central source + normaliser.
 */
import { normaliseUsdaFood } from '../food/normalisers/usdaToFood';
import { searchUsda, lookupBarcodeUsda } from '../food/sources/usda';

describe('normaliseUsdaFood', () => {
  test('returns null on missing food', () => {
    expect(normaliseUsdaFood(null)).toBeNull();
  });

  test('returns null when core macros are missing', () => {
    expect(normaliseUsdaFood({
      fdcId: 1, description: 'X',
      foodNutrients: [{ nutrientId: 1008, value: 100 }], // kcal only
    })).toBeNull();
  });

  test('normalises a Foundation food', () => {
    const r = normaliseUsdaFood({
      fdcId: 12345,
      description: 'Egg, whole, raw',
      foodNutrients: [
        { nutrientId: 1008, value: 143 },
        { nutrientId: 1003, value: 12.6 },
        { nutrientId: 1005, value: 0.7 },
        { nutrientId: 1004, value: 9.5 },
        { nutrientId: 1079, value: 0 },
      ],
    });
    expect(r).toMatchObject({
      food_ref: 'usda:12345',
      source: 'usda',
      name: 'Egg, whole, raw',
      kcal_100g: 143,
      protein_100g: 12.6,
      carbs_100g: 0.7,
      fat_100g: 9.5,
      fibre_100g: 0,
    });
  });

  test('keeps a millilitre serving size for beverages (D-5), instead of dropping to 100', () => {
    const r = normaliseUsdaFood({
      fdcId: 7, description: 'Cola',
      servingSize: 330, servingSizeUnit: 'ml',
      foodNutrients: [
        { nutrientNumber: '208', value: 42 },
        { nutrientNumber: '203', value: 0 },
        { nutrientNumber: '205', value: 10.6 },
        { nutrientNumber: '204', value: 0 },
      ],
    });
    expect(r.serving_g).toBe(330); // was 100 before the fix
    expect(r.kcal_100g).toBe(42);  // per-100g density untouched
  });

  test('still falls back to 100 for a non-mass serving unit (e.g. "cup")', () => {
    const r = normaliseUsdaFood({
      fdcId: 8, description: 'Soup',
      servingSize: 1, servingSizeUnit: 'cup',
      foodNutrients: [
        { nutrientNumber: '208', value: 50 },
        { nutrientNumber: '203', value: 2 },
        { nutrientNumber: '205', value: 6 },
        { nutrientNumber: '204', value: 1 },
      ],
    });
    expect(r.serving_g).toBe(100);
  });

  test('scans past a non-finite duplicate row to the row carrying the real value (D1 #4)', () => {
    const r = normaliseUsdaFood({
      fdcId: 1010,
      description: 'Branded item with duplicate kcal rows',
      foodNutrients: [
        { nutrientNumber: '208' },              // kcal row with no value (non-finite)
        { nutrientNumber: '208', value: 250 },  // duplicate kcal row carrying the real value
        { nutrientNumber: '203', value: 8 },
        { nutrientNumber: '205', value: 30 },
        { nutrientNumber: '204', value: 5 },
      ],
    });
    expect(r).not.toBeNull();
    expect(r.kcal_100g).toBe(250);
  });

  test('normalises a Branded food via nutrientNumber', () => {
    const r = normaliseUsdaFood({
      fdcId: 99,
      description: 'Brand X Cereal',
      brandOwner: 'Acme',
      gtinUpc: '0123456789012',
      servingSize: 30,
      servingSizeUnit: 'g',
      foodNutrients: [
        { nutrientNumber: '208', value: 380 },
        { nutrientNumber: '203', value: 7 },
        { nutrientNumber: '205', value: 80 },
        { nutrientNumber: '204', value: 3 },
      ],
    });
    expect(r).toMatchObject({
      food_ref: 'usda:99',
      brand: 'Acme',
      barcode_ean: '0123456789012',
      serving_g: 30,
      kcal_100g: 380,
    });
  });
});

describe('searchUsda / lookupBarcodeUsda', () => {
  const realKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  afterEach(() => {
    global.fetch = undefined;
    if (realKey !== undefined) process.env.EXPO_PUBLIC_USDA_API_KEY = realKey;
    else delete process.env.EXPO_PUBLIC_USDA_API_KEY;
  });

  test('search returns empty when API key is unset', async () => {
    delete process.env.EXPO_PUBLIC_USDA_API_KEY;
    global.fetch = jest.fn();
    const rows = await searchUsda('apple');
    expect(rows).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('barcode returns null when API key is unset', async () => {
    delete process.env.EXPO_PUBLIC_USDA_API_KEY;
    const r = await lookupBarcodeUsda('0123456789012');
    expect(r).toBeNull();
  });

  test('search returns rows on hit', async () => {
    process.env.EXPO_PUBLIC_USDA_API_KEY = 'test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [{
          fdcId: 1, description: 'Apple',
          foodNutrients: [
            { nutrientId: 1008, value: 52 },
            { nutrientId: 1003, value: 0.3 },
            { nutrientId: 1005, value: 14 },
            { nutrientId: 1004, value: 0.2 },
          ],
        }],
      }),
    });
    const rows = await searchUsda('apple', 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Apple');
  });

  test('search swallows network errors', async () => {
    process.env.EXPO_PUBLIC_USDA_API_KEY = 'test';
    global.fetch = jest.fn().mockRejectedValue(new Error('net'));
    expect(await searchUsda('apple')).toEqual([]);
  });
});
