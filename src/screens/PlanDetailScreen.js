import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getProgrammeById, getRoutinesForPlan, getAllRoutineExerciseCounts,
  activatePlanWithBlock, archivePlan, duplicatePlan, copyPlanFromLibrary,
  createWorkout, getRoutineExercisesWithDetails, getActivePlan,
} from '../lib/database';
import useAppStore from '../store/useAppStore';
import { logError } from '../lib/errorLog';

export default function PlanDetailScreen({ navigation, route }) {
  const { planId, isLibrary = false } = route.params || {};
  const { user, startWorkout, tier } = useAppStore();
  const [plan, setPlan] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [activePlan, setActivePlanData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => { loadData(); }, [planId]),
  );

  async function loadData() {
    if (!planId) return;
    try {
      const [p, routines, counts, active] = await Promise.all([
        getProgrammeById(planId),
        getRoutinesForPlan(planId),
        getAllRoutineExerciseCounts(),
        user?.id ? getActivePlan(user.id) : Promise.resolve(null),
      ]);
      setPlan(p);
      setWorkouts(routines);
      setExerciseCounts(counts);
      setActivePlanData(active);
      if (p) navigation.setOptions({ title: p.name || 'Plan' });
    } catch (e) {
      logError('PlanDetailScreen.loadData', e, { planId, userId: user?.id });
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleAddToMyPlans() {
    Alert.alert(
      'Add to My Plans',
      `Copy "${plan?.name}" into your plans?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to My Plans',
          onPress: async () => {
            try {
              const copy = await copyPlanFromLibrary(planId, user.id);
              Alert.alert(
                'Added to My Plans',
                'Set this as your Active Plan now?',
                [
                  { text: 'Not Now', style: 'cancel', onPress: () => navigation.goBack() },
                  {
                    text: 'Set Active',
                    onPress: async () => {
                      await activatePlanWithBlock(user.id, copy.id, plan?.name ?? 'Training Plan');
                      navigation.goBack();
                    },
                  },
                ],
              );
            } catch (e) {
              Alert.alert('Error', 'Could not copy plan. Please try again.');
            }
          },
        },
      ],
    );
  }

  async function handleSetActive() {
    try {
      await activatePlanWithBlock(user.id, planId, plan?.name ?? 'Training Plan');
      await loadData();
      Alert.alert('Plan Activated', `"${plan?.name}" is now your active plan. Train will show the next workout.`);
    } catch (e) {
      logError('PlanDetailScreen.handleSetActive', e, { userId: user?.id, planId });
      Alert.alert('Couldn\'t activate plan', e?.message ?? 'Please try again.');
    }
  }

  async function handleStartWorkout(routine) {
    try {
      const workout = await createWorkout(user.id, routine.id);
      const withExercises = await getRoutineExercisesWithDetails(routine.id);
      const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
        exercise, routineExercise, sets: [],
      }));
      startWorkout(workout, initialExercises);
      navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
    } catch (e) {
      logError('PlanDetailScreen.handleStartWorkout', e, { userId: user?.id, routineId: routine?.id });
      Alert.alert('Couldn\'t start workout', e?.message ?? 'Please try again.');
    }
  }

  async function handleArchive() {
    Alert.alert(
      'Archive Plan?',
      'The plan will be hidden. Session history remains intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archivePlan(planId);
              navigation.goBack();
            } catch (e) {
              logError('PlanDetailScreen.handleArchive', e, { planId });
              Alert.alert('Couldn\'t archive plan', e?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  }

  async function handleDuplicate() {
    try {
      const copy = await duplicatePlan(planId, user.id);
      navigation.replace('PlanDetail', { planId: copy.id, isLibrary: false });
    } catch (e) {
      logError('PlanDetailScreen.handleDuplicate', e, { userId: user?.id, planId });
      Alert.alert('Couldn\'t duplicate plan', e?.message ?? 'Please try again.');
    }
  }

  const isActive = activePlan?.id === planId;
  const totalWorkingSets = workouts.reduce(
    (sum, w) => sum + (exerciseCounts[w.id] || 0) * 3,
    0,
  );

  if (!plan) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Plan header */}
        <View style={styles.planHeader}>
          <View style={styles.planHeaderBadgeRow}>
            {isLibrary && (
              <View style={styles.libraryBadge}>
                <Text style={styles.libraryBadgeText}>Library</Text>
              </View>
            )}
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active plan</Text>
              </View>
            )}
            {plan.tags && plan.tags.includes('featured') && (
              <View style={styles.featuredBadge}>
                <Ionicons name="sparkles" size={9} color={colors.background} />
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            )}
          </View>
          <Text style={styles.planName}>{plan.name}</Text>
          {plan.description ? (
            <Text style={styles.planDesc}>{plan.description}</Text>
          ) : null}
          <View style={styles.planStats}>
            <View style={styles.planStat}>
              <Text style={styles.planStatValue}>{workouts.length}</Text>
              <Text style={styles.planStatLabel}>Workouts</Text>
            </View>
            {totalWorkingSets > 0 && (
              <View style={styles.planStat}>
                <Text style={styles.planStatValue}>~{totalWorkingSets}</Text>
                <Text style={styles.planStatLabel}>Est. sets/week</Text>
              </View>
            )}
            {plan.difficulty != null && (
              <View style={styles.planStat}>
                <Text style={styles.planStatValue}>
                  {['Beginner', 'Intermediate', 'Advanced'][plan.difficulty] ?? 'Intermediate'}
                </Text>
                <Text style={styles.planStatLabel}>Level</Text>
              </View>
            )}
          </View>
        </View>

        {/* Primary action */}
        {isLibrary ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAddToMyPlans}>
            <Ionicons name="copy-outline" size={20} color={colors.background} />
            <Text style={styles.primaryBtnText}>Add to my plans</Text>
          </TouchableOpacity>
        ) : !isActive ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSetActive}>
            <Ionicons name="checkmark-circle" size={20} color={colors.background} />
            <Text style={styles.primaryBtnText}>Set active</Text>
          </TouchableOpacity>
        ) : null}

        {/* Workouts list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workouts</Text>
          {workouts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                {isLibrary ? 'No workouts in this plan.' : 'No workouts yet. Edit the plan to add workouts.'}
              </Text>
            </View>
          ) : (
            workouts.map((routine, i) => (
              <View key={routine.id} style={styles.workoutCard}>
                <View style={styles.workoutIndex}>
                  <Text style={styles.workoutIndexText}>{i + 1}</Text>
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{routine.name}</Text>
                  {exerciseCounts[routine.id] ? (
                    <Text style={styles.workoutMeta}>
                      {exerciseCounts[routine.id]} exercise{exerciseCounts[routine.id] !== 1 ? 's' : ''}
                    </Text>
                  ) : (
                    <Text style={styles.workoutMeta}>No exercises yet</Text>
                  )}
                </View>
                {!isLibrary && (
                  <View style={styles.workoutActions}>
                    <TouchableOpacity
                      style={styles.editWorkoutBtn}
                      onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.startWorkoutBtn}
                      onPress={() => handleStartWorkout(routine)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="play" size={13} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Manage actions — free tier only. Pro users manage their plan
            through the goal-change wizard in Athlete Hub. */}
        {!isLibrary && tier !== 'pro' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage</Text>
            <View style={styles.manageCard}>
              <TouchableOpacity style={styles.manageRow} onPress={handleDuplicate}>
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                <Text style={styles.manageRowText}>Duplicate Plan</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              {!isActive && (
                <TouchableOpacity style={[styles.manageRow, styles.manageRowLast]} onPress={handleArchive}>
                  <Ionicons name="archive-outline" size={18} color={colors.error} />
                  <Text style={[styles.manageRowText, { color: colors.error }]}>Archive Plan</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  planHeader: { gap: spacing.md },
  planHeaderBadgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  libraryBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  libraryBadgeText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold },
  activeBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.primary + '60',
  },
  activeBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  featuredBadgeText: { fontSize: fontSize.xs, color: colors.background, fontWeight: fontWeight.bold },
  planName: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  planDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  planStats: { flexDirection: 'row', gap: spacing.xl },
  planStat: { gap: spacing.xxs },
  planStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  planStatLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg,
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, letterSpacing: 0.2,
  },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  emptyCardText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  workoutCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  workoutIndex: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  workoutIndexText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary },
  workoutInfo: { flex: 1, gap: spacing.xxs },
  workoutName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  workoutMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  workoutActions: { flexDirection: 'row', gap: spacing.sm },
  editWorkoutBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  startWorkoutBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  manageCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  manageRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  manageRowLast: { borderBottomWidth: 0 },
  manageRowText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
});
