/**
 * curatedMeals.test.js
 *
 * The curated clean-meal library + its diet/slot filters. Locks data
 * integrity (every meal is well-formed and high-protein-ish) and the
 * diet-inheritance + slot filtering the Suggested tab relies on.
 */
import {
  CURATED_MEALS, DIETS, dietAllows, mealTotals, getCuratedCandidates,
} from '../curatedMeals';

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

describe('library data integrity', () => {
  test('every meal is well-formed', () => {
    for (const m of CURATED_MEALS) {
      expect(typeof m.id).toBe('string');
      expect(m.id).toMatch(/^curated_/);
      expect(typeof m.name).toBe('string');
      expect(DIETS).toContain(m.diet);
      expect(Array.isArray(m.slots)).toBe(true);
      expect(m.slots.length).toBeGreaterThan(0);
      m.slots.forEach(s => expect([...SLOTS, 'any']).toContain(s));
      expect(Array.isArray(m.items)).toBe(true);
      expect(m.items.length).toBeGreaterThan(0);
      for (const it of m.items) {
        expect(typeof it.foodRef).toBe('string');
        expect(it.foodRef).toMatch(/^curated:/);
        expect(it.quantityG).toBeGreaterThan(0);
        expect(it.kcal).toBeGreaterThanOrEqual(0);
        expect(it.proteinG).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('ids are unique', () => {
    const ids = CURATED_MEALS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('meals are protein-forward (>= ~15g per meal)', () => {
    for (const m of CURATED_MEALS) {
      expect(mealTotals(m.items).protein).toBeGreaterThanOrEqual(15);
    }
  });

  test('first tranche covers every slot and all three diets', () => {
    const slotsCovered = new Set();
    const dietsCovered = new Set();
    for (const m of CURATED_MEALS) {
      m.slots.forEach(s => slotsCovered.add(s));
      dietsCovered.add(m.diet);
    }
    SLOTS.forEach(s => expect(slotsCovered.has(s)).toBe(true));
    expect([...dietsCovered].sort()).toEqual(['omnivore', 'vegan', 'vegetarian']);
  });
});

describe('mealTotals', () => {
  test('sums baked item macros', () => {
    expect(mealTotals([
      { kcal: 200, proteinG: 20, carbsG: 10, fatG: 5 },
      { kcal: 100, proteinG: 5, carbsG: 20, fatG: 1 },
    ])).toEqual({ kcal: 300, protein: 25, carbs: 30, fat: 6 });
  });
});

describe('dietAllows (vegan ⊂ vegetarian ⊂ omnivore)', () => {
  test('omnivore eats anything', () => {
    expect(dietAllows('omnivore', 'omnivore')).toBe(true);
    expect(dietAllows('omnivore', 'vegetarian')).toBe(true);
    expect(dietAllows('omnivore', 'vegan')).toBe(true);
  });
  test('vegetarian gets vegetarian + vegan, not omnivore', () => {
    expect(dietAllows('vegetarian', 'omnivore')).toBe(false);
    expect(dietAllows('vegetarian', 'vegetarian')).toBe(true);
    expect(dietAllows('vegetarian', 'vegan')).toBe(true);
  });
  test('vegan gets vegan only', () => {
    expect(dietAllows('vegan', 'omnivore')).toBe(false);
    expect(dietAllows('vegan', 'vegetarian')).toBe(false);
    expect(dietAllows('vegan', 'vegan')).toBe(true);
  });
});

describe('getCuratedCandidates', () => {
  test('vegan user only ever gets vegan meals', () => {
    const c = getCuratedCandidates({ diet: 'vegan' });
    expect(c.length).toBeGreaterThan(0);
    c.forEach(m => expect(m.diet).toBe('vegan'));
  });

  test('vegetarian user gets no omnivore meals', () => {
    const c = getCuratedCandidates({ diet: 'vegetarian' });
    c.forEach(m => expect(m.diet === 'vegan' || m.diet === 'vegetarian').toBe(true));
  });

  test('slot filter only returns meals tagged for that slot', () => {
    const breakfast = getCuratedCandidates({ diet: 'omnivore', slot: 'breakfast' });
    expect(breakfast.length).toBeGreaterThan(0);
    breakfast.forEach(m => expect(m.slots.includes('breakfast') || m.slots.includes('any')).toBe(true));
    // a breakfast-only meal must not show at dinner
    const dinner = getCuratedCandidates({ diet: 'omnivore', slot: 'dinner' });
    expect(dinner.map(m => m.id)).not.toContain('curated_eggs_oats_banana');
  });

  test('candidates are engine-ready (totals + itemCount)', () => {
    const [c] = getCuratedCandidates({ diet: 'omnivore', slot: 'lunch' });
    expect(c.totals).toEqual(expect.objectContaining({
      kcal: expect.any(Number), protein: expect.any(Number),
    }));
    expect(c.itemCount).toBe(c.items.length);
  });
});
