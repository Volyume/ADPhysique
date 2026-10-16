/**
 * Settings > Your data > Workout videos (D229 addendum 15, lead rulings D, P,
 * R2): the keep choices.
 *
 * Pins, on the real screen:
 *   - choosing a SHORTER window first counts the videos it would remove now
 *     and, when there are any, asks with that count ("Remove N videos now?")
 *     before anything is saved; Cancel saves nothing and the chips do not
 *     move; "Remove them" saves, then sweeps;
 *   - a longer window, or "until I delete them", needs no question;
 *   - a shorter window that removes nothing needs no question either;
 *   - the chips show the new choice only once it is saved;
 *   - "Delete all videos" with none on the phone is inert and says so.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
const mockAlerts = [];
jest.mock('../../components/AppAlert', () => ({
  appAlert: (title, message, buttons) => { mockAlerts.push({ title, message, buttons }); },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../../lib/database', () => ({ clearWorkoutHistory: jest.fn(), buildWorkoutCSV: jest.fn() }));
jest.mock('../../lib/coachReport', () => ({ exportCoachReportPdf: jest.fn() }));
jest.mock('../../lib/dataBackup', () => ({ exportBackup: jest.fn(), importBackup: jest.fn() }));
jest.mock('../../lib/sync', () => ({
  getStatus: jest.fn(() => Promise.resolve(null)),
  syncAll: jest.fn(),
  deleteUserPref: jest.fn(() => Promise.resolve()),
  setUserPref: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/syncStatusLabel', () => ({ formatLastSynced: jest.fn(() => 'Last synced a moment ago') }));
jest.mock('../../components/SettingsPrimitives', () => {
  const { View, Text } = require('react-native');
  return {
    SettingsPage: ({ title, children }) => (<View><Text>{title}</Text>{children}</View>),
    SettingRow: ({ label, sub, onPress, showArrow }) => (
      <View testID={`row-${label}`} accessibilityLabel={label} onPress={onPress} showArrow={showArrow}>
        <Text>{label}</Text>
        {sub ? <Text>{sub}</Text> : null}
      </View>
    ),
    SectionHeader: ({ title }) => <Text>{title}</Text>,
    settingsStyles: { section: {}, dataPrivacyNote: {} },
    useSettingsStyles: () => ({}),
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
const mockStore = {
  keepDays: 30,
  count: 0,
  videos: { count: 3, bytes: 3 * 1024 * 1024 },
};
const mockSetKeepDays = jest.fn(async (d) => { mockStore.keepDays = d; return d; });
const mockSweep = jest.fn(async () => 0);
const mockCountExpired = jest.fn(async () => mockStore.count);
jest.mock('../../lib/clips/store', () => ({
  getClipsStorage: jest.fn(async () => mockStore.videos),
  getKeepDays: jest.fn(async () => mockStore.keepDays),
  setKeepDays: (...a) => mockSetKeepDays(...a),
  sweepExpiredClips: (...a) => mockSweep(...a),
  countExpiredClips: (...a) => mockCountExpired(...a),
  deleteAllClipsForUser: jest.fn(async () => 0),
}));

import useAppStore from '../../store/useAppStore';
import SettingsDataScreen from '../SettingsDataScreen';

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}
async function mount() {
  let tree;
  await act(async () => { tree = create(<SettingsDataScreen navigation={{}} />); });
  await flush();
  return tree;
}
const chip = (tree, days) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === `settings-keep-${days}`)[0];
const text = (tree) => JSON.stringify(tree.toJSON());

beforeEach(() => {
  jest.clearAllMocks();
  mockAlerts.length = 0;
  mockStore.keepDays = 30;
  mockStore.count = 0;
  mockStore.videos = { count: 3, bytes: 3 * 1024 * 1024 };
  useAppStore.mockImplementation((selector) => selector({ user: { id: 'u1' }, tier: 'free' }));
});

describe('the keep choices', () => {
  test('a title, the setting\'s own sub, and one radio group of four chips; the old "Keep videos for" row is gone', async () => {
    const tree = await mount();
    expect(text(tree)).toContain('Keep videos for');
    expect(text(tree)).toContain('Older videos are removed from this phone.');
    expect(tree.root.findAll((n) => n.props.testID === 'row-Keep videos for')).toHaveLength(0);
    const group = tree.root.findAll((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Keep videos for')[0];
    expect(group).toBeDefined();
    expect([7, 30, 90, 0].every((d) => !!chip(tree, d))).toBe(true);
    expect(chip(tree, 30).props.accessibilityState).toMatchObject({ checked: true });
    expect(chip(tree, 7).props.accessibilityState).toMatchObject({ checked: false });
  });

  test('at "until I delete them" the sub says videos stay', async () => {
    mockStore.keepDays = 0;
    const tree = await mount();
    expect(text(tree)).toContain('Videos stay on this phone until you delete them. A video of a PR set is kept for you.');
  });

  test('a shorter window that would remove videos asks first, with the count; the chips do not move until it is saved', async () => {
    mockStore.count = 4;
    const tree = await mount();
    await act(async () => { chip(tree, 7).props.onPress(); });
    await flush();
    expect(mockCountExpired).toHaveBeenCalledWith('u1', { keepDays: 7 });
    expect(mockAlerts).toHaveLength(1);
    expect(mockAlerts[0].title).toBe('Remove 4 videos now?');
    expect(mockAlerts[0].message).toBe('4 videos older than 7 days will be removed from this phone. Videos you have kept, and videos of PR sets, stay.');
    expect(mockAlerts[0].buttons.map((b) => [b.text, b.style])).toEqual([['Cancel', 'cancel'], ['Remove them', 'destructive']]);
    // Nothing is saved, swept or shown until the answer.
    expect(mockSetKeepDays).not.toHaveBeenCalled();
    expect(mockSweep).not.toHaveBeenCalled();
    expect(chip(tree, 30).props.accessibilityState).toMatchObject({ checked: true });
    expect(chip(tree, 7).props.accessibilityState).toMatchObject({ checked: false });
    // Cancel changes nothing.
    expect(mockAlerts[0].buttons[0].onPress).toBeUndefined();
    // "Remove them" saves, then sweeps.
    await act(async () => { mockAlerts[0].buttons[1].onPress(); });
    await flush();
    expect(mockSetKeepDays).toHaveBeenCalledWith(7);
    expect(mockSweep).toHaveBeenCalledWith('u1', { force: true });
    expect(chip(tree, 7).props.accessibilityState).toMatchObject({ checked: true });
  });

  test('one video reads "Remove 1 video now?"', async () => {
    mockStore.count = 1;
    const tree = await mount();
    await act(async () => { chip(tree, 7).props.onPress(); });
    await flush();
    expect(mockAlerts[0].title).toBe('Remove 1 video now?');
    expect(mockAlerts[0].message).toMatch(/^1 video older than 7 days will be removed/);
  });

  test('a shorter window that removes nothing saves at once, with no question', async () => {
    mockStore.count = 0;
    const tree = await mount();
    await act(async () => { chip(tree, 7).props.onPress(); });
    await flush();
    expect(mockAlerts).toHaveLength(0);
    expect(mockSetKeepDays).toHaveBeenCalledWith(7);
    expect(mockSweep).toHaveBeenCalledTimes(1);
  });

  test('a longer window, or until I delete them, never asks and never counts', async () => {
    mockStore.count = 9;
    const tree = await mount();
    await act(async () => { chip(tree, 90).props.onPress(); });
    await flush();
    expect(mockAlerts).toHaveLength(0);
    expect(mockSetKeepDays).toHaveBeenLastCalledWith(90);
    await act(async () => { chip(tree, 0).props.onPress(); });
    await flush();
    expect(mockAlerts).toHaveLength(0);
    expect(mockSetKeepDays).toHaveBeenLastCalledWith(0);
    expect(mockCountExpired).not.toHaveBeenCalled();
  });
});

describe('Delete all videos', () => {
  test('with none on the phone it is inert: no press, no arrow, and it says so', async () => {
    mockStore.videos = { count: 0, bytes: 0 };
    const tree = await mount();
    const row = tree.root.findAll((n) => n.props.testID === 'row-Delete all videos')[0];
    expect(row.props.onPress).toBeNull();
    expect(row.props.showArrow).toBe(false);
    expect(text(tree)).toContain('No videos on this phone.');
  });

  test('with videos it keeps its press and its arrow', async () => {
    const tree = await mount();
    const row = tree.root.findAll((n) => n.props.testID === 'row-Delete all videos')[0];
    expect(typeof row.props.onPress).toBe('function');
    expect(row.props.showArrow).toBe(true);
    expect(text(tree)).toContain('Deletes every workout video from this phone.');
  });
});
