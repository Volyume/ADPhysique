/**
 * useTrainWeek - the data Train's week section reads: the plan-week card's
 * view-model, the volume strip, and the recent sessions (D231, app layout
 * rework, batch 2). All three were AnalyticsScreen's (Progress) own, built there
 * under D214; the spec moves them to Train, so the loading and the derivations
 * moved here unchanged and Progress no longer carries them.
 *
 * What it assembles, as the Progress screen did:
 *   - D214 (plan 7.1 item 2, PR-10, PR-14, PR-16): the plan context the plan-week
 *     card and the strip read, re-read on EVERY focus and on pull-to-refresh so it
 *     agrees with a session just logged or a target just edited:
 *       - the programme position (resolveProgrammePosition: null on a read
 *         failure or with no block, which reads as no plan);
 *       - the plan-trained muscle set, the plan layer's own source map exactly as
 *         VolumeHeatmapScreen reads it (never the merged source);
 *       - each muscle's role in the active plan (getPlanRoles, D219), the roles
 *         both screens judge by (volumeJudgement.js: the one band function).
 *     `planContext` is undefined until the first read settles; every read is best
 *     effort, so a failure degrades to the no-plan, research-table reading and is
 *     logged.
 *   - "Your plan week", the one session count: ONE view-model shared with
 *     Consistency (src/lib/progress/planWeek.js): the plan week's completed-over-
 *     required count named as the plan week, the Monday-anchored seven cells and
 *     the next session, or the calendar count ("2 sessions so far this week")
 *     with no plan. D214 addendum 9 (census 6.13): the seven cells light on the
 *     days a completed workout STARTED, the twelve-week grid's own days
 *     (calValues).
 *   - the strip: this Monday week so far, in logged sets (never the credits
 *     summed), judged by the same one judgement (each muscle's role in the active
 *     plan, volumeJudgement.js) and the same plan-trained set the Volume heatmap
 *     reads, so its "below maintenance" count is that screen's first group
 *     (src/lib/progress/volumeStrip.js). The recovery week is the programme
 *     position's GATED planned recovery week, with the calendar flag only as the
 *     fallback when the position is unread.
 *   - the recent sessions (the newest three) and what the Workout Summary needs to
 *     open them (the set rows and the shared exercise lookup).
 *
 * `showPlanWeek` is false after a failed load (a card built from nothing would
 * claim "0 sessions") and until both the progress data and the plan context have
 * been read.
 */
import { useRef, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';
import useTheme from './useTheme';
import useProgressData from './useProgressData';
import { getPlanLandmarks, getPlanRoles } from '../lib/effectiveLandmarks';
import { resolveProgrammePosition } from '../lib/programmePosition';
import { planTrainedMuscles } from '../lib/volumeLogged';
import { logError } from '../lib/errorLog';
import { buildPlanWeekSummary } from '../lib/progress/planWeek';
import { buildVolumeStrip, isStripRecoveryWeek, stripLegendItems } from '../lib/progress/volumeStrip';

// What the hook holds for the plan context when there is no signed-in account
// (no plan, nothing plan-trained, no roles, so every muscle reads the standard
// bands).
const NO_PLAN_CONTEXT = Object.freeze({ position: null, planTrained: new Set(), roles: Object.freeze({}) });

export default function useTrainWeek() {
  const user = useAppStore(s => s.user);
  const userProfile = useAppStore(s => s.userProfile);
  const t = useTheme();
  const {
    loading, refreshing, loadError,
    recentSessions, allSets, exerciseMap, exerciseLookup, calValues, currentMesoWeek,
    hasData,
    handleRefresh,
  } = useProgressData();

  const [planContext, setPlanContext] = useState(undefined);
  const planRequestRef = useRef(0);
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const loadPlanContext = useCallback(async () => {
    const requestId = planRequestRef.current + 1;
    planRequestRef.current = requestId;
    if (!user?.id) { setPlanContext(NO_PLAN_CONTEXT); return; }
    const profile = userProfileRef.current;
    try {
      const [position, planLayer, roles] = await Promise.all([
        resolveProgrammePosition(user.id).catch(() => null),
        getPlanLandmarks(user.id, { userProfile: profile }).catch((e) => {
          logError('useTrainWeek.readPlanLandmarks', e, { userId: user.id });
          return null;
        }),
        getPlanRoles(user.id),
      ]);
      if (planRequestRef.current !== requestId) return;
      setPlanContext({
        position: position ?? null,
        planTrained: planTrainedMuscles(planLayer),
        roles: roles ?? {},
      });
    } catch (e) {
      // Never an unread plan slot forever: whatever failed, the hook reads as no
      // plan with the research table, and the failure is logged.
      logError('useTrainWeek.loadPlanContext', e, { userId: user.id });
      if (planRequestRef.current === requestId) setPlanContext(NO_PLAN_CONTEXT);
    }
  }, [user?.id]);
  useFocusEffect(
    useCallback(() => { loadPlanContext(); }, [loadPlanContext]),
  );

  // D218: the strip and the summary read the shared exercise lookup, so a set
  // whose id this install does not hold is named and typed by its own name
  // snapshot (the plain map is only the fallback before the lookup loads).
  const exercisesForSets = exerciseLookup ?? exerciseMap;

  const completedDays = useMemo(() => calValues.map((v) => v.date), [calValues]);
  const planWeekSummary = useMemo(
    () => (planContext
      ? buildPlanWeekSummary({ position: planContext.position, sets: allSets, completedDays, finished: !!currentMesoWeek?.awaitingDecision })
      : null),
    [planContext, allSets, completedDays, currentMesoWeek],
  );
  const recoveryWeek = useMemo(
    () => isStripRecoveryWeek({ position: planContext?.position ?? null, currentMesoWeek }),
    [planContext, currentMesoWeek],
  );
  const strip = useMemo(() => buildVolumeStrip({
    allSets,
    exerciseMap: exercisesForSets,
    nowMs: Date.now(),
    roles: planContext?.roles ?? null,
    planTrained: planContext?.planTrained ?? null,
    recoveryWeek,
  }), [allSets, exercisesForSets, planContext, recoveryWeek]);
  const legendItems = useMemo(
    () => stripLegendItems({ colors: t.colors, recoveryWeek }),
    [t, recoveryWeek],
  );

  // Pull to refresh re-reads the plan context beside the progress data.
  const refresh = useCallback(() => { loadPlanContext(); return handleRefresh(); }, [loadPlanContext, handleRefresh]);

  // The plan-week slot: nothing at all after a failed load (a card built from
  // nothing would claim "0 sessions"), and nothing until both the progress data
  // and the plan context have been read.
  const showPlanWeek = !loadError && !loading && planContext !== undefined && !!planWeekSummary;

  return {
    loading, refreshing, loadError,
    planWeekSummary, showPlanWeek,
    strip, legendItems, hasData,
    recentSessions, allSets, exerciseLookup,
    refresh,
  };
}
