/**
 * Scenario: aggressive_cut_supervised
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   90kg male, 15% BF, physique competition goal, goal-lock TRUE,
 *   energy 4 throughout.
 *
 *   Expected: cut runs, ED detector at 3-signal threshold (raised
 *   from the standard 2 by goalLockAdvanced) does NOT fire.
 *
 * This is the counterpoint to aggressive_cut_unsupervised. Same body,
 * same goal, but the user has explicitly opted in to the
 * advanced-recomp / physique-competition workflow via the goal-lock
 * consent screen. The locked behaviour: raise the ED-pattern firing
 * threshold from 2 signals to 3 (per MOVE_2_ED_PATTERN_DETECTION.md
 * and OPEN_QUESTIONS_RESOLVED.md), so the same trajectory that fires
 * for the unsupervised athlete stays clean for the supervised one.
 */
import { simulate } from '../runner';

test('aggressive_cut_supervised: ED-pattern does NOT fire at 3-signal threshold', () => {
  const startWeight = 90;
  // Same weight trajectory as the unsupervised scenario.
  const weights = [
    startWeight,
    startWeight - 0.8,
    startWeight - 2.3,    // ~1.7% drop at wk2
    startWeight - 3.8,
    startWeight - 5.2,
    startWeight - 6.5,
    startWeight - 7.6,
    startWeight - 8.4,
  ];

  // Key differences vs unsupervised:
  //   - energy stays high (4) → no energy-crash signal
  //   - adherence consistently 'hit' (supervised athlete tracks
  //     properly) → no sustained-under signal
  //   - intake logged every week → no weight-only-checkin signal
  //   - goalLockAdvanced=true raises the ED threshold from 2 to 3
  // Even if rapid_loss still fires (the trajectory is steep), it's
  // only one signal — well under the 3-signal threshold.
  const weeklyInputs = weights.map((wkg) => ({
    weight_kg: wkg,
    adherence: 'hit',
    energy: 4,
    soreness: 2,
    sessions: 4,
    intakeKcal: 2200,    // logging food properly
    daysLogged: 7,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 15, sex: 'M',
      goal: 'agg_cut', trainingGoal: 'physique_competition',
      baselineKcal: 2200,
      goalLockAdvanced: true,    // critical: supervised flag set
      scoffPositive: false,
    },
    weeks: weeklyInputs.length,
    weeklyInputs,
  });

  // The 3-signal threshold should hold the line. ED-pattern flag
  // must not fire on this profile.
  expect(r.edPatternFiredWeeks).toEqual([]);
  expect(r.finalState.edPatternOpen).toBe(false);
});
