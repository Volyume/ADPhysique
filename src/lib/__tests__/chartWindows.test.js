import {
  TREND_WINDOWS,
  WEIGHT_WINDOWS,
  VOLUME_WINDOWS,
  DEFAULT_WINDOW_KEY,
  windowByKey,
  filterByWindow,
  pickInitialWindowKey,
  windowPhrase,
  weightTakeaway,
  e1rmTakeaway,
  volumeTakeaway,
  workloadTakeaway,
} from '../chartWindows';
import { kgToLbs } from '../units';
import { STEADY_RATE_KG_PER_WEEK } from '../weightTrend';

const DAY = 86400000;
const NOW = new Date(2026, 5, 10, 12).getTime(); // fixed anchor
const daysAgo = (n) => NOW - n * DAY;

describe('chartWindows: presets', () => {
  test('default window is 3M and exists in both preset sets', () => {
    expect(DEFAULT_WINDOW_KEY).toBe('3M');
    expect(windowByKey(TREND_WINDOWS, '3M')).toBeTruthy();
    expect(windowByKey(VOLUME_WINDOWS, '3M')).toBeTruthy();
  });
});

describe('chartWindows: filterByWindow', () => {
  const pts = [
    { t: daysAgo(200) }, { t: daysAgo(100) }, { t: daysAgo(40) }, { t: daysAgo(5) },
  ];
  const dateOf = (p) => p.t;
  test('keeps only points inside the window', () => {
    expect(filterByWindow(pts, dateOf, 30, NOW)).toHaveLength(1);   // 5d
    expect(filterByWindow(pts, dateOf, 90, NOW)).toHaveLength(2);   // 40d, 5d
    expect(filterByWindow(pts, dateOf, 365, NOW)).toHaveLength(4);
  });
});

describe('chartWindows: pickInitialWindowKey', () => {
  const dateOf = (p) => p.t;
  test('keeps the preferred window when it holds >= 2 points', () => {
    const pts = [{ t: daysAgo(10) }, { t: daysAgo(2) }];
    expect(pickInitialWindowKey(pts, dateOf, TREND_WINDOWS, '3M', NOW)).toBe('3M');
  });
  test('widens to the narrowest window with >= 2 points when 3M is too sparse', () => {
    // two points 100 and 150 days ago: 3M (90d) has 0, 6M (180d) has 2.
    const pts = [{ t: daysAgo(150) }, { t: daysAgo(100) }];
    expect(pickInitialWindowKey(pts, dateOf, TREND_WINDOWS, '3M', NOW)).toBe('6M');
  });
  test('falls back to the widest window when nothing reaches 2 points', () => {
    const pts = [{ t: daysAgo(3) }];
    expect(pickInitialWindowKey(pts, dateOf, TREND_WINDOWS, '3M', NOW)).toBe('Y');
  });
});

describe('chartWindows: windowPhrase', () => {
  test('uses the canonical phrase when older data exists outside the window', () => {
    expect(windowPhrase('3M', false, 90)).toBe('3 months');
    expect(windowPhrase('8W', false, 56)).toBe('8 weeks');
    expect(windowPhrase('Y', false, 365)).toBe('1 year');
  });
  test('says "All N weeks" for a young account whose span is under the window', () => {
    expect(windowPhrase('Y', true, 21)).toBe('All 3 weeks');
    expect(windowPhrase('3M', true, 7)).toBe('All 1 week');
  });
  test('says "All N months" once the span passes ~8 weeks', () => {
    expect(windowPhrase('Y', true, 120)).toBe('All 4 months');
  });
});

// RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; spec section 6 table:
// `chartWindows` (weight)). The weight takeaway was rebuilt (section 3 item 4,
// BM-5 to BM-8, BM-23, BM-31): it names the dates it covers, says "Everything
// you have logged" when the log is shorter than the window, "averaged" is the
// plain average of the weigh-ins (the old "average" was the mean of the
// SMOOTHED series), a direction is read only from 7 weigh-ins spanning 7 days
// (with its denominator when there is too little), and "steady" is the ONE
// steady rule, weightTrend.STEADY_RATE_KG_PER_WEEK (0.2 kg a week), not a 0.1
// kg dead-band beside four other definitions of flat. The old per-unit
// dead-band tests (A1 follow-up) are replaced by the formatter contract: every
// figure reaches the sentence through the caller's unit-aware formatters, so
// nothing here assumes kilograms; the unit mapping itself is pinned in
// bodyMetricsDisplay.test.js and the screen guards.
describe('chartWindows: WEIGHT_WINDOWS (the chips in words)', () => {
  test('words for the labels, the same keys and day counts as the lift charts', () => {
    expect(WEIGHT_WINDOWS.map((w) => w.label)).toEqual(['1 month', '3 months', '6 months', '1 year']);
    expect(WEIGHT_WINDOWS.map((w) => [w.key, w.days])).toEqual(TREND_WINDOWS.map((w) => [w.key, w.days]));
  });
  test('the lift charts keep their own labels (this change is weight only)', () => {
    expect(TREND_WINDOWS.map((w) => w.label)).toEqual(['1M', '3M', '6M', 'Y']);
  });
});

