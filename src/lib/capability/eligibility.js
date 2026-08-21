/**
 * capability/eligibility.js - the CC30 learning-eligibility questions
 * (ARCHITECTURE section 7 matrix; sections 28, 33.4; CC-D17).
 *
 * Pure interval-join over raw capability_constraints rows: historical
 * training is interpreted under the capability state that was EFFECTIVE
 * when the evidence occurred (isConstraintActiveAt handles ended,
 * superseded and promoted lifecycles; rows predating capability support
 * simply produce an empty state = ordinary training).
 *
 * Scope law (lead-ruled, recorded in the bundle tracker):
 *  - EPISODE-role rules only define constrained scope. Baseline rules are
 *    the user's normal (CAP-1) and NEVER suspend learning.
 *  - DEFINITE conflicts only (clinician/declared ranks). A CAP-8 unknown
 *    blocks suggestion, but "we do not know this movement's demands" is
 *    not evidence the user trained under restriction, and over-marking
 *    would wrongly suspend a disabled user's ordinary learning.
 *  - Allowances still carve: an exercise the user allowed through is
 *    genuinely representative training.
 *
 * Downstream learning consumers stay capability-BLIND: they read the
 * provenance these answers stamp at gather time (entry.eligibility on
 * ledgers, cause on swaps), never this module.
 */
import { isConstraintActiveAt } from './model';
import { buildCapabilityResolveState, capabilityBlockReason, CAPABILITY_BLOCK } from './resolve';

/** Rows that define constrained scope: episode rules + every allowance. */
export function episodeScopeRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter(
    (r) => r && (r.role === 'episode' || r.ruleKind === 'exercise_allow'),
  );
}

/**
 * The capability watermark: the newest write this device has seen across
 * the user's capability rows (any role, tombstones included by callers
 * that pass them). Recorded on every computed ledger so a backdated or
 * late-synced row can be detected and the eligibility RESTAMPED
 * (section 33.4 / CC-D17). 0 = no rows known.
 */
export function capabilityWatermark(rows) {
  let max = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    const t = r?.updatedAt ?? r?.createdAt ?? r?.startsAt ?? 0;
    if (Number.isFinite(t) && t > max) max = t;
  }
  return max;
}

/** Was this exercise under a DEFINITE episode conflict at atMs? */
export function isExerciseConstrainedAt(rows, exercise, atMs) {
  const state = buildCapabilityResolveState(episodeScopeRows(rows), { atMs });
  if (state.empty) return false;
  const reason = capabilityBlockReason(state, exercise);
  return reason !== null && reason !== CAPABILITY_BLOCK.UNKNOWN;
}

/** The muscles under a definite episode conflict at atMs. */
export function constrainedMusclesAt(rows, library, atMs) {
  const muscles = new Set();
  const state = buildCapabilityResolveState(episodeScopeRows(rows), { atMs });
  if (state.empty) return muscles;
  for (const ex of Array.isArray(library) ? library : []) {
    const reason = capabilityBlockReason(state, ex);
    if (reason !== null && reason !== CAPABILITY_BLOCK.UNKNOWN && ex?.primaryMuscle) {
      muscles.add(ex.primaryMuscle);
    }
  }
  return muscles;
}

/**
 * The muscles constrained at ANY point inside [fromMs, toMs). Exact, not
 * sampled: scope only changes at row lifecycle boundaries, so evaluating
 * at the window start plus every in-window boundary covers every
 * interval. A muscle in this set gets `eligibility:'constrained'` on the
 * block's ledger entry - partially-constrained evidence is confounded
 * evidence, and the safe direction for LEARNING is out (CAP-12).
 */
export function constrainedMusclesInWindow(rows, library, fromMs, toMs) {
  const scoped = episodeScopeRows(rows);
  const points = new Set([fromMs]);
  for (const r of scoped) {
    if (Number.isFinite(r?.startsAt) && r.startsAt > fromMs && r.startsAt < toMs) points.add(r.startsAt);
    if (Number.isFinite(r?.endedAt) && r.endedAt > fromMs && r.endedAt < toMs) points.add(r.endedAt);
  }
  const out = new Set();
  for (const at of points) {
    for (const m of constrainedMusclesAt(rows, library, at)) out.add(m);
  }
  return out;
}

/**
 * Fast pre-check: does the user have ANY row that could define episode
 * scope overlapping [fromMs, toMs)? Lets hot paths (plateau input,
 * adapted-landmark history) skip the per-row interval work entirely for
 * the overwhelmingly common no-episode case.
 */
export function anyEpisodeOverlap(rows, fromMs, toMs) {
  return (Array.isArray(rows) ? rows : []).some((r) => r && r.role === 'episode'
    && isConstraintActiveAt(r, Math.max(fromMs, r.startsAt ?? fromMs))
    && (r.startsAt ?? 0) < toMs
    && (r.endedAt == null || r.endedAt > fromMs));
}
