/**
 * Capability store orchestration (CC26). Thin layer over database.js rows
 * plus the pure model: loads the state object every capability surface
 * reads, and runs the lifecycle actions. NO selection, ranking, coaching
 * or learning behaviour lives here - those campaigns (CC27+) build on the
 * state this returns. Inert by design until then.
 *
 * Consent gate (CAP-20): createConstraint refuses without the granular
 * capability consent - fail CLOSED for writes. Consent is present when
 * the local grant flag is set OR capability rows already exist for the
 * user (rows exist only under consent; withdrawal tombstones them
 * everywhere, so a synced-in device inherits consent with the data and
 * loses both together).
 */
import {
  createCapabilityConstraint, getCapabilityConstraints,
  endCapabilityConstraint, endCapabilityEpisode, extendCapabilityEpisode,
  promoteCapabilityEpisode, supersedeCapabilityConstraint,
} from '../database';
import { getLocalCapabilityConsent } from '../consent/capabilityConsent';
import { logError } from '../errorLog';
import {
  CONSTRAINT_ROLE, CONSTRAINT_STATE, ENDED_REASON,
  episodeStatus, constraintStatus,
} from './model';

export { ENDED_REASON };

/**
 * The single loader (the C31 one-loader pattern). Returns
 * { baseline, episodes, history, unavailable } where episodes are grouped
 * with a derived status. Read failures return an EMPTY state with
 * unavailable: true - the caller shows a notice; nothing is fabricated
 * (CAP-17; the suggestion-surface fail-closed gate is CC27's pre-flight).
 */
export async function loadCapabilityState(userId, { nowMs = Date.now() } = {}) {
  const empty = { baseline: [], episodes: [], history: [], unavailable: false };
  if (!userId) return empty;
  let rows;
  try {
    rows = await getCapabilityConstraints(userId, { includeEnded: true });
  } catch (e) {
    logError('capability.load', e, {});
    return { ...empty, unavailable: true };
  }
  const baseline = [];
  const history = [];
  const groups = new Map();
  for (const r of rows) {
    if (r.role === CONSTRAINT_ROLE.EPISODE && r.episodeGroupId) {
      if (!groups.has(r.episodeGroupId)) groups.set(r.episodeGroupId, []);
      groups.get(r.episodeGroupId).push(r);
    } else if (r.state === CONSTRAINT_STATE.ACTIVE) {
      baseline.push(r);
    } else {
      history.push(r);
    }
  }
  const episodes = [];
  for (const [groupId, groupRows] of groups) {
    const status = episodeStatus(groupRows, nowMs);
    const entry = { groupId, status, rows: groupRows };
    if (status === 'ended') history.push(...groupRows);
    else episodes.push(entry);
  }
  return { baseline, episodes, history, unavailable: false };
}

/** Consent presence per the store's derivation rule (header). */
export async function hasCapabilityConsent(userId) {
  if (!userId) return false;
  const flag = await getLocalCapabilityConsent(userId);
  if (flag === true) return true;
  if (flag === false) return false; // explicit withdrawal on this device
  try {
    const rows = await getCapabilityConstraints(userId, { includeEnded: true });
    return rows.length > 0;
  } catch (_) { return false; }
}

/**
 * Create one constraint (or one rule of an episode group). Refuses
 * without consent; validation is the model's, enforced again in
 * database.js. Returns the new row id.
 */
export async function createConstraint(userId, input, { nowMs = Date.now() } = {}) {
  if (!(await hasCapabilityConsent(userId))) {
    throw new Error('capability_consent_required');
  }
  return createCapabilityConstraint(userId, input, { nowMs });
}

export async function endConstraint(userId, id, { nowMs = Date.now() } = {}) {
  return endCapabilityConstraint(userId, id, ENDED_REASON.USER_ENDED, { nowMs });
}

export async function endEpisode(userId, groupId, { nowMs = Date.now(), reason = ENDED_REASON.USER_ENDED } = {}) {
  return endCapabilityEpisode(userId, groupId, reason, { nowMs });
}

export async function extendEpisode(userId, groupId, newEndsAtMs, { nowMs = Date.now() } = {}) {
  return extendCapabilityEpisode(userId, groupId, newEndsAtMs, { nowMs });
}

export async function promoteEpisode(userId, groupId, { nowMs = Date.now() } = {}) {
  return promoteCapabilityEpisode(userId, groupId, { nowMs });
}

export async function supersedeConstraint(userId, id, newInput, { nowMs = Date.now() } = {}) {
  if (!(await hasCapabilityConsent(userId))) {
    throw new Error('capability_consent_required');
  }
  return supersedeCapabilityConstraint(userId, id, newInput, { nowMs });
}

export { constraintStatus };
