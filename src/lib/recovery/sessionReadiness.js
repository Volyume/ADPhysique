/**
 * src/lib/recovery/sessionReadiness.js
 *
 * Reads a routine's planned volume against a recovery map to answer one
 * question: is this session's muscle demand estimated recovered enough to
 * train now (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 3.3)?
 *
 * A muscle only counts if the routine plans at least 2 sets on it - a
 * single incidental secondary-muscle credit should never make a whole
 * session read as "not ready". The routine's readiness is the MINIMUM
 * recoveredPercent over its counted muscles (the limiting one is named), so
 * one under-recovered muscle correctly holds the whole session back; a
 * sets-weighted mean rides alongside for display, never for the verdict. A
 * muscle the recovery map marks 'no_recent_session' (or has no entry at
 * all) counts as 100 - "never trained recently" is not evidence of being
 * unready.
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
 *   limitingReadyAtMs: number|null,
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

  if (!muscles.length) {
    return {
      verdict: 'ready',
      minPercent: 100,
      weightedPercent: 100,
      limitingMuscle: null,
      limitingReadyAtMs: null,
      muscles: [],
    };
  }

  let minPercent = Infinity;
  let limitingMuscle = null;
  let weightedSum = 0;
  let totalSets = 0;
  for (const m of muscles) {
    weightedSum += m.recoveredPercent * m.plannedSets;
    totalSets += m.plannedSets;
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

  return { verdict, minPercent, weightedPercent, limitingMuscle, limitingReadyAtMs, muscles };
}
