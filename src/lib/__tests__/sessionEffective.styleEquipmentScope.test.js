/**
 * F-14 (final-certification-2026-09-05, docs/final-certification-2026-09-05/
 * 07-FINDINGS.md; evidence A6 in 04-TRAINING-STYLES.md): serve-time
 * capability substitution was style-blind and equipment-blind.
 *
 * The defect these pins keep closed, in the certification's own words: a
 * "no overhead" rule on Dumbbell Shoulder Press inside "Full-Body
 * Circuit: Dumbbells" could serve a barbell, cable or machine movement
 * to someone training at home with a pair of dumbbells, because
 * `bestEligibleSubstitute` ranked over `getAllExercises()` - the whole
 * catalogue - asking only about primary muscle, not-taken and
 * eligibility. Generation (planEngine's filterPool) and the live swap
 * sheet (rankSwaps' stylePool + equipment options) had narrowed to the
 * plan's style pool and the athlete's kit for a while; serve had not.
 *
 * What is pinned:
 *  - the narrowing REMOVES candidates and never admits one: it runs
 *    before the injected senior eligibility question, never instead of
 *    it;
 *  - a style-tagged plan's substitutes come from its pool or nowhere -
 *    when nothing survives, the existing "no close match" paths stand
 *    (serve omits and records; the rewrite keeps the row with its note);
 *  - an untagged plan on a full-gym profile behaves exactly as it did
 *    before F-14;
 *  - serve resolves the plan's tags and the athlete's kit ITSELF, with
 *    no caller change - the screens were not edited for this fix, so a
 *    pin that only passed the scope explicitly would prove nothing;
 *  - the equipment predicate is the SHARED one (planAutoGen's
 *    `equipmentReachable`), asserted by identity, not by comment.
 *
 * Real engines throughout (buildCapabilityResolveState,
 * computeEffectiveSession, the real style pools and the real equipment
 * predicate); only I/O is mocked.
 */
jest.mock('../database', () => ({
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block', PATTERN_AVOID: 'pattern_avoid' },
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getAllExercises: jest.fn(),
  getActiveBlock: jest.fn().mockResolvedValue(null),
  setConstraintEffectiveChoice: jest.fn(),
  appendSessionConstraintEffects: jest.fn().mockResolvedValue(undefined),
  updateRoutineExerciseExercise: jest.fn().mockResolvedValue(undefined),
  recordExerciseSwap: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../capability/resolve', () => {
  const actual = jest.requireActual('../capability/resolve');
  return { ...actual, loadCapabilityResolveState: jest.fn() };
});
jest.mock('../exercise/intent', () => {
  const actual = jest.requireActual('../exercise/intent');
  return { ...actual, loadExerciseIntentState: jest.fn() };
});
// The store stands in only so the equipment DEFAULT is provable without
// standing up the real store: sessionEffective reads the athlete's
// profile through the lazy require lib modules already use
// (effectiveLandmarks.getPlanLandmarks does the same).
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: jest.fn(() => ({ userProfile: { equipment: 'dumbbells_only' } })) },
}));

const {
  getAllExercises, appendSessionConstraintEffects, getActivePlan,
  getRoutinesForPlan, getRoutineExercisesWithDetails, getActiveBlock,
} = require('../database');
const { loadCapabilityResolveState, buildCapabilityResolveState } = require('../capability/resolve');
const { loadExerciseIntentState } = require('../exercise/intent');
const {
  applyEffectiveViewToSession, countEffectiveSessionRows,
  computeCapabilityPlanRewrite, loadSubstituteScope,
} = require('../sessionEffective');
const { bestEligibleSubstitute } = require('../capability/effective');
const candidateScope = require('../exercise/candidateScope');
const planAutoGen = require('../planAutoGen');
const { STYLE_POOLS, STYLE_POOL_KEYS } = require('../exercise/stylePools');

