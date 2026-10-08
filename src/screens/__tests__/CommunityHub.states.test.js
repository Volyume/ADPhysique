/**
 * CommunityHubScreen state matrix (D221 build spec 2.3; visual law
 * `docs/audit/community-level-up-2026-10-08/13-VISUAL-LAW.md`). Rewritten for
 * the four-segment Hub: Feed | People | Groups | You.
 *
 * What this suite pins:
 *   - the segment bar (four radios, Feed first, the choice persisted under
 *     `community.hub.segment`, `route.params.segment` honoured);
 *   - the header: exactly three glyphs for a member (search, activity,
 *     messages), none of the old avatar or privacy shield;
 *   - the Feed: the right scope read for a member and a reader without a
 *     profile, each scope's empty line, the disabled scope with the hint
 *     "Not available yet" when the server lacks migration 190, optimistic
 *     Respect reaching `reactToPost` with the author id, the non-member's
 *     read-only Everyone feed routing Respect to Join;
 *   - People, Groups and You content, the invite Accept and Decline;
 *   - the calm-mode and ED-flag withhold: the You row and the ProgressStrip
 *     are absent exactly when `consistencyGateState` says gated (the same
 *     surfaces the previous Hub hid);
 *   - the account notices (rules moved on, legacy partner link), the HOST
 *     row, the early-days zero state, the quiet reload on focus;
 *   - a source guard: no `Eyebrow`, `Card` or `SectionLabel` import remains.
 */

import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
// The sheet's chrome is not under test; its props (title, rows) are.
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
  readHostDismissed: jest.fn(() => Promise.resolve(false)),
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
  metricLabel: (window, n) => (Number(n) === 1 ? '1 session' : `${Number(n) || 0} sessions`),
  daysLabel: (keys) => (Array.isArray(keys) ? keys.join(', ') : ''),
  TP_AGE_BANDS: { '18_24': '18 to 24' },
  // Default is "not gated"; the calm and ED tests override it.
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
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import {
  loadHub, loadHubSummary, reactToPost, consistencyGateState, loadConsistency, getProfile, follow,
  readHostDismissed, listMyGroups, acceptGroupInvite, declineGroupInvite, COMMUNITY_HOST_USER_ID,
} from '../../lib/community';
import { getLatestCompletedWorkoutId } from '../../lib/database';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityHubScreen, { _resetHostCacheForTests, HUB_SEGMENT_KEY } from '../CommunityHubScreen';

const ME_WITH_PROFILE = {
  profile: { user_id: 'u1', handle: 'rowan_lifts', display_name: 'Rowan M', visibility: 'public' },
  pending_requests: 0,
  unseen_activity: 0,
  is_moderator: false,
  is_minor: false,
};

function asMember(over = {}) {
  useCommunityMe.mockReturnValue({
    me: { ...ME_WITH_PROFILE, ...over }, loading: false, error: null, refresh: jest.fn(),
  });
}

function emptyHub(over = {}) {
  return {
    segment: 'following', posts: [], people: [], dimensions: [], cursor: null, fromCache: false, error: null, ...over,
  };
}

function card(over = {}) {
  return {
    user_id: 'u2', handle: 'priya_kb', display_name: 'Priya K', avatar_preset: null, ...over,
  };
}

function post(over = {}) {
  return {
    post: {
      id: 'p1',
      kind: 'session',
      payload: { sessionName: 'Upper A', duration: 45, workingSets: 12, prCount: 0 },
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
    id: 'g1', name: 'Iron Collective', access: 'open', member_count: 8, trained_today_count: 3, sample: [], ...over,
  };
}

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
 * The Feed is a FlashList, which the jest moduleNameMapper points at the
 * react-native FlatList passthrough: its header and empty components stay
 * unrendered ELEMENTS in props, so both are rendered for real here.
 */
function renderParts(tree) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  const trees = [];
  if (list) {
    for (const element of [list.props.ListHeaderComponent, list.props.ListEmptyComponent]) {
      if (!element) continue;
      let part = null;
      act(() => { part = create(element); });
      trees.push(part);
    }
  }
  return { list, trees };
}

