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

// ─── D214 addendum 4 (Body metrics, lane 7): one entry per day, weeks, readings ──────
// RE-ANCHORED/ADDED for spec docs/audit/progress-recovery-consistency-audit-
// 2026-10-01/04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 items 2, 3, 7 and 8 and
// the section 6 table (`bodyMetricsHistoryMerge`). The legacy contract above
// (mergeMorningWeightsIntoHistory, buildWeighInSeries) is UNCHANGED and still
// pinned; the screen now reads the day entries below. Where the old merge let a
// day's measurements-only log row HIDE the day's morning weight, the day entry
// completes the one from the other.
import {
  logRowToEntry, buildDayEntries, weighInsOf, weekAverage, previousWeekStart, morningsThisWeek,
  groupEntriesByWeek, readingsOf, trendWindowRows, plausibilityReference, hasEntryBefore, noonOfDay,
  HISTORY_PAGE_WEEKS, CHART_RANGE_DAYS, READING_FIELDS,
} from '../bodyMetricsHistoryMerge';
import { localDayKey, localWeekStartMs } from '../dayKey';

const D = (y, m, d, h = 7, min = 0) => new Date(y, m - 1, d, h, min).getTime();

const logRow = (over = {}) => ({
  id: 'bm1', loggedAt: D(2026, 9, 16, 0), weightKg: 82.5, bodyFatPercent: null, bodyFatSource: null,
  chestCm: null, shouldersCm: null, armCm: null, forearmCm: null, waistCm: null, hipsCm: null,
  thighCm: null, hamCm: null, calfCm: null, notes: null, ...over,
});
const morning = (id, y, m, d, kg, notes = null, h = 7) => ({
  id, loggedAt: D(y, m, d, h), weightKg: kg, deletedAt: null, notes,
});

describe('logRowToEntry (the screen\'s old rowToEntry, now pure)', () => {
  test('maps a body_metric_log row, with its own time, ids and body-fat method', () => {
    const e = logRowToEntry(logRow({ bodyFatPercent: 18, bodyFatSource: 'caliper', waistCm: 84, notes: 'after the holiday' }));
    expect(e).toMatchObject({
      id: 'bm1', metric_date: '2026-09-16', loggedAt: D(2026, 9, 16, 0), body_weight: 82.5,
      body_fat: 18, body_fat_source: 'caliper', waist: 84, notes: 'after the holiday',
      source: 'body_metric_log', logIds: ['bm1'], morningIds: [],
    });
    expect(logRowToEntry(logRow({ notes: undefined })).notes).toBe('');
  });
});

