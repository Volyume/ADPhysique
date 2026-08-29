/**
 * campaign16.continuity.test.js — Campaign 16 job 5: what a rebuild keeps.
 *
 * FOUNDER BRIEF: "initial plan: staples/common + correct coverage.
 * rebuild: continuity first. Do not replace a valid productive exercise
 * merely because another staple ranks slightly higher. Integrate existing
 * Campaign-9: Avoid, Don't Suggest, personal evidence, swap/preference
 * evidence where not already live."
 *
 * WHY THIS MATTERS, in user terms
 *
 * Generation is deterministic and stateless, which is right for a FIRST
 * plan and wrong for a rebuild. Before this, changing one input - a day, a
 * session length, an equipment tick - could reshuffle the selection
 * wholesale and discard an exercise the user had been progressing on for
 * months, in favour of one that scored a fraction higher on a table that
 * knows nothing about them. Nothing was wrong with the new exercise; that
 * is exactly the point.
 *
 * WHAT THIS SUITE PINS
 *
 * The laws, and specifically the ones that are easy to break in the
 * "helpful" direction: continuity must never override an exclusion, never
 * resurrect equipment the user no longer has, never keep an exercise the
 * generator is no longer allowed to pick, and never change what the plan
 * DELIVERS - only which exercise fills a slot whose job is unchanged.
 */

const { applyContinuity, summariseDecisions, slotKey, SLOT_OUTCOME } = require('../exercise/continuity');
const { SLOT_REASON } = require('../programmeEpoch');

// A tiny fixed world, so every assertion is about the rule and not about
// which exercise the real engine happened to pick today.
const EX = {
  bench:     { id: 'e-bench',    name: 'Barbell Bench Press', muscle: 'chest', family: 'flat' },
  dbBench:   { id: 'e-dbbench',  name: 'Dumbbell Bench Press', muscle: 'chest', family: 'flat' },
  incline:   { id: 'e-incline',  name: 'Incline Dumbbell Press', muscle: 'chest', family: 'incline' },
  pulldown:  { id: 'e-pulldown', name: 'Lat Pulldown (Wide Grip)', muscle: 'back', family: 'vertical_pull' },
  chinUp:    { id: 'e-chinup',   name: 'Chin-Up', muscle: 'back', family: 'vertical_pull' },
  row:       { id: 'e-row',      name: 'Barbell Row (Bent Over)', muscle: 'back', family: 'upper_mid_row' },
};
const ALL = Object.values(EX);
const byId = new Map(ALL.map(e => [e.id, e]));

const familyOf = id => {
  const e = byId.get(id);
  return e ? slotKey(e.muscle, e.family) : null;
};
const incumbent = e => ({
  exerciseId: e.id, exerciseName: e.name, muscle: e.muscle, family: e.family,
});
const generatedWith = (...exercises) => ([{
  name: 'Session',
  exercises: exercises.map((e, i) => ({
    exerciseId: e.id, exerciseName: e.name, sets: 3, repMin: 6, repMax: 10, restSec: 180, _slot: i,
  })),
}]);

/** Default evidence: a productive incumbent with real history. */
const productive = () => ({
  excluded: false, swappedAwayCount: 0, equipmentLost: false,
  autoEligible: true, sessions: 8, progressing: true,
});

const run = (generated, incumbents, evidence = productive(), extra = {}) => applyContinuity({
  generated, incumbents, familyOf,
  evidenceFor: () => evidence,
  context: { epochBlocks: 0 },
  isRebuild: true,
  ...extra,
});

// ---------------------------------------------------------------------------

describe('C16-5 a productive exercise is not replaced for a marginally better one', () => {
  test('the incumbent survives when the generator picks a sibling', () => {
    // The generator chose the chin-up; the user has been progressing on the
    // pulldown. Both fill the same vertical-pull slot, so there is no
    // programming reason to change and history is the deciding fact.
    const { workouts, decisions } = run(generatedWith(EX.chinUp), [incumbent(EX.pulldown)]);
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.pulldown.id);
    expect(workouts[0].exercises[0].exerciseName).toBe(EX.pulldown.name);
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.RETAINED);
    expect(decisions[0].reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
    // The receipt records what it was kept INSTEAD of, so "why is this
    // still here" is answerable without guessing.
    expect(decisions[0].insteadOfName).toBe(EX.chinUp.name);
  });

  test('the slot the incumbent lands in keeps the GENERATOR\'s programming', () => {
    // Continuity swaps the exercise identity back, never the dose. If it
    // touched sets or reps it would be silently changing what the plan
    // delivers, which is the coach engine's decision and not this module's.
    const gen = generatedWith(EX.chinUp);
    gen[0].exercises[0].sets = 5;
    gen[0].exercises[0].repMin = 8;
    gen[0].exercises[0].repMax = 12;
    const { workouts } = run(gen, [incumbent(EX.pulldown)]);
    expect(workouts[0].exercises[0].sets).toBe(5);
    expect(workouts[0].exercises[0].repMin).toBe(8);
    expect(workouts[0].exercises[0].repMax).toBe(12);
  });

  test('an incumbent is never reused for two slots', () => {
    const { workouts } = run(
      generatedWith(EX.chinUp, EX.pulldown), [incumbent(EX.pulldown)],
    );
    const ids = workouts[0].exercises.map(e => e.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('a slot with no incumbent doing that job is simply new', () => {
    const { workouts, decisions } = run(generatedWith(EX.row), [incumbent(EX.pulldown)]);
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.row.id);
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.NEW);
    expect(decisions[0].reason).toBeNull();
  });

  test('an exercise the generator re-picked anyway is still recorded as retained', () => {
    const { decisions } = run(generatedWith(EX.pulldown), [incumbent(EX.pulldown)]);
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.RETAINED);
  });
});

