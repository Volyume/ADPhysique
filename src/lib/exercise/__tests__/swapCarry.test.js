/**
 * swapCarry.test.js -- D219 lane A4 (design 4.12, register D219 "Addition"
 * 2026-10-04: "When people swap in a workout can they get an option to swap as
 * a one off or permanent. Also when doing swaps the new exercise should have
 * the same sets and reps ideally so we don't misplace load").
 *
 * What this suite pins and why. Every behaviour below is NEW with the lane, and
 * each test fails on the code before it (the module did not exist; the logger
 * took the new exercise's own rep band, the plan path recalibrated reps by
 * tier):
 *
 *  - THE PRESCRIPTION A SWAP CARRIES. The slot keeps its sets, its rep range and
 *    its other fields; the load is cleared (Campaign 16 job 7, never an old
 *    exercise's number); rest follows the new exercise only where the rest was
 *    still the outgoing tier's default (a rest the person set stays).
 *  - THE CAPS. The swapped-in exercise is checked against the per-exercise caps
 *    like any other (a compound's 4 sets are 3 on an isolation exercise, 4 on a
 *    focus muscle's), and only for the plan the new planner built.
 *  - THE PLANNER'S MODEL OF THE SLOT. A permanent swap writes the new exercise's
 *    muscle, kind and curated credits into the plan's slot facts, never edits
 *    the facts of a plan the new planner did not build, never mutates its input,
 *    keeps the old exercise's entry (so a swap back is an exact inverse), and
 *    keeps an entry the plan already holds for the new exercise.
 *  - THE NOTE. A swap into another primary muscle says what moves, in calm
 *    words that describe and never tell anyone to train more or less (D204).
 *  - THE ONE-OFF ON THE PLAN SCREEN. A "just this session" swap made on the
 *    routine screen is applied to the rows of the workout started from there.
 */

const { REP_RANGES, REST_SEC, STRENGTH_REST } = require('../prescription');
const { catalogueCredits } = require('../../plan/catalogue');
const { SETS_PER_EXERCISE } = require('../../plan/science');
const { SWAP_SCOPE } = require('../swapScope');
const {
  slotMuscleOf, slotFactsFor, restAfterSwap, carryPrescription, carriedSetCount,
  planFactsAfterSwap, slotMuscleChange, swapMuscleNote, swapMuscleDoneNote,
  applySessionSwaps, SWAP_SCOPE_OPTIONS, swapScopeHint,
} = require('../swapCarry');

const ex = (id, name, primaryMuscle, equipmentCategory, compoundIsolation, extra = {}) => (
  { id, name, primaryMuscle, equipmentCategory, compoundIsolation, ...extra }
);
const SQUAT = ex('squat', 'Barbell Back Squat', 'quads', 'barbell', 'compound');
const LEG_EXT = ex('legext', 'Leg Extension', 'quads', 'machine_selectorised', 'isolation',
  { defaultRepMin: 10, defaultRepMax: 20 });
const LEG_PRESS = ex('legpress', 'Leg Press', 'quads', 'machine_plate_loaded', 'compound');
const ABDUCTION = ex('abduct', 'Hip Abduction Machine', 'glutes', 'machine_selectorised', 'isolation');
const BENCH = ex('bench', 'Barbell Bench Press', 'chest', 'barbell', 'compound');
const LATERAL = ex('lat', 'Cable Lateral Raise', 'shoulders', 'cable', 'isolation');

