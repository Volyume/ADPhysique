/**
 * Scenario: stalled_lift
 *
 * Locked in TESTING_STRATEGY_LOCKED.md:
 *   Bench plateaued 3 weeks, adherence "under" 2 of 3 weeks.
 *
 *   Historical expectation (pre-D137): stalled-lift insight surfaces;
 *   differential paywall trigger fires for free users.
 *
 * D137 (founder decision 2026-09-03, fully free product, src/lib/proGate.js
 * FULL_ACCESS_FOR_ALL): the differential paywall's whole purpose was to
 * WITHHOLD a nutrition insight from free users behind a CTA. Nothing is
 * withheld any more, so `runWeeklyCoach` short-circuits
 * `differential_output` to `{ shown: false }` unconditionally
 * (src/lib/weeklyCoach.js:2346) -- `detectDifferentialTrigger` itself
 * (src/lib/differentialPaywall.js) is untouched and still directly unit
 * tested, and every other field of the coach output is byte-identical
 * (weeklyCoach.js's own comment on that line). This is a deliberate
 * retirement of the paywall mechanism, not a coaching-output regression:
 * weeksLiftStalled feeds nothing else in runWeeklyCoach, and the second
 * test below (paid user never sees it) already pins that the field is
 * `shown: false` for every tier -- this scenario now pins the SAME truth
 * for a free user with an identical plateau, i.e. the paywall is retired
 * for everyone, not selectively for Pro.
 */
import { simulate, buildWeeklyInputs } from '../runner';

test('stalled_lift: free user with 3-week lift plateau + under-adherence never sees the differential paywall (D137, fully free)', () => {
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
      userTier: 'free',
      hasUsedTrial: false,
    },
    weeks: 4,
    weeklyInputs,
  });

  // Even once the adherence gate would historically have been met (week
  // index 2 onward), the paywall never fires -- fully free, no withholding.
  const firedWeeks = r.weekByWeek
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o?.differential_output?.shown === true);
  expect(firedWeeks.length).toBe(0);
  for (const week of r.weekByWeek) {
    expect(week?.differential_output?.shown).not.toBe(true);
  }
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
