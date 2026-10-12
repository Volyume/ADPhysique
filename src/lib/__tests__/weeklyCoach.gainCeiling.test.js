/**
 * weeklyCoach D226 additions: the optional gain ceiling and the gain-settling
 * window. Pins:
 *   - gainCeilingPct null (or absent) leaves the output identical;
 *   - in a gain phase, a gain above the phase band but within the ceiling is
 *     on target, and without the ceiling it is off target;
 *   - a cut is never widened by the ceiling;
 *   - the first GAIN_SETTLE_WEEKS of a gain phase read a FASTER gain as on
 *     target (water and glycogen settling) with no calorie cut and "settle"
 *     in the held reason; after that it is off target as before; a SLOWER gain
 *     in the window stays off target; a cut in the window is unaffected;
 *   - the output never echoes the ceiling (the training status stays out of
 *     anything saved or shown).
 */
import { runWeeklyCoach } from '../weeklyCoach';

const DAY = 86_400_000;
function trendSharp(startKg, kgPerWeek, count = 35) {
  const out = [];
  const t0 = Date.now();
  const weeks = (count - 1) / 7;
  const endKg = startKg + kgPerWeek * weeks;
  for (let i = 0; i < count; i++) {
    out.push({ loggedAt: t0 - (count - 1 - i) * DAY, weightKg: Math.round((startKg + (endKg - startKg) * (i / (count - 1))) * 100) / 100 });
  }
  return out;
}
const checkin = () => ({
  weekStart: Date.now() - 7 * DAY, energyScore: 3, sorenessScore: 3, stressScore: 3, sleepHours: 7,
  calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, soreMuscles: null, notes: null,
});
function inputs(o = {}) {
  return {
    nowMs: Date.now(), checkin: checkin(), morningWeights: [], sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'mild_bulk', trainingGoal: 'build_muscle', weeksInPhase: 6,
    consecutiveOffTargetWeeks: 0, consecutivePoorRecoveryWeeks: 0,
    lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
    currentCalTarget: 3200, currentStepsTarget: 8000, bodyweightKg: 80, units: 'kg', ...o,
  };
}
const gaining = (pct, kg = 80) => trendSharp(kg, (kg * pct) / 100);

describe('gainCeilingPct', () => {
  test('null and absent give identical output', () => {
    const base = inputs({ morningWeights: gaining(0.3) });
    const a = JSON.stringify(runWeeklyCoach({ ...base }));
    const b = JSON.stringify(runWeeklyCoach({ ...base, gainCeilingPct: null }));
    expect(b).toBe(a);
  });

  test('a bulk gaining 0.6%/wk is on target with ceiling 0.75 and off target without', () => {
    const base = inputs({ morningWeights: gaining(0.6), consecutiveOffTargetWeeks: 1 });
    expect(runWeeklyCoach({ ...base, gainCeilingPct: 0.75 }).trend.onTarget).toBe(true);
    expect(runWeeklyCoach({ ...base }).trend.onTarget).toBe(false);
  });

  test('a cut is never affected by the ceiling', () => {
    const base = inputs({ goalPhase: 'mild_cut', currentCalTarget: 2400, bodyweightKg: 85, morningWeights: trendSharp(85, -0.9), consecutiveOffTargetWeeks: 1 });
    expect(JSON.stringify(runWeeklyCoach({ ...base, gainCeilingPct: 0.75 }))).toBe(JSON.stringify(runWeeklyCoach({ ...base })));
  });

  test('the output does not echo the ceiling', () => {
    const out = JSON.stringify(runWeeklyCoach({ ...inputs({ morningWeights: gaining(0.6) }), gainCeilingPct: 0.7391 }));
    expect(out).not.toContain('0.7391');
    expect(out).not.toContain('gainCeiling');
  });
});

describe('gain settling window', () => {
  test('a bulk at week 2 gaining fast is on target, no calorie cut, held reason says settle', () => {
    const out = runWeeklyCoach(inputs({ weeksInPhase: 2, morningWeights: gaining(1.5) }));
    expect(out.trend.onTarget).toBe(true);
    expect(out.adjustments.calories ?? null).toBeNull();
    expect(JSON.stringify(out)).toMatch(/settle/i);
  });

  test('the same gain at week 5 is off target as before', () => {
    const out = runWeeklyCoach(inputs({ weeksInPhase: 5, morningWeights: gaining(1.5), consecutiveOffTargetWeeks: 1 }));
    expect(out.trend.onTarget).toBe(false);
  });

  test('a bulk at week 2 gaining slower than goal is still off target', () => {
    const out = runWeeklyCoach(inputs({ weeksInPhase: 2, morningWeights: gaining(0.0) }));
    expect(out.trend.onTarget).toBe(false);
  });

  test('a cut at week 2 is unaffected by the window', () => {
    const cut = (w) => inputs({ goalPhase: 'mild_cut', currentCalTarget: 2400, bodyweightKg: 85, weeksInPhase: w, morningWeights: trendSharp(85, -0.9) });
    const early = runWeeklyCoach(cut(2));
    expect(early.trend.onTarget).toBe(runWeeklyCoach(cut(6)).trend.onTarget);
    expect(JSON.stringify(early)).not.toMatch(/settle/i);
  });
});
