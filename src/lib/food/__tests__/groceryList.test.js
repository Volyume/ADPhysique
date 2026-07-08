/**
 * ULTIMATE-NUT-02 — auto grocery list (pure aggregation).
 * Pins: week-wide gram summing per food key, role-derived sections in fixed
 * order, deterministic within-section sort, stored grams shown as-is with no
 * added/duplicated weight-state label (NA-nutrition-5), saved-meal/unknown →
 * Other (NA-nutrition-4 forbids an invented aisle map), and graceful
 * empty/malformed handling.
 */
import { buildGroceryList, formatGroceryListForShare } from '../groceryList';
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
    const gl = buildGroceryList(plan);
    const proteins = gl.sections.find(s => s.label === 'Proteins');
    expect(proteins.items).toHaveLength(1);
    expect(proteins.items[0]).toMatchObject({ grams: 350 });
    expect(proteins.items[0].name).toBe(CURATED_FOODS.chicken_breast.name);
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

  test('shows stored grams as-is with no added/duplicated weight label (NA-nutrition-5)', () => {
    const plan = { days: [day([slot('Meal', [
      { food: 'white_rice', g: 300 },     // stored as cooked weight
      { food: 'chicken_breast', g: 200 },
    ])])] };
    const gl = buildGroceryList(plan);
    const rice = gl.sections.find(s => s.label === 'Carbs').items[0];
    // No invented conversion, no extra flag: the curated name already carries the
    // weight state ("(cooked)"), so it must appear exactly once, never doubled.
    expect(rice).toEqual({ name: CURATED_FOODS.white_rice.name, grams: 300 });
    expect(rice.cooked).toBeUndefined();
    expect((rice.name.match(/cooked/gi) || []).length).toBe(1);
  });

  test('within a section, sorts by grams desc then name', () => {
    const plan = { days: [day([slot('Meal', [
      { food: 'chicken_breast', g: 100 },
      { food: 'cod', g: 300 },
    ])])] };
    const proteins = buildGroceryList(plan).sections.find(s => s.label === 'Proteins');
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
    const proteins = buildGroceryList(plan).sections.find(s => s.label === 'Proteins');
    expect(proteins.items[0].grams).toBe(175);
  });

  test('repeated days each count (variety:0 meal-prep weeks)', () => {
    const d = day([slot('Meal', [{ food: 'chicken_breast', g: 100 }])]);
    const plan = { days: [d, d, d] }; // same realised day reused 3x
    const proteins = buildGroceryList(plan).sections.find(s => s.label === 'Proteins');
    expect(proteins.items[0].grams).toBe(300);
  });

  test('null / empty / malformed plan → empty, never throws', () => {
    expect(buildGroceryList(null)).toEqual({ sections: [], dayCount: 0, isEmpty: true });
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
    const text = formatGroceryListForShare(buildGroceryList(plan));
    expect(text).toBe(
      'Shopping list, 1 day\n'
      + '\n'
      + 'Proteins\n'
      + `- ${CURATED_FOODS.chicken_breast.name}, 200 g\n`
      + '\n'
      + 'Carbs\n'
      + `- ${CURATED_FOODS.white_rice.name}, 300 g`,
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
