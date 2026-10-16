/**
 * rankAroundThisTime (D230 R7, food level-up 2026-10-16): the pure ranking
 * behind "Around this time" on the add screen's Recent tab.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - The window is the LOCAL clock time either side of now, and it wraps
 *    midnight (at 00:30 a food eaten at 23:30 is 60 minutes away). A naive
 *    |a - b| on minutes-of-day would put them 1,380 minutes apart.
 *  - Local hours and minutes, not UTC: a breakfast at 07:30 in British
 *    Summer Time and now at 07:30 in winter are the same clock time. A
 *    UTC-based comparison puts them an hour apart and drops the row under a
 *    30-minute window.
 *  - Ranked by how often, then by the most recent, then by ref, so the order
 *    is total and the same input always gives the same output.
 *  - The excluded refs (the slot recents) are dropped BEFORE the limit, so
 *    they never take one of the six places.
 *  - Each result carries the portion of the MOST RECENT of its meals, the one
 *    the "+" adds.
 *  - A quick add is calories with no food behind it, so it never ranks.
 */
import { rankAroundThisTime } from '../aroundThisTime';

const DAY_MS = 24 * 60 * 60 * 1000;
// Local wall-clock timestamps: month is 0-based (9 = October).
const at = (y, m, d, hh, mm) => new Date(y, m, d, hh, mm).getTime();
const row = (food_ref, eaten_at, quantity_g = 100) => ({
  food_ref, eaten_at, quantity_g, entry_date: '2026-10-01',
});

describe('rankAroundThisTime: the clock window', () => {
  test('keeps rows within 90 minutes of the clock time, either side, on any day', () => {
    const nowMs = at(2026, 9, 16, 8, 0);
    const out = rankAroundThisTime([
      row('off:in-before', at(2026, 9, 10, 6, 30)), // 90 min before: in
      row('off:in-after', at(2026, 9, 11, 9, 30)), // 90 min after: in
      row('off:out-before', at(2026, 9, 12, 6, 29)), // 91 min before: out
      row('off:out-after', at(2026, 9, 13, 9, 31)), // 91 min after: out
      row('off:noon', at(2026, 9, 14, 12, 0)),
    ], { nowMs });
    expect(out.map((r) => r.foodRef).sort()).toEqual(['off:in-after', 'off:in-before']);
  });

  test('wraps midnight both ways', () => {
    const justAfterMidnight = at(2026, 9, 16, 0, 30);
    const late = rankAroundThisTime([
      row('off:late-snack', at(2026, 9, 14, 23, 30)), // 60 min the other side of midnight
      row('off:too-early', at(2026, 9, 14, 22, 30)), // 120 min: out
    ], { nowMs: justAfterMidnight });
    expect(late.map((r) => r.foodRef)).toEqual(['off:late-snack']);

    const justBeforeMidnight = at(2026, 9, 16, 23, 45);
    const early = rankAroundThisTime([
      row('off:after-midnight', at(2026, 9, 12, 0, 15)), // 30 min
    ], { nowMs: justBeforeMidnight });
    expect(early.map((r) => r.foodRef)).toEqual(['off:after-midnight']);
  });

  test('compares LOCAL clock times, so a summer-time breakfast matches a winter one', () => {
    // 20 October 2026 is British Summer Time; 2 November is GMT. Both 07:30
    // on the wall clock, an hour apart in UTC.
    const winterNow = at(2026, 10, 2, 7, 30);
    const out = rankAroundThisTime(
      [row('off:porridge', at(2026, 9, 20, 7, 30))],
      { nowMs: winterNow, windowMinutes: 30 },
    );
    expect(out.map((r) => r.foodRef)).toEqual(['off:porridge']);
  });

  test('a custom window is honoured', () => {
    const nowMs = at(2026, 9, 16, 12, 0);
    const rows = [row('off:a', at(2026, 9, 10, 11, 20)), row('off:b', at(2026, 9, 10, 11, 50))];
    expect(rankAroundThisTime(rows, { nowMs, windowMinutes: 30 }).map((r) => r.foodRef)).toEqual(['off:b']);
    expect(rankAroundThisTime(rows, { nowMs, windowMinutes: 45 }).map((r) => r.foodRef).sort()).toEqual(['off:a', 'off:b']);
  });
});

