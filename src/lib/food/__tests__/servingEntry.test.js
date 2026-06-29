/**
 * Serving-entry conversion (food-logging ease). Locks the invariant that the
 * household-serving UI always resolves to correct stored GRAMS — the change
 * most able to silently corrupt a logged amount — and that the 1–5000 g safety
 * bound can never be bypassed by entering a count of a large serving.
 */
import {
  buildServingUnits, initialServingState, resolveGrams, isValidEntryGrams, MAX_ENTRY_GRAMS,
} from '../servingEntry';

const slice = { serving_g: 36, serving_label: 'slice' };
const noServing = { kcal_100g: 250 };

describe('buildServingUnits', () => {
  test('a food with a named serving offers [serving, g], serving first', () => {
    const units = buildServingUnits(slice);
    expect(units).toEqual([
      { key: 'serving', label: 'slice', grams: 36 },
      { key: 'g', label: 'g', grams: 1 },
    ]);
  });
  test('serving with no label falls back to the word "serving"', () => {
    expect(buildServingUnits({ serving_g: 40 })[0]).toEqual({ key: 'serving', label: 'serving', grams: 40 });
  });
  test('a food with no serving_g offers grams only', () => {
    expect(buildServingUnits(noServing)).toEqual([{ key: 'g', label: 'g', grams: 1 }]);
  });
});

describe('initialServingState', () => {
  test('add defaults to ONE named serving (zero keystrokes)', () => {
    expect(initialServingState(slice, 'add')).toEqual({ unitKey: 'serving', amount: '1' });
  });
  test('add with no serving defaults to 100 g', () => {
    expect(initialServingState(noServing, 'add')).toEqual({ unitKey: 'g', amount: '100' });
  });
  test('edit preserves the exact logged grams (in grams)', () => {
    expect(initialServingState(slice, 'edit', 150)).toEqual({ unitKey: 'g', amount: '150' });
  });
  test('edit with no/zero quantity falls through to the add default', () => {
    expect(initialServingState(slice, 'edit', 0)).toEqual({ unitKey: 'serving', amount: '1' });
  });
});

describe('resolveGrams — count × unit grams, never NaN', () => {
  const servingUnit = { key: 'serving', label: 'slice', grams: 36 };
  const gUnit = { key: 'g', label: 'g', grams: 1 };
  test('2 slices = 72 g', () => { expect(resolveGrams('2', servingUnit)).toBe(72); });
  test('1 slice = 36 g (the zero-keystroke common case)', () => { expect(resolveGrams('1', servingUnit)).toBe(36); });
  test('150 in grams = 150 g', () => { expect(resolveGrams('150', gUnit)).toBe(150); });
  test('blank / dot / NaN amount resolves to 0, never NaN', () => {
    expect(resolveGrams('', servingUnit)).toBe(0);
    expect(resolveGrams('.', servingUnit)).toBe(0);
    expect(resolveGrams('abc', servingUnit)).toBe(0);
    expect(Number.isNaN(resolveGrams('', servingUnit))).toBe(false);
  });
  test('a missing/garbage unit resolves to 0, never NaN', () => {
    expect(resolveGrams('2', undefined)).toBe(0);
    expect(resolveGrams('2', {})).toBe(0);
  });
});

describe('isValidEntryGrams — the 1–5000 g safety bound binds on resolved grams', () => {
  test('rejects 0 / negative / blank-derived', () => {
    expect(isValidEntryGrams(0)).toBe(false);
    expect(isValidEntryGrams(-5)).toBe(false);
  });
  test('accepts the boundary, rejects above it', () => {
    expect(isValidEntryGrams(MAX_ENTRY_GRAMS)).toBe(true);
    expect(isValidEntryGrams(MAX_ENTRY_GRAMS + 1)).toBe(false);
  });
  test('a big count of a large serving is rejected (bound not bypassed)', () => {
    // 200 servings × 36 g = 7200 g -> over the 5000 g cap.
    expect(isValidEntryGrams(resolveGrams('200', { grams: 36 }))).toBe(false);
    // 2 × 2500 g = 5000 g -> allowed at the boundary.
    expect(isValidEntryGrams(resolveGrams('2', { grams: 2500 }))).toBe(true);
  });
});
