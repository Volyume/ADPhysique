/**
 * nextLikelyTrainingTime.test.js -- per-muscle recovery, next-workout
 * projection (register D201, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md section 4.1).
 *
 * Pins: today counts when today is habitual and the typical minute has not
 * passed (including the exact boundary minute); otherwise the next
 * habitual weekday, walking correctly across a week boundary; no habit
 * (null OR an empty array) collapses to `nowMs` unchanged; the default
 * start minute is used when none is given; determinism (same inputs, same
 * output, twice, no Date.now() read).
 *
 * 2026-01-05 is a Monday (verified: `new Date(2026,0,5).getDay() === 1`).
 */
import { nextLikelyTrainingTime } from '../nextLikelyTrainingTime';
import { DEFAULT_TRAINING_START_MINUTE } from '../constants';

const MONDAY = 1;
const WEDNESDAY = 3;
const FRIDAY = 5;

// Monday 5 Jan 2026, 09:00 local.
const MON_0900 = new Date(2026, 0, 5, 9, 0, 0, 0).getTime();
// Monday 5 Jan 2026, 20:00 local (typical start minute already passed).
const MON_2000 = new Date(2026, 0, 5, 20, 0, 0, 0).getTime();
const START_1800 = 18 * 60; // 18:00

describe('no habit exists', () => {
  test('null habitualWeekdays collapses to nowMs unchanged', () => {
    expect(nextLikelyTrainingTime({ nowMs: MON_0900, habitualWeekdays: null, typicalStartMinute: START_1800 }))
      .toBe(MON_0900);
  });

  test('an empty habitualWeekdays array (genuinely irregular trainer) also collapses to nowMs', () => {
    expect(nextLikelyTrainingTime({ nowMs: MON_0900, habitualWeekdays: [], typicalStartMinute: START_1800 }))
      .toBe(MON_0900);
  });
});

describe('today is a habitual weekday', () => {
  test('the typical minute has not yet passed: returns today at that minute', () => {
    const result = nextLikelyTrainingTime({
      nowMs: MON_0900, habitualWeekdays: [MONDAY, WEDNESDAY, FRIDAY], typicalStartMinute: START_1800,
    });
    const d = new Date(result);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(0);
  });

  test('the boundary minute itself still counts as "not passed"', () => {
    const nowAt1800Exactly = new Date(2026, 0, 5, 18, 0, 0, 0).getTime();
    const result = nextLikelyTrainingTime({
      nowMs: nowAt1800Exactly, habitualWeekdays: [MONDAY], typicalStartMinute: START_1800,
    });
    expect(result).toBe(new Date(2026, 0, 5, 18, 0, 0, 0).getTime());
  });

  test('the typical minute has already passed: the rest of today still counts (projection is now)', () => {
    // Lead review (Opus finding 6): the typical minute is a median, so
    // about half of real sessions start after it. Someone opening Home on
    // a training day after that minute is about to train, not waiting for
    // Wednesday; the projection is NOW, never the next habitual day.
    const result = nextLikelyTrainingTime({
      nowMs: MON_2000, habitualWeekdays: [MONDAY, WEDNESDAY, FRIDAY], typicalStartMinute: START_1800,
    });
    expect(result).toBe(MON_2000);
  });
});

describe('today is not a habitual weekday', () => {
  test('advances to the next habitual weekday later this week', () => {
    // Tuesday 6 Jan 2026, habit is Monday/Wednesday/Friday -> next is Wednesday.
    const tuesday = new Date(2026, 0, 6, 9, 0, 0, 0).getTime();
    const result = nextLikelyTrainingTime({
      nowMs: tuesday, habitualWeekdays: [MONDAY, WEDNESDAY, FRIDAY], typicalStartMinute: START_1800,
    });
    const d = new Date(result);
    expect(d.getDate()).toBe(7); // Wednesday
    expect(d.getHours()).toBe(18);
  });

  test('walks correctly across a week boundary when the only habitual day is earlier in the week', () => {
    // Friday 9 Jan 2026, habit is Monday only -> next Monday is 12 Jan.
    const friday = new Date(2026, 0, 9, 9, 0, 0, 0).getTime();
    const result = nextLikelyTrainingTime({
      nowMs: friday, habitualWeekdays: [MONDAY], typicalStartMinute: START_1800,
    });
    const d = new Date(result);
    expect(d.getDate()).toBe(12);
    expect(d.getMonth()).toBe(0);
    expect(d.getHours()).toBe(18);
  });

  test('a single habitual weekday that IS today, past its minute, still projects to now (not 7 days out)', () => {
    const result = nextLikelyTrainingTime({
      nowMs: MON_2000, habitualWeekdays: [MONDAY], typicalStartMinute: START_1800,
    });
    expect(result).toBe(MON_2000);
  });

  test('a single habitual weekday that is NOT today projects to that day at the typical minute', () => {
    // Monday 20:00 with Wednesday the only habit: Wednesday 7 Jan, 18:00.
    const result = nextLikelyTrainingTime({
      nowMs: MON_2000, habitualWeekdays: [WEDNESDAY], typicalStartMinute: START_1800,
    });
    const d = new Date(result);
    expect(d.getDate()).toBe(7);
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('the default start minute', () => {
  test('a non-finite typicalStartMinute falls back to DEFAULT_TRAINING_START_MINUTE', () => {
    const result = nextLikelyTrainingTime({
      nowMs: MON_0900, habitualWeekdays: [MONDAY], typicalStartMinute: undefined,
    });
    const d = new Date(result);
    expect(d.getHours()).toBe(Math.floor(DEFAULT_TRAINING_START_MINUTE / 60));
    expect(d.getMinutes()).toBe(DEFAULT_TRAINING_START_MINUTE % 60);
  });
});

describe('determinism', () => {
  test('the same inputs give the same output every time (no Date.now() read)', () => {
    const params = { nowMs: MON_2000, habitualWeekdays: [MONDAY, FRIDAY], typicalStartMinute: START_1800 };
    const a = nextLikelyTrainingTime(params);
    const b = nextLikelyTrainingTime(params);
    expect(a).toBe(b);
  });

  test('no Date.now() call anywhere in the executable source (source guard, comments stripped)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'nextLikelyTrainingTime.js'), 'utf8');
    const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(withoutComments).not.toMatch(/Date\.now\(\)/);
  });
});
