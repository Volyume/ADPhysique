/**
 * sessionCount.test.js - register D214 addendum 9, census 6.11: ONE definition
 * of "a logged session" behind the Progress root's Recaps count, the
 * Consistency milestone and the Training row's gate.
 *
 * What this suite pins and why:
 *  - the rule is the milestone's own: a COMPLETED workout that carries a cached
 *    set count above zero OR set rows;
 *  - the three edge cases on which the old counts disagreed are recorded here,
 *    each with the count it used to give and the one it gives now:
 *      (a) a completed workout with a cached count and no set rows: counted by
 *          the milestone only, now counted everywhere;
 *      (b) a completed workout with no sets at all: counted by the Training
 *          gate only (it required a start time, nothing else), now counted
 *          nowhere, so the Training row can no longer read "No strength
 *          training logged" while the Recaps door counts the same person's
 *          sessions;
 *      (c) set rows whose workout is not in the list (or not completed): the
 *          Recaps count used to take distinct workout ids among set rows, so it
 *          counted them; now they count nowhere;
 *  - a session counts once however many sets it has, camelCased and
 *    snake_cased rows read alike, and bad input is zero, never a throw;
 *  - the three readers import this module and none keeps a rule of its own.
 */
import fs from 'fs';
import path from 'path';
import { loggedSessionWorkouts, countLoggedSessions } from '../sessionCount';

const wk = (id, over = {}) => ({ id, isCompleted: true, startedAt: 1000, ...over });
const st = (workoutId, over = {}) => ({ workoutId, ...over });

describe('the rule: completed, with a cached set count above zero or with set rows', () => {
  test('a completed workout with set rows counts, once however many sets it has', () => {
    expect(countLoggedSessions([wk('w1')], [st('w1'), st('w1'), st('w1')])).toBe(1);
  });

  test('two completed workouts with sets are two sessions', () => {
    expect(countLoggedSessions([wk('w1'), wk('w2')], [st('w1'), st('w2'), st('w2')])).toBe(2);
  });

  test('a cached set count above zero counts with no set rows loaded', () => {
    expect(countLoggedSessions([wk('w1', { setCount: 6 })], [])).toBe(1);
  });

  test('a cached set count of zero does not count on its own', () => {
    expect(countLoggedSessions([wk('w1', { setCount: 0 })], [])).toBe(0);
  });

  test('set rows count even when the cached count is zero', () => {
    expect(countLoggedSessions([wk('w1', { setCount: 0 })], [st('w1')])).toBe(1);
  });

  test('a workout that is not completed never counts, whatever it carries', () => {
    expect(countLoggedSessions([wk('w1', { isCompleted: false, setCount: 4 })], [st('w1')])).toBe(0);
  });
});

describe('the edge cases the three old counts disagreed on (census 6.11)', () => {
  test('(a) a completed workout with a cached count and no set rows is a session', () => {
    const workouts = [wk('w1', { setCount: 5 })];
    expect(countLoggedSessions(workouts, [])).toBe(1);
  });

  test('(b) a completed workout with no sets at all is not a session', () => {
    const workouts = [wk('w1'), wk('w2', { setCount: null })];
    expect(countLoggedSessions(workouts, [])).toBe(0);
    // So a person whose only completed workout has no sets reads day zero on
    // the Training row (completedWorkoutCount is this count), not "No strength
    // training logged" beside a Recaps door that counts it.
  });

  test('(b) the start time is not part of the rule: a completed workout with sets and no start time counts', () => {
    expect(countLoggedSessions([wk('w1', { startedAt: null })], [st('w1')])).toBe(1);
  });

  test('(c) set rows whose workout is missing from the list do not count', () => {
    expect(countLoggedSessions([wk('w1')], [st('w1'), st('gone'), st('gone')])).toBe(1);
  });

  test('(c) set rows of a workout that is not completed do not count', () => {
    expect(countLoggedSessions([wk('w1', { isCompleted: false })], [st('w1')])).toBe(0);
  });

  test('a set row with no workout id is ignored', () => {
    expect(countLoggedSessions([wk('w1')], [{ exerciseId: 'e1' }, st(null)])).toBe(0);
  });
});

describe('rows and input', () => {
  test('snake_cased rows read the same as camelCased ones', () => {
    const workouts = [{ id: 'w1', is_completed: 1, set_count: 3 }, { id: 'w2', is_completed: true }];
    expect(countLoggedSessions(workouts, [{ workout_id: 'w2' }])).toBe(2);
  });

  test('a completed flag of 0 or false is not completed', () => {
    expect(countLoggedSessions([{ id: 'w1', isCompleted: 0, setCount: 3 }, { id: 'w2', is_completed: false, setCount: 3 }], [])).toBe(0);
  });

  test('missing or non-array input is zero, never a throw', () => {
    expect(countLoggedSessions(undefined, undefined)).toBe(0);
    expect(countLoggedSessions(null, null)).toBe(0);
    expect(countLoggedSessions('nope', 7)).toBe(0);
    expect(countLoggedSessions([null, undefined, {}], [null, undefined])).toBe(0);
  });

  test('loggedSessionWorkouts returns the workouts themselves, in the order given', () => {
    const a = wk('a', { startedAt: 3 });
    const b = wk('b', { startedAt: 1 });
    const c = wk('c', { isCompleted: false });
    const out = loggedSessionWorkouts([a, c, b], [st('a'), st('b'), st('c')]);
    expect(out).toEqual([a, b]);
    expect(out[0]).toBe(a);
  });
});

describe('the readers share this module and keep no rule of their own', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test('useProgressData counts the Recaps number and the Training gate through the helper', () => {
    const src = read('../../../hooks/useProgressData.js');
    const code = stripComments(src);
    expect(src).toContain("import { countLoggedSessions } from '../lib/progress/sessionCount';");
    expect(code).toMatch(/countLoggedSessions\(workouts, sets\)/);
    // The two retired rules: every completed workout with a start time, and
    // distinct workout ids among set rows.
    expect(code).not.toMatch(/setCompletedWorkoutCount\(completed\.length\)/);
    expect(code).not.toMatch(/new Set\(allSets\.map/);
  });

  test('the Consistency milestone (ReadinessCards) reads the same list', () => {
    const src = read('../../../components/ReadinessCards.js');
    const code = stripComments(src);
    expect(src).toContain("import { loggedSessionWorkouts } from '../lib/progress/sessionCount';");
    expect(code).toMatch(/loggedSessionWorkouts\(workouts, sets\)/);
    expect(code).not.toMatch(/setsPerWorkout/);
  });

  test('the module is pure: no database, store, clock or screen import', () => {
    const code = stripComments(read('../sessionCount.js'));
    expect(code).not.toMatch(/\bimport\b/);
    expect(code).not.toMatch(/Date\.now|useAppStore|AsyncStorage|react-native|database/);
  });
});
