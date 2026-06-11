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

const WEEKS = 12;
const WEEK_MS = 7 * 86400000;

const EMPTY = { loading: true, render: false, runLength: null, current: null, suppressed: false, hasTarget: false };

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

      // Plan-derived target only (no inventing a target from the trailing
      // average); without an active plan the strip is session-count only.
      let target = null;
      try {
        const plan = await getActivePlan(userId);
        if (plan?.id) {
          const routines = await getRoutinesForPlan(plan.id);
          if (Array.isArray(routines) && routines.length > 0) target = routines.length;
        }
      } catch (_) { /* no plan -> session-count mode */ }

      const weekStarts = [];
      for (let i = WEEKS - 1; i >= 0; i--) weekStarts.push(currentWeekStart - i * WEEK_MS);

      const [statsList, deloadWeeks, edFlag] = await Promise.all([
        Promise.all(weekStarts.map((ws) => getWeeklySessionStats(userId, ws).catch(() => ({ completed: 0, planned: 0 })))),
        getDeloadWeeksInRange(userId, oldestWeekStart, currentWeekStart + WEEK_MS).catch(() => []),
        getOpenEdPatternFlag(userId).catch(() => null),
      ]);

      const deloadSet = new Set(deloadWeeks);
      const weeks = weekStarts.map((ws, i) => ({
        weekKey: String(ws),
        completed: statsList[i]?.completed ?? 0,
        target,
        isDeload: deloadSet.has(ws),
        paused: false, // pause record is a later pass
        isCurrent: i === weekStarts.length - 1,
      }));

      const edSuppressed = !!edFlag || (Number.isFinite(scoffScore) && scoffScore >= 2);
      const streak = computeStreak({ weeks, edSuppressed });

      // Render once the user has trained at all in the window (a strip with
      // nothing in it is noise for a brand-new user).
      const anyTrained = weeks.some((w) => (w.completed ?? 0) > 0);

      setResult({
        loading: false,
        render: anyTrained,
        runLength: streak.runLength,
        current: streak.current,
        suppressed: streak.suppressed,
        hasTarget: target != null,
      });
    } catch (_e) {
      setResult({ ...EMPTY, loading: false });
    }
  }, [userId, scoffScore]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return result;
}
