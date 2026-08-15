/**
 * coachTrainingLoop.test.js — Campaign 18 adversarial closure, job B.
 *
 * THE FALSE DELIVERY THIS CLOSES. Volume interventions were RECORDED at the
 * apply site and READ into the weekly run, and then nothing in the weekly run
 * consulted them when the next volume decision was made. The nutrition side
 * had two consumers; the training side had none. So the app could add sets,
 * watch that fail, and add the same sets again the following week with no
 * memory of having tried it. The outcome-follow-up suites passed throughout,
 * because they exercised the recording half.
 *
 * And the volume record observed `recovery.systemic` ALONE while the apply
 * site's own comment claimed it was judged on recovery AND performance.
 *
 * Every case below runs through runWeeklyCoach and asserts on volumeSignal -
 * the number the apply path actually writes into planned volume - because a
 * helper agreeing with itself proves nothing about the product.
 *
 * REAL HISTORY -> REAL DECISION -> REAL FUTURE CONSEQUENCE.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import {
  buildInterventionRecord, INTERVENTION_KIND, OBSERVE, OUTCOME,
  classifyOutcome, volumeDecisionMemory,
} from '../coachIntervention';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 4, 18, 9, 0, 0);

const weights = (start, kgPerWeek, n = 35) => Array.from({ length: n }, (_, i) => ({
  loggedAt: NOW - (n - 1 - i) * DAY,
  weightKg: Math.round((start + kgPerWeek * (i / 7)) * 100) / 100,
}));

/**
 * An athlete whose check-in earns a push (energy 4, soreness 2, performance
 * 'exceeded' three weeks running) while the OBJECTIVE strength slope is
 * negative. That combination is what makes the case legible: the matrix
 * proposes more volume, and training progress is genuinely poor, so the
 * outcome of a previous volume increase is readable rather than assumed.
 */
function week(o = {}) {
  return runWeeklyCoach({
    nowMs: NOW,
    checkin: {
      weekStart: NOW - 7 * DAY, energyScore: 4, sorenessScore: 2, stressScore: 1,
      calsAdherence: 'hit', notes: '', trainingPerformance: 'exceeded',
    },
    morningWeights: weights(80, 0.2),
    sessionsCompleted: o.sessionsCompleted ?? 4, sessionsPlanned: 4,
    prsThisWeek: 2, blockE1rmSlopePct: o.slope === undefined ? -0.5 : o.slope,
    goalPhase: 'bulk', weeksInPhase: 8, consecutiveOffTargetWeeks: 0,
    lastCalAdjustmentWeeksAgo: 8, currentCalTarget: 3000, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: 3010, recentIntakeDaysLogged: 7,
    lastCheckinAt: NOW - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    consecutiveExceededWeeks: 3,
    priorInterventions: o.prior ?? [],
    manualVolumeMuscles: o.manualVolumeMuscles ?? [],
  });
}

/** A volume change the athlete accepted, in the shape the apply site writes. */
const volumeChange = ({ weeksAgo, direction, progressBaseline, recoveryBaseline = 0 }) =>
  buildInterventionRecord({
    kind: INTERVENTION_KIND.VOLUME_START,
    appliedAtMs: NOW - weeksAgo * 7 * DAY,
    direction, magnitude: 2, goalPhase: 'bulk',
    baseline: { key: 'recovery.systemic', value: recoveryBaseline },
    baselines: { 'training.progress': progressBaseline, 'recovery.systemic': recoveryBaseline },
  });

// A judged increase whose training progress went BACKWARDS since it landed.
const increaseThatHurt = () => volumeChange({ weeksAgo: 4, direction: 1, progressBaseline: 1.5 });
// A judged increase that changed nothing: progress was already where it is.
const increaseThatDidNothing = () => volumeChange({ weeksAgo: 4, direction: 1, progressBaseline: -0.5 });

