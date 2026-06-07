/**
 * database.writeGuards.test.js
 *
 * Defence-in-depth guards on three write/read paths (added after the
 * pre-launch adversarial pass). All three guards reject their bad input
 * BEFORE touching SQLite, so they are testable here without a SQL engine
 * (the repo convention is that CRUD itself is exercised on device).
 *
 *   - logMorningWeight: weight_kg is NOT NULL and a single measurement,
 *     so a non-finite or non-positive value is rejected loudly rather than
 *     bound as NULL (opaque constraint error) or coerced (poisoned trend).
 *   - getWeeklySessionStats / getWeeklyPRCount: weekStart must be epoch-ms.
 *     This is the 2026-06 check-in data-window bug. A Date is coerced; a
 *     non-finite arg throws instead of silently running a broken window.
 */
import {
  logMorningWeight, getWeeklySessionStats, getWeeklyPRCount, coerceWeekStartMs,
} from '../database';

describe('coerceWeekStartMs (the data-window coercion)', () => {
  test('passes a finite epoch-ms through unchanged', () => {
    const ms = Date.UTC(2026, 5, 1);
    expect(coerceWeekStartMs(ms, 'fn')).toBe(ms);
  });

  test('coerces a Date to its epoch-ms (the old string-concat bug)', () => {
    const d = new Date(2026, 5, 1);
    expect(coerceWeekStartMs(d, 'fn')).toBe(d.getTime());
    expect(typeof coerceWeekStartMs(d, 'fn')).toBe('number');
  });

  test('coerces a numeric string', () => {
    expect(coerceWeekStartMs('1700000000000', 'fn')).toBe(1700000000000);
  });

  test('throws on a non-numeric string, NaN, null and undefined', () => {
    expect(() => coerceWeekStartMs('next-monday', 'fn')).toThrow(/epoch-ms/);
    expect(() => coerceWeekStartMs(NaN, 'fn')).toThrow(/epoch-ms/);
    expect(() => coerceWeekStartMs(null, 'fn')).toThrow(/epoch-ms/);
    expect(() => coerceWeekStartMs(undefined, 'fn')).toThrow(/epoch-ms/);
  });

  test('names the calling function in the error', () => {
    expect(() => coerceWeekStartMs(undefined, 'getWeeklySessionStats'))
      .toThrow(/getWeeklySessionStats/);
  });
});

describe('logMorningWeight weight guard', () => {
  test('rejects NaN weight', async () => {
    await expect(logMorningWeight('u1', { weightKg: NaN }))
      .rejects.toThrow(/positive finite number/);
  });

  test('rejects a non-numeric weight', async () => {
    await expect(logMorningWeight('u1', { weightKg: '80kg' }))
      .rejects.toThrow(/positive finite number/);
  });

  test('rejects zero and negative weight', async () => {
    await expect(logMorningWeight('u1', { weightKg: 0 })).rejects.toThrow(/positive finite number/);
    await expect(logMorningWeight('u1', { weightKg: -5 })).rejects.toThrow(/positive finite number/);
  });

  test('rejects a missing weight (called with no body)', async () => {
    await expect(logMorningWeight('u1', {})).rejects.toThrow(/positive finite number/);
  });
});

describe('getWeeklySessionStats weekStart guard', () => {
  test('rejects undefined weekStart', async () => {
    await expect(getWeeklySessionStats('u1', undefined)).rejects.toThrow(/epoch-ms/);
  });

  test('rejects a non-numeric string weekStart', async () => {
    await expect(getWeeklySessionStats('u1', 'this-monday')).rejects.toThrow(/epoch-ms/);
  });

  test('rejects NaN weekStart', async () => {
    await expect(getWeeklySessionStats('u1', NaN)).rejects.toThrow(/epoch-ms/);
  });
});

describe('getWeeklyPRCount weekStart guard', () => {
  test('rejects undefined weekStart', async () => {
    await expect(getWeeklyPRCount('u1', undefined)).rejects.toThrow(/epoch-ms/);
  });

  test('rejects a non-numeric string weekStart', async () => {
    await expect(getWeeklyPRCount('u1', 'this-monday')).rejects.toThrow(/epoch-ms/);
  });
});
