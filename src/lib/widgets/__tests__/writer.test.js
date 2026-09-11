/**
 * COMP-019 widget writer — gather logic (the OTA brains' feeder). Asserts that
 * consistency is suppressed under an open ED flag and that no body data is
 * ever gathered (privacy: home screen is semi-public).
 *
 * dayLabel is pinned NULL: founder ruling 2026-08-03, the product has no
 * scheduled training days, so the widget never makes a day claim
 * (docs/audit/cross-surface-consistency-audit-2026-07-30.md, "SUPERSEDED
 * SAME DAY").
 */
jest.mock('../../database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getWeeklySessionStats: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
}));
jest.mock('../storage', () => ({ persistWidgetSnapshot: jest.fn().mockResolvedValue(true) }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('../friends', () => ({
  readCachedFriends: jest.fn(),
  fetchFriendsTrainedToday: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const db = require('../../database');
const { persistWidgetSnapshot } = require('../storage');
const { readCachedFriends, fetchFriendsTrainedToday } = require('../friends');
const { todayLocalKey } = require('../../dayKey');
const { gatherWidgetInputs, writeWidgetSnapshot, FRIENDS_REFRESH_MIN_MS } = require('../writer');


beforeEach(() => {
  jest.clearAllMocks();
  db.getActivePlan.mockResolvedValue({ id: 'plan1', name: 'Hypertrophy A' });
  db.getRoutinesForPlan.mockResolvedValue([{ name: 'Push' }, { name: 'Pull' }, { name: 'Legs' }, { name: 'Upper' }]);
  db.getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 2, plannedWeeks: 5 });
  db.getWeeklySessionStats.mockResolvedValue({ completed: 2, planned: 4 });
  db.getOpenEdPatternFlag.mockResolvedValue(null);
  AsyncStorage.getItem.mockResolvedValue(null); // wellbeing unspecified
  // CR-14 defaults: no cached friends, no fetched friends -- existing
  // tests below (none of which care about friends) stay unaffected.
  readCachedFriends.mockResolvedValue(null);
  fetchFriendsTrainedToday.mockResolvedValue(null);
});

describe('gatherWidgetInputs', () => {
  test('builds next session with a routine name + week-in-block, no body data', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.name).toBe('Push');
    // X17 (cross-surface-consistency-audit-2026-07-30): the widget added its
    // own +1 on top of getCurrentMesocycleWeek's already 1-indexed
    // weekIndex; re-anchored to the fixed, non-off-by-one value (weekIndex
    // 2 from the mock above -> week 2, not 3).
    expect(inputs.nextSession.weekInBlock).toEqual({ week: 2, total: 5 });
    expect(inputs.consistency).toEqual({ completed: 2, planned: 4 });
    // Privacy: the gathered object carries nothing weight/calorie/body-shaped.
    expect(JSON.stringify(inputs)).not.toMatch(/weight|kcal|calorie|macro|bodyfat/i);
  });

  test('never claims a training day: dayLabel is null (founder 2026-08-03)', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.dayLabel).toBeNull();
  });

  test('a finished block (awaitingDecision) never claims a live week-in-block (Stage 1, 2026-08-09)', async () => {
    db.getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 5, plannedWeeks: 5, awaitingDecision: true });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.weekInBlock).toBeNull();
    // The rest of the session card is unaffected: name still renders.
    expect(inputs.nextSession.name).toBe('Push');
  });

  test('an open ED flag sets edFlagOpen (snapshot then suppresses consistency)', async () => {
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.edFlagOpen).toBe(true);
  });

  // RE-PINNED (Today truth repair, founder Ruling 1): the widget carried a
  // "N weeks running" line mirroring the solo run's persisted high-water.
  // The weekly run/streak construct is rejected product-wide, so the widget
  // no longer reads streak state at all - it publishes the factual session
  // count only. T1's cross-surface concern is moot: there is no second
  // surface left to disagree with.
  test('the widget publishes no streak figure and never reads streak state', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.consistency).not.toHaveProperty('streakWeeks');
    expect(JSON.stringify(inputs)).not.toMatch(/streak/i);
    // The factual half is untouched.
    expect(inputs.consistency.completed).toBe(2);
    expect(inputs.consistency.planned).toBe(4);
  });

  test('calm mode suppresses like an open flag; a failed wellbeing read fails closed', async () => {
    AsyncStorage.getItem.mockResolvedValue('calm');
    expect((await gatherWidgetInputs('u1')).edFlagOpen).toBe(true);
    AsyncStorage.getItem.mockRejectedValue(new Error('fs down'));
    expect((await gatherWidgetInputs('u1')).edFlagOpen).toBe(true);
  });

  // D112 R2 (closes audit T2-16): consistency.planned now reads the
  // EFFECTIVE planned figure (CC29, getWeeklySessionStats' own planned),
  // not a raw routine count - §18 claimed this already, it did not.
  describe('T2-16: the effective planned figure flows through, not a raw routine count', () => {
    test('a constrained week: 4 routines exist, but the effective planned figure is 3 (one session fully blocked) - the widget shows 3, not 4', async () => {
      db.getWeeklySessionStats.mockResolvedValue({ completed: 3, planned: 3, plannedIsEstimate: false });
      const inputs = await gatherWidgetInputs('u1');
      // db.getRoutinesForPlan's mock (beforeEach) still returns 4 routines -
      // the widget's own routines read is no longer what planned derives
      // from; it defers entirely to the stats function's own figure.
      expect(inputs.consistency).toEqual({ completed: 3, planned: 3 });
    });

    test('plannedIsEstimate true (no active plan, trailing-average fallback): the honest null denominator stands (RD6-9)', async () => {
      db.getWeeklySessionStats.mockResolvedValue({ completed: 2, planned: 3, plannedIsEstimate: true });
      const inputs = await gatherWidgetInputs('u1');
      expect(inputs.consistency).toEqual({ completed: 2, planned: null });
    });

    test('a getWeeklySessionStats read failure never smuggles a raw routine count in as the denominator', async () => {
      db.getWeeklySessionStats.mockRejectedValue(new Error('db down'));
      const inputs = await gatherWidgetInputs('u1');
      // The catch fallback marks itself an estimate too, so a read failure
      // reads the same honest "cannot say" as the no-plan case, never a
      // bare zero presented as a real prescribed count.
      expect(inputs.consistency).toEqual({ completed: 0, planned: null });
    });
  });
});

