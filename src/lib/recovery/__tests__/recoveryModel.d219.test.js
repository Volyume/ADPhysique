/**
 * recoveryModel.d219.test.js -- register D219, lane B3a. Design:
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md section
 * 4.13 ("The recovery model, corrected where the evidence says so"); evidence
 * 03-SCIENCE.md Q5 (modifiers), Q10 row 4, F5.
 *
 * Pins how the model READS a history now (constants.d219 pins the numbers):
 *  - NOVELTY replaces the first-week factor. A muscle's session is novel
 *    when it meets an exercise that muscle has not been trained with before
 *    in the history the model is given, and so is the next one (two
 *    sessions); or when 21 days or more passed since the muscle's last
 *    session. A familiar exercise in week 1 of a new block is NOT novel
 *    (the repeated-bout effect is specific to the exercise). The very first
 *    session in the history is novel: every exercise in it is new to the
 *    history, which is also what the evidence says for a person who has
 *    never trained (Q5b: unaccustomed work recovers slowest). "Trained with"
 *    counts any exercise that credits the muscle, as prime mover or
 *    synergist, through the volume tracker's own allocation.
 *  - the LONG-LENGTH factor weighs by the share of the muscle's DIRECT sets
 *    in the session that come from the frozen long-length list; synergist
 *    credit from a listed exercise does not count.
 *  - the INDIRECT factor applies when MORE than half of a muscle's credit in
 *    the session is synergist credit (exactly half does not).
 *  - the terms are computed from the same per-set allocation the volume
 *    tracker uses, so direct plus indirect credit equals sessionMuscleLoads
 *    for every muscle; the history is read in time order whatever order it
 *    arrives in; nothing is mutated; isFirstWeek no longer moves a clock.
 * Each test fails on the D201 model (no sessionMuscleTerms, a first-week
 * factor, no long-length or indirect terms).
 */
import { calculateWeeklyVolume } from '../../algorithms';
import { recoveryHours, LONG_LENGTH_EXERCISE_NAMES } from '../constants';
import {
  sessionMuscleLoads, sessionMuscleTerms, buildMuscleRecoveryMap,
} from '../muscleRecoveryModel';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const BASE = Date.UTC(2026, 6, 1, 18, 0, 0);

