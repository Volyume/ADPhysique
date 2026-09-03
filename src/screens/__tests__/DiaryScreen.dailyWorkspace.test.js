/**
 * Mounted coverage for D138 (the diary as a daily workspace), items 1-6.
 *
 * What this suite pins, and why each pin is written to fail:
 *
 *  1. ONE-TAP USUAL. The chip states the portion it will write, and tapping
 *     it runs the diary's real log path (logFoodEntry with the remembered
 *     grams and macros scaled for them, then upsertSlotRecent) and offers an
 *     Undo that deletes exactly that entry. A one-tap write that logged a
 *     different amount from the one on its own label, or that could not be
 *     reversed, would be the diary silently editing a user's intake.
 *  2. PER-MEAL COPY. An empty meal whose slot had food yesterday copies ONLY
 *     that slot's rows, and only real intake (a planned, unconfirmed row was
 *     never eaten and must not become today's actual). Undo removes every
 *     copied row, not just the first.
 *  3. DAY TOOLS CHIP ROW. Meal builder / Higher-calorie day / Trends, with
 *     the banking chip still behind the untouched bankingAvailable ED gate
 *     (DiaryScreen.bankingAvailable.test.js owns that gate's own cases).
 *  4. NO TARGETS. A user with no nutrition targets is given the way out.
 *  5. LOAD COST. Yesterday is read only when this day can actually use it.
 *  6. BATCHED RESOLUTION. The day's entries and the usual chips each resolve
 *     their food refs in ONE call, not one call per row.
 *
 * Harness conventions (native mocks, whole-module DB mocks, focus-effect
 * shim) are taken from DiaryScreen.bankingAvailable.test.js in this
 * directory; see its header for why a mount test needs them.
 *
 * NOTE: `resolveFoodRefs` is landing in src/lib/food/sources/localCache.js on
 * a concurrent lane. It is mocked here with the single-ref semantics
 * (ref -> food row, missing refs absent from the Map), which is the contract
 * DiaryScreen consumes.
 */
import { create, act } from 'react-test-renderer';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), getParent: () => ({ addListener: () => () => {} }) }),
    useFocusEffect: (cb) => React.useEffect(cb, [cb]),
  };
});

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('Swipeable', props, props.children) };
});

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
  useFont: () => null, useImage: () => null,
}));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: mockToastShow }),
  ToastProvider: ({ children }) => children,
}));

const mockGetFoodEntriesForDay = jest.fn(() => Promise.resolve([]));
const mockGetSlotRecents = jest.fn(() => Promise.resolve([]));
const mockLogFoodEntry = jest.fn(() => Promise.resolve('entry-new'));
const mockUpsertSlotRecent = jest.fn(() => Promise.resolve());
const mockDeleteFoodEntry = jest.fn(() => Promise.resolve(true));

jest.mock('../../lib/food/db', () => ({
  getFoodEntriesForDay: (...a) => mockGetFoodEntriesForDay(...a),
  getRecentLoggedDays: jest.fn(() => Promise.resolve([])),
  deleteFoodEntry: (...a) => mockDeleteFoodEntry(...a),
  restoreFoodEntry: jest.fn(() => Promise.resolve()),
  updateFoodEntry: jest.fn(() => Promise.resolve()),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  applyCuratedMealToDiary: jest.fn(() => Promise.resolve()),
  setWater: jest.fn(() => Promise.resolve()),
  getWater: jest.fn(() => Promise.resolve(0)),
  createSavedMeal: jest.fn(() => Promise.resolve()),
  confirmPlannedDay: jest.fn(() => Promise.resolve(0)),
  clearPlannedDay: jest.fn(() => Promise.resolve()),
  getSlotRecents: (...a) => mockGetSlotRecents(...a),
  logFoodEntry: (...a) => mockLogFoodEntry(...a),
  upsertSlotRecent: (...a) => mockUpsertSlotRecent(...a),
}));

const OATS = {
  food_ref: 'global:oats', source: 'off', name: 'Porridge oats', brand: null,
  serving_g: null, serving_label: null,
  kcal_100g: 379, protein_100g: 13, carbs_100g: 60, fat_100g: 8, fibre_100g: 10,
};

const mockResolveFoodRefs = jest.fn(async (userId, refs) => {
  const map = new Map();
  (refs ?? []).forEach((ref) => { if (ref === OATS.food_ref) map.set(ref, OATS); });
  return map;
});
jest.mock('../../lib/food/sources/localCache', () => ({
  resolveFoodRef: jest.fn(() => Promise.resolve(null)),
  resolveFoodRefs: (...a) => mockResolveFoodRefs(...a),
}));

