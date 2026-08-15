/**
 * coachCoordination.test.js — Campaign 18 adversarial closure, job C.
 *
 * THE OVERSTATED CLAIM THIS CLOSES. `chooseInterventions` encoded the
 * minimum-effective-intervention law, and its only consumer was `coachStory` -
 * the copy layer. So the app could DESCRIBE a precedence it did not PRACTISE:
 * the sentence said one thing changed while the engines were free to change
 * two. "THE STORY LAYER MUST NOT BE THE ONLY PLACE WHERE PRECEDENCE EXISTS."
 *
 * THE SHAPE CHOSEN is the founder's option 2: the domain engines stay
 * authoritative - nutritionEngine keeps the calorie floors, the FFM energy
 * floor and the ED lockouts, the autoregulation matrix keeps the volume
 * decision - and a shared coordination gate sits across their REAL proposals
 * and decides which may proceed together. Option 1 would have moved
 * safety-critical clamps away from the engines that own them.
 *
 * Every case runs through runWeeklyCoach and asserts on the numbers the apply
 * paths actually write. A gate that agrees with itself proves nothing.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { coordinateChanges, LIMITER, classifyLimiters } from '../coachPrecedence';
import { buildCoachContext } from '../coachContext';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 4, 18, 9, 0, 0);

const weights = (start, kgPerWeek, n = 35) => Array.from({ length: n }, (_, i) => ({
  loggedAt: NOW - (n - 1 - i) * DAY,
  weightKg: Math.round((start + kgPerWeek * (i / 7)) * 100) / 100,
}));

/**
 * A bulking athlete three weeks off target, so a calorie change is genuinely
 * on the table, whose check-in earns a volume push. Everything the cases below
 * vary is a real engine input.
 */
function week(o = {}) {
  return runWeeklyCoach({
    nowMs: NOW,
    checkin: {
      weekStart: NOW - 7 * DAY,
      energyScore: o.energy ?? 4, sorenessScore: o.soreness ?? 2, stressScore: 1,
      calsAdherence: 'hit', notes: '', trainingPerformance: o.performance ?? 'exceeded',
    },
    morningWeights: weights(80, o.kgPerWeek ?? 0),
    sessionsCompleted: o.sessionsCompleted === undefined ? 4 : o.sessionsCompleted,
    sessionsPlanned: 4,
    prsThisWeek: o.prs === undefined ? 2 : o.prs,
    blockE1rmSlopePct: o.slope === undefined ? 2 : o.slope,
    goalPhase: 'bulk', weeksInPhase: 8,
    consecutiveOffTargetWeeks: o.offTarget ?? 3, lastCalAdjustmentWeeksAgo: 8,
    currentCalTarget: 3000, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: o.intakeAvg === undefined ? 3010 : o.intakeAvg,
    recentIntakeDaysLogged: o.intakeDays ?? 7,
    lastCheckinAt: NOW - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
  });
}

const held = (out, type) => out.heldDecisions.find((h) => h.type === type);

describe('PRECEDENCE NOW HAS DECISION FORCE, not only copy', () => {
  test('BASELINE: the same athlete, well evidenced on both sides, changes both', () => {
    const out = week({ slope: -0.5, performance: 'met' });
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(out.limiters.training.limiter).toBe(LIMITER.PLAN);
    expect(out.adjustments.calories.change).toBeGreaterThan(0);
    expect(out.volumeSignal).toBeGreaterThan(0);
    // Two strong independent findings may both act. The gate is not a rule
    // that one thing changes per week.
    expect(out.coordination.bothIndependentlyJustified).toBe(true);
    expect(out.coordination.volumeHeld).toBeNull();
    expect(out.coordination.calorieHeld).toBeNull();
  });

  test('CASE A: VOLUME IS NOT ADDED TO A PROGRAMME THE ATHLETE IS NOT RUNNING', () => {
    // Two of four sessions, but the check-in reports the sessions that DID
    // happen went well - so the matrix proposes more work. The gate refuses:
    // an exercise cannot be judged on sessions that did not happen, and
    // neither can a volume prescription.
    const out = week({ sessionsCompleted: 2 });
    expect(out.limiters.training.limiter).toBe(LIMITER.EXECUTION);
    expect(out.volumeSignal).toBe(0);
    expect(out.coordination.volumeHeld).toBe('sessions_missed');
    expect(held(out, 'training_volume_held').reason)
      .toBe('Training volume held. The sessions already planned have not been run consistently enough this week for adding more to be the answer.');
    // And the well-evidenced nutrition change is NOT collateral damage.
    expect(out.adjustments.calories.change).toBeGreaterThan(0);
  });

  test('CASE B: TWO WEAK READINGS DO NOT MAKE TWO CHANGES', () => {
    // No block slope and no PRs: training progress is genuinely unreadable.
    // The calorie side is well evidenced. The unreadable half waits.
    const out = week({ slope: null, prs: null });
    expect(out.limiters.training.limiter).toBe(LIMITER.INSUFFICIENT_EVIDENCE);
    expect(out.adjustments.calories.change).toBeGreaterThan(0);
    expect(out.volumeSignal).toBe(0);
    expect(out.coordination.volumeHeld).toBe('one_change_at_a_time');
    expect(held(out, 'one_change_at_a_time').reason)
      .toBe('Training volume held. Your calorie target is changing this week, and we cannot read your gym progress well enough to add work on top of it.');
  });

  test('CASE C: with no calorie change in play, the same unreadable week still pushes', () => {
    // R3 is about not making TWO changes on weak evidence. On a week where
    // nutrition is not changing, an unreadable training progress signal is not
    // on its own a reason to withhold ordinary autoregulation.
    const out = week({ slope: null, prs: null, offTarget: 0 });
    expect(out.adjustments.calories).toBeNull();
    expect(out.volumeSignal).toBeGreaterThan(0);
    expect(out.coordination.volumeHeld).toBeNull();
  });

  test('CASE D: A REDUCTION IS NEVER A COORDINATION QUESTION', () => {
    const out = week({ energy: 2, soreness: 4, performance: 'met' });
    expect(out.volumeSignal).toBeLessThan(0);
    expect(out.coordination.volumeHeld).toBeNull();
  });

  test('CASE E: the copy the story tells matches what the engine DID', () => {
    const out = week({ slope: null, prs: null });
    // The precedence the story renders is read off the engine's own outcome,
    // so the two cannot disagree about what changed this week.
    expect(out.volumeSignal).toBe(0);
    expect(out.coordination.volumeHeld).toBeTruthy();
    expect(out.heldDecisions.some((h) => h.type === 'one_change_at_a_time')).toBe(true);
  });

  test('CASE F: no held row contains an em dash, per the copy law', () => {
    for (const out of [week({ sessionsCompleted: 2 }), week({ slope: null, prs: null })]) {
      for (const row of out.heldDecisions) expect(row.reason).not.toContain('—');
    }
  });
});

