/**
 * exercise/intent.js — Campaign 9's canonical exercise-intent layer.
 *
 * Before this, every selecting surface answered "should this exercise be
 * offered?" for itself, and none of them could answer it at all: there was
 * no stored user intent about exercises anywhere in the app. The swap
 * sheet ranked on structural similarity alone (swapEngine.rankSwaps), the
 * generators filtered on equipment and muscle, and nothing remembered that
 * a user had said "stop suggesting this".
 *
 * This module is the ONE place that decides. Screens and generators load a
 * state object once and then ask pure questions of it. No screen re-derives
 * exclusion or preference for itself.
 *
 * THE LAWS THIS MODULE ENFORCES
 *
 *  - Exercise changes are never automatic. Nothing here mutates a plan.
 *    It answers questions; a human acts on the answers.
 *  - Explicit user intent outranks anything inferred. An exclusion beats
 *    swap history; an approved default beats a counted preference.
 *  - Exclusion is about future SUGGESTIONS, never about history. No
 *    function here touches workouts, sets or PRs.
 *  - Ranking exposure is not evidence. This module never writes. Only a
 *    real user action (database.recordExerciseSwap) creates evidence, so
 *    showing something first can never make it look more preferred next
 *    time.
 *  - No fake effectiveness score. Evidence is reported as separate named
 *    dimensions with an explicit "not enough history yet" state. Nothing
 *    here claims one exercise builds more muscle than another; ordinary
 *    training logs cannot support that and we do not pretend otherwise.
 */
import {
  EXERCISE_INTENT,
  getExerciseIntents,
  getExerciseSwaps,
  getExerciseSlotDefaults,
  getExerciseUsageStats,
  getExerciseProgressionSessions,
} from '../database';
import { SWAP_SCOPE } from './swapScope';
// C16 quality law 3: the GENERIC judgement of what makes a sensible
// default, used as the baseline that personal evidence has to earn its way
// past.
import { tierRank } from './canonicality';
import { detectPlateau, detectProgressionConsistency } from '../algorithms';

export { EXERCISE_INTENT, SWAP_SCOPE };

/** Repeated means repeated: one swap is a choice, not a pattern. */
export const REPEATED_SWAP_MIN = 3;

/**
 * Load everything the selecting surfaces need, once.
 *
 * @param {string} userId
 * @param {{activeMesocycleId?: string|null, progressionForIds?: string[]}} [opts]
 *   activeMesocycleId is the CURRENT block's id. Block-scoped avoidance is
 *   compared against this rather than against a calendar duration, so
 *   "avoid for this block" expires exactly when the block does and not a
 *   day either side of it.
 *
 *   progressionForIds bounds the progression read to the exercises actually
 *   on screen. Progression evidence needs per-session history, which is far
 *   too expensive to load for the whole catalogue; callers that do not need
 *   it simply omit the list and every exercise reports 'insufficient'.
 */
export async function loadExerciseIntentState(userId, { activeMesocycleId = null, progressionForIds = null } = {}) {
  const empty = {
    intents: new Map(), swaps: [], defaults: [], usage: new Map(),
    progression: new Map(), activeMesocycleId,
  };
  if (!userId) return empty;
  try {
    const [intents, swaps, defaults, usage, sessions] = await Promise.all([
      getExerciseIntents(userId),
      getExerciseSwaps(userId),
      getExerciseSlotDefaults(userId),
      getExerciseUsageStats(userId),
      Array.isArray(progressionForIds) && progressionForIds.length
        ? getExerciseProgressionSessions(userId, progressionForIds)
        : Promise.resolve(new Map()),
    ]);
    // Judged here, once, by the shared law - never re-derived per screen.
    const progression = new Map();
    for (const [exerciseId, perSession] of (sessions ?? new Map())) {
      const consistency = detectProgressionConsistency(perSession);
      const plateau = detectPlateau(perSession);
      progression.set(exerciseId, {
        ...consistency,
        plateau: plateau.plateau === true,
        plateauResolution: plateau.resolution ?? null,
      });
    }
    return {
      intents: new Map((intents ?? []).filter((r) => r?.exerciseId).map((r) => [r.exerciseId, r])),
      swaps: swaps ?? [],
      defaults: defaults ?? [],
      usage: new Map((usage ?? []).filter((r) => r?.exerciseId).map((r) => [r.exerciseId, r])),
      progression,
      activeMesocycleId,
    };
  } catch (_e) {
    // Fail OPEN on a read error, deliberately. A transient database failure
    // must not silently start suppressing exercises the user never
    // excluded, nor invent a preference. No state means no intent, which
    // is exactly the pre-Campaign-9 behaviour.
    return empty;
  }
}

