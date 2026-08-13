/**
 * campaign16.longitudinal.test.js — Campaign 16 job 12: the full
 * initial-plan and rebuild product matrix, over TIME.
 *
 * FOUNDER BRIEF, the scenarios named: same-input rebuild, equipment-change
 * rebuild, positive-history rebuild, explicit avoid, third-block review,
 * five-plus productive-block continuity. "The goal is not just
 * 'generatePlan returned ok'. Inspect/assert plan quality."
 *
 * WHY A SEPARATE SUITE FROM THE SPLIT MATRIX
 *
 * The split matrix asks whether ONE plan is good. This asks whether a
 * SEQUENCE of blocks behaves like a coach: does the same input give the
 * same answer, does a real change produce a real response, and does a
 * plan that is working survive contact with the passage of time?
 *
 * That last one is the whole point of the amendment. The failure this
 * guards against is not a bad plan; it is a good plan being churned for
 * novelty, block after block, because nothing was recording that it was
 * working.
 */

const { generatePlan } = require('../planEngine');
const { applyContinuity, slotKey, SLOT_OUTCOME } = require('../exercise/continuity');
const { proposeNextBlock } = require('../blockReview');
const { PROGRAMME_VERDICT, SLOT_REASON } = require('../programmeEpoch');
const { LIBRARY, inputs, planExercises } = require('./campaign16.helpers');

const BY_NAME = new Map(LIBRARY.map(e => [e.name, e]));
const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

const familyOfName = (name) => {
  const row = BY_NAME.get(name);
  if (!row?.primaryMuscle) return null;
  // The stored tag IS the family for the classified muscles, and the
  // existing vocabulary for the rest.
  return slotKey(row.primaryMuscle, row.subregion ?? row.primaryMuscle);
};

/** The current plan as continuity incumbents. */
const incumbentsOf = p => planExercises(p).map(e => {
  const row = BY_NAME.get(e.exerciseName);
  return {
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    muscle: row?.primaryMuscle,
    family: row?.subregion ?? row?.primaryMuscle,
  };
});

/**
 * Run a rebuild the way production does: generate for the new inputs, then
 * apply continuity against the previous plan. The id -> name map is built
 * ONCE from both plans, because resolving it lazily per lookup made the
 * harness itself the thing under test.
 */
const rebuild = (previous, over, evidence) => {
  const next = plan(over);
  const nameById = new Map();
  for (const e of [...planExercises(previous), ...planExercises(next)]) {
    if (e.exerciseId) nameById.set(e.exerciseId, e.exerciseName);
  }
  return applyContinuity({
    generated: next.workouts,
    incumbents: incumbentsOf(previous),
    familyOf: (id) => {
      const name = nameById.get(id);
      return name ? familyOfName(name) : null;
    },
    evidenceFor: () => evidence,
    context: { epochBlocks: 0 },
    isRebuild: true,
  });
};

const PRODUCTIVE = { progressing: true, sessions: 10, autoEligible: true, equipmentLost: false };

// ---------------------------------------------------------------------------

describe('C16-12 same-input rebuild', () => {
  test('rebuilding with nothing changed returns the same plan', () => {
    // Determinism means the generator alone already achieves this. Asserted
    // because it is the baseline every other scenario is measured against.
    const a = plan({ daysPerWeek: 4 });
    const b = plan({ daysPerWeek: 4 });
    expect(planExercises(b).map(e => e.exerciseName))
      .toEqual(planExercises(a).map(e => e.exerciseName));
  });

  test('and continuity retains, rather than coincidentally re-picking', () => {
    const before = plan({ daysPerWeek: 4 });
    const { decisions } = rebuild(before, { daysPerWeek: 4 }, PRODUCTIVE);
    const retained = decisions.filter(d => d.outcome === SLOT_OUTCOME.RETAINED);
    expect(retained.length).toBeGreaterThan(0);
    // Quality law 6: each retention names its reason.
    for (const d of retained) expect(d.reason).toBeTruthy();
  });
});

