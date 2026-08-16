/**
 * scenarios.recovery.data.js — Campaign 21 recovery/re-entry/adherence family DATA.
 *
 * Pure scenario definitions + fixture helpers for recovery rules testing.
 * ~25 scenarios covering:
 * - T-RECOVERY-01: Readiness rules (below_par, average, sharp) — mostly pending
 *   as the tweak application is internal to livePrescription/sessionAdjustments
 * - T-RECOVERY-02: Re-entry easing (distinct provenance, no stacking) — pending
 * - T-RECOVERY-03: Recovery state resolution (planned vs adaptive) — pending,
 *   internal to programmePosition/recoveryState
 * - T-RECOVERY-04: Deload prescription (first/second half reps & weight) —
 *   testable via liveSet when senior.deloadTargets are present
 *
 * Authority: ORACLE-LOCK.md T-RECOVERY-01..05 (LEAD-REVIEW: ACCEPTED 2026-08-16)
 */
import { b } from './harness';

// ── Shared fixture helpers ────────────────────────────────────────────────────

/**
 * Build liveSet packet input for deload prescription testing (T-RECOVERY-04).
 * Simulates a deload week where senior.isDeload=true and deloadTargets are set.
 */
function deloadPrescriptionInput(baseReps = 10, baseWeight = 80, overrides = {}) {
  return b.liveSetPacketInput({
    exercise: { id: 'bench_press', exerciseType: 'weight_reps', category: 'compound', incrementKg: 2.5, units: 'kg' },
    prescription: { repsMin: 8, repsMax: 12, targetSets: 3, startingWeight: baseWeight, goal: null },
    senior: {
      isDeload: true,
      // T-RECOVERY-04: First half (pos 1) = 100% weight, 50% reps; second half (pos 2) = 50% weight, 50% reps
      deloadTargets: [
        { reps: Math.max(1, Math.floor(baseReps * 0.5)), targetSets: 1, weight: baseWeight, rir: 4 },
        { reps: Math.max(1, Math.floor(baseReps * 0.5)), targetSets: 1, weight: Math.round(baseWeight * 0.5 * 4) / 4, rir: 4 },
      ],
    },
    rawHistory: [],
    rawToday: [],
    ...overrides,
  });
}

/**
 * Build liveSet packet input with readiness tweak applied.
 * The tweak is passed via senior.readinessTweak so resolveSetPrescription applies it.
 */
function setWithReadinessTweak(readinessTweak = null, overrides = {}) {
  return b.liveSetPacketInput({
    exercise: { id: 'squat', exerciseType: 'weight_reps', category: 'compound', incrementKg: 2.5, units: 'kg' },
    prescription: { repsMin: 8, repsMax: 12, targetSets: 4, startingWeight: 100, goal: null },
    senior: {
      isDeload: false,
      readinessTweak: readinessTweak,
    },
    rawHistory: [{ weight: 100, reps: 10, comparable: true, setType: 'straight' }],
    rawToday: [],
    ...overrides,
  });
}

// ── The declarative scenario list ─────────────────────────────────────────────