describe('the prescription a swap carries (design 4.12)', () => {
  const prev = {
    id: 're1', routineId: 'r1', exerciseId: 'squat', exerciseName: 'Barbell Back Squat',
    recommendedSets: 4, recommendedRepsMin: 6, recommendedRepsMax: 10,
    restSeconds: REST_SEC.heavy_compound, startingWeight: 100, notes: 'brace',
    supersetGroupId: null,
  };

  test('the slot keeps its sets and reps, never the new exercise\'s own band; the old load is cleared', () => {
    const out = carryPrescription(prev, LEG_EXT, SQUAT);
    expect(out).toMatchObject({
      id: 're1', routineId: 'r1', exerciseId: 'legext', exerciseName: 'Leg Extension',
      recommendedSets: 4, recommendedRepsMin: 6, recommendedRepsMax: 10,
      startingWeight: null, notes: 'brace',
    });
    // The isolation exercise's own band is 10 to 20: it must not be taken.
    expect(out.recommendedRepsMin).not.toBe(LEG_EXT.defaultRepMin);
    expect(out.recommendedRepsMax).not.toBe(LEG_EXT.defaultRepMax);
  });

  test('rest follows the new exercise when it was the outgoing tier\'s default', () => {
    expect(carryPrescription(prev, LEG_EXT, SQUAT).restSeconds).toBe(REST_SEC.isolation);
  });

  test('a rest the person set stays, and so does a rest within the same tier', () => {
    expect(carryPrescription({ ...prev, restSeconds: 200 }, LEG_EXT, SQUAT).restSeconds).toBe(200);
    expect(carryPrescription(prev, LEG_PRESS, SQUAT).restSeconds).toBe(REST_SEC.machine);
    expect(restAfterSwap({ oldExercise: SQUAT, newExercise: BENCH, restSeconds: REST_SEC.heavy_compound }))
      .toBe(REST_SEC.heavy_compound);
  });

  test('no rest of its own stays none (the person\'s default rest is theirs), and the strength default is read as a default', () => {
    expect(restAfterSwap({ oldExercise: SQUAT, newExercise: LEG_EXT, restSeconds: null })).toBeNull();
    expect(restAfterSwap({ oldExercise: SQUAT, newExercise: LEG_EXT, restSeconds: STRENGTH_REST.heavy_compound }))
      .toBe(REST_SEC.isolation);
  });

  test('an old exercise whose tier is unknown leaves the rest alone', () => {
    const broken = { id: 'x', name: 'Gone', primaryMuscle: null, equipmentCategory: null, compoundIsolation: null };
    expect(restAfterSwap({ oldExercise: broken, newExercise: LEG_EXT, restSeconds: 180 })).toBe(180);
  });

  test('no previous row, nothing to carry', () => {
    expect(carryPrescription(null, LEG_EXT, SQUAT)).toBeNull();
  });

  test('the premise: the default bands differ by tier, so reading them would have changed the reps', () => {
    expect(REP_RANGES.isolation).not.toEqual(REP_RANGES.heavy_compound);
  });
});

describe('the swapped-in exercise is checked against the caps like any other (design 4.12)', () => {
  test('a plan the new planner did not build carries the slot\'s number exactly', () => {
    expect(carriedSetCount({ served: 5, newExercise: LEG_EXT, capped: false })).toBe(5);
  });

  test('a compound\'s 4 sets are 3 on an isolation exercise, 4 on a compound, 4 for a focus muscle\'s isolation', () => {
    expect(carriedSetCount({ served: 4, newExercise: LEG_EXT, capped: true })).toBe(SETS_PER_EXERCISE.capIsolation);
    expect(carriedSetCount({ served: 4, newExercise: LEG_PRESS, capped: true })).toBe(SETS_PER_EXERCISE.capCompound);
    expect(carriedSetCount({ served: 4, newExercise: LEG_EXT, capped: true, focus: true })).toBe(SETS_PER_EXERCISE.capCompound);
  });

  test('a number under the cap is carried as it is, and no number carries nothing', () => {
    expect(carriedSetCount({ served: 2, newExercise: LEG_EXT, capped: true })).toBe(2);
    expect(carriedSetCount({ served: undefined, newExercise: LEG_EXT, capped: true })).toBeNull();
    expect(carriedSetCount({ served: 0, newExercise: LEG_EXT, capped: true })).toBeNull();
  });
});

