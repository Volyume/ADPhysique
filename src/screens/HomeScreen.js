import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek, endOfWeek, subDays } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import VolumeBars from '../components/VolumeBars';
import { database } from '../lib/database';
import { calculateWeeklyVolume } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

export default function HomeScreen({ navigation }) {
  const { user, startWorkout, units } = useAppStore();
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [weekStats, setWeekStats] = useState({ workouts: 0, streak: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [nextRoutine, setNextRoutine] = useState(null);

  useEffect(() => { loadData(); }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;
    await Promise.all([loadWeeklyVolume(), loadWeekStats(), loadNextRoutine()]);
  }

  async function loadWeeklyVolume() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allSets = await database.get('workout_sets').query().fetch();
      const recentSets = allSets.filter(s => s.userId === user.id && s.createdAt >= weekAgo);
      const allExercises = await database.get('exercises').query().fetch();
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
      setWeeklyVolume(calculateWeeklyVolume(recentSets, exerciseMap));
    } catch (e) {
      console.error('loadWeeklyVolume:', e);
    }
  }

  async function loadWeekStats() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allWorkouts = await database.get('workouts').query().fetch();
      const mine = allWorkouts.filter(w => w.userId === user.id);
      const thisWeek = mine.filter(w => w.startedAt >= weekAgo && w.isCompleted);

      let streak = 0;
      for (let i = 0; i < 52; i++) {
        const weekStart = startOfWeek(subDays(new Date(), i * 7)).getTime();
        const weekEnd = endOfWeek(subDays(new Date(), i * 7)).getTime();
        const hasWorkout = mine.some(w => w.startedAt >= weekStart && w.startedAt <= weekEnd);
        if (hasWorkout) streak++;
        else break;
      }

      setWeekStats({ workouts: thisWeek.length, streak });
    } catch (e) {
      console.error('loadWeekStats:', e);
    }
  }

  async function loadNextRoutine() {
    try {
      const routines = await database.get('routines').query().fetch();
      const active = routines.find(r => r.userId === user.id && r.isActive);
      setNextRoutine(active || null);
    } catch (_e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleStartBlankWorkout() {
    await database.write(async () => {
      const workout = await database.get('workouts').create(record => {
        record.userId = user.id;
        record.startedAt = Date.now();
        record.isCompleted = false;
        record.updatedAt = Date.now();
      });
      startWorkout(workout);
    });
    navigation.navigate('WorkoutTab', { screen: 'ActiveWorkout' });
  }

  async function handleStartRoutine(routine) {
    await database.write(async () => {
      const workout = await database.get('workouts').create(record => {
        record.userId = user.id;
        record.routineId = routine.id;
        record.startedAt = Date.now();
        record.isCompleted = false;
        record.updatedAt = Date.now();
      });
      startWorkout(workout);
    });
    navigation.navigate('WorkoutTab', { screen: 'ActiveWorkout' });
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.appTitle}>VOLYUME</Text>
          </View>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={handleRefresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.workouts}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.streak}</Text>
            <Text style={styles.statLabel}>Week Streak</Text>
          </View>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardAction]}
            onPress={() => navigation.navigate('AnalyticsTab', { screen: 'BodyMetrics' })}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.statLabel}>Log weight</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK START</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleStartBlankWorkout}>
            <Ionicons name="add-circle" size={22} color={colors.background} />
            <Text style={styles.primaryBtnText}>Start Blank Workout</Text>
          </TouchableOpacity>

          {nextRoutine && (
            <TouchableOpacity
              style={styles.routineBtn}
              onPress={() => handleStartRoutine(nextRoutine)}
            >
              <View>
                <Text style={styles.routineBtnLabel}>{nextRoutine.name}</Text>
                <Text style={styles.routineBtnSub}>Tap to start this routine</Text>
              </View>
              <Ionicons name="play-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Volume This Week */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>THIS WEEK'S VOLUME</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AnalyticsTab', { screen: 'VolumeHeatmap' })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.volumeCard}>
            <VolumeBars weeklyVolume={weeklyVolume} />
            {Object.keys(weeklyVolume).length === 0 && (
              <Text style={styles.emptyVolume}>Log your first workout to see volume here</Text>
            )}
            <View style={styles.volumeLegend}>
              <LegendDot color={colors.textMuted} label="Below MEV" />
              <LegendDot color={colors.success} label="Optimal" />
              <LegendDot color={colors.error} label="Over MRV" />
            </View>
          </View>
        </View>

        {/* Quick nav */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('WorkoutTab', { screen: 'WorkoutHistory' })}
          >
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ProfileTab', { screen: 'RoutineBuilder' })}
          >
            <Ionicons name="list" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>Routines</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('WorkoutTab', { screen: 'ExerciseLibrary' })}
          >
            <Ionicons name="barbell-outline" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>Exercises</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 2 },
  appTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  syncBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardAction: { gap: spacing.xs },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  seeAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  primaryBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  routineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routineBtnLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  routineBtnSub: { fontSize: fontSize.xs, color: colors.textSecondary },
  volumeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyVolume: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  volumeLegend: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  quickActions: { flexDirection: 'row', gap: spacing.md },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
});
