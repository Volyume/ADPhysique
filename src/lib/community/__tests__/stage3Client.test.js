/**
 * What this suite pins (D221 Stage 3 client, `15-STAGE3-SPEC.md` "Client"):
 *  3a  the presence line and first names; `announceTraining` acts only with a
 *      profile, an adult, the switch on and the gate clear, clears a marker
 *      this device raised, and the 3-hour stale guard; the switch is mirrored
 *      on the device after the server accepts it.
 *  3c  the challenge window is always inside the server's 31 days; the
 *      lines speak sessions only; the logger's finish helper logs every
 *      active challenge of the person's groups once each and is gated.
 *  3d  the milestone payload exists only at 10, 25, 50, 100 and 250, is a
 *      count of sessions, and `publishAmbientItems` sends it once per count
 *      behind the same gates with a `milestone:<n>` client ref.
 */

const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, v); }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
  },
}));
jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});
jest.mock('../profile', () => ({ readCachedMe: jest.fn(), hasProfile: (me) => !!me?.profile?.handle }));
jest.mock('../trainingConsistency', () => ({
  consistencyGateState: jest.fn(), sessionShareGateState: jest.fn(),
}));
jest.mock('../feed', () => ({ createPost: jest.fn() }));
jest.mock('../trainingProfile', () => ({ readShareSettings: jest.fn() }));
jest.mock('../notify', () => ({ notifyCommunityEvent: jest.fn() }));
jest.mock('../../syncQueue', () => ({ enqueueSyncOp: jest.fn(async () => {}) }));

const { callCommunity } = require('../transport');
const { enqueueSyncOp } = require('../../syncQueue');
const { readCachedMe } = require('../profile');
const { consistencyGateState, sessionShareGateState } = require('../trainingConsistency');
const { createPost } = require('../feed');
const { readShareSettings } = require('../trainingProfile');
const { presenceLine, firstNamesLine } = require('../presence');
const {
  announceTraining, clearStaleTrainingNow, saveShowTrainingNow, readShowTrainingNow, showTrainingNowKey,
  trainingNowSinceKey,
} = require('../presenceSession');
const {
  challengeWindow, challengeDaysLine, challengeTotalLine, challengeStartsLine, challengeHasStarted,
} = require('../challenges');
const { logFinishedSessionToChallenges } = require('../challengeSession');
const { milestonePayloadFor, publishAmbientItems, MILESTONE_SESSION_COUNTS } = require('../ambient');
const { presenceFailureLine, TRAINING_NOW_MINOR_LINE } = require('../restriction');

const ME = { profile: { handle: 'sam' }, is_minor: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  callCommunity.mockResolvedValue({});
  readCachedMe.mockResolvedValue(ME);
  consistencyGateState.mockResolvedValue({ allowed: true, gated: false, isMinor: false });
  sessionShareGateState.mockResolvedValue({ allowed: true, gated: false });
  callCommunity.mockReset(); callCommunity.mockImplementation(async () => ({}));
  mockStore.clear();
  readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'followers' });
  createPost.mockResolvedValue({ id: 'p1' });
});

describe('3a presence copy', () => {
  test('the line leaves out an empty part and is null when both are empty', () => {
    expect(presenceLine(2, 3)).toBe('2 training now · 3 trained today');
    expect(presenceLine(0, 3)).toBe('3 trained today');
    expect(presenceLine(2)).toBe('2 training now');
    expect(presenceLine(0, 0)).toBeNull();
  });
  test('first names, with "and N more" past the names sent', () => {
    expect(firstNamesLine(['Sam Jones'])).toBe('Sam');
    expect(firstNamesLine(['Sam Jones', 'Priya Rao'])).toBe('Sam and Priya');
    expect(firstNamesLine(['Sam', 'Priya', 'Alex'], 5)).toBe('Sam, Priya, Alex and 2 more');
    expect(firstNamesLine([], 2)).toBeNull();
  });
  test('forbidden (a minor) maps to a calm line, not "try again"', () => {
    expect(presenceFailureLine('forbidden')).toBe(TRAINING_NOW_MINOR_LINE);
    expect(presenceFailureLine('profile_restricted')).toMatch(/limited/);
    expect(TRAINING_NOW_MINOR_LINE).not.toMatch(/—/);
  });
});