const mockGetNutritionTargets = jest.fn(() => Promise.resolve(null));
jest.mock('../../lib/database', () => ({
  getNutritionTargets: (...a) => mockGetNutritionTargets(...a),
  getOpenEdPatternFlag: jest.fn(() => Promise.resolve(false)),
  getLatestBodyWeight: jest.fn(() => Promise.resolve(null)),
  getLatestBodyComposition: jest.fn(() => Promise.resolve(null)),
  getLatestCoachOutput: jest.fn(() => Promise.resolve(null)),
}));

import DiaryScreen from '../DiaryScreen';
import useAppStore from '../../store/useAppStore';
import { isoDate, shiftDate } from '../../lib/food/diaryDates';

const TODAY = isoDate(new Date());
const YESTERDAY = shiftDate(TODAY, -1);

const targets = {
  id: 'nt1', userId: 'u1', bmr: 1700, tdee: 2600, targetKcal: 2600,
  proteinG: 180, carbsG: 300, fatG: 80, phase: 'maintain',
  floorApplied: false, warnings: [],
};

const entry = (over = {}) => ({
  id: 'y1', user_id: 'u1', entry_date: YESTERDAY, meal_slot: 'meal_1',
  food_ref: 'global:oats', quantity_g: 60, kcal: 227, protein_g: 8,
  carbs_g: 36, fat_g: 5, fibre_g: 6, is_planned: 0, weight_state: 'as_weighed',
  ...over,
});

// The meal cards (and so the usual / copy chips) only render once the day has
// started: an entirely empty day shows EmptyDiary instead. That is the
// existing diary structure, and D138 item 2 is written to it ("yesterday's
// meal must be reusable per meal AFTER the day has started"), so every chip
// case seeds one entry in a DIFFERENT meal and leaves meal_1 empty.
function dayWith({ today = [], yesterday = [] } = {}) {
  mockGetFoodEntriesForDay.mockImplementation((userId, date) => Promise.resolve(
    date === TODAY ? today : (date === YESTERDAY ? yesterday : []),
  ));
}
const startedDay = [
  { id: 't1', user_id: 'u1', entry_date: TODAY, meal_slot: 'meal_3', food_ref: 'global:oats',
    quantity_g: 60, kcal: 227, protein_g: 8, carbs_g: 36, fat_g: 5, fibre_g: 6, is_planned: 0 },
];

// A cross-tab jump (navigateCrossTab) goes through the TAB navigator, not
// this stack's navigate, so the parent is a real spy too.
const mockParentNavigate = jest.fn();
function makeNav() {
  return {
    navigate: jest.fn(),
    setParams: jest.fn(),
    getParent: () => ({ navigate: mockParentNavigate, addListener: () => () => {} }),
  };
}

async function mountDiary(nav = makeNav()) {
  let tree;
  await act(async () => {
    tree = create(<DiaryScreen navigation={nav} route={{ params: {} }} />);
  });
  await act(async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 15; i++) await Promise.resolve();
  });
  return tree;
}

const byLabel = (tree, label) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  { deep: false },
);

// The rendered tree carries circular props (RefreshControl), so read the
// visible strings out of the JSON tree rather than stringifying it.
function collectText(node, out = []) {
  if (node == null) return out;
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach((n) => collectText(n, out)); return out; }
  (node.children ?? []).forEach((c) => collectText(c, out));
  return out;
}
const textOf = (tree) => collectText(tree.toJSON()).join('\n');

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFoodEntriesForDay.mockImplementation(() => Promise.resolve([]));
  mockGetSlotRecents.mockImplementation(() => Promise.resolve([]));
  mockGetNutritionTargets.mockResolvedValue(targets);
  useAppStore.setState({
    user: { id: 'u1', email: 't@e.com', isLocal: false },
    session: { user: { id: 'u1' } },
    tier: 'pro',
    firstRunComplete: true,
    userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric', sex: 'female' },
  });
});