const EX = {
  bench: { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: [{ muscle: 'triceps', contribution: 0.5 }] },
  incline: { id: 'incline', name: 'Incline Dumbbell Press', primaryMuscle: 'chest', secondaryMuscles: [{ muscle: 'triceps', contribution: 0.5 }] },
  pushdown: { id: 'pushdown', name: 'Tricep Pushdown (Rope)', primaryMuscle: 'triceps', secondaryMuscles: [] },
  curl: { id: 'curl', name: 'Barbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [] },
  row: { id: 'row', name: 'Seated Cable Row', primaryMuscle: 'back', secondaryMuscles: [{ muscle: 'biceps', contribution: 0.5 }] },
  cablerow: { id: 'cablerow', name: 'Wide Cable Row', primaryMuscle: 'back', secondaryMuscles: [{ muscle: 'biceps', contribution: 0.5 }] },
  seated: { id: 'seated', name: 'Seated Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [] },
  lying: { id: 'lying', name: 'Lying Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [] },
  squat: { id: 'squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', secondaryMuscles: [{ muscle: 'glutes', contribution: 0.5 }] },
  hipthrust: { id: 'hipthrust', name: 'Barbell Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: [] },
  fly: { id: 'fly', name: 'Cable Crossover', primaryMuscle: 'chest', secondaryMuscles: [{ muscle: 'front_delts', contribution: 0.3 }] },
};

function setsOf(exerciseId, n, extra = {}) {
  return Array.from({ length: n }, () => ({
    exerciseId, setType: 'straight', weight: 100, actualReps: 8, ...extra,
  }));
}

/** A session ending `day` days after BASE; `exercises` is [[exerciseId, setCount], ...]. */
function sessionOn(id, day, exercises, extra = {}) {
  const endedAt = BASE + day * DAY;
  return {
    id, startedAt: endedAt - HOUR, endedAt, sets: exercises.flatMap(([ex, n]) => setsOf(ex, n)), ...extra,
  };
}

/** Four chest sessions with the same exercise: the first two are novel (the first meets the exercise), the rest familiar. */
const familiarChest = [0, 3, 7, 10].map((d, i) => sessionOn(`h${i}`, d, [['bench', 6]]));

const termsFor = (sessions, muscle) => sessionMuscleTerms(sessions, EX).map((t) => t[muscle]);

describe('novelty: a familiar exercise is not novel, a new one is for two sessions, a layoff is (design 4.13 row 2)', () => {
  test('a familiar exercise in week 1 of a new block is NOT novel, and its clock carries no first-week uplift', () => {
    const week1 = sessionOn('w1', 14, [['bench', 6]], { isFirstWeek: true, weekRirTarget: 3 });
    const sessions = [...familiarChest, week1];
    expect(termsFor(sessions, 'chest')[4].novel).toBe(false);

    const map = buildMuscleRecoveryMap({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: BASE + 14 * DAY });
    const last = map.chest.contributingSessions[map.chest.contributingSessions.length - 1];
    expect(last.workoutId).toBe('w1');
    expect(last.hoursT).toBeCloseTo(recoveryHours('chest', { sets: 6, rirTarget: 3 }), 10);
  });

  test('a new exercise is novel for the session that meets it and for the next one, then familiar again', () => {
    const sessions = [
      ...familiarChest,
      sessionOn('n1', 14, [['bench', 4], ['incline', 2]]), // incline is new to the chest
      sessionOn('n2', 17, [['bench', 6]]),
      sessionOn('n3', 21, [['bench', 6]]),
    ];
    const chest = termsFor(sessions, 'chest');
    expect(chest[3].novel).toBe(false);
    expect(chest[4].novel).toBe(true);
    expect(chest[5].novel).toBe(true);
    expect(chest[6].novel).toBe(false);
  });

  test('a muscle after 21 days away is novel for two sessions; after 20 days it is not', () => {
    const away = [
      ...familiarChest,
      sessionOn('a1', 31, [['bench', 6]]), // 21 days after the last chest session (day 10)
      sessionOn('a2', 34, [['bench', 6]]),
      sessionOn('a3', 38, [['bench', 6]]),
    ];
    const chest = termsFor(away, 'chest');
    expect(chest[4].novel).toBe(true);
    expect(chest[5].novel).toBe(true);
    expect(chest[6].novel).toBe(false);

    const almost = [...familiarChest, sessionOn('x1', 30, [['bench', 6]])]; // 20 days
    expect(termsFor(almost, 'chest')[4].novel).toBe(false);
  });

  test('the layoff is the MUSCLE\'s: other sessions in between do not reset it', () => {
    const sessions = [
      ...familiarChest,
      ...[14, 17, 21, 24, 28].map((d, i) => sessionOn(`b${i}`, d, [['row', 6]])),
      sessionOn('c', 32, [['bench', 6]]), // 22 days since the chest was last trained
    ];
    const all = sessionMuscleTerms(sessions, EX);
    expect(all[all.length - 1].chest.novel).toBe(true);
    // The back, trained again and again, is familiar by its fifth session.
    expect(all[8].back.novel).toBe(false);
  });

  test('the first session in the history is novel: every exercise in it is new to the history', () => {
    expect(termsFor([sessionOn('only', 0, [['bench', 6]])], 'chest')[0].novel).toBe(true);
  });

  test('novelty is per muscle: a new triceps exercise makes the triceps novel and leaves the chest alone', () => {
    const sessions = [...familiarChest, sessionOn('p', 14, [['bench', 4], ['pushdown', 3]])];
    const last = sessionMuscleTerms(sessions, EX)[4];
    expect(last.triceps.novel).toBe(true); // pushdown is new to the triceps (bench only credited it)
    expect(last.chest.novel).toBe(false);
  });

  test('"trained with" counts synergist credit too: a new row variant is new to the biceps it half-credits', () => {
    const rows = [0, 3, 7, 10].map((d, i) => sessionOn(`r${i}`, d, [['row', 6]]));
    const next = sessionOn('r4', 14, [['row', 4], ['cablerow', 2]]);
    const last = sessionMuscleTerms([...rows, next], EX)[4];
    expect(last.back.novel).toBe(true);
    expect(last.biceps.novel).toBe(true);
  });

  test('a warm-up set of an unseen exercise does not make it "met"', () => {
    const warm = sessionOn('wu', 14, [['bench', 6]]);
    warm.sets.push(...setsOf('incline', 2, { setType: 'warmup' }));
    expect(termsFor([...familiarChest, warm], 'chest')[4].novel).toBe(false);
  });

  test('the history is read in time order whatever order it arrives in', () => {
    const sessions = [
      ...familiarChest,
      sessionOn('n1', 14, [['bench', 4], ['incline', 2]]),
      sessionOn('n2', 17, [['bench', 6]]),
      sessionOn('n3', 21, [['bench', 6]]),
    ];
    const shuffled = [sessions[5], sessions[2], sessions[6], sessions[0], sessions[4], sessions[1], sessions[3]];
    const byId = (list) => Object.fromEntries(sessionMuscleTerms(list, EX).map((t, i) => [list[i].id, t.chest.novel]));
    expect(byId(shuffled)).toEqual(byId(sessions));

    const nowMs = BASE + 21 * DAY;
    expect(buildMuscleRecoveryMap({ sessions: shuffled, exerciseById: EX, nowMs }))
      .toEqual(buildMuscleRecoveryMap({ sessions, exerciseById: EX, nowMs }));
  });

  test('a novel session lengthens the clock by 15% through the map; isFirstWeek alone never does', () => {
    const only = sessionOn('only', 0, [['bench', 6]]);
    const map = buildMuscleRecoveryMap({ sessions: [only], exerciseById: EX, nowMs: BASE });
    expect(map.chest.contributingSessions[0].hoursT).toBeCloseTo(recoveryHours('chest', { sets: 6, novel: true }), 10);
    expect(map.chest.contributingSessions[0].hoursT).toBeCloseTo(60 * 1.15, 10);

    const plain = [...familiarChest, sessionOn('w', 14, [['bench', 6]])];
    const flagged = [...familiarChest, sessionOn('w', 14, [['bench', 6]], { isFirstWeek: true })];
    const nowMs = BASE + 14 * DAY;
    expect(buildMuscleRecoveryMap({ sessions: flagged, exerciseById: EX, nowMs }))
      .toEqual(buildMuscleRecoveryMap({ sessions: plain, exerciseById: EX, nowMs }));
  });
});

describe('long length: weighted by the share of the muscle\'s DIRECT sets that come from the list (design 4.13 row 3)', () => {
  test('every direct set from a listed exercise: share 1; none: share 0; mixed: the share of sets', () => {
    expect(termsFor([sessionOn('a', 0, [['seated', 4]])], 'hamstrings')[0].longLengthShare).toBe(1);
    expect(termsFor([sessionOn('b', 0, [['lying', 4]])], 'hamstrings')[0].longLengthShare).toBe(0);
    expect(termsFor([sessionOn('c', 0, [['seated', 2], ['lying', 2]])], 'hamstrings')[0].longLengthShare).toBe(0.5);
    expect(termsFor([sessionOn('d', 0, [['seated', 3], ['lying', 1]])], 'hamstrings')[0].longLengthShare).toBe(0.75);
  });

  test('the listed names are the ones the model reads: the deep squat is on the list, the hip thrust is not', () => {
    expect(LONG_LENGTH_EXERCISE_NAMES).toContain(EX.squat.name);
    expect(LONG_LENGTH_EXERCISE_NAMES).not.toContain(EX.hipthrust.name);
    expect(termsFor([sessionOn('s', 0, [['squat', 4]])], 'quads')[0].longLengthShare).toBe(1);
    expect(termsFor([sessionOn('t', 0, [['hipthrust', 4]])], 'glutes')[0].longLengthShare).toBe(0);
  });

  test('synergist credit from a listed exercise never counts: the glutes a squat half-credits have no long-length share', () => {
    const glutes = termsFor([sessionOn('g', 0, [['squat', 2], ['hipthrust', 4]])], 'glutes')[0];
    expect(glutes.directSets).toBe(4);
    expect(glutes.indirectSets).toBe(1);
    expect(glutes.longLengthShare).toBe(0);
    // With no direct sets at all there is nothing to take a share of.
    expect(termsFor([sessionOn('h', 0, [['squat', 4]])], 'glutes')[0].longLengthShare).toBe(0);
  });

  test('through the map: a session built on the seated curl reads 10% longer than the same sets on the lying curl', () => {
    const hist = (id) => [sessionOn(`${id}-23`, -23, [[id, 4]]), sessionOn(`${id}-16`, -16, [[id, 4]])];
    const seated = buildMuscleRecoveryMap({
      sessions: [...hist('seated'), sessionOn('t', 0, [['seated', 4]])], exerciseById: EX, nowMs: BASE,
    });
    const lying = buildMuscleRecoveryMap({
      sessions: [...hist('lying'), sessionOn('t', 0, [['lying', 4]])], exerciseById: EX, nowMs: BASE,
    });
    // Both histories are older than the 14-day window at "now" and leave the target familiar.
    expect(seated.hamstrings.contributingSessions).toHaveLength(1);
    expect(lying.hamstrings.contributingSessions).toHaveLength(1);
    const a = seated.hamstrings.contributingSessions[0].hoursT;
    const b = lying.hamstrings.contributingSessions[0].hoursT;
    expect(b).toBeCloseTo(recoveryHours('hamstrings', { sets: 4 }), 10);
    expect(a).toBeCloseTo(recoveryHours('hamstrings', { sets: 4, longLengthShare: 1 }), 10);
    expect(a / b).toBeCloseTo(1.10, 10);
  });
});

describe('mostly indirect: more than half of a muscle\'s credit is synergist credit (design 4.13 row 4)', () => {
  test('rows alone credit the biceps only as a synergist: mostly indirect; the back they train directly is not', () => {
    const t = sessionMuscleTerms([sessionOn('r', 0, [['row', 6]])], EX)[0];
    expect(t.biceps.mostlyIndirect).toBe(true);
    expect(t.biceps.directSets).toBe(0);
    expect(t.biceps.indirectSets).toBe(3);
    expect(t.back.mostlyIndirect).toBe(false);
  });

  test('exactly half is not more than half; one set more of synergist credit is', () => {
    // 6 curls (6 direct) + 12 row sets (6 synergist): exactly half.
    const half = sessionMuscleTerms([sessionOn('h', 0, [['curl', 6], ['row', 12]])], EX)[0].biceps;
    expect(half.directSets).toBe(6);
    expect(half.indirectSets).toBe(6);
    expect(half.mostlyIndirect).toBe(false);
    // 4 curls + 12 row sets: 4 direct, 6 synergist.
    const more = sessionMuscleTerms([sessionOn('m', 0, [['curl', 4], ['row', 12]])], EX)[0].biceps;
    expect(more.mostlyIndirect).toBe(true);
  });

  test('through the map: the biceps a row day half-credits read 15% shorter than a direct dose of the same size', () => {
    const rowsAt = (day, n) => sessionOn(`r${day}`, day, [['row', n]]);
    const map = buildMuscleRecoveryMap({
      sessions: [rowsAt(-23, 6), rowsAt(-16, 6), rowsAt(0, 6)], exerciseById: EX, nowMs: BASE,
    });
    expect(map.biceps.contributingSessions).toHaveLength(1);
    expect(map.biceps.contributingSessions[0].hoursT)
      .toBeCloseTo(recoveryHours('biceps', { sets: 3, mostlyIndirect: true }), 10);
    expect(map.biceps.contributingSessions[0].hoursT)
      .toBeCloseTo(0.85 * recoveryHours('biceps', { sets: 3 }), 10);
  });
});

describe('the terms read the same credit the volume tracker does', () => {
  const mixed = () => {
    const s = sessionOn('mix', 0, [['bench', 3], ['squat', 2], ['fly', 4], ['hipthrust', 2]]);
    s.sets.push(
      ...setsOf('bench', 2, { setType: 'warmup' }), // warm-ups never count
      ...setsOf('row', 3, { evidenceClass: 'ballistic' }), // a ballistic set never counts
      ...setsOf('ghost', 2), // an exercise nothing resolves never counts
    );
    return s;
  };

  test('direct plus indirect credit equals sessionMuscleLoads for every muscle, and no other muscle appears', () => {
    const s = mixed();
    const [load] = sessionMuscleLoads([s], EX);
    const [terms] = sessionMuscleTerms([s], EX);
    expect(Object.keys(terms).sort()).toEqual(Object.keys(load.setsByMuscle).sort());
    for (const muscle of Object.keys(load.setsByMuscle)) {
      expect(terms[muscle].directSets + terms[muscle].indirectSets).toBeCloseTo(load.setsByMuscle[muscle], 10);
    }
    const tracker = calculateWeeklyVolume(s.sets, EX);
    for (const muscle of Object.keys(tracker)) {
      expect(terms[muscle].directSets + terms[muscle].indirectSets).toBeCloseTo(tracker[muscle].workingSets, 10);
    }
  });

  test('a custom synergist contribution is read as the tracker reads it (0.3, not 0.5)', () => {
    const [terms] = sessionMuscleTerms([sessionOn('f', 0, [['fly', 10]])], EX);
    expect(terms.front_delts.indirectSets).toBeCloseTo(3, 10);
    expect(terms.chest.directSets).toBe(10);
  });
});

describe('shape and purity of sessionMuscleTerms', () => {
  test('one entry per session, in the order given; nothing for a missing or empty history', () => {
    const sessions = [sessionOn('b', 5, [['bench', 6]]), sessionOn('a', 0, [['row', 6]])];
    const terms = sessionMuscleTerms(sessions, EX);
    expect(terms).toHaveLength(2);
    expect(Object.keys(terms[0])).toEqual(expect.arrayContaining(['chest', 'triceps']));
    expect(Object.keys(terms[1])).toEqual(expect.arrayContaining(['back', 'biceps']));
    expect(sessionMuscleTerms([], EX)).toEqual([]);
    expect(sessionMuscleTerms(undefined, EX)).toEqual([]);
    expect(sessionMuscleTerms(null, undefined)).toEqual([]);
    expect(sessionMuscleTerms([{ id: 'empty', startedAt: 0, endedAt: 1, sets: [] }], EX)).toEqual([{}]);
  });

  test('is deterministic and never mutates its inputs', () => {
    const sessions = [...familiarChest, sessionOn('n1', 14, [['bench', 4], ['incline', 2]])];
    const before = JSON.stringify({ sessions, EX });
    const a = sessionMuscleTerms(sessions, EX);
    const b = sessionMuscleTerms(sessions, EX);
    expect(a).toEqual(b);
    expect(JSON.stringify({ sessions, EX })).toBe(before);
  });
});
