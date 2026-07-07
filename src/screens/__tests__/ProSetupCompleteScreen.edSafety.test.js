import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const chain = { duration: () => chain, delay: () => chain };
  return {
    __esModule: true,
    default: { View },
    FadeInDown: { duration: () => chain },
    FadeInUp: { duration: () => chain },
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

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ProSetupCompleteScreen.js'), 'utf8');
const FALLBACK_COPY = 'At the end of your training week, review how it went.';
const DATED_COPY = 'Keep logging your morning weight. Your first review lands on Sunday 12 July';

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

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function renderScreen() {
  let tree;
  await act(async () => {
    tree = create(<ProSetupCompleteScreen navigation={{ navigate: jest.fn() }} />);
  });
  await flush();
  return flattenText(tree.toJSON());
}

describe('ProSetupCompleteScreen ED-safety copy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.mockImplementation((selector) => selector(store));
    AsyncStorage.getItem.mockResolvedValue(null);
    getActivePlan.mockResolvedValue(null);
    getRoutinesForPlan.mockResolvedValue([]);
    getMorningWeightsLast14Days.mockResolvedValue([{ loggedAt: Date.UTC(2026, 6, 5) }]);
    getOpenEdPatternFlag.mockResolvedValue(null);
  });

  test('ED flag read failures keep weekly review copy neutral', async () => {
    getOpenEdPatternFlag.mockRejectedValueOnce(new Error('read failed'));

    const text = await renderScreen();

    expect(getOpenEdPatternFlag).toHaveBeenCalledWith('u1');
    expect(text).toContain(FALLBACK_COPY);
    expect(text).not.toContain(DATED_COPY);
  });

  test('an open ED flag keeps weekly review copy neutral', async () => {
    getOpenEdPatternFlag.mockResolvedValueOnce({ id: 'flag-1' });

    const text = await renderScreen();

    expect(text).toContain(FALLBACK_COPY);
    expect(text).not.toContain(DATED_COPY);
  });

  test('a healthy non-flagged read can still show the dated first review copy', async () => {
    const text = await renderScreen();

    expect(text).toContain(DATED_COPY);
    expect(text).not.toContain(FALLBACK_COPY);
  });

  test('training split details start collapsed so the reveal stays scannable', () => {
    expect(SOURCE).toContain('const [planOpen, setPlanOpen] = useState(false);');
    expect(SOURCE).toContain('the user should reach Start training before reading every rationale line');
  });
});
