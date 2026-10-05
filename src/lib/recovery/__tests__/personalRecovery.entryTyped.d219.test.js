/**
 * personalRecovery.entryTyped.d219.test.js -- register D219, learner design
 * docs/audit/plan-builder-science-2026-10-04/06-LEARNER-SIGNAL-DESIGN.md
 * section 2.3 (founder answer 2026-10-05), evidence 05-LEARNER-RECON.md
 * candidate C. The data path (the column, the logging) is lane LR2's; this lane
 * only READS the field the learner's existing set read returns.
 *
 * The logging screen fills in the prescribed weight and reps, and a person who
 * logs them as given records the plan, not the day. A set may now say which it was:
 * `entryTyped` 1 (the person typed a value) or 0 (kept as filled in). Null or absent,
 * which every set logged before the flag existed is, behaves EXACTLY as today.
 *
 * Pinned here, each written to FAIL on the code before this lane except where
 * it holds today's behaviour fixed:
 *  - the flag's truth table: 1, true and '1' typed; 0, false and '0' kept as
 *    filled in; null, undefined, '' and anything else unknown (Number(null) is 0,
 *    which would read every unflagged set as kept as filled in);
 *  - unknown flags (null, undefined, absent) and typed sets change nothing: the
 *    pairs and the evidence are what they were [today's behaviour, held];
 *  - a set kept as filled in is not a measurement and is left out, and a
 *    comparison reads only the set positions typed in BOTH sessions (the index
 *    must compare the same sets, never the first sets of one and the last of the other);
 *  - a comparison with no such position is counted with the lifts logged as
 *    planned, and when that alone leaves too few the reason says so (fixed_reps);
 *  - typed is not measured: a person who retypes the plan into every set is still
 *    logging the plan, and the rule that leaves out a lift whose reps repeat stands.
 */
import {
  entryTypedOf, sessionLifts, comparablePairs, personalRecoveryEvidence, learnPersonalRecovery,
} from '../personalRecovery';
import { PERSONAL_MIN_PAIRS } from '../constants';
import { calculate1RM } from '../../algorithms';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 1, 12); // a Monday
const EX = { bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: ['triceps'] } };

const set = (weight, reps, n, flag) => ({
  exerciseId: 'bench', weight, actualReps: reps, setNumber: n, setType: 'straight', ...(flag === undefined ? {} : { entryTyped: flag }),
});
/** Three sets with the given reps and flags (a flag per set; undefined leaves the field off). */
const threeSets = (reps, flags = [undefined, undefined, undefined], weight = 100) => reps.map((r, i) => set(weight, r, i + 1, flags[i]));
const session = (id, daysAgo, sets, extra = {}) => {
  const startedAt = NOW - daysAgo * DAY_MS;
  return {
    id,
    startedAt,
    endedAt: startedAt + HOUR_MS,
    durationMinutes: 60,
    sets,
    weekRirTarget: null,
    weekStatus: 'none',
    isFirstWeek: false,
    isDeload: false,
    ratings: { sorenessNext: null, fatigue: null, joint: null },
    ...extra,
  };
};
const e1 = (reps) => calculate1RM(100, reps);
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const pairsOf = (sessions) => comparablePairs({ sessions, exerciseById: EX, nowMs: NOW }).chest;

describe('entryTypedOf: what a set says about how it was logged', () => {
  test('1, true and "1" are typed; 0, false and "0" are kept as filled in', () => {
    for (const v of [1, true, '1']) expect(entryTypedOf({ entryTyped: v })).toBe(1);
    for (const v of [0, false, '0']) expect(entryTypedOf({ entryTyped: v })).toBe(0);
  });

  test('the cloud-style name is read too, and an unflagged set says nothing', () => {
    expect(entryTypedOf({ entry_typed: 1 })).toBe(1);
    expect(entryTypedOf({ entry_typed: 0 })).toBe(0);
    expect(entryTypedOf({ entryTyped: null, entry_typed: 0 })).toBe(0);
  });

  test('null, undefined, an empty string and anything else is unknown, never kept as filled in (Number(null) is 0)', () => {
    for (const v of [null, undefined, '', 2, -1, 'yes', NaN, {}]) expect(entryTypedOf({ entryTyped: v })).toBeNull();
    expect(entryTypedOf({})).toBeNull();
    expect(entryTypedOf(null)).toBeNull();
    expect(entryTypedOf(undefined)).toBeNull();
  });

  test('sessionLifts carries the flag per set, in set order', () => {
    const lifts = sessionLifts(session('s', 1, [set(100, 8, 3, 1), set(100, 9, 1, 0), set(100, 7, 2)]), EX);
    expect(lifts.get('bench').typed).toEqual([0, null, 1]);
  });
});

