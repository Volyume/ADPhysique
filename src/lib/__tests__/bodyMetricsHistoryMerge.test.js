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