/**
 * Campaign 9 closeout item 3: which exercises in a plan the user has set
 * aside. Used after copying a published plan, where the exercise list
 * comes from the plan's author rather than from Volyume suggesting
 * anything.
 *
 * Reports the conflict; resolves nothing. Both facts stand - the user
 * chose this plan, AND they told Volyume to stop suggesting this
 * exercise - so the choice is theirs to make.
 */
export async function findPlanIntentConflicts(planId, state) {
  if (!planId || !state?.intents?.size) return [];
  try {
    // eslint-disable-next-line global-require
    const { getRoutinesForPlan, getRoutineExercisesWithDetails } = require('../database');
    const routines = await getRoutinesForPlan(planId);
    const conflicts = [];
    const seen = new Set();
    for (const routine of routines ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(routine.id).catch(() => []);
      for (const row of rows ?? []) {
        const id = row?.exercise?.id;
        if (!id || seen.has(id) || isEligible(state, id)) continue;
        seen.add(id);
        conflicts.push({
          exerciseId: id,
          exerciseName: row.exercise?.name ?? null,
          routineId: routine.id,
          routineExerciseId: row.id ?? row.routineExercise?.id ?? null,
          workoutName: routine.name ?? null,
        });
      }
    }
    return conflicts;
  } catch (_e) {
    // A read failure must not block the user's own plan choice.
    return [];
  }
}

// ─── Intent questions ────────────────────────────────────────────────────────

/** The raw intent row, or null. */
export function intentFor(state, exerciseId) {
  return state?.intents?.get(exerciseId) ?? null;
}

/** "Don't suggest this exercise": indefinite, until explicitly restored. */
export function isExcluded(state, exerciseId) {
  return intentFor(state, exerciseId)?.kind === EXERCISE_INTENT.EXCLUDED;
}

/**
 * "Avoid for this block": live only while the block it was set against is
 * still the current one. A row scoped to a finished block is spent, which
 * is how the avoidance expires without any invented duration.
 */
export function isAvoidedThisBlock(state, exerciseId) {
  const row = intentFor(state, exerciseId);
  if (row?.kind !== EXERCISE_INTENT.AVOIDED_BLOCK) return false;
  if (!row.scopeMesocycleId) return false;
  return row.scopeMesocycleId === (state?.activeMesocycleId ?? null);
}

/**
 * May this exercise be SUGGESTED or auto-selected right now? This is the
 * single question every builder, generator and swap sheet asks.
 *
 * It is not a question about whether the user may choose it deliberately:
 * an excluded exercise stays reachable through "show excluded", and its
 * history stays visible everywhere.
 */
export function isEligible(state, exerciseId) {
  return !isExcluded(state, exerciseId) && !isAvoidedThisBlock(state, exerciseId);
}

/** Filter a candidate list down to what may be suggested. Pure. */
export function filterEligible(state, exercises, getId = (e) => e?.id) {
  if (!Array.isArray(exercises)) return [];
  return exercises.filter((e) => isEligible(state, getId(e)));
}

