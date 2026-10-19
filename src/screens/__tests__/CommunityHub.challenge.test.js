/**
 * CommunityHub.challenge.test.js (gym challenge SPEC section 2, steps 7 and 8).
 *
 * What this suite pins: the Community tab's Challenge band.
 *  - an entrant gets a row to the Challenge screen with their score and the
 *    days left;
 *  - a same-gym non-entrant gets "Challenge at your gym" opening the join
 *    screen with the code (the server returns nothing to anyone else);
 *  - anyone who is neither sees no Challenge band at all (founder 2026-10-19:
 *    the challenge is not visible to people at other gyms);
 *  - a minor is never offered a way to join, and a failed read shows nothing
 *    extra rather than an error.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/community/MenuSheet', () => () => null);
jest.mock('../../lib/challenges/api', () => ({ myChallenges: jest.fn(), challengeForMyGym: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/database', () => ({
  getLatestCompletedWorkoutId: jest.fn(() => Promise.resolve('w1')),
}));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(() => ({ me: { profile: null }, loading: false, error: null, refresh: jest.fn() })),
}));

jest.mock('../../lib/community', () => ({
  ...jest.requireActual('../../lib/community/earlyDays'),
  getProfile: jest.fn(() => Promise.reject(Object.assign(new Error('offline'), { code: 'offline' }))),
  follow: jest.fn(() => Promise.resolve({ state: 'accepted' })),
  readHostDismissed: jest.fn(() => Promise.resolve(true)),
  writeHostDismissed: jest.fn(() => Promise.resolve()),
  loadHub: jest.fn(),
  GROUP_PURPOSE_LINE: jest.requireActual('../../lib/community/groups').GROUP_PURPOSE_LINE,
  hasProfile: (me) => !!me?.profile?.handle,
  hasUnseen: () => false,
  hasUnreadMessages: () => false,
  reactToPost: jest.fn(() => Promise.resolve()),
  loadHubSummary: jest.fn(() => Promise.resolve({ cohorts: [], groups: [] })),
  listMyGroups: jest.fn(() => Promise.resolve([])),
  acceptGroupInvite: jest.fn(() => Promise.resolve({})),
  declineGroupInvite: jest.fn(() => Promise.resolve({ declined: true })),
  metricLabel: (window, n) => `${Number(n) || 0} sessions`,
  daysLabel: (keys) => (Array.isArray(keys) ? keys.join(', ') : ''),
  TP_AGE_BANDS: { '18_24': '18 to 24' },
  consistencyGateState: jest.fn(() => Promise.resolve({ allowed: false, gated: false, isMinor: false })),
  loadConsistency: jest.fn(() => Promise.resolve(null)),
  publishConsistencyOnForeground: jest.fn(() => Promise.resolve({ sent: false, reason: null, payload: null })),
  flushPendingAmbientItems: jest.fn(() => Promise.resolve({ flushed: 0, dropped: 0, remaining: 0 })),
  retryPendingSharingPublish: jest.fn(() => Promise.resolve({ sent: false, reason: 'nothing_pending' })),
  clearStaleTrainingNow: jest.fn(() => Promise.resolve(false)),
  myStatus: jest.fn(() => Promise.resolve({ status: null, reason_class: null, since: null })),
  isModeratedStatus: (status) => status === 'restricted' || status === 'suspended',
  REPORT_REASONS: {},
  currentUserId: () => 'u1',
  retryPendingJoin: jest.fn(() => Promise.resolve({ ok: false, queued: false })),
  // The receipt's three collaborators. The sentence is the REAL function so
  // the card is proven to name the real audience.
  readShareSettings: jest.fn(),
  sessionShareGateState: jest.fn(),
  sessionsSharingSentence: jest.requireActual('../../lib/community/trainingProfile').sessionsSharingSentence,
}));

import {
  loadHub, readShareSettings, sessionShareGateState,
} from '../../lib/community';
import { myChallenges, challengeForMyGym } from '../../lib/challenges/api';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityHubScreen, { _resetHostCacheForTests } from '../CommunityHubScreen';


const ME_WITH_PROFILE = {
  profile: { user_id: 'u1', handle: 'rowan_lifts', display_name: 'Rowan M', visibility: 'public' },
  pending_requests: 0,
  unseen_activity: 0,
  is_moderator: false,
  is_minor: false,
};

function asMember() {
  useCommunityMe.mockReturnValue({ me: { ...ME_WITH_PROFILE }, loading: false, error: null, refresh: jest.fn() });
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

// The Feed is a FlashList (a FlatList passthrough under jest): its header is
// an unrendered element in props, so it is rendered for real here.
async function render() {
  const navigation = { navigate: jest.fn(), push: jest.fn(), setParams: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityHubScreen navigation={navigation} route={{ params: {} }} />);
  });
  await flush();
  const view = { tree, navigation };
  view.refresh = () => {
    const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
    const parts = [];
    if (list) {
      for (const element of [list.props.ListHeaderComponent, list.props.ListEmptyComponent]) {
        if (!element) continue;
        let part = null;
        act(() => { part = create(element); });
        parts.push(part);
      }
    }
    view.all = [tree, ...parts];
    view.text = view.all.map((tr) => flattenText(tr.toJSON())).join(' ');
  };
  view.refresh();
  return view;
}

const ENTRANT = {
  id: 'c1', code: 'volt-nov', title: 'Volt Gym November', status: 'active', days_left: 12, total: 62,
};
const INVITE = { code: 'volt-nov', title: 'Volt Gym November', gym_name: 'Volt Gym' };

function findRow(view, title) {
  return view.all
    .flatMap((tr) => tr.root.findAll((n) => n.props?.accessibilityLabel
      && String(n.props.accessibilityLabel).startsWith(title) && typeof n.props.onPress === 'function'))[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  loadHub.mockResolvedValue({
    segment: 'following', posts: [], people: [], dimensions: [], cursor: null, fromCache: false, error: null,
  });
  readShareSettings.mockResolvedValue({ share_sessions: false, sessions_audience: 'everyone' });
  sessionShareGateState.mockImplementation(async (uid, on) => ({ allowed: !!on, gated: false }));
  myChallenges.mockResolvedValue([]);
  challengeForMyGym.mockResolvedValue(null);
  _resetHostCacheForTests();
  asMember();
});

test('an entrant sees a row with their score and days left, opening the Challenge screen', async () => {
  myChallenges.mockResolvedValue([ENTRANT]);
  const view = await render();
  expect(view.text).toContain('Volt Gym November');
  expect(view.text).toContain('Your score: 62 of 100');
  expect(view.text).toContain('12 days left');
  await act(async () => { findRow(view, 'Volt Gym November').props.onPress(); });
  expect(view.navigation.navigate).toHaveBeenCalledWith('Challenge', { id: 'c1' });
});

test('a same-gym non-entrant sees the gym invite, opening the join screen with the code', async () => {
  challengeForMyGym.mockResolvedValue(INVITE);
  const view = await render();
  expect(view.text).toContain('Challenge at your gym');
  await act(async () => { findRow(view, 'Challenge at your gym').props.onPress(); });
  expect(view.navigation.navigate).toHaveBeenCalledWith('ChallengeJoin', { code: 'volt-nov', source: 'gym_invite' });
});

test('anyone else sees no Challenge band at all', async () => {
  const view = await render();
  expect(view.text).not.toContain('Challenge at your gym');
  expect(view.text).not.toContain('Challenge');
  expect(view.text).not.toContain('challenge code');
});

test('a person without a Community profile gets no gym read and no band', async () => {
  useCommunityMe.mockReturnValue({ me: { profile: null }, loading: false, error: null, refresh: jest.fn() });
  const view = await render();
  expect(view.text).not.toContain('Challenge');
  expect(challengeForMyGym).not.toHaveBeenCalled();
});

test('a minor is offered no way to join', async () => {
  useCommunityMe.mockReturnValue({ me: { ...ME_WITH_PROFILE, is_minor: true }, loading: false, error: null, refresh: jest.fn() });
  challengeForMyGym.mockResolvedValue(INVITE);
  const view = await render();
  expect(view.text).not.toContain('Challenge at your gym');
  expect(challengeForMyGym).not.toHaveBeenCalled();
});

test('a failed read adds no error and no entrant row', async () => {
  myChallenges.mockRejectedValue(new Error('offline'));
  challengeForMyGym.mockRejectedValue(new Error('offline'));
  const view = await render();
  expect(view.text).not.toContain('Your score');
  expect(view.text).not.toContain('Challenge');
});
