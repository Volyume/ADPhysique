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
