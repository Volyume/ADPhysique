/**
 * D214 addendum 4 (Body metrics, 2026-10-02): the display readings the lead
 * added to the shared derivation. Pins, against the real functions:
 *  - twoWeekTrend reads the smoothed series inside the last 14 days and needs
 *    7 points over 7 or more days, so a few days of noise never print as a
 *    direction; its rate is normalised to seven days;
 *  - "steady" has ONE definition, STEADY_RATE_KG_PER_WEEK, read by the
 *    direction words and by the flag sentence alike;
 *  - the Body row's fallback headline is the direction with its window and no
 *    figure, never the maintenance sentence (BM-15);
 *  - an empty series with a weigh-in of any age behind it is a LAPSED trend
 *    (BM-3): the line says when the last was, no figure; under an open flag it
 *    claims only what is kept; under calm mode the calm line;
 *  - with no weigh-in at all the calm line promises rather than claims (BM-17);
 *  - the flag sentence claims no stability when the rate is unknown, says
 *    "broadly stable" only within the steady rule, and carries no "slightly"
 *    and no digit (BM-16);
 *  - typicalDailySwingKg is the upper quartile of the consecutive-morning
 *    changes over 28 days, from 10 weigh-ins, and agoPhrase never prints a
 *    decimal.
 */
const fs = require('fs');
const path = require('path');
const {
  deriveWeightTrend, twoWeekTrend, trendDirection, typicalDailySwingKg, agoPhrase, lapsedInsight,
  STEADY_RATE_KG_PER_WEEK, DIRECTION_MIN_POINTS, CALM_INSIGHT, CALM_INSIGHT_NONE, ED_KEPT_INSIGHT,
} = require('../weightTrend');

const DAY = 86400000;
const NOW = Date.UTC(2026, 9, 2, 7);
// n smoothed points one day apart ending today, moving perDay kg a day.
function daily(n, { startKg = 80, perDay = 0, endDaysAgo = 0 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const kg = startKg + i * perDay;
    return { ewma: kg, weightKg: kg, date: new Date(NOW - (n - 1 - i + endDaysAgo) * DAY).toISOString() };
  });
}
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'weightTrend.js'), 'utf8');

describe('twoWeekTrend: the direction reading over the last 14 days', () => {
  test('14 daily points falling 0.05 kg a day: the movement, its weekly rate, the span and the count', () => {
    const tw = twoWeekTrend(daily(14, { perDay: -0.05 }), NOW);
    expect(tw).toEqual({ enough: true, deltaKg: -0.65, ratePerWeek: -0.35, spanDays: 13, count: 14 });
  });
  test('points older than 14 days are outside the reading: today and the fourteen mornings before it, a span of fourteen days', () => {
    const tw = twoWeekTrend(daily(30, { perDay: -0.05 }), NOW);
    expect(tw.count).toBe(15);
    expect(tw.spanDays).toBe(14);
    expect(tw.ratePerWeek).toBe(-0.35);
  });
  test('fewer than 7 points, or 7 points over fewer than 7 days, is no reading', () => {
    expect(twoWeekTrend(daily(6), NOW)).toEqual({ enough: false, count: 6 });
    const crowded = Array.from({ length: 7 }, (_, i) => ({ ewma: 80, date: new Date(NOW - i * 6 * 3600000).toISOString() }));
    expect(twoWeekTrend(crowded, NOW)).toEqual({ enough: false, count: 7 });
  });
  test('a point without a readable date or value is skipped, never counted', () => {
    const pts = [...daily(8), { ewma: NaN, date: new Date(NOW).toISOString() }, { ewma: 80, date: 'd9' }];
    expect(twoWeekTrend(pts, NOW).count).toBe(8);
  });
  test('trendDirection: one steady rule, either way', () => {
    expect(STEADY_RATE_KG_PER_WEEK).toBe(0.2);
    expect(trendDirection({ enough: true, ratePerWeek: 0.19 })).toBe('steady');
    expect(trendDirection({ enough: true, ratePerWeek: -0.19 })).toBe('steady');
    expect(trendDirection({ enough: true, ratePerWeek: 0.2 })).toBe('up');
    expect(trendDirection({ enough: true, ratePerWeek: -0.2 })).toBe('down');
    expect(trendDirection({ enough: false, count: 3 })).toBeNull();
    expect(trendDirection(null)).toBeNull();
  });
});

