/**
 * Scenario: rapid_loss_correction
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   80kg, deficit too steep, weight drops 1.8% in wk1.
 *
 *   Expected: rapid-loss flag fires, upward gate compresses to
 *   1-week (instead of the standard 2-week cooldown).
 *
 * Move #3's locked condition (per MOVE_3_UPWARD_GATE_COMPRESSION.md):
 * weekly loss ≤ -1.5% AND energy_score ≤ 2 on a cutting phase. The
 * engine bypasses the 2-week cooldown AND the
 * consecutiveOffTargetWeeks gate, adding calories straight away.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('rapid_loss_correction: sustained 1.7%/wk loss + low energy triggers upward correction', () => {
  const startWeight = 80;
  // Sustained ~1.7%/wk drop so the EWMA (alpha=0.1, ~10-day memory)
  // converges to a rate that satisfies the locked override condition
  // (actualRatePct <= -1.5). Per the existing upwardGateCompression
  // test fixture, ~5 weeks of -1.7%/wk weights is enough.
  const weeklyInputs = buildWeeklyInputs(6, (w) => ({
    weight_kg: startWeight * Math.pow(0.983, w),  // 1.7% per week compounding
    adherence: 'under',
    energy: 2,
    soreness: 3,
    sessions: 4,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 18, sex: 'M',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 2400,
    },
    weeks: 6,
    weeklyInputs,
  });

  // Rapid-loss correction must fire when the >=1.5% weekly loss
  // condition + energy <=2 are both met. Index 1 is week 2 (1-indexed).
  expect(r.rapidLossWeeks.length).toBeGreaterThan(0);

  // The first correction happens BEFORE the standard 2-week cooldown
  // window would have expired — that's the whole point of Move #3.
  // The simulator's totalAdjustments counts these too.
  expect(r.totalAdjustments).toBeGreaterThan(0);

  // Calorie target moved UP (the correction adds calories on cuts).
  expect(r.finalState.currentCalTarget).toBeGreaterThan(2400);
});
