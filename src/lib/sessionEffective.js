/**
 * sessionEffective.js - the CC29 cross-lane composition seam (sections 14,
 * 17). Lives OUTSIDE both lanes on purpose: the capability lane may not
 * import the preference lane (CAP-4 wall) and vice versa, and the
 * effective view needs BOTH answers (capability compatibility AND the
 * senior eligibility question for substitutes). planAutoGen composes the
 * lanes the same way for generation; this module does it for sessions.
 */
import {
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails,
  getAllExercises, setConstraintEffectiveChoice, appendSessionConstraintEffects,
  updateRoutineExerciseExercise, recordExerciseSwap, getActiveBlock,
} from './database';
import { loadCapabilityResolveState, blockingConflicts } from './capability/resolve';
import {
  computeEffectiveSession, EFFECTIVE_EFFECT, bestEligibleSubstitute, actionableEpisodeConflicts,
} from './capability/effective';
import { loadExerciseIntentState, isEligibleExercise } from './exercise/intent';
import { SWAP_SCOPE } from './exercise/swapScope';
import { CONSTRAINT_SOURCE } from './capability/model';

export { setConstraintEffectiveChoice };

/**
 * CC33 lead review (closes the substitute-eligibility gap W4A's preview
 * made visible): the ONE senior question every substitute selection in
 * this module asks. A substitute must clear BOTH lanes - the user's
 * preference eligibility AND their capability rules - because swapping a
 * conflicted movement for another movement the user's own rules block
 * (a different axis, a baseline rule, a held episode's restriction)
 * would put in their session the exact thing this whole layer exists to
 * keep out. blockingConflicts is the decision layer: allowance-carved,
 * clinician rank-2 never carveable, held episodes still counted (a hold
 * means "do not change my plan", never "I can do this").
 *
 * Serve, the served-count mirror, the plan-rewrite proposal, the
 * per-line preview and the plan-view caption memo all inject THIS, so
 * what is captioned is what is previewed is what is served is what a
 * rewrite would write - one answer, five consumers. Exported (round 5,
 * R5-7) so RoutineDetailScreen's caption asks the same question rather
 * than a weaker capability-only one - a weaker predicate predicts
 * substitutes serve will not make (§18's own defect, R5-5).
 */
export const substituteSeniorQuestion = (capState, intentState) => (ex) => (
  isEligibleExercise(intentState, ex) && blockingConflicts(capState, ex).length === 0
);

/**
 * Round 6 (R6-1): the intent state every capability path in this module
 * judges substitutes against, loaded WITH the active block's id - the
 * same scope the generator (planAutoGen.loadGenerationIntent), the
 * pickers and every screen already use. Loaded without it, an "Avoid
 * for this block" row compares its scopeMesocycleId against null and
 * goes dormant, so serve substituted IN the exact movement the user had
 * avoided for this block - and the plan rewrite offered to write it
 * into the document permanently. A failed block read is not a reason to
 * drop the preference lane: the state still loads, with block-scoped
 * avoidances simply not applying (planAutoGen's own posture).
 */
export async function loadScopedIntentState(userId) {
  let activeMesocycleId = null;
  try {
    const block = await getActiveBlock(userId);
    activeMesocycleId = block?.id ?? null;
  } catch (_e) { /* no block resolved: block-scoped avoidance simply doesn't apply */ }
  return loadExerciseIntentState(userId, { activeMesocycleId });
}

/**
 * The choice write. Its aggregate counter was RETIRED under the Q4
 * ruling (2026-08-21): no capability-derived event leaves the device,
 * because even a content-free event in a per-user table reveals that
 * the user has capability rules.
 */
export async function recordEffectiveChoice(userId, constraintId, choice) {
  return setConstraintEffectiveChoice(userId, constraintId, choice);
}

