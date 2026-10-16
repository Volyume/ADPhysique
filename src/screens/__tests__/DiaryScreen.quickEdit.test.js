/**
 * DiaryScreen.quickEdit.test.js
 *
 * Wave 4 hostile review of the food level-up (2026-10-16), item 3, DATA LOSS.
 * A quick add (food_ref 'quick:adhoc') and a day imported from MyFitnessPal
 * (food_ref 'quick:import') store 0 g and carry their energy and macros
 * directly. resolveFoodRef finds no food for a 'quick:' ref, so the edit sheet
 * fell back to a stand-in food scaled from 0 g, every per-100 g figure 0; the
 * sheet opened at 100 g and Save wrote kcal 0 over the entry. A note edit
 * erased the calories.
 *
 * What this suite pins, at the mounted screen through the real sheet, each
 * written to fail on the code before the fix:
 *   - editing the note of a quick add writes the entry's own quantity (0),
 *     energy and macros back unchanged, with the new note;
 *   - the same for an imported MyFitnessPal row, moved to another meal;
 *   - the sheet shows no Amount block for either;
 *   - a food entry (a real food behind it) still scales from its amount.
 * Harness copied from DiaryScreen.foodLevelUp.test.js in this directory.
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

const mockUpdateFoodEntry = jest.fn(() => Promise.resolve('2026-10-16'));
const mockGetFoodEntriesForDay = jest.fn(() => Promise.resolve([]));
const mockGetSlotRecents = jest.fn(() => Promise.resolve([]));
const mockLogFoodEntry = jest.fn(() => Promise.resolve('entry-new'));
// D230 R10: the copy paths write through the ONE batched call; it returns the new ids in order.
const mockLogFoodEntries = jest.fn(async (userId, entries) => entries.map((_, i) => `copied-${i + 1}`));
const mockDeleteFoodEntries = jest.fn(() => Promise.resolve(2));
// The copy pre-screens its source rows with the write's own validator; a row of 6000 g stands in for a legacy row that can never be logged.
const mockIsLoggableFoodEntry = jest.fn((payload) => payload.quantityG <= 5000);
const mockAdjustWaterMl = jest.fn(() => Promise.resolve(0));
const mockGetWater = jest.fn(() => Promise.resolve(0));
const mockGetRecentLoggedDays = jest.fn(() => Promise.resolve([]));

jest.mock('../../lib/food/db', () => ({
  getFoodEntriesForDay: (...a) => mockGetFoodEntriesForDay(...a),
  getRecentLoggedDays: (...a) => mockGetRecentLoggedDays(...a),
  deleteFoodEntry: jest.fn(() => Promise.resolve(true)),
  restoreFoodEntry: jest.fn(() => Promise.resolve()),
  updateFoodEntry: (...a) => mockUpdateFoodEntry(...a),
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
  logFoodEntries: (...a) => mockLogFoodEntries(...a),
  deleteFoodEntries: (...a) => mockDeleteFoodEntries(...a),
  isLoggableFoodEntry: (...a) => mockIsLoggableFoodEntry(...a),
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
import useAppStore from '../../store/useAppStore';
import { isoDate } from '../../lib/food/diaryDates';
import { setMealLabelOverrides } from '../../lib/food/mealSlots';

const TODAY = isoDate(new Date());

const targets = {
  id: 'nt1', userId: 'u1', bmr: 1700, tdee: 2600, targetKcal: 2600,
  proteinG: 180, carbsG: 300, fatG: 80, phase: 'maintain',
  floorApplied: false, warnings: [],
};

const quickAdd = {
  id: 'q1', user_id: 'u1', entry_date: TODAY, meal_slot: 'meal_2',
  food_ref: 'quick:adhoc', quantity_g: 0, kcal: 350, protein_g: 10,
  carbs_g: 40, fat_g: 12, fibre_g: null, is_planned: 0, weight_state: 'as_weighed',
  note: 'Curry at Raj\'s',
};
const imported = {
  id: 'm1', user_id: 'u1', entry_date: TODAY, meal_slot: 'meal_1',
  food_ref: 'quick:import', quantity_g: 0, kcal: 512, protein_g: 21.5,
  carbs_g: 60, fat_g: 18, fibre_g: 4, is_planned: 0, weight_state: 'as_weighed',
  note: 'Breakfast, from MyFitnessPal',
};
const oats = {
  id: 'e1', user_id: 'u1', entry_date: TODAY, meal_slot: 'meal_1',
  food_ref: 'global:oats', quantity_g: 60, kcal: 227, protein_g: 8,
  carbs_g: 36, fat_g: 5, fibre_g: 6, is_planned: 0, weight_state: 'as_weighed',
};

function makeNav() {
  return {
    navigate: jest.fn(),
    setParams: jest.fn(),
    getParent: () => ({ navigate: jest.fn(), addListener: () => () => {} }),
  };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 15; i++) await Promise.resolve();
  });
}

async function mountDiary(rows) {
  mockGetFoodEntriesForDay.mockImplementation((userId, date) => Promise.resolve(date === TODAY ? rows : []));
  let tree;
  await act(async () => {
    tree = create(<DiaryScreen navigation={makeNav()} route={{ params: {} }} />);
  });
  await flush();
  return tree;
}

const pressable = (tree, pred) => tree.root.findAll(
  (n) => typeof n.props?.accessibilityLabel === 'string' && pred(n.props.accessibilityLabel)
    && typeof n.props?.onPress === 'function',
  { deep: false },
);

async function openRow(tree, name) {
  const row = pressable(tree, (l) => l.startsWith(`${name}, `) && l.endsWith('Tap to edit.'))[0];
  expect(row).toBeTruthy();
  await act(async () => { row.props.onPress(); });
  await flush();
}

async function typeNote(tree, text) {
  const field = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Note, optional' && typeof n.props?.onChangeText === 'function')[0];
  expect(field).toBeTruthy();
  await act(async () => { field.props.onChangeText(text); });
}

async function save(tree) {
  const btn = pressable(tree, (l) => l === 'Save changes')[0];
  expect(btn).toBeTruthy();
  await act(async () => { await btn.props.onPress(); });
  await flush();
}

const byTestId = (tree, id) => tree.root.findAll((n) => n.props?.testID === id);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setMealLabelOverrides({});
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

describe('Wave 4 review item 3: editing an entry with no food behind it keeps its figures', () => {
  test('a quick add: a note edit writes 0 g, 350 kcal and its macros back, with the new note', async () => {
    const tree = await mountDiary([quickAdd]);
    await openRow(tree, 'Curry at Raj\'s');
    expect(byTestId(tree, 'food-sheet-amount')).toHaveLength(0);
    await typeNote(tree, 'Curry at Raj\'s, a big one');
    await save(tree);
    expect(mockUpdateFoodEntry).toHaveBeenCalledTimes(1);
    const [id, userId, patch] = mockUpdateFoodEntry.mock.calls[0];
    expect(id).toBe('q1');
    expect(userId).toBe('u1');
    expect(patch).toEqual(expect.objectContaining({
      foodRef: 'quick:adhoc', quantityG: 0, kcal: 350, proteinG: 10, carbsG: 40, fatG: 12, fibreG: null,
      mealSlot: 'meal_2', note: 'Curry at Raj\'s, a big one',
    }));
  });

  test('an imported MyFitnessPal row: moved to another meal, its 512 kcal and macros stay', async () => {
    const tree = await mountDiary([imported]);
    await openRow(tree, 'Breakfast, from MyFitnessPal');
    expect(byTestId(tree, 'food-sheet-amount')).toHaveLength(0);
    const chip = pressable(tree, (l) => l.startsWith('Meal: ') && l !== 'Meal: Meal 1' && l !== 'Meal: Breakfast')[0];
    expect(chip).toBeTruthy();
    await act(async () => { chip.props.onPress(); });
    await typeNote(tree, 'Breakfast at the hotel');
    await save(tree);
    const patch = mockUpdateFoodEntry.mock.calls[0][2];
    expect(patch).toEqual(expect.objectContaining({
      foodRef: 'quick:import', quantityG: 0, kcal: 512, proteinG: 21.5, carbsG: 60, fatG: 18, fibreG: 4,
      note: 'Breakfast at the hotel',
    }));
    expect(patch.mealSlot).not.toBe('meal_1');
  });

  test('a food entry still scales from its amount (unchanged)', async () => {
    const tree = await mountDiary([oats]);
    await openRow(tree, 'Porridge oats');
    expect(byTestId(tree, 'food-sheet-amount').length).toBeGreaterThan(0);
    await save(tree);
    const patch = mockUpdateFoodEntry.mock.calls[0][2];
    expect(patch).toEqual(expect.objectContaining({ foodRef: 'global:oats', quantityG: 60, kcal: 227 }));
  });
});
