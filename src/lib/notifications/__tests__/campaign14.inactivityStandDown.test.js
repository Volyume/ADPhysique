/**
 * campaign14.inactivityStandDown.test.js
 *
 * Campaign 14 Job 6 (open item R-16): the three-week inactivity STAND-DOWN on
 * the two routine weigh-in prompts (morning nudge + evening backstop).
 *
 * What this suite pins, and why:
 *
 *  (23) Under three weeks since the last completed training session, the
 *       existing weigh-in schedule still lays in full. The stand-down must
 *       never touch a user who is training; the boundary day itself fails
 *       open (a session ON day 21 still counts as training).
 *  (24) After three FULL weeks with no completed session, routine weigh-in
 *       reminder scheduling stands down: nothing is laid, and anything
 *       already laid is cancelled. The founder's rule is "stop repeated
 *       weight-adjacent prompting when the user is no longer actively using
 *       the training loop" -- not punishment, not a "you disappeared" event.
 *  (25) The stored preference is NEVER written, cleared or downgraded by the
 *       stand-down. Stand-down is "enabled but temporarily inactive", not
 *       "setting disabled", so Settings keeps showing the user's real choice
 *       and the return can resume it without them toggling anything.
 *  (26) A genuine completed-training return re-lays the existing schedule,
 *       and sends NOTHING about the return: no welcome-back notification, no
 *       new copy. The workout-finish flow is the path that carries it.
 *  (27) A user who opted OUT stays opted out across the return. The return
 *       path resumes a preference, it never invents one.
 *  (28) Every pre-existing gate survives untouched: the ED-flag schedule gate
 *       (which still fails CLOSED), the Pro tier gate, quiet hours and the OS
 *       permission gate. And the new gate FAILS OPEN on a history-read
 *       failure or absent history -- silently suppressing a reminder the user
 *       asked for is worse than one extra prompt.
 *
 * Behavioural pins run against the REAL scheduler and the REAL quiet-hours
 * module (AsyncStorage is the in-memory mock); only the OS layer, the DB, the
 * store, telemetry and the permission wrapper are mocked. The gate helpers
 * themselves are module-private, so the founder rules that cannot be observed
 * from behaviour alone (no preference write; the fail-open catch; the
 * calendar-day arithmetic; the finish-flow hook) are locked with
 * fs.readFileSync source guards in the repo's existing style.
 */

const fs = require('fs');
const path = require('path');

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const SCHEDULE_INPUT_TYPES = { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' };
const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
  getAllScheduledNotificationsAsync: () => Promise.resolve([]),
  cancelAllScheduledNotificationsAsync: () => Promise.resolve(),
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetEd = jest.fn(() => Promise.resolve(null));
const mockGetRecentCompleted = jest.fn(() => Promise.resolve([]));
jest.mock('../../database', () => ({
  getOpenEdPatternFlag: (...a) => mockGetEd(...a),
  getRecentCompletedWorkouts: (...a) => mockGetRecentCompleted(...a),
}));

jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

let mockTier = 'pro';
let mockUserId = 'u1';
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      user: mockUserId ? { id: mockUserId } : null,
      userProfile: null,
      tier: mockTier,
    }),
  },
}));

const mockPermission = jest.fn(() => Promise.resolve('granted'));
jest.mock('../permissions', () => ({
  getNotificationPermissionStatus: (...a) => mockPermission(...a),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const scheduler = require('../scheduler');

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';
const QUIET_HOURS_KEY = '@volyume_quiet_hours_v1';
const HORIZON = 14; // the C8 Work 5 bounded weigh-in horizon, one-shot per day

const SCHEDULER_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'scheduler.js'),
  'utf8',
);
const ACTIVE_WORKOUT_SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'screens', 'ActiveWorkoutScreen.js'),
  'utf8',
);

/** Executable text only: block and line comments removed, for the copy guards. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Epoch ms at midday, `days` LOCAL calendar days ago (matches the gate's own arithmetic). */
function daysAgoLocal(days) {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() - days, 12, 0, 0, 0).getTime();
}

/** The single completed-workout row shape getRecentCompletedWorkouts returns. */
function lastSessionAt(ms) {
  return [{ id: 'w1', isCompleted: true, startedAt: ms, endedAt: ms, createdAt: ms }];
}

const laidIds = () => mockScheduleAsync.mock.calls.map((c) => c[0]?.identifier);
const cancelledIds = () => mockCancelAsync.mock.calls.map((c) => c[0]);