describe('buildDayEntries: a day holds ONE weigh-in', () => {
  test('a Home weigh-in is its own day entry, source morning_weight, with its time and id', () => {
    const [e] = buildDayEntries([], [morning('mw1', 2026, 9, 17, 82.4)]);
    expect(e).toMatchObject({
      id: 'mw1', metric_date: '2026-09-17', body_weight: 82.4, source: 'morning_weight',
      logIds: [], morningIds: ['mw1'], loggedAt: D(2026, 9, 17, 7),
    });
  });

  test('a day in BOTH tables is one entry that carries both ids (so a delete can retract both)', () => {
    const [e] = buildDayEntries([logRowToEntry(logRow({ loggedAt: D(2026, 9, 16, 0) }))], [morning('mw1', 2026, 9, 16, 82.5)]);
    expect(e.source).toBe('body_metric_log');
    expect(e.id).toBe('bm1');
    expect(e.logIds).toEqual(['bm1']);
    expect(e.morningIds).toEqual(['mw1']);
  });

  test('the weight is the day\'s morning weight when there is one (the series the trend reads), else the log row\'s', () => {
    // a form entry, then a later Home weigh-in the same day replaced the series weight
    const both = buildDayEntries([logRowToEntry(logRow({ weightKg: 82.0 }))], [morning('mw1', 2026, 9, 16, 82.4)]);
    expect(both[0].body_weight).toBe(82.4);
    const logOnly = buildDayEntries([logRowToEntry(logRow({ weightKg: 82.0 }))], []);
    expect(logOnly[0].body_weight).toBe(82);
  });

  test('BM-37 / the old hiding bug: a measurements-only log row no longer hides the day\'s Home weigh-in', () => {
    const [e] = buildDayEntries(
      [logRowToEntry(logRow({ weightKg: null, waistCm: 84 }))],
      [morning('mw1', 2026, 9, 16, 82.5)],
    );
    expect(e.body_weight).toBe(82.5);
    expect(e.waist).toBe(84);
  });

  test('several log rows the same day read as the newest, completed from the older ones', () => {
    const older = logRowToEntry(logRow({ id: 'a', loggedAt: D(2026, 9, 16, 8), weightKg: 82.9, bodyFatPercent: 18, bodyFatSource: 'bia', waistCm: 84 }));
    const newer = logRowToEntry(logRow({ id: 'b', loggedAt: D(2026, 9, 16, 20), weightKg: 82.1 }));
    const [e] = buildDayEntries([older, newer], []);
    expect(e.id).toBe('b');
    expect(e.logIds).toEqual(['b', 'a']);
    expect(e.body_weight).toBe(82.1);        // the latest replaces the earlier
    expect(e.body_fat).toBe(18);             // ...and the day keeps what only the earlier row held
    expect(e.body_fat_source).toBe('bia');
    expect(e.waist).toBe(84);
  });

  test('soft-deleted, zero and non-finite morning rows never make a day', () => {
    const rows = [
      { id: 'd', loggedAt: D(2026, 9, 1), weightKg: 80, deletedAt: 5 },
      { id: 'z', loggedAt: D(2026, 9, 2), weightKg: 0, deletedAt: null },
      { id: 'n', loggedAt: D(2026, 9, 3), weightKg: NaN, deletedAt: null },
      morning('ok', 2026, 9, 4, 81),
    ];
    expect(buildDayEntries([], rows).map((e) => e.id)).toEqual(['ok']);
  });

  test('newest day first, the note is the form\'s text before the quick row\'s, the setup marker is flagged', () => {
    const entries = buildDayEntries(
      [logRowToEntry(logRow({ notes: 'ill' }))],
      [morning('mw0', 2026, 9, 10, 82, 'enrolment'), morning('mw1', 2026, 9, 16, 82.5, 'from Health')],
    );
    expect(entries.map((e) => e.metric_date)).toEqual(['2026-09-16', '2026-09-10']);
    expect(entries[0].notes).toBe('ill');
    expect(entries[1].isEnrolmentSeed).toBe(true);
    expect(entries[0].isEnrolmentSeed).toBe(false);
  });

  // Lane 7 review S1 (D214 addendum 7): a weigh-in typed through the form on the
  // setup day keeps the marker on the morning row (the write-through preserves
  // notes) but IS a weigh-in the person made, so the day is never the seed.
  test('a form weigh-in on the setup day is a weigh-in, not the seed', () => {
    const entries = buildDayEntries(
      [logRowToEntry(logRow({ loggedAt: D(2026, 9, 10, 8), weightKg: 81.2 }))],
      [morning('mw0', 2026, 9, 10, 81.2, 'enrolment')],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].isEnrolmentSeed).toBe(false);
    expect(entries[0].body_weight).toBe(81.2);
  });
});

