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
    // Round 16 (R16-2): a row the user chose themselves resolves
    // UNCHANGED before ANY substitute is considered - the leak was
    // here: the view judged the user's row, reserved the muscle's best
    // substitute for it in the taken-set, and serve then threw that
    // substitution away, so a later conflicted row of the same muscle
    // got a lower-ranked substitute - or, with a small pool, was
    // OMITTED and durably excused while an eligible substitute sat
    // idle. The user-chosen fact lives HERE, in the view, as the one
    // rule (D112 R4: their word outranks the model); the serve loop no
    // longer duplicates it.
    if (row?.userChosen) {
      lines.push({ slot: i, exerciseFrom: exercise, effect: EFFECTIVE_EFFECT.UNCHANGED, exerciseTo: null, constraintIds: [], undecided: false });
      return;
    }
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
 * @param {Array<{exercise: object, performed: boolean, rowId?: string|null,
 *   userChosen?: boolean}>}
 *   sessionRows the session's planned rows with whether any set was
 *   logged against each; rowId is the slot's stable planned-row id
 *   (R10-1: the effects record keys per slot, so a doubled exercise's
 *   two slots write two true entries); userChosen marks a row the user
 *   picked themselves (_userAdded), which is never excused (R13-2)
 * @param {object} capabilityState
 * @returns {{entries: Array, excusedIds: string[], unperformedIds: string[],
 *   coversAllUnperformed: boolean}}
 */
/**
 * Round 12 (R12-2) + round 13 (R13-2): the ONE answer to "do live
 * definite drivers stand for this row?" - consumed by BOTH effects
 * writers (the mid-session removal hook and computeCompletionEffects
 * below), and since round 18 (R18-2) by both rebuild-verdict evidence
 * builders (planAutoGen.buildSlotEvidence, blockAdvisor.evidenceFor),
 * whose `capabilityAffected` means exactly this: a live overlay is in
 * force. One gate, so none of the four can diverge again. The gates,
 * in order:
 *  - definite conflicts only: an UNKNOWN conflict excuses nothing
 *    (D113 ruling 1) - the row's own notice says "doesn't know yet";
 *  - HELD rules are dropped BEFORE the applied test, never rejected on
 *    (round 13, correcting the round-12 shape): D120 ruling 2 says
 *    hold suspends a rule's OWN automation, and D112 R8 says a held
 *    rule excuses nothing - so a held co-driver neither excuses nor
 *    vetoes the live applied rule's excusal. This is the shape the
 *    completion writer has always applied (actionableEpisodeConflicts
 *    drops held rows); round 12's helper rejected the whole answer on
 *    a held co-driver, which made the two writers record different
 *    things for the same row;
 *  - every LIVE definite driver must be APPLIED (red-team finding 4:
 *    declined or undecided leaves the row owed, never excused).
 * Returns the live definite driving conflicts when the answer is yes,
 * [] otherwise.
 */
export function removalExcusalConflicts(conflicts) {
  const definite = (conflicts ?? []).filter((c) => !c?.unknown);
  const live = definite.filter((c) => c?.row?.adaptationMode !== 'hold');
  if (!live.length) return [];
  const applied = live.every((c) => c?.row?.effectiveChoice === 'applied');
  return applied ? live : [];
}

/**
 * Round 15 (R15-1): the in-session notice's BRANCH SELECTION, extracted
 * pure so the truth table is driven, not source-pinned - three
 * consecutive rounds broke this chain one branch at a time (round 13
 * let the marker outrank a definite conflict's arrival, round 14 let a
 * held rule kill the marker, round 15 found the held line firing over
 * a substituted row whenever a definite baseline conflict co-existed,
 * denying both the substitution and the just-captured rule).
 *
 * The ranking, from the rulings:
 *  - the MARKER (a serve substitution's provenance) yields only to
 *    conflicts with LIVE automation or standing baseline facts -
 *    unknowns and held rules drive nothing (D113 ruling 1; D120 ruling
 *    2, D112 R8) and leave it;
 *  - the HELD line ("Volyume changes nothing until you say so") speaks
 *    only for a PURE held state: no marker (it would deny a change
 *    Volyume made), no live driver, no definite baseline conflict (the
 *    actionable truth outranks a rule that drives nothing);
 *  - the EPISODE line speaks for live definite episode drivers (and is
 *    NAMED from them alone - naming a held rule claimed too much);
 *  - the BASELINE line for definite baseline conflicts (baseline rules
 *    cannot be held: model.js refuses baseline episode groups and the
 *    hold write is keyed by episode_group_id);
 *  - the UNKNOWN line only when nothing definite exists at all.
 *
 * @returns {{kind: 'marker'|'held'|'episode'|'baseline'|'unknown'|null,
 *   drivingEpisode: Array, definiteEpisode: Array, definiteBaseline: Array,
 *   unknowns: Array}}
 */
export function constraintNoticeKind({ hasMarker = false, episodeConflicts: ep = [], baselineConflicts: base = [] } = {}) {
  const definiteEpisode = (ep ?? []).filter((c) => !c?.unknown);
  const definiteBaseline = (base ?? []).filter((c) => !c?.unknown);
  const drivingEpisode = definiteEpisode.filter((c) => c?.row?.adaptationMode !== 'hold');
  const unknowns = [...(ep ?? []), ...(base ?? [])].filter((c) => c?.unknown);
  const out = { drivingEpisode, definiteEpisode, definiteBaseline, unknowns };
  if (hasMarker && !drivingEpisode.length && !definiteBaseline.length) return { kind: 'marker', ...out };
  if (definiteEpisode.length && !drivingEpisode.length && !hasMarker && !definiteBaseline.length) return { kind: 'held', ...out };
  if (drivingEpisode.length) return { kind: 'episode', ...out };
  if (definiteBaseline.length) return { kind: 'baseline', ...out };
  if (unknowns.length) return { kind: 'unknown', ...out };
  return { kind: null, ...out };
}

export function computeCompletionEffects(sessionRows, capabilityState) {
  const entries = [];
  const excusedIds = [];
  const unperformedIds = [];
  (sessionRows ?? []).forEach((row, i) => {
    const exercise = row?.exercise ?? row;
    if (row?.performed) return;
    if (!exercise?.id) return;
    // Round 13 (R13-2): a row the user chose themselves (a picker
    // add-anyway, a manual swap) is outside the effective prescription -
    // its absence is the user's own edit, never a constraint excusal.
    // The removal writer has refused these since round 12; this writer
    // excused the same row if it was merely left unlogged instead of
    // deleted, which fabricated CONSTRAINED evidence off the user's own
    // choice (the class D123 ruling 5 rejected).
    if (row?.userChosen) return;
    unperformedIds.push(exercise.id);
    // D112 R8 + D113 ruling 1 + red-team finding 4: the certainty and
    // choice gates live in removalExcusalConflicts above - ONE shared
    // answer for both writers since round 13 (held rules dropped before
    // the applied test; unknown excuses nothing; every live definite
    // driver must be APPLIED - a declined or undecided rule leaves the
    // row owed, section 14 step 3 / section 18).
    const excusers = removalExcusalConflicts(actionableEpisodeConflicts(capabilityState, exercise));
    if (excusers.length) {
      excusedIds.push(exercise.id);
      entries.push({
        slot: i,
        rowId: row?.rowId ?? null,
        exerciseFrom: exercise.id,
        effect: 'omitted',
        constraintIds: excusers.map((c) => c.constraintId),
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
