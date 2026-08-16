/**
 * Behavioural mount coverage for N-BANK-04 (Campaign 21 Step 12 hostile
 * review, SCREEN/PERSISTENCE lane, GAP A).
 *
 * `bankingAvailable` (DiaryScreen.js:364) is the ED-safety gate for calorie
 * banking:
 *
 *   const bankingAvailable = !!targets && !targetWasFloored(targets) && !edFlagOpen;
 *
 * It governs BOTH whether the "Plan a higher-calorie day" entry point
 * renders at all AND whether a persisted bank is allowed to display (review
 * fix #2, see the comment above the definition). Before this suite the only
 * coverage was a source regex in lapsedReadOnly.guard.test.js; nothing
 * proved the gate actually withholds the entry point when the ED flag is
 * open or the target has been floored, or that it grants it when neither
 * carve-out applies.
 *
 * Every existing DiaryScreen test in this directory is a source-level
 * fs.readFileSync + regex guard, each carrying a comment that a full render
 * harness was not attempted because of the screen's dependency graph
 * (SQLite, sync, coaching engine, store) -- see e.g.
 * DiaryScreen.holdHints.guard.test.js and DiaryScreen.daySwipe.guard.test.js.
 * No DiaryScreen mount test exists anywhere in the tree (confirmed by grep).
 * This suite is the first one: it follows the mount harness conventions
 * from src/__tests__/screen-mount.test.js (react-test-renderer + act,
 * flushed microtasks/macrotask, mocked native modules) combined with the
 * lighter-weight whole-module jest.mock('../../lib/food/db') /
 * jest.mock('../../lib/database') pattern used by CoachReviewScreen.error.
 * test.js, so the screen's real DB/sync layer is never reached and the ED
 * gate itself -- not the SQLite plumbing -- is what's under test. This is a
 * focused mounted test in the existing style, not an extraction: no
 * production file is touched.
 */
import { create, act } from 'react-test-renderer';

// expo-haptics can't construct its native EventEmitter in the bare test env
// (screen-mount.test.js mocks it the same way; DiaryScreen reaches it via
// lib/haptics on several handlers).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// DiaryScreen's own load() fires only from useFocusEffect (BUG-1 fix
// consolidated it there, see the comment above DiaryScreen.js:480). A bare
// jest.fn() stub (screen-mount.test.js's default) never invokes the
// callback at all, so load() would never run and every scenario below
// would trivially collapse to "no targets loaded yet" rather than actually
// exercising the gate. Give it a real (if simplified) implementation, the
// same one screen-mount.test.js uses for its AnalyticsScreen zero-data
// case: run the callback as a plain effect so DB reads actually happen.
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), getParent: () => ({ addListener: () => () => {} }) }),
    useFocusEffect: (cb) => React.useEffect(cb, [cb]),
  };
});

// react-native-gesture-handler's top-level module is auto-mocked globally
// (__mocks__/react-native-gesture-handler.js), but MealSection -> EntryRow
// imports the /Swipeable subpath directly, which is a different module
// specifier Jest does not auto-resolve to the same mock.
jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('Swipeable', props, props.children) };
});

// MacroRings pulls in @shopify/react-native-skia for the ring canvas; its
// native module throws outside a real app runtime. Same stub shape as
// screen-mount.test.js.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
  useFont: () => null, useImage: () => null,
}));

// Whole-module mocks for the two DB entry points DiaryScreen reads from, so
// the real SQLite/sync-backed implementations (and everything they in turn
// import) are never evaluated. Every function DiaryScreen imports from each
// module needs a stub here or the import destructure hands the component
// `undefined`.
jest.mock('../../lib/food/db', () => ({
  getFoodEntriesForDay: jest.fn(() => Promise.resolve([])),
  getRecentLoggedDays: jest.fn(() => Promise.resolve([])),
  deleteFoodEntry: jest.fn(() => Promise.resolve()),
  restoreFoodEntry: jest.fn(() => Promise.resolve()),
  updateFoodEntry: jest.fn(() => Promise.resolve()),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  applyCuratedMealToDiary: jest.fn(() => Promise.resolve()),
  setWater: jest.fn(() => Promise.resolve()),
  getWater: jest.fn(() => Promise.resolve(0)),
  createSavedMeal: jest.fn(() => Promise.resolve()),
  confirmPlannedDay: jest.fn(() => Promise.resolve(0)),
  clearPlannedDay: jest.fn(() => Promise.resolve()),
  getSlotRecents: jest.fn(() => Promise.resolve([])),
}));

const mockGetOpenEdPatternFlag = jest.fn(() => Promise.resolve(false));
const mockGetNutritionTargets = jest.fn(() => Promise.resolve(null));

jest.mock('../../lib/database', () => ({
  getNutritionTargets: (...args) => mockGetNutritionTargets(...args),
  getOpenEdPatternFlag: (...args) => mockGetOpenEdPatternFlag(...args),
  getLatestBodyWeight: jest.fn(() => Promise.resolve(null)),
  getLatestBodyComposition: jest.fn(() => Promise.resolve(null)),
  getLatestCoachOutput: jest.fn(() => Promise.resolve(null)),
}));

