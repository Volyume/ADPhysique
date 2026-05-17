import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getAllWorkouts, getActivePlan, getRoutinesForPlan,
  getAllRoutineExerciseCounts, createWorkout, getRoutineExercisesWithDetails,
} from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';

export default function HomeScreen({ navigation }) {
  const { user, startWorkout, activeWorkout } = useAppStore();
  const [weekStats, setWeekStats] = useState({ sessions: 0, sets: 0 });
  const [activePlan, setActivePlanData] = useState(null);
  const [nextWorkout, setNextWorkout] = useState(null);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        if (!seeded) {
          seedRoutinesIfNeeded(user.id).catch(console.warn);
          setSeeded(true);
        }
        loadData();
      }
    }, [user?.id]),
  );

  async function loadData() {
    await Promise.all([loadWeekStats(), loadNextWorkout(), loadExerciseCounts()]);
  }

  async function loadWeekStats() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const all = await getAllWorkouts(user.id);
      const thisWeek = all.filter(w => w.startedAt >= weekAgo && w.isCompleted);
      setWeekStats({ sessions: thisWeek.length, sets: thisWeek.reduce((s, w) => s + (w.setCount || 0), 0) });
    } catch (_e) {}
  }

  async function loadExerciseCounts() {
    try {
      const counts = await getAllRoutineExerciseCounts();
      setExerciseCounts(counts);
    } catch (_e) {}
  }

  async function loadNextWorkout() {
    try {
      const plan = await getActivePlan(user.id);
      setActivePlanData(plan || null);
      if (!plan) { setNextWorkout(null); return; }
      const routines = await getRoutinesForPlan(plan.id);
      if (routines.length === 0) { setNextWorkout(null); return; }
      const idx = (plan.nextWorkoutIndex || 0) % routines.length;
      setNextWorkout({ routine: routines[idx], total: routines.length, idx });
    } catch (_e) {
      setNextWorkout(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleStartNextWorkout() {
    if (!nextWorkout?.routine) return;
    const routine = nextWorkout.routine;
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise, routineExercise, sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('ActiveWorkout');
  }

  function handleContinueWorkout() {
    navigation.navigate('ActiveWorkout');
  }

  const hasActiveWorkout = !!activeWorkout;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.appTitle}>VOLYUME</Text>

        {/* Compact week snapshot */}
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotValue}>{weekStats.sessions}</Text>
            <Text style={styles.snapshotLabel}>Sessions this week</Text>
          </View>
          <TouchableOpacity
            style={styles.snapshotCard}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'BodyMetrics' })}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.snapshotLabel}>Log weight</Text>
          </TouchableOpacity>
        </View>

        {/* Main CTA block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NEXT UP</Text>

          {hasActiveWorkout ? (
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinueWorkout}>
              <Ionicons name="play-circle" size={22} color={colors.background} />
              <Text style={styles.continueBtnText}>Continue Workout</Text>
            </TouchableOpacity>
          ) : activePlan && nextWorkout ? (
            <>
              <View style={styles.planCard}>
                <View style={styles.planCardTop}>
                  <Text style={styles.planName} numberOfLines={1}>{activePlan.name}</Text>
                  <Text style={styles.planProgress}>
                    Day {nextWorkout.idx + 1} of {nextWorkout.total}
                  </Text>
                </View>
                <Text style={styles.workoutName} numberOfLines={2}>
                  {nextWorkout.routine.name}
                </Text>
                {exerciseCounts[nextWorkout.routine.id] ? (
                  <Text style={styles.workoutMeta}>
                    {exerciseCounts[nextWorkout.routine.id]} exercises
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleStartNextWorkout}>
                <Ionicons name="play-circle" size={22} color={colors.background} />
                <Text style={styles.primaryBtnText}>Start Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blankBtn} onPress={() => navigation.navigate('BuildWorkout')}>
                <Text style={styles.blankBtnText}>Start Blank Workout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('BuildWorkout')}>
                <Ionicons name="add-circle" size={22} color={colors.background} />
                <Text style={styles.primaryBtnText}>Start Blank Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => navigation.navigate('PlansTab')}
              >
                <Text style={styles.ghostBtnText}>Choose a Plan</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Quick actions */}
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
            onPress={() => navigation.navigate('PlansTab')}
          >
            <Ionicons name="list" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('PlansTab', { screen: 'ExerciseLibrary' })}
          >
            <Ionicons name="barbell-outline" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>Exercises</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('ProgressTab', { screen: 'PRWall' })}
          >
            <Ionicons name="trophy-outline" size={22} color={colors.primary} />
            <Text style={styles.quickActionText}>Records</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  appTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  snapshotRow: { flexDirection: 'row', gap: spacing.md },
  snapshotCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  snapshotValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  snapshotLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 0.5,
    flex: 1,
  },
  planProgress: { fontSize: fontSize.xs, color: colors.textMuted },
  workoutName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  workoutMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
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
  blankBtn: { alignItems: 'center', paddingVertical: spacing.md },
  blankBtnText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  ghostBtn: { alignItems: 'center', paddingVertical: spacing.md },
  ghostBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
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
