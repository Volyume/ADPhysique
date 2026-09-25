/**
 * sequenceSessions.test.js -- per-muscle recovery sequencing (register
 * D201, spec docs/recovery-programme-2026-09-25/00-SPEC.md section 5).
 * Pins: a well-sequenced split is left unchanged (identity kept); a
 * badly-sequenced one is repaired; the wrap-around gap is genuinely
 * scored, not skipped; ties keep the ORIGINAL order; the module is
 * deterministic; N > 7 is guarded to unchanged; describeSpacing's
 * sentence; the exerciseById fallback to an exercise's own `_m`/`_muscle`
 * tag; lead ruling 1 (D201 addendum) - the first session never moves,
 * even across a rotation of otherwise-tied sessions and even when a
 * different lead would only ever TIE (never strictly beat) it; lead
 * ruling 2 (D201 addendum) - the adjacency term is linear only (a
 * same-muscle pair adjacent across the wrap is never penalised by it,
 * the identical pair placed in-week is), while the recovery-pair terms
 * stay circular; lead ruling 3 (D201 addendum) - gaps come from
 * TYPICAL_WEEK_GAP_HOURS (a real week's uneven layout, longest gap at
 * the wrap), never an even 168 / N slice.
 */
import { sequenceSessionsForRecovery, describeSpacing } from '../sequenceSessions';
import { recoveryHours } from '../constants';

/** Registers `id` in `byId` and returns the generator's own post-strip
 * exercise shape ({ exerciseId, exerciseName, sets, ... }, no muscle tag -
 * see sequenceSessions.js header for why the real hook site never carries
 * one), so most fixtures below exercise the exerciseById path exactly as
 * planEngine.js's hook actually calls this module. */
function mkEx(byId, id, muscle, sets, secondaryMuscles = []) {
  byId[id] = { primaryMuscle: muscle, secondaryMuscles };
  return {
    exerciseId: id, exerciseName: id, sets, repMin: 8, repMax: 12, restSec: 90, rirTarget: 2, notes: null,
  };
}

/** An exercise with NO exerciseById entry, carrying only the
 * selection-time `_muscle` tag, to exercise the fallback path. */
function mkFallbackEx(id, muscle, sets) {
  return {
    exerciseId: id, exerciseName: id, sets, repMin: 8, repMax: 12, restSec: 90, rirTarget: 2, notes: null, _muscle: muscle,
  };
}

function session(name, exercises) {
  return { name, exercises };
}

