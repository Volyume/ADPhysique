/**
 * bodyMetricsDisplay.test.js
 *
 * BUILD LANE A (progress-tab audit 2026-09-24, second pass). Behavioural
 * tests against the real, exported pure functions bodyMetricsDisplay.js
 * pulls out of BodyMetricsScreen.js (dependency-free -- no mount needed;
 * the screen-side wiring is pinned separately in
 * BodyMetricsScreen.weightUnitsAndDate.guard.test.js).
 *
 * A1: WeightTrendChart's plotted value/min/max and its axis/tooltip unit
 * LABEL must agree. THE DEFECT: the chart always plotted canonical kg but
 * labelled the axis/tooltip straight from bodyWeightUnits -- for a pounds
 * user that put "lbs" on a true kg number (a true 82.5 kg read "82.5 lbs").
 *
 * A2: the snapshot header used to default to the literal string "Today" for
 * ANY unparseable stored date -- a claim about the CURRENT day for a date
 * that is simply unknown.
 */
import {
  weightChartUnitLabel, weightChartValue, weightChartTooltipTitle, weightSnapshotDateLabel,
} from '../bodyMetricsDisplay';
import { kgToLbs } from '../units';

describe('A1: weightChartUnitLabel / weightChartValue / weightChartTooltipTitle', () => {
  test('lbs: converts the number (one decimal, units.js kgToLbs) so the number and its label agree', () => {
    expect(weightChartUnitLabel('lbs')).toBe('lbs');
    expect(weightChartValue(82.5, 'lbs')).toBeCloseTo(parseFloat(kgToLbs(82.5).toFixed(1)), 5);
    expect(weightChartTooltipTitle(82.5, 'lbs')).toBe('181.9 lbs');
  });

  test('st: unchanged -- kg values with an honest kg label (stone is not a useful decimal chart axis)', () => {
    expect(weightChartUnitLabel('st')).toBe('kg');
    expect(weightChartValue(82.5, 'st')).toBe(82.5);
    expect(weightChartTooltipTitle(82.5, 'st')).toBe('82.5 kg');
  });

  test('kg: unchanged', () => {
    expect(weightChartUnitLabel('kg')).toBe('kg');
    expect(weightChartValue(82.5, 'kg')).toBe(82.5);
    expect(weightChartTooltipTitle(82.5, 'kg')).toBe('82.5 kg');
  });

  test('a null/NaN weight is passed through rather than coerced into a number', () => {
    expect(weightChartValue(null, 'lbs')).toBeNull();
    expect(weightChartValue(NaN, 'kg')).toBeNaN();
  });

  test('a whole-number lbs conversion still reads with one decimal place', () => {
    // 45.359237 kg is exactly 100.0000... lbs -- toFixed(1) must keep the
    // trailing zero rather than reading as a bare "100".
    expect(weightChartTooltipTitle(45.359237, 'lbs')).toBe('100 lbs');
    expect(weightChartValue(45.359237, 'lbs').toFixed(1)).toBe('100.0');
  });
});

describe('A2: weightSnapshotDateLabel', () => {
  test('the current local day reads "Today"', () => {
    const now = Date.now();
    const d = new Date(now);
    // metric_date is stamped as a local day-key (YYYY-MM-DD) by
    // BodyMetricsScreen's rowToEntry -- build one for "now" the same way.
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(weightSnapshotDateLabel(todayKey, now)).toBe('Today');
  });

  test('an unparseable date reads "Date unknown", never "Today"', () => {
    expect(weightSnapshotDateLabel('not-a-date')).toBe('Date unknown');
    expect(weightSnapshotDateLabel(null)).toBe('Date unknown');
    expect(weightSnapshotDateLabel(undefined)).toBe('Date unknown');
    expect(weightSnapshotDateLabel('')).toBe('Date unknown');
  });

  test('a parseable date that is not today keeps its normal formatted form', () => {
    expect(weightSnapshotDateLabel('2026-01-15', Date.now())).toBe('15 Jan 2026');
  });

  test('a parseable full ISO datetime (not just a bare day-key) is still read correctly', () => {
    expect(weightSnapshotDateLabel('2026-03-02T23:00:00.000Z')).not.toBe('Date unknown');
  });
});

