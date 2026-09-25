import { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllWorkouts, getAllExercises, getAllMesocycles,
  getActivePlan,
  getRecentWorkoutFeedback, getCurrentMesocycleWeek, getPlannedMuscleVolume,
} from '../lib/database';
import {
  calculateWeeklyVolume,
  calculate1RM, buildLoadSemanticsById, shouldDeload, buildLast4WeekDeloadBuckets,
} from '../lib/algorithms';
import { logError } from '../lib/errorLog';
import { localDayKey, localDayKeysEndingAt, localWeekStartMs, localWeekEndMs } from '../lib/dayKey';
import { blockWeekSpan, buildBlockProgressRows } from '../lib/blockWeekProgress';
// Progress-tab audit 2026-09-24 (F4/F5, D200 item 3, S6-5), lane E: the ONE
// Monday-anchored weekly tonnage series shared by the plan card's sparkline
// and the workload (ACWR) card, replacing the old rolling-7-day bucketing
// (mesoTonnage) and getAcuteChronicWorkload (database.js, rolling, no
// exercise-type map) below. See trainingLoad.js's header for the full
// defect history.
import { mondayWeekLoadSeries, acuteChronicFromSeries } from '../lib/trainingLoad';

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
  for (const [exId, sets] of Object.entries(byEx)) {
    // C6 P11-2 (D97-18): this tile now mirrors the live detector's gates.
    // It used to count the FIRST-EVER set of every exercise as a record
    // (the exact claim FQ-7 exists to prevent), included warm-ups and
    // cluster rows, and never read its own exerciseMap - so three new
    // exercises showed "3 new PRs" and distance exercises produced
    // phantom records from their metres column.
    const exType = exerciseMap?.[exId]?.type ?? 'weight_reps';
    if (exType !== 'weight_reps') continue;
    let runningMax = 0;
    for (const s of sets) {
      const st = s.setType ?? s.set_type ?? 'straight';
      if (st === 'warmup' || st === 'myo_reps' || st === 'rest_pause') continue;
      const at = s.createdAt ?? s.created_at ?? 0;
      const w = s.weight ?? 0;
      const r = s.actualReps ?? s.actual_reps ?? 0;
      if (w <= 0 || r <= 0) continue;
      const est = calculate1RM(w, r);
      if (est > runningMax) {
        // FQ-7: the first qualifying exposure is a BASELINE, never a record.
        const isBaseline = runningMax === 0;
        runningMax = est;
        if (!isBaseline && at >= windowStart) prEvents.push(at);
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
  const [loadError, setLoadError] = useState(false);

  // Section data
  const [activeMeso, setActiveMeso]         = useState(null);
  const [mesoTonnage, setMesoTonnage]       = useState([]);   // [{value, label}]
  const [weeklyVolume, setWeeklyVolume]     = useState({});
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
  const loadRequestRef = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { load(); }, [user?.id]));

  function clearUserProgressState() {
    setActiveMeso(null);
    setMesoTonnage([]);
    setWeeklyVolume({});
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
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    if (!user?.id) {
      clearUserProgressState();
      setLoadError(false);
      setLoading(false);
      return;
    }
    try {
      const [workouts, sets, exercises] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
      ]);
      if (!isCurrentRequest()) return;
      setLoadError(false);
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

      // F4/F5/S6-5 (D200 item 3): ONE Monday-anchored weekly tonnage series
      // feeds both the plan card's sparkline (loadMesocycle below) and the
      // workload card, so the two can never show different kg for the same
      // week again, and both exclude a distance/duration set's
      // metres/seconds from the kg sum. exerciseTypeById is built from exMap
      // the same way WorkoutHistoryScreen.buildHistoryRows builds it.
      let loadSeries = [];
      try {
        const exerciseTypeById = Object.fromEntries(
          Object.values(exMap).map(e => [e.id, e.exercise_type ?? e.exerciseType ?? 'weight_reps']),
        );
        const loadSemanticsById = buildLoadSemanticsById(Object.values(exMap));
        loadSeries = mondayWeekLoadSeries(sets, { weeks: 5, exerciseTypeById, loadSemanticsById });
      } catch (_) { loadSeries = []; }
      if (!isCurrentRequest()) return;
      setWorkloadData(acuteChronicFromSeries(loadSeries));

      await Promise.all([
        loadMesocycle(workouts, loadSeries, isCurrentRequest),
        loadVolumeSnapshot(sets, exMap, isCurrentRequest),
        loadDeloadCheck(sets, exMap, workouts, isCurrentRequest),
        loadCalendar(workouts, isCurrentRequest),
        loadRecentSessions(workouts, isCurrentRequest),
        loadSessionDurationTrend(workouts, isCurrentRequest),
        loadMuscleFrequency(sets, exMap, isCurrentRequest),
        loadFatigueTrend(isCurrentRequest),
        loadBlockState(sets, exMap, isCurrentRequest),
      ]);
    } catch (e) {
      if (!isCurrentRequest()) return;
      logError('AnalyticsScreen.load', e, { userId: user?.id });
      clearUserProgressState();
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  async function loadMesocycle(workouts, loadSeries, isCurrentRequest = () => true) {
    try {
      const mesoRows = await getAllMesocycles(user.id);
      let active = mesoRows.find(m => m.isActive === 1 || m.isActive === true) ?? null;
      if (!active) {
        const plan = await getActivePlan(user.id);
        if (plan) active = { ...plan, _isPlan: true };
      }
      if (!isCurrentRequest()) return;
      setActiveMeso(active);

      // F4 (D200 item 3): the sparkline is the last four entries of the
      // shared Monday-anchored `loadSeries` (three full weeks and the
      // current week so far) -- byte-identical bar shape and colour rule to
      // before (SvgBarSparkline's {value, label, color}), just Monday-
      // anchored instead of rolling, and reading the same series the
      // workload card's acute:chronic figures come from (F5).
      const bars = loadSeries.slice(-4).map((week, idx, arr) => {
        const isNow = idx === arr.length - 1;
        const weeksAgo = arr.length - 1 - idx;
        return {
          value: Math.round(week.tonnage),
          label: isNow ? 'Now' : `-${weeksAgo}w`,
          // D174: this painted ALL FOUR bars amber or dim-amber, which is the
          // accent as decoration -- three of them are history. Only the
          // current-week bar is "Now", which is the one thing discipline 1
          // lets amber mark. The rest take `borderLight`, the token the week
          // ribbon fills a trained day with, so "a past filled thing" reads
          // the same across unrelated surfaces (D172's reasoning for the
          // macro arc).
          color: isNow ? colors.primary : colors.borderLight,
        };
      });
      setMesoTonnage(bars);
    } catch (_) {}
  }

  async function loadFatigueTrend(isCurrentRequest = () => true) {
    try {
      const rows = await getRecentWorkoutFeedback(user.id, 6);
      if (isCurrentRequest()) setFatigueSessions(rows);
    } catch (_) {
      if (isCurrentRequest()) setFatigueSessions([]);
    }
  }

  async function loadBlockState(sets, exMap, isCurrentRequest = () => true) {
    try {
      const week = await getCurrentMesocycleWeek(user.id).catch(() => null);
      // X15 (cross-surface-consistency-audit-2026-07-30): this passed
      // user.id, but getPlannedMuscleVolume filters
      // `WHERE mesocycle_week_id = ?` -- so BlockProgressCard rendered null
      // for every user, always. Pass the actual current week's row id.
      const plannedRows = week?.id ? await getPlannedMuscleVolume(week.id).catch(() => []) : [];
      if (!isCurrentRequest()) return;
      setCurrentMesoWeek(week);
      // F2 (progress-tab-audit-2026-09-24, D199): "actual" must count the
      // sets logged inside THIS BLOCK WEEK's own seven days, not a rolling
      // or Monday-anchored window -- a block that did not start on a Monday
      // would otherwise credit a session to the wrong week. blockWeekSpan
      // derives that span from the block's own start date; when it cannot
      // (no active block, or an unparseable stored start date) fall back to
      // the same Monday-anchored week loadVolumeSnapshot above already uses,
      // so the card still shows a sensible number rather than nothing.
      const span = blockWeekSpan(week?.blockStartMs, week?.weekIndex)
        ?? { startMs: localWeekStartMs(Date.now()), endMs: Infinity };
      const spanSets = (sets || []).filter((s) => {
        const at = s.createdAt ?? s.created_at ?? 0;
        return at >= span.startMs && at < span.endMs;
      });
      const actual = calculateWeeklyVolume(spanSets, exMap);
      setBlockProgress(buildBlockProgressRows(plannedRows, actual));
    } catch (_) {
      if (isCurrentRequest()) {
        setCurrentMesoWeek(null);
        setBlockProgress([]);
      }
    }
  }

  async function loadVolumeSnapshot(sets, exMap, isCurrentRequest = () => true) {
    if (!isCurrentRequest()) return;
    // T7 (comprehension-trust audit 2026-08-06): this used a rolling
    // trailing-7-days window while the streak strip on the same screen used
    // the Monday-anchored calendar week, so two "this week" numbers on one
    // screen could disagree. dayKey.js's own rule: every "this week"
    // boundary uses localWeekStartMs.
    const weekStart = localWeekStartMs(Date.now());
    const recentSets = sets.filter(s => (s.createdAt ?? s.created_at ?? 0) >= weekStart);
    const vol = calculateWeeklyVolume(recentSets, exMap);
    setWeeklyVolume(vol);
  }

  function loadDeloadCheck(sets, exMap, workouts, isCurrentRequest = () => true) {
    if (!isCurrentRequest()) return;
    try {
      // Campaign 24 §2: bucket-building extracted to the shared
      // buildLast4WeekDeloadBuckets (src/lib/algorithms.js), byte-identical
      // to this file's prior inline derivation -- every default matches
      // this caller's behaviour verbatim (rolling anchor, full exerciseMap,
      // answered-only soreness/joint, derived weeksSinceLastDeload, no
      // warmup exclusion). shouldDeload itself is untouched.
      const buckets = buildLast4WeekDeloadBuckets(sets, workouts, exMap, { now: Date.now() });
      const result = shouldDeload(buckets);
      setDeloadAlert(result.deload ? result : null);
    } catch (_) {}
  }

  async function loadCalendar(workouts, isCurrentRequest = () => true) {
    if (!isCurrentRequest()) return;
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
    // Build {date, count} for the last 84 days (12 weeks).
    //
    // DEFECT FIXED 2026-09-15. This stepped back with `now - i * DAY_MS`, a
    // fixed 24-hour subtraction, and then took the LOCAL day key of the result.
    // Across a DST transition the two disagree: the UK's October change means a
    // timestamp 24 hours earlier is an hour earlier or later in wall-clock
    // terms, so within an hour of midnight the walk duplicates one local day
    // and skips another. An 84-day window always spans a transition for part of
    // the year, so the twelve-week calendar could show a trained day twice and
    // lose a real one.
    //
    // `localDayKeysEndingAt` is the shared authority for exactly this and was
    // already in the codebase: it anchors at NOON and steps with `setDate`,
    // which is calendar-aware, so it cannot drift. Semantics are otherwise
    // identical -- still only the trained days, still `{date, count: 1}`, and
    // `TrainingCalendar` consumes the result as a Set plus a length, so the
    // oldest-first ordering this returns is immaterial.
    const vals = localDayKeysEndingAt(84, now)
      .filter((key) => completedDays.has(key))
      .map((key) => ({ date: key, count: 1 }));
    setCalValues(vals);
  }

  async function loadRecentSessions(workouts, isCurrentRequest = () => true) {
    if (!isCurrentRequest()) return;
    const completed = workouts
      .filter(w => w.isCompleted ?? w.is_completed ?? false)
      .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
      .slice(0, 3);
    setRecentSessions(completed);
  }

  function loadSessionDurationTrend(workouts, isCurrentRequest = () => true) {
    if (!isCurrentRequest()) return;
    try {
      const now = Date.now();

      // Q3/D200-3: six Monday-anchored local weeks -- five full weeks plus
      // the current week so far -- replacing the old rolling-7-day-from-now
      // buckets (F4). Each start steps back one calendar week via
      // Date#setDate (the same technique trainingLoad.js's
      // mondayWeekLoadSeries uses), never a fixed 7*24h subtraction, so a
      // week either side of a UK clock change still measures a real
      // calendar week.
      const starts = [localWeekStartMs(now)];
      for (let i = 1; i < 6; i++) {
        const d = new Date(starts[0]);
        d.setDate(d.getDate() - 7);
        starts.unshift(d.getTime());
      }

      // Bucket completed workouts with a duration into the 6 weekly slots
      // (0 = oldest full week, 5 = the current week so far).
      const buckets = Array.from({ length: 6 }, () => []);
      for (const w of workouts) {
        if (!(w.isCompleted ?? w.is_completed)) continue;
        const dur = w.durationMinutes ?? w.duration_minutes ?? 0;
        if (!dur || dur <= 0) continue;
        const at = w.startedAt ?? w.createdAt ?? w.created_at ?? 0;
        const idx = starts.findIndex((weekStart, i) => {
          const weekEnd = i === starts.length - 1 ? now : localWeekEndMs(weekStart);
          return at >= weekStart && at < weekEnd;
        });
        if (idx === -1) continue;
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
        // Week label: W1 (oldest full week) to W5, then the current week so far.
        const weekLabel = idx === 5 ? 'Now' : `W${idx + 1}`;
        return { avgMin, weekLabel, sessionCount: sessions.length };
      });

      setDurationBars(bars);
    } catch (_) {}
  }

  function loadMuscleFrequency(sets, exMap, isCurrentRequest = () => true) {
    if (!isCurrentRequest()) return;
    try {
      // T7: calendar weeks (Monday-anchored), matching every other "this
      // week vs last" surface; was a rolling now-minus-7-days pair.
      const thisWeekStart = localWeekStartMs(Date.now());
      const lastWeekStart = thisWeekStart - WEEK_MS;

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

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Mesocycle progress (0–1) and current week -- both derived from
  // currentMesoWeek (Wave 2, cross-surface-consistency-audit-2026-07-30):
  // the SAME date-based resolver (getCurrentMesocycleWeek) every other
  // block/week surface reads, not an independent date calculation. This
  // used to floor/ceil raw ms against durationWeeks, its own competing
  // answer for "which week" (X8: ConsistencyScreen rendered this alongside
  // the resolver's own BlockShapeCard and showed two different weeks for
  // the same block on the same screen).
  function mesoProgress() {
    if (!currentMesoWeek?.plannedWeeks) return 0;
    const total = currentMesoWeek.plannedWeeks;
    return Math.min(1, Math.max(0, (currentMesoWeek.weekIndex - 1) / Math.max(total - 1, 1)));
  }

  function mesoCurrentWeek() {
    return currentMesoWeek?.weekIndex ?? 1;
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
    loading, refreshing, loadError,
    activeMeso, mesoTonnage, weeklyVolume,
    calValues, recentSessions, allSets, exerciseMap, deloadAlert,
    durationBars, muscleFreq, showAllMuscles, setShowAllMuscles,
    workloadData, fatigueSessions, blockProgress, earliestWorkoutAt,
    completedWorkoutCount,
    currentMesoWeek,
    hasData, sessionCount, enoughForTrends,
    handleRefresh,
    mesoProgress, mesoCurrentWeek,
  };
}
