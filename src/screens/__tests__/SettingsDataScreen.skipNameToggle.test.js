/**
 * L05-SL1 (design audit 2026-07-09): ScanLabelScreen's "Skip name" choice
 * writes '@volyume_scan_skip_name' = 'true' to AsyncStorage with no in-app
 * way to clear it globally (only a per-scan "Add a name" link, which never
 * touches the flag - see ScanLabelScreen.test.js). This pins the fix: a
 * Pro-only Settings toggle on SettingsDataScreen that reads the same key on
 * focus and, when switched off, clears it with removeItem (not setItem
 * 'false' - ScanLabelScreen.getInitialStep only treats the literal 'true' as
 * "skip"), so the next label scan asks for a name again. Switching it on
 * sets the flag the same way "Skip name" does, so it is a genuine two-way
 * toggle, not a one-shot reset button.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../../lib/database', () => ({
  clearWorkoutHistory: jest.fn(),
  buildWorkoutCSV: jest.fn(),
}));
jest.mock('../../lib/coachReport', () => ({ exportCoachReportPdf: jest.fn() }));
jest.mock('../../lib/dataBackup', () => ({ exportBackup: jest.fn(), importBackup: jest.fn() }));
jest.mock('../../lib/sync', () => ({
  getStatus: jest.fn(() => Promise.resolve(null)),
  syncAll: jest.fn(),
}));
jest.mock('../../lib/syncStatusLabel', () => ({ formatLastSynced: jest.fn(() => 'Last synced a moment ago') }));
jest.mock('../../components/SettingsPrimitives', () => {
  const { View, Text } = require('react-native');
  return {
    SettingsPage: ({ title, children }) => (<View><Text>{title}</Text>{children}</View>),
    SettingRow: ({ label, sub, rightElement }) => (
      <View>
        <Text>{label}</Text>
        {sub ? <Text>{sub}</Text> : null}
        {rightElement || null}
      </View>
    ),
    SectionHeader: ({ title }) => <Text>{title}</Text>,
    settingsStyles: { section: {}, dataPrivacyNote: {} },
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import SettingsDataScreen from '../SettingsDataScreen';

const SCAN_SKIP_NAME_KEY = '@volyume_scan_skip_name';

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function findSwitch(tree) {
  return tree.root.findAll((n) => typeof n.props.onValueChange === 'function')[0];
}

describe('SettingsDataScreen "Skip name on label scans" toggle (L05-SL1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    useAppStore.mockImplementation((selector) => selector({ user: { id: 'u1' }, tier: 'pro' }));
  });

  test('free tier never sees the Pro-gated row', async () => {
    useAppStore.mockImplementation((selector) => selector({ user: { id: 'u1' }, tier: 'free' }));
    let tree;
    await act(async () => { tree = create(<SettingsDataScreen navigation={{}} />); });
    await flush();
    expect(tree.root.findAllByType('Text').some(n => n.children.join('') === 'Skip name on label scans')).toBe(false);
  });

  test('reads the persisted flag on focus and reflects it as on', async () => {
    AsyncStorage.getItem.mockImplementation((key) => (
      key === SCAN_SKIP_NAME_KEY ? Promise.resolve('true') : Promise.resolve(null)
    ));
    let tree;
    await act(async () => { tree = create(<SettingsDataScreen navigation={{}} />); });
    await flush();
    const sw = findSwitch(tree);
    expect(sw.props.value).toBe(true);
  });

  test('switching off clears the flag with removeItem, not a falsy setItem', async () => {
    AsyncStorage.getItem.mockImplementation((key) => (
      key === SCAN_SKIP_NAME_KEY ? Promise.resolve('true') : Promise.resolve(null)
    ));
    let tree;
    await act(async () => { tree = create(<SettingsDataScreen navigation={{}} />); });
    await flush();

    const sw = findSwitch(tree);
    await act(async () => { sw.props.onValueChange(false); });
    await flush();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(SCAN_SKIP_NAME_KEY);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(SCAN_SKIP_NAME_KEY, expect.anything());
  });

  test('switching on sets the flag the same way "Skip name" does', async () => {
    let tree;
    await act(async () => { tree = create(<SettingsDataScreen navigation={{}} />); });
    await flush();

    const sw = findSwitch(tree);
    expect(sw.props.value).toBe(false);
    await act(async () => { sw.props.onValueChange(true); });
    await flush();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(SCAN_SKIP_NAME_KEY, 'true');
  });
});
