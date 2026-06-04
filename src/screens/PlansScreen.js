import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import { SkeletonCard } from '../components/Skeleton';
import PressableCard from '../components/PressableCard';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PeekMenu from '../components/PeekMenu';
import { EmptyPlanIllustration } from '../components/Illustrations';
import {
  getActivePlan, getAllPlansForUser, getArchivedPlansForUser,
  getWorkoutTemplates, getPlanWorkoutCounts, getAllRoutineExerciseCounts,
  activatePlanWithBlock, getRoutinesForPlan, createWorkout, getRoutineExercisesWithDetails,
  archivePlan, unarchivePlan, duplicatePlan, softDeleteRoutine, getActiveBlock,
} from '../lib/database';
import { getBlockAdvice } from '../lib/blockAdvisor';
import { confirmPlanSwitchMidBlock } from '../lib/planSwitch';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { logError } from '../lib/errorLog';

const BLOCK_SNOOZE_KEY = '@volyume_block_snooze';


const ACTION_CARDS_DEFAULT = [
  {
    id: 'library',
    icon: 'library-outline',
    title: 'Plan Library',
    description: 'Browse ready-made plans for different splits, experience levels and goals.',
    screen: 'PlanLibrary',
    badge: 'Recommended',
  },
  {
    id: 'manual',
    icon: 'create-outline',
    title: 'Manual Builder',
    description: 'Create a custom multi-day plan from scratch. You choose every exercise.',
    screen: 'ManualBuilder',
  },
];

// Pro users with an active plan see "switch your active plan" framings.
// "Update goals" sits at the top: it regenerates the plan via the modern
// single-screen ProGoalSetup flow (the old 8-step Coach Builder is gone).
const ACTION_CARDS_PRO_SWITCH = [
  {
    id: 'goals',
    icon: 'flag-outline',
    title: 'Update plan and rebuild',
    description: 'Change anything from your goal and training phase to your weekly schedule, equipment, and experience. We rebuild your plan and nutrition targets around the new answers. History and PRs are kept.',
    screen: 'ProGoalSetup',
  },
  {
    id: 'library',
    icon: 'library-outline',
    title: 'Pick from the Plan Library',
    description: "Ready-made plans by other coaches. Your Precision Coaching keeps adjusting whichever plan you're on.",
    screen: 'PlanLibrary',
  },
  {
    id: 'manual',
    icon: 'create-outline',
    title: 'Build your own',
    description: 'Hand-pick every exercise and day. Coach output keeps reading your data the same way.',
    screen: 'ManualBuilder',
  },
];

const BLOCK_ICON = {
  heads_up: 'alert-circle-outline',
  early_deload: 'battery-charging-outline',
  in_recovery: 'moon-outline',
  post_recovery: 'checkmark-circle-outline',
};

