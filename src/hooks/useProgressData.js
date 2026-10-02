import { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllWorkouts, getAllExercises, getAllMesocycles,
  getActivePlan,
  getCurrentMesocycleWeek, getPlannedMuscleVolume,
} from '../lib/database';
import {
  calculateWeeklyVolume,
  calculate1RM, buildLoadSemanticsById, shouldDeload, buildLast4WeekDeloadBuckets,
} from '../lib/algorithms';
import { logError } from '../lib/errorLog';
import { localDayKey, localDayKeysEndingAt, localWeekStartMs } from '../lib/dayKey';
import { blockWeekSpan, buildBlockProgressRows } from '../lib/blockWeekProgress';
// Progress-tab audit 2026-09-24 (F4/F5, D200 item 3, S6-5), lane E: the ONE
// Monday-anchored weekly tonnage series shared by the plan card's sparkline
// and the workload (ACWR) card, replacing the old rolling-7-day bucketing
// (mesoTonnage) and the since-retired database read getAcuteChronicWorkload
// (rolling, no exercise-type map). See trainingLoad.js's header for the
// full defect history.
import { mondayWeekLoadSeries, acuteChronicFromSeries, likeForLikeLoad } from '../lib/trainingLoad';
// D214 (Consistency elevation, lane 4): the programme position is read here,
// with the other loaders, so the plan-week card never paints its no-plan
// reading and then flips: `loading` covers the read, and a refresh re-reads it.
import { resolveProgrammePosition } from '../lib/programmePosition';

