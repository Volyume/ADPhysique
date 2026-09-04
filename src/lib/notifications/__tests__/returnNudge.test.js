/**
 * D142 (founder decision C, 2026-09-04): one calm note after three weeks of
 * genuine absence.
 *
 * What this pins, against the real scheduler:
 *   - the note is laid 21 days ahead at 10:00 local, one fixed identifier,
 *     routed as 'return_nudge';
 *   - it is never laid: without a user; when the toggle is off; under an
 *     open ED flag or an unreadable flag (fail closed); under calm mode or an
 *     unreadable wellbeing value (fail closed); for a user with no completed
 *     workout; for a user with no active plan. Each of those also retires
 *     anything already laid;
 *   - re-laying within six hours is skipped unless forced, so a busy user
 *     is not charged reads on every foreground;
 *   - restoreNotifications re-lays it (forced) after its cancel-all wipe;
 *   - the copy carries no shame words;
 *   - the category is registered with its own switch, its channel, its
 *     budget priority and its route.
 */
let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
const mockCancelAllAsync = jest.fn(() => Promise.resolve());
const mockGetAllScheduled = jest.fn(() => Promise.resolve([]));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
  cancelAllScheduledNotificationsAsync: (...a) => mockCancelAllAsync(...a),
  getAllScheduledNotificationsAsync: (...a) => mockGetAllScheduled(...a),
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' },
}));

const mockMem = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockMem.has(k) ? mockMem.get(k) : null)),
  setItem: jest.fn((k, v) => { mockMem.set(k, v); return Promise.resolve(); }),
  removeItem: jest.fn((k) => { mockMem.delete(k); return Promise.resolve(); }),
}));

const mockGetOpenEdFlag = jest.fn(() => Promise.resolve(null));
const mockGetAllWorkouts = jest.fn(() => Promise.resolve([{ isCompleted: true, startedAt: 1 }]));
const mockGetActivePlan = jest.fn(() => Promise.resolve({ id: 'p1', name: 'Upper Lower' }));
jest.mock('../../database', () => ({
  getOpenEdPatternFlag: (...a) => mockGetOpenEdFlag(...a),
  getAllWorkouts: (...a) => mockGetAllWorkouts(...a),
  getActivePlan: (...a) => mockGetActivePlan(...a),
  getActiveBlock: jest.fn(() => Promise.resolve(null)),
  getLatestCheckin: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../food/db', () => ({ getFoodEntriesForDay: jest.fn(() => Promise.resolve([])) }));
const mockUserHolder = { user: { id: 'user-1' } };
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: mockUserHolder.user, tier: 'pro' }) },
}));
jest.mock('../permissions', () => ({ getNotificationPermissionStatus: jest.fn(() => Promise.resolve('granted')) }));
jest.mock('../categoryPrefs', () => {
  const actual = jest.requireActual('../categoryPrefs');
  return { ...actual, isCategoryEnabled: jest.fn(() => Promise.resolve(true)) };
});

const { WELLBEING_KEY } = require('../../wellbeing');
const {
  scheduleReturnNudge, returnNudgePush, restoreNotifications,
  RETURN_NUDGE_ABSENCE_DAYS, RETURN_NUDGE_HOUR,
} = require('../scheduler');
const { CATEGORY, CATEGORY_CHANNELS, CHANNEL, categoryForDataType } = require('../categories');
const { CATEGORY_PREFS } = require('../categoryPrefs');
const { EVENT_PRIORITY } = require('../budget');
const { routeForNotificationType } = require('../notificationRoute');

const laid = () => mockScheduleAsync.mock.calls.filter(([c]) => c?.identifier === 'volyume_return_nudge');

beforeEach(() => {
  jest.clearAllMocks();
  mockMem.clear();
  mockPlatformOS = 'android';
  mockGetOpenEdFlag.mockResolvedValue(null);
  mockGetAllWorkouts.mockResolvedValue([{ isCompleted: true, startedAt: 1 }]);
  mockGetActivePlan.mockResolvedValue({ id: 'p1', name: 'Upper Lower' });
});

