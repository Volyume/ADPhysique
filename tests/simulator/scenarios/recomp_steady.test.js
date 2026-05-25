/**
 * Scenario: recomp_steady
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   75kg, 22% BF, kcal at maintenance, protein 2.2 g/kg.
 *
 *   Expected: no weight change, modest strength gains, no flags.
 *
 * Recomposition is the "stay the same weight, change body
 * composition" phase. Weight should hover within ±0.5% of baseline.
 * The engine's recomp phase config (`recomp`) sets goalRatePct =
 * -0.125%/wk which is essentially flat. No flags should fire.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('recomp_steady: flat weight, no flags, minimal adjustments', () => {
  const startWeight = 75;
  // Weight bobbing in a tight band around the start (within
  // measurement noise — 0.3kg jitter, no real trend).
  const weeklyInputs = buildWeeklyInputs(8, (w) => ({
    weight_kg: startWeight + ((w % 4) - 1.5) * 0.1,
    adherence: 'hit',
    energy: 4,
    soreness: 2,
    sessions: 4,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 22, sex: 'M',
      goal: 'recomp', trainingGoal: 'recomp',
      baselineKcal: 2500,
    },
    weeks: 8,
    weeklyInputs,
  });

  // No FFM-floor fires (not cutting; intake unknown to engine).
  expect(r.ffmFloorFiredWeeks).toEqual([]);

  // No ED-pattern fires.
  expect(r.edPatternFiredWeeks).toEqual([]);

  // No rapid-loss (weight isn't dropping).
  expect(r.rapidLossWeeks).toEqual([]);

  // Engine may apply 0-2 nudge adjustments around the flat band but
  // shouldn't oscillate aggressively.
  expect(r.totalAdjustments).toBeLessThanOrEqual(2);
});