/**
 * The user's APPROVED default replacement for a source exercise, if they
 * have set one. A routine-specific default wins over a plan-wide one:
 * preference is contextual, and the more specific context is the better
 * answer.
 */
export function approvedDefaultFor(state, fromExerciseId, routineId = null) {
  const rows = (state?.defaults ?? []).filter((r) => r.fromExerciseId === fromExerciseId);
  const scoped = rows.find((r) => r.routineId != null && r.routineId === routineId);
  const general = rows.find((r) => r.routineId == null);
  const pick = scoped ?? general ?? null;
  if (!pick) return null;
  // An approved default that the user has since excluded is not offered:
  // the newer explicit intent wins over the older explicit intent.
  if (!isEligible(state, pick.exerciseId)) return null;
  return pick.exerciseId;
}

// ─── Swap evidence ───────────────────────────────────────────────────────────

/**
 * What has this user actually chosen when replacing `fromExerciseId`?
 * Returns one entry per replacement, newest-first within equal counts.
 *
 * Contextual by construction: this asks "instead of A", never "in general".
 * `routineId` narrows it further when the caller knows the slot.
 */
export function swapEvidenceFor(state, fromExerciseId, { routineId = null } = {}) {
  const rows = (state?.swaps ?? []).filter(
    (r) => r.fromExerciseId === fromExerciseId
      && (routineId == null || r.routineId == null || r.routineId === routineId),
  );
  const byTarget = new Map();
  for (const r of rows) {
    const cur = byTarget.get(r.toExerciseId) ?? { exerciseId: r.toExerciseId, count: 0, lastMs: 0, explicit: false };
    cur.count += 1;
    cur.lastMs = Math.max(cur.lastMs, r.createdAt ?? 0);
    if (r.explicit) cur.explicit = true;
    byTarget.set(r.toExerciseId, cur);
  }
  return [...byTarget.values()].sort((a, b) => b.count - a.count || b.lastMs - a.lastMs);
}

/**
 * How often has the user deliberately swapped this exercise OUT OF THEIR
 * PROGRAMME? The negative-preference signal.
 *
 * C16 quality law 1: only `programme`-scoped swaps count. A substitution
 * made during a workout because the machine was busy is not a statement
 * about the exercise, and it used to be indistinguishable from editing the
 * exercise out of the plan - two busy-machine days reached the threshold
 * and the exercise was proposed for removal.
 *
 * Rows recorded before scope existed are NULL and are NOT counted. That
 * asymmetry is deliberate and it favours the user: under-counting costs one
 * more deliberate swap before Volyume acts, over-counting silently removes
 * an exercise they like.
 */
export function swappedAwayCount(state, exerciseId) {
  return (state?.swaps ?? []).filter(
    (r) => r.fromExerciseId === exerciseId && r.scope === SWAP_SCOPE.PROGRAMME,
  ).length;
}

/**
 * How often has the user substituted this exercise FOR ONE SESSION?
 *
 * Exposed separately and deliberately never used as negative preference.
 * It is a real observation - "this one is often unavailable when you train"
 * - and a future surface may want it, but it must never reach a
 * replace decision.
 */
export function sessionSubstitutionCount(state, exerciseId) {
  return (state?.swaps ?? []).filter(
    (r) => r.fromExerciseId === exerciseId && r.scope === SWAP_SCOPE.SESSION,
  ).length;
}

/**
 * The exercise the user most recently replaced with this one - so a second
 * swap can offer the original back under "Previously used" instead of
 * burying it in the full catalogue.
 */
export function previouslyUsedBefore(state, exerciseId) {
  const rows = (state?.swaps ?? [])
    .filter((r) => r.toExerciseId === exerciseId)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const prev = rows[0]?.fromExerciseId ?? null;
  // Never resurrect something the user has since excluded.
  return prev && isEligible(state, prev) ? prev : null;
}

// ─── Evidence dimensions (Work 4) ────────────────────────────────────────────

