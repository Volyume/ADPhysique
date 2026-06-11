/**
 * useWeeklyStreak — gathers the last 12 weeks of training facts and runs the
 * pure computeStreak derivation for COMP-018's "This week" Progress strip.
 *
 * Offline-first: every read is local SQLite, recomputed on focus so a session
 * logged (or synced late) reflects immediately. The run number is shown only
 * when there is a real plan-derived target; with no active plan the strip
 * stays in honest session-count mode (the manual-goal editor is a later pass).
 * An open ED-pattern flag, or a positive wellbeing screen, freezes the run and
 * tells the strip to hide the number entirely.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getWeeklySessionStats, getDeloadWeeksInRange, getOpenEdPatternFlag,
  getActivePlan, getRoutinesForPlan,
} from '../lib/database';
import { localWeekStartMs } from '../lib/dayKey';
import { computeStreak } from '../lib/streak';
import {
  loadStreakState, pausedWeekKeys, persistHighWater, longestRun, pendingMilestone,
} from '../lib/streakState';

const WEEKS = 12;
const WEEK_MS = 7 * 86400000;

const EMPTY = {
  loading: true, render: false, runLength: null, current: null, suppressed: false,
  hasTarget: false, weeks: [], longestRun: 0, manualGoal: null, pendingMilestone: null,
  currentWeekKey: null, sessionsThisWeek: 0, target: null, reload: () => {},
};

export default function useWeeklyStreak(userId, scoffScore = 0) {
  const [result, setResult] = useState(EMPTY);

  const load = useCallback(async () => {
    if (!userId) {
      setResult({ ...EMPTY, loading: false });
      return;
    }
    try {
      const currentWeekStart = localWeekStartMs(Date.now());
      const oldestWeekStart = currentWeekStart - (WEEKS - 1) * WEEK_MS;

      // Plan-derived target first; otherwise the user's manual weekly goal.
      // No plan and no goal -> session-count only (the streak never invents a
      // target). When a plan exists its routine count wins (manual goal is the
      // plan-less fallback only).
      let planTarget = null;
      try {
        const plan = await getActivePlan(userId);
        if (plan?.id) {
          const routines = await getRoutinesForPlan(plan.id);
          if (Array.isArray(routines) && routines.length > 0) planTarget = routines.length;
        }
      } catch (_) { /* no plan -> manual goal or session-count */ }

      const weekStarts = [];
      for (let i = WEEKS - 1; i >= 0; i--) weekStarts.push(currentWeekStart - i * WEEK_MS);

      const [statsList, deloadWeeks, edFlag, streakState] = await Promise.all([
        Promise.all(weekStarts.map((ws) => getWeeklySessionStats(userId, ws).catch(() => ({ completed: 0, planned: 0 })))),
        getDeloadWeeksInRange(userId, oldestWeekStart, currentWeekStart + WEEK_MS).catch(() => []),
        getOpenEdPatternFlag(userId).catch(() => null),
        loadStreakState(userId),
      ]);

      const target = planTarget != null
        ? planTarget
        : (Number.isFinite(streakState.manualGoal) ? streakState.manualGoal : null);

      const deloadSet = new Set(deloadWeeks);
      const orderedWeekKeys = weekStarts.map(String);
      const pausedSet = pausedWeekKeys(streakState.pauses, orderedWeekKeys);
      const weeks = weekStarts.map((ws, i) => ({
        weekKey: String(ws),
        completed: statsList[i]?.completed ?? 0,
        target,
        isDeload: deloadSet.has(ws),
        paused: pausedSet.has(String(ws)),
        isCurrent: i === weekStarts.length - 1,
      }));

      const edSuppressed = !!edFlag || (Number.isFinite(scoffScore) && scoffScore >= 2);
      const streak = computeStreak({ weeks, edSuppressed });

      // High-water: a shown run never shrinks retroactively (deleting a workout
      // must not retro-break a run the user already saw). Persist any growth.
      const currentWeekKey = String(currentWeekStart);
      let runLength = streak.runLength;
      if (!edSuppressed && runLength != null) {
        const prevHigh = streakState.highWater[currentWeekKey] ?? 0;
        if (runLength < prevHigh) runLength = prevHigh;
        persistHighWater(userId, currentWeekKey, runLength).catch(() => {});
      }
      const longest = longestRun(streakState.highWater, runLength ?? 0);
      const milestone = edSuppressed ? null : pendingMilestone(runLength, streakState.milestonesSeen);

      // Render once the user has trained at all in the window (a strip with
      // nothing in it is noise for a brand-new user).
      const anyTrained = weeks.some((w) => (w.completed ?? 0) > 0);

      setResult({
        loading: false,
        render: anyTrained,
        weeks: streak.weeks,
        runLength,
        current: streak.current,
        suppressed: streak.suppressed,
        hasTarget: target != null,
        sessionsThisWeek: streak.current?.completed ?? 0,
        target,
        longestRun: longest,
        manualGoal: streakState.manualGoal,
        pendingMilestone: milestone,
        currentWeekKey,
        reload: load,
      });
    } catch (_e) {
      setResult({ ...EMPTY, loading: false });
    }
  }, [userId, scoffScore]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return result;
}
