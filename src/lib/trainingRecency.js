/**
 * trainingRecency.js — Task 2 (recovery/freshness UI factual-language
 * amendment). ONE authority for "how recently was this trained", stating
 * only what a logged timestamp establishes.
 *
 * Volyume has no biological recovery signal - no HRV, no soreness time
 * series, nothing beyond a workout timestamp - so no surface may present
 * elapsed time as though it were one. This module deliberately does NOT
 * infer recovered / ready / fresh / fatigued / nearly-ready, and it never
 * produces a recovery percentage or a recovery "window". It answers a
 * narrower, honest question: when was this last trained, or do we not know.
 *
 * This replaces two independent, disagreeing systems that both over-claimed
 * from the same kind of data:
 *   - muscleRecovery.js (now deleted): banded elapsed time against a
 *     per-muscle "recovery window" into fatigued/recovering/fresh.
 *   - ReadinessCards.js's own inline freshnessMetaLive: banded elapsed
 *     HOURS into Just trained/Recovering/Nearly ready/Ready, and treated
 *     NO recorded training at all (`!lastTrainedAt`) as 'Ready' - missing
 *     evidence read as a POSITIVE readiness verdict. That defect is why this
 *     module treats "no evidence" and "evidence not yet available" the same
 *     way: `known: false`, never a guess in either direction.
 *
 * PURE. No I/O, no randomness; the caller passes nowMs.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {number|null|undefined} lastTrainedAtMs  epoch ms of the last
 *   completed working set for this muscle/exercise, or null/undefined if
 *   none has ever been logged
 * @param {number} [nowMs]
 * @returns {{ known: boolean, daysAgo: number|null, label: string }}
 *
 * `known` is false, and the label is always 'Not logged', for: no evidence
 * at all, a non-finite or non-positive timestamp (malformed data), or a
 * timestamp AFTER nowMs (clock skew / corrupt data) - none of these are
 * evidence of anything, so none of them may read as a positive OR a
 * negative state.
 */
export function trainingRecency(lastTrainedAtMs, nowMs = Date.now()) {
  const last = Number(lastTrainedAtMs);
  const now = Number(nowMs);
  if (!Number.isFinite(last) || last <= 0 || !Number.isFinite(now) || last > now) {
    return { known: false, daysAgo: null, label: 'Not logged' };
  }
  const daysAgo = Math.floor((now - last) / MS_PER_DAY);
  if (daysAgo <= 0) return { known: true, daysAgo: 0, label: 'Trained within 24h' };
  if (daysAgo === 1) return { known: true, daysAgo: 1, label: 'Trained 1 day ago' };
  return { known: true, daysAgo, label: `Trained ${daysAgo} days ago` };
}