describe('JOB B2: a volume change is judged on performance AND recovery', () => {
  test('the observation contract names both signals, not recovery alone', () => {
    expect(OBSERVE[INTERVENTION_KIND.VOLUME_START].signals)
      .toEqual(['training.progress', 'recovery.systemic']);
  });

  test('IMPROVED requires BOTH: untroubled recovery with nothing to show is not a win', () => {
    const after = {
      training: { execution: { signal: 'good' }, progress: { signal: 'poor', value: -0.5 } },
      recovery: { systemic: { signal: 'good', value: 0 } },
      intent: { goalPhase: 'bulk' },
    };
    const r = classifyOutcome(increaseThatDidNothing(), { after, windowMet: true });
    expect(r.outcome).not.toBe(OUTCOME.IMPROVED);
    expect(r.outcome).toBe(OUTCOME.UNCHANGED);
    // And both good IS the win.
    const bothGood = {
      ...after,
      training: { execution: { signal: 'good' }, progress: { signal: 'good', value: 2 } },
    };
    expect(classifyOutcome(increaseThatDidNothing(), { after: bothGood, windowMet: true }).outcome)
      .toBe(OUTCOME.IMPROVED);
  });

  test('WORSENED is read on the signal that moved, and recovery falling is worse either way', () => {
    const after = {
      training: { execution: { signal: 'good' }, progress: { signal: 'poor', value: -0.5 } },
      recovery: { systemic: { signal: 'good', value: 0 } },
      intent: { goalPhase: 'bulk' },
    };
    const r = classifyOutcome(increaseThatHurt(), { after, windowMet: true });
    expect(r.outcome).toBe(OUTCOME.WORSENED);
    expect(r.because).toBe('training.progress_moved_the_wrong_way');
  });

  test('HISTORICAL COMPATIBILITY: a pre-closure record keeps its single-signal contract', () => {
    // Records carry their own `observe`, so one written before this change is
    // still judged on recovery alone. Nothing re-interprets stored history.
    const old = {
      ...increaseThatHurt(),
      observe: { unit: 'weeks', min: 2, signal: 'recovery.systemic' },
      baselines: null,
      baseline: { key: 'recovery.systemic', value: 0 },
    };
    const after = {
      training: { execution: { signal: 'good' }, progress: { signal: 'poor', value: -0.5 } },
      recovery: { systemic: { signal: 'good', value: 0 } },
      intent: { goalPhase: 'bulk' },
    };
    expect(classifyOutcome(old, { after, windowMet: true }).outcome).toBe(OUTCOME.IMPROVED);
  });
});

describe('JOB B1/B3: the record reaches the NEXT TRAINING DECISION', () => {
  test('BASELINE: with no history this athlete is pushed, escalation included', () => {
    const out = week({});
    expect(out.volumeSignal).toBe(3);
    expect(out.exceededEscalationApplied).toBe(true);
    expect(out.volumeMemoryHeld).toBeNull();
  });

  test('AN INCREASE THAT MADE THINGS WORSE HOLDS THE NEXT ONE', () => {
    const out = week({ prior: [increaseThatHurt()] });
    expect(out.volumeSignal).toBe(0);
    expect(out.volumeMemoryHeld).toBe('last_volume_increase_made_things_worse');
    expect(out.exceededEscalationApplied).toBe(false);
  });

  test('AND THE ATHLETE IS TOLD, in a held decision rather than only a sentence', () => {
    const out = week({ prior: [increaseThatHurt()] });
    const row = out.heldDecisions.find((h) => h.type === 'volume_outcome_memory');
    expect(row).toBeTruthy();
    expect(row.reason).toBe('Training volume held. The last time we added work, your recovery and your lifts went the other way, so we are not asking for more of it this week.');
    expect(row.reason).not.toContain('—');
  });

  test('NO MEMORYLESS REPETITION: an increase that did nothing refuses the extra step', () => {
    const out = week({ prior: [increaseThatDidNothing()] });
    // The evidence-backed push survives - outcome history is evidence, not
    // authority - but the discretionary escalation on top of it does not.
    expect(out.volumeSignal).toBe(2);
    expect(out.exceededEscalationApplied).toBe(false);
    expect(out.volumeEscalationBlocked).toBe(true);
    expect(out.volumeMemoryHeld).toBeNull();
  });

  test('ANTI-OSCILLATION: an increase never reverses a reduction still being observed', () => {
    const recentEase = volumeChange({ weeksAgo: 0.5, direction: -1, progressBaseline: -0.5 });
    const out = week({ prior: [recentEase] });
    expect(out.volumeSignal).toBe(0);
    expect(out.volumeMemoryHeld).toBe('recent_volume_change_still_being_observed');
  });

  test('a very recent INCREASE is not undone either, but is not escalated on top of', () => {
    const recentIncrease = volumeChange({ weeksAgo: 0.5, direction: 1, progressBaseline: -0.5 });
    const out = week({ prior: [recentIncrease] });
    expect(out.volumeSignal).toBe(2);
    expect(out.exceededEscalationApplied).toBe(false);
  });
});

