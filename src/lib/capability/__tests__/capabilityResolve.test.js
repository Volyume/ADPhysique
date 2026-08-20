/**
 * CC27 - the capability resolver (ARCHITECTURE section 9; precedence
 * section 4.1; laterality section 33.8; CAP-7/8/17).
 *
 * Property pins, all against the pure module:
 *  - first-match reason order: clinician > declared > unknown, and an
 *    allowance carves ranks 3 and 4 but NEVER rank 2;
 *  - UNKNOWN on a constrained axis blocks with its own reason
 *    (capability_unknown), never silently passes or silently conflates;
 *  - a user with NO constraints filters nothing and returns the SAME
 *    array by reference (the inertness property CC26 promised);
 *  - laterality: a sided constraint on a body-side axis is satisfied by
 *    unilateral-loadable movements; whole-body axes never side-carve;
 *  - baseline and episode rows both apply (union);
 *  - determinism: same state + exercise, same answer;
 *  - the loader's CAP-17 posture: read failure serves last-known state
 *    with unavailable:true, or an EMPTY unavailable state when the
 *    session has none - never half-state, never a throw.
 */
const {
  buildCapabilityResolveState, emptyCapabilityState, demandAxisConflict,
  demandConflicts, capabilityBlockReason, isCapabilityEligible,
  filterCapabilityEligible, affectedScope, resolveEffectiveTargets,
  loadCapabilityResolveState, _resetCapabilityResolveCache, CAPABILITY_BLOCK,
} = require('../resolve');

const NOW = 1_750_000_000_000;

function row(over = {}) {
  return {
    id: over.id ?? `c_${Math.abs(JSON.stringify(over).split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`,
    userId: 'u1', role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue: 'standing', laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: null,
    deletedAt: null, ...over,
  };
}