const intentStateWith = (intents, activeMesocycleId) => ({
  intents, swaps: [], defaults: [], usage: new Map(), progression: new Map(),
  activeMesocycleId, unavailable: false, capability: null,
});

const NOW = 1_750_000_000_000;

// Real corpus names (pool membership is by NAME, so a fictional name
// would silently pass every pool test), with the demand columns the
// resolver reads and the equipmentProfiles the shared equipment
// predicate reads - the two shapes serve actually judges.
const ex = (id, name, primaryMuscle, overhead, position, profiles) => ({
  id,
  name,
  primaryMuscle,
  position,
  floorAccess: 0,
  overheadPosition: overhead,
  gripDemand: 'supportive',
  unilateralLoadable: 1,
  bilateralUpper: 0,
  bilateralLower: 0,
  axialLoad: 0,
  impact: 0,
  balanceDemand: 'stable',
  weightBearingHands: 0,
  equipmentProfiles: profiles,
});

const FULL_GYM_CABLE = ['full_gym', 'machines_cables'];
const DUMBBELL = ['full_gym', 'dumbbells_only', 'home_gym'];
const KETTLEBELL = ['full_gym', 'dumbbells_only', 'home_gym'];

// The finding's own exercise: the overhead row a "no overhead" rule conflicts.
const DB_SHOULDER_PRESS = ex('ex-dbsp', 'Dumbbell Shoulder Press', 'front_delts', 1, 'standing', DUMBBELL);
// Same muscle, not overhead: the candidates. Both are COMMON tier, so the
// pre-F-14 ranking (tier, then name) puts the CABLE one first - which is
// exactly the substitute a dumbbell circuit must never receive.
const CABLE_FRONT_RAISE = ex('ex-cfr', 'Cable Front Raise', 'front_delts', 0, 'standing', FULL_GYM_CABLE);
const DB_FRONT_RAISE = ex('ex-dfr', 'Dumbbell Front Raise', 'front_delts', 0, 'standing', DUMBBELL);
// Present so the "never a barbell or machine press" half is real rather
// than assumed absent from the fixture.
const BB_OVERHEAD_PRESS = ex('ex-bbop', 'Barbell Overhead Press', 'front_delts', 1, 'standing', ['full_gym', 'barbell_plates']);
const MACHINE_SHOULDER_PRESS = ex('ex-msp', 'Machine Shoulder Press', 'front_delts', 1, 'seated', FULL_GYM_CABLE);

// The kettlebell case: a standing row conflicted by a "no standing" rule.
const KB_ROW = ex('ex-kbrow', 'Kettlebell Row (Single-Arm)', 'back', 0, 'standing', KETTLEBELL);
// STAPLE, so it out-ranks the kettlebell option on tier alone - the
// pre-F-14 winner, and a cable station a kettlebell athlete has not got.
const SEATED_CABLE_ROW = ex('ex-scr', 'Seated Cable Row', 'back', 0, 'seated', FULL_GYM_CABLE);
// In the kettlebell_experienced pool (a NEVER_AUTO ballistic admitted
// deliberately by EL-8's closed exception list), and not standing.
const KB_RENEGADE_ROW = ex('ex-kbren', 'Kettlebell Renegade Row', 'back', 0, 'lying', KETTLEBELL);

const CIRCUIT_DUMBBELL_TAGS = 'circuit style:circuit_dumbbell equipment:dumbbell';
const KETTLEBELL_TAGS = 'style:kettlebell_experienced equipment:kettlebell';

function appliedEpisode(ruleValue) {
  return buildCapabilityResolveState([{
    id: 'c1', userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand',
    ruleValue, laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: 'ep1',
    deletedAt: null, effectiveChoice: 'applied',
  }], { atMs: NOW });
}

// The production row shape: getRoutineExercisesWithDetails' embedded
// exercise literal carries no demand columns and no profiles, so serve
// must resolve rows from the library (the F1 lesson) - and the scope
// must be judged on the LIBRARY row, not the served stub.
const asServed = (e) => ({ id: e.id, name: e.name, primaryMuscle: e.primaryMuscle });

