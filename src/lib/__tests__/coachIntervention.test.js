/**
 * coachIntervention.test.js — Campaign 18 outcome follow-up (priority 1).
 *
 * FOUNDER LAW: "An elite coach does not merely remember 'I changed X'. They
 * remember 'I changed X because of Y, and afterwards Z happened.'"
 *
 * And the two rules that keep that honest:
 *   D. "Do not force every intervention into success/failure. CONFOUNDED is
 *      important."
 *   G. "Do not later score an intervention Volyume proposed but the user
 *      never actually accepted."
 *
 * WHAT THIS SUITE PINS. The five outcome states with the confounders that
 * produce them, the anti-oscillation rule against the founder's own forbidden
 * sequence, and the fact that all of it is written and read on real
 * production paths.
 */
import { buildCoachContext } from '../coachContext';
import { runWeeklyCoach } from '../weeklyCoach';
import {
  INTERVENTION_KIND, OUTCOME, OBSERVE,
  buildInterventionRecord, interventionsFromHistory,
  observationWindowMet, classifyOutcome,
  recentUnjudgedIntervention, wouldReverseRecent, outcomeCopy,
} from '../coachIntervention';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

const ctx = ({ weight = 'good', intake = 'good', training = 'good', recovery = 'good', rate = 0.3 } = {}) =>
  buildCoachContext({
    training: {
      sessionsCompleted: training === 'good' ? 4 : 1, sessionsPlanned: 4,
      blockE1rmSlopePct: 1.1,
    },
    recovery: recovery === 'unknown'
      ? { hasCheckin: false }
      : { hasCheckin: true, energyScore: recovery === 'good' ? 4 : 2, sorenessScore: 2 },
    nutrition: intake === 'unknown'
      ? { recentIntakeDaysLogged: 1, targetKcal: 3000 }
      : { recentIntakeDaysLogged: 6, recentIntakeAvgKcal: 2980, targetKcal: 3000 },
    weight: weight === 'unknown'
      ? { ratePctPerWeek: null, weighInCount: 1 }
      : { ratePctPerWeek: rate, weighInCount: 12, onTarget: weight === 'good', shortfall: 0 },
  });

const calorieRecord = (over = {}) => buildInterventionRecord({
  kind: INTERVENTION_KIND.CALORIE_TARGET,
  appliedAtMs: NOW - 21 * DAY,
  direction: 1, magnitude: 150,
  because: 'off_target_on_adherence',
  authorisedBy: ['nutrition.coverage', 'nutrition.intake'],
  heldConstant: ['training'],
  baseline: { key: 'weight.trend', value: 0.0 },
  ...over,
});

describe('THE RECORD: structured truth, not prose', () => {
  test('it answers every question the founder listed', () => {
    const r = calorieRecord();
    expect(r.kind).toBe(INTERVENTION_KIND.CALORIE_TARGET);
    expect(r.domain).toBe('nutrition');
    expect(r.appliedAt).toBe(NOW - 21 * DAY);
    expect(r.direction).toBe(1);
    expect(r.magnitude).toBe(150);
    expect(r.because).toBe('off_target_on_adherence');
    expect(r.authorisedBy).toContain('nutrition.intake');
    expect(r.heldConstant).toEqual(['training']);
    expect(r.baseline).toEqual({ key: 'weight.trend', value: 0 });
    expect(r.observe).toEqual(OBSERVE[INTERVENTION_KIND.CALORIE_TARGET]);
  });

  test('a nonsense kind produces no record at all', () => {
    expect(buildInterventionRecord({ kind: 'searched_for_a_food' })).toBeNull();
    expect(buildInterventionRecord({})).toBeNull();
  });

  test('the observation window is the app\'s OWN calorie cooldown, not a new clock', () => {
    // weeklyCoach already refuses to adjust twice inside two weeks.
    expect(OBSERVE[INTERVENTION_KIND.CALORIE_TARGET])
      .toEqual({ unit: 'weeks', min: 2, signals: ['weight.trend'], compare: 'direction' });
    // And the training-side kinds are judged on training evidence, not the scale.
    // ADVERSARIAL CLOSURE B2: a volume change is judged on BOTH the training
    // response and the recovery cost. Recovery alone could not tell "the extra
    // work bought progress at a fair price" from "it bought nothing".
    expect(OBSERVE[INTERVENTION_KIND.VOLUME_START].signals)
      .toEqual(['training.progress', 'recovery.systemic']);
    expect(OBSERVE[INTERVENTION_KIND.EXERCISE_REPLACEMENT].unit).toBe('exposures');
  });
});