describe('the Body row fallback headline (no fresh verdict, no engine comparison)', () => {
  const burn = { confidence: 'high', adjustedTDEE: 2400, weeks: 3 };
  test('down: the direction with its window, no figure, and never the maintenance sentence (BM-15)', () => {
    const vm = deriveWeightTrend({ ewmaData: daily(20, { perDay: -0.05 }), weeklyChange: -0.3, adaptiveBurn: burn, nowMs: NOW });
    expect(vm.insight).toBe('Trending down over the last 2 weeks.');
    expect(vm.insight).not.toMatch(/maintenance|worked out/);
    expect(vm.twoWeek.enough).toBe(true);
    expect(vm.maintenance.kcal).toBe(2400);
    expect(vm.pillarFigure).toBe(true);
    expect(vm.dot).toBe('onTrack');
  });
  test('up and steady', () => {
    expect(deriveWeightTrend({ ewmaData: daily(20, { perDay: 0.05 }), adaptiveBurn: burn, nowMs: NOW }).insight).toBe('Trending up over the last 2 weeks.');
    expect(deriveWeightTrend({ ewmaData: daily(20, { perDay: 0.01 }), adaptiveBurn: burn, nowMs: NOW }).insight).toBe('Holding steady over the last 2 weeks.');
  });
  test('too few weigh-ins inside the window: the count against the seven needed', () => {
    const pts = [...daily(10, { endDaysAgo: 16 }), ...daily(5)];
    const vm = deriveWeightTrend({ ewmaData: pts, adaptiveBurn: burn, nowMs: NOW });
    expect(vm.state).toBe(3);
    expect(vm.insight).toBe('Not enough weigh-ins in the last 2 weeks for a direction: 5 of 7.');
    expect(vm.twoWeek).toEqual({ enough: false, count: 5 });
  });
  test('enough weigh-ins but over too few days: no count is claimed', () => {
    const crowded = Array.from({ length: 8 }, (_, i) => ({ ewma: 80, weightKg: 80, date: new Date(NOW - i * 8 * 3600000).toISOString() }));
    const vm = deriveWeightTrend({ ewmaData: [...daily(10, { endDaysAgo: 16 }), ...crowded.reverse()], adaptiveBurn: burn, nowMs: NOW });
    expect(vm.insight).toBe('Not enough weigh-ins in the last 2 weeks for a direction yet.');
  });
  test('a fresh coach verdict still leads, and the two-week reading rides along for Body metrics', () => {
    const vm = deriveWeightTrend({
      ewmaData: daily(20, { perDay: -0.05 }), adaptiveBurn: burn, nowMs: NOW,
      coachVerdict: { onTarget: true, direction: 0, goalPhase: 'mild_cut', at: NOW - DAY },
    });
    expect(vm.insight).toBe('Moving at the planned rate.');
    expect(vm.twoWeek.ratePerWeek).toBe(-0.35);
  });
  test('state 2 carries the reading too, so Body metrics can print a direction from 7 weigh-ins', () => {
    const vm = deriveWeightTrend({ ewmaData: daily(8, { perDay: -0.05 }), nowMs: NOW });
    expect(vm.state).toBe(2);
    expect(vm.twoWeek.enough).toBe(true);
  });
});

describe('BM-3: a lapsed trend is not "no weigh-ins"', () => {
  const last = NOW - 21 * DAY;
  test('an empty series with a weigh-in behind it renders the lapsed line, no figure, no rate, no dot', () => {
    const vm = deriveWeightTrend({ ewmaData: [], lastWeighInMs: last, nowMs: NOW });
    expect(vm).toMatchObject({
      render: true, state: 0, lapsed: true, lastWeighInMs: last, ewmaNow: null, showRate: false, dot: null,
      maintenance: null, pillarFigure: false, edFlagOpen: false,
    });
    expect(vm.insight).toBe('No weigh-in in the last 14 days; the last was 3 weeks ago.');
    expect(lapsedInsight(last, NOW)).toBe(vm.insight);
  });
  test('under an open flag the lapsed line claims only what is kept (no nudge to weigh in)', () => {
    const vm = deriveWeightTrend({ ewmaData: [], lastWeighInMs: last, nowMs: NOW, edFlagOpen: true });
    expect(vm.lapsed).toBe(true);
    expect(vm.insight).toBe(ED_KEPT_INSIGHT);
    expect(vm.insight).not.toMatch(/\d|weigh in|log/i);
  });
  test('under calm mode the calm line, as for any weigh-in', () => {
    const vm = deriveWeightTrend({ ewmaData: [], lastWeighInMs: last, nowMs: NOW, calm: true });
    expect(vm.calm).toBe(true);
    expect(vm.insight).toBe(CALM_INSIGHT);
  });
  test('no weigh-in at all: still not rendered; under calm the line promises (BM-17)', () => {
    expect(deriveWeightTrend({ ewmaData: [], nowMs: NOW }).render).toBe(false);
    expect(deriveWeightTrend({ ewmaData: [], nowMs: NOW, calm: true }).insight).toBe(CALM_INSIGHT_NONE);
    expect(CALM_INSIGHT_NONE).toMatch(/will be kept/);
    expect(CALM_INSIGHT_NONE).not.toMatch(/\d|weigh in|log|record/i);
  });
});

