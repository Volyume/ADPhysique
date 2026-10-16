/**
 * MealsSheet (D230 R11, food level-up 2026-10-16): Day tools -> Meals.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - Meals per day writes the EXISTING synced pref `@volyume_meals_per_day`
 *    (the key NutritionTargetsScreen writes and the Diary reads), within
 *    NutritionTargetsScreen's own bounds (3 to 8), under its own label
 *    "Diary meals per day" (NutritionTargetsScreen.mealsPerDayLabel.guard),
 *    and tells the Diary the new number. A sheet that wrote a new key, or
 *    no key, would change nothing the next time the Diary loads.
 *  - Each visible meal's name goes through the EXISTING `setMealLabel`
 *    (mealSlots.js, synced as `@volyume_meal_labels`), so the label every
 *    surface reads changes; a name is capped at 24 characters; an empty
 *    name restores "Meal N". Custom meal names had a store and a sync but no
 *    UI (inventory 1.3), so all of this fails against the tree before D230.
 *  - An edit left unsaved when the sheet closes is saved, not dropped.
 *  - Its title and its "Meal names" section title are headings (R16).
 */
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import MealsSheet, { MEALS_PER_DAY_MIN, MEALS_PER_DAY_MAX } from '../MealsSheet';
import * as mealSlots from '../../../lib/food/mealSlots';

const SLOTS = [
  { key: 'meal_1', label: 'Meal 1' },
  { key: 'meal_2', label: 'Meal 2' },
  { key: 'meal_3', label: 'Meal 3' },
  { key: 'meal_4', label: 'Meal 4' },
];

function instanceText(inst) {
  if (typeof inst === 'string') return inst;
  return (inst.children ?? []).map(instanceText).join('');
}
const headers = (tree) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header',
).map(instanceText);

// The shallowest pressable with this label.
const byLabel = (tree, label) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  { deep: false },
);
// The TextField element for a meal (composite props: our own handlers).
const field = (tree, meal) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === `Name for ${meal}` && typeof n.props?.onChangeText === 'function',
)[0];

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

function render(props = {}) {
  let tree;
  act(() => {
    tree = create(
      <MealsSheet
        visible
        onClose={props.onClose ?? (() => {})}
        mealsPerDay={props.mealsPerDay ?? 4}
        onChangeMealsPerDay={props.onChangeMealsPerDay ?? (() => {})}
        slots={props.slots ?? SLOTS}
        onLabelsChanged={props.onLabelsChanged ?? (() => {})}
      />,
    );
  });
  return tree;
}

let setMealLabelSpy;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mealSlots.setMealLabelOverrides({});
  setMealLabelSpy = jest.spyOn(mealSlots, 'setMealLabel');
});
afterEach(() => { setMealLabelSpy.mockRestore(); });

describe('MealsSheet: meals per day', () => {
  test('writes the existing synced pref and tells the Diary, under NutritionTargets\' own label', async () => {
    const onChangeMealsPerDay = jest.fn();
    const tree = render({ mealsPerDay: 4, onChangeMealsPerDay });
    expect(JSON.stringify(tree.toJSON())).toContain('Diary meals per day');
    act(() => { byLabel(tree, 'One more meal per day')[0].props.onPress(); });
    await flush();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@volyume_meals_per_day', '5');
    expect(await AsyncStorage.getItem('@volyume_meals_per_day')).toBe('5');
    expect(onChangeMealsPerDay).toHaveBeenCalledWith(5);
  });

  test('holds NutritionTargets\' bounds, 3 to 8', () => {
    expect([MEALS_PER_DAY_MIN, MEALS_PER_DAY_MAX]).toEqual([3, 8]);
    const atMax = render({ mealsPerDay: 8 });
    expect(atMax.root.findAll((n) => n.props?.accessibilityLabel === 'One more meal per day' && n.props?.disabled === true).length).toBeGreaterThan(0);
    const atMin = render({ mealsPerDay: 3 });
    expect(atMin.root.findAll((n) => n.props?.accessibilityLabel === 'One fewer meal per day' && n.props?.disabled === true).length).toBeGreaterThan(0);
  });
});

describe('MealsSheet: meal names', () => {
  test('a name is saved through setMealLabel when its field is left, and every label reads it', async () => {
    const onLabelsChanged = jest.fn();
    const tree = render({ onLabelsChanged });
    act(() => { field(tree, 'Meal 1').props.onChangeText('Breakfast'); });
    await act(async () => { await field(tree, 'Meal 1').props.onBlur(); });
    await flush();
    expect(setMealLabelSpy).toHaveBeenCalledWith('meal_1', 'Breakfast');
    expect(mealSlots.mealSlotLabel('meal_1')).toBe('Breakfast');
    expect(JSON.parse(await AsyncStorage.getItem(mealSlots.MEAL_LABELS_KEY))).toEqual({ meal_1: 'Breakfast' });
    expect(onLabelsChanged).toHaveBeenCalled();
  });

  test('a name is capped at 24 characters', async () => {
    const tree = render();
    expect(field(tree, 'Meal 2').props.maxLength).toBe(24);
    act(() => { field(tree, 'Meal 2').props.onChangeText('A very long name for a lunch meal indeed'); });
    await act(async () => { await field(tree, 'Meal 2').props.onSubmitEditing(); });
    await flush();
    expect(mealSlots.mealSlotLabel('meal_2')).toBe('A very long name for a l');
    expect(mealSlots.mealSlotLabel('meal_2')).toHaveLength(24);
  });

  test('an empty name restores "Meal N"', async () => {
    mealSlots.setMealLabelOverrides({ meal_3: 'Dinner' });
    const tree = render();
    expect(field(tree, 'Meal 3').props.value).toBe('Dinner');
    act(() => { field(tree, 'Meal 3').props.onChangeText('   '); });
    await act(async () => { await field(tree, 'Meal 3').props.onBlur(); });
    await flush();
    expect(setMealLabelSpy).toHaveBeenCalledWith('meal_3', '');
    expect(mealSlots.mealSlotLabel('meal_3')).toBe('Meal 3');
  });

  test('an edit left unsaved is saved when the sheet closes', async () => {
    const onClose = jest.fn();
    const tree = render({ onClose });
    act(() => { field(tree, 'Meal 4').props.onChangeText('Supper'); });
    await act(async () => { await byLabel(tree, 'Done, save the meal names')[0].props.onPress(); });
    await flush();
    expect(setMealLabelSpy).toHaveBeenCalledWith('meal_4', 'Supper');
    expect(mealSlots.mealSlotLabel('meal_4')).toBe('Supper');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('an unchanged name writes nothing', async () => {
    const tree = render();
    await act(async () => { await field(tree, 'Meal 1').props.onBlur(); });
    expect(setMealLabelSpy).not.toHaveBeenCalled();
  });
});

describe('MealsSheet: headings', () => {
  test('the title and the "Meal names" section title are headings', () => {
    const tree = render();
    expect(headers(tree)).toEqual(['Meals', 'Meal names']);
  });
});
