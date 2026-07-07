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

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Button', () => () => null);
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
  swapMealInPlan: jest.fn(),
  swapFoodInMeal: jest.fn(),
}));
jest.mock('../../lib/food/db', () => ({
  updateMealPlan: jest.fn(),
  getFoodEntriesForDay: jest.fn(async () => []),
  clearPlannedDay: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import { loadActiveMealPlan, swapMealInPlan } from '../../lib/food/mealPlanService';
import { updateMealPlan } from '../../lib/food/db';
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

describe('MealPlanScreen review-before-add flow', () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'MealPlanScreen.js'), 'utf8');

  test('puts the add-to-diary action after the meal list and day totals', () => {
    expect(source).toContain('<Text style={styles.emptyTitle}>Build meals</Text>');
    expect(source).toContain('Build real meals from your targets, check every plate, then add them to your diary when you are happy.');
    expect(source).toContain('Nothing is logged until you add it');
    expect(source.indexOf('{/* Day totals')).toBeLessThan(source.indexOf('<View style={styles.planActionPanel}>'));
    expect(source.indexOf('Meal preferences')).toBeLessThan(source.indexOf('Review meals'));
    expect(source.indexOf('Meal preferences')).toBeLessThan(source.indexOf('<View style={styles.planActionPanel}>'));
    expect(source).toContain('const [prefsOpen, setPrefsOpen] = useState(false);');
    expect(source).toContain('Changes rebuild the meals around the same targets.');
    expect(source).toContain("`Ready to add ${planStartDate === todayLocalKey() ? 'today' : planStartLabel}`");
    expect(source).toContain('Adds these meals to the diary date. Existing logged food is left alone.');
    expect(source).toContain('accessibilityLabel="Rebuild meals"');
    expect(source).toContain("isDayPlan ? 'Build week' : 'Build day'");
  });

  test('nutrition-target redirect carries a return intent back to Meal Plan', () => {
    expect(source).toContain("source: 'meal_plan_no_target'");
    expect(source).toContain("returnToTab: 'DiaryTab'");
    expect(source).toContain("returnToScreen: 'MealPlan'");
  });
});
