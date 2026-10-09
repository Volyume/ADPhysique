/**
 * exerciseHistory.kinds.test.js: pins D220 addendum 34 (2026-10-09, the
 * logger audit's C16): reps-only, timed and distance exercises have a
 * history and records of their own. Before this the builder treated every
 * row without a weight as invalid, so the History sheet told a person with
 * forty sessions of pull-ups "No sets logged yet". Written to FAIL if a
 * weightless row is dropped again or a kind's records lose their meaning.
 */
import { buildExerciseHistory } from '../exerciseHistory';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);
const row = (workoutId, reps, daysAgo, weight = '') => ({ workoutId, weight, actualReps: reps, createdAt: NOW - daysAgo * DAY, setType: 'straight' });

describe('reps-only', () => {
  test('history keeps every set, the best per session is the most reps, and the records are most reps and best session', () => {
    // Sets in a session are a minute apart so their logged order is fixed.
    const h = buildExerciseHistory({ kind: 'reps_only', now: NOW, sets: [row('a', 8, 10.001), row('a', 12, 10), row('b', 10, 2.001), row('b', 9, 2)] });
    expect(h.history).toHaveLength(2);
    expect(h.history[0].sets.map((s) => s.reps)).toEqual([10, 9]);
    expect(h.history[0].sets.map((s) => s.isBest)).toEqual([true, false]);
    expect(h.history[1].sets.map((s) => s.isBest)).toEqual([false, true]);
    expect(h.records.lifetime.mostReps.reps).toBe(12);
    expect(h.records.lifetime.bestSessionReps.value).toBe(20);
    expect(h.repsAtWeight).toEqual([]);
    expect(h.bests).toBeNull();
  });
  test('a weightless row is valid; only a row with no reps is dropped from the records', () => {
    const h = buildExerciseHistory({ kind: 'reps_only', now: NOW, sets: [row('a', 0, 1), row('a', 6, 1)] });
    expect(h.records.lifetime.mostReps.reps).toBe(6);
  });
});

describe('duration', () => {
  test('the longest set and the longest session, in seconds', () => {
    const h = buildExerciseHistory({ kind: 'duration', now: NOW, sets: [row('a', 45, 5), row('a', 60, 5), row('b', 90, 1)] });
    expect(h.records.lifetime.longestSet.reps).toBe(90);
    expect(h.records.lifetime.longestSession.value).toBe(105);
    expect(h.records.threeMonths.longestSet.reps).toBe(90);
  });
});

describe('distance', () => {
  test('the farthest set (ties to the faster), and the farthest session', () => {
    const h = buildExerciseHistory({ kind: 'distance', now: NOW, sets: [row('a', 300, 5.001, 1000), row('a', 280, 5, 1000), row('b', 150, 1.001, 500), row('b', 160, 1, 500)] });
    expect(h.records.lifetime.farthestSet).toMatchObject({ weight: 1000, reps: 280 });
    expect(h.records.lifetime.bestSessionDistance.value).toBe(2000);
    expect(h.history[1].sets.map((s) => s.isBest)).toEqual([false, true]);
  });
});

describe('the three-month window', () => {
  test('an old record stays lifetime and leaves the three-month records', () => {
    const h = buildExerciseHistory({ kind: 'reps_only', now: NOW, sets: [row('old', 20, 200), row('new', 12, 3)] });
    expect(h.records.lifetime.mostReps.reps).toBe(20);
    expect(h.records.threeMonths.mostReps.reps).toBe(12);
  });
});

describe('weight exercises are unchanged', () => {
  test('the default kind keeps the weight records and the reps-at-weight table', () => {
    const h = buildExerciseHistory({ now: NOW, sets: [row('a', 8, 1, 60), row('a', 8, 1, 65)] });
    expect(h.records.lifetime.heaviest).toMatchObject({ weight: 65, reps: 8 });
    expect(h.repsAtWeight).toHaveLength(2);
  });
});
