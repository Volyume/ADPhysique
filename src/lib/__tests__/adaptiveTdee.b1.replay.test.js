/**
 * B1 replay corpus (Wave 3, founder-approved 2026-07-02).
 *
 * Deterministic before/after harness for the adherence-neutral mechanics
 * change: computeAdaptiveTDEEAdjustment consuming ACTUAL logged intake
 * instead of prescribedKcal x adherence-bucket, and the weekly resize
 * running from weights + rollups when the check-in was skipped.
 *
 * PHASE 1 (this commit): every assertion pins the CURRENT engine byte-for-
 * byte — the BEFORE baseline. PHASE 2 (the B1 implementation commit) updates
 * ONLY the scenarios whose behaviour is meant to change; the diff of that
 * commit IS the founder's delta report. Scenarios explicitly marked
 * "must never drift" keep their values forever (no-food-data users, floors,
 * blockers) — if the implementation moves one of those, B1 has leaked.
 *
 * EN-4 re-key (2026-07-02, after the B1 delta was signed off): the
 * integration fixture borrowed the DEAD 'mod_cut' vocabulary, which EN-4
 * deletes on founder ruling. Re-pinned on the live 'mild_cut' key with a
 * gentler slope so the SAME too-slow resize path fires, and the run clock
 * pinned via nowMs (the fixture previously floated on Date.now(), so the
 * snapshots were wall-clock-dependent). R1–R4 (the unit seam) and the
 * weightsSteadyCut/weightsStalled series are byte-untouched; R5/R6
 * snapshots were re-recorded in the SAME commit as this re-key, before the
 * EN-4 engine change, so the EN-4 implementation commit must not move them.
 */
import { computeAdaptiveTDEEAdjustment } from '../nutritionEngine';
import { runWeeklyCoach } from '../weeklyCoach';

const DAY = 86400000;
const NOW = new Date(2026, 5, 22, 8, 0, 0, 0).getTime(); // Mon 22 Jun 2026

// 28 daily weights easing 84.0 -> 82.6 kg (slow steady cut, ~0.35 kg/wk).
function weightsSteadyCut() {
  return Array.from({ length: 28 }, (_, i) => ({
    weightKg: +(84.0 - i * 0.05).toFixed(2),
    loggedAt: NOW - (27 - i) * DAY,
  }));
}
// 28 daily weights easing 83.5 -> 82.96 kg (~0.14 kg/wk, a too-slow cut for
// the mild_cut -0.375 %/wk target: the integration scenarios need the
// too-slow resize path to fire, exactly as it did under the old fixture).
function weightsSlowCut() {
  return Array.from({ length: 28 }, (_, i) => ({
    weightKg: +(83.5 - i * 0.02).toFixed(2),
    loggedAt: NOW - (27 - i) * DAY,
  }));
}
// 28 daily weights flat at 90 kg (stall on a supposed deficit).
function weightsStalled() {
  return Array.from({ length: 28 }, (_, i) => ({
    weightKg: 90.0,
    loggedAt: NOW - (27 - i) * DAY,
  }));
}
function ewmaFrom(weights) {
  // Mirror the exact series shaping runWeeklyCoach performs.
  const { computeEWMA } = require('../nutritionEngine');
  return computeEWMA(weights
    .filter(w => Number(w.weightKg) > 0)
    .sort((a, b) => a.loggedAt - b.loggedAt)
    .map(w => ({ weightKg: w.weightKg, date: new Date(w.loggedAt).toISOString() })));
}

const baseCoachInputs = (over = {}) => ({
  checkin: {
    weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 3, sleepHours: 7.5,
    calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit',
    jointPain: false, cycleOverride: false,
  },
  morningWeights: weightsSlowCut(),
  sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
  goalPhase: 'mild_cut', weeksInPhase: 5,
  consecutiveOffTargetWeeks: 3, consecutivePoorRecoveryWeeks: 0,
  lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
  // Maintenance chosen so the adaptive resize lands INSIDE the ±5 % cap:
  // R5 (bucket-based) and R6 (intake-based) must stay numerically distinct,
  // or the corpus can no longer show the intake seam doing the sizing.
  currentCalTarget: 2200, currentMaintenanceKcal: 2550,
  currentProteinG: 170, currentCarbsG: 200, currentFatG: 70,
  currentStepsTarget: 8000, stepsEnabled: false,
  bodyweightKg: 83, units: 'kg', sex: 'male',
  scoffPositive: false, recentWeeklyHistory: [], goalLockAdvanced: false,
  edPatternOpen: false, userTier: 'pro', hasUsedTrial: true,
  recentIntakeAvgKcal: null, recentIntakeDaysLogged: 0,
  nowMs: NOW,
  ...over,
});

