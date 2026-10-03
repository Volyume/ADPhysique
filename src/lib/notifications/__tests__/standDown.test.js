/**
 * standDown.js (register D215; founder order 2026-10-02: "If I've already
 * entered my weight in the day we shouldn't be asking for it again as a
 * notification later in the day ensure there's no repeat notifications when
 * the requirement has already been satisfied").
 *
 * Pins, against the real module with the OS schedule mocked:
 *   - a request's day comes from its own data.dayKey, else its date trigger;
 *     a daily repeat has no day and is never matched to one;
 *   - the stand-downs are SUBTRACTIVE and scoped: a weigh-in logged today
 *     cancels today's two weigh-in prompts and nothing else (not tomorrow's,
 *     not the training reminder); a weigh-in entered for a past day cancels
 *     nothing; a completed session cancels today's training reminder only; a
 *     saved check-in cancels THIS week's reminder and every missed-check-in
 *     follow-up, and leaves a reminder already laid for next week alone;
 *   - every "is it done" read fails OPEN to "not done": a read failure can let
 *     a prompt through, never silence one the person opted into;
 *   - the training read counts a session by the day it STARTED (the foreground
 *     handler's rule); the meal read ignores planned (not yet eaten) rows;
 *   - web no-ops; a schedule read failure cancels nothing; one failed cancel
 *     does not stop the rest.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const mockGetAll = jest.fn(() => Promise.resolve([]));
const mockCancel = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: (...a) => mockGetAll(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancel(...a),
}));

const mockGetMorningWeightToday = jest.fn();
const mockGetCompletedBetween = jest.fn();
jest.mock('../../database', () => ({
  getMorningWeightToday: (...a) => mockGetMorningWeightToday(...a),
  getCompletedWorkoutsBetween: (...a) => mockGetCompletedBetween(...a),
}));

const mockGetFoodEntries = jest.fn();
jest.mock('../../food/db', () => ({ getFoodEntriesForDay: (...a) => mockGetFoodEntries(...a) }));

const mockRelay = jest.fn(() => Promise.resolve());
jest.mock('../scheduler', () => ({ relayMealRemindersFromPrefs: (...a) => mockRelay(...a) }));

const mockGetState = jest.fn(() => ({ user: { id: 'u1' } }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockGetState() },
}));

const sd = require('../standDown');
const { localDayKey } = require('../../dayKey');

// Friday 2 October 2026, 10:00 local. This week runs Monday 28 September to
// Sunday 4 October.
const NOW = new Date(2026, 9, 2, 10, 0, 0, 0).getTime();
const TODAY = localDayKey(NOW);
const YESTERDAY_MS = new Date(2026, 9, 1, 8, 0).getTime();
const TOMORROW = localDayKey(new Date(2026, 9, 3, 10, 0).getTime());

const r = (identifier, data, trigger = { type: 'date', value: 1 }) => ({ identifier, content: { data }, trigger });

const SCHED = [
  r('m_today', { type: 'morning_weight', dayKey: TODAY }),
  r('e_today', { type: 'evening_weight', dayKey: TODAY }),
  r('m_tomorrow', { type: 'morning_weight', dayKey: TOMORROW }),
  r('t_today', { type: 'training_reminder', dayKey: TODAY }),
  r('t_tomorrow', { type: 'training_reminder', dayKey: TOMORROW }),
  r('meal_lunch_tomorrow', { type: 'meal_log_reminder', slot: 'lunch', dayKey: TOMORROW }),
  r('meal_dinner_repeat', { type: 'meal_log_reminder', slot: 'dinner' }, { type: 'daily', hour: 18, minute: 30 }),
  // Laid by an older build: no dayKey, only its date trigger.
  r('old_build_evening', { type: 'evening_weight' }, { type: 'date', value: new Date(2026, 9, 2, 19, 30).getTime() }),
  r('checkin_this_week', { type: 'weekly_checkin', dayKey: '2026-10-04' }),
  r('checkin_next_week', { type: 'weekly_checkin', dayKey: '2026-10-11' }),
  r('missed_evening', { type: 'checkin_missed', slot: 'evening', dayKey: '2026-10-06' }),
  r('missed_followup', { type: 'checkin_missed', slot: 'followup' }, { type: 'date', value: new Date(2026, 9, 7, 9, 0).getTime() }),
];

const cancelled = () => mockCancel.mock.calls.map((c) => c[0]);

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
  mockGetAll.mockImplementation(() => Promise.resolve(SCHED));
  mockCancel.mockImplementation(() => Promise.resolve());
  mockGetState.mockImplementation(() => ({ user: { id: 'u1' } }));
  mockGetMorningWeightToday.mockReset();
  mockGetCompletedBetween.mockReset();
  mockGetFoodEntries.mockReset();
  mockRelay.mockReset();
  mockRelay.mockImplementation(() => Promise.resolve());
});

describe('requestDayKey: the day a pending request fires on', () => {
  test('its own data.dayKey wins, whatever the trigger looks like', () => {
    expect(sd.requestDayKey(r('a', { type: 'x', dayKey: '2026-10-02' }, { type: 'daily', hour: 8, minute: 0 }))).toBe('2026-10-02');
  });

  test('else the date trigger, as a Date, epoch ms or ISO string', () => {
    const when = new Date(2026, 9, 3, 7, 0);
    expect(sd.requestDayKey(r('a', { type: 'x' }, { type: 'date', date: when }))).toBe('2026-10-03');
    expect(sd.requestDayKey(r('a', { type: 'x' }, { type: 'date', value: when.getTime() }))).toBe('2026-10-03');
    expect(sd.requestDayKey(r('a', { type: 'x' }, { type: 'date', value: when.toISOString() }))).toBe('2026-10-03');
  });

  test('a repeat carries no day; an empty request has none', () => {
    expect(sd.requestDayKey(r('a', { type: 'x' }, { type: 'daily', hour: 8, minute: 0 }))).toBeNull();
    expect(sd.requestDayKey({})).toBeNull();
    expect(sd.requestDayKey(null)).toBeNull();
  });
});

describe('requestsToStandDown (pure matching)', () => {
  test('type and day: today\'s weigh-in prompts, including an old build\'s by its trigger', () => {
    const got = sd.requestsToStandDown(SCHED, { types: sd.WEIGH_IN_TYPES, dayKeys: [TODAY] }).map((x) => x.identifier);
    expect(got).toEqual(['m_today', 'e_today', 'old_build_evening']);
  });

  test('slot narrows meals; a repeat never matches a day', () => {
    expect(sd.requestsToStandDown(SCHED, { types: sd.MEAL_TYPES, slot: 'lunch' }).map((x) => x.identifier)).toEqual(['meal_lunch_tomorrow']);
    expect(sd.requestsToStandDown(SCHED, { types: sd.MEAL_TYPES, slot: 'dinner', dayKeys: [TOMORROW] })).toEqual([]);
    expect(sd.requestsToStandDown(SCHED, { types: sd.MEAL_TYPES, slot: 'dinner' }).map((x) => x.identifier)).toEqual(['meal_dinner_repeat']);
  });

  test('no day given: every request of the type', () => {
    expect(sd.requestsToStandDown(SCHED, { types: sd.CHECKIN_FOLLOWUP_TYPES }).map((x) => x.identifier)).toEqual(['missed_evening', 'missed_followup']);
  });

  test('tolerates a non-array schedule and unknown types', () => {
    expect(sd.requestsToStandDown(null, { types: sd.WEIGH_IN_TYPES })).toEqual([]);
    expect(sd.requestsToStandDown(SCHED, { types: ['nothing_like_this'] })).toEqual([]);
  });
});

describe('weekDayKeys', () => {
  test('the seven local days of the week holding the instant, Monday first', () => {
    expect(sd.weekDayKeys(NOW)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
  });
});

describe('standDownWeighIn', () => {
  test('a weigh-in logged today cancels today\'s morning and evening prompts and nothing else', async () => {
    const n = await sd.standDownWeighIn(NOW - 3 * 3600e3, NOW);
    expect(n).toBe(3);
    expect(cancelled().sort()).toEqual(['e_today', 'm_today', 'old_build_evening']);
    expect(cancelled()).not.toContain('m_tomorrow');
    expect(cancelled()).not.toContain('t_today');
  });

  test('a weigh-in entered for a past day stands nothing down', async () => {
    const n = await sd.standDownWeighIn(YESTERDAY_MS, NOW);
    expect(n).toBe(0);
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockGetAll).not.toHaveBeenCalled();
  });
});

describe('standDownTraining', () => {
  test('a session started today cancels today\'s training reminder only', async () => {
    const n = await sd.standDownTraining(NOW - 2 * 3600e3, NOW);
    expect(n).toBe(1);
    expect(cancelled()).toEqual(['t_today']);
  });

  test('a session that started yesterday (finished after midnight) cancels nothing today', async () => {
    const n = await sd.standDownTraining(new Date(2026, 9, 1, 23, 30).getTime(), NOW);
    expect(n).toBe(0);
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

describe('standDownCheckin', () => {
  test('this week\'s reminder and every missed-check-in follow-up go; next week\'s reminder stays', async () => {
    const n = await sd.standDownCheckin(NOW);
    expect(n).toBe(3);
    expect(cancelled().sort()).toEqual(['checkin_this_week', 'missed_evening', 'missed_followup']);
    expect(cancelled()).not.toContain('checkin_next_week');
  });
});

describe('standDownScheduled: the subtractive primitive', () => {
  test('web: touches nothing and reports 0', async () => {
    mockPlatformOS = 'web';
    expect(await sd.standDownWeighIn(NOW, NOW)).toBe(0);
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  test('a schedule read failure cancels nothing and never throws', async () => {
    mockGetAll.mockImplementation(() => Promise.reject(new Error('os')));
    await expect(sd.standDownWeighIn(NOW, NOW)).resolves.toBe(0);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  test('one failed cancel does not stop the others', async () => {
    mockCancel.mockImplementation((id) => (id === 'm_today' ? Promise.reject(new Error('gone')) : Promise.resolve()));
    await expect(sd.standDownWeighIn(NOW, NOW)).resolves.toBe(3);
    expect(cancelled().sort()).toEqual(['e_today', 'm_today', 'old_build_evening']);
  });
});

describe('isWeighInSatisfiedToday', () => {
  test('a morning_weights row for today with a weight', async () => {
    mockGetMorningWeightToday.mockResolvedValue({ weightKg: 80.2 });
    expect(await sd.isWeighInSatisfiedToday()).toBe(true);
    expect(mockGetMorningWeightToday).toHaveBeenCalledWith('u1');
  });

  test('no row, a row without a weight, a read failure or no signed-in user: not done', async () => {
    mockGetMorningWeightToday.mockResolvedValue(null);
    expect(await sd.isWeighInSatisfiedToday()).toBe(false);
    mockGetMorningWeightToday.mockResolvedValue({ weightKg: null, notes: 'x' });
    expect(await sd.isWeighInSatisfiedToday()).toBe(false);
    mockGetMorningWeightToday.mockRejectedValue(new Error('db'));
    expect(await sd.isWeighInSatisfiedToday()).toBe(false);
    mockGetState.mockImplementation(() => ({ user: null }));
    mockGetMorningWeightToday.mockClear();
    expect(await sd.isWeighInSatisfiedToday()).toBe(false);
    expect(mockGetMorningWeightToday).not.toHaveBeenCalled();
  });
});

describe('isTrainingSatisfiedToday', () => {
  const START = new Date(2026, 9, 2).getTime();
  const END = new Date(2026, 9, 3).getTime();

  test('a completed session that started today, read over today\'s local bounds', async () => {
    mockGetCompletedBetween.mockResolvedValue([{ startedAt: NOW - 3600e3, endedAt: NOW - 1800e3 }]);
    expect(await sd.isTrainingSatisfiedToday(NOW)).toBe(true);
    expect(mockGetCompletedBetween).toHaveBeenCalledWith('u1', START, END);
  });

  test('a session that started yesterday and ended today belongs to yesterday (the handler\'s rule)', async () => {
    mockGetCompletedBetween.mockResolvedValue([{ startedAt: new Date(2026, 9, 1, 23, 30).getTime(), endedAt: new Date(2026, 9, 2, 0, 30).getTime() }]);
    expect(await sd.isTrainingSatisfiedToday(NOW)).toBe(false);
  });

  test('nothing today, a read failure or no user: not done', async () => {
    mockGetCompletedBetween.mockResolvedValue([]);
    expect(await sd.isTrainingSatisfiedToday(NOW)).toBe(false);
    mockGetCompletedBetween.mockRejectedValue(new Error('db'));
    expect(await sd.isTrainingSatisfiedToday(NOW)).toBe(false);
    mockGetState.mockImplementation(() => ({}));
    expect(await sd.isTrainingSatisfiedToday(NOW)).toBe(false);
  });
});

describe('isMealSatisfiedToday', () => {
  test('a real (non-planned) row in the slot today, snake or camel case', async () => {
    mockGetFoodEntries.mockResolvedValue([{ meal_slot: 'lunch', is_planned: 0 }]);
    expect(await sd.isMealSatisfiedToday('lunch', NOW)).toBe(true);
    expect(mockGetFoodEntries).toHaveBeenCalledWith('u1', TODAY);
    mockGetFoodEntries.mockResolvedValue([{ mealSlot: 'lunch', isPlanned: false }]);
    expect(await sd.isMealSatisfiedToday('lunch', NOW)).toBe(true);
  });

  test('a planned (not yet eaten) row is not a logged meal; another slot does not count', async () => {
    mockGetFoodEntries.mockResolvedValue([{ meal_slot: 'lunch', is_planned: 1 }]);
    expect(await sd.isMealSatisfiedToday('lunch', NOW)).toBe(false);
    mockGetFoodEntries.mockResolvedValue([{ meal_slot: 'dinner', is_planned: 0 }]);
    expect(await sd.isMealSatisfiedToday('lunch', NOW)).toBe(false);
  });

  test('no slot, a read failure or no user: not done', async () => {
    mockGetFoodEntries.mockResolvedValue([{ meal_slot: 'lunch', is_planned: 0 }]);
    expect(await sd.isMealSatisfiedToday(undefined, NOW)).toBe(false);
    expect(await sd.isMealSatisfiedToday('', NOW)).toBe(false);
    mockGetFoodEntries.mockRejectedValue(new Error('db'));
    expect(await sd.isMealSatisfiedToday('lunch', NOW)).toBe(false);
    mockGetState.mockImplementation(() => ({ user: null }));
    expect(await sd.isMealSatisfiedToday('lunch', NOW)).toBe(false);
  });
});

describe('standDownMeal: the deed path for food', () => {
  test('food logged in a slot today re-lays the meal reminders through the scheduler, once', async () => {
    expect(await sd.standDownMeal('lunch', TODAY, NOW)).toBe(true);
    expect(mockRelay).toHaveBeenCalledTimes(1);
  });

  test('a past day or a missing slot re-lays nothing', async () => {
    expect(await sd.standDownMeal('lunch', localDayKey(YESTERDAY_MS), NOW)).toBe(false);
    expect(await sd.standDownMeal('', TODAY, NOW)).toBe(false);
    expect(await sd.standDownMeal(null, TODAY, NOW)).toBe(false);
    expect(mockRelay).not.toHaveBeenCalled();
  });

  test('a failing re-lay is swallowed', async () => {
    mockRelay.mockImplementation(() => Promise.reject(new Error('os')));
    await expect(sd.standDownMeal('lunch', TODAY, NOW)).resolves.toBe(false);
  });
});
