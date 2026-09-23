/**
 * respect.js: bulk Respect (phase3 spec section 5; blueprint section 5,
 * CR-06; `22-MIGRATION-170A-CONTRACT.md` Part B `community_respect_all`).
 *
 * WHAT THIS SUITE PINS (founder order 2026-09-22, item 1, "wire the
 * pushes"): `respectAll` used to return a bare count -- the STOP comment
 * it replaced recorded that `community_respect_all` gave no way to
 * notify the people it had just given Respect to, although its own loop
 * already knew exactly who they were. migrate_177 now returns
 * `recipients`, so this pins: one `notifyCommunityEvent('reaction', ...)`
 * call per recipient, target = the recipient's user id, ref = the post
 * id, fired only AFTER the RPC resolves; nothing notified against an
 * older server's shape (`recipients` absent or empty); nothing on a
 * malformed entry; nothing on a failed call. `recipients` never carries
 * the caller -- that is a server-side guarantee (scope_members excludes
 * `p.user_id <> v_uid`, guard-proved in migrate177.guard.test.js) -- so
 * the client-side pin here is that the wrapper notifies EXACTLY the
 * array the RPC returned and never more, which is what makes that server
 * guarantee hold end to end.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    getAllKeys: jest.fn(async () => []),
    multiRemove: jest.fn(async () => {}),
  },
}));

jest.mock('../transport', () => ({ callCommunity: jest.fn() }));
jest.mock('../notify', () => ({ notifyCommunityEvent: jest.fn() }));
jest.mock('../profile', () => ({ currentUserId: jest.fn(() => 'u1') }));
jest.mock('../../dayKey', () => ({ todayLocalKey: jest.fn(() => '2026-09-10') }));

const { callCommunity } = require('../transport');
const { notifyCommunityEvent } = require('../notify');
const { respectAll } = require('../respect');

beforeEach(() => {
  jest.clearAllMocks();
});

test('calls community_respect_all with the scope, scope key and today', async () => {
  callCommunity.mockResolvedValueOnce({ given: 0, recipients: [] });
  await respectAll({ scope: 'gym', scopeKey: 'g1', today: '2026-09-10' });
  expect(callCommunity).toHaveBeenCalledWith('community_respect_all', {
    _scope: 'gym', _scope_key: 'g1', _today: '2026-09-10',
  });
});

test('falls back to todayLocalKey when today is omitted', async () => {
  callCommunity.mockResolvedValueOnce({ given: 0, recipients: [] });
  await respectAll({ scope: 'following' });
  expect(callCommunity).toHaveBeenCalledWith('community_respect_all', {
    _scope: 'following', _scope_key: null, _today: '2026-09-10',
  });
});

test('returns the given count', async () => {
  callCommunity.mockResolvedValueOnce({ given: 4, recipients: [] });
  const out = await respectAll({ scope: 'gym', scopeKey: 'g1' });
  expect(out).toEqual({ given: 4 });
});

describe('notifying (founder order 2026-09-22, item 1)', () => {
  test('notifies once per recipient, target = user_id, ref = post_id, after the RPC resolves', async () => {
    callCommunity.mockResolvedValueOnce({
      given: 2,
      recipients: [{ user_id: 'u2', post_id: 'p1' }, { user_id: 'u3', post_id: 'p2' }],
    });
    await respectAll({ scope: 'gym', scopeKey: 'g1' });
    expect(notifyCommunityEvent).toHaveBeenCalledTimes(2);
    expect(notifyCommunityEvent).toHaveBeenNthCalledWith(1, 'reaction', 'u2', 'p1');
    expect(notifyCommunityEvent).toHaveBeenNthCalledWith(2, 'reaction', 'u3', 'p2');
  });

  test('an older server with no recipients field notifies nothing', async () => {
    callCommunity.mockResolvedValueOnce({ given: 3 });
    await respectAll({ scope: 'gym', scopeKey: 'g1' });
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });

  test('an empty recipients array notifies nothing (nobody trained today, or all already respected)', async () => {
    callCommunity.mockResolvedValueOnce({ given: 0, recipients: [] });
    await respectAll({ scope: 'gym', scopeKey: 'g1' });
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });

  test('a recipient missing user_id or post_id is skipped, never notified', async () => {
    callCommunity.mockResolvedValueOnce({
      given: 1,
      recipients: [{ user_id: null, post_id: 'p1' }, { user_id: 'u2', post_id: null }],
    });
    await respectAll({ scope: 'gym', scopeKey: 'g1' });
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });

  test('a failed call notifies nothing and the rejection still propagates', async () => {
    callCommunity.mockRejectedValueOnce(Object.assign(new Error('rate_limited'), { code: 'rate_limited' }));
    await expect(respectAll({ scope: 'gym', scopeKey: 'g1' })).rejects.toMatchObject({ code: 'rate_limited' });
    expect(notifyCommunityEvent).not.toHaveBeenCalled();
  });

  // The server guarantees `recipients` never includes the caller
  // (migrate_177: scope_members excludes `p.user_id <> v_uid`, pinned in
  // migrate177.guard.test.js). This pins the other half: the client adds
  // no logic that could reintroduce the caller -- it notifies EXACTLY the
  // entries the RPC returned, no more.
  test('notifies exactly the recipients the RPC returned, nothing added and nothing dropped', async () => {
    const recipients = [{ user_id: 'u2', post_id: 'p1' }];
    callCommunity.mockResolvedValueOnce({ given: 1, recipients });
    await respectAll({ scope: 'gym', scopeKey: 'g1' });
    expect(notifyCommunityEvent).toHaveBeenCalledTimes(1);
    expect(notifyCommunityEvent).toHaveBeenCalledWith('reaction', 'u2', 'p1');
  });
});
