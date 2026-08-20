/**
 * CC27 - the composed senior question (ARCHITECTURE section 9.2.3) and the
 * PD-9 behavioural debt at the touched call sites.
 *
 * C31 shipped its read layer with zero behavioural tests (PD-9); CC27
 * touches those same surfaces, so this suite pays the debt where the
 * composition lands:
 *  - isEligibleExercise composes capability + intent: either lane blocks;
 *  - rankPersonalised (the swap sheet's one ranking door,
 *    RoutineDetailScreen + ActiveWorkoutScreen) drops capability-blocked
 *    candidates;
 *  - filterLibraryForGeneration drops with capability reason codes, and
 *    reports the SECTION 4.1 reason (capability before preference) when
 *    both lanes block;
 *  - the no-constraints path returns the identical array BY REFERENCE
 *    (the D110-2 identical-writes property extended to the new lane);
 *  - the three id-blind readers refuse a blocked candidate when given a
 *    row lookup, and answer exactly as before without one;
 *  - loadExerciseIntentState carries the capability lane and keeps the
 *    two lanes' failure postures independent.
 */
const {
  isEligibleExercise, eligibilityBlockReason, rankPersonalised,
  approvedDefaultFor, previouslyUsedBefore, repeatedDefaultCandidate,
  loadExerciseIntentState, EXERCISE_INTENT,
} = require('../intent');
const { filterLibraryForGeneration, generationBlockReason, GENERATION_BLOCK } = require('../generation');
const { buildCapabilityResolveState } = require('../../capability/resolve');

jest.mock('../../database', () => ({
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block', PATTERN_AVOID: 'pattern_avoid' },
  getExerciseIntents: jest.fn(async () => []),
  getExerciseSwaps: jest.fn(async () => []),
  getExerciseSlotDefaults: jest.fn(async () => []),
  getExerciseUsageStats: jest.fn(async () => []),
  getExerciseProgressionSessions: jest.fn(async () => new Map()),
  getCapabilityConstraints: jest.fn(async () => []),
}));
const mockDb = require('../../database');

const NOW = 1_750_000_000_000;
const capRow = (over = {}) => ({
  id: over.id ?? 'c1', userId: 'u1', role: 'baseline', source: 'self',
  ruleKind: 'demand', ruleValue: 'standing', laterality: null,
  startsAt: NOW - 1000, endsAt: null, state: 'active', endedAt: null,
  endedReason: null, episodeGroupId: null, deletedAt: null, ...over,
});

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', gripDemand: 'bar', bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, floorAccess: 0, overheadPosition: 0, unilateralLoadable: 0, balanceDemand: 'stable' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', gripDemand: 'supportive', bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, floorAccess: 0, overheadPosition: 0, unilateralLoadable: null, balanceDemand: 'supported' };

const emptyIntentState = (capability = null) => ({
  intents: new Map(), swaps: [], defaults: [], usage: new Map(),
  progression: new Map(), activeMesocycleId: null, unavailable: false, capability,
});

const standingBlocked = () => buildCapabilityResolveState([capRow()], { atMs: NOW });

describe('the composed senior question', () => {
  test('capability blocks through isEligibleExercise; no constraints changes nothing', () => {
    const state = emptyIntentState(standingBlocked());
    expect(isEligibleExercise(state, SQUAT)).toBe(false);
    expect(isEligibleExercise(state, LEGPRESS)).toBe(true);
    expect(isEligibleExercise(emptyIntentState(), SQUAT)).toBe(true);
  });

  test('eligibilityBlockReason reports capability first, then the preference kinds', () => {
    const both = emptyIntentState(standingBlocked());
    both.intents = new Map([['ex-squat', { exerciseId: 'ex-squat', kind: EXERCISE_INTENT.EXCLUDED }]]);
    expect(eligibilityBlockReason(both, SQUAT)).toBe('capability_declared');
    const intentOnly = emptyIntentState();
    intentOnly.intents = new Map([['ex-squat', { exerciseId: 'ex-squat', kind: EXERCISE_INTENT.EXCLUDED }]]);
    expect(eligibilityBlockReason(intentOnly, SQUAT)).toBe(EXERCISE_INTENT.EXCLUDED);
  });
});