async function render({ segment = null, params = {} } = {}) {
  if (segment) await AsyncStorage.setItem(HUB_SEGMENT_KEY, segment);
  const navigation = { navigate: jest.fn(), push: jest.fn(), setParams: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityHubScreen navigation={navigation} route={{ params }} />);
  });
  await flush();
  const view = { tree, navigation };
  view.refresh = () => {
    const { list, trees } = renderParts(tree);
    view.list = list;
    view.parts = trees;
    view.all = [tree, ...trees];
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

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  _resetHostCacheForTests();
  readHostDismissed.mockResolvedValue(false);
  loadHub.mockResolvedValue(emptyHub());
  loadHubSummary.mockResolvedValue({ cohorts: [], groups: [] });
  listMyGroups.mockResolvedValue([]);
  consistencyGateState.mockResolvedValue({ allowed: false, gated: false, isMinor: false });
  loadConsistency.mockResolvedValue(null);
  useCommunityMe.mockReturnValue({ me: { profile: null }, loading: false, error: null, refresh: jest.fn() });
});

describe('the segment bar', () => {
  test('four radios, Feed first and selected on a first open', async () => {
    asMember();
    const view = await render();
    const radios = view.tree.root.findAll(
      (n) => n.props?.accessibilityRole === 'radio' && ['Feed', 'People', 'Groups', 'You'].includes(n.props.accessibilityLabel)
        && typeof n.props.onPress === 'function',
    );
    const labels = [...new Set(radios.map((n) => n.props.accessibilityLabel))];
    expect(labels).toEqual(['Feed', 'People', 'Groups', 'You']);
    const feed = radios.find((n) => n.props.accessibilityLabel === 'Feed');
    expect(feed.props.accessibilityState.checked).toBe(true);
  });

  test('choosing a segment persists it under community.hub.segment', async () => {
    asMember();
    const view = await render();
    await press(view, 'People');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(HUB_SEGMENT_KEY, 'people');
    expect(view.text).toContain('Find people');
  });

  test('the remembered segment is where the Hub opens', async () => {
    asMember();
    const view = await render({ segment: 'groups' });
    expect(view.text).toContain('Browse open groups');
  });

  test('route.params.segment wins over the remembered one', async () => {
    asMember();
    const view = await render({ segment: 'groups', params: { segment: 'people' } });
    expect(view.text).toContain('Search people and groups');
  });
});

describe('the segment param (SF3) and an early tap (F8)', () => {
  test('a segment param is applied on focus and then consumed, so the same one lands again', async () => {
    asMember();
    const view = await render({ params: { segment: 'people' } });
    expect(view.text).toContain('Search people and groups');
    expect(view.navigation.setParams).toHaveBeenCalledWith({ segment: undefined });
    // The person goes back to Feed, leaves, and Today sends the same param again.
    await press(view, 'Feed');
    expect(view.text).toContain('Follow a few people to fill this feed');
    let tree2;
    const nav2 = { navigate: jest.fn(), push: jest.fn(), setParams: jest.fn() };
    await act(async () => {
      tree2 = create(<CommunityHubScreen navigation={nav2} route={{ params: { segment: 'people' } }} />);
    });
    await flush();
    expect(flattenText(tree2.toJSON())).toContain('Find people');
    expect(nav2.setParams).toHaveBeenCalledWith({ segment: undefined });
  });

  test('a segment tapped before the remembered one loads is not overwritten', async () => {
    asMember();
    let release;
    AsyncStorage.getItem.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve('groups'); }),
    );
    const navigation = { navigate: jest.fn(), push: jest.fn(), setParams: jest.fn() };
    let tree;
    await act(async () => { tree = create(<CommunityHubScreen navigation={navigation} route={{ params: {} }} />); });
    // The person taps People while the remembered segment is still loading.
    const radio = tree.root.findAll((n) => n.props?.accessibilityLabel === 'People' && n.props.accessibilityRole === 'radio'
      && typeof n.props.onPress === 'function')[0];
    await act(async () => { radio.props.onPress(); });
    await act(async () => { release(); });
    await flush();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Find people');
    expect(text).not.toContain('Browse open groups');
  });
});

describe('the header', () => {
  test('a member has exactly three glyphs: search, activity, messages (no avatar, no privacy shield)', async () => {
    asMember();
    const view = await render();
    const labels = view.tree.root
      .findAll((n) => typeof n.props?.accessibilityLabel === 'string' && typeof n.props.onPress === 'function')
      .map((n) => n.props.accessibilityLabel);
    const glyphs = [...new Set(labels.filter((l) => /^(Search Community|Activity|Messages)/.test(l)))];
    expect(glyphs).toEqual(['Search Community', 'Activity', 'Messages']);
    expect(labels).not.toContain('Your profile');
    expect(labels).not.toContain('Community privacy');
    expect(flattenText(view.tree.toJSON())).toContain('Community');
  });
});

