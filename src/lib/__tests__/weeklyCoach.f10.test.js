/**
 * F10 (EN-5 + EN-8) — engine clock injection and the distinct-day weigh-in gate.
 *
 * EN-5: the "pure" engine read the wall clock mid-run (trend cutoff, steps
 * today-key fallback, diet-break weeks, refeed cadence), so identical inputs
 * could give different outputs by run time. This suite pins the fix: an
 * injectable `nowMs` read ONCE at the public entry (default Date.now()) and
 * threaded through every internal time read. Two runs with the same fixed
 * nowMs must be JSON-identical; runs with different nowMs may differ (pinned
 * here via the refeed cadence, which is due at one clock and not the other).
 * The robustTrend *SevenDaysAgo exports carry the same injectable parameter.
 *
 * EN-8: the data-confidence gate counted raw 14-day rows (including same-day
 * duplicates) as "this week's weigh-ins", so three weigh-ins on ONE day passed
 * the 3-weigh-in gate as a week of data. The fix counts DISTINCT local
 * day-keys within the 7 days ending at the most recent weigh-in. Direction is
 * one-way by construction (the new count is always <= the old row count), so
 * the gate can only ever HOLD more than before, never adjust more; the tests
 * below pin both sides of that line.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { robustSevenDaysAgo, robustTrackingSevenDaysAgo } from '../robustTrend';

const DAY = 86400000;
// Fixed, arbitrary clock: Mon 22 Jun 2026 08:00 UTC.
const NOW = Date.UTC(2026, 5, 22, 8, 0, 0);

// 28 daily weights easing 84.0 -> 82.65 kg, ending at `endMs`.
function dailyWeights(endMs = NOW, count = 28) {
  return Array.from({ length: count }, (_, i) => ({
    weightKg: +(84.0 - i * 0.05).toFixed(2),
    loggedAt: endMs - (count - 1 - i) * DAY,
  }));
}

function baseInputs(over = {}) {
  return {
    checkin: {
      weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 3, sleepHours: 7.5,
      calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit',
      jointPain: false, cycleOverride: false, notes: null,
    },
    morningWeights: dailyWeights(),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
    goalPhase: 'mod_cut', weeksInPhase: 5,
    consecutiveOffTargetWeeks: 3, consecutivePoorRecoveryWeeks: 0,
    lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
    currentCalTarget: 2200, currentMaintenanceKcal: 2800,
    currentProteinG: 170, currentCarbsG: 200, currentFatG: 70,
    currentStepsTarget: 8000, stepsEnabled: false,
    bodyweightKg: 83, units: 'kg', sex: 'male',
    scoffPositive: false, recentWeeklyHistory: [], goalLockAdvanced: false,
    edPatternOpen: false, userTier: 'pro', hasUsedTrial: true,
    recentIntakeAvgKcal: null, recentIntakeDaysLogged: 0,
    nowMs: NOW,
    ...over,
  };
}

describe('EN-5: injectable nowMs makes runWeeklyCoach deterministic', () => {
  test('two runs with the same fixed nowMs are JSON-identical', () => {
    const a = runWeeklyCoach(baseInputs());
    const b = runWeeklyCoach(baseInputs());
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  test('two runs with the same fixed nowMs are JSON-identical on the refeed-eligible path too', () => {
    const inputs = () => baseInputs({
      goalPhase: 'agg_cut',
      lastRefeedAt: NOW - 8 * DAY,
      goalStartDate: NOW - 70 * DAY, // long cut: exercises the diet-break clock read
    });
    const a = runWeeklyCoach(inputs());
    const b = runWeeklyCoach(inputs());
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  test('a different nowMs may change the output (refeed cadence flips from not-due to due)', () => {
    const inputs = (nowMs) => baseInputs({
      goalPhase: 'agg_cut',
      lastRefeedAt: NOW - 8 * DAY,
      nowMs,
    });
    // agg_cut (non-competition) refeed cadence is every 2 weeks. 8 days since
    // the last refeed -> not due; a clock 7 days later (15 days since) -> due.
    const notDue = runWeeklyCoach(inputs(NOW));
    const due = runWeeklyCoach(inputs(NOW + 7 * DAY));
    expect(notDue.refeed ?? null).toBeNull();
    expect(due.refeed).toBeTruthy();
    expect(JSON.stringify(due)).not.toBe(JSON.stringify(notDue));
  });
});

describe('EN-5: robustTrend seven-days-ago helpers take an injectable nowMs', () => {
  const weights = dailyWeights();

  test('same fixed nowMs gives identical values on repeat calls', () => {
    expect(robustSevenDaysAgo(weights, {}, NOW)).toBe(robustSevenDaysAgo(weights, {}, NOW));
    expect(robustTrackingSevenDaysAgo(weights, {}, NOW)).toBe(robustTrackingSevenDaysAgo(weights, {}, NOW));
  });

  test('a different nowMs may read a different point on the trend', () => {
    // At NOW the cutoff lands 7 days into the series; 10 days later it lands
    // past every reading, so the newest entry is read instead.
    expect(robustSevenDaysAgo(weights, {}, NOW)).not.toBe(robustSevenDaysAgo(weights, {}, NOW + 10 * DAY));
    expect(robustTrackingSevenDaysAgo(weights, {}, NOW))
      .not.toBe(robustTrackingSevenDaysAgo(weights, {}, NOW + 10 * DAY));
  });
});

describe('EN-8: the 3-weigh-in gate counts distinct local days, not rows', () => {
  test('3 same-day duplicate weigh-ins no longer pass the gate (holds, never adjusts)', () => {
    const oneDay = NOW - DAY;
    const out = runWeeklyCoach(baseInputs({
      morningWeights: [
        { weightKg: 83.2, loggedAt: oneDay },              // morning
        { weightKg: 83.4, loggedAt: oneDay + 4 * 3600000 }, // midday re-weigh
        { weightKg: 83.9, loggedAt: oneDay + 12 * 3600000 }, // evening re-weigh
      ],
    }));
    expect(out.confidence).toBe('data_hold');
    expect(out.hasEnoughData).toBe(false);
    expect(out.adjustments?.calories ?? null).toBeNull();
  });

  test('same-day duplicates cannot pad a thin week past the gate', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: [
        { weightKg: 83.2, loggedAt: NOW - 2 * DAY },
        { weightKg: 83.3, loggedAt: NOW - DAY },
        { weightKg: 83.4, loggedAt: NOW - DAY + 3600000 },
        { weightKg: 83.5, loggedAt: NOW - DAY + 2 * 3600000 },
        { weightKg: 83.6, loggedAt: NOW - DAY + 3 * 3600000 },
      ], // 5 rows, only 2 distinct days
    }));
    expect(out.confidence).toBe('data_hold');
  });

  test('3 weigh-ins on 3 distinct days still pass the gate', () => {
    const out = runWeeklyCoach(baseInputs({
      morningWeights: [2, 1, 0].map((d) => ({ weightKg: 83.2 - d * 0.1, loggedAt: NOW - d * DAY })),
    }));
    expect(out.confidence).not.toBe('data_hold');
  });

  test('a normal daily-weigh-in week is unaffected (full run still adjusts as before)', () => {
    const out = runWeeklyCoach(baseInputs());
    expect(out.confidence).not.toBe('data_hold');
    expect(out.hasEnoughData).toBe(true);
  });
});