// Weekly cardio card on Plans. Shows the coach target (if one is applied) and
// this week's progress, or just the week's count when cardio is available but
// not allocated. Tap to log. Reads cardio_log for the trailing seven days.
export default function PlansScreen({ navigation }) {
  const toast = useToast();
  // Selector-scoped subscription: only re-render when these specific
  // fields change. Without useShallow, the previous `useAppStore()` call
  // subscribed to every store mutation (rest timer ticks, PR queue
  // updates, set saves) which forced a full PlansScreen re-render every
  // second during a workout.
  const { user, startWorkout, tier, userProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    startWorkout: s.startWorkout,
    tier: s.tier,
    userProfile: s.userProfile,
  })));
  const [activePlan, setActivePlanData] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [archivedPlans, setArchivedPlans] = useState([]);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [planWorkoutCounts, setPlanWorkoutCounts] = useState({});
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [blockAdvice, setBlockAdvice] = useState(null);
  const [blockSnoozed, setBlockSnoozed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const scrollRef = useRef(null);
  const peekRef = useRef(null);
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

  // Cloud restore: re-run loadData once pullFromCloud lands so a fresh
  // device sees the plan / template list populate without navigating
  // away and back.
  const cloudSyncVersion = useAppStore(s => s.cloudSyncVersion);
  useEffect(() => {
    if (!user?.id || cloudSyncVersion === 0) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSyncVersion]);

  async function loadData() {
    if (!user?.id) return;
    try {
      const [active, all, archived, tmpl, pwc, exc, block] = await Promise.all([
        getActivePlan(user.id),
        getAllPlansForUser(user.id),
        getArchivedPlansForUser(user.id),
        getWorkoutTemplates(user.id),
        getPlanWorkoutCounts(),
        getAllRoutineExerciseCounts(),
        getActiveBlock(user.id),
      ]);
      setActivePlanData(active || null);
      setMyPlans(all.filter(p => !active || p.id !== active.id));
      setArchivedPlans(archived || []);
      setTemplates(tmpl);
      setPlanWorkoutCounts(pwc);
      setExerciseCounts(exc);

      if (block) {
        const advice = await getBlockAdvice(user.id, block, userProfile).catch(() => null);
        setBlockAdvice(advice);

        // Any non-continue advice, heads_up included, respects the 7-day
        // snooze so tapping "Got it" keeps the card dismissed across tab
        // focus instead of reappearing on every visit.
        if (advice && advice.action !== 'continue') {
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
    } catch (_e) {
    } finally {
      setLoaded(true);
    }
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
            try {
              await activatePlanWithBlock(user.id, activePlan.id, activePlan.name);
              await AsyncStorage.removeItem(BLOCK_SNOOZE_KEY).catch(() => {});
              await loadData();
            } catch (e) {
              logError('PlansScreen.handleRestartPlan', e, { userId: user?.id, planId: activePlan?.id });
              toast.show("Couldn't restart plan, try again", { variant: 'error' });
            }
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
    try {
      const routines = await getRoutinesForPlan(plan.id);
      if (routines.length === 0) {
        toast.show('This plan has no workouts yet', { variant: 'warning' });
        return;
      }
      const idx = (plan.nextWorkoutIndex || 0) % routines.length;
      const routine = routines[idx];
      const workout = await createWorkout(user.id, routine.id);
      const withExercises = await getRoutineExercisesWithDetails(routine.id);
      const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
        exercise, routineExercise, sets: [],
        supersetGroupId: routineExercise?.supersetGroupId ?? null,
      }));
      startWorkout(workout, initialExercises);
      navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
    } catch (e) {
      logError('PlansScreen.handleStartNextWorkout', e, { userId: user?.id, planId: plan?.id });
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    }
  }

  async function handleSetActive(plan) {
    try {
      const ok = await confirmPlanSwitchMidBlock(user.id, { newPlanName: plan.name });
      if (!ok) return;
      await activatePlanWithBlock(user.id, plan.id, plan.name);
      await loadData();
    } catch (e) {
      logError('PlansScreen.handleSetActive', e, { userId: user?.id, planId: plan?.id });
      toast.show("Couldn't set active plan, try again", { variant: 'error' });
    }
  }

  async function handlePlanOptions(plan) {
    const isActiveForUser = activePlan?.id === plan.id;
    // Pro users keep an always-active plan as part of Precision Coaching,
    // so they don't get the Duplicate action. They CAN archive inactive
    // plans though, with restore available from the Archived section.
    const items = [
      {
        icon: 'eye-outline',
        label: 'View plan',
        onPress: () => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false }),
      },
      {
        icon: 'play-circle-outline',
        label: 'Set active',
        onPress: () => handleSetActive(plan),
      },
    ];
    if (tier !== 'pro') {
      items.push({
        icon: 'copy-outline',
        label: 'Duplicate',
        onPress: async () => {
          const copy = await duplicatePlan(plan.id, user.id);
          await loadData();
          navigation.navigate('PlanDetail', { planId: copy.id, isLibrary: false });
        },
      });
    }
    if (!isActiveForUser) {
      items.push({
        icon: 'archive-outline',
        label: 'Archive plan',
        destructive: true,
        onPress: () => Alert.alert(
          'Archive Plan?',
          'The plan will be hidden from My plans. Session history stays intact and you can restore it from the Archived section.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Archive', style: 'destructive', onPress: async () => { await archivePlan(plan.id); await loadData(); } },
          ],
        ),
      });
    }
    peekRef.current?.open({ title: plan.name, items });
  }

  function handleArchivedPlanOptions(plan) {
    const items = [
      {
        icon: 'eye-outline',
        label: 'View plan',
        onPress: () => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false }),
      },
      {
        icon: 'arrow-undo-outline',
        label: 'Restore plan',
        onPress: async () => { await unarchivePlan(plan.id); await loadData(); },
      },
    ];
    peekRef.current?.open({ title: plan.name, items });
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
      logError('PlansScreen.handleStartTemplate', e, { userId: user?.id, routineId: routine?.id });
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    }
  }

  function blockIconColor(action) {
    if (action === 'in_recovery') return colors.primary;
    if (action === 'post_recovery') return colors.success;
    return colors.warning;
  }

  const showBlockCard = blockAdvice && activePlan &&
    blockAdvice.action !== 'continue' &&
    !blockSnoozed;

  const isProWithPlan = tier === 'pro' && !!activePlan;
  // Three audiences share this list:
  //   * Pro with an active plan → "switch / re-run wizard" framing
  //   * Pro with active plan → switch framings (update goals / library / manual)
  //   * Pro without a plan (rare, just after first sign-up) → default order
  //   * Free → default order (library first, manual second)
  // Every Pro user gets the coached-builder card set, not only those who
  // already have an active plan. A new Pro user with no plan previously fell
  // through to the Free default set and had no way to reach the coach builder
  // from the Plans tab (onboarding audit, C8).
  const actionCards = tier === 'pro' ? ACTION_CARDS_PRO_SWITCH : ACTION_CARDS_DEFAULT;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <ScreenHeader title="Plans" />

        {/* First-load skeleton: mirror the active-plan hero + a couple of
            plan cards so the screen doesn't flash empty states before data
            arrives. Refreshes (pull-to-refresh, focus) keep the real
            content, since `loaded` stays true after the first pass. */}
        {!loaded ? (
          <View style={styles.skeletonWrap}>
            <SkeletonCard height={120} />
            <SkeletonCard height={72} />
            <SkeletonCard height={72} />
          </View>
        ) : null}

        {loaded ? (
          <>
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

            {/* Signal chips, shown for early_deload and heads_up */}
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
                      onPress={() => navigation.navigate(tier === 'pro' ? 'ProGoalSetup' : 'ProUpgrade')}
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
                  <Text style={styles.blockRestartBtnText}>Got it, ease off this week</Text>
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

            {/* Heads-up acknowledge: lets the user close the banner once
                they've read it. Reuses the same 7-day snooze used by the
                recovery states; the next weekly check-in (or fresh signals)
                will surface the banner again if conditions still apply. */}
            {blockAdvice.action === 'heads_up' && (
              <TouchableOpacity onPress={handleSnoozeBlock} style={styles.blockSnooze}>
                <Text style={styles.blockSnoozeText}>Got it</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Active Plan */}
        {activePlan ? (
          <View style={styles.section}>
            <View style={styles.activePlanCard}>
              <View style={styles.activePlanHeader}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
                <TouchableOpacity onPress={() => handlePlanOptions(activePlan)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Plan options">
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
                  Your Precision Coaching adjusts this plan as you progress and check in. Change your goals or switch to a different plan from the options below.
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
            {myPlans.map((plan, i) => (
              <AnimatedEntrance key={plan.id} index={i}>
              <View style={styles.planCard}>
                <PressableCard
                  style={styles.planCardBody}
                  onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false })}
                  onLongPress={() => handlePlanOptions(plan)}
                  accessibilityLabel={plan.name}
                >
                  <View style={styles.planCardMetaRow}>
                    {planWorkoutCounts[plan.id] ? (
                      <Text style={styles.planCardMeta}>
                        {planWorkoutCounts[plan.id]} workout{planWorkoutCounts[plan.id] !== 1 ? 's' : ''}
                      </Text>
                    ) : <View />}
                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={() => handlePlanOptions(plan)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel="Plan options"
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.planCardName} numberOfLines={2}>{plan.name}</Text>
                </PressableCard>
                <View style={styles.planCardFooter}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.planCardFooterGhost}>View plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSetActive(plan)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.planCardFooterPrimary}>Set as active</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </AnimatedEntrance>
            ))}
          </View>
        )}

        {/* Archived Plans */}
        {archivedPlans.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.archivedHeader}
              onPress={() => setArchivedExpanded(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.archivedHeaderText}>
                Archived plans · {archivedPlans.length}
              </Text>
              <Ionicons
                name={archivedExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {archivedExpanded && archivedPlans.map(plan => (
              <View key={plan.id} style={[styles.planCard, styles.archivedPlanCard]}>
                <PressableCard
                  style={styles.planCardBody}
                  onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false })}
                  onLongPress={() => handleArchivedPlanOptions(plan)}
                  accessibilityLabel={plan.name}
                >
                  <View style={styles.planCardMetaRow}>
                    {planWorkoutCounts[plan.id] ? (
                      <Text style={styles.planCardMeta}>
                        {planWorkoutCounts[plan.id]} workout{planWorkoutCounts[plan.id] !== 1 ? 's' : ''}
                      </Text>
                    ) : <View />}
                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={() => handleArchivedPlanOptions(plan)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel="Archived plan options"
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.planCardName, styles.archivedPlanCardName]} numberOfLines={2}>{plan.name}</Text>
                </PressableCard>
                <View style={styles.planCardFooter}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.planCardFooterGhost}>View plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => { await unarchivePlan(plan.id); await loadData(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.planCardFooterPrimary}>Restore</Text>
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
                    accessibilityRole="button"
                    accessibilityLabel="Routine options"
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

        {/* Decision Hub, visible to everyone. Section title and copy adapt:
            Pro with active plan → "Switch your plan", Free / no plan → "Start or build a plan". */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isProWithPlan ? 'Switch your plan' : 'Start or build a plan'}
          </Text>
          {isProWithPlan && (
            <Text style={styles.sectionSubtitle}>
              Your check-ins, PRs, and coach output keep working whichever plan you choose. Activating a new plan starts a fresh training block.
            </Text>
          )}
          {actionCards.map(card => {
            const featured = card.featured !== undefined ? card.featured : Boolean(card.badge);
            return (
              <PressableCard
                key={card.id}
                style={[styles.actionCard, featured && styles.actionCardFeatured]}
                onPress={() => navigation.navigate(card.screen)}
                accessibilityLabel={card.title}
              >
                <View style={[styles.actionCardIcon, featured && styles.actionCardIconFeatured]}>
                  <Ionicons name={card.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.actionCardBody}>
                  <View style={styles.actionCardTitleRow}>
                    <Text style={styles.actionCardTitle}>{card.title}</Text>
                    {card.badge ? (
                      <View style={styles.actionCardBadge}>
                        <Text style={styles.actionCardBadgeText}>{card.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.actionCardDesc}>{card.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={featured ? colors.primary : colors.textMuted} />
              </PressableCard>
            );
          })}
        </View>
          </>
        ) : null}

        {/* "Cardio this week" moved to the Progress tab (founder 2026-06-03):
            it is a tracking surface, not a plan. */}
      </ScrollView>
      <PeekMenu ref={peekRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  cardioCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  cardioHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardioTitle: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  cardioHistoryLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  cardioSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  cardioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: radius.sm,
  },
  cardioBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  skeletonWrap: { gap: spacing.lg },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  section: { gap: spacing.md },
  sectionTitle: { ...type.label, color: colors.textSecondary },
  sectionSubtitle: { ...type.caption, color: colors.textMuted, marginTop: -spacing.sm },
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
  trainingBlocksLabel: { ...type.bodyStrong, color: colors.textPrimary },
  trainingBlocksSub: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
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
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251), gap: spacing.md,
  },
  activePlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.376),
  },
  activeBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.black, letterSpacing: 1 },
  activePlanName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  activePlanMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  activePlanWeek: { ...type.num('caption'), color: colors.textMuted },
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
  viewPlanBtnText: { ...type.label, color: colors.textSecondary },

  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  archivedPlanCard: { opacity: 0.7 },
  archivedPlanCardName: { color: colors.textSecondary },
  archivedHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  archivedHeaderText: {
    ...type.label, color: colors.textSecondary,
  },
  planCardBody: { padding: spacing.lg, gap: spacing.sm },
  planCardMetaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  planCardName: { ...type.bodyStrong, color: colors.textPrimary },
  planCardMeta: { ...type.num('caption'), color: colors.textSecondary },
  planCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  planCardFooterGhost: { ...type.label, color: colors.textSecondary },
  planCardFooterPrimary: { ...type.label, color: colors.primary },
  moreBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  templateCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  templateMain: { flex: 1, gap: spacing.xs },
  templateName: { ...type.bodyStrong, color: colors.textPrimary },
  templateMeta: { ...type.num('caption'), color: colors.textSecondary },
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
  actionCardTitle: { ...type.bodyStrong, color: colors.textPrimary },
  actionCardBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251),
  },
  actionCardBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.primary, letterSpacing: 0.5 },
  actionCardDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  actionCardFeatured: {
    borderColor: withAlpha(colors.primary, 0.251),
    backgroundColor: colors.primaryBg,
  },
  actionCardIconFeatured: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.primary, 0.251),
  },
  // Pro-locked variant, matches the shared lockedCard pattern so gating
  // reads the same across the app.
  actionCardLocked: { opacity: 0.6 },
  actionCardTitleLocked: { color: colors.textSecondary },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  lockBadgeText: {
    fontSize: fontSize.micro, fontWeight: fontWeight.semibold, color: colors.textMuted,
  },

  // Block advisor card
  blockCard: {
    borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
    borderWidth: 1,
  },
  blockCardHeadsUp: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.warning, 0.314),
  },
  blockCardWarning: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.warning, 0.439),
  },
  blockCardRecovery: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.primary, 0.314),
  },
  blockCardComplete: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.success, 0.314),
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
    flex: 1, ...type.bodyStrong, color: colors.textPrimary,
  },
  blockCardBody: {
    fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20,
  },

  // Signal chips
  signalRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
  },
  signalChip: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    borderWidth: 1, borderColor: withAlpha(colors.warning, 0.314),
  },
  signalChipHigh: {
    borderColor: withAlpha(colors.error, 0.376),
    backgroundColor: withAlpha(colors.error, 0.063),
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
    ...type.bodyStrong, color: colors.textPrimary,
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
  blockNewBtnText: { ...type.label, color: colors.textSecondary },
  blockSnooze: { alignItems: 'center', paddingTop: spacing.xs },
  blockSnoozeText: { ...type.caption, color: colors.textMuted },

  // Training days picker
  trainingDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  dayChipLabelOn: {
    color: colors.background,
  },
  trainingDaysHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