// ─── D214 addendum 4 (Body metrics, lane 7): the screen's sentences ───────────
// Spec docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 (every quoted string below is
// the spec's own) and section 6 table (`bodyMetricsDisplay`). The A1/A2 tests
// above are UNCHANGED: the chart still reads kilograms for a stone user and
// "Today" still means today. These pin the new wording against the real
// functions; the screen only places what these return.
import fs from 'fs';
import path from 'path';
import {
  trimDecimals, formatWeightAmount, formatWeightRatePerWeek, dayKeyLabel, shortDate, weekdayDate,
  clockTime, morningsCaption, twoWeekVerdictLine, notEnoughForDirectionLine, roundToDisplay,
  weekComparisonLine, noiseLine, TREND_WEIGHT_INFO, DAY_ZERO_LINE, startingWeightLine, lastWeighInCaption,
  coachVerdictFromOutput, trendTitle, chartUnitNote, trendInfo, fittedAxis, niceAxisTicks, axisGutterWidth,
  weeklyTickTimes, MAINTENANCE_MIN_WEIGH_IN_DAYS, MAINTENANCE_MIN_FOOD_DAYS, MAINTENANCE_FOOD_WINDOW_DAYS,
  MAINTENANCE_TITLE, MAINTENANCE_INFO, maintenanceModel, intakeLine, weekGroupHeader, noteForDisplay,
  historyRowTitle, historyRowDetail, replaceNotice, readingChangeLine, MEASURE_HOW_INFO,
} from '../bodyMetricsDisplay';
import { coachVerdictInsight } from '../weightTrend';

const DAY = 86400000;
const nbsp = (s) => String(s).replace(/ /g, ' ');

describe('amounts and rates in the person\'s units (BM-28)', () => {
  test('trimDecimals drops trailing zeros and never prints -0', () => {
    expect(trimDecimals(0.3, 1)).toBe('0.3');
    expect(trimDecimals(54, 1)).toBe('54');
    expect(trimDecimals(0.15, 2)).toBe('0.15');
    expect(trimDecimals(-0.04, 1)).toBe('0');
    expect(trimDecimals(NaN, 1)).toBe('');
  });

  test('formatWeightAmount: kilograms, pounds, and stones once it is a stone or more', () => {
    expect(formatWeightAmount(0.3, 'kg')).toBe('0.3 kg');
    expect(formatWeightAmount(54, 'kg')).toBe('54 kg');
    expect(formatWeightAmount(0.3, 'lbs')).toBe('0.7 lbs');
    expect(formatWeightAmount(0.3, 'st')).toBe('0.7 lbs');
    expect(formatWeightAmount(54, 'lbs')).toBe('119 lbs');
    expect(formatWeightAmount(54, 'st')).toBe('8 st 7 lbs');
    expect(formatWeightAmount(-0.4, 'kg')).toBe('0.4 kg'); // a magnitude, the verb carries the sign
  });

  test('formatWeightRatePerWeek reads "a week" and "lbs a week" for stone and pound users', () => {
    expect(formatWeightRatePerWeek(0.15, 'kg')).toBe('0.15 kg a week');
    expect(formatWeightRatePerWeek(0.15, 'lbs')).toBe('0.3 lbs a week');
    expect(formatWeightRatePerWeek(0.15, 'st')).toBe('0.3 lbs a week');
    expect(formatWeightRatePerWeek(-0.6, 'kg')).toBe('0.6 kg a week');
  });

  test('roundToDisplay differences what is printed, so two printed 82.3 kg never differ', () => {
    expect(roundToDisplay(82.35, 'kg')).toBeCloseTo(82.4, 5);
    expect(roundToDisplay(82.286, 'kg')).toBeCloseTo(82.3, 5);
    expect(roundToDisplay(82.4, 'lbs')).toBeCloseTo(82.553, 2); // 182 lbs
  });
});

describe('dates', () => {
  test('day keys read as local days', () => {
    expect(shortDate('2026-09-04')).toBe('4 Sep');
    expect(weekdayDate('2026-09-16')).toBe('Wed 16 Sep');
    expect(dayKeyLabel('2026-09-16', 'EEE d MMM yyyy')).toBe('Wed 16 Sep 2026');
    expect(shortDate('not-a-day')).toBe('');
  });
  test('clockTime is the 24-hour local time', () => {
    expect(clockTime(new Date(2026, 8, 17, 7, 2).getTime())).toBe('7:02');
    expect(clockTime(NaN)).toBe('');
  });
});

