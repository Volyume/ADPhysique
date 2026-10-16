/**
 * HistoryClipsRow (D229 addendum 5, ruling 3): the "Clips" row in a workout's
 * history detail. Pins that it shows the count when any exist, draws nothing
 * (and loads nothing) when none, opens the clips sheet, and that it is visible
 * in EVERY state: calm mode and an open ED flag included. Viewing and deleting
 * your own clips is never withheld, so neither file reads a suppression.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn(), commit: jest.fn() }));
jest.mock('../../Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));
// Calm mode on AND an open flag: the row must still show.
jest.mock('../../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: () => true }));
const mockCount = jest.fn();
const mockList = jest.fn();
const mockSetKept = jest.fn(async () => true);
jest.mock('../../../lib/clips/store', () => ({
  countClipsForWorkout: (...a) => mockCount(...a),
  listClipsForWorkout: (...a) => mockList(...a),
  deleteClip: jest.fn(async () => true),
  // Addendum 15: keeping, the size line and the keep setting.
  setClipKept: (...a) => mockSetKept(...a),
  getClipsStorage: jest.fn(async () => ({ count: 2, bytes: 150 * 1024 * 1024 })),
  getKeepDays: jest.fn(async () => 7),
  // The store's change subscription, fired by tests to play a save or a
  // delete elsewhere (the listeners live here: an import is hoisted above
  // any const of this file).
  subscribeClips: (fn) => { mockStoreListeners.add(fn); return () => mockStoreListeners.delete(fn); },
}));
const mockStoreListeners = new Set();
const fireClipsChanged = () => { mockStoreListeners.forEach((fn) => fn()); };

import HistoryClipsRow from '../HistoryClipsRow';

const DIR = path.join(__dirname, '..');
const ROW = fs.readFileSync(path.join(DIR, 'HistoryClipsRow.js'), 'utf8');
const BODY = fs.readFileSync(path.join(DIR, 'HistoryClipsRowBody.js'), 'utf8');

async function mount() {
  let tree;
  await act(async () => { tree = create(<HistoryClipsRow userId="u1" workoutId="w1" />); });
  await act(async () => {});
  return tree;
}

beforeEach(() => {
  mockCount.mockReset();
  mockList.mockReset();
  mockList.mockResolvedValue([{ id: 'c1', exerciseName: 'Back squat', durationMs: 12000, createdAt: 1 }]);
});

describe('HistoryClipsRow', () => {
  test('shows "Your videos" with the count when the workout has any', async () => {
    mockCount.mockResolvedValue(2);
    const json = JSON.stringify((await mount()).toJSON());
    expect(json).toContain('Your videos');
    expect(json).toContain('2 videos');
    expect(mockCount).toHaveBeenCalledWith('u1', 'w1');
  });

  test('a delete elsewhere is seen at once: the count re-reads on the store\'s change signal', async () => {
    mockCount.mockResolvedValue(2);
    const tree = await mount();
    expect(JSON.stringify(tree.toJSON())).toContain('2 videos');
    mockCount.mockResolvedValue(1);
    await act(async () => { fireClipsChanged(); });
    expect(JSON.stringify(tree.toJSON())).toContain('1 video');
  });

  test('says "1 clip" for one', async () => {
    mockCount.mockResolvedValue(1);
    expect(JSON.stringify((await mount()).toJSON())).toContain('1 video');
  });

  test('draws nothing, and loads no sheet, when the workout has none', async () => {
    mockCount.mockResolvedValue(0);
    const tree = await mount();
    expect(tree.toJSON()).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
  });

  test('tapping the row opens the clips sheet for that workout', async () => {
    mockCount.mockResolvedValue(1);
    const tree = await mount();
    const row = tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Your videos') && typeof n.props.onPress === 'function')[0];
    expect(row).toBeDefined();
    await act(async () => { row.props.onPress(); });
    await act(async () => {});
    expect(mockList).toHaveBeenCalledWith('u1', 'w1');
    expect(JSON.stringify(tree.toJSON())).toContain('Back squat');
  });

  test('visible in every state: it shows while the suppression hook says calm / flag (it does not ask)', async () => {
    mockCount.mockResolvedValue(3);
    expect(JSON.stringify((await mount()).toJSON())).toContain('3 videos');
  });

  test('a count that cannot be read shows nothing rather than failing the history card', async () => {
    mockCount.mockRejectedValue(new Error('db'));
    const tree = await mount();
    expect(tree.toJSON()).toBeNull();
  });

  test('neither file reads calm mode, the ED flag or the suppression hook', () => {
    for (const src of [ROW, BODY]) {
      expect(src).not.toMatch(/usePhotoSuppression|useSafetyState|safetyState|wellbeing|getOpenEdPatternFlag|isCalm|calmSuppressed/);
    }
  });
});
