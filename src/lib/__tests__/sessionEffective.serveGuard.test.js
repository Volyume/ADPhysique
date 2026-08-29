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
  updateRoutineExerciseExercise: jest.fn().mockResolvedValue(undefined),
  recordExerciseSwap: jest.fn().mockResolvedValue(undefined),
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

const {
  getAllExercises, appendSessionConstraintEffects, getActivePlan,
  getRoutinesForPlan, getRoutineExercisesWithDetails, updateRoutineExerciseExercise,
} = require('../database');
const { loadCapabilityResolveState, buildCapabilityResolveState } = require('../capability/resolve');
const {
  applyEffectiveViewToSession, countEffectiveSessionRows,
  computeCapabilityPlanRewrite, applyCapabilityPlanRewrite,
} = require('../sessionEffective');

const NOW = 1_750_000_000_000;

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const LUNGE = { id: 'ex-lunge', name: 'Walking Lunge', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: 1, bilateralUpper: 0, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'high' };
// A second seated quads option, for the R5-8 taken-set pins: with TWO
// eligible substitutes in the pool, two conflicted quads rows must get
// two DIFFERENT movements.
const LEGEXT = { id: 'ex-legext', name: 'Leg Extension', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'none', unilateralLoadable: 1, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };

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
  const { served, baseIndexes, untouched } = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT)]);
  expect(untouched).toBe(false);
  expect(baseIndexes).toEqual([0]);
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
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [added]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(added);            // same object, untouched
  expect(served[0]._capabilityTemp).toBeUndefined();
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('mixed session: the added row survives while its unmarked twin substitutes', async () => {
  const added = { ...asServed(SQUAT), _userAdded: true };
  const { served, baseIndexes } = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), added]);
  expect(served).toHaveLength(2);
  expect(baseIndexes).toEqual([0, 1]);
  expect(served[0].id).toBe(LEGPRESS.id);   // planned row: substituted
  expect(served[1]).toBe(added);            // user's own: untouched
});

test('a _userAdded row is never omitted, even with no substitute in the pool', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]); // every quads option conflicts
  const added = { ...asServed(SQUAT), _userAdded: true };
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [added]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(added);
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('the unmarked no-substitute row is still omitted AND recorded - excusal cannot regress', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]);
  const { served, baseIndexes } = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), asServed(LEGPRESS)]);
  expect(served.map((r) => r.id)).toEqual([LEGPRESS.id]); // squat dropped, leg press stands
  expect(baseIndexes).toEqual([1]); // and it is slot 1's row, said so explicitly (R3-4)
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
  // A second, servable row (LEGPRESS's own conflict is the BASELINE
  // exercise rule, which never drives serve) keeps the session from the
  // fully-omitted fail-safe (F-2), so the omission is genuinely written
  // and the refusal to substitute TO the blocked exercise is visible.
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), asServed(LEGPRESS)]);
  expect(served.map((r) => r.id)).toEqual([LEGPRESS.id]);
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
  const res = await applyEffectiveViewToSession('u1', 'w1', rows);
  expect(res.untouched).toBe(true);
  expect(res.served).toBe(rows); // the untouched fast path: same array back
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('a row the library cannot resolve lands in the unknown lane and is never auto-swapped', async () => {
  // Unresolved FK (a cloud-restored row from before deterministic ids):
  // judged on what it carries, every axis unknown - and unknown drives
  // nothing automatic, so the row stays, visibly the user's own.
  const ghost = { id: 'ex-gone', name: 'Old Machine Press', primaryMuscle: 'chest' };
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [ghost]);
  expect(served).toHaveLength(1);
  expect(served[0]).toBe(ghost);
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

test('R3-4 DRIVEN: an omitted duplicate never claims the _userAdded twin\'s slot', async () => {
  // The round-3 breaking input, driven end to end: slot 0 is the plan's
  // squat (definitely conflicted, no substitute in the pool - OMITTED);
  // slot 1 is the SAME exercise the user added themselves. The old
  // id-reconstruction (findIndex, then round 2's claimed-index scan)
  // walked into the omission hole and handed the user's row slot 0's
  // identity - a relaunch then replaced their add with the very row the
  // app had just omitted, against A10. The module now states each served
  // row's base index itself.
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]); // no eligible substitute
  const added = { ...asServed(SQUAT), _userAdded: true };
  const res = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), added]);
  expect(res.untouched).toBe(false);
  expect(res.served).toHaveLength(1);
  expect(res.served[0]).toBe(added);       // the user's own object, untouched
  expect(res.baseIndexes).toEqual([1]);    // and it is slot 1, never slot 0
  const entries = appendSessionConstraintEffects.mock.calls[0][2];
  expect(entries).toEqual([expect.objectContaining({ effect: 'omitted', slot: 0 })]);
});