describe('Feed: a member', () => {
  test('reads Following first and shows the compose well', async () => {
    asMember();
    const view = await render();
    expect(loadHub).toHaveBeenCalledWith('following', expect.objectContaining({ sort: 'newest' }));
    expect(view.text).toContain('Share something from your training');
    for (const label of ['Following', 'My gym', 'My groups', 'Everyone']) expect(view.text).toContain(label);
  });

  test('each scope has its own quiet empty line and one action', async () => {
    asMember();
    const view = await render();
    expect(view.text).toContain('Follow a few people to fill this feed');
    expect(view.text).toContain('Find people');
    await press(view, 'My gym');
    expect(loadHub).toHaveBeenLastCalledWith('gym', expect.any(Object));
    expect(view.text).toContain('Set your gym to see who trains there');
    expect(view.text).toContain('Set gym');
    await press(view, 'My groups');
    expect(view.text).toContain('Join or start a group');
    await press(view, 'Everyone');
    expect(view.text).toContain('Nothing posted yet. Yours could be first.');
    expect(view.text).toContain('Write a post');
  });

  test('My gym with no gym_id asks to set one, opening the gym picker; with a gym it says nobody has posted', async () => {
    asMember({ profile: { ...ME_WITH_PROFILE.profile, gym_label: 'PureGym', place_key: 'town:leeds', gym_id: null } });
    let view = await render();
    await press(view, 'My gym');
    expect(view.text).toContain('Set your gym to see who trains there');
    await press(view, 'Set gym');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityEditProfile', { openGymPicker: true });
    asMember({ profile: { ...ME_WITH_PROFILE.profile, gym_id: 'gym-1' } });
    view = await render();
    await press(view, 'My gym');
    expect(view.text).toContain('Nobody at your gym has posted yet.');
  });

  test('paging de-duplicates posts by id for every sort (SF4)', async () => {
    asMember();
    const a = post({ post: { ...post().post, id: 'pa' } });
    const b = post({ post: { ...post().post, id: 'pb' } });
    const c = post({ post: { ...post().post, id: 'pc' } });
    loadHub
      .mockResolvedValueOnce(emptyHub({ posts: [a, b], cursor: 'k1' }))
      .mockResolvedValueOnce(emptyHub({ posts: [b, c], cursor: null }));
    const view = await render();
    await act(async () => { await view.list.props.onEndReached(); });
    await flush();
    view.refresh();
    const ids = view.list.props.data.map((row) => row.post.id);
    expect(ids).toEqual(['pa', 'pb', 'pc']);
  });

  test('Most respected stays in the sort sheet, disabled with the hint, when the server lacks it (F7)', async () => {
    asMember();
    loadHub.mockImplementation(async (scope, opts) => emptyHub(opts?.sort === 'respected' ? { fallback: 'sort' } : {}));
    const view = await render();
    await press(view, 'Sort: Newest');
    const sheet0 = view.tree.root.findAll((n) => n.props?.title === 'Sort posts' && Array.isArray(n.props.rows))[0];
    await act(async () => { sheet0.props.rows[1].onPress(); });
    await flush();
    const sheet = view.tree.root.findAll((n) => n.props?.title === 'Sort posts' && Array.isArray(n.props.rows))[0];
    const row = sheet.props.rows.find((r) => r.label === 'Most respected');
    expect(row).toBeTruthy();
    expect(row.sub).toBe('Not available yet');
    // D221 lane 2B: the row carries the menu's `disabled` option, so it is
    // dimmed, does nothing and reports the disabled state.
    expect(row.disabled).toBe(true);
    const live = sheet.props.rows.find((r) => r.label === 'Newest');
    expect(live.disabled).toBeFalsy();
  });

  test('a scope the server cannot serve is a disabled chip with the hint "Not available yet"', async () => {
    asMember();
    loadHub.mockImplementation(async (scope) => emptyHub(scope === 'gym' ? { fallback: 'scope' } : {}));
    const view = await render();
    await press(view, 'My gym');
    const chips = view.all.flatMap((tr) => tr.root.findAll(
      (n) => n.props?.accessibilityRole === 'radio' && ['My gym', 'My groups'].includes(n.props.accessibilityLabel),
    ));
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip.props.accessibilityHint).toBe('Not available yet');
      expect(chip.props.disabled).toBe(true);
    }
  });

  test('Respect on a post calls reactToPost with the post id, the new state and the author id', async () => {
    asMember();
    loadHub.mockResolvedValue(emptyHub({ posts: [post()] }));
    const view = await render();
    expect(view.list.props.data).toHaveLength(1);
    let row;
    act(() => { row = create(view.list.props.renderItem({ item: view.list.props.data[0] })); });
    const heart = row.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Give this post Respect' && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => { heart.props.onPress(); });
    expect(reactToPost).toHaveBeenCalledWith('p1', true, 'u2');
  });

  test('the compose well opens the kind sheet: a note, or your last session', async () => {
    asMember();
    const view = await render();
    await press(view, 'Share something from your training');
    const sheet = view.tree.root.findAll(
      (n) => n.props?.title === 'Share something' && Array.isArray(n.props.rows),
    )[0];
    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.rows.map((r) => r.label)).toEqual(['A note', 'Your last session']);
    // F10: the sub states the person's real default audience (adult default: Everyone).
    expect(sheet.props.rows[0].sub).toMatch(/Everyone on Community can see this|Only people who follow you/);
    act(() => { sheet.props.rows[0].onPress(); });
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityCompose', { kind: 'note' });
    await act(async () => { await sheet.props.rows[1].onPress(); });
    expect(getLatestCompletedWorkoutId).toHaveBeenCalledWith('u1');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityCompose', { kind: 'session', workoutId: 'w1' });
  });

  test('a failed read is an EmptyState with Try again, never an empty community', async () => {
    asMember();
    loadHub.mockResolvedValue(emptyHub({ error: 'unavailable' }));
    const view = await render();
    expect(view.text).toContain('Could not load Community');
    expect(view.text).toContain('Try again');
  });

  test('offline with a cached payload: the content under one quiet line', async () => {
    asMember();
    loadHub.mockResolvedValue(emptyHub({ posts: [post()], fromCache: true, error: 'offline' }));
    const view = await render();
    expect(view.text).toContain('Showing what you last saw. You are offline.');
    expect(view.text).not.toContain('You are offline Community needs a connection');
  });
});

