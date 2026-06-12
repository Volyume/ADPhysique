/**
 * NEW-002 — write the user's OWN derived week signal into each active pair.
 *
 * The keystone that makes the partner's ticks appear: it gathers the CURRENT
 * week's facts the same way COMP-018 does (one consistency engine), runs the
 * shared computeWeekState seam, and writes + pushes the tiny derived row
 * (planned/done/met/state) — never raw workouts. Fire-and-forget from the
 * Progress view and the workout-finish path; the sync layer also backs it up.
 *
 * ED/wellbeing (§5): an open flag (or a positive wellbeing screen) freezes the
 * outbound signal to 'resting' — indistinguishable from a planned deload — so
 * the partner can never tell a wellbeing hold from recovery, and the safety
 * system never leaks into the pair surface.
 */
import {
  getPartnershipsLocal, getWeeklySessionStats, getDeloadWeeksInRange,
  getOpenEdPatternFlag, getActivePlan, getRoutinesForPlan,
} from '../database';
import { localWeekStartMs } from '../dayKey';
import { computeWeekState } from '../streak';
import { pausedWeekKeys, loadStreakState } from '../streakState';
import { pushWeekSignal } from './service';

const WEEK_MS = 7 * 86400000;

/**
 * Compute the user's current-week state (pure-ish: gathers facts, runs the
 * seam). Exposed for testing. scoffScore mirrors useWeeklyStreak's wellbeing gate.
 */
export async function computeCurrentWeekState(userId, scoffScore = 0) {
  const weekStart = localWeekStartMs(Date.now());

  let planTarget = null;
  try {
    const plan = await getActivePlan(userId);
    if (plan?.id) {
      const routines = await getRoutinesForPlan(plan.id);
      if (Array.isArray(routines) && routines.length > 0) planTarget = routines.length;
    }
  } catch (_) { /* no plan -> session-count mode */ }

  const [stats, deloadWeeks, edFlag, streakState] = await Promise.all([
    getWeeklySessionStats(userId, weekStart).catch(() => ({ completed: 0, planned: 0 })),
    getDeloadWeeksInRange(userId, weekStart, weekStart + WEEK_MS).catch(() => []),
    getOpenEdPatternFlag(userId).catch(() => null),
    loadStreakState(userId).catch(() => ({ manualGoal: null, pauses: [] })),
  ]);

  const hasManual = Number.isFinite(streakState?.manualGoal);
  let target = null;
  if (planTarget != null && hasManual) target = Math.min(planTarget, streakState.manualGoal);
  else if (planTarget != null) target = planTarget;
  else if (hasManual) target = streakState.manualGoal;

  const weekKey = String(weekStart);
  const paused = pausedWeekKeys(streakState?.pauses, [weekKey]).has(weekKey);
  const edSuppressed = !!edFlag || (Number.isFinite(scoffScore) && scoffScore >= 2);

  return {
    weekStart: weekKey,
    ...computeWeekState({
      completed: stats?.completed ?? 0,
      planned: stats?.planned ?? target ?? 0,
      target,
      isDeload: new Set(deloadWeeks).has(weekStart),
      paused,
      edSuppressed,
    }),
  };
}

/**
 * Write + push the user's own current-week signal to every active pair.
 * Returns the number of pairs updated. Never throws.
 */
export async function writeOwnWeekSignals(userId, scoffScore = 0) {
  if (!userId) return 0;
  try {
    const partnerships = await getPartnershipsLocal(userId);
    const active = partnerships.filter((p) => p.status === 'active');
    if (!active.length) return 0;

    const ws = await computeCurrentWeekState(userId, scoffScore);
    let n = 0;
    for (const pair of active) {
      await pushWeekSignal(userId, {
        pairId: pair.id,
        weekStart: ws.weekStart,
        planned: ws.planned,
        done: ws.done,
        weekMet: ws.weekMet,
        state: ws.state,
      }).catch(() => {});
      n += 1;
    }
    return n;
  } catch (_) {
    return 0;
  }
}
