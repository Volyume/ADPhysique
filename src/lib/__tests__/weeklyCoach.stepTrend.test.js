/**
 * COMP-026 (B) — runWeeklyCoach step-trend modifier wiring.
 *
 * Proves the dailyStepsSeries input flows through to the step modifier and the
 * gain feeds back into the adaptive resize, WITHOUT ever reversing or creating
 * a change. The exact safety composition (FFM floor / rapid-loss / +/-5% cap /
 * cycleOverride / ED lockout staying senior to the gain) is locked by the
 * blocking engine invariants; here we only check the wiring + direction logic.
 */
import { runWeeklyCoach } from '../weeklyCoach';

const TODAY = '2024-02-15';

function keyAgo(age) {
  const [y, m, d] = TODAY.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) - age * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// 42 daily morning weights ending "today", rising slightly so a prescribed
// deficit is being under-delivered (the coach wants to cut). >=4 weeks of
// distinct days => 'high' confidence => the adaptive resize is live.
function risingWeights(start = 80, perDayKg = 0.015) {
  const days = 42;
  const out = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    out.push({ weightKg: start + perDayKg * i, loggedAt: Date.now() - daysAgo * 86400000 });
  }
  return out;
}

// 42 days of steps with a sustained level shift, both windows fully logged.
function stepSeries(recent, baseline) {
  const rows = [];
  for (let age = 0; age <= 41; age++) {
    rows.push({ entryDate: keyAgo(age), steps: age <= 13 ? recent : baseline, source: 'health' });
  }
  return rows;
}

function baseInputs(over = {}) {
  return {
    checkin: { energyScore: 4, recoveryScore: 4, calsAdherence: 'hit', cycleOverride: false },
    currentCalTarget: 2000,
    currentMaintenanceKcal: 2400, // deficit prescribed, but weight is rising -> wants a cut
    currentStepsTarget: 8000,
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    morningWeights: risingWeights(),
    goalPhase: 'mild_cut',
    weeksInPhase: 6,
    consecutiveOffTargetWeeks: 3,
    lastCalAdjustmentWeeksAgo: 4,
    bodyweightKg: 80,
    stepsTodayKey: TODAY,
    ...over,
  };
}

describe('runWeeklyCoach: COMP-026 step-trend modifier wiring', () => {
  test('no dailyStepsSeries leaves the modifier inert (gain 0.50, not applied)', () => {
    const out = runWeeklyCoach(baseInputs());
    expect(out.stepModifier.active).toBe(false);
    expect(out.stepModifier.gain).toBe(0.5);
    expect(out.stepTrendApplied).toBe(false);
  });

  test('a sustained step DROP that agrees with a cut speeds the resize (gain 0.65)', () => {
    const baseline = runWeeklyCoach(baseInputs());
    const withSteps = runWeeklyCoach(baseInputs({ dailyStepsSeries: stepSeries(6000, 10000) }));

    expect(withSteps.stepModifier.active).toBe(true);
    expect(withSteps.stepModifier.direction).toBe(-1);
    expect(withSteps.stepModifier.gain).toBe(0.65);
    expect(withSteps.stepTrendApplied).toBe(true);

    // Both are cuts (negative); the gain-resized change is at least as large in
    // magnitude as the gain-0.50 change, never smaller, never a different sign.
    const baseChange = baseline.adjustments.calories?.change ?? 0;
    const stepChange = withSteps.adjustments.calories?.change ?? 0;
    expect(stepChange).toBeLessThanOrEqual(0);
    expect(Math.sign(stepChange)).toBe(Math.sign(baseChange));
    expect(Math.abs(stepChange)).toBeGreaterThanOrEqual(Math.abs(baseChange));
  });

  test('a step shift that DISAGREES with the cut never accelerates it', () => {
    // Steps trending UP while the weight trend wants a cut: disagreement.
    const baseline = runWeeklyCoach(baseInputs());
    const withSteps = runWeeklyCoach(baseInputs({ dailyStepsSeries: stepSeries(12000, 7000) }));

    expect(withSteps.stepModifier.reason).toBe('direction_disagree');
    expect(withSteps.stepModifier.gain).toBe(0.5);
    expect(withSteps.stepTrendApplied).toBe(false);
    expect(withSteps.adjustments.calories?.change).toBe(baseline.adjustments.calories?.change);
  });

  test('the modifier never runs on the rapid-loss safety path', () => {
    // Rapid loss + low energy on a cut fires the upward-only override; the
    // modifier is skipped (its boost is fixed and senior) and stays inert.
    const out = runWeeklyCoach(baseInputs({
      checkin: { energyScore: 1, recoveryScore: 2, calsAdherence: 'hit', cycleOverride: false },
      morningWeights: risingWeights(80, -0.35), // ~ -1.8%/wk
      dailyStepsSeries: stepSeries(6000, 10000),
    }));
    expect(out.stepModifier.active).toBe(false);
    expect(out.stepModifier.reason).toBe('not_evaluated');
    expect(out.stepTrendApplied).toBe(false);
  });
});