const ENABLED_PREFS = Object.freeze({
  morningEnabled: true,
  morningHour: 7,
  morningMinute: 0,
  eveningHour: 19,
  eveningMinute: 30,
  checkinEnabled: false,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  mockScheduleAsync.mockReset();
  mockScheduleAsync.mockImplementation(() => Promise.resolve('id'));
  mockCancelAsync.mockReset();
  mockCancelAsync.mockImplementation(() => Promise.resolve());
  mockGetEd.mockReset();
  mockGetEd.mockImplementation(() => Promise.resolve(null));
  mockGetRecentCompleted.mockReset();
  mockGetRecentCompleted.mockImplementation(() => Promise.resolve([]));
  mockPermission.mockReset();
  mockPermission.mockImplementation(() => Promise.resolve('granted'));
  mockPlatformOS = 'android';
  mockTier = 'pro';
  mockUserId = 'u1';
});

// ─── (23) Under three weeks inactive: the schedule still lays ────────────────

describe('(23) under three weeks since the last completed session', () => {
  test('a session yesterday: the morning nudge lays its full bounded horizon', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(1)));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON);
    expect(laidIds()[0]).toBe('volyume_morning_weight_1');
  });

  test('a session yesterday: the evening backstop lays its full bounded horizon', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(1)));
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON);
    expect(laidIds()[0]).toBe('volyume_evening_weight_1');
  });

  test('20 days quiet is still inside the window: both prompts lay', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(20)));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON * 2);
  });

  test('the boundary day itself fails open: a session on day 21 still counts as training', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(21)));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON);
  });

  test('the stand-down horizon is three FULL weeks, never a shorter number', () => {
    expect(scheduler.WEIGH_IN_STAND_DOWN_DAYS).toBe(21);
    expect(SCHEDULER_SRC).toMatch(/WEIGH_IN_STAND_DOWN_DAYS\s*=\s*21;/);
  });
});

// ─── (24) Three full weeks inactive: stand down and cancel ───────────────────

describe('(24) three full weeks with no completed session', () => {
  test('the morning nudge is not laid at all', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(22)));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('the evening backstop is not laid at all', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(22)));
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('anything already laid is cancelled: the whole horizon of both ids', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(30)));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    const ids = cancelledIds();
    expect(ids).toContain('volyume_morning_weight'); // the legacy single id too
    for (let i = 1; i <= HORIZON; i += 1) {
      expect(ids).toContain(`volyume_morning_weight_${i}`);
      expect(ids).toContain(`volyume_evening_weight_${i}`);
    }
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('a months-long absence stays stood down (no drift back to prompting)', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(180)));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('both weigh-in schedulers carry the gate in source, after the ED gate', () => {
    const morning = SCHEDULER_SRC.slice(
      SCHEDULER_SRC.indexOf('export async function scheduleMorningWeightNotification'),
      SCHEDULER_SRC.indexOf('function eveningCopies'),
    );
    const evening = SCHEDULER_SRC.slice(
      SCHEDULER_SRC.indexOf('export async function scheduleEveningWeightReminder'),
      SCHEDULER_SRC.indexOf('export async function relayWeighInAfterTrainingReturn'),
    );
    for (const body of [morning, evening]) {
      expect(body).toMatch(/if \(await weighInEdFlagOpen\(\)\) return;/);
      expect(body).toMatch(/if \(!userInitiated && await weighInStandDown\(\)\) return;/);
      // The ED gate is never displaced by the new one.
      expect(body.indexOf('weighInEdFlagOpen()'))
        .toBeLessThan(body.indexOf('weighInStandDown()'));
    }
  });
});

// ─── (25) The stored preference is never touched ─────────────────────────────

