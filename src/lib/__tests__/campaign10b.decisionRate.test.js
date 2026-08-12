/**
 * campaign10b.decisionRate.test.js — Work 1.
 *
 * robustRatePct is the DECISION read: it feeds onTarget /
 * offTargetDirection, and through them the calorie adjustment. It is
 * compared against phase.goalRatePct, which is stated PER WEEK, so the
 * elapsed span has to be divided out. These pin the maths and pin the
 * nutrition policy AROUND it as unchanged.
 */
import { robustTrackingSevenDaysAgoPoint, robustTrackingSevenDaysAgo, robustTrackingLatest } from '../robustTrend';

const DAY = 86400000;
const NOW = new Date('2026-08-12T09:00:00Z').getTime();

/** Three clustered readings `gapDays` back, then one today. */
const gapSeries = (from, to, gapDays) => ([
  { weightKg: from, loggedAt: NOW - gapDays * DAY },
  { weightKg: from, loggedAt: NOW - (gapDays - 1) * DAY },
  { weightKg: from, loggedAt: NOW - (gapDays - 2) * DAY },
  { weightKg: to, loggedAt: NOW },
]);

/** The rate the engine now computes, mirroring weeklyCoach exactly. */
function decisionRate(series, bwRef, nowMs = NOW) {
  const now = robustTrackingLatest(series);
  const point = robustTrackingSevenDaysAgoPoint(series, {}, nowMs);
  if (now == null || point == null) return null;
  const delta = Math.round((now - point.ewmaKg) * 100) / 100;
  const days = (nowMs - point.loggedAt) / DAY;
  const weeks = Math.max(1, days / 7);
  return ((delta / bwRef) * 100) / weeks;
}
/** What it computed before the fix. */
function legacyRate(series, bwRef, nowMs = NOW) {
  const now = robustTrackingLatest(series);
  const prior = robustTrackingSevenDaysAgo(series, {}, nowMs);
  if (now == null || prior == null) return null;
  return ((Math.round((now - prior) * 100) / 100) / bwRef) * 100;
}

describe('the comparator now carries its own timestamp', () => {
  test('the point helper and the value helper agree', () => {
    const s = gapSeries(80, 76, 30);
    expect(robustTrackingSevenDaysAgoPoint(s, {}, NOW).ewmaKg)
      .toBe(robustTrackingSevenDaysAgo(s, {}, NOW));
    expect(robustTrackingSevenDaysAgoPoint(s, {}, NOW).loggedAt).toBe(NOW - 28 * DAY);
  });

  test('sub-week data still returns null rather than being scaled up (F3/EN-1)', () => {
    const tooNew = [
      { weightKg: 80, loggedAt: NOW - 3 * DAY },
      { weightKg: 79, loggedAt: NOW - 2 * DAY },
      { weightKg: 78, loggedAt: NOW },
    ];
    expect(robustTrackingSevenDaysAgoPoint(tooNew, {}, NOW)).toBeNull();
    expect(robustTrackingSevenDaysAgo(tooNew, {}, NOW)).toBeNull();
  });
});

describe('the same total change no longer means the same rate across any gap', () => {
  // 4 kg off 80 kg = 5% total, at four different elapsed spans.
  const cases = [
    { gap: 9, minWeeks: 1 },
    { gap: 30, minWeeks: 4 },
    { gap: 90, minWeeks: 12 },
    { gap: 180, minWeeks: 25 },
  ];

  test('a 7-day comparator is unchanged by the fix', () => {
    const s = gapSeries(80, 76, 9);
    expect(decisionRate(s, 80)).toBeCloseTo(legacyRate(s, 80), 6);
  });

  test.each(cases)('a $gap-day gap divides by the real span', ({ gap, minWeeks }) => {
    const s = gapSeries(80, 76, gap);
    const fixed = decisionRate(s, 80);
    const legacy = legacyRate(s, 80);
    expect(fixed).toBeLessThan(0);                 // the loss is never discarded
    expect(Math.abs(fixed)).toBeLessThanOrEqual(Math.abs(legacy) + 1e-9);
    if (minWeeks > 1) {
      // Materially smaller: the longer the gap, the smaller the weekly rate.
      expect(Math.abs(fixed)).toBeLessThan(Math.abs(legacy));
      expect(Math.abs(fixed)).toBeCloseTo(Math.abs(legacy) / (gap - 2) * 7, 4);
    }
  });

  test('the longer the gap, the smaller the weekly rate, monotonically', () => {
    const rates = cases.map(c => Math.abs(decisionRate(gapSeries(80, 76, c.gap), 80)));
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeLessThan(rates[i - 1]);
  });
});

describe('the nutrition policy around the rate is untouched', () => {
  const read = () => require('fs').readFileSync(require('path').resolve(__dirname, '../weeklyCoach.js'), 'utf8');

  test('the on-target band and its floor are unchanged', () => {
    expect(read()).toMatch(/Math\.max\(0\.2 \* Math\.abs\(phase\.goalRatePct\) \+ 0\.05, 0\.15\)/);
  });

  test('the adjust gate and the rapid-loss line are unchanged', () => {
    const src = read();
    expect(src).toMatch(/if \(canAdjustCals && \(rapidLossOverride \|\| !onTarget\)\)/);
    expect(src).toMatch(/actualRatePct <= -1\.5/);
  });

  test('safety still reads the plain trend, not this robust one', () => {
    const src = read();
    // The rapid-loss flag reads actualRatePct; the robust read feeds only
    // the decision. Both are now normalised, neither is merged.
    expect(src).toMatch(/const decisionRatePct = robustRatePct != null \? robustRatePct : actualRatePct;/);
    expect(src).toMatch(/rapidWeightLossFlag = !!\(/);
  });
});
