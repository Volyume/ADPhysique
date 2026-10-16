/**
 * foodLine.js, the typed food line (D230 R13, lane 3C).
 *
 * Pins, and why each is written to fail:
 *  - parseFoodLine splits a typed sentence into parts at commas, semicolons,
 *    " and " and " with " and reads each part's count, unit word and name.
 *    A bare count ("2 eggs") is a count of the food, never a unit; a number
 *    inside a name ("Weetabix 2") is not a count; a decimal comma ("1,5") is
 *    a number, not a split.
 *  - isFoodLine is true only for two or more parts, so one food ("banana")
 *    never triggers the offer.
 *  - portionFor turns a part and a food into grams inside the 1 to 5000 g
 *    bound and says honestly where the figure came from (typed grams, the
 *    food's own serving, or the 100 g fallback).
 *  - matchFoodLineParts takes the FIRST result from the caller's search as
 *    the match, never a saved meal, and a search that fails is no match.
 *  - The module is deterministic: the same line gives the same answer.
 */
import {
  parseFoodLine, isFoodLine, portionFor, describePortion, matchFoodLineParts,
} from '../foodLine';

const strip = (parts) => parts.map(({ count, unitWord, name }) => ({ count, unitWord, name }));

describe('parseFoodLine', () => {
  test('"2 eggs, toast and a tea"', () => {
    expect(strip(parseFoodLine('2 eggs, toast and a tea'))).toEqual([
      { count: 2, unitWord: null, name: 'eggs' },
      { count: 1, unitWord: null, name: 'toast' },
      { count: 1, unitWord: null, name: 'tea' },
    ]);
  });

  test('"half a bagel with 20g peanut butter"', () => {
    expect(strip(parseFoodLine('half a bagel with 20g peanut butter'))).toEqual([
      { count: 0.5, unitWord: null, name: 'bagel' },
      { count: 20, unitWord: 'g', name: 'peanut butter' },
    ]);
  });

  test('"200g chicken, 150 g rice, broccoli"', () => {
    expect(strip(parseFoodLine('200g chicken, 150 g rice, broccoli'))).toEqual([
      { count: 200, unitWord: 'g', name: 'chicken' },
      { count: 150, unitWord: 'g', name: 'rice' },
      { count: 1, unitWord: null, name: 'broccoli' },
    ]);
  });

  test('one food is one part', () => {
    expect(strip(parseFoodLine('banana'))).toEqual([{ count: 1, unitWord: null, name: 'banana' }]);
  });

  test('a decimal comma is a number', () => {
    expect(strip(parseFoodLine('1,5 scoops whey'))).toEqual([
      { count: 1.5, unitWord: 'scoops', name: 'whey' },
    ]);
    expect(parseFoodLine('1,5 scoops whey, toast')).toHaveLength(2);
  });

  test('"a couple of biscuits" is 2; fractions read', () => {
    expect(strip(parseFoodLine('a couple of biscuits'))).toEqual([{ count: 2, unitWord: null, name: 'biscuits' }]);
    expect(parseFoodLine('½ avocado')[0]).toMatchObject({ count: 0.5, name: 'avocado' });
    expect(parseFoodLine('1½ cups tea')[0]).toMatchObject({ count: 1.5, unitWord: 'cups', name: 'tea' });
    expect(parseFoodLine('1.5 slices bread')[0]).toMatchObject({ count: 1.5, unitWord: 'slices', name: 'bread' });
  });

  test('count words', () => {
    expect(parseFoodLine('three eggs')[0]).toMatchObject({ count: 3, name: 'eggs' });
    expect(parseFoodLine('one apple')[0]).toMatchObject({ count: 1, name: 'apple' });
    expect(parseFoodLine('an orange')[0]).toMatchObject({ count: 1, name: 'orange' });
    expect(parseFoodLine('six wings')[0]).toMatchObject({ count: 6, name: 'wings' });
  });

  test('a unit word is followed by "of" and the food', () => {
    expect(parseFoodLine('a bowl of cereal')[0]).toMatchObject({ count: 1, unitWord: 'bowl', name: 'cereal' });
    expect(parseFoodLine('half a cup of milk')[0]).toMatchObject({ count: 0.5, unitWord: 'cup', name: 'milk' });
    expect(parseFoodLine('2 tbsp olive oil')[0]).toMatchObject({ count: 2, unitWord: 'tbsp', name: 'olive oil' });
  });

  test('semicolons and case', () => {
    expect(parseFoodLine('Toast; EGGS AND Tea').map((p) => p.name)).toEqual(['toast', 'eggs', 'tea']);
  });

  test('empty, whitespace, and punctuation only give no parts', () => {
    expect(parseFoodLine('')).toEqual([]);
    expect(parseFoodLine('   ')).toEqual([]);
    expect(parseFoodLine(null)).toEqual([]);
    expect(parseFoodLine(', , ;')).toEqual([]);
    expect(parseFoodLine('2')).toEqual([]);
  });

  test('a trailing or leading connector and double spaces are tidied', () => {
    expect(parseFoodLine('toast and').map((p) => p.name)).toEqual(['toast']);
    expect(parseFoodLine('and toast, tea').map((p) => p.name)).toEqual(['toast', 'tea']);
    expect(parseFoodLine('peanut   butter ,  2   eggs').map((p) => [p.count, p.name])).toEqual([[1, 'peanut butter'], [2, 'eggs']]);
  });

  test('a number inside a name is not a count', () => {
    expect(strip(parseFoodLine('Weetabix 2'))).toEqual([{ count: 1, unitWord: null, name: 'weetabix 2' }]);
    expect(parseFoodLine('7up')[0]).toMatchObject({ count: 1, name: '7up' });
  });

  test('a trailing "s" is kept and raw is the trimmed part', () => {
    const [p] = parseFoodLine('  2 Eggs ');
    expect(p.raw).toBe('2 Eggs');
    expect(p.name).toBe('eggs');
  });

  test('deterministic', () => {
    const a = parseFoodLine('2 eggs, toast and a tea');
    const b = parseFoodLine('2 eggs, toast and a tea');
    expect(a).toEqual(b);
  });
});

