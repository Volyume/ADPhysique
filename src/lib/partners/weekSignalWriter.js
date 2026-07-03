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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPartnershipsLocal, getWeeklySessionStats, getDeloadWeeksInRange,
  getOpenEdPatternFlag, getActivePlan, getRoutinesForPlan,
  getActiveBlock, getWeeklyPRCount,
} from '../database';
import { localWeekStartMs } from '../dayKey';
import { computeWeekState } from '../streak';
import { getBlockStatus } from '../mesocycle';
import { pausedWeekKeys, loadStreakState } from '../streakState';
import { pushWeekSignal } from './service';
import { isLapsedPartner } from './tierGate';
import { trackPairWeekActive } from './telemetry';

const WEEK_MS = 7 * 86400000;

// Milestone-moment booleans (brief Direction 1): finished a training block this
// week, and set at least one PB this week. Derived weekly from LOCAL data only,
// reusing the app's existing detection (getBlockStatus over the active block,
// getWeeklyPRCount for PBs) — no new detection is built. Both are forced false
// under the ED freeze (see computeCurrentWeekState).
async function deriveMilestones(userId, weekStartMs) {
  let completedBlock = false;
  try {
    const block = await getActiveBlock(userId);
    if (block && block.startDate != null) {
      const plannedWeeks = block.plannedWeeks ?? block.durationWeeks ?? 5;
      // 'complete' holds only for the single week just after the block's final
      // recovery week, so this is true exactly on the week a block finishes.
      completedBlock = getBlockStatus(block.startDate, plannedWeeks).status === 'complete';
    }
  } catch (_) { completedBlock = false; }

  let hitPb = false;
  try { hitPb = (await getWeeklyPRCount(userId, weekStartMs)) > 0; } catch (_) { hitPb = false; }

  return { completedBlock, hitPb };
}

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

  const base = computeWeekState({
    completed: stats?.completed ?? 0,
    planned: stats?.planned ?? target ?? 0,
    target,
    isDeload: new Set(deloadWeeks).has(weekStart),
    paused,
    edSuppressed,
  });

  let { completedBlock, hitPb } = await deriveMilestones(userId, weekStart);
  // ED-safety freeze (s5): whenever the outbound state is frozen to 'resting'
  // (open ED flag / high SCOFF, and any other rest), BOTH milestone booleans are
  // forced false through the SAME freeze — a celebratory moment must never leak
  // out of a wellbeing hold. Same code path as the state freeze above.
  if (base.state === 'resting') { completedBlock = false; hitPb = false; }

  return { weekStart: weekKey, completedBlock, hitPb, ...base };
}

// Emit the pair-active telemetry (week 2 / week 6) at most once per pair per
// milestone. Cheap AsyncStorage watermark; best-effort.
async function maybeTrackPairWeekActive(pair, nowMs) {
  try {
    const anchor = Number(pair?.acceptedAt) || Number(pair?.createdAt) || 0;
    if (!anchor) return;
    const weeksActive = Math.floor((nowMs - anchor) / WEEK_MS) + 1;
    if (weeksActive !== 2 && weeksActive !== 6) return;
    const key = `@volyume_partner_wk_${pair.id}_${weeksActive}`;
    const seen = await AsyncStorage.getItem(key).catch(() => null);
    if (seen) return;
    await AsyncStorage.setItem(key, '1').catch(() => {});
    trackPairWeekActive(weeksActive);
  } catch (_) { /* telemetry is best-effort */ }
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
    // Lapsed-partner data-layer gate (A1 s9.4): a user whose tier has resolved
    // to Free can no longer see or manage the pairing, so they must not keep
    // pushing live ticks into it. Transition their outbound signal to a calm
    // 'resting' state (never live ticks, milestone booleans forced false), the
    // same shape the partner already reads as a benign rest.
    const lapsed = isLapsedPartner();
    const nowMs = Date.now();
    let n = 0;
    for (const pair of active) {
      const out = lapsed
        ? { pairId: pair.id, weekStart: ws.weekStart, planned: ws.planned, done: ws.done, weekMet: true, state: 'resting', completedBlock: false, hitPb: false }
        : { pairId: pair.id, weekStart: ws.weekStart, planned: ws.planned, done: ws.done, weekMet: ws.weekMet, state: ws.state, completedBlock: ws.completedBlock, hitPb: ws.hitPb };
      await pushWeekSignal(userId, out).catch(() => {});
      await maybeTrackPairWeekActive(pair, nowMs);
      n += 1;
    }
    return n;
  } catch (_) {
    return 0;
  }
}
