/**
 * budget.test.js
 *
 * The push-budget enforcement from the NOTIFICATIONS_LOCKED.md
 * proposed addendum (2026-06-12):
 *   - habit/transactional categories are exempt
 *   - one notification per topic per day
 *   - daily cap of 2 event pushes, weekly cap of 8
 *   - higher priority evicts the lowest occupant; equal priority
 *     never evicts; the loser is dropped, not re-queued
 *   - occupancy extraction handles DATE / WEEKLY / daily trigger
 *     shapes and ignores unknown ones
 *   - requestEventPushSlot fails OPEN when the OS schedule can't be
 *     read, cancels evicted losers, and records drops as
 *     notification_failed (budget_capped / budget_evicted)
 */

const mockGetAll = jest.fn(() => Promise.resolve([]));
const mockCancelAsync = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: (...args) => mockGetAll(...args),
  cancelScheduledNotificationAsync: (...args) => mockCancelAsync(...args),
}));

const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../../engineTelemetry', () => ({
  track: (...args) => mockTrack(...args),
}));

jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'user-1' } }) },
}));

const {
  EVENT_DAILY_CAP,
  EVENT_WEEKLY_CAP,
  EVENT_PRIORITY,
  isEventCategory,
  eventPriorityRank,
  eventOccupantsOnDay,
  eventOccupantsInWeek,
  decideBudget,
  requestEventPushSlot,
} = require('../budget');
const { CATEGORY } = require('../categories');

beforeEach(() => {
  mockGetAll.mockReset();
  mockGetAll.mockImplementation(() => Promise.resolve([]));
  mockCancelAsync.mockReset();
  mockCancelAsync.mockImplementation(() => Promise.resolve());
  mockTrack.mockReset();
  mockTrack.mockImplementation(() => Promise.resolve());
});

function pending(identifier, type, trigger) {
  return { identifier, content: { data: { type } }, trigger };
}

// A fixed local Wednesday 10:00 to anchor day/week maths.
function wednesday() {
  const d = new Date();
  const daysFromMon = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysFromMon);
  monday.setDate(monday.getDate() + 2);
  monday.setHours(10, 0, 0, 0);
  return monday;
}

describe('class split', () => {
  test('event categories carry a finite rank in priority order', () => {
    expect(EVENT_PRIORITY[0]).toBe(CATEGORY.CASCADE_GATE);
    expect(eventPriorityRank(CATEGORY.CASCADE_GATE))
      .toBeLessThan(eventPriorityRank(CATEGORY.PARTNER_CHEER));
    expect(isEventCategory(CATEGORY.CHECKIN_MISSED)).toBe(true);
  });

  test('habit and transactional categories are not event-class', () => {
    expect(isEventCategory(CATEGORY.MORNING_WEIGHT)).toBe(false);
    expect(isEventCategory(CATEGORY.TRAINING_REMINDER)).toBe(false);
    expect(isEventCategory(CATEGORY.WEEKLY_CHECKIN_REMINDER)).toBe(false);
    expect(isEventCategory(CATEGORY.SUBSCRIPTION_PAYMENT_FAILURE)).toBe(false);
    expect(eventPriorityRank(CATEGORY.MORNING_WEIGHT)).toBe(Infinity);
  });
});