describe('chartWindows: weightTakeaway (D214 addendum 4)', () => {
  const fmt = {
    formatWeight: (kg) => `${Math.round(kg * 10) / 10} kg`,
    formatAmount: (kg) => `${Math.round(kg * 10) / 10} kg`,
    formatRate: (kg) => `${Math.round(kg * 100) / 100} kg a week`,
    formatDate: (key) => ({ '2026-09-04': '4 Sep', '2026-09-17': '17 Sep' }[key] ?? key),
  };
  const base = {
    coversAll: false, from: '2026-09-04', to: '2026-09-17', count: 14, averageKg: 82.3,
    trendStartKg: 83.0, trendEndKg: 82.1, spanDays: 13, ...fmt,
  };

  test('names the dates, the plain average, and the trend\'s movement with its rate', () => {
    // delta -0.9 over 13 days = -0.485 kg a week: past the steady rule, so "moved down"
    expect(weightTakeaway(base))
      .toBe('4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg; the trend moved down 0.9 kg, about 0.48 kg a week.');
    expect(weightTakeaway({ ...base, trendStartKg: 80, trendEndKg: 80.9 }))
      .toBe('4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg; the trend moved up 0.9 kg, about 0.48 kg a week.');
  });

  test('"Everything you have logged" when the log is shorter than the window', () => {
    expect(weightTakeaway({ ...base, coversAll: true }))
      .toMatch(/^Everything you have logged, 4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg;/);
  });

  test('steady is the ONE steady rule: under 0.2 kg a week holds steady, at 0.2 it has moved', () => {
    // -0.1 over 13 days = -0.054 kg a week
    expect(weightTakeaway({ ...base, trendStartKg: 82.2, trendEndKg: 82.1 }))
      .toBe('4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg; the trend held steady, about 0.05 kg a week.');
    expect(STEADY_RATE_KG_PER_WEEK).toBe(0.2);
    // exactly 0.2 kg a week (0.4 kg over 14 days) is NOT steady: "<" is the rule
    expect(weightTakeaway({ ...base, spanDays: 14, trendStartKg: 82.4, trendEndKg: 82.0 }))
      .toMatch(/the trend moved down 0\.4 kg, about 0\.2 kg a week\.$/);
    expect(weightTakeaway({ ...base, spanDays: 14, trendStartKg: 82.4, trendEndKg: 82.01 }))
      .toMatch(/held steady/);
  });

  test('BM-6: no direction from too few weigh-ins, and the denominator is said', () => {
    expect(weightTakeaway({ ...base, count: 3, spanDays: 6, trendStartKg: 80, trendEndKg: 82 }))
      .toBe('4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg; not enough weigh-ins yet for a direction: 3 of 7.');
    // seven weigh-ins that cover under seven days are not a direction either
    expect(weightTakeaway({ ...base, count: 7, spanDays: 6, trendStartKg: 80, trendEndKg: 82 }))
      .toBe('4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg; not enough time yet for a direction: your weigh-ins cover 6 of 7 days.');
  });

  test('nothing to say from fewer than two weigh-ins', () => {
    expect(weightTakeaway({ ...base, count: 1 })).toBe('');
    expect(weightTakeaway({ ...base, count: 0 })).toBe('');
    expect(weightTakeaway({ ...base, averageKg: NaN })).toBe('');
  });

  test('every figure arrives through the caller\'s formatters, so a pounds reader reads pounds', () => {
    const lbs = (kg) => `${(Math.round(kgToLbs(kg) * 10) / 10)} lbs`;
    const line = weightTakeaway({
      ...base,
      formatWeight: (kg) => `${Math.round(kgToLbs(kg))} lbs`,
      formatAmount: lbs,
      formatRate: (kg) => `${lbs(kg)} a week`,
    });
    expect(line).toBe('4 Sep to 17 Sep: your weigh-ins averaged 181 lbs; the trend moved down 2 lbs, about 1.1 lbs a week.');
    expect(line).not.toMatch(/\bkg\b/);
  });

  test('no em dash and no instruction in any variant (D204)', () => {
    const lines = [
      weightTakeaway(base),
      weightTakeaway({ ...base, coversAll: true, trendStartKg: 82.2, trendEndKg: 82.1 }),
      weightTakeaway({ ...base, count: 3 }),
    ].join(' ');
    expect(lines).not.toMatch(/\u2014/);
    expect(lines).not.toMatch(/\b(should|must|try|aim|avoid)\b/i);
  });
});

