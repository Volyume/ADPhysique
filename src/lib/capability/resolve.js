/**
 * capability/resolve.js - THE constraint/eligibility resolver (CC27;
 * ARCHITECTURE section 9, precedence section 4.1). One loader, pure
 * questions over a state object - the C31 read-layer contract.
 *
 * WHAT THIS MODULE DECIDES. Whether an exercise may be SUGGESTED or
 * auto-selected while the user's capability constraints are active. It is
 * never a question about what the user may do deliberately: manual paths
 * always work (CAP-2/CC-R12), and nothing here mutates anything - readers
 * never write (the CC26 law), and this module cannot reach a database
 * write at all.
 *
 * THE LAWS ENFORCED HERE
 *  - Ranks 2-4 of section 4.1, first match names the reason:
 *      rank 2  clinician-reported conflict   'capability_clinician'
 *      rank 3  self-declared conflict        'capability_declared'
 *      rank 4  UNKNOWN demand on a constrained axis  'capability_unknown'
 *    All three are HARD: no never-starve re-entry, same standing as the
 *    equipment filter.
 *  - An allowance (rule_kind exercise_allow) carves rank 3 and rank 4 for
 *    its exercise. It NEVER carves rank 2: a clinician-reported rule is
 *    edited, not excepted (CAP-7).
 *  - UNKNOWN is meaningful (CAP-8): a NULL demand on a constrained axis is
 *    ineligible with its own reason and its own honest copy - never
 *    silently treated as fine, never silently treated as a conflict.
 *  - Laterality scoping (section 33.8): a left/right-qualified constraint
 *    scopes to movements requiring THAT side. Exercises are never sided,
 *    so on the body-side axes (grip, overhead, bilateral upper/lower) a
 *    sided constraint is satisfied by any movement the user can load one
 *    side at a time (unilateral_loadable) - the side choice is theirs,
 *    and explanation copy names the side (CAP-18). Whole-body axes
 *    (standing, floor, axial, impact, balance) are never side-carved.
 *  - Baseline and episode rows BOTH apply while active (union of
 *    exclusions, section 4.4); role changes presentation, never reach.
 *  - Failure posture (CAP-17, section 9.6 REVISED): the loader returns
 *    `unavailable: true` with the last known in-memory state if this
 *    session has one (surfaces behave normally on it); with NO known
 *    state the PRE-FLIGHT choice lives at the UI layer, outside every
 *    engine call - this module never fails open and never fails silently.
 *
 * Pure and I/O-free except the single loader; same inputs, same outputs,
 * everywhere (section 9.3).
 */
import {
  CONSTRAINT_RULE_KIND, CONSTRAINT_SOURCE, isConstraintActiveAt,
} from './model';
// Movement-family taxonomy (shared vocabulary, carries no user data - the
// CAP-4 wall is about the preference lane's stored intent, which this
// module can never touch).
import { movementFamily } from '../exercise/movementFamily';

export const CAPABILITY_BLOCK = Object.freeze({
  CLINICIAN: 'capability_clinician',
  DECLARED: 'capability_declared',
  UNKNOWN: 'capability_unknown',
});

// SQLite stores demand booleans as 0/1/NULL; cloud and fixtures may hand
// true/false. One tri-state reading everywhere.
function tri(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  return null;
}

/** The demand axes a laterality-qualified constraint can be carved on by
 *  one-side loadability (section 33.8). */
const SIDE_CARVEABLE = new Set(['grip_bar', 'overhead_position', 'bilateral_upper', 'bilateral_lower']);

/**
 * Does this exercise CONFLICT with one demand-axis constraint?
 * Returns true (conflict), false (compatible) or null (UNKNOWN - the
 * axis's demand is not known for this exercise).
 */
export function demandAxisConflict(axisId, exercise) {
  const ex = exercise ?? {};
  const uni = tri(ex.unilateralLoadable);
  switch (axisId) {
    case 'standing': {
      const p = ex.position ?? null;
      if (p == null) return null;
      // 'mixed' involves standing phases; fail-safe toward the constraint.
      return p === 'standing' || p === 'mixed';
    }
    case 'floor_access': return tri(ex.floorAccess);
    case 'overhead_position': return tri(ex.overheadPosition);
    case 'grip_bar': {
      const g = ex.gripDemand ?? null;
      if (g == null) return null;
      return g === 'bar';
    }
    case 'bilateral_upper': {
      const b = tri(ex.bilateralUpper);
      if (b === true) return true;
      if (b === false) return false;
      // Unknown requirement, but one-side loadable answers the question:
      // the user works their side.
      return uni === true ? false : null;
    }
    case 'bilateral_lower': {
      const b = tri(ex.bilateralLower);
      if (b === true) return true;
      if (b === false) return false;
      return uni === true ? false : null;
    }
    case 'axial_load': return tri(ex.axialLoad);
    case 'impact': return tri(ex.impact);
    case 'balance_high': {
      const b = ex.balanceDemand ?? null;
      if (b == null) return null;
      return b === 'high';
    }
    default: return false; // unknown axis id constrains nothing
  }
}

