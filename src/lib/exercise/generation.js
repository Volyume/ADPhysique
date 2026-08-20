/**
 * exercise/generation.js — Campaign 9: what a NEW plan may be built from.
 *
 * The founder's rule for this seam, verbatim in intent: "NEW PLAN GENERATION
 * MAY AVOID AN EXCLUDED EXERCISE. This is not an automatic exercise CHANGE
 * because no existing exercise has yet been replaced." So no confirmation is
 * asked for here. Nothing in this module changes an exercise the user
 * already has; it only decides what a generator is allowed to SEED.
 *
 * Two laws it exists to keep:
 *
 *  1. If an exercise is indefinitely excluded, do not seed it into a new
 *     plan while a valid alternative exists. If it is avoided for this
 *     block, do not seed it into that block.
 *  2. If the exclusions leave a required slot with nothing valid in it, the
 *     slot is REPORTED, never quietly restored and never quietly dropped.
 *     That reporting is the caller's job; this module gives it the facts.
 *
 * Purity is deliberate. planEngine is a deterministic, side-effect-free
 * engine and must stay one, so the intent decision happens BEFORE it, on the
 * library it is handed. No I/O here, no store access, no database.
 *
 * The name set matters as much as the id set. planEngine falls back to its
 * hand-written POOL for any muscle the supplied library covers thinly
 * (MIN_GENERATED_PER_MUSCLE), and that POOL is a list of NAMES which knows
 * nothing about this user. Filtering the library by id can therefore push a
 * muscle under the threshold and have the engine emit the very exercise that
 * was filtered out, by name. `reasonByName` is how the caller catches that
 * on the way back out.
 */
import {
  isExcluded, isAvoidedThisBlock, isPatternAvoided, movementFamilyOf, familyTargetKey,
} from './intent';
// CC27 (section 9.2.1/9.2.2): the capability lane joins the generation
// filter through the SAME drop-report contract. Pure questions only; the
// capability state rides `state.capability` (loaded by that lane's own
// loader), so every existing caller inherits the check unchanged.
import { capabilityBlockReason } from '../capability/resolve';

/** Why a candidate may not be seeded. Mirrors EXERCISE_INTENT's kinds,
 *  plus the section 4.1 capability reason codes (ranks 2-4, reported
 *  ahead of the preference kinds because the table orders them senior). */
export const GENERATION_BLOCK = Object.freeze({
  EXCLUDED: 'excluded',
  AVOIDED_BLOCK: 'avoided_block',
  // D107-2: the exercise itself is fine, but its movementFamily is under an
  // active avoidance (day-bound, this-block or indefinite - all three read
  // the same here; isFamilyBlocked is the single family-level question).
  PATTERN_AVOID: 'pattern_avoid',
  // CC27 capability lane (hard, never never-starve re-entered):
  CAPABILITY_CLINICIAN: 'capability_clinician',
  CAPABILITY_DECLARED: 'capability_declared',
  CAPABILITY_UNKNOWN: 'capability_unknown',
});

/**
 * The reason this exercise may not be seeded right now, or null.
 *
 * @param {object} state loadExerciseIntentState output
 * @param {string|{id?: string, name?: string, primaryMuscle?: string, subregion?: string}} exercise
 *   a bare id (legacy shape, id-level checks only) or the full library row
 *   (also checks the exercise's movementFamily against active pattern
 *   avoidance - D107-2's senior enforcement point for generation).
 * @returns {'excluded'|'avoided_block'|'pattern_avoid'|null}
 */
export function generationBlockReason(state, exercise) {
  const id = typeof exercise === 'string' ? exercise : exercise?.id;
  if (!id) return null;
  // CC27, checked FIRST: the section 4.1 table puts capability ranks 2-4
  // above the preference lane, so when both lanes block, the reported
  // reason is the capability one. Only the full row can answer demand
  // questions - the legacy bare-id shape skips this arm, which is safe
  // because both generation gates (the pre-engine filter and the
  // post-engine re-check) hold full library rows.
  if (typeof exercise === 'object' && state?.capability && !state.capability.empty) {
    const cap = capabilityBlockReason(state.capability, exercise);
    if (cap) return cap;
  }
  if (!state?.intents?.size) return null;
  if (isExcluded(state, id)) return GENERATION_BLOCK.EXCLUDED;
  if (isAvoidedThisBlock(state, id)) return GENERATION_BLOCK.AVOIDED_BLOCK;
  const family = typeof exercise === 'object' ? movementFamilyOf(exercise) : null;
  if (family) {
    const target = familyTargetKey(family);
    // Same granularity as the id-level checks above: which of the three
    // kinds is live decides the reason, not just whether one is.
    if (isExcluded(state, target)) return GENERATION_BLOCK.EXCLUDED;
    if (isAvoidedThisBlock(state, target)) return GENERATION_BLOCK.AVOIDED_BLOCK;
    if (isPatternAvoided(state, target)) return GENERATION_BLOCK.PATTERN_AVOID;
  }
  return null;
}

