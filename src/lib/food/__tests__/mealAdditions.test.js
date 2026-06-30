/**
 * mealAdditions.test.js
 *
 * Locks the per-meal free flavour additions (founder 2026-06-30):
 *   - EVERY curated meal has its own authored additions (no meal falls through
 *     to the generic fallback).
 *   - Every addition is well-formed (a name + a "why").
 *   - The HONESTY invariant: no addition names a calorie-bearing ingredient.
 *     These must be genuinely free (herbs, spices, citrus, zero-cal condiments),
 *     never oils, nuts, cheese, honey, etc. This is the guard that stops a future
 *     edit quietly adding a caloric "free" extra.
 *   - The generic fallback only fires for an unknown meal, and is itself clean.
 */
import { CURATED_MEALS } from '../curatedMeals';
import { getMealAdditions, MEAL_ADDITIONS, ADDITIONS_INTRO, ADDITIONS_FOOTNOTE } from '../mealAdditions';

// Calorie-bearing ingredients that must NEVER appear as a "free" addition. These
// belong in a meal's own components, not the seasoning list. "sugar-free" is fine
// (it's the zero-cal kind), so the sugar check excludes it.
const BANNED = [
  'oil', 'butter', 'peanut', 'almond', 'cashew', 'walnut', 'hazelnut', 'pecan',
  'cheese', 'cheddar', 'parmesan', 'mozzarella', 'feta', 'halloumi',
  'avocado', 'honey', 'maple', 'jam', 'nutella', 'tahini', 'pesto', 'hummus',
  'mayo', 'mayonnaise', 'cream', 'coconut', 'granola', 'oats', 'seeds', 'ketchup',
];

function nameHasBanned(name) {
  const n = name.toLowerCase();
  if (BANNED.some((b) => n.includes(b))) return true;
  // "sugar" is banned unless it's the "sugar-free" zero-cal kind.
  if (/\bsugar\b/.test(n) && !n.includes('sugar-free')) return true;
  return false;
}

describe('per-meal free additions', () => {
  test('every curated meal has its own authored additions', () => {
    for (const meal of CURATED_MEALS) {
      expect(Array.isArray(MEAL_ADDITIONS[meal.id])).toBe(true);
      expect(MEAL_ADDITIONS[meal.id].length).toBeGreaterThanOrEqual(3);
    }
  });

  test('no authored key points at a meal that no longer exists', () => {
    const ids = new Set(CURATED_MEALS.map((m) => m.id));
    for (const key of Object.keys(MEAL_ADDITIONS)) {
      expect(ids.has(key)).toBe(true);
    }
  });

  test('every addition is well-formed (name + why)', () => {
    for (const meal of CURATED_MEALS) {
      for (const a of getMealAdditions(meal)) {
        expect(typeof a.name).toBe('string');
        expect(a.name.trim().length).toBeGreaterThan(0);
        expect(typeof a.why).toBe('string');
        expect(a.why.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('HONESTY: no addition names a calorie-bearing ingredient', () => {
    const offenders = [];
    for (const meal of CURATED_MEALS) {
      for (const a of getMealAdditions(meal)) {
        if (nameHasBanned(a.name)) offenders.push(`${meal.id}: ${a.name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('no em dash in any addition copy (British voice rule)', () => {
    const all = [ADDITIONS_INTRO, ADDITIONS_FOOTNOTE];
    for (const meal of CURATED_MEALS) {
      for (const a of getMealAdditions(meal)) { all.push(a.name, a.why); }
    }
    for (const s of all) expect(s).not.toMatch(/—/);
  });

  test('unknown meal falls back to a clean generic set', () => {
    const savoury = getMealAdditions({ id: 'nope', name: 'Mystery curry & rice' });
    expect(savoury.length).toBeGreaterThanOrEqual(3);
    expect(savoury.every((a) => !nameHasBanned(a.name))).toBe(true);

    const sweet = getMealAdditions({ id: 'nope2', name: 'Protein oats & banana' });
    expect(sweet.length).toBeGreaterThanOrEqual(3);
    expect(sweet.every((a) => !nameHasBanned(a.name))).toBe(true);

    // The savoury and sweet fallbacks are different sets.
    expect(savoury[0].name).not.toBe(sweet[0].name);
  });

  test('getMealAdditions on a known meal returns its authored set, not the fallback', () => {
    const meal = CURATED_MEALS.find((m) => m.id === 'curated_om_chicken_rice');
    const got = getMealAdditions(meal);
    expect(got).toBe(MEAL_ADDITIONS.curated_om_chicken_rice);
    // The saffron/turmeric education the whole feature was born from.
    expect(got.some((a) => /saffron|turmeric/i.test(a.name))).toBe(true);
  });

  test('null meal returns a clean fallback rather than throwing', () => {
    expect(() => getMealAdditions(null)).not.toThrow();
    expect(getMealAdditions(null).length).toBeGreaterThanOrEqual(3);
  });
});