function familyOf(exercise) {
  if (!exercise) return null;
  const muscle = exercise.primaryMuscle ?? exercise.muscle ?? null;
  return movementFamily(exercise.name ?? null, muscle, exercise.subregion ?? null) ?? null;
}

/**
 * Build the resolver state from raw capability_constraints rows (camelCase,
 * as database.getCapabilityConstraints returns them). Pure.
 *
 * @param {Array} rows every non-tombstoned row for the user
 * @param {{atMs: number}} opts the moment eligibility is being asked about
 * @returns {{
 *   restrictions: Array, allowances: Set<string>, unavailable: boolean,
 *   stale: boolean, empty: boolean, atMs: number,
 * }}
 */
export function buildCapabilityResolveState(rows, { atMs } = {}) {
  const at = Number.isFinite(atMs) ? atMs : Date.now();
  const active = (Array.isArray(rows) ? rows : []).filter((r) => isConstraintActiveAt(r, at));
  const restrictions = active.filter((r) => r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW);
  const allowances = new Set(
    active.filter((r) => r.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW).map((r) => r.ruleValue),
  );
  return {
    restrictions,
    allowances,
    unavailable: false,
    stale: false,
    empty: restrictions.length === 0 && allowances.size === 0,
    atMs: at,
  };
}

/** An empty, available state (no constraints recorded). */
export function emptyCapabilityState(atMs = null) {
  return buildCapabilityResolveState([], { atMs: atMs ?? Date.now() });
}

// Last known good state per user, this session only (section 9.6): a read
// failure serves the state the session already proved rather than
// half-state, and `unavailable` tells the UI layer the truth either way.
const _lastKnown = new Map();

/** TEST-ONLY: reset the session cache. */
export function _resetCapabilityResolveCache() { _lastKnown.clear(); }

/**
 * THE single IO point (section 9.1). Loads the user's capability rows and
 * builds the resolver state. On a read failure: last known state with
 * `unavailable: true, stale: true` if this session has one; otherwise an
 * empty state with `unavailable: true, stale: false` - and the PRE-FLIGHT
 * gate at the UI layer (section 9.6) is what may proceed or hold, never
 * this module.
 */
export async function loadCapabilityResolveState(userId, { atMs } = {}) {
  if (!userId) return emptyCapabilityState(atMs);
  try {
    // eslint-disable-next-line global-require
    const { getCapabilityConstraints } = require('../database');
    const rows = await getCapabilityConstraints(userId);
    const state = buildCapabilityResolveState(rows, { atMs });
    _lastKnown.set(userId, state);
    return state;
  } catch (_e) {
    const known = _lastKnown.get(userId);
    if (known) return { ...known, unavailable: true, stale: true };
    return { ...emptyCapabilityState(atMs), unavailable: true };
  }
}

/**
 * Every conflict between the state and one exercise, mechanical and
 * explainable (CAP-18): each entry names the constraint row, what matched
 * and whether it is a definite conflict or an UNKNOWN.
 *
 * @returns {Array<{constraintId: string, ruleKind: string, ruleValue: string,
 *   source: string, laterality: string|null, unknown: boolean}>}
 */
