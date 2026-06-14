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
