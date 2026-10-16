/**
 * useClipRecorder (D229 addendum 5): the one way any screen starts "Record a
 * clip". Pins the order of events:
 *   - the privacy primer shows ONCE per device, before the first camera open
 *     ("Open camera" writes `@volyume_clip_primer_seen`; "Not now" does not, so
 *     the line is still read before the camera ever opens);
 *   - after that, straight to the ClipCamera route with the ruled params;
 *   - at three clips it opens the clips sheet INSTEAD (with the notice), never
 *     the camera or the primer;
 *   - the count refreshes on focus.
 */
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn(), commit: jest.fn() }));
jest.mock('../../Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));
// The workout's videos, as the recorder hook reads them (newest first).
const mockList = jest.fn();
const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, exerciseName: 'Back squat', setNumber: i + 1, createdAt: 100 - i, durationMs: 5000 }));
jest.mock('../../../lib/clips/store', () => ({
  listClipsForWorkout: (...a) => mockList(...a),
  countClipsForWorkout: jest.fn(async () => 0),
  deleteClip: jest.fn(async () => true),
  // The store's change subscription, fired by tests to play a save or a
  // delete elsewhere (the listeners live here: an import is hoisted above
  // any const of this file).
  subscribeClips: (fn) => { mockStoreListeners.add(fn); return () => mockStoreListeners.delete(fn); },
}));
const mockStoreListeners = new Set();
const fireClipsChanged = () => { mockStoreListeners.forEach((fn) => fn()); };

import useClipRecorder from '../useClipRecorder';

const SEEN = '@volyume_clip_primer_seen';
let api;
let focusHandler;
const navigation = {
  navigate: jest.fn(),
  addListener: jest.fn((event, handler) => { if (event === 'focus') focusHandler = handler; return jest.fn(); }),
};

function Probe({ userId = 'u1', workoutId = 'w1' }) {
  api = useClipRecorder({ navigation, userId, workoutId });
  return api.sheets;
}

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<Probe {...props} />); });
  await act(async () => {});
  return tree;
}

const press = async (tree, label) => {
  const node = tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  expect(node).toBeDefined();
  await act(async () => { node.props.onPress(); });
};

beforeEach(async () => {
  navigation.navigate.mockClear();
  mockList.mockReset();
  mockList.mockResolvedValue([]);
  await AsyncStorage.clear();
  AsyncStorage.setItem.mockClear();
});

describe('the first time: the privacy primer, then the camera', () => {
  test('shows the primer and does NOT open the camera yet', async () => {
    const tree = await mount();
    await act(async () => { await api.openRecorder({ source: 'workout', exerciseId: 'e1', exerciseName: 'Back squat' }); });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('Videos stay on this phone');
  });

  test('"Open camera" remembers it and opens ClipCamera with the ruled params', async () => {
    const tree = await mount();
    await act(async () => { await api.openRecorder({ source: 'workout', exerciseId: 'e1', exerciseName: 'Back squat', setNumber: 3 }); });
    await press(tree, 'Open camera');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(SEEN, 'true');
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('ClipCamera', {
      workoutId: 'w1', exerciseId: 'e1', exerciseName: 'Back squat', setNumber: 3, source: 'workout',
      // Addendum 12: the pattern and equipment ride along for the camera's
      // setup line; absent here, so null.
      exercisePattern: null, exerciseEquipment: null,
    });
    expect(JSON.stringify(tree.toJSON())).not.toContain('Videos stay on this phone');
  });

  test('"Not now" opens nothing and does not mark it seen, so the line is still read before the camera ever opens', async () => {
    const tree = await mount();
    await act(async () => { await api.openRecorder({ source: 'summary' }); });
    await press(tree, 'Not now');
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await act(async () => { await api.openRecorder({ source: 'summary' }); });
    expect(JSON.stringify(tree.toJSON())).toContain('Videos stay on this phone');
  });
});

describe('after the primer has been seen: straight to the camera, once per device', () => {
  test('goes straight to ClipCamera and shows no primer', async () => {
    await AsyncStorage.setItem(SEEN, 'true');
    const tree = await mount();
    await act(async () => { await api.openRecorder({ source: 'summary' }); });
    expect(navigation.navigate).toHaveBeenCalledWith('ClipCamera', {
      workoutId: 'w1', exerciseId: null, exerciseName: null, setNumber: null, source: 'summary',
      exercisePattern: null, exerciseEquipment: null,
    });
    expect(JSON.stringify(tree.toJSON())).not.toContain('Videos stay on this phone');
  });

  test('the primer appears exactly once across a first open and a second open', async () => {
    const tree = await mount();
    await act(async () => { await api.openRecorder({ source: 'workout' }); });
    await press(tree, 'Open camera');
    navigation.navigate.mockClear();
    await act(async () => { await api.openRecorder({ source: 'workout' }); });
    expect(JSON.stringify(tree.toJSON())).not.toContain('Videos stay on this phone');
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
  });

  test('a flag that cannot be read shows the primer (unknown means the privacy line is read)', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage'));
    const tree = await mount();
    await act(async () => { await api.openRecorder({ source: 'workout' }); });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('Videos stay on this phone');
  });
});

describe('at three clips: the clips sheet, never the camera', () => {
  test('opens the clips sheet with the notice, and neither the primer nor the camera', async () => {
    mockList.mockResolvedValue(rows(3));
    const tree = await mount();
    await act(async () => { await api.openRecorder({ source: 'workout' }); });
    expect(navigation.navigate).not.toHaveBeenCalled();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('This workout already has 3 videos, the most it can hold. Delete one if you want to record another.');
    expect(json).not.toContain('Videos stay on this phone');
  });

  test('at two clips it still records', async () => {
    mockList.mockResolvedValue(rows(2));
    await AsyncStorage.setItem(SEEN, 'true');
    await mount();
    await act(async () => { await api.openRecorder({ source: 'workout' }); });
    expect(navigation.navigate).toHaveBeenCalledWith('ClipCamera', expect.objectContaining({ source: 'workout' }));
  });

  test('openClips (the explicit way in) opens the sheet without the full notice', async () => {
    const tree = await mount();
    await act(async () => { api.openClips(); });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Your videos');
    expect(json).not.toContain('Delete one to record another.');
  });
});

describe('the count', () => {
  test('the videos are read on mount and again on focus (right after the camera closes), newest first', async () => {
    mockList.mockResolvedValue(rows(1));
    await mount();
    expect(api.count).toBe(1);
    expect(api.clips.map((c) => c.id)).toEqual(['c0']);
    mockList.mockResolvedValue(rows(2));
    await act(async () => { focusHandler(); });
    expect(api.count).toBe(2);
    expect(api.clips).toHaveLength(2);
  });

  test('a save or a delete anywhere (an Undo on the saved toast, a delete in the sheet) is seen at once, not on the next focus', async () => {
    mockList.mockResolvedValue(rows(1));
    await mount();
    expect(api.count).toBe(1);
    mockList.mockResolvedValue(rows(0));
    await act(async () => { fireClipsChanged(); });
    expect(api.count).toBe(0);
  });

  test('without a user or a workout there is nothing to record against', async () => {
    await AsyncStorage.setItem(SEEN, 'true');
    await mount({ userId: null, workoutId: 'w1' });
    await act(async () => { await api.openRecorder({ source: 'workout' }); });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(api.count).toBe(0);
  });
});
