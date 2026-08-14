/**
 * coachAdversarial.test.js — Campaign 18 job 20.
 *
 * ATTACK THE FINISHED PRODUCT. Every case below is one the founder named,
 * driven through the REAL engine, and every assertion is one of the ten
 * questions:
 *
 *   1 which evidence authorised this?      6 was the change accepted?
 *   2 was the evidence sufficient?         7 can another consumer disagree?
 *   3 is UNKNOWN becoming negative?        8 is the evidence fresh?
 *   4 is correlation described as cause?   9 does restore preserve state?
 *   5 did the engine make the change?     10 is old memory read as authority?
 *
 * These are not re-proofs of Phase A. They are the hostile combinations that
 * only appear once the whole thing is assembled.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { SIGNAL } from '../coachContext';
import { LIMITER } from '../coachPrecedence';
import { buildCoachStory, storyLines } from '../coachStory';
import {
  buildInterventionRecord, INTERVENTION_KIND, OUTCOME,
  classifyOutcome, interventionsFromHistory, observationWindowMet,
} from '../coachIntervention';
import { systemicRecoveryFact } from '../coachContext';
import { classifyMuscleBlock } from '../interBlock';
import { slotVerdict, SLOT_VERDICT } from '../programmeEpoch';

const DAY = 86_400_000;

const weights = (start, kgPerWeek, n = 35) => Array.from({ length: n }, (_, i) => ({
  loggedAt: Date.now() - (n - 1 - i) * DAY,
  weightKg: Math.round((start + kgPerWeek * (i / 7)) * 100) / 100,
}));

function week(o = {}) {
  return runWeeklyCoach({
    nowMs: Date.now(),
    checkin: o.noCheckin ? null : {
      weekStart: Date.now() - 7 * DAY,
      energyScore: o.energy ?? 4, sorenessScore: o.sore ?? 2, stressScore: 2,
      calsAdherence: o.adherence ?? 'hit', notes: '',
    },
    morningWeights: weights(80, o.kgPerWeek ?? 0.25, o.weighIns ?? 35),
    sessionsCompleted: o.sessions ?? 4, sessionsPlanned: 4, prsThisWeek: o.prs ?? 1,
    blockE1rmSlopePct: o.slope ?? 1.1,
    goalPhase: 'bulk', weeksInPhase: 8,
    consecutiveOffTargetWeeks: o.offTarget ?? 0, lastCalAdjustmentWeeksAgo: o.lastAdj ?? 8,
    currentCalTarget: 3000, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: o.intakeAvg === undefined ? 3010 : o.intakeAvg,
    recentIntakeDaysLogged: o.intakeDays ?? 7,
    lastCheckinAt: o.lastCheckinAt ?? (Date.now() - DAY),
    bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    priorInterventions: o.prior ?? [],
  });
}

const story = (out, changes = {}) => buildCoachStory({
  context: out.context, limiters: out.limiters,
  changes: { calorieKcal: out.adjustments?.calories?.change ?? 0, ...changes },
});
const text = (out, changes) => storyLines(story(out, changes)).join(' ');

describe('ATTACK: sparse diary + poor weight trend', () => {
  const out = week({ kgPerWeek: 0, offTarget: 3, intakeDays: 2, intakeAvg: 1200, adherence: 'untracked' });

  test('Q2/Q3: a starving-looking average from two days does NOT become poor nutrition', () => {
    expect(out.context.nutrition.intake.signal).toBe(SIGNAL.UNKNOWN);
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.INSUFFICIENT_EVIDENCE);
  });

  test('Q5: nothing changed, and the story does not claim anything did', () => {
    expect(out.adjustments.calories).toBeNull();
    expect(story(out).changing).toEqual([]);
  });

  test('Q4: the flat weight is never attributed to the eating', () => {
    expect(text(out)).not.toMatch(/because you ate|your intake (is|was) why|not eating enough is why/i);
  });
});

describe('ATTACK: good diary + poor weight trend', () => {
  const out = week({ kgPerWeek: 0, offTarget: 3, intakeAvg: 3010, intakeDays: 7 });

  test('Q1/Q2: this is the one case that authorises a target change', () => {
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(out.adjustments.calories.change).toBeGreaterThan(0);
  });

  test('Q5/Q6: the story reports the change the engine actually produced', () => {
    const s = story(out);
    expect(s.changing).toHaveLength(1);
    expect(s.changing[0].text).toContain(String(Math.abs(out.adjustments.calories.change)));
  });
});

describe('ATTACK: good training + poor diary', () => {
  const out = week({ intakeDays: 1, intakeAvg: null, adherence: 'untracked' });

  test('Q3: the training verdict is untouched by the missing diary', () => {
    expect(out.context.training.execution.signal).toBe(SIGNAL.GOOD);
    expect(out.limiters.training.limiter).toBe(LIMITER.PLAN);
  });

  test('and nothing nags them into logging', () => {
    expect(text(out)).not.toMatch(/you must log|start logging|log more|you need to track/i);
  });
});

describe('ATTACK: poor training execution + plateau-looking data', () => {
  const out = week({ sessions: 1, slope: -1.4, prs: 0 });

  test('Q3: the plateau-shaped data is UNKNOWN, not a plateau', () => {
    expect(out.context.training.progress.signal).toBe(SIGNAL.UNKNOWN);
    expect(out.limiters.training.limiter).toBe(LIMITER.EXECUTION);
  });

  test('Q5: no exercise may be condemned on it', () => {
    expect(slotVerdict({ plateau: true }, { executionJudgeable: false }).verdict).toBe(SLOT_VERDICT.KEEP);
  });

  test('the story says the programme stays, and why', () => {
    expect(text(out)).toMatch(/not enough sessions this block to judge the programme/i);
  });
});

describe('ATTACK: local soreness + good systemic recovery (Q7)', () => {
  test('the two consumers disagree LEGITIMATELY, and each names its scope', () => {
    const systemic = systemicRecoveryFact({ hasCheckin: true, energyScore: 4, sorenessScore: 2 });
    expect(systemic.signal).toBe(SIGNAL.GOOD);
    const chest = classifyMuscleBlock({
      muscle: 'chest', landmarks: { mev: 8, mav: 14, mrv: 20 },
      previousStart: 12, plannedPeak: 18, achievedPeak: 18,
      adherence: { completedSets: 60, plannedSets: 62 },
      performance: { e1rmSlopePct: 1.2, confidence: 1 },
      recovery: { sorenessLateAvg: 4.5, jointDiscomfortAvg: 3.5, dataPoints: 8 },
    });
    expect(chest.rationale.toLowerCase()).toContain('chest');
    // The systemic sentence the user reads says "overall", so both are true.
    const out = week({});
    expect(out.whatWorking.join(' ')).toMatch(/recovery overall|overall recovery/i);
  });
});

describe('ATTACK: recent calorie adjustment + noisy weight (Q10)', () => {
  const prior = [buildInterventionRecord({
    kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: Date.now() - 4 * DAY,
    direction: 1, magnitude: 150,
  })];

  test('one noisy week cannot reverse a change that has not been read yet', () => {
    const out = week({ kgPerWeek: 0.95, offTarget: 3, prior });
    expect(out.adjustments.calories).toBeNull();
    expect(out.heldDecisions.some((h) => h.type === 'awaiting_last_change')).toBe(true);
  });

  test('Q10: the OLD record is memory, not authority - it cannot cause a change', () => {
    // It only ever withholds. There is no branch where a prior intervention
    // creates or enlarges this week's adjustment.
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../weeklyCoach.js'), 'utf8',
    );
    const start = src.indexOf('let oscillationHeld = null;');
    const body = src.slice(start, start + 500);
    expect(body).toMatch(/calorieAdjustment = null/);
    expect(body).not.toMatch(/calorieAdjustment = \{/);
  });
});

describe('ATTACK: an intervention that was never accepted (Q6)', () => {
  test('a proposed-but-declined change leaves NO record to score', () => {
    const history = [{ weekStart: Date.now(), adjustments: { calories: { change: 150 } } }];
    expect(interventionsFromHistory(history)).toEqual([]);
  });

  test('so it can never block a later decision either', () => {
    const out = week({ kgPerWeek: 0.95, offTarget: 3, prior: interventionsFromHistory([
      { weekStart: Date.now(), adjustments: { calories: { change: 150 } } },
    ]) });
    expect(out.adjustments.calories?.change).toBeLessThan(0);
  });
});

describe('ATTACK: an intervention confounded by missing execution', () => {
  test('the athlete stopped training, so a volume change teaches nothing', () => {
    const rec = buildInterventionRecord({
      kind: INTERVENTION_KIND.VOLUME_START, appliedAtMs: Date.now() - 30 * DAY, direction: -1, magnitude: 2,
    });
    const after = week({ sessions: 1 }).context;
    const o = classifyOutcome(rec, { after, windowMet: true });
    expect(o.outcome).toBe(OUTCOME.CONFOUNDED);
  });

  test('the diary went dark, so a calorie change teaches nothing', () => {
    const rec = buildInterventionRecord({
      kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: Date.now() - 30 * DAY, direction: 1, magnitude: 150,
    });
    const after = week({ kgPerWeek: 0, intakeDays: 1, intakeAvg: null, adherence: 'untracked' }).context;
    expect(classifyOutcome(rec, { after, windowMet: true }).outcome).toBe(OUTCOME.CONFOUNDED);
  });

  test('and a confounded result is never counted as a success anywhere', () => {
    const rec = buildInterventionRecord({
      kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: Date.now() - 30 * DAY, direction: 1, magnitude: 150,
    });
    const after = week({ intakeDays: 1, intakeAvg: null, adherence: 'untracked' }).context;
    const o = classifyOutcome(rec, { after, windowMet: true });
    expect(o.outcome).not.toBe(OUTCOME.IMPROVED);
  });
});

describe('ATTACK: freshness (Q8)', () => {
  test('a two-month-old check-in is not current recovery evidence', () => {
    const out = week({ noCheckin: true, lastCheckinAt: Date.now() - 60 * DAY });
    expect(out.context.recovery.systemic.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('an intervention still inside its window is INSUFFICIENT, not a result', () => {
    const rec = buildInterventionRecord({
      kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: Date.now() - 3 * DAY, direction: 1, magnitude: 150,
    });
    expect(observationWindowMet(rec, { nowMs: Date.now() })).toBe(false);
    const o = classifyOutcome(rec, { after: week({ kgPerWeek: 0 }).context, windowMet: false });
    expect(o.outcome).toBe(OUTCOME.INSUFFICIENT_EVIDENCE);
  });
});

describe('ATTACK: persistence across restore (Q9)', () => {
  test('the record rides in the coach output row, which sync already merges', () => {
    // eslint-disable-next-line global-require
    const db = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../database.js'), 'utf8',
    );
    // An applied receipt must survive a merge with a device that only VIEWED
    // the week - the existing law, which the intervention record inherits.
    expect(db).toMatch(/appliedAdjustments/);
    expect(db).toMatch(/prevApplied \? \{ \.\.\.data, appliedAdjustments: prevApplied \} : data/);
  });

  test('and a version-stamped record ignores anything it does not recognise', () => {
    const alien = [{ weekStart: Date.now(), appliedAdjustments: { calories: { intervention: { v: 99, kind: 'x' } } } }];
    expect(interventionsFromHistory(alien)).toEqual([]);
  });
});

describe('ATTACK: a mature athlete with several historical interventions', () => {
  const older = Array.from({ length: 4 }, (_, i) => buildInterventionRecord({
    kind: INTERVENTION_KIND.CALORIE_TARGET,
    appliedAtMs: Date.now() - (60 + i * 30) * DAY, direction: 1, magnitude: 150,
  }));

  test('none of them blocks this week: they are all past their window', () => {
    const out = week({ kgPerWeek: 0.95, offTarget: 3, prior: older });
    expect(out.adjustments.calories?.change).toBeLessThan(0);
  });

  test('and history never becomes a reason to repeat itself', () => {
    const out = week({ kgPerWeek: 0.25, prior: older });
    // On target: four past successful increases do not manufacture a fifth.
    expect(out.adjustments.calories).toBeNull();
  });
});

describe('THE WHOLE PRODUCT: no user-facing line survives the ten questions badly', () => {
  const cases = [
    week({}), week({ kgPerWeek: 0, offTarget: 3 }),
    week({ intakeDays: 1, intakeAvg: null, adherence: 'untracked' }),
    week({ sessions: 1, slope: -1.4, prs: 0 }),
    week({ energy: 2, sore: 4, slope: -0.5, prs: 0 }),
    week({ noCheckin: true, weighIns: 3 }),
  ];

  test('Q4: nothing anywhere joins two domains with a cause', () => {
    for (const out of cases) {
      for (const l of storyLines(story(out))) {
        expect(l).not.toMatch(/because (you|your) (ate|eating|intake|training|food)/i);
        expect(l).not.toMatch(/(caused|led to|resulted in) (your|the)/i);
      }
    }
  });

  test('Q3: no UNKNOWN is rendered as a negative', () => {
    for (const out of cases) {
      const t = storyLines(story(out)).join(' ');
      if (out.context?.nutrition?.coverage?.signal === SIGNAL.UNKNOWN) {
        expect(t).not.toMatch(/your intake (was|is) (poor|bad|low|too low)/i);
      }
      if (out.context?.recovery?.systemic?.signal === SIGNAL.UNKNOWN) {
        expect(t).not.toMatch(/recovery was (poor|fine|good)/i);
      }
    }
  });

  test('Q5: every reported change corresponds to a real engine adjustment', () => {
    for (const out of cases) {
      const s = story(out);
      const engineKcal = out.adjustments?.calories?.change ?? 0;
      const reported = s.changing.filter((c) => c.domain === 'nutrition');
      expect(reported.length).toBe(engineKcal === 0 ? 0 : 1);
    }
  });

  test('and every story is finite, short and free of em dashes', () => {
    for (const out of cases) {
      const lines = storyLines(story(out));
      expect(lines.length).toBeLessThanOrEqual(12);
      for (const l of lines) {
        expect(l.length).toBeLessThanOrEqual(160);
        expect(l).not.toContain('—');
      }
    }
  });
});
