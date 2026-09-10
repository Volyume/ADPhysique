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
});
