/**
 * planEngineSessionCap.test.js
 *
 * Founder ruling 2026-07-10 (D45): "There has to be a maximum per session
 * too, otherwise you try and jam 9 exercises into one day and absolutely kill
 * yourself. No bodybuilder does that." Before this, the only total-session
 * governor was the time budget; the per-muscle cap (8/12) did NOT bound total
 * exercise count or total working sets, so a long-session, multi-muscle day
 * could stack 9+ exercises / 30+ sets that fit the clock but no physique
 * athlete would ever run.
 *
 * Invariant, verified behaviourally over generated plans (the numbers stay
 * internal to planEngine, matching CAP_COMPOUND et al.):
 *   - No generated session exceeds 8 exercises.
 *   - No generated session exceeds 25 working sets.
 * And the cap must genuinely BIND (a session-stuffing config reaches the
 * ceiling), not be vacuously satisfied by the time budget always winning.
 */
import { generatePlan } from '../planEngine';

const MAX_EXERCISES = 8;
const MAX_SETS = 25;

const sessionSets = (w) => w.exercises.reduce((s, e) => s + (e.sets || 0), 0);

// A broad sweep, deliberately including the stuffing cases: long sessions,
// full-body (few days = every muscle every day), weak-point boosts, and the
// no-session-length case (budget = no clock limit).
const SWEEP = [];
for (const daysPerWeek of [2, 3, 4, 5, 6]) {
  for (const sessionLengthMinutes of [45, 60, 90, 120, 0]) {
    for (const goal of ['general', 'mens_physique', 'classic_physique', 'bikini', 'wellness']) {
      for (const weakPoints of [[], ['side_delts'], ['side_delts', 'quads', 'hamstrings']]) {
        SWEEP.push({
          experience: 'advanced',
          daysPerWeek,
          sessionLengthMinutes,
          equipment: 'full_gym',
          goal,
          phase: 'lean_gain',
          weakPoints,
          recoveryRating: 'average',
          nutritionPhase: 'maintain',
        });
      }
    }
  }
}

describe('D45 per-session hard caps (max 8 exercises, max 25 working sets)', () => {
  test('no generated session anywhere in a broad config sweep exceeds either cap', () => {
    for (const inputs of SWEEP) {
      const plan = generatePlan(inputs);
      for (const w of plan.workouts) {
        expect(w.exercises.length).toBeLessThanOrEqual(MAX_EXERCISES);
        expect(sessionSets(w)).toBeLessThanOrEqual(MAX_SETS);
      }
    }
  });

  test('the cap genuinely binds: a session-stuffing config reaches the ceiling rather than being vacuously under it', () => {
    // Full-body-ish (few days, every muscle every session), long session, no
    // weak-point relief - the shape most likely to over-stack. At least one
    // session should sit AT the exercise ceiling, proving the trim engages.
    let maxExercisesSeen = 0;
    for (const daysPerWeek of [2, 3, 4]) {
      for (const goal of ['general', 'mens_physique', 'classic_physique']) {
        for (const sessionLengthMinutes of [45, 90, 120]) {
          const plan = generatePlan({
            experience: 'intermediate',
            daysPerWeek,
            sessionLengthMinutes,
            equipment: 'full_gym',
            goal,
            phase: 'lean_gain',
            weakPoints: [],
            recoveryRating: 'average',
            nutritionPhase: 'maintain',
          });
          for (const w of plan.workouts) {
            maxExercisesSeen = Math.max(maxExercisesSeen, w.exercises.length);
          }
        }
      }
    }
    // Binds at the ceiling (a long full-body day wants >8 exercises and is
    // trimmed to exactly 8), and never over it.
    expect(maxExercisesSeen).toBe(MAX_EXERCISES);
  });

  test('the hard-cap backstop never trims a session below 3 exercises', () => {
    // The cap only ever removes exercises DOWNWARD from an over-stuffed session,
    // and its floor is 3. (Small sessions can legitimately be BUILT with 2
    // exercises - e.g. a 6-day split's accessory day - which the founder never
    // barred; only the maximum was ruled. So we assert the floor holds
    // specifically for the stuffing configs the backstop actually trims.)
    for (const daysPerWeek of [2, 3, 4]) {
      for (const sessionLengthMinutes of [45, 60, 90, 120, 0]) {
        const plan = generatePlan({
          experience: 'advanced', daysPerWeek, sessionLengthMinutes,
          equipment: 'full_gym', goal: 'general', phase: 'lean_gain',
          weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
        });
        for (const w of plan.workouts) {
          expect(w.exercises.length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  test('determinism holds with the cap in place (same inputs -> byte-identical plan)', () => {
    const inputs = {
      experience: 'advanced', daysPerWeek: 3, sessionLengthMinutes: 120,
      equipment: 'full_gym', goal: 'general', phase: 'lean_gain',
      weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
    };
    expect(JSON.stringify(generatePlan(inputs))).toBe(JSON.stringify(generatePlan(inputs)));
  });
});
