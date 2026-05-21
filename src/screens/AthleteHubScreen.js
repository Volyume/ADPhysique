import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, differenceInDays } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, shadow } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import InfoTooltip from '../components/InfoTooltip';
import { ProBadge } from '../components/ProGate';
import { SkeletonCard } from '../components/Skeleton';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { formatBodyWeightShort } from '../lib/units';
import {
  getAllWorkouts, getCompletedWorkoutSets, getBodyMetricLog, getNutritionTargets,
  getRecentAdaptationEvents, getAllExercises,
  getLatestCheckin, getMorningWeightsLast14Days, getRecentCheckins,
  getLastTrainedPerMuscle, getLatestBodyWeight,
} from '../lib/database';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { computeEWMA } from '../lib/weeklyCoach';
import { LineChart } from 'react-native-gifted-charts';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getWellbeingMode, isCalm } from '../lib/wellbeing';

const { width: SCREEN_W } = Dimensions.get('window');

const MILESTONES = [
  { sessions: 1,    label: 'First session',      icon: 'star-outline' },
  { sessions: 10,   label: '10 sessions',         icon: 'fitness-outline' },
  { sessions: 25,   label: '25 sessions',         icon: 'flash-outline' },
  { sessions: 50,   label: '50 sessions',         icon: 'trophy-outline' },
  { sessions: 100,  label: '100 sessions',        icon: 'trophy' },
  { sessions: 250,  label: '250 sessions',        icon: 'medal-outline' },
  { sessions: 500,  label: '500 sessions',        icon: 'ribbon-outline' },
];

function nextMilestone(total) {
  return MILESTONES.find(m => m.sessions > total) ?? null;
}

// Detects exercises with 2+ consecutive weeks of declining average reps (≥2 rep drop each week).
function detectRepRegressions(sets, exerciseMap) {
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const byExerciseWeek = {};
  for (const set of sets) {
    if ((set.setType ?? set.set_type) === 'warmup') continue;
    const ts = set.createdAt ?? set.created_at ?? 0;
    const weeksAgo = Math.floor((now - ts) / WEEK_MS);
    if (weeksAgo > 2) continue;
    const exId = set.exerciseId ?? set.exercise_id;
    if (!exId) continue;
    if (!byExerciseWeek[exId]) byExerciseWeek[exId] = {};
    if (!byExerciseWeek[exId][weeksAgo]) byExerciseWeek[exId][weeksAgo] = [];
    byExerciseWeek[exId][weeksAgo].push(set);
  }
  const warnings = [];
  for (const [exId, weeks] of Object.entries(byExerciseWeek)) {
    const w0 = weeks[0] ?? []; // this week
    const w1 = weeks[1] ?? []; // last week
    const w2 = weeks[2] ?? []; // two weeks ago
    if (w0.length < 2 || w1.length < 2 || w2.length < 2) continue;
    const avg = arr => arr.reduce((s, x) => s + (x.actualReps ?? x.actual_reps ?? 0), 0) / arr.length;
    const r0 = avg(w0); const r1 = avg(w1); const r2 = avg(w2);
    if (r1 - r0 >= 2 && r2 - r1 >= 2) {
      const ex = exerciseMap?.[exId];
      warnings.push({
        id: `reg_${exId}`,
        exercise_id: exId,
        exerciseName: ex?.name ?? 'Unknown exercise',
        muscle: ex?.primaryMuscle ?? ex?.primary_muscle ?? null,
        reason_text: `Avg reps: ${Math.round(r2 * 10) / 10} → ${Math.round(r1 * 10) / 10} → ${Math.round(r0 * 10) / 10} over 3 weeks. Consider dropping the weight slightly or taking a lighter week.`,
        decision: 'rep_regression',
        created_at: now,
      });
    }
  }
  return warnings;
}

// ─── Weight sparkline ─────────────────────────────────────────────────────────

