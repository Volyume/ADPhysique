// COMP-015 — session autoregulation orchestrator.
//
// The IO seam between the pure engine (algorithms.js) and the app: it gathers
// the local signals at session start, runs computeSessionAdjustments, and logs
// each decision as a session_* adaptation_event with exerciseId populated. It
// never mutates the plan, routines, or weekly volume — only this session's set
// counts (carried in the store) and the adaptation_events audit trail.
//
// v1 scope boundary: adjustments only run inside an active mesocycle
// (workout.mesocycleWeekId present). adaptation_events.mesocycle_week_id is NOT
// NULL, so logging — and the add-frequency / revert-memory caps that depend on
// persisted events — only work within a mesocycle. Gating here guarantees every
// shown adjustment is also logged and correctly capped. Non-meso sessions stay
// silent (consistent with "silence is the default"). Pro-gating is the caller's
// job (HomeScreen has the tier).

import {
  getSessionAdjustmentSignals,
  getLatestCoachOutput,
  getCurrentMesocycleWeek,
  getAdaptiveLandmarkHistory,
  getWeeklyVolumeByMuscle,
  getRecentAdaptationEvents,
  createAdaptationEvent,
  getPlannedMuscleVolumeForBlock,
  getMesocycleWeekById,
  getRoutineById,
  getRoutinesForPlan,
  getRoutineExercisesWithDetails,
  getProgrammeById,
  getProgrammePlanFacts,
} from './database';
import {
  buildSessionAdjustmentInput,
  computeSessionAdjustments,
  computeAdaptiveLandmarks,
  allocateExerciseVolume,
} from './algorithms';
import { computeWeeklySessionAllocation } from './coachApply';
import { deriveParamKey } from './poolGenerator';
import { logWarn } from './errorLog';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * D219 (design 4.9 and 9): the plan's sessions in the shape prescribeWeek reads,
 * built from the programme's routines in rotation order. Pure.
 *
 * Each slot is { id, muscle, kind, baseSets, credits, thinEquipment, focus }:
 *  - id: the routine exercise row id. It is unique across the whole plan, so
 *    the same exercise in two sessions (a manual or library plan) never
 *    collides; today's session maps its exercises back through `slotId`
 *    (computeWeeklySessionAllocation).
 *  - muscle: the exercise's primary muscle, normalised as the volume counter
 *    does (allocateExerciseVolume).
 *  - kind: the generator's prescription key, derived the way the generator and
 *    the swap path derive it (poolGenerator.deriveParamKey); prescribeWeek
 *    only needs to know isolation from compound.
 *  - baseSets: the stored week-1 sets (recommended_sets), the slot's weight.
 *  - credits: the half credit (or the exercise's own) each secondary muscle gets.
 *  - thinEquipment: facts.thin[routineId] lists the exercise ids the plan gave
 *    the thin-equipment bonus.
 *  - focus: the slot's muscle has the 'focus' role in facts.roles, so
 *    prescribe lets its isolation exercise take 4 sets (founder answer
 *    2026-10-04, D219); every other muscle's isolation exercise stays at 3.
 * A circuit member is left out: its stored count is the circuit's rounds, not
 * a set count, so it is served as stored (no allocation entry).
 *
 * @param {Array<{routine: {id: string}, rows: Array<{routineExercise: object, exercise: object}>}>} routinesWithRows
 * @param {object} facts  the v2 plan facts
 */
export function buildPlanSessions(routinesWithRows, facts) {
  return (Array.isArray(routinesWithRows) ? routinesWithRows : []).map(({ routine, rows }) => {
    const thin = Array.isArray(facts?.thin?.[routine?.id]) ? facts.thin[routine.id] : [];
    const slots = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      const re = row?.routineExercise ?? {};
      const ex = row?.exercise ?? {};
      if (re.groupKind === 'circuit') continue;
      const alloc = allocateExerciseVolume(ex);
      const primary = alloc.find((a) => a.role === 'primary') ?? null;
      const credits = {};
      for (const a of alloc) {
        if (a.role !== 'secondary' || !a.muscle || a.muscle === primary?.muscle) continue;
        credits[a.muscle] = (credits[a.muscle] || 0) + a.sets;
      }
      const base = re.recommendedSets == null ? NaN : Number(re.recommendedSets);
      const muscle = primary?.muscle ?? null;
      slots.push({
        id: re.id ?? `${routine?.id}:${ex.id}`,
        muscle,
        kind: deriveParamKey(ex.equipmentCategory, ex.compoundIsolation),
        baseSets: Number.isFinite(base) ? base : undefined,
        credits,
        thinEquipment: thin.includes(ex.id),
        focus: muscle != null && facts?.roles?.[muscle] === 'focus',
      });
    }
    return { id: routine?.id, slots };
  });
}

