/**
 * VolumeHeatmapScreen.trendAnchor.test.js
 *
 * Progress-tab audit 2026-09-24 (F4, D200 item 3 last clause), lane E,
 * ruling 5: the "Volume trend" section's read now anchors on the
 * Monday-anchored local week end (matching the weekly check-in's own call
 * to getWeeklyVolumeByMuscle), not a rolling window off the wall clock, and
 * its takeaway is computed over the full weeks only -- the current
 * (partial) week is never mixed into an average or a first-to-last delta.
 */
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
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), error: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn() }));
jest.mock('../../lib/sync', () => ({
  syncUserPref: jest.fn(() => Promise.resolve()),
  notePrefWrite: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  getWeeklyVolumeByMuscle: jest.fn(),
  getLastTrainedByMuscle: jest.fn(),
  getActivePlan: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllExercises, getWeeklyVolumeByMuscle, getLastTrainedByMuscle, getActivePlan,
} from '../../lib/database';
import VolumeHeatmapScreen from '../VolumeHeatmapScreen';
import { localWeekEndMs } from '../../lib/dayKey';

const store = { user: { id: 'u1' }, userProfile: { trainingGoal: 'hypertrophy' } };

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function chestSets(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${count}-${i}`, exerciseId: 'bench', createdAt: Date.now(),
    set_type: 'straight', actualReps: 10, weight: 100,
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
  useAppStore.mockImplementation((selector) => selector(store));
  getCompletedWorkoutSets.mockResolvedValue(chestSets(3));
  getAllExercises.mockResolvedValue([{ id: 'bench', primary_muscle: 'chest', secondary_muscles: '[]' }]);
  getWeeklyVolumeByMuscle.mockResolvedValue([]);
  getLastTrainedByMuscle.mockResolvedValue({});
  getActivePlan.mockResolvedValue(null);
});

afterEach(() => { jest.useRealTimers(); });

describe('VolumeHeatmapScreen: the volume trend anchors on the Monday week end', () => {
  test('getWeeklyVolumeByMuscle is called with the Monday-anchored week-end anchor, not the rolling wall clock', async () => {
    const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime(); // a plain Wednesday
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();
    void tree;

    expect(getWeeklyVolumeByMuscle).toHaveBeenCalledWith('u1', 4, localWeekEndMs(NOW));
  });

  test('a Sunday-evening "now" still anchors on the upcoming Monday, not a rolling 7 days', async () => {
    const NOW = new Date(2026, 0, 4, 20, 0, 0).getTime(); // Sun 4 Jan 2026, 20:00
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();
    void tree;

    const [, , anchorArg] = getWeeklyVolumeByMuscle.mock.calls[0];
    expect(anchorArg).toBe(localWeekEndMs(NOW));
    // The anchor is the NEXT local Monday 00:00, not `now` itself.
    expect(new Date(anchorArg).getDay()).toBe(1);
    expect(new Date(anchorArg).getHours()).toBe(0);
  });
});

describe('VolumeHeatmapScreen: the trend takeaway uses the full weeks only', () => {
  test('the current (partial) week never enters the average or the first-to-last delta', async () => {
    // Oldest -> newest: three full weeks (10, 12, 14 sets) then a partial
    // current week (2 sets, "so far"). Mixing the partial week in would
    // read "average 9 or 10 sets a week, down 8" -- a false decline against
    // a week that has barely started.
    getWeeklyVolumeByMuscle.mockResolvedValue([
      { weekLabel: 'W1', weekStart: 1, weekEnd: 2, volumeByMuscle: { chest: 10 } },
      { weekLabel: 'W2', weekStart: 2, weekEnd: 3, volumeByMuscle: { chest: 12 } },
      { weekLabel: 'W3', weekStart: 3, weekEnd: 4, volumeByMuscle: { chest: 14 } },
      { weekLabel: 'W4', weekStart: 4, weekEnd: 5, volumeByMuscle: { chest: 2 } },
    ]);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('This week so far: 2 sets. Last 3 full weeks: average 12 sets a week, up 4.');
    expect(text).not.toMatch(/down 8/);
    expect(text).not.toMatch(/average (9|10) sets a week/);
  });

  test('the takeaway is absent (not a stray sentence) once loading fails to find any trend data', async () => {
    getWeeklyVolumeByMuscle.mockResolvedValue([]);
    getCompletedWorkoutSets.mockResolvedValue([]);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('This week so far');
    expect(text).not.toContain('full week');
  });
});