/**
 * An empty result that hands the library straight back, by REFERENCE.
 * A user with no intent must get byte-identical generation to before
 * Campaign 9: same array, same order, same object identities.
 */
function passThrough(library) {
  return {
    library,
    droppedIds: [],
    droppedNames: [],
    dropped: [],
    reasonById: new Map(),
    reasonByName: new Map(),
  };
}

/**
 * Filter an exercise library down to what a generator may seed, and report
 * exactly what was removed so the caller can (a) explain a thin plan and
 * (b) catch a name-based reintroduction.
 *
 * @param {Array<{id?: string, name?: string}>} library
 * @param {object|null} state loadExerciseIntentState output
 * @returns {{
 *   library: Array,
 *   droppedIds: string[],
 *   droppedNames: string[],           lower-cased, for name matching
 *   dropped: Array<{exerciseId: string, name: string|null, reason: string}>,
 *   reasonById: Map<string,string>,
 *   reasonByName: Map<string,string>, lower-cased name to reason
 * }}
 */
export function filterLibraryForGeneration(library, state) {
  if (!Array.isArray(library) || library.length === 0) return passThrough(library);
  // No stored intent at all is the pre-Campaign-9 world. Return early rather
  // than rebuilding an identical array, so the no-intent path is provably a
  // no-op rather than merely an equal one. CC27: the capability lane joins
  // the same early-out - a user with neither intents nor active capability
  // constraints gets the SAME array by reference (the D110-2 identical
  // path, extended verbatim to the new lane).
  const capabilityActive = !!state?.capability && !state.capability.empty;
  if (!state?.intents?.size && !capabilityActive) return passThrough(library);

  try {
    const kept = [];
    const dropped = [];
    for (const ex of library) {
      // D107-2: the full row, not just the id, so a family-level avoidance
      // (the exercise itself was never touched) is caught too.
      const reason = generationBlockReason(state, ex);
      if (reason) dropped.push({ exerciseId: ex.id, name: ex?.name ?? null, reason });
      else kept.push(ex);
    }
    if (dropped.length === 0) return passThrough(library);

    const reasonById = new Map();
    const reasonByName = new Map();
    for (const d of dropped) {
      reasonById.set(d.exerciseId, d.reason);
      if (d.name) reasonByName.set(String(d.name).toLowerCase(), d.reason);
    }
    return {
      library: kept,
      droppedIds: dropped.map((d) => d.exerciseId),
      droppedNames: [...reasonByName.keys()],
      dropped,
      reasonById,
      reasonByName,
    };
  } catch (_e) {
    // Fail OPEN, the same way loadExerciseIntentState does. A malformed state
    // object must not be able to empty a user's library and leave them with
    // no plan at all; the worst case is the pre-Campaign-9 behaviour.
    return passThrough(library);
  }
}

/**
 * Would seeding this exercise violate the user's intent? Answered from a
 * filterLibraryForGeneration result, by id first and then by name.
 *
 * The name arm is the one that matters after generation: the engine resolves
 * its picks by name against the FULL library, so an id that never reached
 * the engine can still come back through the hand-written POOL fallback.
 *
 * @param {object} filtered filterLibraryForGeneration output
 * @param {{id?: string, name?: string}|null} exercise the resolved library row
 * @param {string|null} [fallbackName] the name the engine asked for
 * @returns {'excluded'|'avoided_block'|null}
 */
export function generationBlockFor(filtered, exercise, fallbackName = null) {
  if (!filtered) return null;
  const id = exercise?.id;
  if (id && filtered.reasonById?.size) {
    const byId = filtered.reasonById.get(id);
    if (byId) return byId;
  }
  if (!filtered.reasonByName?.size) return null;
  const name = exercise?.name ?? fallbackName;
  if (!name) return null;
  return filtered.reasonByName.get(String(name).toLowerCase()) ?? null;
}
