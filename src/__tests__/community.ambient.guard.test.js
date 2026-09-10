/**
 * community.ambient.guard.test.js - phase3 spec section 8
 * (`docs/communities-revamp-2026-09-10/23-PHASE3-SPEC.md`).
 *
 * What this suite pins:
 *  - no auto item is created when the ED/calm gate is closed, or when
 *    "Share what I did" is off;
 *  - a minor's auto item is NEVER visible beyond followers, whatever
 *    `sessions_audience` says;
 *  - every auto `createPost` call carries a `client_ref` (the session
 *    item keyed by workout id, each PR item by workout id + exercise
 *    id), so a retried flush can never duplicate an item;
 *  - at most three PR items per workout;
 *  - a failed call is queued only when the failure is network-shaped
 *    (`offline`/`unavailable`); every other refusal (`not_allowed`,
 *    `minor_restricted`, anything else) is dropped, never retried;
 *  - `flushPendingAmbientItems` follows the identical retry-vs-drop rule;
 *  - the audience chooser is exactly three values, and both screens that
 *    render it build the chip row from that one closed set rather than a
 *    hand-rolled list that could drift from it;
 *  - the once-only offer, source-pinned on `WorkoutSummaryScreen.js`
 *    itself (this file's own established convention for that screen --
 *    see `WorkoutSummaryScreen.shareReadOnly.guard.test.js`'s header:
 *    "the screen's real data loads make a full render harness fragile").
 */

const fs = require('fs');
const path = require('path');

const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, v); }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
  },
}));

jest.mock('../lib/community/feed', () => ({ createPost: jest.fn() }));
jest.mock('../lib/community/trainingProfile', () => ({ readShareSettings: jest.fn() }));
jest.mock('../lib/community/trainingConsistency', () => ({ sessionShareGateState: jest.fn() }));
jest.mock('../lib/community/profile', () => ({ readCachedMe: jest.fn() }));
jest.mock('../lib/community/groups', () => ({ listMyGroups: jest.fn() }));
jest.mock('../lib/community/posts', () => ({
  buildSessionPayload: jest.fn(async () => ({ sessionName: 'Upper A', workingSets: 12 })),
  buildPrPayload: jest.fn((pr) => ({ exerciseName: pr.exerciseName, weight: pr.weight, reps: pr.reps })),
}));

const { createPost } = require('../lib/community/feed');
const { readShareSettings } = require('../lib/community/trainingProfile');
const { sessionShareGateState } = require('../lib/community/trainingConsistency');
const { readCachedMe } = require('../lib/community/profile');
const { listMyGroups } = require('../lib/community/groups');
const {
  publishAmbientItems, flushPendingAmbientItems, PENDING_ITEMS_KEY,
  hasSeenSessionShareOffer, recordSessionShareOfferSeen,
} = require('../lib/community/ambient');

const PR_LIST = [
  { exerciseId: 'ex1', exerciseName: 'Bench press', weight: 100, reps: 5, previousBest: 97.5 },
  { exerciseId: 'ex2', exerciseName: 'Squat', weight: 140, reps: 3, previousBest: 135 },
  { exerciseId: 'ex3', exerciseName: 'Deadlift', weight: 180, reps: 1, previousBest: 175 },
  { exerciseId: 'ex4', exerciseName: 'Row', weight: 90, reps: 8, previousBest: 85 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'followers' });
  sessionShareGateState.mockResolvedValue({ allowed: true, gated: false });
  readCachedMe.mockResolvedValue({ is_minor: false });
  listMyGroups.mockResolvedValue([]);
  createPost.mockResolvedValue({ id: 'p1' });
});

