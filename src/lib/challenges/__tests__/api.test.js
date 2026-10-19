/**
 * Pins the gym challenge RPC wrappers: exact RPC and parameter names, input
 * checks before the network, and the error mapping onto not_found,
 * not_allowed, invalid_input, network (anything else is unavailable).
 */
jest.mock('../../community/transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});

const { callCommunity, CommunityError } = require('../../community/transport');
const api = require('../api');

beforeEach(() => { jest.clearAllMocks(); callCommunity.mockResolvedValue({}); });

const JOIN = {
  code: 'Volt-Nov', displayMode: 'name', displayName: ' Sam K ', plannedPerWeek: 4,
  consentVersion: 'challenge_consent_v1', adult: true,
};

test('join sends the declared parameters, code lower-cased and name trimmed', async () => {
  callCommunity.mockResolvedValueOnce({ challenge_id: 'c1', joined: true });
  const out = await api.joinChallenge(JOIN);
  expect(out).toEqual({ challenge_id: 'c1', joined: true });
  expect(callCommunity).toHaveBeenCalledWith('gym_challenge_join', {
    _code: 'volt-nov', _display_mode: 'name', _display_name: 'Sam K', _planned_per_week: 4,
    _consent_version: 'challenge_consent_v1', _adult: true,
  });
});

test.each([
  ['not adult', { adult: false }],
  ['adult unset', { adult: undefined }],
  ['bad mode', { displayMode: 'full' }],
  ['name mode, empty name', { displayName: '  ' }],
  ['name too long', { displayName: 'x'.repeat(31) }],
  ['target too low', { plannedPerWeek: 1 }],
  ['target too high', { plannedPerWeek: 7 }],
  ['no consent version', { consentVersion: '' }],
  ['bad code', { code: 'x' }],
])('join refuses before the network: %s', async (_n, patch) => {
  await expect(api.joinChallenge({ ...JOIN, ...patch })).rejects.toMatchObject({ code: 'invalid_input' });
  expect(callCommunity).not.toHaveBeenCalled();
});

test('handle mode needs no name', async () => {
  await api.joinChallenge({ ...JOIN, displayMode: 'handle', displayName: '' });
  expect(callCommunity.mock.calls[0][1]).toMatchObject({ _display_mode: 'handle', _display_name: '' });
});

test('the other wrappers use the declared RPC names and parameters', async () => {
  callCommunity.mockResolvedValue(null);
  await api.getPublicChallenge('volt-nov');
  await api.lookupChallenge('volt-nov');
  await api.withdrawFromChallenge('id1');
  await api.setChallengeTarget('id1', 5);
  await api.myChallenges();
  await api.challengeScore('id1');
  await api.challengeBoard('id1');
  await api.challengeForMyGym();
  expect(callCommunity.mock.calls).toEqual([
    ['gym_challenge_public', { _code: 'volt-nov' }],
    ['gym_challenge_lookup', { _code: 'volt-nov' }],
    ['gym_challenge_withdraw', { _challenge_id: 'id1' }],
    ['gym_challenge_set_target', { _challenge_id: 'id1', _planned_per_week: 5 }],
    ['gym_challenge_mine', {}],
    ['gym_challenge_score', { _challenge_id: 'id1' }],
    ['gym_challenge_board', { _challenge_id: 'id1' }],
    ['gym_challenge_for_my_gym', {}],
  ]);
});

test('null answers stay null; mine is always an array', async () => {
  callCommunity.mockResolvedValue(null);
  expect(await api.lookupChallenge('volt-nov')).toBeNull();
  expect(await api.challengeBoard('id1')).toBeNull();
  expect(await api.challengeForMyGym()).toBeNull();
  expect(await api.myChallenges()).toEqual([]);
});

test('input checks on ids and targets', async () => {
  await expect(api.withdrawFromChallenge('')).rejects.toMatchObject({ code: 'invalid_input' });
  await expect(api.setChallengeTarget('id1', 9)).rejects.toMatchObject({ code: 'invalid_input' });
  await expect(api.lookupChallenge('!')).rejects.toMatchObject({ code: 'invalid_input' });
  expect(callCommunity).not.toHaveBeenCalled();
});

test.each([
  ['not_found', 'not_found'],
  ['invalid_input', 'invalid_input'],
  ['not_allowed', 'not_allowed'],
  ['forbidden', 'not_allowed'],
  ['not_signed_in', 'not_allowed'],
  ['health_consent_unresolved', 'not_allowed'],
  ['offline', 'network'],
  ['unavailable', 'unavailable'],
  ['rate_limited', 'unavailable'],
])('transport code %s maps to %s', async (from, to) => {
  callCommunity.mockRejectedValueOnce(new CommunityError(from));
  const err = await api.lookupChallenge('volt-nov').catch((e) => e);
  expect(err).toBeInstanceOf(api.ChallengeError);
  expect(err.code).toBe(to);
});

test('a non-transport error becomes unavailable', async () => {
  callCommunity.mockRejectedValueOnce(new Error('boom'));
  await expect(api.challengeScore('id1')).rejects.toMatchObject({ code: 'unavailable' });
});
