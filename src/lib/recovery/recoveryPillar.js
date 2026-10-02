/**
 * The Recovery row in the top card on Progress (register D208, founder
 * question 2026-09-26: "Should we have a place in Progress exclusively for
 * recovery rather than it being hidden behind a button for consistency?").
 * PURE: it reads the per-muscle estimate `loadMuscleRecovery` already
 * returns and says, in two short lines, how many muscles are still
 * recovering (and how many nearly recovered) and which will be last. The
 * same estimate, the same words ("estimated", "ready by"), the same ready-by
 * clause as the muscle list, so the row and the screen it opens can never
 * disagree.
 *
 * Describes only (D204): it never tells the athlete to rest, train or wait.
 */
import { muscleDisplayName } from '../algorithms';
import { readyClause } from './nextWorkoutRecommendation';

/**
 * @param {object|null|undefined} load `loadMuscleRecovery`'s result:
 *   undefined while loading, null or `{ degraded: true }` when the read
 *   failed, otherwise `{ map, nowMs }`.
 * @returns {{ state: (string|null), evidence: (string|null) }}
 */
export function buildRecoveryPillarCopy(load) {
  if (load === undefined) return { state: null, evidence: null };
  if (!load || load.degraded || !load.map) {
    return { state: 'Estimated recovery by muscle', evidence: "Couldn't load the estimate just now." };
  }
  const nowMs = Number.isFinite(load.nowMs) ? load.nowMs : Date.now();
  const rows = Object.values(load.map).filter((e) => e && e.status && e.status !== 'no_recent_session');
  if (rows.length === 0) {
    return {
      state: 'No sessions in the last 14 days',
      evidence: "Each muscle's recovery shows here after a session.",
    };
  }
  // D214 (RC-4): the headline counts the muscles still RECOVERING only, the
  // same count as the screen's "Still recovering" group, and names the
  // nearly-recovered ones after it ("and 2 nearly recovered"), so the row and
  // the screen it opens can never disagree.
  const recovering = rows.filter((e) => e.status === 'recovering');
  const nearly = rows.filter((e) => e.status === 'nearly');
  const notRecovered = rows.filter((e) => e.status !== 'recovered');
  if (notRecovered.length === 0) {
    return {
      state: 'All muscles recovered',
      evidence: 'Estimated from your sessions in the last 14 days.',
    };
  }
  // The last muscle to be ready (any muscle not yet recovered): the latest
  // ready-by instant; a muscle with no finite instant sorts first so a known
  // time always wins.
  const last = [...notRecovered].sort((a, b) => {
    const ra = Number.isFinite(a.readyAtMs) ? a.readyAtMs : -Infinity;
    const rb = Number.isFinite(b.readyAtMs) ? b.readyAtMs : -Infinity;
    return rb - ra || String(a.muscle).localeCompare(String(b.muscle));
  })[0];
  const n = recovering.length;
  const m = nearly.length;
  const nearlyClause = `${m} nearly recovered`;
  let state;
  if (n > 0) {
    state = `${n} muscle${n === 1 ? '' : 's'} still recovering${m > 0 ? ` and ${nearlyClause}` : ''}`;
  } else {
    state = `${m} muscle${m === 1 ? '' : 's'} nearly recovered`;
  }
  return {
    state,
    // "Glutes will be the last to recover, estimated ready by Saturday." (RC-15:
    // "the last" alone read as ambiguous).
    evidence: `${muscleDisplayName(last.muscle)} will be the last to recover, estimated ${readyClause(last.readyAtMs, nowMs)}.`,
  };
}
