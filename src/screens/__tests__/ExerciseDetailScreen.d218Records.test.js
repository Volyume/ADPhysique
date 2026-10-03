/**
 * ExerciseDetailScreen.d218Records.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), audit findings F-5, F-6 and F-14
 * (docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md).
 *
 * Exercise Detail was a dead end for an exercise the app links to but the
 * library cannot resolve (a retired id before the launch repair, an id from
 * another device, a deleted custom exercise's neighbour): the History row and
 * the Lift Progress row showed it and opened a not-found card although the
 * sets were right there. Its Personal records card and the goal check read
 * the ungated set list, so a myo-reps or rest-pause row's summed reps inflated
 * "Est. max" and "Most reps" and could mark the person's own goal achieved (a
 * stored write with the congratulation banner), a distance exercise showed
 * "records" built from metres, and an assistance machine's assistance read as
 * a bigger lift. Pins, against the REAL screen (only the reads are mocked):
 *  - a route param that is a retired id is read as its survivor, for the
 *    exercise, its history and its goal;
 *  - F-5: with no exercise row but logged sets, the screen renders from a
 *    stand-in named by the shared lookup (the set's own snapshot): header,
 *    history, chart and records, one muted line saying so, and no goal,
 *    similar-exercises, edit or delete affordance; only with no sets either
 *    does the not-found card show;
 *  - F-14: Est. max, Heaviest weight and Most reps come only from rows
 *    isEstimatedMaxRow accepts; a distance or duration exercise has no
 *    records card; an assistance machine shows "Least assistance" (the lowest
 *    weight, ties to more reps) and "Most reps" and no Est. max; the goal is
 *    auto-achieved only for weight-and-reps exercises that are not assisted,
 *    on the gated best;
 *  - the screen's other Est. max readings (the overview line, the goal card's
 *    progress and each History session's line) read the same gated rows, so
 *    one screen cannot show two different bests (B5's pinned rule).
 * Each test is written to fail against the code it replaces.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../components/VolyumeChart', () => 'VolyumeChart');
jest.mock('../../components/WindowChips', () => 'WindowChips');
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: 'SkeletonCard' }));
jest.mock('../../components/AnimatedEntrance', () => 'AnimatedEntrance');
jest.mock('../../components/InfoTooltip', () => 'InfoTooltip');
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' },
    units: 'kg',
    accessibility: { reduceMotion: true },
  })),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/database', () => ({
  getExerciseById: jest.fn(),
  getCompletedSetHistoryForExercise: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseLookup: jest.fn(),
  getExerciseGoal: jest.fn(),
  saveExerciseGoal: jest.fn(),
  markGoalAchieved: jest.fn(),
  deleteExerciseGoal: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn() }));
jest.mock('../../lib/swapEngine', () => ({ rankSwaps: jest.fn(() => []) }));

import ExerciseDetailScreen from '../ExerciseDetailScreen';
import {
  getExerciseById, getCompletedSetHistoryForExercise, getExerciseGoal, getAllExercises,
  getExerciseLookup, markGoalAchieved,
} from '../../lib/database';
import { rankSwaps } from '../../lib/swapEngine';
import { calculate1RM } from '../../lib/algorithms';
import { buildExerciseLookup } from '../../lib/exercise/lookup';
import { canonicalExerciseId } from '../../lib/exercise/canonicalId';

const RETIRED_ID = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR_ID = canonicalExerciseId('Machine Lateral Raise');

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

const BENCH = {
  id: 'e1', name: 'Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: [],
  defaultRepMin: 6, defaultRepMax: 12, exerciseType: 'weight_reps', loadSemantics: 'total',
};
const ASSISTED = {
  id: 'e1', name: 'Assisted Pull-Up', primaryMuscle: 'back', secondaryMuscles: [],
  defaultRepMin: 6, defaultRepMax: 12, exerciseType: 'weighted_bodyweight', loadSemantics: 'assisted',
};
const DISTANCE = {
  id: 'e1', name: 'Heel Walk', primaryMuscle: 'calves', secondaryMuscles: [],
  defaultRepMin: 1, defaultRepMax: 1, exerciseType: 'distance', loadSemantics: 'total',
};
const DURATION = {
  id: 'e1', name: 'Weighted Plank', primaryMuscle: 'abs', secondaryMuscles: [],
  defaultRepMin: 1, defaultRepMax: 1, exerciseType: 'duration', loadSemantics: 'total',
};

let setCounter = 0;
// Newest first, as getCompletedSetHistoryForExercise returns them.
function row(workoutId, weight, reps, createdAt, extra = {}) {
  setCounter += 1;
  return {
    id: `s${setCounter}`, workoutId, exerciseId: 'e1', weight, actualReps: reps, setType: 'straight', createdAt, ...extra,
  };
}

async function mount({ exercise, sets, goal = null, routeId = 'e1' }) {
  getExerciseById.mockResolvedValue(exercise);
  getCompletedSetHistoryForExercise.mockResolvedValue(sets);
  getExerciseGoal.mockResolvedValue(goal);
  let tree;
  await act(async () => {
    tree = create(
      <ExerciseDetailScreen
        navigation={{ goBack: jest.fn(), push: jest.fn() }}
        route={{ params: { exerciseId: routeId } }}
      />,
    );
  });
  await flush();
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  setCounter = 0;
  getAllExercises.mockResolvedValue([]);
  getExerciseLookup.mockResolvedValue(buildExerciseLookup([BENCH]));
  getExerciseGoal.mockResolvedValue(null);
});

describe('F-6: a retired id in the route is read as its survivor', () => {
  test('the exercise, its history and its goal are all read under the survivor id', async () => {
    await mount({
      exercise: { ...BENCH, id: SURVIVOR_ID, name: 'Machine Lateral Raise' },
      sets: [row('w1', 20, 12, 1000, { exerciseId: SURVIVOR_ID })],
      routeId: RETIRED_ID,
    });
    expect(getExerciseById).toHaveBeenCalledWith(SURVIVOR_ID);
    expect(getCompletedSetHistoryForExercise).toHaveBeenCalledWith(SURVIVOR_ID, 'u1');
    expect(getExerciseGoal).toHaveBeenCalledWith('u1', SURVIVOR_ID);
    expect(getExerciseById).not.toHaveBeenCalledWith(RETIRED_ID);
  });
});

describe('F-5: an exercise with no library row but logged sets still opens', () => {
  const SNAPSHOT_SETS = [
    row('w2', 62.5, 8, 2000, { exerciseId: 'ex-from-another-device', exerciseName: 'Landmine Press' }),
    row('w1', 60, 8, 1000, { exerciseId: 'ex-from-another-device', exerciseName: 'Landmine Press' }),
  ];

  test('renders the header named from the snapshot, the one muted line, the history and the records', async () => {
    const tree = await mount({ exercise: null, sets: SNAPSHOT_SETS, routeId: 'ex-from-another-device' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Landmine Press');
    expect(text).toContain('This exercise is not in your library on this device. Its logged sets are shown here.');
    expect(text).toContain('History (last 2 sessions)');
    expect(text).toContain('62.5kg x 8');
    expect(text).toContain('Personal records');
    expect(text).toContain(calculate1RM(62.5, 8).toFixed(1));
    // Not the not-found card.
    expect(text).not.toContain("Couldn't load exercise details");
  });

  test('hides the goal, similar-exercises, edit and delete affordances, and never reads a goal or substitutes for it', async () => {
    const tree = await mount({ exercise: null, sets: SNAPSHOT_SETS, routeId: 'ex-from-another-device' });
    const text = flattenText(tree.toJSON());
    // The stand-in screen is what rendered (so the absences below mean something).
    expect(text).toContain('Landmine Press');
    expect(text).toContain('History (last 2 sessions)');
    expect(text).not.toContain('Set a target weight');
    expect(text).not.toContain('Edit target');
    expect(text).not.toContain('Delete exercise');
    expect(text).not.toContain('Similar exercises');
    // The goal sheet itself is mounted but closed; no control opens it.
    const pressable = (label) => tree.root.findAll(
      (n) => n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function',
    );
    expect(pressable('Set a target weight')).toHaveLength(0);
    expect(pressable('Edit target')).toHaveLength(0);
    expect(rankSwaps).not.toHaveBeenCalled();
    expect(markGoalAchieved).not.toHaveBeenCalled();
    // None of the library's placeholder facts are invented for it.
    expect(text).not.toContain('Quality');
    expect(text).not.toContain('Rep range');
  });

  test('the name comes through the shared lookup: a retired name reads as its survivor, and with nothing to go on it is "Exercise"', async () => {
    let tree = await mount({
      exercise: null,
      sets: [row('w1', 20, 12, 1000, { exerciseId: 'ex-old', exerciseName: 'Lateral Raise Machine' })],
      routeId: 'ex-old',
    });
    expect(flattenText(tree.toJSON())).toContain('Lateral Raise Machine'.replace('Lateral Raise Machine', 'Machine Lateral Raise'));
    tree = await mount({ exercise: null, sets: [row('w1', 20, 12, 1000, { exerciseId: 'ex-ghost' })], routeId: 'ex-ghost' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('This exercise is not in your library on this device.');
    expect(text).toContain('Exercise');
  });

  test('only with no sets either does the existing not-found card show', async () => {
    const tree = await mount({ exercise: null, sets: [], routeId: 'ex-ghost' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load exercise details");
    expect(text).not.toContain('This exercise is not in your library on this device.');
  });
});

describe('F-14: the Personal records card reads only estimated-max rows', () => {
  test('a myo-reps row never feeds Est. max or Most reps', async () => {
    const genuine = row('w1', 60, 5, 1000);
    const lighter = row('w1', 40, 12, 1001);
    const cluster = row('w2', 50, 27, 2000, { setType: 'myo_reps' });
    const tree = await mount({ exercise: BENCH, sets: [cluster, lighter, genuine] });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(calculate1RM(60, 5).toFixed(1));
    expect(text).not.toContain(calculate1RM(50, 27).toFixed(1));
    expect(text).toContain('40kg x 12 reps');
    // The records read "<weight> x <reps> reps"; the logged set itself still
    // lists in the History card ("50kg x 27").
    expect(text).not.toContain('x 27 reps');
    expect(text).toContain('50kg x 27');
  });

  test('a rest-pause row and an explosive row are refused too', async () => {
    const tree = await mount({
      exercise: BENCH,
      sets: [
        row('w2', 50, 30, 2002, { setType: 'rest_pause' }),
        row('w2', 30, 40, 2001, { evidenceClass: 'ballistic' }),
        row('w1', 60, 5, 1000),
      ],
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(calculate1RM(60, 5).toFixed(1));
    expect(text).not.toContain('x 30 reps');
    expect(text).not.toContain('x 40 reps');
    expect(text).not.toContain('Most reps');
  });

  test('a distance or duration exercise has no records card and no Est. max line', async () => {
    for (const exercise of [DISTANCE, DURATION]) {
      const tree = await mount({ exercise, sets: [row('w1', 400, 90, 1000), row('w0', 380, 85, 500)] });
      const text = flattenText(tree.toJSON());
      expect(text).not.toContain('Personal records');
      expect(text).not.toContain('Est. max');
      expect(text).not.toContain('Estimated max');
      expect(text).not.toContain('Heaviest weight');
      // The history is still listed.
      expect(text).toContain('History (last 2 sessions)');
    }
  });

  test('an assistance machine shows Least assistance (lowest weight, ties to more reps) and Most reps, with no Est. max', async () => {
    const tree = await mount({
      exercise: ASSISTED,
      sets: [
        row('w4', 50, 12, 4000),
        row('w3', 30, 10, 3000),
        row('w2', 30, 8, 2000),
        row('w1', 40, 8, 1000),
      ],
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Personal records');
    expect(text).toContain('Least assistance');
    expect(text).toContain('30.0kg');
    expect(text).toContain('30kg x 10 reps');
    expect(text).toContain('Most reps');
    // Review of D218 (NIT 13): the number is the help, and says so, in the
    // card and in the list; "50kg x 12" alone read as a load.
    expect(text).toContain('50kg assistance x 12Most reps');
    expect(text).toContain('Most reps50kg assistance x 12 reps');
    expect(text).not.toContain('50kg x 12Most reps');
    expect(text).not.toContain('Most reps50kg x 12 reps');
    // The hero and the list: no Est. max, no Heaviest weight, no overview line
    // and no per-session line (the chart's lens chips keep their own labels).
    expect(text).toContain('Personal records30.0kgLeast assistance');
    expect(text).toContain('Personal recordsLeast assistance30kg x 10 reps');
    expect(text).not.toContain('Personal recordsEst. max');
    expect(text).not.toContain('Est. max:');
    expect(text).not.toContain('Estimated max');
    expect(text).not.toContain('Heaviest weight');
  });

  test('an ordinary weight-and-reps exercise is unchanged: Est. max, Heaviest weight and Most reps', async () => {
    const tree = await mount({
      exercise: BENCH,
      sets: [row('w2', 80, 3, 2000), row('w1', 60, 12, 1000)],
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Est. max');
    expect(text).toContain('Most reps');
    expect(text).toContain('60kg x 12');
    expect(text).toContain('80kg x 3');
  });

  test('a weighted-bodyweight exercise that is not assisted keeps its records', async () => {
    const tree = await mount({
      exercise: { ...BENCH, name: 'Weighted Dip', exerciseType: 'weighted_bodyweight', loadSemantics: 'added_bodyweight' },
      sets: [row('w1', 20, 8, 1000)],
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Personal records');
    expect(text).toContain(calculate1RM(20, 8).toFixed(1));
  });
});

describe('F-14: goal auto-achievement runs only on the gated best', () => {
  const goal = (targetWeight) => ({ id: 'g1', targetWeight, targetDate: null, achievedAt: null });

  test('a myo-reps row that reaches the target does not mark the goal achieved', async () => {
    // Genuine best ~70; the cluster row's summed 27 reps would read ~83 against a target of 80.
    const tree = await mount({
      exercise: BENCH,
      sets: [row('w2', 50, 27, 2000, { setType: 'myo_reps' }), row('w1', 60, 5, 1000)],
      goal: goal(80),
    });
    expect(markGoalAchieved).not.toHaveBeenCalled();
    expect(flattenText(tree.toJSON())).not.toContain("You've hit your target");
  });

  test('a genuine best that reaches the target still marks it achieved', async () => {
    await mount({
      exercise: BENCH,
      sets: [row('w1', 100, 5, 1000)],
      goal: goal(80),
    });
    expect(markGoalAchieved).toHaveBeenCalledWith('g1');
  });

  test('an assistance machine and a distance exercise never auto-achieve a goal', async () => {
    await mount({ exercise: ASSISTED, sets: [row('w1', 30, 8, 1000)], goal: goal(20) });
    await mount({ exercise: DISTANCE, sets: [row('w1', 400, 90, 1000)], goal: goal(100) });
    expect(markGoalAchieved).not.toHaveBeenCalled();
  });
});

describe('the screen shows ONE best: the overview line, the goal card and each session read the same rows', () => {
  test('the overview "Estimated max" and the goal card\'s current figure ignore a myo-reps row', async () => {
    const tree = await mount({
      exercise: BENCH,
      sets: [row('w2', 50, 27, 2000, { setType: 'myo_reps' }), row('w1', 60, 5, 1000)],
      goal: { id: 'g1', targetWeight: 200, targetDate: null, achievedAt: null },
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(`Estimated max: ~${Math.round(calculate1RM(60, 5))}`);
    expect(text).not.toContain(`Estimated max: ~${Math.round(calculate1RM(50, 27))}`);
    // Goal card "Current est. max" (1 decimal) is the genuine best.
    expect(text).toContain(`${calculate1RM(60, 5).toFixed(1)}kg`);
    expect(text).not.toContain(`${calculate1RM(50, 27).toFixed(1)}kg`);
  });

  test('an assistance machine has no overview Est. max and no session Est. max line; a distance exercise neither', async () => {
    for (const exercise of [ASSISTED, DISTANCE]) {
      const tree = await mount({ exercise, sets: [row('w1', 30, 8, 1000)] });
      const text = flattenText(tree.toJSON());
      expect(text).not.toContain('Estimated max');
      expect(text).not.toContain('Est. max');
    }
  });

  test('each History session\'s Est. max ignores a myo-reps row in that session', async () => {
    const tree = await mount({
      exercise: BENCH,
      sets: [row('w1', 50, 27, 1002, { setType: 'myo_reps' }), row('w1', 60, 5, 1001)],
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(`Est. max: ~${calculate1RM(60, 5).toFixed(0)}kg`);
    expect(text).not.toContain(`Est. max: ~${calculate1RM(50, 27).toFixed(0)}kg`);
  });
});

// Lead review (D218, 2026-10-03): what the chart and the target card may say.
// An assistance machine has no estimated max and its help is not weight
// lifted, so its chart offers the assistance used and the reps, and never a
// takeaway calling the most help its "best". A target is an estimated max, so
// the target card and its button appear only where one exists.
describe('lead review: truthful chart lenses and target card', () => {
  test('an assistance machine\'s chart offers Assistance and Total reps only, with no "best" takeaway', async () => {
    const tree = await mount({
      exercise: ASSISTED,
      sets: [row('w3', 20, 10, 3000), row('w2', 30, 10, 2000), row('w1', 40, 10, 1000)],
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Strength trend');
    expect(text).toContain('Assistance');
    expect(text).toContain('Total reps');
    expect(text).not.toContain('Max weight');
    expect(text).not.toContain('Total lifted');
    expect(text).not.toContain('Best-set lifted');
    expect(text).not.toMatch(/best \d+/i);
  });

  test('an ordinary exercise keeps every lens', async () => {
    const tree = await mount({
      exercise: BENCH,
      sets: [row('w2', 100, 5, 2000), row('w1', 90, 5, 1000)],
    });
    const text = flattenText(tree.toJSON());
    for (const label of ['Est. max', 'Max weight', 'Total reps', 'Total lifted', 'Best-set lifted']) expect(text).toContain(label);
  });

  test('no target card or button on a distance exercise or an assistance machine, even with a stored target', async () => {
    const heel = await mount({ exercise: DISTANCE, sets: [row('w1', 400, 90, 1000)], goal: { id: 'g1', targetWeight: 100, achievedAt: null } });
    let text = flattenText(heel.toJSON());
    expect(text).not.toContain('Set a target weight');
    expect(text).not.toContain('to go');
    const assisted = await mount({ exercise: ASSISTED, sets: [row('w1', 30, 8, 1000)] });
    text = flattenText(assisted.toJSON());
    expect(text).not.toContain('Set a target weight');
  });

  test('an ordinary exercise still offers a target', async () => {
    const tree = await mount({ exercise: BENCH, sets: [row('w1', 100, 5, 1000)] });
    expect(flattenText(tree.toJSON())).toContain('Set a target weight');
  });
});
