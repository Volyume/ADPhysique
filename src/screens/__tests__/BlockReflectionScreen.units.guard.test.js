/**
 * BlockReflectionScreen.units.guard.test.js
 *
 * Campaign 24 Wave A, WAVE-A-FINDINGS.md UNIT_DEFECT (:66, :262, :341): three
 * tonnage/volume figures (the block narrative line, the "Total lifted" stat
 * tile, and the "Best session" volume) hard-coded the string ` kg` even
 * though `units` is read from the store and used correctly for PR values on
 * the same screen (:309). Confirms the fix against a real render with an lbs
 * fixture, following the render-harness convention already established for
 * this screen in BlockReflectionScreen.loadState.test.js.
 */
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ user: { id: 'u1' }, units: 'lbs' })),
}));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/Button', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress }) => (
    <TouchableOpacity accessibilityLabel={title} onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});
jest.mock('../../lib/database', () => ({ getBlockReflectionData: jest.fn() }));

import { getBlockReflectionData } from '../../lib/database';
import BlockReflectionScreen from '../BlockReflectionScreen';

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

async function render() {
  let tree;
  const parent = { navigate: jest.fn() };
  const navigation = { navigate: jest.fn(), getParent: () => parent };
  await act(async () => {
    tree = create(
      <BlockReflectionScreen
        navigation={navigation}
        route={{ params: { mesocycleId: 'm1' } }}
      />,
    );
  });
  await flush();
  return tree;
}

describe('BlockReflectionScreen tonnage/volume figures respect the store unit (lbs fixture)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBlockReflectionData.mockResolvedValue({
      meso: { name: 'Hypertrophy block', plannedWeeks: 6 },
      startDate: Date.UTC(2026, 5, 1),
      endDate: Date.UTC(2026, 6, 12),
      totalSessions: 18,
      totalSets: 240,
      tonnage: 42000,
      tonnageDelta: 8,
      avgDuration: 55,
      prs: [
        { exerciseName: 'Barbell bench press', recordType: '1rm_estimate', value: 100 },
      ],
      bestSession: { volume: 5000, startedAt: Date.UTC(2026, 5, 15) },
      narrative: [],
    });
  });

  test('the "Total lifted" stat tile shows lbs, never kg, for an lbs user', async () => {
    const tree = await render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('42,000 lbs');
    expect(text).not.toContain('42,000 kg');
  });

  test('the block narrative line shows lbs, never kg, for an lbs user', async () => {
    const tree = await render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('42,000 lbs lifted in total');
    expect(text).not.toContain('42,000 kg lifted in total');
  });

  test('the "Best session" volume shows lbs, never kg, for an lbs user', async () => {
    const tree = await render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('5,000 lbs');
    expect(text).not.toContain('5,000 kg');
  });
});
