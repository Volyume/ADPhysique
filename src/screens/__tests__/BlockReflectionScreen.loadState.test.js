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
  await act(async () => {
    tree = create(
      <BlockReflectionScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { mesocycleId: 'm1' } }}
      />,
    );
  });
  await flush();
  return tree;
}

describe('BlockReflectionScreen load states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBlockReflectionData.mockResolvedValue(null);
  });

  test('shows a retryable read-error state instead of no-data copy', async () => {
    getBlockReflectionData.mockRejectedValueOnce(new Error('offline'));

    const tree = await render();
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
    const tree = await render();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('No data found');
    expect(text).not.toContain("Couldn't load block summary");
  });
});
