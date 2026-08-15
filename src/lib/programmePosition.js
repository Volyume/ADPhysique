/**
 * programmePosition.js — Campaign 18 block-progression amendment.
 *
 * THE ONE PLACE TO LOOK. If you are a maintainer (or a future model) asking
 * any of these questions, the answer is here and nowhere else:
 *
 *   What sessions were required?          -> position.sessions
 *   Which are resolved, and why?          -> session.state + session.because
 *   What is next?                         -> position.nextSession
 *   Why is the block still accumulating?  -> position.preRecoveryOutstanding
 *   Where did that truth come from?       -> position.diagnostics + .source
 *
 * VOLYUME TRAINING IS SESSION-SEQUENCED. `getCurrentMesocycleWeek` still
 * answers the CALENDAR question - where the block's dates have reached - and
 * that reading is carried here as `calendarWeekIndex` so nothing loses it. It
 * no longer decides which workout is next, whether a week is finished, or
 * whether the recovery phase has begun. Position beats calendar.
 *
 * THE DEFECT THIS ENDS. `programmes.next_workout_index` was a single integer
 * advanced blindly on any completion, so an athlete whose next required
 * session was Legs, who trained Push & Arms instead, had the pointer moved
 * past Legs. Legs was never performed and never marked anything.
 *
 * IMPURE BY DESIGN, thin by intent: this module only fetches rows and hands
 * every judgement to `blockProgression`, which is pure and has no clock.
 */
import {
  getActivePlan, getRoutinesForPlan, getAllMesocyclesForUser, getMesocycleWeeks,
  getBlockTrainingData, getLiveSessionResolutions, getCurrentMesocycleWeek,
} from './database';
import {
  resolveWeekSessions, nextOutstandingSession, weekProgressionResolved,
  executionSummary, SESSION_STATE,
} from './blockProgression';
import { plannedRecoveryWeek } from './recoveryState';
import { logError } from './errorLog';

const int = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

/**
 * Workout rows as `getBlockTrainingData` returns them (raw, snake_case),
 * normalised to the shape the pure resolver reads. No filtering beyond what
 * that query already does: it selects completed workouts only.
 */
function normaliseWorkouts(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((w) => ({
    id: w.id,
    routineId: w.routine_id ?? w.routineId ?? null,
    mesocycleWeekId: w.mesocycle_week_id ?? w.mesocycleWeekId ?? null,
    isCompleted: (w.is_completed ?? w.isCompleted) ? 1 : 0,
    deletedAt: w.deleted_at ?? w.deletedAt ?? null,
    startedAt: w.started_at ?? w.startedAt ?? null,
  }));
}

/**
 * THE LEGACY FLOOR (compatibility rule, documented where it is applied).
 *
 * A block with no `progressionAnchorWeek` was created under the broken
 * pointer, so the absence of a workout row in an earlier week is genuinely
 * AMBIGUOUS - it may mean the session was never done, or that the pointer
 * consumed it. Neither SKIPPED_BY_USER nor COMPLETED may be manufactured for
 * that, and resurrecting every historical gap would send an established user
 * back several weeks mid-block.
 *
 * So for a legacy block the candidate range is floored at the furthest week
 * the athlete has ACTUALLY trained. Earlier ambiguity is left alone: not
 * resolved, not resurrected, simply not claimed either way.
 *
 * New blocks carry an anchor of 1 and get the full model with no floor, so
 * this rule dies with the blocks that need it.
 */
function candidateFloor({ anchorWeek, weeks, workouts }) {
  const anchor = int(anchorWeek);
  if (anchor != null) return { floor: Math.max(1, anchor), legacy: false };
  const trainedWeekIndex = weeks
    .filter((w) => workouts.some((x) => x.mesocycleWeekId === w.id))
    .map((w) => int(w.weekIndex) ?? 0);
  const floor = trainedWeekIndex.length ? Math.max(...trainedWeekIndex) : 1;
  return { floor: Math.max(1, floor), legacy: true };
}

/**
 * The athlete's authoritative programme position.
 *
 * Returns null when there is no active block or the read fails - callers then
 * fall back to whatever they showed before, which is honest: an unreadable
 * block is not evidence of anything.
 */
