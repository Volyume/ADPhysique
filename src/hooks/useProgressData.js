import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllWorkouts, getAllExercises, getAllMesocycles,
  dismissInsight, runInsightsEngine, getActivePlan,
  getAcuteChronicWorkload,
  getRecentWorkoutFeedback, getCurrentMesocycleWeek, getPlannedMuscleVolume,
} from '../lib/database';
import {
  calculateWeeklyVolume, VOLUME_LANDMARKS,
  calculate1RM, calculateTonnage, shouldDeload,
} from '../lib/algorithms';
import { logError } from '../lib/errorLog';
import { localDayKey } from '../lib/dayKey';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Computes how many novel per-exercise 1RM bests occurred within each
// calendar week that falls inside [windowStart, now].
export function computePRsPerWeek(allSets, exerciseMap, windowDays, now = Date.now()) {
  const windowStart = now - windowDays * DAY_MS;
  // Group all sets by exercise, time-ordered (all history needed for running max)
  const byEx = {};
  for (const s of allSets) {
    const exId = s.exerciseId ?? s.exercise_id;
    if (!exId) continue;
    (byEx[exId] ??= []).push(s);
  }
  // Sort each exercise's sets ascending
  for (const id of Object.keys(byEx)) {
    byEx[id].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }
  // Iterate sets; whenever a new running-max 1RM is set, record the date
  const prEvents = [];
  for (const [, sets] of Object.entries(byEx)) {
    let runningMax = 0;
    for (const s of sets) {
      const at = s.createdAt ?? s.created_at ?? 0;
      const w = s.weight ?? 0;
      const r = s.actualReps ?? s.actual_reps ?? 0;
      if (w <= 0 || r <= 0) continue;
      const est = calculate1RM(w, r);
      if (est > runningMax) {
        runningMax = est;
        if (at >= windowStart) prEvents.push(at);
      }
    }
  }
  // Bin into week slots (0 = oldest week in window, n-1 = most recent)
  const totalWeeks = Math.ceil(windowDays / 7);
  const weeks = Array.from({ length: totalWeeks }, () => 0);
  for (const at of prEvents) {
    const daysAgo = Math.floor((now - at) / DAY_MS);
    const weekIdx = totalWeeks - 1 - Math.floor(daysAgo / 7);
    if (weekIdx >= 0 && weekIdx < totalWeeks) weeks[weekIdx]++;
  }
  return weeks;
}