describe('weeks: one helper for the This week card and every History group', () => {
  // Monday 14 Sep 2026 is the open week; today is Thu 17 Sep
  const NOW = D(2026, 9, 17, 12);
  const monday = localWeekStartMs(NOW);
  const entries = buildDayEntries([], [
    morning('a', 2026, 9, 14, 82.2), morning('b', 2026, 9, 15, 82.3), morning('c', 2026, 9, 16, 82.5), morning('d', 2026, 9, 17, 82.4),
    morning('e', 2026, 9, 7, 82.1), morning('f', 2026, 9, 8, 82.3), morning('g', 2026, 9, 10, 82.2),
    morning('h', 2026, 8, 31, 83.0),
    morning('x', 2026, 9, 18, 99), // tomorrow: dated after today
  ]);

  test('weekAverage is the plain mean of the Monday-anchored week\'s weigh-ins, today at most for the open week', () => {
    const open = weekAverage(entries, monday, { untilKey: '2026-09-17' });
    expect(open.count).toBe(4);
    expect(open.averageKg).toBeCloseTo((82.2 + 82.3 + 82.5 + 82.4) / 4, 8);
    const last = weekAverage(entries, previousWeekStart(monday));
    expect(last.count).toBe(3);
    expect(last.averageKg).toBeCloseTo((82.1 + 82.3 + 82.2) / 3, 8);
    // without the bound a future-dated entry would count toward "so far"
    expect(weekAverage(entries, monday).count).toBe(5);
    expect(weekAverage([], monday)).toEqual({ count: 0, averageKg: null, weekStartMs: monday });
  });

  test('weighed N of M mornings: M is the days elapsed in the Monday week including today, never a streak', () => {
    expect(morningsThisWeek(entries, NOW)).toEqual({ weighed: 4, elapsed: 4 });
    const mondayMorning = D(2026, 9, 14, 8);
    expect(morningsThisWeek(entries, mondayMorning)).toEqual({ weighed: 1, elapsed: 1 });
    expect(morningsThisWeek([], NOW)).toEqual({ weighed: 0, elapsed: 4 });
  });

  test('the setup starting weight is a point of the series but not a morning the person weighed', () => {
    const withSeed = buildDayEntries([], [morning('s', 2026, 9, 17, 82, 'enrolment')]);
    expect(weighInsOf(withSeed)).toHaveLength(1);
    expect(morningsThisWeek(withSeed, NOW)).toEqual({ weighed: 0, elapsed: 4 });
  });

  test('previousWeekStart crosses a daylight-saving change by calendar days, not 168 hours', () => {
    const springMonday = localWeekStartMs(D(2026, 3, 30, 12));
    const before = previousWeekStart(springMonday);
    expect(localDayKey(before)).toBe('2026-03-23');
    expect(new Date(before).getHours()).toBe(0);
  });

  test('History groups: eight Monday weeks, newest first, only the weeks that hold an entry, the open week marked', () => {
    const { groups, future } = groupEntriesByWeek(entries, { nowMs: NOW, weeks: HISTORY_PAGE_WEEKS });
    expect(HISTORY_PAGE_WEEKS).toBe(8);
    expect(groups.map((g) => g.key)).toEqual(['2026-09-14', '2026-09-07', '2026-08-31']);
    expect(groups[0]).toMatchObject({ open: true, count: 4 });
    expect(groups[1]).toMatchObject({ open: false, count: 3 });
    expect(groups[0].entries.map((e) => e.metric_date)).toEqual(['2026-09-17', '2026-09-16', '2026-09-15', '2026-09-14']);
    // the same averages as the This week card, from the same helper
    expect(groups[0].averageKg).toBeCloseTo(weekAverage(entries, monday, { untilKey: '2026-09-17' }).averageKg, 8);
    expect(groups[1].averageKg).toBeCloseTo(weekAverage(entries, previousWeekStart(monday)).averageKg, 8);
    // an entry dated after today is not part of any week; it comes back so it can be corrected
    expect(future.map((e) => e.metric_date)).toEqual(['2026-09-18']);
  });

  test('"Show earlier weeks": a wider page adds the earlier weeks and never an empty one', () => {
    const many = buildDayEntries([], Array.from({ length: 20 }, (_, i) => morning(`m${i}`, 2026, 9, 14, 80 + i * 0, null, 7))
      .map((r, i) => ({ ...r, loggedAt: NOW - i * 7 * 86400000 })));
    expect(groupEntriesByWeek(many, { nowMs: NOW, weeks: 8 }).groups).toHaveLength(8);
    expect(groupEntriesByWeek(many, { nowMs: NOW, weeks: 16 }).groups).toHaveLength(16);
    expect(hasEntryBefore(many, localDayKey(NOW - 7 * 7 * 86400000))).toBe(true);
    expect(hasEntryBefore([], '2026-01-01')).toBe(false);
  });
});