/**
 * Section 14 step 1/2: the per-line detail behind both the proposal
 * SUMMARY (computePlanEffectiveSummary, just below) and the per-line
 * review list (HowYouTrainScreen's "Choose per exercise" - D112 R4,
 * closes audit T2-23). One computation, two views: the summary is a
 * reduction of these lines, never a second pass, so the aggregate
 * counts and the per-line list can never disagree.
 *
 * D112 R4 (closes audit T2-05): the outcome is asked directly - is
 * there an eligible substitute for this exercise, or not - rather than
 * read off computeEffectiveSession's live SERVE-TIME gate. These rules
 * are still undecided (effective_choice NULL) at proposal time, so that
 * gate resolves every affected line CONFLICTED and never reaches
 * SUBSTITUTED or OMITTED (this function's own prior comment admitted as
 * much: "substituted or conflicted-pending"). The preview instead asks
 * the same question serve-time substitution asks once a choice is
 * 'applied' - bestEligibleSubstitute under the standard injected senior
 * question - so a line with a substitute previews as substituted and a
 * line with none previews as omitted, never the reverse, and
 * conflicted-pending never masquerades as either.
 *
 * Held episodes (adaptationMode 'hold') drive no proposal either (D112
 * R8): actionableEpisodeConflicts already excludes them, so a held
 * rule's id can never surface a line here.
 *
 * Exercises are resolved from the LIBRARY by id, exactly as
 * computeCapabilityPlanRewrite does below - the routine rows' own
 * embedded exercise objects carry no demand columns and would read as
 * unknown-conflicts.
 *
 * Round 6 (R6-3): two modes, one walk. The DEFAULT mode answers "what
 * would serving look like once these rules are applied" - the apply
 * proposal's question, judged with the wanted rules treated as applied.
 * serveGate mode answers "what is serve DOING right now" - a line
 * exists only where serve's own substitution gate passes (every
 * definite actionable conflict already 'applied'), so the applied-group
 * revisit dialogue and the revisit chooser never state a swap for a row
 * a declined or undecided rule is holding in place. BOTH modes mirror
 * serve's never-served-empty fail-safe (D116): a routine none of whose
 * rows would be served resolves to NO lines - serve serves that session
 * untouched, so there is nothing to claim about it.
 *
 * @param {string} userId
 * @param {string[]} ruleIds the constraint ids to judge (a just-created
 *   episode group, a restart's reactivated ids, or a batch of
 *   still-undecided ids collected on refresh/revisit); empty means
 *   nothing to offer, not "every rule" (unlike computeCapabilityPlanRewrite's
 *   null-means-all-baseline convention - this function is episode-scoped).
 * @param {{serveGate?: boolean}} opts
 * @returns {Promise<Array<{routineId: string, routineName: string|null,
 *   routineExerciseId: string|null, from: object, to: object|null,
 *   constraintIds: string[]}>>}
 */
