/**
 * EP-23/UI-11 (end-user-polish audit, 2026-07-12): MesocycleBuilderScreen's
 * "Past blocks" row rendered `format(new Date(meso.startDate), 'MMM d')`
 * unconditionally whenever meso.startDate was truthy, and getCurrentWeek()
 * fed a malformed startDate straight into date-fns `differenceInWeeks`.
 * A restored/legacy mesocycle with an unparseable startDate used to crash
 * the "Past blocks" render (RangeError: Invalid time value) and could show
 * "Week NaN of N" on the active-block dashboard. This pins both against the
 * real screen: a malformed startDate on a past block never throws, and a
 * malformed startDate on the ACTIVE block never renders "NaN".
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
// SvgBarSparkline pulls in react-native-svg (native-only); stub it like
// LiftProgressScreen.test.js stubs Sparkline.
jest.mock('../../components/SvgBarSparkline', () => () => null);
jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/Button', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress, accessibilityLabel }) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel || title} onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));

let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));

jest.mock('../../lib/database', () => ({
  getAllMesocycles: jest.fn(),
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import {
  getAllMesocycles, getAllWorkouts, getCompletedWorkoutSets, getActivePlan, getRoutinesForPlan,
} from '../../lib/database';
import MesocycleBuilderScreen from '../MesocycleBuilderScreen';

const store = { user: { id: 'user-1' } };
const nav = { navigate: jest.fn() };

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function renderedText(element) {
  let tree;
  act(() => { tree = create(element); });
  return flattenText(tree.toJSON());
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  useAppStore.mockImplementation((selector) =>
    (typeof selector === 'function' ? selector(store) : store));
  getAllWorkouts.mockResolvedValue([]);
  getCompletedWorkoutSets.mockResolvedValue([]);
  getActivePlan.mockResolvedValue(null);
  getRoutinesForPlan.mockResolvedValue([]);
});

describe('MesocycleBuilderScreen malformed restored/legacy startDate (EP-23/UI-11)', () => {
  test('a past block with a malformed startDate renders in the FlashList data without throwing and omits the date', async () => {
    getAllMesocycles.mockResolvedValue([
      {
        id: 'm1', name: 'Hypertrophy block', isActive: false, durationWeeks: 6,
        startDate: 'not-a-real-date', endDate: null, focus: 'Hypertrophy',
      },
    ]);

    await act(async () => { create(<MesocycleBuilderScreen navigation={nav} />); });
    await flush();

    expect(capturedListProps).toBeTruthy();
    expect(capturedListProps.data).toHaveLength(1);

    const meso = capturedListProps.data[0];
    let text;
    expect(() => {
      text = renderedText(capturedListProps.renderItem({ item: meso }));
    }).not.toThrow();
    expect(text).not.toMatch(/NaN/);
    expect(text).toContain('Hypertrophy block');
    // The meta row (startDate/endDate) is omitted entirely for an invalid
    // date rather than shown as a fallback string or thrown.
    expect(text).not.toContain('not-a-real-date');
  });

  test('an active block with a malformed startDate never shows "Week NaN of N"', async () => {
    getAllMesocycles.mockResolvedValue([
      {
        id: 'm1', name: 'Strength block', isActive: true, durationWeeks: 6,
        startDate: 'not-a-real-date', endDate: null, focus: 'Strength',
      },
    ]);

    await act(async () => { create(<MesocycleBuilderScreen navigation={nav} />); });
    await flush();

    // ActiveMesoDashboard (which shows "Week X of N") lives in the FlashList's
    // ListHeaderComponent, not the (mocked, null-rendering) FlashList itself.
    const text = renderedText(capturedListProps.ListHeaderComponent);
    expect(text).not.toMatch(/NaN/);
    // getCurrentWeek falls back to week 1 (the same placeholder used when
    // there is no startDate at all) instead of propagating NaN.
    expect(text).toContain('Week 1 of 6');
  });
});
