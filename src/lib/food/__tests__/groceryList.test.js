/**
 * ULTIMATE-NUT-02 — auto grocery list (pure aggregation).
 * Pins: week-wide gram summing per food key, role-derived sections in fixed
 * order, deterministic within-section sort, saved-meal/unknown → Other
 * (NA-nutrition-4 forbids an invented aisle map), and graceful
 * empty/malformed handling.
 *
 * Founder ruling 2026-10-19 supersedes NA-nutrition-5 for paired foods: a
 * food with a CoFID raw/cooked pair is listed at its raw or dry shop weight
 * (or its cooked weight for meal prep) with the other beside it, a one-day
 * plan can be bought for 1, 3, 5 or 7 days, and grams are kitchen-rounded.
 * A food with no pair keeps its stored grams and name exactly as before.
 * The aggregation tests read the 'prep' basis, where a cooked-stored food's
 * figure is its stored grams.
 */
import { buildGroceryList, formatGroceryListForShare, groceryQuantityText } from '../groceryList';
import { convertCookGrams } from '../cookYield';
import { kitchenRound } from '../gramSolve';

const PREP = { basis: 'prep' };
import { CURATED_FOODS } from '../curatedFoods';

// Build a slot from curated components ({ food, g }).
const slot = (name, components) => ({ name, components, items: null, totals: { kcal: 0 } });
const day = (slots) => ({ slots });

// A real curated protein, carb (cooked), fat, veg for section coverage.
const namesAreCurated = ['chicken_breast', 'white_rice', 'olive_oil', 'broccoli']
  .every(k => CURATED_FOODS[k]);

describe('buildGroceryList', () => {
  test('sums the same food across days+slots into one row', () => {
    const plan = { days: [
      day([slot('Lunch', [{ food: 'chicken_breast', g: 200 }])]),
      day([slot('Dinner', [{ food: 'chicken_breast', g: 150 }])]),
    ] };
    const gl = buildGroceryList(plan, PREP);
    const proteins = gl.sections.find(s => s.label === 'Proteins');
    expect(proteins.items).toHaveLength(1);
    expect(proteins.items[0]).toMatchObject({ grams: 350, state: 'cooked' });
    expect(proteins.items[0].name).toBe('Chicken breast fillet');
    expect(gl.dayCount).toBe(2);
    expect(gl.isEmpty).toBe(false);
  });

  test('groups by macro role into fixed section order (NA-nutrition-4)', () => {
    if (!namesAreCurated) return;
    const plan = { days: [day([
      slot('Meal', [
        { food: 'olive_oil', g: 20 },        // fat
        { food: 'white_rice', g: 400 },      // carb (cooked)
        { food: 'chicken_breast', g: 200 },  // protein
        { food: 'broccoli', g: 150 },        // veg
      ]),
    ])] };
    const labels = buildGroceryList(plan).sections.map(s => s.label);
    expect(labels).toEqual(['Proteins', 'Carbs', 'Veg', 'Fats']);
  });

  test('shop weight by default: raw or dry first, cooked beside it, from CoFID ratios', () => {
    const plan = { days: [day([slot('Meal', [
      { food: 'white_rice', g: 280 },     // stored as cooked weight
      { food: 'chicken_breast', g: 445 }, // stored as cooked weight
    ])])] };
    const gl = buildGroceryList(plan);
    expect(gl.basis).toBe('shop');
    const rice = gl.sections.find(s => s.label === 'Carbs').items[0];
    const chicken = gl.sections.find(s => s.label === 'Proteins').items[0];
    expect(rice).toEqual({
      name: 'White rice', state: 'dry',
      grams: kitchenRound(convertCookGrams('white_rice', 280, 'cooked', 'raw')),
      alt: { grams: 280, state: 'cooked' },
    });
    expect(chicken.state).toBe('raw');
    expect(chicken.grams).toBe(kitchenRound(convertCookGrams('chicken_breast', 445, 'cooked', 'raw')));
    expect(groceryQuantityText(chicken)).toBe(`${chicken.grams} g raw (445 g cooked)`);
  });

  test('meal prep weight puts cooked first', () => {
    const plan = { days: [day([slot('Meal', [{ food: 'pasta', g: 70 }])])] };
    const pasta = buildGroceryList(plan, PREP).sections.find(s => s.label === 'Carbs').items[0];
    expect(pasta.state).toBe('cooked');
    expect(pasta.alt).toEqual({ grams: 70, state: 'dry' });
  });

  test('a food with no CoFID pair keeps its stored grams and name, with no label', () => {
    const plan = { days: [day([slot('Meal', [{ food: 'oats', g: 60 }, { food: 'broccoli', g: 120 }])])] };
    const gl = buildGroceryList(plan);
    const oats = gl.sections.find(s => s.label === 'Carbs').items[0];
    expect(oats).toEqual({ name: CURATED_FOODS.oats.name, grams: 60 });
  });

  test('a one-day plan repeats for 3, 5 or 7 days; anything else is 1', () => {
    const plan = { days: [day([slot('Meal', [{ food: 'chicken_breast', g: 150 }, { food: 'oats', g: 50 }])])] };
    const three = buildGroceryList(plan, { basis: 'prep', repeat: 3 });
    expect(three.repeat).toBe(3);
    expect(three.sections.find(s => s.label === 'Proteins').items[0].grams).toBe(450);
    expect(three.sections.find(s => s.label === 'Carbs').items[0].grams).toBe(150);
    expect(buildGroceryList(plan, { repeat: 4 }).repeat).toBe(1);
    expect(formatGroceryListForShare(buildGroceryList(plan, { repeat: 5 })).startsWith('Shopping list, 5 days')).toBe(true);
  });

  test('within a section, sorts by grams desc then name', () => {
    const plan = { days: [day([slot('Meal', [
      { food: 'chicken_breast', g: 100 },
      { food: 'cod', g: 300 },
    ])])] };
    const proteins = buildGroceryList(plan, PREP).sections.find(s => s.label === 'Proteins');
    expect(proteins.items[0].grams).toBe(300);
    expect(proteins.items[1].grams).toBe(100);
  });

  test('saved-meal slots (no breakdown) aggregate by name under Other, with a count', () => {
    const saved = { name: 'Mum\'s chilli', items: null, components: null, totals: { kcal: 0 } };
    const plan = { days: [day([saved]), day([saved])] };
    const gl = buildGroceryList(plan);
    const other = gl.sections.find(s => s.label === 'Other');
    expect(other.items).toEqual([{ name: 'Mum\'s chilli', count: 2 }]);
  });

  test('unknown food key falls to Other by its stored name, never dropped', () => {
    const plan = { days: [day([{
      name: 'Custom plate', components: null,
      items: [{ foodRef: 'custom:99', name: 'Protein shake', quantityG: 30 }],
      totals: { kcal: 0 },
    }])] };
    const other = buildGroceryList(plan).sections.find(s => s.label === 'Other');
    expect(other.items.find(i => i.name === 'Protein shake')).toBeTruthy();
  });

  test('items[] are read when components are absent (foodRef parsed)', () => {
    const plan = { days: [day([{
      name: 'Lunch', components: null,
      items: [{ foodRef: 'curated:chicken_breast', name: 'x', quantityG: 175 }],
      totals: { kcal: 0 },
    }])] };
    const proteins = buildGroceryList(plan, PREP).sections.find(s => s.label === 'Proteins');
    expect(proteins.items[0].grams).toBe(175);
  });

  test('repeated days each count (variety:0 meal-prep weeks)', () => {
    const d = day([slot('Meal', [{ food: 'chicken_breast', g: 100 }])]);
    const plan = { days: [d, d, d] }; // same realised day reused 3x
    const proteins = buildGroceryList(plan, PREP).sections.find(s => s.label === 'Proteins');
    expect(proteins.items[0].grams).toBe(300);
  });

  test('null / empty / malformed plan → empty, never throws', () => {
    expect(buildGroceryList(null)).toEqual({ sections: [], dayCount: 0, repeat: 1, basis: 'shop', isEmpty: true });
    expect(buildGroceryList({})).toMatchObject({ isEmpty: true });
    expect(buildGroceryList({ days: [] })).toMatchObject({ isEmpty: true });
    expect(buildGroceryList({ days: [day([]), { slots: null }] }).isEmpty).toBe(true);
  });
});

