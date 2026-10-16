/**
 * D230 R20 (lane 4B): the custom-portions validator.
 *
 * parsePortions reads custom_foods.portions_json (a JSON string locally, a
 * parsed array from the cloud) and must NEVER throw: a bad blob, a wrong shape
 * or an out-of-bound gram figure drops that item, never the screen. The bounds
 * are the shared ones: a label of 1 to 24 characters, grams from 1 to 5000,
 * at most three portions. serialisePortions writes only the validated extras
 * (at most two; the first portion lives in serving_g / serving_label) and
 * NULL when there are none.
 */
import { parsePortions, serialisePortions } from '../portions';

describe('parsePortions', () => {
  test('reads a good JSON string, trimming the label', () => {
    expect(parsePortions('[{"label":" 1 slice ","grams":36},{"label":"1 mug","grams":250}]'))
      .toEqual([{ label: '1 slice', grams: 36 }, { label: '1 mug', grams: 250 }]);
  });

  test('reads an already parsed array (the cloud sends jsonb)', () => {
    expect(parsePortions([{ label: '1 tbsp', grams: 15 }])).toEqual([{ label: '1 tbsp', grams: 15 }]);
  });

  test.each([null, undefined, '', '   ', 'not json', '{"label":"x","grams":1}', '42', 7, {}, true])(
    'bad or empty input %p gives an empty list and never throws',
    (raw) => {
      expect(() => parsePortions(raw)).not.toThrow();
      expect(parsePortions(raw)).toEqual([]);
    },
  );

  test('drops wrong shapes item by item and keeps the good ones', () => {
    const raw = [
      null, 'x', 5, [], { grams: 10 }, { label: 'a' }, { label: 5, grams: 10 },
      { label: 'ok', grams: '10' }, { label: '   ', grams: 10 }, { label: 'good', grams: 10 },
    ];
    expect(parsePortions(raw)).toEqual([{ label: 'good', grams: 10 }]);
  });

  test('drops an over-long label and keeps one of exactly 24 characters', () => {
    expect(parsePortions([{ label: 'x'.repeat(25), grams: 10 }])).toEqual([]);
    expect(parsePortions([{ label: 'x'.repeat(24), grams: 10 }])).toHaveLength(1);
  });

  test.each([0, 0.5, -3, 5001, 1e9, NaN, Infinity, -Infinity])('drops grams %p outside 1 to 5000', (grams) => {
    expect(parsePortions([{ label: 'bad', grams }])).toEqual([]);
  });

  test('keeps the 1 g and 5000 g edges', () => {
    expect(parsePortions([{ label: 'a', grams: 1 }, { label: 'b', grams: 5000 }])).toHaveLength(2);
  });

  test('returns at most three portions', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ label: `p${i}`, grams: 10 + i }));
    expect(parsePortions(many)).toHaveLength(3);
  });
});

describe('serialisePortions', () => {
  test('writes the validated extras as JSON, at most two', () => {
    const text = serialisePortions([
      { label: '1 slice', grams: 36 }, { label: '1 mug', grams: 250 }, { label: 'third', grams: 9 },
    ]);
    expect(JSON.parse(text)).toEqual([{ label: '1 slice', grams: 36 }, { label: '1 mug', grams: 250 }]);
  });

  test('writes NULL for none, for junk and for only-bad items', () => {
    expect(serialisePortions([])).toBeNull();
    expect(serialisePortions(undefined)).toBeNull();
    expect(serialisePortions('nope')).toBeNull();
    expect(serialisePortions([{ label: 'x', grams: 9999 }])).toBeNull();
  });
});
