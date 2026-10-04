/**
 * src/lib/recovery/sessionReadiness.js
 *
 * Reads a routine's planned volume against a recovery map to answer one
 * question: is this session's muscle demand estimated recovered enough to
 * train now (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 3.3)?
 *
 * A muscle only counts if the routine plans at least 2 PRIMARY sets on it
 * (the caller passes primary sets, load.js's loadPlannedSetsByRoutine) - a
 * secondary-muscle credit never makes a whole session read as "not ready"
 * (spec 3.3 "primary-loaded"; Opus review finding 12). The routine's
 * readiness is the MINIMUM recoveredPercent over its counted muscles (the
 * limiting one is named), so one under-recovered muscle correctly holds
 * the whole session back; a sets-weighted mean rides alongside for
 * display, never for the verdict. A muscle the recovery map marks
 * 'no_recent_session' (or has no entry at all) counts as 100 for the
 * verdict - "never trained recently" is not evidence of being unready -
 * but `evidence` is false when NO counted muscle has a session behind it,
 * so a caller never prints "estimated recovered" off no data at all
 * (spec section 1; Opus review finding 2).
 *
 * D219 (design 4.13, last row, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md): the result also names the muscle estimated
 * recovered LAST among the counted ones (`latestMuscle`) and that muscle's own
 * ready time (`latestReadyAtMs`). The limiting muscle is the least recovered
 * NOW; the latest muscle is the one whose ready time is furthest away, and
 * they are often different (calves 11% recovered, ready in 28 h, can limit a
 * session whose quads are not ready for 61 h). "Every muscle in this session
 * is estimated recovered by <time>" is only true at the LATEST ready time, so
 * that is the field a sentence like it reads. Both are null when no counted
 * muscle has a ready time pending (all recovered, no evidence, nothing
 * counted). The limiting fields and the verdict are exactly as before.
 *
 * PURE. No I/O, no clock.
 */
import { READY_PERCENT, NEARLY_PERCENT } from './constants';

/**
 * @param {object} plannedSetsByMuscle - { [muscle]: weekly/session sets },
 *   e.g. planVolumeTargets.plannedWeeklyVolumeByMuscle([routine]).
 * @param {object} recoveryMap - a muscleRecoveryModel.buildMuscleRecoveryMap
 *   (or projectRecovery) result: { [muscle]: { recoveredPercent, status,
 *   readyAtMs, ... } }.
 * @returns {{ verdict: 'ready'|'nearly'|'not_yet', minPercent: number,
 *   weightedPercent: number, limitingMuscle: string|null,
 *   limitingReadyAtMs: number|null, latestMuscle: string|null,
 *   latestReadyAtMs: number|null, evidence: boolean,
 *   muscles: Array<{ muscle: string, plannedSets: number,
 *   recoveredPercent: number, status: string }> }}
 */
export function sessionReadiness(plannedSetsByMuscle, recoveryMap) {
  const planned = plannedSetsByMuscle ?? {};
  const map = recoveryMap ?? {};

  const muscles = [];
  for (const muscle of Object.keys(planned)) {
    const plannedSets = Number(planned[muscle]);
    if (!Number.isFinite(plannedSets) || plannedSets < 2) continue;
    const entry = map[muscle];
    // No entry at all reads exactly like 'no_recent_session': never a
    // reason to hold a session back.
    const recoveredPercent = entry ? entry.recoveredPercent : 100;
    const status = entry ? entry.status : 'no_recent_session';
    muscles.push({ muscle, plannedSets, recoveredPercent, status });
  }

  // At least one counted muscle has a logged session behind its reading.
  const evidence = muscles.some((m) => m.status !== 'no_recent_session');

  if (!muscles.length) {
    return {
      verdict: 'ready',
      minPercent: 100,
      weightedPercent: 100,
      limitingMuscle: null,
      limitingReadyAtMs: null,
      latestMuscle: null,
      latestReadyAtMs: null,
      evidence: false,
      muscles: [],
    };
  }

  let minPercent = Infinity;
  let limitingMuscle = null;
  let latestMuscle = null;
  let latestReadyAtMs = null;
  let weightedSum = 0;
  let totalSets = 0;
  for (const m of muscles) {
    weightedSum += m.recoveredPercent * m.plannedSets;
    totalSets += m.plannedSets;
    // Strict greater-than: on a tie the FIRST muscle stays named, as for the
    // limiting muscle. A muscle with no pending ready time (already
    // recovered, no recent session, or no entry) has nothing to wait for.
    const readyAtMs = map[m.muscle]?.readyAtMs ?? null;
    if (Number.isFinite(readyAtMs) && (latestReadyAtMs === null || readyAtMs > latestReadyAtMs)) {
      latestReadyAtMs = readyAtMs;
      latestMuscle = m.muscle;
    }
    // Strict less-than: the FIRST muscle to reach a new minimum stays named
    // (stable, deterministic over plannedSetsByMuscle's own key order).
    if (m.recoveredPercent < minPercent) {
      minPercent = m.recoveredPercent;
      limitingMuscle = m.muscle;
    }
  }
  const weightedPercent = totalSets > 0 ? weightedSum / totalSets : 100;
  const verdict = minPercent >= READY_PERCENT
    ? 'ready'
    : (minPercent >= NEARLY_PERCENT ? 'nearly' : 'not_yet');
  const limitingEntry = limitingMuscle ? map[limitingMuscle] : null;
  const limitingReadyAtMs = limitingEntry ? (limitingEntry.readyAtMs ?? null) : null;

  return {
    verdict, minPercent, weightedPercent, limitingMuscle, limitingReadyAtMs, latestMuscle, latestReadyAtMs, evidence, muscles,
  };
}
