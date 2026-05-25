/**
 * Scenario: bulk_aggressive
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   85kg, mod-bulk goal, protein 2.8 g/kg, weight up ~1%/wk.
 *
 *   Expected: weight rises faster than the mod-bulk target
 *   (+0.375%/wk per PHASE_CONFIG); no SAFETY flags fire.
 *
 * Note on terminology: the locked spec called this "bulk_aggressive"
 * but the engine's phase enum only has mild_bulk and mod_bulk. The
 * spec scenario lives at mod_bulk with a faster-than-target gain
 * rate. The point of the test is that no FFM-floor / ED-pattern /
 * rapid-loss flag fires on a fast bulk — calorie adjustments may
 * happen (engine reduces surplus to slow the gain), but the safety
 * guardrails are designed for cuts and shouldn't trigger here.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('bulk_aggressive: fast gain triggers downward cal adjustments but no safety flags', () => {
  const startWeight = 85;
  // ~1%/wk gain. mod_bulk target is +0.375%/wk so this is 2.6x
  // target — engine should pull calories back to slow the gain.
  const weeklyDelta = +0.85;
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
      goal: 'mod_bulk', trainingGoal: 'mod_bulk',
      baselineKcal: 3200,
    },
    weeks: 8,
    weeklyInputs,
  });

  // Engine should adjust the calorie target down at least once
  // to slow the gain.
  expect(r.totalAdjustments).toBeGreaterThan(0);
  expect(r.finalState.lastCalAdjustmentDirection).toBe('down');

  // Safety guardrails MUST NOT fire on a bulk:
  expect(r.ffmFloorFiredWeeks).toEqual([]);    // not cutting
  expect(r.edPatternFiredWeeks).toEqual([]);    // high energy, hit adherence
  expect(r.rapidLossWeeks).toEqual([]);         // gaining, not losing
});