describe('rankAroundThisTime: ranking, exclusion and the portion', () => {
  const nowMs = at(2026, 9, 16, 8, 0);

  test('ranks by count, then by the most recent, then by ref', () => {
    const out = rankAroundThisTime([
      row('off:oats', at(2026, 9, 1, 7, 50)),
      row('off:oats', at(2026, 9, 2, 8, 10)),
      row('off:oats', at(2026, 9, 3, 7, 40)),
      row('off:eggs', at(2026, 9, 4, 8, 0)),
      row('off:eggs', at(2026, 9, 9, 8, 0)), // two, and the most recent pair
      row('off:toast', at(2026, 9, 5, 8, 0)),
      row('off:toast', at(2026, 9, 6, 8, 0)), // two, older than eggs
      row('off:banana', at(2026, 9, 8, 8, 0)), // one, recent
      row('off:apple', at(2026, 9, 8, 8, 0)), // one, same moment: ref decides
    ], { nowMs });
    expect(out.map((r) => [r.foodRef, r.count])).toEqual([
      ['off:oats', 3],
      ['off:eggs', 2],
      ['off:toast', 2],
      ['off:apple', 1],
      ['off:banana', 1],
    ]);
  });

  test('excludes the given refs before the limit, so they never take a place', () => {
    const rows = [];
    for (let i = 0; i < 8; i += 1) {
      // off:f0 is eaten 8 times, off:f1 7 times, ... off:f7 once.
      for (let k = 0; k < 8 - i; k += 1) rows.push(row(`off:f${i}`, at(2026, 9, 1 + k, 8, 0)));
    }
    const out = rankAroundThisTime(rows, { nowMs, excludeRefs: ['off:f0', 'off:f2'] });
    expect(out).toHaveLength(6);
    expect(out.map((r) => r.foodRef)).toEqual(['off:f1', 'off:f3', 'off:f4', 'off:f5', 'off:f6', 'off:f7']);
    // A Set is accepted as well as an array.
    const viaSet = rankAroundThisTime(rows, { nowMs, excludeRefs: new Set(['off:f0', 'off:f2']) });
    expect(viaSet).toEqual(out);
  });

  test('takes at most `limit` (six by default)', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`off:x${i}`, at(2026, 9, 1 + i, 8, 0)));
    expect(rankAroundThisTime(rows, { nowMs })).toHaveLength(6);
    expect(rankAroundThisTime(rows, { nowMs, limit: 2 })).toHaveLength(2);
  });

  test('each result carries the most recent portion and its time', () => {
    const out = rankAroundThisTime([
      row('off:oats', at(2026, 9, 3, 8, 0), 60),
      row('off:oats', at(2026, 9, 9, 8, 0), 45), // the most recent
      row('off:oats', at(2026, 9, 6, 8, 0), 80),
    ], { nowMs });
    expect(out).toEqual([{
      foodRef: 'off:oats', count: 3, quantityG: 45, lastEatenAt: at(2026, 9, 9, 8, 0),
    }]);
  });

  test('a quick add never ranks; rows with no ref or no time are skipped', () => {
    const out = rankAroundThisTime([
      row('quick:adhoc', at(2026, 9, 9, 8, 0), 0),
      row('quick:adhoc', at(2026, 9, 10, 8, 0), 0),
      { food_ref: null, eaten_at: at(2026, 9, 9, 8, 0), quantity_g: 50 },
      { food_ref: 'off:untimed', eaten_at: null, quantity_g: 50 },
      row('off:real', at(2026, 9, 9, 8, 0)),
    ], { nowMs });
    expect(out.map((r) => r.foodRef)).toEqual(['off:real']);
    // A missing eaten_at is not read as epoch 0 (01:00 in London in 1970):
    // at 01:00 it would otherwise fall inside the window.
    const atOne = rankAroundThisTime([
      { food_ref: 'off:untimed', eaten_at: null, quantity_g: 50 },
      { food_ref: 'off:undefined-time', quantity_g: 50 },
    ], { nowMs: at(2026, 9, 16, 1, 0) });
    expect(atOne).toEqual([]);
  });

  test('empty or unusable input gives an empty list', () => {
    expect(rankAroundThisTime([], { nowMs })).toEqual([]);
    expect(rankAroundThisTime(null, { nowMs })).toEqual([]);
    expect(rankAroundThisTime([row('off:a', at(2026, 9, 9, 8, 0))], { nowMs: NaN })).toEqual([]);
    expect(rankAroundThisTime([row('off:a', at(2026, 9, 9, 8, 0))], { nowMs, limit: 0 })).toEqual([]);
  });
});

describe('rankAroundThisTime: deterministic', () => {
  test('the same input gives the same output, whatever order the rows arrive in', () => {
    const nowMs = at(2026, 9, 16, 8, 0);
    const rows = [
      row('off:oats', at(2026, 9, 1, 7, 50), 60),
      row('off:eggs', at(2026, 9, 4, 8, 0), 120),
      row('off:oats', at(2026, 9, 2, 8, 10), 55),
      row('off:toast', at(2026, 9, 5, 8, 0), 36),
      row('off:eggs', at(2026, 9, 9, 8, 0), 110),
      row('off:banana', at(2026, 9, 8, 8, 0), 118),
      row('off:apple', at(2026, 9, 8, 8, 0), 150),
    ];
    const first = rankAroundThisTime(rows, { nowMs });
    expect(rankAroundThisTime(rows, { nowMs })).toEqual(first);
    expect(rankAroundThisTime([...rows].reverse(), { nowMs })).toEqual(first);
    const shuffled = [rows[3], rows[0], rows[6], rows[2], rows[5], rows[1], rows[4]];
    expect(rankAroundThisTime(shuffled, { nowMs })).toEqual(first);
    // The input is not mutated.
    expect(rows[0]).toEqual(row('off:oats', at(2026, 9, 1, 7, 50), 60));
  });

  test('reads no clock of its own: a different day at the same time ranks the same', () => {
    const rows = [row('off:oats', at(2026, 9, 1, 7, 50)), row('off:eggs', at(2026, 9, 4, 8, 0))];
    const a = rankAroundThisTime(rows, { nowMs: at(2026, 9, 16, 8, 0) });
    const b = rankAroundThisTime(rows, { nowMs: at(2026, 9, 16, 8, 0) + 3 * DAY_MS });
    expect(b).toEqual(a);
  });
});
