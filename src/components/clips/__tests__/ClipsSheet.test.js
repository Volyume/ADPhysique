/**
 * ClipsSheet (D229 addendum 5): a workout's clips, listed so one can be
 * deleted. Pins the rows (exercise name or "Workout", length as "0:12", recorded
 * time), that Delete removes the clip through the store and tells the caller,
 * the full-workout notice, and that there are no thumbnails.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn(), commit: jest.fn() }));
const mockShow = jest.fn();
jest.mock('../../Toast', () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock('../../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));
// The house alert: its buttons are kept so a test can answer the question.
const mockAlerts = [];
jest.mock('../../AppAlert', () => ({ appAlert: (title, message, buttons) => { mockAlerts.push({ title, message, buttons }); } }));
jest.mock('../ClipPlayer', () => {
  const mockReact = require('react');
  return { __esModule: true, default: (props) => mockReact.createElement('ClipPlayer', props) };
});
const mockList = jest.fn();
const mockDelete = jest.fn();
const mockSetKept = jest.fn(async () => true);
jest.mock('../../../lib/clips/store', () => ({
  listClipsForWorkout: (...a) => mockList(...a),
  deleteClip: (...a) => mockDelete(...a),
  countClipsForWorkout: jest.fn(async () => 0),
  // Addendum 15: keeping, the size line and the keep setting.
  setClipKept: (...a) => mockSetKept(...a),
  getClipsStorage: jest.fn(async () => ({ count: 2, bytes: 150 * 1024 * 1024 })),
  getKeepDays: jest.fn(async () => 7),
}));

import ClipsSheet from '../ClipsSheet';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ClipsSheet.js'), 'utf8');
const at = (h, m) => new Date(2026, 9, 15, h, m, 0).getTime();

const CLIPS = [
  { id: 'c3', uri: 'file:///docs/clips/c3.mp4', exerciseName: 'Back squat', setNumber: 2, source: 'workout', durationMs: 12000, createdAt: at(18, 42) },
  { id: 'c2', uri: 'file:///docs/clips/c2.mp4', exerciseName: null, setNumber: null, source: 'summary', durationMs: 15000, createdAt: at(18, 31) },
  { id: 'c1', exerciseName: 'Bench press', setNumber: 3, source: 'workout', durationMs: 4400, createdAt: at(17, 58) },
];

async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<ClipsSheet visible userId="u1" workoutId="w1" onClose={() => {}} {...props} />);
  });
  await act(async () => {});
  return tree;
}

beforeEach(() => {
  mockShow.mockClear();
  mockAlerts.length = 0;
  mockDelete.mockReset();
  mockList.mockReset();
  mockList.mockResolvedValue(CLIPS);
});

describe('ClipsSheet', () => {
  test('each row reads "Bench press, set 3, 0:12": the exercise, the set, the length; the time under it', async () => {
    const json = JSON.stringify((await render()).toJSON());
    for (const word of ['Back squat, set 2, 0:12', 'After the workout, 0:15', 'Bench press, set 3, 0:04', '18:42', '18:31', '17:58']) {
      expect(json).toContain(word);
    }
    expect(mockList).toHaveBeenCalledWith('u1', 'w1');
  });

  test('the sheet is titled in plain words', async () => {
    expect(JSON.stringify((await render()).toJSON())).toContain('Your videos');
  });

  test('it explains nothing beyond its rows: no privacy caption (the primer says it, once), only the notice when given one', async () => {
    const plain = JSON.stringify((await render()).toJSON());
    expect(plain).not.toMatch(/stay on this phone|never uploaded|unless you share/i);
    const withNotice = JSON.stringify((await render({ notice: 'This workout already has 3 videos, the most it can hold. Delete one if you want to record another.' })).toJSON());
    expect(withNotice).toContain('Delete one if you want to record another.');
  });

  test('each row has a Delete button; it asks once, then deletes through the store, refreshes and tells the caller', async () => {
    const onChanged = jest.fn();
    mockDelete.mockResolvedValue(true);
    const tree = await render({ onChanged });
    const buttons = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Delete video') && typeof n.props.onPress === 'function');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(buttons[0].props.accessibilityLabel).toBe('Delete video, Back squat, set 2, 12 seconds');
    mockList.mockResolvedValue(CLIPS.slice(1));
    await act(async () => { buttons[0].props.onPress(); });
    // Nothing goes on the first tap: one plain question first.
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockAlerts).toHaveLength(1);
    expect(mockAlerts[0].title).toBe('Delete this video?');
    expect(mockAlerts[0].message).toBe('It will be removed from your phone.');
    expect(mockAlerts[0].buttons.map((b) => [b.text, b.style])).toEqual([['Keep', 'cancel'], ['Delete', 'destructive']]);
    await act(async () => { mockAlerts[0].buttons[1].onPress(); });
    expect(mockDelete).toHaveBeenCalledWith('c3');
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith('That video has been deleted');
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain('Back squat, set 2');
  });

  test('playOnOpenId ("Watch", addendum 13): the named video plays the moment the sheet opens; an unknown id plays nothing', async () => {
    const players = (tree) => tree.root.findAll((n) => n.type === 'ClipPlayer');
    const tree = await render({ playOnOpenId: CLIPS[1].id });
    expect(players(tree)).toHaveLength(1);
    expect(players(tree)[0].props.uri).toBe(CLIPS[1].uri);
    const other = await render({ playOnOpenId: 'gone' });
    expect(players(other)).toHaveLength(0);
  });

  test('"Keep" deletes nothing', async () => {
    const onChanged = jest.fn();
    const tree = await render({ onChanged });
    const button = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Delete video') && typeof n.props.onPress === 'function')[0];
    await act(async () => { button.props.onPress(); });
    expect(mockAlerts[0].buttons[0].onPress).toBeUndefined();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  test('a delete that fails says so calmly and changes nothing', async () => {
    const onChanged = jest.fn();
    mockDelete.mockRejectedValue(new Error('EBUSY'));
    const tree = await render({ onChanged });
    const button = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Delete video') && typeof n.props.onPress === 'function')[0];
    await act(async () => { button.props.onPress(); });
    await act(async () => { mockAlerts[0].buttons[1].onPress(); });
    expect(mockShow).toHaveBeenCalledWith("That video couldn't be deleted. You can try again.", { variant: 'error' });
    expect(onChanged).not.toHaveBeenCalled();
  });

  test('each row has a Play button: the video plays under its row, one at a time, and stops on the same button', async () => {
    const tree = await render();
    const plays = () => tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Play video') && typeof n.props.onPress === 'function');
    const players = () => tree.root.findAll((n) => n.type === 'ClipPlayer');
    expect(plays().length).toBeGreaterThanOrEqual(3);
    expect(plays()[0].props.accessibilityLabel).toBe('Play video, Back squat, set 2');
    expect(players()).toHaveLength(0);
    await act(async () => { plays()[0].props.onPress(); });
    expect(players()).toHaveLength(1);
    expect(players()[0].props.uri).toBe(CLIPS[0].uri);
    const stops = () => tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Stop video') && typeof n.props.onPress === 'function');
    expect(stops().length).toBeGreaterThanOrEqual(1);
    expect(new Set(stops().map((n) => n.props.accessibilityLabel)).size).toBe(1);
    // Another row's Play swaps the one player to that video.
    await act(async () => { plays()[0].props.onPress(); });
    expect(players()).toHaveLength(1);
    expect(players()[0].props.uri).toBe(CLIPS[1].uri);
    expect(stops()[0].props.accessibilityLabel).toBe('Stop video, After the workout');
    await act(async () => { stops()[0].props.onPress(); });
    expect(players()).toHaveLength(0);
  });

  test('an empty workout reads as empty rather than blank', async () => {
    mockList.mockResolvedValue([]);
    const json = JSON.stringify((await render()).toJSON());
    expect(json).toContain('There are no videos saved for this workout yet.');
  });

  test('it loads nothing until it is opened', async () => {
    await render({ visible: false });
    expect(mockList).not.toHaveBeenCalled();
  });

  test('no thumbnails: the sheet draws no image and imports no frame extractor', () => {
    expect(SOURCE).not.toMatch(/<Image\b|expo-image|expo-video-thumbnails|expo-av/);
    expect(SOURCE).toMatch(/NO thumbnails/);
  });
});

// D229 addendum 15: Keep, Kept, and the line that says the rule and the size.
describe('keeping (addendum 15)', () => {
  test('each row has Keep; tapping it keeps the video through the store and the row then reads Kept', async () => {
    mockList.mockResolvedValueOnce(CLIPS).mockResolvedValueOnce(CLIPS.map((c) => (c.id === 'c3' ? { ...c, keptAt: 1, keptReason: 'person' } : c)));
    const tree = await render();
    const keep = tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'clip-keep-c3')[0];
    expect(keep.props.accessibilityLabel).toBe('Keep this video until you delete it, Back squat, set 2');
    await act(async () => { keep.props.onPress(); });
    await act(async () => {});
    expect(mockSetKept).toHaveBeenCalledWith('c3', true);
    const kept = tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'clip-keep-c3')[0];
    expect(kept.props.accessibilityLabel).toBe('Kept until you delete it. Double tap to stop keeping it, Back squat, set 2');
  });

  test('a PR set\'s video reads Kept, a PR set; tapping Kept lets it go back to the rule', async () => {
    mockList.mockResolvedValue(CLIPS.map((c) => (c.id === 'c1' ? { ...c, keptAt: 1, keptReason: 'pr' } : c)));
    const tree = await render();
    const kept = tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'clip-keep-c1')[0];
    expect(kept.props.accessibilityLabel).toBe('Kept, a PR set, Bench press, set 3');
    await act(async () => { kept.props.onPress(); });
    expect(mockSetKept).toHaveBeenCalledWith('c1', false);
  });

  test('under the list: the size and the rule in the person\'s own setting', async () => {
    const tree = await render();
    const foot = tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'clips-sheet-foot')[0];
    expect(foot.props.children).toBe('2 videos, 150 MB. Kept for 7 days unless you keep one. Change this in Settings, under Your data.');
  });
});
