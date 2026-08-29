/**
 * CC33 D112 R4/R2 - the serve-time effective view respects the user's own
 * additions and rebuilds prescriptions (closes audit findings T2-04 and
 * T2-03's module half).
 *
 * The defects this suite keeps closed:
 *  - T2-04: for a blank session the serve effect fired when the FIRST
 *    manually added exercise landed, silently substituting over a row the
 *    user had just added through the picker's explicit "Add anyway"
 *    override. The module-level law pinned here: a row carrying
 *    _userAdded is served EXACTLY as given - never substituted, never
 *    omitted, never written to the effects record - while unmarked rows
 *    in the same session still resolve normally.
 *  - The omission record still fires for unmarked rows, so the fix
 *    cannot regress adherence excusal.
 *
 * The capability engine runs REAL (buildCapabilityResolveState +
 * computeEffectiveSession); only I/O is mocked - the DB reads, the
 * resolver's loader, and the intent lane's senior question.
 */
jest.mock('../database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getAllExercises: jest.fn(),
  setConstraintEffectiveChoice: jest.fn(),
  appendSessionConstraintEffects: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../capability/resolve', () => {
  const actual = jest.requireActual('../capability/resolve');
  return { ...actual, loadCapabilityResolveState: jest.fn() };
});
jest.mock('../exercise/intent', () => ({
  loadExerciseIntentState: jest.fn().mockResolvedValue({}),
  // The real senior question composes capability (the substitute pool is
  // capability-filtered through it); this stand-in models that for the
  // standing-rule fixtures so the OMITTED path is genuinely reachable.
  isEligibleExercise: jest.fn((_state, ex) => ex?.position !== 'standing'),
}));

const { getAllExercises, appendSessionConstraintEffects } = require('../database');
const { loadCapabilityResolveState, buildCapabilityResolveState } = require('../capability/resolve');
const { applyEffectiveViewToSession } = require('../sessionEffective');

const NOW = 1_750_000_000_000;

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const LUNGE = { id: 'ex-lunge', name: 'Walking Lunge', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: 1, bilateralUpper: 0, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'high' };

function appliedStandingEpisode() {
  return buildCapabilityResolveState([{
    id: 'c1', userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand',
    ruleValue: 'standing', laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: 'ep1',
    deletedAt: null, effectiveChoice: 'applied',
  }], { atMs: NOW });
}

// CC33 adversarial review F8: the PRODUCTION row shape. Live sessions are
// built from getRoutineExercisesWithDetails, whose embedded exercise
// literal carries NO demand columns (database.js:4482-4515) - this
// suite's first draft fed full-shaped fixtures the producer never emits,
// which is exactly how F1 (every compatible row substituted at serve)
// stayed green here. Every session row below goes through this, so the
// suite proves serve's own library resolution rather than assuming it.
const asServed = (e) => ({ id: e.id, name: e.name, primaryMuscle: e.primaryMuscle });

test('the production row shape really is demandless (fixture-drift guard)', () => {
  expect(Object.keys(asServed(SQUAT))).toEqual(['id', 'name', 'primaryMuscle']);
  expect(asServed(SQUAT).position).toBeUndefined();
});

beforeEach(() => {
  jest.clearAllMocks();
  loadCapabilityResolveState.mockResolvedValue(appliedStandingEpisode());
  getAllExercises.mockResolvedValue([SQUAT, LEGPRESS, LUNGE]);
});

test('an unmarked conflicted row is substituted - the baseline behaviour stands', async () => {
  const served = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT)]);
  expect(served).toHaveLength(1);
  expect(served[0].id).toBe(LEGPRESS.id);
  expect(served[0]._capabilityTemp?.fromId).toBe(SQUAT.id);
  // D112 R7 (audit T2-13): the substitution is recorded the moment it
  // happens, so a reshaped-but-never-omitting week is visible to the
  // CONSTRAINED limiter and the effects history.
  expect(appendSessionConstraintEffects).toHaveBeenCalledTimes(1);
  expect(appendSessionConstraintEffects.mock.calls[0][2]).toEqual([
    expect.objectContaining({ effect: 'substituted', exerciseFrom: SQUAT.id, exerciseTo: LEGPRESS.id }),
  ]);
});

