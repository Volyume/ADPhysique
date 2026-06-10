import { buildMonthlyReport } from '../monthlyReport';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 4, 20);

function wk(daysAgo, id) {
  return { id, isCompleted: true, startedAt: NOW - daysAgo * DAY };
}
function st(workoutId, weight = 100, reps = 5) {
  return { workoutId, weight, actualReps: reps, setType: 'straight' };
}

describe('buildMonthlyReport', () => {
  test('returns null with no completed workouts', () => {
    expect(buildMonthlyReport({ workouts: [], sets: [], now: NOW })).toBeNull();
  });

  test('returns null below the 3-session threshold', () => {
    const workouts = [wk(2, 'a'), wk(5, 'b')];
    expect(buildMonthlyReport({ workouts, sets: [], now: NOW })).toBeNull();
  });

  test('builds a 30-day report with sessions, days and tonnage', () => {
    const workouts = [wk(1, 'a'), wk(4, 'b'), wk(9, 'c'), wk(14, 'd')];
    const sets = [st('a'), st('a'), st('b'), st('c'), st('d')];
    const r = buildMonthlyReport({ workouts, sets, prCount: 2, now: NOW });
    expect(r).toBeTruthy();
    expect(r.sessions).toBe(4);
    expect(r.trainingDays).toBe(4);
    expect(r.tonnageKg).toBeGreaterThan(0);
    expect(r.prs).toBe(2);
    expect(r.isFirstBlock).toBe(false);
    expect(r.headline).not.toMatch(/—/);
  });

  test('flags the first-block recap around the 90-day mark', () => {
    const workouts = [];
    // 14 sessions from ~88 days ago to recent, several inside the last 30
    for (let i = 0; i < 14; i++) workouts.push(wk(88 - i * 6, `w${i}`));
    const sets = workouts.map(w => st(w.id));
    const r = buildMonthlyReport({ workouts, sets, now: NOW });
    expect(r).toBeTruthy();
    expect(r.isFirstBlock).toBe(true);
    expect(r.title).toMatch(/first block/i);
  });

  test('only counts sets and sessions inside the 30-day window', () => {
    const workouts = [wk(1, 'a'), wk(4, 'b'), wk(9, 'c'), wk(40, 'old')];
    const sets = [st('a'), st('b'), st('c'), st('old', 999, 10)];
    const r = buildMonthlyReport({ workouts, sets, now: NOW });
    expect(r.sessions).toBe(3); // 'old' excluded
  });

  test('does not throw on malformed input', () => {
    expect(() => buildMonthlyReport(null)).not.toThrow();
    expect(() => buildMonthlyReport({ workouts: 'x', sets: null })).not.toThrow();
  });
});