describe('(25) stand-down never erases the user choice', () => {
  test('the stored preference blob is byte-identical after a stood-down lay', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    const before = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(40)));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    await scheduler.scheduleEveningWeightReminder(19, 30);
    const after = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    expect(after).toBe(before);
    expect(JSON.parse(after).morningEnabled).toBe(true);
  });

  test('Settings still reads morningEnabled: true while stood down', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(40)));
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled(); // still inactive
    expect(JSON.parse(await AsyncStorage.getItem(NOTIF_PREFS_KEY))).toEqual(ENABLED_PREFS);
  });

  test('source guard: the scheduler never writes the notification-preference key', () => {
    expect(SCHEDULER_SRC).toMatch(/const NOTIF_PREFS_KEY = '@volyume_notification_prefs';/);
    expect(SCHEDULER_SRC).not.toMatch(/setItem\(\s*NOTIF_PREFS_KEY/);
    expect(SCHEDULER_SRC).not.toMatch(/setItem\(\s*'@volyume_notification_prefs'/);
    expect(SCHEDULER_SRC).not.toMatch(/removeItem\(\s*NOTIF_PREFS_KEY/);
  });
});

// ─── (26) Return on a genuine completed session, silently ────────────────────

describe('(26) completed-training return', () => {
  test('a fresh completed session re-lays both prompts on the return path', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    const ids = laidIds();
    expect(ids).toContain('volyume_morning_weight_1');
    expect(ids).toContain('volyume_evening_weight_1');
    expect(ids).toHaveLength(HORIZON * 2);
  });

  test('the user does not have to toggle the setting off and on again', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    // Stood down for 40 days...
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(40)));
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    // ...then a session lands, with the preference never having been re-set.
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON * 2);
  });

  test('NOTHING is sent about the return: only the two routine weigh-in families lay', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    const stray = laidIds().filter(
      (id) => !/^volyume_(morning|evening)_weight_\d+$/.test(id || ''),
    );
    expect(stray).toEqual([]);
    // No immediate-fire push (a welcome-back would have no DATE trigger).
    mockScheduleAsync.mock.calls.forEach((c) => {
      expect(c[0].trigger.type).toBe(SCHEDULE_INPUT_TYPES.DATE);
      expect(c[0].trigger.date.getTime()).toBeGreaterThan(Date.now());
    });
  });

  test('the restored schedule is the EXISTING one: the user\'s own stored times', async () => {
    // Both times sit outside the default 22:00-07:00 quiet window, so what
    // lands is the user's own choice rather than a quiet-hours shift.
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({
      ...ENABLED_PREFS, morningHour: 8, morningMinute: 15, eveningHour: 20, eveningMinute: 45,
    }));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    const morning = mockScheduleAsync.mock.calls
      .find((c) => c[0].identifier === 'volyume_morning_weight_1')[0];
    const evening = mockScheduleAsync.mock.calls
      .find((c) => c[0].identifier === 'volyume_evening_weight_1')[0];
    expect(morning.trigger.date.getHours()).toBe(8);
    expect(morning.trigger.date.getMinutes()).toBe(15);
    expect(evening.trigger.date.getHours()).toBe(20);
    expect(evening.trigger.date.getMinutes()).toBe(45);
  });

  test('no new user-facing copy exists for the stand-down or the return', () => {
    // Comments are stripped first: the rules themselves are QUOTED in the
    // source comments ("not a 'you disappeared' event", "no welcome back to
    // weighing notification"), and quoting a rule must not read as shipping
    // copy. What matters is the executable text.
    const code = stripComments(SCHEDULER_SRC);
    expect(code).not.toMatch(/welcome back/i);
    expect(code).not.toMatch(/disappear/i);
    expect(code).not.toMatch(/been a while/i);
    // The return path itself sends nothing: it lays the existing schedule and
    // owns no content of its own.
    const relayStart = SCHEDULER_SRC.indexOf('export async function relayWeighInAfterTrainingReturn');
    const relay = SCHEDULER_SRC.slice(relayStart, SCHEDULER_SRC.indexOf('\n}\n', relayStart) + 3);
    expect(relay).not.toMatch(/scheduleNotificationAsync/);
    expect(relay).not.toMatch(/\btitle:/);
    expect(relay).not.toMatch(/\bbody:/);
  });

  test('the workout-finish flow is the path that carries the return', () => {
    const finish = ACTIVE_WORKOUT_SRC.slice(ACTIVE_WORKOUT_SRC.indexOf('async function doFinish()'));
    expect(finish).toMatch(
      /require\('\.\.\/lib\/notifications\/scheduler'\)\.relayWeighInAfterTrainingReturn\(\)/,
    );
    // It is fire-and-forget, exactly like the neighbouring post-finish hooks:
    // a notification re-lay must never block or fail the finish.
    expect(finish).toMatch(/relayWeighInAfterTrainingReturn\(\)\.catch\(\(\) => \{\}\);/);
    // And it runs only AFTER the completed session is committed, so the gate
    // reads the session that just landed.
    expect(finish.indexOf('isCompleted: true'))
      .toBeLessThan(finish.indexOf('relayWeighInAfterTrainingReturn'));
  });
});

// ─── (27) An opted-out user stays opted out ──────────────────────────────────

