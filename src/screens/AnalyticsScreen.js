import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, subDays } from 'date-fns';
import { BarChart } from 'react-native-gifted-charts';
import CalendarHeatmap from 'react-native-calendar-heatmap';

import { colors, fontSize, fontWeight, spacing, radius, volumeColors, motion } from '../styles/theme';
import { BrandTag } from '../components/BrandMark';
import useAppStore from '../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllWorkouts, getAllExercises, getAllMesocycles,
  getActiveInsights, dismissInsight, runInsightsEngine, getActivePlan,
} from '../lib/database';
import {
  calculateWeeklyVolume, VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES,
  calculate1RM, calculateTonnage, shouldDeload,
} from '../lib/algorithms';

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
  const { user, units } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);

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
  const [deloadAlert, setDeloadAlert]       = useState(null); // { deload: true, reasons: [] }

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

      await Promise.all([
        loadMesocycle(workouts, sets, exMap),
        loadInsights(),
        loadVolumeSnapshot(sets, exMap),
        loadDeloadCheck(sets, exMap, workouts),
        loadPRBars(sets, exMap, 30),
        loadCalendar(workouts),
        loadRecentSessions(workouts),
      ]);
    } catch (e) {
      console.error('AnalyticsScreen load:', e);
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

      // Build weekly tonnage sparkline: last 4 weeks
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
          frontColor: wk === 0 ? colors.primary : colors.primaryDim,
        });
      }
      setMesoTonnage(bars);
    } catch (_) {}
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
        const avgReps = wkSets.length > 0
          ? wkSets.reduce((sum, s) => sum + (s.actualReps ?? s.actual_reps ?? 0), 0) / wkSets.length
          : 0;
        // Estimate weeks since last lighter week: scan backwards for a low-volume week (< 15 total working sets)
        last4.push({ avgReps, avgSoreness, hasOverMRV, weeksSinceLastDeload: 4 - wk });
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
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Progress</Text>
          <BrandTag size={13} color={colors.textMuted} />
        </View>

        {/* ── 1 · Mesocycle Pulse Card ───────────────────────── */}
        <MesocyclePulseCard
          meso={activeMeso}
          currentWeek={mesoCurrentWeek()}
          progress={mesoProgress()}
          tonnageBars={mesoTonnage}
          onPress={() => activeMeso?._isPlan
            ? navigation.getParent()?.navigate('PlansTab')
            : navigation.navigate('MesocycleBuilder')}
          onBuild={() => navigation.getParent()?.navigate('PlansTab', { screen: 'CoachBuilder' })}
        />

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
          </View>
        )}

        {/* ── 2 · Insight Stack ─────────────────────────────── */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FOR YOU</Text>
            {insights.map(ins => (
              <InsightRow key={ins.id} insight={ins} onDismiss={() => handleDismiss(ins.id)} />
            ))}
          </View>
        )}

        {/* ── 3 · Volume Snapshot ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>THIS WEEK'S VOLUME</Text>
            <TouchableOpacity onPress={() => navigation.navigate('VolumeHeatmap')}>
              <Text style={styles.seeAll}>Full view</Text>
            </TouchableOpacity>
          </View>
          <VolumeSnapshotGrid volume={weeklyVolume} />
        </View>

        {/* ── 4 · PR Rate Sparkline ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>NEW BESTS</Text>
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
          <Text style={styles.sectionLabel}>TRAINING DAYS — LAST 12 WEEKS</Text>
          <TrainingCalendar values={calValues} />
        </View>

        {/* ── 6 · Recent Sessions Strip ─────────────────────── */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>
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
          <Text style={styles.sectionLabel}>EXPLORE</Text>
          <View style={styles.navGrid}>
            <NavTile icon="trophy" color={colors.gold} label="Personal Records" onPress={() => navigation.navigate('PRWall')} />
            <NavTile icon="body" color={colors.success} label="Body Metrics" onPress={() => navigation.navigate('BodyMetrics')} />
            <NavTile icon="barbell" color={colors.primary} label="Lift Progress" onPress={() => navigation.navigate('ExerciseLibrary')} />
            <NavTile icon="time" color={colors.textSecondary} label="Full History" onPress={() => navigation.navigate('WorkoutHistory')} />
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
        <Text style={styles.mesoEmptyTitle}>No training block active</Text>
        <Text style={styles.mesoEmptySub}>Generate a structured plan to track your block progress here.</Text>
        <View style={styles.mesoEmptyBtn}>
          <Text style={styles.mesoEmptyBtnText}>Build a plan</Text>
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

      {/* Tonnage sparkline */}
      {tonnageBars.some(b => b.value > 0) && (
        <View style={styles.sparkWrap}>
          <Text style={styles.sparkLabel}>Weekly load (kg moved)</Text>
          <BarChart
            data={tonnageBars}
            barWidth={28}
            spacing={10}
            roundedTop
            hideRules
            hideAxesAndRules
            noOfSections={3}
            height={56}
            barBorderRadius={3}
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ display: 'none' }}
            xAxisLabelTextStyle={styles.barAxisLabel}
            isAnimated
          />
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
            <Text style={styles.volSets}>{ws > 0 ? `${ws}s` : '—'}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PRSparkline({ bars, windowDays }) {
  const total = bars.reduce((s, b) => s + b.value, 0);
  if (total === 0) {
    return (
      <View style={styles.prEmpty}>
        <Text style={styles.prEmptyText}>No new bests in the last {windowDays} days — keep pushing the limits.</Text>
      </View>
    );
  }
  return (
    <View style={styles.prWrap}>
      <Text style={styles.prTotal}>{total} new bests in {windowDays} days</Text>
      <BarChart
        data={bars}
        barWidth={Math.max(12, Math.floor((SCREEN_W - 80) / bars.length - 8))}
        spacing={4}
        roundedTop
        hideAxesAndRules
        noOfSections={3}
        height={64}
        barBorderRadius={3}
        isAnimated
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={{ display: 'none' }}
        xAxisLabelTextStyle={styles.barAxisLabel}
      />
    </View>
  );
}

function TrainingCalendar({ values }) {
  const endDate = new Date();
  const startDate = subDays(endDate, 83);
  return (
    <View style={styles.calWrap}>
      <CalendarHeatmap
        values={values}
        startDate={startDate}
        endDate={endDate}
        colorArray={[colors.surface2, colors.primary]}
        gutterSize={3}
        horizontal
        showMonthLabels={false}
        squareSize={10}
      />
      <View style={styles.calLegend}>
        <View style={[styles.calDot, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]} />
        <Text style={styles.calLegendText}>Rest</Text>
        <View style={[styles.calDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.calLegendText}>Trained</Text>
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

function NavTile({ icon, color, label, onPress }) {
  return (
    <TouchableOpacity style={styles.navTile} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.navTileLabel}>{label}</Text>
    </TouchableOpacity>
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
  content:     { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },

  section:     { gap: spacing.md },
  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black,
    color: colors.textMuted, letterSpacing: 1.5,
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
  sparkWrap:        { marginTop: spacing.xs },
  sparkLabel:       { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  barAxisLabel:     { fontSize: 9, color: colors.textMuted },

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

  // ── PR Sparkline ──
  windowToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.primary,
  },
  windowToggleText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  prWrap:    { gap: spacing.xs },
  prTotal:   { fontSize: fontSize.xs, color: colors.textMuted },
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
});
