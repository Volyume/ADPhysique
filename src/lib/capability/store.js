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
  createCapabilityConstraint, createCapabilityConstraints,
  getCapabilityConstraints,
  endCapabilityConstraint, endCapabilityEpisode, extendCapabilityEpisode,
  promoteCapabilityEpisode, supersedeCapabilityConstraint,
  acknowledgeCapabilityEpisode,
  getAllSessionConstraintEffectsForUser,
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

/**
 * Multi-input create in ONE transaction (the multi-axis add flow): all
 * rows land or none do, so the save error copy can honestly say nothing
 * changed. Same consent gate as the single creator.
 */
export async function createConstraints(userId, inputs, { nowMs = Date.now() } = {}) {
  if (!(await hasCapabilityConsent(userId))) {
    throw new Error('capability_consent_required');
  }
  return createCapabilityConstraints(userId, inputs, { nowMs });
}

// ENDING is deliberately NOT consent-gated: the user must always be able
// to stop a constraint applying, consent state notwithstanding - an end
// only closes rows, it mints nothing.
export async function endConstraint(userId, id, { nowMs = Date.now() } = {}) {
  return endCapabilityConstraint(userId, id, ENDED_REASON.USER_ENDED, { nowMs });
}

export async function endEpisode(userId, groupId, { nowMs = Date.now(), reason = ENDED_REASON.USER_ENDED } = {}) {
  return endCapabilityEpisode(userId, groupId, reason, { nowMs });
}

// Extend lengthens live rows' planned end and promote mints new baseline
// rows - both EXTEND the lane's future application, so they carry the
// same write gate as create (red-team finding 8: a device that has
// learned of withdrawal must not keep the lane alive for the account).
export async function extendEpisode(userId, groupId, newEndsAtMs, { nowMs = Date.now() } = {}) {
  if (!(await hasCapabilityConsent(userId))) {
    throw new Error('capability_consent_required');
  }
  return extendCapabilityEpisode(userId, groupId, newEndsAtMs, { nowMs });
}

export async function promoteEpisode(userId, groupId, { nowMs = Date.now() } = {}) {
  if (!(await hasCapabilityConsent(userId))) {
    throw new Error('capability_consent_required');
  }
  return promoteCapabilityEpisode(userId, groupId, { nowMs });
}

// "Keep it active for now" (section 33.7's third AWAITING option). Not
// consent-gated: it mints nothing and extends nothing - it stamps when
// the user last answered the confirm, so the prompt cadence can decay.
export async function acknowledgeEpisode(userId, groupId, { nowMs = Date.now() } = {}) {
  return acknowledgeCapabilityEpisode(userId, groupId, { nowMs });
}

// CC33 D112 R8 (section 25; closes audit T2-26): "just hold my plan" -
// the per-episode agency valve. 'hold' pauses the app's own adaptation
// for the episode (serve substitution, proposals, coach volume holds,
// excusal); 'propose' resumes it. Suggestion surfaces keep honouring
// the rules either way - offering excluded work would be the fail-open
// harm. Not consent-gated: like acknowledge it mints nothing, it
// records a choice about rows that already exist.
export async function setEpisodeAdaptationMode(userId, groupId, mode, _opts = {}) {
  // eslint-disable-next-line global-require
  const { setCapabilityAdaptationMode } = require('../database');
  return setCapabilityAdaptationMode(userId, groupId, mode);
}

export async function supersedeConstraint(userId, id, newInput, { nowMs = Date.now() } = {}) {
  if (!(await hasCapabilityConsent(userId))) {
    throw new Error('capability_consent_required');
  }
  return supersedeCapabilityConstraint(userId, id, newInput, { nowMs });
}

/**
 * Article 20 portability export of the capability lane (CAP-20, R1 #22):
 * structured, machine-readable JSON of every non-erased constraint row
 * (ended history included) plus session effects and the consent state.
 * Tombstoned rows are erased data and never appear. NOT consent-gated:
 * reading your own data out is a data-subject right, not new processing.
 * ISO 8601 timestamps for portability; epoch ms stays an internal format.
 */
export async function buildCapabilityExport(userId, { nowMs = Date.now() } = {}) {
  if (!userId) return null;
  const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());
  const rows = await getCapabilityConstraints(userId, { includeEnded: true });
  const effects = (await getAllSessionConstraintEffectsForUser(userId))
    .filter((e) => e.deletedAt == null);
  const flag = await getLocalCapabilityConsent(userId);
  return {
    format: 'volyume.capability-export',
    version: 1,
    exported_at: iso(nowMs),
    consent: {
      // true/false = the flag this device holds; null = no local record
      // (state then follows the rows, per the store's derivation rule).
      granted_on_this_device: flag === true ? true : flag === false ? false : null,
    },
    constraints: rows.map((r) => ({
      id: r.id,
      role: r.role,
      source: r.source,
      rule_kind: r.ruleKind,
      rule_value: r.ruleValue,
      laterality: r.laterality ?? null,
      starts_at: iso(r.startsAt),
      ends_at: iso(r.endsAt),
      state: r.state,
      ended_at: iso(r.endedAt),
      ended_reason: r.endedReason ?? null,
      episode_group_id: r.episodeGroupId ?? null,
      acknowledged_at: iso(r.acknowledgedAt),
      created_at: iso(r.createdAt),
      updated_at: iso(r.updatedAt),
    })),
    session_effects: effects.map((e) => {
      let parsed = null;
      try { parsed = JSON.parse(e.effectsJson); } catch (_) { parsed = e.effectsJson ?? null; }
      return {
        id: e.id,
        workout_id: e.workoutId,
        effects: parsed,
        created_at: iso(e.createdAt),
        updated_at: iso(e.updatedAt),
      };
    }),
  };
}

export { constraintStatus };
