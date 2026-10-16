/**
 * Mounted coverage for the food level-up's Diary spine (register D230, wave
 * 1 lane 1A; docs/audit/food-levelup-2026-10-16/03-ASSESSMENT-AND-PLAN.md
 * rulings R1, R2, R4, R11, R14, R16 and R19, specification 4.1 and 4.2).
 *
 * What this suite pins, and why each pin is written to fail:
 *
 *  1. R1, THE SAME WORKSPACE ON EVERY DAY. An empty day renders the meal
 *     cards with their one-tap usual chips, and no EmptyDiary card ("Nothing
 *     logged for this day yet."). "Copy yesterday" is a door only on an empty
 *     day whose yesterday has food. Against the pre-D230 screen an empty day
 *     showed EmptyDiary INSTEAD of the cards, so the chip assertions fail
 *     there: the first food of a day could never be one tap.
 *  2. R16, HEADINGS. Every meal name is a header, and the Day tools, Meals
 *     and Copy from another day sheet titles are headers, reached the way a
 *     person reaches them (the day pager's tools button, then a row). Against
 *     the old screen no meal name and no sheet title carried the role.
 *  3. R2, ONE AMBER. On a populated Diary, the count of elements drawn in
 *     `primary` that are not a chart equals ONE: the scan button's glyph.
 *     The charts are excluded by what they are, not by colour: MacroRings
 *     (the calorie ring and the macro bars) and the water fill. Against the
 *     old screen the count was higher (the Trends glyph, the water glyph,
 *     the refresh spinner's tint), so the equality fails there. The one-time
 *     hint captions are marked seen first: their shared "Got it" is outside
 *     this lane and is reported, not counted.
 *  4. R4/R16, 48 dp CHIPS. Every usual, "Yesterday's <meal>" and suggestion
 *     chip is the house Chip at a minimum height of 48 dp (touchTarget). The
 *     hand-rolled chips were about 26 dp.
 *  5. R14 at the screen: a water tap hands the database the DELTA (never a
 *     total computed from the render's `waterMl`), and the screen shows the
 *     value the database returns. Two taps inside one await window are two
 *     +250 deltas, so neither can be lost.
 *  6. R11/R19: Day tools carries "Meals" and "Nutrition targets"; the
 *     latter is the same cross-tab door the no-targets state uses.
 *
 * Harness conventions (native mocks, whole-module DB mocks, focus-effect
 * shim) are taken from DiaryScreen.bankingAvailable.test.js and
 * DiaryScreen.dailyWorkspace.test.js in this directory.
 */
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

const mockAppAlert = jest.fn();
jest.mock('../../components/AppAlert', () => ({
  appAlert: (...a) => mockAppAlert(...a),
  AppAlertHost: () => null,
}));

const mockGetFoodEntriesForDay = jest.fn(() => Promise.resolve([]));
const mockGetSlotRecents = jest.fn(() => Promise.resolve([]));
const mockLogFoodEntry = jest.fn(() => Promise.resolve('entry-new'));
const mockAdjustWaterMl = jest.fn(() => Promise.resolve(0));
const mockGetWater = jest.fn(() => Promise.resolve(0));
const mockGetRecentLoggedDays = jest.fn(() => Promise.resolve([]));

