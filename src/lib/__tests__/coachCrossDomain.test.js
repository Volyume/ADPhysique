/**
 * coachCrossDomain.test.js — Campaign 18 job 4, against the REAL weekly coach.
 *
 * FOUNDER LAW: "Weight trend below desired direction + poor nutrition
 * adherence -> do not reward poor execution with an automatic target increase.
 * Explain that the current target has not really been tested."
 *
 * And the boundary that makes that law safe rather than merely strict:
 * "Use the existing nutrition safety/floor laws. Do not invent a second
 * calorie-adjustment engine."
 *
 * WHAT THIS SUITE PINS. The founder's six cases A-F, each run through
 * runWeeklyCoach itself rather than through the classifier, because the
 * classifier agreeing with itself proves nothing about the product. Plus the
 * safety boundary: the rapid-loss protection is never held by this gate.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { LIMITER } from '../coachPrecedence';
import { SIGNAL } from '../coachContext';

const DAY = 86_400_000;

/** `count` daily weigh-ins ending now, moving at kgPerWeek. */
function weights(startKg, kgPerWeek, count = 35) {
  const t0 = Date.now();
  const weeksSpan = (count - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  return Array.from({ length: count }, (_, i) => ({
    loggedAt: t0 - (count - 1 - i) * DAY,
    weightKg: Math.round((startKg + (endKg - startKg) * (i / (count - 1))) * 100) / 100,
  }));
}

/**
 * A bulking athlete whose weight is FLAT (below the intended gain), with the
 * nutrition evidence varied per case. Everything else is held constant so the
 * only thing moving between cases is what we know about their eating.
 */
function bulker({
  kgPerWeek = 0, intakeAvg = null, intakeDays = 0, calsAdherence = 'hit',
  target = 3000, offTargetWeeks = 3, energyScore = 4, sessions = 4,
} = {}) {
  return runWeeklyCoach({
    nowMs: Date.now(),
    checkin: {
      weekStart: Date.now() - 7 * DAY,
      energyScore, sorenessScore: 2, stressScore: 2,
      calsAdherence, notes: '',
    },
    morningWeights: weights(80, kgPerWeek),
    sessionsCompleted: sessions, sessionsPlanned: 4, prsThisWeek: 1,
    goalPhase: 'bulk', weeksInPhase: 6,
    consecutiveOffTargetWeeks: offTargetWeeks,
    lastCalAdjustmentWeeksAgo: 4,
    currentCalTarget: target,
    currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: intakeAvg,
    recentIntakeDaysLogged: intakeDays,
    lastCheckinAt: Date.now() - DAY,
    bodyweightKg: 80, sex: 'male', units: 'kg',
    stepsEnabled: false,
  });
}

const held = (out, type) => (out.heldDecisions ?? []).find((h) => h.type === type);

describe('CASE A: on-target evidence, real shortfall -> the change is justified', () => {
  test('a bulker who ATE the target and is not gaining gets the increase', () => {
    const out = bulker({ intakeAvg: 3010, intakeDays: 7 });
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(out.adjustments.calories?.change).toBeGreaterThan(0);
    expect(held(out, 'target_not_tested')).toBeUndefined();
  });
});

describe('CASE B: THE LAW - an untested target is not a wrong one', () => {
  const out = () => bulker({ intakeAvg: 2500, intakeDays: 7 });

  test('a bulker who ate 500 kcal under target does NOT get the increase', () => {
    expect(out().adjustments.calories).toBeNull();
  });

  test('and it is classified as EXECUTION, not as a plan failure', () => {
    expect(out().limiters.nutrition.limiter).toBe(LIMITER.EXECUTION);
    expect(out().limiters.nutrition.because).toBe('target_not_eaten');
  });

  test('the user is TOLD the target has not been tried, with the real numbers', () => {
    const h = held(out(), 'target_not_tested');
    expect(h).toBeTruthy();
    expect(h.reason).toContain('2500 kcal');
    expect(h.reason).toContain('3000 kcal');
    expect(h.reason).toMatch(/has not really been tried yet/);
  });

  test('the copy blames the TARGET, not the person', () => {
    const h = held(out(), 'target_not_tested');
    expect(h.reason).not.toMatch(/you failed|you did not try|poor adherence|discipline|lazy/i);
    expect(h.reason).not.toContain('—');
  });

  test('a self-REPORTED under-eat holds it too, but quotes no measured number', () => {
    const o = bulker({ calsAdherence: 'under', intakeAvg: null, intakeDays: 0 });
    expect(o.adjustments.calories).toBeNull();
    const h = held(o, 'target_not_tested');
    expect(h.reason).toMatch(/What you have told us/);
    expect(h.reason).not.toMatch(/\d+ kcal against/);
  });

  test('BUT eating OVER target and still not gaining IS a plan finding', () => {
    // Their maintenance is genuinely higher than we thought. The miss does
    // not explain the outcome, so the change goes through.
    const o = bulker({ intakeAvg: 3400, intakeDays: 7 });
    expect(o.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(o.adjustments.calories?.change).toBeGreaterThan(0);
  });
});

describe('CASE C: gaining as intended -> hold', () => {
  test('no calorie change and no hold reason of ours', () => {
    const out = bulker({ kgPerWeek: 0.25, intakeAvg: 3010, intakeDays: 7, offTargetWeeks: 0 });
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(out.limiters.nutrition.onTarget).toBe(true);
    expect(out.adjustments.calories).toBeNull();
    expect(held(out, 'target_not_tested')).toBeUndefined();
  });
});

describe('CASE D: gaining faster than intended, with reliable intake', () => {
  test('the existing logic may pull the target back', () => {
    const out = bulker({ kgPerWeek: 0.9, intakeAvg: 3010, intakeDays: 7 });
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(out.adjustments.calories?.change).toBeLessThan(0);
  });

  test('and eating well OVER target while gaining too fast is held: untested again', () => {
    const out = bulker({ kgPerWeek: 0.9, intakeAvg: 3600, intakeDays: 7 });
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.EXECUTION);
    expect(out.adjustments.calories).toBeNull();
  });
});

describe('CASE F: sparse evidence is uncertainty, not fake precision', () => {
  test('a thin diary and no self-report leaves nutrition UNKNOWN', () => {
    const out = bulker({ intakeAvg: 2500, intakeDays: 2, calsAdherence: 'untracked' });
    expect(out.context.nutrition.coverage.signal).toBe(SIGNAL.UNKNOWN);
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.INSUFFICIENT_EVIDENCE);
    expect(out.adjustments.calories).toBeNull();
  });

  test('a thin diary never reads as POOR nutrition', () => {
    const out = bulker({ intakeAvg: 1200, intakeDays: 2, calsAdherence: 'untracked' });
    expect(out.context.nutrition.intake.signal).toBe(SIGNAL.UNKNOWN);
    expect(out.context.nutrition.intake.signal).not.toBe(SIGNAL.POOR);
  });

  test('sparse WEIGH-INS leave the trend unknown rather than flat', () => {
    const out = runWeeklyCoach({
      nowMs: Date.now(),
      checkin: { weekStart: Date.now() - 7 * DAY, energyScore: 4, sorenessScore: 2, calsAdherence: 'hit' },
      morningWeights: weights(80, 0, 2),
      sessionsCompleted: 4, sessionsPlanned: 4, goalPhase: 'bulk', weeksInPhase: 6,
      currentCalTarget: 3000, stepsEnabled: false,
    });
    expect(out.context.weight.trend.signal).toBe(SIGNAL.UNKNOWN);
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.INSUFFICIENT_EVIDENCE);
  });
});

