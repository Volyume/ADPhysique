/**
 * Scenario: red_s_trajectory
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   70kg female, 18% BF, intake at 28 kcal/kg FFM
 *   (below the locked 30 kcal/kg FFM floor).
 *
 *   Expected: FFM floor fires immediately, deficit refused.
 *
 * The FFM floor (Move #1) is the absolute safety guardrail against
 * Relative Energy Deficiency in Sport (RED-S). It fires when the
 * user's reported intake drops below 30 kcal × FFM (kg)/day, with
 * absolute floors of 1500 (M) / 1200 (F) kcal regardless of FFM.
 *
 * For a 70kg female at 18% BF: FFM = 70 * 0.82 = 57.4 kg.
 *   FFM floor = 57.4 * 30 = 1722 kcal/day.
 *   Reported intake = 28 * 57.4 = ~1607 kcal/day. BELOW the floor.
 *
 * The detector also requires 5+ days of food data in the rolling
 * 7-day window before it fires. The simulator passes daysLogged=7
 * to clear that gate.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('red_s_trajectory: FFM floor fires immediately when intake below 30 kcal/kg FFM', () => {
  const startWeight = 70;
  const bfPct = 18;
  const ffmKg = startWeight * (1 - bfPct / 100);  // 57.4 kg
  const intakeBelowFloor = Math.round(28 * ffmKg);   // 1607 kcal/day

  // Weight loss is intentionally SLOW so the engine wants to apply a
  // downward calorie adjustment to chase the target rate. The FFM
  // floor's job is to refuse that adjustment because intake is
  // already at the safety floor.
  const weeklyInputs = buildWeeklyInputs(8, (w) => ({
    weight_kg: startWeight - w * 0.05,   // -0.07%/wk, way below target
    adherence: 'under',                  // off-target adherence
    energy: 2,                           // low energy mirrors clinical RED-S
    soreness: 3,
    sessions: 4,
    intakeKcal: intakeBelowFloor,
    daysLogged: 7,                       // clears the 5-day data sufficiency gate
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: bfPct, sex: 'F',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 1900,
    },
    weeks: 8,
    weeklyInputs,
  });

  // FFM floor must fire from the first usable week. Allow a one-week
  // warm-up since the simulator builds up morningWeights before
  // assessDataConfidence permits a full coach run.
  expect(r.ffmFloorFiredWeeks.length).toBeGreaterThan(0);
  expect(Math.min(...r.ffmFloorFiredWeeks)).toBeLessThanOrEqual(2);

  // FFM floor MUST keep firing as long as intake stays below the
  // floor. The simulator never raises intake; floor stays held.
  expect(r.ffmFloorFiredWeeks.length).toBeGreaterThanOrEqual(3);
});
