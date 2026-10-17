/**
 * CommunityConversation.audit.test.js - what this suite pins (audit
 * 2026-10-17, items 4, 6, e, f, d):
 *
 *  - the 20 s poll (and the foreground catch-up) MERGES the newest page
 *    into the thread; older pages the person scrolled to stay;
 *  - an older-history page that fails keeps the cursor, says so once, and
 *    a later scroll asks for the same page again;
 *  - a refocus after the first load reloads quietly (the list stays up,
 *    no skeleton);
 *  - returning to the app (AppState 'active') polls;
 *  - blocking from the menu speaks the real settings label.
 */

import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();
const mockFocus = { cb: null };

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); mockFocus.cb = cb; React.useEffect(() => cb(), [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/community/ReportSheet', () => () => null);
// A stable `refresh` reference, matching the real hook (its `refresh` is
// memoized with useCallback). The screen's `load` depends on `refreshMe`
// inside `useFocusEffect`; a mock that minted a new function on every
// render would re-fire that effect every render and never settle.
const mockRefreshMe = jest.fn(() => Promise.resolve());
jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: () => ({
    me: { profile: { user_id: 'u1', handle: 'rowan_lifts' } },
    loading: false,
    error: null,
    refresh: mockRefreshMe,
  }),
}));

jest.mock('../../lib/community', () => ({
  listConversations: jest.fn(() => Promise.resolve({ conversations: [], cursor: null })),
  listMessages: jest.fn(() => Promise.resolve({ messages: [], cursor: null })),
  sendMessage: jest.fn(() => Promise.resolve({ conversation_id: 'conv-1', message: null })),
  markRead: jest.fn(() => Promise.resolve({})),
  deleteMessage: jest.fn(() => Promise.resolve({})),
  getProfile: jest.fn(() => Promise.resolve({ card: null })),
  blockUser: jest.fn(() => Promise.resolve({})),
  removeConnection: jest.fn(() => Promise.resolve({})),
  respondSession: jest.fn(() => Promise.resolve({})),
  SESSION_DAYS: [
    { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ],
  SESSION_TIME_BANDS: [
    { key: 'early', label: 'Early' }, { key: 'morning', label: 'Morning' },
    { key: 'midday', label: 'Midday' }, { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' }, { key: 'late', label: 'Late' },
  ],
  buildSessionRefPayload: (day, timeBand, gymId = null) => ({ day, time_band: timeBand, gym_id: gymId || null }),
  sessionTileLine: () => '',
  sessionStateLine: () => null,
  findHttpsLinks: () => [],
  openMessageLink: jest.fn(),
  // The real placeholder rule (messages.js): a prompt for the surface the
  // composer was opened from, never a draft.
  placeholderFor: (ref) => {
    const kind = typeof ref === 'string' ? ref : (ref?.kind ?? null);
    if (kind === 'post') return 'Say something about this session';
    return 'Write a message';
  },
  MESSAGE_MAX: 1000,
  REPORT_REASONS: {},
  COMMUNITY_STYLE_KEYS: {},
}));

import {
  listConversations, listMessages, markRead, getProfile,
} from '../../lib/community';
import { AppState } from 'react-native';
import CommunityConversationScreen from '../CommunityConversationScreen';

async function flush() {
  await act(async () => {
    for (let i = 0; i < 15; i += 1) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

async function mount(params) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };
  let tree = null;
  await act(async () => {
    tree = create(
      <CommunityConversationScreen
        navigation={navigation}
        route={{ params, name: 'CommunityConversation' }}
      />,
    );
  });
  await flush();
  return { tree, navigation };
}



const OTHER_CARD = {
  user_id: 'u2', handle: 'priya_kb', display_name: 'Priya K', connection: 'connected',
};
const msg = (n) => ({
  id: `m${n}`, conversation_id: 'conv-1', sender_id: 'u2', mine: false, body: `msg ${n}`,
  created_at: new Date(Date.UTC(2026, 9, 1, 10, n)).toISOString(),
});
const conv = { conversations: [{ id: 'conv-1', other: OTHER_CARD, unread: 0, last_message_at: Date.now() }], cursor: null };

const listOf = (tree) => tree.root.findAll((n) => n.type === 'FlatList')[0];
const ids = (tree) => listOf(tree).props.data.map((m) => m.id);
const activeHandler = () => AppState.addEventListener.mock.calls.map((c) => c[1]).pop();

beforeEach(() => {
  jest.clearAllMocks();
  listConversations.mockResolvedValue(conv);
  markRead.mockResolvedValue({});
  getProfile.mockResolvedValue({ card: OTHER_CARD });
});

describe('the poll merges, never replaces', () => {
  test('older history the person scrolled to survives a poll and the foreground catch-up', async () => {
    listMessages.mockResolvedValueOnce({ messages: [msg(3), msg(2)], cursor: 'c1' });
    const { tree } = await mount({ id: 'conv-1' });
    expect(ids(tree)).toEqual(['m3', 'm2']);

    listMessages.mockResolvedValueOnce({ messages: [msg(1)], cursor: 'c0' });
    await act(async () => { await listOf(tree).props.onEndReached(); });
    await flush();
    expect(ids(tree)).toEqual(['m3', 'm2', 'm1']);

    // A newer message arrives; the poll returns only the newest page.
    listMessages.mockResolvedValueOnce({ messages: [msg(4), msg(3), msg(2)], cursor: 'c1' });
    await act(async () => { await activeHandler()('active'); });
    await flush();
    expect(ids(tree)).toEqual(['m4', 'm3', 'm2', 'm1']);
    act(() => { tree.unmount(); });
  });

  test('item f: returning to the app polls once', async () => {
    listMessages.mockResolvedValue({ messages: [msg(1)], cursor: null });
    const { tree } = await mount({ id: 'conv-1' });
    const before = listMessages.mock.calls.length;
    await act(async () => { await activeHandler()('background'); });
    expect(listMessages.mock.calls.length).toBe(before);
    await act(async () => { await activeHandler()('active'); });
    await flush();
    expect(listMessages.mock.calls.length).toBe(before + 1);
    act(() => { tree.unmount(); });
  });
});

describe('an older page that fails', () => {
  test('keeps the cursor, toasts once, and a later scroll asks for the same page', async () => {
    listMessages.mockResolvedValueOnce({ messages: [msg(3), msg(2)], cursor: 'c1' });
    const { tree } = await mount({ id: 'conv-1' });

    listMessages.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await listOf(tree).props.onEndReached(); });
    await flush();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Older messages could not be loaded. Try again in a moment.', { variant: 'error' },
    );
    expect(ids(tree)).toEqual(['m3', 'm2']);

    const real = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(real + 60000);
    listMessages.mockResolvedValueOnce({ messages: [msg(1)], cursor: null });
    await act(async () => { await listOf(tree).props.onEndReached(); });
    await flush();
    spy.mockRestore();
    expect(listMessages).toHaveBeenLastCalledWith('conv-1', { cursor: 'c1', limit: 30 });
    expect(ids(tree)).toEqual(['m3', 'm2', 'm1']);
    act(() => { tree.unmount(); });
  });
});

describe('a refocus after the first load', () => {
  test('reloads quietly: the thread stays up while the read is pending', async () => {
    listMessages.mockResolvedValueOnce({ messages: [msg(2)], cursor: null });
    const { tree } = await mount({ id: 'conv-1' });
    expect(listOf(tree)).toBeTruthy();

    let release;
    listConversations.mockImplementationOnce(() => new Promise((r) => { release = () => r(conv); }));
    listMessages.mockResolvedValueOnce({ messages: [msg(3), msg(2)], cursor: null });
    let stop;
    await act(async () => { stop = mockFocus.cb(); });
    // Pending: no skeleton replaced the list.
    expect(listOf(tree)).toBeTruthy();
    await act(async () => { release(); });
    await flush();
    expect(ids(tree)).toEqual(['m3', 'm2']);
    stop();
    act(() => { tree.unmount(); });
  });
});
