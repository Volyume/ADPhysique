/**
 * plateMath.test.js — pins the plate calculator arithmetic (B8).
 *
 * What this suite pins and why: the calculator is read at the bar between
 * sets, so a wrong breakdown is wrong weight lifted. The invariants that
 * must never break: the loading is greedy largest-first per side, the
 * loaded total NEVER exceeds the target, the remainder is exact (integer
 * quarter-kg arithmetic — floating-point dust must not flip a plate),
 * below-bar and rubbish inputs degrade to safe answers instead of
 * crashing, and identical inputs always produce identical answers
 * (determinism is a house rule).
 */
import { calculatePlates, PLATE_SET_KG, DEFAULT_BAR_KG } from '../plateMath';

describe('calculatePlates — exact loads', () => {
  test('100 kg on a 20 kg bar: 40 per side = 25 + 15', () => {
    const r = calculatePlates(100);
    expect(r.ok).toBe(true);
    expect(r.belowBar).toBe(false);
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.sideKg).toBe(40);
    expect(r.loadedKg).toBe(100);
    expect(r.remainderKg).toBe(0);
  });

  test('60 kg: one 20 per side', () => {
    const r = calculatePlates(60);
    expect(r.perSide).toEqual([{ plate: 20, count: 1 }]);
    expect(r.loadedKg).toBe(60);
    expect(r.remainderKg).toBe(0);
  });

  test('the bar itself: 20 kg loads nothing, exactly', () => {
    const r = calculatePlates(20);
    expect(r.ok).toBe(true);
    expect(r.belowBar).toBe(false);
    expect(r.perSide).toEqual([]);
    expect(r.loadedKg).toBe(20);
    expect(r.remainderKg).toBe(0);
  });

  test('big total uses repeated 25s: 220 kg = 4×25 per side', () => {
    const r = calculatePlates(220);
    expect(r.perSide).toEqual([{ plate: 25, count: 4 }]);
    expect(r.loadedKg).toBe(220);
  });

  test('smallest increment resolves: 22.5 kg = 1.25 per side', () => {
    const r = calculatePlates(22.5);
    expect(r.perSide).toEqual([{ plate: 1.25, count: 1 }]);
    expect(r.loadedKg).toBe(22.5);
    expect(r.remainderKg).toBe(0);
  });
});

describe('calculatePlates — inexact targets and the never-overshoot rule', () => {
  test('unachievable oddment loads the closest UNDER weight and reports the remainder', () => {
    // 61 kg: 20.5 per side -> greedy takes one 20 plate, 0.5/side
    // unloadable -> loaded 60, 1 kg short overall.
    const r = calculatePlates(61);
    expect(r.perSide).toEqual([{ plate: 20, count: 1 }]);
    expect(r.loadedKg).toBe(60);
    expect(r.remainderKg).toBe(1);
  });

  test('loaded weight never exceeds the target across a dense sweep', () => {
    for (let t = 20; t <= 200; t += 0.25) {
      const r = calculatePlates(t);
      expect(r.loadedKg).toBeLessThanOrEqual(t + 1e-9);
    }
  });

  test('floating-point dust cannot flip a plate: 0.1+0.2-style inputs', () => {
    // 67.5 arrived at through FP arithmetic must equal a clean 67.5.
    const dusty = 60 + 0.1 + 0.2 + 7.2 - 0.000000000000004;
    const clean = calculatePlates(67.5);
    const fromDust = calculatePlates(dusty);
    expect(fromDust.perSide).toEqual(clean.perSide);
    expect(fromDust.loadedKg).toBe(clean.loadedKg);
  });
});

describe('calculatePlates — edges fail safe', () => {
  test('below the bar: belowBar flag, nothing loaded, no crash', () => {
    const r = calculatePlates(15, 20);
    expect(r.ok).toBe(true);
    expect(r.belowBar).toBe(true);
    expect(r.perSide).toEqual([]);
    expect(r.loadedKg).toBe(20);
  });

  test.each([[NaN], [Infinity], [-5], [0], ['']])('unusable target %p -> ok:false, empty result', (bad) => {
    const r = calculatePlates(bad);
    expect(r.ok).toBe(false);
    expect(r.perSide).toEqual([]);
  });

  test('unusable bar weight -> ok:false', () => {
    expect(calculatePlates(100, 0).ok).toBe(false);
    expect(calculatePlates(100, NaN).ok).toBe(false);
  });

  test('custom bar weight is respected (EZ bar 10 kg)', () => {
    const r = calculatePlates(30, 10);
    expect(r.perSide).toEqual([{ plate: 10, count: 1 }]);
    expect(r.loadedKg).toBe(30);
  });

  test('plate set order does not matter (greedy sorts internally)', () => {
    const shuffled = [...PLATE_SET_KG].reverse();
    expect(calculatePlates(100, 20, shuffled)).toEqual(calculatePlates(100));
  });

  test('off-grid denominations are rejected, so overshoot stays impossible', () => {
    // A 1.1 kg plate is not a quarter-kg multiple: the integer arithmetic
    // would snap it during allocation but report its real value, producing
    // a loaded weight ABOVE the target and a negative remainder. Such
    // denominations are filtered out of the set instead.
    const r = calculatePlates(30, 20, [1.1]);
    expect(r.perSide).toEqual([]);
    expect(r.loadedKg).toBe(20);
    expect(r.remainderKg).toBeGreaterThanOrEqual(0);
    // Mixed sets keep only the real plates.
    expect(calculatePlates(30, 20, [1.1, 5])).toEqual(calculatePlates(30, 20, [5]));
  });
});

describe('determinism and constants', () => {
  test('identical inputs, identical outputs, every time', () => {
    const a = calculatePlates(137.5, 20);
    const b = calculatePlates(137.5, 20);
    expect(a).toEqual(b);
  });

  test('the kg plate set and bar default are the physical standards', () => {
    expect(PLATE_SET_KG).toEqual([25, 20, 15, 10, 5, 2.5, 1.25]);
    expect(DEFAULT_BAR_KG).toBe(20);
  });
});