describe('chartWindows: e1rmTakeaway', () => {
  const points = [{ t: daysAgo(150) }, { t: daysAgo(70) }, { t: daysAgo(3) }];
  const dateOf = (p) => p.t;
  test('best in window + first-to-last delta', () => {
    expect(e1rmTakeaway({ windowKey: '6M', coversAll: false, points, dateOf, values: [134.5, 140, 142], unit: 'kg' }))
      .toBe('6 months: best 142 kg, up 7.5 kg.');
  });
});

describe('chartWindows: volumeTakeaway', () => {
  // RE-ANCHORED D214 (Progress, recovery heatmap and Consistency elevation,
  // docs/audit/progress-recovery-consistency-audit-2026-10-01/
  // 00-AUDIT-AND-PLAN.md section 7.4 item 6, VH-9 and VH-16): the takeaway is
  // in LOGGED sets (the caller passes logged working-set rows per Monday week,
  // never per-muscle credits), the first-to-last delta ("up 3") is gone, and
  // the sentence says "about N a week". On its own it names "sets" so the
  // number states what it is; after the "This week so far" sentence the unit
  // is carried by that sentence.
  test('standing alone: the average of the full weeks, naming the unit, with no delta', () => {
    expect(volumeTakeaway({ windowKey: '8W', coversAll: false, spanDays: 56, weeklySets: [11, 12, 13, 14] }))
      .toBe('8 weeks: about 13 sets a week.');
  });
  test('a singular average reads "1 set", and a flat run says no "holding steady" or direction', () => {
    expect(volumeTakeaway({ windowKey: '4W', coversAll: false, spanDays: 28, weeklySets: [1, 1, 1] }))
      .toBe('4 weeks: about 1 set a week.');
    expect(volumeTakeaway({ windowKey: '4W', coversAll: false, spanDays: 28, weeklySets: [5, 20, 9] }))
      .not.toMatch(/up|down|holding steady/);
  });

  // D200-3 last clause (progress-tab audit 2026-09-24, lane E, VolumeHeatmapScreen
  // trend): phraseOverride and currentWeekTotal are optional.
  describe('phraseOverride and currentWeekTotal (heatmap trend)', () => {
    test('phraseOverride replaces the windowKey-derived phrase, used verbatim (not capitalised by this function)', () => {
      expect(volumeTakeaway({
        windowKey: '4W', coversAll: false, spanDays: 0, weeklySets: [11, 12, 13],
        phraseOverride: 'Last 3 full weeks',
      })).toBe('Last 3 full weeks: about 12 sets a week.');
    });

    test('currentWeekTotal prepends a "This week so far" sentence ahead of the full-weeks average', () => {
      expect(volumeTakeaway({
        windowKey: '4W', coversAll: false, spanDays: 0, weeklySets: [11, 12, 13],
        phraseOverride: 'Last 3 full weeks', currentWeekTotal: 9,
      })).toBe('This week so far: 9 sets logged. Last 3 full weeks: about 12 a week.');
    });

    test('the plan\'s own example reads exactly', () => {
      expect(volumeTakeaway({
        windowKey: '4W', coversAll: false, spanDays: 0, weeklySets: [58, 60, 62],
        phraseOverride: 'Last 3 full weeks', currentWeekTotal: 42,
      })).toBe('This week so far: 42 sets logged. Last 3 full weeks: about 60 a week.');
    });

    test('currentWeekTotal alone (fewer than 2 full weeks) still reads, not empty', () => {
      expect(volumeTakeaway({ windowKey: '4W', coversAll: false, spanDays: 0, weeklySets: [], currentWeekTotal: 5 }))
        .toBe('This week so far: 5 sets logged.');
      expect(volumeTakeaway({ windowKey: '4W', coversAll: false, spanDays: 0, weeklySets: [7], currentWeekTotal: 0 }))
        .toBe('This week so far: 0 sets logged.');
    });

    test('a singular current-week total reads "1 set", not "1 sets"', () => {
      expect(volumeTakeaway({ windowKey: '4W', coversAll: false, spanDays: 0, weeklySets: [], currentWeekTotal: 1 }))
        .toBe('This week so far: 1 set logged.');
    });

    test('no instruction and no credit language in any branch (D204, VH-16)', () => {
      const out = [
        volumeTakeaway({ windowKey: '4W', coversAll: false, spanDays: 0, weeklySets: [3, 9, 12], currentWeekTotal: 4, phraseOverride: 'Last 3 full weeks' }),
        volumeTakeaway({ windowKey: '8W', coversAll: false, spanDays: 56, weeklySets: [3, 9, 12] }),
      ].join(' ');
      expect(out).not.toMatch(/credit|add |more|should|consider|average/i);
    });
  });
});

