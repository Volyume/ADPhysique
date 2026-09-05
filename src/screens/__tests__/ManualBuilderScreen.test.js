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
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
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
import { track } from '../../lib/engineTelemetry';
import ManualBuilderScreen from '../ManualBuilderScreen';

const store = { user: { id: 'user-1' }, accessibility: { reduceMotion: true } };
// A5 (certification 2026-09-05): the builder's two completions now pop the
// Train stack, and the activation success button goes through
// navigateCrossTab, so the stub carries popToTop and a tab-navigator parent.
const parentNav = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })), dispatch: jest.fn() };
const nav = {
  navigate: jest.fn(), goBack: jest.fn(), popToTop: jest.fn(), getParent: () => parentNav,
};

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

describe('ManualBuilderScreen — giant sets (3+ exercises, campaign item 21)', () => {
  test('grouping three exercises writes ONE shared supersetGroupId across all three', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Giant Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Row', primaryMuscle: 'back' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-c', name: 'Curl', primaryMuscle: 'biceps' }); });

    // Select all three (no pair cap), then group. The button label reflects
    // the live selection size, proving 3+ can be grouped in one action.
    press(tree, 'Bench Press, 3 sets');
    press(tree, 'Row, 3 sets');
    press(tree, 'Curl, 3 sets');
    press(tree, 'Group 3 exercises into a superset');

    press(tree, 'Remove Day 2');
    await act(async () => { press(tree, 'Save and activate'); });

    const calls = addExerciseToRoutine.mock.calls;
    expect(calls).toHaveLength(3);
    const groupIds = calls.map(c => c[9]); // 10th arg = supersetGroupId
    expect(groupIds[0]).toBeTruthy();
    expect(new Set(groupIds).size).toBe(1); // all three share exactly ONE id
  });

  test('ungrouping a giant set clears the group id from every member', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Ungroup Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Row', primaryMuscle: 'back' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-c', name: 'Curl', primaryMuscle: 'biceps' }); });

    press(tree, 'Bench Press, 3 sets');
    press(tree, 'Row, 3 sets');
    press(tree, 'Curl, 3 sets');
    press(tree, 'Group 3 exercises into a superset');
    // Ungroup via the first member's control (group A) - must clear ALL three.
    press(tree, 'Ungroup superset A');

    press(tree, 'Remove Day 2');
    await act(async () => { press(tree, 'Save and activate'); });

    const calls = addExerciseToRoutine.mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls.every(c => c[9] == null)).toBe(true); // no group id anywhere
  });
});

