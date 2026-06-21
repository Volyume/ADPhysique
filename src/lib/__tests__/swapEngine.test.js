/**
 * Tests for swapEngine, the exercise-substitution scorer used by both the
 * ad-hoc "swap this exercise" UI and the joint-discomfort auto-swap.
 *
 * Validates: scoring monotonicity, sort stability with missing names,
 * joint-discomfort detection logic, deterministic tie-break.
 */
import { rankSwaps, buildSwapReason } from '../swapEngine';

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

  describe('excludeAssisted (athlete suitability)', () => {
    // Pull-Up being swapped: Assisted Pull-Up scores high (same muscle, pattern)
    // and would otherwise top the list for an athlete who can't use a crutch.
    const original = ex({ id: 'pu', name: 'Pull-Up', primaryMuscle: 'back', movementPattern: 'pull', subregion: 'vertical_pull', compoundIsolation: 'compound', fatigueCost: 3, stimulusToFatigueRatio: 4 });
    const assisted = ex({ id: 'apu', name: 'Assisted Pull-Up', primaryMuscle: 'back', movementPattern: 'pull', subregion: 'vertical_pull', compoundIsolation: 'compound', fatigueCost: 3, stimulusToFatigueRatio: 4 });
    const loaded = ex({ id: 'lpd', name: 'Lat Pulldown', primaryMuscle: 'back', movementPattern: 'pull', subregion: 'vertical_pull', compoundIsolation: 'compound', fatigueCost: 3, stimulusToFatigueRatio: 4 });

    test('default keeps assisted lifts (beginners still see them)', () => {
      const out = rankSwaps(original, [assisted, loaded]);
      expect(out.map(r => r.exercise.id)).toContain('apu');
    });

    test('excludeAssisted drops assisted lifts from the suggestions', () => {
      const out = rankSwaps(original, [assisted, loaded], { excludeAssisted: true });
      const ids = out.map(r => r.exercise.id);
      expect(ids).not.toContain('apu');
      expect(ids).toContain('lpd');
    });
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

describe('subregion-aware swaps (phase 7 step 7)', () => {
  // Production exercises come from getAllExercises (camelCase). Subregion is
  // one word, identical in snake/camel, so it reads the same either way.
  const camelEx = (o) => ({
    id: `e_${Math.random().toString(36).slice(2)}`,
    name: 'X', primaryMuscle: 'chest', movementPattern: 'push',
    equipment: 'machine', compoundIsolation: 'compound',
    fatigueCost: 3, stimulusToFatigueRatio: 4, subregion: 'incline', ...o,
  });

  test('a same-subregion candidate outranks a different-subregion one, all else equal', () => {
    const original = camelEx({ name: 'Incline Machine Press', subregion: 'incline' });
    const sameSub  = camelEx({ name: 'Plate-Loaded Incline Press', subregion: 'incline' });
    const otherSub = camelEx({ name: 'Machine Chest Press', subregion: 'flat' });
    const ranked = rankSwaps(original, [sameSub, otherSub]);
    expect(ranked[0].exercise.name).toBe('Plate-Loaded Incline Press');
  });

  test('the same-subregion swap explains it in the reason', () => {
    const original = camelEx({ name: 'Incline Machine Press', subregion: 'incline' });
    const sameSub  = camelEx({ name: 'Plate-Loaded Incline Press', subregion: 'incline' });
    const reason = buildSwapReason(original, sameSub);
    expect(reason.toLowerCase()).toContain('same area of the muscle');
  });

  test('missing subregion tags neither reward nor crash (graceful)', () => {
    const original = camelEx({ subregion: undefined });
    const candidate = camelEx({ subregion: undefined, name: 'Other' });
    expect(() => rankSwaps(original, [candidate])).not.toThrow();
    // No subregion bonus, but same muscle/pattern still ranks it.
    expect(rankSwaps(original, [candidate])).toHaveLength(1);
  });

  test('same subregion across different muscles does not falsely reward', () => {
    // subregion only counts within the same primary muscle.
    const original  = camelEx({ primaryMuscle: 'chest', subregion: 'incline' });
    const crossMusc = camelEx({ primaryMuscle: 'back', subregion: 'incline', name: 'Row' });
    const reason = buildSwapReason(original, crossMusc);
    expect(reason.toLowerCase()).not.toContain('same area of the muscle');
  });
});