function WeightSparkline({ data, units, bodyWeightUnits }) {
  const bwu = bodyWeightUnits || 'st';
  const CHART_W = SCREEN_W - 72;
  const ewmaPoints = data.map(d => ({ value: d.ewmaKg }));
  const rawPoints  = data.map(d => ({ value: d.rawKg }));
  const allVals    = data.flatMap(d => [d.rawKg, d.ewmaKg]).filter(Boolean);
  const minVal     = Math.min(...allVals);
  const maxVal     = Math.max(...allVals);
  const latest     = data[data.length - 1];

  return (
    <View style={styles.sparklineWrap}>
      <LineChart
        data={ewmaPoints}
        data2={rawPoints}
        width={CHART_W}
        height={72}
        color={colors.primary}
        color2={`${colors.textMuted}66`}
        thickness={2}
        thickness2={1}
        dataPointsRadius={0}
        dataPointsRadius2={2.5}
        dataPointsColor2={`${colors.textMuted}66`}
        hideDataPoints
        curved
        areaChart
        startFillColor={colors.primary}
        endFillColor={colors.primary}
        startOpacity={0.12}
        endOpacity={0}
        initialSpacing={0}
        endSpacing={4}
        hideYAxisText
        hideAxesAndRules
        maxValue={maxVal + 0.5}
        minValue={minVal - 0.5}
        yAxisExtraHeight={8}
        scrollToEnd={false}
        disableScroll
      />
      {latest && (
        <View style={styles.sparklineLegend}>
          <View style={styles.sparklineLegendRow}>
            <View style={[styles.sparklineDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.sparklineLegendText}>Trend</Text>
            <Text style={styles.sparklineLegendVal}>{formatBodyWeightShort(latest.ewmaKg, bwu)}</Text>
          </View>
          <View style={styles.sparklineLegendRow}>
            <View style={[styles.sparklineDot, { backgroundColor: colors.textMuted }]} />
            <Text style={styles.sparklineLegendText}>Daily</Text>
            <Text style={styles.sparklineLegendVal}>{formatBodyWeightShort(latest.rawKg, bwu)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function freshnessMeta(lastTrainedAt, now) {
  if (!lastTrainedAt) return { label: 'Ready', color: colors.success, dot: colors.success };
  const hoursAgo = (now - lastTrainedAt) / (1000 * 60 * 60);
  if (hoursAgo < 24)  return { label: 'Just trained', color: colors.warning, dot: colors.warning };
  if (hoursAgo < 48)  return { label: 'Recovering',   color: colors.warning, dot: colors.warning };
  if (hoursAgo < 72)  return { label: 'Nearly ready',  color: colors.success, dot: colors.success + '99' };
  return { label: 'Ready', color: colors.success, dot: colors.success };
}

function MuscleFreshnessCard({ muscleFreshness, now }) {
  const entries = Object.entries(MUSCLE_DISPLAY_NAMES)
    .filter(([key]) => muscleFreshness[key] !== undefined)
    .map(([key, displayName]) => ({
      key,
      displayName,
      ...freshnessMeta(muscleFreshness[key], now),
    }))
    .sort((a, b) => {
      const order = { 'Just trained': 0, Recovering: 1, 'Nearly ready': 2, Ready: 3 };
      return (order[a.label] ?? 4) - (order[b.label] ?? 4);
    });

  if (entries.length === 0) return null;

  return (
    <View style={mfStyles.card}>
      <View style={mfStyles.headerRow}>
        <View style={[mfStyles.iconWrap, { backgroundColor: colors.primaryBg }]}>
          <Ionicons name="flash-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={mfStyles.title}>Muscle readiness</Text>
          <Text style={mfStyles.sub}>How recovered your muscles are based on your recent training.</Text>
        </View>
      </View>
      <View style={mfStyles.chipGrid}>
        {entries.map(({ key, displayName, label, color, dot }) => (
          <View key={key} style={[mfStyles.chip, { borderColor: color + '44', backgroundColor: color + '12' }]}>
            <View style={[mfStyles.dot, { backgroundColor: dot }]} />
            <Text style={[mfStyles.chipName, { color: colors.textPrimary }]}>{displayName}</Text>
            <Text style={[mfStyles.chipLabel, { color }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const mfStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16, marginTop: 2 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  chipName: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  chipLabel: { fontSize: 10, fontWeight: fontWeight.semibold },
});

export default function AthleteHubScreen({ navigation }) {
  const { user, userProfile, units, bodyWeightUnits, tier } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    units: s.units,
    bodyWeightUnits: s.bodyWeightUnits,
    tier: s.tier,
  })));
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [latestMetric, setLatestMetric]         = useState(null);
  const [refreshing, setRefreshing]             = useState(false);
  const [initialLoading, setInitialLoading]     = useState(true);
  const [totalWorkouts, setTotalWorkouts]       = useState(0);
  const [recovery, setRecovery]                 = useState({ soreness: null, fatigue: null, joint: null });
  const [weekVolume, setWeekVolume]             = useState(null);
  const [calm, setCalm]                         = useState(false);
  const [adaptationHistory, setAdaptationHistory] = useState([]);
  const [repWarnings, setRepWarnings] = useState([]);
  const [engineLogOpen, setEngineLogOpen] = useState(false);
  const [checkinDoneThisWeek, setCheckinDoneThisWeek] = useState(false);
  const [morningWeightCount, setMorningWeightCount] = useState(0);
  const [weightTrend, setWeightTrend] = useState([]);
  const [recoveryTrendInsight, setRecoveryTrendInsight] = useState(null);
  const [muscleFreshness, setMuscleFreshness] = useState({});

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

  // Covers the case where the screen is already focused when the local user
  // ID first becomes available (async bootstrap finishes after mount).
  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    if (user?.id) load();
    getWellbeingMode().then(m => setCalm(isCalm(m)));
  }, [user?.id]));

  async function load() {
    if (tier === 'pro') {
      try {
        const d = new Date();
        const daysFromMon = (d.getUTCDay() + 6) % 7;
        const monMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - daysFromMon * 86400000;
        const ci = await getLatestCheckin(user.id, monMs);
        setCheckinDoneThisWeek(!!ci);
        const weights = await getMorningWeightsLast14Days(user.id);
        setMorningWeightCount(weights.length);
        if (weights.length >= 3) {
          setWeightTrend(computeEWMA(weights, 0.2));
        }
      } catch (_) {}
    }

    await Promise.all([
      loadWorkoutStats(),
      ...(tier === 'pro' ? [loadBodyMetrics(), loadNutrition(), loadAdaptationHistory(), loadRecoveryTrend(), loadMuscleFreshness()] : []),
    ]);
    setInitialLoading(false);
  }

  async function loadRecoveryTrend() {
    if (!user?.id) return;
    try {
      const checkins = await getRecentCheckins(user.id, 6);
      if (checkins.length < 3) return;
      const insight = computeRecoveryTrendInsight(checkins);
      setRecoveryTrendInsight(insight);
    } catch (_) {}
  }

  function computeRecoveryTrendInsight(checkins) {
    // Checkins are in descending order (newest first)
    const energies = checkins.map(c => c.energyScore ?? null).filter(v => v !== null);
    const soreness = checkins.map(c => c.sorenessScore ?? null).filter(v => v !== null);
    if (energies.length < 3 && soreness.length < 3) return null;

    // Count consecutive weeks below/above threshold
    const recentEnergy = energies.slice(0, 4);
    const lowEnergyWeeks = recentEnergy.filter(e => e <= 2).length;
    const highEnergyWeeks = recentEnergy.filter(e => e >= 4).length;
    const recentSoreness = soreness.slice(0, 4);
    const highSorenessWeeks = recentSoreness.filter(s => s >= 4).length;

    if (lowEnergyWeeks >= 3) {
      return { type: 'warning', text: `Energy has been low for ${lowEnergyWeeks} check-ins in a row. That's worth paying attention to.` };
    }
    if (highSorenessWeeks >= 3) {
      return { type: 'warning', text: `High soreness has been reported ${highSorenessWeeks} weeks running. Recovery may need more attention.` };
    }
    if (highEnergyWeeks >= 3) {
      return { type: 'good', text: `Energy has been consistently high across the last ${highEnergyWeeks} check-ins. Good sign.` };
    }
    // Check improving trend
    if (energies.length >= 4) {
      const older = energies.slice(2, 4);
      const newer = energies.slice(0, 2);
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const newerAvg = newer.reduce((a, b) => a + b, 0) / newer.length;
      if (newerAvg - olderAvg >= 1) {
        return { type: 'good', text: 'Energy is trending upward over the last few weeks.' };
      }
      if (olderAvg - newerAvg >= 1) {
        return { type: 'warning', text: 'Energy has been trending lower over the last few weeks.' };
      }
    }
    return null;
  }

  async function loadAdaptationHistory() {
    if (!user?.id) return;
    try {
      const events = await getRecentAdaptationEvents(user.id, 4); // last 4 weeks
      setAdaptationHistory(events.slice(0, 12)); // show max 12 most recent
    } catch (_e) {}
  }

  async function loadMuscleFreshness() {
    if (!user?.id) return;
    try {
      const data = await getLastTrainedPerMuscle(user.id);
      setMuscleFreshness(data);
    } catch (_e) {}
  }

  async function loadWorkoutStats() {
    try {
      const [workouts, sets, exercises] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
      ]);
      const completed = workouts.filter(w =>
        (w.isCompleted ?? w.is_completed ?? false) &&
        (w.setCount ?? w.set_count ?? 0) > 0,
      );
      setTotalWorkouts(completed.length);

      // Recovery EMAs
      const ema = computeRecoveryEMAs(completed);
      setRecovery(ema);

      // Weekly volume (hard sets this week)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekSets = sets.filter(s =>
        (s.createdAt ?? s.created_at ?? 0) >= weekAgo && (s.setType ?? s.set_type) !== 'warmup',
      );
      setWeekVolume(weekSets.length);

      // Rep regression detection
      const exMap = Object.fromEntries(exercises.map(e => [e.id, e]));
      setRepWarnings(detectRepRegressions(sets, exMap));
    } catch (_e) {}
  }

  async function loadBodyMetrics() {
    try {
      // Prefer the full body_metric_log row (includes measurements / body fat).
      const rows = await getBodyMetricLog(user.id, 1);
      if (rows[0]) { setLatestMetric(rows[0]); return; }
      // Daily weigh-ins go to a separate morning_weights table — fall back to
      // whichever weight is most recent across both tables.
      const latest = await getLatestBodyWeight(user.id);
      if (latest?.weightKg != null) {
        setLatestMetric({ weightKg: latest.weightKg, loggedAt: latest.loggedAt });
        return;
      }
      if (userProfile?.weightKg) {
        setLatestMetric({ weightKg: userProfile.weightKg, loggedAt: null });
      }
    } catch (_e) {}
  }

  async function loadNutrition() {
    try {
      const t = await getNutritionTargets(user.id);
      if (t?.targetKcal) { setNutritionTargets(t); return; }
      // SQLite can be empty during the window between account creation and
      // migrateLocalUserId completing. Fall back to AsyncStorage.
      const raw = await AsyncStorage.getItem('@volyume_nutrition_targets');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.targetKcal) { setNutritionTargets(parsed); return; }
      }
      setNutritionTargets(null);
    } catch (_e) {}
  }

  const displayName = userProfile?.firstName
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'Athlete';

  const trainingAge = userProfile?.trainingAgeYears
    ? `${Math.floor(userProfile.trainingAgeYears)} yr${Math.floor(userProfile.trainingAgeYears) !== 1 ? 's' : ''} training`
    : null;

  const next = nextMilestone(totalWorkouts);
  const progressToNext = next ? Math.min(1, totalWorkouts / next.sessions) : 1;
  const progressPct = `${Math.round(progressToNext * 100)}%`;

  const unlockedMilestones = MILESTONES.filter(m => m.sessions <= totalWorkouts);
  const lastUnlocked = unlockedMilestones[unlockedMilestones.length - 1] ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Athlete Hub</Text>
        <VolyumeMark size={38} color={colors.textMuted} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try { await load(); } finally { setRefreshing(false); }
            }}
            tintColor={colors.textMuted}
            colors={[colors.primary]}
          />
        }
      >

        {/* Initial-load skeleton banner. Hides as soon as the first
            load() promise.all resolves (typically 100-400ms on local
            SQLite). Without it, cold launch shows a blank-looking
            screen for that window. */}
        {initialLoading && (
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <SkeletonCard height={88} />
            <SkeletonCard height={140} />
            <SkeletonCard height={120} />
          </View>
        )}

        {/* ── Profile card ──────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(displayName?.[0] || 'A').toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={styles.profileName}>{displayName}</Text>
              {tier === 'pro' && <ProBadge size="sm" />}
            </View>
            {trainingAge && <Text style={styles.profileMeta}>{trainingAge}</Text>}
            <View style={styles.profileStats}>
              <Text style={styles.profileStat}>{totalWorkouts} sessions</Text>
            </View>
          </View>
        </View>

        {/* ── Milestone progress ─────────────────────────── */}
        {(lastUnlocked || next) && (
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneTop}>
              {lastUnlocked && (
                <View style={styles.milestoneUnlocked}>
                  <Ionicons name={lastUnlocked.icon} size={16} color={colors.gold} />
                  <Text style={styles.milestoneUnlockedText}>{lastUnlocked.label}</Text>
                </View>
              )}
              {next && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.milestoneNext}>
                    {next.sessions - totalWorkouts} to go: {next.label}
                  </Text>
                  <InfoTooltip size={11} text={"Consistency is the biggest predictor of long-term progress. Every session counts.\n\nThe more sessions you log, the better Volyume understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly.\n\nBuilding the habit is the foundation everything else sits on."} />
                </View>
              )}
            </View>
            {next && (
              <View style={styles.milestoneBarTrack}>
                <View style={[styles.milestoneBarFill, { width: progressPct }]} />
              </View>
            )}
          </View>
        )}

        {/* ── Recovery signals ──────────────────────────── */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={styles.sectionLabel}>Recovery signals</Text>
            <InfoTooltip text="Weighted 7-day average of your session check-ins. Scored 1–5 where lower is better for Soreness and Fatigue (1 = fresh, 5 = very sore/tired). Joint Comfort is also 1–5 where 1 = comfortable. If scores are consistently high, consider a lighter week." />
          </View>
          <View style={styles.recoveryGrid}>
            <RecoveryGauge label="Soreness" value={recovery.soreness} />
            <RecoveryGauge label="Fatigue" value={recovery.fatigue} />
            <RecoveryGauge label="Joint comfort" value={recovery.joint} invertGood />
          </View>
          <Text style={styles.recoveryNote}>
            Scale 1–5 · Lower is better for soreness & fatigue
          </Text>
        </View>

        {/* ── Quick stats row ───────────────────────────── */}
        {weekVolume != null && (
          <View style={styles.quickStatsRow}>
            <QuickStat value={String(weekVolume)} label="Sets this week" icon="layers-outline" color={colors.primary} />
            <QuickStat value={String(totalWorkouts)} label="All-time sessions" icon="barbell-outline" color={colors.primary} />
          </View>
        )}

        {/* ── Weekly coaching card ──────────────────────── */}
        {tier === 'pro' && (
          <TouchableOpacity
            style={[styles.sectionCard, styles.checkinCard]}
            onPress={() => navigation.navigate('WeeklyCheckIn')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name={checkinDoneThisWeek ? 'checkmark-circle' : 'pulse-outline'} size={20} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long' }) === 'Sunday'
                    ? 'Sunday check-in'
                    : 'Weekly check-in'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {checkinDoneThisWeek
                    ? 'Done this week. Tap to review your plan.'
                    : morningWeightCount >= 4
                      ? 'Ready. Four questions. Your Precision Coaching adjusts around your answers.'
                      : `${morningWeightCount}/4 morning weights logged`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            {!checkinDoneThisWeek && (
              <View style={styles.checkinPrompt}>
                <Text style={styles.checkinPromptText}>
                  {morningWeightCount < 4
                    ? 'Log your morning weight each day to unlock your Precision Coaching.'
                    : 'Check in now to get your training and nutrition adjustments for next week.'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── Recovery capacity trend insight ──────────── */}
        {tier === 'pro' && recoveryTrendInsight && (
          <View style={[
            styles.trendInsightCard,
            recoveryTrendInsight.type === 'good' ? styles.trendInsightGood : styles.trendInsightWarn,
          ]}>
            <Ionicons
              name={recoveryTrendInsight.type === 'good' ? 'trending-up-outline' : 'alert-circle-outline'}
              size={16}
              color={recoveryTrendInsight.type === 'good' ? colors.success : colors.warning}
            />
            <Text style={styles.trendInsightText}>{recoveryTrendInsight.text}</Text>
          </View>
        )}

        {/* ── Weight trend ──────────────────────────────── */}
        {tier === 'pro' && weightTrend.length >= 3 && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="trending-down-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Weight trend</Text>
                <Text style={styles.cardSubtitle}>
                  Your true weight trend · smoothed across noise
                </Text>
              </View>
              <InfoTooltip
                size={13}
                text="Smooth trend line through your daily weigh-ins. Day-to-day swings from water, food, and sleep are normal. The trend is what matters. A steady downward line on a fat loss phase, or slow upward on a building phase, means things are working."
              />
            </View>
            <WeightSparkline data={weightTrend} units={units} bodyWeightUnits={bodyWeightUnits} />
          </View>
        )}

        {/* ── Muscle readiness ─────────────────────────── */}
        {tier === 'pro' && Object.keys(muscleFreshness).length > 0 && (
          <MuscleFreshnessCard muscleFreshness={muscleFreshness} now={Date.now()} />
        )}

        {/* ── Nutrition ─────────────────────────────────── */}
        {tier === 'pro' && (
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => navigation.navigate('NutritionTargets')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="nutrition" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Nutrition targets</Text>
                {nutritionTargets ? (
                  <Text style={styles.cardSubtitle}>
                    {nutritionTargets.targetKcal ? `${Math.round(nutritionTargets.targetKcal)} kcal daily` : 'Configured'}
                  </Text>
                ) : (
                  <Text style={[styles.cardSubtitle, styles.alert]}>Not set. Tap to configure.</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            {nutritionTargets && (
              <View style={styles.macroStrip}>
                <MacroPill label="Protein" value={`${Math.round(nutritionTargets.proteinG ?? 0)}g`} color={colors.primary} />
                <MacroPill label="Carbs" value={`${Math.round(nutritionTargets.carbsG ?? 0)}g`} color={colors.success} />
                <MacroPill label="Fat" value={`${Math.round(nutritionTargets.fatG ?? 0)}g`} color={colors.warning} />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Nutrition primer — link to the 5-min educational guide. Shown
            below the targets card so users who want a refresher (or who
            never read it during onboarding) can find it easily. */}
        {tier === 'pro' && (
          <TouchableOpacity
            style={styles.eduLinkRow}
            onPress={() => navigation.navigate('NutritionEducation')}
            activeOpacity={0.7}
          >
            <Ionicons name="book-outline" size={14} color={colors.primary} />
            <Text style={styles.eduLinkText}>How to read your calorie and macro targets</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── Body Metrics ──────────────────────────────── */}
        {tier === 'pro' && (
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => navigation.navigate('BodyMetrics')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="body" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Body metrics</Text>
                {latestMetric ? (
                  <Text style={styles.cardSubtitle}>
                    {latestMetric.weightKg != null ? formatBodyWeightShort(latestMetric.weightKg, bodyWeightUnits || 'st') : 'Logged'}
                    {latestMetric.loggedAt ? ` · ${format(new Date(latestMetric.loggedAt), 'MMM d')}` : ''}
                  </Text>
                ) : (
                  <Text style={[styles.cardSubtitle, styles.alert]}>No entries yet</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
            {latestMetric && (
              <View style={styles.metricRow}>
                {latestMetric.weightKg != null && <MetricChip label="Weight" value={formatBodyWeightShort(latestMetric.weightKg, bodyWeightUnits || 'st')} />}
                {latestMetric.bodyFatPercent != null && <MetricChip label="Body fat" value={`${latestMetric.bodyFatPercent}%`} />}
                {latestMetric.waistCm != null && <MetricChip label="Waist" value={`${latestMetric.waistCm} cm`} />}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── Gated Pro feature previews (free tier only) ── */}
        {tier !== 'pro' && (
          <>
            <TouchableOpacity
              style={[styles.sectionCard, styles.lockedCard]}
              onPress={() => navigation.navigate('ProUpgrade')}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="pulse-outline" size={20} color={colors.textMuted} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.lockedCardTitle}>Weekly check-in</Text>
                  <Text style={styles.lockedCardSub}>Four questions each week. Your Precision Coaching adjusts training and nutrition based on how your body responded.</Text>
                </View>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                  <Text style={styles.lockBadgeText}>Pro</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sectionCard, styles.lockedCard]}
              onPress={() => navigation.navigate('ProUpgrade')}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="nutrition" size={20} color={colors.textMuted} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.lockedCardTitle}>Nutrition targets</Text>
                  <Text style={styles.lockedCardSub}>Calorie and protein targets set to your goal, bodyweight, and training schedule.</Text>
                </View>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                  <Text style={styles.lockBadgeText}>Pro</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sectionCard, styles.lockedCard]}
              onPress={() => navigation.navigate('ProUpgrade')}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.surface2 }]}>
                  <Ionicons name="body" size={20} color={colors.textMuted} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.lockedCardTitle}>Body metrics</Text>
                  <Text style={styles.lockedCardSub}>Morning weight trend, body measurements, and progress tracking over time.</Text>
                </View>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                  <Text style={styles.lockBadgeText}>Pro</Text>
                </View>
              </View>
            </TouchableOpacity>

          </>
        )}

        {/* ── Coaching tools ────────────────────────────── */}
        <View style={styles.section}>
          {tier === 'pro' && (
            <>
              <Text style={styles.sectionLabel}>Coaching</Text>
              <NavRow
                icon="flag-outline"
                label="Update your plan"
                sub="Change your goal, phase, schedule, equipment or experience. We rebuild the plan and your nutrition targets around the new answers."
                onPress={() => navigation.navigate('ProGoalSetup')}
              />
              <NavRow
                icon="pause-circle-outline"
                label="Strategic journal"
                sub="Every coaching decision, and why"
                onPress={() => navigation.navigate('CoachHeldHistory')}
              />
              <NavRow
                icon="shield-checkmark-outline"
                label="Wellbeing check"
                sub="Update your health screening answers. Shapes how your Precision Coaching is applied."
                onPress={() => navigation.navigate('WellbeingCheck')}
              />

              {/* Engine Log — collapsible */}
              {(adaptationHistory.length > 0 || repWarnings.length > 0) && (
                <View style={styles.adaptHistCard}>
                  <TouchableOpacity
                    style={styles.adaptHistHeader}
                    onPress={() => setEngineLogOpen(v => !v)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.adaptHistHeaderLeft}>
                      <View style={styles.adaptHistIconWrap}>
                        <Ionicons name="pulse" size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.adaptHistHeaderLabel}>Engine Log</Text>
                        <Text style={styles.adaptHistHeaderSub}>
                          {repWarnings.length + adaptationHistory.length} recent coaching decisions
                        </Text>
                      </View>
                    </View>
                    <Ionicons name={engineLogOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  {engineLogOpen && (
                    <View style={styles.adaptHistBody}>
                      {repWarnings.map((w, i) => (
                        <View key={w.id || `reg_${i}`} style={styles.adaptHistRow}>
                          <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.adaptHistMuscle, { color: colors.warning }]}>
                              {w.exerciseName}: Rep regression
                            </Text>
                            {w.reason_text ? (
                              <Text style={styles.adaptHistReason} numberOfLines={3}>{w.reason_text}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                      {adaptationHistory.map((event, i) => {
                        const icon =
                          event.decision === 'add_set' ? 'trending-up' :
                          event.decision === 'drop_set' ? 'trending-down' :
                          event.decision === 'deload_trigger' ? 'warning-outline' :
                          event.decision === 'rotate_exercise' ? 'swap-horizontal' :
                          'remove-outline';
                        const iconColor =
                          event.decision === 'add_set' ? colors.primary :
                          event.decision === 'drop_set' || event.decision === 'deload_trigger' ? colors.error :
                          colors.textMuted;
                        const muscleLabel = MUSCLE_DISPLAY_NAMES[event.muscle] || event.muscle || 'Unknown';
                        const date = event.created_at
                          ? new Date(event.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : '';
                        return (
                          <View key={event.id || i} style={styles.adaptHistRow}>
                            <Ionicons name={icon} size={14} color={iconColor} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.adaptHistMuscle}>
                                {muscleLabel}
                                {event.delta != null && event.delta !== 0
                                  ? ` ${event.delta > 0 ? '+' : ''}${event.delta} set`
                                  : ''}
                              </Text>
                              {event.reason_text ? (
                                <Text style={styles.adaptHistReason} numberOfLines={2}>{event.reason_text}</Text>
                              ) : null}
                            </View>
                            <Text style={styles.adaptHistDate}>{date}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          <NavRow icon="settings-outline" label="Settings" sub="Units, data export, preferences" onPress={() => navigation.navigate('Settings')} />
        </View>

        {/* ── About ─────────────────────────────────────── */}
        <View style={styles.about}>
          <Text style={styles.aboutName}>Volyume</Text>
          <Text style={styles.aboutVersion}>Less thinking. More lifting. · Private by design</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RecoveryGauge({ label, value, invertGood = false }) {
  const hasValue = value != null && !isNaN(value);
  const display = hasValue ? value.toFixed(1) : 'N/A';

  let dotColor = colors.textMuted;
  let scaleNote = 'No data yet';
  if (hasValue) {
    const v = parseFloat(value);
    if (invertGood) {
      // Joint discomfort: lower is better
      dotColor = v >= 3 ? colors.error : v >= 2 ? colors.warning : colors.success;
      scaleNote = v >= 3 ? 'High discomfort' : v >= 2 ? 'Moderate' : 'Comfortable';
    } else {
      // Soreness/fatigue: lower is better
      dotColor = v >= 4 ? colors.error : v >= 3 ? colors.warning : colors.success;
      scaleNote = v >= 4 ? 'High' : v >= 3 ? 'Elevated' : v >= 2 ? 'Moderate' : 'Low / Fresh';
    }
  }

  return (
    <View style={styles.gaugeItem}>
      <View style={[styles.gaugeDot, { backgroundColor: dotColor }]} />
      <Text style={styles.gaugeValue}>{display}</Text>
      <Text style={styles.gaugeLabel}>{label}</Text>
      <Text style={styles.gaugeScale}>{scaleNote}</Text>
    </View>
  );
}

function QuickStat({ value, label, icon, color }) {
  return (
    <View style={styles.quickStat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.quickStatValue, { color }]}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

function MacroPill({ label, value, color }) {
  return (
    <View style={styles.macroPill}>
      <Text style={[styles.macroPillValue, { color }]}>{value}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
  );
}

function MetricChip({ label, value }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipValue}>{value}</Text>
      <Text style={styles.metricChipLabel}>{label}</Text>
    </View>
  );
}

function NavRow({ icon, label, sub, onPress, tooltip }) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.navRowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.navRowText}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.navRowLabel}>{label}</Text>
          {tooltip ? <InfoTooltip size={11} text={tooltip} /> : null}
        </View>
        {sub && <Text style={styles.navRowSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  // Profile
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryBg, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:     { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  profileInfo:    { flex: 1, gap: 3 },
  profileName:    { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  profileMeta:    { fontSize: fontSize.xs, color: colors.textMuted },
  profileStats:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  profileStat:    { fontSize: fontSize.xs, color: colors.textSecondary },
  profileDot:     { fontSize: fontSize.xs, color: colors.textMuted },

  // Milestones
  milestoneCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneUnlocked: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  milestoneUnlockedText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gold },
  milestoneNext:    { fontSize: fontSize.xs, color: colors.textMuted },
  milestoneBarTrack: {
    height: 4, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden',
  },
  milestoneBarFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },

  // Recovery
  section:       { gap: spacing.md },
  sectionLabel:  {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, letterSpacing: 0.2,
  },
  recoveryGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    gap: spacing.sm,
  },
  gaugeItem:   { flex: 1, alignItems: 'center', gap: spacing.xs },
  gaugeDot:    { width: 12, height: 12, borderRadius: 6 },
  gaugeValue:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  gaugeLabel:  { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  gaugeScale:  { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  recoveryNote: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },

  // Quick stats
  quickStatsRow: { flexDirection: 'row', gap: spacing.md },
  quickStat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  quickStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black },
  quickStatLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },

  // Section cards
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    gap: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  checkinCard: { borderColor: colors.primaryDim },
  lockedCard: { opacity: 0.6 },
  lockedCardTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary,
  },
  lockedCardSub: {
    fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 17,
  },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  lockBadgeText: {
    fontSize: 10, fontWeight: fontWeight.semibold, color: colors.textMuted,
  },
  checkinPrompt: { paddingTop: spacing.xs },
  checkinPromptText: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIconWrap:   {
    width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle:      { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  cardSubtitle:   { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  alert:          { color: colors.warning },
  macroStrip:     { flexDirection: 'row', gap: spacing.sm },
  eduLinkRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.sm },
  eduLinkText:    { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium, flex: 1 },
  macroPill:      {
    flex: 1, alignItems: 'center', backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingVertical: spacing.sm, gap: 2,
  },
  macroPillValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  macroPillLabel: { fontSize: 10, color: colors.textMuted },
  metricRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricChip: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 1,
  },
  metricChipValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  metricChipLabel: { fontSize: 10, color: colors.textMuted },

  // Nav rows
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  navRowIcon: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  navRowText:  { flex: 1 },
  navRowLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  navRowSub:   { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  // About
  about: { alignItems: 'center', paddingTop: spacing.md, gap: spacing.xs },
  aboutName:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted },
  aboutVersion: { fontSize: fontSize.xs, color: colors.textMuted },

  // Adaptation history / Engine Log
  adaptHistCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.md,
  },
  adaptHistHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  adaptHistHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1,
  },
  adaptHistIconWrap: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  adaptHistHeaderLabel: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary,
  },
  adaptHistHeaderSub: {
    fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2,
  },
  adaptHistBody: {
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.md,
  },
  adaptHistTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.xs },
  adaptHistRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  adaptHistMuscle: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  adaptHistReason: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  adaptHistDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  sparklineWrap: { marginTop: spacing.sm, overflow: 'hidden' },
  sparklineLegend: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm, paddingHorizontal: 2 },
  sparklineLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sparklineDot: { width: 7, height: 7, borderRadius: 4 },
  sparklineLegendText: { fontSize: fontSize.xs, color: colors.textSecondary },
  sparklineLegendVal: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textPrimary },

  trendInsightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
  },
  trendInsightGood: {
    backgroundColor: colors.successBg ?? colors.primaryBg,
    borderColor: colors.success + '40',
  },
  trendInsightWarn: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warning + '40',
  },
  trendInsightText: {
    flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20,
  },
});
