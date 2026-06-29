/**
 * ManualBuilderScreen — the three routine-builder usability fixes
 * (hevy-teardown-2026-06-29/U4-task-friction.md §2, 02-routines-programs.md R3).
 * Invariants, against the REAL screen with the DB write-path mocked at the
 * service boundary:
 *   1. the day-count selector creates exactly N empty days (not always 4), and
 *   2. grouping two exercises in a day persists a SHARED supersetGroupId via the
 *      existing addExerciseToRoutine write path (no schema/write-path change).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/ExercisePickerModal', () => () => null);
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('../../lib/database', () => ({
  createProgramme: jest.fn(async () => ({ id: 'prog-1' })),
  createRoutine: jest.fn(async (uid, name) => ({ id: `routine-${name}` })),
  addExerciseToRoutine: jest.fn(async () => ({})),
  activatePlanWithBlock: jest.fn(async () => ({})),
}));

import useAppStore from '../../store/useAppStore';
import {
  createProgramme, createRoutine, addExerciseToRoutine, activatePlanWithBlock,
} from '../../lib/database';
import ManualBuilderScreen from '../ManualBuilderScreen';

const store = { user: { id: 'user-1' } };
const nav = { navigate: jest.fn() };

// All distinct pressables carrying an accessibilityLabel + onPress.
// react-test-renderer surfaces both the composite TouchableOpacity and a
// host wrapper for one button, so dedupe on the onPress identity.
function pressables(tree, label) {
  const seen = new Set();
  const out = [];
  for (const n of tree.root.findAll(
    x => x.props && x.props.accessibilityLabel === label && typeof x.props.onPress === 'function',
  )) {
    if (seen.has(n.props.onPress)) continue;
    seen.add(n.props.onPress);
    out.push(n);
  }
  return out;
}

// Find a touchable in the tree by its accessibilityLabel and fire onPress.
function press(tree, label) {
  const node = pressables(tree, label)[0];
  if (!node) throw new Error(`No pressable with label "${label}"`);
  act(() => { node.props.onPress(); });
}

// useAppStore is destructured ({ user }) in the screen, so it's called
// without a selector — return the store object directly in that case.
beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) =>
    (typeof selector === 'function' ? selector(store) : store));
});

function setPlanName(tree, value) {
  const input = tree.root.findAll(
    n => n.props && n.props.placeholder === 'e.g. My Push Pull Legs',
  )[0];
  act(() => { input.props.onChangeText(value); });
}

describe('ManualBuilderScreen — selectable days-per-week', () => {
  test('picking 3 days creates exactly 3 empty day cards (not 4)', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });

    setPlanName(tree, 'My Split');
    press(tree, '3 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    // Page 2: one "Add exercise" affordance per day card.
    expect(pressables(tree, 'Add exercise')).toHaveLength(3);
  });

  test('default remains 4 days when the selector is untouched', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Default Plan');
    await act(async () => { press(tree, 'Create plan and add workouts'); });
    expect(pressables(tree, 'Add exercise')).toHaveLength(4);
  });
});

describe('ManualBuilderScreen — manual superset persistence', () => {
  test('grouping two exercises in a day writes a shared supersetGroupId', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'SS Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    // Add two exercises to day 1 via the picker's onSelect.
    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    // openPicker(0) — tap the first day's Add exercise.
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Row', primaryMuscle: 'back' }); });

    // Select both rows, then group.
    press(tree, 'Bench Press, 3 sets');
    press(tree, 'Row, 3 sets');
    press(tree, 'Group 2 exercises into a superset');

    // Remove the empty second day so the activate gate is satisfiable
    // (also exercises the new per-day delete control).
    press(tree, 'Remove Day 2');

    // Save & Activate to drive persistDays.
    await act(async () => { press(tree, 'Save and activate'); });

    expect(createProgramme).toHaveBeenCalled();
    expect(createRoutine).toHaveBeenCalled();
    expect(activatePlanWithBlock).toHaveBeenCalled();

    // The two exercises persisted with the SAME, non-null superset group id.
    const calls = addExerciseToRoutine.mock.calls;
    expect(calls).toHaveLength(2);
    const groupIds = calls.map(c => c[9]); // 10th arg = supersetGroupId
    expect(groupIds[0]).toBeTruthy();
    expect(groupIds[0]).toBe(groupIds[1]);
  });
});
