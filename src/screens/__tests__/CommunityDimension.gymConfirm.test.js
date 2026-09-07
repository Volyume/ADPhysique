/**
 * CommunityDimensionScreen's "Is this gym real? Confirm it" row (gym
 * database blueprint `docs/gym-database-2026-09-06/20-BLUEPRINT.md`,
 * GD-11; migrate_162_gym_directory.sql).
 *
 * What this suite pins:
 *  - the row shows ONLY while the venue's `verification_status` starts
 *    `user_submitted_pending`, never once it reaches
 *    `user_submitted_verified` (a second confirmation already landed) and
 *    never for a legacy free-text gym (no linked venue to confirm);
 *  - tapping it calls `confirmSubmission(id)`, shows the calm success
 *    copy, then reloads the page;
 *  - the two refusals only this RPC raises (`not_allowed`: the
 *    submitter's own account; `already_confirmed`: a repeat) are spoken
 *    calmly rather than falling through to a generic failure toast.
 *
 * FlashList is the react-native manual mock's FlatList passthrough host;
 * `ListHeaderComponent` (where this row lives) is rendered as its own
 * tree, the same convention `CommunityHub.states.test.js` uses.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../lib/community', () => ({
  loadDimension: jest.fn(),
  gymSummary: jest.fn(() => Promise.reject(new Error('no summary in this suite'))),
}));

jest.mock('../../lib/gyms', () => {
  const actual = jest.requireActual('../../lib/gyms');
  return {
    ...actual,
    get: jest.fn(),
    confirmSubmission: jest.fn(),
    report: jest.fn(),
  };
});

import { loadDimension } from '../../lib/community';
import { get, confirmSubmission } from '../../lib/gyms';
import CommunityDimensionScreen from '../CommunityDimensionScreen';

const PENDING_VENUE = {
  id: 'v1', display_name: 'PureGym Motherwell', town: 'Motherwell', outward: 'ML1',
  verification_status: 'user_submitted_pending',
};

const VERIFIED_VENUE = { ...PENDING_VENUE, verification_status: 'user_submitted_verified' };

const EMPTY_DIMENSION = { label: 'PureGym Motherwell', people: [], programmes: [], count: 0 };

function texts(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(texts).join(' ');
  return texts(node.children);
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });
}

async function mount(params) {
  const navigation = { navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityDimensionScreen navigation={navigation} route={{ params }} />);
  });
  await flush();
  return { tree, navigation };
}

/** The FlashList mock's own element, so ListHeaderComponent (where the
 * confirm and report rows live) can be rendered as its own tree - see the
 * header comment for why. */
function renderHeader(tree) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  let part = null;
  act(() => { part = create(list.props.ListHeaderComponent); });
  return part;
}

beforeEach(() => {
  jest.clearAllMocks();
  loadDimension.mockResolvedValue({ ...EMPTY_DIMENSION });
});

describe('the row only shows for a genuinely pending, linked venue', () => {
  test('shows for a pending venue', async () => {
    get.mockResolvedValue({ ...PENDING_VENUE });
    const { tree } = await mount({ kind: 'gym', key: 'gym:v1', label: 'PureGym Motherwell' });
    const header = renderHeader(tree);
    expect(texts(header.toJSON())).toContain('Is this gym real? Confirm it');
    act(() => { header.unmount(); });
  });

  test('does not show once a second confirmation already verified it', async () => {
    get.mockResolvedValue({ ...VERIFIED_VENUE });
    const { tree } = await mount({ kind: 'gym', key: 'gym:v1', label: 'PureGym Motherwell' });
    const header = renderHeader(tree);
    expect(texts(header.toJSON())).not.toContain('Is this gym real? Confirm it');
    act(() => { header.unmount(); });
  });

  test('does not show for a legacy free-text gym key (no linked venue)', async () => {
    const { tree } = await mount({ kind: 'gym', key: 'leeds:puregym leeds', label: 'PureGym Leeds' });
    expect(get).not.toHaveBeenCalled();
    const header = renderHeader(tree);
    expect(texts(header.toJSON())).not.toContain('Is this gym real? Confirm it');
    act(() => { header.unmount(); });
  });

  test('does not show on a non-gym dimension', async () => {
    const { tree } = await mount({ kind: 'style', key: 'strength', label: 'Strength' });
    const header = renderHeader(tree);
    expect(texts(header.toJSON())).not.toContain('Is this gym real? Confirm it');
    act(() => { header.unmount(); });
  });
});

describe('confirming it', () => {
  test('calls confirmSubmission, shows the calm success copy, then reloads', async () => {
    get.mockResolvedValue({ ...PENDING_VENUE });
    confirmSubmission.mockResolvedValue({ id: 'v1', distinct_confirmers: 2 });
    const { tree } = await mount({ kind: 'gym', key: 'gym:v1', label: 'PureGym Motherwell' });
    const header = renderHeader(tree);

    const row = header.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Is this gym real? Confirm it'
        && typeof n.props.onPress === 'function',
    )[0];

    loadDimension.mockClear();
    get.mockClear();
    await act(async () => { row.props.onPress(); await Promise.resolve(); });
    await flush();

    expect(confirmSubmission).toHaveBeenCalledWith('v1');
    expect(mockToastShow).toHaveBeenCalledWith('Thanks. This gym is now listed.');
    expect(loadDimension).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
    act(() => { header.unmount(); });
  });

  test.each([
    ['not_allowed', 'You added this gym, so someone else needs to confirm it.'],
    ['already_confirmed', 'You have already confirmed this gym.'],
  ])('a %s refusal is spoken calmly, never as a generic failure', async (code, copy) => {
    get.mockResolvedValue({ ...PENDING_VENUE });
    const err = new Error(code);
    err.code = code;
    confirmSubmission.mockRejectedValue(err);
    const { tree } = await mount({ kind: 'gym', key: 'gym:v1', label: 'PureGym Motherwell' });
    const header = renderHeader(tree);

    const row = header.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Is this gym real? Confirm it'
        && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => { row.props.onPress(); await Promise.resolve(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith(copy, expect.objectContaining({ variant: 'error' }));
    expect(mockToastShow).not.toHaveBeenCalledWith('Could not confirm this just now.', expect.anything());
    act(() => { header.unmount(); });
  });
});