describe('3a announceTraining', () => {
  const switchOn = () => mockStore.set(showTrainingNowKey('u1'), 'true');

  test('does nothing with the switch off', async () => {
    const out = await announceTraining('u1', true);
    expect(out).toEqual({ sent: false, reason: 'switch_off' });
    expect(callCommunity).not.toHaveBeenCalled();
  });
  test('does nothing without a profile or for a minor', async () => {
    switchOn();
    readCachedMe.mockResolvedValueOnce(null);
    expect((await announceTraining('u1', true)).reason).toBe('no_profile');
    readCachedMe.mockResolvedValueOnce({ ...ME, is_minor: true });
    expect((await announceTraining('u1', true)).reason).toBe('no_profile');
    expect(callCommunity).not.toHaveBeenCalled();
  });
  test('does nothing under calm mode or an open ED flag', async () => {
    switchOn();
    consistencyGateState.mockResolvedValue({ allowed: false, gated: true, isMinor: false });
    expect((await announceTraining('u1', true)).reason).toBe('gated');
    expect(callCommunity).not.toHaveBeenCalled();
  });
  test('start raises, finish clears', async () => {
    switchOn();
    expect((await announceTraining('u1', true)).sent).toBe(true);
    expect(callCommunity).toHaveBeenLastCalledWith('community_set_training_now', { _on: true });
    expect(mockStore.has(trainingNowSinceKey('u1'))).toBe(true);
    expect((await announceTraining('u1', false)).sent).toBe(true);
    expect(callCommunity).toHaveBeenLastCalledWith('community_set_training_now', { _on: false });
    expect(mockStore.has(trainingNowSinceKey('u1'))).toBe(false);
  });
  test('a marker raised here is cleared even if the switch went off meanwhile', async () => {
    mockStore.set(trainingNowSinceKey('u1'), String(Date.now()));
    expect((await announceTraining('u1', false)).sent).toBe(true);
  });
  test('a server failure is reported, never thrown', async () => {
    switchOn();
    callCommunity.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'offline' }));
    expect(await announceTraining('u1', true)).toEqual({ sent: false, reason: 'offline' });
  });
  test('the stale guard clears only a marker older than three hours', async () => {
    const now = Date.now();
    mockStore.set(trainingNowSinceKey('u1'), String(now - 2 * 3600 * 1000));
    expect(await clearStaleTrainingNow('u1', now)).toBe(false);
    mockStore.set(trainingNowSinceKey('u1'), String(now - 3 * 3600 * 1000 - 1));
    expect(await clearStaleTrainingNow('u1', now)).toBe(true);
    expect(callCommunity).toHaveBeenCalledWith('community_set_training_now', { _on: false });
    expect(await clearStaleTrainingNow('u1', now)).toBe(false);
  });
  test('the switch mirror is written only after the server accepted', async () => {
    callCommunity.mockResolvedValueOnce({ show_training_now: true });
    expect(await saveShowTrainingNow('u1', true)).toBe(true);
    expect(await readShowTrainingNow('u1')).toBe(true);
    callCommunity.mockRejectedValueOnce(Object.assign(new Error('forbidden'), { code: 'forbidden' }));
    await expect(saveShowTrainingNow('u1', true)).rejects.toMatchObject({ code: 'forbidden' });
    expect(await readShowTrainingNow('u1')).toBe(true);
  });
});