describe('readingsOf: the latest of ANY entry and the one before it (BM-37)', () => {
  test('body fat and a site come from whichever entries carry them, newest first', () => {
    const entries = buildDayEntries(
      [
        logRowToEntry(logRow({ id: 'a', loggedAt: D(2026, 8, 3, 0), weightKg: null, waistCm: 86, bodyFatPercent: 19, bodyFatSource: 'bia' })),
        logRowToEntry(logRow({ id: 'b', loggedAt: D(2026, 9, 10, 0), weightKg: null, waistCm: 84, bodyFatPercent: 18, bodyFatSource: 'caliper' })),
      ],
      [morning('mw', 2026, 9, 17, 82.4)], // the newest entry is a plain weigh-in: it must not hide the readings
    );
    expect(entries[0].metric_date).toBe('2026-09-17');
    const waist = readingsOf(entries, 'waist');
    expect(waist.latest).toMatchObject({ value: 84, metric_date: '2026-09-10' });
    expect(waist.previous).toMatchObject({ value: 86, metric_date: '2026-08-03' });
    const fat = readingsOf(entries, 'body_fat');
    expect(fat.latest.entry.body_fat_source).toBe('caliper');
    expect(readingsOf(entries, 'hips')).toEqual({ latest: null, previous: null });
    expect(READING_FIELDS).toContain('body_fat');
    expect(READING_FIELDS).toHaveLength(10);
  });
});

describe('trendWindowRows: the hook\'s own windowing, so the two screens print one trend weight', () => {
  const RealNow = Date.now;
  afterEach(() => { Date.now = RealNow; });
  const rows = (agoDays) => agoDays.map((d, i) => ({ id: `r${i}`, loggedAt: Date.now() - d * 86400000, weightKg: 80 }));

  test('only the real trailing 90 DAYS count (D97-22 R-2)', () => {
    Date.now = () => D(2026, 9, 17, 12);
    const kept = trendWindowRows(rows([120, 95, 80, 40, 2]));
    expect(kept.map((r) => r.id)).toEqual(['r2', 'r3', 'r4']);
  });

  test('a reading inside the 14-day boundary, or nothing (D97-25 RB6-1)', () => {
    Date.now = () => D(2026, 9, 17, 12);
    expect(trendWindowRows(rows([80, 40, 15]))).toEqual([]);
    expect(trendWindowRows(rows([80, 40, 13]))).toHaveLength(3);
    expect(trendWindowRows(null)).toEqual([]);
  });
});

describe('plausibilityReference: the weigh-in a typed weight is compared with', () => {
  const entries = buildDayEntries([], [
    morning('a', 2026, 9, 10, 82), morning('b', 2026, 9, 14, 83), morning('c', 2026, 9, 17, 82.4),
  ]);
  test('the newest weigh-in BEFORE the entry\'s day; an entry for a past day is never judged against today', () => {
    expect(plausibilityReference(entries, '2026-09-18')).toEqual({ kg: 82.4, dayKey: '2026-09-17' });
    expect(plausibilityReference(entries, '2026-09-12')).toEqual({ kg: 82, dayKey: '2026-09-10' });
  });
  test('the entry\'s own day is skipped (it is the weigh-in being replaced); before the first, the first after', () => {
    expect(plausibilityReference(entries, '2026-09-17')).toEqual({ kg: 83, dayKey: '2026-09-14' });
    expect(plausibilityReference(entries, '2026-09-01')).toEqual({ kg: 82, dayKey: '2026-09-10' });
    expect(plausibilityReference([], '2026-09-01')).toBeNull();
  });
});

test('the chart range is a year and a day, so the whole 1-year window is in the read (BM-5)', () => {
  expect(CHART_RANGE_DAYS).toBe(366);
  expect(noonOfDay('2026-09-17')).toBe(D(2026, 9, 17, 12));
  expect(noonOfDay('x')).toBeNaN();
});
