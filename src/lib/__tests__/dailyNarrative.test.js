import { buildDailyNarrative } from '../dailyNarrative';

describe('buildDailyNarrative', () => {
  test('returns null for a brand-new user with nothing logged', () => {
    expect(buildDailyNarrative({ totalSessions: 0, lastWorkoutDaysAgo: null })).toBeNull();
  });

  test('stays quiet while a workout is in progress', () => {
    expect(buildDailyNarrative({
      hasActiveWorkout: true, totalSessions: 10, lastWorkoutDaysAgo: 1,
    })).toBeNull();
  });

  test('celebrates a session logged today with tonnage', () => {
    const line = buildDailyNarrative({ totalSessions: 5, lastWorkoutDaysAgo: 0, lastSessionTonnage: 8200 });
    expect(line).toMatch(/Logged today/);
    expect(line).toMatch(/8\.2 t/);
  });

  test('welcomes back gently after a layoff', () => {
    expect(buildDailyNarrative({ totalSessions: 30, lastWorkoutDaysAgo: 9 }))
      .toMatch(/Welcome back/);
  });

  test('yesterday line names the tonnage when known', () => {
    expect(buildDailyNarrative({ totalSessions: 12, lastWorkoutDaysAgo: 1, lastSessionTonnage: 450 }))
      .toMatch(/450 kg/);
  });

  test('is deterministic for identical inputs', () => {
    const input = { totalSessions: 12, lastWorkoutDaysAgo: 1, lastSessionTonnage: 450, sessionsThisWeek: 2 };
    expect(buildDailyNarrative(input)).toBe(buildDailyNarrative(input));
  });

  test('never emits an em dash (voice rule)', () => {
    const cases = [
      { totalSessions: 5, lastWorkoutDaysAgo: 0, lastSessionTonnage: 8200 },
      { totalSessions: 5, lastWorkoutDaysAgo: 1 },
      { totalSessions: 5, lastWorkoutDaysAgo: 3, sessionsThisWeek: 1 },
      { totalSessions: 5, lastWorkoutDaysAgo: 9 },
    ];
    for (const c of cases) {
      const line = buildDailyNarrative(c);
      if (line) expect(line).not.toMatch(/—/);
    }
  });

  test('handles malformed input without throwing', () => {
    expect(() => buildDailyNarrative(null)).not.toThrow();
    expect(() => buildDailyNarrative({ lastWorkoutDaysAgo: 'x', totalSessions: NaN })).not.toThrow();
  });
});
