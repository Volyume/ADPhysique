/**
 * personalRecovery.test.js -- register D210, spec
 * docs/recovery-programme-2026-09-25/14-PERSONAL-LEARNING-V2.md.
 *
 * The personal recovery learner's rules, pinned one by one against the REAL
 * engine (the curve, the 1RM estimator and the volume allocator are the real
 * ones). The first build of the learner was withdrawn after its review found
 * rules that were claimed and not kept (D210 addendum); each block here pins
 * one of the rules that replaced them:
 *
 *  - what counts as a comparable pair (the same lift, the same effort
 *    target, no recovery week, no unresolved plan week, no injury limit,
 *    inside the baseline gap, something to recover from, matched sets);
 *  - which lifts are strength evidence at all (never assisted, timed or
 *    distance exercises, never warm-up, cluster, ballistic or circuit rows);
 *  - a change too large to be recovery is left out;
 *  - the fit finds the truth on clean data in both directions, and stays at
 *    the start when the truth is the start;
 *  - the answer is the same for the same history, in any order.
 *
 * How often it is fooled by noise is the calibration suite's job
 * (personalRecovery.simulation.test.js).
 */
import {
  isLoadStrengthExercise, sameEffortTarget, sessionLifts, boundedFit, comparablePairs,
  personalRecoveryEvidence, learnPersonalRecovery, personalDirection, PERSONAL_HISTORY_DAYS,
} from '../personalRecovery';
import {
  PERFORMANCE_SENSITIVITY_MIN, PERFORMANCE_SENSITIVITY_MAX, PERSONAL_MAX_CHANGE, PERSONAL_MIN_PAIRS,
  PERSONAL_MIN_MUSCLE_PAIRS, PERSONAL_MAX_FIXED_REPS_SHARE, LOOKBACK_DAYS, recoveryHours,
} from '../constants';
import { sessionMuscleLoads, recoveredFractionAt } from '../muscleRecoveryModel';
import * as constantsModule from '../constants';
import * as modelModule from '../muscleRecoveryModel';
import { calculate1RM } from '../../algorithms';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 1, 12);

const EX = {
  bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: ['triceps'] },
  squat: { id: 'squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'] },
  row: { id: 'row', primaryMuscle: 'back', secondaryMuscles: ['biceps'] },
  raise: { id: 'raise', primaryMuscle: 'shoulders', secondaryMuscles: [] },
  assisted: { id: 'assisted', primaryMuscle: 'back', loadSemantics: 'assisted' },
  plank: { id: 'plank', primaryMuscle: 'abs', exerciseType: 'duration' },
  run: { id: 'run', primaryMuscle: 'quads', exerciseType: 'distance' },
};

const set = (exerciseId, weight, reps, n, extra = {}) => ({
  exerciseId, weight, actualReps: reps, setNumber: n, setType: 'straight', ...extra,
});
/** A session `daysAgo` before NOW (18:00-ish), with the given sets. */
const session = (id, daysAgo, sets, extra = {}) => {
  const startedAt = NOW - daysAgo * DAY_MS;
  return {
    id, startedAt, endedAt: startedAt + HOUR_MS, durationMinutes: 60, sets,
    weekRirTarget: null, weekStatus: 'none', isFirstWeek: false, isDeload: false,
    ratings: { sorenessNext: null, fatigue: null, joint: null }, ...extra,
  };
};
const benchSets = (weight, reps = 8) => [1, 2, 3].map((n) => set('bench', weight, reps, n));

