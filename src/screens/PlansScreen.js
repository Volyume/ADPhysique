import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getActivePlan, getAllPlansForUser,
  getWorkoutTemplates, getPlanWorkoutCounts, getAllRoutineExerciseCounts,
  setActivePlan, getRoutinesForPlan, createWorkout, getRoutineExercisesWithDetails,
  archivePlan, duplicatePlan, softDeleteRoutine,
} from '../lib/database';
import useAppStore from '../store/useAppStore';

const ACTION_CARDS = [
  {
    id: 'coach',
    icon: 'sparkles',
    title: 'Coach Builder',
    description: 'Answer 7 questions — get a personalised plan tailored to your schedule and goals.',
    screen: 'CoachBuilder',
  },
  {
    id: 'library',
    icon: 'library-outline',
    title: 'Plan Library',
    description: 'Browse ready-made plans for different splits, experience levels and goals.',
    screen: 'PlanLibrary',
  },
  {
    id: 'manual',
    icon: 'create-outline',
    title: 'Manual Builder',
    description: 'Create a custom multi-day plan from scratch — you choose every exercise.',
    screen: 'ManualBuilder',
  },
];

export default function PlansScreen({ navigation }) {
  const { user, startWorkout } = useAppStore();
  const [activePlan, setActivePlanData] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [planWorkoutCounts, setPlanWorkoutCounts] = useState({});
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id]),
  );

  async function loadData() {
    if (!user?.id) return;
    try {
      const [active, all, tmpl, pwc, exc] = await Promise.all([
        getActivePlan(user.id),
        getAllPlansForUser(user.id),
        getWorkoutTemplates(user.id),
        getPlanWorkoutCounts(),
        getAllRoutineExerciseCounts(),
      ]);
      setActivePlanData(active || null);
      setMyPlans(all.filter(p => !active || p.id !== active.id));
      setTemplates(tmpl);
      setPlanWorkoutCounts(pwc);
      setExerciseCounts(exc);
    } catch (_e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleStartNextWorkout(plan) {
    const routines = await getRoutinesForPlan(plan.id);
    if (routines.length === 0) {
      Alert.alert('No workouts', 'This plan has no workouts yet.');
      return;
    }
    const idx = (plan.nextWorkoutIndex || 0) % routines.length;
    const routine = routines[idx];
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise, routineExercise, sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout' });
  }

  async function handleSetActive(planId) {
    await setActivePlan(user.id, planId);
    await loadData();
  }

  async function handlePlanOptions(plan) {
    Alert.alert(plan.name, undefined, [
      { text: 'View Plan', onPress: () => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false }) },
      { text: 'Set Active', onPress: () => handleSetActive(plan.id) },
      {
        text: 'Duplicate',
        onPress: async () => {
          const copy = await duplicatePlan(plan.id, user.id);
          await loadData();
          navigation.navigate('PlanDetail', { planId: copy.id, isLibrary: false });
        },
      },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Archive Plan?',
          'The plan will be hidden. Session history remains intact.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Archive', style: 'destructive', onPress: async () => { await archivePlan(plan.id); await loadData(); } },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleTemplateOptions(routine) {
    Alert.alert(routine.name, undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('RoutineDetail', { routineId: routine.id }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Delete template?',
          `"${routine.name}" will be removed.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await softDeleteRoutine(routine.id); await loadData(); } },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleStartTemplate(routine) {
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise, routineExercise, sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.pageTitle}>Training Plans</Text>

        {/* Active Plan */}
        {activePlan ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVE PLAN</Text>
            <View style={styles.activePlanCard}>
              <View style={styles.activePlanHeader}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
                <TouchableOpacity onPress={() => handlePlanOptions(activePlan)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.activePlanName}>{activePlan.name}</Text>
              {planWorkoutCounts[activePlan.id] ? (
                <Text style={styles.activePlanMeta}>
                  {planWorkoutCounts[activePlan.id]} workout{planWorkoutCounts[activePlan.id] !== 1 ? 's' : ''}
                </Text>
              ) : null}
              <View style={styles.activePlanActions}>
                <TouchableOpacity style={styles.startNextBtn} onPress={() => handleStartNextWorkout(activePlan)}>
                  <Ionicons name="play" size={15} color={colors.background} />
                  <Text style={styles.startNextBtnText}>Start Next Workout</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewPlanBtn}
                  onPress={() => navigation.navigate('PlanDetail', { planId: activePlan.id, isLibrary: false })}
                >
                  <Text style={styles.viewPlanBtnText}>View Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noActivePlanRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.noActivePlanText}>
              No active plan · Build one, browse the library, or create your own from scratch.
            </Text>
          </View>
        )}

        {/* My Plans */}
        {myPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY PLANS</Text>
            {myPlans.map(plan => (
              <View key={plan.id} style={styles.planCard}>
                <TouchableOpacity
                  style={styles.planCardMain}
                  onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false })}
                >
                  <Text style={styles.planCardName} numberOfLines={2}>{plan.name}</Text>
                  {planWorkoutCounts[plan.id] ? (
                    <Text style={styles.planCardMeta}>
                      {planWorkoutCounts[plan.id]} workout{planWorkoutCounts[plan.id] !== 1 ? 's' : ''}
                    </Text>
                  ) : null}
                </TouchableOpacity>
                <View style={styles.planCardActions}>
                  <TouchableOpacity style={styles.setActiveBtn} onPress={() => handleSetActive(plan.id)}>
                    <Text style={styles.setActiveBtnText}>Set Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => handlePlanOptions(plan)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Workout Templates */}
        {templates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WORKOUT TEMPLATES</Text>
            <Text style={styles.sectionSubtitle}>Saved workouts you can start directly.</Text>
            {templates.map(routine => (
              <View key={routine.id} style={styles.templateCard}>
                <View style={styles.templateMain}>
                  <Text style={styles.templateName} numberOfLines={2}>{routine.name}</Text>
                  {exerciseCounts[routine.id] ? (
                    <Text style={styles.templateMeta}>{exerciseCounts[routine.id]} exercises</Text>
                  ) : null}
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity style={styles.startTemplateBtn} onPress={() => handleStartTemplate(routine)}>
                    <Ionicons name="play" size={13} color={colors.background} />
                    <Text style={styles.startTemplateBtnText}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => handleTemplateOptions(routine)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Decision Hub */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>START OR BUILD A PLAN</Text>
          {ACTION_CARDS.map(card => (
            <TouchableOpacity
              key={card.id}
              style={styles.actionCard}
              onPress={() => navigation.navigate(card.screen)}
              activeOpacity={0.75}
            >
              <View style={styles.actionCardIcon}>
                <Ionicons name={card.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.actionCardBody}>
                <Text style={styles.actionCardTitle}>{card.title}</Text>
                <Text style={styles.actionCardDesc}>{card.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  pageTitle: { fontSize: fontSize.xxxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5 },
  sectionSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: -spacing.sm },

  noActivePlanRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  noActivePlanText: { flex: 1, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

  activePlanCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.primary + '40', gap: spacing.md,
  },
  activePlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.primary + '60',
  },
  activeBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.black, letterSpacing: 1 },
  activePlanName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  activePlanMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  activePlanActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  startNextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md,
  },
  startNextBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },
  viewPlanBtn: {
    paddingHorizontal: spacing.lg, borderRadius: radius.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
  },
  viewPlanBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },

  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  planCardMain: { flex: 1, gap: spacing.xs },
  planCardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  planCardMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  planCardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setActiveBtn: {
    backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  setActiveBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  templateCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  templateMain: { flex: 1, gap: spacing.xs },
  templateName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  templateMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  templateActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startTemplateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  startTemplateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },

  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  actionCardIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  actionCardBody: { flex: 1 },
  actionCardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 3 },
  actionCardDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
});
