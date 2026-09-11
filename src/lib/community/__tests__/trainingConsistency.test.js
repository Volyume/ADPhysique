/**
 * What this suite pins (community product audit
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 1):
 *
 *  - every counter, against fixed clocks: the Monday-start week boundary
 *    (a Sunday-night session is last week, a Monday-morning one is this
 *    week), the calendar-month boundary, a streak that breaks on a
 *    missed week, and the no-plan cases (planned pct null, the 2-session
 *    threshold for "consistent");
 *  - the gate: `share_consistency: false` and no counters when calm mode
 *    is on, when an open ED-pattern flag exists, or for a minor - even
 *    when the person's own toggle is on;
 *  - `shareablePayload` always stamps `share_consistency` as a boolean,
 *    the same pattern `share_age_band` uses, so switching it off (or the
 *    gate tripping) actively nulls the server-side columns rather than
 *    leaving a stale row.
 */

const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, v); }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
    multiRemove: jest.fn(async (keys) => { keys.forEach((k) => mockStore.delete(k)); }),
  },
}));

const mockCallCommunity = jest.fn(async () => ({}));
jest.mock('../transport', () => ({ callCommunity: (...args) => mockCallCommunity(...args) }));

let mockCachedMe = { is_minor: false };
jest.mock('../profile', () => ({
  currentUserId: () => 'u1',
  readCachedMe: jest.fn(async () => mockCachedMe),
}));

jest.mock('../../database', () => ({
  getCompletedWorkoutStartTimestamps: jest.fn(async () => []),
  getActivePlan: jest.fn(async () => null),
  getRoutinesForPlan: jest.fn(async () => []),
  // migrate_172 (blueprint section 4, CR-05): loadConsistency's third
  // read, the PR count over the trailing 28 days. Defaults to 0 (a real,
  // present count) so every pre-existing test below -- none of which
  // cares about PRs -- sees a finite value rather than tripping the
  // "read failed" null path by accident.
  getPRCountInWindow: jest.fn(async () => 0),
  // `loadTrainingProfile` (trainingProfile.js) also reads these two;
  // publishConsistency composes that function, so they need a stub too.
  getWorkoutSetsSince: jest.fn(async () => []),
  getAllExercises: jest.fn(async () => []),
}));

let mockEdSuppressed = false;
jest.mock('../../../hooks/usePhotoSuppression', () => ({
  readEdOrCalmSuppressed: jest.fn(async () => mockEdSuppressed),
}));

const db = require('../../database');
const {
  getCompletedWorkoutStartTimestamps, getActivePlan, getRoutinesForPlan, getPRCountInWindow,
} = db;
const {
  computeConsistency, consistencyGateState, sessionShareGateState,
  publishConsistency, publishSharingSettings, loadConsistency,
  NO_PLAN_CONSISTENT_THRESHOLD, PR_WINDOW_DAYS,
  setSharingPublishPending, retryPendingSharingPublish,
} = require('../trainingConsistency');
const { shareablePayload, TP_DEFAULT_SHARE, writeShareSettings } = require('../trainingProfile');

// Monday 2026-09-07 06:00 local. Every fixed-clock test below is expressed
// relative to this so the week/month boundaries in the assertions are
// legible against a real calendar.
const MON = new Date(2026, 8, 7, 6, 0, 0).getTime();

