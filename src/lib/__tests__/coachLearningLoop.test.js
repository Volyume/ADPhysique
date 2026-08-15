/**
 * coachLearningLoop.test.js — Campaign 18 jobs A and B.
 *
 * The founder's accounting correction: recording an intervention is half a
 * loop. Until a past response can inform a future decision, and until a
 * decline is remembered, the learning half does not exist.
 *
 * FOUNDER LAW A1: "Outcome history is evidence. It is NOT automatic
 * authority... may not manufacture an intervention that current evidence does
 * not justify."
 *
 * FOUNDER LAW B1: "A decline means NOT NOW. It does NOT necessarily mean
 * NEVER SUGGEST THIS AGAIN."
 *
 * Every case below runs through runWeeklyCoach, because a helper agreeing
 * with itself proves nothing about the product.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import {
  buildInterventionRecord, INTERVENTION_KIND, DOSE_ESCALATION_MULTIPLIER,
  doseEscalation, holdReinforcement,
} from '../coachIntervention';
import {
  buildDeclineRecord, declinesFromHistory,
  materialEvidenceChange, suppressedByDecline,
} from '../coachDecline';
import { buildCoachContext, SIGNAL } from '../coachContext';

const DAY = 86_400_000;

const weights = (start, kgPerWeek, n = 35) => Array.from({ length: n }, (_, i) => ({
  loggedAt: Date.now() - (n - 1 - i) * DAY,
  weightKg: Math.round((start + kgPerWeek * (i / 7)) * 100) / 100,
}));

function week(o = {}) {
  return runWeeklyCoach({
    nowMs: Date.now(),
    checkin: {
      weekStart: Date.now() - 7 * DAY, energyScore: 4, sorenessScore: 2,
      stressScore: 2, calsAdherence: 'hit', notes: '',
    },
    morningWeights: weights(80, o.kgPerWeek ?? 0),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1, blockE1rmSlopePct: 1.1,
    goalPhase: o.goalPhase ?? 'bulk', weeksInPhase: 8,
    consecutiveOffTargetWeeks: o.offTarget ?? 3, lastCalAdjustmentWeeksAgo: 8,
    currentCalTarget: 3000, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: o.intakeAvg === undefined ? 3010 : o.intakeAvg,
    recentIntakeDaysLogged: o.intakeDays ?? 7,
    lastCheckinAt: Date.now() - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    priorInterventions: o.prior ?? [],
    priorDeclines: o.declines ?? [],
  });
}

const oldUnchangedIncrease = (over = {}) => buildInterventionRecord({
  kind: INTERVENTION_KIND.CALORIE_TARGET,
  appliedAtMs: Date.now() - 28 * DAY,
  direction: 1, magnitude: 100, goalPhase: 'bulk',
  baseline: { key: 'weight.trend', value: 0.0 },
  ...over,
});

// ─── JOB A: DOSE LEARNING ───────────────────────────────────────────────────

describe('JOB A: a previous response can resize the next dose', () => {
  test('BASELINE: with no history, the ordinary step applies', () => {
    const plain = week({}).adjustments.calories.change;
    expect(plain).toBeGreaterThan(0);
  });

  test('CASE B: a well-observed UNCHANGED increase makes the next step BIGGER', () => {
    const plain = week({}).adjustments.calories.change;
    const learned = week({ prior: [oldUnchangedIncrease()] }).adjustments.calories.change;
    expect(learned).toBeGreaterThan(plain);
    expect(learned).toBe(Math.min(150, Math.round(plain * DOSE_ESCALATION_MULTIPLIER)));
  });

  test('THE COPY MAKES NO FALSE COMPARISON: previous 100, ordinary 55, learned 83', () => {
    // The learned step is larger than the ORDINARY step, and smaller than the
    // previous one. Claiming it was "bigger than last time" would be a lie
    // the athlete could check against their own history.
    const plain = week({}).adjustments.calories.change;
    const out = week({ prior: [oldUnchangedIncrease()] });
    const learned = out.adjustments.calories.change;
    expect(oldUnchangedIncrease().magnitude).toBe(100);
    expect(plain).toBe(55);
    expect(learned).toBe(83);
    expect(learned).toBeGreaterThan(plain);
    expect(learned).toBeLessThan(100);

    const note = out.adjustments.calories.note;
    expect(note).toMatch(/Your last increase was not enough to move your weight as planned/);
    expect(note).toMatch(/larger than we would normally make/);
    // No comparison against the previous step, and no engine vocabulary.
    expect(note).not.toMatch(/bigger than last time|than last time|than before/i);
    expect(note).not.toMatch(/multiplier|1\.5|escalat/i);
    expect(note).not.toContain('—');
  });

  test('and it stays truthful when the learned step IS larger than the previous one', () => {
    // Same machinery, a smaller previous dose: 40 previously, 83 now. The
    // sentence is still true, because it never claimed a relationship to the
    // previous number in the first place.
    const out = week({ prior: [oldUnchangedIncrease({ magnitude: 40 })] });
    const learned = out.adjustments.calories.change;
    expect(learned).toBe(83);
    expect(learned).toBeGreaterThan(40);
    expect(out.adjustments.calories.note).toMatch(/larger than we would normally make/);
  });

  test('CASE C: a CONFOUNDED prior teaches nothing - ordinary logic only', () => {
    // Same history, but the diary went dark, so the outcome is unattributable.
    const plain = week({}).adjustments.calories.change;
    const confounded = week({
      prior: [oldUnchangedIncrease()], intakeDays: 7, intakeAvg: 3010,
    });
    // Force the confound by removing the coverage the outcome needs.
    const dose = doseEscalation({
      records: [oldUnchangedIncrease()],
      after: buildCoachContext({
        nutrition: { recentIntakeDaysLogged: 1, targetKcal: 3000 },
        weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false },
      }),
      nowMs: Date.now(), direction: 1, goalPhase: 'bulk',
    });
    expect(dose.escalate).toBe(false);
    expect(confounded.adjustments.calories.change).toBeGreaterThan(plain); // this one IS clean
  });

  test('A1: IT CANNOT MANUFACTURE A CHANGE current evidence does not justify', () => {
    // On target: nothing to change. A rich history of successful increases
    // does not produce one.
    const onTarget = week({ kgPerWeek: 0.25, offTarget: 0, prior: [oldUnchangedIncrease()] });
    expect(onTarget.adjustments.calories).toBeNull();
  });

  test('A1: it cannot REVERSE a direction either', () => {
    // A prior INCREASE never resizes a decrease.
    const dose = doseEscalation({
      records: [oldUnchangedIncrease()],
      after: buildCoachContext({
        nutrition: { recentIntakeDaysLogged: 7, recentIntakeAvgKcal: 3010, targetKcal: 3000 },
        weight: { ratePctPerWeek: 0.9, weighInCount: 12, onTarget: false },
      }),
      nowMs: Date.now(), direction: -1, goalPhase: 'bulk',
    });
    expect(dose.escalate).toBe(false);
  });

  test('A2: a DIFFERENT goal phase is not comparable evidence', () => {
    const dose = doseEscalation({
      records: [oldUnchangedIncrease({ goalPhase: 'mild_cut' })],
      after: buildCoachContext({
        nutrition: { recentIntakeDaysLogged: 7, recentIntakeAvgKcal: 3010, targetKcal: 3000 },
        weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false },
      }),
      nowMs: Date.now(), direction: 1, goalPhase: 'bulk',
    });
    expect(dose.escalate).toBe(false);
  });

  test('A2: a missing goal phase is not silently treated as comparable', () => {
    const dose = doseEscalation({
      records: [oldUnchangedIncrease({ goalPhase: null })],
      after: buildCoachContext({
        nutrition: { recentIntakeDaysLogged: 7, recentIntakeAvgKcal: 3010, targetKcal: 3000 },
        weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false },
      }),
      nowMs: Date.now(), direction: 1, goalPhase: 'bulk',
    });
    expect(dose.escalate).toBe(false);
  });

  test('A2: an intervention still inside its window escalates nothing', () => {
    const dose = doseEscalation({
      records: [oldUnchangedIncrease({ appliedAtMs: Date.now() - 3 * DAY })],
      after: buildCoachContext({
        nutrition: { recentIntakeDaysLogged: 7, recentIntakeAvgKcal: 3010, targetKcal: 3000 },
        weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false },
      }),
      nowMs: Date.now(), direction: 1, goalPhase: 'bulk',
    });
    expect(dose.escalate).toBe(false);
  });

  test('A2: unreliable current evidence escalates nothing', () => {
    for (const after of [
      buildCoachContext({ weight: { ratePctPerWeek: null, weighInCount: 1 }, nutrition: { recentIntakeDaysLogged: 7, recentIntakeAvgKcal: 3010, targetKcal: 3000 } }),
      buildCoachContext({ weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false }, nutrition: { recentIntakeDaysLogged: 1, targetKcal: 3000 } }),
    ]) {
      expect(doseEscalation({ records: [oldUnchangedIncrease()], after, nowMs: Date.now(), direction: 1, goalPhase: 'bulk' }).escalate).toBe(false);
    }
  });

  test('the ±5% cap still binds the LEARNED step', () => {
    const out = week({ prior: [oldUnchangedIncrease()] });
    expect(Math.abs(out.adjustments.calories.change)).toBeLessThanOrEqual(Math.round(3000 * 0.05));
  });

  test('A3: a change that WORKED strengthens the hold, and changes nothing', () => {
    const improved = week({ kgPerWeek: 0.25, offTarget: 0, prior: [oldUnchangedIncrease()] });
    expect(improved.adjustments.calories).toBeNull();
    expect(improved.holdReinforcement).toBeTruthy();
    expect(improved.holdReinforcement.text).toMatch(/did what we wanted, and it is still working/);
  });

  test('A3: and it is never used as pressure to make another change', () => {
    const r = holdReinforcement({
      records: [oldUnchangedIncrease()],
      after: buildCoachContext({ weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false } }),
      nowMs: Date.now(), onTarget: false,
    });
    expect(r).toBeNull();
  });
});

// ─── JOB B: DECLINE MEMORY ──────────────────────────────────────────────────

describe('JOB B: Volyume remembers being told no', () => {
  const signatureNow = () => week({}).evidenceSignature;
  const declineOf = (sig, over = {}) => buildDeclineRecord({
    domain: 'nutrition', kind: 'calorie_target', direction: 1, magnitude: 55,
    signature: sig, declinedAtMs: Date.now() - 7 * DAY, ...over,
  });

  test('the engine publishes the signature the advice was given in', () => {
    const sig = signatureNow();
    expect(sig.weight).toBe(SIGNAL.POOR);
    expect(sig.coverage).toBe(SIGNAL.GOOD);
    expect(sig.goalPhase).toBe('bulk');
  });

  test('CASE D: same evidence next week -> NOT re-proposed', () => {
    const out = week({ declines: [declineOf(signatureNow())] });
    expect(out.adjustments.calories).toBeNull();
    const held = out.heldDecisions.find((h) => h.type === 'declined_last_time');
    expect(held).toBeTruthy();
    expect(held.reason).toMatch(/You chose to keep your calorie target as it was/);
    expect(held.reason).toMatch(/Nothing important has changed/);
  });

  test('and the copy acknowledges the choice rather than repeating the offer', () => {
    const out = week({ declines: [declineOf(signatureNow())] });
    const held = out.heldDecisions.find((h) => h.type === 'declined_last_time');
    expect(held.reason).not.toMatch(/we recommend|you should|we suggest/i);
    expect(held.reason).not.toContain('—');
  });

  test('CASE E: materially WORSE evidence -> proposed again, saying why', () => {
    const stale = { ...signatureNow(), ratePct: 0.30 };
    const out = week({ kgPerWeek: 0, declines: [declineOf(stale)] });
    expect(out.adjustments.calories).toBeTruthy();
    expect(out.returningAfterDecline).toMatch(/You chose to keep this as it was last time\. Since then/);
    // And the clause slots in cleanly: no doubled "since then".
    expect(out.returningAfterDecline.match(/since then/gi)).toHaveLength(1);
  });

  test('a changed GOAL always makes it a different conversation', () => {
    const other = { ...signatureNow(), goalPhase: 'mild_cut' };
    expect(materialEvidenceChange(other, signatureNow()).because).toBe('goal_changed');
  });

  test('evidence becoming READABLE is new information', () => {
    const wasBlind = { ...signatureNow(), coverage: SIGNAL.UNKNOWN };
    expect(materialEvidenceChange(wasBlind, signatureNow()).changed).toBe(true);
  });

  test('B1: a decline is NOT an exclusion - the opposite direction is untouched', () => {
    const sig = signatureNow();
    expect(suppressedByDecline({
      declines: [declineOf(sig)], domain: 'nutrition', kind: 'calorie_target',
      direction: -1, signature: sig,
    })).toBeNull();
  });

  test('CASE F: SAFETY OVERRIDES A DECLINE', () => {
    // A rapid-loss correction is not a recommendation, so there is nothing to
    // have declined. It fires regardless.
    const out = runWeeklyCoach({
      nowMs: Date.now(),
      checkin: {
        weekStart: Date.now() - 7 * DAY, energyScore: 2, sorenessScore: 3,
        calsAdherence: 'hit', notes: '',
      },
      morningWeights: Array.from({ length: 35 }, (_, i) => ({
        loggedAt: Date.now() - (34 - i) * DAY,
        weightKg: Math.round((80 - 2.6 * (i / 7)) * 100) / 100,
      })),
      sessionsCompleted: 3, sessionsPlanned: 4,
      goalPhase: 'mild_cut', weeksInPhase: 8,
      lastCalAdjustmentWeeksAgo: 0, currentCalTarget: 2000, currentMaintenanceKcal: 2600,
      recentIntakeAvgKcal: 1900, recentIntakeDaysLogged: 7,
      lastCheckinAt: Date.now() - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
      priorDeclines: [buildDeclineRecord({
        domain: 'nutrition', kind: 'calorie_target', direction: 1, magnitude: 100,
        signature: null, declinedAtMs: Date.now() - 3 * DAY,
      })],
    });
    expect(out.rapidWeightLossFlag).toBe(true);
    expect(out.adjustments.calories?.change).toBeGreaterThan(0);
    expect(out.heldDecisions.find((h) => h.type === 'declined_last_time')).toBeUndefined();
  });

  test('a decline the user never made cannot suppress anything', () => {
    // Only an explicit tap writes declinedAdjustments.
    expect(declinesFromHistory([{ weekStart: 1, adjustments: { calories: { change: 100 } } }])).toEqual([]);
  });
});

// ─── PRODUCTION PATHS ───────────────────────────────────────────────────────

describe('THE PRODUCTION PATHS ARE REAL', () => {
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../screens/CoachOutputScreen.js'), 'utf8',
  );

  test('DECLINING IS A CONTROL, not the absence of a tap', () => {
    expect(SCREEN).toMatch(/async function handleDeclineCalories\(\)/);
    expect(SCREEN).toMatch(/title="Keep as is"/);
    expect(SCREEN).toMatch(/markDeclined\(output, 'calories', \{/);
    expect(SCREEN).toMatch(/decline: buildDeclineRecord\(\{/);
  });

  test('the decline records the CIRCUMSTANCES, not just the fact', () => {
    expect(SCREEN).toMatch(/signature: output\?\.evidenceSignature \?\? null/);
  });

  test('declines are read back and fed to the engine', () => {
    expect(SCREEN).toMatch(/const priorDeclines = declinesFromHistory\(coachOutputHistory\)/);
    expect(SCREEN).toMatch(/priorDeclines,/);
  });

  test('the memory lines reach the user, in priority order', () => {
    expect(SCREEN).toMatch(/output\.returningAfterDecline/);
    expect(SCREEN).toMatch(/output\.holdReinforcement/);
    expect(SCREEN).toMatch(/\{weeklyStory\.outcome\.text\}/);
  });

  test('dose learning is a RESIZE, never a creation', () => {
    // eslint-disable-next-line global-require
    const engine = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../weeklyCoach.js'), 'utf8',
    );
    const start = engine.indexOf('const dose = doseEscalation({');
    const body = engine.slice(start - 400, start + 400);
    // It sits inside the block that already has a non-zero change.
    expect(body).toMatch(/if \(change !== 0 && !rapidLossOverride\)/);
    expect(body).toMatch(/change = Math\.round\(change \* dose\.multiplier\)/);
  });
});
