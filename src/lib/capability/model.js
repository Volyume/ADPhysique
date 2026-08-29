/**
 * Capability domain model - pure contracts, no I/O. CC26 (capability
 * foundations), built to docs/capability-campaign-25-2026-08-20/
 * ARCHITECTURE.md sections 2, 5, 8.2 and 22, under the CAP laws.
 *
 * THE LANE LAW (CAP-4): this module and everything under src/lib/capability/
 * is the Article 9 capability lane. It never imports from, writes to, or
 * reasons about the preference lane (exercise_intent and friends), and the
 * preference lane never imports this. Pinned by capabilityGuards.test.js.
 *
 * Determinism: nothing here reads the clock. Every status question takes
 * nowMs from the caller. Pinned by the guard suite.
 */

// ── Row vocabulary (ARCHITECTURE section 5.1) ────────────────────────────

export const CONSTRAINT_ROLE = Object.freeze({
  // Defines this user's NORMAL training (CAP-1). Open-ended: no planned end.
  BASELINE: 'baseline',
  // A temporary departure from their normal (CAP-11/12).
  EPISODE: 'episode',
});

export const CONSTRAINT_SOURCE = Object.freeze({
  SELF: 'self',
  // The USER reports a professional's instruction. Volyume never verifies
  // it and copy always attributes it to the user's report (CC-R13).
  CLINICIAN_REPORTED: 'clinician_reported',
});

export const CONSTRAINT_RULE_KIND = Object.freeze({
  DEMAND: 'demand',            // a functional-demand axis value (below)
  FAMILY: 'family',            // a movement-family key (acts from CC27)
  EXERCISE: 'exercise',        // a single exercise id (acts from CC27)
  EXERCISE_ALLOW: 'exercise_allow', // per-exercise allowance (acts from CC27)
});

export const CONSTRAINT_STATE = Object.freeze({
  ACTIVE: 'active',
  ENDED: 'ended',
});

export const ENDED_REASON = Object.freeze({
  EXPIRED: 'expired',
  USER_ENDED: 'user_ended',
  SUPERSEDED: 'superseded',
  PROMOTED: 'promoted',
});

export const LATERALITY = Object.freeze({ LEFT: 'left', RIGHT: 'right' });

// ── The demand vocabulary (ARCHITECTURE section 8.2) ─────────────────────
// The closed, shared vocabulary between exercise metadata (CC27) and
// constraint rules. CC26 ships it as the CONTRACT so stored rules are
// valid from day one; nothing consumes it until CC27's resolver.
// rule_value for kind 'demand' is one of these ids. Labels are calm,
// functional, first-person-free; no clinical vocabulary (CAP-18/CAP-22).

export const DEMAND_AXES = Object.freeze([
  { id: 'standing',          label: 'Standing work' },
  { id: 'floor_access',      label: 'Getting to and from the floor' },
  { id: 'overhead_position', label: 'Overhead positions' },
  { id: 'grip_bar',          label: 'Gripping a bar or handle firmly' },
  { id: 'bilateral_upper',   label: 'Using both arms together' },
  { id: 'bilateral_lower',   label: 'Using both legs together' },
  { id: 'axial_load',        label: 'Loading the spine' },
  { id: 'impact',            label: 'Impact and jumping' },
  { id: 'balance_high',      label: 'Balancing without support' },
  // Gap-closure Phase C (MOVEMENT-PATH-AUDIT.md): the push-up class loads
  // the extended wrist while reading as grip-free, so wrist and hand
  // restrictions could not be expressed without it.
  { id: 'weight_bearing_hands', label: 'Taking weight through the hands and wrists' },
]);

const DEMAND_IDS = new Set(DEMAND_AXES.map(a => a.id));
const ROLES = new Set(Object.values(CONSTRAINT_ROLE));
const SOURCES = new Set(Object.values(CONSTRAINT_SOURCE));
const KINDS = new Set(Object.values(CONSTRAINT_RULE_KIND));
const SIDES = new Set(Object.values(LATERALITY));

export function demandLabel(id) {
  const axis = DEMAND_AXES.find(a => a.id === id);
  return axis ? axis.label : String(id ?? '').replace(/_/g, ' ');
}

// ── Validation (schema-mirroring; the store refuses what this refuses) ───

/**
 * Validate a constraint input before it is stored. Returns
 * { ok: true } or { ok: false, reason }. Mirrors the SQLite/cloud CHECKs
 * so an invalid row can never be written through the app path.
 */
