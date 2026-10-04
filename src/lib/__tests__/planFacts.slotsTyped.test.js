/**
 * D219 lane B7 (lead rulings 2 and 6): what a plan the new planner built tells
 * the reader about its own slots, and the set counts the person typed
 * (design 4.3 and 9; register D219 build rulings 1 to 3).
 *
 * What this suite pins and why:
 *
 *  - SLOT FACTS. The planner decides which muscle a slot trains, how heavy its
 *    exercise is and what it credits other muscles (its catalogue role), and
 *    stores that per routine and exercise in facts.slots. The reader must use
 *    the planner's own model, not re-derive it from the corpus: the corpus lists
 *    the Walking Lunge as a quads exercise, the planner plans it under glutes,
 *    so a reader that re-derived would serve the glutes' lunge sets out of the
 *    quads' weekly target. With the fact present buildPlanSessions uses muscle,
 *    kind and credits from it; an exercise with no entry (a swapped-in one)
 *    keeps today's derivation, field by field.
 *  - TYPED SETS. A set count the person typed is stored in facts.typed by
 *    routine exercise id; buildPlanSessions hands it to prescribe as the slot's
 *    typedSets, so it is served as typed in every week (no climb on top of
 *    it), even above the caps that bind the planner, and the rest of the
 *    muscle's sets are placed around it.
 * Each of these fails on the code before this lane, whose buildPlanSessions
 * reads neither facts.slots nor facts.typed.
 */

