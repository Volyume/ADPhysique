/**
 * deriveHabitualTrainingWeekdays (D17), the pure rule inside
 * trainingHabitSchedule.js. Pins the replacement for the training-day
 * reminder's dead schedule substrate (@volyume_schedule_v1): a
 * deterministic, habit-derived schedule built from completed-workout
 * history, per the founder steer "rest days are not strictly adhered to,
 * user trains on the days they want and have lives"
 * (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, D17).
 *
 * Pure function, fixed epoch-ms fixtures only, no mocks needed. The
 * DB-touching writer (refreshHabitDerivedTrainingSchedule) has its own test
 * file, trainingHabitSchedule.writer.test.js; the contract against the
 * REAL reader lives in trainingHabitSchedule.contract.test.js.
 */

// deriveHabitualTrainingWeekdays itself is pure and touches none of these,
// but requiring trainingHabitSchedule.js also pulls in trainingReminders.js
// (for the writer half of the module), which needs react-native/
// expo-notifications present to load at all. Minimal mocks only, matching
// the pattern used across the notifications test suite.
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const {
  deriveHabitualTrainingWeekdays,
  HABIT_WINDOW_WEEKS,
  MIN_HISTORY_WEEKS,
} = require('../trainingHabitSchedule');
const { localWeekStartMs } = require('../../dayKey');