describe('which lifts are strength evidence', () => {
  test('assisted, timed and distance exercises never are; load-based ones are', () => {
    expect(isLoadStrengthExercise(EX.bench)).toBe(true);
    expect(isLoadStrengthExercise(EX.assisted)).toBe(false);
    expect(isLoadStrengthExercise({ load_semantics: 'assisted' })).toBe(false);
    expect(isLoadStrengthExercise(EX.plank)).toBe(false);
    expect(isLoadStrengthExercise({ exercise_type: 'distance' })).toBe(false);
    expect(isLoadStrengthExercise(null)).toBe(false);
  });

  test('sessionLifts keeps only trend-eligible working rows with weight and reps, in set order', () => {
    const lifts = sessionLifts(session('s', 1, [
      set('bench', 100, 8, 3),
      set('bench', 60, 10, 0, { setType: 'warmup' }),
      set('bench', 100, 10, 1),
      set('bench', 50, 30, 4, { setType: 'myo_reps' }),
      set('bench', 50, 30, 5, { setType: 'rest_pause' }),
      set('bench', 20, 15, 6, { evidenceClass: 'ballistic' }),
      set('bench', 80, 12, 7, { evidenceClass: 'circuit' }),
      set('bench', 100, 9, 2),
      set('bench', 100, 9, 8, { deletedAt: 123 }),
      set('bench', 0, 9, 9),
      set('bench', 100, 0, 10),
      set('assisted', 30, 10, 1),
      set('plank', 0, 60, 1),
      set('run', 5000, 1, 1),
      set('raise', 12, 12, 1),
    ]), EX);
    expect([...lifts.keys()].sort()).toEqual(['bench', 'raise']);
    expect(lifts.get('bench').muscle).toBe('chest');
    expect(lifts.get('bench').e1rms).toEqual([calculate1RM(100, 10), calculate1RM(100, 9), calculate1RM(100, 8)]);
    // The legacy 'shoulders' primary reads as side delts, as the allocator has it.
    expect(lifts.get('raise').muscle).toBe('side_delts');
  });
});

describe('the same effort target', () => {
  test('both outside a plan, or both at the same known RIR target', () => {
    expect(sameEffortTarget({ weekRirTarget: null, weekStatus: 'none' }, { weekRirTarget: null, weekStatus: 'none' })).toBe(true);
    expect(sameEffortTarget({ weekRirTarget: 2, weekStatus: 'resolved' }, { weekRirTarget: 2, weekStatus: 'resolved' })).toBe(true);
    expect(sameEffortTarget({ weekRirTarget: 0 }, { weekRirTarget: '0' })).toBe(true);
  });

  test('different targets, or one in a plan and one not, are never comparable', () => {
    expect(sameEffortTarget({ weekRirTarget: 3 }, { weekRirTarget: 2 })).toBe(false);
    expect(sameEffortTarget({ weekRirTarget: 2 }, { weekRirTarget: null })).toBe(false);
    // Number(null) is 0: an absent target must not read as RIR 0.
    expect(sameEffortTarget({ weekRirTarget: 0 }, { weekRirTarget: null })).toBe(false);
  });

  test('a session whose plan week did not resolve is never comparable, even with another unknown', () => {
    expect(sameEffortTarget({ weekRirTarget: null, weekStatus: 'unresolved' }, { weekRirTarget: null, weekStatus: 'none' })).toBe(false);
    expect(sameEffortTarget({ weekStatus: 'unresolved' }, { weekStatus: 'unresolved' })).toBe(false);
  });
});

