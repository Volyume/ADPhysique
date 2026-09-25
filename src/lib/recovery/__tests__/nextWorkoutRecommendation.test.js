/**
 * nextWorkoutRecommendation.test.js -- the next-workout recommendation rule
 * (register D201, spec docs/recovery-programme-2026-09-25/00-SPEC.md
 * section 4.2, F1 RULED).
 *
 * Pins every branch of the rule: programme order is kept when programmeNext
 * is ready OR nothing else qualifies; a recommendation requires ALL THREE
 * conditions (programmeNext not_yet at the projected time, another
 * outstanding session ready at that time, that session not itself loading
 * programmeNext's limiting muscle with >= 2 planned sets); the highest
 * minimum readiness wins among qualifying candidates; ties resolve to
 * programme order; a resolved session can never be recommended or appear in
 * perSession; the exact copy strings (programmeNextLine, reason, and each
 * perSession line), including the weekday word; determinism.
 */
import { recommendNextWorkout, readyByPhrase } from '../nextWorkoutRecommendation';
import { SESSION_STATE } from '../../blockProgression';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * A recovery-map entry with no contributingSessions: projectRecovery leaves
 * it byte-identical (muscleRecoveryModel.js's own documented behaviour for
 * an entry with nothing to re-derive), so readinessNow and
 * readinessAtProjected read the SAME percent/status/readyAtMs -- exactly
 * what most of this rule's branches need to isolate, without depending on
 * the model's own decay maths.
 */
function staticEntry(muscle, { recoveredPercent, status, readyAtMs = null }) {
  return {
    muscle, recoveredPercent, status, readyAtMs,
    lastSessionEndMs: 0, lastSessionSets: 6, basis: 'time_and_volume', contributingSessions: [],
  };
}

/**
 * A REAL decaying entry (one contributing session), for the one test that
 * must prove the rule reads the PROJECTED verdict, not the now verdict.
 * F=1 (reference dose), residual(t) = max(0, 1 - (t - endMs) / (hoursT * 1h)).
 */
function decayingEntry(muscle, { endMs, hoursT, sets = 6 }) {
  const readyAtMs = endMs + 0.9 * hoursT * HOUR_MS; // residual crosses 0.1 (90%) here
  return {
    muscle, recoveredPercent: null, status: null, readyAtMs,
    lastSessionEndMs: endMs, lastSessionSets: sets, basis: 'time_and_volume',
    contributingSessions: [{ workoutId: 'w', endMs, sets, hoursT }],
  };
}

function session(routineId, name, order, state = SESSION_STATE.OUTSTANDING) {
  return { mesocycleWeekId: 'w1', routineId, name, position: order - 1, order, state };
}

const NAMES = { legs: 'Legs', push: 'Push', pull: 'Pull' };
const NOW = 10 * DAY_MS; // arbitrary fixed epoch, well clear of 0

