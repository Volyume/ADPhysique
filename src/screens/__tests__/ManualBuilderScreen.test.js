/**
 * ManualBuilderScreen — the three routine-builder usability fixes
 * (hevy-teardown-2026-06-29/U4-task-friction.md §2, 02-routines-programs.md R3)
 * plus the S5 plan-authoring-spine follow-ups (docs/world-class-audit-2026-07-03/
 * _SYNTHESIS.md:148-153). Invariants, against the REAL screen with the DB
 * write-path mocked at the service boundary:
 *   1. the day-count selector creates exactly N empty days (not always 4);
 *   2. grouping two exercises in a day persists a SHARED supersetGroupId via the
 *      existing addExerciseToRoutine write path (no schema/write-path change);
 *   3. sets/reps/rest are editable via +/- steppers, not read-only text;
 *   4. duplicating a day clones it with fresh ids right after the original; and
 *   5. opening the screen with a planId loads straight into the editor and
 *      saves back onto the SAME routines (never re-creating them), including
 *      soft-deleting a day removed during that edit.
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
jest.mock('../../lib/database', () => {
  let uidCounter = 0;
  return {
    createProgramme: jest.fn(async () => ({ id: 'prog-1' })),
    createRoutine: jest.fn(async (uid, name) => ({ id: `routine-${name}` })),
    addExerciseToRoutine: jest.fn(async () => ({})),
    activatePlanWithBlock: jest.fn(async () => ({})),
    // Real-enough for the duplicate tests: a fresh id every call.
    uid: jest.fn(() => `uid-${++uidCounter}`),
    // Edit-mode fixture: a two-day plan, one day with an existing exercise.
    getProgrammeById: jest.fn(async () => ({ id: 'plan-1', name: 'Push Pull Legs' })),
    getRoutinesForPlan: jest.fn(async () => ([
      { id: 'routine-existing-1', name: 'Push Day' },
      { id: 'routine-existing-2', name: 'Pull Day' },
    ])),
    getRoutineExercisesWithDetails: jest.fn(async (routineId) => {
      if (routineId === 'routine-existing-1') {
        return [{
          routineExercise: {
            id: 're-1', recommendedSets: 4, recommendedRepsMin: 6,
            recommendedRepsMax: 10, restSeconds: 120, supersetGroupId: null,
          },
          exercise: { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest' },
        }];
      }
      return [];
    }),
    updateRoutineName: jest.fn(async () => {}),
    removeExerciseFromRoutine: jest.fn(async () => {}),
    softDeleteRoutine: jest.fn(async () => {}),
  };
});

import useAppStore from '../../store/useAppStore';
import {
  createProgramme, createRoutine, addExerciseToRoutine, activatePlanWithBlock,
  getProgrammeById, getRoutinesForPlan, updateRoutineName,
  removeExerciseFromRoutine, softDeleteRoutine,
} from '../../lib/database';
import ManualBuilderScreen from '../ManualBuilderScreen';

const store = { user: { id: 'user-1' } };
const nav = { navigate: jest.fn(), goBack: jest.fn() };

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

// Any node (not just pressables) carrying this accessibilityLabel — used to
// read the stepper's current displayed value, which lives on a plain Text.
// { deep: false } stops descending once a node matches, the same
// composite-wraps-host duplication pressables() dedupes via onPress, but
// values (Text) have no onPress to key off, so this is the general fix.
function findByLabel(tree, label) {
  return tree.root.findAll(
    n => n.props && n.props.accessibilityLabel === label,
    { deep: false },
  );
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

describe('ManualBuilderScreen — target steppers (S5)', () => {
  test('sets, reps and rest are editable via +/- steppers, not read-only text', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Stepper Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Squat', primaryMuscle: 'quads' }); });

    // Starting targets: 3 sets, 8-12 reps (unchanged defaults). The row's
    // own accessibilityLabel is a pressable (selects it for a superset),
    // so use pressables() rather than findByLabel() here.
    expect(pressables(tree, 'Squat, 3 sets').length).toBe(1);

    press(tree, 'Increase sets for Squat');
    expect(pressables(tree, 'Squat, 4 sets').length).toBe(1);

    press(tree, 'Increase minimum reps for Squat');
    expect(findByLabel(tree, '9 minimum reps').length).toBe(1);

    // No compoundIsolation tag on the picker payload, so Squat suggests the
    // 90s isolation default (1m 30s); one -15s step reads as 1m 15s.
    expect(findByLabel(tree, 'Rest 1m 30s').length).toBe(1);
    press(tree, 'Decrease rest for Squat');
    expect(findByLabel(tree, 'Rest 1m 15s').length).toBe(1);
  });
});

describe('ManualBuilderScreen — duplicate day (S5)', () => {
  test('duplicating a day clones its exercises with a fresh id and a "(copy)" name', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Dup Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });

    press(tree, 'Duplicate Day 1');

    // Three day cards now: Day 1, its copy, Day 2 — one Add Exercise each.
    expect(pressables(tree, 'Add exercise')).toHaveLength(3);
    const dayNames = tree.root
      .findAll(n => n.props && n.props.placeholder === 'Day name')
      .map(n => n.props.value);
    expect(dayNames).toContain('Day 1 (copy)');
    // The clone carries its own copy of the exercise, selectable independently.
    expect(pressables(tree, 'Bench Press, 3 sets').length).toBe(2);
  });
});

describe('ManualBuilderScreen — editing an existing plan (S5)', () => {
  async function renderEditMode() {
    let tree;
    await act(async () => {
      tree = create(<ManualBuilderScreen navigation={nav} route={{ params: { planId: 'plan-1' } }} />);
    });
    // Drain the load effect's nested awaits (getProgrammeById +
    // getRoutinesForPlan, then a getRoutineExercisesWithDetails per day).
    await act(async () => {});
    return tree;
  }

  test('a planId loads straight into the editor with the existing exercise editable', async () => {
    const tree = await renderEditMode();

    expect(getProgrammeById).toHaveBeenCalledWith('plan-1');
    expect(getRoutinesForPlan).toHaveBeenCalledWith('plan-1');
    // Page 2 rendered directly: no "Create plan and add workouts" page 1,
    // one Add Exercise affordance per loaded day.
    expect(pressables(tree, 'Create plan and add workouts')).toHaveLength(0);
    expect(pressables(tree, 'Add exercise')).toHaveLength(2);
    // The existing exercise's saved targets came across and are editable.
    expect(pressables(tree, 'Bench Press, 4 sets').length).toBe(1);
    expect(pressables(tree, 'Increase sets for Bench Press').length).toBe(1);
    // One calm Save, no separate Activate step.
    expect(pressables(tree, 'Save changes').length).toBe(1);
    expect(pressables(tree, 'Save and activate')).toHaveLength(0);
  });

  test('saving updates the existing routines instead of creating new ones', async () => {
    const tree = await renderEditMode();

    await act(async () => { press(tree, 'Save changes'); });

    expect(createProgramme).not.toHaveBeenCalled();
    expect(createRoutine).not.toHaveBeenCalled();
    expect(updateRoutineName).toHaveBeenCalledWith('routine-existing-1', 'Push Day');
    expect(updateRoutineName).toHaveBeenCalledWith('routine-existing-2', 'Pull Day');
    expect(removeExerciseFromRoutine).toHaveBeenCalledWith('re-1');
    expect(addExerciseToRoutine).toHaveBeenCalledWith(
      'routine-existing-1', 'ex-bench', 0, 6, 10, null, 4, null, 120, null,
    );
    expect(nav.goBack).toHaveBeenCalled();
  });

  test('removing an existing day during the edit soft-deletes its routine on save', async () => {
    const tree = await renderEditMode();

    press(tree, 'Remove Push Day');
    await act(async () => { press(tree, 'Save changes'); });

    expect(softDeleteRoutine).toHaveBeenCalledWith('routine-existing-1');
    // Nothing left to persist for the removed day.
    expect(updateRoutineName).not.toHaveBeenCalledWith('routine-existing-1', expect.anything());
    expect(updateRoutineName).toHaveBeenCalledWith('routine-existing-2', 'Pull Day');
  });
});