describe('ManualBuilderScreen — circuits (EL-9, docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md)', () => {
  // addExerciseToRoutine positional args: (routineId, exerciseId, order,
  // repsMin, repsMax, notes, sets, startingWeight, restSeconds,
  // supersetGroupId, scheduleSync, selectionReason, groupKind, roundRestSeconds).
  const SETS = 6;
  const REST = 8;
  const GROUP_ID = 9;
  const GROUP_KIND = 12;
  const ROUND_REST = 13;

  test('"Make circuit" groups exercises with rounds equalised, no rest between stations, and a round rest', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Circuit Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Goblet Squat', primaryMuscle: 'quads' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Push-Up', primaryMuscle: 'chest' }); });

    press(tree, 'Goblet Squat, 3 sets');
    press(tree, 'Push-Up, 3 sets');
    press(tree, 'Make a circuit of 2 exercises');

    press(tree, 'Remove Day 2');
    await act(async () => { press(tree, 'Save and activate'); });

    const calls = addExerciseToRoutine.mock.calls;
    expect(calls).toHaveLength(2);
    // Both members share ONE group id and carry 'circuit'.
    expect(calls[0][GROUP_ID]).toBeTruthy();
    expect(calls[0][GROUP_ID]).toBe(calls[1][GROUP_ID]);
    expect(calls[0][GROUP_KIND]).toBe('circuit');
    expect(calls[1][GROUP_KIND]).toBe('circuit');
    // Rounds equalised across every member.
    expect(calls[0][SETS]).toBe(calls[1][SETS]);
    // No rest between stations (transition), the round rest fires instead.
    expect(calls[0][REST]).toBe(0);
    expect(calls[1][REST]).toBe(0);
    expect(calls[0][ROUND_REST]).toBe(90); // default round rest
    expect(calls[1][ROUND_REST]).toBe(90);
  });

  test('the group rounds stepper writes the SAME rounds to every member', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Circuit Rounds Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Goblet Squat', primaryMuscle: 'quads' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Push-Up', primaryMuscle: 'chest' }); });
    press(tree, 'Goblet Squat, 3 sets');
    press(tree, 'Push-Up, 3 sets');
    press(tree, 'Make a circuit of 2 exercises');

    // The rounds and round-rest steppers are shown once, on the group's
    // first member, and each writes to EVERY member.
    press(tree, 'Increase rounds');
    press(tree, 'Increase rounds');
    press(tree, 'Increase rest between rounds');

    press(tree, 'Remove Day 2');
    await act(async () => { press(tree, 'Save and activate'); });

    const calls = addExerciseToRoutine.mock.calls;
    expect(calls[0][SETS]).toBe(calls[1][SETS]); // still equal after the bump
    expect(calls[0][SETS]).toBeGreaterThan(3);
    expect(calls[0][ROUND_REST]).toBe(calls[1][ROUND_REST]);
    expect(calls[0][ROUND_REST]).toBe(105); // 90 default + one 15s bump
  });

  test('Ungroup restores each member\'s pre-circuit sets and rest exactly', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Circuit Ungroup Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Goblet Squat', primaryMuscle: 'quads' }); });
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-b', name: 'Push-Up', primaryMuscle: 'chest' }); });

    // Dial in distinct starting values before grouping, so restoration can
    // be proven exact rather than coincidentally matching a default.
    press(tree, 'Increase sets for Goblet Squat');
    press(tree, 'Increase rest for Push-Up');

    press(tree, 'Goblet Squat, 4 sets');
    press(tree, 'Push-Up, 3 sets');
    press(tree, 'Make a circuit of 2 exercises');
    press(tree, 'Ungroup circuit A');

    press(tree, 'Remove Day 2');
    await act(async () => { press(tree, 'Save and activate'); });

    const calls = addExerciseToRoutine.mock.calls;
    const squat = calls.find(c => c[1] === 'ex-a');
    const pushup = calls.find(c => c[1] === 'ex-b');
    expect(squat[GROUP_ID]).toBeNull();
    expect(squat[GROUP_KIND]).toBeNull();
    expect(squat[SETS]).toBe(4); // restored, not left at the circuit's rounds
    expect(pushup[REST]).toBe(105); // restored (90 default + one 15s bump)
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
      // EL-9 (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md):
      // groupKind/roundRestSeconds trail every write; null for an ordinary,
      // ungrouped exercise.
      true, null, null, null,
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

    // Re-anchored under C5-P10-06 (D96): the button was labelled "Go to
    // Train" while navigating to HomeTab, the tab titled "Today" -- and the
    // same screen's Save draft goes to PlansTab, the tab titled "Train", so
    // one word meant two destinations. The label was corrected rather than
    // the route: Today is where the freshly activated plan's next session
    // waits. The pinned RULE (this button lands on HomeTab) is unchanged.
    //
    // A5 (certification 2026-09-05): the route is the same, the mechanism is
    // not. A bare navigate('HomeTab') bypassed the sanctioned cross-tab helper
    // and left the finished builder on the Train stack, so the next visit to
    // Train re-opened it. It now goes through navigateCrossTab and pops the
    // Train stack behind it.
    press(tree, 'Go to Today');
    expect(parentNav.navigate).toHaveBeenCalledWith('HomeTab', { screen: 'Home', initial: false });
    expect(nav.popToTop).toHaveBeenCalled();
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

describe('ManualBuilderScreen — deferred programme creation (D139)', () => {
  test('moving from page 1 to page 2 does not write a programme row, and tracks manual_plan_started', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Deferred Plan');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    // Page 2 renders (four empty day cards, the untouched default), but
    // nothing was written to get there.
    expect(pressables(tree, 'Add exercise')).toHaveLength(4);
    expect(createProgramme).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('user-1', 'manual_plan_started', {});
  });

  test('abandoning page 2 with no exercises added never creates a programme row', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Abandoned Plan');
    await act(async () => { press(tree, 'Create plan and add workouts'); });
    // No exercises added anywhere; nothing else can happen on this screen
    // that would create the row.
    expect(createProgramme).not.toHaveBeenCalled();
  });

  test('Save draft creates the programme row for the first time and reports activated: false', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Draft Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });

    expect(createProgramme).not.toHaveBeenCalled();
    await act(async () => { press(tree, 'Save draft'); });

    expect(createProgramme).toHaveBeenCalledTimes(1);
    expect(createProgramme).toHaveBeenCalledWith('user-1', 'Draft Plan', 'Build muscle', 0);
    expect(createRoutine).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('user-1', 'manual_plan_saved', { activated: false });
    // A5 (certification 2026-09-05): this used to assert navigate('PlansTab'),
    // the tab ManualBuilder already lives in — an action that bubbles to a tab
    // navigator already focused on that tab, carries no nested screen and
    // therefore pops nothing, leaving the person on the builder with a toast.
    // Popping the Train stack is what actually returns them to My plans.
    expect(nav.popToTop).toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalledWith('PlansTab');
  });

  test('Save and activate creates the programme row for the first time and reports activated: true', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Activate Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });
    press(tree, 'Remove Day 2');

    await act(async () => { press(tree, 'Save and activate'); });

    expect(createProgramme).toHaveBeenCalledTimes(1);
    expect(activatePlanWithBlock).toHaveBeenCalledWith('user-1', 'prog-1', 'Activate Plan');
    expect(track).toHaveBeenCalledWith('user-1', 'manual_plan_saved', { activated: true });
  });

  test('editing an existing plan never calls createProgramme (unchanged S5 behaviour)', async () => {
    let tree;
    await act(async () => {
      tree = create(<ManualBuilderScreen navigation={nav} route={{ params: { planId: 'plan-1' } }} />);
    });
    await act(async () => {});
    await act(async () => { press(tree, 'Save changes'); });
    expect(createProgramme).not.toHaveBeenCalled();
    // Edit mode is not part of the manual-builder start/save funnel.
    expect(track).not.toHaveBeenCalledWith(expect.anything(), 'manual_plan_started', expect.anything());
    expect(track).not.toHaveBeenCalledWith(expect.anything(), 'manual_plan_saved', expect.anything());
  });
});

describe('ManualBuilderScreen — day duration estimate (D139)', () => {
  test('a day with one exercise (3 sets, 90s rest) shows ~14 min in its header', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Duration Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    // No duration shown before any exercise exists (empty days stay silent
    // rather than claiming a 0-minute session).
    expect(tree.root.findAll(
      n => typeof n.props?.children === 'string' && /^~\d+ min$/.test(n.props.children),
    ).length).toBe(0);

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });

    // estimateWorkoutMinutes([{ sets: 3, restSec: 90 }]): overhead 7.5min +
    // (3*60 + 2*90)s = 450 + 360 = 810s -> ceil(810/60) = 14.
    expect(tree.root.findAll(n => n.props && n.props.children === '~14 min').length).toBeGreaterThan(0);
  });

  test('the plan summary shows the typical session length once a day has exercises', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
    setPlanName(tree, 'Summary Plan');
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });

    expect(tree.root.findAll(
      n => n.props && n.props.children === 'Typical session: ~14 min',
    ).length).toBeGreaterThan(0);
  });
});
