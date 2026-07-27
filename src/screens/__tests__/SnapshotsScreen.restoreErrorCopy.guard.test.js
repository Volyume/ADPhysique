/**
 * Regression pin for C2 (pre-release sweep 2026-07-27, LANE C — "raw error
 * messages reaching users"). SnapshotsScreen used to show the raw native
 * FileSystem error string (`e?.message`) in the alert shown mid-way through
 * the destructive "this replaces ALL current data" restore flow. Fixed to
 * match SettingsDataScreen's calm generic copy for the equivalent JSON-backup
 * failure, with the real error still captured via logError.
 *
 * Mock surface mirrors SnapshotsScreen.load.guard.test.js (the existing
 * regression suite for this screen's load path). Mock fns are named with a
 * leading `mock` so Jest's out-of-scope-variable guard for `jest.mock()`
 * factories allows referencing them.
 */
import { create, act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('../../components/SettingsPrimitives', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    SettingsPage: ({ title, children }) => (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    ),
    SettingRow: ({ label, sub, onPress }) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={label}>
        <Text>{label}</Text>
        {sub ? <Text>{sub}</Text> : null}
      </TouchableOpacity>
    ),
    settingsStyles: { section: {} },
    useSettingsStyles: () => ({}),
  };
});

const mockAppAlert = jest.fn();
jest.mock('../../components/AppAlert', () => ({ appAlert: (...args) => mockAppAlert(...args) }));
jest.mock('../../lib/database', () => ({ closeDatabase: jest.fn(async () => {}) }));

const RAW_NATIVE_ERROR = 'ENOENT: FileSystem copyAsync failed at /data/user/0/app/db-snap-3.sqlite';
const mockRestoreSnapshot = jest.fn();
jest.mock('../../lib/dbSnapshot', () => ({
  listSnapshots: jest.fn(async () => ([
    { uri: 'snapshot-1', label: 'Before v2.4.0', sizeBytes: 4096 },
  ])),
  restoreSnapshot: (...args) => mockRestoreSnapshot(...args),
}));

const mockLogError = jest.fn();
jest.mock('../../lib/errorLog', () => ({ logError: (...args) => mockLogError(...args) }));

import SnapshotsScreen from '../SnapshotsScreen';

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SnapshotsScreen restore-failure copy (C2 pin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRestoreSnapshot.mockRejectedValue(new Error(RAW_NATIVE_ERROR));
  });

  test('a failed restore never shows the raw native error string, and logs the real one', async () => {
    let tree;
    await act(async () => { tree = create(<SnapshotsScreen />); });
    await flush();

    // Tap the snapshot row -> appAlert('Restore this snapshot?', ..., [Cancel, Restore]).
    const row = tree.root.findByProps({ accessibilityLabel: 'Before v2.4.0' });
    await act(async () => { row.props.onPress(); });
    expect(mockAppAlert).toHaveBeenCalledTimes(1);
    const [, , buttons] = mockAppAlert.mock.calls[0];
    const restoreButton = buttons.find(b => b.text === 'Restore');
    expect(restoreButton).toBeTruthy();

    // Run the destructive restore, which rejects with the raw native error.
    await act(async () => { await restoreButton.onPress(); });
    await flush();

    expect(mockLogError).toHaveBeenCalledWith('SnapshotsScreen.restore', expect.objectContaining({ message: RAW_NATIVE_ERROR }));

    // The second appAlert call is the failure alert, its body must never
    // contain the raw native error text.
    expect(mockAppAlert).toHaveBeenCalledTimes(2);
    const [failTitle, failBody] = mockAppAlert.mock.calls[1];
    expect(failTitle).toBe('Restore failed');
    expect(failBody).not.toContain(RAW_NATIVE_ERROR);
    expect(failBody).not.toContain('ENOENT');
    expect(failBody.toLowerCase()).toContain('try again');
  });
});
