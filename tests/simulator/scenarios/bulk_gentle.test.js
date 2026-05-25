/**
 * Scenario: bulk_gentle
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   75kg, 18% BF, mild surplus, weight up ~0.5%/wk.
 *
 *   Expected: weight rises at the target rate, no flags fire.
 *
 * The bulk-side happy path. Same kind of "if anything fires, the
 * engine is mis-calibrated for the bulk phase" check as straight_cut
 * is for cuts.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('bulk_gentle: 8 clean bulk weeks produce no safety flags', () => {
  const startWeight = 75;
  // mild_bulk goalRatePct is +0.1875%/wk per PHASE_CONFIG. Match it
  // roughly with +0.15kg/wk on a 75kg base ≈ +0.2%/wk.
  const weeklyDelta = +0.15;
  const weeklyInputs = buildWeeklyInputs(8, (w) => ({
    weight_kg: startWeight + (w + 1) * weeklyDelta,
    adherence: 'hit',
    energy: 4,
    soreness: 2,
    sessions: 4,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 18, sex: 'M',
      goal: 'mild_bulk', trainingGoal: 'mild_bulk',
      baselineKcal: 2900,
    },
    weeks: 8,
    weeklyInputs,
  });

  // FFM floor never fires on a bulk (intake should be above the
  // floor by construction; no down-adjustments to block either).
  expect(r.ffmFloorFiredWeeks).toEqual([]);

  // No ED-pattern fires on a clean bulk (high energy, hit
  // adherence).
  expect(r.edPatternFiredWeeks).toEqual([]);
  expect(r.finalState.edPatternOpen).toBe(false);

  // No rapid-loss correction (we're gaining, not losing).
  expect(r.rapidLossWeeks).toEqual([]);

  // Engine should stay close to the starting calorie target. A few
  // small adjustments are fine; runaway is not.
  expect(r.totalAdjustments).toBeLessThanOrEqual(3);
});