function at(dayOffset, hour = 12) {
  const d = new Date(MON);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

beforeEach(() => {
  mockStore.clear();
  mockCallCommunity.mockClear();
  mockCachedMe = { is_minor: false };
  mockEdSuppressed = false;
  getCompletedWorkoutStartTimestamps.mockClear();
  getActivePlan.mockReset().mockResolvedValue(null);
  getRoutinesForPlan.mockReset().mockResolvedValue([]);
  getPRCountInWindow.mockReset().mockResolvedValue(0);
});

describe('computeConsistency: week/month boundaries', () => {
  test('a Sunday-night session belongs to LAST week, not this week', () => {
    // Sunday before MON, 23:00 local -> the week ending at MON 00:00.
    const sundayNight = at(-1, 23);
    const out = computeConsistency({ workouts: [sundayNight], now: MON });
    expect(out.c_sessions_week).toBe(0);
  });

  test('a Monday-morning session belongs to THIS week', () => {
    const mondayMorning = at(0, 6);
    const out = computeConsistency({ workouts: [mondayMorning], now: MON });
    expect(out.c_sessions_week).toBe(1);
  });

  test('sessions on the last day of a month do not spill into next month', () => {
    const lastDayAugust = new Date(2026, 7, 31, 23, 0, 0).getTime();
    const firstDaySeptember = new Date(2026, 8, 1, 0, 30, 0).getTime();
    const now = new Date(2026, 8, 1, 12, 0, 0).getTime();
    const out = computeConsistency({ workouts: [lastDayAugust, firstDaySeptember], now });
    expect(out.c_sessions_month).toBe(1);
  });
});

describe('computeConsistency: trained days and last trained day', () => {
  test('trained days this week are weekday keys, in week order, deduped', () => {
    const out = computeConsistency({
      workouts: [at(0), at(0, 18), at(2), at(4)], now: MON,
    });
    expect(out.c_trained_days_week).toEqual(['mon', 'wed', 'fri']);
  });

  test('last trained day is the most recent session, as a local day key', () => {
    const out = computeConsistency({ workouts: [at(-7), at(0), at(2)], now: MON });
    expect(out.c_last_trained_day).toBe('2026-09-09');
  });

  test('no sessions: empty trained days, null last trained day', () => {
    const out = computeConsistency({ workouts: [], now: MON });
    expect(out.c_trained_days_week).toEqual([]);
    expect(out.c_last_trained_day).toBeNull();
  });
});

describe('computeConsistency: streak', () => {
  test('a session every week for 3 weeks, including this week: streak 3', () => {
    const out = computeConsistency({
      workouts: [at(0), at(-7), at(-14)], now: MON,
    });
    expect(out.c_weeks_streak).toBe(3);
  });

  test('nothing yet this week but last week trained: streak counts from last week', () => {
    const out = computeConsistency({ workouts: [at(-3)], now: MON });
    expect(out.c_weeks_streak).toBe(1);
  });

  test('a missed week breaks the streak', () => {
    // This week and last week trained, the week before that empty.
    const out = computeConsistency({ workouts: [at(0), at(-7)], now: MON });
    expect(out.c_weeks_streak).toBe(2);
  });

  test('nothing this week or last week: streak 0', () => {
    const out = computeConsistency({ workouts: [at(-21)], now: MON });
    expect(out.c_weeks_streak).toBe(0);
  });
});

describe('computeConsistency: planned pct 4w and consistent weeks 12w', () => {
  test('no plan: planned pct is null', () => {
    const out = computeConsistency({ workouts: [at(0)], plan: null, now: MON });
    expect(out.c_planned_pct_4w).toBeNull();
  });

  test('with a plan: completed / (days-per-week * 4), capped at 100', () => {
    // 3-day plan, 12 sessions across the 4-week window = 100%, capped.
    const workouts = [
      at(0), at(1), at(2),
      at(-7), at(-6), at(-5),
      at(-14), at(-13), at(-12),
      at(-21), at(-20), at(-19),
      at(-25), // one extra, still capped at 100
    ];
    const out = computeConsistency({ workouts, plan: { daysPerWeek: 3 }, now: MON });
    expect(out.c_planned_pct_4w).toBe(100);
  });

  test('a partial 4-week showing reads as a partial percentage', () => {
    // 3-day plan, 3 sessions in the 4-week window = 25%.
    const out = computeConsistency({
      workouts: [at(0), at(1), at(2)], plan: { daysPerWeek: 3 }, now: MON,
    });
    expect(out.c_planned_pct_4w).toBe(25);
  });

  test('no plan: a week counts as consistent at 2 sessions', () => {
    expect(NO_PLAN_CONSISTENT_THRESHOLD).toBe(2);
    const out = computeConsistency({
      workouts: [at(0), at(1), at(-7)], plan: null, now: MON,
    });
    expect(out.c_consistent_weeks_12w).toBe(1);
  });

  test('with a plan: a week must meet the plan\'s days per week', () => {
    const out = computeConsistency({
      workouts: [at(0), at(1)], plan: { daysPerWeek: 3 }, now: MON,
    });
    expect(out.c_consistent_weeks_12w).toBe(0);
  });
});

describe('computeConsistency: c_weeks_history (design 60 §4, D4)', () => {
  test('always 8 entries, oldest first, ending with the current week', () => {
    // One session in each of weeks -7..0 except week -3 (nothing that
    // week), across the August/September month boundary (MON is 2026-09-07,
    // so week -4 starts in August) to pin the Monday-start week walk keeps
    // working across a calendar month.
    const workouts = [at(0), at(-7), at(-14), at(-21), at(-28), at(-42), at(-49)];
    const out = computeConsistency({ workouts, now: MON });
    expect(out.c_weeks_history).toHaveLength(8);
    // Oldest first: index 0 is 7 weeks ago, index 7 is this week.
    expect(out.c_weeks_history[7]).toBe(1); // this week (at(0))
    expect(out.c_weeks_history[6]).toBe(1); // last week (at(-7))
    expect(out.c_weeks_history[5]).toBe(1); // 2 weeks ago (at(-14))
    expect(out.c_weeks_history[4]).toBe(1); // 3 weeks ago (at(-21))
    expect(out.c_weeks_history[3]).toBe(1); // 4 weeks ago (at(-28), crosses into August)
    expect(out.c_weeks_history[2]).toBe(0); // 5 weeks ago: nothing
    expect(out.c_weeks_history[1]).toBe(1); // 6 weeks ago (at(-42))
    expect(out.c_weeks_history[0]).toBe(1); // 7 weeks ago (at(-49))
  });

  test('a week with several sessions counts them all, not capped to one', () => {
    const out = computeConsistency({ workouts: [at(0), at(1), at(2)], now: MON });
    expect(out.c_weeks_history[7]).toBe(3);
  });

  test('no sessions at all: eight zeroes, never an empty or short array', () => {
    const out = computeConsistency({ workouts: [], now: MON });
    expect(out.c_weeks_history).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('the ED/calm/minor gate', () => {
  test('allowed when the toggle is on and nothing gates it', async () => {
    const out = await consistencyGateState('u1', true);
    expect(out).toEqual({ allowed: true, gated: false, isMinor: false });
  });

  test('refused when the toggle is off, regardless of the gate', async () => {
    const out = await consistencyGateState('u1', false);
    expect(out.allowed).toBe(false);
  });

  test('refused under calm mode / an open ED-pattern flag even with the toggle on', async () => {
    mockEdSuppressed = true;
    const out = await consistencyGateState('u1', true);
    expect(out).toEqual({ allowed: false, gated: true, isMinor: false });
  });

  test('refused for a minor even with the toggle on', async () => {
    mockCachedMe = { is_minor: true };
    const out = await consistencyGateState('u1', true);
    expect(out.allowed).toBe(false);
    expect(out.isMinor).toBe(true);
  });

  test('an unreadable `me` fails CLOSED (treated as a minor)', async () => {
    mockCachedMe = null;
    const out = await consistencyGateState('u1', true);
    expect(out.isMinor).toBe(true);
    expect(out.allowed).toBe(false);
  });
});

describe('sessionShareGateState (phase3 spec section 2): the ED/calm gate, WITHOUT the minor exclusion', () => {
  test('allowed when the toggle is on and nothing gates it', async () => {
    expect(await sessionShareGateState('u1', true)).toEqual({ allowed: true, gated: false });
  });

  test('refused when the toggle is off', async () => {
    expect((await sessionShareGateState('u1', false)).allowed).toBe(false);
  });

  test('refused under calm mode / an open ED-pattern flag', async () => {
    mockEdSuppressed = true;
    expect(await sessionShareGateState('u1', true)).toEqual({ allowed: false, gated: true });
  });

  test('a minor is NOT excluded here (unlike consistencyGateState): sharing what they did is allowed, only the audience narrows elsewhere', async () => {
    mockCachedMe = { is_minor: true };
    expect((await sessionShareGateState('u1', true)).allowed).toBe(true);
  });
});

describe('loadConsistency: c_planned_per_week rides alongside the eight counters', () => {
  test('null without a plan', async () => {
    const out = await loadConsistency('u1', { nowMs: MON });
    expect(out.c_planned_per_week).toBeNull();
  });

  test('the plan\'s routine count, with a plan', async () => {
    getActivePlan.mockResolvedValue({ id: 'plan1' });
    getRoutinesForPlan.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]);
    const out = await loadConsistency('u1', { nowMs: MON });
    expect(out.c_planned_per_week).toBe(3);
  });
});

describe('loadConsistency: c_prs_4w rides alongside the other counters (migrate_172, CR-05)', () => {
  test('carries whatever getPRCountInWindow answers', async () => {
    getPRCountInWindow.mockResolvedValue(3);
    const out = await loadConsistency('u1', { nowMs: MON });
    expect(out.c_prs_4w).toBe(3);
  });

  test('a genuine zero is carried as 0, not null', async () => {
    getPRCountInWindow.mockResolvedValue(0);
    const out = await loadConsistency('u1', { nowMs: MON });
    expect(out.c_prs_4w).toBe(0);
  });

  test('a thrown read yields null, never a zero', async () => {
    getPRCountInWindow.mockRejectedValue(new Error('sqlite busy'));
    const out = await loadConsistency('u1', { nowMs: MON });
    expect(out.c_prs_4w).toBeNull();
  });

  test('reads the trailing PR_WINDOW_DAYS window ending now, the same userId as the other reads', async () => {
    expect(PR_WINDOW_DAYS).toBe(28);
    await loadConsistency('u1', { nowMs: MON });
    expect(getPRCountInWindow).toHaveBeenCalledWith('u1', MON - 28 * 24 * 60 * 60 * 1000, MON);
  });
});

describe('publishSharingSettings: share_sessions/sessions_audience/c_planned_per_week -> community_upsert_profile', () => {
  test('sends share_sessions and sessions_audience to a DIFFERENT RPC from the bands', async () => {
    const out = await publishSharingSettings('u1', { share_sessions: true, sessions_audience: 'everyone', consistency: false });
    expect(out.sent).toBe(true);
    expect(mockCallCommunity).toHaveBeenCalledWith('community_upsert_profile', {
      _p: { share_sessions: true, sessions_audience: 'everyone', c_planned_per_week: null },
      _remove_shared: false,
    });
  });

  test('_remove_shared travels through when asked', async () => {
    await publishSharingSettings('u1', { share_sessions: false, sessions_audience: 'followers' }, { removeShared: true });
    expect(mockCallCommunity).toHaveBeenCalledWith('community_upsert_profile', expect.objectContaining({
      _remove_shared: true,
    }));
  });

  test('c_planned_per_week only travels when consistency sharing is allowed (gated behind share_consistency, not share_sessions)', async () => {
    getActivePlan.mockResolvedValue({ id: 'plan1' });
    getRoutinesForPlan.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);

    await publishSharingSettings('u1', { share_sessions: true, sessions_audience: 'followers', consistency: false });
    expect(mockCallCommunity.mock.calls.at(-1)[1]._p.c_planned_per_week).toBeNull();

    mockCallCommunity.mockClear();
    await publishSharingSettings('u1', { share_sessions: true, sessions_audience: 'followers', consistency: true });
    expect(mockCallCommunity.mock.calls.at(-1)[1]._p.c_planned_per_week).toBe(2);
  });

  test('a refused send answers sent:false with the code', async () => {
    mockCallCommunity.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }));
    const out = await publishSharingSettings('u1', { share_sessions: true, sessions_audience: 'followers' });
    expect(out).toEqual({ sent: false, reason: 'offline' });
  });
});

