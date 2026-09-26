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
  LOOKBACK_DAYS, recoveryHours,
} from '../constants';
import { sessionMuscleLoads, recoveredFractionAt } from '../muscleRecoveryModel';
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

describe('comparable pairs (spec sections 2 and 3)', () => {
  test('each session pairs with the most recent earlier session of the same lift; the outcome is the log ratio', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 6, benchSets(100)), session('b', 4, benchSets(100, 9)), session('c', 2, benchSets(102.5))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toHaveLength(2);
    expect(pairs.chest[0]).toEqual({
      startB: NOW - 4 * DAY_MS, startP: NOW - 6 * DAY_MS, y: Math.log(calculate1RM(100, 9) / calculate1RM(100, 8)),
    });
    expect(pairs.chest[1].startP).toBe(NOW - 4 * DAY_MS);
  });

  test('the walk back skips an incomparable session (another effort target) for an earlier comparable one', () => {
    const planned = (id, daysAgo, rir) => session(id, daysAgo, benchSets(100), { weekRirTarget: rir, weekStatus: 'resolved' });
    const pairs = comparablePairs({
      sessions: [planned('p1', 7, 2), planned('p2', 5, 1), planned('b', 3, 2)],
      exerciseById: EX,
      nowMs: NOW,
    });
    // p2 (RIR 1) pairs with nothing; b (RIR 2) pairs with p1, skipping p2.
    expect(pairs.chest).toEqual([{ startB: NOW - 3 * DAY_MS, startP: NOW - 7 * DAY_MS, y: 0 }]);
  });

  test('a recovery week never pairs, as the session or its baseline', () => {
    const pairs = comparablePairs({
      sessions: [
        session('a', 6, benchSets(100)),
        session('d', 4, benchSets(80), { isDeload: true }),
        session('b', 2, benchSets(100)),
      ],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toEqual([{ startB: NOW - 2 * DAY_MS, startP: NOW - 6 * DAY_MS, y: 0 }]);
  });

  test('an unresolved plan week never pairs', () => {
    const pairs = comparablePairs({
      sessions: [
        session('a', 6, benchSets(100)),
        session('u', 4, benchSets(100), { weekStatus: 'unresolved' }),
        session('b', 2, benchSets(100)),
      ],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toEqual([{ startB: NOW - 2 * DAY_MS, startP: NOW - 6 * DAY_MS, y: 0 }]);
  });

  test('a session under an injury limit for the muscle never pairs; other muscles in it still do', () => {
    const both = (w) => [...benchSets(w), ...[1, 2, 3].map((n) => set('squat', 140, 6, n))];
    const sessions = [session('a', 6, both(100)), session('x', 4, both(100)), session('b', 2, both(100))];
    const pairs = comparablePairs({
      sessions, exerciseById: EX, nowMs: NOW, excluded: new Set(['x|chest']),
    });
    expect(pairs.chest).toEqual([{ startB: NOW - 2 * DAY_MS, startP: NOW - 6 * DAY_MS, y: 0 }]);
    expect(pairs.quads).toHaveLength(2);
  });

  test('a baseline further back than the gap allows is no baseline', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 40, benchSets(100)), session('m', 5, [set('row', 80, 8, 1)]), session('b', 2, benchSets(100))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toBeUndefined();
  });

  test('a session with nothing on the muscle in the lookback before it has nothing to recover from', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 22, benchSets(100)), session('b', 2, benchSets(100))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(22 - 2).toBeGreaterThan(LOOKBACK_DAYS);
    expect(pairs.chest).toBeUndefined();
  });

  test('set counts are matched: the first k sets of each, k the smaller count (at most 3)', () => {
    const pairs = comparablePairs({
      sessions: [
        session('a', 4, [set('bench', 100, 8, 1), set('bench', 100, 8, 2)]),
        session('b', 2, [...benchSets(100), set('bench', 60, 5, 4), set('bench', 60, 5, 5)]),
      ],
      exerciseById: EX,
      nowMs: NOW,
    });
    // The back-off sets in b are beyond k = 2: b is not "weaker".
    expect(pairs.chest).toEqual([{ startB: NOW - 2 * DAY_MS, startP: NOW - 4 * DAY_MS, y: 0 }]);
  });

  test('a change too large to be recovery (a typing slip) is left out', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 6, benchSets(100)), session('t', 4, benchSets(1000)), session('b', 2, benchSets(100))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(Math.log(1000 / 100)).toBeGreaterThan(PERSONAL_MAX_CHANGE);
    expect(pairs.chest).toBeUndefined();
  });

  test('only sessions inside the window are compared as the later session; older ones still serve as baselines', () => {
    const pairs = comparablePairs({
      sessions: [session('a', 90, benchSets(100)), session('b', 86, benchSets(100)), session('c', 83, benchSets(100))],
      exerciseById: EX,
      nowMs: NOW,
    });
    expect(pairs.chest).toEqual([{ startB: NOW - 83 * DAY_MS, startP: NOW - 86 * DAY_MS, y: 0 }]);
    expect(PERSONAL_HISTORY_DAYS).toBe(84 + 28 + LOOKBACK_DAYS);
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
 * change is recovery, so the fit must find the truth.
 */
function cleanAthlete(trueFactor) {
  const gaps = [1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 2, 4, 1, 3, 1, 2, 4, 3, 1, 2, 3, 4, 1, 2, 2, 3, 1];
  const sessions = [];
  let day = 0;
  gaps.forEach((gap, i) => {
    day += gap;
    const startedAt = NOW - 80 * DAY_MS + day * DAY_MS;
    sessions.push({
      id: `s${i}`, startedAt, endedAt: startedAt + HOUR_MS, durationMinutes: 60,
      weekRirTarget: null, weekStatus: 'none', isFirstWeek: false, isDeload: false,
      ratings: { sorenessNext: null, fatigue: null, joint: null },
      sets: [1, 2, 3].flatMap((n) => [set('bench', 1, 1, n), set('squat', 1, 1, n)]),
    });
  });
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
  for (const s of sessions) {
    const bench = 100 * (1 - 0.1 * (1 - r('chest', s.startedAt)));
    const squat = 140 * (1 - 0.1 * (1 - r('quads', s.startedAt)));
    // Single-rep sets: calculate1RM(w, 1) is w, so the estimated max IS the weight.
    s.sets = [1, 2, 3].flatMap((n) => [set('bench', bench, 1, n), set('squat', squat, 1, n)]);
  }
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

  test('every muscle\'s pairs count only from three: a lone pair fits itself and carries nothing', () => {
    const sessions = [...cleanAthlete(1.0)];
    sessions.push(session('r1', 3, [set('row', 80, 8, 1)]), session('r2', 1, [set('row', 80, 8, 1)]));
    const evidence = personalRecoveryEvidence({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(evidence.pairsByMuscle.back).toBeUndefined();
    expect(Object.keys(evidence.pairsByMuscle).sort()).toEqual(['chest', 'quads']);
  });

  test('too few pairs: the start stands, and says so', () => {
    const learned = learnPersonalRecovery({
      sessions: [session('a', 4, benchSets(100)), session('b', 2, benchSets(100))], exerciseById: EX, recoveryRating: 'poor', nowMs: NOW,
    });
    expect(learned).toEqual({
      factor: 1.15, prior: 1.15, pairs: 0, reason: 'too_few', pairsByMuscle: {},
    });
  });

  test('a steady schedule: the start stands, because the pairs sit at the same predicted recovery', () => {
    // Every session exactly a week apart: fully recovered at every candidate.
    const sessions = Array.from({ length: 12 }, (_, i) => session(`w${i}`, 80 - i * 7, [
      ...benchSets(100 + i), ...[1, 2, 3].map((n) => set('squat', 140 + i, 6, n)),
    ]));
    // Something to recover from: a light accessory day in each week.
    for (let i = 0; i < 12; i += 1) {
      sessions.push(session(`x${i}`, 80 - i * 7 - 3, [set('bench', 60, 12, 1), set('squat', 60, 12, 1)].map((s2) => ({ ...s2, exerciseId: s2.exerciseId === 'bench' ? 'bench' : 'squat', setType: 'warmup' }))));
    }
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