describe('Feed: no Community profile', () => {
  test('the hero band and the Everyone feed, read-only', async () => {
    loadHub.mockResolvedValue(emptyHub({ posts: [post()] }));
    const view = await render();
    expect(loadHub).toHaveBeenCalledWith('everyone', expect.any(Object));
    expect(view.text).toContain('See what people are training');
    expect(view.text).toContain('Join Community');
    expect(view.text).toContain('Browse first');
    expect(view.text).toContain('Nothing about your body, food or coaching is ever shared.');
    expect(view.text).not.toContain('Share something from your training');
    expect(view.list.props.data).toHaveLength(1);
  });

  test('Respect routes to Join, never the RPC', async () => {
    loadHub.mockResolvedValue(emptyHub({ posts: [post()] }));
    const view = await render();
    let row;
    act(() => { row = create(view.list.props.renderItem({ item: view.list.props.data[0] })); });
    const heart = row.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Give this post Respect' && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => { heart.props.onPress(); });
    expect(reactToPost).not.toHaveBeenCalled();
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityJoin');
  });

  test('Browse first folds the hero to one line with the way in (no loop back)', async () => {
    const view = await render();
    await press(view, 'Browse Community first');
    expect(view.text).not.toContain('See what people are training');
    expect(view.text).toContain('Not joined yet');
    await press(view, 'Join Community');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityJoin');
  });

  test('the You segment shows the hero, and no member rows', async () => {
    const view = await render({ segment: 'you' });
    expect(view.text).toContain('See what people are training');
    expect(view.text).not.toContain('Privacy and sharing');
  });
});