test('F-2 DRIVEN: a fully-omitted session fail-safes with ZERO durable effects written', async () => {
  // Round 4: every row definitely conflicted, no substitute anywhere -
  // the fail-safe serves the base session intact (D116: never served
  // empty; the rows carry their visible notices), and the record must
  // say NOTHING happened. Before the fix, N omission effects were
  // written first and the summary/week/denominator all described a
  // session the user was never actually reduced to.
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]); // every quads option conflicts
  const rows = [asServed(SQUAT), asServed(LUNGE)];
  const res = await applyEffectiveViewToSession('u1', 'w1', rows);
  expect(res.untouched).toBe(true);
  expect(res.served).toBe(rows);
  expect(appendSessionConstraintEffects).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// Round 5 (R5-8): the taken-set. One substitute is never assigned twice
// within a session, and a substitute never duplicates a row the session
// already holds. Driven through serve, the count mirror and the rewrite.
// ---------------------------------------------------------------------------

test('R5-8 DRIVEN: two conflicted rows of one muscle are served two DIFFERENT substitutes', async () => {
  // The reviewer's executed probe, kept closed: before the taken-set,
  // Back Squat AND Walking Lunge both served as Leg Press - one movement
  // twice, with two markers naming two different originals.
  getAllExercises.mockResolvedValue([SQUAT, LUNGE, LEGPRESS, LEGEXT]);
  const { served, untouched } = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), asServed(LUNGE)]);
  expect(untouched).toBe(false);
  expect(served).toHaveLength(2);
  const ids = served.map((r) => r.id);
  expect(new Set(ids).size).toBe(2); // never the same movement twice
  expect(ids.sort()).toEqual([LEGEXT.id, LEGPRESS.id].sort());
  expect(served[0]._capabilityTemp?.fromId).toBe(SQUAT.id);
  expect(served[1]._capabilityTemp?.fromId).toBe(LUNGE.id);
  const entries = appendSessionConstraintEffects.mock.calls[0][2];
  expect(new Set(entries.map((e) => e.exerciseTo)).size).toBe(2);
});

test('R5-8 DRIVEN: when only one substitute exists, the second conflicted row falls to the honest OMITTED path', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE, LEGPRESS]);
  const { served, baseIndexes } = await applyEffectiveViewToSession('u1', 'w1', [asServed(SQUAT), asServed(LUNGE)]);
  expect(served).toHaveLength(1);
  expect(served[0].id).toBe(LEGPRESS.id); // slot 0 takes the one candidate
  expect(baseIndexes).toEqual([0]);
  const entries = appendSessionConstraintEffects.mock.calls[0][2];
  expect(entries).toEqual([
    expect.objectContaining({ effect: 'substituted', exerciseFrom: SQUAT.id, exerciseTo: LEGPRESS.id }),
    expect.objectContaining({ effect: 'omitted', exerciseFrom: LUNGE.id }),
  ]);
});

test('R5-8 DRIVEN: a substitute never duplicates an unaffected row already in the session', async () => {
  // Leg Press is already IN the session (compatible, served as planned).
  // The conflicted squat must not ALSO become Leg Press - the taken set
  // is seeded with the session's own rows, so it falls to Leg Extension.
  getAllExercises.mockResolvedValue([SQUAT, LEGPRESS, LEGEXT]);
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(LEGPRESS), asServed(SQUAT)]);
  expect(served.map((r) => r.id)).toEqual([LEGPRESS.id, LEGEXT.id]);
});

// ---------------------------------------------------------------------------
// Round 5 (R5-4): the served-count mirror shares serve's
// never-served-empty fail-safe, not just its wiring.
// ---------------------------------------------------------------------------

