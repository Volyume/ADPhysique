/**
 * st/lb conversion carry (audit 2026-07-01). kgToStoneLbs rounded the lb
 * remainder to nearest 0.5, which can land on 14.0 — that must carry into the
 * next stone (N+1 st, 0 lb), not display "N st 14 lb" or corrupt the st/lb
 * round-trip on edit.
 */
import { kgToStoneLbs, stoneLbsToKg } from '../units';

describe('kgToStoneLbs carry', () => {
  test('never returns 14 lb — it carries into the next stone', () => {
    // Sweep a fine grid of kg values across several stone boundaries and assert
    // the lb component is always in [0, 14).
    for (let kg = 40; kg <= 160; kg += 0.01) {
      const { stone, lbs } = kgToStoneLbs(kg);
      expect(lbs).toBeGreaterThanOrEqual(0);
      expect(lbs).toBeLessThan(14);
      expect(Number.isInteger(stone)).toBe(true);
    }
  });

  test('a value that rounds the remainder up to 14 carries the stone', () => {
    // 13.8 lb over a whole stone rounds to 14.0 → must become the next stone.
    const kg = stoneLbsToKg(10, 13.8); // 10 st 13.8 lb
    const { stone, lbs } = kgToStoneLbs(kg);
    expect(stone).toBe(11);
    expect(lbs).toBe(0);
  });

  test('st/lb round-trips within half a pound across boundaries', () => {
    for (const [st, lb] of [[10, 0], [10, 13.5], [11, 0], [12, 7], [9, 13]]) {
      const kg = stoneLbsToKg(st, lb);
      const back = kgToStoneLbs(kg);
      const totalLbsIn = st * 14 + lb;
      const totalLbsOut = back.stone * 14 + back.lbs;
      expect(Math.abs(totalLbsOut - totalLbsIn)).toBeLessThanOrEqual(0.5);
    }
  });
});