describe('BM-16: the flag sentence on the one steady rule', () => {
  const burn = { confidence: 'high', adjustedTDEE: 2400, weeks: 4, actualKgPerWeek: 0.6, expectedKgPerWeek: -0.5 };
  test.each([
    ['no rate', 20, undefined, ED_KEPT_INSIGHT],
    ['within the steady rule, a fortnight of points', 20, 0.1, 'Your weight has stayed broadly stable over the past few weeks.'],
    ['within the steady rule, under a fortnight of points', 10, -0.15, 'Your weight has stayed broadly stable over the past week.'],
    ['rising past the steady rule', 20, 0.25, 'Your weight trend has been rising.'],
    ['falling past the steady rule', 20, -0.25, 'Your weight trend has been drifting down.'],
  ])('%s', (_label, n, weeklyChange, expected) => {
    const vm = deriveWeightTrend({ ewmaData: daily(n), weeklyChange, adaptiveBurn: burn, edFlagOpen: true, nowMs: NOW });
    expect(vm.insight).toBe(expected);
    expect(vm.insight).not.toMatch(/slightly|\d/);
    expect(vm.showRate).toBe(false);
    expect(vm.maintenance).toBeNull();
    expect(vm.pillarFigure).toBe(false);
    expect(vm.twoWeek).toBeUndefined();
  });
  test('source: one steady threshold in the module, read by the flag branch and the direction words', () => {
    expect(SOURCE.match(/STEADY_RATE_KG_PER_WEEK = 0\.2;/g)).toHaveLength(1);
    expect(SOURCE).toMatch(/Math\.abs\(rate\) < STEADY_RATE_KG_PER_WEEK/);
    expect(SOURCE).toMatch(/Math\.abs\(twoWeek\.ratePerWeek\) < STEADY_RATE_KG_PER_WEEK/);
    expect(SOURCE).not.toMatch(/< 0\.05/);
    expect(SOURCE).not.toMatch(/rising slightly/);
  });
});

describe('typicalDailySwingKg: the person\'s own day-to-day noise', () => {
  function entries(kgs, { stepMs = DAY } = {}) {
    return kgs.map((kg, i) => ({ weightKg: kg, loggedAt: NOW - (kgs.length - 1 - i) * stepMs }));
  }
  test('14 mornings alternating by 0.6 kg: the swing is 0.6', () => {
    expect(typicalDailySwingKg(entries(Array.from({ length: 14 }, (_, i) => (i % 2 ? 80.6 : 80))), { nowMs: NOW })).toBe(0.6);
  });
  test('the upper quartile, so "usually within" holds three mornings in four', () => {
    let kg = 80;
    const kgs = [80];
    for (let i = 1; i <= 9; i += 1) { kg += (i % 2 ? 1 : -1) * i * 0.1; kgs.push(Math.round(kg * 10) / 10); }
    expect(typicalDailySwingKg(entries(kgs), { nowMs: NOW })).toBe(0.7);
  });
  test('fewer than 10 weigh-ins in the window, or no consecutive mornings, is no reading', () => {
    expect(typicalDailySwingKg(entries(Array(9).fill(80)), { nowMs: NOW })).toBeNull();
    expect(typicalDailySwingKg(entries(Array(14).fill(80), { stepMs: 2 * DAY }), { nowMs: NOW })).toBeNull();
  });
  test('never reads below 0.1 kg, and ignores weigh-ins older than 28 days', () => {
    expect(typicalDailySwingKg(entries(Array(14).fill(80)), { nowMs: NOW })).toBe(0.1);
    const old = entries(Array(14).fill(80)).map(e => ({ ...e, loggedAt: e.loggedAt - 40 * DAY }));
    expect(typicalDailySwingKg(old, { nowMs: NOW })).toBeNull();
  });
});

describe('agoPhrase: plain words, no decimals', () => {
  test.each([
    [0, 'today'], [1, 'yesterday'], [5, '5 days ago'], [13, '13 days ago'], [14, '2 weeks ago'], [21, '3 weeks ago'],
    [45, '6 weeks ago'], [61, '2 months ago'], [90, '3 months ago'], [400, 'over a year ago'], [800, 'over 2 years ago'],
  ])('%s days -> %s', (days, expected) => {
    expect(agoPhrase(NOW - days * DAY, NOW)).toBe(expected);
    expect(agoPhrase(NOW - days * DAY, NOW)).not.toMatch(/\./);
  });
  test(`the direction reading needs ${DIRECTION_MIN_POINTS} points, the sentence's own denominator`, () => {
    expect(DIRECTION_MIN_POINTS).toBe(7);
  });
});
