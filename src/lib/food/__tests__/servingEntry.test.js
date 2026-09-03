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
  test('add-again with a remembered portion opens at those grams (so long-press matches the one-tap re-log)', () => {
    expect(initialServingState(slice, 'add', 150)).toEqual({ unitKey: 'g', amount: '150' });
    // rounds a fractional REAL, like edit
    expect(initialServingState(slice, 'add', 150.5)).toEqual({ unitKey: 'g', amount: '151' });
  });
  test('edit preserves the exact logged grams (in grams)', () => {
    expect(initialServingState(slice, 'edit', 150)).toEqual({ unitKey: 'g', amount: '150' });
  });
  test('edit with no/zero quantity falls through to the add default', () => {
    expect(initialServingState(slice, 'edit', 0)).toEqual({ unitKey: 'serving', amount: '1' });
  });

  // D138: a remembered gram figure that is (near enough) a half-serving
  // multiple reopens in the serving unit, so a user who thinks in slices
  // sees "2 slices" again, not "62 g".
  describe('D138: a near-multiple of half a serving reopens in the serving unit', () => {
    const oneSlice = { serving_g: 31, serving_label: 'slice' };

    test('an exact whole-serving multiple snaps to the serving unit (62g on a 31g slice -> 2)', () => {
      expect(initialServingState(oneSlice, 'add', 62)).toEqual({ unitKey: 'serving', amount: '2' });
    });

    test('an exact half-serving multiple also snaps (46.5g on a 31g slice -> 1.5)', () => {
      expect(initialServingState(oneSlice, 'add', 46.5)).toEqual({ unitKey: 'serving', amount: '1.5' });
    });

    test('within 2% of a multiple still snaps (63g is 1.6% over 2 x 31g)', () => {
      expect(initialServingState(oneSlice, 'add', 63)).toEqual({ unitKey: 'serving', amount: '2' });
    });

    test('a non-multiple gram figure stays in grams (150g on a 36g slice, ~4% off 4 x 36g)', () => {
      expect(initialServingState(slice, 'add', 150)).toEqual({ unitKey: 'g', amount: '150' });
    });

    test('just outside the 2% tolerance stays in grams (65g is ~4.8% over 2 x 31g)', () => {
      expect(initialServingState(oneSlice, 'add', 65)).toEqual({ unitKey: 'g', amount: '65' });
    });

    test('no serving_g on the food stays in grams regardless of the figure', () => {
      expect(initialServingState(noServing, 'add', 62)).toEqual({ unitKey: 'g', amount: '62' });
    });

    test('edit mode gets the same snap (this is a display choice, not an add/edit distinction)', () => {
      expect(initialServingState(oneSlice, 'edit', 62)).toEqual({ unitKey: 'serving', amount: '2' });
    });
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