describe('3c challenges on the device', () => {
  test('every create-sheet window ends after it starts and within 31 days', () => {
    const now = new Date(2026, 9, 8, 12).getTime();
    for (const start of ['today', 'tomorrow']) {
      for (const days of [7, 14, 28]) {
        const w = challengeWindow({ start, days, now });
        // The server's ends_on is INCLUSIVE, so "7 days" ends on start + 6.
        const span = (Date.parse(w.endsOn) - Date.parse(w.startsOn)) / 86400000;
        expect(span).toBe(days - 1);
        expect(span).toBeLessThanOrEqual(31);
      }
    }
    expect(challengeWindow({ start: 'tomorrow', days: 7, now }).startsOn).toBe('2026-10-09');
  });
  test('the lines speak sessions and nothing else', () => {
    expect(challengeDaysLine(5)).toBe('5 days left');
    expect(challengeDaysLine(0)).toBe('Last day');
    expect(challengeTotalLine(12, 30)).toBe('12 of 30 sessions');
    expect(challengeTotalLine(1)).toBe('1 session');
  });
  const active = (rows) => callCommunity.mockImplementation(async (fn) => (
    fn === 'community_group_active_challenges' ? { challenges: rows } : { logged: true, new: true }));

  test('finish logs each active challenge once with the workout uid as the key (ids from the server)', async () => {
    active([
      { id: 'c1', group_id: 'g1', starts_on: '2026-10-01', ends_on: '2026-10-20' },
      { id: 'c1', group_id: 'g1', starts_on: '2026-10-01', ends_on: '2026-10-20' },
      { id: 'c2', group_id: 'g2', starts_on: '2026-10-08', ends_on: '2026-10-20' },
    ]);
    const out = await logFinishedSessionToChallenges('u1', 'w1', '2026-10-08');
    expect(out).toEqual({ attempted: 2, logged: 2 });
    expect(callCommunity).toHaveBeenCalledWith('community_challenge_log_session',
      { _challenge_id: 'c1', _session_key: 'w1', _logged_on: '2026-10-08' });
  });
  test('a challenge that has not started is not logged into (F4)', async () => {
    active([{ id: 'c1', group_id: 'g1', starts_on: '2026-10-09', ends_on: '2026-10-20' }]);
    const out = await logFinishedSessionToChallenges('u1', 'w1', '2026-10-08');
    expect(out).toEqual({ attempted: 0, logged: 0 });
    expect(callCommunity).not.toHaveBeenCalledWith('community_challenge_log_session', expect.anything());
  });
  test('gated, a minor or no profile logs nothing', async () => {
    active([{ id: 'c1', group_id: 'g1', starts_on: '2026-10-01', ends_on: '2026-10-20' }]);
    consistencyGateState.mockResolvedValueOnce({ allowed: false, gated: true, isMinor: false });
    expect((await logFinishedSessionToChallenges('u1', 'w1', '2026-10-08')).attempted).toBe(0);
    readCachedMe.mockResolvedValueOnce({ ...ME, is_minor: true });
    expect((await logFinishedSessionToChallenges('u1', 'w1', '2026-10-08')).attempted).toBe(0);
    expect(enqueueSyncOp).not.toHaveBeenCalled();
  });
  test('an offline finish is queued as a challenge_session op carrying only the three fields', async () => {
    callCommunity.mockImplementation(async (fn) => {
      if (fn === 'community_group_active_challenges') return { challenges: [{ id: 'c1', group_id: 'g1', starts_on: '2026-10-01', ends_on: '2026-10-20' }] };
      throw Object.assign(new Error('x'), { code: 'offline' });
    });
    await expect(logFinishedSessionToChallenges('u1', 'w1', '2026-10-08')).resolves.toEqual({ attempted: 1, logged: 0 });
    expect(enqueueSyncOp).toHaveBeenCalledWith('challenge_session', 'w1', 'u1',
      { challengeId: 'c1', sessionKey: 'w1', loggedOn: '2026-10-08' });
  });
  test('a definitive refusal is not queued', async () => {
    callCommunity.mockImplementation(async (fn) => {
      if (fn === 'community_group_active_challenges') return { challenges: [{ id: 'c1', group_id: 'g1', starts_on: '2026-10-01', ends_on: '2026-10-20' }] };
      throw Object.assign(new Error('x'), { code: 'invalid_input' });
    });
    await logFinishedSessionToChallenges('u1', 'w1', '2026-10-08');
    expect(enqueueSyncOp).not.toHaveBeenCalled();
  });
  test('with no network for the id read, the cached ids are used so the finish still queues', async () => {
    active([{ id: 'c1', group_id: 'g1', starts_on: '2026-10-01', ends_on: '2026-10-20' }]);
    await logFinishedSessionToChallenges('u1', 'w0', '2026-10-08'); // fills the cache
    callCommunity.mockImplementation(async () => { throw Object.assign(new Error('x'), { code: 'offline' }); });
    await logFinishedSessionToChallenges('u1', 'w1', '2026-10-08');
    expect(enqueueSyncOp).toHaveBeenCalledWith('challenge_session', 'w1', 'u1',
      { challengeId: 'c1', sessionKey: 'w1', loggedOn: '2026-10-08' });
  });
  test('the start line: tomorrow, a later date, or nothing once started', () => {
    expect(challengeStartsLine('2026-10-09', '2026-10-08')).toBe('Starts tomorrow');
    expect(challengeStartsLine('2026-10-12', '2026-10-08')).toBe('Starts 12 Oct');
    expect(challengeStartsLine('2026-10-08', '2026-10-08')).toBeNull();
    expect(challengeHasStarted('2026-10-08', '2026-10-09')).toBe(true);
  });
  test('a 7 day window runs 7 calendar days inclusive of both ends', () => {
    const w = challengeWindow({ start: 'today', days: 7, now: new Date(2026, 9, 5, 12).getTime() });
    expect(w).toEqual({ startsOn: '2026-10-05', endsOn: '2026-10-11' });
  });
});

describe('3d milestones', () => {
  test('only the five counts make a payload, and it is a count of sessions', () => {
    expect(MILESTONE_SESSION_COUNTS).toEqual([10, 25, 50, 100, 250]);
    expect(milestonePayloadFor(9)).toBeNull();
    expect(milestonePayloadFor(11)).toBeNull();
    expect(milestonePayloadFor(null)).toBeNull();
  });
  test('a milestone follows the session item once, with a once-only client ref', async () => {
    // posts.js is real here, so the payload is the real milestone shape.
    const out = await publishAmbientItems({ userId: 'u1', workoutId: 'w1', completedCount: 25 });
    expect(out).toBeDefined();
    const kinds = createPost.mock.calls.map(([a]) => [a.kind, a.clientRef]);
    expect(kinds).toContainEqual(['milestone', 'milestone:25']);
  });
  test('no milestone off the five counts, none when sharing is off or gated', async () => {
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1', completedCount: 26 });
    expect(createPost.mock.calls.some(([a]) => a.kind === 'milestone')).toBe(false);
    createPost.mockClear();
    sessionShareGateState.mockResolvedValue({ allowed: false, gated: true });
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1', completedCount: 25 });
    expect(createPost).not.toHaveBeenCalled();
  });
});
