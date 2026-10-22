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
 *  3. DAY TOOLS. Meal builder / Higher-calorie day / Trends. RE-ANCHORED
 *     2026-09-22/23 (founder order): no longer a chip row -- Meal builder
 *     and Higher-calorie day are FeatureRow doors under the log, Trends is
 *     a header action -- with the banking row still behind the untouched
 *     bankingAvailable ED gate (DiaryScreen.bankingAvailable.test.js owns
 *     that gate's exhaustive on/off cases; this file adds one toggle case
 *     of its own alongside the mounted "present" coverage below).
 *  4. NO TARGETS. A user with no nutrition targets is given the way out.
 *  5. LOAD COST. Yesterday is read only when this day can actually use it.
 *  6. BATCHED RESOLUTION. The day's entries and the usual chips each resolve
 *     their food refs in ONE call, not one call per row.
 *
 * Harness conventions (native mocks, whole-module DB mocks, focus-effect
 * shim) are taken from DiaryScreen.bankingAvailable.test.js in this
 * directory; see its header for why a mount test needs them.
 *
 * RE-POINTED (D230 R1, food level-up 2026-10-16): the workspace is the same
 * on every day. EmptyDiary is retired, so the usual chips and the
 * "Yesterday's <meal>" chip render on an EMPTY day too: the chip cases below
 * now seed an empty day (they used to seed one entry in another meal only
 * because an empty day hid the cards). Every expectation is unchanged.
 *
 * RE-POINTED (D230 R9/R10, food level-up lane 3A): the per-meal copy now
 * writes through ONE batched logFoodEntries call (it was one logFoodEntry
 * per row), and its Undo removes every copied row through ONE batched
 * deleteFoodEntries call. The truths are unchanged: only that meal, only
 * real intake, every copied row removed by Undo. The "To today" cases at the
 * end of the per-meal block are new: the action is no longer silent.
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
// D230 R10: every copy path writes through the ONE batched call and its Undo
// removes the new rows through the ONE batched delete.
const mockLogFoodEntries = jest.fn(async (userId, entries) => entries.map((_, i) => `copy-${i + 1}`));
const mockDeleteFoodEntries = jest.fn(() => Promise.resolve(1));
// The copy pre-screens its source rows with the write's own validator; a row of 6000 g stands in for a legacy row that can never be logged.
const mockIsLoggableFoodEntry = jest.fn((payload) => payload.quantityG <= 5000);