describe('rankPersonalised (the swap sheet door - PD-9 debt)', () => {
  test('drops capability-blocked candidates and keeps the rest ordered', () => {
    const state = emptyIntentState(standingBlocked());
    const out = rankPersonalised(state, [
      { exercise: SQUAT, score: 10 },
      { exercise: LEGPRESS, score: 5 },
    ], { fromExerciseId: 'ex-x' });
    expect(out.map((c) => c.exercise.id)).toEqual(['ex-legpress']);
  });
});

describe('generation filter (PD-9 debt at the pre-engine seam)', () => {
  test('drops with the capability reason code and reports it over the preference reason', () => {
    const state = emptyIntentState(standingBlocked());
    state.intents = new Map([['ex-squat', { exerciseId: 'ex-squat', kind: EXERCISE_INTENT.EXCLUDED }]]);
    const out = filterLibraryForGeneration([SQUAT, LEGPRESS], state);
    expect(out.library.map((e) => e.id)).toEqual(['ex-legpress']);
    expect(out.reasonById.get('ex-squat')).toBe(GENERATION_BLOCK.CAPABILITY_DECLARED);
    expect(out.reasonByName.get('barbell back squat')).toBe(GENERATION_BLOCK.CAPABILITY_DECLARED);
  });

  test('clinician and unknown reasons carry their own codes', () => {
    const clin = emptyIntentState(buildCapabilityResolveState(
      [capRow({ source: 'clinician_reported', ruleValue: 'axial_load' })], { atMs: NOW },
    ));
    expect(generationBlockReason(clin, SQUAT)).toBe(GENERATION_BLOCK.CAPABILITY_CLINICIAN);
    const mystery = { id: 'ex-m', name: 'Mystery', primaryMuscle: 'chest', position: null, gripDemand: null };
    const grip = emptyIntentState(buildCapabilityResolveState([capRow({ ruleValue: 'grip_bar' })], { atMs: NOW }));
    expect(generationBlockReason(grip, mystery)).toBe(GENERATION_BLOCK.CAPABILITY_UNKNOWN);
  });

  test('no intents AND no constraints: the identical array back, by reference', () => {
    const lib = [SQUAT, LEGPRESS];
    expect(filterLibraryForGeneration(lib, emptyIntentState()).library).toBe(lib);
    expect(filterLibraryForGeneration(lib, emptyIntentState(buildCapabilityResolveState([], { atMs: NOW }))).library).toBe(lib);
    // Unavailable-but-empty capability state must not invent filtering:
    // the pre-flight CHOICE lives at the UI layer, never inside this filter.
    const unavailable = { ...buildCapabilityResolveState([], { atMs: NOW }), unavailable: true };
    expect(filterLibraryForGeneration(lib, emptyIntentState(unavailable)).library).toBe(lib);
  });

  test('the legacy bare-id shape stays capability-silent (both real gates hold full rows)', () => {
    const state = emptyIntentState(standingBlocked());
    expect(generationBlockReason(state, 'ex-squat')).toBeNull();
  });
});

describe('the three id-blind readers (section 9.2.3 upgrade)', () => {
  const lookup = (id) => [SQUAT, LEGPRESS].find((e) => e.id === id) ?? null;

  test('approvedDefaultFor refuses a capability-blocked default only with a lookup', () => {
    const state = emptyIntentState(standingBlocked());
    state.defaults = [{ fromExerciseId: 'ex-a', exerciseId: 'ex-squat', routineId: null }];
    expect(approvedDefaultFor(state, 'ex-a')).toBe('ex-squat'); // unchanged legacy answer
    expect(approvedDefaultFor(state, 'ex-a', null, { getExercise: lookup })).toBeNull();
  });

  test('previouslyUsedBefore refuses a capability-blocked resurrection with a lookup', () => {
    const state = emptyIntentState(standingBlocked());
    state.swaps = [{ fromExerciseId: 'ex-squat', toExerciseId: 'ex-b', createdAt: 5 }];
    expect(previouslyUsedBefore(state, 'ex-b')).toBe('ex-squat');
    expect(previouslyUsedBefore(state, 'ex-b', { getExercise: lookup })).toBeNull();
  });

  test('repeatedDefaultCandidate never proposes a capability-blocked movement with a lookup', () => {
    const state = emptyIntentState(standingBlocked());
    state.swaps = [1, 2, 3].map((i) => ({ fromExerciseId: 'ex-a', toExerciseId: 'ex-squat', createdAt: i, explicit: true }));
    expect(repeatedDefaultCandidate(state, 'ex-a')).toEqual({ exerciseId: 'ex-squat', count: 3 });
    expect(repeatedDefaultCandidate(state, 'ex-a', { getExercise: lookup })).toBeNull();
  });
});

