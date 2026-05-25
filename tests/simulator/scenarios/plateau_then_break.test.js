/**
 * Scenario: plateau_then_break
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   Cut stalls 4 weeks, then diet break trigger.
 *
 *   Expected: diet break suggested per MATADOR; resumes after.
 *
 * The engine's MATADOR-aligned trigger (weeklyCoach.js lines 680-697):
 * after 8+ consecutive weeks below maintenance on a cut, suggest a
 * full week at maintenance. We simulate 10 weeks of cutting with a
 * stall in the middle and assert dietBreakSuggested fires by the
 * back half of the run.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('plateau_then_break: 8+ weeks of cutting triggers a diet break suggestion', () => {
  const startWeight = 78;
  // First 5 weeks: steady cut progress.
  // Weeks 6-9: stall (weight barely moves).
  const weeklyInputs = buildWeeklyInputs(10, (w) => ({
    weight_kg: w < 5
      ? startWeight - w * 0.3
      : startWeight - 5 * 0.3 - (w - 5) * 0.05,
    adherence: 'hit',
    energy: 3,
    soreness: 2,
    sessions: 4,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 18, sex: 'F',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 1800,
    },
    weeks: 10,
    weeklyInputs,
  });

  // Diet break trigger uses the weeksInPhase counter (no explicit
  // goalStartDate in the simulator). Fires when weeksInPhase >= 8.
  // weekByWeek[7] corresponds to weeksInPhase = 8 (1-indexed).
  const breakSuggestedWeeks = r.weekByWeek
    .map((o, i) => (o?.dietBreakSuggested ? i : null))
    .filter(i => i !== null);

  expect(breakSuggestedWeeks.length).toBeGreaterThan(0);
  expect(Math.min(...breakSuggestedWeeks)).toBeGreaterThanOrEqual(7);

  // Safety guardrails should not fire on this clean cut
  // (energy and adherence stay reasonable).
  expect(r.edPatternFiredWeeks).toEqual([]);
});
