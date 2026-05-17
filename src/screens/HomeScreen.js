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
import {
  getAllWorkoutSets, getAllExercises, getAllWorkouts, getAllRoutines,
  createWorkout, getRoutineExercisesWithDetails,
} from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import { calculateWeeklyVolume } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

export default function HomeScreen({ navigation }) {
  const { user, startWorkout, units, activeWorkout } = useAppStore();
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [weekStats, setWeekStats] = useState({ sessions: 0, streak: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [suggestedRoutine, setSuggestedRoutine] = useState(null);
  const [hasRoutines, setHasRoutines] = useState(false);

  useEffect(() => {
    if (user?.id) {
      seedRoutinesIfNeeded(user.id).catch(console.warn);
      loadData();
    }
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;
    await Promise.all([loadWeeklyVolume(), loadWeekStats(), loadRoutines()]);
  }

  async function loadWeeklyVolume() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allSets = await getAllWorkoutSets(user.id);
      const recentSets = allSets.filter(s => s.createdAt >= weekAgo);
      const allExercises = await getAllExercises();
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
      setWeeklyVolume(calculateWeeklyVolume(recentSets, exerciseMap));
    } catch (e) {
      console.error('loadWeeklyVolume:', e);
    }
  }

  async function loadWeekStats() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const mine = await getAllWorkouts(user.id);
      const thisWeek = mine.filter(w => w.startedAt >= weekAgo && w.isCompleted);

      let streak = 0;
      for (let i = 0; i < 52; i++) {
        const weekStart = startOfWeek(subDays(new Date(), i * 7)).getTime();
        const weekEnd = endOfWeek(subDays(new Date(), i * 7)).getTime();
        const hasWorkout = mine.some(w => w.startedAt >= weekStart && w.startedAt <= weekEnd && w.isCompleted);
        if (hasWorkout) streak++;
        else break;
      }

      setWeekStats({ sessions: thisWeek.length, streak });
    } catch (e) {
      console.error('loadWeekStats:', e);
    }
  }

  async function loadRoutines() {
    try {
      const routines = await getAllRoutines(user.id);
      const active = routines.filter(r => r.isActive && !r.isLibrary);
      setHasRoutines(active.length > 0);
      setSuggestedRoutine(active[0] || null);
    } catch (_e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handleStartBlankWorkout() {
    navigation.navigate('BuildWorkout');
  }

  async function handleStartRoutine(routine) {
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise,
      routineExercise,
      sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('ActiveWorkout');
  }

  function handleContinueWorkout() {
    navigation.navigate('ActiveWorkout');
  }

  const hasActiveWorkout = !!activeWorkout;
  const volumeIsEmpty = Object.keys(weeklyVolume).length === 0;

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
          <Text style={styles.appTitle}>VOLYUME</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weekStats.streak}</Text>
            <Text style={styles.statLabel}>Week Streak</Text>
          </View>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardAction]}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'BodyMetrics' })}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.statLabel}>Log weight</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK START</Text>

          {hasActiveWorkout ? (
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinueWorkout}>
              <Ionicons name="play-circle" size={22} color={colors.background} />
              <Text style={styles.continueBtnText}>Continue Workout</Text>
            </TouchableOpacity>
          ) : suggestedRoutine ? (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => handleStartRoutine(suggestedRoutine)}>
                <Ionicons name="play-circle" size={22} color={colors.background} />
                <Text style={styles.primaryBtnText}>Start {suggestedRoutine.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blankBtn} onPress={handleStartBlankWorkout}>
                <Text style={styles.blankBtnText}>Start Blank Workout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleStartBlankWorkout}>
                <Ionicons name="add-circle" size={22} color={colors.background} />
                <Text style={styles.primaryBtnText}>Start Blank Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => navigation.navigate('ProgrammesTab')}
              >
                <Text style={styles.ghostBtnText}>Browse Programmes</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Weekly Working Sets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WEEKLY WORKING SETS</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProgressTab', { screen: 'VolumeHeatmap' })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.volumeCard}>
            <VolumeBars weeklyVolume={weeklyVolume} />
            {volumeIsEmpty && (
              <Text style={styles.emptyVolume}>No sessions logged this week.</Text>
            )}
            <View style={styles.volumeLegend}>
              <LegendDot color={colors.textMuted} label="Below target" />
              <LegendDot color={colors.success} label="Growth range" />
              <LegendDot color={colors.error} label="Near ceiling" />
            </View>
          </View>
        </View>

        {/* Quick nav */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'WorkoutHistory' })}
          >
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ProgrammesTab')}
          >
            <Ionicons name="list" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>Programmes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ProgrammesTab', { screen: 'ExerciseLibrary' })}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  refreshBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
  primaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background, flexShrink: 1 },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  continueBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  blankBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  blankBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  ghostBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
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
