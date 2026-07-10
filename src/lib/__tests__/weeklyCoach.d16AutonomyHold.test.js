/**
 * D16 (Ultimate-Audit item 11 refinement, founder ruling 2026-07-10):
 * "never auto-apply during a hold" -- whatever coachAutonomy mode is active
 * in the caller (CoachOutputScreen), any open safety hold forces
 * confirm-first behaviour. This suite pins the ONE engine-side flag that
 * makes that rule enforceable in a single place:
 * `runWeeklyCoach(...).autoApplyHoldActive`.
 *
 * Source read in full for this build:
 * - docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md:166
 *   ("Named autonomy modes (AC/SC) -- Coached/Collaborative/Manual toggle
 *   (manual control already exists; name it)") and :186-187 (NA-coaching-10:
 *   "Coached never auto-applies while a safety hold / ED-flag / suppression
 *   is active -- the decision is shown for the user to confirm; auto-apply
 *   resumes only when clear.").
 * - docs/ultimate-audit-2026-06-13/pass4-blueprints-coaching-progress.md
 *   :191-377 (ULTIMATE-AUTONOMY-01: the three modes, the safety carve-out
 *   NA-coaching-10, and "every mode renders the SAME deterministic engine
 *   decision ... only the apply-behaviour differs").
 * - The D16 refinement text (this run) names the exact hold set: deload,
 *   poor recovery, safety hold, FFM floor, ED flag, rapid loss, calm mode.
 *
 * These are invariant tests against the REAL engine (runWeeklyCoach),
 * written to FAIL if: any named hold fails to set the flag, the flag is
 * ever true with no hold present, or the run is not deterministic.
 */
import { runWeeklyCoach } from '../weeklyCoach';

const DAY = 86_400_000;
const NOW = Date.now();

function weights(n = 35, startKg = 85, kgPerWeek = -0.1) {
  const out = [];
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: NOW - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

// A clean, mid-of-the-road push week: recovery 2 x performance 2 ->
// autoregulationMatrix's "Both 2" branch (volumeDelta: 1, no deload, no
// safety signals). Chosen as the "no hold present" baseline.
function cleanPushInputs(overrides = {}) {
  return {
    checkin: {
      weekStart: NOW - 7 * DAY,
      energyScore: 3,
      sorenessScore: 2,
      stressScore: 3,
      calsAdherence: 'hit',
      trainingPerformance: 'hit',
      jointPain: false,
      notes: null,
      ...overrides.checkin,
    },
    morningWeights: weights(),
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    prsThisWeek: 0,
    goalPhase: 'maint',
    weeksInPhase: 4,
    currentCalTarget: 2400,
    currentStepsTarget: 8000,
    bodyweightKg: 85,
    units: 'kg',
    ...overrides.top,
  };
}

// 14 days of weight rising slightly, on a cut -- the fixture the FFM-floor
// suite (weeklyCoach.ffmFloor.test.js) and D15 suite both use to make the
// engine want a calorie reduction that the floor then holds.
function trendRisingOnCut(start = 80, perDayKg = 0.08) {
  const days = 14;
  const out = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    out.push({ weightKg: start + perDayKg * i, loggedAt: NOW - daysAgo * DAY });
  }
  return out;
}

describe('D16: autoApplyHoldActive is false with no hold present', () => {
  test('a clean week (no deload, no ED, no FFM hold, no calm, no safety) is not held', () => {
    const out = runWeeklyCoach(cleanPushInputs());
    expect(out.autoApplyHoldActive).toBe(false);
  });
});

