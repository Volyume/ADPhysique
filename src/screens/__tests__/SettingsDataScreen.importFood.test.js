/**
 * Settings > Your data > "Import food history" (D230 R21 and plan 4.12, lane
 * 4C).
 *
 * Pins, on the real screen:
 *  - the row is a house SettingRow in the same list as the other import, right
 *    after "Import from another app", with that row's shape (a label, a sub
 *    with no full stop, an arrow);
 *  - pressing it opens the picker; a cancelled pick does nothing at all (no
 *    sheet, no alert, no toast, no log);
 *  - a file that is neither export gets the calm alert and no sheet;
 *  - a read file opens the review sheet with its plan, and nothing is written
 *    by the screen itself;
 *  - a file that cannot be read gets the calm sentence, and the log line
 *    carries only the stage and the error code;
 *  - while the file is being read the row says so and cannot be pressed twice.
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
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));
const mockLogError = jest.fn();
jest.mock('../../lib/errorLog', () => ({ logError: (...a) => mockLogError(...a) }));
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
    SettingRow: ({ label, sub, onPress, showArrow, icon }) => (
      <View testID="setting-row" accessibilityLabel={label} onPress={onPress} showArrow={showArrow} icon={icon} sub={sub}>
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
jest.mock('../../lib/clips/store', () => ({
  getClipsStorage: jest.fn(async () => ({ count: 0, bytes: 0 })),
  getKeepDays: jest.fn(async () => 30),
  setKeepDays: jest.fn(async (d) => d),
  sweepExpiredClips: jest.fn(async () => 0),
  countExpiredClips: jest.fn(async () => 0),
  deleteAllClipsForUser: jest.fn(async () => 0),
}));
const mockPick = jest.fn();
const mockPlanFromText = jest.fn();
jest.mock('../../lib/food/importHistoryFlow', () => ({
  pickHistoryFile: (...a) => mockPick(...a),
  planFromText: (...a) => mockPlanFromText(...a),
}));
jest.mock('../../components/food/ImportHistorySheet', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props) => <View testID="import-history-sheet" {...props} /> };
});

import useAppStore from '../../store/useAppStore';
import SettingsDataScreen from '../SettingsDataScreen';

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}
async function mount() {
  let tree;
  await act(async () => { tree = create(<SettingsDataScreen navigation={{ navigate: jest.fn() }} />); });
  await flush();
  return tree;
}
const rows = (tree) => tree.root.findAll((n) => n.props.testID === 'setting-row' && typeof n.type === 'string');
const row = (tree, label) => rows(tree).find((n) => n.props.accessibilityLabel === label);
const sheet = (tree) => tree.root.findAll((n) => n.props.testID === 'import-history-sheet' && typeof n.type === 'string')[0];
async function pressImport(tree) {
  await act(async () => { await row(tree, 'Import food history').props.onPress(); });
  await flush();
}

const PLAN = { rowsRead: 3, addedRows: 3, problems: [], entries: [], customFoods: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockAlerts.length = 0;
  useAppStore.mockImplementation((selector) => selector({ user: { id: 'u1' }, tier: 'free' }));
});

describe('the row', () => {
  test('sits right after "Import from another app", in that row\'s shape', async () => {
    const tree = await mount();
    const labels = rows(tree).map((n) => n.props.accessibilityLabel);
    const i = labels.indexOf('Import from another app');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(labels[i + 1]).toBe('Import food history');
    const r = row(tree, 'Import food history');
    expect(r.props.sub).toBe('Bring your diary over from MyFitnessPal or Cronometer');
    expect(r.props.sub).not.toMatch(/\.$/);
    expect(r.props.icon).toBe('restaurant-outline');
    expect(typeof r.props.onPress).toBe('function');
    expect(r.props.showArrow).not.toBe(false);
    expect(sheet(tree)).toBeUndefined();
  });
});

describe('pressing it', () => {
  test('a cancelled pick does nothing at all', async () => {
    mockPick.mockResolvedValueOnce({ cancelled: true });
    const tree = await mount();
    await pressImport(tree);
    expect(mockPick).toHaveBeenCalledTimes(1);
    expect(mockPlanFromText).not.toHaveBeenCalled();
    expect(sheet(tree)).toBeUndefined();
    expect(mockAlerts).toHaveLength(0);
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockLogError.mock.calls.filter((c) => /^ImportHistory\./.test(c[0]))).toEqual([]);
  });

  test('a file that is neither export gets the calm alert and no sheet', async () => {
    mockPick.mockResolvedValueOnce({ text: 'Date,Exercise\n' });
    mockPlanFromText.mockResolvedValueOnce({ error: 'That file does not look like a MyFitnessPal or Cronometer export.' });
    const tree = await mount();
    await pressImport(tree);
    expect(mockAlerts).toEqual([{ title: 'Import food history', message: 'That file does not look like a MyFitnessPal or Cronometer export.', buttons: undefined }]);
    expect(sheet(tree)).toBeUndefined();
  });

  test('a read file opens the review sheet with its plan', async () => {
    mockPick.mockResolvedValueOnce({ text: 'csv' });
    mockPlanFromText.mockResolvedValueOnce({ format: 'mfp', plan: PLAN });
    const tree = await mount();
    await pressImport(tree);
    expect(mockPlanFromText).toHaveBeenCalledWith('u1', 'csv');
    const s = sheet(tree);
    expect(s).toBeDefined();
    expect(s.props.plan).toBe(PLAN);
    expect(s.props.userId).toBe('u1');
    expect(s.props.visible).toBe(true);
    await act(async () => { s.props.onClose(); });
    expect(sheet(tree)).toBeUndefined();
  });

  test('a file that cannot be read gets a calm sentence; the log carries the stage and code only', async () => {
    const err = Object.assign(new Error('import read failed: too_large'), { code: 'too_large', sentence: 'That file is larger than 10 MB. Export a shorter date range and try again.' });
    mockPick.mockRejectedValueOnce(err);
    const tree = await mount();
    await pressImport(tree);
    expect(mockToastShow).toHaveBeenCalledWith('That file is larger than 10 MB. Export a shorter date range and try again.', { variant: 'error' });
    expect(mockLogError).toHaveBeenCalledWith('ImportHistory.read', err, { stage: 'pick', code: 'too_large' });
    expect(sheet(tree)).toBeUndefined();
  });

  test('an unexpected failure while planning says the file could not be read', async () => {
    mockPick.mockResolvedValueOnce({ text: 'csv' });
    const err = new Error('SQLITE_BUSY');
    mockPlanFromText.mockRejectedValueOnce(err);
    const tree = await mount();
    await pressImport(tree);
    expect(mockToastShow).toHaveBeenCalledWith('That file could not be read. Try exporting it again.', { variant: 'error' });
    expect(mockLogError).toHaveBeenCalledWith('ImportHistory.read', err, { stage: 'plan', code: null });
  });

  test('while the file is read the row says so and cannot be pressed again', async () => {
    let release;
    mockPick.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ cancelled: true }); }));
    const tree = await mount();
    act(() => { row(tree, 'Import food history').props.onPress(); });
    await flush();
    const busy = row(tree, 'Reading the file...');
    expect(busy).toBeDefined();
    expect(busy.props.onPress).toBeNull();
    expect(busy.props.showArrow).toBe(false);
    await act(async () => { release(); });
    await flush();
    expect(row(tree, 'Import food history')).toBeDefined();
    expect(mockPick).toHaveBeenCalledTimes(1);
  });
});