jest.mock('../../lib/food/db', () => ({
  getFoodEntriesForDay: (...a) => mockGetFoodEntriesForDay(...a),
  getRecentLoggedDays: (...a) => mockGetRecentLoggedDays(...a),
  deleteFoodEntry: jest.fn(() => Promise.resolve(true)),
  restoreFoodEntry: jest.fn(() => Promise.resolve()),
  updateFoodEntry: jest.fn(() => Promise.resolve()),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  applyCuratedMealToDiary: jest.fn(() => Promise.resolve()),
  setWater: jest.fn(() => Promise.resolve()),
  adjustWaterMl: (...a) => mockAdjustWaterMl(...a),
  getWater: (...a) => mockGetWater(...a),
  createSavedMeal: jest.fn(() => Promise.resolve()),
  confirmPlannedDay: jest.fn(() => Promise.resolve(0)),
  clearPlannedDay: jest.fn(() => Promise.resolve()),
  getSlotRecents: (...a) => mockGetSlotRecents(...a),
  logFoodEntry: (...a) => mockLogFoodEntry(...a),
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
jest.mock('../../lib/database', () => ({
  getNutritionTargets: (...a) => mockGetNutritionTargets(...a),
  getOpenEdPatternFlag: (...a) => mockGetOpenEdPatternFlag(...a),
  getLatestBodyWeight: jest.fn(() => Promise.resolve(null)),
  getLatestBodyComposition: jest.fn(() => Promise.resolve(null)),
  getLatestCoachOutput: jest.fn(() => Promise.resolve(null)),
}));

import DiaryScreen from '../DiaryScreen';
import MacroRings from '../../components/food/MacroRings';
import Chip from '../../components/Chip';
import PressableCard from '../../components/PressableCard';
import useAppStore from '../../store/useAppStore';
import { isoDate, shiftDate } from '../../lib/food/diaryDates';
import { colors } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { setMealLabelOverrides } from '../../lib/food/mealSlots';

const TODAY = isoDate(new Date());
const YESTERDAY = shiftDate(TODAY, -1);

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

function dayWith({ today = [], yesterday = [] } = {}) {
  mockGetFoodEntriesForDay.mockImplementation((userId, date) => Promise.resolve(
    date === TODAY ? today : (date === YESTERDAY ? yesterday : []),
  ));
}

const mockParentNavigate = jest.fn();
function makeNav() {
  return {
    navigate: jest.fn(),
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

async function mountDiary(nav = makeNav()) {
  let tree;
  await act(async () => {
    tree = create(<DiaryScreen navigation={nav} route={{ params: {} }} />);
  });
  await flush();
  return tree;
}

// The shallowest node with this label that is pressable.
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

// The visible text of every HOST node carrying accessibilityRole="header".
function instanceText(inst) {
  if (typeof inst === 'string') return inst;
  return (inst.children ?? []).map(instanceText).join('');
}
const headers = (tree) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header',
).map(instanceText);

// Deep style flatten (the RN test mock's own flatten is one level only).
function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return typeof style === 'object' ? style : {};
}

const COLOUR_KEYS = [
  'color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor',
  'borderLeftColor', 'borderRightColor', 'tintColor', 'shadowColor',
];

// Every HOST element drawn in `primary`, skipping the two charts.
function primaryMarks(root, primary) {
  const hits = [];
  const walk = (node) => {
    if (!node || typeof node === 'string') return;
    if (node.type === MacroRings) return; // chart: the calorie ring and the macro bars
    if (node.props?.testID === 'water-fill') return; // chart: the water fill
    if (typeof node.type === 'string') {
      const style = flattenStyle(node.props.style);
      COLOUR_KEYS.forEach((k) => {
        if (style[k] === primary) hits.push(`${node.type}.style.${k}${node.props.name ? ` (${node.props.name})` : ''}`);
      });
      ['color', 'tintColor'].forEach((k) => {
        if (node.props[k] === primary) hits.push(`${node.type}.${k}${node.props.name ? ` (${node.props.name})` : ''}`);
      });
      if (Array.isArray(node.props.colors) && node.props.colors.includes(primary)) hits.push(`${node.type}.colors`);
    }
    (node.children ?? []).forEach(walk);
  };
  walk(root);
  return hits;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setMealLabelOverrides({});
  mockGetFoodEntriesForDay.mockImplementation(() => Promise.resolve([]));
  mockGetSlotRecents.mockImplementation(() => Promise.resolve([]));
  mockGetNutritionTargets.mockResolvedValue(targets);
  mockGetOpenEdPatternFlag.mockResolvedValue(false);
  mockAdjustWaterMl.mockImplementation(() => Promise.resolve(0));
  mockGetWater.mockImplementation(() => Promise.resolve(0));
  mockGetRecentLoggedDays.mockImplementation(() => Promise.resolve([]));
  useAppStore.setState({
    user: { id: 'u1', email: 't@e.com', isLocal: false },
    session: { user: { id: 'u1' } },
    tier: 'pro',
    firstRunComplete: true,
    userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric', sex: 'female' },
  });
});

describe('D230 R1: the workspace is the same on every day', () => {
  const withOatsUsual = () => mockGetSlotRecents.mockImplementation((userId, slotKey) => Promise.resolve(
    slotKey === 'meal_1' ? [{ food_ref: 'global:oats', last_quantity_g: 60, log_count: 9 }] : [],
  ));

  test('an empty day renders the meal cards with their usual chips, and no EmptyDiary card', async () => {
    dayWith({ today: [] });
    withOatsUsual();
    const tree = await mountDiary();
    const text = textOf(tree);
    // The retired card's line and its replacement-of-the-cards are gone.
    expect(text).not.toContain('Nothing logged for this day yet.');
    // The cards are there, each with its own Add food.
    ['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4'].forEach((meal) => {
      expect(byLabel(tree, `Add food to ${meal}`)).toHaveLength(1);
    });
    // The first food of the day is one tap: the usual chip, portion stated.
    expect(text).toContain('Porridge oats · 60 g');
    const chip = byLabel(tree, 'Log Porridge oats, 60 grams');
    expect(chip).toHaveLength(1);
    await act(async () => { await chip[0].props.onPress(); });
    expect(mockLogFoodEntry).toHaveBeenCalledTimes(1);
    expect(mockLogFoodEntry.mock.calls[0][1]).toEqual(expect.objectContaining({
      entryDate: TODAY, mealSlot: 'meal_1', quantityG: 60,
    }));
  });

  test('"Copy yesterday" is a door only on an empty day whose yesterday has food', async () => {
    // Empty day, empty yesterday: no door.
    dayWith({ today: [], yesterday: [] });
    const noYesterday = await mountDiary();
    expect(byLabel(noYesterday, "Copy yesterday's entries")).toHaveLength(0);
    // The meal builder is a door on every day.
    expect(byLabel(noYesterday, 'Open meal builder for this day or week')).toHaveLength(1);

    // Empty day, yesterday has food: the door, and it copies through the
    // same confirm as before.
    dayWith({ today: [], yesterday: [entry({ id: 'y1', entry_date: YESTERDAY }), entry({ id: 'y2', entry_date: YESTERDAY, meal_slot: 'meal_2' })] });
    const withYesterday = await mountDiary();
    const door = byLabel(withYesterday, "Copy yesterday's entries");
    expect(door).toHaveLength(1);
    expect(textOf(withYesterday)).toContain('Copy yesterday');
    await act(async () => { await door[0].props.onPress(); });
    expect(mockAppAlert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = mockAppAlert.mock.calls[0];
    expect(title).toBe('Copy 2 entries from yesterday?');
    await act(async () => { await buttons.find((b) => b.text === 'Copy').onPress(); });
    await flush();
    expect(mockLogFoodEntry).toHaveBeenCalledTimes(2);
    mockLogFoodEntry.mock.calls.forEach(([, payload]) => expect(payload.entryDate).toBe(TODAY));

    // A started day never offers the whole-day door, even with yesterday.
    dayWith({ today: [entry({ id: 't1', meal_slot: 'meal_3' })], yesterday: [entry({ id: 'y1', entry_date: YESTERDAY })] });
    const started = await mountDiary();
    expect(byLabel(started, "Copy yesterday's entries")).toHaveLength(0);
    expect(byLabel(started, 'Open meal builder for this day or week')).toHaveLength(1);
  });

  test('an open ED flag removes the higher-calorie door and nothing else (the gate is unchanged)', async () => {
    dayWith({ today: [], yesterday: [entry({ id: 'y1', entry_date: YESTERDAY })] });
    mockGetOpenEdPatternFlag.mockResolvedValue(true);
    const tree = await mountDiary();
    expect(byLabel(tree, 'Plan a higher-calorie day')).toHaveLength(0);
    expect(byLabel(tree, 'Open meal builder for this day or week')).toHaveLength(1);
    expect(byLabel(tree, "Copy yesterday's entries")).toHaveLength(1);
    expect(byLabel(tree, 'Add food to Meal 1')).toHaveLength(1);
    expect(byLabel(tree, 'Scan barcode')).toHaveLength(1);
  });
});

describe('D230 R16: headings', () => {
  test('every meal name is a header', async () => {
    dayWith({ today: [entry({ id: 't1', meal_slot: 'meal_2' })] });
    const tree = await mountDiary();
    const h = headers(tree);
    ['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4'].forEach((meal) => expect(h).toContain(meal));
  });

  test('the Day tools, Meals and Copy from another day sheet titles are headers', async () => {
    const nav = makeNav();
    const tree = await mountDiary(nav);
    expect(headers(tree)).not.toContain('Day tools');

    await act(async () => { byLabel(tree, 'Open diary tools')[0].props.onPress(); });
    expect(headers(tree)).toContain('Day tools');

    // Meals (R11) opens its own sheet, titled as a header.
    await act(async () => { byLabelStart(tree, 'Meals. ')[0].props.onPress(); });
    await flush();
    expect(headers(tree)).toContain('Meals');
    expect(headers(tree)).toContain('Meal names');

    // Copy from another day, via Day tools again.
    await act(async () => { byLabel(tree, 'Open diary tools')[0].props.onPress(); });
    await act(async () => { await byLabelStart(tree, 'Copy from another day. ')[0].props.onPress(); });
    await flush();
    expect(headers(tree)).toContain('Copy from another day');
  });
});

describe('D230 R11 and R19: Day tools rows', () => {
  test('"Nutrition targets" is the same cross-tab door the no-targets state uses', async () => {
    const nav = makeNav();
    const tree = await mountDiary(nav);
    await act(async () => { byLabel(tree, 'Open diary tools')[0].props.onPress(); });
    await act(async () => { byLabelStart(tree, 'Nutrition targets. ')[0].props.onPress(); });
    expect(mockParentNavigate).toHaveBeenCalledWith('ProfileTab', expect.objectContaining({ screen: 'NutritionTargets' }));
  });

  test('"Add meal" reads "Add another meal"', async () => {
    const tree = await mountDiary();
    expect(textOf(tree)).toContain('Add another meal');
    expect(textOf(tree)).not.toMatch(/^Add meal$/m);
  });
});

describe('D230 R2: one amber on a populated Diary, the scan button', () => {
  test('the count of non-chart elements drawn in primary is one, the scan glyph', async () => {
    // The one-time hint captions are marked seen: their shared "Got it"
    // (HintCaption.js) is outside this lane.
    await AsyncStorage.setItem('@volyume_seen_diary_water_hint', 'true');
    await AsyncStorage.setItem('@volyume_seen_diary_markeaten_hint', 'true');
    dayWith({ today: [entry({ id: 't1', meal_slot: 'meal_1' }), entry({ id: 't2', meal_slot: 'meal_2' })] });
    mockGetWater.mockResolvedValue(1500);
    mockGetSlotRecents.mockImplementation(() => Promise.resolve([
      { food_ref: 'global:oats', last_quantity_g: 60, log_count: 3 },
    ]));
    const tree = await mountDiary();
    // Populated: entries, the doors (banking available), water, and the
    // usual chips on the meals still empty.
    expect(byLabel(tree, 'Plan a higher-calorie day')).toHaveLength(1);
    expect(byLabel(tree, 'Log Porridge oats, 60 grams').length).toBeGreaterThan(0);
    expect(textOf(tree)).toContain('1.5 of 3.0 litres');

    const marks = primaryMarks(tree.root, colors.primary);
    expect(marks).toEqual(['Ionicons.color (barcode-outline)']);
  });
});

describe('D230 R4 and R16: the chips are the house Chip at 48 dp', () => {
  // The suggestion chip (peri-workout slots only) is pinned at the
  // component in MealSection.houseParts.test.js.
  test('the usual and "Yesterday\'s <meal>" chips reach a 48 dp minimum height', async () => {
    dayWith({ today: [], yesterday: [entry({ id: 'y1', entry_date: YESTERDAY, meal_slot: 'meal_2' })] });
    mockGetSlotRecents.mockImplementation((userId, slotKey) => Promise.resolve(
      slotKey === 'meal_1' ? [{ food_ref: 'global:oats', last_quantity_g: 60, log_count: 9 }] : [],
    ));
    const tree = await mountDiary();
    const chips = tree.root.findAllByType(Chip);
    // Oats on Meal 1, "Yesterday's Meal 2" on Meal 2.
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(chips.map((c) => c.props.label)).toEqual(expect.arrayContaining(['Porridge oats · 60 g', "Yesterday's Meal 2"]));
    chips.forEach((c) => {
      const pressable = c.findByType(PressableCard);
      expect(flattenStyle(pressable.props.style).minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
      expect(c.props.accessibilityRole).toBe('button');
    });
    expect(touchTarget.minimum).toBe(48);
  });
});

describe('D230 R14 at the screen: water moves by a delta and shows what the database returns', () => {
  const ADD = 'Add 250 millilitres of water. Hold to add 500.';
  const REMOVE = 'Remove 250 millilitres of water. Hold to remove 500.';

  test('a tap hands adjustWaterMl +250 and the row shows the returned total', async () => {
    mockGetWater.mockResolvedValue(1250);
    mockAdjustWaterMl.mockResolvedValueOnce(1500);
    const tree = await mountDiary();
    expect(textOf(tree)).toContain('1.3 of 3.0 litres');
    await act(async () => { await byLabel(tree, ADD)[0].props.onPress(); });
    await flush();
    expect(mockAdjustWaterMl).toHaveBeenCalledWith('u1', TODAY, 250);
    expect(textOf(tree)).toContain('1.5 of 3.0 litres');
  });

  test('two taps inside one await window are two +250 deltas, never one base written twice', async () => {
    mockGetWater.mockResolvedValue(1000);
    let resolveFirst;
    mockAdjustWaterMl
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockImplementationOnce(() => Promise.resolve(1500));
    const tree = await mountDiary();
    const add = byLabel(tree, ADD)[0];
    // Both taps land while the first write is still in flight, so both read
    // the same render's 1000 ml: the deltas are what reach the database.
    await act(async () => { add.props.onPress(); add.props.onPress(); });
    expect(mockAdjustWaterMl.mock.calls.map((c) => c[2])).toEqual([250, 250]);
    expect(textOf(tree)).toContain('1.5 of 3.0 litres');
    // The older write settling last never paints its older total over it.
    await act(async () => { resolveFirst(1250); });
    await flush();
    expect(textOf(tree)).toContain('1.5 of 3.0 litres');
  });

  test('a hold moves 500 each way, and the value opens the target picker', async () => {
    mockGetWater.mockResolvedValue(1000);
    mockAdjustWaterMl.mockResolvedValueOnce(1500).mockResolvedValueOnce(1000);
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, ADD)[0].props.onLongPress(); });
    await act(async () => { await byLabel(tree, REMOVE)[0].props.onLongPress(); });
    expect(mockAdjustWaterMl.mock.calls.map((c) => c[2])).toEqual([500, -500]);
    await act(async () => { byLabelStart(tree, 'Water 1.0 of 3.0 litres. Change your daily target.')[0].props.onPress(); });
    expect(mockAppAlert).toHaveBeenCalledWith('Daily water target', expect.any(String), expect.any(Array));
  });

  test('a failed write says so in a full sentence and keeps the day as it was', async () => {
    mockGetWater.mockResolvedValue(1000);
    mockAdjustWaterMl.mockRejectedValueOnce(new Error('disk full'));
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, ADD)[0].props.onPress(); });
    await flush();
    expect(mockToastShow).toHaveBeenCalledWith('That water was not saved. Try again in a moment.', { variant: 'error' });
    expect(textOf(tree)).toContain('1.0 of 3.0 litres');
  });
});
