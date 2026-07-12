import { useState, useCallback, useMemo } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import {
  getProgrammeById, getRoutinesForPlan, getAllRoutineExerciseCounts,
  activatePlanWithBlock, archivePlan, duplicatePlan, copyPlanFromLibrary,
  createWorkout, getRoutineExercisesWithDetails, getActivePlan, getAllRoutineSetCounts,
  updateRoutinePosition,
} from '../lib/database';
import { PLAN_WHYTHIS_KEY } from '../lib/planAutoGen';
import { planHeadingName } from '../lib/planDisplay';
import Button from '../components/Button';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import BackHeader from '../components/BackHeader';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError } from '../lib/errorLog';
import { useToast } from '../components/Toast';
import { confirmPlanSwitchMidBlock } from '../lib/planSwitch';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import DragReorderList from '../components/DragReorderList';
import { useDragAutoScrollBridge } from '../components/DragReorderList';
import * as haptics from '../lib/haptics';

// Same reading order the enrollment reveal uses: how the week is structured,
// then why the volume and progression, then exercise selection and the
// recovery / nutrition adjustments that shaped it.
const WHY_ORDER = ['schedule', 'goal', 'experience', 'progression', 'equipment', 'recovery', 'nutrition', 'weakPoints'];

export default function PlanDetailScreen({ navigation, route }) {
  const { planId, isLibrary = false } = route.params || {};
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, startWorkout, tier } = useAppStore(useShallow(s => ({
    user: s.user,
    startWorkout: s.startWorkout,
    tier: s.tier,
  })));
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [setCounts, setSetCounts] = useState({});
  const [activePlan, setActivePlanData] = useState(null);
  const [whyThis, setWhyThis] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  // D35: edge auto-scroll for the workouts drag-reorder list below -- this
  // page's own ScrollView is the drag's scroll container. Harmless when not
  // reordering: the bridge only does anything once a DragReorderList drag
  // actually picks up, and that list only mounts in reorder mode.
  const { scrollRef, scrollOffset, onScroll, onContentSizeChange } = useDragAutoScrollBridge();
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => { loadData(); }, [planId]),
  );

  async function loadData() {
    if (!planId) return;
    try {
      const [p, routines, counts, sets, active] = await Promise.all([
        getProgrammeById(planId),
        getRoutinesForPlan(planId),
        getAllRoutineExerciseCounts(),
        getAllRoutineSetCounts(),
        user?.id ? getActivePlan(user.id) : Promise.resolve(null),
      ]);
      setPlan(p);
      setWorkouts(routines);
      setExerciseCounts(counts);
      setSetCounts(sets);
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
    // C4: one decision, one dialog. Both choices copy the plan; only what
    // happens after the copy differs, so each button owns its own copy call
    // and error handling (matches the copy-failure toast either way).
    appAlert(
      'Add this plan?',
      `Copy "${plan?.name}" into your plans. Make it active now, or just add it for later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save for later',
          onPress: async () => {
            try {
              await copyPlanFromLibrary(planId, user.id);
              navigation.goBack();
            } catch (_e) {
              toast.show('Could not copy plan. Try again.', { variant: 'error' });
            }
          },
        },
        {
          text: 'Add and start this plan',
          onPress: async () => {
            let copy;
            try {
              copy = await copyPlanFromLibrary(planId, user.id);
            } catch (_e) {
              toast.show('Could not copy plan. Try again.', { variant: 'error' });
              return;
            }
            const ok = await confirmPlanSwitchMidBlock(user.id, { newPlanName: plan?.name });
            if (!ok) { navigation.goBack(); return; }
            await activatePlanWithBlock(user.id, copy.id, plan?.name ?? 'Training Plan');
            navigation.goBack();
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

  // Day-level plan reorder (old founder-GO item, verified unbuilt): reuses
  // the same swap-adjacent-positions pattern already shipped for exercises
  // within a day (RoutineDetailScreen.handleMoveExercise), one level up the
  // hierarchy. No drag library, no new dependency.
  async function handleMoveDay(routineId, direction) {
    const index = workouts.findIndex(w => w.id === routineId);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= workouts.length) return;
    haptics.selection();

    // Optimistic update.
    const updated = [...workouts];
    const temp = updated[index];
    updated[index] = updated[swapIndex];
    updated[swapIndex] = temp;
    setWorkouts(updated);

    // Persist both swapped items using their new positions.
    try {
      await updateRoutinePosition(updated[index].id, index);
      await updateRoutinePosition(updated[swapIndex].id, swapIndex);
    } catch (e) {
      logError('PlanDetailScreen.handleMoveDay', e, { planId, routineId });
      // Revert on failure.
      setWorkouts(workouts);
      toast.show("Couldn't reorder, try again", { variant: 'error' });
    }
  }

  // D32 (2026-07-10, campaign item 20): true long-press drag, additive to
  // the chevron swap above (handleMoveDay stays untouched). DragReorderList
  // already fires the pickup/drop haptics, so this handler doesn't repeat
  // one. Persists every day whose position actually moved, via the SAME
  // updateRoutinePosition call and the same optimistic-revert-and-toast
  // failure shape handleMoveDay uses -- generalised from exactly two writes
  // to however many days a single drag actually moved.
  async function handleReorderWorkouts(nextWorkouts) {
    const previous = workouts;
    setWorkouts(nextWorkouts);
    try {
      for (let i = 0; i < nextWorkouts.length; i++) {
        if (previous[i]?.id !== nextWorkouts[i].id) {
          await updateRoutinePosition(nextWorkouts[i].id, i);
        }
      }
    } catch (e) {
      logError('PlanDetailScreen.handleReorderWorkouts', e, { planId });
      setWorkouts(previous);
      toast.show("Couldn't reorder, try again", { variant: 'error' });
    }
  }

  async function handleArchive() {
    appAlert(
      'Archive plan?',
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

  // S5: opens the manual builder directly on this plan's days/exercises
  // (route param only, ManualBuilderScreen owns the load + save). Additive:
  // the per-workout pencil (RoutineDetail) is unchanged, this is the one
  // place a user can add or remove a superset on a plan they already saved.
  function handleEditPlan() {
    navigation.navigate('ManualBuilder', { planId });
  }

  const isActive = activePlan?.id === planId;
  // Sum the actual prescribed sets per workout (falling back to 3 per exercise
  // only if a routine has no set-count data), so the estimate reflects the real
  // programme rather than assuming a flat 3 sets per exercise.
  const totalWorkingSets = workouts.reduce(
    (sum, w) => sum + (setCounts[w.id] || (exerciseCounts[w.id] || 0) * 3),
    0,
  );

  if (!plan) {
    // Mirror the loaded layout (header block, primary button, workout rows)
    // so the swap to real content is seamless, rather than a blank flash.
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title={plan?.name || 'Plan'} />
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title={plan?.name || 'Plan'} />
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />}
      >
        {/* Plan header */}
        <AnimatedEntrance index={0}>
        <View style={styles.planHeader}>
          <View style={styles.planHeaderBadgeRow}>
            {isLibrary && (
              <View style={[styles.libraryBadge, live.libraryBadge]}>
                <Text style={[styles.libraryBadgeText, live.libraryBadgeText]}>Library</Text>
              </View>
            )}
            {isActive && (
              <View style={[styles.activeBadge, live.activeBadge]}>
                <Text style={[styles.activeBadgeText, live.activeBadgeText]}>Active plan</Text>
              </View>
            )}
            {plan.tags && plan.tags.includes('featured') && (
              <View style={[styles.featuredBadge, live.featuredBadge]}>
                <Ionicons name="star" size={9} color={t.colors.onPrimary} />
                <Text style={[styles.featuredBadgeText, live.featuredBadgeText]}>Featured</Text>
              </View>
            )}
          </View>
          <Text style={[styles.planName, live.planName]}>{planHeadingName(plan.name)}</Text>
          {plan.description ? (
            <Text style={[styles.planDesc, live.planDesc]}>{plan.description}</Text>
          ) : null}
          <View style={styles.planStats}>
            <View style={styles.planStat}>
              <Text style={[styles.planStatValue, live.planStatValue]}>{workouts.length}</Text>
              <Text style={[styles.planStatLabel, live.planStatLabel]}>Workouts</Text>
            </View>
            {totalWorkingSets > 0 && (
              <View style={styles.planStat}>
                <Text style={[styles.planStatValue, live.planStatValue]}>~{totalWorkingSets}</Text>
                <Text style={[styles.planStatLabel, live.planStatLabel]}>Est. sets/week</Text>
              </View>
            )}
            {plan.difficulty != null && (
              <View style={styles.planStat}>
                <Text style={[styles.planStatValue, live.planStatValue]}>
                  {['Beginner', 'Intermediate', 'Advanced'][plan.difficulty] ?? 'Intermediate'}
                </Text>
                <Text style={[styles.planStatLabel, live.planStatLabel]}>Level</Text>
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
          <View style={styles.sectionHeaderRow}>
            <SectionLabel>Workouts</SectionLabel>
            {!isLibrary && workouts.length > 1 && (
              <TouchableOpacity
                onPress={() => { haptics.selection(); setIsReordering(prev => !prev); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={isReordering ? 'Done reordering workouts' : 'Reorder workouts'}
              >
                <Text style={[styles.reorderToggleText, live.reorderToggleText, isReordering && [styles.reorderToggleTextActive, live.reorderToggleTextActive]]}>
                  {isReordering ? 'Done' : 'Reorder'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {workouts.length === 0 ? (
            <Card padding="xl" style={styles.emptyCard}>
              <Text style={[styles.emptyCardText, live.emptyCardText]}>
                {isLibrary ? 'No workouts in this plan.' : 'No workouts yet. Edit the plan to add workouts.'}
              </Text>
            </Card>
          ) : !isLibrary && isReordering ? (
            // D32 (2026-07-10): true long-press drag, additive to the
            // chevrons below (which stay the accessible move path -- the
            // drag handle is hidden from screen readers, see
            // DragReorderList's own header comment). No blocks at the
            // day level, so this degrades to a plain single-item reorder.
            <DragReorderList
              items={workouts}
              keyExtractor={(w) => w.id}
              onReorder={handleReorderWorkouts}
              handleAccessibilityLabel={(w) => `Drag to reorder ${w.name}`}
              gap={spacing.md}
              scrollRef={scrollRef}
              scrollOffset={scrollOffset}
              renderRow={({ item: routine, index: i }) => (
                <Card style={styles.workoutCard}>
                  <View style={[styles.workoutIndex, live.workoutIndex]}>
                    <Text style={[styles.workoutIndexText, live.workoutIndexText]}>{i + 1}</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, live.workoutName]}>{routine.name}</Text>
                    {exerciseCounts[routine.id] ? (
                      <Text style={[styles.workoutMeta, live.workoutMeta]}>
                        {exerciseCounts[routine.id]} exercise{exerciseCounts[routine.id] !== 1 ? 's' : ''}
                      </Text>
                    ) : (
                      <Text style={[styles.workoutMeta, live.workoutMeta]}>No exercises yet</Text>
                    )}
                  </View>
                  <View style={styles.reorderActions}>
                    <TouchableOpacity
                      onPress={() => handleMoveDay(routine.id, 'up')}
                      style={[styles.reorderBtn, live.reorderBtn, i === 0 && styles.reorderBtnDisabled]}
                      disabled={i === 0}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: i === 0 }}
                      accessibilityLabel={`Move ${routine.name} up`}
                    >
                      <Ionicons name="chevron-up" size={16} color={i === 0 ? t.colors.border : t.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleMoveDay(routine.id, 'down')}
                      style={[styles.reorderBtn, live.reorderBtn, i === workouts.length - 1 && styles.reorderBtnDisabled]}
                      disabled={i === workouts.length - 1}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: i === workouts.length - 1 }}
                      accessibilityLabel={`Move ${routine.name} down`}
                    >
                      <Ionicons name="chevron-down" size={16} color={i === workouts.length - 1 ? t.colors.border : t.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
            />
          ) : (
            workouts.map((routine, i) => (
              <Card key={routine.id} style={styles.workoutCard}>
                <View style={[styles.workoutIndex, live.workoutIndex]}>
                  <Text style={[styles.workoutIndexText, live.workoutIndexText]}>{i + 1}</Text>
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutName, live.workoutName]}>{routine.name}</Text>
                  {exerciseCounts[routine.id] ? (
                    <Text style={[styles.workoutMeta, live.workoutMeta]}>
                      {exerciseCounts[routine.id]} exercise{exerciseCounts[routine.id] !== 1 ? 's' : ''}
                    </Text>
                  ) : (
                    <Text style={[styles.workoutMeta, live.workoutMeta]}>No exercises yet</Text>
                  )}
                </View>
                {!isLibrary && (
                  <View style={styles.workoutActions}>
                    <TouchableOpacity
                      style={[styles.editWorkoutBtn, live.editWorkoutBtn]}
                      onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${routine.name}`}
                    >
                      <Ionicons name="create-outline" size={18} color={t.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.startWorkoutBtn, live.startWorkoutBtn]}
                      onPress={() => handleStartWorkout(routine)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${routine.name}`}
                    >
                      <Ionicons name="play" size={13} color={t.colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))
          )}
        </View>

        {/* Why this plan, for you. Only on the active auto-generated plan,
            mirroring the enrollment reveal so the rationale is here any
            time, not just right after setup. */}
        {isActive && !isLibrary && whyThis && WHY_ORDER.some(k => whyThis[k]) && (
          <View style={styles.section}>
            <SectionLabel>Why this plan, for you</SectionLabel>
            <Card style={styles.whyCard}>
              {WHY_ORDER.filter(k => whyThis[k]).map((k, i, arr) => (
                <View key={k} style={[styles.whyItem, i < arr.length - 1 && styles.whyItemGap]}>
                  <View style={[styles.whyBullet, live.whyBullet]} />
                  <Text style={[styles.whyText, live.whyText]}>{whyThis[k]}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Manage actions, free tier only. Pro users manage their plan
            through the goal-change wizard in Athlete Hub. */}
        {!isLibrary && tier !== 'pro' && (
          <View style={styles.section}>
            <SectionLabel>Manage</SectionLabel>
            <Card padding="none" style={styles.manageCard}>
              <TouchableOpacity style={[styles.manageRow, live.manageRow]} onPress={handleEditPlan} accessibilityRole="button" accessibilityLabel="Edit plan">
                <Ionicons name="create-outline" size={18} color={t.colors.primary} />
                <Text style={[styles.manageRowText, live.manageRowText]}>Edit plan</Text>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.manageRow, live.manageRow]} onPress={handleDuplicate} accessibilityRole="button" accessibilityLabel="Duplicate plan">
                <Ionicons name="copy-outline" size={18} color={t.colors.primary} />
                <Text style={[styles.manageRowText, live.manageRowText]}>Duplicate plan</Text>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </TouchableOpacity>
              {!isActive && (
                <TouchableOpacity style={[styles.manageRow, live.manageRow, styles.manageRowLast]} onPress={handleArchive} accessibilityRole="button" accessibilityLabel="Archive plan">
                  <Ionicons name="archive-outline" size={18} color={t.colors.error} />
                  <Text style={[styles.manageRowText, live.manageRowText, { color: t.colors.error }]}>Archive plan</Text>
                  <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
                </TouchableOpacity>
              )}
            </Card>
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
    alignSelf: 'flex-start', backgroundColor: colors.primaryFill, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  featuredBadgeText: { fontSize: fontSize.xs, color: colors.onPrimary, fontWeight: fontWeight.bold },
  planName: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  planDesc: { ...type.bodySm, color: colors.textSecondary },
  planStats: { flexDirection: 'row', gap: spacing.xl },
  planStat: { gap: spacing.xxs },
  planStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  planStatLabel: { ...type.caption, color: colors.textMuted },
  section: { gap: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reorderToggleText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.regular },
  reorderToggleTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
  reorderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reorderBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  reorderBtnDisabled: { opacity: 0.3 },
  // Card owns background/radius/padding/border here.
  emptyCard: {
    alignItems: 'center',
  },
  emptyCardText: { ...type.bodySm, color: colors.textMuted, textAlign: 'center' },
  workoutCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  workoutIndex: {
    width: 32, height: 32, borderRadius: circle(32), backgroundColor: colors.surface2,
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
    backgroundColor: colors.primaryFill, borderRadius: radius.md,
  },
  // Card owns background/radius/border here; overflow clips row dividers to
  // the rounded corner.
  manageCard: {
    overflow: 'hidden',
  },
  manageRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  manageRowLast: { borderBottomWidth: 0 },
  manageRowText: { flex: 1, ...type.body, color: colors.textPrimary },
  // Card owns background/radius/padding/border here.
  whyCard: {
    gap: spacing.sm,
  },
  whyItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  whyItemGap: { marginBottom: spacing.xs },
  whyBullet: { width: 6, height: 6, borderRadius: circle(6), backgroundColor: colors.primary, marginTop: 7 },
  whyText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/height/overflow, no token) are correctly
// omitted -- there is nothing to unfreeze for them. Same pattern as
// AddCustomFoodScreen.js's buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    libraryBadge: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    libraryBadgeText: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    activeBadge: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, 0.376) },
    activeBadgeText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    featuredBadge: { backgroundColor: t.colors.primaryFill },
    featuredBadgeText: { fontSize: t.fontSize.xs, color: t.colors.onPrimary },
    planName: { fontSize: t.fontSize.xxl, color: t.colors.textPrimary },
    planDesc: { ...t.type.bodySm, color: t.colors.textSecondary },
    planStatValue: { fontSize: t.fontSize.xl, color: t.colors.textPrimary },
    planStatLabel: { ...t.type.caption, color: t.colors.textMuted },
    reorderToggleText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    reorderToggleTextActive: { color: t.colors.primary },
    reorderBtn: { backgroundColor: t.colors.surface2 },
    emptyCardText: { ...t.type.bodySm, color: t.colors.textMuted },
    workoutIndex: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    workoutIndexText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    workoutName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    workoutMeta: { ...t.type.caption, color: t.colors.textSecondary },
    editWorkoutBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    startWorkoutBtn: { backgroundColor: t.colors.primaryFill },
    manageRow: { borderBottomColor: t.colors.border },
    manageRowText: { ...t.type.body, color: t.colors.textPrimary },
    whyBullet: { backgroundColor: t.colors.primary },
    whyText: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
