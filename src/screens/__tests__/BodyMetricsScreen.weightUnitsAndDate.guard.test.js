/**
 * BodyMetricsScreen.weightUnitsAndDate.guard.test.js
 *
 * BUILD LANE A (progress-tab audit 2026-09-24, second pass). Source guard,
 * matching the repo convention for this screen: pins that the screen is wired
 * to the shared bodyMetricsDisplay.js helpers rather than a hand-rolled,
 * re-diverging label/date computation. The behavioural contract for those
 * functions is pinned against the real functions in
 * src/lib/__tests__/bodyMetricsDisplay.test.js.
 *
 * RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; section 6 table:
 * `BodyMetricsScreen.*` guards (weightUnitsAndDate)). The screen was rebuilt
 * on the same two laws, in their new places:
 *   A1: the chart's plotted value, its axis and its tooltip unit label must
 *   agree (a pounds user once read "82.5 lbs" on a true 82.5 kg). The chart
 *   still reads kilograms for a stone user, now with its one-line note
 *   ("The chart reads in kilograms."), and everything ELSE on the screen is
 *   in stones and pounds (item 11, BM-28): weights through `formatBodyWeight`
 *   (one spelling), changes and swings through `formatWeightAmount`, rates as
 *   "lb a week" through `formatWeightRatePerWeek`.
 *   A2: the "Weight - Today" header (which fell back to "Today" for an
 *   unparseable date) is GONE; every date on the screen is a real day key
 *   through the shared date helpers.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('A1: the chart is wired to the shared unit mapping, not a hand-rolled label', () => {
  test('imports the shared helpers from the dependency-free lib module', () => {
    expect(SOURCE).toMatch(/weightChartUnitLabel, weightChartValue, weightChartTooltipTitle,/);
    expect(SOURCE).toMatch(/from '\.\.\/lib\/bodyMetricsDisplay';/);
  });

  test('the chart data, axis, suffix and tooltip all call the shared helpers', () => {
    expect(SOURCE).toMatch(/value: weightChartValue\(w\.trend, bwu\)/);
    expect(SOURCE).toMatch(/value: weightChartValue\(w\.kg, bwu\)/);
    expect(SOURCE).toMatch(/const axisMin = weightChartValue\(axisKg\.min, bwu\);/);
    expect(SOURCE).toMatch(/const axisMax = weightChartValue\(axisKg\.max, bwu\);/);
    expect(SOURCE).toMatch(/const unit = weightChartUnitLabel\(bwu\);/);
    expect(SOURCE).toMatch(/yAxisSuffix=\{` \$\{unit\}`\}/);
    expect(SOURCE).toMatch(/title: weightChartTooltipTitle\(w\.kg, bwu\)/);
    expect(SOURCE).toMatch(/weightChartValue\(w\.trend, bwu\)\.toFixed\(1\)/);
    // The old defect class: labelling straight from the display unit without
    // ever converting the plotted kg number for the 'lbs' case.
    expect(SOURCE).not.toMatch(/yAxisSuffix=\{bodyWeightUnits === 'st' \? ' kg' : `\$\{bodyWeightUnits \|\| 'kg'\}`\}/);
    expect(SOURCE).not.toMatch(/title: `\$\{e\.body_weight\} \$\{unit\}`/);
  });

  test('a stone user is told the chart reads in kilograms', () => {
    expect(SOURCE).toMatch(/const note = chartUnitNote\(bwu\);/);
    expect(SOURCE).toMatch(/\{note \? <Text style=\{live\.caption\}>\{note\}<\/Text> : null\}/);
  });
});

describe('A1 follow-up: the takeaway and every other figure read in the person\'s units', () => {
  test('weightTakeaway is handed formatters that carry the units; nothing is a hard-coded kg literal', () => {
    expect(SOURCE).toMatch(/formatWeight: \(kg\) => formatBodyWeight\(kg, bwu\),/);
    expect(SOURCE).toMatch(/formatAmount: \(kg\) => formatWeightAmount\(kg, bwu\),/);
    expect(SOURCE).toMatch(/formatRate: \(kgPerWeek\) => formatWeightRatePerWeek\(kgPerWeek, bwu\),/);
    expect(SOURCE).not.toMatch(/unit: 'kg'/);
    expect(SOURCE).not.toMatch(/\} kg\b/);
  });

  test('history rows, week headers and the hero use the one spelling, formatBodyWeight', () => {
    expect(SOURCE).toMatch(/formatBodyWeight\(weightTrendVm\.ewmaNow, bwu\)/);
    expect(SOURCE).toMatch(/historyRowTitle\(entry, bwu\)/);
    expect(SOURCE).toMatch(/weekGroupHeader\(\{/);
    expect(SOURCE).not.toMatch(/formatBodyWeightShort/);
  });

  test('the person can reach the units setting from this screen (campaign3 discoverability)', () => {
    expect(SOURCE).toMatch(/label="Weight units"/);
    expect(SOURCE).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'SettingsWorkout'\)/);
  });
});

describe('A2: no header that can claim "Today" for a date it cannot read', () => {
  test('the "Weight - Today" snapshot header is gone', () => {
    expect(SOURCE).not.toMatch(/weightSnapshotDateLabel/);
    expect(SOURCE).not.toMatch(/Weight - /);
    // the old defect: ANY unparseable date fell back to the literal "Today"
    expect(SOURCE).not.toMatch(/safeFormatDate\(latest\?\.metric_date, 'd MMM yyyy'\) \|\| 'Today'/);
  });

  test('the form names today only when the day key IS today', () => {
    expect(SOURCE).toMatch(/if \(dayKey === todayKey\) return 'Today';/);
  });
});
