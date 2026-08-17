/**
 * MesocycleBuilderScreen.loadError.guard.test.js
 *
 * Campaign 24 Wave A, WAVE-A-FINDINGS.md STATE_DEFECT (:162-176). Every
 * loader's catch block used to silently reset state to []/null with no
 * error flag exposed to render, so a rejected read painted the "Your
 * training blocks start here" EmptyState exactly as if the user had never
 * trained -- a load FAILURE read as a confirmed empty account. Mirrors
 * PlansScreen.js's EP-09/P-06 pattern: pins the real screen against a
 * rejected read, following the same render-harness convention as
 * MesocycleBuilderScreen.safeDate.test.js (EP-23/UI-11) in this file tree.
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
  getActivePlan.mockResolvedValue(null);
  getRoutinesForPlan.mockResolvedValue([]);
});

describe('MesocycleBuilderScreen load failure never reads as a genuine empty account (Wave A)', () => {
  test('a rejected getAllMesocycles shows the retryable error state, not "Your training blocks start here"', async () => {
    getAllMesocycles.mockRejectedValue(new Error('offline'));
    getAllWorkouts.mockResolvedValue([]);
    getCompletedWorkoutSets.mockResolvedValue([]);

    await act(async () => { create(<MesocycleBuilderScreen navigation={nav} />); });
    await flush();

    expect(capturedListProps).toBeTruthy();
    const text = renderedText(capturedListProps.ListEmptyComponent);
    expect(text).toContain("Couldn't load your training blocks");
    expect(text).not.toContain('Your training blocks start here');
    expect(text).not.toContain('No block running yet');
  });

  test('a genuinely empty account (successful reads, nothing there) still shows the real empty-account copy', async () => {
    getAllMesocycles.mockResolvedValue([]);
    getAllWorkouts.mockResolvedValue([]);
    getCompletedWorkoutSets.mockResolvedValue([]);

    await act(async () => { create(<MesocycleBuilderScreen navigation={nav} />); });
    await flush();

    const text = renderedText(capturedListProps.ListEmptyComponent);
    expect(text).toContain('Your training blocks start here');
    expect(text).not.toContain("Couldn't load your training blocks");
  });
});