describe('C16-5 continuity never overrides what the user told us', () => {
  test('an EXCLUDED incumbent is replaced, however productive it is', () => {
    const { workouts, decisions } = run(
      generatedWith(EX.chinUp), [incumbent(EX.pulldown)],
      { ...productive(), excluded: true },
    );
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.chinUp.id);
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.REPLACED);
    expect(decisions[0].reason).toBe(SLOT_REASON.USER_EXCLUDED);
  });

  test('an incumbent the user has repeatedly swapped away is replaced', () => {
    const { decisions } = run(
      generatedWith(EX.chinUp), [incumbent(EX.pulldown)],
      { ...productive(), swappedAwayCount: 2 },
    );
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.REPLACED);
    expect(decisions[0].reason).toBe(SLOT_REASON.USER_SWAPPED_AWAY);
  });

  test('ONE swap is not a pattern and does not trigger a replacement', () => {
    const { decisions } = run(
      generatedWith(EX.chinUp), [incumbent(EX.pulldown)],
      { ...productive(), swappedAwayCount: 1 },
    );
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.RETAINED);
  });
});

describe('C16-5 continuity never keeps something that is no longer valid', () => {
  test('an incumbent the user no longer has the equipment for is replaced', () => {
    const { workouts, decisions } = run(
      generatedWith(EX.dbBench), [incumbent(EX.bench)],
      { ...productive(), equipmentLost: true },
    );
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.dbBench.id);
    expect(decisions[0].reason).toBe(SLOT_REASON.EQUIPMENT_LOST);
  });

  test('an incumbent the generator may no longer pick at all is replaced', () => {
    const { decisions } = run(
      generatedWith(EX.chinUp), [incumbent(EX.pulldown)],
      { ...productive(), autoEligible: false },
    );
    expect(decisions[0].reason).toBe(SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE);
  });
});

describe('C16-5 a first plan is not a rebuild', () => {
  test('with no incumbents every slot is new and nothing is substituted', () => {
    const gen = generatedWith(EX.chinUp, EX.row);
    const { workouts, decisions } = applyContinuity({
      generated: gen, incumbents: [], familyOf, isRebuild: true,
    });
    expect(workouts[0].exercises.map(e => e.exerciseId)).toEqual([EX.chinUp.id, EX.row.id]);
    expect(decisions.every(d => d.outcome === SLOT_OUTCOME.NEW)).toBe(true);
  });

  test('isRebuild false leaves the generated plan untouched even WITH incumbents', () => {
    // Initial generation must follow the initial-plan rules alone -
    // staples and coverage - with no continuity bias applied.
    const gen = generatedWith(EX.chinUp);
    const { workouts, decisions } = applyContinuity({
      generated: gen, incumbents: [incumbent(EX.pulldown)], familyOf, isRebuild: false,
    });
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.chinUp.id);
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.NEW);
  });
});

describe('C16-5 continuity cannot change what the plan covers', () => {
  test('a retained exercise always shares the muscle AND family of the slot', () => {
    // The guarantee that makes substitution safe. If continuity could put a
    // pulldown into a row slot it would silently break the coverage job 3
    // exists to enforce.
    const { workouts } = run(
      generatedWith(EX.chinUp, EX.row),
      [incumbent(EX.pulldown), incumbent(EX.bench)],
    );
    for (const [i, ex] of workouts[0].exercises.entries()) {
      const generatedEx = [EX.chinUp, EX.row][i];
      const got = byId.get(ex.exerciseId);
      expect(got.muscle).toBe(generatedEx.muscle);
      expect(got.family).toBe(generatedEx.family);
    }
  });

  test('the exercise count per session is unchanged', () => {
    const gen = generatedWith(EX.chinUp, EX.row);
    const { workouts } = run(gen, [incumbent(EX.pulldown)]);
    expect(workouts[0].exercises.length).toBe(gen[0].exercises.length);
  });

  test('an incumbent from a different muscle can never fill the slot', () => {
    const { workouts } = run(generatedWith(EX.chinUp), [incumbent(EX.bench)]);
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.chinUp.id);
  });
});

