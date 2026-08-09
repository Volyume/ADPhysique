/**
 * weeklyCoach.stage4.fatigueContext.test.js — TEST-FIRST, Stage 4 of the
 * adaptive mesocycle build (founder order 2026-08-09; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.3 + the founder's
 * Stage 4 spec: "fatigue context — week-in-block; distinguish expected
 * accumulating vs persistent excessive vs acute isolated bad recovery;
 * don't let normal peak-week fatigue fight the ramp").
 *
 * Pins on the REAL engine (runWeeklyCoach):
 * 1. WEEK CONTEXT: an observed recovery grade 3 in the block's PEAK week
 *    (the final accumulation week) reads as expected accumulated fatigue
 *    for the push/hold branch — performance 1 pushes instead of holding.
 *    The adjustment NEVER applies in week 1..n-1 (early grade 3 stays an
 *    early warning = hold), NEVER applies to grade 4, NEVER touches the
 *    deload thresholds (grade 4, or 3 with performance 4, deload exactly
 *    as before), and NEVER applies when the fatigue is persistent
 *    (consecutivePoorRecoveryWeeks >= 1 means it predates the peak).
 *    Without block context inputs the engine is byte-identical.
 * 2. PR DENSITY (§3.3): the top performance grade no longer comes from a
 *    single all-time PR — it needs >= ~1 PR per 3 completed sessions, or
 *    a real block e1RM slope (>= 1.5%, caller-supplied, Stage 6 wires
 *    it), or the check-in's own 'exceeded' verdict.
 * 3. The safety order is untouched: a safety hold still caps any push,
 *    including a context-softened one.
 */
import fs from 'fs';
import path from 'path';
import { runWeeklyCoach } from '../weeklyCoach';

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

// Recovery grade 3 (energy 3 / soreness 3) with top-grade performance via
// the check-in's own 'exceeded' verdict: matrix (3,1) -> hold today.
function peakFatigueInputs(overrides = {}) {
  return {
    checkin: {
      weekStart: Date.now() - 7 * DAY,
      energyScore: 3,
      sorenessScore: 3,
      stressScore: 3,
      calsAdherence: 'hit',
      trainingPerformance: 'exceeded',
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

const PEAK = { blockWeekIndex: 4, blockAccumWeeks: 4 };

describe('peak-week fatigue context (expected accumulating fatigue)', () => {
  test('recovery 3 + performance 1 in the PEAK week pushes instead of holding, and says so', () => {
    const out = runWeeklyCoach(peakFatigueInputs({ top: PEAK }));
    expect(out.volumeSignal).toBe(2);
    expect(out.adjustments.training.signal).toBe('push');
    expect(out.peakWeekContextApplied).toBe(true);
  });

  test('WITHOUT block context the same week holds (the no-context grade path is unchanged)', () => {
    // NOTE the honest scope: the PR-DENSITY change below DOES alter live
    // behaviour for 1-PR weeks (that is what §3.3 ordered); this pins only
    // that the week-context softening needs the context inputs.
    const out = runWeeklyCoach(peakFatigueInputs());
    expect(out.volumeSignal).toBe(0);
    expect(out.adjustments.training.signal).toBe('hold');
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('a grade 3 from HIGH STRESS is never softened (stress can only worsen the read, PIPE-001)', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      checkin: { energyScore: 4, sorenessScore: 1, stressScore: 5 },
      top: PEAK,
    }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('a grade 3 from LOW ENERGY is never softened (that is not the ramp talking)', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      checkin: { energyScore: 2, sorenessScore: 1 },
      top: PEAK,
    }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('weeks already sore before the peak (grade-3 counter) block the softening', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      top: { ...PEAK, consecutiveGrade3RecoveryWeeks: 1 },
    }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('the deload week itself is never softened (index past the peak)', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      top: { blockWeekIndex: 5, blockAccumWeeks: 4 },
    }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('a short block (2 accumulation weeks) has no ramp to accumulate from: no softening', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      top: { blockWeekIndex: 2, blockAccumWeeks: 2 },
    }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('a softened push is not D15 escalation evidence: the exceeded counter cannot stack on it', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      top: { ...PEAK, consecutiveExceededWeeks: 3 },
    }));
    expect(out.volumeSignal).toBe(2); // softened push, NOT escalated to 3
    expect(out.exceededEscalationApplied).toBe(false);
    expect(out.peakWeekContextApplied).toBe(true);
  });

  test('the softened note names the mechanism and never claims excellent recovery', () => {
    const out = runWeeklyCoach(peakFatigueInputs({ top: PEAK }));
    expect(out.adjustments.training.note).toContain('Peak-week fatigue');
    expect(out.adjustments.training.note.toLowerCase()).not.toContain('excellent');
  });

  test('the same grade-3 read in week 1 is an early warning: hold, no context', () => {
    const out = runWeeklyCoach(peakFatigueInputs({ top: { blockWeekIndex: 1, blockAccumWeeks: 4 } }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('a mid-block week is not the peak: hold stands', () => {
    const out = runWeeklyCoach(peakFatigueInputs({ top: { blockWeekIndex: 2, blockAccumWeeks: 4 } }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('PERSISTENT fatigue is never softened: prior poor-recovery weeks keep the hold in the peak week', () => {
    const out = runWeeklyCoach(peakFatigueInputs({ top: { ...PEAK, consecutivePoorRecoveryWeeks: 1 } }));
    expect(out.volumeSignal).toBe(0);
    expect(out.peakWeekContextApplied).toBe(false);
  });
});

describe('deload thresholds are untouched by week context (the founder red line)', () => {
  test('recovery grade 4 in the peak week still deloads', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      checkin: { sorenessScore: 4 },
      top: { ...PEAK, consecutivePoorRecoveryWeeks: 1 },
    }));
    expect(out.volumeSignal).toBe(-2);
    expect(out.adjustments.training.signal).toBe('reduce');
    expect(out.peakWeekContextApplied).toBe(false);
  });

  test('recovery 3 with performance 4 in the peak week still reads the RAW grade and deloads', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      checkin: { trainingPerformance: 'dropped' },
      top: { ...PEAK, consecutivePoorRecoveryWeeks: 1 },
    }));
    expect(out.volumeSignal).toBe(-2);
    expect(out.adjustments.training.signal).toBe('reduce');
  });

  test('an acute isolated bad week outside the peak neither softens nor escalates: plain hold', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      top: { blockWeekIndex: 2, blockAccumWeeks: 4, consecutivePoorRecoveryWeeks: 0 },
    }));
    expect(out.volumeSignal).toBe(0);
    expect(out.deloadSuggested ?? false).toBe(false);
  });
});