describe('a well-sequenced 4-day upper/lower stays unchanged', () => {
  test('U/L/U/L: changed false, identity kept', () => {
    const byId = {};
    const upperA = session('Upper A', [mkEx(byId, 'bench', 'chest', 4), mkEx(byId, 'row', 'back', 4)]);
    const lowerA = session('Lower A', [mkEx(byId, 'squat', 'quads', 4), mkEx(byId, 'rdl', 'hamstrings', 4)]);
    const upperB = session('Upper B', [mkEx(byId, 'ohp', 'chest', 4), mkEx(byId, 'pulldown', 'back', 4)]);
    const lowerB = session('Lower B', [mkEx(byId, 'legpress', 'quads', 4), mkEx(byId, 'legcurl', 'hamstrings', 4)]);
    const input = [upperA, lowerA, upperB, lowerB];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(false);
    expect(result.workouts).toBe(input);
    expect(result.workouts.map((w) => w.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B']);
    expect(result.penaltyAfter).toBe(result.penaltyBefore);
  });

  test('the same four sessions given as U/U/L/L are repaired to alternate', () => {
    const byId = {};
    const upperA = session('Upper A', [mkEx(byId, 'bench', 'chest', 4), mkEx(byId, 'row', 'back', 4)]);
    const upperB = session('Upper B', [mkEx(byId, 'ohp', 'chest', 4), mkEx(byId, 'pulldown', 'back', 4)]);
    const lowerA = session('Lower A', [mkEx(byId, 'squat', 'quads', 4), mkEx(byId, 'rdl', 'hamstrings', 4)]);
    const lowerB = session('Lower B', [mkEx(byId, 'legpress', 'quads', 4), mkEx(byId, 'legcurl', 'hamstrings', 4)]);
    const input = [upperA, upperB, lowerA, lowerB];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(true);
    expect(result.penaltyAfter).toBeLessThan(result.penaltyBefore);
    const names = result.workouts.map((w) => w.name);
    // Alternating: no two consecutive sessions (circularly) are both Upper
    // or both Lower.
    for (let i = 0; i < names.length; i++) {
      const a = names[i].startsWith('Upper');
      const b = names[(i + 1) % names.length].startsWith('Upper');
      expect(a).not.toBe(b);
    }
    // Same four session objects, just reordered.
    expect(new Set(result.workouts)).toEqual(new Set(input));
  });
});

describe('a 6-day PPL keeps legs on the longest gap', () => {
  test('P/P/L/P/P/L is unchanged and legs get the maximum achievable spacing', () => {
    const byId = {};
    const pushA = session('Push A', [mkEx(byId, 'bench', 'chest', 4), mkEx(byId, 'tri', 'triceps', 4)]);
    const pullA = session('Pull A', [mkEx(byId, 'row', 'back', 4), mkEx(byId, 'curl', 'biceps', 4)]);
    const legsA = session('Legs A', [mkEx(byId, 'squat', 'quads', 4), mkEx(byId, 'rdl', 'hamstrings', 4)]);
    const pushB = session('Push B', [mkEx(byId, 'ohp', 'chest', 4), mkEx(byId, 'pushdown', 'triceps', 4)]);
    const pullB = session('Pull B', [mkEx(byId, 'pulldown', 'back', 4), mkEx(byId, 'hammer', 'biceps', 4)]);
    const legsB = session('Legs B', [mkEx(byId, 'legpress', 'quads', 4), mkEx(byId, 'legcurl', 'hamstrings', 4)]);
    const input = [pushA, pullA, legsA, pushB, pullB, legsB];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 6, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(false);
    expect(result.workouts.map((w) => w.name)).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B']);
    // TYPICAL_WEEK_GAP_HOURS[6] = [24,24,24,24,24,48] (D201 addendum, lead
    // ruling 3). Legs sit 3 slots apart both ways: forward (Legs A ->
    // Legs B) sums three 24s = 72 h; the wrap (Legs B -> next week's Legs
    // A) sums two 24s and the 48 h week-boundary entry = 96 h. 72 h is
    // still the best (largest minimum) spacing 2 occurrences can reach in
    // 6 slots under this layout, so the order is unchanged.
    const legsEntries = result.spacing.filter((s) => s.muscle === 'quads' || s.muscle === 'hamstrings');
    expect(legsEntries.length).toBeGreaterThan(0);
    for (const entry of legsEntries) expect(entry.hoursBetween).toBeCloseTo(72, 5);
  });
});

describe('lead ruling 3: the typical-week layout, not an even slice', () => {
  test('a 4-day U/L/U/L reads 72 and 96 hour gaps for the muscles trained twice', () => {
    const byId = {};
    // Chest, isolated (fillers below QUALIFYING_SETS so nothing else
    // qualifies), at positions 0 and 2 of a 4-day week. Under
    // TYPICAL_WEEK_GAP_HOURS[4] = [24,48,24,72] that is 24 + 48 = 72 h one
    // way and 24 + 72 = 96 h the other - never a flat 84 h.
    const upperA = session('Upper A', [mkEx(byId, 'bench', 'chest', 2)]);
    const fillerA = session('Filler A', [mkEx(byId, 'curl', 'biceps', 1)]);
    const upperB = session('Upper B', [mkEx(byId, 'ohp', 'chest', 2)]);
    const fillerB = session('Filler B', [mkEx(byId, 'curl2', 'biceps', 1)]);
    const input = [upperA, fillerA, upperB, fillerB];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    // The reported (worst/minimum) gap is the 72 h one.
    const chestEntry = result.spacing.find((s) => s.muscle === 'chest');
    expect(chestEntry).toBeTruthy();
    expect(chestEntry.hoursBetween).toBeCloseTo(72, 6);

    // The 96 h gap is independently proven by the penalty itself: at 2
    // sets (the minimum qualifying dose), T = 42 h exactly (base 60 h x
    // the clamped-minimum dose factor 0.7). The 72 h edge triggers
    // neither term (72 < 2 x 42 = 84... no: 72 < 84, so no over-recovery;
    // 72 > 42, so no under-recovery either) and contributes 0. The 96 h
    // edge triggers ONLY the over-recovered term: 0.25 x (96 - 84)^2 / 24
    // = 1.5. A total of anything other than exactly 1.5 would mean a
    // different (wrong) gap was used somewhere.
    const T = recoveryHours('chest', { sets: 2, recoveryRating: 'average', rirTarget: 2 });
    expect(T).toBeCloseTo(42, 6);
    expect(result.penaltyBefore).toBeCloseTo(1.5, 6);
    expect(result.penaltyAfter).toBeCloseTo(1.5, 6);
    expect(result.changed).toBe(false);
  });
});

describe('a deliberately bad 5-day order is repaired', () => {
  test('every muscle crammed into 3 consecutive days is spread out', () => {
    const byId = {};
    // Chest and back both hammered on days 0 and 1 (back-to-back), quads
    // and hamstrings both hammered on days 2 and 3 (also back-to-back),
    // day 4 is a light filler day. This is about as badly sequenced as a
    // 5-day week can be.
    const d0 = session('D0', [mkEx(byId, 'bench1', 'chest', 5), mkEx(byId, 'row1', 'back', 5)]);
    const d1 = session('D1', [mkEx(byId, 'ohp1', 'chest', 5), mkEx(byId, 'pulldown1', 'back', 5)]);
    const d2 = session('D2', [mkEx(byId, 'squat1', 'quads', 5), mkEx(byId, 'rdl1', 'hamstrings', 5)]);
    const d3 = session('D3', [mkEx(byId, 'legpress1', 'quads', 5), mkEx(byId, 'legcurl1', 'hamstrings', 5)]);
    const d4 = session('D4', [mkEx(byId, 'curl1', 'biceps', 3)]);
    const input = [d0, d1, d2, d3, d4];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 5, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(true);
    expect(result.penaltyAfter).toBeLessThan(result.penaltyBefore);
    // D0 and D1 (chest+back) must no longer be adjacent, nor D2/D3 (legs).
    const order = result.workouts.map((w) => w.name);
    const idx = (n) => order.indexOf(n);
    const adjacent = (a, b) => {
      const da = idx(a); const db = idx(b);
      return Math.abs(da - db) === 1;
    };
    expect(adjacent('D0', 'D1')).toBe(false);
    expect(adjacent('D2', 'D3')).toBe(false);
  });
});

describe('a hand-authored (DIVISION_MATRIX-like) order: replaced only when strictly lower', () => {
  test('already-optimal hand order ties and is kept', () => {
    const byId = {};
    // Three sessions, each a different muscle at a moderate dose: no
    // permutation can beat the identity (every pairwise gap is already
    // the same by symmetry), so the tie keeps the authored order.
    const a = session('Hand A', [mkEx(byId, 'a1', 'chest', 4)]);
    const b = session('Hand B', [mkEx(byId, 'b1', 'back', 4)]);
    const c = session('Hand C', [mkEx(byId, 'c1', 'quads', 4)]);
    const input = [a, b, c];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 3, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(false);
    expect(result.workouts).toBe(input);
  });

  test('a hand order with an avoidable clash is replaced by a strictly lower one', () => {
    const byId = {};
    // Glutes hammered on two sessions hand-placed back to back (session 0
    // and session 1), with two disjoint, below-threshold filler sessions
    // free to move between them. With 4 sessions in the week, spreading
    // the two glute sessions to opposite slots (2 apart, not 1) strictly
    // lowers the penalty; with only 3 sessions total, 2 occurrences of one
    // muscle are always 1 slot apart on at least one side regardless of
    // arrangement, so this needs the 4th slot to have room to improve.
    const glutesA = session('Glutes A', [mkEx(byId, 'g1', 'glutes', 6)]);
    const glutesB = session('Glutes B', [mkEx(byId, 'g2', 'glutes', 6)]);
    const filler1 = session('Filler 1', [mkEx(byId, 'f1', 'calves', 1)]);
    const filler2 = session('Filler 2', [mkEx(byId, 'f2', 'calves', 1)]);
    const input = [glutesA, glutesB, filler1, filler2];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(true);
    expect(result.penaltyAfter).toBeLessThan(result.penaltyBefore);
    const order = result.workouts.map((w) => w.name);
    const distance = Math.abs(order.indexOf('Glutes A') - order.indexOf('Glutes B'));
    expect(distance).toBe(2);
  });
});

describe('the wrap-around gap is counted', () => {
  test('a muscle trained in exactly one of two sessions still contributes its self-pair (full-week) term', () => {
    const byId = {};
    // Session 0 trains triceps at 8 sets; session 1 trains a disjoint
    // muscle at 1 set (below QUALIFYING_SETS, so it contributes nothing
    // and cannot add its own muscle-pair or adjacency term). N = 2, so
    // gapHours = 84h and the triceps self-pair (only one qualifying
    // session) wraps across the full week: distance = N = 2 slots = 168h.
    const s0 = session('S0', [mkEx(byId, 'pushdown', 'triceps', 8)]);
    const s1 = session('S1', [mkEx(byId, 'shrug', 'traps', 1)]);
    const input = [s0, s1];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 2, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    const T = recoveryHours('triceps', { sets: 8, recoveryRating: 'average', rirTarget: 2 });
    const gapHours = 168 / 2;
    const gapBetweenThem = 2 * gapHours; // self-pair: full week
    const underRecovered = Math.max(0, T - gapBetweenThem) ** 2;
    const overRecovered = (0.25 * Math.max(0, gapBetweenThem - 2 * T) ** 2) / 24;
    const expectedPenalty = underRecovered + overRecovered;

    expect(result.penaltyBefore).toBeCloseTo(expectedPenalty, 6);
    expect(result.penaltyAfter).toBeCloseTo(expectedPenalty, 6);
    expect(result.changed).toBe(false);
  });
});

describe('lead ruling 1: the first (authored) session never moves', () => {
  test('a rotation of fully interchangeable sessions still keeps whichever session is given first', () => {
    const byId = {};
    // Four sessions with IDENTICAL muscle content: every permutation scores
    // exactly the same, so countless rotations tie for the global minimum,
    // including many that would put a DIFFERENT session first. The lead is
    // fixed by ARRAY POSITION (workouts[0]), not by session identity: feed
    // the same four sessions starting at a different rotation and the NEW
    // first element stays first.
    const a = session('A', [mkEx(byId, 'a1', 'abs', 4)]);
    const b = session('B', [mkEx(byId, 'b1', 'abs', 4)]);
    const c = session('C', [mkEx(byId, 'c1', 'abs', 4)]);
    const d = session('D', [mkEx(byId, 'd1', 'abs', 4)]);
    const opts = { daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId };

    const r1 = sequenceSessionsForRecovery([a, b, c, d], opts);
    expect(r1.changed).toBe(false);
    expect(r1.workouts[0]).toBe(a);

    const r2 = sequenceSessionsForRecovery([c, d, a, b], opts);
    expect(r2.changed).toBe(false);
    expect(r2.workouts[0]).toBe(c);
  });

  test('a rotation that would score EQUALLY by moving a different session to lead is still not taken', () => {
    const byId = {};
    // Back appears in two sessions; wherever the OTHER (non-lead) sessions
    // land, the search is free to place the second Back session 2 slots
    // from whichever session leads (the best available spacing for a
    // 2-occurrence muscle in 4 slots) - so which specific session the
    // lead is does not, by itself, change the achievable penalty here.
    // This is exactly the case the ruling covers: even though a rotation
    // starting with a different session ties, workouts[0] stays whatever
    // the input's first session was.
    const back1 = session('Back A', [mkEx(byId, 'row', 'back', 6)]);
    const chest = session('Chest', [mkEx(byId, 'bench', 'chest', 6)]);
    const lower = session('Lower', [mkEx(byId, 'squat', 'quads', 6)]);
    const back2 = session('Back B', [mkEx(byId, 'pulldown2', 'back', 6)]);
    const opts = { daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId };

    const backLeads = sequenceSessionsForRecovery([back1, chest, lower, back2], opts);
    const chestLeads = sequenceSessionsForRecovery([chest, lower, back2, back1], opts);

    expect(backLeads.workouts[0]).toBe(back1);
    expect(chestLeads.workouts[0]).toBe(chest);
    // Both achieve the same best-available penalty; the lead constraint
    // cost nothing here, and it still held.
    expect(backLeads.penaltyAfter).toBeCloseTo(chestLeads.penaltyAfter, 6);
  });
});

describe('lead ruling 2: the adjacency term is linear, the recovery terms stay circular', () => {
  test('a same-muscle pair adjacent ACROSS the wrap is not penalised by adjacency; the same pair placed IN-WEEK is', () => {
    const byIdWrap = {};
    // muscleA at positions 0 and 2 of a 3-session week: their tight
    // (1-slot) recovery edge is the WRAP (session 2 -> next week's
    // session 0), never checked by the linear-only adjacency term.
    const x = () => mkEx(byIdWrap, 'x', 'triceps', 6);
    const y = () => mkEx(byIdWrap, 'y', 'triceps', 6);
    const filler = () => mkEx(byIdWrap, 'f', 'calves', 1); // below QUALIFYING_SETS: contributes nothing
    const wrapAdjacent = [session('X', [x()]), session('Filler', [filler()]), session('Y', [y()])];

    const byIdLinear = {};
    const x2 = () => mkEx(byIdLinear, 'x', 'triceps', 6);
    const y2 = () => mkEx(byIdLinear, 'y', 'triceps', 6);
    const filler2 = () => mkEx(byIdLinear, 'f', 'calves', 1);
    const inWeekAdjacent = [session('X', [x2()]), session('Y', [y2()]), session('Filler', [filler2()])];

    const opts = (byId) => ({ daysPerWeek: 3, recoveryRating: 'average', rirTarget: 2, exerciseById: byId });
    const wrapResult = sequenceSessionsForRecovery(wrapAdjacent, opts(byIdWrap));
    const linearResult = sequenceSessionsForRecovery(inWeekAdjacent, opts(byIdLinear));

    // TYPICAL_WEEK_GAP_HOURS[3] = [48, 48, 72] (D201 addendum, lead ruling
    // 3) is asymmetric, so - unlike the old even-168/N model - the
    // CIRCULAR recovery-pair term is no longer position-independent: X
    // and Y's own T = recoveryHours('triceps', {sets:6,...}) = 48 exactly
    // (base 48 x doseFactor(6) 1.0). Wrap placement (X@0, Y@2): edges
    // 48+48=96 and the wrap 72; neither exceeds 2T=96, so the recovery
    // term is 0. In-week placement (X@0, Y@1): edges 48 and the wrap
    // 48+72=120; 120 > 2T=96, so that edge alone contributes
    // 0.25 x (120-96)^2 / 24 = 6, on top of which the LINEAR adjacency
    // term now fires as a law-5 clash (overlap 1.0 -> CLASH_PENALTY_BASE
    // x (1 + 0.5) = 1,500,000; Opus review finding 3 made the clash term
    // dominant). Total: wrap = 0, in-week = 1,500,006. This is the
    // fully-worked, exact proof that a same-muscle pair placed across the
    // wrap is cheaper than the identical pair placed in-week under ruling
    // 3, not just the adjacency term in isolation (ruling 3 couples the
    // two).
    expect(wrapResult.penaltyBefore).toBeCloseTo(0, 6);
    expect(linearResult.penaltyBefore).toBeCloseTo(1.5e6 + 6, 6);

    // The wrap scenario's own input already avoids the linear clash, so
    // its search finds nothing better (changed: false). The in-week
    // scenario's search, with X fixed as lead, still has one degree of
    // freedom (swap Y and Filler) - and it uses it, relocating Y behind
    // Filler so the same-muscle pair lands on the wrap instead, where
    // neither the adjacency term nor the recovery term charges it as
    // much. Both searches converge on the SAME minimum (0), the clearest
    // possible demonstration that the optimiser itself treats a wrap
    // placement as strictly cheaper than an in-week one whenever it has
    // the choice.
    expect(wrapResult.changed).toBe(false);
    expect(linearResult.changed).toBe(true);
    expect(linearResult.penaltyAfter).toBeCloseTo(0, 6);
    expect(linearResult.workouts.map((s) => s.name)).toEqual(['X', 'Filler', 'Y']);
    expect(linearResult.penaltyAfter).toBeCloseTo(wrapResult.penaltyAfter, 6);
  });
});

describe('the stable tie-break', () => {
  test('when every permutation ties, the original order is kept', () => {
    const byId = {};
    // Three sessions with IDENTICAL muscle content: every permutation of
    // them scores exactly the same, so the tie-break must keep the input
    // order rather than any other tied arrangement.
    const a = session('First', [mkEx(byId, 'x1', 'abs', 4)]);
    const b = session('Second', [mkEx(byId, 'x2', 'abs', 4)]);
    const c = session('Third', [mkEx(byId, 'x3', 'abs', 4)]);
    const input = [a, b, c];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 3, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(false);
    expect(result.workouts).toBe(input);
    expect(result.workouts.map((w) => w.name)).toEqual(['First', 'Second', 'Third']);
  });
});

describe('determinism', () => {
  test('the same input scores and reorders identically twice', () => {
    const byId = {};
    const upperA = session('Upper A', [mkEx(byId, 'bench', 'chest', 4), mkEx(byId, 'row', 'back', 4)]);
    const upperB = session('Upper B', [mkEx(byId, 'ohp', 'chest', 4), mkEx(byId, 'pulldown', 'back', 4)]);
    const lowerA = session('Lower A', [mkEx(byId, 'squat', 'quads', 4), mkEx(byId, 'rdl', 'hamstrings', 4)]);
    const lowerB = session('Lower B', [mkEx(byId, 'legpress', 'quads', 4), mkEx(byId, 'legcurl', 'hamstrings', 4)]);
    const input = [upperA, upperB, lowerA, lowerB];
    const opts = { daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId };

    const r1 = sequenceSessionsForRecovery(input, opts);
    const r2 = sequenceSessionsForRecovery(input, opts);

    expect(r1.workouts.map((w) => w.name)).toEqual(r2.workouts.map((w) => w.name));
    expect(r1.changed).toBe(r2.changed);
    expect(r1.penaltyBefore).toBe(r2.penaltyBefore);
    expect(r1.penaltyAfter).toBe(r2.penaltyAfter);
    expect(r1.spacing).toEqual(r2.spacing);
  });
});

describe('more than 7 sessions is guarded to unchanged', () => {
  test('N = 8 returns the input unchanged with changed false', () => {
    const byId = {};
    const input = Array.from({ length: 8 }, (_, i) => session(`S${i}`, [mkEx(byId, `e${i}`, 'chest', 4)]));

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 8, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.changed).toBe(false);
    expect(result.workouts).toBe(input);
    expect(result.penaltyBefore).toBe(result.penaltyAfter);
  });
});

describe('describeSpacing', () => {
  test('names the achieved gap for the longest-recovery muscles trained', () => {
    const byId = {};
    const upperA = session('Upper A', [mkEx(byId, 'bench', 'chest', 4)]);
    const lowerA = session('Lower A', [mkEx(byId, 'squat', 'quads', 4), mkEx(byId, 'rdl', 'hamstrings', 4)]);
    const upperB = session('Upper B', [mkEx(byId, 'ohp', 'chest', 4)]);
    const lowerB = session('Lower B', [mkEx(byId, 'legpress', 'quads', 4), mkEx(byId, 'legcurl', 'hamstrings', 4)]);
    const input = [upperA, lowerA, upperB, lowerB];

    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 4, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });
    const sentence = describeSpacing(result);

    // TYPICAL_WEEK_GAP_HOURS[4] (D201 addendum, lead ruling 3): quads and
    // hamstrings' worst gap is 72 h, not the old flat 84 h.
    // Muscles are named in the scorer's fixed alphabetical order (the same
    // order every candidate sums its terms in, see TIE_TOLERANCE).
    expect(sentence).toBe('Assuming a usual 4-day week, sessions are ordered to leave about 72 hours before the next session that trains the hamstrings and quads.');
    expect(sentence).not.toMatch(/—/);
    expect(sentence).not.toMatch(/you must/i);
  });

  test('returns null when no muscle is trained more than once', () => {
    const byId = {};
    const only = session('Only', [mkEx(byId, 'bench', 'chest', 4)]);
    const result = sequenceSessionsForRecovery([only], {
      daysPerWeek: 1, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(describeSpacing(result)).toBeNull();
  });
});

describe('exerciseById fallback to the _m / _muscle selection-time tag', () => {
  test('an exercise missing from exerciseById still contributes via its own _muscle tag', () => {
    const s0 = session('S0', [mkFallbackEx('unmapped', 'quads', 8)]);
    const s1 = session('S1', [mkFallbackEx('unmapped2', 'quads', 8)]);
    const input = [s0, s1];

    // No exerciseById at all: both exercises must resolve purely from
    // their own _muscle tag.
    const result = sequenceSessionsForRecovery(input, {
      daysPerWeek: 2, recoveryRating: 'average', rirTarget: 2, exerciseById: {},
    });

    // Both sessions load quads at 8 sets each: the recovery-pair term
    // must be non-zero (proves the fallback resolved a muscle at all),
    // and it must match a version of the same two sessions built through
    // an exerciseById map instead (proves the fallback resolves the SAME
    // muscle/sets the map path would).
    expect(result.penaltyBefore).toBeGreaterThan(0);

    const byId = {};
    const mapped = [
      session('S0', [mkEx(byId, 'unmapped', 'quads', 8)]),
      session('S1', [mkEx(byId, 'unmapped2', 'quads', 8)]),
    ];
    const mappedResult = sequenceSessionsForRecovery(mapped, {
      daysPerWeek: 2, recoveryRating: 'average', rirTarget: 2, exerciseById: byId,
    });

    expect(result.penaltyBefore).toBeCloseTo(mappedResult.penaltyBefore, 10);
  });
});