/**
 * D219: the v2 serve context ({ programmeId, facts, sessions }) of a
 * programme, or null when its plan facts do not carry `version: 2` (every plan
 * the new planner did not build) or the plan has no routines. Reads the facts
 * first (unless the caller already has them), so a legacy plan costs one
 * query. Throws on a read failure: callers wrap it.
 */
async function loadPlanServeContext(programmeId, knownFacts) {
  const facts = knownFacts !== undefined ? knownFacts : await getProgrammePlanFacts(programmeId);
  if (facts?.version !== 2) return null;
  const routines = await getRoutinesForPlan(programmeId);
  if (!Array.isArray(routines) || routines.length === 0) return null;
  const routinesWithRows = [];
  for (const routine of routines) {
    // eslint-disable-next-line no-await-in-loop
    routinesWithRows.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
  }
  return { programmeId, facts, sessions: buildPlanSessions(routinesWithRows, facts) };
}

/**
 * D219: the v2 serve context of the ACTIVE programme that owns `routineId`,
 * or null: a routine outside a programme, a programme that is not active, a
 * plan the new planner did not build, or ANY failure (a null context serves the
 * plan exactly as before, the FQ-4 multiplier). Never throws.
 */
export async function getPlanServeContextForRoutine(routineId) {
  try {
    if (!routineId) return null;
    const routine = await getRoutineById(routineId);
    const programmeId = routine?.programmeId ?? null;
    if (!programmeId) return null;
    const facts = await getProgrammePlanFacts(programmeId);
    if (facts?.version !== 2) return null;
    const programme = await getProgrammeById(programmeId);
    if (!programme?.isActive) return null;
    return await loadPlanServeContext(programmeId, facts);
  } catch (e) {
    logWarn('sessionAdjustments.planServeContext', e?.message);
    return null;
  }
}

/**
 * FQ-4 (D96): resolve this session's per-exercise WORKING-SET base from the
 * week's persisted volume allocation. Reads the block's planned_muscle_volume
 * rows, splits them into this week's and the block's first week (the
 * baseline the routines were generated against), and scales through the pure
 * allocator. Returns { allocation, weekRows, v2 } - allocation is null when the
 * session has no mesocycle week or the rows are absent/unreadable, in which
 * case every caller falls back to the routine's static counts (identity).
 * Never throws.
 *
 * D219: for a plan the new planner built (the active programme's plan facts
 * carry version 2) the week's sets come from prescribe() through the same
 * allocator (computeWeeklySessionAllocation, planContext) and `v2` is true;
 * every other plan is served exactly as before. This is the ONE resolver every
 * reader of a week's set count goes through: the logger, the mini bar and the
 * plan screens (getCurrentWeekPlanSets below), so the person sees one number.
 * `planContext` is for a caller that already resolved the plan's context (the
 * plan screen resolves it once for all of a plan's routines); left undefined
 * the context is resolved from `workout.routineId`.
 */
