/**
 * Deleted-account residual sync guard (_clearSessionIfAuthUserGone).
 *
 * When the auth user has been deleted but the device still holds a live JWT,
 * sync pushes fail their auth.users FK until the token expires (the
 * daily_steps Sentry noise, CURRENT_STATUS 2026-06-09). After an errored
 * cycle the runner asks Auth whether the user still exists and drops the
 * local session only on a definitive user-gone answer. These tests pin the
 * narrowness: a real user, an offline failure, or a 5xx must never sign out.
 */

const mockGetUser = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({ error: null });

// Injected via the module's test seam (_setClientForTests) rather than a
// jest.mock of ../supabase, so the suite is deterministic in shared workers.
const { _setClientForTests } = require('../../supabase');
const { _clearSessionIfAuthUserGone } = require('../runner');

function injectClient(client) {
  _setClientForTests(client);
}

describe('_clearSessionIfAuthUserGone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    injectClient({ auth: { getUser: (...a) => mockGetUser(...a), signOut: (...a) => mockSignOut(...a) } });
  });

  afterAll(() => {
    _setClientForTests(null);
  });

  test('drops the local session when Auth says the user no longer exists (403 sub claim)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { status: 403, message: 'User from sub claim in JWT does not exist' },
    });
    const cleared = await _clearSessionIfAuthUserGone();
    expect(cleared).toBe(true);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  test('also matches a 401 user_not_found shape', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: 'user_not_found' },
    });
    expect(await _clearSessionIfAuthUserGone()).toBe(true);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('a live user is never signed out', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    expect(await _clearSessionIfAuthUserGone()).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test('a transient network failure is never treated as user-gone', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { status: null, message: 'fetch failed' },
    });
    expect(await _clearSessionIfAuthUserGone()).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test('a 5xx or unrelated 401 message is never treated as user-gone', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { status: 503, message: 'service unavailable' },
    });
    expect(await _clearSessionIfAuthUserGone()).toBe(false);
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: 'invalid JWT signature' },
    });
    expect(await _clearSessionIfAuthUserGone()).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test('no client or a thrown getUser resolves false without throwing', async () => {
    injectClient(null);
    expect(await _clearSessionIfAuthUserGone()).toBe(false);
    injectClient({ auth: { getUser: () => { throw new Error('boom'); }, signOut: mockSignOut } });
    expect(await _clearSessionIfAuthUserGone()).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