describe('isFoodLine', () => {
  test('true for two or more parts only', () => {
    expect(isFoodLine('2 eggs, toast')).toBe(true);
    expect(isFoodLine('toast and tea')).toBe(true);
    expect(isFoodLine('banana')).toBe(false);
    expect(isFoodLine('')).toBe(false);
    expect(isFoodLine('toast and')).toBe(false);
  });
});

describe('portionFor', () => {
  const egg = { food_ref: 'off:egg', serving_g: 50, serving_label: 'egg' };
  const bread = { food_ref: 'off:bread', serving_g: 36, serving_label: '1 slice' };

  test('grams are the typed number', () => {
    expect(portionFor({ count: 20, unitWord: 'g' }, egg)).toMatchObject({ grams: 20, basis: 'typed_g' });
    expect(portionFor({ count: 150, unitWord: 'grams' }, bread)).toMatchObject({ grams: 150, basis: 'typed_g' });
    expect(portionFor({ count: 1, unitWord: 'gram' }, bread)).toMatchObject({ grams: 1, basis: 'typed_g' });
  });

  test('ml counts as grams', () => {
    expect(portionFor({ count: 250, unitWord: 'ml' }, { food_ref: 'x' })).toMatchObject({ grams: 250, basis: 'typed_g' });
  });

  test('a household word the serving label names uses the serving weight', () => {
    expect(portionFor({ count: 2, unitWord: 'slices' }, bread)).toEqual({ grams: 72, basis: 'serving', unitMatched: true });
  });

  test('a household word the label does not name still uses the serving weight', () => {
    expect(portionFor({ count: 2, unitWord: 'scoops' }, bread)).toEqual({ grams: 72, basis: 'serving', unitMatched: false });
  });

  test('a household word with no serving weight is 100 g per unit', () => {
    expect(portionFor({ count: 2, unitWord: 'cups' }, { food_ref: 'x' })).toMatchObject({ grams: 200, basis: 'default' });
  });

  test('a bare count multiplies the serving, or 100 g', () => {
    expect(portionFor({ count: 2, unitWord: null }, egg)).toMatchObject({ grams: 100, basis: 'serving' });
    expect(portionFor({ count: 0.5, unitWord: null }, { serving_g: 90 })).toMatchObject({ grams: 45, basis: 'serving' });
    expect(portionFor({ count: 3, unitWord: null }, { food_ref: 'x' })).toMatchObject({ grams: 300, basis: 'default' });
    expect(portionFor({ count: 1, unitWord: null }, { food_ref: 'x', serving_g: 0 })).toMatchObject({ grams: 100, basis: 'default' });
  });

  test('clamped to 1 to 5000 g', () => {
    expect(portionFor({ count: 9000, unitWord: 'g' }, egg).grams).toBe(5000);
    expect(portionFor({ count: 100, unitWord: null }, { serving_g: 500 }).grams).toBe(5000);
    expect(portionFor({ count: 0.001, unitWord: 'g' }, egg).grams).toBe(1);
    expect(portionFor({ count: NaN, unitWord: null }, egg).grams).toBe(50);
  });
});

