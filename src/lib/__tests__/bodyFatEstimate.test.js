import { getBodyFatBands } from '../bodyFatEstimate';

describe('getBodyFatBands', () => {
  test('returns four ascending bands for males', () => {
    const b = getBodyFatBands('male');
    expect(b).toHaveLength(4);
    const pcts = b.map(x => x.pct);
    expect([...pcts].sort((a, c) => a - c)).toEqual(pcts);
  });

  test('female bands sit higher than male bands (essential-fat reality)', () => {
    const m = getBodyFatBands('male');
    const f = getBodyFatBands('female');
    expect(f[0].pct).toBeGreaterThan(m[0].pct);
  });

  test('unknown sex falls back to male bands, never throws', () => {
    expect(() => getBodyFatBands(undefined)).not.toThrow();
    expect(getBodyFatBands('other')).toEqual(getBodyFatBands('male'));
  });

  test('every band has a label, percentage and hint', () => {
    for (const band of [...getBodyFatBands('male'), ...getBodyFatBands('female')]) {
      expect(typeof band.label).toBe('string');
      expect(Number.isFinite(band.pct)).toBe(true);
      expect(typeof band.hint).toBe('string');
      expect(band.hint).not.toMatch(/—/);
    }
  });
});
