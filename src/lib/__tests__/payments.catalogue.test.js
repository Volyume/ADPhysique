/**
 * Tests for the locked SKU catalogue. Values match
 * SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 57-67 verbatim.
 */
import {
  SKU_CATALOGUE,
  skuFor,
  priceTextFor,
  skuById,
  allSkuIds,
  PRICING_WINDOWS,
  TIERS,
} from '../payments/catalogue';

describe('SKU catalogue locked values', () => {
  test('PRICING_WINDOWS lists the three locked windows', () => {
    expect(PRICING_WINDOWS).toEqual(['open_beta', 'founders', 'standard']);
  });

  test('TIERS lists the two consumer tiers (coach SKUs are separate)', () => {
    expect(TIERS).toEqual(['pro', 'complete']);
  });

  test('Pro SKU IDs match locked spec', () => {
    expect(SKU_CATALOGUE.pro.open_beta.id).toBe('pro_monthly_open_beta');
    expect(SKU_CATALOGUE.pro.founders.id).toBe('pro_monthly_founders');
    expect(SKU_CATALOGUE.pro.standard.id).toBe('pro_monthly_standard');
  });

  test('Complete SKU IDs match locked spec', () => {
    expect(SKU_CATALOGUE.complete.open_beta.id).toBe('complete_monthly_open_beta');
    expect(SKU_CATALOGUE.complete.founders.id).toBe('complete_monthly_founders');
    expect(SKU_CATALOGUE.complete.standard.id).toBe('complete_monthly_standard');
  });

  test('UK prices match locked spec', () => {
    expect(SKU_CATALOGUE.pro.open_beta.priceNumber).toBe(0.99);
    expect(SKU_CATALOGUE.pro.founders.priceNumber).toBe(1.49);
    expect(SKU_CATALOGUE.pro.standard.priceNumber).toBe(2.99);
    expect(SKU_CATALOGUE.complete.open_beta.priceNumber).toBe(1.99);
    expect(SKU_CATALOGUE.complete.founders.priceNumber).toBe(3.49);
    expect(SKU_CATALOGUE.complete.standard.priceNumber).toBe(6.99);
  });
});

describe('Catalogue lookup helpers', () => {
  test('skuFor returns the correct record', () => {
    expect(skuFor('pro', 'open_beta').id).toBe('pro_monthly_open_beta');
    expect(skuFor('complete', 'standard').priceText).toBe('£6.99/month');
  });

  test('skuFor returns null on unknown inputs (no throw)', () => {
    expect(skuFor('pro', 'something_else')).toBeNull();
    expect(skuFor('platinum', 'open_beta')).toBeNull();
    expect(skuFor(null, null)).toBeNull();
  });

  test('priceTextFor returns formatted price', () => {
    expect(priceTextFor('pro', 'open_beta')).toBe('£0.99/month');
    expect(priceTextFor('complete', 'founders')).toBe('£3.49/month');
  });

  test('priceTextFor returns null on unknown', () => {
    expect(priceTextFor('pro', 'unknown')).toBeNull();
  });

  test('skuById round-trips through every SKU', () => {
    for (const tier of TIERS) {
      for (const win of PRICING_WINDOWS) {
        const sku = SKU_CATALOGUE[tier][win];
        expect(skuById(sku.id)).toEqual(sku);
      }
    }
  });

  test('skuById returns null for unknown id', () => {
    expect(skuById('pro_yearly_open_beta')).toBeNull();
    expect(skuById('')).toBeNull();
  });

  test('allSkuIds returns exactly 6 locked IDs', () => {
    const ids = allSkuIds();
    expect(ids).toHaveLength(6);
    expect(ids).toContain('pro_monthly_open_beta');
    expect(ids).toContain('complete_monthly_standard');
  });
});

describe('Catalogue immutability', () => {
  test('SKU_CATALOGUE is deeply frozen', () => {
    expect(Object.isFrozen(SKU_CATALOGUE)).toBe(true);
    expect(Object.isFrozen(SKU_CATALOGUE.pro)).toBe(true);
    expect(Object.isFrozen(SKU_CATALOGUE.pro.open_beta)).toBe(true);
  });
});