describe('This week card lines (section 3 item 2)', () => {
  test('"weighed N of M mornings so far this week": a denominator, never a streak', () => {
    expect(morningsCaption({ weighed: 4, elapsed: 5 })).toBe('weighed 4 of 5 mornings so far this week');
    expect(morningsCaption({ weighed: 1, elapsed: 1 })).toBe('weighed 1 of 1 morning so far this week');
    expect(morningsCaption({ weighed: 0, elapsed: 3 })).not.toMatch(/streak|keep|miss/i);
  });

  test('the verdict: the direction over the last two weeks with its rate, in the person\'s units', () => {
    const down = { enough: true, deltaKg: -0.6, ratePerWeek: -0.3, spanDays: 14, count: 12 };
    expect(twoWeekVerdictLine(down, 'kg')).toBe('Down 0.6 kg over the last 2 weeks, about 0.3 kg a week.');
    expect(twoWeekVerdictLine({ ...down, deltaKg: 0.5, ratePerWeek: 0.25 }, 'kg'))
      .toBe('Up 0.5 kg over the last 2 weeks, about 0.25 kg a week.');
    expect(twoWeekVerdictLine({ ...down, deltaKg: -0.6, ratePerWeek: -0.6 }, 'st'))
      .toBe('Down 1.3 lbs over the last 2 weeks, about 1.3 lbs a week.');
  });

  test('steady is the ONE steady rule: a rate under 0.2 kg a week holds steady, 0.2 does not', () => {
    const steady = { enough: true, deltaKg: 0.1, ratePerWeek: 0.05, spanDays: 14, count: 12 };
    expect(twoWeekVerdictLine(steady, 'kg')).toBe('Holding steady over the last 2 weeks, about 0.05 kg a week.');
    expect(twoWeekVerdictLine({ ...steady, deltaKg: 0.4, ratePerWeek: 0.2 }, 'kg')).toMatch(/^Up 0\.4 kg/);
    expect(twoWeekVerdictLine({ enough: false, count: 3 }, 'kg')).toBeNull();
  });

  test('the spec\'s own example sentence has a rate INSIDE the steady rule, so the rule prints it as steady', () => {
    // 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 item 2 quotes "Down 0.3 kg over
    // the last 2 weeks, about 0.15 kg a week." but 0.15 kg a week is under the
    // ONE steady rule (0.2). The wording is built exactly; the rule decides which
    // sentence a reading earns, so this reading is "Holding steady".
    const specExample = { enough: true, deltaKg: -0.3, ratePerWeek: -0.15, spanDays: 14, count: 12 };
    expect(twoWeekVerdictLine(specExample, 'kg')).toBe('Holding steady over the last 2 weeks, about 0.15 kg a week.');
  });

  test('with too little to read: "Not enough weigh-ins yet for a direction: 3 of 7."', () => {
    expect(notEnoughForDirectionLine({ enough: false, count: 3 })).toBe('Not enough weigh-ins yet for a direction: 3 of 7.');
    expect(notEnoughForDirectionLine({ enough: false, count: 0 })).toBe('Not enough weigh-ins yet for a direction: 0 of 7.');
    expect(notEnoughForDirectionLine({ enough: false, count: 7, spanDays: 5 }))
      .toBe('Not enough time yet for a direction: your weigh-ins cover 5 of 7 days.');
  });

  test('this week against last, with the referent and "so far" on the open week', () => {
    const line = weekComparisonLine({
      thisWeek: { count: 5, averageKg: 82.3 }, lastWeek: { count: 6, averageKg: 82.5 }, bwu: 'kg',
    });
    expect(line).toBe("This week's average so far is 82.3 kg, 0.2 kg below last week's (5 weigh-ins against 6).");
    expect(weekComparisonLine({ thisWeek: { count: 1, averageKg: 83 }, lastWeek: { count: 2, averageKg: 82.5 }, bwu: 'kg' }))
      .toBe("This week's average so far is 83 kg, 0.5 kg above last week's (1 weigh-in against 2).");
  });

  test('it differences what is PRINTED: two averages that both read 82.3 kg are level, not "0.1 kg above"', () => {
    const line = weekComparisonLine({
      thisWeek: { count: 4, averageKg: 82.349 }, lastWeek: { count: 7, averageKg: 82.286 }, bwu: 'kg',
    });
    expect(line).toBe("This week's average so far is 82.3 kg, level with last week's (4 weigh-ins against 7).");
  });

  test('omitted until last week has two weigh-ins (and until this week has one)', () => {
    expect(weekComparisonLine({ thisWeek: { count: 3, averageKg: 82 }, lastWeek: { count: 1, averageKg: 82.5 }, bwu: 'kg' })).toBeNull();
    expect(weekComparisonLine({ thisWeek: { count: 0, averageKg: null }, lastWeek: { count: 5, averageKg: 82.5 }, bwu: 'kg' })).toBeNull();
    expect(weekComparisonLine({ thisWeek: null, lastWeek: null })).toBeNull();
  });

  test('the noise line: "Day to day your weight usually moves within 0.4 kg."', () => {
    expect(noiseLine(0.4, 'kg')).toBe('Day to day your weight usually moves within 0.4 kg.');
    expect(noiseLine(0.4, 'st')).toBe('Day to day your weight usually moves within 0.9 lbs.');
    expect(noiseLine(null, 'kg')).toBeNull();
  });

  test('the trend weight\'s (i) and day zero\'s two lines are the spec\'s words', () => {
    expect(TREND_WEIGHT_INFO).toBe('A smoothed average of your recent weigh-ins, so one heavy or light morning moves it only a little.');
    expect(DAY_ZERO_LINE).toBe('Your trend starts with your first morning weigh-in.');
    const ms = new Date(2026, 7, 3, 10).getTime();
    expect(startingWeightLine({ kg: 82, ms, bwu: 'kg' })).toBe('Starting weight from setup: 82 kg, 3 Aug');
    expect(startingWeightLine({ kg: 82, ms: NaN, bwu: 'kg' })).toBe('Starting weight from setup: 82 kg');
    expect(startingWeightLine({ kg: null, ms, bwu: 'kg' })).toBeNull();
    expect(lastWeighInCaption('2026-09-03')).toBe('last weigh-in, 3 Sep');
  });
});

