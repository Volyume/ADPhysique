/**
 * CC33 D112 R1 - honest block seeding under BASELINE rules (closes audit
 * finding T1-01, the section 15 volume half).
 *
 * The defect this suite keeps closed: constrained blocks were seeded
 * template volume targets (MEV -> MAV ramps) for muscles whose pool the
 * user's PERMANENT rules empty entirely - planned_muscle_volume fiction
 * that adherence, the coach and the ledger then judged against.
 *
 * The role law pinned hardest here: an EPISODE-only restriction must
 * NEVER zero a block's rows. Episode rows are temporary; the block's
 * planned rows are the protected baseline section 23's reintroduction
 * ramps back toward (reintroduction.js derives its peak from them), so
 * zeroing them would leave nothing to return to. Permanent shapes the
 * document; temporary is an overlay (D112 R1).
 *
 * All pure, against the REAL resolver; the wiring into
 * activatePlanWithBlock / generateInitialPlannedVolume is pinned at
 * source below.
 */
const fs = require('fs');
const path = require('path');
const {
  buildCapabilityResolveState, baselineBlockedMuscles, resolveEffectiveTargets,
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

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LUNGE = { id: 'ex-lunge', name: 'Walking Lunge', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: 1, bilateralUpper: 0, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'high' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const BENCH = { id: 'ex-bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', position: 'lying', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 0, axialLoad: 0, impact: 0, balanceDemand: 'supported' };

const MUSCLES = ['quads', 'chest', 'hamstrings'];

describe('baselineBlockedMuscles - who gets honest zeros', () => {
  test('a baseline rule that empties a muscle pool blocks that muscle only', () => {
    const s = buildCapabilityResolveState([row()], { atMs: NOW });
    const blocked = baselineBlockedMuscles(s, [SQUAT, LUNGE, BENCH], MUSCLES);
    expect([...blocked]).toEqual(['quads']);
  });

  test('an eligible alternative keeps the muscle unblocked', () => {
    const s = buildCapabilityResolveState([row()], { atMs: NOW });
    const blocked = baselineBlockedMuscles(s, [SQUAT, LUNGE, LEGPRESS, BENCH], MUSCLES);
    expect(blocked.size).toBe(0);
  });

  test('the SAME rule as an EPISODE never blocks - the reintroduction peak is protected', () => {
    const s = buildCapabilityResolveState(
      [row({ role: 'episode', episodeGroupId: 'ep1', effectiveChoice: 'applied' })],
      { atMs: NOW },
    );
    const blocked = baselineBlockedMuscles(s, [SQUAT, LUNGE, BENCH], MUSCLES);
    expect(blocked.size).toBe(0);
  });

  test('an allowance carves: the allowed exercise keeps its muscle alive', () => {
    const s = buildCapabilityResolveState(
      [row(), row({ ruleKind: 'exercise_allow', ruleValue: SQUAT.id })],
      { atMs: NOW },
    );
    const blocked = baselineBlockedMuscles(s, [SQUAT, LUNGE, BENCH], MUSCLES);
    expect(blocked.size).toBe(0);
  });

  test('a clinician baseline rule is not carveable by an allowance', () => {
    const s = buildCapabilityResolveState(
      [row({ source: 'clinician_reported' }), row({ ruleKind: 'exercise_allow', ruleValue: SQUAT.id })],
      { atMs: NOW },
    );
    const blocked = baselineBlockedMuscles(s, [SQUAT, LUNGE, BENCH], MUSCLES);
    expect([...blocked]).toEqual(['quads']);
  });

  test('empty or unavailable state blocks NOTHING - the template is the safe direction', () => {
    const empty = buildCapabilityResolveState([], { atMs: NOW });
    expect(baselineBlockedMuscles(empty, [SQUAT], MUSCLES).size).toBe(0);
    const unavailable = { ...buildCapabilityResolveState([row()], { atMs: NOW }), unavailable: true };
    expect(baselineBlockedMuscles(unavailable, [SQUAT], MUSCLES).size).toBe(0);
  });

  test('a muscle with no library presence at all is not marked - that is a template concern, not capability', () => {
    const s = buildCapabilityResolveState([row()], { atMs: NOW });
    const blocked = baselineBlockedMuscles(s, [SQUAT, BENCH], ['quads', 'chest', 'hamstrings']);
    expect(blocked.has('hamstrings')).toBe(false);
  });
});

describe('resolveEffectiveTargets - the section 15 min at the seeding grain', () => {
  test('a blocked muscle resolves to zero and reads limited', () => {
    const out = resolveEffectiveTargets({ quads: 12 }, { quads: 0 });
    expect(out.quads).toEqual({ effectiveTarget: 0, limited: true });
  });

  test('an unblocked muscle passes through untouched', () => {
    const out = resolveEffectiveTargets({ chest: 12 }, {});
    expect(out.chest).toEqual({ effectiveTarget: 12, limited: false });
  });
});

describe('source wiring - activation computes the set and seeding honours it', () => {
  const DB = fs.readFileSync(path.join(__dirname, '..', '..', 'database.js'), 'utf8');

  test('activatePlanWithBlock derives baselineBlockedMuscles and passes it to seeding', () => {
    const fn = DB.match(/export async function activatePlanWithBlock[\s\S]{0,20000}?generateInitialPlannedVolume\([^)]*\)/)?.[0] ?? '';
    expect(fn).toContain('baselineBlockedMuscles(');
    expect(fn).toContain('blockedMuscles: capabilityBlockedMuscles');
    // The fail-to-template posture: the read is guarded and a failure
    // leaves the blocked set null.
    expect(fn).toContain('capabilityBlockedMuscles = null;');
  });

  test('generateInitialPlannedVolume zeroes planned and the [mev, mrv] band for blocked muscles', () => {
    const fn = DB.match(/export async function generateInitialPlannedVolume[\s\S]{0,6000}?\n\}/)?.[0] ?? '';
    expect(fn).toContain('const isBlocked = blocked.has(muscle);');
    expect(fn).toMatch(/rowMrv = isBlocked \? 0 :/);
    expect(fn).toMatch(/rowMev = isBlocked \? 0 : mev;/);
    expect(fn).toContain('resolveEffectiveTargets(');
    // A learned seed for a blocked muscle must not resurrect the ramp.
    expect(fn).toMatch(/const seeded = !isBlocked\s*&& seed/);
    // The deload row zeroes with the rest.
    expect(fn).toMatch(/deloadPlanned = isBlocked \? 0 :/);
  });
});
