/**
 * profile.notify.test.js - founder order 2026-09-22, item 1 ("wire the
 * pushes"; audit A-adoption-visibility-look-copy.md A-01/Q5,
 * B-functionality-backend-safety-engineering.md B-01).
 *
 * What this suite pins:
 *  - follow() reads community_follow's own returned `state` to choose
 *    the push kind -- 'follow_request' for a followers-only target,
 *    'follow' for an immediate one -- never guessed from the input
 *    alone (the server alone decides which happened, SD-05);
 *  - respondToFollow() notifies follow_accepted, target = the requester,
 *    only on a genuine accept (the RPC's own state comes back
 *    'accepted'); a decline never notifies;
 *  - unfollow() and removeFollower() never notify, matching the eleven-
 *    action contract ("never on unfollow, remove follower or decline");
 *  - a failed RPC never notifies: the throw happens before the notify
 *    line is ever reached.
 */

jest.mock('../transport', () => ({ callCommunity: jest.fn(), CommunityError: class extends Error {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}),
}));
jest.mock('../../database', () => ({ db: jest.fn(async () => null) }));
jest.mock('../../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'me1' } }) },
}));
// The real notify.js reaches for invokeCommunityFunction, which the
// transport mock above does not export; mocked here so the assertions
// below are about WHAT profile.js sends it, not about the transport.
jest.mock('../notify', () => ({ notifyCommunityEvent: jest.fn() }));

const { callCommunity } = require('../transport');
const { notifyCommunityEvent } = require('../notify');
const { follow, unfollow, respondToFollow, removeFollower } = require('../profile');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('follow: the push kind comes from the server state, never guessed', () => {
  test('an immediate follow (public profile, state "accepted") notifies "follow"', async () => {
    callCommunity.mockResolvedValue({ state: 'accepted' });
    await follow('u2');
    expect(callCommunity).toHaveBeenCalledWith('community_follow', { _target: 'u2' });
    expect(notifyCommunityEvent).toHaveBeenCalledTimes(1);
    expect(notifyCommunityEvent).toHaveBeenCalledWith('follow', 'u2', 'me1');
  });

  test('a followers-only target (state "requested") notifies "follow_request" instead', async () => {
    callCommunity.mockResolvedValue({ state: 'requested' });
    await follow('u2');
    expect(notifyCommunityEvent).toHaveBeenCalledWith('follow_request', 'u2', 'me1');
  });

  test('a refused follow never notifies', async () => {
    callCommunity.mockRejectedValue(Object.assign(new Error('blocked'), { code: 'blocked' }));
    await expect(follow('u2')).rejects.toMatchObject({ code: 'blocked' });
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });
});

describe('unfollow and removeFollower never notify', () => {
  test('unfollow', async () => {
    callCommunity.mockResolvedValue({ ok: true });
    await unfollow('u2');
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });

  test('removeFollower', async () => {
    callCommunity.mockResolvedValue({ ok: true });
    await removeFollower('u2');
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });
});

describe('respondToFollow: only a genuine accept notifies the requester', () => {
  test('accepting notifies follow_accepted, target = the requester', async () => {
    callCommunity.mockResolvedValue({ state: 'accepted' });
    await respondToFollow('u3', true);
    expect(callCommunity).toHaveBeenCalledWith('community_respond_follow', { _requester: 'u3', _accept: true });
    expect(notifyCommunityEvent).toHaveBeenCalledTimes(1);
    expect(notifyCommunityEvent).toHaveBeenCalledWith('follow_accepted', 'u3', 'me1');
  });

  test('declining never notifies', async () => {
    callCommunity.mockResolvedValue({ state: 'none' });
    await respondToFollow('u3', false);
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });

  test('a failed respond never notifies', async () => {
    callCommunity.mockRejectedValue(Object.assign(new Error('not_found'), { code: 'not_found' }));
    await expect(respondToFollow('u3', true)).rejects.toMatchObject({ code: 'not_found' });
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });
});
