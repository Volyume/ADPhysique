import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal,
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
  const [planAllWorkouts, setPlanAllWorkouts] = useState([]);
  const [selectedWorkoutOverride, setSelectedWorkoutOverride] = useState(null);
  const [showChangeWorkout, setShowChangeWorkout] = useState(false);

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
      if (!plan) { setNextWorkout(null); setPlanAllWorkouts([]); setSelectedWorkoutOverride(null); return; }
      const routines = await getRoutinesForPlan(plan.id);
      setPlanAllWorkouts(routines);
      setSelectedWorkoutOverride(null);
      if (routines.length === 0) { setNextWorkout(null); return; }
      const idx = (plan.nextWorkoutIndex || 0) % routines.length;
      setNextWorkout({ routine: routines[idx], total: routines.length, idx });
    } catch (_e) {
      setNextWorkout(null);
      setPlanAllWorkouts([]);
      setSelectedWorkoutOverride(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleStartNextWorkout() {
    const target = selectedWorkoutOverride || nextWorkout;
    if (!target?.routine) return;
    const routine = target.routine;
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
  const displayWorkout = selectedWorkoutOverride || nextWorkout;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.appTitle}>VOLYUME</Text>

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
                    Day {(selectedWorkoutOverride?.idx ?? nextWorkout?.idx ?? 0) + 1} of {nextWorkout.total}
                  </Text>
                </View>
                <Text style={styles.workoutName} numberOfLines={2}>
                  {displayWorkout?.routine?.name}
                </Text>
                {exerciseCounts[displayWorkout?.routine?.id] ? (
                  <Text style={styles.workoutMeta}>
                    {exerciseCounts[displayWorkout?.routine?.id]} exercises
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.changeWorkoutLink} onPress={() => setShowChangeWorkout(true)}>
                <Ionicons name="swap-horizontal-outline" size={13} color={colors.textMuted} />
                <Text style={styles.changeWorkoutLinkText}>Change workout</Text>
              </TouchableOpacity>
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

      <Modal
        visible={showChangeWorkout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangeWorkout(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowChangeWorkout(false)}
        />
        <View style={styles.changeWorkoutSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Choose Workout</Text>
          <Text style={styles.sheetSubtitle}>{activePlan?.name}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {planAllWorkouts.map((routine, i) => {
              const isNextUp = i === nextWorkout?.idx && !selectedWorkoutOverride;
              const isSelected = selectedWorkoutOverride?.idx === i;
              return (
                <TouchableOpacity
                  key={routine.id ?? i}
                  style={[styles.workoutPickerRow, isSelected && styles.workoutPickerRowActive]}
                  onPress={() => {
                    if (i === nextWorkout?.idx) {
                      setSelectedWorkoutOverride(null);
                    } else {
                      setSelectedWorkoutOverride({ routine, total: planAllWorkouts.length, idx: i });
                    }
                    setShowChangeWorkout(false);
                  }}
                >
                  <View style={[styles.dayBadge, (isNextUp || isSelected) && styles.dayBadgeActive]}>
                    <Text style={[styles.dayNum, (isNextUp || isSelected) && styles.dayNumActive]}>
                      D{i + 1}
                    </Text>
                  </View>
                  <View style={styles.workoutPickerInfo}>
                    <Text style={styles.workoutPickerName} numberOfLines={1}>{routine.name}</Text>
                    {exerciseCounts[routine.id] ? (
                      <Text style={styles.workoutPickerMeta}>{exerciseCounts[routine.id]} exercises</Text>
                    ) : null}
                  </View>
                  {isNextUp ? (
                    <View style={styles.nextUpBadge}>
                      <Text style={styles.nextUpBadgeText}>Next up</Text>
                    </View>
                  ) : isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowChangeWorkout(false)}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  changeWorkoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  changeWorkoutLinkText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  changeWorkoutSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  workoutPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  workoutPickerRowActive: {
    backgroundColor: colors.primaryBg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 0,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayBadgeActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary + '60',
  },
  dayNum: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  dayNumActive: { color: colors.primary },
  workoutPickerInfo: { flex: 1, gap: 2 },
  workoutPickerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  workoutPickerMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  nextUpBadge: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  nextUpBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  sheetCancelBtn: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sheetCancelText: { fontSize: fontSize.md, color: colors.textSecondary },
});
