/**
 * weeklyCoach.evidencedClaims.test.js — C6 P-2 (D97-20): evidence-bounded
 * phase claims. weeksInPhase is pure wall-clock, so a Pro -> Free -> Pro
 * user's first run back used to open with "Week 34 · Cut" and "You have
 * been eating below maintenance for 34 weeks" about months in which they
 * were uncoached and very possibly not dieting (Campaign 6 law 1: never
 * convert absence into evidence; law 3: no fabricated recovery
 * assumptions). This suite pins the ruling's exact split:
 *  - CLAIMS (week label, diet-break wording) are bounded by
 *    evidencedWeeksInPhase, the caller-derived count of phase weeks with a
 *    saved weekly run;
 *  - the phase CLOCK is untouched: gates, the deload trigger and the
 *    diet-break TRIGGER (protective) still read wall-clock weeksInPhase,
 *    and nothing here is a phase reset or a D91-25 freshness algorithm;
 *  - legacy callers (evidencedWeeksInPhase absent) are byte-identical.
 */
import { runWeeklyCoach } from '../weeklyCoach';

const DAY = 86400000;

function trendSharp(startKg, kgPerWeek, count = 35) {
  const out = [];
  const t0 = Date.now();
  const weeks = (count - 1) / 7;
  const endKg = startKg + kgPerWeek * weeks;
  for (let i = 0; i < count; i++) {
    const t = t0 - (count - 1 - i) * DAY;
    const w = startKg + (endKg - startKg) * (i / Math.max(1, count - 1));
    out.push({ loggedAt: t, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

function checkin(overrides = {}) {
  return {
    weekStart: Date.now() - 7 * DAY,
    energyScore: 3, sorenessScore: 3, stressScore: 3, sleepHours: 7,
    calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit',
    jointPain: false, soreMuscles: null, notes: null,
    ...overrides,
  };
}

function baseInputs(overrides = {}) {
  return {
    checkin: checkin(),
    morningWeights: trendSharp(85, -0.4),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'mild_cut', trainingGoal: 'build_muscle',
    weeksInPhase: 34,
    consecutiveOffTargetWeeks: 0, consecutivePoorRecoveryWeeks: 0,
    lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
    currentCalTarget: 2400, currentStepsTarget: 8000,
    bodyweightKg: 85, units: 'kg',
    ...overrides,
  };
}

describe('claims are bounded by coached evidence', () => {
  test('the returning user\'s week label counts coached weeks, not absent months', () => {
    const out = runWeeklyCoach(baseInputs({ evidencedWeeksInPhase: 15 }));
    expect(out.weekLabel).toBe('Week 15 · Mild cut');
  });

  test('the diet-break note claims the cut\'s set-age, never continuous under-eating', () => {
    const out = runWeeklyCoach(baseInputs({ evidencedWeeksInPhase: 15 }));
    // The protective suggestion still fires (the trigger reads wall-clock).
    expect(out.dietBreakSuggested).toBe(true);
    expect(out.dietBreakNote).toMatch(/This cut has been set for 34 weeks/);
    expect(out.dietBreakNote).not.toMatch(/eating below maintenance for/);
    expect(out.dietBreakContinuityEvidenced).toBe(false);
  });

  test('the same holds on the goalStartDate (precise) diet-break branch', () => {
    const out = runWeeklyCoach(baseInputs({
      evidencedWeeksInPhase: 15,
      goalStartDate: Date.now() - 34 * 7 * DAY,
    }));
    expect(out.dietBreakSuggested).toBe(true);
    expect(out.dietBreakNote).toMatch(/This cut has been set for \d+ weeks/);
    expect(out.dietBreakNote).not.toMatch(/You have been eating below maintenance/);
  });

  test('the data-hold return\'s week label is bounded too', () => {
    const out = runWeeklyCoach(baseInputs({
      evidencedWeeksInPhase: 15, morningWeights: [],
    }));
    expect(out.hasEnoughData).toBe(false);
    expect(out.weekLabel).toBe('Week 15 · Mild cut');
  });
});

describe('the phase clock is NOT reset (ruling: claims only)', () => {
  test('gates and confidence still read wall-clock weeksInPhase', () => {
    // With evidence bounded to 1, a would-be "week 1" claim must NOT
    // reopen the weeksInPhase < 2 baseline hold: week 34 wall-clock keeps
    // hasEnoughData satisfied when weight data is sufficient.
    const out = runWeeklyCoach(baseInputs({ evidencedWeeksInPhase: 2 }));
    expect(out.hasEnoughData).toBe(true);
  });

  test('the diet-break trigger itself is unchanged by low evidence', () => {
    const withGap = runWeeklyCoach(baseInputs({ evidencedWeeksInPhase: 2 }));
    const without = runWeeklyCoach(baseInputs());
    expect(withGap.dietBreakSuggested).toBe(without.dietBreakSuggested);
    expect(withGap.dietBreakWeeksInDeficit).toBe(without.dietBreakWeeksInDeficit);
  });
});

describe('continuously coached users and legacy callers are unchanged', () => {
  test('evidence within the one-week boundary tolerance keeps today\'s claims', () => {
    const out = runWeeklyCoach(baseInputs({ evidencedWeeksInPhase: 33 }));
    expect(out.weekLabel).toBe('Week 34 · Mild cut');
    expect(out.dietBreakNote).toMatch(/below maintenance for 34 weeks/);
    expect(out.dietBreakContinuityEvidenced).toBe(true);
  });

  test('an absent evidencedWeeksInPhase input is byte-identical to before', () => {
    const nowMs = Date.now();
    // One shared fixture: trendSharp re-anchors to Date.now() per call, so
    // the deterministic comparison needs identical weights AND nowMs.
    const shared = baseInputs({ nowMs });
    const legacy = runWeeklyCoach(shared);
    const explicitNull = runWeeklyCoach({ ...shared, evidencedWeeksInPhase: null });
    expect(explicitNull).toEqual(legacy);
    expect(legacy.weekLabel).toBe('Week 34 · Mild cut');
    expect(legacy.dietBreakContinuityEvidenced).toBe(true);
  });

  test('evidence can never INFLATE a claim past the wall clock', () => {
    const out = runWeeklyCoach(baseInputs({ weeksInPhase: 4, evidencedWeeksInPhase: 40 }));
    expect(out.weekLabel).toBe('Week 4 · Mild cut');
  });
});

describe('C6 R-1 (D97-22): stale weigh-ins are never read as this week\'s data', () => {
  const staleWeights = (endDaysAgo, nowMs, count = 21) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push({
        loggedAt: nowMs - (endDaysAgo + count - 1 - i) * DAY,
        weightKg: 82 - i * 0.05,
      });
    }
    return out;
  };

  test('a 180-day-old weigh-in series produces the data hold, never a high-confidence cut', () => {
    const nowMs = Date.now();
    const out = runWeeklyCoach(baseInputs({
      nowMs,
      weeksInPhase: 30,
      morningWeights: staleWeights(180, nowMs),
      consecutiveOffTargetWeeks: 2,
      lastCalAdjustmentWeeksAgo: 12,
    }));
    expect(out.hasEnoughData).toBe(false);
    expect(out.confidence).toBe('data_hold');
    expect(out.adjustments?.calories ?? null).toBeNull();
    // And no fabricated "this week" reading is spoken about the absence.
    expect(out.trend?.deltaLabel).not.toMatch(/this week/);
    expect(out.trend?.rateLabel ?? null).toBeNull();
  });

  test('the same series ending this week still coaches (the hold is about staleness, not shape)', () => {
    const nowMs = Date.now();
    const out = runWeeklyCoach(baseInputs({
      nowMs,
      morningWeights: staleWeights(0, nowMs),
      consecutiveOffTargetWeeks: 2,
      lastCalAdjustmentWeeksAgo: 12,
    }));
    expect(out.hasEnoughData).toBe(true);
    expect(out.confidence).not.toBe('data_hold');
  });
});
