/**
 * notifications.handler.test.js
 *
 * Asserts smart-suppression logic in the OS notification handler:
 *   - unknown data.type -> show notification
 *   - morning_weight + weight already logged today -> suppress
 *   - morning_weight + no weight logged -> show
 *   - weekly_checkin + checkin row exists for this week -> suppress
 *   - weekly_checkin + no checkin -> show
 *   - training_reminder + workout already completed today -> suppress
 *   - training_reminder + nothing today -> show
 *   - DB throw -> fall through to show (never silently swallow + suppress)
 *   - signed-out user -> show (no DB read)
 *
 * Also covers wiring: configureNotificationHandler calls
 * Notifications.setNotificationHandler exactly once.
 */

const mockSetHandler = jest.fn();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: (...args) => mockSetHandler(...args),
}));

const mockGetMorningWeightToday = jest.fn();
const mockGetLatestCheckin = jest.fn();
const mockGetAllWorkouts = jest.fn();
const mockGetOpenEdFlag = jest.fn();
jest.mock('../database', () => ({
  getMorningWeightToday: (...args) => mockGetMorningWeightToday(...args),
  getLatestCheckin: (...args) => mockGetLatestCheckin(...args),
  getAllWorkouts: (...args) => mockGetAllWorkouts(...args),
  getOpenEdPatternFlag: (...args) => mockGetOpenEdFlag(...args),
}));

const mockGetState = jest.fn();
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockGetState() },
}));

const { configureNotificationHandler } = require('../notifications/handler');

function captureHandler() {
  mockSetHandler.mockReset();
  configureNotificationHandler();
  expect(mockSetHandler).toHaveBeenCalledTimes(1);
  return mockSetHandler.mock.calls[0][0].handleNotification;
}

function notif(type) {
  return { request: { content: { data: { type } } } };
}

const SHOW = { shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false };
const SUPPRESS = { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };

beforeEach(() => {
  mockGetMorningWeightToday.mockReset();
  mockGetLatestCheckin.mockReset();
  mockGetAllWorkouts.mockReset();
  mockGetOpenEdFlag.mockReset();
  mockGetOpenEdFlag.mockResolvedValue(null);
  mockGetState.mockReset();
  mockGetState.mockReturnValue({ user: { id: 'user-1' } });
});

describe('configureNotificationHandler', () => {
  test('registers a handler with expo-notifications', () => {
    captureHandler();
    expect(mockSetHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) }),
    );
  });
});

describe('handleNotification, fallback', () => {
  test('unknown data.type -> show (no DB read)', async () => {
    const h = captureHandler();
    const out = await h(notif('something_random'));
    expect(out).toEqual(SHOW);
    expect(mockGetMorningWeightToday).not.toHaveBeenCalled();
    expect(mockGetLatestCheckin).not.toHaveBeenCalled();
    expect(mockGetAllWorkouts).not.toHaveBeenCalled();
  });

  test('no data on notification -> show', async () => {
    const h = captureHandler();
    expect(await h({})).toEqual(SHOW);
  });
});

describe('handleNotification, morning_weight', () => {
  test('weight already logged today -> suppress', async () => {
    mockGetMorningWeightToday.mockResolvedValue({ weightKg: 80 });
    const h = captureHandler();
    expect(await h(notif('morning_weight'))).toEqual(SUPPRESS);
    expect(mockGetMorningWeightToday).toHaveBeenCalledWith('user-1');
  });

  test('weight not logged today -> show', async () => {
    mockGetMorningWeightToday.mockResolvedValue(null);
    const h = captureHandler();
    expect(await h(notif('morning_weight'))).toEqual(SHOW);
  });

  test('row exists but weightKg falsy -> show (defensive on partial rows)', async () => {
    mockGetMorningWeightToday.mockResolvedValue({ weightKg: 0 });
    const h = captureHandler();
    expect(await h(notif('morning_weight'))).toEqual(SHOW);
  });

  test('DB throw -> show (never silently suppress on error)', async () => {
    mockGetMorningWeightToday.mockRejectedValue(new Error('sqlite locked'));
    const h = captureHandler();
    expect(await h(notif('morning_weight'))).toEqual(SHOW);
  });

  test('signed out -> show without DB read', async () => {
    mockGetState.mockReturnValue({ user: null });
    const h = captureHandler();
    expect(await h(notif('morning_weight'))).toEqual(SHOW);
    expect(mockGetMorningWeightToday).not.toHaveBeenCalled();
  });

  test('Q1: open ED flag -> suppress even when weight NOT logged', async () => {
    mockGetMorningWeightToday.mockResolvedValue(null);
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag-1', status: 'open' });
    const h = captureHandler();
    expect(await h(notif('morning_weight'))).toEqual(SUPPRESS);
  });
});

describe('handleNotification, rest_end (A2)', () => {
  test('foreground delivery is always suppressed (the in-app timer owns the moment)', async () => {
    const h = captureHandler();
    expect(await h(notif('rest_end'))).toEqual(SUPPRESS);
    // No DB read needed to make the call.
    expect(mockGetMorningWeightToday).not.toHaveBeenCalled();
  });
});

