/**
 * supabase.expiredTokenRetry.test.js -- Sentry VOLYUME-2H, 2M, 1G (and the
 * "JWT expired" events grouped into 2D and 28): a read or write sent with an
 * access token that expired during a long sync came back 401 PGRST303 "JWT
 * expired", and the pull or push failed until the next run.
 *
 * Pins makeExpiredTokenRetryFetch: on that exact answer from the database it
 * refreshes the session once and sends the same request with the new token;
 * a clock-skew PGRST303, an auth request, another 401 or a failed refresh all
 * return the original answer untouched, with no second request.
 */
jest.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK: 0, getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

const { makeExpiredTokenRetryFetch } = require('../supabase');

const answer = (status, body) => ({
  status,
  clone() { return { json: async () => body }; },
  json: async () => body,
});
const EXPIRED = { code: 'PGRST303', message: 'JWT expired', details: null, hint: null };
const REST = 'https://x.supabase.co/rest/v1/workouts?select=*';

function setup({ first, second = answer(200, []), refresh = { data: { session: { access_token: 'new' } }, error: null } } = {}) {
  const calls = [];
  const baseFetch = jest.fn(async (input, init) => {
    calls.push({ input, auth: new Headers(init?.headers).get('Authorization') });
    return calls.length === 1 ? first : second;
  });
  const client = { auth: { refreshSession: jest.fn(async () => refresh) } };
  const f = makeExpiredTokenRetryFetch(() => client, baseFetch);
  return { f, calls, client, second };
}

describe('expired-token retry (Sentry VOLYUME-2H/2M/1G)', () => {
  test('refreshes once and resends the database request with the new token', async () => {
    const { f, calls, client, second } = setup({ first: answer(401, EXPIRED) });
    const res = await f(REST, { method: 'GET', headers: { Authorization: 'Bearer old' } });
    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.auth)).toEqual(['Bearer old', 'Bearer new']);
    expect(res).toBe(second);
  });

  test('a clock-skew PGRST303 is not refreshed here', async () => {
    const first = answer(401, { code: 'PGRST303', message: 'JWT issued at future' });
    const { f, calls, client } = setup({ first });
    expect(await f(REST, { headers: {} })).toBe(first);
    expect(client.auth.refreshSession).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  test('an auth request or another 401 passes through untouched', async () => {
    const auth = setup({ first: answer(401, EXPIRED) });
    await auth.f('https://x.supabase.co/auth/v1/token?grant_type=refresh_token', { headers: {} });
    expect(auth.client.auth.refreshSession).not.toHaveBeenCalled();
    const other = setup({ first: answer(401, { code: '42501', message: 'permission denied' }) });
    await other.f(REST, { headers: {} });
    expect(other.client.auth.refreshSession).not.toHaveBeenCalled();
    expect(other.calls).toHaveLength(1);
  });

  test('a failed refresh returns the original answer with no second request', async () => {
    const first = answer(401, EXPIRED);
    const { f, calls } = setup({ first, refresh: { data: { session: null }, error: { message: 'refresh token not found' } } });
    expect(await f(REST, { headers: {} })).toBe(first);
    expect(calls).toHaveLength(1);
  });
});
