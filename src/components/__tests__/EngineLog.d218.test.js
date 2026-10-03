/**
 * EngineLog.d218.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), audit finding F-15 and the P33 row of its path table
 * (docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md).
 *
 * The coaching log's "Rep regression" warning averaged the reps of every
 * set that was not a warm-up, so a myo-reps or rest-pause row (its reps are
 * the SUM of the efforts), an explosive row, a circuit row or a duration set
 * (its "reps" are seconds) could create or hide a regression, and an exercise
 * the filtered library could not resolve was flagged as "Unknown exercise".
 * Pins, against the REAL component (only its data reads are mocked):
 *  - a set counts only when it is trend-eligible (the EL-7 trend rule: no
 *    warm-up, myo-reps, rest-pause, explosive or circuit row) and its exercise
 *    is not a duration or distance type;
 *  - the warning names the exercise through the shared lookup (row name, else
 *    the set's own snapshot, else "Exercise"), never "Unknown exercise";
 *  - the loader reads `getExerciseLookup` (unfiltered, survivor-aware).
 * Each test is written to fail against the code it replaces.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ accessibility: {} })),
}));
jest.mock('../InfoTooltip', () => () => null);
jest.mock('../../lib/database', () => ({
  getRecentAdaptationEvents: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseLookup: jest.fn(),
}));

import EngineLog from '../EngineLog';
import * as database from '../../lib/database';
import { buildExerciseLookup } from '../../lib/exercise/lookup';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NOW = Date.now();

const BENCH = { id: 'bench', name: 'Bench Press', exerciseType: 'weight_reps' };
const PLANK = { id: 'plank', name: 'Plank', exerciseType: 'duration' };
const WALK = { id: 'heel-walk', name: 'Heel Walk', exerciseType: 'distance' };
const DELETED_CUSTOM = { id: 'ex-custom-gone', name: 'Cable Crunch Pro', exerciseType: 'weight_reps', isCustom: 1, deletedAt: 1700000000000 };
const ROWS = [BENCH, PLANK, WALK, DELETED_CUSTOM];

let n = 0;
// `weeksAgo` 0 is the most recent rolling week; mid-week so floor() is unambiguous.
function s(exerciseId, weeksAgo, reps, extra = {}) {
  n += 1;
  return {
    id: `s${n}`, exerciseId, createdAt: NOW - weeksAgo * WEEK_MS - 2 * 60 * 60 * 1000 - n, actualReps: reps, weight: 60, setType: 'straight', ...extra,
  };
}

// Two sets a week, reps falling by 3 a week (12 -> 9 -> 6): a regression.
function declining(exerciseId, extra = {}) {
  return [
    s(exerciseId, 2, 12, extra), s(exerciseId, 2, 12, extra),
    s(exerciseId, 1, 9, extra), s(exerciseId, 1, 9, extra),
    s(exerciseId, 0, 6, extra), s(exerciseId, 0, 6, extra),
  ];
}

async function flush() {
  await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
}

async function renderOpen() {
  let tree;
  await act(async () => { tree = create(<EngineLog userId="u1" />); });
  await flush();
  const header = tree.root.findAll((node) => node.props?.accessibilityRole === 'button' && typeof node.props.onPress === 'function')[0];
  if (header) await act(async () => { header.props.onPress(); });
  return tree;
}

const texts = (tree) => tree.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(''));

beforeEach(() => {
  jest.clearAllMocks();
  database.getRecentAdaptationEvents.mockResolvedValue([]);
  database.getAllExercises.mockResolvedValue(ROWS.filter((r) => !r.deletedAt));
  database.getExerciseLookup.mockResolvedValue(buildExerciseLookup(ROWS));
  database.getCompletedWorkoutSets.mockResolvedValue([]);
});

describe('F-15: which sets feed the rep average', () => {
  test('control: three falling weeks on an ordinary exercise warn, named', async () => {
    database.getCompletedWorkoutSets.mockResolvedValue(declining('bench'));
    const tree = await renderOpen();
    expect(texts(tree)).toContain('Bench Press: Rep regression');
  });

  test('cluster and explosive rows in the latest week no longer hide the regression (their reps are not a rep average)', async () => {
    database.getCompletedWorkoutSets.mockResolvedValue([
      ...declining('bench'),
      // Summed efforts and a light high-rep ballistic row: they would lift the latest week's average to 18.
      s('bench', 0, 30, { setType: 'myo_reps' }),
      s('bench', 0, 30, { setType: 'rest_pause' }),
      s('bench', 0, 30, { evidenceClass: 'ballistic' }),
      s('bench', 0, 30, { evidenceClass: 'circuit' }),
    ]);
    const tree = await renderOpen();
    expect(texts(tree)).toContain('Bench Press: Rep regression');
  });

  test('warm-ups still do not count', async () => {
    database.getCompletedWorkoutSets.mockResolvedValue([
      ...declining('bench'),
      s('bench', 0, 30, { setType: 'warmup' }),
      s('bench', 0, 30, { setType: 'warmup' }),
    ]);
    const tree = await renderOpen();
    expect(texts(tree)).toContain('Bench Press: Rep regression');
  });

  test('a duration or distance exercise never warns (its "reps" are seconds and metres)', async () => {
    database.getCompletedWorkoutSets.mockResolvedValue([...declining('plank'), ...declining('heel-walk')]);
    const tree = await renderOpen();
    // Nothing else logged: no warning, no adaptation, so the card does not render at all.
    expect(tree.toJSON()).toBeNull();
  });

  test('a cluster row cannot CREATE a regression either: the eligible sets alone are level', async () => {
    database.getCompletedWorkoutSets.mockResolvedValue([
      s('bench', 2, 8), s('bench', 2, 8), s('bench', 1, 8), s('bench', 1, 8), s('bench', 0, 8), s('bench', 0, 8),
      // Falling "reps" from summed efforts alone (30 -> 20 -> 10) would read as a regression.
      s('bench', 2, 30, { setType: 'myo_reps' }), s('bench', 2, 30, { setType: 'myo_reps' }),
      s('bench', 1, 20, { setType: 'myo_reps' }), s('bench', 1, 20, { setType: 'myo_reps' }),
      s('bench', 0, 10, { setType: 'myo_reps' }), s('bench', 0, 10, { setType: 'myo_reps' }),
    ]);
    const tree = await renderOpen();
    expect(tree.toJSON()).toBeNull();
  });
});

describe('F-15: the warning is named through the shared lookup', () => {
  test('a soft-deleted custom exercise is named by its row (the library read would have said "Unknown exercise")', async () => {
    database.getCompletedWorkoutSets.mockResolvedValue(declining('ex-custom-gone'));
    const tree = await renderOpen();
    const all = texts(tree);
    expect(all).toContain('Cable Crunch Pro: Rep regression');
    expect(all.join(' ')).not.toContain('Unknown exercise');
    expect(database.getExerciseLookup).toHaveBeenCalled();
    expect(database.getAllExercises).not.toHaveBeenCalled();
  });

  test('an exercise nothing resolves is named from its own snapshot, or "Exercise", never "Unknown exercise"', async () => {
    database.getCompletedWorkoutSets.mockResolvedValue([
      ...declining('ex-from-another-device', { exerciseName: 'Landmine Press' }),
      ...declining('ex-ghost'),
    ]);
    const tree = await renderOpen();
    const all = texts(tree);
    expect(all).toContain('Landmine Press: Rep regression');
    expect(all).toContain('Exercise: Rep regression');
    expect(all.join(' ')).not.toContain('Unknown exercise');
  });
});