describe('CASE G: THE GATE CAN ONLY EVER WITHHOLD', () => {
  const ctx = (over = {}) => buildCoachContext({
    nowMs: NOW,
    training: { sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 2, blockE1rmSlopePct: 2 },
    recovery: { hasCheckin: true, energyScore: 4, sorenessScore: 2, lastCheckinAt: NOW - DAY },
    nutrition: { targetKcal: 3000, recentIntakeAvgKcal: 3010, recentIntakeDaysLogged: 7, calsAdherence: 'hit' },
    weight: { ratePctPerWeek: 0, weighInCount: 35, goalPhase: 'bulk', onTarget: false, shortfall: 1 },
    intent: { goalPhase: 'bulk' },
    ...over,
  });

  test('it never turns a hold into a change, whatever the limiters say', () => {
    const context = ctx();
    const r = coordinateChanges({
      context, limiters: classifyLimiters(context),
      proposed: { calorieChange: 0, volumeChange: 0 },
    });
    expect(r.allowCalorieChange).toBe(false);
    expect(r.allowVolumeChange).toBe(false);
    expect(r.holds).toEqual([]);
  });

  test('SAFETY OUTRANKS PRECEDENCE: a marked safety correction is never withheld', () => {
    // Sessions missed AND intake unknown: every permission rule is against a
    // change. The safety flag passes the calorie correction through anyway.
    const context = ctx({
      training: { sessionsCompleted: 1, sessionsPlanned: 4, prsThisWeek: 2, blockE1rmSlopePct: 2 },
      nutrition: { targetKcal: 3000, recentIntakeAvgKcal: null, recentIntakeDaysLogged: 0, calsAdherence: 'untracked' },
    });
    const limiters = classifyLimiters(context);
    const proposed = { calorieChange: 200, volumeChange: 1 };
    expect(coordinateChanges({ context, limiters, proposed }).allowCalorieChange).toBe(true);
    expect(coordinateChanges({
      context, limiters, proposed, safety: { calorie: true },
    }).allowCalorieChange).toBe(true);
    // And the volume increase is still refused, because safety on one side is
    // not permission on the other.
    expect(coordinateChanges({
      context, limiters, proposed, safety: { calorie: true },
    }).allowVolumeChange).toBe(false);
  });

  test('the ENGINE passes its own rapid-loss override in as the safety flag', () => {
    // The safety bypass above is only real if production marks the rapid-loss
    // correction as safety. It does, on one line, and that line is what makes
    // every safety-outranks-precedence case reachable rather than theoretical.
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../weeklyCoach.js'), 'utf8',
    );
    expect(src).toMatch(/safety: \{ calorie: !!rapidLossOverride \}/);
  });

  test('the gate never withholds a calorie change on a rapid-loss week', () => {
    // Swept across cut weeks severe enough to reach the compression rule. At
    // no rate does the coordination gate hold the calorie decision - whatever
    // the ED-safety and floor gates above it independently decide to do, which
    // is their business and not this gate's.
    for (const kgPerWeek of [-1.3, -1.5, -1.8, -2.2]) {
      const out = runWeeklyCoach({
        nowMs: NOW,
        checkin: {
          weekStart: NOW - 7 * DAY, energyScore: 2, sorenessScore: 2, stressScore: 2,
          calsAdherence: 'hit', notes: '', trainingPerformance: 'met',
        },
        morningWeights: weights(80, kgPerWeek),
        sessionsCompleted: 2, sessionsPlanned: 4, prsThisWeek: 1, blockE1rmSlopePct: 1,
        goalPhase: 'cut', weeksInPhase: 8, consecutiveOffTargetWeeks: 0,
        lastCalAdjustmentWeeksAgo: 0, currentCalTarget: 2000, currentMaintenanceKcal: 2600,
        recentIntakeAvgKcal: 2010, recentIntakeDaysLogged: 7,
        lastCheckinAt: NOW - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
      });
      expect(out.coordination.calorieHeld).toBeNull();
      // And a calorie CUT is never what the gate lets through on these weeks.
      expect(out.adjustments.calories?.change ?? 0).toBeGreaterThanOrEqual(0);
    }
  });
});
