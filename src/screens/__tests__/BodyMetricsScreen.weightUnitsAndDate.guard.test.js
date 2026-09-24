/**
 * BodyMetricsScreen.weightUnitsAndDate.guard.test.js
 *
 * BUILD LANE A (progress-tab audit 2026-09-24, second pass). Source guard,
 * matching the repo convention for this screen (see
 * BodyMetricsScreen.weightTrendParity.guard.test.js): pins that the screen
 * is wired to the shared bodyMetricsDisplay.js helpers rather than a
 * hand-rolled, re-diverging label/date computation. The behavioural
 * contract for those functions themselves is pinned against the real
 * functions in src/lib/__tests__/bodyMetricsDisplay.test.js (no mount
 * needed there; this screen pulls in react-native-svg via VolyumeChart).
 *
 * A1: WeightTrendChart's plotted value/min/max and its axis/tooltip unit
 * label must agree. THE DEFECT: the chart always plotted canonical kg but
 * labelled the axis/tooltip straight from bodyWeightUnits -- for a pounds
 * user that put "lbs" on a true kg number (a true 82.5 kg read "82.5 lbs").
 * A1 follow-up (same pass, founder "fix it all" scope): the takeaway
 * banner above the chart (chartWindows.js weightTakeaway) had the SAME
 * defect class in miniature -- it always read in kg regardless of
 * bodyWeightUnits. Its `unit`/`toDisplay` params are now wired to the
 * SAME chartUnit/weightChartValue the chart itself uses.
 *
 * A2: the snapshot header used to default to the literal string "Today" for
 * ANY unparseable stored date.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('A1: WeightTrendChart is wired to the shared unit mapping, not a hand-rolled label', () => {
  test('imports the shared helpers from the dependency-free lib module', () => {
    expect(SOURCE).toMatch(
      /import \{\s*weightChartUnitLabel, weightChartValue, weightChartTooltipTitle, weightSnapshotDateLabel,\s*\} from '\.\.\/lib\/bodyMetricsDisplay';/,
    );
  });

  test('the chart data/min/max/yAxisSuffix/formatTooltip all call the shared helpers', () => {
    expect(SOURCE).toMatch(/value: weightChartValue\(e\.body_weight, bodyWeightUnits\)/);
    expect(SOURCE).toMatch(/const chartUnit = weightChartUnitLabel\(bodyWeightUnits\);/);
    expect(SOURCE).toMatch(/yAxisSuffix=\{`\s*\$\{chartUnit\}`\}/);
    expect(SOURCE).toMatch(/min=\{Math\.floor\(Math\.min\(\.\.\.weights\.map\(w => weightChartValue\(w, bodyWeightUnits\)\)\) - 1\)\}/);
    expect(SOURCE).toMatch(/max=\{Math\.ceil\(Math\.max\(\.\.\.weights\.map\(w => weightChartValue\(w, bodyWeightUnits\)\)\) \+ 1\)\}/);
    expect(SOURCE).toMatch(/title: weightChartTooltipTitle\(e\.body_weight, bodyWeightUnits\)/);
    expect(SOURCE).toMatch(/weightChartValue\(trend, bodyWeightUnits\)\.toFixed\(1\)/);
    // The old defect class: labelling straight from bodyWeightUnits without
    // ever converting the plotted kg number for the 'lbs' case.
    expect(SOURCE).not.toMatch(/yAxisSuffix=\{bodyWeightUnits === 'st' \? ' kg' : `\$\{bodyWeightUnits \|\| 'kg'\}`\}/);
    expect(SOURCE).not.toMatch(/title: `\$\{e\.body_weight\} \$\{unit\}`/);
    expect(SOURCE).not.toMatch(/min=\{Math\.floor\(Math\.min\(\.\.\.weights\) - 1\)\}/);
  });
});

describe('A1 follow-up: the takeaway banner reads in the same unit as the chart', () => {
  test('weightTakeaway is called with the chart\'s own unit and a toDisplay that converts through weightChartValue', () => {
    expect(SOURCE).toMatch(/ewma: smoothed, unit: chartUnit, edFlagOpen,/);
    expect(SOURCE).toMatch(/toDisplay: \(v\) => weightChartValue\(v, bodyWeightUnits\),/);
    // The old defect: a hard-coded kg literal, unconditional on bodyWeightUnits.
    expect(SOURCE).not.toMatch(/ewma: smoothed, unit: 'kg', edFlagOpen,/);
  });
});

describe('A2: the snapshot header is wired to weightSnapshotDateLabel, not a bare "|| \'Today\'" fallback', () => {
  test('calls the shared helper with the latest entry\'s metric_date', () => {
    expect(SOURCE).toMatch(/Weight - \{weightSnapshotDateLabel\(latest\?\.metric_date\)\}/);
    // The old defect: ANY unparseable date (safeFormatDate returning '')
    // fell back to the literal "Today", regardless of whether it actually
    // was today.
    expect(SOURCE).not.toMatch(/safeFormatDate\(latest\?\.metric_date, 'd MMM yyyy'\) \|\| 'Today'/);
  });
});
