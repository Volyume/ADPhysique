/**
 * CommunityProfileScreen: discipline labels on the shared-facts line, and
 * the progress strip for someone else's profile (communities revamp
 * 2026-09-10, task 3; `docs/communities-revamp-2026-09-10/
 * 22-MIGRATION-170A-CONTRACT.md` `_community_profile_card`'s new fields).
 *
 * What this suite pins:
 *   1. `discipline_labels` joins the shared-facts line, alongside the
 *      existing place and chosen-facts text -- nothing about weight is
 *      anywhere near it.
 *   2. A card that carries the nine viewer counters (non-null) renders
 *      the existing `ProgressStrip` FOR SOMEONE ELSE, from the card's own
 *      fields.
 *   3. A card with no counters (the owner does not share consistency)
 *      shows no strip at all for a viewer -- no zeroed placeholder.
 *   4. The owner's OWN profile keeps the device-computed path exactly as
 *      before, independent of whether their own card happens to carry
 *      the counters.
 *
 * The client library is mocked: this is about what the screen composes
 * and shows, not about the RPC.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
// F5 (Opus adversarial review, founder order 2026-09-22): the profile
// screen now calls the real useFocusEffect, which needs a navigation
// context this harness does not provide. Collapsed to a mount-only
// effect (the same shape CommunityConversations.test.js already uses)
// so it fires once and never changes an existing assertion in this
// file; the behaviour itself is pinned at the source level below.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/BottomSheet', () => ({ visible, children }) => (visible ? children : null));
jest.mock('../../components/ModalHeader', () => () => null);
jest.mock('../../components/EmptyState', () => () => null);
jest.mock('../../components/Skeleton', () => ({
  Skeleton: () => null,
  SkeletonRow: () => null,
}));
jest.mock('../../components/ProfileAvatarMark', () => () => null);
jest.mock('../../components/community/FollowButton', () => () => null);
jest.mock('../../components/community/ConnectButton', () => () => null);
jest.mock('../../components/community/ConnectSheet', () => () => null);
jest.mock('../../components/community/TrainingProfileLine', () => () => null);
jest.mock('../../components/community/ProfileMenuSheet', () => () => null);
jest.mock('../../components/community/ReportSheet', () => () => null);
// Only the default (row) export is heavy; `factLabels`/`placeLine` are the
// real pure functions this screen's own composition depends on.
jest.mock('../../components/community/ProfileCard', () => ({
  __esModule: true,
  ...jest.requireActual('../../components/community/ProfileCard'),
  default: () => null,
}));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));

jest.mock('../../lib/community', () => ({
  getProfile: jest.fn(),
  listFollows: jest.fn(() => Promise.resolve({ people: [], cursor: null })),
  profileUrl: (h) => `https://volyume.app/u/${h}`,
  reactToPost: jest.fn(),
  unblockUser: jest.fn(),
  relationships: jest.fn(() => Promise.resolve({ blocked: [], muted: [] })),
  connectionState: () => 'none',
  readShareSettings: jest.fn(() => Promise.resolve({ consistency: false })),
  loadConsistency: jest.fn(),
  // The real ProfileCard.js (kept for its pure factLabels/placeLine, see
  // below) imports these too; this mock is resolved for every importer.
  COMMUNITY_STYLE_KEYS: { strength: 'Strength' },
  COMMUNITY_GOALS: {},
  COMMUNITY_SETTINGS: {},
  reasonLines: () => [],
  TP_AGE_BANDS: {},
}));

const {
  getProfile, readShareSettings, loadConsistency,
} = require('../../lib/community');
const useCommunityMe = require('../../hooks/useCommunityMe').default;
const CommunityProfileScreen = require('../CommunityProfileScreen').default;

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
 * The screen's list is a FlashList (E8), which the jest moduleNameMapper
 * points at the react-native manual mock's FlatList passthrough host. Its
 * ListHeaderComponent stays an unrendered ELEMENT in props (same as
 * `CommunityHub.states.test.js`'s own `renderList`), so the hero -- where
 * every assertion in this suite lives -- is rendered for real here.
 */
function renderHeader(tree) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  const header = list.props.ListHeaderComponent;
  if (!header) return { text: '' };
  let part = null;
  act(() => { part = create(header); });
  return { text: flattenText(part.toJSON()) };
}

/** ListEmptyComponent, rendered for real (same pattern as renderHeader,
 * founder order 2026-09-22 item 5). */
function renderEmpty(tree) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  const empty = list.props.ListEmptyComponent;
  if (!empty) return { text: '', tree: null };
  let part = null;
  act(() => { part = create(empty); });
  return { text: flattenText(part.toJSON()), tree: part };
}

async function mount(route = { params: { handle: 'sam' } }) {
  const navigation = { navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityProfileScreen navigation={navigation} route={route} />);
  });
  await flush();
  const { text } = renderHeader(tree);
  return { tree, navigation, text };
}

