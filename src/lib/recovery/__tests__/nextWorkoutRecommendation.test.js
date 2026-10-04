/**
 * nextWorkoutRecommendation.test.js -- the per-session readiness the
 * Recovery screen and Home describe (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 4), and, since D219
 * (founder 2026-10-04: "Next workout should be planned as the plan builds it
 * we shouldn't be having users to view the plan and see a recommendation and
 * change order"), the proof that this module NEVER recommends another
 * session.
 *
 * RE-PINNED under D219 lane A6 (design 00-AUDIT-AND-PLAN.md section 7: "the
 * swap rule and its reason ... removed"). What the suite used to pin as the
 * swap rule (a `recommended` session chosen when programme next was
 * not_yet, another outstanding session ready and not overlapping, the
 * highest readiness winning, ties to programme order) and its reason
 * ("Legs is next in your plan. ... Push is estimated ready now.") is now
 * pinned the other way round: the same scenarios produce no recommendation
 * and no reason, the result carries no such fields, and the sessions stay in
 * programme order, never ranked by readiness. Everything else the module
 * computes is kept and still pinned here: the programme-next resolution
 * (the first OUTSTANDING session in programme order), each outstanding
 * session's readiness now and at the projected time, the programme-next
 * line and each session's own line, "unknown is never ready", "no evidence is
 * never ready" in copy (D214 RC-5), the readyClause wording and determinism.
 * A later lane builds the Recovery screen's "Next in your plan" card from
 * exactly these fields.
 *
 * RE-ANCHORED under D214 (lane 2, RC-5): the programme-next line no longer
 * prints "Every muscle it trains is estimated recovered." for muscles with
 * nothing behind them. With NO counted muscle having a session in the last
 * 14 days it says "No recent session on the muscles <Name> trains."; with
 * only SOME having one it names those as recovered and the rest as having
 * no recent session; "every muscle" stays only where every counted muscle
 * has a session behind it (D201 ruling 13's "no evidence is never ready",
 * in its mixed case).
 */
import { recommendNextWorkout, readyClause } from '../nextWorkoutRecommendation';
import { SESSION_STATE } from '../../blockProgression';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * A recovery-map entry with no contributingSessions: projectRecovery leaves
 * it byte-identical (muscleRecoveryModel.js's own documented behaviour for
 * an entry with nothing to re-derive), so readinessNow and
 * readinessAtProjected read the SAME percent/status/readyAtMs -- exactly
 * what most branches need to isolate, without depending on the model's own
 * decay maths.
 */
function staticEntry(muscle, { recoveredPercent, status, readyAtMs = null }) {
  return {
    muscle, recoveredPercent, status, readyAtMs,
    lastSessionEndMs: 0, lastSessionSets: 6, basis: 'time_and_volume', contributingSessions: [],
  };
}