const ROUTINE_ROWS = (list) => list.map((e, i) => ({ routineExercise: { id: `re-${i + 1}` }, exercise: asServed(e) }));

test('R5-4 DRIVEN: the count mirror answers the BASE count for a fully-omitted session, exactly as serve serves it', async () => {
  // F-2's own fixture, asked through the mirror: serve returns the base
  // session intact, so the Today card's count must be the base count -
  // the old 0 was falsy and the "N exercises" line vanished for a
  // session the app was about to serve in full.
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]);
  getRoutineExercisesWithDetails.mockResolvedValue(ROUTINE_ROWS([SQUAT, LUNGE]));
  await expect(countEffectiveSessionRows('u1', 'r1')).resolves.toBe(2);
});

test('R5-4 control: a PARTIALLY omitted session still counts the reduction', async () => {
  getAllExercises.mockResolvedValue([SQUAT, LUNGE]);
  getRoutineExercisesWithDetails.mockResolvedValue(ROUTINE_ROWS([SQUAT, LEGPRESS]));
  // Squat omitted (no eligible substitute in this pool), leg press served.
  await expect(countEffectiveSessionRows('u1', 'r1')).resolves.toBe(1);
});

// ---------------------------------------------------------------------------
// Round 5 (R5-8, rewrite half): the DOCUMENT is never written a duplicate.
// ---------------------------------------------------------------------------

function baselineStandingRule() {
  return buildCapabilityResolveState([{
    id: 'b1', userId: 'u1', role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue: 'standing', laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: null,
    deletedAt: null,
  }], { atMs: NOW });
}

test('R5-8 DRIVEN: the plan rewrite proposes and writes two DIFFERENT movements for two conflicted rows', async () => {
  loadCapabilityResolveState.mockResolvedValue(baselineStandingRule());
  getActivePlan.mockResolvedValue({ id: 'p1' });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Legs' }]);
  getRoutineExercisesWithDetails.mockResolvedValue(ROUTINE_ROWS([SQUAT, LUNGE]));
  getAllExercises.mockResolvedValue([SQUAT, LUNGE, LEGPRESS, LEGEXT]);
  const rw = await computeCapabilityPlanRewrite('u1', {});
  expect(rw.checked).toBe(true);
  expect(rw.lines).toHaveLength(2);
  expect(rw.substitutable).toBe(2);
  const targets = rw.lines.map((l) => l.to?.id);
  expect(new Set(targets).size).toBe(2); // never one substitute twice
  await applyCapabilityPlanRewrite('u1', rw.lines);
  const written = updateRoutineExerciseExercise.mock.calls.map((c) => c[1]);
  expect(new Set(written).size).toBe(2); // and the document gets both
});

test('R5-8 DRIVEN: with one candidate, the rewrite marks the second line unsolvable and writes ONE swap', async () => {
  loadCapabilityResolveState.mockResolvedValue(baselineStandingRule());
  getActivePlan.mockResolvedValue({ id: 'p1' });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Legs' }]);
  getRoutineExercisesWithDetails.mockResolvedValue(ROUTINE_ROWS([SQUAT, LUNGE]));
  getAllExercises.mockResolvedValue([SQUAT, LUNGE, LEGPRESS]);
  const rw = await computeCapabilityPlanRewrite('u1', {});
  expect(rw.substitutable).toBe(1);
  expect(rw.unsolvable).toBe(1); // kept in place with its quiet note - honest, never a duplicate
  await applyCapabilityPlanRewrite('u1', rw.lines);
  expect(updateRoutineExerciseExercise).toHaveBeenCalledTimes(1);
});

test('R5-9: an unavailable capability state answers checked=false, never "nothing to rewrite"', async () => {
  loadCapabilityResolveState.mockResolvedValue({ empty: true, unavailable: true, restrictions: [], allowances: new Set() });
  getActivePlan.mockResolvedValue({ id: 'p1' });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Legs' }]);
  getRoutineExercisesWithDetails.mockResolvedValue(ROUTINE_ROWS([SQUAT]));
  getAllExercises.mockResolvedValue([SQUAT, LEGPRESS]);
  const rw = await computeCapabilityPlanRewrite('u1', {});
  expect(rw.lines).toHaveLength(0);
  expect(rw.checked).toBe(false);
});