describe('D138 item 1: one-tap usual', () => {
  const withRecents = (grams = 60) => {
    dayWith({ today: startedDay });
    mockGetSlotRecents.mockImplementation((userId, slotKey) => Promise.resolve(
      slotKey === 'meal_1' ? [{ food_ref: 'global:oats', last_quantity_g: grams, log_count: 9 }] : [],
    ));
  };

  test('the chip states the remembered portion before it is tapped', async () => {
    withRecents();
    const tree = await mountDiary();
    expect(textOf(tree)).toContain('Porridge oats · 60 g');
    expect(byLabel(tree, 'Log Porridge oats, 60 grams')).toHaveLength(1);
  });

  test('tapping it logs exactly that portion through the diary write path', async () => {
    withRecents();
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, 'Log Porridge oats, 60 grams')[0].props.onPress(); });

    expect(mockLogFoodEntry).toHaveBeenCalledTimes(1);
    const [userId, payload] = mockLogFoodEntry.mock.calls[0];
    expect(userId).toBe('u1');
    expect(payload.entryDate).toBe(TODAY);
    expect(payload.mealSlot).toBe('meal_1');
    expect(payload.foodRef).toBe('global:oats');
    expect(payload.quantityG).toBe(60);
    // Macros are scaled for the SAME grams the chip promised.
    expect(payload.kcal).toBe(227);
    expect(payload.proteinG).toBe(7.8);
    // The slot memory is updated so the chip keeps reflecting real habit.
    expect(mockUpsertSlotRecent).toHaveBeenCalledWith('u1', {
      mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60,
    });
  });

  test('the log is announced with its portion and can be undone', async () => {
    withRecents();
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, 'Log Porridge oats, 60 grams')[0].props.onPress(); });

    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('Porridge oats logged, 60 g.');
    expect(options.variant).toBe('undo');
    await act(async () => { await options.action.onPress(); });
    expect(mockDeleteFoodEntry).toHaveBeenCalledWith('entry-new', 'u1');
  });

  test('a usual with no remembered portion opens the sheet instead of guessing one', async () => {
    dayWith({ today: startedDay });
    mockGetSlotRecents.mockImplementation((userId, slotKey) => Promise.resolve(
      slotKey === 'meal_1' ? [{ food_ref: 'global:oats', last_quantity_g: 0, log_count: 2 }] : [],
    ));
    const nav = makeNav();
    const tree = await mountDiary(nav);
    await act(async () => { await byLabel(tree, 'Log Porridge oats to Meal 1')[0].props.onPress(); });
    expect(mockLogFoodEntry).not.toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledWith('FoodSearch', expect.objectContaining({
      entryDate: TODAY, mealSlot: 'meal_1', preselectedFood: expect.objectContaining({ food_ref: 'global:oats' }),
    }));
  });
});

describe('D138 item 2: per-meal copy from yesterday', () => {
  const withYesterday = (rows) => dayWith({ today: startedDay, yesterday: rows });

  test('an empty meal offers yesterday, and copies only that meal', async () => {
    withYesterday([
      entry({ id: 'y1', meal_slot: 'meal_1' }),
      entry({ id: 'y2', meal_slot: 'meal_1' }),
      entry({ id: 'y3', meal_slot: 'meal_2' }),
    ]);
    const tree = await mountDiary();
    const chip = byLabel(tree, "Yesterday's Meal 1, copy 2 entries into Meal 1");
    expect(chip).toHaveLength(1);
    expect(textOf(tree)).toContain("Yesterday's Meal 1");

    await act(async () => { await chip[0].props.onPress(); });
    expect(mockLogFoodEntry).toHaveBeenCalledTimes(2);
    mockLogFoodEntry.mock.calls.forEach(([, payload]) => {
      expect(payload.mealSlot).toBe('meal_1');
      expect(payload.entryDate).toBe(TODAY);
    });
  });

  test('a planned, unconfirmed row from yesterday is never copied as eaten', async () => {
    withYesterday([
      entry({ id: 'y1', meal_slot: 'meal_1', is_planned: 1 }),
      entry({ id: 'y2', meal_slot: 'meal_1', is_planned: 0 }),
    ]);
    const tree = await mountDiary();
    const chip = byLabel(tree, "Yesterday's Meal 1, copy 1 entry into Meal 1");
    expect(chip).toHaveLength(1);
    await act(async () => { await chip[0].props.onPress(); });
    expect(mockLogFoodEntry).toHaveBeenCalledTimes(1);
  });

  test('undo removes every copied row, not just the first', async () => {
    withYesterday([entry({ id: 'y1' }), entry({ id: 'y2' })]);
    mockLogFoodEntry
      .mockResolvedValueOnce('copy-1')
      .mockResolvedValueOnce('copy-2');
    const tree = await mountDiary();
    await act(async () => {
      await byLabel(tree, "Yesterday's Meal 1, copy 2 entries into Meal 1")[0].props.onPress();
    });
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('Meal 1 copied from yesterday, 2 entries.');
    expect(options.variant).toBe('undo');
    await act(async () => { await options.action.onPress(); });
    expect(mockDeleteFoodEntry).toHaveBeenCalledWith('copy-1', 'u1');
    expect(mockDeleteFoodEntry).toHaveBeenCalledWith('copy-2', 'u1');
  });

  test('a meal yesterday left empty offers nothing for that meal', async () => {
    withYesterday([entry({ meal_slot: 'meal_2' })]);
    const tree = await mountDiary();
    expect(byLabel(tree, "Yesterday's Meal 1, copy 1 entry into Meal 1")).toHaveLength(0);
    expect(byLabel(tree, "Yesterday's Meal 2, copy 1 entry into Meal 2")).toHaveLength(1);
  });
});

