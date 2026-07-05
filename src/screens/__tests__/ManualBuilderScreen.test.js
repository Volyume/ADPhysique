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
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/ExercisePickerModal', () => () => null);
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
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
    updateProgrammeName: jest.fn(async () => {}),
    // persistDays now wraps its writes in a transaction; the mock just runs the
    // task so the inner helper calls (and their assertions) still fire.
    db: jest.fn(async () => ({})),
    runInTransaction: jest.fn(async (d, task) => task()),
  };
});

import useAppStore from '../../store/useAppStore';
import {
  createProgramme, createRoutine, addExerciseToRoutine, activatePlanWithBlock,
  getProgrammeById, getRoutinesForPlan, updateRoutineName,
  removeExerciseFromRoutine, softDeleteRoutine, updateProgrammeName,
} from '../../lib/database';
import ManualBuilderScreen from '../ManualBuilderScreen';

const store = { user: { id: 'user-1' }, accessibility: { reduceMotion: true } };
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
    if (typeof n.type === 'function' && n.type.name === 'Button') continue;
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

// Page 2's editable name field (distinct from Page 1's, which carries the
// "e.g. My Push Pull Legs" placeholder above).
function setEditablePlanName(tree, value) {
  const input = tree.root.findAll(
    n => n.props && n.props.placeholder === 'Plan name',
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

describe('ManualBuilderScreen — Save & Activate uses the current name (PLAN-001)', () => {
  test('renaming the plan on the final builder page carries into the activated plan and the success modal', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Original Name');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });

    // Remove the empty second day so the activate gate is satisfiable
    // (same pattern as the other Save & Activate tests above).
    press(tree, 'Remove Day 2');

    // Rename on Page 2, after the plan already has an id, the way a real
    // user renames before pressing Save & Activate.
    setEditablePlanName(tree, 'Renamed Plan');

    await act(async () => { press(tree, 'Save and activate'); });

    // The rename is persisted and is what gets activated, not the stale
    // Page 1 name.
    expect(updateProgrammeName).toHaveBeenCalledWith('prog-1', 'Renamed Plan');
    expect(activatePlanWithBlock).toHaveBeenCalledWith('user-1', 'prog-1', 'Renamed Plan');

    // The success modal shows the renamed plan, never the old name.
    expect(tree.root.findAll(
      n => n.props && n.props.children === 'Renamed Plan',
    ).length).toBeGreaterThan(0);
    expect(tree.root.findByProps({ accessibilityLabel: 'Plan activated' })).toBeTruthy();
    expect(tree.root.findAll(
      n => n.props && n.props.children === 'Original Name',
    ).length).toBe(0);

    press(tree, 'Go to Train');
    expect(nav.navigate).toHaveBeenCalledWith('HomeTab');
  });

  test('leaving the name untouched keeps prior behaviour unchanged', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Untouched Name');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });
    press(tree, 'Remove Day 2');

    await act(async () => { press(tree, 'Save and activate'); });

    expect(updateProgrammeName).toHaveBeenCalledWith('prog-1', 'Untouched Name');
    expect(activatePlanWithBlock).toHaveBeenCalledWith('user-1', 'prog-1', 'Untouched Name');
    expect(tree.root.findAll(
      n => n.props && n.props.children === 'Untouched Name',
    ).length).toBeGreaterThan(0);
  });
});

describe('ManualBuilderScreen — reorder exercises (T7)', () => {
  async function buildTwoExercisePlan(planLabel) {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, planLabel);
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Row', primaryMuscle: 'back' }); });

    return tree;
  }

  test('the first exercise cannot move up and the last cannot move down', async () => {
    const tree = await buildTwoExercisePlan('Reorder Bounds');

    expect(pressables(tree, 'Move Bench Press up')[0].props.accessibilityState.disabled).toBe(true);
    expect(pressables(tree, 'Move Bench Press down')[0].props.accessibilityState.disabled).toBe(false);
    expect(pressables(tree, 'Move Row up')[0].props.accessibilityState.disabled).toBe(false);
    expect(pressables(tree, 'Move Row down')[0].props.accessibilityState.disabled).toBe(true);
  });

  test('moving the second exercise up swaps the pair, and Save persists the new order', async () => {
    const tree = await buildTwoExercisePlan('Reorder Persist');

    press(tree, 'Move Row up');

    // Remove the empty second day so the activate gate is satisfiable
    // (same pattern as the superset persistence test above).
    press(tree, 'Remove Day 2');
    await act(async () => { press(tree, 'Save and activate'); });

    // Row (ex-b) now saves at order 0, Bench Press (ex-a) at order 1 -
    // persistDays' `j` loop index IS order_in_routine, so the in-memory
    // swap is the entire reorder mechanism, no separate order write.
    const calls = addExerciseToRoutine.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe('ex-b');
    expect(calls[0][2]).toBe(0);
    expect(calls[1][1]).toBe('ex-a');
    expect(calls[1][2]).toBe(1);
  });

  test('reordering across a superset keeps the pair adjacent (never splits it)', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Reorder Superset');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Row', primaryMuscle: 'back' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-c', name: 'Squat', primaryMuscle: 'quads' }); });

    // Superset the first two (adjacent A + B), then move the lone third
    // exercise up across the pair. It must hop the whole pair, never land
    // between its members (which would silently break the superset in-session).
    press(tree, 'Bench Press, 3 sets');
    press(tree, 'Row, 3 sets');
    press(tree, 'Group 2 exercises into a superset');
    press(tree, 'Move Squat up');

    press(tree, 'Remove Day 2');
    await act(async () => { press(tree, 'Save and activate'); });

    const calls = addExerciseToRoutine.mock.calls;
    const ss = calls.filter(c => c[9]); // superset members carry the group id (arg 10)
    expect(ss).toHaveLength(2);
    expect(ss[0][9]).toBe(ss[1][9]);            // same group
    const orders = ss.map(c => c[2]).sort((a, b) => a - b);
    expect(orders[1] - orders[0]).toBe(1);      // still adjacent after the reorder
  });
});
