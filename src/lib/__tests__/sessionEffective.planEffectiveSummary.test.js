/**
 * CC33 W4 D112 R4/R6 - the honest Apply preview (closes audit T2-05) plus
 * its supporting seams for T2-23's per-line review and T1-04/T1-26's
 * clinician confirm.
 *
 * T2-05, the defect this suite pins closed: computePlanEffectiveSummary ran
 * computeEffectiveSession against just-created rules whose effective_choice
 * is NULL at proposal time, so `applied` was always false and every
 * affected line resolved CONFLICTED - the old code's own comment admitted
 * counting every such line as "substituted or conflicted-pending".
 * out.omitted was unreachable; bestEligibleSubstitute was never called.
 * The fix (computePlanEffectiveLines, computePlanEffectiveSummary reduced
 * from it) asks the REAL question directly: is there an eligible
 * substitute for this exercise, right now, under the standard senior
 * question - never gated on the rule's undecided effective_choice.
 *
 * Engine real (buildCapabilityResolveState, actionableEpisodeConflicts,
 * bestEligibleSubstitute); only I/O is mocked - matches
 * capabilityPlanRewrite.test.js and sessionEffective.serveGuard.test.js.
 */
jest.mock('../database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getAllExercises: jest.fn(),
  setConstraintEffectiveChoice: jest.fn(),
  appendSessionConstraintEffects: jest.fn(),
  updateRoutineExerciseExercise: jest.fn(),
  recordExerciseSwap: jest.fn(),
}));
jest.mock('../capability/resolve', () => {
  const actual = jest.requireActual('../capability/resolve');
  return { ...actual, loadCapabilityResolveState: jest.fn() };
});
jest.mock('../exercise/intent', () => ({
  loadExerciseIntentState: jest.fn().mockResolvedValue({}),
  // Stand-in for the real senior question's capability composition -
  // standing movements read ineligible, exactly as
  // capabilityPlanRewrite.test.js and sessionEffective.serveGuard.test.js
  // model it, so the OMITTED path is genuinely reachable.
  isEligibleExercise: jest.fn((_state, ex) => ex?.position !== 'standing'),
}));

const {
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails, getAllExercises,
} = require('../database');
const { loadCapabilityResolveState, buildCapabilityResolveState } = require('../capability/resolve');
const {
  computePlanEffectiveLines, computePlanEffectiveSummary,
  clinicianSourcedIds, hasCapabilityToRevisit, computeCapabilityPlanRewrite,
} = require('../sessionEffective');

const NOW = 1_750_000_000_000;

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const LUNGE = { id: 'ex-lunge', name: 'Walking Lunge', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: 1, bilateralUpper: 0, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'high' };
const BENCH = { id: 'ex-bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', position: 'lying', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 0, axialLoad: 0, impact: 0, balanceDemand: 'supported' };

function rule(over = {}) {
  return {
    id: over.id ?? 'c-standing', userId: 'u1', role: 'episode', source: 'self',
    ruleKind: 'demand', ruleValue: 'standing', laterality: null,
    startsAt: NOW - 1000, endsAt: null, state: 'active', endedAt: null,
    endedReason: null, episodeGroupId: 'ep1', deletedAt: null,
    // Undecided is the point of this suite: NEVER 'applied' here unless a
    // test says so explicitly.
    effectiveChoice: null, adaptationMode: null, ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getActivePlan.mockResolvedValue({ id: 'plan1' });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Lower A' }]);
  // Partial exercise objects on the routine rows - no demand columns - AND
  // the real getRoutineExercisesWithDetails shape { routineExercise, exercise },
  // not the flat { id, exercise } some sibling suites' mocks use, so the
  // routineExerciseId resolution is pinned against the actual contract too.
  getRoutineExercisesWithDetails.mockResolvedValue([
    { routineExercise: { id: 're-squat' }, exercise: { id: SQUAT.id, name: SQUAT.name, primaryMuscle: 'quads' } },
    { routineExercise: { id: 're-bench' }, exercise: { id: BENCH.id, name: BENCH.name, primaryMuscle: 'chest' } },
  ]);
  getAllExercises.mockResolvedValue([SQUAT, LEGPRESS, LUNGE, BENCH]);
});