// F4 (fresh-eyes review): CommunityTrainingProfileScreen.saveSharing marks
// a publish as owed on failure; this is the retry half, exercised against
// the real module (only transport/database/profile/photoSuppression and
// AsyncStorage are mocked).
describe('setSharingPublishPending / retryPendingSharingPublish (F4 fix): a failed publish is retried, never lost', () => {
  test('nothing pending: a no-op, no RPC call', async () => {
    const out = await retryPendingSharingPublish('u1');
    expect(out).toEqual({ sent: false, reason: 'nothing_pending' });
    expect(mockCallCommunity).not.toHaveBeenCalled();
  });

  test('pending: retries with the currently-saved settings and clears the flag on success', async () => {
    await writeShareSettings('u1', { ...TP_DEFAULT_SHARE, share_sessions: true, sessions_audience: 'everyone' });
    await setSharingPublishPending('u1', true);

    const out = await retryPendingSharingPublish('u1');

    expect(out.sent).toBe(true);
    expect(mockCallCommunity).toHaveBeenCalledWith('community_upsert_profile', expect.objectContaining({
      _p: expect.objectContaining({ share_sessions: true, sessions_audience: 'everyone' }),
    }));
    // Cleared: a further retry finds nothing owed, and sends nothing again.
    mockCallCommunity.mockClear();
    const again = await retryPendingSharingPublish('u1');
    expect(again).toEqual({ sent: false, reason: 'nothing_pending' });
    expect(mockCallCommunity).not.toHaveBeenCalled();
  });

  test('a further failure keeps the flag set, so the next foreground tries again', async () => {
    await writeShareSettings('u1', { ...TP_DEFAULT_SHARE, share_sessions: false, sessions_audience: 'followers' });
    await setSharingPublishPending('u1', true);
    mockCallCommunity.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }));

    const out = await retryPendingSharingPublish('u1');
    expect(out.sent).toBe(false);

    const again = await retryPendingSharingPublish('u1');
    expect(again.sent).toBe(true);
  });

  // Lead review 2026-09-11: the removal intent survives the failure. A
  // failed "turn off and remove what I already shared" retries WITH the
  // removal, never as a bare turn-off.
  test('a pending removal retries with _remove_shared true', async () => {
    await writeShareSettings('u1', { ...TP_DEFAULT_SHARE, share_sessions: false, sessions_audience: 'followers' });
    await setSharingPublishPending('u1', true, { removeShared: true });
    const out = await retryPendingSharingPublish('u1');
    expect(out.sent).toBe(true);
    expect(mockCallCommunity).toHaveBeenCalledWith('community_upsert_profile', expect.objectContaining({
      _remove_shared: true,
    }));
  });

  test('a pending turn-off without removal retries with _remove_shared false, and a legacy bare flag too', async () => {
    await writeShareSettings('u1', { ...TP_DEFAULT_SHARE, share_sessions: false, sessions_audience: 'followers' });
    await setSharingPublishPending('u1', true);
    await retryPendingSharingPublish('u1');
    expect(mockCallCommunity).toHaveBeenCalledWith('community_upsert_profile', expect.objectContaining({
      _remove_shared: false,
    }));
    mockCallCommunity.mockClear();
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('@volyume_community_sharing_pending_u1', '1');
    await retryPendingSharingPublish('u1');
    expect(mockCallCommunity).toHaveBeenCalledWith('community_upsert_profile', expect.objectContaining({
      _remove_shared: false,
    }));
  });

  test('setSharingPublishPending(uid, false) clears an owed retry directly', async () => {
    await setSharingPublishPending('u1', true);
    await setSharingPublishPending('u1', false);
    const out = await retryPendingSharingPublish('u1');
    expect(out).toEqual({ sent: false, reason: 'nothing_pending' });
  });
});

