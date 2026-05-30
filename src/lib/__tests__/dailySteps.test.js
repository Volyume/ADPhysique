/**
 * daily_steps activity store, contract + day-key guards.
 *
 * The storage layer has no SQL engine under jest, so the CRUD (setDailySteps
 * / getDailySteps / getDailyStepsRange) is exercised end-to-end on device,
 * not here. What this pins is the part that is pure and the part that is a
 * shared contract: the day-key convention (which must match the Diary so a
 * day's steps and that day's food share a boundary), and the table being in
 * the sign-out wipe set (locked decision 2: sign-out wipes every user-scoped
 * table).
 */
import { activityDayKey, WIPE_DIRECT_TABLES } from '../database';

describe('activityDayKey', () => {
  test('returns a YYYY-MM-DD string', () => {
    expect(activityDayKey(Date.parse('2026-05-30T09:15:00.000Z'))).toBe('2026-05-30');
  });

  test('matches the Diary isoDate convention (toISOString slice, UTC day)', () => {
    const ms = Date.parse('2026-01-02T23:30:00.000Z');
    expect(activityDayKey(ms)).toBe(new Date(ms).toISOString().slice(0, 10));
  });

  test('defaults to today when called with no argument', () => {
    expect(activityDayKey()).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('daily_steps wipe contract', () => {
  test('is in the sign-out direct-wipe set', () => {
    expect(WIPE_DIRECT_TABLES).toContain('daily_steps');
  });
});