beforeEach(() => {
  jest.clearAllMocks();
  loadCapabilityResolveState.mockResolvedValue(appliedEpisode('overhead_position'));
  getAllExercises.mockResolvedValue([
    DB_SHOULDER_PRESS, CABLE_FRONT_RAISE, DB_FRONT_RAISE, BB_OVERHEAD_PRESS, MACHINE_SHOULDER_PRESS,
  ]);
  getActiveBlock.mockResolvedValue(null);
  getActivePlan.mockResolvedValue(null);
  loadExerciseIntentState.mockImplementation(
    async (_userId, { activeMesocycleId = null } = {}) => intentStateWith(new Map(), activeMesocycleId),
  );
});

// ── The fixture itself has to be honest ────────────────────────────────

test('fixture guard: the pool names used here are really in the real style pools', () => {
  expect(STYLE_POOLS[STYLE_POOL_KEYS.CIRCUIT_DUMBBELL]).toContain('Dumbbell Front Raise');
  expect(STYLE_POOLS[STYLE_POOL_KEYS.CIRCUIT_DUMBBELL]).not.toContain('Cable Front Raise');
  expect(STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_EXPERIENCED]).toContain('Kettlebell Renegade Row');
  expect(STYLE_POOLS[STYLE_POOL_KEYS.KETTLEBELL_EXPERIENCED]).not.toContain('Seated Cable Row');
});

test('control: with no scope at all, serve still reaches outside the style and the kit', async () => {
  // The pre-F-14 behaviour, stated explicitly so the pins below prove the
  // NARROWING is what changed the outcome, not the fixture ordering.
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(DB_SHOULDER_PRESS)], {
    planTags: null, equipment: null,
  });
  expect(served[0].name).toBe('Cable Front Raise');
});

// ── Serve ───────────────────────────────────────────────────────────────

test('F-14: a dumbbell circuit never receives a cable, barbell or machine substitute', async () => {
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(DB_SHOULDER_PRESS)], {
    planTags: CIRCUIT_DUMBBELL_TAGS, equipment: 'dumbbells_only',
  });
  expect(served).toHaveLength(1);
  expect(served[0].name).toBe('Dumbbell Front Raise');
  expect(served[0]._capabilityTemp?.fromId).toBe(DB_SHOULDER_PRESS.id);
  expect(['Cable Front Raise', 'Barbell Overhead Press', 'Machine Shoulder Press'])
    .not.toContain(served[0].name);
});

test('F-14: serve resolves the plan tags itself - no caller change was needed', async () => {
  // The screens were not edited for this fix, so the default path is the
  // only one production uses: serve reads the active plan's tags, and the
  // equipment default comes from the stored profile.
  getActivePlan.mockResolvedValue({ id: 'p1', tags: CIRCUIT_DUMBBELL_TAGS });
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(DB_SHOULDER_PRESS)]);
  expect(served[0].name).toBe('Dumbbell Front Raise');
});

test('F-14: equipment alone narrows an untagged plan', async () => {
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(DB_SHOULDER_PRESS)], {
    planTags: null, equipment: 'dumbbells_only',
  });
  expect(served[0].name).toBe('Dumbbell Front Raise');
});

test('F-14: an untagged plan on a full-gym profile behaves exactly as before', async () => {
  const { served, baseIndexes, untouched } = await applyEffectiveViewToSession(
    'u1', 'w1', [asServed(DB_SHOULDER_PRESS)], { planTags: null, equipment: 'full_gym' },
  );
  expect(untouched).toBe(false);
  expect(baseIndexes).toEqual([0]);
  expect(served[0].name).toBe('Cable Front Raise');
});