describe('SAFETY IS SENIOR: this gate can only ever hold, never permit', () => {
  test('THE EXEMPTION: rapid loss still raises calories even on poor adherence', () => {
    // A protective increase must never wait for evidence of good behaviour.
    const out = runWeeklyCoach({
      nowMs: Date.now(),
      checkin: {
        weekStart: Date.now() - 7 * DAY, energyScore: 2, sorenessScore: 3,
        calsAdherence: 'under', notes: '',
      },
      morningWeights: weights(80, -2.6),
      sessionsCompleted: 3, sessionsPlanned: 4,
      goalPhase: 'mild_cut', weeksInPhase: 6,
      consecutiveOffTargetWeeks: 0, lastCalAdjustmentWeeksAgo: 0,
      currentCalTarget: 2000, currentMaintenanceKcal: 2600,
      recentIntakeAvgKcal: 1500, recentIntakeDaysLogged: 7,
      lastCheckinAt: Date.now() - DAY,
      bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    });
    expect(out.rapidWeightLossFlag).toBe(true);
    expect(out.adjustments.calories?.change).toBeGreaterThan(0);
    expect(held(out, 'target_not_tested')).toBeUndefined();
  });

  test('the gate NEVER creates or enlarges a change', () => {
    // Source-level: the only assignment it makes is to null.
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../weeklyCoach.js'), 'utf8',
    );
    const start = src.indexOf('let targetNotTestedHeld = false;');
    const body = src.slice(start, src.indexOf('// ── FFM FLOOR SAFETY GATE', start));
    expect(body).toMatch(/calorieAdjustment = null;/);
    expect(body).not.toMatch(/calorieAdjustment = \{/);
    expect(body).toMatch(/!rapidLossOverride/);
  });

  test('the floors are untouched: no threshold or floor constant is referenced', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../coachPrecedence.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/1500|1200|computeFFMFloor|floorKcal|30 \* /);
  });
});

describe('THE DAY LAW SURVIVES CAMPAIGN 18', () => {
  test('nothing in the cross-domain path produces a day-specific target', () => {
    for (const file of ['../coachContext.js', '../coachPrecedence.js']) {
      // eslint-disable-next-line global-require
      const src = require('fs').readFileSync(
        // eslint-disable-next-line global-require
        require('path').resolve(__dirname, file), 'utf8',
      );
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/trainingDay|restDay|refeed|carbCycl|dayVariant|getDay\(/i);
    }
  });

  test('the engine still reports ONE target, whatever the training evidence says', () => {
    const trained = bulker({ sessions: 4, intakeAvg: 3010, intakeDays: 7 });
    const rested = bulker({ sessions: 2, intakeAvg: 3010, intakeDays: 7 });
    // Training execution differs; the calorie decision is reached the same way
    // and neither run produces anything day-shaped.
    expect(trained.context.training.execution.signal).not.toBe(rested.context.training.execution.signal);
    expect(trained.adjustments.calories?.change).toBe(rested.adjustments.calories?.change);
  });
});