export async function computePlanEffectiveLines(userId, ruleIds = [], { serveGate = false } = {}) {
  // Round 3 (R3-2): `checked` distinguishes "nothing affected" from
  // "could not check". A failed read and a genuinely unaffected plan
  // used to be the same empty array, and the vacuous-applied write
  // (D114 ruling 1) then recorded a decision on a read that FAILED - a
  // silent fail-open, against A15 and this lane's own posture law.
  // checked is true only when the computation genuinely ran: no plan
  // and no wanted ids are completed checks (there is nothing to
  // affect); an unavailable or empty capability state, a failed routine
  // read, or any throw is NOT a check, and no caller may treat it as an
  // answer.
  const out = [];
  // Round 7 (R7-4): routines whose candidate lines the fail-safe mirror
  // dropped. The fail-safe is REPORTED, never folded into "nothing
  // affected" - folded, the add flow's save toast ("Volyume will work
  // around this") was the only thing ever said about a rule the
  // fail-safe means it will not honour, the rule was recorded 'applied'
  // with no proposal, and the revisit row hid.
  const failSafeRoutineIds = [];
  let checked = false;
  try {
    const wanted = new Set(Array.isArray(ruleIds) ? ruleIds : []);
    if (!wanted.size) return { lines: out, checked: true, failSafeRoutineIds };
    const plan = await getActivePlan(userId);
    if (!plan?.id) return { lines: out, checked: true, failSafeRoutineIds };
    const [capState, intentState, library, routines] = await Promise.all([
      loadCapabilityResolveState(userId, {}),
      loadScopedIntentState(userId),
      getAllExercises(),
      getRoutinesForPlan(plan.id),
    ]);
    if (capState.empty || capState.unavailable) return { lines: out, checked: false, failSafeRoutineIds };
    checked = true;
    const byId = new Map((library ?? []).map((e) => [e.id, e]));
    for (const routine of routines ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(routine.id).catch(() => { checked = false; return []; });
      // R5-8: substitutes already spoken for within THIS routine - its
      // own rows, then each substitute as it is chosen - so two
      // conflicted rows of one muscle preview two different movements,
      // exactly as serve now assigns them. Scope is per routine: the
      // same movement on two different days is ordinary programming.
      const taken = new Set(
        (rows ?? []).map((r) => r?.exercise?.id ?? r?.exerciseId).filter(Boolean),
      );
      const isEligibleRow = substituteSeniorQuestion(capState, intentState);
      // R6-3: lines buffer per routine, plus whether ANY of its rows
      // would be served - the never-served-empty fail-safe (D116) is a
      // per-session decision, so it must be mirrored per routine: when
      // nothing would be served, serve serves the base session
      // untouched and these lines must not exist.
      const routineLines = [];
      let anyServed = false;
      for (const row of rows ?? []) {
        const exercise = byId.get(row?.exercise?.id ?? row?.exerciseId) ?? null;
        // A row the library cannot resolve is served (unknown drives
        // nothing automatic), so it counts toward the fail-safe test.
        if (!exercise) { anyServed = true; continue; }
        // Definite conflicts only (F1 class): proposing to swap a line on
        // an UNKNOWN conflict would justify a change with a movement fact
        // the app has not established - the same gate serve applies.
        const definite = actionableEpisodeConflicts(capState, exercise)
          .filter((c) => !c.unknown);
        if (!definite.length) { anyServed = true; continue; }
        // R6-3: in serve-gate mode a row is a line only where serve's
        // own substitution gate passes; a row any declined or undecided
        // rule holds in place is SERVED conflicted, and no dialogue may
        // claim a swap for it.
        if (serveGate && !definite.every((c) => c.row?.effectiveChoice === 'applied')) {
          anyServed = true;
          continue;
        }
        // R6-3, default mode: the would-if premise treats the WANTED
        // rules as applied and everything else by its standing choice.
        // A DECLINED co-driver keeps the row served whatever this
        // proposal's answer, so no line may claim it would move; an
        // undecided co-driver is read optimistically (it has its own
        // proposal pending), which is where the two modes differ.
        if (!serveGate && definite.some(
          (c) => !wanted.has(c.constraintId) && c.row?.effectiveChoice === 'declined',
        )) {
          anyServed = true;
          continue;
        }
        const conflicts = definite.filter((c) => wanted.has(c.constraintId));
        if (!conflicts.length) {
          if (definite.every((c) => c.row?.effectiveChoice === 'applied')) {
            // Not this proposal's line, but serve is already substituting
            // it under other APPLIED rules - consume its substitute in row
            // order so the lines below name the movements serve would
            // actually assign, not the ones it has already spent. With no
            // substitute left, serve omits it - not served.
            const spent = bestEligibleSubstitute(exercise, library, isEligibleRow, taken);
            if (spent) { taken.add(spent.id); anyServed = true; }
          } else {
            // Declined/undecided out-of-scope drivers keep the row in
            // place, visibly conflicted - served.
            anyServed = true;
          }
          continue;
        }
        const substitute = bestEligibleSubstitute(exercise, library, isEligibleRow, taken);
        if (substitute) { taken.add(substitute.id); anyServed = true; }
        routineLines.push({
          routineId: routine.id,
          routineName: routine.name ?? null,
          // The routine_exercise row's OWN id lives nested under
          // `.routineExercise` (getRoutineExercisesWithDetails returns
          // { routineExercise, exercise }, not a flat { id, exercise } -
          // confirmed against database.js:4450-4516 and duplicateRoutine's
          // own destructure at :4695). Not needed by any caller of this
          // function today (the episode overlay records choices against
          // the RULE, never the row), but resolved correctly in case a
          // future caller needs it.
          routineExerciseId: row?.routineExercise?.id ?? null,
          from: exercise,
          to: substitute,
          constraintIds: conflicts.map((c) => c.constraintId),
        });
      }
      // R6-3: the fail-safe mirror. A routine with rows but nothing
      // served is one serve serves UNTOUCHED (D116, never served
      // empty) - its rows all stand, so no line about it is true.
      // R7-4: a routine whose CANDIDATE lines the mirror dropped is
      // reported by id, so callers can tell the user instead of
      // reading it as "nothing affected".
      if ((rows ?? []).length && !anyServed) {
        if (routineLines.length) failSafeRoutineIds.push(routine.id);
        continue;
      }
      out.push(...routineLines);
    }
  } catch (_e) { checked = false; /* read-only; empty-unchecked means "could not tell" */ }
  return { lines: out, checked, failSafeRoutineIds };
}