describe('ONLY WHAT THE USER ACCEPTED (rule G)', () => {
  test('an applied week yields a record', () => {
    const history = [{ weekStart: NOW, appliedAdjustments: { calories: { appliedAt: NOW, newKcal: 3150, intervention: calorieRecord() } } }];
    const records = interventionsFromHistory(history);
    expect(records).toHaveLength(1);
    expect(records[0].appliedValue).toBe(3150);
  });

  test('A WEEK THE USER NEVER ACCEPTED YIELDS NOTHING', () => {
    // The coach proposed a change; there is no appliedAdjustments entry.
    const history = [{ weekStart: NOW, adjustments: { calories: { change: 150 } } }];
    expect(interventionsFromHistory(history)).toEqual([]);
  });

  test('a legacy applied row with no structured record is ignored, not guessed at', () => {
    const history = [{ weekStart: NOW, appliedAdjustments: { calories: { appliedAt: NOW, newKcal: 3150 } } }];
    expect(interventionsFromHistory(history)).toEqual([]);
  });
});

describe('THE FIVE OUTCOMES', () => {
  const met = { windowMet: true };

  test('IMPROVED: the thing we were watching came into range', () => {
    const o = classifyOutcome(calorieRecord(), { after: ctx({ weight: 'good' }), ...met });
    expect(o.outcome).toBe(OUTCOME.IMPROVED);
  });

  test('UNCHANGED: still off target, and no worse', () => {
    const o = classifyOutcome(calorieRecord(), { after: ctx({ weight: 'poor', rate: 0.0 }), ...met });
    expect(o.outcome).toBe(OUTCOME.UNCHANGED);
  });

  test('WORSENED: it moved the wrong way against its own baseline', () => {
    const o = classifyOutcome(
      calorieRecord({ baseline: { key: 'weight.trend', value: 0.1 } }),
      { after: ctx({ weight: 'poor', rate: -0.2 }), ...met },
    );
    expect(o.outcome).toBe(OUTCOME.WORSENED);
  });

  test('INSUFFICIENT_EVIDENCE: it simply has not had long enough', () => {
    const o = classifyOutcome(calorieRecord(), { after: ctx({ weight: 'poor' }), windowMet: false });
    expect(o.outcome).toBe(OUTCOME.INSUFFICIENT_EVIDENCE);
    expect(o.because).toBe('still_within_observation_window');
  });

  test('CONFOUNDED: the diary went dark, so nothing is attributable', () => {
    const o = classifyOutcome(calorieRecord(), { after: ctx({ weight: 'poor', intake: 'unknown' }), ...met });
    expect(o.outcome).toBe(OUTCOME.CONFOUNDED);
    expect(o.because).toBe('diary_coverage_lost');
  });

  test('CONFOUNDED: the weight evidence itself disappeared', () => {
    const o = classifyOutcome(calorieRecord(), { after: ctx({ weight: 'unknown' }), ...met });
    expect(o.outcome).toBe(OUTCOME.CONFOUNDED);
    expect(o.because).toBe('weight.trend_became_unknown');
  });

  test('CONFOUNDED: the athlete stopped training, so a volume change says nothing', () => {
    const vol = buildInterventionRecord({
      kind: INTERVENTION_KIND.VOLUME_START, appliedAtMs: NOW - 21 * DAY, direction: -1, magnitude: 2,
    });
    const o = classifyOutcome(vol, { after: ctx({ training: 'poor' }), ...met });
    expect(o.outcome).toBe(OUTCOME.CONFOUNDED);
    expect(o.because).toBe('training_stopped');
  });

  test('CONFOUNDED: the user changed it themselves', () => {
    const o = classifyOutcome(calorieRecord(), { after: ctx({}), userOverrode: true, ...met });
    expect(o.outcome).toBe(OUTCOME.CONFOUNDED);
    expect(o.because).toBe('user_changed_it_themselves');
  });

  test('CONFOUNDED: the accepted target no longer matches the authoritative target', () => {
    const r = calorieRecord({ appliedValue: 3150 });
    const o = classifyOutcome(r, { after: ctx({}), ...met });
    expect(o).toEqual({ outcome: OUTCOME.CONFOUNDED, because: 'user_changed_it_themselves' });
  });

  test('CONFOUNDED: a new goal phase is not a result of the old decision', () => {
    const after = buildCoachContext({
      nutrition: { recentIntakeDaysLogged: 7, recentIntakeAvgKcal: 2500, targetKcal: 2500 },
      weight: { ratePctPerWeek: -0.4, weighInCount: 12, onTarget: true },
      intent: { goalPhase: 'mild_cut' },
    });
    expect(classifyOutcome(calorieRecord({ goalPhase: 'bulk' }), { after, ...met })).toEqual({
      outcome: OUTCOME.CONFOUNDED,
      because: 'goal_phase_changed_or_unknown',
    });
  });

  test('EVERY state has plain-English copy, and none of it claims causation', () => {
    for (const state of Object.values(OUTCOME)) {
      const copy = outcomeCopy(calorieRecord(), state);
      expect(copy).toBeTruthy();
      expect(copy).not.toMatch(/because of|caused|thanks to|proves|worked/i);
      expect(copy).not.toContain('—');
    }
  });
});

