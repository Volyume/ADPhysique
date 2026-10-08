/**
 * CommunityPostScreen, read by someone with no Community profile
 * (blueprint section 6; SD-04; product review 2026-09-06, item 16).
 *
 * What this suite pins: reading a story never needs a profile, but
 * reacting and commenting do (`community_react` and `community_comment`
 * both raise `no_profile`). The screen used to show the composer and the
 * Respect tap to a reader without one and then say "that comment did not
 * send", which is the wrong reason and no route to the fix. Now there is
 * one quiet row that goes to Join and comes back here.
 *
 * The client library is mocked at its barrel: this is about what the
 * screen offers, not about the RPC.
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

function withoutProfile() {
  useCommunityMe.mockReturnValue({
    me: { profile: null }, loading: false, error: null, refresh: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  getPost.mockResolvedValue(PAYLOAD);
  withProfile();
});

/** The post's row: `PostRow` is handed `onRespect` only when a Respect is
 * offered at all. */
function postRowOf(rendered) {
  return rendered.root.findAll(
    (n) => typeof n.type === 'function' && n.props && n.props.item && 'onRespect' in n.props,
  )[0];
}

describe('a reader with no Community profile', () => {
  test('is offered one quiet row to Join, in place of the composer', async () => {
    withoutProfile();
    const { tree, navigation } = await mount();

    expect(texts(tree)).toContain('Create your Community profile to react and comment');

    const row = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Create your Community profile to react and comment'
        && 'onPress' in n.props,
    )[0];
    await act(async () => { row.props.onPress(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityJoin', {
      next: { screen: 'CommunityPost', params: { id: 'post1' } },
    });
    act(() => { tree.unmount(); });
  });

  test('the Respect tap is not offered either: it would only be refused', async () => {
    withoutProfile();
    const { tree } = await mount();
    const header = part(tree, 'ListHeaderComponent');

    // PostRow disables the heart when it is handed no onRespect.
    const row = postRowOf(header);
    expect(row.props.onRespect).toBeUndefined();
    // The story itself still reads, profile or not (SD-04).
    expect(texts(header)).toContain('Good session.');
    act(() => { header.unmount(); tree.unmount(); });
  });
});

describe('a reader with a Community profile', () => {
  test('gets the composer and a live Respect tap', async () => {
    const { tree } = await mount();
    const header = part(tree, 'ListHeaderComponent');

    expect(texts(tree)).not.toContain('Create your Community profile to react and comment');
    // D221: the composer is docked under the list, not in its footer.
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Comment').length).toBeGreaterThan(0);

    expect(typeof postRowOf(header).props.onRespect).toBe('function');
    act(() => { header.unmount(); tree.unmount(); });
  });

  test('tapping Respect calls reactToPost with post id, true, and author user id', async () => {
    const { reactToPost } = require('../../lib/community');
    const { tree } = await mount();
    const header = part(tree, 'ListHeaderComponent');

    const row = postRowOf(header);
    expect(typeof row.props.onRespect).toBe('function');
    await act(async () => { row.props.onRespect(true); });
    // Founder order 2026-09-22 item 1 (review R-01): the author id must reach reactToPost or no push fires.
    expect(reactToPost).toHaveBeenCalledWith('post1', true, 'u2');
    act(() => { header.unmount(); tree.unmount(); });
  });
});

describe('a new comment pushes with the COMMENT id (Stage 1 review should-fix 1)', () => {
  async function submit(created) {
    const { addComment, notifyCommunityEvent } = require('../../lib/community');
    addComment.mockResolvedValueOnce(created);
    const { tree } = await mount();
    const composer = tree.root.findAll((n) => typeof n.props?.onSubmit === 'function')[0];
    await act(async () => { await composer.props.onSubmit('Nice one'); });
    act(() => { tree.unmount(); });
    return notifyCommunityEvent;
  }

  test('the created comment id is the push ref, never the post id', async () => {
    const notify = await submit('comment9');
    expect(notify).toHaveBeenCalledWith('comment', 'u2', 'comment9');
    expect(notify).not.toHaveBeenCalledWith('comment', 'u2', 'post1');
  });

  test('without a created id there is nothing to name, so nothing is sent', async () => {
    const notify = await submit(null);
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('D221 visual law on the Post screen (source guard)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'CommunityPostScreen.js'), 'utf8');
  test('the post is a PostRow in a band, the thread a second band, no PostCard', () => {
    expect(src).toContain("import PostRow from '../components/community/PostRow'");
    expect(src).not.toMatch(/import PostCard/);
    expect(src).toContain('<SectionHeader title="Comments" />');
    expect(src).toContain('<Band>');
    expect(src).not.toMatch(/SkeletonRow\b/);
  });
  test('lane 2B: the post renders in detail mode (Respect word, whole note, comment count)', () => {
    expect(src).toMatch(/<PostRow\s+key=\{post\?\.id\}\s+detail\b/);
  });
  test('one header glyph', () => {
    expect((src.match(/<HeaderGlyph/g) || []).length).toBe(1);
  });
});
