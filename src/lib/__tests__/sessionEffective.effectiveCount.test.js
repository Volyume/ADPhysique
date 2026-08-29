/**
 * D112 R2/R5 (closes audit T1-17): countEffectiveSessionRows - the served
 * row count HomeScreen's Today card now shows, instead of the base
 * routine's raw COUNT(*) (database.js getAllRoutineExerciseCounts).
 *
 * Pins:
 *  - no applied episode rule -> base count, untouched.
 *  - an applied episode rule with an eligible substitute -> substituted
 *    rows still count (the session still happens).
 *  - an applied episode rule with NO eligible substitute -> the omitted
 *    row drops the served count below the base total.
 *  - fail-safe: any read error returns the base count, never blocks or
 *    shrinks the card on a capability read failure.
 *
 * The capability engine runs REAL (buildCapabilityResolveState +
 * computeEffectiveSession, same pattern as sessionEffective.serveGuard.
 * test.js); only I/O is mocked.
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
  isEligibleExercise: jest.fn(() => true),
}));

const { getRoutineExercisesWithDetails, getAllExercises } = require('../database');
const { loadCapabilityResolveState, buildCapabilityResolveState } = require('../capability/resolve');
const { countEffectiveSessionRows } = require('../sessionEffective');

const NOW = 1_750_000_000_000;

// getRoutineExercisesWithDetails' own shape: { routineExercise, exercise }
// with a PARTIAL exercise object (no demand columns) - the helper must
// re-resolve from the library by id, exactly like computeCapabilityPlanRewrite.
const SQUAT_PARTIAL = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads' };
const BENCH_PARTIAL = { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest' };

const SQUAT_FULL = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LEGPRESS_FULL = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const BENCH_FULL = { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', position: 'lying', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 0, axialLoad: 0, impact: 0, balanceDemand: 'supported' };

function routineRows(partials) {
  return partials.map((exercise) => ({ routineExercise: { id: `re-${exercise.id}` }, exercise }));
}

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
});

test('no capability constraints: returns the base row count', async () => {
  loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([], { atMs: NOW }));
  getRoutineExercisesWithDetails.mockResolvedValue(routineRows([SQUAT_PARTIAL, BENCH_PARTIAL]));
  const n = await countEffectiveSessionRows('u1', 'r1');
  expect(n).toBe(2);
  // Capability-blind path never even reaches the library/effective read.
  expect(getAllExercises).not.toHaveBeenCalled();
});

test('an applied episode rule with an eligible substitute: substituted row still counts', async () => {
  loadCapabilityResolveState.mockResolvedValue(appliedStandingEpisode());
  getRoutineExercisesWithDetails.mockResolvedValue(routineRows([SQUAT_PARTIAL, BENCH_PARTIAL]));
  getAllExercises.mockResolvedValue([SQUAT_FULL, LEGPRESS_FULL, BENCH_FULL]);
  const n = await countEffectiveSessionRows('u1', 'r1');
  // Squat conflicts (standing), Leg Press substitutes for it; Bench is
  // unaffected. Base count 2, served count still 2.
  expect(n).toBe(2);
});

test('an applied episode rule with NO eligible substitute: the omitted row drops the served count', async () => {
  loadCapabilityResolveState.mockResolvedValue(appliedStandingEpisode());
  getRoutineExercisesWithDetails.mockResolvedValue(routineRows([SQUAT_PARTIAL, BENCH_PARTIAL]));
  // No quads substitute in the library at all - Squat is omitted, not
  // substituted. Bench stands.
  getAllExercises.mockResolvedValue([SQUAT_FULL, BENCH_FULL]);
  const n = await countEffectiveSessionRows('u1', 'r1');
  expect(n).toBe(1);
});

test('fail-safe: a capability read failure returns the base count, never blocks the card', async () => {
  loadCapabilityResolveState.mockRejectedValue(new Error('read failed'));
  getRoutineExercisesWithDetails.mockResolvedValue(routineRows([SQUAT_PARTIAL, BENCH_PARTIAL]));
  const n = await countEffectiveSessionRows('u1', 'r1');
  expect(n).toBe(2);
});

test('fail-safe: no userId or routineId answers null - "could not count" - without touching the DB (round 6, B9)', async () => {
  // The old 0 was a real answer ("this routine is empty") given for a
  // question that was never asked - and, being falsy, it hid the Today
  // card's raw-count fallback. null is "no count exists here", which
  // the card's ?? fallback handles by showing the raw figure.
  expect(await countEffectiveSessionRows(null, 'r1')).toBeNull();
  expect(await countEffectiveSessionRows('u1', null)).toBeNull();
  expect(getRoutineExercisesWithDetails).not.toHaveBeenCalled();
});

test('B9 (round 6): a routine the module cannot READ answers null, never a falsy 0', async () => {
  getRoutineExercisesWithDetails.mockRejectedValue(new Error('locked'));
  expect(await countEffectiveSessionRows('u1', 'r1')).toBeNull();
});

test('a routine with zero rows returns 0 without a capability read', async () => {
  getRoutineExercisesWithDetails.mockResolvedValue([]);
  const n = await countEffectiveSessionRows('u1', 'r1');
  expect(n).toBe(0);
  expect(loadCapabilityResolveState).not.toHaveBeenCalled();
});