const OTHER_CARD = {
  user_id: 'u2',
  handle: 'sam',
  display_name: 'Sam Rees',
  avatar_preset: null,
  bio: null,
  styles: ['strength'],
  goal: null,
  setting: null,
  gym_label: 'PureGym Leeds',
  discipline_labels: ["Men's physique", 'Classic physique'],
  follower_count: 4,
  following_count: 2,
  connection_count: null,
  relationship: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1', handle: 'rowan' } } });
});

describe('the shared-facts line carries discipline_labels', () => {
  test('joins them alongside place and the other chosen facts', async () => {
    getProfile.mockResolvedValue({ card: OTHER_CARD, viewable: true, posts: [] });
    const { text } = await mount();

    expect(text).toContain("Trains at PureGym Leeds · Men's physique · Classic physique · Strength");
  });

  test('an empty discipline_labels array changes nothing (viewability gate, not viewable)', async () => {
    getProfile.mockResolvedValue({
      card: { ...OTHER_CARD, discipline_labels: [] }, viewable: true, posts: [],
    });
    const { text } = await mount();

    expect(text).toContain('Trains at PureGym Leeds · Strength');
    expect(text).not.toContain('physique');
  });
});

describe('the progress strip on someone else\'s profile', () => {
  const COUNTERS = {
    c_sessions_week: 3,
    c_sessions_month: 10,
    c_weeks_streak: 6,
    c_planned_pct_4w: 80,
    c_consistent_weeks_12w: 9,
    c_trained_days_week: ['mon', 'wed', 'fri'],
    c_last_trained_day: '2026-09-08',
    c_updated_at: 1234,
    c_weeks_history: [1, 2, 3, 2, 3, 4, 3, 3],
  };

  test('renders from the card\'s own fields when the card carries the counters', async () => {
    getProfile.mockResolvedValue({ card: { ...OTHER_CARD, ...COUNTERS }, viewable: true, posts: [] });
    const { text } = await mount();

    expect(text).toContain('sessions this week');
  });

  test('nothing renders when the card carries no counters (owner does not share)', async () => {
    getProfile.mockResolvedValue({ card: OTHER_CARD, viewable: true, posts: [] });
    const { text } = await mount();

    expect(text).not.toContain('sessions this week');
  });

  // migrate_172 (blueprint section 4, CR-05): the card carries c_prs_4w
  // under its own extra gate (share_consistency AND share_sessions), so
  // the client's only job for a viewer is to render it when present.
  test('the PR count shows when the card carries it', async () => {
    getProfile.mockResolvedValue({ card: { ...OTHER_CARD, ...COUNTERS, c_prs_4w: 3 }, viewable: true, posts: [] });
    const { text } = await mount();

    expect(text).toContain('PRs in 4 weeks');
  });

  test('no PR cell when the card carries the other counters but not c_prs_4w (share_sessions off)', async () => {
    getProfile.mockResolvedValue({ card: { ...OTHER_CARD, ...COUNTERS }, viewable: true, posts: [] });
    const { text } = await mount();

    expect(text).not.toContain('PR');
  });
});

describe('giving Respect on a profile post', () => {
  test('calls reactToPost with post id, true, and author user id', async () => {
    const { reactToPost } = require('../../lib/community');
    const postItem = {
      post: { id: 'p3', kind: 'session', payload: {}, caption: null, reaction_count: 0, comment_count: 0, created_at: Date.now() },
      author: OTHER_CARD,
      myReaction: false,
    };
    getProfile.mockResolvedValue({ card: OTHER_CARD, viewable: true, posts: [postItem] });
    const { tree } = await mount();
    const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
    const itemEl = list.props.renderItem({ item: postItem });
    let itemTree = null;
    act(() => { itemTree = create(itemEl); });
    const respectBtn = itemTree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Give this respect' && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => { respectBtn.props.onPress(); });
    // Founder order 2026-09-22 item 1 (review R-01): the author id must reach reactToPost or no push fires.
    expect(reactToPost).toHaveBeenCalledWith('p3', true, 'u2');
  });
});

