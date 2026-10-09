/**
 * livePrescription.dumbbell.test.js: pins D220 addendum 34 (2026-10-09, the
 * logger audit's D11): a dumbbell's load step is the gap to the next bell on
 * the rack, never the 5%-capped plate increment that put a 22 kg bell at
 * 23 kg. Written to FAIL if the plate maths comes back for dumbbells, or if
 * the rule leaks onto barbells or an lbs user.
 */
import { nextDumbbellLoadKg, resolveLoadIncrement } from '../livePrescription';

describe('nextDumbbellLoadKg', () => {
  test('below 10 kg the rack steps by 1 kg', () => {
    expect(nextDumbbellLoadKg(7)).toBe(8);
    expect(nextDumbbellLoadKg(7.5)).toBe(8);
    expect(nextDumbbellLoadKg(9)).toBe(10);
  });
  test('from 10 kg a load on the 2.5 grid steps 2.5, a load on the even grid steps 2', () => {
    expect(nextDumbbellLoadKg(10)).toBe(12.5);
    expect(nextDumbbellLoadKg(15)).toBe(17.5);
    expect(nextDumbbellLoadKg(22.5)).toBe(25);
    expect(nextDumbbellLoadKg(22)).toBe(24);
    expect(nextDumbbellLoadKg(14)).toBe(16);
  });
  test('a load on neither grid rounds up to the 2.5 grid', () => {
    expect(nextDumbbellLoadKg(23)).toBe(25);
    expect(nextDumbbellLoadKg(21)).toBe(22.5);
  });
  test('a non-positive or non-finite load has no bell', () => {
    expect(nextDumbbellLoadKg(0)).toBeNull();
    expect(nextDumbbellLoadKg(-5)).toBeNull();
    expect(nextDumbbellLoadKg('x')).toBeNull();
  });
});

describe('resolveLoadIncrement on a dumbbell', () => {
  test('the increment is the gap to the next bell, not 5% of the load', () => {
    expect(resolveLoadIncrement(22, { units: 'kg', category: 'accessory', equipmentCategory: 'dumbbell' })).toBe(2);
    expect(resolveLoadIncrement(22.5, { units: 'kg', category: 'accessory', equipmentCategory: 'Dumbbell' })).toBe(2.5);
    expect(resolveLoadIncrement(7, { units: 'kg', category: 'isolation', equipmentCategory: 'dumbbell' })).toBe(1);
  });
  test('a barbell keeps the plate maths and an lbs user keeps theirs', () => {
    // 0.75 is the 5%-capped, quarter-rounded accessory step at 22 kg.
    expect(resolveLoadIncrement(22, { units: 'kg', category: 'accessory', equipmentCategory: 'barbell' })).toBe(0.75);
    const lbsBarbell = resolveLoadIncrement(22, { units: 'lbs', category: 'accessory', equipmentCategory: 'barbell' });
    expect(resolveLoadIncrement(22, { units: 'lbs', category: 'accessory', equipmentCategory: 'dumbbell' })).toBe(lbsBarbell);
    expect(lbsBarbell).not.toBe(2);
  });
});