describe('B1 replay corpus — computeAdaptiveTDEEAdjustment (unit seam)', () => {
  const ewmaCut = ewmaFrom(weightsSteadyCut());
  const ewmaStall = ewmaFrom(weightsStalled());

  test('R1 [must never drift] no-food-data cutter, adherence hit: bucket estimate stands', () => {
    const r = computeAdaptiveTDEEAdjustment({
      ewmaData: ewmaCut, prescribedKcal: 2200, currentTDEEEstimate: 2800, adherenceFactor: 1.0,
    });
    expect(r).toMatchSnapshot('R1');
  });

  test('R2 [must never drift] no-food-data stall, adherence under (0.9 bucket)', () => {
    const r = computeAdaptiveTDEEAdjustment({
      ewmaData: ewmaStall, prescribedKcal: 2000, currentTDEEEstimate: 2600, adherenceFactor: 0.9,
    });
    expect(r).toMatchSnapshot('R2');
  });

  test('R3 [expected to change in phase 2] stall WITH logged intake 2450 vs bucket estimate', () => {
    // Today the model cannot see the 2450; it estimates 2000x1.1=2200 from the
    // 'over' bucket. Phase 2 will feed actualIntakeKcal=2450 and this snapshot
    // will be updated — that update IS the delta the founder signs off.
    const r = computeAdaptiveTDEEAdjustment({
      ewmaData: ewmaStall, prescribedKcal: 2000, currentTDEEEstimate: 2600, adherenceFactor: 1.1,
      actualIntakeKcal: 2450, recentIntakeDaysLogged: 6,
    });
    expect(r).toMatchSnapshot('R3');
  });

  test('R4 [must never drift] insufficient data shape unchanged', () => {
    expect(computeAdaptiveTDEEAdjustment({
      ewmaData: ewmaCut.slice(0, 5), prescribedKcal: 2200, currentTDEEEstimate: 2800, adherenceFactor: 1.0,
    })).toEqual({ adjustmentKcal: 0, confidence: 'insufficient_data', insight: null, floorHeld: false });
  });
});

describe('B1 replay corpus — runWeeklyCoach (integration seam)', () => {
  test('R5 [must never drift] tracked check-in, no food diary: full output stable', () => {
    const out = runWeeklyCoach(baseCoachInputs());
    expect({
      calories: out.adjustments?.calories ?? null,
      confidence: out.confidence,
      rapid: out.rapidWeightLossFlag ?? false,
      held: (out.heldDecisions ?? []).map(d => d.type),
    }).toMatchSnapshot('R5');
  });

  test('R6 [expected to change in phase 2] check-in SKIPPED but 6 days of food logged: today no resize fires', () => {
    const out = runWeeklyCoach(baseCoachInputs({
      checkin: null,
      recentIntakeAvgKcal: 2350, recentIntakeDaysLogged: 6,
    }));
    expect({
      calories: out.adjustments?.calories ?? null,
      confidence: out.confidence,
      held: (out.heldDecisions ?? []).map(d => d.type),
    }).toMatchSnapshot('R6');
  });

  test('R7 [must never drift] check-in skipped AND no food data: never adjusts, before or after', () => {
    const out = runWeeklyCoach(baseCoachInputs({ checkin: null }));
    expect(out.adjustments?.calories?.change ?? 0).toBe(0);
  });

  test('R8 [must never drift] scoffPositive blocks the resize regardless of food data', () => {
    const out = runWeeklyCoach(baseCoachInputs({
      scoffPositive: true, recentIntakeAvgKcal: 2350, recentIntakeDaysLogged: 6,
    }));
    expect(out.adjustments?.calories?.change ?? 0).toBe(0);
  });

  test('R9 [must never drift] open ED pattern: no downward adjustment with or without food data', () => {
    const out = runWeeklyCoach(baseCoachInputs({
      edPatternOpen: true, recentIntakeAvgKcal: 2350, recentIntakeDaysLogged: 6,
    }));
    expect((out.adjustments?.calories?.change ?? 0) <= 0 ? (out.adjustments?.calories?.change ?? 0) === 0 : true).toBe(true);
    expect(out.adjustments?.calories?.change ?? 0).toBeGreaterThanOrEqual(0);
  });
});
