/**
 * coachContext.test.js — Campaign 18 jobs 1, 2, 7, 8.
 *
 * FOUNDER LAW (job 2): "Create one authoritative coaching context... DO NOT
 * collapse this into ATHLETE_SCORE = 73."
 *
 * FOUNDER LAW (job 8): "Never turn not logged / not answered / not measured
 * into zero / poor / failed."
 *
 * WHAT THIS SUITE PINS. Every fact carries a positive, a negative and an
 * UNKNOWN control, because the unknown control is the one that keeps the
 * product honest. It also pins the two architectural laws: that no score is
 * produced, and that this module derives none of the statistics it classifies.
 */
import {
  SIGNAL, SOURCE,
  TRAINING_EXECUTION_POOR, MIN_INTAKE_DAYS, MIN_WEIGH_INS, CHECKIN_FRESH_DAYS,
  trainingExecutionFact, trainingProgressFact, systemicRecoveryFact,
  intakeCoverageFact, intakeAdherenceFact, proteinAdherenceFact,
  weightTrendFact, intentFacts, volumeIsUserManaged,
  buildCoachContext, contextFacts,
} from '../coachContext';

const DAY = 86400000;

describe('TRAINING EXECUTION: did they actually run it', () => {
  test('positive: nearly every session completed', () => {
    expect(trainingExecutionFact({ sessionsCompleted: 4, sessionsPlanned: 4 }).signal).toBe(SIGNAL.GOOD);
  });

  test('negative: most sessions missed', () => {
    const f = trainingExecutionFact({ sessionsCompleted: 1, sessionsPlanned: 4 });
    expect(f.signal).toBe(SIGNAL.POOR);
    expect(f.detail).toBe('1 of 4 sessions');
  });

  test('UNKNOWN: no plan to measure against', () => {
    expect(trainingExecutionFact({}).signal).toBe(SIGNAL.UNKNOWN);
    expect(trainingExecutionFact({ sessionsCompleted: 1, sessionsPlanned: 1 }).signal).toBe(SIGNAL.UNKNOWN);
  });

  test('imperfect is not poor: a missed session still tested the plan', () => {
    const ratio = (TRAINING_EXECUTION_POOR + 0.8) / 2;
    expect(ratio).toBeGreaterThan(TRAINING_EXECUTION_POOR);
    expect(trainingExecutionFact({ sessionsCompleted: 3, sessionsPlanned: 4 }).signal).toBe(SIGNAL.GOOD);
  });
});

describe('TRAINING PROGRESS: an unrun block reports nothing', () => {
  const run = trainingExecutionFact({ sessionsCompleted: 4, sessionsPlanned: 4 });
  const unrun = trainingExecutionFact({ sessionsCompleted: 1, sessionsPlanned: 4 });

  test('positive: a rising block slope', () => {
    expect(trainingProgressFact({ blockE1rmSlopePct: 1.4, execution: run }).signal).toBe(SIGNAL.GOOD);
  });

  test('negative: a falling block slope on a programme that WAS run', () => {
    expect(trainingProgressFact({ blockE1rmSlopePct: -0.8, execution: run }).signal).toBe(SIGNAL.POOR);
  });

  test('THE GUARD THAT MATTERS: the same falling slope on an UNRUN block is unknown', () => {
    // A flat line produced by absence is not a flat line produced by effort.
    const f = trainingProgressFact({ blockE1rmSlopePct: -0.8, execution: unrun });
    expect(f.signal).toBe(SIGNAL.UNKNOWN);
    expect(f.detail).toMatch(/not enough training completed/);
  });

  test('no PRs is UNKNOWN, not poor: one quiet week is not a verdict', () => {
    expect(trainingProgressFact({ prsThisWeek: 0, execution: run }).signal).toBe(SIGNAL.UNKNOWN);
    expect(trainingProgressFact({ prsThisWeek: 2, execution: run }).signal).toBe(SIGNAL.GOOD);
  });
});