test('F-14: a kettlebell plan receives a kettlebell-pool substitute', async () => {
  loadCapabilityResolveState.mockResolvedValue(appliedEpisode('standing'));
  getAllExercises.mockResolvedValue([KB_ROW, SEATED_CABLE_ROW, KB_RENEGADE_ROW]);
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(KB_ROW)], {
    planTags: KETTLEBELL_TAGS, equipment: 'home_gym',
  });
  expect(served[0].name).toBe('Kettlebell Renegade Row');
});

test('F-14: with no pool candidate the kettlebell plan omits rather than reaching outside', async () => {
  // Point 3 of the ruling: the existing "no close match" path stands
  // unchanged. A second servable row keeps the session clear of the
  // never-served-empty fail-safe, so the omission is genuinely written.
  loadCapabilityResolveState.mockResolvedValue(appliedEpisode('standing'));
  getAllExercises.mockResolvedValue([KB_ROW, SEATED_CABLE_ROW]);
  const { served, baseIndexes } = await applyEffectiveViewToSession(
    'u1', 'w1', [asServed(KB_ROW), asServed(SEATED_CABLE_ROW)],
    { planTags: KETTLEBELL_TAGS, equipment: 'home_gym' },
  );
  expect(served.map((r) => r.name)).toEqual(['Seated Cable Row']);
  expect(baseIndexes).toEqual([1]);
  expect(appendSessionConstraintEffects).toHaveBeenCalledTimes(1);
  expect(appendSessionConstraintEffects.mock.calls[0][2]).toEqual([
    expect.objectContaining({ effect: 'omitted', exerciseFrom: KB_ROW.id }),
  ]);
});

// ── The served-count mirror ─────────────────────────────────────────────

test('F-14: the served count mirrors the narrowed serve, not a wider one', async () => {
  loadCapabilityResolveState.mockResolvedValue(appliedEpisode('standing'));
  getAllExercises.mockResolvedValue([KB_ROW, SEATED_CABLE_ROW, KB_RENEGADE_ROW]);
  // The routine holds the standing row and the one pool member, so the
  // pool member is already SPOKEN FOR (R5-8's taken set): in scope there
  // is nothing left for the standing row, out of scope the cable station
  // is. One routine, two answers - the count must give serve's.
  getRoutineExercisesWithDetails.mockResolvedValue([
    { routineExercise: { id: 're1' }, exercise: asServed(KB_ROW) },
    { routineExercise: { id: 're2' }, exercise: asServed(KB_RENEGADE_ROW) },
  ]);
  const narrowed = await countEffectiveSessionRows('u1', 'r1', {
    planTags: KETTLEBELL_TAGS, equipment: 'home_gym',
  });
  expect(narrowed).toBe(1); // the pool-less row is omitted, exactly as serve omits it
  const wide = await countEffectiveSessionRows('u1', 'r1', { planTags: null, equipment: null });
  expect(wide).toBe(2);     // unscoped, the cable station substitutes in and both are served
});

// ── The permanent document ──────────────────────────────────────────────

test('F-14: the plan rewrite never proposes a movement outside the plan style and kit', async () => {
  loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([{
    id: 'b1', userId: 'u1', role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue: 'overhead_position', laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: null, deletedAt: null,
  }], { atMs: NOW }));
  getActivePlan.mockResolvedValue({ id: 'p1', tags: CIRCUIT_DUMBBELL_TAGS });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Circuit A' }]);
  getRoutineExercisesWithDetails.mockResolvedValue([
    { routineExercise: { id: 're1' }, exercise: asServed(DB_SHOULDER_PRESS) },
  ]);
  const scoped = await computeCapabilityPlanRewrite('u1', { equipment: 'dumbbells_only' });
  expect(scoped.checked).toBe(true);
  expect(scoped.lines).toHaveLength(1);
  expect(scoped.lines[0].to.name).toBe('Dumbbell Front Raise');
  expect(scoped.substitutable).toBe(1);
});

