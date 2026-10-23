/**
 * Mounted coverage for the Nutrition tab's layout rework (D231, app layout
 * rework, batch 3: "the diary comes first"; docs/app-rework-2026-10/SPEC.md).
 *
 * What this suite pins, and why each pin is written to fail:
 *
 *  1. THE TARGET IS A BUTTON. Tapping "of N kcal" on the calorie card opens
 *     Nutrition targets (the same ProfileTab > NutritionTargets door Day tools
 *     used). It is its own pressable with a role and a spoken label, separate
 *     from the card's own tap (the by-meal breakdown), and it is not there in
 *     totals-only mode or with no targets. Against the old screen "of N kcal"
 *     was plain text, so there is no such button.
 *  2. THE CHIP IS INSIDE THE CARD. "Targets updated. See why" is a descendant
 *     of the calorie card (MacroRings), with the same condition (a coach-
 *     applied change inside seven days, coaching set up), the same destination
 *     (CoachOutput for that week) and a 48 dp height. Against the old screen
 *     it was a sibling ABOVE the card.
 *  3. ONE PLANNED-MEALS LINE. "3 planned meals · Mark all eaten · Clear",
 *     "1 planned meal" for one, at the top of the meals; no "Mark all eaten"
 *     on a future day; it replaces the bottom banner and both hint captions.
 *     Against the old screen the banner read "N planned meals for this day."
 *     at the foot and a hint caption stood above the meals.
 *  4. THE ORDER. Day picker, calorie card, planned line, meals, Add another
 *     meal, Water, tools, offer.
 *  5. TOOLS. Meal builder and Higher-calorie day (the ED/floor gate is
 *     unchanged); no "Copy yesterday" row; Day tools holds only Copy from
 *     another day and Meals.
 *  6. ONE OFFER, BELOW THE TOOLS. The meal-reminder offer, else the barcode-
 *     fixes offer, never both; the reminder offer still hides under calm mode
 *     and under an open ED flag (its gate is the lib's, untouched).
 *
 * Harness conventions are those of DiaryScreen.foodLevelUp.test.js.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

jest.mock('../../components/AppAlert', () => ({
  appAlert: jest.fn(),
  AppAlertHost: () => null,
}));

const mockGetFoodEntriesForDay = jest.fn(() => Promise.resolve([]));
const mockConfirmPlannedDay = jest.fn(() => Promise.resolve(0));
const mockClearPlannedDay = jest.fn(() => Promise.resolve());
const mockGetRecentIntakeSummary = jest.fn(() => Promise.resolve({ daysLogged: 3 }));
const mockGetRecentLoggedDays = jest.fn(() => Promise.resolve([]));

jest.mock('../../lib/food/db', () => ({
  getFoodEntriesForDay: (...a) => mockGetFoodEntriesForDay(...a),
  getRecentLoggedDays: (...a) => mockGetRecentLoggedDays(...a),
  getRecentIntakeSummary: (...a) => mockGetRecentIntakeSummary(...a),
  deleteFoodEntry: jest.fn(() => Promise.resolve(true)),
  restoreFoodEntry: jest.fn(() => Promise.resolve()),
  updateFoodEntry: jest.fn(() => Promise.resolve()),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  applyCuratedMealToDiary: jest.fn(() => Promise.resolve()),
  adjustWaterMl: jest.fn(() => Promise.resolve(0)),
  getWater: jest.fn(() => Promise.resolve(0)),
  createSavedMeal: jest.fn(() => Promise.resolve()),
  confirmPlannedDay: (...a) => mockConfirmPlannedDay(...a),
  clearPlannedDay: (...a) => mockClearPlannedDay(...a),
  getSlotRecents: jest.fn(() => Promise.resolve([])),
  logFoodEntry: jest.fn(() => Promise.resolve('entry-new')),
  logFoodEntries: jest.fn(async (userId, entries) => entries.map((_, i) => `copied-${i + 1}`)),
  deleteFoodEntries: jest.fn(() => Promise.resolve(2)),
  isLoggableFoodEntry: jest.fn(() => true),
  upsertSlotRecent: jest.fn(() => Promise.resolve()),
}));

const OATS = {
  food_ref: 'global:oats', source: 'off', name: 'Porridge oats', brand: null,
  serving_g: null, serving_label: null,
  kcal_100g: 379, protein_100g: 13, carbs_100g: 60, fat_100g: 8, fibre_100g: 10,
};

jest.mock('../../lib/food/sources/localCache', () => ({
  resolveFoodRef: jest.fn(() => Promise.resolve(null)),
  resolveFoodRefs: jest.fn(async (userId, refs) => {
    const map = new Map();
    (refs ?? []).forEach((ref) => { if (ref === 'global:oats') map.set(ref, OATS); });
    return map;
  }),
}));

const mockGetNutritionTargets = jest.fn(() => Promise.resolve(null));
const mockGetOpenEdPatternFlag = jest.fn(() => Promise.resolve(false));
const mockGetLatestCoachOutput = jest.fn(() => Promise.resolve(null));
jest.mock('../../lib/database', () => ({
  getNutritionTargets: (...a) => mockGetNutritionTargets(...a),
  getOpenEdPatternFlag: (...a) => mockGetOpenEdPatternFlag(...a),
  getLatestBodyWeight: jest.fn(() => Promise.resolve(null)),
  getLatestBodyComposition: jest.fn(() => Promise.resolve(null)),
  getLatestCoachOutput: (...a) => mockGetLatestCoachOutput(...a),
}));

import DiaryScreen from '../DiaryScreen';
import MacroRings from '../../components/food/MacroRings';
import useAppStore from '../../store/useAppStore';
import { isoDate, shiftDate } from '../../lib/food/diaryDates';
import { touchTarget } from '../../styles/layout';
import { setMealLabelOverrides } from '../../lib/food/mealSlots';
import { WELLBEING_KEY } from '../../lib/wellbeing';
import { MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR } from '../../lib/food/mealReminderOffer';

const TODAY = isoDate(new Date());
const TOMORROW = shiftDate(TODAY, 1);
const BARCODE_OFFER_PENDING_KEY = '@volyume_scan_chain_completed_v1'; // writeback.js CHAIN_DONE_KEY

const targets = {
  id: 'nt1', userId: 'u1', bmr: 1700, tdee: 2600, targetKcal: 2600,
  proteinG: 180, carbsG: 300, fatG: 80, phase: 'maintain',
  floorApplied: false, warnings: [],
};

const entry = (over = {}) => ({
  id: 'e1', user_id: 'u1', entry_date: TODAY, meal_slot: 'meal_1',
  food_ref: 'global:oats', quantity_g: 60, kcal: 227, protein_g: 8,
  carbs_g: 36, fat_g: 5, fibre_g: 6, is_planned: 0, weight_state: 'as_weighed',
  ...over,
});
const planned = (id, slot, date = TODAY) => entry({ id, meal_slot: slot, entry_date: date, is_planned: 1 });

function dayWith(byDate) {
  mockGetFoodEntriesForDay.mockImplementation((userId, date) => Promise.resolve(byDate[date] ?? []));
}

const mockParentNavigate = jest.fn();
const mockNavigate = jest.fn();
function makeNav() {
  return {
    navigate: mockNavigate,
    setParams: jest.fn(),
    getParent: () => ({ navigate: mockParentNavigate, addListener: () => () => {} }),
  };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 15; i++) await Promise.resolve();
  });
}

async function mountDiary(params = {}) {
  let tree;
  await act(async () => {
    tree = create(<DiaryScreen navigation={makeNav()} route={{ params }} />);
  });
  await flush();
  return tree;
}

const byLabel = (tree, label) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  { deep: false },
);
const byLabelStart = (tree, start) => tree.root.findAll(
  (n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.startsWith(start)
    && typeof n.props?.onPress === 'function',
  { deep: false },
);

function collectText(node, out = []) {
  if (node == null) return out;
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach((n) => collectText(n, out)); return out; }
  (node.children ?? []).forEach((c) => collectText(c, out));
  return out;
}
const textOf = (tree) => collectText(tree.toJSON()).join('\n');

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return typeof style === 'object' ? style : {};
}

const OPEN_TARGETS = { screen: 'NutritionTargets', initial: false };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setMealLabelOverrides({});
  mockGetFoodEntriesForDay.mockImplementation(() => Promise.resolve([]));
  mockGetNutritionTargets.mockResolvedValue(targets);
  mockGetOpenEdPatternFlag.mockResolvedValue(false);
  mockGetLatestCoachOutput.mockResolvedValue(null);
  mockGetRecentIntakeSummary.mockResolvedValue({ daysLogged: 3 });
  mockGetRecentLoggedDays.mockResolvedValue([]);
  mockConfirmPlannedDay.mockResolvedValue(0);
  useAppStore.setState({
    user: { id: 'u1', email: 't@e.com', isLocal: false },
    session: { user: { id: 'u1' } },
    tier: 'pro',
    firstRunComplete: true,
    userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric', sex: 'female' },
  });
});

describe('the calorie card: its target is a button of its own', () => {
  test('tapping "of N kcal" opens Nutrition targets; it is a labelled button, separate from the card\'s breakdown tap', async () => {
    dayWith({ [TODAY]: [entry()] });
    const tree = await mountDiary();
    const target = tree.root.findByProps({ testID: 'macro-target' });
    expect(target.props.accessibilityRole).toBe('button');
    expect(target.props.accessibilityLabel).toBe('Target 2,600 calories. Open nutrition targets.');
    expect(flattenStyle(target.props.style).minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
    // The visible words are the target's own.
    expect(textOf(tree)).toContain('of 2,600 kcal');

    await act(async () => { target.props.onPress(); });
    expect(mockParentNavigate).toHaveBeenCalledWith('ProfileTab', expect.objectContaining(OPEN_TARGETS));
    // It did not open the by-meal sheet: that is the card's tap.
    expect(textOf(tree)).not.toContain('By meal');

    // The card's own tap is a different element and still opens the breakdown.
    const summary = tree.root.findByProps({ testID: 'macro-summary' });
    expect(summary).not.toBe(target);
    expect(summary.props.accessibilityLabel).toContain('Tap for the breakdown by meal.');
    await act(async () => { summary.props.onPress(); });
    expect(textOf(tree)).toContain('By meal');
    expect(mockParentNavigate).toHaveBeenCalledTimes(1);
  });

  test('the target is not a button in totals-only mode (coaching not set up)', async () => {
    useAppStore.setState({ userProfile: { firstName: 'Test', coachingDeferred: true, units: 'metric' } });
    dayWith({ [TODAY]: [entry()] });
    const tree = await mountDiary();
    expect(tree.root.findAllByProps({ testID: 'macro-target' })).toHaveLength(0);
    expect(textOf(tree)).not.toContain('of 2,600 kcal');
  });

  test('the target is not a button when there are no targets yet (the empty state has its own button)', async () => {
    mockGetNutritionTargets.mockResolvedValue(null);
    dayWith({ [TODAY]: [entry()] });
    const tree = await mountDiary();
    expect(tree.root.findAllByProps({ testID: 'macro-target' })).toHaveLength(0);
    expect(byLabel(tree, 'Set nutrition targets')).toHaveLength(1);
  });
});

describe('the "Targets updated. See why" chip sits inside the card', () => {
  const recent = { weekStart: '2026-10-12', appliedAdjustments: { calories: { appliedAt: Date.now() - 60 * 1000 } } };
  const chipLabel = 'Targets updated. See why.';

  test('inside MacroRings, to that week\'s decision, 48 dp tall', async () => {
    mockGetLatestCoachOutput.mockResolvedValue(recent);
    dayWith({ [TODAY]: [entry()] });
    const tree = await mountDiary();
    const card = tree.root.findByType(MacroRings);
    const inside = card.findAll((n) => n.props?.accessibilityLabel === chipLabel && typeof n.props?.onPress === 'function', { deep: false });
    expect(inside).toHaveLength(1);
    // And it is the ONLY one: nothing stands outside the card any more.
    expect(byLabel(tree, chipLabel)).toHaveLength(1);
    expect(inside[0].props.accessibilityRole).toBe('button');
    expect(flattenStyle(inside[0].props.style).minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
    await act(async () => { inside[0].props.onPress(); });
    expect(mockParentNavigate).toHaveBeenCalledWith('ProfileTab', {
      screen: 'CoachOutput', params: { weekStart: '2026-10-12' }, initial: false,
    });
  });

  test('same condition as before: not after seven days, not on a self-made change, not in totals-only mode', async () => {
    dayWith({ [TODAY]: [entry()] });
    mockGetLatestCoachOutput.mockResolvedValue({ weekStart: '2026-10-12', appliedAdjustments: { calories: { appliedAt: Date.now() - 8 * 86400000 } } });
    expect(byLabel(await mountDiary(), chipLabel)).toHaveLength(0);

    mockGetLatestCoachOutput.mockResolvedValue({ weekStart: '2026-10-12', appliedAdjustments: {} });
    expect(byLabel(await mountDiary(), chipLabel)).toHaveLength(0);

    mockGetLatestCoachOutput.mockResolvedValue(recent);
    useAppStore.setState({ userProfile: { firstName: 'Test', coachingDeferred: true, units: 'metric' } });
    expect(byLabel(await mountDiary(), chipLabel)).toHaveLength(0);
  });
});

describe('ONE planned-meals line', () => {
  test('"3 planned meals · Mark all eaten · Clear" at the top of the meals, and nothing else says it', async () => {
    dayWith({ [TODAY]: [planned('p1', 'meal_1'), planned('p2', 'meal_1'), planned('p3', 'meal_2'), planned('p4', 'meal_3')] });
    const tree = await mountDiary();
    const text = textOf(tree);
    // The count is of MEALS (three), not of the four foods.
    expect(text).toContain('3 planned meals');
    expect(text).toContain('Mark all eaten');
    expect(byLabel(tree, 'Mark all eaten')).toHaveLength(1);
    expect(byLabel(tree, 'Clear the planned meals')).toHaveLength(1);
    // It replaced the banner and both hint captions.
    expect(text).not.toContain('planned meals for this day');
    expect(text).not.toContain('Mark them as eaten when you have them');
    expect(text).not.toContain('Tick meals off');
    expect(text).not.toContain('Your meals are in the diary');
    // One line: the count is said once, above the first meal.
    expect(text.split('3 planned meals')).toHaveLength(2);
    expect(text.indexOf('3 planned meals')).toBeLessThan(text.indexOf('Meal 1'));
  });

  test('"1 planned meal" for one meal, however many foods it holds', async () => {
    dayWith({ [TODAY]: [planned('p1', 'meal_1'), planned('p2', 'meal_1')] });
    const text = textOf(await mountDiary());
    expect(text).toContain('1 planned meal');
    expect(text).not.toContain('1 planned meals');
  });

  test('a future day has the count and Clear, and no "Mark all eaten"', async () => {
    dayWith({ [TOMORROW]: [planned('p1', 'meal_1', TOMORROW), planned('p2', 'meal_2', TOMORROW)] });
    const tree = await mountDiary({ date: TOMORROW });
    const text = textOf(tree);
    expect(text).toContain('2 planned meals');
    expect(text).not.toContain('Mark all eaten');
    expect(byLabel(tree, 'Mark all eaten')).toHaveLength(0);
    expect(byLabel(tree, 'Clear the planned meals')).toHaveLength(1);
  });

  test('no planned meals, no line', async () => {
    dayWith({ [TODAY]: [entry()] });
    const text = textOf(await mountDiary());
    expect(text).not.toMatch(/planned meals?\b/);
    expect(text).not.toContain('Mark all eaten');
  });

  test('"Mark all eaten" does what the banner\'s "Mark as eaten" did: confirms the day and says how many meals', async () => {
    dayWith({ [TODAY]: [planned('p1', 'meal_1'), planned('p2', 'meal_2')] });
    mockConfirmPlannedDay.mockResolvedValueOnce(2);
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, 'Mark all eaten')[0].props.onPress(); });
    expect(mockConfirmPlannedDay).toHaveBeenCalledWith('u1', TODAY);
    expect(mockToastShow.mock.calls.at(-1)[0]).toBe('2 planned meals marked as eaten.');
  });

  test('"Clear" does what it did: clears the day\'s planned meals', async () => {
    dayWith({ [TODAY]: [planned('p1', 'meal_1')] });
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, 'Clear the planned meals')[0].props.onPress(); });
    expect(mockClearPlannedDay).toHaveBeenCalledWith('u1', TODAY);
    expect(mockToastShow.mock.calls.at(-1)[0]).toBe('Planned meals cleared.');
  });

  test('the actions are 48 dp targets', async () => {
    dayWith({ [TODAY]: [planned('p1', 'meal_1')] });
    const tree = await mountDiary();
    [byLabel(tree, 'Mark all eaten')[0], byLabel(tree, 'Clear the planned meals')[0]].forEach((a) => {
      expect(flattenStyle(a.props.style).minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
    });
  });
});

describe('the order, top to bottom', () => {
  test('day picker, calorie card, planned line, meals, Add another meal, Water, tools, offer', async () => {
    dayWith({ [TODAY]: [planned('p1', 'meal_1'), entry({ id: 't1', meal_slot: 'meal_2' })] });
    const tree = await mountDiary();
    const text = textOf(tree);
    const at = (needle) => {
      const i = text.indexOf(needle);
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const markers = [
      ['day picker', at('Today')],
      ['calorie card', at('of 2,600 kcal')],
      ['planned line', at('1 planned meal')],
      ['meals', at('Meal 1')],
      ['Add another meal', at('Add another meal')],
      ['Water', at('Water')],
      ['tools', at('Meal builder')],
      ['offer', at('Want a nudge to log?')],
    ];
    const positions = markers.map((m) => m[1]);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  test('the tools are Meal builder and Higher-calorie day; there is no Copy yesterday row, even on an empty day after a logged one', async () => {
    // The old row appeared exactly here: nothing logged today, food yesterday.
    dayWith({ [TODAY]: [], [shiftDate(TODAY, -1)]: [entry({ id: 'y1', entry_date: shiftDate(TODAY, -1) })] });
    const tree = await mountDiary();
    expect(byLabel(tree, 'Open meal builder for this day or week')).toHaveLength(1);
    expect(byLabel(tree, 'Plan a higher-calorie day')).toHaveLength(1);
    expect(byLabel(tree, "Copy yesterday's entries")).toHaveLength(0);
    expect(textOf(tree)).not.toContain('Copy yesterday');
  });

  test('an open ED flag removes the Higher-calorie day tool and leaves Meal builder (the gate is unchanged)', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(true);
    dayWith({ [TODAY]: [entry()] });
    const tree = await mountDiary();
    expect(byLabel(tree, 'Plan a higher-calorie day')).toHaveLength(0);
    expect(byLabel(tree, 'Open meal builder for this day or week')).toHaveLength(1);
  });
});

describe('Day tools holds only Copy from another day and Meals', () => {
  test('opened from the day pager: two rows, no Trends, no Nutrition targets', async () => {
    const tree = await mountDiary();
    await act(async () => { byLabel(tree, 'Open diary tools')[0].props.onPress(); });
    expect(byLabelStart(tree, 'Copy from another day. ')).toHaveLength(1);
    expect(byLabelStart(tree, 'Meals. ')).toHaveLength(1);
    expect(byLabelStart(tree, 'Trends. ')).toHaveLength(0);
    expect(byLabelStart(tree, 'Nutrition targets. ')).toHaveLength(0);
    // The header's Trends door is still there, once.
    expect(byLabel(tree, 'Open nutrition trends and export')).toHaveLength(1);
  });

  test('Copy from another day lists yesterday first', async () => {
    mockGetRecentLoggedDays.mockResolvedValue([
      { entry_date: shiftDate(TODAY, -1), count: 2, kcal: 600 },
      { entry_date: shiftDate(TODAY, -4), count: 5, kcal: 1500 },
    ]);
    const tree = await mountDiary();
    await act(async () => { byLabel(tree, 'Open diary tools')[0].props.onPress(); });
    await act(async () => { await byLabelStart(tree, 'Copy from another day. ')[0].props.onPress(); });
    await flush();
    const text = textOf(tree);
    expect(text.indexOf('Yesterday')).toBeGreaterThan(-1);
    expect(text.indexOf('2 entries · 600 kcal')).toBeLessThan(text.indexOf('5 entries · 1500 kcal'));
    expect(byLabelStart(tree, 'Yesterday. ')).toHaveLength(1);
  });
});

describe('ONE offer at a time, below the tools', () => {
  const REMINDER = 'Want a nudge to log?';
  const BARCODE = 'Share barcode fixes?';

  test('the meal-reminder offer shows below the tools, and the barcode offer waits', async () => {
    await AsyncStorage.setItem(BARCODE_OFFER_PENDING_KEY, '1');
    dayWith({ [TODAY]: [entry()] });
    const text = textOf(await mountDiary());
    expect(text).toContain(REMINDER);
    expect(text).not.toContain(BARCODE);
    expect(text.indexOf('Meal builder')).toBeLessThan(text.indexOf(REMINDER));
    expect(text.indexOf('Water')).toBeLessThan(text.indexOf(REMINDER));
  });

  test('with no reminder offer due, the barcode-fixes offer shows, also below the tools', async () => {
    mockGetRecentIntakeSummary.mockResolvedValue({ daysLogged: 7 }); // logging every day: no nudge
    await AsyncStorage.setItem(BARCODE_OFFER_PENDING_KEY, '1');
    dayWith({ [TODAY]: [entry()] });
    const text = textOf(await mountDiary());
    expect(text).toContain(BARCODE);
    expect(text).not.toContain(REMINDER);
    expect(text.indexOf('Meal builder')).toBeLessThan(text.indexOf(BARCODE));
  });

  test('a dismissed reminder offer lets the barcode offer through', async () => {
    await AsyncStorage.setItem(BARCODE_OFFER_PENDING_KEY, '1');
    await AsyncStorage.setItem(MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR('u1'), 'true');
    dayWith({ [TODAY]: [entry()] });
    const text = textOf(await mountDiary());
    expect(text).not.toContain(REMINDER);
    expect(text).toContain(BARCODE);
  });

  test('calm mode hides the reminder offer, exactly as before', async () => {
    await AsyncStorage.setItem(WELLBEING_KEY, 'calm');
    dayWith({ [TODAY]: [entry()] });
    expect(textOf(await mountDiary())).not.toContain(REMINDER);
  });

  test('an open ED flag hides the reminder offer, exactly as before', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(true);
    dayWith({ [TODAY]: [entry()] });
    expect(textOf(await mountDiary())).not.toContain(REMINDER);
  });

  test('neither offer shows on a day that is not today', async () => {
    await AsyncStorage.setItem(BARCODE_OFFER_PENDING_KEY, '1');
    dayWith({ [shiftDate(TODAY, -2)]: [entry({ entry_date: shiftDate(TODAY, -2) })] });
    const text = textOf(await mountDiary({ date: shiftDate(TODAY, -2) }));
    expect(text).not.toContain(REMINDER);
    expect(text).not.toContain(BARCODE);
  });
});

describe('source wiring (what the mounted tests above cannot see)', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'DiaryScreen.js'), 'utf8');
  const PLAN_SRC = fs.readFileSync(path.join(__dirname, '..', 'MealPlanScreen.js'), 'utf8');

  test('the target is wired only with coaching set up and targets present, through the cross-tab door Day tools used', () => {
    expect(SRC).toMatch(/onTargetPress=\{coachingSetUp && effectiveTargets \? openNutritionTargets : undefined\}/);
    expect(SRC).toMatch(
      /const openNutritionTargets = useCallback\(\(\) => \{\s*haptics\.selection\(\);\s*navigateCrossTab\(navigation, 'ProfileTab', 'NutritionTargets'\);\s*\}, \[navigation\]\);/,
    );
  });

  test('the chip is MacroRings\' footer, with its own condition and destination', () => {
    expect(SRC).toMatch(/footer=\{coachingSetUp && targetsChangedRecently \? \(\s*<TouchableOpacity\s+style=\{styles\.targetsChangedRow\}/);
    expect(SRC).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'CoachOutput', \{ weekStart: latestCoachOutput\.weekStart \}\)/);
  });

  test('one offer: the reminder offer first, else the barcode offer, in one conditional after the tools', () => {
    expect(SRC).toMatch(
      /\{mealReminderOfferVisible \? \(\s*<Card padding="md" style=\{styles\.offCard\}>[\s\S]*?\) : showOffCard && selectedDate === isoDate\(new Date\(\)\) \? \(\s*<Card padding="md" style=\{styles\.offCard\}>[\s\S]*?\) : null\}/,
    );
    expect(SRC.indexOf('title="Higher-calorie day"')).toBeLessThan(SRC.indexOf('{mealReminderOfferVisible ? ('));
    // The reminder offer's gate is the lib's, with both safety reads failing closed (untouched).
    expect(SRC).toMatch(/calmMode: wellbeingRaw === 'read_failed' \|\| isCalm\(wellbeing\)/);
    expect(SRC).toMatch(/edFlagOpen: !!edFlagOpen/);
  });

  test('the retired "plan added" signal has no sender and no reader', () => {
    expect(SRC).not.toMatch(/justAddedPlan/);
    expect(PLAN_SRC).not.toMatch(/justAddedPlan/);
    expect(PLAN_SRC).toMatch(/navigation\.navigate\('Diary'\);/);
  });

  test('"Copy yesterday" is gone as code: no row, no confirm, no door state', () => {
    expect(SRC).not.toMatch(/showCopyYesterdayDoor|yesterdayHasFood|const copyYesterday\b|Copy yesterday's entries/);
  });
});