describe('programme order is kept', () => {
  test('programmeNext is fully ready: no recommendation, "every muscle" copy', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 95, status: 'recovered' }) };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    expect(result.recommended).toBeNull();
    expect(result.reason).toBeNull();
    expect(result.programmeNextLine).toBe('Every muscle it trains is estimated recovered.');
  });

  test('programmeNext not ready, but no OTHER outstanding session exists: no recommendation', () => {
    const sessions = [session('legs', 'Legs', 1)];
    const readyAtMs = NOW + 2 * DAY_MS;
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }) };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.recommended).toBeNull();
    expect(result.reason).toBeNull();
    expect(result.programmeNextLine).toBe(`Quads are estimated 64% recovered, ready by ${readyByPhrase(readyAtMs, NOW)}.`);
  });

  test('programmeNext not ready, another outstanding session IS ready, but it shares the limiting muscle with >= 2 planned sets: no recommendation', () => {
    const sessions = [session('legs', 'Legs', 1), session('pull', 'Pull', 2)];
    const readyAtMs = NOW + 2 * DAY_MS;
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }) };
    const result = recommendNextWorkout({
      sessions,
      // "pull" also loads quads with 2+ sets -- disqualified even though it is otherwise ready.
      plannedSetsByRoutine: { legs: { quads: 10 }, pull: { back: 10, quads: 2 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.recommended).toBeNull();
  });

  test('a resolved session (completed) is never recommended and never appears in perSession', () => {
    const sessions = [
      session('legs', 'Legs', 1),
      { ...session('push', 'Push', 2), state: SESSION_STATE.COMPLETED },
    ];
    const readyAtMs = NOW + 2 * DAY_MS;
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }),
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.recommended).toBeNull();
    expect(result.perSession.map((p) => p.routineId)).toEqual(['legs']);
  });

  test('a candidate whose planned sets are UNKNOWN (null: the read failed) is never a candidate, even though it would otherwise look ready', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const readyAtMs = NOW + 2 * DAY_MS;
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }),
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions,
      // Push's own planned sets failed to load (null, not {}) -- it must
      // never be read as "fully ready" merely because chest happens to be
      // recovered; there is no read behind that claim for Push at all.
      plannedSetsByRoutine: { legs: { quads: 10 }, push: null },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.recommended).toBeNull();
    const push = result.perSession.find((p) => p.routineId === 'push');
    expect(push.verdict).toBeNull();
    expect(push.readinessNow).toBeNull();
    expect(push.readinessAtProjected).toBeNull();
    expect(push.line).toBeNull();
  });

  test('programmeNext\'s OWN planned sets are unknown: no recommendation is attempted and no line claims an estimate', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const recoveryMap = { chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }) };
    const result = recommendNextWorkout({
      sessions,
      // Legs (programmeNext) itself could not be read -- an unknown session
      // must not silently become "not_yet" (which would trigger a
      // recommendation off no real evidence) or "ready" (which would hide a
      // genuine unknown behind a false all-clear).
      plannedSetsByRoutine: { legs: null, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    expect(result.recommended).toBeNull();
    expect(result.reason).toBeNull();
    // Lead review: with no read behind it there is no estimate to state, so
    // the line is null rather than a false "estimated recovered" all-clear.
    expect(result.programmeNextLine).toBeNull();
    const legs = result.perSession.find((p) => p.routineId === 'legs');
    expect(legs.verdict).toBeNull();
  });
});

describe('a recommendation is made when all three conditions hold', () => {
  test('another ready, non-overlapping session becomes the recommendation, with the ruled copy', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const readyAtMs = NOW + 2 * DAY_MS; // Thursday, if NOW is a Tuesday -- see below
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }),
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    expect(result.recommended).toEqual({ routineId: 'push' });
    expect(result.reason).toBe(`Legs is next in your plan. Quads are estimated 64% recovered, ready by ${readyByPhrase(readyAtMs, NOW)}. Push is ready now.`);
    expect(result.programmeNextLine).toBe(`Quads are estimated 64% recovered, ready by ${readyByPhrase(readyAtMs, NOW)}.`);
  });

  test('the rule reads the PROJECTED verdict, not the readiness at now', () => {
    // One real session hits quads hard 40 hours before "now": not ready yet
    // (residual still high), but comfortably crossed 90% by the projected
    // time 70 hours after that same session end.
    const sessionEnd = 0;
    const nowMs = sessionEnd + 40 * HOUR_MS;
    const projectedAtMs = sessionEnd + 70 * HOUR_MS;
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const recoveryMap = {
      quads: decayingEntry('quads', { endMs: sessionEnd, hoursT: 72 }),
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
    };
    // Not ready RIGHT NOW.
    const nowResult = recommendNextWorkout({
      sessions, plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: nowMs, nowMs, routineNamesById: NAMES,
    });
    expect(nowResult.recommended).toEqual({ routineId: 'push' });
    // But by the projected time it WILL be ready -- no recommendation then.
    const projectedResult = recommendNextWorkout({
      sessions, plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs, nowMs, routineNamesById: NAMES,
    });
    expect(projectedResult.recommended).toBeNull();
  });

  test('among several qualifying candidates, the highest minimum readiness (at the projected time) wins', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2), session('pull', 'Pull', 3)];
    const readyAtMs = NOW + DAY_MS;
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }),
      chest: staticEntry('chest', { recoveredPercent: 91, status: 'recovered' }),
      back: staticEntry('back', { recoveredPercent: 99, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 }, pull: { back: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.recommended).toEqual({ routineId: 'pull' }); // 99 beats 91
  });

  test('a tie in minimum readiness resolves to programme order', () => {
    const sessions = [session('legs', 'Legs', 1), session('pull', 'Pull', 3), session('push', 'Push', 2)];
    const readyAtMs = NOW + DAY_MS;
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }),
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
      back: staticEntry('back', { recoveredPercent: 95, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 }, pull: { back: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    // Push (order 2) ties Pull (order 3) at 95% -- programme order wins.
    expect(result.recommended).toEqual({ routineId: 'push' });
  });
});

