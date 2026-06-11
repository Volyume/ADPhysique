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
} from '../chartWindows';

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

describe('chartWindows: e1rmTakeaway', () => {
  const points = [{ t: daysAgo(150) }, { t: daysAgo(70) }, { t: daysAgo(3) }];
  const dateOf = (p) => p.t;
  test('best in window + first-to-last delta', () => {
    expect(e1rmTakeaway({ windowKey: '6M', coversAll: false, points, dateOf, values: [134.5, 140, 142], unit: 'kg' }))
      .toBe('6 months: best 142 kg, up 7.5 kg.');
  });
});

describe('chartWindows: volumeTakeaway', () => {
  test('average weekly sets + delta in sets', () => {
    expect(volumeTakeaway({ windowKey: '8W', coversAll: false, spanDays: 56, weeklySets: [11, 12, 13, 14] }))
      .toBe('8 weeks: average 13 sets a week, up 3.');
  });
  test('singular set reads correctly and a flat line holds steady', () => {
    expect(volumeTakeaway({ windowKey: '4W', coversAll: false, spanDays: 28, weeklySets: [1, 1, 1] }))
      .toBe('4 weeks: average 1 set a week, holding steady.');
  });
});
