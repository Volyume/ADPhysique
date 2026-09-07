/**
 * transport.test.js (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## Tests and records").
 *
 * What this suite pins:
 *
 *  - `callGyms` shares Community's own three gates (sign-out wipe,
 *    Article 9 consent fails CLOSED, an ANSWERED "no session" only) by
 *    routing every call through `community/transport.js`'s
 *    `callCommunity`, rather than opening a second route to Supabase
 *    (GD-01, GD-13);
 *  - a code Community's own fixed list already knows (`rate_limited`,
 *    `offline`, `not_signed_in`, `health_consent_unresolved`,
 *    `sign_out_wiping`) arrives at the caller unchanged;
 *  - a code ONLY the gym RPCs raise (`invalid_postcode`, `invalid`) is
 *    NOT swallowed by Community's fallback to `unavailable`: it is
 *    recovered from the raw message before the caller ever sees it;
 *  - every failure is a `GymsError` with `.code` from `GYM_ERROR_CODES`,
 *    never a bare `CommunityError` leaking out of this module.
 */

const supabase = require('../../supabase');
const signOutGuard = require('../../sync/signOutGuard');
const store = require('../../../store/useAppStore');

jest.mock('../../supabase', () => ({
  getSupabaseClient: jest.fn(),
  hasLiveSession: jest.fn(),
}));
jest.mock('../../sync/signOutGuard', () => ({ isSignOutWiping: jest.fn(() => false) }));
jest.mock('../../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: jest.fn(() => ({ healthConsent: true })) },
}));

const { callGyms, GymsError, GYM_ERROR_CODES } = require('../transport');

const rpc = jest.fn();

function grantAll() {
  signOutGuard.isSignOutWiping.mockReturnValue(false);
  store.default.getState.mockReturnValue({ healthConsent: true });
  supabase.hasLiveSession.mockResolvedValue(true);
  supabase.getSupabaseClient.mockReturnValue({ rpc, functions: { invoke: jest.fn() } });
}

async function codeOf(promise) {
  try {
    await promise;
    return null;
  } catch (e) {
    expect(e).toBeInstanceOf(GymsError);
    return e.code;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  rpc.mockReset();
  grantAll();
});

describe('the same three gates Community itself uses', () => {
  test('a sign-out wipe refuses before any network call', async () => {
    signOutGuard.isSignOutWiping.mockReturnValue(true);
    expect(await codeOf(callGyms('gyms_search', { _q: 'PureGym' }))).toBe('sign_out_wiping');
    expect(supabase.getSupabaseClient).not.toHaveBeenCalled();
  });

  test('unresolved Article 9 consent fails CLOSED', async () => {
    store.default.getState.mockReturnValue({ healthConsent: null });
    expect(await codeOf(callGyms('gyms_search', { _q: 'PureGym' }))).toBe('health_consent_unresolved');
    expect(supabase.getSupabaseClient).not.toHaveBeenCalled();
  });

  test('an ANSWERED "no session" refuses', async () => {
    supabase.hasLiveSession.mockResolvedValue(false);
    expect(await codeOf(callGyms('gyms_search', { _q: 'PureGym' }))).toBe('not_signed_in');
    expect(rpc).not.toHaveBeenCalled();
  });

  test('an UNDETERMINED session does not switch the directory off', async () => {
    supabase.hasLiveSession.mockResolvedValue(null);
    rpc.mockResolvedValue({ data: { venues: [] }, error: null });
    await expect(callGyms('gyms_search', { _q: 'PureGym' })).resolves.toEqual({ venues: [] });
  });
});

describe('calling', () => {
  test('passes the RPC name and params straight through', async () => {
    rpc.mockResolvedValue({ data: { venues: [1] }, error: null });
    await expect(callGyms('gyms_near', { _lat: 1, _lng: 2, _radius_m: 1609, _limit: 40 }))
      .resolves.toEqual({ venues: [1] });
    expect(rpc).toHaveBeenCalledWith('gyms_near', { _lat: 1, _lng: 2, _radius_m: 1609, _limit: 40 });
  });
});

describe('a code Community already knows arrives unchanged', () => {
  test.each(['rate_limited'])('%s', async (code) => {
    rpc.mockResolvedValue({ data: null, error: { message: code } });
    expect(await codeOf(callGyms('gyms_submit', {}))).toBe(code);
  });

  test('a network failure arrives as offline', async () => {
    rpc.mockRejectedValue(new Error('Network request failed'));
    expect(await codeOf(callGyms('gyms_search', {}))).toBe('offline');
  });
});

describe('a refusal only the gym RPCs raise is recovered, not swallowed', () => {
  test.each(['invalid_postcode', 'invalid'])('%s survives Community\'s own fixed code list', async (code) => {
    rpc.mockResolvedValue({ data: null, error: { message: code } });
    expect(await codeOf(callGyms('gyms_submit', {}))).toBe(code);
  });
});

describe('every GymsError code is one of GYM_ERROR_CODES', () => {
  test('an unknown code cannot be forged into a GymsError', () => {
    expect(new GymsError('made_up').code).toBe('unavailable');
  });

  test('an unrecognised server failure arrives as unavailable', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'something nobody planned for' } });
    expect(await codeOf(callGyms('gyms_search', {}))).toBe('unavailable');
  });

  test('GYM_ERROR_CODES is a fixed, exported contract', () => {
    expect(GYM_ERROR_CODES).toEqual(expect.arrayContaining([
      'rate_limited', 'invalid_postcode', 'invalid', 'not_found', 'offline', 'unavailable',
    ]));
  });
});