describe('JOB B4: CONFOUNDED NEVER TEACHES', () => {
  test('the athlete stopped training, so nothing is withheld on that history', () => {
    const after = {
      training: { execution: { signal: 'poor' }, progress: { signal: 'unknown', value: null } },
      recovery: { systemic: { signal: 'good', value: 0 } },
      intent: { goalPhase: 'bulk' },
    };
    const r = classifyOutcome(increaseThatHurt(), { after, windowMet: true });
    expect(r.outcome).toBe(OUTCOME.CONFOUNDED);
    expect(r.because).toBe('training_stopped');
    expect(volumeDecisionMemory({
      records: [increaseThatHurt()], after, nowMs: NOW, proposedDirection: 1,
    })).toEqual({ holdIncrease: false, blockEscalation: false, because: null, priorOutcome: OUTCOME.CONFOUNDED });
  });

  test('THE ATHLETE HOLDS THE DIAL THEMSELVES, and that reaches the engine', () => {
    // Not a helper's opinion: manualVolumeMuscles is a runWeeklyCoach input,
    // supplied in production by effectiveLandmarks.getManualVolumeMuscles.
    const held = week({ prior: [increaseThatHurt()] });
    expect(held.volumeSignal).toBe(0);
    const manual = week({ prior: [increaseThatHurt()], manualVolumeMuscles: ['quads'] });
    expect(manual.context.intent.manualVolumeMuscles).toEqual(['quads']);
    expect(manual.volumeSignal).toBe(3);
    expect(manual.volumeMemoryHeld).toBeNull();
  });

  test('a different goal phase teaches nothing about this one', () => {
    const cuttingHistory = { ...increaseThatHurt(), goalPhase: 'cut' };
    const out = week({ prior: [cuttingHistory] });
    expect(out.volumeSignal).toBe(3);
    expect(out.volumeMemoryHeld).toBeNull();
  });
});

describe('SAFETY: the memory can only ever WITHHOLD', () => {
  test('it never manufactures or enlarges a change', () => {
    const noPush = runWeeklyCoach({
      nowMs: NOW,
      checkin: {
        weekStart: NOW - 7 * DAY, energyScore: 2, sorenessScore: 4, stressScore: 4,
        calsAdherence: 'hit', notes: '', trainingPerformance: 'missed',
      },
      morningWeights: weights(80, 0.2),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0, blockE1rmSlopePct: -0.5,
      goalPhase: 'bulk', weeksInPhase: 8, consecutiveOffTargetWeeks: 0,
      lastCalAdjustmentWeeksAgo: 8, currentCalTarget: 3000, currentMaintenanceKcal: 2900,
      recentIntakeAvgKcal: 3010, recentIntakeDaysLogged: 7,
      lastCheckinAt: NOW - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
      priorInterventions: [increaseThatHurt()],
    });
    // A reduction is a reduction: the memory neither blocks nor softens it.
    expect(noPush.volumeSignal).toBeLessThanOrEqual(0);
    expect(noPush.volumeMemoryHeld).toBeNull();
  });

  test('a reduction is never held for a memory reason, whatever the history', () => {
    for (const dir of [-1, 1]) {
      const r = volumeDecisionMemory({
        records: [volumeChange({ weeksAgo: 0.5, direction: dir, progressBaseline: 0 })],
        after: { training: { execution: { signal: 'good' } }, intent: { goalPhase: 'bulk' } },
        nowMs: NOW, proposedDirection: -1,
      });
      expect(r.holdIncrease).toBe(false);
      expect(r.blockEscalation).toBe(false);
    }
  });
});
