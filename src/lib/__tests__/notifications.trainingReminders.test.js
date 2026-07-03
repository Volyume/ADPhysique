/**
 * notifications/trainingReminders.js (audit D4, runtime-critical, was untested).
 *
 * scheduleTrainingReminders is the weekly training-day push scheduler. Pins
 * the three behaviours that matter: it does nothing when reminders are off, it
 * does nothing without notification permission (so it never lays schedules the
 * OS will silently drop), and when on it schedules one weekly notification per
 * training day with the JS-day -> expo-weekday (+1) conversion and the default
 * 08:00 time.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const SCHEDULE_INPUT_TYPES = { WEEKLY: 'weekly', DAILY: 'daily', DATE: 'date' };
const mockSchedule = jest.fn(() => Promise.resolve('id'));
const mockCancel = jest.fn(() => Promise.resolve());
const mockGetAll = jest.fn(() => Promise.resolve([]));
const mockGetPerms = jest.fn(() => Promise.resolve({ status: 'granted' }));
const mockSetChannel = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockSchedule(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancel(...a),
  getAllScheduledNotificationsAsync: (...a) => mockGetAll(...a),
  getPermissionsAsync: (...a) => mockGetPerms(...a),
  setNotificationChannelAsync: (...a) => mockSetChannel(...a),
  AndroidImportance: { HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...a) => mockGetItem(...a),
}));

// C12: the scheduler self-sources the active plan name for the copy via lazy
// requires of the store + database. Mock both so that path is deterministic.
const mockGetActivePlan = jest.fn();
jest.mock('../database', () => ({ getActivePlan: (...a) => mockGetActivePlan(...a) }));
const mockUserId = { id: 'u1' };
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: mockUserId.id ? { id: mockUserId.id } : null }) },
}));

const tr = require('../notifications/trainingReminders');

function store(map) {
  mockGetItem.mockImplementation(async (k) => (k in map ? map[k] : null));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockGetAll.mockResolvedValue([]);
  mockUserId.id = 'u1';
  mockGetActivePlan.mockResolvedValue(null); // no plan -> plan-agnostic copy
});

describe('scheduleTrainingReminders (D4)', () => {
  test('reminders disabled: schedules nothing', async () => {
    store({ [tr.REMINDER_PREF_KEY]: 'false' });
    await tr.scheduleTrainingReminders();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('enabled + permission granted: one weekly notif per day, JS day -> expo weekday + 1, default 08:00', async () => {
    store({
      [tr.REMINDER_PREF_KEY]: 'true',
      [tr.SCHEDULE_KEY]: JSON.stringify({ days: [0, 3] }), // Sunday, Wednesday
    });
    await tr.scheduleTrainingReminders();
    expect(mockSchedule).toHaveBeenCalledTimes(2);
    const weekdays = mockSchedule.mock.calls.map((c) => c[0].trigger.weekday).sort();
    expect(weekdays).toEqual([1, 4]); // 0+1, 3+1
    expect(mockSchedule.mock.calls[0][0].trigger.hour).toBe(8);
    expect(mockSchedule.mock.calls[0][0].trigger.minute).toBe(0);
    expect(mockSchedule.mock.calls[0][0].trigger.repeats).toBe(true);
  });

  test('enabled but permission not granted: schedules nothing', async () => {
    store({
      [tr.REMINDER_PREF_KEY]: 'true',
      [tr.SCHEDULE_KEY]: JSON.stringify({ days: [1] }),
    });
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    await tr.scheduleTrainingReminders();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

describe('buildTrainingReminderBody (C12, pure copy rules)', () => {
  const GENERIC = 'You\'ve got a session on for today. Enjoy it whenever it suits you.';
  const MAX_BODY = 90; // mirrors MAX_REMINDER_BODY_CHARS in trainingReminders.js

  test('no name -> the plan-agnostic line', () => {
    expect(tr.buildTrainingReminderBody('')).toBe(GENERIC);
    expect(tr.buildTrainingReminderBody('   ')).toBe(GENERIC);
    expect(tr.buildTrainingReminderBody(null)).toBe(GENERIC);
    expect(tr.buildTrainingReminderBody(undefined)).toBe(GENERIC);
  });

  test('a short plan name is folded in verbatim, warm and British', () => {
    expect(tr.buildTrainingReminderBody('Push Pull Legs')).toBe(
      'Your Push Pull Legs plan is on today. Enjoy it whenever it suits you.',
    );
    // trimmed, not truncated
    expect(tr.buildTrainingReminderBody('  Upper Lower  ')).toContain('Your Upper Lower plan');
  });

  test('every real shipped library plan name stays named and within the body cap', () => {
    // Regression for the C12 review finding: the guard bounds the whole body,
    // not the name alone, so realistic plan names are named without overrunning.
    const realNames = [
      'Aesthetic Upper Rotation',
      'Beginner Push / Pull / Legs',
      '4-Day Muscle Building Bro Split',
      'Push Pull Legs 3×/Week',
    ];
    for (const nm of realNames) {
      const body = tr.buildTrainingReminderBody(nm);
      expect(body).toContain(`Your ${nm} plan`);
      expect(body.length).toBeLessThanOrEqual(MAX_BODY);
    }
  });

  test('the body cap is pinned at the exact boundary (whole body, not name)', () => {
    // Fixed wording "Your  plan is on today. Enjoy it whenever it suits you." is
    // 55 chars, so a 35-char name -> 90 (kept), a 36-char name -> 91 (falls back).
    const at = 'N'.repeat(35);
    const over = 'N'.repeat(36);
    expect(tr.buildTrainingReminderBody(at)).toBe(`Your ${at} plan is on today. Enjoy it whenever it suits you.`);
    expect(tr.buildTrainingReminderBody(at).length).toBe(MAX_BODY);
    expect(tr.buildTrainingReminderBody(over)).toBe(GENERIC);
  });

  test('an over-long plan name falls back rather than truncating in the tray', () => {
    const long = 'Beginner Full Body Strength And Conditioning Programme 3x Per Week';
    expect(tr.buildTrainingReminderBody(long)).toBe(GENERIC);
  });
});

describe('scheduleTrainingReminders names the active plan (C12)', () => {
  beforeEach(() => {
    store({
      [tr.REMINDER_PREF_KEY]: 'true',
      [tr.SCHEDULE_KEY]: JSON.stringify({ days: [1] }),
    });
  });

  test('self-sources the plan name when none is passed', async () => {
    mockGetActivePlan.mockResolvedValue({ id: 'p1', name: 'Push Pull Legs' });
    await tr.scheduleTrainingReminders();
    expect(mockGetActivePlan).toHaveBeenCalledWith('u1');
    expect(mockSchedule.mock.calls[0][0].content.body).toContain('Your Push Pull Legs plan');
  });

  test('an explicit plan name wins and skips the DB read', async () => {
    await tr.scheduleTrainingReminders('Upper Lower');
    expect(mockGetActivePlan).not.toHaveBeenCalled();
    expect(mockSchedule.mock.calls[0][0].content.body).toContain('Your Upper Lower plan');
  });

  test('no active plan (or no user): the plan-agnostic line', async () => {
    mockGetActivePlan.mockResolvedValue(null);
    await tr.scheduleTrainingReminders();
    expect(mockSchedule.mock.calls[0][0].content.body).toBe(
      'You\'ve got a session on for today. Enjoy it whenever it suits you.',
    );
  });

  test('a DB read failure never blocks scheduling: falls back to the line', async () => {
    mockGetActivePlan.mockRejectedValue(new Error('db locked'));
    await tr.scheduleTrainingReminders();
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule.mock.calls[0][0].content.body).toBe(
      'You\'ve got a session on for today. Enjoy it whenever it suits you.',
    );
  });
});