describe('decideBudget', () => {
  test('non-event category is exempt', () => {
    const r = decideBudget({ category: CATEGORY.MORNING_WEIGHT, dayOccupants: [1, 2, 3] });
    expect(r).toEqual({ allowed: true, evict: [], reason: 'exempt' });
  });

  test('allows when the day has free capacity', () => {
    const r = decideBudget({
      category: CATEGORY.WINBACK,
      dayOccupants: [{ identifier: 'a', category: CATEGORY.MONTHLY_RECAP }],
      weekOccupants: [{ identifier: 'a', category: CATEGORY.MONTHLY_RECAP }],
    });
    expect(r.allowed).toBe(true);
    expect(r.evict).toEqual([]);
  });

  test('one per topic per day: same category already laid blocks', () => {
    const r = decideBudget({
      category: CATEGORY.CHECKIN_MISSED,
      dayOccupants: [{ identifier: 'x', category: CATEGORY.CHECKIN_MISSED }],
    });
    expect(r).toEqual({ allowed: false, evict: [], reason: 'duplicate_topic' });
  });

  test('full day: lower priority incoming is dropped', () => {
    const day = [
      { identifier: 'a', category: CATEGORY.CASCADE_GATE },
      { identifier: 'b', category: CATEGORY.WEEKLY_COACH_READY },
    ];
    const r = decideBudget({ category: CATEGORY.MONTHLY_RECAP, dayOccupants: day });
    expect(r).toEqual({ allowed: false, evict: [], reason: 'day_capped' });
  });

  test('full day: higher priority evicts the lowest occupant', () => {
    const day = [
      { identifier: 'a', category: CATEGORY.WEEKLY_COACH_READY },
      { identifier: 'b', category: CATEGORY.PARTNER_CHEER },
    ];
    const r = decideBudget({ category: CATEGORY.CASCADE_GATE, dayOccupants: day, weekOccupants: day });
    expect(r.allowed).toBe(true);
    expect(r.evict).toEqual([{ identifier: 'b', category: CATEGORY.PARTNER_CHEER }]);
    expect(r.reason).toBe('evicted');
  });

  test('equal priority never evicts (cascade day 12 vs day 14 live together only across days)', () => {
    const day = [
      { identifier: 'a', category: CATEGORY.CASCADE_GATE },
      { identifier: 'b', category: CATEGORY.WEEKLY_COACH_READY },
    ];
    const r = decideBudget({ category: CATEGORY.WEEKLY_COACH_READY, dayOccupants: day });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('duplicate_topic');
  });

  test('weekly cap blocks a low-priority push even with day capacity', () => {
    const week = Array.from({ length: EVENT_WEEKLY_CAP }, (_, i) => ({
      identifier: `w${i}`, category: CATEGORY.TRIAL_DAY3,
    }));
    const r = decideBudget({
      category: CATEGORY.PARTNER_CHEER,
      dayOccupants: [],
      weekOccupants: week,
    });
    expect(r).toEqual({ allowed: false, evict: [], reason: 'week_capped' });
  });

  test('weekly cap: higher priority evicts the lowest in the week', () => {
    const week = Array.from({ length: EVENT_WEEKLY_CAP - 1 }, (_, i) => ({
      identifier: `w${i}`, category: CATEGORY.TRIAL_DAY3,
    })).concat([{ identifier: 'loser', category: CATEGORY.PARTNER_CHEER }]);
    const r = decideBudget({
      category: CATEGORY.CASCADE_GATE,
      dayOccupants: [],
      weekOccupants: week,
    });
    expect(r.allowed).toBe(true);
    expect(r.evict).toEqual([{ identifier: 'loser', category: CATEGORY.PARTNER_CHEER }]);
  });

  test('a day eviction also frees the week slot (no double count)', () => {
    const loser = { identifier: 'loser', category: CATEGORY.PARTNER_CHEER };
    const other = { identifier: 'o', category: CATEGORY.TRIAL_DAY3 };
    const week = Array.from({ length: EVENT_WEEKLY_CAP - 2 }, (_, i) => ({
      identifier: `w${i}`, category: CATEGORY.TRIAL_DAY3,
    })).concat([loser, other]);
    const r = decideBudget({
      category: CATEGORY.CASCADE_GATE,
      dayOccupants: [loser, other],
      weekOccupants: week,
    });
    expect(r.allowed).toBe(true);
    expect(r.evict).toEqual([loser]); // one eviction covers day AND week
  });

  test('caps match the addendum (2 per day, 8 per week)', () => {
    expect(EVENT_DAILY_CAP).toBe(2);
    expect(EVENT_WEEKLY_CAP).toBe(8);
  });
});

