/**
 * CommunityConversationsScreen — the Messages list (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 2
 * and 10; SD-21, SD-31).
 *
 * What this suite pins:
 *  - a row says who, what was last said and when, with the unseen dot,
 *    and a DAY rather than a clock time (SD-31: a conversation list that
 *    reports "14:07" tells one person when another was on their phone);
 *  - the empty state does not sell messaging, it says who you can
 *    message and sends you to Find people, which is where a connection
 *    actually starts;
 *  - the list pages on the server's own cursor, never a rebuilt one;
 *  - opening a row clears its unread state.
 *
 * FlashList is mocked as a passthrough (E8 harness), so items live in
 * the list's props and are rendered here through `renderItem` exactly as
 * the list would.
 */

import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: () => ({
    me: { profile: { user_id: 'u1', handle: 'rowan_lifts' } },
    loading: false,
    error: null,
    refresh: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('../../lib/community', () => ({
  listConversations: jest.fn(() => Promise.resolve({ conversations: [], cursor: null })),
  markRead: jest.fn(() => Promise.resolve({})),
}));

import { listConversations, markRead } from '../../lib/community';
import CommunityConversationsScreen from '../CommunityConversationsScreen';

const DAY = 24 * 60 * 60 * 1000;

function conversation(over) {
  return {
    id: 'conv-1',
    other: { user_id: 'u2', handle: 'priya_kb', display_name: 'Priya K' },
    unread: 2,
    preview: 'The Tuesday session was heavy.\nSecond line never shows.',
    last_message_at: Date.now() - DAY,
    ...over,
  };
}

function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out.join(' | ');
}

/** The unseen dot, found by its shape rather than its colour so a token
 * change does not fail this for the wrong reason. */
function hasUnseenDot(rendered) {
  let found = false;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const raw = node.props?.style;
    const style = Array.isArray(raw) ? Object.assign({}, ...raw.filter(Boolean)) : (raw ?? {});
    if (style.width === 8 && style.height === 8) found = true;
    (node.children ?? []).forEach(walk);
  };
  walk(rendered.toJSON());
  return found;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 15; i += 1) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

async function mount() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };
  let tree = null;
  await act(async () => {
    tree = create(
      <CommunityConversationsScreen
        navigation={navigation}
        route={{ params: {}, name: 'CommunityConversations' }}
      />,
    );
  });
  await flush();
  return { tree, navigation };
}

function list(tree) {
  return tree.root.findAll((n) => n.type === 'FlatList')[0];
}

function renderPart(element) {
  let rendered = null;
  act(() => { rendered = create(element); });
  return rendered;
}

beforeEach(() => {
  jest.clearAllMocks();
  listConversations.mockResolvedValue({ conversations: [], cursor: null });
  markRead.mockResolvedValue({});
});

describe('the list', () => {
  test('a row carries the person, the last line, the day and the unseen dot', async () => {
    listConversations.mockResolvedValue({ conversations: [conversation()], cursor: null });
    const { tree } = await mount();

    const row = renderPart(list(tree).props.renderItem({ item: conversation(), index: 0 }));
    const line = texts(row);

    expect(line).toContain('Priya K');
    expect(line).toContain('@priya_kb');
    expect(line).toContain('The Tuesday session was heavy.');
    // Only the first line of the last message, and a day, never a time.
    expect(line).not.toContain('Second line never shows.');
    expect(line).toContain('Yesterday');
    expect(hasUnseenDot(row)).toBe(true);

    act(() => { row.unmount(); tree.unmount(); });
  });

  test('a read conversation carries no dot', async () => {
    const { tree } = await mount();
    const row = renderPart(list(tree).props.renderItem({
      item: conversation({ unread: 0 }), index: 0,
    }));

    expect(hasUnseenDot(row)).toBe(false);
    act(() => { row.unmount(); tree.unmount(); });
  });

  test('opening a row clears its unread state and goes to the conversation', async () => {
    listConversations.mockResolvedValue({ conversations: [conversation()], cursor: null });
    const { tree, navigation } = await mount();

    const row = renderPart(list(tree).props.renderItem({ item: conversation(), index: 0 }));
    const card = row.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string'
        && n.props.accessibilityLabel.startsWith('Conversation with')
        && typeof n.props?.onPress === 'function',
    )[0];
    await act(async () => { card.props.onPress(); });
    await flush();

    expect(markRead).toHaveBeenCalledWith('conv-1');
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityConversation', { id: 'conv-1' });
    act(() => { row.unmount(); tree.unmount(); });
  });
});

describe('an empty list', () => {
  test('says who you can message, and sends you where a connection starts', async () => {
    const { tree, navigation } = await mount();
    const empty = renderPart(list(tree).props.ListEmptyComponent);
    const line = texts(empty);

    expect(line).toContain('No messages yet');
    expect(line).toContain('Messages are between people you are connected with. Connect with someone from Find people first.');

    const action = empty.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Find people to connect with'
        && typeof n.props?.onPress === 'function',
    )[0];
    await act(async () => { action.props.onPress(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityFindPeople');
    act(() => { empty.unmount(); tree.unmount(); });
  });
});

describe('paging', () => {
  test('the next page is asked for with the server cursor and appended', async () => {
    listConversations.mockResolvedValueOnce({
      conversations: [conversation()], cursor: 'ts|conv-1',
    });
    const { tree } = await mount();
    expect(list(tree).props.data).toHaveLength(1);

    listConversations.mockResolvedValueOnce({
      conversations: [conversation({ id: 'conv-2' })], cursor: null,
    });
    await act(async () => { list(tree).props.onEndReached(); });
    await flush();

    expect(listConversations).toHaveBeenLastCalledWith({ cursor: 'ts|conv-1', limit: 30 });
    expect(list(tree).props.data).toHaveLength(2);
    act(() => { tree.unmount(); });
  });
});
