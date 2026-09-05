/**
 * NutritionTargetsScreen — the caller's return trip (A6, certification
 * 2026-09-05).
 *
 * What this pins: when a screen sends someone here with
 * `returnToTab`/`returnToScreen`, leaving this screen takes them BACK to that
 * screen, not to the destination tab's root. MealPlanScreen.js:430-434 has
 * always passed those params when a missing target blocked plan generation
 * ("Set your nutrition targets first, then your plan builds from them"), and
 * nothing read them, so Back landed on the Coach tab root and the meal plan
 * the person was building was gone.
 *
 * And the other half, which is what makes this safe: with no such params the
 * screen must not intercept anything, so the ordinary Settings → Nutrition
 * targets → back journey is untouched.
 *
 * Driven against the REAL screen with its data boundary mocked: the listener
 * React Navigation would fire is captured from the navigation stub and
 * invoked, so this exercises the actual handler rather than its shape.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/BottomSheet', () => {
  const { createContext } = require('react');
  return {
    __esModule: true,
    default: () => null,
    InsideBottomSheetContext: createContext(false),
  };
});
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/database', () => ({
  saveNutritionTargets: jest.fn(async () => {}),
  getNutritionTargets: jest.fn(async () => null),
  logBodyMetric: jest.fn(async () => {}),
  getUserBodyProfile: jest.fn(async () => null),
  getLatestBodyWeight: jest.fn(async () => null),
  getLatestBodyComposition: jest.fn(async () => null),
}));
jest.mock('../../lib/food/mealPlanService', () => ({
  reviewTargetChangeAgainstActivePlan: jest.fn(async () => ({ action: 'KEEP' })),
  commitReconciledPlan: jest.fn(async () => ({})),
  regenerateActiveMealPlan: jest.fn(async () => ({})),
  CONTINUITY_ACTION: { KEEP: 'KEEP', ADJUST: 'ADJUST', REBUILD: 'REBUILD' },
  REBUILD_REASON: {},
}));
jest.mock('../../lib/effectiveMaintenanceService', () => ({
  resolveEffectiveMaintenanceForUser: jest.fn(async () => null),
}));

import useAppStore from '../../store/useAppStore';
import NutritionTargetsScreen from '../NutritionTargetsScreen';

const store = { user: { id: 'user-1' }, userProfile: {}, units: 'metric', accessibility: { reduceMotion: true } };

function makeNav() {
  const parent = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })), dispatch: jest.fn() };
  const listeners = {};
  const nav = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn((event, cb) => { listeners[event] = cb; return () => { delete listeners[event]; }; }),
    getParent: () => parent,
  };
  return { nav, parent, listeners };
}

async function mount(params) {
  const { nav, parent, listeners } = makeNav();
  let tree;
  await act(async () => {
    tree = create(<NutritionTargetsScreen navigation={nav} route={{ params }} />);
  });
  return { tree, nav, parent, listeners };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((sel) => (typeof sel === 'function' ? sel(store) : store));
});

describe("NutritionTargetsScreen honours a caller's return params", () => {
  test('leaving returns to the screen that sent the person here, cross-tab', async () => {
    // Exactly what MealPlanScreen.js:430-434 passes.
    const { nav, parent, listeners, tree } = await mount({
      source: 'meal_plan_no_target',
      returnToTab: 'DiaryTab',
      returnToScreen: 'MealPlan',
    });

    expect(typeof listeners.beforeRemove).toBe('function');
    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    act(() => { listeners.beforeRemove(event); });

    expect(event.preventDefault).toHaveBeenCalled();
    // navigateCrossTab's contract: go through the tab navigator, and do not
    // let the destination open on its own initial route.
    expect(parent.navigate).toHaveBeenCalledWith('DiaryTab', { screen: 'MealPlan', initial: false });
    expect(nav.goBack).not.toHaveBeenCalled();

    await act(async () => { tree.unmount(); });
  });

  test('a second removal is not intercepted again', async () => {
    const { parent, listeners, tree } = await mount({
      returnToTab: 'DiaryTab', returnToScreen: 'MealPlan',
    });
    const first = { preventDefault: jest.fn(), data: { action: {} } };
    const second = { preventDefault: jest.fn(), data: { action: {} } };

    act(() => { listeners.beforeRemove(first); });
    act(() => { listeners.beforeRemove(second); });

    expect(second.preventDefault).not.toHaveBeenCalled();
    expect(parent.navigate).toHaveBeenCalledTimes(1);

    await act(async () => { tree.unmount(); });
  });

  test('with no return params nothing is intercepted: back behaves as before', async () => {
    const { nav, parent, listeners, tree } = await mount({});

    expect(listeners.beforeRemove).toBeUndefined();
    expect(nav.addListener).not.toHaveBeenCalledWith('beforeRemove', expect.any(Function));
    expect(parent.navigate).not.toHaveBeenCalled();

    await act(async () => { tree.unmount(); });
  });

  test('the screen tolerates being opened with no route params at all', async () => {
    const { listeners, tree } = await mount(undefined);

    expect(listeners.beforeRemove).toBeUndefined();

    await act(async () => { tree.unmount(); });
  });
});
