/**
 * format.js — en-GB number + energy-unit display helpers.
 *
 * The energy block locks the kcal⇄kJ DISPLAY contract: the conversion is
 * display-only (stored values + nutrition targets + the coaching engine stay in
 * kcal), 1 kcal = 4.184 kJ, output is whole-number en-GB-grouped, and a
 * non-finite input never prints NaN.
 */
import {
  formatNumber, formatDecimal,
  toEnergy, energyUnitLabel, formatEnergy, KJ_PER_KCAL,
} from '../format';

describe('formatNumber / formatDecimal (en-GB)', () => {
  test('groups thousands and tolerates non-finite', () => {
    expect(formatNumber(3400)).toBe('3,400');
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(undefined, { fallback: '—' })).toBe('—');
    expect(formatDecimal(2.5, 1)).toBe('2.5');
  });
});

describe('toEnergy — kcal ⇄ kJ conversion (display only)', () => {
  test('kcal is the identity (rounded to whole)', () => {
    expect(toEnergy(1680, 'kcal')).toBe(1680);
    expect(toEnergy(1680.4)).toBe(1680); // default unit is kcal
    expect(toEnergy(99.6, 'kcal')).toBe(100);
  });
  test('kj multiplies by 4.184 and rounds', () => {
    expect(KJ_PER_KCAL).toBe(4.184);
    expect(toEnergy(1000, 'kj')).toBe(4184);
    expect(toEnergy(100, 'kj')).toBe(418);   // 418.4 -> 418
    expect(toEnergy(250, 'kj')).toBe(1046);  // 1046.0
  });
  test('non-finite input is 0, never NaN', () => {
    expect(toEnergy(NaN, 'kj')).toBe(0);
    expect(toEnergy(undefined, 'kcal')).toBe(0);
    expect(toEnergy(null, 'kj')).toBe(0);
    expect(Number.isNaN(toEnergy('x', 'kj'))).toBe(false);
  });
});

describe('energyUnitLabel', () => {
  test('maps the pref value to its label, defaulting to kcal', () => {
    expect(energyUnitLabel('kcal')).toBe('kcal');
    expect(energyUnitLabel('kj')).toBe('kJ');
    expect(energyUnitLabel()).toBe('kcal');
    expect(energyUnitLabel('garbage')).toBe('kcal');
  });
});

describe('formatEnergy — grouped display in the chosen unit', () => {
  test('number only by default, with en-GB grouping', () => {
    expect(formatEnergy(7029, 'kcal')).toBe('7,029');
    expect(formatEnergy(1680, 'kj')).toBe('7,029'); // 1680 * 4.184 = 7029.12 -> 7,029
  });
  test('appends the unit label when asked', () => {
    expect(formatEnergy(1680, 'kcal', { withUnit: true })).toBe('1,680 kcal');
    expect(formatEnergy(1680, 'kj', { withUnit: true })).toBe('7,029 kJ');
  });
  test('non-finite falls back without NaN', () => {
    expect(formatEnergy(NaN, 'kj', { withUnit: true })).toBe('0 kJ');
  });
});