export async function getSessionWeeklyAllocation({ workout, exercises, planContext: given }) {
  const none = { allocation: null, weekRows: [], v2: false };
  try {
    if (!workout?.mesocycleWeekId) return none;
    const week = await getMesocycleWeekById(workout.mesocycleWeekId).catch(() => null);
    const mesocycleId = week?.mesocycle_id ?? week?.mesocycleId ?? null;
    if (!mesocycleId) return none;
    const rows = await getPlannedMuscleVolumeForBlock(mesocycleId).catch(() => []);
    if (!rows?.length) return none;
    const weekRows = rows.filter(r => r.mesocycle_week_id === workout.mesocycleWeekId);
    if (!weekRows.length) return none;
    const firstIndex = Math.min(...rows.map(r => Number(r.week_index)).filter(Number.isFinite));
    const baselineRows = rows.filter(r => Number(r.week_index) === firstIndex);
    const toMap = (list) => Object.fromEntries(list.map(r => [r.muscle, r.planned_sets]));
    const todays = (exercises || []).map(e => ({
      exerciseId: e?.exercise?.id ?? e?.exerciseId ?? null,
      primaryMuscle: e?.exercise?.primaryMuscle ?? e?.primaryMuscle ?? null,
      recommendedSets: e?.routineExercise?.recommendedSets ?? e?.recommendedSets ?? null,
      slotId: e?.routineExercise?.id ?? null,
    }));
    const planContext = given !== undefined ? given : await getPlanServeContextForRoutine(workout.routineId);
    const allocation = computeWeeklySessionAllocation(todays, toMap(weekRows), toMap(baselineRows), planContext);
    return { allocation: Object.keys(allocation).length ? allocation : null, weekRows, v2: planContext != null };
  } catch (e) {
    logWarn('sessionAdjustments.weeklyAllocation', e?.message);
    return none;
  }
}

/**
 * D219 (design 4.9: "the plan screens show stored rows the logger never serves"):
 * the sets a session of `routineId` serves in the plan's CURRENT week, for the
 * screens that show a plan session outside a workout (plan detail, routine
 * detail). It is the logger's own resolver run on the routine's stored rows
 * (getSessionWeeklyAllocation), so a screen and the logger cannot disagree.
 *
 * Returns { [routineExerciseId]: sets }, or null when the routine's plan is
 * not one the new planner built (the screen then shows its stored counts, as
 * today), there is no current week, or anything fails. Never throws.
 *
 * @param {object} args
 * @param {string} args.userId
 * @param {string} args.routineId
 * @param {Array<{routineExercise: object, exercise: object}>} args.rows  the routine's rows
 *        (getRoutineExercisesWithDetails)
 * @param {?object} [args.planContext]  the plan's context when the caller
 *        already resolved it (getPlanServeContextForRoutine); omit to resolve it
 */
export async function getCurrentWeekPlanSets({ userId, routineId, rows, planContext }) {
  try {
    if (!userId || !routineId || !Array.isArray(rows) || rows.length === 0) return null;
    const week = await getCurrentMesocycleWeek(userId);
    if (!week?.id) return null;
    const { allocation, v2 } = await getSessionWeeklyAllocation({
      workout: { mesocycleWeekId: week.id, routineId },
      exercises: rows,
      planContext,
    });
    if (!v2 || !allocation) return null;
    const bySlot = {};
    for (const row of rows) {
      const served = allocation[row?.exercise?.id];
      if (Number.isFinite(served) && row?.routineExercise?.id) bySlot[row.routineExercise.id] = served;
    }
    return Object.keys(bySlot).length ? bySlot : null;
  } catch (e) {
    logWarn('sessionAdjustments.currentWeekPlanSets', e?.message);
    return null;
  }
}

/**
 * Compute this session's adjustments and log them. Returns the decision list
 * for the store (drives the UI in Stage 4). Always resolves to an array; never
 * throws, so a failure here can never block or break starting a workout.
 *
 * @param {object} args
 * @param {string} args.userId
 * @param {object} args.workout    the just-created workout row (camelCase)
 * @param {Array}  args.exercises  the session's exercises ({ exercise, routineExercise })
 * @param {number} [args.now]
 */