/**
 * Separate, named, observable dimensions. NOT a score.
 *
 * Deliberately absent:
 *  - any hypertrophy, growth, quality or "fit %" number. Ordinary logs do
 *    not support the construct, so the construct does not exist here.
 *  - exercise-specific tolerance or soreness. The app's recovery feedback
 *    is whole-body and per-session; attributing it to one exercise would
 *    be manufacturing evidence. Reported as `tolerance: 'not_tracked'`
 *    rather than guessed.
 *
 * `progression` is the closeout's separate dimension, judged by
 * algorithms.detectProgressionConsistency - detectPlateau's mirror, over
 * eligible sets only. 'progressing' means this user has been adding load
 * or reps on this movement. It is NOT a claim that the exercise builds
 * more muscle than another, and no copy may present it as one. Without a
 * loaded session window it is 'insufficient', never an optimistic guess.
 *
 * @returns {{
 *   sessions: number, lastTrainedMs: number|null, trainedRecently: boolean,
 *   repeatedChoice: number, retained: boolean, swappedAway: number,
 *   tolerance: 'not_tracked', sufficient: boolean,
 * }}
 */
export function exerciseEvidence(state, exerciseId, { fromExerciseId = null, recencyWindowMs = 45 * 24 * 60 * 60 * 1000, nowMs = null } = {}) {
  const usage = state?.usage?.get(exerciseId) ?? null;
  const sessions = Number(usage?.sessions ?? 0) || 0;
  const lastTrainedMs = Number(usage?.lastTrainedMs ?? 0) || null;
  const now = nowMs ?? Date.now();
  const chosen = fromExerciseId
    ? (swapEvidenceFor(state, fromExerciseId).find((c) => c.exerciseId === exerciseId)?.count ?? 0)
    : 0;
  const away = swappedAwayCount(state, exerciseId);
  return {
    sessions,
    lastTrainedMs,
    trainedRecently: lastTrainedMs != null && (now - lastTrainedMs) <= recencyWindowMs,
    repeatedChoice: chosen,
    // RETENTION: chosen as a replacement and then actually trained, rather
    // than swapped straight back out again.
    retained: chosen > 0 && sessions > 0 && away < chosen,
    swappedAway: away,
    tolerance: 'not_tracked',
    // Separate and observable, never fused into the other dimensions.
    progression: state?.progression?.get(exerciseId)?.status ?? 'insufficient',
    plateau: state?.progression?.get(exerciseId)?.plateau === true,
    plateauResolution: state?.progression?.get(exerciseId)?.plateauResolution ?? null,
    // A brand-new exercise must be allowed to say so. One session is a
    // try, not a preference.
    sufficient: sessions >= 2 || chosen >= REPEATED_SWAP_MIN,
    // C16 quality laws 2 and 3: how much this user's own history is worth
    // YET. Reported as a named level, never as a confidence percentage,
    // because a percentage would imply a precision ordinary training logs
    // cannot support.
    maturity: evidenceMaturity({ sessions, repeatedChoice: chosen }),
  };
}

// ─── Evidence maturity (C16 quality laws 2 and 3) ────────────────────────────

/**
 * How established is this user's evidence about an exercise?
 *
 * FOUNDER LAW 3: "Exercise Intelligence must expose evidence
 * maturity/confidence so generic canonicality dominates when evidence is
 * weak and legitimate personal evidence increasingly dominates as it
 * becomes established."
 *
 * FOUNDER LAW 2: "New/replacement exercises begin with insufficient
 * personal evidence. Do not transfer confidence or working load from the
 * exercise they replaced."
 *
 * The levels are exposures, not a score:
 *
 *   NONE         never performed. Whatever the user did on the exercise
 *                this one replaced belongs to that exercise, not this one.
 *   EMERGING     performed once or twice, or chosen repeatedly as a
 *                replacement. Real, and not yet enough to overrule the
 *                generic judgement about what a good default is.
 *   ESTABLISHED  performed enough times that this user's own history is
 *                the better guide.
 *
 * The thresholds are a product heuristic and are written down as one. They
 * are not a claim about how many sessions make an exercise "work".
 */
