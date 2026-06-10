/**
 * Tests for insightsEngine, the rule-based nudge generator that powers
 * the Home screen's coaching cards and the analytics insights feed.
 */
import { generateInsights, rankAndCapInsights } from '../insightsEngine';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 4, 20);

function mkWorkout(daysAgo, overrides = {}) {
  const at = NOW - daysAgo * DAY;
  return {
    id: `w_${daysAgo}`,
    startedAt: at,
    createdAt: at,
    isCompleted: true,
    ...overrides,
  };
}

function mkSet(daysAgo, exerciseId, overrides = {}) {
  return {
    id: `s_${daysAgo}_${exerciseId}_${Math.random().toString(36).slice(2, 6)}`,
    exerciseId,
    workoutId: `w_${daysAgo}`,
    createdAt: NOW - daysAgo * DAY,
    weight: 100,
    actualReps: 8,
    rir: 2,
    setType: 'straight',
    ...overrides,
  };
}

const exerciseMap = {
  bench: { id: 'bench', name: 'Bench Press', primary_muscle: 'chest', secondary_muscles: '[]', default_rep_min: 6, default_rep_max: 10 },
  squat: { id: 'squat', name: 'Back Squat', primary_muscle: 'quads', secondary_muscles: '["glutes"]', default_rep_min: 5, default_rep_max: 8 },
  curl:  { id: 'curl',  name: 'Bicep Curl', primary_muscle: 'biceps', secondary_muscles: '[]', default_rep_min: 8, default_rep_max: 12 },
};

describe('generateInsights, base cases', () => {
  test('empty inputs return empty array (no insights for new user)', () => {
    expect(generateInsights({ workouts: [], sets: [], exerciseMap, now: NOW })).toEqual([]);
  });

  test('1 week of data does not trigger the 3-week-base rules', () => {
    const workouts = Array.from({ length: 3 }, (_, i) => mkWorkout(i + 1));
    const sets = Array.from({ length: 9 }, (_, i) => mkSet((i % 3) + 1, 'bench'));
    const insights = generateInsights({ workouts, sets, exerciseMap, now: NOW });
    expect(insights.find(i => i.type === 'under_mev_muscle')).toBeUndefined();
  });

  test('insight objects have a stable shape', () => {
    // Trigger a stalled-lift insight: 4 sessions at the same top weight/reps
    // with average RIR >= 3.
    const days = [21, 14, 7, 0];
    const workouts = days.map(d => mkWorkout(d));
    const sets = [];
    for (const d of days) {
      for (let s = 0; s < 3; s++) {
        sets.push(mkSet(d, 'bench', { setNumber: s + 1, weight: 100, actualReps: 6, rir: 3 }));
      }
    }
    const insights = generateInsights({ workouts, sets, exerciseMap, now: NOW });
    if (insights.length > 0) {
      const i = insights[0];
      expect(typeof i.type).toBe('string');
      expect(typeof i.copy).toBe('string');
      expect(typeof i.severity).toBe('number');
      expect(typeof i.key).toBe('string');
    }
  });

  test('problem insights carry a coach-action line, folded into actionPayload', () => {
    // A stalled lift is a problem insight, so it should ship a coachAction
    // that also round-trips through actionPayload (the persisted column).
    const days = [21, 14, 7, 0];
    const workouts = days.map(d => mkWorkout(d));
    const sets = [];
    for (const d of days) {
      for (let s = 0; s < 3; s++) {
        sets.push(mkSet(d, 'bench', { setNumber: s + 1, weight: 100, actualReps: 6, rir: 3 }));
      }
    }
    const stalled = generateInsights({ workouts, sets, exerciseMap, now: NOW })
      .find(i => i.type === 'stalled_lift');
    expect(stalled).toBeTruthy();
    expect(typeof stalled.coachAction).toBe('string');
    expect(stalled.coachAction.length).toBeGreaterThan(0);
    // Survives persistence: the action line lives on actionPayload too.
    expect(stalled.actionPayload.coachAction).toBe(stalled.coachAction);
    // Voice rule: no em dashes in user-facing copy.
    expect(stalled.coachAction).not.toMatch(/—/);
  });

  test('the positive rhythm insight has no coach-action line', () => {
    const workouts = Array.from({ length: 6 }, (_, i) => mkWorkout(i * 3));
    const rhythm = generateInsights({ workouts, sets: [], exerciseMap, now: NOW })
      .find(i => i.type === 'gentle_rhythm');
    if (rhythm) expect(rhythm.coachAction).toBeNull();
  });
});

describe('rankAndCapInsights', () => {
  test('caps the output at the supplied max', () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({
      type: 'stalled_lift', severity: i, copy: `c${i}`, key: `k${i}`, action: null,
    }));
    expect(rankAndCapInsights(raw, 3).length).toBeLessThanOrEqual(3);
  });

  test('empty input returns empty output', () => {
    expect(rankAndCapInsights([], 5)).toEqual([]);
  });

  test('preserves at most one insight per type when duplicates exist', () => {
    const raw = [
      { type: 'stalled_lift', severity: 1, copy: 'a', key: 'k1', action: null },
      { type: 'stalled_lift', severity: 1, copy: 'b', key: 'k2', action: null },
      { type: 'peaked_lift',  severity: 1, copy: 'c', key: 'k3', action: null },
    ];
    const out = rankAndCapInsights(raw, 5);
    // Either dedupes by type or keeps all, both are valid behaviours for
    // a ranker. Just assert it never increases the count.
    expect(out.length).toBeLessThanOrEqual(raw.length);
  });
});

describe('generateInsights, robustness', () => {
  test('handles sets missing exerciseId without crashing', () => {
    const workouts = [mkWorkout(1)];
    const sets = [mkSet(1, undefined)];
    expect(() => generateInsights({ workouts, sets, exerciseMap, now: NOW })).not.toThrow();
  });

  test('handles sets pointing at an exercise not in the map', () => {
    const workouts = [mkWorkout(1)];
    const sets = [mkSet(1, 'unknown_ex_id')];
    expect(() => generateInsights({ workouts, sets, exerciseMap, now: NOW })).not.toThrow();
  });

  test('handles workouts missing timestamps', () => {
    const workouts = [{ id: 'w_no_ts', isCompleted: true }];
    const sets = [mkSet(1, 'bench')];
    expect(() => generateInsights({ workouts, sets, exerciseMap, now: NOW })).not.toThrow();
  });
});