describe('the planner\'s model of a swapped-in slot (design 4.12, lane brief 3)', () => {
  test('the muscle is the volume counter\'s: lower case, the legacy "shoulders" as side delts, snake_case rows too', () => {
    expect(slotMuscleOf(LATERAL)).toBe('side_delts');
    expect(slotMuscleOf({ primary_muscle: 'Quads' })).toBe('quads');
    expect(slotMuscleOf({ name: 'Custom', primaryMuscle: '' })).toBeNull();
  });

  test('muscle, the generator\'s kind key and the curated credits, or {} for a name the catalogue does not list', () => {
    expect(slotFactsFor(BENCH)).toEqual({
      muscle: 'chest', kind: 'heavy_compound', credits: catalogueCredits('chest', 'Barbell Bench Press'),
    });
    expect(Object.keys(slotFactsFor(BENCH).credits).length).toBeGreaterThan(0);
    expect(slotFactsFor(LEG_EXT)).toEqual({ muscle: 'quads', kind: 'isolation', credits: {} });
    expect(slotFactsFor(ex('own', 'My Own Press', 'chest', 'barbell', 'compound')).credits).toEqual({});
    expect(slotFactsFor(ex('nomuscle', 'No Muscle', null, 'barbell', 'compound'))).toBeNull();
  });

  const FACTS = {
    version: 2,
    roles: { quads: 'standard' },
    slots: { r1: { squat: { muscle: 'quads', kind: 'heavy_compound', credits: { glutes: 0.5 } } } },
  };

  test('a permanent swap writes the new exercise\'s slot fact and keeps the old one', () => {
    const before = JSON.stringify(FACTS);
    const out = planFactsAfterSwap(FACTS, { routineId: 'r1', newExercise: ABDUCTION });
    expect(out.changed).toBe(true);
    expect(out.slot).toEqual({ muscle: 'glutes', kind: 'isolation', credits: {} });
    expect(out.facts.slots.r1.abduct).toEqual({ muscle: 'glutes', kind: 'isolation', credits: {} });
    // The old exercise's entry stays, so swapping back is an exact inverse.
    expect(out.facts.slots.r1.squat).toEqual(FACTS.slots.r1.squat);
    // Everything else is kept, and the input is never mutated.
    expect(out.facts.roles).toEqual(FACTS.roles);
    expect(JSON.stringify(FACTS)).toBe(before);
  });

  test('an entry the plan already holds for the new exercise is kept, not re-derived', () => {
    const planned = { ...FACTS, slots: { r1: { ...FACTS.slots.r1, abduct: { muscle: 'quads', kind: 'machine', credits: { glutes: 0.5 } } } } };
    const out = planFactsAfterSwap(planned, { routineId: 'r1', newExercise: ABDUCTION });
    expect(out.changed).toBe(false);
    expect(out.facts).toBe(planned);
    expect(out.slot).toEqual({ muscle: 'quads', kind: 'machine', credits: { glutes: 0.5 } });
  });

  test('facts that are not the new planner\'s are never edited', () => {
    for (const facts of [null, undefined, {}, { version: 1, slots: {} }]) {
      const out = planFactsAfterSwap(facts, { routineId: 'r1', newExercise: ABDUCTION });
      expect(out.changed).toBe(false);
      expect(out.facts).toBe(facts);
    }
  });

  test('a routine with no slots yet gets its first entry', () => {
    const out = planFactsAfterSwap({ version: 2 }, { routineId: 'r9', newExercise: BENCH });
    expect(out.facts.slots.r9.bench.muscle).toBe('chest');
  });
});

describe('a swap into another primary muscle says what moves (design 4.12; D204: describes, never advises)', () => {
  test('no change when the muscle is the same, or when either is unknown', () => {
    expect(slotMuscleChange({ facts: null, routineId: 'r1', oldExercise: LEG_EXT, newExercise: LEG_PRESS })).toBeNull();
    expect(slotMuscleChange({ facts: null, routineId: 'r1', oldExercise: LEG_EXT, newExercise: ex('n', 'N', null, 'cable', 'isolation') })).toBeNull();
  });

  test('quads to glutes, by the corpus when the plan holds no fact', () => {
    expect(slotMuscleChange({ facts: null, routineId: 'r1', oldExercise: LEG_EXT, newExercise: ABDUCTION }))
      .toEqual({ from: 'quads', to: 'glutes' });
  });

  test('the plan\'s own fact for the old exercise is the "from" (a lunge planned under glutes)', () => {
    const facts = { version: 2, slots: { r1: { legext: { muscle: 'glutes', kind: 'isolation', credits: {} } } } };
    expect(slotMuscleChange({ facts, routineId: 'r1', oldExercise: LEG_EXT, newExercise: ABDUCTION })).toBeNull();
  });

  test('the note is the design\'s sentence, and the after-swap note says the same in the present tense', () => {
    expect(swapMuscleNote({ from: 'quads', to: 'glutes' }))
      .toBe("This moves this slot's sets from quads to glutes for the rest of the plan.");
    expect(swapMuscleDoneNote({ from: 'quads', to: 'side_delts' }))
      .toBe("This slot's sets now count for side delts, not quads.");
  });

  test('the copy stays calm: British English, no em dash, nothing that tells anyone to train more or less', () => {
    const copy = [
      swapMuscleNote({ from: 'quads', to: 'glutes' }),
      swapMuscleDoneNote({ from: 'quads', to: 'glutes' }),
      ...SWAP_SCOPE_OPTIONS.map((o) => o.label),
      ...[SWAP_SCOPE.SESSION, SWAP_SCOPE.PROGRAMME].flatMap((scope) => ['workout', 'routine'].map((surface) => swapScopeHint(scope, { fromName: 'Leg Extension', surface }))),
    ].join(' ');
    expect(copy).not.toMatch(/—/);
    expect(copy).not.toMatch(/\b(should|must|need to|have to|more sets|fewer sets|add more|do more|do less|train more|train less|overtrain)/i);
  });
});