describe('formatGroceryListForShare (§15 item 6 — grocery-list export polish)', () => {
  test('lays out a heading, section labels and "name, grams" lines, same grouping as the sheet', () => {
    const plan = { days: [day([
      slot('Meal', [
        { food: 'chicken_breast', g: 200 },
        { food: 'white_rice', g: 300 },
      ]),
    ])] };
    const list = buildGroceryList(plan);
    const chicken = list.sections[0].items[0];
    const rice = list.sections[1].items[0];
    const text = formatGroceryListForShare(list);
    expect(text).toBe(
      'Shopping list, 1 day\n'
      + '\n'
      + 'Proteins\n'
      + `- Chicken breast fillet, ${chicken.grams} g raw (200 g cooked)\n`
      + '\n'
      + 'Carbs\n'
      + `- White rice, ${rice.grams} g dry (300 g cooked)`,
    );
  });

  test('a week plan heading pluralises "days"', () => {
    const plan = { days: [
      day([slot('Meal', [{ food: 'chicken_breast', g: 100 }])]),
      day([slot('Meal', [{ food: 'chicken_breast', g: 100 }])]),
    ] };
    const text = formatGroceryListForShare(buildGroceryList(plan));
    expect(text.startsWith('Shopping list, 2 days')).toBe(true);
  });

  test('a gram-less (saved-meal) row with a count shares the same "x2" label as the sheet', () => {
    const saved = { name: 'Mum\'s chilli', items: null, components: null, totals: { kcal: 0 } };
    const plan = { days: [day([saved]), day([saved])] };
    const text = formatGroceryListForShare(buildGroceryList(plan));
    expect(text).toContain('- Mum\'s chilli, x2');
  });

  test('no British-spelling/em-dash violations and no invented data: only the list\'s own names and grams appear', () => {
    const plan = { days: [day([slot('Meal', [{ food: 'chicken_breast', g: 200 }])])] };
    const text = formatGroceryListForShare(buildGroceryList(plan));
    expect(text).not.toMatch(/—/);
    expect(text).not.toContain('aisle');
  });

  test('null / empty / malformed list → empty string, never throws', () => {
    expect(formatGroceryListForShare(null)).toBe('');
    expect(formatGroceryListForShare(undefined)).toBe('');
    expect(formatGroceryListForShare(buildGroceryList(null))).toBe('');
    expect(formatGroceryListForShare({ sections: [], dayCount: 0, isEmpty: true })).toBe('');
  });
});
