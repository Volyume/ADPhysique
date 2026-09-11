/**
 * profile.suggestHandle.test.js - communities revamp 2026-09-10,
 * `docs/communities-revamp-2026-09-10/25-ONBOARDING-COMMUNITY-SPEC.md`
 * section 4.2, as ruled under D159 Q2: `suggestHandle(hint)` calls
 * `community_handle_suggestion` with its ONE declared parameter, `_hint`
 * (the name typed at onboarding, passed by the onboarding step alone;
 * null everywhere else), and returns `{handle, source}` or throws the
 * CommunityError the transport maps.
 *
 * What this suite pins: the RPC name; that the call always carries the
 * `{ _hint }` object literal (so `community.transport.guard.test.js`'s
 * "every argument the client sends is a declared parameter" check sees
 * it); that the hint is trimmed, capped and null when empty; the
 * pass-through shape; and that a refusal reaches the caller unchanged
 * rather than being swallowed.
 *
 * `suggestHandle` lives in `profile.js`, which is already walked by
 * `community.privacy.guard.test.js` (it covers every file under
 * `src/lib/community/` by location, this one included) -- the belt-and-
 * braces check below is scoped to just this one function, in case a
 * future edit widened its body without the whole-file guard catching a
 * partial-word variant.
 */

const fs = require('fs');
const path = require('path');

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
const { suggestHandle } = require('../profile');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('suggestHandle', () => {
  test('calls community_handle_suggestion with its one declared parameter, null when there is no hint', async () => {
    callCommunity.mockResolvedValue({ handle: 'rowan_lifts', source: 'name' });

    await suggestHandle();

    expect(callCommunity).toHaveBeenCalledTimes(1);
    expect(callCommunity).toHaveBeenCalledWith('community_handle_suggestion', { _hint: null });
  });

  test('a hint is trimmed and capped at sixty characters; blank reads as no hint', async () => {
    callCommunity.mockResolvedValue({ handle: 'rowan', source: 'name' });
    await suggestHandle('  Rowan  ');
    expect(callCommunity).toHaveBeenLastCalledWith('community_handle_suggestion', { _hint: 'Rowan' });
    await suggestHandle('x'.repeat(80));
    expect(callCommunity).toHaveBeenLastCalledWith('community_handle_suggestion', { _hint: 'x'.repeat(60) });
    await suggestHandle('   ');
    expect(callCommunity).toHaveBeenLastCalledWith('community_handle_suggestion', { _hint: null });
    await suggestHandle(42);
    expect(callCommunity).toHaveBeenLastCalledWith('community_handle_suggestion', { _hint: null });
  });

  test('returns the server shape unchanged', async () => {
    callCommunity.mockResolvedValue({ handle: 'rowan_lifts', source: 'email' });
    await expect(suggestHandle()).resolves.toEqual({ handle: 'rowan_lifts', source: 'email' });
  });

  test('the "already has a profile" shape passes through too', async () => {
    callCommunity.mockResolvedValue({ handle: 'rowan_lifts', source: 'existing' });
    await expect(suggestHandle()).resolves.toEqual({ handle: 'rowan_lifts', source: 'existing' });
  });

  test('a refusal reaches the caller unchanged, never swallowed', async () => {
    const err = Object.assign(new Error('rate_limited'), { code: 'rate_limited' });
    callCommunity.mockRejectedValue(err);
    await expect(suggestHandle()).rejects.toBe(err);
  });
});

describe('the function body itself never names the email field (belt-and-braces)', () => {
  test('no `email` in suggestHandle\'s own body', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'profile.js'), 'utf8');
    const at = source.indexOf('export async function suggestHandle(');
    expect(at).toBeGreaterThan(-1);
    const end = source.indexOf('\n}', at);
    expect(end).toBeGreaterThan(at);
    const body = source.slice(at, end + 2);
    expect(body).not.toMatch(/\bemail\b/i);
  });
});
