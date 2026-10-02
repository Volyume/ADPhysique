/**
 * planWeek.test.js - register D214 addendum 1 (Q5 = A) and plan sections 7.1
 * item 2 / 7.3 item 2: the ONE "Your plan week" view-model the Progress root
 * and Consistency both render.
 *
 * What this suite pins and why:
 *  - the count is the PLAN week (completed over required for the week the
 *    programme is on), never the calendar week, and the words say so;
 *  - "done" counts completed sessions only (skipped and ended-early sessions
 *    are resolved, not done);
 *  - the next session's name comes through sessionDisplayName, so a duplicate
 *    name inside one week is qualified exactly as Home qualifies it;
 *  - without a plan (no position, or a position with no required sessions)
 *    the card falls back to the Monday-anchored calendar count the root
 *    printed before, singular and plural;
 *  - the complete week reads "every session done" (the isWeekComplete fact,
 *    D204: a description, never an instruction) and the planned recovery
 *    week is named as such;
 *  - the seven cells read the Monday-anchored LOCAL week only, Monday first
 *    (a set last Sunday never lights a cell; a clock-change week keeps its
 *    true length through localWeekEndMs);
 *  - the module is pure (no database, store or clock import), so both
 *    screens can call it on already-loaded data;
 *  - RE-ANCHORED D214 addendum 9 (plain-English census, 2026-10-02): the
 *    no-plan count says "so far" ("2 sessions so far this week", P13: the week
 *    is still open), and the seven cells light on the days a completed workout
 *    STARTED (the twelve-week grid's own definition, census 6.13), not on each
 *    set's own time. A session started at 23:30 on Monday with sets after
 *    midnight lit Monday on the grid and Monday and Tuesday in the cells; one
 *    started at 23:00 on Sunday lit the new week's Monday while the grid drew
 *    it on Sunday; a completed workout with no sets lit the grid and not the
 *    cells. "A day with a completed session" is now one meaning on the card,
 *    the grid and the caption.
 */
const fs = require('fs');
const path = require('path');
import {
  buildPlanWeekSummary, trainedDayKeys, sessionsThisWeek, weekdayKey, sessionDayKeysThisWeek,
} from '../planWeek';
import { SESSION_STATE } from '../../blockProgression';
import { RECOVERY_STATE } from '../../recoveryState';
import { localWeekStartMs, localDayKey } from '../../dayKey';

// Thursday 2026-10-01 14:00 local: the week runs Mon 28 Sep .. Sun 4 Oct.
const NOW = new Date(2026, 9, 1, 14, 0, 0).getTime();
const WEEK_START = localWeekStartMs(NOW);
const DAY = 24 * 60 * 60 * 1000;
const at = (dayOffset, hour = 10) => WEEK_START + dayOffset * DAY + hour * 60 * 60 * 1000;

const session = (name, order, state, routineId = `r${order}`) => ({ routineId, name, order, state });

function position(overrides = {}) {
  const sessions = overrides.sessions ?? [
    session('Upper A', 1, SESSION_STATE.COMPLETED),
    session('Lower A', 2, SESSION_STATE.COMPLETED),
    session('Upper B', 3, SESSION_STATE.OUTSTANDING),
    session('Lower B', 4, SESSION_STATE.OUTSTANDING),
  ];
  const next = sessions.find((s) => s.state === SESSION_STATE.OUTSTANDING) ?? null;
  return {
    activeWeekIndex: 2,
    plannedWeeks: 6,
    sessions,
    nextSession: next,
    weekResolved: next == null,
    recoveryState: { state: RECOVERY_STATE.NORMAL_ACCUMULATION },
    ...overrides,
  };
}

