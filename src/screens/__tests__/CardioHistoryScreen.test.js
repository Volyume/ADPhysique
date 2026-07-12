import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/haptics', () => ({
  selection: jest.fn(),
  commit: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../lib/health', () => ({
  isHealthAvailable: jest.fn(() => false),
  getHealthProviderLabel: jest.fn(() => 'Health'),
}));

let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));

jest.mock('../../lib/database', () => ({
  getRecentCardioLog: jest.fn(),
  getCardioLogRange: jest.fn(),
  deleteCardioLog: jest.fn(),
  activityDayKey: jest.fn((ms) => new Date(ms).toISOString().slice(0, 10)),
}));

import useAppStore from '../../store/useAppStore';
import { appAlert } from '../../components/AppAlert';
import { getRecentCardioLog, getCardioLogRange, deleteCardioLog } from '../../lib/database';
import CardioHistoryScreen from '../CardioHistoryScreen';

const store = {
  user: { id: 'u1' },
  userProfile: { cardioTarget: { sessionsPerWeek: 2 } },
  accessibility: { energyUnit: 'kcal' },
};

const ROW = {
  id: 'cardio-1',
  entryDate: '2026-07-05',
  activityName: 'Incline walk',
  durationMin: 30,
  intensity: 'low',
  estKcal: 120,
};
const NEW_ROW = {
  id: 'cardio-2',
  entryDate: '2026-07-06',
  activityName: 'Bike',
  durationMin: 25,
  intensity: 'moderate',
  estKcal: 180,
};

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function findByA11y(element, label) {
  if (!element || typeof element !== 'object') return null;
  if (element.props?.accessibilityLabel === label) return element;
  const children = Array.isArray(element.props?.children) ? element.props.children : [element.props?.children];
  for (const child of children) {
    const found = findByA11y(child, label);
    if (found) return found;
  }
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  store.user = { id: 'u1' };
  store.userProfile = { cardioTarget: { sessionsPerWeek: 2 } };
  store.accessibility = { energyUnit: 'kcal' };
  useAppStore.mockImplementation((selector) => selector(store));
  getRecentCardioLog.mockResolvedValue([ROW]);
  getCardioLogRange.mockResolvedValue([ROW]);
  deleteCardioLog.mockResolvedValue(true);
});

describe('CardioHistoryScreen states', () => {
  // EP-20/UI-10 (Codex end-user-polish audit): getRecentCardioLog/
  // getCardioLogRange are LOCAL SQLite reads (src/lib/database.js), never a
  // network call, so a failure here must never claim a connection problem.
  test('shows a retry state when cardio history fails to load', async () => {
    getRecentCardioLog.mockRejectedValueOnce(new Error('offline'));
    let tree;
    await act(async () => { tree = create(<CardioHistoryScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load cardio history");
    expect(text).toContain("Couldn't load this on your device. Try again.");
    expect(text).not.toContain('Check your connection');
    expect(text).toContain('Try again');
    expect(text).not.toContain('No cardio yet');
  });

  test('empty cardio history offers a direct log-cardio action', async () => {
    getRecentCardioLog.mockResolvedValueOnce([]);
    getCardioLogRange.mockResolvedValueOnce([]);
    let tree;
    await act(async () => { tree = create(<CardioHistoryScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('No cardio yet');
    expect(text).toContain('Log cardio');

    const action = tree.root.findByProps({ accessibilityLabel: 'Log cardio' });
    await act(async () => { action.props.onPress(); });

    expect(mockNavigate).toHaveBeenCalledWith('LogCardio');
  });

  test('failed delete keeps the row and tells the user', async () => {
    deleteCardioLog.mockRejectedValueOnce(new Error('locked'));
    await act(async () => { create(<CardioHistoryScreen />); });
    await flush();

    const rowItem = capturedListProps.data.find((item) => item.id === ROW.id);
    const row = capturedListProps.renderItem({ item: rowItem });
    const remove = findByA11y(row, 'Remove Incline walk session');
    expect(remove).toBeTruthy();
    await act(async () => { remove.props.onPress(); });

    const buttons = appAlert.mock.calls[0][2];
    const destructive = buttons.find((button) => button.text === 'Remove');
    await act(async () => { await destructive.onPress(); });

    expect(deleteCardioLog).toHaveBeenCalledWith('u1', ROW.id);
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't remove that session.", expect.objectContaining({ variant: 'error' }));
  });

  test('ignores stale load results when a newer cardio goal load starts', async () => {
    const oldRows = deferred();
    const oldRange = deferred();
    const newRows = deferred();
    const newRange = deferred();
    getRecentCardioLog
      .mockImplementationOnce(() => oldRows.promise)
      .mockImplementationOnce(() => newRows.promise);
    getCardioLogRange
      .mockImplementationOnce(() => oldRange.promise)
      .mockImplementationOnce(() => newRange.promise);

    let tree;
    await act(async () => { tree = create(<CardioHistoryScreen />); });
    await flush();
    store.userProfile = { cardioTarget: { sessionsPerWeek: 3 } };
    await act(async () => { tree.update(<CardioHistoryScreen />); });
    await flush();
    expect(getRecentCardioLog).toHaveBeenCalledTimes(2);

    await act(async () => {
      oldRows.resolve([ROW]);
      oldRange.resolve([ROW]);
    });
    await flush();
    expect(capturedListProps?.data?.some((item) => item.id === ROW.id)).not.toBe(true);

    await act(async () => {
      newRows.resolve([NEW_ROW]);
      newRange.resolve([NEW_ROW]);
    });
    await flush();
    expect(capturedListProps.data.some((item) => item.id === NEW_ROW.id)).toBe(true);
    expect(capturedListProps.data.some((item) => item.id === ROW.id)).toBe(false);
  });
});
