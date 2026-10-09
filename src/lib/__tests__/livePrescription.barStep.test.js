/**
 * The keyboard bar's weight step (D220 addendum 37, audit D7). Pins against
 * the REAL resolver that a step is always a load the person can put on:
 *   - a barbell never steps below 2.5 kg (the coach's 5%-capped increment
 *     gave 20 -> 21 -> 24.25 kg);
 *   - a kettlebell steps up to the next bell and DOWN to the previous bell
 *     (12 down is 10, never 8);
 *   - a dumbbell steps down the rack by the rack's own rule (10 down is 9,
 *     22.5 down is 20, 23 down is 22.5);
 *   - lbs floors at 5 lb and ignores the kg ladders;
 *   - resolveLoadIncrement itself (the coach's rule) is untouched.
 */
import {
  resolveBarLoadStep, resolveLoadIncrement, prevKettlebellLoadKg, prevDumbbellLoadKg,
} from '../livePrescription';

describe('prevKettlebellLoadKg', () => {
  test('the previous bell on the ladder, null below the bottom', () => {
    expect(prevKettlebellLoadKg(12)).toBe(10);
    expect(prevKettlebellLoadKg(16)).toBe(12);
    expect(prevKettlebellLoadKg(15)).toBe(12);
    expect(prevKettlebellLoadKg(4)).toBeNull();
    expect(prevKettlebellLoadKg(0)).toBeNull();
    expect(prevKettlebellLoadKg('x')).toBeNull();
  });
});

describe('prevDumbbellLoadKg', () => {
  test('the rack rule downward', () => {
    expect(prevDumbbellLoadKg(10)).toBe(9);
    expect(prevDumbbellLoadKg(9.5)).toBe(9);
    expect(prevDumbbellLoadKg(22.5)).toBe(20);
    expect(prevDumbbellLoadKg(22)).toBe(20);
    expect(prevDumbbellLoadKg(23)).toBe(22.5);
    expect(prevDumbbellLoadKg(12.5)).toBe(10);
    expect(prevDumbbellLoadKg(1)).toBeNull();
  });
});

describe('resolveBarLoadStep', () => {
  test('a barbell never steps by less than 2.5 kg', () => {
    const opts = { units: 'kg', category: 'compound', equipmentCategory: 'barbell' };
    expect(resolveLoadIncrement(20, opts)).toBe(1);
    expect(resolveBarLoadStep(20, opts, 'up')).toBe(2.5);
    expect(resolveBarLoadStep(20, opts, 'down')).toBe(2.5);
    expect(resolveBarLoadStep(24, opts, 'up')).toBe(2.5);
    // A heavy bar keeps the coach's own larger increment.
    expect(resolveBarLoadStep(140, opts, 'up')).toBe(resolveLoadIncrement(140, opts));
  });

  test('a kettlebell steps to the next bell up and the previous bell down', () => {
    const opts = { units: 'kg', equipmentCategory: 'kettlebell' };
    expect(resolveBarLoadStep(12, opts, 'up')).toBe(4);
    expect(resolveBarLoadStep(12, opts, 'down')).toBe(2);
    expect(resolveBarLoadStep(16, opts, 'down')).toBe(4);
  });

  test('a dumbbell steps down the rack by its own rule', () => {
    const opts = { units: 'kg', equipmentCategory: 'dumbbell' };
    expect(resolveBarLoadStep(10, opts, 'up')).toBe(2.5);
    expect(resolveBarLoadStep(10, opts, 'down')).toBe(1);
    expect(resolveBarLoadStep(22.5, opts, 'down')).toBe(2.5);
    expect(resolveBarLoadStep(22, opts, 'down')).toBe(2);
  });

  test('lbs floors at 5 and ignores the kg ladders', () => {
    expect(resolveBarLoadStep(45, { units: 'lbs', equipmentCategory: 'barbell' }, 'up')).toBe(5);
    expect(resolveBarLoadStep(25, { units: 'lbs', equipmentCategory: 'kettlebell' }, 'down')).toBe(5);
  });
});