describe('buildPlanWeekSummary with a plan', () => {
  test('counts completed over required for the PLAN week and names the plan week', () => {
    const vm = buildPlanWeekSummary({ position: position(), sets: [], now: NOW });
    expect(vm.hasPlan).toBe(true);
    expect(vm.headlineNumber).toBe('2 of 4');
    expect(vm.headlineWords).toBe('sessions');
    expect(vm.subline).toBe('in week 2 of your plan · Upper B is next');
    expect(vm.weekIndex).toBe(2);
    expect(vm.plannedWeeks).toBe(6);
    expect(vm.accessibilityLabel).toBe('2 of 4 sessions in week 2 of your plan. Upper B is next.');
  });

  test('the plan week is never the calendar week: a set logged this Monday week does not change the count', () => {
    // Three sessions logged this calendar week; the programme says 2 of 4.
    const sets = [
      { workoutId: 'w1', createdAt: at(0) }, { workoutId: 'w2', createdAt: at(1) }, { workoutId: 'w3', createdAt: at(2) },
    ];
    const vm = buildPlanWeekSummary({ position: position(), sets, now: NOW });
    expect(vm.headlineNumber).toBe('2 of 4');
    expect(vm.trainedDays).toEqual(['mon', 'tue', 'wed']);
  });

  test('"done" counts completed sessions only; skipped and ended-early sessions are resolved, not done', () => {
    const sessions = [
      session('Upper A', 1, SESSION_STATE.COMPLETED),
      session('Lower A', 2, SESSION_STATE.SKIPPED_BY_USER),
      session('Upper B', 3, SESSION_STATE.ENDED_EARLY),
      session('Lower B', 4, SESSION_STATE.OUTSTANDING),
    ];
    const vm = buildPlanWeekSummary({ position: position({ sessions }), now: NOW });
    expect(vm.done).toBe(1);
    expect(vm.required).toBe(4);
    expect(vm.headlineNumber).toBe('1 of 4');
  });

  test('a duplicate session name is qualified exactly as Home qualifies it (sessionDisplayName)', () => {
    const sessions = [
      session('Glutes', 1, SESSION_STATE.COMPLETED),
      session('Glutes', 2, SESSION_STATE.OUTSTANDING),
      session('Upper', 3, SESSION_STATE.OUTSTANDING),
    ];
    const vm = buildPlanWeekSummary({ position: position({ sessions }), now: NOW });
    expect(vm.nextName).toBe('Glutes · Workout 2 of 3');
    expect(vm.subline).toBe('in week 2 of your plan · Glutes · Workout 2 of 3 is next');
  });

  test('a complete week reads "every session done": a fact, not an instruction', () => {
    const sessions = [
      session('Upper A', 1, SESSION_STATE.COMPLETED),
      session('Lower A', 2, SESSION_STATE.COMPLETED),
    ];
    const vm = buildPlanWeekSummary({ position: position({ sessions, nextSession: null, weekResolved: true }), now: NOW });
    expect(vm.weekComplete).toBe(true);
    expect(vm.headlineNumber).toBe('2 of 2');
    expect(vm.subline).toBe('in week 2 of your plan · every session done');
    expect(vm.subline).not.toMatch(/\b(keep|go|try|aim|should|must)\b/i);
  });

  test('the planned recovery week is named as such; an adaptive adjustment is not', () => {
    const planned = buildPlanWeekSummary({
      position: position({ activeWeekIndex: 6, recoveryState: { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY } }),
      now: NOW,
    });
    expect(planned.recoveryWeek).toBe(true);
    expect(planned.subline).toBe('in week 6 of your plan, a recovery week · Upper B is next');

    const adaptive = buildPlanWeekSummary({
      position: position({ recoveryState: { state: RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT } }),
      now: NOW,
    });
    expect(adaptive.recoveryWeek).toBe(false);
    expect(adaptive.subline).toBe('in week 2 of your plan · Upper B is next');
  });

  test('one required session takes the singular', () => {
    const sessions = [session('Full body', 1, SESSION_STATE.OUTSTANDING)];
    const vm = buildPlanWeekSummary({ position: position({ sessions }), now: NOW });
    expect(vm.headlineNumber).toBe('0 of 1');
    expect(vm.headlineWords).toBe('session');
  });

  test('an unreadable week index still prints the plan words without a number', () => {
    const vm = buildPlanWeekSummary({ position: position({ activeWeekIndex: null }), now: NOW });
    expect(vm.weekIndex).toBeNull();
    expect(vm.subline).toBe('in your plan this week · Upper B is next');
  });
});

describe('buildPlanWeekSummary without a plan', () => {
  test('a null position falls back to the Monday-anchored calendar count, plural', () => {
    const sets = [
      { workoutId: 'w1', createdAt: at(0) }, { workoutId: 'w1', createdAt: at(0, 11) },
      { workoutId: 'w2', createdAt: at(2) },
    ];
    const vm = buildPlanWeekSummary({ position: null, sets, now: NOW });
    expect(vm.hasPlan).toBe(false);
    expect(vm.headlineNumber).toBe('2');
    // RE-ANCHORED addendum 9 (P13, rule 3): an open-week count says "so far".
    expect(vm.headlineWords).toBe('sessions so far this week');
    expect(vm.subline).toBeNull();
    expect(vm.required).toBeNull();
    expect(vm.accessibilityLabel).toBe('2 sessions so far this week.');
  });

  test('one session takes the singular; none reads 0', () => {
    const one = buildPlanWeekSummary({ position: null, sets: [{ workoutId: 'w1', createdAt: at(1) }], now: NOW });
    expect(one.headlineNumber).toBe('1');
    expect(one.headlineWords).toBe('session so far this week');
    const none = buildPlanWeekSummary({ position: null, sets: [], now: NOW });
    expect(none.headlineNumber).toBe('0');
    expect(none.headlineWords).toBe('sessions so far this week');
    expect(none.trainedDays).toEqual([]);
  });

  test('a position with no required sessions is no plan reading either', () => {
    const vm = buildPlanWeekSummary({ position: position({ sessions: [], nextSession: null }), sets: [{ workoutId: 'w1', createdAt: at(1) }], now: NOW });
    expect(vm.hasPlan).toBe(false);
    expect(vm.headlineNumber).toBe('1');
  });
});

