/**
 * DiaryScreen.audit20261016.test.js
 *
 * The food Diary audit of 2026-10-16 (lead's brief), at the mounted screen.
 * Each test was written to fail on the code before its fix:
 *   1   DATA: editing an old entry re-priced it at the food's CURRENT
 *       figures. A custom food's energy is edited, then only an old entry's
 *       meal or note is changed: its energy is unchanged. A changed amount
 *       scales from the ENTRY's own per-100 g figures, not the food's.
 *   4   An Undo pressed elsewhere (after the add screen closed) left deleted
 *       rows on the Diary: a change-feed event for the day in view reloads
 *       it (debounced; another day's event does not; unsubscribed on
 *       unmount).
 *   6   Bulk delete, its Undo, and bulk move fail with a logged cause and a
 *       calm sentence; a move shows "Moved 2 foods to Lunch." with an Undo
 *       that puts each row back in its own meal.
 *   7   The edit sheet's meal chips are the Diary's own meals.
 *   10  An empty day shows the one-tap chips for a person whose history is
 *       in the old meal names (Breakfast to Meal 1, and so on).
 *   11  A future day does not show "Tick meals off..." (nothing can be
 *       ticked yet).
 *   12  A day named by its date shows the date once.
 *   14  The unreachable quick-add sheet and saved-meals chooser are gone.
 * Harness copied from DiaryScreen.quickEdit.test.js in this directory.
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

const mockLogError = jest.fn();
jest.mock('../../lib/errorLog', () => ({
  logError: (...a) => mockLogError(...a),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

const mockUpdateFoodEntry = jest.fn(() => Promise.resolve('2026-10-16'));
const mockUpdateFoodEntries = jest.fn(() => Promise.resolve());
const mockGetFoodEntriesForDay = jest.fn(() => Promise.resolve([]));
const mockGetSlotRecents = jest.fn(() => Promise.resolve([]));
const mockDeleteFoodEntries = jest.fn(() => Promise.resolve(2));
const mockRestoreFoodEntries = jest.fn(() => Promise.resolve());
const mockLogFoodEntries = jest.fn(async (userId, entries) => entries.map((_, i) => `copied-${i + 1}`));
// The food lane's change feed: subscribeDiaryChanges(fn) -> unsubscribe.
const mockFeed = { listeners: new Set() };
const mockUnsubscribe = jest.fn();
const mockSubscribeDiaryChanges = jest.fn((fn) => {
  mockFeed.listeners.add(fn);
  return () => { mockUnsubscribe(); mockFeed.listeners.delete(fn); };
});

jest.mock('../../lib/food/db', () => ({
  getFoodEntriesForDay: (...a) => mockGetFoodEntriesForDay(...a),
  getRecentLoggedDays: jest.fn(() => Promise.resolve([])),
  deleteFoodEntry: jest.fn(() => Promise.resolve(true)),
  restoreFoodEntry: jest.fn(() => Promise.resolve()),
  updateFoodEntry: (...a) => mockUpdateFoodEntry(...a),
  updateFoodEntries: (...a) => mockUpdateFoodEntries(...a),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  applyCuratedMealToDiary: jest.fn(() => Promise.resolve()),
  adjustWaterMl: jest.fn(() => Promise.resolve(0)),
  getWater: jest.fn(() => Promise.resolve(0)),
  createSavedMeal: jest.fn(() => Promise.resolve()),
  confirmPlannedDay: jest.fn(() => Promise.resolve(0)),
  clearPlannedDay: jest.fn(() => Promise.resolve()),
  getSlotRecents: (...a) => mockGetSlotRecents(...a),
  logFoodEntry: jest.fn(() => Promise.resolve('entry-new')),
  logFoodEntries: (...a) => mockLogFoodEntries(...a),
  deleteFoodEntries: (...a) => mockDeleteFoodEntries(...a),
  restoreFoodEntries: (...a) => mockRestoreFoodEntries(...a),
  isLoggableFoodEntry: jest.fn(() => true),
  upsertSlotRecent: jest.fn(() => Promise.resolve()),
  subscribeDiaryChanges: (...a) => mockSubscribeDiaryChanges(...a),
}));

// The custom loaf as it is NOW: its energy was edited from 255 to 400 per
// 100 g after the old entry below was logged.
const LOAF_NOW = {
  food_ref: 'custom:loaf', source: 'custom', name: 'Seeded loaf', brand: 'Home baked',
  serving_g: 40, serving_label: '1 slice', portions_json: null,
  kcal_100g: 400, protein_100g: 20, carbs_100g: 50, fat_100g: 10, fibre_100g: 8,
};
const OATS = {
  food_ref: 'global:oats', source: 'off', name: 'Porridge oats', brand: null,
  serving_g: null, serving_label: null,
  kcal_100g: 379, protein_100g: 13, carbs_100g: 60, fat_100g: 8, fibre_100g: 10,
};
const mockFoods = { 'custom:loaf': LOAF_NOW, 'global:oats': OATS };
jest.mock('../../lib/food/sources/localCache', () => ({
  resolveFoodRef: jest.fn((userId, ref) => Promise.resolve(mockFoods[ref] ?? null)),
  resolveFoodRefs: jest.fn(async (userId, refs) => {
    const map = new Map();
    (refs ?? []).forEach((ref) => { if (mockFoods[ref]) map.set(ref, mockFoods[ref]); });
    return map;
  }),
}));

const mockGetNutritionTargets = jest.fn(() => Promise.resolve(null));
jest.mock('../../lib/database', () => ({
  getNutritionTargets: (...a) => mockGetNutritionTargets(...a),
  getOpenEdPatternFlag: jest.fn(() => Promise.resolve(false)),
  getLatestBodyWeight: jest.fn(() => Promise.resolve(null)),
  getLatestBodyComposition: jest.fn(() => Promise.resolve(null)),
  getLatestCoachOutput: jest.fn(() => Promise.resolve(null)),
}));

import DiaryScreen, { currentSlotForLegacy, editFoodFromEntry, DIARY_CHANGE_DEBOUNCE_MS } from '../DiaryScreen';
import useAppStore from '../../store/useAppStore';
import { isoDate, shiftDate } from '../../lib/food/diaryDates';
import { setMealLabelOverrides } from '../../lib/food/mealSlots';

const TODAY = isoDate(new Date());
const YESTERDAY = shiftDate(TODAY, -1);

const targets = {
  id: 'nt1', userId: 'u1', bmr: 1700, tdee: 2600, targetKcal: 2600,
  proteinG: 180, carbsG: 300, fatG: 80, phase: 'maintain', floorApplied: false, warnings: [],
};

// Logged weeks ago at the loaf's old figures: 65 g at 255 kcal per 100 g.
const oldLoaf = {
  id: 'l1', user_id: 'u1', entry_date: TODAY, meal_slot: 'meal_1',
  food_ref: 'custom:loaf', quantity_g: 65, kcal: 166, protein_g: 6.2,
  carbs_g: 27.3, fat_g: 3.4, fibre_g: 4, is_planned: 0, weight_state: 'as_weighed',
};
const oats = (over = {}) => ({
  id: 'o1', user_id: 'u1', entry_date: TODAY, meal_slot: 'meal_1',
  food_ref: 'global:oats', quantity_g: 60, kcal: 227, protein_g: 8,
  carbs_g: 36, fat_g: 5, fibre_g: 6, is_planned: 0, weight_state: 'as_weighed', ...over,
});

function makeNav() {
  return { navigate: jest.fn(), setParams: jest.fn(), getParent: () => ({ navigate: jest.fn(), addListener: () => () => {} }) };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 15; i++) await Promise.resolve();
  });
}

let mockRows = {};
async function mountDiary(rows, { date = TODAY } = {}) {
  mockRows = rows;
  mockGetFoodEntriesForDay.mockImplementation((userId, d) => Promise.resolve(mockRows[d] ?? []));
  let tree;
  await act(async () => {
    tree = create(<DiaryScreen navigation={makeNav()} route={{ params: { date } }} />);
  });
  await flush();
  return tree;
}

const pressable = (tree, pred) => tree.root.findAll(
  (n) => typeof n.props?.accessibilityLabel === 'string' && pred(n.props.accessibilityLabel)
    && typeof n.props?.onPress === 'function',
  { deep: false },
);
function collectText(node, out = []) {
  if (node == null) return out;
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach((c) => collectText(c, out)); return out; }
  (node.children || []).forEach((c) => collectText(c, out));
  return out;
}
const textOf = (tree) => collectText(tree.toJSON()).join('\n');

async function openRow(tree, name) {
  const row = pressable(tree, (l) => l.startsWith(`${name}, `) && l.endsWith('Tap to edit.'))[0];
  expect(row).toBeTruthy();
  await act(async () => { row.props.onPress(); });
  await flush();
}
async function press(tree, label) {
  const btn = pressable(tree, (l) => l === label)[0];
  expect(btn).toBeTruthy();
  await act(async () => { await btn.props.onPress(); });
  await flush();
}
async function typeNote(tree, text) {
  const field = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Note, optional' && typeof n.props?.onChangeText === 'function')[0];
  await act(async () => { field.props.onChangeText(text); });
}
async function typeAmount(tree, text) {
  const field = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.startsWith('Amount in') && typeof n.props?.onChangeText === 'function')[0];
  expect(field).toBeTruthy();
  await act(async () => { field.props.onChangeText(text); });
}
async function longPressRow(tree, name) {
  const row = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.startsWith(`${name}, `) && typeof n.props?.onLongPress === 'function', { deep: false })[0];
  await act(async () => { row.props.onLongPress(); });
  await flush();
}
const lastToast = () => mockToastShow.mock.calls[mockToastShow.mock.calls.length - 1];

beforeEach(async () => {
  jest.clearAllMocks();
  mockFeed.listeners.clear();
  await AsyncStorage.clear();
  setMealLabelOverrides({});
  mockGetSlotRecents.mockImplementation(() => Promise.resolve([]));
  mockGetNutritionTargets.mockResolvedValue(targets);
  mockDeleteFoodEntries.mockImplementation(() => Promise.resolve(2));
  mockRestoreFoodEntries.mockImplementation(() => Promise.resolve());
  mockUpdateFoodEntries.mockImplementation(() => Promise.resolve());
  useAppStore.setState({
    user: { id: 'u1', email: 't@e.com', isLocal: false },
    session: { user: { id: 'u1' } },
    tier: 'pro',
    firstRunComplete: true,
    userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric', sex: 'female' },
  });
});

describe('item 1: an edit works from the entry\'s own figures', () => {
  test('the food\'s energy was edited; a note-only edit writes the entry\'s 166 kcal back', async () => {
    const tree = await mountDiary({ [TODAY]: [oldLoaf] });
    await openRow(tree, 'Seeded loaf');
    await typeNote(tree, 'Toasted');
    await press(tree, 'Save changes');
    const patch = mockUpdateFoodEntry.mock.calls[0][2];
    expect(patch).toEqual(expect.objectContaining({
      quantityG: 65, kcal: 166, proteinG: 6.2, carbsG: 27.3, fatG: 3.4, fibreG: 4, note: 'Toasted',
    }));
  });

  test('a meal-only edit keeps the figures too', async () => {
    const tree = await mountDiary({ [TODAY]: [oldLoaf] });
    await openRow(tree, 'Seeded loaf');
    const chip = pressable(tree, (l) => l === 'Meal: Meal 2')[0];
    await act(async () => { chip.props.onPress(); });
    await press(tree, 'Save changes');
    const patch = mockUpdateFoodEntry.mock.calls[0][2];
    expect(patch).toEqual(expect.objectContaining({ mealSlot: 'meal_2', quantityG: 65, kcal: 166 }));
  });

  test('the sheet shows the entry\'s figures, and a new amount scales from them', async () => {
    const tree = await mountDiary({ [TODAY]: [oldLoaf] });
    await openRow(tree, 'Seeded loaf');
    const summary = tree.root.findAll((n) => n.props?.testID === 'food-sheet-summary' && typeof n.props?.accessibilityLabel === 'string')[0];
    expect(summary.props.accessibilityLabel).toMatch(/^166 calories/);
    // The sheet opens in grams (65 g is not a whole slice of 40 g).
    await typeAmount(tree, '130');
    await press(tree, 'Save changes');
    const patch = mockUpdateFoodEntry.mock.calls[0][2];
    // Twice the entry: 332 kcal, never 130 g at today's 400 per 100 g (520).
    expect(patch).toEqual(expect.objectContaining({ quantityG: 130, kcal: 332, proteinG: 12.4 }));
  });

  test('editFoodFromEntry takes the name and units from the food and the figures from the entry', () => {
    const f = editFoodFromEntry(oldLoaf, LOAF_NOW);
    expect(f.name).toBe('Seeded loaf');
    expect(f.serving_g).toBe(40);
    expect(f.kcal_100g).toBeCloseTo(255.38, 1);
    expect(f.fibre_100g).toBeCloseTo(6.15, 1);
    const noFood = editFoodFromEntry({ ...oldLoaf, fibre_g: null, _name: 'Old loaf' }, null);
    expect(noFood.name).toBe('Old loaf');
    expect(noFood.fibre_100g).toBeNull();
  });
});

describe('item 4: a change made elsewhere reaches the Diary', () => {
  const emit = (event) => act(async () => { mockFeed.listeners.forEach((fn) => fn(event)); });
  const todayReads = () => mockGetFoodEntriesForDay.mock.calls.filter(([, d]) => d === TODAY).length;

  test('an event for the day in view reloads it once (debounced) and the deleted row goes', async () => {
    const tree = await mountDiary({ [TODAY]: [oats()] });
    expect(mockSubscribeDiaryChanges).toHaveBeenCalledTimes(1);
    expect(textOf(tree)).toContain('Porridge oats');
    const before = todayReads();
    mockRows = { [TODAY]: [] }; // the add screen's Undo removed it
    await emit({ userId: 'u1', dates: [TODAY] });
    await emit({ userId: 'u1', dates: [TODAY] });
    await act(async () => { await new Promise((r) => setTimeout(r, DIARY_CHANGE_DEBOUNCE_MS + 30)); });
    await flush();
    expect(todayReads() - before).toBe(1);
    expect(textOf(tree)).not.toContain('Porridge oats');
  });

  test('another day\'s event, or another person\'s, does not reload', async () => {
    await mountDiary({ [TODAY]: [oats()] });
    const before = todayReads();
    await emit({ userId: 'u1', dates: [shiftDate(TODAY, -5)] });
    await emit({ userId: 'someone-else', dates: [TODAY] });
    await act(async () => { await new Promise((r) => setTimeout(r, DIARY_CHANGE_DEBOUNCE_MS + 30)); });
    expect(todayReads() - before).toBe(0);
  });

  test('unsubscribed on unmount', async () => {
    const tree = await mountDiary({ [TODAY]: [] });
    await act(async () => { tree.unmount(); });
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('item 6: bulk delete and move say what happened', () => {
  const two = { [TODAY]: [oats({ id: 'a' }), oats({ id: 'b', food_ref: 'custom:loaf', quantity_g: 65, kcal: 166 })] };
  async function selectBoth(tree) {
    await longPressRow(tree, 'Porridge oats');
    const loaf = pressable(tree, (l) => l.startsWith('Seeded loaf, ') && l.endsWith('Tap to toggle.'))[0];
    await act(async () => { loaf.props.onPress(); });
    await flush();
  }

  test('a failed bulk delete is logged (no food, no amount) and said; the selection stays', async () => {
    mockDeleteFoodEntries.mockImplementation(() => Promise.reject(new Error('disk')));
    const tree = await mountDiary(two);
    await selectBoth(tree);
    await press(tree, 'Delete selected');
    expect(mockLogError).toHaveBeenCalledWith('DiaryScreen.deleteSelected', expect.any(Error), { count: 2 });
    expect(lastToast()).toEqual(['Those entries were not deleted. Try again in a moment.', { variant: 'error' }]);
    expect(collectText(tree.toJSON()).join('')).toContain('2 selected');
  });

  test('a failed Undo of a bulk delete is said', async () => {
    mockRestoreFoodEntries.mockImplementation(() => Promise.reject(new Error('disk')));
    const tree = await mountDiary(two);
    await selectBoth(tree);
    await press(tree, 'Delete selected');
    const undo = mockToastShow.mock.calls.find(([m]) => m === '2 entries deleted.')[1].action.onPress;
    await act(async () => { await undo(); });
    expect(mockLogError).toHaveBeenCalledWith('DiaryScreen.undoDeleteSelected', expect.any(Error), { count: 2 });
    expect(lastToast()).toEqual(['Those entries were not brought back. Try again in a moment.', { variant: 'error' }]);
  });

  test('a move says "Moved 2 foods to Meal 2." and its Undo puts each row back', async () => {
    const tree = await mountDiary(two);
    await selectBoth(tree);
    await press(tree, 'Move to another meal');
    await press(tree, 'Move to Meal 2');
    expect(mockUpdateFoodEntries).toHaveBeenCalledTimes(1);
    const [msg, opts] = lastToast();
    expect(msg).toBe('Moved 2 foods to Meal 2.');
    expect(opts).toEqual(expect.objectContaining({ variant: 'undo', action: expect.objectContaining({ label: 'Undo' }) }));
    await act(async () => { await opts.action.onPress(); });
    const back = mockUpdateFoodEntries.mock.calls[1][1];
    expect(back.map((u) => [u.id, u.patch.mealSlot])).toEqual([['a', 'meal_1'], ['b', 'meal_1']]);
  });

  test('a failed move is logged and said', async () => {
    mockUpdateFoodEntries.mockImplementation(() => Promise.reject(new Error('disk')));
    const tree = await mountDiary(two);
    await selectBoth(tree);
    await press(tree, 'Move to another meal');
    await press(tree, 'Move to Meal 2');
    expect(mockLogError).toHaveBeenCalledWith('DiaryScreen.moveSelected', expect.any(Error), { count: 2, mealSlot: 'meal_2' });
    expect(lastToast()).toEqual(['Those entries were not moved. Try again in a moment.', { variant: 'error' }]);
  });
});

describe('item 7: the edit sheet\'s meal chips are the Diary\'s meals', () => {
  test('five meals per day: five chips, and the entry\'s old meal name kept', async () => {
    await AsyncStorage.setItem('@volyume_meals_per_day', '5');
    const tree = await mountDiary({ [TODAY]: [oats({ meal_slot: 'breakfast' })] });
    await openRow(tree, 'Porridge oats');
    const chips = [...new Set(pressable(tree, (l) => l.startsWith('Meal: ')).map((n) => n.props.accessibilityLabel))];
    expect(chips).toEqual(['Meal: Breakfast', 'Meal: Meal 1', 'Meal: Meal 2', 'Meal: Meal 3', 'Meal: Meal 4', 'Meal: Meal 5']);
  });
});

describe('item 10: an empty day keeps its one-tap chips for history in the old meal names', () => {
  test('Breakfast recents and yesterday\'s Breakfast are offered on Meal 1', async () => {
    mockGetSlotRecents.mockImplementation((userId, slot) => Promise.resolve(
      slot === 'breakfast' ? [{ food_ref: 'global:oats', last_quantity_g: 60, log_count: 9 }] : [],
    ));
    const tree = await mountDiary({ [TODAY]: [], [YESTERDAY]: [oats({ id: 'y1', entry_date: YESTERDAY, meal_slot: 'breakfast' })] });
    expect(textOf(tree)).toContain('Porridge oats · 60 g');
    expect(pressable(tree, (l) => l === 'Log Porridge oats, 60 grams').length).toBeGreaterThan(0);
    const copy = pressable(tree, (l) => l.startsWith("Yesterday's Meal 1, copy 1 entry into Meal 1"))[0];
    expect(copy).toBeTruthy();
    await act(async () => { await copy.props.onPress(); });
    await flush();
    const written = mockLogFoodEntries.mock.calls[0][1];
    expect(written).toHaveLength(1);
    expect(written[0]).toEqual(expect.objectContaining({ mealSlot: 'meal_1', entryDate: TODAY, foodRef: 'global:oats' }));
  });

  test('an old meal with its own card today keeps its recents to itself', async () => {
    mockGetSlotRecents.mockImplementation((userId, slot) => Promise.resolve(
      slot === 'breakfast' ? [{ food_ref: 'global:oats', last_quantity_g: 60, log_count: 9 }] : [],
    ));
    const tree = await mountDiary({ [TODAY]: [oats({ id: 'b1', meal_slot: 'breakfast', food_ref: 'custom:loaf', quantity_g: 65, kcal: 166 })] });
    expect(textOf(tree)).toContain('Breakfast');
    expect(textOf(tree)).not.toContain('Porridge oats · 60 g');
  });

  test('the mapping follows the person\'s meals: Snacks is the fourth meal, never past the last', () => {
    expect(currentSlotForLegacy('breakfast', 4)).toBe('meal_1');
    expect(currentSlotForLegacy('lunch', 4)).toBe('meal_2');
    expect(currentSlotForLegacy('dinner', 4)).toBe('meal_3');
    expect(currentSlotForLegacy('snack', 4)).toBe('meal_4');
    expect(currentSlotForLegacy('snack', 3)).toBe('meal_3');
    expect(currentSlotForLegacy('preworkout', 4)).toBe('preworkout');
    expect(currentSlotForLegacy('meal_2', 4)).toBe('meal_2');
  });
});

// RE-POINTED (D231, app layout rework batch 3): the "Tick meals off..." hint
// caption is retired; what item 11 protects (nothing on a future day can be
// ticked off yet, so "mark eaten" is not offered there) now lives on the one
// planned-meals line: "Mark all eaten" is absent on a future day and present
// on today. The line's wording and the single-meal case are pinned in
// DiaryScreen.batch3Nutrition.test.js.
describe('item 11: a future day', () => {
  test('does not offer "Mark all eaten" and its planned rows read as planned', async () => {
    const tomorrow = shiftDate(TODAY, 1);
    const tree = await mountDiary({ [tomorrow]: [oats({ entry_date: tomorrow, is_planned: 1 })] }, { date: tomorrow });
    const text = textOf(tree);
    expect(text).not.toContain('Tick meals off');
    expect(text).not.toContain('Mark all eaten');
    expect(text).toContain('Planned');
  });

  test('today offers "Mark all eaten" with planned food', async () => {
    const tree = await mountDiary({ [TODAY]: [oats({ is_planned: 1 })] });
    expect(textOf(tree)).toContain('Mark all eaten');
  });
});

describe('item 12: a day named by its date shows it once', () => {
  test('four days ago: the date once; yesterday: "Yesterday" over its date', async () => {
    const past = shiftDate(TODAY, -4);
    const tree = await mountDiary({}, { date: past });
    const btn = pressable(tree, (l) => l.endsWith('Jump to a date'))[0];
    const shown = collectText(tree.toJSON()).filter((t) => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d/.test(t));
    expect(shown).toHaveLength(1);
    expect(btn.props.accessibilityLabel).toBe(`${shown[0]}. Jump to a date`);
    const y = await mountDiary({}, { date: YESTERDAY });
    expect(textOf(y)).toContain('Yesterday');
    expect(collectText(y.toJSON()).filter((t) => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d/.test(t))).toHaveLength(1);
  });
});