/**
 * Section 14 step 1: the proposed diff summary for a NEW episode against
 * the active plan - a reduction of computePlanEffectiveLines (above),
 * never a separate computation, so the counts and the per-line list can
 * never disagree. Read-only.
 *
 * @returns {Promise<{affected: number, substituted: number, omitted: number,
 *   checked: boolean}>} checked=false means the answer is "could not
 *   tell", never "nothing affected" - callers must not act on it (R3-2).
 */
export async function computePlanEffectiveSummary(userId, createdIds = []) {
  const { lines, checked, failSafeRoutineIds } = await computePlanEffectiveLines(userId, createdIds);
  // R7-4: failSafeRoutines rides the summary so the proposal can TELL
  // the fail-safe case instead of treating it as "nothing affected".
  const out = {
    affected: lines.length, substituted: 0, omitted: 0, checked,
    failSafeRoutines: (failSafeRoutineIds ?? []).length,
  };
  for (const line of lines) {
    if (line.to) out.substituted += 1;
    else out.omitted += 1;
  }
  return out;
}

/**
 * D112 R6 (closes audit T1-04/T1-26): the ids among these that are
 * clinician-sourced, read straight from the resolver's own state. The
 * confirm gate for declining a clinician-driven proposal
 * (HowYouTrainScreen's proposeEffectiveDiff / saveLineReview) reads this
 * before recording anything, so it is never fooled by a caller's own
 * partial row data (a synced-in rule, a multi-episode revisit batch).
 *
 * @returns {Promise<Set<string>>}
 */
export async function clinicianSourcedIds(userId, ruleIds = []) {
  const wanted = new Set(Array.isArray(ruleIds) ? ruleIds : []);
  if (!wanted.size) return new Set();
  try {
    const capState = await loadCapabilityResolveState(userId, {});
    if (capState.empty) return new Set();
    return new Set(
      (capState.restrictions ?? [])
        .filter((r) => wanted.has(r.id) && r.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED)
        .map((r) => r.id),
    );
  } catch (_e) { return new Set(); }
}

/**
 * D112 R4 (closes audit T2-23's recoverability half): whether the
 * standing "Your plan and how you train" revisit row has anything to
 * offer right now. Both proposal paths need an active plan to have
 * anything to say, so that gates first; then either an undecided
 * episode rule (the caller supplies its own already-loaded ids - no
 * second capability read for something the screen already has in
 * state) or an un-rewritten baseline conflict
 * (computeCapabilityPlanRewrite with no ruleIds, which already judges
 * every active baseline rule) makes the row worth showing. Read-only;
 * fails to false - the row simply stays hidden on a read problem, never
 * a crash, never a dead tap.
 *
 * Round 3 (R3-2 limb b): an APPLIED episode rule that currently produces
 * lines against the plan also makes the row show - a rule recorded
 * applied vacuously (nothing affected at the time, D114 ruling 1) must
 * regain its review the moment it starts to bite, or the plan is
 * reshaped by a decision the user cannot revisit.
 *
 * Round 6 (R6-3 note): this check deliberately stays on the DEFAULT
 * would-if mode, not serveGate - showing the row for a rule whose
 * effect is currently held off by a declined co-driver is not a false
 * claim (the row says "review", it states no swap), and hiding it
 * would strand the revisit. The dialogues the tap opens use serveGate
 * for what they actually SAY.
 *
 * @returns {Promise<boolean>}
 */
export async function hasCapabilityToRevisit(userId, undecidedEpisodeRuleIds = [], appliedEpisodeRuleIds = []) {
  try {
    const plan = await getActivePlan(userId);
    if (!plan?.id) return false;
    if (Array.isArray(undecidedEpisodeRuleIds) && undecidedEpisodeRuleIds.length) return true;
    // Round 4 (Q4): the two full-plan sweeps short-circuit - the
    // baseline rewrite check runs first, and the applied-lines sweep
    // only when it found nothing, so the common focus pays one sweep.
    const rw = await computeCapabilityPlanRewrite(userId, {});
    if (rw.lines.length > 0) return true;
    if (Array.isArray(appliedEpisodeRuleIds) && appliedEpisodeRuleIds.length) {
      const { lines, failSafeRoutineIds } = await computePlanEffectiveLines(userId, appliedEpisodeRuleIds);
      // R7-4: a fail-safed applied rule is REVISITABLE - it used to
      // hide the row entirely, leaving the episode card as the only
      // route back to a decision recorded without a proposal.
      if (lines.length || (failSafeRoutineIds ?? []).length) return true;
    }
    return false;
  } catch (_e) {
    return false;
  }
}

