import {
  mealSlotLabel, slotOrder, buildMealSlots, highestLoggedMeal, pickerMealSlots,
  DEFAULT_MEALS_PER_DAY, inferMealSlotForHour,
  EATING_WINDOW_START_HOUR, EATING_WINDOW_END_HOUR,
  defaultMealSlotLabel, setMealLabelOverrides, getMealLabelOverrides,
} from '../mealSlots';

const ent = (slot) => ({ meal_slot: slot });

describe('custom meal-name overrides (gap #1)', () => {
  afterEach(() => setMealLabelOverrides({})); // isolate: clear the module cache

  test('a custom name wins over the default, and buildMealSlots/pickers pick it up', () => {
    setMealLabelOverrides({ meal_1: 'Breakfast', preworkout: 'Intra' });
    expect(mealSlotLabel('meal_1')).toBe('Breakfast');
    expect(mealSlotLabel('preworkout')).toBe('Intra');
    expect(mealSlotLabel('meal_2')).toBe('Meal 2'); // untouched key keeps the default
    const slots = buildMealSlots([], 2);
    expect(slots.find((s) => s.key === 'meal_1').label).toBe('Breakfast');
    const picker = pickerMealSlots('meal_1', 2);
    expect(picker.find((s) => s.key === 'meal_1').label).toBe('Breakfast');
    // The override still applies when the peri-workout slot is opted in.
    const slotsOn = buildMealSlots([], 2, true);
    expect(slotsOn.find((s) => s.key === 'preworkout').label).toBe('Intra');
  });

  test('defaultMealSlotLabel ignores the override (for the rename UI)', () => {
    setMealLabelOverrides({ meal_1: 'Breakfast' });
    expect(defaultMealSlotLabel('meal_1')).toBe('Meal 1');
  });

  test('overrides are sanitised: blanks dropped, trimmed, length-capped, non-strings dropped', () => {
    setMealLabelOverrides({ meal_1: '  ', meal_2: '  Lunch  ', meal_3: 'x'.repeat(40), meal_4: 5 });
    const o = getMealLabelOverrides();
    expect(o.meal_1).toBeUndefined();
    expect(o.meal_2).toBe('Lunch');
    expect(o.meal_3).toHaveLength(24);
    expect(o.meal_4).toBeUndefined();
  });

  test('empty cache leaves every default unchanged (back-compat)', () => {
    setMealLabelOverrides({});
    expect(mealSlotLabel('meal_1')).toBe('Meal 1');
    expect(mealSlotLabel('breakfast')).toBe('Breakfast');
  });
});

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
  test('OFF BY DEFAULT: a new/empty day with no periWorkoutSlots arg is just the numbered ladder', () => {
    const slots = buildMealSlots([], DEFAULT_MEALS_PER_DAY);
    expect(slots.map((s) => s.key)).toEqual(['meal_1', 'meal_2', 'meal_3', 'meal_4']);
    expect(slots[0].label).toBe('Meal 1');
  });

  test('OFF BY DEFAULT: explicit periWorkoutSlots=false hides Pre/Post-workout entirely', () => {
    const slots = buildMealSlots([], DEFAULT_MEALS_PER_DAY, false);
    const keys = slots.map((s) => s.key);
    expect(keys).not.toContain('preworkout');
    expect(keys).not.toContain('postworkout');
  });

  test('opting in (periWorkoutSlots=true) shows the numbered ladder plus the peri-workout meals, in order', () => {
    const slots = buildMealSlots([], DEFAULT_MEALS_PER_DAY, true);
    expect(slots.map((s) => s.key)).toEqual([
      'meal_1', 'meal_2', 'meal_3', 'meal_4', 'preworkout', 'postworkout',
    ]);
  });

  test('HIDDEN WHEN OFF but no empty prompt lost: a slot with no entries and the preference off never appears, and never re-adds itself as an empty card', () => {
    const slots = buildMealSlots([], DEFAULT_MEALS_PER_DAY, false);
    expect(slots.some((s) => s.key === 'preworkout' || s.key === 'postworkout')).toBe(false);
  });

  test('BACK-COMPAT: an entry already logged under preworkout/postworkout still shows even with the preference off', () => {
    const keys = buildMealSlots([ent('preworkout'), ent('postworkout')], 4, false).map((s) => s.key);
    expect(keys).toContain('preworkout');
    expect(keys).toContain('postworkout');
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
  });
  test('does not duplicate the current slot when it is already in the ladder', () => {
    const keys = pickerMealSlots('meal_2', 4).map((s) => s.key);
    expect(keys.filter((k) => k === 'meal_2')).toHaveLength(1);
  });
  test('OFF BY DEFAULT: Pre/Post-workout are not offered unless opted in', () => {
    const keysOff = pickerMealSlots('meal_1', 4).map((s) => s.key);
    expect(keysOff).not.toContain('preworkout');
    expect(keysOff).not.toContain('postworkout');
    const keysOn = pickerMealSlots('meal_1', 4, true).map((s) => s.key);
    expect(keysOn).toContain('preworkout');
    expect(keysOn).toContain('postworkout');
  });
  test('BACK-COMPAT: an entry already sitting in preworkout stays selectable even with the preference off', () => {
    const keys = pickerMealSlots('preworkout', 4, false).map((s) => s.key);
    expect(keys).toContain('preworkout');
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

describe('inferMealSlotForHour (barcode-FAB likely slot, dossier C8)', () => {
  // The 4-meal ladder plus peri-workout, opted in (the shape these guessing
  // tests exercise; buildMealSlots itself defaults periWorkoutSlots to off).
  const ladder = buildMealSlots([], 4, true).map((s) => s.key); // meal_1..4, pre, post

  test('morning maps to the first meal, evening to the last', () => {
    expect(inferMealSlotForHour(7, ladder)).toBe('meal_1');
    expect(inferMealSlotForHour(21, ladder)).toBe('meal_4');
  });

  test('midday lands on a middle meal, never the edges', () => {
    const midday = inferMealSlotForHour(13, ladder);
    expect(['meal_2', 'meal_3']).toContain(midday);
  });

  test('never guesses a peri-workout slot (intent-specific, not time-of-day)', () => {
    for (let h = 0; h <= 23; h += 1) {
      const slot = inferMealSlotForHour(h, ladder);
      expect(slot).not.toBe('preworkout');
      expect(slot).not.toBe('postworkout');
    }
  });

  test('clamps hours outside the eating window to the ends', () => {
    expect(inferMealSlotForHour(2, ladder)).toBe('meal_1'); // pre-dawn
    expect(inferMealSlotForHour(EATING_WINDOW_START_HOUR - 3, ladder)).toBe('meal_1');
    expect(inferMealSlotForHour(EATING_WINDOW_END_HOUR + 1, ladder)).toBe('meal_4');
  });

  test('a single-meal day always returns that meal', () => {
    const one = buildMealSlots([], 1).map((s) => s.key);
    expect(inferMealSlotForHour(9, one)).toBe('meal_1');
    expect(inferMealSlotForHour(20, one)).toBe('meal_1');
  });

  test('degrades safely on empty or junk input', () => {
    expect(inferMealSlotForHour(12, [])).toBeNull();
    expect(inferMealSlotForHour(NaN, ladder)).toBe('meal_1'); // falls to window start
    expect(inferMealSlotForHour(12, ['preworkout', 'postworkout'])).toBe('preworkout');
  });

  test('respects a legacy breakfast/lunch/dinner ladder order', () => {
    const legacy = ['breakfast', 'lunch', 'dinner'];
    expect(inferMealSlotForHour(7, legacy)).toBe('breakfast');
    expect(inferMealSlotForHour(21, legacy)).toBe('dinner');
  });
});