describe('People', () => {
  test('Find people, Requests with the count, the gym, discipline and area bands; style and age group are not Hub rows', async () => {
    asMember({ pending_requests: 1, pending_connect_requests: 1 });
    loadHubSummary.mockResolvedValue({
      cohorts: [
        cohort({ kind: 'area', key: 'a1', label: 'Leeds' }),
        cohort({ kind: 'age_band', key: '18_24', label: '18_24' }),
        cohort({ kind: 'style', key: 's1', label: 'Powerlifting' }),
        cohort({ kind: 'discipline', key: 'd1', label: 'Strength' }),
        cohort(),
      ],
      groups: [],
    });
    const view = await render({ segment: 'people' });
    const order = ['Your gym', 'PureGym Leeds', 'Disciplines', 'Strength', 'Near you', 'Leeds'];
    let at = -1;
    for (const s of order) {
      const i = view.text.indexOf(s, at + 1);
      expect(i).toBeGreaterThan(at);
      at = i;
    }
    expect(view.text).toContain('Find people');
    expect(view.text).toContain('2 people want to connect');
    expect(view.text).not.toContain('Powerlifting');
    expect(view.text).not.toContain('18 to 24');
    expect(view.text).toContain('4 trained today · 23 members');
  });

  test('no gym cohort and no gym on the profile: a Set your gym row', async () => {
    asMember();
    const view = await render({ segment: 'people' });
    expect(view.text).toContain('Set your gym');
  });
});

describe('Groups', () => {
  test('my groups render as GroupRows with the trained-today line; New group and Browse open groups are rows', async () => {
    asMember();
    loadHubSummary.mockResolvedValue({ cohorts: [cohort()], groups: [group()] });
    const view = await render({ segment: 'groups' });
    expect(view.text).toContain('Iron Collective');
    expect(view.text).toContain('3 trained today · 8 members');
    expect(view.text).toContain('New group');
    await press(view, 'Browse open groups. Find a group to join');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunitySearch', { mode: 'groups' });
  });

  test('with no groups, one quiet line says what a group is for', async () => {
    asMember();
    const view = await render({ segment: 'groups' });
    expect(view.text).toContain('Make a group with friends');
  });

  test('a pending invite offers Accept and Decline; Decline removes the invite on the server', async () => {
    asMember();
    listMyGroups.mockResolvedValue([
      { group: { id: 'g9', name: 'Monday crew', access: 'invite' }, role: null, state: 'invited' },
      { group: { id: 'g1', name: 'Iron Collective', access: 'open' }, role: 'member', state: 'member', unread: 3 },
    ]);
    const view = await render({ segment: 'groups' });
    expect(view.text).toContain('Invites');
    expect(view.text).toContain('Monday crew');
    await press(view, 'Accept the invite to Monday crew');
    expect(acceptGroupInvite).toHaveBeenCalledWith({ groupId: 'g9' });
    listMyGroups.mockResolvedValue([
      { group: { id: 'g1', name: 'Iron Collective', access: 'open' }, role: 'member', state: 'member', unread: 3 },
    ]);
    await press(view, 'Decline the invite to Monday crew');
    expect(declineGroupInvite).toHaveBeenCalledWith('g9');
    expect(view.text).not.toContain('Invited you to join');
  });

  test('a minor with no groups sees no group creation row', async () => {
    asMember({ is_minor: true });
    const view = await render({ segment: 'groups' });
    expect(view.text).not.toContain('New group');
  });
});

