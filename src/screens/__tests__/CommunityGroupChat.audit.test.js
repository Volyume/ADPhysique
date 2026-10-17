/**
 * CommunityGroupChat.audit.test.js - what this suite pins (audit
 * 2026-10-17, items 6, 7, e):
 *
 *  - item 7: a poll that answers not_allowed or not_found (the person was
 *    removed) puts the screen in its removed state: no stale messages, no
 *    composer. A transient failure leaves the thread as it was;
 *  - item 6: an older page that fails keeps the cursor and says so once;
 *  - item e: a refocus after the first load reloads quietly (no skeleton).
 */

import { create, act } from 'react-test-renderer';
import { AppState } from 'react-native';

const mockToastShow = jest.fn();
const mockFocus = { cb: null };

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); mockFocus.cb = cb; React.useEffect(() => cb(), [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/community/ReportSheet', () => () => null);
jest.mock('../../lib/community', () => ({
  getGroup: jest.fn(),
  loadGroupMessages: jest.fn(),
  sendGroupMessage: jest.fn(),
  deleteGroupMessage: jest.fn(),
  markGroupRead: jest.fn(() => Promise.resolve({})),
  GROUP_MESSAGE_MAX: 1000,
  GROUP_CHAT_PAGE_SIZE: 30,
}));

import { getGroup, loadGroupMessages } from '../../lib/community';
import CommunityGroupChatScreen from '../CommunityGroupChatScreen';

const msg = (n) => ({
  id: `g${n}`, sender_id: 'u2', mine: false, body: `msg ${n}`, author: { display_name: 'Priya K' },
  created_at: new Date(Date.UTC(2026, 9, 1, 10, n)).toISOString(),
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 15; i += 1) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}

async function mount() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  let tree = null;
  await act(async () => {
    tree = create(<CommunityGroupChatScreen navigation={navigation} route={{ params: { id: 'grp1', name: 'Iron' } }} />);
  });
  await flush();
  return tree;
}

const listOf = (tree) => tree.root.findAll((n) => n.type === 'FlatList')[0];
const ids = (tree) => listOf(tree).props.data.map((m) => m.id);
const composer = (tree) => tree.root.findAll((n) => n.props?.placeholder === 'Write to the group');
const activeHandler = () => AppState.addEventListener.mock.calls.map((c) => c[1]).pop();
const refusal = (code) => Object.assign(new Error(code), { code });

beforeEach(() => {
  jest.clearAllMocks();
  getGroup.mockResolvedValue({ name: 'Iron', myRole: 'member' });
});

describe('a poll after the person was removed', () => {
  test.each(['not_allowed', 'not_found'])('%s shows the removed state, not stale messages and a composer', async (code) => {
    loadGroupMessages.mockResolvedValueOnce({ messages: [msg(2), msg(1)], cursor: null });
    const tree = await mount();
    expect(ids(tree)).toEqual(['g2', 'g1']);
    expect(composer(tree).length).toBeGreaterThan(0);

    loadGroupMessages.mockRejectedValueOnce(refusal(code));
    await act(async () => { await activeHandler()('active'); });
    await flush();
    expect(tree.root.findAll((n) => n.type === 'FlatList').length).toBe(0);
    expect(composer(tree).length).toBe(0);
    expect(JSON.stringify(tree.toJSON())).toContain('This chat is only for members of the group.');
    act(() => { tree.unmount(); });
  });

  test('a transient failure leaves the thread and the composer alone', async () => {
    loadGroupMessages.mockResolvedValueOnce({ messages: [msg(2), msg(1)], cursor: null });
    const tree = await mount();
    loadGroupMessages.mockRejectedValueOnce(refusal('offline'));
    await act(async () => { await activeHandler()('active'); });
    await flush();
    expect(ids(tree)).toEqual(['g2', 'g1']);
    expect(composer(tree).length).toBeGreaterThan(0);
    act(() => { tree.unmount(); });
  });
});

describe('an older page that fails', () => {
  test('keeps the cursor, toasts once, and a later scroll asks for the same page', async () => {
    loadGroupMessages.mockResolvedValueOnce({ messages: [msg(3), msg(2)], cursor: 'c1' });
    const tree = await mount();

    loadGroupMessages.mockRejectedValueOnce(refusal('offline'));
    await act(async () => { await listOf(tree).props.onEndReached(); });
    await flush();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Older messages could not be loaded. Try again in a moment.', { variant: 'error' },
    );

    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60000);
    loadGroupMessages.mockResolvedValueOnce({ messages: [msg(1)], cursor: null });
    await act(async () => { await listOf(tree).props.onEndReached(); });
    await flush();
    spy.mockRestore();
    expect(loadGroupMessages).toHaveBeenLastCalledWith('grp1', { cursor: 'c1', limit: 30 });
    expect(ids(tree)).toEqual(['g3', 'g2', 'g1']);
    act(() => { tree.unmount(); });
  });
});

describe('a refocus after the first load', () => {
  test('reloads quietly: the thread stays up while the read is pending', async () => {
    loadGroupMessages.mockResolvedValueOnce({ messages: [msg(2)], cursor: null });
    const tree = await mount();

    let release;
    loadGroupMessages.mockImplementationOnce(() => new Promise((r) => { release = () => r({ messages: [msg(3), msg(2)], cursor: null }); }));
    let stop;
    await act(async () => { stop = mockFocus.cb(); });
    expect(listOf(tree)).toBeTruthy();
    await act(async () => { release(); });
    await flush();
    expect(ids(tree)).toEqual(['g3', 'g2']);
    stop();
    act(() => { tree.unmount(); });
  });
});
