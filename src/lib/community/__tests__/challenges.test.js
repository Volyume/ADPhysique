/**
 * What this suite pins (D221 ruling 4, Stage 3 spec 3c; server migrate_191
 * Part 7): exact RPC and parameter names; client-side validation mirrors the
 * server's CHECKs (name 1..40, YYYY-MM-DD days, target 1..200) before the
 * network; the log call is keyed on the session key so a retry is safe; the
 * board reduces to counts only (no other field is ever read from a member),
 * is null when withheld, and puts the caller's own row first.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});

const { callCommunity } = require('../transport');

beforeEach(() => { jest.clearAllMocks(); callCommunity.mockResolvedValue({}); });

const {
  createChallenge, endChallenge, logChallengeSession, loadChallengeBoard,
} = require('../challenges');

const ROW = {
  id: 'c1', group_id: 'g1', name: 'October 12', starts_on: '2026-10-01', ends_on: '2026-10-31',
  target_sessions: 12, status: 'active',
};

test('createChallenge sends the declared parameters and normalises the row', async () => {
  callCommunity.mockResolvedValueOnce({ challenge: ROW });
  const out = await createChallenge('g1', {
    name: ' October 12 ', startsOn: '2026-10-01', endsOn: '2026-10-31', target: 12,
  });
  expect(callCommunity).toHaveBeenCalledWith('community_challenge_create', {
    _group_id: 'g1', _name: 'October 12', _starts_on: '2026-10-01', _ends_on: '2026-10-31', _target: 12,
  });
  expect(out).toEqual({
    id: 'c1', groupId: 'g1', name: 'October 12', startsOn: '2026-10-01', endsOn: '2026-10-31',
    targetSessions: 12, status: 'active',
  });
});

test('createChallenge: no target sends null and reads a null target as null', async () => {
  callCommunity.mockResolvedValueOnce({ challenge: { ...ROW, target_sessions: null } });
  const out = await createChallenge('g1', { name: 'x', startsOn: '2026-10-01', endsOn: '2026-10-08' });
  expect(callCommunity.mock.calls[0][1]._target).toBeNull();
  expect(out.targetSessions).toBeNull();
});

test('createChallenge refuses bad input before the network', async () => {
  const ok = { name: 'x', startsOn: '2026-10-01', endsOn: '2026-10-08' };
  for (const bad of [
    [null, ok], ['g1', { ...ok, name: '' }], ['g1', { ...ok, name: 'a'.repeat(41) }],
    ['g1', { ...ok, startsOn: '1 Oct' }], ['g1', { ...ok, endsOn: undefined }],
    ['g1', { ...ok, target: 0 }], ['g1', { ...ok, target: 201 }], ['g1', { ...ok, target: 2.5 }],
  ]) {
    await expect(createChallenge(...bad)).rejects.toMatchObject({ code: 'invalid_input' });
  }
  expect(callCommunity).not.toHaveBeenCalled();
});

test('endChallenge calls community_challenge_end with _id', async () => {
  callCommunity.mockResolvedValueOnce({ challenge: { ...ROW, status: 'ended' } });
  expect((await endChallenge('c1')).status).toBe('ended');
  expect(callCommunity).toHaveBeenCalledWith('community_challenge_end', { _id: 'c1' });
  await expect(endChallenge('')).rejects.toMatchObject({ code: 'invalid_input' });
});

test('logChallengeSession keys on the session key and reports whether it was new', async () => {
  callCommunity.mockResolvedValueOnce({ logged: true, new: true });
  expect(await logChallengeSession('c1', 'w-42', '2026-10-08')).toEqual({ logged: true, isNew: true });
  expect(callCommunity).toHaveBeenCalledWith('community_challenge_log_session', {
    _challenge_id: 'c1', _session_key: 'w-42', _logged_on: '2026-10-08',
  });
  callCommunity.mockResolvedValueOnce({ logged: true, new: false });
  expect((await logChallengeSession('c1', 'w-42', '2026-10-08')).isNew).toBe(false);
});

test('logChallengeSession refuses a missing key or a malformed day', async () => {
  await expect(logChallengeSession('c1', '', '2026-10-08')).rejects.toMatchObject({ code: 'invalid_input' });
  await expect(logChallengeSession('c1', 'k', 'today')).rejects.toMatchObject({ code: 'invalid_input' });
  expect(callCommunity).not.toHaveBeenCalled();
});

test('loadChallengeBoard returns counts only, own row first', async () => {
  callCommunity.mockResolvedValueOnce({
    challenge: ROW, group_total: 9, days_remaining: 4,
    members: [
      { user_id: 'u2', handle: 'b', display_name: 'B', avatar_preset: 'a1', sessions: 6, me: false, weight: 90 },
      { user_id: 'u1', handle: 'a', display_name: 'A', avatar_preset: null, sessions: 3, me: true },
    ],
  });
  const out = await loadChallengeBoard('c1');
  expect(callCommunity).toHaveBeenCalledWith('community_challenge_board', { _challenge_id: 'c1' });
  expect(out.groupTotal).toBe(9);
  expect(out.daysRemaining).toBe(4);
  expect(out.members.map((m) => m.userId)).toEqual(['u1', 'u2']);
  expect(Object.keys(out.members[0]).sort()).toEqual(
    ['avatarPreset', 'displayName', 'handle', 'me', 'sessions', 'userId']);
});

test('loadChallengeBoard answers null when the server withheld it', async () => {
  callCommunity.mockResolvedValueOnce(null);
  expect(await loadChallengeBoard('c1')).toBeNull();
  await expect(loadChallengeBoard(null)).rejects.toMatchObject({ code: 'invalid_input' });
});

test('loadActiveChallengeIds reads the member RPC and keeps only ids, groups and the window (round 3R, S1)', async () => {
  const { loadActiveChallengeIds } = require('../challenges');
  callCommunity.mockResolvedValueOnce({ challenges: [
    { id: 'c1', group_id: 'g1', starts_on: '2026-10-01', ends_on: '2026-10-20', secret: 'x' }, { group_id: 'g2' },
  ] });
  expect(await loadActiveChallengeIds()).toEqual([
    { id: 'c1', groupId: 'g1', startsOn: '2026-10-01', endsOn: '2026-10-20' },
  ]);
  expect(callCommunity).toHaveBeenCalledWith('community_group_active_challenges', {});
});
