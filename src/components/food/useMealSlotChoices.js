/**
 * useMealSlotChoices: the meal chips an add or edit sheet offers (food Diary
 * audit 2026-10-16, item 7).
 *
 * The sheets used to offer `pickerMealSlots(current)` at the DEFAULT number of
 * meals, whatever the person had set, so a five-meal day showed four chips
 * and a two-meal day showed four. The chips now follow the person's meals:
 *   - when the caller passes the meal list it shows (the Diary passes its own
 *     `mealSlots`, built by `buildMealSlots` from the meals-per-day
 *     preference, any meal added today and any old meal name with food),
 *     that list is used as it is;
 *   - otherwise (the add screen) the sheet reads the same preference the
 *     Diary reads (`@volyume_meals_per_day`) and builds the ladder the same
 *     way;
 *   - either way the current meal is kept visible and labelled, so an entry
 *     under an old meal name ('breakfast') or past the last meal still shows
 *     its own meal as the selected chip.
 * Pure list maths is `mealSlotChoices`, exported for tests.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pickerMealSlots, mealSlotLabel, slotOrder, DEFAULT_MEALS_PER_DAY,
} from '../../lib/food/mealSlots';

export const MEALS_PER_DAY_KEY = '@volyume_meals_per_day';

export function mealSlotChoices({ current, slots = null, mealsPerDay = DEFAULT_MEALS_PER_DAY, periWorkoutSlots = false }) {
  if (Array.isArray(slots) && slots.length) {
    const list = slots.map((s) => ({ key: s.key, label: s.label ?? mealSlotLabel(s.key) }));
    if (current && !list.some((s) => s.key === current)) {
      list.push({ key: current, label: mealSlotLabel(current) });
      list.sort((a, b) => slotOrder(a.key) - slotOrder(b.key));
    }
    return list;
  }
  return pickerMealSlots(current, mealsPerDay, periWorkoutSlots);
}

export default function useMealSlotChoices({ visible, current, slots = null, periWorkoutSlots = false }) {
  const [mealsPerDay, setMealsPerDay] = useState(DEFAULT_MEALS_PER_DAY);
  const usesPref = !(Array.isArray(slots) && slots.length);
  useEffect(() => {
    if (!visible || !usesPref) return undefined;
    let active = true;
    AsyncStorage.getItem(MEALS_PER_DAY_KEY).then((v) => {
      const n = parseInt(v, 10);
      if (active && Number.isFinite(n) && n >= 1) setMealsPerDay(n);
    }).catch(() => {}); // a missing preference keeps the default, as the Diary does
    return () => { active = false; };
  }, [visible, usesPref]);
  return mealSlotChoices({ current, slots, mealsPerDay, periWorkoutSlots });
}
