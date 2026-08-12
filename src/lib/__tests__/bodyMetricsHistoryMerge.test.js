/**
 * BUG-WEIGHT-HISTORY (2026-07-11): pins the fixed History contract.
 *
 * Root cause: Home's quick weigh-in widget (HomeScreen.handleLogWeight)
 * writes to morning_weights, while this screen's "Log weight" form writes to
 * body_metric_log, and loadHistory() only ever read body_metric_log.
 * getLatestBodyWeight (used for the CURRENT weight shown elsewhere, e.g.
 * HomeScreen's stat tile) already merges both tables, so the founder saw
 * CURRENT weight move while History stayed frozen -- every day logged from
 * Home was invisible to this screen.
 *
 * Fix: BodyMetricsScreen.mergeMorningWeightsIntoHistory folds in any
 * calendar day that has ONLY a morning_weights row. A day that already has a
 * body_metric_log entry is left untouched (no field-merging), so one save
 * never produces two rows and edit/delete keep targeting the real,
 * user-editable body_metric_log record for that day.
 */
import { mergeMorningWeightsIntoHistory } from '../bodyMetricsHistoryMerge';

function bodyMetricEntry(metric_date, body_weight, id = `bm-${metric_date}`) {
  return {
    id, metric_date, body_weight,
    body_fat: null, chest: null, shoulders: null, arms: null, forearms: null,
    waist: null, hips: null, quads: null, hamstrings: null, calves: null,
    notes: '', source: 'body_metric_log',
  };
}

function morningRow({ id, loggedAt, weightKg, deletedAt = null, notes = null }) {
  return { id, loggedAt, weightKg, deletedAt, notes };
}

describe('mergeMorningWeightsIntoHistory (BUG-WEIGHT-HISTORY fix)', () => {
  test('two saves via the on-screen form -> two dated body_metric_log history rows, most recent first', () => {
    // Same-shaped as loadHistory's bodyMetricEntries: getBodyMetricLog already
    // orders most-recent-first (by logged_at DESC), which rowToEntry preserves.
    const bodyMetricEntries = [
      bodyMetricEntry('2026-07-02', 79.8, 'bm2'),
      bodyMetricEntry('2026-07-01', 80.2, 'bm1'),
    ];

    const merged = mergeMorningWeightsIntoHistory(bodyMetricEntries, []);

    expect(merged).toHaveLength(2);
    expect(merged.map(e => e.id)).toEqual(['bm2', 'bm1']);
    expect(merged[0].body_weight).toBe(79.8);
    expect(merged[1].body_weight).toBe(80.2);
  });

  test('a morning_weights-only day (Home quick weigh-in) appears as its own dated history row', () => {
    const bodyMetricEntries = [bodyMetricEntry('2026-07-01', 80.2, 'bm1')];
    const morningRows = [
      morningRow({ id: 'mw1', loggedAt: new Date('2026-07-03T07:00:00').getTime(), weightKg: 79.5 }),
    ];

    const merged = mergeMorningWeightsIntoHistory(bodyMetricEntries, morningRows);

    expect(merged).toHaveLength(2);
    // Most-recent-first: the later morning weigh-in leads.
    expect(merged[0]).toMatchObject({ id: 'mw1', body_weight: 79.5, source: 'morning_weight' });
    expect(merged[1]).toMatchObject({ id: 'bm1', body_weight: 80.2, source: 'body_metric_log' });
  });

  test('a day with BOTH a body_metric_log row and a morning_weights row never duplicates: the body_metric_log row wins untouched', () => {
    const sameDay = '2026-07-01';
    const bodyMetricEntries = [bodyMetricEntry(sameDay, 80.2, 'bm1')];
    const morningRows = [
      morningRow({ id: 'mw1', loggedAt: new Date(`${sameDay}T07:00:00`).getTime(), weightKg: 79.9 }),
    ];

    const merged = mergeMorningWeightsIntoHistory(bodyMetricEntries, morningRows);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 'bm1', body_weight: 80.2, source: 'body_metric_log' });
  });

  test('soft-deleted, zero, negative and non-finite morning_weights rows are excluded', () => {
    const merged = mergeMorningWeightsIntoHistory([], [
      morningRow({ id: 'deleted', loggedAt: 1, weightKg: 80, deletedAt: 999 }),
      morningRow({ id: 'zero', loggedAt: 2, weightKg: 0 }),
      morningRow({ id: 'negative', loggedAt: 3, weightKg: -5 }),
      morningRow({ id: 'nan', loggedAt: 4, weightKg: NaN }),
      morningRow({ id: 'ok', loggedAt: 5, weightKg: 81.1 }),
    ]);

    expect(merged.map(e => e.id)).toEqual(['ok']);
  });

  test('caps merged history at the given limit', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      bodyMetricEntry(`2026-01-${String(i + 1).padStart(2, '0')}`, 80));
    const merged = mergeMorningWeightsIntoHistory(many, [], 50);
    expect(merged).toHaveLength(50);
  });
});