describe('an unknown flag behaves exactly as today, and so does a typed one', () => {
  // Four Mondays; reps move week to week so the lift does not read as logged as planned.
  const history = (flags) => [
    session('a', 28, threeSets([8, 8, 8], flags)),
    session('b', 21, threeSets([9, 9, 8], flags)),
    session('c', 14, threeSets([7, 8, 8], flags)),
    session('d', 7, threeSets([10, 9, 9], flags)),
  ];

  test('no flag, a null flag and an undefined flag give the same pairs, and they are the pairs the formula gives', () => {
    const none = pairsOf(history());
    const nulls = pairsOf(history([null, null, null]));
    expect(nulls).toEqual(none);
    expect(none).toHaveLength(3);
    const expectedFirst = Math.log(mean([e1(9), e1(9), e1(8)]) / mean([e1(8), e1(8), e1(8)]));
    expect(none[0].y).toBe(expectedFirst);
  });

  test('every set typed is every set measured: the evidence is what it was', () => {
    const unflagged = personalRecoveryEvidence({ sessions: history(), exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    const typed = personalRecoveryEvidence({ sessions: history([1, 1, 1]), exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    const nulls = personalRecoveryEvidence({ sessions: history([null, null, null]), exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(typed).toEqual(unflagged);
    expect(nulls).toEqual(unflagged);
  });

  test('a mixture of typed and unknown sets is read as measured throughout', () => {
    expect(pairsOf(history([1, null, undefined]))).toEqual(pairsOf(history()));
  });
});

describe('a set kept as filled in is left out, and the sets compared are the positions typed in both sessions', () => {
  test('a set kept as filled in drops out of the comparison; the others carry it', () => {
    const pairs = pairsOf([
      session('p', 14, threeSets([8, 8, 8], [1, 1, 1])),
      session('b', 7, threeSets([12, 9, 9], [0, 1, 1])),
    ]);
    expect(pairs).toHaveLength(1);
    // Positions 2 and 3 only: the first set of B was the filled-in 12 and says nothing.
    expect(pairs[0].y).toBe(Math.log(mean([e1(9), e1(9)]) / mean([e1(8), e1(8)])));
  });

  test('the index compares the same set positions in both sessions', () => {
    const pairs = pairsOf([
      session('p', 14, threeSets([8, 9, 10], [0, 1, 1])),
      session('b', 7, threeSets([7, 9, 11], [1, 0, 1])),
    ]);
    // B's second set and P's first were kept as filled in: only the third set is typed in both.
    expect(pairs).toHaveLength(1);
    expect(pairs[0].y).toBe(Math.log(e1(11) / e1(10)));
  });

  test('a comparison with no set typed in both is not evidence', () => {
    const sessions = [
      session('p', 14, threeSets([8, 9, 10], [0, 0, 0])),
      session('b', 7, threeSets([9, 9, 9], [1, 1, 1])),
    ];
    expect(pairsOf(sessions)).toBeUndefined();
    const evidence = personalRecoveryEvidence({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    // It is counted with the lifts logged as planned, which is what the reason names.
    expect(evidence.fixedRepsPairs).toBe(1);
    expect(evidence.pairs).toBe(0);
  });

  test('enough comparisons that were all kept as filled in: the start stands, and the reason says why', () => {
    // Eleven Mondays of bench with a plan that raises the reps, every set kept as filled in; a light
    // Thursday session each week so there is always something to recover from.
    const make = (flag) => {
      const sessions = [];
      for (let w = 11; w >= 1; w -= 1) {
        const reps = 6 + ((11 - w) % 5);
        sessions.push(session(`mon${w}`, w * 7, threeSets([reps, reps, reps], [flag, flag, flag])));
        sessions.push(session(`thu${w}`, w * 7 - 3, [set(60, 10 + (w % 4), 1, flag)]));
      }
      return sessions;
    };
    const learn = (sessions) => learnPersonalRecovery({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    // As filled in, none of it is a measurement.
    const filled = learn(make(0));
    expect(filled.reason).toBe('fixed_reps');
    expect(filled.factor).toBe(1);
    expect(filled.pairs).toBeLessThan(PERSONAL_MIN_PAIRS);
    // The same sessions, typed, are read: there are comparisons, so the reason is not about the logging.
    const typed = learn(make(1));
    expect(typed.reason).not.toBe('fixed_reps');
    expect(typed.pairs).toBeGreaterThanOrEqual(PERSONAL_MIN_PAIRS);
    // And the same, with the flag unknown, is today's reading.
    expect(learn(make(undefined)).pairs).toBe(typed.pairs);
  });
});

describe('typed is not measured: a person who retypes the plan is still logging the plan', () => {
  test('every set typed with the same reps week after week is left out as before', () => {
    // Four Mondays at the same 3 x 8, all typed (the person retypes the plan), the load climbing.
    const sessions = [28, 21, 14, 7].map((d, i) => session(`f${i}`, d, threeSets([8, 8, 8], [1, 1, 1], 100 + i * 2.5)));
    expect(pairsOf(sessions)).toBeUndefined();
    const evidence = personalRecoveryEvidence({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(evidence.fixedRepsPairs).toBe(3);
  });

  test('typed sets whose reps move week to week are kept: the day is showing', () => {
    const sessions = [28, 21, 14, 7].map((d, i) => session(`h${i}`, d, threeSets([[8, 9, 7, 10][i], 8, 8], [1, 1, 1])));
    expect(pairsOf(sessions)).toHaveLength(3);
  });
});
