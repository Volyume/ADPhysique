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
} from './database';
import {
  buildSessionAdjustmentInput,
  computeSessionAdjustments,
  computeAdaptiveLandmarks,
} from './algorithms';
import { logWarn } from './errorLog';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

    const todaysExercises = (exercises || [])
      .map(e => ({
        exerciseId: e?.exercise?.id ?? null,
        primaryMuscle: e?.exercise?.primaryMuscle ?? null,
        plannedSets: e?.routineExercise?.recommendedSets ?? null,
      }))
      .filter(e => e.exerciseId && e.primaryMuscle && Number.isFinite(e.plannedSets) && e.plannedSets >= 1);
    if (todaysExercises.length === 0) return []; // ad-hoc / empty session → silent

    const [signals, coachOutput, mesoWeek, landmarkHistory, weekly, recentEvents] = await Promise.all([
      getSessionAdjustmentSignals(userId),
      getLatestCoachOutput(userId).catch(() => null),
      getCurrentMesocycleWeek(userId).catch(() => null),
      getAdaptiveLandmarkHistory(userId).catch(() => []),
      // weeksBack 1, anchored at now → the trailing-7-day done-by-muscle volume.
      // The in-progress session isn't counted (is_completed = 1 filter).
      getWeeklyVolumeByMuscle(userId, 1, now).catch(() => []),
      // ~mesocycle window for the add-frequency cap (this week) and revert
      // memory (this meso). session_* events are namespaced so deload
      // evaluation (decision === 'deload_trigger') ignores them.
      getRecentAdaptationEvents(userId, 6).catch(() => []),
    ]);

    const landmarks = computeAdaptiveLandmarks(landmarkHistory ?? []);
    const lastWeek = (weekly && weekly.length) ? weekly[weekly.length - 1] : null;
    const doneThisWeekByMuscle = lastWeek?.volumeByMuscle ?? {};
    const weekStartMs = lastWeek?.weekStart ?? (now - WEEK_MS);
    const sessionEvents = (recentEvents || []).filter(e => String(e.decision ?? '').startsWith('session_'));

    const input = buildSessionAdjustmentInput({
      todaysExercises,
      perMuscle: signals.perMuscle,
      checkin: signals.checkin,
      presessionSoreness: workout.soreness24hBefore ?? null,
      presessionIntent: workout.preWorkoutIntent ?? null,
      coachOutput,
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
    whyLoad: 'Suggested loads are trimmed a touch so every rep stays crisp.',
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

/**
 * Apply the readiness load trim to a computeSetTargets targets array for
 * display. Non-mutating; reps are untouched; a lowered weight flips the
 * direction to 'decrease' so the beat line's glyph stays honest. Deload
 * prescriptions are never touched (deload owns its session, matching
 * COMP-015's R0).
 */
export function applyReadinessToTargets(targets, tweak) {
  if (!Array.isArray(targets) || targets.length === 0) return targets ?? [];
  if (!tweak || !tweak.reduces) return targets;
  return targets.map((t) => {
    if (!t || t.isDeload) return t;
    const weight = applyReadinessToLoad(t.weight, tweak);
    if (weight === t.weight) return t;
    return { ...t, weight, action: 'decrease' };
  });
}