describe('deriveHabitualTrainingWeekdays (pure rule)', () => {
  test('deterministic: identical inputs always produce identical output', () => {
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    const timestamps = [
      currentWeekStart - 1 * WEEK_MS + 2 * DAY_MS,
      currentWeekStart - 2 * WEEK_MS + 2 * DAY_MS,
      currentWeekStart - 3 * WEEK_MS + 2 * DAY_MS,
    ];
    const a = deriveHabitualTrainingWeekdays(timestamps, now);
    const b = deriveHabitualTrainingWeekdays([...timestamps], now);
    expect(a).toEqual(b);
  });

  test('no workouts at all -> null (insufficient history, do not guess)', () => {
    expect(deriveHabitualTrainingWeekdays([], Date.now())).toBeNull();
    expect(deriveHabitualTrainingWeekdays(null, Date.now())).toBeNull();
  });

  test('window edge: fewer than MIN_HISTORY_WEEKS of history -> null', () => {
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    // Earliest workout only 1 full week back: historySpanWeeks = 1 < MIN_HISTORY_WEEKS (2).
    const timestamps = [currentWeekStart - 1 * WEEK_MS + DAY_MS];
    expect(MIN_HISTORY_WEEKS).toBe(2);
    expect(deriveHabitualTrainingWeekdays(timestamps, now)).toBeNull();
  });

  test('window edge: exactly MIN_HISTORY_WEEKS of history is enough to derive', () => {
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    // Earliest workout exactly 2 full weeks back, trained on the same
    // weekday in both observed weeks -> observedWeeks = 2, threshold =
    // ceil(2/2) = 1, so a single occurrence per week already qualifies, and
    // 2-for-2 certainly clears it.
    const dayOffset = 3;
    const wd1 = currentWeekStart - 2 * WEEK_MS + dayOffset * DAY_MS + 3600000;
    const wd2 = currentWeekStart - 1 * WEEK_MS + dayOffset * DAY_MS + 3600000;
    const expectedWeekday = new Date(wd1).getDay();
    const days = deriveHabitualTrainingWeekdays([wd1, wd2], now);
    expect(days).toEqual([expectedWeekday]);
  });

  test('window is capped at HABIT_WINDOW_WEEKS: older history outside the window is ignored', () => {
    expect(HABIT_WINDOW_WEEKS).toBe(6);
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    const trainedDayOffset = 1;
    // Trained on this weekday in only 2 of the most recent 6 weeks (below
    // the ceil(6/2)=3 threshold), plus 3 more hits well outside the window
    // (weeks 8-10 back) -- those older hits must not be able to rescue it.
    const timestamps = [
      currentWeekStart - 1 * WEEK_MS + trainedDayOffset * DAY_MS,
      currentWeekStart - 2 * WEEK_MS + trainedDayOffset * DAY_MS,
      currentWeekStart - 8 * WEEK_MS + trainedDayOffset * DAY_MS,
      currentWeekStart - 9 * WEEK_MS + trainedDayOffset * DAY_MS,
      currentWeekStart - 10 * WEEK_MS + trainedDayOffset * DAY_MS,
    ];
    const trainedWeekday = new Date(currentWeekStart - 1 * WEEK_MS + trainedDayOffset * DAY_MS).getDay();
    const days = deriveHabitualTrainingWeekdays(timestamps, now);
    expect(days).not.toContain(trainedWeekday);
  });

  test('half-the-observed-weeks threshold, rounded up (6-week window, threshold = 3)', () => {
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    // Push earliest history back exactly HABIT_WINDOW_WEEKS so observedWeeks = 6.
    const anchor = currentWeekStart - HABIT_WINDOW_WEEKS * WEEK_MS + DAY_MS;

    const mondayOffset = 0;
    const fridayOffset = 4;

    const timestamps = [anchor]; // guarantees historySpanWeeks >= HABIT_WINDOW_WEEKS
    // mondayOffset weekday: trained in exactly 3 of the 6 weeks (meets ceil(6/2)=3).
    for (const w of [1, 3, 5]) {
      timestamps.push(currentWeekStart - w * WEEK_MS + mondayOffset * DAY_MS + 3600000);
    }
    // fridayOffset weekday: trained in exactly 2 of the 6 weeks (below threshold).
    for (const w of [2, 4]) {
      timestamps.push(currentWeekStart - w * WEEK_MS + fridayOffset * DAY_MS + 3600000);
    }

    const mondayWeekday = new Date(currentWeekStart - 1 * WEEK_MS + mondayOffset * DAY_MS).getDay();
    const fridayWeekday = new Date(currentWeekStart - 2 * WEEK_MS + fridayOffset * DAY_MS).getDay();

    const days = deriveHabitualTrainingWeekdays(timestamps, now);
    expect(days).toContain(mondayWeekday);
    expect(days).not.toContain(fridayWeekday);
  });

  test('sparse-but-sufficient history with no consistent weekday -> empty array, not null', () => {
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    // Enough history span (well past MIN_HISTORY_WEEKS) but a different
    // weekday each week, so nothing ever repeats -> no weekday clears the
    // threshold. Distinguished from the "no history" case: the writer
    // treats [] as "we looked, there is no pattern" and still writes it,
    // cancelling any stale schedule.
    const timestamps = [0, 1, 2, 3, 4, 5].map(
      (w) => currentWeekStart - (w + 1) * WEEK_MS + w * DAY_MS + 3600000,
    );
    const days = deriveHabitualTrainingWeekdays(timestamps, now);
    expect(days).not.toBeNull();
    expect(days).toEqual([]);
  });

  test('weekday mapping stays correct across a month boundary inside the window', () => {
    // "now" chosen so the current week's Monday is comfortably inside
    // September, and the 6-week window therefore reaches back into
    // August/July -- self-verified below rather than assumed.
    const now = Date.UTC(2026, 8, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    const windowStart = currentWeekStart - HABIT_WINDOW_WEEKS * WEEK_MS;
    const startMonth = new Date(windowStart).getUTCMonth();
    const endMonth = new Date(currentWeekStart - 1).getUTCMonth();
    expect(startMonth).not.toBe(endMonth); // confirms the window really straddles a month boundary

    const dayOffset = 2;
    const timestamps = [];
    for (let w = 1; w <= HABIT_WINDOW_WEEKS; w++) {
      timestamps.push(currentWeekStart - w * WEEK_MS + dayOffset * DAY_MS + 10 * 3600000);
    }
    const expectedWeekday = new Date(timestamps[0]).getDay();
    const days = deriveHabitualTrainingWeekdays(timestamps, now);
    expect(days).toEqual([expectedWeekday]);
  });

  test('the current (in-progress) week is never counted', () => {
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const currentWeekStart = localWeekStartMs(now);
    const anchor = currentWeekStart - MIN_HISTORY_WEEKS * WEEK_MS + DAY_MS;
    // A workout logged earlier today, in the in-progress week.
    const todayWorkout = now - 3600000;
    const days = deriveHabitualTrainingWeekdays([anchor, todayWorkout], now);
    const todayWeekday = new Date(todayWorkout).getDay();
    // A single hit in the in-progress week must not influence the result at
    // all (it is excluded from bucketing entirely, not merely under-weighted).
    expect(days).not.toContain(todayWeekday);
  });
});