describe('comparable pairs (spec sections 2 and 3, D210 addendum 3)', () => {
  // NOW is a Monday; sessions a whole number of weeks back fall on Mondays.
  test('each session pairs with the most recent earlier session of the same lift on the same weekday; the outcome is the log ratio', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 21, benchSets(100)), session('b', 14, benchSets(100, 9)), session('c', 7, benchSets(102.5))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toHaveLength(2);
    expect(pairs.chest[0]).toEqual({
      startB: NOW - 14 * DAY_MS, startP: NOW - 21 * DAY_MS, y: Math.log(calculate1RM(100, 9) / calculate1RM(100, 8)),
    });
    expect(pairs.chest[1].startP).toBe(NOW - 14 * DAY_MS);
  });

  test('sessions on different weekdays never pair, however close (weekday strength would read as recovery)', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 9, benchSets(100)), session('b', 8, benchSets(100, 9)), session('c', 6, benchSets(100, 10))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toBeUndefined();
  });

  test('the walk back skips an incomparable session (another effort target) for an earlier comparable one', () => {
    const planned = (id, daysAgo, rir, reps) => session(id, daysAgo, benchSets(100, reps), { weekRirTarget: rir, weekStatus: 'resolved' });
    const pairs = comparablePairs({
      sessions: [planned('p1', 21, 2, 8), planned('p2', 14, 1, 9), planned('b', 7, 2, 10)],
      exerciseById: EX,
      nowMs: NOW,
    });
    // p2 (RIR 1) pairs with nothing; b (RIR 2) pairs with p1, skipping p2.
    expect(pairs.chest).toEqual([{
      startB: NOW - 7 * DAY_MS, startP: NOW - 21 * DAY_MS, y: Math.log(calculate1RM(100, 10) / calculate1RM(100, 8)),
    }]);
  });

  test('a recovery week never pairs: not as the later session, not as the baseline', () => {
    // The recovery week keeps the load (within the change guard), so only
    // the recovery-week rule can be what leaves it out.
    const sessions = [
      session('a', 21, benchSets(100, 8)),
      session('d', 14, benchSets(100, 7), { isDeload: true }),
      session('b', 7, benchSets(100, 9)),
    ];
    expect(comparablePairs({ sessions, exerciseById: EX, nowMs: NOW }).chest).toEqual([{
      startB: NOW - 7 * DAY_MS, startP: NOW - 21 * DAY_MS, y: Math.log(calculate1RM(100, 9) / calculate1RM(100, 8)),
    }]);
    // With the recovery week as the latest session, it is never the later
    // session of a pair either.
    const deloadLast = [session('a', 14, benchSets(100, 8)), session('d', 7, benchSets(100, 9), { isDeload: true })];
    expect(comparablePairs({ sessions: deloadLast, exerciseById: EX, nowMs: NOW }).chest).toBeUndefined();
  });

  test('an unresolved plan week never pairs', () => {
    const pairs = comparablePairs({
      sessions: [
        session('a', 21, benchSets(100, 8)),
        session('u', 14, benchSets(100, 9), { weekStatus: 'unresolved' }),
        session('b', 7, benchSets(100, 10)),
      ],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toEqual([{
      startB: NOW - 7 * DAY_MS, startP: NOW - 21 * DAY_MS, y: Math.log(calculate1RM(100, 10) / calculate1RM(100, 8)),
    }]);
  });

  test('a session under an injury limit for the muscle never pairs; other muscles in it still do', () => {
    const both = (reps) => [...benchSets(100, reps), ...[1, 2, 3].map((n) => set('squat', 140, reps - 2, n))];
    const sessions = [session('a', 21, both(8)), session('x', 14, both(9)), session('b', 7, both(10))];
    const pairs = comparablePairs({
      sessions, exerciseById: EX, nowMs: NOW, excluded: new Set(['x|chest']),
    });
    expect(pairs.chest).toEqual([{
      startB: NOW - 7 * DAY_MS, startP: NOW - 21 * DAY_MS, y: Math.log(calculate1RM(100, 10) / calculate1RM(100, 8)),
    }]);
    expect(pairs.quads).toHaveLength(2);
  });

  test('a baseline further back than the gap allows is no baseline, even with something to recover from', () => {
    const pairs = comparablePairs({
      sessions: [
        session('a', 42, benchSets(100, 8)), // a Monday 35 days before b
        session('m', 10, [set('bench', 80, 10, 1)]), // chest trained 3 days before b
        session('b', 7, benchSets(100, 9)),
      ],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(42 - 7).toBeGreaterThan(28);
    expect(pairs.chest).toBeUndefined();
  });

  test('a session with nothing on the muscle in the lookback before it has nothing to recover from', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 35, benchSets(100, 8)), session('b', 7, benchSets(100, 9))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(35 - 7).toBeGreaterThan(LOOKBACK_DAYS);
    expect(pairs.chest).toBeUndefined();
  });

  test('set counts are matched: the first k straight sets of each, k the smaller count (at most 3)', () => {
    const pairs = comparablePairs({
      sessions: [
        session('a', 14, [set('bench', 100, 8, 1), set('bench', 100, 8, 2)]),
        session('b', 7, [...benchSets(100, 9), set('bench', 60, 5, 4), set('bench', 60, 5, 5)]),
      ],
      exerciseById: EX,
      nowMs: NOW,
    });
    // The back-off sets in b are beyond k = 2: b is not "weaker".
    expect(pairs.chest).toEqual([{
      startB: NOW - 7 * DAY_MS, startP: NOW - 14 * DAY_MS, y: Math.log(calculate1RM(100, 9) / calculate1RM(100, 8)),
    }]);
  });

  test('only straight sets count: drop sets and AMRAP sets are left out (each measures a different effort)', () => {
    const pairs = comparablePairs({
      sessions: [
        session('a', 14, benchSets(100, 8)),
        session('b', 7, [
          set('bench', 100, 9, 1),
          set('bench', 85, 7, 2, { setType: 'dropset' }),
          set('bench', 70, 8, 3, { setType: 'dropset' }),
          set('bench', 100, 12, 4, { setType: 'amrap' }),
        ]),
      ],
      exerciseById: EX,
      nowMs: NOW,
    });
    // One straight set in b: k = 1, and the drops never read as fatigue.
    expect(pairs.chest).toEqual([{
      startB: NOW - 7 * DAY_MS, startP: NOW - 14 * DAY_MS, y: Math.log(calculate1RM(100, 9) / calculate1RM(100, 8)),
    }]);
  });

  test('a change too large to be recovery (a typing slip) is left out', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 21, benchSets(100)), session('t', 14, benchSets(1000, 9)), session('b', 7, benchSets(100, 10))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(Math.log(1000 / 100)).toBeGreaterThan(PERSONAL_MAX_CHANGE);
    expect(pairs.chest).toBeUndefined();
  });

  test('only sessions inside the window are compared as the later session; older ones still serve as baselines', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 98, benchSets(100, 8)), session('b', 91, benchSets(100, 9)), session('c', 84, benchSets(100, 10))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toEqual([{
      startB: NOW - 84 * DAY_MS, startP: NOW - 91 * DAY_MS, y: Math.log(calculate1RM(100, 10) / calculate1RM(100, 9)),
    }]);
    expect(PERSONAL_HISTORY_DAYS).toBe(84 + 28 + LOOKBACK_DAYS);
  });

  test('a lift whose comparisons mostly repeat the same reps set for set is left out and counted (logged as planned)', () => {
    // Four Mondays at the same 3 x 8, the load climbing as a plan sets it.
    const fixed = [28, 21, 14, 7].map((d, i) => session(`f${i}`, d, benchSets(100 + i * 2.5, 8)));
    expect(comparablePairs({ sessions: fixed, exerciseById: EX, nowMs: NOW }).chest).toBeUndefined();
    const evidence = personalRecoveryEvidence({ sessions: fixed, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(evidence.fixedRepsPairs).toBe(3);
    // Over six Mondays, one tired day that drops a rep changes the two
    // comparisons either side of it; three of five still repeat the same
    // reps, so the lift is still read as logged as planned and left out.
    const six = [35, 28, 21, 14, 7, 0].map((d, i) => session(`g${i}`, d, benchSets(100 + i * 2.5, i === 3 ? 7 : 8)));
    expect(comparablePairs({ sessions: six, exerciseById: EX, nowMs: NOW }).chest).toBeUndefined();
    // Reps that move most weeks are the day showing: kept.
    const moving = [28, 21, 14, 7].map((d, i) => session(`h${i}`, d, benchSets(100, [8, 9, 7, 10][i])));
    expect(comparablePairs({ sessions: moving, exerciseById: EX, nowMs: NOW }).chest).toHaveLength(3);
    expect(PERSONAL_MAX_FIXED_REPS_SHARE).toBe(0.5);
  });
});

