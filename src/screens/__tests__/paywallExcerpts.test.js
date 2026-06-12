/**
 * COMP-007 Stage B — paywall review excerpts (ships dark until curated).
 */
import { PAYWALL_EXCERPTS, pickPaywallExcerpt } from '../paywallExcerpts';

describe('paywallExcerpts', () => {
  test('ships dark: the list is empty, so the block does not render', () => {
    expect(PAYWALL_EXCERPTS).toHaveLength(0);
    expect(pickPaywallExcerpt(new Date('2026-05-01T00:00:00Z'))).toBeNull();
  });

  test('pick never throws across dates and stays null while empty', () => {
    for (const d of ['2026-01-01', '2026-06-15', '2026-12-31']) {
      expect(() => pickPaywallExcerpt(new Date(`${d}T12:00:00Z`))).not.toThrow();
      expect(pickPaywallExcerpt(new Date(`${d}T12:00:00Z`))).toBeNull();
    }
  });

  // Guards the contract: any future curated entry must carry verifiable
  // provenance (the honesty contract in paywallExcerpts.js).
  test('any curated excerpt carries stars + verbatim quote + Google Play provenance', () => {
    for (const e of PAYWALL_EXCERPTS) {
      expect(e.stars).toBeGreaterThanOrEqual(1);
      expect(e.stars).toBeLessThanOrEqual(5);
      expect(typeof e.quote).toBe('string');
      expect(e.quote.length).toBeGreaterThan(0);
      expect(e.source).toBe('Google Play');
      expect(typeof e.name).toBe('string');
      expect(typeof e.date).toBe('string');
    }
  });
});
