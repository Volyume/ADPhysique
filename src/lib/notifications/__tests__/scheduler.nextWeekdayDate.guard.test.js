/**
 * Source-level guard for the PRODUCER half of the VOLYUME-1K native crash.
 *
 * triggerDate.js stops a bad date reaching native. This suite pins the other
 * end: getNextWeekdayDate must not manufacture an Invalid Date in the first
 * place, because it feeds two DATE triggers (the weekly check-in reminder and
 * the weekly coach-ready push) and its old body could not repair one:
 *
 *   - `target.setHours(NaN, ...)` invalidates the Date outright.
 *   - `daysUntil === 0 && target.getTime() <= after.getTime()` is FALSE for
 *     NaN, so the correction branch never runs.
 *   - `target.setDate(target.getDate() + daysUntil)` is NaN + NaN, still invalid.
 *
 * So an unusable weekday/hour/minute travelled all the way to Swift and killed
 * the app. The function now proves its inputs and returns null instead, and
 * both call sites skip on null and report which one supplied the bad value.
 *
 * scheduler.js pulls the whole expo-notifications/AsyncStorage/store stack in
 * at import time, so this is a source pin, matching the house convention used
 * by scheduler.copyFixes.guard.test.js and scheduler.edSuppression.guard.test.js.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'scheduler.js'), 'utf8');

function bodyOf(anchor, src = SRC) {
  const start = src.indexOf(anchor);
  expect(start).toBeGreaterThan(-1);
  const rest = src.slice(start + anchor.length);
  const next = rest.indexOf('\nexport async function ');
  return rest.slice(0, next === -1 ? rest.length : next);
}

describe('getNextWeekdayDate proves its inputs', () => {
  const body = bodyOf('function getNextWeekdayDate(');

  test('rejects a non-finite weekday, hour or minute', () => {
    expect(body).toContain('Number.isFinite(n)');
    expect(body).toContain('if (!usable(weekday) || !usable(hour) || !usable(minute)) return null;');
  });

  test('rejects an already-invalid `after` rather than propagating it', () => {
    expect(body).toContain('if (Number.isNaN(target.getTime())) return null;');
  });

  test('validates BEFORE setHours, which is what invalidates the Date', () => {
    const guard = body.indexOf('if (!usable(weekday)');
    const setHours = body.indexOf('target.setHours(');
    expect(guard).toBeGreaterThan(-1);
    expect(setHours).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(setHours);
  });

  test('records why the guard exists so it is not "simplified" away later', () => {
    expect(body).toContain('VOLYUME-1K');
  });
});

describe('both call sites skip on null instead of scheduling', () => {
  test('scheduleCheckinReminder returns and reports', () => {
    const body = bodyOf('export async function scheduleCheckinReminder(');
    expect(body).toContain('if (!fireAt) {');
    expect(body).toContain("reason: 'invalid_trigger_date'");
    expect(body).toContain('category: CATEGORY.WEEKLY_CHECKIN_REMINDER,');
    // The skip must come before the push is laid, exactly like the ED guards.
    expect(body.indexOf('if (!fireAt) {')).toBeLessThan(
      body.indexOf('scheduleCheckedNotification('),
    );
  });

  test('scheduleWeeklyCoachReady returns and reports', () => {
    const body = bodyOf('export async function scheduleWeeklyCoachReady(');
    expect(body).toContain('if (!fireAt) {');
    expect(body).toContain("reason: 'invalid_trigger_date'");
    expect(body).toContain('category: CATEGORY.WEEKLY_COACH_READY,');
    expect(body.indexOf('if (!fireAt) {')).toBeLessThan(
      body.indexOf('scheduleCheckedNotification('),
    );
  });

  test('every getNextWeekdayDate result is null-checked', () => {
    // If a third call site ever appears without a guard, this fails.
    const calls = SRC.split('\n').filter((l) => /=\s*getNextWeekdayDate\(/.test(l));
    expect(calls).toHaveLength(2);
    expect(SRC.split('if (!fireAt) {').length - 1).toBe(2);
  });
});