test('a _userAdded conflicted row is served exactly as given', async () => {
  const added = { ...asServed(SQUAT), _userAdded: true };
  const served = await applyEffectiveViewToSession('u1', 'w1', [added]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(added);            // same object, untouched
  expect(served[0]._capabilityTemp).toBeUndefined();
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('mixed session: the added row survives while its unmarked twin substitutes', async () => {
  const added = { ...asServed(SQUAT), _userAdded: true };
  const served = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), added]);
  expect(served).toHaveLength(2);
  expect(served[0].id).toBe(LEGPRESS.id);   // planned row: substituted
  expect(served[1]).toBe(added);            // user's own: untouched
});

test('a _userAdded row is never omitted, even with no substitute in the pool', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]); // every quads option conflicts
  const added = { ...asServed(SQUAT), _userAdded: true };
  const served = await applyEffectiveViewToSession('u1', 'w1', [added]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(added);
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('the unmarked no-substitute row is still omitted AND recorded - excusal cannot regress', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]);
  const served = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), asServed(LEGPRESS)]);
  expect(served.map((r) => r.id)).toEqual([LEGPRESS.id]); // squat dropped, leg press stands
  expect(appendSessionConstraintEffects).toHaveBeenCalledTimes(1);
  const entries = appendSessionConstraintEffects.mock.calls[0][2];
  expect(entries).toEqual([expect.objectContaining({ effect: 'omitted', exerciseFrom: SQUAT.id })]);
});

test('serve never substitutes TO an exercise the user\'s own rules block (lead review, CC33)', async () => {
  // The standing episode conflicts the squat; the seated leg press would
  // be the substitute, but a second active rule keeps that exact
  // exercise out. Serving it would put in the session the very movement
  // the layer exists to keep out - the row must be OMITTED instead.
  // Before the composed senior question (substituteSeniorQuestion in
  // sessionEffective.js), this test failed with LEGPRESS served.
  const base = appliedStandingEpisode();
  loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([
    ...base.restrictions.map((r) => ({ ...r })),
    {
      id: 'c2', userId: 'u1', role: 'baseline', source: 'self', ruleKind: 'exercise',
      ruleValue: LEGPRESS.id, laterality: null, startsAt: NOW - 1000, endsAt: null,
      state: 'active', endedAt: null, endedReason: null, episodeGroupId: null,
      deletedAt: null,
    },
  ], { atMs: NOW }));
  const served = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT)]);
  expect(served.map((r) => r.id)).not.toContain(LEGPRESS.id);
  expect(appendSessionConstraintEffects).toHaveBeenCalledTimes(1);
  expect(appendSessionConstraintEffects.mock.calls[0][2]).toEqual([
    expect.objectContaining({ effect: 'omitted', exerciseFrom: SQUAT.id }),
  ]);
});

test('F1 REGRESSION: compatible production-shaped rows are served untouched under an applied demand rule', async () => {
  // The adversarial review's headline case: seated, genuinely compatible
  // movements, judged from the demandless production shape. Before serve
  // resolved rows through the library, every one of these read UNKNOWN
  // on the standing axis and the whole session was substituted -
  // compatible rows literally traded places, with durable effects
  // entries written for each. The contract now: resolved rows judge
  // definite-compatible, nothing changes, nothing is recorded.
  const rows = [asServed(LEGPRESS)];
  const served = await applyEffectiveViewToSession('u1', 'w1', rows);
  expect(served).toBe(rows); // the untouched fast path: same array back
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('a row the library cannot resolve lands in the unknown lane and is never auto-swapped', async () => {
  // Unresolved FK (a cloud-restored row from before deterministic ids):
  // judged on what it carries, every axis unknown - and unknown drives
  // nothing automatic, so the row stays, visibly the user's own.
  const ghost = { id: 'ex-gone', name: 'Old Machine Press', primaryMuscle: 'chest' };
  const served = await applyEffectiveViewToSession('u1', 'w1', [ghost]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(ghost);
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});