describe('the seven cells read the Monday-anchored local week only', () => {
  test('trained days come back Monday first, inside the week, deduplicated per day', () => {
    const sets = [
      { createdAt: at(-1) },        // last Sunday: outside
      { createdAt: at(0, 7) }, { createdAt: at(0, 18) }, // Monday twice
      { createdAt: at(3) },         // Thursday (today)
      { createdAt: at(5) },         // Saturday (later this week, still this week)
      { createdAt: at(7) },         // next Monday: outside
      { createdAt: 'nope' },        // unreadable: ignored
    ];
    expect(trainedDayKeys(sets, NOW)).toEqual(['mon', 'thu', 'sat']);
  });

  test('today\'s key is the local weekday in DayDots\' vocabulary', () => {
    expect(weekdayKey(NOW)).toBe('thu');
    expect(buildPlanWeekSummary({ now: NOW }).todayKey).toBe('thu');
  });

  test('the week ends at the next local Monday, not 168 hours on (clock-change weeks keep their length)', () => {
    // The UK autumn clock change: Sunday 25 October 2026. Monday 26 Oct 00:30
    // local is 169 hours after Monday 19 Oct 00:00 local; a fixed 168-hour
    // week would still count it as the old week.
    const autumnNow = new Date(2026, 9, 22, 12, 0, 0).getTime(); // Thursday 22 Oct
    const start = localWeekStartMs(autumnNow);
    const nextMondayLocal = new Date(2026, 9, 26, 0, 30, 0).getTime();
    expect(trainedDayKeys([{ createdAt: nextMondayLocal }], autumnNow)).toEqual([]);
    expect(trainedDayKeys([{ createdAt: start + 6 * DAY + 12 * 60 * 60 * 1000 }], autumnNow)).toEqual(['sun']);
  });

  test('sessionsThisWeek counts distinct workouts inside the week', () => {
    const sets = [
      { workoutId: 'a', createdAt: at(0) }, { workoutId: 'a', createdAt: at(0, 11) },
      { workoutId: 'b', createdAt: at(2) }, { workoutId: 'c', createdAt: at(-2) },
    ];
    expect(sessionsThisWeek(sets, NOW)).toBe(2);
  });
});

