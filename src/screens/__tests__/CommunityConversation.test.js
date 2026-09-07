/**
 * CommunityConversationScreen — one conversation (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 2;
 * SD-21, SD-31, SD-32).
 *
 * What this suite pins:
 *  - a send carries the person's own words and the ONE context reference
 *    the screen was opened with, and nothing else;
 *  - the composer cannot write past MESSAGE_MAX, and the count appears
 *    only near the ceiling;
 *  - the placeholder is `placeholderFor(ref)`, a prompt and never a
 *    draft (nothing is pre-written on anyone's behalf);
 *  - every refusal that belongs to the server is SPOKEN, with the route
 *    that fixes it: `not_connected` offers Connect, `minor_restricted`
 *    says the rule calmly and offers nothing (SD-32), `rules_outdated`
 *    goes to the rules to be accepted;
 *  - a closed conversation keeps its history and loses its composer, and
 *    a blocked one is simply not there.
 *
 * The client library is mocked at its barrel: this is about what the
 * screen does with an answer, not about the RPC.
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
  listConversations, listMessages, sendMessage, markRead, getProfile,
} from '../../lib/community';
import CommunityConversationScreen from '../CommunityConversationScreen';

const OTHER = {
  user_id: 'u2', handle: 'priya_kb', display_name: 'Priya K', connection: 'connected',
};

const MESSAGE = {
  id: 'm1',
  conversation_id: 'conv-1',
  sender_id: 'u2',
  mine: false,
  body: 'The Tuesday session was heavy.',
  ref_kind: null,
  ref: null,
  created_at: Date.now(),
};

function refusal(code) {
  return Object.assign(new Error(code), { code });
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

function field(tree) {
  return tree.root.findAll((n) => n.type === 'TextInput')[0];
}

async function type(tree, value) {
  await act(async () => { field(tree).props.onChangeText(value); });
}

async function press(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  await act(async () => { await node.props.onPress(); });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  listConversations.mockResolvedValue({ conversations: [], cursor: null });
  listMessages.mockResolvedValue({ messages: [], cursor: null });
  sendMessage.mockResolvedValue({ conversation_id: 'conv-1', message: null });
  markRead.mockResolvedValue({});
  getProfile.mockResolvedValue({ card: OTHER });
});

describe('opening a conversation', () => {
  test('resolves the thread it was handed by id and marks it read', async () => {
    listConversations.mockResolvedValue({
      conversations: [{
        id: 'conv-1', other: OTHER, unread: 2, preview: 'The Tuesday session was heavy.',
        last_message_at: Date.now(),
      }],
      cursor: null,
    });
    listMessages.mockResolvedValue({ messages: [MESSAGE], cursor: null });

    const { tree } = await mount({ id: 'conv-1' });

    expect(listMessages).toHaveBeenCalledWith('conv-1', { limit: 30 });
    expect(markRead).toHaveBeenCalledWith('conv-1');
    // The header carries the other person, name and handle.
    expect(texts(tree)).toContain('Priya K');
    expect(texts(tree)).toContain('@priya_kb');
    act(() => { tree.unmount(); });
  });

  test('resolves by person when there is no thread yet, and offers the composer', async () => {
    const { tree } = await mount({ userId: 'u2' });

    expect(getProfile).toHaveBeenCalledWith({ userId: 'u2' });
    expect(listMessages).not.toHaveBeenCalled();
    expect(field(tree)).toBeTruthy();
    act(() => { tree.unmount(); });
  });
});

describe('sending a message', () => {
  test('sends the body and the one context reference it was opened with', async () => {
    const { tree } = await mount({ userId: 'u2', ref: { kind: 'post', id: 'post-1' } });

    await type(tree, '  How are the pull days going?  ');
    await press(tree, 'Send message');

    expect(sendMessage).toHaveBeenCalledWith('u2', 'How are the pull days going?', {
      refKind: 'post', refId: 'post-1',
    });
    act(() => { tree.unmount(); });
  });

  test('the placeholder is the prompt for the surface it was opened from', async () => {
    const post = await mount({ userId: 'u2', ref: { kind: 'post', id: 'post-1' } });
    expect(field(post.tree).props.placeholder).toBe('Say something about this session');
    act(() => { post.tree.unmount(); });

    const plain = await mount({ userId: 'u2' });
    expect(field(plain.tree).props.placeholder).toBe('Write a message');
    // A prompt, never a draft: the field itself is empty.
    expect(field(plain.tree).props.value).toBe('');
    act(() => { plain.tree.unmount(); });
  });

  // Spec 1.3: whether the ref has been sent is about THIS OPENING of the
  // screen, never about how many messages the conversation already has --
  // `refSent` must not derive from row count.
  test('a ref attaches on the first send even into an EXISTING conversation with history', async () => {
    listConversations.mockResolvedValue({
      conversations: [{
        id: 'conv-1', other: OTHER, unread: 0, preview: 'x', last_message_at: Date.now(),
      }],
      cursor: null,
    });
    listMessages.mockResolvedValue({ messages: [MESSAGE], cursor: null });

    const { tree } = await mount({ id: 'conv-1', userId: 'u2', ref: { kind: 'post', id: 'post-1' } });

    // The placeholder follows the same condition as the attach itself,
    // not the row count either.
    expect(field(tree).props.placeholder).toBe('Say something about this session');

    await type(tree, 'How is week 3 going?');
    await press(tree, 'Send message');

    expect(sendMessage).toHaveBeenCalledWith('u2', 'How is week 3 going?', {
      refKind: 'post', refId: 'post-1',
    });
    act(() => { tree.unmount(); });
  });

  test('a second send in the same opening does not re-attach the ref', async () => {
    const { tree } = await mount({ userId: 'u2', ref: { kind: 'post', id: 'post-1' } });

    await type(tree, 'First message');
    await press(tree, 'Send message');
    sendMessage.mockClear();

    await type(tree, 'Second message');
    await press(tree, 'Send message');

    expect(sendMessage).toHaveBeenCalledWith('u2', 'Second message', {});
    act(() => { tree.unmount(); });
  });

  test('the composer stops at MESSAGE_MAX and counts only near the ceiling', async () => {
    const { tree } = await mount({ userId: 'u2' });

    expect(field(tree).props.maxLength).toBe(1000);

    await type(tree, 'a'.repeat(880));
    expect(texts(tree)).not.toContain('of 1000');

    await type(tree, 'a'.repeat(1200));
    expect(field(tree).props.value).toHaveLength(1000);
    expect(texts(tree)).toContain('1000 of 1000');
    act(() => { tree.unmount(); });
  });
});

describe('the refusals that belong to the server', () => {
  test('not_connected says so, and offers the route that fixes it', async () => {
    sendMessage.mockRejectedValue(refusal('not_connected'));
    const { tree, navigation } = await mount({ userId: 'u2' });

    await type(tree, 'Hello');
    await press(tree, 'Send message');

    expect(texts(tree)).toContain('You need to be connected to message');
    await press(tree, 'Open @priya_kb to connect');
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityProfile', {
      userId: 'u2', handle: 'priya_kb',
    });
    act(() => { tree.unmount(); });
  });

  test('minor_restricted says the rule calmly and offers nothing else (SD-32)', async () => {
    sendMessage.mockRejectedValue(refusal('minor_restricted'));
    const { tree } = await mount({ userId: 'u2' });

    await type(tree, 'Hello');
    await press(tree, 'Send message');

    expect(texts(tree)).toContain('Messages are available to people aged 18 and over.');
    // The composer is gone: trying again cannot fix this one.
    expect(field(tree)).toBeUndefined();
    act(() => { tree.unmount(); });
  });

  test('rules_outdated goes to the rules to be accepted, and comes back here', async () => {
    sendMessage.mockRejectedValue(refusal('rules_outdated'));
    const { tree, navigation } = await mount({ userId: 'u2' });

    await type(tree, 'Hello');
    await press(tree, 'Send message');

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityRules', expect.objectContaining({
      accept: true,
      next: expect.objectContaining({ screen: 'CommunityConversation' }),
    }));
    // The words stay in the field, so the person sends the same message
    // again rather than writing it twice.
    expect(field(tree).props.value).toBe('Hello');
    act(() => { tree.unmount(); });
  });
});

describe('a conversation that can no longer take a message', () => {
  test('closed: the history stays, the composer goes, and it says so', async () => {
    // A closed conversation is not listed by `community_conversations`,
    // which is exactly what removing a connection and blocking promised.
    listConversations.mockResolvedValue({ conversations: [], cursor: null });
    listMessages.mockResolvedValue({ messages: [MESSAGE], cursor: null });

    const { tree } = await mount({ id: 'conv-1' });

    expect(texts(tree)).toContain('This conversation has ended.');
    expect(field(tree)).toBeUndefined();
    act(() => { tree.unmount(); });
  });

  test('blocked: the thread is simply not there', async () => {
    listMessages.mockRejectedValue(refusal('not_found'));

    const { tree } = await mount({ id: 'conv-1' });

    expect(texts(tree)).toContain('This conversation is no longer here.');
    expect(field(tree)).toBeUndefined();
    act(() => { tree.unmount(); });
  });
});
