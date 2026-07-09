/**
 * ManualBuilderScreen — D8 calm set-cap nudge (founder ruling 2026-07-09,
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md §D8; diagnosis
 * docs/exercise-planning-2026-07-09/plan-B-weak-point-sets.md).
 *
 * The manual builder never blocks (D8: "manual builder shows a calm nudge
 * past the cap, never blocks"). This pins:
 *   1. crossing above 4 sets on one exercise shows one calm, plain-voice
 *      toast (no shame, no block, British English, no em dash);
 *   2. the nudge fires once on the crossing edge, not on every further +1;
 *   3. staying at or below 4 sets never nudges;
 *   4. dropping back down and crossing again re-fires (edge-triggered both
 *      ways, not a one-time-ever flag).
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

async function buildOneExercisePlan() {
  let tree;
  act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
  setPlanName(tree, 'Nudge Plan');
  press(tree, '2 training days per week');
  await act(async () => { press(tree, 'Create plan and add workouts'); });

  const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
  press(tree, 'Add exercise');
  act(() => { picker.props.onSelect({ id: 'ex-a', name: 'Lat Pulldown', primaryMuscle: 'back' }); });
  return tree;
}

describe('ManualBuilderScreen — D8 calm set-cap nudge', () => {
  test('staying at or under 4 sets never nudges', async () => {
    const tree = await buildOneExercisePlan();
    press(tree, 'Increase sets for Lat Pulldown'); // 3 -> 4
    expect(pressables(tree, 'Lat Pulldown, 4 sets').length).toBe(1);
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('crossing above 4 sets shows one calm, plain-voice nudge (not a block)', async () => {
    const tree = await buildOneExercisePlan();
    press(tree, 'Increase sets for Lat Pulldown'); // 3 -> 4
    press(tree, 'Increase sets for Lat Pulldown'); // 4 -> 5, crosses the edge
    expect(pressables(tree, 'Lat Pulldown, 5 sets').length).toBe(1); // never blocked
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    const [message, opts] = mockToastShow.mock.calls[0];
    expect(typeof message).toBe('string');
    expect(message).not.toMatch(/—/); // no em dash, house style
    expect(message.toLowerCase()).not.toMatch(/must|cannot|not allowed|blocked/); // no shame, no block wording
    expect(opts).toEqual(expect.objectContaining({ variant: 'info' }));
  });

  test('further increases past the cap do not re-nudge every step', async () => {
    const tree = await buildOneExercisePlan();
    press(tree, 'Increase sets for Lat Pulldown'); // 3 -> 4
    press(tree, 'Increase sets for Lat Pulldown'); // 4 -> 5 (nudge)
    press(tree, 'Increase sets for Lat Pulldown'); // 5 -> 6
    press(tree, 'Increase sets for Lat Pulldown'); // 6 -> 7
    expect(mockToastShow).toHaveBeenCalledTimes(1);
  });

  test('dropping back to the floor and crossing again re-fires the nudge', async () => {
    const tree = await buildOneExercisePlan();
    press(tree, 'Increase sets for Lat Pulldown'); // 3 -> 4
    press(tree, 'Increase sets for Lat Pulldown'); // 4 -> 5 (nudge #1)
    press(tree, 'Decrease sets for Lat Pulldown'); // 5 -> 4
    press(tree, 'Decrease sets for Lat Pulldown'); // 4 -> 3
    press(tree, 'Increase sets for Lat Pulldown'); // 3 -> 4
    press(tree, 'Increase sets for Lat Pulldown'); // 4 -> 5 (nudge #2)
    expect(mockToastShow).toHaveBeenCalledTimes(2);
  });
});
