/**
 * CommunityDimensionScreen: the discipline and age_band kinds, the board
 * roster for every kind, RECENT (paged), the age-band reciprocal lock and
 * the physique-division Beat signpost / calm-mode resting state
 * (communities revamp 2026-09-10, task 6; `docs/communities-revamp-
 * 2026-09-10/22-MIGRATION-170A-CONTRACT.md`).
 *
 * What this suite pins:
 *   1. discipline and age_band both reach `loadBoard` with their own
 *      scope, age_band with NO scope key (always the caller's own band).
 *   2. age_band's raw-key label is mapped through TP_AGE_BANDS (the
 *      shipped labels, not a second copy: lead ruling, one wording).
 *   3. RECENT loads via `loadDimensionRecent`, pages on `onEndReached`,
 *      and a Respect tap on a RECENT row calls `reactToPost`.
 *   4. The age-band page is locked (one line, a tertiary row to Training
 *      profile, no reads at all) unless the caller shares a matching
 *      band.
 *   5. Every physique-division discipline page carries the Beat row;
 *      under calm mode or an open ED flag it is the ONLY content besides
 *      the header and the resting line -- and the underlying reads still
 *      ran in the background (a client-only render decision).
 *
 * FlashList is the react-native manual mock's FlatList passthrough host:
 * ListHeaderComponent is rendered as its own tree (`renderHeader`, the
 * same convention `CommunityHub.states.test.js` and
 * `CommunityDimension.gymConfirm.test.js` use), and list CONTENT is read
 * off `list.props.data` / invoking `list.props.renderItem` directly,
 * since the mock never calls it itself.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => ({ title }) => title ?? null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/usePhotoSuppression', () => ({
  readEdOrCalmSuppressed: jest.fn(() => Promise.resolve(false)),
}));

// Phase 3's RespectAllRow has its own async device-flag lifecycle
// (AsyncStorage read on mount); stubbed here so this suite's own
// assertions never race it -- `RespectAllRow.test.js` owns that
// component's behaviour.
jest.mock('../../components/community/RespectAllRow', () => () => null);

jest.mock('../../lib/community', () => ({
  loadDimension: jest.fn(),
  loadDimensionRecent: jest.fn(() => Promise.resolve({ posts: [], cursor: null })),
  gymSummary: jest.fn(() => Promise.reject(new Error('no summary in this suite'))),
  loadBoard: jest.fn(() => Promise.resolve({
    rows: [], you: null, count: 0, thresholdMet: true, cursor: null,
  })),
  metricLabel: (window, n) => (Number(n) === 1 ? '1 session' : `${Number(n) || 0} sessions`),
  reactToPost: jest.fn(() => Promise.resolve()),
  COMMUNITY_STYLE_KEYS: { strength: 'Strength' },
  PHYSIQUE_DISCIPLINE_KEYS: [
    'bodybuilding', 'mens_physique', 'classic_physique', 'womens_physique', 'figure', 'bikini', 'wellness',
  ],
  // Lead ruling: one wording across the app -- mirrors the shipped
  // TP_AGE_BANDS labels exactly (trainingProfile.js), not a second copy.
  TP_AGE_BANDS: {
    '18_24': '18 to 24', '25_34': '25 to 34', '35_44': '35 to 44', '45_54': '45 to 54', '55_plus': '55 or over',
  },
}));

jest.mock('../../lib/gyms', () => {
  const actual = jest.requireActual('../../lib/gyms');
  return {
    ...actual, get: jest.fn(), confirmSubmission: jest.fn(), report: jest.fn(),
  };
});

const {
  loadDimension, loadDimensionRecent, loadBoard, reactToPost,
} = require('../../lib/community');
const { readEdOrCalmSuppressed } = require('../../hooks/usePhotoSuppression');
const useCommunityMe = require('../../hooks/useCommunityMe').default;
const CommunityDimensionScreen = require('../CommunityDimensionScreen').default;

function texts(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(texts).join(' ');
  return texts(node.children);
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

function renderHeader(tree) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  let part = null;
  act(() => { part = create(list.props.ListHeaderComponent); });
  return part;
}

async function mount(params) {
  const navigation = { navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityDimensionScreen navigation={navigation} route={{ params }} />);
  });
  await flush();
  return { tree, navigation };
}

const EMPTY_DIMENSION = { label: 'Bodybuilding', people: [], programmes: [], count: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  loadDimension.mockResolvedValue({ ...EMPTY_DIMENSION });
  loadBoard.mockResolvedValue({ rows: [], you: null, count: 0, thresholdMet: true, cursor: null });
  loadDimensionRecent.mockResolvedValue({ posts: [], cursor: null });
  readEdOrCalmSuppressed.mockResolvedValue(false);
  useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1' }, tp_age_band: '25_34' } });
});

describe('the board roster reaches every kind now (task 6)', () => {
  test('discipline: loadBoard is called with scope discipline and the dimension key', async () => {
    loadDimension.mockResolvedValue({ label: 'Powerlifting', people: [], programmes: [], count: 6 });
    await mount({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' });

    expect(loadBoard).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'discipline', scopeKey: 'powerlifting', window: 'week',
    }));
  });

  test('age_band (shared): loadBoard is called with scope age_band and NO scope key', async () => {
    await mount({ kind: 'age_band', key: '25_34', label: '25 to 34' });

    expect(loadBoard).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'age_band', scopeKey: undefined, window: 'week',
    }));
  });

  test('style and area reach the board too', async () => {
    await mount({ kind: 'style', key: 'strength', label: 'Strength' });
    expect(loadBoard).toHaveBeenCalledWith(expect.objectContaining({ scope: 'style', scopeKey: 'strength' }));

    jest.clearAllMocks();
    loadDimension.mockResolvedValue({ ...EMPTY_DIMENSION });
    loadBoard.mockResolvedValue({ rows: [], you: null, count: 0, thresholdMet: true, cursor: null });
    await mount({ kind: 'area', key: 'leeds', label: 'Leeds' });
    expect(loadBoard).toHaveBeenCalledWith(expect.objectContaining({ scope: 'area', scopeKey: 'leeds' }));
  });

  test('"This month and consistency" opens CommunityBoard with the same scope and key', async () => {
    loadDimension.mockResolvedValue({ label: 'Powerlifting', people: [], programmes: [], count: 6 });
    const { tree, navigation } = await mount({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' });
    const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
    const item = list.props.data.find((i) => i.type === 'sectionBreak');
    let itemTree = null;
    act(() => { itemTree = create(list.props.renderItem({ item })); });
    const row = itemTree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'This month and consistency' && typeof n.props.onPress === 'function',
    )[0];
    act(() => { row.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityBoard', {
      scope: 'discipline', scopeKey: 'powerlifting', window: 'month', label: 'Powerlifting',
    });
  });
});

describe('age_band: the raw key is mapped through TP_AGE_BANDS', () => {
  test('the page title reads the mapped label, not the raw key', async () => {
    loadDimension.mockResolvedValue({ label: '25_34', people: [], programmes: [], count: 5 });
    const { tree } = await mount({ kind: 'age_band', key: '25_34', label: '25 to 34' });
    const title = tree.root.findAll((n) => n.props?.title !== undefined)[0]?.props.title
      ?? texts(tree.toJSON());
    expect(String(title)).toContain('25 to 34');
    expect(String(title)).not.toContain('25_34');
  });
});

describe('age_band: reciprocal, reachable only while the caller shares a matching band', () => {
  test('no band shared at all: the locked state, and NOTHING is read', async () => {
    useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1' }, tp_age_band: null } });
    const { tree } = await mount({ kind: 'age_band', key: '25_34', label: '25 to 34' });

    expect(texts(tree.toJSON())).toContain('Share your age group in your training profile to see people your age.');
    expect(loadDimension).not.toHaveBeenCalled();
    expect(loadBoard).not.toHaveBeenCalled();
    expect(loadDimensionRecent).not.toHaveBeenCalled();
  });

  test('a mismatched band: also locked, never another band\'s roster', async () => {
    useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1' }, tp_age_band: '35_44' } });
    const { tree } = await mount({ kind: 'age_band', key: '25_34', label: '25 to 34' });
    expect(texts(tree.toJSON())).toContain('Share your age group in your training profile to see people your age.');
  });

  test('the locked state\'s tertiary row opens Training profile', async () => {
    useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1' }, tp_age_band: null } });
    const { tree, navigation } = await mount({ kind: 'age_band', key: '25_34', label: '25 to 34' });
    const row = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Open Training profile' && typeof n.props.onPress === 'function',
    )[0];
    act(() => { row.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityTrainingProfile');
  });

  test('a matching band opens normally', async () => {
    useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1' }, tp_age_band: '25_34' } });
    const { tree } = await mount({ kind: 'age_band', key: '25_34', label: '25 to 34' });
    expect(texts(tree.toJSON())).not.toContain('Share your age group');
    expect(loadDimension).toHaveBeenCalled();
  });
});

describe('RECENT (task 6, closing the phase 1 gap)', () => {
  const POST_ROW = {
    post: {
      id: 'p1', kind: 'session', payload: { sessionName: 'Upper A', duration: 40, workingSets: 10 },
      caption: null, created_at: Date.now(), comment_count: 0,
    },
    author: { user_id: 'u2', handle: 'sam', display_name: 'Sam Rees' },
    my_reaction: false,
  };

  test('loads via loadDimensionRecent and renders as ActivityItemRow', async () => {
    loadDimensionRecent.mockResolvedValue({ posts: [POST_ROW], cursor: 'c1' });
    const { tree } = await mount({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' });

    expect(loadDimensionRecent).toHaveBeenCalledWith('discipline', 'powerlifting', expect.objectContaining({ limit: 20 }));
    const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
    const item = list.props.data.find((i) => i.type === 'recent');
    expect(item).toBeTruthy();
    let itemTree = null;
    act(() => { itemTree = create(list.props.renderItem({ item })); });
    expect(texts(itemTree.toJSON())).toContain('Upper A');
  });

  test('onEndReached pages RECENT with the server cursor', async () => {
    loadDimensionRecent.mockResolvedValueOnce({ posts: [POST_ROW], cursor: 'c1' });
    const { tree } = await mount({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' });
    let list = tree.root.findAll((n) => n.type === 'FlatList')[0];

    loadDimensionRecent.mockResolvedValueOnce({ posts: [{ ...POST_ROW, post: { ...POST_ROW.post, id: 'p2' } }], cursor: null });
    await act(async () => { await list.props.onEndReached(); });
    await flush();

    expect(loadDimensionRecent).toHaveBeenLastCalledWith('discipline', 'powerlifting', { cursor: 'c1', limit: 20 });
    list = tree.root.findAll((n) => n.type === 'FlatList')[0];
    expect(list.props.data.filter((i) => i.type === 'recent')).toHaveLength(2);
  });

  test('a Respect tap on a RECENT row calls reactToPost', async () => {
    loadDimensionRecent.mockResolvedValue({ posts: [POST_ROW], cursor: null });
    const { tree } = await mount({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' });
    const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
    const item = list.props.data.find((i) => i.type === 'recent');
    let itemTree = null;
    act(() => { itemTree = create(list.props.renderItem({ item })); });
    const respectBtn = itemTree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Give this respect' && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => { respectBtn.props.onPress(); });
    expect(reactToPost).toHaveBeenCalledWith('p1', true);
  });
});

describe('the seven physique-division pages: the Beat row and the calm-mode resting state', () => {
  test('a physique page carries the Beat signpost row', async () => {
    loadDimension.mockResolvedValue({ label: 'Bodybuilding', people: [], programmes: [], count: 4 });
    const { tree } = await mount({ kind: 'discipline', key: 'bodybuilding', label: 'Bodybuilding' });
    expect(texts(renderHeader(tree).toJSON())).toContain('Support with eating and body image: Beat');
  });

  test('a non-physique discipline page carries no Beat row', async () => {
    loadDimension.mockResolvedValue({ label: 'Powerlifting', people: [], programmes: [], count: 4 });
    const { tree } = await mount({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' });
    expect(texts(renderHeader(tree).toJSON())).not.toContain('Support with eating and body image');
  });

  test('a non-discipline kind (gym, area, style, age_band) never carries the Beat row', async () => {
    const { tree } = await mount({ kind: 'gym', key: 'gym:v1', label: 'PureGym Leeds' });
    expect(texts(renderHeader(tree).toJSON())).not.toContain('Support with eating and body image');
  });

  test('suppressed (calm mode or an open ED flag): only the header, the Beat row and the resting line', async () => {
    readEdOrCalmSuppressed.mockResolvedValue(true);

    const { tree } = await mount({ kind: 'discipline', key: 'bodybuilding', label: 'Bodybuilding' });
    const text = texts(tree.toJSON());

    expect(text).toContain('Support with eating and body image: Beat');
    expect(text).toContain('This page is resting while calm mode is on.');
    expect(text).not.toContain('TRAINED THIS WEEK');
    expect(text).not.toContain('RECENT');
    expect(text).not.toContain('This month and consistency');
  });

  // Lead ruling 2: the gate check runs BEFORE the loads, not only before
  // the render -- a suppressed physique page makes no dimension, board
  // or RECENT read at all.
  test('suppressed: readEdOrCalmSuppressed is checked for the viewer\'s own id, and NO cohort read runs', async () => {
    readEdOrCalmSuppressed.mockResolvedValue(true);
    await mount({ kind: 'discipline', key: 'bodybuilding', label: 'Bodybuilding' });

    expect(readEdOrCalmSuppressed).toHaveBeenCalledWith('u1');
    expect(loadDimension).not.toHaveBeenCalled();
    expect(loadBoard).not.toHaveBeenCalled();
    expect(loadDimensionRecent).not.toHaveBeenCalled();
  });

  test('a non-physique kind is never gated by the ED check, even when it would answer true', async () => {
    readEdOrCalmSuppressed.mockResolvedValue(true);
    loadDimension.mockResolvedValue({ label: 'Powerlifting', people: [], programmes: [], count: 4 });
    await mount({ kind: 'discipline', key: 'powerlifting', label: 'Powerlifting' });

    expect(loadDimension).toHaveBeenCalledWith('discipline', 'powerlifting', expect.any(Object));
  });

  test('not suppressed: the loads run, and the Beat row sits alongside the normal roster content', async () => {
    readEdOrCalmSuppressed.mockResolvedValue(false);
    loadDimension.mockResolvedValue({ label: 'Bodybuilding', people: [], programmes: [], count: 4 });
    const { tree } = await mount({ kind: 'discipline', key: 'bodybuilding', label: 'Bodybuilding' });
    const text = texts(renderHeader(tree).toJSON());
    expect(text).toContain('Support with eating and body image: Beat');
    expect(text).toContain('TRAINED THIS WEEK');
    expect(loadDimension).toHaveBeenCalledWith('discipline', 'bodybuilding', expect.any(Object));
    expect(loadBoard).toHaveBeenCalled();
    expect(loadDimensionRecent).toHaveBeenCalled();
  });
});