describe('safety order survives the context (nothing outranks a safety hold)', () => {
  test('joint pain caps a context-softened push back to hold', () => {
    const out = runWeeklyCoach(peakFatigueInputs({
      checkin: { jointPain: true },
      top: PEAK,
    }));
    expect(out.volumeSignal).toBe(0);
    expect(out.safetyHold).toBe(true);
  });
});

describe('§3.3: PR density replaces the PR binary in the performance grade', () => {
  // Recovery grade 2 (energy 3 / soreness 2), performance from PRs alone
  // (trainingPerformance 'hit' so the verdict route stays out of the way).
  const prInputs = (prs, over = {}) => peakFatigueInputs({
    checkin: { sorenessScore: 2, trainingPerformance: 'hit', ...over.checkin },
    top: { prsThisWeek: prs, ...over.top },
  });

  test('one PR across four sessions is no longer the top grade: matrix reads (2,2) -> +1', () => {
    const out = runWeeklyCoach(prInputs(1));
    expect(out.volumeSignal).toBe(1);
  });

  test('two PRs across four sessions is real density: matrix reads (2,1) -> +2', () => {
    const out = runWeeklyCoach(prInputs(2));
    expect(out.volumeSignal).toBe(2);
  });

  test('one PR in three sessions clears the density bar', () => {
    const out = runWeeklyCoach(prInputs(1, { top: { sessionsCompleted: 3, sessionsPlanned: 3 } }));
    expect(out.volumeSignal).toBe(2);
  });

  test('exactly the 0.3 boundary passes: three PRs across ten sessions', () => {
    const out = runWeeklyCoach(prInputs(3, { top: { sessionsCompleted: 10, sessionsPlanned: 10 } }));
    expect(out.volumeSignal).toBe(2);
  });

  test('a real block e1RM slope is an alternative route to strong performance', () => {
    const withSlope = runWeeklyCoach(prInputs(0, { top: { blockE1rmSlopePct: 2 } }));
    expect(withSlope.volumeSignal).toBe(2);
    const weakSlope = runWeeklyCoach(prInputs(0, { top: { blockE1rmSlopePct: 1 } }));
    expect(weakSlope.volumeSignal).toBe(1);
  });

  test("the check-in's own 'exceeded' verdict still reaches the top grade without any PRs", () => {
    const out = runWeeklyCoach(prInputs(0, { checkin: { trainingPerformance: 'exceeded' } }));
    expect(out.volumeSignal).toBe(2);
  });
});

describe('the coach screen refuses to add sets to a recovery week (source pins)', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

  test('the apply resolver captures whether the next week is a deload row', () => {
    const src = read('screens/CoachOutputScreen.js');
    expect(src).toMatch(/setNextWeekIsDeload/);
    expect(src).toMatch(/is_deload/);
  });

  test('a positive delta cannot apply into a deload row, and the card explains why', () => {
    const src = read('screens/CoachOutputScreen.js');
    expect(src).toMatch(/delta > 0 && nextWeekIsDeload/);
    expect(src).toContain('recovery week, so the coach');
  });

  test('the weekly-coach caller threads the block week context, never for a finished block', () => {
    const src = read('screens/CoachOutputScreen.js');
    expect(src).toMatch(/blockWeekIndex/);
    expect(src).toMatch(/blockAccumWeeks/);
    expect(src).toMatch(/awaitingDecision \? null/);
  });
});