export function demandConflicts(state, exercise) {
  if (!state || state.empty || !exercise) return [];
  const out = [];
  const family = familyOf(exercise);
  for (const r of state.restrictions) {
    if (r.ruleKind === CONSTRAINT_RULE_KIND.DEMAND) {
      let hit = demandAxisConflict(r.ruleValue, exercise);
      // Section 33.8: a sided constraint on a body-side axis is satisfied
      // by one-side-loadable movements - the user works the other side.
      if (hit === true && r.laterality && SIDE_CARVEABLE.has(r.ruleValue)
        && tri(exercise.unilateralLoadable) === true) {
        hit = false;
      }
      if (hit === true || hit === null) {
        out.push({
          constraintId: r.id, ruleKind: r.ruleKind, ruleValue: r.ruleValue,
          source: r.source, laterality: r.laterality ?? null, unknown: hit === null,
        });
      }
    } else if (r.ruleKind === CONSTRAINT_RULE_KIND.FAMILY) {
      if (family && r.ruleValue === family) {
        out.push({
          constraintId: r.id, ruleKind: r.ruleKind, ruleValue: r.ruleValue,
          source: r.source, laterality: r.laterality ?? null, unknown: false,
        });
      }
    } else if (r.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE) {
      if (exercise.id && r.ruleValue === exercise.id) {
        out.push({
          constraintId: r.id, ruleKind: r.ruleKind, ruleValue: r.ruleValue,
          source: r.source, laterality: r.laterality ?? null, unknown: false,
        });
      }
    }
  }
  return out;
}

/**
 * The section 4.1 first-match reason for this exercise, or null.
 * Rank 2 before rank 3 before rank 4; the allowance carves 3 and 4, never 2.
 */
export function capabilityBlockReason(state, exercise) {
  if (!state || state.empty || !exercise) return null;
  const conflicts = demandConflicts(state, exercise);
  if (!conflicts.length) return null;
  const allowed = exercise.id ? state.allowances.has(exercise.id) : false;
  // Rank 2: definite clinician conflict - un-carveable.
  if (conflicts.some((c) => !c.unknown && c.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED)) {
    return CAPABILITY_BLOCK.CLINICIAN;
  }
  if (allowed) return null; // carves every remaining rank-3/4 entry
  // Rank 3: definite self-declared conflict.
  if (conflicts.some((c) => !c.unknown)) return CAPABILITY_BLOCK.DECLARED;
  // Rank 4: only unknowns remain.
  return CAPABILITY_BLOCK.UNKNOWN;
}

/** May this exercise be suggested, capability-wise? (Ranks 2-4 only; the
 *  intent lane and quality gates answer for themselves.) */
export function isCapabilityEligible(state, exercise) {
  return capabilityBlockReason(state, exercise) === null;
}

/** Filter a library, reporting drops - the same contract shape as the
 *  intent lane's generation filter so callers compose the two. Pure. */
export function filterCapabilityEligible(state, exercises) {
  if (!Array.isArray(exercises) || !exercises.length || !state || state.empty) {
    return { library: exercises ?? [], dropped: [] };
  }
  const kept = [];
  const dropped = [];
  for (const ex of exercises) {
    const reason = capabilityBlockReason(state, ex);
    if (reason) dropped.push({ exerciseId: ex?.id ?? null, name: ex?.name ?? null, reason });
    else kept.push(ex);
  }
  return dropped.length ? { library: kept, dropped } : { library: exercises, dropped: [] };
}

/**
 * Which library rows (and muscles) the active constraints currently block
 * (section 6.5's deterministic affected scope). Used for honest volume
 * statements and coach suppression, never for guessing.
 */
export function affectedScope(state, library) {
  const exerciseIds = new Set();
  const muscles = new Set();
  if (!state || state.empty || !Array.isArray(library)) return { exerciseIds, muscles };
  for (const ex of library) {
    if (capabilityBlockReason(state, ex) !== null) {
      if (ex?.id) exerciseIds.add(ex.id);
      if (ex?.primaryMuscle) muscles.add(ex.primaryMuscle);
    }
  }
  return { exerciseIds, muscles };
}

/**
 * Section 15: effective per-muscle ceilings. Landmarks are never
 * rewritten; the ceiling applies at consumption points only.
 *
 * @param {Object<string, number>} plannedByMuscle planned weekly sets
 * @param {Object<string, number>} compatibleVolumeByMuscle deliverable
 *   quality-eligible weekly sets from the FILTERED pool
 * @returns {Object<string, {effectiveTarget: number, limited: boolean}>}
 */
export function resolveEffectiveTargets(plannedByMuscle = {}, compatibleVolumeByMuscle = {}) {
  const out = {};
  for (const [muscle, planned] of Object.entries(plannedByMuscle)) {
    const p = Number(planned);
    if (!Number.isFinite(p)) continue;
    const compat = Number(compatibleVolumeByMuscle[muscle]);
    const cap = Number.isFinite(compat) ? compat : p;
    out[muscle] = { effectiveTarget: Math.min(p, cap), limited: cap < p };
  }
  return out;
}
