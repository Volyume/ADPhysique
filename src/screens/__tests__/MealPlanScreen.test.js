/**
 * MealPlanScreen — the meal-swap sheet (rethink §3.3, founder directive: a
 * generous, scrollable list of genuinely different alternatives, not a single
 * "next" suggestion). Two contract points:
 *   - opening the swap sheet surfaces MORE than 4 alternatives when the engine
 *     returns them (the deepened pool, not a pair of near-clones), and
 *   - tapping an alternative applies that exact meal to the slot.
 * The engine is mocked at the service boundary (the screen never computes
 * nutrition); reduce-motion makes the BottomSheet mount synchronously.
 */
import { create, act } from 'react-test-renderer';
import { Share } from 'react-native';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/BackHeader', () => () => null);
// Batch 2 wave B (B-2 Button adoption): swap/repeat/shopping-list/share are now
// <Button> instead of raw TouchableOpacity, so the old `() => null` mock made
// them invisible to the buttons(tree) helper below. Render a real TouchableOpacity
// preserving accessibilityRole/onPress/accessibilityLabel so existing assertions
// (which search the tree, not a captured-props reference) still find them.
jest.mock('../../components/Button', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress, disabled, accessibilityLabel }) => (
    React.createElement(
      TouchableOpacity,
      { accessibilityRole: 'button', onPress, disabled, accessibilityLabel: accessibilityLabel || title },
      React.createElement(Text, null, title),
    )
  );
});
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/food/mealPlanService', () => ({
  loadActiveMealPlan: jest.fn(),
  generateAndSaveDayPlan: jest.fn(),
  generateAndSaveMealPlan: jest.fn(),
  regenerateActiveMealPlan: jest.fn(),
  applyPlanDayToDiary: jest.fn(),
  applyPlanWeekToDiary: jest.fn(),
  answerTrainingTodayOnActivePlan: jest.fn(),
  repeatPlanDayOnActivePlan: jest.fn(),
  swapMealInPlan: jest.fn(),
  swapFoodInMeal: jest.fn(),
  findRoleAlternatives: jest.fn(() => []),
}));
jest.mock('../../lib/food/db', () => ({
  updateMealPlan: jest.fn(),
  getFoodEntriesForDay: jest.fn(async () => []),
  clearPlannedDay: jest.fn(),
}));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));

import useAppStore from '../../store/useAppStore';
import { loadActiveMealPlan, swapMealInPlan, repeatPlanDayOnActivePlan } from '../../lib/food/mealPlanService';
import { updateMealPlan } from '../../lib/food/db';
import { appAlert } from '../../components/AppAlert';
import MealPlanScreen from '../MealPlanScreen';

const nav = { goBack: jest.fn(), navigate: jest.fn() };

// A minimal plan: one day with a single dinner slot the swap acts on.
function makePlan() {
  return {
    prefs: {},
    schedule: ['training'],
    targetSnapshot: { targetKcal: 2400 },
    days: [{
      variant: 'training',
      withinTolerance: true,
      totals: { kcal: 600, protein: 40, carbs: 50, fat: 20 },
      slots: [{
        slot: 'meal_1',
        name: 'Chicken and rice',
        totals: { kcal: 600, protein: 40, carbs: 50, fat: 20 },
        items: [],
        components: [{ food: 'chicken_breast', g: 150 }],
      }],
    }],
  };
}

// A diverse alternatives pool: more than 4 so the "generous list" is real.
function makeMeal(id) {
  return {
    mealId: id,
    name: `Alt ${id}`,
    source: 'curated',
    components: [],
    items: [],
    totals: { kcal: 590 + id, protein: 39 + id, carbs: 50, fat: 19 },
  };
}

const swapResult = {
  replacement: {
    mealId: 'rep',
    name: 'Closest plate',
    source: 'curated',
    components: [],
    items: [],
    totals: { kcal: 605, protein: 41, carbs: 51, fat: 20 },
  },
  alternatives: [1, 2, 3, 4, 5, 6, 7].map(makeMeal), // 7 alternatives (> 4)
};

const store = {
  user: { id: 'u1' },
  userProfile: {},
  accessibility: { reduceMotion: true },
  addMealPlanExcludedFood: jest.fn(),
  setMealPlanPrefs: jest.fn(),
};

function buttons(tree) {
  return tree.root.findAll((n) => n.props.accessibilityRole === 'button'
    && typeof n.props.onPress === 'function');
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => selector(store));
  swapMealInPlan.mockReturnValue(swapResult);
  updateMealPlan.mockResolvedValue(undefined);
});

// Mount the screen and await the loader effect so the plan is on screen.
async function mountLoaded() {
  const { loadActiveMealPlan } = require('../../lib/food/mealPlanService');
  loadActiveMealPlan.mockResolvedValue({ id: 'rec1', plan: makePlan() });
  let tree;
  await act(async () => {
    tree = create(<MealPlanScreen navigation={nav} />);
  });
  return tree;
}

