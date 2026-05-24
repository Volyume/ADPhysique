import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, volumeColors, motion } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import { EmptyChartIllustration } from '../components/Illustrations';
import InfoTooltip from '../components/InfoTooltip';
import SvgBarSparkline from '../components/SvgBarSparkline';
import FatigueTrendCard from '../components/FatigueTrendCard';
import BlockProgressCard from '../components/BlockProgressCard';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  getCompletedWorkoutSets, getAllWorkouts, getAllExercises, getAllMesocycles,
  getActiveInsights, dismissInsight, runInsightsEngine, getActivePlan,
  getAcuteChronicWorkload,
  getRecentWorkoutFeedback, getCurrentMesocycleWeek, getPlannedMuscleVolume,
} from '../lib/database';
import {
  calculateWeeklyVolume, VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES,
  calculate1RM, calculateTonnage, shouldDeload,
} from '../lib/algorithms';
import { logError } from '../lib/errorLog';

const { width: SCREEN_W } = Dimensions.get('window');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Severity → icon + color mapping (jargon-free UI)
const SEVERITY_STYLE = {
  0: { icon: 'information-circle-outline', color: colors.primary },
  1: { icon: 'alert-circle-outline',       color: colors.warning },
  2: { icon: 'warning-outline',            color: colors.error },
};