describe('per-session copy (used by the change-workout sheet)', () => {
  test('a ready session reads "Ready now."', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs: NOW + DAY_MS }),
      chest: staticEntry('chest', { recoveredPercent: 100, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions, plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    const push = result.perSession.find((p) => p.routineId === 'push');
    expect(push.line).toBe('Ready now.');
  });

  test('a not-yet-ready session names its limiting muscle, percent and ready-by day', () => {
    const sessions = [session('legs', 'Legs', 1)];
    const readyAtMs = NOW + DAY_MS;
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }) };
    const result = recommendNextWorkout({
      sessions, plannedSetsByRoutine: { legs: { quads: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    const legs = result.perSession.find((p) => p.routineId === 'legs');
    expect(legs.line).toBe(`Quads are estimated 64% recovered, ready by ${readyByPhrase(readyAtMs, NOW)}.`);
  });

  test('a singular muscle name takes "is", not "are"', () => {
    const sessions = [session('legs', 'Legs', 1)];
    const readyAtMs = NOW + DAY_MS;
    const recoveryMap = { chest: staticEntry('chest', { recoveredPercent: 50, status: 'recovering', readyAtMs }) };
    const result = recommendNextWorkout({
      sessions, plannedSetsByRoutine: { legs: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.perSession[0].line).toMatch(/^Chest is estimated 50% recovered/);
  });

  test('no figure ever appears without the word "estimated" (source guard)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'nextWorkoutRecommendation.js'), 'utf8');
    // Every template that carries a percent placeholder also carries "estimated".
    const percentLines = src.split('\n').filter((l) => l.includes('${percent}%'));
    expect(percentLines.length).toBeGreaterThan(0);
    for (const line of percentLines) expect(line).toMatch(/estimated/);
    expect(src).not.toMatch(/you must/i);
    expect(src).not.toMatch(/\bskip\b/i);
  });
});

describe('readyByPhrase', () => {
  test('today, tomorrow, a weekday name, and "in N days" past a week', () => {
    expect(readyByPhrase(NOW, NOW)).toBe('today');
    expect(readyByPhrase(NOW + 12 * HOUR_MS, NOW)).toBe('today');
    expect(readyByPhrase(NOW + DAY_MS, NOW)).toBe('tomorrow');
    expect(readyByPhrase(NOW + 8 * DAY_MS, NOW)).toBe('in 8 days');
  });

  test('non-finite input never throws', () => {
    expect(readyByPhrase(null, NOW)).toBe('today');
    expect(readyByPhrase(NaN, NOW)).toBe('today');
  });
});

describe('never a crash on absent input, and determinism', () => {
  test('no sessions at all: the calm empty shape', () => {
    const result = recommendNextWorkout({});
    expect(result).toEqual({ programmeNext: null, recommended: null, reason: null, programmeNextLine: null, perSession: [] });
  });

  test('the same inputs give the same output every time', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const readyAtMs = NOW + DAY_MS;
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }),
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
    };
    const params = {
      sessions, plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    };
    expect(recommendNextWorkout(params)).toEqual(recommendNextWorkout(params));
  });
});