describe('computePlanEffectiveLines / computePlanEffectiveSummary (T2-05)', () => {
  test('an undecided rule with an eligible substitute previews SUBSTITUTED, never conflicted-pending', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const lines = await computePlanEffectiveLines('u1', ['c-standing']);
    expect(lines).toHaveLength(1);
    expect(lines[0].from.id).toBe(SQUAT.id);
    expect(lines[0].to.id).toBe(LEGPRESS.id);
    expect(lines[0].routineExerciseId).toBe('re-squat'); // resolved via .routineExercise.id, the real shape
    const summary = await computePlanEffectiveSummary('u1', ['c-standing']);
    expect(summary).toEqual({ affected: 1, substituted: 1, omitted: 0 });
  });

  test('an undecided rule with NO eligible substitute previews OMITTED - the path that was unreachable', async () => {
    getAllExercises.mockResolvedValue([SQUAT, LUNGE, BENCH]); // every quads option standing/conflicting
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const lines = await computePlanEffectiveLines('u1', ['c-standing']);
    expect(lines).toHaveLength(1);
    expect(lines[0].to).toBeNull();
    const summary = await computePlanEffectiveSummary('u1', ['c-standing']);
    expect(summary).toEqual({ affected: 1, substituted: 0, omitted: 1 });
  });

  test('mixed batch: one line substitutes, one omits, in the same undecided proposal', async () => {
    // A second, DIFFERENT-muscle standing exercise with no eligible
    // alternative in its own muscle group, so its outcome is
    // unambiguous: SQUAT (quads) has LEGPRESS to fall back on; this one
    // (chest) has nothing.
    const CHEST_STANDING = { id: 'ex-chest-standing', name: 'Standing Cable Fly', primaryMuscle: 'chest', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 0, axialLoad: 0, impact: 0, balanceDemand: 'stable' };
    getRoutineExercisesWithDetails.mockResolvedValue([
      { routineExercise: { id: 're-squat' }, exercise: { id: SQUAT.id, name: SQUAT.name, primaryMuscle: 'quads' } },
      { routineExercise: { id: 're-chest' }, exercise: { id: CHEST_STANDING.id, name: CHEST_STANDING.name, primaryMuscle: 'chest' } },
    ]);
    getAllExercises.mockResolvedValue([SQUAT, LEGPRESS, CHEST_STANDING]); // CHEST_STANDING is the plan's only chest exercise
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const summary = await computePlanEffectiveSummary('u1', ['c-standing']);
    expect(summary).toEqual({ affected: 2, substituted: 1, omitted: 1 });
    const lines = await computePlanEffectiveLines('u1', ['c-standing']);
    expect(lines.find((l) => l.from.id === SQUAT.id).to.id).toBe(LEGPRESS.id);
    expect(lines.find((l) => l.from.id === CHEST_STANDING.id).to).toBeNull();
  });

  test('exercises are resolved from the LIBRARY by id, not the partial routine-row object', async () => {
    // The joined row carries NO demand columns (position/floorAccess/etc
    // all absent) - if the function trusted it directly instead of
    // resolving via getAllExercises, every axis conflict test would read
    // as UNKNOWN, not a definite conflict, and the substitute search would
    // never run meaningfully.
    getRoutineExercisesWithDetails.mockResolvedValue([
      { routineExercise: { id: 're-squat' }, exercise: { id: SQUAT.id, name: SQUAT.name } },
    ]);
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const lines = await computePlanEffectiveLines('u1', ['c-standing']);
    expect(lines).toHaveLength(1);
    expect(lines[0].from).toMatchObject({ position: 'standing', primaryMuscle: 'quads' }); // full library row, not the partial one
  });

  test('a held episode (adaptationMode hold) drives no proposal - excluded entirely', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState(
      [rule({ adaptationMode: 'hold' })], { atMs: NOW },
    ));
    const lines = await computePlanEffectiveLines('u1', ['c-standing']);
    expect(lines).toHaveLength(0);
    expect(await computePlanEffectiveSummary('u1', ['c-standing'])).toEqual({ affected: 0, substituted: 0, omitted: 0 });
  });

  test('ids not in ruleIds are ignored, even if they conflict', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const lines = await computePlanEffectiveLines('u1', ['c-unrelated']);
    expect(lines).toHaveLength(0);
  });

  test('no active plan, empty ruleIds, or unavailable state all propose nothing', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    getActivePlan.mockResolvedValue(null);
    expect(await computePlanEffectiveLines('u1', ['c-standing'])).toEqual([]);
    getActivePlan.mockResolvedValue({ id: 'plan1' });
    expect(await computePlanEffectiveLines('u1', [])).toEqual([]);
    loadCapabilityResolveState.mockResolvedValue({
      ...buildCapabilityResolveState([rule()], { atMs: NOW }), unavailable: true,
    });
    expect(await computePlanEffectiveLines('u1', ['c-standing'])).toEqual([]);
  });

  test('the summary is a reduction of the lines - they can never disagree', async () => {
    getAllExercises.mockResolvedValue([SQUAT, LEGPRESS, LUNGE, BENCH]);
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const lines = await computePlanEffectiveLines('u1', ['c-standing']);
    const summary = await computePlanEffectiveSummary('u1', ['c-standing']);
    expect(summary.affected).toBe(lines.length);
    expect(summary.substituted).toBe(lines.filter((l) => l.to).length);
    expect(summary.omitted).toBe(lines.filter((l) => !l.to).length);
  });
});

