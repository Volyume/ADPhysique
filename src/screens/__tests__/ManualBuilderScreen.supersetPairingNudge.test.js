/**
 * ManualBuilderScreen — plan-D calm builder nudge (founder-confirmed Option C,
 * docs/exercise-planning-2026-07-09/plan-D-intelligent-supersets.md section 4
 * Option B/C, Q2 "yes, nudge only").
 *
 * handleGroupSuperset never enforces a relationship/equipment rule (the
 * manual builder stays fully user-controlled), but it now reuses the auto-gen
 * engine's own classifySupersetPair (planEngine.js) to show ONE calm, info-
 * variant toast when the grouped pair clears neither the relationship nor the
 * equipment-zone bar - the exact founder-reported case (Machine Shoulder
 * Press + Dumbbell Lateral Raise, two different areas of the gym). This pins:
 *   1. the founder's exact impractical pair fires one calm nudge and still
 *      groups the exercises (never blocks);
 *   2. a sensible pair (dumbbell curl + dumbbell tricep extension, the
 *      founder's own "this would be sensible" example) fires no message;
 *   3. a pair missing muscle data (custom exercise) never nudges (nothing to
 *      classify with confidence).
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/ExercisePickerModal', () => () => null);
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: mockToastShow }),
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
  getProgrammeById: jest.fn(async () => null),
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

function setPlanName(tree, value) {
  const input = tree.root.findAll(
    n => n.props && n.props.placeholder === 'e.g. My Push Pull Legs',
  )[0];
  act(() => { input.props.onChangeText(value); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockToastShow.mockClear();
  useAppStore.mockImplementation((selector) =>
    (typeof selector === 'function' ? selector(store) : store));
});

async function buildPlanWithPair(exA, exB) {
  let tree;
  act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
  setPlanName(tree, 'Pairing Nudge Plan');
  press(tree, '2 training days per week');
  await act(async () => { press(tree, 'Create plan and add workouts'); });

  const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
  press(tree, 'Add exercise');
  act(() => { picker.props.onSelect(exA); });
  press(tree, 'Add exercise');
  act(() => { picker.props.onSelect(exB); });

  press(tree, `${exA.name}, ${exA.sets ?? 3} sets`);
  press(tree, `${exB.name}, ${exB.sets ?? 3} sets`);
  press(tree, 'Group 2 exercises into a superset');
  return tree;
}

describe('ManualBuilderScreen — plan-D calm pairing nudge', () => {
  test('the founder-reported impractical pair (Machine Shoulder Press + Dumbbell Lateral Raise) fires ONE calm info nudge, and still groups', async () => {
    const tree = await buildPlanWithPair(
      { id: 'ex-a', name: 'Machine Shoulder Press', primaryMuscle: 'front_delts', equipmentCategory: 'machine_selectorised', compoundIsolation: 'compound' },
      { id: 'ex-b', name: 'Dumbbell Lateral Raise', primaryMuscle: 'side_delts', equipmentCategory: 'dumbbell', compoundIsolation: 'isolation' },
    );

    expect(mockToastShow).toHaveBeenCalledTimes(1);
    const [message, opts] = mockToastShow.mock.calls[0];
    expect(typeof message).toBe('string');
    expect(message).not.toMatch(/—/); // no em dash, house style
    expect(message.toLowerCase()).not.toMatch(/must|cannot|not allowed|blocked/); // never a block
    expect(opts).toEqual(expect.objectContaining({ variant: 'info' }));

    // Never blocks: the pair is grouped regardless (an "Ungroup superset A"
    // control only renders for a grouped row).
    expect(pressables(tree, 'Ungroup superset A').length).toBeGreaterThan(0);
  });

  test('a sensible antagonist pair on the same equipment (dumbbell curl + dumbbell tricep extension) fires no message', async () => {
    const tree = await buildPlanWithPair(
      { id: 'ex-a', name: 'Dumbbell Bicep Curl', primaryMuscle: 'biceps', equipmentCategory: 'dumbbell', compoundIsolation: 'isolation' },
      { id: 'ex-b', name: 'Dumbbell Tricep Extension', primaryMuscle: 'triceps', equipmentCategory: 'dumbbell', compoundIsolation: 'isolation' },
    );

    expect(mockToastShow).not.toHaveBeenCalled();
    expect(pressables(tree, 'Ungroup superset A').length).toBeGreaterThan(0);
  });

  test('a pair missing muscle data (unresolved/custom exercise) never nudges, since there is nothing to classify with confidence', async () => {
    const tree = await buildPlanWithPair(
      { id: 'ex-a', name: 'My Custom Move', primaryMuscle: null },
      { id: 'ex-b', name: 'Another Custom Move', primaryMuscle: null },
    );

    expect(mockToastShow).not.toHaveBeenCalled();
    expect(pressables(tree, 'Ungroup superset A').length).toBeGreaterThan(0);
  });
});