describe('the owner\'s own profile keeps the device path', () => {
  test('still reads local consistency, independent of whether the own card carries counters', async () => {
    const OWN_CARD = { ...OTHER_CARD, user_id: 'u1', handle: 'rowan' };
    getProfile.mockResolvedValue({ card: OWN_CARD, viewable: true, posts: [] });
    readShareSettings.mockResolvedValue({ consistency: true });
    loadConsistency.mockResolvedValue({ c_sessions_week: 5, c_weeks_streak: 2, c_consistent_weeks_12w: 1 });

    const { text } = await mount();

    expect(loadConsistency).toHaveBeenCalledWith('u1');
    expect(text).toContain('sessions this week');
  });

  // migrate_172: the PR figure alone needs "Share what I did" too, even on
  // the owner's own view (the same share_sessions gate the SQL applies to
  // this account's own card) -- every other counter on the strip stays
  // gated on share.consistency alone.
  test('the PR count shows on the owner\'s own profile when they also share what they did', async () => {
    const OWN_CARD = { ...OTHER_CARD, user_id: 'u1', handle: 'rowan' };
    getProfile.mockResolvedValue({ card: OWN_CARD, viewable: true, posts: [] });
    readShareSettings.mockResolvedValue({ consistency: true, share_sessions: true });
    loadConsistency.mockResolvedValue({
      c_sessions_week: 5, c_weeks_streak: 2, c_consistent_weeks_12w: 1, c_prs_4w: 4,
    });

    const { text } = await mount();

    expect(text).toContain('PRs in 4 weeks');
  });

  test('the PR count is hidden on the owner\'s own profile when they share consistency but not what they did', async () => {
    const OWN_CARD = { ...OTHER_CARD, user_id: 'u1', handle: 'rowan' };
    getProfile.mockResolvedValue({ card: OWN_CARD, viewable: true, posts: [] });
    readShareSettings.mockResolvedValue({ consistency: true, share_sessions: false });
    loadConsistency.mockResolvedValue({
      c_sessions_week: 5, c_weeks_streak: 2, c_consistent_weeks_12w: 1, c_prs_4w: 4,
    });

    const { text } = await mount();

    expect(text).not.toContain('PR');
    expect(text).toContain('sessions this week');
  });
});

describe('own-profile ACTIVITY zero state gains "Say hello" (founder order 2026-09-22 item 5, audit A-05)', () => {
  const OWN_CARD = { ...OTHER_CARD, user_id: 'u1', handle: 'rowan' };

  test('the owner\'s own empty activity is one quiet line with exactly one action, Say hello', async () => {
    getProfile.mockResolvedValue({ card: OWN_CARD, viewable: true, posts: [] });
    const { tree } = await mount();
    const { text, tree: emptyTree } = renderEmpty(tree);

    // F11 (Opus adversarial review, founder order 2026-09-22 item 5):
    // re-anchored copy naming every kind this zero state can show.
    expect(text).toContain('Your sessions, personal bests and notes show up here.');
    // Button forwards onPress through several wrapper layers, so the
    // DISTINCT labelled actions is the true count of one, not a raw node
    // count (see the identical note in CommunityHub.states.test.js).
    const pressable = emptyTree.root.findAll((n) => typeof n.props?.onPress === 'function');
    const labels = new Set(pressable.map((n) => n.props?.accessibilityLabel).filter(Boolean));
    expect(labels).toEqual(new Set(['Say hello']));
  });

  test('Say hello opens CommunityCompose with kind note', async () => {
    getProfile.mockResolvedValue({ card: OWN_CARD, viewable: true, posts: [] });
    const { tree, navigation } = await mount();
    const { tree: emptyTree } = renderEmpty(tree);
    const sayHello = emptyTree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Say hello' && n.props?.onPress,
    )[0];
    expect(sayHello).toBeTruthy();
    await act(async () => { sayHello.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityCompose', { kind: 'note' });
  });

  test('no other door: someone else\'s empty activity carries no action at all', async () => {
    getProfile.mockResolvedValue({ card: OTHER_CARD, viewable: true, posts: [] });
    const { tree } = await mount();
    const { text, tree: emptyTree } = renderEmpty(tree);

    expect(text).toContain('Their sessions and personal bests show up here.');
    expect(emptyTree.root.findAll((n) => typeof n.props?.onPress === 'function')).toHaveLength(0);
  });
});

// F5 (Opus adversarial review, founder order 2026-09-22): after Say
// hello -> Post -> Back, the profile kept showing the zero state and
// the door -- nothing reloaded it. Source-level, not rendered: this
// file's own `@react-navigation/native` mock (above) collapses
// useFocusEffect to a mount-only effect, so it cannot exercise a
// genuine second focus; the real behaviour is that every later focus
// reloads QUIETLY, never re-showing the spinner over content already
// on screen.
describe('F5: reload quietly on focus, after the same initial mount load', () => {
  test('useFocusEffect reloads quietly on every return to focus, without disturbing the mount-time load', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../CommunityProfileScreen.js'), 'utf8');
    expect(src).toContain("import { useFocusEffect } from '@react-navigation/native';");
    // The original mount-time load is unchanged.
    expect(src).toContain('useEffect(() => { load(); }, [load]);');
    // `load` itself gained a quiet option (never re-showing the spinner).
    expect(src).toContain('const load = useCallback(async (opts = {}) => {');
    expect(src).toContain('if (!opts.quiet) setLoading(true);');
    // The focus effect skips its own first call (the one focus fires
    // alongside mount) and reloads QUIETLY every time after that.
    expect(src).toMatch(
      /useFocusEffect\(useCallback\(\(\) => \{\s*if \(!focusedOnceRef\.current\) \{ focusedOnceRef\.current = true; return; \}\s*load\(\{ quiet: true \}\);\s*\}, \[load\]\)\);/,
    );
  });
});