// Computes how many novel per-exercise 1RM bests occurred within each
// calendar week that falls inside [windowStart, now].
function computePRsPerWeek(allSets, exerciseMap, windowDays, now = Date.now()) {
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

// Returns volume status color for a muscle's current working-set count
function volumeDotColor(muscleKey, workingSets) {
  const lm = VOLUME_LANDMARKS[muscleKey];
  if (!lm) return colors.textMuted;
  if (workingSets === 0) return colors.border;
  if (workingSets < lm.mev) return volumeColors.below;
  if (workingSets <= lm.mav) return volumeColors.optimal;
  if (workingSets <= lm.mrv) return volumeColors.overMav;
  return volumeColors.overMrv;
}

export default function AnalyticsScreen({ navigation }) {
  const { user, units } = useAppStore(useShallow(s => ({ user: s.user, units: s.units })));

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
  const [workloadData, setWorkloadData] = useState(null);
  const [fatigueSessions, setFatigueSessions] = useState([]);   // last 6 sessions w/ feedback
  const [blockProgress, setBlockProgress]     = useState([]);   // planned vs actual per muscle
  // Year of Lifts is gated until the user has 365 days of training
  // history (or close to it) so the swipeable wrap-up has enough data
  // to be meaningful rather than nine months of empty bars.
  // earliestWorkoutAt is set in load() from the oldest completed
  // workout's started_at, and the locked state derives from it.
  const [earliestWorkoutAt, setEarliestWorkoutAt] = useState(null);
  const [currentMesoWeek, setCurrentMesoWeek] = useState(null); // {weekIndex, plannedWeeks, isDeload, rirTarget}

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

  useFocusEffect(useCallback(() => { load(); }, [user?.id]));

  async function load() {
    if (!user?.id) return;
    try {
      const [workouts, sets, exercises] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
      ]);
      const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
      setAllSets(sets);
      setExerciseMap(exMap);
      // Earliest completed workout — drives Year of Lifts unlock.
      // Comparing started_at across workouts is fine since values
      // are ms-epoch integers.
      const completed = (workouts || []).filter(w => w.isCompleted && w.startedAt);
      const earliest = completed.length
        ? completed.reduce((m, w) => (w.startedAt < m ? w.startedAt : m), completed[0].startedAt)
        : null;
      setEarliestWorkoutAt(earliest);

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

  async function loadMesocycle(workouts, sets, exMap) {
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
    const completedDays = new Set();
    for (const w of workouts) {
      if (!(w.isCompleted ?? w.is_completed ?? false)) continue;
      const at = w.startedAt ?? w.createdAt ?? w.created_at ?? 0;
      if (!at) continue;
      completedDays.add(Math.floor(at / DAY_MS));
    }
    // Build {date, count} for the last 84 days (12 weeks)
    const vals = [];
    for (let i = 0; i < 84; i++) {
      const day = Math.floor((now - i * DAY_MS) / DAY_MS);
      if (completedDays.has(day)) {
        vals.push({ date: new Date(day * DAY_MS).toISOString().slice(0, 10), count: 1 });
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ────────────────────────────────────────── */}
        <ScreenHeader title="Progress" />

        {/* ── Empty state ───────────────────────────────────── */}
        {!loading && allSets.length === 0 && (
          <View style={styles.emptyState}>
            <EmptyChartIllustration size={140} />
            <Text style={styles.emptyStateHeading}>No data yet</Text>
            <Text style={styles.emptyStateBody}>
              Your progress charts will appear here after your first few sessions. Log a workout to get started.
            </Text>
          </View>
        )}

        {/* ── 1 · Mesocycle Pulse Card ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>Training block</Text>
              <InfoTooltip text={
                'Training gets harder each week across the block, then a lighter recovery week lets your body catch up.\n\n' +
                'After the recovery week, a new block starts slightly heavier than the last. That is how you keep improving over months, not just weeks.'
              } />
            </View>
          </View>
          <MesocyclePulseCard
            meso={activeMeso}
            currentWeek={mesoCurrentWeek()}
            progress={mesoProgress()}
            tonnageBars={mesoTonnage}
            onPress={() => navigation.getParent()?.navigate('PlansTab', { screen: 'MesocycleBuilder', initial: false })}
            onBuild={() => navigation.getParent()?.navigate('PlansTab', { screen: 'PlanLibrary', initial: false })}
          />

          {/* Training trend (last 6 sessions' fatigue) — moved from Train tab */}
          <FatigueTrendCard sessions={fatigueSessions} />

          {/* This week's planned vs actual volume per muscle — moved from Train tab */}
          <BlockProgressCard
            blockProgress={blockProgress}
            currentMesoWeek={currentMesoWeek}
          />
        </View>

        {/* ── Lighter week banner ──────────────────────────────── */}
        {deloadAlert && (
          <View style={styles.deloadBanner}>
            <Ionicons name="moon-outline" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deloadTitle}>Lighter week recommended</Text>
              <Text style={styles.deloadSub}>
                {deloadAlert.reasons?.[0] ?? 'Your body is signalling it needs a recovery week.'}
              </Text>
            </View>
            <InfoTooltip text={
              'A lighter recovery week means keeping the same exercises but dropping the weights by around 10–20%. ' +
              'Stop well before failure. Sessions should feel almost too easy.\n\n' +
              'This gives your body a chance to recover and absorb all the work you have been putting in.\n\n' +
              'Most people feel noticeably stronger in the first session back after a proper recovery week.'
            } size={13} />
          </View>
        )}

        {/* ── 2 · Insight Stack ─────────────────────────────── */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>For you</Text>
            {insights.map(ins => (
              <InsightRow key={ins.id} insight={ins} onDismiss={() => handleDismiss(ins.id)} />
            ))}
          </View>
        )}

        {/* ── 3 · Volume Snapshot ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>This week's volume</Text>
              <InfoTooltip text={
                'Sets per muscle group this week.\n\n' +
                'Low: add a set or two next week.\n' +
                'Good range: keep it here.\n' +
                'High: dial it back next week.\n\n' +
                'Targets adjust over time as Volyume learns how you recover.'
              } />
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('VolumeHeatmap')}>
              <Text style={styles.seeAll}>Full view</Text>
            </TouchableOpacity>
          </View>
          <VolumeSnapshotGrid volume={weeklyVolume} />
        </View>

        {/* ── 3b · Training Load (ACWR) ─────────────────────── */}
        {workloadData && workloadData.ratio !== null && (
          <View style={styles.section}>
            <WorkloadCard data={workloadData} />
          </View>
        )}

        {/* ── 3d · Session Length Trend ─────────────────────── */}
        {durationBars.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>Session length trend</Text>
            </View>
            <SessionDurationChart bars={durationBars} />
          </View>
        )}

        {/* ── 3e · Training Frequency ───────────────────────── */}
        {muscleFreq.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>Training frequency</Text>
              <InfoTooltip text="How many sessions included each muscle group this week vs last." />
            </View>
            <MuscleFrequencyTable
              rows={muscleFreq}
              showAll={showAllMuscles}
              onToggle={() => setShowAllMuscles(v => !v)}
            />
          </View>
        )}

        {/* ── 4 · PR Rate Sparkline ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>New personal bests</Text>
            </View>
            <TouchableOpacity
              style={styles.windowToggle}
              onPress={handlePrWindowToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.windowToggleText}>{prWindow}d</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <PRSparkline bars={prBars} windowDays={prWindow} />
        </View>

        {/* ── 5 · Training Day Calendar ─────────────────────── */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={styles.sectionLabel}>Training days (last 12 weeks)</Text>
          </View>
          <TrainingCalendar values={calValues} />
        </View>

        {/* ── 6 · Recent Sessions Strip ─────────────────────── */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>Recent sessions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
                <Text style={styles.seeAll}>All sessions</Text>
              </TouchableOpacity>
            </View>
            {recentSessions.map(w => (
              <SessionCard key={w.id} workout={w} units={units} />
            ))}
          </View>
        )}

        {/* ── Quick nav tiles ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explore</Text>
          <View style={styles.navGrid}>
            <NavTile icon="trophy" color={colors.gold} label="Personal Records" onPress={() => navigation.navigate('PRWall')} />
            <NavTile icon="barbell" color={colors.primary} label="Lift Progress" onPress={() => navigation.navigate('ExerciseLibrary')} />
            <NavTile icon="time" color={colors.textSecondary} label="Full History" onPress={() => navigation.navigate('WorkoutHistory')} />
            {(() => {
              // Year of Lifts unlocks once the user has 365 days of
              // training history. Until then it shows a locked state
              // with the remaining days so the user has a concrete
              // milestone to look forward to.
              const YEAR_MS = 365 * 86400000;
              const elapsed = earliestWorkoutAt ? Date.now() - earliestWorkoutAt : 0;
              const unlocked = elapsed >= YEAR_MS;
              const daysLeft = earliestWorkoutAt
                ? Math.max(0, Math.ceil((YEAR_MS - elapsed) / 86400000))
                : 365;
              return (
                <NavTile
                  icon="calendar-outline"
                  color={colors.textSecondary}
                  label="Year of Lifts"
                  locked={!unlocked}
                  lockedSub={
                    earliestWorkoutAt
                      ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`
                      : 'Start training to unlock'
                  }
                  onPress={() => {
                    if (!unlocked) {
                      Alert.alert(
                        'Year of Lifts',
                        earliestWorkoutAt
                          ? `Your wrap-up unlocks after a full year of training. ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go.`
                          : 'Log your first session to start the year-long countdown.',
                      );
                      return;
                    }
                    navigation.navigate('YearOfLifts');
                  }}
                />
              );
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MesocyclePulseCard({ meso, currentWeek, progress, tonnageBars, onPress, onBuild }) {
  const progWidth = `${Math.round(progress * 100)}%`;

  if (!meso) {
    return (
      <TouchableOpacity style={[styles.card, styles.mesoEmpty]} onPress={onBuild} activeOpacity={0.8}>
        <Ionicons name="layers-outline" size={32} color={colors.primaryDim} />
        <Text style={styles.mesoEmptyTitle}>No active plan</Text>
        <Text style={styles.mesoEmptySub}>Browse the plan library or build your own. Your progress will appear right here once you start.</Text>
        <View style={styles.mesoEmptyBtn}>
          <Text style={styles.mesoEmptyBtnText}>Browse plans</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const isPlan = meso._isPlan;

  return (
    <TouchableOpacity style={[styles.card, styles.mesoCard]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.mesoTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.mesoName} numberOfLines={1}>{meso.name ?? 'Training Block'}</Text>
          <Text style={styles.mesoWeek}>
            {isPlan
              ? (meso.splitType ? meso.splitType : 'Active plan')
              : `Week ${currentWeek}${meso.durationWeeks ? ` of ${meso.durationWeeks}` : ''}${meso.focus ? `  ·  ${meso.focus}` : ''}`
            }
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>

      {/* Progress bar — only for mesocycles with a known duration */}
      {!isPlan && meso.durationWeeks > 0 && (
        <>
          <View style={styles.mesoProgressTrack}>
            <View style={[styles.mesoProgressFill, { width: progWidth }]} />
          </View>
          <Text style={styles.mesoProgressLabel}>{Math.round(progress * 100)}% complete</Text>
        </>
      )}

      {/* Tonnage sparkline — shared SvgBarSparkline style across the app */}
      {tonnageBars.some(b => b.value > 0) && (
        <View style={styles.sparkWrap}>
          <View style={styles.sparkLabelRow}>
            <Text style={styles.sparkLabel}>Weekly load</Text>
            <Text style={styles.sparkValue}>
              {(tonnageBars[tonnageBars.length - 1]?.value ?? 0).toLocaleString('en-GB')} kg
            </Text>
          </View>
          <View style={styles.sparkChartCentered}>
            <SvgBarSparkline
              data={tonnageBars}
              width={240}
              height={56}
              barWidth={36}
              barGap={12}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function InsightRow({ insight, onDismiss }) {
  const sev = SEVERITY_STYLE[insight.severity ?? 0] ?? SEVERITY_STYLE[0];
  return (
    <View style={[styles.insightRow, { borderLeftColor: sev.color }]}>
      <Ionicons name={sev.icon} size={18} color={sev.color} style={{ marginTop: 1 }} />
      <Text style={styles.insightCopy} numberOfLines={3}>{insight.copy}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.insightDismiss}
      >
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const MUSCLES = Object.keys(VOLUME_LANDMARKS);

function VolumeSnapshotGrid({ volume }) {
  return (
    <View style={styles.volGrid}>
      {MUSCLES.map(m => {
        const ws = volume[m]?.workingSets ?? 0;
        const dot = volumeDotColor(m, ws);
        return (
          <View key={m} style={styles.volCell}>
            <View style={[styles.volDot, { backgroundColor: dot }]} />
            <Text style={styles.volMuscle}>{MUSCLE_DISPLAY_NAMES[m]}</Text>
            <Text style={styles.volSets}>{ws > 0 ? `${ws} sets` : '0'}</Text>
          </View>
        );
      })}
      <View style={styles.volLegend}>
        <View style={styles.volLegendItem}>
          <View style={[styles.volLegendDot, { backgroundColor: '#F97316' }]} />
          <Text style={styles.volLegendText}>Below target</Text>
        </View>
        <View style={styles.volLegendItem}>
          <View style={[styles.volLegendDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.volLegendText}>Good</Text>
        </View>
        <View style={styles.volLegendItem}>
          <View style={[styles.volLegendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.volLegendText}>Over max</Text>
        </View>
      </View>
    </View>
  );
}

function PRSparkline({ bars, windowDays }) {
  const total = bars.reduce((s, b) => s + b.value, 0);
  if (total === 0) {
    return (
      <View style={styles.prEmpty}>
        <Text style={styles.prEmptyText}>No new bests in the last {windowDays} days. Keep pushing.</Text>
      </View>
    );
  }
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const BAR_MAX_H = 56;
  return (
    <View style={styles.prWrap}>
      <Text style={styles.prTotal}>{total} new bests in {windowDays} days</Text>
      <View style={styles.prBarsRow}>
        {bars.map((bar, i) => {
          const barH = bar.value > 0
            ? Math.max(8, Math.round((bar.value / maxVal) * BAR_MAX_H))
            : 3;
          return (
            <View key={i} style={styles.prBarCol}>
              <View style={[
                styles.prBar,
                {
                  height: barH,
                  backgroundColor: bar.value > 0 ? colors.gold : colors.surface3,
                },
              ]} />
              {bar.value > 0 && (
                <Text style={styles.prBarCount}>{bar.value}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TrainingCalendar({ values }) {
  const trainedDates = new Set(values.map(v => v.date));
  const trainedCount = values.length;
  const today = new Date();
  // Build 84 days oldest→newest, grouped into 12 weeks of 7 days
  const SQ = Math.max(10, Math.floor((SCREEN_W - 90) / 14)); // square size
  const weeks = Array.from({ length: 12 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const dayOffset = 83 - (wi * 7 + di);
      const d = new Date(today.getTime() - dayOffset * 86400000);
      return trainedDates.has(d.toISOString().slice(0, 10));
    }),
  );
  return (
    <View style={styles.calWrap}>
      <View style={styles.calGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calCol}>
            {week.map((trained, di) => (
              <View
                key={di}
                style={{
                  width: SQ, height: SQ, borderRadius: 2,
                  backgroundColor: trained ? colors.primary : colors.surface2,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.calLegend}>
        <View style={[styles.calDot, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]} />
        <Text style={styles.calLegendText}>Rest</Text>
        <View style={[styles.calDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.calLegendText}>Trained</Text>
        <Text style={[styles.calLegendText, { marginLeft: 'auto' }]}>{trainedCount} days trained</Text>
      </View>
    </View>
  );
}

function SessionCard({ workout, units }) {
  const name = workout.name || 'Session';
  const at = workout.startedAt ?? workout.createdAt ?? workout.created_at ?? 0;
  const diff = workout.sessionDifficulty ?? null;
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionLeft}>
        <Text style={styles.sessionName} numberOfLines={1}>{name}</Text>
        <Text style={styles.sessionMeta}>
          {at ? format(new Date(at), 'EEE d MMM') : ''}
          {workout.durationMinutes ? ` · ${workout.durationMinutes}m` : ''}
        </Text>
      </View>
      {diff != null && (
        <View style={[styles.diffChip, { backgroundColor: diffChipBg(diff) }]}>
          <Text style={[styles.diffText, { color: diffChipColor(diff) }]}>
            {diff}/10
          </Text>
        </View>
      )}
    </View>
  );
}

function NavTile({ icon, color, label, onPress, locked, lockedSub }) {
  // When locked, the tile is dimmed and onPress fires an inline
  // explanation rather than navigating. Used for features that need
  // accumulated training data (e.g. Year of Lifts needs a year).
  return (
    <TouchableOpacity
      style={[styles.navTile, locked && styles.navTileLocked]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}. Locked. ${lockedSub ?? ''}` : label}
      accessibilityState={{ disabled: !!locked }}
    >
      <Ionicons
        name={locked ? 'lock-closed-outline' : icon}
        size={22}
        color={locked ? colors.textMuted : color}
      />
      <Text style={[styles.navTileLabel, locked && styles.navTileLabelLocked]}>{label}</Text>
      {locked && lockedSub ? (
        <Text style={styles.navTileSub} numberOfLines={1}>{lockedSub}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function SessionDurationChart({ bars }) {
  const BAR_MAX_H = 40;
  const BAR_W = 20;
  const durations = bars.map(b => b.avgMin).filter(v => v > 0);
  const maxDur = durations.length > 0 ? Math.max(...durations) : 1;

  // Coaching line: compare last 3 bars with a recorded avg
  const recent = bars.filter(b => b.avgMin > 0);
  let coachingLine = 'Consistent session lengths.';
  if (recent.length >= 3) {
    const last = recent.slice(-3).map(b => b.avgMin);
    const isDown = last[2] < last[0] - 5;
    if (isDown) coachingLine = 'Sessions getting shorter. Might be fatigue.';
  }

  function barColor(avgMin) {
    if (avgMin <= 0) return colors.surface2;
    if (avgMin < 45) return colors.textMuted;
    if (avgMin <= 75) return colors.success;
    return colors.warning;
  }

  return (
    <View style={styles.durationWrap}>
      <View style={styles.durationBarsRow}>
        {bars.map((bar, i) => {
          const barH = bar.avgMin > 0
            ? Math.max(4, Math.round((bar.avgMin / maxDur) * BAR_MAX_H))
            : 4;
          return (
            <View key={i} style={styles.durationBarCol}>
              <View style={[
                styles.durationBar,
                { height: barH, width: BAR_W, backgroundColor: barColor(bar.avgMin) },
              ]} />
              {bar.avgMin > 0 && (
                <Text style={styles.durationBarValue}>{bar.avgMin}m</Text>
              )}
              <Text style={styles.durationBarLabel}>{bar.weekLabel}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.durationCoach}>{coachingLine}</Text>
    </View>
  );
}

const FREQ_MAX_DISPLAY = 8;

function MuscleFrequencyTable({ rows, showAll, onToggle }) {
  const visible = showAll ? rows : rows.slice(0, FREQ_MAX_DISPLAY);
  const hasMore = rows.length > FREQ_MAX_DISPLAY;

  return (
    <View style={styles.freqWrap}>
      {visible.map(({ muscle, thisWeek, lastWeek }) => (
        <View key={muscle} style={styles.freqRow}>
          <Text style={styles.freqMuscle} numberOfLines={1}>
            {MUSCLE_DISPLAY_NAMES[muscle] ?? muscle}
          </Text>
          <Text style={styles.freqCounts}>
            <Text style={[styles.freqCountBold, thisWeek > lastWeek && styles.freqCountUp]}>
              {thisWeek}
            </Text>
            <Text style={styles.freqDivider}> this · </Text>
            <Text style={styles.freqLastWeek}>{lastWeek} last</Text>
          </Text>
        </View>
      ))}
      {hasMore && (
        <TouchableOpacity
          style={styles.freqToggle}
          onPress={onToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.freqToggleText}>
            {showAll ? 'Show less' : `Show all (${rows.length})`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function WorkloadCard({ data }) {
  if (!data || data.ratio === null) return null;

  const { acute, chronic, ratio } = data;

  let statusColor = colors.textMuted;
  let statusText = 'Below training average. Consider more volume.';
  if (ratio >= 1.5) {
    statusColor = colors.error;
    statusText = 'High load this week. Consider an easier session.';
  } else if (ratio >= 1.3) {
    statusColor = colors.warning;
    statusText = 'Load is elevated. Monitor how you feel.';
  } else if (ratio >= 0.8) {
    statusColor = colors.success;
    statusText = 'Load is in the optimal training zone.';
  }

  // Simple visual bar: fill proportional to ratio, capped at 2.0
  const fillPct = Math.min(ratio / 2.0, 1);

  return (
    <View style={styles.workloadCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.workloadTitle}>Training load</Text>
        <InfoTooltip text="Compares this week's tonnage to your recent average. 0.8–1.3 is the optimal range. Above 1.5 signals high fatigue risk." />
      </View>

      <View style={styles.workloadBarBg}>
        <View style={[styles.workloadBarFill, { width: `${Math.round(fillPct * 100)}%`, backgroundColor: statusColor }]} />
        {/* Optimal zone marker at 0.8 and 1.3 */}
      </View>

      <View style={styles.workloadStats}>
        <View style={styles.workloadStat}>
          <Text style={styles.workloadStatValue}>{(ratio).toFixed(2)}</Text>
          <Text style={styles.workloadStatLabel}>Ratio</Text>
        </View>
        <View style={styles.workloadStat}>
          <Text style={styles.workloadStatValue}>{acute.toLocaleString('en-GB')}</Text>
          <Text style={styles.workloadStatLabel}>This week (kg)</Text>
        </View>
        <View style={styles.workloadStat}>
          <Text style={styles.workloadStatValue}>{chronic.toLocaleString('en-GB')}</Text>
          <Text style={styles.workloadStatLabel}>4-wk avg (kg)</Text>
        </View>
      </View>

      <Text style={[styles.workloadStatus, { color: statusColor }]}>{statusText}</Text>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diffChipBg(d) {
  if (d >= 8) return colors.errorBg;
  if (d >= 6) return colors.warningBg;
  return colors.surface2;
}
function diffChipColor(d) {
  if (d >= 8) return colors.error;
  if (d >= 6) return colors.warning;
  return colors.textSecondary;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  content:     { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },

  section:     { gap: spacing.md },
  sectionLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, letterSpacing: 0.2,
  },
  rowBetween:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll:      { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ── Mesocycle card ──
  mesoCard:         { gap: spacing.md },
  mesoEmpty:        { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  mesoEmptyTitle:   { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  mesoEmptySub:     { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  mesoEmptyBtn:     {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.primary, marginTop: spacing.xs,
  },
  mesoEmptyBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  mesoTop:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  mesoName:         { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, flex: 1 },
  mesoWeek:         { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  mesoProgressTrack: {
    height: 4, borderRadius: radius.full,
    backgroundColor: colors.surface2, overflow: 'hidden',
  },
  mesoProgressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  mesoProgressLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  sparkWrap:           { marginTop: spacing.xs },
  sparkLabelRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.xs },
  sparkLabel:          { fontSize: fontSize.xs, color: colors.textMuted },
  sparkValue:          { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  sparkChartCentered:  { alignItems: 'center', paddingTop: spacing.xs },

  // ── Insight rows ──
  insightRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3,
  },
  insightCopy:    { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  insightDismiss: { padding: 2 },

  // ── Volume snapshot ──
  volGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  volCell:   { width: '30%', alignItems: 'center', gap: 4, paddingVertical: spacing.xs },
  volDot:    { width: 10, height: 10, borderRadius: 5 },
  volMuscle: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  volSets:   { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  volLegend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  volLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volLegendDot: { width: 8, height: 8, borderRadius: 4 },
  volLegendText: { fontSize: 9, color: colors.textMuted },

  // ── PR Sparkline ──
  windowToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.primary,
  },
  windowToggleText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  prWrap:    { gap: spacing.sm },
  prTotal:   { fontSize: fontSize.xs, color: colors.textMuted },
  prBarsRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 60,
  },
  prBarCol:  { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  prBar:     { width: '100%', borderRadius: 2 },
  prBarCount: { fontSize: 8, color: colors.gold, marginTop: 2, fontWeight: '700' },
  prEmpty:   {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  prEmptyText: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },

  // ── Calendar ──
  calWrap: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  calGrid:       { flexDirection: 'row', gap: 3 },
  calCol:        { flex: 1, gap: 3 },
  calLegend:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  calDot:        { width: 10, height: 10, borderRadius: 2 },
  calLegendText: { fontSize: fontSize.xs, color: colors.textMuted },

  // ── Recent sessions ──
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  sessionLeft:  { flex: 1 },
  sessionName:  { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sessionMeta:  { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  diffChip:     { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 3 },
  diffText:     { fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  // ── Nav tiles ──
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  navTile: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  navTileLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, textAlign: 'center',
  },
  // Locked tile variant — used while accumulating training data needed
  // for a feature (e.g. Year of Lifts requires 365 days of history).
  navTileLocked: { opacity: 0.55 },
  navTileLabelLocked: { color: colors.textMuted },
  navTileSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.warning + '60',
    padding: spacing.lg,
  },
  deloadTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.warning, marginBottom: 2,
  },
  deloadSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },

  // ── Session Duration Trend ──
  durationWrap: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  durationBarsRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    height: 72,
  },
  durationBarCol: {
    alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xxs,
  },
  durationBar: {
    borderRadius: 3,
  },
  durationBarValue: {
    fontSize: 9, color: colors.textSecondary, fontWeight: fontWeight.semibold,
  },
  durationBarLabel: {
    fontSize: 9, color: colors.textMuted,
  },
  durationCoach: {
    fontSize: fontSize.xs, color: colors.textSecondary,
    lineHeight: 17, fontStyle: 'italic',
  },

  // ── Muscle Frequency Table ──
  freqWrap: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: spacing.xxs,
  },
  freqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.border + '60',
  },
  freqMuscle: {
    fontSize: fontSize.sm, color: colors.textPrimary,
    fontWeight: fontWeight.medium, flex: 1,
  },
  freqCounts: {
    fontSize: fontSize.xs, color: colors.textSecondary,
  },
  freqCountBold: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  freqCountUp: {
    color: colors.success,
  },
  freqDivider: {
    color: colors.textMuted,
  },
  freqLastWeek: {
    color: colors.textMuted,
  },
  freqToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', marginTop: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  freqToggleText: {
    fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium,
  },

  // ── Workload Card (ACWR) ──
  workloadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  workloadTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  workloadBarBg: {
    height: 8,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  workloadBarFill: {
    height: 8,
    borderRadius: radius.sm,
  },
  workloadStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workloadStat: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  workloadStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  workloadStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  workloadStatus: {
    fontSize: fontSize.xs,
    lineHeight: 17,
  },

  // ── Analytics empty state ──
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: spacing.md,
  },
  emptyStateHeading: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