export const EVIDENCE_MATURITY = Object.freeze({
  NONE: 'none',
  EMERGING: 'emerging',
  ESTABLISHED: 'established',
});

/** Sessions at which a user's own history outranks the generic default. */
export const ESTABLISHED_SESSIONS = 4;

export function evidenceMaturity({ sessions = 0, repeatedChoice = 0 } = {}) {
  if (sessions >= ESTABLISHED_SESSIONS || repeatedChoice >= REPEATED_SWAP_MIN) {
    return EVIDENCE_MATURITY.ESTABLISHED;
  }
  if (sessions >= 1 || repeatedChoice >= 1) return EVIDENCE_MATURITY.EMERGING;
  return EVIDENCE_MATURITY.NONE;
}

/**
 * How much weight personal evidence may carry at this maturity.
 *
 * Zero at NONE is the whole point of law 3: with no exposures there is
 * nothing personal to weigh, so the generic judgement about what makes a
 * sensible default decides on its own.
 */
export const MATURITY_WEIGHT = Object.freeze({
  [EVIDENCE_MATURITY.NONE]: 0,
  [EVIDENCE_MATURITY.EMERGING]: 0.5,
  [EVIDENCE_MATURITY.ESTABLISHED]: 1,
});

export function maturityWeight(maturity) {
  return MATURITY_WEIGHT[maturity] ?? 0;
}

/**
 * Has the user chosen the same replacement often enough that offering to
 * make it the default is helpful rather than presumptuous? Never after one
 * swap, and never automatic: the caller must ask the user.
 */
export function repeatedDefaultCandidate(state, fromExerciseId, { routineId = null } = {}) {
  if (approvedDefaultFor(state, fromExerciseId, routineId)) return null;
  const top = swapEvidenceFor(state, fromExerciseId, { routineId })[0] ?? null;
  if (!top || top.count < REPEATED_SWAP_MIN || !top.explicit) return null;
  if (!isEligible(state, top.exerciseId)) return null;
  return { exerciseId: top.exerciseId, count: top.count };
}

// ─── Personalised ordering (Work 3) ──────────────────────────────────────────

/**
 * Ranking tiers, highest first. Deterministic and explainable: every tier
 * corresponds to something the user actually did, and each carries the tag
 * the UI shows so the ordering can always state its own reason.
 */
export const RANK_TIER = Object.freeze({
  APPROVED_DEFAULT: 5,
  RECENT_REPLACEMENT: 4,
  REPEATED_REPLACEMENT: 3,
  PERSONAL_EVIDENCE: 2,
  PREVIOUSLY_USED: 1,
  NONE: 0,
});

/**
 * Re-order structurally-suitable candidates by what this user has actually
 * done, WITHOUT letting personal history promote an unsuitable exercise.
 *
 * The suitability judgement stays where it already lives (swapEngine's
 * structural score). This function only reorders within it, and only for
 * candidates the engine already considered valid replacements. A recently
 * used but structurally wrong exercise cannot climb, because it was never
 * in the candidate list to begin with.
 *
 * @param {object} state
 * @param {Array<{exercise: object, score?: number, reason?: string}>} candidates
 *   swapEngine.rankSwaps output (already structurally scored and sorted).
 * @param {{fromExerciseId: string, routineId?: string|null, nowMs?: number|null}} ctx
 * @returns {Array} the same objects, re-ordered, each with `personal`
 *   ({tier, tag}) attached for the UI to explain the position.
 */
