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
const SIDE_CARVEABLE = new Set(['grip_bar', 'overhead_position', 'bilateral_upper', 'bilateral_lower', 'weight_bearing_hands']);

/**
 * Does knowing the side change how this rule resolves? THE model truth
 * for the add flow's conditional side question (founder order
 * 2026-08-21): only a DEMAND rule on a body-side axis carves, and only
 * against one-side-loadable movements. Whole-body axes (standing, floor
 * access, spine load, impact, balance) and family/exercise rules resolve
 * identically with or without a side, so the flow must not ask.
 * Exported so no surface keeps its own list of "sided" rules.
 */
export function isSideCarveable(ruleKind, ruleValue) {
  return ruleKind === CONSTRAINT_RULE_KIND.DEMAND && SIDE_CARVEABLE.has(ruleValue);
}

/**
 * Is this exercise available ONLY because a sided rule was carved - the
 * user has said one side cannot do it, and the movement can be loaded a
 * side at a time? Surfaces that would otherwise PROPOSE two-sided work
 * ask this first, so Volyume never suggests work the user has just told
 * it they cannot do. It grants nothing and prescribes nothing: the
 * exercise is planned and logged exactly as any other. Pure, no clock.
 */
export function isSideCarvedAvailable(state, exercise) {
  if (!state || state.empty || !exercise) return false;
  if (tri(exercise.unilateralLoadable) !== true) return false;
  // Round 7 (R7-3): consumes the same UNION answer the carve itself
  // uses, so the "one side at a time" note can never be spoken about an
  // axis whose carve no longer applies (both sides restricted, or an
  // unsided rule on the same axis) - the note and the block must agree.
  const carve = sideCarveByAxis(state);
  return (state.restrictions ?? []).some((r) => (
    r.ruleKind === CONSTRAINT_RULE_KIND.DEMAND
    && r.laterality
    && SIDE_CARVEABLE.has(r.ruleValue)
    && carve.has(r.ruleValue)
    && demandAxisConflict(r.ruleValue, exercise) === true
  ));
}

/**
 * Round 7 (R7-3): the axes whose side carve APPLIES for this state - a
 * union decision over every DEMAND rule, computed once per call site.
 * An axis carves only while exactly ONE side of it is restricted and no
 * unsided rule restricts it too: a left rule and a right rule together
 * mean neither side can do it, and a sided rule beside an unsided rule
 * on the same axis means the unsided rule already covers both. Source
 * is irrelevant here on purpose - a clinician's left rule plus a
 * self-declared right rule still covers both sides (the clinician
 * ranking lives in blockingConflicts, not in the carve).
 */
