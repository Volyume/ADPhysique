/**
 * CommunityHubScreen state matrix (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 2;
 * `20-BLUEPRINT.md` section 9). Rebuilt for the new structure: no Chip
 * segment (joined is always the Following feed; not-joined is always
 * Discover, read-only, never gated on a profile -- SD-04), no "Lifters
 * like you" on the Hub (moved to Find people), PEOPLE/GROUPS as flat
 * `CohortRow`/`GroupRow`s under `Eyebrow` labels, ACTIVITY/RECENT as
 * `ActivityItemRow`s.
 *
 * Mounts the real screen against a mocked client library, once per state
 * the hub genuinely has, and asserts what a person would see:
 *
 *   1. No profile: the hero, the privacy receipt, and RECENT underneath
 *      it -- reading public content never requires a profile (SD-04);
 *      giving Respect on it routes to Join rather than the RPC, which
 *      would raise `no_profile` (the join-to-interact pattern
 *      `JoinToInteractRow` already uses on the post detail screen).
 *   2. Joined, nothing followed yet: the empty state answers "what now";
 *      no "Lifters like you" anywhere on the Hub any more.
 *   3. Joined, PEOPLE: cohorts from `community_dimensions_me` at or above
 *      the hub threshold render as `CohortRow`s, below it never does.
 *   4. Joined, GROUPS: groups from `community_group_list_mine` render as
 *      `GroupRow`s; with none, the eyebrow's trailing action stays and
 *      one quiet line explains what a group is for.
 *   5. Offline: the cached payload renders with the quiet line, never an
 *      error screen.
 *   6. A legacy partner link: the "Partner invites have moved" card.
 *
 * The client library is mocked because this suite is about what the
 * screen does with a payload, not about the transport (which has its own
 * suite under src/lib/community/__tests__). Community carries no
 * programme section of any kind
 * (`docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2).
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => ({ right }) => right ?? null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(() => ({ me: { profile: null }, loading: false, error: null, refresh: jest.fn() })),
}));

jest.mock('../../lib/community', () => ({
  loadHub: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
  hasUnseen: () => false,
  hasUnreadMessages: () => false,
  reactToPost: jest.fn(() => Promise.resolve()),
  COMMUNITY_DIMENSION_MIN_FOR_HUB: 3,
  // PEOPLE (spec section 2 item 3): the cohorts the Hub now reads
  // directly, independent of the feed segment (there is no segment any
  // more -- this is read whenever the reader is joined).
  myDimensions: jest.fn(() => Promise.resolve({ dimensions: [] })),
  // The gym board call (already on the Hub before this revamp; this
  // suite resolves it empty so it never affects the states this file is
  // actually about, covered directly in boards.test.js).
  loadBoard: jest.fn(() => Promise.resolve({
    rows: [], you: null, count: 0, thresholdMet: true, cursor: null,
  })),
  metricLabel: (window, n) => (Number(n) === 1 ? '1 session' : `${Number(n) || 0} sessions`),
  // The You line's own device counters, gated on the same "Share my
  // consistency" toggle the pre-revamp "This week" card used (kept on
  // purpose -- see the screen's own header comment): resolved off/null
  // here so neither ever affects the states this file is about (covered
  // directly in trainingConsistency.test.js).
  readShareSettings: jest.fn(() => Promise.resolve({ consistency: false })),
  loadConsistency: jest.fn(() => Promise.resolve(null)),
  publishConsistencyOnForeground: jest.fn(() => Promise.resolve({ sent: false, reason: null, payload: null })),
  // GROUPS (spec section 2 item 4).
  listMyGroups: jest.fn(() => Promise.resolve([])),
  // Moderated-person notice (40-GAP-CLOSURE.md §1): best-effort, covered
  // directly in profile.moderatedStatus.test.js; resolved to the neutral
  // shape here so it never affects the states this file is about.
  myStatus: jest.fn(() => Promise.resolve({ status: null, reason_class: null, since: null })),
  isModeratedStatus: (status) => status === 'restricted' || status === 'suspended',
  REPORT_REASONS: {},
}));

import {
  loadHub, myDimensions, listMyGroups, reactToPost,
} from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityHubScreen from '../CommunityHubScreen';

const ME_WITH_PROFILE = {
  profile: { user_id: 'u1', handle: 'rowan_lifts', display_name: 'Rowan M', visibility: 'public' },
  pending_requests: 0,
  unseen_activity: 0,
  is_moderator: false,
  is_minor: false,
};

function emptyHub(over = {}) {
  return {
    segment: 'following',
    posts: [],
    people: [],
    dimensions: [],
    cursor: null,
    fromCache: false,
    error: null,
    ...over,
  };
}

function card(over = {}) {
  return {
    user_id: 'u2',
    handle: 'priya_kb',
    display_name: 'Priya K',
    avatar_preset: null,
    styles: ['kettlebell'],
    goal: 'get_stronger',
    setting: 'home_gym',
    follower_count: 3,
    following_count: 2,
    relationship: { following: 'none', followed_by: false, muted: false, blocked: false },
    ...over,
  };
}

/** One ACTIVITY/RECENT row, the shape `normalisePostRow` expects (spec
 * section 1, ActivityItemRow: `item = {post, author, myReaction}`, and
 * the RPCs hand back `{post, author, my_reaction}`). */
