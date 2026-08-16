/**
 * scenarios.recovery.data.js — Campaign 21 recovery/re-entry/adherence family DATA.
 *
 * Pure scenario definitions + fixture helpers for recovery rules testing.
 * ~25 scenarios covering:
 * - T-RECOVERY-01: Readiness rules (below_par, average, sharp) — live via the
 *   `readiness` seam (sessionAdjustments.js getReadinessTweak/
 *   applyReadinessToLoad, both pure)
 * - T-RECOVERY-02: Re-entry easing (distinct provenance, no stacking) — live
 *   via the `readiness` seam (resolveSessionEasingTweak/getReEntryEaseTweak)
 * - T-RECOVERY-03: Recovery state resolution (planned vs adaptive) — live via
 *   the `recoveryState` seam (recoveryState.js resolveRecoveryState, pure)
 * - T-RECOVERY-04: Deload prescription (first/second half reps & weight) —
 *   testable via liveSet when senior.deloadTargets are present
 *
 * Authority: ORACLE-LOCK.md T-RECOVERY-01..05 (LEAD-REVIEW: ACCEPTED 2026-08-16)
 *
 * Campaign 21 Step 5: the sixteen `pending: true` scenarios (REC-01 through
 * REC-15, plus REC-19) were converted once the `readiness` and
 * `recoveryState` harness.js registry seams were added. Fifteen are now
 * live; REC-19 stays pending (its updated pendingReason cites the exact
 * lines confirming RIR is genuinely dropped from the returned object, not
 * merely assumed from the original comment).
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

// ── The declarative scenario list ─────────────────────────────────────────────

export const SCENARIOS = [
  // ─────────────────────────────────────────────────────────────────────────
  // T-RECOVERY-01: Readiness rules (live via the `readiness` seam)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: 'REC-01',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: below_par readiness resolves setDelta=-1, loadFactor=0.95, reduces=true (sessionAdjustments.js READINESS_RULES.below_par)',
    rules: ['T-RECOVERY-01'],
    facts: { _fn: 'getReadinessTweak', intent: 'below_par', chips: {} },
    run: 'readiness',
    must: [
      { kind: 'equals', path: 'setDelta', equals: -1 },
      { kind: 'equals', path: 'loadFactor', equals: 0.95 },
      { kind: 'equals', path: 'reduces', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'REC-02',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: average readiness produces no change - setDelta=0, loadFactor=1, reduces=false (HOLD)',
    rules: ['T-RECOVERY-01'],
    facts: { _fn: 'getReadinessTweak', intent: 'average', chips: {} },
    run: 'readiness',
    must: [
      { kind: 'equals', path: 'setDelta', equals: 0 },
      { kind: 'equals', path: 'loadFactor', equals: 1 },
      { kind: 'equals', path: 'reduces', equals: false },
    ],
    restraint: true,
  },

  {
    id: 'REC-03',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: sharp readiness produces no change plus an explicit acknowledgement - good readiness NEVER pushes beyond the plan (HOLD)',
    rules: ['T-RECOVERY-01'],
    facts: { _fn: 'getReadinessTweak', intent: 'sharp', chips: {} },
    run: 'readiness',
    must: [
      { kind: 'equals', path: 'setDelta', equals: 0 },
      { kind: 'equals', path: 'loadFactor', equals: 1 },
      { kind: 'equals', path: 'reduces', equals: false },
      { kind: 'contains', path: 'acknowledgement', contains: 'sharp' },
    ],
    restraint: true,
  },

  {
    id: 'REC-04',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: null intent (no answer given) resolves to null - no tweak, no fabricated reading',
    rules: ['T-RECOVERY-01'],
    facts: { _fn: 'getReadinessTweak', intent: null, chips: {} },
    run: 'readiness',
    must: [
      { kind: 'equals', path: '', equals: null },
    ],
    restraint: true,
  },

  {
    id: 'REC-05',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-01: HARD INVARIANT - applyReadinessToLoad never returns above the planned load, and a below_par trim rounds DOWN to the 0.25 grid (100kg*0.95=95kg exactly, downward-only)',
    rules: ['T-RECOVERY-01'],
    facts: { _fn: 'applyReadinessToLoad', plannedLoad: 100, tweak: { loadFactor: 0.95 } },
    run: 'readiness',
    must: [
      { kind: 'equals', path: 'value', equals: 95 },
      { kind: 'within', path: 'value', min: 1, max: 100 },
    ],
    mustNot: [
      { kind: 'within', path: 'value', min: 100.0001, max: 999 },
    ],
    restraint: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-RECOVERY-02: Re-entry easing (live via the `readiness` seam)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: 'REC-06',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: re-entry easing applies the IDENTICAL magnitude as below_par (setDelta=-1, loadFactor=0.95) when reEntryEaseActive and the intent sheet itself did not reduce, tagged athlete_reentry_choice not below_par',
    rules: ['T-RECOVERY-02'],
    facts: { _fn: 'resolveSessionEasingTweak', input: { intent: null, chips: {}, reEntryEaseActive: true } },
    run: 'readiness',
    must: [
      { kind: 'equals', path: 'setDelta', equals: -1 },
      { kind: 'equals', path: 'loadFactor', equals: 0.95 },
      { kind: 'equals', path: 'because', equals: 'athlete_reentry_choice' },
    ],
    mustNot: [
      { kind: 'equals', path: 'intent', equals: 'below_par' },
    ],
    restraint: false,
  },

  {
    id: 'REC-07',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: resolveSessionEasingTweak chooses ONE tweak object, NEVER stacks - a below_par intent WITH reEntryEaseActive still resolves to a single -1 set/0.95 load step, never -2 sets or a doubled load trim',
    rules: ['T-RECOVERY-02'],
    facts: { _fn: 'resolveSessionEasingTweak', input: { intent: 'below_par', chips: {}, reEntryEaseActive: true } },
    run: 'readiness',
    must: [
      { kind: 'equals', path: 'setDelta', equals: -1 },
      { kind: 'equals', path: 'loadFactor', equals: 0.95 },
    ],
    mustNot: [
      { kind: 'equals', path: 'setDelta', equals: -2 },
      { kind: 'equals', path: 'loadFactor', equals: 0.9025 },
      { kind: 'absent', path: 'because' },
    ],
    restraint: false,
  },

  {
    id: 'REC-08',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: intent reduction wins over re-entry easing - a same-day reason (poor sleep) already given leads, so whySets is the sleep-specific line, never the reentry "Welcome back" line',
    rules: ['T-RECOVERY-02'],
    facts: { _fn: 'resolveSessionEasingTweak', input: { intent: 'below_par', chips: { sleepQuality: 2 }, reEntryEaseActive: true } },
    run: 'readiness',
    must: [
      { kind: 'contains', path: 'whySets', contains: 'Rough night' },
    ],
    mustNot: [
      { kind: 'contains', path: 'whySets', contains: 'Welcome back' },
      { kind: 'equals', path: 'because', equals: 'athlete_reentry_choice' },
    ],
    restraint: false,
  },

  {
    id: 'REC-09',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-02: re-entry easing is NOT gated to Pro tier - getReEntryEaseTweak takes no tier parameter at all and always resolves the athlete_reentry_choice tweak, "a question every tier is asked"',
    rules: ['T-RECOVERY-02'],
    facts: { _fn: 'getReEntryEaseTweak' },
    run: 'readiness',
    must: [
      { kind: 'equals', path: 'because', equals: 'athlete_reentry_choice' },
      { kind: 'equals', path: 'setDelta', equals: -1 },
      { kind: 'equals', path: 'loadFactor', equals: 0.95 },
    ],
    restraint: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-RECOVERY-03: Recovery state resolution (live via the `recoveryState` seam)
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: 'REC-10',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: PLANNED_BLOCK_RECOVERY when week>=recoveryWeek AND recoveryPhaseAllowed - the block\'s own structural recovery week',
    rules: ['T-RECOVERY-03'],
    facts: { weekIndex: 6, plannedWeeks: 6, deloadWeek: 6, isDeload: false, awaitingDecision: false, recoveryPhaseAllowed: true },
    run: 'recoveryState',
    must: [
      { kind: 'equals', path: 'state', equals: 'planned_block_recovery' },
      { kind: 'equals', path: 'because', equals: 'block_recovery_week' },
    ],
    restraint: false,
  },

  {
    id: 'REC-11',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: NORMAL_ACCUMULATION when week>=recoveryWeek AND !recoveryPhaseAllowed - position beats calendar, an outstanding accumulation session holds the block in the hard part regardless of the date',
    rules: ['T-RECOVERY-03'],
    facts: { weekIndex: 6, plannedWeeks: 6, deloadWeek: 6, isDeload: false, awaitingDecision: false, recoveryPhaseAllowed: false },
    run: 'recoveryState',
    must: [
      { kind: 'equals', path: 'state', equals: 'normal_accumulation' },
      { kind: 'equals', path: 'because', equals: 'accumulation_work_outstanding' },
    ],
    mustNot: [
      { kind: 'equals', path: 'state', equals: 'planned_block_recovery' },
    ],
    restraint: false,
  },

  {
    id: 'REC-12',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: ADAPTIVE_RECOVERY_ADJUSTMENT when week<recoveryWeek AND isDeload===true - recovery evidence eased an accumulation week, a distinct cause from a planned recovery week',
    rules: ['T-RECOVERY-03'],
    facts: { weekIndex: 3, plannedWeeks: 6, deloadWeek: 6, isDeload: true, awaitingDecision: false, recoveryPhaseAllowed: true },
    run: 'recoveryState',
    must: [
      { kind: 'equals', path: 'state', equals: 'adaptive_recovery_adjustment' },
      { kind: 'equals', path: 'because', equals: 'recovery_evidence' },
    ],
    restraint: false,
  },

  {
    id: 'REC-13',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: NORMAL_ACCUMULATION is the default (neither the recovery-week branch nor the adaptive-deload branch fires) - the ordinary hard-training week',
    rules: ['T-RECOVERY-03'],
    facts: { weekIndex: 3, plannedWeeks: 6, deloadWeek: 6, isDeload: false, awaitingDecision: false, recoveryPhaseAllowed: true },
    run: 'recoveryState',
    must: [
      { kind: 'equals', path: 'state', equals: 'normal_accumulation' },
      { kind: 'equals', path: 'because', equals: 'accumulation_week' },
    ],
    restraint: true,
  },

  {
    id: 'REC-14',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: HOLD - null when awaitingDecision (block finished, no lighter-training claim on an undecided block)',
    rules: ['T-RECOVERY-03'],
    facts: { weekIndex: 6, plannedWeeks: 6, deloadWeek: 6, isDeload: false, awaitingDecision: true, recoveryPhaseAllowed: true },
    run: 'recoveryState',
    must: [
      { kind: 'equals', path: '', equals: null },
    ],
    restraint: true,
  },

  {
    id: 'REC-15',
    family: 'recovery',
    why: 'ORACLE T-RECOVERY-03: MUST show DIFFERENT copy for PLANNED vs ADAPTIVE causes ("NO FALSE CAUSE") - the adaptive state must never carry the planned-recovery-week cause code, proving the two are structurally distinct, not the same flag read twice',
    rules: ['T-RECOVERY-03'],
    facts: { weekIndex: 3, plannedWeeks: 6, deloadWeek: 6, isDeload: true, awaitingDecision: false, recoveryPhaseAllowed: true },
    run: 'recoveryState',
    must: [
      { kind: 'equals', path: 'because', equals: 'recovery_evidence' },
    ],
    mustNot: [
      { kind: 'equals', path: 'because', equals: 'block_recovery_week' },
      { kind: 'equals', path: 'state', equals: 'planned_block_recovery' },
    ],
    restraint: false,
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
    pendingReason: 'CONFIRMED STILL INEXPRESSIBLE (re-read src/lib/livePrescription.js:874-889): the SENIOR_RECOVERY_HOLD branch builds a NEW object {weight, repsTarget, repsBand, provenance, confidence, prefill, reference} from deloadTargets[idx] rather than returning the row verbatim - `rir` is read nowhere in that branch and never reaches the returned Prescription. No harness entry can observe a value the production function itself drops.',
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