function sideCarveByAxis(state) {
  const byAxis = new Map();
  for (const r of state?.restrictions ?? []) {
    if (r.ruleKind !== CONSTRAINT_RULE_KIND.DEMAND || !SIDE_CARVEABLE.has(r.ruleValue)) continue;
    let entry = byAxis.get(r.ruleValue);
    if (!entry) { entry = { sides: new Set(), unsided: false }; byAxis.set(r.ruleValue, entry); }
    if (r.laterality) entry.sides.add(r.laterality); else entry.unsided = true;
  }
  const carves = new Set();
  for (const [axis, entry] of byAxis) {
    if (!entry.unsided && entry.sides.size === 1) carves.add(axis);
  }
  return carves;
}

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
    case 'weight_bearing_hands': return tri(ex.weightBearingHands);
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
  const carve = sideCarveByAxis(state);
  for (const r of state.restrictions) {
    if (r.ruleKind === CONSTRAINT_RULE_KIND.DEMAND) {
      let hit = demandAxisConflict(r.ruleValue, exercise);
      // Section 33.8: a sided constraint on a body-side axis is satisfied
      // by one-side-loadable movements - the user works the other side.
      // Round 7 (R7-3): the carve is a UNION decision per axis, never a
      // per-rule one - see sideCarveByAxis. Evaluated rule-by-rule, a
      // LEFT rule and a RIGHT rule on one axis each carved
      // independently, and two rules saying "not this side" combined
      // into "fully available" - the fail-open this lane exists to
      // prevent, on the axis where the user was most explicit.
      if (hit === true && r.laterality && SIDE_CARVEABLE.has(r.ruleValue)
        && tri(exercise.unilateralLoadable) === true
        && carve.has(r.ruleValue)) {
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
 * The section 4.1 DECISION layer (CC33 D112 R4): the conflicts that still
 * BLOCK this exercise after the user's own allowance carve.
 * demandConflicts stays the EXPLANATION layer - it lists every conflict
 * so surfaces can explain a rule's reach - while this answers "does
 * anything actually stand in the way". The allowance carves rank-3/4
 * conflicts (self-declared, definite or unknown) and never a clinician
 * conflict of ANY certainty (rank 2; F5 - source outranks certainty):
 * the same carve capabilityBlockReason has always applied,
 * exported so EVERY decision consumer shares it - substitution, excusal,
 * the in-session notice, block review, rebuild receipts and coach holds
 * must all honour "this one works for me", not the picker alone.
 */
export function blockingConflicts(state, exercise) {
  if (!state || state.empty || !exercise) return [];
  const conflicts = demandConflicts(state, exercise);
  if (!conflicts.length) return conflicts;
  const allowed = exercise.id ? !!state.allowances?.has(exercise.id) : false;
  if (!allowed) return conflicts;
  // CC33 adversarial review F5: SOURCE outranks certainty (lead ruling,
  // recorded in the decisions register). A clinician-reported rule's
  // conflict survives the allowance carve whether definite OR unknown -
  // the old `!c.unknown` term let a self-declared allowance silently
  // carve a clinician rule whose axis the exercise had not established,
  // which is exactly the silent override CAP-7 forbids.
  return conflicts.filter((c) => c.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED);
}

/**
 * The section 4.1 first-match reason for this exercise, or null.
 * Rank 2 before rank 3 before rank 4; the allowance carves 3 and 4, never
 * 2 (the carve itself lives in blockingConflicts).
 */
export function capabilityBlockReason(state, exercise) {
  if (!state || state.empty || !exercise) return null;
  const conflicts = blockingConflicts(state, exercise);
  if (!conflicts.length) return null;
  // Rank 2: clinician conflict, definite or unknown - un-carveable, and
  // the picker routes it to the rule editor, never an inline override
  // (F5: source outranks certainty; an unknown clinician conflict must
  // not fall through to the rank-4 "add anyway" flow).
  if (conflicts.some((c) => c.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED)) {
    return CAPABILITY_BLOCK.CLINICIAN;
  }
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
 * Section 33.11: near-miss candidates for a muscle - movements blocked
 * ONLY by unknowns (rank 4), each named with its unknown axes, so the
 * no-compatible-option surface can offer "suggest with unknowns shown"
 * as an actionable list instead of a wall. Definite conflicts (ranks
 * 2-3) are NOT near misses and never appear here.
 *
 * @returns {Array<{exerciseId: string, name: string|null, unknownAxes: string[]}>}
 */
export function nearMissCandidates(state, library, { muscle = null, limit = 4 } = {}) {
  if (!state || state.empty || !Array.isArray(library)) return [];
  const out = [];
  for (const ex of library) {
    if (muscle && ex?.primaryMuscle !== muscle) continue;
    const conflicts = demandConflicts(state, ex);
    if (!conflicts.length) continue; // fully eligible: not a near miss
    if (conflicts.some((c) => !c.unknown)) continue; // definite conflict: out
    // Review round 2 (R2-3), same law as F5: source outranks certainty.
    // An unknown conflict on a CLINICIAN-reported rule is rank 2, and
    // offering "you can still add it yourself" here would be the inline
    // override the picker already refuses - the list never suggests work
    // under a clinician rule, whatever the movement's data state.
    if (conflicts.some((c) => c.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED)) continue;
    if (ex?.id && state.allowances.has(ex.id)) continue; // already allowed through
    out.push({
      exerciseId: ex?.id ?? null,
      name: ex?.name ?? null,
      unknownAxes: [...new Set(conflicts.map((c) => c.ruleValue))],
    });
    if (out.length >= limit) break;
  }
  return out;
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

/**
 * Section 15 / D112 R1 (closes audit T1-01): the muscles whose pool is
 * empty under the user's BASELINE rules alone - the set whose block
 * volume targets would be pure fiction if seeded from the template.
 *
 * Role scoping is the point. A BASELINE rule is the user's permanent
 * normal, so a block activated under it must not carry targets for work
 * that does not exist (permanent shapes the document). An EPISODE rule
 * is temporary: the block's planned rows stay at the template as the
 * protected baseline section 23's reintroduction ramps back toward -
 * zeroing them would leave nothing to return to - and the effective
 * layer (CC30 stamps, section 18 denominators, the serve-time view)
 * absorbs the temporary gap instead.
 *
 * The eligibility judgement is the standard one (blockingConflicts via
 * capabilityBlockReason), so allowances carve here exactly as they do
 * everywhere else and a clinician rule stays un-carveable.
 *
 * Fails to NOTHING BLOCKED: on an empty or unavailable state this
 * returns an empty set, because wrongly zeroing a healthy user's block
 * is the harmful direction here - the template is the status quo.
 *
 * @param {object} state the resolver state
 * @param {Array} library full exercise library rows
 * @param {string[]} muscles the muscles under consideration
 * @returns {Set<string>} muscles with no baseline-eligible exercise
 */
export function baselineBlockedMuscles(state, library, muscles = []) {
  const out = new Set();
  if (!state || state.empty || state.unavailable) return out;
  if (!Array.isArray(library) || !library.length) return out;
  const baselineRules = (state.restrictions ?? []).filter((r) => r.role === 'baseline');
  if (!baselineRules.length) return out;
  const view = {
    ...state,
    restrictions: baselineRules,
    empty: false,
  };
  for (const muscle of muscles) {
    const anyEligible = library.some(
      (ex) => ex?.primaryMuscle === muscle && isCapabilityEligible(view, ex),
    );
    if (!anyEligible && library.some((ex) => ex?.primaryMuscle === muscle)) out.add(muscle);
  }
  return out;
}