describe('shareablePayload: share_consistency always travels as a boolean', () => {
  const counters = {
    c_sessions_week: 3, c_sessions_month: 10, c_weeks_streak: 4,
    c_planned_pct_4w: 75, c_consistent_weeks_12w: 8,
    c_trained_days_week: ['mon', 'wed'], c_last_trained_day: '2026-09-09',
    c_weeks_history: [0, 1, 2, 1, 0, 3, 2, 3],
    c_updated_at: MON,
  };

  test('toggle off: share_consistency false, no counters', () => {
    const p = shareablePayload({}, { ...TP_DEFAULT_SHARE, consistency: false }, {
      consistencyCounters: counters,
    });
    expect(p.share_consistency).toBe(false);
    expect(p.c_sessions_week).toBeUndefined();
    expect(p.c_weeks_history).toBeUndefined();
  });

  test('toggle on, not gated: share_consistency true, counters present', () => {
    const p = shareablePayload({}, { ...TP_DEFAULT_SHARE, consistency: true }, {
      consistencyCounters: counters,
    });
    expect(p.share_consistency).toBe(true);
    expect(p.c_sessions_week).toBe(3);
    expect(p.c_trained_days_week).toEqual(['mon', 'wed']);
    expect(p.c_weeks_history).toEqual([0, 1, 2, 1, 0, 3, 2, 3]);
  });

  test('toggle on but gated (calm/ED/minor): share_consistency false, no counters', () => {
    const p = shareablePayload({}, { ...TP_DEFAULT_SHARE, consistency: true }, {
      consistencyCounters: counters, consistencyGated: true,
    });
    expect(p.share_consistency).toBe(false);
    expect(p.c_sessions_week).toBeUndefined();
  });
});