describe('C16-12 equipment-change rebuild', () => {
  test('a real equipment change produces a real, valid response', () => {
    const before = plan({ daysPerWeek: 4, equipment: 'full_gym' });
    const after = plan({ daysPerWeek: 4, equipment: 'dumbbells_only' });
    const beforeNames = planExercises(before).map(e => e.exerciseName);
    const afterNames = planExercises(after).map(e => e.exerciseName);
    expect(afterNames).not.toEqual(beforeNames);
    // And everything it chose is genuinely performable.
    for (const n of afterNames) {
      expect(BY_NAME.get(n)?.equipmentProfiles ?? []).toContain('dumbbells_only');
    }
  });

  test('an incumbent the user can no longer perform is replaced, with that reason', () => {
    const before = plan({ daysPerWeek: 4, equipment: 'full_gym' });
    const { decisions } = rebuild(
      before, { daysPerWeek: 4, equipment: 'dumbbells_only' },
      { ...PRODUCTIVE, equipmentLost: true },
    );
    const replaced = decisions.filter(d => d.outcome === SLOT_OUTCOME.REPLACED);
    expect(replaced.length).toBeGreaterThan(0);
    for (const d of replaced) expect(d.reason).toBe(SLOT_REASON.EQUIPMENT_LOST);
  });
});

describe('C16-12 positive-history rebuild', () => {
  test('a productive exercise survives a rebuild that would otherwise re-pick', () => {
    const before = plan({ daysPerWeek: 4 });
    // A different session length reshuffles selection; history should hold.
    const { decisions } = rebuild(before, { daysPerWeek: 4, sessionLengthMinutes: 75 }, PRODUCTIVE);
    const retained = decisions.filter(d => d.outcome === SLOT_OUTCOME.RETAINED);
    expect(retained.length).toBeGreaterThan(0);
    expect(retained.every(d => d.reason === SLOT_REASON.STILL_PRODUCTIVE)).toBe(true);
  });

  test('nothing is replaced merely because the generator preferred something else', () => {
    const before = plan({ daysPerWeek: 4 });
    const { decisions } = rebuild(before, { daysPerWeek: 4, sessionLengthMinutes: 75 }, PRODUCTIVE);
    expect(decisions.filter(d => d.outcome === SLOT_OUTCOME.REPLACED)).toEqual([]);
  });
});

describe('C16-12 explicit avoid', () => {
  test('an excluded incumbent is replaced however well it was going', () => {
    const before = plan({ daysPerWeek: 4 });
    const { decisions } = rebuild(before, { daysPerWeek: 4 }, { ...PRODUCTIVE, excluded: true });
    const replaced = decisions.filter(d => d.outcome === SLOT_OUTCOME.REPLACED);
    expect(replaced.length).toBeGreaterThan(0);
    for (const d of replaced) expect(d.reason).toBe(SLOT_REASON.USER_EXCLUDED);
  });
});