describe('describePortion', () => {
  const egg = { serving_g: 50, serving_label: 'egg' };
  test('says the grams in plain words', () => {
    const part = { raw: '2 eggs', count: 2, unitWord: null };
    expect(describePortion(part, egg)).toBe('2 eggs · 1 egg (50 g) each = 100 g');
  });
  test('says when no portion is known', () => {
    expect(describePortion({ raw: 'tea', count: 1, unitWord: null }, {})).toBe('tea · 100 g (no portion known)');
    expect(describePortion({ raw: '2 apples', count: 2, unitWord: null }, {})).toBe('2 apples · 100 g each (no portion known) = 200 g');
  });
  test('typed grams', () => {
    expect(describePortion({ raw: '20g peanut butter', count: 20, unitWord: 'g' }, {})).toBe('20g peanut butter · 20 g');
  });
});

describe('matchFoodLineParts', () => {
  const parts = [{ name: 'eggs' }, { name: 'toast' }, { name: 'zzz' }];

  test('the first result is the match; no result is no match; a throw is no match', async () => {
    const search = jest.fn(async (name) => {
      if (name === 'eggs') return [{ food_ref: 'off:egg', name: 'Egg' }, { food_ref: 'off:egg2', name: 'Egg 2' }];
      if (name === 'toast') throw new Error('offline');
      return [];
    });
    const out = await matchFoodLineParts(parts, search);
    expect(out.map((m) => m.food?.food_ref ?? null)).toEqual(['off:egg', null, null]);
    expect(search).toHaveBeenCalledTimes(3);
  });

  test('a saved meal is never the match for one typed food', async () => {
    const out = await matchFoodLineParts([{ name: 'chicken' }], async () => [
      { food_ref: 'meal:1', name: 'Chicken meal' }, { food_ref: 'off:chicken', name: 'Chicken' },
    ]);
    expect(out[0].food.food_ref).toBe('off:chicken');
  });
});

// Food audit 2026-10-16, item 7: the person's own amount comes first.
describe('portionFor: the person\'s own amount', () => {
  const { withCuratedServing } = require('../curatedFoods');
  test('a remembered amount stands for one of the food, ahead of the serving', () => {
    const banana = { food_ref: 'off:banana', serving_g: 100 };
    expect(portionFor({ count: 1, unitWord: null }, banana, { personalG: 118 }))
      .toMatchObject({ grams: 118, basis: 'personal' });
    expect(portionFor({ count: 2, unitWord: null }, banana, { personalG: 118 }).grams).toBe(236);
  });
  test('a remembered amount that is a whole number of servings was several', () => {
    const egg = { food_ref: 'curated:eggs', serving_g: 60 };
    expect(portionFor({ count: 2, unitWord: null }, egg, { personalG: 120 }))
      .toMatchObject({ grams: 120, basis: 'personal' });
  });
  test('typed grams and household units ignore it; none given falls back as before', () => {
    const f = { food_ref: 'x', serving_g: 36 };
    expect(portionFor({ count: 20, unitWord: 'g' }, f, { personalG: 118 })).toMatchObject({ grams: 20, basis: 'typed_g' });
    expect(portionFor({ count: 2, unitWord: 'slices' }, f, { personalG: 118 })).toMatchObject({ grams: 72, basis: 'serving' });
    expect(portionFor({ count: 2, unitWord: null }, f)).toMatchObject({ grams: 72, basis: 'serving' });
  });
  test('says where the figure came from', () => {
    expect(describePortion({ raw: '2 bananas', count: 2, unitWord: null }, {}, { grams: 236, basis: 'personal' }))
      .toBe('2 bananas · 118 g each (your usual amount) = 236 g');
  });
  test('the curated egg has a per-egg serving, so "2 eggs" is not 200 g', () => {
    const egg = withCuratedServing({ food_ref: 'curated:eggs', serving_g: null });
    expect(egg.serving_g).toBe(60);
    expect(portionFor({ count: 2, unitWord: null }, egg)).toMatchObject({ grams: 120, basis: 'serving' });
    expect(withCuratedServing({ food_ref: 'curated:oats' })).toEqual({ food_ref: 'curated:oats' });
  });
});
