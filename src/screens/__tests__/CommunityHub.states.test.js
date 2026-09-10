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
  // PEOPLE and GROUPS (communities revamp 2026-09-10, task 5): one call,
  // `community_hub_summary`, replacing the old `myDimensions` +
  // `loadBoard` + `listMyGroups` trio this Hub used to make.
  loadHubSummary: jest.fn(() => Promise.resolve({ cohorts: [], groups: [] })),
  metricLabel: (window, n) => (Number(n) === 1 ? '1 session' : `${Number(n) || 0} sessions`),
  daysLabel: (keys) => (Array.isArray(keys) ? keys.join(', ') : ''),
  // Lead ruling: one wording across the app -- mirrors the shipped
  // TP_AGE_BANDS labels exactly (trainingProfile.js), not a second copy.
  TP_AGE_BANDS: {
    '18_24': '18 to 24', '25_34': '25 to 34', '35_44': '35 to 44', '45_54': '45 to 54', '55_plus': '55 or over',
  },
  // The You line's own device counters (lead ruling 2026-09-10: gated
  // ONLY on `consistencyGateState`'s `gated` field -- calm mode or an
  // open ED flag -- never on the "Share my consistency" toggle). Default
  // here is "not gated", so this file's other states see the row exactly
  // as before; the two tests that care about this gate override it.
  consistencyGateState: jest.fn(() => Promise.resolve({ allowed: false, gated: false, isMinor: false })),
  loadConsistency: jest.fn(() => Promise.resolve(null)),
  publishConsistencyOnForeground: jest.fn(() => Promise.resolve({ sent: false, reason: null, payload: null })),
  // Moderated-person notice (40-GAP-CLOSURE.md §1): best-effort, covered
  // directly in profile.moderatedStatus.test.js; resolved to the neutral
  // shape here so it never affects the states this file is about.
  myStatus: jest.fn(() => Promise.resolve({ status: null, reason_class: null, since: null })),
  isModeratedStatus: (status) => status === 'restricted' || status === 'suspended',
  REPORT_REASONS: {},
}));

import {
  loadHub, loadHubSummary, reactToPost, consistencyGateState, loadConsistency,
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

/** A community_hub_summary group row (task 5: {id, name, access,
 * member_count, trained_today_count, sample}), distinct from the old
 * `community_group_list_mine` shape this replaced on the Hub. */
function group(over = {}) {
  return {
    id: 'g1', name: 'Iron Collective', access: 'open', member_count: 8, trained_today_count: 3, sample: [], ...over,
  };
}

/** A community_hub_summary cohort row ({kind, key, label, member_count,
 * trained_today_count, sample}). */
function cohort(over = {}) {
  return {
    kind: 'gym', key: 'g1', label: 'PureGym Leeds', member_count: 23, trained_today_count: 4, sample: [], ...over,
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
  loadHubSummary.mockResolvedValue({ cohorts: [], groups: [] });
  consistencyGateState.mockResolvedValue({ allowed: false, gated: false, isMinor: false });
  loadConsistency.mockResolvedValue(null);
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

// Lead ruling 2026-09-10 (communities revamp): the You row shows the
// reader's own device counters whenever `consistencyGateState` allows it
// (calm mode or an open ED flag withholds), independent of the "Share my
// consistency" toggle -- it is their own data on their own screen, and
// sharing governs what OTHER people see, never this. When the gate
// withholds, no You row renders at all: no empty row, no caption.
describe('the You row\'s ED gate: independent of the sharing toggle, gated only on consistencyGateState', () => {
  beforeEach(() => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub());
  });

  test('a joined person still sees the You row with their own counters (no sharing toggle is read any more)', async () => {
    consistencyGateState.mockResolvedValue({ allowed: false, gated: false, isMinor: false });
    loadConsistency.mockResolvedValue({
      c_sessions_week: 3, c_weeks_streak: 2, c_trained_days_week: ['mon', 'wed'], c_last_trained_day: null,
    });
    const { partTrees } = await render();
    const youRow = partTrees[0].root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string'
        && n.props.accessibilityLabel.startsWith('You') && typeof n.props.onPress === 'function',
    )[0];
    expect(youRow).toBeTruthy();
    expect(youRow.props.accessibilityLabel).toContain('3 sessions');
  });

  test('a calm-mode (or open ED flag) person sees no You row at all -- no empty row, no caption', async () => {
    consistencyGateState.mockResolvedValue({ allowed: false, gated: true, isMinor: false });
    loadConsistency.mockResolvedValue({
      c_sessions_week: 5, c_weeks_streak: 4, c_trained_days_week: ['mon'], c_last_trained_day: null,
    });
    const { text, partTrees } = await render();
    expect(text).not.toContain('5 sessions');
    const youRow = partTrees[0].root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('You'),
    )[0];
    expect(youRow).toBeUndefined();
  });
});

