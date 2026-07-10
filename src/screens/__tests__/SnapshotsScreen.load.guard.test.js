import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

let focusCallback = null;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    focusCallback = callback;
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('../../components/SettingsPrimitives', () => {
  const { View, Text } = require('react-native');
  return {
    SettingsPage: ({ title, children }) => (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    ),
    SettingRow: ({ label, sub }) => (
      <View>
        <Text>{label}</Text>
        {sub ? <Text>{sub}</Text> : null}
      </View>
    ),
    settingsStyles: { section: {} },
    // CP-10 stage 3: SnapshotsScreen now calls useSettingsStyles() for its
    // live theme override; stand in for it the same way the other exports
    // here stand in for the real primitives.
    useSettingsStyles: () => ({}),
  };
});
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/database', () => ({ closeDatabase: jest.fn() }));
jest.mock('../../lib/dbSnapshot', () => ({
  listSnapshots: jest.fn(),
  restoreSnapshot: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import { listSnapshots } from '../../lib/dbSnapshot';
import SnapshotsScreen from '../SnapshotsScreen';

const source = fs.readFileSync(path.join(__dirname, '..', 'SnapshotsScreen.js'), 'utf8');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

describe('SnapshotsScreen load guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    focusCallback = null;
    listSnapshots.mockResolvedValue([]);
  });

  test('uses focus-driven loading with a latest-request guard', () => {
    expect(source).toMatch(/const loadRequestRef = useRef\(0\);/);
    expect(source).toMatch(/loadRequestRef\.current = requestId;/);
    expect(source).toMatch(/if \(isCurrentRequest\(\)\) \{/);
    expect(source).toMatch(/setSnapshots\(items\);/);
    expect(source).toMatch(/logError\('SnapshotsScreen\.load', e\);/);
    expect(source).toMatch(/setLoadError\(true\);/);
    expect(source).not.toMatch(/useEffect\(\(\) => \{ load\(\); \}, \[load\]\);/);
  });

  test('an older snapshot load cannot overwrite a newer focused load', async () => {
    const older = deferred();
    const newer = deferred();
    listSnapshots
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);

    let tree;
    await act(async () => { tree = create(<SnapshotsScreen />); });
    await flush();
    expect(listSnapshots).toHaveBeenCalledTimes(1);

    await act(async () => { focusCallback(); });
    await flush();
    expect(listSnapshots).toHaveBeenCalledTimes(2);

    await act(async () => {
      newer.resolve([{ uri: 'snapshot-new', label: 'New snapshot', sizeBytes: 2048 }]);
    });
    await flush();
    let text = flattenText(tree.toJSON());
    expect(text).toContain('New snapshot');
    expect(text).not.toContain('Old snapshot');

    await act(async () => {
      older.resolve([{ uri: 'snapshot-old', label: 'Old snapshot', sizeBytes: 4096 }]);
    });
    await flush();
    text = flattenText(tree.toJSON());
    expect(text).toContain('New snapshot');
    expect(text).not.toContain('Old snapshot');
  });

  test('a failed current snapshot load shows a retry state instead of the empty state', async () => {
    listSnapshots.mockRejectedValueOnce(new Error('offline'));
    let tree;
    await act(async () => { tree = create(<SnapshotsScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Could not load snapshots');
    expect(text).toContain('Try again');
    expect(text).not.toContain('No snapshots yet');
    expect(text).not.toContain('Loading');
  });
});