function post(over = {}) {
  return {
    post: {
      id: 'p1',
      kind: 'session',
      payload: {
        sessionName: 'Upper A', duration: 45, workingSets: 12, prCount: 0, date: Date.now(),
      },
      caption: null,
      created_at: Date.now(),
      comment_count: 0,
      reaction_count: 0,
    },
    author: card(),
    my_reaction: false,
    ...over,
  };
}

function group(over = {}) {
  return {
    id: 'g1', name: 'Iron Collective', access: 'open', memberCount: 8, ...over,
  };
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

/**
 * The hub's list is a FlashList (E8), which the jest moduleNameMapper
 * points at the react-native manual mock's FlatList passthrough host. Its
 * ListHeaderComponent / ListEmptyComponent therefore stay unrendered
 * ELEMENTS in props, so both are rendered for real here, which is how this
 * suite reads everything the hub puts above and instead of the feed.
 */
function renderList(tree) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  const parts = [];
  const trees = [];
  for (const element of [list.props.ListHeaderComponent, list.props.ListEmptyComponent]) {
    if (!element) continue;
    let part = null;
    act(() => { part = create(element); });
    trees.push(part);
    parts.push(flattenText(part.toJSON()));
  }
  return { list, trees, text: parts.join(' ') };
}

async function render(params = {}) {
  const parent = { navigate: jest.fn() };
  const navigation = { navigate: jest.fn(), push: jest.fn(), getParent: () => parent };
  let tree;
  await act(async () => {
    tree = create(<CommunityHubScreen navigation={navigation} route={{ params }} />);
  });
  await flush();
  const { list, trees, text } = renderList(tree);
  return {
    tree, list, parent, navigation, partTrees: trees,
    text: `${flattenText(tree.toJSON())} ${text}`,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  loadHub.mockResolvedValue(emptyHub());
  myDimensions.mockResolvedValue({ dimensions: [] });
  listMyGroups.mockResolvedValue([]);
  useCommunityMe.mockReturnValue({ me: { profile: null }, loading: false, error: null, refresh: jest.fn() });
});

describe('state 1: no Community profile', () => {
  test('shows the hero, the privacy receipt and the one committing action', async () => {
    const { text } = await render();

    expect(text).toContain('Your gym, your people');
    expect(text).toContain('See who is training around you, keep up with friends, give respect.');
    expect(text).toContain('Nothing about your body, food or coaching is ever shared.');
    // Lead visual review 2026-09-06, ruling V9: PrivacyReceipt is compact by
    // default (the one-line promise plus "What is shared"); the two columns
    // ("Others can see" / "Never shared") only render once that is tapped,
    // so they are no longer part of the hero's own default text.
    expect(text).toContain('What is shared');
    expect(text).toContain('Create my profile');
    expect(text).toContain('Browse first');
  });

  test('reads Discover, not Following: value is visible before joining', async () => {
    await render();
    expect(loadHub).toHaveBeenCalledWith('discover', expect.any(Object));
  });

  test('shows RECENT, never PEOPLE or GROUPS, before joining, with the Discover stories as the list data', async () => {
    loadHub.mockResolvedValue(emptyHub({ posts: [post()] }));
    const { text, list } = await render();
    expect(text).toContain('RECENT');
    expect(text).not.toContain('PEOPLE');
    expect(text).not.toContain('GROUPS');
    // FlashList is mocked to a prop-holding passthrough (see the header
    // comment on `renderList`): it never actually calls `renderItem`, so
    // list CONTENT is asserted on `list.props.data`, the same array the
    // real list would render from.
    expect(list.props.data).toHaveLength(1);
    expect(list.props.data[0].author.display_name).toBe('Priya K');
  });

  test('join-to-interact: giving Respect on a Discover story routes to Join, never the RPC', async () => {
    loadHub.mockResolvedValue(emptyHub({ posts: [post()] }));
    const { list, navigation } = await render();
    // Invoke the list's own `renderItem` directly (the FlashList mock
    // never calls it itself) to get the real `ActivityItemRow` element
    // for the one story in `data`, then mount and tap it.
    const itemEl = list.props.renderItem({ item: list.props.data[0] });
    let itemTree = null;
    act(() => { itemTree = create(itemEl); });
    const respectBtn = itemTree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Give this respect' && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => { respectBtn.props.onPress(); });
    expect(reactToPost).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityJoin');
  });
});

