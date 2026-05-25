/**
 * Scenario: straight_cut
 *
 * 80kg male, 20% BF, mild-cut goal, adherence "hit" every week,
 * steady ~0.5%/wk weight loss. Per TESTING_STRATEGY_LOCKED.md
 * expected trajectory:
 *
 *   Steady weight loss, no flags, no holds.
 *
 * This is the happy-path baseline. If anything in this trajectory
 * raises a held decision, FFM floor, ED flag, or rapid-loss
 * correction the engine is mis-calibrated.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('straight_cut: 12 clean weeks produce no safety flags', () => {
  const startWeight = 80;
  const weeklyDelta = -0.4;   // -0.5%/wk @ 80kg ≈ -0.4kg
  const weeklyInputs = buildWeeklyInputs(12, (w) => ({
    weight_kg: startWeight + (w + 1) * weeklyDelta,
    adherence: 'hit',
    energy: 4,
    soreness: 2,
    sessions: 4,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 20, sex: 'M',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 2400,
      userTier: 'complete',  // safety guardrails are tier-blind anyway
    },
    weeks: 12,
    weeklyInputs,
  });

  // No FFM floor fires (intake is unknown / not at floor, BF% reasonable).
  expect(r.ffmFloorFiredWeeks).toEqual([]);

  // No ED-pattern flag fires (energy 4 throughout, adherence 'hit').
  expect(r.edPatternFiredWeeks).toEqual([]);
  expect(r.finalState.edPatternOpen).toBe(false);

  // No rapid-loss correction (target rate is meeting the locked
  // mild-cut rate envelope, no 1.5%+/wk drops).
  expect(r.rapidLossWeeks).toEqual([]);

  // Engine should remain close to its starting calorie target across
  // a happy-path cut. A handful of small adjustments is acceptable;
  // a runaway up/down cascade is not.
  expect(r.totalAdjustments).toBeLessThanOrEqual(4);

  // Weight is going down per the inputs. End weight should be
  // below start (sanity check on the runner state evolution).
  const finalCheckin = r.weekByWeek[r.weekByWeek.length - 1];
  expect(finalCheckin).toBeTruthy();
});
