/**
 * CC33 D112 R1a/b - the baseline PLAN REWRITE (closes audit findings
 * T1-03 and T2-01's rebuild half).
 *
 * The defects this suite keeps closed:
 *  - T1-03: a BASELINE rule created while a plan was installed changed
 *    nothing, ever - the excluded exercise kept being served, unmarked,
 *    until a rebuild happened for unrelated reasons.
 *  - T2-01: "This is how I train now" ended the episode rows, minted
 *    baseline rows, and serve-time substitution silently stopped - the
 *    excluded base exercise came straight back. The rewrite is the
 *    missing half: promotion's minted ids feed the same proposal, so
 *    the substitutions the user was living with are offered into the
 *    document itself.
 *
 * Engine real (resolver + substitute choice); I/O mocked. The routine
 * rows deliberately carry PARTIAL exercise objects (no demand columns),
 * pinning that the rewrite resolves exercises from the library by id
 * rather than trusting the joined row.
 */
jest.mock('../database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getAllExercises: jest.fn(),
  setConstraintEffectiveChoice: jest.fn(),
  appendSessionConstraintEffects: jest.fn(),
  updateRoutineExerciseExercise: jest.fn().mockResolvedValue(undefined),
  recordExerciseSwap: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../capability/resolve', () => {
  const actual = jest.requireActual('../capability/resolve');
  return { ...actual, loadCapabilityResolveState: jest.fn() };
});
jest.mock('../exercise/intent', () => ({
  loadExerciseIntentState: jest.fn().mockResolvedValue({}),
  // Stand-in for the real senior question's capability composition.
  isEligibleExercise: jest.fn((_state, ex) => ex?.position !== 'standing'),
}));

const fs = require('fs');
const path = require('path');
const {
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails,
  getAllExercises, updateRoutineExerciseExercise, recordExerciseSwap,
} = require('../database');
const { loadCapabilityResolveState, buildCapabilityResolveState } = require('../capability/resolve');
const { computeCapabilityPlanRewrite, applyCapabilityPlanRewrite } = require('../sessionEffective');

const NOW = 1_750_000_000_000;

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const LUNGE = { id: 'ex-lunge', name: 'Walking Lunge', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: 1, bilateralUpper: 0, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'high' };
const BENCH = { id: 'ex-bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', position: 'lying', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 0, axialLoad: 0, impact: 0, balanceDemand: 'supported' };

function rule(over = {}) {
  return {
    id: over.id ?? 'c-standing', userId: 'u1', role: 'baseline', source: 'self',
    ruleKind: 'demand', ruleValue: 'standing', laterality: null,
    startsAt: NOW - 1000, endsAt: null, state: 'active', endedAt: null,
    endedReason: null, episodeGroupId: null, deletedAt: null, ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getActivePlan.mockResolvedValue({ id: 'plan1' });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Lower A' }]);
  // The REAL row shape: getRoutineExercisesWithDetails returns
  // { routineExercise, exercise } (database.js:4516), never a flat
  // { id, exercise }. This suite's first draft mocked the flat shape,
  // which is exactly how the rewrite's `row.id` (undefined in
  // production, so applyCapabilityPlanRewrite skipped every line and
  // "Update my plan" silently did nothing) passed green here - the W4A
  // review found it. Partial exercise object still on purpose: no
  // demand columns, pinning library-by-id resolution.
  getRoutineExercisesWithDetails.mockResolvedValue([
    { routineExercise: { id: 're-squat' }, exercise: { id: SQUAT.id, name: SQUAT.name, primaryMuscle: 'quads' } },
    { routineExercise: { id: 're-bench' }, exercise: { id: BENCH.id, name: BENCH.name, primaryMuscle: 'chest' } },
  ]);
  getAllExercises.mockResolvedValue([SQUAT, LEGPRESS, LUNGE, BENCH]);
  updateRoutineExerciseExercise.mockResolvedValue(undefined);
  recordExerciseSwap.mockResolvedValue(undefined);
});