describe('RECOVERY: no answer is not "no pain"', () => {
  test('positive: energy and soreness in range', () => {
    const f = systemicRecoveryFact({ hasCheckin: true, energyScore: 4, sorenessScore: 2 });
    expect(f.signal).toBe(SIGNAL.GOOD);
    expect(f.scope).toBe('systemic');
  });

  test('negative: low energy', () => {
    expect(systemicRecoveryFact({ hasCheckin: true, energyScore: 2 }).signal).toBe(SIGNAL.POOR);
  });

  test('UNKNOWN: the check-in was never answered', () => {
    const f = systemicRecoveryFact({ hasCheckin: false });
    expect(f.signal).toBe(SIGNAL.UNKNOWN);
    expect(f.detail).toMatch(/no check-in answered/);
  });

  test('UNKNOWN: an answered check-in that has gone stale stops describing today', () => {
    const now = 1_800_000_000_000;
    const f = systemicRecoveryFact({
      hasCheckin: true, energyScore: 4, lastCheckinAt: now - (CHECKIN_FRESH_DAYS + 1) * DAY, nowMs: now,
    });
    expect(f.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('the SCOPE travels with the fact, so a receipt cannot lose it', () => {
    expect(systemicRecoveryFact({ hasCheckin: false }).scope).toBe('systemic');
  });
});

describe('NUTRITION: coverage and adherence are different questions', () => {
  test('UNKNOWN coverage: a thin diary says so', () => {
    const c = intakeCoverageFact({ recentIntakeDaysLogged: MIN_INTAKE_DAYS - 1 });
    expect(c.signal).toBe(SIGNAL.UNKNOWN);
    expect(c.value).toBe(MIN_INTAKE_DAYS - 1);
  });

  test('UNKNOWN coverage: a FAILED read is not an empty diary', () => {
    const c = intakeCoverageFact({ recentIntakeDaysLogged: 7, intakeReadFailed: true });
    expect(c.signal).toBe(SIGNAL.UNKNOWN);
    expect(c.detail).toMatch(/could not read/);
  });

  test('THE CASE THAT MATTERS: three logged days is insufficient evidence, NOT poor nutrition', () => {
    const coverage = intakeCoverageFact({ recentIntakeDaysLogged: 3 });
    const intake = intakeAdherenceFact({ coverage, recentIntakeAvgKcal: 1200, targetKcal: 3000 });
    // Measured intake was miles under target - and we still refuse to call it
    // poor, because three days cannot support the claim.
    expect(intake.signal).toBe(SIGNAL.UNKNOWN);
    expect(intake.signal).not.toBe(SIGNAL.POOR);
  });

  test('positive: measured intake close to target, from a covered week', () => {
    const coverage = intakeCoverageFact({ recentIntakeDaysLogged: 6 });
    const f = intakeAdherenceFact({ coverage, recentIntakeAvgKcal: 2950, targetKcal: 3000 });
    expect(f.signal).toBe(SIGNAL.GOOD);
    expect(f.direction).toBe(0);
    expect(f.source).toBe(SOURCE.FOOD_ROLLUPS);
  });

  test('negative: measured intake well under target, and the DIRECTION is recorded', () => {
    const coverage = intakeCoverageFact({ recentIntakeDaysLogged: 6 });
    const f = intakeAdherenceFact({ coverage, recentIntakeAvgKcal: 2400, targetKcal: 3000 });
    expect(f.signal).toBe(SIGNAL.POOR);
    expect(f.direction).toBe(-1);
  });

  test('the DIARY outranks the self-report: a measurement beats a memory', () => {
    const coverage = intakeCoverageFact({ recentIntakeDaysLogged: 6 });
    const f = intakeAdherenceFact({
      coverage, recentIntakeAvgKcal: 2980, targetKcal: 3000, calsAdherence: 'under',
    });
    expect(f.signal).toBe(SIGNAL.GOOD);
    expect(f.source).toBe(SOURCE.FOOD_ROLLUPS);
  });

  test('the self-report is used only when the diary cannot answer', () => {
    const coverage = intakeCoverageFact({ recentIntakeDaysLogged: 1 });
    const f = intakeAdherenceFact({ coverage, calsAdherence: 'under' });
    expect(f.signal).toBe(SIGNAL.POOR);
    expect(f.direction).toBe(-1);
    expect(f.source).toBe(SOURCE.CHECKIN);
  });

  test('untracked with no diary is UNKNOWN, and carries no direction', () => {
    const coverage = intakeCoverageFact({ recentIntakeDaysLogged: 0 });
    const f = intakeAdherenceFact({ coverage, calsAdherence: 'untracked' });
    expect(f.signal).toBe(SIGNAL.UNKNOWN);
    expect(f.direction).toBe(0);
  });

  test('protein refuses without coverage too', () => {
    const thin = intakeCoverageFact({ recentIntakeDaysLogged: 2 });
    expect(proteinAdherenceFact({ coverage: thin, recentProteinAvgG: 90, targetProteinG: 180 }).signal)
      .toBe(SIGNAL.UNKNOWN);
    const full = intakeCoverageFact({ recentIntakeDaysLogged: 7 });
    expect(proteinAdherenceFact({ coverage: full, recentProteinAvgG: 175, targetProteinG: 180 }).signal)
      .toBe(SIGNAL.GOOD);
  });
});

describe('WEIGHT: sparse weigh-ins are uncertainty, not a flat trend', () => {
  test('UNKNOWN: too few readings', () => {
    const f = weightTrendFact({ ratePctPerWeek: 0.0, weighInCount: MIN_WEIGH_INS - 1, onTarget: false });
    expect(f.signal).toBe(SIGNAL.UNKNOWN);
    expect(f.detail).toMatch(/not enough for a trend/);
  });

  test('UNKNOWN: readings but no rate at all', () => {
    expect(weightTrendFact({ ratePctPerWeek: null, weighInCount: 10, onTarget: true }).signal)
      .toBe(SIGNAL.UNKNOWN);
  });

  test('UNKNOWN: a rate with no intended direction to judge it against', () => {
    expect(weightTrendFact({ ratePctPerWeek: 0.3, weighInCount: 10, onTarget: null }).signal)
      .toBe(SIGNAL.UNKNOWN);
  });

  test('positive and negative once there is enough to say', () => {
    expect(weightTrendFact({ ratePctPerWeek: 0.3, weighInCount: 10, onTarget: true }).signal).toBe(SIGNAL.GOOD);
    expect(weightTrendFact({ ratePctPerWeek: 0.0, weighInCount: 10, onTarget: false }).signal).toBe(SIGNAL.POOR);
  });
});

describe('INTENT is an instruction, not a signal', () => {
  test('it carries no GOOD/POOR reading, because there is nothing to judge', () => {
    const i = intentFacts({ manualVolumeMuscles: ['chest'], excludedExerciseIds: ['ex-1'] });
    expect(i.signal).toBeUndefined();
    expect(i.source).toBe(SOURCE.USER_CHOICE);
  });

  test('a lane the user manages is visible to every consumer', () => {
    const ctx = buildCoachContext({ intent: { manualVolumeMuscles: ['chest'] } });
    expect(volumeIsUserManaged(ctx, 'chest')).toBe(true);
    expect(volumeIsUserManaged(ctx, 'back')).toBe(false);
  });

  test('a RELEASED choice is simply absent, not remembered as a lingering preference', () => {
    const ctx = buildCoachContext({ intent: { manualVolumeMuscles: [] } });
    expect(ctx.intent.manualVolumeMuscles).toEqual([]);
    expect(volumeIsUserManaged(ctx, 'chest')).toBe(false);
  });
});

describe('THE CONTEXT ITSELF', () => {
  const rich = () => buildCoachContext({
    training: { sessionsCompleted: 4, sessionsPlanned: 4, blockE1rmSlopePct: 1.2 },
    recovery: { hasCheckin: true, energyScore: 4, sorenessScore: 2 },
    nutrition: { recentIntakeDaysLogged: 6, recentIntakeAvgKcal: 2980, targetKcal: 3000 },
    weight: { ratePctPerWeek: 0.3, weighInCount: 10, onTarget: true, shortfall: 0 },
    intent: { goalPhase: 'bulk' },
  });

  test('NO MASTER SCORE: nothing in the context is an aggregate number', () => {
    const ctx = rich();
    expect(ctx.score).toBeUndefined();
    expect(ctx.athleteScore).toBeUndefined();
    expect(ctx.overall).toBeUndefined();
    // And no top-level verdict either: the context describes, it does not rule.
    expect(ctx.verdict).toBeUndefined();
  });

  test('the source-level ban on a score is checkable, not just a comment', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../coachContext.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/athleteScore|overallScore|compositeScore|totalScore/i);
  });

  test('IT DUPLICATES NO AUTHORITY: no trend, floor or e1RM maths lives here', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../coachContext.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/computeEWMA|robustEwma|computeFFMFloor|epley|e1rm\s*=/i);
    // Pure: no database, no store, no clock of its own.
    expect(code).not.toMatch(/Date\.now\(\)|require\(|from '\.\/database'/);
  });

  test('every fact is flattenable with its provenance intact', () => {
    const facts = contextFacts(rich());
    expect(facts.length).toBeGreaterThanOrEqual(6);
    for (const f of facts) {
      expect(Object.values(SIGNAL)).toContain(f.signal);
      expect(f.key).toMatch(/^(training|recovery|nutrition|weight)\./);
    }
    // Intent is excluded: an instruction is not a fact with a signal.
    expect(facts.some((f) => f.key.startsWith('intent'))).toBe(false);
  });

  test('AN EMPTY ATHLETE IS ALL UNKNOWN, and nothing reads as poor', () => {
    const ctx = buildCoachContext({});
    for (const f of contextFacts(ctx)) {
      expect(f.signal).toBe(SIGNAL.UNKNOWN);
    }
  });

  test('THE DAY LAW: no weekday concept exists anywhere in this module', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../coachContext.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/trainingDay|restDay|getDay\(\)|weekday|Monday|refeed|carbCycl/i);
  });
});