export function rankPersonalised(state, candidates, { fromExerciseId, routineId = null, nowMs = null } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const approved = approvedDefaultFor(state, fromExerciseId, routineId);
  const evidence = swapEvidenceFor(state, fromExerciseId, { routineId });
  const byId = new Map(evidence.map((e) => [e.exerciseId, e]));
  const mostRecent = [...evidence].sort((a, b) => b.lastMs - a.lastMs)[0]?.exerciseId ?? null;
  const previous = previouslyUsedBefore(state, fromExerciseId);

  const decorated = candidates
    // An exclusion is explicit intent and outranks every kind of evidence:
    // a repeatedly chosen exercise the user has since excluded is gone.
    .filter((c) => isEligible(state, c?.exercise?.id))
    .map((c, i) => {
      const id = c?.exercise?.id;
      const ev = byId.get(id) ?? null;
      const facts = exerciseEvidence(state, id, { fromExerciseId, nowMs });
      let tier = RANK_TIER.NONE;
      let tag = null;
      if (approved && id === approved) {
        tier = RANK_TIER.APPROVED_DEFAULT; tag = 'Your default here';
      } else if (mostRecent && id === mostRecent) {
        tier = RANK_TIER.RECENT_REPLACEMENT; tag = 'Last used here';
      } else if (ev && ev.count >= 2) {
        tier = RANK_TIER.REPEATED_REPLACEMENT; tag = "You've chosen this replacement several times";
      } else if (facts.progression === 'progressing' && facts.trainedRecently) {
        // Same tier as other personal evidence, deliberately: it can
        // reorder structurally valid alternatives and nothing more. It
        // never outranks an exclusion, an approved default or a
        // deliberate swap history, and it can never introduce a
        // candidate the structural engine did not already accept.
        //
        // C13 job 6: the recency guard is new. getExerciseProgressionSessions
        // reads the four most recent sessions with NO age bound, so a lift
        // last trained a year ago still reported 'progressing' - and this
        // branch turned that into a CURRENT recommendation claim, tagged
        // "Progressing consistently", ahead of the trainedRecently branch
        // below that would otherwise have judged its age. Memory persists;
        // actionability expires. The dimension itself is untouched and stays
        // observable on the evidence object, and the recency window is
        // Campaign 9's existing one rather than a new constant.
        tier = RANK_TIER.PERSONAL_EVIDENCE; tag = 'Progressing consistently';
      } else if (facts.trainedRecently && facts.sufficient) {
        tier = RANK_TIER.PERSONAL_EVIDENCE; tag = 'Used recently';
      } else if (previous && id === previous) {
        tier = RANK_TIER.PREVIOUSLY_USED; tag = 'Previously used';
      }
      // C16 quality law 3: how far this tier is allowed to move the
      // candidate depends on how established the evidence behind it is.
      //
      // APPROVED_DEFAULT is exempt and stays at full weight: it is INTENT,
      // not evidence. The user pressed a button to say "this is my default
      // here", and that does not need exposures to be believed.
      //
      // Everything else is scaled. At NONE the weight is zero, so a
      // candidate with no exposures ranks purely on the generic judgement
      // below - which is exactly the law: generic canonicality dominates
      // when personal evidence is weak, and personal evidence increasingly
      // dominates as it becomes established.
      const isIntent = tier === RANK_TIER.APPROVED_DEFAULT;
      const weighted = isIntent ? tier : tier * maturityWeight(facts.maturity);
      return {
        ...c,
        personal: { tier, tag, evidence: facts, maturity: facts.maturity, weighted },
        _i: i,
      };
    });

  // Weighted personal standing first, then the GENERIC judgement about what
  // makes a sensible default (staples before obscure movements), then the
  // structural score the engine already computed, then the engine's own
  // order. Fully deterministic, never random.
  decorated.sort((a, b) => b.personal.weighted - a.personal.weighted
    || tierRank(a?.exercise?.name) - tierRank(b?.exercise?.name)
    || (b.score ?? 0) - (a.score ?? 0)
    || a._i - b._i);
  return decorated.map(({ _i, ...rest }) => rest);
}