jest.mock('../database', () => ({
  getSessionAdjustmentSignals: jest.fn(),
  getLatestCoachOutput: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getAdaptiveLandmarkHistory: jest.fn(),
  getWeeklyVolumeByMuscle: jest.fn(),
  getRecentAdaptationEvents: jest.fn(),
  createAdaptationEvent: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getMesocycleWeekById: jest.fn(),
  getRoutineById: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getProgrammeById: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const { computeWeeklySessionAllocation } = require('../coachApply');
const { prescribeWeek } = require('../plan/prescribe');
const { SETS_PER_EXERCISE } = require('../plan/science');
const { buildPlanSessions } = require('../sessionAdjustments');

const exercise = (id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles = []) => (
  { id, name: id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles }
);
const row = (reId, ex, extra = {}) => ({
  routineExercise: { id: reId, exerciseId: ex.id, recommendedSets: 2, groupKind: null, ...extra },
  exercise: ex,
});

// The corpus's own words for these two: a hip thrust is a glutes row, and the
// Walking Lunge a QUADS row that credits the glutes and the hamstrings.
const HIP_THRUST = exercise('Barbell Hip Thrust', 'glutes', 'barbell', 'compound', ['quads']);
const LUNGE = exercise('Walking Lunge', 'quads', 'dumbbell', 'compound', ['glutes', 'hamstrings']);
const SQUAT = exercise('Barbell Back Squat', 'quads', 'barbell', 'compound', ['glutes', 'hamstrings']);
const CURL = exercise('Seated Leg Curl', 'hamstrings', 'machine_selectorised', 'isolation');

// A glutes session and a quads session, as the planner would save them.
const ROUTINES = [
  { routine: { id: 'r-glutes' }, rows: [row('re-thrust', HIP_THRUST), row('re-lunge', LUNGE)] },
  { routine: { id: 'r-quads' }, rows: [row('re-squat', SQUAT), row('re-curl', CURL)] },
];
const SLOT_FACTS = {
  'r-glutes': {
    'Barbell Hip Thrust': { muscle: 'glutes', kind: 'heavy_compound', credits: { hamstrings: 0.5 } },
    'Walking Lunge': { muscle: 'glutes', kind: 'mod_compound', credits: { quads: 0.5 } },
  },
  'r-quads': {
    'Barbell Back Squat': { muscle: 'quads', kind: 'heavy_compound', credits: { glutes: 0.5, adductors: 0.5 } },
    'Seated Leg Curl': { muscle: 'hamstrings', kind: 'isolation', credits: {} },
  },
};
const FACTS = { version: 2, slots: SLOT_FACTS };
const slotsOf = (sessions) => Object.fromEntries(sessions.flatMap((s) => s.slots).map((x) => [x.id, x]));

describe('slot facts: the reader uses the planner\'s own model (lead ruling 2)', () => {
  test('a Walking Lunge planned under glutes is a glutes slot, with the planner\'s credits and kind', () => {
    const slots = slotsOf(buildPlanSessions(ROUTINES, FACTS));
    expect(slots['re-lunge']).toMatchObject({ muscle: 'glutes', kind: 'mod_compound', credits: { quads: 0.5 } });
    expect(slots['re-thrust']).toMatchObject({ muscle: 'glutes', kind: 'heavy_compound', credits: { hamstrings: 0.5 } });
    expect(slots['re-squat'].credits).toEqual({ glutes: 0.5, adductors: 0.5 });
  });

  test('without the fact the same row is derived from the corpus: a quads slot (today\'s behaviour)', () => {
    const slots = slotsOf(buildPlanSessions(ROUTINES, { version: 2 }));
    expect(slots['re-lunge'].muscle).toBe('quads');
    expect(slots['re-lunge'].credits).toEqual({ glutes: 0.5, hamstrings: 0.5 });
  });

  test('the lunge is served out of the glutes\' weekly sets, in every week, and the quads\' sets go to the quads exercises', () => {
    const ctx = { facts: FACTS, sessions: buildPlanSessions(ROUTINES, FACTS) };
    const todays = (r) => r.rows.map((x) => ({
      exerciseId: x.exercise.id, primaryMuscle: x.exercise.primaryMuscle,
      recommendedSets: x.routineExercise.recommendedSets, slotId: x.routineExercise.id,
    }));
    for (const weekTarget of [{ glutes: 4, quads: 3 }, { glutes: 6, quads: 4 }, { glutes: 8, quads: 4 }]) {
      const served = {};
      for (const r of ROUTINES) Object.assign(served, computeWeeklySessionAllocation(todays(r), weekTarget, weekTarget, ctx));
      // The glutes' target is spent on the thrust and the lunge, the quads' on the squat alone.
      expect(served['Barbell Hip Thrust'] + served['Walking Lunge']).toBe(weekTarget.glutes);
      expect(served['Barbell Back Squat']).toBe(weekTarget.quads);
      expect(served['Walking Lunge']).toBeLessThanOrEqual(SETS_PER_EXERCISE.capCompound);
    }
  });

  test('the premise: re-derived from the corpus, the same plan serves the glutes 2 sets short and gives the quads the lunge', () => {
    const week = { glutes: 8, quads: 4 };
    const glutesServed = (facts) => {
      const { sets } = prescribeWeek({ sessions: buildPlanSessions(ROUTINES, facts), weekTargets: week, facts: {} });
      return sets['re-thrust'] + sets['re-lunge'];
    };
    expect(glutesServed(FACTS)).toBe(8);
    expect(glutesServed({ version: 2 })).toBeLessThan(8);
  });

  test('an exercise with no entry (one swapped in) keeps today\'s derivation, while its neighbours keep the planner\'s', () => {
    const swapped = [{ routine: { id: 'r-glutes' }, rows: [row('re-thrust', HIP_THRUST), row('re-new', SQUAT)] }];
    const slots = slotsOf(buildPlanSessions(swapped, FACTS));
    expect(slots['re-thrust'].muscle).toBe('glutes');
    // 'Barbell Back Squat' has an entry under r-quads, not under r-glutes: this routine has none for it.
    expect(slots['re-new']).toMatchObject({ muscle: 'quads', kind: 'heavy_compound', credits: { glutes: 0.5, hamstrings: 0.5 } });
  });

  test('the fact is per routine: the same exercise in two routines carries each routine\'s own entry', () => {
    const twice = [
      { routine: { id: 'a' }, rows: [row('re-a', LUNGE)] },
      { routine: { id: 'b' }, rows: [row('re-b', LUNGE)] },
    ];
    const facts = { version: 2, slots: {
      a: { 'Walking Lunge': { muscle: 'glutes', kind: 'mod_compound', credits: { quads: 0.5 } } },
      b: { 'Walking Lunge': { muscle: 'quads', kind: 'mod_compound', credits: {} } },
    } };
    const slots = slotsOf(buildPlanSessions(twice, facts));
    expect(slots['re-a'].muscle).toBe('glutes');
    expect(slots['re-b'].muscle).toBe('quads');
    expect(slots['re-b'].credits).toEqual({});
  });

  test('an incomplete or unusable entry falls back field by field, never to nothing', () => {
    const facts = { version: 2, slots: { 'r-glutes': {
      'Barbell Hip Thrust': { muscle: 'glutes' },
      'Walking Lunge': { muscle: 42, kind: '', credits: 'lots' },
    } } };
    const slots = slotsOf(buildPlanSessions([ROUTINES[0]], facts));
    expect(slots['re-thrust']).toMatchObject({ muscle: 'glutes', kind: 'heavy_compound', credits: { quads: 0.5 } });
    expect(slots['re-lunge']).toMatchObject({ muscle: 'quads', kind: 'mod_compound', credits: { glutes: 0.5, hamstrings: 0.5 } });
  });

  test('the focus flag follows the planner\'s muscle: a glutes focus makes the glutes\' lunge a focus slot', () => {
    const facts = { ...FACTS, roles: { glutes: 'focus' } };
    const slots = slotsOf(buildPlanSessions(ROUTINES, facts));
    expect(slots['re-lunge'].focus).toBe(true);
    expect(slots['re-thrust'].focus).toBe(true);
    expect(slots['re-squat'].focus).toBe(false);
  });

  test('facts that are null, or carry no slots, change nothing', () => {
    for (const facts of [null, undefined, {}, { slots: null }, { slots: [] }, { slots: { 'r-glutes': null } }]) {
      const slots = slotsOf(buildPlanSessions(ROUTINES, facts));
      expect(slots['re-lunge'].muscle).toBe('quads');
    }
  });
});

describe('typed set counts: served as typed in every week (lead ruling 6, design 4.3)', () => {
  const sessionsWith = (typed) => buildPlanSessions(ROUTINES, { ...FACTS, ...(typed === undefined ? {} : { typed }) });

  test('facts.typed reaches prescribe as the slot\'s typedSets, by routine exercise id, and nowhere else', () => {
    const slots = slotsOf(sessionsWith({ 're-lunge': 5 }));
    expect(slots['re-lunge'].typedSets).toBe(5);
    for (const id of ['re-thrust', 're-squat', 're-curl']) expect(slots[id]).not.toHaveProperty('typedSets');
  });

  test('a typed 5 is served as 5 in every week of the block, above the cap that binds the planner', () => {
    expect(SETS_PER_EXERCISE.capCompound).toBeLessThan(5);
    const facts = { ...FACTS, typed: { 're-thrust': 5 } };
    const sessions = buildPlanSessions(ROUTINES, facts);
    const targets = [[6, 4], [8, 4], [9, 5], [10, 6], [11, 6]];
    targets.forEach(([glutes, quads], i) => {
      const { sets } = prescribeWeek({ sessions, weekTargets: { glutes, quads }, facts: {} });
      expect(sets['re-thrust']).toBe(5);
      // The week's other glutes sets are placed around it, under the planner's caps.
      expect(sets['re-lunge']).toBeLessThanOrEqual(SETS_PER_EXERCISE.capCompound);
      expect(sets['re-lunge']).toBeGreaterThanOrEqual(1);
      expect(i).toBeGreaterThanOrEqual(0);
    });
  });

  test('through the reader the screens and the logger share, the typed count is the number served, every week 1 to 5', () => {
    const facts = { ...FACTS, typed: { 're-lunge': 5 } };
    const ctx = { facts, sessions: buildPlanSessions(ROUTINES, facts) };
    const todays = ROUTINES[0].rows.map((x) => ({
      exerciseId: x.exercise.id, primaryMuscle: x.exercise.primaryMuscle,
      recommendedSets: x.routineExercise.recommendedSets, slotId: x.routineExercise.id,
    }));
    for (const glutes of [6, 8, 10, 12, 14]) {
      const served = computeWeeklySessionAllocation(todays, { glutes }, { glutes: 6 }, ctx);
      expect(served['Walking Lunge']).toBe(5);
    }
  });

  test('without the mark the same exercise is held to the cap, so the typed count is what lifts it', () => {
    const ctx = { facts: FACTS, sessions: buildPlanSessions(ROUTINES, FACTS) };
    const todays = ROUTINES[0].rows.map((x) => ({
      exerciseId: x.exercise.id, primaryMuscle: x.exercise.primaryMuscle,
      recommendedSets: x.routineExercise.recommendedSets, slotId: x.routineExercise.id,
    }));
    const served = computeWeeklySessionAllocation(todays, { glutes: 14 }, { glutes: 6 }, ctx);
    expect(served['Walking Lunge']).toBeLessThanOrEqual(SETS_PER_EXERCISE.capCompound);
  });

  test('a count that is not a usable number is ignored, so the slot is prescribed as before', () => {
    for (const bad of ['five', null, NaN, Infinity, -1, {}, [5]]) {
      const slots = slotsOf(sessionsWith({ 're-lunge': bad }));
      expect(slots['re-lunge']).not.toHaveProperty('typedSets');
    }
    for (const typed of [null, [], 'x', 7]) {
      expect(slotsOf(sessionsWith(typed))['re-lunge']).not.toHaveProperty('typedSets');
    }
  });

  test('a typed count marks one routine exercise, never the same exercise in another session', () => {
    const twice = [
      { routine: { id: 'a' }, rows: [row('re-a', HIP_THRUST)] },
      { routine: { id: 'b' }, rows: [row('re-b', HIP_THRUST)] },
    ];
    const slots = slotsOf(buildPlanSessions(twice, { version: 2, typed: { 're-a': 5 } }));
    expect(slots['re-a'].typedSets).toBe(5);
    expect(slots['re-b']).not.toHaveProperty('typedSets');
  });
});