describe('coachVerdictFromOutput maps the stored coaching output as useWeightTrend does', () => {
  test('the same fields, the same sign, so the verdict line and the Progress Body row read the same words', () => {
    const lastCoach = {
      weekStart: Date.UTC(2026, 8, 14),
      weight: { onTarget: false, shortfall: 1, goalPhase: 'mild_cut' },
    };
    const v = coachVerdictFromOutput(lastCoach);
    expect(v).toEqual({ onTarget: false, direction: -1, goalPhase: 'mild_cut', at: Date.UTC(2026, 8, 14) });
    // shortfall 1 on a cut: the actual rate is below the goal rate, i.e. losing faster
    expect(coachVerdictInsight(v, Date.UTC(2026, 8, 17))).toBe('Moving faster than planned.');
    const slower = coachVerdictFromOutput({ ...lastCoach, weight: { ...lastCoach.weight, shortfall: -1 } });
    expect(coachVerdictInsight(slower, Date.UTC(2026, 8, 17))).toBe('Moving slower than planned.');
    // a verdict older than a fortnight is not printed
    expect(coachVerdictInsight(v, Date.UTC(2026, 9, 17))).toBeNull();
    expect(coachVerdictFromOutput(null)).toBeNull();
    expect(coachVerdictFromOutput({ weight: { onTarget: 'x', shortfall: 'y' } })).toEqual({
      onTarget: null, direction: 0, goalPhase: null, at: null,
    });
  });

  test('the mapping matches the hook\'s lines (source parity)', () => {
    const hook = fs.readFileSync(path.join(__dirname, '..', '..', 'hooks', 'useWeightTrend.js'), 'utf8');
    for (const line of [
      "onTarget: typeof lastCoach.weight.onTarget === 'boolean' ? lastCoach.weight.onTarget : null,",
      'direction: Number.isFinite(Number(lastCoach.weight.shortfall)) ? -Number(lastCoach.weight.shortfall) : 0,',
      'goalPhase: lastCoach.weight.goalPhase ?? null,',
    ]) {
      expect(hook).toContain(line);
      expect(fs.readFileSync(path.join(__dirname, '..', 'bodyMetricsDisplay.js'), 'utf8')).toContain(line);
    }
  });
});

