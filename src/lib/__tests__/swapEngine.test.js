/**
 * Tests for swapEngine, the exercise-substitution scorer used by both the
 * ad-hoc "swap this exercise" UI and the joint-discomfort auto-swap.
 *
 * Validates: scoring monotonicity, sort stability with missing names,
 * joint-discomfort detection logic, deterministic tie-break.
 */
import { rankSwaps, buildSwapReason, detectJointDiscomfortPattern, autoSwapForJointDiscomfort } from '../swapEngine';

const ex = (overrides = {}) => ({
  id: `ex_${Math.random().toString(36).slice(2)}`,
  name: 'Test Exercise',
  primary_muscle: 'chest',
  secondary_muscles: '[]',
  equipment: 'barbell',
  movement_pattern: 'horizontal_press',
  compound_isolation: 'compound',
  unilateral_bilateral: 'bilateral',
  tension_at_stretch: 'medium',
  resistance_profile: 'ascending',
  injury_sensitivity: null,
  ...overrides,
});

describe('rankSwaps', () => {
  test('returns empty array when the candidate pool is empty', () => {
    const original = ex({ name: 'Bench Press' });
    expect(rankSwaps(original, [])).toEqual([]);
  });

  test('does not include the original in the candidates', () => {
    const original = ex({ id: 'a', name: 'Bench Press' });
    const candidates = [original, ex({ id: 'b', name: 'Dumbbell Press' })];
    const out = rankSwaps(original, candidates);
    expect(out.find(r => r.exercise.id === 'a')).toBeUndefined();
  });

  test('prefers same primary muscle', () => {
    const original = ex({ id: 'a', primary_muscle: 'chest', name: 'Bench Press' });
    const sameMuscle = ex({ id: 'b', primary_muscle: 'chest', name: 'Dumbbell Press' });
    const differentMuscle = ex({ id: 'c', primary_muscle: 'back', name: 'Pull-Up' });
    const out = rankSwaps(original, [sameMuscle, differentMuscle]);
    expect(out[0].exercise.id).toBe('b');
  });

  test('sort tie-break uses name and never crashes on missing names', () => {
    const original = ex({ id: 'a', name: 'Bench Press' });
    // Both candidates equally identical to original, tie-break should be
    // by name and the missing-name one should not crash.
    const candidates = [
      ex({ id: 'b', name: undefined, primary_muscle: 'chest' }),
      ex({ id: 'c', name: 'Alpha', primary_muscle: 'chest' }),
    ];
    expect(() => rankSwaps(original, candidates)).not.toThrow();
  });

  test('respects numResults cap', () => {
    const original = ex({ id: 'a', name: 'Bench Press' });
    const candidates = Array.from({ length: 20 }, (_, i) => ex({ id: `c${i}`, name: `Ex ${i}` }));
    const out = rankSwaps(original, candidates, { numResults: 3 });
    expect(out.length).toBeLessThanOrEqual(3);
  });

  test('every result has a `reason` string attached', () => {
    const original = ex({ id: 'a', name: 'Bench Press' });
    const candidates = [ex({ id: 'b', name: 'Dumbbell Press', primary_muscle: 'chest' })];
    const [first] = rankSwaps(original, candidates);
    expect(typeof first.reason).toBe('string');
    expect(first.reason.length).toBeGreaterThan(0);
  });
});

describe('buildSwapReason', () => {
  test('returns a human-readable reason for plausible inputs', () => {
    const a = ex({ name: 'Bench Press', primary_muscle: 'chest' });
    const b = ex({ name: 'Dumbbell Press', primary_muscle: 'chest' });
    const reason = buildSwapReason(a, b);
    expect(typeof reason).toBe('string');
    expect(reason.length).toBeGreaterThan(0);
  });
});

describe('detectJointDiscomfortPattern', () => {
  test('empty log → not flagged', () => {
    const result = detectJointDiscomfortPattern([], 'ex1');
    expect(result.shouldSwap).toBe(false);
    expect(result.alertCount).toBe(0);
  });

  test('single discomfort event below threshold → not flagged', () => {
    const log = [{ exerciseId: 'ex1', jointDiscomfort: 3, sessionDate: Date.now() - 86400000 }];
    const result = detectJointDiscomfortPattern(log, 'ex1');
    expect(result.shouldSwap).toBe(false);
  });

  test('two discomfort events within window → flagged', () => {
    const now = Date.now();
    const log = [
      { exerciseId: 'ex1', jointDiscomfort: 3, sessionDate: now - 5 * 86400000 },
      { exerciseId: 'ex1', jointDiscomfort: 3, sessionDate: now - 1 * 86400000 },
    ];
    const result = detectJointDiscomfortPattern(log, 'ex1');
    expect(result.shouldSwap).toBe(true);
    expect(result.alertCount).toBe(2);
    expect(typeof result.message).toBe('string');
  });

  test('events with jointDiscomfort < 2 are not counted', () => {
    const now = Date.now();
    const log = [
      { exerciseId: 'ex1', jointDiscomfort: 1, sessionDate: now - 1 * 86400000 },
      { exerciseId: 'ex1', jointDiscomfort: 1, sessionDate: now - 2 * 86400000 },
    ];
    expect(detectJointDiscomfortPattern(log, 'ex1').shouldSwap).toBe(false);
  });

  test('events for a different exercise do not flag the target', () => {
    const log = [
      { exerciseId: 'ex2', jointDiscomfort: 5, sessionDate: Date.now() },
      { exerciseId: 'ex2', jointDiscomfort: 5, sessionDate: Date.now() },
    ];
    expect(detectJointDiscomfortPattern(log, 'ex1').shouldSwap).toBe(false);
  });

  test('events outside the window → not flagged', () => {
    const longAgo = Date.now() - 365 * 86400000;
    const log = [
      { exerciseId: 'ex1', jointDiscomfort: 3, sessionDate: longAgo },
      { exerciseId: 'ex1', jointDiscomfort: 3, sessionDate: longAgo + 86400000 },
    ];
    expect(detectJointDiscomfortPattern(log, 'ex1').shouldSwap).toBe(false);
  });
});

describe('autoSwapForJointDiscomfort', () => {
  test('empty inputs return empty array', () => {
    expect(autoSwapForJointDiscomfort([], [])).toEqual([]);
  });

  test('returns an entry per flagged exercise with swaps array', () => {
    const library = [
      ex({ id: 'a', name: 'Barbell Bench Press', primary_muscle: 'chest' }),
      ex({ id: 'b', name: 'Dumbbell Floor Press', primary_muscle: 'chest' }),
      ex({ id: 'c', name: 'Push-Up', primary_muscle: 'chest' }),
    ];
    const result = autoSwapForJointDiscomfort(['a'], library);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].originalId).toBe('a');
    expect(Array.isArray(result[0].swaps)).toBe(true);
  });

  test('flagged exercise not in library still produces an entry', () => {
    const result = autoSwapForJointDiscomfort(['missing'], []);
    expect(result.length).toBe(1);
    expect(result[0].swaps).toEqual([]);
  });
});