/**
 * Section 14 step 3 (serve time): the effective view of a session's rows
 * under APPLIED episode rules. Substituted rows carry a quiet temporary
 * marker (_capabilityTemp) naming the original; omitted rows are dropped
 * AND written to the session's effects record so adherence and history
 * stay honest. Rows return UNTOUCHED (same array) when nothing applies -
 * declined/undecided rules leave their rows in place (the section 17
 * conflicted notice handles those), and baseline rules never appear here
 * at all (RT2-1).
 *
 * Round 3 (R3-4): the result carries each served row's BASE INDEX. The
 * screen used to reconstruct the mapping by id, and any reconstruction
 * breaks on duplicate exercise ids the moment an omission leaves a hole
 * (the scan claimed the omitted plan slot for the user's own added row,
 * so a relaunch replaced a _userAdded entry with the row the app had
 * just omitted - against A10). The module knows the index; it says so.
 *
 * Round 10 (R10-1): the effects record's identity is the PLANNED SLOT.
 * The caller passes each row's stable planned-row id (rowIds[i], the
 * routineExercise's own id) and every entry carries it, so one exercise
 * filling two slots writes two true entries instead of collapsing to
 * one in the writer's dedupe. A row with no planned id stamps null and
 * keeps the old per-exercise collapse, stated in the writer.
 *
 * @param {string} userId
 * @param {string|null} workoutId for the omission effects record
 * @param {Array} rows the session's exercise rows
 * @param {{rowIds?: Array<string|null>}} [opts] rowIds[i] is base slot
 *   i's stable planned-row id (or null)
 * @returns {Promise<{served: Array, baseIndexes: number[], untouched: boolean}>}
 *   untouched=true means the base session stands exactly as given
 *   (served IS the caller's own array); otherwise served[k] belongs to
 *   base slot baseIndexes[k].
 */