describe('C16-5 elective variation is not initiated by a rebuild', () => {
  test('an exercise with no history is kept, not rotated for novelty', () => {
    const { decisions } = run(
      generatedWith(EX.chinUp), [incumbent(EX.pulldown)],
      { excluded: false, swappedAwayCount: 0, equipmentLost: false, autoEligible: true, sessions: 0 },
    );
    expect(decisions[0].outcome).toBe(SLOT_OUTCOME.RETAINED);
    expect(decisions[0].reason).toBe(SLOT_REASON.INSUFFICIENT_HISTORY);
  });

  test('a rebuild claims no epoch history, so systematic variation can never fire', () => {
    // A profile change is not a block boundary. Passing an epoch count here
    // would let a rebuild trigger the refresh the amendment reserves for
    // the review point.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../planAutoGen.js'), 'utf8');
    expect(src).toMatch(/context: \{ epochBlocks: 0 \}/);
  });

  test('a reviewed mature-epoch replacement is consumed despite rebuild context zero', () => {
    const reviewed = {
      verdict: 'replace', reason: SLOT_REASON.SYSTEMATIC_VARIATION,
    };
    const { workouts, decisions } = run(
      generatedWith(EX.chinUp), [incumbent(EX.pulldown)], productive(),
      { verdictFor: () => reviewed },
    );
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.chinUp.id);
    expect(decisions[0]).toMatchObject({
      outcome: SLOT_OUTCOME.REPLACED,
      reason: SLOT_REASON.SYSTEMATIC_VARIATION,
    });
  });

  test('a reviewed replacement survives when generation changes the muscle angle', () => {
    const reviewed = {
      verdict: 'replace', reason: SLOT_REASON.SYSTEMATIC_VARIATION,
    };
    const { workouts, decisions } = run(
      generatedWith(EX.incline), [incumbent(EX.bench)], productive(),
      { verdictFor: () => reviewed },
    );
    expect(workouts[0].exercises[0].exerciseId).toBe(EX.incline.id);
    expect(decisions[0]).toMatchObject({
      previousExerciseId: EX.bench.id,
      exerciseId: EX.incline.id,
      outcome: SLOT_OUTCOME.REPLACED,
      reason: SLOT_REASON.SYSTEMATIC_VARIATION,
    });
  });

  test('a reviewed prescription change reaches the generated row', () => {
    const { workouts, decisions } = run(
      generatedWith(EX.dbBench), [incumbent(EX.bench)], productive(),
      { verdictFor: () => ({
        verdict: 'keep_with_prescription_change',
        reason: SLOT_REASON.PLATEAU,
        prescriptionChange: { repMin: 15, repMax: 20 },
      }) },
    );
    expect(workouts[0].exercises[0]).toMatchObject({
      exerciseId: EX.bench.id, repMin: 15, repMax: 20,
    });
    expect(decisions[0].prescriptionChange).toEqual({ repMin: 15, repMax: 20 });
  });
});

describe('C16-5 the change receipt is machine-readable', () => {
  test('every decision names an outcome and, where one applies, a reason code', () => {
    const { decisions } = run(
      generatedWith(EX.chinUp, EX.row), [incumbent(EX.pulldown)],
    );
    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(Object.values(SLOT_OUTCOME)).toContain(d.outcome);
      if (d.outcome !== SLOT_OUTCOME.NEW) {
        expect(Object.values(SLOT_REASON)).toContain(d.reason);
      }
    }
  });

  test('the summary counts what actually happened', () => {
    const { decisions } = run(
      generatedWith(EX.chinUp, EX.row), [incumbent(EX.pulldown)],
    );
    expect(summariseDecisions(decisions)).toEqual({
      // Round 4 (Q2): noLongerIn joined the summary - every incumbent
      // is accounted for, including ones matching no rebuilt slot.
      retained: 1, replaced: 0, added: 1, noLongerIn: 0, total: 2,
    });
  });

  test('reasons come from the engine, never from reading exercise names', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../exercise/continuity.js'), 'utf8');
    const code = src.slice(src.indexOf('export const SLOT_OUTCOME'));
    // No prose, no name inspection: the module assembles evidence and
    // applies a verdict, it does not author explanations.
    expect(code).not.toMatch(/exerciseName\.(includes|match|toLowerCase)/);
    expect(code).toMatch(/slotVerdict\(/);
  });
});
