import {
  TREND_WINDOWS,
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
import { weightChartValue } from '../bodyMetricsDisplay';

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

describe('chartWindows: weightTakeaway', () => {
  const points = [{ t: daysAgo(80) }, { t: daysAgo(40) }, { t: daysAgo(2) }];
  const dateOf = (p) => p.t;
  test('average + signed first-to-last delta from EWMA endpoints', () => {
    expect(weightTakeaway({ windowKey: '3M', coversAll: false, points, dateOf, ewma: [84.2, 83.0, 82.4], unit: 'kg' }))
      .toBe('3 months: average 83.2 kg, down 1.8 kg.');
    expect(weightTakeaway({ windowKey: '3M', coversAll: false, points, dateOf, ewma: [80, 81, 82], unit: 'kg' }))
      .toBe('3 months: average 81 kg, up 2 kg.');
  });
  test('open ED flag suppresses the rate-of-change — average only', () => {
    const line = weightTakeaway({ windowKey: '3M', coversAll: false, points, dateOf, ewma: [84.2, 83, 82.4], unit: 'kg', edFlagOpen: true });
    expect(line).toBe('3 months: average 83.2 kg.');
    expect(line).not.toMatch(/up|down/);
  });
  test('a flat trend reads "holding steady", not "up 0"', () => {
    expect(weightTakeaway({ windowKey: '1M', coversAll: false, points, dateOf, ewma: [82.0, 82.02, 82.0], unit: 'kg' }))
      .toBe('1 month: average 82 kg, holding steady.');
  });
});

describe('chartWindows: weightTakeaway toDisplay (progress-tab audit 2026-09-24, second pass, A1 follow-up)', () => {
  // THE DEFECT: the takeaway banner always read in kg, unlike the chart's
  // own axis/tooltip (already fixed to respect bodyWeightUnits). toDisplay
  // converts the two NUMBERS this renders (average, delta magnitude) only;
  // the direction/"holding steady" decision stays a kg-only judgement so
  // the level band keeps one real-world meaning regardless of display unit.
  const points = [{ t: daysAgo(80) }, { t: daysAgo(40) }, { t: daysAgo(2) }];
  const dateOf = (p) => p.t;
  const toLbs = (v) => weightChartValue(v, 'lbs');

  test('lbs: the average and the delta both convert through toDisplay, matching the chart\'s own conversion', () => {
    const ewma = [82.5, 82.5, 82.35];
    const avgLbs = kgToLbs((82.5 + 82.5 + 82.35) / 3).toFixed(1);
    const deltaLbs = kgToLbs(Math.abs(82.35 - 82.5)).toFixed(1);
    const line = weightTakeaway({
      windowKey: '3M', coversAll: false, points, dateOf, ewma, unit: 'lbs', toDisplay: toLbs,
    });
    expect(line).toBe(`3 months: average ${avgLbs} lbs, down ${deltaLbs} lbs.`);
  });

  test('a flat kg series reads a clean converted average: 82.5 kg is 181.9 lbs', () => {
    const line = weightTakeaway({
      windowKey: '3M', coversAll: false, points, dateOf, ewma: [82.5, 82.5, 82.5], unit: 'lbs', toDisplay: toLbs,
    });
    expect(line).toBe('3 months: average 181.9 lbs, holding steady.');
  });

  test('the level dead-band (0.1 kg) is decided on the RAW kg delta, never the converted one', () => {
    // A 0.05 kg drift is inside the dead-band in kg terms -- "holding
    // steady" in BOTH units, even though 0.05 kg is a non-trivial ~0.1 lbs
    // once converted, so a unit-aware dead-band would have called it "down".
    const ewmaKg = [82.50, 82.50, 82.45];
    expect(weightTakeaway({ windowKey: '3M', coversAll: false, points, dateOf, ewma: ewmaKg, unit: 'kg' }))
      .toMatch(/holding steady/);
    expect(weightTakeaway({
      windowKey: '3M', coversAll: false, points, dateOf, ewma: ewmaKg, unit: 'lbs', toDisplay: toLbs,
    })).toMatch(/holding steady/);
  });

  test('the open-ED-flag branch (average only, no direction) also formats through toDisplay', () => {
    const line = weightTakeaway({
      windowKey: '3M', coversAll: false, points, dateOf, ewma: [82.5, 82.5, 82.5],
      unit: 'lbs', edFlagOpen: true, toDisplay: toLbs,
    });
    expect(line).toBe('3 months: average 181.9 lbs.');
    expect(line).not.toMatch(/up|down|steady/);
  });

  test('a caller that omits toDisplay (every existing kg caller) is byte-identical to before', () => {
    expect(weightTakeaway({ windowKey: '3M', coversAll: false, points, dateOf, ewma: [84.2, 83.0, 82.4], unit: 'kg' }))
      .toBe('3 months: average 83.2 kg, down 1.8 kg.');
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
      expect(line).not.toMatch(/\b(kg|lbs?|lb)\b/i);
      expect(line).not.toMatch(/easier|harder|consider|should|try|aim|monitor|rest/i);
    }
  });
});