export async function computeAndLogSessionAdjustments({ userId, workout, exercises, now = Date.now() }) {
  try {
    if (!userId || !workout?.id) return [];
    // v1: require an active mesocycle week (see header).
    if (!workout.mesocycleWeekId) return [];

    // FQ-4 (D96): this week's persisted volume allocation is the session's
    // per-exercise BASE - the routine's static count scaled to the week's
    // planned_muscle_volume for its muscle. Identity when no rows exist.
    // The session-layer ±1 tweaks below then apply on top of the allocated
    // base, so an applied coach change (or the recovery week's per-muscle
    // reductions) and the readiness tweaks compose instead of competing.
    const { allocation, weekRows } = await getSessionWeeklyAllocation({ workout, exercises });

    const todaysExercises = (exercises || [])
      .map(e => ({
        exerciseId: e?.exercise?.id ?? null,
        primaryMuscle: e?.exercise?.primaryMuscle ?? null,
        plannedSets: allocation?.[e?.exercise?.id]
          ?? e?.routineExercise?.recommendedSets ?? null,
      }))
      .filter(e => e.exerciseId && e.primaryMuscle && Number.isFinite(e.plannedSets) && e.plannedSets >= 1);
    if (todaysExercises.length === 0) return []; // ad-hoc / empty session → silent

    // Campaign 1 P0-7 D13: a FAILED coach-output or mesocycle read must not
    // proceed with neutral defaults - that turned a deload week's silence
    // into a normal week, dropped the joint-pain/illness safety hold, and
    // re-opened the +1 path. Silence is this module's documented default,
    // so a read failure returns [] (no adjustments) rather than guessing.
    const READ_FAILED = Symbol('read_failed');
    const [signals, coachOutput, mesoWeek, landmarkHistory, weekly, recentEvents] = await Promise.all([
      getSessionAdjustmentSignals(userId),
      getLatestCoachOutput(userId).catch(() => READ_FAILED),
      getCurrentMesocycleWeek(userId).catch(() => READ_FAILED),
      getAdaptiveLandmarkHistory(userId).catch(() => []),
      // weeksBack 1, anchored at now → the trailing-7-day done-by-muscle volume.
      // The in-progress session isn't counted (is_completed = 1 filter).
      getWeeklyVolumeByMuscle(userId, 1, now).catch(() => []),
      // ~mesocycle window for the add-frequency cap (this week) and revert
      // memory (this meso). session_* events are namespaced so deload
      // evaluation (decision === 'deload_trigger') ignores them.
      getRecentAdaptationEvents(userId, 6).catch(() => []),
    ]);
    if (coachOutput === READ_FAILED || mesoWeek === READ_FAILED) return [];

    const landmarks = computeAdaptiveLandmarks(landmarkHistory ?? []);
    const lastWeek = (weekly && weekly.length) ? weekly[weekly.length - 1] : null;
    const doneThisWeekByMuscle = lastWeek?.volumeByMuscle ?? {};
    const weekStartMs = lastWeek?.weekStart ?? (now - WEEK_MS);
    const sessionEvents = (recentEvents || []).filter(e => String(e.decision ?? '').startsWith('session_'));

    // FQ-4 (D96): confirm-then-apply, end to end. The raw volumeSignal on
    // the LATEST STORED coach output used to reach the session engine
    // whether or not the user ever tapped Apply - so an unapplied "pull
    // back" proposal silently suppressed the session +1 path (the inverted
    // half of PM-02). An ordinary proposal now only influences a session
    // once it is a PERSISTED APPLIED TARGET: this week's rows carrying
    // source 'coach'. safetyHold is NOT gated - it is hard safety behaviour
    // explicitly defined as automatic, exactly the exception the founder
    // ruling names.
    const appliedGovernsWeek = (weekRows || []).some(r => r.source === 'coach');
    const gatedCoachOutput = coachOutput
      ? { ...coachOutput, volumeSignal: appliedGovernsWeek ? coachOutput.volumeSignal : 0 }
      : coachOutput;

    const input = buildSessionAdjustmentInput({
      todaysExercises,
      perMuscle: signals.perMuscle,
      checkin: signals.checkin,
      presessionSoreness: workout.soreness24hBefore ?? null,
      presessionIntent: workout.preWorkoutIntent ?? null,
      coachOutput: gatedCoachOutput,
      isDeload: !!mesoWeek?.isDeload,
      weeklyVolumeByMuscle: doneThisWeekByMuscle,
      landmarks,
      recentSessionEvents: sessionEvents,
      weekStartMs,
      now,
    });

    const decisions = computeSessionAdjustments(input);

    // Log every decision (adjustments AND interesting holds) with exerciseId.
    // Best-effort: a failed write still leaves the in-memory decision driving
    // the UI for this session.
    for (const d of decisions) {
      try {
        await createAdaptationEvent({
          mesocycleWeekId: workout.mesocycleWeekId,
          muscle: d.muscle,
          exerciseId: d.exerciseId,
          decision: d.reasonCode,
          delta: d.setDelta,
          reasonCode: d.reasonCode,
          reasonText: d.reasonText,
          signals: d.signals,
        });
      } catch (_e) { /* best-effort logging */ }
    }

    return decisions;
  } catch (e) {
    logWarn('sessionAdjustments.compute', e?.message);
    return [];
  }
}