test('F-14: a rewrite line with no in-scope candidate stays unsolvable and keeps its row', async () => {
  // The "kept in place with a note" path, unchanged: the line reports
  // itself unsolvable rather than writing a cable station permanently
  // into a dumbbell circuit.
  loadCapabilityResolveState.mockResolvedValue(buildCapabilityResolveState([{
    id: 'b1', userId: 'u1', role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue: 'overhead_position', laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: null, deletedAt: null,
  }], { atMs: NOW }));
  getAllExercises.mockResolvedValue([DB_SHOULDER_PRESS, CABLE_FRONT_RAISE, MACHINE_SHOULDER_PRESS]);
  getActivePlan.mockResolvedValue({ id: 'p1', tags: CIRCUIT_DUMBBELL_TAGS });
  getRoutinesForPlan.mockResolvedValue([{ id: 'r1', name: 'Circuit A' }]);
  getRoutineExercisesWithDetails.mockResolvedValue([
    { routineExercise: { id: 're1' }, exercise: asServed(DB_SHOULDER_PRESS) },
  ]);
  const out = await computeCapabilityPlanRewrite('u1', { equipment: 'dumbbells_only' });
  expect(out.lines).toHaveLength(1);
  expect(out.lines[0].from.id).toBe(DB_SHOULDER_PRESS.id);
  expect(out.lines[0].to).toBeNull();
  expect(out.unsolvable).toBe(1);
  expect(out.substitutable).toBe(0);
});

// ── The scope itself ────────────────────────────────────────────────────

test('the scope narrows and never admits: it runs before the senior question', () => {
  const library = [DB_SHOULDER_PRESS, CABLE_FRONT_RAISE, DB_FRONT_RAISE];
  const inPool = (e) => e.name === 'Dumbbell Front Raise';
  // A candidate the senior question refuses is still refused, scope or not.
  expect(bestEligibleSubstitute(DB_SHOULDER_PRESS, library, () => false, null, inPool)).toBeNull();
  // And the scope only removes: with it, the cable option cannot win.
  expect(bestEligibleSubstitute(DB_SHOULDER_PRESS, library, () => true, null, inPool).name)
    .toBe('Dumbbell Front Raise');
  // Without it, the pre-F-14 answer stands - proof the default is inert.
  expect(bestEligibleSubstitute(DB_SHOULDER_PRESS, library, () => true).name)
    .toBe('Cable Front Raise');
});

test('the equipment predicate is the SHARED one, by identity', () => {
  expect(candidateScope.equipmentReachable).toBe(planAutoGen.equipmentReachable);
});

test('the scope is null when there is nothing to narrow', async () => {
  expect(candidateScope.substituteCandidateFilter({})).toBeNull();
  expect(candidateScope.substituteCandidateFilter({ styleKey: null, equipment: null })).toBeNull();
  // An unknown style key is "no constraint", never an empty pool.
  expect(candidateScope.substituteCandidateFilter({ styleKey: 'not_a_pool' })).toBeNull();
  expect(await loadSubstituteScope('u1', { planTags: null, equipment: null })).toBeNull();
});

test('the equipment default is read from the stored profile', async () => {
  // Nothing tagged, no equipment argument: the scope still exists,
  // because the athlete's own profile (dumbbells_only, from the store)
  // is a constraint in its own right.
  const scope = await loadSubstituteScope('u1', { planTags: null });
  expect(typeof scope).toBe('function');
  expect(scope(DB_FRONT_RAISE)).toBe(true);
  expect(scope(CABLE_FRONT_RAISE)).toBe(false);
  // A row with no profiles at all (a custom exercise) is never hidden.
  expect(scope({ name: 'My Own Lift' })).toBe(true);
});

test('a failed plan read leaves serve exactly as it was, never empty-handed', async () => {
  getActivePlan.mockRejectedValue(new Error('db down'));
  const { served } = await applyEffectiveViewToSession('u1', 'w1', [asServed(DB_SHOULDER_PRESS)], {
    equipment: null,
  });
  expect(served[0].name).toBe('Cable Front Raise');
});