describe('D138 item 3: the day tools chip row', () => {
  test('meal builder, higher-calorie day and trends are one chip row', async () => {
    dayWith({ today: startedDay });
    const nav = makeNav();
    const tree = await mountDiary(nav);

    expect(byLabel(tree, 'Open meal builder for this day or week')).toHaveLength(1);
    // byLabel already requires an onPress, which the CalorieBankSheet's own
    // identically-labelled wrapper does not carry: this is the entry point.
    expect(byLabel(tree, 'Plan a higher-calorie day')).toHaveLength(1);

    const trends = byLabel(tree, 'Open nutrition trends and export');
    expect(trends).toHaveLength(1);
    act(() => { trends[0].props.onPress(); });
    expect(nav.navigate).toHaveBeenCalledWith('FoodInsights');
  });

  test('the two-line meal-builder promo is not repeated over the empty state', async () => {
    const tree = await mountDiary();
    // EmptyDiary still carries its own promo; the chip does not duplicate it.
    expect(textOf(tree)).toContain('Meal builder');
    expect(byLabel(tree, 'Open nutrition trends and export')).toHaveLength(1);
    expect(byLabel(tree, 'Open meal builder for this day or week')
      .filter((n) => n.props.accessibilityRole === 'button')).toHaveLength(1);
  });
});

describe('D138 item 4: no targets', () => {
  test('a user with no targets is given the way out, under the rings', async () => {
    mockGetNutritionTargets.mockResolvedValue(null);
    const nav = makeNav();
    const tree = await mountDiary(nav);
    expect(textOf(tree)).toContain('Set your targets first and Volyume can suggest meals that fit them.');
    const cta = byLabel(tree, 'Set nutrition targets');
    expect(cta.length).toBeGreaterThan(0);
    act(() => { cta[0].props.onPress(); });
    expect(mockParentNavigate).toHaveBeenCalledWith('ProfileTab', expect.objectContaining({
      screen: 'NutritionTargets',
    }));
  });

  test('with targets present the prompt is absent', async () => {
    const tree = await mountDiary();
    expect(textOf(tree)).not.toContain('Set your targets first');
  });
});

describe('D138 items 5 and 6: load cost', () => {
  test('yesterday is read when a meal on this day is still empty', async () => {
    await mountDiary();
    expect(mockGetFoodEntriesForDay.mock.calls.some(([, d]) => d === YESTERDAY)).toBe(true);
  });

  test('yesterday is not read when every visible meal already has food', async () => {
    dayWith({
      today: ['meal_1', 'meal_2', 'meal_3', 'meal_4'].map(
        (slot, i) => entry({ id: `t${i}`, entry_date: TODAY, meal_slot: slot }),
      ),
    });
    await mountDiary();
    expect(mockGetFoodEntriesForDay.mock.calls.some(([, d]) => d === YESTERDAY)).toBe(false);
  });

  test('food refs resolve in batches, not one call per row', async () => {
    dayWith({
      today: [entry({ id: 'a', entry_date: TODAY }), entry({ id: 'b', entry_date: TODAY }), entry({ id: 'c', entry_date: TODAY })],
    });
    mockGetSlotRecents.mockImplementation(() => Promise.resolve([
      { food_ref: 'global:oats', last_quantity_g: 60, log_count: 3 },
    ]));
    await mountDiary();
    // One call for the day's entries per load, one for all slots' recents
    // together: never a call per entry or per recent row.
    expect(mockResolveFoodRefs.mock.calls.length).toBeLessThanOrEqual(4);
    mockResolveFoodRefs.mock.calls.forEach(([, refs]) => expect(Array.isArray(refs)).toBe(true));
    const enriched = mockResolveFoodRefs.mock.calls.find(([, refs]) => refs.length > 0);
    expect(enriched).toBeTruthy();
  });
});
