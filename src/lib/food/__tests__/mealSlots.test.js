import {
  mealSlotLabel, slotOrder, buildMealSlots, highestLoggedMeal, pickerMealSlots,
  DEFAULT_MEALS_PER_DAY,
} from '../mealSlots';

const ent = (slot) => ({ meal_slot: slot });

describe('mealSlotLabel', () => {
  test('labels numbered, legacy and peri-workout keys', () => {
    expect(mealSlotLabel('meal_1')).toBe('Meal 1');
    expect(mealSlotLabel('meal_12')).toBe('Meal 12');
    expect(mealSlotLabel('breakfast')).toBe('Breakfast');
    expect(mealSlotLabel('snack')).toBe('Snacks');
    expect(mealSlotLabel('preworkout')).toBe('Pre-workout');
    expect(mealSlotLabel('postworkout')).toBe('Post-workout');
  });
  test('falls back safely for anything unexpected', () => {
    expect(mealSlotLabel('weird')).toBe('Meal');
    expect(mealSlotLabel(null)).toBe('Meal');
  });
});

describe('buildMealSlots', () => {
  test('a new/empty day is the numbered ladder plus the peri-workout meals, in order', () => {
    const slots = buildMealSlots([], DEFAULT_MEALS_PER_DAY);
    expect(slots.map((s) => s.key)).toEqual([
      'meal_1', 'meal_2', 'meal_3', 'meal_4', 'preworkout', 'postworkout',
    ]);
    expect(slots[0].label).toBe('Meal 1');
  });

  test('BACK-COMPAT: legacy entries are never hidden, and sit in their natural order', () => {
    const slots = buildMealSlots([ent('breakfast'), ent('dinner'), ent('snack')], 4);
    const keys = slots.map((s) => s.key);
    // legacy meals present...
    expect(keys).toContain('breakfast');
    expect(keys).toContain('dinner');
    expect(keys).toContain('snack');
    // ...ordered before the numbered ladder (breakfast/lunch/dinner early),
    // snack last; the numbered meals still appear for new logging.
    expect(keys.indexOf('breakfast')).toBeLessThan(keys.indexOf('meal_1'));
    expect(keys.indexOf('meal_1')).toBeLessThan(keys.indexOf('snack'));
    expect(keys).toContain('meal_1');
  });

  test('a numbered meal beyond the ladder (meal_6) is still shown', () => {
    const keys = buildMealSlots([ent('meal_6')], 4).map((s) => s.key);
    expect(keys).toContain('meal_6');
    expect(keys.indexOf('meal_4')).toBeLessThan(keys.indexOf('meal_6'));
  });

  test('no duplicate slot when an entry matches a ladder meal', () => {
    const keys = buildMealSlots([ent('meal_2')], 4).map((s) => s.key);
    expect(keys.filter((k) => k === 'meal_2')).toHaveLength(1);
  });
});

describe('highestLoggedMeal', () => {
  test('returns the highest numbered meal with an entry, else 0', () => {
    expect(highestLoggedMeal([ent('meal_2'), ent('meal_5'), ent('breakfast')])).toBe(5);
    expect(highestLoggedMeal([ent('breakfast')])).toBe(0);
    expect(highestLoggedMeal([])).toBe(0);
  });
});

describe('pickerMealSlots', () => {
  test('always includes the current slot so an existing entry stays selectable', () => {
    const keys = pickerMealSlots('breakfast', 4).map((s) => s.key);
    expect(keys).toContain('breakfast');
    expect(keys).toContain('meal_1');
    expect(keys).toContain('preworkout');
  });
  test('does not duplicate the current slot when it is already in the ladder', () => {
    const keys = pickerMealSlots('meal_2', 4).map((s) => s.key);
    expect(keys.filter((k) => k === 'meal_2')).toHaveLength(1);
  });
});

describe('slotOrder', () => {
  test('orders legacy day-meals, numbered meals, peri-workout, then snack', () => {
    expect(slotOrder('breakfast')).toBeLessThan(slotOrder('meal_1'));
    expect(slotOrder('meal_1')).toBeLessThan(slotOrder('meal_2'));
    expect(slotOrder('meal_2')).toBeLessThan(slotOrder('preworkout'));
    expect(slotOrder('preworkout')).toBeLessThan(slotOrder('snack'));
  });
});