describe('publishAmbientItems: the gate', () => {
  test('nothing is created when share_sessions is off', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: false, sessions_audience: 'followers' });
    const out = await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(createPost).not.toHaveBeenCalled();
    expect(out).toEqual({
      created: 0, queued: 0, skipped: 'sharing_off', sessionPostId: null, sessionPayload: null,
    });
  });

  test('nothing is created under calm mode or an open ED flag, even with sharing on', async () => {
    sessionShareGateState.mockResolvedValue({ allowed: false, gated: true });
    const out = await publishAmbientItems({ userId: 'u1', workoutId: 'w1', prList: PR_LIST });
    expect(createPost).not.toHaveBeenCalled();
    expect(out).toEqual({
      created: 0, queued: 0, skipped: 'gated', sessionPostId: null, sessionPayload: null,
    });
  });

  test('the gate is asked with the share_sessions toggle, not a stale value', async () => {
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(sessionShareGateState).toHaveBeenCalledWith('u1', true);
  });
});

describe('publishAmbientItems: minors never get more than followers', () => {
  test('a minor with sessions_audience "everyone" still posts to followers only', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'everyone' });
    readCachedMe.mockResolvedValue({ is_minor: true });
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'followers' }));
  });

  test('an unreadable `me` fails closed to followers (never everyone/groups on a guess)', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'everyone' });
    readCachedMe.mockResolvedValue(null);
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'followers' }));
  });

  test('an adult with "everyone" gets the audience they chose', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'everyone' });
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'everyone' }));
  });
});

describe('publishAmbientItems: client_ref on every auto call, and at most three PRs', () => {
  test('the session item carries the workout id as client_ref', async () => {
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'session', auto: true, clientRef: 'w1',
    }));
  });

  test('each PR item carries workout id + exercise id as client_ref, capped at three', async () => {
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1', prList: PR_LIST });
    const prCalls = createPost.mock.calls.filter(([c]) => c.kind === 'pr');
    expect(prCalls).toHaveLength(3);
    expect(prCalls.map(([c]) => c.clientRef)).toEqual(['w1:ex1', 'w1:ex2', 'w1:ex3']);
    for (const [c] of createPost.mock.calls) {
      expect(c.auto).toBe(true);
      expect(typeof c.clientRef).toBe('string');
      expect(c.clientRef.length).toBeGreaterThan(0);
    }
  });

  test('a "my groups" audience with no current groups skips the item rather than sending a doomed call', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'groups' });
    listMyGroups.mockResolvedValue([]);
    const out = await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(createPost).not.toHaveBeenCalled();
    expect(out.skipped).toBe('no_groups');
  });

  test('a "my groups" audience with current groups sends _group_ids for those groups', async () => {
    readShareSettings.mockResolvedValue({ share_sessions: true, sessions_audience: 'groups' });
    listMyGroups.mockResolvedValue([{ group: { id: 'g1' } }, { group: { id: 'g2' } }]);
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'groups', groupIds: ['g1', 'g2'] }));
  });
});

describe('publishAmbientItems and flushPendingAmbientItems: retry vs. drop', () => {
  test('a network-shaped failure is queued for the next flush', async () => {
    createPost.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }));
    const out = await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    expect(out.queued).toBe(1);
    expect(mockStore.get(PENDING_ITEMS_KEY)).toBeTruthy();
  });

  test.each(['not_allowed', 'minor_restricted', 'content_not_allowed', 'rate_limited'])(
    '%s is terminal: dropped, never queued',
    async (code) => {
      createPost.mockRejectedValueOnce(Object.assign(new Error(code), { code }));
      const out = await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
      expect(out.created).toBe(0);
      expect(out.queued).toBe(0);
      expect(mockStore.has(PENDING_ITEMS_KEY)).toBe(false);
    },
  );

  test('flushPendingAmbientItems retries a queued item through the same call, and clears it once it lands', async () => {
    createPost.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }));
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    createPost.mockResolvedValueOnce({ id: 'p2' });
    const out = await flushPendingAmbientItems();
    expect(out).toEqual({ flushed: 1, dropped: 0, remaining: 0 });
    expect(JSON.parse(mockStore.get(PENDING_ITEMS_KEY))).toEqual([]);
  });

  test('flushPendingAmbientItems drops a terminal refusal and keeps a retryable one queued', async () => {
    createPost
      .mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }))
      .mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }));
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    await publishAmbientItems({ userId: 'u1', workoutId: 'w2' });
    createPost
      .mockRejectedValueOnce(Object.assign(new Error('not_allowed'), { code: 'not_allowed' }))
      .mockResolvedValueOnce({ id: 'p3' });
    const out = await flushPendingAmbientItems();
    expect(out.dropped).toBe(1);
    expect(out.flushed).toBe(1);
    expect(out.remaining).toBe(0);
  });
});