describe('boundedFit', () => {
  test('the free least-squares slope when it sits inside the bounds', () => {
    const xs = [-0.5, 0, 0.5, 0.25, -0.25];
    const ys = xs.map((x) => 0.01 + 0.1 * x);
    const fit = boundedFit(xs, ys);
    expect(fit.s).toBeCloseTo(0.1, 10);
    expect(fit.sse).toBeCloseTo(0, 12);
  });

  test('a slope below the bounds is held at the minimum and pays for the drop it predicts', () => {
    const xs = [-0.5, 0, 0.5];
    const ys = [0, 0, 0];
    const fit = boundedFit(xs, ys);
    expect(fit.s).toBe(PERFORMANCE_SENSITIVITY_MIN);
    const direct = xs.reduce((sum, x) => sum + (PERFORMANCE_SENSITIVITY_MIN * x) ** 2, 0);
    expect(fit.sse).toBeCloseTo(direct, 12);
  });

  test('a slope above the bounds is held at the maximum', () => {
    const fit = boundedFit([-0.5, 0.5], [-0.5, 0.5]);
    expect(fit.s).toBe(PERFORMANCE_SENSITIVITY_MAX);
  });

  test('no spread in x: the minimum sensitivity, and the error is the spread of y', () => {
    const fit = boundedFit([0.2, 0.2, 0.2], [0.01, -0.01, 0]);
    expect(fit.s).toBe(PERFORMANCE_SENSITIVITY_MIN);
    expect(fit.sse).toBeCloseTo(0.0002, 12);
  });
});