describe('handleNotification, evening_weight (Q1)', () => {
  test('weight already logged today -> suppress', async () => {
    mockGetMorningWeightToday.mockResolvedValue({ weightKg: 80 });
    const h = captureHandler();
    expect(await h(notif('evening_weight'))).toEqual(SUPPRESS);
  });

  test('not logged and no ED flag -> show', async () => {
    mockGetMorningWeightToday.mockResolvedValue(null);
    const h = captureHandler();
    expect(await h(notif('evening_weight'))).toEqual(SHOW);
  });

  test('open ED flag -> suppress even when not logged', async () => {
    mockGetMorningWeightToday.mockResolvedValue(null);
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag-1', status: 'open' });
    const h = captureHandler();
    expect(await h(notif('evening_weight'))).toEqual(SUPPRESS);
  });

  test('DB throw -> show (never silently suppress on error)', async () => {
    mockGetMorningWeightToday.mockRejectedValue(new Error('sqlite locked'));
    const h = captureHandler();
    expect(await h(notif('evening_weight'))).toEqual(SHOW);
  });
});

describe('handleNotification, weekly_checkin', () => {
  test('real checkin (energy set) for this week -> suppress', async () => {
    mockGetLatestCheckin.mockResolvedValue({ id: 'x', energyScore: 3 });
    const h = captureHandler();
    expect(await h(notif('weekly_checkin'))).toEqual(SUPPRESS);
    expect(mockGetLatestCheckin).toHaveBeenCalledWith('user-1', expect.any(Number));
  });

  test('sleep-only row (no energy, e.g. from a workout) -> still show', async () => {
    mockGetLatestCheckin.mockResolvedValue({ id: 'x', sleepQuality: 4 });
    const h = captureHandler();
    expect(await h(notif('weekly_checkin'))).toEqual(SHOW);
  });

  test('no checkin for this week -> show', async () => {
    mockGetLatestCheckin.mockResolvedValue(null);
    const h = captureHandler();
    expect(await h(notif('weekly_checkin'))).toEqual(SHOW);
  });

  test('DB throw -> show', async () => {
    mockGetLatestCheckin.mockRejectedValue(new Error('boom'));
    const h = captureHandler();
    expect(await h(notif('weekly_checkin'))).toEqual(SHOW);
  });
});

describe('handleNotification, training_reminder', () => {
  test('completed workout today -> suppress', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    mockGetAllWorkouts.mockResolvedValue([
      { isCompleted: 1, startedAt: todayStart.getTime() + 60_000 },
    ]);
    const h = captureHandler();
    expect(await h(notif('training_reminder'))).toEqual(SUPPRESS);
  });

  test('completed workout yesterday -> show', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    mockGetAllWorkouts.mockResolvedValue([
      { isCompleted: 1, startedAt: todayStart.getTime() - 24 * 60 * 60_000 },
    ]);
    const h = captureHandler();
    expect(await h(notif('training_reminder'))).toEqual(SHOW);
  });

  test('in-progress workout today (not completed) -> show', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    mockGetAllWorkouts.mockResolvedValue([
      { isCompleted: 0, startedAt: todayStart.getTime() + 60_000 },
    ]);
    const h = captureHandler();
    expect(await h(notif('training_reminder'))).toEqual(SHOW);
  });

  test('empty workouts list -> show', async () => {
    mockGetAllWorkouts.mockResolvedValue([]);
    const h = captureHandler();
    expect(await h(notif('training_reminder'))).toEqual(SHOW);
  });
});

describe('handleNotification, activation_nudge (S6)', () => {
  const activationNotif = (stage) => ({ request: { content: { data: { type: 'activation_nudge', stage } } } });

  test('progressed past the stage (trained since it was laid) -> suppress', async () => {
    // stalled_1 was laid at 1 session; the user now has 2 -> stale -> suppress
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1 }, { isCompleted: 1 }]);
    const h = captureHandler();
    expect(await h(activationNotif('stalled_1'))).toEqual(SUPPRESS);
  });

  test('still at the stage -> show', async () => {
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1 }]); // still 1 for stalled_1
    const h = captureHandler();
    expect(await h(activationNotif('stalled_1'))).toEqual(SHOW);
  });

  test('cold_start is stale once there is any completed session -> suppress', async () => {
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1 }]);
    const h = captureHandler();
    expect(await h(activationNotif('cold_start'))).toEqual(SUPPRESS);
  });

  test('stalled_2 shows at exactly 2 sessions, suppresses at 3', async () => {
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1 }, { isCompleted: 1 }]);
    expect(await captureHandler()(activationNotif('stalled_2'))).toEqual(SHOW);
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1 }, { isCompleted: 1 }, { isCompleted: 1 }]);
    expect(await captureHandler()(activationNotif('stalled_2'))).toEqual(SUPPRESS);
  });

  test('open ED flag -> suppress even when the stage has not passed', async () => {
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1 }]); // stalled_1 not passed
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag-1', status: 'open' });
    const h = captureHandler();
    expect(await h(activationNotif('stalled_1'))).toEqual(SUPPRESS);
  });

  test('workout-read throw -> show (never silently suppress on error)', async () => {
    mockGetAllWorkouts.mockRejectedValue(new Error('sqlite locked'));
    const h = captureHandler();
    expect(await h(activationNotif('stalled_1'))).toEqual(SHOW);
  });

  test('unknown stage -> show (do not suppress a stage we cannot classify)', async () => {
    mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1 }, { isCompleted: 1 }, { isCompleted: 1 }]);
    const h = captureHandler();
    expect(await h(activationNotif('bogus'))).toEqual(SHOW);
  });
});