describe('MealPlanScreen meal-swap sheet', () => {
  test('shows a retryable load error instead of the empty builder state', async () => {
    loadActiveMealPlan.mockRejectedValueOnce(new Error('db failed'));
    let tree;
    await act(async () => {
      tree = create(<MealPlanScreen navigation={nav} />);
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain("Couldn't load meal builder");
    expect(text).toContain('Your diary has not been changed.');
    expect(text).not.toContain('Build a day or week to your targets');
  });

  test('opens a sheet listing the replacement plus more than 4 alternatives', async () => {
    const tree = await mountLoaded();

    // Tap the slot's "Swap" button to open the sheet.
    const swapBtn = buttons(tree).find((b) => /for something else$/
      .test(String(b.props.accessibilityLabel || '')));
    expect(swapBtn).toBeTruthy();
    act(() => swapBtn.props.onPress());

    // Count the distinct meal-option rows in the sheet (replacement +
    // alternatives), deduped by label since react-test-renderer surfaces both
    // the composite and host node for one TouchableOpacity.
    const optionLabels = new Set(buttons(tree)
      .map((b) => String(b.props.accessibilityLabel || ''))
      .filter((l) => /\d+ calories, \d+ grams protein/.test(l)));
    // 1 replacement + 7 alternatives = 8, comfortably more than 4.
    expect(optionLabels.size).toBeGreaterThan(4);
    expect(optionLabels.size).toBe(8);
  });

  test('tapping an alternative applies that exact meal to the slot', async () => {
    const tree = await mountLoaded();

    const swapBtn = buttons(tree).find((b) => /for something else$/
      .test(String(b.props.accessibilityLabel || '')));
    act(() => swapBtn.props.onPress());

    // Pick a specific alternative (Alt 3) and apply it.
    const altRow = buttons(tree).find((b) => String(b.props.accessibilityLabel || '')
      .startsWith('Alt 3,'));
    expect(altRow).toBeTruthy();

    await act(async () => { await altRow.props.onPress(); });

    expect(updateMealPlan).toHaveBeenCalledTimes(1);
    const savedPlan = updateMealPlan.mock.calls[0][2];
    const savedSlot = savedPlan.days[0].slots[0];
    expect(savedSlot.name).toBe('Alt 3');
    expect(savedSlot.slot).toBe('meal_1');
  });
});

// A minimal two-day WEEK plan: distinct meals per day so a copy is provable.
function makeWeekPlan() {
  const mkDay = (variant, mealName) => ({
    variant,
    withinTolerance: true,
    totals: { kcal: 600, protein: 40, carbs: 50, fat: 20 },
    slots: [{
      slot: 'meal_1',
      name: mealName,
      totals: { kcal: 600, protein: 40, carbs: 50, fat: 20 },
      items: [],
      components: [{ food: 'chicken_breast', g: 150 }],
    }],
  });
  return {
    kind: 'week',
    prefs: {},
    schedule: ['training', 'rest'],
    targetSnapshot: { targetKcal: 2400 },
    days: [mkDay('training', 'Training day meal'), mkDay('rest', 'Rest day meal')],
  };
}

describe('MealPlanScreen — repeat this day (audit §15 item 6)', () => {
  test('the quick action is offered on a week plan, and the copy only runs after the confirm alert, with the right day indices', async () => {
    loadActiveMealPlan.mockResolvedValue({ id: 'rec1', plan: makeWeekPlan() });
    repeatPlanDayOnActivePlan.mockResolvedValue({
      plan: { ...makeWeekPlan(), lastEditType: 'day_repeat' },
      changed: true,
    });

    let tree;
    await act(async () => { tree = create(<MealPlanScreen navigation={nav} />); });

    const repeatBtn = buttons(tree).find((b) => b.props.accessibilityLabel === 'Repeat this day onto another day');
    expect(repeatBtn).toBeTruthy();
    act(() => repeatBtn.props.onPress());

    // The picker offers the OTHER day only (day 1 is in view by default).
    // react-test-renderer surfaces both the composite and host node for one
    // TouchableOpacity, so dedupe by label as the swap-sheet test above does.
    const targetLabels = new Set(buttons(tree)
      .map((b) => String(b.props.accessibilityLabel || ''))
      .filter((l) => /^Copy meals onto /.test(l)));
    expect(targetLabels.size).toBe(1);
    const targetBtn = buttons(tree).find((b) => b.props.accessibilityLabel === [...targetLabels][0]);
    act(() => targetBtn.props.onPress());

    // Picking a target opens the confirm alert; the service is NOT called yet.
    expect(appAlert).toHaveBeenCalledTimes(1);
    expect(repeatPlanDayOnActivePlan).not.toHaveBeenCalled();
    const [title, message, alertButtons] = appAlert.mock.calls[0];
    expect(title).toBe('Repeat this day?');
    expect(message).toMatch(/replaced/i);
    const confirm = alertButtons.find((b) => b.text === 'Repeat');
    expect(confirm).toBeTruthy();

    // Confirming fires the real write with the source day (0) and chosen target (1).
    await act(async () => { await confirm.onPress(); });
    expect(repeatPlanDayOnActivePlan).toHaveBeenCalledTimes(1);
    expect(repeatPlanDayOnActivePlan).toHaveBeenCalledWith('u1', { fromIndex: 0, toIndex: 1 });
  });

  test('a single-day plan never offers the repeat action (nowhere else to copy to)', async () => {
    const tree = await mountLoaded(); // single-day plan from makePlan()
    const repeatBtn = buttons(tree).find((b) => b.props.accessibilityLabel === 'Repeat this day onto another day');
    expect(repeatBtn).toBeUndefined();
  });
});

describe('MealPlanScreen — shopping-list share (audit §15 item 6)', () => {
  test('sharing the built list sends plain text using the same names and grams the sheet shows', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const tree = await mountLoaded();

    const groceryBtn = buttons(tree).find((b) => b.props.accessibilityLabel === 'Shopping list');
    expect(groceryBtn).toBeTruthy();
    act(() => groceryBtn.props.onPress());

    const shareBtn = buttons(tree).find((b) => b.props.accessibilityLabel === 'Share shopping list');
    expect(shareBtn).toBeTruthy();
    await act(async () => { await shareBtn.props.onPress(); });

    expect(Share.share).toHaveBeenCalledTimes(1);
    const { message } = Share.share.mock.calls[0][0];
    expect(message).toContain('Shopping list, 1 day');
    expect(message).toContain('Proteins');
    expect(message).toContain('Chicken breast fillet (cooked), 150 g');
    Share.share.mockRestore();
  });
});

describe('MealPlanScreen review-before-add flow', () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'MealPlanScreen.js'), 'utf8');

  test('puts the add-to-diary action after the meal list and day totals', () => {
    expect(source).toContain('<Text style={styles.emptyTitle}>Meal builder</Text>');
    expect(source).toContain("title={!plan ? 'Meal builder' : isDayPlan ? 'Review day meals' : 'Review week meals'}");
    expect(source).toContain('Build meals from your targets, review them, then add the ones you want to your diary.');
    expect(source).toContain('title="Build today"');
    expect(source).toContain('title="Build week"');
    expect(source).not.toContain('<Text style={styles.emptyTitle}>Create meals</Text>');
    expect(source).not.toContain('title="Plan this day"');
    expect(source).not.toContain('title="Plan the week"');
    expect(source).toContain('Nothing is logged until you add it');
    expect(source.indexOf('{/* Day totals')).toBeLessThan(source.indexOf('<View style={styles.planActionPanel}>'));
    expect(source.indexOf('Meal preferences')).toBeLessThan(source.indexOf('Review meals'));
    expect(source.indexOf('Meal preferences')).toBeLessThan(source.indexOf('<View style={styles.planActionPanel}>'));
    expect(source).toContain('const [prefsOpen, setPrefsOpen] = useState(false);');
    expect(source).toContain('Changes update the meals around the same targets.');
    expect(source).toContain('easy to repeat');
    expect(source).not.toContain('repeat-friendly');
    expect(source).toContain('Repeat is easiest to prep. Mixed keeps some meals familiar. Varied changes more across the week.');
    expect(source).toContain('Switch this on if you want separate meals before and after training. Leave it off for a simpler day.');
    expect(source).toContain("label: 'Pre + post'");
    expect(source).toContain('accessibilityState={{ checked: selected, disabled: busy }}');
    expect(source).toContain('const insets = useSafeAreaInsets();');
    expect(source).toContain("edges={['top', 'bottom']}");
    expect(source).toContain('bottomScrollPadding');
    expect(source).toContain('emptyBottomPadding');
    expect(source).toContain('const hasSwappableFoods = (day?.slots || []).some');
    expect(source).toContain('Hold a swappable food to leave it out of future plans.');
    expect(source).toContain('Review the meals and add the plan when it looks right.');
    expect(source).toContain("`Ready to add ${planStartDate === todayLocalKey() ? 'today' : planStartLabel}`");
    expect(source).toContain('Adds these meals to today. Existing logged food is left alone.');
    expect(source).toContain('accessibilityLabel="Refresh meals"');
    expect(source).toContain("isDayPlan ? 'Create week' : 'Create day'");
    expect(source).toMatch(/swapBtn: \{[\s\S]*borderWidth: 1,[\s\S]*backgroundColor: colors\.surface2/);
    expect(source).toMatch(/swapText: \{ color: colors\.textPrimary/);
  });

  test('nutrition-target redirect carries a return intent back to Meal Plan', () => {
    expect(source).toContain("source: 'meal_plan_no_target'");
    expect(source).toContain("returnToTab: 'DiaryTab'");
    expect(source).toContain("returnToScreen: 'MealPlan'");
  });
});
