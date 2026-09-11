/**
 * profile.bodyProfilePush.test.js - D159 (migrate_174): the server's
 * under-18 check reads the CLOUD copy of the body profile row and fails
 * closed, so every Community profile write pushes that row first.
 *
 * What this suite pins: `ensureBodyProfilePushed` pushes once per account
 * per app session unless forced, reports the push's own truth, and never
 * throws; `upsertProfile` and `acceptRules` both push BEFORE their RPC; a
 * CREATE (no cached profile) is refused with `unavailable` when the push
 * failed, because a profile created without the cloud row is stored
 * followers-only and the server's merge re-supplies that stored value on
 * every later write (hostile review OJ-REV-SQL-2, F3); an EDIT (a cached
 * profile) and a re-consent still run on a failed push, because the row is
 * already on the cloud and every hub open recomputes the check.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({ handle: 'rowan_lifts' })), CommunityError };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}),
}));
jest.mock('../../database', () => ({ db: jest.fn(async () => null) }));
jest.mock('../../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../../sync', () => ({ pushUserBodyProfileNow: jest.fn(async () => true) }));
// The signed-in id is per test: `ensureBodyProfilePushed` remembers a
// successful push per account for the session, so each test that needs a
// fresh memory uses its own account.
let mockUid = 'u1';
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: mockUid } }) },
}));

const { callCommunity } = require('../transport');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const { pushUserBodyProfileNow } = require('../../sync');
const { ensureBodyProfilePushed, upsertProfile, acceptRules } = require('../profile');

let seq = 0;
beforeEach(() => {
  jest.clearAllMocks();
  pushUserBodyProfileNow.mockResolvedValue(true);
  seq += 1;
  mockUid = `u-${seq}`;
});

describe('ensureBodyProfilePushed', () => {
  test('pushes the caller\'s own row, then remembers it for the session unless forced', async () => {
    expect(await ensureBodyProfilePushed('u-once')).toBe(true);
    expect(pushUserBodyProfileNow).toHaveBeenCalledWith('u-once', 'u-once');
    expect(await ensureBodyProfilePushed('u-once')).toBe(true);
    expect(pushUserBodyProfileNow).toHaveBeenCalledTimes(1);
    expect(await ensureBodyProfilePushed('u-once', { force: true })).toBe(true);
    expect(pushUserBodyProfileNow).toHaveBeenCalledTimes(2);
  });

  test('a failed push is reported and not remembered, so the next write tries again', async () => {
    pushUserBodyProfileNow.mockResolvedValue(false);
    expect(await ensureBodyProfilePushed('u-fail')).toBe(false);
    expect(await ensureBodyProfilePushed('u-fail')).toBe(false);
    expect(pushUserBodyProfileNow).toHaveBeenCalledTimes(2);
  });

  test('a throwing push is swallowed, and no uid pushes nothing', async () => {
    pushUserBodyProfileNow.mockRejectedValue(new Error('boom'));
    expect(await ensureBodyProfilePushed('u-throw')).toBe(false);
    expect(await ensureBodyProfilePushed(null)).toBe(false);
    expect(pushUserBodyProfileNow).toHaveBeenCalledTimes(1);
  });
});

describe('every profile write pushes first', () => {
  test('upsertProfile pushes before its RPC', async () => {
    const order = [];
    pushUserBodyProfileNow.mockImplementation(async () => { order.push('push'); return true; });
    callCommunity.mockImplementation(async () => { order.push('rpc'); return { handle: 'rowan_lifts' }; });
    await upsertProfile({ display_name: 'Rowan' });
    expect(order).toEqual(['push', 'rpc']);
    expect(callCommunity).toHaveBeenCalledWith('community_upsert_profile', expect.objectContaining({ _p: expect.objectContaining({ display_name: 'Rowan' }) }));
  });

  test('a CREATE with a failed push is refused as unavailable, and the RPC never runs', async () => {
    pushUserBodyProfileNow.mockResolvedValue(false);
    AsyncStorage.getItem.mockResolvedValue(null); // no cached me: no profile yet
    await expect(upsertProfile({ handle: 'rowan_lifts', display_name: 'Rowan', visibility: 'public' }))
      .rejects.toMatchObject({ code: 'unavailable' });
    expect(callCommunity).not.toHaveBeenCalled();
  });

  test('an EDIT with a failed push still runs: the row is already on the cloud', async () => {
    pushUserBodyProfileNow.mockResolvedValue(false);
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ profile: { handle: 'rowan_lifts' } }));
    await upsertProfile({ display_name: 'Rowan R' });
    expect(callCommunity).toHaveBeenCalledWith('community_upsert_profile', expect.objectContaining({ _p: expect.objectContaining({ display_name: 'Rowan R' }) }));
  });

  test('a re-consent with a failed push still runs', async () => {
    pushUserBodyProfileNow.mockResolvedValue(false);
    AsyncStorage.getItem.mockResolvedValue(null);
    await acceptRules();
    expect(callCommunity).toHaveBeenCalledWith('community_upsert_profile', { _p: { accept_rules_version: expect.any(Number) } });
  });

  test('acceptRules pushes before its RPC too', async () => {
    const order = [];
    pushUserBodyProfileNow.mockImplementation(async () => { order.push('push'); return true; });
    callCommunity.mockImplementation(async () => { order.push('rpc'); return { handle: 'rowan_lifts' }; });
    await acceptRules();
    expect(order[0]).toBe('push');
    expect(order).toContain('rpc');
  });
});
