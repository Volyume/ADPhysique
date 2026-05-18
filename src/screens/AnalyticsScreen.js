import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { BrandTag } from '../components/BrandMark';
import { getAllWorkoutSets, getAllWorkouts, getAllExercises } from '../lib/database';
import {
  calculateTonnage, shouldDeload, calculateWeeklyVolume, VOLUME_LANDMARKS,
} from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

export default function AnalyticsScreen({ navigation }) {
  const { user, units } = useAppStore();
  const [weekStats, setWeekStats] = useState(null);
  const [deloadCheck, setDeloadCheck] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, [user?.id]));

  async function loadData() {
    if (!user?.id) return;
    await Promise.all([loadWeeklyData(), checkDeload(), loadRecentSessions()]);
  }

  async function loadRecentSessions() {
    try {
      const all = await getAllWorkouts(user.id);
      const completed = all
        .filter(w => w.isCompleted)
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 3);
      setRecentSessions(completed);
    } catch (_e) {}
  }

  async function loadWeeklyData() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allSets = await getAllWorkoutSets(user.id);
      const recentSets = allSets.filter(s => s.createdAt >= weekAgo);
      const allWorkouts = await getAllWorkouts(user.id);
      const recentWorkouts = allWorkouts.filter(
        w => w.startedAt >= weekAgo && w.isCompleted,
      );
      const tonnage = calculateTonnage(recentSets);
      const avgDuration = recentWorkouts.length > 0
        ? Math.round(recentWorkouts.reduce((s, w) => s + (w.durationMinutes || 0), 0) / recentWorkouts.length)
        : 0;
      const avgDifficulty = recentWorkouts.length > 0
        ? (recentWorkouts.reduce((s, w) => s + (w.sessionDifficulty || 3), 0) / recentWorkouts.length).toFixed(1)
        : null;

      setWeekStats({
        workoutCount: recentWorkouts.length,
        totalSets: recentSets.length,
        totalKg: Math.round(tonnage),
        avgDuration,
        avgDifficulty,
      });
    } catch (e) {
      console.error('loadWeeklyData:', e);
    }
  }

  async function checkDeload() {
    try {
      const [allWorkouts, allSets, allExercises] = await Promise.all([
        getAllWorkouts(user.id),
        getAllWorkoutSets(user.id),
        getAllExercises(),
      ]);
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

      const last4Weeks = Array.from({ length: 4 }, (_, i) => {
        const weekStart = Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000;
        const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
        const weekWorkouts = allWorkouts.filter(
          w => w.startedAt >= weekStart && w.startedAt < weekEnd,
        );
        const weekSets = allSets.filter(
          s => s.createdAt >= weekStart && s.createdAt < weekEnd,
        );
        const avgReps = weekSets.length > 0
          ? weekSets.reduce((sum, s) => sum + (s.actualReps || 0), 0) / weekSets.length
          : 0;
        const avgSoreness = weekWorkouts.length > 0
          ? weekWorkouts.reduce((sum, w) => sum + (w.soreness24hBefore || 0), 0) / weekWorkouts.length
          : 0;

        // Real over-MRV detection: any muscle whose weekly hard-set count
        // exceeds its MRV landmark flags the week as over-MRV.
        const volume = calculateWeeklyVolume(weekSets, exerciseMap);
        const hasOverMRV = Object.entries(volume).some(([muscle, v]) => {
          const lm = VOLUME_LANDMARKS[muscle];
          return lm && v.workingSets > lm.mrv;
        });

        return { avgReps, avgSoreness, hasOverMRV, weeksSinceLastDeload: 4 - i };
      });

      const result = shouldDeload(last4Weeks.reverse());
      if (result.deload) setDeloadCheck(result);
      else setDeloadCheck(null);
    } catch (e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.screenHeader}>
          <Text style={styles.pageTitle}>Progress</Text>
          <BrandTag size={13} color={colors.textMuted} />
        </View>

        {/* Deload Warning */}
        {deloadCheck?.deload && (
          <View style={styles.deloadAlert}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <View style={styles.deloadText}>
              <Text style={styles.deloadTitle}>Deload Recommended</Text>
              <Text style={styles.deloadReasons}>{deloadCheck.reasons.join(' · ')}</Text>
            </View>
          </View>
        )}

        {/* This Week Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THIS WEEK</Text>
          {weekStats ? (
            <View style={styles.statsGrid}>
              <StatCard value={String(weekStats.workoutCount)} label="Workouts" icon="barbell" />
              <StatCard value={String(weekStats.totalSets)} label="Working Sets" icon="layers" />
              <StatCard value={`${weekStats.totalKg.toLocaleString('en-GB')} kg`} label="Total kg" icon="trending-up" />
              <StatCard value={weekStats.avgDuration > 0 ? `${weekStats.avgDuration}m` : '—'} label="Avg Session" icon="time" />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyState}>No sessions this week. Time to train.</Text>
            </View>
          )}
        </View>

        {/* Volume Heatmap link */}
        <TouchableOpacity
          style={styles.heatmapNavCard}
          onPress={() => navigation.navigate('VolumeHeatmap')}
          activeOpacity={0.75}
        >
          <View style={styles.heatmapNavLeft}>
            <Ionicons name="grid-outline" size={22} color={colors.primary} />
            <View>
              <Text style={styles.heatmapNavTitle}>Volume Heatmap</Text>
              <Text style={styles.heatmapNavSub}>Weekly sets by muscle group with MEV / MRV landmarks</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECENT SESSIONS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
                <Text style={styles.seeAll}>All sessions</Text>
              </TouchableOpacity>
            </View>
            {recentSessions.map(w => (
              <View key={w.id} style={styles.sessionRow}>
                <View style={styles.sessionLeft}>
                  <Text style={styles.sessionName}>{w.name || 'Session'}</Text>
                  <Text style={styles.sessionMeta}>
                    {format(new Date(w.startedAt), 'EEE d MMM')}
                    {w.durationMinutes ? ` · ${w.durationMinutes}m` : ''}
                  </Text>
                </View>
                {w.sessionDifficulty != null && (
                  <View style={styles.rpeChip}>
                    <Text style={styles.rpeText}>RPE {w.sessionDifficulty}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Analyse */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ANALYSE</Text>
          <View style={styles.linkGrid}>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('WorkoutHistory')}>
              <Ionicons name="time" size={24} color={colors.primary} />
              <Text style={styles.linkTitle}>Session History</Text>
              <Text style={styles.linkSub}>All past sessions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('PRWall')}>
              <Ionicons name="trophy" size={24} color={colors.gold} />
              <Text style={styles.linkTitle}>Personal Records</Text>
              <Text style={styles.linkSub}>All-time bests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('VolumeHeatmap')}>
              <Ionicons name="grid" size={24} color={colors.primary} />
              <Text style={styles.linkTitle}>Volume Heatmap</Text>
              <Text style={styles.linkSub}>Weekly sets vs MEV–MRV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('BodyMetrics')}>
              <Ionicons name="body" size={24} color={colors.success} />
              <Text style={styles.linkTitle}>Body Metrics</Text>
              <Text style={styles.linkSub}>Weight & measurements</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('ExerciseLibrary')}>
              <Ionicons name="barbell" size={24} color={colors.textSecondary} />
              <Text style={styles.linkTitle}>Lift Progress</Text>
              <Text style={styles.linkSub}>Per-exercise history</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label, icon }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  deloadAlert: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  deloadText: { flex: 1 },
  deloadTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.warning,
    marginBottom: 4,
  },
  deloadReasons: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  seeAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  heatmapNavCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  heatmapNavLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  heatmapNavTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  heatmapNavSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  emptyState: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkGrid: { gap: spacing.md },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  linkSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sessionLeft: { flex: 1 },
  sessionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  sessionMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rpeChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rpeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
});
