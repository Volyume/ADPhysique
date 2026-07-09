/**
 * D15 (founder ruling 2026-07-09, docs/ux-world-class-audit-2026-07-09/
 * DECISIONS-2026-07-09.md, "Plan-G over-performance: BOTH"): the bounded
 * one-step training-volume escalation after N=3 consecutive 'exceeded'
 * weeks, plus its calm acknowledgement copy.
 *
 * Source: docs/exercise-planning-2026-07-09/plan-G-adherence-responsiveness.md
 * section 3 (the attachment point) maps this onto a NEW, explicit,
 * caller-supplied `consecutiveExceededWeeks` input, mirroring
 * consecutiveOffTargetWeeks/consecutivePoorRecoveryWeeks exactly, that may
 * move the existing weekly autoregulation push by exactly one extra step,
 * never past the matrix's own +3 ceiling, and never while any safety hold
 * is open.
 *
 * These are invariant tests against the REAL engine (runWeeklyCoach),
 * written to FAIL if: the counter fails to gate at N=3, the escalation
 * overshoots the ceiling, any hold is not respected, the copy leaks
 * outside the escalation week, or the run is not deterministic.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { computeVolumeApply } from '../coachApply';

const DAY = 86_400_000;

function weights(n = 35, startKg = 85, kgPerWeek = -0.1) {
  const out = [];
  const t0 = Date.now();
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: t0 - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

// A moderate weekly push: recovery 2 x performance 2 -> autoregulationMatrix's
// "Both 2" branch (volumeDelta: 1). Chosen (rather than the excellentRec
// recovery-1/performance-1 case) specifically because it leaves ROOM for the
// escalation to move a number, and because it does NOT satisfy `excellentRec`
// (energy>=4 && soreness<=2), which proves the new exceeded_escalation copy
// fires independently of the existing push_volume gate.
function moderatePushInputs(overrides = {}) {
  return {
    checkin: {
      weekStart: Date.now() - 7 * DAY,
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

// recovery 1 (energy 5 / soreness 1) x performance 2 -> the "recoveryScore
// === 1 OR performanceScore === 1" branch (volumeDelta: 2), one step short
// of the matrix's own +3 ceiling, so the escalation should land exactly on
// it (+1, never +2).
function nearCeilingPushInputs(overrides = {}) {
  return moderatePushInputs({
    checkin: { energyScore: 5, sorenessScore: 1, stressScore: 3, ...overrides.checkin },
    top: overrides.top,
  });
}

// recovery 1 x performance 1 -> already at the matrix's own +3 ceiling.
// There is no room left for the escalation to move anything.
function maxPushInputs(overrides = {}) {
  return moderatePushInputs({
    checkin: {
      energyScore: 5, sorenessScore: 1, stressScore: 1,
      trainingPerformance: 'exceeded',
      ...overrides.checkin,
    },
    top: overrides.top,
  });
}

// Reused verbatim from the working FFM-floor fixture
// (weeklyCoach.ffmFloor.test.js) so the "off-target weight-loss gate" test
// below exercises a genuinely independent domain (calorie safety) rather
// than an invented one.
function trendRising(start = 80, perDayKg = 0.03) {
  const days = 14;
  const out = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    out.push({ weightKg: start + perDayKg * i, loggedAt: Date.now() - daysAgo * DAY });
  }
  return out;
}

describe('D15: consecutiveExceededWeeks eligibility (3 exceeded -> eligible)', () => {
  test('fewer than 3 consecutive exceeded weeks: no escalation', () => {
    const base = runWeeklyCoach(moderatePushInputs());
    const under = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 2 } }));
    expect(base.volumeSignal).toBe(1);
    expect(under.volumeSignal).toBe(base.volumeSignal);
    expect(under.exceededEscalationApplied).toBe(false);
  });

  test('exactly 3 consecutive exceeded weeks: escalates by exactly one step', () => {
    const out = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 3 } }));
    expect(out.volumeSignal).toBe(2); // 1 (base push) + 1 (escalation)
    expect(out.exceededEscalationApplied).toBe(true);
    expect(out.adjustments.training.signal).toBe('push');
  });

  test('interruption resets: a broken streak (counter back to 0) does not escalate', () => {
    const out = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 0 } }));
    expect(out.volumeSignal).toBe(1);
    expect(out.exceededEscalationApplied).toBe(false);
  });

  test('a large counter still moves exactly one step, never more', () => {
    const out = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 12 } }));
    expect(out.volumeSignal).toBe(2);
    expect(out.exceededEscalationApplied).toBe(true);
  });
});

describe('D15: escalation is bounded to the matrix\'s own existing +3 ceiling', () => {
  test('one step short of the ceiling (+2) escalates to exactly +3, never past it', () => {
    const out = runWeeklyCoach(nearCeilingPushInputs({ top: { consecutiveExceededWeeks: 3 } }));
    expect(out.volumeSignal).toBe(3);
    expect(out.exceededEscalationApplied).toBe(true);
  });

  test('already at the +3 ceiling: nothing left to escalate, no false-positive copy', () => {
    const out = runWeeklyCoach(maxPushInputs({ top: { consecutiveExceededWeeks: 3 } }));
    expect(out.volumeSignal).toBe(3);
    expect(out.exceededEscalationApplied).toBe(false);
  });
});

describe('D15: the downstream MRV clamp (coachApply.computeVolumeApply) is untouched', () => {
  test('an escalated volumeSignal still cannot push a muscle past its own mrv', () => {
    const out = runWeeklyCoach(nearCeilingPushInputs({ top: { consecutiveExceededWeeks: 3 } }));
    expect(out.volumeSignal).toBe(3);
    const plannedRows = [{ muscle: 'chest', planned_sets: 18, mev: 10, mav: 16, mrv: 20 }];
    const changes = computeVolumeApply(plannedRows, out.volumeSignal);
    // 18 + 3 = 21, clamped to mrv 20.
    expect(changes[0].plannedSets).toBe(20);
  });
});

describe('D15: every safety hold blocks the escalation (weaker signal wins)', () => {
  test('a suggested deload (independent of this week\'s own recovery read) blocks it', () => {
    const out = runWeeklyCoach(moderatePushInputs({
      top: {
        goalPhase: 'mild_cut',
        weeksInPhase: 6,
        consecutivePoorRecoveryWeeks: 2, // + weeksInPhase>=6 && isCut = 2 triggers
        consecutiveExceededWeeks: 3,
      },
    }));
    expect(out.deloadSuggested).toBe(true);
    expect(out.exceededEscalationApplied).toBe(false);
  });

  test('poor recovery this week blocks it', () => {
    const out = runWeeklyCoach(moderatePushInputs({
      checkin: { energyScore: 2, sorenessScore: 2 },
      top: { consecutiveExceededWeeks: 3 },
    }));
    expect(out.exceededEscalationApplied).toBe(false);
  });

  test('joint pain / illness / injury safety hold blocks it', () => {
    const out = runWeeklyCoach(moderatePushInputs({
      checkin: { jointPain: true },
      top: { consecutiveExceededWeeks: 3 },
    }));
    expect(out.safetyHold).toBe(true);
    expect(out.exceededEscalationApplied).toBe(false);
  });

  test('the FFM-floor calorie hold (a genuinely independent domain) blocks it', () => {
    const out = runWeeklyCoach({
      checkin: {
        weekStart: Date.now() - 7 * DAY,
        energyScore: 3, sorenessScore: 2, stressScore: 3,
        calsAdherence: 'hit', trainingPerformance: 'hit',
        jointPain: false, notes: null,
      },
      morningWeights: trendRising(),
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
      consecutiveExceededWeeks: 3,
    });
    expect(out.ffmFloorHeld).toBe(true);
    expect(out.adjustments.training.signal).toBe('push'); // training and calorie are independent domains
    expect(out.exceededEscalationApplied).toBe(false);
  });

  test('an open ED-pattern flag blocks it', () => {
    const out = runWeeklyCoach(moderatePushInputs({
      top: { consecutiveExceededWeeks: 3, edPatternOpen: true },
    }));
    expect(out.exceededEscalationApplied).toBe(false);
    expect(out.volumeSignal).toBe(1);
  });

  test('a positive wellbeing-screen restriction flag (scoffPositive) blocks it', () => {
    const out = runWeeklyCoach(moderatePushInputs({
      top: { consecutiveExceededWeeks: 3, scoffPositive: true },
    }));
    expect(out.exceededEscalationApplied).toBe(false);
    expect(out.volumeSignal).toBe(1);
  });

  test('calm mode blocks it, even though the base weekly push carries no calm/ED suppression', () => {
    const withoutCalm = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 3 } }));
    const withCalm = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 3, calmMode: true } }));
    expect(withoutCalm.exceededEscalationApplied).toBe(true);
    expect(withCalm.exceededEscalationApplied).toBe(false);
    expect(withCalm.volumeSignal).toBe(1); // unescalated base push still stands
    expect(withCalm.adjustments.training.signal).toBe('push');
  });
});

describe('D15: the acknowledgement copy fires only with the escalation, and only then', () => {
  test('no escalation: whyThisWeek is never the escalation line', () => {
    const out = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 2 } }));
    expect(out.whyThisWeek).not.toMatch(/ahead of your plan/);
  });

  test('escalation fires: whyThisWeek is the exact locked-voice line, and only that line', () => {
    const out = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 3 } }));
    expect(out.whyThisWeek).toBe(
      'You have been ahead of your plan for three weeks running, so your coach is moving you along a little faster this week.',
    );
    // British English, no em dash, no mention of weight/body/intake (D15
    // ED-safety: the acknowledgement is training-volume-only).
    expect(out.whyThisWeek).not.toMatch(/—/);
    expect(out.whyThisWeek.toLowerCase()).not.toMatch(/\bweight\b|\bbody\b|\bcalorie|\bintake\b/);
  });

  test('the hero primary decision attributes to training, not a new domain', () => {
    const out = runWeeklyCoach(moderatePushInputs({ top: { consecutiveExceededWeeks: 3 } }));
    expect(out.primary).toEqual({ domain: 'training', reasonKey: 'exceeded_escalation' });
  });

  test('a held safety reason still outranks the escalation line when both are present', () => {
    // Joint pain both blocks the escalation AND takes priority in the WHY
    // ladder; the escalation copy must never leak through underneath it.
    const out = runWeeklyCoach(moderatePushInputs({
      checkin: { jointPain: true },
      top: { consecutiveExceededWeeks: 3 },
    }));
    expect(out.whyThisWeek).not.toMatch(/ahead of your plan/);
  });
});

describe('D15: determinism (pure function, no I/O, no randomness)', () => {
  test('identical inputs produce byte-identical output, twice', () => {
    const inputs = moderatePushInputs({ top: { consecutiveExceededWeeks: 3, nowMs: Date.now() } });
    const a = runWeeklyCoach(inputs);
    const b = runWeeklyCoach(inputs);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('every existing caller (no consecutiveExceededWeeks/calmMode supplied) is unaffected', () => {
    // moderatePushInputs() with no overrides never sets these two new keys;
    // runWeeklyCoach's own defaults (0 / false) apply, exactly as every
    // pre-D15 caller (tests, tests/simulator/runner.js) already does.
    const out = runWeeklyCoach(moderatePushInputs());
    expect(out.exceededEscalationApplied).toBe(false);
    expect(out.volumeSignal).toBe(1);
  });
});