export async function applyEffectiveViewToSession(userId, workoutId, rows, { rowIds = null } = {}) {
  const untouched = () => ({
    served: rows,
    baseIndexes: Array.isArray(rows) ? rows.map((_, i) => i) : [],
    untouched: true,
  });
  try {
    if (!userId || !Array.isArray(rows) || !rows.length) return untouched();
    const capState = await loadCapabilityResolveState(userId, {});
    const hasApplied = !capState.empty && !capState.unavailable
      && (capState.restrictions ?? []).some((r) => r.role === 'episode' && r.effectiveChoice === 'applied');
    if (!hasApplied) return untouched();
    const [intentState, library] = await Promise.all([
      loadScopedIntentState(userId),
      getAllExercises(),
    ]);
    // CC33 adversarial review F1, closed at this root: the rows a live
    // session serves come from getRoutineExercisesWithDetails, whose
    // embedded exercise literal carries NO demand columns
    // (database.js:4482-4515) - judged raw, every demand check read
    // null, every row resolved UNKNOWN, and an applied demand rule
    // substituted the entire session (compatible movements traded
    // places). Judge library-resolved rows instead - the same
    // by-id resolution every other consumer in this module already
    // performs. The ORIGINAL row objects still flow through the output
    // (unchanged rows return rows[i], paired with their base index), so
    // markers like _userAdded are judged and served intact.
    // A row the library cannot resolve is judged on what it carries and
    // lands in the unknown lane, which drives nothing automatic.
    const byId = new Map((library ?? []).map((e) => [e.id, e]));
    const view = computeEffectiveSession(
      rows.map((e) => {
        const resolved = e?.id ? byId.get(e.id) : null;
        // _userAdded must survive resolution - computeEffectiveSession
        // does not read it, but the serve loop below reads it off the
        // ORIGINAL rows[i], so only the judgement object is swapped.
        return { exercise: resolved ?? e };
      }), library, capState,
      substituteSeniorQuestion(capState, intentState),
    );
    if (!view.anyEffect) return untouched();
    const served = [];
    const baseIndexes = [];
    const effects = [];
    view.lines.forEach((line, i) => {
      // D112 R4 (CAP-2, closes audit T2-04): a row the user added to this
      // session themselves is served exactly as they added it - their
      // explicit choice outranks the effective view, whatever it resolves.
      if (rows[i]?._userAdded) {
        served.push(rows[i]);
        baseIndexes.push(i);
        return;
      }
      if (line.effect === EFFECTIVE_EFFECT.SUBSTITUTED && line.exerciseTo) {
        served.push({
          ...line.exerciseTo,
          // The quiet temporary marker (section 17): the substitute is
          // ordinary loggable content; only the marker line frames it.
          // rowId (R10-1) rides along so the manual-swap amend path can
          // find this slot's own entry.
          _capabilityTemp: {
            fromId: line.exerciseFrom.id, fromName: line.exerciseFrom.name,
            constraintIds: line.constraintIds, rowId: rowIds?.[i] ?? null,
          },
          sets: rows[i]?.sets ?? [],
        });
        baseIndexes.push(i);
        // D112 R7 (section 20; closes audit T2-13): the substitution is
        // recorded too, so a week the restriction reshaped WITHOUT
        // omissions still reads reshaped - the CONSTRAINED limiter's
        // missing evidence. The append dedupes on (effect, exerciseFrom,
        // rowId) - per planned slot since R10-1 - so a relaunch
        // re-serving the same view writes nothing new, and the excusal
        // counter's LIKE '%"omitted"%' is untouched by these.
        effects.push({
          slot: i, rowId: rowIds?.[i] ?? null,
          exerciseFrom: line.exerciseFrom.id, exerciseTo: line.exerciseTo.id,
          effect: 'substituted', constraintIds: line.constraintIds, source: 'serve',
        });
      } else if (line.effect === EFFECTIVE_EFFECT.OMITTED) {
        effects.push({
          slot: i, rowId: rowIds?.[i] ?? null,
          exerciseFrom: line.exerciseFrom.id, effect: 'omitted', constraintIds: line.constraintIds, source: 'serve',
        });
      } else {
        served.push(rows[i]);
        baseIndexes.push(i);
      }
    });
    // Round 4 (F-2): the durable record follows the SERVE decision,
    // never precedes it. The append used to run before the
    // served-length check, so a session whose every row was omitted
    // wrote N omission effects and then fail-safed to serving the full
    // base session - the summary said "N left out" about rows the user
    // was shown, the week counted the session constraint-excused, an
    // early walk-out was credited as completed, and the weekly
    // denominator dropped a session the app served intact. A
    // fully-omitted session is the fail-safe case (never served empty -
    // lead ruling, D116: the rows serve with their visible conflict
    // notices; a dead-end empty session helps nobody), and the record
    // must describe what actually happened: nothing.
    if (!served.length) return untouched();
    if (effects.length && workoutId) {
      // Round 9 (R9-1): a pure, deduped APPEND - round 8's replaceSource
      // is reverted. A second serve pass runs over the already-reduced
      // list and cannot re-derive the earlier pass's omission, so
      // replacing serve's prior entries DELETED a true record. The
      // source tag stays for forensics. Round 10 corrected R9-1's
      // reachability claim: a second pass is reachable whenever the
      // last _capabilityTemp row is removed or manually swapped away
      // (the relaunch guard checks the markers, and those actions clear
      // them) - the revert's conclusion is unchanged by that.
      await appendSessionConstraintEffects(userId, workoutId, effects).catch(() => {});
    }
    return { served, baseIndexes, untouched: false };
  } catch (_e) {
    return untouched(); // the base session always stands
  }
}

/**
 * D112 R2/R5 (closes audit T1-17): the session row count the logger will
 * actually SERVE for one routine, not the base routine's raw row count.
 * Mirrors applyEffectiveViewToSession's wiring above (capability state +
 * the senior eligibility question) but only counts - it writes nothing
 * and records no effects. Substituted rows still count (the session still
 * happens, with a different exercise); only OMITTED rows drop the served
 * count below the base total. Exercises are resolved from the LIBRARY by
 * id, exactly as computeCapabilityPlanRewrite does - the routine rows'
 * own embedded exercise objects carry no demand columns and would read as
 * unknown-conflicts.
 *
 * Fail-safe: an error after the routine read returns the base row
 * count, and no applied episode rule returns it untouched - a
 * capability read must never block or shrink the Today card. Round 6
 * (B9): a failure BEFORE the base count exists returns null - "could
 * not count" - never 0, which is a real answer ("this routine is
 * empty") and, being falsy, made HomeScreen's `??` fallback skip the
 * raw count and hide the exercises line entirely, against that
 * render's own stated contract. Read-only, cheap: one call per focus
 * (HomeScreen wires it).
 *
 * @param {string} userId
 * @param {string} routineId
 * @returns {Promise<number|null>} the served row count, or null when
 *   the routine could not be read at all
 */
