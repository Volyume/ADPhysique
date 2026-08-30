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

/** The EPISODE-role conflicts that may DRIVE automation for one exercise,
 *  or []. D112 R8 (section 25; audit T2-26): an episode the user set to
 *  "hold my plan" still CONFLICTS (episodeConflicts above reports it, so
 *  surfaces can say "you're holding this"), but it drives no automation
 *  OF ITS OWN - the effective view and the completion excusal consume
 *  THIS list, never the raw one. Precision (D120, round 8): hold and
 *  decline suspend a rule's own automation, never the FACT it records.
 *  A held rule's restriction still binds pickers and generation, and it
 *  still participates in the side-carve union (resolve.sideCarveByAxis)
 *  - so a held left-side rule beside a live applied right-side rule
 *  makes the LIVE rule's conflict definite, and the live rule may then
 *  substitute. The automation is the applied rule's; the held rule
 *  contributed a fact, which is exactly what pickers and generation
 *  already take from it. */
export function actionableEpisodeConflicts(capabilityState, exercise) {
  return episodeConflicts(capabilityState, exercise)
    .filter((c) => c.row?.adaptationMode !== 'hold');
}

/** The BASELINE-role conflicts that still stand for one exercise, or [].
 *  Same decision layer. D112 R1's amendment to RT2-1 rides on this:
 *  baseline invisibility is correct only while the plan is
 *  baseline-compatible, so a plan row whose exercise still conflicts
 *  with the user's permanent rules is quietly marked (never silently
 *  served as fine) until the user resolves it - by accepting the plan
 *  rewrite, swapping it themselves, or allowing the exercise through. */
export function baselineConflicts(capabilityState, exercise) {
  if (!capabilityState || capabilityState.empty) return [];
  const byId = new Map((capabilityState.restrictions ?? []).map((r) => [r.id, r]));
  return blockingConflicts(capabilityState, exercise)
    .map((c) => ({ ...c, row: byId.get(c.constraintId) }))
    .filter((c) => c.row?.role === 'baseline');
}

/**
 * The best eligible substitute for a slot, or null: same primary muscle,
 * passes the injected senior question, ranked by the generic canonicality
 * tier then name (deterministic; personal evidence never promotes an
 * unsuitable movement here - this is a capability workaround, not a
 * preference surface).
 *
 * `taken` (CC33 round 5, R5-8): ids this selection may not choose - the
 * substitutes already picked for earlier rows of the same session or
 * routine, plus the session's own rows. Without it the ranking is
 * deterministic PER ROW with no cross-row memory, so two conflicted rows
 * of one muscle always received the same top-ranked substitute - served
 * twice in one session, and written twice, permanently, by the plan
 * rewrite. The same movement never appears in a session twice
 * (continuity.js states the identical law for the generator); a slot
 * whose every remaining candidate is taken falls to the next rank, and
 * when none remains it resolves null - the existing honest
 * omitted/unsolvable path, never a duplicate.
 */
export function bestEligibleSubstitute(exercise, library, isEligibleRow, taken = null) {
  if (!exercise?.primaryMuscle || !Array.isArray(library)) return null;
  const candidates = library
    .filter((e) => e.id !== exercise.id
      && e.primaryMuscle === exercise.primaryMuscle
      && !(taken && taken.has(e.id))
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
  // R5-8: one session never contains the same movement twice. Seeded
  // with every base row's own id - a substitute must not duplicate an
  // unaffected row that is staying in the session (a conflicted row's id
  // costs nothing here: it is ineligible via the senior question anyway)
  // - and each chosen substitute joins the set so later rows fall to the
  // next canonical rank. Iteration order is session order, so the
  // assignment stays deterministic.
  const taken = new Set(
    (baseRows ?? []).map((r) => (r?.exercise ?? r)?.id).filter(Boolean),
  );
  (baseRows ?? []).forEach((row, i) => {
    const exercise = row?.exercise ?? row;
    // D112 R8: held episodes drive nothing here - a fully-held conflict
    // set resolves UNCHANGED, so "hold my plan" genuinely holds it.
    // CC33 adversarial review (F1 class): UNKNOWN conflicts drive nothing
    // automatic either. The resolver's own law is "never silently treated
    // as fine, never silently treated as a conflict" (resolve.js) - an
    // exercise whose demand column is NULL (a custom lift; a row the
    // library could not resolve) must not be swapped out of the user's
    // session on a fact the app has not established. Unknowns stay for
    // the VISIBLE notice layer (the screens read the raw conflict lists
    // and say "doesn't know yet"); only definite conflicts substitute,
    // omit, or count.
    const conflicts = actionableEpisodeConflicts(capabilityState, exercise)
      .filter((c) => !c.unknown);
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
    const substitute = bestEligibleSubstitute(exercise, library, isEligibleRow, taken);
    if (substitute) taken.add(substitute.id);
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
 * completed session: planned-but-unperformed rows whose absence the
 * active EPISODE constraints excuse. Substitutions are NOT recorded
 * here - they are written at serve time by applyEffectiveViewToSession,
 * the moment they happen (the earlier doc line claiming this function
 * recorded them was wrong: audit T2-13). Pure - the caller supplies the
 * facts.
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
    // D112 R8: a held episode excuses nothing - skipping its exercise is
    // an ordinary early stop, exactly like a declined rule's. And an
    // UNKNOWN conflict excuses nothing either (CC33 adversarial review,
    // F1 class): excusing an absence on a fact the app has not
    // established would silently treat unknown as conflict - the same
    // definite-only gate computeEffectiveSession applies.
    const conflicts = actionableEpisodeConflicts(capabilityState, exercise)
      .filter((c) => !c.unknown);
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