describe('state 3: joined, PEOPLE cohorts from community_hub_summary (task 5)', () => {
  beforeEach(() => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub());
  });

  test('style is never a Hub row (Find people is where it lives)', async () => {
    loadHubSummary.mockResolvedValue({
      cohorts: [
        cohort({ kind: 'style', key: 'kettlebell', label: 'Kettlebell lifters' }),
        cohort({ kind: 'gym', key: 'g1', label: 'PureGym Leeds' }),
      ],
      groups: [],
    });

    const { text } = await render();

    expect(text).toContain('PEOPLE');
    expect(text).toContain('PureGym Leeds');
    expect(text).not.toContain('Kettlebell lifters');
  });

  test('row order: gym, each discipline, age group, area', async () => {
    loadHubSummary.mockResolvedValue({
      cohorts: [
        // Deliberately out of order, so the assertion proves the Hub
        // re-orders rather than trusting the server's own array order.
        cohort({ kind: 'area', key: 'leeds', label: 'Lifters in Leeds' }),
        cohort({ kind: 'discipline', key: 'bodybuilding', label: 'Bodybuilding' }),
        cohort({ kind: 'age_band', key: 'g1', label: '25_34' }),
        cohort({ kind: 'gym', key: 'g1', label: 'PureGym Leeds' }),
        cohort({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' }),
      ],
      groups: [],
    });

    const { partTrees } = await render();
    const titles = partTrees[0].root.findAll(
      (n) => typeof n.type === 'function' && typeof n.props?.title === 'string' && Array.isArray(n.props?.people),
    ).map((n) => n.props.title);

    expect(titles).toEqual(['PureGym Leeds', 'Bodybuilding', 'Powerlifting', '25 to 34', 'Lifters in Leeds']);
  });

  test('the line and sample stack come straight from the summary row (task 5: "N trained today · M members")', async () => {
    loadHubSummary.mockResolvedValue({
      cohorts: [cohort({
        kind: 'gym', key: 'g1', label: 'PureGym Leeds', member_count: 23, trained_today_count: 4,
        sample: [{ user_id: 'u3', display_name: 'Priya K', avatar_preset: null }],
      })],
      groups: [],
    });

    const { text } = await render();
    expect(text).toContain('4 trained today · 23 members');
  });

  test('an age_band row maps the raw key through TP_AGE_BANDS for its title', async () => {
    loadHubSummary.mockResolvedValue({
      cohorts: [cohort({ kind: 'age_band', key: '25_34', label: '25_34', member_count: 5, trained_today_count: 1 })],
      groups: [],
    });

    const { text } = await render();
    expect(text).toContain('25 to 34');
    expect(text).not.toContain('25_34');
  });
});

describe('state 4: joined, GROUPS (from community_hub_summary, task 5)', () => {
  beforeEach(() => {
    useCommunityMe.mockReturnValue({
      me: ME_WITH_PROFILE, loading: false, error: null, refresh: jest.fn(),
    });
    loadHub.mockResolvedValue(emptyHub());
  });

  test('groups render as GroupRows with the trained-today line and the sample stack', async () => {
    loadHubSummary.mockResolvedValue({
      cohorts: [],
      groups: [group({ member_count: 8, trained_today_count: 3 })],
    });
    const { text } = await render();
    expect(text).toContain('GROUPS');
    expect(text).toContain('Iron Collective');
    expect(text).toContain('3 trained today · 8 members');
  });

  test('with no groups, the eyebrow keeps its trailing action and one quiet line explains what a group is for', async () => {
    loadHubSummary.mockResolvedValue({ cohorts: [], groups: [] });
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
