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

const VOLUME_HEATMAP_SOURCE = require('fs').readFileSync(
  require('path').resolve(__dirname, '../VolumeHeatmapScreen.js'),
  'utf8',
);

const store = {
  user: { id: 'u1' },
  userProfile: { trainingGoal: 'hypertrophy' },
};

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function chestSets(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${count}-${i}`,
    exerciseId: 'bench',
    createdAt: Date.now(),
    set_type: 'straight',
    actualReps: 10,
    weight: 100,
  }));
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

beforeEach(() => {
  jest.clearAllMocks();
  store.user = { id: 'u1' };
  store.userProfile = { trainingGoal: 'hypertrophy' };
  useAppStore.mockImplementation((selector) => selector(store));
  getCompletedWorkoutSets.mockResolvedValue([]);
  getAllExercises.mockResolvedValue([{ id: 'bench', primary_muscle: 'chest', secondary_muscles: '[]' }]);
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

  test('shows first-workout guidance instead of an unexplained zero heatmap', async () => {
    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Volume appears after your first workout');
    expect(text).toContain('Finish a workout and this screen will show weekly set volume');
    expect(text).toContain('Below minimum');
  });

  test('explains when saved training exists outside the selected volume window', async () => {
    getCompletedWorkoutSets.mockResolvedValueOnce([{
      id: 'old-set',
      exerciseId: 'bench',
      createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
      set_type: 'straight',
      actualReps: 10,
      weight: 100,
    }]);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('No sets in this 1-week view');
    expect(text).toContain('Your training history is still saved.');
    expect(text).toContain('Switch to a wider window');
  });

  test('starts a single initial load from the focus trigger', async () => {
    await act(async () => { create(<VolumeHeatmapScreen />); });
    await flush();
    expect(getCompletedWorkoutSets).toHaveBeenCalledTimes(1);
  });

  test('ignores stale volume results when a newer profile-triggered load starts', async () => {
    const oldSets = deferred();
    const newSets = deferred();
    getCompletedWorkoutSets
      .mockImplementationOnce(() => oldSets.promise)
      .mockImplementationOnce(() => newSets.promise);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();
    store.userProfile = { trainingGoal: 'strength' };
    await act(async () => { tree.update(<VolumeHeatmapScreen />); });
    await flush();
    expect(getCompletedWorkoutSets).toHaveBeenCalledTimes(2);

    await act(async () => { oldSets.resolve(chestSets(3)); });
    await flush();
    let text = flattenText(tree.toJSON());
    expect(text).not.toContain('Chest3/22');

    await act(async () => { newSets.resolve(chestSets(11)); });
    await flush();
    text = flattenText(tree.toJSON());
    expect(text).toContain('Chest11/22');
    expect(text).not.toContain('Chest3/22');
  });
});

describe('R2 (2026-07-11) design-cohesion census', () => {
  test('the target-edit input uses the input radius (md), not the tighter sm', () => {
    // Input class -> radius.md (FOOD-DESIGN-STANDARD.md section 4).
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/editInputField: \{ borderRadius: radius\.md \}/);
  });

  test('every pure set-count/target readout carries tabular figures', () => {
    // This numeral-dense screen had zero tabular numerals before R2. Each pure
    // count/target readout now aligns as tabular columns (frozen style AND its
    // live-theme twin where one exists). mrvLabel already used type.num.
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/setsCount: \{[\s\S]*?fontVariant: \['tabular-nums'\]/);
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/currentCount: \{[\s\S]*?fontVariant: \['tabular-nums'\]/);
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/editInputText: \{[\s\S]*?fontVariant: \['tabular-nums'\]/);
    // Live-theme twins carry it too (D70 precedent: fontVariant on the twin).
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/setsCount: \{ fontSize: t\.fontSize\.sm, fontVariant: \['tabular-nums'\] \}/);
    expect(VOLUME_HEATMAP_SOURCE).toMatch(/currentCount: \{ fontSize: t\.fontSize\.xs, fontVariant: \['tabular-nums'\] \}/);
  });
});
