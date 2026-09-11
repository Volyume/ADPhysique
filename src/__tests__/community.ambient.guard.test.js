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
    const out = await flushPendingAmbientItems('u1');
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
    const out = await flushPendingAmbientItems('u1');
    expect(out.dropped).toBe(1);
    expect(out.flushed).toBe(1);
    expect(out.remaining).toBe(0);
  });
});

// Fresh-eyes review 2026-09-11 (F1, BLOCKER): the flush consults the SAME
// gate as publishAmbientItems, at flush time. Written to FAIL against the
// shipped code, which re-sent every queued item ungated: an item queued
// offline with sharing on, then calm mode or an open ED flag, published
// on the next Community open. Sharing withdrawn drops the queue; the gate
// holds it; no account id sends nothing.
describe('flushPendingAmbientItems: the gate at flush time (review F1)', () => {
  async function queueOne() {
    createPost.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }));
    await publishAmbientItems({ userId: 'u1', workoutId: 'w1' });
    createPost.mockClear();
  }

  test('calm mode or an open ED flag: nothing is sent, everything stays queued', async () => {
    await queueOne();
    sessionShareGateState.mockResolvedValue({ allowed: false, gated: true });
    const out = await flushPendingAmbientItems('u1');
    expect(createPost).not.toHaveBeenCalled();
    expect(out).toEqual({ flushed: 0, dropped: 0, remaining: 1 });
    expect(JSON.parse(mockStore.get(PENDING_ITEMS_KEY))).toHaveLength(1);
  });

  test('sharing turned off since queueing: consent withdrawn, the queue is dropped unsent', async () => {
    await queueOne();
    readShareSettings.mockResolvedValue({ share_sessions: false, sessions_audience: 'followers' });
    const out = await flushPendingAmbientItems('u1');
    expect(createPost).not.toHaveBeenCalled();
    expect(out).toEqual({ flushed: 0, dropped: 1, remaining: 0 });
    expect(JSON.parse(mockStore.get(PENDING_ITEMS_KEY))).toEqual([]);
  });

  test('no account id: fail closed, nothing is sent and nothing is dropped', async () => {
    await queueOne();
    const out = await flushPendingAmbientItems();
    expect(createPost).not.toHaveBeenCalled();
    expect(out).toEqual({ flushed: 0, dropped: 0, remaining: 1 });
  });

  test('source: the gate is consulted before any send, and every caller passes the account id', () => {
    const fs = require('fs');
    const path = require('path');
    const ambient = fs.readFileSync(path.join(__dirname, '../lib/community/ambient.js'), 'utf8');
    const flushAt = ambient.indexOf('export async function flushPendingAmbientItems(userId)');
    expect(flushAt).toBeGreaterThan(-1);
    const body = ambient.slice(flushAt, ambient.indexOf('export async function clearPendingAmbientItems', flushAt));
    expect(body.indexOf('sessionShareGateState(')).toBeGreaterThan(-1);
    expect(body.indexOf('sessionShareGateState(')).toBeLessThan(body.indexOf('sendAutoItem('));
    expect(body.indexOf('readShareSettings(')).toBeLessThan(body.indexOf('sendAutoItem('));
    const hub = fs.readFileSync(path.join(__dirname, '../screens/CommunityHubScreen.js'), 'utf8');
    const summary = fs.readFileSync(path.join(__dirname, '../screens/WorkoutSummaryScreen.js'), 'utf8');
    const app = fs.readFileSync(path.join(__dirname, '../../App.js'), 'utf8');
    expect(hub).not.toMatch(/flushPendingAmbientItems\(\)/);
    expect(summary).not.toMatch(/flushPendingAmbientItems\(\)/);
    expect(hub.match(/flushPendingAmbientItems\(consistencyUid\)/g)).toHaveLength(2);
    expect(summary).toMatch(/flushPendingAmbientItems\(user\.id\)/);
    // The reconnect edge drains the queue too (the recorded foreground-only
    // limitation is closed), through the app's hardened NetInfo listener.
    const edgeAt = app.indexOf("callSyncAll('network')");
    expect(edgeAt).toBeGreaterThan(-1);
    expect(app.slice(edgeAt, edgeAt + 1200)).toMatch(/flushPendingAmbientItems\(uid\)/);
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

  // F17 (fresh-eyes review): the old assertion (`toMatch(/hasSeenSessionShareOffer/)`
  // with no anchoring) passes on the IMPORT line alone -- it would still
  // pass with the actual gate check deleted from the effect below, as
  // long as the name stayed imported. Pin the call site instead, inside
  // the specific effect that decides the offer.
  test('the offer is gated on having not been seen before (the call site inside the effect, not merely the import)', () => {
    const effectMatch = /useEffect\(\(\) => \{[\s\S]*?\}, \[readOnly, shareOfferEligible, user\?\.id\]\);/.exec(SOURCE);
    expect(effectMatch).toBeTruthy();
    expect(effectMatch[0]).toMatch(/const seen = await hasSeenSessionShareOffer\(user\.id\);/);
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

// F2 (fresh-eyes review): detectPR's previousValue is type-dependent
// (algorithms.js: an e1RM for 1rm_estimate, a rep count for
// most_reps_at_weight, and only ever a weight for heaviest_weight).
// ActivityItemRow renders `previousBest` as a weight unconditionally, so
// the map from detectedPRs to the ambient prList must only carry it
// through for that one PR type, never a bare pass-through.
describe('F2: the prList map only carries previousBest for heaviest_weight PRs (source-pinned on WorkoutSummaryScreen.js)', () => {
  const SOURCE = fs.readFileSync(path.join(__dirname, '../screens/WorkoutSummaryScreen.js'), 'utf8');

  test('previousBest is gated on p.type === \'heaviest_weight\', not a bare pass-through of previousValue', () => {
    const mapMatch = /const prList = \(detectedPRs \|\| \[\]\)\.map\(\(p\) => \(\{[\s\S]*?\}\)\);/.exec(SOURCE);
    expect(mapMatch).toBeTruthy();
    const body = mapMatch[0];
    expect(body).toMatch(/previousBest:\s*p\.type === 'heaviest_weight' \? \(p\.previousValue \?\? null\) : null/);
  });
});

// F3 (fresh-eyes review): "Respect everyone who trained today" must never
// count the viewer's own row -- a lone trainer training alone must not see
// "Respect given to 0 people" with the row disabled for the rest of the day.
describe('F3: RespectAllRow.hasTrainedToday excludes the viewer\'s own row (source-pinned)', () => {
  test.each([
    ['src/screens/CommunityDimensionScreen.js', /hasTrainedToday=\{displayRows\.some\(\(row\) => row\.trainedToday && !row\.isYou\)\}/],
    ['src/screens/CommunityGroupScreen.js', /hasTrainedToday=\{displayMembers\.some\(\(row\) => row\.trainedToday && !row\.isYou\)\}/],
  ])('%s passes hasTrainedToday gated on !row.isYou', (rel, pattern) => {
    const source = fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');
    expect(source).toMatch(pattern);
  });
});

// F4 (fresh-eyes review): a failed publishSharingSettings call (withdrawing
// or granting "Share what I did") must retry, not vanish. The retry rides
// the Hub's existing foreground trigger (the same one already used for
// publishConsistencyOnForeground and flushPendingAmbientItems) and the
// retry mechanics themselves stay in src/lib/community, never the screen.
describe('F4: a pending sharing-settings publish is retried from the Hub foreground effect, never re-implemented in the screen', () => {
  test('source: retryPendingSharingPublish rides the same trigger as flushPendingAmbientItems (mount + AppState listener)', () => {
    const hub = fs.readFileSync(path.join(__dirname, '../screens/CommunityHubScreen.js'), 'utf8');
    expect(hub.match(/retryPendingSharingPublish\(consistencyUid\)/g)).toHaveLength(2);
  });

  test('source: CommunityTrainingProfileScreen.js sets/clears the pending flag through the lib, never touches AsyncStorage itself', () => {
    const screen = fs.readFileSync(path.join(__dirname, '../screens/CommunityTrainingProfileScreen.js'), 'utf8');
    expect(screen).not.toMatch(/AsyncStorage/);
    expect(screen).toMatch(/setSharingPublishPending\(uid, false\)/);
    // Lead review 2026-09-11: the pending flag carries the removal intent,
    // so a failed "remove what I already shared" retries the removal too.
    expect(screen).toMatch(/setSharingPublishPending\(uid, true, \{ removeShared \}\)/);
  });

  test('source: the off path\'s toast reads "will apply", never "will share"', () => {
    const screen = fs.readFileSync(path.join(__dirname, '../screens/CommunityTrainingProfileScreen.js'), 'utf8');
    const fnMatch = /async function saveSharing\([\s\S]*?\n {2}\}\n/.exec(screen);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch[0]).toMatch(/Saved on this device\. It will apply when you are back online\./);
  });
});

// F5 (fresh-eyes review): "My groups" with nobody to post to is a doomed,
// silent choice (`ambient.js` skips with skipped:'no_groups'). Both
// screens offering the audience chip must disable it and say so, and a
// network error reading the groups list must never block the choice.
describe('F5: the "My groups" chip is disabled with nothing to post to, never a silent no-op (source-pinned)', () => {
  test.each([
    'src/screens/CommunityTrainingProfileScreen.js',
    'src/screens/CommunityJoinScreen.js',
  ])('%s disables the groups chip on !hasGroups, explains why, and fails open on a read failure', (rel) => {
    const source = fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8');
    expect(source).toMatch(/disabled=\{value === 'groups' && !hasGroups\}/);
    expect(source).toMatch(/You are not in any groups yet\./);
    expect(source).toMatch(/const \[hasGroups, setHasGroups\] = useState\(true\)/);
    const effectMatch = /useEffect\(\(\) => \{[^]*?listMyGroups\(\)[^]*?\}\)\(\);[^]*?\}, \[\]\);/.exec(source);
    expect(effectMatch).toBeTruthy();
    expect(effectMatch[0]).toMatch(/setHasGroups\(mine\.length > 0\)/);
    expect(effectMatch[0]).toMatch(/catch[^]*?setHasGroups\(true\)/);
    expect(effectMatch[0]).not.toMatch(/catch[^]*?setHasGroups\(false\)/);
  });
});

// F13 (fresh-eyes review): a minor must never be offered "Everyone" as a
// post audience, same posture as the Training profile audience row.
describe('F13: CommunityComposeScreen drops the Everyone chip for a minor (source-pinned)', () => {
  const SOURCE = fs.readFileSync(path.join(__dirname, '../screens/CommunityComposeScreen.js'), 'utf8');

  test('the rendered chip list is filtered by isMinor, never the raw closed set', () => {
    expect(SOURCE).toMatch(/const visibilityOptions = isMinor \? VISIBILITY_OPTIONS\.filter\(\(opt\) => opt\.value !== 'public'\) : VISIBILITY_OPTIONS;/);
    expect(SOURCE).toMatch(/\{visibilityOptions\.map\(\(opt\) => \(/);
    expect(SOURCE).not.toMatch(/\{VISIBILITY_OPTIONS\.map\(\(opt\) => \(/);
  });

  test('isMinor is set from the loaded `me`, defaulting to minor (unknown means minor) before it loads', () => {
    expect(SOURCE).toMatch(/const \[isMinor, setIsMinor\] = useState\(true\)/);
    expect(SOURCE).toMatch(/setIsMinor\(!!me\.is_minor\)/);
  });
});

// F12 (fresh-eyes review): emptyMe() failed open (is_minor: false) --
// unknown must mean minor until the server says otherwise. Every
// consumer that can render before `me` has loaded was then audited so an
// ADULT never sees minor-specific COPY during that window: functional
// hides (a missing chip, a missing button, a collapsed section) are fine
// and expected -- only literal minor-facing text needed a loaded-state
// gate, on CommunityJoinScreen.js and CommunityTrainingProfileScreen.js.
// CommunityComposeScreen.js's own audience section (F13, just above) is
// already safe by construction: `isMinor` there is set in the SAME
// `load()` call that also gates the whole section behind `loading`.
describe('F12: emptyMe().is_minor defaults to true, and the two screens with literal minor-facing copy gate it on the loaded state (source-pinned)', () => {
  test('emptyMe() fails closed: unknown means minor', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/community/profile.js'), 'utf8');
    const fnMatch = /export function emptyMe\(\)[\s\S]*?\n\}/.exec(source);
    expect(fnMatch).toBeTruthy();
    expect(fnMatch[0]).toMatch(/is_minor:\s*true/);
  });

  test('CommunityJoinScreen.js: the "Under 18" line requires !meLoading, not isMinor alone', () => {
    const source = fs.readFileSync(path.join(__dirname, '../screens/CommunityJoinScreen.js'), 'utf8');
    expect(source).toMatch(/loading:\s*meLoading/);
    expect(source).toMatch(/\{!meLoading && isMinor \? \(/);
  });

  test('CommunityTrainingProfileScreen.js: the "opens at 18" section requires !meLoading, not isMinor alone', () => {
    const source = fs.readFileSync(path.join(__dirname, '../screens/CommunityTrainingProfileScreen.js'), 'utf8');
    expect(source).toMatch(/loading:\s*meLoading/);
    expect(source).toMatch(/\{meLoading \? null : isMinor \? \(/);
  });
});
