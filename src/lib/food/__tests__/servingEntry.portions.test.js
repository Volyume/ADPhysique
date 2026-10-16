/**
 * D230 R20 (lane 4B): custom portions in the serving-entry model.
 *
 * buildServingUnits lists the named serving, then each extra portion from
 * portions_json (key 'portion:<index>'), then grams. initialServingState
 * reopens a remembered amount that is a half-multiple of ANY of the food's
 * portions in that portion (nearest wins, ties to the named serving), so
 * "2 mugs" comes back as "2 mugs"; a gram figure that matches none opens in
 * grams. resolveGrams is unchanged: grams are the stored truth.
 */
import { buildServingUnits, initialServingState, resolveGrams } from '../servingEntry';

const toast = {
  serving_g: 36,
  serving_label: '1 slice',
  portions_json: JSON.stringify([{ label: '1 mug', grams: 250 }, { label: '1 tbsp', grams: 15 }]),
};

describe('buildServingUnits with custom portions', () => {
  test('lists serving, then portions, then grams, in that order', () => {
    expect(buildServingUnits(toast)).toEqual([
      { key: 'serving', label: '1 slice', grams: 36 },
      { key: 'portion:0', label: '1 mug', grams: 250 },
      { key: 'portion:1', label: '1 tbsp', grams: 15 },
      { key: 'g', label: 'g', grams: 1 },
    ]);
  });

  test('a food without portions_json is exactly as before', () => {
    expect(buildServingUnits({ serving_g: 30, serving_label: 'scoop' })).toEqual([
      { key: 'serving', label: 'scoop', grams: 30 },
      { key: 'g', label: 'g', grams: 1 },
    ]);
    expect(buildServingUnits({ serving_g: 0 })).toEqual([{ key: 'g', label: 'g', grams: 1 }]);
  });

  test('bad portions_json adds nothing and never throws', () => {
    expect(buildServingUnits({ serving_g: 30, portions_json: 'garbage' })).toHaveLength(2);
    expect(buildServingUnits({ serving_g: 30, portions_json: '[{"label":"x","grams":99999}]' })).toHaveLength(2);
  });
});

describe('initialServingState with custom portions', () => {
  test('two mugs (500 g) reopens as 2 of the mug portion', () => {
    expect(initialServingState(toast, 'edit', 500)).toEqual({ unitKey: 'portion:0', amount: '2' });
  });

  test('two slices (72 g) still reopens as 2 of the named serving', () => {
    expect(initialServingState(toast, 'edit', 72)).toEqual({ unitKey: 'serving', amount: '2' });
  });

  test('a half mug reopens as 0.5', () => {
    expect(initialServingState(toast, 'edit', 125)).toEqual({ unitKey: 'portion:0', amount: '0.5' });
  });

  test('a gram figure that matches no portion opens in grams', () => {
    const two = { serving_g: 36, serving_label: '1 slice', portions_json: [{ label: '1 mug', grams: 250 }] };
    expect(initialServingState(two, 'edit', 190)).toEqual({ unitKey: 'g', amount: '190' });
  });

  test('a tie goes to the named serving', () => {
    const tie = { serving_g: 100, serving_label: 'a', portions_json: [{ label: 'b', grams: 100 }] };
    expect(initialServingState(tie, 'edit', 200)).toEqual({ unitKey: 'serving', amount: '2' });
  });

  test('the nearest match wins over a looser one inside the tolerance', () => {
    const near = { serving_g: 100, serving_label: 'a', portions_json: [{ label: 'b', grams: 101 }] };
    expect(initialServingState(near, 'edit', 101)).toEqual({ unitKey: 'portion:0', amount: '1' });
  });

  test('no prior portion still defaults to one named serving, and to 100 g without one', () => {
    expect(initialServingState(toast, 'add', null)).toEqual({ unitKey: 'serving', amount: '1' });
    expect(initialServingState({ serving_g: 0 }, 'add', null)).toEqual({ unitKey: 'g', amount: '100' });
  });

  test('grams stay the truth: a portion only changes how the amount is entered', () => {
    const units = buildServingUnits(toast);
    expect(resolveGrams('2', units.find((u) => u.key === 'portion:0'))).toBe(500);
    expect(resolveGrams('2', units.find((u) => u.key === 'g'))).toBe(2);
  });
});
