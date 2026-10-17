/**
 * CommunityCompose.calmConfirm.test.js - what this suite pins (founder
 * ruling 2026-10-17, "Allow, with a gentle check"): a MANUAL Community
 * post made while an ED flag is open OR calm mode is on is still allowed,
 * but the person is asked first through the house appAlert.
 *
 *  - gated (ED flag or calm: the same `sessionShareGateState` read the
 *    automatic path uses) -> the confirm shows, with the agreed copy;
 *  - "Not now" posts nothing and keeps the draft;
 *  - "Share" posts as normal;
 *  - a gate read that throws shows the same confirm (fails towards asking);
 *  - neither state -> no confirm, the post goes out.
 */

import { create, act } from 'react-test-renderer';

const mockAlert = jest.fn();
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/community/PostRow', () => () => null);
jest.mock('../../components/AppAlert', () => ({ appAlert: (...a) => mockAlert(...a) }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, units: 'metric' }),
}));
jest.mock('../../lib/community', () => ({
  loadMe: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
  createPost: jest.fn(),
  setPostNote: jest.fn(),
  listMyGroups: jest.fn(),
  buildPrPayload: jest.fn(() => ({})),
  buildSessionPayload: jest.fn(() => ({ sessionName: 'Upper A' })),
  buildBlockPayload: jest.fn(() => ({})),
  buildMilestonePayload: jest.fn(() => ({})),
  CAPTION_MAX: 280,
  sessionShareGateState: jest.fn(),
}));

const {
  loadMe, createPost, listMyGroups, sessionShareGateState,
} = require('../../lib/community');
import CommunityComposeScreen from '../CommunityComposeScreen';

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

async function mountAndPost() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  let tree = null;
  await act(async () => {
    tree = create(<CommunityComposeScreen navigation={navigation} route={{ params: { kind: 'session', workoutId: 'w1' } }} />);
  });
  await flush();
  const post = tree.root.findAll((n) => n.props?.title === 'Post' && n.props?.onPress)[0];
  await act(async () => { post.props.onPress(); });
  await flush();
  return { tree, navigation };
}

const press = async (label) => {
  const buttons = mockAlert.mock.calls[0][2];
  await act(async () => { buttons.find((b) => b.text === label).onPress(); });
  await flush();
};

beforeEach(() => {
  jest.clearAllMocks();
  loadMe.mockResolvedValue({ me: { profile: { user_id: 'u1', handle: 'rowan_lifts' } } });
  listMyGroups.mockResolvedValue([]);
  createPost.mockResolvedValue({ id: 'p1' });
});

describe.each([['an open ED flag or calm mode (gated)', { allowed: false, gated: true }]])('%s', (_name, gate) => {
  beforeEach(() => sessionShareGateState.mockResolvedValue(gate));

  test('asks first, with the agreed copy, and has not posted yet', async () => {
    await mountAndPost();
    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = mockAlert.mock.calls[0];
    expect(title).toBe('Before you share');
    expect(body).toBe('You have chosen a calmer experience for now. Would you still like to share this post?');
    expect(buttons.map((b) => b.text)).toEqual(['Not now', 'Share']);
    expect(buttons[0].style).toBe('cancel');
    expect(createPost).not.toHaveBeenCalled();
  });

  test('Not now posts nothing and keeps the screen (the draft)', async () => {
    const { navigation } = await mountAndPost();
    await press('Not now');
    expect(createPost).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('Share posts as normal', async () => {
    const { navigation } = await mountAndPost();
    await press('Share');
    expect(createPost).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith('CommunityPost', { id: 'p1' });
  });
});

test('a gate read that throws shows the same confirm (fails towards asking)', async () => {
  sessionShareGateState.mockRejectedValue(new Error('unreadable'));
  await mountAndPost();
  expect(mockAlert).toHaveBeenCalledTimes(1);
  expect(mockAlert.mock.calls[0][0]).toBe('Before you share');
  expect(createPost).not.toHaveBeenCalled();
});

test('neither state: no confirm, the post goes out', async () => {
  sessionShareGateState.mockResolvedValue({ allowed: true, gated: false });
  const { navigation } = await mountAndPost();
  expect(mockAlert).not.toHaveBeenCalled();
  expect(createPost).toHaveBeenCalledTimes(1);
  expect(navigation.replace).toHaveBeenCalledWith('CommunityPost', { id: 'p1' });
});