describe('hasSeenSessionShareOffer / recordSessionShareOfferSeen: the once-only device flag', () => {
  test('never seen until recorded', async () => {
    expect(await hasSeenSessionShareOffer('u1')).toBe(false);
  });

  test('recording it makes it seen for that user only', async () => {
    await recordSessionShareOfferSeen('u1');
    expect(await hasSeenSessionShareOffer('u1')).toBe(true);
    expect(await hasSeenSessionShareOffer('u2')).toBe(false);
  });
});

describe('exactly three auto audiences, built from the one closed set', () => {
  // The file-level mock above replaces trainingProfile.js wholesale
  // (this suite only needs readShareSettings from it); the real module is
  // pulled in here instead, scoped to this one check.
  const { SESSIONS_AUDIENCE_VALUES } = jest.requireActual('../lib/community/trainingProfile');

  test('SESSIONS_AUDIENCE_VALUES is exactly Followers / My groups / Everyone', () => {
    expect(SESSIONS_AUDIENCE_VALUES).toEqual(['followers', 'groups', 'everyone']);
  });

  test.each([
    'src/screens/CommunityTrainingProfileScreen.js',
    'src/screens/CommunityJoinScreen.js',
  ])('%s renders the audience chips from SESSIONS_AUDIENCE_VALUES, not a hand-rolled list', (rel) => {
    const source = fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');
    expect(source).toMatch(/SESSIONS_AUDIENCE_VALUES\.map\(/);
  });
});

describe('the once-only offer (source-pinned on WorkoutSummaryScreen.js, matching this screen\'s own established guard-test convention: a full render harness is fragile against its real data loads)', () => {
  const SOURCE = fs.readFileSync(path.join(__dirname, '../screens/WorkoutSummaryScreen.js'), 'utf8');

  test('the offer is gated on having not been seen before', () => {
    expect(SOURCE).toMatch(/hasSeenSessionShareOffer/);
  });

  test('both the accept and the decline path record the offer as seen', () => {
    const recordCount = (SOURCE.match(/recordSessionShareOfferSeen\(/g) ?? []).length;
    expect(recordCount).toBeGreaterThanOrEqual(2);
  });

  test('the offer is only eligible after the first completed workout ever, and never under calm/ED suppression', () => {
    expect(SOURCE).toMatch(/setShareOfferEligible\(totalCompleted === 1 && !suppressed\)/);
  });

  // Lead ruling (safety verdict R3): the offer turns on "Share my
  // consistency" ONLY -- day-level facts. "Share what I did" is a
  // higher-disclosure, express act that needs its own full wording, so
  // this offer never sets it and instead links out to where that toggle
  // lives with its complete explanation.
  test('accepting the offer sets consistency only, never share_sessions', () => {
    const fnMatch = /async function acceptShareOffer\([\s\S]*?\n {2}\}\n/.exec(SOURCE);
    expect(fnMatch).toBeTruthy();
    const body = fnMatch[0];
    expect(body).toMatch(/consistency:\s*true/);
    expect(body).not.toMatch(/share_sessions/);
    expect(body).not.toMatch(/sessions_audience/);
    expect(body).not.toMatch(/publishSharingSettings/);
  });

  test('the offer carries a tertiary link to the Training profile screen, where the fuller toggle lives', () => {
    expect(SOURCE).toMatch(/navigation\.navigate\('CommunityTrainingProfile'\)/);
  });

  test('the offer copy never claims to show more than day-level facts', () => {
    expect(SOURCE).toMatch(/Show people who follow you which days you trained\? Never your weight, food or photos\./);
  });
});
