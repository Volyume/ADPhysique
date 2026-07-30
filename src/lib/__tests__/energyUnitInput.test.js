/**
 * energyUnitInput.test.js
 *
 * Pins finding X1 of the cross-surface consistency audit
 * (docs/audit/cross-surface-consistency-audit-2026-07-30.md).
 *
 * THE BUG. QuickAddSheet read NO energy-unit preference and labelled its field
 * a bare "Calories". kJ is a real, user-selectable preference
 * (SettingsDisplayScreen), so a kJ user typing 2090 for a ~500 kcal snack had
 * `kcal: 2090` stored verbatim -- a ~4.18x inflation written straight into
 * `daily_intake_rollups`, which is the SINGLE source every kcal surface reads,
 * and from there into adherence and the intake figures ED-safety code consumes.
 *
 * Corruption at the point of entry, invisible afterwards: nothing downstream
 * can tell an inflated figure from a genuine one, exactly like the
 * decimal-comma bug (parseDecimalInput.test.js).
 *
 * `fromEnergy` is the single inverse of `toEnergy`. Every input that accepts an
 * energy figure must convert through it, so there is one place to be right and
 * one place to audit. These tests fail if that round trip ever breaks, and a
 * source guard fails if the sheet goes back to ignoring the preference.
 */

import fs from 'fs';
import path from 'path';
import { toEnergy, fromEnergy, energyUnitLabel, KJ_PER_KCAL } from '../format';

describe('fromEnergy is the exact inverse of toEnergy (X1)', () => {
  test('the reported case: 2090 kJ is ~500 kcal, NOT 2090 kcal', () => {
    const stored = fromEnergy(2090, 'kj');
    expect(Math.round(stored)).toBe(500);
    // What the bug did, pinned so the regression is unmistakable.
    expect(2090).not.toBe(Math.round(stored));
  });

  test('kcal input passes through untouched', () => {
    expect(fromEnergy(500, 'kcal')).toBe(500);
    expect(fromEnergy(2090, 'kcal')).toBe(2090);
  });

  test('round trips for a spread of realistic intakes', () => {
    for (const kcal of [1, 250, 500, 1200, 1500, 2500, 5000]) {
      const shown = toEnergy(kcal, 'kj');
      expect(Math.round(fromEnergy(shown, 'kj'))).toBe(kcal);
    }
  });

  test('uses the EU thermochemical factor, not an invented one', () => {
    expect(KJ_PER_KCAL).toBe(4.184);
    expect(fromEnergy(4184, 'kj')).toBeCloseTo(1000, 6);
  });

  test('junk in gives NaN so callers must validate, never a silent zero', () => {
    // A silent 0 would log a real meal as nothing at all.
    for (const bad of ['', null, undefined, 'abc', NaN]) {
      expect(Number.isNaN(fromEnergy(bad, 'kj'))).toBe(true);
      expect(Number.isNaN(fromEnergy(bad, 'kcal'))).toBe(true);
    }
  });

  test('an unknown unit is treated as kcal, never silently scaled', () => {
    expect(fromEnergy(500, 'joules')).toBe(500);
    expect(fromEnergy(500, undefined)).toBe(500);
  });

  test('the label matches the unit the value is in', () => {
    expect(energyUnitLabel('kj')).toBe('kJ');
    expect(energyUnitLabel('kcal')).toBe('kcal');
  });
});

describe('QuickAddSheet honours the preference (source guard)', () => {
  const SRC = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'components', 'food', 'QuickAddSheet.js'),
    'utf8',
  );

  test('it reads the energy-unit preference at all', () => {
    expect(SRC).toMatch(/accessibility\?\.energyUnit/);
  });

  test('it converts on save through the shared inverse, not a hand-rolled divide', () => {
    expect(SRC).toMatch(/fromEnergy\(/);
    // A local division by the factor would bypass the one audited conversion.
    expect(SRC).not.toMatch(/\/\s*4\.184/);
  });

  test('the field names its unit instead of assuming calories', () => {
    // The bare label that made the bug invisible to the user.
    expect(SRC).not.toMatch(/>\s*Calories\s*</);
    expect(SRC).toMatch(/unitLabel/);
  });

  test('what is STORED is still kcal, whatever the user typed', () => {
    expect(SRC).toMatch(/kcal: Math\.round\(k\)/);
  });
});
