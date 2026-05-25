/**
 * Tests for the locked SKU catalogue. Values match
 * SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 71-77 verbatim (re-locked
 * 2026-05-25 to the 2-tier model: 3 Pro SKUs, no Complete).
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

describe('SKU catalogue locked values (2-tier model)', () => {
  test('PRICING_WINDOWS lists the three locked windows', () => {
    expect(PRICING_WINDOWS).toEqual(['open_beta', 'founders', 'standard']);
  });

  test('TIERS contains only Pro (Complete removed 2026-05-25)', () => {
    expect(TIERS).toEqual(['pro']);
  });

  test('Pro SKU IDs match locked spec', () => {
    expect(SKU_CATALOGUE.pro.open_beta.id).toBe('pro_monthly_open_beta');
    expect(SKU_CATALOGUE.pro.founders.id).toBe('pro_monthly_founders');
    expect(SKU_CATALOGUE.pro.standard.id).toBe('pro_monthly_standard');
  });

  test('UK prices match locked 2-tier spec', () => {
    expect(SKU_CATALOGUE.pro.open_beta.priceNumber).toBe(0.99);
    expect(SKU_CATALOGUE.pro.founders.priceNumber).toBe(1.99);
    expect(SKU_CATALOGUE.pro.standard.priceNumber).toBe(3.99);
  });

  test('Complete SKUs are gone', () => {
    expect(SKU_CATALOGUE.complete).toBeUndefined();
  });
});

describe('Catalogue lookup helpers', () => {
  test('skuFor returns the correct record', () => {
    expect(skuFor('pro', 'open_beta').id).toBe('pro_monthly_open_beta');
    expect(skuFor('pro', 'standard').priceText).toBe('£3.99/month');
  });

  test('skuFor returns null on unknown inputs (no throw)', () => {
    expect(skuFor('pro', 'something_else')).toBeNull();
    expect(skuFor('platinum', 'open_beta')).toBeNull();
    expect(skuFor(null, null)).toBeNull();
  });

  test('skuFor returns null for legacy Complete tier requests', () => {
    expect(skuFor('complete', 'open_beta')).toBeNull();
    expect(skuFor('complete', 'founders')).toBeNull();
    expect(skuFor('complete', 'standard')).toBeNull();
  });

  test('priceTextFor returns formatted price', () => {
    expect(priceTextFor('pro', 'open_beta')).toBe('£0.99/month');
    expect(priceTextFor('pro', 'founders')).toBe('£1.99/month');
    expect(priceTextFor('pro', 'standard')).toBe('£3.99/month');
  });

  test('priceTextFor returns null on unknown', () => {
    expect(priceTextFor('pro', 'unknown')).toBeNull();
    expect(priceTextFor('complete', 'open_beta')).toBeNull();
  });

  test('skuById round-trips through every Pro SKU', () => {
    for (const win of PRICING_WINDOWS) {
      const sku = SKU_CATALOGUE.pro[win];
      expect(skuById(sku.id)).toEqual(sku);
    }
  });

  test('skuById returns null for unknown id', () => {
    expect(skuById('pro_yearly_open_beta')).toBeNull();
    expect(skuById('complete_monthly_open_beta')).toBeNull();
    expect(skuById('')).toBeNull();
  });

  test('allSkuIds returns exactly 3 locked IDs', () => {
    const ids = allSkuIds();
    expect(ids).toHaveLength(3);
    expect(ids).toContain('pro_monthly_open_beta');
    expect(ids).toContain('pro_monthly_founders');
    expect(ids).toContain('pro_monthly_standard');
  });
});

describe('Catalogue immutability', () => {
  test('SKU_CATALOGUE is deeply frozen', () => {
    expect(Object.isFrozen(SKU_CATALOGUE)).toBe(true);
    expect(Object.isFrozen(SKU_CATALOGUE.pro)).toBe(true);
    expect(Object.isFrozen(SKU_CATALOGUE.pro.open_beta)).toBe(true);
  });
});
