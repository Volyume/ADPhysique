/**
 * notificationSuppression.test.js — Campaign 21 Step 12 closure,
 * SCREEN/PERSISTENCE lane, GAP B.
 *
 * X-SAFETY-06 names five independent fail-closed ED/calm suppression sites
 * in src/lib/notifications/scheduler.js (:893, :1031, :1151, :1245, :1813 —
 * pinned structurally in src/lib/notifications/__tests__/
 * scheduler.edSuppression.guard.test.js). Before this file, only the
 * winback site (:893) had a mocked-IO behavioural test proving the
 * suppression actually WORKS end to end, not just that the source wires it
 * up (scenarios.conflict.test.js, "CFL-20: X-SAFETY-06 notification
 * suppression fails CLOSED on a read error").
 *
 * This file exercises a SECOND site with the identical mocked-IO
 * discipline that suite uses (mock ONLY the DB/OS I/O boundary --
 * getOpenEdPatternFlag, AsyncStorage, expo-notifications -- never the
 * decision logic itself): schedulePlannedMealConfirm, the food-push site
 * at scheduler.js:1245 ("Open ED/wellbeing flag -> never lay (a food push
 * at a flagged user is the harm pattern, exactly as CHECKIN_MISSED /
 * ED_PATTERN_LOCKOUT)"). This is a genuinely separate call path from
 * winback: no calm-mode read, a Pro-tier gate, an AsyncStorage prefs
 * toggle, and a self-suppress check (only nudges when today actually has
 * unconfirmed planned meals) all sit around the same ED-flag fail-closed
 * core, so this proves the pattern generalises rather than being special
 * to the one site already covered.
 *
 * New file -- src/__tests__/coachValidation/scenarios.conflict.test.js and
 * every scenarios.*.data.js file are owned by other agents on this
 * campaign and are untouched here.
 */

describe('X-SAFETY-06 (second site): schedulePlannedMealConfirm fails CLOSED on a read error', () => {
  let mockScheduleAsync;
  let mockCancelAsync;
  let mockGetEd;
  let mockGetFoodEntriesForDay;
  let schedulePlannedMealConfirm;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));

    mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
    mockCancelAsync = jest.fn(() => Promise.resolve());
    jest.doMock('expo-notifications', () => ({
      scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
      cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
      cancelAllScheduledNotificationsAsync: () => Promise.resolve(),
      // requestEventPushSlot (the real, unmocked budget.js) reads this to
      // decide occupancy; leaving it undefined makes the read throw and the
      // budget fail OPEN (same allowance scenarios.conflict.test.js relies
      // on) -- budget behaviour is not what this test is about.
      SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' },
    }));

    mockGetEd = jest.fn();
    jest.doMock('../../lib/database', () => ({
      getOpenEdPatternFlag: (...a) => mockGetEd(...a),
    }));

    mockGetFoodEntriesForDay = jest.fn(() => Promise.resolve([
      { id: 'e1', is_planned: 1, meal_slot: 'breakfast' },
    ]));
    jest.doMock('../../lib/food/db', () => ({
      getFoodEntriesForDay: (...a) => mockGetFoodEntriesForDay(...a),
    }));

    jest.doMock('../../lib/dayKey', () => ({
      todayLocalKey: () => '2026-08-16',
      localWeekStartMs: () => 0,
    }));

    jest.doMock('../../lib/notifications/telemetry', () => ({ trackNotificationFailed: jest.fn() }));
    jest.doMock('../../lib/notifications/quietHours', () => ({
      getQuietHours: () => Promise.resolve({ enabled: false }),
      shiftDateOutOfQuietHours: (date) => ({ date }),
      shiftHourMinuteOutOfQuietHours: (hour, minute) => ({ hour, minute }),
    }));
    jest.doMock('../../lib/notifications/channels', () => ({ COACHING_REMINDERS_CHANNEL: 'coaching' }));
    jest.doMock('../../store/useAppStore', () => ({
      __esModule: true,
      default: { getState: () => ({ tier: 'pro', user: { id: 'u1' }, userProfile: null }) },
    }));

    // eslint-disable-next-line global-require
    schedulePlannedMealConfirm = require('../../lib/notifications/scheduler').schedulePlannedMealConfirm;
  });

  beforeEach(() => {
    mockScheduleAsync.mockClear();
    mockCancelAsync.mockClear();
    mockGetFoodEntriesForDay.mockClear();
    mockGetFoodEntriesForDay.mockResolvedValue([{ id: 'e1', is_planned: 1, meal_slot: 'breakfast' }]);
  });

  afterAll(() => { jest.resetModules(); jest.dontMock('react-native'); });

  test('a REJECTED ED-flag read maps to the fail-closed sentinel: never scheduled, existing schedule cancelled', async () => {
    mockGetEd.mockRejectedValue(new Error('db unavailable'));
    await schedulePlannedMealConfirm('u1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockCancelAsync).toHaveBeenCalled();
    // The self-suppress food read must never even be reached once the ED
    // gate has already decided to suppress -- confirms the gate runs FIRST,
    // not merely that the outcome happens to agree.
    expect(mockGetFoodEntriesForDay).not.toHaveBeenCalled();
  });

  test('a resolved-but-truthy ED flag also suppresses (the ordinary open-flag path, for contrast)', async () => {
    mockGetEd.mockResolvedValue({ id: 'flag' });
    await schedulePlannedMealConfirm('u1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockGetFoodEntriesForDay).not.toHaveBeenCalled();
  });

  test('no read error, no ED flag, unconfirmed planned meals today: the food push schedules normally (control)', async () => {
    mockGetEd.mockResolvedValue(null);
    await schedulePlannedMealConfirm('u1');
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  });

  test('no read error, no ED flag, but nothing unconfirmed today: self-suppresses independently of the ED gate', async () => {
    mockGetEd.mockResolvedValue(null);
    mockGetFoodEntriesForDay.mockResolvedValue([]);
    await schedulePlannedMealConfirm('u1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });
});