describe('publishConsistency: the merged RPC call', () => {
  test('sends share_consistency:false and no counters when gated', async () => {
    mockEdSuppressed = true;
    getCompletedWorkoutStartTimestamps.mockResolvedValue([MON]);
    const { publishConsistency: publish } = require('../trainingConsistency');
    // Turn the toggle on first so the only thing refusing the send is the gate.
    const { writeShareSettings } = require('../trainingProfile');
    await writeShareSettings('u1', { ...TP_DEFAULT_SHARE, consistency: true });
    const out = await publish('u1', { nowMs: MON });
    expect(out.sent).toBe(true);
    expect(out.payload.share_consistency).toBe(false);
    expect(out.payload.c_sessions_week).toBeUndefined();
    expect(mockCallCommunity).toHaveBeenCalledWith(
      'community_update_training_profile', { _p: out.payload },
    );
  });

  test('sends the counters merged into the payload when allowed', async () => {
    getCompletedWorkoutStartTimestamps.mockResolvedValue([MON]);
    const { writeShareSettings } = require('../trainingProfile');
    await writeShareSettings('u1', { ...TP_DEFAULT_SHARE, consistency: true });
    const out = await publishConsistency('u1', { nowMs: MON });
    expect(out.sent).toBe(true);
    expect(out.payload.share_consistency).toBe(true);
    expect(out.payload.c_sessions_week).toBe(1);
  });
});