describe('THE OBSERVATION WINDOW', () => {
  test('two weeks is not yet; three weeks is', () => {
    const r = calorieRecord({ appliedAtMs: NOW - 10 * DAY });
    expect(observationWindowMet(r, { nowMs: NOW })).toBe(false);
    expect(observationWindowMet(calorieRecord(), { nowMs: NOW })).toBe(true);
  });

  test('an exposure-counted kind counts exposures, not days', () => {
    const r = buildInterventionRecord({
      kind: INTERVENTION_KIND.EXERCISE_REPLACEMENT, appliedAtMs: NOW - 200 * DAY, direction: 1,
    });
    expect(observationWindowMet(r, { nowMs: NOW })).toBe(false);
    expect(observationWindowMet(r, { nowMs: NOW, exposuresSince: 3 })).toBe(true);
  });
});

describe('ANTI-OSCILLATION (rule F)', () => {
  const recent = [calorieRecord({ appliedAtMs: NOW - 3 * DAY, direction: 1 })];

  test('THE FORBIDDEN SEQUENCE: +100 then a reversal is refused', () => {
    expect(wouldReverseRecent(recent, 'nutrition', -1, { nowMs: NOW })).toBeTruthy();
  });

  test('but continuing in the SAME direction is a dose decision, not an oscillation', () => {
    expect(wouldReverseRecent(recent, 'nutrition', +1, { nowMs: NOW })).toBeNull();
  });

  test('and once the window has passed, a reversal is allowed again', () => {
    const old = [calorieRecord({ appliedAtMs: NOW - 30 * DAY, direction: 1 })];
    expect(wouldReverseRecent(old, 'nutrition', -1, { nowMs: NOW })).toBeNull();
  });

  test('a new goal phase releases an unjudged intervention immediately', () => {
    const scoped = [calorieRecord({ appliedAtMs: NOW - 3 * DAY, goalPhase: 'bulk' })];
    expect(wouldReverseRecent(scoped, 'nutrition', -1, {
      nowMs: NOW, goalPhase: 'mild_cut',
    })).toBeNull();
  });

  test('it never crosses domains: a training change cannot block a calorie one', () => {
    const vol = [buildInterventionRecord({
      kind: INTERVENTION_KIND.VOLUME_START, appliedAtMs: NOW - 3 * DAY, direction: 1,
    })];
    expect(wouldReverseRecent(vol, 'nutrition', -1, { nowMs: NOW })).toBeNull();
    expect(recentUnjudgedIntervention(vol, 'training', { nowMs: NOW })).toBeTruthy();
  });
});