describe('the Trend card (section 3 item 4)', () => {
  test('the title names the window; the chart note is for stone readers only (A1)', () => {
    expect(trendTitle('3M')).toBe('Trend, last 3 months');
    expect(trendTitle('1M')).toBe('Trend, last month');
    expect(trendTitle('Y')).toBe('Trend, last year');
    expect(chartUnitNote('st')).toBe('The chart reads in kilograms.');
    expect(chartUnitNote('kg')).toBeNull();
    expect(chartUnitNote('lbs')).toBeNull();
  });

  test('the (i) says what the line, the dots and "steady" are, in the person\'s units; without "steady" under a withhold', () => {
    expect(trendInfo('kg')).toBe('The line is your trend, a smoothed average of your weigh-ins. The dots are the weigh-ins themselves. Steady means the trend moves by less than 0.2 kg a week.');
    expect(trendInfo('st')).toMatch(/less than 0\.4 lbs a week\.$/);
    expect(trendInfo('kg', { includeSteady: false })).not.toMatch(/Steady|week/);
  });

  test('the axis is fitted to the data plus the typical swing, never a fixed pad (BM-43)', () => {
    const a = fittedAxis([82.1, 82.5, 82.3], 0.4);
    expect(a.min).toBeCloseTo(81.7, 5);
    expect(a.max).toBeCloseTo(82.9, 5);
    // without a swing a small pad, and a flat series still has height
    expect(fittedAxis([82, 82], 0).max - fittedAxis([82, 82], 0).min).toBeGreaterThanOrEqual(0.8);
    expect(fittedAxis([], 0.4)).toEqual({ min: 0, max: 1 });
    // a wide series is not squeezed by the pad
    const wide = fittedAxis([70, 90], 0.4);
    expect(wide.min).toBeCloseTo(69.6, 5);
    expect(wide.max).toBeCloseTo(90.4, 5);
  });

  test('the rules sit on round numbers inside the fitted domain, two to five of them', () => {
    expect(niceAxisTicks(81.9, 82.7)).toEqual([82, 82.2, 82.4, 82.6]);
    expect(niceAxisTicks(69.6, 90.4)).toEqual([70, 75, 80, 85, 90].length === 5 ? [70, 75, 80, 85, 90] : niceAxisTicks(69.6, 90.4));
    expect(niceAxisTicks(5, 5)).toEqual([]);
    const ticks = niceAxisTicks(180.2, 183.9);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(5);
  });

  test('the label gutter fits "82.6 kg" and never goes under the default', () => {
    expect(axisGutterWidth(['82 kg'])).toBe(37);
    expect(axisGutterWidth(['82.6 kg'])).toBeGreaterThanOrEqual(48);
    expect(axisGutterWidth([])).toBe(34);
  });

  test('weekly ticks fall on Mondays between the two instants, thinned past 30', () => {
    const from = new Date(2026, 8, 4, 12).getTime(); // Fri 4 Sep
    const to = new Date(2026, 8, 17, 12).getTime();  // Thu 17 Sep
    const ticks = weeklyTickTimes(from, to);
    expect(ticks.map((t) => new Date(t).getDay())).toEqual([1, 1]);
    expect(ticks.map((t) => new Date(t).getDate())).toEqual([7, 14]);
    expect(weeklyTickTimes(to, from)).toEqual([]);
    const year = weeklyTickTimes(to - 365 * DAY, to);
    expect(year.length).toBeLessThanOrEqual(30);
  });
});

