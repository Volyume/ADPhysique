import { useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import {
  getProgrammeById, getRoutinesForPlan, getAllRoutineExerciseCounts,
  activatePlanWithBlock, archivePlan, duplicatePlan, copyPlanFromLibrary,
  createWorkout, getRoutineExercisesWithDetails, getActivePlan,
} from '../lib/database';
import { PLAN_WHYTHIS_KEY } from '../lib/planAutoGen';
import Button from '../components/Button';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import useAppStore from '../store/useAppStore';
import { logError } from '../lib/errorLog';
import { useToast } from '../components/Toast';
import { confirmPlanSwitchMidBlock } from '../lib/planSwitch';

// Same reading order the enrollment reveal uses: how the week is structured,
// then why the volume and progression, then exercise selection and the
// recovery / nutrition adjustments that shaped it.
const WHY_ORDER = ['schedule', 'goal', 'experience', 'progression', 'equipment', 'recovery', 'nutrition', 'weakPoints'];

export default function PlanDetailScreen({ navigation, route }) {
  const { planId, isLibrary = false } = route.params || {};
  const { user, startWorkout, tier } = useAppStore();
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [activePlan, setActivePlanData] = useState(null);
  const [whyThis, setWhyThis] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // The rationale cache is per-user and always tracks the active
      // auto-generated plan (every reroll archives the others), so it's
      // only meaningful here when this plan is the active one. Loading it
      // is cheap; the render gates on isActive.
      if (user?.id) {
        try {
          const raw = await AsyncStorage.getItem(PLAN_WHYTHIS_KEY(user.id));
          const parsed = raw ? JSON.parse(raw) : null;
          setWhyThis(parsed && typeof parsed === 'object' ? parsed : null);
        } catch (_) { setWhyThis(null); }
      }
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
    appAlert(
      'Add to My Plans',
      `Copy "${plan?.name}" into your plans?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to My Plans',
          onPress: async () => {
            try {
              const copy = await copyPlanFromLibrary(planId, user.id);
              appAlert(
                'Added to My Plans',
                'Set this as your Active Plan now?',
                [
                  { text: 'Not Now', style: 'cancel', onPress: () => navigation.goBack() },
                  {
                    text: 'Set Active',
                    onPress: async () => {
                      const ok = await confirmPlanSwitchMidBlock(user.id, { newPlanName: plan?.name });
                      if (!ok) { navigation.goBack(); return; }
                      await activatePlanWithBlock(user.id, copy.id, plan?.name ?? 'Training Plan');
                      navigation.goBack();
                    },
                  },
                ],
              );
            } catch (_e) {
              toast.show('Could not copy plan. Try again.', { variant: 'error' });
            }
          },
        },
      ],
    );
  }

  async function handleSetActive() {
    try {
      const ok = await confirmPlanSwitchMidBlock(user.id, { newPlanName: plan?.name });
      if (!ok) return;
      await activatePlanWithBlock(user.id, planId, plan?.name ?? 'Training Plan');
      await loadData();
      toast.show(`"${plan?.name}" is now your active plan`, { variant: 'success' });
    } catch (e) {
      logError('PlanDetailScreen.handleSetActive', e, { userId: user?.id, planId });
      toast.show("Couldn't activate plan, try again", { variant: 'error' });
    }
  }

  async function handleStartWorkout(routine) {
    try {
      const workout = await createWorkout(user.id, routine.id);
      const withExercises = await getRoutineExercisesWithDetails(routine.id);
      const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
        exercise, routineExercise, sets: [],
        supersetGroupId: routineExercise?.supersetGroupId ?? null,
      }));
      startWorkout(workout, initialExercises);
      navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
    } catch (e) {
      logError('PlanDetailScreen.handleStartWorkout', e, { userId: user?.id, routineId: routine?.id });
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    }
  }

  async function handleArchive() {
    appAlert(
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
              toast.show("Couldn't archive plan, try again", { variant: 'error' });
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
      toast.show("Couldn't duplicate plan, try again", { variant: 'error' });
    }
  }

  const isActive = activePlan?.id === planId;
  const totalWorkingSets = workouts.reduce(
    (sum, w) => sum + (exerciseCounts[w.id] || 0) * 3,
    0,
  );

  if (!plan) {
    // Mirror the loaded layout (header block, primary button, workout rows)
    // so the swap to real content is seamless, rather than a blank flash.
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.content}>
          <Skeleton width={'55%'} height={28} />
          <Skeleton width={'80%'} height={14} />
          <SkeletonCard height={48} />
          <View style={styles.section}>
            <SkeletonCard height={72} />
            <SkeletonCard height={72} />
            <SkeletonCard height={72} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Plan header */}
        <AnimatedEntrance index={0}>
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
        </AnimatedEntrance>

        {/* Primary action */}
        {isLibrary ? (
          <Button title="Add to my plans" icon="copy-outline" size="lg" onPress={handleAddToMyPlans} />
        ) : !isActive ? (
          <Button title="Set active" icon="checkmark-circle" size="lg" onPress={handleSetActive} />
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
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${routine.name}`}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.startWorkoutBtn}
                      onPress={() => handleStartWorkout(routine)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${routine.name}`}
                    >
                      <Ionicons name="play" size={13} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Why this plan, for you. Only on the active auto-generated plan,
            mirroring the enrollment reveal so the rationale is here any
            time, not just right after setup. */}
        {isActive && !isLibrary && whyThis && WHY_ORDER.some(k => whyThis[k]) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why this plan, for you</Text>
            <View style={styles.whyCard}>
              {WHY_ORDER.filter(k => whyThis[k]).map((k, i, arr) => (
                <View key={k} style={[styles.whyItem, i < arr.length - 1 && styles.whyItemGap]}>
                  <View style={styles.whyBullet} />
                  <Text style={styles.whyText}>{whyThis[k]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Manage actions, free tier only. Pro users manage their plan
            through the goal-change wizard in Athlete Hub. */}
        {!isLibrary && tier !== 'pro' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage</Text>
            <View style={styles.manageCard}>
              <TouchableOpacity style={styles.manageRow} onPress={handleDuplicate} accessibilityRole="button" accessibilityLabel="Duplicate plan">
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                <Text style={styles.manageRowText}>Duplicate Plan</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              {!isActive && (
                <TouchableOpacity style={[styles.manageRow, styles.manageRowLast]} onPress={handleArchive} accessibilityRole="button" accessibilityLabel="Archive plan">
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
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: withAlpha(colors.primary, 0.376),
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
  planStatLabel: { ...type.caption, color: colors.textMuted },
  section: { gap: spacing.md },
  sectionTitle: {
    ...type.label, color: colors.textSecondary,
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
  workoutName: { ...type.bodyStrong, color: colors.textPrimary },
  workoutMeta: { ...type.caption, color: colors.textSecondary },
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
  manageRowText: { flex: 1, ...type.body, color: colors.textPrimary },
  whyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  whyItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  whyItemGap: { marginBottom: spacing.xs },
  whyBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  whyText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});
