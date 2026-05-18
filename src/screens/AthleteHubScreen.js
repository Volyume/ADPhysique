import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, differenceInDays } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, shadow } from '../styles/theme';
import { BrandTag } from '../components/BrandMark';
import useAppStore from '../store/useAppStore';
import {
  getAllWorkouts, getCompletedWorkoutSets, getBodyMetricLog, getNutritionTargets,
} from '../lib/database';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { exportCoachReport } from '../lib/coachExport';
import { getWellbeingMode, isCalm } from '../lib/wellbeing';

const { width: SCREEN_W } = Dimensions.get('window');

const PHYSIQUE_PREF_KEY = '@volyume_physique_tracking_enabled';

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

// Consecutive weeks (rolling 7-day buckets) with at least one completed
// session. Tolerates any rest-day pattern within a week, so a normal
// training split no longer breaks the streak.
function computeStreak(workouts) {
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const trainedWeeks = new Set(
    workouts
      .filter(w => w.isCompleted ?? w.is_completed ?? false)
      .map(w => Math.floor((w.startedAt ?? w.createdAt ?? 0) / WEEK_MS)),
  );
  let streak = 0;
  let week = Math.floor(now / WEEK_MS);
  // Allow this week or last week to start the streak
  if (!trainedWeeks.has(week)) week -= 1;
  while (trainedWeeks.has(week)) {
    streak++;
    week--;
  }
  return streak;
}

