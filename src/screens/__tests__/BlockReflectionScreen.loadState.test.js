import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ user: { id: 'u1' }, units: 'metric' })),
}));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
// CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): the screen
// now imports the haptics vocabulary for its "Play block story" link, same
// mock convention as every other screen test that renders a haptics-calling
// screen (e.g. SettingsProfileScreen.heightDob.test.js).
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
  // D95 (AUDIT-ROUTES 6 rows 3-4): MesocycleBuilder is a PlansStack route and
  // this screen is ProfileStack-only, so its CTAs now go through
  // navigateCrossTab, which dispatches on the TAB navigator. The mock gains a
  // parent so the assertion below can pin the same law it always pinned: the
  // "Start a new block" CTA reaches the mesocycle builder.
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
  return { tree, navigation, parent };
}

describe('BlockReflectionScreen load states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBlockReflectionData.mockResolvedValue(null);
  });

  test('shows a retryable read-error state instead of no-data copy', async () => {
    getBlockReflectionData.mockRejectedValueOnce(new Error('offline'));

    const { tree } = await render();
    let text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load block summary");
    expect(text).toContain('Your sessions are safe.');
    expect(text).not.toContain('No data found');

    const retry = tree.root.findByProps({ accessibilityLabel: 'Try again' });
    await act(async () => { retry.props.onPress(); });
    await flush();

    expect(getBlockReflectionData).toHaveBeenCalledTimes(2);
    text = flattenText(tree.toJSON());
    expect(text).toContain('No data found');
    expect(text).not.toContain("Couldn't load block summary");
  });

  test('keeps the genuine no-data state after a successful empty read', async () => {
    const { tree, navigation, parent } = await render();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('No data found');
    // Re-anchored under FB-18 (D96): the empty state's CTA was "Start a new
    // block" pointing at MesocycleBuilder, which is read-only and has no
    // create action, so the button could not do what it said. The decision
    // lives on the Train tab's block card. The pinned RULE -- a genuine
    // no-data state with a working cross-tab CTA, never a dead in-stack
    // navigate -- is unchanged.
    expect(text).toContain('Choose your next block');
    const start = tree.root.findByProps({ accessibilityLabel: 'Choose your next block' });
    await act(async () => { start.props.onPress(); });
    expect(parent.navigate).toHaveBeenCalledWith('PlansTab', { screen: 'Plans', initial: false });
    // The bare in-stack form is the dead tap this replaced: it resolved
    // against ProfileStack, where MesocycleBuilder is not registered.
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(text).not.toContain("Couldn't load block summary");
  });
});

describe('BlockReflectionScreen malformed restored/legacy PR value (EP-23/UI-11)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // A PR record's `value` can be malformed after a bad restore/import/sync
  // (e.g. a corrupted string). This used to reach
  // `parseFloat(pr.value).toFixed(1)` and silently render the string
  // "NaNkg" in the "Records set this block" list. Proves the real screen
  // now shows a clean placeholder instead.
  test('a malformed PR value never renders "NaN"', async () => {
    getBlockReflectionData.mockResolvedValue({
      meso: { name: 'Hypertrophy block', plannedWeeks: 6 },
      startDate: Date.UTC(2026, 5, 1),
      endDate: Date.UTC(2026, 6, 12),
      totalSessions: 18,
      totalSets: 240,
      tonnage: 42000,
      avgDuration: 55,
      prs: [
        { exerciseName: 'Barbell bench press', recordType: '1rm_estimate', value: 'corrupt' },
      ],
      bestSession: null,
      narrative: ['A solid block overall.'],
    });

    const { tree } = await render();
    const text = flattenText(tree.toJSON());

    expect(text).toContain('Barbell bench press');
    expect(text).not.toMatch(/NaN/);
  });
});
