/**
 * CommunityPrivacyScreen -- granular privacy (community product audit
 * `docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §1
 * "Granular privacy"; server contract `community_set_show_gym`,
 * `community_set_show_place` in `supabase/migrate_164_community_gap_
 * closure.sql` Part 8).
 *
 * What this suite pins:
 *  1. "Show my gym" and "Show my place" start ON by default and reflect
 *     `profile.show_gym`/`show_place` once `me` carries them.
 *  2. Toggling either calls the matching RPC wrapper and refreshes `me`;
 *     a failure reverts the switch and shows a calm toast.
 *  3. A `rules_outdated` refusal sends the person to CommunityRules
 *     instead of a generic error, and the switch still reverts.
 *  4. "Followers" and "Connections" rows navigate to their screens.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/community/ProfileCard', () => () => null);
jest.mock('../../components/community/PrivacyReceipt', () => () => null);
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

const mockRefresh = jest.fn();
jest.mock('../../hooks/useCommunityMe', () => ({ __esModule: true, default: jest.fn() }));

jest.mock('../../lib/community', () => ({
  relationships: jest.fn().mockResolvedValue({ blocked: [], muted: [] }),
  unblockUser: jest.fn(),
  unmuteUser: jest.fn(),
  upsertProfile: jest.fn(),
  leaveCommunity: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
  setConnectFrom: jest.fn(),
  CONNECT_FROM_VALUES: { anyone: 'Anyone', followers: 'People who follow me', nobody: 'Nobody' },
  setShowGym: jest.fn(),
  setShowPlace: jest.fn(),
}));

import { setShowGym, setShowPlace } from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityPrivacyScreen from '../CommunityPrivacyScreen';

function byLabel(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label
    && (n.props?.onPress || n.props?.onValueChange))[0];
}

const PROFILE = {
  handle: 'lifter1', visibility: 'public', show_gym: true, show_place: true,
};

function mockMe(overrides = {}) {
  useCommunityMe.mockReturnValue({
    me: { profile: { ...PROFILE, ...overrides }, connect_from: 'anyone', is_moderator: false },
    refresh: mockRefresh,
  });
}

async function mount() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityPrivacyScreen navigation={navigation} />);
  });
  await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); });
  return { tree, navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMe();
  setShowGym.mockResolvedValue({});
  setShowPlace.mockResolvedValue({});
});

test('Show my gym and Show my place start ON', async () => {
  const { tree } = await mount();
  expect(byLabel(tree, 'Show my gym').props.value).toBe(true);
  expect(byLabel(tree, 'Show my place').props.value).toBe(true);
});

test('reflects show_gym/show_place false from the profile', async () => {
  mockMe({ show_gym: false, show_place: false });
  const { tree } = await mount();
  expect(byLabel(tree, 'Show my gym').props.value).toBe(false);
  expect(byLabel(tree, 'Show my place').props.value).toBe(false);
});

test('toggling Show my gym off calls setShowGym and refreshes me', async () => {
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Show my gym').props.onValueChange(false); });
  expect(setShowGym).toHaveBeenCalledWith(false);
  expect(mockRefresh).toHaveBeenCalledWith(true);
});

test('toggling Show my place off calls setShowPlace and refreshes me', async () => {
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Show my place').props.onValueChange(false); });
  expect(setShowPlace).toHaveBeenCalledWith(false);
  expect(mockRefresh).toHaveBeenCalledWith(true);
});

test('a failed toggle reverts the switch and shows a calm toast', async () => {
  setShowGym.mockRejectedValueOnce({ code: 'unavailable' });
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Show my gym').props.onValueChange(false); });
  expect(byLabel(tree, 'Show my gym').props.value).toBe(true);
  expect(mockToastShow).toHaveBeenCalledWith('Could not change that just now.', { variant: 'error' });
});

test('rules_outdated sends the person to CommunityRules and reverts the switch', async () => {
  setShowPlace.mockRejectedValueOnce({ code: 'rules_outdated' });
  const { tree, navigation } = await mount();
  await act(async () => { byLabel(tree, 'Show my place').props.onValueChange(false); });
  expect(navigation.navigate).toHaveBeenCalledWith('CommunityRules', { mustAccept: true });
  expect(byLabel(tree, 'Show my place').props.value).toBe(true);
});

test('Followers and Connections rows navigate to their screens', async () => {
  const { tree, navigation } = await mount();
  await act(async () => { byLabel(tree, 'See and manage your followers').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('CommunityFollowers');
  await act(async () => { byLabel(tree, 'See and manage your connections').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('CommunityConnections');
});
