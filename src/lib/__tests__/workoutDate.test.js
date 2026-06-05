import { workoutDayMs, workoutDayKey, calendarRelativeLabel } from '../workoutDate';
import { localDayKey } from '../dayKey';

// Timestamps are built with the local Date constructor and read back with the
// local dayKey helpers, so these assertions hold regardless of the test
// runner's timezone (matching how the app runs on the user's device).
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('workoutDayMs', () => {
  it('attributes the workout to when it ended (was trained), not when it started', () => {
    // Created late on the 3rd, finished the morning of the 4th.
    const w = { startedAt: at(2026, 6, 3, 23, 50), endedAt: at(2026, 6, 4, 8, 0) };
    expect(workoutDayKey(w)).toBe('2026-06-04');
  });

  it('falls back to startedAt when there is no end time', () => {
    const w = { startedAt: at(2026, 6, 4, 9, 0), endedAt: null };
    expect(workoutDayMs(w)).toBe(at(2026, 6, 4, 9, 0));
    expect(workoutDayKey(w)).toBe('2026-06-04');
  });

  it('falls back to createdAt when neither start nor end is present', () => {
    const w = { createdAt: at(2026, 6, 1, 7, 0) };
    expect(workoutDayKey(w)).toBe('2026-06-01');
  });
});

describe('calendarRelativeLabel', () => {
  const now = at(2026, 6, 5, 5, 30); // Fri 5 Jun, early morning

  it('says Today for the same calendar day', () => {
    expect(calendarRelativeLabel(at(2026, 6, 5, 1, 0), now)).toBe('Today');
  });

  it('says Yesterday for the previous calendar day, even across a 24-42h gap', () => {
    // A workout the morning of the 4th is ~21h before, but a workout the
    // afternoon of the 4th can be >24h before; both are "Yesterday" by calendar.
    expect(calendarRelativeLabel(at(2026, 6, 4, 8, 0), now)).toBe('Yesterday');
  });

  it('counts whole calendar days, not rounded hours', () => {
    expect(calendarRelativeLabel(at(2026, 6, 2, 18, 0), now)).toBe('3 days ago');
  });

  it('matches the absolute day-key it is shown beside', () => {
    const ms = at(2026, 6, 4, 8, 0);
    expect(localDayKey(ms)).toBe('2026-06-04');
    expect(calendarRelativeLabel(ms, now)).toBe('Yesterday');
  });
});
