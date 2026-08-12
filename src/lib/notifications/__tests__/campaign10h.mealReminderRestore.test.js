/**
 * campaign10h.mealReminderRestore.test.js — Campaign 10H, F-5.
 *
 * THE DEFECT. restoreNotifications runs on ordinary app launch. It begins
 * with cancelAllNotifications() and then re-lays the supported surfaces —
 * and for a long time meal reminders were not among them. So an opt-in the
 * user had deliberately switched on was erased on every launch and only
 * came back if they happened to revisit Notification settings. Fixed in
 * Campaign 1 P0-5; pinned there by a source guard over the fix site, which
 * proves the line is written but not that the behaviour holds.
 *
 * These are the behavioural pins: they drive the REAL restoreNotifications
 * against a stored preference and assert what the OS was actually asked to
 * schedule.
 *
 * SAFETY POSTURE (unchanged, and pinned here so it stays that way). Meal
 * reminders are food-adjacent. restoreNotifications must go THROUGH
 * scheduleMealReminders rather than around it, so every gate that
 * scheduler owns still applies on the launch path: Pro-only (FM-01), an
 * open ED flag or an unreadable flag schedules nothing (fail closed), and
 * quiet hours shift delivery. None of those rules is changed by this
 * campaign — they are asserted, not adjusted.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

const SCHEDULE_INPUT_TYPES = { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' };
const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
const mockCancelAllAsync = jest.fn(() => Promise.resolve());
const mockGetAllScheduled = jest.fn(() => Promise.resolve([]));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
  cancelAllScheduledNotificationsAsync: (...a) => mockCancelAllAsync(...a),
  getAllScheduledNotificationsAsync: (...a) => mockGetAllScheduled(...a),
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetOpenEdFlag = jest.fn(() => Promise.resolve(null));
jest.mock('../../database', () => ({
  getLatestCheckin: jest.fn(() => Promise.resolve(null)),
  getOpenEdPatternFlag: (...a) => mockGetOpenEdFlag(...a),
}));

jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../food/db', () => ({ getFoodEntriesForDay: jest.fn(() => Promise.resolve([])) }));

const mockGetState = jest.fn(() => ({ user: { id: 'user-1' }, tier: 'pro' }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockGetState() },
}));

jest.mock('../permissions', () => ({
  getNotificationPermissionStatus: jest.fn(() => Promise.resolve('granted')),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const scheduler = require('../scheduler');

const { MEAL_REMINDERS_KEY } = scheduler;
const MEAL_PREFIX = 'volyume_meal_reminder_';

// The shape Notification settings stores. Defaults are all OFF; a stored
// entry only ever exists because the user switched one on.
const BREAKFAST = { id: 'breakfast', label: 'Breakfast', hour: 8, minute: 15, enabled: true };
const LUNCH = { id: 'lunch', label: 'Lunch', hour: 13, minute: 0, enabled: true };
const DINNER = { id: 'dinner', label: 'Dinner', hour: 19, minute: 30, enabled: true };

// restoreNotifications needs a truthy prefs object to get past its own
// short-circuit; these two are irrelevant to meal reminders.
const PREFS = { morningEnabled: false, checkinEnabled: false };

const mealCalls = () => mockScheduleAsync.mock.calls
  .map((c) => c[0])
  .filter((n) => typeof n?.identifier === 'string' && n.identifier.startsWith(MEAL_PREFIX));

const storeReminders = (reminders) =>
  AsyncStorage.setItem(MEAL_REMINDERS_KEY, JSON.stringify(reminders));

beforeEach(async () => {
  jest.clearAllMocks();
  mockScheduleAsync.mockImplementation(() => Promise.resolve('id'));
  mockCancelAsync.mockImplementation(() => Promise.resolve());
  mockCancelAllAsync.mockImplementation(() => Promise.resolve());
  mockGetAllScheduled.mockImplementation(() => Promise.resolve([]));
  mockGetOpenEdFlag.mockImplementation(() => Promise.resolve(null));
  mockGetState.mockImplementation(() => ({ user: { id: 'user-1' }, tier: 'pro' }));
  mockPlatformOS = 'android';
  await AsyncStorage.clear();
});

describe('F-5: an enabled meal reminder survives launch restore', () => {
  test('the launch wipe is real, and the re-lay puts the reminder back', async () => {
    await storeReminders([BREAKFAST]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    // The wipe still happens (that part was never the defect)...
    expect(mockCancelAllAsync).toHaveBeenCalled();
    // ...and the user's opt-in comes back with it.
    const laid = mealCalls();
    expect(laid).toHaveLength(1);
    expect(laid[0].identifier).toBe(`${MEAL_PREFIX}breakfast`);
  });

  test('breakfast, lunch and dinner all return', async () => {
    await storeReminders([BREAKFAST, LUNCH, DINNER]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls().map((n) => n.identifier)).toEqual([
      `${MEAL_PREFIX}breakfast`, `${MEAL_PREFIX}lunch`, `${MEAL_PREFIX}dinner`,
    ]);
  });

  test('the user\'s chosen times are preserved exactly', async () => {
    await storeReminders([BREAKFAST, DINNER]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    const [b, d] = mealCalls();
    expect(b.trigger).toMatchObject({ type: 'daily', hour: 8, minute: 15 });
    expect(d.trigger).toMatchObject({ type: 'daily', hour: 19, minute: 30 });
  });

  test('a DISABLED reminder is not scheduled, and default-off restores nothing', async () => {
    await storeReminders([{ ...BREAKFAST, enabled: false }, LUNCH]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls().map((n) => n.identifier)).toEqual([`${MEAL_PREFIX}lunch`]);

    // No stored preference at all: the default is OFF everywhere.
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls()).toEqual([]);
  });

  test('every reminder disabled restores nothing (the re-lay gate is explicit-true)', async () => {
    await storeReminders([{ ...BREAKFAST, enabled: false }, { ...LUNCH, enabled: false }]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls()).toEqual([]);
  });

  test('repeated restore does not duplicate: same identifiers, one each', async () => {
    await storeReminders([BREAKFAST, LUNCH]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    const first = mealCalls().map((n) => n.identifier);
    jest.clearAllMocks();
    // Second launch: the OS now holds the reminders laid by the first.
    mockGetAllScheduled.mockImplementation(() => Promise.resolve(
      first.map((identifier) => ({ identifier })),
    ));
    await scheduler.restoreNotifications(PREFS, 'user-1');
    const second = mealCalls().map((n) => n.identifier);
    expect(second).toEqual(first);
    expect(new Set(second).size).toBe(second.length);
    // The scheduler cancelled its OWN identifiers before re-laying, which
    // is what makes the re-lay idempotent rather than additive.
    // (Other surfaces cancel their own identifiers on the same pass; only
    // the meal ones are this suite's business.)
    const cancelledMeals = mockCancelAsync.mock.calls
      .map((c) => c[0])
      .filter((id) => typeof id === 'string' && id.startsWith(MEAL_PREFIX));
    expect(cancelledMeals.sort()).toEqual([...first].sort());
  });

  test('a corrupt stored preference restores nothing instead of throwing', async () => {
    await AsyncStorage.setItem(MEAL_REMINDERS_KEY, 'not json');
    await expect(scheduler.restoreNotifications(PREFS, 'user-1')).resolves.toBeUndefined();
    expect(mealCalls()).toEqual([]);
  });
});

describe('F-5: the restore goes THROUGH the authoritative scheduler, not around it', () => {
  // Each of these is an existing gate owned by scheduleMealReminders. They
  // can only hold on the launch path if restoreNotifications calls that
  // function rather than re-implementing the scheduling itself. Nothing
  // here is changed by Campaign 10H; these pin that it stays true.

  test('ED-safety: an open flag means the launch restore schedules nothing', async () => {
    await storeReminders([BREAKFAST, LUNCH, DINNER]);
    mockGetOpenEdFlag.mockImplementation(() => Promise.resolve({ id: 'flag-1' }));
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls()).toEqual([]);
  });

  test('ED-safety: an unreadable flag fails CLOSED, it does not schedule anyway', async () => {
    await storeReminders([BREAKFAST]);
    mockGetOpenEdFlag.mockImplementation(() => Promise.reject(new Error('db down')));
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls()).toEqual([]);
  });

  test('tier: a free user gets no meal reminders re-laid (FM-01)', async () => {
    await storeReminders([BREAKFAST]);
    mockGetState.mockImplementation(() => ({ user: { id: 'user-1' }, tier: 'free' }));
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls()).toEqual([]);
  });

  test('quiet hours still shift a reminder that falls inside the window', async () => {
    // Default quiet window is 22:00 -> 07:00; 06:30 sits inside it.
    await storeReminders([{ id: 'early', label: 'Early', hour: 6, minute: 30, enabled: true }]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    const [n] = mealCalls();
    expect(n.trigger.hour).not.toBe(6);
    expect(n.trigger).toMatchObject({ type: 'daily', hour: 7, minute: 0 });
  });

  test('the reminder content is unchanged: no guilt, no streak, silent', async () => {
    await storeReminders([BREAKFAST]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    const [n] = mealCalls();
    expect(n.content.title).toBe('Breakfast');
    expect(n.content.body).toBe('A gentle reminder to log it if it helps. No pressure.');
    expect(n.content.sound).toBe(false);
    expect(n.content.data).toEqual({ type: 'meal_log_reminder' });
  });

  test('web: the restore touches nothing', async () => {
    mockPlatformOS = 'web';
    await storeReminders([BREAKFAST]);
    await scheduler.restoreNotifications(PREFS, 'user-1');
    expect(mealCalls()).toEqual([]);
  });
});