/**
 * A clean (noise-free) athlete on a varied schedule whose lifts follow the
 * model exactly at `trueFactor` with sensitivity 0.1: every performance
 * change is recovery, so the fit must find the truth. Reps vary from session
 * to session (4 to 8) and the load is set so the estimated max is exact, so
 * the lifts are never read as logged-as-planned.
 */
function cleanAthlete(trueFactor, days = 112) {
  const gaps = [1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 2, 4, 1, 3, 1, 2, 4, 3, 1, 2, 3, 4, 1, 2, 2, 3, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 2, 4, 1, 3, 2, 1];
  const sessions = [];
  let day = 0;
  for (let i = 0; i < gaps.length && day + gaps[i] < days; i += 1) {
    day += gaps[i];
    const startedAt = NOW - days * DAY_MS + day * DAY_MS;
    sessions.push({
      id: `s${i}`, startedAt, endedAt: startedAt + HOUR_MS, durationMinutes: 60,
      weekRirTarget: null, weekStatus: 'none', isFirstWeek: false, isDeload: false,
      ratings: { sorenessNext: null, fatigue: null, joint: null },
      sets: [1, 2, 3].flatMap((n) => [set('bench', 1, 1, n), set('squat', 1, 1, n)]),
    });
  }
  const curve = {};
  sessionMuscleLoads(sessions, EX).forEach((load, i) => {
    for (const [muscle, sets] of Object.entries(load.setsByMuscle)) {
      if (!curve[muscle]) curve[muscle] = [];
      curve[muscle].push({
        endMs: load.endMs,
        sets,
        hoursT: recoveryHours(muscle, { sets, ratings: sessions[i].ratings, personalFactor: trueFactor }),
      });
    }
  });
  const r = (muscle, atMs) => {
    const c = (curve[muscle] ?? []).filter((e) => e.endMs <= atMs && atMs - e.endMs <= LOOKBACK_DAYS * DAY_MS);
    return c.length ? recoveredFractionAt(c, atMs) : 1;
  };
  sessions.forEach((s, i) => {
    const bench = 100 * (1 - 0.1 * (1 - r('chest', s.startedAt)));
    const squat = 140 * (1 - 0.1 * (1 - r('quads', s.startedAt)));
    const reps = 4 + (i % 5);
    // calculate1RM is linear in the load at fixed reps, so this load gives
    // exactly the intended estimated max.
    const loadFor = (max) => max / calculate1RM(1, reps);
    s.sets = [1, 2, 3].flatMap((n) => [set('bench', loadFor(bench), reps, n), set('squat', loadFor(squat), reps, n)]);
  });
  return sessions;
}

