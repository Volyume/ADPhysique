/**
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"; audit docs/audit/exercise-logging-reporting-audit-2026-10-03/
 * 00-FINDINGS.md, F-23 and P38): creating a custom exercise hands the picker's
 * caller THE ROW JUST CREATED, found by its id.
 *
 * Before D218 the new row was re-found by NAME (`all.find(e => e.name ===
 * typedName)`). The "Use it instead?" nudge for a name a canonical exercise
 * already carries is advisory and creating anyway is allowed, so `find` could
 * return the canonical row first: the session then logged against the
 * canonical id, and the custom exercise the person had just defined (its
 * muscle, type and load semantics) was created and never used.
 *
 * Pinned here, against the real component (a runtime mount, not a source
 * match): the create form's save hands `onSelect` the custom row's id when a
 * canonical exercise has exactly the same name; an ordinary custom name still
 * resolves to the stored row; and when the insert returns no id the name match
 * and the WK-6 fallback object (which carries the typed fields) still apply.
 */
import { create, act } from 'react-test-renderer';
import { Modal } from 'react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../lib/database', () => ({
  getAllExercises: jest.fn(),
  insertExercise: jest.fn(),
  getRecentlyUsedExerciseIds: jest.fn(() => Promise.resolve([])),
  getExerciseUsageStats: jest.fn(() => Promise.resolve([])),
  getActiveBlock: jest.fn(() => Promise.resolve(null)),
  clearExerciseIntent: jest.fn(() => Promise.resolve()),
}));

// No exercise intent or capability state: nothing is set aside, nothing is filtered.
jest.mock('../../lib/exercise/intent', () => ({
  loadExerciseIntentState: jest.fn(() => Promise.resolve(null)),
  isEligible: jest.fn(() => true),
  isEligibleExercise: jest.fn(() => true),
  intentFor: jest.fn(() => null),
  isFamilyBlocked: jest.fn(() => false),
  movementFamilyOf: jest.fn(() => null),
}));

// A host stand-in for the text field: its props (value, onChangeText) are what the form drives.
jest.mock('../TextField', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((props, _ref) => React.createElement('TextField', props)) };
});

import ExercisePickerModal from '../ExercisePickerModal';
import { getAllExercises, insertExercise } from '../../lib/database';

const TYPED_NAME = 'Barbell Bench Press';

// The canonical twin (name-hashed id on every install) and the custom row the person just defined.
const CANONICAL_BENCH = {
  id: 'canon-bench', name: TYPED_NAME, primaryMuscle: 'chest', isCustom: 0, exerciseType: 'weight_reps', loadSemantics: 'total',
};
const CUSTOM_BENCH = {
  id: 'custom-uuid-9', name: TYPED_NAME, primaryMuscle: 'triceps', isCustom: 1, exerciseType: 'weight_reps', loadSemantics: 'per_hand',
};

async function flush() {
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  }
}

let currentTree = null;

/** Mount the picker, open the create form from the list footer, type the name, and press save. */
async function createCustomExercise({ onSelect, onClose }) {
  let tree;
  await act(async () => {
    tree = create(<ExercisePickerModal visible onClose={onClose} onSelect={onSelect} />);
  });
  currentTree = tree;
  await flush();

  // The list mounts once the Modal reports it is shown (the first-open gate).
  await act(async () => { tree.root.findAllByType(Modal)[0].props.onShow(); });
  await flush();

  // The list host carries its footer as a prop (FlashList is a passthrough host in Jest).
  const list = tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'FlatList')[0];
  expect(list).toBeTruthy();
  await act(async () => { list.props.ListFooterComponent.props.onPress(); });
  await flush();

  const field = tree.root.findAll(
    (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'New exercise name',
  )[0];
  expect(field).toBeTruthy();
  await act(async () => { field.props.onChangeText(TYPED_NAME); });

  const save = tree.root.findAll(
    (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Add exercise' && typeof n.props.onPress === 'function',
  )[0];
  expect(save).toBeTruthy();
  await act(async () => { save.props.onPress(); });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  getAllExercises.mockResolvedValue([CANONICAL_BENCH]);
});

afterEach(() => {
  if (currentTree) {
    try { act(() => { currentTree.unmount(); }); } catch (_) { /* already unmounted */ }
    currentTree = null;
  }
});

describe('D218 (F-23, P38): the exercise just created is the one handed back, found by id', () => {
  test('a custom exercise named exactly like a canonical one hands onSelect the CUSTOM id', async () => {
    insertExercise.mockResolvedValue({ id: CUSTOM_BENCH.id, name: TYPED_NAME });
    // After the insert the library read lists the canonical row first, as the name-ordered query does.
    getAllExercises.mockResolvedValue([CANONICAL_BENCH, CUSTOM_BENCH]);
    const onSelect = jest.fn();
    const onClose = jest.fn();

    await createCustomExercise({ onSelect, onClose });

    expect(insertExercise).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const handed = onSelect.mock.calls[0][0];
    expect(handed.id).toBe('custom-uuid-9');
    expect(handed.id).not.toBe('canon-bench');
    // It is the row the person defined (its muscle and load meaning), not the canonical twin.
    expect(handed).toMatchObject({ primaryMuscle: 'triceps', loadSemantics: 'per_hand' });
    expect(onClose).toHaveBeenCalled();
  });

  test('an ordinary custom name resolves to the stored row, by id', async () => {
    insertExercise.mockResolvedValue({ id: CUSTOM_BENCH.id, name: TYPED_NAME });
    getAllExercises.mockResolvedValue([CUSTOM_BENCH]);
    const onSelect = jest.fn();

    await createCustomExercise({ onSelect, onClose: jest.fn() });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBe(CUSTOM_BENCH);
  });

  test('WK-6: when the library read cannot find the new id, the fallback object carries the created id and the typed fields', async () => {
    insertExercise.mockResolvedValue({ id: 'custom-uuid-9', name: TYPED_NAME });
    getAllExercises.mockResolvedValue([]);
    const onSelect = jest.fn();

    await createCustomExercise({ onSelect, onClose: jest.fn() });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'custom-uuid-9', name: TYPED_NAME, exerciseType: 'weight_reps' });
  });

  test('when the insert returns no id, the name match still applies (today\'s path, kept for that case only)', async () => {
    insertExercise.mockResolvedValue({});
    getAllExercises.mockResolvedValue([CUSTOM_BENCH]);
    const onSelect = jest.fn();

    await createCustomExercise({ onSelect, onClose: jest.fn() });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBe(CUSTOM_BENCH);
  });
});
