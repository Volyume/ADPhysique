/**
 * ManualBuilderScreen -- the per-session cap note (D219 lane A5, design 5.3).
 *
 * "The manual builder nudges on the per-exercise and per-session caps instead of
 * 'Biceps volume is very high'" (design 5.3). A weekly total above a landmark
 * ceiling used to read in the error colour as a fault, for a muscle the person may
 * have picked to bring up. The builder now says nothing about a weekly total being
 * high; it keeps the 4 set per-exercise toast (ManualBuilderScreen.setCapNudge.test.js)
 * and adds a calm note when ONE day holds more direct sets for a muscle than the
 * session cap (8): the one band module's own line (plan/bands.sessionVolumeFlag),
 * in an information colour, never a block, never a warning.
 *
 * What this pins, and why:
 *   1. one exercise at 9 sets in a day shows the note, naming the muscle, the count
 *      and the day, with the studied-session sentence;
 *   2. at or under the cap (8) there is no note;
 *   3. the retired sentence ("... volume is very high. This may affect recovery.")
 *      is never printed, and the note carries no instruction or em dash (D204).
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


async function buildDayWithBiceps(extraIncrements) {
  let tree;
  act(() => { tree = create(<ManualBuilderScreen navigation={nav} />); });
  setPlanName(tree, 'Session Note Plan');
  press(tree, '2 training days per week');
  await act(async () => { press(tree, 'Create plan and add workouts'); });

  const picker = tree.root.findAll(n => n.props && typeof n.props.onSelect === 'function')[0];
  press(tree, 'Add exercise');
  act(() => { picker.props.onSelect({ id: 'ex-curl', name: 'Barbell Curl', primaryMuscle: 'biceps' }); });
  for (let i = 0; i < extraIncrements; i += 1) press(tree, 'Increase sets for Barbell Curl');
  return tree;
}

const textOf = (tree) => tree.root.findAllByType(require('react-native').Text)
  .map((n) => [].concat(n.props.children).join('')).join(' | ');

describe('ManualBuilderScreen: the per-session cap note', () => {
  test('9 sets of biceps in one day shows the calm note with the studied-session sentence', async () => {
    const tree = await buildDayWithBiceps(6); // 3 -> 9
    const text = textOf(tree);
    expect(text).toContain('Biceps: 9 sets in Day 1.');
    expect(text).toContain('More than most studies have tested in one session (about 11 sets).');
  });

  test('at the session cap (8 sets) there is no note', async () => {
    const tree = await buildDayWithBiceps(5); // 3 -> 8
    expect(textOf(tree)).not.toContain('sets in Day 1.');
    expect(textOf(tree)).not.toContain('More than most studies have tested');
  });

  test('the retired weekly-total warning is never printed, and the note describes without an em dash', async () => {
    const tree = await buildDayWithBiceps(6);
    const text = textOf(tree);
    expect(text).not.toMatch(/volume is very high|This may affect recovery/);
    const note = text.split(' | ').find((t) => t.startsWith('Biceps: 9 sets'));
    expect(note).toBeTruthy();
    expect(note).not.toContain('—');
    expect(note).not.toMatch(/\b(should|must|reduce|cut|too much)\b/i);
  });
});
