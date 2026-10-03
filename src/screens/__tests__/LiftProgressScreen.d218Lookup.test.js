/**
 * LiftProgressScreen.d218Lookup.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), audit findings F-13, F-4 and the P12 / P13 rows of its path table
 * (docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md).
 *
 * Lift Progress read the FILTERED library (`getAllExercises`) and built its
 * rows from every non-warm-up set, so a lift logged under a retired id and
 * its survivor was two rows, a soft-deleted custom exercise and a set known
 * only by its name snapshot were "Exercise" with no muscle, and an assistance
 * machine's assistance or a distance exercise's metres became an "estimated
 * max" the Exercise Detail chart refuses. Pins, against the REAL screen and
 * the real row builder (only the data reads are mocked):
 *  - the loader reads `getExerciseLookup` (unfiltered, survivor-aware), never
 *    the filtered library;
 *  - one row for a lift logged under two ids, whose other metric lenses
 *    (heaviest, total reps, total lifted) cover BOTH ids' sessions, so the
 *    sparkline lenses cannot disagree with the Est. max trend beside them;
 *  - a deleted custom exercise and a snapshot-only exercise are named;
 *  - an assisted exercise and a distance exercise have no row (no estimated
 *    max), and a myo-reps set never sets a row's best.
 * Each test is written to fail against the code it replaces.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/Sparkline', () => () => null);
jest.mock('../../components/VolyumeChart', () => () => null);
jest.mock('../../components/PeekMenu', () => {
  const React = require('react');
  return React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: () => {}, close: () => {} }));
    return null;
  });
});
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));
jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseLookup: jest.fn(),
  getLatestBodyWeight: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllExercises, getExerciseLookup, getLatestBodyWeight,
} from '../../lib/database';
import { calculate1RM } from '../../lib/algorithms';
import { buildExerciseLookup } from '../../lib/exercise/lookup';
import { canonicalExerciseId } from '../../lib/exercise/canonicalId';
import LiftProgressScreen from '../LiftProgressScreen';

const RETIRED_ID = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR_ID = canonicalExerciseId('Machine Lateral Raise');

const store = { user: { id: 'user-1' }, units: 'kg' };
const nav = { navigate: jest.fn() };

const BENCH = { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', exerciseType: 'weight_reps', loadSemantics: 'total' };
const SURVIVOR = { id: SURVIVOR_ID, name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', exerciseType: 'weight_reps', loadSemantics: 'total' };
const DELETED_CUSTOM = {
  id: 'ex-custom-gone', name: 'Cable Crunch Pro', primaryMuscle: 'quads', exerciseType: 'weight_reps', loadSemantics: 'total',
  isCustom: 1, deletedAt: 1700000000000,
};
const ASSISTED = { id: 'assisted-pullup', name: 'Assisted Pull-Up', primaryMuscle: 'back', exerciseType: 'weighted_bodyweight', loadSemantics: 'assisted' };
const WALK = { id: 'heel-walk', name: 'Heel Walk', primaryMuscle: 'calves', exerciseType: 'distance', loadSemantics: 'total' };
const UNFILTERED = [BENCH, SURVIVOR, DELETED_CUSTOM, ASSISTED, WALK];
const FILTERED = [BENCH, SURVIVOR, ASSISTED, WALK];

function set({ exerciseId, workoutId, weight, reps, at, setType = 'straight', exerciseName = null }) {
  return {
    exerciseId, workoutId, weight, actualReps: reps, createdAt: at, setType, exerciseName,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function renderedText(element) {
  let tree;
  act(() => { tree = create(element); });
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out.join('');
}

function findMetricChip(headerTree, label) {
  return headerTree.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === `Show ${label} trend` && typeof n.props.onPress === 'function',
  )[0];
}

async function mountWith(sets) {
  getCompletedWorkoutSets.mockResolvedValue(sets);
  await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  useAppStore.mockImplementation((selector) => (typeof selector === 'function' ? selector(store) : store));
  getAllExercises.mockResolvedValue(FILTERED);
  getExerciseLookup.mockResolvedValue(buildExerciseLookup(UNFILTERED));
  getLatestBodyWeight.mockResolvedValue(null);
});

describe('Lift Progress rows come from the shared lookup (D218, F-4 and F-13)', () => {
  test('the loader reads the unfiltered lookup, never the filtered library', async () => {
    await mountWith([set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 })]);
    expect(getExerciseLookup).toHaveBeenCalled();
    expect(getAllExercises).not.toHaveBeenCalled();
    expect(capturedListProps.data.map((r) => r.name)).toEqual(['Barbell Bench Press']);
  });

  test('a lift logged under a retired id and its survivor is ONE row, named and placed from the survivor', async () => {
    await mountWith([
      set({ exerciseId: RETIRED_ID, workoutId: 'w1', weight: 30, reps: 12, at: 1000 }),
      set({ exerciseId: SURVIVOR_ID, workoutId: 'w2', weight: 25, reps: 10, at: 2000 }),
    ]);
    expect(capturedListProps.data).toHaveLength(1);
    const row = capturedListProps.data[0];
    expect(row.exerciseId).toBe(SURVIVOR_ID);
    expect(row.name).toBe('Machine Lateral Raise');
    expect(row.sessions).toBe(2);
    expect(row.bestE1rm).toBe(Math.round(calculate1RM(30, 12) * 10) / 10);
  });

  test('the other lenses of that row cover BOTH ids\' sessions (the heaviest lens finds the retired id\'s 30 kg)', async () => {
    await mountWith([
      set({ exerciseId: RETIRED_ID, workoutId: 'w1', weight: 30, reps: 12, at: 1000 }),
      set({ exerciseId: SURVIVOR_ID, workoutId: 'w2', weight: 25, reps: 10, at: 2000 }),
    ]);
    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    act(() => { findMetricChip(headerTree, 'Heaviest weight').props.onPress(); });
    const text = renderedText(capturedListProps.renderItem({ item: capturedListProps.data[0], index: 0 }));
    expect(text).toContain('30kg');
    expect(text).toContain('heaviest');
  });

  test('a deleted custom exercise is named, and a set known only by its snapshot is named from it', async () => {
    await mountWith([
      set({ exerciseId: 'ex-custom-gone', workoutId: 'w1', weight: 40, reps: 12, at: 1000 }),
      set({ exerciseId: 'ex-from-another-device', workoutId: 'w2', weight: 30, reps: 10, at: 2000, exerciseName: 'Landmine Press' }),
    ]);
    const names = capturedListProps.data.map((r) => r.name).sort();
    expect(names).toEqual(['Cable Crunch Pro', 'Landmine Press']);
    expect(names).not.toContain('Exercise');
  });

  test('an assisted exercise and a distance exercise have no row; a myo-reps set never sets a row\'s best', async () => {
    await mountWith([
      set({ exerciseId: 'assisted-pullup', workoutId: 'w1', weight: 40, reps: 8, at: 1000 }),
      set({ exerciseId: 'heel-walk', workoutId: 'w1', weight: 400, reps: 90, at: 1001 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1002 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 50, reps: 27, at: 1003, setType: 'myo_reps' }),
    ]);
    expect(capturedListProps.data.map((r) => r.exerciseId)).toEqual(['bench']);
    expect(capturedListProps.data[0].bestE1rm).toBe(Math.round(calculate1RM(100, 5) * 10) / 10);
  });
});