// D214 addendum 9 (census 6.13): the cells light on the days a completed workout
// STARTED (the grid's days), passed in as local day keys.
describe('the seven cells read the days a completed workout started (6.13)', () => {
  // Thursday 2026-10-01; the week runs Mon 28 Sep .. Sun 4 Oct (local).
  const key = (dayOffset) => localDayKey(at(dayOffset, 12));
  const MON = key(0); // 2026-09-28
  const TUE = key(1);
  const THU = key(3);

  test('the week\'s days come back Monday first, deduplicated; keys outside the week and non-keys are ignored', () => {
    expect(MON).toBe('2026-09-28');
    expect(sessionDayKeysThisWeek([key(6), THU, MON, MON, key(-1), key(7), 'nope', null, 42], NOW)).toEqual(['mon', 'thu', 'sun']);
    expect(sessionDayKeysThisWeek([], NOW)).toEqual([]);
    expect(sessionDayKeysThisWeek(undefined, NOW)).toEqual([]);
  });

  test('a session started at 23:30 on Monday with sets after midnight is Monday only (the grid\'s day)', () => {
    const startedMon2330 = new Date(2026, 8, 28, 23, 30, 0).getTime();
    const setsAfterMidnight = [
      { workoutId: 'w1', createdAt: startedMon2330 },
      { workoutId: 'w1', createdAt: startedMon2330 + 45 * 60 * 1000 }, // 00:15 on Tuesday
    ];
    const vm = buildPlanWeekSummary({ position: position(), sets: setsAfterMidnight, completedDays: [MON], now: NOW });
    expect(vm.trainedDays).toEqual(['mon']);
    // The old reading, still what a caller with no day list gets, lit both days.
    const legacy = buildPlanWeekSummary({ position: position(), sets: setsAfterMidnight, now: NOW });
    expect(legacy.trainedDays).toEqual(['mon', 'tue']);
  });

  test('a session started at 23:00 on the Sunday before is last week\'s: no dot on this Monday', () => {
    const startedSun2300 = new Date(2026, 8, 27, 23, 0, 0).getTime();
    const sets = [{ workoutId: 'w0', createdAt: startedSun2300 + 90 * 60 * 1000 }]; // 00:30 on Monday
    const vm = buildPlanWeekSummary({ position: position(), sets, completedDays: [key(-1)], now: NOW });
    expect(vm.trainedDays).toEqual([]);
    expect(buildPlanWeekSummary({ position: position(), sets, now: NOW }).trainedDays).toEqual(['mon']);
  });

  test('a completed workout with no sets still marks its day, as it marks the grid', () => {
    const vm = buildPlanWeekSummary({ position: position(), sets: [], completedDays: [TUE], now: NOW });
    expect(vm.trainedDays).toEqual(['tue']);
  });

  test('an empty day list is "no completed session", never a fall back to the sets', () => {
    const sets = [{ workoutId: 'w1', createdAt: at(0) }];
    expect(buildPlanWeekSummary({ position: position(), sets, completedDays: [], now: NOW }).trainedDays).toEqual([]);
  });

  test('only the cells move: the count (plan and no plan) still reads the plan week and the sets', () => {
    const sets = [{ workoutId: 'w1', createdAt: at(0) }, { workoutId: 'w2', createdAt: at(2) }];
    const withPlan = buildPlanWeekSummary({ position: position(), sets, completedDays: [THU], now: NOW });
    expect(withPlan.headlineNumber).toBe('2 of 4');
    expect(withPlan.trainedDays).toEqual(['thu']);
    const noPlan = buildPlanWeekSummary({ position: null, sets, completedDays: [THU], now: NOW });
    expect(noPlan.headlineNumber).toBe('2');
    expect(noPlan.trainedDays).toEqual(['thu']);
  });

  test('the clock-change week keeps its seven days (UK autumn change, Sunday 25 October 2026)', () => {
    const autumnNow = new Date(2026, 9, 22, 12, 0, 0).getTime(); // Thursday 22 Oct
    expect(sessionDayKeysThisWeek(['2026-10-19', '2026-10-25'], autumnNow)).toEqual(['mon', 'sun']);
    expect(sessionDayKeysThisWeek(['2026-10-26', '2026-10-18'], autumnNow)).toEqual([]);
    // And the spring change (Sunday 29 March 2026), seen from that week's Wednesday.
    const springNow = new Date(2026, 2, 25, 12, 0, 0).getTime();
    expect(sessionDayKeysThisWeek(['2026-03-23', '2026-03-29', '2026-03-30'], springNow)).toEqual(['mon', 'sun']);
  });

  test('the screens hand the grid\'s own days to the card: AnalyticsScreen passes calValues\' dates', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'screens', 'AnalyticsScreen.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/calValues\.map\(\(v\) => v\.date\)/);
    expect(code).toMatch(/buildPlanWeekSummary\(\{[^}]*completedDays/);
  });
});

describe('the module stays pure', () => {
  test('planWeek.js imports no database, store or screen (both screens call it on loaded data)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'planWeek.js'), 'utf8');
    expect(src).not.toMatch(/from '\.\.\/database'|require\(.*database/);
    expect(src).not.toMatch(/useAppStore|AsyncStorage|react-native/);
    // No instruction to the athlete in any string it builds (D204).
    expect(src).not.toMatch(/\b(keep going|try to|aim for|you should|don't forget)\b/i);
  });
});

// D214 addendum 6 (lane 4 review S2): a finished block awaiting the athlete's
// decision claims no live plan week, whatever the position still says.
describe('a finished block', () => {
  const { SESSION_STATE } = require('../../blockProgression');
  const NOW = Date.UTC(2026, 9, 1, 12);
  const position = {
    activeWeekIndex: 6, plannedWeeks: 6, weekResolved: false,
    sessions: [{ routineId: 'a', name: 'Upper B', order: 1, state: SESSION_STATE.OUTSTANDING }],
    nextSession: { routineId: 'a', name: 'Upper B', order: 1 },
    recoveryState: null,
  };
  test('finished: the calendar count, "Block finished" as the subline, no week and no next session', () => {
    const out = buildPlanWeekSummary({ position, sets: [], now: NOW, finished: true });
    expect(out.hasPlan).toBe(false);
    expect(out.finished).toBe(true);
    expect(out.headlineNumber).toBe('0');
    expect(out.headlineWords).toBe('sessions so far this week');
    expect(out.subline).toBe('Block finished');
    expect(out.accessibilityLabel).toBe('0 sessions so far this week. Block finished.');
    expect(JSON.stringify(out)).not.toMatch(/week 6|is next/);
  });
  test('not finished: the plan reading as before', () => {
    const out = buildPlanWeekSummary({ position, sets: [], now: NOW });
    expect(out.hasPlan).toBe(true);
    expect(out.subline).toBe('in week 6 of your plan · Upper B is next');
  });
});
