/**
 * DietaryPreferencesEditor (founder ask 2026-07-10: inline dietary
 * preferences + allergies in the meal builder). Extracted out of
 * SettingsDietaryScreen so BOTH SettingsDietaryScreen and the meal
 * builder's inline dietary sheet (MealPlanScreen.js) render the SAME
 * component -- one source of truth, no duplicated state.
 *
 * These tests pin the component's own contract directly: it writes through
 * the exact same store actions SettingsDietaryScreen always used
 * (setDietPreference / setAllergenExcludes / removeMealPlanExcludedFood,
 * no new state, no copies), and the ED-safe soft exclusion nudge (15
 * excluded foods, tier-blind, plain voice, never mentions weight/calories)
 * fires from this shared component regardless of which screen renders it.
 * Uses the REAL store (useAppStore.setState), same idiom as
 * cp10Stage3SettingsLiveTheme.test.js's SettingsDietaryScreen case, so
 * useTheme()/useSettingsStyles() resolve for real rather than needing a
 * hand-rolled theme mock.
 */
import { create, act } from 'react-test-renderer';
import useAppStore from '../../../store/useAppStore';
import DietaryPreferencesEditor from '../DietaryPreferencesEditor';

jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

function buttons(tree) {
  return tree.root.findAll((n) => (n.props.accessibilityRole === 'radio'
    || n.props.accessibilityRole === 'checkbox'
    || n.props.accessibilityRole === 'button')
    && typeof n.props.onPress === 'function');
}

function setStore(overrides) {
  act(() => {
    useAppStore.setState({
      userProfile: { dietPreference: 'omnivore', mealPlanExcludeTags: [], mealPlanExcludeFoods: [] },
      setDietPreference: jest.fn(),
      setAllergenExcludes: jest.fn(),
      removeMealPlanExcludedFood: jest.fn(),
      ...overrides,
    });
  });
}

describe('DietaryPreferencesEditor — single source of truth (same store actions SettingsDietaryScreen always used)', () => {
  test('selecting a diet chip writes through setDietPreference, not a local/second store', () => {
    const setDietPreference = jest.fn();
    setStore({ setDietPreference });
    let tree;
    act(() => { tree = create(<DietaryPreferencesEditor />); });

    const veganChip = buttons(tree).find((b) => b.props.accessibilityLabel === 'Diet preference Vegan');
    expect(veganChip).toBeTruthy();
    act(() => veganChip.props.onPress());

    expect(setDietPreference).toHaveBeenCalledTimes(1);
    expect(setDietPreference).toHaveBeenCalledWith('vegan');
    act(() => { tree.unmount(); });
  });

  test('toggling an allergen chip writes through setAllergenExcludes with the combined tag list, not a local list', () => {
    const setAllergenExcludes = jest.fn();
    setStore({
      userProfile: { dietPreference: 'omnivore', mealPlanExcludeTags: ['milk'], mealPlanExcludeFoods: [] },
      setAllergenExcludes,
    });
    let tree;
    act(() => { tree = create(<DietaryPreferencesEditor />); });

    const peanutChip = buttons(tree).find((b) => b.props.accessibilityLabel === 'Peanuts');
    expect(peanutChip).toBeTruthy();
    expect(peanutChip.props.accessibilityState).toEqual({ checked: false });
    act(() => peanutChip.props.onPress());

    expect(setAllergenExcludes).toHaveBeenCalledTimes(1);
    expect(setAllergenExcludes).toHaveBeenCalledWith(['milk', 'peanuts']);
    act(() => { tree.unmount(); });
  });

  test('removing a flagged food writes through removeMealPlanExcludedFood', () => {
    const removeMealPlanExcludedFood = jest.fn();
    setStore({
      userProfile: { dietPreference: 'omnivore', mealPlanExcludeTags: [], mealPlanExcludeFoods: ['peanut_butter'] },
      removeMealPlanExcludedFood,
    });
    let tree;
    act(() => { tree = create(<DietaryPreferencesEditor />); });

    const removeBtn = buttons(tree).find((b) => b.props.accessibilityLabel === 'Remove Peanut butter from your avoid list');
    expect(removeBtn).toBeTruthy();
    act(() => removeBtn.props.onPress());

    expect(removeMealPlanExcludedFood).toHaveBeenCalledTimes(1);
    expect(removeMealPlanExcludedFood).toHaveBeenCalledWith('peanut_butter');
    act(() => { tree.unmount(); });
  });

  test('an empty avoid list renders the calm empty-state copy, not a blank panel', () => {
    setStore({ userProfile: { dietPreference: 'omnivore', mealPlanExcludeTags: [], mealPlanExcludeFoods: [] } });
    let tree;
    act(() => { tree = create(<DietaryPreferencesEditor />); });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Nothing on your avoid list. You can flag a food from any meal plan.');
    act(() => { tree.unmount(); });
  });
});

// ED-safety: the exclusion list has no hard cap, only a calm, tier-blind,
// plain-voice nudge past AVOID_LIST_NUDGE_THRESHOLD (15) foods (founder
// decision 2026-07-09; unchanged by this extraction, moved verbatim). This
// is the exact same code whichever screen renders it, so the nudge is
// equally reachable from the meal builder's inline sheet as from Settings.
describe('DietaryPreferencesEditor — ED-safe soft exclusion nudge (tier-blind, unchanged by the extraction)', () => {
  function foodsList(n) {
    return Array.from({ length: n }, (_, i) => `food_${i}`);
  }

  test('at or below the 15-food threshold, the nudge caption is absent', () => {
    setStore({ userProfile: { dietPreference: 'omnivore', mealPlanExcludeTags: [], mealPlanExcludeFoods: foodsList(15) } });
    let tree;
    act(() => { tree = create(<DietaryPreferencesEditor />); });
    const text = JSON.stringify(tree.toJSON());
    expect(text).not.toContain('A longer avoid list narrows what Volyume can suggest.');
    act(() => { tree.unmount(); });
  });

  test('past the 15-food threshold, the calm plain-voice nudge appears, mentioning neither weight nor calories', () => {
    setStore({ userProfile: { dietPreference: 'omnivore', mealPlanExcludeTags: [], mealPlanExcludeFoods: foodsList(16) } });
    let tree;
    act(() => { tree = create(<DietaryPreferencesEditor />); });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain("A longer avoid list narrows what Volyume can suggest. Keep it to foods you really won't eat.");
    expect(text.toLowerCase()).not.toContain('weight');
    expect(text.toLowerCase()).not.toContain('calorie');
    act(() => { tree.unmount(); });
  });
});

// Regression guard (D38 verify-first, founder ask 2026-07-10): the fix for
// the reported stranding defect is extraction-and-reuse, not a duplicate
// hand-rolled copy in the meal builder. Both consumer screens must import
// this exact module.
describe('DietaryPreferencesEditor — extraction guard (no duplicate implementation)', () => {
  test('SettingsDietaryScreen and MealPlanScreen both import DietaryPreferencesEditor from this file, not a forked copy', () => {
    const fs = require('fs');
    const path = require('path');
    const settingsSource = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'screens', 'SettingsDietaryScreen.js'), 'utf8',
    );
    const mealPlanSource = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'screens', 'MealPlanScreen.js'), 'utf8',
    );
    expect(settingsSource).toContain("import DietaryPreferencesEditor from '../components/food/DietaryPreferencesEditor';");
    expect(mealPlanSource).toContain("import DietaryPreferencesEditor from '../components/food/DietaryPreferencesEditor';");
  });
});
