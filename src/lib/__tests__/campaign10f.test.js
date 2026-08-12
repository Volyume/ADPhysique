/**
 * campaign10f.test.js — coaching decision truth.
 *
 *   1. reported stress that materially holds training says so
 *   2. the rate shown as decision evidence is the rate the decision used
 */
import { runWeeklyCoach } from '../weeklyCoach';

const read = (rel) => require('fs').readFileSync(require('path').resolve(__dirname, '../../', rel), 'utf8');

const weights = () => Array.from({ length: 14 }, (_, i) => ({
  weightKg: 80 + i * 0.03, loggedAt: Date.now() - (13 - i) * 86400000,
}));

const run = (checkinOver = {}, inputsOver = {}) => runWeeklyCoach({
  checkin: {
    energyScore: 4, sleepQuality: 4, soreness: 1, motivation: 4,
    calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit',
    jointPain: null, notes: '', cycleOverride: false, stressScore: null,
    ...checkinOver,
  },
  morningWeights: weights(),
  sessionsCompleted: 4, sessionsPlanned: 4,
  currentCalTarget: 2400, currentStepsTarget: 8000,
  goalPhase: 'lean_bulk', weeksInPhase: 4, bodyweightKg: 80, sex: 'male',
  ...inputsOver,
});

const noteOf = (out) => out?.adjustments?.training?.note ?? '';

// ─── 1. Stress provenance ────────────────────────────────────────────────────

describe('reported stress that changes the decision is acknowledged', () => {
  test('high stress that turns a push into a hold is explained, using the user\'s answer', () => {
    const calm = run({ stressScore: 1 });
    const stressed = run({ stressScore: 5 });
    // Only assert provenance where the decision genuinely moved.
    if (calm.adjustments?.training?.signal !== stressed.adjustments?.training?.signal
      || calm.adjustments?.volume?.signal !== stressed.adjustments?.volume?.signal) {
      expect(noteOf(stressed)).toMatch(/you reported high stress this week/i);
      expect(noteOf(calm)).not.toMatch(/high stress/i);
    } else {
      // Same outcome either way: nothing may be claimed.
      expect(noteOf(stressed)).not.toMatch(/high stress/i);
    }
  });

  test('materiality is measured by a real counterfactual, not assumed from the threshold', () => {
    const src = read('lib/weeklyCoach.js');
    const block = src.slice(src.indexOf('const stressDowngradeMaterial'), src.indexOf('let volumeSignal'));
    // It recomputes the recovery read WITHOUT stress and re-runs the matrix.
    expect(block).toMatch(/getRecoveryScore\(energyScore, sorenessScore, null\)/);
    expect(block).toMatch(/autoregulationMatrix\(withoutStress, performanceScore, withoutPush\)/);
    expect(block).toMatch(/alt\.trainingSignal !== matrix\.trainingSignal \|\| alt\.volumeDelta !== matrix\.volumeDelta/);
    // Same grade either way => not material, regardless of the threshold.
    expect(block).toMatch(/if \(withoutStress === recoveryScore\) return false;/);
  });

  test('stress below the existing threshold claims nothing', () => {
    for (const stressScore of [1, 2, 3, null]) {
      expect(noteOf(run({ stressScore }))).not.toMatch(/high stress/i);
    }
  });

  test('a stronger safety reason is not shared with stress', () => {
    // Joint pain owns the explanation; stress is not credited on top.
    const out = run({ stressScore: 5, jointPain: true });
    expect(noteOf(out)).toMatch(/You flagged joint pain/);
    expect(noteOf(out)).not.toMatch(/high stress/i);
  });

  test('no recovery grade, matrix cell, threshold or classifier is exposed', () => {
    const out = run({ stressScore: 5 });
    const note = noteOf(out);
    expect(note).not.toMatch(/grade|matrix|recoveryScore|autoregulation|score\s*[1-4]|>=\s*4/i);
  });

  test('the stress model itself is untouched', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).toMatch(/if \(st != null && st >= 4 && score < 3\) score = 3;/);
    // Energy and soreness mapping unchanged.
    expect(src).toMatch(/if \(s >= 4\) score = 4;/);
    expect(src).toMatch(/else if \(e <= 2 \|\| s >= 3\) score = 3;/);
  });
});

// ─── 2. Coaching trend ───────────────────────────────────────────────────────

describe('the rate shown as evidence is the rate the decision used', () => {
  test('the engine exposes the decision rate alongside the scale reading', () => {
    const out = run();
    expect(out.trend).toHaveProperty('coachingRatePct');
    expect(out.trend).toHaveProperty('coachingRateLabel');
    // The scale reading is still there, unchanged, for surfaces that want it.
    expect(out.trend).toHaveProperty('ewma7');
    expect(out.trend).toHaveProperty('delta');
    expect(out.trend).toHaveProperty('rateLabel');
  });

  test('the coaching rate is the decisionRatePct the verdict came from, not a new trend', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).toMatch(/const coachingRatePct = decisionRatePct != null/);
    // No second estimator invented.
    const block = src.slice(src.indexOf('const coachingRatePct'), src.indexOf('const onTarget ='));
    expect(block).not.toMatch(/computeEWMA|robustTracking|getEwmaSevenDaysAgo/);
  });

  test('it follows the existing fallback: robust when available, plain rate otherwise', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).toMatch(/const decisionRatePct = robustRatePct != null \? robustRatePct : actualRatePct;/);
    // coachingRatePct is derived from decisionRatePct, so it inherits it.
    expect(src.indexOf('const decisionRatePct')).toBeLessThan(src.indexOf('const coachingRatePct'));
  });

  test('the on-target sentence quotes the coaching rate, not the scale delta', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).toMatch(/Your weight trend is on target \(\$\{coachingRateLabel\}\)/);
    expect(src).not.toMatch(/Your weight trend is on target \(\$\{rateLabel\}\)/);
  });

  test('the label states direction in plain language, with no internal terminology', () => {
    const out = run();
    const label = out.trend.coachingRateLabel;
    if (label != null) {
      expect(label).toMatch(/gaining|losing|holding steady/);
      expect(label).not.toMatch(/robust|EWMA|estimator|Holt|tracking/i);
    }
  });

  test('the Coach Output surface shows it, labelled and distinguished from the scale chip', () => {
    const screen = read('screens/CoachOutputScreen.js');
    expect(screen).toMatch(/label="Coaching trend"/);
    expect(screen).toMatch(/value=\{trend\.coachingRateLabel\}/);
    // The scale chip keeps its own identity and says which is which.
    expect(screen).toMatch(/'7-day trend'/);
    expect(screen).toMatch(/This is the scale reading\./);
    expect(screen).not.toMatch(/robustTrackingSevenDaysAgo|robust estimator/);
  });

  test('C10B long-gap normalisation remains authoritative and untouched', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).toMatch(/const robustWeeks = elapsedWeeksSinceComparator\(robustPriorPoint\?\.loggedAt \?\? null, nowMs\) \?\? 1;/);
    expect(src).toMatch(/\(\(robustWeightDelta \/ bwRef\) \* 100\) \/ robustWeeks/);
  });

  test('no nutrition policy constant moved', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).toMatch(/Math\.max\(0\.2 \* Math\.abs\(phase\.goalRatePct\) \+ 0\.05, 0\.15\)/);
    expect(src).toMatch(/actualRatePct <= -1\.5/);
  });

  test('unrelated EWMA surfaces are not touched', () => {
    // Body Metrics and progress surfaces keep their own trend maths.
    const bm = read('screens/BodyMetricsScreen.js');
    expect(bm).not.toMatch(/coachingRateLabel|coachingRatePct/);
  });
});
