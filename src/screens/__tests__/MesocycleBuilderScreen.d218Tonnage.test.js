/**
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"; audit docs/audit/exercise-logging-reporting-audit-2026-10-03/
 * 00-FINDINGS.md, F-8 part 2 and P34): the "Weekly load (kg moved)" bars on
 * the active block's dashboard reduce each week's sets with calculateTonnage
 * using EACH SET'S OWN exercise type and load semantics, read from the shared
 * lookup (getExerciseLookup, unfiltered and survivor-aware).
 *
 * Before D218 the bars passed no type map (and built the semantics map from
 * the filtered library), so a distance set's metres x seconds were counted as
 * kilograms (a heel walk of 400 x 90 added 36,000 kg to a week) and a
 * soft-deleted custom exercise's per-hand sets were counted once. This pins,
 * against the real screen, one week holding:
 *  - a bench press (weight and reps, total): 3 x 10 x 100 = 3,000;
 *  - a heel walk (distance, metres in the weight column): 0, not 36,000;
 *  - a dumbbell curl (per hand): 3 x 10 x 30 x 2 = 1,800;
 *  - an assisted pull-up (the number is the machine's help): 0;
 *  - a soft-deleted custom per-hand exercise, known only to the lookup:
 *    2 x 10 x 20 x 2 = 800;
 * so the week's bar reads 5,600. A lookup read that FAILS stays best-effort,
 * as the library read always was: the dashboard still renders, with the plain
 * unmapped totals, and is never an error state.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
// A host stand-in that keeps its props, so the bars the screen computed can be read.
jest.mock('../../components/SvgBarSparkline', () => {
  const React = require('react');
  return { __esModule: true, default: (props) => React.createElement('SvgBarSparkline', props) };
});
jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/Button', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress, accessibilityLabel }) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel || title} onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));

let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));

jest.mock('../../lib/database', () => ({
  getAllMesocycles: jest.fn(),
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  // The FILTERED library (a soft-deleted custom exercise is not in it).
  getAllExercises: jest.fn(),
  // The shared UNFILTERED lookup, which the bars must read.
  getExerciseLookup: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import {
  getAllMesocycles, getAllWorkouts, getCompletedWorkoutSets, getActivePlan, getRoutinesForPlan,
  getAllExercises, getExerciseLookup,
} from '../../lib/database';
import { buildExerciseLookup } from '../../lib/exercise/lookup';
import MesocycleBuilderScreen from '../MesocycleBuilderScreen';

const store = { user: { id: 'user-1' } };
const nav = { navigate: jest.fn() };

const DAY = 24 * 60 * 60 * 1000;
const START_DATE = '2026-09-28';
const START_MS = new Date(START_DATE).getTime();
const WEEK_1 = START_MS + 2 * DAY;
const WEEK_2 = START_MS + 9 * DAY;

const ACTIVE_BLOCK = {
  id: 'm1', name: 'Strength block', isActive: true, durationWeeks: 4, deloadWeek: 4,
  startDate: START_DATE, endDate: null, focus: 'Strength',
};

const BENCH = { id: 'ex-bench', name: 'Bench Press', exerciseType: 'weight_reps', loadSemantics: 'total' };
const HEEL_WALK = { id: 'ex-heel-walk', name: 'Heel Walk', exerciseType: 'distance', loadSemantics: 'total' };
const DB_CURL = { id: 'ex-db-curl', name: 'Dumbbell Curl', exerciseType: 'weight_reps', loadSemantics: 'per_hand' };
const ASSISTED_PULLUP = { id: 'ex-assisted', name: 'Assisted Pull-Up', exerciseType: 'weight_reps', loadSemantics: 'assisted' };
const DELETED_CUSTOM = {
  id: 'ex-custom-db', name: 'Hammer Curl X', exerciseType: 'weight_reps', loadSemantics: 'per_hand',
  isCustom: 1, deletedAt: START_MS + DAY,
};
const LIVE_LIBRARY = [BENCH, HEEL_WALK, DB_CURL, ASSISTED_PULLUP];

let seq = 0;
function sets(exerciseId, count, weight, reps, createdAt) {
  return Array.from({ length: count }, () => {
    seq += 1;
    return { id: `s-${seq}`, exerciseId, weight, actualReps: reps, setType: 'straight', createdAt };
  });
}

const WEEK_ONE_SETS = [
  ...sets('ex-bench', 3, 100, 10, WEEK_1),
  ...sets('ex-heel-walk', 1, 400, 90, WEEK_1),
  ...sets('ex-db-curl', 3, 30, 10, WEEK_1),
  ...sets('ex-assisted', 2, 40, 8, WEEK_1),
  ...sets('ex-custom-db', 2, 20, 10, WEEK_1),
];

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

async function mountAndReadBars() {
  await act(async () => { create(<MesocycleBuilderScreen navigation={nav} />); });
  await flush();
  expect(capturedListProps).toBeTruthy();
  let header;
  act(() => { header = create(capturedListProps.ListHeaderComponent); });
  const chart = header.root.findAll((n) => n.type === 'SvgBarSparkline')[0];
  return { header, chart, bars: chart ? chart.props.data : null };
}

beforeEach(() => {
  jest.clearAllMocks();
  seq = 0;
  capturedListProps = null;
  useAppStore.mockImplementation((selector) =>
    (typeof selector === 'function' ? selector(store) : store));
  getAllMesocycles.mockResolvedValue([ACTIVE_BLOCK]);
  getAllWorkouts.mockResolvedValue([]);
  getCompletedWorkoutSets.mockResolvedValue(WEEK_ONE_SETS);
  getActivePlan.mockResolvedValue(null);
  getRoutinesForPlan.mockResolvedValue([]);
  getAllExercises.mockResolvedValue(LIVE_LIBRARY);
  getExerciseLookup.mockResolvedValue(buildExerciseLookup([...LIVE_LIBRARY, DELETED_CUSTOM]));
});

describe('D218 (F-8 part 2, P34): the block\'s weekly load bars read each set\'s own type and load semantics', () => {
  test('a distance set is not kilograms, per hand counts twice, assistance counts nothing, a deleted custom exercise still counts', async () => {
    const { bars } = await mountAndReadBars();
    expect(bars).toHaveLength(4);
    // 3,000 bench + 0 heel walk + 1,800 dumbbell + 0 assisted + 800 deleted custom.
    expect(bars[0].value).toBe(5600);
    expect(bars.map((b) => b.label)).toEqual(['W1', 'W2', 'W3', 'W4']);
    expect(bars.slice(1).map((b) => b.value)).toEqual([0, 0, 0]);
  });

  test('a week holding only a distance set draws a zero bar, so a heel walk can never lift a week\'s load', async () => {
    getCompletedWorkoutSets.mockResolvedValue([
      ...sets('ex-bench', 1, 100, 10, WEEK_1),
      ...sets('ex-heel-walk', 2, 400, 90, WEEK_2),
    ]);
    const { bars } = await mountAndReadBars();
    expect(bars[0].value).toBe(1000);
    expect(bars[1].value).toBe(0);
  });

  test('a lookup that cannot be read stays best-effort: the dashboard still draws, with the plain unmapped totals', async () => {
    getExerciseLookup.mockRejectedValue(new Error('exercises unreadable'));
    getCompletedWorkoutSets.mockResolvedValue(sets('ex-bench', 3, 100, 10, WEEK_1));
    const { header, bars } = await mountAndReadBars();
    expect(bars[0].value).toBe(3000);
    // The dashboard card itself is drawn (by name, so the check does not depend on today's date).
    expect(flattenText(header.toJSON())).toContain('Strength block');
    // With the dashboard drawn there is no empty or error state at all.
    expect(capturedListProps.ListEmptyComponent).toBeNull();
  });

  test('source guard: the bars use setMapsFor over the lookup, in the documented argument order', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'MesocycleBuilderScreen.js'), 'utf8');
    expect(src).toMatch(/getExerciseLookup/);
    expect(src).toMatch(/const maps = setMapsFor\(wkSets, lookup\);/);
    expect(src).toMatch(/calculateTonnage\(wkSets, maps\.exerciseTypeById, maps\.loadSemanticsById\)/);
    expect(src).not.toMatch(/calculateTonnage\(wkSets, null/);
  });
});