describe('Maintenance calories (section 3 item 5): the memo contract\'s own thresholds', () => {
  const root = path.join(__dirname, '..');
  const contract = fs.readFileSync(path.join(root, 'effectiveMaintenance.js'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'effectiveMaintenanceService.js'), 'utf8');
  const foodDb = fs.readFileSync(path.join(root, 'food', 'db.js'), 'utf8');

  test('the denominators are the contract\'s, pinned at their source so they cannot drift (never invented)', () => {
    expect(MAINTENANCE_MIN_WEIGH_IN_DAYS).toBe(14);
    expect(MAINTENANCE_MIN_FOOD_DAYS).toBe(5);
    expect(MAINTENANCE_FOOD_WINDOW_DAYS).toBe(7);
    expect(contract).toMatch(/Number\(foodDaysLogged\) < 5\)/);
    expect(contract).toMatch(/validWeights\.length < 14/);
    expect(contract).toMatch(/foodDays < 5 \|\| weightPoints < 14/);
    expect(service).toMatch(/newest >= nowMs - 14 \* 86400000/);
    expect(foodDb).toMatch(/startDate\.setDate\(startDate\.getDate\(\) - 6\)/);
  });

  const day = (n) => ({ loggedAt: Date.UTC(2026, 7, 1) + n * DAY, weightKg: 82 });
  const weights = (n) => Array.from({ length: n }, (_, i) => day(i));
  const NOW = Date.UTC(2026, 8, 17);
  const current = {
    resolved: { source: 'athlete_history', status: 'current', effectiveMaintenanceKcal: 2450, asOf: NOW - 2 * DAY },
    memo: { weightPoints: 23, foodDaysLogged: 6 },
    weights: weights(23),
    intake: { daysLogged: 6, avgKcal: 1625 },
  };

  test('current: the figure, "estimated" on its own line, and what it was worked out from', () => {
    const m = maintenanceModel(current, { energyUnit: 'kcal', nowMs: NOW });
    expect(m.state).toBe('current');
    expect(m.figure).toEqual({ number: '2,450', unit: 'kcal a day', estimated: 'estimated' });
    expect(nbsp(m.line)).toBe('About 2,450 kcal a day, estimated from 23 weigh-in days over the last 3 weeks and 6 logged food days in the last 7 days.');
  });

  test('being rechecked: the spec\'s words', () => {
    const m = maintenanceModel({
      ...current, resolved: { ...current.resolved, status: 'revalidating' },
    }, { nowMs: NOW });
    expect(m.state).toBe('rechecking');
    expect(nbsp(m.line)).toBe('Earlier estimate, about 2,450 kcal a day, being rechecked against your newer weigh-ins and food.');
    expect(m.figure.estimated).toBe('estimated');
  });

  test('held (older than its 14 days, nothing newer): said as what it is, with its date', () => {
    const m = maintenanceModel({
      ...current, resolved: { ...current.resolved, status: 'held', asOf: Date.UTC(2026, 8, 3) },
    }, { nowMs: NOW });
    expect(m.state).toBe('held');
    expect(nbsp(m.line)).toBe('Earlier estimate, about 2,450 kcal a day, from your logs up to 3 Sep.');
  });

  test('not ready: the days counted against the thresholds, never an instruction', () => {
    const m = maintenanceModel({
      resolved: { source: 'formula_prior', status: 'formula_prior', effectiveMaintenanceKcal: 2300 },
      memo: null,
      weights: weights(9).map((w, i) => ({ ...w, loggedAt: NOW - (9 - i) * DAY })),
      intake: { daysLogged: 3, avgKcal: 1500 },
    }, { nowMs: NOW });
    expect(m.state).toBe('building');
    expect(m.kcal).toBeNull();
    expect(m.figure).toBeNull();
    expect(m.line).toBe('Not ready yet. It needs 14 weigh-in days (you have 9) and 5 days of logged food in the last 7 (you have 3).');
    expect(m.line).not.toMatch(/keep|log your|should|try/i);
  });

  test('not ready caps a met threshold at its denominator, and names a stale last weigh-in', () => {
    const met = maintenanceModel({
      resolved: { source: 'formula_prior', status: 'formula_prior' },
      weights: weights(30).map((w, i) => ({ ...w, loggedAt: NOW - (30 - i) * DAY })),
      intake: { daysLogged: 2 },
    }, { nowMs: NOW });
    expect(met.line).toBe('Not ready yet. It needs 14 weigh-in days (you have 14) and 5 days of logged food in the last 7 (you have 2).');
    const stale = maintenanceModel({
      resolved: { source: 'formula_prior', status: 'formula_prior' },
      weights: weights(30),
      intake: { daysLogged: 5 },
    }, { nowMs: NOW });
    expect(stale.line).toBe('Not ready yet. It needs a weigh-in from the last 14 days and 5 days of logged food in the last 7 (you have 5).');
    expect(maintenanceModel(null, { nowMs: NOW }).line).toBe('Not ready yet. It needs 14 weigh-in days (you have 0) and 5 days of logged food in the last 7 (you have 0).');
  });

  test('a formula figure is never printed as the person\'s maintenance (BM-13, D201)', () => {
    const m = maintenanceModel({
      resolved: { source: 'formula_prior', status: 'formula_prior', effectiveMaintenanceKcal: 2300 },
      weights: [], intake: null,
    }, { nowMs: NOW });
    expect(m.figure).toBeNull();
    expect(m.line).not.toMatch(/2,?300/);
  });

  test('kilojoule readers read kilojoules, grouped', () => {
    const m = maintenanceModel(current, { energyUnit: 'kj', nowMs: NOW });
    expect(m.figure.unit).toBe('kJ a day');
    expect(m.figure.number).toBe('10,251');
  });

  test('the intake line, or nothing when no day was logged (BM-12)', () => {
    expect(nbsp(intakeLine({ daysLogged: 3, avgKcal: 1625 }, 'kcal'))).toBe('Over the last 7 days you logged food on 3 days, averaging 1,625 kcal.');
    expect(nbsp(intakeLine({ daysLogged: 1, avgKcal: 1625 }, 'kcal'))).toBe('Over the last 7 days you logged food on 1 day, averaging 1,625 kcal.');
    expect(intakeLine({ daysLogged: 0, avgKcal: null }, 'kcal')).toBeNull();
    expect(intakeLine(null, 'kcal')).toBeNull();
  });

  test('the plain name and the (i) carry "effective maintenance" and the method', () => {
    expect(MAINTENANCE_TITLE).toBe('Maintenance calories');
    expect(MAINTENANCE_INFO).toMatch(/effective maintenance/);
    expect(MAINTENANCE_INFO).toMatch(/estimate from your food and weight logs/);
    expect(MAINTENANCE_INFO).toMatch(/14 weigh-in days and 5 logged food days in the last 7/);
  });
});