describe('THE REAL ENGINE REFUSES THE OSCILLATION', () => {
  const weights = (kgPerWeek) => Array.from({ length: 35 }, (_, i) => ({
    loggedAt: Date.now() - (34 - i) * DAY,
    weightKg: Math.round((80 + kgPerWeek * ((34 - (34 - i)) / 7)) * 100) / 100,
  }));

  const run = (priorInterventions) => runWeeklyCoach({
    nowMs: Date.now(),
    checkin: {
      weekStart: Date.now() - 7 * DAY, energyScore: 4, sorenessScore: 2,
      stressScore: 2, calsAdherence: 'hit', notes: '',
    },
    morningWeights: weights(0.9),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
    goalPhase: 'bulk', weeksInPhase: 8,
    consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
    currentCalTarget: 3000, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: 3010, recentIntakeDaysLogged: 7,
    lastCheckinAt: Date.now() - DAY,
    bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    priorInterventions,
  });

  test('without a recent change, the engine cuts as it always did', () => {
    expect(run([]).adjustments.calories?.change).toBeLessThan(0);
  });

  test('THE PRODUCT RESULT: a recent INCREASE blocks this week\'s cut', () => {
    const out = run([buildInterventionRecord({
      kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: Date.now() - 3 * DAY, direction: 1, magnitude: 150, goalPhase: 'bulk',
    })]);
    expect(out.adjustments.calories).toBeNull();
    const held = out.heldDecisions.find((h) => h.type === 'awaiting_last_change');
    expect(held).toBeTruthy();
    expect(held.reason).toMatch(/has not had long enough to show yet/);
    expect(held.reason).toMatch(/Reversing it now would tell us nothing/);
  });

  test('a recent DECREASE does not block a further decrease', () => {
    const out = run([buildInterventionRecord({
      kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: Date.now() - 3 * DAY, direction: -1, magnitude: 125, goalPhase: 'bulk',
    })]);
    expect(out.adjustments.calories?.change).toBeLessThan(0);
  });

  test('SAFETY OVERRIDES IT: rapid loss is never held by this gate', () => {
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
      // A recent DOWNWARD change: an upward safety correction reverses it.
      priorInterventions: [buildInterventionRecord({
        kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: Date.now() - 2 * DAY, direction: -1, magnitude: 100,
      })],
    });
    expect(out.rapidWeightLossFlag).toBe(true);
    expect(out.adjustments.calories?.change).toBeGreaterThan(0);
    expect(out.heldDecisions.find((h) => h.type === 'awaiting_last_change')).toBeUndefined();
  });
});

describe('FUTURE DECISION USE IS EVIDENCE, NOT AUTHORITY (rule E)', () => {
  test('IT DECIDES NOTHING: the module contains no rule that repeats a change', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../coachIntervention.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // No prescription: it returns observations and a bounded multiplier,
    // never a change or a target.
    expect(code).not.toMatch(/newTarget|recommend|shouldApply|doItAgain/i);
  });
});

describe('THE PRODUCTION PATHS', () => {
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../screens/CoachOutputScreen.js'), 'utf8',
  );

  test('the record is WRITTEN on the real apply taps, both domains', () => {
    expect(SCREEN).toMatch(/markApplied\(output, 'calories', \{[\s\S]{0,900}?intervention: buildInterventionRecord\(\{/);
    expect(SCREEN).toMatch(/markApplied\(output, 'training', \{[\s\S]{0,900}?intervention: buildInterventionRecord\(\{/);
  });

  test('the accepted calorie record carries the goal phase that scopes dose learning', () => {
    const apply = SCREEN.slice(SCREEN.indexOf('async function handleApplyCalories'), SCREEN.indexOf('async function handleDeclineCalories'));
    expect(apply).toMatch(/goalPhase: output\?\.goalPhase \?\? null/);
  });

  test('it is READ back before the run, so the gate can see it', () => {
    expect(SCREEN).toMatch(/const priorInterventions = interventionsFromHistory\(/);
    expect(SCREEN).toMatch(/runWeeklyCoach\(\{\s*\n\s*checkin: engineCheckin,\s*\n\s*physicalConstraint,\s*\n\s*priorInterventions,/);
  });

  test('and the outcome REACHES THE USER in the weekly story', () => {
    expect(SCREEN).toMatch(/const lastOutcome = lastIntervention/);
    // Now one of three memory lines, in priority order (job A3 / B3).
    expect(SCREEN).toMatch(/lastOutcomeLine \? \{ text: lastOutcomeLine, state: lastOutcome\.outcome \}/);
    expect(SCREEN).toMatch(/\{weeklyStory\.outcome\.text\}/);
  });

  test('a read failure never invents a memory', () => {
    expect(SCREEN).toMatch(/getCoachOutputHistory\(user\.id, 8\)\.catch\(\(\) => \[\]\)/);
  });
});