jest.mock('../../lib/food/db', () => ({
  getFoodEntriesForDay: (...a) => mockGetFoodEntriesForDay(...a),
  getRecentLoggedDays: jest.fn(() => Promise.resolve([])),
  deleteFoodEntry: (...a) => mockDeleteFoodEntry(...a),
  restoreFoodEntry: jest.fn(() => Promise.resolve()),
  updateFoodEntry: jest.fn(() => Promise.resolve()),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  applyCuratedMealToDiary: jest.fn(() => Promise.resolve()),
  setWater: jest.fn(() => Promise.resolve()),
  adjustWaterMl: jest.fn(() => Promise.resolve(0)),
  getWater: jest.fn(() => Promise.resolve(0)),
  createSavedMeal: jest.fn(() => Promise.resolve()),
  confirmPlannedDay: jest.fn(() => Promise.resolve(0)),
  clearPlannedDay: jest.fn(() => Promise.resolve()),
  getSlotRecents: (...a) => mockGetSlotRecents(...a),
  logFoodEntry: (...a) => mockLogFoodEntry(...a),
  logFoodEntries: (...a) => mockLogFoodEntries(...a),
  deleteFoodEntries: (...a) => mockDeleteFoodEntries(...a),
  isLoggableFoodEntry: (...a) => mockIsLoggableFoodEntry(...a),
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

// D230 R1 (RE-POINTED): the meal cards, and so the usual / copy chips,
// render on every day, an entirely empty one included; EmptyDiary no longer
// replaces them. So the chip cases seed an EMPTY day (meal_1 is empty either
// way). `startedDay` stays for the cases that need a day with an entry (one
// in meal_3), such as the door list on a started day.
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
    dayWith({ today: [] });
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
    dayWith({ today: [] });
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
  const withYesterday = (rows) => dayWith({ today: [], yesterday: rows });

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
    // One batched write of the two meal_1 rows; meal_2's row is left alone.
    expect(mockLogFoodEntry).not.toHaveBeenCalled();
    expect(mockLogFoodEntries).toHaveBeenCalledTimes(1);
    const [userId, payloads] = mockLogFoodEntries.mock.calls[0];
    expect(userId).toBe('u1');
    expect(payloads).toHaveLength(2);
    payloads.forEach((payload) => {
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
    // Only the eaten row is written; the planned row never reaches the write.
    expect(mockLogFoodEntries).toHaveBeenCalledTimes(1);
    const [, payloads] = mockLogFoodEntries.mock.calls[0];
    expect(payloads).toHaveLength(1);
  });

  test('undo removes every copied row, not just the first', async () => {
    withYesterday([entry({ id: 'y1' }), entry({ id: 'y2' })]);
    mockLogFoodEntries.mockResolvedValueOnce(['copy-1', 'copy-2']);
    const tree = await mountDiary();
    await act(async () => {
      await byLabel(tree, "Yesterday's Meal 1, copy 2 entries into Meal 1")[0].props.onPress();
    });
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('Meal 1 copied from yesterday, 2 entries.');
    expect(options.variant).toBe('undo');
    await act(async () => { await options.action.onPress(); });
    // Every copied row, in one call (not one delete per row).
    expect(mockDeleteFoodEntries).toHaveBeenCalledTimes(1);
    expect(mockDeleteFoodEntries).toHaveBeenCalledWith('u1', ['copy-1', 'copy-2']);
    expect(mockDeleteFoodEntry).not.toHaveBeenCalled();
  });

  // Lead ruling (D33): a source row that can never be logged is left out, the
  // rest land together, and the toast says how many could not be copied. When
  // every row is unloggable, "try again" would be a dead end, so it is not said.
  test('one unloggable row: the others are copied, the toast adds "1 could not be copied.", Undo removes only the written ids', async () => {
    withYesterday([
      entry({ id: 'y1' }),
      entry({ id: 'y2', food_ref: 'global:legacy', quantity_g: 6000 }),
      entry({ id: 'y3' }),
    ]);
    mockLogFoodEntries.mockResolvedValueOnce(['copy-1', 'copy-2']);
    const tree = await mountDiary();
    await act(async () => {
      await byLabel(tree, "Yesterday's Meal 1, copy 3 entries into Meal 1")[0].props.onPress();
    });
    const [, payloads] = mockLogFoodEntries.mock.calls[0];
    expect(payloads).toHaveLength(2);
    expect(payloads.some((p) => p.foodRef === 'global:legacy')).toBe(false);
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('Meal 1 copied from yesterday, 2 entries. 1 could not be copied.');
    expect(options.variant).toBe('undo');
    await act(async () => { await options.action.onPress(); });
    expect(mockDeleteFoodEntries).toHaveBeenCalledTimes(1);
    expect(mockDeleteFoodEntries).toHaveBeenCalledWith('u1', ['copy-1', 'copy-2']);
  });

  test('two unloggable rows read "2 could not be copied." (never "entry" for the count)', async () => {
    withYesterday([
      entry({ id: 'y1' }),
      entry({ id: 'y2', quantity_g: 6000 }),
      entry({ id: 'y3', quantity_g: 6000 }),
    ]);
    mockLogFoodEntries.mockResolvedValueOnce(['copy-1']);
    const tree = await mountDiary();
    await act(async () => {
      await byLabel(tree, "Yesterday's Meal 1, copy 3 entries into Meal 1")[0].props.onPress();
    });
    expect(mockToastShow.mock.calls.at(-1)[0]).toBe('Meal 1 copied from yesterday, 1 entry. 2 could not be copied.');
  });

  test('every row unloggable: "Those entries could not be copied." as an error, no Undo, no "try again", nothing written', async () => {
    withYesterday([entry({ id: 'y1', quantity_g: 6000 }), entry({ id: 'y2', quantity_g: 6000 })]);
    const tree = await mountDiary();
    await act(async () => {
      await byLabel(tree, "Yesterday's Meal 1, copy 2 entries into Meal 1")[0].props.onPress();
    });
    expect(mockLogFoodEntries).not.toHaveBeenCalled();
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('Those entries could not be copied.');
    expect(message).not.toMatch(/try again/i);
    expect(options).toEqual({ variant: 'error' });
  });

  test('a meal yesterday left empty offers nothing for that meal', async () => {
    withYesterday([entry({ meal_slot: 'meal_2' })]);
    const tree = await mountDiary();
    expect(byLabel(tree, "Yesterday's Meal 1, copy 1 entry into Meal 1")).toHaveLength(0);
    expect(byLabel(tree, "Yesterday's Meal 2, copy 1 entry into Meal 2")).toHaveLength(1);
  });
});

// D230 R9/R10: "To today" while today is in view used to duplicate the
// selection in silence. It goes through the batched copy and ends in the toast
// with an Undo that removes every row it wrote; a planned row is never copied.
describe('D230 R9/R10: "To today" is a batched copy with a toast and an Undo', () => {
  const todayRow = (over = {}) => entry({ id: 't1', entry_date: TODAY, ...over });

  // A long press on a row enters selection with that row selected (the same
  // mechanism the real gesture drives).
  async function selectRow(tree, id) {
    const rows = tree.root.findAll((n) => typeof n.props?.onLongPress === 'function' && n.props?.accessibilityRole === 'button');
    expect(rows.length).toBeGreaterThan(0);
    await act(async () => { rows[0].props.onLongPress(); });
    return id;
  }

  test('viewing today: one batched write, then the toast with an Undo removing the new row', async () => {
    dayWith({ today: [todayRow()] });
    mockLogFoodEntries.mockResolvedValueOnce(['copy-9']);
    const tree = await mountDiary();
    await selectRow(tree, 't1');
    await act(async () => { await byLabel(tree, 'Copy to today')[0].props.onPress(); });

    expect(mockLogFoodEntry).not.toHaveBeenCalled();
    expect(mockLogFoodEntries).toHaveBeenCalledTimes(1);
    const [userId, payloads] = mockLogFoodEntries.mock.calls[0];
    expect(userId).toBe('u1');
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual(expect.objectContaining({ entryDate: TODAY, mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60 }));

    // The silence is gone: a toast, with an Undo, on the very day in view.
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('1 entry added to today.');
    expect(options.variant).toBe('undo');
    await act(async () => { await options.action.onPress(); });
    expect(mockDeleteFoodEntries).toHaveBeenCalledWith('u1', ['copy-9']);
  });

  test('a planned row in the selection is never copied: nothing is written, and the toast says so', async () => {
    dayWith({ today: [todayRow({ is_planned: 1 })] });
    const tree = await mountDiary();
    await selectRow(tree, 't1');
    await act(async () => { await byLabel(tree, 'Copy to today')[0].props.onPress(); });

    expect(mockLogFoodEntries).not.toHaveBeenCalled();
    expect(mockLogFoodEntry).not.toHaveBeenCalled();
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('Nothing was added. Planned meals are not copied.');
    expect(options.variant).toBe('info');
  });

  test('one unloggable row in the selection: "N entries added to today. 1 could not be copied." with Undo over the written ids only', async () => {
    dayWith({ today: [todayRow(), todayRow({ id: 't2', food_ref: 'global:legacy', quantity_g: 6000 })] });
    mockLogFoodEntries.mockResolvedValueOnce(['copy-5']);
    const tree = await mountDiary();
    await selectRow(tree, 't1');
    // Select the other row too: in selection mode a tap toggles a row. It is
    // found fresh (the tree re-rendered when selection began).
    const unselected = tree.root.findAll((n) => typeof n.props?.onPress === 'function'
      && /Not selected\. Tap to toggle\./.test(String(n.props?.accessibilityLabel ?? '')), { deep: false });
    expect(unselected).toHaveLength(1);
    await act(async () => { unselected[0].props.onPress(); });
    await act(async () => { await byLabel(tree, 'Copy to today')[0].props.onPress(); });
    const [, payloads] = mockLogFoodEntries.mock.calls[0];
    expect(payloads).toHaveLength(1);
    expect(payloads[0].quantityG).toBe(60);
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('1 entry added to today. 1 could not be copied.');
    expect(options.variant).toBe('undo');
    await act(async () => { await options.action.onPress(); });
    expect(mockDeleteFoodEntries).toHaveBeenCalledWith('u1', ['copy-5']);
  });

  test('every selected row unloggable: "Those entries could not be copied." as an error, no Undo, nothing written', async () => {
    dayWith({ today: [todayRow({ quantity_g: 6000 })] });
    const tree = await mountDiary();
    await selectRow(tree, 't1');
    await act(async () => { await byLabel(tree, 'Copy to today')[0].props.onPress(); });
    expect(mockLogFoodEntries).not.toHaveBeenCalled();
    const [message, options] = mockToastShow.mock.calls.at(-1);
    expect(message).toBe('Those entries could not be copied.');
    expect(options).toEqual({ variant: 'error' });
  });

  test('a failed copy is reported in a full sentence and writes nothing else', async () => {
    dayWith({ today: [todayRow()] });
    mockLogFoodEntries.mockRejectedValueOnce(new Error('disk'));
    const tree = await mountDiary();
    await selectRow(tree, 't1');
    await act(async () => { await byLabel(tree, 'Copy to today')[0].props.onPress(); });
    expect(mockToastShow).toHaveBeenLastCalledWith(
      'Those entries were not copied. Try again in a moment.',
      { variant: 'error' },
    );
  });
});

describe('D138 item 3, RE-ANCHORED 2026-09-22/23: meal builder, higher-calorie day and trends', () => {
  test('meal builder and higher-calorie day are FeatureRows; trends is a header action', async () => {
    dayWith({ today: startedDay });
    const nav = makeNav();
    const tree = await mountDiary(nav);

    expect(byLabel(tree, 'Open meal builder for this day or week')).toHaveLength(1);
    // byLabel already requires an onPress, which the CalorieBankSheet's own
    // identically-labelled wrapper does not carry: this is the entry point.
    expect(byLabel(tree, 'Plan a higher-calorie day')).toHaveLength(1);

    // "Trends" moved into the ScreenHeader's right slot as a HeaderAction
    // (founder order 2026-09-22/23): its visible label, accessibility
    // label and destination are unchanged from the old Chip.
    expect(textOf(tree)).toContain('Trends');
    const trends = byLabel(tree, 'Open nutrition trends and export');
    expect(trends).toHaveLength(1);
    act(() => { trends[0].props.onPress(); });
    expect(nav.navigate).toHaveBeenCalledWith('FoodInsights');
  });

  test('the meal-builder door appears exactly once on an empty day too', async () => {
    const tree = await mountDiary();
    // RE-POINTED (D230 R1): EmptyDiary and its own promo are retired; the
    // feature list's Meal builder door renders on every day, once.
    expect(textOf(tree)).toContain('Meal builder');
    expect(byLabel(tree, 'Open nutrition trends and export')).toHaveLength(1);
    // RE-ANCHORED 2026-09-22/23: the row is now FeatureRow, a wrapper
    // component that itself carries accessibilityLabel/onPress (the same
    // props its inner TouchableOpacity carries). byLabel's `deep: false`
    // stops at that shallowest match, so accessibilityRole -- set on the
    // inner TouchableOpacity, not forwarded onto FeatureRow's own props --
    // is no longer visible on the node byLabel returns; the exact-once
    // rule this test pins is still fully proven by byLabel alone.
    expect(byLabel(tree, 'Open meal builder for this day or week')).toHaveLength(1);
  });

  test('the higher-calorie day row respects the banking gate: absent when unavailable, present when available', async () => {
    // ED-safety carve-out (unchanged): floored targets close banking.
    // DiaryScreen.bankingAvailable.test.js owns the exhaustive on/off
    // cases (ED flag, floor, read-failure-fails-closed, no targets); this
    // is the one toggle this mounted suite pins for itself.
    dayWith({ today: startedDay });
    mockGetNutritionTargets.mockResolvedValue({ ...targets, floorApplied: true });
    const floored = await mountDiary();
    expect(byLabel(floored, 'Plan a higher-calorie day')).toHaveLength(0);
    // The meal-builder row is unaffected by the banking gate.
    expect(byLabel(floored, 'Open meal builder for this day or week')).toHaveLength(1);

    mockGetNutritionTargets.mockResolvedValue(targets);
    const available = await mountDiary();
    expect(byLabel(available, 'Plan a higher-calorie day')).toHaveLength(1);
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

describe('D230 R17: a single write updates in place and reconciles once in the background', () => {
  const todayCalls = () => mockGetFoodEntriesForDay.mock.calls.filter(([, d]) => d === TODAY).length;

  test('after a usual-chip log, load runs once and is not awaited; the row and the ring show the entry before it resolves', async () => {
    dayWith({ today: [] });
    mockGetSlotRecents.mockImplementation((userId, slotKey) => Promise.resolve(
      slotKey === 'meal_1' ? [{ food_ref: 'global:oats', last_quantity_g: 60, log_count: 9 }] : [],
    ));
    const tree = await mountDiary();
    expect(textOf(tree)).toContain('Porridge oats · 60 g');
    const before = todayCalls();
    const slotReadsBefore = mockGetSlotRecents.mock.calls.length;

    // The reconcile load never resolves: if the write awaited it, the toast
    // below would never fire and the rows could not have changed.
    let releaseLoad;
    mockGetFoodEntriesForDay.mockImplementation((userId, date) => (
      date === TODAY ? new Promise((resolve) => { releaseLoad = resolve; }) : Promise.resolve([])
    ));
    await act(async () => { await byLabel(tree, 'Log Porridge oats, 60 grams')[0].props.onPress(); });

    expect(todayCalls() - before).toBe(1); // exactly one background load
    expect(mockToastShow).toHaveBeenCalledWith('Porridge oats logged, 60 g.', expect.objectContaining({ variant: 'undo' }));
    const text = textOf(tree);
    expect(text).not.toContain('Porridge oats · 60 g'); // the meal is no longer empty
    expect(text).toContain('Porridge oats'); // the new row
    expect(text).toContain('227'); // the row's kcal, and the ring's eaten total
    // The write filled meal_1, so the per-meal usuals ran once for the new
    // empty set: one read per empty meal (Meal 2 to 4), plus, since the food
    // Diary audit 2026-10-16 (item 10), the old meal name each one maps to
    // (Lunch, Dinner, Snacks), never a second pass.
    const newReads = mockGetSlotRecents.mock.calls.slice(slotReadsBefore).map(([, slot]) => slot);
    expect(newReads.filter((k) => /^meal_\d+$/.test(k)).sort()).toEqual(['meal_2', 'meal_3', 'meal_4']);
    expect(newReads.length).toBeLessThanOrEqual(6);

    // The reconcile lands later and replaces the in-place rows with the stored ones.
    await act(async () => { releaseLoad([entry({ id: 'entry-new', entry_date: TODAY, meal_slot: 'meal_1' })]); });
    await act(async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); });
    expect(textOf(tree)).toContain('Porridge oats');
  });
});

// RE-POINTED (D231, app layout rework batch 3): the banner's "Mark as eaten"
// is the planned-meals line's "Mark all eaten" (same handler, same toast);
// only the control's name changed.
describe('D228 item 9: the mark-all toast counts meals, as the planned-meals line does', () => {
  const planned = (id, slot) => entry({ id, entry_date: TODAY, meal_slot: slot, is_planned: 1 });

  test('one meal of three foods toasts "1 planned meal marked as eaten."', async () => {
    dayWith({ today: [planned('p1', 'meal_1'), planned('p2', 'meal_1'), planned('p3', 'meal_1')] });
    // The write changes three ROWS; the toast must still say one meal.
    require('../../lib/food/db').confirmPlannedDay.mockResolvedValueOnce(3);
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, 'Mark all eaten')[0].props.onPress(); });
    expect(mockToastShow.mock.calls.at(-1)[0]).toBe('1 planned meal marked as eaten.');
  });

  test('two meals toast "2 planned meals marked as eaten."', async () => {
    dayWith({ today: [planned('p1', 'meal_1'), planned('p2', 'meal_1'), planned('p3', 'meal_2')] });
    require('../../lib/food/db').confirmPlannedDay.mockResolvedValueOnce(3);
    const tree = await mountDiary();
    await act(async () => { await byLabel(tree, 'Mark all eaten')[0].props.onPress(); });
    expect(mockToastShow.mock.calls.at(-1)[0]).toBe('2 planned meals marked as eaten.');
  });
});