describe('History (section 3 item 8)', () => {
  test('weekly group header: "Week of 15 Sep · average 82.3 kg · 5 weigh-ins", "so far" on the open week', () => {
    const monday = new Date(2026, 8, 14).getTime();
    expect(weekGroupHeader({ weekStartMs: monday, count: 5, averageKg: 82.3, open: false, bwu: 'kg' }))
      .toBe('Week of 14 Sep · average 82.3 kg · 5 weigh-ins');
    expect(weekGroupHeader({ weekStartMs: monday, count: 1, averageKg: 82.3, open: true, bwu: 'kg' }))
      .toBe('Week of 14 Sep · average so far 82.3 kg · 1 weigh-in');
    expect(weekGroupHeader({ weekStartMs: monday, count: 0, averageKg: null, open: false, bwu: 'kg' }))
      .toBe('Week of 14 Sep · no weigh-ins');
  });

  test('the row: "Tue 16 Sep · 82.5 kg" with the note, the setup marker read as what it is', () => {
    expect(historyRowTitle({ metric_date: '2026-09-15', body_weight: 82.5 }, 'kg')).toBe('Tue 15 Sep · 82.5 kg');
    expect(historyRowTitle({ metric_date: '2026-09-15', body_weight: 82.3 }, 'st')).toBe('Tue 15 Sep · 12 st 13.5 lbs');
    expect(historyRowTitle({ metric_date: '2026-09-15', body_weight: null }, 'kg')).toBe('Tue 15 Sep · Measurements');
    expect(noteForDisplay({ notes: '  after the holiday ' })).toBe('after the holiday');
    expect(noteForDisplay({ notes: 'enrolment' })).toBe('Starting weight from setup');
    expect(noteForDisplay({ notes: 'Starting weight (from onboarding)' })).toBe('Starting weight (from onboarding)');
    expect(noteForDisplay({ notes: '' })).toBe('');
  });

  test('a row\'s detail: body fat in points of percent and the sites in cm, the first three then a count', () => {
    const labels = { chest: 'Chest', waist: 'Waist', hips: 'Hips', calves: 'Calves' };
    expect(historyRowDetail({ body_fat: 18, waist: 84 }, labels)).toBe('Body fat 18%, Waist 84 cm');
    expect(historyRowDetail({ body_fat: 18, chest: 104, waist: 84, hips: 96, calves: 38 }, labels))
      .toBe('Body fat 18%, Chest 104 cm, Waist 84 cm and 2 more');
    expect(historyRowDetail({ body_weight: 82 }, labels)).toBe('');
  });

  test('the replace notice names the earlier weigh-in\'s time and weight, before saving', () => {
    const seven = new Date(2026, 8, 17, 7, 2).getTime();
    expect(replaceNotice({ existing: { metric_date: '2026-09-17', body_weight: 82.4, loggedAt: seven }, todayKey: '2026-09-17', bwu: 'kg' }))
      .toBe("This replaces today's 7:02 weigh-in of 82.4 kg.");
    // a date-only stamp (local midnight) has no time of day to name
    const midnight = new Date(2026, 8, 17).getTime();
    expect(replaceNotice({ existing: { metric_date: '2026-09-17', body_weight: 82.4, loggedAt: midnight }, todayKey: '2026-09-17', bwu: 'kg' }))
      .toBe("This replaces today's weigh-in of 82.4 kg.");
    expect(replaceNotice({ existing: { metric_date: '2026-09-16', body_weight: 82.4, loggedAt: midnight - DAY }, todayKey: '2026-09-17', bwu: 'kg' }))
      .toBe('This replaces the weigh-in of 82.4 kg on Wed 16 Sep.');
    expect(replaceNotice({ existing: null, todayKey: '2026-09-17', bwu: 'kg' })).toBeNull();
    expect(replaceNotice({ existing: { metric_date: '2026-09-17', body_weight: null }, todayKey: '2026-09-17', bwu: 'kg' })).toBeNull();
  });
});