describe('(27) opted out stays opted out', () => {
  test('a completed-training return lays nothing when morningEnabled is false', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ ...ENABLED_PREFS, morningEnabled: false }));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('the return path never invents a preference for a user who has none', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(NOTIF_PREFS_KEY)).toBeNull();
  });

  test('the opted-out preference is left exactly as the user set it', async () => {
    const optedOut = { ...ENABLED_PREFS, morningEnabled: false };
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(optedOut));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(JSON.parse(await AsyncStorage.getItem(NOTIF_PREFS_KEY))).toEqual(optedOut);
  });
});

// ─── (28) Every existing gate survives; the new gate fails OPEN ──────────────

describe('(28) the existing gates still apply', () => {
  test('ED-safety: an open flag still withholds both prompts, even for an active trainer', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(1)));
    mockGetEd.mockResolvedValue({ id: 'flag-1', status: 'open' });
    await scheduler.scheduleMorningWeightNotification(7, 0);
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('ED-safety: the flag read still fails CLOSED (unchanged direction of travel)', async () => {
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(daysAgoLocal(1)));
    mockGetEd.mockRejectedValue(new Error('db down'));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('ED-safety: the return path cannot bypass the ED gate', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    mockGetEd.mockResolvedValue({ id: 'flag-1', status: 'open' });
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('tier: the return path keeps the Pro gate (a free user gets no coaching prompts)', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    mockTier = 'free';
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('permission: the return path lays nothing without OS permission', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    mockPermission.mockResolvedValue('denied');
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('quiet hours: a returning user\'s prompts are still shifted out of the window', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    await AsyncStorage.setItem(QUIET_HOURS_KEY, JSON.stringify({
      enabled: true, startHour: 6, startMinute: 0, endHour: 8, endMinute: 0,
    }));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    await scheduler.relayWeighInAfterTrainingReturn();
    const morning = mockScheduleAsync.mock.calls
      .find((c) => c[0].identifier === 'volyume_morning_weight_1')[0];
    expect(morning.trigger.date.getHours()).toBe(8);
  });

  test('web is still a no-op on the return path', async () => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(ENABLED_PREFS));
    mockGetRecentCompleted.mockResolvedValue(lastSessionAt(Date.now()));
    mockPlatformOS = 'web';
    await scheduler.relayWeighInAfterTrainingReturn();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });
});

describe('(28) the inactivity read fails OPEN', () => {
  test('a history-read failure behaves exactly as before the change', async () => {
    mockGetRecentCompleted.mockRejectedValue(new Error('sqlite unavailable'));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON * 2);
  });

  test('a malformed history row is treated as unknowable, not as inactivity', async () => {
    mockGetRecentCompleted.mockResolvedValue([{ id: 'w1', isCompleted: true }]);
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON);
  });

  test('no completed session on record at all: the reminder still lays (onboarding is not stood down)', async () => {
    mockGetRecentCompleted.mockResolvedValue([]);
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON);
  });

  test('no signed-in user in the store: behaves as before', async () => {
    mockUserId = null;
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(HORIZON);
    expect(mockGetRecentCompleted).not.toHaveBeenCalled();
  });

  test('source guard: the gate catch returns false, and reuses the existing reader', () => {
    const gate = SCHEDULER_SRC.slice(
      SCHEDULER_SRC.indexOf('async function weighInStandDown()'),
      SCHEDULER_SRC.indexOf('export async function cancelEveningWeightReminder'),
    );
    expect(gate).toMatch(/getRecentCompletedWorkouts/); // the existing reader, not a new query
    expect(gate).not.toMatch(/getAllAsync|SELECT /); // no hand-rolled SQL in the scheduler
    // Fail OPEN: every unknowable branch and the catch return false.
    expect(gate).toMatch(/catch \(_\) \{[\s\S]*return false;[\s\S]*\}/);
    expect(gate).toMatch(/if \(!Number\.isFinite\(lastMs\)\) return false;/);
    expect(gate).toMatch(/if \(!uid\) return false;/);
    // Never writes anything.
    expect(gate).not.toMatch(/setItem|removeItem/);
  });

  test('source guard: the window uses LOCAL calendar arithmetic, not fixed 86400000 ms', () => {
    const helper = SCHEDULER_SRC.slice(
      SCHEDULER_SRC.indexOf('function localMidnightDaysAgo'),
      SCHEDULER_SRC.indexOf('async function weighInStandDown()'),
    );
    expect(helper).toMatch(/now\.getDate\(\) - days/);
    expect(helper).not.toMatch(/86400000/);
  });
});