describe('C16-12 the third-block review', () => {
  const structure = { workouts: [{ name: 'Upper', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }] }] };
  const slots = [
    { exerciseId: 'a', exerciseName: 'Barbell Bench Press', workout: 'Upper' },
    { exerciseId: 'b', exerciseName: 'Lat Pulldown (Wide Grip)', workout: 'Upper' },
    { exerciseId: 'c', exerciseName: 'Barbell Back Squat', workout: 'Lower' },
    { exerciseId: 'd', exerciseName: 'Lying Leg Curl', workout: 'Lower' },
  ];
  const hist = n => Array.from({ length: n }, () => ({ structure, completed: true }));

  test('blocks 1 and 2 are not eligible for structural review', () => {
    for (const n of [0, 1, 2]) {
      const p = proposeNextBlock({
        slots, history: hist(n), currentStructure: structure,
        evidenceFor: () => ({ sessions: 4, systematicCandidate: true }),
      });
      expect(p.reviewDue).toBe(false);
      expect(p.verdict).toBe(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
    }
  });

  test('block 3 becomes eligible, and eligibility is not obligation', () => {
    const p = proposeNextBlock({
      slots, history: hist(3), currentStructure: structure,
      evidenceFor: () => ({ sessions: 12, progressing: true, systematicCandidate: true }),
    });
    expect(p.reviewDue).toBe(true);
    // Everything is working, so the review's answer is: continue.
    expect(p.verdict).toBe(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
    expect(p.changedCount).toBe(0);
  });

  test('at the review point a stagnant slot may finally be varied', () => {
    const p = proposeNextBlock({
      slots, history: hist(3), currentStructure: structure,
      evidenceFor: id => (id === 'a'
        ? { sessions: 12, progressing: false, systematicCandidate: true }
        : { sessions: 12, progressing: true }),
    });
    expect(p.changedCount).toBe(1);
    expect(p.changes[0].reason).toBe(SLOT_REASON.SYSTEMATIC_VARIATION);
    expect(p.verdict).toBe(PROGRAMME_VERDICT.REFINE_PROGRAMME);
  });

  test('a volume change does not reset the epoch and re-start the clock', () => {
    // The signature deliberately excludes sets and ramps. If it did not, a
    // user whose volume moved every block would never reach a review.
    const heavier = {
      workouts: [{
        name: 'Upper',
        exercises: [{ exerciseId: 'a', sets: 6 }, { exerciseId: 'b', sets: 6 }],
      }],
    };
    const p = proposeNextBlock({
      slots, history: hist(4), currentStructure: heavier,
      evidenceFor: () => ({ sessions: 12, progressing: true }),
    });
    expect(p.epochBlocks).toBeGreaterThanOrEqual(3);
    expect(p.reviewDue).toBe(true);
  });
});

describe('C16-12 five or more productive blocks', () => {
  const structure = { workouts: [{ name: 'Upper', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }] }] };
  const slots = [
    { exerciseId: 'a', exerciseName: 'Barbell Bench Press', workout: 'Upper' },
    { exerciseId: 'b', exerciseName: 'Lat Pulldown (Wide Grip)', workout: 'Upper' },
  ];

  test('a plan that keeps working is never churned for novelty', () => {
    // The amendment's core promise: there is no maximum exercise age.
    for (const n of [3, 5, 8, 12, 20]) {
      const p = proposeNextBlock({
        slots,
        history: Array.from({ length: n }, () => ({ structure, completed: true })),
        currentStructure: structure,
        evidenceFor: () => ({ sessions: 40, progressing: true, systematicCandidate: true }),
      });
      expect({ n, changed: p.changedCount }).toEqual({ n, changed: 0 });
      expect(p.verdict).toBe(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
      // And it says WHY it stayed, every time.
      for (const s of p.stays) expect(s.reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
    }
  });

  test('the review still happens: continuing is an answer, not a skipped question', () => {
    const p = proposeNextBlock({
      slots,
      history: Array.from({ length: 10 }, () => ({ structure, completed: true })),
      currentStructure: structure,
      evidenceFor: () => ({ sessions: 40, progressing: true }),
    });
    expect(p.reviewDue).toBe(true);
    expect(p.slots).toHaveLength(slots.length);
    for (const s of p.slots) expect(s.reason).toBeTruthy();
  });

  test('an abandoned block does not count toward the epoch', () => {
    const p = proposeNextBlock({
      slots,
      history: [
        { structure, completed: true },
        { structure, completed: false },
        { structure, completed: true },
      ],
      currentStructure: structure,
      evidenceFor: () => ({ sessions: 10, progressing: true }),
    });
    expect(p.epochBlocks).toBe(1);
    expect(p.reviewDue).toBe(false);
  });
});