/**
 * X3 (cross-surface audit 2026-07-30): buildWeighInSeries.
 *
 * This function is NOT the safety path and must never be wired into it.
 * X3 was closed by the D90 write-through (2026-08-06, c569e00c): a
 * deliberate positive weight entered through Body Metrics is written into
 * the canonical `morning_weights` series at entry time, so the rapid-loss
 * gate already sees it without `body_metric_log` becoming a second
 * evidence source. The merge-at-read approach was reverted (dd67bbf4).
 *
 * These pin the merge helper's own behaviour for history/trend use: no
 * floor, gate or threshold is asserted here, only that the series is
 * complete, deduped by day, and ordered.
 */
describe('buildWeighInSeries merges weigh-in history (X3, non-safety use)', () => {
  // eslint-disable-next-line global-require
  const { buildWeighInSeries } = require('../bodyMetricsHistoryMerge');

  const bodyLog = (date, kg) => ({ metric_date: date, body_weight: kg });
  const morning = (date, kg) => ({
    id: `m-${date}`,
    loggedAt: new Date(`${date}T07:00:00`).getTime(),
    weightKg: kg,
    deletedAt: null,
  });

  test('form-logged weigh-ins are INCLUDED, not dropped', () => {
    const s = buildWeighInSeries([bodyLog('2026-07-20', 82)], []);
    expect(s).toHaveLength(1);
    expect(s[0].weightKg) .toBe(82);
  });

  test('both tables combine into one series', () => {
    const s = buildWeighInSeries(
      [bodyLog('2026-07-20', 82), bodyLog('2026-07-22', 81.5)],
      [morning('2026-07-21', 81.8)],
    );
    expect(s.map(e => e.weightKg)).toEqual([82, 81.8, 81.5]);
  });

  test('a day present in BOTH tables counts once, never twice', () => {
    const s = buildWeighInSeries([bodyLog('2026-07-20', 82)], [morning('2026-07-20', 99)]);
    expect(s).toHaveLength(1);
    // body_metric_log is the richer, user-editable record and wins the day.
    expect(s[0].weightKg).toBe(82);
  });

  test('oldest-first, which is what computeEWMA expects', () => {
    const s = buildWeighInSeries(
      [bodyLog('2026-07-25', 80), bodyLog('2026-07-20', 82)],
      [],
    );
    expect(s[0].loggedAt).toBeLessThan(s[1].loggedAt);
  });

  test('non-positive, missing and malformed rows are dropped, never zero-filled', () => {
    const s = buildWeighInSeries(
      [bodyLog('2026-07-20', 0), bodyLog('2026-07-21', null), bodyLog('bad-date', 80), bodyLog('2026-07-22', 81)],
      [],
    );
    expect(s).toHaveLength(1);
    expect(s[0].weightKg).toBe(81);
  });

  test('a soft-deleted morning row never reaches the gates', () => {
    const s = buildWeighInSeries([], [{ ...morning('2026-07-20', 82), deletedAt: Date.now() }]);
    expect(s).toHaveLength(0);
  });
});