import DiaryScreen from '../DiaryScreen';
import useAppStore from '../../store/useAppStore';

const BANK_ENTRY_LABEL = 'Plan a higher-calorie day';

// A realistic, non-floored target row: bankingAvailable's first two
// conditions (`!!targets && !targetWasFloored(targets)`) are satisfied by
// this shape alone; each test then varies floorApplied/warnings/edFlag.
function makeTargets(overrides = {}) {
  return {
    id: 'nt1', userId: 'u1', bmr: 1700, tdee: 2600, targetKcal: 2600,
    proteinG: 180, carbsG: 300, fatG: 80, phase: 'maintain',
    floorApplied: false, warnings: [],
    ...overrides,
  };
}

function makeNav() {
  const nav = { navigate: jest.fn(), getParent: () => ({ addListener: () => () => {} }) };
  return nav;
}

// CalorieBankSheet (DiaryScreen.js:1910) is unconditionally in the render
// tree -- its OWN visibility is a separate concern (bankSheetVisible), not
// bankingAvailable -- and its wrapping BottomSheet/BottomSheetModal happens
// to reuse the identical accessibilityLabel ("Plan a higher-calorie day",
// CalorieBankSheet.js:111) for the sheet itself. That match has no onPress
// and is present regardless of the gate, so it would falsely read as "entry
// point present" if not excluded. The real entry point is the Button at
// DiaryScreen.js:1578-1588, which does carry onPress.
function findBankEntryButton(tree) {
  return tree.root
    .findAllByProps({ accessibilityLabel: BANK_ENTRY_LABEL })
    .filter((n) => typeof n.props.onPress === 'function');
}

async function mountDiary() {
  let tree;
  await act(async () => {
    tree = create(<DiaryScreen navigation={makeNav()} route={{ params: {} }} />);
  });
  await act(async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
  return tree;
}

describe('DiaryScreen bankingAvailable (N-BANK-04 ED-safety gate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOpenEdPatternFlag.mockResolvedValue(false);
    mockGetNutritionTargets.mockResolvedValue(makeTargets());
    useAppStore.setState({
      user: { id: 'u1', email: 't@e.com', isLocal: false },
      session: { user: { id: 'u1' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric', sex: 'female' },
    });
  });

  test('edFlagOpen true: banking entry point is absent even with valid, non-floored targets', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(true);
    mockGetNutritionTargets.mockResolvedValue(makeTargets());
    const tree = await mountDiary();
    expect(mockGetOpenEdPatternFlag).toHaveBeenCalled();
    expect(findBankEntryButton(tree)).toHaveLength(0);
  });

  test('floored targets (floorApplied): banking entry point is absent even with edFlagOpen false', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(false);
    mockGetNutritionTargets.mockResolvedValue(makeTargets({ floorApplied: true }));
    const tree = await mountDiary();
    expect(findBankEntryButton(tree)).toHaveLength(0);
  });

  test('floored targets via a floor-language warning: banking entry point is absent', async () => {
    // targetWasFloored also treats a matching warning string as floored,
    // independent of the floorApplied flag (mealPlanAssembler.js:54-59).
    mockGetOpenEdPatternFlag.mockResolvedValue(false);
    mockGetNutritionTargets.mockResolvedValue(makeTargets({
      floorApplied: false,
      // Must actually match targetWasFloored's regex (mealPlanAssembler.js:
      // 54-59: /below safe minimum|raising to floor|hard gate|raised to
      // limit loss|rapid|capped/i) -- "raising to floor" verbatim.
      warnings: ['Raising to floor to protect a safe minimum.'],
    }));
    const tree = await mountDiary();
    expect(findBankEntryButton(tree)).toHaveLength(0);
  });

  test('both false with targets present: banking entry point is available', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(false);
    mockGetNutritionTargets.mockResolvedValue(makeTargets());
    const tree = await mountDiary();
    const found = findBankEntryButton(tree);
    expect(found.length).toBeGreaterThan(0);
  });

  test('a transient ED-flag read failure fails CLOSED: entry point stays absent (never opens on error)', async () => {
    // load()'s own wiring: getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
    // then setEdFlagOpen(!!edFlag) -- the truthy sentinel string keeps banking
    // disabled rather than defaulting it open on a read error.
    mockGetOpenEdPatternFlag.mockRejectedValue(new Error('transient read failure'));
    mockGetNutritionTargets.mockResolvedValue(makeTargets());
    const tree = await mountDiary();
    expect(findBankEntryButton(tree)).toHaveLength(0);
  });

  test('no targets at all: banking entry point is absent (first condition of the gate)', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(false);
    mockGetNutritionTargets.mockResolvedValue(null);
    const tree = await mountDiary();
    expect(findBankEntryButton(tree)).toHaveLength(0);
  });
});
