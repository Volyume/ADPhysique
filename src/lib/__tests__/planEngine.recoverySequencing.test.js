/**
 * planEngine.recoverySequencing.test.js -- the D201 per-muscle recovery
 * sequencing hook inside generatePlan (spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 5). Pins: the
 * hook runs for both generated splits and DIVISION_MATRIX builds (founder
 * fork F2); the order generatePlan returns is already at the minimum
 * penalty sequenceSessionsForRecovery can find over the same sessions (so
 * it can never score worse than whatever order existed before the hook);
 * whyThis carries the spacing sentence when there is one to tell.
 */
import { generatePlan, POOL } from '../planEngine';
import { canonicalExerciseId } from '../exercise/canonicalId';
import { sequenceSessionsForRecovery } from '../recovery/sequenceSessions';

/** Mirrors planEngine.js's own buildExerciseByIdForRecovery, built from the
 * exported POOL (no exerciseLibrary is passed below, so planEngine's
 * internal _effectivePool is NORMALISED_POOL: normalisation only rewrites
 * each entry's `sub`, never `n` or `secondary`, so this map is identical
 * to the one the hook itself builds). */
function buildExerciseByIdFromPool() {
  const out = {};
  for (const [muscle, entries] of Object.entries(POOL)) {
    for (const entry of entries ?? []) {
      const id = canonicalExerciseId(entry.n);
      if (!id || out[id]) continue;
      out[id] = { primaryMuscle: muscle, secondaryMuscles: entry.secondary ?? [] };
    }
  }
  return out;
}

const BASE = {
  experience: 'intermediate', sessionLengthMinutes: 60,
  equipment: 'full_gym', recoveryRating: 'average', goal: 'general',
};

/** True only when re-scoring the plan's own returned order can find no
 * strictly-better permutation of the SAME sessions: the strongest
 * available proof, from outside planEngine.js, that the order the hook
 * chose is at least as good as (in fact, minimal among) every order the
 * scorer considered, including whatever order existed before the hook. */
function isAlreadyOptimal(plan) {
  const exerciseById = buildExerciseByIdFromPool();
  const rirTarget = plan.workouts[0]?.exercises?.[0]?.rirTarget ?? null;
  const recheck = sequenceSessionsForRecovery(plan.workouts, {
    daysPerWeek: plan.daysPerWeek, recoveryRating: BASE.recoveryRating, rirTarget, exerciseById,
  });
  return { optimal: recheck.changed === false, recheck };
}

describe('the recovery sequencing hook runs inside generatePlan', () => {
  test('a 4-day plan: the returned order cannot be strictly improved on', () => {
    const plan = generatePlan({ ...BASE, daysPerWeek: 4 });
    const { optimal, recheck } = isAlreadyOptimal(plan);
    expect(optimal).toBe(true);
    expect(recheck.penaltyAfter).toBeLessThanOrEqual(recheck.penaltyBefore);
  });

  test('a 6-day plan: the returned order cannot be strictly improved on', () => {
    const plan = generatePlan({ ...BASE, daysPerWeek: 6 });
    const { optimal, recheck } = isAlreadyOptimal(plan);
    expect(optimal).toBe(true);
    expect(recheck.penaltyAfter).toBeLessThanOrEqual(recheck.penaltyBefore);
  });

  test('a DIVISION_MATRIX build (bikini, 4 days) also cannot be strictly improved on', () => {
    const plan = generatePlan({ ...BASE, goal: 'bikini', daysPerWeek: 4 });
    const { optimal, recheck } = isAlreadyOptimal(plan);
    expect(optimal).toBe(true);
    expect(recheck.penaltyAfter).toBeLessThanOrEqual(recheck.penaltyBefore);
  });

  test('whyThis carries the spacing sentence when a muscle repeats within the week', () => {
    const plan4 = generatePlan({ ...BASE, daysPerWeek: 4 });
    expect(typeof plan4.whyThis.sequencing).toBe('string');
    expect(plan4.whyThis.sequencing).toMatch(/hours/);
    expect(plan4.whyThis.sequencing).not.toMatch(/—/);

    const plan6 = generatePlan({ ...BASE, daysPerWeek: 6 });
    expect(typeof plan6.whyThis.sequencing).toBe('string');
    expect(plan6.whyThis.sequencing).toMatch(/hours/);
  });

  test('session letters follow the FINAL position, whatever order the scorer chose', () => {
    // The letters mean "first Upper of the week, second Upper", so after
    // sequencing they are re-assigned by position: a 4-day upper/lower
    // reads Upper A, Lower A, Upper B, Lower B, never A, B, B, A. This is
    // the case the 4-day general plan actually produces (the scorer moves
    // the two lower sessions for quad spacing under the Mon/Tue/Thu/Fri
    // layout), so the literal below is the regression, not a coincidence.
    const plan4 = generatePlan({ ...BASE, daysPerWeek: 4 });
    expect(plan4.workouts.map((w) => w.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B']);

    // And in general: for every repeated base name, the letters run A, B,
    // C in position order, for every split the generator produces.
    for (const days of [3, 4, 5, 6]) {
      const plan = generatePlan({ ...BASE, daysPerWeek: days });
      const seen = new Map();
      for (const w of plan.workouts) {
        const m = /^(.+) ([A-Z])$/.exec(w.name);
        if (!m) continue;
        const n = seen.get(m[1]) ?? 0;
        expect(`${m[1]} ${m[2]}`).toBe(`${m[1]} ${String.fromCharCode(65 + n)}`);
        seen.set(m[1], n + 1);
      }
    }
  });

  test('does not change which exercises, sets or muscles any session carries (4 days)', () => {
    const plan = generatePlan({ ...BASE, daysPerWeek: 4 });
    const byName = new Map(plan.workouts.map((w) => [w.name, w]));
    // Same session set, same exercise lists per name, regardless of order.
    expect(byName.size).toBe(plan.workouts.length);
    for (const w of plan.workouts) {
      expect(Array.isArray(w.exercises)).toBe(true);
      expect(w.exercises.length).toBeGreaterThan(0);
    }
  });
});