describe('loadExerciseIntentState carries the capability lane (independent postures)', () => {
  afterEach(() => jest.clearAllMocks());

  test('capability rows load alongside intent state', async () => {
    mockDb.getCapabilityConstraints.mockResolvedValueOnce([capRow()]);
    const state = await loadExerciseIntentState('u1');
    expect(state.unavailable).toBe(false);
    expect(state.capability).toBeTruthy();
    expect(state.capability.empty).toBe(false);
    expect(isEligibleExercise(state, SQUAT)).toBe(false);
  });

  test('an INTENT read failure fails open but the capability lane still loads', async () => {
    mockDb.getExerciseIntents.mockRejectedValueOnce(new Error('down'));
    mockDb.getCapabilityConstraints.mockResolvedValueOnce([capRow()]);
    const state = await loadExerciseIntentState('u1');
    expect(state.unavailable).toBe(true); // the intent lane's own posture
    expect(state.capability?.empty).toBe(false); // constraints did not vanish
    expect(isEligibleExercise(state, SQUAT)).toBe(false);
  });
});

describe('post-engine re-check (section 9.2.2): the POOL-fallback hole stays closed', () => {
  test('an engine pick that names a capability-dropped exercise is blocked BY NAME', () => {
    const { generationBlockFor } = require('../generation');
    const state = emptyIntentState(standingBlocked());
    const filtered = filterLibraryForGeneration([SQUAT, LEGPRESS], state);
    // The engine resolves picks by name against the FULL library, so a
    // dropped id can come back through the hand-written POOL as a name.
    expect(generationBlockFor(filtered, null, 'Barbell Back Squat')).toBe(GENERATION_BLOCK.CAPABILITY_DECLARED);
    expect(generationBlockFor(filtered, SQUAT)).toBe(GENERATION_BLOCK.CAPABILITY_DECLARED);
    expect(generationBlockFor(filtered, LEGPRESS)).toBeNull();
  });
});

describe('near-miss candidates (section 33.11)', () => {
  test('rows blocked ONLY by unknowns list their unknown axes; definite conflicts stay out', () => {
    const { nearMissCandidates } = require('../../capability/resolve');
    const mysteryQuad = { id: 'ex-mq', name: 'Mystery Quad Move', primaryMuscle: 'quads', position: null, gripDemand: 'supportive', bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, floorAccess: 0, overheadPosition: 0, unilateralLoadable: null, balanceDemand: 'supported' };
    const state = standingBlocked();
    const out = nearMissCandidates(state, [SQUAT, LEGPRESS, mysteryQuad], { muscle: 'quads' });
    expect(out).toEqual([{ exerciseId: 'ex-mq', name: 'Mystery Quad Move', unknownAxes: ['standing'] }]);
  });
});

describe('thin-session report (section 33.14)', () => {
  const { thinSessionReport } = require('../../planAutoGen');
  test('flags a session losing over a third of its slots to capability blocks', () => {
    const plan = { workouts: [
      { name: 'Push A', exercises: [1, 2, 3, 4] }, // 4 resolved
      { name: 'Legs', exercises: [1, 2] },          // 2 resolved
    ] };
    const blocked = [
      { workoutName: 'Legs', reason: 'capability_declared' },
      { workoutName: 'Legs', reason: 'capability_unknown' },   // 2 of 4 -> thin
      { workoutName: 'Push A', reason: 'capability_declared' }, // 1 of 5 -> fine
    ];
    expect(thinSessionReport(plan, blocked)).toEqual([
      { workoutName: 'Legs', requested: 4, omitted: 2 },
    ]);
  });
  test('intent-class blocks never trigger the capability banner', () => {
    const plan = { workouts: [{ name: 'A', exercises: [1] }] };
    expect(thinSessionReport(plan, [
      { workoutName: 'A', reason: 'excluded' },
      { workoutName: 'A', reason: 'excluded' },
    ])).toEqual([]);
  });
  test('exactly one third is NOT thin (the law says more than)', () => {
    const plan = { workouts: [{ name: 'A', exercises: [1, 2] }] };
    expect(thinSessionReport(plan, [{ workoutName: 'A', reason: 'capability_declared' }])).toEqual([]);
  });
});
