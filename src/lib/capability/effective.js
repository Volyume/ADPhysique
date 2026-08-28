/**
 * capability/effective.js - the effective prescription RESOLUTION LAYER
 * (CC29; ARCHITECTURE sections 2.3, 14; role scoping RT2-1).
 *
 * NOT A STORE (section 2.3). The effective view derives live, every time,
 * from the base plan rows + the user's ACTIVE EPISODE-role constraints +
 * their standing per-rule Apply/Decline choices (effective_choice on the
 * rule rows). Baseline-role constraints never appear here at all: a
 * baseline-shaped plan simply IS the user's plan, and no marker, record
 * or line ever frames it otherwise (CAP-1/2).
 *
 * Pure. The senior eligibility question is INJECTED by the caller
 * (isEligibleRow) so this module never reaches the preference lane
 * (CAP-4 wall); substitutes are ranked by the existing generic
 * canonicality judgement - deterministic, explainable, no scores.
 */
import { blockingConflicts } from './resolve';
import { tierRank } from '../exercise/canonicality';

export const EFFECTIVE_EFFECT = Object.freeze({
  UNCHANGED: 'unchanged',
  SUBSTITUTED: 'substituted',
  OMITTED: 'omitted',
  CONFLICTED: 'conflicted', // declined/undecided: base row stands, visibly
});

/** The EPISODE-role conflicts that still stand for one exercise, or [].
 *  Decision-layer (CC33 D112 R4): built on blockingConflicts, so a user
 *  allowance carves substitution, excusal and the conflicted notice
 *  exactly as it carves the picker - and never carves the clinician rank. */
export function episodeConflicts(capabilityState, exercise) {
  if (!capabilityState || capabilityState.empty) return [];
  const byId = new Map((capabilityState.restrictions ?? []).map((r) => [r.id, r]));
  return blockingConflicts(capabilityState, exercise)
    .map((c) => ({ ...c, row: byId.get(c.constraintId) }))
    .filter((c) => c.row?.role === 'episode');
}

/**
 * The best eligible substitute for a slot, or null: same primary muscle,
 * passes the injected senior question, ranked by the generic canonicality
 * tier then name (deterministic; personal evidence never promotes an
 * unsuitable movement here - this is a capability workaround, not a
 * preference surface).
 */
export function bestEligibleSubstitute(exercise, library, isEligibleRow) {
  if (!exercise?.primaryMuscle || !Array.isArray(library)) return null;
  const candidates = library
    .filter((e) => e.id !== exercise.id
      && e.primaryMuscle === exercise.primaryMuscle
      && isEligibleRow(e))
    .sort((a, b) => tierRank(a.name) - tierRank(b.name)
      || String(a.name).localeCompare(String(b.name)));
  return candidates[0] ?? null;
}

/**
 * Compute the effective view of one session's rows.
 *
 * @param {Array<{exercise: object, slot?: number}>} baseRows the session's
 *   planned rows (each carrying its library exercise object)
 * @param {Array} library the full library (substitute pool)
 * @param {object} capabilityState the resolver state (role-aware rows)
 * @param {(exercise: object) => boolean} isEligibleRow the SENIOR question,
 *   injected by the caller
 * @returns {{lines: Array<{slot: number, exerciseFrom: object,
 *   effect: string, exerciseTo: object|null, constraintIds: string[],
 *   undecided: boolean}>, anyEffect: boolean, undecidedCount: number}}
 */
export function computeEffectiveSession(baseRows, library, capabilityState, isEligibleRow) {
  const lines = [];
  let anyEffect = false;
  let undecidedCount = 0;
  (baseRows ?? []).forEach((row, i) => {
    const exercise = row?.exercise ?? row;
    const conflicts = episodeConflicts(capabilityState, exercise);
    if (!conflicts.length) {
      lines.push({ slot: i, exerciseFrom: exercise, effect: EFFECTIVE_EFFECT.UNCHANGED, exerciseTo: null, constraintIds: [], undecided: false });
      return;
    }
    anyEffect = true;
    const constraintIds = conflicts.map((c) => c.constraintId);
    const applied = conflicts.every((c) => c.row?.effectiveChoice === 'applied');
    const undecided = conflicts.some((c) => c.row?.effectiveChoice == null);
    if (undecided) undecidedCount += 1;
    if (!applied) {
      // Declined (or not yet decided): the base row stands, visibly
      // conflicted with the swap shortcut (section 14 step 3).
      lines.push({ slot: i, exerciseFrom: exercise, effect: EFFECTIVE_EFFECT.CONFLICTED, exerciseTo: null, constraintIds, undecided });
      return;
    }
    const substitute = bestEligibleSubstitute(exercise, library, isEligibleRow);
    lines.push({
      slot: i,
      exerciseFrom: exercise,
      effect: substitute ? EFFECTIVE_EFFECT.SUBSTITUTED : EFFECTIVE_EFFECT.OMITTED,
      exerciseTo: substitute,
      constraintIds,
      undecided: false,
    });
  });
  return { lines, anyEffect, undecidedCount };
}

/**
 * The section 5.3 effects entries for what ACTUALLY happened in a
 * completed session: substitutions performed, and planned-but-unperformed
 * rows whose absence the active EPISODE constraints excuse. Pure - the
 * caller supplies the facts.
 *
 * @param {Array<{exercise: object, performed: boolean}>} sessionRows the
 *   session's planned rows with whether any set was logged against each
 * @param {object} capabilityState
 * @returns {{entries: Array, excusedIds: string[], unperformedIds: string[],
 *   coversAllUnperformed: boolean}}
 */
export function computeCompletionEffects(sessionRows, capabilityState) {
  const entries = [];
  const excusedIds = [];
  const unperformedIds = [];
  (sessionRows ?? []).forEach((row, i) => {
    const exercise = row?.exercise ?? row;
    if (row?.performed) return;
    if (!exercise?.id) return;
    unperformedIds.push(exercise.id);
    const conflicts = episodeConflicts(capabilityState, exercise);
    // Red-team finding 4 (bundle): excusal requires the APPLIED choice on
    // EVERY driving rule, exactly as computeEffectiveSession requires it
    // for substitution. A declined or undecided rule leaves the row in
    // the effective prescription (section 14 step 3: "visibly
    // conflicted" = still owed), so its absence is an ordinary early
    // stop, never an excused one (section 18).
    const applied = conflicts.length > 0
      && conflicts.every((c) => c.row?.effectiveChoice === 'applied');
    if (applied) {
      excusedIds.push(exercise.id);
      entries.push({
        slot: i,
        exerciseFrom: exercise.id,
        effect: 'omitted',
        constraintIds: conflicts.map((c) => c.constraintId),
      });
    }
  });
  return {
    entries,
    excusedIds,
    unperformedIds,
    coversAllUnperformed: unperformedIds.length > 0 && excusedIds.length === unperformedIds.length,
  };
}
