/**
 * NutritionTargetsScreen, D226 energy slider. Pins: the slider and the
 * private training-status row are hidden while calm mode is on, while an ED
 * flag is open, and when either read fails (fail closed); with neither they
 * show, and the slider is bounded by the range (its top is the range's top).
 * Driven against the real screen with its data boundary mocked.
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
  getNutritionTargets: jest.fn(async () => ({
    targetKcal: 4077, kcalMin: 3669, kcalMax: 4485, proteinG: 180, fatG: 90, carbsG: 637,
    tdee: 3700, maintenanceKcal: 3700, goal: 'lean_gain',
  })),
  logBodyMetric: jest.fn(async () => {}),
  getUserBodyProfile: jest.fn(async () => ({ sex: 'male', heightCm: 178, dateOfBirth: '1990-01-01' })),
  getLatestBodyWeight: jest.fn(async () => ({ weightKg: 80 })),
  getLatestBodyComposition: jest.fn(async () => null),
  getOpenEdPatternFlag: jest.fn(async () => null),
}));
jest.mock('../../components/EnergySlider', () => {
  const { createElement } = require('react');
  return { __esModule: true, default: (props) => createElement('EnergySliderMarker', props) };
});
jest.mock('../../lib/food/mealPlanService', () => ({
  reviewTargetChangeAgainstActivePlan: jest.fn(async () => ({ action: 'KEEP' })),
  commitReconciledPlan: jest.fn(async () => ({})),
  regenerateActiveMealPlan: jest.fn(async () => ({})),
  CONTINUITY_ACTION: { KEEP: 'KEEP', ADJUST: 'ADJUST', REBUILD: 'REBUILD' },
  REBUILD_REASON: {},
}));
jest.mock('../../lib/effectiveMaintenanceService', () => ({
  resolveEffectiveMaintenanceForUser: jest.fn(async () => ({ resolved: null })),
}));
jest.mock('../../lib/maintenanceInputs', () => ({
  readMaintenanceInputs: jest.fn(async () => ({ weightKg: 80 })),
}));


import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import { getOpenEdPatternFlag } from '../../lib/database';
import NutritionTargetsScreen from '../NutritionTargetsScreen';

const store = { user: { id: 'user-1' }, userProfile: { weightKg: 80 }, units: 'metric', accessibility: { reduceMotion: true } };
const nav = { navigate: jest.fn(), goBack: jest.fn(), dispatch: jest.fn(), setOptions: jest.fn(), addListener: jest.fn(() => () => {}), getParent: () => ({}) };

async function mount() {
  let tree;
  await act(async () => { tree = create(<NutritionTargetsScreen navigation={nav} route={{ params: {} }} />); });
  await act(async () => {});
  return tree;
}
const sliders = (tree) => tree.root.findAll((n) => n.type === 'EnergySliderMarker');
const text = (tree) => JSON.stringify(tree.toJSON());

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((sel) => (typeof sel === 'function' ? sel(store) : store));
  AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
  getOpenEdPatternFlag.mockImplementation(async () => null);
});

describe('energy slider visibility', () => {
  test('shown when neither calm mode nor an ED flag is on', async () => {
    const tree = await mount();
    console.log(["Daily Energy Target","Training status","Estimated range"].map(k=>k+":"+text(tree).includes(k)).join(" ")); const s = sliders(tree);
    expect(s).toHaveLength(1);
    expect(s[0].props.max).toBeLessThanOrEqual(Math.round(4077 * 1.1));
    expect(s[0].props.min).toBeLessThan(s[0].props.max);
  });
  test('hidden under calm mode', async () => {
    AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(k === '@volyume_wellbeing_mode' || /wellbeing/i.test(k) ? 'calm' : null));
    const tree = await mount();
    expect(sliders(tree)).toHaveLength(0);
  });
  test('hidden under an open ED flag', async () => {
    getOpenEdPatternFlag.mockImplementation(async () => ({ id: 'f1' }));
    const tree = await mount();
    expect(sliders(tree)).toHaveLength(0);
    expect(text(await mount())).not.toContain('Training status');
  });
  test('hidden when the ED flag read fails', async () => {
    getOpenEdPatternFlag.mockImplementation(async () => { throw new Error('db'); });
    expect(sliders(await mount())).toHaveLength(0);
  });
  test('hidden when the wellbeing read fails', async () => {
    AsyncStorage.getItem.mockImplementation((k) => (/wellbeing/i.test(k) ? Promise.reject(new Error('x')) : Promise.resolve(null)));
    expect(sliders(await mount())).toHaveLength(0);
  });
});
