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
import { getBlockAdvice } from '../lib/blockAdvisor';
import useAppStore from '../store/useAppStore';

const BLOCK_SNOOZE_KEY = '@volyume_block_snooze';

const ACTION_CARDS_DEFAULT = [
  {
    id: 'coach',
    icon: 'sparkles',
    title: 'Coach Builder',
    description: "Answer a few questions and we'll build a plan that fits your schedule and goals.",
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

const BLOCK_ICON = {
  heads_up: 'alert-circle-outline',
  early_deload: 'battery-charging-outline',
  in_recovery: 'moon-outline',
  post_recovery: 'checkmark-circle-outline',
};

export default function PlansScreen({ navigation }) {
  const { user, startWorkout, tier, userProfile } = useAppStore();
  const [activePlan, setActivePlanData] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [planWorkoutCounts, setPlanWorkoutCounts] = useState({});
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [blockAdvice, setBlockAdvice] = useState(null);
  const [blockSnoozed, setBlockSnoozed] = useState(false);

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

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
        const advice = await getBlockAdvice(user.id, block, userProfile).catch(() => null);
        setBlockAdvice(advice);

        // heads_up always shows (informational, no snooze needed)
        if (advice && advice.action !== 'continue' && advice.action !== 'heads_up') {
          const snoozeRaw = await AsyncStorage.getItem(BLOCK_SNOOZE_KEY).catch(() => null);
          if (snoozeRaw) {
            setBlockSnoozed(Date.now() < parseInt(snoozeRaw, 10));
          } else {
            setBlockSnoozed(false);
          }
        } else {
          setBlockSnoozed(false);
        }
      } else {
        setBlockAdvice(null);
        setBlockSnoozed(false);
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

  function blockIconColor(action) {
    if (action === 'in_recovery') return colors.primary;
    if (action === 'post_recovery') return colors.success;
    return colors.warning;
  }

  const showBlockCard = blockAdvice && activePlan &&
    blockAdvice.action !== 'continue' &&
    (blockAdvice.action === 'heads_up' || !blockSnoozed);

  const isProWithPlan = tier === 'pro' && !!activePlan;
  const actionCards = ACTION_CARDS_DEFAULT;

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

        {/* Block advisor card */}
        {showBlockCard && (
          <View style={[
            styles.blockCard,
            blockAdvice.action === 'heads_up' && styles.blockCardHeadsUp,
            blockAdvice.action === 'early_deload' && styles.blockCardWarning,
            blockAdvice.action === 'in_recovery' && styles.blockCardRecovery,
            blockAdvice.action === 'post_recovery' && styles.blockCardComplete,
          ]}>
            <View style={styles.blockCardHeader}>
              <View style={styles.blockCardIconWrap}>
                <Ionicons
                  name={BLOCK_ICON[blockAdvice.action] || 'information-circle-outline'}
                  size={20}
                  color={blockIconColor(blockAdvice.action)}
                />
              </View>
              <Text style={styles.blockCardTitle}>{blockAdvice.headline}</Text>
            </View>

            <Text style={styles.blockCardBody}>{blockAdvice.body}</Text>

            {/* Signal chips — shown for early_deload and heads_up */}
            {blockAdvice.signals?.filter(s => s.severity !== 'info').length > 0 && (
              <View style={styles.signalRow}>
                {blockAdvice.signals.filter(s => s.severity !== 'info').map((sig, i) => (
                  <View key={i} style={[styles.signalChip, sig.severity === 'high' && styles.signalChipHigh]}>
                    <Text style={[styles.signalChipText, sig.severity === 'high' && styles.signalChipTextHigh]}>
                      {sig.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Next block recommendation */}
            {blockAdvice.nextBlock && (
              <View style={styles.nextBlockSection}>
                {blockAdvice.action === 'in_recovery' && (
                  <Text style={styles.nextBlockPreLabel}>After your recovery week</Text>
                )}
                <Text style={styles.nextBlockHeadline}>{blockAdvice.nextBlock.headline}</Text>
                <Text style={styles.nextBlockBody}>{blockAdvice.nextBlock.body}</Text>

                {/* CTAs only shown when block is complete and recovery is done */}
                {blockAdvice.action === 'post_recovery' && (
                  <View style={styles.blockCardActions}>
                    <TouchableOpacity style={styles.blockRestartBtn} onPress={handleRestartPlan} activeOpacity={0.85}>
                      <Ionicons name="refresh-outline" size={15} color={colors.background} />
                      <Text style={styles.blockRestartBtnText}>{blockAdvice.nextBlock.actionLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.blockNewBtn}
                      onPress={() => navigation.navigate(tier === 'pro' ? 'CoachBuilder' : 'ProUpgrade')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.blockNewBtnText}>{blockAdvice.nextBlock.secondaryLabel}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Early deload dismiss options */}
            {blockAdvice.action === 'early_deload' && (
              <View style={styles.blockCardActions}>
                <TouchableOpacity style={styles.blockRestartBtn} onPress={handleSnoozeBlock} activeOpacity={0.85}>
                  <Text style={styles.blockRestartBtnText}>Got it, I'll ease off</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.blockNewBtn} onPress={handleSnoozeBlock} activeOpacity={0.85}>
                  <Text style={styles.blockNewBtnText}>Keep going</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Snooze links for recovery states */}
            {(blockAdvice.action === 'in_recovery' || blockAdvice.action === 'post_recovery') && (
              <TouchableOpacity onPress={handleSnoozeBlock} style={styles.blockSnooze}>
                <Text style={styles.blockSnoozeText}>
                  {blockAdvice.action === 'in_recovery'
                    ? 'Remind me after recovery week'
                    : 'Not quite ready. Remind me later.'}
                </Text>
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
              {blockAdvice?.action === 'continue' && blockAdvice.blockStatus && (
                <Text style={styles.activePlanWeek}>
                  Week {blockAdvice.blockStatus.currentWeek} of {blockAdvice.blockStatus.totalWeeks}
                </Text>
              )}
              {tier === 'pro' && (
                <Text style={styles.proCoachNote}>
                  Your Precision Coaching adjusts this plan as you progress and check in. To change your goals, head to You → Athlete Hub.
                </Text>
              )}
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
                  <TouchableOpacity style={styles.setActiveBtn} onPress={() => handleSetActive(plan)}>
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

        {/* Training Blocks */}
        <TouchableOpacity
          style={styles.trainingBlocksRow}
          onPress={() => navigation.navigate('MesocycleBuilder')}
          activeOpacity={0.75}
        >
          <View style={styles.trainingBlocksIcon}>
            <Ionicons name="layers-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trainingBlocksLabel}>Training blocks</Text>
            <Text style={styles.trainingBlocksSub}>View completed blocks and long-term progress</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Pointer to Athlete Hub for Pro users — replaces the "Change your goals" rebuild card */}
        {isProWithPlan && (
          <TouchableOpacity
            style={styles.goalsPointer}
            onPress={() => navigation.getParent()?.navigate('ProfileTab', { screen: 'AthleteHub' })}
            activeOpacity={0.75}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.goalsPointerText}>
              Want to change your goals? Head to{' '}
              <Text style={styles.goalsPointerLink}>You → Athlete Hub</Text>.
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Decision Hub — hidden for Pro users with an active plan; they manage goals from Athlete Hub */}
        {!isProWithPlan && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start or build a plan</Text>
          {actionCards.map(card => {
            const isCoach = card.id === 'coach';
            const proLocked = isCoach && tier !== 'pro';
            const featured = card.featured !== undefined ? card.featured : (Boolean(card.badge) || proLocked);
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
        )}
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
  sectionDeemphasised: { opacity: 0.85 },

  goalsPointer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  goalsPointerText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18 },
  goalsPointerLink: { color: colors.primary, fontWeight: fontWeight.semibold },

  trainingBlocksRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  trainingBlocksIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  trainingBlocksLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  trainingBlocksSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  proCoachNote: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
  },

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
  activePlanWeek: { fontSize: fontSize.xs, color: colors.textMuted },
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

  // Block advisor card
  blockCard: {
    borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
    borderWidth: 1,
  },
  blockCardHeadsUp: {
    backgroundColor: colors.surface,
    borderColor: colors.warning + '50',
  },
  blockCardWarning: {
    backgroundColor: colors.surface,
    borderColor: colors.warning + '70',
  },
  blockCardRecovery: {
    backgroundColor: colors.surface,
    borderColor: colors.primary + '50',
  },
  blockCardComplete: {
    backgroundColor: colors.surface,
    borderColor: colors.success + '50',
  },
  blockCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  blockCardIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  blockCardTitle: {
    flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  blockCardBody: {
    fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20,
  },

  // Signal chips
  signalRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
  },
  signalChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.warning + '50',
  },
  signalChipHigh: {
    borderColor: colors.error + '60',
    backgroundColor: colors.error + '10',
  },
  signalChipText: {
    fontSize: fontSize.xs, color: colors.warning, fontWeight: fontWeight.medium,
  },
  signalChipTextHigh: {
    color: colors.error,
  },

  // Next block section
  nextBlockSection: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, gap: spacing.sm,
  },
  nextBlockPreLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.2,
  },
  nextBlockHeadline: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  nextBlockBody: {
    fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20,
  },

  // Block card action buttons
  blockCardActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
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
