/**
 * CommunityHub.joinReceipt.test.js (D228 item 1, option C).
 *
 * What this suite pins, and why each case is written to FAIL: a member who
 * has not dismissed it sees ONE card in the Hub's notices block, "Your
 * sessions post to Community", whose body is the REAL audience sentence
 * (`sessionsSharingSentence` over the person's own stored settings, not a
 * hard-coded line), with a direct "Change who sees this" link to the
 * Privacy screen (where the "Share what I did" switch lives) and a dismiss.
 *
 *  - it shows once: dismissing, or following the change link, settles it;
 *  - the seen-flag fails toward SHOWING (an unreadable flag shows it again);
 *  - it never shows with sharing off (the sentence would say "Off" and
 *    there is nothing to warn about), with an unreadable sharing store, for
 *    someone without a profile, or under calm mode or an open ED flag (the
 *    same `sessionShareGateState` verdict that holds the posts themselves);
 *  - a gate that cannot answer is treated as closed.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/community/MenuSheet', () => () => null);
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadHub, readShareSettings, sessionShareGateState,
} from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import { joinReceiptSeenKey } from '../../lib/community/joinReceipt';
import CommunityHubScreen, { _resetHostCacheForTests } from '../CommunityHubScreen';

const KEY = joinReceiptSeenKey('u1');
const TITLE = 'Your sessions post to Community';
const CHANGE = 'Change who sees this';

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

function findByLabel(view, label) {
  return view.all
    .flatMap((tr) => tr.root.findAll((n) => n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function'))[0];
}

async function press(view, label) {
  const node = findByLabel(view, label);
  expect(node).toBeTruthy();
  await act(async () => { node.props.onPress(); });
  await flush();
  view.refresh();
}

const SHARING_ON = { share_sessions: true, sessions_audience: 'everyone' };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(require('@react-native-async-storage/async-storage').__store.get(k) ?? null));
  _resetHostCacheForTests();
  loadHub.mockResolvedValue({
    segment: 'following', posts: [], people: [], dimensions: [], cursor: null, fromCache: false, error: null,
  });
  readShareSettings.mockResolvedValue({ ...SHARING_ON });
  sessionShareGateState.mockImplementation(async (uid, on) => ({ allowed: !!on, gated: false }));
  asMember();
});

describe('the receipt shows once, with the real audience', () => {
  test('everyone: the title, the real sentence, the change link and a dismiss', async () => {
    const view = await render();
    expect(view.text).toContain(TITLE);
    expect(view.text).toContain('Your sessions are shared with everyone on Community unless you change it.');
    const change = findByLabel(view, 'Change who sees your sessions');
    expect(change).toBeTruthy();
    expect(flattenText(change.children)).toBe(CHANGE);
    expect(flattenText(findByLabel(view, 'Dismiss this notice about your sessions').children)).toBe('Dismiss');
  });

  test('followers: the sentence names followers', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'followers' });
    const view = await render();
    expect(view.text).toContain('Your sessions are shared with people who follow you.');
  });

  test('groups: the sentence names the groups', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'groups' });
    const view = await render();
    expect(view.text).toContain('Your sessions are shared with your groups.');
  });

  test('the change link opens the Privacy screen and settles the receipt for good', async () => {
    const view = await render();
    await press(view, 'Change who sees your sessions');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityPrivacy');
    expect(await AsyncStorage.getItem(KEY)).toBe('1');
    expect(view.text).not.toContain(TITLE);
    const again = await render();
    expect(again.text).not.toContain(TITLE);
  });

  test('Dismiss settles it: gone now and on the next open', async () => {
    const view = await render();
    await press(view, 'Dismiss this notice about your sessions');
    expect(await AsyncStorage.getItem(KEY)).toBe('1');
    expect(view.text).not.toContain(TITLE);
    const again = await render();
    expect(again.text).not.toContain(TITLE);
    expect(view.navigation.navigate).not.toHaveBeenCalled();
  });

  test('already seen: never shown', async () => {
    await AsyncStorage.setItem(KEY, '1');
    const view = await render();
    expect(view.text).not.toContain(TITLE);
  });

  test('an unreadable seen-flag shows it again (fails toward showing)', async () => {
    AsyncStorage.getItem.mockImplementation((k) => (
      k === KEY
        ? Promise.reject(new Error('unreadable'))
        : Promise.resolve(require('@react-native-async-storage/async-storage').__store.get(k) ?? null)
    ));
    const view = await render();
    expect(view.text).toContain(TITLE);
  });
});

describe('it never shows where there is nothing to warn about or sharing is withheld', () => {
  test('sharing off: no receipt (the sentence would only say Off)', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: false, sessions_audience: 'everyone' });
    const view = await render();
    expect(view.text).not.toContain(TITLE);
  });

  test('an unreadable sharing store: no receipt (it could not name the audience truthfully)', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: false, sessions_audience: 'followers', read_failed: true });
    const view = await render();
    expect(view.text).not.toContain(TITLE);
  });

  test('calm mode or an open ED flag: no receipt', async () => {
    sessionShareGateState.mockResolvedValue({ allowed: false, gated: true });
    const view = await render();
    expect(view.text).not.toContain(TITLE);
    expect(sessionShareGateState).toHaveBeenCalledWith('u1', true);
  });

  test('a gate that cannot answer is closed: no receipt', async () => {
    sessionShareGateState.mockRejectedValue(new Error('unreadable'));
    const view = await render();
    expect(view.text).not.toContain(TITLE);
  });

  test('someone without a profile: no receipt', async () => {
    useCommunityMe.mockReturnValue({ me: { profile: null }, loading: false, error: null, refresh: jest.fn() });
    const view = await render();
    expect(view.text).not.toContain(TITLE);
    expect(readShareSettings).not.toHaveBeenCalled();
  });
});
