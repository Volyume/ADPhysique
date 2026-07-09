import { useState, useCallback, useRef, useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Modal, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle, alpha } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import { SkeletonCard } from '../components/Skeleton';
import Button from '../components/Button';
import Card from '../components/Card';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import PressableCard from '../components/PressableCard';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PeekMenu from '../components/PeekMenu';
import {
  getActivePlan, getAllPlansForUser, getArchivedPlansForUser,
  getWorkoutTemplates, getPlanWorkoutCounts, getAllRoutineExerciseCounts,
  activatePlanWithBlock, getRoutinesForPlan, createWorkout, getRoutineExercisesWithDetails,
  archivePlan, unarchivePlan, duplicatePlan, softDeleteRoutine, getActiveBlock,
  getPlanFolders, createPlanFolder, renamePlanFolder, deletePlanFolder, setPlanFolder,
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
    title: 'Plan library',
    description: 'Browse ready-made plans by split, experience level and goal.',
    screen: 'PlanLibrary',
    badge: 'Recommended',
  },
  {
    id: 'manual',
    icon: 'create-outline',
    title: 'Create your own',
    description: 'Create a custom multi-day plan and choose every exercise yourself.',
    screen: 'ManualBuilder',
  },
];

// Pro users with an active plan see "switch your active plan" framings.
// "Adjust training plan" sits at the top: it rebuilds the plan via the
// training-only PlanUpdate screen. Goal and calorie/macro changes live in the
// Coach tab (Update goal and phase / Nutrition targets), so this Train-side flow never
// touches nutrition targets.
const ACTION_CARDS_PRO_SWITCH = [
  {
    id: 'goals',
    icon: 'flag-outline',
    title: 'Adjust training plan',
    description: 'Change schedule, equipment, experience, division or weak points. Volyume previews the rebuild before it replaces your active plan.',
    screen: 'PlanUpdate',
  },
  {
    id: 'library',
    icon: 'library-outline',
    title: 'Pick from the plan library',
    description: "Choose a ready-made plan. The Coach keeps adjusting whichever plan you're on.",
    screen: 'PlanLibrary',
  },
  {
    id: 'manual',
    icon: 'create-outline',
    title: 'Create your own',
    description: 'Create your own plan and choose every exercise. The Coach keeps reading your training the same way.',
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
  // Plan folders (Hevy teardown R1): organise the My plans list. FREE, no Pro gate.
  const [folders, setFolders] = useState([]);
  const [collapsedFolders, setCollapsedFolders] = useState({});
  // Name prompt drives both create and rename. { mode: 'create' | 'rename', folder }.
  const [folderPrompt, setFolderPrompt] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const [active, all, archived, tmpl, pwc, exc, block, folderRows] = await Promise.all([
        getActivePlan(user.id),
        getAllPlansForUser(user.id),
        getArchivedPlansForUser(user.id),
        getWorkoutTemplates(user.id),
        getPlanWorkoutCounts(),
        getAllRoutineExerciseCounts(),
        getActiveBlock(user.id),
        getPlanFolders(user.id),
      ]);
      setActivePlanData(active || null);
      setMyPlans(all.filter(p => !active || p.id !== active.id));
      setFolders(folderRows || []);
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
    appAlert(
      'Restart this plan?',
      "A new training block starts today with the same workouts. Aim to match or improve on last time's weights.",
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

  function toggleFolder(folderId) {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  function openRenameFolder(folder) {
    setFolderName(folder.name);
    setFolderPrompt({ mode: 'rename', folder });
  }

  async function handleSaveFolder() {
    const name = folderName.trim();
    if (!name || savingFolder) return;
    // Block a duplicate name (case-insensitive). On rename the folder may keep
    // its own name; only a *different* folder sharing the name is a clash.
    const editingId = folderPrompt?.mode === 'rename' ? folderPrompt.folder?.id : null;
    const clash = folders.some(
      f => f.id !== editingId && (f.name || '').trim().toLowerCase() === name.toLowerCase(),
    );
    if (clash) {
      toast.show('A folder with that name already exists', { variant: 'warning' });
      return;
    }
    setSavingFolder(true);
    try {
      if (folderPrompt?.mode === 'rename' && folderPrompt.folder) {
        await renamePlanFolder(folderPrompt.folder.id, name);
      } else {
        await createPlanFolder(user.id, name);
      }
      setFolderPrompt(null);
      setFolderName('');
      await loadData();
    } catch (e) {
      logError('PlansScreen.handleSaveFolder', e, { userId: user?.id });
      toast.show("Couldn't save folder, try again", { variant: 'error' });
    } finally {
      setSavingFolder(false);
    }
  }

  function handleDeleteFolder(folder) {
    appAlert(
      'Delete folder?',
      `"${folder.name}" will be removed. Its plans are kept and moved back to My plans.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete folder',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlanFolder(folder.id);
              await loadData();
            } catch (e) {
              logError('PlansScreen.handleDeleteFolder', e, { userId: user?.id, folderId: folder?.id });
              toast.show("Couldn't delete folder, try again", { variant: 'error' });
            }
          },
        },
      ],
    );
  }

  function handleFolderOptions(folder) {
    peekRef.current?.open({
      title: folder.name,
      items: [
        { icon: 'create-outline', label: 'Rename folder', onPress: () => openRenameFolder(folder) },
        {
          icon: 'trash-outline', label: 'Delete folder', destructive: true,
          onPress: () => handleDeleteFolder(folder),
        },
      ],
    });
  }

  async function handleMovePlanToFolder(plan, folderId) {
    try {
      await setPlanFolder(plan.id, folderId);
      await loadData();
    } catch (e) {
      logError('PlansScreen.handleMovePlanToFolder', e, { userId: user?.id, planId: plan?.id });
      toast.show("Couldn't move plan, try again", { variant: 'error' });
    }
  }

  // "Move to folder" peek: lists every folder plus "No folder" to unfile.
  function handleMovePlanOptions(plan) {
    const items = folders.map(f => ({
      icon: plan.folderId === f.id ? 'checkmark-circle-outline' : 'folder-outline',
      label: f.name,
      onPress: () => handleMovePlanToFolder(plan, f.id),
    }));
    items.push({
      icon: plan.folderId == null ? 'checkmark-circle-outline' : 'remove-circle-outline',
      label: 'No folder',
      onPress: () => handleMovePlanToFolder(plan, null),
    });
    peekRef.current?.open({ title: `Move ${plan.name}`, items });
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
      {
        icon: 'folder-outline',
        label: plan.folderId ? 'Move to another folder' : 'Move to folder',
        onPress: () => handleMovePlanOptions(plan),
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
        onPress: () => appAlert(
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
    appAlert(routine.name, undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('RoutineDetail', { routineId: routine.id }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => appAlert(
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
  // Two card sets cover three audiences:
  //   * Pro with an active plan → switch framings (update goals / library / manual)
  //   * Pro without a plan (rare, just after first sign-up) → same Pro set
  //   * Free → default order (library first, manual second)
  // Every Pro user gets the coached-builder card set, not only those who
  // already have an active plan. A new Pro user with no plan previously fell
  // through to the Free default set and had no way to reach the coach builder
  // from the Train tab (onboarding audit, C8).
  const actionCards = tier === 'pro' ? ACTION_CARDS_PRO_SWITCH : ACTION_CARDS_DEFAULT;

  // Group the non-active plans by folder. Plans whose folder_id is null (or
  // points at a now-deleted folder) fall through to the unfiled "My plans"
  // list, so a plan can never become unreachable.
  const folderIds = new Set(folders.map(f => f.id));
  const plansByFolder = {};
  const unfiledPlans = [];
  for (const plan of myPlans) {
    if (plan.folderId && folderIds.has(plan.folderId)) {
      (plansByFolder[plan.folderId] = plansByFolder[plan.folderId] || []).push(plan);
    } else {
      unfiledPlans.push(plan);
    }
  }

  // One plan card, shared by the folder sections and the unfiled list so the
  // card, its options menu and footer stay identical wherever a plan lives.
  function renderPlanCard(plan, i) {
    return (
      <AnimatedEntrance key={plan.id} index={i}>
      <Card padding="none" style={styles.planCard}>
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
            accessibilityRole="button"
            accessibilityLabel={`View ${plan.name}`}
          >
            <Text style={styles.planCardFooterGhost}>View plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSetActive(plan)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Set ${plan.name} as active plan`}
          >
            <Text style={styles.planCardFooterPrimary}>Set as active</Text>
          </TouchableOpacity>
        </View>
      </Card>
      </AnimatedEntrance>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <ScreenHeader title="Train" />

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
          <Card style={[
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
                    <TouchableOpacity style={styles.blockRestartBtn} onPress={handleRestartPlan} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={blockAdvice.nextBlock.actionLabel}>
                      <Ionicons name="refresh-outline" size={15} color={colors.onPrimary} />
                      <Text style={styles.blockRestartBtnText}>{blockAdvice.nextBlock.actionLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.blockNewBtn}
                      onPress={() => navigation.navigate(tier === 'pro' ? 'PlanUpdate' : 'ProUpgrade')}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={blockAdvice.nextBlock.secondaryLabel}
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
                <TouchableOpacity style={styles.blockRestartBtn} onPress={handleSnoozeBlock} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Got it, ease off this week">
                  <Text style={styles.blockRestartBtnText}>Got it, ease off this week</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.blockNewBtn} onPress={handleSnoozeBlock} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Keep going">
                  <Text style={styles.blockNewBtnText}>Keep going</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Snooze links for recovery states */}
            {(blockAdvice.action === 'in_recovery' || blockAdvice.action === 'post_recovery') && (
              <TouchableOpacity
                onPress={handleSnoozeBlock}
                style={styles.blockSnooze}
                accessibilityRole="button"
                accessibilityLabel={blockAdvice.action === 'in_recovery'
                  ? 'Remind me after recovery week'
                  : 'Not quite ready. Remind me later.'}
              >
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
              <TouchableOpacity onPress={handleSnoozeBlock} style={styles.blockSnooze} accessibilityRole="button" accessibilityLabel="Got it">
                <Text style={styles.blockSnoozeText}>Got it</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Active Plan */}
        {activePlan ? (
          <View style={styles.section}>
            <Card style={styles.activePlanCard}>
              <View style={styles.activePlanHeader}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
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
                  The Coach adjusts this plan as you progress and check in. Change training setup or switch plans from the options below.
                </Text>
              )}
              <View style={styles.activePlanActions}>
                <TouchableOpacity
                  style={styles.startNextBtn}
                  onPress={() => handleStartNextWorkout(activePlan)}
                  accessibilityRole="button"
                  accessibilityLabel="Start next workout"
                >
                  <Ionicons name="play" size={15} color={colors.onPrimary} />
                  <Text style={styles.startNextBtnText}>Start next workout</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewPlanBtn}
                  onPress={() => navigation.navigate('PlanDetail', { planId: activePlan.id, isLibrary: false })}
                  accessibilityRole="button"
                  accessibilityLabel="View plan"
                >
                  <Text style={styles.viewPlanBtnText}>View plan</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        ) : tier !== 'pro' ? (
          /* B2: the free no-plan state is a proper card, sitting where the
             active plan card would be, so a new user never scrolls past
             empty sections looking for a way in. Quiz first, library second. */
          <Card style={styles.noPlanCard}>
            <View style={styles.noPlanCardHeader}>
              <View style={styles.noPlanCardIcon}>
                <Ionicons name="compass-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.noPlanCardTitle}>No active plan yet</Text>
            </View>
            <Text style={styles.noPlanCardBody}>
              Answer a few quick questions and we'll suggest a starter plan, or browse the library if you'd rather choose yourself.
            </Text>
            <View style={styles.noPlanCardActions}>
              <Button
                title="Start with a plan"
                onPress={() => navigation.navigate('FreeStarter')}
                accessibilityLabel="Answer three quick questions to start with a plan"
              />
              <Button
                title="Browse plans"
                variant="secondary"
                onPress={() => navigation.navigate('PlanLibrary')}
                accessibilityLabel="Browse the plan library"
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.noActivePlanRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.noActivePlanText}>
              No active plan · Start with a plan, browse the library, or create your own.
            </Text>
          </Card>
        )}

        {/* Folders are only shown when they already exist. Folder creation is
            intentionally hidden from the main Train surface to keep the core
            coaching flow clean. */}
        {folders.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Folders</SectionLabel>
            {folders.map(folder => {
              const filed = plansByFolder[folder.id] || [];
              const collapsed = !!collapsedFolders[folder.id];
              return (
                <View key={folder.id} style={styles.folderBlock}>
                  <TouchableOpacity
                    style={styles.folderHeader}
                    onPress={() => toggleFolder(folder.id)}
                    onLongPress={() => handleFolderOptions(folder)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !collapsed }}
                    accessibilityLabel={`${folder.name}, ${filed.length} plan${filed.length !== 1 ? 's' : ''}`}
                  >
                    <Ionicons
                      name={collapsed ? 'chevron-forward' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Ionicons name="folder-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                    <Text style={styles.folderCount}>{filed.length}</Text>
                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={() => handleFolderOptions(folder)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${folder.name} folder options`}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {!collapsed && (
                    filed.length > 0
                      ? <View style={styles.folderBody}>{filed.map((plan, i) => renderPlanCard(plan, i))}</View>
                      : <Text style={styles.folderEmpty}>No plans in here yet. Use a plan&apos;s options to move it in.</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* My Plans (unfiled). Plans not in any folder, or whose folder was
            deleted, always live here so a plan is never hidden. */}
        {unfiledPlans.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>My plans</SectionLabel>
            {unfiledPlans.map((plan, i) => renderPlanCard(plan, i))}
          </View>
        )}

        {/* Archived Plans */}
        {archivedPlans.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.archivedHeader}
              onPress={() => setArchivedExpanded(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityState={{ expanded: archivedExpanded }}
              accessibilityLabel={`Archived plans, ${archivedPlans.length}`}
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
              <Card key={plan.id} padding="none" style={[styles.planCard, styles.archivedPlanCard]}>
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
                    accessibilityRole="button"
                    accessibilityLabel={`View ${plan.name}`}
                  >
                    <Text style={styles.planCardFooterGhost}>View plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => { await unarchivePlan(plan.id); await loadData(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Restore ${plan.name}`}
                  >
                    <Text style={styles.planCardFooterPrimary}>Restore</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Workout Templates */}
        {templates.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Workout templates</SectionLabel>
            <Text style={styles.sectionSubtitle}>Saved workouts you can start directly.</Text>
            {templates.map(routine => (
              <Card key={routine.id} style={styles.templateCard}>
                <View style={styles.templateMain}>
                  <Text style={styles.templateName} numberOfLines={2}>{routine.name}</Text>
                  {exerciseCounts[routine.id] ? (
                    <Text style={styles.templateMeta}>{exerciseCounts[routine.id]} exercises</Text>
                  ) : null}
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={styles.startTemplateBtn}
                    onPress={() => handleStartTemplate(routine)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${routine.name}`}
                  >
                    <Ionicons name="play" size={13} color={colors.onPrimary} />
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
              </Card>
            ))}
          </View>
        )}

        {/* Training Blocks */}
        <Card
          style={styles.trainingBlocksRow}
          onPress={() => navigation.navigate('MesocycleBuilder')}
          accessibilityLabel="Training blocks"
        >
          <View style={styles.trainingBlocksIcon}>
            <Ionicons name="layers-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trainingBlocksLabel}>Training blocks</Text>
            <Text style={styles.trainingBlocksSub}>View completed blocks and long-term progress</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Card>

        {/* Decision Hub, visible to everyone. Section title and copy adapt:
            Pro with active plan → "Switch your plan", Free / no plan → "Start with a plan". */}
        <View style={styles.section}>
          <SectionLabel>
            {isProWithPlan ? 'Switch your plan' : 'Start with a plan'}
          </SectionLabel>
          {isProWithPlan && (
            <Text style={styles.sectionSubtitle}>
              Your check-ins, PRs, and coach output keep working whichever plan you choose. Activating a new plan starts a fresh training block.
            </Text>
          )}
          {actionCards.map(card => {
            const featured = card.featured !== undefined ? card.featured : Boolean(card.badge);
            return (
              <Card
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
              </Card>
            );
          })}
        </View>
          </>
        ) : null}

        {/* "Cardio this week" moved to the Progress tab (founder 2026-06-03):
            it is a tracking surface, not a plan. */}
      </ScrollView>
      <PeekMenu ref={peekRef} />

      {/* Folder name prompt, shared by create + rename. */}
      <Modal
        visible={!!folderPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!savingFolder) setFolderPrompt(null); }}
      >
        <KeyboardAvoidingView
          style={styles.folderModalFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={styles.backdrop} onPress={() => { if (!savingFolder) setFolderPrompt(null); }}>
            <Pressable style={styles.folderSheet} onPress={() => {}} accessible={false}>
              <Text style={styles.folderSheetTitle}>Rename folder</Text>
              <TextField
                fieldStyle={styles.folderInputField}
                inputStyle={styles.folderInput}
                value={folderName}
                onChangeText={setFolderName}
                placeholder="Folder name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={handleSaveFolder}
                accessibilityLabel="Folder name"
              />
              <View style={styles.folderSheetActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  style={styles.folderSheetCancelButton}
                  textStyle={styles.folderSheetCancel}
                  onPress={() => { if (!savingFolder) setFolderPrompt(null); }}
                  disabled={savingFolder}
                  accessibilityLabel="Cancel"
                />
                <Button
                  title="Save"
                  size="sm"
                  fullWidth={false}
                  style={styles.folderSheetSaveButton}
                  textStyle={styles.folderSheetSave}
                  onPress={handleSaveFolder}
                  disabled={!folderName.trim() || savingFolder}
                  loading={savingFolder}
                  accessibilityLabel="Save folder name"
                  accessibilityState={{ disabled: !folderName.trim() || savingFolder }}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  skeletonWrap: { gap: spacing.lg },
  section: { gap: spacing.md },
  sectionSubtitle: { ...type.caption, color: colors.textMuted, marginTop: -spacing.sm },

  // Folders (Hevy teardown R1)
  foldersHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  folderBlock: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    backgroundColor: colors.surface, overflow: 'hidden',
  },
  folderHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  folderName: { flex: 1, ...type.bodyStrong, color: colors.textPrimary },
  folderCount: { ...type.num('caption'), color: colors.textMuted },
  folderBody: {
    gap: spacing.md, padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  folderEmpty: {
    ...type.caption, color: colors.textMuted,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },

  // Folder name prompt
  folderModalFill: { flex: 1 },
  backdrop: {
    flex: 1, backgroundColor: withAlpha(colors.background, 0.7),
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  folderSheet: {
    width: '100%', maxWidth: 420, gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  folderSheetTitle: { ...type.bodyStrong, color: colors.textPrimary },
  folderInputField: { borderRadius: radius.md },
  folderInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  folderSheetActions: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm,
  },
  folderSheetCancelButton: { borderRadius: radius.md },
  folderSheetCancel: { ...type.label, color: colors.textSecondary },
  folderSheetSaveButton: { borderRadius: radius.md },
  folderSheetSave: { ...type.label },

  trainingBlocksRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
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
  },
  noActivePlanText: { ...type.bodySm, flex: 1, color: colors.textMuted },

  // B2: free no-plan card. The on-ramp sits where the active plan would be.
  noPlanCard: {
    borderColor: withAlpha(colors.primary, alpha.edge), gap: spacing.md,
  },
  noPlanCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  noPlanCardIcon: {
    width: 36, height: 36, borderRadius: circle(36),
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.mid),
  },
  noPlanCardTitle: { flex: 1, ...type.bodyStrong, color: colors.textPrimary },
  noPlanCardBody: { ...type.bodySm, color: colors.textSecondary },
  noPlanCardActions: { gap: spacing.sm },

  activePlanCard: {
    borderColor: withAlpha(colors.primary, alpha.edge), gap: spacing.md,
  },
  activePlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.strong),
  },
  activeBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.black },
  activePlanName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  activePlanMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  activePlanWeek: { ...type.num('caption'), color: colors.textMuted },
  activePlanActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  startNextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.primaryFill, borderRadius: radius.md, paddingVertical: spacing.md,
    minHeight: 48,
  },
  startNextBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.onPrimary },
  viewPlanBtn: {
    paddingHorizontal: spacing.lg, borderRadius: radius.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  viewPlanBtnText: { ...type.label, color: colors.textSecondary },

  planCard: {
    overflow: 'hidden',
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  templateMain: { flex: 1, gap: spacing.xs },
  templateName: { ...type.bodyStrong, color: colors.textPrimary },
  templateMeta: { ...type.num('caption'), color: colors.textSecondary },
  templateActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startTemplateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primaryFill, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    minHeight: 44,
  },
  startTemplateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.onPrimary },

  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
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
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.edge),
  },
  actionCardBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.primary },
  actionCardDesc: { ...type.captionTight, color: colors.textMuted },
  actionCardFeatured: {
    borderColor: withAlpha(colors.primary, alpha.edge),
    backgroundColor: colors.primaryBg,
  },
  actionCardIconFeatured: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.primary, alpha.edge),
  },
  // Block advisor card
  blockCard: {
    gap: spacing.md,
  },
  blockCardHeadsUp: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.warning, alpha.mid),
  },
  blockCardWarning: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.warning, alpha.strong),
  },
  blockCardRecovery: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.primary, alpha.mid),
  },
  blockCardComplete: {
    backgroundColor: colors.surface,
    borderColor: withAlpha(colors.success, alpha.mid),
  },
  blockCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  blockCardIconWrap: {
    width: 36, height: 36, borderRadius: circle(36),
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  blockCardTitle: {
    flex: 1, ...type.bodyStrong, color: colors.textPrimary,
  },
  blockCardBody: {
    ...type.bodySm, color: colors.textSecondary,
  },

  // Signal chips
  signalRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
  },
  signalChip: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    borderWidth: 1, borderColor: withAlpha(colors.warning, alpha.mid),
  },
  signalChipHigh: {
    borderColor: withAlpha(colors.error, alpha.strong),
    backgroundColor: withAlpha(colors.error, alpha.ghost),
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
    color: colors.textMuted,
  },
  nextBlockHeadline: {
    ...type.bodyStrong, color: colors.textPrimary,
  },
  nextBlockBody: {
    ...type.bodySm, color: colors.textSecondary,
  },

  // Block card action buttons
  blockCardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  blockRestartBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.primaryFill, borderRadius: radius.md, paddingVertical: spacing.md,
    minWidth: 144,
    minHeight: 48,
  },
  blockRestartBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.onPrimary },
  blockNewBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    minWidth: 144,
    minHeight: 48,
  },
  blockNewBtnText: { ...type.label, color: colors.textSecondary },
  blockSnooze: { alignItems: 'center', paddingTop: spacing.xs },
  blockSnoozeText: { ...type.caption, color: colors.textMuted },
});