describe('D16: every named hold sets autoApplyHoldActive (deload, poor recovery, safety hold, FFM floor, ED flag, rapid loss, calm mode)', () => {
  test('deload -- a suggested recovery week holds', () => {
    const out = runWeeklyCoach(cleanPushInputs({
      top: {
        goalPhase: 'mild_cut',
        weeksInPhase: 6,
        consecutivePoorRecoveryWeeks: 2, // + weeksInPhase>=6 && isCut = 2 triggers
      },
    }));
    expect(out.deloadSuggested).toBe(true);
    expect(out.autoApplyHoldActive).toBe(true);
  });

  test('poor recovery -- low energy this week holds even without a deload call', () => {
    const out = runWeeklyCoach(cleanPushInputs({
      checkin: { energyScore: 2, sorenessScore: 2 },
    }));
    expect(out.autoApplyHoldActive).toBe(true);
  });

  test('safety hold -- flagged joint pain holds', () => {
    const out = runWeeklyCoach(cleanPushInputs({ checkin: { jointPain: true } }));
    expect(out.safetyHold).toBe(true);
    expect(out.autoApplyHoldActive).toBe(true);
  });

  test('safety hold -- an injury note holds', () => {
    const out = runWeeklyCoach(cleanPushInputs({ checkin: { notes: 'tweaked my back, injury' } }));
    expect(out.safetyHold).toBe(true);
    expect(out.autoApplyHoldActive).toBe(true);
  });

  test('FFM floor -- calorie target held at the safety floor holds', () => {
    const out = runWeeklyCoach({
      checkin: {
        weekStart: NOW - 7 * DAY,
        energyScore: 3, sorenessScore: 2, stressScore: 3,
        calsAdherence: 'hit', trainingPerformance: 'hit',
        jointPain: false, notes: null,
      },
      morningWeights: trendRisingOnCut(),
      sessionsCompleted: 4,
      sessionsPlanned: 4,
      prsThisWeek: 0,
      goalPhase: 'mild_cut',
      weeksInPhase: 6,
      consecutiveOffTargetWeeks: 3,
      lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 1800,
      currentStepsTarget: 8000,
      bodyweightKg: 80,
      units: 'kg',
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 1900,
      recentIntakeDaysLogged: 7,
    });
    expect(out.ffmFloorHeld).toBe(true);
    expect(out.autoApplyHoldActive).toBe(true);
  });

  test('ED flag -- an already-open ED-pattern flag holds', () => {
    const out = runWeeklyCoach(cleanPushInputs({ top: { edPatternOpen: true } }));
    expect(out.autoApplyHoldActive).toBe(true);
  });

  test('wellbeing restriction -- a positive wellbeing screen holds (lead restore: the June rule\'s "suppression" covers scoffPositive, as in the D15/D18 gates)', () => {
    const out = runWeeklyCoach(cleanPushInputs({ top: { scoffPositive: true } }));
    expect(out.autoApplyHoldActive).toBe(true);
  });

  test('rapid loss -- the rapid-weight-loss safety signal holds', () => {
    // rapidWeightLossFlag needs a genuine <= -1.5%/wk trend + energyScore <= 2
    // (weeklyCoach.js :1164-1169). -1.6 kg/wk on an 85kg baseline is ~-1.9%/wk,
    // the same fixture shape weeklyCoach.d15ExceededEscalation.test.js and
    // upwardGateCompression.test.js already use for this exact signal.
    const rapid = runWeeklyCoach({
      checkin: {
        weekStart: NOW - 7 * DAY,
        energyScore: 2, sorenessScore: 2, stressScore: 3,
        calsAdherence: 'hit', trainingPerformance: 'hit',
        jointPain: false, notes: null,
      },
      morningWeights: weights(35, 85, -1.6),
      sessionsCompleted: 4,
      sessionsPlanned: 4,
      prsThisWeek: 0,
      goalPhase: 'mild_cut',
      weeksInPhase: 3,
      currentCalTarget: 2400,
      currentStepsTarget: 8000,
      bodyweightKg: 85,
      units: 'kg',
    });
    expect(rapid.rapidWeightLossFlag).toBe(true);
    expect(rapid.autoApplyHoldActive).toBe(true);
  });

  test('calm mode -- calm mode holds even on an otherwise clean week', () => {
    const withoutCalm = runWeeklyCoach(cleanPushInputs());
    const withCalm = runWeeklyCoach(cleanPushInputs({ top: { calmMode: true } }));
    expect(withoutCalm.autoApplyHoldActive).toBe(false);
    expect(withCalm.autoApplyHoldActive).toBe(true);
  });
});

describe('D16: autoApplyHoldActive does not depend on which adjustment is present', () => {
  test('a hold-free week with no calorie adjustment (change === 0) is still not held', () => {
    const out = runWeeklyCoach(cleanPushInputs({
      top: { lastCalAdjustmentWeeksAgo: 0 }, // cooldown -> calories held, not a safety hold
    }));
    expect(out.autoApplyHoldActive).toBe(false);
  });
});

describe('D16: insufficient-data / low-adherence baseline outputs never claim a hold that blocks nothing', () => {
  test('the insufficient-data path carries autoApplyHoldActive: false (no adjustments exist to auto-apply either way)', () => {
    const out = runWeeklyCoach({
      checkin: null,
      morningWeights: [],
      sessionsCompleted: 0,
      sessionsPlanned: 4,
      prsThisWeek: 0,
      goalPhase: 'maint',
      weeksInPhase: 1,
      currentCalTarget: 2400,
      currentStepsTarget: 8000,
      bodyweightKg: 85,
      units: 'kg',
    });
    expect(out.hasEnoughData).toBe(false);
    expect(out.autoApplyHoldActive).toBe(false);
    expect(out.adjustments.calories).toBeNull();
  });

  test('the low-session-adherence path carries autoApplyHoldActive: false', () => {
    const out = runWeeklyCoach({
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3 },
      morningWeights: weights(),
      sessionsCompleted: 1,
      sessionsPlanned: 4,
      prsThisWeek: 0,
      goalPhase: 'maint',
      weeksInPhase: 4,
      currentCalTarget: 2400,
      currentStepsTarget: 8000,
      bodyweightKg: 85,
      units: 'kg',
    });
    expect(out.sessionsCompleted / out.sessionsPlanned).toBeLessThan(0.5);
    expect(out.autoApplyHoldActive).toBe(false);
    expect(out.adjustments.calories).toBeNull();
  });
});

describe('D16: determinism (pure function, no I/O, no randomness)', () => {
  test('identical inputs produce a byte-identical autoApplyHoldActive read, twice', () => {
    const inputs = cleanPushInputs({ checkin: { jointPain: true } });
    const a = runWeeklyCoach(inputs);
    const b = runWeeklyCoach(inputs);
    expect(a.autoApplyHoldActive).toBe(b.autoApplyHoldActive);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('every existing caller (no autonomy-related input supplied) is unaffected: the field simply appears, defaulting per the same inputs already in scope', () => {
    const out = runWeeklyCoach(cleanPushInputs());
    expect(typeof out.autoApplyHoldActive).toBe('boolean');
  });
});
