/**
 * Scenario: noisy_logger
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   Logs only 2-3 days/week (sparse data, weekly check-in marked
 *   adherence='untracked' as a proxy for poor logging discipline).
 *
 *   Expected: adherence-quality gate prevents engine adjustments
 *   until logging improves.
 *
 * The engine's locked rule (per assessDataConfidence + the
 * canAdjustCals gate in weeklyCoach): when adherence is 'untracked',
 * the engine holds calorie adjustments — making a guess on a
 * sparsely-logged week is more dangerous than holding the plan
 * steady. This scenario verifies the gate.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('noisy_logger: untracked adherence prevents calorie adjustments', () => {
  const startWeight = 80;
  // Weight trends in a direction that would normally trigger an
  // adjustment (losing too slowly on a cut), but adherence is
  // untracked so the engine should refuse to adjust.
  const weeklyInputs = buildWeeklyInputs(8, (w) => ({
    weight_kg: startWeight - w * 0.05,   // -0.07%/wk, way off mild-cut target
    adherence: 'untracked',              // sparse logging proxy
    energy: 3,
    soreness: 2,
    sessions: 4,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 18, sex: 'M',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 2400,
    },
    weeks: 8,
    weeklyInputs,
  });

  // No calorie adjustments should be applied while adherence stays
  // untracked. Calorie target stays at the user's baseline.
  expect(r.totalAdjustments).toBe(0);
  expect(r.finalState.currentCalTarget).toBe(2400);

  // Safety guardrails remain on even when logging is poor —
  // they're tier- AND adherence-blind. No spurious fires expected
  // here because energy is fine and intake isn't being reported.
  expect(r.ffmFloorFiredWeeks).toEqual([]);
});