/**
 * A REAL decaying entry (one contributing session), for the one test that
 * must prove the projected reading differs from the reading now.
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

// The only keys a result carries now. `recommended` and `reason` are gone.
const RESULT_KEYS = ['perSession', 'programmeNext', 'programmeNextLine'];

describe('programme order is kept', () => {
  test('programmeNext is fully ready: "every muscle" copy, and no swap fields at all', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 95, status: 'recovered' }) };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    expect(result).not.toHaveProperty('recommended');
    expect(result).not.toHaveProperty('reason');
    expect(result.programmeNextLine).toBe('Every muscle it trains is estimated recovered.');
  });

  test('programmeNext not ready and no OTHER outstanding session exists: the line still names the limiting muscle', () => {
    const sessions = [session('legs', 'Legs', 1)];
    const readyAtMs = NOW + 2 * DAY_MS;
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }) };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(Object.keys(result).sort()).toEqual(RESULT_KEYS);
    expect(result.programmeNextLine).toBe(`Quads are estimated 64% recovered, ${readyClause(readyAtMs, NOW)}.`);
  });

  test('programmeNext is not_yet at the projected time and the other session is too: each session reports its own verdict and the line names the limiting muscle', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const legsReadyAt = NOW + 2 * DAY_MS;
    const pushReadyAt = NOW + 3 * DAY_MS;
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs: legsReadyAt }),
      chest: staticEntry('chest', { recoveredPercent: 50, status: 'recovering', readyAtMs: pushReadyAt }),
    };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.perSession.find((p) => p.routineId === 'legs').verdict).toBe('not_yet');
    expect(result.perSession.find((p) => p.routineId === 'push').verdict).toBe('not_yet');
    expect(Object.keys(result).sort()).toEqual(RESULT_KEYS);
    expect(result.programmeNextLine).toBe(`Quads are estimated 64% recovered, ${readyClause(legsReadyAt, NOW)}.`);
  });

  test('a resolved session (completed) never appears in perSession', () => {
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
    expect(result.perSession.map((p) => p.routineId)).toEqual(['legs']);
  });

  test('programme next is the first OUTSTANDING session in programme order, not the most recovered one', () => {
    // Legs (order 1) is done; Push (order 2) is the plan's next even though
    // Pull (order 3) is the more recovered of the two.
    const sessions = [
      { ...session('legs', 'Legs', 1), state: SESSION_STATE.COMPLETED },
      session('push', 'Push', 2),
      session('pull', 'Pull', 3),
    ];
    const recoveryMap = {
      chest: staticEntry('chest', { recoveredPercent: 40, status: 'recovering', readyAtMs: NOW + DAY_MS }),
      back: staticEntry('back', { recoveredPercent: 100, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 }, pull: { back: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'push' });
  });

  test('a session whose planned sets are UNKNOWN (null: the read failed) is never read as ready', () => {
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
    const push = result.perSession.find((p) => p.routineId === 'push');
    expect(push.verdict).toBeNull();
    expect(push.readinessNow).toBeNull();
    expect(push.readinessAtProjected).toBeNull();
    expect(push.line).toBeNull();
  });

  test('programmeNext\'s OWN planned sets are unknown: no line claims an estimate', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const recoveryMap = { chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }) };
    const result = recommendNextWorkout({
      sessions,
      // Legs (programmeNext) itself could not be read -- an unknown session
      // must not silently become "not_yet" or "ready" (which would hide a
      // genuine unknown behind a false all-clear).
      plannedSetsByRoutine: { legs: null, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    // Lead review: with no read behind it there is no estimate to state, so
    // the line is null rather than a false "estimated recovered" all-clear.
    expect(result.programmeNextLine).toBeNull();
    const legs = result.perSession.find((p) => p.routineId === 'legs');
    expect(legs.verdict).toBeNull();
  });
});

describe('no other session is ever recommended (D219: the order is fixed when the plan is built)', () => {
  test('the old swap scenario (programme next not ready, another session ready and not overlapping) names no other session and no reason', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
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
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    expect(Object.keys(result).sort()).toEqual(RESULT_KEYS);
    expect(JSON.stringify(result)).not.toMatch(/is next in your plan|recommended|reason/);
    // The plan's next session is described, as before.
    expect(result.programmeNextLine).toBe(`Quads are estimated 64% recovered, ${readyClause(readyAtMs, NOW)}.`);
    // The other session's readiness is still reported, as a fact about it:
    // it is not offered, ranked or swapped in.
    const push = result.perSession.find((p) => p.routineId === 'push');
    expect(push.verdict).toBe('ready');
    expect(push.line).toBe('Estimated ready now.');
  });

  test('a session that overlaps the limiting muscle changes nothing either: the result has the same shape and the plan\'s next', () => {
    const sessions = [session('legs', 'Legs', 1), session('pull', 'Pull', 2)];
    const readyAtMs = NOW + 2 * DAY_MS;
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }) };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, pull: { back: 10, quads: 2 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    expect(Object.keys(result).sort()).toEqual(RESULT_KEYS);
  });

  test('sessions stay in programme order, never ranked by readiness (the old "highest readiness wins" is gone)', () => {
    // Given out of order on purpose; Pull (99%) and Push (91%) are both more
    // recovered than Legs, and programme order is still all that orders them.
    const sessions = [session('pull', 'Pull', 3), session('legs', 'Legs', 1), session('push', 'Push', 2)];
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
    expect(result.perSession.map((p) => p.routineId)).toEqual(['legs', 'push', 'pull']);
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
  });

  test('the readiness at the projected time is carried beside the readiness now (a session not ready now can read ready by then)', () => {
    // One real session hits quads hard 40 hours before "now": not ready yet
    // (residual still high), but comfortably past 90% by the projected time
    // 70 hours after that same session end.
    const sessionEnd = 0;
    const nowMs = sessionEnd + 40 * HOUR_MS;
    const projectedAtMs = sessionEnd + 70 * HOUR_MS;
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const recoveryMap = {
      quads: decayingEntry('quads', { endMs: sessionEnd, hoursT: 72 }),
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
    };
    const plannedSetsByRoutine = { legs: { quads: 10 }, push: { chest: 10 } };
    const atProjection = recommendNextWorkout({
      sessions, plannedSetsByRoutine, recoveryMap, projectedAtMs, nowMs, routineNamesById: NAMES,
    });
    const legs = atProjection.perSession.find((p) => p.routineId === 'legs');
    expect(legs.readinessNow.verdict).toBe('not_yet');
    expect(legs.readinessAtProjected.verdict).toBe('ready');
    // The flattened verdict is the projected one.
    expect(legs.verdict).toBe('ready');
    // With the projection at "now", the two readings agree.
    const atNow = recommendNextWorkout({
      sessions, plannedSetsByRoutine, recoveryMap, projectedAtMs: nowMs, nowMs, routineNamesById: NAMES,
    });
    expect(atNow.perSession.find((p) => p.routineId === 'legs').verdict).toBe('not_yet');
    // Neither reading ever produces a recommendation.
    expect(atProjection).not.toHaveProperty('recommended');
    expect(atNow).not.toHaveProperty('recommended');
  });
});

describe('per-session copy (a session the person picks on Home carries its own line)', () => {
  // RE-ANCHORED D214 addendum 9 (V6, D201): every "ready now" header says it is
  // an estimate; the per-session line is "Estimated ready now.".
  test('a ready session reads "Estimated ready now."', () => {
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
    expect(push.line).toBe('Estimated ready now.');
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
    expect(legs.line).toBe(`Quads are estimated 64% recovered, ${readyClause(readyAtMs, NOW)}.`);
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
    const percentLines = src.split('\n').filter((l) => /\$\{[^}]*\}%/.test(l));
    expect(percentLines.length).toBeGreaterThan(0);
    for (const line of percentLines) expect(line).toMatch(/estimated/);
    expect(src).not.toMatch(/you must/i);
    expect(src).not.toMatch(/\bskip\b/i);
  });
});

describe('readyClause', () => {
  test('now, later today, tomorrow, a weekday name, and "in N days" past a week', () => {
    expect(readyClause(NOW, NOW)).toBe('ready now');
    expect(readyClause(NOW - HOUR_MS, NOW)).toBe('ready now');
    // Lead review (Opus finding 20): never "ready by today".
    expect(readyClause(NOW + 2 * HOUR_MS, NOW)).toBe('ready later today');
    expect(readyClause(NOW + DAY_MS, NOW)).toBe('ready by tomorrow');
    expect(readyClause(NOW + 2 * DAY_MS, NOW)).toMatch(/^ready by (Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/);
    expect(readyClause(NOW + 8 * DAY_MS, NOW)).toBe('ready in 8 days');
  });

  test('non-finite input never throws', () => {
    expect(readyClause(null, NOW)).toBe('ready now');
    expect(readyClause(NaN, NOW)).toBe('ready now');
  });
});

describe('no evidence is never "ready" in copy (spec section 1; Opus review finding 2)', () => {
  test('a programme next none of whose muscles has a recent session: says so, never "every muscle"', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    // Empty map: every muscle reads as no_recent_session.
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap: {}, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    // D214 RC-5: the line is printed (it was null), and it is the fact.
    expect(result.programmeNextLine).toBe('No recent session on the muscles Legs trains.');
    expect(result.programmeNextLine).not.toMatch(/every muscle|ready/i);
    // A session's own per-session line stays silent without evidence.
    for (const p of result.perSession) expect(p.line).toBeNull();
    // The verdict still reads them as fully recovered (they are).
    expect(result.perSession.find((p) => p.routineId === 'legs').verdict).toBe('ready');
  });

  test('D214 RC-5: with an unnamed programme-next session the line still says it', () => {
    const result = recommendNextWorkout({
      sessions: [session('legs', 'Legs', 1)],
      plannedSetsByRoutine: { legs: { quads: 10 } },
      recoveryMap: {}, projectedAtMs: NOW, nowMs: NOW, routineNamesById: {},
    });
    expect(result.programmeNextLine).toBe('No recent session on the muscles it trains.');
  });

  test('D214 RC-5: only SOME counted muscles have a session: the line names what has evidence and what has none', () => {
    const sessions = [session('push', 'Push', 1)];
    const recoveryMap = { chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }) };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { push: { chest: 10, triceps: 6, front_delts: 4 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNextLine).toBe('Chest is estimated recovered; no recent session on Triceps and Front delts.');
    expect(result.programmeNextLine).not.toMatch(/every muscle/i);
  });

  test('D214 RC-5: several muscles with a session, one without: plural verb, singular gap', () => {
    const recoveryMap = {
      chest: staticEntry('chest', { recoveredPercent: 95, status: 'recovered' }),
      quads: staticEntry('quads', { recoveredPercent: 92, status: 'recovered' }),
    };
    const result = recommendNextWorkout({
      sessions: [session('legs', 'Legs', 1)],
      plannedSetsByRoutine: { legs: { quads: 10, chest: 4, calves: 6 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNextLine).toBe('Quads and Chest are estimated recovered; no recent session on Calves.');
  });

  test('D214 RC-5: a session that counts no muscle at all (every planned muscle under 2 sets) has no line to print', () => {
    const result = recommendNextWorkout({
      sessions: [session('legs', 'Legs', 1)],
      plannedSetsByRoutine: { legs: { quads: 1 } },
      recoveryMap: {}, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNextLine).toBeNull();
  });

  test('a fresh session beside an under-recovered programme next is described plainly: no line for it, the plan\'s next unchanged, nothing recommended', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const readyAtMs = NOW + 2 * DAY_MS;
    const recoveryMap = { quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs }) };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs: NOW, nowMs: NOW, routineNamesById: NAMES,
    });
    expect(result.programmeNext).toEqual({ routineId: 'legs' });
    expect(Object.keys(result).sort()).toEqual(RESULT_KEYS);
    expect(result.perSession.find((p) => p.routineId === 'push').line).toBeNull();
  });

  test('a session ready at the projected time but not yet now is never called "ready now" (Opus finding 5)', () => {
    const sessions = [session('legs', 'Legs', 1), session('push', 'Push', 2)];
    const legsReadyAt = NOW + 2 * DAY_MS;
    // Chest: one real session that ended 21.9 hours ago with a 30-hour
    // recovery: 73% now (residual 0.27), 93% six hours from now. The
    // projected reading is ready; the copy must still tell the truth at the
    // moment of reading.
    const chestEnd = NOW - 21.9 * HOUR_MS;
    const chest = decayingEntry('chest', { endMs: chestEnd, hoursT: 30 });
    const projectedAtMs = NOW + 6 * HOUR_MS;
    const recoveryMap = {
      quads: staticEntry('quads', { recoveredPercent: 64, status: 'recovering', readyAtMs: legsReadyAt }),
      chest,
    };
    const result = recommendNextWorkout({
      sessions,
      plannedSetsByRoutine: { legs: { quads: 10 }, push: { chest: 10 } },
      recoveryMap, projectedAtMs, nowMs: NOW, routineNamesById: NAMES,
    });
    const push = result.perSession.find((p) => p.routineId === 'push');
    expect(push.readinessNow.verdict).toBe('not_yet');
    expect(push.readinessAtProjected.verdict).toBe('ready');
    expect(push.line).toBe(`Chest is estimated ${Math.round(push.readinessNow.minPercent)}% recovered, ${readyClause(chest.readyAtMs, NOW)}.`);
    expect(push.line).not.toMatch(/ready now/);
  });
});

describe('never a crash on absent input, and determinism', () => {
  test('no sessions at all: the calm empty shape, with no swap fields', () => {
    const result = recommendNextWorkout({});
    expect(result).toEqual({ programmeNext: null, programmeNextLine: null, perSession: [] });
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
