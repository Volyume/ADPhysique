/**
 * Scenario: returning_user
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   Account exists, 6-week absence, weight log resumes.
 *
 *   Expected: data confidence gate clamps adjustments until 2 weeks
 *   of fresh data have accumulated.
 *
 * The engine's assessDataConfidence + weeksInPhase < 2 check
 * (weeklyCoach.js line 415) prevents calorie adjustments when data
 * is sparse. After a 6-week absence the user has a long stretch of
 * empty weeks, so the engine should hold off on adjustments for
 * the first few weeks back.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('returning_user: 6-week absence then resume; engine holds adjustments until trend is fresh', () => {
  const startWeight = 80;
  // Weeks 0-1: active (baseline cut, off-target)
  // Weeks 2-7: 6-week absence (skipWeight: true → no readings)
  // Weeks 8-10: back to logging
  const weeklyInputs = buildWeeklyInputs(11, (w) => {
    if (w >= 2 && w <= 7) {
      return {
        weight_kg: startWeight - 0.1,    // not used; week skipped
        skipWeight: true,
        adherence: 'untracked',
        energy: 3,
        soreness: 2,
        sessions: 0,
      };
    }
    return {
      weight_kg: startWeight - w * 0.05,
      adherence: 'under',
      energy: 3,
      soreness: 2,
      sessions: 4,
    };
  });

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 18, sex: 'M',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 2400,
    },
    weeks: 11,
    weeklyInputs,
  });

  // In the resume weeks (8, 9, 10), the engine sees only the
  // weeks-0-1 + weeks-8-10 readings (no readings for the gap). The
  // data-confidence gate should clamp adjustments tightly — at most
  // a couple of conservative changes.
  expect(r.totalAdjustments).toBeLessThanOrEqual(2);

  // The safety guardrails remain on even after a gap:
  expect(r.ffmFloorFiredWeeks).toEqual([]);    // not intake-tracked
  expect(r.rapidLossWeeks).toEqual([]);         // no aggressive loss
});
