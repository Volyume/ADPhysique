/**
 * profile.moderatedStatus.test.js — what this suite pins (community
 * product audit `40-GAP-CLOSURE.md` §1, "Moderated-person notice" and
 * "Quiet hours" BUILD rows):
 *
 *  - `myStatus()` never throws: a failed read returns the neutral
 *    `{status: null, ...}` shape, same posture as the rest of `me`;
 *  - `isModeratedStatus` is true only for 'restricted'/'suspended';
 *  - `setCommunityQuietHours` takes the RPC's own parameter names.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}),
}));
jest.mock('../../database', () => ({ db: jest.fn(async () => null) }));
jest.mock('../../supabase', () => ({ getSupabaseClient: () => null }));

const { callCommunity } = require('../transport');
const { myStatus, isModeratedStatus, setCommunityQuietHours } = require('../profile');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('myStatus', () => {
  test('an untouched profile reads active with no reason', async () => {
    callCommunity.mockResolvedValue({ status: 'active', reason_class: null, since: '2026-01-01' });
    expect(await myStatus()).toEqual({ status: 'active', reason_class: null, since: '2026-01-01' });
  });

  test('a restricted profile carries its reason class', async () => {
    callCommunity.mockResolvedValue({ status: 'restricted', reason_class: 'harassment', since: '2026-01-01' });
    expect(await myStatus()).toEqual({ status: 'restricted', reason_class: 'harassment', since: '2026-01-01' });
  });

  test('a failed read answers the neutral shape, never throws', async () => {
    callCommunity.mockRejectedValue(new Error('unavailable'));
    await expect(myStatus()).resolves.toEqual({ status: null, reason_class: null, since: null });
  });
});

describe('isModeratedStatus', () => {
  test('restricted and suspended are moderated; active and null are not', () => {
    expect(isModeratedStatus('restricted')).toBe(true);
    expect(isModeratedStatus('suspended')).toBe(true);
    expect(isModeratedStatus('active')).toBe(false);
    expect(isModeratedStatus(null)).toBe(false);
  });
});

describe('setCommunityQuietHours', () => {
  test('takes the RPC parameter names', async () => {
    callCommunity.mockResolvedValue({ quiet_start: 1320, quiet_end: 420, tz: 'Europe/London' });
    const out = await setCommunityQuietHours(1320, 420, 'Europe/London');
    expect(callCommunity).toHaveBeenCalledWith('community_set_quiet_hours', {
      _start: 1320, _end: 420, _tz: 'Europe/London',
    });
    expect(out).toEqual({ quiet_start: 1320, quiet_end: 420, tz: 'Europe/London' });
  });

  test('null/null clears the window', async () => {
    await setCommunityQuietHours(null, null, 'Europe/London');
    expect(callCommunity).toHaveBeenCalledWith('community_set_quiet_hours', {
      _start: null, _end: null, _tz: 'Europe/London',
    });
  });
});
