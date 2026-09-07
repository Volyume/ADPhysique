/**
 * CommunityHubScreen state matrix (blueprint sections 1, 6; SD-04, SD-10).
 *
 * Mounts the real screen against a mocked client library, once per state
 * the hub genuinely has, and asserts what a person would see:
 *
 *   1. No profile: the hero, the privacy receipt and "Create my profile",
 *      with Discover still rendering underneath it, because reading
 *      public content never requires a profile (SD-04).
 *   2. Following, nothing followed yet: the empty state that answers
 *      "what now" plus the suggestion strip with its reasons.
 *   3. Discover: dimensions and recent training stories.
 *   4. Offline: the cached payload renders with the quiet line, never an
 *      error screen.
 *   5. A legacy partner link: the "Partner invites have moved" card.
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
  findPeople: jest.fn(() => Promise.resolve({ people: [], cursor: null, count: null })),
  reactToPost: jest.fn(() => Promise.resolve()),
  COMMUNITY_DIMENSION_MIN_FOR_HUB: 3,
  COMMUNITY_STYLE_KEYS: { strength: 'Strength', kettlebell: 'Kettlebell' },
  COMMUNITY_GOALS: { get_stronger: 'Get stronger' },
  COMMUNITY_SETTINGS: { home_gym: 'Home gym' },
  // `ProfileCard` (real, unmocked) reads these directly (spec 1.3).
  TP_AGE_BANDS: {
    '18_24': '18 to 24', '25_34': '25 to 34', '35_44': '35 to 44', '45_54': '45 to 54', '55_plus': '55 or over',
  },
  reasonLines: (reasons) => (Array.isArray(reasons) ? reasons : []),
  follow: jest.fn(),
  unfollow: jest.fn(),
  // Design 60 §4, D1 ("This week" / "At [gym]" blocks): best-effort reads
  // this suite does not exercise directly (covered in boards.test.js and
  // the board screen's own suite); resolved to empty so they never affect
  // the states this file is actually about.
  loadBoard: jest.fn(() => Promise.resolve({
    rows: [], you: null, count: 0, thresholdMet: true, cursor: null,
  })),
  daysLabel: () => '',
  readShareSettings: jest.fn(() => Promise.resolve({ consistency: false })),
  loadConsistency: jest.fn(() => Promise.resolve(null)),
  publishConsistencyOnForeground: jest.fn(() => Promise.resolve({ sent: false, reason: null, payload: null })),
  // "Your groups" chip row (design 60 §4, D1; lane B2b): best-effort,
  // covered directly in groups.test.js and the group screens' own
  // suites, resolved empty here so it never affects the states this
  // file is about.
  listMyGroups: jest.fn(() => Promise.resolve([])),
  // Moderated-person notice (40-GAP-CLOSURE.md §1): best-effort, covered
  // directly in profile.moderatedStatus.test.js; resolved to the neutral
  // shape here so it never affects the states this file is about.
  myStatus: jest.fn(() => Promise.resolve({ status: null, reason_class: null, since: null })),
  isModeratedStatus: (status) => status === 'restricted' || status === 'suspended',
  REPORT_REASONS: {},
}));

import { loadHub, findPeople } from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityHubScreen from '../CommunityHubScreen';

const ME_WITH_PROFILE = {
  profile: { user_id: 'u1', handle: 'rowan_lifts', display_name: 'Rowan M', visibility: 'public' },
  pending_requests: 0,
  unseen_activity: 0,
  is_moderator: false,
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
  findPeople.mockResolvedValue({ people: [], cursor: null, count: null });
  useCommunityMe.mockReturnValue({ me: { profile: null }, loading: false, error: null, refresh: jest.fn() });
});

describe('state 1: no Community profile', () => {
  test('shows the hero, the privacy receipt and the one committing action', async () => {
    const { text } = await render();

    expect(text).toContain('Train alongside other lifters');
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

  test('no segmented control is offered until there is a profile', async () => {
    const { text } = await render();
    expect(text).not.toContain('Following');
  });
});

describe('state 2: Following with nothing followed yet', () => {
  test('the empty state answers "what now" and the suggestions carry reasons', async () => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub());
    findPeople.mockResolvedValue({
      people: [{ card: card(), reasons: ['Also trains kettlebell', 'Lists Leeds'], score: 4 }],
      cursor: null,
      count: 1,
    });

    const { text } = await render();

    expect(text).toContain('Nothing here yet');
    expect(text).toContain('Follow a few people and their training stories will appear here.');
    expect(text).toContain('Find people');
    expect(text).toContain('Lifters like you');
    expect(text).toContain('Also trains kettlebell · Lists Leeds');
    expect(findPeople).toHaveBeenCalledWith('like_me', { limit: 5 });
  });
});

describe('state 3: Discover with dimensions', () => {
  test('dimensions at or above the hub threshold render, below it never does', async () => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub({
      segment: 'discover',
      dimensions: [
        { kind: 'style', key: 'kettlebell', label: 'Kettlebell lifters', count: 6 },
        // Below COMMUNITY_DIMENSION_MIN_FOR_HUB: never surfaced on the hub.
        { kind: 'area', key: 'leeds', label: 'Lifters in Leeds', count: 2 },
      ],
    }));

    const { text } = await render({ segment: 'discover' });

    expect(text).toContain('Around you');
    expect(text).toContain('Kettlebell lifters');
    expect(text).not.toContain('Lifters in Leeds');
  });
});

describe('state 4: offline with a cached payload', () => {
  test('the cached content renders under one quiet line, not an error', async () => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub({
      fromCache: true,
      error: 'offline',
    }));
    findPeople.mockResolvedValue({ people: [{ card: card(), reasons: [] }], cursor: null, count: 1 });

    const { text } = await render();

    expect(text).toContain('Showing what you last saw. You are offline.');
    expect(text).toContain('Priya K');
    expect(text).not.toMatch(/something went wrong/i);
  });
});

describe('state 5: a legacy partner link', () => {
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

// ─── Product review 2026-09-06 (items 13 and 14) ────────────────────────
describe('the entry points that name a half of the hub', () => {
  beforeEach(() => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
  });

  test('params that arrive at an ALREADY MOUNTED hub still land on the named segment', async () => {
    // The hub is a tab root, so an entry point usually navigates to a
    // screen that is already mounted: initial state alone left the reader
    // on whichever half they last looked at.
    loadHub.mockResolvedValue(emptyHub());
    const navigation = { navigate: jest.fn(), push: jest.fn(), getParent: () => ({ navigate: jest.fn() }) };
    let tree;
    await act(async () => {
      tree = create(
        <CommunityHubScreen navigation={navigation} route={{ params: { segment: 'following' } }} />,
      );
    });
    await flush();
    expect(loadHub).toHaveBeenLastCalledWith('following', expect.any(Object));

    await act(async () => {
      tree.update(
        <CommunityHubScreen
          navigation={navigation}
          route={{ params: { segment: 'discover' } }}
        />,
      );
    });
    await flush();

    expect(loadHub).toHaveBeenLastCalledWith('discover', expect.any(Object));
  });
});