describe('Body fat and measurements (section 3 item 7)', () => {
  const at = (v, d) => ({ value: v, metric_date: d });
  test('the change against the previous reading carries both dates', () => {
    expect(readingChangeLine(at(84, '2026-09-17'), at(86, '2026-08-03'), 'cm')).toBe('Down 2 cm from 86 cm on 3 Aug.');
    expect(readingChangeLine(at(88.5, '2026-09-17'), at(86, '2026-08-03'), 'cm')).toBe('Up 2.5 cm from 86 cm on 3 Aug.');
    expect(readingChangeLine(at(86, '2026-09-17'), at(86, '2026-08-03'), 'cm')).toBe('Level with 86 cm on 3 Aug.');
    expect(readingChangeLine(at(18, '2026-09-17'), at(19, '2026-08-03'), '%')).toBe('Down from 19% on 3 Aug.');
    expect(readingChangeLine(at(18.5, '2026-09-17'), at(18, '2026-08-03'), '%')).toBe('Up from 18% on 3 Aug.');
    expect(readingChangeLine(at(18, '2026-09-17'), null, '%')).toBeNull();
  });

  test('"how to measure" is one (i) naming every site, comparable and plain', () => {
    for (const site of ['Chest', 'Shoulders', 'Arms (flexed)', 'Forearms', 'Waist', 'Hips', 'Quads', 'Hamstrings', 'Calves']) {
      expect(MEASURE_HOW_INFO).toContain(site);
    }
  });
});

describe('every sentence this module speaks (D204, D207, one dash style)', () => {
  test('no em dash anywhere in the module, and no instruction verbs in what it says to the athlete', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bodyMetricsDisplay.js'), 'utf8');
    // lines this lane wrote, from the D214 addendum 4 banner down
    const mine = src.slice(src.indexOf('D214 addendum 4 (Body metrics, lane 7): the screen'));
    expect(mine).not.toMatch(/—/);
    const spoken = [
      morningsCaption({ weighed: 4, elapsed: 5 }),
      twoWeekVerdictLine({ enough: true, deltaKg: -0.3, ratePerWeek: -0.15 }, 'kg'),
      notEnoughForDirectionLine({ count: 3 }),
      noiseLine(0.4, 'kg'),
      TREND_WEIGHT_INFO, DAY_ZERO_LINE, MAINTENANCE_INFO, MEASURE_HOW_INFO, trendInfo('kg'),
      maintenanceModel(null, { nowMs: 0 }).line,
    ].join(' ');
    expect(spoken).not.toMatch(/\b(should|must|try to|you need to|make sure|keep logging|log your)\b/i);
    expect(spoken).not.toMatch(/\/10|\/5/);
  });
});
