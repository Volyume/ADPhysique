/**
 * CommunityGroupCreateScreen (community product audit `docs/community-
 * product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 3-4).
 *
 * What this suite pins:
 *  1. `createGroup` is called with the trimmed name, the trimmed blurb
 *     (or null for empty), and the selected access.
 *  2. A successful create replaces to `CommunityGroup` with the new id.
 *  3. Create stays disabled with an empty name.
 *  4. `minor_restricted` is spoken calmly, never a generic failure.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../lib/community', () => ({
  createGroup: jest.fn(),
  GROUP_NAME_MAX: 40,
  GROUP_BLURB_MAX: 140,
  GROUP_ACCESS: { open: 'Open', invite: 'Invite only' },
  GROUP_ACCESS_ORDER: ['open', 'invite'],
}));

import { createGroup } from '../../lib/community';
import CommunityGroupCreateScreen from '../CommunityGroupCreateScreen';

function byLabel(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label,
  )[0];
}

function field(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && n.props?.onChangeText)[0];
}

async function mount() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityGroupCreateScreen navigation={navigation} route={{ params: {} }} />);
  });
  return { tree, navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  createGroup.mockResolvedValue({ id: 'g1', name: 'Iron Collective' });
});

test('Create is disabled with an empty name', async () => {
  const { tree } = await mount();
  const btn = byLabel(tree, 'Create group');
  expect(btn.props.disabled).toBe(true);
});

test('creates with the trimmed name, trimmed blurb, and selected access, then replaces to the group', async () => {
  const { tree, navigation } = await mount();

  await act(async () => { field(tree, 'Group name').props.onChangeText('  Iron Collective  '); });
  await act(async () => { field(tree, 'Group blurb').props.onChangeText('  Monday leg day  '); });
  await act(async () => { byLabel(tree, 'Invite only').props.onPress(); });
  await act(async () => { byLabel(tree, 'Create group').props.onPress(); });

  expect(createGroup).toHaveBeenCalledWith({
    name: 'Iron Collective', blurb: 'Monday leg day', access: 'invite',
  });
  expect(navigation.replace).toHaveBeenCalledWith('CommunityGroup', { id: 'g1' });
});

test('an empty blurb is sent as null, not an empty string', async () => {
  const { tree } = await mount();
  await act(async () => { field(tree, 'Group name').props.onChangeText('Solo group'); });
  await act(async () => { byLabel(tree, 'Create group').props.onPress(); });
  expect(createGroup).toHaveBeenCalledWith({ name: 'Solo group', blurb: null, access: 'open' });
});

test('minor_restricted is spoken calmly and nothing navigates', async () => {
  const err = new Error('minor_restricted');
  err.code = 'minor_restricted';
  createGroup.mockRejectedValueOnce(err);

  const { tree, navigation } = await mount();
  await act(async () => { field(tree, 'Group name').props.onChangeText('Solo group'); });
  await act(async () => { byLabel(tree, 'Create group').props.onPress(); });

  expect(mockToastShow).toHaveBeenCalledWith(
    'Groups are not available under 18.',
    expect.objectContaining({ variant: 'error' }),
  );
  expect(navigation.replace).not.toHaveBeenCalled();
});