describe('writeWidgetSnapshot', () => {
  test('persists a built snapshot; consistency dropped under an ED flag', async () => {
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' });
    const snap = await writeWidgetSnapshot('u1');
    expect(persistWidgetSnapshot).toHaveBeenCalledWith(snap);
    expect(snap.consistency).toBeNull();       // suppressed
    expect(snap.nextSession.name).toBe('Push'); // neutral content still shows
  });

  test('never throws on a gather failure', async () => {
    db.getActivePlan.mockRejectedValue(new Error('db down'));
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.v).toBe(1);
  });
});

// CR-14 (24-PHASE4-SPEC.md section 3): pins gatherWidgetInputs' local cache
// read. Written to FAIL against a wrong implementation: the cache is
// carried through ONLY when its own dayKey is today; a stale or absent
// cache never leaks into the built snapshot.
describe('gatherWidgetInputs: the friends cache (CR-14)', () => {
  test('a cache dated today is carried through as {dayKey, count}', async () => {
    readCachedFriends.mockResolvedValue({ dayKey: todayLocalKey(), count: 2, fetchedAt: Date.now() });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.friends).toEqual({ dayKey: todayLocalKey(), count: 2 });
  });

  test('a stale (not today) cached dayKey is never carried through', async () => {
    readCachedFriends.mockResolvedValue({ dayKey: '2020-01-01', count: 5, fetchedAt: Date.now() });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.friends).toBeNull();
  });

  test('no cache at all: friends is null', async () => {
    readCachedFriends.mockResolvedValue(null);
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.friends).toBeNull();
  });
});