export function validateConstraintInput(input = {}) {
  const {
    role, source, ruleKind, ruleValue, laterality = null,
    startsAt, endsAt = null, episodeGroupId = null,
  } = input;
  if (!ROLES.has(role)) return invalid('role');
  if (!SOURCES.has(source)) return invalid('source');
  if (!KINDS.has(ruleKind)) return invalid('rule_kind');
  if (typeof ruleValue !== 'string' || !ruleValue.trim()) return invalid('rule_value');
  if (ruleKind === CONSTRAINT_RULE_KIND.DEMAND && !DEMAND_IDS.has(ruleValue)) {
    return invalid('demand_value');
  }
  if (laterality != null && !SIDES.has(laterality)) return invalid('laterality');
  if (!Number.isFinite(startsAt) || startsAt <= 0) return invalid('starts_at');
  // Baseline defines an open-ended normal: it never carries a planned end,
  // and it never carries an episode group (ARCHITECTURE sections 2.1, 5.1).
  if (role === CONSTRAINT_ROLE.BASELINE) {
    if (endsAt != null) return invalid('baseline_ends_at');
    if (episodeGroupId != null) return invalid('baseline_episode_group');
  } else {
    if (!episodeGroupId) return invalid('episode_group_required');
    if (endsAt != null && (!Number.isFinite(endsAt) || endsAt <= startsAt)) {
      return invalid('ends_at');
    }
  }
  return { ok: true };
}

function invalid(reason) { return { ok: false, reason }; }

// ── Derived status (ARCHITECTURE section 22; no clock reads) ─────────────

export const EPISODE_STATUS = Object.freeze({
  ACTIVE: 'active',
  // A date-bound episode past its planned end that the user has not yet
  // confirmed. The constraints STILL APPLY (fail safe); only an explicit
  // user action ends them. Never written back by readers (section 5.1).
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  ENDED: 'ended',
});

/** Status of one constraint row at a given instant. */
export function constraintStatus(row, nowMs) {
  if (!row || row.state === CONSTRAINT_STATE.ENDED) return EPISODE_STATUS.ENDED;
  if (row.role === CONSTRAINT_ROLE.EPISODE
      && row.endsAt != null && Number.isFinite(nowMs) && nowMs >= row.endsAt) {
    return EPISODE_STATUS.AWAITING_CONFIRMATION;
  }
  return EPISODE_STATUS.ACTIVE;
}

/** Status of an episode group: awaiting only when every live row is past
 *  its planned end; active while any row still runs.
 *
 *  CC33 review round 2 (R2-2): status derives from the group's
 *  RESTRICTIONS only. A per-line Keep mints an open-ended exercise_allow
 *  row into the group (D113 ruling 3), and counting it here kept the
 *  group ACTIVE forever - the "still need it?" prompt and the
 *  acknowledge path became unreachable for exactly the users who
 *  engaged most, while Home (which groups from the resolver's
 *  restrictions, allowances already excluded) still asked. Excluding
 *  allow rows makes the two loaders agree by construction. A group
 *  whose only live rows are allowances falls back to judging those
 *  rows, so it still reads ACTIVE rather than wrongly ENDED. */
export function episodeStatus(rows = [], nowMs) {
  const live = rows.filter(r => r.state === CONSTRAINT_STATE.ACTIVE);
  if (!live.length) return EPISODE_STATUS.ENDED;
  const restrictions = live.filter(r => r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW);
  const judged = restrictions.length ? restrictions : live;
  const statuses = judged.map(r => constraintStatus(r, nowMs));
  if (statuses.every(s => s === EPISODE_STATUS.AWAITING_CONFIRMATION)) {
    return EPISODE_STATUS.AWAITING_CONFIRMATION;
  }
  return EPISODE_STATUS.ACTIVE;
}

// ── Interval predicate (CAP-14; the provenance join for later campaigns) ─
// Historical interpretation keys on workouts.started_at (never set
// created_at - AUDIT-D P-4) against [starts_at, ended_at). An episode past
// its PLANNED end but not yet confirmed still applies (fail safe), so the
// closing edge is the CONFIRMED ended_at, not the planned ends_at.

export function isConstraintActiveAt(row, atMs) {
  if (!row || !Number.isFinite(atMs)) return false;
  if (row.deletedAt != null) return false;
  if (atMs < row.startsAt) return false;
  if (row.state === CONSTRAINT_STATE.ENDED) {
    return row.endedAt != null ? atMs < row.endedAt : false;
  }
  return true;
}