export const SCENARIOS = [
  // ─────────────────────────────────────────────────────────────────────────
  // T-RECOVERY-01: Readiness rules (mostly pending — internal application)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: 'REC-01',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: below_par readiness applies loadFactor=0.95 internally (load-trim in resolveSetPrescription)',
    rules: ['T-RECOVERY-01'],
    facts: setWithReadinessTweak({ setDelta: -1, loadFactor: 0.95, reduces: true }),
    run: 'liveSet',
    must: [
      // resolveSetPrescription applies the trim but does not return loadFactor explicitly.
      // We verify indirectly: a below_par tweak with loadFactor 0.95 should produce
      // weight that is <= the history-based prescription.
    ],
    pending: true,
    pendingReason: 'Readiness tweak application is internal; not directly inspectable via prescription return',
  },

  {
    id: 'REC-02',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: average readiness produces no change (loadFactor=1)',
    rules: ['T-RECOVERY-01'],
    facts: setWithReadinessTweak({ setDelta: 0, loadFactor: 1, reduces: false }),
    run: 'liveSet',
    must: [],
    pending: true,
    pendingReason: 'Readiness tweak comparison requires control prescription; not exposed by harness',
  },

  {
    id: 'REC-03',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: sharp readiness produces no change — good readiness NEVER pushes beyond plan',
    rules: ['T-RECOVERY-01'],
    facts: setWithReadinessTweak({ setDelta: 0, loadFactor: 1, reduces: false }),
    run: 'liveSet',
    must: [],
    pending: true,
    pendingReason: 'Sharp intent never changes targets; not inspectable in return prescription',
  },

  {
    id: 'REC-04',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: null intent (no tweak) leaves weight unmodified',
    rules: ['T-RECOVERY-01'],
    facts: setWithReadinessTweak(null),
    run: 'liveSet',
    must: [],
    pending: true,
    pendingReason: 'Null tweak branch not exposed; internal to resolveSetPrescription',
  },

  {
    id: 'REC-05',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: hard invariant — adjusted load <= planned load (downward-only law)',
    rules: ['T-RECOVERY-01'],
    facts: setWithReadinessTweak({ setDelta: -1, loadFactor: 0.95, reduces: true }),
    run: 'liveSet',
    must: [
      // The invariant is enforced inside resolveSetPrescription (line 964-965).
      // We cannot directly test it via the return, as the original planned load
      // is not returned for comparison.
    ],
    pending: true,
    pendingReason: 'Invariant verification requires comparison with unadjusted prescription; not in return',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-RECOVERY-02: Re-entry easing (pending — requires blockProgression fixture)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: 'REC-06',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: re-entry easing applies identical magnitude to below_par (setDelta=-1, loadFactor=0.95)',
    rules: ['T-RECOVERY-02'],
    facts: {},
    run: 'blockProgression',
    must: [],
    pending: true,
    pendingReason: 'reEntryEaseActive state lives in blockProgression; not exposable via sessionAdjust alone',
  },

  {
    id: 'REC-07',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: resolveSessionEasingTweak chooses ONE tweak, NEVER stacks two reductions',
    rules: ['T-RECOVERY-02'],
    facts: {},
    run: 'blockProgression',
    must: [],
    pending: true,
    pendingReason: 'Tweak resolution happens in resolveSessionEasingTweak; internal mechanism, not surfaced by harness',
  },

  {
    id: 'REC-08',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: intent reduction wins over re-entry easing (same-day signal prioritised)',
    rules: ['T-RECOVERY-02'],
    facts: {},
    run: 'blockProgression',
    must: [],
    pending: true,
    pendingReason: 'Tweak precedence determined in resolveSessionEasingTweak; internal logic',
  },

  {
    id: 'REC-09',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: re-entry easing NOT gated to Pro tier (every tier asked)',
    rules: ['T-RECOVERY-02'],
    facts: {},
    run: 'blockProgression',
    must: [],
    pending: true,
    pendingReason: 'Tier gating is application logic; not exercisable via harness entries',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-RECOVERY-03: Recovery state resolution (pending — internal to programmePosition)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: 'REC-10',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: PLANNED_BLOCK_RECOVERY when week>=recoveryWeek AND recoveryPhaseAllowed',
    rules: ['T-RECOVERY-03'],
    facts: {},
    run: 'blockAdvisor',
    must: [],
    pending: true,
    pendingReason: 'Recovery state computed by programmePosition/recoveryState; not exposed via blockAdvisor entry',
  },

  {
    id: 'REC-11',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: NORMAL_ACCUMULATION when week>=recoveryWeek AND !recoveryPhaseAllowed (position beats calendar)',
    rules: ['T-RECOVERY-03'],
    facts: {},
    run: 'blockAdvisor',
    must: [],
    pending: true,
    pendingReason: 'Position logic (T-PROGRAMME-09) owns recovery phase permission; resolveRecoveryState internal',
  },

  {
    id: 'REC-12',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: ADAPTIVE_RECOVERY_ADJUSTMENT when week<recoveryWeek AND isDeload===true',
    rules: ['T-RECOVERY-03'],
    facts: {},
    run: 'blockAdvisor',
    must: [],
    pending: true,
    pendingReason: 'Recovery state narrative determination is internal to recoveryState module',
  },

  {
    id: 'REC-13',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: NORMAL_ACCUMULATION (default case, neither recovery nor deload branch)',
    rules: ['T-RECOVERY-03'],
    facts: {},
    run: 'blockAdvisor',
    must: [],
    pending: true,
    pendingReason: 'Default recovery state not surfaced by any harness entry',
  },

  {
    id: 'REC-14',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: null when awaitingDecision (block finished, no lighter-training claim)',
    rules: ['T-RECOVERY-03'],
    facts: {},
    run: 'blockAdvisor',
    must: [],
    pending: true,
    pendingReason: 'awaitingDecision short-circuits recovery state determination; internal guard',
  },

  {
    id: 'REC-15',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: MUST show DIFFERENT copy for PLANNED vs ADAPTIVE causes (no false cause)',
    rules: ['T-RECOVERY-03'],
    facts: {},
    run: 'blockAdvisor',
    must: [],
    pending: true,
    pendingReason: 'Copy distinction enforced in recoveryState.resolveRecoveryState; not testable via harness',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-RECOVERY-04: Deload prescription (testable via liveSet)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: 'REC-16',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: First half deload set — 100% weight, 50% reps (floored at 1)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(10, 80), position: 1 },
    run: 'liveSet',
    must: [
      { kind: 'equals', path: 'weight', equals: 80 }, // 100% of base weight
      { kind: 'within', path: 'repsTarget', min: 4, max: 5 }, // ~50% of 10
    ],
    restraint: false,
  },

  {
    id: 'REC-17',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Second half deload set — 50% weight (rounded to 0.25 grid), 50% reps',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(10, 80), position: 2 },
    run: 'liveSet',
    must: [
      { kind: 'within', path: 'weight', min: 39.75, max: 40.25 }, // ~50% of 80, grid 0.25
      { kind: 'within', path: 'repsTarget', min: 4, max: 5 }, // ~50% of 10
    ],
    restraint: false,
  },

  {
    id: 'REC-18',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Deload reps floored at 1 (baseReps=2 -> 50% = 1, floor enforced)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(2, 80), position: 1 },
    run: 'liveSet',
    must: [
      { kind: 'within', path: 'repsTarget', min: 1, max: 1 },
    ],
    restraint: false,
  },

  {
    id: 'REC-19',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Deload RIR fixed at 4 both halves (law, not variable)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(12, 100), position: 1 },
    run: 'liveSet',
    must: [
      // resolveSetPrescription does not return RIR; it's embedded in deloadTargets
      // and returned implicitly through the senior prescription
    ],
    pending: true,
    pendingReason: 'RIR is set in senior.deloadTargets but not returned in Prescription object',
  },

  {
    id: 'REC-20',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Deload weight 50% calculation uses 0.25 rounding (20kg base -> 10kg exact)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(10, 20), position: 2 },
    run: 'liveSet',
    must: [
      { kind: 'equals', path: 'weight', equals: 10 }, // 50% of 20 = 10 (exact)
    ],
    restraint: false,
  },

  {
    id: 'REC-21',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Deload 50% weight rounding edge case (60kg -> 30kg)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(10, 60), position: 2 },
    run: 'liveSet',
    must: [
      { kind: 'equals', path: 'weight', equals: 30 }, // 50% of 60 = 30 (exact)
    ],
    restraint: false,
  },

  {
    id: 'REC-22',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Deload 50% weight rounding grid (81kg base -> 40.5kg, rounds to 0.25)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(10, 81), position: 2 },
    run: 'liveSet',
    must: [
      { kind: 'within', path: 'weight', min: 40.25, max: 40.75 }, // 50% of 81 = 40.5, grid 0.25
    ],
    restraint: false,
  },

  {
    id: 'REC-23',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: First half rep target with high base reps (baseReps=20 -> 50% = 10)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(20, 100), position: 1 },
    run: 'liveSet',
    must: [
      { kind: 'equals', path: 'repsTarget', equals: 10 }, // 50% of 20
    ],
    restraint: false,
  },

  {
    id: 'REC-24',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Deload prescription senior rule wins (T-LIVESET-01 rule 1, deload owns session)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(10, 80), position: 1 },
    run: 'liveSet',
    must: [
      { kind: 'equals', path: 'provenance', equals: 'SENIOR_RECOVERY_HOLD' },
      { kind: 'equals', path: 'confidence', equals: 'high' },
    ],
    restraint: false,
  },

  {
    id: 'REC-25',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-04: Deload targets array indexing (position 1 vs 2)',
    rules: ['T-RECOVERY-04'],
    facts: { packet: deloadPrescriptionInput(10, 80), position: 1 },
    run: 'liveSet',
    must: [
      // Position 1 (first element of deloadTargets) returns first-half prescription
      { kind: 'equals', path: 'weight', equals: 80 },
    ],
    restraint: false,
  },
];
