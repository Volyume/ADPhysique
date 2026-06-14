/**
 * Scenario: aggressive_cut_unsupervised
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   90kg male, 15% BF, physique competition goal, goal-lock FALSE,
 *   energy 2-3, weight dropping 1.7% wk2 onward.
 *
 *   Expected: ED-pattern flag fires by week 4, lockout copy shown.
 *
 * This is the unsupervised-aggressive-cut path. Goal-lock OFF means
 * the ED detector uses the standard 2-signal threshold. Low energy +
 * sustained 'under' adherence + rapid loss should trigger detection.
 */
import { simulate } from '../runner';

test('aggressive_cut_unsupervised: ED-pattern fires by week 4', () => {
  const startWeight = 90;
  // Drop ~1.7% in week 2, then sustain.
  const weights = [
    startWeight,             // w0 baseline
    startWeight - 0.8,       // w1 modest drop
    startWeight - 2.3,       // w2: ~1.7% drop
    startWeight - 3.8,       // w3
    startWeight - 5.2,       // w4
    startWeight - 6.5,       // w5
    startWeight - 7.6,       // w6
    startWeight - 8.4,       // w7
  ];

  const weeklyInputs = weights.map((wkg, i) => ({
    weight_kg: wkg,
    adherence: 'under',           // sustained off-target adherence
    energy: i < 2 ? 3 : 2,        // low energy from week 2 onward
    soreness: 3,
    sessions: 4,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 15, sex: 'M',
      goal: 'agg_cut', trainingGoal: 'physique_competition',
      baselineKcal: 2200,
      goalLockAdvanced: false,    // critical: NOT goal-locked
      scoffPositive: false,
    },
    weeks: weeklyInputs.length,
    weeklyInputs,
  });

  // The ED-pattern detector must fire at least once during the run.
  // Per locked spec it should fire by week 4 (0-indexed: by index 3).
  expect(r.edPatternFiredWeeks.length).toBeGreaterThan(0);
  expect(Math.min(...r.edPatternFiredWeeks)).toBeLessThanOrEqual(3);

  // Once raised, the open flag persists until explicit clear.
  expect(r.finalState.edPatternOpen).toBe(true);
});
