/**
 * Discoverability audit 2026-08-10 (docs/discoverability-audit-2026-08-10/
 * CONTROL-GAPS-EVIDENCE.md, Phase 10 finding #1): removing an exercise from
 * a day was long-press-only, disclosed solely via a screen-reader-only
 * accessibilityHint (former :1060). The day-level remove
 * (`handleRemoveDay`) has always had a visible trash icon; the exercise row
 * did not. This pins the fix: a visible, per-row remove control that reuses
 * the SAME handler as the existing long press, with no new state and no new
 * writer.
 *
 * Note on the toast: `handleLongPressExercise`'s undo toast fires from an
 * `if (!removed) return;` check read out of a setDayList functional-updater
 * closure - a pre-existing pattern (unrelated to this change, present on
 * BOTH the long press and the new button, and out of this task's bounds)
 * that does not resolve synchronously inside a single react-test-renderer
 * act(). The render test below therefore asserts what the visible control
 * must do (remove the row, same as the long press), not the toast's timing.
 */
const fs = require('fs');
const path = require('path');
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
jest.mock('../../lib/database', () => ({
  createProgramme: jest.fn(async () => ({ id: 'prog-1' })),
  createRoutine: jest.fn(async (uid, name) => ({ id: `routine-${name}` })),
  addExerciseToRoutine: jest.fn(async () => ({})),
  activatePlanWithBlock: jest.fn(async () => ({})),
  uid: jest.fn(() => `uid-${Math.random()}`),
  getProgrammeById: jest.fn(async () => ({ id: 'plan-1', name: 'Plan' })),
  getRoutinesForPlan: jest.fn(async () => ([])),
  getRoutineExercisesWithDetails: jest.fn(async () => ([])),
  updateRoutineName: jest.fn(async () => {}),
  removeExerciseFromRoutine: jest.fn(async () => {}),
  softDeleteRoutine: jest.fn(async () => {}),
  updateProgrammeName: jest.fn(async () => {}),
  db: jest.fn(async () => ({})),
  runInTransaction: jest.fn(async (d, task) => task()),
}));

import useAppStore from '../../store/useAppStore';
import ManualBuilderScreen from '../ManualBuilderScreen';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ManualBuilderScreen.js'),
  'utf8',
);

const store = { user: { id: 'user-1' }, accessibility: { reduceMotion: true } };
const nav = { navigate: jest.fn(), goBack: jest.fn() };

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

function press(tree, label) {
  const node = pressables(tree, label)[0];
  if (!node) throw new Error(`No pressable with label "${label}"`);
  act(() => { node.props.onPress(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) =>
    (typeof selector === 'function' ? selector(store) : store));
});

describe('ManualBuilderScreen exercise row has a visible remove control (source)', () => {
  test('a per-exercise-row trash icon button calls the same remove handler as the long press', () => {
    // Visible button, distinct accessibilityLabel per exercise (mirrors the
    // day-level `Remove ${day.name}` pattern at handleRemoveDay's row).
    expect(src).toMatch(/accessibilityLabel=\{`Remove \$\{ex\.name\}`\}/);
    // Wired to the exact same handler the long press already used - no
    // second removal code path, no new state.
    expect(src).toMatch(
      /onPress=\{\(\) => handleLongPressExercise\(dayIdx, ex\.localId, ex\.name\)\}\s*\n\s*hitSlop=\{\{[^}]+\}\}\s*\n\s*accessibilityRole="button"\s*\n\s*accessibilityLabel=\{`Remove \$\{ex\.name\}`\}/,
    );
  });

  test('the long press still exists (accelerator, not removed)', () => {
    expect(src).toMatch(
      /onLongPress=\{\(\) => handleLongPressExercise\(dayIdx, ex\.localId, ex\.name\)\}/,
    );
  });
});

describe('ManualBuilderScreen exercise row has a visible remove control (render)', () => {
  test('tapping the visible remove control removes the row, same as the long press', async () => {
    let tree;
    act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });

    const nameInput = tree.root.findAll(
      n => n.props && n.props.placeholder === 'e.g. My Push Pull Legs',
    )[0];
    act(() => { nameInput.props.onChangeText('Remove Test'); });
    press(tree, '2 training days per week');
    await act(async () => { press(tree, 'Create plan and add workouts'); });

    const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
    press(tree, 'Add exercise');
    act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Bench Press', primaryMuscle: 'chest' }); });

    expect(pressables(tree, 'Bench Press, 3 sets').length).toBe(1);
    expect(pressables(tree, 'Remove Bench Press').length).toBeGreaterThan(0);

    press(tree, 'Remove Bench Press');

    expect(pressables(tree, 'Bench Press, 3 sets').length).toBe(0);
  });
});