export async function countEffectiveSessionRows(userId, routineId) {
  let baseCount = null;
  try {
    if (!userId || !routineId) return null;
    const rows = await getRoutineExercisesWithDetails(routineId);
    baseCount = Array.isArray(rows) ? rows.length : 0;
    if (!baseCount) return 0;
    const capState = await loadCapabilityResolveState(userId, {});
    const hasApplied = !capState.empty && !capState.unavailable
      && (capState.restrictions ?? []).some((r) => r.role === 'episode' && r.effectiveChoice === 'applied');
    if (!hasApplied) return baseCount;
    const library = await getAllExercises();
    const byId = new Map((library ?? []).map((e) => [e.id, e]));
    const baseRows = rows
      .map((r) => ({ exercise: byId.get(r?.exercise?.id ?? r?.exerciseId) ?? null }))
      .filter((r) => r.exercise);
    if (!baseRows.length) return baseCount;
    const intentState = await loadScopedIntentState(userId);
    const view = computeEffectiveSession(
      baseRows, library, capState, substituteSeniorQuestion(capState, intentState),
    );
    const omitted = view.lines.filter((l) => l.effect === EFFECTIVE_EFFECT.OMITTED).length;
    // Round 5 (R5-4): serve's own never-served-empty fail-safe (D116),
    // mirrored - not just serve's wiring. A routine whose every row
    // would be omitted is SERVED IN FULL by applyEffectiveViewToSession
    // (`if (!served.length) return untouched()`), so the count this
    // function mirrors is the base count, never 0 - a 0 here made the
    // Today card's "N exercises" line vanish (falsy) for a session the
    // app was about to serve whole. Rows the library cannot resolve
    // never reach `view.lines` but ARE served, so the subtraction runs
    // against baseCount, matching serve's arithmetic exactly.
    const served = baseCount - omitted;
    return served > 0 ? served : baseCount;
  } catch (_e) {
    return baseCount;
  }
}

/**
 * D112 R1a/b (closes audit T1-03 and T2-01's rebuild half): the per-line
 * PLAN REWRITE proposal for capability rules against the ACTIVE plan.
 *
 * Permanent shapes the document. The episode overlay above is serve-time
 * and reversible ("everything returns when you end it"); a BASELINE rule
 * has no end to return from, so its conflicts are resolved by changing
 * the plan itself - through the user's explicit choice, never silently.
 * The same computation serves promotion: promoteEpisode returns the
 * minted baseline row ids, and those ids are this function's ruleIds.
 *
 * Exercises are resolved from the LIBRARY by id (the routine rows carry
 * partial exercise objects without demand columns, which would read as
 * unknown-conflicts). Substitutes come from bestEligibleSubstitute under
 * the injected senior question, exactly as serve-time substitution
 * chooses them - so the plan the user accepts is the plan they were
 * already being served. A line with no eligible substitute keeps its
 * exercise (never silently emptied) and reports itself unsolvable.
 *
 * @param {string} userId
 * @param {{ruleIds?: string[]|null}} opts limit to conflicts driven by
 *   these constraint ids (a just-created or just-promoted group); null
 *   judges every active BASELINE rule.
 * @returns {Promise<{lines: Array<{routineId: string, routineName: string|null,
 *   routineExerciseId: string|null, from: object, to: object|null,
 *   constraintIds: string[]}>, substitutable: number, unsolvable: number,
 *   checked: boolean}>} checked=false means "could not tell" (R3-2's
 *   distinction, extended here under R5-9): an unavailable capability
 *   state, a failed routine read, or any throw. Callers must not present
 *   an unchecked empty result as "nothing needs attention".
 */
