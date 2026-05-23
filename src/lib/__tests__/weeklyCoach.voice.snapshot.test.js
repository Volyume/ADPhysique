/**
 * Snapshot tests for the WHY_LIBRARY strings exported indirectly via
 * runWeeklyCoach() output. Locks the Precision Coaching naming applied in
 * the Move 0.5 voice retrofit so accidental rewrites fail CI.
 *
 * Voice rules: docs/COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import { runWeeklyCoach } from '../weeklyCoach';

// Minimal harness that produces a deterministic weekly-coach output
// for each WHY key by setting up the inputs that trigger that key.
const baseProfile = {
  sex: 'M',
  goal: 'mild_cut',
  weightKg: 85,
  heightCm: 180,
  ageYears: 35,
  experience: 'intermediate',
  bodyFatPct: 18,
};

function basicCheckin(over = {}) {
  return {
    energyScore: 4,
    recoveryScore: 4,
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    prsThisWeek: 0,
    stepsAdherence: 'hit',
    calsAdherence: 'hit',
    sorenessFlag: false,
    cycleOverride: false,
    ...over,
  };
}

function trendDown(start, pctPerWeek) {
  const days = 14;
  const out = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    const week = daysAgo / 7;
    out.push({ kg: start * (1 - pctPerWeek * week), takenAt: Date.now() - daysAgo * 86400000 });
  }
  return out;
}

describe('weeklyCoach WHY_LIBRARY strings (voice-locked)', () => {
  function runFromScenario(over = {}) {
    return runWeeklyCoach({
      profile: baseProfile,
      currentCalTarget: 2200,
      currentStepsTarget: 8000,
      checkin: basicCheckin(),
      morningWeights: trendDown(85, 0.0035),
      weeksInPhase: 4,
      consecutiveOffTargetWeeks: 0,
      lastCalAdjustmentWeeksAgo: 99,
      scoffPositive: false,
      ...over,
    });
  }

  test('every produced whyThisWeek string passes the no-blame rule', () => {
    // Run across a range of scenarios; the synthesis bans phrasing that
    // locates the cause in the user's character (you failed, you forgot).
    const scenarios = [
      {},
      { checkin: basicCheckin({ energyScore: 2, recoveryScore: 2 }) },
      { checkin: basicCheckin({ calsAdherence: 'untracked' }) },
      { consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4, morningWeights: trendDown(85, 0.015) },
      { morningWeights: trendDown(85, 0.0005), consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4 },
    ];
    for (const sc of scenarios) {
      const out = runFromScenario(sc);
      expect(out.whyThisWeek).not.toMatch(/you (failed|missed|forgot|messed up)/i);
      expect(out.whyThisWeek).not.toMatch(/let me|I'll|certainly|absolutely/i);
      expect(out.whyThisWeek).not.toMatch(/together we|let's work it out/i);
    }
  });

  test('Precision Coaching named when an action is being attributed', () => {
    // When the engine takes a specific action (raises calories, holds
    // due to recovery, schedules a deload), the output should name
    // Precision Coaching as the actor.
    const out = runFromScenario({
      consecutiveOffTargetWeeks: 3,
      lastCalAdjustmentWeeksAgo: 4,
      morningWeights: trendDown(85, 0.015),
      checkin: basicCheckin({ calsAdherence: 'hit' }),
    });
    // If the engine produced an adjustment, the reason should name Precision Coaching.
    if (out.adjustments?.calories?.change > 0 || out.adjustments?.calories?.change < 0) {
      expect(out.whyThisWeek).toMatch(/Precision Coaching/);
    }
    // Otherwise, the string is still in voice (just no action attributed).
    expect(out.whyThisWeek.length).toBeGreaterThan(10);
  });

  test('low-data scenarios are data-aware, not blaming', () => {
    const out = runFromScenario({
      morningWeights: [
        { kg: 85, takenAt: Date.now() - 2 * 86400000 },
        { kg: 84.9, takenAt: Date.now() - 86400000 },
      ],
      weeksInPhase: 1,
    });
    expect(out.whyThisWeek).not.toMatch(/you (failed|missed|forgot)/i);
  });

  test('held decisions never use AI-tell or false-collaboration language', () => {
    const out = runFromScenario({
      checkin: basicCheckin({ calsAdherence: 'untracked' }),
      morningWeights: trendDown(85, 0.005),
      consecutiveOffTargetWeeks: 3,
      lastCalAdjustmentWeeksAgo: 99,
    });
    for (const decision of out.heldDecisions ?? []) {
      expect(decision.reason).not.toMatch(/let me|I'll|certainly|absolutely/i);
      expect(decision.reason).not.toMatch(/together we|let's work|let's decide/i);
      expect(decision.reason).not.toMatch(/you should|you must|you have to/i);
    }
  });

  test('diet break suggestion names Precision Coaching as the suggester', () => {
    const out = runFromScenario({
      profile: { ...baseProfile, goal: 'mild_cut' },
      weeksInPhase: 13,
    });
    if (out.dietBreakNote) {
      expect(out.dietBreakNote).toMatch(/Precision Coaching/);
    }
  });
});
