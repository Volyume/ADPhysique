/**
 * D15 (founder ruling 2026-07-09, DECISIONS-2026-07-09.md, "adherence-why
 * surfaces BOTH at Pro setup completion and once in the first weekly coach
 * output"): pins the ProSetupCompleteScreen half of that placement.
 *
 * Render harness copied from ProSetupCompleteScreen.edSafety.test.js (the
 * existing, working mock scaffold for this screen) rather than duplicating
 * a second one; this suite only adds the D15-specific assertions.
 */
import { create, act } from 'react-test-renderer';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const chain = (kind) => ({ __kind: kind, duration: () => chain(kind), delay: () => chain(kind) });
  return {
    __esModule: true,
    default: { View },
    FadeInDown: { duration: () => chain('FadeInDown') },
    FadeInUp: { duration: () => chain('FadeInUp') },
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('../../components/BrandMark', () => ({ VolyumeIcon: () => null }));
jest.mock('../../components/Button', () => {
  const { Text } = require('react-native');
  return ({ title }) => <Text>{title}</Text>;
});
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('../../lib/database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getMorningWeightsLast14Days: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
}));
jest.mock('../../lib/trialActivation', () => ({ firstReviewUnlockDate: jest.fn(() => new Date('2026-07-12T08:00:00Z')) }));
jest.mock('../../lib/coachLedger', () => ({ formatUnlockDate: jest.fn(() => 'Sunday 12 July') }));
jest.mock('../../lib/food/mealPlanService', () => ({ planNextWeek: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ planReady: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import {
  getActivePlan,
  getRoutinesForPlan,
  getMorningWeightsLast14Days,
  getOpenEdPatternFlag,
} from '../../lib/database';
import ProSetupCompleteScreen from '../ProSetupCompleteScreen';

const ADHERENCE_WHY_COPY = 'The more sessions you log, the better your coach understands how your body responds, so it can get your weights and your lighter weeks right.';

const store = {
  user: { id: 'u1' },
  userProfile: {
    firstName: 'Alex',
    trainingGoal: 'lean_gain',
    trainingPhase: 'build',
    daysPerWeek: 4,
    planWeakPoints: [],
  },
  accessibility: { reduceMotion: true, energyUnit: 'kcal' },
  completeFirstRun: jest.fn(),
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

async function renderScreen() {
  let tree;
  await act(async () => {
    tree = create(<ProSetupCompleteScreen navigation={{ navigate: jest.fn() }} />);
  });
  await flush();
  return flattenText(tree.toJSON());
}

describe('D15: ProSetupCompleteScreen adherence-why line', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.mockImplementation((selector) => selector(store));
    AsyncStorage.getItem.mockResolvedValue(null);
    getActivePlan.mockResolvedValue(null);
    getRoutinesForPlan.mockResolvedValue([]);
    getMorningWeightsLast14Days.mockResolvedValue([{ loggedAt: Date.UTC(2026, 6, 5) }]);
    getOpenEdPatternFlag.mockResolvedValue(null);
  });

  test('the adherence-why line renders once, said, in the check-in card', async () => {
    const text = await renderScreen();
    expect(text).toContain(ADHERENCE_WHY_COPY);
    // Exactly one occurrence: said once, not duplicated.
    expect(text.split(ADHERENCE_WHY_COPY).length - 1).toBe(1);
  });

  test('the line carries no mention of weight, body composition or calories/intake', () => {
    expect(ADHERENCE_WHY_COPY.toLowerCase()).not.toMatch(/\bweight\b|\bbodyweight\b|\bcalorie|\bintake\b/);
  });

  test('no em dash in the line (house style)', () => {
    expect(ADHERENCE_WHY_COPY).not.toMatch(/—/);
  });

  test('it still renders under an open ED-pattern flag (training/logging-only, not weight/food-adjacent)', async () => {
    getOpenEdPatternFlag.mockResolvedValueOnce({ id: 'flag-1' });
    const text = await renderScreen();
    expect(text).toContain(ADHERENCE_WHY_COPY);
  });
});