describe('clinicianSourcedIds (T1-04/T1-26)', () => {
  test('flags only the clinician-sourced ids among a mixed set', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([
      rule({ id: 'c-clinician', source: 'clinician_reported' }),
      rule({ id: 'c-self', ruleValue: 'impact', source: 'self' }),
    ], { atMs: NOW }));
    const ids = await clinicianSourcedIds('u1', ['c-clinician', 'c-self', 'c-not-in-state']);
    expect(ids).toEqual(new Set(['c-clinician']));
  });

  test('empty ruleIds or an empty state resolve to an empty set, never a throw', async () => {
    expect(await clinicianSourcedIds('u1', [])).toEqual(new Set());
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([], { atMs: NOW }));
    expect(await clinicianSourcedIds('u1', ['c-standing'])).toEqual(new Set());
  });

  test('a read failure fails to an empty set, never blocks the decline path', async () => {
    loadCapabilityResolveState.mockRejectedValue(new Error('read failed'));
    expect(await clinicianSourcedIds('u1', ['c-standing'])).toEqual(new Set());
  });
});

describe('hasCapabilityToRevisit (T2-23 recoverability)', () => {
  test('no active plan: false, regardless of undecided ids', async () => {
    getActivePlan.mockResolvedValue(null);
    expect(await hasCapabilityToRevisit('u1', ['c-standing'])).toBe(false);
  });

  test('active plan + an undecided episode id supplied by the caller: true, no further read needed', async () => {
    getActivePlan.mockResolvedValue({ id: 'plan1' });
    expect(await hasCapabilityToRevisit('u1', ['c-standing'])).toBe(true);
    // computeCapabilityPlanRewrite's own routine read is never reached -
    // the caller-supplied undecided id already answers it.
    expect(getRoutinesForPlan).not.toHaveBeenCalled();
  });

  test('active plan + no undecided ids + a baseline rewrite line: true', async () => {
    getActivePlan.mockResolvedValue({ id: 'plan1' });
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState(
      [rule({ id: 'c-baseline', role: 'baseline', episodeGroupId: null })], { atMs: NOW },
    ));
    expect(await hasCapabilityToRevisit('u1', [])).toBe(true);
  });

  test('active plan + no undecided ids + nothing for the baseline rewrite either: false', async () => {
    getActivePlan.mockResolvedValue({ id: 'plan1' });
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([], { atMs: NOW }));
    expect(await hasCapabilityToRevisit('u1', [])).toBe(false);
  });

  test('a read failure fails to false - the row stays hidden, never crashes', async () => {
    getActivePlan.mockRejectedValue(new Error('read failed'));
    expect(await hasCapabilityToRevisit('u1', [])).toBe(false);
  });
});

// Sanity: confirms this suite's mock of getRoutineExercisesWithDetails
// (the real { routineExercise, exercise } shape) does not break the
// already-landed computeCapabilityPlanRewrite/applyCapabilityPlanRewrite
// pair it sits beside - guards against this suite accidentally masking a
// regression in code it does not otherwise touch.
describe('computeCapabilityPlanRewrite still runs against the real row shape', () => {
  test('a baseline rule still produces a line (routineExerciseId aside, out of this item\'s scope)', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState(
      [rule({ id: 'c-baseline', role: 'baseline', episodeGroupId: null })], { atMs: NOW },
    ));
    const rw = await computeCapabilityPlanRewrite('u1', {});
    expect(rw.lines).toHaveLength(1);
    expect(rw.lines[0].from.id).toBe(SQUAT.id);
  });
});
