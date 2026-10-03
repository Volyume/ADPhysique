/**
 * VolumeHeatmapScreen.trendAnchor.test.js
 *
 * Progress-tab audit 2026-09-24 (F4, D200 item 3 last clause), lane E,
 * ruling 5: the "Volume trend" section's read now anchors on the
 * Monday-anchored local week end (matching the weekly check-in's own call
 * to getWeeklyVolumeByMuscle), not a rolling window off the wall clock, and
 * its takeaway is computed over the full weeks only -- the current
 * (partial) week is never mixed into an average.
 *
 * RE-ANCHORED under D214 (Progress, recovery heatmap and Consistency
 * elevation, `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.4 item 6): the takeaway is in LOGGED sets
 * per Monday week, computed from the set rows the screen loads (the trend query
 * counts per-muscle credits, so eight logged sets used to print as 16), and
 * its wording is "This week so far: 42 sets logged. Last 3 full weeks: about 60
 * a week." with no first-to-last delta. The anchoring pins below are unchanged.
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
  // D218 bridge: the reporting read (unfiltered lookup) is built from this
  // suite's own getAllExercises fixture, so each test's fixture stays the contract.
  getExerciseLookup: jest.fn(async () => {
    const db = jest.requireMock('../../lib/database');
    const { buildExerciseLookup } = jest.requireActual('../../lib/exercise/lookup');
    return buildExerciseLookup(await db.getAllExercises());
  }),
  getWeeklyVolumeByMuscle: jest.fn(),
  getActivePlan: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllExercises, getWeeklyVolumeByMuscle, getActivePlan, getCurrentMesocycleWeek,
} from '../../lib/database';
import VolumeHeatmapScreen from '../VolumeHeatmapScreen';
import { localWeekEndMs } from '../../lib/dayKey';

const store = { user: { id: 'u1' }, userProfile: { trainingGoal: 'hypertrophy' } };

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function chestSets(count, at = Date.now()) {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${count}-${at}-${i}`, exerciseId: 'bench', createdAt: at,
    set_type: 'straight', actualReps: 10, weight: 100,
  }));
}

// The Monday 00:00 (local) k weeks from the Monday of the week of Wed 10 Jun 2026.
const monday = (k) => new Date(2026, 5, 8 + 7 * k).getTime();
const bucket = (k, volumeByMuscle) => ({
  weekLabel: `W${k + 4}`, weekStart: monday(k), weekEnd: monday(k + 1), volumeByMuscle,
});

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
  getActivePlan.mockResolvedValue(null);
  getCurrentMesocycleWeek.mockResolvedValue(null);
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

describe('VolumeHeatmapScreen: the trend takeaway uses the full weeks only, in logged sets', () => {
  test('the current (partial) week never enters the average', async () => {
    // Oldest -> newest: three full weeks (10, 12, 14 logged sets) then a
    // partial current week (2 sets, "so far"). Mixing the partial week in
    // would read "about 9 or 10 a week" -- a false drop against a week that
    // has barely started.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10, 12, 0, 0).getTime()); // Wednesday
    getCompletedWorkoutSets.mockResolvedValue([
      ...chestSets(10, monday(-3) + 3600000),
      ...chestSets(12, monday(-2) + 3600000),
      ...chestSets(14, monday(-1) + 3600000),
      ...chestSets(2, new Date(2026, 5, 8, 9, 0, 0).getTime()),
    ]);
    getWeeklyVolumeByMuscle.mockResolvedValue([
      bucket(-3, { chest: 10 }), bucket(-2, { chest: 12 }), bucket(-1, { chest: 14 }), bucket(0, { chest: 2 }),
    ]);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    // RE-ANCHORED 2026-10-02 (D214 addendum 9, census 0.22): "about 12 sets a week", the unit named.
    expect(text).toContain('This week so far: 2 sets logged. Last 3 full weeks: about 12 sets a week.');
    expect(text).not.toMatch(/down 8|up 4/); // no first-to-last delta any more
    expect(text).not.toMatch(/about (9|10) sets a week/);
  });

  test('the totals are logged rows, not the per-muscle credits the trend query returns', async () => {
    // A full week of eight logged presses credits chest 8, triceps 4 and front
    // delts 4 (16 credits). The takeaway must print the eight logged sets.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10, 12, 0, 0).getTime());
    getAllExercises.mockResolvedValue([
      { id: 'bench', primary_muscle: 'chest', secondary_muscles: JSON.stringify(['triceps', 'front_delts']) },
    ]);
    getCompletedWorkoutSets.mockResolvedValue([
      ...chestSets(8, monday(-2) + 3600000),
      ...chestSets(8, monday(-1) + 3600000),
      ...chestSets(4, new Date(2026, 5, 8, 9, 0, 0).getTime()),
    ]);
    getWeeklyVolumeByMuscle.mockResolvedValue([
      bucket(-2, { chest: 8, triceps: 4, front_delts: 4 }),
      bucket(-1, { chest: 8, triceps: 4, front_delts: 4 }),
      bucket(0, { chest: 4, triceps: 2, front_delts: 2 }),
    ]);

    let tree;
    await act(async () => { tree = create(<VolumeHeatmapScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('This week so far: 4 sets logged. Last 2 full weeks: about 8 sets a week.');
    expect(text).not.toMatch(/about 16|\b8 sets logged|\b10 sets logged/);
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