describe('the fit (spec sections 4 and 5)', () => {
  test('a clean slow recoverer is found slower, at the true factor', () => {
    const learned = learnPersonalRecovery({ sessions: cleanAthlete(1.4), exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(learned.reason).toBe('adjusted');
    expect(learned.factor).toBe(1.4);
    expect(learned.prior).toBe(1);
    expect(learned.pairs).toBeGreaterThanOrEqual(PERSONAL_MIN_PAIRS);
    expect(personalDirection(learned)).toBe('slower');
  });

  test('a clean fast recoverer is found faster; where several faster factors fit equally, the one nearest the start is taken', () => {
    const learned = learnPersonalRecovery({ sessions: cleanAthlete(0.8), exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(learned.reason).toBe('adjusted');
    expect(personalDirection(learned)).toBe('faster');
    // In this history a fast recoverer shows fatigue only after one-day
    // gaps, so every factor from 0.8 to 0.9 predicts the same pattern, only
    // scaled, and the fitted sensitivity absorbs the scale: the tie goes to
    // the factor nearest the start (the smallest claim the lifts support).
    expect(learned.factor).toBe(0.9);
  });

  test('an athlete whose truth IS the start stays at the start', () => {
    const learned = learnPersonalRecovery({ sessions: cleanAthlete(1.0), exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(learned.factor).toBe(1);
    expect(learned.reason).toBe('not_clear');
    expect(personalDirection(learned)).toBe('not_clear');
  });

  test('the start is the recovery answer: a "good" answer starts at 0.9 and a clean 0.9 recoverer stays there', () => {
    const learned = learnPersonalRecovery({ sessions: cleanAthlete(0.9), exerciseById: EX, recoveryRating: 'good', nowMs: NOW });
    expect(learned.prior).toBe(0.9);
    expect(learned.factor).toBe(0.9);
    expect(learned.reason).toBe('not_clear');
  });

  test('the same history gives the same answer, in any order', () => {
    const sessions = cleanAthlete(1.2);
    const a = personalRecoveryEvidence({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    const b = personalRecoveryEvidence({ sessions: sessions.slice().reverse(), exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(b).toEqual(a);
    expect(a.best).toBe(1.2);
  });

  test('a muscle\'s pairs count only from five: fewer fit themselves and carry nothing', () => {
    const sessions = [...cleanAthlete(1.0)];
    sessions.push(session('r1', 14, [set('row', 80, 8, 1)]), session('r2', 7, [set('row', 80, 9, 1)]));
    const evidence = personalRecoveryEvidence({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(evidence.pairsByMuscle.back).toBeUndefined();
    expect(Object.keys(evidence.pairsByMuscle).sort()).toEqual(['chest', 'quads']);
    expect(PERSONAL_MIN_MUSCLE_PAIRS).toBe(5);
  });

  test('too few pairs: the start stands, and says so', () => {
    const learned = learnPersonalRecovery({
      sessions: [session('a', 14, benchSets(100)), session('b', 7, benchSets(100, 9))], exerciseById: EX, recoveryRating: 'poor', nowMs: NOW,
    });
    expect(learned).toEqual({
      factor: 1.15, prior: 1.15, pairs: 0, reason: 'too_few', pairsByMuscle: {},
    });
  });

  test('enough comparisons, but the reps never change: the start stands, and the reason says why', () => {
    // Eleven Mondays of a fixed 3 x 8, plus a Thursday session each week so
    // there is always something to recover from.
    const sessions = [];
    for (let w = 11; w >= 1; w -= 1) {
      sessions.push(session(`mon${w}`, w * 7, [...benchSets(100 + (11 - w) * 2.5, 8), ...[1, 2, 3].map((n) => set('squat', 140, 5, n))]));
      sessions.push(session(`thu${w}`, w * 7 - 3, [set('bench', 60, 12, 1), set('squat', 60, 12, 1)]));
    }
    const learned = learnPersonalRecovery({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(learned.reason).toBe('fixed_reps');
    expect(learned.factor).toBe(1);
    expect(personalDirection(learned)).toBe('fixed_reps');
  });

  test('a steady weekly schedule: the start stands, because the pairs sit at the same predicted recovery', () => {
    // Every session exactly a week apart, reps varying: nothing to tell
    // recovery apart from the day of the week.
    const sessions = Array.from({ length: 12 }, (_, i) => session(`w${i}`, 84 - i * 7, [
      ...benchSets(100 + i, 8 + (i % 3)), ...[1, 2, 3].map((n) => set('squat', 140 + i, 5 + (i % 3), n)),
    ]));
    const learned = learnPersonalRecovery({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(['too_few', 'no_spread']).toContain(learned.reason);
    expect(learned.factor).toBe(1);
  });

  test('no history, a single session, or no clock: the start stands', () => {
    for (const params of [
      { sessions: [], nowMs: NOW },
      { sessions: [session('a', 1, benchSets(100))], nowMs: NOW },
      { sessions: cleanAthlete(1.4), nowMs: NaN },
      {},
    ]) {
      const learned = learnPersonalRecovery({ exerciseById: EX, recoveryRating: 'average', ...params });
      expect(learned).toEqual({
        factor: 1, prior: 1, pairs: 0, reason: 'too_few', pairsByMuscle: {},
      });
    }
  });
});

describe('personalDirection', () => {
  test('adjusted reads as faster or slower; anything else as its reason; nothing as null', () => {
    expect(personalDirection({ factor: 0.85, prior: 1, reason: 'adjusted' })).toBe('faster');
    expect(personalDirection({ factor: 1.25, prior: 1, reason: 'adjusted' })).toBe('slower');
    expect(personalDirection({ factor: 1, prior: 1, reason: 'no_spread' })).toBe('no_spread');
    expect(personalDirection({ factor: 1, prior: 1, reason: 'too_few' })).toBe('too_few');
    expect(personalDirection(null)).toBeNull();
  });
});

describe('cost (spec section 8: an operation count, not a clock)', () => {
  // The heaviest history load.js hands over: 126 days (PERSONAL_HISTORY_DAYS)
  // of a session every day, 24 working sets each (three muscles, two lifts
  // each, four sets), reps moving from day to day.
  const ROTATION = [
    ['chest', 'side_delts', 'triceps'], ['back', 'biceps', 'rear_delts'], ['quads', 'hamstrings', 'calves'],
    ['chest', 'side_delts', 'triceps'], ['back', 'biceps', 'rear_delts'], ['quads', 'glutes', 'abs'],
    ['chest', 'back', 'quads'],
  ];
  const LIBRARY = {};
  for (const muscle of new Set(ROTATION.flat())) {
    for (const k of ['a', 'b']) LIBRARY[`${muscle}_${k}`] = { id: `${muscle}_${k}`, primaryMuscle: muscle, secondaryMuscles: [] };
  }
  const heavy = Array.from({ length: PERSONAL_HISTORY_DAYS }, (_, i) => {
    const daysAgo = PERSONAL_HISTORY_DAYS - i;
    const sets = [];
    ROTATION[daysAgo % 7].forEach((muscle, mi) => {
      for (const k of ['a', 'b']) {
        for (let n = 1; n <= 4; n += 1) sets.push(set(`${muscle}_${k}`, 60 + 10 * mi, 8 + ((daysAgo + n) % 3), n));
      }
    });
    return session(`h${i}`, daysAgo, sets);
  });

  afterEach(() => jest.restoreAllMocks());

  test('each session\'s lengths are worked out once, each reading once, from the 14-day window only', () => {
    const lengths = jest.spyOn(constantsModule, 'recoveryHoursAcross');
    const readings = jest.spyOn(modelModule, 'recoveredFractionsAt');
    const evidence = personalRecoveryEvidence({
      sessions: heavy, exerciseById: LIBRARY, recoveryRating: 'average', nowMs: NOW,
    });
    expect(evidence.pairs).toBeGreaterThan(300); // the history is as heavy as intended

    // At most one set of lengths per session and muscle it loaded.
    const loaded = sessionMuscleLoads(heavy, LIBRARY)
      .reduce((n, load) => n + Object.values(load.setsByMuscle).filter((v) => v > 0).length, 0);
    expect(lengths.mock.calls.length).toBeLessThanOrEqual(loaded);
    // At most one reading per muscle and session start (a session is B in
    // one pair and P in the next: the memo reads it once).
    expect(readings.mock.calls.length).toBeLessThanOrEqual(heavy.length * 3);
    // Each reading takes its contributors from the 14-day window before it,
    // never the whole history: at one session a day, at most 15.
    const widest = Math.max(...readings.mock.calls.map(([contributing]) => contributing.length));
    expect(widest).toBeLessThanOrEqual(LOOKBACK_DAYS + 1);
    // Loosely, the total: every candidate at every reading, over its window.
    const work = readings.mock.calls.reduce((n, [contributing, , count]) => n + contributing.length * count, 0);
    expect(work).toBeLessThanOrEqual(40000);
  });
});