// ── B2: readiness-informed session tweaks (downward-only rule table) ─────────
//
// Expands COMP-015's line with visible, deterministic tweaks driven by the
// pre-session intent-sheet answer ('sharp' | 'average' | 'below_par'). A fixed
// rule table, no learning, and strictly downward-only: a tweak may lower this
// session's TARGET sets or suggested load, never raise them, and good
// readiness never pushes beyond the plan (at most a written acknowledgement).
//
// Everything below is pure: no I/O, no clock reads, no randomness, so the
// same inputs always give the same output. The tweaks are presented suggestions
// applied to the session's targets display only; the stored plan, routines and
// logged sets are never touched, and the user can dismiss them at any time
// ("Use planned targets instead" in the exercise info sheet).
//
// HARD INVARIANT (fuzz-enforced in __tests__/sessionAdjustments.test.js): for
// EVERY readiness input and plan shape, adjusted sets <= planned sets and
// adjusted load <= planned load.

export const READINESS_RULES = Object.freeze({
  below_par: Object.freeze({
    setDelta: -1,     // one set fewer per exercise, floored at 1 working set
    loadFactor: 0.95, // suggested load trimmed 5%, rounded DOWN to 0.25
    whySets: Object.freeze({
      sleep: 'Rough night: one set fewer on each lift today keeps quality up.',
      energy: 'Low energy today: one set fewer on each lift keeps quality up.',
      default: 'Feeling below par: one set fewer on each lift today keeps quality up.',
    }),
    whyLoad: 'Suggested loads are a little lighter so every rep stays controlled.',
  }),
  average: Object.freeze({ setDelta: 0, loadFactor: 1 }),
  sharp: Object.freeze({
    setDelta: 0, // good readiness NEVER pushes beyond the plan
    loadFactor: 1,
    acknowledgement: "Feeling sharp. Today's plan fits as written, so nothing changes.",
  }),
});

/**
 * Resolve the intent-sheet answer (plus the optional readiness chips, used
 * only to pick the why wording) into this session's tweak. Pure table lookup.
 *
 * @param {string|null} intent  'sharp' | 'average' | 'below_par' | null
 * @param {object} [chips]      { sleepQuality, energyScore } from the intent
 *                              sheet's optional rows (2 = Poor/Low)
 * @returns {object|null} { intent, reduces, setDelta, loadFactor, whySets,
 *                          whyLoad, acknowledgement } or null when the answer
 *                          is missing/unknown
 */
export function getReadinessTweak(intent, { sleepQuality = null, energyScore = null } = {}) {
  const rule = READINESS_RULES[intent];
  if (!rule) return null;
  const reduces = rule.setDelta < 0 || rule.loadFactor < 1;
  let whySets = null;
  if (reduces && rule.whySets) {
    // Deterministic tie-break: poor sleep outranks low energy.
    whySets = sleepQuality === 2
      ? rule.whySets.sleep
      : energyScore === 2
        ? rule.whySets.energy
        : rule.whySets.default;
  }
  return {
    intent,
    reduces,
    setDelta: rule.setDelta,
    loadFactor: rule.loadFactor,
    whySets,
    whyLoad: reduces ? (rule.whyLoad ?? null) : null,
    acknowledgement: rule.acknowledgement ?? null,
  };
}

/**
 * Downward-only set-target adjustment. Never returns more than plannedSets,
 * never below 1 working set; degenerate plan shapes pass through unchanged.
 */
export function applyReadinessToSets(plannedSets, tweak) {
  if (!Number.isFinite(plannedSets)) return plannedSets;
  if (!tweak || !(tweak.setDelta < 0)) return plannedSets;
  return Math.min(plannedSets, Math.max(1, plannedSets + tweak.setDelta));
}