const BENCH = { id: 'ex-bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', position: 'lying', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 0, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const DBPRESS = { id: 'ex-dbpress', name: 'Dumbbell Shoulder Press', primaryMuscle: 'front_delts', position: 'standing', floorAccess: 0, overheadPosition: 1, gripDemand: 'bar', unilateralLoadable: 1, bilateralUpper: 0, bilateralLower: 0, axialLoad: null, impact: 0, balanceDemand: 'stable' };
const MYSTERY = { id: 'ex-mystery', name: 'Mystery Movement', primaryMuscle: 'chest', position: null, floorAccess: null, overheadPosition: null, gripDemand: null, unilateralLoadable: null, bilateralUpper: null, bilateralLower: null, axialLoad: null, impact: null, balanceDemand: null };

describe('demandAxisConflict tri-state', () => {
  test.each([
    ['standing', SQUAT, true], ['standing', LEGPRESS, false], ['standing', MYSTERY, null],
    ['grip_bar', SQUAT, true], ['grip_bar', LEGPRESS, false], ['grip_bar', MYSTERY, null],
    ['floor_access', BENCH, false], ['floor_access', MYSTERY, null],
    ['axial_load', SQUAT, true], ['axial_load', BENCH, false],
    ['balance_high', SQUAT, false], ['balance_high', MYSTERY, null],
    ['bilateral_upper', BENCH, true], ['bilateral_upper', DBPRESS, false],
    ['bilateral_lower', SQUAT, true], ['bilateral_lower', DBPRESS, false],
  ])('%s vs %o', (axis, ex, expected) => {
    expect(demandAxisConflict(axis, ex)).toBe(expected);
  });

  test("'mixed' position conflicts with a standing constraint (fail-safe)", () => {
    expect(demandAxisConflict('standing', { position: 'mixed' })).toBe(true);
  });

  test('bilateral unknown resolves through unilateral loadability', () => {
    expect(demandAxisConflict('bilateral_upper', { bilateralUpper: null, unilateralLoadable: 1 })).toBe(false);
    expect(demandAxisConflict('bilateral_upper', { bilateralUpper: null, unilateralLoadable: null })).toBe(null);
  });
});

describe('section 4.1 first-match order and allowance carving', () => {
  test('no constraints: nothing blocked, identical array back (inertness)', () => {
    const state = emptyCapabilityState(NOW);
    const lib = [BENCH, SQUAT, LEGPRESS];
    expect(capabilityBlockReason(state, SQUAT)).toBeNull();
    const out = filterCapabilityEligible(state, lib);
    expect(out.library).toBe(lib);
    expect(out.dropped).toEqual([]);
  });

  test('self-declared conflict reports capability_declared and is carved by an allowance', () => {
    const state = buildCapabilityResolveState([row({ ruleValue: 'standing' })], { atMs: NOW });
    expect(capabilityBlockReason(state, SQUAT)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(isCapabilityEligible(state, SQUAT)).toBe(false);

    const carved = buildCapabilityResolveState(
      [row({ ruleValue: 'standing' }), row({ id: 'allow1', ruleKind: 'exercise_allow', ruleValue: 'ex-squat' })],
      { atMs: NOW },
    );
    expect(capabilityBlockReason(carved, SQUAT)).toBeNull();
    expect(capabilityBlockReason(carved, DBPRESS)).toBe(CAPABILITY_BLOCK.DECLARED); // allowance is per-exercise
  });

  test('clinician conflict outranks and is NEVER carved (CAP-7)', () => {
    const state = buildCapabilityResolveState(
      [
        row({ id: 'clin1', source: 'clinician_reported', ruleValue: 'axial_load' }),
        row({ id: 'self1', ruleValue: 'standing' }),
        row({ id: 'allow1', ruleKind: 'exercise_allow', ruleValue: 'ex-squat' }),
      ],
      { atMs: NOW },
    );
    expect(capabilityBlockReason(state, SQUAT)).toBe(CAPABILITY_BLOCK.CLINICIAN);
  });

  test('UNKNOWN on a constrained axis blocks with capability_unknown, carved by an allowance', () => {
    const state = buildCapabilityResolveState([row({ ruleValue: 'grip_bar' })], { atMs: NOW });
    expect(capabilityBlockReason(state, MYSTERY)).toBe(CAPABILITY_BLOCK.UNKNOWN);
    const carved = buildCapabilityResolveState(
      [row({ ruleValue: 'grip_bar' }), row({ id: 'a', ruleKind: 'exercise_allow', ruleValue: 'ex-mystery' })],
      { atMs: NOW },
    );
    expect(capabilityBlockReason(carved, MYSTERY)).toBeNull();
  });

  test('a definite conflict outranks an unknown in the report (rank 3 before rank 4)', () => {
    const state = buildCapabilityResolveState(
      [row({ ruleValue: 'standing' }), row({ id: 'g', ruleValue: 'grip_bar' })],
      { atMs: NOW },
    );
    // Squat: standing conflict definite; grip also definite; declared.
    expect(capabilityBlockReason(state, SQUAT)).toBe(CAPABILITY_BLOCK.DECLARED);
    // Mystery: both unknown only.
    expect(capabilityBlockReason(state, MYSTERY)).toBe(CAPABILITY_BLOCK.UNKNOWN);
  });

  test('family and exercise rules conflict by identity, never unknown', () => {
    const state = buildCapabilityResolveState(
      [row({ ruleKind: 'exercise', ruleValue: 'ex-bench' })],
      { atMs: NOW },
    );
    expect(capabilityBlockReason(state, BENCH)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(capabilityBlockReason(state, MYSTERY)).toBeNull(); // no demand rules -> unknowns irrelevant
  });
});

describe('section 33.8 laterality scoping', () => {
  test('a sided grip constraint is satisfied by a one-side-loadable movement', () => {
    const state = buildCapabilityResolveState([row({ ruleValue: 'grip_bar', laterality: 'left' })], { atMs: NOW });
    expect(capabilityBlockReason(state, DBPRESS)).toBeNull(); // unilateralLoadable: work the right side
    expect(capabilityBlockReason(state, SQUAT)).toBe(CAPABILITY_BLOCK.DECLARED); // bar needs both hands
  });

  test('whole-body axes never side-carve', () => {
    const state = buildCapabilityResolveState([row({ ruleValue: 'standing', laterality: 'left' })], { atMs: NOW });
    expect(capabilityBlockReason(state, DBPRESS)).toBe(CAPABILITY_BLOCK.DECLARED); // standing is standing
  });

  test('an unsided bilateral_upper constraint still blocks both-arm movements and passes unilateral ones', () => {
    const state = buildCapabilityResolveState([row({ ruleValue: 'bilateral_upper' })], { atMs: NOW });
    expect(capabilityBlockReason(state, BENCH)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(capabilityBlockReason(state, DBPRESS)).toBeNull();
  });
});

describe('interval and role semantics', () => {
  test('baseline and episode rows both apply while active (union)', () => {
    const state = buildCapabilityResolveState(
      [
        row({ id: 'b', role: 'baseline', ruleValue: 'standing' }),
        row({ id: 'e', role: 'episode', ruleValue: 'grip_bar', episodeGroupId: 'g1' }),
      ],
      { atMs: NOW },
    );
    expect(capabilityBlockReason(state, SQUAT)).toBe(CAPABILITY_BLOCK.DECLARED); // either suffices
    expect(capabilityBlockReason(state, BENCH)).toBe(CAPABILITY_BLOCK.DECLARED); // grip
    expect(capabilityBlockReason(state, LEGPRESS)).toBeNull(); // neither
  });

  test('an ended row stops applying at endedAt; a tombstoned row never applies', () => {
    const ended = row({ state: 'ended', endedAt: NOW - 10 });
    const tomb = row({ id: 't', deletedAt: NOW - 10 });
    const state = buildCapabilityResolveState([ended, tomb], { atMs: NOW });
    expect(state.empty).toBe(true);
    expect(capabilityBlockReason(state, SQUAT)).toBeNull();
  });

  test('atMs replay: the same rows answer differently at different moments', () => {
    const rows = [row({ startsAt: NOW - 100, state: 'ended', endedAt: NOW + 100 })];
    const during = buildCapabilityResolveState(rows, { atMs: NOW });
    const after = buildCapabilityResolveState(rows, { atMs: NOW + 200 });
    expect(capabilityBlockReason(during, SQUAT)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(capabilityBlockReason(after, SQUAT)).toBeNull();
  });
});

describe('affectedScope and effective targets', () => {
  test('affectedScope names blocked ids and muscles, nothing else', () => {
    const state = buildCapabilityResolveState([row({ ruleValue: 'standing' })], { atMs: NOW });
    const scope = affectedScope(state, [BENCH, SQUAT, LEGPRESS, DBPRESS]);
    expect([...scope.exerciseIds].sort()).toEqual(['ex-dbpress', 'ex-squat']);
    expect([...scope.muscles].sort()).toEqual(['front_delts', 'quads']);
  });

  test('resolveEffectiveTargets = min(planned, compatible), limited flag honest (section 15)', () => {
    const out = resolveEffectiveTargets({ chest: 12, quads: 16 }, { chest: 12, quads: 9 });
    expect(out.chest).toEqual({ effectiveTarget: 12, limited: false });
    expect(out.quads).toEqual({ effectiveTarget: 9, limited: true });
    // A muscle with no computed compatible volume keeps its plan (no guess).
    expect(resolveEffectiveTargets({ back: 10 }, {}).back).toEqual({ effectiveTarget: 10, limited: false });
  });
});

describe('determinism', () => {
  test('same state + exercise, same answers, no input mutation', () => {
    const rows = [row({ ruleValue: 'standing' }), row({ id: 'g', ruleValue: 'grip_bar', source: 'clinician_reported' })];
    Object.freeze(rows[0]); Object.freeze(rows[1]);
    const s1 = buildCapabilityResolveState(rows, { atMs: NOW });
    const s2 = buildCapabilityResolveState(rows, { atMs: NOW });
    for (const ex of [BENCH, SQUAT, LEGPRESS, DBPRESS, MYSTERY]) {
      expect(capabilityBlockReason(s1, ex)).toBe(capabilityBlockReason(s2, ex));
      expect(demandConflicts(s1, ex)).toEqual(demandConflicts(s2, ex));
    }
  });
});

describe('CAP-17 loader posture (section 9.6)', () => {
  afterEach(() => { jest.resetModules(); _resetCapabilityResolveCache(); });

  test('read failure with NO known state: empty + unavailable, never a throw', async () => {
    jest.doMock('../../database', () => ({
      getCapabilityConstraints: async () => { throw new Error('db down'); },
    }));
    _resetCapabilityResolveCache();
    const state = await loadCapabilityResolveState('u-cap17');
    expect(state.unavailable).toBe(true);
    expect(state.stale).toBe(false);
    expect(state.empty).toBe(true);
    jest.dontMock('../../database');
  });

  test('read failure WITH a known state: last known served, flagged unavailable+stale', async () => {
    let fail = false;
    jest.doMock('../../database', () => ({
      getCapabilityConstraints: async () => {
        if (fail) throw new Error('db down');
        return [row({ ruleValue: 'standing' })];
      },
    }));
    _resetCapabilityResolveCache();
    const good = await loadCapabilityResolveState('u-cap17b', { atMs: NOW });
    expect(good.unavailable).toBe(false);
    expect(good.restrictions).toHaveLength(1);
    fail = true;
    const later = await loadCapabilityResolveState('u-cap17b', { atMs: NOW });
    expect(later.unavailable).toBe(true);
    expect(later.stale).toBe(true);
    expect(later.restrictions).toHaveLength(1); // surfaces behave normally on it
    jest.dontMock('../../database');
  });
});
