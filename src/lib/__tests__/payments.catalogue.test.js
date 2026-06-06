/**
 * Tests for the consumer SKU catalogue. Values match the 2026-06-06
 * founder override: flat pricing, Pro at £4.99/month or £29.99/year,
 * the old launch/founders/standard windows retired.
 */
import {
  SKU_CATALOGUE,
  skuFor,
  priceTextFor,
  skuById,
  allSkuIds,
  annualSavingsPct,
  BILLING_PERIODS,
  TIERS,
} from '../payments/catalogue';

describe('SKU catalogue (flat pricing, monthly + annual)', () => {
  test('BILLING_PERIODS lists monthly and annual', () => {
    expect(BILLING_PERIODS).toEqual(['monthly', 'annual']);
  });

  test('TIERS contains only Pro', () => {
    expect(TIERS).toEqual(['pro']);
  });

  test('Pro SKU IDs match the products to create in Play Console', () => {
    expect(SKU_CATALOGUE.pro.monthly.id).toBe('pro_monthly');
    expect(SKU_CATALOGUE.pro.annual.id).toBe('pro_annual');
  });

  test('UK prices are the flat £4.99/month and £29.99/year', () => {
    expect(SKU_CATALOGUE.pro.monthly.priceNumber).toBe(4.99);
    expect(SKU_CATALOGUE.pro.annual.priceNumber).toBe(29.99);
    expect(SKU_CATALOGUE.pro.monthly.priceText).toBe('£4.99/month');
    expect(SKU_CATALOGUE.pro.annual.priceText).toBe('£29.99/year');
  });

  test('legacy Complete tier is gone', () => {
    expect(SKU_CATALOGUE.complete).toBeUndefined();
  });
});

describe('Catalogue lookup helpers', () => {
  test('skuFor returns the right record per period', () => {
    expect(skuFor('pro', 'monthly').id).toBe('pro_monthly');
    expect(skuFor('pro', 'annual').id).toBe('pro_annual');
  });

  test('skuFor defaults to monthly and is lenient on legacy/unknown periods', () => {
    expect(skuFor('pro').id).toBe('pro_monthly');
    expect(skuFor('pro', 'open_beta').id).toBe('pro_monthly'); // legacy window string
    expect(skuFor('pro', 'whatever').id).toBe('pro_monthly');
  });

  test('skuFor returns null for non-Pro tiers (no throw)', () => {
    expect(skuFor('complete', 'monthly')).toBeNull();
    expect(skuFor('platinum', 'annual')).toBeNull();
    expect(skuFor(null, null)).toBeNull();
  });

  test('priceTextFor returns the formatted price', () => {
    expect(priceTextFor('pro', 'monthly')).toBe('£4.99/month');
    expect(priceTextFor('pro', 'annual')).toBe('£29.99/year');
    expect(priceTextFor('pro')).toBe('£4.99/month');
  });

  test('priceTextFor returns null for non-Pro', () => {
    expect(priceTextFor('complete', 'monthly')).toBeNull();
  });

  test('skuById round-trips through every SKU', () => {
    for (const period of BILLING_PERIODS) {
      const sku = SKU_CATALOGUE.pro[period];
      expect(skuById(sku.id)).toEqual(sku);
    }
  });

  test('skuById returns null for unknown id', () => {
    expect(skuById('pro_monthly_open_beta')).toBeNull(); // old id
    expect(skuById('complete_monthly')).toBeNull();
  });

  test('allSkuIds lists both products', () => {
    expect(allSkuIds()).toEqual(['pro_monthly', 'pro_annual']);
  });

  test('annual saves roughly 50% over twelve monthly payments', () => {
    expect(annualSavingsPct()).toBe(50);
  });
});