// The Progress tab's data layer. Extracted from AnalyticsScreen so the landing
// and the Consistency surface read from one source of truth instead of two
// copies of the same loaders. Behaviour-preserving: same loaders, same shapes.
export default function useProgressData() {
  const user = useAppStore(s => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Section data
  const [activeMeso, setActiveMeso]         = useState(null);
  const [mesoTonnage, setMesoTonnage]       = useState([]);   // [{value, label}]
  const [insights, setInsights]             = useState([]);
  const [weeklyVolume, setWeeklyVolume]     = useState({});
  const [prBars, setPrBars]                 = useState([]);   // [{value}] 30d by default
  const [prWindow, setPrWindow]             = useState(30);
  const [calValues, setCalValues]           = useState([]);   // [{date, count}]
  const [recentSessions, setRecentSessions] = useState([]);
  const [allSets, setAllSets]               = useState([]);
  const [exerciseMap, setExerciseMap]       = useState({});
  const [deloadAlert, setDeloadAlert]       = useState(null);
  const [durationBars, setDurationBars]     = useState([]);   // [{avgMin, weekLabel}] for session length trend
  const [muscleFreq, setMuscleFreq]         = useState([]);   // [{muscle, thisWeek, lastWeek}]
  const [showAllMuscles, setShowAllMuscles] = useState(false);
  const [workloadData, setWorkloadData]     = useState(null);
  const [fatigueSessions, setFatigueSessions] = useState([]);   // last 6 sessions w/ feedback
  const [blockProgress, setBlockProgress]     = useState([]);   // planned vs actual per muscle
  const [earliestWorkoutAt, setEarliestWorkoutAt] = useState(null);
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(0);
  const [currentMesoWeek, setCurrentMesoWeek] = useState(null); // {weekIndex, plannedWeeks, isDeload, rirTarget}

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { load(); }, [user?.id]));

  function clearUserProgressState() {
    setActiveMeso(null);
    setMesoTonnage([]);
    setInsights([]);
    setWeeklyVolume({});
    setPrBars([]);
    setPrWindow(30);
    setCalValues([]);
    setRecentSessions([]);
    setAllSets([]);
    setExerciseMap({});
    setDeloadAlert(null);
    setDurationBars([]);
    setMuscleFreq([]);
    setShowAllMuscles(false);
    setWorkloadData(null);
    setFatigueSessions([]);
    setBlockProgress([]);
    setEarliestWorkoutAt(null);
    setCompletedWorkoutCount(0);
    setCurrentMesoWeek(null);
  }

  async function load() {
    if (!user?.id) {
      clearUserProgressState();
      setLoading(false);
      return;
    }
    try {
      const [workouts, sets, exercises] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
      ]);
      const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
      setAllSets(sets);
      setExerciseMap(exMap);
      // Earliest completed workout, drives Year of Lifts unlock.
      // Comparing started_at across workouts is fine since values
      // are ms-epoch integers.
      const completed = (workouts || []).filter(w => w.isCompleted && w.startedAt);
      const earliest = completed.length
        ? completed.reduce((m, w) => (w.startedAt < m ? w.startedAt : m), completed[0].startedAt)
        : null;
      setEarliestWorkoutAt(earliest);
      // COMP-005: lifetime completed-session count gates the Recaps tile (>=10).
      setCompletedWorkoutCount(completed.length);

      const wl = await getAcuteChronicWorkload(user.id).catch(() => null);
      setWorkloadData(wl);

      await Promise.all([
        loadMesocycle(workouts, sets, exMap),
        loadInsights(),
        loadVolumeSnapshot(sets, exMap),
        loadDeloadCheck(sets, exMap, workouts),
        loadPRBars(sets, exMap, 30),
        loadCalendar(workouts),
        loadRecentSessions(workouts),
        loadSessionDurationTrend(workouts),
        loadMuscleFrequency(sets, exMap),
        loadFatigueTrend(),
        loadBlockState(),
      ]);
    } catch (e) {
      logError('AnalyticsScreen.load', e, { userId: user?.id });
    } finally {
      setLoading(false);
    }
  }

  async function loadMesocycle(workouts, sets, _exMap) {
    try {
      const mesoRows = await getAllMesocycles(user.id);
      let active = mesoRows.find(m => m.isActive === 1 || m.isActive === true) ?? null;
      if (!active) {
        const plan = await getActivePlan(user.id);
        if (plan) active = { ...plan, _isPlan: true };
      }
      setActiveMeso(active);

      // Build weekly tonnage sparkline: last 4 weeks. Current week highlighted in
      // primary amber, prior weeks dimmed. Shape matches SvgBarSparkline's
      // {value, label, color} point format.
      const bars = [];
      const now = Date.now();
      for (let wk = 3; wk >= 0; wk--) {
        const end   = now - wk * WEEK_MS;
        const start = end - WEEK_MS;
        const wkSets = sets.filter(s => {
          const at = s.createdAt ?? s.created_at ?? 0;
          return at >= start && at < end;
        });
        const tonnage = calculateTonnage(wkSets);
        bars.push({
          value: Math.round(tonnage),
          label: wk === 0 ? 'Now' : `-${wk}w`,
          color: wk === 0 ? colors.primary : colors.primaryDim,
        });
      }
      setMesoTonnage(bars);
    } catch (_) {}
  }

  async function loadFatigueTrend() {
    try {
      const rows = await getRecentWorkoutFeedback(user.id, 6);
      setFatigueSessions(rows);
    } catch (_) {
      setFatigueSessions([]);
    }
  }

  async function loadBlockState() {
    try {
      const week = await getCurrentMesocycleWeek(user.id).catch(() => null);
      setCurrentMesoWeek(week);
      const progress = await getPlannedMuscleVolume(user.id).catch(() => []);
      setBlockProgress(progress || []);
    } catch (_) {
      setCurrentMesoWeek(null);
      setBlockProgress([]);
    }
  }

  async function loadInsights() {
    try {
      const fresh = await runInsightsEngine(user.id);
      setInsights(fresh);
    } catch (_) {}
  }

  async function loadVolumeSnapshot(sets, exMap) {
    const now = Date.now();
    const weekAgo = now - WEEK_MS;
    const recentSets = sets.filter(s => (s.createdAt ?? s.created_at ?? 0) >= weekAgo);
    const vol = calculateWeeklyVolume(recentSets, exMap);
    setWeeklyVolume(vol);
  }

  function loadDeloadCheck(sets, exMap, workouts) {
    try {
      const now = Date.now();
      // Build per-week data for last 4 weeks
      const last4 = [];
      for (let wk = 3; wk >= 0; wk--) {
        const end   = now - wk * WEEK_MS;
        const start = end - WEEK_MS;
        const wkSets = sets.filter(s => {
          const at = s.createdAt ?? s.created_at ?? 0;
          return at >= start && at < end;
        });
        const vol = calculateWeeklyVolume(wkSets, exMap);
        const hasOverMRV = Object.entries(vol).some(([muscle, data]) => {
          const lm = VOLUME_LANDMARKS[muscle];
          return lm && data.workingSets > lm.mrv;
        });
        const wkWorkouts = workouts.filter(w => {
          const at = w.startedAt ?? w.createdAt ?? 0;
          return at >= start && at < end && (w.isCompleted ?? w.is_completed);
        });
        const avgSoreness = wkWorkouts.length > 0
          ? wkWorkouts.reduce((sum, w) => sum + (w.soreness24hBefore ?? w.soreness_24h_before ?? 0), 0) / wkWorkouts.length
          : 0;
        const avgJointDiscomfort = wkWorkouts.length > 0
          ? wkWorkouts.reduce((sum, w) => sum + (w.jointDiscomfort ?? w.joint_discomfort ?? 0), 0) / wkWorkouts.length
          : 0;
        const avgReps = wkSets.length > 0
          ? wkSets.reduce((sum, s) => sum + (s.actualReps ?? s.actual_reps ?? 0), 0) / wkSets.length
          : 0;
        // Estimate weeks since last lighter week: scan backwards for a low-volume week (< 15 total working sets)
        last4.push({ avgReps, avgSoreness, avgJointDiscomfort, hasOverMRV, weeksSinceLastDeload: 4 - wk });
      }
      // Compute weeks since last lighter week more accurately using full set history
      const weeksSinceLighter = (() => {
        for (let wk = 1; wk <= 12; wk++) {
          const end   = now - wk * WEEK_MS;
          const start = end - WEEK_MS;
          const wkSets = sets.filter(s => {
            const at = s.createdAt ?? 0;
            return at >= start && at < end;
          });
          const vol = calculateWeeklyVolume(wkSets, exMap);
          const totalSets = Object.values(vol).reduce((sum, v) => sum + v.workingSets, 0);
          if (totalSets < 15) return wk;  // found a low-volume / rest week
        }
        return 12; // no lighter week found in last 12 weeks
      })();
      // Patch weeksSinceLastDeload into all 4 entries
      const patched = last4.map((entry, i) => ({
        ...entry,
        weeksSinceLastDeload: weeksSinceLighter + (3 - i),
      }));
      const result = shouldDeload(patched);
      setDeloadAlert(result.deload ? result : null);
    } catch (_) {}
  }

  function loadPRBars(sets, exMap, windowDays) {
    const bars = computePRsPerWeek(sets, exMap, windowDays).map((v, i) => ({
      value: v,
      frontColor: v > 0 ? colors.gold : colors.surface2,
      label: i === 0 ? `${windowDays}d` : '',
    }));
    setPrBars(bars);
  }

  async function loadCalendar(workouts) {
    const now = Date.now();
    // Bucket by the user's LOCAL calendar day, not UTC. UK runs on BST
    // (UTC+1) half the year, so a UTC bucket lands a session on the day
    // before. localDayKey keeps each square on the day the user trained.
    const completedDays = new Set();
    for (const w of workouts) {
      if (!(w.isCompleted ?? w.is_completed ?? false)) continue;
      const at = w.startedAt ?? w.createdAt ?? w.created_at ?? 0;
      if (!at) continue;
      completedDays.add(localDayKey(at));
    }
    // Build {date, count} for the last 84 days (12 weeks)
    const vals = [];
    for (let i = 0; i < 84; i++) {
      const key = localDayKey(now - i * DAY_MS);
      if (completedDays.has(key)) {
        vals.push({ date: key, count: 1 });
      }
    }
    setCalValues(vals);
  }

  async function loadRecentSessions(workouts) {
    const completed = workouts
      .filter(w => w.isCompleted ?? w.is_completed ?? false)
      .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
      .slice(0, 3);
    setRecentSessions(completed);
  }

  function loadSessionDurationTrend(workouts) {
    try {
      const now = Date.now();
      const SIX_WEEKS_MS = 6 * WEEK_MS;
      const windowStart = now - SIX_WEEKS_MS;

      // Bucket completed workouts with a duration into 6 weekly slots (0 = oldest, 5 = most recent)
      const buckets = Array.from({ length: 6 }, () => []);
      for (const w of workouts) {
        if (!(w.isCompleted ?? w.is_completed)) continue;
        const dur = w.durationMinutes ?? w.duration_minutes ?? 0;
        if (!dur || dur <= 0) continue;
        const at = w.startedAt ?? w.createdAt ?? w.created_at ?? 0;
        if (at < windowStart) continue;
        const weeksAgo = Math.floor((now - at) / WEEK_MS);
        if (weeksAgo < 0 || weeksAgo >= 6) continue;
        const idx = 5 - weeksAgo; // 0 = oldest, 5 = this week
        buckets[idx].push(dur);
      }

      // Require at least 3 sessions across the window with a recorded duration
      const totalSessions = buckets.reduce((sum, b) => sum + b.length, 0);
      if (totalSessions < 3) {
        setDurationBars([]);
        return;
      }

      const bars = buckets.map((sessions, idx) => {
        const avgMin = sessions.length > 0
          ? Math.round(sessions.reduce((s, v) => s + v, 0) / sessions.length)
          : 0;
        // Week label: W1 (oldest) to W6 (this week)
        const weekLabel = idx === 5 ? 'Now' : `W${idx + 1}`;
        return { avgMin, weekLabel, sessionCount: sessions.length };
      });

      setDurationBars(bars);
    } catch (_) {}
  }

  function loadMuscleFrequency(sets, exMap) {
    try {
      const now = Date.now();
      const thisWeekStart = now - WEEK_MS;
      const lastWeekStart = now - 2 * WEEK_MS;

      // Count distinct workout_ids per muscle per week-window
      // "session count" = number of unique workouts that included that muscle
      const thisWeekWorkouts = {};  // muscle → Set of workoutIds
      const lastWeekWorkouts = {};  // muscle → Set of workoutIds

      for (const s of sets) {
        const at = s.createdAt ?? s.created_at ?? 0;
        const exId = s.exerciseId ?? s.exercise_id;
        const ex = exMap[exId];
        if (!ex) continue;
        let muscle = (ex.primaryMuscle || ex.primary_muscle || '').toLowerCase();
        if (muscle === 'shoulders') muscle = 'side_delts';
        if (!muscle) continue;
        const workoutId = s.workoutId ?? s.workout_id;

        if (at >= thisWeekStart) {
          (thisWeekWorkouts[muscle] ??= new Set()).add(workoutId);
        } else if (at >= lastWeekStart) {
          (lastWeekWorkouts[muscle] ??= new Set()).add(workoutId);
        }
      }

      // Merge all muscles that appeared in either week
      const allMuscles = new Set([
        ...Object.keys(thisWeekWorkouts),
        ...Object.keys(lastWeekWorkouts),
      ]);

      const rows = Array.from(allMuscles)
        .map(muscle => ({
          muscle,
          thisWeek: thisWeekWorkouts[muscle]?.size ?? 0,
          lastWeek: lastWeekWorkouts[muscle]?.size ?? 0,
        }))
        .sort((a, b) => b.thisWeek - a.thisWeek || b.lastWeek - a.lastWeek);

      setMuscleFreq(rows);
    } catch (_) {}
  }

  async function handleDismiss(insightId) {
    await dismissInsight(insightId);
    setInsights(prev => prev.filter(i => i.id !== insightId));
  }

  function handlePrWindowToggle() {
    const next = prWindow === 30 ? 90 : 30;
    setPrWindow(next);
    loadPRBars(allSets, exerciseMap, next);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Mesocycle progress (0–1)
  function mesoProgress() {
    if (!activeMeso) return 0;
    const total = activeMeso.durationWeeks ?? 0;
    if (!total || !activeMeso.startDate) return 0;
    const start = typeof activeMeso.startDate === 'string'
      ? new Date(activeMeso.startDate).getTime()
      : activeMeso.startDate;
    const weeksSinceStart = Math.max(0, (Date.now() - start) / WEEK_MS);
    return Math.min(1, weeksSinceStart / total);
  }

  function mesoCurrentWeek() {
    if (!activeMeso?.startDate) return 1;
    const start = typeof activeMeso.startDate === 'string'
      ? new Date(activeMeso.startDate).getTime()
      : activeMeso.startDate;
    return Math.max(1, Math.ceil((Date.now() - start) / WEEK_MS));
  }

  // Has the user logged anything yet? Used to hide the always-on chart
  // sections until there is data, so a brand-new user does not see "No data
  // yet" sitting on top of a wall of zeros.
  const hasData = allSets.length > 0;
  // Trend and history charts only read once there are a few sessions to
  // compare; hold the multi-session charts back until at least three.
  const sessionCount = useMemo(
    () => new Set(allSets.map((s) => s.workoutId ?? s.workout_id)).size,
    [allSets],
  );
  const enoughForTrends = sessionCount >= 3;

  return {
    loading, refreshing,
    activeMeso, mesoTonnage, insights, weeklyVolume, prBars, prWindow,
    calValues, recentSessions, allSets, exerciseMap, deloadAlert,
    durationBars, muscleFreq, showAllMuscles, setShowAllMuscles,
    workloadData, fatigueSessions, blockProgress, earliestWorkoutAt,
    completedWorkoutCount,
    currentMesoWeek,
    hasData, sessionCount, enoughForTrends,
    handleDismiss, handlePrWindowToggle, handleRefresh,
    mesoProgress, mesoCurrentWeek,
  };
}
