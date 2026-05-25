/**
 * Scenario: stalled_lift
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   Bench plateaued 3 weeks, adherence "under" 2 of 3 weeks.
 *
 *   Expected: stalled-lift insight surfaces; differential paywall
 *   trigger fires for free users.
 *
 * This is the cross-check for Move #4. The detector
 * (src/lib/differentialPaywall.js) wants:
 *   - userTier === 'free'
 *   - 2-of-3 adherence weeks 'under' or 'over'
 *   - weeksLiftStalled >= 3
 * Output: differential_output.shown = true, trigger='stalled_lift',
 * paywall_cta='try_pro_14d' (for a user with trial entitlement
 * still available).
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('stalled_lift: free user with 3-week lift plateau + under-adherence sees differential paywall', () => {
  const startWeight = 80;
  const weeklyInputs = buildWeeklyInputs(4, (w) => ({
    weight_kg: startWeight - w * 0.1,    // largely flat
    adherence: w === 1 ? 'hit' : 'under', // 'under' in weeks 0, 2, 3 (3-of-4 off)
    energy: 4,                            // not safety-adjacent
    soreness: 2,
    sessions: 4,
    weeksLiftStalled: 3,                  // the cross-cut signal from insightsEngine
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 18, sex: 'M',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 2400,
      userTier: 'free',                   // free tier sees paywall
      hasUsedTrial: false,                // still has trial entitlement
    },
    weeks: 4,
    weeklyInputs,
  });

  // After the adherence gate is met (week index 2 — needs 3 of last
  // 3 weeks of adherence history), the differential trigger should
  // fire at least once.
  const firedWeeks = r.weekByWeek
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o?.differential_output?.shown === true);
  expect(firedWeeks.length).toBeGreaterThan(0);

  // When it fires, the trigger should resolve to 'stalled_lift'
  // (the only signal we're feeding) and the CTA should be the
  // trial variant.
  const first = firedWeeks[0].o;
  expect(first.differential_output.trigger).toBe('stalled_lift');
  expect(first.differential_output.paywall_cta).toBe('try_pro_14d');
});

test('stalled_lift: paid (pro) user never sees the differential paywall', () => {
  const startWeight = 80;
  const weeklyInputs = buildWeeklyInputs(4, (w) => ({
    weight_kg: startWeight - w * 0.1,
    adherence: w === 1 ? 'hit' : 'under',
    energy: 4,
    soreness: 2,
    sessions: 4,
    weeksLiftStalled: 3,
  }));

  const r = simulate({
    user: {
      weight_kg: startWeight, bf_pct: 18, sex: 'M',
      goal: 'mild_cut', trainingGoal: 'mild_cut',
      baselineKcal: 2400,
      userTier: 'pro',                    // paid → never sees paywall
      hasUsedTrial: true,
    },
    weeks: 4,
    weeklyInputs,
  });

  const everShown = r.weekByWeek.some(o => o?.differential_output?.shown === true);
  expect(everShown).toBe(false);
});