// CR-14: pins writeWidgetSnapshot's best-effort second stage. Written to
// FAIL against a wrong implementation: refreshFriends:false makes no
// network call; a fetch failure never disturbs the already-persisted
// first snapshot; a changed count persists a second snapshot carrying it;
// an unchanged count persists only once.
describe('writeWidgetSnapshot: the friends refresh stage (CR-14)', () => {
  test('refreshFriends: false makes no network call', async () => {
    await writeWidgetSnapshot('u1', { refreshFriends: false });
    expect(fetchFriendsTrainedToday).not.toHaveBeenCalled();
  });

  test('refreshFriends defaults to true and calls the fetch with the user id', async () => {
    await writeWidgetSnapshot('u1');
    expect(fetchFriendsTrainedToday).toHaveBeenCalledWith('u1');
  });

  test('a fetch failure (resolves null) still leaves the first snapshot persisted, exactly once', async () => {
    fetchFriendsTrainedToday.mockResolvedValue(null);
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.nextSession.name).toBe('Push');
    expect(snap.friends).toBeNull();
    expect(persistWidgetSnapshot).toHaveBeenCalledTimes(1);
  });

  test('a thrown fetch error is swallowed and the first snapshot still stands', async () => {
    fetchFriendsTrainedToday.mockRejectedValue(new Error('offline'));
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.nextSession.name).toBe('Push');
    expect(snap.friends).toBeNull();
    expect(persistWidgetSnapshot).toHaveBeenCalledTimes(1);
  });

  // Review 2026-09-11 finding 7: the ED flag READ FAILURE is the fail-closed
  // hinge for the count and for the network stage. Pinned so a later edit
  // of that catch to `null` cannot pass silently.
  test('an ED flag read failure withholds the count and never runs the network stage', async () => {
    db.getOpenEdPatternFlag.mockRejectedValue(new Error('db down'));
    readCachedFriends.mockResolvedValue({ dayKey: todayLocalKey(), count: 2, fetchedAt: 0 });
    fetchFriendsTrainedToday.mockResolvedValue({ dayKey: todayLocalKey(), count: 5, fetchedAt: Date.now() });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.edFlagOpen).toBe(true);
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.friends).toBeNull();
    expect(fetchFriendsTrainedToday).not.toHaveBeenCalled();
  });

  // Review 2026-09-11 finding 6a: today's count fetched under fifteen
  // minutes ago is trusted; older, it is refreshed. Backgrounding is the
  // most frequent trigger and the board is rate-railed per call.
  test('a count fetched under fifteen minutes ago skips the network stage', async () => {
    readCachedFriends.mockResolvedValue({ dayKey: todayLocalKey(), count: 2, fetchedAt: Date.now() - 5 * 60 * 1000 });
    const snap = await writeWidgetSnapshot('u1');
    expect(fetchFriendsTrainedToday).not.toHaveBeenCalled();
    expect(snap.friends.count).toBe(2);
  });

  test('a count fetched more than fifteen minutes ago is refreshed', async () => {
    readCachedFriends.mockResolvedValue({ dayKey: todayLocalKey(), count: 2, fetchedAt: Date.now() - FRIENDS_REFRESH_MIN_MS - 1000 });
    fetchFriendsTrainedToday.mockResolvedValue({ dayKey: todayLocalKey(), count: 3, fetchedAt: Date.now() });
    const snap = await writeWidgetSnapshot('u1');
    expect(fetchFriendsTrainedToday).toHaveBeenCalledWith('u1');
    expect(snap.friends.count).toBe(3);
  });

  test('a stale (yesterday) cache never counts as recently fetched', async () => {
    readCachedFriends.mockResolvedValue({ dayKey: '2020-01-01', count: 2, fetchedAt: Date.now() });
    await writeWidgetSnapshot('u1');
    expect(fetchFriendsTrainedToday).toHaveBeenCalledWith('u1');
  });

  // Review 2026-09-11 finding 6b: overlapping writes are serialised, so the
  // second call gathers its inputs only after the first has fully settled
  // and an older count can never be persisted over a newer one.
  test('overlapping calls are serialised: the second gathers after the first persists', async () => {
    let release = null;
    persistWidgetSnapshot.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const first = writeWidgetSnapshot('u1');
    const second = writeWidgetSnapshot('u1');
    for (let i = 0; i < 50 && !release; i += 1) await Promise.resolve(); // eslint-disable-line no-await-in-loop
    expect(release).not.toBeNull();
    expect(db.getActivePlan).toHaveBeenCalledTimes(1);
    release(true);
    await first;
    await second;
    expect(db.getActivePlan).toHaveBeenCalledTimes(2);
    expect(persistWidgetSnapshot).toHaveBeenCalledTimes(2);
  });

  test('a failed run never blocks the next one', async () => {
    db.getActivePlan.mockRejectedValueOnce(new Error('sqlite closed'));
    await writeWidgetSnapshot('u1');
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.nextSession.name).toBe('Push');
  });

  test('a changed count persists a second snapshot carrying it', async () => {
    readCachedFriends.mockResolvedValue(null); // first stage: nothing cached yet
    fetchFriendsTrainedToday.mockResolvedValue({ dayKey: todayLocalKey(), count: 3, fetchedAt: Date.now() });
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.friends).toEqual({ dayKey: todayLocalKey(), count: 3, label: '3 friends trained today' });
    expect(persistWidgetSnapshot).toHaveBeenCalledTimes(2);
    expect(persistWidgetSnapshot).toHaveBeenLastCalledWith(snap);
  });

  test('under an open ED flag the network stage never runs (no fetch under the gate)', async () => {
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag1' });
    readCachedFriends.mockResolvedValue({ dayKey: todayLocalKey(), count: 2, fetchedAt: Date.now() });
    fetchFriendsTrainedToday.mockResolvedValue({ dayKey: todayLocalKey(), count: 5, fetchedAt: Date.now() });
    const snap = await writeWidgetSnapshot('u1');
    expect(fetchFriendsTrainedToday).not.toHaveBeenCalled();
    expect(snap.friends).toBeNull();
    expect(persistWidgetSnapshot).toHaveBeenCalledTimes(1);
  });

  test('under calm mode the network stage never runs either', async () => {
    AsyncStorage.getItem.mockResolvedValue('calm');
    fetchFriendsTrainedToday.mockResolvedValue({ dayKey: todayLocalKey(), count: 5, fetchedAt: Date.now() });
    const snap = await writeWidgetSnapshot('u1');
    expect(fetchFriendsTrainedToday).not.toHaveBeenCalled();
    expect(snap.friends).toBeNull();
    expect(persistWidgetSnapshot).toHaveBeenCalledTimes(1);
  });

  test('an unchanged count persists only once', async () => {
    readCachedFriends.mockResolvedValue({ dayKey: todayLocalKey(), count: 2, fetchedAt: Date.now() });
    fetchFriendsTrainedToday.mockResolvedValue({ dayKey: todayLocalKey(), count: 2, fetchedAt: Date.now() });
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.friends.count).toBe(2);
    expect(persistWidgetSnapshot).toHaveBeenCalledTimes(1);
  });
});