export async function resolveProgrammePosition(userId) {
  if (!userId) return null;
  try {
    const [plan, mesos, calendarWeek] = await Promise.all([
      getActivePlan(userId),
      getAllMesocyclesForUser(userId),
      getCurrentMesocycleWeek(userId).catch(() => null),
    ]);
    const block = (mesos ?? [])
      .filter((m) => !m.deletedAt && (m.isActive === 1 || m.isActive === true))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))[0] ?? null;
    if (!block || !plan?.id) return null;

    const [routines, weekRows, training, resolutions] = await Promise.all([
      getRoutinesForPlan(plan.id),
      getMesocycleWeeks(block.id),
      getBlockTrainingData(userId, block.id),
      getLiveSessionResolutions(userId),
    ]);
    if (!routines?.length || !weekRows?.length) return null;

    const weeks = (weekRows ?? [])
      .map((w) => ({ id: w.id ?? w.week_id, weekIndex: int(w.week_index ?? w.weekIndex) }))
      .filter((w) => w.id && w.weekIndex != null)
      .sort((a, b) => a.weekIndex - b.weekIndex);
    const workouts = normaliseWorkouts(training?.workouts);

    const plannedWeeks = int(block.plannedWeeks ?? block.durationWeeks);
    const recoveryWeek = plannedRecoveryWeek({
      plannedWeeks, deloadWeek: block.deloadWeek,
    });
    // The calendar reading is CARRIED, never obeyed.
    const calendarWeekIndex = int(calendarWeek?.weekIndex) ?? 1;

    const { floor, legacy } = candidateFloor({
      anchorWeek: block.progressionAnchorWeek, weeks, workouts,
    });

    // Accumulation weeks the athlete has actually reached. A week the calendar
    // has not arrived at yet cannot be outstanding, and a week below the legacy
    // floor is left alone.
    const candidates = weeks.filter((w) => (
      w.weekIndex >= floor
      && w.weekIndex <= calendarWeekIndex
      && (recoveryWeek == null || w.weekIndex < recoveryWeek)
    ));

    const diagnostics = [];
    let activeWeek = null;
    let sessions = [];
    for (const w of candidates) {
      const resolved = resolveWeekSessions({
        weekId: w.id, routines, workouts, resolutions,
      });
      const conflicted = resolved.filter((s) => s.conflict);
      for (const c of conflicted) {
        diagnostics.push({
          kind: 'session_conflict', weekIndex: w.weekIndex,
          routineId: c.routineId, conflict: c.conflict,
        });
      }
      if (!weekProgressionResolved(resolved)) { activeWeek = w; sessions = resolved; break; }
    }

    // Nothing outstanding anywhere the athlete has reached: the position is
    // simply where the calendar is, capped at the block's own recovery week.
    let source = 'outstanding_required_session';
    if (!activeWeek) {
      source = 'all_reached_weeks_resolved';
      const target = recoveryWeek != null
        ? Math.min(calendarWeekIndex, recoveryWeek) : calendarWeekIndex;
      activeWeek = weeks.find((w) => w.weekIndex === target)
        ?? weeks[weeks.length - 1] ?? null;
      sessions = activeWeek
        ? resolveWeekSessions({ weekId: activeWeek.id, routines, workouts, resolutions })
        : [];
    }

    const preRecoveryOutstanding = candidates.some((w) => {
      const resolved = resolveWeekSessions({ weekId: w.id, routines, workouts, resolutions });
      return resolved.some((s) => s.state === SESSION_STATE.OUTSTANDING);
    });

    return {
      blockId: block.id,
      planId: plan.id,
      plannedWeeks,
      recoveryWeek,
      // What the DATES say. Kept so nothing loses the calendar reading, and so
      // a diagnostic can show when the two genuinely disagree.
      calendarWeekIndex,
      // What the PROGRAMME says. This is the authoritative one.
      activeWeekIndex: activeWeek?.weekIndex ?? null,
      activeWeekId: activeWeek?.id ?? null,
      sessions,
      nextSession: nextOutstandingSession(sessions),
      weekResolved: weekProgressionResolved(sessions),
      execution: executionSummary(sessions),
      // THE RECOVERY GATE. The planned recovery week may not become the active
      // phase while any required pre-recovery session is still outstanding.
      preRecoveryOutstanding,
      recoveryPhaseAllowed: !preRecoveryOutstanding,
      source,
      legacyBlock: legacy,
      candidateFloorWeek: floor,
      diagnostics,
    };
  } catch (e) {
    logError('programmePosition.resolveProgrammePosition', e, { userId });
    return null;
  }
}

/**
 * The next required session, or null. The single answer Home, Plans and Train
 * all consume, so they cannot disagree about what is next.
 */
export async function resolveNextSession(userId) {
  const position = await resolveProgrammePosition(userId);
  return position?.nextSession ?? null;
}
