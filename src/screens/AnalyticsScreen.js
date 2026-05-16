import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import VolumeBars from '../components/VolumeBars';
import { database } from '../lib/database';
import {
  calculateWeeklyVolume, calculateTonnage, shouldDeload, MUSCLE_DISPLAY_NAMES,
} from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

export default function AnalyticsScreen({ navigation }) {
  const { user, units } = useAppStore();
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [weekStats, setWeekStats] = useState(null);
  const [deloadCheck, setDeloadCheck] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;
    await Promise.all([loadWeeklyData(), checkDeload()]);
  }

  async function loadWeeklyData() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allSets = await database.get('workout_sets').query().fetch();
      const recentSets = allSets.filter(s => s.userId === user.id && s.createdAt >= weekAgo);
      const allWorkouts = await database.get('workouts').query().fetch();
      const recentWorkouts = allWorkouts.filter(
        w => w.userId === user.id && w.startedAt >= weekAgo && w.isCompleted,
      );
      const allExercises = await database.get('exercises').query().fetch();
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
      const volume = calculateWeeklyVolume(recentSets, exerciseMap);
      setWeeklyVolume(volume);

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
        tonnage: (tonnage / 1000).toFixed(1),
        avgDuration,
        avgDifficulty,
      });
    } catch (e) {
      console.error('loadWeeklyData:', e);
    }
  }

  async function checkDeload() {
    try {
      const allWorkouts = await database.get('workouts').query().fetch();
      const allSets = await database.get('workout_sets').query().fetch();

      const last4Weeks = Array.from({ length: 4 }, (_, i) => {
        const weekStart = Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000;
        const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
        const weekWorkouts = allWorkouts.filter(
          w => w.userId === user.id && w.startedAt >= weekStart && w.startedAt < weekEnd,
        );
        const weekSets = allSets.filter(
          s => s.userId === user.id && s.createdAt >= weekStart && s.createdAt < weekEnd,
        );
        const avgReps = weekSets.length > 0
          ? weekSets.reduce((sum, s) => sum + (s.actualReps || 0), 0) / weekSets.length
          : 0;
        const avgSoreness = weekWorkouts.length > 0
          ? weekWorkouts.reduce((sum, w) => sum + (w.soreness24hBefore || 0), 0) / weekWorkouts.length
          : 0;
        return { avgReps, avgSoreness, hasOverMRV: false, weeksSinceLastDeload: 4 - i };
      });

      const result = shouldDeload(last4Weeks.reverse());
      if (result.deload) setDeloadCheck(result);
    } catch (e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.pageTitle}>Analytics</Text>

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
        {weekStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THIS WEEK</Text>
            <View style={styles.statsGrid}>
              <StatCard value={String(weekStats.workoutCount)} label="Workouts" icon="barbell" />
              <StatCard value={String(weekStats.totalSets)} label="Hard Sets" icon="layers" />
              <StatCard value={`${weekStats.tonnage}t`} label="Tonnage" icon="trending-up" />
              <StatCard value={`${weekStats.avgDuration}m`} label="Avg Session" icon="time" />
            </View>
          </View>
        )}

        {/* Volume Heatmap */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>VOLUME BY MUSCLE</Text>
            <TouchableOpacity onPress={() => navigation.navigate('VolumeHeatmap')}>
              <Text style={styles.seeAll}>Full view</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <VolumeBars weeklyVolume={weeklyVolume} />
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEEP DIVE</Text>
          <View style={styles.linkGrid}>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('PRWall')}>
              <Ionicons name="trophy" size={24} color={colors.gold} />
              <Text style={styles.linkTitle}>Personal Records</Text>
              <Text style={styles.linkSub}>All-time bests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('VolumeHeatmap')}>
              <Ionicons name="grid" size={24} color={colors.primary} />
              <Text style={styles.linkTitle}>Volume Heatmap</Text>
              <Text style={styles.linkSub}>MEV/MAV/MRV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('BodyMetrics')}>
              <Ionicons name="body" size={24} color={colors.success} />
              <Text style={styles.linkTitle}>Body Metrics</Text>
              <Text style={styles.linkSub}>Weight & measurements</Text>
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
  pageTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
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
});
