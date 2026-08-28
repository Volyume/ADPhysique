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

beforeEach(() => {
  jest.clearAllMocks();
  loadCapabilityResolveState.mockResolvedValue(appliedStandingEpisode());
  getAllExercises.mockResolvedValue([SQUAT, LEGPRESS, LUNGE]);
});

test('an unmarked conflicted row is substituted - the baseline behaviour stands', async () => {
  const served = await applyEffectiveViewToSession('u1', 'w1', [SQUAT]);
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
  const added = { ...SQUAT, _userAdded: true };
  const served = await applyEffectiveViewToSession('u1', 'w1', [added]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(added);            // same object, untouched
  expect(served[0]._capabilityTemp).toBeUndefined();
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('mixed session: the added row survives while its unmarked twin substitutes', async () => {
  const added = { ...SQUAT, _userAdded: true };
  const served = await applyEffectiveViewToSession('u1', 'w1', [SQUAT, added]);
  expect(served).toHaveLength(2);
  expect(served[0].id).toBe(LEGPRESS.id);   // planned row: substituted
  expect(served[1]).toBe(added);            // user's own: untouched
});

test('a _userAdded row is never omitted, even with no substitute in the pool', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]); // every quads option conflicts
  const added = { ...SQUAT, _userAdded: true };
  const served = await applyEffectiveViewToSession('u1', 'w1', [added]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(added);
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('the unmarked no-substitute row is still omitted AND recorded - excusal cannot regress', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]);
  const served = await applyEffectiveViewToSession('u1', 'w1', [SQUAT, LEGPRESS]);
  expect(served.map((r) => r.id)).toEqual([LEGPRESS.id]); // squat dropped, leg press stands
  expect(appendSessionConstraintEffects).toHaveBeenCalledTimes(1);
  const entries = appendSessionConstraintEffects.mock.calls[0][2];
  expect(entries).toEqual([expect.objectContaining({ effect: 'omitted', exerciseFrom: SQUAT.id })]);
});