describe('occupancy extraction', () => {
  test('DATE trigger occupies its local day only', () => {
    const day = wednesday();
    const otherDay = new Date(day.getTime() + 86400000);
    const list = [pending('a', 'winback', { type: 'date', date: new Date(day) })];
    expect(eventOccupantsOnDay(list, day)).toEqual([{ identifier: 'a', category: 'winback' }]);
    expect(eventOccupantsOnDay(list, otherDay)).toEqual([]);
  });

  test('habit pushes never occupy event slots', () => {
    const day = wednesday();
    const list = [
      pending('m', 'morning_weight', { weekday: day.getDay() + 1, hour: 7, minute: 0 }),
      pending('t', 'training_reminder', { weekday: day.getDay() + 1, hour: 8, minute: 0 }),
      pending('c', 'weekly_checkin', { type: 'date', date: new Date(day) }),
    ];
    expect(eventOccupantsOnDay(list, day)).toEqual([]);
    expect(eventOccupantsInWeek(list, day)).toEqual([]);
  });

  test('unknown data types and unreadable triggers are ignored', () => {
    const day = wednesday();
    const list = [
      pending('x', 'mystery_type', { type: 'date', date: new Date(day) }),
      pending('y', 'winback', { bizarre: true }),
      { identifier: 'z' }, // no content at all
    ];
    expect(eventOccupantsOnDay(list, day)).toEqual([]);
  });

  test('week occupancy spans the local Monday-anchored week', () => {
    const day = wednesday();
    const friday = new Date(day.getTime() + 2 * 86400000);
    friday.setHours(10, 0, 0, 0);
    const nextWeek = new Date(day.getTime() + 9 * 86400000);
    const list = [
      pending('a', 'winback', { type: 'date', date: friday }),
      pending('b', 'trial_day3', { type: 'date', date: nextWeek }),
    ];
    const week = eventOccupantsInWeek(list, day);
    expect(week).toEqual([{ identifier: 'a', category: 'winback' }]);
  });
});

describe('requestEventPushSlot', () => {
  test('exempt category short-circuits without reading the schedule', async () => {
    const r = await requestEventPushSlot({ category: CATEGORY.MORNING_WEIGHT, fireDate: new Date() });
    expect(r.allowed).toBe(true);
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  test('fails OPEN when the pending schedule cannot be read', async () => {
    mockGetAll.mockRejectedValue(new Error('os down'));
    const r = await requestEventPushSlot({ category: CATEGORY.WINBACK, fireDate: new Date() });
    expect(r).toEqual({ allowed: true, reason: 'schedule_unreadable' });
  });

  test('blocked push records notification_failed with budget_capped', async () => {
    const day = wednesday();
    mockGetAll.mockResolvedValue([
      pending('a', 'cascade_gate', { type: 'date', date: new Date(day) }),
      pending('b', 'weekly_coach_ready', { type: 'date', date: new Date(day) }),
    ]);
    const r = await requestEventPushSlot({ category: CATEGORY.MONTHLY_RECAP, fireDate: day });
    expect(r.allowed).toBe(false);
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1', 'notification_failed',
      expect.objectContaining({ category: 'monthly_recap', reason: 'budget_capped' }),
    );
    expect(mockCancelAsync).not.toHaveBeenCalled();
  });

  test('eviction cancels the loser and records budget_evicted', async () => {
    const day = wednesday();
    mockGetAll.mockResolvedValue([
      pending('keep', 'weekly_coach_ready', { type: 'date', date: new Date(day) }),
      pending('loser', 'partner_cheer', { type: 'date', date: new Date(day) }),
    ]);
    const r = await requestEventPushSlot({ category: CATEGORY.CASCADE_GATE, fireDate: day });
    expect(r.allowed).toBe(true);
    expect(mockCancelAsync).toHaveBeenCalledWith('loser');
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1', 'notification_failed',
      expect.objectContaining({ category: 'partner_cheer', reason: 'budget_evicted' }),
    );
  });

  test('empty schedule allows', async () => {
    const r = await requestEventPushSlot({ category: CATEGORY.CHECKIN_MISSED, fireDate: new Date() });
    expect(r.allowed).toBe(true);
  });
});
