import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import {
  getActivePlan, getAllPlansForUser,
  getWorkoutTemplates, getPlanWorkoutCounts, getAllRoutineExerciseCounts,
  activatePlanWithBlock, getRoutinesForPlan, createWorkout, getRoutineExercisesWithDetails,
  archivePlan, duplicatePlan, softDeleteRoutine, getActiveBlock,
} from '../lib/database';
import { getBlockStatus } from '../lib/mesocycle';
import useAppStore from '../store/useAppStore';

const BLOCK_SNOOZE_KEY = '@volyume_block_snooze';

const ACTION_CARDS = [
  {
    id: 'coach',
    icon: 'sparkles',
    title: 'Coach Builder',
    description: 'Answer a few questions and we\'ll build a plan that fits your schedule and goals.',
    screen: 'CoachBuilder',
    badge: 'Recommended',
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
    description: 'Create a custom multi-day plan from scratch. You choose every exercise.',
    screen: 'ManualBuilder',
  },
];

export default function PlansScreen({ navigation }) {
  const { user, startWorkout, tier } = useAppStore();
  const [activePlan, setActivePlanData] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [planWorkoutCounts, setPlanWorkoutCounts] = useState({});
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [blockStatus, setBlockStatus] = useState(null); // null | { status, currentWeek, totalWeeks, ... }
  const [blockSnoozed, setBlockSnoozed] = useState(false);

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id]),
  );

  async function loadData() {
    if (!user?.id) return;
    try {
      const [active, all, tmpl, pwc, exc, block] = await Promise.all([
        getActivePlan(user.id),
        getAllPlansForUser(user.id),
        getWorkoutTemplates(user.id),
        getPlanWorkoutCounts(),
        getAllRoutineExerciseCounts(),
        getActiveBlock(user.id),
      ]);
      setActivePlanData(active || null);
      setMyPlans(all.filter(p => !active || p.id !== active.id));
      setTemplates(tmpl);
      setPlanWorkoutCounts(pwc);
      setExerciseCounts(exc);

      if (block) {
        const status = getBlockStatus(block.startDate, block.plannedWeeks || block.durationWeeks || 5);
        setBlockStatus(status.status !== 'active' ? status : null);

        const snoozeRaw = await AsyncStorage.getItem(BLOCK_SNOOZE_KEY).catch(() => null);
        if (snoozeRaw) {
          const snoozeUntil = parseInt(snoozeRaw, 10);
          setBlockSnoozed(Date.now() < snoozeUntil);
        } else {
          setBlockSnoozed(false);
        }
      } else {
        setBlockStatus(null);
      }
    } catch (_e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleRestartPlan() {
    if (!activePlan) return;
    Alert.alert(
      'Restart this plan?',
      'A new training block starts today with the same workouts. Try to beat your numbers from last time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start new block',
          onPress: async () => {
            await activatePlanWithBlock(user.id, activePlan.id, activePlan.name);
            await AsyncStorage.removeItem(BLOCK_SNOOZE_KEY).catch(() => {});
            await loadData();
          },
        },
      ],
    );
  }

  async function handleSnoozeBlock() {
    const snoozeUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(BLOCK_SNOOZE_KEY, String(snoozeUntil)).catch(() => {});
    setBlockSnoozed(true);
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
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
  }

  async function handleSetActive(plan) {
    await activatePlanWithBlock(user.id, plan.id, plan.name);
    await loadData();
  }

  async function handlePlanOptions(plan) {
    Alert.alert(plan.name, undefined, [
      { text: 'View Plan', onPress: () => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false }) },
      { text: 'Set Active', onPress: () => handleSetActive(plan) },
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
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.screenHeader}>
          <Text style={styles.pageTitle}>Plans</Text>
          <VolyumeMark size={38} color={colors.textMuted} />
        </View>

        {/* Block transition card */}
        {blockStatus && !blockSnoozed && activePlan && (
          <View style={[
            styles.blockCard,
            blockStatus.status === 'recovery' ? styles.blockCardRecovery : styles.blockCardComplete,
          ]}>
            <View style={styles.blockCardHeader}>
              <View style={styles.blockCardIconWrap}>
                <Ionicons
                  name={blockStatus.status === 'recovery' ? 'moon-outline' : 'checkmark-circle-outline'}
                  size={20}
                  color={blockStatus.status === 'recovery' ? colors.warning : colors.success}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockCardTitle}>
                  {blockStatus.status === 'recovery'
                    ? 'Recovery week'
                    : 'Training block complete'}
                </Text>
                <Text style={styles.blockCardSub}>
                  {blockStatus.status === 'recovery'
                    ? `Week ${blockStatus.currentWeek} of ${blockStatus.totalWeeks}. Lighter sessions this week. Decide what's next below.`
                    : blockStatus.status === 'overdue'
                      ? `Your block finished ${blockStatus.weeksOverdue + 1} week${blockStatus.weeksOverdue > 0 ? 's' : ''} ago. Choose what's next.`
                      : 'Recovery week is done. Time to start your next block.'}
                </Text>
              </View>
            </View>

            <Text style={styles.blockNextLabel}>What's next?</Text>
            <View style={styles.blockCardActions}>
              <TouchableOpacity style={styles.blockRestartBtn} onPress={handleRestartPlan} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={15} color={colors.background} />
                <Text style={styles.blockRestartBtnText}>Run this plan again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.blockNewBtn}
                onPress={() => navigation.navigate(tier === 'pro' ? 'CoachBuilder' : 'ProUpgrade')}
                activeOpacity={0.85}
              >
                <Text style={styles.blockNewBtnText}>Build a new plan</Text>
              </TouchableOpacity>
            </View>

            {blockStatus.status === 'recovery' && (
              <TouchableOpacity onPress={handleSnoozeBlock} style={styles.blockSnooze}>
                <Text style={styles.blockSnoozeText}>Remind me after recovery week</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Active Plan */}
        {activePlan ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active plan</Text>
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
            <Text style={styles.sectionTitle}>My plans</Text>
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
            <Text style={styles.sectionTitle}>Workout templates</Text>
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
          <Text style={styles.sectionTitle}>Start or build a plan</Text>
          {ACTION_CARDS.map(card => {
            const isCoach = card.id === 'coach';
            const proLocked = isCoach && tier !== 'pro';
            const featured = Boolean(card.badge) || proLocked;
            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.actionCard, featured && styles.actionCardFeatured]}
                onPress={() => navigation.navigate(proLocked ? 'ProUpgrade' : card.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionCardIcon, featured && styles.actionCardIconFeatured]}>
                  <Ionicons
                    name={proLocked ? 'lock-closed' : card.icon}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.actionCardBody}>
                  <View style={styles.actionCardTitleRow}>
                    <Text style={styles.actionCardTitle}>{card.title}</Text>
                    {proLocked ? (
                      <View style={styles.actionCardBadge}>
                        <Text style={styles.actionCardBadgeText}>Pro</Text>
                      </View>
                    ) : card.badge ? (
                      <View style={styles.actionCardBadge}>
                        <Text style={styles.actionCardBadgeText}>{card.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.actionCardDesc}>
                    {proLocked
                      ? 'An intelligent plan built around you. Part of Pro, free during beta.'
                      : card.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={featured ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  pageTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, letterSpacing: 0.2 },
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
  actionCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3 },
  actionCardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  actionCardBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  actionCardBadgeText: { fontSize: 9, fontWeight: fontWeight.black, color: colors.primary, letterSpacing: 0.5 },
  actionCardDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  actionCardFeatured: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.primaryBg,
  },
  actionCardIconFeatured: {
    backgroundColor: colors.surface,
    borderColor: colors.primary + '40',
  },

  blockCard: {
    borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
    borderWidth: 1,
  },
  blockCardRecovery: {
    backgroundColor: colors.surface,
    borderColor: colors.warning + '50',
  },
  blockCardComplete: {
    backgroundColor: colors.surface,
    borderColor: colors.success + '50',
  },
  blockCardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  blockCardIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  blockCardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: 2 },
  blockCardSub: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17 },
  blockNextLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  blockCardActions: { flexDirection: 'row', gap: spacing.md },
  blockRestartBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md,
  },
  blockRestartBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },
  blockNewBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  blockNewBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  blockSnooze: { alignItems: 'center', paddingTop: spacing.xs },
  blockSnoozeText: { fontSize: fontSize.xs, color: colors.textMuted },
});