describe('the two choices, in words', () => {
  test('the options are "Just this session" and "From now on", mapped to the two scopes', () => {
    expect(SWAP_SCOPE_OPTIONS).toEqual([
      { label: 'Just this session', value: SWAP_SCOPE.SESSION },
      { label: 'From now on', value: SWAP_SCOPE.PROGRAMME },
    ]);
  });

  test('each hint names the exercise it is about and says what happens to the plan', () => {
    expect(swapScopeHint(SWAP_SCOPE.SESSION, { fromName: 'Leg Extension', surface: 'workout' }))
      .toBe('Your plan keeps Leg Extension. Sets and reps stay the same.');
    expect(swapScopeHint(SWAP_SCOPE.PROGRAMME, { fromName: 'Leg Extension', surface: 'workout' }))
      .toBe('Leg Extension is replaced in your plan. Sets and reps stay the same.');
    expect(swapScopeHint(SWAP_SCOPE.SESSION, { fromName: 'Leg Extension', surface: 'routine' }))
      .toBe('Used when you start this workout from here. Your plan keeps Leg Extension.');
    expect(swapScopeHint(SWAP_SCOPE.PROGRAMME, { fromName: 'Leg Extension', surface: 'routine' }))
      .toBe('Leg Extension is replaced in your plan from now on. Sets and reps stay the same.');
  });
});

describe('a one-off made on the plan screen reaches the workout started from there', () => {
  const rows = [
    { exercise: SQUAT, routineExercise: { id: 're1', exerciseId: 'squat', recommendedSets: 4, recommendedRepsMin: 6, recommendedRepsMax: 10, restSeconds: 180, startingWeight: 100 } },
    { exercise: BENCH, routineExercise: { id: 're2', exerciseId: 'bench', recommendedSets: 3, recommendedRepsMin: 6, recommendedRepsMax: 10, restSeconds: 180 } },
  ];

  test('the swapped row carries the slot\'s sets and reps; every other row is untouched', () => {
    const out = applySessionSwaps(rows, { re1: { exercise: LEG_EXT } });
    expect(out[0].exercise).toBe(LEG_EXT);
    expect(out[0].routineExercise).toMatchObject({
      id: 're1', exerciseId: 'legext', recommendedSets: 4, recommendedRepsMin: 6, recommendedRepsMax: 10,
      startingWeight: null, restSeconds: REST_SEC.isolation,
    });
    expect(out[1]).toBe(rows[1]);
  });

  test('the plan\'s own rows are never mutated, and a choice for a row that has gone changes nothing', () => {
    const before = JSON.stringify(rows);
    applySessionSwaps(rows, { re1: { exercise: LEG_EXT } });
    expect(JSON.stringify(rows)).toBe(before);
    expect(applySessionSwaps(rows, { gone: { exercise: LEG_EXT } })).toEqual(rows);
    expect(applySessionSwaps(rows, null)).toBe(rows);
    expect(applySessionSwaps(null, { re1: { exercise: LEG_EXT } })).toEqual([]);
  });
});