export default function AthleteHubScreen({ navigation }) {
  const { user, userProfile, units } = useAppStore();
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [latestMetric, setLatestMetric]         = useState(null);
  const [totalWorkouts, setTotalWorkouts]       = useState(0);
  const [streak, setStreak]                     = useState(0);
  const [recovery, setRecovery]                 = useState({ soreness: null, fatigue: null, joint: null });
  const [weekVolume, setWeekVolume]             = useState(null);
  const [physiqueEnabled, setPhysiqueEnabled]   = useState(false);
  const [exporting, setExporting]               = useState(false);
  const [calm, setCalm]                         = useState(false);

  async function handleCoachExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await exportCoachReport(user?.id, {
        units,
        nutritionConsented: physiqueEnabled,
      });
      if (!res.ok && res.reason === 'unavailable') {
        Alert.alert('Export unavailable', 'PDF export is not available on this device.');
      } else if (!res.ok && res.reason !== 'no-share') {
        Alert.alert('Nothing to export', 'Log a few sessions first, then share with your coach.');
      }
    } catch (e) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setExporting(false);
    }
  }

  useFocusEffect(useCallback(() => {
    if (user?.id) load();
    AsyncStorage.getItem(PHYSIQUE_PREF_KEY).then(v => setPhysiqueEnabled(v === 'true'));
    getWellbeingMode().then(m => setCalm(isCalm(m)));
  }, [user?.id]));

  async function load() {
    await Promise.all([
      loadWorkoutStats(),
      loadBodyMetrics(),
      loadNutrition(),
    ]);
  }

  async function loadWorkoutStats() {
    try {
      const [workouts, sets] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
      ]);
      const completed = workouts.filter(w => w.isCompleted ?? w.is_completed ?? false);
      setTotalWorkouts(completed.length);
      setStreak(computeStreak(workouts));

      // Recovery EMAs
      const ema = computeRecoveryEMAs(completed);
      setRecovery(ema);

      // Weekly volume (hard sets this week)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekSets = sets.filter(s =>
        (s.createdAt ?? s.created_at ?? 0) >= weekAgo && (s.setType ?? s.set_type) !== 'warmup',
      );
      setWeekVolume(weekSets.length);
    } catch (_e) {}
  }

  async function loadBodyMetrics() {
    try {
      const rows = await getBodyMetricLog(user.id, 1);
      setLatestMetric(rows[0] ?? null);
    } catch (_e) {}
  }

  async function loadNutrition() {
    try {
      const t = await getNutritionTargets(user.id);
      setNutritionTargets(t ?? null);
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
        <View style={styles.headerRight}>
          <BrandTag size={13} color={colors.textMuted} />
          <TouchableOpacity
            style={styles.settingsCog}
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Profile card ──────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(displayName?.[0] || 'A').toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            {trainingAge && <Text style={styles.profileMeta}>{trainingAge}</Text>}
            <View style={styles.profileStats}>
              <Text style={styles.profileStat}>{totalWorkouts} sessions</Text>
              {!calm && streak >= 2 && (
                <>
                  <Text style={styles.profileDot}>·</Text>
                  <Text style={[styles.profileStat, { color: colors.warning }]}>{streak} week streak</Text>
                </>
              )}
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
                <Text style={styles.milestoneNext}>
                  {next.sessions - totalWorkouts} to go — {next.label}
                </Text>
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
          <Text style={styles.sectionLabel}>RECOVERY SIGNALS</Text>
          <View style={styles.recoveryGrid}>
            <RecoveryGauge label="Soreness" value={recovery.soreness} />
            <RecoveryGauge label="Fatigue" value={recovery.fatigue} />
            <RecoveryGauge label="Joint comfort" value={recovery.joint} invertGood />
          </View>
          <Text style={styles.recoveryNote}>
            7-day weighted average of your session feedback.
          </Text>
        </View>

        {/* ── Quick stats row ───────────────────────────── */}
        {weekVolume != null && (
          <View style={styles.quickStatsRow}>
            <QuickStat value={String(weekVolume)} label="Sets this week" icon="layers-outline" color={colors.primary} />
            <QuickStat value={String(totalWorkouts)} label="All-time sessions" icon="barbell-outline" color={colors.success} />
          </View>
        )}

        {/* ── Nutrition ─────────────────────────────────── */}
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
              <Text style={styles.cardTitle}>Nutrition Targets</Text>
              {nutritionTargets ? (
                <Text style={styles.cardSubtitle}>
                  {nutritionTargets.targetKcal ? `${Math.round(nutritionTargets.targetKcal)} kcal daily` : 'Configured'}
                </Text>
              ) : (
                <Text style={[styles.cardSubtitle, styles.alert]}>Not set — tap to configure</Text>
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

        {/* ── Body Metrics ──────────────────────────────── */}
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => navigation.navigate('BodyMetrics')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.successBg }]}>
              <Ionicons name="body" size={20} color={colors.success} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Body Metrics</Text>
              {latestMetric ? (
                <Text style={styles.cardSubtitle}>
                  {latestMetric.weightKg != null ? `${latestMetric.weightKg} ${units}` : 'Logged'}
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
              {latestMetric.weightKg != null && <MetricChip label="Weight" value={`${latestMetric.weightKg} ${units}`} />}
              {latestMetric.bodyFatPercent != null && <MetricChip label="Body fat" value={`${latestMetric.bodyFatPercent}%`} />}
              {latestMetric.waistCm != null && <MetricChip label="Waist" value={`${latestMetric.waistCm} cm`} />}
            </View>
          )}
        </TouchableOpacity>

        {/* ── Nav links ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MANAGE</Text>
          <NavRow icon="layers" label="Training Blocks" sub="Create and track multi-week blocks" onPress={() => navigation.navigate('MesocycleBuilder')} />
          {physiqueEnabled && (
            <NavRow icon="flame" label="Peak Week" sub="Contest carb-load &amp; water taper planner" onPress={() => navigation.navigate('PeakWeek')} />
          )}
          <NavRow
            icon="document-text-outline"
            label={exporting ? 'Preparing report…' : 'Send report to coach'}
            sub="Last 4 weeks as a PDF — volume, PRs, bodyweight"
            onPress={handleCoachExport}
          />
          <NavRow icon="trophy" label="Personal Records" sub="All-time bests" onPress={() => navigation.navigate('BodyMetrics')} />
          <NavRow icon="settings-outline" label="Settings" sub="Units, data export, preferences" onPress={() => navigation.navigate('Settings')} />
        </View>

        {/* ── About ─────────────────────────────────────── */}
        <View style={styles.about}>
          <Text style={styles.aboutName}>Volyume</Text>
          <Text style={styles.aboutVersion}>Intelligent Hypertrophy Logbook · Private by design</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RecoveryGauge({ label, value, invertGood = false }) {
  const hasValue = value != null && !isNaN(value);
  const display = hasValue ? value.toFixed(1) : '—';

  let dotColor = colors.textMuted;
  if (hasValue) {
    const v = parseFloat(value);
    if (invertGood) {
      // Joint discomfort: lower is better
      dotColor = v >= 3 ? colors.error : v >= 2 ? colors.warning : colors.success;
    } else {
      // Soreness/fatigue: lower is better
      dotColor = v >= 4 ? colors.error : v >= 3 ? colors.warning : colors.success;
    }
  }

  return (
    <View style={styles.gaugeItem}>
      <View style={[styles.gaugeDot, { backgroundColor: dotColor }]} />
      <Text style={styles.gaugeValue}>{display}</Text>
      <Text style={styles.gaugeLabel}>{label}</Text>
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

function NavRow({ icon, label, sub, onPress }) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.navRowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.navRowText}>
        <Text style={styles.navRowLabel}>{label}</Text>
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
  settingsCog:   { padding: spacing.xs },

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
    fontSize: fontSize.xs, fontWeight: fontWeight.black,
    color: colors.textMuted, letterSpacing: 1.5,
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
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIconWrap:   {
    width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle:      { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  cardSubtitle:   { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  alert:          { color: colors.warning },
  macroStrip:     { flexDirection: 'row', gap: spacing.sm },
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
});