/**
 * Downward-only suggested-load adjustment. Rounds DOWN to the nearest 0.25 so
 * rounding can never lift the suggestion back above plan; a load too small to
 * trim on that grid (or non-positive) stays as planned.
 */
export function applyReadinessToLoad(plannedLoad, tweak) {
  if (!Number.isFinite(plannedLoad) || plannedLoad <= 0) return plannedLoad;
  if (!tweak || !(tweak.loadFactor < 1)) return plannedLoad;
  const trimmed = Math.floor(plannedLoad * tweak.loadFactor * 4) / 4;
  if (trimmed <= 0) return plannedLoad;
  return Math.min(plannedLoad, trimmed);
}

// applyReadinessToTargets (the readiness load trim over a computeSetTargets
// targets array) was RETIRED in Campaign 20 Phase 2 Stage 12
// (docs/live-prescription-campaign-20-2026-08-16/
// CAMPAIGN-20-PHASE-1-DESIGN.md §3, authority #9: KEEP applies to
// applyReadinessToLoad/Sets only, both untouched above). It had zero
// production callers once ActiveWorkoutScreen.js was wired through the
// resolver; the resolver mirrors applyReadinessToLoad internally as a senior
// override applied AFTER resolution, exactly as before.

// ── C18 re-entry amendment: reuse B2, don't reinvent it ─────────────────────
//
// The athlete's explicit "I haven't trained" answer (reEntryCheck.js,
// reEntryEaseState.js) earns the SAME downward-only step as a below-par
// readiness answer - one fewer working set where possible, suggested load
// trimmed 5%, both floored/rounded by the exact guards above. It is NOT
// built by calling getReadinessTweak('below_par', ...): that would fabricate
// a below-par reading the athlete never gave for THIS session, and the
// below_par why-text (sleep/energy) would misattribute a stated fact about a
// training gap to how they slept last night. The magnitude is read from
// READINESS_RULES.below_par so the two mechanisms can never silently
// diverge; only the provenance and copy are distinct and honest about their
// own cause.

/**
 * The re-entry tweak, same shape and magnitude as a below-par readiness
 * tweak, distinct provenance. `because: 'athlete_reentry_choice'` - never
 * 'below_par' - so nothing downstream (telemetry, adaptation_events, a
 * future audit) can read this as fabricated readiness evidence.
 */
export function getReEntryEaseTweak() {
  const rule = READINESS_RULES.below_par;
  return {
    intent: 'reentry',
    reduces: true,
    setDelta: rule.setDelta,
    loadFactor: rule.loadFactor,
    whySets: 'Welcome back: one set fewer on each lift today keeps quality up.',
    whyLoad: rule.whyLoad,
    acknowledgement: null,
    because: 'athlete_reentry_choice',
  };
}

/**
 * Resolve the SINGLE tweak a session actually shows, composing the
 * intent-sheet reading with an active re-entry-ease decision WITHOUT ever
 * stacking two downward steps. Both mechanisms cap at the identical
 * below-par magnitude, so applying both in sequence would silently double
 * the reduction (-2 sets, load trimmed twice) - forbidden by the re-entry
 * amendment. Composing by choosing ONE tweak object (never summing two)
 * makes that structurally impossible rather than merely avoided by
 * convention.
 *
 * When the intent sheet already reduces for a real reason given THIS
 * session (poor sleep, low energy), that reason leads - it is the more
 * specific, same-day signal. Re-entry easing then only fills in when the
 * intent sheet itself did not call for a reduction.
 *
 * NOT tier-gated here: the caller decides whether the intent-sheet reading
 * applies (it is a Pro-only surface), but re-entry easing is the athlete's
 * own explicit answer to a question every tier is asked, and must not
 * become Pro-only merely because it happens to reuse this machinery.
 */
export function resolveSessionEasingTweak({ intent, chips, reEntryEaseActive } = {}) {
  const intentTweak = getReadinessTweak(intent, chips);
  if (intentTweak?.reduces) return intentTweak;
  if (reEntryEaseActive) return getReEntryEaseTweak();
  return intentTweak;
}