// RE-ANCHORED under D214 (Consistency elevation, lane 4; plan section 7.3 item
// 6, CS-1, CS-6, B10). The takeaway used to print "This week so far: 12,450 kg
// against a 4-week average of 10,200 kg." under the ratio card: a hard-coded
// "kg" for a pounds user (CS-1) and two figures the card already showed
// (CS-6). It is now the one D204 sentence for the like-for-like comparison
// (trainingLoad.likeForLikeLoad), carrying no number and so no unit; the
// figures (this week so far, the N-week average) are the load card's own and
// are pinned in ProgressSections.workloadCopy.test.js.
describe('chartWindows: workloadTakeaway (like-for-like words, D204)', () => {
  test('the three readings, worded exactly', () => {
    expect(workloadTakeaway('in_line')).toBe('In line with recent weeks at this point');
    expect(workloadTakeaway('above')).toBe('Above recent weeks at this point');
    expect(workloadTakeaway('below')).toBe('Below recent weeks at this point');
  });
  test('no comparison (null, undefined, anything else) returns empty, not a guess', () => {
    expect(workloadTakeaway(null)).toBe('');
    expect(workloadTakeaway(undefined)).toBe('');
    expect(workloadTakeaway('well_above')).toBe('');
    expect(workloadTakeaway(1.22)).toBe('');
  });
  test('it carries no number, no unit and no instruction', () => {
    for (const key of ['above', 'in_line', 'below']) {
      const line = workloadTakeaway(key);
      expect(line).not.toMatch(/\d/);
      expect(line).not.toMatch(/\b(kg|lbs?|lbs)\b/i);
      expect(line).not.toMatch(/easier|harder|consider|should|try|aim|monitor|rest/i);
    }
  });
});

// D214 addendum 7 (lane 7 open question 6): "held steady" needs a small total as
// well as a small rate, so a year that drifted 2 kg is never "steady".
describe('weightTakeaway: the steady amount', () => {
  const { weightTakeaway: take, STEADY_AMOUNT_KG } = require('../chartWindows');
  const fmt = { formatWeight: (k) => `${k} kg`, formatAmount: (k) => `${Math.round(k * 10) / 10} kg`, formatRate: (r) => `${Math.round(r * 100) / 100} kg a week`, formatDate: (d) => d };
  test('2 kg over a year reads as moved, not steady, though the rate is tiny', () => {
    const s = take({ coversAll: false, from: '1 Oct', to: '1 Oct', count: 60, averageKg: 81, trendStartKg: 83, trendEndKg: 81, spanDays: 365, ...fmt });
    expect(s).toMatch(/the trend moved down 2 kg, about 0.04 kg a week\.$/);
    expect(s).not.toMatch(/held steady/);
  });
  test('a small total at a small rate reads steady', () => {
    const s = take({ coversAll: false, from: '4 Sep', to: '17 Sep', count: 10, averageKg: 82.3, trendStartKg: 82.4, trendEndKg: 82.2, spanDays: 13, ...fmt });
    expect(s).toMatch(/held steady/);
  });
  test('the amount floor is half a kilo', () => { expect(STEADY_AMOUNT_KG).toBe(0.5); });
});