describe('computeCapabilityPlanRewrite', () => {
  test('a baseline rule produces a per-line rewrite with the eligible substitute', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const rw = await computeCapabilityPlanRewrite('u1', {});
    expect(rw.lines).toHaveLength(1);
    expect(rw.lines[0]).toMatchObject({
      routineId: 'r1', routineExerciseId: 're-squat',
    });
    expect(rw.lines[0].from.id).toBe(SQUAT.id);
    expect(rw.lines[0].to.id).toBe(LEGPRESS.id);
    expect(rw.substitutable).toBe(1);
    expect(rw.unsolvable).toBe(0);
  });

  test('with no ruleIds, EPISODE conflicts are the overlay\'s business - no lines', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState(
      [rule({ role: 'episode', episodeGroupId: 'ep1', effectiveChoice: 'applied' })], { atMs: NOW },
    ));
    const rw = await computeCapabilityPlanRewrite('u1', {});
    expect(rw.lines).toHaveLength(0);
  });

  test('ruleIds reach across roles - the promotion preview mechanic', async () => {
    // At promotion time the minted baseline ids are passed; here the
    // id-scoped path is pinned by id-matching an episode-role rule, which
    // the roleless wanted-set must still honour.
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState(
      [rule({ id: 'c-promoted', role: 'episode', episodeGroupId: 'ep1' })], { atMs: NOW },
    ));
    const rw = await computeCapabilityPlanRewrite('u1', { ruleIds: ['c-promoted'] });
    expect(rw.lines).toHaveLength(1);
    const other = await computeCapabilityPlanRewrite('u1', { ruleIds: ['c-unrelated'] });
    expect(other.lines).toHaveLength(0);
  });

  test('an allowance carves the line away entirely', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState(
      [rule(), rule({ id: 'c-allow', ruleKind: 'exercise_allow', ruleValue: SQUAT.id })], { atMs: NOW },
    ));
    const rw = await computeCapabilityPlanRewrite('u1', {});
    expect(rw.lines).toHaveLength(0);
  });

  test('a substitute the user\'s OWN rules block is never proposed (lead review, CC33)', async () => {
    // 'standing' conflicts the squat; the seated leg press would be the
    // substitute, but a second rule keeps that exact exercise out. A
    // rewrite that proposed it would write into the document the very
    // thing the layer exists to keep out - the line must read
    // unsolvable instead. Before the composed senior question
    // (substituteSeniorQuestion), this test failed with to.id ===
    // 'ex-legpress'.
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState(
      [rule(), rule({ id: 'c-no-legpress', ruleKind: 'exercise', ruleValue: LEGPRESS.id })], { atMs: NOW },
    ));
    const rw = await computeCapabilityPlanRewrite('u1', {});
    const squatLine = rw.lines.find((l) => l.from.id === SQUAT.id);
    expect(squatLine).toBeTruthy();
    expect(squatLine.to).toBeNull();
  });

  test('no eligible substitute reads unsolvable, with the exercise kept', async () => {
    getAllExercises.mockResolvedValue([SQUAT, LUNGE, BENCH]); // every quads option stands/conflicts
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const rw = await computeCapabilityPlanRewrite('u1', {});
    expect(rw.lines).toHaveLength(1);
    expect(rw.lines[0].to).toBeNull();
    expect(rw.unsolvable).toBe(1);
    const res = await applyCapabilityPlanRewrite('u1', rw.lines);
    expect(res.applied).toBe(0);
    expect(updateRoutineExerciseExercise).not.toHaveBeenCalled();
  });

  test('an unavailable or empty capability state proposes nothing', async () => {
    loadCapabilityResolveState.mockResolvedValue({
      ...buildCapabilityResolveState([rule()], { atMs: NOW }), unavailable: true,
    });
    expect((await computeCapabilityPlanRewrite('u1', {})).lines).toHaveLength(0);
  });
});

describe('applyCapabilityPlanRewrite', () => {
  test('writes the document and the PROGRAMME-scope provenance', async () => {
    loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([rule()], { atMs: NOW }));
    const rw = await computeCapabilityPlanRewrite('u1', {});
    const res = await applyCapabilityPlanRewrite('u1', rw.lines);
    expect(res).toEqual({ applied: 1, failed: 0 });
    expect(updateRoutineExerciseExercise).toHaveBeenCalledWith('re-squat', LEGPRESS.id);
    expect(recordExerciseSwap).toHaveBeenCalledWith('u1', SQUAT.id, LEGPRESS.id,
      expect.objectContaining({ routineId: 'r1', explicit: true, scope: 'programme' }));
  });

  test('one failed write never abandons the rest', async () => {
    updateRoutineExerciseExercise
      .mockRejectedValueOnce(new Error('locked'))
      .mockResolvedValueOnce(undefined);
    const lines = [
      { routineId: 'r1', routineExerciseId: 're-a', from: SQUAT, to: LEGPRESS, constraintIds: [] },
      { routineId: 'r1', routineExerciseId: 're-b', from: SQUAT, to: LEGPRESS, constraintIds: [] },
    ];
    const res = await applyCapabilityPlanRewrite('u1', lines);
    expect(res).toEqual({ applied: 1, failed: 1 });
  });
});

describe('source wiring', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

  test('a new baseline rule and a promotion both reach the rewrite proposal', () => {
    const src = read('screens/HowYouTrainScreen.js');
    expect(src).toMatch(/if \(!isEpisode && draft\.kind !== 'allow'[\s\S]{0,120}proposeCapabilityPlanRewrite\(createdIds, subject\)/);
    const promote = src.match(/confirmPromote[\s\S]{0,1600}/)?.[0] ?? '';
    expect(promote).toContain('const promotedIds = await promoteEpisode(userId, ep.groupId);');
    expect(promote).toContain('proposeCapabilityPlanRewrite(promotedIds, subject)');
  });

  test('the in-session baseline conflict is quietly marked, in its own vocabulary', () => {
    const src = read('screens/ActiveWorkoutScreen.js');
    expect(src).toContain('baselineConflicts(intentState.capability, exercise)');
    expect(src).toContain('sits outside how you train. Swap it when you\'re ready.');
    // The strip label follows the lane - a permanent rule is never
    // presented as a temporary change.
    expect(src).toMatch(/kind === 'baseline' \? 'How you train' : 'Temporary change'/);
  });
});