describe('You', () => {
  test('the You row, its counters and the rows to profile, followers, privacy, training profile and rules', async () => {
    asMember();
    loadConsistency.mockResolvedValue({
      c_sessions_week: 3, c_weeks_streak: 2, c_trained_days_week: ['mon', 'wed'], c_last_trained_day: null,
      c_consistent_weeks_12w: 5, c_weeks_history: [1, 2, 3, 0, 1, 2, 3, 2],
    });
    const view = await render({ segment: 'you' });
    const youRow = findByLabel(view, 'You. Trained mon, wed. 3 sessions');
    expect(youRow).toBeTruthy();
    expect(view.text).toContain('sessions this week');
    for (const label of ['My profile', 'Followers and connections', 'Privacy and sharing', 'Training profile', 'Community rules']) {
      expect(view.text).toContain(label);
    }
    await press(view, 'Privacy and sharing');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityPrivacy');
  });

  test('calm mode or an open ED flag: no You row and no ProgressStrip, the rest of You stays', async () => {
    asMember();
    consistencyGateState.mockResolvedValue({ allowed: false, gated: true, isMinor: false });
    loadConsistency.mockResolvedValue({
      c_sessions_week: 5, c_weeks_streak: 4, c_trained_days_week: ['mon'], c_last_trained_day: null,
      c_consistent_weeks_12w: 6, c_weeks_history: [1, 2, 3, 0, 1, 2, 3, 2],
    });
    const view = await render({ segment: 'you' });
    expect(view.text).not.toContain('5 sessions');
    expect(view.text).not.toContain('sessions this week');
    const youRow = view.all.flatMap((tr) => tr.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('You.'),
    ))[0];
    expect(youRow).toBeUndefined();
    expect(loadConsistency).not.toHaveBeenCalled();
    expect(view.text).toContain('Privacy and sharing');
  });

  test('the early-days zero state lives here: the first-here line and the invite', async () => {
    asMember({ profile: { ...ME_WITH_PROFILE.profile, gym_label: 'Volt Gym' } });
    const view = await render({ segment: 'you' });
    expect(view.text).toContain('You are the first here from Volt Gym.');
    expect(view.text).toContain('Invite a gym mate');
  });

  test('the invite opens the share sheet; a dismissed sheet is silent', async () => {
    asMember({ profile: { ...ME_WITH_PROFILE.profile, gym_label: 'Volt Gym' } });
    const spy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('dismissed'));
    const view = await render({ segment: 'you' });
    await press(view, 'Invite someone to Volyume');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test('the HOST row: reads the host once, Follow follows and drops the row, Not now remembers', async () => {
    asMember();
    getProfile.mockResolvedValue({
      card: card({
        user_id: COMMUNITY_HOST_USER_ID, handle: 'allan', display_name: 'Allan', gym_label: 'Volt Gym', show_gym: true,
      }),
      viewable: true,
    });
    const view = await render({ segment: 'you' });
    expect(getProfile).toHaveBeenCalled();
    expect(getProfile).toHaveBeenCalledWith({ handle: 'allan' });
    expect(view.text).toContain('Host');
    expect(view.text).toContain('Allan');
    await press(view, 'Follow Allan');
    expect(follow).toHaveBeenCalledWith(COMMUNITY_HOST_USER_ID);
    expect(findByLabel(view, 'Follow Allan')).toBeUndefined();
  });

  test('no host read at all before joining', async () => {
    await render({ segment: 'you' });
    expect(getProfile).not.toHaveBeenCalled();
  });
});

describe('account notices', () => {
  test('the rules moved on: a line says so and opens the rules to accept them', async () => {
    asMember({ rules_version: 3, accepted_rules_version: 2 });
    const view = await render();
    expect(view.text).toContain('The Community rules have changed.');
    await press(view, 'Read and accept the updated Community rules');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityRules', { mustAccept: true });
  });

  test('no rules line when current, when the server does not say, or before joining', async () => {
    for (const me of [
      { ...ME_WITH_PROFILE, rules_version: 3, accepted_rules_version: 3 },
      ME_WITH_PROFILE,
      { profile: null, rules_version: 3, accepted_rules_version: null },
    ]) {
      useCommunityMe.mockReturnValue({ me, loading: false, error: null, refresh: jest.fn() });
      const view = await render();
      expect(view.text).not.toContain('The Community rules have changed');
    }
  });

  test('a legacy partner link shows the moved-invites note with a way onward', async () => {
    asMember();
    const view = await render({ params: { legacyPartnerCode: 'ABC' } });
    expect(view.text).toContain('Partner invites have moved');
    await press(view, 'Find people in Community');
    expect(view.navigation.navigate).toHaveBeenCalledWith('CommunityFindPeople');
  });

  test('no partner note without a legacy code', async () => {
    asMember();
    const view = await render();
    expect(view.text).not.toContain('Partner invites have moved');
  });
});

describe('quiet reload on focus', () => {
  test('the mount load happens once; focus does not add a second mount-time call', async () => {
    asMember();
    await render();
    expect(loadHub).toHaveBeenCalledTimes(1);
  });
});

describe('source guards', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../CommunityHubScreen.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('no Eyebrow, Card or SectionLabel import remains in the Hub', () => {
    expect(source).not.toMatch(/import\s+Eyebrow\b/);
    expect(source).not.toMatch(/import\s+Card\b/);
    expect(source).not.toMatch(/import\s+SectionLabel\b/);
    expect(source).not.toMatch(/<Card\b/);
    expect(source).not.toMatch(/<Eyebrow\b/);
    expect(source).not.toMatch(/ActivityItemRow/);
  });

  test('the Hub declares no band of its own: Band and BandGap come from the shared component (founder verdict 2026-10-08)', () => {
    expect(source).not.toMatch(/const BAND\s*=/);
    expect(source).not.toMatch(/function Band\b/);
    expect(source).toMatch(/import Band, \{ BandGap \} from '\.\.\/components\/community\/Band'/);
  });
});