describe('scheduleReturnNudge lays one note 21 days ahead', () => {
  test('an established user with a plan: one dated one-shot at 10:00, 21 days out, routed as return_nudge', async () => {
    await scheduleReturnNudge('user-1');
    const calls = laid();
    expect(calls).toHaveLength(1);
    const [{ content, trigger }] = calls[0];
    expect(content.data).toEqual({ type: 'return_nudge' });
    expect(content.sound).toBe(false);
    expect(trigger.type).toBe('date');
    const now = new Date();
    const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate() + RETURN_NUDGE_ABSENCE_DAYS, RETURN_NUDGE_HOUR, 0, 0, 0);
    expect(new Date(trigger.date).getTime()).toBe(expected.getTime());
    expect(RETURN_NUDGE_ABSENCE_DAYS).toBe(21);
    // The previous lay is always retired first, so it can never stack.
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_return_nudge');
  });

  test('within six hours of the last lay nothing is re-read or re-laid, unless forced', async () => {
    await scheduleReturnNudge('user-1');
    jest.clearAllMocks();
    await scheduleReturnNudge('user-1');
    expect(laid()).toHaveLength(0);
    expect(mockGetAllWorkouts).not.toHaveBeenCalled();
    await scheduleReturnNudge('user-1', { force: true });
    expect(laid()).toHaveLength(1);
  });
});

describe('scheduleReturnNudge never lays, and retires, when', () => {
  const expectRetiredNotLaid = () => {
    expect(laid()).toHaveLength(0);
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_return_nudge');
  };

  test('there is no user', async () => {
    mockUserHolder.user = null;
    try {
      await scheduleReturnNudge(null);
      expectRetiredNotLaid();
    } finally {
      mockUserHolder.user = { id: 'user-1' };
    }
  });

  test('the toggle is off', async () => {
    mockMem.set('@volyume_notification_prefs', JSON.stringify({ returnNudgeEnabled: false }));
    await scheduleReturnNudge('user-1');
    expectRetiredNotLaid();
  });

  test('an ED flag is open, or the flag cannot be read (fail closed)', async () => {
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag' });
    await scheduleReturnNudge('user-1');
    expectRetiredNotLaid();
    jest.clearAllMocks();
    mockGetOpenEdFlag.mockRejectedValue(new Error('db locked'));
    await scheduleReturnNudge('user-1');
    expectRetiredNotLaid();
  });

  test('calm mode is on', async () => {
    mockMem.set(WELLBEING_KEY, 'calm');
    await scheduleReturnNudge('user-1');
    expectRetiredNotLaid();
  });

  test('the user has never completed a workout (the getting-started nudge owns that)', async () => {
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: false }]);
    await scheduleReturnNudge('user-1');
    expectRetiredNotLaid();
  });

  test('there is no active plan to come back to', async () => {
    mockGetActivePlan.mockResolvedValue(null);
    await scheduleReturnNudge('user-1');
    expectRetiredNotLaid();
  });

  test('the platform is web', async () => {
    mockPlatformOS = 'web';
    await scheduleReturnNudge('user-1');
    expect(laid()).toHaveLength(0);
    expect(mockGetAllWorkouts).not.toHaveBeenCalled();
  });
});

describe('the note survives the restore wipe, and the copy is calm', () => {
  test('restoreNotifications re-lays it after cancel-all', async () => {
    await restoreNotifications({ morningEnabled: false, checkinEnabled: false }, 'user-1');
    expect(mockCancelAllAsync).toHaveBeenCalled();
    expect(laid()).toHaveLength(1);
  });

  test('copy: no shame, no streaks, no em dash', () => {
    const { title, body } = returnNudgePush();
    expect(title).toBe('Your plan is still here');
    expect(body).toBe('Whenever you are ready, your next session is waiting for you. Nothing has been lost.');
    for (const line of [title, body]) {
      expect(line).not.toContain('—');
      expect(line).not.toMatch(/missed|behind|streak|failed|lost your|slipping/i);
    }
  });
});

describe('the category is fully registered', () => {
  test('enum, channel, data type, switch, budget priority and route', () => {
    expect(CATEGORY.RETURN_NUDGE).toBe('return_nudge');
    expect(CATEGORY_CHANNELS[CATEGORY.RETURN_NUDGE]).toEqual([CHANNEL.PUSH]);
    expect(categoryForDataType('return_nudge')).toBe(CATEGORY.RETURN_NUDGE);
    expect(CATEGORY_PREFS[CATEGORY.RETURN_NUDGE]).toEqual({ blobField: 'returnNudgeEnabled', legacyKey: null, defaultEnabled: true });
    expect(EVENT_PRIORITY.indexOf(CATEGORY.RETURN_NUDGE)).toBeGreaterThan(EVENT_PRIORITY.indexOf(CATEGORY.CHECKIN_MISSED));
    expect(EVENT_PRIORITY.indexOf(CATEGORY.RETURN_NUDGE)).toBeLessThan(EVENT_PRIORITY.indexOf(CATEGORY.WINBACK));
    expect(routeForNotificationType('return_nudge')).toEqual({ tab: 'HomeTab', screen: 'Home' });
  });
});
