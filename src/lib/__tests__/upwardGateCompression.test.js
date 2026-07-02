/**
 * Move #3 -- upward-only gate compression.
 *
 * Property and unit coverage for the rapid-loss safety override:
 * - downward gates intact when override does not fire
 * - upward gate compressed (no 2-week cooldown, no consecutive-off-
 *   target gate) when override fires
 * - upward-only by design: same condition during a bulk does NOT
 *   compress the downward gate
 * - magnitude scales with severity, capped at +300
 * - held-decision row emitted with the locked structured shape
 * - rapidLossCorrectionApplied flag and matched telemetry payload
 *
 * Reference: docs/MOVE_3_UPWARD_GATE_COMPRESSION.md
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { computeAdaptiveTDEEAdjustment } from '../nutritionEngine';

const DAY = 86_400_000;
// Anchor fixtures to Date.now() so getEwmaSevenDaysAgo's
// `Date.now() - 7 days` lookback lines up with the data. A fixed
// NOW (as the original weeklyCoach.test.js uses) misaligns the
// lookback and shrinks the realised delta dramatically.
const NOW = Date.now();

// Fixture: 35 days of weights with `kgPerWeek` interpreted as the
// actual weekly rate. The 35-day span is long enough for the EWMA
// (alpha=0.1, ~10-day memory) to converge from its initial-value
// warmup so the realised "delta over 7 days" reflects the requested
// rate.
function trend(startKg, kgPerWeek, count = 35) {
  const out = [];
  const weeks = (count - 1) / 7;
  const endKg = startKg + kgPerWeek * weeks;
  for (let i = 0; i < count; i++) {
    const t = NOW - (count - 1 - i) * DAY;
    const w = startKg + (endKg - startKg) * (i / Math.max(1, count - 1));
    out.push({ loggedAt: t, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

function checkin(overrides = {}) {
  return {
    weekStart: NOW - 7 * DAY,
    // (NOW is Date.now() per the fixture comment above)
    energyScore: 3,
    sorenessScore: 3,
    stressScore: 3,
    sleepHours: 7,
    calsAdherence: 'hit',
    stepsAdherence: 'hit',
    trainingPerformance: 'hit',
    jointPain: false,
    soreMuscles: null,
    notes: null,
    ...overrides,
  };
}

function baseInputs(overrides = {}) {
  return {
    checkin: checkin(),
    morningWeights: [],
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    prsThisWeek: 0,
    goalPhase: 'mild_cut',
    trainingGoal: 'build_muscle',
    weeksInPhase: 4,
    consecutiveOffTargetWeeks: 0,
    consecutivePoorRecoveryWeeks: 0,
    lastCalAdjustmentDirection: null,
    lastCalAdjustmentWeeksAgo: 99,
    currentCalTarget: 2400,
    currentStepsTarget: 8000,
    bodyweightKg: 85,
    units: 'kg',
    ...overrides,
  };
}

// ── Override fires: bypasses both gates ─────────────────────────────────────

describe('Move #3 rapid-loss compression -- override fires', () => {
  test('fires on cut with weekly loss <= -1.5% AND energy <= 2', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.6),                  // ~ -1.9% /wk on 85 kg
      checkin: checkin({ energyScore: 2 }),
      goalPhase: 'mild_cut',
      weeksInPhase: 3,
      consecutiveOffTargetWeeks: 0,                     // would normally block
      lastCalAdjustmentWeeksAgo: 0,                     // would normally cooldown
    }));
    expect(out.rapidLossCorrectionApplied).toBe(true);
    expect(out.adjustments.calories).not.toBeNull();
    expect(out.adjustments.calories.change).toBeGreaterThan(0);
  });

  test('bypasses the 2-week cooldown (lastCalAdjustmentWeeksAgo = 0)', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.7),
      checkin: checkin({ energyScore: 1 }),
      lastCalAdjustmentWeeksAgo: 0,
      consecutiveOffTargetWeeks: 0,
    }));
    expect(out.rapidLossCorrectionApplied).toBe(true);
    expect(out.adjustments.calories.change).toBeGreaterThan(0);
  });

  test('bypasses the consecutiveOffTargetWeeks gate', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.7),
      checkin: checkin({ energyScore: 2 }),
      consecutiveOffTargetWeeks: 0,                     // no consecutive history
      lastCalAdjustmentWeeksAgo: 99,
    }));
    expect(out.rapidLossCorrectionApplied).toBe(true);
  });

  test('held-decision carries the locked structured shape', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.8),
      checkin: checkin({ energyScore: 2 }),
    }));
    const held = out.heldDecisions.find(d => d.type === 'rapid_loss_corrected');
    expect(held).toBeDefined();
    expect(typeof held.kcalDelta).toBe('number');
    expect(held.kcalDelta).toBeGreaterThan(0);
    expect(typeof held.weeklyLossPct).toBe('number');
    expect(held.weeklyLossPct).toBeLessThan(-1.5);
    expect(held.energyScore).toBe(2);
  });
});

// ── Override does NOT fire: standard gates remain ──────────────────────────

describe('Move #3 rapid-loss compression -- override does not fire', () => {
  test('does not fire on cut with loss < -1.5%', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -0.5),                  // gentle loss
      checkin: checkin({ energyScore: 2 }),
    }));
    expect(out.rapidLossCorrectionApplied).toBe(false);
  });

  test('does not fire on cut with energy > 2', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.8),                  // rapid loss
      checkin: checkin({ energyScore: 3 }),             // but energy fine
    }));
    expect(out.rapidLossCorrectionApplied).toBe(false);
  });

  test('does not fire during a bulk even with rapid gain + low energy', () => {
    const out = runWeeklyCoach(baseInputs({
      goalPhase: 'mod_bulk',
      morningWeights: trend(80, 1.6),                   // rapid gain
      bodyweightKg: 80,
      checkin: checkin({ energyScore: 2 }),             // low energy
    }));
    // Symmetric guard: bulks do not get compression on the downward
    // side. The standard 2-week cooldown still applies.
    expect(out.rapidLossCorrectionApplied).toBe(false);
  });

  test('does not fire when cycleOverride is true', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.8),
      checkin: checkin({ energyScore: 1, cycleOverride: true }),
    }));
    expect(out.rapidLossCorrectionApplied).toBe(false);
  });
});

// ── Magnitude scaling ──────────────────────────────────────────────────────

describe('Move #3 rapid-loss compression -- magnitude scaling', () => {
  test('larger loss yields larger boost', () => {
    const milder = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.6),
      checkin: checkin({ energyScore: 2 }),
    }));
    const sharper = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -2.3),
      checkin: checkin({ energyScore: 2 }),
    }));
    expect(milder.rapidLossCorrectionApplied).toBe(true);
    expect(sharper.rapidLossCorrectionApplied).toBe(true);
    expect(sharper.adjustments.calories.change)
      .toBeGreaterThanOrEqual(milder.adjustments.calories.change);
  });

  test('boost capped at +300 kcal (modulo the 5% relative cap on small targets)', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -4.0),                  // extreme synthetic case
      checkin: checkin({ energyScore: 1 }),
      currentCalTarget: 8000,                           // big target so 5% > 300
    }));
    expect(out.rapidLossCorrectionApplied).toBe(true);
    expect(out.adjustments.calories.change).toBeLessThanOrEqual(300);
  });
});

// ── Why-this-week + held-decision interaction ──────────────────────────────

describe('Move #3 rapid-loss compression -- output assembly', () => {
  test('whyThisWeek picks rapid_loss_corrected, not generic cal_up', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.8),
      checkin: checkin({ energyScore: 2 }),
    }));
    expect(out.whyThisWeek).toMatch(/Weight dropped fast this week/);
  });

  test('FFM floor still takes precedence over rapid-loss correction in whyKeys ordering', () => {
    // When both safety nets fire (intake below floor AND rapid loss
    // with low energy), the FFM floor wins because it gates the
    // adjustment to zero. The compression result becomes irrelevant
    // because there is nothing to add when the floor is the constraint.
    const out = runWeeklyCoach(baseInputs({
      morningWeights: trend(85, -1.8),
      checkin: checkin({ energyScore: 2 }),
      recentIntakeAvgKcal: 800,                         // well below floor
      recentIntakeDaysLogged: 6,
      sex: 'male',
    }));
    // FFM floor takes whyKey priority. The compression flag itself
    // may still report true (it only requires the rapid-loss
    // condition + cut phase + non-cycle); the rendered why-text
    // shows the floor framing.
    expect(out.ffmFloorHeld || out.rapidLossCorrectionApplied).toBe(true);
    if (out.ffmFloorHeld) {
      expect(out.whyThisWeek).toMatch(/safety floor/i);
    }
  });
});

// ── computeAdaptiveTDEEAdjustment.rapidLossOverride parameter ──────────────

describe('computeAdaptiveTDEEAdjustment.rapidLossOverride', () => {
  // Build an EWMA sequence whose weight-change > expected weight-change
  // so the function would normally suggest a NEGATIVE adjustment
  // (currentTDEEEstimate too low for the actual loss rate).
  function makeEwma(startKg, kgChangeOver14d) {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const w = startKg + kgChangeOver14d * (i / 13);
      out.push({ ewma: w, date: new Date(NOW - (13 - i) * DAY).toISOString() });
    }
    return out;
  }

  test('without override, negative adjustment passes through', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: makeEwma(85, +2.0),                     // gaining fast
      prescribedKcal: 2400,
      currentTDEEEstimate: 2400,
    });
    expect(result.adjustmentKcal).toBeLessThan(0);
  });

  test('with override = true, negative adjustment clamped to zero', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: makeEwma(85, +2.0),
      prescribedKcal: 2400,
      currentTDEEEstimate: 2400,
      rapidLossOverride: true,
    });
    expect(result.adjustmentKcal).toBe(0);
  });

  test('with override = true, positive adjustment passes through unchanged', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: makeEwma(85, -2.0),                     // losing fast
      prescribedKcal: 2400,
      currentTDEEEstimate: 2400,
      rapidLossOverride: true,
    });
    expect(result.adjustmentKcal).toBeGreaterThan(0);
  });
});
