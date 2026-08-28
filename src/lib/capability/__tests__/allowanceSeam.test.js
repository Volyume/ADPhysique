/**
 * CC33 D112 R4 - the allowance DECISION seam (closes audit finding T2-02).
 *
 * The defect this suite exists to keep closed: "This one works for me"
 * (an exercise_allow rule) was honoured by the picker alone, because the
 * carve lived only inside capabilityBlockReason. Every other decision
 * consumer read raw demandConflicts, so an exercise the user explicitly
 * allowed was still substituted out at serve time, counted as a
 * constraint-excused omission, and kept its muscle held from volume
 * increases.
 *
 * Pins, all against the REAL modules:
 *  - blockingConflicts carves definite self-declared AND unknown
 *    conflicts for an allowed exercise, and NEVER carves a definite
 *    clinician conflict (rank 2 stays un-carveable, section 4.1);
 *  - with no allowance it answers exactly as demandConflicts does;
 *  - episodeConflicts is built on the carve, so computeEffectiveSession
 *    serves an allowed exercise UNCHANGED under an applied episode rule,
 *    and computeCompletionEffects does not excuse its absence (the user
 *    said it works; skipping it is an ordinary early stop);
 *  - a clinician-sourced episode rule still substitutes despite the
 *    allowance;
 *  - source guard: CoachOutputScreen's two capability scans (volume
 *    holds, affectedMuscles) call blockingConflicts, never raw
 *    demandConflicts - the two consumers that cannot inherit the fix
 *    through episodeConflicts.
 */
const fs = require('fs');
const path = require('path');
const {
  buildCapabilityResolveState, demandConflicts, blockingConflicts,
  capabilityBlockReason, CAPABILITY_BLOCK,
} = require('../resolve');
const {
  episodeConflicts, computeEffectiveSession, computeCompletionEffects,
  EFFECTIVE_EFFECT,
} = require('../effective');

const NOW = 1_750_000_000_000;

function row(over = {}) {
  return {
    id: over.id ?? `c_${Math.abs(JSON.stringify(over).split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`,
    userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand',
    ruleValue: 'standing', laterality: null, startsAt: NOW - 1000, endsAt: null,
    state: 'active', endedAt: null, endedReason: null, episodeGroupId: 'ep1',
    deletedAt: null, effectiveChoice: 'applied', ...over,
  };
}

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const LEGPRESS = { id: 'ex-legpress', name: 'Leg Press', primaryMuscle: 'quads', position: 'seated', floorAccess: 0, overheadPosition: 0, gripDemand: 'supportive', unilateralLoadable: null, bilateralUpper: 0, bilateralLower: 1, axialLoad: 0, impact: 0, balanceDemand: 'supported' };
const MYSTERY = { id: 'ex-mystery', name: 'Mystery Movement', primaryMuscle: 'quads', position: null, floorAccess: null, overheadPosition: null, gripDemand: null, unilateralLoadable: null, bilateralUpper: null, bilateralLower: null, axialLoad: null, impact: null, balanceDemand: null };

const allow = (exerciseId, over = {}) => row({ ruleKind: 'exercise_allow', ruleValue: exerciseId, ...over });

describe('blockingConflicts - the carve', () => {
  test('an allowance carves a definite self-declared conflict', () => {
    const s = buildCapabilityResolveState([row(), allow(SQUAT.id)], { atMs: NOW });
    expect(demandConflicts(s, SQUAT).length).toBeGreaterThan(0); // explanation layer still lists it
    expect(blockingConflicts(s, SQUAT)).toEqual([]);             // decision layer carves it
  });

  test('an allowance carves unknown conflicts too', () => {
    const s = buildCapabilityResolveState([row(), allow(MYSTERY.id)], { atMs: NOW });
    expect(demandConflicts(s, MYSTERY).some((c) => c.unknown)).toBe(true);
    expect(blockingConflicts(s, MYSTERY)).toEqual([]);
  });

  test('an allowance NEVER carves a definite clinician conflict', () => {
    const s = buildCapabilityResolveState(
      [row({ source: 'clinician_reported' }), allow(SQUAT.id)], { atMs: NOW },
    );
    const blocking = blockingConflicts(s, SQUAT);
    expect(blocking.length).toBeGreaterThan(0);
    expect(blocking.every((c) => c.source === 'clinician_reported' && !c.unknown)).toBe(true);
    expect(capabilityBlockReason(s, SQUAT)).toBe(CAPABILITY_BLOCK.CLINICIAN);
  });

  test('with no allowance, blocking answers exactly as demandConflicts', () => {
    const s = buildCapabilityResolveState([row(), row({ ruleValue: 'axial_load' })], { atMs: NOW });
    expect(blockingConflicts(s, SQUAT)).toEqual(demandConflicts(s, SQUAT));
  });

  test('the carved exercise reads eligible; the reason is null', () => {
    const s = buildCapabilityResolveState([row(), allow(SQUAT.id)], { atMs: NOW });
    expect(capabilityBlockReason(s, SQUAT)).toBeNull();
  });
});

describe('the serve/excusal consumers inherit the carve through episodeConflicts', () => {
  const isEligibleRow = () => true; // the senior question is not under test here

  test('an allowed exercise is served UNCHANGED under an applied episode rule', () => {
    const s = buildCapabilityResolveState([row(), allow(SQUAT.id)], { atMs: NOW });
    expect(episodeConflicts(s, SQUAT)).toEqual([]);
    const view = computeEffectiveSession(
      [{ exercise: SQUAT }], [SQUAT, LEGPRESS], s, isEligibleRow,
    );
    expect(view.lines[0].effect).toBe(EFFECTIVE_EFFECT.UNCHANGED);
    expect(view.anyEffect).toBe(false);
  });

  test('without the allowance the same rule substitutes - the carve is the difference', () => {
    const s = buildCapabilityResolveState([row()], { atMs: NOW });
    const view = computeEffectiveSession(
      [{ exercise: SQUAT }], [SQUAT, LEGPRESS], s, isEligibleRow,
    );
    expect(view.lines[0].effect).toBe(EFFECTIVE_EFFECT.SUBSTITUTED);
    expect(view.lines[0].exerciseTo?.id).toBe(LEGPRESS.id);
  });

  test('an unperformed allowed exercise is NOT excused as constraint-driven', () => {
    const s = buildCapabilityResolveState([row(), allow(SQUAT.id)], { atMs: NOW });
    const { entries, excusedIds, unperformedIds } = computeCompletionEffects(
      [{ exercise: SQUAT, performed: false }], s,
    );
    expect(entries).toEqual([]);
    expect(excusedIds).toEqual([]);
    expect(unperformedIds).toEqual([SQUAT.id]); // ordinary early stop, still owed
  });

  test('a clinician episode rule still substitutes despite the allowance', () => {
    const s = buildCapabilityResolveState(
      [row({ source: 'clinician_reported' }), allow(SQUAT.id)], { atMs: NOW },
    );
    const view = computeEffectiveSession(
      [{ exercise: SQUAT }], [SQUAT, LEGPRESS], s, isEligibleRow,
    );
    expect(view.lines[0].effect).toBe(EFFECTIVE_EFFECT.SUBSTITUTED);
  });
});

describe('source guard - the two consumers outside episodeConflicts', () => {
  test('CoachOutputScreen scans decide with blockingConflicts, never raw demandConflicts', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'screens', 'CoachOutputScreen.js'), 'utf8',
    );
    expect(src).not.toMatch(/\bdemandConflicts\b/);
    // Both scans present: the Apply-time volume holds and affectedMuscles.
    const calls = src.match(/blockingConflicts\(capState, ex\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
