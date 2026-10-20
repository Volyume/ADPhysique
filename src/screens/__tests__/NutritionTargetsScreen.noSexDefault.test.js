/**
 * NutritionTargetsScreen -- no silent sex default (F6, owner answer 2026-10).
 *
 * What this pins: the Sex pills start with NOTHING selected. Until the
 * saved profile has loaded, and for a profile that holds no sex, neither
 * "Male" nor "Female" is selected, a tap before the profile has loaded is
 * ignored, and the screen's own form-complete rule (sex is required) keeps
 * "Set my targets" off. It used to start on "Male", so a person whose
 * profile held no sex (a legacy account) calculated as male without ever
 * choosing it, which raises the calorie floor and the lean-mass floor.
 *
 * It does not touch the calorie floors, the FFM floor or any ED logic: the
 * engine is not imported here and the calculation path is unchanged.
 * Driven against the REAL screen with its data boundary mocked.
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
import { getUserBodyProfile } from '../../lib/database';
import NutritionTargetsScreen from '../NutritionTargetsScreen';
import Chip from '../../components/Chip';

const store = { user: { id: 'user-1' }, userProfile: {}, units: 'metric', accessibility: { reduceMotion: true } };

function nav() {
  const parent = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })), dispatch: jest.fn() };
  return {
    navigate: jest.fn(), goBack: jest.fn(), dispatch: jest.fn(), setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}), getParent: () => parent,
  };
}

async function mount() {
  let tree;
  await act(async () => {
    tree = create(<NutritionTargetsScreen navigation={nav()} route={{ params: {} }} />);
  });
  return tree;
}

// The first Male and Female chips on the screen (the quick "Set it for me"
// card, the screen's first sex control).
function sexChips(tree) {
  const chips = tree.root.findAllByType(Chip);
  return {
    male: chips.find((c) => c.props.label === 'Male'),
    female: chips.find((c) => c.props.label === 'Female'),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((sel) => (typeof sel === 'function' ? sel(store) : store));
});

describe('Nutrition Targets: sex is never defaulted', () => {
  test('before the profile has loaded neither pill is selected, and a tap is ignored', async () => {
    getUserBodyProfile.mockImplementation(() => new Promise(() => {})); // never settles
    const tree = await mount();
    let { male, female } = sexChips(tree);
    expect(male.props.selected).toBe(false);
    expect(female.props.selected).toBe(false);
    await act(async () => { male.props.onPress(); });
    ({ male, female } = sexChips(tree));
    expect(male.props.selected).toBe(false);
    await act(async () => { tree.unmount(); });
  });

  test('a profile with no sex leaves both pills empty once loaded, and a tap then chooses', async () => {
    getUserBodyProfile.mockImplementation(async () => ({ heightCm: 180 }));
    const tree = await mount();
    let { male, female } = sexChips(tree);
    expect(male.props.selected).toBe(false);
    expect(female.props.selected).toBe(false);
    await act(async () => { female.props.onPress(); });
    ({ male, female } = sexChips(tree));
    expect(female.props.selected).toBe(true);
    expect(male.props.selected).toBe(false);
    await act(async () => { tree.unmount(); });
  });

  test('a profile that has a sex shows it once loaded', async () => {
    getUserBodyProfile.mockImplementation(async () => ({ sex: 'female' }));
    let tree = await mount();
    let { male, female } = sexChips(tree);
    expect(female.props.selected).toBe(true);
    expect(male.props.selected).toBe(false);
    await act(async () => { tree.unmount(); });

    getUserBodyProfile.mockImplementation(async () => ({ sex: 'male' }));
    tree = await mount();
    ({ male, female } = sexChips(tree));
    expect(male.props.selected).toBe(true);
    expect(female.props.selected).toBe(false);
    await act(async () => { tree.unmount(); });
  });

  test('a stored value that is not male or female is not shown as a choice', async () => {
    getUserBodyProfile.mockImplementation(async () => ({ sex: 'other' }));
    const tree = await mount();
    const { male, female } = sexChips(tree);
    expect(male.props.selected).toBe(false);
    expect(female.props.selected).toBe(false);
    await act(async () => { tree.unmount(); });
  });

  test('the calculation stays blocked until sex is chosen, then opens', async () => {
    getUserBodyProfile.mockImplementation(async () => ({ heightCm: 180, dateOfBirth: '1990-01-01' }));
    const database = require('../../lib/database');
    database.getLatestBodyWeight.mockImplementation(async () => ({ weightKg: 80 }));
    const tree = await mount();
    const find = (label) => tree.root.findAll((n) => n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
    await act(async () => { find('I consent to storing this data').props.onPress(); });
    expect(find('Set my targets').props.disabled).toBe(true);
    await act(async () => { sexChips(tree).female.props.onPress(); });
    expect(find('Set my targets').props.disabled).toBe(false);
    await act(async () => { tree.unmount(); });
  });
});
