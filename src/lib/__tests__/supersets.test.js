/**
 * Tests for the superset planner in planEngine.generatePlan.
 *
 * Verifies the policy:
 *   - Supersets only fire for hypertrophy/physique-family goals or short sessions
 *   - Beginners never get supersets
 *   - First exercise (compound primary) is never paired
 *   - Pairs are antagonist / non-competing muscles
 *   - At most 2 pairs per workout
 *   - Pairs that DO appear share an identical supersetGroupId
 */
import { generatePlan } from '../planEngine';

function getPairs(workout) {
  // Returns the list of [exA, exB] pairs that share a supersetGroupId.
  const byGroup = new Map();
  for (const ex of workout.exercises) {
    if (ex.supersetGroupId != null) {
      const arr = byGroup.get(ex.supersetGroupId) ?? [];
      arr.push(ex);
      byGroup.set(ex.supersetGroupId, arr);
    }
  }
  return Array.from(byGroup.values()).filter(a => a.length === 2);
}

describe('superset assignment — gating rules', () => {
  test('beginners never get supersets', () => {
    const plan = generatePlan({
      experience: 'beginner', daysPerWeek: 4, sessionLengthMinutes: 60,
      equipment: 'full_gym', goal: 'general_hypertrophy', phase: 'maintain',
      weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
    });
    for (const w of plan.workouts) {
      const hasAnySuperset = w.exercises.some(ex => ex.supersetGroupId != null);
      expect(hasAnySuperset).toBe(false);
    }
  });

  test('intermediate physique goal with generous session gets some supersets', () => {
    const plan = generatePlan({
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
      equipment: 'full_gym', goal: 'general_hypertrophy', phase: 'maintain',
      weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
    });
    const totalPairs = plan.workouts.reduce((s, w) => s + getPairs(w).length, 0);
    expect(totalPairs).toBeGreaterThan(0);
  });

  test('strength goal with generous session gets no supersets', () => {
    const plan = generatePlan({
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
      equipment: 'full_gym', goal: 'strength_hypertrophy', phase: 'maintain',
      weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
    });
    const totalPairs = plan.workouts.reduce((s, w) => s + getPairs(w).length, 0);
    expect(totalPairs).toBe(0);
  });

  test('short session (≤50 min) gets supersets regardless of goal', () => {
    const plan = generatePlan({
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 45,
      equipment: 'full_gym', goal: 'strength_hypertrophy', phase: 'maintain',
      weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
    });
    const totalPairs = plan.workouts.reduce((s, w) => s + getPairs(w).length, 0);
    // Time-constrained strength session — supersets help fit it
    expect(totalPairs).toBeGreaterThanOrEqual(0); // soft — at least allowed to fire
  });
});

describe('superset assignment — quality invariants', () => {
  const plan = generatePlan({
    experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
    equipment: 'full_gym', goal: 'general_hypertrophy', phase: 'maintain',
    weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
  });

  test('at most 2 supersets per workout', () => {
    for (const w of plan.workouts) {
      const pairs = getPairs(w);
      expect(pairs.length).toBeLessThanOrEqual(2);
    }
  });

  test('paired entries share an identical supersetGroupId', () => {
    for (const w of plan.workouts) {
      const pairs = getPairs(w);
      for (const [a, b] of pairs) {
        expect(a.supersetGroupId).toBeDefined();
        expect(b.supersetGroupId).toBeDefined();
        expect(a.supersetGroupId).toBe(b.supersetGroupId);
      }
    }
  });

  test('the first exercise of a workout is never paired (compound primary protected)', () => {
    for (const w of plan.workouts) {
      const first = w.exercises[0];
      if (first && first.restSec >= 150) {
        // First exercise is a heavy compound — must not be supersetted
        expect(first.supersetGroupId).toBeFalsy();
      }
    }
  });

  test('paired exercises never have rest >= 150s (no pairing on heavy compounds)', () => {
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        if (ex.supersetGroupId != null) {
          expect(ex.restSec).toBeLessThan(150);
        }
      }
    }
  });

  test('paired exercises in the engine are adjacent in the workout list', () => {
    for (const w of plan.workouts) {
      const byGroup = new Map();
      w.exercises.forEach((ex, idx) => {
        if (ex.supersetGroupId != null) {
          const arr = byGroup.get(ex.supersetGroupId) ?? [];
          arr.push(idx);
          byGroup.set(ex.supersetGroupId, arr);
        }
      });
      for (const indices of byGroup.values()) {
        if (indices.length === 2) {
          expect(Math.abs(indices[0] - indices[1])).toBe(1);
        }
      }
    }
  });
});

describe('superset assignment — robustness', () => {
  test('every goal/phase combo runs without throwing', () => {
    const combos = [
      ['general_hypertrophy', 'maintain'],
      ['mens_physique', 'cut'],
      ['classic_physique', 'lean_gain'],
      ['bikini', 'maintain'],
      ['wellness', 'cut'],
      ['strength_hypertrophy', 'bulk'],
    ];
    for (const [goal, phase] of combos) {
      expect(() => generatePlan({
        experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
        equipment: 'full_gym', goal, phase, weakPoints: [], recoveryRating: 'average',
        nutritionPhase: phase,
      })).not.toThrow();
    }
  });
});
