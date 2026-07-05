import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/BodyDiagramHeatmap', () => () => null);
jest.mock('../../components/VolyumeChart', () => 'VolyumeChart');
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({
  selection: jest.fn(),
  commit: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn() }));
jest.mock('../../lib/sync', () => ({ syncUserPref: jest.fn(() => Promise.resolve()) }));

jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  getWeeklyVolumeByMuscle: jest.fn(),
  getLastTrainedByMuscle: jest.fn(),
  getActivePlan: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import {
  getCompletedWorkoutSets,
  getAllExercises,
  getWeeklyVolumeByMuscle,
  getLastTrainedByMuscle,
  getActivePlan,
} from '../../lib/database';
import VolumeHeatmapScreen from '../VolumeHeatmapScreen';

const store = {
  user: { id: 'u1' },
  userProfile: { trainingGoal: 'hypertrophy' },
};

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => selector(store));
  getCompletedWorkoutSets.mockResolvedValue([]);
  getAllExercises.mockResolvedValue([]);
  getWeeklyVolumeByMuscle.mockResolvedValue([]);
  getLastTrainedByMuscle.mockResolvedValue({});
  getActivePlan.mockResolvedValue(null);
});

describe('VolumeHeatmapScreen states', () => {
  test('shows a retry state when volume data fails to load', async () => {
    getCompletedWorkoutSets.mockRejectedValueOnce(new Error('offline'));
    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load volume heatmap");
    expect(text).toContain('Check your connection and try again.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('Below minimum');
  });
});