const DAY_MS = 24 * 60 * 60 * 1000;
// "Sessions usually last about N minutes" reads the sessions of the last six
// Monday weeks (five full weeks and this week so far), the window the session
// length chart it replaces used, and waits for at least three of them.
const TYPICAL_SESSION_WEEKS = 6;
const TYPICAL_SESSION_MIN_COUNT = 3;

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
  // D214 (CS-11): the session length chart and its fatigue inference are gone;
  // the screen prints one line, so the hook keeps one number (minutes, or null).
  const [typicalSessionMinutes, setTypicalSessionMinutes] = useState(null);
  const [workloadData, setWorkloadData]     = useState(null);
  // D214 (CS-6): the like-for-like comparison, Monday to now against the same
  // span of the previous weeks (trainingLoad.likeForLikeLoad), or null.
  const [loadComparison, setLoadComparison] = useState(null);
  // D214: resolveProgrammePosition's result (the gated recovery state, the plan
  // week's sessions and what is next), or null with no block or on a failed read.
  const [position, setPosition]             = useState(null);
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
    setTypicalSessionMinutes(null);
    setWorkloadData(null);
    setLoadComparison(null);
    setPosition(null);
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
      let comparison = null;
      try {
        const exerciseTypeById = Object.fromEntries(
          Object.values(exMap).map(e => [e.id, e.exercise_type ?? e.exerciseType ?? 'weight_reps']),
        );
        const loadSemanticsById = buildLoadSemanticsById(Object.values(exMap));
        // ONE instant for both reads, so the bar, the headline figure and the
        // comparison can never differ by the seconds between two clock reads.
        const loadNow = Date.now();
        loadSeries = mondayWeekLoadSeries(sets, { weeks: 5, now: loadNow, exerciseTypeById, loadSemanticsById });
        // D214 (CS-6, B10): the comparison the screen prints is like for like,
        // Monday to now against the same span of each of the previous three
        // weeks; the ratio of a part week to full ones (workloadData.ratio) is
        // no longer printed anywhere.
        comparison = likeForLikeLoad(sets, { weeks: 3, now: loadNow, exerciseTypeById, loadSemanticsById });
      } catch (_) { loadSeries = []; comparison = null; }
      if (!isCurrentRequest()) return;
      setWorkloadData(acuteChronicFromSeries(loadSeries));
      setLoadComparison(comparison);

      await Promise.all([
        loadMesocycle(workouts, loadSeries, isCurrentRequest),
        loadVolumeSnapshot(sets, exMap, isCurrentRequest),
        loadDeloadCheck(sets, exMap, workouts, isCurrentRequest),
        loadCalendar(workouts, isCurrentRequest),
        loadRecentSessions(workouts, isCurrentRequest),
        loadTypicalSessionMinutes(workouts, isCurrentRequest),
        loadPosition(isCurrentRequest),
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

      // F4 (D200 item 3): the load bars are the last four entries of the
      // shared Monday-anchored `loadSeries` (three full weeks and the
      // current week so far), reading the same series the workload figures
      // come from (F5), so the "this week so far" bar and the headline figure
      // are the identical number.
      //
      // D214: the bars carry no colour of their own any more. This used to
      // paint the current bar amber (an accent on a fact, CS-19); the load
      // card on Consistency reads its tones from the live theme.
      const bars = loadSeries.slice(-4).map((week, idx, arr) => {
        const isNow = idx === arr.length - 1;
        const weeksAgo = arr.length - 1 - idx;
        return {
          value: Math.round(week.tonnage),
          label: isNow ? 'Now' : `-${weeksAgo}w`,
        };
      });
      setMesoTonnage(bars);
    } catch (_) {}
  }

  // D214 (plan-week card, plan section 7.3 item 2): the programme position,
  // read on every load (so on focus and on refresh). It never throws:
  // `resolveProgrammePosition` logs its own failure and answers null, which the
  // plan-week card reads as "no plan" ("2 sessions this week"), so an unreadable
  // block is never claimed as anything.
  async function loadPosition(isCurrentRequest = () => true) {
    let resolved = null;
    try {
      resolved = await resolveProgrammePosition(user.id);
    } catch (e) {
      logError('useProgressData.loadPosition', e, { userId: user?.id });
      resolved = null;
    }
    if (isCurrentRequest()) setPosition(resolved ?? null);
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

  // D214 (CS-11): "Sessions usually last about N minutes". The middle length
  // (median, so one session left running for hours does not drag it) of the
  // completed sessions with a recorded duration in the last six Monday weeks,
  // from at least three sessions; null otherwise, and the screen prints nothing.
  // Each week start steps back with Date#setDate (calendar-aware, never a fixed
  // 7 * 24 h step), the technique the load series uses, so a clock-change week
  // is still a real week. This replaces the six-bar chart and its "your
  // sessions are getting shorter, which might mean fatigue" line, which
  // inferred a state the person had not reported (voice doc, pattern 3).
  function loadTypicalSessionMinutes(workouts, isCurrentRequest = () => true) {
    if (!isCurrentRequest()) return;
    try {
      const now = Date.now();
      const windowStart = new Date(localWeekStartMs(now));
      windowStart.setDate(windowStart.getDate() - 7 * (TYPICAL_SESSION_WEEKS - 1));
      const startMs = windowStart.getTime();

      const minutes = [];
      for (const w of workouts) {
        if (!(w.isCompleted ?? w.is_completed)) continue;
        const dur = w.durationMinutes ?? w.duration_minutes ?? 0;
        if (!dur || dur <= 0) continue;
        const at = w.startedAt ?? w.createdAt ?? w.created_at ?? 0;
        if (at >= startMs && at <= now) minutes.push(dur);
      }
      if (minutes.length < TYPICAL_SESSION_MIN_COUNT) {
        setTypicalSessionMinutes(null);
        return;
      }
      minutes.sort((x, y) => x - y);
      const mid = Math.floor(minutes.length / 2);
      const median = minutes.length % 2 === 1 ? minutes[mid] : (minutes[mid - 1] + minutes[mid]) / 2;
      setTypicalSessionMinutes(Math.round(median));
    } catch (_) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
    typicalSessionMinutes,
    workloadData, loadComparison, position, blockProgress, earliestWorkoutAt,
    completedWorkoutCount,
    currentMesoWeek,
    hasData, sessionCount, enoughForTrends,
    handleRefresh,
  };
}
