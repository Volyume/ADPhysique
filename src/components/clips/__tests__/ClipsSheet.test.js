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
const mockList = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../../lib/clips/store', () => ({
  listClipsForWorkout: (...a) => mockList(...a),
  deleteClip: (...a) => mockDelete(...a),
  countClipsForWorkout: jest.fn(async () => 0),
}));

import ClipsSheet from '../ClipsSheet';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ClipsSheet.js'), 'utf8');
const at = (h, m) => new Date(2026, 9, 15, h, m, 0).getTime();

const CLIPS = [
  { id: 'c3', exerciseName: 'Back squat', setNumber: 2, source: 'workout', durationMs: 12000, createdAt: at(18, 42) },
  { id: 'c2', exerciseName: null, setNumber: null, source: 'summary', durationMs: 15000, createdAt: at(18, 31) },
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
    const withNotice = JSON.stringify((await render({ notice: 'This workout already has 3 videos. Delete one to record another.' })).toJSON());
    expect(withNotice).toContain('Delete one to record another.');
  });

  test('each row has a Delete button; it deletes through the store, refreshes and tells the caller', async () => {
    const onChanged = jest.fn();
    mockDelete.mockResolvedValue(true);
    const tree = await render({ onChanged });
    const buttons = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Delete video') && typeof n.props.onPress === 'function');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(buttons[0].props.accessibilityLabel).toBe('Delete video, Back squat, set 2, 12 seconds');
    mockList.mockResolvedValue(CLIPS.slice(1));
    await act(async () => { buttons[0].props.onPress(); });
    expect(mockDelete).toHaveBeenCalledWith('c3');
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith('Video deleted');
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain('Back squat, set 2');
  });

  test('a delete that fails says so calmly and changes nothing', async () => {
    const onChanged = jest.fn();
    mockDelete.mockRejectedValue(new Error('EBUSY'));
    const tree = await render({ onChanged });
    const button = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Delete video') && typeof n.props.onPress === 'function')[0];
    await act(async () => { button.props.onPress(); });
    expect(mockShow).toHaveBeenCalledWith("Couldn't delete that video. Try again.", { variant: 'error' });
    expect(onChanged).not.toHaveBeenCalled();
  });

  test('an empty workout reads as empty rather than blank', async () => {
    mockList.mockResolvedValue([]);
    const json = JSON.stringify((await render()).toJSON());
    expect(json).toContain('No videos saved for this workout.');
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
