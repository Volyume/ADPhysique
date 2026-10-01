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
 *    screens can call it on already-loaded data.
 */
const fs = require('fs');
const path = require('path');
import { buildPlanWeekSummary, trainedDayKeys, sessionsThisWeek, weekdayKey } from '../planWeek';
import { SESSION_STATE } from '../../blockProgression';
import { RECOVERY_STATE } from '../../recoveryState';
import { localWeekStartMs } from '../../dayKey';

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
    expect(vm.headlineWords).toBe('sessions this week');
    expect(vm.subline).toBeNull();
    expect(vm.required).toBeNull();
    expect(vm.accessibilityLabel).toBe('2 sessions this week.');
  });

  test('one session takes the singular; none reads 0', () => {
    const one = buildPlanWeekSummary({ position: null, sets: [{ workoutId: 'w1', createdAt: at(1) }], now: NOW });
    expect(one.headlineNumber).toBe('1');
    expect(one.headlineWords).toBe('session this week');
    const none = buildPlanWeekSummary({ position: null, sets: [], now: NOW });
    expect(none.headlineNumber).toBe('0');
    expect(none.headlineWords).toBe('sessions this week');
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

describe('the module stays pure', () => {
  test('planWeek.js imports no database, store or screen (both screens call it on loaded data)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'planWeek.js'), 'utf8');
    expect(src).not.toMatch(/from '\.\.\/database'|require\(.*database/);
    expect(src).not.toMatch(/useAppStore|AsyncStorage|react-native/);
    // No instruction to the athlete in any string it builds (D204).
    expect(src).not.toMatch(/\b(keep going|try to|aim for|you should|don't forget)\b/i);
  });
});