export async function computeCapabilityPlanRewrite(userId, { ruleIds = null } = {}) {
  const out = {
    lines: [], substitutable: 0, unsolvable: 0, checked: false,
  };
  try {
    if (!userId) return out;
    const plan = await getActivePlan(userId);
    if (!plan?.id) { out.checked = true; return out; }
    const [capState, intentState, library, routines] = await Promise.all([
      loadCapabilityResolveState(userId, {}),
      loadScopedIntentState(userId),
      getAllExercises(),
      getRoutinesForPlan(plan.id),
    ]);
    const wanted = Array.isArray(ruleIds) && ruleIds.length ? new Set(ruleIds) : null;
    if (capState.unavailable) return out;
    if (capState.empty) {
      // No rules at all is a completed answer for the standing audit -
      // but a caller holding SPECIFIC rule ids it could not find here
      // has two reads that disagree, which is "could not tell".
      out.checked = !wanted;
      return out;
    }
    out.checked = true;
    const byId = new Map((library ?? []).map((e) => [e.id, e]));
    const roleById = new Map((capState.restrictions ?? []).map((r) => [r.id, r.role]));
    const isEligibleRow = substituteSeniorQuestion(capState, intentState);
    for (const routine of routines ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(routine.id).catch(() => { out.checked = false; return []; });
      // R5-8: the ids this routine already holds, then each substitute
      // as it is chosen - the rewrite writes the DOCUMENT, so without
      // this two conflicted rows of one muscle were both permanently
      // rewritten to the same movement (the reviewer's executed probe:
      // Back Squat and Walking Lunge both to Leg Press). A line whose
      // candidates are all taken falls to the next rank, then to
      // unsolvable - kept in place with its honest quiet note, never a
      // duplicate.
      const taken = new Set(
        (rows ?? []).map((r) => r?.exercise?.id ?? r?.exerciseId).filter(Boolean),
      );
      for (const row of rows ?? []) {
        const exercise = byId.get(row?.exercise?.id ?? row?.exerciseId) ?? null;
        if (!exercise) continue;
        // Definite conflicts only (F1 class): the document is never
        // rewritten on an UNKNOWN conflict - a proposal reading "this
        // sits outside how you train" about a movement fact the app has
        // not established would be false. Unknown rows keep their honest
        // quiet notice instead.
        let conflicts = blockingConflicts(capState, exercise).filter((c) => !c.unknown);
        conflicts = wanted
          ? conflicts.filter((c) => wanted.has(c.constraintId))
          // No ids means the standing audit: BASELINE rules only - an
          // episode conflict is the overlay's business, not the document's.
          : conflicts.filter((c) => roleById.get(c.constraintId) === 'baseline');
        if (!conflicts.length) continue;
        const substitute = bestEligibleSubstitute(exercise, library, isEligibleRow, taken);
        if (substitute) taken.add(substitute.id);
        out.lines.push({
          routineId: routine.id,
          routineName: routine.name ?? null,
          // The routine_exercise row's own id lives nested under
          // `.routineExercise` - getRoutineExercisesWithDetails returns
          // { routineExercise, exercise } (database.js:4516), never a
          // flat { id }. The old `row.id` here was undefined for every
          // row, so applyCapabilityPlanRewrite's guard skipped every
          // accepted line and "Update my plan" silently did nothing
          // (W4A review finding, closed at this root the same day).
          routineExerciseId: row?.routineExercise?.id ?? null,
          from: exercise,
          to: substitute,
          constraintIds: conflicts.map((c) => c.constraintId),
        });
        if (substitute) out.substitutable += 1; else out.unsolvable += 1;
      }
    }
  } catch (_e) { out.checked = false; /* read-only proposal; unchecked means "could not tell" */ }
  return out;
}

/**
 * Apply the accepted rewrite lines: each substitutable line's routine row
 * moves to its substitute through updateRoutineExerciseExercise (which
 * rebuilds the prescription for the new movement), and the swap is
 * recorded with PROGRAMME scope - cause derives centrally at write time,
 * so a capability-driven rewrite carries cause='constraint' and never
 * teaches the preference lane (CAP-13). Unsolvable lines are left
 * exactly as they are: the quiet baseline-conflict notice marks them.
 *
 * Best-effort per line; one failed write never abandons the rest.
 *
 * @returns {Promise<{applied: number, failed: number}>}
 */
export async function applyCapabilityPlanRewrite(userId, lines = []) {
  const out = { applied: 0, failed: 0 };
  for (const line of Array.isArray(lines) ? lines : []) {
    if (!line?.to?.id || !line?.routineExerciseId) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await updateRoutineExerciseExercise(line.routineExerciseId, line.to.id);
      // eslint-disable-next-line no-await-in-loop
      await recordExerciseSwap(userId, line.from?.id, line.to.id, {
        routineId: line.routineId ?? null,
        explicit: true,
        scope: SWAP_SCOPE.PROGRAMME,
      }).catch(() => { /* provenance is additive */ });
      out.applied += 1;
    } catch (_e) {
      out.failed += 1;
    }
  }
  return out;
}
