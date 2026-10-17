/**
 * CommunityPost.audit.test.js - what this suite pins (audit 2026-10-17):
 *
 *  - item 2: blocking the author from this screen leaves it (goBack);
 *    muting does not;
 *  - item 8: a comments read that FAILS shows a calm error line with Try
 *    again, never "No comments yet"; Try again re-reads;
 *  - item h: an empty thread says "Be the first to reply." and tapping it
 *    focuses the composer;
 *  - item a: pull-to-refresh reloads the post and its comments.
 */

import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/community/ReportSheet', () => () => null);

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../lib/community', () => ({
  getPost: jest.fn(),
  reactToPost: jest.fn(() => Promise.resolve({})),
  deletePost: jest.fn(),
  listComments: jest.fn(() => Promise.resolve({ comments: [], cursor: null })),
  addComment: jest.fn(() => Promise.resolve({})),
  deleteComment: jest.fn(),
  notifyCommunityEvent: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
  connectionState: (card) => card?.connection ?? 'none',
  REPORT_REASONS: {},
  COMMENT_MAX: 500,
}));

import { getPost } from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityPostScreen from '../CommunityPostScreen';

const PAYLOAD = {
  post: {
    id: 'post1',
    author_id: 'u2',
    kind: 'session',
    payload: { exercises: 5, sets: 18, minutes: 47 },
    caption: 'Good session.',
    reaction_count: 2,
    comment_count: 0,
    created_at: Date.now(),
  },
  author: { user_id: 'u2', handle: 'priya_kb', display_name: 'Priya K' },
  my_reaction: false,
};

function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out.join(' | ');
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}

async function mount() {
  const navigation = { getState: () => ({ routeNames: ['CommunityJoin', 'CommunityProfile', 'CommunityConversation'] }), navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };
  let tree = null;
  await act(async () => {
    tree = create(
      <CommunityPostScreen
        navigation={navigation}
        route={{ params: { id: 'post1' }, name: 'CommunityPost' }}
      />,
    );
  });
  await flush();
  return { tree, navigation };
}

/** The RN manual mock renders FlatList as a passthrough host, so the
 * header and footer stay unrendered ELEMENTS in props. */
function part(tree, key) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  let rendered = null;
  act(() => { rendered = create(list.props[key]); });
  return rendered;
}

function withProfile() {
  useCommunityMe.mockReturnValue({
    me: { profile: { user_id: 'u1', handle: 'rowan_lifts' } },
    loading: false,
    error: null,
    refresh: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  getPost.mockResolvedValue(PAYLOAD);
  withProfile();
});


function calls(name) { return require('../../lib/community')[name]; }

beforeEach(() => {
  jest.clearAllMocks();
  getPost.mockResolvedValue(PAYLOAD);
  calls('listComments').mockResolvedValue({ comments: [], cursor: null });
  withProfile();
});

describe('blocking from the post', () => {
  test('a block leaves the screen; a mute stays', async () => {
    const ProfileMenuSheet = require('../../components/community/ProfileMenuSheet').default;
    const { tree, navigation } = await mount();
    const sheet = tree.root.findByType(ProfileMenuSheet);
    await act(async () => { sheet.props.onChanged({ muted: true }); });
    expect(navigation.goBack).not.toHaveBeenCalled();
    await act(async () => { sheet.props.onChanged({ blocked: true }); });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    act(() => { tree.unmount(); });
  });
});

describe('comments that could not be read', () => {
  test('shows a calm error with Try again, not "No comments yet"; Try again re-reads', async () => {
    const listComments = calls('listComments');
    listComments.mockRejectedValue(new Error('offline'));
    const { tree } = await mount();
    let header = part(tree, 'ListHeaderComponent');
    expect(texts(header)).toContain('Comments could not be loaded just now.');
    expect(texts(header)).not.toContain('No comments yet');
    const retry = header.root.findAll((n) => n.props?.title === 'Try again' && n.props?.onPress)[0];
    expect(retry).toBeTruthy();

    listComments.mockResolvedValue({ comments: [], cursor: null });
    await act(async () => { await retry.props.onPress(); });
    await flush();
    act(() => { header.unmount(); });
    header = part(tree, 'ListHeaderComponent');
    expect(texts(header)).toContain('No comments yet.');
    expect(texts(header)).not.toContain('could not be loaded');
    act(() => { header.unmount(); tree.unmount(); });
  });
});

describe('an empty thread', () => {
  test('offers "Be the first to reply." and tapping it focuses the composer', async () => {
    const { tree } = await mount();
    const header = part(tree, 'ListHeaderComponent');
    expect(texts(header)).toContain('Be the first to reply.');
    const composer = tree.root.findAll((n) => n.props && 'inputRef' in n.props && n.props.onSubmit)[0];
    const focus = jest.fn();
    composer.props.inputRef.current = { focus };
    const cta = header.root.findAll((n) => n.props?.title === 'Be the first to reply.' && n.props?.onPress)[0];
    act(() => { cta.props.onPress(); });
    expect(focus).toHaveBeenCalledTimes(1);
    act(() => { header.unmount(); tree.unmount(); });
  });
});

describe('pull to refresh', () => {
  test('reloads the post and its comments without the skeleton', async () => {
    const { tree } = await mount();
    const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
    expect(list.props.refreshControl).toBeTruthy();
    const before = getPost.mock.calls.length;
    const beforeComments = calls('listComments').mock.calls.length;
    await act(async () => { await list.props.refreshControl.props.onRefresh(); });
    await flush();
    expect(getPost.mock.calls.length).toBe(before + 1);
    expect(calls('listComments').mock.calls.length).toBe(beforeComments + 1);
    act(() => { tree.unmount(); });
  });
});