describe('state 2: joined, nothing followed yet', () => {
  beforeEach(() => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
  });

  test('the empty state answers "what now"', async () => {
    loadHub.mockResolvedValue(emptyHub());
    const { text } = await render();

    expect(text).toContain('Nothing here yet');
    expect(text).toContain('Follow people to see their training here.');
    expect(text).toContain('Find people');
  });

  test('no "Lifters like you" suggestions anywhere on the Hub (moved to Find people)', async () => {
    loadHub.mockResolvedValue(emptyHub());
    const { text } = await render();
    expect(text).not.toContain('Lifters like you');
  });

  test('the You line shows "You" and opens the reader\'s own profile', async () => {
    loadHub.mockResolvedValue(emptyHub());
    const { navigation, partTrees } = await render();
    // The You line is a header row (PersonRow), rendered in the
    // separately-mounted header tree -- see the header comment on
    // `renderList` for why the outer `tree` does not carry it.
    const youRow = partTrees[0].root.findAll(
      (n) => n.props?.accessibilityLabel === 'You' && typeof n.props.onPress === 'function',
    )[0];
    expect(youRow).toBeTruthy();
    await act(async () => { youRow.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityProfile', { userId: 'u1' });
  });
});

describe('state 3: joined, PEOPLE cohorts from community_dimensions_me', () => {
  test('dimensions at or above the hub threshold render, below it never does', async () => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub());
    myDimensions.mockResolvedValue({
      dimensions: [
        { kind: 'style', key: 'kettlebell', label: 'Kettlebell lifters', count: 6 },
        // Below COMMUNITY_DIMENSION_MIN_FOR_HUB: never surfaced on the hub.
        { kind: 'area', key: 'leeds', label: 'Lifters in Leeds', count: 2 },
      ],
    });

    const { text } = await render();

    expect(text).toContain('PEOPLE');
    expect(text).toContain('Kettlebell lifters');
    expect(text).not.toContain('Lifters in Leeds');
  });
});

describe('state 4: joined, GROUPS', () => {
  beforeEach(() => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub());
  });

  test('groups render as GroupRows with the member count and access line', async () => {
    listMyGroups.mockResolvedValue([{ group: group(), role: 'member', state: 'member' }]);
    const { text } = await render();
    expect(text).toContain('GROUPS');
    expect(text).toContain('Iron Collective');
    expect(text).toContain('8 members · open');
  });

  test('with no groups, the eyebrow keeps its trailing action and one quiet line explains what a group is for', async () => {
    listMyGroups.mockResolvedValue([]);
    const { text } = await render();
    expect(text).toContain('GROUPS');
    expect(text).toContain('New group');
    expect(text).toContain('Make a group with friends to see each other\'s training weeks.');
  });
});

describe('state 5: offline with a cached payload', () => {
  test('the cached content renders under one quiet line, not an error', async () => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub({
      fromCache: true,
      error: 'offline',
      posts: [post()],
    }));

    const { text, list } = await render();

    expect(text).toContain('Showing what you last saw. You are offline.');
    // See the header comment on `renderList`: list CONTENT is asserted on
    // `list.props.data`, since the FlashList mock never calls `renderItem`.
    expect(list.props.data).toHaveLength(1);
    expect(list.props.data[0].author.display_name).toBe('Priya K');
    expect(text).not.toMatch(/something went wrong/i);
  });
});

describe('state 6: a legacy partner link', () => {
  test('the moved-invites card is shown, with a way onward', async () => {
    const { text } = await render({ legacyPartnerCode: 'ABCD12' });

    expect(text).toContain('Partner invites have moved');
    expect(text).toContain('Training partners are now part of Community.');
    expect(text).toContain('Find people');
  });

  test('no card without a legacy code', async () => {
    const { text } = await render();
    expect(text).not.toContain('Partner invites have moved');
  });
});
